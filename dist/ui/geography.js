/* GSHHG unified global vector geography, drawn behind independent tactical hexes. */
'use strict';
const GEOGRAPHY = (() => {
  const VISUAL_WORLD = { cols: 180, rows: 76, latTop: 74, latSpan: 128 };
  const px = lon => (lon + 180) * SQ * R / 2 + R - SQ * R / 2;
  const py = lat => R + (VISUAL_WORLD.latTop - lat) * 1.5 * R * (VISUAL_WORLD.rows - 1) / VISUAL_WORLD.latSpan;
  const project = p => [px(p[0]), py(p[1])];
  const bbox = points => {
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of points) {
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    }
    return b;
  };
  // Compile vector geometry only once instead of rebuilding detailed GSHHG
  // coast paths for each new camera tile. Node smoke tests use canvas fallback.
  const FAST_PATH = typeof Path2D !== 'undefined';
  const shape = points => {
    const projected = points.map(project);
    const item = { points: projected, bounds: bbox(projected) };
    if (FAST_PATH && projected.length > 2) {
      const path = new Path2D();
      path.moveTo(projected[0][0], projected[0][1]);
      for (let i = 1; i < projected.length; i++) path.lineTo(projected[i][0], projected[i][1]);
      path.closePath();
      item.path = path;
    }
    return item;
  };
  // Every continent and inland lake comes from the same global dataset.
  const LAYERS = {
    land: GEOGRAPHY_SHAPES.land.map(shape),
    water: [], // No inland water holes; Black Sea remains open ocean.
    biomes: GEOGRAPHY_SHAPES.biomes.map(([kind, intensity, points]) => ({
      kind, intensity, ...shape(points),
    })),
  };
  // Overview geometry is simplified to sub-pixel accuracy at world zoom.
  // The full GSHHG coastline remains intact for detailed zoom levels.
  function simplifyForOverview(shape) {
    const input = shape.points;
    if (input.length <= 6) return shape;
    const sampled = [input[0]];
    let last = input[0];
    const thresholdSq = 7 * 7; // under two screen pixels at overview resolution
    for (let i = 1; i < input.length - 1; i++) {
      const p = input[i];
      if ((p[0] - last[0]) ** 2 + (p[1] - last[1]) ** 2 >= thresholdSq) {
        sampled.push(p);
        last = p;
      }
    }
    sampled.push(input[input.length - 1]);
    return { points: sampled.length >= 3 ? sampled : input.slice(0, 3), bounds: shape.bounds };
  }
  const OVERVIEW_LAND = LAYERS.land.map(simplifyForOverview);
  const OVERVIEW_WATER = LAYERS.water.map(simplifyForOverview);
  function intersects(bounds, left, right, top, bottom) {
    return bounds[0] <= right && bounds[2] >= left && bounds[1] <= bottom && bounds[3] >= top;
  }
  function polygon(ctx, points) {
    if (points.length < 3) return;
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
  }
  function paths(ctx, shapes, left, right, top, bottom) {
    const compiled = FAST_PATH && typeof Path2D.prototype.addPath === 'function';
    const combined = compiled ? new Path2D() : null;
    let count = 0;
    if (!compiled) ctx.beginPath();
    for (const s of shapes) {
      if (!intersects(s.bounds, left, right, top, bottom)) continue;
      if (compiled) {
        if (s.path) combined.addPath(s.path);
        else {
          // Overview polygons are simplified without precompiled paths.
          // They must be appended to the Path2D we actually fill/clip;
          // writing them into ctx made the overview land disappear.
          const pts = s.points;
          if (pts.length < 3) continue;
          combined.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) combined.lineTo(pts[i][0], pts[i][1]);
          combined.closePath();
        }
      } else polygon(ctx, s.points);
      count++;
    }
    return count ? (compiled ? combined : true) : null;
  }
  function fillPath(ctx, p) { if (p) p === true ? ctx.fill() : ctx.fill(p); }
  function clipPath(ctx, p) { if (p) p === true ? ctx.clip() : ctx.clip(p); }
  // The map builder's biome polygons describe *regions*, not literal terrain
  // boundaries. Rendering their hard-edged fills caused the giant triangular
  // stripes across northern Europe. Instead use feathered geographic washes.
  const biomeColor = {
    f: [46, 91, 65],
    d: [218, 176, 107],
    m: [96, 100, 87],
    s: [228, 235, 231],
  };
  function feather(ctx, region) {
    const bounds = region.bounds;
    const cx = (bounds[0] + bounds[2]) / 2, cy = (bounds[1] + bounds[3]) / 2;
    const rx = Math.max(R * 1.8, (bounds[2] - bounds[0]) * 0.72);
    const ry = Math.max(R * 1.8, (bounds[3] - bounds[1]) * 0.72);
    const color = biomeColor[region.kind];
    if (!color) return;
    const strength = (region.kind === 'm' ? 0.20 : region.kind === 'f' ? 0.20 : 0.29) * region.intensity;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(${color.join(',')},${strength.toFixed(3)})`);
    gradient.addColorStop(0.52, `rgba(${color.join(',')},${(strength * 0.65).toFixed(3)})`);
    gradient.addColorStop(1, `rgba(${color.join(',')},0)`);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function tacticalHex(ctx, t, radius) {
    const x = SQ * R * (t.c + 0.5 * (t.r & 1)) + R;
    const y = R * 1.5 * t.r + R;
    for (let i = 0; i < 6; i++) {
      const a = (60 * i - 30) * Math.PI / 180;
      const xx = x + radius * Math.cos(a);
      const yy = y + radius * Math.sin(a);
      i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    }
    ctx.closePath();
  }

  // Political colour is a transparent wash clipped to the REAL geographic
  // silhouette, rather than a separately painted hex mosaic. Fill each faction
  // once (not once per hex), preventing overlapping alpha seams between tiles.
  // Extend faction colours onto the true land silhouette even where the
  // coarse gameplay grid treats a piece of coastline as sea. A multi-source
  // flood is visual-only; no unit path, tile, or ownership value is changed.
  let ownershipCache = null;
  function coastlineOwners(g) {
    const original = g.tiles.map(t => t.owner || null);
    if (ownershipCache && ownershipCache.tiles === g.tiles &&
        original.every((o, i) => o === ownershipCache.original[i])) return ownershipCache.inferred;
    const inferred = original.slice();
    const dist = new Uint16Array(g.tiles.length);
    dist.fill(65535);
    const queue = [];
    for (let i = 0; i < g.tiles.length; i++) {
      if (g.tiles[i].terrain === 'sea' || !original[i]) continue;
      dist[i] = 0;
      queue.push(i);
    }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head];
      // Fill unclaimed map-colour gaps from the nearest ACTUALLY owned hex.
      // A null-owner land hex isn't a true neutral faction territory, so it
      // must not be seeded as neutral and create pale holes on the map.
      // Traverse unclaimed land as well as sea; preserve explicit neutral
      // ownership and do not modify any gameplay tile.
      for (const n of E.adjacent(g, g.tiles[i])) {
        const ni = n.r * g.cols + n.c;
        if (original[ni] || dist[ni] <= dist[i] + 1) continue;
        dist[ni] = dist[i] + 1;
        inferred[ni] = inferred[i];
        queue.push(ni);
      }
    }
    ownershipCache = { tiles: g.tiles, original, inferred };
    return inferred;
  }
  function paintOwnership(ctx, g, landShapes, tiles, left, right, top, bottom) {
    ctx.save();
    const clip = paths(ctx, landShapes, left, right, top, bottom);
    if (clip) {
      clipPath(ctx, clip);
      const inferred = coastlineOwners(g);
      const factions = g.factions || E.FACTIONS;
      const groups = new Map();
      for (const t of tiles) {
        const owner = inferred[t.r * g.cols + t.c];
        if (!owner) continue;
        if (!groups.has(owner)) groups.set(owner, []);
        groups.get(owner).push(t);
      }
      ctx.globalAlpha = 0.58;
      for (const [owner, owned] of groups) {
        const color = (factions[owner] || E.FACTIONS[owner] || E.FACTIONS.neutral).color;
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (const t of owned) tacticalHex(ctx, t, R + 1.2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // GIS coastline patches are clipped to rectangular source windows. Drawing
  // every ring edge as coast would turn those artificial crop borders into
  // ruler-straight shorelines across open water (e.g. the Mediterranean).
  function coast(ctx, polygons, left, right, top, bottom, scale, crop = null) {
    if (!FAST_PATH) {
      ctx.beginPath();
      for (const p of polygons) if (intersects(p.bounds, left, right, top, bottom)) {
        polygon(ctx, p.points);
      }
      ctx.strokeStyle = 'rgba(226,233,216,0.66)';
      ctx.lineWidth = 1 / Math.max(scale, 0.5);
      ctx.stroke();
      return;
    }
    const result = paths(ctx, polygons, left, right, top, bottom);
    if (!result) return;
    ctx.strokeStyle = 'rgba(226,233,216,0.66)';
    ctx.lineWidth = 1 / Math.max(scale, 0.5);
    result === true ? ctx.stroke() : ctx.stroke(result);
  }

  function paintBiomes(ctx, landShapes, left, right, top, bottom) {
    ctx.save();
    const clip = paths(ctx, landShapes, left, right, top, bottom);
    if (clip) {
      clipPath(ctx, clip);
      for (const region of LAYERS.biomes) {
        // Region-wide bounds alone don't draw their underlying angular polygons.
        if (intersects(region.bounds, left, right, top, bottom)) feather(ctx, region);
      }
    }
    ctx.restore();
  }

  // Narrow real-world passages are intentionally widened on the tactical
  // grid to keep fleets navigable. Give those *existing sea hexes* a matching
  // geographic-looking channel instead of falsely converting them to land.
  // These decorative strokes never change terrain, movement, or ownership.
  const NAVIGABLE_WATERWAYS = [
    // Suez Canal and Gulf of Suez (historically a very narrow connection).
    { name: 'Suez', width: 7, points: [[32.3, 31.6], [32.55, 30.4], [32.6, 29.9], [33.3, 29.2]] },
    // Northern Red Sea and Bab-el-Mandeb.
    { name: 'Red Sea', width: 7, points: [[33.3, 29.2], [34.4, 27.5], [36.0, 24.5]] },
    { name: 'Bab-el-Mandeb', width: 8, points: [[42.4, 13.7], [43.0, 13.4], [43.7, 12.6], [44.5, 12.3]] },
    // Singapore's city/port remains on its existing gameplay tile.
    { name: 'Malacca', width: 9, points: [[99.2, 6.6], [100.3, 4.8], [101.2, 2.8], [102.1, 1.0], [103.5, 0.0]] },
    { name: 'Sunda', width: 8, points: [[104.3, -4.2], [105.2, -5.0], [105.7, -5.6], [106.8, -6.1]] },
  ].map(route => {
    const points = route.points.map(project);
    return { ...route, points, bounds: bbox(points) };
  });
  function paintWaterways(ctx, left, right, top, bottom) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const route of NAVIGABLE_WATERWAYS) {
      if (!intersects(route.bounds, left - 12, right + 12, top - 12, bottom + 12)) continue;
      const points = route.points;
      if (points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      // A narrow shoreline outline keeps the channel legible over faction tint.
      ctx.strokeStyle = 'rgba(221,226,202,0.54)';
      ctx.lineWidth = route.width + 2;
      ctx.stroke();
      ctx.strokeStyle = '#184b68';
      ctx.lineWidth = route.width;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Unconnected campaign battlefields have no global longitude/latitude basis.
  // They keep the original gameplay-based rendering until bespoke geographic
  // artwork is defined for those missions.
  function paintRaw(ctx, g, left, right, top, bottom, scale, overview = false) {
    if (!g.wrap || g.cols !== VISUAL_WORLD.cols || g.rows !== VISUAL_WORLD.rows) return false;

    const landShapes = overview ? OVERVIEW_LAND : LAYERS.land;
    const waterShapes = overview ? OVERVIEW_WATER : LAYERS.water;
    ctx.save();
    // The sea is one continuous map surface. These gradients remain anchored in
    // world coordinates while the camera pans, so the landscape does not shimmer.
    const sea = ctx.createLinearGradient(0, 0, 0, R * 1.5 * (g.rows + 1));
    sea.addColorStop(0, '#205372');
    sea.addColorStop(0.55, '#154665');
    sea.addColorStop(1, '#103d5b');
    ctx.fillStyle = sea;
    ctx.fillRect(left, top, right - left, bottom - top);

    const land = ctx.createLinearGradient(0, 0, 0, R * 1.5 * (g.rows + 1));
    land.addColorStop(0, '#94a99d');
    land.addColorStop(0.50, '#889e83');
    land.addColorStop(1, '#acb09b');

    // Both map wrap copies and high-resolution coastal repairs share the same
    // longitude projection; tactical hexes never dictate the visual coastline.
    const first = Math.floor((left - WORLD_W) / WORLD_W);
    const last = Math.ceil((right + WORLD_W) / WORLD_W);
    for (let k = first; k <= last; k++) {
      const shift = k * WORLD_W;
      ctx.save();
      ctx.translate(shift, 0);
      const a = left - shift, b = right - shift;

      const visibleTiles = g.tiles.filter(t => {
        const x = SQ * R * (t.c + 0.5 * (t.r & 1)) + R;
        const y = R * 1.5 * t.r + R;
        return x >= a - R * 2 && x <= b + R * 2 &&
          y >= top - R * 2 && y <= bottom + R * 2;
      });
      ctx.fillStyle = land;
      fillPath(ctx, paths(ctx, landShapes, a, b, top, bottom));
      // Geographical biome washes are clipped to vector land, not individual
      // hexes. They are also repainted over high-detail coastal repair shapes.
      paintBiomes(ctx, landShapes, a, b, top, bottom);
      paintOwnership(ctx, g, landShapes, visibleTiles, a, b, top, bottom);
      coast(ctx, landShapes, a, b, top, bottom, scale);

      // One land silhouette worldwide: no coastal cutout or second tint pass.

      // Inland seas and their outlines are geographically accurate holes in
      // the land layer, not water-coloured hexes painted on top.
      ctx.fillStyle = sea;
      fillPath(ctx, paths(ctx, waterShapes, a, b, top, bottom));
      coast(ctx, waterShapes, a, b, top, bottom, scale);
      if (!overview) paintWaterways(ctx, a, b, top, bottom);
      ctx.restore();
    }
    ctx.restore();
    return true;
  }

  // A baked, world-anchored atlas for panning. The old renderer clipped and
  // re-traced thousands of detailed shoreline vertices every time the 200px
  // camera margin was crossed (typically >100 ms on ordinary hardware).
  // Reuse geography tiles across redraws and zooms; keep the tactical overlay
  // in the existing renderer so selection remains sharp.
  const TILE = 960;
  const TILE_PADDING = 4;
  const MAX_CACHED_TILES = 36;
  const atlasTiles = new Map();
  const overviewCache = { canvas: null, game: null, version: -1 };
  let lastMap = null, lastOwners = [], lastTerrain = [], atlasVersion = 0;
  const stats = { hits: 0, misses: 0, invalidations: 0 };
  function mapVersion(g) {
    let changed = lastMap !== g.tiles || lastOwners.length !== g.tiles.length;
    if (!changed) for (let i = 0; i < g.tiles.length; i++) {
      const t = g.tiles[i];
      if (lastOwners[i] !== t.owner || lastTerrain[i] !== t.terrain) {
        changed = true;
        break;
      }
    }
    if (changed) {
      lastMap = g.tiles;
      lastOwners = g.tiles.map(t => t.owner);
      lastTerrain = g.tiles.map(t => t.terrain);
      atlasTiles.clear();
      overviewCache.version = -1;
      ownershipCache = null;
      atlasVersion++;
      stats.invalidations++;
    }
    return atlasVersion;
  }
  const makeCanvas = () => document.createElement('canvas');
  function cachedTile(g, tx, ty, quality) {
    const key = `${atlasVersion}/${quality}/${tx}/${ty}`;
    let entry = atlasTiles.get(key);
    if (entry) {
      atlasTiles.delete(key);
      atlasTiles.set(key, entry);
      stats.hits++;
      return entry;
    }
    const x = tx * TILE, y = ty * TILE;
    const width = Math.min(TILE, WORLD_W - x);
    const height = Math.min(TILE, WORLD_H - y);
    const canvas = makeCanvas();
    canvas.width = Math.ceil((width + 2 * TILE_PADDING) * quality);
    canvas.height = Math.ceil((height + 2 * TILE_PADDING) * quality);
    const c = canvas.getContext('2d');
    if (!c) return null;
    c.setTransform(quality, 0, 0, quality,
      -(x - TILE_PADDING) * quality, -(y - TILE_PADDING) * quality);
    paintRaw(c, g, x - TILE_PADDING, x + width + TILE_PADDING,
      y - TILE_PADDING, y + height + TILE_PADDING, 0.8);
    entry = { canvas, x, y, width, height, quality };
    atlasTiles.set(key, entry);
    stats.misses++;
    if (atlasTiles.size > MAX_CACHED_TILES) {
      const oldest = atlasTiles.keys().next().value;
      atlasTiles.delete(oldest);
    }
    return entry;
  }
  function paintOverview(ctx, g, left, right, top, bottom) {
    if (overviewCache.version !== atlasVersion || overviewCache.game !== g) {
      const canvas = overviewCache.canvas || makeCanvas();
      const quality = 0.14;
      canvas.width = Math.ceil(WORLD_W * quality);
      canvas.height = Math.ceil(WORLD_H * quality);
      const c = canvas.getContext('2d');
      if (!c) return false;
      c.setTransform(quality, 0, 0, quality, 0, 0);
      paintRaw(c, g, 0, WORLD_W, 0, WORLD_H, 0.8, true);
      overviewCache.canvas = canvas;
      overviewCache.game = g;
      overviewCache.version = atlasVersion;
    }
    for (let k = Math.floor(left / WORLD_W) - 1; k <= Math.ceil(right / WORLD_W); k++) {
      const x = k * WORLD_W;
      if (x + WORLD_W <= left || x >= right) continue;
      ctx.drawImage(overviewCache.canvas, x, 0, WORLD_W, WORLD_H);
    }
    stats.hits++;
    return true;
  }
  function paint(ctx, g, left, right, top, bottom, scale) {
    if (!g.wrap || g.cols !== VISUAL_WORLD.cols || g.rows !== VISUAL_WORLD.rows) return false;
    if (typeof document === 'undefined' || typeof document.createElement !== 'function' ||
        typeof ctx.drawImage !== 'function') return paintRaw(ctx, g, left, right, top, bottom, scale);
    mapVersion(g);
    // At strategic world zoom, use a single overview image instead of
    // instantiating and constantly evicting the entire 70+ tile atlas.
    if (scale < 0.33) return paintOverview(ctx, g, left, right, top, bottom);
    // Outside the geographic data (above 74 N / below 54 S), retain ocean.
    const ocean = ctx.createLinearGradient(0, 0, 0, R * 1.5 * g.rows);
    ocean.addColorStop(0, '#205372');
    ocean.addColorStop(0.55, '#154665');
    ocean.addColorStop(1, '#103d5b');
    ctx.fillStyle = ocean;
    ctx.fillRect(left, top, right - left, bottom - top);
    const quality = scale >= 0.85 ? 1 : 0.72;
    const maxTx = Math.ceil(WORLD_W / TILE) - 1;
    const maxTy = Math.ceil(WORLD_H / TILE) - 1;
    const topRow = Math.max(0, Math.floor(top / TILE));
    const bottomRow = Math.min(maxTy, Math.floor(bottom / TILE));
    for (let k = Math.floor(left / WORLD_W) - 1; k <= Math.ceil(right / WORLD_W); k++) {
      const shift = k * WORLD_W;
      const a = left - shift, b = right - shift;
      if (b <= 0 || a >= WORLD_W) continue;
      const start = Math.max(0, Math.floor(a / TILE));
      const end = Math.min(maxTx, Math.floor(b / TILE));
      for (let ty = topRow; ty <= bottomRow; ty++)
        for (let tx = start; tx <= end; tx++) {
          const tile = cachedTile(g, tx, ty, quality);
          if (!tile) continue;
          const q = quality, pad = TILE_PADDING * q;
          ctx.drawImage(tile.canvas, pad, pad, tile.width * q, tile.height * q,
            tile.x + shift, tile.y, tile.width, tile.height);
        }
    }
    return true;
  }
  // Read-only instrumentation used by rendering performance regression checks.
  function cacheStats() { return { ...stats, tiles: atlasTiles.size }; }

  // A cheap, cached point-in-polygon check for the few hovered gameplay hexes.
  // Unlike GEOGRAPHY.sample, this is the *visual* shoreline classification.
  // Used for an on-demand label when geographic art and tactical hex disagree.
  const visualCentreCache = new Map();
  function visualLandAt(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const worldX = ((x % WORLD_W) + WORLD_W) % WORLD_W;
    const key = `${Math.round(worldX)}:${Math.round(y)}`;
    if (visualCentreCache.has(key)) return visualCentreCache.get(key);
    let land = false;
    for (const shape of LAYERS.land) {
      const b = shape.bounds;
      if (worldX < b[0] || worldX > b[2] || y < b[1] || y > b[3]) continue;
      const points = shape.points;
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], z = points[j];
        if ((a[1] > y) !== (z[1] > y) &&
            worldX < (z[0] - a[0]) * (y - a[1]) / (z[1] - a[1]) + a[0])
          inside = !inside;
      }
      if (inside) { land = true; break; }
    }
    // Bound memory even when a player explores thousands of distinct hexes.
    if (visualCentreCache.size > 1500) visualCentreCache.clear();
    visualCentreCache.set(key, land);
    return land;
  }

  // Classification is a diagnostic of the tactical layer only; the painter
  // above intentionally does NOT use it to draw the map's coastlines.
  function sample(g, x, y) {
    const r = Math.round((y - R) / (1.5 * R));
    if (r < 0 || r >= g.rows) return 0;
    let c = Math.round((x - R) / (SQ * R) - 0.5 * (r & 1));
    if (g.wrap) c = ((c % g.cols) + g.cols) % g.cols;
    const t = g.tiles[r * g.cols + c];
    return t && t.terrain !== 'sea' ? 1 : 0;
  }
  return { paint, sample, visualLandAt, shapes: LAYERS, cacheStats };
})();

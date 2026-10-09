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

  // Political tint follows the actual playable LAND owners. A sea hex must
  // not carry faction colour across a strait merely because an unlimited BFS
  // reached it first. Uniform geographic islands (e.g. Borneo) are tinted as
  // complete polygons, eliminating political hex seams and wrong-colour gaps.
  let ownershipCache = null;
  let islandOwnerCache = null;
  function pointWithinShape(shape, x, y) {
    const b = shape.bounds;
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
    const points = shape.points;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], z = points[j];
      if ((a[1] > y) !== (z[1] > y) &&
          x < (z[0] - a[0]) * (y - a[1]) / (z[1] - a[1]) + a[0])
        inside = !inside;
    }
    return inside;
  }
  function coastlineOwners(g) {
    const original = g.tiles.map(t => t.owner || null);
    if (ownershipCache && ownershipCache.tiles === g.tiles &&
        original.every((o, i) => o === ownershipCache.original[i])) return ownershipCache;
    const inferred = original.slice();
    const dist = new Uint16Array(g.tiles.length);
    dist.fill(65535);
    const queue = [], seeds = [];
    for (let i = 0; i < g.tiles.length; i++) {
      const t = g.tiles[i];
      if (t.terrain === 'sea' || !original[i]) continue;
      dist[i] = 0;
      queue.push(i);
      seeds.push({ x: SQ * R * (t.c + 0.5 * (t.r & 1)) + R,
        y: R * 1.5 * t.r + R, owner: original[i], c: t.c, r: t.r });
    }
    // Unowned playable land may inherit a nearby colour; water receives at
    // most one ring of local coastal colour, never long-distance ocean flood.
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head], t = g.tiles[i];
      if (dist[i] >= 3) continue;
      for (const n of E.adjacent(g, t)) {
        const ni = n.r * g.cols + n.c;
        if (original[ni] || dist[ni] <= dist[i] + 1) continue;
        if (n.terrain === 'sea' && dist[i] >= 1) continue;
        dist[ni] = dist[i] + 1;
        inferred[ni] = inferred[i];
        queue.push(ni);
      }
    }
    ownershipCache = { tiles: g.tiles, original, inferred, seeds };
    islandOwnerCache = null;
    return ownershipCache;
  }
  function homogeneousLandShapes(g) {
    const data = coastlineOwners(g);
    if (islandOwnerCache && islandOwnerCache.source === data) return islandOwnerCache.owners;
    const owners = LAYERS.land.map(shape => {
      let owner = null, found = false;
      for (const seed of data.seeds) {
        if (!pointWithinShape(shape, seed.x, seed.y)) continue;
        if (found && seed.owner !== owner) return null;
        found = true;
        owner = seed.owner;
      }
      if (found) return owner;
      // Tiny Indonesian islands have no tactical land-centre at this scale.
      // Infer only from nearby playable INDONESIAN land, not from Australia or
      // the Philippines across open water. Never hardcode a permanent owner:
      // the island changes colour if neighbouring playable land is captured.
      const x = (shape.bounds[0] + shape.bounds[2]) / 2;
      const y = (shape.bounds[1] + shape.bounds[3]) / 2;
      const lon = (x - R) * 2 / (SQ * R) - 179;
      const lat = 74 - (y - R) * 128 / (1.5 * R * 75);
      const indonesia = (ln, lt) =>
        (ln >= 94 && ln <= 108 && lt >= -8 && lt <= 7.5) ||
        (ln >= 106 && ln <= 119.5 && lt >= -11.5 && lt <= 6) ||
        (ln >= 118 && ln <= 134 && lt >= -11.5 && lt <= 4.5) ||
        (ln >= 133 && ln <= 142 && lt >= -11.5 && lt <= 3);
      if (!indonesia(lon, lat)) return null;
      let closest = null, distance = (R * 9) ** 2;
      for (const seed of data.seeds) {
        const sourceLon = (seed.x - R) * 2 / (SQ * R) - 179;
        const sourceLat = 74 - (seed.y - R) * 128 / (1.5 * R * 75);
        if (!indonesia(sourceLon, sourceLat)) continue;
        const d = (seed.x - x) ** 2 + (seed.y - y) ** 2;
        if (d < distance) { closest = seed.owner; distance = d; }
      }
      return closest;
    });
    islandOwnerCache = { source: data, owners };
    return owners;
  }
  function nearbyOwnedLand(g, x, y, c, r) {
    let winner = null, nearest = Infinity;
    for (let rr = Math.max(0, r - 3); rr <= Math.min(g.rows - 1, r + 3); rr++) {
      for (let cc = c - 3; cc <= c + 3; cc++) {
        const col = (cc + g.cols) % g.cols;
        const tile = g.tiles[rr * g.cols + col];
        if (!tile || tile.terrain === 'sea' || !tile.owner) continue;
        // The tested cc is unwrapped intentionally around the dateline.
        const dx = SQ * R * (cc + 0.5 * (rr & 1)) + R - x;
        const dy = R * 1.5 * rr + R - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearest) { nearest = d2; winner = tile.owner; }
      }
    }
    return nearest <= (R * 5) ** 2 ? winner : null;
  }
  function tacticalHex(ctx, t, radius) {
    const x = SQ * R * (t.c + 0.5 * (t.r & 1)) + R;
    const y = R * 1.5 * t.r + R;
    for (let i = 0; i < 6; i++) {
      const a = (60 * i - 30) * Math.PI / 180;
      const xx = x + radius * Math.cos(a), yy = y + radius * Math.sin(a);
      i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    }
    ctx.closePath();
  }
  function tacticalSector(ctx, t, i, radius) {
    const x = SQ * R * (t.c + 0.5 * (t.r & 1)) + R;
    const y = R * 1.5 * t.r + R;
    const a = (60 * i - 30) * Math.PI / 180;
    const b = (60 * i + 30) * Math.PI / 180;
    ctx.moveTo(x, y);
    ctx.lineTo(x + radius * Math.cos(a), y + radius * Math.sin(a));
    ctx.lineTo(x + radius * Math.cos(b), y + radius * Math.sin(b));
    ctx.closePath();
  }
  // Exposed for geographic regression tests: sample a unified island owner
  // without taking ownership from arbitrary sea tiles or distant factions.
  function islandOwnerAt(g, lon, lat) {
    const x = px(lon), y = py(lat);
    const owners = homogeneousLandShapes(g);
    for (let i = 0; i < LAYERS.land.length; i++)
      if (pointWithinShape(LAYERS.land[i], x, y)) return owners[i];
    return null;
  }
  function paintOwnership(ctx, g, landShapes, tiles, left, right, top, bottom) {
    const wholeOwners = homogeneousLandShapes(g);
    const whole = new Map(), contested = [];
    for (let i = 0; i < landShapes.length; i++) {
      const shape = landShapes[i];
      if (!intersects(shape.bounds, left, right, top, bottom)) continue;
      const owner = wholeOwners[i];
      if (owner) {
        if (!whole.has(owner)) whole.set(owner, []);
        whole.get(owner).push(shape);
      } else contested.push(shape);
    }
    const factions = g.factions || E.FACTIONS;
    ctx.save();
    ctx.globalAlpha = 0.58;
    for (const [owner, shapes] of whole) {
      const color = (factions[owner] || E.FACTIONS[owner] || E.FACTIONS.neutral).color;
      if (!color) continue;
      ctx.fillStyle = color;
      fillPath(ctx, paths(ctx, shapes, left, right, top, bottom));
    }
    ctx.restore();
    if (!contested.length) return;
    ctx.save();
    const clip = paths(ctx, contested, left, right, top, bottom);
    if (!clip) { ctx.restore(); return; }
    clipPath(ctx, clip);
    const { inferred } = coastlineOwners(g);
    const groups = new Map();
    const add = (owner, t, sector) => {
      if (!owner) return;
      if (!groups.has(owner)) groups.set(owner, []);
      groups.get(owner).push({ t, sector });
    };
    for (const t of tiles) {
      if (t.terrain !== 'sea') {
        add(t.owner || inferred[t.r * g.cols + t.c], t, -1);
        continue;
      }
      const x = SQ * R * (t.c + 0.5 * (t.r & 1)) + R;
      const y = R * 1.5 * t.r + R;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const owner = nearbyOwnedLand(g, x + R * 0.5 * Math.cos(a),
          y + R * 0.5 * Math.sin(a), t.c, t.r);
        add(owner || inferred[t.r * g.cols + t.c], t, i);
      }
    }
    ctx.globalAlpha = 0.58;
    for (const [owner, entries] of groups) {
      const color = (factions[owner] || E.FACTIONS[owner] || E.FACTIONS.neutral).color;
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const entry of entries)
        if (entry.sector < 0) tacticalHex(ctx, entry.t, R + 0.5);
        else tacticalSector(ctx, entry.t, entry.sector, R + 0.5);
      ctx.fill();
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

  // Suez is the one significant man-made channel missing from the vector
  // coastline. The Red Sea, Bab-el-Mandeb, Malacca and Sunda are already
  // geographic water, so broad outlined strokes there produced a spurious
  // elongated blue/pale line through the real seas.
  //
  // Only cut a short, subtle canal through *geographic land*, without a
  // contrasting double outline. Gameplay sea hexes and naval routes are
  // controlled by WORLD_ROWS and are intentionally unaffected here.
  const SUEZ_CANAL = [
    [32.35, 31.25], [32.40, 30.84], [32.46, 30.42], [32.55, 29.95],
  ].map(project);
  const SUEZ_BOUNDS = bbox(SUEZ_CANAL);
  function paintSuezCanal(ctx, landShapes, left, right, top, bottom) {
    if (!intersects(SUEZ_BOUNDS, left - 4, right + 4, top - 4, bottom + 4)) return;
    // This prevents any artificial line from appearing inside the real
    // Mediterranean, Gulf of Suez or Red Sea water polygons.
    const landClip = paths(ctx, landShapes, left, right, top, bottom);
    if (!landClip) return;
    ctx.save();
    clipPath(ctx, landClip);
    ctx.beginPath();
    ctx.moveTo(SUEZ_CANAL[0][0], SUEZ_CANAL[0][1]);
    for (let i = 1; i < SUEZ_CANAL.length; i++)
      ctx.lineTo(SUEZ_CANAL[i][0], SUEZ_CANAL[i][1]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#194b69';
    ctx.lineWidth = 3.2;
    ctx.stroke();
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
      if (!overview) paintSuezCanal(ctx, landShapes, a, b, top, bottom);
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
      islandOwnerCache = null;
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

  // A hex can be visually mixed even when its *centre* is correctly
  // classified. Check six points safely inside the playable hex as well:
  // Cornwall (87,14), island shelves and narrow straits otherwise appear as
  // plain ocean while containing visible land. Memoize per hex for smooth pan.
  const mixedHexCache = new Map();
  function visualMixedHex(c, r) {
    if (!Number.isInteger(c) || !Number.isInteger(r) ||
        c < 0 || c >= VISUAL_WORLD.cols || r < 0 || r >= VISUAL_WORLD.rows) return false;
    const key = r * VISUAL_WORLD.cols + c;
    if (mixedHexCache.has(key)) return mixedHexCache.get(key);
    const x = SQ * R * (c + 0.5 * (r & 1)) + R;
    const y = R * 1.5 * r + R;
    const first = visualLandAt(x, y);
    let mixed = false;
    for (let i = 0; i < 6; i++) {
      const a = (60 * i - 30) * Math.PI / 180;
      if (visualLandAt(x + Math.cos(a) * R * 0.80,
                       y + Math.sin(a) * R * 0.80) !== first) {
        mixed = true;
        break;
      }
    }
    mixedHexCache.set(key, mixed);
    return mixed;
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
  return { paint, sample, visualLandAt, visualMixedHex, islandOwnerAt, shapes: LAYERS, cacheStats };
})();

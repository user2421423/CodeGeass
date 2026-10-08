/* Independent vector geography behind an entirely separate tactical hex overlay.
 * Geographic outlines come from the same map-builder source data already in this repo,
 * not from a blurred tile raster. All distances are in the game's world coordinates. */
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
  const shape = points => ({ points: points.map(project), bounds: bbox(points.map(project)) });
  const LAYERS = {
    land: GEOGRAPHY_SHAPES.land.map(shape),
    water: GEOGRAPHY_SHAPES.water.map(shape),
    biomes: GEOGRAPHY_SHAPES.biomes.map(([kind, intensity, points]) => ({
      kind, intensity, ...shape(points),
    })),
    patches: GEOGRAPHY_SHAPES.patches.map(({ id, polys }) => {
      const outlines = polys.map(shape);
      const boxes = outlines.map(p => p.bounds);
      const extent = [Infinity, Infinity, -Infinity, -Infinity];
      for (const b of boxes) {
        extent[0] = Math.min(extent[0], b[0]);
        extent[1] = Math.min(extent[1], b[1]);
        extent[2] = Math.max(extent[2], b[2]);
        extent[3] = Math.max(extent[3], b[3]);
      }
      return { id, outlines, extent };
    }),
  };
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
    let count = 0;
    ctx.beginPath();
    for (const s of shapes)
      if (intersects(s.bounds, left, right, top, bottom)) {
        polygon(ctx, s.points);
        count++;
      }
    return count;
  }
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
    const strength = (region.kind === 'm' ? 0.25 : region.kind === 'f' ? 0.22 : 0.45) * region.intensity;
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
  function paintOwnership(ctx, g, landShapes, tiles, left, right, top, bottom) {
    ctx.save();
    if (paths(ctx, landShapes, left, right, top, bottom)) {
      ctx.clip();
      const factions = g.factions || E.FACTIONS;
      const byOwner = new Map();
      for (const t of tiles) {
        if (!t.owner || t.terrain === 'sea') continue;
        if (!byOwner.has(t.owner)) byOwner.set(t.owner, []);
        byOwner.get(t.owner).push(t);
      }
      ctx.globalAlpha = 0.51;
      for (const [owner, owned] of byOwner) {
        const color = (factions[owner] || E.FACTIONS[owner] || {}).color;
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (const t of owned) {
          // Coastal visual polygons don't always coincide with playable hexes.
          // Extend the ownership wash slightly, only to the shoreline; the
          // geographical clip prevents colouring any actual water.
          const onCoast = E.adjacent(g, t).some(n => n.terrain === 'sea');
          tacticalHex(ctx, t, R * (onCoast ? 1.32 : 1.06));
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function coast(ctx, polygons, left, right, top, bottom, scale) {
    if (!paths(ctx, polygons, left, right, top, bottom)) return;
    ctx.strokeStyle = 'rgba(226,233,216,0.66)';
    ctx.lineWidth = 1 / Math.max(scale, 0.5);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function paintBiomes(ctx, landShapes, left, right, top, bottom) {
    ctx.save();
    if (paths(ctx, landShapes, left, right, top, bottom)) {
      ctx.clip();
      for (const region of LAYERS.biomes) {
        // Region-wide bounds alone don't draw their underlying angular polygons.
        if (intersects(region.bounds, left, right, top, bottom)) feather(ctx, region);
      }
    }
    ctx.restore();
  }

  // Detailed coastline datasets are geographically clipped. A hard rectangular
  // replacement at the source-data bounds created conspicuous seams through
  // France, Anatolia and the Mediterranean. Alpha-feather that replacement
  // over the lower-resolution map instead of overwriting it abruptly.
  const patchSurfaces = new Map();
  function paintPatch(ctx, patch, g, visibleTiles, sea, land, a, b, top, bottom, scale) {
    const [x0, y0, x1, y1] = patch.extent;
    if (!intersects(patch.extent, a, b, top, bottom)) return;
    const width = x1 - x0, height = y1 - y0;
    if (width < 1 || height < 1 || typeof document === 'undefined') return;
    let canvas = patchSurfaces.get(patch.id);
    if (!canvas) {
      canvas = document.createElement('canvas');
      patchSurfaces.set(patch.id, canvas);
    }
    const quality = 1;
    const cw = Math.ceil(width * quality), ch = Math.ceil(height * quality);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    const pctx = canvas.getContext && canvas.getContext('2d');
    if (!pctx) return;
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, cw, ch);
    pctx.setTransform(quality, 0, 0, quality, -x0 * quality, -y0 * quality);
    pctx.save();
    pctx.fillStyle = sea;
    pctx.fillRect(x0, y0, width, height);
    pctx.fillStyle = land;
    if (paths(pctx, patch.outlines, x0, x1, y0, y1)) pctx.fill();
    paintBiomes(pctx, patch.outlines, x0, x1, y0, y1);
    paintOwnership(pctx, g, patch.outlines, visibleTiles, x0, x1, y0, y1);
    coast(pctx, patch.outlines, x0, x1, y0, y1, scale);
    // Multiplying X and Y masks ensures corners fade as well. Most southern
    // patch boundaries end at open water, so do not fade out island details
    // such as Crete at the Mediterranean data boundary.
    const fade = Math.min(R * 1.5, width / 5, height / 5);
    pctx.globalCompositeOperation = 'destination-in';
    const horizontal = pctx.createLinearGradient(x0, 0, x1, 0);
    horizontal.addColorStop(0, 'rgba(255,255,255,0)');
    horizontal.addColorStop(fade / width, '#fff');
    horizontal.addColorStop(1 - fade / width, '#fff');
    horizontal.addColorStop(1, 'rgba(255,255,255,0)');
    pctx.fillStyle = horizontal;
    pctx.fillRect(x0, y0, width, height);
    const vertical = pctx.createLinearGradient(0, y0, 0, y1);
    const southFade = patch.id === 'med_europe' ? 0 : fade;
    vertical.addColorStop(0, 'rgba(255,255,255,0)');
    vertical.addColorStop(fade / height, '#fff');
    if (southFade) vertical.addColorStop(1 - southFade / height, '#fff');
    vertical.addColorStop(1, southFade ? 'rgba(255,255,255,0)' : '#fff');
    pctx.fillStyle = vertical;
    pctx.fillRect(x0, y0, width, height);
    pctx.restore();
    ctx.drawImage(canvas, x0, y0, width, height);
  }

  // Unconnected campaign battlefields have no global longitude/latitude basis.
  // They keep the original gameplay-based rendering until bespoke geographic
  // artwork is defined for those missions.
  function paint(ctx, g, left, right, top, bottom, scale) {
    if (!g.wrap || g.cols !== VISUAL_WORLD.cols || g.rows !== VISUAL_WORLD.rows) return false;

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
      if (paths(ctx, LAYERS.land, a, b, top, bottom)) ctx.fill();
      // Geographical biome washes are clipped to vector land, not individual
      // hexes. They are also repainted over high-detail coastal repair shapes.
      paintBiomes(ctx, LAYERS.land, a, b, top, bottom);
      paintOwnership(ctx, g, LAYERS.land, visibleTiles, a, b, top, bottom);
      coast(ctx, LAYERS.land, a, b, top, bottom, scale);

      // Blend detailed geographic coastlines into the atlas without rectangular
      // wipes, hard crop seams or a change to any tactical hex.
      for (const patch of LAYERS.patches)
        paintPatch(ctx, patch, g, visibleTiles, sea, land, a, b, top, bottom, scale);

      // Inland seas and their outlines are geographically accurate holes in
      // the land layer, not water-coloured hexes painted on top.
      ctx.fillStyle = sea;
      if (paths(ctx, LAYERS.water, a, b, top, bottom)) ctx.fill();
      coast(ctx, LAYERS.water, a, b, top, bottom, scale);
      ctx.restore();
    }
    ctx.restore();
    return true;
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
  return { paint, sample, shapes: LAYERS };
})();

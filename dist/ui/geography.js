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
  const biomeColor = {
    f: 'rgba(44,91,66,0.47)',
    d: 'rgba(217,181,125,0.72)',
    m: 'rgba(110,106,98,0.35)',
    s: 'rgba(228,238,234,0.57)',
  };
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
        if (!intersects(region.bounds, left, right, top, bottom)) continue;
        ctx.fillStyle = biomeColor[region.kind] || '#82938033';
        ctx.globalAlpha = region.intensity;
        ctx.beginPath();
        polygon(ctx, region.points);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
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

      ctx.fillStyle = land;
      if (paths(ctx, LAYERS.land, a, b, top, bottom)) ctx.fill();
      // Geographical biome washes are clipped to vector land, not individual
      // hexes. They are also repainted over high-detail coastal repair shapes.
      paintBiomes(ctx, LAYERS.land, a, b, top, bottom);
      coast(ctx, LAYERS.land, a, b, top, bottom, scale);

      // Natural Earth coastal repairs are drawn as true vectors. Remove the
      // coarse hand-drawn geography only INSIDE each patch rectangle, then
      // insert its detailed shapes. No resampling or per-hex smoothing.
      for (const patch of LAYERS.patches) {
        const [x0, y0, x1, y1] = patch.extent;
        if (!intersects(patch.extent, a, b, top, bottom)) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.clip();
        ctx.fillStyle = sea;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillStyle = land;
        if (paths(ctx, patch.outlines, a, b, top, bottom)) ctx.fill();
        paintBiomes(ctx, patch.outlines, a, b, top, bottom);
        coast(ctx, patch.outlines, a, b, top, bottom, scale);
        ctx.restore();
      }

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

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
  const shape = points => ({ points: points.map(project), bounds: bbox(points.map(project)) });
  // Every continent and inland lake comes from the same global dataset.
  const LAYERS = {
    land: GEOGRAPHY_SHAPES.land.map(shape),
    water: GEOGRAPHY_SHAPES.water.map(shape),
    biomes: GEOGRAPHY_SHAPES.biomes.map(([kind, intensity, points]) => ({
      kind, intensity, ...shape(points),
    })),
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
    const original = g.tiles.map(t => t.owner || (t.terrain === 'sea' ? null : 'neutral'));
    if (ownershipCache && ownershipCache.tiles === g.tiles &&
        original.every((o, i) => o === ownershipCache.original[i])) return ownershipCache.inferred;
    const inferred = original.slice();
    const dist = new Uint8Array(g.tiles.length);
    dist.fill(255);
    const queue = [];
    for (let i = 0; i < g.tiles.length; i++) {
      if (g.tiles[i].terrain === 'sea' || !original[i]) continue;
      dist[i] = 0;
      queue.push(i);
    }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head];
      if (dist[i] >= 4) continue;
      for (const n of E.adjacent(g, g.tiles[i])) {
        const ni = n.r * g.cols + n.c;
        if (n.terrain !== 'sea' || dist[ni] <= dist[i] + 1) continue;
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
    if (paths(ctx, landShapes, left, right, top, bottom)) {
      ctx.clip();
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
    ctx.beginPath();
    const alongCrop = (a, b) => {
      if (!crop) return false;
      const eps = 0.4;
      return (
        (Math.abs(a[0] - crop[0]) < eps && Math.abs(b[0] - crop[0]) < eps) ||
        (Math.abs(a[0] - crop[2]) < eps && Math.abs(b[0] - crop[2]) < eps) ||
        (Math.abs(a[1] - crop[1]) < eps && Math.abs(b[1] - crop[1]) < eps) ||
        (Math.abs(a[1] - crop[3]) < eps && Math.abs(b[1] - crop[3]) < eps)
      );
    };
    let segments = 0;
    for (const poly of polygons) {
      if (!intersects(poly.bounds, left, right, top, bottom)) continue;
      for (let i = 0; i < poly.points.length; i++) {
        const a = poly.points[i], b = poly.points[(i + 1) % poly.points.length];
        if (alongCrop(a, b)) continue;
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        segments++;
      }
    }
    if (!segments) return;
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

      // One land silhouette worldwide: no coastal cutout or second tint pass.

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

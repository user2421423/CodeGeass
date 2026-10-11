/* Strategic world-map country labels. Visual only; ownership and game rules are unchanged. */
'use strict';
const TERRITORY_LABELS = (() => {
  const ANGLES = [-0.58, -0.36, -0.18, 0, 0.18, 0.36, 0.58];
  const STEP = R * 0.72;
  let cached = null;

  // Find the nearest logical land hex, including across the east/west seam.
  // Sampling the whole text baseline, rather than just its midpoint, prevents
  // names from stretching over ocean or territory belonging to a rival.
  function tileAt(g, x, y, worldWidth) {
    const centerRow = Math.round((y - R) / (1.5 * R));
    if (centerRow < -1 || centerRow > g.rows) return null;
    if (g.wrap) x = ((x - R) % worldWidth + worldWidth) % worldWidth + R;
    let best = null, distance = Infinity;
    for (let r = Math.max(0, centerRow - 1); r <= Math.min(g.rows - 1, centerRow + 1); r++) {
      let c = Math.round((x - R) / (SQ * R) - 0.5 * (r & 1));
      if (g.wrap) c = ((c % g.cols) + g.cols) % g.cols;
      if (c < 0 || c >= g.cols) continue;
      const t = g.tiles[r * g.cols + c];
      if (!t) continue;
      const px = SQ * R * (c + 0.5 * (r & 1)) + R;
      let dx = Math.abs(px - x);
      if (g.wrap) dx = Math.min(dx, worldWidth - dx);
      const dy = R * 1.5 * r + R - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < distance) { best = t; distance = d2; }
    }
    return best;
  }
  function ownedAt(g, x, y, side, worldWidth) {
    const t = tileAt(g, x, y, worldWidth);
    return !!t && t.owner === side && t.terrain !== 'sea';
  }
  // Require a corridor of friendly land, not a narrow one-hex shoreline.
  function clearLand(g, x, y, side, worldWidth, nx, ny) {
    const edge = R * 0.58;
    return ownedAt(g, x, y, side, worldWidth) &&
      ownedAt(g, x + nx * edge, y + ny * edge, side, worldWidth) &&
      ownedAt(g, x - nx * edge, y - ny * edge, side, worldWidth);
  }
  function corridor(g, p, side, angle, worldWidth) {
    const dx = Math.cos(angle), dy = Math.sin(angle), nx = -dy, ny = dx;
    if (!clearLand(g, p.x, p.y, side, worldWidth, nx, ny)) return null;
    let minus = 0, plus = 0;
    const maxSteps = Math.ceil(Math.min(worldWidth * 0.32, R * 115) / STEP);
    for (let i = 1; i <= maxSteps; i++) {
      const d = i * STEP;
      if (!clearLand(g, p.x + dx * d, p.y + dy * d, side, worldWidth, nx, ny)) break;
      plus = d;
    }
    for (let i = 1; i <= maxSteps; i++) {
      const d = i * STEP;
      if (!clearLand(g, p.x - dx * d, p.y - dy * d, side, worldWidth, nx, ny)) break;
      minus = d;
    }
    return {
      x: p.x + dx * (plus - minus) / 2,
      y: p.y + dy * (plus - minus) / 2,
      angle,
      span: plus + minus,
    };
  }
  // Connected landmasses receive their own labels. Captured provinces alter the
  // components and their best interior corridors on the next map revision.
  function layout(g, worldWidth) {
    if (!g.wrap || g.mode === 'campaign') return [];
    const revision = g.mapRevision || 0;
    if (cached && cached.tiles === g.tiles && cached.revision === revision &&
        cached.worldWidth === worldWidth) return cached.labels;

    const seen = new Uint8Array(g.tiles.length), regions = [];
    for (const tile of g.tiles) {
      const index = tile.r * g.cols + tile.c;
      if (seen[index] || !tile.owner || tile.owner === 'neutral' || tile.terrain === 'sea') continue;
      seen[index] = 1;
      const group = [tile];
      for (let i = 0; i < group.length; i++) {
        for (const neighbor of E.adjacent(g, group[i])) {
          const k = neighbor.r * g.cols + neighbor.c;
          if (seen[k] || neighbor.owner !== tile.owner || neighbor.terrain === 'sea') continue;
          seen[k] = 1;
          group.push(neighbor);
        }
      }
      if (group.length >= 24) regions.push({ side: tile.owner, tiles: group });
    }
    const labels = [];
    for (const region of regions) {
      let best = null, bestScore = 0;
      const count = Math.min(95, region.tiles.length);
      for (let i = 0; i < count; i++) {
        const tile = region.tiles[Math.floor(i * region.tiles.length / count)];
        const p = hexCenter(tile);
        for (const angle of ANGLES) {
          const candidate = corridor(g, p, region.side, angle, worldWidth);
          if (!candidate) continue;
          const score = candidate.span * (1 - 0.09 * Math.abs(angle));
          if (score > bestScore) { best = candidate; bestScore = score; }
        }
      }
      if (best && best.span >= 9 * R) {
        best.x = ((best.x % worldWidth) + worldWidth) % worldWidth;
        labels.push({ ...best, side: region.side, tiles: region.tiles.length });
      }
    }
    // Reserve labels for the large, recognisable theaters; suppress small
    // adjacent islands that would otherwise crowd the strategic overview.
    labels.sort((a, b) => b.tiles - a.tiles);
    const perSide = new Map();
    const chosen = labels.filter(label => {
      const n = perSide.get(label.side) || 0;
      if (n >= 3) return false;
      perSide.set(label.side, n + 1);
      return true;
    });
    cached = { tiles: g.tiles, revision, worldWidth, labels: chosen };
    return chosen;
  }
  function draw(context, g, scale, worldWidth, left, right, top, bottom, copiesBetween) {
    if (!g.wrap || scale >= 1.08) return;
    const alpha = Math.min(0.82, Math.max(0, (1.08 - scale) / 0.43) * 0.82);
    if (alpha <= 0) return;
    for (const label of layout(g, worldWidth)) {
      if (label.y < top - R || label.y > bottom + R) continue;
      const faction = g.factions?.[label.side] || E.FACTIONS[label.side];
      if (!faction) continue;
      const longName = faction.name.toUpperCase();
      const shortName = (label.side === 'eu' ? 'EUROPIA' :
        label.side === 'britannia' ? 'BRITANNIA' : faction.short || faction.name).toUpperCase();
      const spacePx = label.span * scale * 0.81;
      if (spacePx < 62) continue;
      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const fontPx = Math.min(26, Math.max(17, 15 + Math.sqrt(label.tiles) * 0.19));
      let name = label.tiles >= 110 ? longName : shortName;
      let size = fontPx, widths = [];
      function measure() {
        context.font = '600 ' + size + 'px Georgia, serif';
        widths = [...name].map(char => context.measureText(char).width);
        return widths.reduce((a, b) => a + b, 0);
      }
      let natural = measure();
      if (natural > spacePx && name !== shortName) {
        name = shortName;
        natural = measure();
      }
      if (natural > spacePx) {
        size = Math.max(11, size * spacePx / natural);
        natural = measure();
      }
      if (natural > spacePx + 1) { context.restore(); continue; }
      const tracking = name.length > 1 ?
        Math.max(0, Math.min(17, (spacePx - natural) / (name.length - 1))) : 0;
      const total = natural + tracking * (name.length - 1);
      context.globalAlpha = alpha;
      context.fillStyle = '#fff0d5';
      context.strokeStyle = '#101c29';
      context.lineWidth = 2.8;
      context.lineJoin = 'round';
      context.shadowColor = 'rgba(0, 9, 19, 0.75)';
      context.shadowBlur = 5;
      for (const x of copiesBetween(label.x, left - label.span / 2, right + label.span / 2)) {
        context.save();
        context.translate(x, label.y);
        context.rotate(label.angle);
        context.scale(1 / scale, 1 / scale); // Font size stays legible as the map zooms.
        let cursor = -total / 2;
        for (let i = 0; i < name.length; i++) {
          const at = cursor + widths[i] / 2;
          context.strokeText(name[i], at, 0);
          context.fillText(name[i], at, 0);
          cursor += widths[i] + tracking;
        }
        context.restore();
      }
      context.restore();
    }
  }
  return { layout, draw, ownedAt };
})();
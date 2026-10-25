/* GSHHG global geography and Natural Earth 1:10m Japan scenario coastline; gameplay hexes stay independent. */
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
  // The source coast remains the authority for geographic hit-testing and
  // gameplay alignment. Only its drawn silhouette is cartographically cleaned.
  // Narrow out-and-back polygon needles become huge triangular teeth at tactical
  // zoom; replacing their tips must NOT introduce a crossing elsewhere in a ring.
  function edgesCross(a, b, c, d) {
    const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) -
      (q[1] - p[1]) * (r[0] - p[0]);
    const ab1 = cross(a, b, c), ab2 = cross(a, b, d);
    const cd1 = cross(c, d, a), cd2 = cross(c, d, b);
    return ((ab1 > 1e-7 && ab2 < -1e-7) || (ab1 < -1e-7 && ab2 > 1e-7)) &&
      ((cd1 > 1e-7 && cd2 < -1e-7) || (cd1 < -1e-7 && cd2 > 1e-7));
  }
  function safeCoastBridge(points, i) {
    const n = points.length, a = points[(i + n - 1) % n],
      b = points[(i + 1) % n];
    const minX = Math.min(a[0], b[0]), maxX = Math.max(a[0], b[0]);
    const minY = Math.min(a[1], b[1]), maxY = Math.max(a[1], b[1]);
    for (let j = 0; j < n; j++) {
      if (j === i || j === (i + n - 1) % n) continue;
      const p = points[j], q = points[(j + 1) % n];
      if (Math.max(p[0], q[0]) < minX || Math.min(p[0], q[0]) > maxX ||
          Math.max(p[1], q[1]) < minY || Math.min(p[1], q[1]) > maxY) continue;
      if (edgesCross(a, b, p, q)) return false;
    }
    return true;
  }
  function cleanCoastForDrawing(projected) {
    let points = projected.slice();
    // Repeated closing vertices and degenerate segments are common in GIS data.
    if (points.length > 3 &&
        Math.hypot(points[0][0] - points[points.length - 1][0],
          points[0][1] - points[points.length - 1][1]) < 1e-5) points.pop();
    for (let pass = 0; pass < 3 && points.length > 3; pass++) {
      const remove = new Set(), n = points.length;
      for (let i = 0; i < n; i++) {
        const a = points[(i + n - 1) % n], b = points[i],
          c = points[(i + 1) % n];
        const armA = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const armB = Math.hypot(c[0] - b[0], c[1] - b[1]);
        const base = Math.hypot(a[0] - c[0], a[1] - c[1]);
        // Suppress hairpin tips only when both sides double back on the same
        // tiny base. Keep real bays, peninsulas, islands and broad bends.
        if (Math.min(armA, armB) < R * 0.055 ||
            base > Math.min(armA, armB) * 0.32 ||
            remove.has((i + n - 1) % n) ||
            !safeCoastBridge(points, i)) continue;
        remove.add(i);
      }
      // Adjacent removals could combine into a new, unchecked shortcut.
      if (remove.has(0) && remove.has(n - 1)) remove.delete(n - 1);
      if (!remove.size || n - remove.size < 3) break;
      points = points.filter((_, i) => !remove.has(i));
    }
    return points.length >= 3 ? points : projected;
  }
  const shape = points => {
    const projected = points.map(project);
    const displayPoints = cleanCoastForDrawing(projected);
    const item = { points: projected, displayPoints, bounds: bbox(projected) };
    if (FAST_PATH && displayPoints.length > 2) {
      const path = new Path2D();
      roundedRing(path,displayPoints,R*.012);
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
  // Use the SAME cleaned vector paths at all zoom levels. The old distance-
  // sampled overview rings could bridge bays, self-intersect, and then visibly
  // jump to a different shoreline when zooming into the tactical atlas.
  // The inexpensive cached overview bitmap still supplies distant-map LOD.
  const OVERVIEW_LAND = LAYERS.land;
  const OVERVIEW_WATER = LAYERS.water;
  function intersects(bounds, left, right, top, bottom) {
    return bounds[0] <= right && bounds[2] >= left && bounds[1] <= bottom && bounds[3] >= top;
  }
  function polygon(ctx, points) {
    if (points.length < 3) return;
    roundedRing(ctx,points,R*.012);
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
          const pts = s.displayPoints || s.points;
          if (pts.length < 3) continue;
          roundedRing(combined,pts,R*.012);
        }
      } else polygon(ctx, s.displayPoints || s.points);
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
    const revision = g.mapRevision || 0;
    if (ownershipCache && ownershipCache.tiles === g.tiles && ownershipCache.revision === revision)
      return ownershipCache;
    const original = g.tiles.map(t => t.owner || null);
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
    ownershipCache = { tiles: g.tiles, revision, original, inferred, seeds };
    islandOwnerCache = null;
    return ownershipCache;
  }
  // World conquests have Havana as the only Caribbean city. Small island
  // polygons often have no playable land hex at this scale, so the nearby-seed
  // painter either leaves them green or borrows a colour across open water.
  // Treat this island chain as Havana's geographic province, following its
  // CURRENT controller (including after the city changes hands). Regional
  // Caribbean scenarios have their own cities and retain per-island control.
  function havanaCaribbeanIsland(shape) {
    const west = (shape.bounds[0] - R) * 2 / (SQ * R) - 179;
    const east = (shape.bounds[2] - R) * 2 / (SQ * R) - 179;
    const north = 74 - (shape.bounds[1] - R) * 128 / (1.5 * R * 75);
    const south = 74 - (shape.bounds[3] - R) * 128 / (1.5 * R * 75);
    // Require the ENTIRE shape to lie in the Caribbean: never recolour
    // Florida, Central/South America, or any other mainland coastline.
    if (west < -86 || east > -58 || south < 9.5 || north > 28) return false;
    // Exclude the Florida Keys; these belong to the mainland controller.
    if (south > 23.5 && west < -80.5) return false;
    return true;
  }
  function homogeneousLandShapes(g) {
    const data = coastlineOwners(g);
    const havanaOwner = g.wrap && g.cols === VISUAL_WORLD.cols &&
      g.rows === VISUAL_WORLD.rows
      ? g.stations?.find(city => city.name === 'Havana')?.owner : null;
    if (islandOwnerCache && islandOwnerCache.source === data &&
        islandOwnerCache.havanaOwner === havanaOwner) return islandOwnerCache.owners;
    const owners = LAYERS.land.map(shape => {
      if (havanaOwner && havanaCaribbeanIsland(shape)) return havanaOwner;
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
      // The same gap occurs on small Japanese islands without a playable
      // land-centre: their pixels otherwise inherit Chinese/Korean coastal
      // colour across open sea, even though every Japan city is Britannian.
      // Restrict this inference to Japanese islets (not Jeju/Geoje/Ulleungdo)
      // and follow the current owner of Japanese MAINLAND tiles after captures.
      const japanIslet = (ln, lt) =>
        (ln >= 123.8 && ln <= 132 && lt >= 24 && lt < 30) ||
        (ln >= 129.1 && ln <= 149 && lt >= 30 && lt <= 46 &&
          !(ln < 131.7 && lt >= 35.4 && lt <= 41.8));
      const japanese = !indonesia(lon, lat) && japanIslet(lon, lat);
      if (!indonesia(lon, lat) && !japanese) return null;
      const japanCoreSeed = (ln, lt) =>
        (ln >= 130.5 && ln <= 146 && lt >= 31 && lt <= 46 &&
          ((ln >= 137) || (ln >= 131 && lt <= 35.5)));
      let closest = null, distance = (R * (japanese ? 12 : 9)) ** 2;
      for (const seed of data.seeds) {
        const sourceLon = (seed.x - R) * 2 / (SQ * R) - 179;
        const sourceLat = 74 - (seed.y - R) * 128 / (1.5 * R * 75);
        if (japanese ? !japanCoreSeed(sourceLon, sourceLat)
          : !indonesia(sourceLon, sourceLat)) continue;
        const d = (seed.x - x) ** 2 + (seed.y - y) ** 2;
        if (d < distance) { closest = seed.owner; distance = d; }
      }
      return closest;
    });
    islandOwnerCache = { source: data, owners, havanaOwner };
    return owners;
  }
  // The Red Sea is one to two coarse tiles wide. Political colour must be
  // sampled from the SAME shore, not copied across navigable sea to the
  // opposite continent. The centreline is a visual inference boundary only.
  const RED_SEA_AXIS = [
    [11.5, 44.0], [13.5, 42.7], [17.0, 40.2],
    [22.0, 37.2], [27.0, 34.7], [31.5, 32.6],
  ];
  function redSeaBank(x, y, allowInland = false) {
    const lon = (x - R) * 2 / (SQ * R) - 179;
    const lat = 74 - (y - R) * 128 / (1.5 * R * 75);
    if (lat < 11.5 || lat > 31.5) return 0;
    let middle = RED_SEA_AXIS[RED_SEA_AXIS.length - 1][1];
    for (let i = 1; i < RED_SEA_AXIS.length; i++) {
      const south = RED_SEA_AXIS[i - 1], north = RED_SEA_AXIS[i];
      if (lat > north[0]) continue;
      const t = (lat - south[0]) / (north[0] - south[0]);
      middle = south[1] + (north[1] - south[1]) * t;
      break;
    }
    if (!allowInland && Math.abs(lon - middle) > 7) return 0;
    return lon < middle ? -1 : 1;
  }
  // Reuse each coastal hex's nearest playable land candidates across its
  // six wedge draws. This avoids the old six repeated 7x7 tile scans.
  function coastalLandCandidates(g, c, r) {
    const data = coastlineOwners(g);
    data.coastalCandidates ||= new Map();
    const key = r * g.cols + c;
    if (data.coastalCandidates.has(key)) return data.coastalCandidates.get(key);
    const land = [];
    for (let rr = Math.max(0, r - 3); rr <= Math.min(g.rows - 1, r + 3); rr++) {
      for (let cc = c - 3; cc <= c + 3; cc++) {
        const col = (cc + g.cols) % g.cols;
        const t = g.tiles[rr * g.cols + col];
        if (!t || t.terrain === 'sea' || !t.owner) continue;
        land.push({ owner: t.owner,
          x: SQ * R * (cc + 0.5 * (rr & 1)) + R,
          y: R * 1.5 * rr + R });
      }
    }
    data.coastalCandidates.set(key, land);
    return land;
  }
  // Opposite shores of the Persian Gulf can fall in the same coarse 7×7
  // tactical neighborhood; nearest-by-distance alone paints Iranian colour
  // onto neutral/2018 Britannian Arabia (or vice versa).
  const PERSIAN_GULF_CENTER = [[47,30.4],[49,29.1],[51,27.8],[53.5,26.7],[56,25.7],[58,25.2]];
  function persianGulfBank(x, y) {
    const lon = (x - R) * 2 / (SQ * R) - 179;
    const lat = 74 - (y - R) * 128 / (1.5 * R * 75);
    if (lon < 47 || lon > 58 || lat < 23 || lat > 32) return 0;
    for (let i = 1; i < PERSIAN_GULF_CENTER.length; i++) {
      const a = PERSIAN_GULF_CENTER[i - 1], b = PERSIAN_GULF_CENTER[i];
      if (lon > b[0]) continue;
      const mid = a[1] + (lon - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
      if (Math.abs(lat - mid) > 3.25) return 0;
      return lat < mid ? -1 : 1;
    }
    return 0;
  }
  function nearbyOwnedLand(g, x, y, c, r) {
    let winner = null, nearest = (R * 5) ** 2;
    const bank = redSeaBank(x, y);
    const gulfBank = persianGulfBank(x, y);
    for (const seed of coastalLandCandidates(g, c, r)) {
      // The nearest same-shore playable land may lie further inland than
      // the narrow coastal band; keep it eligible without crossing the sea.
      if (bank && redSeaBank(seed.x, seed.y, true) !== bank) continue;
      if (gulfBank && persianGulfBank(seed.x, seed.y) !== gulfBank) continue;
      const dx = seed.x - x, dy = seed.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearest) { nearest = d2; winner = seed.owner; }
    }
    return winner;
  }
  function tacticalHex(ctx, t, radius) {
    const x = SQ * R * (t.c + 0.5 * (t.r & 1)) + R;
    const y = R * 1.5 * t.r + R;
    for (let i = 0; i < 6; i++) {
      const a = (60 * i - 30) * Math.PI / 180;
      const xx = x + radius * Math.cos(a), yy = y + radius * Math.sin(a);
      i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    }
    // Every caller fills or clips this path. Both operations implicitly close
    // each subpath; explicit closePath repeatedly reprocesses huge native paths
    // on Chromium. Keep the same vertices and winding without that extra work.
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
        // A playable sea tile has no political owner. Never reuse a
        // cross-channel sea-flood colour if there is no local land owner.
        add(owner, t, i);
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

  // Stroke ONLY actual local shore segments. Closing a GIS polygon while
  // stroking it drew artificial crop/dateline boundaries and very long chords
  // across continents. The fill remains closed, but the coastal outline does
  // not draw those connecting edges.
  const COAST_MAX_SEGMENT = R * 1.8;
  const COAST_CROP_EPS = R * 0.012;
  function visibleCoastEdge(a, b) {
    const length = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (length < 1e-5 || length > COAST_MAX_SEGMENT) return false;
    const cropLine = (axis, n) => Math.abs(a[axis] - n) < COAST_CROP_EPS &&
      Math.abs(b[axis] - n) < COAST_CROP_EPS;
    // The world atlas is cropped at these meridians and latitudes; those
    // straight cuts are not physical shorelines.
    if (cropLine(0, px(-180)) || cropLine(0, px(180)) ||
        cropLine(1, py(74)) || cropLine(1, py(-54))) return false;
    return true;
  }
  function coastOutline(p) {
    if (p.coastOutline !== undefined) return p.coastOutline;
    const pts = p.displayPoints || p.points, n = pts.length;
    const outline = FAST_PATH ? new Path2D() : [];
    const corners=pts.map((b,i)=>{
      const a=pts[(i+n-1)%n],c=pts[(i+1)%n];
      const la=Math.hypot(a[0]-b[0],a[1]-b[1]),lc=Math.hypot(c[0]-b[0],c[1]-b[1]);
      const d=visibleCoastEdge(a,b)&&visibleCoastEdge(b,c)?Math.min(R*.012,la*.2,lc*.2):0;
      return {entry:[b[0]+(a[0]-b[0])*d/(la||1),b[1]+(a[1]-b[1])*d/(la||1)],
        exit:[b[0]+(c[0]-b[0])*d/(lc||1),b[1]+(c[1]-b[1])*d/(lc||1)]};
    });
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      if (!visibleCoastEdge(a, b)) continue;
      const start=corners[i].exit,end=corners[(i+1)%n];
      if (FAST_PATH) {
        outline.moveTo(...start);outline.lineTo(...end.entry);
        outline.quadraticCurveTo(...b,...end.exit);
      } else outline.push([start,end.entry,b,end.exit]);
    }
    p.coastOutline = outline;
    return outline;
  }
  function coast(ctx, polygons, left, right, top, bottom, scale) {
    ctx.strokeStyle = 'rgba(226,233,216,0.66)';
    ctx.lineWidth = 1 / Math.max(scale, 0.5);
    // Outlines are computed once per polygon. Batch all visible Path2D outlines
    // into a single stroke when available, preserving atlas chunk performance
    // on coast-heavy regional maps and low-end/mobile GPUs.
    const batched = FAST_PATH && typeof Path2D.prototype.addPath === 'function'
      ? new Path2D() : null;
    if (!FAST_PATH) ctx.beginPath();
    for (const p of polygons) {
      if (!intersects(p.bounds, left, right, top, bottom)) continue;
      const outline = coastOutline(p);
      if (batched) batched.addPath(outline);
      else if (FAST_PATH) ctx.stroke(outline);
      else for (const [a, b, control, end] of outline) {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.quadraticCurveTo(...control,...end);
      }
    }
    if (batched) ctx.stroke(batched);
    else if (!FAST_PATH) ctx.stroke();
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
  // The complete-map atlas in renderer.js is the sole high-detail tile cache.
  // Geography only retains the inexpensive low-resolution world overview.
  const overviewCache = { canvas: null, game: null, version: -1 };
  let lastMap = null, lastRevision = -1, atlasVersion = 0;
  const stats = { hits: 0, misses: 0, invalidations: 0 };
  function mapVersion(g) {
    const revision = g.mapRevision || 0;
    if (lastMap !== g.tiles || lastRevision !== revision) {
      lastMap = g.tiles;
      lastRevision = revision;
      overviewCache.version = -1;
      ownershipCache = null;
      islandOwnerCache = null;
      atlasVersion++;
      stats.invalidations++;
    }
    return atlasVersion;
  }
  const makeCanvas = () => document.createElement('canvas');
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
  // The Japan scenario has its own high-resolution tactical hex grid. Reproject
  // the SAME GSHHG coastline used by Conquest into those hex coordinates, then
  // clip province tint to geographic land. The grid stays the source of truth
  // for movement, capture, ports and combat, not for the visual shoreline.
  // Japanese regional scenarios select islands only. The global GSHHG atlas also
  // contains Korea, Russia, China and nearby foreign islands; clipping by
  // viewport alone must never allow those polygons into this scenario.
  // Match the four principal Japanese islands and selected Japanese islets
  // to their original atlas polygons using points known to be on each island.
  const JAPAN_ISLAND_ANCHORS = [
    [139.69, 35.68], // Honshu (Tokyo)
    [141.35, 43.06], // Hokkaido (Sapporo)
    [130.71, 32.80], // Kyushu (Kumamoto)
    [133.53, 33.56], // Shikoku (Kochi)
    [134.87, 34.37], // Awaji
    [138.32, 38.06], // Sado
    [133.25, 36.25], // Oki
    [130.52, 30.34], // Yakushima
    [141.25, 45.18], // Rishiri
  ];
  // Paint the Japan scenario using dedicated high-resolution Natural Earth 1:10m
  // polygons; keep the GSHHG atlas fallback for isolated tests without the asset.
  // Shoreline and gameplay coastal classification use the same polygon set.
  const JAPAN_LAND = typeof JAPAN_SHAPES !== 'undefined' && JAPAN_SHAPES.length
    ? JAPAN_SHAPES.map(shape)
    : LAYERS.land.filter(shape =>
      JAPAN_ISLAND_ANCHORS.some(([lon, lat]) =>
        pointWithinShape(shape, px(lon), py(lat))));
  function japanLandAt(lon, lat) {
    return JAPAN_LAND.some(shape => pointWithinShape(shape, px(lon), py(lat)));
  }
  // Korea and its Japanese staging islands use the same high-resolution vector
  // shorelines as the 20–80 tactical mask. The global map remains unchanged.
  // korea-coastlines.js loads with the scenarios, after this file: convert it on first use.
  let koreaLand = null;
  const KOREA_LAND = () => koreaLand ||= typeof KOREA_SHAPES !== 'undefined' && KOREA_SHAPES.length
    ? KOREA_SHAPES.map(shape) : LAYERS.land;
  // Select only geographic Australian islands; a rectangular crop would also
  // show Indonesian and Papua New Guinean land that is absent from this theatre.
  // These polygons come from the same GSHHG atlas as the world map. The tactical
  // Australia landmask remains authoritative for naval and land movement.
  const AUSTRALIA_ISLAND_ANCHORS = [
    [133.88, -23.70], // Australian mainland (Alice Springs)
    [147.32, -42.88], // Tasmania
    [137.25, -35.80], // Kangaroo Island
    [148.00, -40.00], // Flinders Island
    [143.93, -39.87], // King Island
    [130.85, -11.45], // Melville Island
    [130.25, -11.75], // Bathurst Island
    [136.70, -13.90], // Groote Eylandt
    [139.50, -16.50], // Mornington Island
  ];
  const AUSTRALIA_LAND = LAYERS.land.filter(shape =>
    AUSTRALIA_ISLAND_ANCHORS.some(([lon, lat]) =>
      pointWithinShape(shape, px(lon), py(lat))));
  function australiaLandAt(lon, lat) {
    return AUSTRALIA_LAND.some(shape => pointWithinShape(shape, px(lon), py(lat)));
  }
  // Render the Philippine archipelago against its actual island outlines, not
  // the generic filled-hex map. Exclude Borneo and other foreign coastlines
  // even though they overlap the rectangular theatre viewport.
  const PHILIPPINES_ISLAND_ANCHORS = [
    [121.3,16.4],[120.9,14.9],[121.5,13.9],[123.3,13.5], // Luzon
    [121.13,12.9],[120.7,12.0],[118.72,9.7],[119.45,11.2], // Mindoro, Palawan
    [122.55,11.0],[123.05,10.4],[123.85,10.3],[123.8,9.8], // Panay, Negros, Cebu, Bohol
    [124.6,11.9],[125.1,11.2],[123.65,12.35],[124.45,9.4], // Samar, Leyte, Masbate
    [124.8,8.0],[125.5,7.15],[122.2,7.05],[124.2,8.6], // Mindanao
    [122.0,6.6],[123.4,7.4],[124.1,6.0] // Basilan and southern islands
  ];
  const PHILIPPINES_LAND = LAYERS.land.filter(shape =>
    PHILIPPINES_ISLAND_ANCHORS.some(([lon,lat]) =>
      pointWithinShape(shape, px(lon), py(lat))));
  // Exclude Canada's Arctic islands and Iceland from the Greenland theatre;
  // select Greenland's true GSHHG coastal polygon and its nearby skerries.
  const GREENLAND_ANCHORS = [[-51.74,64.18],[-53.67,66.94],[-51.1,69.22],
    [-37.64,65.61],[-46.03,60.72],[-69.23,77.47],[-21.96,70.48]];
  const GREENLAND_LAND = LAYERS.land.filter(shape =>
    GREENLAND_ANCHORS.some(([lon,lat]) =>
      pointWithinShape(shape, px(lon), py(lat))));
  let japanColorCache = null;
  // Drawing options a regional scenario declares on itself (meta.map in its scenarios-*.js file).
  function mapMeta(g) {
    return (g?.mode === 'scenario' && E.scenarios?.byId?.[g.scenario?.id]?.meta?.map) || {};
  }
  const hasOverlay = (g, name) => !!mapMeta(g).overlays?.includes(name);
  // Shared cartographic contours. Trace the outside of connected hex terrain,
  // then round only its corners; never shade approximate circles or ridge bands.
  // These paths are artwork only and do not change a single tactical hex.
  function coverageRings(tiles) {
    const edges=new Map(), vertex=(x,y)=>Math.round(x*1000)+','+Math.round(y*1000);
    for(const t of tiles){
      const x=SQ*R*(t.c+.5*(t.r&1))+R,y=1.5*R*t.r+R;
      const points=Array.from({length:6},(_,i)=>{
        const a=(60*i-30)*Math.PI/180;
        const p=[x+R*Math.cos(a),y+R*Math.sin(a)];
        return {p,key:vertex(...p)};
      });
      for(let i=0;i<6;i++){
        const a=points[i],b=points[(i+1)%6],reverse=b.key+'>'+a.key;
        if(edges.has(reverse))edges.delete(reverse);
        else edges.set(a.key+'>'+b.key,{a,b});
      }
    }
    const starts=new Map();
    for(const [key,edge] of edges){
      if(!starts.has(edge.a.key))starts.set(edge.a.key,[]);
      starts.get(edge.a.key).push(key);
    }
    const rings=[];
    for(const [key,first] of edges){
      const ring=[first.a.p];let next=key;
      while(next&&edges.has(next)){
        const e=edges.get(next);edges.delete(next);
        if(e.b.key===first.a.key)break;
        ring.push(e.b.p);
        next=starts.get(e.b.key)?.find(k=>edges.has(k));
      }
      if(ring.length>=3)rings.push(ring);
    }
    return rings;
  }
  function roundedRing(target,points,limit=R*.18) {
    if(points.length<3)return;
    const corners=points.map((p,i)=>{
      const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];
      const la=Math.hypot(a[0]-p[0],a[1]-p[1]),lb=Math.hypot(b[0]-p[0],b[1]-p[1]);
      const fraction=limit>R*.1?.42:.2;
      const d=Math.min(limit,la*fraction,lb*fraction);
      return {p,entry:[p[0]+(a[0]-p[0])*d/(la||1),p[1]+(a[1]-p[1])*d/(la||1)],
        exit:[p[0]+(b[0]-p[0])*d/(lb||1),p[1]+(b[1]-p[1])*d/(lb||1)]};
    });
    target.moveTo(...corners[0].exit);
    for(let i=1;i<=corners.length;i++){
      const c=corners[i%corners.length];target.lineTo(...c.entry);
      target.quadraticCurveTo(...c.p,...c.exit);
    }
    target.closePath();
  }
  function simplifyContour(ring) {
    // Suppress the one-hex staircase while keeping displacement below half a
    // hex. Split the closed ring before RDP so its closing edge is preserved.
    function simplify(points){
      if(points.length<3)return points;
      const a=points[0],b=points[points.length-1],dx=b[0]-a[0],dy=b[1]-a[1];
      let best=R*R*.25,index=-1;
      for(let i=1;i<points.length-1;i++){
        const p=points[i],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
        const d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;
        if(d>best){best=d;index=i;}
      }
      if(index<0)return [a,b];
      return [...simplify(points.slice(0,index+1)).slice(0,-1),...simplify(points.slice(index))];
    }
    let split=1,best=0;
    for(let i=1;i<ring.length;i++){
      const d=(ring[i][0]-ring[0][0])**2+(ring[i][1]-ring[0][1])**2;
      if(d>best){best=d;split=i;}
    }
    const result=[...simplify(ring.slice(0,split+1)).slice(0,-1),
      ...simplify([...ring.slice(split),ring[0]]).slice(0,-1)];
    return result.length>=3?result:ring;
  }
  function contourCoverage(tiles) {
    const rings=coverageRings(tiles).map(simplifyContour),path=FAST_PATH?new Path2D():null;
    if(path)for(const ring of rings)roundedRing(path,ring,R*.85);
    return {tiles,rings,path};
  }
  // Area 18's gameplay mask is already sampled to a fixed hex grid. Never
  // round its *clipping* outline: that moves borders away from the real land
  // cells and can connect islands or tint neighbouring shores.
  function exactContourCoverage(tiles) {
    const rings=coverageRings(tiles),path=FAST_PATH?new Path2D():null;
    if(path)for(const ring of rings){
      path.moveTo(...ring[0]);
      for(let i=1;i<ring.length;i++)path.lineTo(...ring[i]);
      path.closePath();
    }
    return {tiles,rings,path,exact:true};
  }
  let regionalReliefCache=null;
  // Keep relief visible without painting distracting opaque biome rectangles.
  // This shared treatment applies to every geographically rendered scenario.
  const REGIONAL_RELIEF={
    forest:{fill:'rgba(36,79,51,.045)'},
    desert:{fill:'rgba(235,198,126,.070)'},
    mountain:{fill:'rgba(76,67,55,.080)'},
  };
  function paintRegionalRelief(ctx,g,left,right,top,bottom) {
    const revision=g.mapTerrainRevision||0;
    if(regionalReliefCache?.tiles!==g.tiles||regionalReliefCache.revision!==revision){
      const groups={forest:[],desert:[],mountain:[]};
      const visualTerrain=E.scenarios?.byId?.[g.scenario?.id]?.visualReliefTerrain;
      for(const t of g.tiles){
        const terrain=visualTerrain ? visualTerrain(t) : t.terrain;
        const kind=terrain==='peak'?'mountain':terrain;
        if(groups[kind])groups[kind].push(t);
      }
      regionalReliefCache={tiles:g.tiles,revision,layers:Object.entries(groups)
        .filter(([,tiles])=>tiles.length>1)
        .map(([kind,tiles])=>{
          const coverage=contourCoverage(tiles);
          coverage.rings=coverage.rings.filter(ring=>{
            const area=ring.reduce((n,p,i)=>{const q=ring[(i+1)%ring.length];
              return n+p[0]*q[1]-q[0]*p[1];},0)/2;
            return Math.abs(area)>R*R*8;
          });
          if(coverage.path){coverage.path=new Path2D();
            for(const ring of coverage.rings)roundedRing(coverage.path,ring,R*.85);}
          return {kind,...coverage};
        })};
    }
    ctx.save();
    // Feather relief masks in the same world-space paint on every atlas chunk.
    // The atlas overscan is sized to retain the blur across chunk edges.
    if (typeof ctx.filter === 'string') ctx.filter='blur(12px)';
    for(const layer of regionalReliefCache.layers){
      const style=REGIONAL_RELIEF[layer.kind];
      ctx.fillStyle=style.fill;
      if(!layer.path){ctx.beginPath();for(const ring of layer.rings)roundedRing(ctx,ring,R*.85);}
      layer.path?ctx.fill(layer.path):ctx.fill();
      if(style.edge){
        ctx.strokeStyle=style.edge;ctx.lineWidth=R*.085;
        ctx.lineJoin='round';ctx.lineCap='round';
        layer.path?ctx.stroke(layer.path):ctx.stroke();
      }
    }
    ctx.restore();
  }
  const countryBoundaries = new WeakMap();
  function countryBoundary(g) {
    const model=E.scenarios?.byId?.[g.scenario?.id];
    if(!mapMeta(g).countryBoundary || !model?.landPolygons)return null;
    if(!countryBoundaries.has(model))
      countryBoundaries.set(model,model.landPolygons.map(shape));
    return countryBoundaries.get(model);
  }
  // European regional operations share the continental political shoreline.
  function europeanRegion(g) {
    return !!mapMeta(g).europeanRegion;
  }
  function japanColorGroups(g) {
    const revision = g.mapRevision || 0;
    if (japanColorCache?.tiles === g.tiles && japanColorCache.revision === revision)
      return japanColorCache.groups;
    const groups = new Map(), owner = new Array(g.tiles.length).fill(null),
      depth = new Uint8Array(g.tiles.length), queue = [];
    depth.fill(255);
    for (let i = 0; i < g.tiles.length; i++) {
      const t = g.tiles[i];
      if (t.terrain === 'sea' || !t.owner) continue;
      owner[i] = t.owner;
      depth[i] = 0;
      queue.push(i);
    }
    // Two rings of sea hexes are visual colour buffers only: the coastline
    // extends beyond coarse coastal hex centres. Sea gameplay is unaffected.
    for (let i = 0; i < queue.length; i++) {
      const j = queue[i], t = g.tiles[j];
      if (depth[j] >= (mapMeta(g).coastBuffer ?? 2)) continue;
      for (const n of E.adjacent(g, t)) {
        const k = n.r * g.cols + n.c;
        if (n.terrain !== 'sea' || depth[k] <= depth[j] + 1) continue;
        depth[k] = depth[j] + 1;
        owner[k] = owner[j];
        queue.push(k);
      }
    }
    const addTint = (side, tile) => {
      if (!side) return;
      if (!groups.has(side)) groups.set(side, []);
      groups.get(side).push(tile);
    };
    for (let i = 0; i < owner.length; i++) addTint(owner[i], g.tiles[i]);
    // A geographic polygon can reach beyond the first/last sampled hex
    // centre. Continue the existing coastal faction stencil by one virtual
    // hex around the regional map edges. Clip to vector land in paintJapan:
    // this never changes gameplay hexes or paints political colour at sea.
    for (let r = 0; r < g.rows; r++) {
      addTint(owner[r * g.cols], { c: -1, r });
      addTint(owner[r * g.cols + g.cols - 1], { c: g.cols, r });
    }
    for (let c = 0; c < g.cols; c++) {
      addTint(owner[c], { c, r: -1 });
      addTint(owner[(g.rows - 1) * g.cols + c], { c, r: g.rows });
    }
    for (const [r, c, i] of [
      [-1, -1, 0], [-1, g.cols, g.cols - 1],
      [g.rows, -1, (g.rows - 1) * g.cols],
      [g.rows, g.cols, g.rows * g.cols - 1]
    ]) addTint(owner[i], { c, r });
    japanColorCache = { tiles: g.tiles, revision, groups };
    return groups;
  }
  // Offmap territory is not a neutral country: it is outside this scenario's playable theatre.
  // The active geographic map is the playable land plus the SAME short
  // coastal colour buffer used by the political painter. It must never be
  // the whole GSHHG atlas: continental polygons extend far beyond a small
  // regional scenario and would expose unrelated countries as grey terrain.
  function regionalVisibleLand(g, left, right, top, bottom) {
    japanColorGroups(g);
    const cache = japanColorCache;
    if (cache.visibleLand) return localCoverage(cache.visibleLand, left, right, top, bottom);
    const tiles = [];
    const seen = new Set();
    const add = t => {
      const key = t.r + ':' + t.c;
      if (!seen.has(key)) { seen.add(key); tiles.push(t); }
    };
    for (const group of cache.groups.values()) for (const t of group) add(t);
    // Unowned playable land remains visible; offmap countries are outside the theatre.
    for (const t of g.tiles) if (t.terrain !== 'sea' && t.terrain !== 'offmap') add(t);
    cache.visibleLand = g.scenario?.id==='area-18'
      ? exactContourCoverage(tiles) : contourCoverage(tiles);
    return localCoverage(cache.visibleLand, left, right, top, bottom);
  }
  // Rasterizing the entire theatre's 10,000-hex clipping stencil in every
  // small atlas tile was the dominant stall (even with precompiled paths).
  // Cull only shapes wholly outside this paint rectangle. Every intersecting
  // hex keeps its exact original vertices and winding.
  function localCoverage(coverage, left, right, top, bottom) {
    // The outside contours contain far fewer edges than thousands of filled
    // hexes. Keep the same path in every chunk so rounded crop edges never seam.
    if(coverage.rings)return coverage;
    if (!Number.isFinite(left) || !FAST_PATH || right-left > 2048 || bottom-top > 2048) return coverage;
    const tiles = coverage.tiles.filter(t => {
      const x = SQ * R * (t.c + .5 * (t.r & 1)) + R;
      const y = 1.5 * R * t.r + R;
      return x >= left - 2*R && x <= right + 2*R && y >= top - 2*R && y <= bottom + 2*R;
    });
    const path = new Path2D();
    for (const t of tiles) tacticalHex(path, t, R + .8);
    return { tiles, path };
  }
  function clipRegionalLand(ctx, coverage) {
    if (coverage.path) return ctx.clip(coverage.path);
    ctx.beginPath();
    if(coverage.rings)for(const ring of coverage.rings){
      if(coverage.exact){
        ctx.moveTo(...ring[0]);
        for(let i=1;i<ring.length;i++)ctx.lineTo(...ring[i]);
        ctx.closePath();
      }else roundedRing(ctx,ring,R*.85);
    }
    else for (const t of coverage.tiles) tacticalHex(ctx, t, R + .8);
    ctx.clip();
  }
  // The Bering map crosses the international date line (148° E to 132° W).
  // Global atlas polygons use -180..180 and would split its coastline apart.
  // Paint the GSHHS-sampled *gameplay* shoreline instead: provinces, ports and
  // tactical hexes then agree exactly on which side of the strait is land.
  // Cache combined faction paths for efficient panning and map previews.
  let beringPaintCache={tiles:null,revision:-1,paths:null};
  function paintBering(ctx,g,left,right,top,bottom) {
    ctx.save();
    ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
    // Keep ocean shading in world coordinates: this painter is called once per
    // cached atlas chunk, and chunk-local gradients create horizontal stripes.
    const sea=ctx.createLinearGradient(0,0,0,mapH(g));
    sea.addColorStop(0,'#205372');sea.addColorStop(1,'#103d5b');
    ctx.fillStyle=sea;ctx.fillRect(left,top,right-left,bottom-top);
    const revision=g.mapRevision||0;
    if(beringPaintCache.tiles!==g.tiles||beringPaintCache.revision!==revision){
      const groups=new Map();
      for(const t of g.tiles)if(t.terrain!=='sea'&&t.owner){
        if(!groups.has(t.owner))groups.set(t.owner,[]);
        groups.get(t.owner).push(t);
      }
      const paths=new Map();
      if(typeof Path2D!=='undefined'){
        for(const [side,tiles] of groups){
          const path=new Path2D();
          for(const t of tiles)tacticalHex(path,t,R+.9);
          paths.set(side,path);
        }
      }
      beringPaintCache={tiles:g.tiles,revision,paths,groups};
    }
    for(const [side,tiles] of beringPaintCache.groups){
      const faction=g.factions?.[side]||E.FACTIONS[side];
      ctx.fillStyle=faction?.color||'#91a799';
      ctx.globalAlpha=0.88;
      const path=beringPaintCache.paths.get(side);
      if(path)ctx.fill(path);
      else{
        ctx.beginPath();
        for(const t of tiles){
          const x=SQ*R*(t.c+.5*(t.r&1))+R,y=1.5*R*t.r+R;
          if(x<left-2*R||x>right+2*R||y<top-2*R||y>bottom+2*R)continue;
          tacticalHex(ctx,t,R+.9);
        }
        ctx.fill();
      }
    }
    // Indochina river systems: plotted from geographic coordinates in the
    // same equirectangular hex projection used by scenarios-indochina.js.
    // These strokes are visual only; riverbeds do not become impassable sea.
    if(hasOverlay(g,'indochinaRivers')&&g.scenario.rivers){
      const b=g.scenario.bounds, spanLon=b.east-b.west,spanLat=b.north-b.south;
      ctx.save();
      ctx.strokeStyle='#4ac4de';
      ctx.globalAlpha=.76;
      ctx.lineWidth=4.2;
      ctx.lineCap='round';
      ctx.lineJoin='round';
      for(const line of Object.values(g.scenario.rivers)){
        if(line.length<2)continue;
        ctx.beginPath();
        for(let i=0;i<line.length;i++){
          const [lon,lat]=line[i];
          const x=SQ*R*((lon-b.west)*g.cols/spanLon-.5)+R;
          const y=1.5*R*((b.north-lat)*g.rows/spanLat-.5)+R;
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    return true;
  }

  // Bering is centred on the International Date Line. Its gameplay mask is
  // already independently GIS-audited, but using filled tactical hexagons as
  // the underlying artwork made Alaska, Chukotka and the Aleutians look blocky.
  // Draw the actual GSHHG shorelines from the world atlas instead. Split the
  // projection at +/-180 degrees so neither Siberia nor Alaska is mirrored,
  // and keep the detailed coastline independent of the gameplay landmask.
  const BERING_VECTOR_SLICES = [
    { west: 148, east: 180, unwrap: 0 },
    { west: -180, east: -132, unwrap: 360 },
  ].map(region => {
    const top = py(74), bottom = py(48);
    const west = px(region.west), east = px(region.east);
    const shapes = LAYERS.land.filter(s => intersects(s.bounds, west, east, top, bottom));
    const compiled = FAST_PATH && typeof Path2D.prototype.addPath === 'function';
    const landPath = compiled ? new Path2D() : null;
    if (landPath) for (const s of shapes) landPath.addPath(s.path);
    // The global shapefile is cut at +/-180 degrees. Its vertical closing
    // edges are NOT real coastlines and must not be outlined on the map.
    const seamX = px(region.unwrap ? -180 : 180);
    const outline = FAST_PATH ? new Path2D() : null;
    const outlineSegments = [];
    for (const s of shapes) {
      const pts = s.displayPoints || s.points;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if (Math.abs(a[0] - seamX) < 0.01 && Math.abs(b[0] - seamX) < 0.01) continue;
        if (Math.abs(a[0] - b[0]) > SQ * R * 10) continue;
        if (Math.max(a[0], b[0]) < west || Math.min(a[0], b[0]) > east ||
            Math.max(a[1], b[1]) < top || Math.min(a[1], b[1]) > bottom) continue;
        if (outline) {
          outline.moveTo(a[0], a[1]);
          outline.lineTo(b[0], b[1]);
        } else outlineSegments.push([a, b]);
      }
    }
    return { ...region, shapes, landPath, outline, outlineSegments };
  });
  // Share the existing province paths between the detailed and tactical
  // renderers; rebuild only on a territory/map revision.
  // The geographic shoreline can extend into sea-centred tactical hexes.
  // Colour those pixels from the nearest owned LAND tile instead of exposing
  // the neutral green atlas base as jagged bands along Alaska and Chukotka.
  // This is a paint-only stencil: sea terrain, ownership and naval access do
  // not change. Cache it until a province changes hands.
  let beringGeographicOwnersCache = { tiles: null, revision: -1, paths: null, groups: null };
  function beringOwnerGroups(g) {
    const revision = g.mapRevision || 0;
    if (beringGeographicOwnersCache.tiles !== g.tiles ||
        beringGeographicOwnersCache.revision !== revision) {
      const attribution = new Array(g.tiles.length);
      const queue = [], depth = new Uint8Array(g.tiles.length);
      depth.fill(255);
      // Limit coastal inference to the shoreline, never the whole ocean.
      // An unlimited BFS would render remote atlas islands or foreign land
      // that has no playable land tile in the Bering theatre.
      const buffer = Math.max(1, Math.min(3, mapMeta(g).coastBuffer || 2));
      for (let i = 0; i < g.tiles.length; i++) {
        const t = g.tiles[i];
        if (t.terrain === 'sea' || !t.owner) continue;
        attribution[i] = t.owner;
        depth[i] = 0;
        queue.push(i);
      }
      for (let head = 0; head < queue.length; head++) {
        const i = queue[head], owner = attribution[i];
        if (depth[i] >= buffer) continue;
        for (const adjacent of E.adjacent(g, g.tiles[i])) {
          const j = adjacent.r * g.cols + adjacent.c;
          if (attribution[j] || adjacent.terrain !== 'sea') continue;
          attribution[j] = owner;
          depth[j] = depth[i] + 1;
          queue.push(j);
        }
      }
      const groups = new Map();
      const add = (owner, t) => {
        if (!owner) return;
        if (!groups.has(owner)) groups.set(owner, []);
        groups.get(owner).push(t);
      };
      for (let i = 0; i < g.tiles.length; i++) {
        const t = g.tiles[i];
        add(attribution[i] || (t.terrain !== 'sea' ? 'neutral' : null), t);
      }
      // The geographic crop reaches half a hex past the centre-sampled grid.
      // Add virtual edge cells to prevent a sawtooth of neutral background at
      // the 148°E / 132°W and north/south boundaries.
      for (let r = 0; r < g.rows; r++) {
        add(attribution[r * g.cols], { c: -1, r });
        add(attribution[r * g.cols + g.cols - 1], { c: g.cols, r });
      }
      for (let c = 0; c < g.cols; c++) {
        add(attribution[c], { c, r: -1 });
        add(attribution[(g.rows - 1) * g.cols + c], { c, r: g.rows });
      }
      const paths = new Map();
      if (FAST_PATH) for (const [side, tiles] of groups) {
        const path = new Path2D();
        for (const t of tiles) tacticalHex(path, t, R + .9);
        paths.set(side, path);
      }
      const coverage = FAST_PATH ? new Path2D() : null;
      if (coverage) for (const tiles of groups.values())
        for (const t of tiles) tacticalHex(coverage, t, R + .9);
      beringGeographicOwnersCache = { tiles: g.tiles, revision, paths, groups,
        coverage };
    }
    return beringGeographicOwnersCache;
  }
  function clipBeringLand(ctx, owners) {
    if (owners.coverage) return ctx.clip(owners.coverage);
    ctx.beginPath();
    for (const tiles of owners.groups.values())
      for (const t of tiles) tacticalHex(ctx, t, R + .9);
    ctx.clip();
  }
  function paintBeringGeographic(ctx, g, left, right, top, bottom) {
    const bounds = g.scenario.bounds;
    const sx = 2 * g.cols / (bounds.east - bounds.west);
    const sy = g.rows * VISUAL_WORLD.latSpan /
      ((bounds.north - bounds.south) * (VISUAL_WORLD.rows - 1));
    // The visual origin is the same centre-sampled longitude/latitude grid
    // as scenarios-bering.js, including the half-column stagger of odd rows.
    const mapX = lon => R - SQ * R / 2 +
      (lon - bounds.west) * SQ * R * g.cols / (bounds.east - bounds.west);
    const mapY = lat => R - .75 * R +
      (bounds.north - lat) * 1.5 * R * g.rows / (bounds.north - bounds.south);
    const tx = mapX(bounds.west) - sx * px(bounds.west);
    const ty = mapY(bounds.north) - sy * py(bounds.north);
    const owners = beringOwnerGroups(g);
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();
    // The Bering atlas is painted in separate camera/cache chunks. Anchor the
    // ocean gradient to the full map rather than the chunk to avoid bands.
    const sea = ctx.createLinearGradient(0, 0, 0, mapH(g));
    sea.addColorStop(0, '#205372');
    sea.addColorStop(1, '#103d5b');
    ctx.fillStyle = sea;
    ctx.fillRect(left, top, right - left, bottom - top);
    for (const region of BERING_VECTOR_SLICES) {
      // Independently clip the two halves at the date line. Their original
      // atlas longitudes do not overlap; unwrapping only shifts the east half.
      const x0 = Math.max(left, mapX(region.west + region.unwrap));
      const x1 = Math.min(right, mapX(region.east + region.unwrap));
      const y0 = Math.max(top, mapY(bounds.north));
      const y1 = Math.min(bottom, mapY(bounds.south));
      if (x1 <= x0 || y1 <= y0 || !region.shapes.length) continue;
      const shift = tx + region.unwrap * SQ * R * g.cols /
        (bounds.east - bounds.west);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
      ctx.clip();
      ctx.transform(sx, 0, 0, sy, shift, ty);
      const land = region.landPath || paths(ctx, region.shapes,
        px(region.west), px(region.east), py(bounds.north), py(bounds.south));
      if (land) {
        // Political hexes are only an ownership stencil, clipped to the
        // real polygon silhouettes. No hex edges form the visible shoreline.
        ctx.save();
        clipPath(ctx, land);
        ctx.transform(1 / sx, 0, 0, 1 / sy, -shift / sx, -ty / sy);
        ctx.globalAlpha = 1;
        for (const [side, tiles] of owners.groups) {
          const faction = g.factions?.[side] || E.FACTIONS[side];
          ctx.fillStyle = faction?.color || '#91a799';
          const path = owners.paths.get(side);
          if (path) ctx.fill(path);
          else {
            ctx.beginPath();
            for (const t of tiles) {
              const x = SQ * R * (t.c + .5 * (t.r & 1)) + R;
              const y = 1.5 * R * t.r + R;
              if (x < left - 2 * R || x > right + 2 * R ||
                  y < top - 2 * R || y > bottom + 2 * R) continue;
              tacticalHex(ctx, t, R + .9);
            }
            ctx.fill();
          }
        }
        ctx.restore();
      }
      // Hide foreign/unplayable coasts using the same painted-land mask.
      // Invert the atlas transform for the hex stencil, then return to
      // geographic coordinates so the shoreline remains high-resolution.
      ctx.save();
      ctx.transform(1 / sx, 0, 0, 1 / sy, -shift / sx, -ty / sy);
      clipBeringLand(ctx, owners);
      ctx.transform(sx, 0, 0, sy, shift, ty);
      ctx.strokeStyle = 'rgba(226,233,216,0.66)';
      ctx.lineWidth = Math.max(.35, 1.15 / Math.max(sx, sy));
      if (region.outline) ctx.stroke(region.outline);
      else {
        ctx.beginPath();
        for (const [a, b] of region.outlineSegments) {
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }
    ctx.restore();
    return true;
  }

  function paintJapan(ctx, g, left, right, top, bottom, scale, layer = 'all') {
    if (g.mode !== 'scenario' || !g.scenario?.projection) return false;
    const meta = mapMeta(g), has = name => !!meta.overlays?.includes(name);
    if (meta.painter === 'beringGeographic')
      return paintBeringGeographic(ctx, g, left, right, top, bottom);
    if (meta.painter === 'beringGrid')
      return paintBering(ctx,g,left,right,top,bottom);
    const p = g.scenario.projection;
    if (!p) return false;
    // Reproject the same GSHHG atlas into the north-up Japan theatre.
    // The political and tactical layers share this zero-rotation projection.
    const centreSampledRegion = !!meta.centreSampled;
    const theta = p.angle * Math.PI / 180, X = Math.cos(theta), Y = Math.sin(theta),
      k = Math.cos(p.centerLat * Math.PI / 180);
    const ox = px(p.centerLon), oy = py(p.centerLat),
      dx = px(p.centerLon + 1) - ox, dy = py(p.centerLat + 1) - oy;
    const wx = SQ * R * (g.cols - 1) / (p.uMax - p.uMin),
      hy = 1.5 * R * (g.rows - 1) / (p.vMax - p.vMin);
    // Australia's shoreline mask uses half-cell offsets and division by the
    // full grid dimensions, unlike the Japan/Europe projection. Apply the
    // exact map transform so the geographic atlas sits beneath the same hexes
    // used for city positions, terrain, movement and fleet routes.
    // Both regions use centre-sampled hex grids; preserve city/shore alignment.
    const regionalBounds = g.scenario.bounds;
    const A = centreSampledRegion ? SQ * R * g.cols / (regionalBounds.east - regionalBounds.west) / dx : wx * X * k / dx;
    const B = centreSampledRegion ? 0 : wx * Y / dy;
    const C = centreSampledRegion ? 0 : hy * Y * k / dx;
    const D = centreSampledRegion ? -1.5 * R * g.rows / (regionalBounds.north - regionalBounds.south) / dy : -hy * X / dy;
    const tx = centreSampledRegion ? R - SQ * R * .5 - A * px(regionalBounds.west) : R - wx * p.uMin - A * ox - B * oy;
    const ty = centreSampledRegion ? R - 1.5 * R * .5 - D * py(regionalBounds.north) : R + hy * p.vMax - C * ox - D * oy;
    const det = A * D - B * C;
    const invA = D / det, invB = -B / det,
      invC = -C / det, invD = A / det,
      invX = (B * ty - D * tx) / det,
      invY = (C * tx - A * ty) / det;
    const inv = (x, y) => [invA * x + invB * y + invX,
      invC * x + invD * y + invY];
    const corners = [inv(left, top), inv(right, top),
      inv(left, bottom), inv(right, bottom)];
    const bounds = [
      Math.min(...corners.map(t => t[0])) - 10,
      Math.max(...corners.map(t => t[0])) + 10,
      Math.min(...corners.map(t => t[1])) - 10,
      Math.max(...corners.map(t => t[1])) + 10,
    ];
    const [a, b, c, d] = bounds;
    const europeOnly = europeanRegion(g);
    const source = meta.land === 'korea' ? KOREA_LAND() : meta.land === 'australia' ? AUSTRALIA_LAND :
      meta.land === 'philippines' ? PHILIPPINES_LAND : meta.land === 'greenland' ? GREENLAND_LAND :
      (europeOnly || centreSampledRegion) ? LAYERS.land : JAPAN_LAND; // regional shorelines
    const shapes = source.filter(shape =>
      intersects(shape.bounds, a, b, c, d));
    const country = countryBoundary(g);
    // A country-only theatre needs the exact political boundary as well as
    // the physical coastline. Tactical hex clipping alone leaves a sawtooth
    // inland edge and can expose neighbouring countries on the same continent.
    const countryClip = () => {
      if(!country)return;
      const outline=paths(ctx,country,a,b,c,d);
      if(outline)clipPath(ctx,outline);
      else {ctx.beginPath();ctx.rect(0,0,0,0);ctx.clip();}
    };

    // Shared world-space endpoints, identical for every atlas chunk.
    // Chunk-local gradients produce rectangular seams while zooming/panning.
    const sea = ctx.createLinearGradient(0, 0, 0, mapH(g));
    sea.addColorStop(0, '#205372');
    sea.addColorStop(1, '#103d5b');
    if (layer !== 'political') {
      ctx.fillStyle = sea;
      ctx.fillRect(left, top, right - left, bottom - top);
    }
    if (!shapes.length && !has('philippines')) return true;

    // No unconditional land fill: global coast polygons can include Russia,
    // China, Africa or neighbouring islands OUTSIDE the playable theatre.
    // Draw land only when a real scenario land tile (or its shoreline buffer)
    // covers it. This rule also applies when Campaign launches a scenario.
    const visibleLand = regionalVisibleLand(g, left, right, top, bottom);
    // Terrain and national ownership are independent render passes. The base
    // remains valid across ordinary city captures and is cached separately.
    ctx.save();
    ctx.transform(A, C, B, D, tx, ty);
    countryClip();
    const clip = paths(ctx, shapes, a, b, c, d);
    if (clip) {
      clipPath(ctx, clip);
      ctx.transform(invA, invC, invB, invD, invX, invY);
      clipRegionalLand(ctx,visibleLand);
      if (layer !== 'political') {
        ctx.fillStyle = '#91a799';
        if (layer === 'static') {
          // Cover all playable mainland/coastal buffer with neutral geography;
          // political colour is a transparent layer above this immutable base.
          // offmap hexes are excluded from visibleLand, so neighbouring countries stay hidden.
          if (visibleLand.path) ctx.fill(visibleLand.path);
          else {
            ctx.beginPath();
            for (const t of visibleLand.tiles) tacticalHex(ctx, t, R + .8);
            ctx.fill();
          }
        } else {
          const unowned = FAST_PATH && right-left <= 2048 && bottom-top <= 2048 ? new Path2D() : null;
          if (!unowned) ctx.beginPath();
          for (const t of g.tiles) {
            if (t.terrain === 'sea' || t.terrain === 'offmap' || t.owner) continue;
            const x = SQ * R * (t.c + .5 * (t.r & 1)) + R;
            const y = 1.5 * R * t.r + R;
            if (x < left - 2*R || x > right + 2*R || y < top - 2*R || y > bottom + 2*R) continue;
            tacticalHex(unowned || ctx, t, R + .8);
          }
          unowned ? ctx.fill(unowned) : ctx.fill();
        }
      }
      if (layer !== 'static') {
        for (const [side, tiles] of japanColorGroups(g)) {
          const faction = g.factions?.[side] || E.FACTIONS[side];
          if (!faction?.color) continue;
          ctx.fillStyle = faction.color;
          const ownerPath = FAST_PATH && right-left <= 2048 && bottom-top <= 2048 ? new Path2D() : null;
          if (!ownerPath) ctx.beginPath();
          for (const t of tiles) {
            const x = SQ * R * (t.c + 0.5 * (t.r & 1)) + R;
            const y = R * 1.5 * t.r + R;
            if (x < left - R * 2 || x > right + R * 2 ||
                y < top - R * 2 || y > bottom + R * 2) continue;
            tacticalHex(ownerPath || ctx, t, R + .8);
          }
          ownerPath ? ctx.fill(ownerPath) : ctx.fill();
        }
      }
    }
    ctx.restore();
    // No terrain, sea fill, coastlines or relief work on a capture-only repaint.
    if (layer === 'political') return true;
    // Scenario overlays obey the same exact country crop as its land fill.
    ctx.save();
    if(country){
      ctx.transform(A,C,B,D,tx,ty);countryClip();
      ctx.transform(invA,invC,invB,invD,invX,invY);
    }
    // Every regional map uses the same understated terrain contours. Clip
    // shading to real geographic land, independent of ownership and chunk size.
    ctx.save();clipRegionalLand(ctx,visibleLand);
    ctx.transform(A,C,B,D,tx,ty);
    const reliefLand=paths(ctx,shapes,a,b,c,d);
    if(reliefLand)clipPath(ctx,reliefLand);
    ctx.transform(invA,invC,invB,invD,invX,invY);
    // At overview scale the artificial terrain polygons overwhelm the small
    // Arabian landmask. The exact geographic base and unit terrain remain.
    if(g.scenario?.id!=='area-18')
      paintRegionalRelief(ctx,g,left,right,top,bottom);
    ctx.restore();
    // Greenland's ice cap lies above the national coastal tint. Render it as
    // snowy relief while retaining the actual GSHHG silhouette under all hexes.
    if (has('greenland')) {
      ctx.save();
      ctx.globalAlpha=0.76;
      ctx.fillStyle='#ebf5f6';
      ctx.beginPath();
      for(const tile of g.tiles){
        if(tile.biome!=='ice-sheet')continue;
        const x=SQ*R*(tile.c+.5*(tile.r&1))+R;
        const y=1.5*R*tile.r+R;
        if(x<left-2*R||x>right+2*R||y<top-2*R||y>bottom+2*R)continue;
        tacticalHex(ctx,tile,R+0.25);
      }
      ctx.fill();
      ctx.restore();
    }
    // Coastal outlines are as strictly theatre-clipped as the colour fill.
    // Without this clip, invisible foreign land still leaves bright coast
    // strokes in the ocean (e.g. south of Siberia / west of Arabia).
    if (!europeOnly) {
      ctx.save();
      clipRegionalLand(ctx, visibleLand);
      ctx.transform(A, C, B, D, tx, ty);
      countryClip();
      coast(ctx, shapes, a, b, c, d,
        Math.max(0.5, scale * Math.hypot(A, C)));
      ctx.restore();
    }
    if(country){
      ctx.save();clipRegionalLand(ctx,visibleLand);
      ctx.transform(A,C,B,D,tx,ty);
      ctx.strokeStyle='rgba(226,233,216,0.50)';
      ctx.lineWidth=.9/Math.max(.5,scale*Math.hypot(A,C));
      const outline=paths(ctx,country,a,b,c,d);
      if(outline)outline===true?ctx.stroke():ctx.stroke(outline);
      ctx.restore();
    }
    // Palau and Yap are intentionally enlarged in the *gameplay* mask to
    // accommodate Britannian bases. Some are absent from the global coastline
    // asset, so render only these offshore staging islets from their hex mask.
    if (has('philippines')) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      for (const t of g.tiles) {
        if (t.c < 106 || t.terrain === 'sea') continue;
        const x = SQ * R * (t.c + .5 * (t.r & 1)) + R;
        const y = 1.5 * R * t.r + R;
        if (x < left - R || x > right + R || y < top - R || y > bottom + R) continue;
        const faction = g.factions?.[t.owner] || E.FACTIONS[t.owner];
        ctx.fillStyle = faction?.color || '#91a799';
        ctx.beginPath();
        tacticalHex(ctx, t, R + 0.7);
        ctx.fill();
      }
      ctx.restore();
    }
    // Lakes are inland freshwater: the GSHHG continental land polygon alone
    // paints them as dry ground. Render the same navigable lake polygons and
    // engineered connectors used by the tactical hex classifier above it.
    if (has('lakes') && g.scenario.lakes) {
      const bb=g.scenario.bounds,sx=SQ*R*g.cols/(bb.east-bb.west),
        sy=1.5*R*g.rows/(bb.north-bb.south),
        pt=([lon,lat])=>[R-SQ*R*.5+(lon-bb.west)*sx,
          R-.75*R+(bb.north-lat)*sy];
      ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
      ctx.lineJoin='round';ctx.lineCap='round';
      for(const polygon of Object.values(g.scenario.lakes)){
        ctx.beginPath();polygon.forEach((p,i)=>{const [x,y]=pt(p);
          if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();
        ctx.fillStyle='#194b69';ctx.fill();ctx.strokeStyle='#75b3c3';
        ctx.lineWidth=Math.max(1.5,1.2*scale);ctx.stroke();
      }
      for(const [name,line] of Object.entries(g.scenario.channels||{})){
        ctx.beginPath();line.forEach((p,i)=>{const [x,y]=pt(p);
          if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
        ctx.strokeStyle='#245b78';
        ctx.lineWidth=Math.max(3,sx*(name==='Straits of Mackinac'?.24:.16));
        ctx.stroke();
      }
      ctx.restore();
    }
    // Yangtze main channel and tributaries are projected with the same WGS84
    // centre-sampled transform as its playable hexes. The continental GSHHG
    // atlas has no inland Yangtze cutout; draw the true river meanders above
    // the land/ownership fill so the underlay and navigable tactical tiles agree.
    if(has('yangtzeRiver') && g.scenario?.rivers){
      const b=g.scenario.bounds,sx=SQ*R*g.cols/(b.east-b.west),
        sy=1.5*R*g.rows/(b.north-b.south);
      const xy=([lon,lat])=>[
        R-SQ*R*.5+(lon-b.west)*sx,
        R-.75*R+(b.north-lat)*sy
      ];
      ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
      ctx.lineJoin='round';ctx.lineCap='round';
      for(const [name,points] of Object.entries(g.scenario.rivers)){
        if(points.length<2)continue;
        ctx.beginPath();
        points.forEach((coord,i)=>{const [x,y]=xy(coord);
          if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
        ctx.lineWidth=name==='Yangtze'?Math.max(2,2.4*R):
          Math.max(1.2,.32*R);
        ctx.strokeStyle=name==='Yangtze'?'#215a79':'#58a9c4';
        ctx.stroke();
      }
      // Bridge marks are tactical, not an alternate river navigation system:
      // the engine's mixed 'coast' deck permits both land and warships.
      ctx.strokeStyle='#e1d0a2';ctx.lineWidth=Math.max(1.2,.22*R);
      for(const bridge of g.scenario.bridges||[]){
        const [x,y]=xy([bridge.lon,bridge.lat]);
        ctx.beginPath();ctx.moveTo(x-.58*R,y-.58*R);
        ctx.lineTo(x+.58*R,y+.58*R);ctx.stroke();
      }
      ctx.restore();
    }
    // Dedicated northern river underlay in geographical, not approximate tile coordinates.
    if((has('regionalRivers') || has('indochinaRivers')) && g.scenario?.rivers){
      const b=g.scenario.bounds;
      const toHex=([lon,lat])=>[
        R-SQ*R*.5+SQ*R*g.cols*(lon-b.west)/(b.east-b.west),
        R-.75*R+1.5*R*g.rows*(b.north-lat)/(b.north-b.south)];
      ctx.save();ctx.strokeStyle='#60bfd5';ctx.lineWidth=has('indochinaRivers')?4.2:Math.max(1.2,Math.min(3,1.4*scale));
      ctx.globalAlpha=.8;
      for(const path of Object.values(g.scenario.rivers)){
        ctx.beginPath();path.forEach((p,i)=>{const [x,y]=toHex(p);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
        ctx.stroke();
      }
      ctx.restore();
    }
    // Inland Henan: the Yellow River is a navigational barrier on the hex
    // grid, drawn at its surveyed geographic coordinates over the atlas.
    if(has('yellowRiver') && g.scenario.rivers){
      const b=g.scenario.bounds;
      const sx=SQ*R*g.cols/(b.east-b.west),sy=1.5*R*g.rows/(b.north-b.south);
      ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
      ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=.86;
      for(const [name,line] of Object.entries(g.scenario.rivers)){
        if(line.length<2)continue;
        ctx.beginPath();
        line.forEach(([lon,lat],i)=>{
          const x=R-SQ*R*.5+(lon-b.west)*sx,
            y=R-.75*R+(b.north-lat)*sy;
          if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
        });
        ctx.strokeStyle=name==='YellowRiver'?'#50b6d4':'#79bfd2';
        ctx.lineWidth=name==='YellowRiver'?6:2.6;ctx.stroke();
      }
      ctx.restore();
    }
    if(has('uralsRivers')&&g.scenario.rivers){
const b=g.scenario.bounds;ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
ctx.strokeStyle='#4ac4de';ctx.globalAlpha=.78;ctx.lineWidth=3.1;ctx.lineJoin='round';ctx.lineCap='round';
for(const line of Object.values(g.scenario.rivers)){if(line.length<2)continue;
ctx.beginPath();for(let i=0;i<line.length;i++){const [lon,lat]=line[i],
x=R-SQ*R/2+(lon-b.west)*SQ*R*g.cols/(b.east-b.west),
y=R-.75*R+(b.north-lat)*1.5*R*g.rows/(b.north-b.south);
if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
ctx.restore();}
    if (has('turkey')) {
      // This is a tactical-scale hydrographic correction, not a land bridge.
      // The GSHHS vector map has sub-hex-wide straits; the actual GSHHS-derived
      // gameplay mask carves connected sea hexes for both navigable passages.
      const b = g.scenario.bounds, sx = SQ * R * g.cols / (b.east - b.west),
        sy = 1.5 * R * g.rows / (b.north - b.south);
      const point = ([lon,lat]) => [
        R - SQ * R / 2 + (lon-b.west)*sx,
        R - 1.5 * R / 2 + (b.north-lat)*sy,
      ];
      const drawLines = (lines, color, width) => {
        ctx.strokeStyle = color;ctx.lineWidth = width;
        ctx.lineCap='round';ctx.lineJoin='round';
        for (const coords of Object.values(lines || {})) {
          if (coords.length<2) continue;
          ctx.beginPath();
          for (let i=0;i<coords.length;i++) {
            const [x,y]=point(coords[i]);
            if (!i) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.stroke();
        }
      };
      ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
      // Draw rivers first, then the Bosporus and Dardanelles water channels.
      // River strokes are visual only; the straits match navigable sea hexes.
      drawLines(g.scenario.rivers,'rgba(75,190,215,0.76)',Math.max(1.1,R*.15));
      drawLines(g.scenario.straits,'#205372',Math.max(3.5,R*.76));
      ctx.restore();
    }
    // Western Russia's major rivers are geographic polylines. They are
    // rendered above the political atlas but never turn land hexes into sea.
    if(has('westernRussiaRivers') && g.scenario.rivers){
      const p=g.scenario.projection, k=Math.cos(p.centerLat*Math.PI/180),
        wx=SQ*R*(g.cols-1)/(p.uMax-p.uMin),
        hy=1.5*R*(g.rows-1)/(p.vMax-p.vMin);
      ctx.save();
      ctx.strokeStyle='#62c3df';
      ctx.lineWidth=2.7;
      ctx.lineCap='round';
      ctx.lineJoin='round';
      ctx.globalAlpha=.68;
      for(const line of Object.values(g.scenario.rivers)){
        if(line.length<2)continue;
        ctx.beginPath();
        for(let i=0;i<line.length;i++){
          const [lon,lat]=line[i],
            x=R+wx*((lon-p.centerLon)*k-p.uMin),
            y=R+hy*(p.centerLat+p.vMax-lat);
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    // New regional IDs use the WGS84 geographic atlas rather than Japan's
    // fallback map. Relief below is geographically located and separate from
    // the gameplay hex mask; do not trace tactical hex boundaries as shoreline.
    // A scenario may paint its own geographic relief (Rocky Mountains).
    const model=E.scenarios?.byId?.[g.scenario.id];
    if(typeof model?.paintRelief==='function')
      model.paintRelief(ctx,g,{R,SQ,left,right,top,bottom});
    if(has('mexicoAtlas') && g.scenario?.atlas){
      const bb=g.scenario.bounds,atlas=g.scenario.atlas;
      const sx=SQ*R*g.cols/(bb.east-bb.west),
            sy=1.5*R*g.rows/(bb.north-bb.south);
      const xy=([lon,lat])=>[R-SQ*R*.5+(lon-bb.west)*sx,
        R-.75*R+(bb.north-lat)*sy];
      const line=(points,close=false)=>{
        ctx.beginPath();for(let i=0;i<points.length;i++){
          const [x,y]=xy(points[i]);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
        }if(close)ctx.closePath();
      };
      ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
      ctx.lineJoin='round';ctx.lineCap='round';
      // Basin and ridge bands are replaced by the shared terrain contours.
      for(const pass of Object.values(atlas.passes||{})){
        if(!pass?.points?.length)continue;
        line(pass.points);ctx.strokeStyle='rgba(229,213,155,.55)';
        ctx.lineWidth=Math.max(1,Math.min(3.5,Math.abs(pass.width*sx)*.25));
        ctx.stroke();
      }
      for(const points of Object.values(atlas.lakes||{})){
        if(points.length<3)continue;line(points,true);
        ctx.fillStyle='#245b78';ctx.fill();
        ctx.strokeStyle='rgba(118,188,207,.75)';ctx.lineWidth=1.2;ctx.stroke();
      }
      for(const points of Object.values(atlas.rivers||{})){
        if(points.length<2)continue;line(points);
        ctx.strokeStyle='rgba(83,188,213,.8)';ctx.lineWidth=Math.max(1.3,.18*R);
        ctx.stroke();
      }
      for(const [,lon,lat] of atlas.volcanoes||[]){
        const [x,y]=xy([lon,lat]),v=Math.max(2,R*.26);
        ctx.beginPath();ctx.moveTo(x,y-v);ctx.lineTo(x+v*.8,y+v*.65);
        ctx.lineTo(x-v*.8,y+v*.65);ctx.closePath();
        ctx.fillStyle='rgba(92,63,54,.75)';ctx.fill();
      }
      ctx.restore();
    }
    if(has('roads') && g.scenario.roads){
      // Historic highway corridors are aligned with this north-up WGS84 grid.
      const b=g.scenario.bounds;
      const xy=([lon,lat])=>[
        R-SQ*R/2+(lon-b.west)*SQ*R*g.cols/(b.east-b.west),
        R-.75*R+(b.north-lat)*1.5*R*g.rows/(b.north-b.south)];
      ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
      ctx.strokeStyle='rgba(227,205,145,.65)';ctx.lineWidth=Math.max(1.3,R*.24);
      ctx.lineCap='round';ctx.lineJoin='round';
      for(const route of Object.values(g.scenario.roads)){
        ctx.beginPath();
        route.forEach((p,i)=>{const [x,y]=xy(p);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    return true;
  }
  function paint(ctx, g, left, right, top, bottom, scale, layer = 'all') {
    if (paintJapan(ctx, g, left, right, top, bottom, scale, layer)) return true;
    if (!g.wrap || g.cols !== VISUAL_WORLD.cols || g.rows !== VISUAL_WORLD.rows) return false;
    if (typeof document === 'undefined' || typeof document.createElement !== 'function' ||
        typeof ctx.drawImage !== 'function') return paintRaw(ctx, g, left, right, top, bottom, scale);
    mapVersion(g);
    if (scale < 0.33) return paintOverview(ctx, g, left, right, top, bottom);
    // Called while painting a complete-map atlas tile; do not build a second atlas.
    return paintRaw(ctx, g, left, right, top, bottom, scale);
  }
  // Read-only instrumentation used by rendering performance regression checks.
  function cacheStats() { return { ...stats, tiles: 0 }; }

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
    return t && t.terrain !== 'sea' && t.terrain !== 'offmap' ? 1 : 0;
  }
  function releaseMap() {
    regionalReliefCache=null;
    ownershipCache = islandOwnerCache = japanColorCache = null;
    beringPaintCache = {tiles:null,revision:-1,paths:null};
    beringGeographicOwnersCache = {tiles:null,revision:-1,paths:null,groups:null};
    lastMap = null; lastRevision = -1;
    overviewCache.game = null; overviewCache.version = -1;
    overviewCache.canvas = null;
  }
  return { releaseMap, paint, sample, visualLandAt, visualMixedHex, islandOwnerAt, japanLandAt,
    australiaLandAt, shapes: LAYERS, cacheStats };
})();

  // ======== Pathfinding: goal fields and landmasses, for standing orders and the AI ========
  // The side-wide targets as [position, value] pairs: rival cities (a F.L.E.I.J.A. project outranks even a capital) and
  // Sakuradite mines held by others (Mount Fuji pulls almost like a capital).
  function goalSeeds(g, side) {
    const seeds = [];
    for (const s of g.stations)
      if (foe(g, s.owner, side))
        seeds.push([s, s.project || s.eliminatorProject ? -8 : s.capitalOf && alive(g, s.owner) ? -6 : s.owner === 'neutral' ? 1 : 0]);
    for (const d of g.sites || []) if (d.city == null && foe(g, d.owner, side)) seeds.push([d, d.base >= 30 ? -5 : -1]);
    return seeds;
  }
  // Path cost from every hex to the nearest city this side wants (rival capitals count extra), over land and sea.
  // `seeds` ([position, value] pairs) replaces the side-wide targets, e.g. with one front's objectives; `only`
  // ('land' or 'sea') keeps the paths on one surface.
  // Optional unit routing excludes hexes that reachable()/move() cannot traverse.
  // An inaccessible goal can still seed an approach: standing orders finish beside it.
  function routePassable(g, u, p) {
    const t = TYPES[u.type], st = stationAt(g, p), occ = unitAt(g, p);
    if (t.naval === 'ship' && (!navigable(p) || st)) return false;
    if (st && foe(g, st.owner, u.side) && (st.shield > 0 || !canCapture(u))) return false;
    return !occ || occ === u || (occ.side === u.side && (t.naval || !canBoard(g, occ)));
  }
  function goalField(g, side, seeds = null, only = null, unit = null, maxCost = Infinity) {
    const field = new Float32Array(g.tiles.length).fill(Infinity),
      hd = [],
      hi = [];
    // Binary heap over parallel arrays (distance, tile index).
    const push = (i, d) => {
      let n = hd.length;
      hd.push(d);
      hi.push(i);
      while (n > 0) {
        const p = (n - 1) >> 1;
        if (hd[p] <= d) break;
        hd[n] = hd[p];
        hi[n] = hi[p];
        n = p;
      }
      hd[n] = d;
      hi[n] = i;
    };
    const pop = () => {
      const top = hi[0],
        d = hd.pop(),
        i = hi.pop(),
        size = hd.length;
      if (size) {
        let n = 0;
        for (;;) {
          const l = 2 * n + 1,
            r = l + 1;
          let m = l < size && hd[l] < d ? l : -1;
          if (r < size && hd[r] < (m < 0 ? d : hd[l])) m = r;
          if (m < 0) break;
          hd[n] = hd[m];
          hi[n] = hi[m];
          n = m;
        }
        hd[n] = d;
        hi[n] = i;
      }
      return top;
    };
    for (const [p, d] of seeds || goalSeeds(g, side)) {
      const i = p.r * g.cols + p.c;
      if (d < field[i]) {
        field[i] = d;
        push(i, d);
      }
    }
    if (g.mode === 'campaign' && !seeds) {
      for (const u of g.units)
        if (u.hp > 0 && foe(g, u.side, side)) {
          const i = u.r * g.cols + u.c;
          if (field[i] > 2) {
            field[i] = 2;
            push(i, 2);
          }
        }
      for (const [c, r, d = -4] of g.campaign?.goals?.[side] || []) {
        const i = r * g.cols + c;
        field[i] = d;
        push(i, d);
      }
    }
    const nb = neighborTable(g),
      tiles = g.tiles;
    while (hd.length) {
      const d = hd[0],
        i = pop();
      if (d > field[i] || d >= maxCost) continue;
      const sea = isSea(tiles[i]);
      for (let k = i * 6; k < i * 6 + 6; k++) {
        const j = nb[k];
        if (j < 0) continue;
        const n = tiles[j];
        if (TERRAIN[n.terrain]?.blocked || (only === 'sea' ? !navigable(n) : only === 'land' && isSea(n))) continue;
        if (unit && !routePassable(g, unit, n)) continue;
        const step = unit ? isSea(tiles[i]) ? 1 : terrainCost(g, unit, tiles[i]) : isSea(n) ? 1 : TERRAIN[n.terrain].cost;
        const nd = d + (only === 'sea' ? 1 : (isSea(n) !== sea ? 4 : 0) + step);
        if (nd <= maxCost && nd < field[j]) {
          field[j] = nd;
          push(j, nd);
        }
      }
    }
    return field;
  }
  // Six neighbour indices per tile (-1 off the map), cached per map; terrain is read live since craters can appear.
  const neighborCache = new WeakMap();
  function neighborTable(g) {
    let nb = neighborCache.get(g.tiles);
    if (nb) return nb;
    nb = new Int32Array(g.tiles.length * 6).fill(-1);
    for (const t of g.tiles) adjacent(g, t).forEach((n, k) => (nb[(t.r * g.cols + t.c) * 6 + k] = n.r * g.cols + n.c));
    neighborCache.set(g.tiles, nb);
    return nb;
  }
  // Islands and continents, for deciding which troops need a ship (cached per map).
  const landCache = new WeakMap();
  function landmass(g) {
    let m = landCache.get(g.tiles);
    if (m) return m;
    m = new Int32Array(g.tiles.length).fill(-1);
    let id = 0;
    for (const t of g.tiles) {
      if (isSea(t) || TERRAIN[t.terrain]?.blocked || m[t.r * g.cols + t.c] >= 0) continue;
      const q = [t];
      m[t.r * g.cols + t.c] = id;
      while (q.length) {
        const x = q.pop();
        for (const n of adjacent(g, x))
          if (!isSea(n) && !TERRAIN[n.terrain]?.blocked && m[n.r * g.cols + n.c] < 0) {
            m[n.r * g.cols + n.c] = id;
            q.push(n);
          }
      }
      id++;
    }
    landCache.set(g.tiles, m);
    return m;
  }
  const massOf = (g, p) => landmass(g)[p.r * g.cols + p.c];

  // ======== Hex geometry: odd-r offset rows; world maps wrap east to west ========
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1],
  ];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const axial = p => ({ q: p.c - Math.floor(p.r / 2), r: p.r });
  function hexDistance(a, b) {
    a = axial(a);
    b = axial(b);
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  }
  // Pass g for wrapped maps: the shortest way round the world counts.
  function distance(a, b, g = null) {
    const d = hexDistance(a, b);
    if (!g?.wrap) return d;
    const W = g.cols;
    return Math.min(d, hexDistance(a, { c: b.c + W, r: b.r }), hexDistance(a, { c: b.c - W, r: b.r }));
  }
  const dist = (g, a, b) => distance(a, b, g);
  const key = p => p.c + ',' + p.r;
  function tile(g, c, r) {
    if (r < 0 || r >= g.rows) return null;
    if (g.wrap) c = ((c % g.cols) + g.cols) % g.cols;
    else if (c < 0 || c >= g.cols) return null;
    return g.tiles[r * g.cols + c] || null;
  }
  function adjacent(g, p) {
    const a = axial(p);
    return DIRS.map(d => {
      const r = a.r + d[1],
        c = a.q + d[0] + Math.floor(r / 2);
      return tile(g, c, r);
    }).filter(Boolean);
  }
  // Every tile within n hexes of p (including p).
  function within(g, p, n) {
    const out = [],
      a = axial(p);
    for (let dq = -n; dq <= n; dq++)
      for (let dr = Math.max(-n, -dq - n); dr <= Math.min(n, -dq + n); dr++) {
        const r = a.r + dr,
          c = a.q + dq + Math.floor(r / 2),
          t = tile(g, c, r);
        if (t) out.push(t);
      }
    return out;
  }
  // Occupancy indexes: rebuilt when the unit list grows or a stale entry is found; move() keeps them current.
  const unitIndex = new WeakMap(),
    cityIndex = new WeakMap();
  function indexUnits(g) {
    const m = new Map();
    for (const u of g.units) if (u.hp > 0) m.set(key(u), u);
    const idx = { len: g.units.length, map: m };
    unitIndex.set(g.units, idx);
    return idx;
  }
  function unitAt(g, p) {
    let idx = unitIndex.get(g.units);
    if (!idx || idx.len !== g.units.length) idx = indexUnits(g);
    const k = key(p);
    let u = idx.map.get(k);
    if (u && (u.hp <= 0 || u.c !== p.c || u.r !== p.r)) u = indexUnits(g).map.get(k);
    return u || null;
  }
  function reindex(g, u, from) {
    const idx = unitIndex.get(g.units);
    if (!idx) return;
    if (from && idx.map.get(key(from)) === u) idx.map.delete(key(from));
    if (u.hp > 0) idx.map.set(key(u), u);
  }
  function stationAt(g, p) {
    let idx = cityIndex.get(g.stations);
    if (!idx || idx.len !== g.stations.length) {
      idx = { len: g.stations.length, map: new Map(g.stations.map(s => [key(s), s])) };
      cityIndex.set(g.stations, idx);
    }
    return idx.map.get(key(p)) || null;
  }
  function random(g) {
    g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
    return g.seed / 4294967296;
  }
  function log(g, text, side) {
    g.log.unshift({ turn: g.turn, text, side: side || g.phase });
    g.log = g.log.slice(0, 40);
  }
  function funds(g, side) {
    return g.economy[side];
  }
  function alive(g, side) {
    return (g?.mode === 'campaign' ? (g.order || []).includes(side) : MAJORS.includes(side)) && !g.fallen?.[side];
  }
  // Whether two sides fight each other. Campaign missions may ally sides into teams (g.teams); Conquest has none.
  function foe(g, a, b) {
    return a !== b && !(g?.teams?.[a] && g.teams[a] === g.teams[b]);
  }
  const isFoe = foe;
  // Optional rule hooks, set by the campaign module (dist/campaign.js): turn(g, side), capture(g, city, unit),
  // kill(g, victim, attacker), decide(g), objective(g), title(g).
  const hooks = {};


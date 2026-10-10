  // ======== The world ========
  function hexOf(lon, lat) {
    const r = clamp(Math.round((WORLD.lat0 - lat) / WORLD.dlat), 0, WORLD.rows - 1),
      c = Math.round((lon - WORLD.lon0) / WORLD.dlon - 0.5 - 0.5 * (r & 1));
    return { c: ((c % WORLD.cols) + WORLD.cols) % WORLD.cols, r };
  }
  function lonLatOf(p) {
    return { lon: WORLD.lon0 + (p.c + 0.5 + 0.5 * (p.r & 1)) * WORLD.dlon, lat: WORLD.lat0 - p.r * WORLD.dlat };
  }
  const ERAS = {
    world: {
      name: 'World War · 2017 a.t.b.',
      year: '2017 a.t.b.',
      desc: 'The Holy Britannian Empire holds the Americas, Area 11 and its Pacific bases; the Europia United holds Europe, Russia and Africa; the Chinese Federation holds Asia. Australia and the Middle Eastern Federation stand neutral.',
      rulesText:
        'A power surrenders only when it has lost every city: its armies disband and its mines pass to the conqueror. Defeat every rival, or hold the most cities at the 120-turn armistice.',
    },
  };

  // Operation difficulty. Normal is the operation as designed. Hard gives every rival power all tier I–II
  // HQ research, upgrades every other enemy unit one class and adds one unit per four. Challenge gives them all
  // research, upgrades every unit (with an extra frame), adds one unit per two and a richer treasury.
  const DIFFICULTIES = {
    normal: { name: 'Normal', level: 0, tokens: 1, desc: 'The world as it stands in 2017 a.t.b.' },
    hard: {
      name: 'Hard',
      level: 1,
      tokens: 1.5,
      techTier: 2,
      upgradeEvery: 2,
      extraPer: 4,
      ranks: 3,
      income: 1,
      desc: 'Rival powers have all tier I–II research, half their units are upgraded a class and there are more of them. Enemy commanders gain three ranks.',
    },
    challenge: {
      name: 'Challenge',
      level: 2,
      tokens: 2,
      techTier: 4,
      upgradeEvery: 1,
      extraPer: 2,
      stack: true,
      ranks: RANKS.length - 1, // Every starting rank reaches Marshal.
      income: 1.25,
      desc: 'Rival powers have every technology, every unit is upgraded with an extra frame, and their armies swell. Enemy commanders reach maximum rank.',
    },
  };
  // One class up within each branch: a scout becomes an assault frame, a line frame a mainline frame, and so on.
  const UPGRADE = {
    scout: 'assault',
    assault: 'light',
    raider: 'light',
    light: 'medium',
    medium: 'heavy',
    heavy: 'super',
    support: 'rocket',
    rocket: 'siege',
  };
  function upgradeType(type) {
    const t = TYPES[type],
      next = UPGRADE[t.cls];
    if (t.naval) return t.naval === 'amphibious' && NAVAL[t.side] ? NAVAL[t.side].amphibious2 : type;
    if (!next || t.side === 'neutral') return type;
    return typeFor(t.side, next);
  }
  function techUpToTier(tier) {
    return Object.fromEntries(
      Object.values(TECH_NODES)
        .map(n => [n.id, n.tiers.filter(t => t <= tier).length])
        .filter(([, l]) => l > 0),
    );
  }
  function harden(g, d) {
    const foes = [...MAJORS, 'neutral'].filter(side => side !== g.player),
      enemyUnits = g.units.filter(u => foes.includes(u.side));
    for (const side of foes) {
      g.tech[side] = techUpToTier(d.techTier);
      if (g.economy[side]) g.economy[side].credits = Math.round(g.economy[side].credits * d.income);
    }
    for (const [k, a] of Object.entries(COMMANDERS))
      if (a.side !== g.player) g.officers[k].rank = Math.min(RANKS.length - 1, g.officers[k].rank + d.ranks);
    enemyUnits.forEach((u, i) => {
      if (i % d.upgradeEvery === 0 && !(u.cmd && TYPES[u.type].cls === 'heavy')) u.type = upgradeType(u.type);
      if (d.stack) u.stack = Math.min(3, u.stack + 1);
    });
    // Reinforcements: copies of existing enemy units (never super-heavies) on free land hexes beside them.
    const extra = Math.ceil(enemyUnits.length / d.extraPer),
      land = enemyUnits.filter(u => !TYPES[u.type].naval);
    for (let n = 0, tries = 0; n < extra && tries < extra * 6; tries++) {
      const src = land[Math.floor(random(g) * land.length)],
        spot = adjacent(g, src).find(
          p =>
            !isSea(p) &&
            !TERRAIN[p.terrain]?.blocked &&
            !unitAt(g, p) &&
            (!stationAt(g, p) || stationAt(g, p).owner === src.side),
        );
      if (!spot) continue;
      const type = TYPES[src.type].cls === 'super' ? typeFor(src.side, 'heavy') : src.type;
      newUnit(g, type, src.side, spot.c, spot.r, src.stack);
      n++;
    }
    for (const u of g.units)
      if (foes.includes(u.side)) {
        u.hpTech = hullTech(g, u);
        u.hp = maxHP(u);
      }
    g.stations.forEach(st => fortify(g, st));
  }
  // Nearest tile to p (breadth-first, wrapping) that passes test.
  function nearest(g, p, test) {
    const start = tile(g, p.c, p.r),
      seen = new Set([key(start)]),
      queue = [start];
    while (queue.length) {
      const t = queue.shift();
      if (test(t)) return t;
      for (const n of adjacent(g, t))
        if (!seen.has(key(n))) {
          seen.add(key(n));
          queue.push(n);
        }
    }
    return null;
  }
  // mode: 'conquest' (the world war). The player's faction acts first; rivals follow in a fixed order.
  function createGame(player = 'britannia', difficulty = 'normal', mode = 'conquest', seed = 246801) {
    if (!MAJORS.includes(player)) player = 'britannia';
    const g = {
      game: 'knightmare',
      version: 1,
      rulesVersion: RULES_VERSION,
      player,
      difficulty,
      mode: 'conquest',
      era: 'world',
      order: [player, ...MAJORS.filter(s => s !== player)],
      seed,
      wrap: true,
      cols: WORLD.cols,
      rows: WORLD.rows,
      turn: 1,
      phase: player,
      nextId: 1,
      tiles: [],
      units: [],
      stations: [],
      log: [],
      strikes: [],
      fallen: {},
      economy: Object.fromEntries(
        [...MAJORS, 'neutral'].map(s => [s, { credits: s === 'neutral' ? 0 : 500, industry: 200, science: 40 }]),
      ),
      tech: { britannia: {}, eu: {}, cf: {}, neutral: {} },
      officers: Object.fromEntries(Object.keys(COMMANDERS).map(k => [k, defaultOfficer(k)])),
      roster: {},
      medalInventory: [],
      medalsEarned: [],
      over: null,
      stats: {},
      eliteDeployed: {},
      automation: {
        enabled: false,
        autoUpgrade: true,
        stack: 1,
        reserve: { ...AUTOMATION_DEFAULT_RESERVE },
        cities: {},
      },
    };
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++)
        g.tiles.push({ c, r, terrain: TERRAIN_CODES[WORLD_ROWS[r]?.[c]] || 'sea', owner: null });
    const freeLand = t => !isSea(t) && !TERRAIN[t.terrain].blocked;
    // Cities, mines and starting armies stand on solid land, never on a coast hex.
    const solidLand = t => freeLand(t) && !isCoast(t);
    for (const [name, lon, lat, owner, tier, capital = false, fort = false, gun] of CITY_DATA) {
      const at = nearest(g, hexOf(lon, lat), t => solidLand(t) && !stationAt(g, t));
      const s = {
        id: g.stations.length,
        name,
        c: at.c,
        r: at.r,
        owner,
        tier,
        lab: capital ? 1 : 0,
        refinery: 0,
        capital,
        capitalOf: capital ? owner : null,
        fort,
        gun: gun || null,
        ...cityBase([name, lon, lat, owner, tier, capital, fort]),
        producedTurn: 0,
      };
      s.shield = s.maxShield;
      setTileTerrain(g, at, 'plains');
      g.stations.push(s);
    }
    // Territory: each land hex belongs to the nearest city over land. Radius 11 preserves the old geographic reach on the denser map.
    const frontier = g.stations.map(s => ({ t: tile(g, s.c, s.r), owner: s.owner, d: 0 })),
      seenT = new Set(frontier.map(f => key(f.t)));
    for (const f of frontier) setTileOwner(g, f.t, f.owner);
    while (frontier.length) {
      const f = frontier.shift();
      if (f.d >= 11) continue;
      for (const n of adjacent(g, f.t))
        if (!seenT.has(key(n)) && freeLand(n)) {
          seenT.add(key(n));
          setTileOwner(g, n, f.owner);
          frontier.push({ t: n, owner: f.owner, d: f.d + 1 });
        }
    }
    for (const [c, r, owner] of TERRITORY) {
      const t = tile(g, c, r);
      if (t && freeLand(t)) setTileOwner(g, t, owner);
    }
    // Indonesia (including Borneo and its smaller islands) is entirely Chinese
    // Federation at the start of conquest. City-based land floodfill sometimes
    // assigned parts of Borneo to the Philippine/Britannian frontier or left
    // remote islands unowned. Correct GAME ownership here, not just the tint.
    // The geographic windows contain land belonging to the Indonesian
    // archipelago; unplayable ocean hexes are never assigned ownership.
    const indonesiaBands = [
      [94, 107.9, -7.8, 7.5],   // Sumatra and the western archipelago
      [106, 119.5, -11.5, 8],  // Java, Borneo and western Lesser Sunda
      [118, 134, -11.5, 4.5],  // Sulawesi, Lesser Sunda and Maluku
      [133, 141.9, -11.5, 3], // western New Guinea / Indonesian Papua
    ];
    for (const t of g.tiles) {
      if (isSea(t)) continue;
      const lon = WORLD.lon0 + WORLD.dlon * (t.c + 0.5 * (t.r & 1));
      const lat = WORLD.lat0 - WORLD.dlat * t.r;
      if (indonesiaBands.some(([west, east, south, north]) =>
          lon >= west && lon <= east && lat >= south && lat <= north))
        setTileOwner(g, t, 'cf');
    }
    // A coast hex beyond the cities' reach follows the land it borders, so shores never stand out unowned.
    for (let pass = 0, changed = true; changed && pass < 4; pass++) {
      changed = false;
      for (const t of g.tiles) {
        if (!isCoast(t) || t.owner) continue;
        const n = adjacent(g, t).find(n => !isSea(n) && n.owner);
        if (n) { setTileOwner(g, t, n.owner); changed = true; }
      }
    }
    assignCityProvinces(g);
    for (const [side, cls, lon, lat, stack, cmd] of ARMY_DATA) {
      const at = nearest(
        g,
        hexOf(lon, lat),
        t => solidLand(t) && !unitAt(g, t) && (!stationAt(g, t) || stationAt(g, t).owner === side),
      );
      if (at) newUnit(g, typeFor(side, cls), side, at.c, at.r, stack, cmd || null);
    }
    for (const [city, type, stack] of GARRISONS) {
      const s = g.stations.find(s => s.name === city);
      newUnit(g, type, 'neutral', s.c, s.r, stack);
    }
    for (const [city, level] of PORT_DATA) {
      const s = g.stations.find(s => s.name === city);
      if (s) openPort(g, s, level);
    }
    for (const [side, role, lon, lat, stack] of NAVY_DATA) {
      const at = nearest(g, hexOf(lon, lat), t => isSea(t) && !unitAt(g, t));
      if (at) newUnit(g, NAVAL[side][role], side, at.c, at.r, stack);
    }
    setupSakuradite(g);
    if (DIFFICULTIES[difficulty]?.level) harden(g, DIFFICULTIES[difficulty]);
    for (const u of g.units)
      if (u.cmd) {
        u.cmdRank = g.officers[u.cmd].rank;
        u.hp = maxHP(u);
      }
    g.startUnits = Object.fromEntries(MAJORS.map(s => [s, g.units.filter(u => u.side === s).length]));
    log(g, ERAS.world.desc, player);
    log(g, ERAS.world.rulesText, player);
    return g;
  }


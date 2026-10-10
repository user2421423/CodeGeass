  // ======== Compact saves ========
  // A conquest save stores the world as changes from the starting map instead of all 13,680 hexes: terrain that
  // differs from WORLD_ROWS, and every other per-hex field (owner, provinceCity, any future one) as runs over the
  // hexes in map order: [value, count], or [count] where the field is absent. Destroyed units are dropped (nothing
  // reads them; unit ids keep counting from g.nextId). Campaign maps are small and their saves stay whole.
  // unpackSave turns either kind back into a full game; migrateSave then runs as usual.
  const SAVE_PACK = 1;
  const baseTerrain = (c, r) => TERRAIN_CODES[WORLD_ROWS[r]?.[c]] || 'sea';
  function packSave(g) {
    if (g.mode === 'campaign' || g.cols !== WORLD.cols || g.rows !== WORLD.rows || g.tiles?.length !== g.cols * g.rows)
      return g;
    const { tiles, units, ...rest } = g;
    const fields = [...new Set(tiles.flatMap(t => Object.keys(t)))].filter(k => k !== 'c' && k !== 'r' && k !== 'terrain');
    const runs = {};
    for (const f of fields) {
      const out = (runs[f] = []);
      let value, has, n = 0;
      for (const t of tiles) {
        const h = f in t;
        if (n && h === has && t[f] === value) n++;
        else {
          if (n) out.push(has ? [value, n] : [n]);
          value = t[f];
          has = h;
          n = 1;
        }
      }
      if (n) out.push(has ? [value, n] : [n]);
    }
    return {
      ...rest,
      units: units.filter(u => u.hp > 0),
      packedTiles: {
        v: SAVE_PACK,
        terrain: tiles.flatMap((t, i) => (t.terrain !== baseTerrain(t.c, t.r) ? [[i, t.terrain]] : [])),
        fields: runs,
      },
    };
  }
  function unpackSave(p) {
    if (!p?.packedTiles) return p;
    const { packedTiles: pk, ...g } = p;
    if (pk.v !== SAVE_PACK || !(g.cols > 0 && g.rows > 0)) return null;
    const n = g.cols * g.rows,
      tiles = new Array(n);
    for (let i = 0; i < n; i++) {
      const c = i % g.cols,
        r = (i / g.cols) | 0;
      tiles[i] = { c, r, terrain: baseTerrain(c, r) };
    }
    for (const [i, terrain] of pk.terrain || []) if (tiles[i]) tiles[i].terrain = terrain;
    for (const [f, list] of Object.entries(pk.fields || {})) {
      let i = 0;
      for (const run of list) {
        const count = run.length === 1 ? run[0] : run[1];
        if (run.length === 2) for (let k = i; k < Math.min(n, i + count); k++) tiles[k][f] = run[0];
        i += count;
      }
    }
    g.tiles = tiles;
    return g;
  }
  function migrateSave(g) {
    g = unpackSave(g);
    if (!g || g.game !== 'knightmare' || !Array.isArray(g.units)) return null;
    // The high-resolution conquest rebuild cannot safely load saves from the old 100 × 42 world.
    if (g.mode !== 'campaign' && (g.cols !== WORLD.cols || g.rows !== WORLD.rows || g.tiles?.length !== WORLD.cols * WORLD.rows)) return null;
    if (g.rulesVersion !== RULES_VERSION) return null;
    if (!g.units.every(u => TYPES[u.type])) return null;
    if (g.mode !== 'campaign') {
      migrateCoastalTerrain(g);
      attachUnclaimedNewZealand(g);
      // Older saves have no province IDs. Bind their existing painted land to
      // its closest still-controlled city, without resetting conquest progress.
      assignCityProvinces(g);
    }
    g.eliteDeployed ||= {};
    for (const records of [g.officers, g.roster])
      if (records) for (const [k, rec] of Object.entries(records))
        if (COMMANDERS[k]) records[k] = cleanOfficer(k, rec);
    if (g.mode !== 'campaign') automationState(g);
    for (const u of g.units) {
      const elite = u.elite || ELITE_TYPE_TO_ID[u.type];
      if (elite) {
        u.elite = elite;
        u.eliteLevel ||= 1;
        g.eliteDeployed[elite] = true;
      }
      // Older saves left carried units at the hex where they boarded.
      for (const c of u.cargo || []) {
        c.c = u.c;
        c.r = u.r;
      }
    }
    return g;
  }

  // ======== Compact saves ========
  // A conquest save stores the world as changes from the starting map instead of all 13,680 hexes: terrain that
  // differs from WORLD_ROWS, and every other per-hex field (owner, provinceCity, any future one) as runs over the
  // hexes in map order: [value, count], or [count] where the field is absent. Destroyed units are dropped (nothing
  // reads them; unit ids keep counting from g.nextId). Campaign maps are small and their saves stay whole.
  // unpackSave turns either kind back into a full game; migrateSave then runs as usual.
  const SAVE_PACK = 1;
  const baseTerrain = (c, r) => TERRAIN_CODES[WORLD_ROWS[r]?.[c]] || 'sea';
  function packSave(g) {
    // Regional scenarios have their own map, so their terrain is packed with the other tile fields
    // instead of as differences from the world map.
    const regional = g.mode === 'scenario';
    if (g.mode === 'campaign' || (!regional && (g.cols !== WORLD.cols || g.rows !== WORLD.rows)) ||
        g.tiles?.length !== g.cols * g.rows)
      return g;
    const { tiles, units, ...rest } = g;
    const fields = [...new Set(tiles.flatMap(t => Object.keys(t)))]
      .filter(k => k !== 'c' && k !== 'r' && (regional || k !== 'terrain'));
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
        terrain: regional ? [] : tiles.flatMap((t, i) => (t.terrain !== baseTerrain(t.c, t.r) ? [[i, t.terrain]] : [])),
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
      tiles[i] = { c, r, terrain: g.mode === 'scenario' ? 'sea' : baseTerrain(c, r) };
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
    const regional = g.mode === 'scenario';
    // Regional scenarios carry their own map; the world-map checks and repairs below do not apply to them.
    if (regional && (!g.scenario?.id || !(g.cols > 0) || g.tiles?.length !== g.cols * g.rows)) return null;
    // The high-resolution conquest rebuild cannot safely load saves from the old 100 × 42 world.
    if (g.mode !== 'campaign' && !regional && (g.cols !== WORLD.cols || g.rows !== WORLD.rows || g.tiles?.length !== WORLD.cols * WORLD.rows)) return null;
    if (g.rulesVersion !== RULES_VERSION) return null;
    // Preserve saves containing retired scenario-only Elite carrier-battleships.
    const legacyCarriers = {
      elite_europe_eu_carrier: 'eu_carrier',
      elite_europe_eb_carrier: 'carrier_battleship',
      elite_japan_britannia_carrier: 'carrier_battleship',
      elite_japan_eu_carrier: 'eu_carrier',
      elite_japan_cf_carrier: 'cf_carrier',
      elite_japan_bk_carrier: 'bk_carrier',
    };
    for (const u of g.units.flatMap(v => [v, ...(v.cargo || [])])) {
      if (!legacyCarriers[u.type]) continue;
      u.type = legacyCarriers[u.type];
      delete u.elite;
      delete u.eliteLevel;
      delete u.eliteStart;
      u.stack = 1;
      u.hp = Math.min(u.hp, maxHP(u));
    }
    if (g.scenario?.eliteRosters) for (const side of Object.keys(g.scenario.eliteRosters))
      g.scenario.eliteRosters[side] = (g.scenario.eliteRosters[side] || [])
        .filter(id => !!ELITE_FORCES[id]);
    if (g.eliteDeployed) for (const id of Object.keys(g.eliteDeployed))
      if (/(?:japan|europe)_.*_carrier/.test(id)) delete g.eliteDeployed[id];
    if (!g.units.every(u => TYPES[u.type])) return null;
    if (g.mode === 'conquest') {
      const cfg = CONQUESTS[g.era || 'world'];
      if (!cfg) return null;
      g.era = cfg.id;
      g.majors = [...cfg.majors];
      g.teams = { ...cfg.teams };
      g.factions = cfg.factions ? JSON.parse(JSON.stringify(cfg.factions)) : null;
      if (!cfg.selectable.includes(g.player)) return null;
      // Reconcile old saves to one warhead per pool. In 2018 the Britannian
      // partners count together, with a human-owned warhead/project kept first.
      // Cancelled projects refund their ORIGINAL owner's treasury, not the ally's.
      g.arsenal ||= {};
      const visitedPools = new Set();
      for (const side of g.majors) {
        const members = fleijaPoolSides(g, side);
        const poolKey = members.join('/');
        if (visitedPools.has(poolKey)) continue;
        visitedPools.add(poolKey);
        const entries = [];
        for (const member of members) {
          if ((g.arsenal[member] || 0) > 0)
            entries.push({ member, kind: 'stored' });
          for (const s of g.stations.filter(s => s.project?.side === member))
            entries.push({ member, kind: 'project', station: s });
        }
        entries.sort((a, b) =>
          Number(b.member === g.player) - Number(a.member === g.player) ||
          Number(b.kind === 'stored') - Number(a.kind === 'stored') ||
          (a.station?.project.ready || 0) - (b.station?.project.ready || 0) ||
          g.majors.indexOf(a.member) - g.majors.indexOf(b.member));
        for (const member of members) g.arsenal[member] = 0;
        for (const [i, entry] of entries.entries()) {
          if (i < FLEIJA.max) {
            if (entry.kind === 'stored') g.arsenal[entry.member] = 1;
          } else if (entry.kind === 'project') {
            entry.station.project = null;
            const treasury = funds(g, entry.member);
            if (treasury) for (const [resource, amount] of Object.entries(FLEIJA.cost))
              treasury[resource] = (treasury[resource] || 0) + amount;
          }
        }
      }
    }
    if (g.mode !== 'campaign' && !regional) {
      migrateCoastalTerrain(g);
      attachUnclaimedNewZealand(g);
      repairCapeYorkOwnership(g);
      repairSakhalinTerritory(g);
      repairLegacyRegionalZones(g);
      // Older saves have no province IDs. Bind their existing painted land to
      // its closest still-controlled city, without resetting conquest progress.
      assignCityProvinces(g);
    }
    g.eliteDeployed ||= {};
    for (const [which, records] of [['officers', g.officers], ['roster', g.roster]])
      if (records) for (const [k, rec] of Object.entries(records))
        if (COMMANDERS[k]) records[k] = cleanOfficer(k, rec,
          which === 'officers' && ((eliteConquest(g) && (g.era === 'ufn2018' ? !serves(k, g.player, g) : COMMANDERS[k].side !== g.player)) ||
              (eliteCampaign(g) && g.units.some(u => u.cmd === k && foe(g, u.side, g.player))))
            ? RANKS.length - 1 : HQ_RANK_CAP);
    if (g.mode !== 'campaign') automationState(g);
    for (const u of g.units.flatMap(v => [v, ...(v.cargo || [])])) {
      const elite = u.elite || ELITE_TYPE_TO_ID[u.type];
      if (elite) {
        u.elite = elite;
        u.eliteLevel ||= 1;
        // Elite Forces are single frames; older saves let rival elites carry up to three.
        if (u.stack > 1 && u.hp > 0) {
          const share = u.hp / maxHP(u);
          u.stack = 1;
          u.hp = Math.max(1, Math.round(share * maxHP(u)));
        }
        // Scripted campaign elites and preplaced Elite Conquest/scenario starts never spend the player's
        // recruit allowance; in scenarios only the player's own deployments count.
        const preplaced = (eliteConquest(g) || eliteScenario(g)) && u.eliteStart;
        if (!eliteCampaign(g) && !preplaced && (!regional || u.side === g.player))
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

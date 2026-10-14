  // ======== The world ========
  function hexOf(lon, lat) {
    const r = clamp(Math.round((WORLD.lat0 - lat) / WORLD.dlat), 0, WORLD.rows - 1),
      c = Math.round((lon - WORLD.lon0) / WORLD.dlon - 0.5 - 0.5 * (r & 1));
    return { c: ((c % WORLD.cols) + WORLD.cols) % WORLD.cols, r };
  }
  function lonLatOf(p) {
    return { lon: WORLD.lon0 + (p.c + 0.5 + 0.5 * (p.r & 1)) * WORLD.dlon, lat: WORLD.lat0 - p.r * WORLD.dlat };
  }
  // The 2° Cape York coastal hex overlaps Australian land, but falls outside
  // the simplified mainland point mask. The nearest-city flood wrongly gives
  // that one hex to Port Moresby across Torres Strait. It must be neutral.
  // The same correction applies to legacy saves while Australia's six cities
  // remain neutral; legitimate Australian conquests must not be overwritten.
  function repairCapeYorkOwnership(g) {
    if (g.mode !== 'conquest' || g.cols !== WORLD.cols || g.rows !== WORLD.rows) return false;
    const cape = tile(g, 161, 50);
    if (!cape || isSea(cape) || cape.owner !== 'cf' ||
        tile(g, 160, 51)?.owner !== 'neutral' || tile(g, 161, 52)?.owner !== 'neutral') return false;
    const australianCities = ['Sydney', 'Melbourne', 'Perth', 'Darwin', 'Brisbane', 'Adelaide'];
    if (!australianCities.every(name => g.stations.some(s => s.name === name && s.owner === 'neutral')))
      return false;
    setTileOwner(g, cape, 'neutral');
    // Legacy compact saves may still attach the hex to a Papua province;
    // assignCityProvinces will reconcile the owner and province ID.
    delete cape.provinceCity;
    return true;
  }
  // Repair pre-audit saves only where the ORIGINAL incorrect province and
  // city ownership still exist. Do not reset territory that was truly captured.
  // Sakhalin is Russian territory, NOT an extension of Britannian
  // Hokkaido. At the 2-degree resolution coast hexes physically touch across
  // the Soya Strait, allowing Sapporo's starting flood to annex the island.
  // Initial games explicitly assign the five Sakhalin hexes; legacy saves are
  // repaired only when their old Sapporo province remains unchanged.
  function repairSakhalinTerritory(g, initial = false) {
    if (g.mode !== 'conquest' || g.cols !== WORLD.cols || g.rows !== WORLD.rows) return;
    const russian = g.era === 'ufn2018' ? 'eb' : 'eu';
    const sapporo = g.stations.find(s => s.name === 'Sapporo');
    const petropavlovsk = g.stations.find(s => s.name === 'Petropavlovsk');
    if (!initial && (sapporo?.owner !== 'britannia' || petropavlovsk?.owner !== russian))
      return;
    for (const id of SAKHALIN_WORLD_HEXES) {
      const [c,r] = id.split(',').map(Number), t = tile(g, c, r);
      if (!t || isSea(t)) continue;
      if (!initial && !(t.owner === 'britannia' && t.provinceCity === sapporo.id))
        continue;
      setTileOwner(g, t, russian);
      delete t.provinceCity;
    }
  }
  // Correct pre-fix 2018 saves that still have Gibraltar's Euro-Britannian
  // province running through western Morocco and the Sahara. A tile is repaired
  // only if it remains tied to Gibraltar (or has no old province ID), while
  // both neighbouring African cities still belong to Britannia. Captured
  // African cities and their genuine Euro-Britannian provinces are preserved.
  function repairGibraltarAfricanCorridor(g) {
    if (g.mode !== 'conquest' || g.era !== 'ufn2018' ||
        g.cols !== WORLD.cols || g.rows !== WORLD.rows) return;
    const city = name => g.stations.find(s => s.name === name);
    const gibraltar = city('Gibraltar');
    if (gibraltar?.owner !== 'eb' ||
        city('Casablanca')?.owner !== 'britannia' ||
        city('Algiers')?.owner !== 'britannia') return;
    for (const t of g.tiles) {
      if (isSea(t) || t.owner !== 'eb' ||
          t.c < 85 || t.c > 94 || t.r < 23 || t.r > 35 ||
          (t.provinceCity != null && t.provinceCity !== gibraltar.id)) continue;
      setTileOwner(g, t, 'britannia');
      delete t.provinceCity;
    }
  }
  function repairLegacyRegionalZones(g) {
    if (g.mode !== 'conquest' || g.cols !== WORLD.cols || g.rows !== WORLD.rows) return;
    repairGibraltarAfricanCorridor(g);
    const city = name => g.stations.find(s => s.name === name);
    const is2018 = g.era === 'ufn2018';
    const iraq = is2018 ? 'britannia' : 'neutral';
    const europe = is2018 ? 'eb' : 'eu';
    const oldGulf = is2018 ? 'britannia' : 'neutral';
    const baghdad = city('Baghdad'), tbilisi = city('Tbilisi');
    const northernIraq = tile(g, 110, 22);
    if (baghdad?.owner === iraq && tbilisi?.owner === europe &&
        northernIraq?.owner === europe && northernIraq.provinceCity === tbilisi.id) {
      setTileOwner(g, northernIraq, iraq);
      delete northernIraq.provinceCity;
    }
    const dubai = city('Dubai'), tehran = city('Tehran');
    if (dubai?.owner !== oldGulf || tehran?.owner !== 'cf') return;
    const misplaced = [[116,26],[117,26],[118,26],[119,26],
      [115,27],[116,27],[117,27],[118,27],[119,27]];
    for (const [c,r] of misplaced) {
      const t = tile(g, c, r);
      if (t?.owner !== oldGulf || t.provinceCity !== dubai.id) continue;
      setTileOwner(g, t, 'cf');
      delete t.provinceCity;
    }
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

  ERAS.ufn2018 = { ...CONQUESTS.ufn2018, name: CONQUESTS.ufn2018.title };

  // Operation difficulty. Normal is the operation as designed. Hard gives every rival power all tier I–II
  // HQ research, upgrades every other enemy unit one class and adds one unit per four. Challenge gives them all
  // research, upgrades every unit (with an extra frame), adds one unit per two and a richer treasury.
  const DIFFICULTIES = {
    normal: { name: 'Normal', level: 0, tokens: 1, desc: 'The world as it stands in 2017 a.t.b.' },
    elite: {
      name: 'Elite',
      level: 3,
      tokens: 2.5,
      techTier: 4,
      upgradeEvery: 1,
      extraPer: 2,
      stack: true,
      ranks: RANKS.length - 1, // Two Elite-only AI ranks above Marshal.
      income: 1.25,
      preserveNaval: true,
      desc: 'Inherits Challenge enemy research, reinforcements, extra frames and income. Enemy commanders reach Supreme Commander, two ranks above Marshal. Every starting land unit becomes an elite; AI starting commanders receive Lv.5 elite frames. Elite Forces are always single frames, on every side. Rival factories build unlimited elites by tier; player factories deploy each elite once plus normal units. Ships and amphibious units stay unchanged.',
    },
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
      ranks: PROMOTE_COST.length - 1, // Every starting rank reaches Marshal.
      income: 1.25,
      desc: 'Rival powers have every technology, every unit is upgraded with an extra frame, and their armies swell. Enemy commanders reach maximum rank.',
    },
  };
  function eliteConquest(g) {
    return g?.mode === 'conquest' && g.difficulty === 'elite';
  }
  function eliteCampaign(g) {
    return g?.mode === 'campaign' && g.difficulty === 'elite';
  }
  function eliteScenario(g) {
    return g?.mode === 'scenario' &&
      ['invasion-japan', 'division-japan', 'european-war', 'bering-strait', 'conquest-indochina', 'operation-stonehenge', 'area-18'].includes(g.scenario?.id) &&
      g.difficulty === 'elite';
  }
  function eliteAIProduction(g) {
    return eliteConquest(g) || eliteScenario(g);
  }
  // The player's unique factory deployment allowance is separate from
  // starting formations. Preplaced elite frames never consume it.
  function convertConquestEliteStarts(g) {
    if (!eliteConquest(g)) return;
    const used = {},
      landElites = Object.entries(ELITE_FORCES).filter(([, e]) => !TYPES[e.type].naval);
    for (const u of g.units) {
      const original = TYPES[u.type];
      if (!original || original.naval) continue; // ships/amphibious unchanged
      const faction = landElites.filter(([id]) => eliteEligible(g, u.side, id));
      // Neutral guards use elite templates but keep their neutral allegiance.
      const pool = faction.length ? faction : landElites;
      const sameClass = pool.filter(([, e]) => TYPES[e.type].cls === original.cls);
      const sameBranch = pool.filter(([, e]) => TYPES[e.type].branch === original.branch);
      const choices = sameClass.length ? sameClass : sameBranch.length ? sameBranch : pool;
      const id = choices[(used[u.side] || 0) % choices.length][0];
      used[u.side] = (used[u.side] || 0) + 1;
      u.type = ELITE_FORCES[id].type;
      u.elite = id;
      u.eliteLevel = u.cmd && u.side !== g.player ? 5 : 1;
      u.eliteStart = true;
      u.stack = 1; // Elite Forces are single frames on every side, AI included.
      u.hpTech = hullTech(g, u);
      u.hp = maxHP(u);
    }
  }
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
  function upgradeType(type, side = null, g = null) {
    const t = TYPES[type],
      next = UPGRADE[t.cls];
    if (t.naval) return t.naval === 'amphibious' && NAVAL[t.side] ? NAVAL[t.side].amphibious2 : type;
    if (!next || t.side === 'neutral') return type;
    // Challenge/Hard reinforcement upgrades must respect the U.F.N. lineup.
    return typeFor(ufnBlackKnights(g, side) ? side : t.side, next, g);
  }
  function techUpToTier(tier) {
    return Object.fromEntries(
      Object.values(TECH_NODES)
        .map(n => [n.id, n.tiers.filter(t => t <= tier).length])
        .filter(([, l]) => l > 0),
    );
  }
  function harden(g, d) {
    const foes = [...powersOf(g), 'neutral'].filter(side => side !== g.player),
      enemyUnits = g.units.filter(u => foes.includes(u.side) && (!d.preserveNaval || !TYPES[u.type].naval));
    for (const side of foes) {
      g.tech[side] = techUpToTier(d.techTier);
      if (g.economy[side]) g.economy[side].credits = Math.round(g.economy[side].credits * d.income);
    }
    for (const [k, a] of Object.entries(COMMANDERS))
      if ((g.era === 'ufn2018' ? !serves(k, g.player, g) : a.side !== g.player)) g.officers[k].rank = Math.min(d.preserveNaval ? RANKS.length - 1 : HQ_RANK_CAP, g.officers[k].rank + d.ranks);
    enemyUnits.forEach((u, i) => {
      if (i % d.upgradeEvery === 0 && !(u.cmd && TYPES[u.type].cls === 'heavy')) u.type = upgradeType(u.type, u.side, g);
      if (d.stack && !u.elite) u.stack = Math.min(3, u.stack + 1);
    });
    // Reinforcements: copies of existing enemy units (never super-heavies) on free land hexes beside them.
    const extra = Math.ceil(enemyUnits.length / d.extraPer),
      land = enemyUnits.filter(u => !TYPES[u.type].naval);
    for (let n = 0, tries = 0; n < extra && tries < extra * 6; tries++) {
      const src = land[Math.floor(random(g) * land.length)],
        spot = adjacent(g, src).find(
          p =>
            !isSea(p) &&
            p.owner === src.side &&
            !TERRAIN[p.terrain]?.blocked &&
            !unitAt(g, p) &&
            (!stationAt(g, p) || stationAt(g, p).owner === src.side),
        );
      if (!spot) continue;
      const type = TYPES[src.type].cls === 'super' ? typeFor(src.side, 'heavy', g) : src.type;
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
  // All Elite Conquest cities (including the player's and neutral cities) start
  // at factory Tier II or higher. Elite rivals retain their extra Tier III hubs.
  // Use the ordinary building calculations so displayed tier, yields and shields
  // agree; a raw change to s.tier would leave these statistics out of sync.
  function raiseFactoryTier(g, s, tier) {
      if (s.tier >= tier) return;
      const oldShield = s.shield, oldMaxShield = s.maxShield;
      buildingFoundation(g, s); // Snapshot the original city's Tier-I/II foundations.
      s.tier = tier;
      syncBuildings(g, s);
      // Equivalent to buying the missing factory upgrades: newly gained
      // shield capacity starts repaired, while existing damage stays intact.
      s.shield = Math.min(s.maxShield, oldShield + Math.max(0, s.maxShield - oldMaxShield));
  }
  function prepareEliteConquestFactories(g) {
    if (!eliteConquest(g)) return;
    for (const s of g.stations) raiseFactoryTier(g, s, 2);
    for (const side of powersOf(g).filter(s => s !== g.player)) {
      const cities = g.stations.filter(s => s.owner === side);
      const enemies = g.stations.filter(s => foe(g, s.owner, side) && isMajor(g, s.owner));
      const closest = s => Math.min(...enemies.map(other => dist(g, s, other)));
      const nearFront = cities.slice().sort((a, b) => closest(a) - closest(b) || a.id - b.id);
      let advanced = cities.filter(s => s.tier >= 3).length;
      for (const s of nearFront) {
        if (advanced >= Math.max(6, Math.ceil(cities.length / 8))) break;
        if (s.tier < 3) { raiseFactoryTier(g, s, 3); advanced++; }
      }
    }
  }
  // Elite Japan reuses Elite Conquest's frame conversion philosophy without
  // importing any persistent HQ research or commander upgrades. Starting units
  // use Level 1 frames, except AI starting commanders on Level 5; HQ unlocks only matter at the player's factory.
  function prepareEliteJapan(g) {
    // Both Japan scenarios share this setup; the European War has its own.
    if (!eliteScenario(g) || !['invasion-japan', 'division-japan'].includes(g.scenario?.id)) return g;
    const sides = g.order; // Use this scenario's playable allegiances.
    const signature = {
      suzaku: 'lancelot', cornelia: 'cornelia_gloucester',
      kallen: 'guren_mkii', zero: 'shinkiro',
      tohdoh: 'tohdoh_gekka', xingke: 'shen_hu',
      leila: 'leila_alexander', akito: 'akito_liberte',
      ryo: 'ryo_valiant', ayano: 'ayano_valiant',
    };
    for (const side of sides.filter(s => s !== g.player)) {
      g.tech[side] = techUpToTier(4);
    }
    // Keep the theatre's original output foundations before using the engine's
    // standard synchronization, even when a Japan city shares a world city name.
    for (const s of g.stations) {
      s.buildingFoundation ||= {
        industry: s.industry - 10 * s.tier,
        science: s.science - 8 * (s.lab || 0),
        maxShield: s.maxShield - (s.fortBonus || 0) - 60 * s.tier,
      };
      raiseFactoryTier(g, s, 2);
    }
    for (const side of sides.filter(s => s !== g.player)) {
      const own = g.stations.filter(s => s.owner === side),
        enemies = g.stations.filter(s => s.owner !== side && sides.includes(s.owner)),
        nearestEnemy = s => Math.min(...enemies.map(other => dist(g, s, other)));
      const candidates = own.slice().sort((a, b) => nearestEnemy(a) - nearestEnemy(b) || a.id - b.id);
      const target = Math.max(1, Math.ceil(own.length / 8));
      let upgraded = own.filter(s => s.tier >= 3).length;
      for (const s of candidates) {
        if (upgraded >= target) break;
        if (s.tier < 3) { raiseFactoryTier(g, s, 3); upgraded++; }
      }
    }
    for (const [id, rec] of Object.entries(g.officers))
      if (COMMANDERS[id]?.side !== g.player) rec.rank = RANKS.length - 1;
    const used = {};
    for (const u of g.units) {
      const old = TYPES[u.type];
      if (!old) throw new Error('Unknown Japan starting unit ' + u.type);
      // Elite scenarios retain ordinary carriers, including cargo rules.
      if (old.naval === 'ship') continue;
      let id = null;
      if (old.naval === 'amphibious') {
        id = { britannia:'portman_ii', cf:'shui_gun_ru_ii',
          bk:'japan_bk_amphibious', eu:'panzer_frosch_ii' }[u.side];
      } else {
        const pool = Object.entries(ELITE_FORCES).filter(([, e]) =>
          !e.scenarioOnly && !TYPES[e.type].naval && e.availableTo.includes(u.side));
        const byClass = pool.filter(([, e]) => TYPES[e.type].cls === old.cls),
          byBranch = pool.filter(([, e]) => TYPES[e.type].branch === old.branch),
          choices = byClass.length ? byClass : byBranch.length ? byBranch : pool;
        if (!choices.length) throw new Error('Missing Japan Elite roster for ' + u.side);
        id = u.cmd && signature[u.cmd] && ELITE_FORCES[signature[u.cmd]]?.availableTo.includes(u.side)
          ? signature[u.cmd] : choices[(used[u.side + ':' + old.cls] || 0) % choices.length][0];
        used[u.side + ':' + old.cls] = (used[u.side + ':' + old.cls] || 0) + 1;
      }
      if (!ELITE_FORCES[id]) throw new Error('Missing Japan naval Elite Force for ' + u.side);
      u.type = ELITE_FORCES[id].type;
      u.elite = id;
      u.eliteLevel = u.cmd && u.side !== g.player ? 5 : 1;
      u.eliteStart = true;
      u.stack = 1; // Elite Forces are single frames on every side, AI included.
      if (u.cmd) u.cmdRank = g.officers[u.cmd]?.rank ?? u.cmdRank;
      u.hpTech = hullTech(g, u);
      u.hp = maxHP(u);
    }
    for (const s of g.stations) fortify(g, s);
    return g;
  }
  // Elite European War uses its own two-faction roster instead of modifying the
  // historical Japan roster or Britannian unlock eligibility in other modes.
  function prepareEliteEurope(g) {
    if (!eliteScenario(g) || !['european-war','bering-strait','conquest-indochina','operation-stonehenge','area-18','britannia-western-russia'].includes(g.scenario?.id)) return g;
    const sides = g.scenario.id === 'area-18' ? ['britannia','eu','cf'] :
      g.scenario.id === 'operation-stonehenge' ? ['britannia','eu'] :
      g.scenario.id === 'bering-strait' || g.scenario.id === 'britannia-western-russia' ? ['britannia','eu'] :
      g.scenario.id === 'conquest-indochina' ? ['britannia','cf'] : ['eu','eb'];
    const signatures = {
      leila: 'leila_alexander', akito: 'akito_liberte',
      ryo: 'ryo_valiant', ayano: 'ayano_valiant',
      yukiya: 'yukiya_valiant', smilas: 'hummel_battery',
      suzaku: 'lancelot', cornelia: 'cornelia_gloucester',
      shin: 'lancelot', julius: 'mordred',
      ashley: 'vincent_ward', manfredi: 'cornelia_gloucester',
    };
    const naval = {
      eu: {amphibious:'panzer_frosch_ii'},
      cf: {amphibious:'shui_gun_ru_ii'},
      eb: {amphibious:'portman_ii'},
      britannia: {amphibious:'portman_ii'},
    };
    // Preserve this map's smaller city yields before raising factory tiers.
    for (const s of g.stations) {
      s.buildingFoundation ||= {
        industry: s.industry - 10 * s.tier,
        science: s.science - 8 * (s.lab || 0),
        maxShield: s.maxShield - (s.fortBonus || 0) - 60 * s.tier,
      };
      raiseFactoryTier(g, s, 2);
    }
    for (const side of sides.filter(side => side !== g.player)) {
      g.tech[side] = techUpToTier(4);
      const own = g.stations.filter(s => s.owner === side);
      const rivals = g.stations.filter(s => foe(g, s.owner, side) && sides.includes(s.owner));
      const distanceToEnemy = s => Math.min(...rivals.map(other => dist(g, s, other)));
      const byFront = own.slice().sort((a,b) =>
        distanceToEnemy(a) - distanceToEnemy(b) || a.id - b.id);
      const advanced = Math.max(1, Math.ceil(own.length / 8));
      let tier3 = own.filter(s => s.tier >= 3).length;
      for (const s of byFront) {
        if (tier3 >= advanced) break;
        if (s.tier < 3) { raiseFactoryTier(g, s, 3); tier3++; }
      }
    }
    // Only the actual rival officers deployed in this theatre become Supreme
    // Commanders. Euro Britannian commanders retain their global data-side.
    for (const u of g.units)
      if (u.cmd && u.side !== g.player && g.officers[u.cmd])
        g.officers[u.cmd].rank = RANKS.length - 1;
    const used = {};
    for (const u of g.units) {
      const old = TYPES[u.type];
      if (!old) throw new Error('Unknown European War starting unit '+u.type);
      // Carrier-battleships remain ordinary hulls even on Elite difficulty.
      if (old.naval === 'ship') continue;
      const roster = g.scenario.eliteRosters[u.side] || [];
      let id = old.naval ? naval[u.side]?.[old.naval] : null;
      if (!old.naval) {
        const pool = roster.filter(id => !TYPES[ELITE_FORCES[id]?.type]?.naval);
        const sameClass = pool.filter(id => TYPES[ELITE_FORCES[id].type].cls === old.cls);
        const sameBranch = pool.filter(id => TYPES[ELITE_FORCES[id].type].branch === old.branch);
        const choices = sameClass.length ? sameClass : sameBranch.length ? sameBranch : pool;
        if (!choices.length) throw new Error('Missing European Elite Force for '+u.side);
        const signature = signatures[u.cmd];
        const n = u.side+':'+old.cls;
        id = signature && roster.includes(signature)
          ? signature : choices[(used[n] || 0) % choices.length];
        used[n] = (used[n] || 0) + 1;
      }
      if (!id || !roster.includes(id) || !ELITE_FORCES[id])
        throw new Error('Missing European naval/land Elite Force for '+u.side+': '+u.type);
      u.type = ELITE_FORCES[id].type;
      u.elite = id;
      u.eliteLevel = u.cmd && u.side !== g.player ? 5 : 1;
      u.eliteStart = true;
      u.stack = 1;
      if (u.cmd) u.cmdRank = g.officers[u.cmd]?.rank ?? u.cmdRank;
      u.hpTech = hullTech(g,u);
      u.hp = maxHP(u);
    }
    for (const s of g.stations) fortify(g,s);
    return g;
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
  function createGame(player = 'britannia', difficulty = 'normal', mode = 'conquest', seed = 246801, conquest = 'world') {
    const cfg = CONQUESTS[conquest] || CONQUESTS.world;
    const majors = cfg.majors;
    if (!cfg.selectable.includes(player)) player = 'britannia';
    const g = {
      game: 'knightmare',
      version: 1,
      rulesVersion: RULES_VERSION,
      player,
      difficulty,
      mode: 'conquest',
      era: cfg.id,
      majors: [...majors],
      teams: { ...cfg.teams },
      factions: cfg.factions ? JSON.parse(JSON.stringify(cfg.factions)) : null,
      order: [player, ...majors.filter(s => s !== player)],
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
        [...majors, 'neutral'].map(s => [s, { credits: s === 'neutral' ? 0 : 500, industry: 200, science: 40, ...(cfg.initialTreasury?.[s] || {}) }]),
      ),
      tech: Object.fromEntries([...majors, 'neutral'].map(s => [s, {}])),
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
    for (const [name, lon, lat, oldOwner, tier, oldCapital = false, fort = false, gun] of CITY_DATA) {
      const owner = cfg.ownership?.[name] || oldOwner;
      const capital = cfg.id === 'ufn2018' ? ['Pendragon', 'St. Petersburg', 'Luoyang'].includes(name) : oldCapital;
      const fixed = COASTAL_CITY_HEXES[name];
      const at = fixed ? tile(g, fixed[0], fixed[1]) :
        nearest(g, hexOf(lon, lat), t => solidLand(t) && !stationAt(g, t));
      if (!at || !solidLand(at) || stationAt(g, at))
        throw new Error('Unavailable fixed starting city for ' + name);
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
    if (cfg.expectedCities) {
      const actual = Object.fromEntries([...majors, 'neutral'].map(side => [side, g.stations.filter(s => s.owner === side).length]));
      if (g.stations.length !== 168 || Object.keys(cfg.expectedCities).some(side => actual[side] !== cfg.expectedCities[side]))
        throw new Error('Invalid 2018 conquest territory: ' + JSON.stringify(actual));
    }
    // Territory: each land hex belongs to the nearest city over land. Radius 11 preserves the old geographic reach on the denser map.
    const frontier = g.stations.map(s => ({ t: tile(g, s.c, s.r), owner: s.owner, d: 0 })),
      seenT = new Set(frontier.map(f => key(f.t)));
    for (const f of frontier) setTileOwner(g, f.t, f.owner);
    while (frontier.length) {
      const f = frontier.shift();
      if (f.d >= 11) continue;
      for (const n of adjacent(g, f.t))
        if (!seenT.has(key(n)) && freeLand(n) && !crossesWorldPoliticalStrait(g, f.t, n)) {
          seenT.add(key(n));
          setTileOwner(g, n, f.owner);
          frontier.push({ t: n, owner: f.owner, d: f.d + 1 });
        }
    }
    for (const [c, r, owner] of TERRITORY) {
      const t = tile(g, c, r);
      if (t && freeLand(t)) setTileOwner(g, t, cfg.id === 'ufn2018' && owner === 'eu' ? 'cf' : owner);
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
    // Political borders near narrow straits cannot be determined by an unconstrained
    // nearest-city flood: coastal gameplay hexes can touch across separate landmasses.
    // These fixed geographic regions only establish the INITIAL map; later captures
    // and loaded saves continue to use their actual tile and city ownership.
    const mainlandAustralia = [
      [113.6,-22],[114,-26.2],[115,-29.5],[115.7,-32],[115,-33.6],
      [117.9,-35.1],[123.5,-33.9],[129,-31.6],[132,-32],[135.3,-34.6],
      [137.7,-33],[138.1,-35.6],[140.5,-38],[143.6,-38.8],
      [146.3,-39.1],[150,-37.5],[151.2,-33.9],[153.1,-30],
      [153.6,-28.2],[153.1,-25],[150.8,-22.6],[149.2,-21],
      [146.8,-19.2],[145.8,-16.9],[145.3,-14.9],
      [143.5,-12],[142.5,-10.7],[141.6,-12.8],[141.4,-16.5],
      [140.8,-17.5],[139.3,-17.4],[137,-15.9],[135.9,-14.9],
      [136.7,-12.2],[132.6,-11.5],[130.8,-12.4],[129.5,-15],
      [127.2,-13.9],[125,-15.5],[122.2,-17.9],[118.8,-20.3],
      [114.5,-21.8]
    ];
    // Southern shores of the Persian Gulf and the Arabian Peninsula; the
    // opposite shore of the gulf remains Iranian/Chinese Federation territory.
    const arabianPeninsula = [
      [34,31],[37,34],[41,35],[44.5,35.5],[47.3,31.7],
      [49,29.4],[50,27.5],[52.5,26.4],[55.5,25.2],
      [58,24.9],[61,23],[59,18],[56,17],[51,12],
      [45,12],[41,14],[39,17],[37,21],[35,27]
    ];
    function insidePolygon(lon, lat, polygon) {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j];
        if ((a[1] > lat) !== (b[1] > lat) &&
            lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0])
          inside = !inside;
      }
      return inside;
    }
    for (const t of g.tiles) {
      if (isSea(t)) continue;
      const lon = WORLD.lon0 + WORLD.dlon * (t.c + 0.5 + 0.5 * (t.r & 1));
      const lat = WORLD.lat0 - WORLD.dlat * t.r;
      if (insidePolygon(lon, lat, mainlandAustralia)) setTileOwner(g, t, 'neutral');
      else if (insidePolygon(lon, lat, arabianPeninsula))
        setTileOwner(g, t, cfg.id === 'ufn2018' ? 'britannia' : 'neutral');
    }
    // Political province audit: the global radius-11 flood must not let
    // Caucasian cities annex northern Iraq or Dubai claim Iran's north shore.
    // These controls are applied BEFORE city-province IDs are assigned, in
    // both eras. Territory subsequently changes only through city captures.
    const iraqBorder = [
      [39,34], [40,36.7], [42.7,37.5], [44.5,37.3],
      [46.1,36.3], [47.5,34.7], [48.5,32],
      [47.9,29.6], [46,29.2], [43,30], [41,31.5], [39,33]
    ];
    const iranGulfShore = [
      [49.4,31.5], [50,29.5], [51.8,28.0], [53.3,27.2],
      [54.9,27], [56.3,27], [57.7,27],
      [60.5,27], [61.8,28.5], [61,32], [49.4,32]
    ];
    for (const t of g.tiles) {
      if (isSea(t)) continue;
      const lon = WORLD.lon0 + WORLD.dlon * (t.c + 0.5 + 0.5 * (t.r & 1));
      const lat = WORLD.lat0 - WORLD.dlat * t.r;
      if (insidePolygon(lon, lat, iraqBorder))
        setTileOwner(g, t, cfg.id === 'ufn2018' ? 'britannia' : 'neutral');
      else if (insidePolygon(lon, lat, iranGulfShore))
        setTileOwner(g, t, 'cf');
    }
    repairCapeYorkOwnership(g);
    // This runs after regional ownership masks and before coastal infill.
    repairSakhalinTerritory(g, true);
    repairGibraltarAfricanCorridor(g);
    // A coast hex beyond the cities' reach follows the land it borders, so shores never stand out unowned.
    for (let pass = 0, changed = true; changed && pass < 4; pass++) {
      changed = false;
      for (const t of g.tiles) {
        if (!isCoast(t) || t.owner) continue;
        const n = adjacent(g, t).find(n => !isSea(n) && n.owner &&
          !crossesWorldPoliticalStrait(g, t, n));
        if (n) { setTileOwner(g, t, n.owner); changed = true; }
      }
    }
    // At 2-degree resolution a few UAE/Omani southern-shore coastal centres
    // lie north of the Arabian polygon. They remain on Dubai's bank even when
    // the Gulf shoreline barrier prevents Iran's city flood crossing water.
    for (const [c, r] of [[117,28],[118,28],[119,28]]) {
      const shore = tile(g, c, r);
      if (shore && !isSea(shore))
        setTileOwner(g, shore, cfg.id === 'ufn2018' ? 'britannia' : 'neutral');
    }
    attachUnclaimedNewZealand(g);
    assignCityProvinces(g);
    for (const [side, cls, lon, lat, stack, cmd, frameSource] of (cfg.armies || ARMY_DATA)) {
      const at = nearest(
        g,
        hexOf(lon, lat),
        t => solidLand(t) && !unitAt(g, t) && (cfg.id !== 'ufn2018' || t.owner === side) && (!stationAt(g, t) || stationAt(g, t).owner === side),
      );
      if (at) newUnit(g, typeFor(ufnBlackKnights(g, side) ? 'bk' : (frameSource || side), cls, g), side, at.c, at.r, stack, cmd || null);
    }
    for (const [city, type, stack] of (cfg.garrisons || GARRISONS)) {
      const s = g.stations.find(s => s.name === city);
      newUnit(g, type, 'neutral', s.c, s.r, stack);
    }
    for (const [city, level] of PORT_DATA) {
      const s = g.stations.find(s => s.name === city);
      if (s) openPort(g, s, level);
    }
    for (const [side, role, lon, lat, stack] of (cfg.navy || NAVY_DATA)) {
      const at = nearest(g, hexOf(lon, lat), t => isSea(t) && !unitAt(g, t));
      if (at) newUnit(g, navalRoster(g, side)[role], side, at.c, at.r, stack);
    }
    setupSakuradite(g);
    if (DIFFICULTIES[difficulty]?.level) harden(g, DIFFICULTIES[difficulty]);
    convertConquestEliteStarts(g); // Also converts every Challenge-style land reinforcement.
    prepareEliteConquestFactories(g);
    for (const u of g.units)
      if (u.cmd) {
        u.cmdRank = g.officers[u.cmd].rank;
        u.hp = maxHP(u);
      }
    g.startUnits = Object.fromEntries(majors.map(s => [s, g.units.filter(u => u.side === s).length]));
    log(g, (ERAS[cfg.id] || ERAS.world).desc, player);
    log(g, (ERAS[cfg.id] || ERAS.world).rulesText, player);
    ensureWarReport(g);
    return g;
  }


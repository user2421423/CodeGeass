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
        'A power surrenders only when it has lost every city: its armies disband and its mines pass to the conqueror. World Conquest has no armistice; eliminate every opposing major power to win.',
    },
  };

  ERAS.ufn2018 = { ...CONQUESTS.ufn2018, name: CONQUESTS.ufn2018.title };

  // Operation difficulty. Normal is the operation as designed. The same rules apply to every rival power in
  // Conquest, Story campaigns and regional scenarios:
  //   techTier     free HQ research up to this tier
  //   upgradeEvery every Nth starting unit moves up one class
  //   stack        extra frames on every starting unit (capped at three)
  //   extraPer     one reinforcement per N starting units, each with extraStack frames
  //   ranks        commander promotions (capped at Supreme Commander)
  //   income       multiplier on starting resources and on income every turn
  // Descriptions are generated from these numbers; `note` adds anything they cannot express.
  // `campaign` holds Story campaign overrides (dist/campaign.js merges them over the shared values):
  //   economy      multiplier on the player's starting resources
  const STORY_ACES = 'Named scripted aces retain Lv.1 elites. HQ-unlocked Elite Forces may be deployed.';
  const DIFFICULTIES = {
    normal: {
      name: 'Normal', level: 0, tokens: 1, note: 'The world as it stands in 2017 a.t.b.',
      campaign: {
        economy: 1.5,
        note: 'Ordinary scripted formations (up to 3 frames), favorable starting forces and 50% more starting resources. HQ-unlocked Elite Forces may be deployed at eligible factories.',
      },
    },
    elite: {
      name: 'Elite',
      level: 3,
      tokens: 2.5,
      techTier: 4,
      upgradeEvery: 1,
      extraPer: 3,
      extraStack: 1,
      stack: 0, // Land units become single-frame Elite Forces.
      ranks: HQ_RANK_CAP,
      income: 1.25,
      preserveNaval: true,
      note: 'Every starting land unit becomes an elite; enemy starting commanders receive Lv.3 elite frames. Elite Forces are always single frames, on every side. Rival factories build unlimited elites by tier; player factories deploy each elite once plus normal units. Ships and amphibious units stay unchanged.',
      campaign: {
        note: 'Land formations use one-frame Elite Forces; scripted carriers retain their hulls and cargo. Your Lv.1 armies face Lv.1 ordinary enemies, Lv.3 enemy commander elites and unlimited enemy elite production. Allied AI uses Lv.1 elites.',
      },
    },
    hard: {
      name: 'Hard',
      level: 1,
      tokens: 1.5,
      techTier: 2,
      upgradeEvery: 2,
      extraPer: 6,
      extraStack: 1,
      stack: 1,
      ranks: 3,
      income: 1.1,
      campaign: { note: STORY_ACES },
    },
    challenge: {
      name: 'Challenge',
      level: 2,
      tokens: 2,
      techTier: 4,
      upgradeEvery: 1,
      extraPer: 3,
      extraStack: 3,
      stack: 2,
      ranks: HQ_RANK_CAP,
      income: 1.25,
      campaign: { note: STORY_ACES },
    },
  };
  function describeDifficulty(d) {
    if (!d.level) return d.note || '';
    const count = n => ['no', 'one', 'two', 'three', 'four', 'five', 'six'][n] ?? String(n),
      frames = n => `${count(n)} frame${n === 1 ? '' : 's'}`,
      parts = [
        d.techTier >= 4 ? 'every technology' : `all tier I–${ROMAN[d.techTier]} research`,
        d.upgradeEvery === 1 ? 'every unit upgraded a class' :
          d.upgradeEvery === 2 ? 'half their units upgraded a class' : `one unit in ${d.upgradeEvery} upgraded a class`,
      ];
    if (d.stack) parts.push(`${d.stack === 1 ? 'an extra frame' : `${count(d.stack)} extra frames`} on every unit (up to three)`);
    if (d.extraPer) parts.push(`one reinforcement per ${count(d.extraPer)} units, each with ${frames(d.extraStack || 1)}`);
    if (d.income > 1) parts.push(`${Math.round((d.income - 1) * 100)}% more starting resources and income`);
    const ranks = d.ranks >= HQ_RANK_CAP ? 'Enemy commanders reach Supreme Commander.' :
      d.ranks ? `Enemy commanders gain ${d.ranks === 1 ? 'a rank' : `${count(d.ranks)} ranks`}.` : '';
    return [`Rival powers get ${parts.join('; ')}.`, ranks, d.note].filter(Boolean).join(' ');
  }
  for (const d of Object.values(DIFFICULTIES)) d.desc = describeDifficulty(d);
  // Hard adds one frame and Challenge two, capped at three. Elite Forces (and
  // every unit on Elite difficulty) stay single frames.
  function addDifficultyFrames(u, difficulty) {
    const extra = difficulty === 'elite' ? 0 : DIFFICULTIES[difficulty]?.stack || 0;
    if (!extra || u.elite) return;
    u.stack = Math.min(3, u.stack + extra);
    u.hp = maxHP(u);
  }
  // Reinforcements: copies of existing units (never super-heavies) on free friendly land beside them.
  function addDifficultyReinforcements(g, d, sources, count) {
    for (let n = 0, tries = 0; n < count && sources.length && tries < count * 6; tries++) {
      const src = sources[Math.floor(random(g) * sources.length)],
        spot = adjacent(g, src).find(
          p =>
            !isSea(p) &&
            p.owner === src.side &&
            !TERRAIN[p.terrain]?.blocked &&
            !unitAt(g, p) &&
            (!stationAt(g, p) || stationAt(g, p).owner === src.side),
        );
      if (!spot) continue;
      const type = !src.elite && TYPES[src.type].cls === 'super' ? typeFor(src.side, 'heavy', g) : src.type,
        u = newUnit(g, type, src.side, spot.c, spot.r, d.extraStack || 1);
      if (u.elite) { u.eliteLevel = 1; u.eliteStart = true; }
      n++;
    }
  }
  // Regional scenarios give every rival the same research, class upgrades, reinforcements, ranks and
  // starting resources as Conquest. Each scenario still picks which of its units get extra frames
  // (addDifficultyFrames) before calling this. Elite scenarios have already run prepareElite*.
  const scenarioRivals = g => (g.order || []).filter(side => side !== g.player);
  function scenarioUpgrade(g, u) {
    const t = TYPES[u.type], next = UPGRADE[t.cls];
    if (t.naval) return upgradeType(u.type, u.side, g);
    if (!next) return u.type;
    // Prefer the unit's own lineup, and never "upgrade" to a weaker frame.
    const stronger = type => TYPES[type] && TYPES[type].hp >= t.hp && TYPES[type].attack >= t.attack;
    return [typeFor(u.side, next, g), typeFor(t.side, next, g)].find(stronger) || u.type;
  }
  // Each strategic-campaign finale is also available as a standalone regional
  // scenario. Give both factions a one-frame airship and a sealed warhead on
  // turn 1. The engine enforces the turn-5 launch gate for both human and AI.
  function prepareFinaleArsenals(g) {
    if (!finaleScenario(g) || g.scenario.finaleArsenalInitialized) return g;
    g.scenario.finaleArsenalInitialized = true;
    g.arsenal ||= {};
    const sides = (g.order || []).filter(side => side !== 'neutral');
    for (const side of sides) {
      g.arsenal[side] = Math.max(1, g.arsenal[side] || 0);
      if (g.units.some(u => u.hp > 0 && u.side === side && TYPES[u.type]?.air)) continue;
      const type = airshipType(g, side);
      const home = g.stations.find(s => s.owner === side && s.capitalOf === side) ||
        g.stations.filter(s => s.owner === side).sort((a, b) => b.tier - a.tier || a.id - b.id)[0] ||
        g.units.find(u => u.side === side && u.hp > 0);
      if (!type || !home) continue;
      const free = t => t.terrain !== 'offmap' && t.terrain !== 'peak' &&
        !unitAt(g, t) && !stationAt(g, t) &&
        !g.stations.some(s => s.portAt?.c === t.c && s.portAt?.r === t.r);
      // Prefer the faction's home territory. Seaborne attackers instead deploy
      // beside their existing invasion fleets, without inventing a land base.
      const at = nearest(g, home, t => free(t) && t.owner === side) ||
        nearest(g, home, t => free(t) && t.terrain === 'sea');
      if (at) newUnit(g, type, side, at.c, at.r);
    }
    return g;
  }
  function applyScenarioDifficulty(g, difficulty = g.difficulty) {
    prepareFinaleArsenals(g);
    const d = DIFFICULTIES[difficulty];
    if (!d?.level) return g;
    const rivals = scenarioRivals(g);
    for (const side of rivals) {
      g.tech[side] = techUpToTier(d.techTier);
      const e = g.economy[side];
      if (e) for (const resource of ['credits', 'industry', 'sakuradite'])
        if (e[resource]) e[resource] = Math.round(e[resource] * d.income);
    }
    allUnits(g).filter(u => u.hp > 0 && rivals.includes(u.side) && !u.elite).forEach((u, i) => {
      if (i % d.upgradeEvery === 0 && !(u.cmd && TYPES[u.type].cls === 'heavy')) u.type = scenarioUpgrade(g, u);
    });
    const land = g.units.filter(u => u.hp > 0 && rivals.includes(u.side) && !TYPES[u.type].naval &&
      (difficulty === 'elite' || !u.elite));
    addDifficultyReinforcements(g, d, land, Math.ceil(land.length / d.extraPer));
    return refreshScenarioRivals(g, difficulty);
  }
  // Promotes rival commanders (once each) and refreshes rival hull research and HP. Alternate-history
  // scenarios call this again after reassigning commanders.
  function refreshScenarioRivals(g, difficulty = g.difficulty) {
    const d = DIFFICULTIES[difficulty];
    if (!d?.level) return g;
    const rivals = scenarioRivals(g), promoted = new Set(g.scenario?.difficultyPromoted || []);
    for (const u of allUnits(g)) {
      if (!rivals.includes(u.side)) continue;
      const rec = u.cmd && g.officers?.[u.cmd];
      if (rec && !promoted.has(u.cmd)) {
        rec.rank = Math.min(HQ_RANK_CAP, (rec.rank || 0) + d.ranks);
        promoted.add(u.cmd);
      }
      if (rec) u.cmdRank = rec.rank;
      u.hpTech = hullTech(g, u);
      u.hp = maxHP(u);
    }
    if (g.scenario) g.scenario.difficultyPromoted = [...promoted];
    return g;
  }
  function eliteConquest(g) {
    return g?.mode === 'conquest' && g.difficulty === 'elite';
  }
  function eliteCampaign(g) {
    return g?.mode === 'campaign' && g.difficulty === 'elite';
  }
  function eliteScenario(g) {
    return g?.mode === 'scenario' && g.difficulty === 'elite' && !!scenarioMeta(g).elite;
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
      u.eliteLevel = u.cmd && foe(g, u.side, g.player) ? 3 : 1;
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
    return typeFor(side === 'eb' || ufnBlackKnights(g, side) ? side : t.side, next, g);
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
      if ((g.era === 'ufn2018' ? !serves(k, g.player, g) : a.side !== g.player)) g.officers[k].rank = Math.min(HQ_RANK_CAP, g.officers[k].rank + d.ranks);
    enemyUnits.forEach((u, i) => {
      if (i % d.upgradeEvery === 0 && !(u.cmd && TYPES[u.type].cls === 'heavy')) u.type = upgradeType(u.type, u.side, g);
      if (d.stack && !u.elite) u.stack = Math.min(3, u.stack + d.stack);
    });
    addDifficultyReinforcements(g, d, enemyUnits.filter(u => !TYPES[u.type].naval), Math.ceil(enemyUnits.length / d.extraPer));
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
      s.cityTier ??= cityTierOf(s);
      buildingFoundation(g, s); // Preserve the factory's economic foundations.
      s.tier = tier;
      syncBuildings(g, s); // Factory tiers never add or restore city HP.
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
  // use Level 1 frames, except rival starting commanders on Level 3; HQ unlocks only matter at the player's factory.
  function prepareEliteJapan(g) {
    // Both Japan scenarios share this setup; the European War has its own.
    if (!eliteScenario(g) || scenarioMeta(g).elite !== 'japan') return g;
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
        maxShield: s.maxShield - (s.fortBonus || 0) - 50 * s.tier,
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
        const pool = Object.entries(ELITE_FORCES).filter(([id, e]) =>
          !e.scenarioOnly && !TYPES[e.type].naval && eliteEligible(g, u.side, id));
        const byClass = pool.filter(([, e]) => TYPES[e.type].cls === old.cls),
          byBranch = pool.filter(([, e]) => TYPES[e.type].branch === old.branch),
          choices = byClass.length ? byClass : byBranch.length ? byBranch : pool;
        if (!choices.length) throw new Error('Missing Japan Elite roster for ' + u.side);
        id = u.cmd && signature[u.cmd] && eliteEligible(g, u.side, signature[u.cmd])
          ? signature[u.cmd] : choices[(used[u.side + ':' + old.cls] || 0) % choices.length][0];
        used[u.side + ':' + old.cls] = (used[u.side + ':' + old.cls] || 0) + 1;
      }
      if (!ELITE_FORCES[id]) throw new Error('Missing Japan naval Elite Force for ' + u.side);
      u.type = ELITE_FORCES[id].type;
      u.elite = id;
      // Elite rivals' commander-led starts are Lv.3; every other conversion is Lv.1.
      u.eliteLevel = u.cmd && foe(g, u.side, g.player) ? 3 : 1;
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
    if (!eliteScenario(g) || scenarioMeta(g).elite !== true) return g;
    const sides = scenarioOf(g).sides;
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
        maxShield: s.maxShield - (s.fortBonus || 0) - 50 * s.tier,
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
      let id = old.naval ? (naval[u.side] || naval[g.scenario.equipment?.[u.side]])?.[old.naval] : null;
      if (!old.naval) {
        const pool = roster.filter(id => eliteEligible(g, u.side, id) && !TYPES[ELITE_FORCES[id]?.type]?.naval);
        const sameClass = pool.filter(id => TYPES[ELITE_FORCES[id].type].cls === old.cls);
        const sameBranch = pool.filter(id => TYPES[ELITE_FORCES[id].type].branch === old.branch);
        const choices = sameClass.length ? sameClass : sameBranch.length ? sameBranch : pool;
        if (!choices.length) throw new Error('Missing European Elite Force for '+u.side);
        const signature = g.scenario.eliteSignatures?.[u.cmd] || signatures[u.cmd];
        const n = u.side+':'+old.cls;
        id = signature && roster.includes(signature)
          ? signature : choices[(used[n] || 0) % choices.length];
        used[n] = (used[n] || 0) + 1;
      }
      if (!id || !roster.includes(id) || !eliteEligible(g, u.side, id))
        throw new Error('Missing European naval/land Elite Force for '+u.side+': '+u.type);
      u.type = ELITE_FORCES[id].type;
      u.elite = id;
      // Rival commander-led starts are Lv.3; other conversions are Lv.1. Player-built elites use HQ levels.
      u.eliteLevel = u.cmd && foe(g, u.side, g.player) ? 3 : 1;
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
    // Double the initial Research stockpile, including era-specific overrides;
    // income rates and other resource balances are unchanged.
    for (const side of majors) g.economy[side].science *= 2;
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++)
        g.tiles.push({ c, r, terrain: TERRAIN_CODES[WORLD_ROWS[r]?.[c]] || 'sea', owner: null });
    const freeLand = t => !isSea(t) && !TERRAIN[t.terrain].blocked;
    // Cities and mines need solid land; formations may start on friendly coast
    // hexes, just as land units can enter and occupy them during gameplay.
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
        cityTier: fort ? 4 : tier,
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
      // The Britannian 2018 Siberian expeditionary contingent starts on
      // allied Euro-Britannian land. No ownership changes and no cross-team
      // placement permission for any other formation or Conquest era.
      const alliedSiberianStart = cfg.id === 'ufn2018' && side === 'britannia' &&
        lon >= 90 && lon <= 120 && lat >= 48 && lat <= 60;
      const canStartOn = owner => owner === side || (alliedSiberianStart && owner === 'eb');
      // Starting armies must never jump onto an opposing or unclaimed region.
      // A coast hex is legitimate land for a Knightmare; excluding it used to
      // push crowded Japanese starts through the global nearest-tile search.
      const at = nearest(
        g,
        hexOf(lon, lat),
        t => freeLand(t) && !unitAt(g, t) &&
          canStartOn(t.owner) &&
          (!stationAt(g, t) || canStartOn(stationAt(g, t).owner)),
      );
      if (!at)
        throw new Error('No friendly starting hex for ' + side + ' ' + cls +
          ' near (' + lon + ', ' + lat + ') in ' + cfg.id);
      newUnit(g, typeFor(ufnBlackKnights(g, side) ? 'bk' : (frameSource || side), cls, g), side, at.c, at.r, stack, cmd || null);
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
      // Coastal water is navigable for warships; do not force a fleet out to a sea-only hex.
      const at = nearest(g, hexOf(lon, lat), t => navigable(t) && !unitAt(g, t));
      if (at) newUnit(g, navalRoster(g, side)[role], side, at.c, at.r, stack);
    }
    setupSakuradite(g);
    if (DIFFICULTIES[difficulty]?.level) harden(g, DIFFICULTIES[difficulty]);
    // Hard and Challenge can create additional uncommanded reinforcements.
    // In 2018 Britannia and the U.F.N. still begin with named ground forces only.
    if (cfg.id === 'ufn2018')
      g.units = g.units.filter(u =>
        !(['britannia', 'cf'].includes(u.side) && !u.cmd && !TYPES[u.type].naval));
    convertConquestEliteStarts(g); // Also converts every Challenge-style land reinforcement.
    prepareEliteConquestFactories(g);
    // Every power opens with one airship beside its capital (or its strongest city), on its own
    // land. Placed after difficulty hardening so it always starts as a single, unconverted frame.
    for (const side of majors) {
      // Euro Britannia is a separate 2018 faction, but flies Britannia's Logres.
      // Ensure its capital belongs to its own faction before choosing a berth.
      const type = side === 'eb' ? 'logres_airship' : airshipType(g, side),
        // In 2018 Britannia has no rear-area starting troops, including its airship.
        forwardHome = cfg.id === 'ufn2018' && side === 'britannia'
          ? g.stations.find(s => s.name === 'Baghdad' && s.owner === side) : null,
        home = forwardHome || g.stations.find(s => s.capitalOf === side && s.owner === side) ||
          g.stations.filter(s => s.owner === side).sort((a, b) => b.tier - a.tier || a.id - b.id)[0],
        at = type && home && nearest(g, home, t => solidLand(t) && t.owner === side && !unitAt(g, t) && !stationAt(g, t));
      if (at) newUnit(g, type, side, at.c, at.r);
    }
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


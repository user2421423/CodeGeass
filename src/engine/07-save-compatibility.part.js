
  // Event-driven War Report. Aggregates survive when detailed event history is capped.
  const WAR_EVENT_LIMIT=2500;
  function warSides(g){return [...new Set([...(g.order||[]),...(g.majors||[]),
    ...g.stations.map(s=>s.owner),...g.units.map(u=>u.side)])].filter(s=>s&&s!=='neutral');}
  function warSnapshot(g,turn){const sides={};for(const side of warSides(g)){
    const e=g.economy?.[side]||{};
    sides[side]={cities:g.stations.filter(s=>s.owner===side).length,
      units:g.units.filter(u=>u.hp>0&&u.side===side).length,
      credits:e.credits||0,industry:e.industry||0,science:e.science||0,sakuradite:e.sakuradite||0};}
    return {turn,sides};}
  function ensureWarReport(g){if(!g.warReport||!Array.isArray(g.warReport.events)||!Array.isArray(g.warReport.snapshots))
    g.warReport={version:1,since:g.turn||1,legacy:(g.turn||1)>1,
      lastCompleted:Math.max(0,(g.turn||1)-1),events:[],turns:{},groups:{},
      snapshots:[warSnapshot(g,Math.max(0,(g.turn||1)-1))]};
    return g.warReport;}
  function warCounters(r,turn,side){const row=(r.turns[turn] ||= {});
    return(row[side] ||= {citiesCaptured:0,citiesLost:0,enemiesDestroyed:0,unitsLost:0,
      unitsProduced:0,inflicted:0,received:0,commandersLost:0,invasionsWon:0,invasionsLost:0,
      fleijaLaunched:0,fleijaIntercepted:0,
      income:{credits:0,industry:0,science:0,sakuradite:0},
      spending:{credits:0,industry:0,science:0,sakuradite:0}});}
  function warGroup(g,u){const x=u&&(g.armyGroups||[]).find(a=>a.side===u.side&&a.units?.includes(u.id));
    return x?String(x.id):null;}
  function recordWarEvent(g,kind,side,data={}){if(!g||g.warReportMuted)return;
    // Victory-only Challenge Pass constraints survive saves and truncated War Reports.
    const challenge = g.mode === 'conquest' && g.challengePassRun?.version === 1 ? g.challengePassRun : null;
    if (challenge && kind === 'fleijaLaunch' && side === g.player) challenge.fleijaLaunch = true;
    if (challenge && kind === 'unitDestroyed' && data.unitSide === g.player && data.personal)
      challenge.officerLost = true;
    const r=ensureWarReport(g);
    // Routine damage, recruitment and economy actions remain in the exact per-turn
    // aggregates, avoiding huge saves and burying the major operational events.
    const notable=['cityCaptured','cityDestroyed','surrender','portCaptured','fleijaLaunch'].includes(kind)
      || (kind==='unitDestroyed'&&(!!data.commander||!!data.invasion));
    if(notable){r.events.push({turn:g.turn,side,kind,...data});
      if(r.events.length>WAR_EVENT_LIMIT)r.events.splice(0,r.events.length-WAR_EVENT_LIMIT);}
    const x=warCounters(r,g.turn,side),other=data.targetSide||data.previousOwner||data.unitSide;
    if(kind==='cityCaptured'){x.citiesCaptured++;
      if(other&&other!==side)warCounters(r,g.turn,other).citiesLost++;
      if(data.naval)x.invasionsWon++;
    }else if(kind==='cityDestroyed')warCounters(r,g.turn,data.owner||side).citiesLost++;
    else if(kind==='unitDestroyed'){const loss=other&&other!==side?warCounters(r,g.turn,other):x;
      loss.unitsLost++;if(data.commander)loss.commandersLost++;
      if(data.invasion)loss.invasionsLost++;
      if(data.byCombat&&other&&other!==side)x.enemiesDestroyed++;
    }else if(kind==='unitProduced')x.unitsProduced++;
    else if(kind==='damage'){const n=Math.max(0,Math.round(data.value||0));x.inflicted+=n;
      if(other&&other!==side)warCounters(r,g.turn,other).received+=n;
    }else if(kind==='fleijaLaunch'){x.fleijaLaunched++;
      if(data.intercepted&&data.defender)warCounters(r,g.turn,data.defender).fleijaIntercepted++;
    }else if(kind==='income'||kind==='spending'){
      for(const k of Object.keys(x[kind]))x[kind][k]+=Math.max(0,Math.round(data[k]||0));}
    if(data.group!=null&&['cityCaptured','unitDestroyed','damage'].includes(kind)){
      const key=side+':'+data.group,a=(r.groups[key] ||= {side,id:data.group,cities:0,kills:0,damage:0});
      if(kind==='cityCaptured')a.cities++;
      if(kind==='unitDestroyed'&&data.byCombat)a.kills++;
      if(kind==='damage')a.damage+=Math.max(0,Math.round(data.value||0));}}
  function warSpend(g,side,cost,purpose='military'){if(cost)
    recordWarEvent(g,'spending',side,{purpose,credits:cost.credits||0,
      industry:cost.industry||0,science:cost.science||0,sakuradite:cost.sakuradite||0});}
  function finishWarTurn(g,turn=g.turn){const r=ensureWarReport(g);
    if(turn>r.lastCompleted){r.snapshots.push(warSnapshot(g,turn));r.lastCompleted=turn;}
    return r;}
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
    // Old Stonehenge saves had a different map and an extra playable power.
    if (regional && scenarioMeta(g).saveVersion && g.scenario.version !== scenarioMeta(g).saveVersion) return null;
    // Prior Division of Japan saves stored permanent off-map stipends. Move
    // them into the original starting cities, including the universal national
    // Sakuradite allotment, without resetting accumulated resources or territory.
    if (regional && g.scenario.id === 'division-japan' &&
        Object.keys(g.scenario.funding || {}).length) {
      if (!g.stations.some(s => s.divisionIncome)) {
        const startingRegions = root.Knightmare?.scenarios?.divisionJapan?.regions;
        for (const [side, support] of Object.entries(g.scenario.funding)) {
          const cities = g.stations.filter(s => startingRegions?.[side]?.includes(s.name))
            .sort((a, b) => a.id - b.id);
          // If the original scenario registry is missing, prefer the current
          // cities to discarding earned income from a legacy save.
          const recipients = cities.length ? cities :
            g.stations.filter(s => s.owner === side).sort((a, b) => a.id - b.id);
          if (!recipients.length) continue;
          for (const resource of ['credits','industry','science','sakuradite']) {
            const extra = Math.max(0, (support?.[resource] || 0) +
              (resource === 'sakuradite' ? SAKURADITE.national : 0));
            const whole = Math.floor(extra), each = Math.floor(whole / recipients.length),
              remainder = whole % recipients.length;
            for (let i = 0; i < recipients.length; i++) {
              const amount = each + (i < remainder ? 1 : 0) + (i === 0 ? extra - whole : 0);
              if (!amount) continue;
              recipients[i].divisionIncome ||= {};
              recipients[i].divisionIncome[resource] =
                (recipients[i].divisionIncome[resource] || 0) + amount;
            }
          }
        }
      }
      g.scenario.funding = {};
    }
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
        if (COMMANDERS[k]) {
          const scenarioOfficers = which === 'officers' && eliteScenario(g)
            ? allUnits(g).filter(u => u.cmd === k && !u.personal && foe(g, u.side, g.player)) : [];
          // Older loads could cap the officer record but leave its unit's rank intact.
          // Recover that rank, including officers currently aboard carriers.
          const record = scenarioOfficers.length ? { ...rec,
            rank: Math.max(rec?.rank || 0, ...scenarioOfficers.map(u => u.cmdRank || 0)) } : rec;
          records[k] = cleanOfficer(k, record,
            which === 'officers' && (scenarioOfficers.length ||
              (eliteConquest(g) && (g.era === 'ufn2018' ? !serves(k, g.player, g) : COMMANDERS[k].side !== g.player)) ||
              (eliteCampaign(g) && allUnits(g).some(u => u.cmd === k && !u.personal && foe(g, u.side, g.player))))
              ? RANKS.length - 1 : HQ_RANK_CAP);
        }
    if (g.mode !== 'campaign') automationState(g);
    for (const u of g.units.flatMap(v => [v, ...(v.cargo || [])])) {
      if (eliteScenario(g) && u.cmd && COMMANDERS[u.cmd]) {
        const old = maxHP(u);
        u.cmdRank = officerOf(g, u).rank;
        if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
      }
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

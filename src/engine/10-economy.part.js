  // ======== Economy and cities ========
  function income(g, side) {
    const refining = 1 + techValue(g, side, 'cities.refining');
    const total = g.stations
      .filter(s => s.owner === side)
      .reduce((a, s) => {
        const y = cityOutput(g, s);
        a.credits += y.credits*(s.expTaxUntil>=g.turn?.8:1);
        if(g.units.some(u=>u.hp>0&&u.side===side&&u.c===s.c&&u.r===s.r&&fx(u).nationalUnity))a.credits+=Math.round(y.credits*.15);
        if(g.units.some(u=>u.hp>0&&u.side===side&&u.c===s.c&&u.r===s.r&&fx(u).royalCompassion))a.credits+=Math.round(y.credits*.15);
        a.industry += y.industry;
        a.science += y.science;
        return a;
      }, { credits: 0, industry: 0, science: 0 });
    total.industry = Math.round(total.industry);
    total.science = Math.round(total.science);
    // Sakuradite deposits: extraction by refinery level, with Japan's output allocated among the powers; a level-3
    // refinery also exports for credits.
    total.sakuradite = 0;
    for (const d of g.sites || []) {
      total.sakuradite += (depositShares(g, d)[side] || 0) * refining * (g.units.some(u=>u.hp>0&&u.side===side&&fx(u).kyoto&&dist(g,u,d)<=2)?1.2:1);
      if (depositOwner(g, d) === side) total.credits += depositYield(g, d).credits;
    }
    if (g.mode !== 'campaign' && (g.mode === 'scenario' ? g.order.includes(side) : isMajor(g, side)) && alive(g, side)) total.sakuradite += SAKURADITE.national;
    total.sakuradite = Math.round(total.sakuradite);
    // Regional operations receive fixed off-map military funding in addition
    // to city output. Captured cities still add (or remove) their normal
    // earnings. Do not give stipends to eliminated powers.
    const support = g.mode === 'scenario' && alive(g, side) &&
      g.stations.some(s => s.owner === side) ? g.scenario?.funding?.[side] : null;
    if (support) for (const resource of ['credits','industry','science','sakuradite'])
      total[resource] += support[resource] || 0;
    return total;
  }
  // New units deploy on the city hex itself, naval units on the port's sea hex; nothing is built while a unit stands
  // there (move it off first).
  function recruitOptions(g, s, side, type = null) {
    if ((TYPES[type]?.naval ? s.portOwner || s.owner : s.owner) !== side) return [];
    const at = TYPES[type]?.naval ? s.portAt && tile(g, s.portAt.c, s.portAt.r) : tile(g, s.c, s.r);
    return at && !unitAt(g, at) ? [at] : [];
  }
  // Unit prices depend on the frame and stack size, not faction.
  function price(type, stack = 1, g = null, side = null) {
    const t = TYPES[type];
    return {
      credits: Math.round(t.cost * (1 + 0.85 * (stack - 1))),
      industry: Math.round(t.industry * (1 + 0.85 * (stack - 1))),
      sakuradite: Math.round((t.sakuradite ?? SAKURADITE.cost[t.cls] ?? 0) * (1 + 0.85 * (stack - 1))),
    };
  }
  function canBuy(g, s, type, stack = 1, vacating = null) {
    return !buyReason(g, s, type, stack, vacating);
  }
  function recruit(g, stationId, type, stack = 1, position) {
    const s = g.stations.find(s => s.id === stationId);
    const why = buyReason(g, s, type, stack);
    if (why) return { ok: false, reason: why };
    const producer = TYPES[type].naval ? (s.portOwner || s.owner) : s.owner;
    const options = recruitOptions(g, s, producer, type);
    const p = position ? options.find(p => p.c === position.c && p.r === position.r) : options[0];
    if (!p) return { ok: false, reason: 'Deployment hex unavailable.' };
    const cost = decreePrice(price(type, stack, g, producer),s);
    if(s.expDecree&&!TYPES[type].naval)delete s.expDecree;
    warSpend(g,producer,cost,'production');
    spend(funds(g, producer), cost);
    if (TYPES[type].naval) s.portProducedTurn = g.turn;
    else s.producedTurn = g.turn;
    const u = newUnit(g, type, producer, p.c, p.r, stack, null, false);
    log(g, `${TYPES[type].short} ×${stack} rolls out at ${s.name}. Ready next turn.`, producer);
    return { ok: true, unit: u };
  }

  function elitePrice(id, level = 1) {
    const e = ELITE_FORCES[id], t = e && TYPES[e.type];
    if (!t) return { credits: 0, industry: 0, sakuradite: 0 };
    const premium = 1 + 0.04 * Math.max(0, level - 1);
    return {
      credits: Math.round(t.cost * premium),
      industry: Math.round(t.industry * premium),
      sakuradite: SAKURADITE.elite[e.rarity] ?? 0,
    };
  }
  // Land elites use a city factory; amphibious elites use the independently owned
  // port and its separate one-unit-per-turn shipyard slot.
  // Mission-owned roster snapshots provide an explicit, save-safe borrowing map.
  // Outside Elite Campaign, ordinary faction unlock/recruit rules remain unchanged.
  function eliteEligible(g, side, id) {
    const e = ELITE_FORCES[id];
    if (!e) return false;
    const roster = eliteCampaign(g) ? g.campaign?.eliteRosters?.[side] :
      g?.scenario?.id === 'european-war' ? g.scenario.eliteRosters?.[side] : null;
    if (roster) return roster.includes(id);
    if (ufnBlackKnights(g, side)) return e.availableTo.includes('bk');
    return e.availableTo.includes(side) || (g.era === 'ufn2018' && side === 'eb' && e.availableTo.includes('britannia'));
  }
  function eliteDeployReason(g, s, id, profile = {}) {
    const e = ELITE_FORCES[id],
      rec = e && eliteRecord(profile, id),
      t = e && TYPES[e.type];
    if (!e || !s || !t) return 'Unavailable';
    const naval = !!t.naval,
      producer = naval ? (s.portOwner || s.owner) : s.owner,
      availableLevel = e.scenarioOnly && eliteScenario(g) ? 1 : rec?.level;
    return (
      (g.over ? 'Operation over' : producer !== g.phase ? (naval ? 'Not your port' : 'Not your city') : null) ||
      (naval && g.mode === 'campaign' ? 'Naval elites are unavailable in campaign' : null) ||
      (!naval ? cityBusyReason(g, s) : null) ||
      (!eliteEligible(g, producer, id) ? 'This Elite Force is not available to this faction' : null) ||
      (e.scenarioOnly && !eliteScenario(g) ? 'Available only in the relevant Elite scenario' : null) ||
      (!availableLevel ? `Locked — collect ${ELITE_UNLOCK_FRAGMENTS} fragments and unlock it in HQ` : null) ||
      (naval && (!s.portAt || (s.portLevel || 0) < t.port) ? `Requires a level-${t.port} port` : null) ||
      (!naval && s.tier < t.tier ? `Requires factory level ${t.tier}` : null) ||
      (g.eliteDeployed?.[id] ? 'Already deployed in this operation' : null) ||
      (naval
        ? s.portProducedTurn === g.turn ? 'This port already launched a unit this turn' : null
        : s.producedTurn === g.turn ? 'Already built here this turn' : null) ||
      (!recruitOptions(g, s, producer, e.type).length ? (naval ? 'A unit is on the port' : 'A unit is on the city') : null) ||
      shortfall(funds(g, producer), elitePrice(id, eliteCampaign(g) ? 1 : availableLevel || 1))
    );
  }
  function deployElite(g, stationId, id, profile = {}, position) {
    const s = g.stations.find(v => v.id === stationId),
      why = eliteDeployReason(g, s, id, profile);
    if (why) return { ok: false, reason: why };
    const e = ELITE_FORCES[id],
      t = TYPES[e.type],
      producer = t.naval ? (s.portOwner || s.owner) : s.owner,
      rec = e.scenarioOnly && eliteScenario(g) ? { level: 1 } : eliteRecord(profile, id),
      options = recruitOptions(g, s, producer, e.type),
      p = position ? options.find(v => v.c === position.c && v.r === position.r) : options[0],
      cost = elitePrice(id, eliteCampaign(g) ? 1 : rec.level);
    if (!p) return { ok: false, reason: 'Deployment hex unavailable.' };
    warSpend(g,producer,cost,'production');
    spend(funds(g, producer), cost);
    if (t.naval) s.portProducedTurn = g.turn;
    else s.producedTurn = g.turn;
    g.eliteDeployed ||= {};
    g.eliteDeployed[id] = true;
    const u = newUnit(g, e.type, producer, p.c, p.r, 1, null, false);
    u.elite = id;
    u.eliteLevel = eliteCampaign(g) ? 1 : rec.level;
    u.hp = maxHP(u);
    log(g, `${t.name} · Elite Lv.${u.eliteLevel} deploys at ${t.naval ? 'the port of ' : ''}${s.name}. Ready next turn.`, producer);
    return { ok: true, unit: u, cost };
  }
  // Rival factories can repeat Elite Forces indefinitely, but each frame must
  // satisfy its factory tier just as it does for a player.
  function aiEliteRecruitReason(g, s, id, vacating = null) {
    const e = ELITE_FORCES[id], t = e && TYPES[e.type];
    if ((!eliteAIProduction(g) && !eliteCampaign(g)) || !s || !e || !t) return 'Not an Elite AI operation';
    const naval = !!t.naval,
      producer = naval ? (s.portOwner || s.owner) : s.owner;
    if (producer === g.player || !eliteEligible(g, producer, id) ||
        (eliteConquest(g) && (naval || !isMajor(g, producer))) ||
        (eliteScenario(g) && !g.order.includes(producer)) ||
        (eliteCampaign(g) && (naval || (!foe(g, producer, g.player) &&
          !g.campaign?.production?.includes(producer)))) ||
        (e.scenarioOnly && !eliteScenario(g)))
      return 'Not an eligible Elite AI factory or port';
    return (
      turnReason(g, producer) ||
      (!naval ? cityBusyReason(g, s) : null) ||
      (naval && (!s.portAt || (s.portLevel || 0) < t.port)
        ? `Requires port level ${t.port}` : null) ||
      (!naval && s.tier < t.tier ? `Requires factory level ${t.tier}` : null) ||
      ((naval ? s.portProducedTurn : s.producedTurn) === g.turn
        ? 'Already produced here this turn' : null) ||
      (!recruitOptions(g, s, producer, e.type).length &&
        !(vacating && !naval && unitAt(g, s) === vacating)
        ? (naval ? 'A unit is on the port' : 'A unit is on the city') : null) ||
      shortfall(funds(g, producer), elitePrice(id, eliteCampaign(g) ? 3 : 1))
    );
  }
  function recruitAIElite(g, stationId, id) {
    const s = g.stations.find(v => v.id === stationId);
    const why = aiEliteRecruitReason(g, s, id);
    if (why) return { ok: false, reason: why };
    const e = ELITE_FORCES[id], t = TYPES[e.type],
      producer = t.naval ? (s.portOwner || s.owner) : s.owner,
      p = recruitOptions(g, s, producer, e.type)[0],
      level = eliteCampaign(g) ? 3 : 1,
      cost = elitePrice(id, level);
    if (!p) return { ok: false, reason: 'Deployment hex unavailable' };
    warSpend(g,producer,cost,'production');
    spend(funds(g, producer), cost);
    if (t.naval) s.portProducedTurn = g.turn;
    else s.producedTurn = g.turn;
    const u = newUnit(g, e.type, producer, p.c, p.r, 1, null, false);
    u.eliteLevel = level;
    u.hp = maxHP(u);
    log(g, `${t.name} · Elite Lv.${level} deploys at ${t.naval ? 'the port of ' : ''}${s.name}. Ready next turn.`, producer);
    return { ok: true, unit: u, cost };
  }
  function unitStats(g, u) {
    const t = TYPES[u.type], s = eliteScale(u), r = rangeOf(g, u);
    return {
      hp: maxHP(u),
      attack: Math.round(intrinsicAttack(g, u)),
      armor: t.armor + s.armor,
      move: isSea(tile(g, u.c, u.r))
        ? t.naval === 'amphibious' ? amphibiousSea(g, u) : atSea(g, u) ? seaMove(g, u) : movement(g, u)
        : movement(g, u),
      min: r.min,
      max: r.max,
    };
  }
  // u: the unit being reinforced, for Inoue's Resistance Logistics discount (30% off credits and industry).
  function reinforceCost(type, g = null, side = null, u = null) {
    const p = price(type, 1, g, side),
      k = u && g && logisticsNear(g, u) ? 0.7 : 1;
    return { credits: Math.round(p.credits * k), industry: Math.round(p.industry * k), sakuradite: p.sakuradite };
  }
  // Repairs restore 35% of the frame for a fifth of the unit's build price.
  function repairCost(u, g = null) {
    const half = g && skillNear(g, u, 'repairSupply', 2) ? 0.5 : 1;
    const staff = g && skillNear(g, u, 'staffRepair', 1) ? 0.8 : 1;
    const camelot = g && u.elite && !TYPES[u.type].naval && skillNear(g, u, 'combatEngineering', 2) ? 0.8 : 1;
    return Math.max(10, Math.round(baseRepairCost(u) * half * staff * camelot * (g && logisticsNear(g, u) ? 0.7 : 1)));
  }
  function baseRepairCost(u) {
    return Math.max(20, Math.round(price(u.type, u.stack, null, u.side).credits * 0.2));
  }
  function reinforce(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = reinforceReason(g, u);
    if (why) return { ok: false, reason: why };
    const cost = reinforceCost(u.type, g, u.side, u),
      e = funds(g, u.side);
    warSpend(g,u.side,cost,'reinforcement');
    spend(e, cost);
    const old = maxHP(u);
    u.stack++;
    u.hp += maxHP(u) - old;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} reinforced to ${u.stack} frames.`, u.side);
    return { ok: true };
  }
  function repair(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = repairReason(g, u);
    if (why) return { ok: false, reason: why };
    const cost = repairCost(u, g);
    warSpend(g,u.side,{credits:cost},'repair');
    funds(g, u.side).credits -= cost;
    const amount = Math.min(maxHP(u) - u.hp, Math.round(maxHP(u) * 0.35));
    u.hp += amount;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} repairs ${amount} frame.`, u.side);
    return { ok: true, amount };
  }
  const BUILDINGS = {
    factory: {
      name: 'Knightmare factory',
      field: 'tier',
      desc: 'Unlocks heavier frames (level 2: mainline, raider and rocket; level 3: heavy, super-heavy and siege). +10 industry and +60 defense per level.',
    },
    lab: {
      name: 'Research lab',
      field: 'lab',
      desc: 'Produces research (+8 per level). Research banked when you win becomes command tokens.',
    },
    port: {
      name: 'Port',
      field: 'portLevel',
      desc: 'Coastal cities only, on a sea hex beside the city. Level 1 builds amphibious Knightmares, level 2 Carrier-Battleships; naval units berthed there repair 10%, 20% or 30% a turn, and level 3 enables tier IV naval research.',
    },
    refinery: {
      name: 'Sakuradite refinery',
      field: 'refinery',
      desc: 'Only where there is a Sakuradite deposit. Extracts 25% of its output, then 50%, 75% and 100% (+15 credits) at levels 1–3.',
    },
  };
  function buildingLevel(s, kind) {
    return s[BUILDINGS[kind].field] || 0;
  }
  function buildCost(s, kind) {
    const l = buildingLevel(s, kind);
    // A factory wrecked to level 0 (F.L.E.I.J.A.) is rebuilt for the price of a level-1 lab.
    if (kind === 'factory') return l ? { credits: 160 * l, industry: 40 * l } : { credits: 110, industry: 25 };
    if (kind === 'lab') return { credits: 110 * (l + 1), industry: 25 * (l + 1) };
    if (kind === 'port') return { credits: 140 * (l + 1), industry: 35 * (l + 1) };
    return { credits: 120 * (l + 1), industry: 30 * (l + 1) };
  }
  // Remember each city's output before building contributions, including custom campaign cities.
  // World-city data also recovers the foundation in older saves whose factories were already damaged.
  // The foundation can be negative: some starting factories have less output than upgrades add.
  function buildingFoundation(g, s) {
    if (s.buildingFoundation) return s.buildingFoundation;
    const row = g.mode !== 'campaign' && CITY_DATA.find(r => r[0] === s.name),
      base = row ? cityBase(row) : s,
      tier = row ? row[4] : s.tier || 0,
      lab = row ? row[5] ? 1 : 0 : s.lab || 0;
    return s.buildingFoundation ||= {
      industry: base.industry - 10 * tier,
      science: base.science - 8 * lab,
      maxShield: base.maxShield - (row ? 0 : s.fortBonus || 0) - 60 * tier,
    };
  }
  function syncBuildings(g, s) {
    const base = buildingFoundation(g, s);
    s.industry = Math.max(0, base.industry + 10 * (s.tier || 0));
    s.science = Math.max(0, base.science + 8 * (s.lab || 0));
    s.maxShield = Math.max(0, base.maxShield + 60 * (s.tier || 0) + (s.fortBonus || 0));
  }
  function build(g, id, kind) {
    const s = g.stations.find(s => s.id === id),
      b = BUILDINGS[kind];
    const why = buildReason(g, s, kind);
    if (why) return { ok: false, reason: why };
    const cost = decreePrice(buildCost(s, kind),s),
      e = funds(g, s.owner);
    if(s.expDecree)delete s.expDecree;
    buildingFoundation(g, s);
    warSpend(g,s.owner,cost,'construction');
    spend(e, cost);
    if (kind === 'port' && !s.portAt) {
      const t = portSite(g, s);
      s.portAt = { c: t.c, r: t.r };
      s.portOwner = s.owner;
    }
    s[b.field] = buildingLevel(s, kind) + 1;
    if (kind === 'factory') {
      syncBuildings(g, s);
      s.shield = Math.min(s.maxShield, s.shield + 60);
    } else if (kind === 'lab') syncBuildings(g, s);
    log(g, `${s.name}: ${b.name} upgraded to level ${s[b.field]}.`, s.owner);
    return { ok: true };
  }

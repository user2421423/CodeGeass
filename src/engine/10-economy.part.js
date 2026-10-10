  // ======== Economy and cities ========
  function income(g, side) {
    const refining = 1 + techValue(g, side, 'cities.refining');
    const total = g.stations
      .filter(s => s.owner === side)
      .reduce((a, s) => {
        const y = cityOutput(g, s);
        a.credits += y.credits;
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
      total.sakuradite += (depositShares(g, d)[side] || 0) * refining;
      if (depositOwner(g, d) === side) total.credits += depositYield(g, d).credits;
    }
    if (g.mode !== 'campaign' && MAJORS.includes(side) && alive(g, side)) total.sakuradite += SAKURADITE.national;
    total.sakuradite = Math.round(total.sakuradite);
    return total;
  }
  // New units deploy on the city hex itself, naval units on the port's sea hex; nothing is built while a unit stands
  // there (move it off first).
  function recruitOptions(g, s, side, type = null) {
    if (s.owner !== side) return [];
    const at = TYPES[type]?.naval ? s.portAt && tile(g, s.portAt.c, s.portAt.r) : tile(g, s.c, s.r);
    return at && !unitAt(g, at) ? [at] : [];
  }
  // The Federation's doctrine discounts its Infantry. Sakuradite is priced by class (SAKURADITE.cost).
  function price(type, stack = 1, g = null, side = null) {
    const t = TYPES[type],
      off = (side || t.side) === 'cf' && t.branch === 'Infantry' ? 0.85 : 1;
    return {
      credits: Math.round(t.cost * (1 + 0.85 * (stack - 1)) * off),
      industry: Math.round(t.industry * (1 + 0.85 * (stack - 1)) * off),
      sakuradite: Math.round((t.sakuradite ?? SAKURADITE.cost[t.cls] ?? 0) * (1 + 0.85 * (stack - 1)) * off),
    };
  }
  function canBuy(g, s, type, stack = 1) {
    return !buyReason(g, s, type, stack);
  }
  function recruit(g, stationId, type, stack = 1, position) {
    const s = g.stations.find(s => s.id === stationId);
    const why = buyReason(g, s, type, stack);
    if (why) return { ok: false, reason: why };
    const options = recruitOptions(g, s, s.owner, type);
    const p = position ? options.find(p => p.c === position.c && p.r === position.r) : options[0];
    if (!p) return { ok: false, reason: 'Deployment hex unavailable.' };
    const cost = price(type, stack, g, s.owner);
    spend(funds(g, s.owner), cost);
    s.producedTurn = g.turn;
    const u = newUnit(g, type, s.owner, p.c, p.r, stack, null, false);
    log(g, `${TYPES[type].short} ×${stack} rolls out at ${s.name}. Ready next turn.`, s.owner);
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
  function eliteDeployReason(g, s, id, profile = {}) {
    const e = ELITE_FORCES[id],
      rec = e && eliteRecord(profile, id);
    if (!e || !s) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      cityBusyReason(g, s) ||
      (!e.availableTo.includes(s.owner) ? 'This Elite Force is not available to this faction' : null) ||
      (!rec?.level ? `Locked — collect ${ELITE_UNLOCK_FRAGMENTS} fragments and unlock it in HQ` : null) ||
      (s.tier < TYPES[e.type].tier ? `Requires factory level ${TYPES[e.type].tier}` : null) ||
      (g.eliteDeployed?.[id] ? 'Already deployed in this operation' : null) ||
      (s.producedTurn === g.turn ? 'Already built here this turn' : null) ||
      (!recruitOptions(g, s, s.owner).length ? 'A unit is on the city' : null) ||
      shortfall(funds(g, s.owner), elitePrice(id, rec?.level || 1))
    );
  }
  function deployElite(g, stationId, id, profile = {}, position) {
    const s = g.stations.find(v => v.id === stationId),
      why = eliteDeployReason(g, s, id, profile);
    if (why) return { ok: false, reason: why };
    const e = ELITE_FORCES[id],
      rec = eliteRecord(profile, id),
      options = recruitOptions(g, s, s.owner),
      p = position ? options.find(v => v.c === position.c && v.r === position.r) : options[0],
      cost = elitePrice(id, rec.level);
    if (!p) return { ok: false, reason: 'Deployment hex unavailable.' };
    spend(funds(g, s.owner), cost);
    s.producedTurn = g.turn;
    g.eliteDeployed ||= {};
    g.eliteDeployed[id] = true;
    const u = newUnit(g, e.type, s.owner, p.c, p.r, 1, null, false);
    u.elite = id;
    u.eliteLevel = rec.level;
    u.hp = maxHP(u);
    log(g, `${TYPES[e.type].name} · Elite Lv.${rec.level} deploys at ${s.name}. Ready next turn.`, s.owner);
    return { ok: true, unit: u, cost };
  }
  function unitStats(g, u) {
    const t = TYPES[u.type], s = eliteScale(u), r = rangeOf(g, u), st = COMMANDERS[u.cmd]?.stats || {};
    return {
      hp: maxHP(u),
      attack: Math.round(t.attack * s.attack * (1 + 0.45 * (u.stack - 1)) * officerAttack(g, u) * (1 + (st.dmg || 0)) * (1 + (st.dmgBranch?.[t.branch] || 0))),
      armor: t.armor + s.armor,
      move: movement(g, u),
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
    return Math.max(10, Math.round(baseRepairCost(u) * half * staff * (g && logisticsNear(g, u) ? 0.7 : 1)));
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
  function build(g, id, kind) {
    const s = g.stations.find(s => s.id === id),
      b = BUILDINGS[kind];
    const why = buildReason(g, s, kind);
    if (why) return { ok: false, reason: why };
    const cost = buildCost(s, kind),
      e = funds(g, s.owner);
    spend(e, cost);
    if (kind === 'port' && !s.portAt) {
      const t = portSite(g, s);
      s.portAt = { c: t.c, r: t.r };
      s.portOwner = s.owner;
    }
    s[b.field] = buildingLevel(s, kind) + 1;
    if (kind === 'factory') {
      s.industry += 10;
      s.maxShield += 60;
      s.shield = Math.min(s.maxShield, s.shield + 60);
    } else if (kind === 'lab') s.science += 8;
    log(g, `${s.name}: ${b.name} upgraded to level ${s[b.field]}.`, s.owner);
    return { ok: true };
  }

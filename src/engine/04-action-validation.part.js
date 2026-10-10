  // ======== Reasons an order is unavailable (null when it is allowed) ========
  function shortfall(e, cost) {
    const need = [
      ['credits', 'credits'],
      ['industry', 'industry'],
      ['science', 'research'],
      ['sakuradite', 'Sakuradite'],
    ]
      .filter(([k]) => (cost[k] || 0) > (e?.[k] || 0))
      .map(([k, label]) => `${Math.ceil(cost[k] - (e?.[k] || 0))} more ${label}`);
    return need.length ? 'Need ' + need.join(' and ') : null;
  }
  function turnReason(g, side) {
    return g.over ? 'Operation over' : g.phase !== side ? 'Not your turn' : null;
  }
  function actedReason(u) {
    return u.morale <= -3
      ? 'Unit is confused'
      : u.attacked
        ? 'Already fired'
        : u.moved
          ? 'Already moved this turn'
          : null;
  }
  function nearFriendlyCity(g, u) {
    return g.stations.some(s => s.owner === u.side && dist(g, s, u) <= 1);
  }
  function repairReason(g, u) {
    if (!u) return 'Select a unit';
    if (u.hp <= 0) return 'Unit destroyed';
    return (
      turnReason(g, u.side) ||
      actedReason(u) ||
      (atSea(g, u) ? 'Embarked at sea' : null) ||
      (u.hp >= maxHP(u) ? 'Frame already intact' : null) ||
      (!nearFriendlyCity(g, u) ? 'No friendly city nearby' : null) ||
      shortfall(funds(g, u.side), { credits: repairCost(u, g) })
    );
  }
  function reinforceReason(g, u) {
    if (!u) return 'Select a unit';
    if (u.hp <= 0) return 'Unit destroyed';
    return (
      turnReason(g, u.side) ||
      (u.elite ? 'Elite Forces are single unique frames and cannot be reinforced' : null) ||
      (isShip(u) ? 'Warships cannot be reinforced' : null) ||
      (u.stack >= 3 ? 'Already at 3 frames' : null) ||
      actedReason(u) ||
      (atSea(g, u) ? 'Embarked at sea' : null) ||
      (!nearFriendlyCity(g, u) ? 'No friendly city nearby' : null) ||
      shortfall(funds(g, u.side), reinforceCost(u.type, g, u.side, u))
    );
  }
  // `vacating` lets the AI validate a replacement before moving the current garrison.
  // Every other recruitment rule still applies; the actual purchase requires an empty hex.
  function buyReason(g, s, type, stack = 1, vacating = null) {
    const t = TYPES[type];
    if (!t || !s) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (t.elite ? 'Deploy Elite Forces from the Elite Forces factory tab' : null) ||
      (!(g.buildable?.[s.owner] || [...Object.values(lineupOf(g, s.owner)), ...navalTypes(g, s.owner)]).includes(type)
        ? 'Not built by this faction'
        : null) ||
      cityBusyReason(g, s) ||
      (t.naval && (s.portLevel || 0) < t.port ? `Requires a level-${t.port} port` : null) ||
      (t.naval && s.portOwner !== s.owner ? 'An enemy fleet holds the port' : null) ||
      (s.tier < t.tier ? `Requires factory level ${t.tier}` : null) ||
      (!Number.isInteger(stack) || stack < 1 || stack > 3 ? 'Choose 1–3 frames' : null) ||
      (t.naval === 'ship' && stack !== 1 ? 'Warships are built one at a time' : null) ||
      (s.producedTurn === g.turn ? 'Already built here this turn' : null) ||
      (!recruitOptions(g, s, s.owner, type).length && !(vacating && !t.naval && unitAt(g, s) === vacating)
        ? (t.naval ? 'A unit is on the port' : 'A unit is on the city') : null) ||
      shortfall(funds(g, s.owner), price(type, stack, g, s.owner))
    );
  }
  function buildReason(g, s, kind) {
    if (!s || !BUILDINGS[kind]) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (buildingLevel(s, kind) >= 3 ? 'Maximum level' : null) ||
      (kind === 'lab' && buildingLevel(s, kind) === 2 && g.turn < FLEIJA.labTurn
        ? `Research lab level 3 unlocks on turn ${FLEIJA.labTurn}`
        : null) ||
      (kind === 'refinery' && !depositOf(g, s) ? 'No Sakuradite deposit here' : null) ||
      (kind === 'port' && g.mode === 'campaign' ? 'No ports in story missions' : null) ||
      (kind === 'port' && !portSite(g, s) ? 'Not a coastal city' : null) ||
      (kind === 'port' && s.portLevel && s.portOwner !== s.owner ? 'An enemy fleet holds the port' : null) ||
      cityBusyReason(g, s) ||
      shortfall(funds(g, s.owner), buildCost(s, kind))
    );
  }
  // HQ research works on the persistent profile: { tokens, wins, research: { 'armor.guns': 2, ... } }.
  function researchReason(profile, id) {
    const n = TECH_NODES[id];
    if (!n) return 'Unavailable';
    const research = normalizeResearch(profile?.research),
      l = research[id] || 0;
    if (l >= n.max) return 'Fully researched';
    const tier = n.tiers[l],
      wins = profile?.wins || 0;
    if (wins < TECH_TIERS[tier])
      return `Tier ${tier}: win ${TECH_TIERS[tier] - wins} more operation${TECH_TIERS[tier] - wins > 1 ? 's' : ''}`;
    if (n.req) {
      const [k, need] = n.req,
        rid = `${n.branch}.${k}`;
      if ((research[rid] || 0) < need) return `Requires ${TECH_NODES[rid].name} ${ROMAN[need]}`;
    }
    const cost = researchCost(id, l),
      have = profile?.tokens || 0;
    return cost > have ? `Need ${cost - have} more command tokens` : null;
  }
  // Only your own commanders can be assigned; the operation's commanders stay on the units they came with.
  function assignReason(g, u, k) {
    const a = COMMANDERS[k];
    if (!a) return 'Unknown commander';
    if (u && u.hp <= 0) return 'Unit destroyed';
    if (u && isShip(u)) return 'Carrier-Battleships cannot have commanders';
    if (!g.roster?.[k]) return `Not one of your commanders: recruit in HQ for ${recruitPrice(k)} command tokens`;
    const busy = allUnits(g).find(v => v.hp > 0 && v.personal && v.cmd === k);
    if (busy) return `Commanding ${TYPES[busy.type].short}`;
    if (!u) return 'Select one of your units first';
    return (
      turnReason(g, u.side) ||
      (!serves(k, u.side) ? 'Serves another faction' : null) ||
      (u.cmd ? 'Unit already has a commander' : null) ||
      shortfall(funds(g, u.side), { credits: a.cost })
    );
  }
  function feintReason(g, u) {
    const action = COMMANDERS[u?.cmd]?.action;
    if (!u || !action) return 'This commander has no command action';
    const why = turnReason(g, u.side) || (u.hp <= 0 ? 'Unit destroyed' : atSea(g, u) ? 'Embarked units cannot use command actions' : u.morale <= -3 ? 'Unit is confused' : null)
      || (u.feintCD > 0 ? `Ready in ${u.feintCD} turns` : null);
    if (why) return why;
    if (action.kind === 'cleanse') return actionTargets(g, u).some(v => v.morale < 0 || !v.moraleWard) ? null : 'Nearby allies are already protected';
    return actionTargets(g, u).length ? null : ['designate', 'stratagem'].includes(action.kind)
      ? 'No enemy within 2 hexes' : action.kind === 'command' ? 'No friendly unit within 2 hexes has acted'
      : action.kind === 'withdraw' ? 'No friendly unit within 2 hexes has fired' : 'No enemy within 2 hexes';
  }
  // Bring the profile into an operation: a copy of your commanders (for assignment and personal units) and research.
  function applyProfile(g, profile = {}) {
    applyRoster(g, profile);
    applyElites(g, profile);
    return applyTech(g, profile?.research);
  }
  function applyElites(g, profile = {}) {
    const records = eliteProfile(profile);
    g.eliteDeployed ||= {};
    // Kept on the game so Elite Forces that join mid-operation (campaign spawns and upgrades) use the same levels.
    g.eliteLevels = Object.fromEntries(Object.entries(records).filter(([, r]) => r?.level).map(([id, r]) => [id, r.level]));
    for (const u of allUnits(g)) {
      // Only your own Elite Forces use your HQ levels; mission aces on other sides keep the level they were given.
      if (!u.elite || u.side !== g.player) continue;
      const old = maxHP(u),
        rec = records[u.elite];
      if (rec?.level) u.eliteLevel = rec.level;
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    return g;
  }
  // Refresh your commanders inside an operation, e.g. after an HQ promotion; personal units keep their damage.
  function applyRoster(g, profile = {}) {
    g.roster = Object.fromEntries(Object.entries(roster(profile)).map(([k, rec]) => [k, cleanOfficer(k, rec)]));
    for (const u of allUnits(g)) {
      if (!u.cmd) continue;
      const old = maxHP(u);
      u.cmdRank = officerOf(g, u).rank;
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    return g;
  }
  // Load HQ research into the player's side: frame bonuses keep each unit's damage, city defenses follow.
  function applyTech(g, research = {}) {
    g.tech ||= {};
    g.tech[g.player] = Object.fromEntries(
      Object.entries(normalizeResearch(research))
        .filter(([id, l]) => TECH_NODES[id] && Number.isInteger(l) && l > 0)
        .map(([id, l]) => [id, Math.min(l, TECH_NODES[id].max)]),
    );
    for (const u of allUnits(g)) {
      if (u.side !== g.player) continue;
      const old = maxHP(u);
      u.hpTech = hullTech(g, u);
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    g.stations.forEach(s => fortify(g, s));
    return g;
  }
  // Fortification research raises the defenses of cities its owner holds.
  function fortify(g, s) {
    const bonus = techValue(g, s.owner, 'cities.fort'),
      old = s.fortBonus || 0;
    if (bonus === old) return;
    s.maxShield += bonus - old;
    s.shield = clamp(s.shield + Math.max(0, bonus - old), 0, s.maxShield);
    s.fortBonus = bonus;
  }
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
  function researchCost(id, level = 0) {
    return TECH_NODES[id]?.costs[level] ?? Infinity;
  }
  function research(profile, id) {
    const why = researchReason(profile, id);
    if (why) return { ok: false, reason: why };
    profile.research = normalizeResearch(profile.research);
    const l = profile.research?.[id] || 0;
    profile.tokens -= researchCost(id, l);
    (profile.research ||= {})[id] = l + 1;
    return { ok: true, level: l + 1 };
  }
  // Command tokens are paid only for the first victory with each faction at each difficulty (Hard ×1.5,
  // Challenge ×2); the first victory ever earns a bonus. Banked research converts 5 : 1, up to 300 tokens.
  const TOKEN_REWARD = { victory: 250, conquest: 150, first: 150, research: 5, researchCap: 300 };
  function operationKey(g) {
    return `conquest:${g.era || 'world'}:${g.player || 'britannia'}:${DIFFICULTIES[g.difficulty] ? g.difficulty : 'normal'}`;
  }
  function missionReward(g, wins = 0, cleared = {}) {
    if (!g.over || g.over.winner !== g.player) return { total: 0, parts: [] };
    if (cleared[operationKey(g)]) return { total: 0, parts: [], repeat: true };
    const parts = [
      ['Victory', TOKEN_REWARD.victory],
      ['World conquest', TOKEN_REWARD.conquest],
    ];
    const banked = Math.min(
      TOKEN_REWARD.researchCap,
      Math.floor((funds(g, g.player)?.science || 0) / TOKEN_REWARD.research),
    );
    if (banked) parts.push(['Banked research', banked]);
    const scale = DIFFICULTIES[g.difficulty]?.tokens || 1;
    if (scale !== 1) parts.push([`${DIFFICULTIES[g.difficulty].name} ×${scale}`, 0]);
    let total = Math.round(parts.reduce((a, [, v]) => a + v, 0) * scale);
    if (!wins) {
      parts.push(['First victory', TOKEN_REWARD.first]);
      total += TOKEN_REWARD.first;
    }
    return { total, parts };
  }


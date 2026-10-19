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
  // Authoritative preflight for tactical actions. This does not consume resources,
  // random rolls, action flags or cooldowns. Specialized executors retain their
  // effects but enter through this same legality check.
  function validateAction(g, action) {
    if (!action || !action.kind) return { ok: false, reason: 'Unknown action.' };
    const { kind, id, c, r } = action;
    if (kind === 'fortress') {
      const station = g.stations.find(s => s.id === id);
      if (!fortressReady(g, station)) return { ok: false, reason: 'The battery is not ready.' };
      const defender = unitAt(g, { c, r });
      if (!defender || !isFoe(g, defender.side, station.owner) ||
          dist(g, station, defender) > fortressRange(g, station))
        return { ok: false, reason: `No enemy unit within ${fortressRange(g, station)} hexes of the city.` };
      return { ok: true, station, defender };
    }
    const actor = g.units.find(u => u.id === id && (kind !== 'deploy' || u.hp > 0));
    if (kind === 'attack') {
      if (!actor) return { ok: false, reason: 'Unit not found.' };
      const why = turnReason(g, actor.side) ||
        (actor.hp <= 0 ? 'Unit destroyed' : actor.expRoloFrozen ? 'Frozen by Absolute Suspension' : actor.morale <= -3 ? 'Unit is confused' : actor.attacked ? 'Already fired' : null);
      if (why) return { ok: false, reason: why };
      const shot = preview(g, id, c, r);
      if (!shot) return { ok: false, reason: atSea(g, actor) ? 'Embarked units cannot fire.' : 'No hostile target in range.' };
      return { ok: true, actor, preview: shot };
    }
    if (kind === 'move') {
      if (!actor) return { ok: false, reason: 'Unit not found.' };
      const destination = tile(g, c, r);
      const cost = destination && reachable(g, actor).get(key(destination));
      if (!destination || cost == null) return { ok: false, reason: 'That hex is not reachable this turn.' };
      return { ok: true, actor, destination, cost };
    }
    if (kind === 'deploy') {
      const why = actor ? deployReason(g, actor, action.index) : 'Carrier not found';
      if (why) return { ok: false, reason: why };
      const destination = deployTargets(g, actor, action.index).find(p => p.c === c && p.r === r);
      if (!destination) return { ok: false, reason: 'Choose an empty land hex next to the carrier.' };
      return { ok: true, actor, destination };
    }
    if (kind === 'repair' || kind === 'reinforce' || kind === 'commander') {
      const why = kind === 'repair' ? repairReason(g, actor) :
        kind === 'reinforce' ? reinforceReason(g, actor) : feintReason(g, actor);
      return why ? { ok: false, reason: why } : { ok: true, actor };
    }
    return { ok: false, reason: 'Unknown action.' };
  }
  // Optional common dispatch. Existing UI/AI direct calls remain fully compatible,
  // and every executor below independently preflights through validateAction.
  function resolveAction(g, action) {
    if (!action) return { ok: false, reason: 'Unknown action.' };
    switch (action.kind) {
      case 'attack': return attack(g, action.id, action.c, action.r);
      case 'move': return move(g, action.id, action.c, action.r);
      case 'deploy': return deploy(g, action.id, action.index, action.c, action.r);
      case 'repair': return repair(g, action.id);
      case 'reinforce': return reinforce(g, action.id);
      case 'commander': return feint(g, action.id, action.targetId);
      case 'fortress': return fireFortress(g, action.id, action.c, action.r);
      default: return { ok: false, reason: 'Unknown action.' };
    }
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
  // Ports can be controlled independently of their cities. Repairs use the actual harbour owner.
  function atFriendlyPort(g, u) {
    const port = portAtHex(g, u);
    return !!port && (port.portOwner || port.owner) === u.side;
  }
  function repairReason(g, u) {
    if (!u) return 'Select a unit';
    if (u.hp <= 0) return 'Unit destroyed';
    return (
      turnReason(g, u.side) ||
      actedReason(u) ||
      (atSea(g, u) ? 'Embarked at sea' : null) ||
      (u.hp >= maxHP(u) ? 'Frame already intact' : null) ||
      (g.stations.some(s=>s.expSupplyBlocked?.owner===u.side&&dist(g,u,s)<=1)?'City supply lines are disrupted':null) ||
      (isShip(u) && !atFriendlyPort(g, u) ? 'Warships must occupy a friendly-controlled port to repair' : null) ||
      (!isShip(u) && !nearFriendlyCity(g, u) ? 'No friendly city nearby' : null) ||
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
      (g.stations.some(s=>s.expSupplyBlocked?.owner===u.side&&dist(g,u,s)<=1)?'City supply lines are disrupted':null) ||
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
    const producer = t.naval ? (s.portOwner || s.owner) : s.owner;
    return (
      (g.over ? 'Operation over' : producer !== g.phase ? (t.naval ? 'Not your port' : 'Not your city') : null) ||
      (t.elite ? 'Deploy Elite Forces from the Elite Forces factory tab' : null) ||
      (eliteCampaign(g) && !t.naval ? 'Elite Campaign factories produce only Elite Forces' : null) ||
      (eliteAIProduction(g) && producer !== g.player && (eliteScenario(g) ? t.naval !== 'ship' : !t.naval) ? 'Rival factories can only produce Elite Forces' : null) ||
      (!(producer === 'cf' ? [...Object.values(lineupOf(g, producer)), ...navalTypes(g, producer)] :
        (g.buildable?.[producer] || [...Object.values(lineupOf(g, producer)), ...navalTypes(g, producer)])).includes(type)
        ? 'Not built by this faction'
        : null) ||
      (!t.naval ? cityBusyReason(g, s) : null) ||
      (s.expSupplyBlocked?.owner===s.owner?'City supply lines are disrupted':null) ||
      (t.naval && (s.portLevel || 0) < t.port ? `Requires a level-${t.port} port` : null) ||
      (!t.naval && s.tier < t.tier ? `Requires factory level ${t.tier}` : null) ||
      (!Number.isInteger(stack) || stack < 1 || stack > 3 ? 'Choose 1–3 frames' : null) ||
      (t.naval === 'ship' && stack !== 1 ? 'Warships are built one at a time' : null) ||
      // A clear land factory can produce again this turn; ports remain
      // restricted to one naval launch per turn.
      (t.naval && s.portProducedTurn === g.turn ? 'This port already launched a unit this turn' : null) ||
      (!recruitOptions(g, s, producer, type).length && !(vacating && !t.naval && unitAt(g, s) === vacating)
        ? (t.naval ? 'A unit is on the port' : 'A unit is on the city') : null) ||
      shortfall(funds(g, producer), decreePrice(price(type, stack, g, producer), s.owner === producer ? s : null))
    );
  }
  function decreePrice(cost,s){return s?.expDecree?{...cost,credits:Math.ceil((cost.credits||0)*.7),industry:Math.ceil((cost.industry||0)*.7)}:cost;}
  function buildReason(g, s, kind) {
    if (!s || !BUILDINGS[kind]) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (buildingLevel(s, kind) >= 3 ? 'Maximum level' : null) ||
      (s.expSupplyBlocked?.owner===s.owner?'City supply lines are disrupted':null) ||
      (kind === 'lab' && buildingLevel(s, kind) === 2 && g.turn < fleijaLabTurn(g)
        ? `Research lab level 3 unlocks on turn ${fleijaLabTurn(g)}`
        : null) ||
      (kind === 'refinery' && !depositOf(g, s) ? 'No Sakuradite deposit here' : null) ||
      (kind === 'port' && g.mode === 'campaign' ? 'No ports in story missions' : null) ||
      (kind === 'port' && !portSite(g, s) ? 'Not a coastal city' : null) ||
      (kind === 'port' && s.portLevel && s.portOwner !== s.owner ? 'An enemy fleet holds the port' : null) ||
      cityBusyReason(g, s) ||
      shortfall(funds(g, s.owner), decreePrice(buildCost(s, kind),s))
    );
  }
  function cityTierReason(g, s) {
    if (!s) return 'Unavailable';
    const cost = cityTierCost(s);
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (!cost ? 'Maximum city tier' : null) ||
      (s.cityTierUpgradedTurn === g.turn ? 'City tier already upgraded this turn' : null) ||
      (s.capturedTurn === g.turn ? 'Newly captured city must wait until next turn' : null) ||
      (s.shield <= 0 ? 'City defenses must be operational' : null) ||
      (s.expSupplyBlocked?.owner === s.owner ? 'City supply lines are disrupted' : null) ||
      shortfall(funds(g, s.owner), decreePrice(cost, s))
    );
  }
  // A qualifying research victory is a rewarded Conquest win or the first
  // full completion of an individual Story Mode or World Campaign arc. Ordinary
  // battles and repeated campaign completions never count towards HQ tier gates.
  function researchVictoryCount(profile = {}) {
    const conquests = Math.max(0, Math.floor(Number(profile.wins) || 0)),
      completedStory = Object.values(profile.researchStoryCompletions || {}).filter(v => v === true).length,
      completedWorld = Object.values(profile.researchWorldCompletions || {}).filter(v => v === true).length;
    return conquests + completedStory + completedWorld;
  }
  // HQ research persists across every faction; existing research levels stay owned.
  function researchReason(profile, id) {
    const n = TECH_NODES[id];
    if (!n) return 'Unavailable';
    const research = normalizeResearch(profile?.research),
      l = research[id] || 0;
    if (l >= n.max) return 'Fully researched';
    const tier = n.tiers[l],
      wins = researchVictoryCount(profile);
    if (wins < TECH_TIERS[tier])
      return `Tier ${tier}: earn ${TECH_TIERS[tier] - wins} more qualifying victory credit${TECH_TIERS[tier] - wins > 1 ? 's' : ''}`;
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
      (!serves(k, u.side, g) ? 'Serves another faction' : null) ||
      (u.cmd ? 'Unit already has a commander' : null) ||
      shortfall(funds(g, u.side), { credits: assignmentCost(g, k) })
    );
  }
  function feintReason(g, u) {
    const action = COMMANDERS[u?.cmd]?.action;
    if (!u || !action) return 'This commander has no command action';
    const why = turnReason(g, u.side) || (u.hp <= 0 ? 'Unit destroyed' : u.expRoloFrozen ? 'Frozen by Absolute Suspension' : atSea(g, u) ? 'Embarked units cannot use command actions' : u.morale <= -3 ? 'Unit is confused' : null)
      || (u.feintUsedTurn === g.turn ? 'Already used this turn' : (action.cooldown ?? 3) > 0 && u.feintCD > 0 ? `Ready in ${u.feintCD} turns` : null);
    if (why) return why;
    if (u.expCharlesMemoryRewrite) return 'Confused by Geass: Memory Rewrite';
    if (u.expGeassCancelled) return 'Geass Canceller prevents this commander action';
    if (action.kind === 'memoryRewrite') return actionTargets(g, u).length ? null : 'No enemy susceptible to confusion within 3 hexes';
    if (action.kind === 'freeze') return actionTargets(g, u).length ? null : 'No adjacent enemy formations to freeze';
    if (action.kind === 'cleanse') return actionTargets(g, u).some(v => v.morale < 0 || !v.moraleWard) ? null : 'Nearby allies are already protected';
    if (action.kind === 'special' || action.kind === 'protection' || action.kind === 'geassCancel' || action.kind === 'checkmate') return actionTargets(g,u).length ? null : 'No eligible targets in range';
    return actionTargets(g, u).length ? null : ['designate', 'stratagem'].includes(action.kind)
      ? 'No enemy within 2 hexes' : action.kind === 'command' ? (u.cmd === 'zero' ? 'No eligible friendly or enemy formation within 2 hexes' : 'No friendly unit within 2 hexes has acted')
      : action.kind === 'withdraw' ? 'Neither Leila nor a friendly formation within 2 hexes has moved or fired' : 'No enemy within 2 hexes';
  }
  // Bring the profile into an operation: a copy of your commanders (for assignment and personal units) and research.
  function applyProfile(g, profile = {}) {
    if (g.mode === 'scenario') return g;
    applyRoster(g, profile);
    applyElites(g, profile);
    return applyTech(g, profile?.research);
  }
  function applyElites(g, profile = {}) {
    // World Campaign regional battles inherit Elite upgrades, not the rest of HQ progression.
    if (g.mode === 'scenario' && !g.warCampaign) return g;
    const records = eliteProfile(profile);
    g.eliteDeployed ||= {};
    // Kept on the game so Elite Forces that join mid-operation (campaign spawns and upgrades) use the same levels.
    g.eliteLevels = Object.fromEntries(Object.entries(records).filter(([, r]) => r?.level).map(([id, r]) => [id, r.level]));
    for (const u of allUnits(g)) {
      // Only your own Elite Forces use your HQ levels; mission aces on other sides keep the level they were given.
      // World Campaign starting conversions remain Lv.1, independent of HQ upgrades.
      // Newly recruited elites receive their level directly from the HQ profile.
      if (!u.elite || u.side !== g.player || g.mode === 'campaign' ||
          (g.mode === 'scenario' && u.eliteStart)) continue;
      const old = maxHP(u),
        rec = records[u.elite];
      if (rec?.level) u.eliteLevel = rec.level;
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    return g;
  }
  // Refresh your commanders inside an operation, e.g. after an HQ promotion; personal units keep their damage.
  function applyRoster(g, profile = {}) {
    // Regional scenarios also need personal HQ commanders. Their scripted officers
    // remain untouched, including their authored ranks and special Elite bonuses.
    g.roster = Object.fromEntries(Object.entries(roster(profile)).map(([k, rec]) => [k, cleanOfficer(k, rec)]));
    for (const u of allUnits(g)) {
      if (!u.cmd || (g.mode === 'scenario' && !u.personal)) continue;
      const old = maxHP(u);
      u.cmdRank = officerOf(g, u).rank;
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    return g;
  }
  // Load HQ research into the player's side: frame bonuses keep each unit's damage, city defenses follow.
  function applyTech(g, research = {}) {
    if (g.mode === 'scenario') return g;
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
  // Flat, round-number rewards per era/faction/difficulty (no research bank).
  const TOKEN_REWARD = { normal: 500, hard: 1000, challenge: 1500, elite: 2000, first: 200 };
  function operationKey(g) {
    return `conquest:${g.era || 'world'}:${g.player || 'britannia'}:${DIFFICULTIES[g.difficulty] ? g.difficulty : 'normal'}`;
  }
  function missionReward(g, wins = 0, cleared = {}) {
    if (!g.over || g.over.winner !== g.player) return { total: 0, parts: [] };
    if (cleared[operationKey(g)]) return { total: 0, parts: [], repeat: true };
    const base = TOKEN_REWARD[g.difficulty] || TOKEN_REWARD.normal;
    const parts = [[`${DIFFICULTIES[g.difficulty]?.name || 'Normal'} conquest victory`, base]];
    if (!wins) parts.push(['First-ever Conquest victory', TOKEN_REWARD.first]);
    return { total: parts.reduce((sum, [, amount]) => sum + amount, 0), parts };
  }


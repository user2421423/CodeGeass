/* Knightmare Conquest AI: rival high command (production, F.L.E.I.J.A., carriers), theaters and unit orders.
   Loads after engine.js and adds the AI to its API; it uses the rules through the engine's shared internals. */
(function (root) {
  'use strict';
  const E = root.Knightmare;
  const {
    COMMANDERS,
    ELIMINATOR,
    TERRAIN,
    cityBusyReason,
    key,
    shortfall,
    FACTIONS,
    FLEIJA,
    MAJORS,
    NAVAL,
    TYPES,
    adjacent,
    aiLaunchTarget,
    alive,
    allUnits,
    amphibiousSea,
    assign,
    atSea,
    attack,
    build,
    buildCost,
    buildReason,
    buildingLevel,
    canBoard,
    carrierCapacity,
    canBuy,
    canCapture,
    deploy,
    deployReason,
    deployTargets,
    deployTargetsAt,
    depositHost,
    depositOwner,
    dist,
    eliminatorReason,
    eliminatorUnlocked,
    feint,
    feintReason,
    actionTargets,
    rangeOf,
    fireFortress,
    fleijaCity,
    foe,
    fortressTargets,
    funds,
    goalField,
    goalSeeds,
    hasFleija,
    income,
    isReady,
    isSea,
    navigable,
    isShip,
    launch,
    log,
    massOf,
    maxHP,
    move,
    nearFriendlyCity,
    portAtHex,
    portSite,
    preview,
    price,
    projectReason,
    random,
    reachable,
    recruit,
    refine,
    reindex,
    reinforce,
    reinforceCost,
    repair,
    repairCost,
    seaMove,
    serves,
    sideEliminators,
    eliminatorCity,
    siteAt,
    startEliminator,
    startProject,
    stationAt,
    targets,
    tile,
    typeFor,
    unitAt,
  } = E.internal;
  // ======== AI ========
  // Strategic awareness is scaled for the 180 × 76 world. Combat ranges remain deliberately unchanged.
  const AI_RANGE = {
    threat: 5,
    capitalGuard: 13,
    cityGuard: 7,
    mineGuard: 8,
    enemyScan: 16,
    convoyLand: 4,
    convoySea: 6,
  };
  // Campaign battlefields are a few dozen hexes across and keep the original, tighter radii.
  const AI_RANGE_CAMPAIGN = { threat: 3, capitalGuard: 8, cityGuard: 4, mineGuard: 5, enemyScan: 10, convoyLand: 2, convoySea: 6 },
    aiRange = g => (g.mode === 'campaign' ? AI_RANGE_CAMPAIGN : AI_RANGE);
  const aiMemo = new WeakMap();
  const threatMemo = new WeakMap();
  // Each AI turn starts with a plan: garrisons, then (Conquest) the theaters it fights in. Campaign battlefields are a
  // single theater and keep one side-wide goal field.
  function aiPlan(g, side) {
    let memo = aiMemo.get(g);
    if (!memo) aiMemo.set(g, (memo = {}));
    if (!memo[side] || memo[side].turn !== g.turn) {
      memo[side] = { turn: g.turn, guards: assignGuards(g, side) };
      planRecovery(g, side, memo[side]);
      if (g.mode === 'campaign') memo[side].field = goalField(g, side);
      else planFronts(g, side, memo[side]);
    }
    return memo[side];
  }
  // ======== Theaters ========
  // Objectives within `radius` hexes form one front. Every emergency and the `max` best other fronts are fought at once,
  // units keep their front for `sticky` turns, and an offensive gathers within `rally` hexes before attacking
  // (or after `wait` turns). Garrisons and defensive fronts respond to threats; no army is held in strategic reserve.
  const FRONT = { radius: 16, defenseRadius: 7, near: 14, max: 6, sticky: 4, far: 60, rally: 4, wait: 3, pull: 15, stray: 4, floor: 0.25, emergencyRatio: 1, emergencyMinShare: 0.2, emergencyMaxShare: 0.35, approachingWeight: 0.6, multiCityBonus: 12, alertShare: 0.25, alertRecovery: 2, emergencyCombinedShare: 0.65, capitalCrisisAlertShare: 0.42, capitalCrisisOffenseShare: 0.27, normalExpeditionShare: 0.4 };
  // Planning strength of a formation: frames in the stack, health and generation; commanders and Elite Forces count more.
  function unitStrength(u) {
    const t = TYPES[u.type];
    return u.stack * Math.max(0.2, u.hp / maxHP(u)) * (1 + 0.25 * ((t.tier || 1) - 1)) * (u.cmd ? 1.5 : 1) * (t.elite ? 1.5 : 1);
  }
  // Anticipate second-turn land approaches on a continuous landmass. The exact next-turn
  // threat forecast remains threatTo(); this is a bounded early warning, not an assertion
  // that every possible route will be unobstructed two turns from now.
  function approachingThreat(g, f, p) {
    if (g.mode === 'campaign' || f.hp <= 0 || isShip(f) || atSea(g, f)) return false;
    const destination = tile(g, p.c, p.r);
    if (!destination || isSea(destination) || TERRAIN[destination.terrain]?.blocked) return false;
    const fromMass = massOf(g, f);
    if (fromMass < 0 || fromMass !== massOf(g, destination)) return false;
    const maxMove = E.movement(g, f);
    return maxMove > 0 && dist(g, f, p) <= 2 * maxMove + rangeOf(g, f).max;
  }
  // What a side cares about this turn: enemy cities near its territory, every rival capital and F.L.E.I.J.A. project,
  // Sakuradite mines, and its own threatened cities, capital and mines. `value` scores the front, `seed` feeds its field.
  function frontObjectives(g, side) {
    const R = aiRange(g),
      own = g.stations.filter(s => s.owner === side),
      army = g.units.filter(u => u.hp > 0 && u.side === side && !isShip(u)),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      near = p => own.some(s => dist(g, s, p) <= FRONT.near) || army.some(u => dist(g, u, p) <= FRONT.near),
      cities = Object.fromEntries(MAJORS.map(faction =>
        [faction, g.stations.filter(s => s.owner === faction).length])),
      lead = Math.max(1, ...MAJORS.filter(faction => alive(g, faction)).map(faction => cities[faction])),
      // Every faction considers a stronger surviving rival the greater long-run threat.
      // This discourages two great powers from continually devouring a losing third.
      rivalWeight = owner => !MAJORS.includes(owner) ? 1 :
        Math.max(0.35, Math.pow((cities[owner] || 0) / lead, 3.5)),
      // An expensive enemy capital or mine is worth pursuing only if a feasible
      // regional land approach or a loaded expedition actually exists.
      operational = p => {
        if (!near(p)) return false;
        const mass = massOf(g, p);
        if (mass >= 0 && (own.some(s => dist(g, s, p) <= FRONT.near && massOf(g, s) === mass) ||
          army.some(u => dist(g, u, p) <= FRONT.near && massOf(g, u) === mass))) return true;
        return g.units.some(u => u.hp > 0 && u.side === side && isShip(u) &&
          u.cargo?.length && dist(g, u, p) <= FRONT.near);
      },
      warning = p => {
        let immediate = false, projected = false;
        for (const f of foes) {
          if (threatTo(g, f, p) > 0) { immediate = true; break; }
          if (approachingThreat(g, f, p)) projected = true;
        }
        return { immediate, projected };
      },
      list = [];
    for (const s of g.stations) {
      if (foe(g, s.owner, side)) {
        const project = s.project || s.eliminatorProject,
          capital = s.capitalOf && alive(g, s.owner);
        if (!operational(s)) continue;
        const [value, seed] = project ? [100, -8] : capital ? [70, -6] : s.owner === 'neutral' ? [8, 1] : s.tier >= 3 ? [20, -1] : [10, 0];
        list.push({ key: 's' + s.id, c: s.c, r: s.r, name: s.name, owner: s.owner,
          value: project ? value : Math.max(6, Math.round(value * rivalWeight(s.owner))),
          seed, fortified: value >= 20 });
      } else if (s.owner === side) {
        const vital = s.capitalOf === side || s.project?.side === side || s.eliminatorProject?.side === side;
        const w = warning(s);
        if (w.immediate || w.projected)
          list.push({ key: 'd' + s.id, c: s.c, r: s.r, name: s.name, defend: true, city: true,
            immediate: w.immediate, projected: !w.immediate && w.projected,
            vital, value: vital ? 100 : 20, seed: vital ? -6 : -2 });
      }
    }
    for (const d of g.sites || []) {
      if (d.city != null) continue;
      const major = d.base >= 30;
      if (foe(g, d.owner, side) && operational(d))
        list.push({ key: 'm' + d.id, c: d.c, r: d.r, name: d.name,
          value: Math.max(6, Math.round((major ? 40 : 10) * rivalWeight(d.owner))),
          seed: major ? -5 : -1 });
      else if (d.owner === side && major) {
        const w = warning(d);
        if (w.immediate || w.projected)
          list.push({ key: 'n' + d.id, c: d.c, r: d.r, name: d.name, defend: true,
            immediate: w.immediate, projected: !w.immediate && w.projected, value: 40, seed: -4 });
      }
    }
    return list;
  }
  // Clusters objectives into fronts, scores them against enemy strength, and assigns non-garrison units
  // to offensive or defensive theaters, prioritizing emergencies and force deficits. No strategic reserve
  // is maintained. Front states and assignments persist in g.ai[side].fronts and .assignments.
  function planFronts(g, side, memo) {
    const R = aiRange(g),
      state = ((g.ai ||= {})[side] ||= { saving: false }),
      saved = (state.fronts ||= {}),
      sticky = (state.assignments ||= {}),
      own = g.stations.filter(s => s.owner === side),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      host = {};
    for (const v of g.units) for (const c of v.cargo || []) host[c.id] = v;
    const at = u => host[u.id] || u,
      units = allUnits(g).filter(u => u.hp > 0 && u.side === side && !isShip(u) && !u.hold && !memo.guards[u.id] && !memo.recoveries?.has(u.id)),
      sum = list => list.reduce((a, u) => a + unitStrength(u), 0),
      byDist = (p, list) => list.slice().sort((a, b) => dist(g, a.anchor || a, p) - dist(g, b.anchor || b, p) || (a.id < b.id ? -1 : 1));
    // 1. Cluster: existing fronts re-form around their old anchors so ids stay stable from turn to turn.
    const objectives = frontObjectives(g, side).sort(
      (a, b) => !!saved[b.key] - !!saved[a.key] || b.value - a.value || (a.key < b.key ? -1 : 1),
    );
    let fronts = [];
    for (const o of objectives) {
      if (o.front) continue;
      const f = { id: o.key, side, anchor: o, objectives: [], assigned: 0 };
      for (const q of objectives)
        if (!q.front && !!q.defend === !!o.defend &&
          dist(g, q, o) <= (o.defend ? FRONT.defenseRadius : FRONT.radius) &&
          (!o.defend || massOf(g, q) === massOf(g, o))) {
          q.front = f;
          f.objectives.push(q);
        }
      fronts.push(f);
    }
    // 2. Score and size: objective values, minus distance from the nearest own city; enemy strength sets the force needed.
    const army = sum(units);
    for (const f of fronts) {
      const attack = f.objectives.filter(o => !o.defend),
        defend = f.objectives.filter(o => o.defend),
        worth = list => list.reduce((a, o) => a + o.value, 0),
        home = own.length ? Math.min(...own.map(s => dist(g, s, f.anchor))) : 0,
        enemies = foes.filter(v => f.objectives.some(o => dist(g, v, o) <= 6));
      const imminent = defend.filter(o => o.immediate);
      const projected = defend.filter(o => o.projected);
      f.endangeredCities = defend.filter(o => o.city).length;
      f.immediateCities = imminent.filter(o => o.city).length;
      f.projectedCities = projected.filter(o => o.city).length;
      const bestAttack = attack.length ? Math.max(...attack.map(o => o.value)) : 0;
      f.vital = imminent.some(o => o.vital);
      f.projectedVital = projected.some(o => o.vital);
      f.enemies = enemies;
      f.enemyStrength = sum(enemies);
      // Only a legal attack on the next enemy turn may trigger a defensive emergency.
      const immediateMenace = foes
          .filter(v => imminent.some(o => threatTo(g, v, o) > 0))
          .reduce((total, v) => total + unitStrength(v) + sum(v.cargo || []), 0),
        projectedMenace = foes
          .filter(v => !imminent.some(o => threatTo(g, v, o) > 0) &&
            projected.some(o => approachingThreat(g, v, o)))
          .reduce((total, v) => total + unitStrength(v) + sum(v.cargo || []), 0),
        present = sum(g.units.filter(u => u.hp > 0 && u.side === side && !isShip(u) &&
          imminent.some(o => dist(g, u, o) <= R.threat))),
        garrison = sum(g.units.filter(u => memo.guards[u.id] &&
          imminent.some(o => dist(g, u, o) <= R.threat)));
      // Enemy formations outside the two-turn attack window still matter when
      // planning cover for a capital. They are not legal immediate attackers.
      f.stagingMenace = defend.length ? foes.reduce((total, v) => {
        const distance = Math.min(...defend.map(o => dist(g, v, o)));
        const weight = distance <= R.threat ? 0 :
          distance <= R.threat * 2 ? 0.4 :
            distance <= R.enemyScan ? 0.18 : 0;
        return total + weight * (unitStrength(v) + sum(v.cargo || []));
      }, 0) : 0;
      f.immediateMenace = immediateMenace;
      f.projectedMenace = projectedMenace;
      f.menace = immediateMenace + projectedMenace * FRONT.approachingWeight +
        f.stagingMenace * 0.35;
      f.present = present;
      // Readiness of friendly troops already stationed in this particular sector,
      // not soldiers on the other side of a continent-wide defensive cluster.
      f.localStrength = sum(g.units.filter(u => u.hp > 0 && u.side === side && !isShip(u) &&
        defend.some(o => dist(g, u, o) <= R.threat)));
      f.localGarrison = sum(g.units.filter(u => memo.guards[u.id] &&
        defend.some(o => dist(g, u, o) <= R.threat)));
      f.pressure = f.immediateMenace * 1.6 + f.projectedMenace +
        f.stagingMenace * 0.6 + Math.max(0, f.enemyStrength - f.localStrength) * 0.4;
      const shortage = immediateMenace > 0 && present < immediateMenace * FRONT.emergencyRatio;
      f.emergency = f.vital || shortage;
      // A future threat may create an alert, never a full theater-wide holding order.
      // A mixed attack/defense front remains offensive unless immediate danger is serious.
      f.type = f.emergency && (f.vital || f.immediateCities >= 2 ||
        (imminent.length && worth(imminent) >= bestAttack))
        ? 'defensive' : attack.length ? 'offensive' : 'alert';
      f.desiredStrength = f.type === 'defensive'
        ? Math.max(f.vital ? 8 : 2, immediateMenace * 1.2 +
            (f.vital ? projectedMenace * 0.8 + f.stagingMenace * 0.45 : 0) -
            garrison * (f.vital ? 0.5 : 1))
        : f.type === 'alert'
          ? Math.max(2, f.immediateMenace * 1.2 + f.projectedMenace * 0.9 +
            f.stagingMenace * 0.45 + (f.projectedVital ? 5 : 0) +
            Math.max(0, f.enemyStrength - f.localStrength) * 0.5 -
            f.localGarrison * 0.25)
          : Math.max(3, f.enemyStrength * 1.5 + attack.length * 0.5);
      // A long list of projected endangered cities cannot drown out a major offensive.
      const imminentValue = imminent.length
        ? Math.max(...imminent.map(o => o.value)) +
          (worth(imminent) - Math.max(...imminent.map(o => o.value))) / 2 : 0;
      const attackValue = attack.length ? bestAttack + (worth(attack) - bestAttack) / 2 : 0;
      const emphasis = f.type === 'defensive'
        ? Math.max(imminentValue, 20) +
          Math.min(24, Math.max(0, f.immediateCities - 1) * FRONT.multiCityBonus)
        : f.type === 'alert'
          ? 24 + Math.min(32, f.pressure * 2) + (f.immediateCities ? 10 : 0) +
            (f.projectedVital ? 12 : 0) + (f.vital ? 10 : 0)
          : attackValue || 12;
      f.score = Math.round(emphasis - Math.max(0, home - 8) * 1.2);
      f.name = f.type === 'offensive'
        ? attack.reduce((a, o) => o.value > a.value ? o : a).name : f.anchor.name;
      const previous = saved[f.id] || {};
      f.quiet = f.emergency || imminent.length || projected.length ? 0 : (previous.quiet || 0) + 1;
      f.posture = f.type === 'defensive' ? 'defensive'
        : (imminent.length || projected.length ||
           (previous.posture === 'defensive' && f.quiet < FRONT.alertRecovery))
          ? 'alert' : 'offensive';
      // Offensives stage at the nearest own city on the target's landmass, else at the nearest own coastal city.
      if (f.type === 'offensive') {
        const land = own.filter(s => massOf(g, s) === massOf(g, f.anchor));
        f.overseas = !land.length;
        f.rally = byDist(f.anchor, land.length ? land : own.filter(s => coastTile(g, s)))[0] || null;
      }
      // Priority: the score, discounted (down to `floor`) when half the army could not field the force it needs.
      f.priority = f.score * Math.min(1, Math.max(FRONT.floor, (army * 0.5) / f.desiredStrength));
    }
    // Every immediate defensive emergency is active. Among routine theaters,
    // protect at least two offensive slots so density of alert cities cannot crowd
    // all campaigns out of the theater planner.
    const rank = (a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1);
    const urgent = fronts.filter(f => f.type === 'defensive' && f.emergency).sort(rank);
    const routine = fronts.filter(f => !(f.type === 'defensive' && f.emergency)).sort(rank);
    const attacks = routine.filter(f => f.type === 'offensive').slice(0, Math.min(2, FRONT.max));
    const rest = routine.filter(f => !attacks.includes(f)).slice(0, FRONT.max - attacks.length);
    fronts = [...urgent, ...attacks, ...rest].sort((a, b) =>
      (b.type === 'defensive' && b.emergency) - (a.type === 'defensive' && a.emergency) || rank(a, b));
    // Garrisons have already been excluded from the deployable field army.
    // All remaining formations can reinforce offensives or defensive fronts as needed.
    const byId = Object.fromEntries(fronts.map(f => [f.id, f]));
    // 3. Sticky assignments persist unless the front disappears, its term ends, the unit
    // drifts far away, or a nearby vital emergency demands redeployment.
    const assign = {},
      emergencies = fronts.filter(f => f.emergency && f.type === 'defensive'),
      give = (u, f) => {
        assign[u.id] = f.id;
        f.assigned += unitStrength(u);
        if (sticky[u.id]?.front !== f.id) sticky[u.id] = { front: f.id, since: g.turn };
      };
    for (const u of units) {
      const a = sticky[u.id],
        f = a && byId[a.front];
      if (!f) continue;
      // Projected threats never interrupt sticky offensive assignments.
      const pulled = emergencies.some(e => e !== f && dist(g, at(u), e.anchor) <= FRONT.pull &&
        (e.vital || (e.immediateCities >= 2 && e.priority > f.priority && !f.emergency)));
      if (!pulled && g.turn - a.since < FRONT.sticky && dist(g, at(u), f.anchor) <= FRONT.far) give(u, f);
    }
    // 4. Emergency fronts get priority; remaining forces are shared across both
    // offensive and routine defensive fronts by priority and actual strength need.
    const alerts = fronts.filter(f => f.type === 'alert'),
      // A projected attack on a capital across several sectors is a genuine
      // strategic crisis even though it must not force every local front to hold.
      capitalCrisis = alerts.length + emergencies.length >= 2 &&
        fronts.some(f => (f.projectedVital && f.projectedMenace > 0) ||
          (f.vital && f.immediateMenace > 0)),
      expeditionLimit = army * FRONT.normalExpeditionShare,
      open = fronts.filter(f => f.type === 'offensive' || (f.type === 'defensive' && !f.emergency)),
      weight = new Map(open.map((f, i) => [f, [0.5, 0.25, 0.15, 0.1][i] || 0.1]));
    let pot = army,
      emergencyPool = army * FRONT.emergencyCombinedShare,
      left = open;
    // Non-vital emergencies receive a threat-proportional 20-35% of the available field
    // army. Garrison units are not included, and competing fronts cannot overcommit it.
    for (const f of emergencies) {
      const shortage = Math.max(0, f.immediateMenace - f.present) / Math.max(1, f.immediateMenace);
      const share = FRONT.emergencyMinShare + (FRONT.emergencyMaxShare - FRONT.emergencyMinShare) * shortage;
      // Multiple unrelated emergencies cannot consume the whole field army.
      // Critical capitals may still claim the full remaining mobile force.
      // A vital capital may use more than the shared emergency quota. Never let
      // that deficit turn the following non-vital front's target negative.
      f.target = Math.max(0, Math.min(f.desiredStrength, f.vital ? army : army * share,
        f.vital ? pot : Math.max(0, emergencyPool), pot));
      pot -= f.target;
      emergencyPool -= f.target;
    }
    // All alert-only fronts share a bounded field-army budget. This is staging,
    // not a permanent reserve or an excuse to halt nearby offensives.
    const alertPool = Math.min(pot, army *
      (capitalCrisis ? FRONT.capitalCrisisAlertShare : FRONT.alertShare));
    // Weighted, capacity-constrained division: an inland capital warning cannot
    // monopolize cover while exposed border sectors are left without a formation.
    const pending = alerts.slice();
    let remaining = alertPool;
    for (const f of alerts) f.target = 0;
    while (pending.length && remaining > 1e-6) {
      const weights = pending.map(f => Math.max(1, f.priority) * Math.max(1, f.desiredStrength));
      const total = weights.reduce((sum, n) => sum + n, 0);
      const capped = pending.filter((f, i) =>
        f.desiredStrength - f.target <= remaining * weights[i] / total + 1e-9);
      if (!capped.length) {
        for (let i = 0; i < pending.length; i++)
          pending[i].target += remaining * weights[i] / total;
        remaining = 0;
        break;
      }
      for (const f of capped) {
        const grant = f.desiredStrength - f.target;
        f.target += grant;
        remaining -= grant;
        pending.splice(pending.indexOf(f), 1);
      }
    }
    pot -= alertPool - remaining;
    while (left.length) {
      const w = left.reduce((a, f) => a + weight.get(f), 0),
        capped = left.filter(f => f.desiredStrength <= (pot * weight.get(f)) / w);
      if (!capped.length) {
        for (const f of left) f.target = (pot * weight.get(f)) / w;
        break;
      }
      for (const f of capped) pot -= f.target = f.desiredStrength;
      left = left.filter(f => !capped.includes(f));
    }
    // While the capital is under projected multi-sector pressure, even a land
    // offensive close to home cannot monopolize the mobilized field army. In
    // ordinary periods only long-distance amphibious offensives are constrained.
    const offensiveLimit = capitalCrisis ? army * FRONT.capitalCrisisOffenseShare : expeditionLimit;
    let reclaimed = 0;
    for (const f of open) if (f.type === 'offensive' &&
      (capitalCrisis || f.overseas) && f.target > offensiveLimit) {
      reclaimed += f.target - offensiveLimit;
      f.target = offensiveLimit;
    }
    if (reclaimed > 0 && !capitalCrisis)
      for (const f of open.filter(f => f.type === 'offensive' && !f.overseas)) {
        const grant = Math.min(reclaimed, Math.max(0, f.desiredStrength - f.target));
        f.target += grant;
        reclaimed -= grant;
        if (reclaimed <= 0) break;
      }
    // The pool goes to emergencies first, then the fronts furthest below their
    // targets. Leftover units join active fronts, respecting expedition caps.
    const pool = units.filter(u => !assign[u.id]),
      take = (f, range = Infinity) => {
        let best = null,
          bd = Infinity;
        for (const u of pool) {
          if (assign[u.id]) continue;
          const d = dist(g, at(u), f.anchor) - (sticky[u.id]?.front === f.id ? 10 : 0);
          if (d <= range && (d < bd || (d === bd && u.id < best.id))) {
            bd = d;
            best = u;
          }
        }
        if (best) give(best, f);
        return !!best;
      };
    for (const f of emergencies) while (f.assigned < f.target && take(f, FRONT.pull + 10));
     for (;;) {
      const needy = fronts.filter(f => f.assigned < f.target)
        .sort((a, b) => b.target - b.assigned - (a.target - a.assigned));
      if (!needy.some(f => take(f))) break;
    }
    // If targets are already filled, prefer sending extra strength to an
    // offensive instead of accumulating units in routine defensive positions.
    const offensive = fronts.filter(f => f.type === 'offensive' && !f.overseas),
      localDefense = fronts.filter(f => f.type === 'alert' || f.emergency),
      overflow = capitalCrisis && localDefense.length
        ? localDefense : offensive.length ? offensive : localDefense.length ? localDefense : fronts;
    for (const u of pool) {
      if (assign[u.id]) continue;
      const local = byDist(at(u), localDefense)[0],
        preferred = byDist(at(u), overflow)[0],
        nearbyCover = local && local.assigned < local.target &&
          (!preferred || dist(g, at(u), local.anchor) + FRONT.pull < dist(g, at(u), preferred.anchor));
      const pick = nearbyCover ? local : preferred;
      if (pick) give(u, pick);
    }
    // 5. Offensives: ASSEMBLING until enough of the assigned army stands at the rally city (or ahead of it), then
    // ATTACKING; an attack that has lost over half its force falls back to regroup. Defensive fronts hold.
    for (const f of fronts) {
      const st = (saved[f.id] ||= { state: 'assembling', since: g.turn });
      st.seen = g.turn;
      st.quiet = f.quiet;
      st.posture = f.posture;
      const mine = units.filter(u => assign[u.id] === f.id),
        set = v => {
          if (st.state !== v) Object.assign(st, { state: v, since: g.turn });
        };
      if (f.type !== 'offensive' || !f.rally)
        set(f.type === 'defensive' ? 'holding' : f.type === 'alert' ? 'alert' : 'attacking');
      else {
        if (st.state === 'holding' || st.state === 'alert') set('assembling');
        f.readyStrength = sum(mine.filter(u => dist(g, at(u), f.rally) <= FRONT.rally || aheadOfRally(g, f, at(u))));
        f.attackThreshold = Math.max(2, Math.min(f.desiredStrength * 0.8, f.assigned * 0.5));
        if (st.state === 'assembling' && (f.readyStrength >= f.attackThreshold || g.turn - st.since >= FRONT.wait)) {
          set('attacking');
          st.force = f.assigned;
          if (side !== g.player && f.objectives.some(o => o.owner === g.player))
            log(g, `${FACTIONS[side].short} forces massed at ${f.rally.name} open an offensive toward ${f.name}.`, side);
        } else if (st.state === 'attacking' && g.turn - st.since >= 2 && f.assigned < (st.force || 0) * 0.45) set('assembling');
      }
      f.state = st.state;
      f.friendlyStrength = f.assigned;
    }
    // A front that drops out of the plan keeps its state for three turns in case it returns.
    for (const [id, st] of Object.entries(saved)) if (g.turn - (st.seen ?? st.since) > 3) delete saved[id];
    // Destroyed units drop their assignment too (compact saves leave them out entirely).
    const living = new Set(allUnits(g).filter(u => u.hp > 0).map(u => u.id));
    for (const id of Object.keys(sticky)) if (!living.has(+id)) delete sticky[id];
    // 6. One goal field per front (built when a unit first asks): an assembling offensive pulls toward its rally city;
    // otherwise the objectives, and for threatened own cities the enemy units menacing them. An attacking front also
    // takes targets of opportunity, but only those `stray` path cost nearer than its own.
    const elsewhere = goalSeeds(g, side).map(([p, d]) => [p, d + FRONT.stray]);
    for (const f of fronts) {
      const seeds = (f.seeds =
        f.state === 'assembling'
          ? [[f.rally, 0]]
          : f.type === 'alert'
            ? f.objectives.filter(o => o.defend).map(o => [o, o.immediate ? -5 : -3])
            : f.objectives.flatMap(o =>
                o.defend
                  ? o.immediate && f.type === 'defensive'
                    ? [[o, o.seed], ...foes.filter(v => dist(g, v, o) <= R.threat).map(v => [v, o.seed + 1])]
                    : [] // projected warnings never redirect attacking units toward friendly cities
                  : [[o, o.seed]],
              ));
      f.masses = new Set(seeds.map(([p]) => massOf(g, p)).filter(m => m >= 0));
      if (f.state === 'attacking') f.seeds = [...seeds, ...elsewhere];
      f.need = frontNeeds(f, units.filter(u => assign[u.id] === f.id));
    }
    // Idle carriers wait off the rally city of the best offensive across the sea.
    const lift = fronts.find(f => f.overseas && f.rally);
    Object.assign(memo, { fronts, byId, assign, fields: {}, staging: lift?.rally || null });
  }
  // Already nearer an assembling front's target than its rally city is, on the rally's landmass.
  const aheadOfRally = (g, f, p) => massOf(g, p) === massOf(g, f.rally) && dist(g, p, f.anchor) < dist(g, f.rally, f.anchor);
  // Two formations may share a carrier when their fronts head for the same landmass.
  const sameLift = (a, b) => a === b || (!!a?.masses && !!b?.masses && [...a.masses].some(m => b.masses.has(m)));
  // What a front asks its factories for, by the enemy's composition there and its own: assault frames and rockets
  // against Armor, Armor against Infantry, guns when it lacks artillery, siege for fortified cities, and fast raiders
  // around a medium-frame core for an invasion across the sea (every formation needs a hull).
  function frontNeeds(f, mine) {
    const mix = list => {
        const m = { Infantry: 0, Armor: 0, Artillery: 0, total: 0 };
        for (const u of list) {
          const v = unitStrength(u);
          m[TYPES[u.type].branch] = (m[TYPES[u.type].branch] || 0) + v;
          m.total += v;
        }
        return m;
      },
      enemy = mix((f.enemies || []).filter(u => !isShip(u))),
      ours = mix(mine);
     const need = f.overseas
      ? ['raider', 'medium', 'assault', 'heavy']
      : f.type === 'defensive'
        ? ['heavy', 'rocket', 'medium', 'support']
        : enemy.total && enemy.Armor >= enemy.total * 0.5
          ? ['assault', 'rocket', 'heavy', 'medium']
          : ['medium', 'heavy', 'rocket', 'light'];
    if (!f.overseas && ours.Artillery < ours.total * 0.2)
      need.unshift(f.type === 'offensive' && f.objectives.some(o => o.fortified) ? 'siege' : 'rocket');
    return [...new Set(need)];
  }
  // The active front a unit serves; newly raised formations reinforce understrength fronts.
  function frontOf(g, memo, u) {
    if (!memo?.byId || !u || memo.guards?.[u.id] || memo.recoveries?.has(u.id) || isShip(u) || u.hold) return null;
    if (!(u.id in memo.assign)) {
      const short = memo.fronts.filter(f => f.assigned < (f.target ?? f.desiredStrength)),
        offensive = memo.fronts.filter(f => f.type === 'offensive' || f.emergency),
        candidates = short.length ? short : offensive.length ? offensive : memo.fronts,
        f = candidates
          .slice()
          .sort((a, b) => dist(g, u, a.anchor) - dist(g, u, b.anchor) || (a.id < b.id ? -1 : 1))[0];
      memo.assign[u.id] = f?.id ?? null;
      if (f) {
        f.assigned += unitStrength(u);
        g.ai[u.side].assignments[u.id] = { front: f.id, since: g.turn };
      }
    }
    return memo.byId[memo.assign[u.id]] || null;
  }
  // The goal field a unit follows: the assigned front's. Guards and
  // unassigned units use the side-wide field; unassigned warships may use the leading front.
  function fieldFor(g, memo, u) {
    const f = frontOf(g, memo, u) || (isShip(u) ? memo.fronts?.[0] : null);
    let field = null;
    return p => {
      field ||= (f && (memo.fields[f.id] ||= goalField(g, f.side, f.seeds))) || (memo.field ||= goalField(g, u.side));
      const v = field[p.r * g.cols + p.c];
      return Number.isFinite(v) ? v : 60;
    };
  }
  // Frames able to reach or fire on a position next turn. Forecast legal movement rather
  // than treating units across a strait or impassable ridge as an immediate land threat.
  function threatTo(g, f, p) {
    const d = dist(g, f, p);
    const t = TYPES[f.type];
    const cargoReach = isShip(f) && f.cargo?.length ? t.move + Math.max(...f.cargo.map(c => E.movement(g, c) + rangeOf(g, c).max)) : 0,
      scan = Math.max(aiRange(g).threat, E.movement(g, f), cargoReach, t.naval === 'amphibious' ? amphibiousSea(g, f) : seaMove(g, f)) + rangeOf(g, f).max + 2;
    if (d > scan || f.hp <= 0) return 0;
    // Forecast the enemy's next fresh turn without changing the live phase or order flags.
    let memo = threatMemo.get(g);
    if (!memo || memo.turn !== g.turn || memo.phase !== g.phase) {
      memo = { turn: g.turn, phase: g.phase, units: new Map(), lands: new Map() };
      threatMemo.set(g, memo);
    }
    let paths = memo.units.get(f.id);
    if (!paths) {
      const future = { ...g, phase: f.side, over: false },
        unit = { ...f, moved: false, attacked: false, movedDistance: 0, skillReposition: 0, withdrawMove: false, morale: Math.max(-2, f.morale) };
      paths = { future, unit, positions: [tile(g, f.c, f.r), ...[...reachable(future, unit).keys()].map(k => {
        const [c, r] = k.split(',').map(Number);
        return tile(g, c, r);
      })] };
      memo.units.set(f.id, paths);
    }
    const canFire = q => {
      if (isSea(q) && !t.naval) return false;
      const r = rangeOf(g, { ...f, c: q.c, r: q.r, movedDistance: dist(g, f, q) });
      const distance = dist(g, q, p);
      return distance >= r.min && distance <= r.max;
    };
    const direct = paths.positions.some(q => canFire(q) || (canCapture(f) && !isShip(f) && q.c === p.c && q.r === p.r));
    let cargo = 0;
    if (isShip(f) && g.mode !== 'campaign' && f.cargo?.length) {
      // Cargo can launch and act immediately. A land-only route from a legal beach prevents
      // apparent threats across impassable terrain or onto a disconnected island.
      let land = memo.lands.get(key(p));
      if (!land) { land = goalField(g, f.side, [[p, 0]], 'land'); memo.lands.set(key(p), land); }
      const landReach = Math.max(...f.cargo.map(c => E.movement(g, c) + rangeOf(g, c).max)),
        launchable = paths.positions.some(q => deployTargetsAt(paths.future, q, f.side).some(beach => land[beach.r * g.cols + beach.c] <= landReach));
      if (launchable) cargo = f.cargo.reduce((a, c) => a + c.stack, 0);
    }
    return (direct ? f.stack : 0) + cargo;
  }
  // Garrison duty: the capital seeks two defenders (four when threatened).
  // Threatened cities, fortress cities, major ports, and mines draw defenders independently
  // of front assignments; nearby enemies are marked as urgent. No reserve quota applies.
  function assignGuards(g, side) {
    const own = g.units.filter(u => u.hp > 0 && u.side === side && !atSea(g, u) && !isShip(u)),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      taken = {},
      threat = s => foes.reduce((a, f) => a + threatTo(g, f, s), 0),
      urgent = (p, t) => t > 0 && foes.some(f => dist(g, f, p) <= 4),
      guard = (u, post, emergency = false) => {
        if (taken[u.id]) return false;
        taken[u.id] = { ...post, emergency };
        return true;
      };
    const routes = new Map(),
      nearby = (post, radius) => own
        .filter(u => !taken[u.id] && dist(g, u, post) <= radius)
        .map(u => {
          const key = `${post.c},${post.r},${u.type},${radius}`;
          // A guard cannot be selected beyond this cost, so do not scan the whole world for each post/type.
          if (!routes.has(key)) routes.set(key, goalField(g, side, [[post, 0]], TYPES[u.type].naval === 'amphibious' ? null : 'land', u, radius));
          return { u, cost: routes.get(key)[u.r * g.cols + u.c] };
        })
        .filter(p => Number.isFinite(p.cost) && p.cost <= radius)
        .sort((a, b) => a.cost - b.cost || a.u.id - b.u.id)
        .map(p => p.u);
    // A city building a F.L.E.I.J.A. warhead is guarded like the capital.
    const cities = g.stations
      .filter(s => s.owner === side)
      .map(s => ({
        s,
        threat: threat(s),
        capital: s.capitalOf === side || s.project?.side === side || s.eliminatorProject?.side === side || (s.eliminator || 0) > 0,
      }))
      .filter(c => c.capital || c.threat > 0)
      .sort((a, b) => b.capital - a.capital || b.s.tier - a.s.tier || b.threat - a.threat);
    for (const { s, threat: t, capital } of cities) {
      const need = capital ? (t > 0 ? 4 : 2) : Math.min(3, Math.ceil(t / 2));
      const near = nearby(s, capital ? aiRange(g).capitalGuard : aiRange(g).cityGuard);
      let assigned = 0;
      for (const u of near) {
        if (assigned >= need) break;
        if (guard(u, { c: s.c, r: s.r, id: s.id }, urgent(s, t))) assigned++;
      }
    }
    // Strongholds (Conquest): fortress cities and level-2+ naval bases
    // each request one available land defender, independently of front strength.
    if (g.mode !== 'campaign')
      for (const s of g.stations) {
        if (s.owner !== side || !(s.fort || (s.portLevel >= 2 && s.portOwner === side))) continue;
        if (Object.values(taken).some(t => t.id === s.id)) continue;
        for (const u of nearby(s, aiRange(g).cityGuard)) {
          if (guard(u, { c: s.c, r: s.r, id: s.id })) break;
        }
      }
    // Own mines: major deposits seek one guard; threatened mines can draw up to two defenders.
    for (const d of g.sites || []) {
      if (d.city != null || d.owner !== side) continue;
      const t = threat(d),
        need = t > 0 ? Math.min(2, Math.ceil(t / 2)) : d.base >= 30 ? 1 : 0;
      const near = nearby(d, aiRange(g).mineGuard);
      let assigned = 0;
      for (const u of near) {
        if (assigned >= need) break;
        if (guard(u, { c: d.c, r: d.r, site: d.id }, urgent(d, t))) assigned++;
      }
    }
    return taken;
  }
  // Preserve valuable wounded formations without turning the whole army into a retreat.
  // Guards and essential city defenders keep their duty. Two health thresholds prevent
  // an injured commander from alternating between the front and the repair destination.
  function planRecovery(g, side, memo) {
    const state = ((g.ai ||= {})[side] ||= { saving: false }),
      saved = (state.recovery ||= {}),
      recoveries = (memo.recoveries = new Map()),
      own = g.units.filter(u => u.hp > 0 && u.side === side),
      enemies = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      cities = g.stations.filter(s => s.owner === side),
      living = new Set(own.map(u => u.id));
    for (const id of Object.keys(saved)) if (!living.has(+id)) delete saved[id];
    const security = new Map(cities.map(s => [s.id, !enemies.some(v => threatTo(g, v, s) > 0)])),
      secure = s => security.get(s.id),
      covered = s => own.some(v => v.hp / maxHP(v) >= 0.5 && !isShip(v) && dist(g, v, s) <= 2),
      safeCities = cities.filter(s => secure(s) || covered(s));
    let recoveryBoard = null;
    const landRoute = seeds => {
      // Healing routes cannot assume the formation will fight through a hostile city
      // or enemy unit. Friendly occupancy may change before the formation gets there.
      if (!recoveryBoard) {
        const blocked = new Set([...enemies.map(key), ...g.stations.filter(s => foe(g, s.owner, side)).map(key)]);
        recoveryBoard = { ...g, tiles: g.tiles.map(p => blocked.has(key(p)) ? { ...p, terrain: 'peak' } : p) };
      }
      return goalField(recoveryBoard, side, seeds, 'land');
    };
    for (const u of own) {
      const ratio = u.hp / maxHP(u), active = saved[u.id];
      const essential = cities.some(s => dist(g, u, s) <= 1 && !secure(s) &&
        !own.some(v => v.id !== u.id && !isShip(v) && v.hp / maxHP(v) >= 0.4 && dist(g, v, s) <= 2));
      if (!(u.cmd || u.elite) || isSea(tile(g, u.c, u.r)) || u.hold || memo.guards[u.id] || essential || ratio >= 0.7) {
        delete saved[u.id];
        continue;
      }
      if (!active && ratio >= 0.35) continue;
      const seedsFor = s => [tile(g, s.c, s.r), ...adjacent(g, s)]
        .filter(p => !isSea(p) && !TERRAIN[p.terrain]?.blocked && (!stationAt(g, p) || stationAt(g, p).owner === side) && (!unitAt(g, p) || unitAt(g, p).id === u.id))
        .map(p => [p, 0]),
        candidates = safeCities.filter(s => massOf(g, s) === massOf(g, u)),
        previous = active && candidates.find(s => s.id === active.city);
      let city = previous, field = previous && landRoute(seedsFor(previous));
      if (!field || !Number.isFinite(field[u.r * g.cols + u.c])) {
        const seeds = candidates.flatMap(seedsFor);
        if (!seeds.length) { delete saved[u.id]; continue; }
        const route = landRoute(seeds);
        if (!Number.isFinite(route[u.r * g.cols + u.c])) { delete saved[u.id]; continue; }
        // Select the repair city by land route distance from this formation.
        const fromUnit = landRoute([[u, 0]]);
        city = candidates.slice().sort((a, b) => {
          const cost = s => Math.min(...seedsFor(s).map(([p]) => fromUnit[p.r * g.cols + p.c]));
          return cost(a) - cost(b) || a.id - b.id;
        })[0];
        field = city && landRoute(seedsFor(city));
      }
      if (!city || !Number.isFinite(field[u.r * g.cols + u.c])) { delete saved[u.id]; continue; }
      saved[u.id] = { city: city.id, since: active?.since ?? g.turn };
      recoveries.set(u.id, { city, field });
    }
  }
  // Enemy high command, run once at the start of each AI turn before its units act: batteries, repairs, saving for
  // super-heavies, upgrades, reinforcements, then production that prefers 2- and 3-frame formations.
  const hostileMass = (g, side, mass) => g.stations.some(s => massOf(g, s) === mass && foe(g, s.owner, side));
  // Troops worth lifting: their front's goal (its rally city while assembling) lies on another landmass, or (no front)
  // nothing to attack on theirs; or (city-taking Infantry and Armor only) far from it (goal field 14+), unless they are
  // still gathering.
  function wantsLift(g, u, memo) {
    if (TYPES[u.type].naval || atSea(g, u) || u.hold || memo.recoveries?.has(u.id)) return false;
    const front = frontOf(g, memo, u),
      mass = massOf(g, u),
      far = canCapture(u) && fieldFor(g, memo, u)(u) >= 14;
    if (front?.masses) return !front.masses.has(mass) || (far && front.state !== 'assembling');
    return !hostileMass(g, u.side, mass) || far;
  }
  // A landing hex: enemy frames within 3 hexes (threat) and an undefended enemy city within 2 (prize). Lower is better;
  // null when the beach is defended by more frames than the carrier brings.
  function landingScore(g, side, t, strength, fieldAt, masses = null) {
    if (!hostileMass(g, side, massOf(g, t)) && !masses?.has(massOf(g, t))) return null;
    const threat = g.units
      .filter(v => v.hp > 0 && foe(g, v.side, side) && !isShip(v) && !atSea(g, v) && dist(g, v, t) <= 3)
      .reduce((a, v) => a + v.stack, 0);
    if (threat > strength) return null;
    const prize = g.stations.some(s => foe(g, s.owner, side) && !unitAt(g, s) && dist(g, s, t) <= 2);
    return fieldAt(t) + threat * 3 - (prize ? 25 : 0);
  }
  // Launch every ready formation onto the best landing hex (toward its front, which may be a friendly rally city), then
  // give each its full turn.
  function aiLaunch(g, ship, events, fieldAt, masses) {
    const landed = [];
    for (let i = (ship.cargo?.length || 0) - 1; i >= 0; i--) {
      if (deployReason(g, ship, i)) continue;
      const strength = ship.cargo.reduce((a, c) => a + c.stack, 0),
        spot = deployTargets(g, ship, i)
          .map(t => ({ t, s: landingScore(g, ship.side, t, strength + landed.filter(v => v.hp > 0 && !atSea(g, v) && dist(g, v, t) <= 3).reduce((a, v) => a + v.stack, 0), fieldAt, masses) }))
          .filter(o => o.s != null)
          .sort((a, b) => a.s - b.s)[0]?.t;
      if (!spot) break;
      const d = deploy(g, ship.id, i, spot.c, spot.r);
      if (!d.ok) continue;
      landed.push(d.unit);
      events.push({ kind: 'deploy', id: d.unit.id, from: { c: ship.c, r: ship.r }, to: d.to });
      events.push(...aiOrder(g, d.unit.id));
    }
  }
  // A carrier's operation: wait off a coast where troops bound overseas gather, sail for their front once loaded (full,
  // or after three turns), launch everything ashore; badly damaged and empty, head home to a port; idle, wait off the
  // rally city of the best offensive across the sea. One carrier serves one front. Returns false when there is nothing
  // to do, so the generic orders use it as a gunship.
  function seaCoasts(g, memo) {
    // Where a carrier can wait off a shore: open water or a coast hex, next to land troops can reach.
    return memo.coasts ||= g.tiles.filter(p => navigable(p) && !stationAt(g, p) && adjacent(g, p).some(n => !isSea(n) && !TERRAIN[n.terrain]?.blocked));
  }
  function aiCarrier(g, u, memo, events, fieldAt) {
    const bound = u.cargo?.length ? frontOf(g, memo, u.cargo[0]) : null,
      masses = bound?.masses || null;
    if (bound) fieldAt = fieldFor(g, memo, u.cargo[0]);
    const fleet = (((g.ai ||= {})[u.side] ||= {}).fleet ||= {}),
      job = (fleet[u.id] ||= { wait: 0 }),
      cargo = u.cargo || [],
      reach = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .filter(p => !unitAt(g, p)),
      sail = p => {
        if (!p || (p.c === u.c && p.r === u.r)) return;
        const m = move(g, u.id, p.c, p.r);
        if (m.ok) events.push({ kind: 'move', ...m, id: u.id });
      },
      danger = p => g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, p) <= 2).length,
      strength = cargo.reduce((a, c) => a + c.stack, 0),
      landing = p => {
        const scores = deployTargetsAt(g, p, u.side, cargo.length > 0)
          .map(t => landingScore(g, u.side, t, strength, fieldAt, masses))
          .filter(v => v != null);
        return scores.length ? Math.min(...scores) + danger(p) * 2 : null;
      };
    const here = tile(g, u.c, u.r),
      // The route is sea-only even when its goal is a city or troops ashore. Include
      // the current hex so an unreachable or temporarily blocked route holds safely.
      followSea = seeds => {
        if (!seeds.length) return false;
        const route = goalField(g, u.side, seeds, 'sea'),
          value = p => route[p.r * g.cols + p.c],
          choices = [here, ...reach].filter(p => Number.isFinite(value(p)))
            .sort((a, b) => value(a) - value(b) || danger(a) - danger(b) || dist(g, a, u) - dist(g, b, u));
        if (!choices.length) return false;
        sail(choices[0]);
        return true;
      },
      coastSeeds = (landField, limit = Infinity) => seaCoasts(g, memo).flatMap(p => {
        const costs = adjacent(g, p).filter(n => !isSea(n) && !TERRAIN[n.terrain]?.blocked)
          .map(n => landField[n.r * g.cols + n.c]).filter(v => Number.isFinite(v) && v <= limit);
        return costs.length ? [[p, Math.min(...costs)]] : [];
      });
    const ports = g.stations.filter(s => s.portAt && s.portOwner === u.side).map(s => tile(g, s.portAt.c, s.portAt.r));
    if (!cargo.length && u.hp / maxHP(u) < 0.4 && ports.length) {
      followSea(ports.map(p => [p, 0]));
      return true;
    }
    const ready = cargo.some(c => c.boardedTurn !== g.turn);
    if (ready && (cargo.length >= carrierCapacity(g, u) || job.wait >= 3)) {
      if (landing(tile(g, u.c, u.r)) == null) {
        // Seed feasible landing positions, then route through navigable water rather
        // than following a land shortcut in the formation's strategic goal field.
        const seeds = seaCoasts(g, memo).map(p => [p, landing(p)]).filter(([, score]) => score != null);
        followSea(seeds);
      }
      if (landing(tile(g, u.c, u.r)) != null) aiLaunch(g, u, events, fieldAt, masses);
      if (!u.cargo.length) job.wait = 0;
      return true;
    }
    if (cargo.length) job.wait++;
    const riders = g.units.filter(
      v => v.hp > 0 && v.side === u.side && !memo.guards?.[v.id] && (!cargo.length || sameLift(frontOf(g, memo, v), bound)) && wantsLift(g, v, memo),
    );
    if (!riders.length) {
      const stage = !cargo.length && memo.staging;
      if (!stage) return cargo.length > 0;
      if (dist(g, u, stage) > 2) {
        const land = goalField(g, u.side, [[stage, 0]], 'land');
        followSea(coastSeeds(land, FRONT.rally));
      }
      return true;
    }
    const land = goalField(g, u.side, riders.map(v => [v, 0]), 'land');
    followSea(coastSeeds(land));
    return true;
  }
  function aiProduction(g) {
    const side = g.phase,
      e = funds(g, side),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      own = () => g.units.filter(u => u.hp > 0 && u.side === side),
      front = p => {
        let best = 99;
        for (const u of foes) best = Math.min(best, dist(g, u, p));
        return best;
      },
      plan = ((g.ai ||= {})[side] ||= {}),
      memo = aiPlan(g, side),
      builds = g.mode !== 'campaign' || !!g.campaign?.production?.includes(side);
    const bases = g.stations.filter(s => s.owner === side).sort((a, b) => front(a) - front(b));
    const yard3 = bases.filter(s => s.tier >= 3);
    const superType = typeFor(side, 'super', g);
    // 0. Fire every ready battery at the strongest enemy unit in range (the UI animates g.strikes).
    g.strikes = [];
    for (const s of bases) {
      const target = fortressTargets(g, s)
        .map(p => unitAt(g, p))
        .sort((a, b) => b.hp - a.hp || a.id - b.id)[0];
      if (target) {
        const shot = fireFortress(g, s.id, target.c, target.r);
        if (shot.ok) g.strikes.push(shot);
      }
    }
    // 0b. F.L.E.I.J.A.: launch every ready warhead, each at the most valuable target that spares its own units and
    // cities (the UI plays g.launches).
    g.launches = [];
    while ((g.arsenal?.[side] || 0) > 0 && !g.over) {
      const p = aiLaunchTarget(g, side),
        shot = p && launch(g, side, p.c, p.r);
      if (!shot?.ok) break;
      g.launches.push(shot);
    }
    // 1. Repair badly damaged units resting at a friendly city (this spends their turn).
    for (const u of own()
      .filter(u => u.hp / maxHP(u) < (memo.recoveries?.has(u.id) ? 0.7 : 0.55) && nearFriendlyCity(g, u) && !atSea(g, u))
      .sort((a, b) => a.hp / maxHP(a) - b.hp / maxHP(b))) {
      if (e.credits - repairCost(u, g) >= 60) repair(g, u.id);
    }
    g.vacated = [];
    if (!builds) return;
    // 1b. Clear the factories, as a player would (a unit on the city hex blocks building there). A ready unit on a
    // quiet city carries out its orders first. Threatened cities clear their garrison only in tryBuild,
    // immediately before a replacement is purchased with the final resource reserves applied.
    // The UI plays these moves from g.vacated ({ id, orders }).
    for (const s of bases) {
      const u = unitAt(g, s);
      if (!u || u.side !== side || u.moved || !isReady(g, u)) continue;
      if (!foes.some(f => dist(g, f, s) <= 2)) {
        const orders = aiOrder(g, u.id);
        // Without a dedicated garrison, the unit may not have a local
        // objective. It must still clear the city's production hex.
        if (u.c === s.c && u.r === s.r && !u.moved) {
          const reach = reachable(g, u);
          const spot = adjacent(g, s)
            .filter(p => reach.has(key(p)) && !isSea(p) && !stationAt(g, p) && !unitAt(g, p))
            .sort((a, b) => (TERRAIN[b.terrain]?.cover || 0) - (TERRAIN[a.terrain]?.cover || 0) || a.r - b.r || a.c - b.c)[0];
          const moveOut = spot && move(g, u.id, spot.c, spot.r);
          if (moveOut?.ok) orders.push({ kind: 'move', ...moveOut, id: u.id });
        }
        g.vacated.push({ id: u.id, orders });
        continue;
      }
    }
    // 2. Super-heavy production is now a normal factory choice, evaluated by
    // local battlefield demand. Retire legacy savings/cooldown flags in old saves.
    delete plan.saving;
    delete plan.lastSuperTurn;
    const ordinaryBudget = price(typeFor(side, 'scout', g), 2, g, side);
    // 2b. F.L.E.I.J.A. Eliminator: the moment countermeasures are available, rivals build them before anything else,
    // starting every charge they can afford (up to ELIMINATOR.max) and saving for the next one. With no free lab-3
    // city outside their charges' cover, step 3 raises a lab for one (defensePrep).
    const wantsDefense = () => eliminatorUnlocked(g) && sideEliminators(g, side).length < ELIMINATOR.max;
    let defenseCity = null;
    while (wantsDefense() && (defenseCity = eliminatorCity(g, side)) && !eliminatorReason(g, defenseCity)) {
      startEliminator(g, defenseCity.id);
      defenseCity = null;
    }
    plan.eliminator = !!defenseCity;
    const defensePrep = wantsDefense() && !defenseCity ? eliminatorCity(g, side, true) : null;
    // 2c. F.L.E.I.J.A.: one warhead at a time, started again as soon as the last one is fired. A power with the
    // Sakuradite for it (or the income to gather it soon) keeps that Sakuradite back, then saves credits and industry
    // and starts the project in its best-lab city.
    const warCity =
      !plan.eliminator &&
      hasFleija(g, side) &&
      !g.stations.some(s => s.project?.side === side) &&
      !(g.arsenal?.[side] > 0)
        ? fleijaCity(g, side, front)
        : null;
    plan.warhead = !!warCity && ((e.sakuradite || 0) >= FLEIJA.cost.sakuradite || income(g, side).sakuradite >= 15);
    if (plan.warhead && !projectReason(g, warCity)) {
      startProject(g, warCity.id);
      plan.warhead = false;
    }
    const defenseSaving = plan.eliminator && (e.sakuradite || 0) >= ELIMINATOR.cost.sakuradite,
      warSaving = plan.warhead && (e.sakuradite || 0) >= FLEIJA.cost.sakuradite;
    // Reserve strategic-weapon funds as before; super-heavies no longer hoard resources.
    const reserve = defenseSaving
      ? Math.min(e.credits, ELIMINATOR.cost.credits)
      : warSaving ? Math.min(e.credits, FLEIJA.cost.credits) : 60;
    const reserveInd = defenseSaving
      ? Math.min(e.industry, ELIMINATOR.cost.industry)
      : warSaving ? Math.min(e.industry, FLEIJA.cost.industry) : 0;
    const reserveSak = plan.eliminator
      ? ELIMINATOR.cost.sakuradite
      : plan.warhead ? FLEIJA.cost.sakuradite : 0;
    const spendable = () => Math.max(0, e.credits - reserve);
    // Sakuradite held back for a project only blocks purchases that spend Sakuradite.
    const affordable = c =>
      c.credits <= spendable() &&
      e.industry - (c.industry || 0) >= reserveInd &&
      (!c.sakuradite || (e.sakuradite || 0) - c.sakuradite >= reserveSak);
    // Preserve an ordinary formation budget when making optional investments;
    // the recruitment pass itself remains free to use that budget.
    const developmentAffordable = c => affordable(c) &&
      spendable() - c.credits >= ordinaryBudget.credits &&
      e.industry - reserveInd - (c.industry || 0) >= ordinaryBudget.industry;
    // Lighter frames leave enough Sakuradite for one heavy frame once a level-3 factory exists.
    const heavySak = yard3.length ? price(typeFor(side, 'heavy', g), 1, g, side).sakuradite : 0;
    const keepsHeavy = (type, c) =>
      !c.sakuradite || TYPES[type].tier >= 3 || (e.sakuradite || 0) - c.sakuradite >= heavySak;
    // 3. Upgrade one building per turn when there is surplus: Sakuradite refineries first (richest deposit first),
    // then the lowest-level factory or lab at the safest city.
    if (g.turn >= 2) {
      let upgraded = false;
      // Rivals can prepare Labs I-II before turn 15, but Lab III obeys the same turn gate as the player. A city that
      // needs a lab for its next Eliminator comes first.
      const soon = g.turn >= FLEIJA.labTurn - 5,
        prep =
          side !== g.player && MAJORS.includes(side) ? defensePrep || (soon ? fleijaCity(g, side, front) : null) : null;
      if (
        prep &&
        (prep.lab || 0) < FLEIJA.lab &&
        ((prep.lab || 0) < FLEIJA.lab - 1 || g.turn >= FLEIJA.labTurn)
      ) {
        const cost = buildCost(prep, 'lab');
        if (spendable() - cost.credits >= 100 && developmentAffordable(cost)) upgraded = build(g, prep.id, 'lab').ok;
      }
      for (const d of (g.sites || []).filter(d => depositOwner(g, d) === side).sort((a, b) => b.base - a.base)) {
        const host = depositHost(g, d),
          cost = buildCost(host, 'refinery');
        if (upgraded) break;
        if ((host.refinery || 0) >= 3 || spendable() - cost.credits < 150 || !developmentAffordable(cost)) continue;
        upgraded = (d.city == null ? refine(g, d.id) : build(g, host.id, 'refinery')).ok;
        if (upgraded) break;
      }
      const options = bases
        .flatMap(s => ['factory', 'lab'].map(kind => ({ s, kind, level: buildingLevel(s, kind) })))
        .filter(o => o.level < 3 && !(o.kind === 'lab' && o.level === 2 && g.turn < FLEIJA.labTurn))
        .sort((a, b) => a.level - b.level || front(b.s) - front(a.s) || random(g) - 0.5);
      const pick = options[0];
      if (
        !upgraded &&
        pick &&
        spendable() - buildCost(pick.s, pick.kind).credits >= 250 &&
        developmentAffordable(buildCost(pick.s, pick.kind))
      )
        build(g, pick.s.id, pick.kind);
    }
    // 4. Reinforce healthy Armor and Artillery units parked at a friendly city.
    for (const u of own()
      .filter(
        u =>
          u.stack < 3 &&
          !u.moved &&
          !u.attacked &&
          TYPES[u.type].branch !== 'Infantry' &&
          u.hp / maxHP(u) >= 0.7 &&
          nearFriendlyCity(g, u) &&
          !atSea(g, u) &&
          // Keep the garrison's move available until replacement recruitment is decided.
          !(stationAt(g, u)?.owner === side && front(u) <= 2 &&
            stationAt(g, u).producedTurn !== g.turn && !cityBusyReason(g, stationAt(g, u))),
      )
      .sort((a, b) => TYPES[b.type].cost - TYPES[a.type].cost)) {
      const c = reinforceCost(u.type, g, side, u);
      if (developmentAffordable(c) && keepsHeavy(u.type, c) && spendable() - c.credits >= 150) reinforce(g, u.id);
    }
    // 5. Build: factories serving the front with the largest strength deficit first (then front-line ones), each
    // putting what its front asks for at the top of its menu. There is no army cap; the treasury is the limit.
    const serves = s =>
        (memo.fronts || [])
          .filter(f => f.assigned < f.desiredStrength && dist(g, s, f.rally || f.anchor) <= 25)
          .sort((a, b) => dist(g, s, a.rally || a.anchor) - dist(g, s, b.rally || b.anchor))[0],
      urgency = s => {
        const f = serves(s);
        return f ? (f.desiredStrength - f.assigned) * (0.5 + Math.max(0, f.score) / 100) : 0;
      },
      yards = bases.slice().sort((a, b) => urgency(b) - urgency(a));
    // 4b. Navy: fleet and port construction scale with coastal exposure, enemy naval
    // threats and overseas fronts rather than arbitrary per-faction ship/port caps.
    // Spending on the fleet must still leave a normal two-frame Scout formation
    // affordable, so coastal construction cannot starve the field army.
    const navy = g.mode !== 'campaign' && NAVAL[side];
    if (navy) {
      const coastal = bases.filter(s => portSite(g, s)),
        availableFleet = own().filter(u => !!TYPES[u.type].naval),
        navalThreats = foes.filter(u => TYPES[u.type].naval &&
          coastal.some(s => dist(g, s, u) <= aiRange(g).enemyScan)),
        invasions = (memo.fronts || []).filter(f => f.overseas && f.type === 'offensive'),
        invasionIds = new Set(invasions.map(f => f.id)),
        invasionTroops = own().filter(u => !TYPES[u.type].naval && invasionIds.has(memo.assign?.[u.id])).length,
        desiredCarriers = coastal.length
          ? Math.ceil(coastal.length / 12) + Math.ceil(invasionTroops / 7) + Math.ceil(navalThreats.length / 3)
          : 0,
        desiredAmphibious = coastal.length
          ? Math.ceil(coastal.length / 9) + Math.ceil(invasionTroops / 5) + Math.ceil(navalThreats.length / 2)
          : 0,
        desiredPorts = Math.max(invasions.length, Math.ceil((desiredCarriers + desiredAmphibious) / 4)),
        desiredCarrierPorts = Math.ceil(desiredCarriers / 3),
        navyAffordable = c => affordable(c) &&
          spendable() - c.credits >= ordinaryBudget.credits &&
          e.industry - reserveInd - (c.industry || 0) >= ordinaryBudget.industry,
        ownedPorts = () => coastal.filter(s => s.portLevel && s.portOwner === side),
        fleetCount = (...roles) => availableFleet.filter(u => roles.some(r => u.type === navy[r])).length;

      const ports = ownedPorts();
      const carrierPorts = ports.filter(s => s.portLevel >= 2);
      // More distant ports extend support to additional coastlines, and forward
      // rally cities get priority when several coastal cities are available.
      const portCandidates = coastal
        .filter(s => !s.portLevel && !buildReason(g, s, 'port'))
        .map(s => {
          const separation = ports.length ? Math.min(...ports.map(p => dist(g, s, p))) : 99;
          const invasionPriority = invasions.length
            ? Math.max(...invasions.map(f => Math.max(0, 20 - dist(g, s, f.rally || f.anchor))))
            : 0;
          const threatPriority = navalThreats.some(u => dist(g, s, u) <= aiRange(g).threat * 2) ? 15 : 0;
          return { s, separation, score: Math.min(30, separation) * 2 + invasionPriority + threatPriority };
        })
        .filter(o => o.separation >= 6 || !ports.length)
        .sort((a, b) => b.score - a.score || a.s.id - b.s.id);
      // Upgrade existing carrier berths before adding capacity. One port reaches
      // level 3 so landing tech and higher-tier naval research are usable.
      const portToUpgrade =
        (carrierPorts.length < desiredCarrierPorts
          ? ports.find(s => s.portLevel === 1 && !buildReason(g, s, 'port'))
          : null) ||
        (g.turn >= 3 && !ports.some(s => s.portLevel >= 3)
          ? carrierPorts.find(s => !buildReason(g, s, 'port'))
          : null);
      const portToBuild = portToUpgrade ||
        (ports.length < desiredPorts ? portCandidates[0]?.s : null);
      if (portToBuild) {
        const cost = buildCost(portToBuild, 'port');
        if (navyAffordable(cost) && spendable() - cost.credits >= ordinaryBudget.credits + 100)
          build(g, portToBuild.id, 'port');
      }

      // Every available berth may recruit when the navy is undersized. Balance
      // carriers against amphibious formations by proportional shortage, not a
      // static fleet ceiling. Port availability and the treasury remain limits.
      for (const port of ownedPorts().sort((a, b) => front(a) - front(b))) {
        const carriers = fleetCount('carrier'),
          amph = fleetCount('amphibious', 'amphibious2'),
          carrierGap = desiredCarriers - carriers,
          amphGap = desiredAmphibious - amph;
        if (carrierGap <= 0 && amphGap <= 0) break;
        const carrierFirst = carrierGap > 0 &&
          (amphGap <= 0 || carrierGap / Math.max(1, desiredCarriers) >= amphGap / Math.max(1, desiredAmphibious));
        const roles = carrierFirst ? ['carrier', 'amphibious2', 'amphibious'] :
          ['amphibious2', 'amphibious', 'carrier'];
        for (const role of roles) {
          if ((role === 'carrier' && carrierGap <= 0) || (role !== 'carrier' && amphGap <= 0)) continue;
          const type = navy[role], cost = price(type, 1, g, side);
          if (navyAffordable(cost) && canBuy(g, port, type, 1) && recruit(g, port.id, type, 1).ok) {
            // Count against demand immediately, even if other ports build this turn.
            availableFleet.push(g.units[g.units.length - 1]);
            break;
          }
        }
      }
    }
    // Formations first: every factory tries a 3- or 2-frame formation before
    // unfilled factories may produce an affordable single-frame unit. A successful
    // formation elsewhere must not block production at an otherwise idle factory.
    // Super-heavy demand is proportional to the actual armored/high-tier threat
    // at an understrength front. There is no arbitrary ownership or turn cap.
    // Include new recruits as they are produced, so simultaneous factories
    // cannot all oversupply the same front based on an outdated plan snapshot.
    const superDemand = f => {
      if (!f || f.overseas) return false;
      const enemies = f.enemies || [],
        armored = enemies.filter(u => TYPES[u.type].branch === 'Armor')
          .reduce((total, u) => total + unitStrength(u), 0),
        elite = enemies.filter(u => (TYPES[u.type].tier || 1) >= 3)
          .reduce((total, u) => total + unitStrength(u), 0),
        fortified = f.type === 'offensive' && f.objectives.some(o => o.fortified);
      if (armored < 3 && elite < 3 && !fortified) return false;
      const desired = Math.min(f.desiredStrength * 0.35,
          Math.max(fortified ? 3 : 0, armored * 0.6 + elite * 0.3)),
        existing = own().filter(u => u.type === superType &&
          (memo.assign?.[u.id] === f.id ||
            (!memo.assign?.[u.id] && dist(g, u, f.anchor) <= 25)))
          .reduce((total, u) => total + unitStrength(u), 0);
      return existing < desired;
    };
    const menuOf = s => {
      // Tier-1 frames (no Sakuradite) follow as fallbacks when Sakuradite runs short.
      const classes =
          s.tier >= 3
            ? ['heavy', 'siege', 'medium', 'rocket', 'light', 'assault', 'support', 'scout']
            : s.tier === 2
              ? ['medium', 'rocket', 'raider', 'light', 'support', 'assault', 'scout']
              : ['light', 'support', 'assault', 'scout'],
        need = (serves(s)?.need || []).filter(c => classes.includes(c)),
        menu = [...need, ...classes.filter(c => !need.includes(c))].map(cls => typeFor(side, cls, g)),
        preferred = menu[Math.floor(random(g) * Math.min(menu.length, 3))];
      // Super-heavy competes in the same formation-size and affordability passes
      // when demanded, instead of being purchased by a separate saving routine.
      return s.tier >= 3 && superDemand(serves(s))
        ? [superType, preferred, ...menu.filter(x => x !== preferred)]
        : [preferred, ...menu.filter(x => x !== preferred)];
    };
    // The frame the front asks for comes first, in the largest formation affordable, then the next frame on the menu.
    const tryBuild = (s, menu, sizes) => {
      const defender = unitAt(g, s),
        vacating = defender?.side === side && isReady(g, defender) && !defender.moved && front(s) <= 2 ? defender : null,
        reach = vacating && reachable(g, vacating),
        spot = reach && adjacent(g, s)
          .filter(p => reach.has(key(p)) && !isSea(p) && !stationAt(g, p) && !unitAt(g, p))
          .sort((a, b) => (TERRAIN[b.terrain]?.cover || 0) - (TERRAIN[a.terrain]?.cover || 0) || a.r - b.r || a.c - b.c)[0];
      for (const type of menu)
        for (const n of sizes) {
          const c = price(type, n, g, side);
          if (type === superType &&
              (!superDemand(serves(s)) ||
                spendable() - c.credits < ordinaryBudget.credits ||
                e.industry - reserveInd - c.industry < ordinaryBudget.industry)) continue;
          if (!canBuy(g, s, type, n, spot ? vacating : null) || !affordable(c) || !keepsHeavy(type, c)) continue;
          if (vacating) {
            if (!spot) continue;
            const m = move(g, vacating.id, spot.c, spot.r);
            if (!m.ok) continue;
            g.vacated.push({ id: vacating.id, orders: [{ kind: 'move', ...m, id: vacating.id }] });
          }
          // No other spending occurs between validating the replacement, clearing the city and recruiting.
          if (recruit(g, s.id, type, n).ok) return true;
        }
      return false;
    };
    const menus = new Map(yards.map(s => [s, menuOf(s)]));
    for (const s of yards) tryBuild(s, menus.get(s), [3, 2]);
    // Only factories that have not produced this turn get the single-frame
    // fallback. Respect the same affordability and reserve checks as above.
    for (const s of yards)
      if (s.producedTurn !== g.turn) tryBuild(s, menus.get(s), [1]);
  }
  function coastTile(g, p) {
    return !isSea(p) && adjacent(g, p).some(isSea);
  }
  function aiOrder(g, id) {
    const u = g.units.find(u => u.id === id);
    if (!u || !isReady(g, u)) return [];
    const events = [],
      memo = aiPlan(g, u.side),
      guard = memo.guards?.[u.id],
      front = frontOf(g, memo, u),
      // Units already ahead of an assembling front's rally city hold their ground rather than walk back.
      forward = front?.state === 'assembling' && aheadOfRally(g, front, u),
      home = { c: u.c, r: u.r },
      fieldAt = forward ? p => dist(g, p, home) : fieldFor(g, memo, u);
    const recovery = memo.recoveries?.get(u.id);
    if (recovery) {
      if (u.moved || u.attacked) return events;
      const field = recovery.field,
        value = p => field[p.r * g.cols + p.c] + g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && !atSea(g, v) && dist(g, v, p) <= rangeOf(g, v).max).length * 8
          - (p.c === recovery.city.c && p.r === recovery.city.r ? 2 : 0),
        picks = [...reachable(g, u).keys()].map(k => { const [c, r] = k.split(',').map(Number); return tile(g, c, r); })
          .filter(p => !isSea(p) && !unitAt(g, p) && Number.isFinite(field[p.r * g.cols + p.c]))
          .sort((a, b) => value(a) - value(b));
      if (picks[0] && value(picks[0]) < value(u)) {
        const m = move(g, id, picks[0].c, picks[0].r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
      return events;
    }
    // Withdraw already-fired allies before Leila's own movement can take her out of range.
    if (COMMANDERS[u.cmd]?.action?.kind === 'withdraw' && !feintReason(g, u)) {
      const friends = actionTargets(g, u).map(v => v.id), r = feint(g, id);
      if (r.ok) {
        events.push({ kind: 'feint', id, affected: r.affected });
        for (const friend of friends) events.push(...aiOrder(g, friend));
      }
    }
    // Navies: a carrier runs its own operation; idle troops board a carrier waiting within reach.
    const steered = isShip(u) && !u.moved && aiCarrier(g, u, memo, events, fieldAt);
    if (!u.moved && !guard && u.deployedTurn !== g.turn && wantsLift(g, u, memo)) {
      const berth = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .find(p => {
          const v = unitAt(g, p);
          return v && v !== u && v.side === u.side && canBoard(g, v) && (!v.cargo?.length || sameLift(frontOf(g, memo, v.cargo[0]), front));
        });
      const m = berth && move(g, id, berth.c, berth.r);
      if (m?.ok) return [...events, { kind: 'move', ...m, id }];
    }
    const action = COMMANDERS[u.cmd]?.action;
    if (action && !['command', 'withdraw'].includes(action.kind) && !feintReason(g, u)) {
      const r = feint(g, id);
      if (r.ok) events.push({ kind: 'feint', id, affected: r.affected });
    }
    const choose = () =>
      targets(g, u)
        .map(p => {
          const d = unitAt(g, p),
            s = stationAt(g, p),
            pr = preview(g, id, p.c, p.r);
          const score =
            pr.unit +
            pr.shield * 0.7 +
            (d && pr.unit >= d.hp ? 130 : 0) +
            (s ? 35 : 0) +
            (s?.capitalOf ? 60 : 0) +
            (s?.project ? 120 : 0) +
            (d?.cmd ? 30 : 0) -
            pr.counter * 0.5;
          return { p, score };
        })
        .sort((a, b) => b.score - a.score)[0];
    const maneuver = () => {
      if (u.moved || u.attacked || steered) return;
      // Boarding is decided above (idle troops and waiting carriers), so occupied hexes are not destinations here.
      const spots = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .filter(p => !unitAt(g, p));
      const enemies = g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, u) <= aiRange(g).enemyScan);
      const old = { c: u.c, r: u.r };
      // Overseas invasions assemble before embarking. Nearby land formations stage on the coast; units already at sea
      // count as an escort so follow-on waves do not get stranded waiting for a fresh three-unit convoy.
      const naval = !!TYPES[u.type].naval,
        fromLand = !naval && !atSea(g, u),
        freeAllies = g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && !memo.guards?.[v.id]),
        landGroup = freeAllies.filter(v => !atSea(g, v) && dist(g, v, u) <= aiRange(g).convoyLand).length,
        seaEscort = freeAllies.filter(v => atSea(g, v) && dist(g, v, u) <= aiRange(g).convoySea).length,
        // A front still gathering (or holding) on this landmass keeps its troops ashore; one bound overseas lets a lone
        // formation cross where no enemy is near.
        ashore = front && front.state !== 'attacking' && front.masses?.has(massOf(g, u)),
        safe = front && !enemies.some(v => dist(g, v, u) <= aiRange(g).enemyScan / 2),
        convoy = fromLand && !guard && !ashore && (landGroup >= 2 || (landGroup >= 1 && seaEscort >= 1) || safe),
        currentField = fieldAt(old);
      const placeScore = p => {
        const station = stationAt(g, p);
        let sc = station && foe(g, station.owner, u.side) && !isShip(u) &&
          (station.shield === 0 || TYPES[u.type].naval === 'amphibious' || atSea(g, u))
          ? 400 + (station.capitalOf ? 600 : 0) : 0;
        if (COMMANDERS[u.cmd]?.fx.treasury && station?.owner === u.side) sc += 250 + station.income * 4;
        const mine = siteAt(g, p);
        if (mine && foe(g, mine.owner, u.side) && canCapture(u)) sc += mine.base >= 30 ? 550 : 250;
        // A city guard stands beside its city while no enemy is within 2 hexes of it, leaving the factory free (a
        // unit on the city hex blocks production); when one comes close it steps onto the city.
        const onGuard = guard && p.c === guard.c && p.r === guard.r,
          guardBonus = !onGuard ? 0 : guard.id != null && !enemies.some(v => dist(g, v, guard) <= 2) ? -40 : 25;
        sc -= guard ? dist(g, p, guard) * 30 - guardBonus : u.hold ? 0 : fieldAt(p) * 8;
        if (u.hold) sc -= Math.max(0, dist(g, p, u.hold) - (u.hold.radius ?? 2)) * 40;
        let nearestEnemy = 15,
          danger = 0;
        for (const v of enemies) {
          const d = dist(g, v, p);
          nearestEnemy = Math.min(nearestEnemy, d);
          if (d <= 1) danger++;
        }
        if (isSea(p) && naval) {
          sc -= danger * 20;
        } else if (isSea(p)) {
          sc -= 14 + danger * 40 + (nearestEnemy <= 2 ? 30 : 0) + (fromLand && (!convoy || guard) ? 1000 : 0);
          if (fromLand && convoy && fieldAt(p) < currentField) sc += 75;
        } else if (!fromLand) {
          sc += naval ? 30 : 90;
        } else if (!guard && !convoy && coastTile(g, p) && fieldAt(p) <= currentField) {
          const assembling = freeAllies.filter(v => !atSea(g, v) && dist(g, v, p) <= aiRange(g).convoyLand).length;
          sc += 28 + Math.min(3, assembling) * 12;
        }
        if (TYPES[u.type].branch === 'Artillery') {
          sc -= danger * 28;
          sc -= Math.abs(nearestEnemy - TYPES[u.type].max) * 6;
        } else sc -= nearestEnemy * 2;
        const skill = COMMANDERS[u.cmd]?.fx || {};
        const allies = freeAllies.filter(v => dist(g, v, p) <= 2);
        if (skill.loneRaider) sc -= allies.filter(v => dist(g, v, p) === 1).length * 18;
        if (skill.engineeringPen || skill.reassure || skill.repairSupply || skill.bodyguard || skill.defensiveDoctrine || skill.orderCommander)
          sc += Math.min(4, allies.length) * 12;
        if (station?.owner === u.side && u.hp / maxHP(u) < 0.5) sc += 20;
        if (naval && u.hp / maxHP(u) < 0.5 && portAtHex(g, p)?.portOwner === u.side) sc += 150;
        return sc;
      };
      let best = null,
        bestScore = -Infinity;
      for (const p of spots) {
        let sc = placeScore(p);
        u.c = p.c;
        u.r = p.r;
        const oldDistance = u.movedDistance, oldMoved = u.moved;
        u.movedDistance = (oldDistance || 0) + dist(g, old, p);
        u.moved = true;
        reindex(g, u, old);
        const shot = choose();
        u.c = old.c;
        u.r = old.r;
        u.movedDistance = oldDistance;
        u.moved = oldMoved;
        reindex(g, u, p);
        if (shot) sc += shot.score * 0.6;
        if (sc > bestScore) {
          bestScore = sc;
          best = p;
        }
      }
      const current = choose(),
        stay = placeScore(tile(g, u.c, u.r)) + (current ? current.score * 0.6 : 0);
      if (best && bestScore > stay + 4) {
        const m = move(g, id, best.c, best.r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    };
    // Reevaluate positioning after each kill that restores movement/refire, within a bounded action budget.
    for (let chain = 0; chain < 8 && !u.attacked && !g.over && u.hp > 0; chain++) {
      maneuver();
      // A designation may only now be in range.
      if (action && !['command', 'withdraw'].includes(action.kind) && !feintReason(g, u)) {
        const r = feint(g, id);
        if (r.ok) events.push({ kind: 'feint', id, affected: r.affected });
      }
      const shot = choose();
      if (!shot) break;
      const a = attack(g, id, shot.p.c, shot.p.r);
      if (a.ok) events.push({ kind: 'attack', ...a, id });
      else break;
    }
    // Spend restored movement on a safe hex, including withdrawal moves after firing.
    if (!u.moved && (u.attacked || u.skillReposition || u.withdrawMove) && !g.over && u.hp > 0) {
      const score = p => -fieldAt(p) * 8 - g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, p) <= rangeOf(g, v).max).length * 30;
      const picks = [...reachable(g, u).keys()].map(k => { const [c, r] = k.split(',').map(Number); return tile(g, c, r); })
        .filter(p => !unitAt(g, p)).sort((a, b) => score(b) - score(a));
      if (picks[0] && score(picks[0]) > score(u)) {
        const m = move(g, id, picks[0].c, picks[0].r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    }
    // Zero and Leila use their actions after allied orders. UI ordering puts them last.
    if (action?.kind === 'command' && !g.over && u.hp > 0 && !feintReason(g, u)) {
      const r = feint(g, id);
      if (r.ok) events.push({ kind: 'feint', id, affected: 1 }, ...aiOrder(g, r.target));
    }
    if (action?.kind === 'withdraw' && !g.over && u.hp > 0 && !feintReason(g, u)) {
      const friends = actionTargets(g, u).map(v => v.id), r = feint(g, id);
      if (r.ok) {
        events.push({ kind: 'feint', id, affected: r.affected });
        for (const friend of friends) events.push(...aiOrder(g, friend));
      }
    }
    return events;
  }
  Object.assign(E, { aiProduction, aiOrder, aiPlan, unitStrength, FRONT });
})(typeof window !== 'undefined' ? window : globalThis);

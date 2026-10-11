  // ======== Theaters ========
  // Objectives within `radius` hexes form one front. Every emergency and the `max` best other fronts are fought at once,
  // units keep their front for `sticky` turns, and an offensive gathers within `rally` hexes before attacking
  // (or after `wait` turns). Garrisons and defensive fronts respond to threats; no army is held in strategic reserve.
  const FRONT = { radius: 16, defenseRadius: 7, near: 14, max: 6, sticky: 4, far: 60, rally: 4, wait: 3, pull: 15, stray: 4, floor: 0.25, emergencyRatio: 1, emergencyMinShare: 0.2, emergencyMaxShare: 0.35, approachingWeight: 0.6, multiCityBonus: 12, alertShare: 0.25, alertRecovery: 2, emergencyCombinedShare: 0.65, capitalCrisisAlertShare: 0.42, capitalCrisisOffenseShare: 0.27, normalExpeditionShare: 0.4, retreatRatio: 0.35 };
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
      byDist = (p, list) => list.slice().sort((a, b) => dist(g, a.anchor || a, p) - dist(g, b.anchor || b, p) || (a.id < b.id ? -1 : 1)),
      // Lower bound on arrival time, not actual pathfinding. Incompatible landmasses
      // cannot reinforce one another overland; overseas units stage at coastal rallies.
      travelTurns = (u, f) => {
        const from = at(u), destination = f.rally || f.anchor;
        if (!from || !destination || atSea(g, from) ||
            massOf(g, from) < 0 || massOf(g, from) !== massOf(g, destination))
          return Infinity;
        return Math.ceil(Math.max(0, dist(g, from, destination) - FRONT.rally) /
          Math.max(1, E.movement(g, u)));
      };
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
      // Track what can plausibly arrive within a tactical window. Distant
      // assignments still exist, but are not usable as near-term defenders.
      f.availableTwo = sum(units.filter(u => travelTurns(u, f) <= 2));
      f.availableFour = sum(units.filter(u => travelTurns(u, f) <= 4));
      f.arrivingTwo = 0;
      f.arrivingFour = 0;
      // Preserve local garrisons while allowing an overwhelmed mobile field
      // detachment to fall back to an uncontested friendly city on the same landmass.
      const retreatOptions = f.type === 'defensive' && !f.vital && f.immediateMenace >= 8 &&
        f.localStrength > 0 && f.localStrength < f.immediateMenace * FRONT.retreatRatio
        ? own.filter(s => massOf(g, s) === massOf(g, f.anchor) &&
            dist(g, s, f.anchor) >= 4 && dist(g, s, f.anchor) <= 18 &&
            !foes.some(v => dist(g, v, s) <= R.threat))
          .sort((a, b) => dist(g, a, f.anchor) - dist(g, b, f.anchor) || a.id - b.id)
        : [];
      f.fallback = retreatOptions[0] || null;
      f.withdraw = !!f.fallback;
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
        const eta = travelTurns(u, f);
        if (eta <= 2) f.arrivingTwo += unitStrength(u);
        if (eta <= 4) f.arrivingFour += unitStrength(u);
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
          const eta = travelTurns(u, f);
          if (eta > 4 || dist(g, at(u), f.anchor) > range) continue;
          const d = eta * 6 + dist(g, at(u), f.anchor) * 0.2 -
            (sticky[u.id]?.front === f.id ? 2 : 0);
          if (d < bd || (d === bd && (!best || u.id < best.id))) {
            bd = d;
            best = u;
          }
        }
        if (best) give(best, f);
        return !!best;
      };
    for (const f of emergencies) while (f.arrivingFour < f.target && take(f, FRONT.pull + 10));
    for (;;) {
      const needy = fronts.filter(f => f.arrivingFour < f.target)
        .sort((a, b) => b.target - b.arrivingFour - (a.target - a.arrivingFour));
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
      const reachableDefense = localDefense.filter(f => travelTurns(u, f) <= 6),
        reachableOverflow = overflow.filter(f => travelTurns(u, f) <= 10),
        local = byDist(at(u), reachableDefense)[0],
        preferred = byDist(at(u), reachableOverflow)[0],
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
        set(f.withdraw ? 'regrouping' :
          f.type === 'defensive' ? 'holding' : f.type === 'alert' ? 'alert' : 'attacking');
      else {
        if (st.state === 'holding' || st.state === 'alert') set('assembling');
        f.readyStrength = sum(mine.filter(u => dist(g, at(u), f.rally) <= FRONT.rally || aheadOfRally(g, f, at(u))));
        f.attackThreshold = Math.max(2, Math.min(f.desiredStrength * 0.8, f.assigned * 0.5));
        // Waiting alone does not make an army ready. After a short staging
        // period a smaller assault is allowed only when it can overpower its
        // nearby opposition; otherwise keep gathering instead of feeding units in.
        const limitedAssault = g.turn - st.since >= FRONT.wait &&
          f.readyStrength >= Math.max(1, f.assigned * 0.35) &&
          f.readyStrength >= f.enemyStrength * 1.2;
        if (st.state === 'assembling' && (f.readyStrength >= f.attackThreshold || limitedAssault)) {
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
          : f.state === 'regrouping'
            ? [[f.fallback, -2]]
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

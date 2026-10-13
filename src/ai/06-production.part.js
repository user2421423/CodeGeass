  // A country's Eliminators have two complementary jobs: one stays near the most valuable
  // cities, while the others follow Tier 1 commanders into combat to protect armies from F.L.E.I.J.A.
  // Only own charge locations enter these calculations. Never inspect rival Eliminator state.
  // Reserve the first charge for a valuable city cluster.  Further charges are
  // mobile assets if living Tier 1 commanders can actually retrieve them.
  const ELIMINATOR_AI = { pickupTurns: 8, maxPickupDistance: 36, maxRouteCost: 72, anchorMinimum: 75 };
  function eliminatorCityValue(g, side, s) {
    return 22 + (s.tier || 1) * 12 + (s.income || 0) * 3 + (s.industry || 0) * 2 +
      (s.capitalOf === side ? 240 : 0) + (s.project?.side === side ? 130 : 0) +
      ((s.lab || 0) >= 3 ? 28 : 0);
  }
  function eliminatorCarrierScore(g, u) {
    if (COMMANDERS[u.cmd]?.storyTier !== 1 || u.hp <= 0 || atSea(g, u)) return 0;
    return 1000 + 45 * (E.officerOf(g, u)?.rank || 0) + unitStrength(u) * 8 +
      80 * Math.min(1, u.hp / maxHP(u));
  }
  function eliminatorCoverageValue(g, side, p, ignoreCity = null) {
    const existing = sideEliminators(g, side).filter(h => h.city?.id !== ignoreCity);
    let score = 0;
    for (const s of g.stations) {
      if (s.owner !== side || dist(g, s, p) > ELIMINATOR.range) continue;
      const overlap = existing.filter(h => dist(g, h, s) <= ELIMINATOR.range).length;
      score += eliminatorCityValue(g, side, s) / (1 + overlap * 3);
    }
    return score;
  }
  // Public battlefield situation + own assets only. Never peek at another
  // side's Eliminator state or private weapon projects.
  function eliminatorThreatAssets(g, side, memo = null) {
    if (memo?.eliminatorThreatAssets) return memo.eliminatorThreatAssets;
    const foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral');
    const threat = p => {
      let nearest = Infinity, nearby = 0;
      for (const foeUnit of foes) {
        const d = dist(g, p, foeUnit);
        if (d < nearest) nearest = d;
        if (d <= 8) nearby++;
      }
      // A strike on an active battle line is more plausible than a remote
      // unguarded tile, but capitals remain strategically valuable.
      return nearest <= 3 ? 1.8 : nearest <= 7 ? 1.45 :
        nearest <= 13 ? 1.05 : foes.length ? 0.78 : 1;
    };
    const assets = [];
    for (const s of g.stations) {
      if (s.owner !== side) continue;
      const cluster = g.units.filter(u => u.hp > 0 && u.side === side && dist(g, u, s) <= 3).length;
      assets.push({ p: s, kind: 'city', id: s.id,
        value: eliminatorCityValue(g, side, s) * threat(s) * (1 + Math.min(0.4, cluster * 0.05)) });
    }
    for (const u of g.units) {
      if (u.hp <= 0 || u.side !== side) continue;
      const commander = COMMANDERS[u.cmd], ratio = Math.max(0.2, u.hp / maxHP(u));
      const nearby = g.units.filter(v => v !== u && v.hp > 0 && v.side === side && dist(g, v, u) <= 3).length;
      const strength = unitStrength(u);
      const value = (40 + Math.min(200, strength * 9) +
        (commander?.storyTier === 1 ? 180 : u.cmd ? 90 : 0)) * ratio *
        threat(u) * (1 + Math.min(0.5, nearby * 0.06));
      assets.push({ p: u, kind: 'unit', id: u.id, value });
    }
    if (memo) memo.eliminatorThreatAssets = assets;
    return assets;
  }
  function eliminatorThreatCover(g, side, p, assets, carrier = null) {
    const others = sideEliminators(g, side).filter(h =>
      h.ready && (!carrier || h.unit?.id !== carrier.id));
    let score = 0;
    for (const asset of assets) {
      if (asset.kind === 'unit' && carrier?.id === asset.id) continue;
      if (dist(g, p, asset.p) > ELIMINATOR.range) continue;
      const overlap = others.filter(h => dist(g, h, asset.p) <= ELIMINATOR.range).length;
      score += asset.value / (1 + overlap * 3);
    }
    return score;
  }
  // At least one strong stationary city anchor, and a second only if a
  // seriously threatened city cluster merits sacrificing a mobile escort.
  // First slot: the highest-value city cluster. Further slots default to
  // formation escorts, with a second city reserved only under direct,
  // independently valuable threat. Never lock all charges at idle labs.
  function eliminatorStationaryCities(g, side) {
    const waiting = g.stations.filter(s => s.owner === side && s.eliminator > 0);
    const fixed = new Set();
    if (!waiting.length) return fixed;
    const sorted = waiting.map(s => ({s,
      score: eliminatorCoverageValue(g,side,s,s.id),
    })).sort((a,b)=>b.score-a.score || a.s.id-b.s.id);
    const first = sorted[0];
    if (first.score >= ELIMINATOR_AI.anchorMinimum) fixed.add(first.s.id);
    const spare = sorted.filter(x => !fixed.has(x.s.id));
    const leaders = g.units.filter(u => u.hp > 0 && u.side === side &&
      !(u.eliminator>0) && eliminatorCarrierScore(g,u)>0 &&
      u.hp/maxHP(u) >= 0.6);
    const rivals = g.units.filter(u => u.hp > 0 && foe(g,u.side,side));
    if (spare.length && sideEliminators(g,side).length >= 3) {
      const threatened = spare
        .map(x => ({
          ...x,
          threat: rivals.filter(e=>dist(g,e,x.s)<=8).length,
          important: x.s.capitalOf === side || x.s.tier >= 3,
        })).filter(x => x.important && x.threat >= 2 &&
          x.score > Math.max(175,first.score*0.62) &&
          (!fixed.size || dist(g,first.s,x.s)>ELIMINATOR.range*2))
        .sort((a,b) => (b.score*(1+Math.min(3,b.threat)*0.3)) -
          (a.score*(1+Math.min(3,a.threat)*0.3)) || a.s.id-b.s.id)[0];
      // A third charge remains mobile if capable commanders and a valuable
      // army group can actually use it. The threatened city exception only
      // displaces a *spare* mobile slot, never the first city anchor.
      if (threatened && (!leaders.length || threatened.threat >= 3))
        fixed.add(threatened.s.id);
    }
    return fixed;
  }
  function eliminatorAnchorCity(g, side) {
    const fixed = eliminatorStationaryCities(g, side);
    return g.stations.find(s => fixed.has(s.id)) || null;
  }
  function eliminatorCourierRoute(g, side, city, candidate, field = null) {
    if (massOf(g, candidate) < 0 || massOf(g, candidate) !== massOf(g, city)) return null;
    const straight = dist(g, candidate, city);
    if (straight > ELIMINATOR_AI.maxPickupDistance) return null;
    const route = field || goalField(g, side, [[city, 0]], 'land', null,
      ELIMINATOR_AI.maxRouteCost);
    const cost = route[candidate.r * g.cols + candidate.c];
    if (!Number.isFinite(cost)) return null;
    const speed = Math.max(1, TYPES[candidate.type]?.move || 3);
    const turns = Math.max(0, Math.ceil(Math.max(0, cost - 1) / speed));
    return turns <= ELIMINATOR_AI.pickupTurns ? { field: route, cost, turns } : null;
  }
  // Route-aware lab selection: first maximize defensible city value, then
  // prioritize laboratories a Tier 1 commander can reach in a few turns.
  function eliminatorProductionCity(g, side, anyLab = false, memo = null) {
    const mobileDesired = sideEliminators(g, side).length > 0;
    const leaders = g.units.filter(u => u.hp > 0 && u.side === side &&
      !u.eliminator && eliminatorCarrierScore(g, u) > 0 &&
      u.hp / maxHP(u) >= 0.65);
    const rivals = g.units.filter(u => u.hp > 0 && foe(g, u.side, side));
    const candidateLabs = g.stations.filter(s => s.owner === side &&
      !cityBusyReason(g, s) && !(s.eliminator > 0) &&
      (anyLab || (s.lab || 0) >= ELIMINATOR.lab));
    const ranked = candidateLabs.map(s => {
      const danger = rivals.reduce((d, u) => Math.min(d, dist(g, u, s)), 99);
      const safety = danger <= 2 ? -260 : danger <= 4 ? -110 : danger <= 7 ? -20 : 35;
      const cover = eliminatorCoverageValue(g, side, s);
      const near = leaders.filter(u => massOf(g, u) === massOf(g, s))
        .map(u => ({ u, d: dist(g,u,s) }))
        .filter(x => x.d <= ELIMINATOR_AI.maxPickupDistance)
        .sort((a,b) => a.d - b.d || a.u.id - b.u.id)[0];
      return { s, cover, safety, near,
        preview: (mobileDesired && leaders.length ? cover * 0.18 +
          (near ? 450 - near.d * 22 : -450) : cover) + safety +
          (anyLab ? (s.lab || 0) * 55 : 0) };
    }).sort((a,b) => b.preview - a.preview || a.s.id - b.s.id);
    // A bounded shortlist avoids running global Dijkstra on every laboratory.
    const precise = ranked.slice(0, 8).map(entry => {
      if (!mobileDesired || !leaders.length) return { ...entry, score: entry.preview };
      const close = leaders.filter(u => massOf(g,u) === massOf(g,entry.s) &&
        dist(g,u,entry.s) <= ELIMINATOR_AI.maxPickupDistance);
      const field = close.length ? goalField(g, side, [[entry.s,0]], 'land', null,
        ELIMINATOR_AI.maxRouteCost) : null;
      const best = field && close.map(u => {
        const route = eliminatorCourierRoute(g,side,entry.s,u,field);
        if (!route) return {u,route};
        const front = memo?.byId?.[memo.assign?.[u.id]];
        // A lab on the commander's operational path allows pickup as the
        // charge finishes, without recalling the hero from an active assault.
        const onRoute = front?.anchor ?
          Math.max(-8,Math.min(8,dist(g,u,front.anchor) -
            dist(g,entry.s,front.anchor))) : 0;
        return {u,route,onRoute};
      }).filter(x => x.route).sort((a,b) =>
        (a.route.turns*80 - (a.onRoute||0)*20) -
        (b.route.turns*80 - (b.onRoute||0)*20) ||
        b.u.hp-a.u.hp)[0];
      return { ...entry,
        score: entry.cover * 0.18 + entry.safety +
          (best ? 530 - 74 * best.route.turns + (best.onRoute||0)*25 : -450) +
          (anyLab ? (entry.s.lab || 0) * 55 : 0) };
    }).sort((a,b) => b.score - a.score || a.s.id - b.s.id);
    return precise[0]?.s || ranked[0]?.s || null;
  }
  function aiAssignEliminators(g, side) {
    if (g.mode === 'scenario') return;
    const fixed = eliminatorStationaryCities(g, side);
    for (const s of g.stations) {
      if (s.owner !== side || !(s.eliminator > 0) || fixed.has(s.id) ||
          s.eliminatorMoved === g.turn) continue;
      const carrier = g.units.filter(u => u.hp > 0 && u.side === side &&
          !u.eliminator && dist(g, u, s) <= 1)
        .map(u => [u, eliminatorCarrierScore(g, u)])
        .filter(([, score]) => score > 0)
        .sort((a,b) => b[1] - a[1] || a[0].id - b[0].id)[0]?.[0];
      if (carrier) transferEliminator(g, { city:s.id }, { unit:carrier.id });
    }
  }
  function eliminatorCourierPlan(g, side, memo) {
    if (memo.eliminatorCouriers) return memo.eliminatorCouriers;
    const old = g.ai?.[side]?.eliminatorCourierAssignments || {};
    const assignments = {};
    memo.eliminatorCouriers = assignments;
    if (g.mode === 'scenario') return assignments;
    const fixed = eliminatorStationaryCities(g,side);
    const waiting = g.stations.filter(s => s.owner === side && !fixed.has(s.id) &&
      (s.eliminator > 0 ||
        (s.eliminatorProject?.side === side &&
          s.eliminatorProject.ready <= g.turn + 2)) &&
      s.eliminatorMoved !== g.turn);
    if (!waiting.length) return assignments;
    const rivals = g.units.filter(u => u.hp > 0 && foe(g,u.side,side));
    const candidates = g.units.filter(u =>
      u.hp > 0 && u.side === side && !u.eliminator &&
      eliminatorCarrierScore(g,u) > 0 && u.hp/maxHP(u) >= 0.65 &&
      !memo.recoveries?.has(u.id) && !memo.guards?.[u.id]?.emergency &&
      !rivals.some(v => dist(g,v,u) <= 2));
    const options = [];
    for (const s of waiting) {
      const eligible = candidates.filter(u => massOf(g,u) === massOf(g,s) &&
        dist(g,u,s) <= ELIMINATOR_AI.maxPickupDistance);
      if (!eligible.length) continue;
      const field = goalField(g,side,[[s,0]],'land',null,ELIMINATOR_AI.maxRouteCost);
      for (const u of eligible) {
        const route = eliminatorCourierRoute(g,side,s,u,field);
        if (!route) continue;
        const committed = old[u.id] === s.id;
        const guardPenalty = memo.guards?.[u.id] ? 70 : 0;
        const frontRisk = rivals.some(v => dist(g, v, u) <= 4) ? 95 : 0;
        const score = 440 + (eliminatorCarrierScore(g,u)-1000)*0.2 -
          65 * route.turns - route.cost * 1.5 + (committed ? 130 : 0) -
          guardPenalty - frontRisk;
        options.push({s,u,score,field});
      }
    }
    options.sort((a,b)=>b.score-a.score || a.u.id-b.u.id || a.s.id-b.s.id);
    const takenUnits = new Set(), takenCities = new Set();
    for (const o of options) {
      if (takenUnits.has(o.u.id) || takenCities.has(o.s.id)) continue;
      takenUnits.add(o.u.id); takenCities.add(o.s.id);
      assignments[o.u.id] = {city:o.s,field:o.field};
    }
    ((g.ai ||= {})[side] ||= {}).eliminatorCourierAssignments =
      Object.fromEntries(Object.entries(assignments).map(([id,info])=>[id,info.city.id]));
    return assignments;
  }
  function aiEliminatorPickup(g,u,memo) {
    if (g.mode==='scenario' || !isReady(g,u) || u.eliminator ||
        eliminatorCarrierScore(g,u)<=0 || u.hp/maxHP(u)<0.65) return null;
    return eliminatorCourierPlan(g,u.side,memo)[u.id] || null;
  }
  // Assign a charged Tier 1 commander a *living* formation to escort, rather
  // than giving only a small city-coverage movement bonus. Select from its own
  // theater, and reconsider each turn if the formation disperses or is killed.
  function eliminatorEscortTarget(g, u, memo) {
    const cache = (memo.eliminatorEscortTargets ||= {});
    if (Object.prototype.hasOwnProperty.call(cache, u.id))
      return cache[u.id] && g.units.find(v => v.id === cache[u.id] && v.hp > 0) || null;
    const rivals = g.units.filter(v => v.hp > 0 && foe(g,v.side,u.side));
    const assignedFront = memo.assign?.[u.id];
    const anchors = g.units.filter(v => v.hp > 0 && v.side === u.side &&
      v.id !== u.id && !(v.eliminator > 0) && !isShip(v) && !atSea(g,v) &&
      dist(g,u,v) <= 14 &&
      (!assignedFront || !memo.assign?.[v.id] || memo.assign[v.id] === assignedFront));
    let best=null, bestScore=-Infinity;
    for (const v of anchors) {
      const teammates = g.units.filter(w => w.hp > 0 && w.side === u.side &&
        w.id !== u.id && dist(g,w,v) <= 3);
      const foeNear = rivals.some(f => dist(g,f,v) <= 9);
      const covered = sideEliminators(g,u.side).some(h => h.ready &&
        h.unit?.id !== u.id && dist(g,h,v) <= ELIMINATOR.range);
      const commander = COMMANDERS[v.cmd];
      const value = (commander?.storyTier === 1 ? 190 : v.cmd ? 105 : 0) +
        Math.min(210,unitStrength(v)*15) +
        teammates.length*34 + (foeNear ? 135 : 0) -
        dist(g,u,v)*19 - (covered ? 165 : 0);
      if (value > bestScore) { best=v; bestScore=value; }
    }
    cache[u.id]=best && bestScore > 0 ? best.id : null;
    return cache[u.id] == null ? null : best;
  }
  function eliminatorMobileCoverBonus(g,u,p,nearbyFoes,memo) {
    if (!(u.eliminator>0) || COMMANDERS[u.cmd]?.storyTier!==1) return 0;
    const target = eliminatorEscortTarget(g,u,memo);
    const assets = eliminatorThreatAssets(g,u.side,memo);
    const home = {c:u.c,r:u.r};
    const before = eliminatorThreatCover(g,u.side,home,assets,u);
    const after = eliminatorThreatCover(g,u.side,p,assets,u);
    const gain = Math.max(-190,Math.min(190,(after-before)*0.55));
    if (!target) return gain + Math.min(80,after*0.1);
    const previous = dist(g,home,target), next = dist(g,p,target);
    // A moving escort retains coverage during the assault, rather than
    // anchoring on a city that the whole formation has already left behind.
    // An emergency move or promising combat attack may still prevail.
    const tether = next <= ELIMINATOR.range ? 245 :
      next === ELIMINATOR.range + 1 ? 75 : -Math.min(170,(next-4)*32);
    const continuity = previous <= ELIMINATOR.range && next > ELIMINATOR.range ? -155 : 0;
    const closing = Math.max(-65,Math.min(65,(previous-next)*22));
    return gain + Math.min(80,after*0.1) + tether + continuity + closing;
  }
  function aiEliminatorMetrics(g, side) {
    const charges = sideEliminators(g, side);
    const cities = g.stations.filter(s => s.owner === side);
    const covered = cities.filter(s => charges.some(h => h.ready && dist(g, h, s) <= ELIMINATOR.range));
    return {
      building: charges.filter(h => !h.ready).length,
      stationary: charges.filter(h => !!h.city && h.ready).length,
      carried: charges.filter(h => !!h.unit).length,
      coveredCities: covered.length,
      totalCities: cities.length,
      weightedCoverage: covered.reduce((n, s) => n + eliminatorCityValue(g, side, s), 0),
      importantCitiesCovered: covered.filter(s => s.capitalOf === side || s.tier >= 3).length,
      importantCitiesTotal: cities.filter(s => s.capitalOf === side || s.tier >= 3).length,
      // Exposure-weighted force protection helps distinguish idle charges from
      // charges riding with a combat formation.
      threatenedUnitValue: eliminatorThreatAssets(g,side)
        .filter(a => a.kind === 'unit').reduce((n,a) => n + a.value, 0),
      protectedUnitValue: eliminatorThreatAssets(g,side)
        .filter(a => a.kind === 'unit' && charges.some(h =>
          h.ready && dist(g,h,a.p) <= ELIMINATOR.range))
        .reduce((n,a) => n + a.value, 0),
      tier1Carriers: charges.filter(h => h.unit &&
        COMMANDERS[h.unit.cmd]?.storyTier === 1).length,
    };
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
      eliteCampaign = g.mode === 'campaign' && g.difficulty === 'elite',
      eliteAI = eliteCampaign || eliteAIProduction(g),
      builds = g.mode !== 'campaign' || !!g.campaign?.production?.includes(side) ||
        (eliteCampaign && foe(g, side, g.player));
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
    // 0b. F.L.E.I.J.A.: one ready warhead maximum; rival Eliminator sites are unknown.
    g.launches = [];
    if (g.mode !== 'scenario' && (g.arsenal?.[side] || 0) > 0 && !g.over) {
      const p = aiLaunchTarget(g, side),
        shot = p && launch(g, side, p.c, p.r);
      if (shot?.ok) g.launches.push(shot);
    }
    // 1. Repair badly damaged units resting at a friendly city (this spends their turn).
    for (const u of (g.mode === 'scenario' ? [] : own())
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
    // 2a. Protect one high-value city cluster with a stationary charge; give other charges
    // only to nearby Tier 1 commanders, or send an available hero to fetch them.
    aiAssignEliminators(g, side);
    // 2b. Evaluate labs by newly protected economic/capital value, safe access, and Tier 1
    // collection routes rather than indiscriminately manufacturing at an isolated lab.
    const wantsDefense = () => g.mode !== 'scenario' && eliminatorUnlocked(g) && sideEliminators(g, side).length < ELIMINATOR.max;
    let defenseCity = null;
    while (wantsDefense() && (defenseCity = eliminatorProductionCity(g, side, false, memo)) && !eliminatorReason(g, defenseCity)) {
      startEliminator(g, defenseCity.id);
      defenseCity = null;
    }
    plan.eliminator = !!defenseCity;
    const defensePrep = wantsDefense() && !defenseCity ? eliminatorProductionCity(g, side, true, memo) : null;
    // 2c. F.L.E.I.J.A.: one warhead per strategic pool (shared by the 2018 Britannian allies). The human
    // Britannian partner has first claim when it can afford a project. A power with the
    // Sakuradite for it (or the income to gather it soon) keeps that Sakuradite back, then saves credits and industry
    // and starts the project in its best-lab city.
    const warCity =
      g.mode !== 'scenario' && !plan.eliminator &&
      hasFleija(g, side) &&
      fleijaWarheadCount(g, side) < FLEIJA.max &&
      !fleijaPlayerPriority(g, side)
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
    const reserve = eliteCampaign ? 0 : defenseSaving
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
      // Rivals can prepare Labs I-II early, but Lab III obeys the current conquest's gate.
      // A city that needs a lab for its next Eliminator comes first.
      const unlockTurn = fleijaLabTurn(g),
        soon = g.turn >= unlockTurn - 5,
        prep =
          side !== g.player && isMajor(g, side) ? defensePrep || (soon ? fleijaCity(g, side, front) : null) : null;
      if (
        prep &&
        (prep.lab || 0) < FLEIJA.lab &&
        ((prep.lab || 0) < FLEIJA.lab - 1 || g.turn >= unlockTurn)
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
        .flatMap(s => (g.mode === 'scenario' ? ['factory'] : ['factory', 'lab'])
          .map(kind => ({ s, kind, level: buildingLevel(s, kind) })))
        .filter(o => o.level < 3 && !(o.kind === 'lab' && o.level === 2 && g.turn < unlockTurn))
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
    const yardFront = new Map(),
      // Factories must reinforce a front they can actually reach. Deficits use
      // near-term arrivals rather than distant assigned troops that will not
      // defend the city in the next few turns.
      factoryETA = (s, f) => {
        const target = f.rally || f.anchor;
        if (!target || massOf(g, s) < 0 || massOf(g, s) !== massOf(g, target))
          return Infinity;
        return Math.ceil(dist(g, s, target) / 4);
      },
      // Japan Scenario: reinforcements march toward an active, understrength attack along
      // real terrain and naval routes instead of a generic nearest enemy or a rear-area defense.
      // A capture-capable unit standing at the factory estimates the real land or sea route,
      // so island factories can reinforce overseas columns.
      scenarioServes = s => {
        const needing = memo.fronts.filter(f => f.assigned < f.desiredStrength);
        const choices = needing.length ? needing : memo.fronts;
        const sample = allUnits(g).find(u => u.side === side && u.hp > 0 && canCapture(u) && !isShip(u)),
          proxy = sample && { ...sample, id: 'factory:' + s.id, c: s.c, r: s.r },
          route = f => scenarioTravel(g, proxy || s, f);
        return choices.slice().sort((a, b) => route(a) - route(b) || a.anchor.id - b.anchor.id)[0];
      },
      scenarioUrgency = s => {
        const f = scenarioServes(s);
        if (!f) return 0;
        const shortage = Math.max(0, f.desiredStrength - f.assigned);
        return shortage * 3 - Math.min(20, scenarioRouteField(g, f)[s.r * g.cols + s.c] / 4);
      },
      serves = s => {
        if (g.mode === 'scenario') return scenarioServes(s);
        if (!yardFront.has(s.id)) {
          const chosen = (memo.fronts || [])
            .map(f => ({ f, eta: factoryETA(s, f),
              gap: Math.max(0, f.desiredStrength - (f.arrivingFour || 0)) }))
            .filter(x => x.eta <= 5 && x.gap > 0)
            .sort((a, b) =>
              b.gap * (1 + (b.f.type === 'defensive' ? 0.8 : 0.1)) /
                (1 + b.eta * 0.4) -
              a.gap * (1 + (a.f.type === 'defensive' ? 0.8 : 0.1)) /
                (1 + a.eta * 0.4) || a.eta - b.eta)[0];
          yardFront.set(s.id, chosen || null);
        }
        return yardFront.get(s.id)?.f || null;
      },
      urgency = s => {
        if (g.mode === 'scenario') return scenarioUrgency(s);
        const chosen = yardFront.get(s.id);
        const f = serves(s);
        const eta = chosen?.eta ?? factoryETA(s, f || { anchor: s });
        const nearbyThreat = foes.some(u => dist(g, u, s) <= aiRange(g).threat) ? 8 : 0;
        return nearbyThreat + (f
          ? Math.max(0, f.desiredStrength - (f.arrivingFour || 0)) *
              (0.5 + Math.max(0, f.score) / 100) / (1 + eta * 0.35)
          : 0);
      },
      yards = bases.slice().sort((a, b) => urgency(b) - urgency(a) || a.id - b.id);
    // 4b. Navy: fleet and port construction scale with coastal exposure, enemy naval
    // threats and overseas fronts rather than arbitrary per-faction ship/port caps.
    // Spending on the fleet must still leave a normal two-frame Scout formation
    // affordable, so coastal construction cannot starve the field army.
    const navy = g.mode !== 'campaign' && (g.mode === 'conquest' && g.era === 'ufn2018' && side === 'cf' ? NAVAL.bk : NAVAL[side]);
    if (navy) {
      const coastal = [
          ...bases.filter(s => portSite(g, s)),
          // Captured shipyards remain available while their cities are still enemy-held.
          ...g.stations.filter(s => s.owner !== side && s.portAt && s.portLevel && (s.portOwner || s.owner) === side),
        ],
        availableFleet = own().filter(u => !!TYPES[u.type].naval),
        navalThreats = foes.filter(u => TYPES[u.type].naval &&
          coastal.some(s => dist(g, s, u) <= aiRange(g).enemyScan)),
        invasions = (memo.fronts || []).filter(f => f.overseas && f.type === 'offensive' &&
          (g.mode !== 'scenario' || f.assigned > 0)),
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
        ownedPorts = () => coastal.filter(s => s.portLevel && (s.portOwner || s.owner) === side),
        fleetCount = (...roles) => availableFleet.filter(u => eliteScenario(g)
          ? roles.some(r => r === 'carrier' ? TYPES[u.type].naval === 'ship' : TYPES[u.type].naval === 'amphibious')
          : roles.some(r => u.type === navy[r])).length;

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
          if (eliteScenario(g) && role !== 'carrier') {
            const id = Object.keys(ELITE_FORCES).find(k => {
              const e = ELITE_FORCES[k], t = TYPES[e.type];
              return eliteEligible(g, side, k) &&
                (role === 'carrier' ? t.naval === 'ship' : t.naval === 'amphibious');
            });
            if (!id) continue;
            const cost = elitePrice(id, 1);
            if (navyAffordable(cost) && !aiEliteRecruitReason(g, port, id) &&
                recruitAIElite(g, port.id, id).ok) {
              availableFleet.push(g.units[g.units.length - 1]);
              break;
            }
          } else {
            const type = navy[role], cost = price(type, 1, g, side);
            if (navyAffordable(cost) && canBuy(g, port, type, 1) && recruit(g, port.id, type, 1).ok) {
              availableFleet.push(g.units[g.units.length - 1]);
              break;
            }
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
      if (eliteAI) {
        const theater = serves(s),
          needed = theater?.need || [],
          anchor = theater?.rally || theater?.anchor || s,
          enemy = (theater?.enemies?.length ? theater.enemies : foes.filter(u => dist(g, u, s) <= 9))
            .filter(u => !TYPES[u.type].naval),
          ally = own().filter(u => !TYPES[u.type].naval && dist(g, u, anchor) <= 10),
          branchCount = branch => ally.filter(u => TYPES[u.type].branch === branch).length,
          enemyCount = branch => enemy.filter(u => TYPES[u.type].branch === branch).length,
          attacked = enemy.some(u => dist(g, u, s) <= 3),
          defensive = attacked || theater?.type === 'defensive',
          fortified = theater?.type === 'offensive' && (theater.objectives || []).some(o => o.fortified);
        // Prefer classes requested by an actual front. Adjust for missing
        // artillery/infantry/armor, enemy threats and fortified objectives.
        // The small per-factory tie break prevents identical spam from every city.
        const score = id => {
          const t = TYPES[ELITE_FORCES[id].type],
            rank = needed.indexOf(t.cls),
            total = Math.max(1, ally.length),
            desired = t.branch === 'Armor' ? 0.50 : t.branch === 'Artillery' ? 0.25 : 0.25,
            scarcity = desired - branchCount(t.branch) / total;
          let value = (rank < 0 ? 0 : 36 - rank * 4) + scarcity * 28;
          if (fortified && t.branch === 'Artillery') value += 25;
          if (fortified && t.cls === 'super') value += 11;
          if (defensive && t.branch === 'Armor') value += 9;
          if (defensive && t.branch === 'Infantry') value += 5;
          if (enemyCount('Armor') > enemyCount('Infantry') && t.cls === 'super') value += 12;
          if (enemyCount('Infantry') > enemyCount('Armor') && t.branch === 'Artillery') value += 12;
          if (enemyCount('Artillery') && (t.cls === 'raider' || t.cls === 'assault')) value += 10;
          if (!theater && !attacked && t.branch === 'Infantry') value += 4;
          // Never ignore a front's demand, but avoid filling an entire theater
          // with the first highly rated unit. Recent builds count, not the
          // diverse historical starting army; revisit demand after each build.
          const alreadyBuilt = own().filter(u => u.elite === id && !u.eliteStart).length;
          value -= Math.min(42, alreadyBuilt * 10);
          if (s.tier >= 3 && t.tier >= 3) value += 12;
          // Premium frames against active threats; lighter forces for quiet fronts.
          if (enemy.length || fortified) value += t.tier * 2;
          const hash = [...id].reduce((v, ch) => v + ch.charCodeAt(0), 0);
          return value + ((s.id * 13 + g.turn * 7 + hash) % 13) / 6;
        };
        return (eliteCampaign ? g.campaign?.eliteRosters?.[side] || [] : Object.keys(ELITE_FORCES))
          .filter(id => (eliteCampaign || eliteEligible(g, side, id)) &&
            !TYPES[ELITE_FORCES[id].type].naval &&
            TYPES[ELITE_FORCES[id].type].tier <= s.tier)
          .sort((a, b) => score(b) - score(a) || a.localeCompare(b));
      }
      // Tier-1 frames (no Sakuradite) follow as fallbacks when Sakuradite runs short.
      const classes =
          s.tier >= 3
            ? ['heavy', 'siege', 'medium', 'rocket', 'light', 'assault', 'support', 'scout']
            : s.tier === 2
              ? ['medium', 'rocket', 'raider', 'light', 'support', 'assault', 'scout']
              : ['light', 'support', 'assault', 'scout'],
        need = (serves(s)?.need || []).filter(c => classes.includes(c)),
        menu = [...need, ...classes.filter(c => !need.includes(c))].map(cls => typeFor(side, cls, g)),
        // Scenario factories obey the assault column's requested unit mix.
        // Other modes retain their existing randomized menu preference.
        preferred = g.mode === 'scenario' && need.length ? menu[0] :
          menu[Math.floor(random(g) * Math.min(menu.length, 3))];
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
      if (eliteAI) {
        for (const id of menu) {
          const cost = elitePrice(id, eliteCampaign ? 3 : 1);
          if (!affordable(cost) || aiEliteRecruitReason(g, s, id, spot ? vacating : null)) continue;
          if (vacating) {
            if (!spot) continue;
            const m = move(g, vacating.id, spot.c, spot.r);
            if (!m.ok) continue;
            g.vacated.push({ id: vacating.id, orders: [{ kind: 'move', ...m, id: vacating.id }] });
          }
          if (recruitAIElite(g, s.id, id).ok) return true;
        }
        return false;
      }
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
    if (eliteAI) {
      // Re-evaluate after each successful purchase: elite role shortages and
      // production diversity change as new units join the theater.
      for (const s of yards) tryBuild(s, menuOf(s), [1]);
    } else {
      const menus = new Map(yards.map(s => [s, menuOf(s)]));
      for (const s of yards) tryBuild(s, menus.get(s), [3, 2]);
      // Only factories that have not produced this turn get the single-frame
      // fallback. Respect the same affordability and reserve checks as above.
      for (const s of yards)
        if (s.producedTurn !== g.turn) tryBuild(s, menus.get(s), [1]);
    }
  }

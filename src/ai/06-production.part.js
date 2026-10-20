  // Commanders (by rank) first, then Elite Forces; ordinary formations never take a charge from the AI.
  function eliminatorCarrierScore(g, u) {
    return u.cmd ? 1000 + 50 * (E.officerOf(g, u)?.rank || 0) + unitStrength(u) : u.elite ? 500 + unitStrength(u) : 0;
  }
  function aiAssignEliminators(g, side) {
    if (g.mode === 'scenario') return;
    for (const s of g.stations) {
      if (s.owner !== side || !((s.eliminator || 0) > 0)) continue;
      const carrier = g.units
        .filter(u => u.hp > 0 && u.side === side && !((u.eliminator || 0) > 0) && dist(g, u, s) <= 1)
        .map(u => [u, eliminatorCarrierScore(g, u)])
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1] || a[0].id - b[0].id)[0]?.[0];
      if (carrier) transferEliminator(g, { city: s.id }, { unit: carrier.id });
    }
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
      eliteAI = eliteCampaign || eliteAIProduction(g);
    // Story Mode production follows the same ordinary resource and factory
    // checks as other game modes. There is no per-mission AI opt-in.
    // Ensure new regional games finish one-time treasury initialization before
    // the AI examines budgets (including the doubled starting Research).
    const scienceIncome = income(g, side).science;
    if (plan.researchShortageTurn !== g.turn - 1) plan.researchShortageTurns = 0;
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
    for (const u of (g.mode === 'scenario' && !['division','europe'].includes(memo.doctrine) &&
      !scenarioMeta(g).ai?.recovery ? [] : own())
      .filter(u => u.hp / maxHP(u) < (memo.recoveries?.has(u.id) ? 0.7 : 0.55) && nearFriendlyCity(g, u) && !atSea(g, u))
      .sort((a, b) => a.hp / maxHP(a) - b.hp / maxHP(b))) {
      if (e.credits - repairCost(u, g) >= 60) repair(g, u.id);
    }
    g.vacated = [];
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
    // 2a. Eliminator carriers: a charge waiting in a city goes to the most important commander or Elite Force in or
    // next to it, so the charge travels with the army it protects. With none there it stays in the city.
    aiAssignEliminators(g, side);
    // 2b. F.L.E.I.J.A. Eliminator: the moment countermeasures are available, rivals build them before anything else,
    // starting every charge they can afford (up to ELIMINATOR.max) and saving for the next one. With no free lab-3
    // city outside their charges' cover, step 3 raises a lab for one (defensePrep).
    const wantsDefense = () => g.mode !== 'scenario' && eliminatorUnlocked(g) && sideEliminators(g, side).length < ELIMINATOR.max;
    let defenseCity = null;
    while (wantsDefense() && (defenseCity = eliminatorCity(g, side)) && !eliminatorReason(g, defenseCity)) {
      startEliminator(g, defenseCity.id);
      defenseCity = null;
    }
    plan.eliminator = !!defenseCity;
    const defensePrep = wantsDefense() && !defenseCity ? eliminatorCity(g, side, true) : null;
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
    // Airships (Conquest only): every power starts with one, so in practice this only replaces a
    // lost airship. From turn 10, a power with 20+ cities and a level-3 factory saves for one when
    // no strategic weapon is being funded. The rules set no cap for players; the AI keeps at most
    // AI_AIRSHIP_LIMIT alive. Provisional: see HANDOFF.md, "Airships". Orders: aiAirship.
    const AI_AIRSHIP_LIMIT = 1;
    const airship = g.mode === 'conquest' && !eliteAI && g.turn >= 10 && airshipType(g, side),
      airshipCost = airship && price(airship, 1, g, side),
      airshipSaving = !!airship && !defenseSaving && !warSaving && yard3.length > 0 &&
        bases.length >= 20 && own().filter(u => TYPES[u.type].air).length < AI_AIRSHIP_LIMIT;
    // Reserve strategic-weapon funds as before; super-heavies no longer hoard resources.
    const reserve = eliteCampaign ? 0 : defenseSaving
      ? Math.min(e.credits, ELIMINATOR.cost.credits)
      : warSaving ? Math.min(e.credits, FLEIJA.cost.credits)
      : airshipSaving ? Math.min(e.credits, airshipCost.credits) : 60;
    const reserveInd = defenseSaving
      ? Math.min(e.industry, ELIMINATOR.cost.industry)
      : warSaving ? Math.min(e.industry, FLEIJA.cost.industry) : 0;
    const reserveSak = plan.eliminator
      ? ELIMINATOR.cost.sakuradite
      : plan.warhead ? FLEIJA.cost.sakuradite : 0;
    // Protect Research for an imminent strategic project, but do not hoard it
    // from the start of the war at the expense of useful armored production.
    const reserveScience = defenseSaving && e.science >= ELIMINATOR.cost.science * 0.8
      ? ELIMINATOR.cost.science
      : warSaving && e.science >= FLEIJA.cost.science * 0.8
        ? FLEIJA.cost.science : 0;
    const spendable = () => Math.max(0, e.credits - reserve);
    // Sakuradite held back for a project only blocks purchases that spend Sakuradite.
    const affordable = c =>
      c.credits <= spendable() &&
      e.industry - (c.industry || 0) >= reserveInd &&
      (e.science || 0) - (c.science || 0) >= reserveScience &&
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
    // City development: spend surplus on economic growth in safe cities or
    // fortress batteries on defensible approaches, reserving frontline unit funds.
    if (g.turn >= 2) {
      const candidates = bases
        .filter(s => !cityTierReason(g, s) && s.shield >= s.maxShield * 0.5)
        .map(s => {
          const d = front(s), tier = cityTierOf(s);
          const fortress = tier === 3 && d >= 3 && d <= 7;
          const economic = tier < 3 && d >= 5;
          return { s, d, useful: fortress || economic,
            score: (fortress ? 120 : economic ? 60 : 0) + (s.capital ? 15 : 0) +
              (s.portLevel ? 8 : 0) + (d <= 7 ? 12 - d : 0) - 3 * (tier - 1) };
        })
        .filter(v => v.useful)
        .sort((a, b) => b.score - a.score || a.s.id - b.s.id);
      const limit = Math.min(3, Math.max(1, Math.ceil(bases.length / 25)));
      let built = 0;
      for (const { s, d } of candidates) {
        if (built >= limit) break;
        if (d <= 2 || (d < 5 && s.shield < s.maxShield * 0.75)) continue;
        const cost = decreePrice(cityTierCost(s), s);
        if (developmentAffordable(cost) && upgradeCityTier(g, s.id).ok) built++;
      }
    }
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
      const researchScarce = (plan.researchShortageTurns || 0) >= 2;
      const options = bases
        .flatMap(s => (g.mode === 'scenario' && !researchScarce ? ['factory'] : ['factory', 'lab'])
          .map(kind => ({ s, kind, level: buildingLevel(s, kind) })))
        .filter(o => o.level < 3 && !(o.kind === 'lab' && o.level === 2 && g.turn < unlockTurn))
         .sort((a, b) => (researchScarce ? Number(b.kind === 'lab') - Number(a.kind === 'lab') : 0) ||
          a.level - b.level || front(b.s) - front(a.s) || random(g) - 0.5);
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
            !cityBusyReason(g, stationAt(g, u))),
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
      factoryETA = (s, f) => f && frontArrival(g,s,f),
      // Japan Scenario: reinforcements march toward an active, understrength attack along
      // real terrain and naval routes instead of a generic nearest enemy or a rear-area defense.
      // A capture-capable unit standing at the factory estimates the real land or sea route,
      // so island factories can reinforce overseas columns.
      scenarioServes = s => {
        const needing = memo.fronts.filter(f => (f.deficit ??
          Math.max(0,f.desiredStrength-f.assigned)) > 0);
        const choices = needing.length ? needing : memo.fronts;
        const sample = allUnits(g).find(u => u.side === side && u.hp > 0 && canCapture(u) && !isShip(u)),
          proxy = sample && { ...sample, id: 'factory:' + s.id, c: s.c, r: s.r },
          route = f => scenarioTravel(g, proxy || s, f);
        const connected = choices.filter(f => Number.isFinite(route(f))),
          reachable = connected.filter(f => !f.dynamicDefense || route(f) <= 5);
        const choice = (reachable.length ? reachable : connected).slice().sort((a,b) => {
          const score = f => (f.deficit??Math.max(0,f.desiredStrength-f.assigned))*
            (f.dynamicDefense ?
              (SCENARIO_DEFENSE.leanProduction ? 2.25 : 3.5) : 2) /
              (1+route(f)) + (f.state==='regrouping'?2:0);
          return score(b)-score(a)||route(a)-route(b)||a.anchor.id-b.anchor.id;
        })[0] || null;
        if (g.aiDefenseTrace) {
          const trace = g.aiDefenseTrace[side]?.at(-1);
          if (trace?.turn === g.turn)
            (trace.factorySelections ||= {})[s.id] = !!choice?.dynamicDefense;
        }
        return choice;
      },
      scenarioUrgency = s => {
        const f = scenarioServes(s);
        if (!f) return 0;
        const shortage = f.deficit ?? Math.max(0,f.desiredStrength-f.assigned);
        const travel = frontArrival(g,s,f);
        return shortage*3/(1+Math.min(10,travel)/3) +
          (f.dynamicDefense && travel <= (SCENARIO_DEFENSE.leanProduction?3:5) ?
            (SCENARIO_DEFENSE.leanProduction ?
              (f.defenseSeverity==='critical'?4:2) :
              (f.defenseSeverity==='critical'?8:5)) : 0) +
          (f.state==='regrouping'?2:0);
      },
      serves = s => {
        if (g.mode === 'scenario') return scenarioServes(s);
        if (!yardFront.has(s.id)) {
          const chosen = (memo.fronts || [])
            .map(f => ({ f, eta: factoryETA(s, f),
              gap: f.deficit ?? Math.max(0, f.desiredStrength - (f.arrivingFour || 0)) }))
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
          ? (f.deficit ?? Math.max(0, f.desiredStrength - (f.arrivingFour || 0))) *
              (0.5 + Math.max(0, f.score) / 100) / (1 + eta * 0.35)
          : 0);
      },
      yards = bases.slice().sort((a, b) => urgency(b) - urgency(a) || a.id - b.id);
    // 4b. Navy: fleet and port construction scale with coastal exposure, enemy naval
    // threats and overseas fronts rather than arbitrary per-faction ship/port caps.
    // Spending on the fleet must still leave a normal two-frame Scout formation
    // affordable, so coastal construction cannot starve the field army.
    const navy = g.mode !== 'campaign' && !philippinesDefense(g, side) &&
      navalRoster(g, side);
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
          ? roles.some(r => r === 'carrier' ? TYPES[u.type].naval === 'ship' && !TYPES[u.type].air : TYPES[u.type].naval === 'amphibious')
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
    // 4c. Airships: spend the savings once they cover the whole price, keeping Sakuradite
    // for a heavy frame. The rearmost free level-3 factory builds it.
    if (airshipSaving && e.credits >= airshipCost.credits + 60 &&
        e.industry - airshipCost.industry >= ordinaryBudget.industry &&
        (e.science || 0) - airshipCost.science >= reserveScience &&
        (e.sakuradite || 0) - airshipCost.sakuradite >= reserveSak + heavySak) {
      const yard = yard3.slice().reverse().find(s => canBuy(g, s, airship, 1));
      if (yard) recruit(g, yard.id, airship, 1);
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
            ? ['heavy', 'siege', 'medium', 'rocket', ...(g.mode === 'scenario' ? ['raider'] : []), 'light', 'assault', 'support', 'scout']
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
    // Remember research-only bottlenecks, once per turn. When a priority
    // advanced unit is one income payment away, do not replace it with a
    // basic unit unless the factory is defending against a nearby threat.
    const markResearchShortage = () => {
      if (plan.researchShortageTurn === g.turn) return;
      plan.researchShortageTurn = g.turn;
      plan.researchShortageTurns = (plan.researchShortageTurns || 0) + 1;
    };
    const researchOnlyShortage = c => (c.science || 0) > (e.science || 0) &&
      c.credits <= spendable() && c.industry <= e.industry - reserveInd &&
      (c.sakuradite || 0) <= (e.sakuradite || 0) - reserveSak;
    // The frame the front asks for comes first, in the largest formation affordable, then the next frame on the menu.
    const recordBuild = (s) => {
      if (!g.aiDefenseTrace) return;
      const trace = g.aiDefenseTrace[side]?.at(-1);
      if (trace?.turn !== g.turn) return;
      const f = serves(s);
      if (f?.dynamicDefense) trace.defensiveBuilds = (trace.defensiveBuilds || 0) + 1;
      else trace.offensiveBuilds = (trace.offensiveBuilds || 0) + 1;
    };
    const tryBuild = (s, menu, sizes) => {
      const defender = unitAt(g, s),
        vacating = defender?.side === side && isReady(g, defender) && !defender.moved && front(s) <= 2 ? defender : null,
        reach = vacating && reachable(g, vacating),
        spot = reach && adjacent(g, s)
          .filter(p => reach.has(key(p)) && !isSea(p) && !stationAt(g, p) && !unitAt(g, p))
          .sort((a, b) => (TERRAIN[b.terrain]?.cover || 0) - (TERRAIN[a.terrain]?.cover || 0) || a.r - b.r || a.c - b.c)[0];
      const preferred = menu[0];
      const desired = preferred && (eliteAI ? elitePrice(preferred) :
        price(preferred, sizes[sizes.length - 1], g, side));
      if (desired && researchOnlyShortage(desired)) {
        markResearchShortage();
        if (front(s) > 3 && (e.science || 0) + Math.max(0, scienceIncome) >= desired.science)
          return false; // Wait at most one turn for the priority formation.
      }
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
          if (recruitAIElite(g, s.id, id).ok) {
            recordBuild(s);
            return true;
          }
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
          if (recruit(g, s.id, type, n).ok) {
            recordBuild(s);
            return true;
          }
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
      // A vacated factory can try again, but its newly produced unit must
      // first leave the city hex; all regular costs and checks still apply.
      for (const s of yards) tryBuild(s, menus.get(s), [1]);
    }
  }

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

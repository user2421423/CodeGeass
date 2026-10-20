  // ======== F.L.E.I.J.A.: the Sakuradite superweapon ========
  // The high-resolution world uses roughly 200 km hexes. A warhead reaches two rings: the first is catastrophic,
  // while the second is a weaker blast fringe. Campaign maps can still pass an explicit radius to blastArea().
  // Six World Campaign finales share their regional battles with Scenario Mode.
  // Outside these battles the long-standing scenario superweapon ban remains.
  const FINALE_SCENARIO_IDS = new Set([
    'eu-pendragon', 'cf-pendragon', 'battle-luoyang',
    'eu-cf-luoyang', 'cf-eu-france', 'operation-stonehenge'
  ]);
  function finaleScenario(g) {
    return g?.mode === 'scenario' && FINALE_SCENARIO_IDS.has(g.scenario?.id);
  }
  const FLEIJA = {
    radius: 2,
    cost: { credits: 1800, industry: 450, science: 300, sakuradite: 150 },
    turns: 4, // construction time
    max: 1, // combined stored and unfinished warheads; shared by Britannia and Euro Britannia in 2018
    lab: 3, // research lab level needed
    labTurn: 15, // 2017 World War: Research Lab III and F.L.E.I.J.A. unlock
    ufnLabTurn: 5, // 2018 Rise of the U.F.N.: earlier strategic-weapons unlock
    ringHP: 0.1, // first ring: units are left with 10% of their frame
    outerHP: 0.55, // second ring: units are left with at most 55%
    outerShield: 0.35, // second-ring cities retain at most 35% of their defenses
    aiThreshold: 1500, // the least target value a rival will spend a warhead on
  };
  const ELIMINATOR = {
    range: 3, // defense radius measured from the unit carrying the charge, or the city where it waits for one
    cost: { credits: 1200, industry: 300, science: 250, sakuradite: 60 },
    turns: 2,
    lab: 3,
    research: 2, // turns after the first detonation before Eliminators can be built
    max: 3, // charges a power may hold at once (building, waiting in a city or carried), one per city or unit
  };
  // The turn Eliminator research completes (g.fleijaDetonated is the turn of the first detonation), or null.
  function eliminatorTurn(g) {
    if (g.mode === 'scenario') return null; // All regional scenarios keep every city capturable.
    const first = g.fleijaDetonated;
    if (typeof first === 'number') return first + ELIMINATOR.research;
    if (first || (g.log || []).some(l => String(l.text || '').startsWith('F.L.E.I.J.A. detonation'))) return 0;
    return null;
  }
  function eliminatorUnlocked(g) {
    const at = eliminatorTurn(g);
    return at != null && g.turn >= at;
  }
  // Every Eliminator charge in play, positioned for dist(): one building or waiting in a city, or one carried by a
  // unit (aboard a Carrier-Battleship it covers from the ship). `ready` charges can intercept; a project completing
  // this turn already can, before its owner's phase begins.
  function eliminatorCharges(g, side = null) {
    const out = [];
    for (const s of g.stations) {
      if (side && s.owner !== side) continue;
      if ((s.eliminator || 0) > 0) out.push({ c: s.c, r: s.r, owner: s.owner, city: s, ready: true });
      else if (s.eliminatorProject?.side === s.owner)
        out.push({ c: s.c, r: s.r, owner: s.owner, city: s, ready: s.eliminatorProject.ready <= g.turn });
    }
    for (const v of g.units)
      if (v.hp > 0 && (!side || v.side === side))
        for (const u of [v, ...(v.cargo || [])])
          if (u.hp > 0 && (u.eliminator || 0) > 0) out.push({ c: v.c, r: v.r, owner: v.side, unit: u, ready: true });
    return out;
  }
  // A power's Eliminator charges: building, waiting in a city or carried.
  function sideEliminators(g, side) {
    return eliminatorCharges(g, side);
  }
  // How the owner's UI names whoever holds a charge.
  function eliminatorHolderName(holder) {
    if (!holder) return '';
    if (holder.city) return holder.city.name;
    const u = holder.unit;
    return u.cmd ? `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short}'s ${TYPES[u.type].short}` : TYPES[u.type].short;
  }
  // A ready charge changes hands between a city and a unit in or next to it, or between two adjacent units. It is
  // free, but each charge moves once a turn, so it cannot relay down a line of units. `from`/`to` are
  // { city: id } or { unit: id }; units aboard a Carrier-Battleship cannot take part.
  function eliminatorHolder(g, ref) {
    if (ref?.city != null) return g.stations.find(s => s.id === ref.city) || null;
    if (ref?.unit != null) return g.units.find(u => u.id === ref.unit && u.hp > 0) || null;
    return null;
  }
  function transferEliminatorReason(g, from, to) {
    const a = eliminatorHolder(g, from),
      b = eliminatorHolder(g, to);
    if (g.mode === 'scenario') return 'F.L.E.I.J.A. Eliminators are unavailable in regional scenarios';
    if (g.over) return 'Operation over';
    if (!a || !b || a === b) return 'Unavailable';
    const side = from.city != null ? a.owner : a.side,
      other = to.city != null ? b.owner : b.side;
    if (from.city != null && to.city != null) return 'A charge moves between a city and a unit, or between units';
    if (side !== g.phase) return 'Not your turn';
    if (other !== side) return 'Only your own units and cities can hold your charges';
    if (!((a.eliminator || 0) > 0)) return 'No Eliminator charge to hand over';
    if ((b.eliminator || 0) > 0) return `${to.city != null ? 'That city' : 'That unit'} already holds an Eliminator charge`;
    if (to.city != null && b.eliminatorProject) return 'That city is building an Eliminator charge';
    if (a.eliminatorMoved === g.turn) return 'This charge has already changed hands this turn';
    if (dist(g, a, b) > 1) return 'Must be in the same or an adjacent hex';
    return null;
  }
  function transferEliminator(g, from, to) {
    const why = transferEliminatorReason(g, from, to);
    if (why) return { ok: false, reason: why };
    const a = eliminatorHolder(g, from),
      b = eliminatorHolder(g, to);
    a.eliminator = 0;
    delete a.eliminatorMoved;
    b.eliminator = 1;
    b.eliminatorMoved = g.turn;
    return { ok: true, holder: eliminatorHolderName(to.city != null ? { city: b } : { unit: b }) };
  }
  // A carrier that is destroyed takes its charge with it.
  function dropCarriedEliminator(g, v, why) {
    if (!((v?.eliminator || 0) > 0)) return;
    v.eliminator = 0;
    log(g, `A F.L.E.I.J.A. Eliminator charge is lost${why ? ' (' + why + ')' : ''}.`, v.side);
  }
  // F.L.E.I.J.A. is conquest-only. All major powers share their conquest's Lab III gate.
  function fleijaLabTurn(g) {
    return g.mode === 'conquest' && g.era === 'ufn2018' ? FLEIJA.ufnLabTurn : FLEIJA.labTurn;
  }
  function hasFleija(g, side) {
    return g.mode === 'conquest' && isMajor(g, side) && g.turn >= fleijaLabTurn(g);
  }
  // The 2018 Britannian allies share one strategic arsenal slot, but never
  // share funds, project ownership, a warhead's launch control, or unit orders.
  function fleijaPoolSides(g, side) {
    return g.mode === 'conquest' && g.era === 'ufn2018' &&
      (side === 'britannia' || side === 'eb') &&
      g.teams?.britannia && g.teams.britannia === g.teams.eb
      ? ['britannia', 'eb'] : [side];
  }
  function fleijaWarheadCount(g, side) {
    const members = fleijaPoolSides(g, side);
    return members.reduce((n, member) => n + (g.arsenal?.[member] || 0), 0) +
      g.stations.filter(s => members.includes(s.project?.side)).length;
  }
  // If a Britannian player has a funded, idle level-III lab, the AI ally must
  // not claim the newly free shared slot first (including after an AI launch).
  // The AI may use the slot if the player is unable to begin a project.
  function fleijaPlayerPriority(g, side) {
    if (side === g.player || !fleijaPoolSides(g, side).includes(g.player) ||
        !hasFleija(g, g.player) || g.over) return false;
    return g.stations.some(s => s.owner === g.player && !cityBusyReason(g, s) &&
      s.expSupplyBlocked?.owner !== g.player && (s.lab || 0) >= FLEIJA.lab && !shortfall(funds(g, g.player), FLEIJA.cost));
  }
  function cityBusyReason(g, s) {
    return s.project
      ? 'F.L.E.I.J.A. project under way'
      : s.eliminatorProject
        ? 'F.L.E.I.J.A. Eliminator project under way'
        : null;
  }
  function projectReason(g, s) {
    if (!s) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (!hasFleija(g, s.owner) ? (g.mode !== 'conquest'
        ? 'F.L.E.I.J.A. is unavailable outside conquests'
        : `Research lab level 3 unlocks on turn ${fleijaLabTurn(g)}`) : null) ||
      (s.expSupplyBlocked?.owner === s.owner ? 'City supply lines are disrupted' : null) ||
      cityBusyReason(g, s) ||
      (fleijaWarheadCount(g, s.owner) >= FLEIJA.max
        ? (fleijaPoolSides(g, s.owner).length > 1
          ? 'Britannia and Euro Britannia share one F.L.E.I.J.A. warhead slot (ready or under construction)'
          : 'Only one F.L.E.I.J.A. warhead may be held or under construction per faction') : null) ||
      ((s.lab || 0) < FLEIJA.lab ? `Requires research lab level ${FLEIJA.lab}` : null) ||
      shortfall(funds(g, s.owner), FLEIJA.cost)
    );
  }
  // Starting a warhead alerts every power; the city builds nothing else until it is done.
  function startProject(g, id) {
    const s = g.stations.find(s => s.id === id),
      why = projectReason(g, s);
    if (why) return { ok: false, reason: why };
    warSpend(g,s.owner,FLEIJA.cost,'F.L.E.I.J.A.');
    spend(funds(g, s.owner), FLEIJA.cost);
    s.project = { side: s.owner, started: g.turn, ready: g.turn + FLEIJA.turns };
    log(g, `INTELLIGENCE: Strategic weapons research detected in ${s.name}.`, s.owner);
    return { ok: true, ready: s.project.ready };
  }
  function eliminatorReason(g, s) {
    if (!s) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (eliminatorTurn(g) == null
        ? 'Available after the first F.L.E.I.J.A. detonation'
        : !eliminatorUnlocked(g)
          ? `Eliminator research completes on turn ${eliminatorTurn(g)}`
          : null) ||
      (s.expSupplyBlocked?.owner === s.owner ? 'City supply lines are disrupted' : null) ||
      cityBusyReason(g, s) ||
      ((s.lab || 0) < ELIMINATOR.lab ? `Requires research lab level ${ELIMINATOR.lab}` : null) ||
      ((s.eliminator || 0) > 0 ? 'This city already holds an Eliminator charge' : null) ||
      (sideEliminators(g, s.owner).length >= ELIMINATOR.max
        ? `At most ${ELIMINATOR.max} Eliminator charges at once (building, waiting or carried)`
        : null) ||
      shortfall(funds(g, s.owner), ELIMINATOR.cost)
    );
  }
  function startEliminator(g, id) {
    const s = g.stations.find(s => s.id === id),
      why = eliminatorReason(g, s);
    if (why) return { ok: false, reason: why };
    warSpend(g,s.owner,ELIMINATOR.cost,'Eliminator');
    spend(funds(g, s.owner), ELIMINATOR.cost);
    s.eliminatorProject = { side: s.owner, started: g.turn, ready: g.turn + ELIMINATOR.turns };
    // Defensive project locations are classified, unlike offensive warhead production.
    log(g, 'F.L.E.I.J.A. Eliminator development initiated at a classified site.', s.owner);
    return { ok: true, ready: s.eliminatorProject.ready };
  }
  function dropProject(g, s, why) {
    if (!s?.project) return;
    log(g, `${s.name}: the F.L.E.I.J.A. project is lost${why ? ' (' + why + ')' : ''}.`, s.owner);
    s.project = null;
  }
  function dropEliminator(g, s, why) {
    if (!s) return;
    if (s.eliminatorProject) {
      log(g, `A F.L.E.I.J.A. Eliminator project is lost${why ? ' (' + why + ')' : ''}.`, s.owner);
      s.eliminatorProject = null;
    }
    if (s.eliminator) {
      log(g, `A F.L.E.I.J.A. Eliminator charge is destroyed${why ? ' (' + why + ')' : ''}.`, s.owner);
      s.eliminator = 0;
      delete s.eliminatorMoved;
    }
  }
  // A surrendering power's projects and warheads are lost.
  function annexStrategic(g, loser) {
    for (const s of g.stations) {
      if (s.project?.side === loser) dropProject(g, s, 'surrender');
      if (s.eliminatorProject?.side === loser || (s.owner === loser && s.eliminator)) dropEliminator(g, s, 'surrender');
    }
    for (const v of g.units)
      if (v.side === loser) for (const u of [v, ...(v.cargo || [])]) dropCarriedEliminator(g, u, 'surrender');
    if (g.arsenal) g.arsenal[loser] = 0;
  }
  // Start of a power's turn: finished strategic projects come online.
  function strategicTurn(g, side) {
    if (g.mode === 'scenario') return; // Suppress even saved projects in every regional scenario.
    if (eliminatorTurn(g) === g.turn && !g.eliminatorAnnounced) {
      g.eliminatorAnnounced = true;
      log(g, 'INTELLIGENCE: F.L.E.I.J.A. Eliminator countermeasures are now available at level-3 research labs.', side);
    }
    for (const s of g.stations) {
      if (s.owner === side && s.expSupplyBlocked?.owner === side) {
        // Stop the production clock for this owner's turn; never complete a blocked project.
        for (const project of [s.project, s.eliminatorProject]) {
          if (project?.side === side && project.pausedTurn !== g.turn) {
            project.ready++;
            project.pausedTurn = g.turn;
          }
        }
        continue;
      }
      if (s.project?.side === side && s.owner === side && s.project.ready <= g.turn) {
        s.project = null;
        (g.arsenal ||= {})[side] = Math.min(FLEIJA.max, (g.arsenal[side] || 0) + 1);
        log(g, `${s.name} completes a F.L.E.I.J.A. warhead.`, side);
      }
      if (s.eliminatorProject?.side === side && s.owner === side && s.eliminatorProject.ready <= g.turn) {
        s.eliminatorProject = null;
        s.eliminator = 1;
        log(g, 'A F.L.E.I.J.A. Eliminator charge is ready at a classified site and waits for a carrier.', side);
      }
    }
  }
  function blastArea(g, p, radius = FLEIJA.radius) {
    return within(g, p, radius);
  }
  // The ready enemy charge nearest the target, carried or waiting in a city, or null. Carriers before cities at a tie.
  function eliminatorDefender(g, attacker, p) {
    if (!p) return null;
    return (
      [...eliminatorCharges(g), ...g.units
        .filter(u => u.hp > 0 && u.cmd === 'lloyd' && isMajor(g, u.side))
        .map(u => ({ c: u.c, r: u.r, owner: u.side, unit: u, ready: true, lloydPassive: true }))]
        .filter(h => h.ready && foe(g, h.owner, attacker) && isMajor(g, h.owner) && dist(g, h, p) <= ELIMINATOR.range)
        .sort(
          (a, b) =>
            dist(g, a, p) - dist(g, b, p) ||
            Number(!!a.city) - Number(!!b.city) ||
            (a.unit || a.city).id - (b.unit || b.city).id,
        )[0] || null
    );
  }
  // What a strike is called: the city or mine at ground zero, else the nearest city.
  function targetName(g, p) {
    const near = g.stations.slice().sort((a, b) => dist(g, a, p) - dist(g, b, p) || a.id - b.id)[0];
    return stationAt(g, p)?.name || siteAt(g, p)?.name || (near ? `near ${near.name}` : `hex ${p.c},${p.r}`);
  }
  function launchReason(g, side, p) {
    if (g.mode === 'scenario' && !finaleScenario(g)) return 'F.L.E.I.J.A. is unavailable in regional scenarios';
    if (finaleScenario(g) && g.turn < 5) return 'F.L.E.I.J.A. unlocks on turn 5';
    if (g.over) return 'Operation over';
    if (g.phase !== side) return 'Not your turn';
    if (!(g.arsenal?.[side] > 0)) return 'No F.L.E.I.J.A. warhead in the arsenal';
    // Stonehenge's expeditionary side starts offshore without a city.
    if (!finaleScenario(g) && !g.stations.some(s => s.owner === side)) return 'No city to launch from';
    if (!p || !tile(g, p.c, p.r)) return 'Choose a target hex';
    // No allied or own casualties, property damage, mine loss or city destruction anywhere in the blast radius.
    if (g.era === 'ufn2018' && blastArea(g, p).some(t => {
      const v = unitAt(g, t), city = stationAt(g, t), mine = siteAt(g, t);
      return (v && !foe(g, v.side, side)) ||
        (city && !foe(g, city.owner, side)) ||
        (mine && !foe(g, depositOwner(g, mine), side));
    })) return 'F.L.E.I.J.A. blast would harm friendly or allied forces, territory or facilities';
    if (stationAt(g, p)?.owner === side && g.stations.filter(s => s.owner === side).length === 1)
      return 'That is your last city';
    return null;
  }
  // Knock down every building by `levels` (Infinity: back to level 0) with the output and defenses they added.
  function ruin(g, s, levels) {
    buildingFoundation(g, s);
    const lostFactory = Math.min(levels, s.tier || 0),
      lostLab = Math.min(levels, s.lab || 0);
    s.tier = (s.tier || 0) - lostFactory;
    s.lab = (s.lab || 0) - lostLab;
    s.refinery = Math.max(0, (s.refinery || 0) - levels);
    s.portLevel = Math.max(0, (s.portLevel || 0) - levels);
    syncBuildings(g, s);
    s.shield = 0;
    dropProject(g, s, 'destroyed');
    dropEliminator(g, s, 'destroyed');
  }
  // Ground zero destroys a city for the rest of the conquest: it stops being a city (no owner, output, port, project or
  // Eliminator charge, and it cannot be captured or rebuilt) and its deposit is lost. Its ruins stay on the map
  // (g.ruins) for the UI.
  function destroyCity(g, s) {
    dropProject(g, s, 'destroyed');
    dropEliminator(g, s, 'destroyed');
    const d = depositOf(g, s),
      lost = d ? destroyDeposit(g, d) : null;
    recordWarEvent(g,'cityDestroyed',s.owner,{cityId:s.id,city:s.name,owner:s.owner});
    (g.ruins ||= []).push({ name: s.name, c: s.c, r: s.r, owner: s.owner, capital: !!s.capital, turn: g.turn });
    g.stations.splice(g.stations.indexOf(s), 1);
    if (g.mode !== 'campaign') {
      // Its province does not become an unclaimable ghost region. Remaining
      // cities of the same faction inherit the land without changing its color.
      // If this was the last city, surrender will attach it to the victor.
      for (const t of g.tiles) if (t.provinceCity === s.id) delete t.provinceCity;
      assignCityProvinces(g);
    }
    if (g.automation?.cities) delete g.automation.cities[s.id];
    log(g, `${s.name} is destroyed by F.L.E.I.J.A.: only ruins remain for the rest of the war.`, s.owner);
    return lost;
  }
  // A deposit at ground zero never produces again.
  function destroyDeposit(g, d) {
    g.sites.splice(g.sites.indexOf(d), 1);
    log(g, `The ${d.name} Sakuradite deposit is destroyed and will never produce again.`, depositOwner(g, d) || g.phase);
    return d.name;
  }
  // Detonation: everything at ground zero is erased, the ring is left at 10% with collapsed morale.
  function launch(g, side, c, r) {
    const center = tile(g, c, r),
      why = launchReason(g, side, center);
    if (why) return { ok: false, reason: why };
    const origin = g.stations
        .filter(s => s.owner === side)
        .sort((a, b) => dist(g, a, center) - dist(g, b, center) || a.id - b.id)[0],
      name = targetName(g, center);
    g.arsenal[side]--;
    (g.launched ||= {})[side] = g.turn;
    const defense = eliminatorDefender(g, side, center);
    recordWarEvent(g,'fleijaLaunch',side,{city:name,c,r,intercepted:!!defense,defender:defense?.owner||null});
    if (defense) {
      // A charge completing this turn can defend before its owner's phase begins.
      // Two turns of research + two of production therefore beat the second warhead.
      const holder = defense.unit || defense.city;
      if (defense.city?.eliminatorProject?.ready <= g.turn) defense.city.eliminatorProject = null;
      if (!defense.lloydPassive) {
        holder.eliminator = 0;
        delete holder.eliminatorMoved;
      }
      log(g, `F.L.E.I.J.A. Eliminator neutralizes the incoming warhead aimed at ${name}.`, defense.owner);
      return {
        ok: true,
        side,
        from: origin ? { c: origin.c, r: origin.r } : { c, r },
        to: { c, r },
        name,
        intercepted: true,
        defender: defense.owner,
        eliminatorCity: eliminatorHolderName(defense),
        eliminatorCarrier: defense.unit ? defense.unit.id : null,
        destroyed: [],
        crippled: [],
        damaged: [],
        cities: [],
        hit: [],
      };
    }
    const unlocksEliminator = g.mode !== 'scenario' && eliminatorTurn(g) == null;
    const destroyed = [],
      crippled = [],
      damaged = [],
      cities = [],
      depleted = [],
      hit = [];
    for (const t of blastArea(g, center)) {
      const blastDistance = dist(g, t, center),
        ring = blastDistance === 1,
        outer = blastDistance > 1,
        v = unitAt(g, t),
        s = stationAt(g, t),
        d = siteAt(g, t);
      if (v && blastDistance === 0) {
        hit.push({ id: v.id, c: t.c, r: t.r, damage: v.hp });
        recordWarEvent(g,'damage',side,{targetSide:v.side,value:v.hp,weapon:'F.L.E.I.J.A.'});
        v.hp = 0;
        kill(g, v, null, true, side);
        destroyed.push(v.id);
      } else if (v) {
        const ratio = outer ? FLEIJA.outerHP : FLEIJA.ringHP,
          left = Math.min(v.hp, Math.max(1, Math.round(maxHP(v) * ratio)));
        hit.push({ id: v.id, c: t.c, r: t.r, damage: v.hp - left });
        recordWarEvent(g,'damage',side,{targetSide:v.side,value:v.hp-left,weapon:'F.L.E.I.J.A.'});
        v.hp = left;
        if (ring) {
          v.morale = moraleFloor(g, v);
          crippled.push(v.id);
        } else {
          v.morale = Math.min(v.morale ?? 0, -1);
          // Blue Geass also protects against the outer-ring morale shock.
          if (leilaCommand(g, v)) v.morale = Math.max(0, v.morale);
          damaged.push(v.id);
        }
      }
      if (s) {
        if (blastDistance === 0) {
          if (finaleScenario(g)) {
            // Regional finale victories require conquering *every* city. Do not
            // delete a city (and make that victory impossible) after a strike.
            // The ground-zero city loses all defenses and infrastructure instead.
            ruin(g, s, Infinity);
            s.attackedSinceRegen = true;
            cities.push({ name: s.name, severity: 'ground', destroyed: false, owner: s.owner });
          } else {
            const lost = destroyCity(g, s);
            if (lost) depleted.push(lost);
            cities.push({ name: s.name, severity: 'ground', destroyed: true, owner: s.owner });
          }
        } else if (ring) {
          ruin(g, s, 1);
          s.attackedSinceRegen = true;
          cities.push({ name: s.name, severity: 'inner' });
        } else {
          s.shield = Math.min(s.shield, Math.round(s.maxShield * FLEIJA.outerShield));
          s.attackedSinceRegen = true;
          cities.push({ name: s.name, severity: 'outer' });
        }
      }
      if (d) {
        if (blastDistance === 0) depleted.push(destroyDeposit(g, d));
        else if (ring) d.refinery = Math.max(0, (d.refinery || 0) - 1);
      }
      if (blastDistance === 0 && !navigable(t) && !TERRAIN[t.terrain]?.blocked) setTileTerrain(g, t, 'crater');
    }
    // Only an unintercepted enemy-city destruction at ground zero counts toward
    // this attacker's Tier 1 targeting milestone. Splash and blocked launches do not.
    if (cities.some(c => c.destroyed && foe(g, c.owner, side))) {
      const hits = (g.fleijaSuccessfulCityHits ||= {});
      hits[side] = (hits[side] || 0) + 1;
    }
    if (unlocksEliminator) g.fleijaDetonated = g.turn;
    // A power whose last city was destroyed surrenders to the launcher.
    const ground = cities.find(c => c.destroyed);
    if (ground && ground.owner !== side && alive(g, ground.owner) && !g.stations.some(c => c.owner === ground.owner))
      surrender(g, ground.owner, side, ground);
    log(
      g,
      `F.L.E.I.J.A. detonation at ${name}: ${destroyed.length} units erased, ${crippled.length} crippled, ${damaged.length} damaged${cities.length ? ', ' + cities.length + ' cities affected' : ''}.`,
      side,
    );
    if (unlocksEliminator)
      log(
        g,
        `INTELLIGENCE: every power begins F.L.E.I.J.A. Eliminator research; countermeasures are available from turn ${eliminatorTurn(g)}.`,
        side,
      );
    checkVictory(g);
    return {
      ok: true,
      side,
      from: origin ? { c: origin.c, r: origin.r } : { c, r },
      to: { c, r },
      name,
      destroyed,
      crippled,
      damaged,
      cities,
      depleted,
      hit,
      eliminatorUnlocked: unlocksEliminator,
      eliminatorTurn: eliminatorTurn(g),
    };
  }

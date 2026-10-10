  // ======== F.L.E.I.J.A.: the Sakuradite superweapon ========
  // The high-resolution world uses roughly 200 km hexes. A warhead reaches two rings: the first is catastrophic,
  // while the second is a weaker blast fringe. Campaign maps can still pass an explicit radius to blastArea().
  const FLEIJA = {
    radius: 2,
    cost: { credits: 1800, industry: 450, science: 300, sakuradite: 150 },
    turns: 4, // construction time
    lab: 3, // research lab level needed
    labTurn: 15, // Research Lab III, and therefore the strategic-weapons program, opens in each conquest
    ringHP: 0.1, // first ring: units are left with 10% of their frame
    outerHP: 0.55, // second ring: units are left with at most 55%
    outerShield: 0.35, // second-ring cities retain at most 35% of their defenses
    aiThreshold: 1500, // the least target value a rival will spend a warhead on
  };
  const ELIMINATOR = {
    range: 3, // scaled with the denser world map; protects targets this many hexes from the city holding the charge
    cost: { credits: 1200, industry: 300, science: 250, sakuradite: 60 },
    turns: 3,
    lab: 3,
    research: 3, // turns after the first detonation before Eliminators can be built
    max: 3, // charges (ready or under construction) a power may hold at once, one per city
  };
  // The turn Eliminator research completes (g.fleijaDetonated is the turn of the first detonation), or null.
  function eliminatorTurn(g) {
    const first = g.fleijaDetonated;
    if (typeof first === 'number') return first + ELIMINATOR.research;
    if (first || (g.log || []).some(l => String(l.text || '').startsWith('F.L.E.I.J.A. detonation'))) return 0;
    return null;
  }
  function eliminatorUnlocked(g) {
    const at = eliminatorTurn(g);
    return at != null && g.turn >= at;
  }
  // A power's cities holding an Eliminator charge or building one.
  function sideEliminators(g, side) {
    return g.stations.filter(s => s.owner === side && ((s.eliminator || 0) > 0 || s.eliminatorProject?.side === side));
  }
  // F.L.E.I.J.A. is conquest-only: every major power gets the same strategic-weapons window once Lab III opens.
  function hasFleija(g, side) {
    return g.mode !== 'campaign' && MAJORS.includes(side) && g.turn >= FLEIJA.labTurn;
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
      (!hasFleija(g, s.owner) ? `Research lab level 3 unlocks on turn ${FLEIJA.labTurn}` : null) ||
      cityBusyReason(g, s) ||
      ((s.lab || 0) < FLEIJA.lab ? `Requires research lab level ${FLEIJA.lab}` : null) ||
      shortfall(funds(g, s.owner), FLEIJA.cost)
    );
  }
  // Starting a warhead alerts every power; the city builds nothing else until it is done.
  function startProject(g, id) {
    const s = g.stations.find(s => s.id === id),
      why = projectReason(g, s);
    if (why) return { ok: false, reason: why };
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
      cityBusyReason(g, s) ||
      ((s.lab || 0) < ELIMINATOR.lab ? `Requires research lab level ${ELIMINATOR.lab}` : null) ||
      ((s.eliminator || 0) > 0 ? 'This city already holds an Eliminator charge' : null) ||
      (sideEliminators(g, s.owner).length >= ELIMINATOR.max
        ? `At most ${ELIMINATOR.max} Eliminator charges at once (ready or under construction)`
        : null) ||
      shortfall(funds(g, s.owner), ELIMINATOR.cost)
    );
  }
  function startEliminator(g, id) {
    const s = g.stations.find(s => s.id === id),
      why = eliminatorReason(g, s);
    if (why) return { ok: false, reason: why };
    spend(funds(g, s.owner), ELIMINATOR.cost);
    s.eliminatorProject = { side: s.owner, started: g.turn, ready: g.turn + ELIMINATOR.turns };
    log(g, `INTELLIGENCE: F.L.E.I.J.A. Eliminator development detected in ${s.name}.`, s.owner);
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
      log(g, `${s.name}: the F.L.E.I.J.A. Eliminator project is lost${why ? ' (' + why + ')' : ''}.`, s.owner);
      s.eliminatorProject = null;
    }
    if (s.eliminator) {
      log(g, `${s.name}: the F.L.E.I.J.A. Eliminator charge is destroyed${why ? ' (' + why + ')' : ''}.`, s.owner);
      s.eliminator = 0;
    }
  }
  // A surrendering power's projects and warheads are lost.
  function annexStrategic(g, loser) {
    for (const s of g.stations) {
      if (s.project?.side === loser) dropProject(g, s, 'surrender');
      if (s.eliminatorProject?.side === loser || (s.owner === loser && s.eliminator)) dropEliminator(g, s, 'surrender');
    }
    if (g.arsenal) g.arsenal[loser] = 0;
  }
  // Start of a power's turn: finished strategic projects come online.
  function strategicTurn(g, side) {
    if (eliminatorTurn(g) === g.turn && !g.eliminatorAnnounced) {
      g.eliminatorAnnounced = true;
      log(g, 'INTELLIGENCE: F.L.E.I.J.A. Eliminator countermeasures are now available at level-3 research labs.', side);
    }
    for (const s of g.stations) {
      if (s.project?.side === side && s.owner === side && s.project.ready <= g.turn) {
        s.project = null;
        (g.arsenal ||= {})[side] = (g.arsenal[side] || 0) + 1;
        log(g, `${s.name} completes a F.L.E.I.J.A. warhead.`, side);
      }
      if (s.eliminatorProject?.side === side && s.owner === side && s.eliminatorProject.ready <= g.turn) {
        s.eliminatorProject = null;
        s.eliminator = 1;
        log(g, `${s.name} completes a F.L.E.I.J.A. Eliminator charge.`, side);
      }
    }
  }
  function blastArea(g, p, radius = FLEIJA.radius) {
    return within(g, p, radius);
  }
  function eliminatorDefender(g, attacker, p) {
    if (!p) return null;
    return (
      g.stations
        .filter(
          s =>
            s.owner !== attacker &&
            MAJORS.includes(s.owner) &&
            (s.eliminator || 0) > 0 &&
            dist(g, s, p) <= ELIMINATOR.range,
        )
        .sort((a, b) => dist(g, a, p) - dist(g, b, p) || a.id - b.id)[0] || null
    );
  }
  // What a strike is called: the city or mine at ground zero, else the nearest city.
  function targetName(g, p) {
    const near = g.stations.slice().sort((a, b) => dist(g, a, p) - dist(g, b, p) || a.id - b.id)[0];
    return stationAt(g, p)?.name || siteAt(g, p)?.name || (near ? `near ${near.name}` : `hex ${p.c},${p.r}`);
  }
  function launchReason(g, side, p) {
    if (g.over) return 'Operation over';
    if (g.phase !== side) return 'Not your turn';
    if (!(g.arsenal?.[side] > 0)) return 'No F.L.E.I.J.A. warhead in the arsenal';
    if (!g.stations.some(s => s.owner === side)) return 'No city to launch from';
    if (!p || !tile(g, p.c, p.r)) return 'Choose a target hex';
    if (stationAt(g, p)?.owner === side && g.stations.filter(s => s.owner === side).length === 1)
      return 'That is your last city';
    return null;
  }
  // The city's founding output and defenses: wrecked buildings never leave a city below them.
  function founding(s) {
    const row = CITY_DATA.find(r => r[0] === s.name);
    return row ? cityBase(row) : { income: 0, industry: 0, science: 0, maxShield: 0 };
  }
  // Knock down every building by `levels` (Infinity: back to level 0) with the output and defenses they added.
  function ruin(g, s, levels) {
    const base = founding(s),
      lostFactory = Math.min(levels, s.tier || 0),
      lostLab = Math.min(levels, s.lab || 0);
    s.tier = (s.tier || 0) - lostFactory;
    s.lab = (s.lab || 0) - lostLab;
    s.refinery = Math.max(0, (s.refinery || 0) - levels);
    s.portLevel = Math.max(0, (s.portLevel || 0) - levels);
    s.industry = Math.max(Math.min(base.industry, s.industry), s.industry - 10 * lostFactory);
    s.science = Math.max(Math.min(base.science, s.science), s.science - 8 * lostLab);
    s.maxShield = Math.max(Math.min(base.maxShield + (s.fortBonus || 0), s.maxShield), s.maxShield - 60 * lostFactory);
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
    if (defense) {
      defense.eliminator = 0;
      log(g, `${defense.name}: F.L.E.I.J.A. Eliminator neutralizes the incoming warhead aimed at ${name}.`, defense.owner);
      return {
        ok: true,
        side,
        from: origin ? { c: origin.c, r: origin.r } : { c, r },
        to: { c, r },
        name,
        intercepted: true,
        defender: defense.owner,
        eliminatorCity: defense.name,
        destroyed: [],
        crippled: [],
        damaged: [],
        cities: [],
        hit: [],
      };
    }
    const unlocksEliminator = eliminatorTurn(g) == null;
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
        v.hp = 0;
        kill(g, v, null, true);
        destroyed.push(v.id);
      } else if (v) {
        const ratio = outer ? FLEIJA.outerHP : FLEIJA.ringHP,
          left = Math.min(v.hp, Math.max(1, Math.round(maxHP(v) * ratio)));
        hit.push({ id: v.id, c: t.c, r: t.r, damage: v.hp - left });
        v.hp = left;
        if (ring) {
          v.morale = moraleFloor(g, v);
          crippled.push(v.id);
        } else {
          v.morale = Math.min(v.morale ?? 0, -1);
          damaged.push(v.id);
        }
      }
      if (s) {
        if (blastDistance === 0) {
          const lost = destroyCity(g, s);
          if (lost) depleted.push(lost);
          cities.push({ name: s.name, severity: 'ground', destroyed: true, owner: s.owner });
        } else if (ring) {
          ruin(g, s, 1);
          cities.push({ name: s.name, severity: 'inner' });
        } else {
          s.shield = Math.min(s.shield, Math.round(s.maxShield * FLEIJA.outerShield));
          cities.push({ name: s.name, severity: 'outer' });
        }
      }
      if (d) {
        if (blastDistance === 0) depleted.push(destroyDeposit(g, d));
        else if (ring) d.refinery = Math.max(0, (d.refinery || 0) - 1);
      }
      if (blastDistance === 0 && !navigable(t) && !TERRAIN[t.terrain]?.blocked) setTileTerrain(g, t, 'crater');
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

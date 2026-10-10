  function newUnit(g, type, side, c, r, stack = 1, cmd = null, ready = true) {
    const u = {
      id: g.nextId++,
      type,
      side,
      c,
      r,
      stack,
      hp: 0,
      morale: 0,
      moved: !ready,
      attacked: !ready,
      cmd,
      kills: 0,
      chain: 0,
      xp: 0,
      feintCD: 0,
      held: false,
      guardReady: false,
      entrenched: false,
      movedDistance: 0,
      skillReposition: 0,
      withdrawMove: false,
      elite: ELITE_TYPE_TO_ID[type] || null,
      eliteLevel: ELITE_TYPE_TO_ID[type] ? 1 : 0,
      eliteMoveAfterKill: false,
    };
    u.hpTech = hullTech(g, u);
    u.hp = maxHP(u);
    g.units.push(u);
    return u;
  }
  function movement(g, u) {
    const t = TYPES[u.type],
      f = fx(u),
      mobilityStars = u.cmd ? officerOf(g, u)?.ratings?.mobility || 1 : 0;
    let n = t.move + Math.min(1, unitTech(g, u, 'drives')) + (eliteFx(u).move || 0);
    if (g?.mode !== 'campaign') n += CONQUEST_MOVE_BONUS;
    // Commander Mobility rating. 1–2★ = +0, 3★ = +1, 4★ = +2, 5★ = +3, 6★ = +4 movement.
    n += mobilityStars >= 3 ? mobilityStars - 2 : 0;
    n += wears(g, u, 'star') ? 1 : 0;
    n += f.move || 0;
    if (techLevel(g, u.side, 'sakura.float') >= 2 && (t.branch === 'Armor' || t.float || eliteFx(u).float)) n += 1;
    return n;
  }
  function terrainCost(g, u, t) {
    if (isSea(t)) return 1;
    const type = TYPES[u.type];
    if (fx(u).ignoreTerrain || type.float || eliteFx(u).float) return 1;
    if (type.branch === 'Armor' && techLevel(g, u.side, 'sakura.float') >= 1) return 1;
    const nav = type.branch === 'Infantry' ? techLevel(g, u.side, 'infantry.nav') : 0;
    if (nav >= 2 || (nav >= 1 && (t.terrain === 'forest' || t.terrain === 'mountain'))) return 1;
    return TERRAIN[t.terrain]?.cost || 1;
  }
  function canCapture(u) {
    return TYPES[u.type].branch !== 'Artillery';
  }
  function isReady(g, u) {
    return !g.over && g.phase === u.side && u.hp > 0 && u.morale > -3;
  }
  // Movement: a Dijkstra search. Land units may embark onto an adjacent sea hex (which ends the move); embarked
  // units sail up to their sea movement and may land on a coast hex (which ends the move).
  function reachable(g, u) {
    const found = new Map();
    const ef = eliteFx(u);
    if (!isReady(g, u) || u.moved || (u.attacked && !ef.moveAfterAttack && !u.eliteMoveAfterKill && !u.skillReposition && !u.withdrawMove)) return found;
    const t = TYPES[u.type],
      start = tile(g, u.c, u.r),
      fromSea = isSea(start),
      ship = t.naval === 'ship',
      amphibious = t.naval === 'amphibious',
      landMove = movement(g, u),
      seaMv = amphibious ? amphibiousSea(g, u) : 0,
      budget = u.skillReposition ? Math.min(landMove, u.skillReposition) : ship ? landMove : amphibious ? landMove * seaMv : fromSea ? seaMove(g, u) : landMove,
      boards = !u.skillReposition && !t.naval && u.deployedTurn !== g.turn,
      roughDiscount = !u.skillReposition && !t.naval && t.branch === 'Infantry' && techLevel(g, u.side, 'infantry.drives') >= 2,
      advancedLanding = !u.skillReposition && !t.naval && techLevel(g, u.side, 'naval.logistics') >= 2 && hasPort3(g, u.side),
      stateKey = (p, used) => `${key(p)}|${used ? 1 : 0}`,
      costs = new Map([[stateKey(start, false), 0]]),
      queue = [{ p: start, cost: 0, roughUsed: false, order: 0 }];
    let nextOrder = 1;
    const before = (a, b) => a.cost < b.cost || (a.cost === b.cost && a.order < b.order);
    const push = entry => {
      entry.order = nextOrder++;
      let i = queue.length;
      queue.push(entry);
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (!before(entry, queue[parent])) break;
        queue[i] = queue[parent];
        i = parent;
      }
      queue[i] = entry;
    };
    const pop = () => {
      const first = queue[0], last = queue.pop();
      if (queue.length) {
        let i = 0;
        for (;;) {
          const left = i * 2 + 1, right = left + 1;
          if (left >= queue.length) break;
          const child = right < queue.length && before(queue[right], queue[left]) ? right : left;
          if (!before(queue[child], last)) break;
          queue[i] = queue[child];
          i = child;
        }
        queue[i] = last;
      }
      return first;
    };
    while (queue.length) {
      const { p, cost, roughUsed } = pop();
      if (cost > costs.get(stateKey(p, roughUsed))) continue;
      for (const n of adjacent(g, p)) {
        if (TERRAIN[n.terrain]?.blocked || (ship && !navigable(n)) || (u.skillReposition && !t.naval && isSea(n) && !fromSea)) continue;
        const occ = unitAt(g, n),
          st = stationAt(g, n);
        if (ship && st) continue;
        if (occ && occ.side !== u.side) continue;
        if (occ && boards && canBoard(g, occ)) {
          if (cost < budget) found.set(key(n), budget);
          continue;
        }
        if (st && foe(g, st.owner, u.side) && (st.shield > 0 || !canCapture(u))) continue;
        const cross = !t.naval && isSea(n) !== fromSea;
        let nextRough = roughUsed,
          step = isSea(n) ? 1 : terrainCost(g, u, n);
        if (roughDiscount && !roughUsed && !cross && step > 1) {
          step--;
          nextRough = true;
        }
        const nc = u.skillReposition
          ? cost + step
          : cross
          ? advancedLanding ? cost + 1 : budget
          : ship
            ? cost + 1
            : amphibious
              ? cost + (isSea(n) ? landMove : terrainCost(g, u, n) * seaMv)
              : cost + step;
        const sk = stateKey(n, nextRough);
        if (nc > budget || (cross && cost >= budget) || nc >= (costs.get(sk) ?? Infinity)) continue;
        costs.set(sk, nc);
        if (!cross) push({ p: n, cost: nc, roughUsed: nextRough });
        if (!occ && key(n) !== key(start)) found.set(key(n), Math.min(found.get(key(n)) ?? Infinity, nc));
      }
    }
    return found;
  }
  // Fire Control II adds one hex of range to all Artillery.
  function rangeOf(g, u) {
    const t = TYPES[u.type];
    return {
      min: t.min,
      max:
        t.max +
        (eliteFx(u).range || 0) +
        (g && t.branch === 'Artillery' && !t.naval && techLevel(g, u.side, 'artillery.fire') >= 2 && (u.movedDistance || 0) === 0 ? 1 : 0) +
        (g && t.branch === 'Artillery' && spotted(g, u) ? 1 : 0), // Minami's Ikaruga Fire Control
    };
  }
  function inRange(a, p, g) {
    const { min, max } = rangeOf(g, a),
      d = dist(g, a, p);
    return d >= min && d <= max;
  }
  function hostileTarget(g, u, p) {
    const target = unitAt(g, p),
      st = stationAt(g, p);
    if (target) return foe(g, target.side, u.side);
    return !!st && foe(g, st.owner, u.side) && st.shield > 0;
  }
  // Whether a unit still has any order besides holding position: firing, moving, repairing, reinforcing or an action.
  function hasOrders(g, u) {
    if (!u || !isReady(g, u)) return false;
    if (!u.attacked && targets(g, u).length) return true;
    if (!u.moved && !u.goto && reachable(g, u).size) return true;
    if (!repairReason(g, u) || !reinforceReason(g, u)) return true;
    if (u.cargo?.some((c, i) => !deployReason(g, u, i))) return true;
    return !!COMMANDERS[u.cmd]?.action && !feintReason(g, u);
  }
  // Rapid KMF Deployment: a carried Knightmare launches onto an empty, non-enemy land hex next to its carrier with a
  // full move and attack even on the turn it boarded. Deployment prevents reboarding this turn.
  function deployTargetsAt(g, p, side) {
    return adjacent(g, p).filter(
      t =>
        !isSea(t) &&
        !TERRAIN[t.terrain]?.blocked &&
        !unitAt(g, t) &&
        !(stationAt(g, t) && foe(g, stationAt(g, t).owner, side)),
    );
  }
  const deployTargets = (g, ship) => deployTargetsAt(g, ship, ship.side);
  function deployReason(g, ship, i) {
    const u = ship?.cargo?.[i];
    if (!u) return 'No unit aboard';
    return (
      turnReason(g, ship.side) ||
      (!deployTargets(g, ship).length ? 'No empty land hex next to the carrier' : null)
    );
  }
  function deploy(g, shipId, i, c, r) {
    const ship = g.units.find(v => v.id === shipId && v.hp > 0),
      why = ship ? deployReason(g, ship, i) : 'Carrier not found';
    if (why) return { ok: false, reason: why };
    const t = deployTargets(g, ship).find(p => p.c === c && p.r === r);
    if (!t) return { ok: false, reason: 'Choose an empty land hex next to the carrier.' };
    const [u] = ship.cargo.splice(i, 1);
    u.c = t.c;
    u.r = t.r;
    u.moved = u.attacked = false;
    u.deployedTurn = u.launched = g.turn;
    g.units.push(u);
    // Land ownership is controlled exclusively through cities, not troop landings.
    const seized = seizeDeposit(g, u, t);
    log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} launches from the Carrier-Battleship.`, u.side);
    return { ok: true, unit: u, to: { c: t.c, r: t.r }, seized };
  }
  // Embarked units cannot fire.
  function targets(g, u) {
    if (atSea(g, u)) return [];
    return within(g, u, rangeOf(g, u).max).filter(p => inRange(u, p, g) && hostileTarget(g, u, p));
  }
  function claim(g, p, owner) {
    if (g.mode !== 'campaign') {
      // Capturing a city transfers its entire fixed province, not the nearby
      // provinces and not just the seven hexes immediately around the city.
      let changed = 0;
      for (const t of g.tiles)
        if (!isSea(t) && t.provinceCity === p.id) {
          setTileOwner(g, t, owner);
          changed++;
        }
      // Custom maps and old standalone tests may not have city provinces.
      if (!changed) setTileOwner(g, tile(g, p.c, p.r), owner);
      return;
    }
    // Campaign missions use small tactical maps, not the conquest province map.
    for (const t of [tile(g, p.c, p.r), ...adjacent(g, p)])
      if (!isSea(t) && !TERRAIN[t.terrain]?.blocked) setTileOwner(g, t, owner);
  }
  function move(g, id, c, r) {
    const u = g.units.find(u => u.id === id);
    if (!u) return { ok: false, reason: 'Unit not found.' };
    const dest = tile(g, c, r),
      reach = dest && reachable(g, u),
      moveCost = dest && reach?.get(key(dest));
    if (!dest || moveCost == null) return { ok: false, reason: 'That hex is not reachable this turn.' };
    const from = { c: u.c, r: u.r },
      fromSea = isSea(tile(g, u.c, u.r)),
      t = TYPES[u.type],
      cross = !t.naval && isSea(dest) !== fromSea,
      advancedLanding = cross && !u.skillReposition && techLevel(g, u.side, 'naval.logistics') >= 2 && hasPort3(g, u.side),
      moveBudget = fromSea ? seaMove(g, u) : movement(g, u),
      retainMove = advancedLanding && moveBudget - moveCost >= 2,
      carrier = unitAt(g, dest);
    // Boarding: the Knightmare goes aboard (off the map) and its action ends.
    if (carrier && carrier !== u && carrier.side === u.side && canBoard(g, carrier)) {
      g.units.splice(g.units.indexOf(u), 1);
      u.c = dest.c;
      u.r = dest.r;
      u.moved = u.attacked = true;
      u.held = false;
      u.guardReady = false;
      u.skillReposition = 0;
      u.withdrawMove = false;
      u.movedDistance = (u.movedDistance || 0) + dist(g, from, dest);
      u.lastTurnMoved = true;
      u.boardedTurn = g.turn;
      (carrier.cargo ||= []).push(u);
      log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} boards the Carrier-Battleship.`, u.side);
      return { ok: true, from, to: { c: dest.c, r: dest.r }, loaded: carrier.id };
    }
    u.c = dest.c;
    u.r = dest.r;
    // Units aboard a Carrier-Battleship travel with it (rallies and other distance rules read their position).
    for (const c of u.cargo || []) {
      c.c = dest.c;
      c.r = dest.r;
    }
    u.moved = !retainMove;
    // Amphibious units gain one full extra movement and attack after landing each turn.
    // A per-turn stamp prevents unlimited actions by hopping across the coastline.
    const freshLanding = t.naval === 'amphibious' && fromSea && !isSea(dest) && u.landingRefreshTurn !== g.turn;
    if (freshLanding) {
      u.landingRefreshTurn = g.turn;
      u.moved = false;
      u.attacked = false;
      u.chain = 0;
    }
    u.held = false;
    u.guardReady = false;
    u.movedDistance = freshLanding ? 0 : (u.movedDistance || 0) + dist(g, from, dest);
    u.lastTurnMoved = true;
    u.skillReposition = retainMove ? 1 : 0;
    u.withdrawMove = false;
    u.eliteMoveAfterKill = false;
    reindex(g, u, from);
    // Moving through enemy or neutral territory never changes its map color.
    const s = stationAt(g, u);
    let captured = null,
      annexed = null;
    if (s && foe(g, s.owner, u.side) && canCapture(u)) {
      const loser = s.owner;
      s.owner = u.side;
      s.shield = 0;
      // Capturing the city does not take a port that an enemy ship still holds; it must be cleared first.
      if (s.portAt) {
        const holder = unitAt(g, s.portAt);
        if (!holder || !foe(g, holder.side, u.side)) s.portOwner = u.side;
      }
      s.capturedTurn = g.turn;
      dropProject(g, s, 'captured');
      dropEliminator(g, s, 'captured');
      captured = s.name;
      u.morale = 1;
      funds(g, u.side).credits += 40;
      fortify(g, s);
      claim(g, s, u.side);
      if (fx(u).captureHeal) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * fx(u).captureHeal));
      // Sugiyama's Special Operations: a turn off the city's battery recharge.
      if (fx(u).specialOps && (s.gunReady || 0) > g.turn) s.gunReady--;
      log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} captures ${s.name}.`, u.side);
      hooks.capture?.(g, s, u, loser);
      if (s.capitalOf && s.capitalOf === loser) award(g, u.side, 'star', `${s.name} captured`);
      // Conquest: a major power surrenders only when its last city falls; its armies disband. A capital is just its
      // richest city.
      if (g.mode !== 'campaign' && alive(g, loser) && !g.stations.some(c => c.owner === loser))
        annexed = surrender(g, loser, u.side, s);
    }
    const seized = seizeDeposit(g, u, dest);
    checkVictory(g);
    return { ok: true, from, to: { c: dest.c, r: dest.r }, captured, annexed, seized };
  }
  // `last` is the city whose capture left the loser with none; anything it still held passes to the conqueror.
  function surrender(g, loser, winner, last) {
    (g.fallen ||= {})[loser] = { by: winner, turn: g.turn, city: last.name };
    // Clear strategic defenses while any remaining cities still identify their original owner.
    annexStrategic(g, loser);
    let cities = 0,
      units = 0;
    for (const s of g.stations)
      if (s.owner === loser) {
        s.owner = winner;
        if (s.portAt) s.portOwner = winner;
        s.shield = Math.round(s.maxShield * 0.5);
        s.producedTurn = g.turn;
        fortify(g, s);
        cities++;
      }
    // Any land formerly attached to an already destroyed city now belongs to
    // a surviving city of the conqueror, so later captures can still transfer it.
    const winnerCities = new Set(g.stations.filter(s => s.owner === winner).map(s => s.id));
    for (const t of g.tiles) if (t.owner === loser) {
      setTileOwner(g, t, winner);
      if (!winnerCities.has(t.provinceCity)) delete t.provinceCity;
    }
    if (g.mode !== 'campaign') assignCityProvinces(g);
    for (const v of g.units)
      if (v.hp > 0 && v.side === loser) {
        v.hp = 0;
        kill(g, v, null, true); // also sinks the Knightmares aboard a Carrier-Battleship
        units++;
      }
    const e = funds(g, loser),
      w = funds(g, winner);
    w.credits += Math.round(e.credits / 2);
    w.industry += Math.round(e.industry / 2);
    e.credits = e.industry = 0;
    annexDeposits(g, loser, winner);
    log(
      g,
      `${last.name}, the last city of the ${FACTIONS[loser].name}, has fallen. It surrenders to the ${FACTIONS[winner].name}: ${units} units disbanded.`,
      winner,
    );
    return { loser, winner, cities, units, city: last.name };
  }
  // Command auras: every commander lifts adjacent friends by 8%; some reach farther or further.

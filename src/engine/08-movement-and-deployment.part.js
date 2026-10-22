  function newUnit(g, type, side, c, r, stack = 1, cmd = null, ready = true) {
    cmd=EU_ROSTER_REPLACEMENTS[cmd]||cmd;
    // Normalize ALL scenario-scripted and recruited Chinese/UFN frames at birth;
    // faction allegiance and the frame's combat class remain unchanged.
    type = eraUnitType(g, type, side);
    const u = {
      id: g.nextId++,
      type,
      side,
      c,
      r,
      stack: ELITE_TYPE_TO_ID[type] ? 1 : stack, // Elite Forces are always single frames, for every side.
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
      moveActionTurn: null,
      moveActionsThisTurn: 0,
      skillReposition: 0,
      withdrawMove: false,
      elite: ELITE_TYPE_TO_ID[type] || null,
      eliteLevel: ELITE_TYPE_TO_ID[type]
        ? (g.warCampaign && side === g.player ? (g.eliteLevels?.[ELITE_TYPE_TO_ID[type]] || 1) : 1)
        : 0,
      eliteMoveAfterKill: false,
    };
    u.hpTech = hullTech(g, u);
    u.hp = maxHP(u);
    g.units.push(u);
    // Scenario-created Leila immediately protects nearby formations from low morale.
    if (cmd === 'leila') applyLeilaMoraleFloor(g);
    // Challenge Pass: count newly created frames, including ships, amphibious and Elite Forces.
    if (g.mode === 'conquest' && side === g.player && g.challengePassRun?.version === 1) {
      g.challengePassRun.produced += u.stack;
      if (u.elite) g.challengePassRun.eliteProduced = true;
    }
    if(g.warReport)recordWarEvent(g,'unitProduced',side,{unitId:u.id,unitType:type,stack:u.stack});
    return u;
  }
  function movement(g, u) {
    const t = TYPES[u.type],
      f = fx(u),
      mobilityStars = u.cmd ? effectiveRating(g, u, 'mobility') : 0;
    let n = t.move + (eliteFx(u).move || 0);
    // Conquest and Scenarios grant +2 movement to ground and amphibious units.
    // Story Mode uses base movement. Warships never receive this bonus.
    if (g && (g.mode === 'conquest' || g.mode === 'scenario') && t.naval !== 'ship')
      n += UNIVERSAL_MOVE_BONUS;
    // HQ mobility: Infantry +4, land Armor +2, Artillery +2.
    // Float's two levels still give amphibious Knightmares up to +4 on land.
    // Clamp old in-progress games that saved Float levels III/IV.
    // Warship and amphibious sea movement remain unchanged.
    if (g && t.naval !== 'ship') {
      const floatLevel = Math.min(2, techLevel(g, u.side, 'armor.float'));
      if (t.naval === 'amphibious') n += floatLevel * 2;
      else if (t.branch === 'Armor') n += floatLevel;
      else if (t.branch === 'Infantry') n += techLevel(g, u.side, 'infantry.nav');
      else if (t.branch === 'Artillery') n += techLevel(g, u.side, 'artillery.traction');
    }
    // Every commander Mobility star grants +1 movement (1★ = +1 through 6★ = +6).
    n += mobilityStars;
    if(u.expJammedActive)n=Math.max(1,n-2);
    if (u.expYukiyaElectronicActive) n = Math.max(1, n - 2);
    n += f.move || 0;
    if (u.expImperialCommand) n += 2;
    // Banked first-strike movement adds to a later full movement action.
    // An immediate postattack reposition instead spends from the bank itself.
    if (f.firstStrike && !u.expKallenReposition && !u.skillReposition &&
        t.naval !== 'ship') n += u.expKallenMoveBank || 0;
    if (u.expKallenSlowActive) n = Math.max(1, n - 2);
    if(u.expMiguelSupply)n=Math.max(0,n-2);
    return n;
  }
  function terrainStepCost(g, t) {
    const regional = g?.mode === 'scenario' ? scenarioMeta(g).terrainCosts?.[t.terrain] : null;
    return regional || TERRAIN[t.terrain]?.cost || 1;
  }
  function terrainText(g, t) {
    const info = TERRAIN[t.terrain], cost = terrainStepCost(g, t);
    return info.desc.replace(/Movement cost \d+\./, 'Movement cost ' + cost + '.');
  }
  function terrainCost(g, u, t) {
    if (isSea(t)) return 1;
    const type = TYPES[u.type];
    if (fx(u).ignoreTerrain || u.expRetrofit || type.float || eliteFx(u).float) return 1;
    return terrainStepCost(g, t);
  }
  // Iraq–Iran only: crossing a Tigris, Euphrates or Karun river edge consumes
  // one extra movement point. Marked bridge-city approaches have no surcharge.
  // All other scenarios and the global Conquest rules remain unchanged.
  function riverCrossingCost(g, a, b, u = null) {
    if (g?.mode !== 'scenario' || !g.scenario.riverBarriers ||
        isSea(a) || isSea(b)) return 0;
    if (u && (fx(u).ignoreTerrain || u.expRetrofit || TYPES[u.type]?.float ||
        eliteFx(u).float || TYPES[u.type]?.naval)) return 0;
    const i = a.r * g.cols + a.c, j = b.r * g.cols + b.c;
    return g.scenario.riverBarriers?.[i < j ? i + ':' + j : j + ':' + i] ? 1 : 0;
  }
  function canCapture(u) {
    return TYPES[u.type].naval !== 'ship';
  }
  function isReady(g, u) {
    return !g.over && g.phase === u.side && u.hp > 0 && !u.expRoloFrozen && !u.expCharlesMemoryRewrite && u.morale > -3;
  }
  // Count actual movement actions, not hex distance. This also covers abilities
  // that reset 'moved', and works on old saves where these fields are missing.
  function isHeavyChainMover(u) {
    const cls = TYPES[u.type]?.cls;
    return cls === 'heavy' || cls === 'super';
  }
  function heavyMoveLimitReached(g, u) {
    return isHeavyChainMover(u) && u.moveActionTurn === g.turn && (u.moveActionsThisTurn || 0) >= 2;
  }
  function markMoveAction(g, u) {
    u.moveActionsThisTurn = (u.moveActionTurn === g.turn ? (u.moveActionsThisTurn || 0) : 0) + 1;
    u.moveActionTurn = g.turn;
  }
  // Movement: a Dijkstra search. Land units may embark onto an adjacent sea hex (which ends the move); embarked
  // units sail up to their sea movement and may land on a coast hex (which ends the move).
  function reachable(g, u) {
    const found = new Map();
    const ef = eliteFx(u);
    // Brain Raid restores the full normal movement budget after a shot,
    // but only while Akito remains isolated; this never restores an attack.
    const akitoFollowUp = !!u.expAkitoMoveReady && akitoIsolated(g, u);
    if (!isReady(g, u) || u.expFarneseSlaughterTurn === g.turn || u.expFernandoOverload || u.expDisabledActive || u.expPinnedActive || (u.expJammedActive && u.attacked) || (u.moved && !u.expOscarReposition) || heavyMoveLimitReached(g, u) || (u.attacked && !ef.moveAfterAttack && !u.eliteMoveAfterKill && !u.skillReposition && !u.withdrawMove && !akitoFollowUp && !u.expOscarReposition)) return found;
    const t = TYPES[u.type],
      start = tile(g, u.c, u.r),
      fromSea = isSea(start),
      ship = t.naval === 'ship',
      air = !!t.air,
      amphibious = t.naval === 'amphibious',
      landMove = movement(g, u),
      seaMv = amphibious ? amphibiousSea(g, u) : 0,
      budget = u.expOscarReposition ? 3 : u.expKallenReposition ? (u.expKallenMoveBank || 0)
        : u.skillReposition ? Math.min(landMove, u.skillReposition)
        : ship ? landMove : amphibious ? landMove * seaMv : fromSea ? seaMove(g, u) : landMove,
      boards = !u.expOscarReposition && !u.skillReposition && !u.expKallenReposition && !t.naval && u.deployedTurn !== g.turn,
      stateKey = p => key(p),
      costs = new Map([[stateKey(start), 0]]),
      queue = [{ p: start, cost: 0, order: 0 }];
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
    const rivers = g.mode === 'scenario' && !!g.scenario?.riverBarriers; // decided once, not per step
    while (queue.length) {
      const { p, cost } = pop();
      if (cost > costs.get(stateKey(p))) continue;
      for (const n of adjacent(g, p)) {
        // Airships fly over impassable peaks and land alike; other warships keep to the water.
        if ((!air && TERRAIN[n.terrain]?.blocked) || (ship && !air && !navigable(n)) ||
            (u.skillReposition && !t.naval && isSea(n) && !fromSea) ||
            ((u.expMargaretRedeploy||u.expShadowMove||u.expOscarReposition)&&isSea(n)!==fromSea)) continue;
        const occ = unitAt(g, n),
          st = stationAt(g, n);
        if (ship && st) continue;
        if (occ && occ.side !== u.side) continue;
        if (occ && boards && canBoard(g, occ)) {
          if (cost < budget) found.set(key(n), budget);
          continue;
        }
        if (st && foe(g, st.owner, u.side) && !(canCapture(u) && st.shield <= 0)) continue;
        const cross = !t.naval && isSea(n) !== fromSea;
        // Ordinary sea transports must begin their movement beside the landing hex.
        // They may sail OR land this turn, never sail across water and land in one action.
        if (cross && fromSea && cost > 0) continue;
        const step = isSea(n) ? 1 : terrainCost(g, u, n) + (rivers ? riverCrossingCost(g, p, n, u) : 0);
        const nc = (u.skillReposition || u.expOscarReposition)
          ? cost + step
          : cross
          ? budget
          : ship
            ? cost + 1
            : amphibious
              ? cost + (isSea(n) ? landMove : (terrainCost(g, u, n) + (rivers ? riverCrossingCost(g, p, n, u) : 0)) * seaMv)
              : cost + step;
        const sk = stateKey(n);
        if (nc > budget || (cross && cost >= budget) || nc >= (costs.get(sk) ?? Infinity)) continue;
        costs.set(sk, nc);
        if (!cross) push({ p: n, cost: nc });
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
        (g && t.branch === 'Artillery' && spotted(g, u) ? 1 : 0) + (u.expNavalRelay ? 1 : 0) +
        (u.cmd === 'norland' && u.expNorlandTitan ? 1 : 0), // Foulbout Titan Mode extends all eligible weapons by one hex.
    };
  }
  function inRange(a, p, g) {
    const { min, max } = rangeOf(g, a),
      d = dist(g, a, p);
    return d >= min && d <= max;
  }
  // Only these can attack an airship or return its fire: Heavy and Super-heavy armor, Rocket and
  // Siege artillery (regular or Elite of those classes), warships, other airships and Float-equipped
  // units. Fortress batteries, which are not units, can also fire on them.
  const AIR_DEFENSE_CLASSES = new Set(['heavy', 'super', 'rocket', 'siege']);
  function canHitAir(u) {
    const t = TYPES[u.type];
    return t.naval === 'ship' || AIR_DEFENSE_CLASSES.has(t.cls) || !!t.float || !!eliteFx(u).float;
  }
  function hostileTarget(g, u, p) {
    const target = unitAt(g, p),
      st = stationAt(g, p);
    if (target) return foe(g, target.side, u.side) && (!isAir(target) || canHitAir(u));
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
  // Carrier cargo may land on an unoccupied enemy city only after its defenses reach zero.
  function deployTargetsAt(g, p, side, carriesTroops = false) {
    return adjacent(g, p).filter(t =>
      !isSea(t) && !TERRAIN[t.terrain]?.blocked && !unitAt(g, t) &&
      (!stationAt(g, t) || !foe(g, stationAt(g, t).owner, side) ||
        (carriesTroops && stationAt(g, t).shield <= 0)),
    );
  }
  const deployTargets = (g, ship, i = 0) => deployTargetsAt(g, ship, ship.side, !!ship.cargo?.[i]);
  function deployReason(g, ship, i) {
    const u = ship?.cargo?.[i];
    if (!u) return 'No unit aboard';
    return (
      turnReason(g, ship.side) ||
      (u.boardedTurn === g.turn ? 'Troops cannot deploy until the turn after boarding' : null) ||
      (!deployTargets(g, ship, i).length ? 'No empty land hex next to the carrier' : null)
    );
  }
  function deploy(g, shipId, i, c, r) {
    const check = validateAction(g, { kind: 'deploy', id: shipId, index: i, c, r });
    if (!check.ok) return check;
    const ship = check.actor, t = check.destination;
    const [u] = ship.cargo.splice(i, 1);
    u.c = t.c;
    u.r = t.r;
    u.moved = u.attacked = false;
    u.deployedTurn = u.launched = g.turn;
    u.expLandedTurn=g.turn;
    if(u.cmd==='sawasaki'){u.expBeachheadStart=g.turn;u.expBeachheadUntil=g.turn+2;}
    g.units.push(u);
    // Only city captures transfer territory; ordinary landings cannot repaint it.
    const { captured, annexed } = captureCity(g, u, true);
    const seized = seizeDeposit(g, u, t);
    log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} launches from the ${TYPES[ship.type].air ? TYPES[ship.type].name : 'Carrier-Battleship'}.`, u.side);
    checkVictory(g);
    return { ok: true, unit: u, to: { c: t.c, r: t.r }, captured, annexed, seized };
  }
  // Embarked units cannot fire.
  function targets(g, u) {
    if (atSea(g, u)) return [];
    const { min, max } = rangeOf(g, u); // once, not again for every hex in reach
    return within(g, u, max).filter(p => {
      const d = dist(g, u, p);
      return d >= min && d <= max && hostileTarget(g, u, p);
    });
  }
  // targets() restricted to `pool` (hexes to test), in the same order. For a unit standing on a hex with nothing
  // in its range disc this skips scanning the disc; not for wrapped maps, whose disc order differs.
  function targetsAmong(g, u, pool) {
    if (atSea(g, u)) return [];
    const { min, max } = rangeOf(g, u);
    return pool
      .filter(p => {
        const d = dist(g, u, p);
        return d >= min && d <= max && hostileTarget(g, u, p);
      })
      .sort((a, b) => a.c - (a.r >> 1) - (b.c - (b.r >> 1)) || a.r - b.r);
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
  // A port is seized by entering its water hex, independently of its city and territory.
  function capturePort(g, u) {
    const s = portAtHex(g, u);
    // Airships cannot seize ports, just as they cannot seize cities or mines.
    if (!s || isAir(u) || !foe(g, s.portOwner || s.owner, u.side)) return null;
    const previousOwner=s.portOwner||s.owner;
    s.portOwner=u.side;
    recordWarEvent(g,'portCaptured',u.side,{cityId:s.id,city:s.name,previousOwner,unitId:u.id});
    log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} captures the port of ${s.name}.`, u.side);
    return s.name;
  }
  // City capture changes provinces, but does not automatically transfer ports.
  function captureCity(g, u, navalLanding = false) {
    const s = stationAt(g, u);
    if (u.hp <= 0 || !s || !foe(g, s.owner, u.side) ||
      !canCapture(u) || s.shield > 0)
      return { captured: null, annexed: null };
    const loser = s.owner;
    if(fx(u).taxSeizure){funds(g,u.side).credits+=Math.min(150,3*cityOutput(g,s).credits);s.expTaxUntil=g.turn+2;}
    delete s.expSupplyBlocked;delete s.expDecree;delete s.expShieldRegenBlocked;delete s.expYoshidaBreak;
    s.owner = u.side;
    recordWarEvent(g,'cityCaptured',u.side,{cityId:s.id,city:s.name,previousOwner:loser,
      unitId:u.id,commander:u.cmd||null,naval:!!navalLanding,group:warGroup(g,u)});
    s.shield = 0;
    s.capturedTurn = g.turn;
    dropProject(g, s, 'captured');
    dropEliminator(g, s, 'captured');
    u.morale = 1;
    funds(g, u.side).credits += 40;
    fortify(g, s);
    // Update the new owner's maximum fortification, but do not grant instant defenses.
    // Shields recover normally on the new owner's subsequent turn.
    s.shield = 0;
    claim(g, s, u.side);
    if (fx(u).captureHeal) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * fx(u).captureHeal));
    // Fernando must personally capture the city. This passive triggers once
    // per faction turn, regardless of how many captures he chains.
    if (u.cmd === 'fernando' && fx(u).popularUprising && u.expPopularUprisingTurn !== g.turn) {
      u.expPopularUprisingTurn = g.turn;
      for (const ally of g.units) {
        if (ally.hp <= 0 || ally.side !== u.side || atSea(g, ally) || dist(g, u, ally) > 2) continue;
        ally.hp = Math.min(maxHP(ally), ally.hp + Math.round(maxHP(ally) * 0.20));
        ally.moved = false;
        ally.skillReposition = 0;
        // Keep attack usage and heavy movement limits intact, but allow
        // a full legal movement action even if the ally already attacked.
        ally.withdrawMove = !!ally.attacked;
      }
      log(g, 'Popular Uprising restores nearby allied formations.', u.side);
    }
    if(adjacent(g,s).some(t=>isSea(t)))
      for(const sw of g.units)if(sw.hp>0&&sw.side===u.side&&sw.cmd==='sawasaki'&&sw.expBeachheadStart!=null&&
        g.turn<=sw.expBeachheadUntil&&(sw.id===u.id||(TYPES[u.type].naval==='amphibious'&&dist(g,sw,s)<=2)))
        sw.expBeachheadUntil=Math.min(sw.expBeachheadStart+3,sw.expBeachheadUntil+1);

    if(u.cmd==='nonette' && u.expCaptureAttackTurn!==g.turn){u.attacked=false;u.expCaptureAttackTurn=g.turn;}
    if(u.cmd==='sugiyama'&&u.expCaptureMoveTurn!==g.turn){grantReposition(u,3);u.expCaptureMoveTurn=g.turn;}
    const kaguyas=g.units.filter(v=>v.hp>0&&v.side===u.side&&v.cmd==='kaguya'&&dist(g,v,s)<=3);
    if(kaguyas.length)for(const v of g.units)if(v.hp>0&&v.side===u.side&&!isAir(v)&&kaguyas.some(k=>dist(g,k,v)<=3))v.hp=Math.min(maxHP(v),v.hp+Math.round(maxHP(v)*.1));
    if (fx(u).specialOps && (s.gunReady || 0) > g.turn) s.gunReady--;
    log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} captures ${s.name}.`, u.side);
    hooks.capture?.(g, s, u, loser);
    honorAction(g, u, 'cities');
    if (s.capitalOf && s.capitalOf === loser) {
      honorAction(g, u, 'capitals');
      award(g, u.side, 'star', `${s.name} captured`, u, String(s.id));
    }
    // Preserve expeditionary forces, including carrier cargo, after their last city is lost.
    const expeditionSide = scenarioMeta(g).expeditionSide;
    const expeditionAfloat = loser === expeditionSide &&
      (g.units.some(v => v.side === loser && v.hp > 0) ||
       g.units.some(v => (v.cargo||[]).some(u => u.side === loser && u.hp > 0)));
    const annexed = g.mode !== 'campaign' && alive(g, loser) &&
      !g.stations.some(c => c.owner === loser) && !expeditionAfloat
      ? surrender(g, loser, u.side, s) : null;
    return { captured: s.name, annexed };
  }
  function move(g, id, c, r) {
    return collectAbilityVisuals(g, () => resolveMove(g,id,c,r));
  }
  function resolveMove(g, id, c, r) {
    const check = validateAction(g, { kind: 'move', id, c, r });
    if (!check.ok) return check;
    const u = check.actor, dest = check.destination, moveCost = check.cost;
    const from = { c: u.c, r: u.r },
      fromSea = isSea(tile(g, u.c, u.r)),
      t = TYPES[u.type],
      carrier = unitAt(g, dest);
    // Consume actual movement cost, not the whole bonus pool. Earned points
    // that cannot be used this turn remain available on Kallen's next turn.
    const oscarFreeMove = !!u.expOscarReposition;
    const originalActions = oscarFreeMove ? {
      moved:u.moved,attacked:u.attacked,skillReposition:u.skillReposition,
      withdrawMove:u.withdrawMove,eliteMoveAfterKill:u.eliteMoveAfterKill,
      akitoMoveReady:u.expAkitoMoveReady
    } : null;
    const kallenReposition = !oscarFreeMove && !!fx(u).firstStrike && !!u.expKallenReposition;
    const kallenNormalBonus = !oscarFreeMove && !!fx(u).firstStrike && !kallenReposition &&
      !u.skillReposition && !u.withdrawMove && !t.naval && !fromSea;
    const kallenBaseMove = kallenNormalBonus ? movement(g, u) - (u.expKallenMoveBank || 0) : 0;
    const kallenSpent = kallenReposition ? moveCost :
      kallenNormalBonus ? Math.max(0, moveCost - kallenBaseMove) : 0;
    // A legal move consumes the single post-attack Brain Raid movement grant.
    if (!oscarFreeMove) delete u.expAkitoMoveReady;
    // Boarding: the Knightmare goes aboard (off the map) and its action ends.
    if (carrier && carrier !== u && carrier.side === u.side && canBoard(g, carrier)) {
      markMoveAction(g, u);
      g.units.splice(g.units.indexOf(u), 1);
      u.c = dest.c;
      u.r = dest.r;
      u.moved = u.attacked = true;
      u.held = false;
      u.guardReady = false;
      u.skillReposition = 0;
      u.withdrawMove = false;
      if (kallenSpent) u.expKallenMoveBank = Math.max(0, (u.expKallenMoveBank || 0) - kallenSpent);
      delete u.expKallenReposition;
      u.movedDistance = (u.movedDistance || 0) + dist(g, from, dest);
      u.lastTurnMoved = true;
      u.boardedTurn = g.turn;
      (carrier.cargo ||= []).push(u);
      log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} boards the ${TYPES[carrier.type].air ? TYPES[carrier.type].name : 'Carrier-Battleship'}.`, u.side);
      return { ok: true, from, to: { c: dest.c, r: dest.r }, loaded: carrier.id };
    }
    markMoveAction(g, u);
    u.c = dest.c;
    u.r = dest.r;
    // Units aboard a Carrier-Battleship travel with it (rallies and other distance rules read their position).
    for (const c of u.cargo || []) {
      c.c = dest.c;
      c.r = dest.r;
    }
    u.moved = true;
    u.expRomeroMoved=true; // Once physically moved, Stand Fast stays off this turn.
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
    if(fromSea&&!isSea(dest)){u.expLandedTurn=g.turn;if(u.cmd==='sawasaki'){u.expBeachheadStart=g.turn;u.expBeachheadUntil=g.turn+2;}}
    u.lastTurnMoved = true;
    u.skillReposition = 0;
    u.withdrawMove = false;
    u.eliteMoveAfterKill = false;
    if (kallenSpent) u.expKallenMoveBank = Math.max(0, (u.expKallenMoveBank || 0) - kallenSpent);
    // Multiple earned movement points may be spent in successive legal
    // repositions, subject to the existing heavy-frame action limit.
    if (kallenReposition && u.expKallenMoveBank > 0 &&
        !heavyMoveLimitReached(g, u) && !freshLanding) {
      u.moved = false;
      u.skillReposition = u.expKallenMoveBank;
    } else if (!oscarFreeMove) {
      delete u.expKallenReposition;
    }
    // Oscar's 3-point reposition is free and independent of normal
    // movement/attack. Restore whatever action availability existed at
    // the moment of the reposition, including another earned reposition.
    if (oscarFreeMove) {
      u.moved=originalActions.moved;
      u.attacked=originalActions.attacked;
      u.skillReposition=originalActions.skillReposition;
      u.withdrawMove=originalActions.withdrawMove;
      u.eliteMoveAfterKill=originalActions.eliteMoveAfterKill;
      if(originalActions.akitoMoveReady)u.expAkitoMoveReady=originalActions.akitoMoveReady;
      delete u.expOscarReposition;
    }
    // The Last Promise banks one full extra move without bypassing heavy caps.
    if(u.expToruExtraMove>0&&u.hp>0&&!heavyMoveLimitReached(g,u)){
      u.expToruExtraMove--;u.moved=false;
    }
    // An unspent original move followed by Orderly Withdrawal earns one more
    // full movement action, respecting the existing heavy-frame two-move cap.
    if(u.expFarneseExtraMove > 0 && u.hp > 0 && !heavyMoveLimitReached(g,u) &&
       u.expFarneseSlaughterTurn !== g.turn && !oscarFreeMove) {
      u.expFarneseExtraMove--;
      u.moved=false;
      u.withdrawMove=true;
    }
    // Tactical redeployment preserves the original normal movement action.
    if(u.expMargaretRedeploy){u.moved=!!u.expMargaretRedeploy.wasMoved;delete u.expMargaretRedeploy;}
    if(u.expShadowMove){u.moved=true;delete u.expShadowMove;}
    reindex(g,u,from);
    // The Steady floor takes effect as soon as Leila or an ally enters her radius.
    if (u.cmd === 'leila' || u.cmd === 'fernando') applyLeilaMoraleFloor(g);
    else if (u.morale < 0 && moraleFloor(g, u) >= 0) u.morale = 0;
    const hostileReaction = newcomerOverwatch(g,u);
    if(u.hp<=0){checkVictory(g);return {ok:true,from,to:{c:dest.c,r:dest.r},destroyed:true,hostileReaction};}
    // Moving through enemy or neutral territory never changes its map color.
    const { captured, annexed } = captureCity(g, u, t.naval === 'amphibious' || (!t.naval && fromSea));
    const portCaptured = capturePort(g, u);
    const seized = seizeDeposit(g, u, dest);
    checkVictory(g);
    return { ok: true, from, to: { c: dest.c, r: dest.r }, captured, annexed, portCaptured, seized, hostileReaction };
  }
  // `last` is the city whose capture left the loser with none; anything it still held passes to the conqueror.
  function surrender(g, loser, winner, last) {
    (g.fallen ||= {})[loser] = { by: winner, turn: g.turn, city: last.name };
    recordWarEvent(g,'surrender',winner,{loser,city:last.name});
    // Clear strategic defenses while any remaining cities still identify their original owner.
    annexStrategic(g, loser);
    let cities = 0,
      units = 0;
    for (const s of g.stations) {
      // Defeated powers cannot keep ports, but third-party harbour control survives.
      if (s.portAt && s.portOwner === loser) s.portOwner = winner;
      if (s.owner === loser) {
        s.owner = winner;
        s.shield = Math.round(s.maxShield * 0.5);
        s.producedTurn = s.portProducedTurn = g.turn;
        fortify(g, s);
        cities++;
      }
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

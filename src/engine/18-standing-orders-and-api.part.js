  // ======== Standing orders ========
  // A player's unit can be given a destination (u.goto). At the start of each of its side's turns it moves as far
  // along the way as it can, until it arrives or the order is cancelled. Warships keep to the sea; other units take to
  // the sea only when the destination lies across it (amphibious frames go either way). It never attacks on its own.
  function gotoSurface(g, u, p) {
    const t = TYPES[u.type];
    if (t.naval === 'ship') return 'sea';
    return !t.naval && !atSea(g, u) && massOf(g, u) >= 0 && massOf(g, u) === massOf(g, p) ? 'land' : null;
  }
  function routeField(g, u, p) {
    const surface = gotoSurface(g, u, p),
      field = goalField(g, u.side, [[p, 0]], surface);
    // A stale map component or an impassable land route must not prevent a viable coastal journey.
    return surface === 'land' && !Number.isFinite(field[u.r * g.cols + u.c])
      ? goalField(g, u.side, [[p, 0]]) : field;
  }
  function gotoReason(g, u, p) {
    if (!u || u.hp <= 0) return 'Unavailable';
    if (g.over) return 'Operation over';
    if (u.side !== g.phase) return 'Not your unit';
    const t = p && tile(g, p.c, p.r),
      naval = TYPES[u.type].naval;
    if (!t) return 'Choose a hex on the map';
    if (TERRAIN[t.terrain]?.blocked) return 'Impassable terrain';
    if (naval === 'ship' && (!navigable(t) || stationAt(g, t))) return 'Warships stay at sea';
    if (!naval && isSea(t)) return 'Choose a land hex';
    if (t.c === u.c && t.r === u.r) return 'Already there';
    return Number.isFinite(routeField(g, u, t)[u.r * g.cols + u.c]) ? null : 'No route there';
  }
  function setGoto(g, id, c, r) {
    const u = g.units.find(v => v.id === id),
      p = tile(g, c, r),
      why = gotoReason(g, u, p);
    if (why) return { ok: false, reason: why };
    u.goto = { c: p.c, r: p.r };
    return { ok: true, goto: u.goto };
  }
  function clearGoto(g, id) {
    const u = g.units.find(v => v.id === id);
    if (!u?.goto) return { ok: false, reason: 'No destination set' };
    delete u.goto;
    return { ok: true };
  }
  // Arrived: on the destination, or beside it when it cannot be entered (occupied, or an enemy city it cannot take).
  function gotoDone(g, u, p) {
    if (u.c === p.c && u.r === p.r) return true;
    if (dist(g, u, p) > 1) return false;
    const occ = unitAt(g, p),
      st = stationAt(g, p);
    return (!!occ && occ !== u) || (!!st && foe(g, st.owner, u.side) && (st.shield > 0 || !canCapture(u)));
  }
  // Moves every unit of `side` with a destination one turn along its route, nearest first. Returns what happened:
  // moved [{ id, from, to, captured, seized, annexed }], arrived [id] (order complete), blocked [id] (no free hex
  // nearer this turn) and lost [id] (no route remains; order cancelled).
  function runGotos(g, side) {
    const report = { moved: [], arrived: [], blocked: [], lost: [] },
      fields = new Map();
    const orders = g.units
      .filter(u => u.side === side && u.hp > 0 && u.goto)
      .sort((a, b) => dist(g, a, a.goto) - dist(g, b, b.goto) || a.id - b.id);
    for (const u of orders) {
      if (g.over) break;
      const dest = tile(g, u.goto.c, u.goto.r);
      if (dest && gotoDone(g, u, dest)) {
        report.arrived.push(u.id);
        delete u.goto;
        continue;
      }
      const surface = dest && gotoSurface(g, u, dest),
        k = dest && `${dest.c},${dest.r},${surface}`;
      if (dest && !fields.has(k)) fields.set(k, goalField(g, side, [[dest, 0]], surface));
      let field = dest && fields.get(k);
      if (surface === 'land' && field && !Number.isFinite(field[u.r * g.cols + u.c])) {
        const fallbackKey = `${dest.c},${dest.r},null`;
        if (!fields.has(fallbackKey)) fields.set(fallbackKey, goalField(g, side, [[dest, 0]]));
        field = fields.get(fallbackKey);
      }
      const cost = p => field[p.r * g.cols + p.c],
        here = field ? cost(u) : Infinity;
      if (!Number.isFinite(here)) {
        report.lost.push(u.id);
        delete u.goto;
        continue;
      }
      let best = null;
      for (const key of reachable(g, u).keys()) {
        const [c, r] = key.split(',').map(Number),
          p = tile(g, c, r),
          v = cost(p);
        if (unitAt(g, p) || !(v < here)) continue;
        if (!best || v < best.v || (v === best.v && dist(g, p, dest) < dist(g, best.p, dest))) best = { p, v };
      }
      const m = best && move(g, u.id, best.p.c, best.p.r);
      if (!m?.ok) {
        report.blocked.push(u.id);
        continue;
      }
      report.moved.push({ id: u.id, from: m.from, to: m.to, captured: m.captured, seized: m.seized, annexed: m.annexed });
      if (gotoDone(g, u, dest)) {
        report.arrived.push(u.id);
        delete u.goto;
      }
    }
    return report;
  }
  root.Knightmare = {
    FACTIONS,
    MAJORS,
    CLASSES,
    NAVAL,
    PORT,
    navalTypes,
    portSite,
    normalizeResearch,
    allUnits,
    setTileOwner,
    setTileTerrain,
    deploy,
    deployReason,
    deployTargets,
    CLASS_ORDER,
    TYPES,
    ROSTER,
    LINEUPS,
    typeFor,
    ELITE_FORCES,
    ELITE_MAX_LEVEL,
    ELITE_UNLOCK_FRAGMENTS,
    ELITE_UPGRADE_FRAGMENTS,
    eliteProfile,
    eliteRecord,
    eliteStats,
    eliteFx,
    eliteUpgradeReason,
    upgradeElite,
    grantEliteFragments,
    eliteVictoryReward,
    elitePrice,
    eliteDeployReason,
    deployElite,
    unitStats,
    applyElites,
    lineupOf,
    COMMANDERS,
    RATINGS,
    TERRAIN_CODES,
    hooks,
    foe,
    defaultOfficer,
    fortify,
    claim,
    kill,
    isReady,
    TERRAIN,
    WORLD,
    hexOf,
    lonLatOf,
    reinforceCost,
    repairCost,
    BUILDINGS,
    buildingLevel,
    buildCost,
    build,
    AUTOMATION_DEFAULT_RESERVE,
    automationState,
    automationUnitOptions,
    cityAutomation,
    setCityAutomation,
    automationReserveAllows,
    runCityAutomation,
    bulkCityUpgrade,
    FORTRESS_GUN,
    fortressName,
    fortressReady,
    fortressDamage,
    fortressTargets,
    fireFortress,
    ERAS,
    ARMISTICE,
    objectiveText,
    modeTitle,
    TECH_TREE,
    TECH_NODES,
    TECH_TIERS,
    TOKEN_REWARD,
    normalizeResearch,
    carrierCapacity,
    DIFFICULTIES,
    UPGRADE,
    operationKey,
    ROMAN,
    BRANCHES,
    BRANCH_NAMES,
    branchOf,
    techLevel,
    techValue,
    applyTech,
    missionReward,
    fortressRecharge,
    fortressRange,
    rangeOf,
    RANKS,
    RANK_HP,
    PROMOTE_COST,
    MEDALS,
    GENERIC_SKILLS,
    GENERIC_RESPEC_COST,
    genericSlots,
    genericDescription,
    genericLevel,
    genericCost,
    genericReason,
    buyGeneric,
    removeGenericReason,
    removeGeneric,
    officer,
    medalSlots,
    moraleFloor,
    STARTERS,
    recruitPrice,
    roster,
    owns,
    officerOf,
    applyRoster,
    recruitReason,
    recruitCommander,
    MAX_RATING,
    starCost,
    starReason,
    buyStar,
    promoteCost,
    promote,
    equipMedal,
    unequipMedal,
    applyProfile,
    shortfall,
    repairReason,
    reinforceReason,
    buyReason,
    buildReason,
    researchReason,
    assignReason,
    feintReason,
    promoteReason,
    equipReason,
    clamp,
    key,
    distance,
    opponents: side => MAJORS.filter(s => s !== side),
    alive,
    tile,
    adjacent,
    within,
    unitAt,
    stationAt,
    random,
    log,
    maxHP,
    migrateSave,
    newUnit,
    movement,
    seaMove,
    atSea,
    isSea,
    isCoast,
    navigable,
    packSave,
    unpackSave,
    reachable,
    hasOrders,
    targets,
    preview,
    move,
    attack,
    income,
    price,
    canBuy,
    recruitOptions,
    recruit,
    reinforce,
    repair,
    researchCost,
    research,
    assign,
    feint,
    beginTurn,
    checkVictory,
    createGame,
    goalField,
    gotoReason,
    setGoto,
    clearGoto,
    runGotos,
    canCapture,
    // Sakuradite.
    SAKURADITE,
    RESOURCE_SITES,
    RULES_VERSION,
    setupSakuradite,
    depositHost,
    depositOwner,
    depositOf,
    depositYield,
    depositShares,
    siteAt,
    cityYield,
    refineReason,
    refine,
    // F.L.E.I.J.A.
    FLEIJA,
    ELIMINATOR,
    hasFleija,
    eliminatorUnlocked,
    eliminatorTurn,
    eliminatorReason,
    startEliminator,
    eliminatorDefender,
    projectReason,
    startProject,
    launchReason,
    launch,
    blastArea,
    targetName,
    aiLaunchTarget,
    // Black Knights and JLF commanders.
    ALLIES,
    serves,
    commandTargets,
    actionTargets,
    commanderStatsText,
    commanderStatusText,
  };
  // Shared with the engine's own parts (engine/ai.js); not part of the game's API.
  Object.defineProperty(root.Knightmare, 'internal', {
    value: {
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
      isCoast,
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
    },
  });
  if (typeof module !== 'undefined') {
    module.exports = root.Knightmare;
    require('./engine/ai.js');
  }
})(typeof window !== 'undefined' ? window : globalThis);

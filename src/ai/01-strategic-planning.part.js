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
  // Human-player targeting preference is Conquest-only, at every difficulty.
  // Scenarios and Campaign never favor player-owned targets, even if a game has
  // an explicit aiPlayerPriorityBonus override. This changes decisions only.
  const PLAYER_PRIORITY_DEFAULT = 1;
  function playerPriorityBonus(g, side) {
    if (g?.mode !== 'conquest' || !g.player || side === g.player || !foe(g, g.player, side)) return 0;
    const value = Number(g.aiPlayerPriorityBonus ?? PLAYER_PRIORITY_DEFAULT);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : PLAYER_PRIORITY_DEFAULT;
  }
  function playerPriorityTarget(g, side, owner) {
    return g?.mode === 'conquest' && owner === g.player && owner !== side && foe(g, owner, side);
  }
  function playerPrioritySeeds(g, side, seeds = goalSeeds(g, side)) {
    const bonus = playerPriorityBonus(g, side);
    if (!bonus) return seeds;
    return seeds.map(([p, cost]) => [p, playerPriorityTarget(g, side, p.owner) ? cost - 6 * bonus : cost]);
  }
  // Operational layer: compact objectives derived from the authoritative front plan.
  // These are assessments, not a parallel ownership/map/combat implementation.
  // History uses stable front/city IDs and survives a save/load without requiring
  // a versioned save migration. Transient references stay in the turn-local memo.
  const OPERATIONAL = { stallTurns: 4, staleTurns: 8, maxHistory: 160 };
  function aiOperationalPlan(g, side, memo) {
    const state = ((g.ai ||= {})[side] ||= {}),
      old = state.objectiveHistory || {},
      next = {},
      units = new Map(allUnits(g).filter(u => u.hp > 0 && u.side === side).map(u => [String(u.id), u])),
      stations = new Map(g.stations.map(s => [String(s.id), s])),
      assignments = new Map();
    for (const [id, frontId] of Object.entries(memo.assign || {})) {
      if (!frontId || !units.has(String(id)) || memo.guards?.[id] ||
          memo.recoveries?.has(Number(id)) || memo.reserve?.units?.includes(Number(id))) continue;
      if (!assignments.has(frontId)) assignments.set(frontId, []);
      assignments.get(frontId).push(units.get(String(id)));
    }
    const operations = [], byUnit = {}, byFront = {};
    for (const f of memo.fronts || []) {
      const candidates = (f.objectives || []).map(o => ({
        city: stations.get(String(o.id)),
        value: Number(o.value) || 0,
        defend: !!o.defend
      })).filter(o => o.city && (f.type === 'offensive'
        ? foe(g, o.city.owner, side) && !o.defend
        : o.city.owner === side));
      candidates.sort((a, b) => b.value - a.value ||
        Number(!!b.city.capitalOf) - Number(!!a.city.capitalOf) ||
        String(a.city.id).localeCompare(String(b.city.id)));
      const city = candidates[0]?.city || stations.get(String(f.anchor?.id)) || null;
      if (!city) continue;
      const defending = f.type !== 'offensive',
        members = (assignments.get(f.id) || []).sort((a, b) => a.id - b.id),
        positioned = members.filter(u => dist(g, u, city) <= 5),
        near = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) &&
          u.side !== 'neutral' && dist(g, u, city) <= 6),
        enemyStrength = near.reduce((n, u) => n + unitStrength(u), 0),
        localStrength = positioned.reduce((n, u) => n + unitStrength(u), 0),
        nearest = members.length ? Math.min(...members.map(u => dist(g, u, city))) : null,
        identity = String(f.id) + ':' + String(city.id),
        last = old[identity],
        attacking = !defending && f.state === 'attacking',
        progress = !last || last.lastTurn < g.turn - 1 ||
          (city.shield || 0) < last.shield - 1 ||
          (nearest != null && last.nearest != null && nearest < last.nearest) ||
          enemyStrength < last.enemyStrength - 0.5,
        stalled = attacking && members.length && !progress
          ? Math.min(20, (last.stalled || 0) + 1) : 0,
        required = Math.max(2, Number(f.desiredStrength) || 2),
        value = Math.max(1, candidates[0]?.value || f.strategicValue || f.priority || 1) +
          (city.capitalOf ? 20 : 0) + (city.portAt ? 6 : 0) +
          (city.tier >= 3 ? 4 : 0),
        type = defending
          ? city.capitalOf === side ? 'defend_capital' : 'defend_city'
          : city.shield > 150 && (city.fort || city.tier >= 3) ? 'breakthrough'
          : city.portAt && f.overseas ? 'secure_port' : 'capture_city',
        risk = +(enemyStrength / Math.max(1, localStrength)).toFixed(2),
        record = {
          id: identity, frontId: f.id, targetCityId: city.id, type,
          priority: +(Number(f.priority || value)).toFixed(2),
          strategicValue: +value.toFixed(2), requiredStrength: +required.toFixed(2),
          assignedStrength: +members.reduce((n, u) => n + unitStrength(u), 0).toFixed(2),
          availableStrength: +localStrength.toFixed(2), enemyStrength: +enemyStrength.toFixed(2),
          estimatedRisk: risk, assignedUnits: members.map(u => u.id),
          progress: defending ? 'holding' : stalled >= OPERATIONAL.stallTurns ? 'stalled'
            : f.state === 'assembling' || f.state === 'regrouping' ? 'gathering' : 'advancing',
          stalledTurns: stalled, lastReassessmentTurn: g.turn,
          abandonment: defending ? 'city lost or front removed'
            : 'city captured, inaccessible, or superseded by a higher-priority front',
          target: { c: city.c, r: city.r }
        };
      // Keep previous progress only when we have the same city and consecutive
      // turns. A reloaded game without a prior ledger starts fresh.
      next[identity] = { lastTurn: g.turn, shield: city.shield || 0,
        enemyStrength, nearest, stalled };
      operations.push(record);
      byFront[f.id] = record;
      for (const u of members) byUnit[u.id] = record;
    }
    // Bound long-running saves: do not retain histories of completed fronts.
    for (const [id, value] of Object.entries(old))
      if (!next[id] && g.turn - (value.lastTurn || 0) <= OPERATIONAL.staleTurns &&
          Object.keys(next).length < OPERATIONAL.maxHistory) next[id] = value;
    state.objectiveHistory = next;
    memo.operations = operations;
    memo.operationByUnit = byUnit;
    memo.operationByFront = byFront;
    return operations;
  }
  // Tactical preferences only: legality, counter-fire and combat effects are
  // still evaluated and executed by the existing engine APIs.
  function aiOperationalAttackBias(g, u, p, defender, station, memo) {
    const op = memo.operationByUnit?.[u.id];
    if (!op || memo.assign?.[u.id] !== op.frontId ||
        (op.type !== 'defend_city' && op.type !== 'defend_capital' &&
         !foe(g, stationAt(g, op.target)?.owner, u.side))) return 0;
    const d = dist(g, p, op.target),
      capture = op.type === 'capture_city' || op.type === 'breakthrough' || op.type === 'secure_port';
    if (capture) {
      if (station && station.id === op.targetCityId)
        return 28 + (op.progress === 'stalled' ? 18 : 0) +
          (TYPES[u.type].branch === 'Artillery' && station.shield > 0 ? 16 : 0);
      if (defender && d <= 2) return 25 + (d === 1 ? 9 : 0);
      // Do not abandon a locally threatened formation merely because its
      // current enemy is outside the objective's immediate perimeter.
      return d > 6 ? -Math.min(18, (d - 6) * 3) : 0;
    }
    if (defender && d <= 3) return 16 + (d <= 1 ? 12 : 0);
    return 0;
  }
  function aiOperationalMoveBias(g, u, p, memo, enemies, friends) {
    const op = memo.operationByUnit?.[u.id];
    if (!op || !p || isSea(p) || memo.assign?.[u.id] !== op.frontId ||
        (op.type !== 'defend_city' && op.type !== 'defend_capital' &&
         !foe(g, stationAt(g, op.target)?.owner, u.side))) return 0;
    const nearby = enemies.filter(v => dist(g, v, p) <= 3).length,
      cover = friends.filter(v => !isShip(v) && !atSea(g, v) && dist(g, v, p) <= 2).length,
      branch = TYPES[u.type]?.branch;
    if (branch === 'Artillery') {
      // Avoid leaving guns unsupported at the front; the bonus saturates
      // rather than incentivizing a traffic jam around one battery.
      return Math.min(24, cover * 8) - Math.max(0, nearby - cover) * 15;
    }
    if (u.cmd && u.hp / maxHP(u) < 0.5 && nearby > cover)
      return -Math.min(40, 12 * (nearby - cover));
    if (op.progress === 'stalled' && op.type !== 'defend_city' &&
        op.type !== 'defend_capital' && cover >= 1 &&
        dist(g, p, op.target) <= 4) return 8;
    return 0;
  }
  // Each AI turn starts with a plan: garrisons, then (Conquest) the theaters it fights in. Campaign battlefields are a
  // single theater and keep one side-wide goal field.
  function aiPlan(g, side) {
    let memo = aiMemo.get(g);
    if (!memo) aiMemo.set(g, (memo = {}));
    if (!memo[side] || memo[side].turn !== g.turn) {
      // Campaign scripting stays authoritative. Scenarios use a doctrine
      // selected by ID, persistent theaters and commander recovery where enabled.
      // Scenario AI no longer diverts field armies into temporary city responses;
      // Normal Division Japan Britannia retains its specifically assigned garrisons.
      const scenario = g.mode === 'scenario',
        doctrine = scenario ? scenarioDoctrine(g) : null,
        ai = scenarioMeta(g).ai || {},
        recovery = !scenario || doctrine === 'division' || doctrine === 'europe' || !!ai.recovery;
      memo[side] = { turn: g.turn, doctrine,
        guards: scenario ? (ai.guards === 'indochina'
          ? assignIndochinaGuards(g, side)
          : ai.guards === 'luoyang' && side === 'cf'
            ? assignLuoyangGuards(g, side) : assignDivisionBritanniaGuards(g, side))
          : assignGuards(g, side) };
      if (recovery) planRecovery(g, side, memo[side]);
      if (g.mode === 'campaign') memo[side].field = goalField(g, side);
      else if (scenario) planScenarioOffense(g, side, memo[side]);
      else planFronts(g, side, memo[side]);
      aiOperationalPlan(g, side, memo[side]);
    }
    return memo[side];
  }

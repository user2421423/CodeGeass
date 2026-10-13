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
  // Each AI turn starts with a plan: garrisons, then (Conquest) the theaters it fights in. Campaign battlefields are a
  // single theater and keep one side-wide goal field.
  function aiPlan(g, side) {
    let memo = aiMemo.get(g);
    if (!memo) aiMemo.set(g, (memo = {}));
    if (!memo[side] || memo[side].turn !== g.turn) {
      // Campaign scripting stays authoritative. Scenarios use a doctrine
      // selected by ID; multi-front battles get mobile (not permanent) defense
      // and commander recovery, while rapid assaults retain their tempo.
      const scenario = g.mode === 'scenario',
        doctrine = scenario ? scenarioDoctrine(g) : null,
        recovery = !scenario || doctrine === 'division' || doctrine === 'europe';
      memo[side] = { turn: g.turn, doctrine, guards: scenario ? {} : assignGuards(g, side) };
      if (recovery) planRecovery(g, side, memo[side]);
      if (g.mode === 'campaign') memo[side].field = goalField(g, side);
      else if (scenario) planScenarioOffense(g, side, memo[side]);
      else planFronts(g, side, memo[side]);
    }
    return memo[side];
  }

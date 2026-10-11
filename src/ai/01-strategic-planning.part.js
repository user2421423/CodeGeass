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
  // Faction-neutral targeting preference for the human player, used ONLY in Conquest and Scenario, at every
  // difficulty. A bonus of 1 doubles the weight of hostile player targets; set g.aiPlayerPriorityBonus (0-1) per game
  // to override it (0 reproduces the old targeting). It changes decisions only, never unit stats, income, diplomacy,
  // legal movement or fog of war, and allies of the player never receive it.
  const PLAYER_PRIORITY_DEFAULT = 1;
  function playerPriorityBonus(g, side) {
    if (!['conquest', 'scenario'].includes(g?.mode) || !g.player || side === g.player || !foe(g, g.player, side)) return 0;
    const value = Number(g.aiPlayerPriorityBonus ?? PLAYER_PRIORITY_DEFAULT);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : PLAYER_PRIORITY_DEFAULT;
  }
  function playerPriorityTarget(g, side, owner) {
    return owner === g.player && owner !== side && foe(g, owner, side);
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
      // Japan Scenario is an all-out city offensive: no guards, defensive
      // fronts, recovery retreats or offensive assembly delays.
      const rush = g.mode === 'scenario';
      memo[side] = { turn: g.turn, guards: rush ? {} : assignGuards(g, side) };
      if (!rush) planRecovery(g, side, memo[side]);
      if (g.mode === 'campaign') memo[side].field = goalField(g, side);
      else if (rush) planScenarioOffense(g, side, memo[side]);
      else planFronts(g, side, memo[side]);
    }
    return memo[side];
  }

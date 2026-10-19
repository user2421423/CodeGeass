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
      if (g.mode === 'campaign') {
        // Story escape and boarding missions are not ordinary annihilation battles.
        // Follow the *next incomplete* victory objective, including allied territory;
        // never disclose hidden information, change movement rules or teleport units.
        const escapeMissions = new Set(['bk5', 'bk_rescue', 'bk_yokosuka2', 'br_yokosuka2']);
        if (side === g.player && g.difficulty === 'normal' && escapeMissions.has(g.campaign?.id)) {
          const mission = E.campaign?.mission?.(g.campaign.id);
          const stages = Array.isArray(mission?.win) ? mission.win : [mission?.win];
          const stage = stages.find(rule => {
            if (rule?.capture) return rule.capture.some(n => {
              const s = g.stations.find(s => s.name === n);
              return s && foe(g, s.owner, side);
            });
            if (rule?.reach) return rule.reach.some(n => {
              const s = g.stations.find(s => s.name === n);
              return s && !g.units.some(u => u.hp > 0 && u.side === side &&
                u.c === s.c && u.r === s.r && (!rule.by || u.cmd === rule.by));
            });
            return false;
          });
          const name = stage?.capture?.[0] || stage?.reach?.[0];
          const goal = g.stations.find(s => s.name === name);
          if (goal) {
            g.campaign.goals[side] = [[goal.c, goal.r, -24]];
            g.campaign.aiObjective = { side, c: goal.c, r: goal.r, type: stage.capture ? 'capture' : 'reach' };
          } else {
            g.campaign.aiObjective = null;
          }
        }
        memo[side].field = goalField(g, side);
      }
      else if (scenario) planScenarioOffense(g, side, memo[side]);
      else planFronts(g, side, memo[side]);
    }
    return memo[side];
  }

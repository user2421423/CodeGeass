  // Economic planner: transient advisory state only. Never stored in g.ai/save files.
  // All prices and all final purchase restrictions remain owned by the engine.
  const AI_ECONOMY_RESOURCES = ['credits', 'industry', 'science', 'sakuradite'];
  const aiEconomyCache = new WeakMap();
  function aiEconomicPlan(g, side, memo, bases, foes, nearestEnemy) {
    let bySide = aiEconomyCache.get(g);
    if (!bySide) aiEconomyCache.set(g, (bySide = new Map()));
    const existing = bySide.get(side);
    if (existing?.turn === g.turn && existing.memo === memo) return existing;
    const wallet = funds(g, side), incoming = income(g, side),
      horizons = { campaign: 3, scenario: 5, conquest: 8 },
      horizon = Math.max(3, Math.min(8, Number(g.aiEconomyHorizon) || horizons[g.mode] || 5)),
      fronts = memo.fronts || [],
      shortages = fronts.reduce((sum, f) => sum + Math.max(0,
        f.deficit ?? ((f.desiredStrength || 0) - (f.arrivingFour ?? f.assigned ?? 0))), 0),
      threatened = bases.filter(s => nearestEnemy(s) <= 3),
      critical = threatened.some(s => nearestEnemy(s) <= 2 && s.shield < s.maxShield * 0.6),
      defensive = critical || fronts.some(f => f.type === 'defensive' &&
        (f.deficit ?? (f.desiredStrength || 0) - (f.assigned || 0)) > 0),
      offensive = !defensive && fronts.some(f => f.type === 'offensive'),
      mode = defensive ? 'defensive' : offensive ? 'offensive' : 'consolidation',
      factoryCount = bases.filter(s => s.tier > 0).length,
      safeCapacity = bases.filter(s => s.tier > 0 && nearestEnemy(s) > 3).length,
      basic = price(typeFor(side, 'scout', g), 2, g, side),
      expectedTurns = g.mode === 'campaign' ? 10 : g.mode === 'scenario'
        ? Math.max(14, Math.min(45, 12 + Math.ceil(g.stations.length / 2)))
        : 60,
      forecast = Object.fromEntries(AI_ECONOMY_RESOURCES.map(k =>
        [k, Math.max(0, wallet[k] || 0) + Math.max(0, incoming[k] || 0) * horizon]));
    // Army replacements matter most when fronts have shortages; no safe factory
    // means preserving an arbitrary production reserve has no tactical benefit.
    const needed = factoryCount && (shortages > 0 || threatened.length || foes.length);
    const protectedCredits = needed ? Math.min(wallet.credits || 0,
      Math.max(60, Math.round(basic.credits * (defensive ? 1.25 : 1)))) : 0;
    const protectedIndustry = needed ? Math.min(wallet.industry || 0,
      Math.round(basic.industry * (defensive ? 1.25 : 1))) : 0;
    const budget = {
      // Evaluate *current* wallet after every engine action. This is deliberate:
      // allocations cannot be double-counted across sequential purchases.
      allows(cost, category = 'production', emergency = false) {
        if (!cost || AI_ECONOMY_RESOURCES.some(k =>
          !Number.isFinite(cost[k] || 0) || (cost[k] || 0) < 0 ||
          (cost[k] || 0) > (wallet[k] || 0))) return false;
        const investment = ['city', 'factory', 'lab', 'refinery', 'port', 'reinforce'].includes(category);
        if (investment && critical && !emergency) return false;
        // Never spend the last formation's resources on marginal investments
        // while factories can feed an active front.
        if (investment && !emergency && needed) {
          if ((wallet.credits || 0) - (cost.credits || 0) < protectedCredits ||
              (wallet.industry || 0) - (cost.industry || 0) < protectedIndustry) return false;
        }
        return true;
      },
    };
    function cityScore(s, cost) {
      const distance = nearestEnemy(s), level = cityTierOf(s);
      if (level >= 4 || distance <= 2 || s.shield < s.maxShield * 0.5) return -Infinity;
      if (level === 3) {
        // Defensive batteries are valuable on approaches, not in the rear.
        return distance >= 3 && distance <= 8 &&
          (defensive || fronts.some(f => f.type === 'defensive')) ? 95 - distance * 2 : -Infinity;
      }
      // City tiers earn credits; long operations can justify their payback.
      const yieldPerTurn = level === 1 ? 8 : 10;
      const payback = (cost.credits || 0) / yieldPerTurn;
      if (payback > expectedTurns || distance < 5) return -Infinity;
      return (expectedTurns - payback) * 2 + Math.min(distance, 12) +
        (s.capital ? 8 : 0) - (defensive ? 25 : 0);
    }
    function buildingScore(s, kind, cost, deposit = null) {
      const distance = nearestEnemy(s);
      if (distance <= 2 || s.shield < s.maxShield * 0.5) return -Infinity;
      if (kind === 'refinery') {
        if (!deposit || !deposit.base) return -Infinity;
        return 18 + deposit.base * 1.6 + Math.min(10, distance) - (defensive ? 24 : 0);
      }
      if (kind === 'factory') {
        const canUse = fronts.some(f => !f.overseas || (s.portLevel || 0) > 0);
        if (!canUse && !foes.some(u => dist(g, u, s) < 9)) return -Infinity;
        const improvement = (s.tier || 0) < 3 ? 10 : 0;
        return improvement * Math.min(10, expectedTurns / 4) +
          (s.tier === 1 && shortages > 0 ? 18 : 0) - (distance < 4 ? 16 : 0) -
          (defensive ? 12 : 0) - (cost.credits || 0) / 25;
      }
      if (kind === 'lab') {
        // Wartime labs generate science for advanced frames. This is NOT HQ
        // technology purchasing, which consumes persistent player tokens.
        const advanced = fronts.some(f => (f.need || []).some(cls =>
          ['medium', 'rocket', 'heavy', 'siege', 'super'].includes(cls)));
        const scienceScarce = (wallet.science || 0) < (incoming.science || 0) * 2;
        if (!advanced && !scienceScarce) return -Infinity;
        return 28 + (advanced ? 20 : 0) + (scienceScarce ? 22 : 0) -
          (cost.credits || 0) / 15 - (distance < 4 ? 18 : 0);
      }
      return -Infinity;
    }
    function frameScore(s, type, front, already, cost) {
      const t = TYPES[type];
      if (!t || t.naval) return -Infinity;
      const eta = front ? frontArrival(g, s, front) : nearestEnemy(s);
      if (!Number.isFinite(eta) || (front && eta > 14)) return -Infinity;
      const wanted = front?.need || [], role = wanted.indexOf(t.cls),
        group = already.filter(u => TYPES[u.type]?.branch === t.branch).length,
        total = Math.max(1, already.length),
        desired = t.branch === 'Armor' ? 0.5 : 0.25,
        shortage = Math.max(0, front?.deficit ?? (front?.desiredStrength || 0) - (front?.assigned || 0)),
        enemyArmor = (front?.enemies || []).filter(u => TYPES[u.type]?.branch === 'Armor').length,
        perCredit = ((t.attack || 20) + (t.armor || 0) * 0.7 +
          (t.hp || 100) * 0.12) / Math.max(1, cost.credits || 1);
      return (role < 0 ? 0 : 44 - role * 4) +
        (desired - group / total) * 35 + shortage * 1.5 +
        (front?.type === 'defensive' && t.branch === 'Armor' ? 12 : 0) +
        (front?.type === 'offensive' && t.cls === 'siege' ? 9 : 0) +
        (enemyArmor && ['assault', 'super'].includes(t.cls) ? 9 : 0) +
        perCredit * 30 - eta * 1.8;
    }
    const result = { turn: g.turn, memo, side, horizon, expectedTurns, mode,
      forecast, income: incoming, budget, shortages, critical, safeCapacity,
      cityScore, buildingScore, frameScore };
    bySide.set(side, result);
    return result;
  }
  // Exposed for deterministic diagnostics; no AI planning state is persisted.
  E.aiEconomicPlan = aiEconomicPlan;

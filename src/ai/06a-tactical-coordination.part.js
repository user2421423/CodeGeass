  // Local, bounded tactical assessments shared by AI selection and execution.
  function commanderValue(g, v) {
    if (!v?.cmd) return 0;
    const o = E.officerOf(g, v), rank = o?.rank || 0;
    const mobility = Math.max(0, E.movement(g, v) - (TYPES[v.type]?.move || 0));
    return Math.min(150, 30 + rank * 13 + mobility * 7 + Math.max(0, maxHP(v) - 110) * 0.09);
  }
  // Firepower a hit takes off the board: power falls by 60% of the share of health
  // lost, and a kill removes what was left. Ranged formations count a quarter more.
  function threatRemoved(g, v, damage) {
    if (!v || v.hp <= 0 || damage <= 0) return 0;
    const t = TYPES[v.type], full = maxHP(v);
    if (!t || !full) return 0;
    const firepower = (t.attack || 0) * (1 + 0.35 * Math.max(0, (v.stack || 1) - 1)) *
      (rangeOf(g, v).max >= 3 ? 1.25 : 1);
    return firepower * (damage >= v.hp ? 0.4 + 0.6 * v.hp / full : 0.6 * damage / full);
  }
  function localThreat(g, u, p) {
    let expected = 0;
    for (const v of g.units) {
      if (v.hp <= 0 || !foe(g, v.side, u.side) || atSea(g, v) || (isAir(u) && !canHitAir(v))) continue;
      const d = dist(g, v, p);
      if (d > 7) continue;
      const r = rangeOf(g, v).max;
      if (d <= r + Math.min(3, E.movement(g, v))) {
        const attack = TYPES[v.type]?.attack || 0;
        expected += attack * (1 + 0.35 * Math.max(0, v.stack - 1)) * (d <= r ? 0.7 : 0.35);
      }
    }
    return expected;
  }
  function focusValue(g, u, enemy, initial, memo) {
    if (!enemy || enemy.hp <= 0) return 0;
    memo.focusCache ||= new Map();
    const k = enemy.id + ':' + enemy.hp + ':' + u.id + ':' + u.c + ':' + u.r;
    if (memo.focusCache.has(k)) return memo.focusCache.get(k);
    // The other units' shots at `enemy`, which do not depend on the hex u is being tried on: a maneuver scan
    // (memo.helperShots) computes them once per target instead of once per candidate hex.
    const hk = enemy.id + ':' + enemy.hp;
    let shots = memo.helperShots?.get(hk);
    if (!shots) {
      shots = [];
      for (const v of g.units) {
        if (shots.length >= 7) break;
        if (v.id === u.id || v.side !== u.side || v.hp <= 0 || v.attacked || v.morale <= -3 ||
            dist(g, v, enemy) > Math.min(6, rangeOf(g, v).max)) continue;
        const shot = preview(g, v.id, enemy.c, enemy.r);
        if (!shot || shot.unit <= 0) continue;
        shots.push(shot.unit);
      }
      memo.helperShots?.set(hk, shots);
    }
    const helpers = shots.length;
    let potential = initial.unit;
    for (const n of shots) potential += n;
    const marked = memo.focusTargets?.get(enemy.id);
    const feasible = helpers && potential >= enemy.hp * 0.92;
    const value = (feasible ? 100 + Math.min(45, commanderValue(g, enemy) * 0.3) : 0) +
      (marked?.turn === g.turn && dist(g, u, enemy) <= 6 ? 62 : 0) -
      (initial.counter > u.hp * 0.8 ? 55 : 0);
    if (memo.focusCache.size > 500) memo.focusCache.clear();
    memo.focusCache.set(k, value);
    return value;
  }
  function trafficBoost(g, u, memo) {
    if (u.hold || memo.guards?.[u.id] || u.moved) return 0;
    memo.trafficCache ||= new Map();
    if (memo.trafficCache.has(u.id)) return memo.trafficCache.get(u.id);
    // A unit at the head of a column acts before nearby followers whose
    // route cost is higher. This clears occupied tiles without displacing guards.
    const front = memo.assign?.[u.id], route = fieldFor(g, memo, u);
    const position = route(u);
    let followers = 0;
    for (const v of g.units) {
      if (v.side !== u.side || v.id === u.id || v.hp <= 0 || v.hold ||
          memo.guards?.[v.id] || v.moved || dist(g, v, u) > 2) continue;
      if (front != null && memo.assign?.[v.id] != null && memo.assign[v.id] !== front) continue;
      if (route(v) + 0.1 < position) continue;
      followers++;
      if (followers >= 4) break;
    }
    const value = Math.min(1.6, followers * 0.45);
    memo.trafficCache.set(u.id, value);
    return value;
  }
  function aiNextActor(g, ids, start) {
    if (start >= ids.length) return start;
    const first = g.units.find(v => v.id === ids[start]);
    if (!first) return start;
    const memo = aiPlan(g, first.side);
    memo.actors ||= new Map(g.units.map(u => [u.id, u]));
    let selected = start, best = -Infinity;
    for (let i = start; i < Math.min(ids.length, start + 16); i++) {
      const u = memo.actors.get(ids[i]);
      if (!u || u.hp <= 0 || u.attacked || !isReady(g, u)) continue;
      const priority = aiOrderPriority(g, u);
      // Defensive emergencies remain authoritative over opportunistic attacks.
      let score = priority < -2 ? 1500 - priority * 20 :
        -priority * 32 + trafficBoost(g, u, memo) * 24;
      for (const p of targets(g, u).slice(0, 12)) {
        const shot = preview(g, u.id, p.c, p.r);
        if (!shot) continue;
        const enemy = unitAt(g, p), city = stationAt(g, p);
        const value = shot.unit + shot.shield * 0.6 - shot.counter * 0.45 +
          (enemy && shot.unit >= enemy.hp ? 135 : 0) +
          (enemy ? commanderValue(g, enemy) + focusValue(g, u, enemy, shot, memo) +
            threatRemoved(g, enemy, shot.unit) : 0) +
          (city && foe(g, city.owner, u.side) && city.shield <= shot.shield ? 65 : 0);
        const human = playerPriorityTarget(g, u.side, enemy?.side) ||
          playerPriorityTarget(g, u.side, city?.owner);
        score = Math.max(score, (human ? value * (1 + playerPriorityBonus(g, u.side)) : value) - priority * 14);
      }
      if (score > best || (score === best && ids[i] < ids[selected])) {
        best = score;
        selected = i;
      }
    }
    return selected;
  }

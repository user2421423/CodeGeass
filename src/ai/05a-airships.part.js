  // ======== Airships ========
  // Airships fly over everything, carry two formations and never heal on their own. Their orders run only for a
  // unit whose type has `air` (Carrier-Battleships keep aiCarrier). Each turn, in this order: a badly damaged
  // airship repairs beside a friendly city or flies to the safest hex near one; a healthy one lifts idle troops
  // standing next to it; with troops aboard it drops them where they can take an empty city or reach one soon;
  // then it takes the best-value shot, weighing return fire heavily; with nothing to hit it waits safely near the front.
  function aiAirship(g, u, memo, events) {
    if (!isAir(u) || !isReady(g, u)) return;
    const id = u.id, side = u.side, full = maxHP(u),
      health = () => u.hp / full,
      foeCities = g.stations.filter(s => foe(g, s.owner, side)),
      ownCities = g.stations.filter(s => s.owner === side),
      nearest = (list, p) => list.reduce((best, s) => Math.min(best, dist(g, s, p)), 99),
      // Expected incoming fire next turn as a share of the hull; it matters more the more damaged the airship is.
      danger = p => localThreat(g, u, p) / full * 160 * (1.4 - health()),
      spots = () => [tile(g, u.c, u.r), ...[...reachable(g, u).keys()].map(k => {
        const [c, r] = k.split(',').map(Number);
        return tile(g, c, r);
      }).filter(p => p && !unitAt(g, p))],
      fly = p => {
        if (p.c === u.c && p.r === u.r) return true;
        const m = move(g, id, p.c, p.r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
        return m.ok;
      };
    // 1. Damaged: repairs are the only recovery, so get them done before anything else.
    if (health() < 0.5 && ownCities.length) {
      if (!E.repairReason(g, u)) { repair(g, id); return; }
      if (!u.moved) {
        const home = spots().sort((a, b) =>
          (nearest(ownCities, a) > 1) - (nearest(ownCities, b) > 1) || danger(a) - danger(b) ||
          nearest(ownCities, a) - nearest(ownCities, b))[0];
        if (home) fly(home);
      }
      return;
    }
    // 2. Lift: healthy, with room aboard, take adjacent formations that could not fight this turn anyway.
    if (!u.moved && health() >= 0.7) {
      const idle = v => v.hp > 0 && v.side === side && v.id !== id && !isShip(v) && !atSea(g, v) &&
        isReady(g, v) && !v.moved && !v.attacked && !v.hold && !memo.guards?.[v.id] &&
        !memo.recoveries?.has(v.id) && v.hp / maxHP(v) >= 0.6 && canCapture(v) &&
        !g.units.some(w => w.hp > 0 && foe(g, w.side, side) &&
          dist(g, w, v) <= E.movement(g, v) + rangeOf(g, v).max + 1);
      for (const v of g.units.filter(v => dist(g, v, u) === 1 && idle(v)).sort((a, b) => b.stack - a.stack || a.id - b.id)) {
        if (!canBoard(g, u)) break;
        const m = move(g, v.id, u.c, u.r);
        if (m.ok) events.push({ kind: 'move', ...m, id: v.id });
      }
    }
    // 3. Drop: a landing hex scores for an empty enemy city it takes at once, else for nearness to one,
    // less the fire it will draw. Only a clearly useful landing is worth giving up the troops' lift.
    const landing = p => {
      const st = stationAt(g, p);
      if (st && foe(g, st.owner, side) && st.shield <= 0) return 600 + (st.capitalOf ? 400 : 0);
      const d = nearest(foeCities, p);
      return d > 4 ? -Infinity : (8 - d) * 25 - localThreat(g, u, p) / 4;
    };
    if (u.cargo?.length && !u.moved) {
      let best = null;
      for (const p of spots()) {
        const hexes = deployTargetsAt(g, p, side, true).map(t => ({ t, s: landing(t) }))
          .filter(o => o.s > -Infinity).sort((a, b) => b.s - a.s).slice(0, u.cargo.length);
        if (!hexes.length) continue;
        const score = hexes.reduce((a, o) => a + o.s, 0) - danger(p);
        if (!best || score > best.score) best = { p, score };
      }
      if (best && best.score > 100 && fly(best.p)) {
        for (let i = u.cargo.length - 1; i >= 0; i--) {
          const t = deployTargets(g, u, i).map(t => ({ t, s: landing(t) })).sort((a, b) => b.s - a.s)[0]?.t;
          if (!t) break;
          const d = deploy(g, id, i, t.c, t.r);
          if (!d.ok) continue;
          events.push({ kind: 'deploy', id: d.unit.id, from: { c: u.c, r: u.r }, to: d.to });
          events.push(...aiOrder(g, d.unit.id));
        }
      }
    }
    // 4. Strike: try each firing hex in reach against each target in range of it. Return fire weighs
    // double because the hull never heals on its own.
    const shot = () => {
      const from = { c: u.c, r: u.r }, here = tile(g, u.c, u.r);
      const options = u.moved ? [here] : spots();
      let best = null;
      try {
        for (const p of options) {
          u.c = p.c; u.r = p.r;
          for (const q of targets(g, u)) {
            const pr = preview(g, id, q.c, q.r);
            if (!pr) continue;
            const d = unitAt(g, q), s = stationAt(g, q);
            const score = pr.unit + pr.shield * 0.7 + (d && pr.unit >= d.hp ? 150 : 0) +
              (s ? 35 + (s.capitalOf ? 60 : 0) + (s.project ? 120 : 0) : 0) - pr.counter * 2 - danger(p);
            if (!best || score > best.score) best = { p, q, score };
          }
        }
      } finally { u.c = from.c; u.r = from.r; }
      return best;
    };
    const strike = shot();
    if (strike && strike.score > 30 && fly(strike.p)) {
      const a = attack(g, id, strike.q.c, strike.q.r);
      if (a.ok) events.push({ kind: 'attack', ...a, id });
      return;
    }
    // 5. Wait: hover beside the friendly city closest to the enemy, where troops gather to be lifted next turn.
    if (u.moved || !ownCities.length || !foeCities.length) return;
    const front = ownCities.slice().sort((a, b) => nearest(foeCities, a) - nearest(foeCities, b) || a.id - b.id)[0];
    const post = spots().sort((a, b) => dist(g, a, front) * 12 + danger(a) - (dist(g, b, front) * 12 + danger(b)))[0];
    if (post) fly(post);
  }

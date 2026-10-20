  // ======== Airships ========
  // Airships fly over everything, carry two formations and never heal on their own. Their orders run only for a
  // unit whose type has `air` (Carrier-Battleships keep aiCarrier). Each airship serves one offensive front
  // (airFront): its goals are that front's rally city while the front assembles, else its enemy objectives.
  // Each turn, in this order: a badly damaged airship repairs beside a friendly city or flies to the safest hex
  // near one; a healthy one lifts idle troops standing next to it; with troops aboard it drops them where they take
  // an empty city or land close to its front's goals, else carries them toward those goals; empty, it takes a
  // killing shot, else flies to pick up troops of its front still far from the fighting (airRider; the troops board
  // it themselves through airBerth when they act first); then it takes the best-value shot, weighing return fire
  // heavily; with nothing to hit it fetches that front's troops from wherever they are, else waits near its front.
  // `far`: troops this many hexes or more from their front's goals are worth a lift. `stale`: after this many
  // turns aboard, cargo lands wherever it is closest to its goals rather than ride on. `ready`: least health to
  // take troops aboard. `reach`, `fetch`: see 4b. `switch`, `rider`: see airFront.
  const AIRLIFT = { far: 8, stale: 3, ready: 0.6, reach: 3, fetch: 100, switch: 12, rider: 10 };
  // The offensive front an airship serves: the nearest, counting each of up to three of the front's formations it
  // could fly forward (airRider, within two turns' flight) as `rider` hexes nearer. It keeps the front it was given
  // while that front lasts: always with troops aboard, else unless another scores `switch` hexes better.
  function airFront(g, memo, u) {
    const jobs = (((g.ai ||= {})[u.side] ||= {}).airships ||= {});
    for (const id of Object.keys(jobs)) if (!g.units.some(v => v.id === +id && v.hp > 0)) delete jobs[id];
    const kept = memo.byId?.[jobs[u.id]?.front],
      held = kept?.type === 'offensive' ? kept : null;
    if (held && u.cargo?.length) return held;
    const flight = 2 * E.movement(g, u),
      riders = f => {
        const goals = airGoals(g, f);
        return Math.min(3, g.units.filter(v => dist(g, v, u) <= flight && airRider(g, memo, v, f, goals)).length);
      },
      far = f => dist(g, u, f.anchor) - riders(f) * AIRLIFT.rider - (f === held ? AIRLIFT.switch : 0),
      f = (memo.fronts || []).filter(f => f.type === 'offensive' && f.objectives.some(o => !o.defend))
        .map(f => ({ f, d: far(f) })).sort((a, b) => a.d - b.d || (a.f.id < b.f.id ? -1 : 1))[0]?.f;
    if (f === held) return held;
    if (f) jobs[u.id] = { ...jobs[u.id], front: f.id, since: g.turn };
    else delete jobs[u.id];
    return f || null;
  }
  // Where a front wants its troops: the rally city while it assembles, else its objectives still in enemy hands.
  function airGoals(g, f) {
    if (!f) return [];
    if (f.state === 'assembling' && f.rally) return [f.rally];
    const aims = f.objectives.filter(o => !o.defend && foe(g, (stationAt(g, o) || o).owner, f.side));
    return aims.length ? aims : f.objectives.filter(o => !o.defend);
  }
  // A formation of front `f` worth flying forward: healthy, out of contact, free of other duties, and still far from
  // its goals (on any landmass: the airship flies over the sea too). Troops too far from every front for the planner
  // are given theirs here by frontOf, as they would be on their own orders.
  function airRider(g, memo, v, f, goals) {
    if (!f || v.hp <= 0 || v.side !== f.side || isShip(v) || atSea(g, v) || !canCapture(v) || v.hold ||
      v.hp / maxHP(v) < 0.6 || v.deployedTurn === g.turn ||
      goals.reduce((best, o) => Math.min(best, dist(g, o, v)), 99) < AIRLIFT.far ||
      g.units.some(w => w.hp > 0 && foe(g, w.side, v.side) &&
        dist(g, w, v) <= E.movement(g, v) + rangeOf(g, v).max + 1)) return false;
    return frontOf(g, memo, v) === f;
  }
  // A ground unit's side of the lift: board a ready airship in reach that serves the unit's own front.
  function airBerth(g, u, memo, front) {
    if (g.mode !== 'conquest' || u.moved || !front) return null;
    const ships = g.units.filter(v => isAir(v) && v.side === u.side && canBoard(g, v) &&
      v.hp / maxHP(v) >= AIRLIFT.ready && dist(g, u, v) <= E.movement(g, u) + 1 &&
      g.ai?.[u.side]?.airships?.[v.id]?.front === front.id);
    if (!ships.length || !airRider(g, memo, u, front, airGoals(g, front))) return null;
    const reach = reachable(g, u);
    return ships.sort((a, b) => dist(g, u, a) - dist(g, u, b) || a.id - b.id).find(v => reach.has(key(v))) || null;
  }
  function aiAirship(g, u, memo, events) {
    if (!isAir(u) || !isReady(g, u)) return;
    const id = u.id, side = u.side, full = maxHP(u),
      health = () => u.hp / full,
      foeCities = g.stations.filter(s => foe(g, s.owner, side)),
      ownCities = g.stations.filter(s => s.owner === side),
      nearest = (list, p) => list.reduce((best, s) => Math.min(best, dist(g, s, p)), 99),
      front = g.mode === 'conquest' ? airFront(g, memo, u) : null,
      goals = airGoals(g, front),
      job = front ? g.ai[side].airships[id] : {},
      // Expected incoming fire next turn as a share of the hull; it matters more the more damaged the airship is.
      // Cached per hex and hull: no enemy moves during these orders, and the airship's last act ends them.
      risk = new Map(),
      danger = p => {
        const k = (p.r * g.cols + p.c) * 1e4 + u.hp;
        return risk.get(k) ?? risk.set(k, localThreat(g, u, p) / full * 160 * (1.4 - health())).get(k);
      },
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
    // 2. Lift: healthy, with room aboard, take adjacent formations that could not fight this turn anyway,
    // troops of its own front first.
    const lift = () => {
      const idle = v => v.hp > 0 && v.side === side && v.id !== id && !isShip(v) && !atSea(g, v) &&
        isReady(g, v) && !v.moved && !v.attacked && !v.hold && !memo.guards?.[v.id] &&
        !memo.recoveries?.has(v.id) && v.hp / maxHP(v) >= 0.6 && canCapture(v) &&
        !g.units.some(w => w.hp > 0 && foe(g, w.side, side) &&
          dist(g, w, v) <= E.movement(g, v) + rangeOf(g, v).max + 1);
      const ours = v => front && memo.assign?.[v.id] === front.id ? 1 : 0;
      for (const v of g.units.filter(v => dist(g, v, u) === 1 && idle(v))
        .sort((a, b) => ours(b) - ours(a) || b.stack - a.stack || a.id - b.id)) {
        if (!canBoard(g, u)) break;
        const m = move(g, v.id, u.c, u.r);
        if (m.ok) events.push({ kind: 'move', ...m, id: v.id });
      }
    };
    if (!u.moved && health() >= AIRLIFT.ready) lift();
    if (u.cargo?.length) job.loaded ??= g.turn;
    else delete job.loaded;
    // 3. Drop: a landing hex scores for an empty enemy city it takes at once (more if the front wants it), then for
    // one the troops can walk into, else for nearness to the front's goals on the same landmass (any enemy city
    // without a front), less the fire it will draw. Only a clearly useful landing is worth giving up the troops'
    // lift, unless they have ridden too long.
    const stale = u.cargo?.length && g.turn - job.loaded >= AIRLIFT.stale,
      landing = p => {
        const st = stationAt(g, p);
        const goal = s => goals.some(o => o.c === s.c && o.r === s.r) ? 150 : 0;
        if (st && foe(g, st.owner, side) && st.shield <= 0) return 600 + (st.capitalOf ? 400 : 0) + goal(st);
        // An open, empty enemy city a step or two away falls to the troops' own orders.
        const open = foeCities.filter(s => s.shield <= 0 && !unitAt(g, s) && dist(g, s, p) <= 2 && massOf(g, s) === massOf(g, p));
        if (open.length) return 350 + Math.max(...open.map(goal)) - localThreat(g, u, p) / 4;
        const mass = massOf(g, p),
          aims = goals.length ? goals.filter(o => massOf(g, o) === mass) : foeCities,
          d = nearest(aims, p);
        return d > (stale ? 8 : 4) ? -Infinity : (8 - d) * 25 - localThreat(g, u, p) / 4;
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
      if (best && best.score > (stale ? -Infinity : 100) && fly(best.p)) {
        for (let i = u.cargo.length - 1; i >= 0; i--) {
          const t = deployTargets(g, u, i).map(t => ({ t, s: landing(t) })).sort((a, b) => b.s - a.s)[0]?.t;
          if (!t) break;
          const d = deploy(g, id, i, t.c, t.r);
          if (!d.ok) continue;
          events.push({ kind: 'deploy', id: d.unit.id, from: { c: u.c, r: u.r }, to: d.to, captured: d.captured });
          events.push(...aiOrder(g, d.unit.id));
        }
      }
    }
    // 3b. Carry: still loaded, fly as close to the goals as is safe, to land them next turn.
    if (u.cargo?.length && !u.moved && goals.length) {
      const post = spots().sort((a, b) => nearest(goals, a) * 12 + danger(a) * 2 - (nearest(goals, b) * 12 + danger(b) * 2))[0];
      if (post) fly(post);
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
    const fire = best => {
      if (!best || best.score <= 30 || !fly(best.p)) return false;
      const a = attack(g, id, best.q.c, best.q.r);
      if (a.ok) events.push({ kind: 'attack', ...a, id });
      return true;
    };
    let strike = shot();
    if (strike && strike.score >= 150 && fire(strike)) return;
    // 4b. Pick up: empty and healthy, fly beside the front's troops still far from its goals: those that have not
    // moved yet board at once, the rest next turn (airBerth). Beyond reach, close in: always for troops within two
    // turns' flight, and for those within `reach` turns unless a shot worth `fetch` is on offer.
    const empty = !u.moved && !u.cargo?.length && health() >= AIRLIFT.ready && front,
      closeIn = riders => {
        const near = riders.sort((a, b) => dist(g, a, u) - dist(g, b, u) || a.id - b.id)[0],
          post = spots().sort((a, b) => dist(g, a, near) * 12 + danger(a) - (dist(g, b, near) * 12 + danger(b)))[0];
        if (post) fly(post);
      };
    if (empty) {
      const riders = g.units.filter(v => dist(g, v, u) <= AIRLIFT.reach * E.movement(g, u) && airRider(g, memo, v, front, goals));
      if (riders.length && (!strike || strike.score < AIRLIFT.fetch || riders.some(v => dist(g, v, u) <= 2 * E.movement(g, u)))) {
        const value = p => riders.reduce((a, v) => a + (dist(g, v, p) === 1 ? (v.moved ? 1 : 3) : 0), 0),
          picks = spots().map(p => ({ p, v: value(p) })).filter(o => o.v > 0)
            .sort((a, b) => b.v - a.v || danger(a.p) - danger(b.p) || nearest(goals, a.p) - nearest(goals, b.p));
        if (picks.length) {
          if (fly(picks[0].p)) lift();
        } else closeIn(riders);
        if (u.moved) strike = shot();
      }
    }
    if (fire(strike)) return;
    // 5. Wait: with nothing to hit, fetch the front's farthest-back troops wherever they are; else hover where its
    // troops gather (its rally city, or the friendly city nearest its objectives; without a front, the friendly city
    // closest to the enemy), ready to lift them next turn.
    if (empty && !u.moved) {
      const riders = g.units.filter(v => airRider(g, memo, v, front, goals));
      if (riders.length) return closeIn(riders);
    }
    if (u.moved || !ownCities.length || !foeCities.length) return;
    const toward = front ? (front.rally ? [front.rally] : goals) : foeCities,
      base = ownCities.slice().sort((a, b) => nearest(toward, a) - nearest(toward, b) || a.id - b.id)[0];
    const post = spots().sort((a, b) => dist(g, a, base) * 12 + danger(a) - (dist(g, b, base) * 12 + danger(b)))[0];
    if (post) fly(post);
  }

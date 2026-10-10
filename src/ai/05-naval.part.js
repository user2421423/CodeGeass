  function wantsLift(g, u, memo) {
    if (TYPES[u.type].naval || atSea(g, u) || u.hold || memo.recoveries?.has(u.id)) return false;
    const front = frontOf(g, memo, u),
      mass = massOf(g, u),
      far = canCapture(u) && fieldFor(g, memo, u)(u) >= 14;
    if (front?.masses) return !front.masses.has(mass) || (far && front.state !== 'assembling');
    return !hostileMass(g, u.side, mass) || far;
  }
  // A landing hex: enemy frames within 3 hexes (threat) and an undefended enemy city within 2 (prize). Lower is better;
  // null when the beach is defended by more frames than the carrier brings.
  function landingScore(g, side, t, strength, fieldAt, masses = null) {
    if (!hostileMass(g, side, massOf(g, t)) && !masses?.has(massOf(g, t))) return null;
    const threat = g.units
      .filter(v => v.hp > 0 && foe(g, v.side, side) && !isShip(v) && !atSea(g, v) && dist(g, v, t) <= 3)
      .reduce((a, v) => a + v.stack, 0);
    if (threat > strength) return null;
    const prize = g.stations.some(s => foe(g, s.owner, side) && !unitAt(g, s) && s.shield <= 60 && dist(g, s, t) <= 2);
    return fieldAt(t) + threat * 3 - (prize ? 25 : 0);
  }
  // Launch every ready formation onto the best landing hex (toward its front, which may be a friendly rally city), then
  // give each its full turn.
  function aiLaunch(g, ship, events, fieldAt, masses) {
    const landed = [];
    for (let i = (ship.cargo?.length || 0) - 1; i >= 0; i--) {
      if (deployReason(g, ship, i)) continue;
      const strength = ship.cargo.reduce((a, c) => a + c.stack, 0),
        spot = deployTargets(g, ship)
          .map(t => ({ t, s: landingScore(g, ship.side, t, strength + landed.filter(v => v.hp > 0 && !atSea(g, v) && dist(g, v, t) <= 3).reduce((a, v) => a + v.stack, 0), fieldAt, masses) }))
          .filter(o => o.s != null)
          .sort((a, b) => a.s - b.s)[0]?.t;
      if (!spot) break;
      const d = deploy(g, ship.id, i, spot.c, spot.r);
      if (!d.ok) continue;
      landed.push(d.unit);
      events.push({ kind: 'deploy', id: d.unit.id, from: { c: ship.c, r: ship.r }, to: d.to });
      events.push(...aiOrder(g, d.unit.id));
    }
  }
  // A carrier's operation: wait off a coast where troops bound overseas gather, sail for their front once loaded (full,
  // or after three turns), launch everything ashore; badly damaged and empty, head home to a port; idle, wait off the
  // rally city of the best offensive across the sea. One carrier serves one front. Returns false when there is nothing
  // to do, so the generic orders use it as a gunship.
  function seaCoasts(g, memo) {
    // Where a carrier can wait off a shore: open water or a coast hex, next to land troops can reach.
    return memo.coasts ||= g.tiles.filter(p => navigable(p) && !stationAt(g, p) && adjacent(g, p).some(n => !isSea(n) && !TERRAIN[n.terrain]?.blocked));
  }
  function aiCarrier(g, u, memo, events, fieldAt) {
    const bound = u.cargo?.length ? frontOf(g, memo, u.cargo[0]) : null,
      masses = bound?.masses || null;
    if (bound) fieldAt = fieldFor(g, memo, u.cargo[0]);
    const fleet = (((g.ai ||= {})[u.side] ||= {}).fleet ||= {}),
      job = (fleet[u.id] ||= { wait: 0 }),
      cargo = u.cargo || [],
      reach = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .filter(p => !unitAt(g, p)),
      sail = p => {
        if (!p || (p.c === u.c && p.r === u.r)) return;
        const m = move(g, u.id, p.c, p.r);
        if (m.ok) events.push({ kind: 'move', ...m, id: u.id });
      },
      danger = p => g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, p) <= 2).length,
      strength = cargo.reduce((a, c) => a + c.stack, 0),
      landing = p => {
        const scores = deployTargetsAt(g, p, u.side)
          .map(t => landingScore(g, u.side, t, strength, fieldAt, masses))
          .filter(v => v != null);
        return scores.length ? Math.min(...scores) + danger(p) * 2 : null;
      };
    const here = tile(g, u.c, u.r),
      // The route is sea-only even when its goal is a city or troops ashore. Include
      // the current hex so an unreachable or temporarily blocked route holds safely.
      followSea = seeds => {
        if (!seeds.length) return false;
        const route = goalField(g, u.side, seeds, 'sea'),
          value = p => route[p.r * g.cols + p.c],
          choices = [here, ...reach].filter(p => Number.isFinite(value(p)))
            .sort((a, b) => value(a) - value(b) || danger(a) - danger(b) || dist(g, a, u) - dist(g, b, u));
        if (!choices.length) return false;
        sail(choices[0]);
        return true;
      },
      coastSeeds = (landField, limit = Infinity) => seaCoasts(g, memo).flatMap(p => {
        const costs = adjacent(g, p).filter(n => !isSea(n) && !TERRAIN[n.terrain]?.blocked)
          .map(n => landField[n.r * g.cols + n.c]).filter(v => Number.isFinite(v) && v <= limit);
        return costs.length ? [[p, Math.min(...costs)]] : [];
      });
    const ports = g.stations.filter(s => s.portAt && s.portOwner === u.side).map(s => tile(g, s.portAt.c, s.portAt.r));
    if (!cargo.length && u.hp / maxHP(u) < 0.4 && ports.length) {
      followSea(ports.map(p => [p, 0]));
      return true;
    }
    const ready = cargo.some(c => c.boardedTurn !== g.turn);
    if (ready && (cargo.length >= carrierCapacity(g, u) || job.wait >= 3)) {
      if (landing(tile(g, u.c, u.r)) == null) {
        // Seed feasible landing positions, then route through navigable water rather
        // than following a land shortcut in the formation's strategic goal field.
        const seeds = seaCoasts(g, memo).map(p => [p, landing(p)]).filter(([, score]) => score != null);
        followSea(seeds);
      }
      if (landing(tile(g, u.c, u.r)) != null) aiLaunch(g, u, events, fieldAt, masses);
      if (!u.cargo.length) job.wait = 0;
      return true;
    }
    if (cargo.length) job.wait++;
    const riders = g.units.filter(
      v => v.hp > 0 && v.side === u.side && !memo.guards?.[v.id] && (!cargo.length || sameLift(frontOf(g, memo, v), bound)) && wantsLift(g, v, memo),
    );
    if (!riders.length) {
      const stage = !cargo.length && memo.staging;
      if (!stage) return cargo.length > 0;
      if (dist(g, u, stage) > 2) {
        const land = goalField(g, u.side, [[stage, 0]], 'land');
        followSea(coastSeeds(land, FRONT.rally));
      }
      return true;
    }
    const land = goalField(g, u.side, riders.map(v => [v, 0]), 'land');
    followSea(coastSeeds(land));
    return true;
  }

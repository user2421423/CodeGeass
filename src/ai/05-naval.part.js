  function wantsLift(g, u, memo) {
    if (philippinesDefense(g, u.side)) return false;
    if (TYPES[u.type].naval || atSea(g, u) || u.hold || memo.recoveries?.has(u.id)) return false;
    const front = frontOf(g, memo, u),
      mass = massOf(g, u),
      far = canCapture(u) && fieldFor(g, memo, u)(u) >= 14;
    if (front?.masses) return !front.masses.has(mass) || (far && front.state !== 'assembling');
    return !hostileMass(g, u.side, mass) || far;
  }
  // A landing hex: enemy frames within 3 hexes (threat) and an undefended enemy city within 2 (prize). Lower is better;
  // null when the beach is defended by more frames than the carrier brings. `grids` (landingGrids) answers the same
  // questions from a lookup when many hexes are scored on an unchanged board.
  function landingScore(g, side, t, strength, fieldAt, masses = null, grids = null) {
    if (!hostileMass(g, side, massOf(g, t)) && !masses?.has(massOf(g, t))) return null;
    const i = t.r * g.cols + t.c;
    const threat = grids ? grids.threat[i] : g.units
      .filter(v => v.hp > 0 && foe(g, v.side, side) && !isShip(v) && !atSea(g, v) && dist(g, v, t) <= 3)
      .reduce((a, v) => a + v.stack, 0);
    if (threat > strength * (g.mode === 'scenario' ? 1.5 : 1)) return null;
    const prize = grids ? grids.prize[i] === 1 :
      g.stations.some(s => foe(g, s.owner, side) && !unitAt(g, s) && dist(g, s, t) <= 2);
    return fieldAt(t) + threat * 3 - (prize ? 25 : 0);
  }
  // Per-hex counts for scoring every coast at once: enemy land frames within 3 (threat), an undefended enemy city
  // within 2 (prize) and enemy units within 2 (danger). Valid only until the next move, attack or landing.
  function landingGrids(g, side) {
    const n = g.cols * g.rows, threat = new Float64Array(n), prize = new Uint8Array(n), danger = new Uint32Array(n);
    for (const v of g.units) {
      if (v.hp <= 0 || !foe(g, v.side, side)) continue;
      for (const t of E.within(g, v, 2)) danger[t.r * g.cols + t.c]++;
      if (!isShip(v) && !atSea(g, v)) for (const t of E.within(g, v, 3)) threat[t.r * g.cols + t.c] += v.stack;
    }
    for (const s of g.stations)
      if (foe(g, s.owner, side) && !unitAt(g, s)) for (const t of E.within(g, s, 2)) prize[t.r * g.cols + t.c] = 1;
    return { threat, prize, danger };
  }
  // Launch every ready formation onto the best landing hex (toward its front, which may be a friendly rally city), then
  // give each its full turn.
  function aiLaunch(g, ship, events, fieldAt, masses) {
    const landed = [];
    const supportingCargo = g.units.filter(v => v.id !== ship.id && v.side === ship.side &&
      v.hp > 0 && TYPES[v.type]?.capacity > 0 && v.cargo?.length &&
      dist(g, v, ship) <= 3).reduce((a, v) =>
        a + v.cargo.reduce((sum, u) => sum + u.stack, 0), 0);
    for (let i = (ship.cargo?.length || 0) - 1; i >= 0; i--) {
      // A fresh passenger stays aboard until the next owner turn, even if the
      // carrier has sailed to a legal beach this turn.
      if (deployReason(g, ship, i)) continue;
      const strength = ship.cargo.filter(c => c.boardedTurn !== g.turn)
          .reduce((a, c) => a + c.stack, 0),
        spot = deployTargets(g, ship, i)
          .map(t => ({ t, s: landingScore(g, ship.side, t, strength + supportingCargo + landed.filter(v => v.hp > 0 && !atSea(g, v) && dist(g, v, t) <= 3).reduce((a, v) => a + v.stack, 0), fieldAt, masses) }))
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
  const WAVE_WAIT = 2; // turns a loaded carrier may hold on a beach for a second wave
  function aiCarrier(g, u, memo, events, fieldAt) {
    if (philippinesDefense(g, u.side)) return true;
    // Escorting is a fallback: a transport only escorts once the boarding
    // planner below finds no troops anywhere that need a lift and no staging
    // area. Hulls without capacity (future dedicated escorts) always escort.
    const canTransport = TYPES[u.type]?.capacity > 0;
    const escort = () => {
      const leader = g.units.filter(v => v.id !== u.id && v.side === u.side && v.hp > 0 &&
        isShip(v) && TYPES[v.type]?.capacity > 0 && v.cargo?.length &&
        dist(g, v, u) <= 8).sort((a, b) => dist(g, a, u) - dist(g, b, u) || a.id - b.id)[0];
      if (!leader || dist(g, u, leader) <= 2) return false;
      const choice = [...reachable(g, u).keys()].map(k => {
        const [c, r] = k.split(',').map(Number);
        return tile(g, c, r);
      }).filter(p => navigable(p) && !unitAt(g, p) && dist(g, p, leader) < dist(g, u, leader))
        .sort((a, b) => dist(g, a, leader) - dist(g, b, leader) || a.r - b.r || a.c - b.c)[0];
      const m = choice && move(g, u.id, choice.c, choice.r);
      if (!m?.ok) return false;
      events.push({ kind: 'move', ...m, id: u.id });
      return true;
    };
    if (!canTransport) return escort();
    const bound = u.cargo?.length ? frontOf(g, memo, u.cargo[0]) : null,
      masses = bound?.masses || null;
    if (bound) fieldAt = fieldFor(g, memo, u.cargo[0]);
    const fleet = (((g.ai ||= {})[u.side] ||= {}).fleet ||= {}),
      job = (fleet[u.id] ||= { wait: 0 }),
      teams = (memo.navalTeams ||= {}),
      team = bound ? (teams[bound.id] ||= { landing: null }) : null,
      cargo = u.cargo || [],
      readyCargo = cargo.filter(c => c.boardedTurn !== g.turn),
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
      danger = (p, grids = null) => grids ? grids.danger[p.r * g.cols + p.c] :
        g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, p) <= 2).length,
      strength = readyCargo.reduce((a, c) => a + c.stack, 0),
      landingSupport = g.units.filter(v => v.id !== u.id && v.side === u.side && v.hp > 0 &&
        TYPES[v.type]?.capacity > 0 && v.cargo?.length),
      landing = (p, grids = null) => {
        // Count only a nearby loaded carrier as prospective same-wave support.
        // A designated invasion flotilla (East Coast) plans its beachhead as a
        // synchronized landing force, even while its carriers are still offshore.
        // Actual deployment still requires legal beach hexes and nearby support.
        const support = landingSupport.filter(v => dist(g, v, p) <= 3 ||
          (scenarioMeta(g).ai?.synchronizedFlotillas &&
           v.invasionGroup && v.invasionGroup === u.invasionGroup &&
           dist(g, v, u) <= 9))
          .reduce((n, v) => n + v.cargo.filter(c => c.boardedTurn !== g.turn)
            .reduce((a, c) => a + c.stack, 0), 0);
        const scores = deployTargetsAt(g, p, u.side, readyCargo.length > 0)
          .map(t => landingScore(g, u.side, t, strength + support, fieldAt, masses, grids))
          .filter(v => v != null);
        return scores.length ? Math.min(...scores) + danger(p, grids) * 2 + (team?.landing ? Math.min(30, dist(g, p, team.landing) * 4) : 0) : null;
      };
    const here = tile(g, u.c, u.r),
      // The route is sea-only even when its goal is a city or troops ashore. Include
      // the current hex so an unreachable or temporarily blocked route holds safely.
      followSea = seeds => {
        if (!seeds.length) return false;
        const route = goalField(g, u.side, seeds, 'sea'),
          value = p => route[p.r * g.cols + p.c],
          risk = new Map(),
          riskOf = p => risk.get(p) ?? risk.set(p, danger(p)).get(p),
          choices = [here, ...reach].filter(p => Number.isFinite(value(p)))
            .sort((a, b) => value(a) - value(b) || riskOf(a) - riskOf(b) || dist(g, a, u) - dist(g, b, u));
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
    if (readyCargo.length && (cargo.length >= carrierCapacity(g, u) || job.wait >= 3)) {
      if (landing(tile(g, u.c, u.r)) == null) {
        // Seed feasible landing positions, then route through navigable water rather
        // than following a land shortcut in the formation's strategic goal field.
        const grids = landingGrids(g, u.side),
          seeds = seaCoasts(g, memo).map(p => [p, landing(p, grids)]).filter(([, score]) => score != null)
          .sort((a, b) => a[1] - b[1] || a[0].r - b[0].r || a[0].c - b[0].c);
        if (team && seeds.length) team.landing = seeds[0][0];
        followSea(seeds);
      }
      // Briefly hold for a second wave bound for the same front instead of
      // drip-feeding lone transports. Only on a quiet beach, only while that
      // carrier keeps closing in, and never while it is itself holding (so two
      // carriers cannot wait on each other). The wave timer is separate from
      // the boarding timer and capped at WAVE_WAIT turns.
      const spot = tile(g, u.c, u.r), // after any move above
        atBeach = landing(spot) != null,
        wave = atBeach && !danger(spot) && (job.waveWait || 0) < WAVE_WAIT && landingSupport
          .filter(v => isShip(v) && !fleet[v.id]?.waveWait && sameLift(frontOf(g, memo, v.cargo[0]), bound))
          .map(v => ({ v, d: dist(g, v, u) }))
          .filter(({ v, d }) => d > 3 && d <= 6 && !(job.waveGap?.id === v.id && d >= job.waveGap.d))
          .sort((a, b) => a.d - b.d || a.v.id - b.v.id)[0];
      if (wave) {
        job.waveWait = (job.waveWait || 0) + 1;
        job.waveGap = { id: wave.v.id, d: wave.d };
        return true;
      }
      job.waveWait = 0;
      delete job.waveGap;
      if (atBeach) aiLaunch(g, u, events, fieldAt, masses);
      if (!u.cargo.length) job.wait = 0;
      return true;
    }
    if (cargo.length) job.wait++;
    const riders = g.units.filter(
      v => v.hp > 0 && v.side === u.side && !memo.guards?.[v.id] && (!cargo.length || sameLift(frontOf(g, memo, v), bound)) && wantsLift(g, v, memo),
    );
    if (!riders.length) {
      const stage = !cargo.length && memo.staging;
      if (!stage) return cargo.length > 0 || escort();
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

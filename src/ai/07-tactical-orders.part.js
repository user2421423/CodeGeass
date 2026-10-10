  function coastTile(g, p) {
    return !isSea(p) && adjacent(g, p).some(isSea);
  }
  function aiOrder(g, id) {
    const u = g.units.find(u => u.id === id);
    if (!u || !isReady(g, u)) return [];
    const events = [],
      memo = aiPlan(g, u.side),
      guard = memo.guards?.[u.id],
      front = frontOf(g, memo, u),
      // Units already ahead of an assembling front's rally city hold their ground rather than walk back.
      forward = front?.state === 'assembling' && aheadOfRally(g, front, u),
      home = { c: u.c, r: u.r },
      fieldAt = forward ? p => dist(g, p, home) : fieldFor(g, memo, u);
    const recovery = memo.recoveries?.get(u.id);
    if (recovery) {
      if (u.moved || u.attacked) return events;
      const field = recovery.field,
        value = p => field[p.r * g.cols + p.c] + g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && !atSea(g, v) && dist(g, v, p) <= rangeOf(g, v).max).length * 8
          - (p.c === recovery.city.c && p.r === recovery.city.r ? 2 : 0),
        picks = [...reachable(g, u).keys()].map(k => { const [c, r] = k.split(',').map(Number); return tile(g, c, r); })
          .filter(p => !isSea(p) && !unitAt(g, p) && Number.isFinite(field[p.r * g.cols + p.c]))
          .sort((a, b) => value(a) - value(b));
      if (picks[0] && value(picks[0]) < value(u)) {
        const m = move(g, id, picks[0].c, picks[0].r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
      return events;
    }
    // Withdraw already-fired allies before Leila's own movement can take her out of range.
    if (COMMANDERS[u.cmd]?.action?.kind === 'withdraw' && !feintReason(g, u)) {
      const friends = actionTargets(g, u).map(v => v.id), r = feint(g, id);
      if (r.ok) {
        events.push({ kind: 'feint', id, affected: r.affected });
        for (const friend of friends) events.push(...aiOrder(g, friend));
      }
    }
    // Navies: a carrier runs its own operation; idle troops board a carrier waiting within reach.
    const steered = isShip(u) && !u.moved && aiCarrier(g, u, memo, events, fieldAt);
    if (!u.moved && !guard && u.deployedTurn !== g.turn && wantsLift(g, u, memo)) {
      const berth = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .find(p => {
          const v = unitAt(g, p);
          return v && v !== u && v.side === u.side && canBoard(g, v) && (!v.cargo?.length || sameLift(frontOf(g, memo, v.cargo[0]), front));
        });
      const m = berth && move(g, id, berth.c, berth.r);
      if (m?.ok) return [...events, { kind: 'move', ...m, id }];
    }
    const action = COMMANDERS[u.cmd]?.action;
    if (action && !['command', 'withdraw'].includes(action.kind) && !feintReason(g, u)) {
      const r = feint(g, id);
      if (r.ok) events.push({ kind: 'feint', id, affected: r.affected });
    }
    const choose = () =>
      targets(g, u)
        .map(p => {
          const d = unitAt(g, p),
            s = stationAt(g, p),
            pr = preview(g, id, p.c, p.r);
          const score =
            pr.unit +
            pr.shield * 0.7 +
            (d && pr.unit >= d.hp ? 130 : 0) +
            (s ? 35 : 0) +
            (s?.capitalOf ? 60 : 0) +
            (s?.project ? 120 : 0) +
            (d?.cmd ? 30 : 0) -
            pr.counter * 0.5;
          return { p, score };
        })
        .sort((a, b) => b.score - a.score)[0];
    const maneuver = () => {
      if (u.moved || u.attacked || steered) return;
      // Boarding is decided above (idle troops and waiting carriers), so occupied hexes are not destinations here.
      const spots = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .filter(p => !unitAt(g, p));
      const enemies = g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, u) <= aiRange(g).enemyScan);
      const old = { c: u.c, r: u.r };
      // Overseas invasions assemble before embarking. Nearby land formations stage on the coast; units already at sea
      // count as an escort so follow-on waves do not get stranded waiting for a fresh three-unit convoy.
      const naval = !!TYPES[u.type].naval,
        fromLand = !naval && !atSea(g, u),
        freeAllies = g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && !memo.guards?.[v.id]),
        landGroup = freeAllies.filter(v => !atSea(g, v) && dist(g, v, u) <= aiRange(g).convoyLand).length,
        seaEscort = freeAllies.filter(v => atSea(g, v) && dist(g, v, u) <= aiRange(g).convoySea).length,
        // A front still gathering (or holding) on this landmass keeps its troops ashore; one bound overseas lets a lone
        // formation cross where no enemy is near.
        ashore = front && front.state !== 'attacking' && front.masses?.has(massOf(g, u)),
        safe = front && !enemies.some(v => dist(g, v, u) <= aiRange(g).enemyScan / 2),
        convoy = fromLand && !guard && !ashore && (landGroup >= 2 || (landGroup >= 1 && seaEscort >= 1) || safe),
        currentField = fieldAt(old);
      const placeScore = p => {
        const station = stationAt(g, p);
        let sc = station && foe(g, station.owner, u.side) && station.shield === 0 ? 400 + (station.capitalOf ? 600 : 0) : 0;
        if (COMMANDERS[u.cmd]?.fx.treasury && station?.owner === u.side) sc += 250 + station.income * 4;
        const mine = siteAt(g, p);
        if (mine && foe(g, mine.owner, u.side) && canCapture(u)) sc += mine.base >= 30 ? 550 : 250;
        // A city guard stands beside its city while no enemy is within 2 hexes of it, leaving the factory free (a
        // unit on the city hex blocks production); when one comes close it steps onto the city.
        const onGuard = guard && p.c === guard.c && p.r === guard.r,
          guardBonus = !onGuard ? 0 : guard.id != null && !enemies.some(v => dist(g, v, guard) <= 2) ? -40 : 25;
        sc -= guard ? dist(g, p, guard) * 30 - guardBonus : u.hold ? 0 : fieldAt(p) * 8;
        if (u.hold) sc -= Math.max(0, dist(g, p, u.hold) - (u.hold.radius ?? 2)) * 40;
        let nearestEnemy = 15,
          danger = 0;
        for (const v of enemies) {
          const d = dist(g, v, p);
          nearestEnemy = Math.min(nearestEnemy, d);
          if (d <= 1) danger++;
        }
        if (isSea(p) && naval) {
          sc -= danger * 20;
        } else if (isSea(p)) {
          sc -= 14 + danger * 40 + (nearestEnemy <= 2 ? 30 : 0) + (fromLand && (!convoy || guard) ? 1000 : 0);
          if (fromLand && convoy && fieldAt(p) < currentField) sc += 75;
        } else if (!fromLand) {
          sc += naval ? 30 : 90;
        } else if (!guard && !convoy && coastTile(g, p) && fieldAt(p) <= currentField) {
          const assembling = freeAllies.filter(v => !atSea(g, v) && dist(g, v, p) <= aiRange(g).convoyLand).length;
          sc += 28 + Math.min(3, assembling) * 12;
        }
        if (TYPES[u.type].branch === 'Artillery') {
          sc -= danger * 28;
          sc -= Math.abs(nearestEnemy - TYPES[u.type].max) * 6;
        } else sc -= nearestEnemy * 2;
        const skill = COMMANDERS[u.cmd]?.fx || {};
        const allies = freeAllies.filter(v => dist(g, v, p) <= 2);
        if (skill.loneRaider) sc -= allies.filter(v => dist(g, v, p) === 1).length * 18;
        if (skill.engineeringPen || skill.reassure || skill.repairSupply || skill.bodyguard || skill.defensiveDoctrine || skill.orderCommander)
          sc += Math.min(4, allies.length) * 12;
        if (station?.owner === u.side && u.hp / maxHP(u) < 0.5) sc += 20;
        if (naval && u.hp / maxHP(u) < 0.5 && portAtHex(g, p)?.portOwner === u.side) sc += 150;
        return sc;
      };
      let best = null,
        bestScore = -Infinity;
      for (const p of spots) {
        let sc = placeScore(p);
        u.c = p.c;
        u.r = p.r;
        const oldDistance = u.movedDistance, oldMoved = u.moved;
        u.movedDistance = (oldDistance || 0) + dist(g, old, p);
        u.moved = true;
        reindex(g, u, old);
        const shot = choose();
        u.c = old.c;
        u.r = old.r;
        u.movedDistance = oldDistance;
        u.moved = oldMoved;
        reindex(g, u, p);
        if (shot) sc += shot.score * 0.6;
        if (sc > bestScore) {
          bestScore = sc;
          best = p;
        }
      }
      const current = choose(),
        stay = placeScore(tile(g, u.c, u.r)) + (current ? current.score * 0.6 : 0);
      if (best && bestScore > stay + 4) {
        const m = move(g, id, best.c, best.r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    };
    // Reevaluate positioning after each kill that restores movement/refire, within a bounded action budget.
    for (let chain = 0; chain < 8 && !u.attacked && !g.over && u.hp > 0; chain++) {
      maneuver();
      // A designation may only now be in range.
      if (action && !['command', 'withdraw'].includes(action.kind) && !feintReason(g, u)) {
        const r = feint(g, id);
        if (r.ok) events.push({ kind: 'feint', id, affected: r.affected });
      }
      const shot = choose();
      if (!shot) break;
      const a = attack(g, id, shot.p.c, shot.p.r);
      if (a.ok) events.push({ kind: 'attack', ...a, id });
      else break;
    }
    // Spend restored movement on a safe hex, including withdrawal moves after firing.
    if (!u.moved && (u.attacked || u.skillReposition || u.withdrawMove) && !g.over && u.hp > 0) {
      const score = p => -fieldAt(p) * 8 - g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, p) <= rangeOf(g, v).max).length * 30;
      const picks = [...reachable(g, u).keys()].map(k => { const [c, r] = k.split(',').map(Number); return tile(g, c, r); })
        .filter(p => !unitAt(g, p)).sort((a, b) => score(b) - score(a));
      if (picks[0] && score(picks[0]) > score(u)) {
        const m = move(g, id, picks[0].c, picks[0].r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    }
    // Zero and Leila use their actions after allied orders. UI ordering puts them last.
    if (action?.kind === 'command' && !g.over && u.hp > 0 && !feintReason(g, u)) {
      const r = feint(g, id);
      if (r.ok) events.push({ kind: 'feint', id, affected: 1 }, ...aiOrder(g, r.target));
    }
    if (action?.kind === 'withdraw' && !g.over && u.hp > 0 && !feintReason(g, u)) {
      const friends = actionTargets(g, u).map(v => v.id), r = feint(g, id);
      if (r.ok) {
        events.push({ kind: 'feint', id, affected: r.affected });
        for (const friend of friends) events.push(...aiOrder(g, friend));
      }
    }
    return events;
  }
  Object.assign(E, { aiProduction, aiOrder, aiPlan, unitStrength, FRONT });
})(typeof window !== 'undefined' ? window : globalThis);

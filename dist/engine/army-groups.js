/* Player-defined operational groups for world conquest and regional scenarios.
   Groups issue ordinary standing orders and never bypass movement, combat or capture rules.
   Source of truth: this standalone extension; loaded after engine.js. */
(function (E) {
  'use strict';
  const MAX_GROUPS = 12;
  const MAX_UNITS = 24;

  // Legacy saves used Defend; upgrade it to passive Hold Position on first access.
  const groups = g => {
    const list = (g.armyGroups ||= []);
    for (const gr of list) {
      if (gr.stance !== 'defend') continue;
      for (const id of gr.units || [])
        clearMatchingOrder(g, g.units.find(u => u.id === id), gr.destination);
      gr.stance = 'hold';
      delete gr.operation;
    }
    return list;
  };
  const find = (g, id) => groups(g).find(v => v.id === id && v.side === g.player);
  function canEdit(g) {
    if (g.mode !== 'conquest' && g.mode !== 'scenario') return 'Available in conquest or scenarios only';
    if (g.over) return 'Operation over';
    if (g.phase !== g.player) return 'Not your turn';
    return null;
  }
  function prune(g) {
    const seen = new Set();
    for (const gr of groups(g)) {
      gr.units = (gr.units || []).filter(id => {
        // Keep members aboard carriers: they retain their IDs and rejoin the map when deployed.
        const alive = g.units.some(u => (u.id === id && u.hp > 0 && u.side === gr.side) ||
          (u.cargo || []).some(v => v.id === id && v.hp > 0 && v.side === gr.side));
        if (!alive || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }
  }
  function clearMatchingOrder(g, u, p) {
    if (u && p && u.goto?.c === p.c && u.goto?.r === p.r) delete u.goto;
  }
  function create(g, firstUnitId = null) {
    const why = canEdit(g);
    if (why) return { ok: false, reason: why };
    if (groups(g).length >= MAX_GROUPS) return { ok: false, reason: 'Maximum 12 army groups' };
    const first = firstUnitId == null ? null : g.units.find(u => u.id === firstUnitId && u.hp > 0 && u.side === g.player);
    if (firstUnitId != null && !first) return { ok: false, reason: 'Unit unavailable' };
    g.nextArmyGroupId = Math.max(g.nextArmyGroupId || 1, ...groups(g).map(gr => gr.id + 1), 1);
    const id = g.nextArmyGroupId++;
    const group = { id, side: g.player, name: 'Army Group ' + id, units: [], destination: null, stance: 'advance' };
    groups(g).push(group);
    if (first) add(g, id, first.id);
    return { ok: true, group };
  }
  function add(g, groupId, unitId) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    const u = g.units.find(v => v.id === unitId && v.hp > 0 && v.side === g.player);
    if (!u) return { ok: false, reason: 'Unit unavailable' };
    if (group.units.includes(unitId)) return { ok: false, reason: 'Already assigned' };
    if (group.units.length >= MAX_UNITS) return { ok: false, reason: 'Maximum 24 units per group' };
    const previous = groups(g).find(gr => gr.units.includes(unitId));
    if (previous) {
      previous.units = previous.units.filter(id => id !== unitId);
      clearMatchingOrder(g, u, previous.destination);
      clearPlanned(g, previous, u);
    }
    group.units.push(unitId);
    let routed = false;
    if (group.destination && group.stance !== 'hold' && group.stance !== 'assault') {
      if (u.c === group.destination.c && u.r === group.destination.r) {
        delete u.goto;
        routed = true;
      } else routed = E.setGoto(g, u.id, group.destination.c, group.destination.r).ok;
    }
    return { ok: true, routed };
  }
  function remove(g, groupId, unitId) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    if (!group.units.includes(unitId)) return { ok: false, reason: 'Unit not in this group' };
    group.units = group.units.filter(id => id !== unitId);
    clearMatchingOrder(g, g.units.find(u => u.id === unitId), group.destination);
    clearPlanned(g, group, g.units.find(u => u.id === unitId));
    return { ok: true };
  }
  function order(g, groupId, c, r) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    const p = E.tile(g, c, r);
    if (!p || E.TERRAIN[p.terrain]?.blocked) return { ok: false, reason: 'Choose a traversable hex' };
    const members = group.units.map(id => g.units.find(u => u.id === id && u.hp > 0 && u.side === g.player)).filter(Boolean);
    if (!members.length && E.isSea(p)) return { ok: false, reason: 'Choose a land destination for an empty group' };
    // First validate every route: a wholly impossible order leaves old destinations unchanged.
    const ready = [], rejected = [];
    for (const u of members) {
      const arrived = u.c === c && u.r === r;
      if (arrived || !E.gotoReason(g, u, p)) ready.push(u);
      else rejected.push(u.id);
    }
    if (members.length && !ready.length)
      return { ok: false, reason: 'No group unit has a route to that destination', failed: rejected.length };
    // A held group's objective is dormant; individual standing orders are untouched.
    if (group.stance !== 'hold' && group.stance !== 'assault') for (const u of ready) {
      if (u.c === c && u.r === r) delete u.goto;
      else E.setGoto(g, u.id, c, r);
    }
    if (group.autoConquer) { group.autoConquer = false; group.autoRouted = {}; group.targetStationId = null; }
    resetOperation(g, group);
    group.destination = { c: p.c, r: p.r };
    if (group.stance === 'assault') planGroupAssault(g, group);
    return { ok: true, assigned: ready.length, failed: rejected.length };
  }
  function cancel(g, groupId) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    if (!group.destination && !group.autoConquer && !group.operation) return { ok: false, reason: 'No objective set' };
    if (group.autoConquer) setConquest(g, groupId, false);
    for (const id of group.units) clearMatchingOrder(g, g.units.find(u => u.id === id), group.destination);
    resetOperation(g, group);
    group.destination = null;
    group.autoStatus = '';
    return { ok: true };
  }
  function disband(g, groupId) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    if (group.autoConquer) setConquest(g, groupId, false);
    if (group.destination) cancel(g, groupId);
    g.armyGroups = groups(g).filter(gr => gr !== group);
    return { ok: true };
  }
  const STANCES = Object.freeze({
    advance: 'Advance',
    hold: 'Hold Position',
    assault: 'Assault',
  });
  // Advance = movement alone. Hold Position = no group movement or fire.
  // Assault = movement followed by legal fire, retaining enemy objectives until captured.
  function setStance(g, groupId, stance) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    if (!Object.hasOwn(STANCES, stance)) return { ok: false, reason: 'Unknown group stance' };
    if (stance === 'hold' && group.autoConquer) setConquest(g, groupId, false);
    if (stance === (group.stance || 'advance')) return { ok: true, unchanged: true };
    const prior = group.destination;
    if (group.stance === 'assault' || stance === 'hold') resetOperation(g, group);
    if (stance === 'hold' || stance === 'assault') {
      for (const id of group.units) clearMatchingOrder(g, g.units.find(u => u.id === id), prior);
    } else if (prior) {
      for (const id of group.units) {
        const u = g.units.find(v => v.id === id && v.hp > 0 && v.side === g.player);
        if (!u) continue;
        if (u.c === prior.c && u.r === prior.r) delete u.goto;
        else E.setGoto(g, u.id, prior.c, prior.r);
      }
    }
    group.stance = stance;
    if (stance === 'assault' && (prior || group.autoConquer)) planGroupAssault(g, group);
    return { ok: true, stance };
  }

  // Optional late-game conquest automation. This only assigns ordinary standing
  // destinations; all movement, capture legality and action budgets remain in E.runGotos.
  const matches = (u, p) => !!u?.goto && !!p && u.goto.c === p.c && u.goto.r === p.r;
  function setConquest(g, groupId, enabled) {
    const why = canEdit(g), gr = find(g, groupId);
    if (why || !gr) return { ok: false, reason: why || 'Army group not found' };
    if (!!gr.autoConquer === !!enabled) return { ok: true, unchanged: true };
    const old = gr.destination;
    for (const id of gr.units) {
      const u = g.units.find(v => v.id === id);
      if (matches(u, gr.autoRouted?.[id]) || (enabled && matches(u, old))) delete u.goto;
    }
    gr.autoConquer = !!enabled;
    gr.autoRouted = {};
    gr.manualOverrides = {};
    resetOperation(g, gr);
    gr.destination = null;
    gr.targetStationId = null;
    gr.autoStatus = enabled ? 'Choosing a city' : '';
    // Advance remains movement-only; Assault can coordinate automatic city conquest.
    return { ok: true };
  }
  function suspendConquestUnit(g, id, preserveGoto = false) {
    for (const gr of groups(g)) {
      if (!gr.units.includes(id)) continue;
      (gr.manualOverrides ||= {})[id] = g.turn;
      const u = g.units.find(v => v.id === id);
      if (!preserveGoto && matches(u, gr.autoRouted?.[id])) delete u.goto;
      if (gr.autoRouted) delete gr.autoRouted[id];
      clearPlanned(g, gr, u, preserveGoto);
      if (gr.operation) (gr.operation.manualOverrides ||= {})[id] = g.turn;
      return true;
    }
    return false;
  }
  function planConquests(g, side) {
    if ((g.mode !== 'conquest' && g.mode !== 'scenario') || g.over || g.phase !== side || side !== g.player) return;
    prune(g);
    const cities = g.stations.filter(s => foeSide(g, s.owner, side) &&
      E.tile(g, s.c, s.r) && !E.TERRAIN[E.tile(g, s.c, s.r).terrain]?.blocked);
    const reserved = new Set();
    const active = groups(g).filter(gr => gr.side === side && gr.autoConquer && gr.stance !== 'assault').sort((a, b) => a.id - b.id);
    for (const gr of active) {
      const members = gr.units.map(id => g.units.find(u => u.id === id && u.hp > 0 && u.side === side)).filter(Boolean),
        manual = gr.manualOverrides || {},
        prior = (gr.autoRouted ||= {}),
        available = members.filter(u => manual[u.id] !== g.turn && (!u.goto || matches(u, prior[u.id]))),
        capturers = available.filter(u => E.canCapture(u) && E.TYPES[u.type].naval !== 'ship');
      if (!capturers.length) {
        gr.autoStatus = 'Waiting for capturable units or manual orders';
        continue;
      }
      // Keep the previous objective while it remains hostile and unclaimed by
      // another group. Only perform costly route searches when selecting a new city.
      let city = cities.find(s => s.id === gr.targetStationId && !reserved.has(s.id));
      if (!city) {
        const choices = cities.map(s => ({
          s,
          score: Math.min(...capturers.map(u => E.distance(u, s, g))) +
            (reserved.has(s.id) ? 250 : 0),
        })).sort((a, b) => a.score - b.score || String(a.s.id).localeCompare(String(b.s.id)));
        // Usually the nearest feasible target wins; unreachable terrain does not
        // lead to futile repeated moves. The exact engine remains authoritative.
        for (const v of choices) {
          const p = E.tile(g, v.s.c, v.s.r);
          if (capturers.some(u => (u.c === p.c && u.r === p.r) || !E.gotoReason(g, u, p))) {
            city = v.s;
            break;
          }
        }
      }
      if (!city) {
        gr.autoStatus = cities.length ? 'Blocked: no reachable enemy city' : 'No remaining enemy cities';
        gr.targetStationId = null;
        gr.destination = null;
        continue;
      }
      reserved.add(city.id);
      const goal = { c: city.c, r: city.r };
      for (const u of available) {
        if (matches(u, goal)) { prior[u.id] = goal; continue; }
        if (u.goto && matches(u, prior[u.id])) delete u.goto;
        if (u.c === goal.c && u.r === goal.r) { delete prior[u.id]; continue; }
        // Non-capturing supporting units are moved too, where terrain allows.
        if (E.gotoReason(g, u, E.tile(g, goal.c, goal.r))) continue;
        if (E.setGoto(g, u.id, goal.c, goal.r).ok) prior[u.id] = goal;
      }
      gr.destination = goal;
      gr.targetStationId = city.id;
      const occupant = E.unitAt(g, goal);
      const defended = city.shield > 0 || !!occupant && E.foe(g, occupant.side, side);
      const near = capturers.some(u => E.distance(u, goal, g) <= 1);
      gr.autoStatus = defended && near ? 'Combat required (manual attacks)' :
        available.some(u => matches(u, goal) && !u.moved) ? 'Advancing' : 'Waiting or blocked';
    }
  }
  function foeSide(g, owner, side) {
    return owner != null && owner !== side && E.foe(g, owner, side);
  }

  function runFire(g, side) {
    const report = { fired: [], failed: [] };
    if (g.over || g.phase !== side) return report;
    const shooting = [];
    for (const gr of groups(g)) {
      if (gr.side !== side || gr.autoConquer || gr.stance !== 'assault') continue;
      for (const id of gr.units) {
        const u = g.units.find(v => v.id === id && v.hp > 0 && v.side === side);
        if (u) shooting.push({ u, gr });
      }
    }
    for (const { u, gr } of shooting) {
      if (g.over) break;
      if (u.attacked || u.morale <= -3 || u.autoFireTurn === g.turn) continue;
      const targets = E.targets(g, u);
      if (!targets.length) continue;
      const goal = gr.destination;
      const ranked = targets.map(p => {
        const enemy = E.unitAt(g, p), station = E.stationAt(g, p);
        return { p, score: (goal && p.c === goal.c && p.r === goal.r ? 1000 : 0) +
            (enemy ? 150 + (1 - enemy.hp / Math.max(1, E.maxHP(enemy))) * 30 : station ? 65 : 0) -
            (goal ? E.distance(p, goal, g) : E.distance(p, u, g)) };
      }).sort((a,b) => b.score - a.score || a.p.r - b.p.r || a.p.c - b.p.c);
      const p = ranked[0].p;
      const attack = E.attack(g, u.id, p.c, p.r);
      if (attack.ok) {
        u.autoFireTurn = g.turn;
        report.fired.push({ id: u.id, ...attack });
      } else report.failed.push(u.id);
    }
    return report;
  }
  E.suspendArmyGroupConquestUnit = suspendConquestUnit;
  E.setArmyGroupConquest = setConquest;
  E.planArmyGroupConquest = planConquests;
  E.ARMY_GROUP_STANCES = STANCES;
  E.setArmyGroupStance = setStance;
  E.runArmyGroupFire = runFire;
  E.armyGroups = groups;
  E.armyGroup = find;
  E.armyGroupPrune = prune;
  E.createArmyGroup = create;
  E.addArmyGroupUnit = add;
  E.removeArmyGroupUnit = remove;
  E.orderArmyGroup = order;
  E.cancelArmyGroup = cancel;
  E.disbandArmyGroup = disband;
})(Knightmare);

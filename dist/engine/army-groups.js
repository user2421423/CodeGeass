/* Player-defined operational groups for world conquest.
   Groups issue ordinary standing orders and never bypass movement, combat or capture rules.
   Source of truth: this standalone extension; loaded after engine.js. */
(function (E) {
  'use strict';
  const MAX_GROUPS = 12;
  const MAX_UNITS = 24;

  const groups = g => (g.armyGroups ||= []);
  const find = (g, id) => groups(g).find(v => v.id === id && v.side === g.player);
  function canEdit(g) {
    if (g.mode !== 'conquest') return 'Available in world conquest only';
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
    const group = { id, side: g.player, name: 'Army Group ' + id, units: [], destination: null };
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
    }
    group.units.push(unitId);
    let routed = false;
    if (group.destination) {
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
    for (const u of ready) {
      if (u.c === c && u.r === r) delete u.goto;
      else E.setGoto(g, u.id, c, r);
    }
    group.destination = { c: p.c, r: p.r };
    return { ok: true, assigned: ready.length, failed: rejected.length };
  }
  function cancel(g, groupId) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    if (!group.destination) return { ok: false, reason: 'No objective set' };
    for (const id of group.units) clearMatchingOrder(g, g.units.find(u => u.id === id), group.destination);
    group.destination = null;
    return { ok: true };
  }
  function disband(g, groupId) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    if (group.destination) cancel(g, groupId);
    g.armyGroups = groups(g).filter(gr => gr !== group);
    return { ok: true };
  }
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

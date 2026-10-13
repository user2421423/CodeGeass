/* Player army group management UI; loaded after scenario screens. */
'use strict';
function armyGroupMember(id) {
  return game.units.find(u => u.id === id && u.hp > 0) ||
    game.units.flatMap(u => u.cargo || []).find(u => u.id === id && u.hp > 0) || null;
}
function selectedArmyIds() {
  const chosen = selectedUnit();
  if (multiSelectedIds.size) return [...multiSelectedIds].filter(id =>
    game.units.some(u => u.id === id && u.hp > 0 && u.side === game.player));
  return chosen?.side === game.player ? [chosen.id] : [];
}

function armyGroupAddSelection(groupId) {
  if (!interactive()) return;
  let added = 0, skipped = 0;
  for (const id of selectedArmyIds()) {
    const r = E.addArmyGroupUnit(game, groupId, id);
    if (r.ok) added++;
    else skipped++;
  }
  if (added) refreshAndSave();
  armyGroupsDialog(groupId);
  toast(added + ' selected units assigned' + (skipped ? ' · ' + skipped + ' skipped' : '') + '.');
}

function armyGroupSetStance(groupId, stance) {
  const r = E.setArmyGroupStance(game, groupId, stance);
  if (!r.ok) return toast(r.reason);
  refreshAndSave();
  armyGroupsDialog(groupId);
  toast('Stance set to ' + E.ARMY_GROUP_STANCES[stance] + '.');
}
function armyGroupForUnit(id) {
  return E.armyGroups(game).find(gr => gr.units.includes(id)) || null;
}

function armyGroupLabel(gr) {
  return gr?.name || 'Army group';
}

function activeArmyGroup() {
  return (game.mode === 'conquest' || game.mode === 'scenario') && activeArmyGroupId != null
    ? E.armyGroup(game, activeArmyGroupId) : null;
}

// Choose a group in the management panel; map Shift-click then toggles its members.
function armyGroupActivate(id) {
  const next = id == null ? null : E.armyGroup(game, id);
  if (id != null && !next) return toast('Army group not found.');
  activeArmyGroupId = next?.id ?? null;
  multiSelectedIds.clear();
  closeModal();
  updateSelection();
  toast(next ? armyGroupLabel(next) + ' active. Shift-click friendly units to add or remove them.' :
    'No active group. Shift-click selects formations to create a new group.');
}
function armyGroupToggleUnit(id) {
  const gr = activeArmyGroup();
  if (!gr || !interactive()) return false;
  const assigned = gr.units.includes(id);
  const result = assigned ? E.removeArmyGroupUnit(game, gr.id, id) :
    E.addArmyGroupUnit(game, gr.id, id);
  if (!result.ok) {
    toast(result.reason);
    return true;
  }
  multiSelectedIds.clear();
  selection = { kind: 'unit', id };
  refreshAndSave();
  toast(armyGroupLabel(gr) + (assigned ? ': unit removed.' : ': unit assigned.'));
  return true;
}

function armyGroupDestination(gr) {
  if (!gr.destination) return 'No objective';
  const p = E.tile(game, gr.destination.c, gr.destination.r);
  return p ? E.targetName(game, p) : 'Unknown destination';
}


const STRATEGIC_GROUP_COLORS = ['#ffd36e', '#62d9fa', '#ff91c4', '#aff29f', '#cbb1ff', '#ffa876'];
function strategicGroupColor(gr) {
  return STRATEGIC_GROUP_COLORS[((gr.id - 1) % STRATEGIC_GROUP_COLORS.length + STRATEGIC_GROUP_COLORS.length) % STRATEGIC_GROUP_COLORS.length];
}
function strategicFriendlyGroups() {
  return (game.mode === 'conquest' || game.mode === 'scenario')
    ? (game.armyGroups || []).filter(gr => gr.side === game.player) : [];
}
function strategicGroupOnMap(gr) {
  const ids = new Set(gr.units || []);
  return game.units.filter(u => ids.has(u.id) && u.hp > 0 && u.side === game.player);
}
function strategicGroupAnchor(gr) {
  const units = strategicGroupOnMap(gr);
  if (!units.length) return null;
  const first = hexCenter(units[0]);
  let x = 0, y = 0;
  for (const unit of units) {
    const p = hexCenter(unit);
    x += wrapNear(p.x, first.x);
    y += p.y;
  }
  x /= units.length;
  return { x: wraps() ? ((x % WORLD_W) + WORLD_W) % WORLD_W : x, y: y / units.length };
}
// A local, disclosed estimate from observed positions: no AI orders or hidden plans.
function strategicGroupReport(gr) {
  const members = (gr.units || []).map(armyGroupMember).filter(u => u && u.side === game.player);
  const deployed = strategicGroupOnMap(gr);
  const ready = deployed.filter(u => u.morale > -3 && !u.attacked &&
    u.hp >= E.maxHP(u) * 0.35);
  const goal = gr.destination && E.tile(game, gr.destination.c, gr.destination.r);
  const enemies = goal ? game.units.filter(u => u.hp > 0 && E.foe(game, u.side, game.player) &&
    E.distance(u, goal, game) <= 4) : [];
  const distances = goal ? deployed.map(u => E.distance(u, goal, game)) : [];
  let arrival = 'No objective';
  if (gr.stance === 'hold') arrival = 'Paused (Hold Position)';
  else if (goal && !deployed.length) arrival = 'No deployed formations';
  else if (goal) {
    const turns = distances.map((d, i) => Math.ceil(d / Math.max(1,
      E.TYPES[deployed[i].type]?.move || 1))).sort((a, b) => a - b);
    arrival = turns.every(t => t === 0) ? 'At objective' :
      'Approximately ' + turns[Math.floor(turns.length / 2)] + ' turn(s) (terrain may delay)';
  }
  let status = 'Awaiting objective';
  if (!members.length) status = 'No formations assigned';
  else if (gr.autoConquer) status = gr.autoStatus || 'Choosing a city';
  else if (gr.stance === 'hold') status = 'Holding position';
  else if (goal && !deployed.length) status = 'Awaiting deployment';
  else if (goal && distances.every(d => d === 0)) status = 'At objective';
  else if (goal && gr.stance === 'assault' && enemies.length &&
    distances.some(d => d <= 3)) status = 'Engaging';
  else if (goal) status = 'Advancing';
  let threat = 'No objective to assess';
  if (goal) threat = !enemies.length ? 'No visible hostiles within 4 hexes' :
    enemies.length >= Math.max(1, ready.length) ? 'Outnumbered (' + enemies.length + ' visible hostiles)' :
    enemies.length * 2 >= ready.length ? 'Contested (' + enemies.length + ' visible hostiles)' :
    'Light resistance (' + enemies.length + ' visible hostiles)';
  return { members: members.length, ready: ready.length, arrival, status, threat, enemies: enemies.length };
}
function toggleStrategicOverlay() {
  if (game.mode !== 'conquest' && game.mode !== 'scenario') return;
  strategicOverlay = !strategicOverlay;
  requestMapFrame(); // Draw over the existing atlas; do not invalidate terrain/map cache.
  if (modal.querySelector('[aria-label="Army groups"]')) armyGroupsDialog(activeArmyGroupId);
  else toast('Strategic overlay ' + (strategicOverlay ? 'enabled' : 'disabled') + ' (V).');
}

function armyGroupsDialog(editId = null) {
  if (game.mode !== 'conquest' && game.mode !== 'scenario') return;
  armyGroupRouting = null;
  E.armyGroupPrune(game);
  const groups = E.armyGroups(game);
  const gr = editId == null ? null : E.armyGroup(game, editId);
  if (gr) activeArmyGroupId = gr.id;
  const active = activeArmyGroup();
  const selected = selectedUnit();
  const chosen = selected?.side === game.player ? selected : null;
  const chosenIds = selectedArmyIds();
  let content = '';
  if (!gr) {
    content = groups.length ? groups.map(v => {
      const live = v.units.map(armyGroupMember).filter(Boolean);
      const selectedCanJoin = chosenIds.some(id => !v.units.includes(id));
      const report = strategicGroupReport(v);
      return `<div class="conquest-row scenario-army-row"><div><label>${live.length} unit${live.length === 1 ? '' : 's'} · ${esc(E.ARMY_GROUP_STANCES[v.stance || 'advance'])} · ${esc(armyGroupDestination(v))}</label><h3 class="conquest-title">${esc(armyGroupLabel(v))}</h3><p class="mode-note">${live.slice(0,5).map(u => esc(E.TYPES[u.type].name)).join(' · ')}${live.length > 5 ? ' · …' : ''}</p><p class="mode-note">${esc(report.status)} · Ready ${report.ready}/${report.members} · ${esc(report.threat)}</p></div><div class="scenario-group-buttons"><button class="${active?.id === v.id ? 'primary' : 'small'}" data-army-activate="${active?.id === v.id ? '' : v.id}">${active?.id === v.id ? 'Stop assigning' : 'Use for Shift-click'}</button><button class="small" data-army-focus="${v.id}">Locate</button><button data-army-edit="${v.id}">Manage</button>${selectedCanJoin ? `<button class="small" data-army-add-selection="${v.id}">Add selected (${chosenIds.length})</button>` : ''}<button class="primary" data-army-route="${v.id}">Set objective</button></div></div>`;
    }).join('') : '<p>No army groups yet. Shift-click your Knightmares on the map to select multiple formations, then create a group.</p>';
    if (game.mode === 'scenario') content += '<div class="dialog-footer"><button class="small" data-action="scenario-armies">Browse starting formations & fleets</button></div>';
  } else {
    const live = gr.units.map(armyGroupMember).filter(Boolean);
    const anchor = live[0] || chosen || game.stations.find(s => s.owner === game.player);
    const available = ownUnits()
      .filter(u => !gr.units.includes(u.id))
      .sort((a,b) => (anchor ? E.distance(a, anchor, game) - E.distance(b, anchor, game) : 0) || a.id - b.id)
      .slice(0,48);
    const row = u => `<div class="conquest-row scenario-army-row"><div><label>${esc(F(u.side).short)} · ${u.c},${u.r}${!game.units.includes(u) ? ' · Aboard carrier' : ''}${u.cmd ? ' · ' + esc(C(u.cmd)?.short || u.cmd) : ''}</label><strong>${esc(unitName(u))} ×${u.stack}</strong></div><div><button class="small" data-army-${gr.units.includes(u.id) ? 'remove' : 'add'}="${gr.id}:${u.id}">${gr.units.includes(u.id) ? 'Remove' : 'Add'}</button></div></div>`;
    const report = strategicGroupReport(gr);
    content = `<div class="conquest-row"><div><label>Current objective</label><h3 class="conquest-title">${esc(armyGroupDestination(gr))}</h3><p class="mode-note">${live.length}/24 units. All units remain individually controllable. Hold Position issues no group movement or attacks; individual standing orders still work.</p></div><div class="scenario-group-buttons"><button class="primary" data-army-route="${gr.id}">Set objective</button><button class="small" data-army-conquer="${gr.id}">${gr.autoConquer ? 'Stop capturing cities' : 'Capture Remaining Cities'}</button>${gr.autoConquer ? '<span class="mode-note">Status: ' + esc(gr.autoStatus || 'Planning') + '</span>' : ''}${gr.destination ? `<button data-army-cancel="${gr.id}">Cancel group order</button>` : ''}</div></div><div class="conquest-row"><div><label>Operational summary · visible battlefield only</label><h3 class="conquest-title">${esc(armyGroupLabel(gr))}</h3><p class="mode-note">Order: ${esc(gr.autoConquer ? 'Capture Remaining Cities' : E.ARMY_GROUP_STANCES[gr.stance || 'advance'])} · Objective: ${esc(armyGroupDestination(gr))}</p><p class="mode-note">Status: ${esc(report.status)} · Assigned formations: ${report.members} · Combat-ready: ${report.ready}</p><p class="mode-note">Expected arrival: ${esc(report.arrival)}</p><p class="mode-note">Threat assessment: ${esc(report.threat)}</p></div></div><div class="dialog-head"><div><h3>Stance: ${esc(E.ARMY_GROUP_STANCES[gr.stance || 'advance'])}</h3><p>Advance moves only · Hold Position gives no automated group orders · Assault advances and fires.</p></div><div class="scenario-group-buttons">${Object.entries(E.ARMY_GROUP_STANCES).map(([stance, title]) => `<button class="${(gr.stance || 'advance') === stance ? 'primary' : 'small'}" data-army-stance="${gr.id}:${stance}" ${!interactive() ? 'disabled' : ''}>${title}</button>`).join('')}</div></div><div class="dialog-head"><div><h3>Assigned units</h3><p>${live.length ? 'Remove a unit without affecting the rest of the group.' : 'Choose units below to build this group.'}</p></div></div><div style="max-height:30vh;overflow-y:auto">${live.map(row).join('') || '<p class="mode-note">None assigned.</p>'}</div><div class="dialog-head"><div><h3>Available Knightmares</h3><p>Nearest available units are listed first. Use Add nearby for units within five hexes of the first member.</p></div><div class="scenario-group-buttons"><button class="small" data-army-add-selection="${gr.id}" ${!chosenIds.length || !interactive() ? 'disabled' : ''}>Add selected (${chosenIds.length})</button><button class="small" data-army-nearby="${gr.id}">Add nearby</button></div></div><div style="max-height:29vh;overflow-y:auto">${available.map(row).join('') || '<p class="mode-note">No available units.</p>'}</div><div class="dialog-footer"><button class="ghost" data-army-disband="${gr.id}">Disband group</button><button data-action="army-groups">Back to groups</button></div>`;
  }
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Army groups"><div class="dialog-head"><div><div class="eyebrow">${game.mode === 'scenario' ? 'Regional scenario' : 'World conquest'} · Operational command</div><h2>${gr ? esc(armyGroupLabel(gr)) : 'Army Groups'}</h2><p>Choose a group with Use for Shift-click, then Shift-click friendly units on the map to add or remove them. With no active group, Shift-click multi-selects for group creation. Advance moves only; Hold Position leaves units under manual control; Assault advances and fires. Orders execute at turn start or when you click Do all orders now.</p></div><div class="scenario-group-buttons"><button class="small" data-army-overlay="toggle" aria-pressed="${strategicOverlay}" >Strategic overlay: ${strategicOverlay ? 'On' : 'Off'} (V)</button><button class="small close" data-action="close">Close</button></div></div>${content}${gr ? '' : `<div class="dialog-footer"><button class="primary" data-action="army-create" ${!interactive() ? 'disabled' : ''}>Create army group${chosen ? ' with selected unit' : ''}</button></div>`}</section></div>`;
  focusDialog();
}

function armyGroupCreate() {
  const u = selectedUnit();
  const chosen = selectedArmyIds();
  const r = E.createArmyGroup(game, chosen[0] || null);
  if (!r.ok) return toast(r.reason);
  for (const id of chosen.slice(1, 24)) E.addArmyGroupUnit(game, r.group.id, id);
  refreshAndSave();
  armyGroupsDialog(r.group.id);
  toast(armyGroupLabel(r.group) + ' formed with ' + r.group.units.length + ' units.');
}

function armyGroupStartRouting(id) {
  if (!interactive() || !E.armyGroup(game, id)) return;
  activeArmyGroupId = id;
  armyGroupRouting = id;
  routing = null;
  deploying = null;
  strikeMode = false;
  scenarioRoutingGroup = null;
  closeModal();
  updateSelection();
  toast('Click a destination hex for ' + armyGroupLabel(E.armyGroup(game, id)) + '. Escape cancels.', true);
}

function armyGroupFocus(id) {
  const gr = E.armyGroup(game, id);
  if (!gr) return;
  activeArmyGroupId = id;
  closeModal();
  const u = gr.units.map(id => game.units.find(v => v.id === id && v.hp > 0)).find(Boolean) ||
    game.units.find(v => (v.cargo || []).some(c => gr.units.includes(c.id) && c.hp > 0));
  if (u) selectUnit(u.id, true);
  else if (gr.destination) centerOn(gr.destination);
}

function armyGroupAddNearby(id) {
  const gr = E.armyGroup(game, id);
  if (!gr || !interactive()) return;
  const first = gr.units.map(armyGroupMember).find(Boolean) ||
    selectedUnit() || game.stations.find(s => s.owner === game.player);
  if (!first) return toast('Select a unit to anchor this group first.');
  let added = 0;
  for (const u of ownUnits().filter(u => E.distance(u, first, game) <= 5 && !armyGroupForUnit(u.id)).sort((a,b) => a.id-b.id)) {
    if (gr.units.length >= 24) break;
    if (E.addArmyGroupUnit(game, id, u.id).ok) added++;
  }
  if (added) refreshAndSave();
  armyGroupsDialog(id);
  toast(added ? added + ' nearby units added.' : 'No unassigned units within five hexes.');
}

function runPlayerAutomatedOrders() {
  const combatBefore = combatVisualSnapshot();
  E.planArmyGroupConquest(game, game.player);
  const orders = E.runGotos(game, game.player);
  E.planArmyGroupConquest(game, game.player);
  for (const m of orders.moved) {
    effects.push({ kind: 'move', unitId: m.id, from: m.from, to: m.to,
      color: F(game.player).color, life: 0.6, max: 0.6 });
  }
  if (orders.moved.length) SFX.play('move', game.player);
  const fire = E.runArmyGroupFire(game, game.player);
  orders.fired = fire.fired;
  for (const shot of fire.fired) {
    const attacker = game.units.find(u => u.id === shot.id && u.hp > 0);
    if (attacker) addCombatEffects(shot, attacker, combatBefore);
  }
  return orders;
}

function executeAllOrdersNow() {
  if (!interactive()) return;
  if (armyGroupRouting || routing || scenarioRoutingGroup || strikeMode || deploying) {
    toast('Finish or cancel destination targeting before executing orders.');
    return;
  }
  // Auto-movement uses the same rules as turn-start orders and cannot be undone.
  undoStack = [];
  const report = runPlayerAutomatedOrders();
  const moved = report.moved.length, fired = report.fired.length;
  refreshAndSave();
  const annexed = report.moved.find(m => m.annexed)?.annexed;
  if (annexed) annexNotice(annexed);
  if (moved || fired)
    toast('Orders executed: ' + moved + ' units moved, ' + fired + ' attacks. Each automated movement/attack is limited to once per turn.', true);
  else toast('No eligible orders: units have already moved, fired, reached their destinations, or are blocked.');
}

/* Player army group management UI; loaded after scenario screens. */
'use strict';
function armyGroupForUnit(id) {
  return E.armyGroups(game).find(gr => gr.units.includes(id)) || null;
}

function armyGroupLabel(gr) {
  return gr?.name || 'Army group';
}

function armyGroupDestination(gr) {
  if (!gr.destination) return 'No objective';
  const p = E.tile(game, gr.destination.c, gr.destination.r);
  return p ? E.targetName(game, p) : 'Unknown destination';
}

function armyGroupsDialog(editId = null) {
  if (game.mode !== 'conquest') return;
  armyGroupRouting = null;
  E.armyGroupPrune(game);
  const groups = E.armyGroups(game);
  const gr = editId == null ? null : E.armyGroup(game, editId);
  const selected = selectedUnit();
  const chosen = selected?.side === game.player ? selected : null;
  let content = '';
  if (!gr) {
    content = groups.length ? groups.map(v => {
      const live = v.units.map(id => game.units.find(u => u.id === id && u.hp > 0)).filter(Boolean);
      const selectedCanJoin = chosen && !v.units.includes(chosen.id);
      return `<div class="conquest-row scenario-army-row"><div><label>${live.length} unit${live.length === 1 ? '' : 's'} · ${esc(armyGroupDestination(v))}</label><h3 class="conquest-title">${esc(armyGroupLabel(v))}</h3><p class="mode-note">${live.slice(0,5).map(u => esc(E.TYPES[u.type].name)).join(' · ')}${live.length > 5 ? ' · …' : ''}</p></div><div class="scenario-group-buttons"><button class="small" data-army-focus="${v.id}">Locate</button><button data-army-edit="${v.id}">Manage</button>${selectedCanJoin ? `<button class="small" data-army-add="${v.id}:${chosen.id}">Add selected</button>` : ''}<button class="primary" data-army-route="${v.id}">Set objective</button></div></div>`;
    }).join('') : '<p>No army groups yet. Create one from your selected Knightmare, or create an empty group first.</p>';
  } else {
    const live = gr.units.map(id => game.units.find(u => u.id === id && u.hp > 0)).filter(Boolean);
    const anchor = live[0] || chosen || game.stations.find(s => s.owner === game.player);
    const available = ownUnits()
      .filter(u => !gr.units.includes(u.id))
      .sort((a,b) => (anchor ? E.distance(a, anchor, game) - E.distance(b, anchor, game) : 0) || a.id - b.id)
      .slice(0,48);
    const row = u => `<div class="conquest-row scenario-army-row"><div><label>${esc(F(u.side).short)} · ${u.c},${u.r}${u.cmd ? ' · ' + esc(C(u.cmd)?.short || u.cmd) : ''}</label><strong>${esc(unitName(u))} ×${u.stack}</strong></div><div><button class="small" data-army-${gr.units.includes(u.id) ? 'remove' : 'add'}="${gr.id}:${u.id}">${gr.units.includes(u.id) ? 'Remove' : 'Add'}</button></div></div>`;
    content = `<div class="conquest-row"><div><label>Current objective</label><h3 class="conquest-title">${esc(armyGroupDestination(gr))}</h3><p class="mode-note">${live.length}/24 units. Units continue to be selectable and controllable individually; manually changing a unit's standing order overrides its group destination until the next group order.</p></div><div class="scenario-group-buttons"><button class="primary" data-army-route="${gr.id}">Set objective</button>${gr.destination ? `<button data-army-cancel="${gr.id}">Cancel group order</button>` : ''}</div></div><div class="dialog-head"><div><h3>Assigned units</h3><p>${live.length ? 'Remove a unit without affecting the rest of the group.' : 'Choose units below to build this group.'}</p></div></div><div style="max-height:30vh;overflow-y:auto">${live.map(row).join('') || '<p class="mode-note">None assigned.</p>'}</div><div class="dialog-head"><div><h3>Available Knightmares</h3><p>Nearest available units are listed first. Use Add nearby for units within five hexes of the first member.</p></div><button class="small" data-army-nearby="${gr.id}">Add nearby</button></div><div style="max-height:29vh;overflow-y:auto">${available.map(row).join('') || '<p class="mode-note">No available units.</p>'}</div><div class="dialog-footer"><button class="ghost" data-army-disband="${gr.id}">Disband group</button><button data-action="army-groups">Back to groups</button></div>`;
  }
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Army groups"><div class="dialog-head"><div><div class="eyebrow">World conquest · Operational command</div><h2>${gr ? esc(armyGroupLabel(gr)) : 'Army Groups'}</h2><p>Organize up to 12 groups of 24 formations. Select a map destination to issue standing orders. Units advance at the beginning of your turns, but never attack automatically.</p></div><button class="small close" data-action="close">Close</button></div>${content}${gr ? '' : `<div class="dialog-footer"><button class="primary" data-action="army-create" ${!interactive() ? 'disabled' : ''}>Create army group${chosen ? ' with selected unit' : ''}</button></div>`}</section></div>`;
  focusDialog();
}

function armyGroupCreate() {
  const u = selectedUnit();
  const r = E.createArmyGroup(game, u?.side === game.player ? u.id : null);
  if (!r.ok) return toast(r.reason);
  refreshAndSave();
  armyGroupsDialog(r.group.id);
  toast(armyGroupLabel(r.group) + ' formed.');
}

function armyGroupStartRouting(id) {
  if (!interactive() || !E.armyGroup(game, id)) return;
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
  closeModal();
  const u = gr.units.map(id => game.units.find(v => v.id === id && v.hp > 0)).find(Boolean);
  if (u) selectUnit(u.id, true);
  else if (gr.destination) centerOn(gr.destination);
}

function armyGroupAddNearby(id) {
  const gr = E.armyGroup(game, id);
  if (!gr || !interactive()) return;
  const first = gr.units.map(id => game.units.find(u => u.id === id && u.hp > 0)).find(Boolean) ||
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

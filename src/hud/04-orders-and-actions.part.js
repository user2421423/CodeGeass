function selectUnit(id, center = false) {
  multiSelectedIds.clear();
  deploying = null;
  carrierHoldOpen = null;
  detailOpen = false;
  const u = game.units.find(v => v.id === id && v.hp > 0);
  if (!u) return;
  selection = { kind: 'unit', id };
  updateSelection();
  if (typeof tutorialCheck === 'function') tutorialCheck();
  if (center) centerOn(u);
}
function selectStation(id, center = false) {
  multiSelectedIds.clear();
  deploying = null;
  carrierHoldOpen = null;
  const s = game.stations.find(v => v.id === id);
  if (!s) return;
  selection = { kind: 'station', id };
  updateSelection();
  if (typeof tutorialCheck === 'function') tutorialCheck();
  if (center) centerOn(s);
}
function selectPort(id, center = false) {
  multiSelectedIds.clear();
  deploying = null;
  carrierHoldOpen = null;
  const s = game.stations.find(v => v.id === id && v.portLevel && v.portAt);
  if (!s) return;
  selection = { kind: 'port', id };
  updateSelection();
  if (center) centerOn(s.portAt);
}
function selectSite(id, center = false) {
  multiSelectedIds.clear();
  carrierHoldOpen = null;
  const d = game.sites?.find(v => v.id === id);
  if (!d) return;
  selection = { kind: 'site', id };
  updateSelection();
  if (center) centerOn(d);
}
// Standing orders: the next map click sets the selected unit's destination.
function startRouting() {
  const u = selectedUnit();
  if (!u || u.side !== game.player || !interactive()) return;
  armyGroupRouting = null;
  routing = routing === u.id ? null : u.id;
  deploying = null;
  carrierHoldOpen = null;
  detailOpen = false;
  updateSelection();
  if (routing) toast(`Click the hex ${unitName(u)} should head for. Escape cancels.`);
}
function nextFleet() {
  // Cycle usable fortress beams together with regular ready units. A charged
  // battery only counts when an enemy is actually in range; otherwise it would
  // repeatedly interrupt the cycle despite having no valid shot.
  const ready = [
    ...ownUnits()
      // Carriers belong in Next Unit only when at least one embarked unit can land.
      // Movement, firing and repairs alone must not keep an undeployable carrier in the cycle.
      .filter(u => readyIds.has(u.id) &&
        (E.TYPES[u.type]?.naval !== 'ship' ||
          u.cargo?.some((_, i) => !E.deployReason(game, u, i))))
      .map(u => ({ kind: 'unit', id: u.id })),
    ...game.stations
      .filter(s => s.owner === game.player && s.fort && E.fortressTargets(game, s).length > 0)
      .map(s => ({ kind: 'station', id: s.id })),
  ];
  if (!ready.length) {
    toast('All units and fortress batteries have completed their orders. End the turn to continue.');
    return;
  }
  const i = ready.findIndex(item => item.kind === selection?.kind && item.id === selection?.id);
  const next = ready[(i + 1) % ready.length];
  if (next.kind === 'station') {
    // The red target hexes are immediately actionable from the city selection.
    selectStation(next.id, true);
  } else selectUnit(next.id, true);
}
function refreshAndSave(keepUndo = false) {
  if (!keepUndo) undoStack = [];
  render();
  save();
  if (typeof tutorialCheck === 'function') tutorialCheck();
  campaignFeed(() => game.over && resultDialog());
}
function doAction(fn) {
  if (!interactive()) return;
  const before = unitSnapshot(),
    result = fn();
  if (!result?.ok) {
    toast(result?.reason || 'Order unavailable.');
    return;
  }
  moralePopups(before);
  refreshAndSave();
}
function attackHex(p) {
  const u = selectedUnit();
  if (!u || !p || !interactive()) return;
  const before = unitSnapshot(),
    visuals = combatVisualSnapshot(),
    result = E.attack(game, u.id, p.c, p.r);
  if (!result.ok) {
    toast(result.reason);
    return;
  }
  // Manual fire suppresses the planner for this unit this turn, not indefinitely.
  E.suspendArmyGroupConquestUnit(game, u.id);
  addCombatEffects(result, u, visuals);
  moralePopups(before);
  refreshAndSave();
  if (result.breakthrough) toast('Breakthrough! This unit can act again.');
  else if (result.destroyed && !game.over) toast('Enemy formation destroyed.');
}
// Unit movement undo: a unit that moved but has not fired returns to where it started.
function undoMove() {
  if (!interactive() || !undoStack.length) return;
  const { snapshot, unitId } = undoStack.pop();
  game = E.unpackSave(JSON.parse(snapshot));
  effects = effects.filter(e => e.kind !== 'move');
  selection = { kind: 'unit', id: unitId };
  render();
  save();
  if (typeof tutorialCheck === 'function') tutorialCheck();
}
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause = ms => new Promise(resolve => setTimeout(resolve, reducedMotion() ? 15 : ms));
// Whether a hex is on screen, so off-screen rival moves play instantly.
function onScreen(p) {
  if (!p || !canvas) return false;
  const scale = computeView(),
    c = hexCenter(p),
    x = wrapNear(c.x, (mapSize.w / 2 - offset.x) / scale) * scale + offset.x,
    y = c.y * scale + offset.y;
  return x > -40 && x < mapSize.w + 40 && y > -40 && y < mapSize.h + 40;
}

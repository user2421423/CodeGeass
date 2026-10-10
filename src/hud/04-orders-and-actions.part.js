function selectUnit(id, center = false) {
  deploying = null;
  carrierHoldOpen = null;
  detailOpen = false;
  const u = game.units.find(v => v.id === id && v.hp > 0);
  if (!u) return;
  selection = { kind: 'unit', id };
  updateSelection();
  if (center) centerOn(u);
}
function selectStation(id, center = false) {
  deploying = null;
  carrierHoldOpen = null;
  const s = game.stations.find(v => v.id === id);
  if (!s) return;
  selection = { kind: 'station', id };
  updateSelection();
  if (center) centerOn(s);
}
function selectSite(id, center = false) {
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
  routing = routing === u.id ? null : u.id;
  deploying = null;
  carrierHoldOpen = null;
  detailOpen = false;
  updateSelection();
  if (routing) toast(`Click the hex ${unitName(u)} should head for. Escape cancels.`);
}
function nextFleet() {
  const ready = ownUnits().filter(u => readyIds.has(u.id));
  if (!ready.length) {
    toast('All units have completed their orders. End the turn to continue.');
    return;
  }
  const i = ready.findIndex(u => u.id === selection?.id);
  selectUnit(ready[(i + 1) % ready.length].id, true);
}
function refreshAndSave(keepUndo = false) {
  if (!keepUndo) undoStack = [];
  render();
  save();
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
  addCombatEffects(result, u, visuals);
  moralePopups(before);
  refreshAndSave();
  if (result.breakthrough) toast('Breakthrough! This unit can act again.');
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
  toast('Move undone.');
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

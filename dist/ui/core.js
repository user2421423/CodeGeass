/* Knightmare Conquest UI: UI state, constants, saving and modal helpers. Every ui/*.js file is a classic script sharing these globals;
   index.html loads them in order and game.js starts the game. */
'use strict';
const E = Knightmare,
  $ = id => document.getElementById(id),
  app = $('app'),
  modal = $('modal-root');
let game = E.createGame('britannia'),
  selection = null,
  undoStack = [],
  hover = null,
  canvas,
  ctx,
  zoom = 3.2,
  cam = { x: 0, y: 0 },
  baseScale = 1,
  offset = { x: 0, y: 0 },
  mapSize = { w: 0, h: 0 },
  effects = [],
  setup = { side: 'britannia', difficulty: 'normal' },
  shop = { station: null, branch: 'Infantry', stack: 1 },
  lastTime = 0,
  toastTimer,
  aiToken = 0,
  aiSide = null,
  skipAI = false,
  pointer = null,
  readyCache = new Map(),
  targetCache = new Set(),
  minimapDirty = true,
  minimapBase = null;
let uiActionBusy = false,
  uiStateRevision = 0;
function invalidateUIState() {
  uiStateRevision++;
  routeMemo = null;
  if (typeof invalidateMapRender === 'function') invalidateMapRender();
}
let detailOpen = false,
  carrierHoldOpen = null, // Carrier-Battleship id with its cargo picker open
  saveOk = true,
  shake = 0,
  strikeMode = false, // choosing a F.L.E.I.J.A. target
  deploying = null, // { ship, index }: choosing where a carried Knightmare lands
  routing = null, // unit id: choosing the destination of its standing order
  flash = 0; // full-screen white-pink flash, 1 → 0
const R = 43,
  SQ = Math.sqrt(3),
  ZOOM_MIN = 1,
  ZOOM_MAX = 7,
  count = n => Math.round(n).toLocaleString('en-US'),
  esc = s =>
    String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Required attribution notice (shown in the start menu, the game menu and the field manual).
const NOTICE =
  'Code Geass and related characters are trademarks and copyrighted property. This project is an unofficial fan creation and is not officially affiliated with or endorsed by the copyright holders.';
// The map in world units: the 100 × 42 world wraps east to west; a campaign battlefield is a closed rectangle.
const mapW = g => SQ * R * (g.cols + (g.wrap ? 0 : 0.6)),
  mapH = g => R * 1.5 * (g.rows - 1) + 2 * R,
  wraps = () => !!game.wrap,
  homeZoom = () => (wraps() ? 3.2 : 1.25);
let WORLD_W, WORLD_H;
function setWorld() {
  WORLD_W = mapW(game);
  WORLD_H = mapH(game);
}
setWorld();
// A campaign mission saves apart from your conquest, so neither replaces the other.
const SAVE_KEY = 'knightmare-conquest-save',
  CAMPAIGN_KEY = 'knightmare-conquest-mission',
  PROFILE_KEY = 'knightmare-conquest-profile',
  saveKey = () => (game.mode === 'campaign' ? CAMPAIGN_KEY : SAVE_KEY);
const ownUnits = () => game.units.filter(u => u.hp > 0 && u.side === game.player),
  selectedUnit = () => (selection?.kind === 'unit' ? game.units.find(u => u.id === selection.id && u.hp > 0) : null),
  selectedStation = () => (selection?.kind === 'station' ? game.stations.find(s => s.id === selection.id) : null),
  selectedSite = () => (selection?.kind === 'site' ? game.sites?.find(d => d.id === selection.id) || null : null);
const interactive = () => !uiActionBusy && !game.over && game.phase === game.player;
const F = side => game.factions?.[side] || E.FACTIONS[side] || E.FACTIONS.neutral,
  C = k => E.COMMANDERS[k];
function toast(text, long = false) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), long ? 6000 : 3500);
}
// The commander whose Commander Info card is open, so HQ orders can refresh it.
let generalOpen = null;
function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
    if (p.research) p.research = E.normalizeResearch(p.research);
    return p;
  } catch (e) {
    return {};
  }
}
function saveProfile(p) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    return true;
  } catch (e) {
    toast('This browser could not save your command records.');
    return false;
  }
}
function save() {
  if (game.phase !== game.player && !game.over) return false;
  try {
    localStorage.setItem(saveKey(), JSON.stringify(E.packSave(game)));
    saveOk = true;
    return true;
  } catch (e) {
    saveOk = false;
    toast('This browser could not save progress. Keep this tab open.');
    return false;
  }
}
function getSave(key = SAVE_KEY) {
  try {
    const g = E.unpackSave(JSON.parse(localStorage.getItem(key)));
    if (g?.game === 'knightmare' && g.tiles?.length === g.cols * g.rows && g.units && g.stations && E.FACTIONS[g.player])
      return E.migrateSave(g);
  } catch (e) {}
  return null;
}
// A stored operation this version cannot load (older rules or map): kept until the player chooses to replace it.
function unreadableSave(key = SAVE_KEY) {
  try {
    return !!localStorage.getItem(key) && !getSave(key);
  } catch (e) {
    return false;
  }
}
// Each mode has one save slot. Starting over replaces it, so confirm first when it holds an unfinished or
// unreadable operation. `cancel` is the action that returns to where the player came from.
let pendingReplace = null;
function confirmReplace(key, cancel, then) {
  const s = getSave(key),
    unreadable = unreadableSave(key);
  if (!unreadable && (!s || s.over)) return then();
  pendingReplace = then;
  const what = unreadable
    ? 'The saved operation is from an older version of the game and can no longer be loaded.'
    : `Your ${s.mode === 'campaign' ? 'mission' : 'conquest'} in progress (turn ${s.turn}) will be lost.`;
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="Replace saved operation"><div class="eyebrow">Saved operation</div><h2>Start over?</h2><p>${what} Starting now replaces it.</p><div class="dialog-footer"><button data-action="${cancel}">Keep it</button><button class="primary" data-action="replace-confirm">Start over</button></div></section></div>`;
  focusDialog();
}
function focusDialog() {
  setTimeout(() => modal.querySelector('button:not(:disabled),select,input:not(:disabled)')?.focus(), 15);
}
function closeModal() {
  generalOpen = null;
  modal.innerHTML = '';
  canvas?.focus({ preventScroll: true });
}
function capitalOf(side) {
  return game.stations.find(s => s.capitalOf === side && s.owner === side) || game.stations.find(s => s.owner === side);
}
// Where the map's ⌂ button looks: your capital, first city or commander.
const homeOf = () => capitalOf(game.player) || ownUnits().find(u => u.cmd) || ownUnits()[0];
// Everything tied to the game being replaced: an unfinished rival turn (aiToken aborts it), its Skip state,
// open drawers, targeting modes, undo history and in-flight effects.
function resetSession() {
  aiToken++;
  aiSide = null;
  skipAI = false;
  hqBack = 'game';
  strikeMode = false;
  carrierHoldOpen = null;
  detailOpen = false;
  deploying = null;
  routing = null;
  undoStack = [];
  effects = [];
}
function newGame() {
  resetSession();
  game = E.applyProfile(E.createGame(setup.side, setup.difficulty, 'conquest', Date.now() >>> 0), loadProfile());
  setWorld();
  selection = { kind: 'unit', id: ownUnits().find(u => u.cmd)?.id };
  zoom = 3.2;
  closeModal();
  render();
  const u = selectedUnit();
  centerOn(u || capitalOf(game.player));
  save();
  toast('Select a Knightmare: green hexes move it, red hexes attack at once. Blue hexes are sea.');
}

/* Knightmare Conquest UI: UI state, constants, saving and modal helpers. Every ui/*.js file is a classic script sharing these globals;
   index.html loads them in order and game.js starts the game. */
'use strict';
const E = Knightmare,
  $ = id => document.getElementById(id),
  app = $('app'),
  modal = $('modal-root');
let game = E.createGame('britannia'),
  selection = null,
  multiSelectedIds = new Set(), // Shift-clicked friendly formations when no group is active
  activeArmyGroupId = null, // UI-only group chosen for direct Shift-click assignment
  strategicOverlay = false, // Derived compatibility flag for the view
  strategicOverlayMode = 'off', // Off / all, never game-rule state
  strategicOverlayManuallySet = false, // Preserve explicit Off when managing groups
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
  setup = { side: 'britannia', difficulty: 'normal', conquest: 'world' },
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
  armyGroupRouting = null, // army group id: choosing its shared destination
  routing = null, // unit id: choosing the destination of its standing order
  flash = 0; // full-screen white-pink flash, 1 → 0
const R = 43,
  SQ = Math.sqrt(3),
  ZOOM_MIN = 1,
  ZOOM_MAX = 24, // Close inspection: 3.4x the previous maximum map magnification.
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
  homeZoom = () => (game.mode === 'scenario' ?
    // Europe needs a closer opening camera to make its 120 × 80 battlefront
    // legible. Japan retains its established 2.15 strategic opening zoom.
    (E.scenarios?.byId?.[game.scenario?.id]?.meta?.map?.homeZoom || 2.15) : wraps() ? 3.2 : 1.25);
let WORLD_W, WORLD_H;
function setWorld() {
  WORLD_W = mapW(game);
  WORLD_H = mapH(game);
}
setWorld();
// Conquest, campaign missions and regional scenarios each have their own slot, so none replaces another.
const SAVE_KEY = 'knightmare-conquest-save',
  UFN_SAVE_KEY = 'knightmare-ufn2018-save',
  chosenSaveKey = () => setup.conquest === 'ufn2018' ? UFN_SAVE_KEY : SAVE_KEY,
  CAMPAIGN_KEY = 'knightmare-conquest-mission',
  SCENARIO_KEY = 'knightmare-conquest-scenario',
  WAR_CAMPAIGN_BATTLE_KEY = KnightmareWarCampaign.BATTLE_KEY,
  PROFILE_KEY = 'knightmare-conquest-profile',
  saveKey = () => (game.mode === 'campaign' ? CAMPAIGN_KEY : game.mode === 'scenario' ? (game.warCampaign ? WAR_CAMPAIGN_BATTLE_KEY : SCENARIO_KEY)
    : game.era === 'ufn2018' ? UFN_SAVE_KEY : SAVE_KEY);
const ownUnits = () => game.units.filter(u => u.hp > 0 && u.side === game.player),
  selectedUnit = () => (selection?.kind === 'unit' ? game.units.find(u => u.id === selection.id && u.hp > 0) : null),
  selectedStation = () => (selection?.kind === 'station' ? game.stations.find(s => s.id === selection.id) : null),
  selectedSite = () => (selection?.kind === 'site' ? game.sites?.find(d => d.id === selection.id) || null : null),
  // A built port is selected through its own hex and builds naval units separately from the city factory.
  selectedPort = () =>
    selection?.kind === 'port' ? game.stations.find(s => s.id === selection.id && s.portLevel && s.portAt) || null : null;
const interactive = () => !uiActionBusy && !game.over && game.phase === game.player;
const F = side => game.factions?.[side] || E.FACTIONS[side] || E.FACTIONS.neutral,
  C = k => E.COMMANDERS[k];
// 2018-only visual alias: territory and save identifiers remain unchanged.
const artSide = side => game?.mode === 'conquest' && game.era === 'ufn2018' && side === 'cf' ? 'ufn' : side;
function toast(text, long = false) {
  postNotice(text, { long });
}
// The commander whose Commander Info card is open, so HQ orders can refresh it.
let generalOpen = null;
// Credit full campaigns once, including progress saved before this research
// update. Campaign progress has its own storage; victory credits stay permanently
// earned even if a player later resets or replays that campaign.
function syncResearchCampaignCompletions(profile) {
  let changed = false;
  const storyCampaigns = E.campaign?.CAMPAIGNS || {};
  for (const [id, campaign] of Object.entries(storyCampaigns)) {
    const missions = campaign.missions || [];
    if (missions.length && missions.every(m => (profile.campaign?.[m.id] || 0) >= 1)) {
      profile.researchStoryCompletions ||= {};
      if (profile.researchStoryCompletions[id] !== true) {
        profile.researchStoryCompletions[id] = true;
        changed = true;
      }
    }
  }
  const campaign = typeof KnightmareWarCampaign === 'undefined' ? null : KnightmareWarCampaign;
  if (campaign?.load) {
    const progress = campaign.load(localStorage);
    for (const [id, tiers] of Object.entries(campaign.registry || {})) {
      if (tiers.length && tiers.every(t => t.missions.length &&
        t.missions.every(m => campaign.completed(progress, id, m.id)))) {
        profile.researchWorldCompletions ||= {};
        if (profile.researchWorldCompletions[id] !== true) {
          profile.researchWorldCompletions[id] = true;
          changed = true;
        }
      }
    }
  }
  return changed;
}
function loadProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_KEY),
      p = saved ? JSON.parse(saved) || {} : {};
    let changed = false;
    // One-time migration: anyone with a pre-existing profile keeps the old free
    // commanders and starter Elite fragment entitlements. Fresh profiles do not
    // receive them. Existing purchased records are never overwritten.
    if (p.startingSetupVersion !== 2) {
      if (saved) {
        p.legacyStarterEntitlements = true;
        p.roster ||= {};
        for (const k of ['suzaku', 'cornelia', 'leila', 'akito', 'xingke', 'xianglin'])
          if (!p.roster[k]) p.roster[k] = E.defaultOfficer(k, true);
        p.elites ||= {};
        for (const id of ['cornelia_gloucester', 'tohdoh_gekka', 'leila_alexander', 'chuyen'])
          if (!p.elites[id]) p.elites[id] = { level: 0, fragments: E.ELITE_UNLOCK_FRAGMENTS };
      }
      p.startingSetupVersion = 2;
      changed = true;
    }
    if (p.researchVersion !== E.RESEARCH_VERSION) {
      // Preserve the existing research migration behavior.
      p.research = {};
      p.researchVersion = E.RESEARCH_VERSION;
      changed = true;
    }
    if (p.research) p.research = E.normalizeResearch(p.research);
    if (p.commanderProgressionVersion !== 1 || p.honorsVersion !== 1) {
      E.roster(p);
      changed = true;
    }
    // Retroactively award the new third-mission Elites to players who have
    // already beaten those battles, without reducing any existing Elite levels.
    for (const [missionId, eliteId] of Object.entries({ br_mef: 'cornelia_gloucester', bk3: 'guren_mkii' }))
      if ((p.campaign?.[missionId] || 0) > 0 && E.unlockStoryElite(p, eliteId))
        changed = true;
    if (syncResearchCampaignCompletions(p)) changed = true;
    if (changed) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    return p;
  } catch (e) {
    return {};
  }
}
function saveProfile(p) {
  try {
    p.researchVersion = E.RESEARCH_VERSION;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    return true;
  } catch (e) {
    toast('This browser could not save your command records.');
    return false;
  }
}
function save() {
  // Training is ephemeral: never write to the scenario, conquest, mission or HQ saves.
  if (game.mode === 'scenario' && game.scenario?.id === 'training-grounds') return true;
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
    : s.mode === 'scenario'
      ? `Your game of ${s.scenario?.title || 'this scenario'} in progress (turn ${s.turn}) will be lost.`
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
  if (typeof resetNotificationUI === 'function') resetNotificationUI();
  aiToken++;
  aiSide = null;
  skipAI = false;
  SFX.setAiTurn(false);
  hqBack = 'game';
  strikeMode = false;
  carrierHoldOpen = null;
  detailOpen = false;
  deploying = null;
  routing = null;
  armyGroupRouting = null;
  multiSelectedIds.clear();
  activeArmyGroupId = null;
  undoStack = [];
  effects = [];
}
function newGame() {
  resetSession();
  game = E.applyProfile(E.createGame(setup.side, setup.difficulty, 'conquest', Date.now() >>> 0, setup.conquest), loadProfile());
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

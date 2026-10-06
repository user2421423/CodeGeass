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
let detailOpen = false,
  saveOk = true,
  shake = 0;
const R = 43,
  SQ = Math.sqrt(3),
  WORLD_W = SQ * R * E.WORLD.cols,
  WORLD_H = R * 1.5 * (E.WORLD.rows - 1) + 2 * R,
  ZOOM_MIN = 1,
  ZOOM_MAX = 7,
  count = n => Math.round(n).toLocaleString('en-US'),
  esc = s =>
    String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SAVE_KEY = 'knightmare-conquest-save',
  PROFILE_KEY = 'knightmare-conquest-profile';
const ownUnits = () => game.units.filter(u => u.hp > 0 && u.side === game.player),
  selectedUnit = () => (selection?.kind === 'unit' ? game.units.find(u => u.id === selection.id && u.hp > 0) : null),
  selectedStation = () => (selection?.kind === 'station' ? game.stations.find(s => s.id === selection.id) : null);
const interactive = () => !game.over && game.phase === game.player;
const F = side => E.FACTIONS[side] || E.FACTIONS.neutral,
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
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveProfile(p) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch (e) {
    toast('This browser could not save your command records.');
  }
}
function save() {
  if (game.phase !== game.player) return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(E.exportProfile(game, loadProfile())));
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    saveOk = true;
  } catch (e) {
    saveOk = false;
    toast('This browser could not save progress. Keep this tab open.');
  }
}
function getSave() {
  try {
    const g = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (g?.game === 'knightmare' && g.tiles?.length === g.cols * g.rows && g.units && g.stations && E.FACTIONS[g.player])
      return E.migrateSave(g);
  } catch (e) {}
  return null;
}
function focusDialog() {
  setTimeout(() => modal.querySelector('button:not(:disabled),select')?.focus(), 15);
}
function closeModal() {
  generalOpen = null;
  modal.innerHTML = '';
  canvas?.focus({ preventScroll: true });
}
function capitalOf(side) {
  return game.stations.find(s => s.capitalOf === side && s.owner === side) || game.stations.find(s => s.owner === side);
}
function newGame() {
  aiToken++;
  hqBack = 'game';
  game = E.applyProfile(E.createGame(setup.side, setup.difficulty, 'conquest', Date.now() >>> 0), loadProfile());
  selection = { kind: 'unit', id: ownUnits().find(u => u.cmd)?.id };
  undoStack = [];
  effects = [];
  zoom = 3.2;
  closeModal();
  render();
  const u = selectedUnit();
  centerOn(u || capitalOf(game.player));
  save();
  toast('Select a Knightmare: green hexes move it, red hexes attack at once. Blue hexes are sea.');
}
const FACTION_BLURB = {
  britannia: {
    portrait: 'suzaku',
    label: 'All hail Britannia',
    text: 'The Americas, Area 11 and Euro Britannia. Suzaku, Cornelia, Bismarck and Julius Kingsley. The richest power, fighting on three fronts.',
  },
  eu: {
    portrait: 'leila',
    label: 'Liberté, égalité, fraternité',
    text: 'Europe and Africa. Leila, Akito and the wZERO unit with the Alexanders, Panzer-Hummel firepower and the El Alamein line.',
  },
  cf: {
    portrait: 'xingke',
    label: 'The Vermillion Forbidden City',
    text: 'Asia from Tehran to Taipei. Li Xingke’s Shen Hu, massed Gun-Ru and the Jabalpur frames of the Militarized Zone of India.',
  },
};
function startMenu() {
  const saved = getSave(),
    profile = loadProfile();
  const cards = E.MAJORS.map(side => {
    const b = FACTION_BLURB[side],
      on = setup.side === side;
    return `<button class="faction ${side} ${on ? 'active' : ''}" data-faction="${side}">${ART.portrait(b.portrait, 'faction-portrait')}<span class="label" style="color:${F(side).color}">${b.label}</span><h3>${F(side).name}</h3><p>${b.text}</p><p class="doctrine"><b>${F(side).doctrine}:</b> ${F(side).doctrineText}</p><span class="select-mark">${on ? '✓ Command selected' : 'Select ' + F(side).short}</span></button>`;
  }).join('');
  const reward = conquestReward(setup.difficulty, profile);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Operation setup"><div class="eyebrow">Code Geass · WC4-inspired world conquest</div><h1>One world.<br>Three empires.</h1><p>Build a Knightmare army. Appoint your commanders. Take the capitals of your rivals—each power surrenders the moment its capital falls.</p><div class="choice-grid three">${cards}</div><div class="conquest-row"><div><label>Conquest · ${E.WORLD.cols} × ${E.WORLD.rows} world map</label><h3 class="conquest-title">${E.ERAS.world.name}</h3><p class="mode-note">${E.ERAS.world.desc} <b>${E.ERAS.world.rulesText}</b> Played as the ${F(setup.side).name}.${reward ? ` First win: up to ${reward} command tokens.` : ''}</p></div><button class="primary" data-action="start-conquest">Launch conquest</button></div><div class="setup-row"><div><label for="difficulty-select">Difficulty</label><select class="select" id="difficulty-select">${Object.entries(
    E.DIFFICULTIES,
  )
    .map(
      ([k, d]) =>
        `<option value="${k}" ${setup.difficulty === k ? 'selected' : ''}>${d.name}${d.tokens > 1 ? ` · ×${d.tokens} tokens` : ''}</option>`,
    )
    .join(
      '',
    )}</select><p class="mode-note">${E.DIFFICULTIES[setup.difficulty]?.desc || ''}</p></div><div class="hq-summary"><span class="label">Command HQ</span><b>${ICONS.use('token', 'cost-ico')} ${profile.tokens || 0} tokens</b><small>${profile.wins || 0} victories · ${Object.values(profile.research || {}).reduce((a, l) => a + l, 0)} research levels</small><span class="hq-buttons"><button class="small" data-action="research">HQ research</button><button class="small" data-action="generals-start">Commanders</button></span></div></div><div class="badge-row"><span class="badge">${Object.values(E.TYPES).filter(t => t.side !== 'neutral').length} Knightmare Frames</span><span class="badge">3 branches: Infantry · Armor · Artillery</span><span class="badge">${Object.keys(E.COMMANDERS).length} commanders · ${Object.values(E.COMMANDERS).filter(a => a.recruit).length} to recruit</span><span class="badge">${Object.keys(E.TECH_NODES).length} HQ technologies</span><span class="badge">${game.stations?.length || 107} cities</span></div><div class="dialog-footer"><div>${saved ? '<button data-action="continue">Continue saved game</button>' : ''}<button class="ghost" data-action="help">Field manual</button><button class="ghost" data-action="archive-start">Knightmare archive</button></div><small>Unofficial fan game. Alternate-history war.<br>Saved in this browser. A new operation replaces your saved conquest.</small></div></section></div>`;
  focusDialog();
}
// Tokens still on offer for a first victory at this difficulty (before banked research).
function conquestReward(difficulty, profile) {
  if ((profile.cleared || {})[`conquest:world:${difficulty}`]) return 0;
  const scale = E.DIFFICULTIES[difficulty]?.tokens || 1,
    t = E.TOKEN_REWARD;
  return Math.round((t.victory + t.conquest) * scale) + (profile.wins || 0 ? 0 : t.first);
}
function render() {
  const mapFocused = !!canvas && document.activeElement === canvas;
  document.documentElement.style.setProperty('--own', F(game.player).color);
  const e = game.economy[game.player],
    inc = E.income(game, game.player),
    cities = game.stations.filter(s => s.owner === game.player).length;
  app.innerHTML = `<header class="topbar"><div class="brand"><span class="mark" aria-hidden="true">◈</span><div><h1>Knightmare Conquest</h1><small>CODE GEASS · WORLD WAR</small></div></div><div class="resources">${resource('credits', 'Credits', 'Credits', e.credits, inc.credits)}${resource('industry', 'Industry', 'Industry · Knightmare factories', e.industry, inc.industry)}${resource('research', 'Research', 'Research. Banked research becomes command tokens when you win (5 research = 1 token)', e.science, inc.science)}${resource('token', 'Tokens', 'Command tokens · spent on HQ research, earned by winning operations', loadProfile().tokens || 0)}<div class="resource"><span class="label">Cities</span><b>${cities} <small>/ ${game.stations.length}</small></b></div></div><nav class="top-actions" aria-label="Command menus"><button class="small" data-action="research">Research</button><button class="small" data-action="admirals" ${!interactive() ? `disabled title="${phaseReason()}"` : ''}>Commanders</button><button class="small ghost" data-action="archive">Units</button><button class="small ghost" data-action="powers">Powers</button><button class="small ghost sound-toggle" data-action="sound" aria-pressed="${SFX.enabled}" aria-label="${SFX.enabled ? 'Mute sound' : 'Unmute sound'}" title="${SFX.enabled ? 'Mute sound' : 'Unmute sound'}">${SFX.enabled ? '🔊' : '🔇'}</button><button class="small ghost" data-action="help" aria-label="Field manual">?</button><button class="small ghost" data-action="menu" ${game.phase !== game.player ? 'disabled' : ''}>Menu</button></nav></header><div class="workbench"><main class="theater"><div class="theater-head"><div><span class="label" style="color:${F(game.phase).color}">Turn ${String(game.turn).padStart(2, '0')} · ${F(game.phase).short} phase</span><h2>${E.modeTitle(game)}</h2></div><p class="objective">${E.objectiveText(game)} <b>Turn ${game.turn} / ${E.ARMISTICE}</b></p></div><div class="map-wrap"><canvas id="map" tabindex="0" aria-label="World hex map. Select your unit using the unit selector or N. Arrow keys move the hex cursor; Enter selects. Enter moves to a green hex or attacks a red hex. Z undoes the last move. Drag to pan; plus and minus zoom."></canvas><div class="map-banner" id="map-banner">${game.phase !== game.player ? 'Rival powers are maneuvering…' : 'Select a Knightmare to reveal its movement and firing range.'}</div><div class="map-tools"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="fit" title="World overview">World</button><button data-action="zoom-in" aria-label="Zoom in">+</button><button data-action="home" title="Center on your capital">⌂</button></div><canvas id="minimap" class="minimap" aria-label="World minimap: click to move the view"></canvas><div class="map-legend">${E.MAJORS.map(s => `<span style="color:${F(s).color}"><i class="legend-dot"></i>${F(s).short}</span>`).join('')}<span style="color:#d8cfa6"><i class="legend-dot"></i>Neutral</span><span>▣ City</span></div></div><div class="map-caption"><span id="map-caption">Green hex: move · Red hex: attack · Blue sea hex: embark as a transport</span><span>Drag to pan · Scroll to zoom · <span class="kbd">N</span> next unit</span></div></main><aside class="side" id="side"></aside><div class="selection-dock" id="selection-dock"></div></div><footer class="footer"><div class="turn-status" id="turn-status"></div><div class="footer-actions"><button class="small" data-action="details">Unit orders</button><button class="small undo-button" data-action="undo" ${!interactive() || !undoStack.length ? 'disabled' : ''} title="${phaseReason() || (undoStack.length ? 'Return the last moved unit to where it started (Z)' : 'No move to undo')}">↶ Undo move <span class="kbd">Z</span></button><button class="small" data-action="next" ${!interactive() ? 'disabled' : ''}>Next unit <span class="kbd">N</span></button>${game.phase === game.player || game.over ? `<button class="primary end" data-action="end" ${!interactive() ? 'disabled' : ''}>End turn</button>` : `<button class="primary end" data-action="skip-ai">${F(game.phase).short} turn… <span class="kbd">Skip ▶▶</span></button>`}</div></footer>`;
  canvas = $('map');
  ctx = canvas.getContext('2d');
  attachMap();
  attachMinimap();
  minimapDirty = true;
  updateSelection();
  if (mapFocused) canvas.focus({ preventScroll: true });
}
// Why the player cannot act right now (rival phase or finished operation).
function phaseReason() {
  return game.over ? 'Operation over' : game.phase !== game.player ? `${F(game.phase).short} turn` : null;
}
// A button that explains itself: when the order is unavailable its reason replaces the cost line.
// A lack of funds is shown by the cost itself, with the missing resources in red.
const isShortfall = why => /^Need \d+ more /.test(why || '');
// showWhy = false keeps a blocked button plain: disabled, with the reason only on hover.
function act(attrs, label, why, detail = '', cls = '', showWhy = true) {
  const note =
    why && showWhy && !isShortfall(why)
      ? `<small class="why">${esc(why)}</small>`
      : detail && (showWhy || !why)
        ? `<small>${detail}</small>`
        : '';
  return `<button class="${cls}${why ? ' blocked' : ''}" ${attrs} ${why ? `disabled${isShortfall(why) ? '' : ` title="${esc(why)}"`}` : ''}>${label}${note}</button>`;
}
function fireStatus(u) {
  if (E.atSea(game, u)) return 'Embarked · cannot fire';
  if (u.attacked) return 'Already fired';
  if (u.morale <= -3) return 'Confused · cannot act';
  if (u.side === game.player && !E.targets(game, u).length) return 'No target in range';
  return 'Fire ready';
}
function rangeText(u) {
  const r = E.rangeOf(game, u);
  return r.min === r.max ? r.max : r.min + '–' + r.max;
}
function resource(icon, label, title, value, perTurn) {
  const rate = perTurn == null ? '' : ` · +${perTurn}/turn`;
  return `<div class="resource" title="${title}${rate}">${ICONS.use(icon, 'res-icon')}<span class="label">${label}</span><b>${count(value)} ${perTurn == null ? '' : `<small>+${perTurn}/turn</small>`}</b></div>`;
}
// Costs render as WC4 resource tokens; zero amounts are omitted unless all is set.
// Prices (not balances, which pass all) turn red for each resource the player cannot cover.
function costHTML(c, all = false) {
  const have = game?.economy?.[game.player] || {},
    parts = [
      ['credits', c.credits, 'credits'],
      ['industry', c.industry, 'industry'],
      ['research', c.science, 'science'],
    ].filter(([, v]) => v != null && (all || v > 0));
  return `<span class="cost-line">${parts.map(([k, v, f]) => `<span class="cost-item${!all && v > (have[f] || 0) ? ' short' : ''}">${ICONS.use(k, 'cost-ico')}${count(v)}</span>`).join('')}</span>`;
}
function statRow(u, t) {
  const range = rangeText(u);
  return `<span class="stat" title="Attack">${ICONS.use('atk')}${Math.round(t.attack * (1 + 0.45 * (u.stack - 1)))}</span><span class="stat" title="Armor">${ICONS.use('def')}${t.armor}</span><span class="stat" title="Movement">${ICONS.use('mov')}${E.atSea(game, u) ? E.seaMove(game, u) : E.movement(game, u)}</span><span class="stat" title="Range">${ICONS.use('rng')}${range}</span>`;
}
// A unit's display name: a commander's signature frame shows on super-heavy units, as LOGH flagships did.
function unitName(u) {
  const a = C(u.cmd),
    t = E.TYPES[u.type];
  return a && t.cls === 'super' ? a.hull : t.name;
}
// Units that still have an order besides holding position, refreshed whenever the selection or map changes.
let readyIds = new Set();
function hasOrders(u) {
  return game.phase === game.player ? readyIds.has(u.id) : !u.attacked;
}
function updateSelection() {
  readyIds = new Set(
    ownUnits()
      .filter(u => E.hasOrders(game, u))
      .map(u => u.id),
  );
  const u = selectedUnit();
  readyCache = u && u.side === game.player ? E.reachable(game, u) : new Map();
  const st = selectedStation();
  targetCache = new Set(
    u && u.side === game.player && !u.attacked && u.morale > -3
      ? E.targets(game, u).map(E.key)
      : st && st.owner === game.player && interactive()
        ? E.fortressTargets(game, st).map(E.key)
        : [],
  );
  minimapDirty = true;
  $('side').innerHTML =
    '<button class="drawer-close small" data-action="details" aria-label="Close unit orders">×</button>' + panel();
  $('side').classList.toggle('open', detailOpen);
  $('selection-dock').innerHTML = dockHTML();
  const ready = readyIds.size;
  $('turn-status').innerHTML = game.over
    ? 'Operation concluded'
    : `${ready} units ready <small>${F(game.player).short} · ${E.DIFFICULTIES[game.difficulty]?.name || 'Normal'} · ${saveOk ? 'autosaved' : 'not saved'}</small>`;
  $('map-banner').textContent =
    game.phase !== game.player
      ? `${F(game.phase).name} is maneuvering…`
      : game.over
        ? 'Operation concluded'
        : u?.side === game.player
          ? `${u.cmd ? C(u.cmd).short + ' · ' : ''}${unitName(u)} ×${u.stack}${E.atSea(game, u) ? ' · Embarked' : ''}${u.morale <= -3 ? ' · In confusion' : !hasOrders(u) ? ' · Orders complete' : ''}`
          : selectedStation()
            ? `${selectedStation().name} · ${selectedStation().owner === game.player ? 'Open the factory to build Knightmares' : 'Break its defenses before capture'}`
            : 'Select a Knightmare to reveal movement and firing range.';
}
function moraleName(n) {
  return n >= 1
    ? 'High (+25%)'
    : n === 0
      ? 'Steady'
      : n === -1
        ? 'Low (−25%)'
        : n === -2
          ? 'Diminished (−50%)'
          : 'Confused';
}
function panel() {
  const u = selectedUnit(),
    s = selectedStation();
  const unitPicker = `<label class="label" for="fleet-select">Your units</label><select class="select unit-select" id="fleet-select"><option value="">Select a unit…</option>${ownUnits()
    .map(
      v =>
        `<option value="${v.id}" ${u?.id === v.id ? 'selected' : ''}>${v.cmd ? C(v.cmd).short + ' · ' : ''}${E.TYPES[v.type].short} ×${v.stack} · ${nearestCityName(v)}${!hasOrders(v) ? ' · spent' : ''}</option>`,
    )
    .join('')}</select>`;
  let main = '';
  if (u) {
    const t = E.TYPES[u.type],
      ours = u.side === game.player,
      st = E.stationAt(game, u),
      a = C(u.cmd),
      sea = E.atSea(game, u);
    main = `<section>${unitPicker}<div class="side-title"><span class="label">${t.branch} · ${t.role}</span><span class="chip" style="color:${F(u.side).color}">${F(u.side).short}</span></div>${ART.unit(u.type, 'panel-ship', u.side)}<h2 class="unit-name">${unitName(u)}</h2><p class="unit-model">${t.model} · ${t.gen}${a && t.cls === 'super' ? ` · ${t.name}` : ''}</p><p class="description">${t.desc}</p><p class="lore">${t.lore}</p>${sea ? `<div class="info-strip sea-strip">${ICONS.use('sea', 'cost-ico')} Embarked as a transport: cannot fire or counter-fire and takes ${Math.round(100 * (E.techLevel(game, u.side, 'sakura.landing') ? 0.25 : 0.5))}% extra damage. Sails ${E.seaMove(game, u)} hexes; landing ends the move.</div>` : ''}<div class="hp-row">${ICONS.hp(u.hp, E.maxHP(u), 'hp-ring-lg')}<span>Frame integrity</span><span class="mono">${Math.ceil(u.hp)} / ${E.maxHP(u)}</span></div><div class="stat-grid"><div><span class="label">${ICONS.use('atk')} Attack</span><b>${Math.round(t.attack * (1 + 0.45 * (u.stack - 1)))}</b></div><div><span class="label">${ICONS.use('def')} Armor</span><b>${t.armor}</b></div><div><span class="label">${ICONS.use('mov')} Move</span><b>${sea ? E.seaMove(game, u) : E.movement(game, u)}</b></div><div><span class="label">${ICONS.use('rng')} Range</span><b>${rangeText(u)}</b></div><div><span class="label">Frames</span><b>${u.stack}/3</b></div><div><span class="label">Veteran</span><b>${u.xp}/5</b></div></div><div class="status-line"><span class="status ${u.moved ? 'spent' : 'ready'}">${u.moved ? 'Moved' : 'Move ready'}</span><span class="status ${fireStatus(u) === 'Fire ready' ? 'ready' : 'spent'}">${fireStatus(u)}</span><span class="status">${moraleName(u.morale)}</span></div>${a ? commanderCard(u) : ''}${ours ? `<div class="actions">${!a ? act('data-action="assign"', 'Assign commander', phaseReason(), 'Choose a commander') : ''}${a?.action ? act('data-action="feint"', a.action.name, phaseReason() || E.feintReason(game, u), '−2 morale · 2 hex radius', '', false) : ''}${act('data-action="reinforce"', 'Add a frame', phaseReason() || E.reinforceReason(game, u), costHTML(E.reinforceCost(u.type, game, u.side)))}${act('data-action="repair"', 'Repair unit', phaseReason() || E.repairReason(game, u), '+35% frame · ' + costHTML({ credits: E.repairCost(u, game) }))}${act('data-action="wait"', 'Hold position', phaseReason() || (u.attacked ? 'Already fired' : null), 'Finish this unit’s turn')}</div><p class="description" style="font-size:11px">Repair and reinforcement need a friendly city within 1 hex and use this unit’s turn.</p>` : ''}${st ? `<div class="section-divider"><span class="label">City beneath unit</span><div class="station-buttons"><button data-station="${st.id}">${st.name} · Factory ${st.tier}</button>${st.owner === game.player ? `<button data-shop="${st.id}" ${!interactive() ? 'disabled' : ''}>Factory</button>` : ''}</div></div>` : ''}</section>`;
  } else if (s) {
    const ours = s.owner === game.player;
    main = `<section>${unitPicker}<div class="side-title"><span class="label">${s.capital ? 'Capital' : s.fort ? 'Fortress city' : 'City'}</span><span class="chip" style="color:${F(s.owner).color}">${F(s.owner).short}</span></div>${ART.city(cityKind(s), s.owner, 'panel-ship')}<h2 class="unit-name">${s.name}</h2><p class="description">${s.capitalOf && E.alive(game, s.capitalOf) && s.owner === s.capitalOf ? `Capital of the ${F(s.owner).name}. If it falls, the whole power surrenders.` : s.fort ? 'Fortified city with a battery covering 3 hexes.' : 'Capture and hold cities to fund your army.'}</p><div class="hp-row"><span>City defenses</span><span class="mono">${Math.ceil(s.shield)} / ${s.maxShield}</span></div><div class="bar"><i style="width:${(s.shield / s.maxShield) * 100}%;background:${F(s.owner).color}"></i></div><div class="stat-grid"><div><span class="label">${ICONS.use('credits')} Credits</span><b>+${s.income + 15 * (s.refinery || 0)}</b></div><div><span class="label">${ICONS.use('industry')} Industry</span><b>+${s.industry}</b></div><div><span class="label">${ICONS.use('research')} Research</span><b>+${s.science}</b></div></div>${fortressPanel(s)}<div class="buildings">${Object.entries(
      E.BUILDINGS,
    )
      .map(([k, b]) => {
        const l = E.buildingLevel(s, k);
        return `<div class="building"><span class="label">${ICONS.use(k === 'factory' ? 'factory' : k === 'lab' ? 'research' : 'refinery')} ${b.name}</span><span class="level">${'▮'.repeat(l)}${'▯'.repeat(3 - l)}</span><small>${b.desc}</small>${ours ? act(`data-build="${k}" data-station-id="${s.id}"`, l >= 3 ? 'Maximum level' : (l ? 'Upgrade to level ' : 'Build level ') + (l + 1), l >= 3 ? null : phaseReason() || E.buildReason(game, s, k), costHTML(E.buildCost(s, k)), 'small') : ''}</div>`;
      })
      .join(
        '',
      )}</div>${ours ? `<div class="actions">${act(`data-shop="${s.id}"`, 'Open factory', shipyardReason(s), 'Build a Knightmare unit', 'primary')}</div><p class="description">One unit per city per turn. New units act next turn. Garrisons repair 8% of their frame here each turn.</p>` : '<p class="description">Reduce its defenses to zero and destroy any garrison, then move an Infantry or Armor unit in to capture it. Artillery cannot capture.</p>'}</section>`;
  } else {
    main = `<section>${unitPicker}<div class="empty-panel"><span class="eyebrow">Command the world</span><h3>Position.<br>Concentrate.<br>Break through.</h3><p class="description">Select a Knightmare to see its movement and attack range. Select a city to build new units.</p><div class="info-strip">Green hexes move, red hexes attack with one click. Moving onto a sea hex embarks a transport; sailing to a coast lands it. An Armor kill can refresh both actions.</div><button data-action="next">Select a ready unit</button></div></section>`;
  }
  const selectedTile =
    selection?.kind === 'tile'
      ? E.tile(game, selection.c, selection.r)
      : u
        ? E.tile(game, u.c, u.r)
        : s
          ? E.tile(game, s.c, s.r)
          : null;
  // A selected unit or city gets the whole panel; hex details, the directory and dispatches show otherwise.
  if (u || s) return main;
  return (
    main +
    `<section class="section-divider"><span class="label">${selectedTile ? 'Hex ' + selectedTile.c + ', ' + selectedTile.r : 'Theater intelligence'}</span><p class="description">${selectedTile ? terrainDescription(selectedTile) : 'Oceans separate the powers: embark Knightmares as transports to cross them.'}</p><label class="label" for="station-select">City directory</label><select class="select unit-select" id="station-select"><option value="">Inspect city…</option>${[
      ...game.stations,
    ]
      .sort((a, b) => (a.owner === game.player) - (b.owner === game.player) || a.name.localeCompare(b.name))
      .map(s => `<option value="${s.id}">${s.name} · ${F(s.owner).short}</option>`)
      .join('')}</select></section><section class="section-divider dispatches"><span class="label">Dispatches</span>${game.log
      .slice(0, 5)
      .map(l => `<p class="dispatch" style="border-color:${F(l.side).color}"><b>T${l.turn}</b> ${esc(l.text)}</p>`)
      .join('')}</section>`
  );
}
function nearestCityName(u) {
  let best = null,
    d = 99;
  for (const s of game.stations) {
    const n = E.distance(s, u, game);
    if (n < d) {
      d = n;
      best = s;
    }
  }
  return best ? (d ? `near ${best.name}` : best.name) : `${u.c},${u.r}`;
}
function cityKind(s) {
  return s.capital ? 'capital' : s.fort ? 'fortress' : 'city';
}
function shipyardReason(s) {
  return (
    phaseReason() ||
    (s.producedTurn === game.turn ? 'Already built here this turn' : null) ||
    (!E.recruitOptions(game, s, game.player).length ? 'No free land hex next to the city' : null)
  );
}
function fortressPanel(s) {
  if (!s.fort) return '';
  const ours = s.owner === game.player,
    ready = E.fortressReady(game, s),
    status =
      s.shield <= 0
        ? 'Offline: defenses down'
        : (s.gunReady || 0) > game.turn
          ? `Recharging · ready on turn ${s.gunReady}`
          : ours
            ? 'Ready to fire'
            : 'Charged';
  return `<div class="target-box fortress-gun"><span class="label">Fortress battery</span><h3>${E.fortressName(s)}</h3><p>Range ${E.FORTRESS_GUN.range} · ${Math.round(E.FORTRESS_GUN.share * 100)}% of the target's frame · recharges for ${E.fortressRecharge(game, s)} turn${E.fortressRecharge(game, s) > 1 ? 's' : ''}. Silenced while the city's defenses are down.</p><p><b>${status}</b>${ours && ready && interactive() ? (targetCache.size ? ' — click a red hex to fire.' : ' — no enemy unit in range.') : ''}</p></div>`;
}
function terrainDescription(t) {
  const info = E.TERRAIN[t.terrain],
    owner = t.owner ? ` Territory of the ${F(t.owner).name}.` : '';
  return `${info.name} · ${info.desc}${t.terrain !== 'sea' && t.terrain !== 'peak' ? ' Julius and float units ignore movement costs.' : ''}${owner}`;
}
function selectUnit(id, center = false) {
  const u = game.units.find(v => v.id === id && v.hp > 0);
  if (!u) return;
  selection = { kind: 'unit', id };
  updateSelection();
  if (center) centerOn(u);
}
function selectStation(id, center = false) {
  const s = game.stations.find(v => v.id === id);
  if (!s) return;
  selection = { kind: 'station', id };
  updateSelection();
  if (center) centerOn(s);
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
  if (game.over) resultDialog();
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
    result = E.attack(game, u.id, p.c, p.r);
  if (!result.ok) {
    toast(result.reason);
    return;
  }
  addCombatEffects(result, u);
  moralePopups(before);
  refreshAndSave();
  if (result.breakthrough) toast('Breakthrough! This unit can act again.');
}
// WC4-style undo: a unit that moved but has not fired returns to where it started.
function undoMove() {
  if (!interactive() || !undoStack.length) return;
  const { snapshot, unitId } = undoStack.pop();
  game = JSON.parse(snapshot);
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
async function endTurn(force = false) {
  if (!interactive()) return;
  const ready = ownUnits().filter(u => E.hasOrders(game, u)).length;
  if (ready && !force) {
    modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="End turn"><div class="eyebrow">Review orders</div><h2>${ready} units still have orders.</h2><p>You can end the turn now and leave them holding position, or return to issue their orders.</p><div class="dialog-footer"><button data-action="close">Return to the map</button><button class="primary" data-action="end-confirm">End turn</button></div></section></div>`;
    focusDialog();
    return;
  }
  closeModal();
  undoStack = [];
  save();
  const token = ++aiToken;
  skipAI = false;
  for (const side of game.order.slice(1)) {
    if (!E.alive(game, side) || game.over) continue;
    aiSide = side;
    let before = unitSnapshot();
    E.beginTurn(game, side, game.turn > 1);
    turnStartPopups(before, side);
    E.aiProduction(game);
    (game.strikes || []).filter(s => onScreen(s.to)).forEach((s, i) => strikeEffects(s, i * 0.5));
    render();
    if (game.strikes?.some(s => onScreen(s.to)) && !skipAI) await pause(900);
    const ids = game.units.filter(u => u.hp > 0 && u.side === side && !u.attacked).map(u => u.id);
    let quiet = 0;
    for (const id of ids) {
      if (token !== aiToken || game.over) break;
      const u = game.units.find(u => u.id === id);
      if (!u || u.hp <= 0) continue;
      before = unitSnapshot();
      const orders = E.aiOrder(game, id);
      const seen = orders.some(o => onScreen(o.to) || onScreen(o.from));
      if (seen) moralePopups(before);
      for (const o of orders) {
        if (o.annexed) annexNotice(o.annexed);
        if (!seen) continue;
        if (o.kind === 'attack') addCombatEffects(o, u);
        else if (o.kind === 'move') {
          SFX.play('move', side);
          effects.push({ kind: 'move', unitId: id, from: o.from, to: o.to, color: F(side).color, life: 0.5, max: 0.5 });
        }
      }
      if (seen && !skipAI) {
        updateSelection();
        await pause(orders.some(o => o.kind === 'attack') ? 420 : 160);
      } else if (++quiet % 12 === 0) await pause(0);
    }
    if (token !== aiToken) return;
    if (game.over) break;
  }
  aiSide = null;
  if (token !== aiToken) return;
  if (!game.over) {
    game.turn++;
    const before = unitSnapshot();
    E.beginTurn(game, game.player, true);
    turnStartPopups(before, game.player);
  }
  render();
  save();
  if (game.over) resultDialog();
  else toast(`Turn ${game.turn}. Income collected; unit orders refreshed.`);
}
// A power's capital fell: it surrendered and its cities changed hands.
function annexNotice(a) {
  const mine = a.winner === game.player,
    lost = a.loser === game.player;
  toast(
    lost
      ? `${a.capital} has fallen. The ${F(a.loser).name} surrenders.`
      : `${a.capital} has fallen! The ${F(a.loser).name} surrenders to ${mine ? 'you' : 'the ' + F(a.winner).name}: ${a.cities} cities change hands.`,
    true,
  );
  SFX.play('thor', a.winner);
}
// When an operation ends, its medals join the profile's medal case and a win pays command tokens, exactly once.
function claimReward() {
  if (!game.over || game.rewardClaimed) return;
  const p = loadProfile();
  p.medals = [...(p.medals || []), ...(game.medalsEarned || []).map(m => m.id)];
  if (game.over.winner === game.player) {
    const r = E.missionReward(game, p.wins || 0, p.cleared || {});
    if (!r.repeat) {
      p.tokens = (p.tokens || 0) + r.total;
      p.wins = (p.wins || 0) + 1;
      (p.cleared ||= {})[E.operationKey(game)] = true;
    }
    game.reward = r;
  }
  game.rewardClaimed = true;
  undoStack = [];
  saveProfile(p);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch (e) {}
}
function resultDialog() {
  claimReward();
  const win = game.over.winner === game.player,
    draw = game.over.winner === 'draw';
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="Operation result"><div class="eyebrow">${win ? 'Operation successful' : draw ? 'Armistice' : 'Operation ended'}</div><h2>${win ? 'The world bows.' : draw ? 'An uneasy peace.' : 'The last order.'}</h2><p>${game.over.reason}</p>${(game.medalsEarned || []).length ? `<div class="medal-case"><span class="label">Medals earned</span>${game.medalsEarned.map(m => `<span class="medal-chip" title="${esc(m.reason)}">🎖 ${E.MEDALS[m.id].name}</span>`).join('')}</div>` : ''}${game.reward ? (game.reward.repeat ? `<div class="reward"><span class="label">No command tokens</span><small>Tokens are paid only for the first victory at each difficulty. Try ${game.difficulty === 'challenge' ? 'another faction' : 'a harder difficulty'} for more.</small></div>` : `<div class="reward"><span class="label">Command tokens earned</span><b>${ICONS.use('token', 'cost-ico')} +${game.reward.total}</b><small>${game.reward.parts.map(([k, v]) => (v ? `${k} +${v}` : k)).join(' · ')}</small></div>`) : ''}<p class="description">Medals earned go to your medal case. Spend command tokens on HQ research and on your commanders in HQ → Commanders.</p><div class="result-numbers"><div><b>${game.turn}</b><small>Turns elapsed</small></div><div><b>${game.stations.filter(s => s.owner === game.player).length}</b><small>Cities held</small></div><div><b>${ownUnits().length}</b><small>Units remaining</small></div></div><div class="dialog-footer"><button data-action="close">Inspect the map</button><button data-action="research">HQ research</button><button class="primary" data-action="new">New operation</button></div></section></div>`;
  focusDialog();
}
const BRANCH_LIST = ['Infantry', 'Armor', 'Artillery'];
function openShop(id, branch = shop.branch) {
  const s = game.stations.find(s => s.id === id);
  if (!s || s.owner !== game.player || !interactive()) return;
  shop.station = id;
  shop.branch = branch;
  const free = E.recruitOptions(game, s, game.player);
  const types = E.CLASS_ORDER.map(cls => E.ROSTER[game.player][cls]).filter(k => E.TYPES[k].branch === branch);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Knightmare factory"><div class="dialog-head"><div><div class="eyebrow">${F(s.owner).name} · ${s.name} · Factory level ${s.tier}</div><h2>Roll out a Knightmare unit</h2><p>${costHTML({ credits: game.economy[game.player].credits, industry: game.economy[game.player].industry }, true)}</p></div><button class="small close" data-action="close">Close</button></div><div class="toolbar-row"><div class="tabs">${BRANCH_LIST.map(b => `<button data-branch="${b}" class="${b === branch ? 'active' : ''}">${b}</button>`).join('')}</div><div><label for="stack-select">Unit strength &nbsp;</label><select class="select" id="stack-select">${[1, 2, 3].map(n => `<option value="${n}" ${shop.stack === n ? 'selected' : ''}>${n} ${n === 1 ? 'frame' : 'frames'}</option>`).join('')}</select></div></div>${s.producedTurn === game.turn ? '<div class="info-strip">This factory has finished production for this turn.</div>' : !free.length ? '<div class="info-strip">No free land hex. Move friendly units away from the city.</div>' : '<p class="description">One unit per city per turn. New units deploy on the city or a free land hex next to it and act next turn.</p>'}<div class="cards">${types
    .map(k => {
      const t = E.TYPES[k],
        n = shop.stack,
        p = E.price(k, n, game, game.player),
        can = E.canBuy(game, s, k, n);
      return `<article class="unit-card ${s.tier < t.tier ? 'locked' : ''}">${ART.unit(k, 'catalog-ship', s.owner)}<span class="unit-code">${t.role} · Tier ${t.tier} · ×${n}</span><h3>${t.name}</h3><span class="weapon-focus">${t.model} · ${t.gen}</span><p>${t.desc}</p><p class="lore">${t.weapon}</p><div class="unit-spec"><span>HP ${Math.round(t.hp * (1 + 0.7 * (n - 1)))}</span><span>${ICONS.use('atk')}${Math.round(t.attack * (1 + 0.45 * (n - 1)))}</span><span>${ICONS.use('def')}${t.armor}</span><span>${ICONS.use('mov')}${t.move}</span><span>${ICONS.use('rng')}${rangeText({ type: k, side: game.player })}</span></div><div class="cost">${costHTML(p)}</div>${act(`data-recruit="${k}"`, 'Roll out', can ? null : E.buyReason(game, s, k, n))}</article>`;
    })
    .join('')}</div></section></div>`;
  focusDialog();
}
let researchBranch = 'infantry',
  researchBack = 'game';
function tokenCost(n, have) {
  return `<span class="cost-line"><span class="cost-item${n > have ? ' short' : ''}">${ICONS.use('token', 'cost-ico')}${count(n)}</span></span>`;
}
// HQ research: command tokens from victories buy permanent technology kept across every operation.
function researchDialog(branch = researchBranch) {
  researchBranch = branch;
  const p = loadProfile(),
    research = p.research || {},
    tokens = p.tokens || 0,
    wins = p.wins || 0,
    tree = E.TECH_TREE[branch];
  const tiers = [1, 2, 3, 4]
    .map(
      t =>
        `<span class="tier ${wins >= E.TECH_TIERS[t] ? 'open' : ''}">Tier ${E.ROMAN[t]} · ${E.TECH_TIERS[t] ? (wins >= E.TECH_TIERS[t] ? 'unlocked' : `${E.TECH_TIERS[t]} victories`) : 'open'}</span>`,
    )
    .join('');
  const cards = Object.keys(tree.nodes)
    .map(k => {
      const id = `${branch}.${k}`,
        n = E.TECH_NODES[id],
        l = research[id] || 0,
        done = l >= n.max,
        req = n.req ? E.TECH_NODES[`${branch}.${n.req[0]}`] : null;
      return `<section class="tech-card hq"><span class="label">${tree.name} · Level ${l} / ${n.max}</span><h3>${n.name}</h3><ol class="doctrine">${n.values.map((v, i) => `<li class="${i < l ? 'unlocked' : ''}"><b>${E.ROMAN[i + 1]}</b> ${n.text(v)} <small>Tier ${E.ROMAN[n.tiers[i]]}</small></li>`).join('')}</ol>${req ? `<small class="req">Requires ${req.name} ${E.ROMAN[n.req[1]]}</small>` : ''}<div class="tech-levels">${n.values.map((_, i) => `<i class="${i < l ? 'unlocked' : ''}"></i>`).join('')}</div>${act(`data-research="${id}"`, done ? 'Fully researched' : `Research ${E.ROMAN[l + 1]}`, done ? 'Fully researched' : E.researchReason(p, id), done ? '' : tokenCost(E.researchCost(id, l), tokens), '', !done)}</section>`;
    })
    .join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="HQ research"><div class="dialog-head"><div><div class="eyebrow">Command HQ · kept across every operation and faction</div><h2>HQ research</h2><p class="hq-balance">${ICONS.use('token', 'cost-ico')} <b>${count(tokens)}</b> command tokens · ${wins} ${wins === 1 ? 'victory' : 'victories'}</p></div><button class="small close" data-action="research-close">Close</button></div>${tokens || Object.keys(research).length ? '' : `<div class="info-strip">Command tokens are earned by the first victory at each difficulty: ${E.TOKEN_REWARD.victory} per victory plus ${E.TOKEN_REWARD.conquest} for the conquest and 1 per ${E.TOKEN_REWARD.research} research banked (up to ${E.TOKEN_REWARD.researchCap}), ×1.5 on Hard and ×2 on Challenge, and ${E.TOKEN_REWARD.first} more for your first win ever.</div>`}<div class="tier-row">${tiers}</div><div class="tabs">${Object.entries(
    E.TECH_TREE,
  )
    .map(([k, b]) => `<button data-research-branch="${k}" class="${k === branch ? 'active' : ''}">${b.name}</button>`)
    .join('')}</div><p class="description">${tree.desc}</p><div class="tech-grid">${cards}</div></section></div>`;
  focusDialog();
}
function ratingStars(n) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, E.MAX_RATING - n));
}
// A clickable portrait: opens the Commander Info card, for your own commander (personal) or an operation's.
function generalPortrait(k, cls = '', personal = false) {
  return ART.portrait(k, cls).replace(
    '<span ',
    `<span data-general="${k}" data-personal="${personal ? 1 : 0}" role="button" tabindex="0" title="${esc(C(k).name)}: commander info" `,
  );
}
const BRANCH_ICONS = { infantry: 'scout', armor: 'medium', artillery: 'rocket' };
// A token-priced button. When unavailable it stays hoverable (aria-disabled) so the reason shows as a tooltip.
function tokenButton(attrs, cost, why, label = '', cls = '') {
  const have = loadProfile().tokens || 0;
  return `<button class="small token-buy ${cls}${why ? ' blocked' : ''}" ${attrs} ${why ? `aria-disabled="true" title="${esc(why)}"` : ''}>${label}${tokenCost(cost, have)}</button>`;
}
// Where HQ screens return to: the start menu or the map.
let hqBack = 'game';
// Commander Info. Personal: your persistent commander, upgraded with command tokens. Otherwise: the operation's
// commander, shown read-only.
function generalDialog(k, personal = false) {
  const a = C(k),
    profile = loadProfile(),
    owned = E.owns(profile, k),
    own = a.side === (hqBack === 'start' ? a.side : game.player),
    o = personal
      ? E.roster(profile)[k] || { rank: 0, ratings: { ...E.officer(game, k).ratings }, medals: [] }
      : E.officer(game, k),
    editable = personal && owned,
    unit = game.units.find(u => u.hp > 0 && u.cmd === k && !!u.personal === personal),
    top = o.rank >= E.RANKS.length - 1,
    stars = n => Array.from({ length: E.MAX_RATING }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');
  generalOpen = { k, personal };
  const ratings = Object.entries(E.BRANCH_NAMES)
    .map(
      ([b, name]) =>
        `<div class="gi-rating" title="${name}: ${o.ratings[b]} of ${E.MAX_RATING} stars. Each star above 3 adds 4% damage and cuts damage taken 3% in this branch."><span class="gi-badge">${ART.unit(E.typeFor(a.side, BRANCH_ICONS[b]), '', a.side)}</span><span class="gi-rating-info"><span class="gi-name">${name}</span><span class="gi-stars">${stars(o.ratings[b])}</span></span>${editable && o.ratings[b] < E.MAX_RATING ? tokenButton(`data-buy-star="${b}" data-officer="${k}" aria-label="Buy a ${name} star"`, E.starCost(profile, k, b), E.starReason(profile, k, b)) : ''}</div>`,
    )
    .join('');
  const medals = editable
    ? `<div class="gi-medals"><span class="label">Medals ${o.medals.length}/${E.medalSlots(o)}</span>${o.medals.map(m => `<button class="small medal-chip" data-unequip="${m}" data-officer="${k}" title="${esc(E.MEDALS[m].desc)} · click to remove">🎖 ${E.MEDALS[m].name} ×</button>`).join('')}${[...new Set(profile.medals || [])].map(m => act(`data-equip="${m}" data-officer="${k}"`, `Wear ${E.MEDALS[m].name}`, E.equipReason(profile, k, m), E.MEDALS[m].desc, 'small')).join('')}</div>`
    : '';
  const footer = personal
    ? owned
      ? !top
        ? `<div class="gi-promote-row"><div><span class="label">Next rank</span><b>${E.RANKS[o.rank + 1]}</b><small>Unit frame ${Math.round(E.RANK_HP[o.rank] * 100)}% → ${Math.round(E.RANK_HP[o.rank + 1] * 100)}%</small></div>${tokenButton(`data-promote="${k}"`, E.promoteCost(o), E.promoteReason(profile, k), 'Promote ')}</div>`
        : '<div class="gi-promote-row"><b>Highest rank</b></div>'
      : `<div class="gi-promote-row"><div><span class="label">Not yet one of your commanders</span><b>Recruit ${a.short}</b><small>A one-time price; then assignable in every operation and upgradable here.</small></div>${tokenButton(`data-recruit-admiral="${k}"`, E.recruitPrice(k), E.recruitReason(profile, k), 'Recruit ')}</div>`
    : `<div class="gi-promote-row"><div><span class="label">${own ? 'Operation commander' : 'Rival commander'}</span><b>Fixed for this operation</b><small>${own ? `Operation commanders cannot be upgraded. Your own ${a.short} is developed in HQ → Commanders.` : `${F(a.side).name}. Ratings and rank shown as of this operation.`}</small></div></div>`;
  modal.innerHTML = `<div class="overlay"><section class="dialog wide general-info ${a.side}" role="dialog" aria-modal="true" aria-label="Commander info"><div class="gi-head"><button class="small close" data-action="general-close" aria-label="Close">✕</button><h2>Commander Info</h2></div><div class="gi-body"><div class="gi-left"><div class="gi-nameplate"><span class="gi-stars-top">${'★'.repeat(a.stars)}</span><b>${a.name}</b></div><div class="gi-portrait">${ART.portrait(k, 'gi-portrait-art')}</div><div class="gi-rank"><div class="gi-rank-line"><span class="gi-insignia">✦</span><span>${E.RANKS[o.rank]}</span></div><div class="gi-rank-line"><span class="gi-heart">❤</span><span>${Math.round(E.RANK_HP[o.rank] * 100)}% unit frame</span></div><div class="gi-kind ${personal ? 'mine' : ''}">${personal ? 'Your commander' : own ? 'Operation commander' : 'Rival commander'}</div></div></div><div class="gi-right"><div class="gi-ratings">${ratings}</div><div class="gi-ability"><span class="label">${a.skill} · ${a.title}</span><p>${a.desc}</p><small>${a.role} specialist · Signature frame: ${a.hull}${unit ? ` · Commanding ${E.TYPES[unit.type].short} ×${unit.stack}` : ''}${game.missionKills?.[k] ? ` · ${game.missionKills[k]} kills this operation` : ''}</small></div><div class="gi-ladder"><span class="label">Rank · ${o.rank + 1} of ${E.RANKS.length}</span><div class="gi-pips">${E.RANKS.map((r, i) => `<i class="${i < o.rank ? 'done' : i === o.rank ? 'now' : ''}" title="${r} · ${Math.round(E.RANK_HP[i] * 100)}% unit frame${i ? ` · ${E.PROMOTE_COST[i]} tokens` : ''}"></i>`).join('')}</div></div>${medals}${footer}</div></div><div class="gi-foot">${personal || own ? '<button class="small" data-action="generals">HQ commanders</button>' : ''}${hqBack === 'game' ? '<button class="small" data-action="admirals">Assign commanders</button>' : ''}</div></section></div>`;
  focusDialog();
}
function commanderCard(u) {
  const a = C(u.cmd),
    o = E.officerOf(game, u);
  return `<div class="admiral-card">${generalPortrait(u.cmd, '', !!u.personal)}<b>${E.RANKS[o.rank]} ${a.name}</b><p>${a.skill} · ${a.desc}</p><p class="officer-line">${u.personal ? 'Your commander' : 'Operation commander'} · ${Math.round(E.RANK_HP[o.rank] * 100)}% frame · ${Object.entries(
    E.BRANCH_NAMES,
  )
    .map(([b, name]) => `${name} ${o.ratings[b]}★`)
    .join(' · ')}</p></div>`;
}
// In an operation: assign your commanders to units. Operation commanders are listed but stay where they are.
function admiralDialog() {
  if (!interactive()) return;
  generalOpen = null;
  hqBack = 'game';
  const u = selectedUnit(),
    own = u?.side === game.player ? u : null,
    mine = Object.keys(game.roster || {}).filter(k => C(k).side === game.player),
    scenario = game.units.filter(v => v.hp > 0 && v.side === game.player && v.cmd && !v.personal);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Unit commanders"><div class="dialog-head"><div><div class="eyebrow">High command · ${F(game.player).name}</div><h2>Commanders</h2><p>${costHTML({ credits: game.economy[game.player].credits }, true)} available · ${own && !own.cmd ? 'Assign one of your commanders to ' + E.TYPES[own.type].name + ' ×' + own.stack : 'Select one of your units without a commander to assign one.'}</p></div><button class="small close" data-action="close">Close</button></div><div class="info-strip">Your commanders are yours to keep: assign them to any unit in any operation, even beside the operation's own version, and develop them in HQ → Commanders. Operation commanders come with the war and cannot be upgraded.</div><h3 class="officer-section">Your commanders · ${mine.length}</h3><div class="admiral-grid officers">${mine.map(k => officerCard(k, own)).join('') || '<p class="description">No commanders for this faction yet. Recruit them in HQ → Commanders.</p>'}</div>${scenario.length ? `<h3 class="officer-section">Operation commanders</h3><div class="scenario-commanders">${scenario.map(v => `<div class="scenario-chip">${generalPortrait(v.cmd, 'chip-portrait', false)}<span><b>${C(v.cmd).short}</b><small>${E.TYPES[v.type].short} ×${v.stack} · ${E.RANKS[E.officerOf(game, v).rank]}</small></span></div>`).join('')}</div>` : ''}<div class="dialog-footer"><button data-action="generals">HQ commanders · upgrade &amp; recruit</button></div></section></div>`;
  focusDialog();
}
function officerCard(k, own) {
  const a = C(k),
    o = game.roster[k],
    busy = game.units.find(v => v.hp > 0 && v.personal && v.cmd === k);
  return `<section class="officer">${generalPortrait(k, 'officer-portrait', true)}<span class="stars">${'★'.repeat(a.stars)}</span><h3>${a.name}</h3><span class="label">${E.RANKS[o.rank]} · ${Math.round(E.RANK_HP[o.rank] * 100)}% frame · ${a.skill}</span><p>${a.desc}</p><div class="ratings">${Object.entries(
    E.BRANCH_NAMES,
  )
    .map(([b, name]) => `<div class="rating"><span>${name}</span><span class="stars">${ratingStars(o.ratings[b])}</span></div>`)
    .join(
      '',
    )}</div>${o.medals.length ? `<p class="officer-line">🎖 ${o.medals.map(m => E.MEDALS[m].name).join(', ')}</p>` : ''}<div class="officer-actions">${busy ? `<button class="small" disabled>Commanding ${E.TYPES[busy.type].short}</button>` : act(`data-admiral="${k}"`, 'Assign to selected unit', E.assignReason(game, own, k), costHTML({ credits: a.cost }))}</div></section>`;
}
// HQ → Commanders, as in WC4: your persistent roster for each faction, and the commanders still to recruit.
let generalsSide = 'britannia';
function generalsDialog(side = generalsSide) {
  generalsSide = side;
  generalOpen = null;
  const profile = loadProfile(),
    list = Object.entries(E.COMMANDERS).filter(([, a]) => a.side === side),
    mine = list.filter(([k]) => E.owns(profile, k)),
    locked = list.filter(([k]) => !E.owns(profile, k)),
    card = ([k, a]) => {
      const owned = E.owns(profile, k),
        o = owned ? E.roster(profile)[k] : { rank: 0, ratings: { ...E.officer(game, k).ratings } };
      return `<section class="officer ${owned ? '' : 'locked-officer'}">${generalPortrait(k, 'officer-portrait', true)}<span class="stars">${'★'.repeat(a.stars)}</span><h3>${a.name}</h3><span class="label">${owned ? `${E.RANKS[o.rank]} · ${Math.round(E.RANK_HP[o.rank] * 100)}% frame` : 'Recruitable'} · ${a.role} · ${a.skill}</span><p>${a.desc}</p><div class="ratings">${Object.entries(
        E.BRANCH_NAMES,
      )
        .map(([b, name]) => `<div class="rating"><span>${name}</span><span class="stars">${ratingStars(o.ratings[b])}</span></div>`)
        .join(
          '',
        )}</div><div class="officer-actions">${owned ? `<button class="small" data-general-open="${k}">Upgrade</button>` : tokenButton(`data-recruit-admiral="${k}"`, E.recruitPrice(k), E.recruitReason(profile, k), 'Recruit ')}</div></section>`;
    };
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="HQ commanders"><div class="dialog-head"><div><div class="eyebrow">Command HQ · kept across every operation</div><h2>Commanders</h2><p class="hq-balance">${ICONS.use('token', 'cost-ico')} <b>${count(profile.tokens || 0)}</b> command tokens · ${Object.keys(E.roster(profile)).length} commanders</p></div><button class="small close" data-action="generals-close">Close</button></div><div class="tabs">${E.MAJORS.map(s => `<button data-generals-side="${s}" class="${s === side ? 'active' : ''}">${F(s).name}</button>`).join('')}</div><p class="description">Your commanders can lead any unit of their faction in any operation, even when the operation already fields its own version of them. Promote them and buy branch stars with command tokens; medals you earn are worn here.</p><h3 class="officer-section">Your commanders · ${mine.length}</h3><div class="admiral-grid officers">${mine.map(card).join('')}</div>${locked.length ? `<h3 class="officer-section">Recruit · ${locked.length}</h3><div class="admiral-grid officers">${locked.map(card).join('')}</div>` : ''}</section></div>`;
  focusDialog();
}
let archiveSide = null,
  archiveBack = 'game';
function archiveDialog(branch = 'Infantry', side = archiveSide || game.player) {
  archiveSide = side;
  const types = E.CLASS_ORDER.map(cls => E.ROSTER[side][cls]).filter(k => E.TYPES[k].branch === branch);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Knightmare archive"><div class="dialog-head"><div><div class="eyebrow">Order of battle</div><h2>Knightmare archive</h2><p>${F(side).name} frames. Values shown for one frame. <b>${F(side).doctrine}:</b> ${F(side).doctrineText}</p></div><button class="small close" data-action="archive-close">Close</button></div><div class="tabs">${E.MAJORS.map(s => `<button data-archive-side="${s}" class="${s === side ? 'active' : ''}">${F(s).short}</button>`).join('')}</div><div class="tabs">${BRANCH_LIST.map(b => `<button data-archive-branch="${b}" class="${b === branch ? 'active' : ''}">${b}</button>`).join('')}</div><div class="cards">${types
    .map(k => {
      const t = E.TYPES[k];
      return `<article class="unit-card">${ART.unit(k, 'catalog-ship', side)}<span class="unit-code">${t.role} · ${t.wc} · Tier ${t.tier}</span><h3>${t.name}</h3><span class="weapon-focus">${t.model} · ${t.gen}</span><p style="margin-top:10px">${t.desc}</p><p class="lore">${t.lore}<br><b>${t.weapon}</b></p><div class="unit-spec"><span>HP ${t.hp}</span><span>${ICONS.use('atk')}${t.attack}</span><span>${ICONS.use('def')}${t.armor}</span><span>${ICONS.use('mov')}${t.move}</span><span>${ICONS.use('rng')}${t.min === t.max ? t.max : t.min + '–' + t.max}</span></div><div class="cost">${costHTML(E.price(k, 1, game, side))}</div></article>`;
    })
    .join('')}</div><p class="description">Lineups follow the Code Geass wiki: Britannia with Euro Britannia, the E.U. with wZERO and the Star of Madrid, and the Federation with the Militarized Zone of India’s Jabalpur frames.</p></section></div>`;
  focusDialog();
}
// The war at a glance: each power's cities, income, army and capital.
function powersDialog() {
  const rows = E.MAJORS.map(side => {
    const inc = E.income(game, side),
      cities = game.stations.filter(s => s.owner === side).length,
      army = game.units.filter(u => u.hp > 0 && u.side === side).length,
      fall = game.fallen?.[side];
    return `<tr class="${side === game.player ? 'mine' : ''}"><td><span class="legend-dot" style="background:${F(side).color}"></span> ${F(side).name}</td><td>${fall ? `Surrendered to the ${F(fall.by).short} (turn ${fall.turn})` : F(side).capital}</td><td>${cities}</td><td>${fall ? '—' : '+' + inc.credits}</td><td>${army}</td></tr>`;
  }).join('');
  const neutral = game.stations.filter(s => s.owner === 'neutral').length;
  modal.innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="World powers"><div class="dialog-head"><div><div class="eyebrow">Turn ${game.turn} of ${E.ARMISTICE}</div><h2>World powers</h2></div><button class="small close" data-action="close">Close</button></div><table class="powers"><thead><tr><th>Power</th><th>Capital</th><th>Cities</th><th>Income</th><th>Units</th></tr></thead><tbody>${rows}<tr><td><span class="legend-dot" style="background:#d8cfa6"></span> Neutral powers</td><td>Australia · Middle East</td><td>${neutral}</td><td>—</td><td>${game.units.filter(u => u.hp > 0 && u.side === 'neutral').length}</td></tr></tbody></table><p class="description">A power surrenders when its capital falls: its cities pass to the conqueror and its armies disband. Win by taking every rival capital, or by holding the most cities at the ${E.ARMISTICE}-turn armistice.</p></section></div>`;
  focusDialog();
}
function helpDialog() {
  modal.innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Field manual"><div class="dialog-head"><div><div class="eyebrow">Field manual</div><h2>War on a world of hexes</h2></div><button class="small close" data-action="help-close">Close</button></div><div class="help-grid"><div><b>Movement &amp; firing</b><p>Every unit can move once, then attack once per turn. Attacking ends its movement. Select a unit, click a green hex to move, and click a red hex to attack at once; hover a red hex to see the expected damage. Undo (Z) returns a unit that moved but has not fired.</p></div><div><b>Three branches</b><p>As WC4's infantry, tanks and artillery, every Knightmare belongs to a branch. <b>Infantry</b>: cheap scouts, assault frames (+55% against Armor and city defenses) and five-hex raiders. <b>Armor</b>: line, mainline, heavy and super-heavy frames with breakthroughs. <b>Artillery</b>: fire support at range 1 and rocket and siege frames at exactly range 2. Artillery attacks draw no counter-fire and cannot capture cities.</p></div><div><b>Factions</b><p>Each power builds its own frames. Britannia: Glasgow, Gloucester, Gracchus, Sutherland, Vincent Ward, Brighton, Gawain, Liverpool, Gareth, Zetland. E.U.: Alexander Drone, Amanecer, Alexander Type-02, Estrella, Valiant, Redorga, Liberte, Gardmare, Panzer-Hummel, Panzer-Wespe. Federation: Gun-Ru, Guren Type-01, Chuyen, Gekka, Akatsuki, Wang Hu, Shen Hu, Guren Type-Hei, Zangetsu, Sutherland Sieg. Doctrines: Britannian Armor +8% damage, E.U. Artillery +10% damage, Federation Infantry 15% cheaper.</p></div><div><b>Oceans &amp; transports</b><p>The map wraps around the globe. A land unit with movement left may step onto a sea hex: it embarks as a transport and stops. Embarked units sail 5 hexes a turn (more with Naval Transports), cannot fire or counter-fire, and take 50% extra damage. Sailing onto a coast hex lands the unit and ends its move; landing on an undefended enemy city captures it.</p></div><div><b>Capture cities &amp; capitals</b><p>Break a city's defenses and remove its garrison, then move an Infantry or Armor unit in. Cities produce credits, industry and research, and repair garrisons 8% each turn. As in WC4, when a power's capital falls (Pendragon, Paris, Luoyang) it surrenders: its cities pass to the conqueror and its armies disband. Lose your own capital and the war is lost.</p></div><div><b>Stacking &amp; breakthroughs</b><p>Build 1–3-frame units. Each extra frame adds 70% HP and 45% attack. After a kill, line and mainline frames may fire once more per turn; Cornelia, Gino and Ashley allow two. Heavy and super-heavy frames fire again after every kill, and their first kill also restores movement.</p></div><div><b>Commanders &amp; morale</b><p>Commanders lead units: each has one signature ability and branch ratings (up to 6 stars). Operation commanders come with the war and are fixed. Your commanders live in HQ → Commanders: two per faction to start (Suzaku and Cornelia, Leila and Akito, Xingke and Xianglin); recruit the rest with command tokens, promote them through eleven ranks (unit frame 112% to 160%), buy stars and wear medals. High morale gives +25% damage; low −25%, diminished −50%; confused units cannot act. Julius's Geass Command, Leila's wZERO Feint and Xianglin's Stratagem lower nearby enemy morale by 2.</p></div><div><b>Terrain</b><p>Plains cost 1. Forests (−15% damage taken) and mountains (−25%) cost 2. Deserts cost 1 but drain 3% of a frame each turn; tundra costs 2 and drains 2.5%. The high Himalaya and the Greenland ice cap are impassable. Julius and float units ignore terrain costs.</p></div><div><b>Factories &amp; buildings</b><p>Each city builds one unit per turn; new units act next turn. Every city has a Knightmare factory (heavier frames at levels 2 and 3, +10 industry), a research lab (+8 research) and a Sakuradite refinery (+15 credits), each upgradable to level 3.</p></div><div><b>Fortress batteries</b><p>Capitals and fortress cities (Tokyo Settlement, St. Petersburg, Gibraltar, Cairo, Liaodong, Singapore, Panama, Pearl Harbor) carry a battery. Select your city and click a red hex to strike an enemy unit within 3 hexes for 40% of its frame. It recharges for 2 turns and is silenced while the city's defenses are down. Rivals fire theirs too.</p></div><div><b>HQ research &amp; command tokens</b><p>As in World Conqueror 4, technology is researched at Command HQ with command tokens and kept across every operation and faction. The first win at each difficulty pays 250 + 150 tokens plus banked research, ×1.5 on Hard and ×2 on Challenge, with 150 more for your first win ever. Five trees (Infantry, Armor, Artillery, Sakuradite, Cities); higher tiers open after 2, 4 and 7 wins.</p></div><div><b>Difficulty</b><p>Normal is the world as it stands. Hard gives the rival powers all tier I–II research, upgrades half their units a class and adds a unit for every four. Challenge gives them every technology, upgrades every unit with an extra frame, adds a unit for every two and raises their income 25%. Rival commanders start one or two ranks higher.</p></div><div><b>Rival turns</b><p>Each rival power moves after you, in order. Moves off screen resolve instantly; press Skip to finish a rival turn at once. Rivals fight each other as well as you, and the neutral powers (Australia, the Middle Eastern Federation) only defend.</p></div></div><div class="info-strip">Controls: N cycles ready units · Click or Enter on a red hex attacks · Z undoes the last move · Escape clears the selection or closes a menu · Arrow keys move the hex cursor and Enter selects · Drag or WASD pans · Scroll / + / − zooms · 0 shows the world · H centers on your capital · Click the minimap to jump.</div><p style="font-size:12px">Unofficial fan game based on Code Geass. Unit names and roles follow the <a href="https://codegeass.fandom.com/wiki/Knightmare_Frame" target="_blank" rel="noopener noreferrer">Code Geass wiki</a>; all artwork is original and drawn in code. Gameplay draws on <a href="https://apps.apple.com/sg/app/world-conqueror-4/id1258468290" target="_blank" rel="noopener noreferrer">EasyTech’s World Conqueror 4</a>. Numbers are adapted for this game.</p></section></div>`;
  focusDialog();
}
function menuDialog() {
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="Game menu"><div class="eyebrow">Command headquarters</div><h2>Your orders, Commander.</h2><p>Your current operation is saved automatically in this browser.</p><div class="dialog-footer"><div><button class="primary" data-action="close">Resume</button><button data-action="new">New operation</button><button data-action="help">Field manual</button></div></div></section></div>`;
  focusDialog();
}

// ======== View: a camera over a world that wraps east to west ========
function hexCenter(p) {
  return { x: SQ * R * (p.c + 0.5 * (p.r & 1)) + R, y: R * 1.5 * p.r + R };
}
// The copy of world x closest to ref.
function wrapNear(x, ref) {
  return x + Math.round((ref - x) / WORLD_W) * WORLD_W;
}
function viewPad() {
  const compact = mapSize.w < 700;
  return { top: compact ? 110 : 120, bottom: compact ? 200 : 170 };
}
function computeView() {
  const rect = canvas.getBoundingClientRect();
  mapSize = { w: rect.width, h: rect.height };
  const pad = viewPad();
  baseScale = Math.max(0.05, (rect.height - pad.top - pad.bottom) / WORLD_H);
  const scale = baseScale * zoom;
  cam.x = ((cam.x % WORLD_W) + WORLD_W) % WORLD_W;
  const halfH = (rect.height - pad.top - pad.bottom) / 2 / scale,
    midY = pad.top + (rect.height - pad.top - pad.bottom) / 2;
  cam.y = WORLD_H <= 2 * halfH ? WORLD_H / 2 : E.clamp(cam.y, halfH - 40 / scale, WORLD_H - halfH + 40 / scale);
  offset = { x: rect.width / 2 - cam.x * scale, y: midY - cam.y * scale };
  return scale;
}
function centerOn(p) {
  if (!p || !canvas) return;
  const c = hexCenter(p);
  cam = { x: c.x, y: c.y };
}
function toWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect(),
    scale = computeView();
  return { x: (clientX - rect.left - offset.x) / scale, y: (clientY - rect.top - offset.y) / scale, scale };
}
// Commander portraits float up and to the left of their unit (see drawAdmiralPin).
function hitPin(clientX, clientY) {
  const { x, y, scale } = toWorld(clientX, clientY),
    k = Math.min(1.6, Math.max(1, 0.85 / scale));
  if (R * scale < 14) return null;
  return game.units.find(u => {
    if (u.hp <= 0 || !u.cmd) return false;
    const p = animatedPosition(u),
      px = wrapNear(p.x, x),
      dx = x - (px - 22),
      dy = y - (p.y - 40);
    return Math.abs(dx) <= 15 * k && dy >= -18 * k && dy <= 25 * k;
  });
}
function hitHex(clientX, clientY) {
  const { x, y } = toWorld(clientX, clientY),
    r0 = Math.round((y - R) / (1.5 * R));
  let nearest = null,
    best = R * 1.05;
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    if (r < 0 || r >= game.rows) continue;
    const c0 = Math.round((x - R) / (SQ * R) - 0.5 * (r & 1));
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      const t = E.tile(game, c, r);
      if (!t) continue;
      const p = hexCenter(t),
        d = Math.hypot(wrapNear(p.x, x) - x, p.y - y);
      if (d < best) {
        best = d;
        nearest = t;
      }
    }
  }
  return nearest;
}
function changeZoom(factor, anchor) {
  const oldScale = computeView();
  const before = anchor ? { x: (anchor.x - offset.x) / oldScale, y: (anchor.y - offset.y) / oldScale } : null;
  zoom = E.clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX);
  const newScale = baseScale * zoom;
  if (before) {
    cam.x = before.x - (anchor.x - mapSize.w / 2) / newScale;
    const pad = viewPad(),
      midY = pad.top + (mapSize.h - pad.top - pad.bottom) / 2;
    cam.y = before.y - (anchor.y - midY) / newScale;
  }
  computeView();
}
function fireFortressAt(s, p) {
  const before = unitSnapshot(),
    r = E.fireFortress(game, s.id, p.c, p.r);
  if (!r.ok) {
    toast(r.reason);
    return;
  }
  strikeEffects(r);
  moralePopups(before);
  refreshAndSave();
}
function activateHex(p) {
  if (!p) return;
  const fort = selectedStation();
  if (fort && interactive() && targetCache.has(E.key(p))) {
    fireFortressAt(fort, p);
    return;
  }
  const u = selectedUnit(),
    hit = E.unitAt(game, p),
    station = E.stationAt(game, p);
  if (u?.side === game.player && interactive()) {
    if (targetCache.has(E.key(p))) {
      attackHex(p);
      return;
    }
    if (readyCache.has(E.key(p))) {
      const snapshot = JSON.stringify(game),
        wasSea = E.atSea(game, u),
        result = E.move(game, u.id, p.c, p.r);
      if (result.ok) {
        SFX.play('move', u.side);
        undoStack.push({ snapshot, unitId: u.id });
        effects.push({
          kind: 'move',
          unitId: u.id,
          from: result.from,
          to: result.to,
          color: F(u.side).color,
          life: 0.45,
          max: 0.45,
        });
        refreshAndSave(!result.annexed);
        if (result.annexed) annexNotice(result.annexed);
        else if (result.captured) toast(`${result.captured} captured. +40 credits.`);
        else if (E.atSea(game, u) && !wasSea) toast('Embarked as a transport. Sail to a coast next turn to land.');
        else if (wasSea) toast('Landed. The unit can fire next turn.');
        return;
      }
    }
  }
  if (hit) selectUnit(hit.id);
  else if (station) selectStation(station.id);
  else {
    selection = { kind: 'tile', c: p.c, r: p.r };
    updateSelection();
  }
}
function attachMap() {
  canvas.onpointerdown = e => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    canvas.focus({ preventScroll: true });
    pointer = { x: e.clientX, y: e.clientY, cam: { ...cam }, dragged: false, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = e => {
    if (pointer) {
      const dx = e.clientX - pointer.x,
        dy = e.clientY - pointer.y;
      if (Math.hypot(dx, dy) > 5) pointer.dragged = true;
      if (pointer.dragged) {
        const scale = baseScale * zoom;
        cam.x = pointer.cam.x - dx / scale;
        cam.y = pointer.cam.y - dy / scale;
        canvas.style.cursor = 'grabbing';
      }
    }
    hover = hitHex(e.clientX, e.clientY);
    if (hover && !pointer?.dragged) {
      canvas.style.cursor = readyCache.has(E.key(hover)) || targetCache.has(E.key(hover)) ? 'pointer' : 'default';
      const u = E.unitAt(game, hover),
        s = E.stationAt(game, hover),
        own = selectedUnit(),
        fort = selectedStation(),
        pr = own && targetCache.has(E.key(hover)) ? E.preview(game, own.id, hover.c, hover.r) : null;
      $('map-caption').textContent =
        own && readyCache.has(E.key(hover)) && E.isSea(hover) && !E.atSea(game, own)
          ? 'Embark here: the unit becomes a transport (cannot fire, +50% damage taken) and stops'
          : fort && u && targetCache.has(E.key(hover))
            ? `Click to fire ${E.fortressName(fort)} at ${E.TYPES[u.type].short} · ~${E.fortressDamage(game, u, fort.owner)} damage`
            : pr
              ? `Click to attack ${u ? E.TYPES[u.type].short : s.name} · ~${pr.unit || pr.shield} damage · ${pr.counterAllowed ? pr.counter + ' counter-fire' : 'no counter-fire'}`
              : `${s ? s.name + ' · ' : ''}${u ? `${F(u.side).short} ${E.TYPES[u.type].short} · ` : ''}${E.TERRAIN[hover.terrain].name}${hover.owner ? ' · ' + F(hover.owner).short + ' territory' : ''}`;
    }
  };
  canvas.onpointerup = e => {
    if (pointer && !pointer.dragged) {
      // A click on a commander's map portrait opens Commander Info, unless it lands on a move or attack hex.
      const p = hitHex(e.clientX, e.clientY),
        pin = hitPin(e.clientX, e.clientY);
      if (pin && !(p && (targetCache.has(E.key(p)) || readyCache.has(E.key(p))))) generalDialog(pin.cmd, !!pin.personal);
      else activateHex(p);
    }
    pointer = null;
    canvas.style.cursor = 'default';
  };
  canvas.onpointercancel = () => (pointer = null);
  canvas.onpointerleave = () => {
    if (!pointer) hover = null;
  };
  canvas.onwheel = e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    changeZoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, { x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  canvas.oncontextmenu = e => e.preventDefault();
}
// ======== Minimap ========
function attachMinimap() {
  const mini = $('minimap');
  if (!mini) return;
  const jump = e => {
    const rect = mini.getBoundingClientRect();
    cam.x = ((e.clientX - rect.left) / rect.width) * WORLD_W;
    cam.y = ((e.clientY - rect.top) / rect.height) * WORLD_H;
  };
  mini.onpointerdown = e => {
    jump(e);
    mini.setPointerCapture(e.pointerId);
    mini.dragging = true;
  };
  mini.onpointermove = e => mini.dragging && jump(e);
  mini.onpointerup = () => (mini.dragging = false);
}
const MINI_TERRAIN = {
  sea: '#16405e',
  plains: '#6f8a4b',
  forest: '#4a6e3f',
  mountain: '#7e7460',
  desert: '#bda770',
  snow: '#cfd9df',
  peak: '#4f4a52',
};
function drawMinimap() {
  const mini = $('minimap');
  if (!mini || typeof document.createElement !== 'function') return;
  const w = mini.clientWidth || 220,
    h = Math.round((w * WORLD_H) / WORLD_W),
    dpr = Math.min(devicePixelRatio || 1, 2);
  if (mini.width !== Math.round(w * dpr) || mini.height !== Math.round(h * dpr)) {
    mini.width = Math.round(w * dpr);
    mini.height = Math.round(h * dpr);
    mini.style.height = h + 'px';
    minimapDirty = true;
  }
  const m = mini.getContext('2d');
  if (!m) return;
  if (minimapDirty || !minimapBase) {
    minimapBase ||= document.createElement('canvas');
    minimapBase.width = mini.width;
    minimapBase.height = mini.height;
    const b = minimapBase.getContext('2d'),
      sx = mini.width / WORLD_W,
      sy = mini.height / WORLD_H;
    if (b) {
      b.fillStyle = '#0d2b40';
      b.fillRect(0, 0, mini.width, mini.height);
      for (const t of game.tiles) {
        const p = hexCenter(t);
        b.fillStyle = MINI_TERRAIN[t.terrain];
        b.fillRect((p.x - R) * sx, (p.y - R) * sy, SQ * R * sx + 1, 1.5 * R * sy + 1);
        if (t.owner && t.terrain !== 'sea') {
          b.fillStyle = F(t.owner).color + '88';
          b.fillRect((p.x - R) * sx, (p.y - R) * sy, SQ * R * sx + 1, 1.5 * R * sy + 1);
        }
      }
      for (const s of game.stations) {
        const p = hexCenter(s);
        b.fillStyle = s.capital ? '#ffffff' : F(s.owner).color;
        const z = s.capital ? 3.4 * dpr : 2 * dpr;
        b.fillRect(p.x * sx - z / 2, p.y * sy - z / 2, z, z);
      }
      for (const u of game.units)
        if (u.hp > 0 && u.side === game.player) {
          const p = hexCenter(u);
          b.fillStyle = '#7dffb0';
          b.fillRect(p.x * sx - dpr, p.y * sy - dpr, 2 * dpr, 2 * dpr);
        }
    }
    minimapDirty = false;
  }
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.drawImage(minimapBase, 0, 0);
  // Viewport frame, drawn twice when it straddles the date line.
  const scale = baseScale * zoom,
    vw = (mapSize.w / scale) * (mini.width / WORLD_W),
    vh = (mapSize.h / scale) * (mini.height / WORLD_H),
    vx = (-offset.x / scale) * (mini.width / WORLD_W),
    vy = (-offset.y / scale) * (mini.height / WORLD_H);
  m.strokeStyle = '#ffe9a0';
  m.lineWidth = 1.5 * dpr;
  for (const shift of [-mini.width, 0, mini.width]) m.strokeRect(vx + shift, vy, vw, vh);
}
const HEAVY_SHAKE = { siege: 10, heavy: 6, super: 7, rocket: 4, medium: 2.5, light: 1.5 };
function bump(amount) {
  if (!reducedMotion()) shake = Math.max(shake, amount);
}
function popup(at, text, color, opts = {}) {
  const life = opts.life || 1.6;
  effects.push({
    kind: 'text',
    to: { c: at.c, r: at.r },
    text,
    color,
    life,
    max: life,
    dy: opts.dy || 0,
    size: opts.size || 14,
    pop: !!opts.pop,
  });
}
function unitSnapshot() {
  return new Map(game.units.filter(u => u.hp > 0).map(u => [u.id, { hp: u.hp, morale: u.morale }]));
}
function moraleLabel(m) {
  return m <= -3 ? 'CONFUSED!' : m === -2 ? 'MORALE ↓↓' : 'MORALE ↓';
}
// Morale drops over units: Confused, or a falling-morale tag.
function moralePopups(before) {
  for (const u of game.units) {
    const b = before.get(u.id);
    if (b && u.hp > 0 && u.morale < b.morale) popup(u, moraleLabel(u.morale), '#d9a6ff', { dy: 30, life: 2 });
  }
}
// Start-of-turn events: terrain attrition, morale shifts and battery strikes.
function turnStartPopups(before, side) {
  const struck = new Set((game.strikes || []).map(s => s.id));
  for (const u of game.units) {
    const b = before.get(u.id);
    if (!b || u.hp <= 0 || struck.has(u.id) || !onScreen(u)) continue;
    if (u.side === side && u.hp < b.hp) popup(u, `ATTRITION −${Math.round(b.hp - u.hp)}`, '#f2b35c', { life: 2.1 });
    if (u.morale < b.morale) popup(u, moraleLabel(u.morale), '#d9a6ff', { dy: 30, life: 2.1 });
  }
}
function strikeEffects(s, delay = 0) {
  effects.push({ kind: 'beam', heavy: true, from: s.from, to: s.to, color: '#fff3a0', life: 1.2 + delay, max: 1.2 + delay });
  popup(s.to, s.name.toUpperCase() + '!', '#ffe27a', { dy: 34, size: 15, life: 2.4, pop: true });
  popup(s.to, '−' + s.damage, '#ff4b3e', { size: 22, life: 2.2, pop: true });
  if (s.destroyed) effects.push({ kind: 'boom', to: s.to, life: 1, max: 1 });
  for (const h of s.hit || []) popup(h, '−' + h.damage, '#ff4b3e', { size: 18, life: 2, pop: true });
  SFX.play('thor', game.phase, delay);
  setTimeout(() => bump(16), reducedMotion() ? 0 : delay * 1000 + 550);
}
function addCombatEffects(result, attacker) {
  const side = attacker.side,
    cls = E.TYPES[attacker.type].cls;
  effects.push({
    kind: 'beam',
    heavy: ['heavy', 'super', 'siege'].includes(cls),
    from: result.from,
    to: result.to,
    color: F(side).color,
    life: 0.75,
    max: 0.75,
  });
  SFX.play(SFX.weapon(cls), side);
  if (result.crit) SFX.play('crit', side, 0.08);
  if (result.destroyed) {
    SFX.play('explosion', side, 0.2);
    effects.push({ kind: 'boom', to: result.to, life: 1, max: 1 });
  }
  bump((HEAVY_SHAKE[cls] || 0) + (result.crit ? 4 : 0) + (result.destroyed ? 4 : 0));
  // Blue tag: city defenses knocked down.
  if (result.shieldDamage) popup(result.to, `−${result.shieldDamage} DEF`, '#7cc8ff', { dy: 20, size: 14 });
  for (const h of result.hit || []) {
    const main = h.c === result.to.c && h.r === result.to.r;
    if (main && result.crit) popup(h, `−${h.damage} CRIT!`, '#ff3b30', { size: 21, life: 1.9, pop: true });
    else popup(h, '−' + h.damage, main ? '#ffb3a3' : '#ff9a7a', { size: main ? 15 : 13 });
  }
  if (result.counter) popup(result.from, `↩ −${result.counter}`, '#ffb3a3', { size: 13 });
}
function hexPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30),
      px = x + r * Math.cos(a),
      py = y + r * Math.sin(a);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function drawLine(x, y, tx, ty, color, width = 1, dash = []) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
}
function frame(time) {
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
  lastTime = time;
  draw(time, dt);
  drawMinimap();
  requestAnimationFrame(frame);
}
let helpBack = 'game';
document.addEventListener('change', e => {
  const id = e.target.id;
  if (id === 'difficulty-select') {
    setup.difficulty = e.target.value;
    startMenu();
    $('difficulty-select')?.focus();
  }
  if (id === 'fleet-select' && e.target.value) selectUnit(+e.target.value, true);
  if (id === 'station-select' && e.target.value) selectStation(+e.target.value, true);
  if (id === 'stack-select') {
    shop.stack = +e.target.value;
    openShop(shop.station);
  }
});
document.addEventListener('click', e => {
  const portrait = e.target.closest('[data-general]');
  if (portrait && !e.target.closest('button')) {
    generalDialog(portrait.dataset.general, portrait.dataset.personal === '1');
    return;
  }
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.faction) {
    setup.side = d.faction;
    startMenu();
    return;
  }
  if (d.station) {
    selectStation(+d.station);
    return;
  }
  if (d.shop) {
    openShop(+d.shop);
    return;
  }
  if (d.branch) {
    openShop(shop.station, d.branch);
    return;
  }
  if (d.build) {
    doAction(() => E.build(game, +d.stationId, d.build));
    return;
  }
  if (d.archiveBranch) {
    archiveDialog(d.archiveBranch);
    return;
  }
  if (d.archiveSide) {
    archiveDialog('Infantry', d.archiveSide);
    return;
  }
  if (d.recruit) {
    const r = E.recruit(game, shop.station, d.recruit, shop.stack);
    if (r.ok) {
      selection = { kind: 'unit', id: r.unit.id };
      closeModal();
      refreshAndSave();
      toast(`${E.TYPES[d.recruit].name} rolls out. It will be ready next turn.`);
    } else toast(r.reason);
    return;
  }
  if (d.researchBranch) {
    researchDialog(d.researchBranch);
    return;
  }
  if (d.research) {
    const p = loadProfile(),
      r = E.research(p, d.research);
    if (r.ok) {
      saveProfile(p);
      // In an operation the new technology applies at once; from the start menu it applies to the next launch.
      if (researchBack !== 'start') {
        E.applyTech(game, p.research);
        undoStack = [];
        render();
        save();
      }
      researchDialog();
      toast(`${E.TECH_NODES[d.research].name} ${E.ROMAN[r.level]} researched.`);
    } else toast(r.reason);
    return;
  }
  if (b.getAttribute('aria-disabled') === 'true') return;
  // HQ orders work on the profile; inside an operation, your commanders there are refreshed at once.
  const hqOrder =
    (d.recruitAdmiral && (p => E.recruitCommander(p, d.recruitAdmiral))) ||
    (d.buyStar && (p => E.buyStar(p, d.officer, d.buyStar))) ||
    (d.promote && (p => E.promote(p, d.promote))) ||
    (d.equip && (p => E.equipMedal(p, d.officer, d.equip))) ||
    (d.unequip && (p => E.unequipMedal(p, d.officer, d.unequip)));
  if (hqOrder) {
    const p = loadProfile(),
      r = hqOrder(p);
    if (!r.ok) {
      toast(r.reason);
      return;
    }
    saveProfile(p);
    if (hqBack === 'game') {
      E.applyRoster(game, p);
      undoStack = [];
      render();
      save();
    }
    if (generalOpen) generalDialog(generalOpen.k, generalOpen.personal);
    else generalsDialog();
    const k = d.recruitAdmiral || d.officer || d.promote,
      name = C(k).short;
    toast(
      d.recruitAdmiral
        ? `${C(k).name} joins your commanders.`
        : d.buyStar
          ? `${name}: ${r.stars}★ ${E.BRANCH_NAMES[d.buyStar]}.`
          : d.promote
            ? `${name} promoted to ${E.RANKS[r.rank]}.`
            : `${name}'s medals updated.`,
    );
    return;
  }
  if (d.generalOpen) {
    generalDialog(d.generalOpen, true);
    return;
  }
  if (d.generalsSide) {
    generalsDialog(d.generalsSide);
    return;
  }
  if (d.admiral) {
    const u = selectedUnit(),
      r = u ? E.assign(game, u.id, d.admiral) : { ok: false, reason: 'Select a unit first.' };
    if (r.ok) {
      closeModal();
      refreshAndSave();
      toast(`${C(d.admiral).short} takes command.`);
    } else toast(r.reason);
    return;
  }
  switch (d.action) {
    case 'details':
      detailOpen = !detailOpen;
      updateSelection();
      break;
    case 'start-conquest':
      newGame();
      break;
    case 'continue': {
      const s = getSave();
      if (s) {
        aiToken++;
        hqBack = 'game';
        game = E.applyProfile(s, loadProfile());
        selection = null;
        undoStack = [];
        zoom = 3.2;
        closeModal();
        render();
        centerOn(capitalOf(game.player));
        if (game.over) resultDialog();
      }
      break;
    }
    case 'new':
      startMenu();
      break;
    case 'close':
      closeModal();
      break;
    case 'help':
      helpBack = modal.querySelector('[aria-label="Operation setup"]') ? 'start' : 'game';
      helpDialog();
      break;
    case 'help-close':
      if (helpBack === 'start') startMenu();
      else closeModal();
      break;
    case 'menu':
      menuDialog();
      break;
    case 'powers':
      powersDialog();
      break;
    case 'next':
      nextFleet();
      break;
    case 'undo':
      undoMove();
      break;
    case 'sound':
      toast(SFX.toggle() ? 'Sound on.' : 'Sound off.');
      render();
      break;
    case 'research':
      researchBack = modal.querySelector('[aria-label="Operation setup"]')
        ? 'start'
        : modal.querySelector('[aria-label="Operation result"]')
          ? 'result'
          : 'game';
      researchDialog();
      break;
    case 'research-close':
      if (researchBack === 'start') startMenu();
      else if (researchBack === 'result') resultDialog();
      else closeModal();
      break;
    case 'general-close':
      if (hqBack === 'start') generalsDialog();
      else closeModal();
      break;
    case 'generals':
      generalsDialog(hqBack === 'game' ? game.player : generalsSide);
      break;
    case 'generals-start':
      hqBack = 'start';
      generalsDialog(setup.side);
      break;
    case 'generals-close':
      if (hqBack === 'start') startMenu();
      else closeModal();
      break;
    case 'admirals':
    case 'assign':
      admiralDialog();
      break;
    case 'archive':
      archiveBack = 'game';
      archiveDialog('Infantry', game.player);
      break;
    case 'archive-start':
      archiveBack = 'start';
      archiveDialog('Infantry', setup.side);
      break;
    case 'archive-close':
      if (archiveBack === 'start') startMenu();
      else closeModal();
      break;
    case 'end':
      endTurn();
      break;
    case 'end-confirm':
      endTurn(true);
      break;
    case 'skip-ai':
      skipAI = true;
      break;
    case 'feint': {
      const u = selectedUnit();
      if (u) doAction(() => E.feint(game, u.id));
      break;
    }
    case 'reinforce': {
      const u = selectedUnit();
      if (u) doAction(() => E.reinforce(game, u.id));
      break;
    }
    case 'repair': {
      const u = selectedUnit();
      if (u) doAction(() => E.repair(game, u.id));
      break;
    }
    case 'wait': {
      const u = selectedUnit();
      if (u && u.side === game.player && interactive()) {
        u.moved = u.attacked = true;
        refreshAndSave();
        nextFleet();
      }
      break;
    }
    case 'zoom-in':
      changeZoom(1.2);
      break;
    case 'zoom-out':
      changeZoom(1 / 1.2);
      break;
    case 'fit':
      zoom = ZOOM_MIN;
      break;
    case 'home':
      zoom = Math.max(zoom, 3.2);
      centerOn(capitalOf(game.player));
      break;
  }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset?.general) {
    e.preventDefault();
    generalDialog(e.target.dataset.general, e.target.dataset.personal === '1');
    return;
  }
  if (modal.children.length) {
    if (e.key === 'Tab') {
      const list = [...modal.querySelectorAll('button:not(:disabled),select,a[href]')],
        first = list[0],
        last = list.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    if (e.key === 'Escape' && !modal.querySelector('[aria-label="Operation setup"]')) {
      if (helpBack === 'start' && modal.querySelector('[aria-label="Field manual"]')) startMenu();
      else if (archiveBack === 'start' && modal.querySelector('[aria-label="Knightmare archive"]')) startMenu();
      else closeModal();
    }
    return;
  }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'n') {
    e.preventDefault();
    nextFleet();
  }
  if (k === 'z') {
    e.preventDefault();
    undoMove();
  }
  if (k === 'h') centerOn(capitalOf(game.player));
  if (k === 'escape') {
    selection = null;
    updateSelection();
  }
  if (k === '+' || k === '=') changeZoom(1.2);
  if (k === '-') changeZoom(1 / 1.2);
  if (k === '0') zoom = ZOOM_MIN;
  if (['w', 'a', 's', 'd'].includes(k)) {
    e.preventDefault();
    const step = 70 / (baseScale * zoom);
    cam.x += k === 'a' ? -step : k === 'd' ? step : 0;
    cam.y += k === 'w' ? -step : k === 's' ? step : 0;
  }
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const p = hover || selectedUnit() || selectedStation() || capitalOf(game.player);
    hover = E.tile(
      game,
      p.c + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0),
      E.clamp(p.r + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0), 0, game.rows - 1),
    );
    if (hover && !onScreen(hover)) centerOn(hover);
  }
  if (k === 'enter' && document.activeElement === canvas) {
    e.preventDefault();
    activateHex(hover);
  }
});
function registerTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const defs = [
    {
      name: 'read_world_war',
      description: 'Read the current world war: resources, units, cities, surrendered powers and whose turn it is.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => ({
        turn: game.turn,
        phase: game.phase,
        player: game.player,
        resources: game.economy[game.player],
        cities: game.stations,
        units: game.units.filter(u => u.hp > 0),
        fallen: game.fallen,
        result: game.over,
      }),
    },
    {
      name: 'select_unit',
      description: 'Select a living Knightmare unit on the map and center the view on it. Does not move or attack.',
      inputSchema: {
        type: 'object',
        properties: { unitId: { type: 'integer' } },
        required: ['unitId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: input => {
        if (modal.children.length) throw new Error('Close the open dialog first.');
        if (!Number.isInteger(input.unitId) || !game.units.some(u => u.id === input.unitId && u.hp > 0))
          throw new Error('Invalid unit ID.');
        selectUnit(input.unitId, true);
        return { selectedUnitId: input.unitId };
      },
    },
  ];
  for (const t of defs) {
    try {
      Promise.resolve(context.registerTool(t)).catch(() => {});
    } catch (e) {}
  }
}
function dockHTML() {
  const u = selectedUnit(),
    s = selectedStation();
  if (u) {
    const t = E.TYPES[u.type],
      a = C(u.cmd),
      ours = u.side === game.player,
      canUndo = ours && interactive() && undoStack.at(-1)?.unitId === u.id;
    return `<div class="dock-visual">${ART.unit(u.type, '', u.side)}${a ? generalPortrait(u.cmd, 'dock-portrait', !!u.personal) : ''}<span class="faction-flag ${u.side}">${F(u.side).letter}</span></div><div class="dock-unit"><span class="label">${a ? a.short + ' · ' : ''}${t.branch} · ×${u.stack}${E.atSea(game, u) ? ' · Embarked' : ''}</span><strong>${unitName(u)}</strong><div class="dock-stats">${ICONS.hp(u.hp, E.maxHP(u))}${statRow(u, t)}</div><p>${Math.ceil(u.hp)} / ${E.maxHP(u)} frame · ${moraleName(u.morale)}${ours ? ' · ' + fireStatus(u) : ''}</p></div><div class="dock-actions">${canUndo ? '<button class="small undo-button" data-action="undo">↶ Undo move</button>' : ''}<button class="small" data-action="details">${ours ? 'Orders & upgrades' : 'Unit details'}</button>${ours && !u.cmd ? '<button class="small" data-action="assign">Assign commander</button>' : ''}${ours && a?.action ? act('data-action="feint"', a.action.name, phaseReason() || E.feintReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="wait"', 'Hold position', phaseReason() || (u.attacked ? 'Already fired' : null), '', 'small ghost') : ''}</div>`;
  }
  if (s) {
    const ours = s.owner === game.player;
    return `<div class="dock-visual">${ART.city(cityKind(s), s.owner)}<span class="faction-flag ${s.owner}">${F(s.owner).letter}</span></div><div class="dock-unit"><span class="label">${s.capital ? 'Capital' : s.fort ? 'Fortress city' : 'City'} · Factory ${s.tier}</span><strong>${s.name}</strong><div class="dock-health"><div class="bar"><i style="width:${(s.shield / s.maxShield) * 100}%"></i></div><span>${Math.ceil(s.shield)} / ${s.maxShield} DEF</span></div><p>Income +${s.income + 15 * (s.refinery || 0)} &nbsp; Industry +${s.industry}</p></div><div class="dock-actions">${ours ? act(`data-shop="${s.id}"`, 'Factory', shipyardReason(s), '', 'primary') : ''}<button class="small" data-action="details">City details</button></div>`;
  }
  return `<div class="dock-idle"><span class="label">Army command</span><strong>Select a unit or city</strong><p>Click a Knightmare to move and attack. Click a city to build.</p></div><div class="dock-actions"><button class="small" data-action="next">Select a ready unit</button><button class="small ghost" data-action="details">Unit directory</button></div>`;
}
// ======== Map renderer ========
const PLATE = {
  neutral: { light: '#7a7462', mid: '#45402f', dark: '#25221a', trim: '#e6dfc0', bar: '#c9c2a2' },
  britannia: { light: '#5d418f', mid: '#2e1d52', dark: '#170d2e', trim: '#e6c56a', bar: '#d9b45a' },
  eu: { light: '#3d63ad', mid: '#1a3266', dark: '#0b1a3a', trim: '#d3dbe2', bar: '#c4ccd3' },
  cf: { light: '#ad3a33', mid: '#5c1512', dark: '#330806', trim: '#f2c14e', bar: '#e0b24a' },
};
const TERRAIN_FILL = {
  sea: '#174a6c',
  plains: '#7b9852',
  forest: '#567f45',
  mountain: '#8d826a',
  desert: '#d3bc85',
  snow: '#e3eaef',
  peak: '#5d5862',
};
function hash01(c, r, salt = 0) {
  const v = Math.sin(c * 127.1 + r * 311.7 + salt * 74.7) * 43758.5453;
  return v - Math.floor(v);
}
// Coast and shade flags, computed once per map.
let tileMeta = null,
  tileMetaFor = null;
function metaFor(t) {
  if (tileMetaFor !== game.tiles) {
    tileMetaFor = game.tiles;
    tileMeta = game.tiles.map(x => {
      const adj = E.adjacent(game, x);
      return {
        adj,
        coast: x.terrain === 'sea' && adj.some(n => n.terrain !== 'sea'),
        tint: hash01(x.c, x.r) * 0.12 - 0.06,
      };
    });
  }
  return tileMeta[t.r * game.cols + t.c];
}
function starPath(x, y, ro, ri) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro,
      a = ((36 * i - 90) * Math.PI) / 180;
    i ? ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}
function terrainProps(t, x, y, scale) {
  if (R * scale < 13) return;
  const h = k => hash01(t.c, t.r, k);
  if (t.terrain === 'forest') {
    for (let i = 0; i < 4; i++) {
      const tx = x + (h(i) - 0.5) * R * 1.1,
        ty = y + (h(i + 9) - 0.5) * R * 0.9;
      ctx.fillStyle = '#2f5a2e';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 12);
      ctx.lineTo(tx + 7, ty + 4);
      ctx.lineTo(tx - 7, ty + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3f7339';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 9);
      ctx.lineTo(tx + 4, ty + 1);
      ctx.lineTo(tx - 4, ty + 1);
      ctx.closePath();
      ctx.fill();
    }
  } else if (t.terrain === 'mountain' || t.terrain === 'peak') {
    const big = t.terrain === 'peak' ? 1.35 : 1;
    for (const [dx, s] of [
      [-10, 0.8],
      [8, 1],
    ]) {
      const px = x + dx,
        hgt = 22 * s * big,
        w = 15 * s * big;
      ctx.fillStyle = t.terrain === 'peak' ? '#3e3a44' : '#6d6352';
      ctx.beginPath();
      ctx.moveTo(px, y - hgt + 8);
      ctx.lineTo(px + w, y + 10);
      ctx.lineTo(px - w, y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2f5f7';
      ctx.beginPath();
      ctx.moveTo(px, y - hgt + 8);
      ctx.lineTo(px + w * 0.35, y - hgt * 0.45 + 8);
      ctx.lineTo(px - w * 0.35, y - hgt * 0.45 + 8);
      ctx.closePath();
      ctx.fill();
    }
  } else if (t.terrain === 'desert') {
    ctx.strokeStyle = '#b89c62';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 2; i++) {
      const dy = (i - 0.5) * 14 + (h(i) - 0.5) * 6;
      ctx.beginPath();
      ctx.moveTo(x - 18, y + dy);
      ctx.quadraticCurveTo(x - 4, y + dy - 7, x + 10, y + dy);
      ctx.quadraticCurveTo(x + 16, y + dy + 4, x + 22, y + dy);
      ctx.stroke();
    }
  } else if (t.terrain === 'snow') {
    ctx.fillStyle = '#c6d4dd';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + (h(i) - 0.5) * 40, y + (h(i + 5) - 0.5) * 30, 6, 2);
  } else if (t.terrain === 'sea' && R * scale > 18 && h(3) < 0.35) {
    ctx.strokeStyle = '#ffffff1c';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.quadraticCurveTo(x - 5, y - 4, x, y);
    ctx.quadraticCurveTo(x + 5, y + 4, x + 10, y);
    ctx.stroke();
  }
}
// Selected tile: glowing hex outline with pulsing inner corners.
function selectedHex(p, time, scale) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 260);
  ctx.save();
  hexPath(p.x, p.y, R - 2);
  ctx.fillStyle = '#3ff2c41c';
  ctx.fill();
  ctx.shadowColor = '#3ff2c4';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#3ff2c4';
  ctx.lineWidth = Math.max(2.5, 2 / scale);
  ctx.stroke();
  ctx.shadowBlur = 0;
  const inset = R - 7 - pulse * 3,
    len = 8;
  ctx.strokeStyle = `rgba(160,255,225,${0.55 + 0.45 * pulse})`;
  ctx.lineWidth = Math.max(2, 1.6 / scale);
  const vertex = i => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: p.x + inset * Math.cos(a), y: p.y + inset * Math.sin(a) };
  };
  for (let i = 0; i < 6; i++) {
    const v = vertex(i);
    for (const j of [-1, 1]) {
      const n = vertex(i + j),
        d = Math.hypot(n.x - v.x, n.y - v.y);
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(v.x + ((n.x - v.x) * len) / d, v.y + ((n.y - v.y) * len) / d);
      ctx.stroke();
    }
  }
  ctx.restore();
}
// Attackable hexes: pulsing red crosshair drawn above the units.
function drawCrosshair(p, time, scale) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 200),
    r = 11 + pulse * 1.5;
  ctx.save();
  ctx.translate(p.x, p.y - 4);
  ctx.strokeStyle = `rgba(255,80,60,${0.65 + 0.35 * pulse})`;
  ctx.lineWidth = Math.max(2, 1.8 / scale);
  ctx.shadowColor = '#ff3b2f';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd0c4';
  ctx.fill();
  ctx.restore();
}
// Hover estimate shown above a red hex before the one-click attack.
function drawEstimate(p, pr, scale) {
  const text = `~${pr.unit || pr.shield} dmg · ${pr.counterAllowed ? '↩ ' + pr.counter : 'no counter'}`;
  ctx.save();
  ctx.translate(p.x, p.y - R + 2);
  ctx.scale(1 / scale, 1 / scale);
  ctx.font = "bold 12px 'Trebuchet MS'";
  const w = (ctx.measureText(text)?.width || text.length * 7) + 16;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w / 2, -24, w, 22, 5);
  else ctx.rect(-w / 2, -24, w, 22);
  ctx.fillStyle = '#3b0f0ee8';
  ctx.fill();
  ctx.strokeStyle = '#ff7a62';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff1e8';
  ctx.fillText(text, 0, -9);
  ctx.restore();
}
// WC4 base token in faction colors, ringed by frame integrity. Embarked units ride a transport hull.
function drawPlate(u, scale, sea) {
  const c = PLATE[u.side],
    cy = 14,
    rx = 31,
    ry = 18,
    f = Math.max(0, Math.min(1, u.hp / E.maxHP(u)));
  ctx.save();
  if (sea) {
    ctx.beginPath();
    ctx.moveTo(-40, cy - 4);
    ctx.lineTo(40, cy - 4);
    ctx.lineTo(30, cy + 14);
    ctx.lineTo(-34, cy + 14);
    ctx.closePath();
    ctx.fillStyle = '#5d6873';
    ctx.fill();
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = Math.max(2, 1.6 / scale);
    ctx.stroke();
    ctx.fillStyle = '#3b444d';
    ctx.fillRect(-30, cy - 10, 22, 7);
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-44, cy + 18);
    ctx.quadraticCurveTo(-30, cy + 12, -16, cy + 18);
    ctx.moveTo(16, cy + 18);
    ctx.quadraticCurveTo(30, cy + 12, 44, cy + 18);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, cy + 3, rx + 3, ry + 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#00000080';
    ctx.fill();
    const g = ctx.createRadialGradient(-7, cy - 6, 2, 0, cy, rx);
    g.addColorStop(0, c.light);
    g.addColorStop(0.65, c.mid);
    g.addColorStop(1, c.dark);
    ctx.beginPath();
    ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = Math.max(2, 1.6 / scale);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, cy, rx + 6, ry + 6, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#061019e0';
  ctx.lineWidth = Math.max(4.2, 3.2 / scale);
  ctx.stroke();
  if (f > 0) {
    ctx.beginPath();
    ctx.ellipse(0, cy, rx + 6, ry + 6, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
    ctx.strokeStyle = ICONS.hpColor(f);
    ctx.lineWidth = Math.max(2.8, 2.2 / scale);
    ctx.stroke();
  }
  ctx.restore();
}
// Unit strength: 1–3 metallic bars hung from the bottom of the token ring.
function drawStackBars(n, side) {
  const c = PLATE[side],
    w = 9,
    gap = 3,
    total = n * w + (n - 1) * gap,
    y = 41;
  for (let i = 0; i < n; i++) {
    const x = -total / 2 + i * (w + gap);
    ctx.fillStyle = '#05090d';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = c.bar;
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = '#ffffffb0';
    ctx.fillRect(x, y, w, 1.2);
  }
}
// WC4 commander pin: the commander's framed portrait standing above the unit, with rank stars.
function drawAdmiralPin(u, p, scale, sel) {
  const a = C(u.cmd);
  ctx.save();
  ctx.translate(p.x - 22, p.y - 40);
  const k = Math.min(1.6, Math.max(1, 0.85 / scale));
  ctx.scale(k, k);
  const w = 26,
    h = 32;
  ctx.shadowColor = '#000c';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const sp = ART.portraitSprite(u.cmd, w, h);
  if (sp) ctx.drawImage(sp.img, sp.sx, sp.sy, sp.sw, sp.sh, -w / 2, -h / 2, w, h);
  else outlinedText('★', 0, 4, 14, '#e9c366', scale);
  ctx.strokeStyle = sel ? '#3ff2c4' : PLATE[u.side].trim;
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
  ctx.fillStyle = PLATE[u.side].mid;
  ctx.fillRect(-w / 2 - 2, h / 2 + 1, w + 4, 7);
  ctx.strokeStyle = PLATE[u.side].trim;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-w / 2 - 2, h / 2 + 1, w + 4, 7);
  for (let i = 0; i < a.stars; i++) {
    starPath((i - (a.stars - 1) / 2) * 5, h / 2 + 4.6, 2.3, 0.95);
    ctx.fillStyle = '#ffe08a';
    ctx.fill();
  }
  ctx.restore();
  if (sel || scale > 0.8) outlinedText(a.short, p.x - 22, p.y - 40 - (h / 2 + 7) * k, 10, '#f7e5ad', scale);
}
function mapBadge(x, y, side, scale) {
  const radius = Math.max(7, 7 / scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = PLATE[side].mid;
  ctx.fill();
  ctx.strokeStyle = PLATE[side].trim;
  ctx.lineWidth = 1.4 / scale;
  ctx.stroke();
  ctx.font = `bold ${Math.max(9, 8 / scale)}px Georgia`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff8df';
  ctx.fillText(F(side).letter, 0, 3 / scale);
  ctx.restore();
}
function outlinedText(text, x, y, size, color, scale, font = 'Trebuchet MS', bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${Math.max(size, size / scale)}px '${font}'`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = '#06121fdd';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
function animatedPosition(u) {
  const p = hexCenter(u),
    fx = effects.find(e => e.kind === 'move' && e.unitId === u.id && e.life > 0);
  if (!fx) return p;
  const start = hexCenter(fx.from),
    sx = wrapNear(start.x, p.x),
    t = 1 - fx.life / fx.max,
    ease = 1 - Math.pow(1 - t, 3);
  return { x: sx + (p.x - sx) * ease, y: start.y + (p.y - start.y) * ease };
}
function drawFlash(x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(255,255,235,${alpha})`);
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
function draw(time, dt) {
  if (!canvas || !ctx) return;
  const scale = computeView(),
    { w, h } = mapSize,
    dpr = Math.min(devicePixelRatio || 1, 2),
    detail = R * scale >= 14;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, '#0d2a40');
  wash.addColorStop(1, '#071623');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const jolt = shake ? { x: (Math.random() * 2 - 1) * shake, y: (Math.random() * 2 - 1) * shake } : { x: 0, y: 0 };
  shake = Math.max(0, shake - dt * 30);
  ctx.save();
  ctx.translate(offset.x + jolt.x, offset.y + jolt.y);
  ctx.scale(scale, scale);
  const left = -offset.x / scale - R * 2,
    right = (w - offset.x) / scale + R * 2,
    top = -offset.y / scale - R * 2,
    bottom = (h - offset.y) / scale + R * 2,
    mid = (left + right) / 2;
  // Every on-screen copy of world x (the map wraps east to west).
  const copies = x => {
    const out = [];
    for (let k = Math.floor((left - x) / WORLD_W); x + k * WORLD_W <= right; k++)
      if (x + k * WORLD_W >= left) out.push(x + k * WORLD_W);
    return out;
  };
  const visible = p => p.y >= top && p.y <= bottom;
  // Terrain and territory.
  for (const t of game.tiles) {
    const c = hexCenter(t);
    if (!visible(c)) continue;
    const meta = metaFor(t);
    for (const x of copies(c.x)) {
      hexPath(x, c.y, R + 0.5);
      ctx.fillStyle = t.terrain === 'sea' && meta.coast ? '#1f5c80' : TERRAIN_FILL[t.terrain];
      ctx.fill();
      if (meta.tint && t.terrain !== 'sea') {
        ctx.fillStyle = meta.tint > 0 ? `rgba(255,255,255,${meta.tint})` : `rgba(0,0,0,${-meta.tint})`;
        ctx.fill();
      }
      if (t.owner && t.terrain !== 'sea') {
        ctx.fillStyle = F(t.owner).color + '30';
        ctx.fill();
      }
      if (detail) {
        ctx.strokeStyle = t.terrain === 'sea' ? '#ffffff08' : '#00000018';
        ctx.lineWidth = 0.6 / scale;
        ctx.stroke();
        terrainProps(t, x, c.y, scale);
      }
    }
  }
  // Coastlines and territorial borders.
  for (const t of game.tiles) {
    if (t.terrain === 'sea') continue;
    const c = hexCenter(t);
    if (!visible(c)) continue;
    for (const n of metaFor(t).adj) {
      const coast = n.terrain === 'sea';
      if (!coast && n.owner === t.owner) continue;
      const q = hexCenter(n),
        qx = wrapNear(q.x, c.x),
        angle = Math.atan2(q.y - c.y, qx - c.x),
        i = Math.round(angle / (Math.PI / 3)),
        a = ((i * 60 - 30) * Math.PI) / 180,
        b = ((i * 60 + 30) * Math.PI) / 180;
      for (const x of copies(c.x))
        drawLine(
          x + R * Math.cos(a),
          c.y + R * Math.sin(a),
          x + R * Math.cos(b),
          c.y + R * Math.sin(b),
          coast ? '#e8f4f866' : t.owner ? F(t.owner).color + 'cc' : '#ffffff40',
          (coast ? 1.4 : 2.4) / Math.max(scale, 0.35),
        );
    }
  }
  // Move and attack overlays.
  for (const k of readyCache.keys()) {
    const [cc, rr] = k.split(',').map(Number),
      t = E.tile(game, cc, rr),
      c = hexCenter(t);
    for (const x of copies(c.x)) {
      hexPath(x, c.y, R - 1.5);
      ctx.fillStyle = t.terrain === 'sea' ? '#4fb6ff40' : '#3ddc7a40';
      ctx.fill();
      ctx.strokeStyle = t.terrain === 'sea' ? '#9fd8ffcc' : '#6dffa5cc';
      ctx.lineWidth = 1.4 / Math.max(scale, 0.4);
      ctx.stroke();
      if (t.terrain === 'sea' && detail) outlinedText('⚓', x, c.y + 5, 12, '#d8f0ff', scale);
    }
  }
  for (const k of targetCache) {
    const [cc, rr] = k.split(',').map(Number),
      c = hexCenter({ c: cc, r: rr });
    for (const x of copies(c.x)) {
      hexPath(x, c.y, R - 1.5);
      ctx.fillStyle = '#e8343050';
      ctx.fill();
      ctx.strokeStyle = '#ff6a5acc';
      ctx.lineWidth = 1.4 / Math.max(scale, 0.4);
      ctx.stroke();
    }
  }
  const selTile =
    selection?.kind === 'unit'
      ? selectedUnit()
      : selection?.kind === 'station'
        ? selectedStation()
        : selection?.kind === 'tile'
          ? selection
          : null;
  if (selTile) for (const x of copies(hexCenter(selTile).x)) selectedHex({ x, y: hexCenter(selTile).y }, time, scale);
  // Cities.
  for (const s of game.stations) {
    const c = hexCenter(s);
    if (!visible(c)) continue;
    const garrison = E.unitAt(game, s),
      kind = cityKind(s);
    for (const x of copies(c.x)) {
      ctx.save();
      ctx.translate(x, c.y);
      if (!detail) {
        ctx.fillStyle = F(s.owner).color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 / scale;
        const z = s.capital ? 30 : 20;
        ctx.fillRect(-z / 2, -z / 2, z, z);
        ctx.strokeRect(-z / 2, -z / 2, z, z);
        if (s.capital && R * scale > 7) outlinedText(s.name, 0, 34, 11, '#fff6d6', scale, 'Trebuchet MS', true);
        ctx.restore();
        continue;
      }
      ctx.globalAlpha = garrison ? 0.78 : 1;
      const size = s.capital ? R * 2.3 : s.fort ? R * 2.05 : R * 1.85;
      if (!ART.drawCity(ctx, kind, s.owner, 0, -6, size)) {
        ctx.fillStyle = F(s.owner).color;
        ctx.fillRect(-14, -14, 28, 28);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#071623';
      ctx.fillRect(-20, 27, 40, 4);
      ctx.fillStyle = s.shield > 0 ? '#9fd8ff' : '#ff6a5a';
      ctx.fillRect(-20, 27, (40 * s.shield) / s.maxShield, 4);
      outlinedText(s.name, 0, garrison ? 50 : 44, 11, s.capital ? '#ffe9a0' : '#eef0dd', scale, 'Trebuchet MS', s.capital);
      if (!garrison) {
        mapBadge(-25, 20, s.owner, scale);
        for (let i = 0; i < s.tier; i++) {
          ctx.fillStyle = '#d8c581';
          ctx.fillRect(25, 10 - i * 5, 3, 3);
        }
      }
      if (s.fort && s.shield > 0 && (s.gunReady || 0) <= game.turn) {
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath();
        ctx.arc(26, -22, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  // WC4-style tokens drawn back to front: base plate, frame ring, Knightmares, strength bars and commander pins.
  const living = game.units.filter(u => u.hp > 0).sort((a, b) => a.r - b.r || a.c - b.c);
  for (const u of living) {
    const base = animatedPosition(u);
    if (!visible(base)) continue;
    const t = E.TYPES[u.type],
      sel = selection?.kind === 'unit' && selection.id === u.id,
      sea = E.atSea(game, u),
      spent = u.side === game.player && game.phase === game.player ? !hasOrders(u) : u.moved && u.attacked;
    for (const x of copies(base.x)) {
      ctx.save();
      ctx.translate(x, base.y);
      if (!detail) {
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = PLATE[u.side].light;
        ctx.fill();
        ctx.strokeStyle = sel ? '#3ff2c4' : PLATE[u.side].trim;
        ctx.lineWidth = 3 / Math.max(scale, 0.3);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      drawPlate(u, scale, sea);
      ctx.globalAlpha = spent ? 0.6 : 1;
      const size = t.cls === 'super' || t.cls === 'siege' ? R * 2.05 : t.branch === 'Armor' ? R * 1.9 : R * 1.75,
        flip = u.side !== game.player;
      ctx.shadowColor = '#000a';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 4;
      for (let i = Math.min(u.stack - 1, 2); i >= 0; i--)
        if (!ART.drawUnit(ctx, u.type, u.side, (i ? i * 7 * (flip ? -1 : 1) : 0) + (flip ? 4 : -4), -10 - i * 7, size * (i ? 0.86 : 1), size * (i ? 0.86 : 1), flip))
          outlinedText(t.code, 0, 3, 13, F(u.side).color, scale);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.globalAlpha = 1;
      drawStackBars(u.stack, u.side);
      if (u.side === game.player && interactive() && hasOrders(u)) {
        ctx.beginPath();
        ctx.arc(36, 8, Math.max(3, 2.4 / scale), 0, Math.PI * 2);
        ctx.fillStyle = '#6dffa5';
        ctx.fill();
        ctx.strokeStyle = '#06301a';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      if (u.morale < 0) outlinedText(u.morale === -3 ? '!' : '↓', 31, -14, 13, '#ffb78c', scale);
      ctx.restore();
    }
  }
  if (detail)
    for (const u of living)
      if (u.cmd) {
        const p = animatedPosition(u);
        if (!visible(p)) continue;
        for (const x of copies(p.x)) drawAdmiralPin(u, { x, y: p.y }, scale, selection?.kind === 'unit' && selection.id === u.id);
      }
  for (const k of targetCache) {
    const [c, r] = k.split(',').map(Number),
      p = hexCenter({ c, r });
    for (const x of copies(p.x)) drawCrosshair({ x, y: p.y }, time, scale);
  }
  if (hover) {
    const p = hexCenter(hover),
      u = selectedUnit(),
      hx = wrapNear(p.x, mid);
    hexPath(hx, p.y, R - 1);
    ctx.strokeStyle = '#dcebe769';
    ctx.lineWidth = 1.2 / scale;
    ctx.stroke();
    const pr = u && targetCache.has(E.key(hover)) ? E.preview(game, u.id, hover.c, hover.r) : null;
    if (pr) {
      const a = hexCenter(u);
      drawLine(wrapNear(a.x, hx), a.y, hx, p.y, '#ff9a6ac0', 1.4 / scale, [6, 6]);
      drawEstimate({ x: hx, y: p.y }, pr, scale);
    }
  }
  for (const e of effects) {
    e.life -= dt;
    const b0 = hexCenter(e.to),
      bx = wrapNear(b0.x, mid),
      a0 = e.from ? hexCenter(e.from) : null,
      ax = a0 ? wrapNear(a0.x, bx) : 0,
      fade = Math.max(0, e.life / e.max);
    ctx.globalAlpha = fade;
    if (e.kind === 'beam') {
      drawLine(ax, a0.y, bx, b0.y, e.color, (e.heavy ? 9 : 4) / Math.max(scale, 0.5));
      drawLine(ax, a0.y, bx, b0.y, '#fff6dd', (e.heavy ? 3.2 : 1.6) / Math.max(scale, 0.5));
      drawFlash(bx, b0.y, 30 + (1 - fade) * 30, 'rgba(255,190,90,0.6)', 0.9);
    } else if (e.kind === 'boom') {
      const grow = 1 - fade;
      drawFlash(bx, b0.y - 6, 30 + grow * 60, 'rgba(255,120,40,0.75)', 1);
      ctx.fillStyle = `rgba(40,30,30,${0.5 * fade})`;
      ctx.beginPath();
      ctx.arc(bx + 8, b0.y - 18 - grow * 20, 14 + grow * 18, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'move') {
      drawLine(ax, a0.y, bx, b0.y, e.color, 2 / scale, [7, 6]);
    } else if (e.kind === 'text') {
      const age = 1 - fade,
        pop = e.pop ? 1 + Math.max(0, 1 - age * 7) * 0.7 : 1;
      outlinedText(e.text, bx, b0.y - 28 - age * 28 - (e.dy || 0), (e.size || 14) * pop, e.color, scale, 'Trebuchet MS', true);
    }
    ctx.globalAlpha = 1;
  }
  effects = effects.filter(e => e.life > 0);
  ctx.restore();
}
// Optional local art (dist/local-art, git-ignored) arrives after the first render: redraw once it is registered.
ART.onLocal = () => {
  render();
  if (modal.querySelector('[aria-label="Operation setup"]')) startMenu();
};
render();
startMenu();
registerTools();
requestAnimationFrame(frame);

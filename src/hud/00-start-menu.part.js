/* Knightmare Conquest UI: The start menu, top bar, F.L.E.I.J.A. targeting, unit and city panels, orders and the selection dock. */
'use strict';
const FACTION_BLURB = {
  eb: { label: 'Euro Britannia', portrait: 'shin', text: 'Command the occupied Russian heartland and eastern fronts alongside the Holy Britannian Empire.' },
  britannia: {
    portrait: 'suzaku',
    label: 'All hail Britannia',
    text: 'The Americas, Area 11 and the Pacific. Suzaku, Cornelia, Bismarck and Euro Britannia’s exiled knights. Fewer cities, but the best frames and commanders.',
  },
  eu: {
    portrait: 'leila',
    label: 'Liberté, égalité, fraternité',
    text: 'Europe, Russia and Africa, the largest power on Earth. Leila, Akito and the wZERO unit with the Alexanders, Panzer-Hummel firepower and the El Alamein line.',
  },
  cf: {
    portrait: 'xingke',
    label: 'The Vermillion Forbidden City',
    text: 'Asia from Tehran to Taipei. Li Xingke’s Shen Hu, massed Gun-Ru and the Jabalpur frames of the Militarized Zone of India.',
  },
};
function startMenu() {
  // Leaving a mission (it stays saved) puts the world map back behind the menu.
  if (game.mode === 'campaign' || game.mode === 'scenario') {
    resetSession();
    game = E.createGame('britannia');
    setWorld();
    selection = null;
    zoom = 3.2;
    render();
  }
  const cfg = E.CONQUESTS[setup.conquest] || E.CONQUESTS.world;
  if (!cfg.selectable.includes(setup.side)) setup.side = cfg.selectable[0];
  const saved = getSave(chosenSaveKey()),
    // Read once the scenario modules have loaded; game.js redraws this menu then.
    scenarioSave = scenariosReady ? getSave(SCENARIO_KEY) : null,
    profile = loadProfile();
  const cards = cfg.selectable.map(side => {
    const b = FACTION_BLURB[side],
      info = cfg.factions?.[side] || E.FACTIONS[side],
      on = setup.side === side,
      ufn = cfg.id === 'ufn2018' && side === 'cf';
    const label = ufn ? 'The United Federation' : b.label;
    const blurb = ufn ? 'Field Black Knights Knightmares with Black Knights, Chinese and former E.U. commanders against the Britannian alliance.' : b.text;
    // Display each faction's standard; retain the U.F.N.'s original placement.
    const flag = ufn ? `<span class="ufn-start-flag" aria-hidden="true">${ART.ufnFlagSVG()}</span>`
      : ART.flagSVG(side) ? `<span class="faction-banner" aria-hidden="true">${ART.flagSVG(side)}</span>` : '';
    return `<button class="faction ${side} ${ufn ? 'ufn-2018' : ''} ${on ? 'active' : ''}" data-faction="${side}">${ART.portrait(b.portrait, 'faction-portrait')}${flag}<span class="label" style="color:${info.color}">${label}</span><h3>${info.name}</h3><p><b>${cfg.expectedCities?.[side] ?? '?'} starting cities · ${info.capital}</b></p><p>${blurb}</p><span class="select-mark">${on ? '✓ Command selected' : 'Select ' + info.short}</span></button>`;
  }).join('');
  const reward = conquestReward(setup.difficulty, profile, cfg.id, setup.side);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Operation setup"><div class="eyebrow">Code Geass · World conquest</div><h1>${cfg.id === 'ufn2018' ? 'A federation rises.<br>An empire resists.' : 'One world.<br>Three empires.'}</h1><p>Build a Knightmare army. Appoint your commanders. Take your rivals’ cities—a power surrenders only when its last city falls.</p><div class="setup-row"><div><label for="conquest-select">Choose conquest</label><select class="select" id="conquest-select">${Object.values(E.CONQUESTS).map(c => `<option value="${c.id}" ${c.id === cfg.id ? 'selected' : ''}>${c.title}</option>`).join('')}</select></div></div><div class="choice-grid three">${cards}</div><div class="conquest-row"><div><label>Conquest · ${E.WORLD.cols} × ${E.WORLD.rows} world map</label><h3 class="conquest-title">${cfg.title}</h3><p class="mode-note">${(E.ERAS[cfg.id] || E.ERAS.world).desc} <b>${(E.ERAS[cfg.id] || E.ERAS.world).rulesText}</b> Played as the ${(cfg.factions?.[setup.side] || E.FACTIONS[setup.side]).name}. ${cfg.id === 'ufn2018' ? 'Starting cities: Britannia 75 · Euro Britannia 15 · U.F.N. 72 · Neutral Australia 6.' : 'Starting cities: Britannia 51 · E.U. 58 · Chinese Federation 47 · Neutral 12.'}${reward ? ` First win: up to ${reward} command tokens.` : ''}</p></div><button class="primary" data-action="start-conquest">Launch conquest</button></div><div class="conquest-row"><div><label>Scenarios · Japan and Europe</label><h3 class="conquest-title">Regional Wars</h3><p class="mode-note">Choose the Invasion of Japan, the alternate-history Division of Japan or the European War, each with its own tactical map, commanders and total conquest victory. Saved automatically in a separate slot.</p></div>${scenarioSave && !scenarioSave.over ? `<button data-action="continue-scenario">Continue ${esc(scenarioSave.scenario?.title || 'scenario')} · turn ${scenarioSave.turn}</button>` : ''}<button class="primary" data-action="scenario">Scenarios</button></div>${campaignRow(profile)}<div class="conquest-row campaign-world-row"><div><label>Campaign Mode · Strategic World War</label><h3 class="conquest-title">Conquer the world, region by region.</h3><p class="mode-note">Choose Europia United or the Holy Britannian Empire. Win regional wars to unlock the next front; your world map changes as you conquer.</p></div><button class="primary" data-action="war-campaign">Campaign Mode</button></div><div class="setup-row"><div><label for="difficulty-select">Difficulty</label><select class="select" id="difficulty-select">${Object.entries(
    E.DIFFICULTIES,
  )
    .map(
      ([k, d]) =>
        `<option value="${k}" ${setup.difficulty === k ? 'selected' : ''}>${d.name}${d.tokens > 1 ? ` · ×${d.tokens} tokens` : ''}</option>`,
    )
    .join(
      '',
    )}</select><p class="mode-note">${E.DIFFICULTIES[setup.difficulty]?.desc || ''}</p></div><div class="hq-summary"><span class="label">Command HQ</span><b>${ICONS.use('token', 'cost-ico')} ${profile.tokens || 0} tokens</b><small>${profile.wins || 0} victories · ${Object.values(profile.research || {}).reduce((a, l) => a + l, 0)} research levels</small><span class="hq-buttons"><button class="small" data-action="research">HQ research</button><button class="small" data-action="generals-start">Commanders</button><button class="small" data-action="elite-forces-start">Elite Forces</button></span></div></div><div class="badge-row"><span class="badge">${Object.values(E.TYPES).filter(t => t.side !== 'neutral').length} Knightmare Frames</span><span class="badge">3 branches: Infantry · Armor · Artillery</span><span class="badge">${Object.keys(E.COMMANDERS).length} commanders · ${Object.values(E.COMMANDERS).filter(a => a.recruit).length} to recruit</span><span class="badge">${Object.keys(E.TECH_NODES).length} HQ technologies</span><span class="badge">${Object.keys(E.ELITE_FORCES).length} Elite Forces</span><span class="badge">${E.CITY_DATA?.length || 168} cities</span></div><div class="dialog-footer"><div>${saved ? '<button data-action="continue">Continue saved game</button>' : unreadableSave(chosenSaveKey()) ? '<small class="notice">Your saved conquest is from an older version and cannot be loaded. A new conquest will replace it.</small>' : ''}<button class="ghost" data-action="help">Field manual</button><button class="ghost" data-action="archive-start">Knightmare archive</button></div><small class="notice">${NOTICE}<br>Free, non-commercial fan game. Saved in this browser; a new operation replaces your saved conquest.</small></div></section></div>`;
  focusDialog();
}
// Tokens still on offer for a first victory at this difficulty (before banked research).
function conquestReward(difficulty, profile, era = 'world', side = 'britannia') {
  if ((profile.cleared || {})[`conquest:${era}:${side}:${difficulty}`]) return 0;
  const scale = E.DIFFICULTIES[difficulty]?.tokens || 1,
    t = E.TOKEN_REWARD;
  return Math.round((t.victory + t.conquest) * scale) + (profile.wins || 0 ? 0 : t.first);
}
// BK's faction identity is near-black on the map. Gold remains the
// accessible interface accent against the game's dark command panels.
function factionUIColor(side) {
  return side === 'bk' ? '#f0c94a' : F(side).color;
}

/* Section 7: short, keyboard-accessible command groups, without changing action handlers. */
function hudNavGroup(label, items, key) {
  return `<details name="hud-command-menu" class="hud-nav-group" data-hud-group="${key}"><summary title="${esc(label)} commands" aria-label="${esc(label)} commands">${esc(label)}<span class="hud-chevron" aria-hidden="true">⌄</span></summary><div class="hud-nav-menu" role="group" aria-label="${esc(label)}">${items.join('')}</div></details>`;
}
function hudNavAction(action, label, tip, disabled = null) {
  return `<button type="button" class="hud-menu-action" data-action="${action}" title="${esc(disabled || tip)}"${disabled ? ` disabled aria-label="${esc(label + ': ' + disabled)}"` : ''}>${esc(label)}</button>`;
}
function hudMenus() {
  const campaign = game.mode === 'campaign';
  const groupMode = game.mode === 'conquest' || game.mode === 'scenario';
  const blocked = phaseReason();
  const operations = [
    ...(groupMode ? [hudNavAction('army-groups', 'Army Groups', 'Plan and manage Army Group objectives')] : []),
    ...(!campaign ? [hudNavAction('production', 'Production', 'Build and automate units', blocked),
                   hudNavAction('elite-forces', 'Elite Forces', 'Inspect and upgrade elite units')] : []),
    ...(campaign ? [hudNavAction('briefing', 'Mission Briefing', 'Review the active mission'),
                    hudNavAction('archive', 'Unit Archive', 'Examine units')] : [])
  ];
  const hq = [
    ...(!campaign ? [hudNavAction('admirals', 'Commanders', 'Assign a commander', blocked)] : []),
    hudNavAction('research', 'Research', 'Open the research headquarters'),
    ...(!campaign ? [hudNavAction('archive', 'Unit Archive', 'Inspect available unit classes')] : [])
  ];
  const intelligence = [
    ...(!campaign ? [hudNavAction('war-report', 'War Report', 'Review events, losses and operations')] : []),
    ...(!campaign ? [hudNavAction('powers', 'Powers', 'Inspect rival powers')] : [])
  ];
  const system = [
    hudNavAction('menu', 'Menu & Settings', 'Open the game menu and settings', game.phase !== game.player ? 'Cannot open the game menu during an AI phase' : null),
    hudNavAction('help', 'Field Manual', 'Open gameplay help'),
    `<button type="button" class="hud-menu-action" data-action="sound" aria-pressed="${SFX.enabled}" title="${SFX.enabled ? 'Mute sound' : 'Enable sound'}">${SFX.enabled ? 'Mute sound' : 'Enable sound'}</button>`
  ];
  return `<nav class="top-actions hud-nav" aria-label="Game commands">
    ${arsenalButton()}
    ${hudNavGroup('Operations', operations.length ? operations : [hudNavAction('archive', 'Unit Archive', 'Inspect units')], 'operations')}
    ${hudNavGroup('Command HQ', hq, 'hq')}
    ${hudNavGroup('Intelligence', intelligence, 'intelligence')}
    ${hudNavGroup('System', system, 'system')}
  </nav>`;
}
function render() {
  E.ensureWarReport(game);
  invalidateUIState();
  const mapFocused = !!canvas && document.activeElement === canvas;
  document.documentElement.style.setProperty('--own', factionUIColor(game.player));
  const e = game.economy[game.player],
    inc = E.income(game, game.player),
    cities = game.stations.filter(s => s.owner === game.player).length;
  app.innerHTML = `<header class="topbar hud-v2"><div class="brand hud-brand" title="Knightmare Conquest"><span class="mark" aria-hidden="true">◈</span><div><h1>Knightmare Conquest</h1><small>CODE GEASS · ${game.mode === 'campaign' ? 'STORY MODE' : game.mode === 'scenario' ? 'SCENARIO' : 'WORLD WAR'}</small></div></div><div class="hud-phase" role="status" aria-label="Current turn"><strong>Turn ${game.turn}${turnLimit() ? ` / ${turnLimit()}` : ''}</strong></div><div class="resources hud-resources" role="group" aria-label="Current resources">${resource('credits', 'Credits', 'Money for production and operations', e.credits, inc.credits)}${resource('industry', 'Industry', 'Used to build and reinforce units in factories', e.industry, inc.industry)}${resource('research', 'Research', 'Progress for technology and victory rewards', e.science, inc.science)}${resource('sakuradite', 'Sakuradite', 'Strategic mineral required by advanced Knightmares', e.sakuradite || 0, inc.sakuradite || 0)}${resource('token', 'Tokens', 'HQ command tokens earned from victories', loadProfile().tokens || 0)}<div class="resource res-cities" tabindex="0" role="status" title="Cities controlled: ${cities} of ${game.stations.length}" aria-label="Cities controlled: ${cities} of ${game.stations.length}"><span class="res-city-icon" aria-hidden="true">▣</span><span class="label">Cities</span><b>${cities}</b></div></div>${hudMenus()}</header><div class="workbench"><main class="theater"><div class="theater-head"><div><span class="label">STRATEGIC THEATER</span><h2>${E.modeTitle(game)}</h2></div><button type="button" class="objective-toggle" data-action="toggle-objective" aria-label="Show or hide the objective">Objective</button><p class="objective">${E.objectiveText(game)} ${starChips()}</p></div><div class="map-wrap"><canvas id="map" tabindex="0" aria-label="World hex map. Select a unit on the map or press N. Arrow keys move the hex cursor; Enter selects. Enter moves to a green land, cyan coastal, or blue water hex, or attacks a red hex. Z undoes the last move. E ends your turn. Drag to pan; plus and minus zoom."></canvas><div class="map-tools"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="fit" title="${wraps() ? 'World overview' : 'Whole battlefield'}">${wraps() ? 'World' : 'Map'}</button><button data-action="zoom-in" aria-label="Zoom in">+</button><button data-action="home" title="Center on your capital">⌂</button><button type="button" class="minimap-toggle" data-action="toggle-minimap" aria-label="Show or hide the minimap">▦</button></div><canvas id="minimap" class="minimap" aria-label="World minimap: click to move the view"></canvas></div><div class="map-caption"><span id="map-caption">Green: land move · Cyan: coast (land + ships) · Blue: sea/embark · Red: attack</span><span>Drag to pan · Scroll to zoom · <span class="kbd">N</span> next unit · <span class="kbd">E</span> end turn</span></div></main><aside class="side" id="side"></aside><div class="selection-dock" id="selection-dock"></div></div><footer class="footer"><div class="footer-actions"><button class="small undo-button" data-action="undo" ${!interactive() || !undoStack.length ? 'disabled' : ''} title="${phaseReason() || (undoStack.length ? 'Return the last moved unit to where it started (Z)' : 'No move to undo')}">↶ Undo move <span class="kbd">Z</span></button><button class="small" data-action="next" ${!interactive() ? 'disabled' : ''}>Next unit <span class="kbd">N</span></button><button class="small hud-all-orders" data-action="do-all-orders" ${!interactive() ? 'disabled' : ''} title="Move every eligible unit with standing orders now, and resolve group stance attacks. Each unit auto-moves at most once per turn.">Do all orders now</button>${game.phase === game.player || game.over ? `<button class="primary end hud-end-turn" title="Finish your turn (E)" data-action="end" ${!interactive() ? 'disabled' : ''}>End turn <span class="kbd">E</span></button>` : `<button class="primary end" disabled>${F(game.phase).short} turn…</button>`}</div></footer>`;
  canvas = $('map');
  ctx = canvas.getContext('2d');
  attachMap();
  attachMinimap();
  minimapDirty = true;
  updateSelection();
  militaryPresentation.collect();
  if (mapFocused) canvas.focus({ preventScroll: true });
}
// Your F.L.E.I.J.A. arsenal: shown once you hold a warhead; it arms the targeting mode.

/* Knightmare Conquest UI: The start menu, top bar, F.L.E.I.J.A. targeting, unit and city panels, orders and the selection dock. */
'use strict';
const FACTION_BLURB = {
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
  if (game.mode === 'campaign') {
    resetSession();
    game = E.createGame('britannia');
    setWorld();
    selection = null;
    zoom = 3.2;
    render();
  }
  const saved = getSave(),
    profile = loadProfile();
  const cards = E.MAJORS.map(side => {
    const b = FACTION_BLURB[side],
      on = setup.side === side;
    return `<button class="faction ${side} ${on ? 'active' : ''}" data-faction="${side}">${ART.portrait(b.portrait, 'faction-portrait')}<span class="label" style="color:${F(side).color}">${b.label}</span><h3>${F(side).name}</h3><p>${b.text}</p><p class="doctrine"><b>${F(side).doctrine}:</b> ${F(side).doctrineText}</p><span class="select-mark">${on ? '✓ Command selected' : 'Select ' + F(side).short}</span></button>`;
  }).join('');
  const reward = conquestReward(setup.difficulty, profile);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Operation setup"><div class="eyebrow">Code Geass · World conquest</div><h1>One world.<br>Three empires.</h1><p>Build a Knightmare army. Appoint your commanders. Take your rivals’ cities—a power surrenders only when its last city falls.</p><div class="choice-grid three">${cards}</div><div class="conquest-row"><div><label>Conquest · ${E.WORLD.cols} × ${E.WORLD.rows} world map</label><h3 class="conquest-title">${E.ERAS.world.name}</h3><p class="mode-note">${E.ERAS.world.desc} <b>${E.ERAS.world.rulesText}</b> Played as the ${F(setup.side).name}.${reward ? ` First win: up to ${reward} command tokens.` : ''}</p></div><button class="primary" data-action="start-conquest">Launch conquest</button></div>${campaignRow(profile)}<div class="setup-row"><div><label for="difficulty-select">Difficulty</label><select class="select" id="difficulty-select">${Object.entries(
    E.DIFFICULTIES,
  )
    .map(
      ([k, d]) =>
        `<option value="${k}" ${setup.difficulty === k ? 'selected' : ''}>${d.name}${d.tokens > 1 ? ` · ×${d.tokens} tokens` : ''}</option>`,
    )
    .join(
      '',
    )}</select><p class="mode-note">${E.DIFFICULTIES[setup.difficulty]?.desc || ''}</p></div><div class="hq-summary"><span class="label">Command HQ</span><b>${ICONS.use('token', 'cost-ico')} ${profile.tokens || 0} tokens</b><small>${profile.wins || 0} victories · ${Object.values(profile.research || {}).reduce((a, l) => a + l, 0)} research levels</small><span class="hq-buttons"><button class="small" data-action="research">HQ research</button><button class="small" data-action="generals-start">Commanders</button><button class="small" data-action="elite-forces-start">Elite Forces</button></span></div></div><div class="badge-row"><span class="badge">${Object.values(E.TYPES).filter(t => t.side !== 'neutral').length} Knightmare Frames</span><span class="badge">3 branches: Infantry · Armor · Artillery</span><span class="badge">${Object.keys(E.COMMANDERS).length} commanders · ${Object.values(E.COMMANDERS).filter(a => a.recruit).length} to recruit</span><span class="badge">${Object.keys(E.TECH_NODES).length} HQ technologies</span><span class="badge">${Object.keys(E.ELITE_FORCES).length} Elite Forces</span><span class="badge">${game.stations?.length || 149} cities</span></div><div class="dialog-footer"><div>${saved ? '<button data-action="continue">Continue saved game</button>' : unreadableSave() ? '<small class="notice">Your saved conquest is from an older version and cannot be loaded. A new conquest will replace it.</small>' : ''}<button class="ghost" data-action="help">Field manual</button><button class="ghost" data-action="archive-start">Knightmare archive</button></div><small class="notice">${NOTICE}<br>Free, non-commercial fan game. Saved in this browser; a new operation replaces your saved conquest.</small></div></section></div>`;
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
  invalidateUIState();
  const mapFocused = !!canvas && document.activeElement === canvas;
  document.documentElement.style.setProperty('--own', F(game.player).color);
  const e = game.economy[game.player],
    inc = E.income(game, game.player),
    cities = game.stations.filter(s => s.owner === game.player).length;
  app.innerHTML = `<header class="topbar"><div class="brand"><span class="mark" aria-hidden="true">◈</span><div><h1>Knightmare Conquest</h1><small>CODE GEASS · ${game.mode === 'campaign' ? 'CAMPAIGN' : 'WORLD WAR'}</small></div></div><div class="resources">${resource('credits', 'Credits', 'Credits', e.credits, inc.credits)}${resource('industry', 'Industry', 'Industry · Knightmare factories', e.industry, inc.industry)}${resource('research', 'Research', 'Research. Banked research becomes command tokens when you win (5 research = 1 token)', e.science, inc.science)}${resource('sakuradite', 'Sakuradite', 'Sakuradite · mined at deposits; heavier Knightmares need it', e.sakuradite || 0, inc.sakuradite || 0)}${resource('token', 'Tokens', 'Command tokens · spent on HQ research, earned by winning operations', loadProfile().tokens || 0)}<div class="resource"><span class="label">Cities</span><b>${cities} <small>/ ${game.stations.length}</small></b></div></div><nav class="top-actions" aria-label="Command menus">${arsenalButton()}<button class="small" data-action="research">Research</button>${game.mode === 'campaign' ? '<button class="small" data-action="briefing">Briefing</button><button class="small ghost" data-action="archive">Units</button>' : `<button class="small" data-action="production" ${!interactive() ? `disabled title="${phaseReason()}"` : ''}>Production</button><button class="small" data-action="admirals" ${!interactive() ? `disabled title="${phaseReason()}"` : ''}>Commanders</button><button class="small ghost" data-action="archive">Units</button><button class="small ghost" data-action="elite-forces">Elite Forces</button><button class="small ghost" data-action="powers">Powers</button>`}<button class="small ghost sound-toggle" data-action="sound" aria-pressed="${SFX.enabled}" aria-label="${SFX.enabled ? 'Mute sound' : 'Unmute sound'}" title="${SFX.enabled ? 'Mute sound' : 'Unmute sound'}">${SFX.enabled ? '🔊' : '🔇'}</button><button class="small ghost" data-action="help" aria-label="Field manual">?</button><button class="small ghost" data-action="menu" ${game.phase !== game.player ? 'disabled' : ''}>Menu</button></nav></header><div class="workbench"><main class="theater"><div class="theater-head"><div><span class="label" style="color:${F(game.phase).color}">Turn ${String(game.turn).padStart(2, '0')} · ${F(game.phase).short} phase</span><h2>${E.modeTitle(game)}</h2></div><p class="objective">${E.objectiveText(game)} <b>Turn ${game.turn}${turnLimit() ? ' / ' + turnLimit() : ''}</b>${starChips()}</p></div><div class="map-wrap"><canvas id="map" tabindex="0" aria-label="World hex map. Select a unit on the map or press N. Arrow keys move the hex cursor; Enter selects. Enter moves to a green hex or attacks a red hex. Z undoes the last move. Drag to pan; plus and minus zoom."></canvas><div class="map-banner" id="map-banner">${game.phase !== game.player ? 'Rival powers are maneuvering…' : 'Select a Knightmare to reveal its movement and firing range.'}</div><div class="map-tools"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="fit" title="${wraps() ? 'World overview' : 'Whole battlefield'}">${wraps() ? 'World' : 'Map'}</button><button data-action="zoom-in" aria-label="Zoom in">+</button><button data-action="home" title="Center on your capital">⌂</button></div><canvas id="minimap" class="minimap" aria-label="World minimap: click to move the view"></canvas><div class="map-legend">${(game.mode === 'campaign' ? game.order.filter(s => s !== 'neutral') : E.MAJORS).map(s => `<span style="color:${F(s).color}"><i class="legend-dot"></i>${F(s).short}</span>`).join('')}<span style="color:#d8cfa6"><i class="legend-dot"></i>Neutral</span><span>▣ City</span></div></div><div class="map-caption"><span id="map-caption">Green hex: move · Red hex: attack · Blue sea hex: embark as a transport</span><span>Drag to pan · Scroll to zoom · <span class="kbd">N</span> next unit</span></div></main><aside class="side" id="side"></aside><div class="selection-dock" id="selection-dock"></div></div><footer class="footer"><div class="turn-status" id="turn-status"></div><div class="footer-actions"><button class="small undo-button" data-action="undo" ${!interactive() || !undoStack.length ? 'disabled' : ''} title="${phaseReason() || (undoStack.length ? 'Return the last moved unit to where it started (Z)' : 'No move to undo')}">↶ Undo move <span class="kbd">Z</span></button><button class="small" data-action="next" ${!interactive() ? 'disabled' : ''}>Next unit <span class="kbd">N</span></button>${game.phase === game.player || game.over ? `<button class="primary end" data-action="end" ${!interactive() ? 'disabled' : ''}>End turn</button>` : `<button class="primary end" disabled>${F(game.phase).short} turn…</button>`}</div></footer>`;
  canvas = $('map');
  ctx = canvas.getContext('2d');
  attachMap();
  attachMinimap();
  minimapDirty = true;
  updateSelection();
  if (mapFocused) canvas.focus({ preventScroll: true });
}
// Your F.L.E.I.J.A. arsenal: shown once you hold a warhead; it arms the targeting mode.

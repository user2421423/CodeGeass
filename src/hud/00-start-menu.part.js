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
  // Story battles are ephemeral; persistent progress is shown through earned stars.
  const previous = modal.querySelector('.start-command');
  const scroll = previous?.scrollTop || 0;
  const focusedId = document.activeElement?.id;
  const focusedFaction = document.activeElement?.dataset?.faction;
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
  const era = E.ERAS[cfg.id] || E.ERAS.world;
  const saved = getSave(chosenSaveKey());
  const scenarioSave = getSave(SCENARIO_KEY);
  const worldCampaignSave = getSave(WAR_CAMPAIGN_BATTLE_KEY);
  const profile = loadProfile();
  const reward = conquestReward(setup.difficulty, profile, cfg.id, setup.side);
  const CP = E.campaign;
  const campaigns = Object.values(CP?.CAMPAIGNS || {});
  const missions = campaigns.flatMap(c => c.missions);
  const earnedStars = missions.reduce((total, m) => total + CP.best(profile, m.id), 0);
  const factions = cfg.selectable.map(side => {
    const b = FACTION_BLURB[side];
    const info = cfg.factions?.[side] || E.FACTIONS[side];
    const selected = setup.side === side;
    const ufn = cfg.id === 'ufn2018' && side === 'cf';
    const name = ufn ? 'United Federation' : side === 'britannia' ? 'Britannia' : side === 'eu' ? 'Europia United' : info.name;
    const standard = ufn ? `<span class="ufn-start-flag" aria-hidden="true">${ART.ufnFlagSVG()}</span>`
      : ART.flagSVG(side) ? `<span class="faction-banner" aria-hidden="true">${ART.flagSVG(side)}</span>` : '';
    const count = cfg.expectedCities?.[side];
    return `<button type="button" class="faction start-faction ${side} ${ufn ? 'ufn-2018' : ''} ${selected ? 'active' : ''}" data-faction="${side}" aria-pressed="${selected}" style="--side-accent:${info.color}" title="${esc(info.name)} — ${esc(b.text)}">
      ${ART.portrait(b.portrait, 'faction-portrait')}${standard}
      <span class="start-faction-title">${esc(name)}</span>
      <span class="start-faction-meta">${count == null ? '' : count + ' starting cities · '}${esc(info.capital)}</span>
      <span class="start-faction-choice">${selected ? '✓ Selected' : 'Select faction →'}</span>
    </button>`;
  }).join('');
  const saveButton = saved ? `<button class="start-resume" data-action="continue">Continue conquest · Turn ${saved.turn}</button>` : '';
  const scenarioResume = scenarioSave && !scenarioSave.over
    ? `<div class="start-mode-resume"><button data-action="continue-scenario">↳ Resume ${esc(scenarioSave.scenario?.title || 'scenario')} · Turn ${scenarioSave.turn}</button></div>` : '';
  // World Campaign keeps an independent battle slot from standalone scenarios.
  const worldCampaignResume = worldCampaignSave?.mode === 'scenario' &&
    !worldCampaignSave.over && worldCampaignSave.warCampaign &&
    KnightmareWarCampaign.FACTIONS.includes(worldCampaignSave.warCampaign.faction)
      ? `<div class="start-mode-resume"><button data-action="continue-world-campaign">↳ Continue World Campaign · Turn ${worldCampaignSave.turn}</button></div>`
      : '';
  const techCount = Object.values(profile.research || {}).reduce((sum, level) => sum + level, 0);
  modal.innerHTML = `<div class="overlay start-overlay">
    <section class="dialog wide start-command" role="dialog" aria-modal="true" aria-label="Operation setup" aria-describedby="start-description">
      <header class="start-header">
        <div class="start-hero-art" aria-hidden="true"><img src="assets/art/portraits/lelouch-78b808b17079.webp" alt="" decoding="async"></div>
        <div class="start-brand">
          <div class="start-brandline"><span>CODE GEASS</span></div>
          <h1>Knightmare <em>Conquest</em></h1>
          <p id="start-description">Three empires. One world at war. Choose a side and decide its fate.</p>
        </div>
        
      </header>
      <div class="start-content">
        <div class="start-layout">
          <section class="start-conquest-panel" aria-label="World Conquest setup">
            <div class="start-panel-top"><span class="start-panel-index">CONQUEST</span><span class="start-chip">${E.WORLD.cols} × ${E.WORLD.rows} WORLD MAP</span></div>
            <h2>World Conquest</h2>
            <p class="start-intro">Build your armies, appoint commanders and conquer the world.</p>
            <div class="start-config-grid">
              <div><label for="conquest-select">Conflict</label><select class="select" id="conquest-select">${Object.values(E.CONQUESTS).map(c => `<option value="${esc(c.id)}" ${c.id === cfg.id ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></div>
              <div><label for="difficulty-select">Difficulty</label><select class="select" id="difficulty-select">${Object.entries(E.DIFFICULTIES).map(([id, d]) => `<option value="${esc(id)}" ${setup.difficulty === id ? 'selected' : ''}>${esc(d.name)}${d.tokens > 1 ? ' · ×' + d.tokens + ' tokens' : ''}</option>`).join('')}</select></div>
            </div>
            <div class="start-section-heading"><span>Select a faction</span><small>${cfg.selectable.length} playable powers</small></div>
            <div class="start-factions" role="group" aria-label="Conquest faction">${factions}</div>
            <div class="start-era-brief"><span class="start-era-name">${esc(cfg.title)}</span><span>${esc(era.desc)} <strong>${esc(era.rulesText)}</strong></span></div>
            <div class="start-launch">
              <button class="start-launch-main primary" data-action="start-conquest">Start conquest</button>
              ${saveButton}
            </div>
            ${unreadableSave(chosenSaveKey()) ? '<p class="start-save-warning">This conquest save is from an older version and cannot be loaded. Starting a new conquest will replace it.</p>' : ''}
            <small class="start-reward">${esc(E.DIFFICULTIES[setup.difficulty]?.desc || '')}${reward ? ` · First victory: up to ${reward} command tokens` : ''}</small>
          </section>
          <aside class="start-side" aria-label="Other game modes and headquarters">
            <div class="start-side-title"><span>Game modes</span></div>
            <section class="start-mode" style="--mode-accent:#d7aa64" data-open-mode="campaign" role="button" tabindex="0" aria-label="Open Story Mode">
              <span class="start-mode-serial" aria-hidden="true">I</span>
              <h3>Story Mode</h3>
              <p>Play short linked missions. Completed stars and rewards are saved.</p>
              <div class="start-mode-bottom"><span class="start-mode-info">${campaigns.length} campaigns · ${earnedStars}/${missions.length * 3} ★</span><button data-action="campaign">Play story</button></div>
            </section>
            <section class="start-mode" style="--mode-accent:#6fa7be" data-open-mode="scenario" role="button" tabindex="0" aria-label="Open Regional Scenarios">
              <span class="start-mode-serial" aria-hidden="true">II</span>
              <h3>Regional Scenarios</h3>
              <p>Fight standalone battles across detailed regional maps.</p>
              <div class="start-mode-bottom"><span class="start-mode-info">Standalone saves</span><button data-action="scenario">Browse scenarios</button></div>
              ${scenarioResume}
            </section>
            <section class="start-mode" style="--mode-accent:#c46f70" data-open-mode="war-campaign" role="button" tabindex="0" aria-label="Open World Campaign">
              <span class="start-mode-serial" aria-hidden="true">III</span>
              <h3>World Campaign</h3>
              <p>Lead your faction through an interconnected world war.</p>
              <div class="start-mode-bottom"><span class="start-mode-info">Persistent theater map</span><button data-action="war-campaign">Open campaign</button></div>
              ${worldCampaignResume}
            </section>
            <section class="start-hq" aria-label="Command headquarters">
              <div class="start-hq-top"><span class="start-kicker">HEADQUARTERS</span><b>${ICONS.use('token', 'cost-ico')} ${profile.tokens || 0} tokens</b></div>
              <p>${profile.wins || 0} victories · ${techCount} research levels · Permanent upgrades</p>
              <div class="start-hq-actions"><button data-action="research">Research</button><button data-action="generals-start">Commanders</button><button data-action="elite-forces-start">Elite Forces</button><button class="cp-menu-button" data-action="challenge-pass">Challenge Pass</button></div>
              ${profile.challengePass?.equipped && profile.challengePass?.cosmetics?.[profile.challengePass.equipped] ? `<div class="cp-hq-emblem">${CHALLENGE_PASS.cosmeticIcon(profile.challengePass.equipped)} <span>${esc(profile.challengePass.equipped)}</span></div>` : ""}
            </section>
          </aside>
        </div>
        <footer class="start-foot">
          <div class="start-foot-left"><button data-action="tutorial-start">Interactive tutorial</button><button data-action="help">Field manual</button><button data-action="archive-start">Knightmare archive</button></div>
          <small>${esc(NOTICE)} <b>Free, non-commercial fan game.</b> Progress is saved locally in this browser. Starting a new operation replaces the corresponding save slot.</small>
        </footer>
      </div>
    </section>
  </div>`;
  modal.querySelector('.start-command').scrollTop = scroll;
  const nextFocus = focusedId === 'conquest-select' || focusedId === 'difficulty-select'
    ? $(focusedId)
    : focusedFaction ? modal.querySelector(`.start-faction[data-faction="${focusedFaction}"]`) : null;
  if (nextFocus) nextFocus.focus({ preventScroll: true });
  else focusDialog();
}
// Tokens still on offer for a first victory at this difficulty (before banked research).
function conquestReward(difficulty, profile, era = 'world', side = 'britannia') {
  if ((profile.cleared || {})[E.conquestKey(era, side, difficulty)]) return 0;
  const t = E.TOKEN_REWARD;
  return (t[difficulty] || t.normal) + (profile.wins || 0 ? 0 : t.first);
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
    ...(game.mode === 'conquest' ? [hudNavAction('challenge-pass', 'Challenge Pass', 'Track Conquest objectives and claim rewards')] : []),
    ...(!campaign ? [hudNavAction('archive', 'Unit Archive', 'Inspect available unit classes')] : [])
  ];
  const intelligence = [
    ...(!campaign ? [hudNavAction('war-report', 'War Report', 'Review events, losses and operations')] : []),
    ...(!campaign ? [hudNavAction('powers', 'Powers', 'Inspect rival powers')] : [])
  ];
  const system = [
    hudNavAction('menu', 'Main Menu', 'Save and return to the main menu', game.phase !== game.player ? 'Cannot return to the main menu during an AI phase' : null),
    hudNavAction('help', 'Field Manual', 'Open gameplay help'),
    `<button type="button" class="hud-menu-action" data-action="sound" aria-pressed="${SFX.enabled}" title="${SFX.enabled ? 'Mute sound' : 'Enable sound'}">${SFX.enabled ? 'Mute sound' : 'Enable sound'}</button>`
  ];
  return `<nav class="top-actions hud-nav" aria-label="Game commands">
    <button type="button" class="hud-menu-toggle" data-action="hud-menu-toggle" aria-label="Open game menus" aria-expanded="${hudMenuOpen}">☰</button>
    ${arsenalButton()}
    ${hudNavGroup('Operations', operations.length ? operations : [hudNavAction('archive', 'Unit Archive', 'Inspect units')], 'operations')}
    ${hudNavGroup('Command HQ', hq, 'hq')}
    ${hudNavGroup('Intelligence', intelligence, 'intelligence')}
    ${hudNavGroup('System', system, 'system')}
  </nav>`;
}
function render() {
  if (typeof prepareMapNavigationBase === 'function') prepareMapNavigationBase();
  E.ensureWarReport(game);
  invalidateUIState();
  const mapFocused = !!canvas && document.activeElement === canvas;
  document.documentElement.style.setProperty('--own', factionUIColor(game.player));
  const e = game.economy[game.player],
    inc = E.income(game, game.player),
    cities = game.stations.filter(s => s.owner === game.player).length;
  app.innerHTML = `<header class="topbar hud-v2${hudMenuOpen ? ' hud-menu-open' : ''}"><div class="brand hud-brand" title="Knightmare Conquest"><span class="mark" aria-hidden="true">◈</span><div><h1>Knightmare Conquest</h1><small>CODE GEASS · ${game.mode === 'campaign' ? 'STORY MODE' : game.mode === 'scenario' ? 'SCENARIO' : 'WORLD WAR'}</small></div></div><div class="hud-phase" role="status" aria-label="Current turn"><strong>Turn ${game.turn}${turnLimit() ? ` / ${turnLimit()}` : ''}</strong></div><div class="resources hud-resources" role="group" aria-label="Current resources">${resource('credits', 'Credits', 'Money for production and operations', e.credits, inc.credits)}${resource('industry', 'Industry', 'Used to build and reinforce units in factories', e.industry, inc.industry)}${resource('research', 'Research', 'Progress for technology and victory rewards', e.science, inc.science)}${resource('sakuradite', 'Sakuradite', 'Strategic mineral required by advanced Knightmares', e.sakuradite || 0, inc.sakuradite || 0)}${resource('token', 'Tokens', 'HQ command tokens earned from victories', loadProfile().tokens || 0)}<div class="resource res-cities" tabindex="0" role="status" title="Cities controlled: ${cities} of ${game.stations.length}" aria-label="Cities controlled: ${cities} of ${game.stations.length}"><span class="res-city-icon" aria-hidden="true">▣</span><span class="label">Cities</span><b>${cities}</b></div></div>${hudMenus()}</header><div class="workbench"><main class="theater"><div class="theater-head"><div><span class="label">STRATEGIC THEATER</span><h2>${E.modeTitle(game)}</h2></div><button type="button" class="objective-toggle" data-action="toggle-objective" aria-label="Show or hide the objective">Objective</button><p class="objective">${E.objectiveText(game)} ${starChips()}</p></div><div class="map-wrap"><canvas id="map" tabindex="0" aria-label="World hex map. Select a unit on the map or press N. Arrow keys move the hex cursor; Enter selects. Enter moves to a green land, cyan coastal, or blue water hex, or attacks a red hex. Z undoes the last move. E ends your turn. Drag to pan; plus and minus zoom."></canvas><div class="map-tools"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="fit" title="${wraps() ? 'World overview' : 'Whole battlefield'}">${wraps() ? 'World' : 'Map'}</button><button data-action="zoom-in" aria-label="Zoom in">+</button><button data-action="home" title="Center on your capital">⌂</button><button type="button" class="minimap-toggle" data-action="toggle-minimap" aria-label="Show or hide the minimap">▦</button></div><canvas id="minimap" class="minimap" aria-label="World minimap: click to move the view"></canvas></div><div class="map-caption"><span id="map-caption">Green: land move · Cyan: coast (land + ships) · Blue: sea/embark · Red: attack</span><span>Drag to pan · Scroll to zoom · <span class="kbd">N</span> next unit · <span class="kbd">E</span> end turn</span></div></main><aside class="side" id="side"></aside><div class="selection-dock" id="selection-dock"></div></div><footer class="footer"><div class="footer-actions"><button class="small undo-button" data-action="undo" ${!interactive() || !undoStack.length ? 'disabled' : ''} title="${phaseReason() || (undoStack.length ? 'Return the last moved unit to where it started (Z)' : 'No move to undo')}">${hudLabel('↶ Undo move <span class="kbd">Z</span>', 'Undo')}</button><button class="small" data-action="next" ${!interactive() ? 'disabled' : ''}>Next unit</button><button class="small hud-all-orders" data-action="do-all-orders" ${!interactive() ? 'disabled' : ''} title="Move every eligible unit with standing orders now, and resolve group stance attacks. Each unit auto-moves at most once per turn.">${hudLabel('Do all orders now', 'Orders')}</button>${game.phase === game.player || game.over ? `<button class="primary end hud-end-turn" title="Finish your turn (E)" data-action="end" ${!interactive() ? 'disabled' : ''}>End turn</button>` : `<button class="primary end" disabled>${F(game.phase).short} turn…</button>`}</div></footer>`;
  canvas = $('map');
  ctx = canvas.getContext('2d');
  attachMap();
  attachMinimap();
  minimapDirty = true;
  updateSelection();
  if (typeof tutorialPaint === 'function') tutorialPaint();
  militaryPresentation.collect();
  if (mapFocused) canvas.focus({ preventScroll: true });
}
// Your F.L.E.I.J.A. arsenal: shown once you hold a warhead; it arms the targeting mode.

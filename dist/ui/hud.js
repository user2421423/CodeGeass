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
    aiToken++;
    game = E.createGame('britannia');
    setWorld();
    selection = null;
    undoStack = [];
    effects = [];
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
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Operation setup"><div class="eyebrow">Code Geass · WC4-inspired world conquest</div><h1>One world.<br>Three empires.</h1><p>Build a Knightmare army. Appoint your commanders. Take your rivals’ cities—a power surrenders only when its last city falls.</p><div class="choice-grid three">${cards}</div><div class="conquest-row"><div><label>Conquest · ${E.WORLD.cols} × ${E.WORLD.rows} world map</label><h3 class="conquest-title">${E.ERAS.world.name}</h3><p class="mode-note">${E.ERAS.world.desc} <b>${E.ERAS.world.rulesText}</b> Played as the ${F(setup.side).name}.${reward ? ` First win: up to ${reward} command tokens.` : ''}</p></div><button class="primary" data-action="start-conquest">Launch conquest</button></div>${campaignRow(profile)}<div class="setup-row"><div><label for="difficulty-select">Difficulty</label><select class="select" id="difficulty-select">${Object.entries(
    E.DIFFICULTIES,
  )
    .map(
      ([k, d]) =>
        `<option value="${k}" ${setup.difficulty === k ? 'selected' : ''}>${d.name}${d.tokens > 1 ? ` · ×${d.tokens} tokens` : ''}</option>`,
    )
    .join(
      '',
    )}</select><p class="mode-note">${E.DIFFICULTIES[setup.difficulty]?.desc || ''}</p></div><div class="hq-summary"><span class="label">Command HQ</span><b>${ICONS.use('token', 'cost-ico')} ${profile.tokens || 0} tokens</b><small>${profile.wins || 0} victories · ${Object.values(profile.research || {}).reduce((a, l) => a + l, 0)} research levels</small><span class="hq-buttons"><button class="small" data-action="research">HQ research</button><button class="small" data-action="generals-start">Commanders</button><button class="small" data-action="elite-forces-start">Elite Forces</button></span></div></div><div class="badge-row"><span class="badge">${Object.values(E.TYPES).filter(t => t.side !== 'neutral').length} Knightmare Frames</span><span class="badge">3 branches: Infantry · Armor · Artillery</span><span class="badge">${Object.keys(E.COMMANDERS).length} commanders · ${Object.values(E.COMMANDERS).filter(a => a.recruit).length} to recruit</span><span class="badge">${Object.keys(E.TECH_NODES).length} HQ technologies</span><span class="badge">${Object.keys(E.ELITE_FORCES).length} Elite Forces</span><span class="badge">${game.stations?.length || 149} cities</span></div><div class="dialog-footer"><div>${saved ? '<button data-action="continue">Continue saved game</button>' : ''}<button class="ghost" data-action="help">Field manual</button><button class="ghost" data-action="archive-start">Knightmare archive</button></div><small class="notice">${NOTICE}<br>Free, non-commercial fan game. Saved in this browser; a new operation replaces your saved conquest.</small></div></section></div>`;
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
  app.innerHTML = `<header class="topbar"><div class="brand"><span class="mark" aria-hidden="true">◈</span><div><h1>Knightmare Conquest</h1><small>CODE GEASS · ${game.mode === 'campaign' ? 'CAMPAIGN' : 'WORLD WAR'}</small></div></div><div class="resources">${resource('credits', 'Credits', 'Credits', e.credits, inc.credits)}${resource('industry', 'Industry', 'Industry · Knightmare factories', e.industry, inc.industry)}${resource('research', 'Research', 'Research. Banked research becomes command tokens when you win (5 research = 1 token)', e.science, inc.science)}${resource('sakuradite', 'Sakuradite', 'Sakuradite · mined at deposits; heavier Knightmares need it', e.sakuradite || 0, inc.sakuradite || 0)}${resource('token', 'Tokens', 'Command tokens · spent on HQ research, earned by winning operations', loadProfile().tokens || 0)}<div class="resource"><span class="label">Cities</span><b>${cities} <small>/ ${game.stations.length}</small></b></div></div><nav class="top-actions" aria-label="Command menus">${arsenalButton()}<button class="small" data-action="research">Research</button>${game.mode === 'campaign' ? '<button class="small" data-action="briefing">Briefing</button><button class="small ghost" data-action="archive">Units</button>' : `<button class="small" data-action="production" ${!interactive() ? `disabled title="${phaseReason()}"` : ''}>Production</button><button class="small" data-action="admirals" ${!interactive() ? `disabled title="${phaseReason()}"` : ''}>Commanders</button><button class="small ghost" data-action="archive">Units</button><button class="small ghost" data-action="elite-forces">Elite Forces</button><button class="small ghost" data-action="powers">Powers</button>`}<button class="small ghost sound-toggle" data-action="sound" aria-pressed="${SFX.enabled}" aria-label="${SFX.enabled ? 'Mute sound' : 'Unmute sound'}" title="${SFX.enabled ? 'Mute sound' : 'Unmute sound'}">${SFX.enabled ? '🔊' : '🔇'}</button><button class="small ghost" data-action="help" aria-label="Field manual">?</button><button class="small ghost" data-action="menu" ${game.phase !== game.player ? 'disabled' : ''}>Menu</button></nav></header><div class="workbench"><main class="theater"><div class="theater-head"><div><span class="label" style="color:${F(game.phase).color}">Turn ${String(game.turn).padStart(2, '0')} · ${F(game.phase).short} phase</span><h2>${E.modeTitle(game)}</h2></div><p class="objective">${E.objectiveText(game)} <b>Turn ${game.turn}${turnLimit() ? ' / ' + turnLimit() : ''}</b>${starChips()}</p></div><div class="map-wrap"><canvas id="map" tabindex="0" aria-label="World hex map. Select a unit on the map or press N. Arrow keys move the hex cursor; Enter selects. Enter moves to a green hex or attacks a red hex. Z undoes the last move. Drag to pan; plus and minus zoom."></canvas><div class="map-banner" id="map-banner">${game.phase !== game.player ? 'Rival powers are maneuvering…' : 'Select a Knightmare to reveal its movement and firing range.'}</div><div class="map-tools"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="fit" title="${wraps() ? 'World overview' : 'Whole battlefield'}">${wraps() ? 'World' : 'Map'}</button><button data-action="zoom-in" aria-label="Zoom in">+</button><button data-action="home" title="Center on your capital">⌂</button></div><canvas id="minimap" class="minimap" aria-label="World minimap: click to move the view"></canvas><div class="map-legend">${(game.mode === 'campaign' ? game.order.filter(s => s !== 'neutral') : E.MAJORS).map(s => `<span style="color:${F(s).color}"><i class="legend-dot"></i>${F(s).short}</span>`).join('')}<span style="color:#d8cfa6"><i class="legend-dot"></i>Neutral</span><span>▣ City</span></div></div><div class="map-caption"><span id="map-caption">Green hex: move · Red hex: attack · Blue sea hex: embark as a transport</span><span>Drag to pan · Scroll to zoom · <span class="kbd">N</span> next unit</span></div></main><aside class="side" id="side"></aside><div class="selection-dock" id="selection-dock"></div></div><footer class="footer"><div class="turn-status" id="turn-status"></div><div class="footer-actions"><button class="small undo-button" data-action="undo" ${!interactive() || !undoStack.length ? 'disabled' : ''} title="${phaseReason() || (undoStack.length ? 'Return the last moved unit to where it started (Z)' : 'No move to undo')}">↶ Undo move <span class="kbd">Z</span></button><button class="small" data-action="next" ${!interactive() ? 'disabled' : ''}>Next unit <span class="kbd">N</span></button>${game.phase === game.player || game.over ? `<button class="primary end" data-action="end" ${!interactive() ? 'disabled' : ''}>End turn</button>` : `<button class="primary end" data-action="skip-ai">${F(game.phase).short} turn… <span class="kbd">Skip ▶▶</span></button>`}</div></footer>`;
  canvas = $('map');
  ctx = canvas.getContext('2d');
  attachMap();
  attachMinimap();
  minimapDirty = true;
  updateSelection();
  if (mapFocused) canvas.focus({ preventScroll: true });
}
// Your F.L.E.I.J.A. arsenal: shown once you hold a warhead; it arms the targeting mode.
function arsenalButton() {
  const n = game.arsenal?.[game.player] || 0;
  if (!n) return '';
  const why = phaseReason();
  return `<button class="small fleija-button${strikeMode ? ' armed' : ''}" data-action="fleija" ${why ? `disabled title="${why}"` : `title="${strikeMode ? 'Cancel the launch' : 'Choose a target for a F.L.E.I.J.A. warhead'}"`}>F.L.E.I.J.A. ×${n}</button>`;
}
// The strategic-weapon warning, then a white-pink flash and the expanding sphere. A rival's strike has already been
// resolved by the engine; your own fires (fire()) while the warning covers the screen.
async function fleijaSequence(target, side, name, fire = null, resolved = null) {
  const alert = $('fleija-alert');
  alert.innerHTML = `<div class="fleija-box"><span class="fleija-kicker">Strategic weapon detected</span><b>F.L.E.I.J.A. warhead</b><span class="fleija-impact">Impact: ${esc(name)}</span><small>${esc(F(side).name)}</small></div>`;
  alert.hidden = false;
  alert.classList.add('show');
  SFX.play('fleija', side);
  zoom = Math.max(zoom, 3.2);
  centerOn(target);
  await pause(2000);
  const result = fire ? fire() : resolved;
  if (result?.intercepted) {
    alert.innerHTML = `<div class="fleija-box"><span class="fleija-kicker">Countermeasure engaged</span><b>F.L.E.I.J.A. eliminated</b><span class="fleija-impact">${esc(result.eliminatorCity)}</span><small>${esc(F(result.defender).name)}</small></div>`;
    await pause(1200);
    alert.classList.remove('show');
    alert.hidden = true;
    minimapDirty = true;
    render();
    return result;
  }
  if (result && !result.ok) {
    alert.classList.remove('show');
    alert.hidden = true;
    return result;
  }
  alert.classList.remove('show');
  alert.hidden = true;
  flash = 1;
  effects.push({ kind: 'fleija', to: { c: target.c, r: target.r }, life: 3.6, max: 3.6 });
  bump(30);
  minimapDirty = true;
  render();
  await pause(1700);
  return result;
}
// What a strike on p would do: units erased and crippled by side, cities hit, and whether your own are inside.
function blastSummary(p) {
  const tally = {},
    cities = [];
  let own = 0;
  for (const t of E.blastArea(game, p)) {
    const distance = E.distance(t, p, game),
      u = E.unitAt(game, t),
      s = E.stationAt(game, t);
    if (u) {
      const k = (tally[u.side] ||= { erased: 0, crippled: 0, damaged: 0 });
      k[distance === 0 ? 'erased' : distance === 1 ? 'crippled' : 'damaged']++;
      if (u.side === game.player) own++;
    }
    if (s) cities.push({ s, distance });
    if (s?.owner === game.player) own++;
  }
  return { tally, cities, own };
}
function confirmLaunch(p) {
  const { tally, cities, own } = blastSummary(p),
    name = E.targetName(game, p),
    defense = E.eliminatorDefender(game, game.player, p),
    rows = Object.entries(tally)
      .map(([side, k]) => `<li><b style="color:${F(side).color}">${F(side).short}</b> ${k.erased} erased · ${k.crippled} crippled</li>`)
      .join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow fleija-confirm" role="dialog" aria-modal="true" aria-label="Launch F.L.E.I.J.A."><div class="eyebrow">Strategic arsenal · ${game.arsenal[game.player]} warhead${game.arsenal[game.player] > 1 ? 's' : ''}</div><h2>Launch F.L.E.I.J.A. at ${esc(name)}?</h2><p>Ground zero: every unit is erased${cities.some(c => !c.ring) ? ` and ${esc(cities.find(c => !c.ring).s.name)} is destroyed for the rest of the war` : ''}${E.siteAt(game, p) || (cities.some(c => !c.ring) && E.depositOf(game, cities.find(c => !c.ring).s)) ? '; the Sakuradite deposit there will never produce again' : ''}; the land becomes a crater. The ring: units are left at ${Math.round(E.FLEIJA.ringHP * 100)}% with collapsed morale${cities.some(c => c.ring) ? `; ${cities.filter(c => c.ring).map(c => esc(c.s.name)).join(' and ')} lose${cities.filter(c => c.ring).length > 1 ? '' : 's'} all defenses and a level of every building` : ''}.</p>${rows ? `<ul class="blast-list">${rows}</ul>` : '<p class="description">No units in the blast.</p>'}${own ? `<div class="info-strip danger-strip">Your own forces are inside the blast.</div>` : ''}${defense ? `<div class="info-strip">F.L.E.I.J.A. Eliminator coverage detected from ${esc(defense.name)}. This warhead will be neutralized and consume its one defensive charge.</div>` : ''}<div class="dialog-footer"><button data-action="close">Cancel</button><button class="primary danger" data-launch="${p.c},${p.r}">Launch</button></div></section></div>`;
  focusDialog();
}
async function launchAt(p) {
  closeModal();
  strikeMode = false;
  const name = E.targetName(game, p),
    result = await fleijaSequence(p, game.player, name, () => E.launch(game, game.player, p.c, p.r));
  if (!result?.ok) {
    toast(result?.reason || 'Launch failed.');
    render();
    return;
  }
  undoStack = [];
  refreshAndSave();
  if (result.intercepted)
    toast(`F.L.E.I.J.A. Eliminator at ${result.eliminatorCity} neutralized the warhead.`, true);
  else
    toast(
      `F.L.E.I.J.A. detonation at ${name}: ${result.destroyed.length} units erased, ${result.crippled.length} crippled.${result.cities.some(c => c.destroyed) ? ` ${result.cities.find(c => c.destroyed).name} is erased.` : ''}${result.depleted?.length ? ` The ${result.depleted.join(', ')} deposit will never produce again.` : ''}${result.eliminatorUnlocked ? ` Eliminator research begins; countermeasures are available from turn ${result.eliminatorTurn}.` : ''}`,
      true,
    );
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
// Where a unit's standing order is taking it.
function gotoText(u) {
  const n = E.distance(u, u.goto, game);
  return `Heading for ${E.targetName(game, E.tile(game, u.goto.c, u.goto.r))} · ${n} hex${n === 1 ? '' : 'es'} away`;
}
// Whether the unit can be sent to a hex (null) or why not; cached because the cursor asks every frame.
let routeMemo = null;
function routeWhy(u, p) {
  const k = `${u.id}:${u.c},${u.r}:${p.c},${p.r}`;
  if (routeMemo?.k !== k) routeMemo = { k, why: E.gotoReason(game, u, p) };
  return routeMemo.why;
}
function gotoReportText(r) {
  const n = (k, one, many) => (r[k].length ? `${r[k].length} ${r[k].length === 1 ? one : many}` : null);
  return [
    n('moved', 'unit advanced', 'units advanced'),
    n('arrived', 'reached its destination', 'reached their destinations'),
    n('blocked', 'could not advance', 'could not advance'),
    n('lost', 'lost its route (order cancelled)', 'lost their routes (orders cancelled)'),
  ]
    .filter(Boolean)
    .join(', ');
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
  return `<div class="resource res-${icon}" title="${title}${rate}">${ICONS.use(icon, 'res-icon')}<span class="label">${label}</span><b>${count(value)} ${perTurn == null ? '' : `<small>+${perTurn}/turn</small>`}</b></div>`;
}
// Costs render as WC4 resource tokens; zero amounts are omitted unless all is set.
// Prices (not balances, which pass all) turn red for each resource the player cannot cover.
function costHTML(c, all = false) {
  const have = game?.economy?.[game.player] || {},
    parts = [
      ['credits', c.credits, 'credits'],
      ['industry', c.industry, 'industry'],
      ['research', c.science, 'science'],
      ['sakuradite', c.sakuradite, 'sakuradite'],
    ].filter(([, v]) => v != null && (all || v > 0));
  return `<span class="cost-line">${parts.map(([k, v, f]) => `<span class="cost-item${!all && v > (have[f] || 0) ? ' short' : ''}">${ICONS.use(k, 'cost-ico')}${count(v)}</span>`).join('')}</span>`;
}
function statRow(u, t) {
  const range = rangeText(u),
    s = E.unitStats(game, u);
  return `<span class="stat" title="Attack">${ICONS.use('atk')}${s.attack}</span><span class="stat" title="Armor">${ICONS.use('def')}${s.armor}</span><span class="stat" title="Movement">${ICONS.use('mov')}${E.atSea(game, u) ? E.seaMove(game, u) : s.move}</span><span class="stat" title="Range">${ICONS.use('rng')}${range}</span>`;
}
// A unit's display name: a commander's signature frame shows on super-heavy units, as LOGH flagships did.
function unitName(u) {
  const a = C(u.cmd),
    t = E.TYPES[u.type];
  return u.elite ? t.name : a && t.cls === 'super' ? a.hull : t.name;
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
  if (deploying && deploying.ship !== u?.id) deploying = null;
  if (routing && (routing !== u?.id || !interactive())) routing = null;
  readyCache =
    u && u.side === game.player && !routing
      ? deploying
        ? new Map(E.deployTargets(game, u).map(t => [E.key(t), 0]))
        : E.reachable(game, u)
      : new Map();
  const st = selectedStation();
  targetCache = new Set(
    !deploying && !routing && u && u.side === game.player && !u.attacked && u.morale > -3
      ? E.targets(game, u).map(E.key)
      : st && st.owner === game.player && interactive()
        ? E.fortressTargets(game, st).map(E.key)
        : [],
  );
  minimapDirty = true;
  // Never open a sidebar for an empty selection or a terrain hex.
  // City/mine details and the carrier cargo picker are the only allowed drawers.
  const showSide = u
    ? carrierHoldOpen === u.id && E.TYPES[u.type].naval === 'ship'
    : Boolean(detailOpen && (st || selectedSite()));
  $('side').innerHTML = showSide
    ? '<button class="drawer-close small" data-action="details" aria-label="Close information panel">×</button>' + panel()
    : '';
  $('side').classList.toggle('open', showSide);
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
        : strikeMode
          ? 'F.L.E.I.J.A. armed · choose a target hex · Escape cancels'
          : routing
            ? `Standing orders · click the hex ${unitName(u)} should head for · Escape cancels`
            : u?.side === game.player
            ? `${u.cmd ? C(u.cmd).short + ' · ' : ''}${unitName(u)} ×${u.stack}${E.atSea(game, u) ? ' · Embarked' : ''}${u.morale <= -3 ? ' · In confusion' : !hasOrders(u) ? ' · Orders complete' : ''}`
            : selectedStation()
              ? `${selectedStation().name} · ${selectedStation().owner === game.player ? 'Open the factory to build Knightmares' : 'Break its defenses before capture'}`
              : selectedSite()
                ? `${selectedSite().name} · Sakuradite mine · ${selectedSite().owner === game.player ? 'Upgrade its refinery to extract more' : 'Move Infantry or Armor onto it to seize it'}`
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
// A city destroyed by F.L.E.I.J.A. stays on the map as ruins for the rest of the conquest (game.ruins).
function ruinText(p, cls = '') {
  const ruin = game.ruins?.find(x => x.c === p.c && x.r === p.r);
  return ruin
    ? `<p class="${cls}">Ruins of ${esc(ruin.name)}, a ${F(ruin.owner).short} city destroyed by F.L.E.I.J.A. on turn ${ruin.turn}. It cannot be captured or rebuilt in this war.</p>`
    : '';
}
// A Sakuradite deposit's output: base, extraction at its refinery level, and the yield per turn.
function depositBox(d) {
  const y = E.depositYield(game, d);
  return `<div class="target-box deposit-box"><span class="label">${ICONS.use('sakuradite', 'cost-ico')} Sakuradite deposit</span><h3>${esc(d.name)}</h3><p>Base output ${d.base} a turn · refinery level ${y.level} extracts ${Math.round(y.rate * 100)}%.</p><p><b>+${y.sakuradite} Sakuradite${y.credits ? ` · +${y.credits} credits` : ''} a turn</b></p>${allocationText(d)}</div>`;
}
// A Japanese deposit's output is shared among the powers (E.depositShares).
function allocationText(d) {
  const shares = Object.entries(E.depositShares(game, d));
  if (shares.length < 2) return '';
  return `<p>International allocation: ${shares.map(([side, n]) => `${F(side).short} +${Math.round(n * 10) / 10}`).join(' · ')}.</p>`;
}
function refineryRow(host, attrs, why) {
  const l = host.refinery || 0;
  return `<div class="building"><span class="label">${ICONS.use('refinery')} ${E.BUILDINGS.refinery.name}</span><span class="level">${'▮'.repeat(l)}${'▯'.repeat(3 - l)}</span><small>${E.BUILDINGS.refinery.desc}</small>${attrs ? act(attrs, l >= 3 ? 'Maximum level' : (l ? 'Upgrade to level ' : 'Build level ') + (l + 1), l >= 3 ? null : why, costHTML(E.buildCost(host, 'refinery')), 'small') : ''}</div>`;
}
function panel() {
  const u = selectedUnit(), s = selectedStation(), m = selectedSite();
  // Unit commands are bottom-only. Carrier hold is the one focused unit drawer.
  if (u) return carrierHoldOpen === u.id && E.TYPES[u.type].naval === 'ship'
    ? `<section class="deployment-only"><h2>Deploy Knightmares</h2>${holdHTML(u)}</section>`
    : '';
  let main = '';
  if (m) {

    const ours = m.owner === game.player;
    main = `<section><div class="side-title"><span class="label">Sakuradite mine</span><span class="chip" style="color:${F(m.owner).color}">${F(m.owner).short}</span></div><div class="mine-art">${ART.building('mine', 'mine-photo') || ICONS.use('sakuradite', 'mine-icon')}</div><h2 class="unit-name">${esc(m.name)}</h2><p class="description">${m.base >= 30 ? 'The richest Sakuradite deposit on Earth. ' : ''}A mine has no defenses: move an Infantry or Armor unit onto it to seize it. Artillery cannot capture.</p>${depositBox(m)}<div class="buildings">${refineryRow(m, ours ? `data-refine="${m.id}"` : '', phaseReason() || E.refineReason(game, m))}</div></section>`;
  } else if (s) {
    const ours = s.owner === game.player,
      deposit = E.depositOf(game, s),
      yields = E.cityYield(game, s);
    main = `<section><div class="side-title"><span class="label">${s.capital ? 'Capital' : s.fort ? 'Fortress city' : 'City'}</span><span class="chip" style="color:${F(s.owner).color}">${F(s.owner).short}</span></div>${ART.city(cityKind(s), s.owner, 'panel-ship')}<h2 class="unit-name">${s.name}</h2><p class="description">${s.capitalOf && E.alive(game, s.capitalOf) && s.owner === s.capitalOf ? `Capital of the ${F(s.owner).name}. If it falls, the whole power surrenders.` : s.fort ? 'Fortified city with a battery covering 3 hexes.' : 'Capture and hold cities to fund your army.'}</p><div class="hp-row"><span>City defenses</span><span class="mono">${Math.ceil(s.shield)} / ${s.maxShield}</span></div><div class="bar"><i style="width:${(s.shield / s.maxShield) * 100}%;background:${F(s.owner).color}"></i></div><div class="stat-grid"><div><span class="label">${ICONS.use('credits')} Credits</span><b>+${yields.credits}</b></div><div><span class="label">${ICONS.use('industry')} Industry</span><b>+${yields.industry}</b></div><div><span class="label">${ICONS.use('research')} Research</span><b>+${yields.science}</b></div>${deposit ? `<div><span class="label">${ICONS.use('sakuradite')} Sakuradite</span><b>+${yields.sakuradite}</b></div>` : ''}</div>${deposit ? depositBox(deposit) : ''}${projectPanel(s)}${fortressPanel(s)}<div class="buildings">${Object.entries(
      E.BUILDINGS,
    )
      .filter(([k]) => (k !== 'refinery' || deposit) && (k !== 'port' || E.portSite(game, s)))
      .map(([k, b]) => {
        const l = E.buildingLevel(s, k);
        return `<div class="building"><span class="label">${k === 'port' ? '⚓' : ICONS.use(k === 'factory' ? 'factory' : k === 'lab' ? 'research' : 'refinery')} ${b.name}</span>${k === 'port' && l && s.portOwner !== s.owner ? `<small class="warn-text">Held by the ${esc(F(s.portOwner).short)} fleet: clear its ships out to use the port.</small>` : ''}<span class="level">${'▮'.repeat(l)}${'▯'.repeat(3 - l)}</span><small>${b.desc}</small>${ours ? act(`data-build="${k}" data-station-id="${s.id}"`, l >= 3 ? 'Maximum level' : (l ? 'Upgrade to level ' : 'Build level ') + (l + 1), l >= 3 ? null : phaseReason() || E.buildReason(game, s, k), costHTML(E.buildCost(s, k)), 'small') : ''}</div>`;
      })
      .join(
        '',
      )}</div>${ours ? `${cityAutomationPanel(s)}<div class="actions">${act(`data-shop="${s.id}"`, 'Open factory', shipyardReason(s), 'Build a Knightmare unit', 'primary')}</div><p class="description">One unit per city per turn. New units act next turn. Garrisons repair 8% of their frame here each turn.</p>` : '<p class="description">Reduce its defenses to zero and destroy any garrison, then move an Infantry or Armor unit in to capture it. Artillery cannot capture.</p>'}</section>`;
  }
  return main;
}
// A Carrier-Battleship's hold: each formation aboard launches onto an empty land hex next to the ship.
function holdHTML(u) {
  const t = E.TYPES[u.type];
  if (t.naval !== 'ship') return '';
  const cargo = u.cargo || [],
    ours = u.side === game.player,
    rows = cargo
      .map(
        (c, i) =>
          `<div class="building"><span class="label">${c.cmd ? esc(C(c.cmd).short) + ' · ' : ''}${esc(E.TYPES[c.type].short)} ×${c.stack}</span><small>${Math.round(c.hp)} / ${E.maxHP(c)} HP</small>${ours ? act(`data-deploy="${i}"`, deploying?.ship === u.id && deploying.index === i ? 'Choose a green hex' : 'Launch', E.deployReason(game, u, i), 'Rapid KMF Deployment: lands with a full move and attack') : ''}</div>`,
      )
      .join('');
  const capacity = E.carrierCapacity(game, u);
  return `<div class="section-divider"><span class="label">Hold · ${cargo.length} / ${capacity} formations</span>${rows || '<p class="description">Empty. Move a Knightmare onto the carrier to board it; boarding ends its turn.</p>'}<p class="description">A launched Knightmare lands on an empty land hex next to the ship with a full move and attack, even if it boarded this turn. If the carrier sinks, everything aboard is lost.</p></div>`;
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
    (!E.recruitOptions(game, s, game.player).length && !(s.portAt && E.recruitOptions(game, s, game.player, E.NAVAL[game.player]?.amphibious).length)
      ? 'A unit is on the city'
      : null)
  );
}
// Strategic projects at a city: F.L.E.I.J.A. offense and the one-charge Eliminator defense.
function projectPanel(s) {
  const ours = s.owner === game.player,
    p = s.project,
    ep = s.eliminatorProject;
  if (p) {
    const left = Math.max(0, p.ready - game.turn);
    return `<div class="target-box fleija-panel"><span class="label">${ours ? 'F.L.E.I.J.A. project' : 'Intelligence'}</span><h3>${ours ? 'Warhead under construction' : 'Strategic weapons research detected'}</h3><p>${ours ? 'Ready' : 'Completes'} on turn ${p.ready} (${left} turn${left === 1 ? '' : 's'}). ${ours ? 'The city builds nothing else meanwhile; if it is captured, the project is lost.' : 'Capture the city to stop it.'}</p></div>`;
  }
  if (ep) {
    const left = Math.max(0, ep.ready - game.turn);
    return `<div class="target-box fleija-panel"><span class="label">${ours ? 'F.L.E.I.J.A. Eliminator' : 'Intelligence'}</span><h3>${ours ? 'Countermeasure under construction' : 'Eliminator development detected'}</h3><p>${ours ? 'Ready' : 'Completes'} on turn ${ep.ready} (${left} turn${left === 1 ? '' : 's'}). It will neutralize one incoming warhead aimed within ${E.ELIMINATOR.range} hexes of this city.</p></div>`;
  }
  const blocks = [];
  if (s.eliminator)
    blocks.push(`<div class="target-box fleija-panel"><span class="label">${ours ? 'F.L.E.I.J.A. Eliminator' : 'Intelligence'}</span><h3>Eliminator charge ready</h3><p>Automatically neutralizes the next incoming F.L.E.I.J.A. aimed within ${E.ELIMINATOR.range} hexes of ${esc(s.name)}. One use.</p></div>`);
  if (!ours) return blocks.join('');
  if (E.hasFleija(game, game.player))
    blocks.push(`<div class="target-box fleija-panel"><span class="label">F.L.E.I.J.A.</span><h3>Build a warhead</h3><p>${E.FLEIJA.turns} turns in a city with a level-${E.FLEIJA.lab} research lab. Every power is alerted when work begins.</p>${act(`data-project="${s.id}"`, 'Begin warhead project', phaseReason() || E.projectReason(game, s), costHTML(E.FLEIJA.cost))}</div>`);
  if (E.eliminatorTurn(game) != null && !s.eliminator)
    blocks.push(`<div class="target-box fleija-panel"><span class="label">F.L.E.I.J.A. Eliminator</span><h3>Build a defensive charge</h3><p>${E.ELIMINATOR.turns} turns · protects targets within ${E.ELIMINATOR.range} hexes of this city · one interception. Up to ${E.ELIMINATOR.max} charges per power at once, one per city.</p>${act(`data-eliminator="${s.id}"`, 'Begin Eliminator project', phaseReason() || E.eliminatorReason(game, s), costHTML(E.ELIMINATOR.cost))}</div>`);
  return blocks.join('');
}
function automationUnitOptionsHTML(s, selected) {
  const options = E.automationUnitOptions(game, s);
  return [
    '<option value="">Off — manual production</option>',
    ...options.map(id => {
      const t = E.TYPES[id],
        kind = t.naval ? 'Naval' : t.branch,
        req = t.naval ? `Port ${t.port}` : `Factory ${t.tier}`;
      return `<option value="${id}" ${selected === id ? 'selected' : ''}>${esc(t.name)} · ${esc(kind)} · ${req}</option>`;
    }),
  ].join('');
}
function automationReportText(r) {
  if (!r) return '';
  const parts = [
    `${r.units || 0} unit${r.units === 1 ? '' : 's'} produced`,
    `${r.upgrades || 0} building upgrade${r.upgrades === 1 ? '' : 's'}`,
    `${count(r.spent?.credits || 0)} credits`,
    `${count(r.spent?.industry || 0)} industry`,
  ];
  if (r.spent?.sakuradite) parts.push(`${count(r.spent.sakuradite)} Sakuradite`);
  return parts.join(' · ');
}
function cityAutomationPanel(s) {
  if (game.mode !== 'conquest' || s.owner !== game.player) return '';
  const a = E.automationState(game),
    unit = E.cityAutomation(game, s).unit,
    t = unit ? E.TYPES[unit] : null,
    stack = t?.naval === 'ship' ? 1 : a.stack,
    why = unit ? E.buyReason(game, s, unit, stack) : null,
    status = !unit
      ? 'No automatic unit queued for this city.'
      : why
        ? `Queued: ${t.name} ×${stack}. Waiting: ${why}.`
        : `Queued: ${t.name} ×${stack}. Ready for the next automation run.`;
  return `<div class="target-box"><span class="label">Auto-produce each turn</span><select class="select" data-city-unit="${s.id}" ${!interactive() ? 'disabled' : ''}>${automationUnitOptionsHTML(s, unit)}</select><small>${esc(status)}</small>${unit ? `<small>Current cost: ${costHTML(E.price(unit, stack, game, game.player))}. Formation size and resource reserves come from Production Command.</small>` : ''}<small>${a.enabled ? 'Runs after income is collected at the start of your turn.' : 'Automation is currently off globally. The queue will wait until Production Command is enabled.'}</small></div>`;
}
function productionDialog() {
  if (game.mode !== 'conquest') return;
  const a = E.automationState(game),
    owned = game.stations.filter(s => s.owner === game.player),
    queued = owned.map(s => ({ s, unit: E.cityAutomation(game, s).unit })).filter(x => x.unit),
    countsByUnit = {};
  for (const { unit } of queued) countsByUnit[unit] = (countsByUnit[unit] || 0) + 1;
  const summary =
    Object.entries(countsByUnit)
      .sort((a, b) => b[1] - a[1] || E.TYPES[a[0]].name.localeCompare(E.TYPES[b[0]].name))
      .slice(0, 8)
      .map(([id, n]) => `${E.TYPES[id].short} ${n}`)
      .join(' · ') || 'No city queues configured';
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Production Command"><div class="dialog-head"><div><div class="eyebrow">Conquest logistics</div><h2>Production Command</h2><p>Each city now has one simple automation choice: the exact unit it should try to produce every turn. Building upgrades and reserves stay under global command here.</p></div><button class="small close" data-action="close">Close</button></div><div class="brief-grid"><div><div class="brief-block"><span class="label">Master automation</span><label class="auto-check"><input type="checkbox" data-automation-field="enabled" ${a.enabled ? 'checked' : ''}> Run configured city queues at the start of every player turn</label><label class="auto-check"><input type="checkbox" data-automation-field="autoUpgrade" ${a.autoUpgrade ? 'checked' : ''}> Auto-upgrade buildings globally</label><p class="mode-note">If a queued unit needs a higher factory or port, automatic upgrades prioritize that requirement first. Otherwise upgrades follow the normal economic order.</p></div><div class="brief-block"><span class="label">City production queues</span><p><b>${queued.length} / ${owned.length}</b> owned cities currently have an automatic unit selected.</p><p class="mode-note">${esc(summary)}</p><div class="actions"><button class="ghost" data-action="automation-clear-cities">Clear all auto-production queues</button></div></div><div class="brief-block"><span class="label">Formation size</span><select class="select" data-automation-field="stack">${[1,2,3].map(n => `<option value="${n}" ${a.stack === n ? 'selected' : ''}>${n} frame${n > 1 ? 's' : ''} per automatic land/amphibious unit</option>`).join('')}</select><p class="mode-note">Carrier-Battleships are always built one at a time. Automation never deploys Elite Forces or starts F.L.E.I.J.A./Eliminator projects.</p></div></div><div><div class="brief-block"><span class="label">Protected resource reserve</span><p>Automatic and bulk purchases are skipped if they would leave you below these values.</p><div class="stat-grid"><label><span class="label">Credits</span><input class="select" type="number" min="0" step="50" value="${a.reserve.credits}" data-automation-reserve="credits"></label><label><span class="label">Industry</span><input class="select" type="number" min="0" step="25" value="${a.reserve.industry}" data-automation-reserve="industry"></label><label><span class="label">Sakuradite</span><input class="select" type="number" min="0" step="5" value="${a.reserve.sakuradite}" data-automation-reserve="sakuradite"></label></div><div class="actions"><button data-action="automation-fleija-reserve">Protect one F.L.E.I.J.A. budget</button></div></div><div class="brief-block"><span class="label">Bulk construction now</span><p>Upgrade one level of the selected building in every eligible city, stopping at the reserve.</p><div class="actions"><button data-bulk-build="factory" ${!interactive() ? 'disabled' : ''}>Factories</button><button data-bulk-build="lab" ${!interactive() ? 'disabled' : ''}>Labs</button><button data-bulk-build="refinery" ${!interactive() ? 'disabled' : ''}>Refineries</button><button data-bulk-build="port" ${!interactive() ? 'disabled' : ''}>Ports</button></div></div>${a.lastReport ? `<div class="brief-block"><span class="label">Last logistics report · turn ${a.lastReport.turn}</span><p>${esc(automationReportText(a.lastReport))}</p></div>` : ''}</div></div><div class="dialog-footer"><small class="notice">Choose each city's exact auto-produced unit from that city's panel. If it is temporarily unavailable, the queue waits rather than substituting another frame.</small><div><button data-action="automation-run" ${!interactive() ? 'disabled' : ''}>Run configured production now</button><button class="primary" data-action="close">Done</button></div></div></section></div>`;
  focusDialog();
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
  return `${info.name} · ${info.desc}${t.terrain !== 'sea' && t.terrain !== 'peak' ? ' Float units ignore movement costs.' : ''}${owner}`;
}
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
function dockHTML() {
  const u = selectedUnit(),
    s = selectedStation();
  if (u) {
    const t = E.TYPES[u.type],
      a = C(u.cmd),
      ours = u.side === game.player,
      canUndo = ours && interactive() && undoStack.at(-1)?.unitId === u.id,
      under = E.stationAt(game, u);
    return `<div class="dock-visual">${ART.unit(u.type, '', u.side)}${a ? generalPortrait(u.cmd, 'dock-portrait', !!u.personal) : ''}<span class="faction-flag ${u.side}">${F(u.side).letter}</span></div><div class="dock-unit"><span class="label">${a ? a.short + ' · ' : ''}${t.branch} · ×${u.stack}${E.atSea(game, u) ? ' · Embarked' : ''}</span><strong>${unitName(u)}</strong><div class="dock-stats">${ICONS.hp(u.hp, E.maxHP(u))}${statRow(u, t)}</div><p>${Math.ceil(u.hp)} / ${E.maxHP(u)} frame · ${moraleName(u.morale)}${ours ? ' · ' + fireStatus(u) : ''}</p>${ours && u.goto ? `<p class="goto-line">⚑ ${esc(gotoText(u))}</p>` : ''}</div><div class="dock-actions unit-dock-actions">${canUndo ? '<button class="small undo-button" data-action="undo">↶ Undo</button>' : ''}${under ? `<button class="small" data-station="${under.id}" title="Select the city under this unit (or click the unit again)">City: ${esc(under.name)}</button>` : ''}${ours && t.naval === 'ship' ? '<button class="small" data-action="carrier-deploy">Deploy units</button>' : ours && !u.cmd ? '<button class="small" data-action="assign">Assign</button>' : ''}${ours && a?.action ? act('data-action="feint"', a.action.name, phaseReason() || E.feintReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="goto"', routing === u.id ? 'Choose a hex…' : u.goto ? 'Change destination' : 'Set destination', phaseReason(), '', 'small', false) : ''}${ours && u.goto ? act('data-action="goto-cancel"', 'Stop auto-move', phaseReason(), '', 'small ghost', false) : ''}${ours && !u.elite ? act('data-action="reinforce"', 'Add frame', phaseReason() || E.reinforceReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="repair"', 'Repair', phaseReason() || E.repairReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="wait"', 'Hold', phaseReason() || (u.attacked ? 'Already fired' : null), '', 'small ghost', false) : ''}</div>`;
  }
  if (s) {
    const ours = s.owner === game.player,
      y = E.cityYield(game, s);
    return `<div class="dock-visual">${ART.city(cityKind(s), s.owner)}<span class="faction-flag ${s.owner}">${F(s.owner).letter}</span></div><div class="dock-unit"><span class="label">${s.capital ? 'Capital' : s.fort ? 'Fortress city' : 'City'} · Factory ${s.tier}</span><strong>${s.name}</strong><div class="dock-health"><div class="bar"><i style="width:${(s.shield / s.maxShield) * 100}%"></i></div><span>${Math.ceil(s.shield)} / ${s.maxShield} DEF</span></div><p>Income +${y.credits} &nbsp; Industry +${y.industry}${E.depositOf(game, s) ? ` &nbsp; Sakuradite +${y.sakuradite}` : ''}</p></div><div class="dock-actions">${ours ? act(`data-shop="${s.id}"`, 'Factory', shipyardReason(s), '', 'primary') : ''}<button class="small" data-action="details">City details</button></div>`;
  }
  const m = selectedSite();
  if (m) {
    const y = E.depositYield(game, m);
    return `<div class="dock-visual mine-visual">${ART.building('mine', 'dock-mine') || ICONS.use('sakuradite', 'dock-mine')}<span class="faction-flag ${m.owner}">${F(m.owner).letter}</span></div><div class="dock-unit"><span class="label">Sakuradite mine · Refinery ${y.level}</span><strong>${esc(m.name)}</strong><p>+${y.sakuradite} Sakuradite${y.credits ? ` · +${y.credits} credits` : ''} a turn · base ${m.base}</p></div><div class="dock-actions"><button class="small" data-action="details">Mine details</button></div>`;
  }
  const tileChoice = selection?.kind === 'tile' ? E.tile(game, selection.c, selection.r) : null;
  if (tileChoice) {
    const info = E.TERRAIN[tileChoice.terrain],
      owner = tileChoice.owner ? F(tileChoice.owner) : null;
    return `<div class="dock-idle terrain-dock"><span class="label">Terrain · Hex ${tileChoice.c}, ${tileChoice.r}</span><strong>${esc(info.name)}</strong><p>${esc(info.desc)}${owner ? ` · ${esc(owner.short)} territory.` : ''}</p>${ruinText(tileChoice)}</div>`;
  }
  return `<div class="dock-idle"><span class="label">Army command</span><strong>Select a unit or city</strong><p>Click a Knightmare to move and attack. Click a city to build.</p></div><div class="dock-actions"><button class="small" data-action="next">Select a ready unit</button></div>`;
}

function phaseReason() {
  return uiActionBusy ? 'Strategic weapon resolving' : game.over ? 'Operation over' : game.phase !== game.player ? `${F(game.phase).short} turn` : null;
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
  const k = `${uiStateRevision}:${u.id}:${u.c},${u.r}:${p.c},${p.r}`;
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
let fireStatusMemo = new Map(), fireStatusRevision = -1;
function fireStatus(u) {
  if (E.atSea(game, u)) return 'Embarked · cannot fire';
  if (u.attacked) return 'Already fired';
  if (u.morale <= -3) return 'Confused · cannot act';
  if (fireStatusRevision !== uiStateRevision) { fireStatusMemo.clear(); fireStatusRevision = uiStateRevision; }
  if (!fireStatusMemo.has(u.id)) fireStatusMemo.set(u.id, E.targets(game, u).length);
  if (u.side === game.player && !fireStatusMemo.get(u.id)) return 'No target in range';
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
// Costs render as resource tokens; zero amounts are omitted unless all is set.
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
let readyIds = new Set(), readyRevision = -1, selectionCacheKey = null;
function hasOrders(u) {
  return game.phase === game.player ? readyIds.has(u.id) : !u.attacked;
}
function updateSelection() {
  if (readyRevision !== uiStateRevision) {
    readyIds = new Set(
      ownUnits()
        .filter(u => E.hasOrders(game, u))
        .map(u => u.id),
    );
    readyRevision = uiStateRevision;
  }
  const u = selectedUnit();
  if (deploying && deploying.ship !== u?.id) deploying = null;
  if (routing && (routing !== u?.id || !interactive())) routing = null;
  const st = selectedStation();
  const cacheKey = `${uiStateRevision}:${selection?.kind}:${selection?.id}:${routing}:${deploying?.ship}:${interactive()}`;
  if (selectionCacheKey !== cacheKey) {
    readyCache =
      u && u.side === game.player && interactive() && !routing
        ? deploying
          ? new Map(E.deployTargets(game, u).map(t => [E.key(t), 0]))
          : E.reachable(game, u)
        : new Map();
    targetCache = new Set(
      interactive() && !deploying && !routing && u && u.side === game.player && !u.attacked && u.morale > -3
        ? E.targets(game, u).map(E.key)
        : st && st.owner === game.player && interactive()
          ? E.fortressTargets(game, st).map(E.key)
          : [],
    );
    selectionCacheKey = cacheKey;
  }
  if (typeof requestMapFrame === 'function') requestMapFrame();
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
  // AI playback and async game-state changes are not necessarily user input events.
  if (typeof requestMapFrame === 'function') requestMapFrame();
}

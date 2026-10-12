const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const nodes = new Map();
const events = {};
const eventListeners = {};
const storage = {};
const registered = [];

const drawContext = new Proxy({}, {
  get: (o, p) =>
    p === 'createRadialGradient' || p === 'createLinearGradient'
      ? () => ({ addColorStop() {} })
      : p === 'measureText'
        ? () => ({ width: 40 })
        : o[p] || (() => {}),
  set: (o, p, v) => ((o[p] = v), true),
});

function node(id) {
  if (!nodes.has(id)) {
    const n = {
      id,
      innerHTML: '',
      textContent: '',
      value: '',
      clientWidth: 210,
      style: { setProperty() {} },
      classList: { add() {}, remove() {}, toggle() {} },
      dataset: {},
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      getBoundingClientRect() { return { width: 1280, height: 760, left: 0, top: 0 }; },
      getContext() { return drawContext; },
      setPointerCapture() {},
      focus() {},
    };
    Object.defineProperty(n, 'children', { get: () => (n.innerHTML ? [{}] : []) });
    nodes.set(id, n);
  }
  return nodes.get(id);
}

let serial = 0;
const document = {
  getElementById: node,
  documentElement: node('root'),
  body: node('body'),
  addEventListener: (k, fn) => {
    (eventListeners[k] ||= []).push(fn);
    events[k] = event => eventListeners[k].forEach(listener => listener(event));
  },
  querySelectorAll() { return []; },
  createElement: () => node('scratch-' + serial++),
  modelContext: { registerTool: t => registered.push(t) },
};

const env = {
  document,
  // Node's vm sandbox does not expose browser atob or Node Buffer.
  // Scenarios decode the same packed landmask with atob in real browsers.
  atob: value => Buffer.from(value, 'base64').toString('latin1'),
  localStorage: {
    getItem: k => storage[k] ?? null,
    setItem: (k, v) => (storage[k] = String(v)),
  },
  setTimeout: fn => { fn(); return 1; },
  clearTimeout() {},
  requestAnimationFrame() {},
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: true }),
  console,
  structuredClone,
  Date,
  Math,
  JSON,
  Promise,
};
env.window = env;

const context = vm.createContext(env);
const scripts = [
  ...fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g),
].map(m => m[1]);
assert(scripts.length > 0 && scripts.at(-1) === 'game.js', 'index.html must load the game scripts');

for (const file of scripts) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist', file), 'utf8'), context);
}

const run = code => vm.runInContext(code, context);
const modal = () => node('modal-root').innerHTML;

(async () => {
  assert(modal().includes('One world.'), 'start menu renders');
  // 2018 alone shows the U.F.N. standard, keeping its existing portrait.
  run("setup.conquest = 'ufn2018'; setup.side = 'cf'; startMenu();");
  const ufnCard = modal().split('<button class="faction cf ufn-2018')[1]?.split('</button>')[0];
  assert(ufnCard, 'U.F.N. selection card renders in 2018');
  assert(ufnCard.includes('class="ufn-start-flag"'), '2018 card shows dedicated flag');
  assert(ufnCard.includes('United Federation of Nations flag'), 'correct U.F.N. standard is shown');
  assert(ufnCard.includes('class="portrait-art'), 'existing commander portrait remains visible');
  assert(ufnCard.includes('Black Knights Knightmares'), '2018 U.F.N. unit roster described correctly');
  assert.equal((modal().match(/class="ufn-start-flag"/g) || []).length, 1, 'only the U.F.N. card has the flag');
  run("setup.conquest = 'world'; setup.side = 'britannia'; startMenu();");
  assert(!modal().includes('class="ufn-start-flag"'), '2017 selection menu has no U.F.N. flag');
  assert(modal().includes('The Vermillion Forbidden City'), '2017 Chinese Federation is unchanged');
  assert(run('GEOGRAPHY.shapes.land.length') >= 1000, 'unified global atlas has detailed land outlines');
  assert.equal(run('GEOGRAPHY.shapes.water.length'), 0, 'no inland water shapes are painted');
  // Regression for the long outlined artefact crossing the Red Sea: only a
  // short geographically clipped Suez Canal may be painted by hand. Natural
  // waterways must come from GSHHG and not from decorative polylines.
  const geographicPainter = fs.readFileSync(path.join(__dirname, '../dist/ui/geography.js'), 'utf8');
  assert(!geographicPainter.includes('NAVIGABLE_WATERWAYS'), 'remove manually outlined sea-route overlays');
  assert(!geographicPainter.includes('paintWaterways('), 'no legacy double-stroked waterway painter');
  assert(geographicPainter.includes('clipPath(ctx, landClip)'),
    'Suez canal cut must be clipped to geographic land only');
  assert(geographicPainter.includes('if (!overview) paintSuezCanal('),
    'short Suez canal stays a detailed-zoom feature');

  assert.equal(run('GEOGRAPHY.shapes.patches'), undefined, 'no separately coloured regional coastline patches');

  // Regression for the empty Path2D at the smallest zoom level.
  class TestPath2D {
    constructor() { this.points = 0; }
    moveTo() { this.points++; }
    lineTo() { this.points++; }
    closePath() {}
    addPath(p) { this.points += p.points; }
  }
  let overviewLandFills = 0;
  const paintContext = new Proxy({
    fill(p) { if (p instanceof TestPath2D && p.points > 0) overviewLandFills++; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  }, { get: (o, k) => o[k] || (() => {}) });
  const tinyLand = [[[0, 28], [8, 28], [8, 35], [0, 35]]];
  const makeAtlas = new Function('R', 'SQ', 'WORLD_W', 'WORLD_H', 'Path2D', 'GEOGRAPHY_SHAPES', 'E', 'document',
    fs.readFileSync(path.join(__dirname, '../dist/ui/geography.js'), 'utf8') + '\nreturn GEOGRAPHY;');
  const atlas = makeAtlas(43, Math.sqrt(3), Math.sqrt(3) * 43 * 180, 43 * (1.5 * 75 + 2), TestPath2D,
    { land: tinyLand, water: [], biomes: [] }, { FACTIONS: {}, adjacent: () => [] },
    { createElement: () => ({ getContext: () => paintContext }) });
  const emptyHexes = Array.from({ length: 180 * 76 }, (_, i) => ({ c: i % 180, r: Math.floor(i / 180), terrain: 'sea', owner: null }));
  atlas.paint(paintContext, { wrap: true, cols: 180, rows: 76, tiles: emptyHexes },
    0, 43 * Math.sqrt(3) * 180, 0, 43 * 1.5 * 76, 0.12);
  assert(overviewLandFills > 0, 'maximum zoom-out must draw land with Path2D.addPath');
  const point = (lon,lat) => [
    (lon + 180) * Math.sqrt(3) * 43 / 2 + 43 - Math.sqrt(3) * 43 / 2,
    43 + (74 - lat) * 1.5 * 43 * 75 / 128,
  ];
  const landPoint = point(4, 32), seaPoint = point(15, 32);
  assert.equal(atlas.visualLandAt(...landPoint), true, 'actual GSHHG land classification is accessible');
  assert.equal(atlas.visualLandAt(...seaPoint), false, 'visual shoreline excludes the surrounding sea');
  assert.equal(atlas.visualLandAt(landPoint[0] + Math.sqrt(3) * 43 * 180, landPoint[1]), true,
    'visual land classification respects horizontal world wrap');
  assert.equal(typeof atlas.visualMixedHex, 'function', 'coastal hex visual mixing is queryable');
  assert.equal(atlas.visualMixedHex(-1, 14), false, 'out-of-range queries are harmless');
  assert.equal(atlas.visualMixedHex(87, 14), false,
    'mock atlas without Cornwall is not accidentally marked mixed');


  // Geography is visually interpolated separately from the immutable tactical hex map.
  assert.equal(run(`(() => { const t = game.tiles.find(t => t.terrain !== 'sea'); const p = hexCenter(t); return GEOGRAPHY.sample(game, p.x, p.y); })()`), 1, 'land remains land at its gameplay hex centre');
  assert.equal(run(`(() => { const t = game.tiles.find(t => t.terrain === 'sea'); const p = hexCenter(t); return GEOGRAPHY.sample(game, p.x, p.y); })()`), 0, 'sea remains sea at its gameplay hex centre');
  assert(run(`(() => { const t = game.tiles.find(t => t.terrain !== 'sea'); const p = hexCenter(t); return Math.abs(GEOGRAPHY.sample(game, p.x, p.y) - GEOGRAPHY.sample(game, p.x + WORLD_W, p.y)); })()`) < 1e-8, 'world atlas wraps without a seam');

  // Real GIS contours: Indonesian islands must use Federation gameplay
  // ownership, not a neutral/Britannian tint propagated through sea tiles.
  const politicalIslands = run("({Sumatra:GEOGRAPHY.islandOwnerAt(game,101,0),Java:GEOGRAPHY.islandOwnerAt(game,111,-7),Borneo:GEOGRAPHY.islandOwnerAt(game,114,0),Papua:GEOGRAPHY.islandOwnerAt(game,134,-3),Egypt:GEOGRAPHY.islandOwnerAt(game,30,25)})");
  for (const name of ['Sumatra', 'Java', 'Borneo', 'Papua'])
    assert.equal(politicalIslands[name], 'cf', name + ' has a continuous Federation-owned polygon');
  assert.equal(run("game.stations.find(s=>s.name==='Cairo').owner"), 'eu',
    'Cairo remains controlled by the E.U. despite experimental coastal geography');
  assert([null, 'eu'].includes(politicalIslands.Egypt),
    'Egypt geographic tint is either E.U. land or unassigned sea after reclassification');
  assert.equal(run("E.tile(game,87,14).terrain"), 'sea', 'Cornwall hex follows the 20-80% sea threshold');
  assert.equal(run("E.navigable(E.tile(game,87,14))"), true, 'Cornwall coast stays navigable for warships');
  assert.equal(run("GEOGRAPHY.visualMixedHex(87,14)"), true, 'Cornwall misleading sea/land hex is flagged');
  const conquestTint = run("(() => { const t=game.tiles.find(t=>t.c>=146&&t.c<=149&&t.r>=42&&t.r<=45&&t.terrain!=='sea'); const previous=t.owner; t.owner='britannia'; game.mapRevision=(game.mapRevision||0)+1; const captured=GEOGRAPHY.islandOwnerAt(game,114,0); t.owner=previous; game.mapRevision++; const restored=GEOGRAPHY.islandOwnerAt(game,114,0); return {captured,restored}; })()");
  assert.equal(conquestTint.captured, null, 'a captured Borneo tile must remove the uniform Federation tint');
  assert.equal(conquestTint.restored, 'cf', 'restored Borneo regains uniform Federation tint');

  // Japan uses detailed, curated island polygons, with no neighbouring states.
  const japanDetail = run('JAPAN_SHAPES.map(shape => shape.length)');
  assert.equal(japanDetail.length, 9, 'retain the nine existing Japanese island shapes');
  assert(japanDetail.reduce((sum,n) => sum + n, 0) >= 4700,
    'Natural Earth 1:10m provides substantially more coastline points');
  assert(japanDetail.some(n => n >= 2400), 'Honshu has the new detailed coastline');
  assert(japanDetail.some(n => n >= 450 && n <= 600), 'Shikoku has the new detailed coastline');
  assert(scripts.indexOf('ui/geography-data.js') < scripts.indexOf('ui/japan-coastlines.js') &&
    scripts.indexOf('ui/japan-coastlines.js') < scripts.indexOf('ui/geography.js'),
    'Japanese coastline asset loads before the geography painter');

  // Regional scenarios use the higher-detail Natural Earth Japan-only atlas, not a terrain hex mosaic.
  const japanAtlas = run(`(() => {
    const g=E.scenarios.japan.create('cf','normal',17);
    const painter=document.createElement('canvas').getContext('2d');
    return GEOGRAPHY.paint(painter,g,0,SQ*R*(g.cols+1),0,R*1.5*(g.rows+1),0.85);
  })()`);
  assert.equal(japanAtlas, true, 'scenario painting uses the geographic Japan coastline');
  // The scenario still draws a continuous ocean background. The coastal
  // gameplay limit must not impose a jagged geographic clipping mask.
  const oceanPainting = run(`(() => {
    const g=E.scenarios.japan.create('cf','normal',17);
    const painter=document.createElement('canvas').getContext('2d');
    const oldFill=painter.fillRect, oldClip=painter.clip;
    const events=[];
    painter.fillRect=(...args)=>{events.push('fill');oldFill(...args);};
    painter.clip=(...args)=>{events.push('clip');oldClip(...args);};
    try { GEOGRAPHY.paint(painter,g,0,SQ*R*(g.cols+1),0,R*1.5*(g.rows+1),.85); }
    finally { painter.fillRect=oldFill; painter.clip=oldClip; }
    return events;
  })()`);
  assert.equal(oceanPainting[0],'fill',
    'render unbroken ocean before clipping to Japanese land outlines');
  assert(!fs.readFileSync(path.join(__dirname,'../dist/ui/geography.js'),'utf8')
    .includes('clipJapanTheatre'), 'remove the jagged Japan theatre mask');
  const japanLandCheck = run(`({
    honshu:GEOGRAPHY.japanLandAt(139.69,35.68),
    kyushu:GEOGRAPHY.japanLandAt(130.71,32.80),
    shikoku:GEOGRAPHY.japanLandAt(133.53,33.56),
    hokkaido:GEOGRAPHY.japanLandAt(141.35,43.06),
    korea:GEOGRAPHY.japanLandAt(129.07,35.18),
    russia:GEOGRAPHY.japanLandAt(131.89,43.12)
  })`);
  assert.deepEqual({ ...japanLandCheck }, {
    honshu:true,kyushu:true,shikoku:true,hokkaido:true,korea:false,russia:false
  }, 'scenario should draw Japanese islands only, not Korea or Russia');
  const regionSource = fs.readFileSync(path.join(__dirname, '../dist/ui/geography.js'), 'utf8');
  assert(regionSource.includes("const europeOnly = g.scenario.id === 'european-war'") &&
    regionSource.includes('if (!europeOnly) {') &&
    regionSource.includes("g.scenario?.id === 'european-war' ? 1 : 2"),
    'Europe-only atlas must hide extra-continental silhouettes and limit coastal colour bleed');
  assert(regionSource.includes('clipPath(ctx, clip)') && regionSource.includes('japanColorGroups(g)'),
    'Japan faction ownership is clipped to the realistic island outlines');

  const scenarioCamera = fs.readFileSync(path.join(__dirname, '../dist/ui/core.js'), 'utf8');
  const scenarioLaunch = fs.readFileSync(path.join(__dirname, '../dist/ui/scenario-screens.js'), 'utf8');
  assert(scenarioCamera.includes("game.scenario?.id === 'european-war' ? 5.4 : 2.15"),
    'Europe uses a tactical opening camera while Japan retains its existing zoom');
  const scenarioZooms = run(`(() => {
    const prior = game;
    try {
      game = E.scenarios.europe.create('eb', 'normal', 17);
      const europe = homeZoom();
      game = E.scenarios.japan.create('britannia', 'normal', 17);
      return { europe, japan: homeZoom() };
    } finally { game = prior; }
  })()`);
  assert.equal(scenarioZooms.europe, 5.4,
    'the European War should open close enough to show Knightmare sprites');
  assert.equal(scenarioZooms.japan, 2.15,
    'Japan scenario opening camera must remain unchanged');
  assert(scenarioLaunch.includes("britannia:'Nagoya',bk:'Kyoto',cf:'Fukuoka'"),
    'the opening camera must center on each chosen faction');
  const renderingText = fs.readFileSync(path.join(__dirname, '../dist/ui/renderer.js'), 'utf8');
  assert(renderingText.includes("Math.max(s.capital ? 30 : 20, (s.capital ? 13 : 9) / scale)") &&
    renderingText.includes("Math.max(15, 5 / scale)") &&
    renderingText.includes("if (europeOverview && u.cmd)"),
    'Europe strategic view needs legible cities, formations and commander markers');
  assert(renderingText.includes("t.terrain === 'offmap') return false"),
    'deep-ocean tiles must not render a playable tactical grid');
  assert(renderingText.includes('rgba(42,154,225,0.19)') && renderingText.includes('rgba(245,197,91,0.15)'),
    'ambiguous coast hexes are tinted with their true gameplay terrain on hover');
  assert(!renderingText.includes('SEA · NAVIGABLE') && !renderingText.includes('LAND · WALKABLE'),
    'the hover terrain badge was removed at the owner\'s request');
  assert(renderingText.includes('ctx.setLineDash([5 / scale, 4 / scale])'),
    'a conflicting coastline gets a visible dashed tactical boundary');
  const markerStart = renderingText.indexOf('const coastalExceptions = [');
  assert(markerStart >= 0, 'reviewed coastline exceptions must be visibly marked');
  const markerBlock = renderingText.slice(markerStart, renderingText.indexOf('];', markerStart));
  const markerEntries = markerBlock.match(/\[\d+,\d+\]/g) || [];
  assert.equal(markerEntries.length, 13, '13 non-Arctic exceptions get subtle high-zoom markers (Cornwall is a coast hex now)');
  for (const coords of ['[106,26]', '[140,43]', '[142,46]'])
    assert(markerEntries.includes(coords), coords + ' must display a terrain warning marker');


  // Country names follow the conquered land, not hard-coded map coordinates.
  assert(renderingText.includes('TERRITORY_LABELS.draw('),
    'the world renderer overlays strategic names underneath tactical markers');
  const politicalNames = run('TERRITORY_LABELS.layout(game, WORLD_W).map(x => ({side:x.side, tiles:x.tiles, span:x.span}))');
  for (const side of ['britannia', 'eu', 'cf'])
    assert(politicalNames.some(l => l.side === side), side + ' has a strategic country label');
  assert(politicalNames.filter(l => l.side === 'britannia').length >= 2,
    'Britannia receives separate North and South American labels');
  assert(politicalNames.filter(l => l.side === 'eu').length >= 2,
    'Europia receives separate Eurasian and African labels');
  assert(run(`TERRITORY_LABELS.layout(game, WORLD_W).every(l =>
    [0.15, 0.3, 0.5, 0.7, 0.85].every(t => TERRITORY_LABELS.ownedAt(game,
      l.x + Math.cos(l.angle) * l.span * (t - 0.5),
      l.y + Math.sin(l.angle) * l.span * (t - 0.5), l.side, WORLD_W)))`),
    'every country name crosses only land that its faction controls');
  assert.equal(run('TERRITORY_LABELS.layout({...game,wrap:false,mode:"campaign"}, WORLD_W).length'), 0,
    'campaign battlefields do not receive world-war labels');
  assert(run(`(() => {
    const first = TERRITORY_LABELS.layout(game, WORLD_W);
    const rev = game.mapRevision;
    game.mapRevision = rev + 1;
    const refreshed = TERRITORY_LABELS.layout(game, WORLD_W);
    game.mapRevision = rev;
    return refreshed !== first && TERRITORY_LABELS.layout(game, WORLD_W) !== refreshed;
  })()`), 'a captured province invalidates label positions');

  const harbor = run(`(() => {
    const city = game.stations.find(s => s.name === 'Barcelona');
    const actual = hexCenter(city.portAt);
    const visual = visualPortCenter(city);
    return {sea: E.isSea(E.tile(game, city.portAt.c, city.portAt.r)),
      delta: Math.hypot(visual.x - actual.x, visual.y - actual.y)};
  })()`);
  assert(harbor.sea, 'Barcelona port remains a navigable gameplay sea hex');
  assert(harbor.delta > 0 && harbor.delta < 43 * 0.5, 'Barcelona harbour artwork is only gently shifted to visual sea');

  for (const side of ['britannia', 'eu', 'cf']) {
    run(`setup={side:'${side}',difficulty:'normal'};newGame();draw(0,.016);drawMinimap();`);
    assert.equal(run('game.player'), side);
    assert.equal(run('getSave().player'), side);
    assert(node('app').innerHTML.includes('World War'), `${side}: conquest HUD renders`);

    await run('endTurn()');
    assert.equal(run('game.turn'), 2, `${side}: one complete turn resolves`);
    assert.equal(run('game.phase'), side, `${side}: control returns to the player`);
    assert.equal(run('getSave().turn'), 2, `${side}: turn is saved`);
  }

  // Ending a turn never asks for confirmation, even if unspent orders remain.
  run('newGame()');
  assert(run('ownUnits().filter(u => E.hasOrders(game, u)).length') > 0,
    'conquest begins with orders that previously triggered the review dialog');
  run('globalThis.__audioTransitions = []; globalThis.__origSetAiTurn = SFX.setAiTurn; SFX.setAiTurn = x => { __audioTransitions.push(x); __origSetAiTurn(x); };');
  await run('endTurn()');
  assert.equal(run('game.turn'), 2, 'unconfirmed end turn advances immediately');
  assert(!modal().includes('Review orders'), 'the review-orders screen never appears');
  assert.deepEqual([...run('__audioTransitions')], [true, false], 'AI is muted only during rival playback');
  run('SFX.setAiTurn = __origSetAiTurn; delete globalThis.__origSetAiTurn; delete globalThis.__audioTransitions;');

  run('startScenario("cf")');
  await run('endTurn()');
  assert.equal(run('game.turn'), 2, 'scenario also ends its turn without confirmation');
  assert.equal(run('game.phase'), 'cf', 'scenario hands control back to the player');
  assert(!modal().includes('Review orders'), 'scenario never opens the review dialog');

  // Unit actions belong to the bottom dock; the only unit drawer is carrier cargo.
  run('newGame()');
  assert(!node('side').innerHTML, 'new conquest starts without the introductory sidebar');
  assert(!node('selection-dock').innerHTML.includes('World information'), 'no World information opener in the bottom dock');
  const carrierId = run("game.units.find(u => u.side === game.player && E.TYPES[u.type].naval === 'ship')?.id");
  assert(carrierId, 'Conquest starts with a friendly carrier');
  run(`game.units.find(u => u.id === ${carrierId}).cargo = []`);
  run(`selectUnit(${carrierId})`);
  assert(node('selection-dock').innerHTML.includes('data-action="carrier-deploy"'), 'carrier has Deploy units');
  assert(!node('selection-dock').innerHTML.includes('data-action="assign"'), 'carrier has no assign commander');
  assert(!node('side').innerHTML.includes('Standing orders'), 'normal unit sidebar is suppressed');
  assert(!node('selection-dock').innerHTML.includes('Orders & upgrades'), 'no duplicate unit details');
  const clickAction = data => events.click({
    target: { closest: selector => selector === 'button' ? { dataset: data, disabled: false, getAttribute: () => null } : null },
  });
  // Undo remains visible but disabled unless the selected unit has a reversible move.
  assert.match(node('selection-dock').innerHTML,
    /data-action="undo"[^>]*disabled[^>]*>↶ Undo locked<\/button>/,
    'Undo is visibly locked when there is no reversible move');
  assert(node('selection-dock').innerHTML.includes('No reversible move'),
    'disabled Undo explains why occupation and carrier actions cannot be reversed');
  run(`undoStack = [{ unitId: ${carrierId}, snapshot: JSON.stringify(E.packSave(game)) }]; updateSelection();`);
  assert.match(node('selection-dock').innerHTML,
    /data-action="undo"[^>]*>↶ Undo<\/button>/,
    'Undo becomes an enabled button after ordinary movement');
  assert(!/data-action="undo"[^>]*disabled/.test(node('selection-dock').innerHTML));
  run('undoStack = []; updateSelection()');

  // Exercise the real map-click UI path with each movement result. Prior movement
  // snapshots must be erased by mine capture and carrier boarding, not restored.
  const simulateUndoOutcome = outcome => run(`(() => {
    const unit = game.units.find(v => v.hp > 0 && v.side === game.player && !E.TYPES[v.type].naval);
    if (!unit) throw new Error('Undo fixture needs a land unit');
    selectUnit(unit.id);
    const target = game.tiles.find(p => !E.stationAt(game, p) && !E.siteAt(game, p) && !E.unitAt(game, p));
    const originalMove = E.move;
    undoStack = [{ snapshot: JSON.stringify(E.packSave(game)), unitId: unit.id }];
    readyCache = new Map([[E.key(target), 1]]);
    targetCache.clear();
    E.move = () => ({ ok: true, from: { c: unit.c, r: unit.r }, to: target, ...${JSON.stringify(outcome)} });
    try { activateHex(target); return undoStack.length; }
    finally { E.move = originalMove; }
  })()`);
  assert.equal(simulateUndoOutcome({ seized: 'Mount Fuji' }), 0,
    'capturing a Sakuradite mine destroys all older movement undo history');
  assert.match(node('selection-dock').innerHTML, /Undo locked<\/button>/);
  assert.equal(simulateUndoOutcome({ loaded: carrierId }), 0,
    'boarding a Carrier-Battleship destroys all older movement undo history');
  assert.match(node('selection-dock').innerHTML, /Undo locked<\/button>/);
  assert.equal(simulateUndoOutcome({}), 2,
    'ordinary movement still remains undoable and retains previous reversible steps');
  run('undoStack = []; readyCache.clear(); updateSelection()');
  // An occupying unit must not hide standalone mine management.
  const occupiedMine = run(`(() => {
    const mine = game.sites.find(d => d.city == null && d.name === 'Mount Fuji');
    if (!mine) throw new Error('Mount Fuji fixture missing');
    mine.owner = game.player;
    mine.refinery = 0;
    let guard = E.unitAt(game, mine);
    if (!guard) guard = E.newUnit(game, E.typeFor(game.player, 'light'), game.player, mine.c, mine.r);
    guard.side = game.player;
    guard.moved = guard.attacked = true;
    routing = null; deploying = null;
    game.economy[game.player].credits = game.economy[game.player].industry = 5000;
    selectUnit(guard.id);
    return { id: mine.id, unit: guard.id, c: mine.c, r: mine.r };
  })()`);
  assert(node('selection-dock').innerHTML.includes(`data-site="${occupiedMine.id}"`), 'occupied mine offers a Mine button');
  run(`activateHex(E.tile(game, ${occupiedMine.c}, ${occupiedMine.r}))`);
  assert.equal(run('selection.kind'), 'site', 'clicking a selected mine guard selects its mine');
  run(`activateHex(E.tile(game, ${occupiedMine.c}, ${occupiedMine.r}))`);
  assert.equal(run('selection.id'), occupiedMine.unit, 'another click selects the guard again');
  clickAction({ site: String(occupiedMine.id) });
  assert.equal(run('selection.kind'), 'site', 'dock Mine button selects the mine');
  clickAction({ action: 'details' });
  assert(node('side').innerHTML.includes(`data-refine="${occupiedMine.id}"`), 'occupied mine opens its refinery upgrade');
  clickAction({ refine: String(occupiedMine.id) });
  assert.equal(run(`game.sites.find(d => d.id === ${occupiedMine.id}).refinery`), 1, 'refinery purchase succeeds with its spent guard in place');
  assert.equal(run(`E.unitAt(game, E.tile(game, ${occupiedMine.c}, ${occupiedMine.r})).id`), occupiedMine.unit);
  const capitalText = run(`(() => {
    const capital = game.stations.find(s => s.capitalOf === game.player && s.owner === game.player);
    selection = { kind: 'station', id: capital.id };
    return panel();
  })()`);
  assert(capitalText.includes('A power surrenders when it loses its last city.'), 'capital details describe the actual surrender rule');
  assert(!capitalText.includes('If it falls, the whole power surrenders.'), 'capital capture does not falsely promise surrender');
  // Neither empty selection nor a terrain hex can revive the deleted intro panel.
  run('selection = null; detailOpen = true; updateSelection()');
  assert(!node('side').innerHTML, 'empty selection does not show a sidebar');
  assert.equal(run('panel()'), '', 'no introductory panel content remains');
  clickAction({ action: 'details' });
  assert.equal(run('detailOpen'), false, 'details cannot reopen intro on empty selection');
  run("selection = { kind: 'tile', c: 0, r: 0 }; detailOpen = true; updateSelection()");
  assert(!node('side').innerHTML, 'terrain selections do not show a duplicate sidebar');
  clickAction({ action: 'details' });
  assert(!node('side').innerHTML, 'details cannot open a terrain sidebar');
  run(`selectUnit(${carrierId})`);
  clickAction({ action: 'carrier-deploy' });
  assert(node('side').innerHTML.includes('Deploy Knightmares'), 'deployment appears in sidebar, not centered modal');
  assert(node('side').innerHTML.includes('Empty. Move a Knightmare'), 'empty carrier explains boarding');
  assert(!modal().includes('Carrier deployment'), 'deployment does not open a modal');
  // D toggles exactly the same carrier drawer as its dock button.
  const carrierKey = (key, tagName = 'BODY', repeat = false) => {
    let prevented = false;
    events.keydown({ key, repeat, target: { tagName, dataset: {} }, preventDefault() { prevented = true; } });
    return prevented;
  };
  // E uses the same immediate end-turn action as the button, but not while typing or in a dialog.
  run('globalThis.__realEndTurn = endTurn; globalThis.__endKeyCount = 0; endTurn = () => { __endKeyCount++; };');
  assert.equal(carrierKey('e'), true, 'E is recognized as the end-turn shortcut');
  assert.equal(carrierKey('E'), true, 'uppercase E also works');
  assert.equal(carrierKey('e', 'BODY', true), true, 'repeated E is consumed');
  assert.equal(carrierKey('e', 'INPUT'), false, 'typing E in an input is not intercepted');
  assert.equal(run('__endKeyCount'), 2, 'holding E does not end multiple turns');
  run('helpDialog()');
  assert.equal(carrierKey('e'), false, 'E is disabled while a dialog is open');
  run('closeModal(); endTurn = __realEndTurn; delete globalThis.__realEndTurn; delete globalThis.__endKeyCount;');
  assert.equal(carrierKey('d'), true, 'D is handled for a selected friendly carrier');
  assert(!node('side').innerHTML.includes('Deploy Knightmares'), 'D closes the open carrier drawer');
  assert.equal(carrierKey('D'), true, 'uppercase D is recognized');
  assert(node('side').innerHTML.includes('Deploy Knightmares'), 'D reopens carrier deployment');
  assert.equal(carrierKey('d', 'INPUT'), false, 'D does not intercept typing in inputs');
  assert(node('side').innerHTML.includes('Deploy Knightmares'), 'typing does not change the carrier drawer');
  carrierKey('d', 'BODY', true);
  assert(node('side').innerHTML.includes('Deploy Knightmares'), 'held D does not repeatedly toggle the drawer');
  run('helpDialog()');
  assert.equal(carrierKey('d'), false, 'D does not open deployment over a modal');
  run('closeModal()');
  assert(node('side').innerHTML.includes('Deploy Knightmares'), 'closing the modal preserves the carrier drawer');
  run(`(function() {
    const ship = game.units.find(u => u.id === ${carrierId});
    const passenger = game.units.find(u => u.side === game.player && !E.TYPES[u.type].naval);
    if (!passenger) throw new Error('No Knightmare for carrier test');
    game.units.splice(game.units.indexOf(passenger), 1);
    (ship.cargo ||= []).push(passenger);
  })()`);
  run(`(function() {
    const ship = game.units.find(u => u.id === ${carrierId});
    const landing = E.adjacent(game, ship).find(t => !E.unitAt(game, t) && !E.stationAt(game, t));
    if (!landing) throw new Error('No open adjacent hex in UI smoke fixture');
    landing.terrain = 'plains';
  })()`);
  run('updateSelection()');
  assert(node('side').innerHTML.includes('data-deploy="0"'), 'one launch choice per carried unit');
  assert.equal(run('E.deployReason(game, selectedUnit(), 0)'), null, 'test fixture has a valid landing hex');
  clickAction({ deploy: '0' });
  assert.equal(run('deploying?.index'), 0, 'cargo picker starts landing-hex mode');
  assert(!node('side').innerHTML, 'cargo drawer closes when targeting the map');
  const launchHex = run(`E.deployTargets(game, game.units.find(u => u.id === ${carrierId}), 0)[0]`);
  assert(launchHex, 'carrier has a valid deployment hex for the undo test');
  run('undoStack = [{snapshot: JSON.stringify(E.packSave(game)), unitId: selectedUnit().id}]');
  run(`activateHex(E.tile(game, ${launchHex.c}, ${launchHex.r}))`);
  assert.equal(run('undoStack.length'), 0,
    'deploying carrier cargo irreversibly clears the preceding movement history');
  assert.match(node('selection-dock').innerHTML, /Undo locked<\/button>/,
    'the deployed unit shows undo as unavailable');
  // City and mine management remain accessible through explicit bottom-bar details.
  const cityId = run("game.stations.find(s => s.owner === game.player)?.id");
  assert(cityId != null, 'conquest has a friendly city');
  run(`selectStation(${cityId})`);
  assert(node('selection-dock').innerHTML.includes('City details'), 'city still offers its information panel');
  assert(!node('side').innerHTML, 'city information remains closed until requested');
  clickAction({ action: 'details' });
  assert(node('side').innerHTML.includes('City defenses'), 'city details and management still open');
  clickAction({ action: 'details' });
  assert(!node('side').innerHTML, 'city details close cleanly');
  // Fully upgraded buildings must not offer clickable upgrade orders.
  // This covers city factories and the separate Sakuradite-mine refinery UI.
  const buildingButtons = run(`(() => {
    const city = game.stations.find(s => s.owner === game.player);
    const beforeTier = city.tier, beforeSelection = selection;
    try {
      selection = { kind: 'station', id: city.id };
      city.tier = 3;
      const maxCity = panel();
      city.tier = 2;
      const upgradableCity = panel();
      const maxRefinery = refineryRow({ refinery: 3 }, 'data-refine="12"', null);
      const upgradableRefinery = refineryRow({ refinery: 2 }, 'data-refine="12"', null);
      return { maxCity, upgradableCity, maxRefinery, upgradableRefinery };
    } finally {
      city.tier = beforeTier;
      selection = beforeSelection;
    }
  })()`);
  assert(buildingButtons.maxCity.includes('<button class="small" disabled>Maximum level</button>'),
    'level-3 city buildings display a native disabled Maximum level control');
  assert(!buildingButtons.maxCity.includes('data-build="factory"'),
    'fully upgraded factories no longer offer an upgrade action');
  assert(buildingButtons.upgradableCity.includes('data-build="factory"') &&
    buildingButtons.upgradableCity.includes('Upgrade to level 3'),
    'level-2 city buildings retain their normal upgrade action');
  assert(buildingButtons.maxRefinery.includes('<button class="small" disabled>Maximum level</button>') &&
    !buildingButtons.maxRefinery.includes('data-refine='),
    'level-3 standalone mine refineries have no clickable upgrade action');
  assert(buildingButtons.upgradableRefinery.includes('data-refine="12"') &&
    buildingButtons.upgradableRefinery.includes('Upgrade to level 3'),
    'level-2 standalone refineries remain upgradeable');

  const mineId = run("game.sites?.[0]?.id");
  if (mineId != null) {
    run(`selectSite(${mineId})`);
    assert(node('selection-dock').innerHTML.includes('Mine details'), 'mine information button survives');
    clickAction({ action: 'details' });
    assert(node('side').innerHTML.includes('Sakuradite mine'), 'mine information still opens');
    clickAction({ action: 'details' });
    assert(!node('side').innerHTML, 'mine information closes cleanly');
  }


  const infantryId = run("game.units.find(u => u.side === game.player && !E.TYPES[u.type].naval && !u.cmd)?.id");
  assert(infantryId, 'a normal uncommanded unit exists');
  run(`selectUnit(${infantryId})`);
  run(`(function() { const u = game.units.find(v => v.id === ${infantryId}); u.moved = u.attacked = false; })()`);
  const dock = node('selection-dock').innerHTML;
  for (const label of ['Assign', 'Add frame', 'Repair', 'Hold', 'Set destination'])
    assert(dock.includes(label), `bottom unit bar includes ${label}`);
  assert(!node('side').innerHTML, 'standard units do not open a duplicate right panel');
  assert(!/\\([AFRGHC]\\)/.test(dock), 'button captions omit keyboard annotations');
  assert(!dock.includes('Standing orders:'), 'dock hides redundant standing orders label');
  run(`(function() {
    const u = game.units.find(v => v.id === ${infantryId});
    u.goto = E.adjacent(game, u)[0];
  })()`);
  run('updateSelection()');
  assert(node('selection-dock').innerHTML.includes('Heading for'), 'brief destination shown');
  assert(!node('selection-dock').innerHTML.includes('Standing orders:'), 'no redundant destination prefix');
  const keyboard = key => events.keydown({ key, target: { tagName: 'BODY', dataset: {} }, preventDefault() {} });
  const beforeCam = run('JSON.stringify(cam)');
  keyboard('w'); keyboard('s'); keyboard('d');
  assert.equal(run('JSON.stringify(cam)'), beforeCam, 'W/S/D do not pan the map');
  assert.equal(run('carrierHoldOpen'), null, 'D does not open deployment for a non-carrier');
  keyboard('c');
  assert.equal(run(`game.units.find(u => u.id === ${infantryId}).goto ?? null`), null, 'C clears standing orders');
  keyboard('a');
  assert(modal().includes('Unit commanders'), 'A opens commander assignment');
  run('closeModal()');
  run('helpDialog()');
  const manual = modal();
  for (const key of ['Assign commander', 'Deploy carrier units', 'Add frame', 'Repair', 'Hold position', 'Set/change destination', 'Stop auto-move', 'Next ready unit']) {
    assert(manual.includes(key), `manual documents ${key}`);
  }
  assert(!manual.includes('H centers on your capital'), 'manual removes obsolete H shortcut');
  assert(!manual.includes('WASD pans'), 'manual removes obsolete WASD navigation');
  run('closeModal()');
  keyboard('h');
  assert.equal(run(`game.units.find(u => u.id === ${infantryId}).moved`), true, 'H holds the unit');
  assert.equal(run(`game.units.find(u => u.id === ${infantryId}).attacked`), true, 'H consumes attack');
  assert(!node('side').innerHTML, 'holding a unit leaves the duplicate drawer closed');

  // Validate combat visuals on the full UI without mutating saved game state.
  run("setup={side:'britannia',difficulty:'normal'};newGame();");
  assert.equal(run("typeof combatVisualSnapshot"), 'function');
  assert.equal(run("typeof drawCombatShot"), 'function');
  assert.equal(run("typeof drawCombatWreck"), 'function');
  run("effects=[]; for(const weapon of Object.keys(VFX_WEAPONS)) queueCombatShot({c:1,r:1},{c:2,r:1},weapon,'britannia');");
  assert.equal(run("effects.filter(e=>e.kind==='shot').length"), 7, 'all seven weapon visuals are queued');
  run("draw(100,.016);");
  run("effects=[];centerOn(game.units[0]);computeView();spawnCombatWreck(game.units[0]);");
  assert.equal(run("effects.some(e=>e.kind==='wreck')"), true, 'destroyed units have transient wreckage');
  run("draw(150,.016); effects=[];");

  // Movement highlights distinguish genuinely navigable coast from inland
  // land and open sea, regardless of the currently selected faction or mode.
  const inlandStyle = run("movementTileStyle({terrain:'plains'})");
  const coastStyle = run("movementTileStyle({terrain:'coast'})");
  const seaStyle = run("movementTileStyle({terrain:'sea'})");
  assert.notEqual(coastStyle.fill, inlandStyle.fill);
  assert.notEqual(coastStyle.stroke, inlandStyle.stroke);
  assert.notEqual(coastStyle.fill, seaStyle.fill);
  assert.notEqual(coastStyle.stroke, seaStyle.stroke);
  assert.equal(run("movementTileStyle({terrain:'forest'}).fill"), inlandStyle.fill,
    'other land terrain uses the normal green movement highlight');
  assert.equal(run("movementTileStyle({terrain:'coast'}).fill"), coastStyle.fill,
    'coast highlights apply to any selected unit, including land units');
  assert(node('app').innerHTML.includes('Cyan: coast (land + ships)'),
    'in-game movement guide explains the cyan coast highlight');

  // Scenario has individual unit controls but no Army Groups navigation tab.
  run("startScenario('cf');draw(16,.016);drawMinimap();");
  assert.equal(run('game.mode'),'scenario');
  assert(!node('app').innerHTML.includes('data-action="scenario-armies"'),
    'remove Army Groups from the scenario top navigation');
  assert(node('app').innerHTML.includes('data-action="archive"'),
    'the Units tab remains present');
  assert(!node('app').innerHTML.includes('class="map-legend"'),
    'scenario map omits the faction-colour legend entirely');
  run('newGame()');

  run('startMenu();campaignDialog("bk_s1")');
  assert(modal().includes('data-mission="bk1"'), 'campaign menu renders');

  run('startMission("bk1")');
  assert.equal(run('game.mode'), 'campaign');
  assert(run(`(() => {
    const city = game.stations[0];
    const a = visualCityCenter(city), b = hexCenter(city);
    return a.x === b.x && a.y === b.y;
  })()`), 'campaign cities retain exact tactical sprite positions');

  assert(modal().includes('Mission dialogue'), 'campaign opening dialogue renders');

  run('talkNext(true);draw(16,.016);drawMinimap();');
  assert(node('app').innerHTML.includes('Shinjuku Ghetto'), 'campaign HUD renders');
  assert.equal(run('getSave(CAMPAIGN_KEY).mode'), 'campaign', 'campaign uses its own save slot');
  assert.equal(run('goalState({alive:["tohdoh"]})'), 'todo',
    'a scripted survivor who has not spawned is pending, not lost');
  run('game.campaign.killed.push("tohdoh")');
  assert.equal(run('goalState({alive:["tohdoh"]})'), 'lost',
    'a defeated required survivor is marked lost');

  await run('endTurn()');
  assert(!modal().includes('Review orders'), 'campaign missions also bypass the orders confirmation');
  assert(run('game.turn >= 2 || !!game.over'), 'campaign turn resolves or the mission ends');

  console.log('PASS: conquest, scenario and campaign end turns without dialogs; E shortcut and AI mute verified.');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

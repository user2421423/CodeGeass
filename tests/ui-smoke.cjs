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

  const renderingText = fs.readFileSync(path.join(__dirname, '../dist/ui/renderer.js'), 'utf8');
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

    await run('endTurn(true)');
    assert.equal(run('game.turn'), 2, `${side}: one complete turn resolves`);
    assert.equal(run('game.phase'), side, `${side}: control returns to the player`);
    assert.equal(run('getSave().turn'), 2, `${side}: turn is saved`);
  }

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

  console.log('PASS: scripts load, all three conquest factions complete a turn, and a campaign mission boots.');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

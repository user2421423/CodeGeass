const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const nodes = new Map();
const events = {};
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
  addEventListener: (k, fn) => (events[k] = fn),
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


  // Geography is visually interpolated separately from the immutable tactical hex map.
  assert.equal(run(`(() => { const t = game.tiles.find(t => t.terrain !== 'sea'); const p = hexCenter(t); return GEOGRAPHY.sample(game, p.x, p.y); })()`), 1, 'land remains land at its gameplay hex centre');
  assert.equal(run(`(() => { const t = game.tiles.find(t => t.terrain === 'sea'); const p = hexCenter(t); return GEOGRAPHY.sample(game, p.x, p.y); })()`), 0, 'sea remains sea at its gameplay hex centre');
  assert(run(`(() => { const t = game.tiles.find(t => t.terrain !== 'sea'); const p = hexCenter(t); return Math.abs(GEOGRAPHY.sample(game, p.x, p.y) - GEOGRAPHY.sample(game, p.x + WORLD_W, p.y)); })()`) < 1e-8, 'world atlas wraps without a seam');

  // Shoreline city art is visual-only and must remain selectable even when
  // its graphic sits slightly away from the tactical city hex centre.
  const anchors = run(`(() => {
    const names = Object.keys(CITY_SHORE_ANCHORS);
    const moved = names.map(name => {
      const city = game.stations.find(s => s.name === name);
      if (!city) return { name, missing: true };
      const original = hexCenter(city), visual = visualCityCenter(city);
      return { name, delta: Math.hypot(original.x - visual.x, original.y - visual.y),
        hit: hitVisualStationAtWorld(visual.x, visual.y, 1)?.id === city.id,
        original: [city.c, city.r] };
    });
    return { count: names.length, moved, stations: game.stations.length };
  })()`);
  assert.equal(anchors.count, 19, 'every identified visually offshore city has a coastline anchor');
  for (const city of anchors.moved) {
    assert(!city.missing, `${city.name}: still exists as a gameplay station`);
    assert(city.delta > 0 && city.delta < 43 * 0.72, `${city.name}: anchored within the original hex neighbourhood`);
    assert(city.hit, `${city.name}: selecting the displaced visual city reaches its station`);
  }

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

  console.log('PASS: scripts load, all three conquest factions complete a turn, and a campaign mission boots.');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

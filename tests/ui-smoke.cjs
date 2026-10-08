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
  clickAction({ action: 'carrier-deploy' });
  assert(node('side').innerHTML.includes('Deploy Knightmares'), 'deployment appears in sidebar, not centered modal');
  assert(node('side').innerHTML.includes('Empty. Move a Knightmare'), 'empty carrier explains boarding');
  assert(!modal().includes('Carrier deployment'), 'deployment does not open a modal');
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
  keyboard('c');
  assert.equal(run(`game.units.find(u => u.id === ${infantryId}).goto ?? null`), null, 'C clears standing orders');
  keyboard('a');
  assert(modal().includes('Unit commanders'), 'A opens commander assignment');
  run('closeModal()');
  run('helpDialog()');
  const manual = modal();
  for (const key of ['Assign commander', 'Add frame', 'Repair', 'Hold position', 'Set/change destination', 'Stop auto-move', 'Next ready unit']) {
    assert(manual.includes(key), `manual documents ${key}`);
  }
  assert(!manual.includes('H centers on your capital'), 'manual removes obsolete H shortcut');
  assert(!manual.includes('WASD pans'), 'manual removes obsolete WASD navigation');
  run('closeModal()');
  keyboard('h');
  assert.equal(run(`game.units.find(u => u.id === ${infantryId}).moved`), true, 'H holds the unit');
  assert.equal(run(`game.units.find(u => u.id === ${infantryId}).attacked`), true, 'H consumes attack');
  assert(!node('side').innerHTML, 'holding a unit leaves the duplicate drawer closed');

  run('startMenu();campaignDialog("bk_s1")');
  assert(modal().includes('data-mission="bk1"'), 'campaign menu renders');

  run('startMission("bk1")');
  assert.equal(run('game.mode'), 'campaign');
  assert(modal().includes('Mission dialogue'), 'campaign opening dialogue renders');

  run('talkNext(true);draw(16,.016);drawMinimap();');
  assert(node('app').innerHTML.includes('Shinjuku Ghetto'), 'campaign HUD renders');
  assert.equal(run('getSave(CAMPAIGN_KEY).mode'), 'campaign', 'campaign uses its own save slot');

  console.log('PASS: scripts load, all three conquest factions complete a turn, and a campaign mission boots.');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

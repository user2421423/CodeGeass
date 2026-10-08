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
  assert(modal().includes('Mission dialogue'), 'campaign opening dialogue renders');

  run('talkNext(true);draw(16,.016);drawMinimap();');
  assert(node('app').innerHTML.includes('Shinjuku Ghetto'), 'campaign HUD renders');
  assert.equal(run('getSave(CAMPAIGN_KEY).mode'), 'campaign', 'campaign uses its own save slot');

  console.log('PASS: scripts load, all three conquest factions complete a turn, and a campaign mission boots.');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

const vm = require('node:vm'),
  fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const nodes = new Map(),
  events = {},
  storage = {},
  registered = [];
const drawContext = new Proxy(
  {},
  {
    get: (o, p) =>
      p === 'createRadialGradient' || p === 'createLinearGradient'
        ? () => ({ addColorStop() {} })
        : p === 'measureText'
          ? () => ({ width: 40 })
          : o[p] || (() => {}),
    set: (o, p, v) => ((o[p] = v), true),
  },
);
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
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      getBoundingClientRect() {
        return { width: 1280, height: 760, left: 0, top: 0 };
      },
      getContext() {
        return drawContext;
      },
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
  querySelectorAll() {
    return [];
  },
  createElement: () => node('scratch-' + serial++),
  modelContext: { registerTool: t => registered.push(t) },
};
const env = {
  document,
  localStorage: { getItem: k => storage[k] ?? null, setItem: (k, v) => (storage[k] = String(v)) },
  setTimeout: fn => {
    fn();
    return 1;
  },
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
for (const file of ['engine.js', 'assets/art/manifest.js', 'art.js', 'icons.js', 'audio.js', 'game.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist', file), 'utf8'), context);
const run = s => vm.runInContext(s, context);
const modal = () => node('modal-root').innerHTML;
(async () => {
  const NOTICE = 'Code Geass and related characters are trademarks and copyrighted property. This project is an unofficial fan creation and is not officially affiliated with or endorsed by the copyright holders.';
  assert(modal().includes('One world.'));
  assert(modal().includes(NOTICE), 'start menu shows the attribution notice');
  for (const side of ['britannia', 'eu', 'cf']) assert(modal().includes(`data-faction="${side}"`));
  for (const side of ['britannia', 'eu', 'cf']) {
    run(`setup={side:'${side}',difficulty:'normal'};newGame();draw(0,.016);drawMinimap();`);
    assert(node('app').innerHTML.includes('World War'));
    assert(node('app').innerHTML.includes('res-sakuradite'), 'the resource bar shows Sakuradite');
    assert.equal(run('game.player'), side);
    assert.equal(run('getSave().player'), side);
    run('nextFleet();updateSelection();');
    assert(node('side').innerHTML.includes('Frame integrity'));
    run('selectUnit(game.units.find(u=>u.side!==game.player&&u.hp>0).id)');
    run("researchDialog('infantry')");
    assert(modal().includes('Landspinner Tuning'));
    run("researchDialog('sakura')");
    assert(modal().includes('Float System'));
    run('admiralDialog()');
    assert(modal().includes('Commanders'));
    assert(modal().includes('data-general='));
    run(`generalsDialog('${side}')`);
    assert(modal().includes('Your commanders'));
    const starter = run(`E.STARTERS['${side}'][0]`);
    run(`generalDialog('${starter}', true)`);
    assert(modal().includes('Your commander'));
    run(`generalDialog('${starter}')`);
    assert(modal().includes('Commander Info'));
    run(`archiveDialog('Artillery','${side}')`);
    assert(modal().includes(run(`E.TYPES[E.ROSTER['${side}'].siege].name`)));
    run('powersDialog()');
    assert(modal().includes('World powers'));
    assert(modal().includes('Sakuradite deposits') && modal().includes('Mount Fuji'));
    run("selectSite(game.sites.find(d=>d.name==='Mount Fuji').id)");
    assert(node('side').innerHTML.includes('Sakuradite mine'));
    assert(node('side').innerHTML.includes('Sakuradite refinery'));
    assert(node('selection-dock').innerHTML.includes('Mount Fuji'));
    run("selectStation(game.stations.find(s=>s.name==='London').id)");
    assert(node('side').innerHTML.includes('Stonehenge'), 'London shows the deposit it works');
    run("openShop(game.stations.find(s=>s.owner===game.player&&s.tier>=3).id,'Armor')");
    assert(modal().includes('Roll out a Knightmare unit'));
    assert.equal((modal().match(/data-recruit=/g) || []).length, 4);
    for (const branch of ['Infantry', 'Artillery']) {
      run(`openShop(game.stations.find(s=>s.owner===game.player&&s.tier>=3).id,'${branch}')`);
      assert.equal((modal().match(/data-recruit=/g) || []).length, 3);
    }
    run('selectStation(game.stations.find(s=>s.owner===game.player).id)');
    assert(node('side').innerHTML.includes('Knightmare factory'));
    run('helpDialog()');
    assert(modal().includes('War on a world of hexes'));
    assert(modal().includes('Japan holds 70'), 'field manual explains Sakuradite');
    assert(modal().includes(NOTICE), 'field manual shows the notice');
    run('menuDialog()');
    assert(modal().includes(NOTICE) && modal().includes('Credits'), 'game menu shows the notice and credits');
    run('closeModal()');
    await run('endTurn(true)');
    assert.equal(run('game.turn'), 2);
    assert.equal(run('game.phase'), side);
    assert.equal(run('getSave().turn'), 2);
    run('draw(16,.016)');
  }
  // F.L.E.I.J.A.: conquest-only Lab III gate, arsenal button, targeting, confirmation, your launch and a rival's.
  run("researchDialog('sakura')");
  assert(!modal().includes('F.L.E.I.J.A.'), 'F.L.E.I.J.A. is not an HQ technology');
  run("closeModal(); game.turn = E.FLEIJA.labTurn; capitalOf(game.player).lab = 3; game.arsenal = { [game.player]: 1 }; render();");
  assert(node('app').innerHTML.includes('data-action="fleija"'), 'the arsenal button appears');
  run('selectStation(capitalOf(game.player).id)');
  assert(node('side').innerHTML.includes('Build a warhead'));
  const target = run(
    "(() => { const u = game.units.find(u => u.hp > 0 && u.side !== game.player && u.side !== 'neutral' && !E.atSea(game, u)); return u.c + ',' + u.r; })()",
  ).split(',');
  run(`strikeMode = true; hover = E.tile(game, ${target[0]}, ${target[1]}); draw(40, .016); activateHex(hover)`);
  assert(modal().includes('Launch F.L.E.I.J.A. at'));
  await run(`launchAt({ c: ${target[0]}, r: ${target[1]} })`);
  assert.equal(run('game.arsenal[game.player]'), 0);
  assert(run("game.log.some(l => l.text.startsWith('F.L.E.I.J.A. detonation'))"));
  assert(run('E.eliminatorUnlocked(game)'));
  assert.equal(run(`E.tile(game, ${target[0]}, ${target[1]}).terrain`), 'crater');
  run('selectStation(capitalOf(game.player).id)');
  assert(node('side').innerHTML.includes('F.L.E.I.J.A. Eliminator'));
  assert(node('side').innerHTML.includes('data-eliminator='));
  run('draw(48, .016); drawMinimap();');
  const defended = run(
    "(() => { const s = game.stations.find(s => s.owner !== game.player && s.owner !== 'neutral'); s.eliminator = 1; return s.c + ',' + s.r; })()",
  ).split(',');
  run('game.turn++; game.phase = game.player; game.arsenal[game.player] = 1;');
  await run(`launchAt({ c: ${defended[0]}, r: ${defended[1]} })`);
  assert.equal(run('game.arsenal[game.player]'), 0);
  assert(node('fleija-alert').innerHTML.includes('F.L.E.I.J.A. eliminated'));
  // A rival with a warhead strikes your city building one; the warning plays during its turn.
  run(
    '(() => { const s = capitalOf(game.player); s.project = { side: game.player, started: game.turn, ready: game.turn + 4 }; game.arsenal[game.order[1]] = 1; })()',
  );
  run('powersDialog()');
  assert(modal().includes('building in'));
  run('closeModal()');
  await run('endTurn(true)');
  assert(node('fleija-alert').innerHTML.includes('Strategic weapon detected'));
  assert.equal(run('game.arsenal[game.order[1]]'), 0);
  // Optional local art: a manifest entry layers a file over the drawn art; no entry keeps the drawing.
  run("ART.useLocal({units:{glasgow:'units/glasgow.png'},portraits:{suzaku:{src:'portraits/suzaku.jpg',fx:0.4,fy:0.2}}})");
  assert(run("ART.unit('glasgow')").includes('<img src="local-art/units/glasgow.png"'));
  assert(run("ART.portrait('suzaku')").includes('object-position:40% 20%'));
  assert(!run("ART.unit('sutherland')").includes('<img'));
  assert(!run("ART.portrait('leila')").includes('<img'));
  run('ART.useLocal({})');
  assert(!run("ART.unit('glasgow')").includes('<img'));
  const read = registered[0].execute({});
  assert.equal(read.player, 'cf');
  registered[1].execute({ unitId: run('ownUnits()[0].id') });
  assert.throws(() => registered[1].execute({ unitId: -1 }), /Invalid/);
  run('game.over={winner:game.player,reason:"Test victory"};resultDialog();');
  assert(modal().includes('The world bows.'));
  assert(modal().includes('Command tokens earned'));
  const tokens = JSON.parse(storage['knightmare-conquest-profile']).tokens;
  assert(tokens > 0);
  run('resultDialog();');
  assert.equal(JSON.parse(storage['knightmare-conquest-profile']).tokens, tokens);
  console.log(
    'PASS: start menu, all dialogs and the map render for all three powers; rival turns complete; saves and rewards are coherent; WebMCP tools validate input.',
  );
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});

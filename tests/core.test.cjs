const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
const C = require('../dist/campaign.js');

function blank(player = 'britannia', size = 12) {
  const g = E.createGame(player, 'normal', 'conquest', 123);
  g.cols = size;
  g.rows = size;
  g.wrap = false;
  g.tiles = Array.from({ length: size * size }, (_, n) => ({
    c: n % size,
    r: Math.floor(n / size),
    terrain: 'plains',
    owner: null,
  }));
  g.units = [];
  g.nextId = 1;
  g.sites = [];
  g.phase = player;
  g.over = null;
  g.fallen = {};
  g.stations = E.MAJORS.map((owner, id) => ({
    id,
    name: owner,
    c: id === 0 ? 0 : size - 1,
    r: id === 2 ? size - 1 : 0,
    owner,
    tier: 3,
    capital: true,
    capitalOf: owner,
    fort: false,
    shield: 100,
    maxShield: 100,
    income: 10,
    industry: 10,
    science: 1,
    producedTurn: 0,
  }));
  for (const side of E.MAJORS) {
    g.economy[side] = { credits: 5000, industry: 5000, science: 0, sakuradite: 500 };
  }
  return g;
}

test('Conquest initializes coherently for every playable power', () => {
  for (const side of E.MAJORS) {
    const g = E.createGame(side, 'normal', 'conquest', 7);
    assert.equal(g.player, side);
    assert.equal(g.tiles.length, g.cols * g.rows);
    assert(g.units.length > 0 && g.stations.length > 0);
    assert.equal(new Set(g.order).size, E.MAJORS.length);
    for (const major of E.MAJORS) assert(g.order.includes(major));

    for (const u of g.units) {
      assert(E.TYPES[u.type], `unknown unit type ${u.type}`);
      assert(!u.cmd || E.COMMANDERS[u.cmd], `unknown commander ${u.cmd}`);
      assert(u.c >= 0 && u.c < g.cols && u.r >= 0 && u.r < g.rows);
    }
    for (const major of E.MAJORS) {
      assert(g.stations.some(s => s.owner === major), `${major} must start with a city`);
    }
  }
});

test('Core combat keeps breakthrough and movement rules intact', () => {
  const g = blank();

  const heavy = E.newUnit(g, E.typeFor('britannia', 'heavy'), 'britannia', 5, 5);
  const victim = E.newUnit(g, E.typeFor('eu', 'scout'), 'eu', 6, 5);
  victim.hp = 1;
  const heavyHit = E.attack(g, heavy.id, victim.c, victim.r);
  assert(heavyHit.ok && heavyHit.destroyed);
  assert.equal(heavy.attacked, false, 'heavy frame may fire again after a kill');
  assert.equal(heavy.moved, false, 'relentless heavy frame regains movement on its first kill');
  assert(E.reachable(g, heavy).size > 0, 'movement is actually available after the kill');

  const line = E.newUnit(g, E.typeFor('britannia', 'light'), 'britannia', 5, 8);
  const secondVictim = E.newUnit(g, E.typeFor('eu', 'scout'), 'eu', 6, 8);
  secondVictim.hp = 1;
  const lineHit = E.attack(g, line.id, secondVictim.c, secondVictim.r);
  assert(lineHit.ok && lineHit.destroyed);
  assert.equal(line.attacked, false, 'line frame gets its normal breakthrough shot');
  assert.equal(line.moved, true, 'ordinary breakthrough does not also restore movement');
  assert.equal(E.reachable(g, line).size, 0);
});

test('The conquest AI can take a turn without throwing', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 11);
  const side = g.order.find(s => s !== g.player);
  E.beginTurn(g, side, false);
  E.aiProduction(g);
  const units = g.units.filter(u => u.hp > 0 && u.side === side).slice(0, 12);
  assert(units.length > 0);
  for (const u of units) E.aiOrder(g, u.id);
  assert.equal(g.phase, side);
});

test('Every campaign mission builds with valid references', () => {
  const ids = Object.values(C.CAMPAIGNS).flatMap(c => c.missions.map(m => m.id));
  assert(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length, 'campaign mission ids must be unique');

  for (const id of ids) {
    const m = C.mission(id);
    const g = C.createMission(id, 7);
    assert.equal(g.mode, 'campaign', id);
    assert.equal(g.tiles.length, g.cols * g.rows, id);
    assert(g.campaign?.queue?.length > 0, `${id}: missing opening briefing`);

    for (const u of g.units) {
      assert(E.TYPES[u.type], `${id}: unknown frame ${u.type}`);
      assert(!u.cmd || E.COMMANDERS[u.cmd], `${id}: unknown commander ${u.cmd}`);
      assert(u.c >= 0 && u.c < g.cols && u.r >= 0 && u.r < g.rows, `${id}: unit outside map`);
    }

    for (const ev of m.events || []) {
      for (const spawn of ev.spawn || []) {
        assert(E.TYPES[spawn[1]] || E.CLASS_ORDER.includes(spawn[1]), `${id}: unknown spawn ${spawn[1]}`);
      }
    }

    for (const objective of [...[m.win].flat(), ...(m.stars || [])]) {
      for (const name of objective.capture || objective.keep || objective.reach || []) {
        assert(g.stations.some(s => s.name === name), `${id}: objective references missing city ${name}`);
      }
    }
  }
});

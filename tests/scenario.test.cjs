'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const japan = require('../dist/scenarios.js');

const city = (g, name) => g.stations.find(s => s.name === name);
function landReachable(g, origin, destination) {
  const start = city(g, origin), finish = city(g, destination);
  const seen = new Set([E.key(start)]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    if (E.key(queue[i]) === E.key(finish)) return true;
    for (const n of E.adjacent(g, queue[i])) {
      const key = E.key(n);
      if (n.terrain !== 'sea' && !seen.has(key)) {
        seen.add(key);
        queue.push(n);
      }
    }
  }
  return false;
}

test('Japan concentrates the island chain into a detailed 152 × 42 regional theatre', () => {
  const g = japan.create('britannia', 'normal', 11);
  assert.equal(g.mode, 'scenario');
  assert.equal(g.wrap, false);
  assert.equal(g.cols, 152);
  assert.equal(g.rows, 42);
  assert.equal(g.tiles.length, 6384);
  assert.equal(g.scenario.projection.angle, 48);
  assert.equal(g.stations.length, 44);
  assert.equal(new Set(g.stations.map(s => E.key(s))).size, 44);
  assert.equal(new Set(g.units.map(u => E.key(u))).size, g.units.length);
  assert.ok(g.tiles.some(t => t.terrain === 'mountain'));
  assert.ok(g.tiles.some(t => t.terrain === 'forest'));
  assert.ok(g.tiles.some(t => t.terrain === 'coast'));
  assert.ok(g.tiles.some(t => t.terrain === 'sea'));
  assert.ok(g.stations.every(s => E.tile(g, s.c, s.r).terrain !== 'sea'));
  assert.ok(g.units.every(u => E.TYPES[u.type].naval || E.tile(g, u.c, u.r).terrain !== 'sea'));
  assert.ok(g.tiles.every(t => t.terrain === 'sea' || (t.owner && t.provinceCity != null)));
});

test('Regional map removes most deep-ocean cells without losing Japanese land', () => {
  const g = japan.create('britannia', 'normal', 11);
  const land = g.tiles.filter(t => t.terrain !== 'sea').length;
  const sea = g.tiles.length - land;
  assert.ok(land >= 1350, 'detailed islands retain at least 1350 land hexes');
  assert.ok(land / g.tiles.length > 0.20, 'regional island land share exceeds 20%');
  assert.ok(sea < 5000, 'fewer than 5000 ocean hexes remain');
  assert.equal(g.stations.length, 44, 'all original Japan cities remain present');
});

test('Takamatsu stays on Shikoku, straits and other islands are not accidental land bridges', () => {
  const g = japan.create('britannia', 'normal', 22);
  assert.equal(landReachable(g, 'Takamatsu', 'Matsuyama'), true);
  assert.equal(landReachable(g, 'Takamatsu', 'Kobe'), false);
  assert.equal(landReachable(g, 'Kitakyushu', 'Shimonoseki'), false);
  assert.equal(landReachable(g, 'Sapporo', 'Aomori'), false);
  assert.equal(E.tile(g, 31, 16).terrain, 'sea');
});

test('All Kyushu cities, provinces and shoreline hexes start as Chinese Federation land', () => {
  const g = japan.create('cf', 'normal', 23);
  const kyushuNames = ['Kitakyushu','Fukuoka','Nagasaki','Sasebo',
    'Oita','Kumamoto','Miyazaki','Kagoshima'];
  for (const name of kyushuNames)
    assert.equal(city(g, name).owner, 'cf', name + ' should be Chinese');
  const first = city(g, 'Kumamoto'), queue = [E.tile(g, first.c, first.r)],
    seen = new Set([E.key(first)]);
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    assert.equal(t.owner, 'cf', 'Kyushu hex ' + E.key(t));
    assert.equal(g.stations[t.provinceCity].owner, 'cf');
    for (const n of E.adjacent(g, t)) {
      const key = E.key(n);
      if (n.terrain !== 'sea' && !seen.has(key)) {
        seen.add(key);
        queue.push(n);
      }
    }
  }
  assert.ok(queue.length > 100, 'test traverses the entire Kyushu landmass');
  assert.equal(landReachable(g, 'Kumamoto', 'Shimonoseki'), false,
    'Kanmon Strait still prevents accidental land movement');
  assert.ok(g.units.filter(u => u.side === 'britannia' && !E.TYPES[u.type].naval)
    .every(u => E.tile(g, u.c, u.r).owner === 'britannia'),
    'Britannian starting troops remain outside Chinese territory');
  assert.deepEqual(g.scenario.bounds, japan.bounds);
});

test('Black Knights use near-black political colouring with a gold UI accent', () => {
  const g = japan.create('bk', 'normal', 17);
  assert.equal(E.FACTIONS.bk.color, '#18181f');
  assert.equal(g.factions.bk.color, '#18181f');
  assert.ok(g.tiles.some(t => t.owner === 'bk'),
    'Black Knight territorial provinces remain identifiable');
});

test('All three playable factions share one map, can act and have the expected forces', () => {
  const expected = { britannia: [31, 20], bk: [5, 13], cf: [8, 29] };
  const starts = [];
  for (const player of japan.sides) {
    const g = japan.create(player, 'normal', 11);
    assert.equal(g.player, player);
    assert.equal(g.order[0], player);
    assert.deepEqual(new Set(g.order), new Set(japan.sides));
    assert.equal(E.alive(g, 'bk'), true);
    assert.equal(E.foe(g, 'britannia', 'bk'), false);
    assert.equal(E.foe(g, 'britannia', 'cf'), true);
    assert.equal(E.foe(g, 'bk', 'cf'), true);
    assert.equal(g.units.length, 62);
    assert.equal(g.startUnits.britannia, 20);
    assert.equal(g.units.filter(u => u.side === 'britannia' && E.TYPES[u.type].naval).length, 6);
    for (const side of japan.sides)
      assert.deepEqual([
        g.stations.filter(s => s.owner === side).length,
        g.units.filter(u => u.side === side).length
      ], expected[side]);
    starts.push(g.tiles.map(t => t.terrain).join(','));
    assert.equal(E.checkVictory(g), null);
  }
  assert.equal(starts[0], starts[1]);
  assert.equal(starts[1], starts[2]);
});

test('Scenario initialization never constructs a disposable world conquest', () => {
  const before = E.createGame;
  E.createGame = () => { throw Error('Unexpected world initialization'); };
  try {
    assert.equal(japan.create('bk').tiles.length, 6384);
  } finally {
    E.createGame = before;
  }
});

test('Nine legal ports, fourteen waterborne formations and Japanese Sakuradite sites', () => {
  const g = japan.create('cf');
  const ports = g.stations.filter(s => s.portAt);
  assert.equal(ports.length, 9);
  assert.equal(new Set(ports.map(s => E.key(s.portAt))).size, ports.length);
  assert.ok(ports.every(s => E.tile(g, s.portAt.c, s.portAt.r).terrain === 'sea'));
  const ships = g.units.filter(u => E.TYPES[u.type].naval);
  assert.equal(ships.length, 14);
  assert.ok(ships.every(u => E.tile(g, u.c, u.r).terrain === 'sea'));
  assert.deepEqual(g.sites.map(d => d.name), ['Mount Fuji', 'Hokkaido', 'Kyushu']);
  assert.ok(E.income(g, 'bk').sakuradite > 0);
  assert.ok(E.income(g, 'cf').sakuradite > 0);
});

test('Opening economy: China and Black Knights earn around 300 credits and China holds four turns of reserves', () => {
  const normal = {
    britannia: { credits: 400, industry: 220, science: 42, sakuradite: 28 },
    bk:         { credits: 300, industry: 175, science: 32, sakuradite: 12 },
    cf:         { credits: 320, industry: 185, science: 34, sakuradite: 15 },
  };
  for (const player of japan.sides) {
    for (const difficulty of ['normal', 'hard', 'challenge']) {
      const g = japan.create(player, difficulty, 11);
      for (const side of japan.sides) {
        const factor = side === player ? 1 : difficulty === 'challenge' ? 1.6 :
          difficulty === 'hard' ? 1.3 : 1;
        const expected = Object.fromEntries(
          Object.entries(normal[side]).map(([resource, amount]) =>
            [resource, Math.round(amount * factor)]));
        assert.deepEqual(E.income(g, side), expected);
        for (const [resource, amount] of Object.entries(expected))
          assert.equal(g.economy[side][resource], (side === 'cf' ? 4 : 2) * amount);
      }
    }
  }
});

test('Captured cities change income and preserve fixed command funding', () => {
  const g = japan.create('cf', 'normal', 11);
  const fundingBefore = { ...g.scenario.funding.cf };
  const beforeBritannia = E.income(g, 'britannia');
  const beforeChina = E.income(g, 'cf');
  const hiroshima = city(g, 'Hiroshima');
  hiroshima.owner = 'cf';
  const afterBritannia = E.income(g, 'britannia');
  const afterChina = E.income(g, 'cf');
  assert.ok(afterBritannia.credits < beforeBritannia.credits);
  assert.ok(afterBritannia.industry < beforeBritannia.industry);
  assert.ok(afterChina.credits > beforeChina.credits);
  assert.ok(afterChina.industry > beforeChina.industry);
  assert.deepEqual(g.scenario.funding.cf, fundingBefore);
});

test('Difficulty selector changes rival formation strength while preserving the map', () => {
  const normal = japan.create('bk', 'normal', 11);
  const hard = japan.create('bk', 'hard', 11);
  const challenge = japan.create('bk', 'challenge', 11);
  const strength = g => g.units.filter(u => u.side !== g.player).reduce((n, u) => n + u.stack, 0);
  assert.ok(strength(hard) > strength(normal));
  assert.ok(strength(challenge) > strength(hard));
  assert.deepEqual(normal.stations.map(s => E.key(s)), hard.stations.map(s => E.key(s)));
});

test('Army group orders assign actual unit destinations, not just visual labels', () => {
  const g = japan.create('bk', 'normal', 11);
  assert.ok(g.scenario.groups.length >= 20);
  const group = g.scenario.groups.find(x => x.side === 'bk' && x.origin === 'Kyoto');
  assert.ok(group);
  const t = city(g, 'Tokyo Settlement');
  const result = japan.orderGroup(g, group.id, t);
  assert.equal(result.ok, true);
  assert.ok(result.assigned > 0);
  assert.ok(group.units.some(id => g.units.find(u => u.id === id)?.goto));
  assert.equal(japan.orderGroup(g, 'invalid-id', t).ok, false);
});

test('Alliance changes exactly once on turn 10 and faction victory goals differ', () => {
  const g = japan.create('britannia', 'normal', 11);
  g.turn = 9;
  assert.equal(japan.onTurn(g), false);
  assert.equal(E.foe(g, 'britannia', 'bk'), false);
  g.turn = 10;
  assert.equal(japan.onTurn(g), true);
  assert.equal(E.foe(g, 'britannia', 'bk'), true);
  assert.equal(japan.onTurn(g), false);
  assert.equal(g.scenario.phase, 'three-way-war');
  assert.notEqual(japan.objective(g, 'britannia'), japan.objective(g, 'cf'));
  assert.notEqual(japan.objective(g, 'bk'), japan.objective(g, 'britannia'));
});

test('Controlling required regional strongholds actually wins a scenario', () => {
  const g = japan.create('cf', 'normal', 11);
  g.turn = 14;
  g.scenario.phase = 'three-way-war';
  for (const s of g.stations) s.owner = 'cf';
  assert.equal(E.checkVictory(g).winner, 'cf');
});

test('Scenario defeat does not assign victory to an arbitrary survivor', () => {
  const g = japan.create('bk', 'normal', 11);
  g.turn = 11;
  for (const s of g.stations)
    if (s.owner === 'bk') s.owner = 'cf';
  // China leads overwhelmingly, but Britannia is still alive and neither
  // side has secured the whole war. The eliminated player has merely lost.
  const result = E.checkVictory(g);
  assert.equal(result.eliminated, true);
  assert.equal(result.winner, null);
  assert.ok(result.reason.includes('war continues'));
  assert.ok(result.reason.includes(E.FACTIONS.cf.name));
  assert.ok(result.reason.includes(E.FACTIONS.britannia.name));
});

test('Scenario defeat names the real winner if one power remains', () => {
  const g = japan.create('bk', 'normal', 11);
  g.turn = 11;
  for (const s of g.stations) s.owner = 'cf';
  const result = E.checkVictory(g);
  assert.equal(result.eliminated, true);
  assert.equal(result.winner, 'cf');
});

test('Both AI enemies can produce and act without crashing in all three modes', () => {
  for (const player of japan.sides) {
    const g = japan.create(player, 'normal', 21);
    for (const side of g.order.slice(1)) {
      E.beginTurn(g, side, false);
      E.aiProduction(g);
      for (const id of g.units.filter(u => u.hp > 0 && u.side === side).map(u => u.id))
        E.aiOrder(g, id);
    }
    E.beginTurn(g, g.player, true);
    assert.equal(E.checkVictory(g), null);
  }
});

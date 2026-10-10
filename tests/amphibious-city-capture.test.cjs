const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

function battlefield() {
  const g = E.createGame('britannia', 'normal', 'conquest', 23);
  g.cols = g.rows = 12;
  g.wrap = false;
  g.tiles = Array.from({ length: 144 }, (_, i) => ({
    c: i % 12, r: Math.floor(i / 12), terrain: 'plains', owner: null,
  }));
  g.units = [];
  g.sites = [];
  g.nextId = 1;
  g.phase = 'britannia';
  g.over = null;
  g.stations = [
    { id: 0, name: 'Home', owner: 'britannia', c: 1, r: 1, tier: 1, shield: 100, maxShield: 200 },
    { id: 1, name: 'Target', owner: 'eu', c: 5, r: 5, tier: 1, shield: 180, maxShield: 200 },
    { id: 2, name: 'Reserve', owner: 'eu', c: 10, r: 10, tier: 1, shield: 100, maxShield: 200 },
    { id: 3, name: 'Federation', owner: 'cf', c: 1, r: 10, tier: 1, shield: 100, maxShield: 200 },
  ];
  E.tile(g, 4, 5).terrain = 'sea';
  return g;
}
const city = g => g.stations[1];

test('Each faction amphibious unit can seize an empty city with full defenses', () => {
  for (const side of E.MAJORS) {
    const g = battlefield();
    g.phase = g.player = side;
    if (side === 'eu') city(g).owner = 'britannia';
    const u = E.newUnit(g, E.NAVAL[side].amphibious, side, 4, 5);
    assert(E.reachable(g, u).has('5,5'), side);
    const result = E.move(g, u.id, 5, 5);
    assert.equal(result.ok, true, side);
    assert.equal(result.captured, 'Target', side);
    assert.equal(city(g).owner, side);
    assert.equal(city(g).shield, 0);
  }
});

test('Sea transports capture empty enemy cities but land units still need shields removed', () => {
  const g = battlefield();
  const raft = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 4, 5);
  assert(E.atSea(g, raft));
  assert.equal(E.move(g, raft.id, 5, 5).captured, 'Target');
  assert(!E.atSea(g, raft));
  const land = battlefield();
  E.tile(land, 4, 5).terrain = 'plains';
  const troop = E.newUnit(land, E.typeFor('britannia', 'scout'), 'britannia', 4, 5);
  assert(!E.reachable(land, troop).has('5,5'));
  city(land).shield = 0;
  assert.equal(E.move(land, troop.id, 5, 5).captured, 'Target');
});

test('Carrier cargo deploys directly onto empty enemy cities and triggers normal capture effects', () => {
  const g = battlefield();
  const ship = E.newUnit(g, E.NAVAL.britannia.carrier, 'britannia', 4, 5);
  const rider = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 3, 5);
  assert.equal(E.move(g, rider.id, 4, 5).loaded, ship.id);
  assert(E.deployTargets(g, ship, 0).some(t => t.c === 5 && t.r === 5));
  const credits = g.economy.britannia.credits;
  const landing = E.deploy(g, ship.id, 0, 5, 5);
  assert.equal(landing.ok, true);
  assert.equal(landing.captured, 'Target');
  assert.equal(city(g).owner, 'britannia');
  assert.equal(city(g).shield, 0);
  assert.equal(g.economy.britannia.credits, credits + 40);
  assert.equal(landing.unit.moved, false);
  assert.equal(landing.unit.attacked, false);
  assert.equal(ship.cargo.length, 0);
  assert.equal(g.units.filter(u => u.id === rider.id).length, 1);
});

test('Carrier-loaded artillery can capture an empty city but ordinary artillery cannot', () => {
  const g = battlefield();
  const ship = E.newUnit(g, E.NAVAL.britannia.carrier, 'britannia', 4, 5);
  const gun = E.newUnit(g, E.typeFor('britannia', 'support'), 'britannia', 3, 5);
  assert.equal(E.move(g, gun.id, 4, 5).loaded, ship.id);
  assert.equal(E.deploy(g, ship.id, 0, 5, 5).captured, 'Target');
  const land = battlefield();
  E.tile(land, 4, 5).terrain = 'plains';
  city(land).shield = 0;
  const ordinaryGun = E.newUnit(land, E.typeFor('britannia', 'support'), 'britannia', 4, 5);
  assert(!E.reachable(land, ordinaryGun).has('5,5'));
});

test('Enemy garrisons block amphibious, transport and carrier deployments', () => {
  for (const kind of ['amphibious', 'transport', 'carrier']) {
    const g = battlefield();
    E.newUnit(g, E.typeFor('eu', 'scout'), 'eu', 5, 5);
    const type = kind === 'amphibious' ? E.NAVAL.britannia.amphibious
      : kind === 'carrier' ? E.NAVAL.britannia.carrier
      : E.typeFor('britannia', 'scout');
    const u = E.newUnit(g, type, 'britannia', 4, 5);
    assert(!E.reachable(g, u).has('5,5'), kind);
    if (kind === 'carrier') {
      const rider = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 3, 5);
      assert.equal(E.move(g, rider.id, 4, 5).loaded, u.id);
      assert(!E.deployTargets(g, u, 0).some(t => t.c === 5 && t.r === 5));
      assert.equal(E.deploy(g, u.id, 0, 5, 5).ok, false);
    }
    assert.equal(city(g).owner, 'eu');
  }
});

test('Carrier landing respects surviving enemy-occupied ports and transfers provinces', () => {
  const g = battlefield(), target = city(g);
  target.portAt = { c: 6, r: 5 };
  target.portOwner = 'eu';
  E.tile(g, 6, 5).terrain = 'sea';
  E.newUnit(g, E.NAVAL.eu.carrier, 'eu', 6, 5);
  const hex = E.tile(g, 5, 5);
  hex.owner = 'eu';
  hex.provinceCity = target.id;
  const ship = E.newUnit(g, E.NAVAL.britannia.carrier, 'britannia', 4, 5);
  const rider = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 3, 5);
  assert.equal(E.move(g, rider.id, 4, 5).loaded, ship.id);
  const result = E.deploy(g, ship.id, 0, 5, 5);
  assert.equal(result.captured, 'Target');
  assert.equal(target.portOwner, 'eu');
  assert.equal(hex.owner, 'britannia');
});

test('Carrier capture triggers surrender when the last hostile city falls', () => {
  const g = battlefield();
  g.stations = g.stations.filter(s => s.id !== 2);
  const ship = E.newUnit(g, E.NAVAL.britannia.carrier, 'britannia', 4, 5);
  const rider = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 3, 5);
  assert.equal(E.move(g, rider.id, 4, 5).loaded, ship.id);
  const result = E.deploy(g, ship.id, 0, 5, 5);
  assert.equal(result.captured, 'Target');
  assert.equal(result.annexed?.loser, 'eu');
  assert.equal(g.fallen.eu.by, 'britannia');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

function battlefield() {
  const g = E.createGame('britannia', 'normal', 'conquest', 19);
  g.cols = g.rows = 12;
  g.wrap = false;
  g.tiles = Array.from({ length: g.cols * g.rows }, (_, i) => ({
    c: i % g.cols, r: Math.floor(i / g.cols), terrain: 'plains', owner: null,
  }));
  g.units = [];
  g.nextId = 1;
  g.sites = [];
  g.phase = 'britannia';
  g.over = null;
  g.stations = E.MAJORS.map((owner, i) => ({
    id: i, name: ['Player Base', 'Target City', 'Other City'][i],
    c: [1, 5, 10][i], r: [1, 5, 10][i], owner,
    tier: 1, capital: false, fort: false, shield: 100, maxShield: 200,
    income: 12, industry: 6, science: 2, producedTurn: 0,
  }));
  return g;
}

test('A friendly city heals its defenses, not an unskilled garrison', () => {
  const g = battlefield();
  const city = g.stations[0];
  const u = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', city.c, city.r);
  u.hp = Math.round(E.maxHP(u) / 2);
  const before = u.hp;
  E.beginTurn(g, 'britannia', false);
  assert.equal(city.shield, 124, 'unattacked city recovers 12% of maximum defenses');
  assert.equal(u.hp, before, 'a friendly city grants no automatic 8% unit healing');
});

test('An enemy city assault halves only the next regeneration, even within the same round', () => {
  const g = battlefield();
  const city = g.stations[1];
  const attacker = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 4, 5);
  assert.equal(E.attack(g, attacker.id, 5, 5).ok, true, 'valid city assault');
  assert.equal(city.attackedSinceRegen, true);
  city.shield = 50;
  E.beginTurn(g, 'eu', false); // The defender follows the attacker in this round.
  assert.equal(city.shield, 62, 'half of 12% of 200 is 12');
  assert.equal(city.attackedSinceRegen, undefined, 'attack flag is consumed');
  E.beginTurn(g, 'eu', false);
  assert.equal(city.shield, 86, 'without a new attack, normal 24-point recovery resumes');
});

test('A fresh attack in the next round halves the next regeneration again', () => {
  const g = battlefield(), city = g.stations[1];
  const attacker = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 4, 5);
  assert.equal(E.attack(g, attacker.id, 5, 5).ok, true);
  city.shield = 20;
  E.beginTurn(g, 'eu', false);
  assert.equal(city.shield, 32);
  g.turn++;
  g.phase = 'britannia';
  attacker.attacked = false;
  assert.equal(E.attack(g, attacker.id, 5, 5).ok, true);
  city.shield = 20;
  E.beginTurn(g, 'eu', false);
  assert.equal(city.shield, 32);
});

test('Engineering upgrades are halved after an attack, not overwritten', () => {
  const g = battlefield(), city = g.stations[1];
  g.tech.eu['cities.engineering'] = 2;
  city.attackedSinceRegen = true;
  E.beginTurn(g, 'eu', false);
  assert.equal(city.shield, 120, 'half of the researched 20% of maximum defenses');
  E.beginTurn(g, 'eu', false);
  assert.equal(city.shield, 160, 'full 20% after an undisturbed turn');
});

test('Attacks on defended city hexes count when shield is already depleted', () => {
  const g = battlefield(), city = g.stations[1];
  city.shield = 0;
  const defender = E.newUnit(g, E.typeFor('eu', 'scout'), 'eu', 5, 5);
  const attacker = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 4, 5);
  assert(defender.hp > 0);
  assert.equal(E.attack(g, attacker.id, 5, 5).ok, true);
  assert.equal(city.attackedSinceRegen, true);
  E.beginTurn(g, 'eu', false);
  assert.equal(city.shield, 12);
});

test('Unsuccessful attacks do not reduce city regeneration', () => {
  const g = battlefield(), city = g.stations[1];
  const attacker = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 4, 5);
  assert.equal(E.attack(g, attacker.id, 11, 11).ok, false);
  assert.equal(city.attackedSinceRegen, undefined);
  E.beginTurn(g, 'eu', false);
  assert.equal(city.shield, 124);
});

test('An attack marker persists across compact saves until regeneration', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 19);
  const city = g.stations.find(s => s.name === 'Auckland');
  city.attackedSinceRegen = true;
  city.shield = 50;
  const restored = E.migrateSave(E.packSave(g));
  assert(restored);
  const savedCity = restored.stations.find(s => s.id === city.id);
  assert.equal(savedCity.attackedSinceRegen, true);
  const normal = Math.round(savedCity.maxShield * 0.12);
  E.beginTurn(restored, 'britannia', false);
  assert.equal(savedCity.shield, Math.min(savedCity.maxShield, 50 + Math.round(savedCity.maxShield * 0.06)));
  assert.equal(savedCity.attackedSinceRegen, undefined);
  assert(normal > 0);
});

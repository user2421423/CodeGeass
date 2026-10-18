#!/usr/bin/env node
'use strict';
// Deterministic compatibility checks for the engine's shared tactical action interface.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const SIDE = 'britannia';
let cases = 0;
function test(name, fn) {
  fn();
  cases++;
  console.log('PASS ' + name);
}
// Place a ready frame beside an enemy city to exercise the real battle engine.
// The fixture has no dependency on a particular scenario's initial unit placements.
function cityFixture(cls = 'scout', withDefender = false, seed = 317) {
  const g = E.createGame(SIDE, 'normal', 'conquest', seed);
  const type = E.typeFor(SIDE, cls, g);
  assert.ok(E.TYPES[type], 'expected class ' + cls);
  const cities = g.stations.filter(s => s.owner === 'eu' && s.shield > 0);
  let city, spot;
  for (const s of cities) {
    const p = E.adjacent(g, s).find(t =>
      !E.isSea(t) && !E.internal.TERRAIN[t.terrain]?.blocked &&
      !E.unitAt(g, t) && !E.stationAt(g, t));
    if (p && !E.unitAt(g, s)) { city = s; spot = p; break; }
  }
  assert.ok(city && spot, 'expected an unoccupied approach to an EU city');
  const actor = E.newUnit(g, type, SIDE, spot.c, spot.r);
  if (withDefender) E.newUnit(g, E.typeFor('eu', 'scout', g), 'eu', city.c, city.r);
  city.shield = 1;
  g.phase = SIDE;
  assert.ok(E.preview(g, actor.id, city.c, city.r), 'fixture target must be legal');
  return { g, actor, city };
}
test('unknown action and invalid actor have no side effects', () => {
  const { g, city } = cityFixture();
  const before = JSON.stringify(g);
  for (const action of [
    { kind: 'attack', id: -1, c: city.c, r: city.r },
    { kind: 'move', id: -1, c: city.c, r: city.r },
    { kind: 'repair', id: -1 },
    { kind: 'reinforce', id: -1 },
    { kind: 'commander', id: -1 },
    { kind: 'deploy', id: -1, index: 0, c: city.c, r: city.r },
    { kind: 'fortress', id: -1, c: city.c, r: city.r },
    { kind: 'nonsense', id: -1 }
  ]) {
    assert.equal(E.validateAction(g, action).ok, false);
    assert.equal(E.resolveAction(g, action).ok, false);
  }
  assert.equal(JSON.stringify(g), before, 'invalid actions must not corrupt state');
});
test('attack direct and dispatch preserve identical seeded combat', () => {
  const one = cityFixture('scout', true), two = cityFixture('scout', true);
  const direct = E.attack(one.g, one.actor.id, one.city.c, one.city.r);
  const shared = E.resolveAction(two.g, { kind: 'attack', id: two.actor.id, c: two.city.c, r: two.city.r });
  assert.ok(direct.ok);
  assert.deepEqual(shared, direct);
  assert.equal(JSON.stringify(two.g), JSON.stringify(one.g));
});
test('city-defense break is reported and repeated fire remains legal only if refreshed', () => {
  const { g, actor, city } = cityFixture('heavy');
  const r = E.resolveAction(g, { kind: 'attack', id: actor.id, c: city.c, r: city.r });
  assert.ok(r.ok);
  assert.equal(r.defensesDestroyed, true);
  assert.equal(r.shieldDamage, 1);
  assert.equal(city.shield, 0);
  assert.equal(r.breakthrough, true, 'heavy Breakthrough should recognize a city-defense break');
  assert.equal(actor.attacked, false);
  assert.equal(E.validateAction(g, { kind: 'attack', id: actor.id, c: city.c, r: city.r }).ok, false,
    'empty city with destroyed defenses is no longer a hostile fire target');
});
test('ordinary city-defense break grants no invented attack refresh', () => {
  const { g, actor, city } = cityFixture('scout');
  const r = E.attack(g, actor.id, city.c, city.r);
  assert.ok(r.ok && r.defensesDestroyed);
  assert.equal(actor.attacked, true);
  const prior = JSON.stringify(g);
  assert.equal(E.attack(g, actor.id, city.c, city.r).ok, false);
  assert.equal(JSON.stringify(g), prior);
});
test('damage versus frame and city shields remains separately reported', () => {
  const { g, actor, city } = cityFixture('scout', true);
  const r = E.attack(g, actor.id, city.c, city.r);
  assert.ok(r.ok);
  assert.ok(r.damage >= 0);
  assert.equal(r.shieldDamage, 1);
  assert.ok(r.hit.some(h => h.c === city.c && h.r === city.r));
});
test('heavy movement action ceiling is respected by validator', () => {
  const { g, actor } = cityFixture('heavy');
  actor.moved = false;
  actor.attacked = false;
  actor.moveActionTurn = g.turn;
  actor.moveActionsThisTurn = 2;
  assert.equal(E.reachable(g, actor).size, 0);
  const p = E.adjacent(g, actor)[0];
  const before = JSON.stringify(g);
  assert.equal(E.validateAction(g, { kind: 'move', id: actor.id, c: p.c, r: p.r }).ok, false);
  assert.equal(JSON.stringify(g), before);
});
test('repair, reinforce and commander preflight matches original reason helpers', () => {
  const { g, actor } = cityFixture();
  for (const [kind, reason] of [
    ['repair', E.repairReason(g, actor)],
    ['reinforce', E.reinforceReason(g, actor)],
    ['commander', E.feintReason(g, actor)]
  ]) {
    const check = E.validateAction(g, { kind, id: actor.id });
    assert.equal(check.ok, !reason);
    if (reason) assert.equal(check.reason, reason);
  }
});
test('repeated illegal movement preserves original state', () => {
  const { g, actor } = cityFixture();
  const before = JSON.stringify(g);
  assert.equal(E.resolveAction(g, { kind: 'move', id: actor.id, c: -999, r: -999 }).ok, false);
  assert.equal(JSON.stringify(g), before);
});
console.log('Unified action regression checks: ' + cases + ' passed.');

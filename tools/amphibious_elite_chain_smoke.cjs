#!/usr/bin/env node
'use strict';
// Real-engine regression: all four Amphibious Elites chain movement and attacks
// after every unit kill at every Elite level. Regular Amphibious II cannot.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const side = 'britannia';
const enemy = 'eu';
const adjacent = (g, p) => E.internal.adjacent(g, p);
const clearLand = (g, p) =>
  p && p.terrain === 'plains' && !E.internal.stationAt(g, p);
const key = p => p.c + ',' + p.r;

function setup(type, level) {
  const g = E.createGame(side, 'normal', 'conquest', 20261018, 'world');
  g.phase = side;
  g.units = []; // Leave the world's cities intact to prevent premature victory.
  const start = g.tiles.find(p => clearLand(g, p) &&
    adjacent(g, p).some(n => clearLand(g, n) &&
      adjacent(g, n).some(m => clearLand(g, m) && key(m) !== key(p))));
  assert.ok(start, 'The world contains a land route suitable for a chain test');
  const first = adjacent(g, start).find(n => clearLand(g, n) &&
    adjacent(g, n).some(m => clearLand(g, m) && key(m) !== key(start)));
  const second = adjacent(g, first).find(m => clearLand(g, m) && key(m) !== key(start));
  assert.ok(first && second, 'A two-step route exists');

  const attacker = E.newUnit(g, type, side, start.c, start.r);
  attacker.eliteLevel = level;
  const defenderType = 'panzer_frosch';
  const defender = E.newUnit(g, defenderType, enemy, first.c, first.r);
  defender.hp = 1;
  // Already spent movement: first kill must restore it even if fired after moving.
  attacker.moved = true;
  const shot = E.attack(g, attacker.id, first.c, first.r);
  assert.equal(shot.ok, true, shot.reason || 'First attack should succeed');
  assert.equal(shot.destroyed, true, 'First defender should die');
  assert.equal(attacker.attacked, false, 'First kill should refresh Breakthrough attack');
  return { g, attacker, first, second };
}

const amphElites = Object.entries(E.ELITE_FORCES)
  .filter(([, data]) => E.TYPES[data.type].naval === 'amphibious');
assert.equal(amphElites.length, 4, 'The four factional amphibious elites are present');
for (const [id, elite] of amphElites) {
  for (const level of [1, 5]) {
    const { g, attacker, first, second } = setup(elite.type, level);
    assert.equal(attacker.moved, false, id + ' Lv.' + level + ' regains movement after a kill');
    assert.equal(attacker.eliteMoveAfterKill, true, 'The post-attack movement permission is set');
    assert.ok(E.reachable(g, attacker).has(key(first)), 'The killed unit\'s hex is reachable');
    const step = E.move(g, attacker.id, first.c, first.r);
    assert.equal(step.ok, true, step.reason || 'Elite can move after killing');
    assert.equal(attacker.moved, true, 'Movement is spent normally after the extra move');
    assert.equal(attacker.eliteMoveAfterKill, false, 'Extra movement permission is consumed');

    const another = E.newUnit(g, 'panzer_frosch', enemy, second.c, second.r);
    another.hp = 1;
    const followup = E.attack(g, attacker.id, second.c, second.r);
    assert.equal(followup.ok, true, followup.reason || 'Elite can attack after its extra move');
    assert.equal(followup.destroyed, true, 'Second defender is killed');
    assert.equal(attacker.attacked, false, 'Second kill again refreshes the attack');
    assert.equal(attacker.moved, false, 'Second kill again refreshes movement (no chain cap)');
    assert.equal(attacker.eliteMoveAfterKill, true, 'Second move permission is available');
  }
}
const normal = setup('portman_ii', 1);
assert.equal(normal.attacker.moved, true, 'Regular Type II movement stays spent after a kill');
assert.equal(normal.attacker.eliteMoveAfterKill, false,
  'Regular Type II does not receive Elite movement permission');
assert.equal(normal.g.over, null, 'Test kills do not end the world war');
console.log('Amphibious Elite unlimited movement + attack chains (Lv.1 and Lv.5): PASS');

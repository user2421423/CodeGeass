#!/usr/bin/env node
'use strict';
// Regression: Partition's western Chinese armies must attack the Britannian
// land frontier instead of being committed to the distant E.U. across it.
// Exercise the same packed save/migration path as the browser scenario slot.
const assert = require('node:assert/strict');
const { E } = require('./scenario_sim.cjs');
const scenario = E.scenarios.byId['partition-britannia'];
assert(scenario, 'partition scenario should be registered');
assert.equal(scenario.meta.saveVersion, 1, 'never invalidate existing scenario saves');
assert.equal(scenario.meta.ai.doctrine, 'assault', 'use local objective selection, not Europe theater quotas');
assert.equal(scenario.meta.ai.recovery, true, 'preserve commander recovery');

const original = scenario.create('remnants', 'normal', 11);
const originals = original.units.map(u => [u.id, u.side, u.c, u.r]);
const owners = original.stations.map(s => s.owner);
const packed = JSON.parse(JSON.stringify(E.packSave(original)));
const restored = E.migrateSave(packed);
assert(restored, 'a packed Partition save must migrate successfully');
assert.equal(restored.scenario.id, 'partition-britannia');
assert.equal(restored.scenario.version, 1);
assert.deepEqual(restored.stations.map(s => s.owner), owners, 'save must retain captured territory');
assert.deepEqual(restored.units.map(u => [u.id, u.side, u.c, u.r]), originals,
  'save must retain all formations at their exact positions');

// Model a player with an old save produced under the Europe theater doctrine.
// Persisted wing records must not constrain the new assault AI.
const chinese = restored.units.filter(u => u.hp > 0 && u.side === 'cf');
assert(chinese.length > 40);
restored.ai ||= {};
restored.ai.cf = {
  wings: Object.fromEntries(chinese.map(u => [u.id, 'eu'])),
  wingSince: Object.fromEntries(chinese.map(u => [u.id, restored.turn])),
  assignments: {},
};
E.beginTurn(restored, 'cf', false);
const eligible = chinese.filter(u => !u.attacked).map(u => u.id);
let movers = new Set(), attacks = 0, errors = [];
for (const id of eligible) {
  try {
    const orders = E.aiOrder(restored, id) || [];
    if (orders.some(o => o.kind === 'move' || o.kind === 'deploy')) movers.add(id);
    attacks += orders.filter(o => o.kind === 'attack').length;
  } catch (error) {
    errors.push({ id, error: String(error) });
  }
}
const assignments = Object.values(restored.ai.cf.assignments || {});
const cityByFront = new Map(restored.stations.map(s => ['j' + s.id, s]));
const byTarget = { remnants: 0, eu: 0, other: 0 };
for (const a of assignments) {
  const owner = cityByFront.get(a.front)?.owner;
  byTarget[owner in byTarget ? owner : 'other']++;
}
console.log(JSON.stringify({
  scenario: scenario.id, chinese: chinese.length,
  assigned: assignments.length, targets: byTarget,
  moved: movers.size, attacks, errors: errors.slice(0, 5),
}));
assert.equal(errors.length, 0, 'AI orders must not throw');
assert(assignments.length >= 30, 'Chinese land formations must receive objectives');
assert(byTarget.remnants > byTarget.eu,
  'Chinese land armies should predominantly target the nearer Britannian heartland');
assert(movers.size >= 5,
  'Chinese formations must be able to move toward their objectives after loading a save');
console.log('PASS: Partition AI attacks its land frontier and retains packed saves.');

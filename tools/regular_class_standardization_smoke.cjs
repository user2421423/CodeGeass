#!/usr/bin/env node
'use strict';
// All ordinary EB/CF/neutral frames inherit the standardized class combat stats.
// Siege movement is shared by every faction; bespoke Elite Forces are unaffected.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const fields = ['hp', 'attack', 'armor', 'move', 'min', 'max', 'cost', 'industry',
  'tier', 'crit', 'critMult', 'pen', 'breakthrough', 'relentless', 'float',
  'splash', 'noCounter', 'siege', 'boarding'];

for (const [id, unit] of Object.entries(E.TYPES)) {
  if (unit.elite || unit.naval) continue;
  const standard = E.CLASSES[unit.cls];
  if (['eb', 'cf', 'neutral'].includes(unit.side)) {
    assert.ok(standard, id + ' has a standardized class');
    for (const field of fields)
      assert.equal(unit[field], standard[field],
        id + ' (' + unit.side + ') diverges from ' + unit.cls + ' in ' + field);
  }
  if (unit.cls === 'siege')
    assert.equal(unit.move, 2, id + ' uses the common two-point Siege movement');
}
assert.equal(E.CLASSES.siege.move, 2, 'Siege class has two movement');
for (const id of ['vercingetorix', 'ahura_mazda', 'canterbury', 'shen_hu', 'siegfried'])
  assert.ok(E.TYPES[id], id + ' remains available for Story Mode');

console.log('EB/CF/neutral class standardization and Siege movement: PASS');

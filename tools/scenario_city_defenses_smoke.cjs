#!/usr/bin/env node
'use strict';
// Run after: node tools/build_sources.cjs
// Keep regional starting shields consistent with Conquest's 200/250/300,
// fortified 400, and canonical faction-capital 600 HP progression.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');

for (const [tier, hp] of [[1, 200], [2, 250], [3, 300]]) {
  assert.equal(E.cityDefenseHP(tier, false, false), hp, 'Unfortified tier ' + tier);
  assert.equal(E.scenarioCityDefenseHP(tier, false, 'Sydney'), hp,
    'Regional headquarters should not count as faction capitals');
  assert.equal(E.scenarioCityDefenseHP(tier, true, 'Sydney'), 400,
    'Regional fortification');
  assert.equal(E.cityDefenseHP(tier, true, true), 600,
    'Actual faction capital overrides fortification');
}
for (const name of ['Pendragon', 'Paris', 'Luoyang']) {
  assert.equal(E.scenarioCityDefenseHP(3, true, name), 600,
    'Canonical capital ' + name);
}
for (const name of ['Ottawa', 'Mexico City', 'Melbourne', 'Canberra',
  'St. Petersburg', 'Moscow', 'Sydney', 'Perth', 'Darwin']) {
  assert.equal(E.scenarioCityDefenseHP(3, false, name), 300,
    'Regional HQ is not automatically a world capital: ' + name);
}
const dist = path.resolve(__dirname, '../dist');
const scripts = fs.readdirSync(dist).filter(name => /^scenarios.*\.js$/.test(name));
let covered = 0;
for (const script of scripts) {
  const source = fs.readFileSync(path.join(dist, script), 'utf8');
  if (!/\bconst\s+(?:[^\n;]*?,\s*)?shield\s*=/.test(source)) continue;
  assert.match(source, /\bshield\s*=\s*E\.scenarioCityDefenseHP\(tier, !!fort, name\)/,
    script + ' must use the shared city defense rule');
  assert.doesNotMatch(source, /\bshield\s*=\s*Math\.round\(/,
    script + ' must not retain a custom shield formula');
  covered++;
}
assert.ok(covered >= 34, 'All current regional and Japan scenarios must use shared rules');
console.log('Scenario city defenses: PASS (' + covered + ' scenario definitions)');

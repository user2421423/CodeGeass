#!/usr/bin/env node
'use strict';
// Count the *actual* commander objects, not a regex that assumes property order
// or the particular quoting/whitespace used in a definition.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const registryPath = path.resolve(__dirname, '../dist/engine/commanders.js');
const source = fs.readFileSync(registryPath, 'utf8');
const { COMMANDERS } = require(registryPath);
const start = source.indexOf('  const COMMANDERS = {');
const end = source.indexOf('\n  };', start);
assert.ok(start >= 0 && end > start, 'Commander registry must exist');
const registry = source.slice(start, end);
const multilineIds = [...registry.matchAll(/^    ([A-Za-z0-9_]+): [{]$/gm)].map(match => match[1]);
const actualIds = Object.keys(COMMANDERS);
assert.equal(multilineIds.length, actualIds.length,
  'Each commander must use a multiline definition: four-space key/open brace, then indented fields on following lines');
assert.deepEqual(multilineIds, actualIds, 'Multiline commander keys must match registry entries exactly and in order');
const counts = {};
for (const [id, commander] of Object.entries(COMMANDERS)) {
  assert.ok(typeof commander.name === 'string' && commander.name.trim(), id + ' must have a name');
  assert.ok(typeof commander.side === 'string' && commander.side.trim(), id + ' must have a faction');
  counts[commander.side] = (counts[commander.side] || 0) + 1;
}
console.log('Commander entries: ' + actualIds.length);
for (const [side, count] of Object.entries(counts))
  console.log(side + ': ' + count);
console.log('All commander entries use multiline definitions.');

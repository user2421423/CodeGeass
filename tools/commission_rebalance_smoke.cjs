#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const targets = {
  britannia: {legendary:6,distinguished:9,standard:6},
  eb: {legendary:3,distinguished:4,standard:3},
  eu: {legendary:5,distinguished:9,standard:8},
  cf: {legendary:4,distinguished:8,standard:7},
  bk: {legendary:7,distinguished:11,standard:10}
};
const counts = Object.fromEntries(Object.keys(targets).map(f =>
  [f, {legendary:0, distinguished:0, standard:0}]));
assert.equal(Object.keys(E.COMMANDERS).length, 100);
for (const [id, c] of Object.entries(E.COMMANDERS)) {
  const faction = c.side === 'jlf' ? 'bk' : c.side;
  assert.ok(counts[faction], 'Unexpected faction for ' + id);
  counts[faction][c.commission]++;
}
assert.deepEqual(counts, targets);
assert.equal(E.COMMANDERS.julius.commission, 'legendary');
assert.equal(E.COMMANDERS.norland.commission, 'distinguished');
assert.equal(E.COMMANDERS.rolo.commission, 'distinguished');
assert.equal(E.COMMANDERS.darlton.commission, 'standard');
const oldOfficer = (id, commission, generics = {}) =>
  {...E.defaultOfficer(id, true), commission, generics, rank: 5};
const investedGenerics = Object.fromEntries(
  Object.keys(E.GENERIC_SKILLS).slice(0, 3).map(k => [k, 2]));
assert.equal(Object.keys(investedGenerics).length, 3);
const profile = {tokens:3000,roster:{
  cc: oldOfficer('cc', 'distinguished'),
  norland: oldOfficer('norland', 'legendary'),
  oldrin: oldOfficer('oldrin', 'legendary', investedGenerics),
  guilford: oldOfficer('guilford', 'legendary'),
  euphemia: oldOfficer('euphemia', 'distinguished'),
  rolo: oldOfficer('rolo', 'distinguished')
}};
E.roster(profile);
assert.equal(profile.commissionRebalanceVersion, 1);
assert.equal(profile.roster.cc.commission, 'legendary');
assert.equal(profile.roster.norland.commission, 'distinguished');
assert.equal(profile.roster.oldrin.commission, 'legendary', 'grandfather occupied third slot');
assert.equal(profile.roster.guilford.commission, 'legendary', 'preserve purchased upgrade');
assert.equal(profile.roster.euphemia.commission, 'standard');
assert.equal(profile.roster.rolo.commission, 'distinguished');
assert.equal(profile.roster.cc.rank, 5);
assert.equal(profile.tokens, 3000);
const saved = JSON.stringify(profile);
E.roster(profile);
assert.equal(JSON.stringify(profile), saved, 'one-time profile migration');
const battle = E.createGame('britannia', 'normal', 'conquest', 12345, 'world');
battle.officers ||= {};
battle.officers.norland = oldOfficer('norland', 'legendary');
battle.roster ||= {};
battle.roster.cc = oldOfficer('cc', 'distinguished');
const migrated = E.migrateSave(battle);
assert.ok(migrated);
assert.equal(migrated.commissionRebalanceVersion, 1);
assert.equal(migrated.officers.norland.commission, 'distinguished');
assert.equal(migrated.roster.cc.commission, 'legendary');
console.log('Commander commission distribution and save rebalance passed.');

#!/usr/bin/env node
'use strict';
// Architecture-only regression smoke: do not invent playable scenarios.
const assert = require('node:assert/strict');
const WC = require('../dist/war-campaign.js');

const key = 'eu-federation';
const expected = [
  ['australia', 1, 'war-for-australia'],
  ['area-18', 1, 'area-18'],
  ['division-japan', 1, 'division-japan'],
  ['kazakhstan', 2, null],
  ['persia', 2, null],
  ['xinjiang', 3, null],
  ['india', 3, null],
  ['mongolia', 3, null],
  ['manchuria', 3, null],
  ['himalayas', 4, null],
  ['sichuan', 5, null],
  ['beijing', 5, null],
  ['luoyang', 6, null],
];

assert(WC.FACTIONS.includes(key), 'Campaign selector must list E.U. vs Federation');
assert.equal(WC.CAMPAIGN_INFO[key].side, 'eu');
assert.equal(WC.CAMPAIGN_INFO[key].opponent, 'cf');
assert.equal(WC.registry[key].length, 6);
assert.deepEqual(WC.registry[key].map(t => t.missions.length), [3, 2, 4, 1, 2, 1]);
const all = WC.registry[key].flatMap(t => t.missions);
assert.equal(all.length, 13);
for (const [idx, [suffix, tier, scenarioId]] of expected.entries()) {
  const m = all[idx];
  assert.equal(m.id, key + '-' + suffix);
  assert.equal(m.tier, tier);
  assert.equal(m.scenarioId, scenarioId);
  assert.equal(m.battleSide, 'eu');
  assert.equal(m.campaignFaction, key);
  assert.equal(m.status, scenarioId ? 'implemented' : 'planned');
  assert.equal(m.final, idx === 12);
  assert.deepEqual(WC.ALL[m.id], m);
  assert(m.bounds.length === 4 && m.marker.length === 2, 'Map locator required');
}
assert.equal(new Set(all.map(m => m.id)).size, 13);
assert.equal(all.filter(m => m.status === 'planned').length, 10);
assert.equal(WC.PLACEHOLDERS.filter(m => m.campaignFaction === key).length, 10);
assert(WC.regionContains(all[3], 67, 48), 'Kazakhstan marker must lie inside its region');
assert(WC.regionContains(all[6], 78, 23), 'India marker must lie inside its region');
assert(WC.regionContains(all[7], 104, 46), 'Mongolia marker must lie inside its region');

const progress = WC.testFixture(key, 2);
assert.equal(WC.unlockedTier(progress, key), 2);
assert.equal(WC.state(progress, key, 'eu-federation-kazakhstan'), 'planned');
assert.deepEqual(
  WC.launch(progress, key, 'eu-federation-kazakhstan', {}),
  { ok: false, reason: 'Planned — Scenario Not Yet Implemented' }
);
assert.equal(
  WC.recordVictory({ getItem(){ return null; }, setItem(){} }, {
    warCampaign: { faction: key, missionId: 'eu-federation-luoyang',
      scenarioId: 'battle-luoyang', battleSide: 'eu' },
    mode: 'scenario', scenario: { id: 'battle-luoyang' },
    player: 'eu', over: { winner: 'eu' }
  }).ok,
  false,
  'Old Britannian Luoyang must never count for EU campaign'
);
const store = new Map();
const storage = {getItem: k => store.get(k) || null, setItem: (k,v) => store.set(k,v)};
const oldSave = {
  version: 1, selectedFaction: 'britannia', completed: {
    eu:{}, britannia:{}, 'britannia-federation':{}, 'federation-britannia':{}
  }
};
store.set(WC.STORAGE_KEY, JSON.stringify(oldSave));
const loaded = WC.load(storage);
assert.equal(loaded.selectedFaction, 'britannia');
assert.deepEqual(loaded.completed[key], {});
assert(WC.chooseFaction(storage, key));
assert.equal(WC.load(storage).selectedFaction, key);
// Preserved campaigns must retain their existing independent objectives.
for (const id of [
  'eu-pendragon-east', 'britannia-stonehenge',
  'britannia-federation-luoyang', 'federation-britannia-pendragon-west'
]) assert(WC.ALL[id] && WC.ALL[id].status === 'implemented', id);
console.log('PASS: EU-Federation architecture, 13 objectives, placeholder safety, and save compatibility');

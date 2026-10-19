#!/usr/bin/env node
'use strict';
// Rarity is class-based, every faction has a 3/3/1 Elite distribution,
// and pending rewards respect updated rarities without changing owned Elites.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../dist/engine.js');

const expected = {
  raider: 'Rare', medium: 'Rare', amphibious: 'Rare',
  heavy: 'Epic', rocket: 'Epic', siege: 'Epic', super: 'Legendary',
};
const sides = ['britannia', 'bk', 'eu', 'cf'];
const counts = { Rare: 0, Epic: 0, Legendary: 0 };
const factionCounts = Object.fromEntries(sides.map(s => [s, { Rare: 0, Epic: 0, Legendary: 0 }]));
for (const [id, elite] of Object.entries(E.ELITE_FORCES)) {
  if (elite.scenarioOnly) continue;
  const type = E.TYPES[elite.type];
  assert.ok(type, 'missing type: ' + id);
  const cls = type.naval === 'amphibious' ? 'amphibious' : type.cls;
  assert.equal(elite.rarity, expected[cls], id + ' must follow class ' + cls);
  assert.equal(elite.availableTo.length, 1);
  assert.ok(factionCounts[elite.availableTo[0]], id + ' has invalid faction');
  counts[elite.rarity]++;
  factionCounts[elite.availableTo[0]][elite.rarity]++;
}
assert.equal(Object.keys(E.ELITE_FORCES).length, 28);
assert.deepEqual(counts, { Rare: 12, Epic: 12, Legendary: 4 });
for (const side of sides)
  assert.deepEqual(factionCounts[side], { Rare: 3, Epic: 3, Legendary: 1 }, side + ' parity');

const source = fs.readFileSync(path.join(__dirname, '../dist/ui/turns.js'), 'utf8');
let profile = { elites: {}, pendingEliteRewards: [], claimedEliteChoices: {} };
const context = { E, loadProfile: () => profile,
  saveProfile: value => { profile = value; return true; }, esc: String };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'turns.js' });
const API = vm.runInContext(
  '({queueEliteReward,eligibleEliteRewardOptions,selectEliteReward})', context);
const options = award => Array.from(API.eligibleEliteRewardOptions(award, profile)).sort();
const expectedOptions = (side, rarity) => Object.entries(E.ELITE_FORCES)
  .filter(([, e]) => e.availableTo.includes(side) && e.rarity === rarity)
  .map(([id]) => id).sort();

for (const side of sides) {
  for (const [difficulty, rarity] of [
    ['normal', 'Rare'], ['hard', 'Epic'], ['challenge', 'Legendary'],
  ]) {
    const key = 'story:' + side + ':' + difficulty;
    assert.equal(API.queueEliteReward(profile, { player: side, difficulty }, key, 10, 'Story 3★'), true);
    const reward = profile.pendingEliteRewards.find(r => r.key === key);
    assert.equal(reward.side, side);
    assert.deepEqual(options(reward), expectedOptions(side, rarity), key);
  }
}
// Legacy Normal Black Knights reward gains the two newly Rare units.
const oldRareBK = { key: 'story:bk1:normal', rarity: 'Rare',
  options: ['japan_bk_amphibious'], amount: 10 };
assert.deepEqual(options(oldRareBK), expectedOptions('bk', 'Rare'));
assert.ok(!options(oldRareBK).includes('guren_mkii'));
// Existing Legendary reward cannot be spent on the demoted Epic Gawain/Shinkiro.
const oldLegendBK = { key: 'story:bk1:challenge', rarity: 'Legendary',
  options: ['gawain', 'shinkiro', 'guren_seiten'], amount: 10 };
assert.deepEqual(options(oldLegendBK), ['guren_seiten']);
profile.elites.gawain = { level: 3, fragments: 12 };
profile.pendingEliteRewards.push(oldLegendBK);
assert.equal(API.selectEliteReward('gawain', oldLegendBK.key).ok, false);
assert.equal(API.selectEliteReward('guren_seiten', oldLegendBK.key).ok, true);
assert.deepEqual(profile.elites.gawain, { level: 3, fragments: 12 });
// Legacy Britannia rewards refresh newly Rare Vincent and exclude it from Epic.
const oldRareBR = { key: 'story:br1:normal', rarity: 'Rare',
  options: ['cornelia_gloucester', 'portman_ii'], amount: 10 };
assert.deepEqual(options(oldRareBR), expectedOptions('britannia', 'Rare'));
const oldEpicBR = { key: 'story:br1:hard', rarity: 'Epic',
  options: ['lancelot', 'mordred', 'vincent_ward', 'sutherland_air'], amount: 10 };
assert.deepEqual(options(oldEpicBR), expectedOptions('britannia', 'Epic'));
profile.elites.vincent_ward = { level: E.ELITE_MAX_LEVEL, fragments: 0 };
assert.ok(!options(oldRareBR).includes('vincent_ward'));
console.log('Elite rarity by class, 3/3/1 faction parity and pending rewards: PASS');

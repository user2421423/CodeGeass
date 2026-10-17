#!/usr/bin/env node
'use strict';
// Regression: completed (Lv.5) Elite Forces cannot consume finite fragment awards.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../dist/ui/turns.js'), 'utf8');
const ELITES = {
  rare_max: { rarity: 'Rare', type: 'rare_max_type', availableTo: ['britannia'] },
  rare_active: { rarity: 'Rare', type: 'rare_active_type', availableTo: ['britannia'] },
  eu_rare: { rarity: 'Rare', type: 'eu_rare_type', availableTo: ['eu'] },
  epic: { rarity: 'Epic', type: 'epic_type', availableTo: ['britannia'] },
  legend: { rarity: 'Legendary', type: 'legend_type', availableTo: ['britannia'] },
};
const E = {
  ELITE_MAX_LEVEL: 5,
  ELITE_FORCES: ELITES,
  TYPES: Object.fromEntries(Object.entries(ELITES).map(([id, elite]) => [elite.type, { name: id }])),
  eliteProfile(p) {
    p.elites ||= {};
    for (const id of Object.keys(ELITES))
      p.elites[id] ||= { level: 0, fragments: 0 };
    return p.elites;
  },
  grantEliteFragments(p, awards) {
    const records = this.eliteProfile(p);
    for (const [id, count] of Object.entries(awards)) records[id].fragments += count;
  },
};
let profile = {
  elites: {
    rare_max: { level: 5, fragments: 0 },
    rare_active: { level: 4, fragments: 20 },
    eu_rare: { level: 3, fragments: 10 },
    epic: { level: 2, fragments: 0 },
    legend: { level: 5, fragments: 3 },
  },
  pendingEliteRewards: [], claimedEliteChoices: {},
};
const context = {
  E, loadProfile: () => profile,
  saveProfile: value => { profile = value; return true; },
  esc: value => String(value),
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'turns.js' });
const API = vm.runInContext(
  '({ queueEliteReward, eligibleEliteRewardOptions, pendingEliteChoiceHTML, selectEliteReward })',
  context,
);
const options = () => Array.from(API.eligibleEliteRewardOptions(profile.pendingEliteRewards[0], profile));
const normal = { era: 'world', player: 'britannia', difficulty: 'normal' };

// Faction-restricted rewards hide completed elites but retain upgradeable choices.
assert.equal(API.queueEliteReward(profile, normal, 'conquest:test', 10, 'Conquest'), true);
assert.deepEqual(options(), ['rare_active']);
assert.doesNotMatch(API.pendingEliteChoiceHTML(profile), /data-reward-elite="rare_max"/);
assert.equal(API.selectEliteReward('rare_max').ok, false);
assert.equal(profile.elites.rare_max.fragments, 0);
assert.equal(API.selectEliteReward('rare_active').ok, true);
assert.equal(profile.elites.rare_active.fragments, 30);
assert.equal(profile.pendingEliteRewards.length, 0);

// Previously saved World Campaign rewards remain cross-faction and dynamically
// exclude a frame after it has been upgraded to Lv.5.
assert.equal(API.queueEliteReward(profile, normal, 'world:test:normal', 10, 'World'), true);
assert.ok(options().includes('eu_rare'));
assert.ok(!options().includes('rare_max'));
profile.elites.rare_active.level = 5;
profile.elites.eu_rare.level = 5;
assert.deepEqual(options(), []);
assert.match(API.pendingEliteChoiceHTML(profile), /reward remains unclaimed/);
assert.doesNotMatch(API.pendingEliteChoiceHTML(profile), /data-reward-elite=/);
assert.equal(API.selectEliteReward('eu_rare').ok, false);
assert.equal(profile.pendingEliteRewards.length, 1);
assert.equal(profile.elites.eu_rare.fragments, 10);

// A blocked old reward stays saved, but cannot prevent a newer eligible
// award of a different rarity from being claimed.
assert.equal(API.queueEliteReward(profile, { ...normal, difficulty: 'hard' }, 'conquest:hard', 10, 'Hard'), true);
assert.match(API.pendingEliteChoiceHTML(profile), /data-reward-elite="epic"/);
assert.equal(API.selectEliteReward('epic').ok, true);
assert.equal(profile.elites.epic.fragments, 10);
assert.deepEqual(profile.pendingEliteRewards.map(item => item.key), ['world:test:normal']);

// World Campaign's rarity rules still prevent cross-rarity selection.
profile.elites.eu_rare.level = 4;
assert.deepEqual(options(), ['eu_rare']);
assert.equal(API.selectEliteReward('epic').ok, false);
assert.equal(API.selectEliteReward('eu_rare').ok, true);
assert.equal(profile.pendingEliteRewards.length, 0);
console.log('Elite fragment reward max-level safety: PASS');

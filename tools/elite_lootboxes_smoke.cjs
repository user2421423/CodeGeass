#!/usr/bin/env node
'use strict';
// Regression for the shared rarity-sorted Elite fragment loot-box selector.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = ['dist/ui/turns.js', 'dist/ui/elite-lootboxes.js']
  .map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const elites = {
  rare: { type: 'rare_t', rarity: 'Rare', availableTo: ['britannia'], skill: 'Aim', lv3Text: 'Attack', lv5Text: 'Better attack' },
  eu: { type: 'eu_t', rarity: 'Rare', availableTo: ['eu'], skill: 'Sprint', lv3Text: 'Move', lv5Text: 'Better move' },
  epic: { type: 'epic_t', rarity: 'Epic', availableTo: ['britannia'], skill: 'Shield', lv3Text: 'Defense', lv5Text: 'Better defense' },
  legend: { type: 'legend_t', rarity: 'Legendary', availableTo: ['britannia'], skill: 'Fly', lv3Text: 'Flight', lv5Text: 'Better flight' },
};
const E = {
  ELITE_FORCES: elites, ELITE_MAX_LEVEL: 5,
  TYPES: Object.fromEntries(Object.entries(elites).map(([id, e]) =>
    [e.type, { name: id, role: 'Heavy', branch: 'Armor', cls: 'heavy', side: 'britannia', weapon: 'Laser' }])),
  eliteProfile(p) { p.elites ||= {}; for (const id of Object.keys(elites)) p.elites[id] ||= { level: 0, fragments: 0 }; return p.elites; },
  eliteStats(_id, level) { return { hp: level * 100, attack: level * 10, armor: level, move: level + 3, min: 1, max: 2 }; },
  grantEliteFragments(p, values) { for (const [id, n] of Object.entries(values)) this.eliteProfile(p)[id].fragments += n; },
};
let p = { elites: { rare: { level: 1, fragments: 1 }, eu: { level: 1, fragments: 0 },
  epic: { level: 2, fragments: 0 }, legend: { level: 5, fragments: 0 } },
  pendingEliteRewards: [], claimedEliteChoices: {} };
const context = { E, ART: { unit: () => '<svg class="catalog-ship"></svg>' },
  ICONS: { use: x => x }, esc: String, loadProfile: () => p, saveProfile: () => true,
  document: { addEventListener() {} } };
vm.createContext(context);
vm.runInContext(source, context);
const api = vm.runInContext('({queueEliteReward,pendingEliteChoiceHTML,eliteLootBoxPickerHTML,selectEliteReward})', context);
assert.equal(api.queueEliteReward(p, { player: 'britannia', difficulty: 'hard' }, 'conquest:hard', 10, 'Conquest'), true);
assert.equal(api.queueEliteReward(p, { player: 'britannia', difficulty: 'challenge' }, 'conquest:legend', 10, 'Conquest'), true);
assert.equal(api.queueEliteReward(p, { player: 'britannia', difficulty: 'normal' }, 'world:mission:normal', 20, 'World'), true);
assert.equal(api.queueEliteReward(p, { player: 'britannia', difficulty: 'normal' }, 'weekly:mission:normal', 2, 'Weekly'), true);
const boxes = api.pendingEliteChoiceHTML(p);
assert.ok(boxes.indexOf('world:mission:normal') < boxes.indexOf('conquest:hard'));
assert.ok(boxes.indexOf('conquest:hard') < boxes.indexOf('conquest:legend'));
assert.match(boxes, /remains unclaimed/);
assert.doesNotMatch(boxes, /data-reward-elite=/);
const one = api.eliteLootBoxPickerHTML('world:mission:normal', 1, p);
const five = api.eliteLootBoxPickerHTML('world:mission:normal', 5, p);
assert.match(one, /HP 100/);
assert.match(five, /HP 500/);
assert.match(five, /Lv\.5 ability/);
assert.match(one, /data-reward-elite="eu"/);
assert.doesNotMatch(one, /data-reward-elite="epic"/);
assert.equal(api.selectEliteReward('legend', 'conquest:legend').ok, false);
assert.equal(api.selectEliteReward('rare', 'conquest:hard').ok, false);
assert.equal(api.selectEliteReward('eu', 'world:mission:normal').ok, true);
assert.equal(p.elites.eu.fragments, 20);
assert.equal(api.selectEliteReward('epic', 'conquest:hard').ok, true);
assert.equal(api.selectEliteReward('rare', 'weekly:mission:normal').ok, true);
assert.equal(p.elites.rare.fragments, 3);
assert.equal(p.pendingEliteRewards.length, 1);
assert.equal(p.pendingEliteRewards[0].key, 'conquest:legend');
console.log('Shared Elite loot boxes: PASS');

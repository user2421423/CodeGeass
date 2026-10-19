#!/usr/bin/env node
'use strict';
// Story Mode cannot unlock persistent HQ Elites for free; existing purchases remain intact.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');
const CP = require('../dist/campaign.js');

assert.equal(Object.hasOwn(CP, 'STORY_ELITE_UNLOCKS'), false);
assert.equal(typeof E.unlockStoryElite, 'undefined');

for (const [id, missionId] of [
  ['cornelia_gloucester', 'br_mef'],
  ['guren_mkii', 'bk3'],
]) {
  const newcomer = { campaign: {}, elites: { [id]: { level: 0, fragments: 30 } } };
  assert.equal(E.eliteUpgradeReason(newcomer, id), null, 'unlock requires no story progress');
  assert.equal(E.upgradeElite(newcomer, id).level, 1);
  assert.equal(E.eliteRecord(newcomer, id).fragments, 0, 'unlock costs 30 fragments');

  const storyCleared = { campaign: { [missionId]: 3 }, elites: { [id]: { level: 0, fragments: 0 } } };
  assert.equal(E.eliteRecord(storyCleared, id).level, 0);
  assert.match(E.eliteUpgradeReason(storyCleared, id), /Need 30 more/);

  const existingOwner = { campaign: {}, elites: { [id]: { level: 3, fragments: 12 } } };
  assert.equal(E.eliteRecord(existingOwner, id).level, 3, 'previous HQ levels persist');
  assert.equal(E.eliteRecord(existingOwner, id).fragments, 12, 'previous fragments persist');
}

const source = file => fs.readFileSync(path.join(__dirname, '../dist/ui', file), 'utf8');
assert.doesNotMatch(source('turns.js'), /unlockStoryElite|STORY_ELITE_UNLOCKS/);
assert.doesNotMatch(source('core.js'), /unlockStoryElite/);
console.log('Story Mode HQ Elite progression: fragment-only with legacy ownership: PASS');

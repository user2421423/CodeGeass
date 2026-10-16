#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../dist/engine.js');
const CP = require('../dist/campaign.js');

const ladder = [100, 200, 300, 400, 500];
let nodes = 0, upgrades = 0, total = 0;
for (const [branch, tree] of Object.entries(E.TECH_TREE))
  for (const [id, node] of Object.entries(tree.nodes)) {
    nodes++;
    upgrades += node.costs.length;
    const expected = ladder.slice(0, node.values.length);
    assert.deepEqual(node.costs, expected, branch + '.' + id + ' uses standardized level prices');
    node.costs.forEach((price, index) => {
      assert.equal(E.researchCost(branch + '.' + id, index), price, 'researchCost agrees with the tree');
      total += price;
    });
  }
assert.deepEqual([nodes, upgrades, total], [76, 200, 38600],
  'all 200 purchases across 76 technologies cost 38,600 tokens');
assert.equal(E.RESEARCH_VERSION, 2, 'do not reset existing HQ research');
assert.deepEqual(E.TECH_TIERS, [0, 0, 2, 4, 7]);

// The gameplay gate must use the sum of earned Conquest and whole-campaign
// credits, never individual Story Mode / World Campaign battle wins.
const state = {
  wins: 1, tokens: 100000,
  research: { 'infantry.guns': 2 },
  campaign: {}, researchStoryCompletions: {}, researchWorldCompletions: {},
};
assert.equal(E.researchVictoryCount(state), 1);
assert.match(E.researchReason(state, 'armor.blaze'), /Tier 2/,
  'one victory cannot unlock Tier II');
const campaigns = CP.CAMPAIGNS;
const arc = campaigns.bk_s1;
assert.ok(arc && arc.missions.length > 1, 'requires a real story campaign');
for (const mission of arc.missions.slice(0,-1)) state.campaign[mission.id] = 1;
assert.equal(E.researchVictoryCount(state), 1,
  'several isolated Story Mode mission victories do not count');

// Test the exact browser-load campaign credit sync with mocked strategic progress.
const ui = fs.readFileSync(require.resolve('../dist/ui/core.js'), 'utf8');
const start = ui.indexOf('function syncResearchCampaignCompletions(profile) {');
const end = ui.indexOf('\nfunction loadProfile()', start);
assert.ok(start >= 0 && end > start, 'research sync helper available for profile migration');
const mockWorld = {
  registry: { eu: [{number:1,missions:[{id:'a'},{id:'b'}]},{number:2,missions:[{id:'c'}]}] },
  progress: {eu: {a:true,b:true}},
  load(){ return this.progress; },
  completed(p,f,m) { return p[f]?.[m] === true; },
};
const sync = new Function('E','KnightmareWarCampaign','localStorage',
  ui.slice(start, end) + '\nreturn syncResearchCampaignCompletions;')(E,mockWorld,{});
assert.equal(sync(state), false, 'partial campaigns grant no credits');
state.campaign[arc.missions.at(-1).id] = 1;
assert.equal(sync(state), true, 'retroactively credit entire Story Mode arc');
assert.equal(state.researchStoryCompletions.bk_s1, true);
assert.equal(E.researchVictoryCount(state), 2, 'full story counts exactly once');
assert.equal(E.researchReason(state,'armor.blaze'), null,
  'full story plus Conquest unlocks Tier II');
assert.equal(sync(state), false, 'repeated Story Mode verification does not count twice');

mockWorld.progress.eu.c = true;
assert.equal(sync(state), true, 'retroactively credit a completed World Campaign');
assert.equal(state.researchWorldCompletions.eu, true);
assert.equal(E.researchVictoryCount(state), 3);
assert.equal(sync(state), false, 'replaying a fully completed World Campaign gives no new credit');
state.researchWorldCompletions.eu = true;
assert.equal(state.research['infantry.guns'], 2, 'previous research is preserved');

const conquestsOnly = { wins: 7, tokens: 100000 };
assert.equal(E.researchReason(conquestsOnly,'armor.float').includes('Tier 3'),false,
  'Conquest progression continues satisfying HQ tier locks');
console.log('Standardized HQ pricing and full-campaign victory credits: PASS');

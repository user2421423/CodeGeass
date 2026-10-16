#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const CP = require('../dist/campaign.js');

assert.deepEqual(E.ELITE_UPGRADE_FRAGMENTS, [0,30,40,50,60,70],
  'Elite unlock/upgrade fragment costs must increase by ten');
const expected = {
  normal: [100,100,200], hard: [200,200,300],
  challenge: [300,300,400], elite: [400,400,500],
};
const firstStoryId = CP.CAMPAIGNS.bk_s1.missions[0].id;
for (const [difficulty, amounts] of Object.entries(expected)) {
  const profile = { campaign: {}, campaignDifficulty: {}, campaignMilestones: {} };
  const g = { player:'bk', difficulty, campaign:{ id:firstStoryId }, over:{winner:'bk',stars:1} };
  let reward = CP.reward(g, profile);
  assert.equal(reward.total, amounts[0], difficulty + ' first star tokens');
  assert.equal(reward.fragmentChoice, 0, 'first star gives no fragments');
  profile.campaign[firstStoryId] = 1;
  profile.campaignDifficulty[firstStoryId] = { [difficulty]: 1 };
  g.over.stars = 2;
  reward = CP.reward(g, profile);
  assert.equal(reward.total, amounts[1] - amounts[0], difficulty + ' second star incremental tokens');
  assert.equal(reward.fragmentChoice, 0, difficulty + ' second star gives no fragments');
  profile.campaign[firstStoryId] = 2;
  profile.campaignDifficulty[firstStoryId][difficulty] = 2;
  g.over.stars = 3;
  reward = CP.reward(g, profile);
  assert.equal(reward.total, amounts[2] - amounts[1], difficulty + ' third star incremental tokens');
  assert.equal(reward.fragmentChoice, 10, difficulty + ' three stars award ten fragments');
  assert.deepEqual(reward.fragments, {}, 'no broad automatic story fragment distribution');
  profile.campaign[firstStoryId] = 3;
  profile.campaignDifficulty[firstStoryId][difficulty] = 3;
  reward = CP.reward(g, profile);
  assert.equal(reward.total, 0, 'replay does not pay tokens twice');
  assert.equal(reward.fragmentChoice, 0, 'replay does not pay fragments twice');
}
for (const [difficulty, tokens] of Object.entries({normal:500,hard:1000,challenge:1500,elite:2000})) {
  const g = { player:'britannia', difficulty, era:'world', over:{winner:'britannia'} };
  assert.equal(E.missionReward(g,1,{}).total,tokens,difficulty+' conquest victory');
  assert.equal(E.missionReward(g,0,{}).total,tokens+200,'first conquest victory bonus');
  const cleared = { [E.operationKey(g)]: true };
  assert.equal(E.missionReward(g,2,cleared).repeat,true,'duplicate conquest win denied');
}
assert.deepEqual(E.eliteVictoryReward({},{}),{},'no broad elite drops on victories');
console.log('Round-number token and targeted Elite-fragment progression: PASS');

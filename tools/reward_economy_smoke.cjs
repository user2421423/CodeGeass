#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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

// Euro Britannia uses Britannian battle units but earns E.U. Elite fragments at 3★.
// Test normal, hard, challenge, elite, mixed-era mission IDs, and pending legacy saves.
const rewardUI = fs.readFileSync(path.join(__dirname, '../dist/ui/turns.js'), 'utf8');
let rewardProfile = { elites: {}, pendingEliteRewards: [], claimedEliteChoices: {} };
const ctx = {
  E, loadProfile: () => rewardProfile,
  saveProfile: value => { rewardProfile = value; return true; },
  esc: String,
};
vm.createContext(ctx);
vm.runInContext(rewardUI, ctx, { filename: 'turns.js' });
const rewardAPI = vm.runInContext('({queueEliteReward,eligibleEliteRewardOptions})', ctx);
const matchingEliteIds = (side, rarity) => Object.entries(E.ELITE_FORCES)
  .filter(([, elite]) => !elite.scenarioOnly && elite.availableTo.includes(side) &&
    (rarity === 'Any' || elite.rarity === rarity))
  .map(([id]) => id).sort();
const awardOptions = award => Array.from(
  rewardAPI.eligibleEliteRewardOptions(award, rewardProfile)).sort();
for (const [difficulty, rarity] of Object.entries({
  normal: 'Rare', hard: 'Epic', challenge: 'Legendary', elite: 'Any',
})) {
  for (const id of ['eb_narva', 'br6', 'eb_fall']) {
    assert.equal(E.campaign.mission(id).player, 'eb', id + ' is a Euro Britannia Story mission');
    const key = 'story:' + id + ':' + difficulty;
    assert.equal(rewardAPI.queueEliteReward(rewardProfile,
      { player: 'eb', difficulty }, key, 10, 'Story Mode 3★'), true, key + ' queued');
    const award = rewardProfile.pendingEliteRewards.find(entry => entry.key === key);
    assert.equal(award.side, 'eu', key + ' reward faction');
    assert.deepEqual(awardOptions(award), matchingEliteIds('eu', rarity), key + ' EU-only choices');
    assert.equal(rewardAPI.queueEliteReward(rewardProfile,
      { player: 'eb', difficulty }, key, 10, 'Story Mode 3★'), false,
      key + ' cannot be duplicated');
  }
}
// Existing unclaimed Euro Britannia awards must switch from Britannian to EU options.
const legacyEuroAward = {
  key: 'story:eb_weisswolf:hard', rarity: 'Epic', amount: 10,
  side: 'britannia', options: ['lancelot', 'mordred', 'sutherland_air'],
};
assert.deepEqual(awardOptions(legacyEuroAward), matchingEliteIds('eu', 'Epic'));
for (const [id, side] of [['br1', 'britannia'], ['bk1', 'bk'], ['eu_narva', 'eu']]) {
  const key = 'story:' + id + ':normal';
  assert.equal(rewardAPI.queueEliteReward(rewardProfile,
    { player: 'eb', difficulty: 'normal' }, key, 10, 'Story Mode 3★'), true,
    'mission registry overrides mismatched saved operation');
  const award = rewardProfile.pendingEliteRewards.find(entry => entry.key === key);
  assert.equal(award.side, side, id + ' keeps its own faction');
  assert.deepEqual(awardOptions(award), matchingEliteIds(side, 'Rare'));
}
// Previously claimed awards are not paid twice or retroactively rewritten.
const claimedKey = 'story:eb_slonim:normal';
rewardProfile.claimedEliteChoices[claimedKey] = 'cornelia_gloucester';
assert.equal(rewardAPI.queueEliteReward(rewardProfile,
  { player: 'eb', difficulty: 'normal' }, claimedKey, 10, 'Story Mode 3★'), false);
assert.equal(rewardProfile.claimedEliteChoices[claimedKey], 'cornelia_gloucester');

console.log('Round-number token, Elite fragments, and Euro Britannia Story reward eligibility: PASS');

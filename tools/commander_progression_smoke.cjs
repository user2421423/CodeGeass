#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

const p = { tokens: 100000, roster: {} };
E.roster(p);
const standard = Object.keys(E.COMMANDERS).find(k =>
  !E.owns(p, k) && E.commissionOf(k) === 'standard');
assert.ok(standard, 'must have a recruitable standard commander');
const recruit = E.recruitPrice(standard);
assert.equal(E.recruitCommander(p, standard).ok, true);
const plan = E.commanderPlan(p, standard);
assert.equal(plan.promotions, 4310, 'promotions from Second Lieutenant to Supreme Commander');
assert.equal(plan.starTotal, 3040, 'all four branches from 2 to 6 stars');
assert.equal(plan.commission, 550, 'Standard to Legendary Commission');
assert.deepEqual(plan.skills, [1300, 1300, 1300], 'three Level 5 skills');
assert.equal(plan.total, 11800, 'remaining cost after recruiting standard officer');
assert.equal(recruit + plan.total, recruit + 11800);

// The preview must be pure: no changes to balances or skills.
const tokensBeforePreview = p.tokens;
assert.equal(E.commanderPlan(p, standard).total, 11800);
assert.equal(p.tokens, tokensBeforePreview);

const skill = 'fortification';
assert.equal(E.genericCost(0), 100);
const start = p.tokens;
for (let level = 1; level <= 5; level++) {
  const r = E.buyGeneric(p, standard, skill);
  assert.equal(r.ok, true, r.reason || 'skill upgrade');
  assert.equal(r.level, level);
}
assert.equal(p.tokens, start - 1300);
assert.equal(E.genericRefundPreview(p, standard, skill), 1170);
assert.equal(p.roster[standard].genericSpending[skill], 1300);
assert.equal(E.commanderPlan(p, standard).skillsTotal, 2600);
const removed = E.removeGeneric(p, standard, skill);
assert.equal(removed.ok, true);
assert.deepEqual([removed.refund, removed.fee, removed.netRefund], [1170, 40, 1130]);
assert.equal(p.tokens, start - 170, '10% is lost plus the 40-token fee');
assert.equal(p.roster[standard].generics[skill], undefined);
assert.equal(p.roster[standard].genericSpending[skill], undefined);
assert.equal(E.commanderPlan(p, standard).total, 11800, 'removing skill restores planner cost');

// Former saves lack per-skill purchase records. They use historical pricing,
// not today's higher prices, preventing accidental respec windfalls.
p.roster[standard].generics = { fortification: 5 };
delete p.roster[standard].genericSpending;
assert.equal(E.genericRefundPreview(p, standard, skill), 747,
  'legacy 830 tokens invested => rounded 90% refund of 747');
const legacyTokens = p.tokens;
const legacy = E.removeGeneric(p, standard, skill);
assert.equal(legacy.ok, true);
assert.equal(legacy.netRefund, 707);
assert.equal(p.tokens, legacyTokens + 707);

// Newly purchased levels after loading a legacy record append actual prices.
p.roster[standard].generics = { fortification: 3 };
delete p.roster[standard].genericSpending;
assert.equal(E.genericRefundPreview(p, standard, skill), 333,
  'legacy three-level investment is 370 tokens');
assert.equal(E.buyGeneric(p, standard, skill).ok, true);
assert.equal(p.roster[standard].genericSpending[skill], 720,
  'legacy 370 + current Level 4 upgrade 350');
assert.equal(E.genericRefundPreview(p, standard, skill), 648);

// 90% refunds cannot mint tokens by respec-and-repurchase loops.
const beforeLoop = p.tokens;
assert.equal(E.removeGeneric(p, standard, skill).ok, true);
for (let i = 1; i <= 4; i++) assert.equal(E.buyGeneric(p, standard, skill).ok, true);
assert.ok(p.tokens < beforeLoop, 'repurchasing a removed skill must cost tokens');

// Four intermediate promotion milestones unlock one additional star each.
const expectedCaps = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6];
for (const branch of Object.keys(E.BRANCH_NAMES)) {
  assert.deepEqual(E.RANKS.map((_, rank) => E.ratingCap(rank, branch)), expectedCaps,
    branch + ' rank-by-rank star cap');
}
const rankProfile = { tokens: 100000, roster: {} };
E.roster(rankProfile);
assert.equal(E.recruitCommander(rankProfile, standard).ok, true);
const rankOfficer = rankProfile.roster[standard];
for (const [rank, cap] of [[0, 2], [2, 3], [4, 4], [6, 5], [8, 6]]) {
  rankOfficer.rank = rank;
  while (rankOfficer.ratings.armor < cap)
    assert.equal(E.buyStar(rankProfile, standard, 'armor').ok, true);
  assert.match(E.starReason(rankProfile, standard, 'armor'),
    cap === 6 ? /Already six stars/ : new RegExp('Rank-limited to ' + cap + ' stars'));
}
// A commander retired to Major General retains five stars but relinquishes the sixth.
const retire = E.retireCommission(rankProfile, standard);
assert.equal(retire.ok, true);
assert.equal(rankOfficer.rank, 7);
assert.equal(rankOfficer.ratings.armor, 5);
assert.equal(E.ratingCap(rankOfficer.rank, 'armor'), 5);

// High Command is global across factions and grows from 2 to 10 purchased seats.
const seats = { tokens: 100000, roster: {} };
const starterIds = Object.keys(E.roster(seats));
assert.ok(starterIds.length >= 3);
seats.roster[starterIds[0]].rank = 8;
seats.roster[starterIds[1]].rank = 8;
seats.roster[starterIds[2]].rank = 7;
assert.equal(E.highCommandUsed(seats), 2);
assert.match(E.promoteReason(seats, starterIds[2]), /All High Command slots/);
for (let target = 3; target <= 10; target++) {
  assert.equal(E.highCommandExpansionPrice(seats), (target - 2) * 1000);
  assert.equal(E.expandHighCommand(seats).ok, true);
  assert.equal(E.highCommandCapacity(seats), target);
}
assert.equal(E.promote(seats, starterIds[2]).ok, true);
assert.equal(E.highCommandCapacity(seats), 10);
assert.equal(E.highCommandExpansionPrice(seats), null);
assert.equal(E.expandHighCommand(seats).ok, false);
assert.equal(100000 - seats.tokens,
  36000 + E.PROMOTE_COST[8], 'eight expansions cost 36,000 tokens in total');

// Existing capacities above six remain valid when saved or normalized.
const legacyExpanded = { tokens: 0, roster: {}, highCommandCapacity: 9 };
E.roster(legacyExpanded);
assert.equal(E.highCommandCapacity(legacyExpanded), 9);

console.log('Commander skill refund, rank thresholds and High Command expansion: PASS');

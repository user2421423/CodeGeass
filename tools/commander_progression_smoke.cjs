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

console.log('Commander skill refund and development planner: PASS');

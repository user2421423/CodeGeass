#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

// An existing save with an explicit empty roster must still own its free starters.
const profile = { roster: {}, tokens: 1000 };
const first = E.roster(profile);
assert.deepEqual(Object.keys(first).sort(), ['cornelia', 'zero'], 'fresh profiles get exactly two commanders');
for (const id of ['cornelia','zero'])
  assert.ok(first[id], `Missing persistent starter commander: ${id}`);
const previouslyPromoted = first.cornelia;
previouslyPromoted.rank = 2;
assert.strictEqual(E.roster(profile).cornelia, previouslyPromoted, 'loading the roster must not overwrite existing upgrades');

const g = E.createGame('britannia', 'normal', 'conquest', 20261015, 'world');
g.mode = 'scenario';
g.scenario = { id: 'commander-assign-regression' };
g.phase = g.player;
g.economy[g.player].credits = 100000;
const script = g.units.find(u => u.hp > 0 && u.cmd && !u.personal);
assert.ok(script, 'test requires an existing operation commander');
const authored = { rank: script.cmdRank, hp: script.hp };
const type = Object.keys(E.TYPES).find(id =>
  E.TYPES[id].side === g.player && !E.TYPES[id].naval && !E.TYPES[id].elite);
assert.ok(type, 'test requires an assignable player land unit');
const own = E.newUnit(g, type, g.player, script.c, script.r);
assert.equal(own.cmd, null);

E.applyRoster(g, profile);
assert.ok(g.roster.zero && g.roster.cornelia, 'scenario receives persistent commanders');
assert.equal(script.cmdRank, authored.rank, 'scripted operation commander rank unchanged');
assert.equal(script.hp, authored.hp, 'scripted operation commander HP unchanged');
assert.equal(E.assignReason(g, own, 'cornelia'), null, 'HQ commander can be assigned to scenario unit');
const result = E.assign(g, own.id, 'cornelia');
assert.equal(result.ok, true, result.reason || 'HQ commander assignment works');
assert.equal(own.cmd, 'cornelia');
assert.equal(own.personal, true, 'personal commander remains distinct from scripted officers');
assert.equal(own.cmdRank, 2, 'assigned commander uses persistent promotion');
assert.match(E.assignReason(g, own, 'cornelia'), /Commanding/, 'same commander cannot be assigned twice');

// A saved scenario can refresh its roster after further HQ recruitment/promotions.
profile.roster.cornelia.rank = 3;
E.applyRoster(g, profile);
assert.equal(g.roster.cornelia.rank, 3, 'scenario can refresh upgraded HQ records');
assert.equal(script.cmdRank, authored.rank, 'refresh never changes operation commander rank');
assert.equal(script.hp, authored.hp, 'refresh never changes operation commander HP');

// Legacy Story Mode continues importing the same persistent HQ roster.
const story = E.createGame('britannia', 'normal', 'conquest', 12019, 'world');
story.mode = 'campaign';
E.applyRoster(story, profile);
assert.ok(story.roster.cornelia, 'Story Mode also receives HQ commanders');

console.log('Commander assignment in Story Mode and regional battles: PASS');

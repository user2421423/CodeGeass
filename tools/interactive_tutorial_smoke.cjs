#!/usr/bin/env node
'use strict';
// Run after: node tools/build_sources.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../dist/engine.js');

const source = fs.readFileSync(require.resolve('../dist/ui/tutorial.js'), 'utf8');
const context = vm.createContext({ E });
const T = vm.runInContext(source + '\n({ tutorialMakeGame, tutorialScenario })', context);
E.scenarios = { ...(E.scenarios || {}), byId: { ...(E.scenarios?.byId || {}) } };
T.tutorialScenario();

const g = T.tutorialMakeGame();
assert.equal(g.mode, 'scenario');
assert.equal(g.scenario.id, 'training-grounds');
assert.equal(g.wrap, false);
assert.equal(g.cols * g.rows, g.tiles.length);
assert.equal(g.units.length, 2);
assert.equal(g.units[1].hp, 1);
assert.equal(g.stations.length, 3);
assert.equal(g.stations[1].shield, 0);
assert.ok(g.roster.suzaku, 'the temporary commander is supplied');
assert.equal(g.warCampaign, null, 'tutorial must not count as a World Campaign battle');

const u = g.units.find(unit => unit.side === g.player);
assert.equal(u.c, 2);
assert.equal(u.r, 4);
assert.ok(E.reachable(g, u).has('3,4'), 'first highlighted movement hex must be reachable');

const moving = E.move(g, u.id, 3, 4);
assert.equal(moving.ok, true, moving.reason);
assert.ok(E.targets(g, u).some(p => p.c === 4 && p.r === 4), 'guard must be attackable from waypoint');
const attack = E.attack(g, u.id, 4, 4);
assert.equal(attack.ok, true, attack.reason);
assert.equal(g.units.find(v => v.side === 'eu' && v.c === 4 && v.r === 4)?.hp ?? 0, 0, 'guard must die');
assert.equal(g.over, null, 'killing the guard must not end training');

E.finishWarTurn(g, g.turn);
g.turn++;
E.beginTurn(g, g.player, true);
assert.ok(E.reachable(g, u).has('5,4'), 'relay must be reachable on next turn');

const capture = E.move(g, u.id, 5, 4);
assert.equal(capture.ok, true, capture.reason);
assert.equal(g.stations[1].owner, g.player, 'relay must be capturable');
assert.equal(g.over, null, 'capturing the relay must not end training');

const recruitType = E.lineupOf(g, g.player).scout;
assert.ok(recruitType && E.TYPES[recruitType].tier <= 2, 'a starter factory can build scout');
const recruit = E.recruit(g, 0, recruitType);
assert.equal(recruit.ok, true, recruit.reason);
assert.ok(recruit.unit && recruit.unit.id !== u.id, 'factory must supply a new unit');
const assignment = E.assign(g, recruit.unit.id, 'suzaku');
assert.equal(assignment.ok, true, assignment.reason);
assert.equal(recruit.unit.cmd, 'suzaku');

assert.match(fs.readFileSync(require.resolve('../dist/ui/core.js'), 'utf8'),
  /game\.scenario\?\.id === 'training-grounds'\) return true;/,
  'save isolation must remain in place');

console.log('Interactive tutorial: full training scenario flow PASS');

#!/usr/bin/env node
'use strict';
// Regression: World Campaign regional wars import Elite HQ levels without doing so
// for standalone Scenarios, and new player reinforcements retain those levels.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

const id = 'lancelot';
const type = E.ELITE_FORCES[id].type;
const profile = { elites: { [id]: { level: 5, fragments: 0 } } };
function regional(withCampaign) {
  const game = E.createGame('britannia', 'normal', 'conquest', 42024, 'world');
  game.mode = 'scenario';
  game.scenario = { id: 'world-campaign-elite-regression' };
  if (withCampaign) game.warCampaign = { faction: 'britannia', objective: 'regression' };
  return game;
}

const world = regional(true);
const existing = E.newUnit(world, type, world.player, 0, 0);
const enemy = E.newUnit(world, type, 'cf', 1, 0);
const damage = 17;
existing.hp = Math.max(1, E.maxHP(existing) - damage);
E.applyElites(world, profile);
assert.equal(world.eliteLevels[id], 5, 'HQ level should be stored on World Campaign save');
assert.equal(existing.eliteLevel, 5, 'existing player units inherit HQ level');
assert.equal(E.maxHP(existing) - existing.hp, damage, 'upgrading an existing unit preserves damage');
assert.equal(enemy.eliteLevel, 1, 'enemy elite levels remain authored by the scenario');
assert.equal(E.newUnit(world, type, world.player, 2, 0).eliteLevel, 5,
  'player reinforcements inherit upgraded level');

const standalone = regional(false);
const standaloneElite = E.newUnit(standalone, type, standalone.player, 0, 0);
E.applyElites(standalone, profile);
assert.equal(standaloneElite.eliteLevel, 1, 'standalone Scenarios remain level 1');
assert.equal(standalone.eliteLevels, undefined, 'standalone Scenarios do not import HQ upgrades');

console.log('World Campaign Elite HQ level regression: PASS');

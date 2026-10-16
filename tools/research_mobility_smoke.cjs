#!/usr/bin/env node
'use strict';
// Regression: research movement bonuses replace obsolete terrain-cost discounts,
// scale by level, respect unit branches/sides, and work in all game modes.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

const landspinners = E.TECH_TREE.infantry.nodes.nav;
const floatSystem = E.TECH_TREE.armor.nodes.float;
const traction = E.TECH_TREE.artillery.nodes.traction;
assert.deepEqual(landspinners.values, [1, 2, 3, 4]);
assert.deepEqual(landspinners.costs, [70, 150, 260, 400]);
assert.deepEqual(floatSystem.values, [1, 2, 3, 4]);
assert.deepEqual(traction.values, [1, 2]);
assert.deepEqual(floatSystem.costs, [260, 320, 420, 520]);
assert.match(landspinners.text(1), /Infantry \+1 movement/);
assert.match(landspinners.text(2), /Infantry \+2 movement/);
assert.match(floatSystem.text(1), /Armor and amphibious Knightmares gain \+1 land movement/);

const g = E.createGame('britannia', 'normal', 'conquest', 20261015);
const player = g.player;
const infantry = E.newUnit(g, 'glasgow', player, 1, 1);
const armor = E.newUnit(g, 'sutherland', player, 2, 1);
const amphibious = E.newUnit(g, 'portman', player, 3, 1);
const artillery = E.newUnit(g, 'gareth', player, 4, 1);
const carrier = E.newUnit(g, 'carrier_battleship', player, 5, 1);
const enemyInfantry = E.newUnit(g, E.ROSTER.eu.scout, 'eu', 6, 1);
assert.equal(E.TYPES[infantry.type].branch, 'Infantry');
assert.equal(E.TYPES[armor.type].branch, 'Armor');
assert.equal(E.TYPES[amphibious.type].branch, 'Armor');
assert.equal(E.TYPES[artillery.type].branch, 'Artillery');
assert.equal(E.TYPES[carrier.type].naval, 'ship');

for (const mode of ['conquest', 'scenario', 'campaign']) {
  g.mode = mode;
  g.tech[player] = {};
  g.tech.eu = {};
  const before = Object.fromEntries(
    [infantry, armor, amphibious, artillery, carrier, enemyInfantry]
      .map(u => [u.id, E.movement(g, u)])
  );
  assert.equal(before[infantry.id], E.TYPES.glasgow.move + (mode === 'campaign' ? 0 : 2),
    mode + ' applies the correct Story Mode or universal +2 baseline');
  assert.equal(before[carrier.id], E.TYPES.carrier_battleship.move, 'warship baseline unchanged');

  g.tech[player]['infantry.nav'] = 1;
  assert.equal(E.movement(g, infantry), before[infantry.id] + 1, mode + ' Landspinners I');
  assert.equal(E.movement(g, armor), before[armor.id], mode + ' no Armor boost from Landspinners');

  g.tech[player]['infantry.nav'] = 2;
  assert.equal(E.movement(g, infantry), before[infantry.id] + 2, mode + ' Landspinners II');
  assert.equal(E.movement(g, enemyInfantry), before[enemyInfantry.id], mode + ' enemy research isolated');

  g.tech[player]['infantry.nav'] = 4;
  assert.equal(E.movement(g, infantry), before[infantry.id] + 4);
  g.tech[player]['armor.float'] = 4;
  assert.equal(E.movement(g, armor), before[armor.id] + 4, mode + ' Float System IV');
  assert.equal(E.movement(g, amphibious), before[amphibious.id] + 4, mode + ' amphibious Float System IV');
  assert.equal(E.movement(g, artillery), before[artillery.id], mode + ' before Artillery Traction');
  g.tech[player]['artillery.traction'] = 2;
  assert.equal(E.movement(g, artillery), before[artillery.id] + 2);
  assert.equal(E.movement(g, carrier), before[carrier.id], mode + ' no warship mobility research');
  assert.equal(E.movement(g, infantry), before[infantry.id] + 4, mode + ' Infantry/Armor upgrades independent');

  for (const terrain of ['forest', 'mountain', 'snow', 'crater'])
    assert.equal(E.TERRAIN[terrain].cost, 1, mode + ' terrain cost unchanged by research');
}
console.log('HQ mobility research bonuses: PASS');

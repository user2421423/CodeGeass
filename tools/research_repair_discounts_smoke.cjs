#!/usr/bin/env node
'use strict';
// Both replacement researches discount the manual repair action, not HP or passive healing.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const side = 'britannia';
const g = E.createGame(side, 'normal', 'conquest', 20261015, 'world');
g.phase = side;
g.economy[side].credits = 100000;
const station = g.stations.find(s => s.owner === side && E.portSite(g, s));
assert.ok(station, 'test requires a friendly coastal city');
const portHex = E.portSite(g, station);
station.portAt = { c: portHex.c, r: portHex.r };
station.portLevel = 2;
station.portOwner = side;

const land = E.newUnit(g, 'glasgow', side, station.c, station.r);
const ship = E.newUnit(g, 'carrier_battleship', side, portHex.c, portHex.r);
g.units = [land, ship];
const basicCost = n => Math.max(20, Math.round(n * 0.2));
const repairSpent = u => {
  u.hp = Math.floor(E.maxHP(u) * 0.4);
  u.moved = u.attacked = false;
  const hp = u.hp;
  const credits = g.economy[side].credits;
  const result = E.repair(g, u.id);
  assert.equal(result.ok, true, result.reason || 'repair succeeds');
  assert.equal(result.amount, Math.round(E.maxHP(u) * 0.2), 'repair restores 20% max HP');
  assert.equal(u.hp, hp + result.amount, 'repair has no changed HP percentage');
  return credits - g.economy[side].credits;
};
g.tech[side] = {};
assert.equal(repairSpent(land), basicCost(E.TYPES.glasgow.cost), 'baseline infantry repair cost');
assert.equal(repairSpent(ship), basicCost(E.TYPES.carrier_battleship.cost), 'baseline warship repair cost');

g.tech[side] = { 'cities.energy': 1 };
assert.equal(repairSpent(land), Math.round(basicCost(E.TYPES.glasgow.cost) * 0.90),
  'Energy Filler Network I saves 10% on manual repairs');
g.tech[side] = { 'cities.energy': 2 };
assert.equal(repairSpent(land), Math.round(basicCost(E.TYPES.glasgow.cost) * 0.85),
  'Energy Filler Network II saves 15%');
assert.equal(repairSpent(ship), Math.round(basicCost(E.TYPES.carrier_battleship.cost) * 0.85),
  'Energy Filler Network applies to ships too');

g.tech[side] = { 'naval.damage': 1 };
assert.equal(repairSpent(land), basicCost(E.TYPES.glasgow.cost), 'naval research does not affect land units');
assert.equal(repairSpent(ship), Math.round(basicCost(E.TYPES.carrier_battleship.cost) * 0.90),
  'Damage Control I saves 10%');
g.tech[side] = { 'naval.damage': 2 };
assert.equal(repairSpent(ship), Math.round(basicCost(E.TYPES.carrier_battleship.cost) * 0.75),
  'Damage Control II saves 25%');

g.tech[side] = { 'naval.damage': 2, 'cities.energy': 2 };
assert.equal(repairSpent(ship),
  Math.round(basicCost(E.TYPES.carrier_battleship.cost) * 0.85 * 0.75),
  'manual repair research discounts combine multiplicatively');

station.portOwner = 'eu';
assert.equal(repairSpent(ship), Math.round(basicCost(E.TYPES.carrier_battleship.cost) * 0.85),
  'Damage Control does not apply at enemy port');
station.portOwner = side;

// The new Energy Filler Network must not restore HP automatically.
g.units = [land];
land.hp = Math.floor(E.maxHP(land) * 0.4);
const before = land.hp;
E.beginTurn(g, side, false);
assert.equal(land.hp, before, 'Energy Filler Network gives no passive HP regeneration');
assert.deepEqual(E.TECH_TREE.cities.nodes.energy.costs, [110, 220]);
assert.deepEqual(E.TECH_TREE.naval.nodes.damage.costs, [100, 200]);
console.log('Manual repair research discounts: PASS');

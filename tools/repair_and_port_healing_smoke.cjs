#!/usr/bin/env node
'use strict';
// Repair/port-healing gameplay regression (real engine, not source-string checks).
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

const side = 'britannia';
function world() {
  const g = E.createGame(side, 'normal', 'conquest', 20261015, 'world');
  g.phase = side;
  g.economy[side].credits = 100000;
  return g;
}
const base = world();
const city = base.stations.find(s => s.owner === side);
assert.ok(city, 'player starts with an owned city');
const landType = Object.keys(E.TYPES).find(id => E.TYPES[id].side === side &&
  !E.TYPES[id].naval && !E.TYPES[id].elite);
assert.ok(landType, 'player has an ordinary land formation');

const land = E.newUnit(base, landType, side, city.c, city.r);
base.units = [land]; // Eliminate unrelated starting unit auras.
const full = E.maxHP(land);
land.hp = Math.max(1, Math.floor(full * 0.4));
const oldHp = land.hp;
const result = E.repair(base, land.id);
assert.equal(result.ok, true, result.reason || 'repair succeeds near friendly city');
const expected = Math.min(full - oldHp, Math.round(full * 0.2));
assert.equal(result.amount, expected, 'manual repair restores exactly 20% max HP');
assert.equal(land.hp, oldHp + expected, 'repair increases HP by that amount');
assert.equal(land.moved, true, 'repair spends movement');
assert.equal(land.attacked, true, 'repair spends attack');

land.hp = full - 3;
land.moved = land.attacked = false;
const capped = E.repair(base, land.id);
assert.equal(capped.ok, true, capped.reason || 'second repair succeeds');
assert.equal(capped.amount, 3, 'repair cannot exceed missing HP');
assert.equal(land.hp, full, 'near-full unit is capped at max HP');

for (const portLevel of [1, 2, 3]) {
  const g = world();
  const dock = g.stations.find(s => s.owner === side);
  const water = g.tiles.find(t => E.isSea(t));
  const shipType = Object.keys(E.TYPES).find(id =>
    E.TYPES[id].naval === 'ship' && E.TYPES[id].side === side && !E.TYPES[id].elite);
  assert.ok(dock && water && shipType, 'naval healing test has an owned port, sea and ship');
  dock.portLevel = portLevel;
  dock.portOwner = side;
  dock.portAt = { c: water.c, r: water.r };
  const ship = E.newUnit(g, shipType, side, water.c, water.r);
  g.units = [ship];
  ship.hp = Math.max(1, Math.floor(E.maxHP(ship) * 0.4));
  const hp = ship.hp;
  E.beginTurn(g, side, false);
  assert.equal(ship.hp, hp, `port level ${portLevel} must not automatically restore ship HP`);
}
console.log('Repair 20% and no passive port healing: PASS');

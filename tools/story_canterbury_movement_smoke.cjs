#!/usr/bin/env node
'use strict';
// Euro Britannia's replacement Gareth siege frame traverses rough terrain at base speed;
// +2 movement applies only outside Story Mode.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
require('../dist/campaign.js');

assert.equal(E.TYPES.canterbury.move, 2, 'Gareth needs 2 base movement');
const g = E.campaign.createMission('eb_weisswolf', 20261015, 'normal');
assert.equal(g.mode, 'campaign', 'regression uses a real Story Mode operation');
const u = g.units.find(v => v.type === 'gareth' && v.side === g.player);
assert.ok(u, 'Euro Britannia Story Mode begins with Gareth');
assert.equal(E.movement(g, u), 2, 'uncommanded Story Mode Gareth uses base movement');
for (const terrain of ['forest', 'mountain', 'snow', 'crater'])
  assert.equal(E.TERRAIN[terrain].cost, 1, terrain + ' costs one movement point');
assert.equal(E.TERRAIN.forest.cover, 0.15, 'forest cover is preserved');
assert.equal(E.TERRAIN.mountain.cover, 0.25, 'mountain cover is preserved');
assert.equal(E.TERRAIN.snow.attrition, 0.025, 'tundra attrition is preserved');
assert.equal(E.TERRAIN.peak.blocked, true, 'impassable peaks remain blocked');

// World Conquest and regional scenarios (including World Campaign) receive +2;
// Story Mode does not. Warships never receive the bonus.
for (const mode of ['conquest', 'scenario', 'campaign']) {
  g.mode = mode;
  assert.equal(E.movement(g, u), mode === 'campaign' ? 2 : 4,
    mode + ' applies its intended Gareth movement rules');
  const ship = { ...u, type: 'carrier_battleship', cmd: null, elite: null };
  assert.equal(E.movement(g, ship), E.TYPES.carrier_battleship.move,
    mode + ' retains the listed warship speed');
}
g.mode = 'campaign';

// Isolate one valid forest/mountain/tundra/crater step using the real tactical map.
const valid = t => t && !E.TERRAIN[t.terrain]?.blocked && !E.isSea(t);
let source = null, target = null;
for (const t of g.tiles) {
  if (!valid(t)) continue;
  const n = E.adjacent(g, t).find(v => valid(v) && ['forest', 'mountain', 'snow', 'crater'].includes(v.terrain));
  if (n) { source = t; target = n; break; }
}
assert.ok(source && target, 'Story Mode battlefield contains adjacent rough terrain');
assert.equal(E.TERRAIN[target.terrain].cost, 1, 'rough terrain now costs one');
g.units = [u]; // Nearby scripted units must not obstruct the movement regression.
g.stations = []; // Test terrain movement without a defensive city obstructing the target.
u.c = source.c;
u.r = source.r;
u.moved = u.attacked = false;
g.phase = g.player;
const key = target.c + ',' + target.r;
assert.equal(E.reachable(g, u).get(key), 1, 'Gareth can enter a rough terrain hex for one point');
const result = E.move(g, u.id, target.c, target.r);
assert.equal(result.ok, true, result.reason || 'Gareth can make the actual move');
assert.equal(u.c, target.c);
assert.equal(u.r, target.r);

// All regular siege frames now share the same two-point base movement.
assert.equal(E.CLASSES.siege.move, 2, 'Siege base movement is standardized');
const otherSiege = Object.entries(E.TYPES).find(([id, t]) => id !== 'gareth' &&
  t.cls === 'siege' && !t.elite && t.move === 2);
assert.ok(otherSiege, 'ordinary Siege frames receive the global movement increase');
console.log('Story Mode Gareth base mobility and scenario/conquest bonuses: PASS');

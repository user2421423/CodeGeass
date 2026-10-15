#!/usr/bin/env node
'use strict';
// Story Mode Canterbury must be able to traverse rough terrain with the universal +2 bonus.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
require('../dist/campaign.js');

assert.equal(E.TYPES.canterbury.move, 2, 'Canterbury needs 2 base movement');
const g = E.campaign.createMission('eb_weisswolf', 20261015, 'normal');
assert.equal(g.mode, 'campaign', 'regression uses a real Story Mode operation');
const u = g.units.find(v => v.type === 'canterbury' && v.side === g.player);
assert.ok(u, 'Euro Britannia Story Mode begins with Canterbury');
assert.equal(E.movement(g, u), 4, 'uncommanded Canterbury receives the universal +2 bonus');
for (const terrain of ['forest', 'mountain', 'snow', 'crater'])
  assert.equal(E.TERRAIN[terrain].cost, 1, terrain + ' costs one movement point');
assert.equal(E.TERRAIN.forest.cover, 0.15, 'forest cover is preserved');
assert.equal(E.TERRAIN.mountain.cover, 0.25, 'mountain cover is preserved');
assert.equal(E.TERRAIN.snow.attrition, 0.025, 'tundra attrition is preserved');
assert.equal(E.TERRAIN.peak.blocked, true, 'impassable peaks remain blocked');

// World Conquest, regional scenarios (including World Campaign), and Story Mode
// must all receive the same bonus. Warships must not receive it.
for (const mode of ['conquest', 'scenario', 'campaign']) {
  g.mode = mode;
  assert.equal(E.movement(g, u), 4, mode + ' gives Canterbury the +2 bonus');
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
assert.equal(E.reachable(g, u).get(key), 1, 'Canterbury can enter a rough terrain hex for one point');
const result = E.move(g, u.id, target.c, target.r);
assert.equal(result.ok, true, result.reason || 'Canterbury can make the actual move');
assert.equal(u.c, target.c);
assert.equal(u.r, target.r);

// All regular siege frames now share the same two-point base movement.
assert.equal(E.CLASSES.siege.move, 2, 'Siege base movement is standardized');
const otherSiege = Object.entries(E.TYPES).find(([id, t]) => id !== 'canterbury' &&
  t.cls === 'siege' && !t.elite && t.move === 2);
assert.ok(otherSiege, 'ordinary Siege frames receive the global movement increase');
console.log('Story Mode Canterbury rough-terrain mobility: PASS');

#!/usr/bin/env node
'use strict';
// Story Mode Canterbury must be able to leave a hex into cost-2 rough terrain.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
require('../dist/campaign.js');

assert.equal(E.TYPES.canterbury.move, 2, 'Canterbury needs 2 base movement');
const g = E.campaign.createMission('eb_weisswolf', 20261015, 'normal');
assert.equal(g.mode, 'campaign', 'regression uses a real Story Mode operation');
const u = g.units.find(v => v.type === 'canterbury' && v.side === g.player);
assert.ok(u, 'Euro Britannia Story Mode begins with Canterbury');
assert.equal(E.movement(g, u), 2, 'uncommanded Canterbury has two movement points');

// Isolate one valid rough-terrain step using the real tactical mission's map.
const valid = t => t && !E.TERRAIN[t.terrain]?.blocked && !E.isSea(t);
let source = null, target = null;
for (const t of g.tiles) {
  if (!valid(t)) continue;
  const n = E.adjacent(g, t).find(v => valid(v) && E.TERRAIN[v.terrain]?.cost === 2);
  if (n) { source = t; target = n; break; }
}
assert.ok(source && target, 'Story Mode battlefield contains adjacent rough terrain');
assert.equal(E.TERRAIN[target.terrain].cost, 2, 'forest, mountain or tundra still costs two');
g.units = [u]; // Nearby scripted units must not obstruct the movement regression.
g.stations = []; // Test terrain movement without a defensive city obstructing the target.
u.c = source.c;
u.r = source.r;
u.moved = u.attacked = false;
g.phase = g.player;
const key = target.c + ',' + target.r;
assert.equal(E.reachable(g, u).get(key), 2, 'Canterbury can enter a cost-2 hex');
const result = E.move(g, u.id, target.c, target.r);
assert.equal(result.ok, true, result.reason || 'Canterbury can make the actual move');
assert.equal(u.c, target.c);
assert.equal(u.r, target.r);

// Other regular siege frames and rough-terrain movement penalties remain intact.
assert.equal(E.TYPES.gareth.move > 0, true);
const otherSiege = Object.entries(E.TYPES).find(([id, t]) => id !== 'canterbury' &&
  t.cls === 'siege' && !t.elite && t.move === 1);
assert.ok(otherSiege, 'ordinary Siege mobility has not been raised globally');
console.log('Story Mode Canterbury rough-terrain mobility: PASS');

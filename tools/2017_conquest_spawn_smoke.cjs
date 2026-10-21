#!/usr/bin/env node
'use strict';
// Regression: 2017 Conquest scripted formations must stay on the intended
// faction's territory, and both land frames and ships can start on coast hexes.
// Run after node tools/build_sources.cjs.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const { ARMY_DATA, WORLD } = require('../dist/engine/world.js');

function hexOf(lon, lat) {
  const r = Math.max(0, Math.min(WORLD.rows - 1,
    Math.round((WORLD.lat0 - lat) / WORLD.dlat)));
  const c = Math.round((lon - WORLD.lon0) / WORLD.dlon - .5 - .5 * (r & 1));
  return { c: ((c % WORLD.cols) + WORLD.cols) % WORLD.cols, r };
}

const inspected = [];
const displaced = [];
for (const difficulty of ['normal', 'hard', 'challenge', 'elite']) {
  for (const player of ['britannia', 'eu', 'cf']) {
    const g = E.createGame(player, difficulty, 'conquest', 20261021, 'world');
    const startingLand = g.units.slice(0, ARMY_DATA.length);
    assert.equal(startingLand.length, ARMY_DATA.length,
      difficulty + '/' + player + ': every scripted land army deploys');

    for (let i = 0; i < ARMY_DATA.length; i++) {
      const [side, cls, lon, lat, , commander] = ARMY_DATA[i];
      const u = startingLand[i], t = E.tile(g, u.c, u.r);
      const label = difficulty + '/' + player + ' #' + i + ' ' + side +
        ' ' + (commander || cls);
      assert.equal(u.side, side, label + ': roster/order preserved');
      assert.ok(!E.isSea(t) && !E.TERRAIN[t.terrain]?.blocked,
        label + ': land start must be traversable (coast is valid)');
      assert.equal(t.owner, side,
        label + ': cannot start on enemy, neutral or unclaimed territory');
      const distance = E.distance(u, hexOf(lon, lat), g);
      if (distance > 9 && difficulty === 'normal' && player === 'britannia')
        displaced.push({ index: i, side, cls, commander, anchor: [lon, lat],
          actual: [u.c, u.r], terrain: t.terrain, distance });
      if (side === 'britannia' && lon >= 129 && lon <= 144 && lat >= 30 && lat <= 46) {
        assert.ok(u.c >= 154 && u.c <= 163 && u.r >= 16 && u.r <= 27,
          label + ': Japanese starting force must not drift to mainland Korea');
      }
    }
    for (const u of g.units.filter(u => E.TYPES[u.type]?.naval && !E.TYPES[u.type]?.air)) {
      assert.ok(E.navigable(E.tile(g, u.c, u.r)),
        difficulty + '/' + player + ': ship must be on sea or navigable coast');
    }
    inspected.push({ player, difficulty, land: startingLand.length });
  }
}
assert.deepEqual(displaced, [], '2017 starting formations displaced far from their coordinates');
console.log('2017 Conquest: scripted armies on faction-owned land/coast near anchor; no Korean spawns; navigable ship starts: PASS');
console.log(JSON.stringify(inspected));

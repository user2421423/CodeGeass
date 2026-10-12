'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

test('2017: most EU land units face the Chinese Federation along the frontier', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 246801, 'world');
  const eu = g.units.filter(u => u.side === 'eu' && !E.TYPES[u.type].naval);
  assert.equal(eu.length, 43, '2017 EU army strength is unchanged');

  // Breadth-first distance along EU-owned hexes to any EU/CF border hex.
  const depth = new Int16Array(g.tiles.length).fill(-1);
  const queue = [];
  for (const tile of g.tiles) {
    if (tile.owner !== 'eu' || !E.adjacent(g, tile).some(n => n.owner === 'cf')) continue;
    depth[tile.r * g.cols + tile.c] = 0;
    queue.push(tile);
  }
  for (let head = 0; head < queue.length; head++) {
    const tile = queue[head], d = depth[tile.r * g.cols + tile.c];
    for (const next of E.adjacent(g, tile)) {
      const i = next.r * g.cols + next.c;
      if (next.owner !== 'eu' || next.terrain === 'sea' || depth[i] !== -1) continue;
      depth[i] = d + 1;
      queue.push(next);
    }
  }

  const forward = eu.filter(u => {
    assert.equal(E.tile(g, u.c, u.r).owner, 'eu', 'EU unit must start on EU territory');
    const d = depth[u.r * g.cols + u.c];
    return d >= 0 && d <= 4;
  });
  assert.ok(forward.length >= 30, `Expected at least 30 of 43 near China, got ${forward.length}`);
  assert.equal(eu.filter(u => u.cmd === 'akito').length, 1);
  assert.equal(eu.filter(u => u.cmd === 'leila').length, 1);
});

test('2018 starts remain a separate conquest', () => {
  const g = E.createGame('cf', 'normal', 'conquest', 246801, 'ufn2018');
  assert.equal(g.era, 'ufn2018');
  assert.equal(g.stations.filter(s => s.owner === 'eb').length, 23);
  assert.equal(g.stations.filter(s => s.owner === 'cf').length, 68);
});

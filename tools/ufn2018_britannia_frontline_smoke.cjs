#!/usr/bin/env node
'use strict';
// 2018-only Britannian deployment regression. Run after tools/build_sources.cjs.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const region = u => {
  const lat = 74 - u.r * (128 / 75);
  const lon = -180 + (u.c + 0.5 + 0.5 * (u.r & 1)) * 2;
  if (lon >= 90 && lon <= 124 && lat >= 46 && lat <= 65) return 'Siberia';
  if (lon >= 125 && lon <= 150 && lat >= 25 && lat <= 48) return 'Japan';
  if (lon >= 115 && lon < 130 && lat >= 4 && lat <= 25) return 'Philippines';
  if (lon >= 28 && lon <= 65 && lat >= 21 && lat <= 42) return 'Middle East';
  if (lon >= 8 && lon <= 42 && lat >= -32 && lat <= 21) return 'African UFN front';
  return 'OUTSIDE';
};
for (const player of ['britannia','eb','cf']) {
  const g = E.createGame(player, 'normal', 'conquest', 20261021, 'ufn2018');
  const units = g.units.filter(u => u.side === 'britannia' && u.hp > 0);
  const land = units.filter(u => !E.TYPES[u.type].naval);
  const air = units.filter(u => E.TYPES[u.type].air);
  const navy = units.filter(u => E.TYPES[u.type].naval && !E.TYPES[u.type].air);
  assert.equal(land.length, 30, player + ': all 30 Britannian land formations spawn');
  assert.equal(navy.length, 7, player + ': all 7 Britannian naval formations spawn');
  assert.equal(air.length, 1, player + ': Britannian frontline airship spawns');
  const starts = { 'Middle East':0, 'Japan':0, 'Philippines':0, 'Siberia':0, 'African UFN front':0 };
  for (const u of units) assert.notEqual(region(u), 'OUTSIDE',
    player + ': unexpected off-front Britannian ' + (u.cmd || u.type) +
    ' at ' + u.c + ',' + u.r);
  for (const u of land) starts[region(u)]++;
  // The world map's coarse Philippine island has two viable Britannian dry-land\n  // starts; the third forward-targeted formation stages in Japan instead.\n  assert.deepEqual(starts, {
    'Middle East':8, 'Japan':6, 'Philippines':2, 'Siberia':4, 'African UFN front':10
  }, player + ': preserve intended land-front distribution');
  assert.equal(land.filter(u => u.cmd).length, 21, player + ': all 21 Britannian commanders deploy');
  assert.equal(region(land.find(u => u.cmd === 'charles')), 'Middle East');
  assert.equal(region(land.find(u => u.cmd === 'bismarck')), 'Siberia');
  assert.equal(region(air[0]), 'Middle East');
  for (const u of land.filter(u => region(u) === 'Siberia')) {
    assert.equal(E.tile(g,u.c,u.r).owner, 'eb',
      'Britannian Siberian contingent must stage on allied Euro-Britannian territory');
  }
}
const world = E.createGame('britannia','normal','conquest',20261021,'world');
assert.ok(world.units.some(u => u.side === 'britannia' && region(u) === 'OUTSIDE'),
  'The 2017 world war keeps its original worldwide Britannian deployments');
console.log('2018 Britannian frontlines, navy, airship, Siberian allied staging, and 2017 isolation: PASS');

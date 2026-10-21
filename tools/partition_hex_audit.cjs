#!/usr/bin/env node
'use strict';
// Full-grid North America land / shallow shore / water / outside-land audit.
// Run after tools/build_partition_geography.py and tools/build_sources.cjs.
const assert = require('node:assert/strict');
const coverage = require('../dist/partition-geography.js');
const { E } = require('./scenario_sim.cjs');
const scenario = E.scenarios.byId['partition-britannia'];
const bytes = Buffer.from(coverage.coverage, 'base64');
const C = coverage.cols, R = coverage.rows, B = coverage.bounds;
assert.equal(C, 178);
assert.equal(R, 110);
assert.equal(bytes.length, C * R);
assert.equal(scenario.meta.saveVersion, 1);

const count = [0, 0, 0, 0];
for (let i = 0; i < bytes.length; i++) {
  const kind = bytes[i];
  assert(kind >= 0 && kind <= 3, 'unrecognized geography class at ' + i);
  count[kind]++;
}
assert(count.every(n => n > 0), 'sea, mixed coast, land and outside land must all exist');
const sample = (lon, lat) => {
  const r = Math.max(0, Math.min(R - 1, Math.round((B.north - lat) * R / (B.north - B.south) - 0.5)));
  const c = Math.max(0, Math.min(C - 1, Math.round((lon - B.west) * C / (B.east - B.west) - 0.5 - 0.5 * (r & 1))));
  return { kind: bytes[r * C + c], c, r };
};
for (const [place, lon, lat, expected] of [
  ['Pacific Ocean', -132, 42, 0],
  ['Atlantic Ocean', -64, 38, 0],
  ['Gulf of Mexico', -92, 26, 0],
  ['Hudson Bay', -86, 60, 0],
  ['Lake Michigan', -87, 44, 0],
  ['Denver', -105, 39.74, 2],
  ['Oklahoma', -99, 35, 2],
  ['Mexico: Sonora', -110, 29, 3],
  ['Mexico: Chihuahua', -107, 29, 3],
]) assert.equal(sample(lon, lat).kind, expected,
  place + ' should be class ' + expected + ' (hex ' + JSON.stringify(sample(lon, lat)) + ')');

const game = scenario.create('remnants', 'normal', 11);
assert.equal(game.tiles.length, bytes.length);
const citySites = new Set(game.stations.map(s => s.r * C + s.c));
const occupied = new Set(game.units.map(u => u.r * C + u.c));
let water = 0, coast = 0, dry = 0, foreign = 0, coastCities = 0, ports = 0;
for (let i = 0; i < bytes.length; i++) {
  const tile = game.tiles[i], kind = bytes[i];
  const sea = tile.terrain === 'sea', blocked = tile.terrain === 'offmap';
  if (kind === 0) { assert(sea); water++; }
  else if (kind === 3) {
    assert(blocked, 'Mexico/Greenland land must be impassable, not ocean: ' + i);
    assert.equal(tile.owner, null);
    assert(!E.navigable(tile), 'external land must not provide a naval shortcut');
    assert(!citySites.has(i) && !occupied.has(i), 'no city or frame may spawn in foreign land');
    foreign++;
  } else {
    assert(!sea && !blocked, 'playable land must remain dry');
    if (kind === 1 && tile.terrain === 'coast') coast++;
    if (kind === 2 || kind === 1) dry++;
    if (citySites.has(i) && kind === 1) {
      assert.equal(tile.terrain, 'coast', 'coastal city must keep shore classification');
      coastCities++;
    }
  }
}
assert.deepEqual([water, foreign], [count[0], count[3]]);
for (const city of game.stations) {
  const tile = game.tiles[city.r * C + city.c];
  assert(!E.isSea(tile) && !E.TERRAIN[tile.terrain]?.blocked,
    'city placed on water / foreign land: ' + city.name);
  if (city.portAt) {
    const harbor = E.tile(game, city.portAt.c, city.portAt.r);
    assert(harbor && E.navigable(harbor), 'port must connect to navigable water: ' + city.name);
    assert(E.adjacent(game, city).includes(harbor), 'port must border city: ' + city.name);
    ports++;
  }
}
for (const side of scenario.sides) {
  const g = scenario.create(side, 'normal', 11);
  const before = JSON.stringify({
    units: g.units.map(u => [u.id, u.side, u.c, u.r, u.hp]),
    cities: g.stations.map(s => [s.name, s.owner, s.c, s.r]),
    economy: g.economy, terrain: g.tiles.map(t => t.terrain),
  });
  const restored = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
  assert(restored, 'saved battle must still load unchanged, including preexisting scenario v1 saves');
  const after = JSON.stringify({
    units: restored.units.map(u => [u.id, u.side, u.c, u.r, u.hp]),
    cities: restored.stations.map(s => [s.name, s.owner, s.c, s.r]),
    economy: restored.economy, terrain: restored.tiles.map(t => t.terrain),
  });
  assert.equal(after, before, 'save roundtrip must preserve all game state for ' + side);
}
console.log(JSON.stringify({ auditedHexes: bytes.length,
  ocean: count[0], shore: count[1], inland: count[2], foreignLand: count[3],
  actualCoast: coast, coastlineCities: coastCities, harborCities: ports,
  cityCount: game.stations.length, savedSectors: scenario.sides.length }));
console.log('PASS: Partition U.S./Canada geographic hex and save audit.');

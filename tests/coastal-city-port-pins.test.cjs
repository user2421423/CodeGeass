'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');
const root = path.join(__dirname, '..');
const anchors = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/coastal_city_port_anchors.json'), 'utf8'));
const world = require('../dist/engine/world.js').WORLD_ROWS;
const original = fs.readFileSync(path.join(root, 'tools/data/map_locked.txt'), 'utf8').trim().split('\n');

test('city and starting port terrain remains exactly as before 20-80% reclassification', () => {
  assert.equal(anchors.cities.length, 149);
  assert.equal(anchors.ports.length, 12);
  for (const entry of [...anchors.cities, ...anchors.ports]) {
    assert.equal(world[entry.r][entry.c], entry.terrain, 'terrain changed at ' + entry.name);
    assert.equal(original[entry.r][entry.c], entry.terrain, 'baseline mismatch: ' + entry.name);
  }
});

test('all cities and all original ports retain identical starting coordinates on all conquest difficulties', () => {
  for (const player of E.MAJORS) for (const difficulty of ['normal', 'hard', 'challenge']) {
    const g = E.createGame(player, difficulty, 'conquest', 246801);
    assert.equal(g.stations.length, anchors.cities.length);
    const cities = new Map(g.stations.map(s => [s.name, s]));
    for (const expected of anchors.cities) {
      const actual = cities.get(expected.name);
      assert(actual, 'city missing: ' + expected.name);
      assert.deepEqual([actual.c, actual.r], [expected.c, expected.r], 'city moved: ' + expected.name);
      assert.equal(E.tile(g, actual.c, actual.r).terrain, 'plains', 'city no longer on solid land: ' + expected.name);
    }
    for (const expected of anchors.ports) {
      const city = cities.get(expected.name);
      assert(city?.portAt, 'starting port removed: ' + expected.name);
      assert.deepEqual([city.portAt.c, city.portAt.r], [expected.c, expected.r],
        'port moved: ' + expected.name);
      assert.equal(E.tile(g, expected.c, expected.r).terrain, 'sea',
        'port hex not open water: ' + expected.name);
    }
    const pearl = cities.get('Pearl Harbor');
    assert.deepEqual([pearl.c, pearl.r], [10, 31]);
    assert.deepEqual([pearl.portAt.c, pearl.portAt.r], [10, 30]);
  }
});

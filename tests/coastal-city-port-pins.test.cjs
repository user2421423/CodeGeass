'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');
const root = path.join(__dirname, '..');
const anchors = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/coastal_city_port_anchors.json'), 'utf8'));
const worldData = require('../dist/engine/world.js');
const world = worldData.WORLD_ROWS;
const activeCities = new Set(worldData.CITY_DATA.map(([name]) => name));
const historicalAnchors = new Set(anchors.cities.slice(0, 149).map(entry => entry.name));
const original = fs.readFileSync(path.join(root, 'tools/data/map_locked.txt'), 'utf8').trim().split('\n');

test('historic city/port terrain stays fixed and all new city terrain anchors are valid', () => {
  assert.equal(anchors.cities.length, 183);
  assert.equal(activeCities.size, 168);
  assert.equal(historicalAnchors.size, 149);
  assert.equal(anchors.ports.length, 12);
  for (const entry of [...anchors.cities, ...anchors.ports]) {
    assert.equal(world[entry.r][entry.c], entry.terrain, 'terrain changed at ' + entry.name);
    // The locked pre-overlay baseline predates the 34 newly added cities.
    // Retired city anchors remain for coastline stability, but are not game cities.
    if (historicalAnchors.has(entry.name) || anchors.ports.includes(entry))
      assert.equal(original[entry.r][entry.c], entry.terrain, 'baseline mismatch: ' + entry.name);
  }
});

test('all active cities and all original ports retain pinned positions on all conquest difficulties', () => {
  const liveAnchors = anchors.cities.filter(entry => activeCities.has(entry.name));
  assert.equal(liveAnchors.length, 168);
  for (const player of E.MAJORS) for (const difficulty of ['normal', 'hard', 'challenge']) {
    const g = E.createGame(player, difficulty, 'conquest', 246801);
    assert.equal(g.stations.length, liveAnchors.length);
    const cities = new Map(g.stations.map(s => [s.name, s]));
    for (const expected of liveAnchors) {
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


test('all twelve original starting ports remain connected through navigable hexes', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 246801);
  const stations = new Map(g.stations.map(s => [s.name, s]));
  const start = stations.get(anchors.ports[0].name).portAt;
  const queue = [start], visited = new Set([start.c + ',' + start.r]);
  const isWater = t => t && (t.terrain === 'sea' || t.terrain === 'coast');
  const adjacent = (c, r) => {
    const q = c - Math.floor(r / 2);
    return [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]
      .map(([dq, dr]) => E.tile(g, q + dq + Math.floor((r + dr) / 2), r + dr))
      .filter(isWater);
  };
  for (let i = 0; i < queue.length; i++) {
    for (const t of adjacent(queue[i].c, queue[i].r)) {
      const k = t.c + ',' + t.r;
      if (!visited.has(k)) { visited.add(k); queue.push(t); }
    }
  }
  for (const p of anchors.ports) {
    assert(visited.has(p.c + ',' + p.r), 'isolated naval access to port: ' + p.name);
  }
});

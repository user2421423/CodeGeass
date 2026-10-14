'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CAMPAIGNS } = require('../dist/missions.js');
const missions = Object.fromEntries(Object.values(CAMPAIGNS).flatMap(c => c.missions).map(m => [m.id, m]));

test('story mission IDs and six campaign groupings remain stable', () => {
  assert.equal(Object.keys(CAMPAIGNS).length, 6);
  assert.equal(Object.keys(missions).length, 58);
  assert.equal(missions.br1.title, 'The Fall of Tokyo');
  assert.equal(missions.br_mausoleum.title, 'Defense of the Forbidden City');
  assert.equal(missions.eb_fall.title, 'The Fall of Paris');
});

test('Warsaw missions use localized districts, not the Eastern European theatre', () => {
  const a = missions.br6, d = missions.eu_front;
  assert.equal(a.title, 'Assault on Warsaw');
  assert.equal(d.title, 'Defense of Warsaw');
  assert.deepEqual(a.map, d.map);
  assert.equal(a.map.length, 14);
  assert.ok(a.map.every(row => row.length === 24));
  const places = a.cities.map(c => c[0]);
  assert.deepEqual(places, ['Eastern Field HQ', 'South Industrial Works', 'Praga Rail Junction', 'Citadel Gate', 'Warsaw']);
  assert.ok(!places.some(p => ['Moscow', 'Smolensk', 'Minsk', 'Vilnius'].includes(p)));
  assert.ok(a.stars[1].capture.every(p => places.includes(p)));
  assert.ok(d.stars[0].keep.every(p => places.includes(p)));
  assert.deepEqual(a.lose.cities, ['Eastern Field HQ']);
  assert.deepEqual(d.lose.cities, ['Warsaw']);
  for (const m of [a, d]) {
    for (const unit of m.units) {
      assert.ok(unit[2] >= 0 && unit[2] < 24 && unit[3] >= 0 && unit[3] < 14);
    }
  }
});

test('Pacific convoy missions remain paired tactical engagements', () => {
  const a = missions.bk_pacific, d = missions.br_pacific;
  assert.deepEqual(a.map, d.map);
  assert.equal(a.map.length, 13);
  assert.ok(a.map.every(row => row.length === 24));
  assert.deepEqual(a.win, { capture: ['Governor’s Flagship'] });
  assert.deepEqual(d.win, { hold: 9 });
});

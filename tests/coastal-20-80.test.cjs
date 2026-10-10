'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const rule = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/coastal_20_80.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'dist/engine/world.js'), 'utf8');
const part = source.split('// <world>')[1].split('// </world>')[0];
const world = [...part.matchAll(/'([.a-z]+)'/g)].map(m => m[1]);
const baseline = fs.readFileSync(path.join(root, 'tools/data/map_locked.txt'), 'utf8').trim().split('\n');
const anchors = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/coastal_city_port_anchors.json'), 'utf8'));
const protectedHexes = new Map([...anchors.cities, ...anchors.ports].map(e => [e.c + ',' + e.r, e.terrain]));

test('20/80 classification applies everywhere except city and starting port anchors', () => {
  assert.equal(world.length, 76);
  assert.equal(rule.rows.length, 76);
  assert.equal(rule.cols, 180);
  assert.deepEqual(rule.thresholds, { sea_below: 0.2, land_above: 0.8 });
  for (let r = 0; r < 76; r++) {
    assert.equal(rule.rows[r].length, 180);
    assert.equal(world[r].length, 180);
    for (let c = 0; c < 180; c++) {
      const category = rule.rows[r][c];
      const terrain = world[r][c];
      const pinned = protectedHexes.get(c + ',' + r);
      if (pinned) {
        assert.equal(terrain, pinned, 'city/port tile must retain original terrain at ' + c + ',' + r);
        continue;
      }
      assert(['S', 'C', 'L'].includes(category), 'unknown category at ' + c + ',' + r);
      if (category === 'S') assert.equal(terrain, '.', 'sea expected at ' + c + ',' + r);
      else if (category === 'C') assert.equal(terrain, 'w', 'coast expected at ' + c + ',' + r);
      else assert(!'.w'.includes(terrain), 'solid land expected at ' + c + ',' + r);
    }
  }
});

test('snapshot the experimental scope to make later terrain drift visible', () => {
  let changed = 0, sea = 0, coast = 0, land = 0;
  for (let r = 0; r < 76; r++) for (let c = 0; c < 180; c++) {
    if (world[r][c] !== baseline[r][c]) changed++;
    const type = rule.rows[r][c];
    if (type === 'S') sea++;
    else if (type === 'C') coast++;
    else land++;
  }
  assert.deepEqual({ changed, sea, coast, land }, { changed: 573, sea: 8950, coast: 862, land: 3868 });
});

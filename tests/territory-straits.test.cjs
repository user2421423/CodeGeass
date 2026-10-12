'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

function ownerAt(g, lon, lat) {
  const r = Math.round((74 - lat) / (128 / 75));
  const c = Math.round((lon + 180) / 2 - 0.5 - 0.5 * (r & 1));
  // Some real-world locations fall in coastal sea cells at the 2° tactical
  // resolution. Inspect the nearest playable land hex instead of requiring
  // the requested lon/lat to have a solid-land centre.
  const candidates = [];
  for (let dr = -2; dr <= 2; dr++)
    for (let dc = -2; dc <= 2; dc++) {
      const t = E.tile(g, c + dc, r + dr);
      if (t && t.terrain !== 'sea')
        candidates.push({ t, d: dc * dc + dr * dr });
    }
  candidates.sort((a, b) => a.d - b.d);
  assert.ok(candidates.length, 'expected nearby playable land at ' + lon + ',' + lat);
  return candidates[0].t.owner;
}

for (const [era, arabia] of [['world', 'neutral'], ['ufn2018', 'britannia']]) {
  test(era + ': mainland Australia stays neutral; Arabia does not inherit Iranian ownership across the gulf', () => {
    const g = E.createGame('britannia', 'normal', 'conquest', 1234, era);
    // Approximate inland tile centres deliberately avoid shoreline classification.
    for (const [lon, lat] of [[135,-14.5],[141.5,-15.5],[145,-20],[131,-16],[119,-23],[150,-28]]) {
      assert.equal(ownerAt(g, lon, lat), 'neutral', 'Australia ' + lon + ',' + lat);
    }
    for (const [lon, lat] of [[46,25],[48,22],[53,23],[55,20],[43,19]]) {
      assert.equal(ownerAt(g, lon, lat), arabia, 'Arabia ' + lon + ',' + lat);
    }
    assert.equal(E.tile(g, 161, 50).owner, 'neutral',
      'Cape York must remain Australian, not cross-allocated to New Guinea');
    assert.equal(E.tile(g, 160, 49).owner, 'cf',
      'The opposite shore on New Guinea stays Federation-controlled');
    const cities = Object.fromEntries(g.stations.map(s => [s.name,s.owner]));
    assert.equal(cities.Darwin, 'neutral');
    assert.equal(cities.Brisbane, 'neutral');
    assert.equal(cities.Riyadh, arabia);
    assert.equal(cities.Dubai, arabia);
    assert.equal(cities['Port Moresby'], 'cf');
    assert.equal(cities.Tehran, 'cf');
    for (const s of g.stations) assert.equal(E.tile(g, s.c, s.r).owner, s.owner, s.name);
  });
}

test('Strait shoreline coloring checks the bank of the Persian Gulf, not only distance', () => {
  const fs = require('node:fs');
  const geo = fs.readFileSync(require('node:path').join(__dirname, '../dist/ui/geography.js'), 'utf8');
  assert.match(geo, /function persianGulfBank\(/);
  assert.match(geo, /gulfBank && persianGulfBank\(seed\.x, seed\.y\) !== gulfBank/);
});

for (const era of ['world', 'ufn2018']) {
  test(era + ': existing saves repair Cape York without resetting conquered Australian cities', () => {
    const legacy = E.createGame('britannia', 'normal', 'conquest', 1234, era);
    E.setTileOwner(legacy, E.tile(legacy, 161, 50), 'cf');
    const loaded = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(legacy))));
    assert.ok(loaded);
    assert.equal(E.tile(loaded, 161, 50).owner, 'neutral');

    const conquered = E.createGame('britannia', 'normal', 'conquest', 1234, era);
    E.setTileOwner(conquered, E.tile(conquered, 161, 50), 'cf');
    conquered.stations.find(s => s.name === 'Darwin').owner = 'cf';
    const savedConquest = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(conquered))));
    assert.ok(savedConquest);
    assert.equal(E.tile(savedConquest, 161, 50).owner, 'cf',
      'real Australian conquest is not reset');
  });
}

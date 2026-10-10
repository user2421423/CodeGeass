const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

// The Cook Strait separates these cells from Auckland's initial land flood-fill.
const SOUTH_ISLAND = [
  [175, 68], [176, 68], [173, 69], [174, 69],
  [175, 69], [173, 70], [174, 70], [175, 70],
];

function verifySouthIsland(g, owner = 'britannia') {
  const auckland = g.stations.find(s => s.name === 'Auckland');
  assert(auckland, 'Auckland must exist');
  for (const [c, r] of SOUTH_ISLAND) {
    const tile = E.tile(g, c, r);
    assert(tile && tile.terrain !== 'sea', c + ',' + r + ' must remain playable land');
    assert.equal(tile.owner, owner, c + ',' + r + ' should follow Auckland ownership');
    assert.equal(tile.provinceCity, auckland.id, c + ',' + r + ' must be an Auckland province');
  }
}

test('Every starting conquest owns the full New Zealand South Island', () => {
  for (const side of E.MAJORS) {
    const g = E.createGame(side, 'normal', 'conquest', 7);
    verifySouthIsland(g);
  }
});

test('New Zealand repair migrates old saves without erasing captures', () => {
  const game = E.createGame('eu', 'normal', 'conquest', 7);
  const auckland = game.stations.find(s => s.name === 'Auckland');
  auckland.owner = 'eu'; // Auckland may already have been captured.
  for (const [c, r] of SOUTH_ISLAND) {
    const tile = E.tile(game, c, r);
    tile.owner = null; // Reproduce the prior disconnected-island bug.
    delete tile.provinceCity;
  }
  const retained = E.tile(game, 175, 70);
  retained.owner = 'cf'; // Respect territory already reassigned by a past game.
  retained.provinceCity = auckland.id;

  const restored = E.migrateSave(E.packSave(game));
  assert(restored, 'saved game must load');
  for (const [c, r] of SOUTH_ISLAND) {
    const tile = E.tile(restored, c, r);
    assert.equal(tile.owner, c === 175 && r === 70 ? 'cf' : 'eu');
    assert.equal(tile.provinceCity, auckland.id);
  }
  // Migration must be idempotent and not replace real player changes.
  E.migrateSave(restored);
  assert.equal(E.tile(restored, 175, 70).owner, 'cf');
});

test('New Zealand remains fully owned on Challenge conquest', () => {
  verifySouthIsland(E.createGame('britannia', 'challenge', 'conquest', 7));
});

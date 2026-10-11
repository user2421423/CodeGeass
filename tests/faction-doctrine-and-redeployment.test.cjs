'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

function previewDamage(side, type, defenderSide = 'neutral', terrain = 'plains', distance = 1, commander = null) {
  const g = E.createGame('britannia', 'normal', 'conquest', 42);
  g.units = [];
  g.stations = [];
  g.sites = [];
  for (let c = 128; c <= 130; c++) E.tile(g, c, 27).terrain = terrain;
  const a = E.newUnit(g, type, side, 128, 27, 1, commander);
  const d = E.newUnit(g, E.typeFor('eu', 'light'), defenderSide, 128 + distance, 27, 1);
  const result = E.preview(g, a.id, d.c, d.r);
  assert.ok(result, 'expected an attack preview');
  return result.unit;
}

test('six faction-wide combat and economic doctrines are removed', () => {
  for (const [side, faction] of Object.entries(E.FACTIONS)) {
    assert.equal(faction.doctrine, undefined, side);
    assert.equal(faction.doctrineText, undefined, side);
  }
  const g = E.createGame('britannia', 'normal', 'conquest', 42);
  for (const frame of ['scout', 'assault', 'raider', 'medium']) {
    const type = E.typeFor('cf', frame);
    for (const n of [1, 2, 3]) {
      const expected = {
        credits: Math.round(E.TYPES[type].cost * (1 + 0.85 * (n - 1))),
        industry: Math.round(E.TYPES[type].industry * (1 + 0.85 * (n - 1))),
        sakuradite: Math.round((E.TYPES[type].sakuradite ?? E.SAKURADITE.cost[E.TYPES[type].cls] ?? 0) * (1 + 0.85 * (n - 1))),
      };
      for (const side of ['britannia', 'eu', 'cf', 'bk', 'jlf', 'eb'])
        assert.deepEqual(E.price(type, n, g, side), expected, frame + ' ' + n + ' ' + side);
    }
  }
  const medium = E.typeFor('britannia', 'medium');
  const rocket = E.typeFor('eu', 'rocket');
  assert.equal(previewDamage('britannia', medium), previewDamage('eu', medium), 'no Britannian armor bonus');
  assert.equal(previewDamage('eu', rocket, 'neutral', 'plains', 2), previewDamage('britannia', rocket, 'neutral', 'plains', 2), 'no E.U. artillery bonus');
  assert.equal(previewDamage('bk', medium, 'neutral', 'forest'), previewDamage('eu', medium, 'neutral', 'forest'), 'no Black Knights terrain bonus');
  assert.equal(previewDamage('eb', medium, 'neutral', 'plains', 1, 'bismarck'), previewDamage('eu', medium, 'neutral', 'plains', 1, 'bismarck'), 'no Euro Britannia commander bonus');
  assert.equal(previewDamage('britannia', medium, 'jlf', 'forest'), previewDamage('britannia', medium, 'eu', 'forest'), 'no JLF forest defense bonus');
});

test('four existing Chinese Federation formations redeploy without changing the starting army', () => {
  const expected = [
    [68, 40.8, 'medium', 2],
    [61, 36.45, 'support', 1],
    [127.4, 48.5, 'medium', 2],
    [129, 44.98, 'light', 2],
  ];
  for (const player of E.MAJORS) {
    const g = E.createGame(player, 'normal', 'conquest', 42);
    assert.equal(g.units.filter(u => u.side === 'cf').length, 63);
    assert.equal(g.units.filter(u => u.side === 'britannia').length, 48);
    assert.equal(g.units.filter(u => u.side === 'eu').length, 53);
    for (const [lon, lat, klass, stack] of expected) {
      const p = E.hexOf(lon, lat);
      const tile = E.tile(g, p.c, p.r);
      assert.equal(tile.owner, 'cf', klass + ': start tile belongs to Federation');
      assert.equal(tile.terrain, 'plains', klass + ': safe starting terrain');
      const unit = E.unitAt(g, tile);
      assert.ok(unit, 'Missing relocated unit at ' + p.c + ',' + p.r);
      assert.equal(unit.side, 'cf');
      assert.equal(unit.type, E.typeFor('cf', klass));
      assert.equal(unit.stack, stack);
    }
  }
});

test('eight two-frame Chinese frontline reinforcements spawn in their planned regions', () => {
  const points = [
    [54.8, 34.8, 'heavy'], [65.7, 39.5, 'rocket'],
    [72.7, 42.4, 'medium'], [130.8, 46.2, 'heavy'],
    [56.5, 38.7, 'medium'], [68.2, 38.8, 'rocket'],
    [128.2, 48.3, 'heavy'], [123.2, 42.4, 'medium'],
  ];
  const g = E.createGame('cf', 'normal', 'conquest', 42);
  const army = g.units.filter(u => u.side === 'cf' && !E.internal.isShip(u));
  assert.equal(army.length, 59, 'Chinese non-ship formations (including amphibious)');
  assert.equal(army.reduce((n, u) => n + u.stack, 0), 102, 'Chinese non-ship frames (including amphibious)');
  const matched = new Set();
  for (const [lon, lat, klass] of points) {
    const target = E.hexOf(lon, lat);
    const candidates = army.filter(u => !matched.has(u.id) &&
      u.type === E.typeFor('cf', klass) && u.stack === 2)
      .sort((a,b) => E.internal.dist(g,a,target) - E.internal.dist(g,b,target));
    const u = candidates[0];
    assert.ok(u && E.internal.dist(g,u,target) <= 4,
      'Missing '+klass+' reinforcement near '+lon+','+lat);
    matched.add(u.id);
  }
  assert.equal(matched.size, 8, 'all eight positions have distinct formations');
});

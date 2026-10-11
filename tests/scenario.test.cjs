'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const japan = require('../dist/scenarios.js');

test('Japan scenario generates consistent 112 x 88 terrain and a complete city ownership map', () => {
  const g = japan.create('britannia', 'normal', 11);
  assert.equal(g.mode, 'scenario');
  assert.equal(g.wrap, false);
  assert.equal(g.cols, 112);
  assert.equal(g.rows, 88);
  assert.equal(g.tiles.length, 112 * 88);
  assert.ok(g.tiles.some(t => t.terrain === 'sea'));
  assert.ok(g.tiles.some(t => t.terrain !== 'sea'));
  assert.equal(g.stations.length, 44);
  assert.equal(new Set(g.stations.map(s => s.c + ':' + s.r)).size, g.stations.length);
  assert.equal(new Set(g.units.map(u => u.c + ':' + u.r)).size, g.units.length);
  assert.ok(g.stations.every(s => E.tile(g, s.c, s.r).terrain !== 'sea'));
  assert.ok(g.units.every(u => E.tile(g,u.c,u.r).terrain !== 'sea'));
  assert.ok(g.tiles.filter(t=>t.terrain!=='sea').every(t=>t.provinceCity != null && t.owner));
});

test('All three playable factions use the same starting map and distinct forces', () => {
  const expected = {britannia: [35,32], bk:[5,13], cf:[4,21]};
  const origins=[];
  for (const side of japan.sides) {
    const g=japan.create(side,'normal',11);
    assert.equal(g.player,side);
    assert.equal(g.order[0],side);
    assert.deepEqual(new Set(g.order), new Set(japan.sides));
    assert.equal(E.alive(g, 'bk'),true);
    assert.equal(E.foe(g,'britannia','bk'),false);
    assert.equal(E.foe(g,'britannia','cf'),true);
    assert.equal(E.foe(g,'bk','cf'),true);
    for(const s of japan.sides){
      assert.deepEqual([g.stations.filter(c=>c.owner===s).length,
        g.units.filter(u=>u.side===s).length], expected[s]);
    }
    origins.push(g.tiles.map(t=>t.terrain).join(','));
    assert.equal(E.checkVictory(g),null);
  }
  assert.equal(origins[0],origins[1]);
  assert.equal(origins[0],origins[2]);
});

test('The temporary alliance breaks exactly once on turn 10', () => {
  const g=japan.create('britannia','normal',11);
  g.turn=9;
  assert.equal(japan.onTurn(g),false);
  assert.equal(E.foe(g,'britannia','bk'),false);
  g.turn=10;
  assert.equal(japan.onTurn(g),true);
  assert.equal(E.foe(g,'britannia','bk'),true);
  assert.equal(japan.onTurn(g),false);
  assert.equal(g.scenario.phase,'three-way-war');
});

test('Non-player scenario factions can resolve their first AI turns', () => {
  const g=japan.create('bk','normal',21);
  for(const side of g.order.slice(1)){
    E.beginTurn(g,side,false);
    E.aiProduction(g);
    const ids=g.units.filter(u=>u.hp>0 && u.side===side).map(u=>u.id);
    for(const id of ids) E.aiOrder(g,id);
  }
  E.beginTurn(g,g.player,true);
  assert.equal(E.checkVictory(g),null);
});

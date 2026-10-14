'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const S=require('../dist/scenarios-siberia.js');
const W=require('../dist/war-campaign.js');
test('Siberia loads as an isolated playable scenario and Tier 3 objective',()=>{
  assert.equal(E.scenarios.byId['britannia-siberia'],S);
  assert.deepEqual(S.sides,['britannia','eu']);
  assert.equal(W.ALL['britannia-siberia'].status,'implemented');
  assert.equal(W.ALL['britannia-siberia'].scenarioId,S.id);
  assert.equal(W.registry.britannia[2].missions.length,2);
  assert.equal(W.registry.eu[2].missions.length,4);
  const progress=W.testFixture('britannia',3);
  assert.equal(W.launch(progress,'britannia','britannia-siberia',E.scenarios.byId).ok,true);
});
test('49 named cities, separate ports, real commanders and complete conquest victory',()=>{
  const g=S.create('britannia','normal',147);
  assert.equal(g.cols,160);assert.equal(g.rows,88);
  assert.equal(g.tiles.length,14080);assert.equal(g.stations.length,49);
  assert.equal(new Set(g.stations.map(s=>s.name)).size,49);
  assert.equal(g.stations.filter(s=>s.owner==='britannia').length,13);
  assert.equal(g.stations.filter(s=>s.owner==='eu').length,36);
  assert.equal(g.stations.filter(s=>s.portAt).length,9);
  assert.ok(g.units.some(u=>u.cmd==='cornelia'));
  assert.ok(g.units.some(u=>u.cmd==='akito'));
  assert.ok(g.units.some(u=>E.TYPES[u.type].naval==='ship'));
  assert.equal(S.winner(g),null);
  for(const side of S.sides){
    const other=S.sides.find(s=>s!==side);
    for(const s of g.stations)s.owner=side;
    assert.equal(S.winner(g).winner,side);
    g.stations[0].owner=other;
    assert.equal(S.winner(g),null);
    g.stations[0].owner=side;
  }
});
test('both playable factions and four difficulty rules preserve the same map',()=>{
  for(const side of S.sides)for(const difficulty of ['normal','hard','challenge','elite']){
    const g=S.create(side,difficulty,11);
    assert.equal(g.scenario.id,S.id);
    assert.equal(g.difficulty,difficulty);
    assert.equal(g.mode,'scenario');
    assert.equal(g.scenario.aiDoctrine,'europe');
    assert.equal(g.stations.length,49);
    assert.ok(g.startUnits.britannia>0 && g.startUnits.eu>0);
    assert.equal(g.over,null);
    assert.ok(g.scenario.groups.length>10);
    assert.deepEqual(g.order,[side,S.sides.find(s=>s!==side)]);
    assert.ok(Object.keys(g.scenario.rivers).includes('lena'));
  }
});

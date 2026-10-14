#!/usr/bin/env node
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const M=require('../dist/scenarios-area18.js');
test('Area 18 Arabian Peninsula registered with original scenario identifier',()=>{
 assert.equal(M.id,'area-18');
 assert.equal(E.scenarios.byId['area-18'],M);
 assert.equal(M.cityData.length,43);
 assert.equal(M.cols,120);assert.equal(M.rows,88);
});
for(const player of M.sides)for(const difficulty of ['normal','hard','challenge','elite']){
 test('Arabian Peninsula '+player+' '+difficulty+' creates valid armies and provinces',()=>{
  const g=M.create(player,difficulty,1701);
  assert.equal(g.scenario.id,'area-18');
  assert.equal(g.scenario.version,2);
  assert.equal(g.stations.length,M.cityData.length);
  assert.equal(g.startUnits.britannia>0,true);
  assert.equal(g.startUnits.eu>0,true);
  assert.equal(g.startUnits.cf>0,true);
  assert.deepEqual(new Set(g.stations.map(x=>x.name)),new Set(M.cityData.map(x=>x[0])));
  assert.ok(!g.over,'no premature outcome');
  for(const unit of g.units)assert.equal(E.tile(g,unit.c,unit.r).terrain==='sea',!!E.TYPES[unit.type].naval);
  const clone=JSON.parse(JSON.stringify(g));
  assert.equal(clone.scenario.version,2,'save survives serialization');
  assert.match(M.objective(g),/43/);
  assert.equal(M.winner(g),null);
  for(const s of g.stations)s.owner=player;
  assert.equal(M.winner(g).winner,player,'all-city conquest victory');
 });
}

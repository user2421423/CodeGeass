'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const map=require('../dist/scenarios-urals.js');
const city=(g,name)=>g.stations.find(s=>s.name===name);
const flood=(g,start)=>{const seen=new Set([E.key(start)]),q=[start];
for(let i=0;i<q.length;i++)for(const t of E.adjacent(g,q[i]))
 if(t.terrain!=='sea'&&t.terrain!=='offmap'&&!seen.has(E.key(t))){
 seen.add(E.key(t));q.push(t);}return seen;};
test('Urals registers a standalone 40-city continental battle',()=>{
 assert.equal(E.scenarios.byId['crossing-urals'],map);
 assert.equal(map.cols,120);assert.equal(map.rows,90);
 assert.deepEqual(map.sides,['britannia','eu']);
 for(const side of map.sides){
  const g=map.create(side,'normal',17);
  assert.equal(g.stations.length,40);assert.equal(g.tiles.length,10800);
  assert.equal(g.units.length,123);assert.equal(g.scenario.id,'crossing-urals');
  assert.deepEqual(g.order,[side,map.sides.find(x=>x!==side)]);
  assert.equal(g.scenario.turnLimit,undefined);
  assert.equal(g.scenario.aiDoctrine,'europe');
  assert.ok(g.tiles.every(t=>t.owner&&t.provinceCity!=null));
  assert.equal(new Set(g.units.map(E.key)).size,g.units.length);
  assert.equal(new Set(g.stations.map(E.key)).size,40);
 }
});
test('Ural passes, georeferenced cities and connected continental pathfinding',()=>{
 const g=map.create('britannia','normal',19);
 for(const name of ['Tyumen','Yekaterinburg','Chelyabinsk'])
  assert.equal(city(g,name).owner,'britannia');
 for(const name of ['Perm','Ufa','Izhevsk'])
  assert.equal(city(g,name).owner,'eu');
 assert.ok(city(g,'Perm').c<city(g,'Yekaterinburg').c);
 assert.ok(city(g,'Chelyabinsk').r>city(g,'Yekaterinburg').r);
 for(const t of ['mountain','forest','plains'])assert.ok(g.tiles.some(x=>x.terrain===t),t);
 assert.ok(g.tiles.every(x=>!['sea','offmap','peak'].includes(x.terrain)));
 assert.equal(flood(g,city(g,'Tyumen')).size,g.tiles.length);
 assert.equal(map.mountainPasses.length,6);
 assert.equal(Object.keys(map.rivers).length,8);
 assert.equal(map.supplyCorridors.length,3);
 for(const s of g.stations){
  const c=map.cityData.find(x=>x[0]===s.name),p=map.geo(s.c,s.r);
  assert.ok(Math.abs(p.lon-c[1])<.5&&Math.abs(p.lat-c[2])<.5,s.name);
 }
});
test('Four difficulty settings, scenario AI, deployment and elite conversion',()=>{
 for(const side of map.sides)for(const difficulty of ['normal','hard','challenge','elite']){
  const g=map.create(side,difficulty,29);
  const rival=map.sides.find(x=>x!==side),plan=E.aiPlan(g,rival);
  assert.equal(g.difficulty,difficulty);
  assert.ok(g.scenario.groups.length>=20);
  assert.ok(g.scenario.groups.every(gr=>gr.units.length&&gr.units.every(id=>
    g.units.some(u=>u.id===id&&u.side===gr.side))));
  assert.equal(plan.doctrine,'europe');assert.ok(plan.fronts.length>0);
  if(difficulty==='elite')assert.ok(g.units.every(u=>u.elite));
 }
});
test('Only full conquest wins, regardless of turn count; saves reload',()=>{
 for(const side of map.sides){
  const g=map.create(side,'normal',11),last=g.stations.find(s=>s.owner!==side);
  g.turn=200;assert.equal(map.winner(g),null);
  for(const s of g.stations)if(s!==last)s.owner=side;
  assert.equal(map.winner(g),null);
  last.owner=side;
  assert.equal(map.winner(g).winner,side);
  assert.equal(E.checkVictory(g).winner,side);
  assert.equal(E.migrateSave(E.packSave(g)).scenario.id,'crossing-urals');
 }
});

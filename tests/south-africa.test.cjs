'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const S=require('../dist/scenarios-south-africa.js');
const W=require('../dist/war-campaign.js');
const cities=S.cityData.length;
function check(g){
  assert.equal(g.scenario.id,'invasion-south-africa');
  assert.equal(g.cols,144);assert.equal(g.rows,108);assert.equal(g.tiles.length,15552);
  assert.equal(g.stations.length,cities);
  assert.equal(g.stations.filter(c=>c.owner==='eu').length,cities);
  assert.equal(g.stations.filter(c=>c.owner==='britannia').length,0);
  assert.equal(g.stations.filter(c=>c.capital).length,1);
  assert.equal(g.stations.find(c=>c.capital).name,'Johannesburg');
  assert.equal(g.over,null);
  for(const s of g.stations){
    const tile=E.tile(g,s.c,s.r);assert.ok(tile&&tile.terrain!=='sea'&&tile.terrain!=='offmap',s.name);
    assert.equal(tile.owner,'eu',s.name);
    if(S.ports[s.name]){
      assert.ok(s.portAt,s.name);
      const port=E.tile(g,s.portAt.c,s.portAt.r);
      assert.equal(port.terrain,'sea',s.name);
      assert.ok(E.adjacent(g,s).some(t=>t.c===port.c&&t.r===port.r),s.name);
    }
  }
  const carriers=g.units.filter(u=>u.side==='britannia'&&E.TYPES[u.type]?.naval==='ship');
  assert.equal(carriers.length,12);
  assert.equal(carriers.reduce((n,u)=>n+(u.cargo||[]).length,0),24);
  assert.ok(carriers.every(u=>E.tile(g,u.c,u.r).terrain==='sea'));
  assert.ok(g.units.some(u=>u.side==='eu'&&E.TYPES[u.type]?.naval));
  assert.ok(!S.winner(g),'scenario should not finish on turn one');
  const terrainCounts=Object.fromEntries(['sea','coast','mountain','forest','desert','plains'].map(t=>[t,g.tiles.filter(x=>x.terrain===t).length]));
  assert.ok(terrainCounts.coast>100 && terrainCounts.sea>5000 && terrainCounts.mountain>50);
}
for(const difficulty of ['normal','hard','challenge','elite'])for(const side of S.sides){
 test(side+' '+difficulty+' loads a cityless four-front amphibious invasion',()=>check(S.create(side,difficulty,71)));
}
test('all harbours have distinct capturable sea positions',()=>{
 const g=S.create('britannia','normal',11),keys=new Set();
 for(const s of g.stations.filter(s=>s.portAt)){
   const k=s.portAt.c+','+s.portAt.r;
   assert.ok(!keys.has(k),s.name);keys.add(k);
   assert.equal(s.portOwner,'eu');
 }
});
test('geometry is not an artificial sea crossing or inland water shortcut',()=>{
 const g=S.create('britannia','normal',19);
 const water=g.tiles.filter(t=>t.terrain==='sea'&& (t.c===0||t.c===g.cols-1||t.r===0||t.r===g.rows-1));
 assert.ok(water.length>0);
 // Inland capital and industrial cities remain land, not navigable sea/coast.
 for(const name of ['Johannesburg','Pretoria','Bloemfontein','Gaborone']){
   const s=g.stations.find(x=>x.name===name);assert.ok(s,name);
   assert.notEqual(E.tile(g,s.c,s.r).terrain,'sea');
 }
});
test('victory condition is every city; EU can win only after invasion defeated',()=>{
 const g=S.create('britannia','normal',31);
 assert.equal(S.winner(g),null);
 g.stations.forEach(s=>{s.owner='britannia';});
 assert.equal(S.winner(g).winner,'britannia');
 const e=S.create('eu','normal',32);e.units=e.units.filter(u=>u.side==='eu');
 assert.equal(S.winner(e).winner,'eu');
});
test('Campaign Mode registry activates only this Britannian tier-three objective',()=>{
 const m=W.ALL['britannia-south-africa'];
 assert.equal(m.scenarioId,S.id);assert.equal(m.status,'implemented');
 assert.equal(m.battleSide,'britannia');
 assert.equal(W.ALL['britannia-siberia'].status,'planned');
 const p=W.testFixture('britannia',3);
 assert.equal(W.launch(p,'britannia',m.id,{[S.id]:S}).ok,true);
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');require('../dist/scenarios.js');
const mask=require('../dist/turkey-landmask.js');
const M=require('../dist/scenarios-turkey.js');
const W=require('../dist/war-campaign.js');
const key=p=>E.key(p),city=(g,n)=>g.stations.find(s=>s.name===n);
function at(g,lon,lat) {
 const b=M.bounds,r=Math.max(0,Math.min(g.rows-1,Math.round((b.north-lat)*g.rows/(b.north-b.south)-.5)));
 const c=Math.max(0,Math.min(g.cols-1,Math.round((lon-b.west)*g.cols/(b.east-b.west)-.5-.5*(r&1))));
 return E.tile(g,c,r);
}
function reachable(g,start,valid) {
 const seen=new Set([key(start)]),queue=[start];
 for(let i=0;i<queue.length;i++)for(const t of E.adjacent(g,queue[i]))
  if(valid(t)&&!seen.has(key(t))){seen.add(key(t));queue.push(t);}
 return seen;
}
test('Turkey registers 59 cities, 14 harbours and standard two-sided game',()=>{
 assert.equal(E.scenarios.byId['invasion-turkey'],M);
 assert.deepEqual(M.sides,['britannia','eu']);
 assert.equal(M.cols,144);assert.equal(M.rows,104);
 for(const p of M.sides){
  const g=M.create(p,'normal',11);
  assert.equal(g.scenario.id,'invasion-turkey');assert.equal(g.mode,'scenario');
  assert.equal(g.tiles.length,14976);assert.equal(g.stations.length,59);
  assert.equal(g.stations.filter(s=>s.owner==='eu').length,45);
  assert.equal(g.stations.filter(s=>s.owner==='britannia').length,14);
  assert.equal(g.stations.filter(s=>s.portAt).length,14);
  assert.equal(g.units.length,190);assert.equal(g.scenario.turnLimit,undefined);
  assert.equal(new Set(g.stations.map(key)).size,59);
  assert.equal(new Set(g.units.map(key)).size,g.units.length);
 }
});
test('Terrain follows packed GSHHS land and sea and has real mountainous barriers',()=>{
 const g=M.create('eu','normal',11),bytes=Buffer.from(mask,'base64');
 assert.equal(bytes.length,1872);
 for(const [i,t] of g.tiles.entries()){
  assert.equal(t.terrain!=='sea',!!(bytes[i>>3]&(128>>(i&7))),key(t));
  if(t.terrain==='coast')assert.ok(E.adjacent(g,t).some(v=>v.terrain==='sea'));
 }
 for(const terrain of ['sea','coast','mountain','forest','plains'])
  assert.ok(g.tiles.some(t=>t.terrain===terrain),terrain);
 for(const n of ['Istanbul','Ankara','Izmir','Antalya','Trabzon','Diyarbakir','Edirne','Canakkale','Kars','Van','Konya','Antakya','Latakia','Mosul'])assert.ok(city(g,n),n);
 assert.equal(g.scenario.aiDoctrine,'europe');assert.ok(g.scenario.operationalFronts.length>=4);
});
test('Bosporus and Dardanelles preserve navigation and separate Thrace from Anatolia',()=>{
 const g=M.create('britannia','normal',21);
 const water=reachable(g,at(g,25.8,39),t=>t.terrain==='sea');
 for(const [name,lon,lat] of [['Aegean',25.8,39],['Marmara',28.3,40.7],['Black Sea',30.5,42],['Eastern Black Sea',40,42],['Mediterranean',32,35]]){
  const t=at(g,lon,lat);assert.equal(t.terrain,'sea',name);
  assert.ok(water.has(key(t)),'isolated '+name);
 }
 const anatolia=reachable(g,city(g,'Ankara'),t=>t.terrain!=='sea');
 assert.ok(anatolia.has(key(city(g,'Diyarbakir'))),'cut off eastern Turkey');
 assert.ok(!anatolia.has(key(city(g,'Edirne'))),'false land crossing of straits');
});
test('Fourteen ports are individually placed, operational and linked to open waters',()=>{
 const g=M.create('eu','normal',23),sea=reachable(g,at(g,25.8,39),t=>t.terrain==='sea');
 const ports=g.stations.filter(s=>s.portAt);
 assert.equal(new Set(ports.map(s=>key(s.portAt))).size,ports.length);
 for(const p of ports){
  assert.equal(E.distance(p,p.portAt,g),1,p.name);
  assert.equal(E.tile(g,p.portAt.c,p.portAt.r).terrain,'sea',p.name);
  assert.equal(p.portOwner,p.owner,p.name);
  assert.ok(sea.has(key(p.portAt)),'unconnected shipyard '+p.name);
 }
 for(const u of g.units){
  assert.equal(E.tile(g,u.c,u.r).terrain==='sea',E.TYPES[u.type].naval==='ship','illegal deployment '+u.id);
 }
});
test('Fifty army group detachments and opposing fleets are present',()=>{
 const g=M.create('britannia','normal',11);
 assert.equal(M.armyGroups.length,50);
 for(const group of g.scenario.groups){
  assert.ok(group.units.length,group.name);
  assert.ok(group.units.every(id=>g.units.some(u=>u.id===id&&u.side===group.side)),group.name);
 }
 assert.ok(g.units.filter(u=>u.side==='britannia'&&E.TYPES[u.type].naval==='ship').length>=12);
 assert.ok(g.units.some(u=>u.side==='eu'&&E.TYPES[u.type].naval==='ship'));
});
test('Conquering the final opposing city, not a turn counter, triggers victory',()=>{
 for(const p of M.sides){
  const g=M.create(p,'normal',23),last=g.stations.find(s=>s.owner!==p);
  g.turn=999;assert.equal(M.winner(g),null);assert.equal(M.onTurn(g),false);
  for(const s of g.stations)if(s!==last)s.owner=p;
  assert.equal(M.winner(g),null);last.owner=p;
  assert.equal(M.winner(g).winner,p);assert.equal(E.checkVictory(g).winner,p);
 }
});
test('All difficulties and multi-front AI doctrine work for both factions',()=>{
 for(const p of M.sides)for(const difficulty of ['normal','hard','challenge','elite']){
  const g=M.create(p,difficulty,19),enemy=M.sides.find(v=>v!==p);
  assert.equal(g.difficulty,difficulty);
  assert.equal(g.stations.length,59);
  const plan=E.aiPlan(g,enemy);
  assert.equal(plan.doctrine,'europe');assert.ok(plan.fronts.length>0);
  if(difficulty==='hard'||difficulty==='challenge')
    assert.ok(E.income(g,enemy).credits>E.income(M.create(p,'normal',19),enemy).credits);
 }
});
test('Scenario is playable standalone and only unlocks Campaign Tier 4 when eligible',()=>{
 const m=W.ALL['britannia-turkey'];
 assert.equal(m.scenarioId,'invasion-turkey');assert.equal(m.battleSide,'britannia');
 assert.equal(m.status,'implemented');
 assert.equal(W.launch(W.fresh(),'britannia',m.id,{[m.scenarioId]:M}).ok,false);
 assert.equal(W.launch(W.testFixture('britannia',4),'britannia',m.id,{[m.scenarioId]:M}).ok,true);
 const g=M.create('britannia','normal',21),loaded=E.migrateSave(E.packSave(g));
 assert.equal(loaded.scenario.id,'invasion-turkey');assert.equal(loaded.stations.length,59);
});

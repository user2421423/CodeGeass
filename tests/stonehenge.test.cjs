'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/europe-landmask.js');
require('../dist/scenarios.js');
const europe=require('../dist/scenarios-europe.js');
const stone=require('../dist/scenarios-stonehenge.js');
const all=g=>g.units.flatMap(u=>[u,...(u.cargo||[])]);
test('new Stonehenge is 120x96 with 37 entirely EU-owned cities and two playable factions',()=>{
 assert.equal(E.scenarios.byId['operation-stonehenge'],stone);
 assert.equal(E.scenarios.byId['european-war'],europe);
 assert.deepEqual(stone.sides,['britannia','eu']);
 for(const player of stone.sides){
  const g=stone.create(player,'normal',11);
  assert.equal(g.scenario.version,2);
  assert.equal(g.cols,120);assert.equal(g.rows,96);assert.equal(g.tiles.length,11520);
  assert.equal(g.stations.length,37);assert.ok(g.stations.every(s=>s.owner==='eu'));
  assert.ok(g.stations.some(s=>s.name==='Paris')&&g.stations.some(s=>s.name==='Madrid'));
  assert.ok(!g.stations.some(s=>s.name==='Moscow'||s.name==='Berlin'));
  assert.deepEqual(g.order,[player,...stone.sides.filter(s=>s!==player)]);
  assert.equal(new Set(g.stations.map(E.key)).size,37);
  assert.equal(new Set(g.units.map(E.key)).size,g.units.length);
  assert.ok(g.tiles.every(t=>t.terrain==='sea'||t.terrain==='offmap'||(t.owner==='eu'&&t.provinceCity!=null)));
  for(const t of ['mountain','forest','coast','sea','offmap'])
   assert.ok(g.tiles.some(p=>p.terrain===t),'missing terrain '+t);
  assert.equal(E.checkVictory(g),null,'cityless Britannia must remain alive');
 }
 assert.equal(europe.create('eu','normal',1).stations.length,44);
});
test('Britannia starts solely with carrier cargo and adjacent amphibious escorts',()=>{
 const g=stone.create('britannia','normal',18);
 const ships=g.units.filter(u=>u.side==='britannia'&&E.TYPES[u.type].naval==='ship');
 const amphib=g.units.filter(u=>u.side==='britannia'&&E.TYPES[u.type].naval==='amphibious');
 assert.equal(ships.length,12);assert.equal(amphib.length,25);
 assert.equal(ships.reduce((n,u)=>n+(u.cargo||[]).length,0),24);
 assert.ok(ships.every(u=>u.cargo.length===2&&E.tile(g,u.c,u.r).terrain==='sea'));
 assert.ok(amphib.every(u=>E.tile(g,u.c,u.r).terrain==='sea'));
 assert.ok(amphib.every(u=>Math.min(...ships.map(s=>E.distance(s,u,g)))<=8));
 assert.ok(!g.units.some(u=>u.side==='britannia'&&!E.TYPES[u.type].naval));
 assert.ok(ships.every(u=>u.cargo.every(v=>v.side==='britannia'&&!E.TYPES[v.type].naval)));
 assert.equal(g.stations.filter(s=>s.owner==='britannia').length,0);
 assert.ok(E.income(g,'britannia').credits>=700);
});
test('E.U. coastal ports and Atlantic lanes are viable',()=>{
 const g=stone.create('eu','normal',19);
 const ports=g.stations.filter(s=>s.portAt);
 assert.equal(ports.length,Object.keys(stone.ports).length);
 assert.equal(new Set(ports.map(s=>E.key(s.portAt))).size,ports.length);
 for(const s of ports){
  assert.equal(E.distance(s,s.portAt,g),1,s.name);
  assert.equal(E.tile(g,s.portAt.c,s.portAt.r).terrain,'sea',s.name);
  assert.equal(s.portOwner,'eu',s.name);
 }
 const flagship=g.units.find(u=>u.side==='britannia'&&E.TYPES[u.type].naval==='ship');
 assert.ok(flagship,'there must be an offshore Britannian fleet');
 const start=E.tile(g,flagship.c,flagship.r);
 assert.equal(start.terrain,'sea');
 const q=[start],seen=new Set([E.key(start)]);
 for(let i=0;i<q.length;i++)for(const t of E.adjacent(g,q[i]))
  if(t.terrain==='sea'&&!seen.has(E.key(t))){seen.add(E.key(t));q.push(t);}
 for(const name of ['Cork','Brest','Southampton','Plymouth','Lisbon','Porto','Cadiz'])
  assert.ok(seen.has(E.key(g.stations.find(s=>s.name===name).portAt)),name);
});
test('zero-city invasion can continue and either side can ultimately win',()=>{
 for(const player of stone.sides){
  const g=stone.create(player,'normal',21);
  const city=g.stations[0];
  city.owner='britannia';assert.equal(E.checkVictory(g),null);
  city.owner='eu';assert.equal(E.checkVictory(g),null);
  for(const s of g.stations)s.owner='britannia';
  assert.equal(E.checkVictory(g).winner,'britannia');
  const e=stone.create(player,'normal',22);
  e.units=e.units.filter(u=>u.side!=='britannia');
  assert.equal(E.checkVictory(e).winner,'eu');
 }
});
test('loaded cargo survives save migration; old scenario saves are invalidated',()=>{
 const g=stone.create('britannia','normal',16),london=g.stations.find(s=>s.name==='London');
 assert.equal(g.sites.find(s=>s.name==='Stonehenge').city,london.id);
 const save=E.packSave(g),restored=E.migrateSave(JSON.parse(JSON.stringify(save)));
 assert.ok(restored);assert.equal(all(restored).filter(u=>u.side==='britannia').length,61);
 assert.deepEqual(restored.scenario.citylessFunding,['britannia']);
 const old=JSON.parse(JSON.stringify(save));old.scenario.version=1;
 assert.equal(E.migrateSave(old),null);
});
test('AI planning and difficulty levels run for both perspectives',()=>{
 for(const player of stone.sides)for(const diff of ['normal','hard','challenge','elite']){
  const g=stone.create(player,diff,31);
  assert.ok(all(g).length>90);
  if(diff==='elite'){
   assert.ok(all(g).some(u=>u.elite));
   assert.ok(g.units.filter(u=>E.TYPES[u.type].naval==='ship').every(u=>!u.elite));
  }
  const enemy=stone.sides.find(s=>s!==player);g.phase=enemy;
  assert.doesNotThrow(()=>E.aiPlan(g,enemy));
  assert.doesNotThrow(()=>E.aiProduction(g));
 }
});

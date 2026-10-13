'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/europe-landmask.js');
require('../dist/scenarios.js');
const europe=require('../dist/scenarios-europe.js');
const stone=require('../dist/scenarios-stonehenge.js');
const byName=(g,n)=>g.stations.find(s=>s.name===n);
const counts=g=>Object.fromEntries(stone.sides.map(s=>[s,g.stations.filter(v=>v.owner===s).length]));
test('Independent registered 120x80 / 54-city three-sided operation',()=>{
 assert.equal(E.scenarios.byId['operation-stonehenge'],stone);
 assert.equal(E.scenarios.byId['european-war'],europe);
 assert.deepEqual(stone.sides,['britannia','eb','eu']);
 for(const player of stone.sides){
  const g=stone.create(player,'normal',11);
  assert.equal(g.mode,'scenario');assert.equal(g.scenario.id,'operation-stonehenge');
  assert.equal(g.scenario.aiDoctrine,'europe');assert.equal(g.cols,120);assert.equal(g.rows,80);
  assert.equal(g.wrap,false);assert.equal(g.tiles.length,9600);assert.equal(g.stations.length,54);
  assert.deepEqual(counts(g),{britannia:3,eb:16,eu:35});
  assert.deepEqual(g.order,[player,...stone.sides.filter(s=>s!==player)]);
  assert.equal(new Set(g.stations.map(E.key)).size,54);
  assert.equal(new Set(g.units.map(E.key)).size,g.units.length);
  assert.ok(g.units.every(u=>u.hp>0));
  assert.equal(g.scenario.turnLimit,undefined);
  for(const k of ['mountain','forest','coast','sea','offmap'])
   assert.ok(g.tiles.some(t=>t.terrain===k),'missing '+k);
  assert.ok(g.tiles.every(t=>t.terrain==='sea'||t.terrain==='offmap'||(t.owner&&t.provinceCity!=null)));
 }
 assert.equal(europe.create('eu','normal',11).stations.length,44);
});
test('Permanent Britannian coalition is friendly in both directions',()=>{
 for(const player of stone.sides){
  const g=stone.create(player,'normal',12);
  assert.equal(g.teams.britannia,g.teams.eb);assert.notEqual(g.teams.eu,g.teams.eb);
  assert.equal(E.foe(g,'britannia','eb'),false);assert.equal(E.foe(g,'eb','britannia'),false);
  assert.equal(E.foe(g,'britannia','eu'),true);assert.equal(E.foe(g,'eu','eb'),true);
  g.turn=200;assert.equal(stone.onTurn(g),false);
  assert.equal(E.foe(g,'britannia','eb'),false);
  assert.equal(stone.winner(g),null);
 }
});
test('Coalition victory works for each allied player; the E.U. beats both, never one',()=>{
 for(const player of stone.sides){
  const g=stone.create(player,'normal',13);
  for(const s of g.stations)if(s.owner==='eu')s.owner='eb';
  const result=E.checkVictory(g);
  assert.equal(result.team,'britannian-coalition');
  assert.equal(result.winner,player==='eu'?'britannia':player);
  assert.notEqual(result.winner,'eu');
  const e=stone.create(player,'normal',14);
  for(const s of e.stations)if(s.owner==='britannia')s.owner='eu';
  assert.equal(stone.winner(e),null,'Euro Britannia is still alive');
  for(const s of e.stations)if(s.owner==='eb')s.owner='eu';
  assert.equal(stone.winner(e).winner,'eu');
 }
});
test('An eliminated player ally may continue for a living coalition',()=>{
 for(const player of ['britannia','eb']){
  const g=stone.create(player,'normal',15);
  for(const city of g.stations)if(city.owner===player)city.owner='eu';
  g.fallen[player]={by:'eu',city:'last allied city'};
  assert.ok(g.stations.some(s=>s.owner===(player==='britannia'?'eb':'britannia')));
  assert.equal(E.checkVictory(g),null,'do not declare player defeat while an ally survives');
 }
});
test('Stonehenge Sakuradite is physically attached to London and survives saves',()=>{
 const g=stone.create('eu','normal',16),london=byName(g,'London');
 const d=g.sites.find(s=>s.name==='Stonehenge');
 assert.ok(d);assert.equal(d.city,london.id);assert.equal(d.c,london.c);
 assert.equal(d.r,london.r);assert.ok(london.refinery>=1);
 assert.equal(E.hasFleija(g,'eu'),false);
 const restored=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
 assert.ok(restored);assert.deepEqual(restored.teams,g.teams);
 assert.deepEqual(restored.sites,g.sites);assert.equal(restored.scenario.id,g.scenario.id);
 assert.equal(stone.winner(restored),null);
});
test('European islands, Channel, Atlantic, harbours, eastern front and sea connections',()=>{
 const g=stone.create('britannia','normal',17);
 const ports=g.stations.filter(s=>s.portAt);
 assert.equal(ports.length,Object.keys(stone.ports).length);
 assert.equal(new Set(ports.map(s=>E.key(s.portAt))).size,ports.length);
 for(const city of ports){
  assert.equal(E.distance(city,city.portAt,g),1,'port not adjacent: '+city.name);
  assert.equal(E.tile(g,city.portAt.c,city.portAt.r).terrain,'sea',city.name);
  assert.equal(city.portOwner,city.owner);
 }
 for(const name of ['London','Paris','Berlin','Warsaw','Minsk','Moscow','Brest',
  'Southampton','Galway','Cork','Sligo','Rotterdam','Belfast','Copenhagen'])
  assert.ok(byName(g,name),'missing '+name);
 assert.ok(byName(g,'Galway').c<byName(g,'London').c);
 assert.ok(byName(g,'Minsk').c>byName(g,'Berlin').c);
 assert.ok(byName(g,'Brest').c<byName(g,'Paris').c);
 const start=E.tile(g,byName(g,'Galway').portAt.c,byName(g,'Galway').portAt.r);
 const queue=[start],seen=new Set([E.key(start)]);
 for(let i=0;i<queue.length;i++)for(const n of E.adjacent(g,queue[i]))
  if(n.terrain==='sea'&&!seen.has(E.key(n))){seen.add(E.key(n));queue.push(n);}
 for(const name of ['Cork','Sligo','London','Brest','Southampton','Liverpool','Copenhagen'])
  assert.ok(seen.has(E.key(byName(g,name).portAt)),'unreachable Atlantic route: '+name);
 assert.ok(g.units.filter(u=>E.TYPES[u.type].naval).every(u=>E.tile(g,u.c,u.r).terrain==='sea'));
 assert.ok(g.units.some(u=>u.side==='britannia'&&E.TYPES[u.type].naval==='ship'));
});
test('Armies are independently staffed; Britannia has dominant ocean lift',()=>{
 const g=stone.create('eu','normal',18);
 for(const side of stone.sides){
  assert.ok(g.units.filter(u=>u.side===side&&!E.TYPES[u.type].naval).length>=(side==='britannia'?20:38),side+' land army');
 }
 const ships=side=>g.units.filter(u=>u.side===side&&E.TYPES[u.type].naval==='ship').length;
 assert.equal(ships('britannia'),10);
 assert.equal(ships('eu'),5);
 assert.equal(ships('eb'),2);
 assert.ok(g.scenario.groups.some(x=>x.side==='britannia'&&x.name.includes('Fleet')));
});
test('Difficulty levels and all playable perspectives work with AI planning',()=>{
 for(const player of stone.sides)for(const difficulty of ['normal','hard','challenge','elite']){
  const g=stone.create(player,difficulty,19);
  assert.equal(g.player,player);assert.equal(g.difficulty,difficulty);
  assert.ok(g.units.length>100);
  if(difficulty==='elite'){
   assert.ok(g.units.filter(u=>E.TYPES[u.type].naval!=='ship').some(u=>u.elite));
   assert.ok(g.units.filter(u=>E.TYPES[u.type].naval==='ship').every(u=>!u.elite));
  }
  const enemy=stone.sides.find(s=>E.foe(g,s,player));
  g.phase=enemy;
  const memo=E.aiPlan(g,enemy);
  assert.ok(memo);
  assert.equal(memo.doctrine,'europe');
  assert.doesNotThrow(()=>E.aiProduction(g));
 }
});

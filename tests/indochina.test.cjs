'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/scenarios.js');
require('../dist/indochina-landmask.js');
const map=require('../dist/scenarios-indochina.js');
const city=(g,n)=>g.stations.find(s=>s.name===n);
const naval=u=>!!E.TYPES[u.type]?.naval;
const onLand=(g,p)=>E.tile(g,p.c,p.r).terrain!=='sea';
const walk=(g,start,pass)=>{const seen=new Set([E.key(start)]),q=[start];for(let i=0;i<q.length;i++)for(const t of E.adjacent(g,q[i]))if(pass(t)&&!seen.has(E.key(t))){seen.add(E.key(t));q.push(t);}return seen;};

test('Indochina is a separate 120x104 regional game with 44 cities and no third power',()=>{
  assert.equal(E.scenarios.byId['conquest-indochina'],map);
  assert.equal(E.scenarios.indochina,map);
  assert.equal(map.cols,120);assert.equal(map.rows,104);
  assert.deepEqual(map.sides,['britannia','cf']);
  for(const side of map.sides){
    const g=map.create(side,'normal',11);
    assert.equal(g.mode,'scenario');assert.equal(g.scenario.id,'conquest-indochina');
    assert.deepEqual(g.order,[side,map.sides.find(x=>x!==side)]);
    assert.equal(g.tiles.length,12480);assert.equal(g.stations.length,44);
    assert.equal(g.stations.filter(s=>s.owner==='britannia').length,24);
    assert.equal(g.stations.filter(s=>s.owner==='cf').length,20);
    assert.equal(g.units.length,142);assert.equal(g.units.filter(naval).length,24);
    assert.equal(g.units.filter(u=>u.side==='britannia').length,70);
    assert.equal(g.units.filter(u=>u.side==='cf').length,72);
    assert.equal(g.units.filter(u=>!naval(u)).length,118);
    assert.equal(new Set(g.units.map(E.key)).size,g.units.length);
    assert.equal(new Set(g.stations.map(E.key)).size,44);
    assert.equal(g.teams,null);assert.equal(g.scenario.turnLimit,undefined);
    assert.ok(g.units.every(u=>u.hp>0&&map.sides.includes(u.side)));
    assert.ok(g.stations.every(s=>map.sides.includes(s.owner)));
    assert.ok(g.tiles.every(t=>t.terrain==='sea'||(t.owner&&t.provinceCity!=null)));
    assert.ok(g.units.every(u=>naval(u)?E.tile(g,u.c,u.r).terrain==='sea':onLand(g,u)));
  }
});

test('Geographic city order, Red River, Mekong, Annamite Range and both naval gulfs',()=>{
  const g=map.create('britannia','normal',21);
  for(const n of ['Hanoi','Haiphong','Hue','Da Nang','Ho Chi Minh City','Phnom Penh','Vientiane','Luang Prabang','Bangkok','Chiang Mai','Guangzhou','Nanning','Kunming','Haikou'])assert.ok(city(g,n),n);
  assert.ok(city(g,'Kunming').r<city(g,'Hanoi').r);
  assert.ok(city(g,'Hanoi').r<city(g,'Hue').r);
  assert.ok(city(g,'Hue').r<city(g,'Ho Chi Minh City').r);
  assert.ok(city(g,'Luang Prabang').r<city(g,'Vientiane').r);
  assert.ok(city(g,'Guangzhou').c>city(g,'Nanning').c);
  assert.ok(city(g,'Chiang Mai').c<city(g,'Hanoi').c);
  assert.ok(g.scenario.rivers.Mekong.length>=7&&g.scenario.rivers.Red.length>=4);
  for(const t of ['sea','coast','plains','forest','mountain'])assert.ok(g.tiles.some(v=>v.terrain===t),t);
  const mainland=walk(g,city(g,'Hanoi'),t=>t.terrain!=='sea');
  for(const n of ['Vinh','Da Nang','Ho Chi Minh City','Vientiane','Bangkok','Chiang Mai','Nanning','Kunming'])
    assert.ok(mainland.has(E.key(city(g,n))),'missing uninterrupted mainland corridor to '+n);
});

test('Ports adjoin navigable water; both fleets can access connected sea',()=>{
  const g=map.create('cf','normal',11),ports=g.stations.filter(s=>s.portAt);
  assert.equal(ports.length,13);
  assert.equal(new Set(ports.map(s=>E.key(s.portAt))).size,ports.length);
  for(const s of ports){
    assert.equal(E.distance(s,s.portAt,g),1,s.name);
    assert.equal(E.tile(g,s.portAt.c,s.portAt.r).terrain,'sea',s.name);
    assert.equal(s.portOwner,s.owner,s.name);
  }
  const sea=walk(g,E.tile(g,ports[0].portAt.c,ports[0].portAt.r),t=>t.terrain==='sea');
  for(const p of ports)assert.ok(sea.has(E.key(p.portAt)),'isolated port '+p.name);
  for(const u of g.units.filter(naval))assert.ok(sea.has(E.key(u)),'stranded naval formation '+u.id);
  assert.ok(g.units.filter(u=>u.side==='britannia'&&E.TYPES[u.type].naval==='ship').length>
    g.units.filter(u=>u.side==='cf'&&E.TYPES[u.type].naval==='ship').length);
});

test('China owns and deploys across northern approaches; Britannia holds southern cities',()=>{
 const g=map.create('britannia','normal',12);
 for(const n of ['Hanoi','Haiphong','Lang Son','Lao Cai','Dien Bien Phu','Luang Prabang','Nanning','Kunming'])
   assert.equal(city(g,n).owner,'cf',n);
 for(const n of ['Vinh','Hue','Da Nang','Vientiane','Bangkok','Phnom Penh','Ho Chi Minh City'])
   assert.equal(city(g,n).owner,'britannia',n);
 for(const group of g.scenario.groups){
   assert.ok(group.units.length);
   assert.ok(group.units.every(id=>g.units.some(u=>u.id===id&&u.side===group.side)));
 }
 assert.ok(g.scenario.groups.some(v=>v.side==='cf'&&v.origin==='Hanoi'));
 assert.ok(g.scenario.groups.some(v=>v.side==='britannia'&&v.origin==='Da Nang'));
});

test('No scripted FLEIJA or timed conquest; only the last enemy city wins',()=>{
 for(const p of map.sides){
 const g=map.create(p,'normal',45);
 assert.equal(map.onTurn(g),false);
 assert.equal(g.scenario.turnLimit,undefined);
 assert.deepEqual(g.arsenal,{britannia:0,cf:0});
 g.turn=250;assert.equal(map.winner(g),null);
 const last=g.stations.find(s=>s.owner!==p);
 for(const s of g.stations)if(s!==last)s.owner=p;
 assert.equal(map.winner(g),null);
 last.owner=p;
 assert.equal(map.winner(g).winner,p);
 assert.equal(E.checkVictory(g).winner,p);
 assert.ok(E.objectiveText(g).includes('44 Indochina theatre cities'));
 }
});

test('All four difficulty levels, Elite conversions, rival incomes, commander and AI legality',()=>{
 for(const p of map.sides){
  const normal=map.create(p,'normal',33),enemy=map.sides.find(s=>s!==p);
  for(const difficulty of ['normal','hard','challenge','elite']){
   const g=map.create(p,difficulty,33);
   assert.equal(g.difficulty,difficulty);
   assert.equal(g.units.length,142);
   assert.ok(g.units.every(u=>u.hp>0));
   if(difficulty==='hard'||difficulty==='challenge')
     assert.ok(E.income(g,enemy).credits>E.income(normal,enemy).credits);
   if(difficulty==='elite'){
     assert.ok(g.units.filter(u=>E.TYPES[u.type].naval==='ship').every(u=>!u.elite));
     assert.ok(g.units.filter(u=>E.TYPES[u.type].naval!=='ship').every(u=>u.elite&&u.stack===1));
   }
   const plan=E.aiPlan(g,enemy);
   assert.equal(plan.doctrine,'europe');
   assert.ok(plan.fronts.length>0);
  }
 }
});

test('Both sides retain standard factory recruitment and game saving',()=>{
 for(const p of map.sides){
  const g=map.create(p,'normal',11);
  const t=E.typeFor(p,'scout',g);
  const s=g.stations.find(s=>s.owner===p&&s.tier>=E.TYPES[t].tier&&!E.unitAt(g,s));
  assert.ok(s,'missing production city for '+p);
  const answer=E.recruit(g,s.id,t,1);
  assert.equal(answer.ok,true,answer.reason);
  const restored=E.migrateSave(E.packSave(g));
  assert.ok(restored);assert.equal(restored.scenario.id,'conquest-indochina');
  assert.equal(restored.stations.length,44);
  assert.equal(restored.units.length,g.units.length);
 }
});

test('Indochina map uses its own coastal hex render and visible river overlays',()=>{
  const src=fs.readFileSync(require.resolve('../dist/ui/geography.js'),'utf8');
  assert.match(src,/g.scenario.id === 'bering-strait'\)\s*return paintBeringGeographic/);
  assert.match(src,/g.scenario.id === 'conquest-indochina'(?:\\s*\\|\\||\\))/);
  assert.match(src,/g.scenario\?\.id==='conquest-indochina'&&g.scenario.rivers/);
});

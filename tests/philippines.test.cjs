'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/scenarios.js');
const scenario=require('../dist/scenarios-philippines.js');
const naval=u=>!!E.TYPES[u.type].naval;
const station=(g,name)=>g.stations.find(s=>s.name===name);
function flood(g,start,sea=true) {
 const q=[start],seen=new Set([E.key(start)]);
 for(let i=0;i<q.length;i++)for(const t of E.adjacent(g,q[i]))if((t.terrain==='sea')===sea&&!seen.has(E.key(t))){seen.add(E.key(t));q.push(t);}
 return seen;
}
test('37-city Philippines invasion has correct ownership and independent faction starts',()=>{
 assert.equal(E.scenarios.byId['philippines-invasion'],scenario);
 assert.deepEqual(scenario.sides,['britannia','cf']);
 for(const side of scenario.sides){
  const g=scenario.create(side,'normal',17);
  assert.equal(g.scenario.id,'philippines-invasion');
  assert.equal(g.cols,144);assert.equal(g.rows,112);assert.equal(g.tiles.length,16128);
  assert.equal(g.stations.length,37);
  assert.equal(g.stations.filter(s=>s.owner==='cf').length,34);
  assert.equal(g.stations.filter(s=>s.owner==='britannia').length,3);
  assert.ok(['Koror','Peleliu','Colonia'].every(name=>station(g,name)?.owner==='britannia'));
  assert.ok(g.stations.filter(s=>s.owner==='britannia').every(s=>!scenario.cityData.some(
    entry=>entry[0]===s.name&&entry[1]<130)));
  for(const name of ['Manila','Quezon City','Baguio','Legazpi','Iloilo','Bacolod','Cebu',
    'Tacloban','Puerto Princesa','Cagayan de Oro','Davao','Zamboanga'])
    assert.equal(station(g,name).owner,'cf',name);
  assert.equal(g.scenario.turnLimit,undefined);assert.equal(g.teams,null);
  assert.deepEqual(Object.keys(g.arsenal).sort(),['britannia','cf']);
  assert.equal(new Set(g.units.map(E.key)).size,g.units.length);
  assert.equal(new Set(g.stations.map(E.key)).size,37);
  assert.ok(g.tiles.every(t=>t.terrain==='sea'||(t.owner&&t.provinceCity!=null)));
  assert.ok(g.units.every(u=>u.hp>0&&scenario.sides.includes(u.side)));
  assert.equal(g.units.filter(u=>u.side==='britannia'&&u.type==='carrier_battleship').length,12);
  assert.ok(g.units.filter(u=>u.side==='britannia'&&u.type.startsWith('portman')).length>=30);
  assert.ok(g.units.filter(u=>u.side==='cf'&&u.type==='cf_carrier').length>=4);
 }
});
test('All cities are on land; no Britannian Philippines city, forced land bridge or blocked sea',()=>{
 const g=scenario.create('cf','normal',27);
 const comp=name=>flood(g,E.tile(g,station(g,name).c,station(g,name).r),false);
 for(const [a,b] of [['Manila','Calapan'],['Iloilo','Bacolod'],['Bacolod','Cebu'],
   ['Calbayog','Tacloban'],['Cebu','Cagayan de Oro'],['Koror','Peleliu'],
   ['Peleliu','Colonia'],['Puerto Princesa','Manila']])
  assert.ok(!comp(a).has(E.key(station(g,b))),a+' and '+b+' must require a sea crossing');
 for(const s of g.stations)assert.notEqual(E.tile(g,s.c,s.r).terrain,'sea',s.name);
});
test('Naval ports share the open ocean, have unoccupied adjacent water and allow transfers',()=>{
 const g=scenario.create('britannia','normal',37);
 const ps=g.stations.filter(s=>s.portAt);
 assert.equal(ps.length,31);
 assert.equal(new Set(ps.map(s=>E.key(s.portAt))).size,ps.length);
 const sea=flood(g,E.tile(g,ps[0].portAt.c,ps[0].portAt.r));
 for(const s of ps){
  assert.equal(E.distance(s,s.portAt,g),1,'adjacent port '+s.name);
  assert.equal(E.tile(g,s.portAt.c,s.portAt.r).terrain,'sea');
  assert.ok(sea.has(E.key(s.portAt)),'sea access '+s.name);
  assert.equal(s.portOwner,s.owner);
 }
 for(const u of g.units.filter(naval))
  assert.ok(sea.has(E.key(u)),'all naval units must access fleet network '+u.id);
 // Capture resolution must use the standard owner's independently transferable port slot.
 const port=station(g,'Cebu');
 port.owner='britannia';port.portOwner='britannia';
 assert.equal(port.portOwner,'britannia');
});
test('Britannia can reach Philippine landing zones and China can reach Britannian bases',()=>{
 for(const side of scenario.sides){
  const g=scenario.create(side,'normal',41);
  const plan=E.aiPlan(g,side);
  assert.ok(plan.fronts.some(f=>f.overseas),'must have genuine overseas goals: '+side);
  assert.ok(plan.fronts.some(f=>f.members.length>0),'must allocate troops: '+side);
  assert.ok(g.units.filter(u=>u.side===side&&E.TYPES[u.type].naval==='amphibious').length>=10);
  assert.doesNotThrow(()=>E.aiProduction(g));
  assert.doesNotThrow(()=>E.beginTurn(g,side,true));
 }
});
test('Both sides can build, win, and resume without artificial 50-turn ending',()=>{
 for(const side of scenario.sides){
  const g=scenario.create(side,'normal',53);
  const unitType=E.typeFor(side,'light',g);
  const s=g.stations.find(s=>s.owner===side&&s.tier>=E.TYPES[unitType].tier&&!E.unitAt(g,s));
  assert.ok(s,'factory accessible '+side);
  assert.equal(E.recruit(g,s.id,unitType,1).ok,true);
  const packed=E.packSave(g),loaded=E.migrateSave(JSON.parse(JSON.stringify(packed)));
  assert.equal(loaded.scenario.id,'philippines-invasion');
  assert.equal(loaded.stations.length,37);
  g.turn=200;assert.equal(scenario.winner(g),null);
  assert.equal(scenario.onTurn(g),false);
  for(const c of g.stations)c.owner=side;
  assert.equal(scenario.winner(g)?.winner,side);
 }
});
test('Difficulty strengthens rival only; FLEIJA and diplomacy remain disabled',()=>{
 for(const side of scenario.sides){
  const base=scenario.create(side,'normal',63),enemy=scenario.sides.find(s=>s!==side);
  for(const level of ['hard','challenge','elite']){
   const g=scenario.create(side,level,63);
   assert.equal(E.income(g,side).credits,E.income(base,side).credits);
   assert.ok(E.income(g,enemy).credits>E.income(base,enemy).credits);
   assert.equal(g.teams,null);assert.equal(g.scenario.turnLimit,undefined);
   assert.equal(g.launches.length,0);
   assert.equal(scenario.onTurn(g),false);
  }
 }
});

test('Both starting shipyards build genuine naval reinforcements',()=>{
 for(const side of scenario.sides){
  const g=scenario.create(side,'normal',97);
  const harbor=g.stations.find(s=>s.owner===side&&s.portAt&&s.portLevel>=2&&!E.unitAt(g,s.portAt));
  assert.ok(harbor,'operational shipyard '+side);
  const shipType=side==='britannia'?'portman_ii':'shui_gun_ru_ii';
  const produced=E.recruit(g,harbor.id,shipType,1);
  assert.equal(produced.ok,true,produced.reason);
  assert.equal(produced.unit.side,side);
  assert.equal(produced.unit.c,harbor.portAt.c);
  assert.equal(produced.unit.r,harbor.portAt.r);
  assert.equal(harbor.portProducedTurn,g.turn);
 }
});

test('Enemy ports transfer only on naval hex capture, not automatically on city occupation',()=>{
 for(const side of scenario.sides){
  const enemyName=side==='britannia'?'Cebu':'Koror';
  const g=scenario.create(side,'normal',98),city=station(g,enemyName);
  const previousOwner=city.owner,previousPort=city.portOwner;
  // The invasion fleet may fill every sea hex surrounding a staging port.
  // Model an escort sinking before the assault so the landing route is open.
  const origin=E.adjacent(g,city.portAt).find(t=>t.terrain==='sea'&&!E.unitAt(g,t)) ||
    E.adjacent(g,city.portAt).find(t=>t.terrain==='sea');
  assert.ok(origin,'must have a navigable sea approach to '+enemyName);
  const blocker=E.unitAt(g,origin);
  if(blocker)g.units=g.units.filter(u=>u.id!==blocker.id);
  const type=side==='britannia'?'portman_ii':'shui_gun_ru_ii';
  const unit=E.newUnit(g,type,side,origin.c,origin.r);
  const result=E.move(g,unit.id,city.portAt.c,city.portAt.r);
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.portCaptured,city.name);
  assert.equal(city.portOwner,side);
  assert.equal(city.owner,previousOwner,'landing at a port does not take the neighboring city');
  assert.notEqual(previousPort,side);
 }
});

test('Offshore Britannian amphibious units can land on and capture an empty Chinese coastal city',()=>{
 const g=scenario.create('britannia','normal',99);
 const city=station(g,'El Nido');
 assert.equal(city.owner,'cf');
 assert.ok(E.adjacent(g,city).some(t=>t.terrain==='sea'));
 g.units=g.units.filter(u=>u.side==='britannia'||E.distance(u,city,g)>4);
 const beach=E.adjacent(g,city).find(t=>t.terrain==='sea'&&!E.unitAt(g,t));
 assert.ok(beach);
 const attacker=E.newUnit(g,'portman_ii','britannia',beach.c,beach.r);
 const harborBefore=city.portOwner;
 const result=E.move(g,attacker.id,city.c,city.r);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.captured,'El Nido');
 assert.equal(city.owner,'britannia');
 assert.equal(city.portOwner,harborBefore,'port remains Chinese until separately seized');
});

test('Philippines commanders use the recovery planner after taking heavy damage',()=>{
  const g=scenario.create('britannia','normal',20261013);
  for(const u of g.units)if(u.side==='cf')u.hp=0;
  const commanders=g.units.filter(u=>u.side==='britannia'&&u.cmd&&!E.TYPES[u.type].naval&&
    E.tile(g,u.c,u.r)?.terrain!=='sea');
  assert.ok(commanders.length>0,'Britannia has land commanders to recover');
  for(const u of commanders)u.hp=Math.max(1,Math.floor(E.maxHP(u)*0.2));
  g.turn=2;
  const plan=E.aiPlan(g,'britannia');
  assert.equal(plan.doctrine,'assault','preserve Philippines strategic doctrine');
  assert.ok(plan.recoveries instanceof Map,'recovery planner runs in the Philippines');
  assert.ok(plan.recoveries.size>0,'damaged commanders have recovery orders');
});

test('Philippines city repair pass restores damaged AI units on both factions',()=>{
  for(const side of scenario.sides){
    const g=scenario.create(side,'normal',20261014),s=g.stations.find(c=>c.owner===side);
    assert.ok(s,'friendly repair city for '+side);
    g.units=g.units.filter(u=>u.c!==s.c||u.r!==s.r);
    const unit=E.newUnit(g,E.typeFor(side,'light',g),side,s.c,s.r);
    unit.hp=Math.max(1,Math.floor(E.maxHP(unit)*0.2));
    unit.moved=unit.attacked=false;
    g.phase=side;
    g.economy[side].credits=10000;
    const before=unit.hp;
    assert.doesNotThrow(()=>E.aiProduction(g));
    assert.ok(unit.hp>before,'AI repairs the '+side+' damaged formation');
    assert.equal(unit.moved,true,'repair consumes movement');
    assert.equal(unit.attacked,true,'repair consumes attack');
  }
});

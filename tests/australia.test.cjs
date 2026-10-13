'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/scenarios.js');
const geo=require('../dist/australia-landmask.js');
const australia=require('../dist/scenarios-australia.js');
const SIDES=['britannia','cf','eu'];
const N=132*92;
const ground=u=>!E.TYPES[u.type].naval;
const sea=(g,t)=>E.tile(g,t.c,t.r).terrain==='sea';

test('Australia is an independent, hostile, three-faction 2018 theatre',()=>{
  assert.equal(E.scenarios.byId['war-for-australia'],australia);
  assert.deepEqual(australia.sides,SIDES);
  assert.equal(australia.cols,132);assert.equal(australia.rows,92);
  assert.equal(australia.cityData.length,48);
  for(const player of SIDES){
    const g=australia.create(player,'normal',25);
    assert.equal(g.mode,'scenario');assert.equal(g.era,'war-for-australia');
    assert.equal(g.scenario.id,'war-for-australia');
    assert.equal(g.scenario.key,'australia');
    assert.equal(g.phase,player);
    assert.deepEqual(g.order,[player,...SIDES.filter(s=>s!==player)]);
    assert.equal(g.teams,null);
    assert.equal(g.wrap,false);
    assert.equal(g.tiles.length,N);
    assert.equal(g.stations.length,48);
    assert.equal(g.stations.filter(s=>s.owner==='britannia').length,20);
    assert.equal(g.stations.filter(s=>s.owner==='cf').length,14);
    assert.equal(g.stations.filter(s=>s.owner==='eu').length,14);
    assert.equal(g.units.length,160);
    assert.equal(g.units.filter(ground).length,124);
    assert.equal(g.units.filter(u=>E.TYPES[u.type].naval).length,36);
    assert.equal(g.scenario.turnLimit,undefined);
    assert.deepEqual(g.arsenal,{britannia:0,cf:0,eu:0});
    assert.ok(g.units.every(u=>SIDES.includes(u.side)&&u.hp>0));
    assert.equal(new Set(g.units.map(E.key)).size,g.units.length);
    assert.equal(new Set(g.stations.map(E.key)).size,g.stations.length);
    for(const t of ['sea','coast','plains','forest','mountain','desert'])
      assert.ok(g.tiles.some(q=>q.terrain===t),'missing terrain: '+t);
    assert.ok(g.tiles.every(t=>t.terrain==='sea'||SIDES.includes(t.owner)));
  }
});
test('Coastline, inland deserts and Bass Strait follow Australian geography',()=>{
  const g=australia.create('eu','normal',26);
  const nearest=(lon,lat)=>{
    let best=null,error=Infinity;
    for(const t of g.tiles){const p=geo.point(t.c,t.r);
      const d=(p.lon-lon)**2+(p.lat-lat)**2;
      if(d<error){best=t;error=d;}
    }
    return best;
  };
  for(const p of [[133.88,-23.7],[138.6,-34.9],[151.2,-33.9],[115.9,-31.95],[147.3,-42.9]])
    assert.notEqual(nearest(...p).terrain,'sea','land coordinate '+p);
  for(const p of [[146.5,-40],[112,-36],[125,-39],[155,-25],[143,-9]])
    assert.equal(nearest(...p).terrain,'sea','water coordinate '+p);
  assert.equal(geo.isLand(147.3,-42.9),true);
  assert.equal(geo.isLand(146.5,-40),false,'Bass Strait remains water');
  assert.equal(geo.isLand(134,-23),true,'central Outback accessible');
  assert.equal(g.stations.find(s=>s.name==='Sydney').owner,'britannia');
  assert.equal(g.stations.find(s=>s.name==='Darwin').owner,'cf');
  assert.equal(g.stations.find(s=>s.name==='Perth').owner,'eu');
  assert.equal(g.stations.find(s=>s.name==='Hobart').owner,'britannia');
});
test('All ports are one hex from salt water; ships and provinces valid',()=>{
  const g=australia.create('britannia','normal',27);
  const ports=g.stations.filter(s=>s.portAt);
  assert.equal(ports.length,32);
  assert.equal(new Set(ports.map(s=>E.key(s.portAt))).size,ports.length);
  const seen=new Set(),q=[E.tile(g,ports[0].portAt.c,ports[0].portAt.r)];
  seen.add(E.key(q[0]));
  for(let j=0;j<q.length;j++)for(const n of E.adjacent(g,q[j]))
    if(n.terrain==='sea'&&!seen.has(E.key(n))){seen.add(E.key(n));q.push(n);}
  for(const city of ports){
    assert.equal(E.distance(city,city.portAt,g),1,city.name);
    assert.ok(sea(g,city.portAt),city.name);
    assert.ok(seen.has(E.key(city.portAt)),city.name+' ship access');
    assert.equal(city.owner,city.portOwner);
  }
  for(const u of g.units.filter(u=>E.TYPES[u.type].naval)){
    assert.ok(sea(g,u),'ship afloat');
    assert.ok(seen.has(E.key(u)),'ship in navigable sea');
  }
  for(const t of g.tiles)if(t.terrain!=='sea'){
    assert.ok(Number.isInteger(t.provinceCity));
    assert.ok(g.stations[t.provinceCity]);
    assert.equal(g.stations[t.provinceCity].owner,t.owner);
  }
});
test('Each difficulty works for every player; no player targeting or compulsory end',()=>{
  for(const player of SIDES){
    const baseline=australia.create(player,'normal',32);
    for(const difficulty of ['normal','hard','challenge','elite']){
      const g=australia.create(player,difficulty,32);
      assert.equal(g.units.length,baseline.units.length);
      assert.equal(g.stations.length,baseline.stations.length);
      assert.equal(E.income(g,player).credits,E.income(baseline,player).credits);
      for(const other of SIDES.filter(s=>s!==player)){
        assert.equal(g.stations.filter(s=>s.owner===other).length,
          baseline.stations.filter(s=>s.owner===other).length);
        if(difficulty!=='normal')assert.ok(E.income(g,other).credits>E.income(baseline,other).credits);
      }
      assert.equal(australia.onTurn(g),false);
      g.turn=220;
      assert.equal(australia.winner(g),null);
      assert.doesNotThrow(()=>E.aiPlan(g,SIDES.find(s=>s!==player)));
    }
  }
});
test('Victory means occupying all 48 cities, without turn limit',()=>{
  for(const side of SIDES){
    const g=australia.create(side,'normal',45);
    assert.ok(E.objectiveText(g).includes('48 Australian cities'));
    for(const s of g.stations)s.owner=side;
    assert.equal(australia.winner(g)?.winner,side);
    assert.equal(E.checkVictory(g)?.winner,side);
    g.stations[0].owner=SIDES.find(x=>x!==side);
    assert.equal(australia.winner(g),null);
  }
});
test('Strategic three-way AI recognizes all rival fronts including ports',()=>{
  for(const player of SIDES){
    const g=australia.create(player,'normal',51);
    for(const side of SIDES){
      const memo=E.aiPlan(g,side);
      assert.equal(memo.doctrine,'europe');
      assert.ok(memo.fronts.length>0,'no fronts '+side);
      assert.ok(g.stations.some(s=>s.portOwner===side),'coastal production '+side);
      assert.ok(memo.fronts.some(f=>f.type==='offensive'),'offensive fronts '+side);
    }
    assert.doesNotThrow(()=>E.beginTurn(g,player,true));
  }
});

test('All three player campaigns persist with the same map, fleets and diplomatic setup',()=>{
  for(const side of SIDES)for(const difficulty of ['normal','hard','challenge','elite']){
    const g=australia.create(side,difficulty,107);
    const original=JSON.stringify(E.packSave(g));
    assert.ok(original.length<300000,'regional scenario should pack compactly');
    const restored=E.migrateSave(JSON.parse(original));
    assert.ok(restored,'scenario must load');
    assert.equal(restored.scenario.id,'war-for-australia');
    assert.equal(restored.player,side);
    assert.equal(restored.difficulty,difficulty);
    assert.deepEqual(restored.order,g.order);
    assert.equal(restored.teams,null);
    assert.deepEqual(restored.stations,g.stations);
    assert.deepEqual(restored.units,g.units);
    assert.doesNotThrow(()=>E.beginTurn(restored,side,true));
  }
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/europe-landmask.js');
require('../dist/scenarios.js');
const europe = require('../dist/scenarios-europe.js');

const capital = (g,name) => g.stations.find(s=>s.name===name);

test('Europe scenario is a standalone, detailed, non-wrapping 44-city theatre',()=>{
  const g=europe.create('eu','normal',11);
  assert.equal(g.mode,'scenario');
  assert.equal(g.scenario.id,'european-war');
  assert.equal(g.scenario.key,'europe');
  assert.equal(g.cols,120);
  assert.equal(g.rows,80);
  assert.equal(g.tiles.length,9600);
  assert.equal(g.wrap,false);
  assert.equal(g.scenario.projection.angle,0);
  assert.equal(g.stations.length,44);
  assert.deepEqual(g.order,['eu','eb']);
  assert.equal(g.stations.filter(s=>s.owner==='eu').length,28);
  assert.equal(g.stations.filter(s=>s.owner==='eb').length,16);
  assert.equal(new Set(g.stations.map(E.key)).size,44);
  assert.equal(new Set(g.units.map(E.key)).size,g.units.length);
  for(const kind of ['sea','coast','plains','forest','mountain','offmap'])
    assert.ok(g.tiles.some(t=>t.terrain===kind),'missing European '+kind+' terrain');
  assert.ok(g.tiles.every(t=>t.terrain==='sea'||t.terrain==='offmap'||
    (t.owner&&t.provinceCity!=null)),'all land must belong to a city province');
  assert.ok(g.stations.every(s=>E.tile(g,s.c,s.r).terrain!=='sea'));
});

test('Europe and Japan remain independent scenario registrations',()=>{
  const japan=E.scenarios.japan;
  assert.ok(japan);
  assert.equal(E.scenarios.europe,europe);
  assert.equal(japan.id,'invasion-japan');
  assert.deepEqual(europe.sides,['eu','eb']);
  assert.deepEqual(japan.sides,['britannia','bk','cf']);
  assert.equal(japan.create('britannia','normal',1).stations.length,44);
});

test('The European War deploys both comparable armies and named rival commanders',()=>{
  for(const human of europe.sides){
    const g=europe.create(human,'normal',19);
    assert.equal(g.player,human);
    assert.equal(g.phase,human);
    assert.equal(g.units.filter(u=>u.side==='eu').length,50);
    assert.equal(g.units.filter(u=>u.side==='eb').length,50);
    const names=new Set(g.units.filter(u=>u.cmd).map(u=>u.cmd));
    for(const id of ['akito','leila','ryo','ayano','yukiya','smilas',
      'shin','julius','ashley','manfredi'])assert.ok(names.has(id),'Missing '+id);
    assert.ok(g.scenario.groups.length>=20,'regional armies should be named operational groups');
    assert.ok(g.units.every(u=>u.hp>0),'all starting units should be operational');
    assert.ok(g.units.every(u=>E.TYPES[u.type].naval||
      E.tile(g,u.c,u.r).terrain!=='sea'));
  }
});

test('Ports are adjacent to genuine playable sea and warships launch offshore',()=>{
  const g=europe.create('eu','normal',19);
  const ports=g.stations.filter(s=>s.portAt);
  assert.equal(ports.length,13);
  assert.equal(new Set(ports.map(s=>E.key(s.portAt))).size,13);
  for(const port of ports){
    assert.equal(E.distance(port,port.portAt,g),1,'Port not adjacent: '+port.name);
    assert.equal(E.tile(g,port.portAt.c,port.portAt.r).terrain,'sea');
    assert.equal(port.portOwner,port.owner);
  }
  assert.ok(g.units.some(u=>u.side==='eb'&&E.TYPES[u.type].naval));
  assert.ok(g.units.some(u=>u.side==='eu'&&E.TYPES[u.type].naval));
  assert.ok(g.units.filter(u=>E.TYPES[u.type].naval).every(u=>
    E.tile(g,u.c,u.r).terrain==='sea'));
  assert.equal(E.NAVAL.eb.carrier,'carrier_battleship');
});

test('The E.U. starts with the larger economy; Hard and Challenge boost only opponents',()=>{
  for(const human of europe.sides){
    const normal=europe.create(human,'normal',12);
    assert.equal(E.income(normal,'eu').credits,560);
    assert.equal(E.income(normal,'eu').industry,345);
    assert.equal(E.income(normal,'eb').credits,430);
    assert.equal(E.income(normal,'eb').industry,280);
    for(const difficulty of ['hard','challenge']){
      const g=europe.create(human,difficulty,12);
      const opponent=human==='eu'?'eb':'eu';
      assert.equal(E.income(g,human).credits,E.income(normal,human).credits);
      assert.ok(E.income(g,opponent).credits>E.income(normal,opponent).credits);
      assert.ok(g.units.filter(u=>u.side===opponent&&!E.TYPES[u.type].naval)
        .some(u=>u.stack>=3));
    }
  }
});

test('All 44 cities, not a timed Paris objective, are required for victory',()=>{
  for(const side of europe.sides){
    const g=europe.create(side,'normal',3);
    assert.equal(europe.winner(g),null);
    const opposing=g.stations.find(s=>s.owner!==side);
    assert.equal(g.scenario.turnLimit,undefined);
    g.turn=250;
    assert.equal(europe.winner(g),null);
    for(const city of g.stations)city.owner=side;
    opposing.owner=side==='eu'?'eb':'eu';
    assert.equal(europe.winner(g),null,'43 cities must not win');
    opposing.owner=side;
    assert.equal(europe.winner(g).winner,side);
    assert.equal(E.checkVictory(g).winner,side);
    assert.ok(E.objectiveText(g).includes('44 European cities'));
  }
});

test('AI scenario strategy uses active fronts and initial turn runs',()=>{
  for(const human of europe.sides){
    const g=europe.create(human,'normal',8);
    const enemy=human==='eu'?'eb':'eu';
    assert.doesNotThrow(()=>E.aiPlan(g,enemy));
    const strategy=E.aiPlan(g,enemy);
    assert.ok(strategy.fronts.length>0,'AI requires real opposing fronts');
    assert.doesNotThrow(()=>E.beginTurn(g,human,true));
    assert.equal(g.over,null);
    assert.equal(europe.onTurn(g),false);
  }
});

test('Army-group orders enforce player side and turn',()=>{
  const g=europe.create('eu','normal',7);
  const friendly=g.scenario.groups.find(x=>x.side==='eu'&&x.units.length);
  const enemy=g.scenario.groups.find(x=>x.side==='eb');
  assert.equal(europe.orderGroup(g,enemy.id,{c:1,r:1}).ok,false);
  g.phase='eb';
  assert.equal(europe.orderGroup(g,friendly.id,{c:1,r:1}).ok,false);
});

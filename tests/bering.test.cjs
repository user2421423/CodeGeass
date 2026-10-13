'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/scenarios.js');
require('../dist/scenarios-europe.js');
const bering=require('../dist/scenarios-bering.js');

const ground=u=>!E.TYPES[u.type].naval;
const ship=u=>E.TYPES[u.type].naval==='ship';
const water=(g,p)=>E.tile(g,p.c,p.r).terrain==='sea';

test('Bering is an independent two-faction, 120 x 80 regional conquest',()=>{
  assert.equal(E.scenarios.byId['bering-strait'],bering);
  assert.equal(bering.cols,120);
  assert.equal(bering.rows,80);
  assert.deepEqual(bering.sides,['britannia','eu']);
  for(const player of bering.sides){
    const g=bering.create(player,'normal',11);
    assert.equal(g.mode,'scenario');
    assert.equal(g.scenario.id,'bering-strait');
    assert.equal(g.scenario.key,'bering');
    assert.equal(g.wrap,false);
    assert.deepEqual(g.order,[player,bering.sides.find(s=>s!==player)]);
    assert.equal(g.tiles.length,9600);
    assert.equal(g.stations.length,28);
    assert.equal(g.stations.filter(s=>s.owner==='britannia').length,14);
    assert.equal(g.stations.filter(s=>s.owner==='eu').length,14);
    assert.equal(g.units.length,95);
    assert.equal(g.units.filter(ground).length,67);
    assert.equal(g.units.filter(u=>E.TYPES[u.type].naval).length,28);
    assert.equal(g.scenario.turnLimit,undefined);
    assert.equal(g.teams,null);
    assert.ok(!g.stations.some(s=>s.owner==='cf'||s.owner==='eb'||s.owner==='bk'));
    assert.ok(!g.units.some(u=>!bering.sides.includes(u.side)));
    assert.equal(new Set(g.units.map(E.key)).size,g.units.length);
    assert.equal(new Set(g.stations.map(E.key)).size,28);
    assert.ok(g.tiles.every(t=>t.terrain==='sea'||(t.owner&&t.provinceCity!=null)));
    for(const kind of ['sea','coast','plains','forest','mountain'])
      assert.ok(g.tiles.some(t=>t.terrain===kind),'missing '+kind);
    assert.ok(g.units.every(u=>u.hp>0));
  }
});

test('True coastline: northern strait, Kamchatka, Alaska and Aleutians',()=>{
  const g=bering.create('eu','normal',15);
  const near=(lon,lat)=>{const p=bering.cityData.slice().sort((a,b)=>
    Math.abs(a[1]-lon)+Math.abs(a[2]-lat)-Math.abs(b[1]-lon)-Math.abs(b[2]-lat))[0];
    return g.stations.find(s=>s.name===p[0]);
  };
  assert.ok(near(190.3,66.16),'Russian Bering coast');
  assert.ok(near(194.6,64.5),'Alaskan Bering coast');
  for(const name of ['Nome','Kotzebue','Provideniya','Uelen','Adak','Unalaska','Petropavlovsk','Kodiak']){
    const city=g.stations.find(s=>s.name===name);
    assert.ok(city);
    assert.notEqual(E.tile(g,city.c,city.r).terrain,'sea',name);
  }
  const uelen=g.stations.find(s=>s.name==='Uelen');
  const nome=g.stations.find(s=>s.name==='Nome');
  assert.ok(E.distance(uelen,nome,g)<23,'nearby Bering shores must face each other');
  const adak=g.stations.find(s=>s.name==='Adak');
  const kam=g.stations.find(s=>s.name==='Petropavlovsk');
  assert.ok(adak.c>kam.c,'Aleutian and Kamchatka positions should be on opposite sides');
});

test('All naval ports sit on adjacent navigable hexes and share a sea network',()=>{
  const g=bering.create('britannia','normal',16);
  const ports=g.stations.filter(s=>s.portAt);
  assert.equal(ports.length,18);
  assert.equal(new Set(ports.map(s=>E.key(s.portAt))).size,ports.length);
  for(const p of ports){
    assert.equal(E.distance(p,p.portAt,g),1,'harbour adjacency at '+p.name);
    assert.ok(water(g,p.portAt),'harbour is not water at '+p.name);
    assert.equal(p.owner,p.portOwner);
  }
  assert.equal(g.units.filter(ship).length,8);
  assert.ok(g.units.filter(u=>E.TYPES[u.type].naval).every(u=>water(g,u)));
  const queue=[E.tile(g,ports[0].portAt.c,ports[0].portAt.r)];
  const seen=new Set(queue.map(E.key));
  for(let i=0;i<queue.length;i++)for(const t of E.adjacent(g,queue[i]))
    if(t.terrain==='sea'&&!seen.has(E.key(t))){seen.add(E.key(t));queue.push(t);}
  assert.ok(ports.every(p=>seen.has(E.key(p.portAt))),'Every fleet must be connected to the sea network');
});

test('No China, no scripted diplomacy, no forced ending or FLEIJA',()=>{
  const g=bering.create('britannia','normal',18);
  assert.equal(bering.onTurn(g),false);
  assert.deepEqual(Object.keys(g.economy).sort(),['britannia','eu','neutral']);
  assert.deepEqual(Object.keys(g.tech).sort(),['britannia','eu','neutral']);
  g.turn=200;
  assert.equal(bering.winner(g),null);
  assert.equal(bering.onTurn(g),false);
  assert.equal(g.teams,null);
  assert.equal(g.scenario.phase,'amphibious-war');
  const other=g.stations.find(s=>s.owner==='eu');
  for(const s of g.stations)s.owner='britannia';
  other.owner='eu';
  assert.equal(bering.winner(g),null);
  other.owner='britannia';
  assert.equal(bering.winner(g).winner,'britannia');
  assert.equal(E.checkVictory(g).winner,'britannia');
  assert.ok(E.objectiveText(g).includes('28 Bering theatre cities'));
});

test('Both factions can produce ground reinforcements and marine craft',()=>{
  for(const side of bering.sides){
    const g=bering.create(side,'normal',21);
    assert.equal(E.income(g,'britannia').credits,420);
    assert.equal(E.income(g,'eu').credits,405);
    const type=E.typeFor(side,'light',g);
    const s=g.stations.find(s=>s.owner===side&&s.tier>=E.TYPES[type].tier&&!E.unitAt(g,s));
    assert.ok(s,'empty factory needed for '+side);
    const recruit=E.recruit(g,s.id,type,1);
    assert.equal(recruit.ok,true,recruit.reason);
  }
});

test('Hard and Challenge only raise rival strength',()=>{
  for(const player of bering.sides){
    const baseline=bering.create(player,'normal',27);
    for(const difficulty of ['hard','challenge']){
      const g=bering.create(player,difficulty,27);
      const foe=bering.sides.find(s=>s!==player);
      assert.equal(E.income(g,player).credits,E.income(baseline,player).credits);
      assert.ok(E.income(g,foe).credits>E.income(baseline,foe).credits);
      assert.ok(g.units.filter(u=>u.side===foe&&ground(u)).some(u=>u.stack===3));
    }
  }
});

test('Elite Bering uses faction elites without changing carrier hulls',()=>{
  for(const player of bering.sides){
    const normal=bering.create(player,'normal',33);
    const elite=bering.create(player,'elite',33);
    assert.equal(elite.units.length,normal.units.length);
    assert.ok(elite.units.every(u=>u.stack===1));
    assert.ok(elite.units.filter(ship).every(u=>!u.elite));
    assert.deepEqual(elite.units.filter(ship).map(u=>u.type).sort(),
      normal.units.filter(ship).map(u=>u.type).sort());
    assert.ok(elite.units.filter(u=>!ship(u)).every(u=>u.elite&&u.eliteStart));
    assert.ok(elite.units.filter(u=>u.side!==player&&u.cmd).every(u=>
      u.eliteLevel===5&&u.cmdRank===E.RANKS.length-1));
    assert.ok(Object.keys(elite.tech[elite.order[1]]).length>20);
  }
});

test('AI uses two-sided theatre planning on either faction and retains invasion fronts',()=>{
  for(const human of bering.sides){
    const g=bering.create(human,'normal',41),enemy=g.order[1];
    const plan=E.aiPlan(g,enemy);
    assert.equal(plan.doctrine,'europe');
    assert.ok(plan.fronts.length>0);
    assert.ok(plan.fronts.some(f=>f.overseas),'needs real overseas targets');
    assert.doesNotThrow(()=>E.beginTurn(g,human,true));
  }
});

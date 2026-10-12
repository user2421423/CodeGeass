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

test('European hex audit excludes Africa and Anatolia but preserves European shores and islands',()=>{
  const g=europe.create('eu','normal',121);
  const tileAt=(lon,lat)=>{
    const r=Math.max(0,Math.min(g.rows-1,Math.round((72-lat)*g.rows/38-.5)));
    const c=Math.max(0,Math.min(g.cols-1,Math.round(
      (lon+13)*g.cols/60-.5-.5*(r&1))));
    return E.tile(g,c,r);
  };
  const landNear=(lon,lat,range=1)=>{
    const center=tileAt(lon,lat);
    return g.tiles.some(t=>Math.abs(t.c-center.c)<=range&&
      Math.abs(t.r-center.r)<=range&&!['sea','offmap'].includes(t.terrain));
  };
  for(const [name,lon,lat] of [
    ['Ibiza (Balearics)',1.1,39.0],['Sardinia',9.05,40.05],
    ['Sicily',14.1,37.7],['Crete',24.9,35.2],['Rhodes',27.5,36.2]
  ]) assert.ok(landNear(lon,lat),name+' should retain playable European land');

  // Inspected landmarks: cities, peninsulas and European Mediterranean islands.
  for(const [name,lon,lat] of [
    ['Paris',2.35,48.86],['Madrid',-3.7,40.42],['Lisbon',-9.14,38.72],
    ['London',-.13,51.51],['Rome',12.5,41.9],['Naples',14.27,40.85],
    ['Berlin',13.4,52.52],['Warsaw',21,52.23],['Moscow',37.62,55.75],
    ['Sardinia',9.05,40.05],['Sicily',14.1,37.7],['Crete',24.9,35.45],
  ]) assert.notEqual(tileAt(lon,lat).terrain,'offmap',name+' should be inside the map');

  for(const [name,lon,lat] of [
    ['Algiers',3.1,36.75],['Tunis',10.2,36.8],
    ['Ankara',32.85,39.92],['Izmir',27.14,38.42],
    ['Antalya',30.7,36.9],['Trabzon',39.72,41.0],
    ['Batumi',41.6,41.65]
  ]) assert.equal(tileAt(lon,lat).terrain,'offmap',
    name+' must be outside both European land and navigable sea');

  let shore=0;
  for(const t of g.tiles){
    if(t.terrain==='sea'||t.terrain==='offmap')continue;
    assert.ok(t.owner==='eu'||t.owner==='eb','no unowned European land');
    const neighbors=E.adjacent(g,t);
    const touchesSea=neighbors.some(n=>n.terrain==='sea');
    assert.equal(t.terrain==='coast',touchesSea,
      'shoreline classification must match real adjacent water at '+t.c+','+t.r);
    if(touchesSea)shore++;
  }
  assert.ok(shore>400,'European islands, bays and peninsulas must all be coastal');
  assert.equal(g.stations.length,44);
  assert.equal(g.stations.filter(s=>s.portAt&&
    E.tile(g,s.portAt.c,s.portAt.r).terrain==='sea').length,13);
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

test('Euro Britannia fields stronger initial armies to compensate for E.U. industry',()=>{
  const g=europe.create('eu','normal',9);
  const stacks=side=>g.units.filter(u=>u.side===side&&!E.TYPES[u.type].naval)
    .reduce((total,u)=>total+u.stack,0);
  assert.ok(stacks('eb')>stacks('eu')*1.35,
    'Eastern field army must outweigh the more industrialized E.U. defence');
});

test('Both sides can produce their own faction-specific reinforcements',()=>{
  for(const side of europe.sides){
    const g=europe.create(side,'normal',15);
    const type=E.typeFor(side,'scout',g);
    const city=g.stations.find(s=>s.owner===side&&s.tier>=E.TYPES[type].tier&&
      !E.unitAt(g,s));
    assert.ok(city,'no unoccupied factory for '+side);
    const created=E.recruit(g,city.id,type,1);
    assert.equal(created.ok,true,created.reason);
    assert.equal(created.unit.side,side);
    assert.equal(created.unit.type,type);
  }
});

test('Elite Europe converts land and amphibious units while keeping regular carrier-battleships',()=>{
  for(const side of europe.sides){
    const g=europe.create(side,'elite',24);
    assert.equal(g.difficulty,'elite');
    assert.equal(g.units.length,100);
    assert.ok(g.units.every(u=>u.stack===1&&u.hp===E.maxHP(u)));
    const fighters=g.units.filter(u=>E.TYPES[u.type].naval!=='ship');
    const carriers=g.units.filter(u=>E.TYPES[u.type].naval==='ship');
    assert.ok(fighters.every(u=>u.eliteStart&&u.elite));
    assert.ok(carriers.length>0&&carriers.every(u=>!u.elite&&!u.eliteStart));
    assert.ok(fighters.filter(u=>u.side===side).every(u=>u.eliteLevel===1));
    assert.ok(fighters.filter(u=>u.side!==side&&!u.cmd).every(u=>u.eliteLevel===1));
    const enemyCommanders=g.units.filter(u=>u.side!==side&&u.cmd);
    assert.ok(enemyCommanders.length>=4);
    assert.ok(enemyCommanders.every(u=>u.eliteLevel===5&&
      u.cmdRank===E.RANKS.length-1&&g.officers[u.cmd].rank===E.RANKS.length-1));
    assert.ok(g.stations.every(s=>s.tier>=2));
    assert.ok(g.stations.some(s=>s.owner!==side&&s.tier===3));
    assert.ok(Object.keys(g.tech[g.order[1]]).length>20);
  }
});

test('Named commanders receive their Europe-specific Elite signature frames',()=>{
  const eu=europe.create('eb','elite',11);
  const assigned=new Map(eu.units.filter(u=>u.cmd).map(u=>[u.cmd,u.elite]));
  for(const [cmd,id] of Object.entries({
    leila:'leila_alexander',akito:'akito_liberte',ryo:'ryo_valiant',
    ayano:'ayano_valiant',yukiya:'yukiya_valiant',smilas:'hummel_battery',
    shin:'lancelot',julius:'mordred',ashley:'vincent_ward',
    manfredi:'cornelia_gloucester'
  }))assert.equal(assigned.get(cmd),id,'Wrong starting frame for '+cmd);
});

test('Elite Europe lends Britannian units to Euro Britannia without global leaks',()=>{
  const euro=europe.create('eb','elite',11);
  assert.ok(E.eliteEligible(euro,'eb','lancelot'));
  assert.ok(E.eliteEligible(euro,'eb','mordred'));
  assert.equal(E.eliteEligible(euro,'eb','akito_liberte'),false);
  assert.equal(E.eliteEligible(euro,'eu','lancelot'),false);
  assert.equal(E.eliteEligible(euro,'eu','leila_alexander'),true);
  assert.equal(Object.keys(E.ELITE_FORCES).some(id=>id.endsWith('_carrier')),false);
  const world=E.createGame('britannia','normal');
  assert.equal(E.eliteEligible(world,'eb','lancelot'),false);
  const japan=E.scenarios.japan.create('britannia','elite',11);
  assert.equal(E.eliteEligible(japan,'eb','lancelot'),false);
  assert.ok(japan.units.filter(u=>E.TYPES[u.type].naval==='ship').every(u=>!u.elite));
});

test('Elite European carriers retain regular hull types and transport capacity',()=>{
  const g=europe.create('eu','elite',10), normal=europe.create('eu','normal',10);
  const fleet=x=>x.units.filter(u=>E.TYPES[u.type].naval==='ship');
  assert.ok(fleet(g).length>0);
  assert.deepEqual(fleet(g).map(u=>[u.side,u.type]).sort(),fleet(normal).map(u=>[u.side,u.type]).sort());
  assert.ok(fleet(g).every(u=>!u.elite&&u.stack===1&&E.carrierCapacity(g,u)>=2));
});

test('Elite Europe permits one HQ-unlocked land elite and regular carrier purchase',()=>{
  const g=europe.create('eb','elite',55);
  const type='lancelot', profile={elites:{}};
  const city=g.stations.find(s=>s.owner==='eb'&&s.tier>=E.TYPES[E.ELITE_FORCES[type].type].tier&&
    !E.unitAt(g,s));
  assert.ok(city,'requires an empty Euro Britannian factory');
  assert.match(E.eliteDeployReason(g,city,type,profile),/Locked/i);
  E.eliteProfile(profile);
  profile.elites[type].level=1;
  const first=E.deployElite(g,city.id,type,profile);
  assert.equal(first.ok,true,first.reason);
  assert.equal(first.unit.side,'eb');
  assert.equal(first.unit.elite,type);
  assert.equal(first.unit.eliteLevel,1);
  assert.equal(first.unit.stack,1);
  assert.equal(g.eliteDeployed[type],true);
  assert.match(E.eliteDeployReason(g,city,type,profile),/Already deployed/i);
  const eu=europe.create('eu','elite',33);
  const port=eu.stations.find(s=>s.owner==='eu'&&s.portLevel>=2&&s.portAt&&
    !E.unitAt(eu,s.portAt));
  assert.ok(port);
  eu.economy.eu.credits=10000;
  eu.economy.eu.industry=10000;
  eu.economy.eu.sakuradite=1000;
  const normalShip=E.recruit(eu,port.id,'eu_carrier',1);
  assert.equal(normalShip.ok,true,normalShip.reason);
  assert.equal(normalShip.unit.type,'eu_carrier');
  assert.equal(normalShip.unit.elite,undefined);
});

test('Elite European AI produces elite fighters and ordinary carriers',()=>{
  for(const player of europe.sides){
    const g=europe.create(player,'elite',34),enemy=player==='eu'?'eb':'eu';
    g.phase=enemy;
    const before=g.units.length;
    assert.doesNotThrow(()=>E.aiPlan(g,enemy));
    assert.doesNotThrow(()=>E.aiProduction(g));
    const produced=g.units.slice(before);
    assert.ok(produced.length>0,'AI should build elite reinforcements');
    assert.ok(produced.every(u=>u.stack===1));
    assert.ok(produced.filter(u=>E.TYPES[u.type].naval==='ship').every(u=>!u.elite));
    assert.ok(produced.filter(u=>E.TYPES[u.type].naval!=='ship').every(u=>
      u.elite&&u.eliteLevel===1&&E.eliteEligible(g,enemy,u.elite)));
  }
});

test('Previously saved Elite carrier variants migrate to regular hulls',()=>{
  const g=europe.create('eu','elite',21);
  const ship=g.units.find(u=>u.side==='eu'&&E.TYPES[u.type].naval==='ship');
  assert.ok(ship);
  ship.type='elite_europe_eu_carrier';
  ship.elite='europe_eu_carrier';
  ship.eliteLevel=1;
  ship.eliteStart=true;
  g.scenario.eliteRosters.eu.push('europe_eu_carrier');
  g.eliteDeployed.europe_eu_carrier=true;
  const saved=E.migrateSave(E.packSave(g));
  assert.ok(saved,'legacy Elite carrier saves should still load');
  const hull=saved.units.find(u=>u.id===ship.id);
  assert.equal(hull.type,'eu_carrier');
  assert.equal(hull.elite,undefined);
  assert.equal(hull.eliteLevel,undefined);
  assert.equal(saved.scenario.eliteRosters.eu.includes('europe_eu_carrier'),false);
  assert.equal(saved.eliteDeployed.europe_eu_carrier,undefined);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/scenarios.js');
const area=require('../dist/scenarios-area18.js');
const bits=require('../dist/area18-landmask.js');
const SIDES=['britannia','eu','cf'];
const SIZE=120*88;
const raw=Buffer.from(bits,'base64');
const asSea=(g,p)=>E.tile(g,p.c,p.r).terrain==='sea';
const city=(g,name)=>g.stations.find(s=>s.name===name);
function regions(g,predicate){
  const index=new Int16Array(SIZE).fill(-1),groups=[];
  for(let i=0;i<SIZE;i++){
    if(index[i]>=0||!predicate(g.tiles[i]))continue;
    const q=[g.tiles[i]],id=groups.length;
    index[i]=id;
    for(let k=0;k<q.length;k++)for(const p of E.adjacent(g,q[k])){
      const j=p.r*g.cols+p.c;
      if(index[j]<0&&predicate(p)){index[j]=id;q.push(p);}
    }
    groups.push(q);
  }
  return {index,groups};
}
test('Area 18 is registered as an independent 50-city three-way war',()=>{
  assert.equal(E.scenarios.byId['area-18'],area);
  assert.deepEqual(area.sides,SIDES);
  assert.equal(area.cols,120);assert.equal(area.rows,88);
  assert.equal(area.cityData.length,50);
  for(const player of SIDES)for(const difficulty of ['normal','hard','challenge','elite']){
    const g=area.create(player,difficulty,851);
    assert.equal(g.scenario.id,'area-18');
    assert.equal(g.scenario.key,'area18');
    assert.equal(g.tiles.length,SIZE);
    assert.equal(g.stations.length,50);
    assert.equal(g.units.length,191);
    assert.deepEqual(g.order,[player,...SIDES.filter(s=>s!==player)]);
    assert.equal(g.teams,null);assert.equal(g.wrap,false);
    assert.equal(g.scenario.turnLimit,undefined);
    assert.ok(g.stations.every(s=>SIDES.includes(s.owner)));
    assert.ok(g.units.every(u=>u.hp>0&&SIDES.includes(u.side)));
    assert.equal(new Set(g.units.map(E.key)).size,191);
    assert.equal(new Set(g.stations.map(E.key)).size,50);
    assert.equal(g.stations.filter(s=>s.portAt).length,17);
    assert.equal(g.units.filter(u=>!E.TYPES[u.type].naval).length,160);
    assert.equal(g.units.filter(u=>E.TYPES[u.type].naval).length,31);
    assert.deepEqual(Object.fromEntries(SIDES.map(s=>
      [s,g.stations.filter(c=>c.owner===s).length])),{britannia:21,eu:14,cf:15});
    for(const side of SIDES)assert.ok(g.economy[side].credits>0);
  }
});
test('Every hex matches the packed coastline and the political/terrain rules',()=>{
  assert.equal(raw.length,SIZE/8);
  const g=area.create('eu','normal',10);
  const seen=new Set();
  for(let i=0;i<SIZE;i++){
    const t=g.tiles[i],land=!!(raw[i>>3]&(128>>(i&7)));
    assert.equal(t.c,i%120);assert.equal(t.r,Math.floor(i/120));
    assert.equal(t.terrain==='sea',!land,'shoreline mismatch at '+E.key(t));
    if(land){
      assert.ok(['coast','plains','desert','forest','mountain','peak'].includes(t.terrain));
      assert.equal(t.terrain==='coast',E.adjacent(g,t).some(p=>p.terrain==='sea'),
        'coastline at '+E.key(t));
      assert.ok(SIDES.includes(t.owner),'province at '+E.key(t));
      assert.ok(Number.isInteger(t.provinceCity));
      assert.equal(g.stations[t.provinceCity].owner,t.owner);
      seen.add(t.terrain);
    }else{
      assert.equal(t.owner,null);assert.equal(t.provinceCity,undefined);
    }
  }
  for(const terrain of ['coast','plains','desert','forest','mountain','peak'])
    assert.ok(seen.has(terrain),'missing '+terrain);
});
test('All 50 named cities are geographically anchored, none at sea or duplicated',()=>{
  const g=area.create('britannia','normal',30),B=area.bounds;
  for(const [name,lon,lat,side] of area.cityData){
    const cityAt=city(g,name);
    assert.ok(cityAt);
    assert.equal(cityAt.owner,side);
    const r=Math.max(0,Math.min(g.rows-1,
      Math.round((B.north-lat)*g.rows/(B.north-B.south)-.5)));
    const c=Math.max(0,Math.min(g.cols-1,
      Math.round((lon-B.west)*g.cols/(B.east-B.west)-.5-.5*(r&1))));
    assert.ok(E.distance({c,r},cityAt,g)<=2,'bad city snap: '+name);
    assert.notEqual(E.tile(g,cityAt.c,cityAt.r).terrain,'sea',name);
  }
  for(const name of ['Riyadh','Jeddah','Mecca','Medina','Baghdad','Basra',
    'Damascus','Tehran','Isfahan','Shiraz','Bushehr','Bandar Abbas']){
    assert.ok(city(g,name),'missing '+name);
  }
});
test('Ports, Suez Canal, Red Sea and Persian Gulf form one usable connected route',()=>{
  const g=area.create('britannia','normal',40);
  const water=regions(g,t=>t.terrain==='sea');
  const ports=g.stations.filter(s=>s.portAt);
  const route=water.index[city(g,'Dammam').portAt.r*g.cols+city(g,'Dammam').portAt.c];
  assert.ok(route>=0);
  for(const p of ports){
    assert.equal(E.distance(p,p.portAt,g),1,p.name);
    assert.ok(asSea(g,p.portAt),p.name);
    assert.equal(p.portOwner,p.owner);
    assert.equal(water.index[p.portAt.r*g.cols+p.portAt.c],route,
      p.name+' must be navigable from Persian Gulf');
  }
  for(const u of g.units.filter(u=>E.TYPES[u.type].naval))
    assert.equal(water.index[u.r*g.cols+u.c],route,
      'fleet is stranded: '+u.id);
  assert.ok(water.groups[route].length>2500);
});
test('Mesopotamia-Zagros, Syria and Iranian approaches remain passable',()=>{
  const g=area.create('cf','normal',51);
  const land=regions(g,t=>t.terrain!=='sea'&&t.terrain!=='peak');
  const connected=(a,b)=>land.index[city(g,a).r*g.cols+city(g,a).c]===
    land.index[city(g,b).r*g.cols+city(g,b).c];
  for(const pair of [['Baghdad','Mosul'],['Baghdad','Kermanshah'],['Basra','Ahvaz'],
    ['Riyadh','Damascus'],['Shiraz','Isfahan'],['Kermanshah','Tehran'],
    ['Herat','Tehran'],['Tehran','Baghdad']])
    assert.ok(connected(...pair),'impassable front: '+pair.join(' -> '));
  assert.equal(E.tile(g,city(g,'Riyadh').c,city(g,'Riyadh').r).terrain!=='sea',true);
});
test('No turn events, alliance betrayals, FLEIJA or arbitrary victory limit',()=>{
  const g=area.create('eu','normal',71);
  assert.equal(area.onTurn(g),false);
  g.turn=350;assert.equal(area.onTurn(g),false);
  assert.equal(area.winner(g),null);
  assert.equal(g.teams,null);
  assert.equal(g.scenario.turnLimit,undefined);
  assert.ok(SIDES.every(s=>(g.arsenal[s]||0)===0));
  for(const s of g.stations)s.owner='cf';
  assert.equal(area.winner(g).winner,'cf');
  assert.equal(E.checkVictory(g).winner,'cf');
  assert.ok(E.objectiveText(g).includes('50 Area 18 theatre cities'));
});
test('Each side can recruit; harder settings aid AI, not the human',()=>{
  for(const player of SIDES){
    const base=area.create(player,'normal',88);
    for(const difficulty of ['hard','challenge']){
      const hard=area.create(player,difficulty,88);
      assert.equal(E.income(hard,player).credits,E.income(base,player).credits);
      for(const foe of SIDES.filter(s=>s!==player))
        assert.ok(E.income(hard,foe).credits>E.income(base,foe).credits);
    }
    const type=E.typeFor(player,'light',base);
    const c=base.stations.find(s=>s.owner===player&&s.tier>=E.TYPES[type].tier&&!E.unitAt(base,s));
    assert.ok(c,'available recruitment site for '+player);
    const recruit=E.recruit(base,c.id,type,1);
    assert.equal(recruit.ok,true,player+': '+recruit.reason);
  }
});
test('Elite starts use appropriate forces and AI plans multiple rivals',()=>{
  for(const human of SIDES){
    const g=area.create(human,'elite',301);
    assert.ok(g.units.every(u=>u.stack===1));
    assert.ok(g.units.filter(u=>E.TYPES[u.type].naval==='ship').every(u=>!u.elite));
    const normal=area.create(human,'normal',301);
    assert.equal(g.units.length,normal.units.length);
    const p=E.aiPlan(normal,human);
    assert.equal(p.doctrine,'europe');
    assert.ok(p.fronts.some(f=>f.anchor.owner!==human));
    assert.ok(new Set(p.fronts.map(f=>f.anchor.owner)).size>=2);
    assert.doesNotThrow(()=>E.beginTurn(normal,human,true));
  }
});

test('Area 18 saves and resumes for all factions on normal and elite',()=>{
  for(const player of SIDES)for(const difficulty of ['normal','elite']){
    const original=area.create(player,difficulty,732);
    const serialized=JSON.stringify(E.packSave(original));
    assert.ok(serialized.length<200000,'compact regional save '+player+' '+difficulty);
    const restored=E.migrateSave(JSON.parse(serialized));
    assert.ok(restored,'restored '+player+' '+difficulty);
    assert.equal(restored.scenario.id,'area-18');
    assert.equal(restored.player,player);
    assert.equal(restored.difficulty,difficulty);
    assert.deepEqual(restored.stations,original.stations);
    assert.deepEqual(restored.units,original.units);
    assert.deepEqual(restored.scenario.groups,original.scenario.groups);
    assert.equal(restored.tiles.length,original.tiles.length);
    assert.deepEqual(restored.eliteDeployed,{},'preplaced Elite Forces do not consume HQ limit');
    assert.doesNotThrow(()=>E.aiPlan(restored,player));
  }
});

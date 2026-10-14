#!/usr/bin/env node
'use strict';
// Independent actual-engine geographical, coastline, pathfinding, economic and victory audit.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/europe-landmask.js');
const W=require('../dist/scenarios-western-russia.js');
const ids=['Moscow','St. Petersburg','Smolensk','Tver','Veliky Novgorod',
  'Nizhny Novgorod','Kazan','Pskov','Vyborg','Petrozavodsk'];
const g=W.create('britannia','normal',104729);
assert.equal(W.cityData.length,41);
assert.equal(g.tiles.length,W.cols*W.rows);
assert.equal(new Set(g.stations.map(s=>s.name)).size,W.cityData.length);
assert.deepEqual(W.sides,['britannia','eu']);
for(const name of ids)assert(g.stations.some(c=>c.name===name),'Missing '+name);
for(const s of g.stations) {
  const t=E.tile(g,s.c,s.r);
  assert(t && t.terrain!=='sea' && t.terrain!=='offmap','City is water '+s.name);
  assert.equal(t.owner,s.owner,'Province mismatch '+s.name);
  const [name,lon,lat]=W.cityData.find(c=>c[0]===s.name);
  const p=W.geographicAt(s.c,s.r);
  assert(Math.abs(p.lon-lon)<.55 && Math.abs(p.lat-lat)<.4,
    'City snapped too far: '+name+' '+JSON.stringify(p));
}
const waters=['sea','offmap'],cities=new Set(g.stations.map(s=>s.c+':'+s.r));
let mixed=0,dry=0,ocean=0,forest=0,lakes=0;
for(const t of g.tiles){
  if(t.terrain==='coast'){
    mixed++;
    assert(E.adjacent(g,t).some(n=>n.terrain==='sea'),
      'Coast not touching sea at '+t.c+','+t.r);
    const f=W.coastFractionAt(t.c,t.r);
    assert(f>=.2-1e-8&&f<=.8+1e-8,
      'False coastal classification '+t.c+','+t.r+': '+f);
  } else if(t.terrain==='sea')ocean++;
  else if(t.terrain==='forest')forest++;
  else dry++;
}
assert(mixed>0&&ocean>0&&forest>100&&dry>1000,
  'Geography mask lacks varied land and water');
function landReach(start){
  const queue=[start],seen=new Set([E.key(start)]);
  for(let i=0;i<queue.length;i++){
    for(const n of E.adjacent(g,queue[i])){
      const k=E.key(n);
      if(!waters.includes(n.terrain)&&!seen.has(k)){seen.add(k);queue.push(n);}
    }
  }
  return seen;
}
const sources=g.stations.filter(s=>s.owner==='britannia');
const reach=landReach(sources.find(s=>s.name==='Kazan'));
for(const city of g.stations){
  assert(reach.has(E.key(city)),'Inaccessible objective from Kazan: '+city.name);
}
for(const group of g.scenario.groups){
  assert(group.units.length>0,'Empty group '+group.name);
  for(const id of group.units){
    const unit=g.units.find(u=>u.id===id);
    assert(unit,'Missing assigned formation '+id);
    assert.equal(unit.side,group.side);
    const hex=E.tile(g,unit.c,unit.r);
    assert(hex.terrain!=='sea','Land group deployed at sea');
  }
}
const m=g.stations.find(c=>c.name==='Moscow');
const st=g.stations.find(c=>c.name==='St. Petersburg');
assert(m.fort&&st.fort&&m.maxShield>=600&&st.maxShield>=600);
assert(m.maxShield<1000&&st.maxShield<1000,'Capitals must be capturable');
for(const s of g.stations)s.owner='britannia';
assert.equal(W.winner(g)?.winner,'britannia');
for(const s of g.stations)s.owner='eu';
assert.equal(W.winner(g)?.winner,'eu');
g.stations[0].owner='britannia';
assert.equal(W.winner(g),null);
g.turn=2000;
assert.equal(W.winner(g),null,'No turn-limit victory allowed');
for(const side of W.sides){
  for(const diff of ['normal','hard','challenge','elite']){
    const test=W.create(side,diff,104729);
    assert.equal(test.stations.length,41);
    assert(test.units.some(u=>u.side===side));
    assert(test.units.some(u=>u.side!==side));
    assert(test.scenario.groups.some(row=>row.side===side));
    if(diff==='elite')assert(test.units.some(u=>u.elite),
      'Elite difficulty must create elite ground units');
  }
}
const waterIn=(lon,lat,radius=1)=>{
  const tiles=g.tiles.filter(t=>{
    const pos=W.geographicAt(t.c,t.r);
    return Math.abs(pos.lon-lon)<radius&&Math.abs(pos.lat-lat)<radius;
  });
  return tiles.filter(t=>t.terrain==='sea').length;
};
assert(waterIn(31.8,61.0,.32)>0,'Lake Ladoga missing');
assert(waterIn(35.5,61.9,.32)>0,'Lake Onega missing');
console.log('WESTERN_RUSSIA_AUDIT '+JSON.stringify({cities:g.stations.length,
  land:dry,mixedCoast:mixed,water:ocean,forest,groups:g.scenario.groups.length,
  initialUnits:g.units.length,landReach:reach.size,
  keyCities:ids,allFourDifficulties:true,capitalShields:[m.maxShield,st.maxShield]}));

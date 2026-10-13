#!/usr/bin/env node
'use strict';
/*
 * Exhaustive Bering Strait geography regression.
 * Validate every one of 9,600 tactical hexes against the audited shoreline
 * bitmap, and separately verify ALL coast transitions, province assignments,
 * island continuity, port/ship launch positions and sea connectivity.
 * Independent geographical source: sampled GSHHS intermediate-resolution
 * shorelines (see dist/bering-landmask.js).
 */
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/scenarios.js');
const bits=require('../dist/bering-landmask.js');
const Bering=require('../dist/scenarios-bering.js');
const COLS=120,ROWS=80,SIZE=COLS*ROWS;
const raw=Buffer.from(bits,'base64');
assert.equal(raw.length,SIZE/8,'1200 bytes of audited coastline expected');
const isLand=i=>Boolean(raw[i>>3]&(128>>(i&7)));
const regionize=(g,predicate)=>{
  const visited=new Uint8Array(SIZE),regions=[],byHex=new Int16Array(SIZE).fill(-1);
  for(let i=0;i<SIZE;i++){
    if(visited[i]||!predicate(g.tiles[i]))continue;
    const group=[],queue=[g.tiles[i]],id=regions.length;
    visited[i]=1;byHex[i]=id;
    for(let head=0;head<queue.length;head++){
      const t=queue[head];group.push(t);
      for(const next of E.adjacent(g,t)){
        const j=next.r*COLS+next.c;
        if(visited[j]||!predicate(next))continue;
        visited[j]=1;byHex[j]=id;queue.push(next);
      }
    }
    regions.push(group);
  }
  return {regions:regions.sort((a,b)=>b.length-a.length),byHex};
};
function audit(g){
  const errors=[],counts={land:0,sea:0,coast:0,forest:0,mountain:0,plains:0};
  for(let i=0;i<SIZE;i++){
    const t=g.tiles[i],c=i%COLS,r=(i/COLS)|0;
    if(!t||t.c!==c||t.r!==r){errors.push('hex index mismatch '+i);continue;}
    const sea=t.terrain==='sea',land=isLand(i);
    if(sea===land)errors.push('coast mask mismatch at '+c+','+r);
    const neighbors=E.adjacent(g,t);
    if(land){
      counts.land++;
      const touching=neighbors.some(n=>n.terrain==='sea');
      if((t.terrain==='coast')!==touching)
        errors.push('wrong coast/land terrain at '+c+','+r+' '+t.terrain);
      if(!['coast','plains','forest','mountain'].includes(t.terrain))
        errors.push('unknown land terrain at '+c+','+r);
      if(!['britannia','eu'].includes(t.owner)||
         !Number.isInteger(t.provinceCity)||!g.stations[t.provinceCity])
        errors.push('unassigned land province at '+c+','+r);
    } else {
      counts.sea++;
      if(t.owner!=null||t.provinceCity!=null)
        errors.push('sea hex has political province at '+c+','+r);
    }
    if(counts[t.terrain]!=null)counts[t.terrain]++;
  }
  assert.deepEqual(errors.slice(0,12),[],errors.length+' geography/province errors');
  assert.equal(counts.land,3379);
  assert.equal(counts.sea,6221);
  assert.equal(counts.coast,550);
  assert.equal(counts.land+counts.sea,SIZE);
  const landRegions=regionize(g,t=>t.terrain!=='sea').regions;
  const waterRegions=regionize(g,t=>t.terrain==='sea').regions;
  assert.equal(waterRegions.length,1,'no isolated ship-accessible inland seas or artefacts');
  assert.equal(waterRegions[0].length,6221,'all water connected to ocean');
  assert.equal(landRegions.length,16,'16 mainland/island components are preserved');
  assert.ok(landRegions.filter(r=>r.length>1500).length===2,
    'Alaskan and Russian mainland must remain distinct');
  const regions=new Map();
  landRegions.forEach((group,i)=>group.forEach(t=>regions.set(E.key(t),i)));
  const cities=new Map(g.stations.map(s=>[s.name,s]));
  assert.notEqual(regions.get(E.key(cities.get('Nome'))),
    regions.get(E.key(cities.get('Uelen'))),'no land bridge across Bering Strait');
  for(const name of ['Adak','Unalaska','Kodiak']){
    const id=regions.get(E.key(cities.get(name)));
    assert.ok(id>1,'independent island '+name+' must exist');
  }
  // Each of the 28 city anchors must remain in its own geographical vicinity,
  // including small isolated islands and coastal cities snapped to a beach.
  for(const [name,lon,lat] of Bering.cityData){
    const row=Math.max(0,Math.min(ROWS-1,
      Math.round((Bering.bounds.north-lat)*ROWS/(Bering.bounds.north-Bering.bounds.south)-0.5)));
    const col=Math.max(0,Math.min(COLS-1,Math.round(
      (lon-Bering.bounds.west)*COLS/(Bering.bounds.east-Bering.bounds.west)-0.5-0.5*(row&1))));
    const city=cities.get(name);
    assert.ok(city,'missing city '+name);
    assert.ok(E.distance(city,{c:col,r:row},g)<=2,'city misplaced '+name);
    assert.notEqual(E.tile(g,city.c,city.r).terrain,'sea','city afloat '+name);
  }
  const ports=g.stations.filter(s=>s.portAt);
  assert.equal(ports.length,18);
  assert.equal(new Set(ports.map(s=>E.key(s.portAt))).size,ports.length);
  const reachableWater=new Set(waterRegions[0].map(t=>E.key(t)));
  for(const s of ports){
    assert.equal(E.distance(s,s.portAt,g),1,'port needs adjacent water '+s.name);
    assert.equal(E.tile(g,s.portAt.c,s.portAt.r).terrain,'sea');
    assert.ok(reachableWater.has(E.key(s.portAt)),'inaccessible port '+s.name);
  }
  for(const u of g.units.filter(u=>E.TYPES[u.type].naval)){
    assert.equal(E.tile(g,u.c,u.r).terrain,'sea',
      'naval formation stranded on land '+u.id);
    assert.ok(reachableWater.has(E.key(u)),'naval unit stranded in lake '+u.id);
  }
  return {hexes:SIZE,cities:g.stations.length,ports:ports.length,
    formations:g.units.length,landRegions:landRegions.map(r=>r.length),
    waterRegions:waterRegions.map(r=>r.length),...counts};
}
for(const side of Bering.sides){
  const snapshot=audit(Bering.create(side,'normal',147));
  console.log('BERING_HEX_AUDIT '+JSON.stringify({player:side,...snapshot}));
}

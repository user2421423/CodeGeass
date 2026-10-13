#!/usr/bin/env node
'use strict';
/* Exhaustive 12,144-hex geography, province, deployment and port audit. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const E=require('../dist/engine.js');
require('../dist/scenarios.js');
const geo=require('../dist/australia-landmask.js');
const scenario=require('../dist/scenarios-australia.js');
const N=scenario.cols*scenario.rows;
const bits=Buffer.from(geo.bits,'base64');
// Independent GSHHG polygons drive the *visible* coastline; they are not the
// sampled gameplay bitmap. Cross-check every playable hex centre against both.
const vectorShapes=vm.runInNewContext(fs.readFileSync(
  path.join(__dirname,'../dist/ui/geography-data.js'),'utf8')+'\nGEOGRAPHY_SHAPES');
const atlasSource=fs.readFileSync(path.join(__dirname,'../dist/ui/geography.js'),'utf8');
const R=43,SQ=Math.sqrt(3);
const geography=new Function('R','SQ','WORLD_W','WORLD_H','GEOGRAPHY_SHAPES','E',
  atlasSource+'\nreturn GEOGRAPHY;')(
    R,SQ,SQ*R*180,R*(1.5*75+2),vectorShapes,E);
assert.equal(bits.length,N/8);
const regionize=(g,condition)=>{
  const visited=new Uint8Array(N),components=[];
  for(let i=0;i<N;i++){
    if(visited[i]||!condition(g.tiles[i]))continue;
    const queue=[g.tiles[i]];
    visited[i]=1;
    for(let head=0;head<queue.length;head++)
      for(const next of E.adjacent(g,queue[head])){
        const j=next.r*g.cols+next.c;
        if(visited[j]||!condition(next))continue;
        visited[j]=1;queue.push(next);
      }
    components.push(queue);
  }
  return components.sort((a,b)=>b.length-a.length);
};
function audit(g){
  const counts={sea:0,coast:0,plains:0,forest:0,mountain:0,desert:0};
  const problems=[],visualDifferences=[];
  for(let i=0;i<N;i++){
    const t=g.tiles[i],c=i%g.cols,r=(i/g.cols)|0;
    if(!t||t.c!==c||t.r!==r){problems.push('wrong tile coordinates '+i);continue;}
    const p=geo.point(c,r),mask=!!(bits[i>>3]&(128>>(i&7)));
    const expected=geo.isLand(p.lon,p.lat);
    if(mask!==expected || (t.terrain!=='sea')!==mask)problems.push('wrong land/sea '+c+','+r);
    // Subhex coastline detail can differ slightly between vector atlas and
    // centre-sampled mask, but a geographic mismatch must remain coastal.
    if(geography.australiaLandAt(p.lon,p.lat)!==mask){
      visualDifferences.push({c,r,lon:+p.lon.toFixed(2),lat:+p.lat.toFixed(2),
        playableLand:mask});
      const boundary=[t,...E.adjacent(g,t)].some(n=>
        E.adjacent(g,n).some(other=>(other.terrain==='sea')!==(n.terrain==='sea')));
      if(!boundary)problems.push('inland visual coast mismatch '+c+','+r);
    }
    if(!Object.hasOwn(counts,t.terrain))problems.push('unknown terrain '+t.terrain);
    else counts[t.terrain]++;
    if(mask){
      if(!['britannia','cf','eu'].includes(t.owner)||
        !Number.isInteger(t.provinceCity)||
        g.stations[t.provinceCity]?.owner!==t.owner)
        problems.push('wrong province '+c+','+r);
      const touching=E.adjacent(g,t).some(n=>n.terrain==='sea');
      if((t.terrain==='coast')!==touching)
        problems.push('wrong coastal hex '+c+','+r);
    }else if(t.owner!=null||t.provinceCity!=null)
      problems.push('sea assigned owner '+c+','+r);
  }
  assert.deepEqual(problems.slice(0,15),[],problems.length+' tile errors');
  assert.ok(visualDifferences.length<=32,
    'too many vector/GIS coastline disagreements: '+visualDifferences.length);
  for(const [name,lon,lat,land] of [
    ['Australian mainland',133.88,-23.7,true],
    ['Tasmania',147.32,-42.88,true],
    ['Bass Strait',146.5,-40,false],
    ['open Indian Ocean',112,-36,false],
    ['Papua New Guinea',145,-7,false],
    ['Indonesia',119,-8,false]])
    assert.equal(geography.australiaLandAt(lon,lat),land,
      'wrong visual regional island filter: '+name);
  const land=regionize(g,t=>t.terrain!=='sea');
  const water=regionize(g,t=>t.terrain==='sea');
  assert.equal(water.length,1,'all playable sea hexes are connected');
  assert.ok(land.length>=2,'Tasmania must be separate from the mainland');
  const largest=new Set(land[0].map(E.key));
  for(const city of ['Darwin','Alice Springs','Perth','Sydney','Melbourne','Adelaide','Brisbane']){
    assert.ok(largest.has(E.key(g.stations.find(s=>s.name===city))),
      city+' should be connected to mainland road network');
  }
  const hobart=g.stations.find(s=>s.name==='Hobart');
  assert.ok(!largest.has(E.key(hobart)),'Tasmania must remain separated by Bass Strait');
  for(const [name,lon,lat] of scenario.cityData){
    const s=g.stations.find(v=>v.name===name);
    assert.ok(s,'missing '+name);
    assert.notEqual(E.tile(g,s.c,s.r).terrain,'sea',name+' on water');
    const p=geo.point(s.c,s.r);
    const error=Math.hypot((lon-p.lon)*Math.cos(lat*Math.PI/180),lat-p.lat);
    assert.ok(error<2.9,'city too far from real coordinate '+name+': '+error);
  }
  const ports=g.stations.filter(s=>s.portAt);
  assert.equal(ports.length,32,'all coastal ports present');
  assert.equal(new Set(ports.map(s=>E.key(s.portAt))).size,ports.length);
  const ocean=new Set(water[0].map(E.key));
  for(const s of ports){
    assert.equal(E.distance(s,s.portAt,g),1,'port adjacency '+s.name);
    assert.equal(E.tile(g,s.portAt.c,s.portAt.r).terrain,'sea',s.name);
    assert.ok(ocean.has(E.key(s.portAt)),'port with no sea route '+s.name);
    assert.equal(s.portOwner,s.owner,'wrong port ownership '+s.name);
  }
  for(const u of g.units){
    assert.ok(u.hp>0,'dead starting unit');
    const t=E.tile(g,u.c,u.r);
    assert.ok(t,'unit off map');
    if(E.TYPES[u.type].naval)assert.ok(ocean.has(E.key(t)),'stranded naval unit '+u.id);
    else{
      assert.notEqual(t.terrain,'sea','land unit in water '+u.id);
      assert.equal(t.owner,u.side,'incorrect ground deployment '+u.id);
    }
  }
  return {hexes:N,...counts,visualCoastDifferences:visualDifferences.length,
    visualCoastSamples:visualDifferences.slice(0,20),landComponents:land.map(x=>x.length),
    seaComponents:water.map(x=>x.length),cities:g.stations.length,
    ports:ports.length,units:g.units.length,
    armies:g.units.filter(u=>!E.TYPES[u.type].naval).length,
    navy:g.units.filter(u=>E.TYPES[u.type].naval).length};
}
for(const side of scenario.sides){
  const result=audit(scenario.create(side,'normal',67));
  console.log('AUSTRALIA_AUDIT '+JSON.stringify({player:side,...result}));
}

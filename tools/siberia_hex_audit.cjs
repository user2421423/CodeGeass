#!/usr/bin/env node
'use strict';
// Exhaustive Siberia coastline/province/port audit: all 14,080 tactical hexes.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const geo=require('../dist/siberia-landmask.js');
const S=require('../dist/scenarios-siberia.js');
const raw=Buffer.from(geo.bits,'base64'),mix=Buffer.from(geo.mixed,'base64');
const n=S.cols*S.rows;
assert.equal(n,14080);
assert.equal(raw.length,n/8);
assert.equal(mix.length,n/8);
const bit=(buf,i)=>!!(buf[i>>3]&(128>>(i&7)));
const issues=[],counts={land:0,sea:0,coast:0,mixed:0,forest:0,mountain:0,tundra:0};
for(const side of S.sides){
  const g=S.create(side,'normal',147);
  assert.equal(g.stations.length,49);
  assert.deepEqual(g.startUnits,side==='britannia'?S.sides.reduce((o,s)=>(o[s]=g.units.filter(u=>u.side===s).length,o),{}):g.startUnits);
  for(let i=0;i<n;i++){
    const t=g.tiles[i],c=i%S.cols,r=Math.floor(i/S.cols);
    if(!t||t.c!==c||t.r!==r){issues.push('index '+i);continue;}
    const land=bit(raw,i),coastal=bit(mix,i);
    if((t.terrain!=='sea')!==land)issues.push('landmask '+c+','+r);
    if(coastal&&(!land||t.terrain!=='coast'))issues.push('20–80% mixed coast '+c+','+r);
    if(land){
      counts.land++;
      if(!S.sides.includes(t.owner)||!Number.isInteger(t.provinceCity)
         ||!g.stations[t.provinceCity])issues.push('province '+c+','+r);
      if(!['coast','plains','forest','mountain'].includes(t.terrain))
        issues.push('terrain '+t.terrain+' '+c+','+r);
      if(t.terrain==='coast')counts.coast++;
      if(t.terrain==='forest')counts.forest++;
      if(t.terrain==='mountain')counts.mountain++;
      if(t.biome==='tundra')counts.tundra++;
    }else{
      counts.sea++;
      if(t.owner!=null||t.provinceCity!=null)issues.push('sea owner '+c+','+r);
    }
    if(coastal)counts.mixed++;
  }
  const occupied=new Set();
  for(const city of g.stations){
    const key=E.key(city),tile=E.tile(g,city.c,city.r);
    if(occupied.has(key)||tile?.terrain==='sea')issues.push('city placement '+city.name);
    occupied.add(key);
    if(city.portAt){
      const port=E.tile(g,city.portAt.c,city.portAt.r);
      if(!port||port.terrain!=='sea'||E.distance(city,port,g)!==1)
        issues.push('port sea adjacency '+city.name);
      if(city.portOwner!==city.owner)issues.push('port initial owner '+city.name);
      if(occupied.has(E.key(port)))issues.push('port overlap '+city.name);
      occupied.add(E.key(port));
    }
  }
  assert.equal(g.stations.filter(s=>s.portAt).length,9);
  for(const u of g.units){
    const at=E.tile(g,u.c,u.r);
    if(!at||u.hp<=0||((E.TYPES[u.type]?.naval==='ship')&&(at.terrain!=='sea')))
      issues.push('invalid starting unit '+u.id);
  }
  assert.equal(S.winner(g),null,'scenario cannot end on turn 1');
}
assert.equal(counts.mixed/2,556);
assert.deepEqual(issues.slice(0,30),[],issues.length+' issues');
console.log(JSON.stringify({result:'PASS',hexes:n,perSideCounts:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,v/2])),ports:9,cities:49}));

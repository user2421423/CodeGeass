#!/usr/bin/env node
'use strict';
// Exhaustive Arabian Peninsula landmask, province, port and deployment audit.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const M=require('../dist/scenarios-area18.js');
const bytes=Buffer.from(require('../dist/area18-landmask.js'),'base64');
const COLS=M.cols,ROWS=M.rows,SIZE=COLS*ROWS,b=M.bounds;
assert.equal(bytes.length,Math.ceil(SIZE/8),'packed coastline size');
assert.deepEqual(b,{west:34,east:61.5,north:31.5,south:11.3});
const mask=i=>!!(bytes[i>>3]&(128>>(i&7)));
function geo(lon,lat) {
 const r=Math.max(0,Math.min(ROWS-1,Math.round((b.north-lat)*ROWS/(b.north-b.south)-.5)));
 return {r,c:Math.max(0,Math.min(COLS-1,Math.round((lon-b.west)*COLS/(b.east-b.west)-.5-.5*(r&1))))};
}
for(const [name,lon,lat,land] of [
 ['Riyadh',46.68,24.71,true],['Sanaa',44.21,15.37,true],
 ['Dammam',50.1,26.43,true],['Muscat',58.41,23.59,true],
 ['Red Sea',39,20,false],['Gulf of Aden',48,12.1,false],
 ['Persian Gulf',52.5,27,false],['Strait of Hormuz',56.4,26.3,false],
 ['Arabian Sea',59.5,17,false],['East Africa',39,16,false],
 ['Iran mainland',57,29,false]
]) {
 const at=geo(lon,lat);
 assert.equal(mask(at.r*COLS+at.c),land,'landmark mismatch '+name);
}
for(const player of M.sides){
 const g=M.create(player,'normal',193),owners={};
 assert.equal(g.scenario.version,2);
 assert.equal(g.tiles.length,SIZE);
 assert.equal(g.stations.length,43);
 assert.equal(g.stations.length,M.cityData.length);
 assert.equal(new Set(g.units.map(E.key)).size,g.units.length,'overlapping units');
 assert.equal(new Set(g.stations.map(E.key)).size,g.stations.length,'overlapping cities');
 assert.ok(g.units.length>130,'expected large multi-front armies');
 for(const side of M.sides) {
  const cities=g.stations.filter(s=>s.owner===side);
  assert.ok(cities.length>=12,'insufficient '+side+' territories');
  assert.ok(g.units.some(u=>u.side===side),'no starting army for '+side);
 }
 assert.equal(g.stations.find(s=>s.name==="Sana'a").owner,'britannia');
 assert.equal(g.stations.find(s=>s.name==='Riyadh').owner,'eu');
 assert.equal(g.stations.find(s=>s.name==='Dammam').owner,'cf');
 let land=0,coastal=0;
 for(let i=0;i<SIZE;i++){
  const t=g.tiles[i],dry=mask(i);
  assert.equal(t.c,i%COLS);assert.equal(t.r,Math.floor(i/COLS));
  assert.equal(t.terrain!=='sea',dry,'landmask mismatch '+E.key(t));
  if(!dry){assert.equal(t.owner,null);continue;}
  land++;
  const shore=E.adjacent(g,t).some(n=>n.terrain==='sea');
  assert.equal(t.terrain==='coast',shore,'coast mismatch '+E.key(t));
  if(shore)coastal++;
  assert.ok(M.sides.includes(t.owner),'unowned peninsula '+E.key(t));
  assert.equal(g.stations[t.provinceCity]?.owner,t.owner,'province mismatch '+E.key(t));
  owners[t.owner]=(owners[t.owner]||0)+1;
 }
 assert.ok(land>2800&&coastal>180,'peninsula coastline incomplete');
 const connected=new Int32Array(SIZE).fill(-1),waterSizes=[];
 for(const t of g.tiles){
  const i=t.r*COLS+t.c;
  if(t.terrain!=='sea'||connected[i]>=0)continue;
  const id=waterSizes.length,q=[t];connected[i]=id;
  for(let j=0;j<q.length;j++)for(const n of E.adjacent(g,q[j])){
   const k=n.r*COLS+n.c;if(n.terrain==='sea'&&connected[k]<0){connected[k]=id;q.push(n);}
  }
  waterSizes.push(q.length);
 }
 const ports=g.stations.filter(s=>s.portAt);
 assert.ok(ports.length>=17,'insufficient accessible ports');
 const primary=connected[ports[0].portAt.r*COLS+ports[0].portAt.c];
 for(const s of g.stations) {
  assert.notEqual(E.tile(g,s.c,s.r)?.terrain,'sea','city placed at sea: '+s.name);
  assert.equal(E.tile(g,s.c,s.r).owner,s.owner,'city territory mismatch '+s.name);
 }
 for(const s of ports){
  const at=E.tile(g,s.portAt.c,s.portAt.r);
  assert.equal(at.terrain,'sea','port at land '+s.name);
  assert.equal(E.distance(s,at,g),1,'stranded port '+s.name);
  assert.equal(connected[at.r*COLS+at.c],primary,'disconnected port '+s.name);
 }
 for(const u of g.units){
  const t=E.tile(g,u.c,u.r),naval=!!E.TYPES[u.type].naval;
  assert.ok(t,'unit outside map '+u.id);
  assert.equal(t.terrain==='sea',naval,'wrong terrain '+u.id);
  if(naval)assert.equal(connected[t.r*COLS+t.c],primary,'fleet disconnected '+u.id);
  else assert.equal(t.owner,u.side,'unit starts in hostile province '+u.id);
 }
 for(const [name,lon,lat] of M.cityData){
  const s=g.stations.find(x=>x.name===name);
  assert.ok(s,'missing '+name);
  assert.ok(E.distance(s,geo(lon,lat),g)<=3,'city shifted too far '+name);
 }
 console.log('AREA18_HEX_AUDIT '+JSON.stringify({player,hexes:SIZE,land,
  sea:SIZE-land,coastal,cities:g.stations.length,ports:ports.length,
  units:g.units.length,waterComponents:waterSizes,owners}));
}

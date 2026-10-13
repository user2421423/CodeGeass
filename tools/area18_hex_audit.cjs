#!/usr/bin/env node
'use strict';
// Exhaustive 120x88 Area 18 hex, port, coastline and deployment audit.
// The 1:1 geographic-to-canvas projection is tested in tests/area18.test.cjs.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const M=require('../dist/scenarios-area18.js');
const packed=require('../dist/area18-landmask.js');
const COLS=M.cols,ROWS=M.rows,SIZE=COLS*ROWS,b=M.bounds;
const bytes=Buffer.from(packed,'base64');
assert.equal(bytes.length,Math.ceil(SIZE/8),'packed coastline size');
const mask=i=>!!(bytes[i>>3]&(128>>(i&7)));
function geo(lon,lat){
 const r=Math.max(0,Math.min(ROWS-1,Math.round((b.north-lat)*ROWS/(b.north-b.south)-.5)));
 return {r,c:Math.max(0,Math.min(COLS-1,Math.round((lon-b.west)*COLS/(b.east-b.west)-.5-.5*(r&1))))};
}
for(const [name,lon,lat,land] of [
 ['Riyadh',46.68,24.71,true],['Baghdad',44.37,33.32,true],
 ['Tehran',51.43,35.69,true],['Damascus',36.29,33.51,true],
 ['Cairo',31.24,30.04,true],['Muscat',58.41,23.59,true],
 ['Red Sea',39,20,false],['Mediterranean',33.5,34,false],
 ['Persian Gulf',52.5,27,false],['Strait of Hormuz',56.4,26.3,false],
 ['Arabian Sea',60,19.5,false],['Suez Canal',32.45,30.5,false]
]){
 const at=geo(lon,lat);
 assert.equal(mask(at.r*COLS+at.c),land,'wrong '+name+' coastline at '+E.key(at));
}
for(const side of M.sides){
 const g=M.create(side,'normal',193),terrain={},provinces={};
 assert.equal(g.tiles.length,SIZE);
 assert.equal(g.stations.length,50);
 assert.equal(g.units.length,191);
 assert.equal(new Set(g.units.map(E.key)).size,g.units.length,'overlapping units');
 assert.equal(new Set(g.stations.map(E.key)).size,g.stations.length,'overlapping cities');
 let coastal=0,land=0;
 for(let i=0;i<SIZE;i++){
  const t=g.tiles[i],dry=mask(i);
  assert.equal(t.c,i%COLS);
  assert.equal(t.r,Math.floor(i/COLS));
  assert.equal(t.terrain!=='sea',dry,'mask mismatch '+E.key(t));
  if(dry){
   land++;
   const nextToSea=E.adjacent(g,t).some(n=>n.terrain==='sea');
   assert.equal(t.terrain==='coast',nextToSea,'coast mismatch '+E.key(t));
   if(nextToSea)coastal++;
   assert.ok(M.sides.includes(t.owner),'unowned land '+E.key(t));
   assert.ok(Number.isInteger(t.provinceCity),'missing province '+E.key(t));
   assert.equal(g.stations[t.provinceCity]?.owner,t.owner,'province owner '+E.key(t));
   provinces[t.owner]=(provinces[t.owner]||0)+1;
  }else{
   assert.equal(t.owner,null,'owned sea '+E.key(t));
   assert.equal(t.provinceCity,undefined,'sea province '+E.key(t));
  }
  terrain[t.terrain]=(terrain[t.terrain]||0)+1;
 }
 assert.equal(land,7590);
 assert.equal(terrain.sea,2970);
 assert.equal(coastal,523);
 const connected=new Int32Array(SIZE).fill(-1),seaSizes=[];
 for(const t of g.tiles){
  const id=t.r*COLS+t.c;
  if(t.terrain!=='sea'||connected[id]>=0)continue;
  const region=seaSizes.length,queue=[t];connected[id]=region;
  for(let i=0;i<queue.length;i++)for(const n of E.adjacent(g,queue[i])){
   const k=n.r*COLS+n.c;
   if(n.terrain==='sea'&&connected[k]<0){
    connected[k]=region;queue.push(n);
   }
  }
  seaSizes.push(queue.length);
 }
 const ports=g.stations.filter(s=>s.portAt);
 assert.equal(ports.length,17);
 const mainSea=connected[ports[0].portAt.r*COLS+ports[0].portAt.c];
 assert.ok(mainSea>=0,'first port is not afloat');
 for(const s of g.stations){
  const t=E.tile(g,s.c,s.r);
  assert.ok(t&&t.terrain!=='sea','city at sea '+s.name);
  assert.equal(t.owner,s.owner,'station/province mismatch '+s.name);
 }
 for(const s of ports){
  const t=E.tile(g,s.portAt.c,s.portAt.r);
  assert.ok(t&&t.terrain==='sea','port not on water '+s.name);
  assert.equal(E.distance(s,t,g),1,'inaccessible port '+s.name);
  assert.equal(connected[t.r*COLS+t.c],mainSea,'stranded port '+s.name);
 }
 for(const u of g.units){
  const t=E.tile(g,u.c,u.r);
  assert.ok(t,'unit off map '+u.id);
  const naval=!!E.TYPES[u.type].naval;
  assert.equal(t.terrain==='sea',naval,'unit on wrong terrain '+u.id);
  if(naval)assert.equal(connected[t.r*COLS+t.c],mainSea,'naval unit isolated '+u.id);
  else assert.equal(t.owner,u.side,'unit in enemy territory '+u.id);
 }
 // City coordinates lie on real-world anchors. Coastal cities may move 1-2
 // hexes inland when the exact longitude/latitude samples to water.
 for(const [name,lon,lat] of M.cityData){
  const s=g.stations.find(v=>v.name===name);
  assert.ok(s,'missing city '+name);
  assert.ok(E.distance(s,geo(lon,lat),g)<=2,'misplaced city '+name);
 }
 console.log('AREA18_HEX_AUDIT '+JSON.stringify({side,hexes:SIZE,land,
  sea:terrain.sea,coastal,cities:g.stations.length,ports:ports.length,
  units:g.units.length,waterComponents:seaSizes.sort((a,b)=>b-a),
  terrain,provinces}));
}

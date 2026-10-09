/* Identify isolated sea components before deciding inland lake policy.
 * Diagnostic only: does not change the 180x76 map. */
'use strict';
const E=require('../dist/engine.js');
const g=E.createGame('britannia','normal','conquest',123);
const seen=new Set(), groups=[];
for(const t of g.tiles) {
 if(t.terrain!=='sea'||seen.has(t.r*180+t.c))continue;
 const q=[t];seen.add(t.r*180+t.c);
 for(let i=0;i<q.length;i++)for(const x of E.adjacent(g,q[i])){
  const key=x.r*180+x.c;
  if(x.terrain==='sea'&&!seen.has(key)){seen.add(key);q.push(x)}
 }
 groups.push(q);
}
groups.sort((a,b)=>b.length-a.length);
for(let i=0;i<groups.length;i++){
 const a=groups[i],lon=xs=>((xs.c + .5*(xs.r&1))*2-180).toFixed(0);
 console.log('SEA COMPONENT',i,'size',a.length,'rows',Math.min(...a.map(x=>x.r)),Math.max(...a.map(x=>x.r)), 'columns',Math.min(...a.map(x=>x.c)),Math.max(...a.map(x=>x.c)));
 if(a.length<100)console.log('HEXES',JSON.stringify(a.map(x=>[x.c,x.r])));
}
const japan=g.tiles.filter(t=>t.c>=149&&t.c<=163&&t.r>=15&&t.r<=30);
const cities=g.stations.filter(s=>/Tokyo|Kyoto|Sapporo|Fukuoka|Nagoya|Osaka|Hiroshima|Kobe/.test(s.name));
console.log('JAPAN LAND TILES',JSON.stringify(japan.filter(x=>x.terrain!=='sea').map(t=>[t.c,t.r,t.terrain])));
console.log('JAPAN CITIES',JSON.stringify(cities.map(s=>[s.name,s.c,s.r])));

const assert=require('node:assert/strict');
assert.equal(groups.length,1, 'Only the connected world ocean remains navigable');
assert(groups[0].length>9000, 'The world ocean remains continuous');
assert.equal(E.tile(g,160,19).terrain,'sea','Tsugaru remains navigable');

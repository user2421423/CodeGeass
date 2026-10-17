#!/usr/bin/env node
'use strict';
// Exhaustive 16,128-hex audit, including every coast boundary, station, harbour,
// surface component and overseas invasion/counter-invasion supply route.
const assert=require('node:assert/strict'),E=require('../dist/engine.js');
require('../dist/scenarios.js');
const scenario=require('../dist/scenarios-philippines.js');
const bits=Buffer.from(require('../dist/philippines-landmask.js'),'base64');
const W=144,H=112,N=W*H;
const shore=new Uint8Array(N);
let shorePos=0,shoreBit=0;
for(const run of scenario.shoreRLE.split('.')){
 const length=parseInt(run,36);
 if(shoreBit)shore.fill(1,shorePos,shorePos+length);
 shorePos+=length;shoreBit^=1;
}
assert.equal(shorePos,N,'precise Philippines shoreline coverage');
assert.equal(bits.length,N/8);
const g=scenario.create('britannia','normal',227);
// Check that the visual map's lon/lat projection aligns exactly with the
// tactical hex centres at every corner, rather than drifting offshore.
const p=g.scenario.projection,b=g.scenario.bounds,k=Math.cos(p.centerLat*Math.PI/180);
const dx=(b.east-b.west)/W,dy=(b.north-b.south)/H;
for(const [c,r] of [[0,0],[W-1,0],[0,H-1],[W-1,H-1],[72,56]]) {
 const lon=b.west+(c+.5*(r&1)+.5)*dx,lat=b.north-(r+.5)*dy;
 const u=(lon-p.centerLon)*k,v=lat-p.centerLat;
 const x=(u-p.uMin)*(W-1)/(p.uMax-p.uMin);
 const y=(p.vMax-v)*(H-1)/(p.vMax-p.vMin);
 assert.ok(Math.abs(x-(c+.5*(r&1)))<1e-8,'atlas longitude drift '+c+','+r);
 assert.ok(Math.abs(y-r)<1e-8,'atlas latitude drift '+c+','+r);
}
const land=i=>!!(bits[i>>3]&(128>>(i&7)));
const seen=new Uint8Array(N),components=new Int16Array(N).fill(-1);
function regions(sea){
 const sizes=[],locations=[];
 seen.fill(0);
 for(let i=0;i<N;i++){
  if(seen[i]||(g.tiles[i].terrain==='sea')!==sea)continue;
  const q=[i],idx=sizes.length;seen[i]=1;
  for(let j=0;j<q.length;j++)for(const t of E.adjacent(g,g.tiles[q[j]])){
   const next=t.r*W+t.c;
   if(seen[next]||(t.terrain==='sea')!==sea)continue;
   seen[next]=1;q.push(next);
  }
  for(const id of q)if(!sea)components[id]=idx;
  sizes.push(q.length);locations.push(q);
 }
 return {sizes,locations};
}
let landCount=0,coasts=0;
for(let i=0;i<N;i++){
 const t=g.tiles[i];
 assert.equal(t.r,Math.floor(i/W));
 assert.equal(t.c,i%W);
 assert.equal(t.terrain!=='sea',land(i),'mask mismatch '+t.c+','+t.r);
 if(land(i)){
  landCount++;
  assert.ok(scenario.sides.includes(t.owner),'unowned land '+E.key(t));
  assert.ok(Number.isInteger(t.provinceCity)&&g.stations[t.provinceCity]);
  const isCoast=Boolean(shore[i])&&E.adjacent(g,t).some(p=>p.terrain==='sea');
  if(isCoast)assert.equal(t.terrain,'coast','missed geographic mixed shoreline '+E.key(t));
  if(t.terrain==='coast')assert.ok(E.adjacent(g,t).some(n=>n.terrain==='sea'),
    'coast hex not adjacent to navigable water '+E.key(t));
  coasts+=t.terrain==='coast'?1:0;
 }else {
  assert.equal(t.owner,null);assert.ok(t.provinceCity==null);
 }
}
assert.equal(landCount,1140);assert.equal(N-landCount,14988);
for(const [c,r] of [[7,101],[8,102],[10,100]])assert.equal(land(r*W+c),false,'Borneo must not enter the Philippine theatre');
const seaRegions=regions(true);assert.equal(seaRegions.sizes.length,1,'all staging/landing seas must connect');
assert.equal(seaRegions.sizes[0],14988);
const dry=regions(false);
// Isolated bases and small islands must retain a landing coast even if the
// geographical coverage sampler missed their sub-hex shorelines.
for(const region of dry.locations)assert.ok(region.some(i=>g.tiles[i].terrain==='coast'),
 'one island cannot be invaded by sea');
const byName=Object.fromEntries(g.stations.map(s=>[s.name,s]));
function separate(a,b){
 const x=byName[a],y=byName[b];
 assert.ok(x&&y);
 assert.notEqual(components[x.r*W+x.c],components[y.r*W+y.c],a+'/'+b+' must be separated by sea');
}
for(const [a,b] of [['Dumaguete','Cebu'],['Manila','Calapan'],['Iloilo','Bacolod'],['Bacolod','Cebu'],
 ['Calbayog','Tacloban'],['Cebu','Cagayan de Oro'],
 ['Koror','Peleliu'],['Koror','Colonia'],['Puerto Princesa','Manila']])separate(a,b);
assert.equal(components[byName.Bacolod.r*W+byName.Bacolod.c],components[byName.Dumaguete.r*W+byName.Dumaguete.c],'Bacolod and Dumaguete must share Negros');
assert.equal(g.stations.length,37);
for(const [name,lon,lat] of scenario.cityData){
 const s=byName[name];
 assert.ok(s,'missing '+name);
 const row=Math.max(0,Math.min(H-1,Math.round((21.2-lat)/16.7*H-.5)));
 const col=Math.max(0,Math.min(W-1,Math.round((lon-115.5)/23.6*W-.5-.5*(row&1))));
 assert.ok(E.distance(s,{c:col,r:row},g)<=6,'city outside actual vicinity '+name);
 assert.ok(land(s.r*W+s.c),'station at sea '+name);
}
const ports=g.stations.filter(s=>s.portAt);
assert.equal(ports.length,31);
assert.equal(new Set(ports.map(s=>E.key(s.portAt))).size,31);
const navigable=new Set(seaRegions.locations[0].map(i=>E.key(g.tiles[i])));
for(const s of ports){
 assert.equal(E.distance(s,s.portAt,g),1,'non-adjacent port '+s.name);
 assert.ok(navigable.has(E.key(s.portAt)),'inaccessible port '+s.name);
 assert.equal(s.owner,s.portOwner);
}
for(const u of g.units.filter(u=>E.TYPES[u.type].naval))
 assert.ok(navigable.has(E.key(u)),'trapped ship or amphibious formation '+u.id);
assert.deepEqual(g.stations.filter(s=>s.owner==='britannia').map(s=>s.name).sort(),
 ['Colonia','Koror','Peleliu']);
console.log('PHILIPPINES_HEX_AUDIT '+JSON.stringify({hexes:N,land:landCount,
 sea:N-landCount,coast:coasts,landComponents:dry.sizes.length,
 largestLandComponents:dry.sizes.slice().sort((a,b)=>b-a).slice(0,12),
 waterComponents:seaRegions.sizes.length,cities:g.stations.length,
 chineseCities:34,britannianCities:3,ports:ports.length,units:g.units.length,
 britishNaval:g.units.filter(u=>u.side==='britannia'&&E.TYPES[u.type].naval).length,
 chineseNaval:g.units.filter(u=>u.side==='cf'&&E.TYPES[u.type].naval).length}));

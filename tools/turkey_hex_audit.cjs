#!/usr/bin/env node
'use strict';
/* Exhaustive 12,480-cell geography and deployment audit. */
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/turkey-landmask.js');
const mod=require('../dist/scenarios-turkey.js');
const bits=require('../dist/turkey-landmask.js');
const raw=Buffer.from(bits,'base64');
assert.equal(raw.length,1872);
const g=mod.create('britannia','normal',77),counts={};
for(const [i,t] of g.tiles.entries()){
 const rawLand=!!(raw[i>>3]&(128>>(i&7)));
 assert.equal(t.terrain!=='sea',rawLand,'wrong GSHHS landmask for hex '+t.c+','+t.r);
 if(rawLand){assert.ok(t.owner==='eu'||t.owner==='britannia','unowned land');
   assert.ok(Number.isInteger(t.provinceCity),'missing province');
 }else assert.equal(t.owner,null,'sea ownership');
 if(t.terrain==='coast')assert.ok(E.adjacent(g,t).some(n=>n.terrain==='sea'),'orphan coast '+i);
 counts[t.terrain]=(counts[t.terrain]||0)+1;
}
let snapped=0,ports=0;
for(const [name,lon,lat,side] of mod.cityData){
 const s=g.stations.find(s=>s.name===name);
 assert.ok(s,name);assert.equal(s.owner,side,name);
 const p={r:Math.max(0,Math.min(g.rows-1,Math.round((mod.bounds.north-lat)*g.rows/(mod.bounds.north-mod.bounds.south)-.5)))};
 p.c=Math.max(0,Math.min(g.cols-1,Math.round((lon-mod.bounds.west)*g.cols/(mod.bounds.east-mod.bounds.west)-.5-.5*(p.r&1))));
 const d=E.distance(s,p,g);
 assert.ok(d<=9,name+' displaced '+d+' hexes from true location');
 snapped=Math.max(snapped,d);
 if(s.portAt){
   assert.equal(E.distance(s,s.portAt,g),1,'port '+name);
   assert.equal(E.tile(g,s.portAt.c,s.portAt.r).terrain,'sea','port terrain '+name);
   ports++;
 }
}
for(const u of g.units){
 const tile=E.tile(g,u.c,u.r);
 assert.ok(tile,'offmap unit '+u.id);
 assert.equal(tile.terrain==='sea',!!E.TYPES[u.type].naval,'wrong deployment '+u.id);
 assert.equal(u.side==='eu'||u.side==='britannia',true);
}
console.log('TURKEY_HEX_AUDIT '+JSON.stringify({dimensions:[g.cols,g.rows],cities:g.stations.length,ports,units:g.units.length,terrain:counts,furthestCitySnap:snapped,waterways:Object.keys(g.scenario.rivers)}));

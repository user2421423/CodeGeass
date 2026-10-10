'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const W = require('../dist/engine/world.js');
const removed = ["Vancouver","Dallas","Montevideo","Lisbon","Prague","Budapest","Sofia","Riga","Tunis","Maputo","Accra","Nanjing","Mandalay","Jerusalem","Muscat"];
const added = ["Calgary","Kansas City","Atlanta","Monterrey","Guatemala City","Saskatoon","Belém","Cuiabá","La Paz","Iquitos","Asunción","Punta Arenas","Puerto Montt","Salvador","Christchurch","Samara","Omsk","Krasnoyarsk","N'Djamena","Niamey","Kano","Kisangani","Bangui","Lusaka","Windhoek","Lahore","Hyderabad","Mashhad","Lanzhou","Pontianak","Makassar","Jayapura","Jeddah","Dubai"];
test('World city redistribution has 168 unique cities with expected faction distribution', () => {
 const g = E.createGame('britannia','normal','conquest',7);
 const names = g.stations.map(s=>s.name);
 assert.equal(names.length,168); assert.equal(new Set(names).size,168);
 for (const name of removed) assert(!names.includes(name), 'removed: '+name);
 for (const name of added) assert(names.includes(name), 'missing: '+name);
 for (const [owner,n] of Object.entries({britannia:51,eu:58,cf:47,neutral:12}))
   assert.equal(g.stations.filter(s=>s.owner===owner).length,n,owner);
});
test('City placements and all original starting ports remain anchored', () => {
 const g = E.createGame('britannia','normal','conquest',9);
 assert.equal(Object.keys(W.COASTAL_CITY_HEXES).length,168);
 const occupied = new Set();
 for (const s of g.stations) {
   const id=s.c+','+s.r;
   assert(!occupied.has(id), 'overlapping cities: '+id);
   occupied.add(id);
   assert.deepEqual([s.c,s.r], W.COASTAL_CITY_HEXES[s.name],s.name);
   assert(!['sea','coast','peak'].includes(E.tile(g,s.c,s.r).terrain),s.name+' on coast or sea');
 }
 for (const [name,at] of Object.entries(W.COASTAL_PORT_HEXES)) {
   const s=g.stations.find(s=>s.name===name);
   assert(s && s.portLevel>0,name+' missing port');
   assert.deepEqual([s.portAt.c,s.portAt.r],at,name+' port relocated');
 }
});
test('New regional cities own provinces, including the Christchurch South Island', () => {
 const g=E.createGame('cf','normal','conquest',7);
 const sizes=new Map(g.stations.map(s=>[s.id,0]));
 for(const t of g.tiles) if(t.provinceCity!=null && sizes.has(t.provinceCity))
   sizes.set(t.provinceCity,sizes.get(t.provinceCity)+1);
 for(const name of ['Calgary','Saskatoon','Belém','La Paz',"N'Djamena",'Kisangani','Lusaka','Krasnoyarsk','Pontianak','Makassar']) {
   const s=g.stations.find(s=>s.name===name);
   assert(sizes.get(s.id)>=10,name+' province is too small');
 }
 const nz=g.stations.find(s=>s.name==='Christchurch');
 assert.equal(E.tile(g,nz.c,nz.r).provinceCity,nz.id);
});
test('Neutral replacement cities have initial garrisons', () => {
 const g=E.createGame('britannia','normal','conquest',7);
 for(const name of ['Jeddah','Dubai']) {
   const s=g.stations.find(s=>s.name===name);
   assert(s && s.owner==='neutral');
   assert(g.units.some(u=>u.side==='neutral'&&u.c===s.c&&u.r===s.r),name+' unguarded');
 }
});

#!/usr/bin/env node
'use strict';
// Focused, exhaustive hex geometry and deployment audit. This is not a regression suite.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const E=require('../dist/engine.js');
const S=require('../dist/scenarios-east-coast.js');
const N=S.cols*S.rows;
const source=fs.readFileSync(require.resolve('../dist/scenarios-east-coast.js'),'utf8');
const encoded=source.match(/const COVERAGE_RLE='([^']+)'/)[1];
const data=Buffer.from(encoded,'base64');
const coverage=new Uint8Array(N);let offset=0;
for(const b of data){const n=(b&63)+1,c=b>>6;assert.ok(c<3,'invalid coast class');assert.ok(offset+n<=N);coverage.fill(c,offset,offset+n);offset+=n;}
assert.equal(offset,N,'full geographic hex coverage');
const tallies={sea:0,coast:0,land:0,ports:0,armies:0,carriers:0,embarked:0,ships:0};
for(const side of S.sides)for(const difficulty of ['normal','hard','challenge','elite']){
 const g=S.create(side,difficulty,71);
 assert.equal(g.mode,'scenario');assert.equal(g.scenario.id,S.id);
 assert.equal(g.stations.length,S.cityData.length);assert.equal(g.stations.length,62);
 assert.equal(g.stations.filter(s=>s.owner==='eu').length,0,'E.U. must own no cities');
 assert.equal(g.stations.filter(s=>s.owner==='britannia').length,62);
 assert.equal(S.winner(g),null,'invasion must not finish at launch');
 assert.equal(g.tiles.length,N);
 const ports=new Set(),stations=new Set();
 const validTerrain=new Set(['offmap','sea','coast','plains','forest','mountain']);
 for(let i=0;i<N;i++){
   const t=g.tiles[i];assert.equal(t.c,i%S.cols);assert.equal(t.r,(i/S.cols)|0);
   assert.ok(validTerrain.has(t.terrain),'unknown terrain '+t.terrain);
   const cls=coverage[i];
   if(cls===0)assert.ok(t.terrain==='sea'||t.terrain==='offmap','ocean hex impassable '+E.key(t));
   if(cls===1)assert.equal(t.terrain,'coast','mixed coastal land must be coast '+E.key(t));
   if(cls===2)assert.ok(['plains','forest','mountain'].includes(t.terrain),'dry land '+E.key(t));
   if(t.terrain!=='sea'&&t.terrain!=='offmap'){
      assert.equal(t.owner,'britannia','all starting land Britannian');
      assert.ok(Number.isInteger(t.provinceCity),'missing province '+E.key(t));
   }else{assert.equal(t.owner,null);assert.ok(t.provinceCity==null);}
   if(side==='eu'&&difficulty==='normal')tallies[cls===0?'sea':cls===1?'coast':'land']++;
 }
 for(const s of g.stations){
   assert.ok(!stations.has(E.key(s)),'overlapping cities '+s.name);stations.add(E.key(s));
   assert.notEqual(E.tile(g,s.c,s.r).terrain,'sea','city in water '+s.name);
   if(s.portAt){
     const at=E.tile(g,s.portAt.c,s.portAt.r);
     assert.equal(E.distance(s,at,g),1,'port not adjacent '+s.name);
     assert.equal(at.terrain,'sea','port is not on navigable sea '+s.name);
     assert.ok(!ports.has(E.key(at)),'overlapping port '+s.name);ports.add(E.key(at));
     assert.equal(s.portOwner,'britannia','initial port owner '+s.name);
   }
 }
 assert.equal(ports.size,32,'all independent naval ports');
 const all=[...g.units,...g.units.flatMap(u=>u.cargo||[])];
 const eu=all.filter(u=>u.side==='eu');
 const cargo=g.units.flatMap(u=>u.cargo||[]).filter(u=>u.side==='eu');
 assert.equal(cargo.length,84,'84 EU Knightmare troops embarked on carriers');
 assert.equal(g.units.filter(u=>u.side==='eu'&&u.type==='eu_carrier').length,42,'42 EU carrier-battleships');
 assert.equal(g.units.filter(u=>u.side==='eu').length,66,'EU 42 carriers and 24 escorts');
 for(const u of g.units){const t=E.tile(g,u.c,u.r);assert.ok(t);if(E.TYPES[u.type].naval==='ship')assert.equal(t.terrain,'sea','ship on land '+u.id);}
 for(const wave of ['New England','New York','Chesapeake','Carolinas','Georgia','Florida'])
   assert.ok(g.units.some(u=>u.side==='eu'&&u.invasionGroup===wave&&u.cargo.length===2),
     'missing embarked operational front '+wave);
 if(side==='eu'&&difficulty==='normal'){tallies.ports=ports.size;tallies.armies=all.filter(u=>!E.TYPES[u.type].naval).length;tallies.carriers=42;tallies.embarked=cargo.length;tallies.ships=g.units.filter(u=>E.TYPES[u.type].naval==='ship').length;}
 console.log('EAST_COAST_AUDIT '+JSON.stringify({side,difficulty,result:'PASS',hexes:N,cities:g.stations.length,ports:ports.size,EUEmbarked:cargo.length}));
}
console.log('EAST_COAST_HEX_TOTAL '+JSON.stringify({result:'PASS',hexes:N,...tallies}));

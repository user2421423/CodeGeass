#!/usr/bin/env node
'use strict';
// Exhaustive shoreline audit. Supplemented by tests/area18.test.cjs for ports,
// provinces, geographic anchors, passability and 12 faction/difficulty starts.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const M=require('../dist/scenarios-area18.js');
const packed=require('../dist/area18-landmask.js');
const bytes=Buffer.from(packed,'base64');
assert.equal(bytes.length,1320);
for(const side of M.sides){
 const g=M.create(side,'normal',193);
 const counts={};
 for(let i=0;i<g.tiles.length;i++){
  const t=g.tiles[i],land=!!(bytes[i>>3]&(128>>(i&7)));
  assert.equal(t.terrain!=='sea',land,'landmask mismatch hex '+i);
  if(land){assert.ok(M.sides.includes(t.owner));assert.ok(g.stations[t.provinceCity]);}
  counts[t.terrain]=(counts[t.terrain]||0)+1;
 }
 console.log('AREA18_HEX_AUDIT '+JSON.stringify({side,hexes:g.tiles.length,cities:g.stations.length,ports:g.stations.filter(s=>s.portAt).length,counts}));
}

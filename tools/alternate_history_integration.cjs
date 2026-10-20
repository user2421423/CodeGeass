#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/europe-landmask.js');
require('../dist/scenarios-europe.js');
require('../dist/scenarios-pendragon.js');
require('../dist/scenarios-luoyang.js');
require('../dist/scenarios-alternate-common.js');
require('../dist/scenarios-rounds-rebellion.js');
require('../dist/scenarios-shin-independence.js');
require('../dist/scenarios-chinese-civil-war.js');
require('../dist/scenarios-eu-coup.js');
const CASES=[
 ['rounds-rebellion',['rounds','britannia']],
 ['shin-independence',['britannia','shinregime']],
 ['chinese-civil-war',['loyalists','eunuchs']],
 ['eu-military-coup',['junta','eu']]
];
function saveRoundtrip(g,id,side,difficulty){
 const decoded=JSON.parse(JSON.stringify(E.packSave(g)));
 const restored=E.migrateSave(decoded);
 assert(restored,'Save migration rejected '+id+' '+side+' '+difficulty);
 assert.equal(restored.scenario.id,id);
 assert.equal(restored.player,side);
 assert.equal(restored.difficulty,difficulty);
 assert.equal(restored.turn,g.turn);
 assert.equal(restored.tiles.length,g.tiles.length);
 assert.equal(restored.stations.length,g.stations.length);
 assert.equal(restored.units.length,g.units.length);
 assert.deepEqual(restored.order,g.order);
 for(let i=0;i<g.stations.length;i++)assert.equal(restored.stations[i].owner,g.stations[i].owner);
 for(const u of restored.units)assert(E.TYPES[u.type],id+' lost unit type');
 assert.equal(E.scenarios.byId[id].winner(restored),null,'Save loaded into premature victory');
 return restored;
}
for(const [id,sides] of CASES){
 const m=E.scenarios.byId[id];
 for(const difficulty of ['normal','hard','challenge','elite']){
  for(const player of sides){
   const g=m.create(player,difficulty,57);
   assert.deepEqual([...g.order].sort(),[...sides].sort(),id+' side ordering');
   assert(g.units.every(u=>sides.includes(u.side)));
   assert(g.stations.every(s=>sides.includes(s.owner)));
   assert(g.units.every(u=>!u.cmd||E.serves(u.cmd,u.side,g)),id+' commander allegiance violated');
   for(const side of sides){
    const enemy=sides.find(x=>x!==side);
    for(const k of g.scenario.commanderSides[side]){
      assert(E.serves(k,side,g),id+' cannot field designated commander '+k);
      assert(!E.serves(k,enemy,g),id+' commander '+k+' serves both sides');
    }
    assert(g.units.some(u=>u.side===side&&u.hp>0));
    assert(g.stations.some(s=>s.owner===side));
    assert(g.scenario.eliteRosters[side].length>0);
   }
   const loaded=saveRoundtrip(g,id,player,difficulty);
   // A side that loses its last city surrenders; its remaining army need not be hunted down.
   for(const station of loaded.stations)station.owner=player;
   assert.equal(m.winner(loaded)?.winner,player,id+' all-cities victory not recognized');
   console.log('ROUNDTRIP '+id+' '+player+' '+difficulty);
  }
 }
}
for(const legacy of ['eu-pendragon','european-war','battle-luoyang']){
 const m=E.scenarios.byId[legacy],g=m.create(m.sides[0],'normal',57);
 saveRoundtrip(g,legacy,g.player,g.difficulty);
 console.log('LEGACY-SAVE '+legacy);
}
assert.deepEqual(E.MAJORS,['britannia','eu','cf'],'Global Conquest faction list changed');
console.log('PASS alternate-history save compatibility and commander isolation');

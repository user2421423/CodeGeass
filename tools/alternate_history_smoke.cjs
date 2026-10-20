'use strict';
/* End-to-end registration, roster, setup and total-conquest checks.
 * Build first: node tools/build_sources.cjs.
 */
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
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
  ['rounds-rebellion',['rounds','britannia'],70,'eu-pendragon'],
  ['shin-independence',['britannia','shinregime'],44,'european-war'],
  ['chinese-civil-war',['loyalists','eunuchs'],83,'battle-luoyang'],
  ['eu-military-coup',['junta','eu'],44,'european-war']
];
for(const [id,sides,cities,parent] of CASES){
 const m=E.scenarios.byId[id],base=E.scenarios.byId[parent];
 assert(m&&base,'Missing registered scenario '+id);
 assert.deepEqual([...m.sides],sides,id+' has wrong playable powers');
 for(const difficulty of ['normal','hard','challenge','elite']){
   for(const side of sides){
     const g=m.create(side,difficulty,129342);
     assert.equal(g.scenario.id,id);
     assert.equal(g.player,side);
     assert.equal(g.difficulty,difficulty);
     assert.equal(g.stations.length,cities);
     assert.equal(g.teams[sides[0]],sides[0]);
     assert.equal(g.teams[sides[1]],sides[1]);
     assert.equal(g.mode,'scenario');
     assert(g.units.length>0,id+' has no formations');
     assert(g.scenario.groups.length>0,id+' has no army groups');
     assert(g.scenario.commanderSides[side].length>0,id+' missing permitted commanders');
     for(const s of sides){
       assert(g.stations.some(st=>st.owner===s),id+' missing '+s+' cities');
       assert(g.units.some(u=>u.side===s),id+' missing '+s+' troops');
       assert(g.economy[s]&&g.tech[s],id+' missing '+s+' economy');
       assert(E.FACTIONS[s]?.name,id+' missing '+s+' faction name');
     }
     assert(g.stations.every(st=>sides.includes(st.owner)),id+' orphan station');
     assert(E.allUnits(g).every(u=>sides.includes(u.side)&&E.TYPES[u.type]),id+' invalid unit');
     for(const unit of E.allUnits(g))if(unit.cmd)
       assert(g.scenario.commanderSides[unit.side].includes(unit.cmd),id+' commander belongs to wrong faction');
     if(difficulty==='elite')
       assert(g.units.some(u=>u.elite),id+' Elite conversion missing');
     assert.equal(m.winner(g),null,id+' premature victory');
     // Force a fully eliminated opposing army and occupied city map.
     for(const st of g.stations)st.owner=side;
     for(const u of E.allUnits(g))if(u.side!==side)u.hp=0;
     assert.equal(m.winner(g)?.winner,side,id+' total conquest victory not recognized');
   }
 }
 const normal=base.create(base.sides[0],'normal',90210);
 assert.equal(normal.scenario.id,parent,id+' mutated parent scenario');
 console.log('PASS '+id+' · 2 sides × 4 difficulties · normal parent unchanged');
}
console.log('All four alternate-history scenarios passed.');

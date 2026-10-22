#!/usr/bin/env node
'use strict';
/** Audit every registered scenario for every playable side on every difficulty.
 * The geographic audit checks normal-side world geometry against external data.
 * This pass additionally ensures challenge/elite generation and all sides
 * agree on land/sea/coast/offmap and never spawn into blocked or illegal water.
 */
const E=require('../dist/engine.js');
require('./scenario_sim.cjs');
const modes=['normal','hard','challenge','elite'];
const scenarios=Object.entries(E.scenarios.byId).sort(([a],[b])=>a.localeCompare(b));
let variants=0,terrainCells=0;
const failures=[],report=[];
for(const [id,m] of scenarios){
  let baseline=null;
  const errors=[];
  let sidesChecked=0;
  for(const difficulty of modes)for(const player of m.sides){
    const tag=player+'/'+difficulty;
    let g;
    try{g=m.create(player,difficulty,20261022);}
    catch(e){errors.push(tag+' create exception: '+String(e.stack||e).slice(0,420));continue;}
    variants++;sidesChecked++;
    if(g.tiles.length!==g.cols*g.rows){errors.push(tag+' malformed tile count');continue;}
    if(!baseline){baseline=g.tiles.map(t=>t?.terrain);}
    let delta=0,unknown=0,invalidPorts=0,blockedUnits=0,shipsOnLand=0;
    for(let i=0;i<g.tiles.length;i++){
      const t=g.tiles[i];
      if(t?.terrain!==baseline[i])delta++;
      if(!E.TERRAIN[t?.terrain])unknown++;
    }
    if(delta)errors.push(tag+' terrain differs at '+delta+' cells');
    if(unknown)errors.push(tag+' unsupported terrain on '+unknown+' cells');
    for(const s of g.stations){
      const t=E.tile(g,s.c,s.r);
      if(!t||t.terrain==='offmap'||t.terrain==='sea'||E.TERRAIN[t.terrain]?.blocked)
        errors.push(tag+' invalid station '+s.name);
      if(s.portAt){
        const p=E.tile(g,s.portAt.c,s.portAt.r);
        if(!p||!['sea','coast'].includes(p.terrain))invalidPorts++;
      }
    }
    if(invalidPorts)errors.push(tag+' ports not on water: '+invalidPorts);
    for(const u of g.units){
      const t=E.tile(g,u.c,u.r),type=E.TYPES[u.type];
      if(!t||t.terrain==='offmap'||t.terrain==='peak'&&!type?.air)blockedUnits++;
      if(t&&type?.naval==='ship'&&!type?.air&&!['sea','coast'].includes(t.terrain))
        shipsOnLand++;
    }
    if(blockedUnits)errors.push(tag+' units on blocked terrain: '+blockedUnits);
    if(shipsOnLand)errors.push(tag+' sea ships on land: '+shipsOnLand);
    terrainCells+=g.tiles.length;
  }
  const row={id,variants:sidesChecked,hexes:baseline?.length||0,errors};
  report.push(row);
  console.log('SCENARIO_VARIANTS '+JSON.stringify(row));
  if(errors.length)failures.push(row);
}
const summary={scenarios:report.length,expectedVariants:scenarios.reduce((x,[,m])=>x+4*m.sides.length,0),variants,terrainCells,failed:failures.length,failures};
console.log('ALL_SCENARIO_VARIANTS_SUMMARY '+JSON.stringify(summary));
process.exitCode=failures.length?1:0;

#!/usr/bin/env node
'use strict';
// Cross-mechanic integration assertions. All operations use exported game rules.
const assert=require('node:assert/strict');
const {scenarios,engine:E,simulate}=require('./scenario_sim.cjs');
const required=['division-japan','invasion-japan','battle-luoyang','war-for-australia'];
for(const id of required)assert.ok(scenarios[id],'Missing scenario '+id);
const all=Object.values(scenarios);
assert.ok(all.length>=30,'At least the original thirty regional battles must remain registered');
const canonical=g=>({
 cities:g.stations.map(s=>[s.id,s.owner,s.shield,s.maxShield,s.cityTier]),
 units:g.units.map(u=>[u.id,u.side,u.type,u.c,u.r,u.hp,u.stack]),
 research:Object.fromEntries(Object.entries(g.economy).map(([side,e])=>[side,e.science])),
 phase:g.phase
});
for(const id of required){
 const s=scenarios[id],side=s.sides[0];
 const a=s.create(side,'normal',20261018),b=s.create(side,'normal',20261018);
 assert.deepEqual(canonical(a),canonical(b),id+' identical seed and setup must agree');
 for(const u of a.units)assert.ok(E.TYPES[u.type],id+' missing frame definition '+u.type);
 const packed=E.packSave(a);
 const loaded=E.unpackSave(JSON.parse(JSON.stringify(packed)));
 assert.ok(loaded,id+' save must unpack');
 assert.deepEqual(canonical(loaded),canonical(a),id+' save preserves army, cities and resources');
 assert.equal(loaded.tiles.length,a.tiles.length,id+' save preserves map length');
 for(const tile of [a.tiles[0],a.tiles[Math.floor(a.tiles.length/2)],a.tiles.at(-1)]){
  const restored=loaded.tiles[tile.r*loaded.cols+tile.c];
  assert.deepEqual(restored,tile,id+' save preserves map terrain and flags');
 }
}
// Repeated turn-based simulation crosses AI planning, income, production, movement,
// combat, capture and the real winner checker; observer hooks must not change play.
const scenario=scenarios['division-japan'],side=scenario.sides[0];
const plain=simulate(scenario,side,'normal',20261018,2);
let attacks=0,productions=0,turnSnapshots=0;
const traced=simulate(scenario,side,'normal',20261018,2,{
 onEvent(event){if(event.kind==='attack')attacks++;},
 onUnitCreated(){productions++;},
 onTurn(){turnSnapshots++;}
});
assert.deepEqual(traced.r,plain.r,'Observation may not alter battle outcomes');
assert.deepEqual(canonical(traced.g),canonical(plain.g),'Observation may not alter game state');
assert.equal(turnSnapshots,traced.r.snapshots.length,'One observation per completed turn');
assert.equal(attacks,Object.values(traced.r.attacks).reduce((a,b)=>a+b,0),
 'Attack telemetry must match actual AI attack events');
assert.ok(productions>=0);
// Validate the save codec on Conquest (different packing from regional scenarios).
const world=E.createGame('britannia','normal','conquest',417,'world');
const recovered=E.unpackSave(JSON.parse(JSON.stringify(E.packSave(world))));
assert.ok(recovered,'Conquest save unpack');
assert.deepEqual(canonical(recovered),canonical(world),'Conquest save round-trip');
assert.equal(recovered.tiles.length,world.tiles.length,'Conquest tile count');
console.log('Seeded regional setups, roster definitions, regional + conquest saves, AI/combat telemetry: PASS');
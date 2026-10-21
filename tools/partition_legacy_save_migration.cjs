#!/usr/bin/env node
'use strict';
// Exhaustive historic 2026 Partition save -> new map migration test.
// Includes occupied former sea/coast hexes, cargo, captured provinces and a
// user-modified crater. Does not create or overwrite a browser save.
const assert = require('node:assert/strict');
const deltas = require('./data/partition_legacy_hex_delta.json');
const geo = require('../dist/partition-geography.js');
const { E } = require('./scenario_sim.cjs');
const scenario = E.scenarios.byId['partition-britannia'];
const C = geo.cols;
const target = Buffer.from(geo.coverage, 'base64');
const cell = u => u.r * C + u.c;
const at = i => ({c:i%C, r:Math.floor(i/C)});
const all = Object.values(deltas).flat();
assert.equal(new Set(all).size, 1046, 'all audited hex changes included once');
assert.equal(deltas.oldInlandToCoast.length, 475);
assert.equal(deltas.oldCoastToInland.length, 27);
assert.equal(deltas.oldFakeSeaToOffmap.length, 544);
const positions = new Set();
for (const id of all) {
 assert(id>=0 && id<target.length && !positions.has(id));
 positions.add(id);
}
const g = scenario.create('remnants','normal',11);
g.turn=17;
g.economy.remnants.credits+=1234;
g.economy.cf.industry+=213;
const captured = g.stations.find(s=>s.name==='Salt Lake City');
captured.owner='remnants';
const capturedProvince = g.tiles.find(t=>t.provinceCity===captured.id && t.terrain!=='sea');
if(capturedProvince) capturedProvince.owner='remnants';
const originalId = g.units.map(u=>u.id).sort((a,b)=>a-b);
const carriers = g.units.filter(u=>E.TYPES[u.type]?.naval==='ship' && u.hp>0);
assert(carriers.length>=2,'two carriers required for legacy stranded-ship regression');
// A pre-audit ship on the old false Mexico/Greenland sea would be stranded by
// a direct 'sea' to 'offmap' rewrite. An old coast->inland ship also needs a
// valid berth; both formations must survive with all attributes unchanged.
const strandedSea = deltas.oldFakeSeaToOffmap.find(i=>!g.stations.some(s=>cell(s)===i));
const strandedCoast = deltas.oldCoastToInland.find(i=>!g.stations.some(s=>cell(s)===i));
Object.assign(carriers[0], at(strandedSea));
Object.assign(carriers[1], at(strandedCoast));
const rider = g.units.find(u=>u.side===carriers[0].side && !E.TYPES[u.type]?.naval && u.hp>0);
assert(rider);
g.units.splice(g.units.indexOf(rider),1);
rider.c=carriers[0].c;rider.r=carriers[0].r;
(carriers[0].cargo ||= []).push(rider);
carriers[0].moved=true;
carriers[0].attacked=true;
carriers[0].expMarkerForTest=551;

// Reproduce the complete old mask's 1,046 classification differences (all
// unmodified cells elsewhere already have the modern terrain).
for(const i of deltas.oldInlandToCoast)g.tiles[i].terrain='plains';
for(const i of deltas.oldCoastToInland)g.tiles[i].terrain=
 g.stations.some(s=>cell(s)===i)?'plains':'coast';
for(const i of deltas.oldFakeSeaToOffmap) {
 g.tiles[i].terrain='sea';g.tiles[i].owner=null;delete g.tiles[i].provinceCity;
}
const craterHex = deltas.oldInlandToCoast.find(i=>!g.stations.some(s=>cell(s)===i) && !g.units.some(u=>cell(u)===i));
g.tiles[craterHex].terrain='crater';
const snapshot = {
 turn:g.turn,player:g.player,phase:g.phase,difficulty:g.difficulty,
 economic:JSON.stringify(g.economy),
 stations:JSON.stringify(g.stations),
 unitIds:g.units.flatMap(u=>[u.id,...(u.cargo||[]).map(c=>c.id)]).sort((a,b)=>a-b),
 commander:g.units.filter(u=>u.cmd).map(u=>[u.id,u.cmd]),
};
const rawSave=JSON.parse(JSON.stringify(E.packSave(g)));
assert.equal(rawSave.scenario.partitionTerrainAudit,undefined);
const migrated=E.migrateSave(rawSave);
assert(migrated,'historical Partition save should load');
assert.equal(migrated.scenario.partitionTerrainAudit,1);
assert.equal(migrated.scenario.version,1);
for(const key of ['turn','player','phase','difficulty'])assert.equal(migrated[key],snapshot[key],key);
assert.equal(JSON.stringify(migrated.economy),snapshot.economic,'keep acquired resources');
assert.equal(JSON.stringify(migrated.stations),snapshot.stations,'preserve cities, shields, built ports and captures');
assert.deepEqual(migrated.units.flatMap(u=>[u.id,...(u.cargo||[]).map(c=>c.id)]).sort((a,b)=>a-b),
 snapshot.unitIds,'all units and passengers still exist');
assert.deepEqual(migrated.units.filter(u=>u.cmd).map(u=>[u.id,u.cmd]),snapshot.commander,
 'preserve assigned commanders');
assert.equal(migrated.tiles[craterHex].terrain,'crater','preserve battle damage to terrain');
for(const i of deltas.oldInlandToCoast)if(i!==craterHex)assert.equal(
 migrated.tiles[i].terrain,'coast','legacy inland-to-shore '+i);
for(const i of deltas.oldCoastToInland)assert(!E.navigable(migrated.tiles[i]),
 'legacy coast-to-inland '+i);
for(const i of deltas.oldFakeSeaToOffmap)assert.equal(migrated.tiles[i].terrain,'offmap',
 'legacy sea-to-blocked-land '+i);
for(const ship of carriers){
 const moved=migrated.units.find(u=>u.id===ship.id);
 assert(moved,'carrier survives');
 assert(E.navigable(migrated.tiles[cell(moved)]), 'carrier displaced to real navigable water');
 assert.equal(moved.hp,ship.hp,'do not heal or damage a displaced carrier');
 assert.equal(moved.moved,ship.moved,'do not spend or refund ship movement');
 assert.equal(moved.attacked,ship.attacked,'do not spend or refund ship attacks');
}
const migratedCarrier=migrated.units.find(u=>u.id===carriers[0].id);
assert.equal(migratedCarrier.expMarkerForTest,551,'preserve all custom unit fields');
assert.equal(migratedCarrier.cargo[0].id,rider.id,'preserve carrier passenger');
assert.equal(migratedCarrier.cargo[0].c,migratedCarrier.c,'passenger follows displaced carrier');
assert.equal(migratedCarrier.cargo[0].r,migratedCarrier.r);
assert.equal(migrated.tiles[cell(capturedProvince)].owner,'remnants','preserve captured province ownership');
const jsonBefore=JSON.stringify(E.packSave(migrated));
const roundtrip=E.migrateSave(JSON.parse(jsonBefore));
assert(roundtrip,'persisted upgraded save should reload');
assert.equal(JSON.stringify(E.packSave(roundtrip)),jsonBefore,'migration idempotent across reloads');
console.log(JSON.stringify({historicalChanges:all.length,legacySea:544,oldCoast:27,
 convertedShore:475,remnantCities:migrated.stations.filter(s=>s.owner==='remnants').length,
 shipsMoved:carriers.filter(u=>{const m=migrated.units.find(v=>v.id===u.id);return cell(m)!==cell(u);}).length,
 cargoPreserved:true,turn:migrated.turn,scenarioVersion:migrated.scenario.version}));
console.log('PASS: legacy Partition save migrated and persisted, with original battle intact.');

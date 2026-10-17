#!/usr/bin/env node
'use strict';
// World Campaign maps use geographic boundaries rather than rectangular
// captures. Run after node tools/build_sources.cjs.
const assert=require('node:assert/strict');
const WC=require('../dist/war-campaign.js');
const E=require('../dist/engine.js');
const contains=(id,lon,lat)=>WC.regionContains(WC.ALL[id],lon,lat);
const positive=[
  ['eu-australia',134,-25],
  ['eu-division-japan',139.69,35.68],
  ['eu-brazil',-43.2,-22.9],
  ['eu-greenland',-42,71.5],
  ['eu-canada',-123.1,49.25],
  ['eu-new-york',-73.75,42.65],
  ['britannia-siberia',104.3,52.3],
  ['britannia-turkey',32.85,39.93],
  ['britannia-federation-korea',127,37.5],
  ['britannia-federation-indochina',105.8,21],
  ['britannia-federation-iraq-iran',51.4,35.7],
  ['federation-britannia-hawaii',-157.85,21.3],
  ['federation-britannia-california',-118.24,34.05],
  ['federation-britannia-new-zealand',172.63,-43.53],
  ['federation-britannia-mexican-heartland',-99.13,19.43],
  ['federation-britannia-central-america',-86.25,12.1],
  ['eu-caribbean',-82.35,23.1],
];
const negative=[
  ['eu-division-japan',129.1,35.17], // Busan is Korean, not Japanese
  ['eu-brazil',-71,2], // Colombia is not Brazil
  ['eu-canada',-122.3,47.6], // Seattle is not Canada
  ['eu-new-york',-83,42.3], // Michigan is outside the East Coast offensive
  ['britannia-siberia',106.9,47.9], // Mongolia is not Russia
  ['federation-britannia-california',-115.14,36.17], // Las Vegas is not California
  ['federation-britannia-hawaii',-158,18.5], // Offshore
  ['eu-caribbean',-67,11], // Venezuelan mainland
];
console.log('REGION_SAMPLES '+JSON.stringify({
  positive:positive.map(([id,lon,lat])=>[id,lon,lat,contains(id,lon,lat)]),
  negative:negative.map(([id,lon,lat])=>[id,lon,lat,contains(id,lon,lat)])
}));
for(const [id,lon,lat] of positive) {
  assert.equal(contains(id,lon,lat),true,`Expected ${id} to include ${lon},${lat}`);
}
for(const [id,lon,lat] of negative) {
  assert.equal(contains(id,lon,lat),false,`Unexpected ${id} spill into ${lon},${lat}`);
}
// A legitimate winning battle records progress; failed battles cannot recolor
// the strategic map. Separate World Campaign factions are independent.
const store=new Map();
const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const m=WC.ALL['eu-australia'];
const game={mode:'scenario',scenario:{id:m.scenarioId},player:m.battleSide,
  warCampaign:{faction:m.campaignFaction,missionId:m.id,scenarioId:m.scenarioId,battleSide:m.battleSide},
  over:{winner:'britannia'}};
assert.equal(WC.recordVictory(storage,game).ok,false,'Defeat cannot recolor the world');
game.over.winner=game.player;
const victory=WC.recordVictory(storage,game);
assert.equal(victory.ok,true,'Confirmed World Campaign win saves');
assert.equal(WC.completed(WC.load(storage),'eu','eu-australia'),true,'Victory is persistent');
assert.equal(WC.completed(WC.load(storage),'britannia','britannia-australia'),false,
  'Other World Campaign factions retain independent progress');
// Political snapshot now updates coastal city ownership as well as tiles,
// rather than losing island colors by clearing every world city.
const p=WC.fresh();p.completed.eu['eu-caribbean']=true;
const world=WC.worldSnapshot(E,'eu',p);
const havana=world.stations.find(s=>s.name==='Havana');
assert.ok(havana,'Political snapshot must preserve city records');
assert.equal(havana.owner,'eu','Winning Caribbean must turn Havana EU-colored');
const virgin=WC.worldSnapshot(E,'eu',WC.fresh());
const baseHavana=virgin.stations.find(s=>s.name==='Havana');
assert.notEqual(baseHavana.owner,'eu','Unwon campaigns must keep original colors');
assert.ok(Object.values(WC.ALL).every(m=>Array.isArray(m.polygons)),
  'Each mission exports drawable region polygons');
console.log('World Campaign map geography, victory persistence, and territorial colors: PASS');

#!/usr/bin/env node
'use strict';
// Focused geographical and accessibility audit of the actual Pendragon engine.
// Not a regression-test suite. Execute explicitly or from the scenario workflow.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const P=require('../dist/scenarios-pendragon.js');
const g=P.create('eu','normal',104729);
const key=x=>x.c+':'+x.r;
assert.equal(P.cityData.length,48);
assert.deepEqual(P.sides,['eu','britannia']);
assert.equal(g.tiles.length,P.cols*P.rows);
assert.equal(new Set(g.stations.map(s=>s.name)).size,48);
assert.equal(g.scenario.capitalCoordinate[0],-117);
assert.equal(g.scenario.capitalCoordinate[1],37.5);
for(const name of ['Pendragon','Imperial Citadel','Reno','Bishop','Tonopah',
  'Goldfield','Beatty','Las Vegas','Ely','Mammoth Lakes','Ridgecrest']){
  assert(g.stations.some(s=>s.name===name),'Missing strategic location '+name);
}
let plain=0,mountain=0,desert=0,forest=0,other=0;
for(const tile of g.tiles){
  assert(tile.owner==='eu'||tile.owner==='britannia','Unassigned hex '+key(tile));
  if(tile.terrain==='plains')plain++;
  else if(tile.terrain==='mountain')mountain++;
  else if(tile.terrain==='desert')desert++;
  else if(tile.terrain==='forest')forest++;
  else other++;
}
assert.equal(other,0,'This inland Nevada map must contain no fabricated coastline or impassable sea');
assert(mountain>200&&desert>1000&&plain>100&&forest>10,'Lack of varied Sierra/desert topography');
// Full-hex flood fill rules out isolated settlements, inaccessible capital,
// impassable encirclement, or one-hex chokepoints that cannot be circumvented.
const bfs=(start,blocked=new Set())=>{
 const seen=new Set([key(start)]),queue=[E.tile(g,start.c,start.r)];
 for(let j=0;j<queue.length;j++)for(const next of E.adjacent(g,queue[j])){
  const k=key(next);
  if(seen.has(k)||blocked.has(k)||E.TERRAIN[next.terrain]?.blocked)continue;
  seen.add(k);queue.push(next);
 }
 return seen;
};
const staging=g.stations.find(s=>s.name==='Bishop');
const reachable=bfs(staging);
assert.equal(reachable.size,g.tiles.length,'All Southwest land hexes must be reachable');
for(const s of g.stations){
 assert(reachable.has(key(s)),'Inaccessible city: '+s.name);
 const t=E.tile(g,s.c,s.r);
 assert(t&&t.terrain==='plains'&&!E.TERRAIN[t.terrain]?.blocked,'Invalid city hex: '+s.name);
 assert.equal(t.owner,s.owner,'Inconsistent province ownership: '+s.name);
 const p=P.geographicAt(s.c,s.r), actual=P.cityData.find(d=>d[0]===s.name);
 assert(Math.abs(p.lon-actual[1])<.16&&Math.abs(p.lat-actual[2])<.12,
  'City geographically displaced: '+s.name+' '+JSON.stringify(p));
}
const capital=g.stations.find(s=>s.name==='Pendragon');
assert(capital.capital&&capital.capitalOf==='britannia'&&capital.maxShield>=850);
assert(capital.maxShield<2000,'Artificially invincible capital');
const target=P.geographicAt(capital.c,capital.r);
assert(Math.abs(target.lon+117)<.11&&Math.abs(target.lat-37.5)<.08,'Campaign marker disagreement');
// Explicit alternate east, west, north and south routes to the imperial ring.
const approaches=['Bishop','Caliente','Austin','Ridgecrest','Pahrump'];
for(const name of approaches){
 const city=g.stations.find(s=>s.name===name);
 const blocked=new Set(g.stations.filter(s=>s.name.includes('Imperial Gate')).map(key));
 assert(bfs(city,blocked).has(key(capital)),'Imperial wall creates impossible pass: '+name);
}
for(const group of g.scenario.groups){
 assert(group.units.length>0,'Army Group empty: '+group.name);
 for(const id of group.units){
  const u=g.units.find(v=>v.id===id);
  assert(u&&u.side===group.side,'Invalid group formation '+id);
  assert(!E.TERRAIN[E.tile(g,u.c,u.r).terrain]?.blocked,'Formation spawned on blocked hex');
 }
}
for(const side of P.sides){
 const owned=g.stations.filter(c=>c.owner===side).length;
 assert(owned>=10,'Missing frontline depth '+side);
}
assert(g.startUnits.eu>g.startUnits.britannia,'E.U. invasion should have numerical superiority');
for(const side of P.sides){
 for(const difficulty of ['normal','hard','challenge','elite']){
  const x=P.create(side,difficulty,17389);
  assert.equal(x.stations.length,48);
  assert.equal(x.units.length,x.startUnits.eu+x.startUnits.britannia);
  if(difficulty==='elite')assert(x.units.filter(u=>u.elite).length>50,'Elite ground conversion failed');
 }
}
for(const s of g.stations)s.owner='eu';
assert.equal(P.winner(g)?.winner,'eu','Every-city E.U. conquest must win');
g.stations.find(s=>s.name==='Las Vegas').owner='britannia';
assert.equal(P.winner(g),null,'Pendragon alone must not trigger victory');
g.turn=10000;
assert.equal(P.winner(g),null,'No time limit');
for(const s of g.stations)s.owner='britannia';
assert.equal(P.winner(g)?.winner,'britannia','Reverse total conquest must win');

// Verify official Campaign progression separately from standalone scenario wins.
const WC=require('../dist/war-campaign.js');
assert.equal(WC.ALL['eu-pendragon'].scenarioId,'eu-pendragon');
assert.equal(WC.ALL['eu-pendragon'].final,true);
const memory=new Map(),storage={
 getItem:k=>memory.get(k)||null,
 setItem:(k,v)=>memory.set(k,v)
};
const fresh=WC.fresh();
assert.equal(WC.launch(fresh,'eu','eu-pendragon',E.scenarios.byId).ok,false,
 'Final objective must not bypass earlier Campaign tiers');
const progress=WC.testFixture('eu',6);
assert(WC.persist(storage,progress));
const eligible=WC.launch(WC.load(storage),'eu','eu-pendragon',E.scenarios.byId);
assert(eligible.ok&&eligible.battleSide==='eu');
const official=P.create('eu','normal',202617);
for(const city of official.stations)city.owner='eu';
official.over=P.winner(official);
official.warCampaign=eligible.context;
const recorded=WC.recordVictory(storage,official);
assert(recorded.ok&&recorded.complete&&
  WC.completed(WC.load(storage),'eu','eu-pendragon'),
  'Legitimate Pendragon victory must complete the E.U. Campaign');
const standalone=P.create('eu','normal',202618);
for(const city of standalone.stations)city.owner='eu';
standalone.over=P.winner(standalone);
assert.equal(WC.recordVictory(storage,standalone).ok,false,
 'Standalone scenario victories do not update Campaign progress');
const preview=P.create('eu','normal',202619);
for(const city of preview.stations)city.owner='eu';
preview.over=P.winner(preview);
preview.warCampaign={...eligible.context,preview:true};
assert.equal(WC.recordVictory(storage,preview).ok,false,
 'Preview victories do not update Campaign progress');
assert(WC.regionContains(WC.ALL['eu-pendragon'],-117,37.5),
 'Official final victory must cover capital Campaign marker');

console.log('PENDRAGON_AUDIT '+JSON.stringify({cities:P.cityData.length,
 dimensions:[g.cols,g.rows],landHexes:reachable.size,mountain,desert,forest,plains:plain,
 armies:g.startUnits,groups:g.scenario.groups.length,capitalShield:capital.maxShield,
 georeferencedCapital:target,approaches,allFourDifficulties:true,
 victoryRequiresEveryCity:true,turnLimit:null}));

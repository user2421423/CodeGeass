#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {E}=require('./scenario_sim.cjs');
const IDS=['bk-civil-war','rounds-tournament','geass-war','protagonists-antagonists','partition-britannia','ufn-civil-war'];
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('dist/scenario-manifest.js','utf8'),ctx);
const ids=vm.runInContext('SCENARIO_MANIFEST.map(s=>s.id)',ctx);
assert.equal(ids.length,68);assert.equal(new Set(ids).size,68);
const WC=require('../dist/war-campaign.js');
const campaignIds=new Set(Object.values(WC.registry).flatMap(t=>t.flatMap(x=>x.missions.map(m=>m.scenarioId))).filter(Boolean));
assert.equal(campaignIds.size,56);assert.equal(ids.filter(id=>!campaignIds.has(id)).length,12);
for(const id of IDS)assert(!campaignIds.has(id),'Exclusive leaked into World Campaign');
let cases=0;
for(const id of IDS){
 const m=E.scenarios.byId[id];assert(m);assert(m.meta.text.intro&&m.meta.text.diplomacy);
 for(const difficulty of ['normal','hard','challenge','elite'])for(const player of m.sides){
  const g=m.create(player,difficulty,57);cases++;
  assert.equal(g.player,player);assert.equal(g.scenario.id,id);assert.equal(g.difficulty,difficulty);
  assert.equal(m.winner(g),null);assert.deepEqual(new Set(g.order),new Set(m.sides));
  const seen=new Set(),hexes=new Set();
  for(const u of E.allUnits(g)){
   assert(E.TYPES[u.type]);assert(m.sides.includes(u.side));assert(u.hp>0);
   assert(!hexes.has(E.key(u)),'Overlapping deployment');hexes.add(E.key(u));
   const t=E.tile(g,u.c,u.r);assert(t&&!E.TERRAIN[t.terrain]?.blocked,'Invalid deployment terrain');
   if(!E.TYPES[u.type].naval)assert(!E.isSea(t),'Land unit at sea');
   if(u.cmd){assert(E.serves(u.cmd,u.side,g));assert(!seen.has(u.cmd),'Duplicate commander');seen.add(u.cmd);}
   if(u.elite)assert(E.eliteEligible(g,u.side,u.elite));
  }
  for(const side of m.sides){
   assert(g.stations.some(s=>s.owner===side));assert(g.units.some(u=>u.side===side));
   assert(g.economy[side]&&g.tech[side]);assert(E.isMajor(g,side));assert(E.airshipType(g,side));
   assert.equal(E.hostilePowers(g,side).length,m.sides.length-1);
   for(const cmd of g.scenario.commanderSides[side])assert(seen.has(cmd),'Officer not deployed: '+cmd);
   assert(g.scenario.eliteRosters[side].length>0);
  }
  for(const s of g.stations){assert(m.sides.includes(s.owner));if(s.portAt){assert(E.navigable(E.tile(g,s.portAt.c,s.portAt.r)));assert.equal(s.portOwner,s.owner);}}
  for(const t of g.tiles)if(t.owner){assert(m.sides.includes(t.owner));const city=g.stations.find(s=>s.id===t.provinceCity);assert(city);assert.equal(t.owner,city.owner);}
  const loaded=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));assert(loaded,'Save rejected');
  assert.deepEqual(loaded.order,g.order);assert.deepEqual(loaded.scenario.rosterSources,g.scenario.rosterSources);
  assert.deepEqual(loaded.buildable,g.buildable);assert.deepEqual(loaded.economy,g.economy);
  assert.equal(m.winner(loaded),null);
  // Exercise the real player factory with funds isolated from authored balance.
  Object.assign(loaded.economy[player],{credits:100000,industry:100000,science:100000,sakuradite:100000});
  const city=loaded.stations.find(s=>s.owner===player);for(const u of loaded.units)if(u.c===city.c&&u.r===city.r)u.hp=0;
  assert.equal(E.buyReason(loaded,city,E.typeFor(player,'scout',loaded),1),null,'Recruitment blocked');
  assert(E.recruit(loaded,city.id,E.typeFor(player,'scout',loaded),1).ok,'Factory purchase failed');
  for(const source of loaded.scenario.rosterSources[player]){
   const type=E.ROSTER[source].assault;
   const why=E.buyReason(loaded,city,type,1);
   assert(!why||!why.includes('Not built'),'Mixed roster frame rejected');
  }
  const factory=loaded.stations.find(s=>s.owner===player&&s.tier>=3);
  if(factory){
   for(const u of loaded.units)if(u.c===factory.c&&u.r===factory.r)u.hp=0;
   const id=loaded.scenario.eliteRosters[player].find(id=>!E.TYPES[E.ELITE_FORCES[id].type].naval&&!loaded.eliteDeployed[id]);
   assert(id,'No deployable Elite remains');
   const profile={elites:{[id]:{level:1,fragments:0}}};
   assert.equal(E.eliteDeployReason(loaded,factory,id,profile),null);
   assert(E.deployElite(loaded,factory.id,id,profile).ok,'Elite factory deployment failed');
  }
  for(const s of loaded.stations)s.owner=player;
  assert.equal(m.winner(loaded)?.winner,player);
 }
 console.log('PASS '+id+' all factions × four difficulties, ownership, deployments, production, save/load and victory');
}
// Real last-city captures must eliminate just that faction, transfer its
// provinces/ports, disband its forces and leave the remaining FFA active.
for(const id of ['rounds-tournament','partition-britannia']){
 const m=E.scenarios.byId[id],g=m.create(m.sides[0],'normal',11),[player,loser,survivor]=m.sides;
 const target=g.stations.find(s=>s.owner===loser);
 for(const s of g.stations)if(s.owner===loser&&s!==target)s.owner=survivor;
 target.shield=0;for(const u of g.units)if(E.distance(u,target,g)<=2)u.hp=0;
 const at=E.adjacent(g,target).find(t=>!E.isSea(t)&&!E.TERRAIN[t.terrain]?.blocked&&!E.stationAt(g,t));assert(at);
 const u=E.newUnit(g,E.typeFor(player,'assault',g),player,at.c,at.r,1);
 const moved=E.move(g,u.id,target.c,target.r);assert(moved.ok,JSON.stringify(moved));
 assert(g.fallen[loser]);assert(!E.alive(g,loser));assert(E.alive(g,survivor));
 assert(!g.units.some(u=>u.hp>0&&u.side===loser));assert.equal(m.winner(g),null);assert.equal(g.over,null);
 assert.equal(E.income(g,loser).credits,0);console.log('PASS '+id+' last-city elimination continues multi-faction war');
}
const tournament=E.scenarios.byId['rounds-tournament'].create();
assert.equal(tournament.order.length,6);for(const side of tournament.order){assert.equal(tournament.startUnits[side],14);assert.equal(tournament.economy[side].credits,600);}
const china=E.scenarios.byId['ufn-civil-war'];
assert.equal(china.cols,200);assert.equal(china.rows,120);
const mainland=china.create('ufn','normal',57);
assert.equal(mainland.stations.length,119);
for(const name of ['Kashgar','Lhasa','Urumqi','Harbin','Shanghai','Nanjing','Guangzhou','Haikou'])
 assert(mainland.stations.some(s=>s.name===name),'Missing mainland China city '+name);
assert(mainland.tiles.some(t=>t.terrain==='offmap'),'Mainland China must exclude surrounding countries');
assert.equal(mainland.stations.filter(s=>s.owner==='ufn').length,50);
const partition=E.scenarios.byId['partition-britannia'].create('remnants');
assert.equal(partition.stations.filter(s=>s.owner==='remnants').length,27);
assert.equal(partition.stations.filter(s=>s.owner==='cf').length,21);
assert.equal(partition.stations.filter(s=>s.owner==='eu').length,30);
for(const name of ['Winnipeg','Minneapolis','Denver','Kansas City','Dallas','Houston','Yellowknife','Great Falls'])
 assert.equal(partition.stations.find(s=>s.name===name).owner,'remnants','Britannian heartland missing '+name);
for(const name of ['Salt Lake City','Los Angeles','Vancouver'])
 assert.equal(partition.stations.find(s=>s.name===name).owner,'cf','Pacific occupation lost '+name);
for(const name of ['Chicago','New York','Toronto'])
 assert.equal(partition.stations.find(s=>s.name===name).owner,'eu','Atlantic occupation lost '+name);
assert.equal(partition.startUnits.remnants,73);
assert.equal(partition.units.filter(u=>u.side==='remnants'&&u.cmd).length,12);
for(const [cmd,home] of Object.entries({
 charles:'Denver',schneizel:'Minneapolis',cornelia:'Dallas',bismarck:'Kansas City',
 suzaku:'Albuquerque',gino:'Great Falls',anya:'Winnipeg',jeremiah:'New Orleans',
 guilford:'St Louis',darlton:'Omaha',villetta:'San Antonio',lloyd:'Houston'
})){
 const officer=partition.units.find(u=>u.cmd===cmd),station=partition.stations.find(s=>s.name===home);
 assert(officer&&station&&E.distance(officer,station,partition)<=2,'Officer starting front: '+cmd);
}
assert.equal(E.income(partition,'remnants').credits,618);
assert.equal(partition.economy.remnants.credits,3*E.income(partition,'remnants').credits);
assert.equal(partition.units.filter(u=>u.side==='remnants'&&E.TYPES[u.type].air).length,1);
assert(!partition.units.some(u=>u.side==='remnants'&&u.elite));
assert(partition.units.filter(u=>u.side==='remnants'&&!u.cmd&&!E.TYPES[u.type].air).every(u=>u.stack===2));
const flagCtx=vm.createContext({Knightmare:E});
vm.runInContext(fs.readFileSync('dist/art.js','utf8'),flagCtx);
assert(vm.runInContext('ART.flagSVG("remnants")',flagCtx).includes('assets/flags/britannia.webp'));
assert.equal(E.FACTIONS.remnants.color,E.FACTIONS.britannia.color);
const geass=E.scenarios.byId['geass-war'].create();const heroes=E.scenarios.byId['protagonists-antagonists'].create();
assert(E.serves('leila','geass_order',geass));assert(E.serves('shin','geass_order',geass));assert(!E.COMMANDERS.sakuya, 'Removed Rozé commander must not return');
assert(E.serves('mao','geass_order',geass));assert(E.serves('shamna','geass_order',geass));
assert(E.serves('suzaku','anti_geass',geass));assert(E.serves('suzaku','protagonists',heroes));assert(E.serves('shin','antagonists',heroes));
assert(!geass.units.some(u=>['lelouch','julius'].includes(u.cmd)));
// HQ research remains the same shared system; new factions' local combat research survives packing.
const profile={tokens:100000,wins:100,research:{}};
const tech=Object.keys(E.TECH_NODES).find(id=>!E.researchReason(profile,id));assert(tech);assert(E.research(profile,tech).ok);
assert.deepEqual(E.MAJORS,['britannia','eu','cf']);
console.log('PASS '+cases+' starts; 68 total, 56 campaign, 12 exclusives; research and existing world factions preserved');

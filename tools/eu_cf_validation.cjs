#!/usr/bin/env node
'use strict';
// Integrated EU-vs-Federation checks with the actual built engine and scenario AI.
// --setup: all four difficulties, both player factions, map/economy/save contracts.
// --sim <key>: both sides, two seeds (30 and 20 turns), plus Elite 5-turn samples.
// --progression: campaign victory/unlocking/isolation against real loaded models.
const assert=require('node:assert/strict');
const {E,simulate}=require('./scenario_sim.cjs');
const WC=require('../dist/war-campaign.js');
const KEYS=['kazakhstan','persia','xinjiang','india','mongolia','manchuria','himalayas','sichuan','beijing','luoyang'];
const IDS=KEYS.map(x=>'eu-cf-'+x);
const out=x=>console.log('EUCF_RESULT '+JSON.stringify(x));
const sides=['eu','cf'];
const difficulties=['normal','hard','challenge','elite'];
function checkSetup(id){
 const model=E.scenarios.byId[id];
 assert(model,'Missing scenario registration: '+id);
 assert.deepEqual([...model.sides],sides,id+' must be only E.U./Federation');
 for(const side of sides)for(const difficulty of difficulties){
   const g=model.create(side,difficulty,11), tag=id+' '+side+' '+difficulty;
   assert.equal(g.mode,'scenario',tag);
   assert.equal(g.player,side,tag);
   assert.equal(g.scenario.id,id,tag);
   assert.equal(g.tiles.length,g.cols*g.rows,tag);
   assert(g.stations.length>=10,'Missing cities '+tag);
   assert(g.units.length>0,'Missing units '+tag);
   const names=new Set(),positions=new Set();
   let ports=0, groups=g.scenario?.groups?.length||0, water=0,blocked=0;
   for(const t of g.tiles){
     if(t.terrain==='sea')water++;
     if(t.terrain==='peak'||E.TERRAIN?.[t.terrain]?.blocked)blocked++;
   }
   for(const city of g.stations){
     assert(!names.has(city.name),'Duplicate city '+tag+' '+city.name);
     names.add(city.name);
     assert(sides.includes(city.owner),'Bad city owner '+tag+' '+city.name);
     assert(city.c>=0&&city.c<g.cols&&city.r>=0&&city.r<g.rows,'Bad city cell '+tag);
     const tile=g.tiles[city.r*g.cols+city.c];
     assert(tile.terrain!=='sea'&&tile.terrain!=='offmap','City in sea '+tag+' '+city.name);
     assert(city.income>=0&&city.industry>=0,'Invalid city economy '+tag+' '+city.name);
     if(city.portAt){
       const {c,r}=city.portAt;
       assert(c>=0&&c<g.cols&&r>=0&&r<g.rows,'Port offmap '+tag+' '+city.name);
       const waterTile=g.tiles[r*g.cols+c];
       assert(waterTile.terrain==='sea'||waterTile.terrain==='coast','Port not at sea '+tag+' '+city.name);
       const k=c+','+r;
       assert(!positions.has(k),'Duplicate port hex '+tag+' '+city.name);
       positions.add(k);
       ports++;
     }
   }
   let seaUnits=0,untyped=0;
   for(const u of g.units){
     assert(sides.includes(u.side),'Bad unit owner '+tag);
     assert(Number.isInteger(u.c)&&u.c>=0&&u.c<g.cols&&Number.isInteger(u.r)&&u.r>=0&&u.r<g.rows,'Unit offmap '+tag+' '+u.id);
     if(!E.TYPES[u.type])untyped++;
     if(E.TYPES[u.type]?.naval)seaUnits++;
   }
   assert.equal(untyped,0,'Unknown unit type '+tag);
   assert(g.stations.some(c=>c.owner==='eu')&&g.stations.some(c=>c.owner==='cf'),'Missing city economy for one faction '+tag);
   assert(groups>=2,'Missing Army Groups '+tag);
   assert(E.alive(g,'eu')&&E.alive(g,'cf'),'Faction initially dead '+tag);
   assert(JSON.parse(JSON.stringify(g)).scenario.id===id,'Save JSON roundtrip failed '+tag);
   out({kind:'setup',id,side,difficulty,ok:true,cities:g.stations.length,
      citySplit:Object.fromEntries(sides.map(k=>[k,g.stations.filter(v=>v.owner===k).length])),
      groundUnits:g.units.length-seaUnits,seaUnits,ports,groups,water,blocked,
      credits:Object.fromEntries(sides.map(k=>[k,g.economy[k]?.credits||0]))});
 }
}
function runSim(id){
 const model=E.scenarios.byId[id];
 assert(model,id+' not registered');
 const experiments=[
   {difficulty:'normal',seed:11,turns:30},
   {difficulty:'normal',seed:37,turns:20},
   {difficulty:'elite',seed:11,turns:5},
 ];
 for(const ex of experiments)for(const side of sides){
   const clock=Date.now(),{r}=simulate(model,side,ex.difficulty,ex.seed,ex.turns);
   const final=r.snapshots.at(-1)||{};
   const start=r.startingCities,ended=final.cities||start;
   const row={kind:'sim',id,side,seed:ex.seed,difficulty:ex.difficulty,
      requestedTurns:ex.turns,actualTurns:r.snapshots.length,winner:r.winner,
      startCities:start,endCities:ended,captures:r.captures.length,
      earlyCaptures:r.captures.filter(x=>x.turn<=5).length,
      startingForces:r.startingForces,endForces:final.units,
      production:r.production,losses:r.losses,attacks:r.attacks,
      navalActions:r.navalActions,errors:r.errors.slice(0,5),
      openingStall:r.openingStall,durationSeconds:+((Date.now()-clock)/1000).toFixed(2)};
   out(row);
   assert.equal(r.errors.length,0,id+' '+side+' '+ex.seed+' game-engine AI errors');
   if(ex.difficulty==='normal'&&r.snapshots.length>=10)
     assert(r.attacks.eu+r.attacks.cf>0,'No combat: '+id+' '+side+' '+ex.seed);
 }
}
function progress(){
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const key='eu-federation', all=WC.registry[key].flatMap(x=>x.missions);
 assert.equal(all.length,13);
 const models=Object.fromEntries(all.map(m=>[m.scenarioId,E.scenarios.byId[m.scenarioId]]));
 for(const m of all){
   assert(models[m.scenarioId]&&models[m.scenarioId].sides.includes('eu'),m.id+' model missing');
   const p=WC.load(storage), tier=WC.unlockedTier(p,key);
   assert.equal(tier,m.tier,'Unexpected tier for '+m.id);
   const launched=WC.launch(p,key,m.id,models);
   assert(launched.ok,'Cannot launch '+m.id+': '+launched.reason);
   // No forged side, mode, objective, or success may progress.
   const fake={mode:'scenario',player:'cf',scenario:{id:m.scenarioId},warCampaign:launched.context,over:{winner:'cf'}};
   assert.equal(WC.recordVictory(storage,fake).ok,false,'Opposite-side victory credited');
   const real={...fake,player:'eu',over:{winner:'eu'}};
   const accepted=WC.recordVictory(storage,real);
   assert.equal(accepted.ok,true,'Legitimate victory rejected '+m.id);
   assert.equal(accepted.already,false,'Unexpected duplicate first win '+m.id);
   assert.equal(WC.recordVictory(storage,real).already,true,'Duplicate win not idempotent '+m.id);
   assert.equal(WC.load(storage).completed[key][m.id],true);
   out({kind:'campaign',mission:m.id,tier:m.tier,passed:true,unlocked:accepted.unlocked,complete:accepted.complete});
 }
 assert.equal(WC.unlockedTier(WC.load(storage),key),7);
 for(const other of WC.FACTIONS.filter(x=>x!==key))
   assert.deepEqual(WC.load(storage).completed[other],{},'Other campaign progress contaminated: '+other);
 out({kind:'campaign-final',missions:all.length,complete:true,persistent:true,isolated:true});
}
const [mode,key]=process.argv.slice(2);
try{
 if(mode==='--setup')for(const id of IDS)checkSetup(id);
 else if(mode==='--sim'){assert(KEYS.includes(key),'Unknown scenario key '+key);runSim('eu-cf-'+key);}
 else if(mode==='--progression')progress();
 else throw Error('usage: node tools/eu_cf_validation.cjs --setup | --sim <key> | --progression');
}catch(e){console.error('EUCF_FAILURE '+(e.stack||e));process.exitCode=1;}

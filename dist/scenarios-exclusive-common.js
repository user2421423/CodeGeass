/* Independent regional wars: reuse surveyed geography, rebuild politics and armies.
 * Scenario state is plain JSON; national frame definitions and commander skills are never copied. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
function blank(player,seed,cols,rows){
 return {game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,mode:'scenario',player,
  difficulty:'normal',seed,wrap:false,cols,rows,turn:1,phase:player,nextId:1,
  tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],fallen:{},
  economy:{},tech:{},officers:Object.fromEntries(Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
  roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,eliteDeployed:{},arsenal:{},
  automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},mapRevision:0};
}
function define(config){
 let base=config.geography;
 if(!base){
  if(!E.scenarios?.byId?.[config.parent]&&typeof require==='function'){
   const modules={'invasion-japan':'scenarios.js','european-war':'scenarios-europe.js',
    'eu-pendragon':'scenarios-pendragon.js','battle-luoyang':'scenarios-luoyang.js'};
   if(config.parent==='european-war')require('./europe-landmask.js');
   require('./'+modules[config.parent]);
   if(config.parent==='invasion-japan')(E.scenarios.byId||={})[config.parent]=E.scenarios.japan;
  }
  base=E.scenarios?.byId?.[config.parent] || (config.parent==='invasion-japan'?E.scenarios?.japan:null);
 }
 if(!base)throw Error('Missing surveyed geography '+config.parent);
 const sides=Object.keys(config.rosters);
 const cities=base.cityData.map((row,i)=>{const copy=[...row];copy[3]=config.owner(row,i);return copy;});
 function create(player=sides[0],difficulty='normal',seed=201891){
  if(!sides.includes(player))throw Error('Invalid faction '+player);
  if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
  const g=base.create(base.sides[0],'normal',seed);
  // Keep only physical geography. Inherited war scripts, subsidies, deployments,
  // fortification projects and victory conditions belong to the parent war alone.
  const physical=Object.fromEntries(['bounds','projection','rivers','crossings','coastalSea','roads','ridges','mapDatum','mapRegion'].filter(k=>g.scenario[k]).map(k=>[k,g.scenario[k]]));
  delete g.startUnits;delete g.ai;delete g.armyGroups;
  g.units=[];g.nextId=1;g.player=player;g.phase=player;g.difficulty=difficulty;g.era=config.id;
  g.order=[player,...sides.filter(s=>s!==player)];g.fallen={};g.over=null;g.log=[];
  g.officers=Object.fromEntries(Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)]));
  g.roster={};g.eliteDeployed={};g.strikes=[];g.launches=[];
  g.economy={neutral:{credits:0,industry:0,science:0,sakuradite:0}};g.tech={neutral:{}};
  g.arsenal=Object.fromEntries(sides.map(s=>[s,0]));g.teams=Object.fromEntries(sides.map(s=>[s,s]));
  g.factions=Object.fromEntries(sides.map(s=>[s,E.FACTIONS[s]]));g.lineup={};g.buildable={};
  g.scenario={...physical,id:config.id,title:config.title,version:1,phase:'total-conquest',
   totalConquest:true,turnLimit:null,independentPowers:true,economyLocalized:true,
   startingResearchDoubled:true,groups:[],funding:{},equipment:{},rosterSources:config.rosters,
   commanderSides:config.commanders,eliteRosters:{},eliteSignatures:config.signatures||{}};
  for(const side of sides){
   const sources=config.rosters[side];g.scenario.equipment[side]=sources[0];
   // Class defaults supply AI and summoned formations; the factory exposes the
   // complete union, preserving each national unit's original definition.
   g.lineup[side]=Object.fromEntries(E.CLASS_ORDER.map((cls,i)=>[cls,E.ROSTER[sources[i%sources.length]][cls]]));
   g.buildable[side]=[...new Set(sources.flatMap(s=>Object.values(E.ROSTER[s])))];
   g.scenario.eliteRosters[side]=Object.keys(E.ELITE_FORCES).filter(id=>{
    const e=E.ELITE_FORCES[id];return !e.scenarioOnly&&sources.some(s=>e.availableTo.includes(s));
   });
   g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
  }
  for(const [i,s] of g.stations.entries()){
   const row=cities[i];s.owner=row[3];s.capitalOf=null;s.capital=false;
   delete s.regionalIncome;delete s.divisionIncome;delete s.project;delete s.eliminatorProject;
   delete s.eliminator;delete s.expArkFleet;delete s.buildingFoundation;
   s.tier=row[4];s.fort=!!row[5];s.lab=1;s.refinery=0;
   s.maxShield=s.shield=E.scenarioCityDefenseHP(s.tier,s.fort,s.name);
   s.income=s.tier===3?30:s.tier===2?18:10;s.industry=s.tier*8;s.science=s.tier+2;
   // Sakuradite is city output: occupation transfers it; eliminated powers earn none.
   s.regionalIncome={sakuradite:s.tier===3?3:1};
   s.producedTurn=0;s.portProducedTurn=0;
   if(s.portAt)s.portOwner=s.owner;
   config.citySetup?.(s);
  }
  for(const t of g.tiles){
   if(t.terrain==='sea'||t.terrain==='offmap'){t.owner=null;continue;}
   let city=g.stations.find(s=>s.id===t.provinceCity);
   if(!city){city=g.stations.reduce((a,b)=>E.distance(t,a,g)<=E.distance(t,b,g)?a:b);t.provinceCity=city.id;}
   t.owner=city.owner;
  }
  // Preserve the mine locations and attach each to its now-rebuilt province.
  for(const site of g.sites||[]){const city=g.stations.find(s=>s.id===site.city);if(city&&site.owner)site.owner=city.owner;}
  const usedCommanders=new Set();
  function spawn(side,home,cls,cmd=null,elite=null,stack=2){
   const at=E.nearestTile(g,home,t=>!E.isSea(t)&&!E.TERRAIN[t.terrain]?.blocked&&t.owner===side&&!E.unitAt(g,t)&&
    (!E.stationAt(g,t)||E.stationAt(g,t).owner===side)&&!g.stations.some(s=>s.portAt?.c===t.c&&s.portAt?.r===t.r),12);
   if(!at)throw Error(config.id+' cannot deploy at '+home.name);
   if(cmd){if(!E.COMMANDERS[cmd]||usedCommanders.has(cmd))throw Error('Invalid or duplicate commander '+cmd);usedCommanders.add(cmd);}
   const type=elite?E.ELITE_FORCES[elite].type:E.typeFor(side,cls,g);
   const u=E.newUnit(g,type,side,at.c,at.r,elite?1:stack,cmd);
   if(elite){u.elite=elite;u.eliteLevel=1;u.eliteStart=true;}
   if(cmd)u.cmdRank=g.officers[cmd].rank;
   u.hp=E.maxHP(u);return u;
  }
  for(const side of sides){
   const own=g.stations.filter(s=>s.owner===side);
   if(!own.length)throw Error(config.id+' has cityless '+side);
   const focus=own.find(s=>s.name===config.focus[side]);
   if(!focus)throw Error(config.id+' missing owned headquarters '+config.focus[side]);
   focus.capital=true;focus.capitalOf=side;
   const pool=config.commanders[side]||[];
   for(const cmd of pool){
    const i=pool.indexOf(cmd),assigned=config.commanderHomes?.[side]?.[cmd];
    const home=assigned?own.find(s=>s.name===assigned):i===0?focus:own[i%own.length];
    if(!home)throw Error(config.id+' commander '+cmd+' missing owned starting city '+assigned);
    const signature=config.signatures?.[cmd];
    spawn(side,home,signature?E.TYPES[E.ELITE_FORCES[signature].type].cls:'heavy',cmd,signature);
   }
   const count=config.forces?.[side]??Math.max(own.length*2,pool.length+8);
   for(let i=pool.length;i<count;i++)spawn(side,own[(i-pool.length)%own.length],['assault','medium','rocket','raider','siege','support'][i%6],null,null,config.stack?.[side]||2);
   if(config.airships?.includes(side)){
    const at=E.nearestTile(g,focus,t=>!E.unitAt(g,t)&&!E.stationAt(g,t)&&t.terrain!=='offmap'&&t.owner===side,8);
    if(at)E.newUnit(g,E.airshipType(g,side),side,at.c,at.r,1);
   }
   // Naval squadrons are based at real inherited/validated shipyards only.
   if(config.navy?.includes(side))for(const s of own.filter(s=>s.portAt).slice(0,3)){
    const at=E.tile(g,s.portAt.c,s.portAt.r);
    if(at&&!E.unitAt(g,at))E.newUnit(g,E.NAVAL[g.scenario.equipment[side]].carrier,side,at.c,at.r,1);
   }
   const rate=E.income(g,side),reserve=config.reserve?.[side]??3;
   for(const resource of ['credits','industry','science','sakuradite'])g.economy[side][resource]=Math.round(rate[resource]*reserve);
  }
  for(const [side,treasury] of Object.entries(config.treasury||{}))Object.assign(g.economy[side],treasury);
  if(difficulty==='elite')E.prepareEliteEurope(g);
  else for(const u of g.units)if(u.side!==player)E.addDifficultyFrames(u,difficulty);
  E.applyScenarioDifficulty(g,difficulty);
  // Groups follow actual city regions, never inherited enemy formations.
  for(const side of sides){
   const own=g.stations.filter(s=>s.owner===side);
   const groups=new Map();
   for(const u of g.units.filter(u=>u.side===side)){
    const home=own.reduce((a,b)=>E.distance(u,a,g)<=E.distance(u,b,g)?a:b);
    if(!groups.has(home.id))groups.set(home.id,{id:side+'-'+home.id,side,name:home.name+' Command',origin:home.name,units:[]});
    groups.get(home.id).units.push(u.id);
   }
   g.scenario.groups.push(...groups.values());
  }
  g.startUnits=Object.fromEntries(sides.map(s=>[s,g.units.filter(u=>u.side===s).length]));
  g.mapRevision=(g.mapRevision||0)+1;E.log(g,config.intro,player);return g;
 }
 function objective(g,side=g.player){return 'Conquer every city ('+g.stations.filter(s=>s.owner===side).length+'/'+g.stations.length+'). Losing the last city eliminates a faction. No turn limit or alliances.';}
 function winner(g){if(g.scenario?.id!==config.id||g.stations.length!==cities.length)return null;
  const side=sides.find(side=>g.stations.every(s=>s.owner===side));
  return side?{winner:side,team:side,reason:E.FACTIONS[side].name+' controls every city.'}:null;}
 const api={...base,id:config.id,title:config.title,sides,cityData:cities,create,onTurn:()=>false,objective,winner};
 delete api.armyGroups;delete api.operationalFronts;
 api.meta={saveVersion:1,elite:true,eliteRosterOnly:true,ai:{doctrine:'europe',recovery:true},
  map:{...(base.meta?.map||{}),overviewMarkers:true},
  text:{era:config.era||'Alternate history · 2018 a.t.b.',intro:config.intro,
   terrain:config.terrain||base.meta?.text?.terrain,
   diplomacy:'Every faction is hostile to every other faction from turn one. Total conquest; no alliances or turn limit.',
   elite:'Named signature elites start at Lv.1. Elite difficulty uses the established single-frame, research and rival commander rules.',focus:config.focus},
  blurbs:config.blurbs,portraits:Object.fromEntries(sides.map(s=>[s,config.commanders[s]?.[0]]))};
 E.scenarios={...(E.scenarios||{}),byId:{...(E.scenarios?.byId||{}),[config.id]:api}};
 return api;
}
root.KNIGHTMARE_EXCLUSIVE={define,blank};
if(typeof module!=='undefined')module.exports={define,blank};
})(typeof window!=='undefined'?window:globalThis);

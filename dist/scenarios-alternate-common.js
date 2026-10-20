/* Alternate-history regional scenarios share geography, but rebuild allegiances,
   armies, research funds and commander assignments per divergent timeline. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
function remapKeys(object,translate) {
  return Object.fromEntries(Object.entries(object||{}).map(([side,value])=>
    [translate(side),value]));
}
function remapNested(value,translate){
  if(Array.isArray(value))return value.map(v=>remapNested(v,translate));
  if(value&&typeof value==='object')return Object.fromEntries(
    Object.entries(value).map(([k,v])=>[translate(k),remapNested(v,translate)]));
  return typeof value==='string'?translate(value):value;
}
// Saves made before the 2026-10-20 fixes lack g.scenario.equipment; they cannot be resumed.
const SAVE_VERSION=2;
function define(config){
 // Some existing smoke tests import scenarios independently, outside
 // browser manifest load order. Resolve the parent module on Node as needed.
 let base=E.scenarios?.byId?.[config.parent];
 if(!base&&typeof require==='function'){
   const modules={'eu-pendragon':'scenarios-pendragon.js',
     'european-war':'scenarios-europe.js','battle-luoyang':'scenarios-luoyang.js'};
   const dependency=modules[config.parent];
   if(dependency)require('./'+dependency);
   base=E.scenarios?.byId?.[config.parent];
 }
 if(!base)throw Error('Alternate-history parent not registered: '+config.parent);
 const SIDES=Object.freeze(Object.values(config.map));
 const translate=s=>config.map[s]||s;
 const reverse=Object.fromEntries(Object.entries(config.map).map(([a,b])=>[b,a]));
 const equipment=config.equipment;
 const TITLE=config.title,ID=config.id;
 const CITIES=base.cityData.map(row=>row.map((x,i)=>i===3?translate(x):x));
 // Signature Elite Forces belong to the side that fields their pilot.
 const exclusive=config.exclusiveElites||{};
 function eliteRoster(g,side){
   return Object.keys(E.ELITE_FORCES).filter(id=>{
     const e=E.ELITE_FORCES[id];
     return !e.scenarioOnly&&e.availableTo.includes(equipment[side])&&
       (!exclusive[id]||exclusive[id]===side)&&E.eliteEligible(g,side,id);
   });
 }
 // Commanders who keep their allegiance stay with their parent formation; the
 // rest lead the strongest formation at a different city, nearest the front first.
 function placeCommanders(g,player){
   const placed=new Set();
   for(const u of E.allUnits(g)){
     if(u.cmd&&config.commanders[u.side]?.includes(u.cmd)&&!placed.has(u.cmd))placed.add(u.cmd);
     else u.cmd=null;
   }
   for(const side of SIDES){
     const enemies=g.stations.filter(s=>s.owner!==side);
     const front=new Map(g.stations.filter(s=>s.owner===side).map(s=>
       [s,Math.min(...enemies.map(e=>E.distance(s,e,g)))]));
     const focus=g.stations.find(s=>s.name===config.text.focus[side]&&s.owner===side);
     const cities=[...front.keys()].sort((a,b)=>(b===focus)-(a===focus)||front.get(a)-front.get(b)||a.id-b.id);
     const hosts=g.units.filter(u=>u.side===side&&u.hp>0&&!E.TYPES[u.type].naval&&!E.isSea(E.tile(g,u.c,u.r)));
     const nearestCity=u=>cities.reduce((best,s)=>E.distance(u,s,g)<E.distance(u,best,g)?s:best,cities[0]);
     const byCity=new Map(cities.map(s=>[s,[]]));
     for(const u of hosts)byCity.get(nearestCity(u))?.push(u);
     // The faction leader (first listed) always commands at the faction's focus city.
     const leader=config.commanders[side]?.[0];
     const leading=hosts.find(u=>u.cmd===leader);
     if(focus&&leading&&nearestCity(leading)!==focus){leading.cmd=null;placed.delete(leader);}
     const taken=new Set(hosts.filter(u=>u.cmd).map(nearestCity));
     const waiting=(config.commanders[side]||[]).filter(k=>!placed.has(k));
     if(waiting[0]===leader)taken.delete(focus);
     for(let pass=0;waiting.length&&pass<2;pass++)for(const city of cities){
       if(!waiting.length)break;
       if(pass===0&&taken.has(city))continue;
       const u=byCity.get(city).filter(u=>!u.cmd).sort((a,b)=>E.maxHP(b)-E.maxHP(a)||a.id-b.id)[0];
       if(!u)continue;
       const cmd=waiting.shift();
       if(!g.officers[cmd])throw Error('Missing alternate-history commander '+cmd);
       u.cmd=cmd;taken.add(city);placed.add(cmd);
     }
   }
   for(const u of E.allUnits(g))if(u.cmd){u.cmdRank=g.officers[u.cmd].rank;u.hp=E.maxHP(u);}
 }
 function create(player=SIDES[0],difficulty='normal',seed=201800){
   if(!SIDES.includes(player))throw Error('Invalid '+TITLE+' side '+player);
   if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
   // Generate the original surveyed geographic map; all political allegiances,
   // commanders and equipment are then rebuilt for this independent scenario.
   const g=base.create(reverse[player],difficulty==='elite'?'normal':difficulty,seed);
   const currentEconomy=g.economy,currentTech=g.tech,currentArsenal=g.arsenal;
   const previousFunding=g.scenario.funding||{};
   for(const s of g.stations){
     s.owner=translate(s.owner);
     if(s.capitalOf)s.capitalOf=translate(s.capitalOf);
     if(s.portOwner)s.portOwner=translate(s.portOwner);
   }
   for(const t of g.tiles)if(t.owner)t.owner=translate(t.owner);
   g.factions=Object.fromEntries(SIDES.map(s=>[s,E.FACTIONS[s]]));
   g.lineup=Object.fromEntries(SIDES.map(s=>[s,{...E.ROSTER[equipment[s]]}]));
   g.scenario={...g.scenario,equipment:{...equipment}};
   for(const u of E.allUnits(g)){
     const type=E.TYPES[u.type];
     u.side=translate(u.side);
     if(type?.naval){
       const navy=E.NAVAL[equipment[u.side]];
       u.type=type.naval==='ship'?navy.carrier:type.tier>=2?navy.amphibious2:navy.amphibious;
     } else if(type){
       u.type=E.typeFor(u.side,type.cls,g);
     }
     if(!E.TYPES[u.type])throw Error('Alternate history has unknown frame '+u.type);
     u.elite=null;u.eliteLevel=0;u.eliteStart=false;
     u.hpTech=0;
     u.hp=E.maxHP(u);
   }
   // Reinforcements are newly raised, normal-priced class formations. They are
   // placed on owned, unoccupied land along the active frontline, not on enemy
   // cities. This alters starting army sizes rather than global combat stats.
   for(const [side,number] of Object.entries(config.reinforcements||{})){
     const enemies=g.stations.filter(s=>s.owner!==side);
     const approach=new Map(g.stations.filter(s=>s.owner===side).map(s=>
       [s,Math.min(...enemies.map(e=>E.distance(s,e,g)))]));
     const frontline=[...approach.keys()].sort((a,b)=>approach.get(a)-approach.get(b)).slice(0,12);
     if(!frontline.length)throw Error(ID+' missing reinforcement territory for '+side);
     const roles=['heavy','medium','assault','rocket','support'];
     for(let i=0;i<number;i++){
       const station=frontline[i%frontline.length];
       const spot=E.nearestTile(g,station,t=>!E.isSea(t)&&!E.unitAt(g,t)&&
         (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),6);
       if(!spot)throw Error(ID+' cannot place reinforcement near '+station.name);
       E.newUnit(g,E.typeFor(side,roles[i%roles.length],g),side,spot.c,spot.r,3);
     }
   }
   g.economy=remapKeys(currentEconomy,translate);
   g.tech=remapKeys(currentTech,translate);
   g.arsenal=remapKeys(currentArsenal,translate);
   g.order=[player,...SIDES.filter(s=>s!==player)];
   g.phase=player;g.player=player;g.difficulty=difficulty;g.era=ID;
   g.teams=Object.fromEntries(SIDES.map(s=>[s,s]));g.fallen={};
   g.scenario={...g.scenario,
     id:ID,title:TITLE,version:SAVE_VERSION,phase:config.phase,
     funding:remapKeys(previousFunding,translate),
     commanderSides:config.commanders,
     eliteSignatures:config.eliteSignatures||{}
   };
   for(const key of ['operationalFronts','offensiveAxes','counterattackBases']){
     if(g.scenario[key])g.scenario[key]=remapNested(g.scenario[key],translate);
   }
   g.scenario.groups=(g.scenario.groups||[]).map(gr=>({...gr,side:translate(gr.side)}));
   delete g.scenario.eliteRosters;
   g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,eliteRoster(g,side)]));
   // Named commanders belong to their alternate-history government alone.
   placeCommanders(g,player);
   // The parent battle applied Hard/Challenge before commanders were reassigned;
   // Elite was created on Normal, so it gets the whole shared setup here.
   if(difficulty==='elite'){E.prepareEliteEurope(g);E.applyScenarioDifficulty(g,difficulty);}
   else E.refreshScenarioRivals(g,difficulty);
   E.applyScenarioDifficulty(g,difficulty);
   g.startUnits=Object.fromEntries(SIDES.map(side=>[side,
     E.allUnits(g).filter(u=>u.side===side&&u.hp>0).length]));
   g.mapRevision=(g.mapRevision||0)+1;
   // The parent battle's opening report describes a different war.
   g.log=[];
   E.log(g,config.opening,player);
   return g;
 }
 function objective(g,side=g.player){
   const own=g.stations.filter(s=>s.owner===side).length;
   return 'Conquer all '+g.stations.length+' cities ('+own+'/'+g.stations.length+
     ' controlled). A side that loses its last city surrenders. There is no turn limit.';
 }
 function winner(g){
   if(g.mode!=='scenario'||g.scenario?.id!==ID||
      g.stations.length!==CITIES.length)return null;
   for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
     return {winner:side,team:side,
       reason:E.FACTIONS[side].name+' holds every city; the rival army surrenders.'};
   return null;
 }
 // Geography helpers (locate, geo, roads, rivers, relief…) come from the parent map.
 const api={...base,id:ID,title:TITLE,sides:SIDES,cityData:CITIES,
   create,onTurn:()=>false,objective,winner};
 delete api.armyGroups;delete api.operationalFronts;
 const {ai,expeditionSide,text,blurbs,...parentMeta}=base.meta||{};
 api.meta={...parentMeta,saveVersion:SAVE_VERSION,elite:true,eliteRosterOnly:true,
   map:{...(base.meta?.map||{})},
   ai:{doctrine:'europe',recovery:true},
   text:{...(text?.terrain?{terrain:text.terrain}:{}),...config.text},blurbs:config.blurbs};
 E.scenarios={...(E.scenarios||{}),
   byId:{...(E.scenarios?.byId||{}),[ID]:api}};
 if(typeof module!=='undefined')module.exports=api;
 return api;
}
root.KNIGHTMARE_ALT_HISTORY={define};
if(typeof module!=='undefined')module.exports={define};
})(typeof window!=='undefined'?window:globalThis);

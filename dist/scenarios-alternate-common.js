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
function define(config){
 const base=E.scenarios?.byId?.[config.parent];
 if(!base)throw Error('Alternate-history parent not registered: '+config.parent);
 const SIDES=Object.freeze(Object.values(config.map));
 const translate=s=>config.map[s]||s;
 const reverse=Object.fromEntries(Object.entries(config.map).map(([a,b])=>[b,a]));
 const equipment=config.equipment;
 const TITLE=config.title,ID=config.id;
 const CITIES=base.cityData.map(row=>row.map((x,i)=>i===3?translate(x):x));
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
   for(const u of E.allUnits(g)){
     const type=E.TYPES[u.type];
     u.side=translate(u.side);
     if(type?.naval==='ship'){
       u.type=equipment[u.side]==='cf'?'cf_carrier':'carrier_battleship';
     } else if(type?.naval==='amphibious'){
       u.type=equipment[u.side]==='cf'
         ?(type.tier>=2?'shui_gun_ru_ii':'shui_gun_ru')
         :(type.tier>=2?'portman_ii':'portman');
     } else if(type){
       u.type=E.typeFor(u.side,type.cls,g);
     }
     if(!E.TYPES[u.type])throw Error('Alternate history has unknown frame '+u.type);
     u.elite=null;u.eliteLevel=0;u.eliteStart=false;
     u.cmd=null;
     u.hpTech=0;
     u.hp=E.maxHP(u);
   }
   g.economy=remapKeys(currentEconomy,translate);
   g.tech=remapKeys(currentTech,translate);
   g.arsenal=remapKeys(currentArsenal,translate);
   g.order=[player,...SIDES.filter(s=>s!==player)];
   g.phase=player;g.player=player;g.difficulty=difficulty;g.era=ID;
   g.teams=Object.fromEntries(SIDES.map(s=>[s,s]));g.fallen={};
   g.scenario={...g.scenario,
     id:ID,title:TITLE,version:1,phase:config.phase,
     funding:remapKeys(previousFunding,translate),
     commanderSides:config.commanders,
     eliteNavalTypes:Object.fromEntries(SIDES.map(s=>[s,{
       amphibious:equipment[s]==='cf'?'shui_gun_ru_ii':'portman_ii'
     }]))
   };
   for(const key of ['operationalFronts','offensiveAxes','counterattackBases']){
     if(g.scenario[key])g.scenario[key]=remapNested(g.scenario[key],translate);
   }
   g.scenario.groups=(g.scenario.groups||[]).map(gr=>({...gr,side:translate(gr.side)}));
   const eliteIds=Object.keys(E.ELITE_FORCES);
   g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
     eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
       E.ELITE_FORCES[id].availableTo.includes(equipment[side]))]));
   // Named commanders belong to their alternate-history government alone.
   // Existing parent commanders are removed, not duplicated across both sides.
   for(const side of SIDES){
     const units=g.units.filter(u=>u.side===side&&E.TYPES[u.type].naval!=='ship');
     const permitted=config.commanders[side]||[];
     for(let i=0;i<Math.min(units.length,permitted.length);i++){
       const cmd=permitted[i],u=units[i];
       if(!g.officers[cmd])throw Error('Missing alternate-history commander '+cmd);
       u.cmd=cmd;u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);
     }
   }
   if(difficulty==='elite')E.prepareEliteEurope(g);
   g.startUnits=Object.fromEntries(SIDES.map(side=>[side,
     E.allUnits(g).filter(u=>u.side===side&&u.hp>0).length]));
   g.mapRevision=(g.mapRevision||0)+1;
   E.log(g,config.opening,player);
   return g;
 }
 function objective(g,side=g.player){
   return 'Conquer all '+g.stations.length+' cities ('+
     g.stations.filter(s=>s.owner===side).length+'/'+g.stations.length+
     ' controlled) and eliminate the opposing army. There is no turn limit.';
 }
 function winner(g){
   if(g.mode!=='scenario'||g.scenario?.id!==ID||
      g.stations.length!==CITIES.length)return null;
   for(const side of SIDES)if(g.stations.every(s=>s.owner===side)&&
      !E.allUnits(g).some(u=>u.side!==side&&u.hp>0))
     return {winner:side,team:side,
       reason:E.FACTIONS[side].name+' has conquered the theatre and destroyed its rival army.'};
   return null;
 }
 const api={id:ID,title:TITLE,cols:base.cols,rows:base.rows,
   sides:SIDES,bounds:base.bounds,cityData:CITIES,create,
   onTurn:()=>false,objective,winner,
   strategicScore:base.strategicScore,orderGroup:base.orderGroup};
 api.meta={saveVersion:1,elite:true,eliteRosterOnly:true,
   map:{...(base.meta?.map||{})},
   ai:{doctrine:'europe',recovery:true},
   text:config.text,blurbs:config.blurbs};
 E.scenarios={...(E.scenarios||{}),
   byId:{...(E.scenarios?.byId||{}),[ID]:api}};
 if(typeof module!=='undefined')module.exports=api;
 return api;
}
root.KNIGHTMARE_ALT_HISTORY={define};
if(typeof module!=='undefined')module.exports={define};
})(typeof window!=='undefined'?window:globalThis);

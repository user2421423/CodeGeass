#!/usr/bin/env node
'use strict';
/* Seeded full-engine AI-v-AI playtest: node tools/indochina_sim.cjs [player] [difficulty] [seed] [turns] */
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const scenario=require('../dist/scenarios-indochina.js');
const player=process.argv[2]||'britannia',difficulty=process.argv[3]||'normal';
const seed=Number(process.argv[4]||11),turns=Number(process.argv[5]||3);
if(!scenario.sides.includes(player)||!['normal','hard','challenge','elite'].includes(difficulty)||
 !Number.isInteger(seed)||!Number.isInteger(turns)||turns<1||turns>150)throw Error('Invalid Indochina simulation arguments');
const g=scenario.create(player,difficulty,seed),sides=scenario.sides;
const r={player,difficulty,seed,maxTurns:turns,startingCities:Object.fromEntries(sides.map(s=>[s,g.stations.filter(v=>v.owner===s).length])),
  startingForces:Object.fromEntries(sides.map(s=>[s,g.units.filter(v=>v.side===s).length])),
  captures:[],losses:{britannia:0,cf:0},production:{britannia:0,cf:0},attacks:{britannia:0,cf:0},
  navalActions:{britannia:0,cf:0},navalMoves:{britannia:0,cf:0},errors:[],snapshots:[],winner:null,openingStall:false};
let oldOwners=new Map(g.stations.map(s=>[s.id,s.owner])),known=new Set(g.units.map(u=>u.id)),dead=new Set();
function observe(){
 for(const city of g.stations)if(oldOwners.get(city.id)!==city.owner){
  r.captures.push({turn:g.turn,city:city.name,from:oldOwners.get(city.id),to:city.owner});oldOwners.set(city.id,city.owner);
 }
 for(const u of g.units){
  if(!known.has(u.id)){known.add(u.id);r.production[u.side]++;}
  if(u.hp<=0&&!dead.has(u.id)){dead.add(u.id);r.losses[u.side]++;}
 }
}
let end=false;
for(let turn=1;turn<=turns&&!end;turn++){
 g.turn=turn;
 for(const side of g.order){
  if(!E.alive(g,side))continue;
  if(!(turn===1&&side===g.order[0]))E.beginTurn(g,side,turn>1);
  E.aiProduction(g);observe();
  const ids=g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
    .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id).map(u=>u.id);
  for(let i=0;i<ids.length;i++){
   if(typeof E.aiNextActor==='function'){const j=E.aiNextActor(g,ids,i);if(j>i&&j<ids.length)[ids[i],ids[j]]=[ids[j],ids[i]];}
   const u=g.units.find(v=>v.id===ids[i]);
   if(!u||u.hp<=0||u.side!==side)continue;
   try{
    for(const event of E.aiOrder(g,u.id)||[]){
     if(event.kind==='attack')r.attacks[side]++;
     if(E.TYPES[u.type]?.naval&&(event.kind==='move'||event.kind==='attack'||event.kind==='deploy'))r.navalActions[side]++;
     if(E.TYPES[u.type]?.naval&&(event.kind==='move'||event.kind==='deploy'))r.navalMoves[side]++;
    }
   }catch(e){r.errors.push({turn,side,id:u.id,message:String(e)});}
   observe();
   const won=scenario.winner(g);
   if(won){r.winner=won.winner;end=true;break;}
   if(g.over)g.over=null;
  }
  if(end)break;
 }
 r.snapshots.push({turn,cities:Object.fromEntries(sides.map(s=>[s,g.stations.filter(v=>v.owner===s).length])),
  units:Object.fromEntries(sides.map(s=>[s,g.units.filter(v=>v.side===s&&v.hp>0).length]))});
}
r.openingStall=r.captures.length===0&&r.snapshots.length>=3;
console.log('INDOCHINA_SIM '+JSON.stringify(r));
if(r.errors.length)process.exitCode=1;

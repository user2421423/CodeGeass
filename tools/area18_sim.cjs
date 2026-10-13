#!/usr/bin/env node
'use strict';
// Seeded actual-game-engine three-way AI test; no scripted simulation mechanics.
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const area=require('../dist/scenarios-area18.js');
const seed=Number(process.argv[2]||17),maxTurns=Number(process.argv[3]||5);
const player=process.argv[4]||'britannia',difficulty=process.argv[5]||'normal';
if(!Number.isInteger(seed)||!Number.isInteger(maxTurns)||maxTurns<1||maxTurns>50||
  !area.sides.includes(player)||!['normal','hard','challenge','elite'].includes(difficulty))
  throw Error('usage: area18_sim.cjs <seed> <turns 1..50> <player> <difficulty>');
const g=area.create(player,difficulty,seed),SIDES=area.sides;
const zeros=()=>Object.fromEntries(SIDES.map(s=>[s,0]));
const reports={seed,player,difficulty,turns:0,winner:null,captures:[],
  attacks:zeros(),moves:zeros(),seaMoves:zeros(),landings:zeros(),errors:[],states:[]};
const owners=new Map(g.stations.map(s=>[s.id,s.owner]));
function observe(){
 for(const s of g.stations){
  const former=owners.get(s.id);
  if(former!==s.owner){reports.captures.push({turn:g.turn,city:s.name,from:former,to:s.owner});owners.set(s.id,s.owner);}
 }
}
for(let turn=1;turn<=maxTurns&&!reports.winner;turn++){
 g.turn=turn;reports.turns=turn;
 for(const side of g.order){
  if(!E.alive(g,side))continue;
  try{
   if(!(turn===1&&side===g.order[0]))E.beginTurn(g,side,turn>1);
   E.aiProduction(g);
   const ids=g.units.filter(u=>u.side===side&&u.hp>0&&!u.attacked)
     .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id)
     .map(u=>u.id);
   for(let k=0;k<ids.length;k++){
    if(typeof E.aiNextActor==='function'){
     const j=E.aiNextActor(g,ids,k);
     if(j>k&&j<ids.length)[ids[k],ids[j]]=[ids[j],ids[k]];
    }
    const unit=g.units.find(u=>u.id===ids[k]);
    if(!unit||unit.hp<=0||unit.side!==side)continue;
    const naval=!!E.TYPES[unit.type].naval;
    for(const event of E.aiOrder(g,unit.id)||[]){
     if(event.kind==='attack')reports.attacks[side]++;
     if(event.kind==='deploy')reports.landings[side]++;
     if(event.kind==='move'||event.kind==='deploy')reports[naval?'seaMoves':'moves'][side]++;
    }
    observe();
    if(area.winner(g)){reports.winner=area.winner(g).winner;break;}
    if(g.over&&!area.winner(g))g.over=null;
   }
  }catch(err){
   reports.errors.push({turn,side,error:String(err),stack:String(err.stack||'').slice(0,1000)});
   if(reports.errors.length>2)break;
  }
 }
 reports.states.push({turn,cities:Object.fromEntries(SIDES.map(s=>[s,g.stations.filter(c=>c.owner===s).length])),
  units:Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s&&u.hp>0).length]))});
 console.log('AREA18_TURN '+JSON.stringify(reports.states.at(-1)));
 if(reports.errors.length>2)break;
}
console.log('AREA18_RESULT '+JSON.stringify(reports));
if(reports.errors.length)process.exitCode=1;

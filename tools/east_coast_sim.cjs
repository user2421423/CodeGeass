#!/usr/bin/env node
'use strict';
// Focused seeded full-AI exercise, not a regression suite.
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const S=require('../dist/scenarios-east-coast.js');
const maxTurns=Number(process.argv[2]||3);
const difficultyFilter=process.argv[3]||'all';
const playerFilter=process.argv[4]||'all';
const difficulties=['normal','hard','challenge','elite'];
const seeds=[11,71];
if(!Number.isInteger(maxTurns)||maxTurns<1||maxTurns>20||!['all',...difficulties].includes(difficultyFilter)||!['all',...S.sides].includes(playerFilter))throw Error('usage: node tools/east_coast_sim.cjs [turns] [all|normal|hard|challenge|elite] [all|eu|britannia]');
const reports=[];
for(const difficulty of difficulties.filter(x=>difficultyFilter==='all'||difficultyFilter===x))for(const player of S.sides.filter(x=>playerFilter==='all'||playerFilter===x))for(const seed of seeds){
 const g=S.create(player,difficulty,seed),
   result={difficulty,player,seed,turns:0,citiesCaptured:0,EUBeachLandings:0,
    EUCarrierMoves:0,BritannianCounterattacks:0,attacks:0,errors:[],cities:{},winner:null};
 const previous=new Map(g.stations.map(s=>[s.id,s.owner]));
 for(let turn=1;turn<=maxTurns;turn++){
  result.turns=turn;g.turn=turn;
  for(const side of g.order){
   if(!E.alive(g,side))continue;
   try{
    if(!(turn===1&&side===g.order[0]))E.beginTurn(g,side,turn>1);
    g.phase=side;E.aiProduction(g);
    const ids=g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
      .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id).map(u=>u.id);
    for(let k=0;k<ids.length;k++){
     if(typeof E.aiNextActor==='function'){const j=E.aiNextActor(g,ids,k);if(j>k&&j<ids.length)[ids[k],ids[j]]=[ids[j],ids[k]];}
     const u=g.units.find(v=>v.id===ids[k]);if(!u||u.hp<=0||u.side!==side)continue;
     const events=E.aiOrder(g,u.id)||[];
     for(const e of events){
      if(e.kind==='deploy'&&side==='eu')result.EUBeachLandings++;
      if(e.kind==='move'&&side==='eu'&&E.TYPES[u.type]?.naval==='ship')result.EUCarrierMoves++;
      if(e.kind==='attack'){result.attacks++;if(side==='britannia')result.BritannianCounterattacks++;}
     }
     for(const c of g.stations)if(c.owner!==previous.get(c.id)){result.citiesCaptured++;previous.set(c.id,c.owner);}
     if(g.over && !S.winner(g))g.over=null;
    }
   }catch(error){result.errors.push({turn,side,message:String(error)});break;}
  }
  if(result.errors.length||S.winner(g))break;
 }
 result.winner=S.winner(g)?.winner||null;
 result.cities=Object.fromEntries(S.sides.map(s=>[s,g.stations.filter(c=>c.owner===s).length]));
 reports.push(result);console.log('EAST_COAST_SIM '+JSON.stringify(result));
}
const total={runs:reports.length,failed:reports.filter(r=>r.errors.length).length,
 landings:reports.reduce((n,r)=>n+r.EUBeachLandings,0),
 carrierMoves:reports.reduce((n,r)=>n+r.EUCarrierMoves,0),
 battles:reports.reduce((n,r)=>n+r.attacks,0),
 captures:reports.reduce((n,r)=>n+r.citiesCaptured,0)};
console.log('EAST_COAST_SIM_TOTAL '+JSON.stringify(total));
if(total.failed)process.exitCode=1;

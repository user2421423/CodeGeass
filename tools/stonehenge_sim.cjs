#!/usr/bin/env node
'use strict';
/* All-AI engine simulation: two seeds x all factions x all difficulties. */
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/europe-landmask.js');
const scenario=require('../dist/scenarios-stonehenge.js');
const turns=Number(process.argv[2]||6);
const perspective=process.argv[3]||'all',difficultyFilter=process.argv[4]||'all';
const seeds=[11,71],difficulties=['normal','hard','challenge','elite'];
if(!Number.isInteger(turns)||turns<1||turns>30||
 !['all',...scenario.sides].includes(perspective)||
 !['all',...difficulties].includes(difficultyFilter))
 throw Error('usage: node tools/stonehenge_sim.cjs <turns 1..30> [all|britannia|eb|eu] [all|normal|hard|challenge|elite]');
const report=[];
for(const difficulty of difficulties.filter(d=>difficultyFilter==='all'||difficultyFilter===d))
 for(const player of scenario.sides.filter(s=>perspective==='all'||perspective===s))
 for(const seed of seeds){
 const g=scenario.create(player,difficulty,seed),captures=[],failures=[];
 const prior=new Map(g.stations.map(s=>[s.id,s.owner]));
 const moves=Object.fromEntries(scenario.sides.map(s=>[s,0])),
   navalMoves=Object.fromEntries(scenario.sides.map(s=>[s,0])),
   amphibiousBeachings=Object.fromEntries(scenario.sides.map(s=>[s,0])),
   landings=Object.fromEntries(scenario.sides.map(s=>[s,0])),
   attacks=Object.fromEntries(scenario.sides.map(s=>[s,0]));
 const record=()=>{for(const c of g.stations)if(c.owner!==prior.get(c.id)){
  captures.push({turn:g.turn,city:c.name,from:prior.get(c.id),to:c.owner});prior.set(c.id,c.owner);
 }};
 for(let t=1;t<=turns&&!scenario.winner(g);t++){
  g.turn=t;
  for(const side of g.order){
   if(!E.alive(g,side))continue;
   try{
    if(!(t===1&&side===g.order[0]))E.beginTurn(g,side,t>1);
    g.phase=side;
    E.aiProduction(g);
    const ids=g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
     .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id).map(u=>u.id);
    for(let step=0;step<ids.length;step++){
     if(typeof E.aiNextActor==='function'){
      const next=E.aiNextActor(g,ids,step);
      if(next>step&&next<ids.length)[ids[step],ids[next]]=[ids[next],ids[step]];
     }
     const u=g.units.find(v=>v.id===ids[step]);
     if(!u||u.hp<=0||u.side!==side)continue;
     const events=E.aiOrder(g,u.id)||[];
     for(const e of events){
      if(e.kind==='attack')attacks[side]++;
      if(e.kind==='deploy')landings[side]++;
      if(e.kind==='move'){
       moves[side]++;
       if(E.TYPES[u.type]?.naval==='ship')navalMoves[side]++;
       if(E.TYPES[u.type]?.naval==='amphibious' &&
         E.tile(g,e.from.c,e.from.r)?.terrain==='sea' &&
         E.tile(g,e.to.c,e.to.r)?.terrain!=='sea')
         amphibiousBeachings[side]++;
      }
     }
     record();
     if(scenario.winner(g))break;
     if(g.over&&!scenario.winner(g))g.over=null;
    }
   }catch(error){failures.push({turn:t,side,error:String(error)});
    break;
   }
  }
 }
 const final=Object.fromEntries(scenario.sides.map(s=>[s,g.stations.filter(c=>c.owner===s).length]));
 const first={player,difficulty,seed,turns,cities:final,captures:captures.length,
  coastalCaptures:captures.filter(c=>['Brest','Southampton','Bordeaux','Rotterdam','London','Liverpool'].includes(c.city)).length,
  britCaptures:captures.filter(c=>c.to==='britannia').length,
  eastCaptures:captures.filter(c=>c.to==='eb').length,
  ai:{moves,navalMoves,landings,amphibiousBeachings,attacks},
  winner:scenario.winner(g)?.winner||null,errors:failures};
 report.push(first);
 console.log('STONEHENGE_SIM '+JSON.stringify(first));
}
const totals={runs:report.length,failed:report.filter(r=>r.errors.length).length,
 britishNavalLandings:report.reduce((n,r)=>n+r.ai.landings.britannia,0),
 britishAmphibiousBeachings:report.reduce((n,r)=>n+r.ai.amphibiousBeachings.britannia,0),
 britishCarrierMoves:report.reduce((n,r)=>n+r.ai.navalMoves.britannia,0),
 britannianCaptures:report.reduce((n,r)=>n+r.britCaptures,0),
 euroBritannianCaptures:report.reduce((n,r)=>n+r.eastCaptures,0)};
console.log('STONEHENGE_TOTAL '+JSON.stringify(totals));
if(totals.failed)process.exitCode=1;

#!/usr/bin/env node
'use strict';
/* Actual-engine, unmodified AI versus AI naval invasion smoke/balance check. */
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const siberia=require('../dist/scenarios-siberia.js');
const seed=Number(process.argv[2]||11),maxTurns=Number(process.argv[3]||3),player=process.argv[4]||'britannia';
if(!Number.isInteger(seed)||!Number.isInteger(maxTurns)||maxTurns<1||maxTurns>50)
  throw Error('usage: node tools/siberia_sim.cjs [seed] [turns 1..50] [britannia|eu]');
if(!['britannia','eu'].includes(player))throw Error('Expected Britannia or E.U.');
const g=siberia.create(player,'normal',seed);
const types=id=>E.TYPES[g.units.find(u=>u.id===id)?.type]?.naval||null;
const metrics={turns:0,seed,player,startingCities:Object.fromEntries(siberia.sides.map(side=>[side,g.stations.filter(s=>s.owner===side).length])),
  navalMoves:{britannia:0,eu:0},groundMoves:{britannia:0,eu:0},
  attacks:{britannia:0,eu:0},deployments:{britannia:0,eu:0},
  captures:[],errors:[],snapshots:[]};
const owners=new Map(g.stations.map(s=>[s.id,s.owner]));
function observe(){
  for(const s of g.stations){
    const last=owners.get(s.id);
    if(last!==s.owner){
      metrics.captures.push({turn:g.turn,name:s.name,from:last,to:s.owner});
      owners.set(s.id,s.owner);
    }
  }
}
let stopped=false;
for(let turn=1;turn<=maxTurns&&!stopped;turn++){
  g.turn=turn;metrics.turns=turn;
  for(const side of g.order){
    if(!E.alive(g,side))continue;
    if(!(turn===1&&side===g.order[0]))E.beginTurn(g,side,turn>1);
    E.aiProduction(g);
    let ids=g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
      .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id)
      .map(u=>u.id);
    for(let i=0;i<ids.length;i++){
      if(typeof E.aiNextActor==='function'){
        const index=E.aiNextActor(g,ids,i);
        if(index>i&&index<ids.length)[ids[i],ids[index]]=[ids[index],ids[i]];
      }
      const u=g.units.find(v=>v.id===ids[i]);
      if(!u||u.hp<=0||u.side!==side)continue;
      try{
        for(const event of E.aiOrder(g,u.id)||[]){
          if(event.kind==='attack')metrics.attacks[side]++;
          if(event.kind==='deploy')metrics.deployments[side]++;
          if(event.kind==='move'||event.kind==='deploy'){
            if(types(event.id))metrics.navalMoves[side]++;
            else metrics.groundMoves[side]++;
          }
        }
      }catch(error){metrics.errors.push({turn,side,id:ids[i],error:String(error)});
        if(metrics.errors.length>10)throw Error('AI action error threshold exceeded');
      }
      observe();
      if(siberia.winner(g)){stopped=true;break;}
      if(g.over&&!siberia.winner(g))g.over=null;
    }
    if(stopped)break;
  }
  metrics.snapshots.push({turn,cities:Object.fromEntries(siberia.sides.map(s=>
    [s,g.stations.filter(city=>city.owner===s).length])),
    ships:Object.fromEntries(siberia.sides.map(s=>
    [s,g.units.filter(u=>u.side===s&&u.hp>0&&E.TYPES[u.type].naval==='ship').length]))});
  console.log('TURN '+JSON.stringify(metrics.snapshots.at(-1)));
}
console.log('RESULT_JSON '+JSON.stringify(metrics));
if(metrics.errors.length)process.exitCode=1;

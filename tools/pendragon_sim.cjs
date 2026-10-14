#!/usr/bin/env node
'use strict';
// Actual engine, production and AI order simulation. No simulated/fake combat.
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const W=require('../dist/scenarios-pendragon.js');
const seed=Number(process.argv[2]||11),maxTurns=Number(process.argv[3]||6);
const player=process.argv[4]||'eu',difficulty=process.argv[5]||'normal';
if(!Number.isInteger(seed)||!Number.isInteger(maxTurns)||maxTurns<1||maxTurns>40||
   !W.sides.includes(player)||!['normal','hard','challenge','elite'].includes(difficulty))
  throw Error('usage: node tools/pendragon_sim.cjs SEED TURNS britannia|eu normal|hard|challenge|elite');
const g=W.create(player,difficulty,seed),owners=new Map(g.stations.map(s=>[s.id,s.owner]));
const stats={seed,player,difficulty,requestedTurns:maxTurns,turns:0,captures:[],
  moves:{britannia:0,eu:0},attacks:{britannia:0,eu:0},
  produced:{britannia:0,eu:0},errors:[],snapshots:[],winner:null};
let previous=g.units.length;
outer:for(let turn=1;turn<=maxTurns;turn++){
  stats.turns=turn;g.turn=turn;
  for(const side of g.order){
    if(!E.alive(g,side))continue;
    try{
      if(!(turn===1&&side===g.order[0]))E.beginTurn(g,side,turn>1);
      const n=g.units.length;E.aiProduction(g);
      stats.produced[side]+=Math.max(0,g.units.length-n);
    }catch(e){stats.errors.push({turn,side,step:'turn start',reason:String(e)});break outer;}
    const ids=g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
      .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id).map(u=>u.id);
    for(let i=0;i<ids.length;i++){
      if(typeof E.aiNextActor==='function'){
        const next=E.aiNextActor(g,ids,i);
        if(next>i&&next<ids.length)[ids[i],ids[next]]=[ids[next],ids[i]];
      }
      const u=g.units.find(v=>v.id===ids[i]);
      if(!u||u.hp<=0||u.side!==side)continue;
      try{
        const events=E.aiOrder(g,u.id)||[];
        for(const event of events){
          if(event.kind==='move'||event.kind==='deploy')stats.moves[side]++;
          if(event.kind==='attack')stats.attacks[side]++;
        }
        for(const city of g.stations){
          const before=owners.get(city.id);
          if(before!==city.owner){
            stats.captures.push({turn,city:city.name,from:before,to:city.owner});
            owners.set(city.id,city.owner);
          }
        }
        const win=W.winner(g);
        if(win){stats.winner=win.winner;break outer;}
        // Full AI-vs-AI is not ended by a human-specific loss screen.
        if(g.over&&!win)g.over=null;
      }catch(e){stats.errors.push({turn,side,unit:u.id,reason:String(e)});
        if(stats.errors.length>=3)break outer;}
    }
  }
  stats.snapshots.push({turn,cities:Object.fromEntries(W.sides.map(side=>
    [side,g.stations.filter(s=>s.owner===side).length])),
    moves:{...stats.moves},attacks:{...stats.attacks}});
  console.log('PENDRAGON_TURN '+JSON.stringify(stats.snapshots.at(-1)));
}
stats.finalCities=Object.fromEntries(W.sides.map(s=>
  [s,g.stations.filter(c=>c.owner===s).length]));
console.log('PENDRAGON_SIM '+JSON.stringify(stats));
if(stats.errors.length)process.exitCode=1;

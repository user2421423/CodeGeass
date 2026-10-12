#!/usr/bin/env node
'use strict';
// Read-only, actual-engine, all-AI Division of Japan benchmark.
// The selected player receives the normal player-side economy/starting forces;
// the two rivals receive that difficulty's AI bonuses. We use the actual
// E.aiProduction and E.aiOrder functions on every faction in the game.
const fs = require('node:fs');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/scenarios.js');
const division = require('../dist/scenarios-division-japan.js');

const SIDES = ['britannia', 'eu', 'cf'];
const PLAYER = process.argv[2] || 'britannia';
const DIFFICULTY = process.argv[3] || 'normal';
const SEEDS = (process.argv[4] || '11,43').split(',').map(Number);
const MAX_TURNS = Number(process.argv[5] || 45);
const OUT = process.argv[6] || 'division-balance-results.json';
const SNAPSHOTS = new Set([1, 5, 10, 15, 20, 30, 40, 45, 50, 60, 80, 100]);
if (!SIDES.includes(PLAYER) ||
 !['normal', 'hard', 'challenge', 'elite'].includes(DIFFICULTY) ||
 SEEDS.some(seed => !Number.isInteger(seed)) ||
 !Number.isInteger(MAX_TURNS) || MAX_TURNS < 1 || MAX_TURNS > 150)
  throw Error('Bad benchmark args');
function counts(g) {
 const out = {};
 for (const side of SIDES) {
   const units = g.units.filter(u=>u.side===side && u.hp>0);
   out[side] = {
     cities:g.stations.filter(s=>s.owner===side).length,
     land:units.filter(u=>!E.TYPES[u.type].naval).length,
     naval:units.filter(u=>!!E.TYPES[u.type].naval).length,
     totalFrames:units.reduce((a,u)=>a+u.stack,0),
     hp:Math.round(units.reduce((a,u)=>a+u.hp,0)),
     credits:Math.round(g.economy?.[side]?.credits||0)
   };
 }
 return out;
}
function play(seed) {
 const g = division.create(PLAYER,DIFFICULTY,seed);
 if (g.stations.length!==44 || ![84,92].includes(g.units.length)) throw Error('Unexpected starting setup');
 const start = counts(g);
 const snapshots = [];
 const transfers = [];
 const attacks = Object.fromEntries(SIDES.map(s=>[s,0]));
 const moves = Object.fromEntries(SIDES.map(s=>[s,0]));
 const deaths = Object.fromEntries(SIDES.map(s=>[s,0]));
 const seen = new Map(g.units.map(u=>[u.id,u.side]));
 const oldOwner = new Map(g.stations.map(s=>[s.id,s.owner]));
 let playerEliminatedTurn=null, winner=null, winTurn=null, errors=0;
 const startMs=Date.now();
 const observe = turn => {
   for(const s of g.stations) {
     const old=oldOwner.get(s.id);
     if(old!==s.owner) {
       transfers.push({turn,city:s.name,from:old,to:s.owner});
       oldOwner.set(s.id,s.owner);
     }
   }
   for(const u of g.units)if(!seen.has(u.id))seen.set(u.id,u.side);
   if(playerEliminatedTurn===null && g.stations.every(s=>s.owner!==PLAYER))
     playerEliminatedTurn=turn;
   const victory=division.winner(g);
   if(victory) {winner=victory.winner;winTurn=turn;}
   // Game UI terminates at player elimination. This observer must continue
   // to determine what the two surviving powers do, without changing AI rules.
   if(g.over && !victory)g.over=null;
   return !!victory;
 };
 let played=0;
 outer: for(let turn=1;turn<=MAX_TURNS;turn++){
   g.turn=turn;played=turn;
   for(const side of g.order) {
     if(!E.alive(g,side)) continue;
     // The starting human player's units are already refreshed, as in UI.
     if(!(turn===1 && side===g.order[0])) E.beginTurn(g,side,turn>1);
     if(observe(turn))break outer;
     E.aiProduction(g);
     if(observe(turn))break outer;
     const ids=g.units.filter(u=>u.hp>0 && u.side===side && !u.attacked)
        .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id)
        .map(u=>u.id);
     for(let step=0;step<ids.length;step++){
       // Mirror the live turn handler's bounded per-move reprioritisation.
       if(typeof E.aiNextActor==='function'){
         const next=E.aiNextActor(g,ids,step);
         if(next!==step && next>=step && next<ids.length)
           [ids[step],ids[next]]=[ids[next],ids[step]];
       }
       const id=ids[step],u=g.units.find(x=>x.id===id);
       if(!u ||u.hp<=0||u.side!==side)continue;
       try {
         const events=E.aiOrder(g,id)||[];
         for(const event of events) {
           if(event.kind==='attack')attacks[side]++;
           if(event.kind==='move'||event.kind==='deploy')moves[side]++;
         }
       }catch(err){
         errors++;
         if(errors<=3)console.error('AI_ERROR '+JSON.stringify({seed,turn,side,id,error:String(err)}));
       }
       if(observe(turn))break outer;
     }
   }
   if(SNAPSHOTS.has(turn)) snapshots.push({turn,counts:counts(g),captures:transfers.length});
   if(turn%10===0)console.log('PROGRESS '+JSON.stringify({player:PLAYER,difficulty:DIFFICULTY,seed,turn,cities:Object.fromEntries(SIDES.map(s=>[s,counts(g)[s].cities])),elapsedSeconds:Math.round((Date.now()-startMs)/1000)}));
 }
 if(!snapshots.some(x=>x.turn===played)) snapshots.push({turn:played,counts:counts(g),captures:transfers.length});
 const remaining = new Set(g.units.filter(u=>u.hp>0).map(u=>u.id));
 for(const [id,side] of seen)if(!remaining.has(id))deaths[side]++;
 const end=counts(g);
 return {
   player:PLAYER,difficulty:DIFFICULTY,seed,turnsPlayed:played,
   winner,winTurn,playerEliminatedTurn,
   start,end,snapshots,attacks,moves,deaths,
   captures:transfers.length,firstCaptures:transfers.slice(0,30),
   errorCount:errors,elapsedSeconds:Math.round((Date.now()-startMs)/1000)
 };
}
const results=[];
for(const seed of SEEDS){
 const r=play(seed);results.push(r);
 console.log('RESULT_JSON '+JSON.stringify(r));
 fs.writeFileSync(OUT,JSON.stringify({player:PLAYER,difficulty:DIFFICULTY,maxTurns:MAX_TURNS,results},null,2));
}
console.log('BENCHMARK_DONE '+JSON.stringify({
 player:PLAYER,difficulty:DIFFICULTY,games:results.length,
 resolved:results.filter(r=>r.winner).length,
 winners:Object.fromEntries(SIDES.map(s=>[s,results.filter(r=>r.winner===s).length])),
 endingCities:Object.fromEntries(SIDES.map(s=>[s,+(results.reduce((n,r)=>n+r.end[s].cities,0)/results.length).toFixed(2)])),
 eliminated:results.filter(r=>r.playerEliminatedTurn!==null).length,
 errors:results.reduce((n,r)=>n+r.errorCount,0),
 seconds:results.reduce((n,r)=>n+r.elapsedSeconds,0)
}));
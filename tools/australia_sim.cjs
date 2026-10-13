#!/usr/bin/env node
'use strict';
// Read-only, actual-engine 50-turn Australian balance simulation.
// Both sides are AI-controlled. The chosen "player" affects turn order only.
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const scenario=require('../dist/scenarios-australia.js');
const SEED=Number(process.argv[2]||11);
const MAX_TURNS=Number(process.argv[3]||24);
const PLAYER=process.argv[4]||'britannia';
const DIFFICULTY=process.argv[5]||'normal';
if(!Number.isInteger(SEED)||!Number.isInteger(MAX_TURNS)||MAX_TURNS<1||MAX_TURNS>50||
  !scenario.sides.includes(PLAYER)||!['normal','hard','challenge','elite'].includes(DIFFICULTY))
  throw Error('Usage: node tools/australia_long_balance.cjs <seed> <turns 1..50> <britannia|cf|eu> <normal|hard|challenge|elite>');

const g=scenario.create(PLAYER,DIFFICULTY,SEED);
const SIDES=scenario.sides;
const values=()=>Object.fromEntries(SIDES.map(s=>[s,0]));
const total={seed:SEED,player:PLAYER,difficulty:DIFFICULTY,requestedTurns:MAX_TURNS,
  actualTurns:0,winner:null,winTurn:null,errorCount:0,errors:[],
  movements:{land:values(),naval:values()},attacks:values(),
  landings:values(),produced:values(),destroyed:values(),
  opening:Object.fromEntries(SIDES.map(s=>[s,{cities:g.stations.filter(c=>c.owner===s).length,units:g.units.filter(u=>u.side===s).length}])),
  captures:[],snapshots:[],elapsedSeconds:0};
const owner=new Map(g.stations.map(s=>[s.id,s.owner]));
const everSeen=new Map(g.units.map(u=>[u.id,u.side]));
const lost=new Set();
const startTime=Date.now();
const LIVE=u=>u.hp>0;
// Units aboard a carrier are alive but temporarily absent from g.units.
const allUnits=()=>g.units.flatMap(u=>u.cargo?.length?[u,...u.cargo]:[u]);
function observe(){
  for(const city of g.stations){
    const before=owner.get(city.id);
    if(before!==city.owner){
      total.captures.push({turn:g.turn,city:city.name,from:before,to:city.owner});
      owner.set(city.id,city.owner);
    }
  }
  const every=allUnits();
  for(const u of every) if(!everSeen.has(u.id)) {
    everSeen.set(u.id,u.side);if(total.produced[u.side]!=null)total.produced[u.side]++;
  }
  const current=new Map(every.map(u=>[u.id,u]));
  for(const [id,side] of everSeen){
    if(lost.has(id))continue;
    const u=current.get(id);
    if(!u || !LIVE(u)){
      lost.add(id);if(total.destroyed[side]!=null)total.destroyed[side]++;
    }
  }
}
function snapshot(turn){
  const counts={};
  for(const s of SIDES) {
    const us=allUnits().filter(u=>LIVE(u)&&u.side===s);
    const ships=us.filter(u=>E.TYPES[u.type]?.naval==='ship');
    const amphibious=us.filter(u=>E.TYPES[u.type]?.naval==='amphibious');
    const land=us.filter(u=>!E.TYPES[u.type]?.naval);
    counts[s]={cities:g.stations.filter(c=>c.owner===s).length,
      units:us.length,ships:ships.length,amphibious:amphibious.length,
      ground:land.length,frames:us.reduce((v,u)=>v+u.stack,0),
      credits:Math.round(g.economy[s]?.credits||0),
      industry:Math.round(g.economy[s]?.industry||0),
      ports:g.stations.filter(c=>c.portOwner===s&&c.portLevel>0).length};
  }
  const result={turn,sides:counts,captures:total.captures.length,
    attacks:{...total.attacks},navalMoves:{...total.movements.naval},
    landings:{...total.landings},destroyed:{...total.destroyed}};
  total.snapshots.push(result);
  console.log('BERING_PROGRESS '+JSON.stringify(result));
}
function unitsOf(side){
  return g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
    .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id)
    .map(u=>u.id);
}
let finished=false;
for(let turn=1;turn<=MAX_TURNS && !finished;turn++){
  g.turn=turn;total.actualTurns=turn;
  for(const side of g.order){
    if(!E.alive(g,side))continue;
    try {
      if(!(turn===1&&side===g.order[0]))E.beginTurn(g,side,turn>1);
      E.aiProduction(g);
      observe();
    }catch(e) {
      total.errors.push({turn,side,phase:'start/production',error:String(e)});
      total.errorCount++;
      finished=true;break;
    }
    const ids=unitsOf(side);
    for(let step=0;step<ids.length;step++){
      if(typeof E.aiNextActor==='function'){
        const next=E.aiNextActor(g,ids,step);
        if(next>step&&next<ids.length)[ids[step],ids[next]]=[ids[next],ids[step]];
      }
      const id=ids[step],u=g.units.find(v=>v.id===id);
      if(!u||u.hp<=0||u.side!==side)continue;
      const naval=!!E.TYPES[u.type]?.naval;
      try {
        const events=E.aiOrder(g,id)||[];
        for(const e of events){
          if(e.kind==='attack')total.attacks[side]++;
          if(e.kind==='deploy')total.landings[side]++;
          if(e.kind==='move'||e.kind==='deploy')
            total.movements[naval?'naval':'land'][side]++;
        }
        observe();
      }catch(e){
        total.errors.push({turn,side,id,error:String(e)});
        total.errorCount++;
        if(total.errorCount>=5){finished=true;break;}
      }
      const win=scenario.winner(g);
      if(win){total.winner=win.winner;total.winTurn=turn;finished=true;break;}
      // The human loss overlay should not stop a read-only all-AI simulation.
      if(g.over&&!win)g.over=null;
    }
    if(finished)break;
  }
  if(turn===1||turn%5===0||turn===MAX_TURNS||finished) snapshot(turn);
}
total.elapsedSeconds=Math.round((Date.now()-startTime)/1000);
total.final=total.snapshots.at(-1)?.sides;
total.captureCount=total.captures.length;
total.uniqueCitiesCaptured=new Set(total.captures.map(v=>v.city)).size;
total.stalled=(total.captureCount===0 || (total.lastCaptureTurn!=null && total.actualTurns-total.lastCaptureTurn>=12));
total.winRateSample={note:'One seeded match; aggregate multiple seed/player runs before estimating faction win rates.',winner:total.winner};
total.firstCaptureTurn=total.captures[0]?.turn??null;
total.lastCaptureTurn=total.captures.at(-1)?.turn??null;
console.log('BERING_LONG_RESULT '+JSON.stringify(total));
if(total.errorCount)process.exitCode=1;

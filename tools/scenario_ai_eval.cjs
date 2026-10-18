#!/usr/bin/env node
'use strict';
/* Seeded full-engine AI-v-AI playtest of any regional scenario:
     node tools/scenario_sim.cjs <scenario-id> [player] [difficulty] [seed] [turns]
   Refactoring baseline: one fingerprint line per scenario, side and difficulty after setup, and per scenario
   and side after a seeded all-AI game. A pure refactor must reproduce tools/data/sim_baseline.txt exactly:
     node tools/scenario_sim.cjs --all [seed] [turns] [scenario-id ...] > /tmp/now.txt
     diff tools/data/sim_baseline.txt /tmp/now.txt
   Listing scenario IDs limits the run to them, so it can be split across processes. */
const fs=require('node:fs');
const path=require('node:path');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const DIST=path.join(__dirname,'../dist');
for(const f of fs.readdirSync(DIST).filter(f=>/^(scenarios.*|.*-landmask|.*-geography)\.js$/.test(f)).sort())
  require(path.join(DIST,f));
const DIFFICULTIES=['normal','hard','challenge','elite'];

function simulate(scenario,player,difficulty,seed,turns){
 const g=scenario.create(player,difficulty,seed),sides=scenario.sides;
 g.aiDefenseTrace = {};
 const zeros=()=>Object.fromEntries(sides.map(s=>[s,0]));
 const r={scenario:scenario.id,player,difficulty,seed,maxTurns:turns,
  startingCities:Object.fromEntries(sides.map(s=>[s,g.stations.filter(v=>v.owner===s).length])),
  startingForces:Object.fromEntries(sides.map(s=>[s,g.units.filter(v=>v.side===s).length])),
  captures:[],losses:zeros(),production:zeros(),attacks:zeros(),
  navalActions:zeros(),navalMoves:zeros(),errors:[],snapshots:[],winner:null,firstOver:null,openingStall:false};
 let oldOwners=new Map(g.stations.map(s=>[s.id,s.owner])),known=new Set(g.units.map(u=>u.id)),
  previousAlive=new Map(g.units.filter(u=>u.hp>0).map(u=>[u.id,u.side]));
 function observe(){
  for(const city of g.stations)if(oldOwners.get(city.id)!==city.owner){
   r.captures.push({turn:g.turn,city:city.name,from:oldOwners.get(city.id),to:city.owner});oldOwners.set(city.id,city.owner);
  }
  const living=new Map();
  // Units aboard a carrier are alive but temporarily absent from g.units.
  for(const u of g.units.flatMap(u=>[u,...(u.cargo||[])])){
   if(!known.has(u.id)){known.add(u.id);r.production[u.side]++;}
   if(u.hp>0)living.set(u.id,u.side);
  }
  for(const [id,side] of previousAlive)if(!living.has(id))r.losses[side]++;
  previousAlive=living;
 }
 let end=false;
 for(let turn=1;turn<=turns&&!end;turn++){
  g.turn=turn;
  if(turn>1)scenario.onTurn?.(g);
  for(const side of g.order){
   if(!E.alive(g,side))continue;
   if(!(turn===1&&side===g.order[0]))E.beginTurn(g,side,turn>1);
   E.aiProduction(g);observe();
   const ids=g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
     .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id).map(u=>u.id);
   for(let i=0;i<ids.length;i++){
    const j=E.aiNextActor(g,ids,i);if(j>i&&j<ids.length)[ids[i],ids[j]]=[ids[j],ids[i]];
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
    // Full AI-vs-AI is not ended by a human-specific loss screen, but the first one is recorded.
    if(g.over){r.firstOver??=g.over.reason||'over';g.over=null;}
   }
   if(end)break;
  }
  r.snapshots.push({turn,cities:Object.fromEntries(sides.map(s=>[s,g.stations.filter(v=>v.owner===s).length])),
   units:Object.fromEntries(sides.map(s=>[s,g.units.filter(v=>v.side===s&&v.hp>0).length]))});
 }
 const traces = Object.fromEntries(sides.map(side => [side, (g.aiDefenseTrace[side] || []).reduce(
   (acc,t) => {
     acc.frontTurns += t.fronts.length;
     if(t.fronts.length) acc.activeTurns++;
     acc.budgetStrengthTurns += t.budget || 0;
     acc.defendingStrengthTurns += t.defendingStrength || 0;
     acc.offensiveStrengthTurns += t.offensiveStrength || 0;
     acc.dynamicCityCount += t.fronts.length;
     acc.defensiveBuilds += t.defensiveBuilds || 0;
     acc.offensiveBuilds += t.offensiveBuilds || 0;
     acc.defensiveFactorySelections += Object.values(t.factorySelections || {}).filter(Boolean).length;
     acc.factorySelections += Object.keys(t.factorySelections || {}).length;
     for(const f of t.fronts) acc.cities[f.city]=(acc.cities[f.city]||0)+1;
     return acc;
   }, {frontTurns:0,activeTurns:0,budgetStrengthTurns:0,defendingStrengthTurns:0,
     offensiveStrengthTurns:0,dynamicCityCount:0,defensiveBuilds:0,offensiveBuilds:0,
     defensiveFactorySelections:0,factorySelections:0,cities:{}})]));
 r.aiTrace=traces;
  r.openingStall=r.captures.length===0&&r.snapshots.length>=3;
 return {r,g};
}
// FNV-1a over the whole serialized state: any change in any field changes the fingerprint.
function fingerprint(value){
 const s=JSON.stringify(value);let h=0x811c9dc5;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
 return h.toString(16).padStart(8,'0');
}

const id=process.argv[2], scenario=E.scenarios.byId[id];
if(!scenario)throw Error('Scenario not registered: '+id);
const player=process.argv[3]||scenario.sides[0];
const difficulty=process.argv[4]||'normal';
const seed=Number(process.argv[5]||11), turns=Number(process.argv[6]||50);
if(!Number.isInteger(turns)||turns<1||turns>150)throw Error('Turn range 1..150');
const start=Date.now();
const {r}=simulate(scenario,player,difficulty,seed,turns);
const last=r.snapshots.at(-1)||{}, capturesBySide={};
for(const capture of r.captures)capturesBySide[capture.to]=(capturesBySide[capture.to]||0)+1;
const checkpoint=r.snapshots.filter(s=>[10,20,30,40,50,60].includes(s.turn));
console.log('AI_EVAL '+JSON.stringify({
 version:process.env.AI_VERSION||'unknown',scenario:id,player,difficulty,seed,turns,
 completed:last.turn||0,elapsedSeconds:Math.round((Date.now()-start)/1000),
 winner:r.winner,endingCities:last.cities||{},endingUnits:last.units||{},
 captures:r.captures.length,capturesBySide,losses:r.losses,
 production:r.production,attacks:r.attacks,errors:r.errors.length,
 defense:r.aiTrace,checkpoint,
}));
if(r.errors.length)process.exitCode=1;

#!/usr/bin/env node
'use strict';
/**
 * Configurable regional tournament on top of scenario_sim.cjs.
 * Reads the real game engine; never substitutes different AI/combat rules.
 * Output rows are deterministic for matching args/repository revision.
 */
const path=require('node:path');
const {simulate,scenarios,DIFFICULTIES,engine:E}=require('./scenario_sim.cjs');
const stats=require('./tournament_stats.cjs');
const has=f=>process.argv.includes(f);
const get=(f,defaultValue)=>{
 const i=process.argv.indexOf(f);return i===-1?defaultValue:process.argv[i+1];
};
function numbers(raw,label,min,max){
 const result=String(raw).split(',').map(v=>Number(v.trim()));
 if(!result.length||result.some(n=>!Number.isSafeInteger(n)||n<min||n>max))
  throw Error(label+' must be comma-separated integers from '+min+' to '+max);
 return [...new Set(result)];
}
function words(raw){return String(raw).split(',').map(s=>s.trim()).filter(Boolean);}
function parse(argv=process.argv.slice(2)){
 // parse is intentionally independent of the main process argv for unit tests.
 const read=(k,d)=>{const i=argv.indexOf(k);return i<0?d:argv[i+1]};
 const list=(k,d)=>words(read(k,d));
 const seeds=argv.includes('--seeds')?numbers(read('--seeds',''),'--seeds',0,0xffffffff):
  Array.from({length:numbers(read('--seed-count','2'),'--seed-count',1,100)[0]},
   (_,i)=>numbers(read('--seed-base','11'),'--seed-base',0,0xffffffff)[0]+i);
 if(seeds.some(n=>n>0xffffffff))throw Error('Seed range exceeds 32-bit unsigned integer');
 const opts={
  scenarios:list('--scenarios','all').sort(),
  players:list('--players','all').sort(),
  difficulties:list('--difficulties','normal,hard,challenge,elite'),
  seeds,turns:numbers(read('--turns','5,20,60'),'--turns',1,150).sort((a,b)=>a-b),
  outputDir:read('--output-dir','artifacts/gameplay-tournament'),
  maxGames:numbers(read('--max-games','10000'),'--max-games',1,100000)[0],
  stopOnError:argv.includes('--stop-on-error')
 };
 for(const d of opts.difficulties)if(!DIFFICULTIES.includes(d))throw Error('Unknown difficulty '+d);
 const allowed=new Set(['--scenarios','--players','--difficulties','--seeds','--seed-count','--seed-base','--turns','--output-dir','--max-games','--stop-on-error','--list','--help']);
 for(let i=0;i<argv.length;i++){
  const flag=argv[i];
  if(!allowed.has(flag))throw Error('Unknown flag '+flag);
  if(!['--stop-on-error','--list','--help'].includes(flag)){
   if(i+1>=argv.length||argv[i+1].startsWith('--'))throw Error('Missing value for '+flag);
   i++;
  }
 }
 if(argv.includes('--seeds')&&(argv.includes('--seed-count')||argv.includes('--seed-base')))
  throw Error('Use --seeds or --seed-base / --seed-count, not both');
 return opts;
}
function selections(opts){
 const ids=Object.keys(scenarios).sort();
 const chosen=opts.scenarios.includes('all')?ids:opts.scenarios;
 for(const id of chosen)if(!scenarios[id])throw Error('Unknown regional scenario '+id);
 const all=chosen.flatMap(id=>{
  const s=scenarios[id];
  return s.sides.filter(side=>opts.players.includes('all')||opts.players.includes(side))
   .flatMap(player=>opts.difficulties.flatMap(difficulty=>opts.seeds.flatMap(seed=>
    opts.turns.map(maxTurns=>({scenario:id,player,difficulty,seed,maxTurns})))));
 });
 if(!all.length)throw Error('No scenarios/sides matched the requested filters');
 if(all.length>opts.maxGames)throw Error(all.length+' games exceed --max-games '+opts.maxGames);
 return all;
}
function makeObserver(){
 const initial=new Set(),productionByType={},deployedBySide={},attacksByTurn={},navalDeploymentsBySide={};
 const hooks={
  onStart(g){for(const u of g.units)for(const v of [u,...(u.cargo||[])])initial.add(v.id);},
  onUnitCreated(u){
   if(initial.has(u.id))return; // Carrier cargo present in opening state is not factory output.
   const key=String(u.type||'unknown');
   const side=String(u.side||'unknown');
   (productionByType[side] ||= {})[key]=((productionByType[side]||{})[key]||0)+1;
  },
  onEvent(event,u,turn){
   if(event.kind==='attack')attacksByTurn[turn]=(attacksByTurn[turn]||0)+1;
   if(event.kind==='deploy'){
    deployedBySide[u.side]=(deployedBySide[u.side]||0)+1;
    if(E.TYPES[u.type]?.naval)
     navalDeploymentsBySide[u.side]=(navalDeploymentsBySide[u.side]||0)+1;
   }
  }
 };
 return {hooks,productionByType,deployedBySide,attacksByTurn,navalDeploymentsBySide};
}
function sumBySide(map,sides){
 const out=Object.fromEntries(sides.map(s=>[s,Number(map[s]||0)]));
 out.total=Object.values(out).reduce((a,b)=>a+b,0);
 return out;
}
function invasionWins(g,sides){
 const counts={};
 for(const perSide of Object.values(g.warReport?.turns||{}))
  for(const [side,counters] of Object.entries(perSide))
   counts[side]=(counts[side]||0)+Number(counters.invasionsWon||0);
 return sumBySide(counts,sides);
}
function inactivityWindows(r,observer){
 const turns=r.snapshots.length,max=r.snapshots.at(-1)?.turn||0;
 if(turns<10)return [];
 const active=new Set();
 for(const x of r.captures)active.add(x.turn);
 for(const [turn,n] of Object.entries(observer.attacksByTurn))if(n>0)active.add(Number(turn));
 const windows=[];let start=null;
 for(let turn=1;turn<=max+1;turn++){
  if(turn<=max&&!active.has(turn)){if(start===null)start=turn;}
  else if(start!==null){if(turn-start>=10)windows.push({start,end:turn-1,length:turn-start});start=null;}
 }
 return windows;
}
function one(spec){
 const s=scenarios[spec.scenario],observer=makeObserver();
 try{
  const {r,g}=simulate(s,spec.player,spec.difficulty,spec.seed,spec.maxTurns,observer.hooks);
  const captured=Object.fromEntries(s.sides.map(side=>[side,0]));
  for(const x of r.captures)captured[x.to]=(captured[x.to]||0)+1;
  return {...spec,playedTurns:r.snapshots.at(-1)?.turn||0,winner:r.winner,
   startingCities:r.startingCities,endingCities:r.snapshots.at(-1)?.cities||{},
   startingForces:r.startingForces,endingForces:r.snapshots.at(-1)?.units||{},
   captures:r.captures,capturesBySide:captured,losses:r.losses,
   production:r.production,productionByType:observer.productionByType,
   attacks:r.attacks,navalActions:r.navalActions,navalMoves:r.navalMoves,
   deploymentEvents:sumBySide(observer.deployedBySide,s.sides),
   navalDeployments:sumBySide(observer.navalDeploymentsBySide,s.sides),
   navalInvasionsWon:invasionWins(g,s.sides),stalledWindows:inactivityWindows(r,observer),
   firstOver:r.firstOver,openingStall:r.openingStall,
   snapshots:r.snapshots,errors:r.errors};
 }catch(err){
  return {...spec,playedTurns:0,winner:null,startingCities:{},endingCities:{},startingForces:{},endingForces:{},
   captures:[],capturesBySide:{},losses:{},production:{},productionByType:{},attacks:{},
   navalActions:{},navalMoves:{},deploymentEvents:{total:0},navalDeployments:{total:0},
   navalInvasionsWon:{total:0},stalledWindows:[],firstOver:null,openingStall:false,snapshots:[],
   errors:[{turn:null,side:spec.player,message:err.stack||String(err)}]};
 }
}
function main(){
 if(has('--help')){
  console.log('Usage: node tools/scenario_tournament.cjs [--scenarios all|id,id] [--players all|faction] [--difficulties normal,hard,challenge,elite] [--seeds 11,22|--seed-base 11 --seed-count 3] [--turns 5,20,60,100] [--output-dir artifacts/gameplay-tournament] [--max-games 10000] [--stop-on-error] [--list]');
  return;
 }
 if(has('--list')){for(const id of Object.keys(scenarios).sort())console.log(id+' '+scenarios[id].sides.join(','));return;}
 const opts=parse(),jobs=selections(opts),rows=[];
 let last='';
 for(const [i,spec] of jobs.entries()){
  if(last!==spec.scenario){last=spec.scenario;console.error('Scenario '+last+' ('+(i+1)+'/'+jobs.length+')');}
  const result=one(spec);rows.push(result);
  if(opts.stopOnError&&result.errors.length)break;
 }
 const dest=path.resolve(opts.outputDir),result=stats.save(dest,{...opts,scheduled:jobs.length,completed:rows.length},rows);
 console.log('Tournament: '+rows.length+' runs, '+result.groups.length+' cohorts, '+result.issues.length+' findings');
 console.log('Results: '+dest+'/runs.json, runs.csv, summary.csv, report.md');
 if(rows.some(r=>r.errors.length))process.exitCode=1;
}
if(require.main===module){try{main()}catch(e){console.error(e.stack||String(e));process.exitCode=2;}}
module.exports={parse,selections,makeObserver,inactivityWindows,one};

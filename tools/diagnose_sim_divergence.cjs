#!/usr/bin/env node
'use strict';
/**
 * Diagnose first material divergence in seeded old vs new scenario runs.
 * Unlike fingerprint-only regressions, prints concrete JSON-state field paths.
 * Leaves baselines untouched; output is review evidence, not a new gold file.
 */
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const baseRoot=process.argv[2];
if(!baseRoot)throw Error('usage: node tools/diagnose_sim_divergence.cjs <baseline repo root> [scenario:side ...]');
const current=path.resolve(__dirname,'..');
const targets=process.argv.slice(3).length?process.argv.slice(3):[
  'area-18:britannia','battle-luoyang:britannia','division-japan:eu',
  'conquest-indochina:cf','eu-greenland:eu'];
const script=`
 const {E,simulate,fingerprint}=require('./tools/scenario_sim.cjs');
 const id=process.argv[1],side=process.argv[2],scenario=E.scenarios.byId[id];
 if(!scenario)throw Error('Missing '+id);
 const setup=scenario.create(side,'normal',11);
 const result=simulate(scenario,side,'normal',11,2);
 process.stdout.write(JSON.stringify({setupHash:fingerprint(setup),
   stateHash:fingerprint(result.g),reportHash:fingerprint(result.r),
   setup,game:result.g,report:result.r}));
`;
function capture(root,id,side){
 const out=spawnSync(process.execPath,['-e',script,id,side],{
  cwd:root,encoding:'utf8',timeout:10*60*1000,maxBuffer:128*1024*1024});
 if(out.status!==0||out.error)throw Error('Simulation failed '+id+' '+side+' '+root+' '+(out.error?.message||out.stderr?.slice(-1500)));
 return JSON.parse(out.stdout);
}
function differences(a,b,limit=30){
 const top=[],counts={},groups={},samples={};let total=0;
 function walk(x,y,p,depth){
  if(total>=30000)return;
  if(x===y)return;
  const xo=x&&typeof x==='object',yo=y&&typeof y==='object';
  if(!xo||!yo||Array.isArray(x)!==Array.isArray(y)||depth>18){
   total++;
   const segment=p.split('.').slice(0,3).join('.');
   counts[segment]=(counts[segment]||0)+1;
   const group=p.split('.')[0]||'root';groups[group]=(groups[group]||0)+1;
   if(top.length<limit)top.push({path:p,old:JSON.stringify(x)?.slice(0,175),now:JSON.stringify(y)?.slice(0,175)});
   samples[group]??=p;
   return;
  }
  const keys=new Set([...Object.keys(x),...Object.keys(y)]);
  for(const k of keys){if(total>=30000)return;
   const key=Array.isArray(x)?'['+k+']':'.'+k;
   walk(x[k],y[k],p+key,depth+1);
  }
 }
 walk(a,b,'$',0);
 return {total,groups,first:top,topGroups:Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,16)};
}
let issues=0;const summary=[];
for(const target of targets){
 const [id,side]=target.split(':');
 const before=capture(path.resolve(baseRoot),id,side);
 const after=capture(current,id,side);
 const state=before.stateHash===after.stateHash?null:differences(before.game,after.game);
 const setup=before.setupHash===after.setupHash?null:differences(before.setup,after.setup,12);
 const report=before.reportHash===after.reportHash?null:differences(before.report,after.report,12);
 const item={target,hashes:{setup:[before.setupHash,after.setupHash],
   game:[before.stateHash,after.stateHash],report:[before.reportHash,after.reportHash]},
   state,setup,report};
 summary.push(item);
 if(item.state||item.setup||item.report)issues++;
 console.log('DIAGNOSIS '+target+' '+JSON.stringify(item));
}
fs.writeFileSync('scenario-divergence-diagnosis.json',JSON.stringify({issues,summary},null,2));
console.log('REVIEW '+issues+'/'+targets.length+' comparisons differ, see scenario-divergence-diagnosis.json');
// Diagnosis detects and exposes differences, so only fail for infrastructure failures.

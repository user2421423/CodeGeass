#!/usr/bin/env node
'use strict';
// Non-destructive simulator fingerprints; opt-in comparison with the base
// branch distinguishes an introduced regression from pre-existing baseline debt.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const all=args.includes('--all'),against=args.indexOf('--compare-base');
const baseRef=against<0?null:args[against+1];
if(against>=0&&(!baseRef||baseRef.startsWith('--')))throw Error('--compare-base needs an existing git branch/ref');
const selected=all?null:['division-japan','invasion-japan'];
const baseline=fs.readFileSync(path.join(__dirname,'data/sim_baseline.txt'),'utf8').trimEnd().split('\n');
const choose=lines=>lines.filter(s=>!selected||selected.includes(s.split(' ')[1]));
const expected=choose(baseline);
const simArgs=['--all','11','2',...(selected||[])];
function simulate(file){
 const proc=cp.spawnSync(process.execPath,[file,...simArgs],{
  cwd:root,encoding:'utf8',timeout:300000,maxBuffer:32*1024*1024});
 if(proc.error)throw proc.error;
 assert.equal(proc.status,0,'Simulator '+file+' exited '+proc.status+': '+proc.stderr);
 return proc.stdout.trimEnd().split('\n');
}
function differences(lhs,rhs){
 const out=[];
 for(let i=0;i<Math.max(lhs.length,rhs.length);i++)
  if(lhs[i]!==rhs[i])out.push({line:i+1,expected:lhs[i]??null,actual:rhs[i]??null});
 return out;
}
const actual=simulate('tools/scenario_sim.cjs');
const drift=differences(expected,actual);
let introduced=[],baseSha=null;
if(baseRef){
 const fetch=cp.spawnSync('git',['fetch','--no-tags','--depth=1','origin',baseRef],{cwd:root,encoding:'utf8',timeout:90000});
 if(fetch.status!==0)throw Error('Cannot fetch base '+baseRef+': '+fetch.stderr);
 const show=cp.spawnSync('git',['show','FETCH_HEAD:tools/scenario_sim.cjs'],{cwd:root,encoding:'utf8'});
 if(show.status!==0)throw Error('Cannot read base simulator: '+show.stderr);
 const rev=cp.spawnSync('git',['rev-parse','FETCH_HEAD'],{cwd:root,encoding:'utf8'});
 baseSha=rev.stdout.trim();
 // Place alongside original simulator so require('../dist/engine.js') resolves identically.
 const temp=path.join(__dirname,'.sim_compare_'+process.pid+'.cjs');
 let fromBase;
 try{fs.writeFileSync(temp,show.stdout);fromBase=simulate(path.relative(root,temp));}
 finally{try{fs.unlinkSync(temp)}catch{}}
 introduced=differences(fromBase,actual);
}
const out=path.join(root,'artifacts','baseline-audit');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({
 reference:'tools/data/sim_baseline.txt',checked:expected.length,
 branchToStoredBaseline:drift.length,branchToBaseSimulator:introduced.length,
 baseRef,baseSha,storedBaselineDifferences:drift.slice(0,50),introducedDifferences:introduced.slice(0,50)
},null,2)+'\n');
const warn=drift.length?('Stored baseline differs on '+drift.length+' lines'):('All '+expected.length+' stored fingerprints match');
const report=['# Fingerprint baseline audit','',
 'Checked '+expected.length+' lines. '+warn+'.',
 'Compared simulator from '+(baseRef?baseRef+' ('+baseSha+')':'no separate ref')+'.',
 'Introduced differences against base simulator: '+introduced.length+'.','',
 'Stored baselines were NOT regenerated.'];
fs.writeFileSync(path.join(out,'report.md'),report.join('\n')+'\n');
if(drift.length)for(const x of drift.slice(0,12))
 console.error('reference line '+x.line+' expected '+x.expected+'; actual '+x.actual);
if(introduced.length)for(const x of introduced.slice(0,12))
 console.error('introduced line '+x.line+' base '+x.expected+'; branch '+x.actual);
if(introduced.length)throw Error('Introduced changes to deterministic simulator outputs: '+introduced.length);
if(drift.length&&!baseRef)throw Error('Stored deterministic baseline mismatch: '+drift.length);
if(drift.length)console.warn('PRE-EXISTING BASELINE DEBT: '+drift.length+' reference lines differ on base and branch; see artifacts/baseline-audit');
else console.log('Deterministic baseline: PASS ('+expected.length+' lines)');

#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
function parse(argv) {
  const c={reference:path.join(ROOT,'tools/data/sim_baseline.txt'),actual:null,scenarios:[]};
  for(let i=0;i<argv.length;i++) {
    const flag=argv[i],value=argv[++i];
    if(!value||value.startsWith('--'))throw Error('Missing value for '+flag);
    if(flag==='--reference')c.reference=path.resolve(value);
    else if(flag==='--base-root')c.baseRoot=path.resolve(value);
    else if(flag==='--actual')c.actual=path.resolve(value);
    else if(flag==='--scenarios')c.scenarios=value.split(',');
    else throw Error('Unknown option '+flag);
  }
  return c;
}
function capture(root,scenarios) {
  const result=spawnSync(process.execPath,['tools/scenario_sim.cjs','--all','11','2',...scenarios],
    {cwd:root,encoding:'utf8',timeout:900000,maxBuffer:32*1024*1024});
  if(result.error||result.status!==0)throw Error('Baseline simulation failed: '+(result.error?.message||result.stderr));
  return result.stdout;
}
function differences(expected,actual) {
  const lines=s=>s.trim().split('\n').filter(Boolean), key=l=>l.split(' ').slice(0,l.startsWith('sim ')?6:4).join(' ');
  const before=new Map(lines(expected).map(l=>[key(l),l])),after=new Map(lines(actual).map(l=>[key(l),l]));
  return [...new Set([...before.keys(),...after.keys()])].filter(k=>before.get(k)!==after.get(k))
    .map(k=>({key:k,expected:before.get(k)||null,actual:after.get(k)||null}));
}
function main() {
  const c=parse(process.argv.slice(2)), actual=capture(ROOT,c.scenarios);
  let expected=c.baseRoot?capture(c.baseRoot,c.scenarios):fs.readFileSync(c.reference,'utf8');
  if(c.scenarios.length)expected=expected.split('\n').filter(l=>c.scenarios.includes(l.split(' ')[1])).join('\n')+'\n';
  if(!actual.trim()||!expected.trim())throw Error('Empty baseline selection');
  if(c.actual){fs.mkdirSync(path.dirname(c.actual),{recursive:true});fs.writeFileSync(c.actual,actual);}
  const delta=differences(expected,actual);
  console.log(`${actual.trim().split('\n').length} fingerprint lines checked; ${delta.length} mismatches against ${c.baseRoot?'PR base':c.reference}.`);
  if(delta.length){console.error(JSON.stringify(delta.slice(0,12),null,2));process.exitCode=1;}
}
if(require.main===module){try{main();}catch(e){console.error(e.stack);process.exitCode=1;}}
module.exports={differences,parse,capture};

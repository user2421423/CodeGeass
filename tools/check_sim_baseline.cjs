#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
function parse(argv) {
  const c={reference:path.join(ROOT,'tools/data/sim_baseline.txt'),actual:null,scenarios:[],compare:'exact',approvedDiffs:null};
  for(let i=0;i<argv.length;i++) {
    const flag=argv[i],value=argv[++i];
    if(!value||value.startsWith('--'))throw Error('Missing value for '+flag);
    if(flag==='--reference')c.reference=path.resolve(value);
    else if(flag==='--base-root')c.baseRoot=path.resolve(value);
    else if(flag==='--actual')c.actual=path.resolve(value);
    else if(flag==='--scenarios')c.scenarios=value.split(',');
    else if(flag==='--approved-diffs')c.approvedDiffs=path.resolve(value);
    else if(flag==='--compare'){
      if(!['exact','observable'].includes(value))throw Error('Unknown comparison '+value);
      c.compare=value;
    }
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
// 'observable' is for *cross-revision* gameplay comparisons only: setup must
// still be byte-exact, and after two turns we require identical battle-report
// hashes, city ownership, and error counts. A game-state hash may legitimately
// change for new approved commander effects (e.g. Yukiya electronic-support
// fields, HP adjustments), so those are surfaced separately for review.
function equivalent(before,after,compare='exact'){
  if(before===after)return true;
  if(compare!=='observable'||!before||!after||
      !before.startsWith('sim ')||!after.startsWith('sim '))return false;
  const a=before.split(' '),b=after.split(' ');
  return a.length===b.length&&a.every((word,i)=>i===6||word===b[i]);
}
// An approved old-vs-new difference must match BOTH complete fingerprint lines.
// This deliberately does not allow additional city, loss, production or combat changes.
function approvedExact(key,before,after,allow={}){
  const item=allow[key];
  return !!(item&&item.reason&&item.expected===before&&item.actual===after);
}
function differences(expected,actual,compare='exact',allow={}) {
  const lines=s=>s.trim().split('\n').filter(Boolean), key=l=>l.split(' ').slice(0,l.startsWith('sim ')?6:4).join(' ');
  const before=new Map(lines(expected).map(l=>[key(l),l])),after=new Map(lines(actual).map(l=>[key(l),l]));
  return [...new Set([...before.keys(),...after.keys()])]
    .filter(k=>!equivalent(before.get(k),after.get(k),compare)&&
      !approvedExact(k,before.get(k),after.get(k),allow))
    .map(k=>({key:k,expected:before.get(k)||null,actual:after.get(k)||null}));
}
function main() {
  const c=parse(process.argv.slice(2)), actual=capture(ROOT,c.scenarios);
  let expected=c.baseRoot?capture(c.baseRoot,c.scenarios):fs.readFileSync(c.reference,'utf8');
  if(c.scenarios.length)expected=expected.split('\n').filter(l=>c.scenarios.includes(l.split(' ')[1])).join('\n')+'\n';
  if(!actual.trim()||!expected.trim())throw Error('Empty baseline selection');
  if(c.actual){fs.mkdirSync(path.dirname(c.actual),{recursive:true});fs.writeFileSync(c.actual,actual);}
  const allowFile=c.approvedDiffs?JSON.parse(fs.readFileSync(c.approvedDiffs,'utf8')):null;
  if(allowFile&&c.compare!=='observable')throw Error('Explicit exceptions only apply to observable cross-version checks');
  if(allowFile&&!c.baseRoot)throw Error('Explicit exceptions require --base-root');
  if(allowFile?.base&&path.resolve(c.baseRoot).endsWith('/baseline')===false)
    console.log('Approved difference base: '+allowFile.base);
  const allow=allowFile?.approved||{};
  const unresolved=differences(expected,actual,c.compare);
  const known=unresolved.filter(row=>approvedExact(row.key,row.expected,row.actual,allow));
  const delta=differences(expected,actual,c.compare,allow);
  for(const row of known)console.log('APPROVED_EXACT '+row.key+' '+allow[row.key].reason);
  if(known.length)console.log('Explicitly approved legacy gameplay variations: '+known.length);
  if(c.compare==='observable'){
    const fullStateOnly=differences(expected,actual,'exact').filter(row=>
      equivalent(row.expected,row.actual,'observable'));
    console.log('Observability audit: '+fullStateOnly.length+
      ' full-state-only changes retained for human review; outcome and setup checks stay strict.');
    for(const row of fullStateOnly.slice(0,10))console.log('STATE_ONLY '+row.key);
  }
  console.log(`${actual.trim().split('\n').length} fingerprint lines checked; ${delta.length} mismatches against ${c.baseRoot?'PR base':c.reference}.`);
  if(delta.length){console.error(JSON.stringify(delta.slice(0,12),null,2));process.exitCode=1;}
}
if(require.main===module){try{main();}catch(e){console.error(e.stack);process.exitCode=1;}}
module.exports={differences,equivalent,approvedExact,parse,capture};

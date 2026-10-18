#!/usr/bin/env node
'use strict';
// Non-destructive fingerprint comparison; NEVER rewrites the reference baseline.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const all=process.argv.includes('--all');
const requested=all?null:['division-japan','invasion-japan'];
const original=fs.readFileSync(path.join(__dirname,'data/sim_baseline.txt'),'utf8').trimEnd().split('\n');
function select(lines){return lines.filter(line=>!requested||requested.includes(line.split(' ')[1]));}
const expected=select(original),args=['tools/scenario_sim.cjs','--all','11','2',...(requested||[])];
const proc=cp.spawnSync(process.execPath,args,{encoding:'utf8',cwd:path.resolve(__dirname,'..'),timeout:240000,maxBuffer:16*1024*1024});
if(proc.error)throw proc.error;
assert.equal(proc.status,0,'Scenario simulator exited '+proc.status+': '+proc.stderr);
const actual=proc.stdout.trimEnd().split('\n');
let mismatch=0;
for(let i=0;i<Math.max(expected.length,actual.length);i++){
 if(expected[i]!==actual[i]){
  mismatch++;
  if(mismatch<=12)console.error('line '+(i+1)+' expected '+(expected[i]??'<absent>')+'; actual '+(actual[i]??'<absent>'));
 }
}
assert.equal(mismatch,0,'Simulation fingerprint mismatch; do not regenerate baseline to mask an unintended rules change');
console.log('Preserved '+expected.length+' deterministic fingerprints: PASS');
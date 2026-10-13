#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const main='1cf9ca4f01d66d9acb1b7284fa710d95f2d1ee7d';
const city='d91938563a8be614b4a1495fc8940793da0446a2';
const variant=process.argv[2];
if(!['main','city','regular','combined'].includes(variant))throw Error('Variant: main|city|regular|combined');
const source=sha=>cp.execFileSync('git',['show',sha+':dist/engine/ai.js'],
  {cwd:ROOT,encoding:'utf8',maxBuffer:20*1024*1024});
const regular=source('HEAD');
let script=variant==='main'?source(main):variant==='city'?source(city):regular;
if(variant==='regular'){
  const old=source(city);
  const start='  function eliminatorEscortTarget(g,u,memo) {';
  const stop='  function aiEliminatorMetrics(g, side) {';
  const oldStart='  function eliminatorMobileCoverBonus(g,u,p,nearbyFoes,memo) {';
  const a=script.indexOf(start),b=script.indexOf(stop,a);
  const x=old.indexOf(oldStart),y=old.indexOf(stop,x);
  if(a<0||b<0||x<0||y<0)throw Error('Unable to isolate escort-target ablation');
  script=script.slice(0,a)+old.slice(x,y)+script.slice(b);
}
fs.writeFileSync(path.join(ROOT,'dist/engine/ai.js'),script);
console.log('ELIMINATOR_AI_VARIANT '+variant+' bytes='+script.length);

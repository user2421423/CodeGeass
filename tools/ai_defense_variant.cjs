#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const kind=process.argv[2],file='dist/engine/ai.js';
let ai=fs.readFileSync(file,'utf8');
if(kind==='geopoliticsControl') {
  // Control: preserve default game AI and starting conditions.
}
else if(kind==='rivalry4' || kind==='rivalry12') {
  const factor=kind==='rivalry4'?4:12;
  const anchor='Math.max(0.35, Math.pow((cities[owner] || 0) / lead, 3.5)),';
  const replacement='Math.max(0.35, Math.pow((cities[owner] || 0) / lead, 3.5)) * ' +
    "((side === 'eu' && owner === 'britannia') || (side === 'britannia' && owner === 'eu') ? " + factor + " : 1),";
  if(ai.split(anchor).length!==2)throw Error('Owner weighting anchor missing');
  ai=ai.replace(anchor,replacement);
  if(kind==='rivalry12') {
    const old="near = p => own.some(s => dist(g, s, p) <= FRONT.near) || army.some(u => dist(g, u, p) <= FRONT.near),";
    const neu="rivalRange = p => ((side === 'eu' && p.owner === 'britannia') ||" +
      " (side === 'britannia' && p.owner === 'eu')) ? 25 : FRONT.near,\n" +
      "      near = p => own.some(s => dist(g, s, p) <= rivalRange(p)) || army.some(u => dist(g, u, p) <= rivalRange(p)),";
    if(ai.split(old).length!==2)throw Error('Proximity anchor missing');
    ai=ai.replace(old,neu);
    const start=ai.indexOf('operational = p => {'),end=ai.indexOf('warning = p => {',start);
    if(start<0 || end<0)throw Error('Operational block missing');
    const block=ai.slice(start,end);
    ai=ai.slice(0,start)+block.replaceAll('<= FRONT.near','<= rivalRange(p)')+ai.slice(end);
  }
  console.log('Bilateral objective test:',kind);
}
else if(kind==='priorLatest') {
  ai=execFileSync('git',['show','0ec982bf966c313ae8e82d4cb160c2aafd5e8fbe:dist/engine/ai.js'],{encoding:'utf8'});
  fs.writeFileSync('dist/engine.js',execFileSync('git',['show',
    '0ec982bf966c313ae8e82d4cb160c2aafd5e8fbe:dist/engine.js'],{encoding:'utf8'}));
}
else if(kind==='baseline')
  ai=execFileSync('git',['show','d4dcd3469f7d14d8a2edcef016be16247c8054e6:dist/engine/ai.js'],{encoding:'utf8'});
else if(kind==='noRetreat'){
  const anchor='retreatRatio: 0.35';
  if(ai.split(anchor).length!==2)throw Error('Missing retreat threshold');
  ai=ai.replace(anchor,'retreatRatio: 0.08');
}
else if(kind==='noProduction'){
  const path='src/ai/06-production.part.js',
    current=fs.readFileSync(path,'utf8'),
    baseline=execFileSync('git',['show',
      'd4dcd3469f7d14d8a2edcef016be16247c8054e6:'+path],{encoding:'utf8'});
  if(ai.split(current).length!==2)throw Error('Cannot isolate production AI');
  ai=ai.replace(current,baseline);
}
else if(kind==='previous')
  ai=execFileSync('git',['show','b62b70db0e52084a088fc89a593a20373cbfb788:dist/engine/ai.js'],{encoding:'utf8'});
else if(kind==='alert15'){
  const old='alertShare: 0.25';
  if(ai.split(old).length!==2)throw Error('Alert share anchor changed');
  ai=ai.replace(old,'alertShare: 0.15');
}
else if(kind==='regional' || kind==='redeploy' || kind==='redeploy10'){
  let data=fs.readFileSync('dist/engine/world.js','utf8');
  const moves=[["['cf', 'heavy', 113, 36, 2]","['cf', 'heavy', 63.5, 36.5, 2]"],["['cf', 'rocket', 110.5, 33.5, 1]","['cf', 'rocket', 75.2, 40.6, 1]"],["['cf', 'medium', 116.4, 39.9, 2]","['cf', 'medium', 132.0, 45.5, 2]"],["['cf', 'support', 121.5, 39.5, 2]","['cf', 'support', 128.1, 44.4, 2]"],["['cf', 'light', 114.2, 22.3, 1]","['cf', 'light', 50.5, 32.7, 1]"]];
  if(kind==='redeploy10') moves.push(...[["['cf', 'scout', 118, 41, 3]","['cf', 'scout', 70.9, 42.2, 3]"],["['cf', 'raider', 108, 37, 2, 'xianglin']","['cf', 'raider', 56.8, 38.6, 2, 'xianglin']"],["['cf', 'heavy', 75.5, 29.5, 1]","['cf', 'heavy', 64.8, 40.2, 1]"],["['cf', 'scout', 100.5, 13.7, 1]","['cf', 'scout', 129.5, 47.2, 1]"],["['cf', 'light', 121.5, 31.2, 2]","['cf', 'light', 132.2, 45.2, 2]"]]);
  // The default map now contains the tested five-formation deployment.
  // "regional" restores the old placement as a control; redeploy is idempotent.
  for(const [before,after] of moves) {
    const from=kind==='regional'?after:before;
    const to=kind==='regional'?before:after;
    if(data.split(from).length===2)data=data.replace(from,to);
    else if(data.split(to).length!==2)throw Error('Expected one start placement: '+from+' or '+to);
  }
  fs.writeFileSync('dist/engine/world.js',data);
  console.log('Applied controlled deployment:',kind,'(unchanged army size and resources)');
}
else throw Error('Unknown AI variant '+kind);
fs.writeFileSync(file,ai);
console.log('Using experimental AI variant:',kind);

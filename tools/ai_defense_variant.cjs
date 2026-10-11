#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const kind=process.argv[2],file='dist/engine/ai.js';
let ai=fs.readFileSync(file,'utf8');
if(kind==='priorLatest') {
  ai=execFileSync('git',['show','0ec982bf966c313ae8e82d4cb160c2aafd5e8fbe:dist/engine/ai.js'],{encoding:'utf8'});
  fs.writeFileSync('dist/engine.js',execFileSync('git',['show',
    '0ec982bf966c313ae8e82d4cb160c2aafd5e8fbe:dist/engine.js'],{encoding:'utf8'}));
}
else if(kind==='previous')
  ai=execFileSync('git',['show','b62b70db0e52084a088fc89a593a20373cbfb788:dist/engine/ai.js'],{encoding:'utf8'});
else if(kind==='alert15'){
  const old='alertShare: 0.25';
  if(ai.split(old).length!==2)throw Error('Alert share anchor changed');
  ai=ai.replace(old,'alertShare: 0.15');
}
else if(kind==='redeploy'){
  let data=fs.readFileSync('dist/engine/world.js','utf8');
  const moves=[["['cf', 'heavy', 113, 36, 2]","['cf', 'heavy', 63.5, 36.5, 2]"],["['cf', 'rocket', 110.5, 33.5, 1]","['cf', 'rocket', 75.2, 40.6, 1]"],["['cf', 'medium', 116.4, 39.9, 2]","['cf', 'medium', 132.0, 45.5, 2]"],["['cf', 'support', 121.5, 39.5, 2]","['cf', 'support', 128.1, 44.4, 2]"],["['cf', 'light', 114.2, 22.3, 1]","['cf', 'light', 50.5, 32.7, 1]"]];
  for(const [before,after] of moves) {
    if(data.split(before).length!==2)throw Error('Expected one start placement: '+before);
    data=data.replace(before,after);
  }
  fs.writeFileSync('dist/engine/world.js',data);
  console.log('Redistributed',moves.length,'existing formations; no new troops or resources');
}
else if(kind!=='regional')throw Error('Unknown AI variant '+kind);
fs.writeFileSync(file,ai);
console.log('Using experimental AI variant:',kind);

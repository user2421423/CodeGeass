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
else if(kind!=='regional')throw Error('Unknown AI variant '+kind);
fs.writeFileSync(file,ai);
console.log('Using experimental AI variant:',kind);

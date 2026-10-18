#!/usr/bin/env node
'use strict';
// Simulation-only profile switch in the generated (git-ignored) AI bundle.
// Production source always defaults to the final rebalanced combination.
const fs=require('node:fs');
const path='dist/engine/ai.js',variant=process.argv[2];
const modes={old:[false,false,false,false],selective:[true,false,false,false],
  preserve:[false,true,false,false],production:[false,false,true,false],
  combined:[true,true,true,false],strict:[true,true,true,true]};
if(!modes[variant])throw Error('Unknown defensive AI variant '+variant);
let source=fs.readFileSync(path,'utf8');
const find='selective: true, preserveOffense: true, leanProduction: true, emergencyOnly: true,';
if(source.split(find).length!==2)throw Error('Variant compile anchor changed');
const opts=modes[variant];
source=source.replace(find,
  'selective: '+opts[0]+', preserveOffense: '+opts[1]+
  ', leanProduction: '+opts[2]+', emergencyOnly: '+opts[3]+',');
fs.writeFileSync(path,source);
console.log('AI_PROFILE',variant,JSON.stringify(modes[variant]));

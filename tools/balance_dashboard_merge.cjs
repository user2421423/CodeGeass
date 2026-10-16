#!/usr/bin/env node
'use strict';
// Merge independent GitHub Actions shards into one dashboard. Fail closed on
// missing, duplicate or mismatched candidate/baseline simulation matrices.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const report=require('./balance_dashboard_report_expanded.cjs');
const root=path.resolve(process.argv[2]||'dashboard-shards');
const output=path.resolve(process.argv[3]||'dashboard-output/combined');
const folders=fs.readdirSync(root,{withFileTypes:true})
  .filter(v=>v.isDirectory()&&fs.existsSync(path.join(root,v.name,'candidate.json')))
  .map(v=>path.join(root,v.name)).sort();
if(!folders.length)throw Error('No dashboard shards found in '+root);
function merge(filename){
  let merged=null;
  const seen=new Set();
  for(const folder of folders){
    const file=path.join(folder,filename);
    if(!fs.existsSync(file))throw Error('Missing '+file);
    const item=JSON.parse(fs.readFileSync(file,'utf8'));
    assert.equal(item.schema,2,'Unexpected dashboard schema in '+file);
    if(!merged)merged={
      schema:2,generatedAt:new Date().toISOString(),engine:item.engine,
      configuration:{...item.configuration,modes:[],shard:null},modes:{},rows:[]
    };
    for(const field of ['runs','seed','maxTurns']){
      assert.equal(item.configuration[field],merged.configuration[field],
        field+' differs between shards');
    }
    assert.deepEqual(item.configuration.difficulties,merged.configuration.difficulties,
      'Difficulty matrix differs between shards');
    for(const [mode,definition] of Object.entries(item.modes)){
      if(merged.modes[mode])throw Error('Duplicated scenario across shards: '+mode);
      merged.modes[mode]=definition;
      merged.configuration.modes.push(mode);
    }
    for(const row of item.rows){
      const k=[row.mode,row.player,row.difficulty,row.seed].join('|');
      if(seen.has(k))throw Error('Duplicate simulation: '+k);
      seen.add(k);
      if(!merged.modes[row.mode])throw Error('Run has no scenario: '+k);
      merged.rows.push(row);
    }
  }
  return merged;
}
const candidate=merge('candidate.json'),baseline=merge('baseline.json');
const delta=report.compare(candidate,baseline);
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'candidate.json'),JSON.stringify(candidate,null,2)+'\n');
fs.writeFileSync(path.join(output,'baseline.json'),JSON.stringify(baseline,null,2)+'\n');
fs.writeFileSync(path.join(output,'comparison.md'),report.markdown(candidate,delta));
fs.writeFileSync(path.join(output,'index.html'),report.html(candidate,delta,baseline));
console.log('Merged '+folders.length+' shards, '+candidate.rows.length+
  ' matched simulations, '+Object.keys(candidate.modes).length+' scenarios.');

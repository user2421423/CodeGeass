#!/usr/bin/env node
'use strict';
// CI-only paired comparison. Same runner/browser/workload; observations, not promises.
const fs = require('node:fs'), path = require('node:path');
const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) throw Error('Usage: node tools/compare_map_benchmarks.cjs <result directory>');
const profiles=['desktop','mobile'], modes=['before','after'];
const metrics=[['startupMs','First usable (ms)'],['drawP50Ms','Pan draw p50 (ms)'],['drawP95Ms','Pan draw p95 (ms)'],['zoomDrawP50Ms','Zoom draw p50 (ms)'],['zoomDrawP95Ms','Zoom draw p95 (ms)'],['heapBytes','Post-GC JS heap (bytes)']];
const median = values => {
  const a=values.filter(Number.isFinite).sort((a,b)=>a-b);
  return a.length ? (a[(a.length-1)>>1]+a[a.length>>1])/2 : null;
};
const fmt = (n,d=2)=>n===null?'n/a':n.toFixed(d);
const fmtPair = (a,b,d=2)=>a===null||b===null?'n/a':fmt(a,d)+' → '+fmt(b,d)+' ('+(b>=a?'+':'')+fmt(a?(b/a-1)*100:0,1)+'%)';
const data={};
for(const profile of profiles){
  data[profile]={};
  for(const mode of modes){
    const files=fs.readdirSync(dir).filter(f=>f.startsWith(profile+'-'+mode+'-')&&f.endsWith('.json')).sort();
    if(!files.length)throw Error('Missing '+profile+' '+mode+' benchmark');
    data[profile][mode]=files.map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
  }
}
const lines=['# Renderer V2 — paired Chromium A/B measurements','',
  'Negative percentages indicate a reduction in time or memory. Values are medians across repeated complete runs of each workload. Mobile is a Chromium touch/DPR emulation on the same CI host, NOT a physical mobile device.',''];
for(const profile of profiles){
  const before=data[profile].before, after=data[profile].after;
  const browsers=new Set([...before,...after].map(x=>x.browser));
  const viewports=new Set([...before,...after].map(x=>x.viewport));
  lines.push('## '+profile+' ('+before.length+' baseline runs; '+after.length+' candidate runs)','',
    'Browser: '+[...browsers].join(', ')+'; viewport: '+[...viewports].join(', ')+'.','');
  if(browsers.size!==1||viewports.size!==1) lines.push('**WARNING: unmatched execution environment — do not compare these numbers.**','');
  lines.push('| Map | '+metrics.map(m=>m[1]).join(' | ')+' |','|---|'+metrics.map(()=>'---:').join('|')+'|');
  const ids=[...new Set([...before,...after].flatMap(run=>run.cases.map(c=>c.scenario)))];
  for(const id of ids){
    const cells=metrics.map(([key])=>{
      const a=median(before.flatMap(run=>run.cases.filter(c=>c.scenario===id).map(c=>c[key])));
      const b=median(after.flatMap(run=>run.cases.filter(c=>c.scenario===id).map(c=>c[key])));
      return fmtPair(a,b,key==='heapBytes'?0:2);
    });
    lines.push('| '+id+' | '+cells.join(' | ')+' |');
  }
  lines.push('','**Candidate-only dynamic-unit diagnostics** (baseline renderer did not have these optional counters):','',
    '| Map | Mean unit draw ms | Visible per frame | Offscreen per frame |','|---|---:|---:|---:|');
  for(const id of ids){
    const cases=after.flatMap(run=>run.cases.filter(c=>c.scenario===id));
    const m=key=>median(cases.map(c=>c[key]));
    const avg=key=>median(cases.map(c=>c.dynamicUnitFrames?c[key]/c.dynamicUnitFrames:null));
    lines.push('| '+id+' | '+fmt(m('dynamicUnitMeanMs'))+' | '+fmt(avg('dynamicVisibleUnitTotal'),1)+' | '+fmt(avg('dynamicOffscreenUnitTotal'),1)+' |');
  }
  lines.push('');
}
const imageDir=path.join(dir,'screenshots');
if(fs.existsSync(imageDir)){
  const files=fs.readdirSync(imageDir).filter(f=>/^(desktop|mobile)-before-1-.*-zoom(24|38)\\.png$/.test(f));
  const equal=[], different=[], absent=[];
  for(const before of files){
    const after=before.replace('-before-1-','-after-1-');
    if(!fs.existsSync(path.join(imageDir,after)))absent.push(after);
    else if(fs.readFileSync(path.join(imageDir,before)).equals(fs.readFileSync(path.join(imageDir,after))))equal.push(before);
    else different.push(before);
  }
  lines.push('## Fixed-camera canvas screenshot parity','',
    'Exact PNG byte equality: '+equal.length+' paired snapshots; differences: '+different.length+
    '; missing: '+absent.length+'. Fixed seed 11, camera end point, 24/38 px-per-hex zoom and frozen animation timestamp. PNG mismatches require manual image review before approval.','');
  if(different.length)lines.push('Differing pairs: '+different.join(', '), '');
  if(absent.length)lines.push('Missing: '+absent.join(', '), '');
}
lines.push('## Interpretation','',
  '- Improvement targets: 30% lower median pan/zoom draw time, 20% faster large-map readiness, lower p95, no material steady-state heap growth and no small-map regression.',
  '- Pan frame scheduling latency and the main-canvas draw duration are different metrics; this table uses measured draw durations.',
  '- Heap after explicit GC does not measure total decoded-image, canvas or GPU memory. See raw cache-byte figures.',
  '- Pixel parity and real-device Safari remain separate release gates. One or two successful runs alone are insufficient statistical proof.','');
const report=lines.join('\n');
fs.writeFileSync(path.join(dir,'comparison.md'),report+'\n');
console.log(report);

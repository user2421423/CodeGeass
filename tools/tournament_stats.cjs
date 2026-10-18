'use strict';
// Engine-independent statistics and deterministic machine-readable artifacts.
const fs=require('node:fs'),path=require('node:path');
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const rounded=n=>Math.round(n*1000)/1000;
function wilson(w,n){
 if(!n)return {low:0,high:1};
 const z=1.96,p=w/n,d=1+z*z/n,m=(p+z*z/(2*n))/d;
 const e=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;
 return {low:rounded(Math.max(0,m-e)),high:rounded(Math.min(1,m+e))};
}
function aggregate(runs){
 const by=new Map();
 for(const r of runs){const key=[r.scenario,r.player,r.difficulty,r.maxTurns].join('|');
  if(!by.has(key))by.set(key,[]);by.get(key).push(r);}
 return [...by].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,rows])=>{
  const [scenario,player,difficulty,horizon]=key.split('|');
  const clean=rows.filter(r=>!r.errors.length),resolved=clean.filter(r=>r.winner!=null);
  const won=resolved.filter(r=>r.winner===player).length;
  return {scenario,player,difficulty,maxTurns:Number(horizon),runs:rows.length,valid:clean.length,
   errors:rows.length-clean.length,resolved:resolved.length,wins:won,
   winRate:resolved.length?rounded(won/resolved.length):null,win95:wilson(won,resolved.length),
   avgCaptures:rounded(mean(clean.map(r=>r.captures.length))),
   avgCaptureMargin:rounded(mean(clean.map(r=>(r.capturesBySide[player]||0)-Math.max(0,...Object.entries(r.capturesBySide).filter(([k])=>k!==player).map(([,n])=>n))))),
   avgAttacks:rounded(mean(clean.map(r=>Object.values(r.attacks).reduce((a,b)=>a+b,0)))),
   avgLosses:rounded(mean(clean.map(r=>Object.values(r.losses).reduce((a,b)=>a+b,0)))),
   avgNavalDeployments:rounded(mean(clean.map(r=>r.navalDeployments.total))),
   avgNavalInvasionsWon:rounded(mean(clean.map(r=>r.navalInvasionsWon.total))),
   stalledRuns:clean.filter(r=>r.stalledWindows.length>0).length,
   seeds:rows.map(r=>r.seed)};
 });
}
function findings(runs,groups){
 const issues=[];
 for(const r of runs.filter(r=>r.errors.length))
  issues.push({priority:1,type:'confirmed-runtime-error',scenario:r.scenario,player:r.player,
   difficulty:r.difficulty,seed:r.seed,maxTurns:r.maxTurns,
   detail:JSON.stringify(r.errors)});
 for(const g of groups){
  if(g.resolved>=8&&(g.win95.low>0.65||g.win95.high<0.35))
   issues.push({priority:2,type:'possible-faction-dominance',scenario:g.scenario,player:g.player,
    difficulty:g.difficulty,maxTurns:g.maxTurns,
    detail:g.wins+'/'+g.resolved+' resolved wins; Wilson 95% interval '+g.win95.low+'–'+g.win95.high});
  if(g.valid>=5&&g.stalledRuns/g.valid>=0.8)
   issues.push({priority:3,type:'repeated-inactivity',scenario:g.scenario,player:g.player,
    difficulty:g.difficulty,maxTurns:g.maxTurns,
    detail:g.stalledRuns+'/'+g.valid+' clean runs with ten consecutive turns of no captures or attacks'});
 }
 return issues.sort((a,b)=>a.priority-b.priority||a.scenario.localeCompare(b.scenario));
}
function csv(rows,fields){
 const cell=v=>{let s=typeof v==='object'?JSON.stringify(v):String(v??'');return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
 return fields.join(',')+'\n'+rows.map(r=>fields.map(k=>cell(r[k])).join(',')).join('\n')+'\n';
}
function report(config,runs,groups,issues){
 const lines=['# Reproducible regional gameplay findings','',
  'These are real-engine AI-versus-AI simulations. A selected player side affects opponent difficulty bonuses; **AI win rate is not human win rate**.',
  'Win rates count **only resolved, error-free** games. Unresolved games are censored, not draws. Wilson intervals are 95%.',
  'Naval deployments are observed actions, not necessarily successful invasions; invasion successes use the engine war-report counter when present.',
  'An inactivity window is ten turns with no attacks and no captured cities across all sides.','',
  '## Coverage','',
  '- Runs: '+runs.length+'; scenarios: '+new Set(runs.map(r=>r.scenario)).size+'; comparable cohorts: '+groups.length,
  '- Seeds: '+config.seeds.join(', ')+'; turn horizons: '+config.turns.join(', '),
  '- Recorded errors: '+runs.filter(r=>r.errors.length).length,'',
  '## Ranked findings',''];
 if(!issues.length)lines.push('No candidate exceeded the predeclared statistical/error thresholds. This is not proof of balance.');
 for(const [i,f] of issues.entries())
  lines.push((i+1)+'. **P'+f.priority+' '+f.type+'**: '+f.scenario+' / '+f.player+' / '+f.difficulty+' / '+f.maxTurns+
   ' turns'+(f.seed==null?'':' / seed '+f.seed)+' — '+f.detail);
 lines.push('','## Grouped evidence','',
  '| Scenario | Side | Difficulty | Turns | Valid / Total | Resolved | Wins | Win rate (95% Wilson) | Mean city-capture margin | Stalled runs |',
  '|---|---|---|---:|---:|---:|---:|---|---:|---:|');
 for(const g of groups)lines.push('| '+g.scenario+' | '+g.player+' | '+g.difficulty+' | '+g.maxTurns+' | '+g.valid+'/'+g.runs+
  ' | '+g.resolved+' | '+g.wins+' | '+(g.winRate===null?'Unresolved':g.winRate+' ('+g.win95.low+'–'+g.win95.high+')')+
  ' | '+g.avgCaptureMargin+' | '+g.stalledRuns+' |');
 lines.push('','## Weaknesses to investigate','',
  '- Repeated inactivity, low production, and naval deployments without captured objectives are diagnostic leads, not confirmed AI bugs.',
  '- Compare matching scenario, faction, difficulty, seed and horizon before modifying AI.',
  '- Longer amphibious scenarios may remain unresolved at short horizons.','',
  '## Coverage gaps','',
  '- Event streams do not expose every production decision; production by type counts observed spawned units.',
  '- Tournament runs cannot fully exercise player inputs, UI flows, save migrations, commander-skill interactions or reward claims; use regression smoke suites.',
  '- Scenario-varying starting positions and difficulty asymmetry complicate comparisons between factions.','',
  '## Recommendations','',
  '1. Run at least 8–20 seeds for 50–100 turns on candidate outliers, then inspect the raw JSON trace.',
  '2. Extend engine-neutral telemetry for strategic AI production intent and naval staging under the AI ownership lane.',
  '3. Create minimal reproductions for each runtime error and use targeted mechanic tests before gameplay changes.',
  '4. Test full browser save compatibility and interactive controls separately from headless simulation.','');
 return lines.join('\n');
}
function save(out,config,runs){
 const groups=aggregate(runs),issues=findings(runs,groups);
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'runs.json'),JSON.stringify({schemaVersion:1,config,runs,groups,findings:issues},null,2)+'\n');
 fs.writeFileSync(path.join(out,'runs.csv'),csv(runs,['scenario','player','difficulty','seed','maxTurns','playedTurns','winner',
  'capturesBySide','losses','production','productionByType','attacks','navalDeployments','navalInvasionsWon','stalledWindows','errors']));
 fs.writeFileSync(path.join(out,'summary.csv'),csv(groups,['scenario','player','difficulty','maxTurns','runs','valid','errors',
  'resolved','wins','winRate','win95','avgCaptures','avgCaptureMargin','avgAttacks','avgLosses',
  'avgNavalDeployments','avgNavalInvasionsWon','stalledRuns']));
 fs.writeFileSync(path.join(out,'report.md'),report(config,runs,groups,issues));
 return {groups,issues};
}
module.exports={wilson,aggregate,findings,csv,report,save};
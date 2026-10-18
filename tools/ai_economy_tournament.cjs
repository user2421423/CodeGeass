#!/usr/bin/env node
'use strict';
/* Run in BOTH checkouts with identical arguments, then compare JSON reports:
 node tools/ai_economy_tournament.cjs --out /tmp/main-econ.json --turns 40 --seeds 11,23,47
 node tools/ai_economy_tournament.cjs --out /tmp/feature-econ.json --turns 40 --seeds 11,23,47 --compare /tmp/main-econ.json
 Use --all-scenarios --turns 100 for the extended 30-scenario endurance suite. */
const fs=require('node:fs');
const {simulate,E,DIFFICULTIES}=require('./scenario_sim.cjs');
const args=process.argv.slice(2),arg=(name,fallback)=>
  args.includes(name)?args[args.indexOf(name)+1]:fallback;
const turns=Number(arg('--turns','30'));
const seeds=arg('--seeds','11,23,47').split(',').map(Number);
const roster=Object.keys(E.scenarios.byId).sort();
const suggested=roster.filter(id=>/japan|australia|philippine|greenland|turkey|korea|africa/.test(id));
const scenarios=args.includes('--all-scenarios')?roster:
  arg('--scenarios',null)?.split(',')||(suggested.length?suggested.slice(0,6):roster.slice(0,5));
const out=arg('--out',null),compare=arg('--compare',null);
if(!Number.isInteger(turns)||turns<1||turns>150||
  !seeds.length||seeds.some(v=>!Number.isInteger(v))||
  scenarios.some(id=>!E.scenarios.byId[id]))throw Error('Invalid turns, seeds or scenario IDs');
const resources=['credits','industry','science','sakuradite'];
const value=(v,k)=>Number(v?.[k]||0);
function percentile(values,p){
  if(!values.length)return null;
  const a=values.slice().sort((a,b)=>a-b),at=(a.length-1)*p,lo=Math.floor(at),f=at-lo;
  return Math.round((a[lo]*(1-f)+(a[Math.ceil(at)]||0)*f)*100)/100;
}
function distribution(items,key){
  const vs=items.map(i=>i[key]).filter(Number.isFinite);
  return {min:percentile(vs,0),p10:percentile(vs,.1),
    median:percentile(vs,.5),p90:percentile(vs,.9),max:percentile(vs,1)};
}
function trial(scenario,player,difficulty,seed){
  const samples=[],produced={},spent={},upgrades={city:0,factory:0,lab:0,port:0,refinery:0};
  for(const r of resources)spent[r]=0;
  let before=null,aiMs=0,actions=0;
  const {r,g}=simulate(scenario,player,difficulty,seed,turns,({g,side,turn,stage,aiMs:duration})=>{
    if(side!==player)return;
    if(stage==='before'){
      before={wallet:{...E.internal.funds(g,side)},
        cities:new Map(g.stations.filter(s=>s.owner===side).map(s=>[s.id,
          {city:s.cityTier||0,factory:s.tier||0,lab:s.lab||0,port:s.portLevel||0,refinery:s.refinery||0}])),
        units:new Set(g.units.map(u=>u.id))};
      return;
    }
    if(!before)return;
    aiMs+=duration;actions++;
    const wallet=E.internal.funds(g,side);
    samples.push({turn,...Object.fromEntries(resources.map(k=>[k,value(wallet,k)])),
      cities:g.stations.filter(s=>s.owner===side).length,
      activeUnits:g.units.filter(u=>u.side===side&&u.hp>0).length});
    // These are within-turn net outflows (captures and windfalls can mask
    // spending), not an exact transaction ledger; comparisons label them.
    for(const k of resources)spent[k]+=Math.max(0,value(before.wallet,k)-value(wallet,k));
    for(const u of g.units){
      if(before.units.has(u.id)||u.side!==side)continue;
      const cls=E.TYPES[u.type]?.cls||'other';produced[cls]=(produced[cls]||0)+1;
    }
    for(const c of g.stations.filter(s=>s.owner===side)){
      const b=before.cities.get(c.id);if(!b)continue;
      for(const kind of Object.keys(upgrades))
        upgrades[kind]+=Math.max(0,(kind==='city'?c.cityTier:kind==='factory'?c.tier:
          kind==='lab'?c.lab:kind==='port'?c.portLevel:c.refinery)||0-b[kind]);
    }
    before=null;
  });
  const captures=r.captures.filter(c=>c.to===player).length;
  const retained=g.stations.filter(s=>s.owner===player).length;
  const outcome=r.winner===player?1:0;
  const startingCities=r.startingCities[player]||0;
  return {scenario:scenario.id,player,difficulty,seed,turns,win:outcome,
    turnsPlayed:r.snapshots.length,winner:r.winner,captures,retained,startingCities,
    losses:r.losses[player]||0,attacks:r.attacks[player]||0,
    navalActions:r.navalActions[player]||0,unitsBuilt:r.production[player]||0,
    produced,upgrades,netOutflow:spent,
    unspent:Object.fromEntries(resources.map(k=>[k,value(E.internal.funds(g,player),k)])),
    avgCredits:samples.length?samples.reduce((n,v)=>n+v.credits,0)/samples.length:0,
    aiMs:Math.round(aiMs*100)/100,aiMsPerTurn:actions?Math.round(aiMs/actions*100)/100:0,
    errors:r.errors,history:samples};
}
const results=[];
for(const id of scenarios)
 for(const side of E.scenarios.byId[id].sides)
  for(const difficulty of DIFFICULTIES)
   for(const seed of seeds){
    const trialResult=trial(E.scenarios.byId[id],side,difficulty,seed);
    results.push(trialResult);
    console.error(id,side,difficulty,seed,'winner='+trialResult.winner,
      'errors='+trialResult.errors.length);
   }
const report={schema:1,generatedAt:new Date().toISOString(),turns,seeds,scenarios,results,
  summary:{trials:results.length,errors:results.reduce((n,r)=>n+r.errors.length,0),
    winRate:results.reduce((n,r)=>n+r.win,0)/Math.max(1,results.length),
    aiMsPerTurn:distribution(results,'aiMsPerTurn'),
    unitsBuilt:distribution(results,'unitsBuilt'),
    retained:distribution(results,'retained'),
    avgCredits:distribution(results,'avgCredits')}};
if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
else console.log(JSON.stringify(report));
if(compare){
  const baseline=JSON.parse(fs.readFileSync(compare,'utf8'));
  const k=r=>[r.scenario,r.player,r.difficulty,r.seed,r.turns].join('|');
  const previous=new Map(baseline.results.map(r=>[k(r),r]));
  const pairs=results.flatMap(r=>previous.has(k(r))?[[previous.get(k(r)),r]]:[]);
  const delta=metric=>distribution(pairs.map(([a,b])=>({difference:b[metric]-a[metric]})),'difference');
  const table=[
    '# AI economy matched-seed comparison',
    '',
    'Common matched trials: '+pairs.length+'/'+results.length,
    'Only matched scenario, side, difficulty, seed and simulation length are compared.',
    'Win-rate changes require larger seed samples for statistical confidence.',
    '',
    '| Metric | Baseline median | Planner median | Paired difference (p10 / median / p90) |',
    '|---|---:|---:|---:|'
  ];
  for(const [field,title] of [['win','Victory (0/1)'],['retained','Retained cities'],
    ['unitsBuilt','Produced units'],['losses','Army losses'],['captures','Captures'],
    ['aiMsPerTurn','AI turn ms'],['avgCredits','Average credit balance']]){
    const dist=delta(field);
    table.push('| '+title+' | '+percentile(pairs.map(p=>p[0][field]),.5)+
      ' | '+percentile(pairs.map(p=>p[1][field]),.5)+' | '+
      [dist.p10,dist.median,dist.p90].join(' / ')+' |');
  }
  const regressions=pairs.filter(([a,b])=>(a.win&&!b.win)||
    b.retained<a.retained||b.errors.length>a.errors.length);
  table.push('','## Potential regressions', '',
    'Regressions are flagged for investigation, not attributed automatically to the planner.');
  for(const [a,b] of regressions.slice(0,50))
    table.push('- '+k(b)+': win '+a.win+'→'+b.win+', retained '+a.retained+
      '→'+b.retained+', errors '+a.errors.length+'→'+b.errors.length);
  table.push('','## Measurement notes','',
    '- Spending is estimated as within-turn net wallet outflow; windfalls can mask purchases.',
    '- AI time includes production and tactical orders and is not isolated planner overhead.',
    '- HQ technology is persistent player-profile research, not an AI wartime purchase.',
    '- Run the same seeds and durations in both code revisions; only scenario results compare.');
  const markdown=table.join('\n')+'\n';
  fs.writeFileSync(out?out.replace(/\.json$/,'')+'-comparison.md':'ai-economy-comparison.md',markdown);
  console.log(markdown);
}
if(report.summary.errors)process.exitCode=1;

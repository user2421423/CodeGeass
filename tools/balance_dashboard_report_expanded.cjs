'use strict';
// Reporting layer for schema-2 balance telemetry; does not modify game state.
const assert = require('node:assert/strict');
const { plot } = require('./balance_dashboard_report.cjs');
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const p95 = a => !a.length ? 0 : [...a].sort((x,y)=>x-y)[Math.ceil(a.length*.95)-1];
const val = (n, d=1) => n == null || !Number.isFinite(n) ? '—' : n.toFixed(d);
const escape = s => String(s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key = r => [r.mode,r.player,r.difficulty,r.seed].join('|');
const groupKey = r => [r.mode,r.player,r.difficulty].join('|');
const won = r => r.resolved && (r.winner === r.player ||
  (r.mode === '2018' && ['britannia','eb'].includes(r.player) && r.winner === 'britannian'));
const metric = (r, name) => r.metrics?.[name]?.[r.player] || 0;
const survival = r => metric(r,'commanderStarts') ?
  metric(r,'commanderSurvivors') / metric(r,'commanderStarts') : null;
const invasion = r => metric(r,'seaLandings') ?
  metric(r,'navalSuccesses') / metric(r,'seaLandings') : null;
function groups(data) {
  const grouped = new Map();
  for (const r of data.rows) {
    const k = groupKey(r);
    if (!grouped.has(k)) grouped.set(k,[]);
    grouped.get(k).push(r);
  }
  return [...grouped].map(([id, rows]) => {
    const r=rows[0], player=r.player;
    const lost=rows.reduce((n,x)=>n+(x.casualtyTotals?.friendly||0),0);
    const opposing=rows.reduce((n,x)=>n+(x.casualtyTotals?.opposing||0),0);
    const commanders=rows.reduce((n,x)=>n+metric(x,'commanderStarts'),0);
    const survivors=rows.reduce((n,x)=>n+metric(x,'commanderSurvivors'),0);
    const landings=rows.reduce((n,x)=>n+metric(x,'seaLandings'),0);
    const successes=rows.reduce((n,x)=>n+metric(x,'navalSuccesses'),0);
    return {
      id,mode:r.mode,player,difficulty:r.difficulty,runs:rows.length,
      wins:rows.filter(won).length,unresolved:rows.filter(x=>!x.resolved).length,
      stalemates:rows.filter(x=>x.metrics.stalemate).length,
      winRate:rows.filter(won).length/rows.length,
      casualtyRatio:lost?opposing/lost:null, lost, opposing,
      commanderSurvival:commanders?survivors/commanders:null,commanders,survivors,
      invasionSuccess:landings?successes/landings:null,landings,successes,
      cities:avg(rows.map(x=>x.final.cities[player]||0)),
      attacks:avg(rows.map(x=>metric(x,'attacks'))),
      frontSwitches:avg(rows.map(x=>metric(x,'frontSwitches'))),
      stallLength:avg(rows.map(x=>x.metrics.longestStallTurns||0)),
      runtime:avg(rows.map(x=>x.elapsedMs)),runtimeP95:p95(rows.map(x=>x.elapsedMs)),
      msPerTurn:avg(rows.map(x=>x.msPerTurn||0))
    };
  });
}
function compare(current,baseline) {
  assert.equal(current?.schema,2,'Expected schema-2 candidate report');
  if (!baseline) return { baseline:false, rows:[], byGroup:{} };
  assert.equal(baseline?.schema,2,'Expected schema-2 baseline report');
  const prior=new Map(baseline.rows.map(r=>[key(r),r]));
  assert.equal(prior.size,baseline.rows.length,'Duplicate baseline mode/faction/difficulty/seed');
  const rows=current.rows.map(r=>{
    const old=prior.get(key(r));
    if (!old) throw Error('Unpaired baseline run: '+key(r));
    const delta=(fn)=>fn(r)-fn(old);
    return {
      ...{mode:r.mode,player:r.player,difficulty:r.difficulty,seed:r.seed},
      wins:delta(x=>Number(won(x))),
      casualties:delta(x=>x.casualtyTotals?.friendly||0),
      casualtyRatio:(r.casualtyRatio==null||old.casualtyRatio==null)?null:r.casualtyRatio-old.casualtyRatio,
      commanderSurvival:(survival(r)==null||survival(old)==null)?null:survival(r)-survival(old),
      invasionSuccess:(invasion(r)==null||invasion(old)==null)?null:invasion(r)-invasion(old),
      stalemates:delta(x=>Number(x.metrics.stalemate)),
      runtime:delta(x=>x.elapsedMs),
      cities:delta(x=>x.final.cities[x.player]||0)
    };
  });
  assert.equal(rows.length,prior.size,'Baseline includes unmatched runs');
  const all=new Map();
  for(const r of rows){
    const k=groupKey(r);
    if(!all.has(k))all.set(k,[]);
    all.get(k).push(r);
  }
  const byGroup=Object.fromEntries([...all].map(([k,a])=>[k,{
    wins:avg(a.map(x=>x.wins)),casualties:avg(a.map(x=>x.casualties)),
    casualtyRatio:avg(a.filter(x=>x.casualtyRatio!=null).map(x=>x.casualtyRatio)),
    commanderSurvival:avg(a.filter(x=>x.commanderSurvival!=null).map(x=>x.commanderSurvival)),
    invasionSuccess:avg(a.filter(x=>x.invasionSuccess!=null).map(x=>x.invasionSuccess)),
    stalemates:avg(a.map(x=>x.stalemates)),runtime:avg(a.map(x=>x.runtime)),
    cities:avg(a.map(x=>x.cities))
  }]));
  return {baseline:true,rows,byGroup};
}
function markdown(current,delta) {
  const out=[
    '# Code Geass — Automated Balance Dashboard',
    '', 'Generated: '+current.generatedAt,
    '', '**Coverage:** '+Object.keys(current.modes).length+' modes · '+
    current.configuration.difficulties.join(', ')+' difficulties · '+current.rows.length+' seeded simulations.',
    '',
    'Every match uses the shipped AI and actual scenario victory rules. Unresolved games are not counted as losses. Commander survival covers starting officer-equipped formations. A naval success is a coastal capture within five turns and five hexes of a landing (correlation, not guaranteed causation). An AI stalemate is eight consecutive turns without captures or casualties while opposing city owners remain.',
    '',
    '| Mode | Faction | Difficulty | Seeds | Wins | Unresolved | Stalemates | Casualty ratio | Commander survival | Naval success | Avg ms | p95 ms |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  ];
  for(const g of groups(current)) out.push('| '+g.mode+' | '+g.player+' | '+g.difficulty+
    ' | '+g.runs+' | '+g.wins+' ('+val(g.winRate*100)+'%) | '+g.unresolved+
    ' | '+g.stalemates+' | '+val(g.casualtyRatio,2)+
    ' | '+(g.commanders?val(g.commanderSurvival*100)+'%':'n/a')+
    ' | '+g.successes+'/'+g.landings+
    ' | '+val(g.runtime,0)+' | '+val(g.runtimeP95,0)+' |');
  if(delta.baseline){
    out.push('','## Matched candidate minus baseline','','| Mode | Faction | Difficulty | Δ wins (pp) | Δ casualty ratio | Δ commander survival (pp) | Δ naval success (pp) | Δ stalemates (pp) | Δ runtime (ms) |',
      '|---|---|---|---:|---:|---:|---:|---:|---:|');
    for(const g of groups(current)){
      const d=delta.byGroup[g.id];
      out.push('| '+g.mode+' | '+g.player+' | '+g.difficulty+' | '+val(d.wins*100)+
        ' | '+val(d.casualtyRatio,2)+' | '+val(d.commanderSurvival*100)+
        ' | '+val(d.invasionSuccess*100)+' | '+val(d.stalemates*100)+
        ' | '+val(d.runtime,0)+' |');
    }
  }
  out.push('','A zero-friendly-casualty run has no defined casualty ratio. Multi-seed AI simulations provide engineering diagnostics, not predicted human-player win rates. Processing times are host-dependent.','');
  return out.join('\n');
}
function html(current,delta,baseline=null) {
  const gs=groups(current), total=current.rows.length;
  const outcome=(name,number)=>'<div class="metric"><span>'+escape(name)+'</span><strong>'+escape(number)+'</strong></div>';
  const tiles=[
    outcome('Scenarios',Object.keys(current.modes).length),
    outcome('Difficulties',current.configuration.difficulties.length),
    outcome('Seeded simulations',total),
    outcome('Unresolved',current.rows.filter(x=>!x.resolved).length),
    outcome('AI stalemates',current.rows.filter(x=>x.metrics.stalemate).length),
    outcome('Naval success proxies',current.rows.reduce((n,x)=>n+Object.values(x.metrics.navalSuccesses||{}).reduce((a,b)=>a+b,0),0))
  ].join('');
  const options=(values)=>values.map(v=>'<option value="'+escape(v)+'">'+escape(v)+'</option>').join('');
  const diffSet=[...new Set(gs.map(g=>g.difficulty))];
  const rowHtml=gs.map(g=>{
    const d=delta.byGroup[g.id];
    return '<tr data-mode="'+escape(g.mode)+'" data-difficulty="'+escape(g.difficulty)+'">'+
      '<td>'+escape(current.modes[g.mode].title)+'</td><td>'+escape(g.player)+'</td>'+
      '<td>'+escape(g.difficulty)+'</td><td>'+g.runs+'</td>'+
      '<td>'+g.wins+'/'+g.runs+' ('+val(g.winRate*100)+'%)</td>'+
      '<td>'+g.unresolved+'</td><td>'+g.stalemates+'</td>'+
      '<td>'+val(g.casualtyRatio,2)+'</td>'+
      '<td>'+(g.commanders?g.survivors+'/'+g.commanders+' ('+val(g.commanderSurvival*100)+'%)':'n/a')+'</td>'+
      '<td>'+g.successes+'/'+g.landings+'</td>'+
      '<td>'+val(g.cities)+'</td><td>'+val(g.attacks)+'</td>'+
      '<td>'+val(g.frontSwitches)+'</td><td>'+val(g.stallLength)+'</td>'+
      '<td>'+val(g.runtime,0)+'</td><td>'+val(g.runtimeP95,0)+'</td>'+
      '<td>'+val(g.msPerTurn,0)+'</td>'+
      (delta.baseline?'<td>'+val(d.wins*100)+' pp</td><td>'+val(d.runtime,0)+' ms</td>':'')+
      '</tr>';
  }).join('');
  const plots=Object.keys(current.modes).map(mode=>'<details class="panel"><summary>'+
    escape(current.modes[mode].title)+'</summary><p>Territory over time, averaged across all factions, difficulties and seeds; dashed lines are the matched baseline.</p>'+
    plot(mode,current,baseline)+'</details>').join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Code Geass — Balance Dashboard</title><style>'+
    ':root{color-scheme:dark;font-family:system-ui,sans-serif;background:#101923;color:#e5edf4}body{margin:0;padding:22px;line-height:1.5}main{max-width:1500px;margin:auto}h1{font-size:clamp(24px,3vw,38px)}p{color:#adc2d1}header{margin-bottom:28px}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:20px 0}.metric,.panel{background:#1d2a38;border:1px solid #364d5e;border-radius:11px;padding:16px}.metric span{display:block;color:#bacbd8;font-size:12px}.metric strong{font-size:27px}.panel{margin:18px 0}summary{cursor:pointer;font-weight:bold;font-size:17px}select{background:#24394a;color:inherit;border:1px solid #53738a;border-radius:6px;padding:8px;margin-right:10px}.scroll{overflow:auto;max-width:100%}table{border-collapse:collapse;white-space:nowrap;width:100%;font-size:12px}th,td{border-bottom:1px solid #354c5c;padding:10px;text-align:right}th{background:#293f4e;position:sticky;top:0}td:first-child,th:first-child{text-align:left}.chart svg{width:100%;max-width:720px;height:auto}.legends{display:flex;flex-wrap:wrap;gap:13px}.legend{display:inline-flex;align-items:center;gap:6px}.legend i{display:inline-block;width:13px;height:3px}.note{border-left:3px solid #749fbd;padding-left:16px;margin-top:22px;color:#bbcdd9}small{color:#96b6ce}footer{font-size:12px;color:#a8b9c5;margin:25px 0}'+
    '</style></head><body><main><header><small>Engineering telemetry · shipped AI engine</small><h1>Automated Balance Dashboard</h1>'+
    '<p>'+escape(current.generatedAt)+' · '+(delta.baseline?'Matched baseline comparison':'Standalone benchmark')+
    ' · '+escape(current.configuration.difficulties.join(', '))+' · '+total+' simulations · turn limit '+current.configuration.maxTurns+'</p></header>'+
    '<div class="metrics">'+tiles+'</div><section class="panel"><h2>Scenario balance matrix</h2>'+
    '<label>Scenario <select id="modeFilter"><option value="">All scenarios</option>'+options(Object.keys(current.modes))+'</select></label>'+
    '<label>Difficulty <select id="difficultyFilter"><option value="">All difficulties</option>'+options(diffSet)+'</select></label>'+
    '<p id="visibleCount" aria-live="polite"></p><div class="scroll"><table><thead><tr>'+
    '<th>Scenario</th><th>Faction</th><th>Difficulty</th><th>Seeds</th><th>Win rate</th><th>Unresolved</th><th>Stalemates</th>'+
    '<th>Casualty ratio</th><th>Commander survival</th><th>Naval success</th><th>Final cities</th><th>Avg attacks</th><th>Front switches</th><th>Idle turns</th><th>Avg ms</th><th>p95 ms</th><th>ms/turn</th>'+
    (delta.baseline?'<th>Δ win rate</th><th>Δ runtime</th>':'')+
    '</tr></thead><tbody id="balanceRows">'+rowHtml+'</tbody></table></div></section>'+
    '<section><h2>Territory graphs</h2>'+plots+'</section>'+
    '<div class="note">AI controls every playable faction. Wins require the real scenario victory condition; unresolved is not a loss. Casualty ratio = opponents’ lost formations / selected faction’s lost formations (undefined when own losses = 0). Commander survival counts surviving initial commander-bearing units. Naval success is a nearby coastal capture within five turns of disembarkation, not proof of cause. Stalemates are eight consecutive turns without city captures or formation losses while multiple powers still hold cities. Timing varies by hardware.</div>'+
    '<footer>Read-only metrics. No gameplay rules or units modified.</footer></main>'+
    '<script>const mf=document.getElementById("modeFilter"),df=document.getElementById("difficultyFilter");function filter(){let n=0;for(const r of document.querySelectorAll("#balanceRows tr")){const show=(!mf.value||r.dataset.mode===mf.value)&&(!df.value||r.dataset.difficulty===df.value);r.hidden=!show;if(show)n++}document.getElementById("visibleCount").textContent=n+" matching faction/difficulty combinations"}mf.addEventListener("change",filter);df.addEventListener("change",filter);filter();</script>'+
    '</body></html>';
}
module.exports={ groups, compare, markdown, html, won };

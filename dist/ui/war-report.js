/* Historical War Report: HUD-accessible, never an automatic modal. */
'use strict';
function warReportDialog(tab='latest',selectedTurn=null) {
  const r=E.ensureWarReport(game),
    sides=[...new Set([...(game.order||[]),...Object.keys(r.snapshots.at(-1)?.sides||{})])].filter(s=>s!=='neutral'),
    latestTurn=r.lastCompleted,
    chosen=selectedTurn==null?latestTurn:selectedTurn,
    turn=Math.max(r.since,Math.min(chosen,Math.max(r.since,latestTurn))),
    latest=r.turns[turn]?.[game.player]||{},
    fmt=n=>Number(n||0).toLocaleString(),
    faction=s=>F(s)?.short||s,
    metric=(label,value,sign='')=>'<div class="war-metric"><span>'+esc(label)+'</span><b>'+sign+fmt(value)+'</b></div>';
  const tabs=[['latest','Turn report'],['history','Territory history'],['statistics','Statistics'],['notifications','Notifications']]
    .map(([id,label])=>'<button class="small '+(tab===id?'primary':'ghost')+
      '" data-action="war-report-'+id+'">'+label+'</button>').join('');
  let body='';
  if(tab==='latest') {
    const major=r.events.filter(e=>e.turn===turn&&['cityCaptured','cityDestroyed','surrender','unitDestroyed','fleijaLaunch','portCaptured'].includes(e.kind))
      .filter(e=>e.kind!=='unitDestroyed'||e.commander).slice(-32).reverse();
    const describe=e=>{
      if(e.kind==='cityCaptured')return faction(e.side)+' captured '+e.city+' from '+faction(e.previousOwner);
      if(e.kind==='cityDestroyed')return e.city+' was destroyed by F.L.E.I.J.A.';
      if(e.kind==='surrender')return faction(e.loser)+' surrendered to '+faction(e.side);
      if(e.kind==='portCaptured')return faction(e.side)+' seized the port of '+e.city;
      if(e.kind==='fleijaLaunch')return faction(e.side)+' launched F.L.E.I.J.A. at '+e.city+
        (e.intercepted?' — intercepted by '+faction(e.defender):'');
      return (E.COMMANDERS[e.commander]?.short||e.commander||'A formation')+' was lost ('+faction(e.unitSide)+')';
    };
    const cities=r.snapshots.find(s=>s.turn===turn)?.sides?.[game.player]?.cities
      ??game.stations.filter(s=>s.owner===game.player).length;
    body='<div class="war-metrics">'+
      metric('Cities captured',latest.citiesCaptured,'+')+
      metric('Cities lost',latest.citiesLost,'−')+
      metric('Enemy units destroyed',latest.enemiesDestroyed)+
      metric('Own units lost',latest.unitsLost)+
      metric('Your territorial control',cities)+
      metric('Damage inflicted',latest.inflicted)+'</div>'+
      '<h3>Major developments</h3>'+
      (major.length?'<ol class="war-events">'+major.map(e=>'<li><span class="war-event-turn">T'+e.turn+
        '</span> '+esc(describe(e))+'</li>').join('')+'</ol>':
        '<p class="mode-note">No significant developments recorded for this turn.</p>')+
      (!latestTurn?'<p class="mode-note">The first complete report is available after you finish a turn.</p>':'');
  } else if(tab==='history') {
    const turns=r.snapshots.filter(s=>s.turn>=r.since).slice().reverse();
    body='<h3>Territorial progression · cities owned</h3><div class="war-scroll"><table class="war-table">'+
      '<thead><tr><th>Turn</th>'+sides.map(s=>'<th>'+esc(faction(s))+'</th>').join('')+
      '<th>Inspect</th></tr></thead><tbody>'+turns.map(s=>'<tr><td>'+s.turn+'</td>'+
        sides.map(f=>'<td>'+fmt(s.sides[f]?.cities)+'</td>').join('')+
        '<td><button class="small ghost" data-action="war-report-turn-'+s.turn+'">Report</button></td></tr>').join('')+
      '</tbody></table></div><h3>Strategic events</h3><ol class="war-events">'+
      r.events.filter(e=>['cityCaptured','cityDestroyed','fleijaLaunch','surrender'].includes(e.kind))
        .slice(-80).reverse().map(e=>'<li><span class="war-event-turn">T'+e.turn+'</span> '+
        esc(faction(e.side)+' · '+e.kind.replace(/([A-Z])/g,' $1').toLowerCase()+' · '+(e.city||''))+'</li>').join('')+
      '</ol>';
  } else if(tab==='notifications') {
    // Short-lived UI notices are an additional session log, not the authoritative War Report.
    body='<h3>This-session notifications</h3>' +
      '<p class="mode-note">Recent interface messages from this browser session. Strategic battle history remains under Territory history.</p>' +
      (noticeHistory.length ? '<ol class="notification-history">' +
        noticeHistory.slice().reverse().map(n => '<li class="notice-' + n.type + '">' +
          '<span class="war-event-turn">T' + n.turn + '</span>' +
          '<b>' + esc(NOTICE_LABELS[n.type]) + '</b> ' + esc(n.text) +
          (n.count > 1 ? ' <small>×' + n.count + '</small>' : '') + '</li>').join('') +
        '</ol>' : '<p class="mode-note">No notifications this session.</p>');
  } else {
    const totals={};
    for(const row of Object.values(r.turns))for(const [side,entry] of Object.entries(row)){
      const x=(totals[side] ||= {income:{},spending:{}});
      for(const [k,v] of Object.entries(entry)){
        if(typeof v==='number')x[k]=(x[k]||0)+v;
        else if(v&&typeof v==='object')for(const [resource,amount] of Object.entries(v))
          x[k][resource]=(x[k][resource]||0)+amount;
      }
    }
    const cols=['citiesCaptured','citiesLost','enemiesDestroyed','unitsLost','unitsProduced','inflicted','received',
      'commandersLost','invasionsWon','invasionsLost','fleijaLaunched','fleijaIntercepted'],
      labels=['Cities taken','Cities lost','Kills','Units lost','Units produced','Damage dealt','Damage taken',
        'Commander casualties','Landings won','Landings lost','F.L.E.I.J.A. launches','Intercepted'];
    body='<h3>Combat and operations · all factions</h3><div class="war-scroll"><table class="war-table">'+
      '<thead><tr><th>Faction</th>'+labels.map(l=>'<th>'+l+'</th>').join('')+'</tr></thead><tbody>'+
      sides.map(s=>'<tr><th>'+esc(faction(s))+'</th>'+cols.map(k=>'<td>'+fmt(totals[s]?.[k])+'</td>').join('')+
      '</tr>').join('')+'</tbody></table></div>'+
      '<h3>Resource production and military spending</h3><div class="war-scroll"><table class="war-table">'+
      '<thead><tr><th>Faction</th><th>Credits earned</th><th>Credits spent</th><th>Industry earned</th>'+
      '<th>Industry spent</th><th>Science earned</th><th>Science spent</th><th>Sakuradite earned</th>'+
      '<th>Sakuradite spent</th></tr></thead><tbody>'+
      sides.map(s=>'<tr><th>'+esc(faction(s))+'</th>'+
        ['credits','industry','science','sakuradite'].map(k=>'<td>'+fmt(totals[s]?.income?.[k])+
          '</td><td>'+fmt(totals[s]?.spending?.[k])+'</td>').join('')+'</tr>').join('')+
      '</tbody></table></div><h3>Army-group performance</h3>'+
      (Object.keys(r.groups).length?'<div class="war-scroll"><table class="war-table"><thead><tr>'+
        '<th>Group</th><th>Faction</th><th>City captures</th><th>Kills</th><th>Damage</th></tr></thead><tbody>'+
        Object.values(r.groups).map(g=>'<tr><th>Group '+esc(String(g.id))+'</th><td>'+esc(faction(g.side))+
          '</td><td>'+fmt(g.cities)+'</td><td>'+fmt(g.kills)+'</td><td>'+fmt(g.damage)+'</td></tr>').join('')+
        '</tbody></table></div>':'<p class="mode-note">No army-group combat has been recorded.</p>')+
      '<p class="mode-note">Landing losses count formations destroyed during their landing turn. '+
      'Unattempted or withdrawn invasions are not counted as failures.</p>';
  }
  modal.innerHTML='<div class="overlay"><section class="dialog wide war-report" role="dialog" aria-modal="true" aria-label="War Report">'+
    '<div class="dialog-head"><div><div class="eyebrow">Operational intelligence</div><h2>War Report · Turn '+turn+
    '</h2></div><button class="small close" data-action="close">Close</button></div>'+
    '<div class="war-tabs">'+tabs+'</div>'+
    (r.legacy?'<p class="mode-note">This operation was started before War Reports were added. Tracking begins from turn '+
      r.since+'; earlier history cannot be reconstructed.</p>':'')+
    '<div class="war-content">'+body+'</div><div class="dialog-footer">'+
    '<button data-action="close">Return to map</button></div></section></div>';
  focusDialog();
}

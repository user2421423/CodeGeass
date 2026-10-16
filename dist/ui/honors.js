/* Permanent military honors. The seven medal art files are bundled locally. */
'use strict';
// Indices into a single seven-frame sprite sheet; each frame is square.
const HONOR_ART = {valor:0,star:1,marksman:2,campaign:3,
  laurel_hard:4,laurel_challenge:5,laurel_elite:6,laurel:5};
const HONOR_ORDER=['laurel_elite','laurel_challenge','laurel_hard','valor','star','marksman','campaign'];
function honorIcon(id,cls=''){
  if(!Object.hasOwn(HONOR_ART,id))return '';
  return `<span class="honor-icon ${cls}" role="img" aria-label="${esc(E.MEDALS[id]?.name||id)}" style="background-position:${(HONOR_ART[id]/6)*100}% 50%"></span>`;
}
function honorsForCommander(o,operationCommander=null){
  const owned=operationCommander===null;
  const items=owned?(o.honors||[]).map(h=>({
    id:h.id,citations:h.citations||[],count:(h.citations||[]).length
  })):(game.honorEvents||[]).filter(v=>!v.personal&&v.commander===operationCommander)
    .map(v=>({id:v.id,citations:[v],count:1}));
  if(!items.length)return '<p class="honors-empty">No decorations yet. Distinguished service is recorded after battle.</p>';
  const order=id=>HONOR_ORDER.indexOf(id)<0?100:HONOR_ORDER.indexOf(id);
  return '<div class="honor-awards">'+items.sort((a,b)=>order(a.id)-order(b.id)).map(h=>
    `<details class="honor-award"><summary>${honorIcon(h.id)}<span><b>${esc(E.MEDALS[h.id]?.name||h.id)}</b><small>${h.count} citation${h.count===1?'':'s'}</small></span></summary><div class="honor-citations">${h.citations.slice().reverse().map(v=>
      `<div><b>${esc(v.operation||game.scenario?.title||game.campaign?.id||'Operation')}</b> · ${esc(v.difficulty||game.difficulty||'normal')} · turn ${Number(v.turn)||1}<small>${esc(v.reason||'')}</small></div>`).join('')}</div></details>`).join('')+'</div>';
}
function honorsEarnedHTML(){
  const events=game.honorEvents||[];
  if(!events.length)return '';
  return `<section class="honors-earned"><span class="label">Military honors · ${events.filter(e=>e.personal).length} HQ citations${events.some(e=>!e.personal)?' · scripted recognition':''}</span><div class="honors-earned-grid">${events.slice(0,12).map(e=>
    `<div class="honors-earned-item">${honorIcon(e.id)}<span><b>${esc(E.COMMANDERS[e.commander]?.short||e.commander)} · ${esc(E.MEDALS[e.id]?.name||e.id)}</b><small>${esc(e.reason)}${!e.personal?' · Operation only':''}</small></span></div>`).join('')}</div>${events.length>12?`<small>+${events.length-12} more citations</small>`:''}</section>`;
}
function honorsHall(){
  generalOpen=null;
  const profile=loadProfile(),officers=Object.entries(E.roster(profile)),
    decorated=officers.filter(([,o])=>o.honors?.length),legacy=profile.legacyHonors||[];
  modal.innerHTML=`<div class="overlay"><section class="dialog wide honors-hall" role="dialog" aria-modal="true" aria-label="Hall of Honors"><div class="dialog-head"><div><div class="eyebrow">Command HQ · Permanent records</div><h2>Hall of Honors</h2><p>Decorations record achievements. They grant no bonuses and cannot be transferred.</p></div><button class="small close" data-action="honors-close">Close</button></div><div class="honors-showcase">${HONOR_ORDER.map(id=>
    `<article class="honors-catalog-item">${honorIcon(id)}<b>${esc(E.MEDALS[id].name)}</b><small>${esc(E.MEDALS[id].earn)}</small></article>`).join('')}</div><h3>Decorated commanders · ${decorated.length}</h3><div class="honors-roster">${decorated.length?decorated.map(([k,o])=>
    `<button class="honors-officer" data-general-open="${k}"><span>${esc(E.COMMANDERS[k]?.name||k)}<small>${esc(E.RANKS[o.rank])} · ${o.honors.reduce((n,h)=>n+(h.citations?.length||0),0)} citations</small></span><span class="honors-mini">${o.honors.slice(0,5).map(h=>honorIcon(h.id)).join('')}</span></button>`).join(''):'<p>No permanent decorations yet.</p>'}</div><details class="honors-legacy"><summary>Legacy Honors · ${legacy.reduce((n,m)=>n+(m.count||0),0)} historical medals</summary><p>These awards predate individual service records. Former owners are recorded where known, but cannot be verified as original recipients.</p>${legacy.map(m=>
    `<div class="honors-legacy-row">${honorIcon(m.id)}${esc(E.MEDALS[m.id]?.name||m.id)} ×${Number(m.count)||1}${m.formerOwner?` · Formerly equipped by ${esc(E.COMMANDERS[m.formerOwner]?.short||m.formerOwner)}`:''}</div>`).join('')||'<p>No historical medals.</p>'}</details></section></div>`;
  focusDialog();
}

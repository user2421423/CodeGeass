/* Regional scenarios: Japan and the European War, with faction/map previews. */
'use strict';
let scenarioKey = 'japan';
let scenarioSide = 'britannia';
let scenarioDifficulty = 'normal';
let scenarioRoutingGroup = null;
const SCENARIO_BLURBS = {
  japan: {
    britannia: 'Defend Honshu and contain the Federation at the Kanmon Strait alongside the Black Knights.',
    bk: 'Command Zero’s enclaves in Japan; Britannia is temporarily allied until turn 10.',
    cf: 'Command Kyushu and push your Federation expeditionary army into Honshu.'
  },
  europe: {
    eu: 'Hold the industrial cities of western and central Europe against the eastern offensive.',
    eb: 'Lead Euro Britannia’s elite spearheads from Russia and eastern Europe toward Paris.'
  }
};
function scenarioModel() {
  return E.scenarios?.[scenarioKey] || E.scenarios?.japan;
}
function scenarioDialog() {
  const model = scenarioModel();
  if (!model) return;
  if(!model.sides.includes(scenarioSide))scenarioSide=model.sides[0];
  const japan = scenarioKey === 'japan';
  if(!japan && scenarioDifficulty === 'elite')scenarioDifficulty='normal';
  const preview = model.create(scenarioSide,'normal',246801);
  const choices = [
    ['japan','The Invasion of Japan','44 cities · 3 sides'],
    ['europe','The European War','44 cities · 2 sides']
  ].map(([key,title,note])=>
    '<button class="small'+(key===scenarioKey?' active':'')+
    '" data-scenario-model="'+key+'" aria-pressed="'+(key===scenarioKey)+'">'+
    title+' · '+note+'</button>').join('');
  const cards=model.sides.map(s=>{
    const owner=E.FACTIONS[s];
    const cities=preview.stations.filter(c=>c.owner===s).length;
    const units=preview.units.filter(u=>u.side===s).length;
    return '<button class="faction '+s+(s===scenarioSide?' active':'')+
      '" data-scenario-faction="'+s+'">'+
      '<span class="label" style="color:'+owner.color+'">'+owner.short+'</span>'+
      '<h3>'+owner.name+'</h3><p>'+SCENARIO_BLURBS[scenarioKey][s]+'</p>'+
      '<p class="doctrine">'+cities+' cities · '+units+' starting formations</p>'+
      '<span class="select-mark">'+(s===scenarioSide?'✓ Selected':'Select faction')+'</span></button>';
  }).join('');
  const difficulties = Object.entries(E.DIFFICULTIES)
    .filter(([id])=>['normal','hard','challenge',...(japan?['elite']:[])].includes(id))
    .sort((a,b)=>['normal','hard','challenge','elite'].indexOf(a[0])-
      ['normal','hard','challenge','elite'].indexOf(b[0]))
    .map(([id,d])=>'<option value="'+id+'"'+
      (scenarioDifficulty===id?' selected':'')+'>'+d.name+'</option>').join('');
  modal.innerHTML='<div class="overlay"><section class="dialog wide scenario-select" role="dialog" aria-modal="true" aria-label="Scenario selection">'+
    '<div class="dialog-head"><div><div class="eyebrow">Scenario Mode · 2017 a.t.b.</div>'+
    '<h2>'+model.title+'</h2><p>'+(japan?
      'Three playable powers in the Japanese theatre, with an alliance that ends on turn 10.':
      'Euro Britannia versus Europia United. No scripted turn limit: capture every enemy city.')+
    '</p><div class="scenario-choices">'+choices+'</div>'+
    '</div><button class="small close" data-action="scenario-close">Back</button></div>'+
    '<canvas id="scenario-preview-map" class="scenario-preview-map" aria-label="Regional scenario preview with cities and armies"></canvas>'+
    '<div class="choice-grid '+(japan?'three':'two')+'">'+cards+'</div>'+
    '<div class="setup-row"><div><label for="scenario-difficulty">Difficulty</label>'+
    '<select id="scenario-difficulty" class="select">'+difficulties+'</select>'+
    '<p class="mode-note">'+(japan&&scenarioDifficulty==='elite'?
      'Elite Japan retains its advanced starting formations and elite production rules.':
      'Hard and Challenge strengthen rival armies and income.')+'</p></div>'+
    '<div><label>Strategic situation</label><p>'+(japan?
      'Britannia and Black Knights remain allied through turn 9.':
      'Both sides are hostile from turn 1. Europia United has the larger industrial economy; Euro Britannia begins with a heavier eastern field army.')+
    '</p></div></div>'+
    '<div class="dialog-footer"><small class="notice">'+model.cols+' × '+model.rows+
      ' hexes · '+preview.stations.length+' cities · '+preview.units.length+
      ' starting formations · Standalone play, no saves. Total conquest victory.</small>'+
      '<button class="primary" data-action="start-scenario">Command '+E.FACTIONS[scenarioSide].short+'</button></div>'+
    '</section></div>';
  const canvas=modal.querySelector('#scenario-preview-map');
  if(canvas){
    const dpr=Math.min(window.devicePixelRatio||1,2),rect=canvas.getBoundingClientRect();
    canvas.width=Math.max(600,Math.round(rect.width*dpr));
    canvas.height=Math.max(330,Math.round(rect.height*dpr));
    const b=canvas.getContext('2d');
    if(b)paintMap(b,preview,canvas.width,canvas.height,dpr,true);
  }
  focusDialog();
}
function startScenario(side=scenarioSide) {
  const model=scenarioModel();
  if(!model?.sides.includes(side))return;
  resetSession();
  game=model.create(side,scenarioDifficulty,Date.now()>>>0);
  scenarioRoutingGroup=null;
  setWorld();
  const focusName=scenarioKey==='japan'
    ? {britannia:'Nagoya',bk:'Kyoto',cf:'Fukuoka'}[side]
    : {eu:'Warsaw',eb:'Minsk'}[side];
  const focus=game.stations.find(s=>s.name===focusName)||
    game.stations.find(s=>s.owner===side);
  const units=game.units.filter(u=>u.side===side&&u.hp>0)
    .sort((a,b)=>E.distance(a,focus,game)-E.distance(b,focus,game));
  selection={kind:'unit',id:units[0]?.id};
  zoom=homeZoom();
  closeModal();
  render();
  centerOn(focus||selectedUnit()||homeOf());
  toast(model.title+' loaded. All enemy cities must fall. No progress is saved.',true);
}

function scenarioGroupsDialog() {
  if(game.mode!=='scenario')return;
  const groups=game.scenario.groups.filter(gr=>gr.side===game.player);
  const rows=groups.map(gr=>{
    const units=gr.units.map(id=>game.units.find(u=>u.id===id)).filter(u=>u&&u.hp>0);
    const destination=gr.destination?' · Destination '+gr.destination.c+','+gr.destination.r:'';
    return '<div class="conquest-row scenario-army-row"><div>'+
      '<label>'+units.length+' operational formations'+destination+'</label>'+
      '<h3 class="conquest-title">'+esc(gr.name)+'</h3>'+
      '<p class="mode-note">'+units.map(u=>esc(E.TYPES[u.type].name)).slice(0,6).join(' · ')+
      (units.length>6?' · …':'')+'</p></div>'+
      '<div class="scenario-group-buttons"><button data-scenario-group-focus="'+gr.id+'">Locate</button>'+
      '<button class="primary" data-scenario-group-route="'+gr.id+'"'+(!units.length?' disabled':'')+'>Set destination</button></div>'+
      '</div>';
  }).join('');
  modal.innerHTML='<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Scenario army groups">'+
    '<div class="dialog-head"><div><div class="eyebrow">Scenario · Operational Command</div>'+
    '<h2>Army Groups & Fleets</h2><p>Group orders assign standing destinations to each reachable formation. '+
    'They advance at the beginning of each of your turns.</p></div>'+
    '<button class="small close" data-action="close">Return</button></div>'+
    rows+'<div class="dialog-footer"><small>Choose another destination to replace a group order.</small></div>'+
    '</section></div>';
  focusDialog();
}
function scenarioGroupFocus(id) {
  const gr=game.scenario?.groups?.find(v=>v.id===id&&v.side===game.player);
  const u=gr?.units.map(id=>game.units.find(v=>v.id===id&&v.hp>0)).find(Boolean);
  closeModal();
  if(u)selectUnit(u.id,true);
}
function scenarioGroupStart(id) {
  if(game.mode!=='scenario' || !interactive() || !game.scenario.groups.some(
      gr=>gr.id===id&&gr.side===game.player))return;
  scenarioRoutingGroup=id;
  routing=null;
  deploying=null;
  closeModal();
  toast('Click a destination hex for the selected army group. Press Escape to cancel.',true);
}

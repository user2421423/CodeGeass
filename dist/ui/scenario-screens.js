/* Scenario Mode: choose a regional war and faction, preview the real starting map. */
'use strict';
let scenarioSide = 'britannia';
let scenarioDifficulty = 'normal';
let scenarioRoutingGroup = null;
const SCENARIO_BLURBS = {
  britannia: 'Defend Honshu and contain the Chinese Federation at the Kanmon Strait while cooperating temporarily with the Black Knights.',
  bk: 'Command Zero’s resistance enclaves in central Japan. For now the Black Knights are temporarily allied to Britannia.',
  cf: 'Command all of Kyushu as the Federation invasion base and push north into Honshu.'
};
function scenarioDialog() {
  const model=E.scenarios?.japan;
  if(!model) return;
  if(!model.sides.includes(scenarioSide))scenarioSide='britannia';
  const preview=model.create(scenarioSide,'normal',246801);
  const cards=model.sides.map(s=>{
    const owner=E.FACTIONS[s];
    const cities=preview.stations.filter(c=>c.owner===s).length;
    const units=preview.units.filter(u=>u.side===s).length;
    return '<button class="faction '+s+(s===scenarioSide?' active':'')+'" data-scenario-faction="'+s+'">'+
      '<span class="label" style="color:'+owner.color+'">'+owner.short+'</span>'+
      '<h3>'+owner.name+'</h3><p>'+SCENARIO_BLURBS[s]+'</p>'+
      '<p class="doctrine">'+cities+' cities · '+units+' starting formations</p>'+
      '<span class="select-mark">'+(s===scenarioSide?'✓ Selected':'Select faction')+'</span></button>';
  }).join('');
  modal.innerHTML='<div class="overlay"><section class="dialog wide scenario-select" role="dialog" aria-modal="true" aria-label="Scenario selection">'+
    '<div class="dialog-head"><div><div class="eyebrow">Scenario Mode · Japan · 2017 a.t.b.</div>'+
    '<h2>The Invasion of Japan</h2><p>Three playable powers on a regional hex map. Choose a faction and inspect its starting territory and armies.</p>'+
    '</div><button class="small close" data-action="scenario-close">Back</button></div>'+
    '<canvas id="scenario-preview-map" class="scenario-preview-map" aria-label="Japan scenario map preview with starting territories and units"></canvas>'+
    '<div class="choice-grid three">'+cards+'</div>'+
    '<div class="setup-row"><div><label for="scenario-difficulty">Difficulty</label>'+
    '<select id="scenario-difficulty" class="select">'+
    Object.entries(E.DIFFICULTIES).map(([id,d])=>'<option value="'+id+'"'+
      (scenarioDifficulty===id?' selected':'')+'>'+d.name+'</option>').join('')+
    '</select><p class="mode-note">Hard and Challenge strengthen rival starting formations and income.</p>'+
    '</div><div><label>Alliance</label><p>Britannia and the Black Knights are allied until turn 10.</p></div></div>'+
    '<div class="dialog-footer"><small class="notice">'+model.cols+' × '+model.rows+' hexes · '+preview.stations.length+' cities · '+preview.units.length+
    ' formations · No saves. Accurate coastlines and regional armies. Britannia and the Black Knights split on turn 10.</small>'+
    '<button class="primary" data-action="start-scenario">Command '+E.FACTIONS[scenarioSide].short+'</button></div>'+
    '</section></div>';
  const canvas=modal.querySelector('#scenario-preview-map');
  if(canvas){
    const dpr=Math.min(window.devicePixelRatio||1,2), rect=canvas.getBoundingClientRect();
    canvas.width=Math.max(600,Math.round(rect.width*dpr));
    canvas.height=Math.max(330,Math.round(rect.height*dpr));
    const b=canvas.getContext('2d');
    if(b)paintMap(b,preview,canvas.width,canvas.height,dpr,true);
  }
  focusDialog();
}
function startScenario(side=scenarioSide) {
  if(!E.scenarios?.japan?.sides.includes(side))return;
  resetSession();
  game=E.scenarios.japan.create(side,scenarioDifficulty,Date.now()>>>0);
  scenarioRoutingGroup=null;
  setWorld();
  selection={kind:'unit',id:game.units.find(u=>u.side===game.player && u.cmd)?.id ||
    game.units.find(u=>u.side===game.player)?.id};
  zoom=homeZoom();
  closeModal();
  render();
  centerOn(selectedUnit() || homeOf());
  toast('Japan scenario loaded. Use Army Groups to move formations together. No progress is saved.',true);
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

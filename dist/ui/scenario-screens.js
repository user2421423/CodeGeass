/* Scenario Mode: choose a regional war and faction, preview the real starting map. */
'use strict';
let scenarioSide = 'britannia';
const SCENARIO_BLURBS = {
  britannia: 'Defend Area 11 and contain the Chinese landings while cooperating temporarily with the Black Knights.',
  bk: 'Command Zero’s resistance enclaves in central Japan. For now the Black Knights are temporarily allied to Britannia.',
  cf: 'Expand the Kyushu beachhead and break through toward Honshu with the Federation invasion armies.'
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
    '<div class="dialog-footer"><small class="notice">'+model.cols+' × '+model.rows+' hexes · '+preview.stations.length+' cities · '+preview.units.length+
    ' formations · No saves. Stage one: geography and starting forces. The turn-10 betrayal is not implemented yet.</small>'+
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
  game=E.scenarios.japan.create(side,'normal',Date.now()>>>0);
  setWorld();
  selection={kind:'unit',id:game.units.find(u=>u.side===game.player && u.cmd)?.id ||
    game.units.find(u=>u.side===game.player)?.id};
  zoom=homeZoom();
  closeModal();
  render();
  centerOn(selectedUnit() || homeOf());
  toast('Japan scenario loaded. This stage includes geography and the three starting armies; no progress is saved.',true);
}

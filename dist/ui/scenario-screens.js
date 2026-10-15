/* Regional scenarios: the Invasion and Division of Japan and the European War, with faction/map previews. */
'use strict';
let scenarioSide = 'britannia';
let scenarioKind = 'invasion-japan';
let scenarioDifficulty = 'normal';
let scenarioRoutingGroup = null;
// Scenario modules load in the background after the start menu (scenario-manifest.js); wait for them once.
function withScenarios(then) {
  if (scenariosReady) return then();
  toast('Loading regional scenarios…');
  loadScenarios().then(then, e => toast(e.message, true));
}
function scenarioModel(kind = scenarioKind) {
  return E.scenarios?.byId?.[kind] || E.scenarios?.japan;
}
function scenarioDialog() {
  const model = scenarioModel();
  if (!model) return;
  if (!model.sides.includes(scenarioSide)) scenarioSide = model.sides[0];
  const text = model.meta.text;
  const saved = getSave(SCENARIO_KEY), resume = saved && !saved.over && scenarioModel(saved.scenario?.id);
  const preview = model.create(scenarioSide,scenarioDifficulty,246801);
  const choices = SCENARIO_MANIFEST.filter(({id})=>E.scenarios?.byId?.[id]).map(({id,title,note})=>
    '<button class="small'+(id===scenarioKind?' active':'')+
    '" data-scenario-kind="'+id+'" aria-pressed="'+(id===scenarioKind)+'">'+
    title+' · '+note+'</button>').join('');
  const cards=model.sides.map(s=>{
    const owner=E.FACTIONS[s];
    const cities=preview.stations.filter(c=>c.owner===s).length;
    const units=preview.units.reduce((n,u)=>n+(u.side===s?1:0)+
      (u.cargo||[]).filter(v=>v.side===s).length,0);
    return '<button class="faction '+s+(s===scenarioSide?' active':'')+'" data-scenario-faction="'+s+'">'+
      (ART.flagSVG(s) ? '<span class="faction-banner" aria-hidden="true">'+ART.flagSVG(s)+'</span>' : '')+
      '<span class="label" style="color:'+(s==='bk'?'#f0c94a':owner.color)+'">'+owner.short+'</span>'+
      '<h3>'+owner.name+'</h3><p>'+(model.meta.blurbs?.[s]||'')+'</p>'+
      '<p class="doctrine">'+cities+' cities · '+units+' starting formations</p>'+
      '<span class="select-mark">'+(s===scenarioSide?'✓ Selected':'Select faction')+'</span></button>';
  }).join('');
  const difficulties = Object.entries(E.DIFFICULTIES)
    .filter(([id])=>['normal','hard','challenge','elite'].includes(id))
    .sort((a,b)=>['normal','hard','challenge','elite'].indexOf(a[0])-
      ['normal','hard','challenge','elite'].indexOf(b[0]))
    .map(([id,d])=>'<option value="'+id+'"'+
      (scenarioDifficulty===id?' selected':'')+'>'+d.name+'</option>').join('');
  modal.innerHTML='<div class="overlay"><section class="dialog wide scenario-select" role="dialog" aria-modal="true" aria-label="Scenario selection">'+
    '<div class="dialog-head"><div><div class="eyebrow">Scenario Mode · '+text.era+'</div>'+
    '<h2>'+model.title+'</h2><p>'+text.intro+'</p><div class="scenario-choices">'+choices+'</div>'+
    '</div><button class="small close" data-action="scenario-close">Back</button></div>'+
    (resume ? '<div class="conquest-row"><div><label>Saved scenario</label><h3 class="conquest-title">'+esc(resume.title)+'</h3>'+
      '<p class="mode-note">'+E.FACTIONS[saved.player].name+' · '+(E.DIFFICULTIES[saved.difficulty]?.name || 'Normal')+' · turn '+saved.turn+'</p></div>'+
      '<button class="primary" data-action="continue-scenario">Continue</button></div>' : '')+
    '<canvas id="scenario-preview-map" class="scenario-preview-map" aria-label="Regional scenario preview with cities and armies"></canvas>'+
    '<div class="choice-grid '+(model.sides.length===2?'two':'three')+'">'+cards+'</div>'+
    '<div class="setup-row"><div><label for="scenario-difficulty">Difficulty</label>'+
    '<select id="scenario-difficulty" class="select">'+difficulties+'</select>'+
    '<p class="mode-note">'+(scenarioDifficulty==='elite'?text.elite:'Hard and Challenge strengthen rival armies and income.')+'</p></div>'+
    '<div><label>Opening diplomacy</label><p>'+text.diplomacy+'</p></div></div>'+
    '<div class="dialog-footer"><small class="notice">'+model.cols+' × '+model.rows+
      ' hexes · '+preview.stations.length+' cities · '+preview.units.length+
      ' starting formations · Saved automatically in its own scenario slot. Total conquest victory.</small>'+
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
function startScenario(side=scenarioSide, campaignContext=null) {
  const model=scenarioModel();
  if(!model?.sides.includes(side))return;
  resetSession();
  game=model.create(side,scenarioDifficulty,Date.now()>>>0);
  if (campaignContext) game.warCampaign={...campaignContext};
  scenarioRoutingGroup=null;
  setWorld();
  // Start inside each faction's theatre instead of fitting empty sea.
  const focusName=model.meta.text.focus[side];
  const focus=game.stations.find(s=>s.name===focusName)||
    game.stations.find(s=>s.owner===side)||
    game.units.find(u=>u.side===side&&u.hp>0);
  const units=game.units.filter(u=>u.side===side&&u.hp>0)
    .sort((a,b)=>E.distance(a,focus,game)-E.distance(b,focus,game));
  selection={kind:'unit',id:units[0]?.id};
  zoom=homeZoom();
  closeModal();
  render();
  centerOn(focus||selectedUnit()||homeOf());
  save();
  toast(model.title+' loaded. All enemy cities must fall. Progress saves automatically each turn.',true);
}

function scenarioGroupsDialog() {
  if(game.mode!=='scenario')return;
  const groups=game.scenario.groups.filter(gr=>gr.side===game.player);
  const rows=groups.map(gr=>{
    const listed=[...game.units,...game.units.flatMap(u=>u.cargo||[])];
    const units=gr.units.map(id=>listed.find(u=>u.id===id)).filter(u=>u&&u.hp>0);
    const editable=E.armyGroup(game,gr.editableId);
    const destination=gr.destination?' · Destination '+gr.destination.c+','+gr.destination.r:'';
    return '<div class="conquest-row scenario-army-row"><div>'+
      '<label>'+units.length+' operational formations'+destination+'</label>'+
      '<h3 class="conquest-title">'+esc(gr.name)+'</h3>'+
      '<p class="mode-note">'+units.map(u=>esc(E.TYPES[u.type].name)).slice(0,6).join(' · ')+
      (units.length>6?' · …':'')+'</p></div>'+
      '<div class="scenario-group-buttons"><button data-scenario-group-focus="'+gr.id+'">Locate</button>'+
      '<button class="small" data-scenario-group-import="'+gr.id+'">'+(editable?'Manage editable group':'Make editable group')+'</button>'+ 
      (editable?'':'<button class="primary" data-scenario-group-route="'+gr.id+'"'+(!units.length?' disabled':'')+'>Set destination</button>')+'</div>'+
      '</div>';
  }).join('');
  modal.innerHTML='<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Scenario army groups">'+
    '<div class="dialog-head"><div><div class="eyebrow">Scenario · Operational Command</div>'+
    '<h2>Army Groups & Fleets</h2><p>Group orders assign standing destinations to each reachable formation. '+
    'They advance at the beginning of each of your turns.</p></div>'+
    '<button class="small close" data-action="close">Return</button></div>'+
    rows+'<div class="dialog-footer"><small>Import a starting formation to add, remove, and direct its units using the full Army Groups controls.</small><button data-action="army-groups">Army Groups</button></div>'+
    '</section></div>';
  focusDialog();
}
function scenarioGroupFocus(id) {
  const gr=game.scenario?.groups?.find(v=>v.id===id&&v.side===game.player);
  const u=gr?.units.map(id=>game.units.find(v=>v.id===id&&v.hp>0)).find(Boolean)||
    (scenarioModel(game.scenario?.id)?.meta?.groupsStartEmbarked&&game.units.find(ship=>ship.hp>0&&
      (ship.cargo||[]).some(c=>gr?.units.includes(c.id)&&c.hp>0)));
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

function scenarioGroupImport(id) {
  if (game.mode !== 'scenario' || !interactive()) return;
  const staging = game.scenario?.groups?.find(gr => gr.id === id && gr.side === game.player);
  if (!staging) return;
  const existing = E.armyGroup(game, staging.editableId);
  if (existing) return armyGroupsDialog(existing.id);
  const created = E.createArmyGroup(game);
  if (!created.ok) return toast(created.reason);
  const group = created.group;
  group.name = staging.name;
  const members = staging.units.filter(unitId =>
    game.units.some(u => u.id === unitId && u.hp > 0 && u.side === game.player));
  // Land invasion groups that begin aboard carriers (Korea): editing their
  // formation before landing imports the carrier hosts, never cargo ghosts.
  if(scenarioModel(game.scenario?.id)?.meta?.groupsStartEmbarked){
    const embarked=new Set(staging.units);
    for(const ship of game.units)if(ship.side===game.player&&ship.hp>0&&
      (ship.cargo||[]).some(c=>embarked.has(c.id)&&c.hp>0)&&!members.includes(ship.id))
      members.push(ship.id);
  }
  let assigned = 0;
  for (const unitId of members.slice(0, 24))
    if (E.addArmyGroupUnit(game, group.id, unitId).ok) assigned++;
  if (staging.destination) E.orderArmyGroup(game, group.id, staging.destination.c, staging.destination.r);
  staging.editableId = group.id;
  refreshAndSave();
  armyGroupsDialog(group.id);
  toast(group.name + ': ' + assigned + ' formations imported' +
    (members.length > 24 ? ' · 24-unit group limit reached' : '') + '.');
}

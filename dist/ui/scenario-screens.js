/* Regional scenarios: the Invasion and Division of Japan and the European War, with faction/map previews. */
'use strict';
let scenarioSide = 'britannia';
let scenarioKind = 'invasion-japan';
let scenarioDifficulty = 'normal';
let scenarioRoutingGroup = null;
const SCENARIO_KINDS = [
  ['invasion-japan','The Invasion of Japan','44 cities · 3 sides'],
  ['division-japan','The Division of Japan','44 cities · 3 sides'],
  ['european-war','The European War','44 cities · 2 sides'],
  ['operation-stonehenge','Operation Stonehenge','37 cities · 2 sides'],
  ['bering-strait','The Bering Strait Crisis','28 cities · 2 sides'],
  ['conquest-indochina','The Conquest of Indochina','44 cities · 2 sides'],
  ['philippines-invasion','The Invasion of the Philippines','37 cities · 2 sides'],
  ['war-for-australia','The War for Australia','48 cities · 3 sides'],
  ['area-18','The Conquest of Area 18','50 cities · 3 sides'],
  ['britannia-siberia','Invasion of Siberia','49 cities · 2 sides'],
  ['invasion-south-africa','Invasion of South Africa','47 cities · 2 sides'],
  ['invasion-caribbean','Invasion of the Caribbean','41 cities · 2 sides'],
  ['crossing-urals','Crossing the Urals','40 cities · 2 sides'],
  ['invasion-turkey','Invasion of Turkey','59 cities · 2 sides'],
  ['britannia-western-russia','Invasion of St. Petersburg and Moscow','41 cities · 2 sides']
];
const SCENARIO_BLURBS = {
'crossing-urals': {
britannia:'Drive west from Yekaterinburg and Chelyabinsk through the mountain pass corridors.',
eu:'Hold Perm, Ufa and the defended industrial passes; counterattack eastern spearheads.'
},
  'britannia-western-russia': {
    britannia: 'Advance west from the Volga through three Army Group axes, breach Moscow and St. Petersburg, then conquer all E.U. cities.',
    eu: 'Hold Moscow, St. Petersburg, the Upper Volga and the wooded river approaches. Commit reserves to blunt the Britannian offensive.'
  },
  'war-for-australia': {
    britannia: 'Hold Sydney, Melbourne, Brisbane and Australia’s eastern industrial heartland. Counter northern advances and Western amphibious landings.',
    cf: 'Push south from Darwin through the Outback, fight for Cape York, and launch amphibious assaults on the eastern and western coasts.',
    eu: 'Defend Perth and Adelaide, exploit the southern coastal corridor, and launch carrier-led landings to outflank eastern strongholds.'
  },
  'invasion-japan': {
    britannia: 'Defend Honshu and contain the Chinese Federation at the Kanmon Strait while cooperating temporarily with the Black Knights.',
    bk: 'Command Zero’s resistance enclaves in central Japan. For now the Black Knights are temporarily allied to Britannia.',
    cf: 'Command all of Kyushu as the Federation invasion base and push north into Honshu.'
  },
  'division-japan': {
    britannia: 'Hold the industrial heartland and Mount Fuji while defending against enemies to the north and west.',
    eu: 'Fight south from Hokkaido and Tohoku, or break out of the Chiba–Narita bridgehead beside Tokyo.',
    cf: 'Command western Honshu, Shikoku and Kyushu. Exploit strategic depth, multiple ports and your broad army front.'
  },
  'european-war': {
    eu: 'Hold the industrial cities of western and central Europe against the eastern offensive.',
    eb: 'Lead Euro Britannia’s elite spearheads from Russia and eastern Europe toward Paris.'
  },
  'operation-stonehenge': {
    britannia: 'Lead a carrier-borne amphibious invasion with no starting cities. Take E.U. ports to gain production capacity.',
    eu: 'Hold the British Isles, France and Iberia; repel Britannian carriers and amphibious landing forces.'
  },
  'invasion-caribbean': {
    eu: 'Command six loaded carrier forces, capture island harbours and advance from Cuba and the Bahamas through Hispaniola to the Lesser Antilles.',
    britannia: 'Defend the major islands and harbours, concentrate naval patrols and counterattack isolated beachheads.'
  },
  'invasion-south-africa': {
    britannia: 'Begin without cities. Land carrier-borne Knightmares at the Cape, along the southern coast, in KwaZulu-Natal or Namibia; seize ports before pushing inland.',
    eu: 'Hold all mainland cities, ports and industrial corridors. Intercept the carrier fleets, defend beaches and counterattack seized harbours.'
  },
  'conquest-indochina': {
    britannia: 'Hold mainland Southeast Asia with fortified fronts and a powerful coastal fleet.',
    cf: 'Invade south through northern Vietnam, Yunnan and mountain corridors toward Laos.'
  },
  'philippines-invasion': {
    britannia: 'Launch the all-out invasion from Koror, Peleliu and Yap: escort amphibious Knightmares, land on multiple Philippine islands and capture Chinese ports.',
    cf: 'Hold Luzon, the Visayas, Mindanao and Palawan. Defend the major ports, contest the sea, contain landings and counter-invade Palau and Yap.'
  },
  'britannia-siberia': {
    britannia: 'Launch the great westward offensive from Magadan, Oymyakon and Ust-Maya. Break E.U. defenses on the Lena and drive for the Trans-Siberian railway.',
    eu: 'Defend Yakutsk and Khandyga, protect the industrial railway hubs, preserve mobile reserves and counterattack Britannian columns.'
  },
  'bering-strait': {
    britannia: 'Command the Alaskan land army and carrier fleets. Cross the Bering Strait or strike Kamchatka through the Aleutians.',
    eu: 'Defend eastern Siberia and Chukotka, then counter-invade Alaska using fortified northern ports and Kamchatka bases.'
  },
  'invasion-turkey': {
    britannia: 'Lead the northern land offensive from Syria and Iraq, pierce the Taurus passes and land expeditionary fleets at Anatolian ports. Take every E.U. city.',
    eu: 'Defend Istanbul, Ankara and the Anatolian interior, hold the Bosporus and Dardanelles, then counterattack into Syria and Mesopotamia.'
  },
  'area-18': {
    britannia: 'Consolidate Arabia and Mesopotamia, break the Levantine line and drive east into Persia. Your fleets hold Gulf and Red Sea bases.',
    eu: 'Launch coordinated offensives from Syria, the Levant and Suez. Defend the northern Iraqi front against two rival armies.',
    cf: 'Command Persia from Tehran and the Zagros to Herat. Use mountain passes and the Persian Gulf to contest Britannian expansion.'
  }
};
const SCENARIO_TEXT = {
'crossing-urals': {
era:'The Urals · Alternate 2017',
intro:'Britannia advances from Siberia into E.U.-held industrial Russia. Capture every city without a turn limit.',
diplomacy:'Both sides are hostile from the start. Routes through the mountains are slower except at named valleys.',
elite:'Elite Urals uses the existing land Elite Force conversion, rival commanders and difficulty scaling.',
focus:{britannia:'Yekaterinburg',eu:'Perm'}
},
  'britannia-western-russia': {
    era: 'Western Russia · Alternate 2017',
    intro: 'After crossing the Urals, Britannia invades E.U.-controlled western Russia. Capture all 41 cities to win; no turn limit.',
    diplomacy: 'Two hostile powers from turn 1. Moscow and St. Petersburg are exceptionally fortified, but neither is invulnerable.',
    elite: 'Elite Western Russia: single-frame eligible Elite Forces; AI named commanders begin at Level 5. AI has stronger research and production, while player unlocks follow HQ rules.',
    focus: {britannia:'Kazan',eu:'Moscow'}
  },
  'war-for-australia': {
    era: 'Australia · Alternate 2018',
    intro: 'Britannia holds the east, China the north, and Europia the west. Three-way continental and naval war. Conquer every rival city.',
    diplomacy: 'All three powers are enemies from turn 1. No alliances, scripted diplomacy, or turn limit.',
    elite: 'Elite Australia: rivals gain 60% extra turn income and veteran three-frame land formations; all sides use their established faction units and commander rosters.',
    focus: {britannia:'Sydney',cf:'Darwin',eu:'Perth'}
  },
  'invasion-japan': {
    era: 'Japan · 2017 a.t.b.',
    intro: 'Three playable powers in the Japanese theatre, with an alliance that ends on turn 10.',
    diplomacy: 'Britannia and the Black Knights are allied until turn 10.',
    elite: 'All starting units are elite; AI-controlled starting commanders have Lv.5 frames, while player units and uncommanded AI units start at Lv.1. Rival factions recruit unlimited elites with Supreme Commander officers, full research, and Challenge advantages. Player elite recruitment requires HQ unlocks; mission carriers are available without permanent unlocks.',
    focus: {britannia:'Nagoya',bk:'Kyoto',cf:'Fukuoka'}
  },
  'division-japan': {
    era: 'Japan · Alternate 2017',
    intro: 'Alternate 2017: Britannia, Europia and China fight for a divided Japan from the first turn.',
    diplomacy: 'No alliances: all three powers are hostile from turn 1.',
    elite: 'All starting units are elite; AI-controlled starting commanders have Lv.5 frames, while player units and uncommanded AI units start at Lv.1. Rival factions recruit unlimited elites with Supreme Commander officers, full research, and Challenge advantages. Player elite recruitment requires HQ unlocks; mission carriers are available without permanent unlocks.',
    focus: {britannia:'Nagoya',eu:'Sendai',cf:'Hiroshima'}
  },
  'european-war': {
    era: 'Europe · 2017 a.t.b.',
    intro: 'Euro Britannia versus Europia United. No scripted turn limit: capture every enemy city.',
    diplomacy: 'Both sides are hostile from turn 1. Europia United has the larger industrial economy; Euro Britannia begins with a heavier eastern field army.',
    elite: 'Elite Europe: both armies and fleets begin as single-frame Lv.1 elites, except AI named commanders at Lv.5. Euro Britannia borrows Britannian Elite Forces. AI factories produce unlimited Lv.1 elites with full research; player Elite Force unlocks follow HQ rules.',
    focus: {eu:'Warsaw',eb:'Minsk'}
  },
  'operation-stonehenge': {
    era: 'Western Europe · Alternate 2017',
    intro: 'Britannia invades from the Atlantic with troops loaded on carriers and amphibious Knightmares at sea. The E.U. holds every city.',
    diplomacy: 'Only Britannia and Europia United are at war. Britannia must seize the entire theatre; the E.U. can win by destroying the invaders.',
    elite: 'Elite Stonehenge: land and amphibious units start as Elite Forces. Carriers remain conventional.',
    focus: {britannia:'',eu:'Paris'}
  },
  'invasion-caribbean': {
    era: 'Caribbean Sea · Alternate 2017',
    intro: 'Six E.U. task forces begin offshore with no cities; Britannia holds 41 island cities across the Caribbean.',
    diplomacy: 'Capture every hostile city to win. No turn limit and no F.L.E.I.J.A.',
    elite: 'Elite Caribbean converts eligible land forces and amphibious troops under the standard regional Elite rules; naval carriers remain conventional.',
    focus: {eu:'',britannia:'Havana'}
  },
  'invasion-south-africa': {
    era: 'Southern Africa · Alternate 2017',
    intro: 'Four Britannian carrier groups attack E.U.-controlled southern Africa from the Atlantic and Indian Oceans. Britannia owns no cities at the start.',
    diplomacy: 'Only Britannia and Europia United are at war. No turn limit: conquer every enemy city or eliminate the invading expedition.',
    elite: 'Elite South Africa: eligible Lv.1 Elite Forces replace transported land formations; named AI commanders reach Lv.5. Carriers and fleet escorts remain conventional.',
    focus: {britannia:'',eu:'Cape Town'}
  },
  'conquest-indochina': {
    era: 'Indochina · Alternate 2017',
    intro: 'The Chinese Federation invades Britannian mainland Southeast Asia. Capture all 44 cities to win.',
    diplomacy: 'Hostile from turn 1. F.L.E.I.J.A. is disabled; there is no scripted deadline.',
    elite: 'Elite Indochina replaces land and amphibious formations with faction Elite Forces; carriers remain conventional.',
    focus: {britannia:'Vinh',cf:'Hanoi'}
  },
  'britannia-siberia': {
    era: 'Siberia · Alternate 2017',
    intro: 'Following the Bering Strait victory, Britannia attacks west from Russian Far Eastern footholds. Capture every one of 49 Siberian cities to win.',
    diplomacy: 'Britannia and Europia United are hostile from turn 1. No F.L.E.I.J.A., scripted alliances or turn limit.',
    elite: 'Elite Siberia uses the established Elite Force conversion, rival veteran commanders and scenario research rules. No global faction unit changes.',
    focus: {britannia:'Ust-Maya',eu:'Yakutsk'}
  },
  'bering-strait': {
    era: 'Bering Strait · Alternate 2017',
    intro: 'Britannia versus Europia United: a two-front naval and amphibious war from Alaska to Kamchatka. Conquer every enemy city.',
    diplomacy: 'Britannia and Europia United are at war from turn 1. There is no Chinese Federation involvement or scripted deadline.',
    elite: 'Elite Bering: land and amphibious forces begin as Lv.1 Elite Forces; enemy named commanders begin at Lv.5. Carriers remain conventional. Rival AI has advanced research and elite factories; players follow HQ unlock rules.',
    focus: {britannia:'Nome',eu:'Provideniya'}
  },
  'philippines-invasion': {
    era: 'Philippine Archipelago · Alternate 2017',
    intro: 'Britannia launches an offshore carrier-supported assault on the Chinese Federation’s fortified Philippine archipelago. China controls every Philippine city on turn 1.',
    diplomacy: 'Britannia and the Chinese Federation are at war immediately. No scripted alliance or deadline. Victory requires taking all 37 theatre cities.',
    elite: 'Elite Philippines: starting land and amphibious formations become single-frame Elite Forces; AI named commanders begin at Lv.5. Carriers remain conventional. Elite recruitment follows the existing HQ and AI difficulty rules.',
    focus: {britannia:'Koror',cf:'Manila'}
  },
  'invasion-turkey': {
    era: 'Anatolia · Alternate 2017',
    intro: 'Britannia attacks north from the Middle East while its expeditionary fleets target the Mediterranean coast. Europia United defends Turkey and the straits. Capture all 59 cities.',
    diplomacy: 'Two powers are at war from turn 1. The Bosporus and Dardanelles are navigable; ports may change hands. No turn limit.',
    elite: 'Elite Turkey uses standard faction Elite Force replacements for land and amphibious troops while ships remain conventional. AI income and commanders follow established Elite settings.',
    focus: {britannia:'Antakya',eu:'Ankara'}
  },
  'area-18': {
    era: 'Middle East · Alternate 2017',
    intro: 'Three great powers fight across Arabia, Mesopotamia, the Levant and Persia. Conquer every rival city.',
    diplomacy: 'Britannia, Europia United and the Chinese Federation are all hostile from turn 1. No betrayals, nuclear weapons or campaign deadline.',
    elite: 'Elite Area 18: each power begins with eligible Lv.1 Elite Forces. Rival named commanders start at Lv.5; carriers remain conventional. Research and Elite Force production follow existing scenario rules.',
    focus: {britannia:'Baghdad',eu:'Damascus',cf:'Kermanshah'}
  }
};
function scenarioModel(kind = scenarioKind) {
  return E.scenarios?.byId?.[kind] || E.scenarios?.japan;
}
function scenarioDialog() {
  const model = scenarioModel();
  if (!model) return;
  if (!model.sides.includes(scenarioSide)) scenarioSide = model.sides[0];
  const text = SCENARIO_TEXT[scenarioKind] || SCENARIO_TEXT['invasion-japan'];
  const saved = getSave(SCENARIO_KEY), resume = saved && !saved.over && scenarioModel(saved.scenario?.id);
  const preview = model.create(scenarioSide,scenarioDifficulty,246801);
  const choices = SCENARIO_KINDS.filter(([id])=>E.scenarios?.byId?.[id]).map(([id,title,note])=>
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
      '<h3>'+owner.name+'</h3><p>'+(SCENARIO_BLURBS[scenarioKind]?.[s]||'')+'</p>'+
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
  const focusName=(SCENARIO_TEXT[scenarioKind]||SCENARIO_TEXT['invasion-japan']).focus[side];
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

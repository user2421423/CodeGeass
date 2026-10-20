/* Regional scenarios: the Invasion and Division of Japan and the European War, with faction/map previews. */
'use strict';
let scenarioSide = 'britannia';
let scenarioKind = 'invasion-japan';
let scenarioDifficulty = 'normal';
let scenarioWeeklySelected = true;
let scenarioRoutingGroup = null;
// Training needs only the common geography, never the regional battle library.
function withScenarios(then) { return withGameAssets(ensureGeography, then); }
function scenarioModel(kind = scenarioKind) {
  return E.scenarios?.byId?.[kind] || SCENARIO_CATALOG[kind];
}
const SCENARIO_MENU_STYLE = 'combined';

let scenarioLibraryQuery = '';
let scenarioLibraryTheater = 'all';
const SCENARIO_THEATERS = Object.freeze([
  {
    "id": "alternate-history",
    "label": "Alternate History",
    "ids": [
      "rounds-rebellion",
      "shin-independence",
      "chinese-civil-war"
    ]
  },
  {
    "id": "east-asia",
    "label": "East Asia",
    "ids": [
      "invasion-japan",
      "defense-japan",
      "division-japan",
      "invasion-korea",
      "bf-south-china",
      "bf-yangtze",
      "battle-luoyang"
    ]
  },
  {
    "id": "pacific",
    "label": "Southeast Asia & Pacific",
    "ids": [
      "conquest-indochina",
      "philippines-invasion",
      "war-for-australia",
      "invasion-hawaii",
      "cf-new-zealand",
      "bf-malacca",
      "bering-strait"
    ]
  },
  {
    "id": "europe",
    "label": "Europe & Russia",
    "ids": [
      "european-war",
      "operation-stonehenge",
      "britannia-siberia",
      "crossing-urals",
      "britannia-western-russia"
    ]
  },
  {
    "id": "middle-east",
    "label": "Middle East & Africa",
    "ids": [
      "area-18",
      "britannia-iraq-iran",
      "invasion-south-africa",
      "invasion-turkey"
    ]
  },
  {
    "id": "americas",
    "label": "The Americas",
    "ids": [
      "invasion-brazil",
      "invasion-california",
      "invasion-canada",
      "invasion-caribbean",
      "eu-great-lakes",
      "eu-greenland",
      "invasion-american-east-coast",
      "eu-panama",
      "cf-panama",
      "cf-pacific-northwest",
      "cf-central-america",
      "cf-mexico",
      "eu-rocky-mountains",
      "eu-pendragon",
      "cf-pendragon"
    ]
  },
  {
    "id": "eu-federation",
    "label": "E.U. vs Federation",
    "ids": [
      "eu-cf-kazakhstan",
      "eu-cf-persia",
      "eu-cf-xinjiang",
      "eu-cf-india",
      "eu-cf-mongolia",
      "eu-cf-manchuria",
      "eu-cf-himalayas",
      "eu-cf-sichuan",
      "eu-cf-beijing",
      "eu-cf-luoyang"
    ]
  },
  {
    "id": "federation-eu",
    "label": "Federation vs E.U.",
    "ids": [
      "cf-eu-siberia",
      "cf-eu-caucasus",
      "cf-eu-turkey",
      "cf-eu-volga",
      "cf-eu-suez",
      "cf-eu-moscow",
      "cf-eu-balkans",
      "cf-eu-north-africa",
      "cf-eu-central-europe",
      "cf-eu-france"
    ]
  }
]);
// Unassigned scenarios stay visible in "All operations" instead of silently disappearing.
const SCENARIO_UNGROUPED = SCENARIO_MANIFEST
  .filter(({id})=>!SCENARIO_THEATERS.some(group=>group.ids.includes(id)))
  .map(({id})=>id);
const SCENARIO_LIBRARY_GROUPS = Object.freeze(SCENARIO_UNGROUPED.length
  ? [...SCENARIO_THEATERS,{id:'other',label:'Other Operations',ids:SCENARIO_UNGROUPED}]
  : SCENARIO_THEATERS);

function scenarioTheaterOf(id) {
  const group=SCENARIO_LIBRARY_GROUPS.find(theater=>theater.ids.includes(id));
  return group?.id || "other";
}

function scenarioCatalogRefresh() {
  const root=modal.querySelector('#scenario-library-index');
  if(!root) return;
  const term=scenarioLibraryQuery.trim().toLocaleLowerCase();
  const entries=SCENARIO_MANIFEST.filter(({id,title,note})=>
    (scenarioLibraryTheater==='all'||scenarioTheaterOf(id)===scenarioLibraryTheater)&&
    (!term||(title+' '+note+' '+scenarioTheaterOf(id)).toLocaleLowerCase().includes(term)));
  const groups=scenarioLibraryTheater==='all'?SCENARIO_LIBRARY_GROUPS:SCENARIO_LIBRARY_GROUPS.filter(g=>g.id===scenarioLibraryTheater);
  const normalCatalog=groups.map(group=>{
    const rows=entries.filter(entry=>group.ids.includes(entry.id));
    if(!rows.length) return '';
    const buttons=rows.map(({id,title,note})=>`<button class="scenario-entry ${id===scenarioKind?'active':''}" type="button" data-scenario-kind="${esc(id)}" aria-pressed="${id===scenarioKind}" title="${esc(title)}">
      <span class="scenario-entry-marker" aria-hidden="true">${id===scenarioKind?'◆':'◇'}</span>
      <span class="scenario-entry-copy"><strong>${esc(title)}</strong><small>${esc(note)}</small></span>
      <span class="scenario-entry-tail" aria-hidden="true">${id===scenarioKind?'●':'›'}</span>
    </button>`).join('');
    return `<section class="scenario-catalog-section" aria-label="${esc(group.label)}">
      <div class="scenario-catalog-group">${esc(group.label)}<span>${rows.length}</span></div>${buttons}</section>`;
  }).join('');
  const weeklyCatalog=scenarioLibraryTheater==='all' ? weeklyScenarioCatalogHTML(term) : '';
  root.innerHTML=weeklyCatalog + (normalCatalog || (weeklyCatalog ? '' : `<p class="scenario-catalog-empty">No matching operations. Try another theater or search term.</p>`));
  const count=modal.querySelector('#scenario-filter-count');
  if(count)count.textContent=entries.length+' of '+SCENARIO_MANIFEST.length+' operations';
}

function scenarioDialog() {
  if (scenarioWeeklySelected) scenarioKind=weeklyScenarioCurrent().scenarioId;
  const model=scenarioModel();
  // Load the high-resolution map while the player reads the scenario briefing
  // so the first gameplay frame is crisp instead of a blurred placeholder.
  if (typeof preloadRegionalMapImage === 'function')
    preloadRegionalMapImage(scenarioKind);
  if(!model)return;
  const priorCatalog=modal.querySelector('#scenario-library-index');
  const priorScroll=priorCatalog?.scrollTop || 0;
  const activeId=document.activeElement?.id;
  const activeFaction=document.activeElement?.dataset?.scenarioFaction;
  if(!model.sides.includes(scenarioSide))scenarioSide=model.sides[0];
  const brief=model.meta?.text || {};
  const saved=scenarioWeeklySelected ? weeklyScenarioSavedGame() : getSave(SCENARIO_KEY);
  const savedModel=saved&&!saved.over&&scenarioModel(saved.scenario?.id);
  // Read pre-generated map and force metadata. Never build a scenario just to browse.
  const imageMeta=typeof SCENARIO_STATIC_MAPS==='undefined'?{}:(SCENARIO_STATIC_MAPS[scenarioKind]||{});
  const meta=SCENARIO_MANIFEST.find(entry=>entry.id===scenarioKind);
  const cityCount=imageMeta.cities ?? (Number(meta?.note?.match(/\d+(?= cities)/)?.[0])||'—');
  const unitCount=imageMeta.formations ?? null;
  const sideCount=model.sides.length;
  const sides=model.sides.map(side=>{
    const owner=E.FACTIONS[side];
    const active=side===scenarioSide;
    const cities=imageMeta.sides?.[side]?.cities ?? '—';
    const units=imageMeta.sides?.[side]?.formations ?? '—';
    const portraitKey={britannia:'suzaku',eu:'leila',cf:'xingke',bk:'lelouch',eb:'shin'}[side];
    const portrait=portraitKey?ART.portrait(portraitKey,'scenario-side-art'):'';
    const flag=ART.flagSVG(side);
    return `<button class="scenario-side-option ${active?'active':''}" type="button" data-scenario-faction="${esc(side)}" aria-pressed="${active}" style="--scenario-side-color:${side==='bk'?'#f0c94a':owner.color}">
      <span class="scenario-side-image" aria-hidden="true">${portrait}</span>
      <span class="scenario-side-copy"><span class="scenario-side-name">${esc(owner.name)}</span><span class="scenario-side-stats">${cities} cities · ${units} formations</span></span>
      <span class="scenario-side-flag" aria-hidden="true">${flag||''}</span>
      <span class="scenario-side-mark" aria-hidden="true">${active?'✓':''}</span>
    </button>`;
  }).join('');
  const difficulties=Object.entries(E.DIFFICULTIES)
    .filter(([id])=>['normal','hard','challenge','elite'].includes(id))
    .sort((a,b)=>['normal','hard','challenge','elite'].indexOf(a[0])-['normal','hard','challenge','elite'].indexOf(b[0]))
    .map(([id,d])=>`<option value="${esc(id)}" ${scenarioDifficulty===id?'selected':''}>${esc(d.name)}</option>`).join('');
  const filterButtons=[{id:'all',label:'All operations'},...SCENARIO_LIBRARY_GROUPS].map(group=>
    `<button type="button" class="scenario-theater ${scenarioLibraryTheater===group.id?'active':''}" data-scenario-theater="${esc(group.id)}" aria-pressed="${scenarioLibraryTheater===group.id}">${esc(group.label)}</button>`).join('');
  const saveButton=savedModel?`<button class="scenario-resume" data-action="${scenarioWeeklySelected?'continue-weekly-scenario':'continue-scenario'}" type="button"><strong>Continue saved operation</strong><small>${esc(savedModel.title)} · Turn ${saved.turn}</small></button>`:'';
  modal.innerHTML=`<div class="overlay scenario-library-overlay">
    <section class="dialog scenario-library scenario-library--${SCENARIO_MENU_STYLE}" role="dialog" aria-modal="true" aria-label="Scenario selection" aria-describedby="scenario-library-description">
      <header class="scenario-library-header">
        <div class="scenario-library-heading"><span class="scenario-library-eyebrow">CODE GEASS / STRATEGIC WAR ARCHIVES</span><h1>Regional Operations</h1><p id="scenario-library-description">Select the theater, study its geography, and take command.</p></div>
        <button type="button" class="scenario-library-back" data-action="scenario-close">← Main menu</button>
      </header>
      <div class="scenario-workspace">
        <aside class="scenario-catalog" aria-label="Browse regional scenarios">
          <div class="scenario-catalog-heading"><strong>Scenario Index</strong><small id="scenario-filter-count"></small></div>
          <div class="scenario-search"><label for="scenario-library-query">Find an operation</label><input id="scenario-library-query" type="search" autocomplete="off" placeholder="Search battlefields…" aria-label="Search scenarios"></div>
          <div class="scenario-theaters" role="group" aria-label="Filter scenario group">${filterButtons}</div>
          <nav id="scenario-library-index" class="scenario-index" aria-label="Available regional scenarios"></nav>
        </aside>
        <main class="scenario-stage" aria-label="Selected regional operation">
          <div class="scenario-operation-header">
            <span class="scenario-operation-index">${esc(brief.era||'Regional campaign')} <span class="scenario-operation-slash">/</span> ${esc(meta?.note||'Regional operation')}</span>
            <h2>${esc(model.title)}</h2>
            ${scenarioWeeklySelected ? '<p class="scenario-weekly-heading">★ SCENARIO OF THE WEEK · CUMULATIVE REWARDS</p>' : ''}
          </div>
          <div class="scenario-stage-body">
            <div class="scenario-map-side">
              <div class="scenario-map-head"><span>OPERATIONAL MAP</span><span>${model.cols} × ${model.rows} HEXES</span></div>
              <div class="scenario-map-window">
                <img id="scenario-preview-map" class="scenario-preview-image" loading="eager" decoding="async" alt="Geographic map of ${esc(model.title)} with no troops or unit markers" src="scenario-previews/${esc(scenarioKind)}.webp"><p class="scenario-map-unavailable" aria-live="polite" hidden>Preview image unavailable. The scenario remains playable.</p>
              </div>
              <div class="scenario-map-legend"><span>${cityCount} cities</span><span>${unitCount===null?'Static geographic preview':unitCount+' starting formations'}</span><span>${sideCount} playable powers</span></div>
            </div>
            <aside class="scenario-brief" aria-label="Operation briefing and deployment">
              <section class="scenario-brief-text"><div class="scenario-brief-eyebrow">OPERATION BRIEF</div><p>${esc(brief.intro||'Control the battlefield and defeat rival armies.')}</p>
                ${brief.terrain ? '<p class="mode-note">'+esc(brief.terrain)+'</p>' : ''}<details class="scenario-diplomacy-details"><summary>Opening diplomacy</summary><p>${esc(brief.diplomacy||'All rival factions are hostile.')}</p></details>
              </section>
              ${scenarioWeeklySelected ? weeklyScenarioInfoHTML(scenarioDifficulty) : ''}
              <section class="scenario-brief-factions"><div class="scenario-brief-eyebrow">YOUR COMMAND</div><div class="scenario-side-grid" role="group" aria-label="Select playable faction">${sides}</div></section>
            </aside>
          </div>
        </main>
      </div>
      <footer class="scenario-library-footer">
        <div class="scenario-footer-saves">${saveButton}<span class="scenario-save-notice">${scenarioWeeklySelected ? 'Weekly event saves separately · Rewards once per difficulty per week' : 'Regional scenarios save independently · Total conquest victory'}</span></div>
        <div class="scenario-footer-launch"><div class="scenario-difficulty"><label for="scenario-difficulty">Difficulty</label><select id="scenario-difficulty" class="select">${difficulties}</select></div>
          <button class="scenario-deploy primary" type="button" data-action="start-scenario">Deploy ${esc(E.FACTIONS[scenarioSide]?.short||'forces')} <span aria-hidden="true">→</span></button></div>
      </footer>
    </section>
  </div>`;
  scenarioCatalogRefresh();
  const cat=modal.querySelector('#scenario-library-index');
  if(cat)cat.scrollTop=priorScroll;
  const search=modal.querySelector('#scenario-library-query');
  if(search){
    search.value=scenarioLibraryQuery;
    search.addEventListener('input',e=>{scenarioLibraryQuery=e.target.value;scenarioCatalogRefresh();});
  }
  modal.querySelectorAll('[data-scenario-theater]').forEach(button=>{
    button.addEventListener('click',()=>{
      scenarioLibraryTheater=button.dataset.scenarioTheater;
      modal.querySelectorAll('[data-scenario-theater]').forEach(item=>{
        const active=item.dataset.scenarioTheater===scenarioLibraryTheater;
        item.classList.toggle('active',active);
        item.setAttribute('aria-pressed',String(active));
      });
      const list=modal.querySelector('#scenario-library-index');
      if(list)list.scrollTop=0;
      scenarioCatalogRefresh();
    });
  });
  const staticMap=modal.querySelector('#scenario-preview-map');
  if(staticMap)staticMap.addEventListener('error',()=>{
    staticMap.hidden=true;
    const message=modal.querySelector('.scenario-map-unavailable');
    if(message)message.hidden=false;
  });
  if(activeId==='scenario-difficulty')modal.querySelector('#scenario-difficulty')?.focus({preventScroll:true});
  else if(activeFaction)modal.querySelector('.scenario-side-option[data-scenario-faction="'+activeFaction+'"]')?.focus({preventScroll:true});
  else focusDialog();
}
function startScenario(side=scenarioSide, campaignContext=null) {
  const id = scenarioKind, difficulty = scenarioDifficulty;
  return withGameAssets(() => prepareScenarioAssets(id), () => startLoadedScenario(id, side, difficulty, campaignContext));
}
function startLoadedScenario(id, side, difficulty, campaignContext) {
  const model=E.scenarios?.byId?.[id];
  if(!model?.sides.includes(side))return;
  scenarioKind=id; scenarioSide=side; scenarioDifficulty=difficulty;
  resetSession();
  game=model.create(side,scenarioDifficulty,Date.now()>>>0);
  if (scenarioWeeklySelected && !campaignContext && id===weeklyScenarioCurrent().scenarioId) {
    const weekly=weeklyScenarioCurrent();
    game.weeklyScenario={weekId:weekly.id,scenarioId:id};
  }
  if (campaignContext) {
    game.warCampaign = { ...campaignContext };
    // World Campaign also imports persistent Elite levels, but not HQ research.
    E.applyElites(game, loadProfile());
  }
  // Personal HQ commanders are assignable in every regional operation.
  E.applyRoster(game, loadProfile());
  scenarioRoutingGroup=null;
  setWorld();
  // Start loading the pre-rendered troop-free map before the first camera frame.
  if (typeof updateMapFallback === 'function') updateMapFallback();
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

async function prepareScenarioAssets(id) {
  // The menu already requests only the selected static image. Wait for its
  // decode before exposing the battlefield so the first frame has a map.
  const image = typeof preloadRegionalMapImage === 'function' ? preloadRegionalMapImage(id) : null;
  await Promise.all([ensureScenario(id), image?.loaded]);
}

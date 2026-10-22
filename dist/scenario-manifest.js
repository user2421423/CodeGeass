/* Regional scenario manifest: menu order, title and short note for every scenario, and the files that make them up.
   A new scenario adds one line to each list here; everything else about it lives in its own scenarios-*.js file. */
'use strict';
const SCENARIO_MANIFEST = Object.freeze([
  {id:"invasion-japan",title:"The Invasion of Japan",note:"44 cities · 3 sides"},
  {id:"defense-japan",title:"Defense of Japan",note:"44 cities · 2 sides · carrier invasion"},
  {id:"division-japan",title:"The Division of Japan",note:"44 cities · 3 sides"},
  {id:"european-war",title:"The European War",note:"44 cities · 2 sides"},
  {id:"operation-stonehenge",title:"Operation Stonehenge",note:"37 cities · 2 sides"},
  {id:"bering-strait",title:"The Bering Strait Crisis",note:"28 cities · 2 sides"},
  {id:"conquest-indochina",title:"The Conquest of Indochina",note:"44 cities · 2 sides"},
  {id:"bf-south-china",title:"Invasion of South China",note:"2 sides"},
  {id:"philippines-invasion",title:"The Invasion of the Philippines",note:"37 cities · 2 sides"},
  {id:"invasion-korea",title:"Invasion of Korea",note:"55 cities · 2 sides"},
  {id:"war-for-australia",title:"The War for Australia",note:"48 cities · 3 sides"},
  {id:"area-18",title:"Area 18 — Arabian Peninsula",note:"43 cities · 3 sides"},
  {id:"britannia-iraq-iran",title:"Iraq–Iran Campaign",note:"2 sides"},
  {id:"britannia-siberia",title:"Invasion of Siberia",note:"49 cities · 2 sides"},
  {id:"invasion-south-africa",title:"Invasion of South Africa",note:"47 cities · 2 sides"},
  {id:"crossing-urals",title:"Crossing the Urals",note:"40 cities · 2 sides"},
  {id:"invasion-turkey",title:"Invasion of Turkey",note:"59 cities · 2 sides"},
  {id:"britannia-western-russia",title:"Invasion of St. Petersburg and Moscow",note:"41 cities · 2 sides"},
  {id:"invasion-brazil",title:"Invasion of Brazil",note:"2 sides"},
  {id:"invasion-california",title:"Chinese Invasion of California",note:"63 cities · 2 sides"},
  {id:"invasion-canada",title:"Invasion of Canada",note:"2 sides"},
  {id:"invasion-caribbean",title:"Invasion of the Caribbean",note:"41 cities · 2 sides"},
  {id:"eu-great-lakes",title:"Battle for the Great Lakes",note:"2 sides"},
  {id:"bf-yangtze",title:"Battle of the Yangtze River",note:"2 sides"},
  {id:"eu-greenland",title:"Invasion of Greenland",note:"18 cities · 2 sides"},
  {id:"invasion-hawaii",title:"Chinese Invasion of Hawaii",note:"30 bases · 2 sides"},
  {id:"cf-new-zealand",title:"Chinese Federation Invasion of New Zealand",note:"2 sides"},
  {id:"invasion-american-east-coast",title:"Invasion of the American East Coast",note:"2 sides"},
  {id:"eu-panama",title:"Panama Campaign — Atlantic Offensive",note:"30 cities · 2 sides"},
  {id:"bf-malacca",title:"Battle of the Strait of Malacca",note:"54 cities · 2 sides"},
  {id:"eu-pendragon",title:"Battle of Pendragon — E.U. Eastern Offensive",note:"2 sides · Finale"},
  {id:"cf-pendragon",title:"Battle of Pendragon — Chinese Western Offensive",note:"2 sides · Finale"},
  {id:"cf-panama",title:"Chinese Pacific Invasion of Panama",note:"30 cities · 2 sides"},
  {id:"cf-pacific-northwest",title:"Invasion of the Pacific Northwest",note:"2 sides"},
  {id:"cf-central-america",title:"Central American Offensive",note:"2 sides"},
  {id:"cf-mexico",title:"Conquest of the Mexican Heartland",note:"2 sides"},
  {id:"eu-rocky-mountains",title:"Crossing the Rocky Mountains",note:"2 sides"},
  {id:"battle-luoyang",title:"Battle of Luoyang",note:"2 sides · final offensive"},
  {id:"eu-cf-kazakhstan",title:"Invasion of Kazakhstan",note:"65 cities · 2 sides · steppe offensive"},
  {id:"eu-cf-persia",title:"Invasion of Persia",note:"2 sides · Iranian plateau"},
  {id:"eu-cf-xinjiang",title:"Battle for Xinjiang",note:"2 sides · Tianshan passes"},
  {id:"eu-cf-india",title:"Invasion of India",note:"2 sides · Arabian Sea landings"},
  {id:"eu-cf-mongolia",title:"Invasion of Mongolia",note:"51 cities · 2 sides · steppe war"},
  {id:"eu-cf-manchuria",title:"Invasion of Manchuria",note:"49 cities · 2 sides · northeastern China"},
  {id:"eu-cf-himalayas",title:"Crossing the Himalayas",note:"2 sides · mountain passes"},
  {id:"eu-cf-sichuan",title:"Invasion of Sichuan",note:"62 cities · 2 sides · Chengdu Basin"},
  {id:"eu-cf-beijing",title:"Battle of Beijing",note:"2 sides · northern China"},
  {id:"eu-cf-luoyang",title:"Battle of Luoyang — E.U. vs Federation",note:"2 sides · E.U. finale"},
  {id:"cf-eu-siberia",title:"Invasion of Siberia",note:"2 sides · northern Chinese offensive"},
  {id:"cf-eu-caucasus",title:"Invasion of the Caucasus",note:"2 sides · mountain campaign"},
  {id:"cf-eu-turkey",title:"Invasion of Turkey — Federation vs E.U.",note:"2 sides · Anatolian offensive"},
  {id:"cf-eu-volga",title:"Battle for the Volga",note:"2 sides · great river offensive"},
  {id:"cf-eu-suez",title:"Crossing the Suez Canal",note:"2 sides · Egyptian crossing"},
  {id:"cf-eu-moscow",title:"Battle for Moscow",note:"2 sides · Russian heartland"},
  {id:"cf-eu-balkans",title:"Balkan Offensive",note:"57 cities · 2 sides · southeastern Europe"},
  {id:"cf-eu-north-africa",title:"North African Offensive",note:"51 cities · 2 sides · Mediterranean campaign"},
  {id:"cf-eu-central-europe",title:"Conquest of Central Europe — No Germany",note:"2 sides · Poland to Austria"},
  {id:"cf-eu-france",title:"Invasion of France — Mediterranean Offensive",note:"34 cities · 2 sides · southern naval invasion"},
  {id:"rounds-rebellion",title:"Knights of the Round Rebellion",note:"2 sides · Pendragon succession war"},
  {id:"shin-independence",title:"Euro-Britannian Independence",note:"44 cities · 2 sides · Shin vs Empire"},
  {id:"chinese-civil-war",title:"Chinese Civil War — The Imperial Restoration",note:"2 sides · Tianzi vs High Eunuchs"},
  {id:"eu-military-coup",title:"E.U. Military Coup — Smilas vs Leila",note:"44 cities · 2 sides · E.U. civil war"},
  {id:"bk-civil-war",title:"Black Knights Civil War",note:"44 cities · 2 sides · organizational split"},
  {id:"rounds-tournament",title:"Knights of the Round Tournament",note:"70 cities · 6 sides · free-for-all"},
  {id:"geass-war",title:"The Geass War",note:"44 cities · 2 sides · Geass vs conventional"},
  {id:"protagonists-antagonists",title:"Protagonists vs Antagonists",note:"44 cities · 2 sides · multinational armies"},
  {id:"partition-britannia",title:"The Partition of Britannia",note:"3 sides · Britannian continental heartland"},
  {id:"ufn-civil-war",title:"UFN Civil War",note:"2 sides · full mainland China"}
]);
// Scenario modules and their map data, in load order: each file loads after the files it uses.
const SCENARIO_FILES = Object.freeze([
  'scenarios.js',
  'scenarios-defense-japan.js',
  'europe-landmask.js',
  'scenarios-division-japan.js',
  'scenarios-europe.js',
  'scenarios-stonehenge.js',
  'bering-landmask.js',
  'scenarios-bering.js',
  'indochina-landmask.js',
  'scenarios-indochina.js',
  'philippines-landmask.js',
  'scenarios-philippines.js',
  'australia-landmask.js',
  'scenarios-australia.js',
  'area18-landmask.js',
  'scenarios-area18.js',
  'siberia-landmask.js',
  'scenarios-siberia.js',
  'scenarios-south-africa.js',
  'scenarios-urals.js',
  'turkey-landmask.js',
  'scenarios-turkey.js',
  'scenarios-western-russia.js',
  'scenarios-brazil.js',
  'scenarios-california.js',
  'canada-landmask.js',
  'scenarios-canada.js',
  'scenarios-caribbean.js',
  'great-lakes-geography.js',
  'scenarios-great-lakes.js',
  'scenarios-greenland.js',
  'scenarios-hawaii.js',
  'scenarios-new-zealand.js',
  'scenarios-east-coast.js',
  'panama-landmask.js',
  'scenarios-panama.js',
  'scenarios-panama-cf.js',
  'scenarios-pendragon.js',
  'scenarios-pendragon-cf.js',
  'korea-landmask.js',
  'korea-coastlines.js',
  'scenarios-korea.js',
  'scenarios-malacca.js',
  'iraq-iran-coast.js',
  'scenarios-iraq-iran.js',
  'scenarios-south-china.js',
  'scenarios-yangtze.js',
  'scenarios-luoyang.js',
  'scenarios-cf-pacific-northwest.js',
  'scenarios-central-america.js',
  'scenarios-mexico.js',
  'scenarios-rocky-mountains.js',
  'central-america-underlay.js',
  'scenarios-eu-cf-kazakhstan.js',
  'scenarios-eu-cf-persia.js',
  'scenarios-eu-cf-xinjiang.js',
  'eu-cf-india-geography.js',
  'scenarios-eu-cf-india.js',
  'scenarios-eu-cf-mongolia.js',
  'scenarios-eu-cf-manchuria.js',
  'scenarios-eu-cf-himalayas.js',
  'scenarios-eu-cf-sichuan.js',
  'scenarios-eu-cf-beijing.js',
  'scenarios-eu-cf-luoyang.js',
  'scenarios-cf-eu-siberia.js',
  'scenarios-cf-eu-caucasus.js',
  'scenarios-cf-eu-turkey.js',
  'scenarios-cf-eu-volga.js',
  'scenarios-cf-eu-suez.js',
  'scenarios-cf-eu-moscow.js',
  'cf-eu-balkans-coast.js',
  'scenarios-cf-eu-balkans.js',
  'scenarios-cf-eu-north-africa.js',
  'scenarios-cf-eu-central-europe.js',
  'scenarios-cf-eu-france.js',
  'scenarios-alternate-common.js',
  'scenarios-rounds-rebellion.js',
  'scenarios-shin-independence.js',
  'scenarios-chinese-civil-war.js',
  'scenarios-eu-coup.js',
  'scenarios-exclusive-common.js',
  'partition-geography.js',
  'scenarios-bk-civil-war.js',
  'scenarios-rounds-tournament.js',
  'scenarios-geass-war.js',
  'scenarios-protagonists-antagonists.js',
  'scenarios-partition-britannia.js',
  'scenarios-ufn-civil-war.js'
]);
// Script promises are shared across callers; successful modules execute once per tab.
const assetLoads = new Map();
function loadGameScript(src) {
  if (assetLoads.has(src)) return assetLoads.get(src);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      assetLoads.delete(src);
      script.remove();
      reject(new Error('Could not load ' + src + '. Check your connection and retry.'));
    };
    document.head.appendChild(script);
  });
  assetLoads.set(src, promise);
  return promise;
}
let geographyLoad = null;
function ensureGeography() {
  return geographyLoad ||= (async () => {
    await Promise.all(['ui/geography-data.js', 'ui/japan-coastlines.js'].map(loadGameScript));
    await loadGameScript('ui/geography.js?v=20261022-offmap');
    if (typeof GEOGRAPHY === 'undefined') throw new Error('Map geography did not initialize.');
  })().catch(error => { geographyLoad = null; throw error; });
}
const scenarioLoads = new Map();
function ensureScenario(id) {
  const entry = SCENARIO_CATALOG[id];
  if (!entry) return Promise.reject(new Error('Unknown regional operation: ' + id));
  if (scenarioLoads.has(id)) return scenarioLoads.get(id);
  const promise = (async () => {
    await ensureGeography();
    for (const src of entry.files) await loadGameScript(src);
    // Original Japan registers its alias only when Division loads. Do not load
    // the Division battle just to install that alias.
    if (id === 'invasion-japan' && Knightmare.scenarios?.japan)
      (Knightmare.scenarios.byId ||= {})[id] = Knightmare.scenarios.japan;
    const model = Knightmare.scenarios?.byId?.[id];
    if (!model?.create) throw new Error('Operation did not initialize: ' + id);
    return model;
  })().catch(error => { scenarioLoads.delete(id); throw error; });
  scenarioLoads.set(id, promise);
  return promise;
}
// Explicit bulk export hook for offline preview generators, never called by gameplay.
let scenariosReady = false, scenarioLoad = null;
function loadScenarios() {
  return scenarioLoad ||= Promise.all(SCENARIO_MANIFEST.map(e => ensureScenario(e.id)))
    .then(() => { scenariosReady = true; })
    .catch(error => { scenarioLoad = null; throw error; });
}

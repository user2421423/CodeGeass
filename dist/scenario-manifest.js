/* Regional scenario manifest: menu order, title and short note for every scenario, and the files that make them up.
   A new scenario adds one line to each list here; everything else about it lives in its own scenarios-*.js file. */
'use strict';
const SCENARIO_MANIFEST = Object.freeze([
  {id:"invasion-japan",title:"The Invasion of Japan",note:"44 cities · 3 sides"},
  {id:"division-japan",title:"The Division of Japan",note:"44 cities · 3 sides"},
  {id:"european-war",title:"The European War",note:"44 cities · 2 sides"},
  {id:"operation-stonehenge",title:"Operation Stonehenge",note:"37 cities · 2 sides"},
  {id:"bering-strait",title:"The Bering Strait Crisis",note:"28 cities · 2 sides"},
  {id:"conquest-indochina",title:"The Conquest of Indochina",note:"44 cities · 2 sides"},
  {id:"bf-south-china",title:"Invasion of South China",note:"65 cities · 2 sides"},
  {id:"philippines-invasion",title:"The Invasion of the Philippines",note:"37 cities · 2 sides"},
  {id:"invasion-korea",title:"Invasion of Korea",note:"55 cities · 2 sides"},
  {id:"war-for-australia",title:"The War for Australia",note:"48 cities · 3 sides"},
  {id:"area-18",title:"Area 18 — Arabian Peninsula",note:"43 cities · 3 sides"},
  {id:"britannia-iraq-iran",title:"Iraq–Iran Campaign",note:"84 cities · 2 sides"},
  {id:"britannia-siberia",title:"Invasion of Siberia",note:"49 cities · 2 sides"},
  {id:"invasion-south-africa",title:"Invasion of South Africa",note:"47 cities · 2 sides"},
  {id:"crossing-urals",title:"Crossing the Urals",note:"40 cities · 2 sides"},
  {id:"invasion-turkey",title:"Invasion of Turkey",note:"59 cities · 2 sides"},
  {id:"britannia-western-russia",title:"Invasion of St. Petersburg and Moscow",note:"41 cities · 2 sides"},
  {id:"invasion-brazil",title:"Invasion of Brazil",note:"57 cities · 2 sides"},
  {id:"invasion-california",title:"Chinese Invasion of California",note:"63 cities · 2 sides"},
  {id:"invasion-canada",title:"Invasion of Canada",note:"74 cities · 2 sides"},
  {id:"invasion-caribbean",title:"Invasion of the Caribbean",note:"41 cities · 2 sides"},
  {id:"eu-great-lakes",title:"Battle for the Great Lakes",note:"56 cities · 2 sides"},
  {id:"bf-yangtze",title:"Battle of the Yangtze River",note:"60 cities · 2 sides"},
  {id:"eu-greenland",title:"Invasion of Greenland",note:"18 cities · 2 sides"},
  {id:"invasion-hawaii",title:"Chinese Invasion of Hawaii",note:"30 bases · 2 sides"},
  {id:"cf-new-zealand",title:"Chinese Federation Invasion of New Zealand",note:"63 cities · 2 sides"},
  {id:"invasion-american-east-coast",title:"Invasion of the American East Coast",note:"62 cities · 2 sides"},
  {id:"eu-panama",title:"Panama Campaign — Atlantic Offensive",note:"30 cities · 2 sides"},
  {id:"bf-malacca",title:"Battle of the Strait of Malacca",note:"54 cities · 2 sides"},
  {id:"eu-pendragon",title:"Battle of Pendragon — E.U. Eastern Offensive",note:"2 sides · Finale"},
  {id:"cf-pendragon",title:"Battle of Pendragon — Chinese Western Offensive",note:"2 sides · Finale"},
  {id:"cf-panama",title:"Chinese Pacific Invasion of Panama",note:"30 cities · 2 sides"},
  {id:"cf-pacific-northwest",title:"Invasion of the Pacific Northwest",note:"63 cities · 2 sides"},
  {id:"cf-central-america",title:"Central American Offensive",note:"81 cities · 2 sides"},
  {id:"cf-mexico",title:"Conquest of the Mexican Heartland",note:"80 cities · 2 sides"},
  {id:"eu-rocky-mountains",title:"Crossing the Rocky Mountains",note:"101 cities · 2 sides"},
  {id:"battle-luoyang",title:"Battle of Luoyang",note:"83 cities · 2 sides · final offensive"}
]);
// Scenario modules and their map data, in load order: each file loads after the files it uses.
const SCENARIO_FILES = Object.freeze([
  'scenarios.js',
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
  'central-america-underlay.js'
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
    await loadGameScript('ui/geography.js');
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

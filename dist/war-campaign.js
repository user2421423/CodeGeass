/* Strategic World Campaign registry. Independent from dist/campaign.js Story Mode.
   IDs and tiers are stable; scenarioId:null means documentation only, NEVER a playable battle. */
(function (root, factory) {
  const api = factory();
  root.KnightmareWarCampaign = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STORAGE_KEY = 'knightmare-war-campaign-v1';
  const BATTLE_KEY = 'knightmare-war-campaign-battle';
  const FACTIONS = ['eu', 'britannia'];
  const tierLabels = {
    eu: ['Global Conflicts','Bering Strait','Overseas Invasions','Continental Landings','Conquest of the Britannian Homeland','Final Offensive'],
    britannia: ['Global Conflicts','Bering Strait','Imperial Expansion','The Eurasian Offensive','Conquest of Western Russia','The European War','Operation Stonehenge'],
  };
  // [id, title, existing scenario ID/null, geographic name, marker lon/lat,
  //  geographic bounds west/south/east/north, short campaign description].
  const shared = [
    ['australia','War for Australia','war-for-australia','Australia',[134,-25],[113,-44,154,-10],'Secure the Australian continent against rival great powers.'],
    ['area-18','Conquest of Area 18','area-18','Arabia, Levant and Persia',[47,30],[34,15,64,39],'Win the struggle for the Middle Eastern strategic corridor.'],
    ['division-japan','Division of Japan','division-japan','Japan',[139,37],[129,30,146,46],'Defeat rival armies in the divided Japanese home islands.'],
  ];
  const bering = ['bering','Bering Strait Crisis','bering-strait','Bering Strait',[177,63],[160,55,180,72],'Control the crossing between Siberia and Alaska.'];
  const euRows = [
    [3,[
      ['hawaii','Invasion of Hawaii',null,'Hawaii',[-156,21],[-161,18,-154,24],'Launch an oceanic assault against Britannian Pacific bases.'],
      ['brazil','Invasion of Brazil',null,'Brazil',[-51,-13],[-74,-34,-34,6],'Establish a South American foothold in Britannian territory.'],
      ['greenland','Invasion of Greenland','eu-greenland','Greenland',[-42,72],[-73,58,-12,84],'Capture the North Atlantic approaches.'],
      ['caribbean','Invasion of the Caribbean',null,'Caribbean',[-69,19],[-84,10,-60,25],'Take the island chains controlling approaches to America.'],
    ]],
    [4,[
      ['panama','Panama Campaign',null,'Panama',[-80,9],[-84,7,-77,11],'Secure the isthmus and its strategic sea routes.'],
      ['new-york','Invasion of New York',null,'New York',[-74,41],[-80,38,-70,45],'Assault the Britannian Atlantic metropolitan corridor.'],
      ['canada','Invasion of Canada',null,'Canada',[-105,57],[-140,48,-60,70],'Open a broad northern continental offensive.'],
    ]],
    [5,[
      ['great-lakes','Battle for the Great Lakes',null,'Great Lakes',[-86,44],[-94,41,-78,50],'Fight for the inland industrial centers and lake crossings.'],
      ['california','Invasion of California',null,'California',[-120,37],[-125,32,-114,42],'Establish control of the Britannian Pacific heartland.'],
    ]],
    [6,[['pendragon','Battle of Pendragon',null,'Pendragon',[-117,37.5],[-119,35.5,-115,39.5],'Conclude the war with an assault on the imperial capital.']]],
  ];
  const brRows = [
    [3,[
      ['siberia','Invasion of Siberia','britannia-siberia','Siberia',[116,60],[55,47,180,79],'Advance into the E.U.-held Siberian interior.'],
      ['south-africa','Invasion of South Africa','invasion-south-africa','South Africa',[25,-29],[16,-35,33,-22],'Capture the southern African strategic base network.'],
    ]],
    [4,[
      ['urals','Crossing the Urals','crossing-urals','The Urals',[62,58],[51,49,75,67],'Break the mountain frontier into European Russia.'],
      ['turkey','Invasion of Turkey','invasion-turkey','Anatolia',[35,39],[26,35,45,43],'Push through Anatolia toward the European front.'],
    ]],
    [5,[['western-russia','Invasion of St. Petersburg and Moscow','britannia-western-russia','Western Russia',[37,57],[27,51.5,52,63.25],'Capture the twin centers of Russian resistance and establish Euro Britannia.']]],
    [6,[['european-war','European War','european-war','Central Europe',[14,50],[-2,44,31,56],'Take command of Euro Britannia in its existing regional war against the E.U.']]],
    [7,[['stonehenge','Operation Stonehenge','operation-stonehenge','Western Europe',[-2,49],[-11,36,10,59],'Lead the final Britannian carrier invasion of western Europe.']]],
  ];
  // Approximate national/state contours where a rectangular theater would
  // otherwise tint substantial unrelated territory. The GSHHG atlas continues
  // to supply the authoritative coastlines and underlying land geometry.
  const REGION_POLYGONS=Object.freeze({
    'britannia-western-russia': [[27.1,57.6],[28,58.3],[28,59.5],[29.2,60.1],
      [30,60.6],[31.8,61.5],[33.0,63.25],[52,63.25],[52,51.5],
      [35.5,51.5],[32,53.1],[30.6,55.2],[27.1,57.6]],
    'eu-brazil': [[-73,-8],[-69,-10],[-66,-12],[-62,-16],[-58,-21],
      [-57,-26],[-53,-33],[-48,-30],[-45,-25],[-40,-22],[-35,-9],
      [-35,-5],[-44,-2],[-50,1],[-52,4],[-61,5],[-66,2],[-69,-1]],
    'eu-california': [[-124.5,42],[-120,42],[-120,39],[-114.6,35],
      [-114.6,32.7],[-117.1,32.5],[-121,34],[-124.5,40]],
    'britannia-south-africa': [[16.3,-28.6],[16.8,-33.7],[18,-34.9],[20,-35.3],
      [29.9,-34.8],[32.9,-27.5],[31.1,-25.9],[31.2,-22.5],
      [25,-22.1],[20,-22.4],[20,-26.6]],
    'britannia-turkey': [[26,40],[28,42],[35,42.2],[41.8,41.8],
      [44.8,38.5],[43,36],[36,36],[31,36.3],[27,37.2]],
  });
  function inPolygon(points,lon,lat){
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j];
      if(((a[1]>lat)!==(b[1]>lat)) &&
        lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])
        inside=!inside;
    }
    return inside;
  }
  function objective(faction,tier,row) {
    const [suffix,title,scenarioId,region,marker,bounds,description] = row;
    // The Bering battle pushes into opposite shorelines: E.U. into Alaska,
    // Britannia into Chukotka, so a win visibly changes political ownership.
    const targetMarker=suffix==='bering' && faction==='eu' ? [-165,64] : marker;
    const targetBounds=suffix==='bering' && faction==='eu' ? [-174,55,-143,70] : bounds;
    return Object.freeze({
      id: faction + '-' + suffix, title, campaignFaction:faction, tier,
      region, marker:targetMarker, bounds:targetBounds, description,
      polygon:REGION_POLYGONS[faction+'-'+suffix]||null,
      status: scenarioId ? 'implemented' : 'planned',
      scenarioId,
      // Euro Britannia is the scenario's actual playable faction, but does not
      // replace the overarching Britannian campaign identity.
      battleSide: faction === 'britannia' && suffix === 'european-war' ? 'eb' : faction,
      final: tier === tierLabels[faction].length,
    });
  }
  const registry = Object.freeze(Object.fromEntries(FACTIONS.map(faction=>{
    const rows = [
      [1,shared],
      [2,[bering]],
      ...(faction==='eu'?euRows:brRows),
    ];
    return [faction,Object.freeze(rows.map(([tier,items])=>Object.freeze({
      number:tier,title:tierLabels[faction][tier-1],
      missions:Object.freeze(items.map(row=>objective(faction,tier,row))),
    })))];
  })));
  const ALL = Object.freeze(Object.fromEntries(FACTIONS.flatMap(f=>registry[f].flatMap(t=>t.missions.map(m=>[m.id,m])))));
  const PLACEHOLDERS = Object.freeze(Object.values(ALL).filter(m=>m.status==='planned'));
  function fresh(){return {version:1,selectedFaction:'eu',completed:{eu:{},britannia:{}}};}
  function load(storage) {
    let raw;
    try { raw=JSON.parse(storage.getItem(STORAGE_KEY)); } catch(_e){return fresh();}
    const p=fresh();
    if (!raw || raw.version!==1) return p;
    if (FACTIONS.includes(raw.selectedFaction)) p.selectedFaction=raw.selectedFaction;
    for(const f of FACTIONS)
      for(const m of registry[f].flatMap(t=>t.missions))
        if(m.status==='implemented' && raw.completed && raw.completed[f] && raw.completed[f][m.id]===true)
          p.completed[f][m.id]=true;
    return p;
  }
  function persist(storage,progress){
    try { storage.setItem(STORAGE_KEY,JSON.stringify(progress)); return true; }
    catch(_e){ return false; }
  }
  function completed(progress,faction,id){return !!(progress.completed && progress.completed[faction] && progress.completed[faction][id]);}
  function unlockedTier(progress,faction){
    if(!registry[faction]) return 0;
    for(const tier of registry[faction])
      if(!tier.missions.every(m=>completed(progress,faction,m.id)))return tier.number;
    return registry[faction].length + 1;
  }
  function state(progress,faction,id){
    const m=ALL[id];
    if(!m || m.campaignFaction!==faction) return 'invalid';
    if(completed(progress,faction,id))return 'completed';
    if(m.tier>unlockedTier(progress,faction))return 'locked';
    return m.status==='planned'?'planned':'available';
  }
  function launch(progress,faction,id,scenarioModels,options=null) {
    const m=ALL[id];
    if(!m || m.campaignFaction!==faction)return {ok:false,reason:'Unknown campaign objective.'};
    // The South Africa development branch offers one deliberate, scenario-only
    // playtest bypass. It neither fabricates prerequisite victories nor unlocks
    // any other Campaign objective.
    const playtest=options?.previewSouthAfrica===true &&
      faction==='britannia' && id==='britannia-south-africa';
    if(state(progress,faction,id)==='locked'&&!playtest)
      return {ok:false,reason:'Complete all required wars in earlier tiers first.'};
    if(!m.scenarioId)return {ok:false,reason:'Planned — Scenario Not Yet Implemented'};
    const model=scenarioModels && scenarioModels[m.scenarioId];
    if(!model || !model.sides || !model.sides.includes(m.battleSide) || typeof model.create!=='function')
      return {ok:false,reason:'Playable scenario is not registered for this faction.'};
    return {ok:true,scenarioId:m.scenarioId,battleSide:m.battleSide,
      context:{faction,missionId:m.id,scenarioId:m.scenarioId,
        battleSide:m.battleSide,...(playtest?{preview:true}:{})}};
  }
  function recordVictory(storage,game){
    const ctx=game && game.warCampaign, m=ctx && ALL[ctx.missionId];
    // Completing a bypassed playtest is not an official Campaign victory:
    // do not turn test results into territory, tiers, or campaign save data.
    if(ctx?.preview)return {ok:false,
      reason:'South Africa playtest complete. Campaign progress is unchanged.'};
    if(!m || m.status!=='implemented' || m.campaignFaction!==ctx.faction ||
       m.scenarioId!==ctx.scenarioId || m.battleSide!==ctx.battleSide ||
       game.mode!=='scenario' || game.scenario?.id!==m.scenarioId ||
       game.player!==m.battleSide || !game.over ||
       game.over.winner!==game.player)
      return {ok:false,reason:'No confirmed Campaign battle victory.'};
    const progress=load(storage);
    if(completed(progress,ctx.faction,m.id))return {ok:true,already:true,progress};
    if(m.tier>unlockedTier(progress,ctx.faction))
      return {ok:false,reason:'The campaign objective is still locked.'};
    const before=unlockedTier(progress,ctx.faction);
    progress.completed[ctx.faction][m.id]=true;
    if(!persist(storage,progress))return {ok:false,reason:'Campaign progress could not be saved.'};
    const after=unlockedTier(progress,ctx.faction);
    return {ok:true,already:false,progress,objective:m,
      unlocked:after>before && after<=registry[ctx.faction].length ? after : null,
      complete:after>registry[ctx.faction].length};
  }
  function chooseFaction(storage,faction){
    if(!FACTIONS.includes(faction))return false;
    const p=load(storage);
    p.selectedFaction=faction;
    return persist(storage,p);
  }
  function regionContains(m,lon,lat){
    const [west,south,east,north]=m.bounds;
    if(lat<south || lat>north || lon<west || lon>east)return false;
    // Japan is a slanted chain: exclude the Korean mainland on the western edge.
    if(m.polygon && !inPolygon(m.polygon,lon,lat)) return false;
    // The Caribbean objective concerns islands, not Venezuela and Colombia.
    if(m.id==='eu-caribbean' && lat<16) return false;
    if(m.id.endsWith('division-japan')) return lon>=129+(lat-30)*.48;
    // Pendragon's imperial capital remains an enemy enclave until the final.
    if(m.id==='eu-california' && Math.abs(lon+117)<2 && Math.abs(lat-37.5)<2) return false;
    return true;
  }
  function worldSnapshot(engine,faction,progress){
    const world=engine.createGame('britannia','normal','conquest',246801,'world');
    world.units=[];world.stations=[];world.sites=[];
    const wins=registry[faction].flatMap(t=>t.missions).filter(m=>completed(progress,faction,m.id));
    for(const t of world.tiles){
      if(t.terrain==='sea' || t.terrain==='offmap')continue;
      const lon=-180+(t.c+0.5*(t.r&1))*engine.WORLD.dlon,
            lat=engine.WORLD.lat0-t.r*engine.WORLD.dlat;
      for(const m of wins)if(regionContains(m,lon,lat))t.owner=faction;
    }
    world.mapRevision=(world.mapRevision||0)+1;
    return world;
  }
  const api={STORAGE_KEY,BATTLE_KEY,FACTIONS,registry,ALL,PLACEHOLDERS,
    fresh,load,persist,completed,unlockedTier,state,launch,recordVictory,chooseFaction,
    regionContains,worldSnapshot};
  // Fixture only exists in Node test runs; it is intentionally not reachable
  // through the browser UI or exposed as a browser development cheat.
  if(typeof module!=='undefined' && module.exports)
    api.testFixture=(f,tier)=>{const p=fresh();for(const row of registry[f]||[])
      if(row.number< tier) for(const m of row.missions)p.completed[f][m.id]=true;return p;};
  return Object.freeze(api);
});

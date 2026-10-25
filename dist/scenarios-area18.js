/* The Conquest of Area 18 — a three-way Arabian Peninsula campaign.
   Britannia defends the southern Peninsula; Europia United holds Hejaz and
   the central plateau; the Chinese Federation controls the Gulf and eastern Oman.
   True WGS84 cities, independently sampled gameplay coastline, GSHHG map
   underlay, capturable ports and four standard difficulties. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=120,ROWS=88,SIDES=['britannia','eu','cf'];
  const BOUNDS={"west":34,"east":61.5,"north":31.5,"south":11.3};
  const K=Math.cos(21.4*Math.PI/180);
  const PROJECTION={centerLon:47.75,centerLat:21.4,angle:0,uMin:-13.75*K,uMax:13.75*K,vMin:-10.1,vMax:10.1};
  // Named positions are geographic anchors; ownership is alternate history.
  const CITIES=[["Riyadh",46.68,24.71,"eu",3,true],["Jeddah",39.17,21.54,"eu",3,true],["Mecca",39.83,21.42,"eu",2,false],["Medina",39.61,24.47,"eu",3,true],["Yanbu",38.06,24.09,"eu",2,true],["Tabuk",36.57,28.38,"eu",3,true],["Duba",35.72,27.34,"eu",2,false],["Al Wajh",36.45,26.25,"eu",2,false],["AlUla",37.92,26.61,"eu",2,false],["Hail",41.69,27.52,"eu",3,true],["Buraydah",43.97,26.36,"eu",3,true],["Taif",40.42,21.27,"eu",2,false],["Al Kharj",47.33,24.16,"eu",2,true],["Dawadmi",44.39,24.51,"eu",2,false],["Sana'a",44.21,15.37,"britannia",3,true],["Aden",45.03,12.79,"britannia",3,true],["Taiz",44.01,13.58,"britannia",2,false],["Hodeidah",42.95,14.8,"britannia",2,true],["Mukalla",49.12,14.55,"britannia",3,true],["Sayun",48.78,15.94,"britannia",2,false],["Marib",45.32,15.46,"britannia",2,false],["Najran",44.13,17.49,"britannia",3,true],["Jizan",42.57,16.89,"britannia",2,true],["Abha",42.51,18.22,"britannia",2,true],["Bisha",42.61,19.99,"britannia",2,false],["Sharurah",47.12,17.46,"britannia",2,false],["Salalah",54.09,17.02,"britannia",3,true],["Duqm",57.7,19.7,"britannia",2,true],["Kuwait City",47.98,29.38,"cf",3,true],["Hafr al Batin",45.97,28.43,"cf",2,false],["Khafji",48.49,28.44,"cf",2,true],["Dammam",50.1,26.43,"cf",3,true],["Jubail",49.66,27,"cf",2,true],["Hofuf",49.59,25.38,"cf",2,false],["Doha",51.53,25.29,"cf",3,true],["Abu Dhabi",54.37,24.45,"cf",3,true],["Dubai",55.27,25.2,"cf",3,true],["Al Ain",55.76,24.21,"cf",2,false],["Fujairah",56.33,25.13,"cf",2,true],["Muscat",58.41,23.59,"cf",3,true],["Sohar",56.73,24.35,"cf",2,true],["Sur",59.52,22.57,"cf",2,true],["Nizwa",57.53,22.93,"cf",2,false]];
  const ARMY_GROUPS=[["britannia","Sana'a","heavy",4,"cornelia"],["britannia","Sana'a","rocket",3,"guilford"],["britannia","Aden","assault",3,"darlton"],["britannia","Aden","medium",3,"jeremiah"],["britannia","Najran","heavy",4,"suzaku"],["britannia","Najran","assault",3,"villetta"],["britannia","Abha","medium",3,"gino"],["britannia","Jizan","raider",2,null],["britannia","Bisha","medium",2,null],["britannia","Sharurah","heavy",3,"bismarck"],["britannia","Sharurah","rocket",2,null],["britannia","Mukalla","assault",3,"anya"],["britannia","Mukalla","rocket",2,null],["britannia","Salalah","heavy",3,"nonette"],["britannia","Salalah","assault",3,null],["britannia","Duqm","medium",3,null],["britannia","Hodeidah","medium",3,null],["britannia","Marib","siege",2,null],["eu","Riyadh","heavy",4,"akito"],["eu","Riyadh","rocket",3,"yukiya"],["eu","Al Kharj","assault",3,"ryo"],["eu","Buraydah","heavy",4,"oscar"],["eu","Buraydah","rocket",3,"leila"],["eu","Hail","heavy",3,"smilas"],["eu","Hail","assault",3,"ayano"],["eu","Tabuk","medium",3,"klaus"],["eu","Tabuk","rocket",3,"anna"],["eu","Medina","heavy",3,"fernando"],["eu","Medina","assault",3,null],["eu","Jeddah","medium",3,"marirrosa"],["eu","Jeddah","support",2,null],["eu","Yanbu","raider",2,null],["eu","Dawadmi","medium",3,null],["eu","Taif","medium",2,null],["eu","AlUla","raider",2,null],["cf","Dammam","heavy",4,"xingke"],["cf","Dammam","rocket",3,"xianglin"],["cf","Hofuf","heavy",4,"honggu"],["cf","Hofuf","assault",3,"cao"],["cf","Kuwait City","heavy",3,"gaohai"],["cf","Kuwait City","rocket",3,"zhaohao"],["cf","Hafr al Batin","medium",3,null],["cf","Khafji","assault",3,null],["cf","Doha","heavy",3,"leifeng"],["cf","Doha","rocket",3,"meiling"],["cf","Abu Dhabi","heavy",3,"lifeng"],["cf","Dubai","medium",3,null],["cf","Al Ain","raider",2,null],["cf","Muscat","heavy",3,"rakshata"],["cf","Muscat","rocket",3,null],["cf","Sohar","assault",3,null],["cf","Nizwa","medium",3,null],["cf","Fujairah","medium",2,null]];
  const PORTS={"Jeddah":3,"Yanbu":2,"Duba":2,"Al Wajh":2,"Jizan":2,"Hodeidah":2,"Aden":3,"Mukalla":3,"Salalah":3,"Duqm":2,"Kuwait City":2,"Khafji":2,"Dammam":3,"Jubail":2,"Doha":3,"Abu Dhabi":2,"Dubai":3,"Fujairah":2,"Muscat":3,"Sohar":2,"Sur":2};
  const FLEETS=[["britannia","Aden","carrier_battleship",2],["britannia","Mukalla","carrier_battleship",2],["britannia","Salalah","portman_ii",2],["britannia","Hodeidah","portman_ii",2],["britannia","Duqm","portman",2],["eu","Jeddah","eu_carrier",2],["eu","Yanbu","panzer_frosch_ii",2],["eu","Duba","eu_carrier",1],["eu","Al Wajh","panzer_frosch",2],["cf","Dammam","cf_carrier",2],["cf","Doha","cf_carrier",1],["cf","Muscat","cf_carrier",2],["cf","Dubai","shui_gun_ru_ii",2],["cf","Fujairah","shui_gun_ru_ii",2]];
  const FUNDING={britannia:{credits:700,industry:410,science:70,sakuradite:40},
    eu:{credits:700,industry:410,science:70,sakuradite:40},
    cf:{credits:700,industry:410,science:70,sakuradite:40}};
  function geo(c,r){
    return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
      lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};
  }
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function nearest(g,p,valid,radius=9){return E.nearestTile(g,p,valid,radius);}
  // Hejaz, Asir, Dhofar and Hajar ranges; mountain passes prevent deadlock.
  const MOUNTAINS=[[37.5,27.2,1.0,2.2],[39.5,23.6,1.15,4.2],
    [42.8,18.3,1.0,3.0],[44.2,16.1,1.4,1.6],
    [54.0,17.2,1.9,1.1],[57.5,23.5,1.3,2.6],[59.2,22.8,0.75,1.7]];
  const FORESTS=[[42.8,18.2,0.8,2.1],[44.1,15.5,1.3,0.9],
    [54.1,17.2,1.2,0.6],[58.5,23.7,0.9,1.1]];
  const PASSES=[[39.4,24.4,0.7,0.8],[42.6,20.3,0.65,0.7],
    [43.0,18.9,0.7,0.8],[57.0,23.5,1.0,1.0],[54.1,17.5,0.9,0.7]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p){
    const mountain=density(p,MOUNTAINS),pass=density(p,PASSES),forest=density(p,FORESTS);
    if(mountain>.87&&pass<.38)return 'peak';
    if(mountain>.36&&pass<.7)return 'mountain';
    if(forest>.57)return 'forest';
    // Central and eastern Peninsula: broad deserts, oases and the Empty Quarter.
    const gulfOasis=p.lat>23&&p.lat<29.6&&p.lon>47&&p.lon<52;
    const hejazOasis=p.lon<41&&p.lat>20&&p.lat<26.5;
    if(gulfOasis||hejazOasis||p.lat<17.4&&p.lon<50)return 'plains';
    if(p.lat>17&&p.lat<25&&p.lon>43.5&&p.lon<57.3)return 'desert';
    if(p.lat>24&&p.lon>40&&p.lon<50)return 'desert';
    return 'plains';
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
  function create(player='eu',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported Area 18 faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'area-18',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,eu:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'area-18',key:'area18',title:'The Conquest of Area 18 — Arabian Peninsula',version:5,
      phase:'three-way-war',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION};
    // Britannia uses compatible Britannian Elite Forces for this
    // scenario only. No global HQ, Conquest, or Japan access is changed.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu')),
      cf:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('cf')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    // Restore the original sea-only non-playable area: no 'offmap' tiles.
    // Use the geographical reference below ONLY to distinguish genuine
    // shorelines from the artificially trimmed scenario land boundary.
    // Bahrain, Farasan, Socotra and Masirah remain playable islands.
    const packed=root.AREA18_LAND_BITS || (typeof require==='function'?
      require('./area18-landmask.js'):null);
    const bits=typeof packed==='string'?packed:root.AREA18_LAND_BITS;
    if(!bits)throw Error('Area 18 shoreline mask was not loaded');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    // Retain the excluded mainland/island mask as a NON-RENDERED geographic
    // reference. The tiles themselves go back to ordinary sea as requested.
    // Without this reference, the northern border and the Saudi land frontier
    // become artificial coastal hexes just because surrounding land is omitted.
    const outsideBits=root.AREA18_OUTSIDE_BITS;
    if(!outsideBits)throw Error('Area 18 geographic reference was not loaded');
    const outsideRaw=typeof atob==='function'?atob(outsideBits):
      Buffer.from(outsideBits,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/8||outsideRaw.length!==COLS*ROWS/8)
      throw Error('Area 18 geographic masks are corrupt');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),bit=128>>(i&7),byte=i>>3;
      const land=!!(raw.charCodeAt(byte)&bit);
      if(land&&(outsideRaw.charCodeAt(byte)&bit))
        throw Error('Area 18 overlapping geographic masks');
      return {c,r,owner:null,terrain:land?landscape(p):'sea'};
    });
    const playableLand=t=>t&&t.terrain!=='sea';
    // The visible map has only playable land or open sea. The excluded-area
    // mask is a reference ONLY: omitted foreign land must not create phantom
    // coast along the cropped northern border.
    const actualWater=t=>t&&t.terrain==='sea'&&
      !(outsideRaw.charCodeAt((t.r*COLS+t.c)>>3)&
        (128>>((t.r*COLS+t.c)&7)));
    const shoreIds=root.AREA18_SHORE_HEX_IDS;
    if(!Array.isArray(shoreIds)||!shoreIds.length)
      throw Error('Area 18 accurate coastline classification was not loaded');
    const shoreHexes=new Set(shoreIds);
    // Centre-sampling can otherwise label inland hexes as 'coast' simply
    // because the *next* hex is water. Here the actual shoreline must cross
    // this hex's footprint; four port-city exceptions are in the shore list.
    for(const t of g.tiles)if(playableLand(t)&&
      shoreHexes.has(t.r*COLS+t.c)&&E.adjacent(g,t).some(actualWater))
      t.terrain='coast';
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>playableLand(t)&&
        (!coastal||(t.terrain==='coast'&&E.adjacent(g,t).some(actualWater)))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Area 18 city '+name);
      const capital=name==='Sana\'a'||name==='Riyadh'||name==='Dammam';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
        industry:Math.round((capital?25:6*tier)*.55),
        science:Math.round((1+tier)*.55),producedTurn:0});
      if(at.terrain!=='coast')at.terrain='plains';
    }
    // Islands receive provinces from the nearest city on their own landmass.
    const components=new Int16Array(g.tiles.length).fill(-1);
    let id=0;
    for(let i=0;i<g.tiles.length;i++){
      if(!playableLand(g.tiles[i])||components[i]>=0)continue;
      const q=[g.tiles[i]];components[i]=id;
      for(let k=0;k<q.length;k++)for(const n of E.adjacent(g,q[k])){
        const j=n.r*COLS+n.c;
        if(!playableLand(n)||components[j]>=0)continue;
        components[j]=id;q.push(n);
      }
      id++;
    }
    const byComponent=new Map();
    for(const s of g.stations){
      const k=components[s.r*COLS+s.c];
      if(!byComponent.has(k))byComponent.set(k,[]);
      byComponent.get(k).push(s);
    }
    for(const t of g.tiles)if(playableLand(t)){
      const eligible=byComponent.get(components[t.r*COLS+t.c])||g.stations;
      let city=null,d=Infinity;
      for(const s of eligible){
        const next=E.distance(t,s,g);
        if(next<d){d=next;city=s;}
      }
      t.owner=city.owner;t.provinceCity=city.id;
    }
    const groupByCity=new Map();
    function group(side,name){
      const k=side+':'+name;
      if(!groupByCity.has(k)){
        const gr={id:'army-'+groupByCity.size,side,name:name+' Command',
          origin:name,units:[]};
        groupByCity.set(k,gr);g.scenario.groups.push(gr);
      }
      return groupByCity.get(k);
    }
    for(const [side,name,cls,count,commander] of ARMY_GROUPS){
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side)throw Error('Invalid staging city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>playableLand(t)&&!E.TERRAIN[t.terrain]?.blocked&&!E.unitAt(g,t)&&
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),10);
        if(!at)throw Error('Cannot deploy unit at '+name);
        const cmd=i===0?commander:null;
        const stack=i===0?3:2;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,name).units.push(u.id);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    const taken=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const at=E.adjacent(g,s).filter(t=>actualWater(t)&&!taken.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(actualWater).length-
          E.adjacent(g,a).filter(actualWater).length)[0];
      if(!at)throw Error('Cannot place naval port '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      taken.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!E.TYPES[type]?.naval)throw Error('Invalid Area 18 fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>actualWater(t)&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),10);
        if(!at)throw Error('Cannot deploy navy at '+name);
        fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
      }
      g.scenario.groups.push(fleet);
    }
    // The entire connected regional sea stays navigable for fleets.
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]={"britannia":{"credits":1400,"industry":500,"science":140,"sakuradite":80},"eu":{"credits":1400,"industry":500,"science":140,"sakuradite":80},"cf":{"credits":1400,"industry":500,"science":140,"sakuradite":80}}[side][resource];
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>v!==player))
        for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
          E.addDifficultyFrames(u,difficulty);
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Britannia controls Yemen and the southern coast, Europia United holds western and central Arabia, and the Chinese Federation holds the Gulf and eastern Peninsula. All three powers are at war.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Arabian Peninsula cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='area-18'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Arabian Peninsula.'};
    return null;
  }
  const api={id:'area-18',title:'The Conquest of Area 18 — Arabian Peninsula',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,coastBuffer:1},
    elite:true,
    ai:{doctrine:'europe'},saveVersion:5,
    text:{
      era:"Arabian Peninsula · Alternate 2017",
      intro:"A three-way war for the Arabian Peninsula: Britannia dominates the south, Europia United the west and center, and the Chinese Federation the Gulf coast and east. Capture all 43 cities.",
      diplomacy:"Britannia, Europia United and the Chinese Federation are all hostile from turn 1. No betrayals, nuclear weapons or campaign deadline.",
      elite:"Elite Area 18: each power begins with eligible Lv.1 Elite Forces. Rival named commanders start at Lv.3; carriers remain conventional. Research and Elite Force production follow existing scenario rules.",
      focus:{
        britannia:"Sana'a",
        eu:"Riyadh",
        cf:"Dammam"
      }
    },
    blurbs:{
      britannia:"Defend Yemen, Najran and southern Oman. Push north from the Asir and Empty Quarter while your Gulf of Aden and Red Sea fleets threaten both rivals.",
      eu:"Command the Hejaz, Riyadh and the central plateau. Protect Red Sea ports, contest the Saudi interior and drive against the Federation Gulf cities.",
      cf:"Hold Kuwait, the eastern Arabian coast, Qatar, the Emirates and northern Oman. Control the Persian Gulf and Strait of Hormuz and advance toward Riyadh."
    }};
  E.scenarios={...(E.scenarios||{}),area18:api,
    byId:{...(E.scenarios?.byId||{}),'area-18':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

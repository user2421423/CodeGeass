/* The European War — 2017 a.t.b. Alternate continental scenario inspired by Akito the Exiled.
   Independent regional map and Euro Britannia/E.U. armies; no external assets or network. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=120,ROWS=80,SIDES=['eu','eb'];
  // 37-point GSHHG-i shoreline samples; only genuinely mixed (20–80% dry)
  // hexes may become coast. Excluded foreign mainland remains sea-only.
  const SHORE_BITS='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAEAAAAAAAAAB/7wAAAAAAAAAAAAAAAAPmAIAAAAAAAAAAAAAAAH8AAfwAAAAAAAAAAAAAB0AAAAeAAAAAAAAAAAAAfgAAGAAOAAAAAAAAAAAA/AAAAAABgB8AAAAAAAAAOAAAAAIAOAiAAAAAAAAAYAAAABwABBQAAAAAAAABgAAAAA4AAgkAAAAAAAACAAAAABbgDcBAAAAAAAAEAQAAAHHD9xAAAAAAAAAIAAEMABAAEABAAAAAAAAYAAIGAABHCAAAAAAAAABgAAIIQABE+ABAAAAAAACAAAIQIAA5AAAAAAAAAA/AABjAAALCAABAAAAAAAgAAGGAQwFAAAAAAAAAAEAAAQAB+gBAAABABgAAAYAAAAIBDwBwAAAAAAAABAAAAgILz0CQAABAAAAAAgAAAgAKXJgoQAAAAAAABgAAAAIACIAQAABAAABAAgAAAIiD9FQBAAAAAAAAAwAAAEBwDyAAAABAAAAAAwBDF0Ae8AAAAAAAAAQAAwMFAwCgIAABAABAAXwAAYQmRAD4MCABQAAABpAAAHAggAAIEAAAgABABYmAAAGQBMHIAAAAAAAAAQEAAA6IDIAwAAAAAABAAcIAAAzEDAAAAAAAAAAAAYYAAACY8AQAAAAAAABAAeCAAAnogAIAAAAAAAAAH0CAAAOwQAAAAAAAAABAALhgAAQwB4AAAAAAAAABwSwgAARzcCAAAAAAAABAgQAAADwAgAAAAAAAAAAAgTgAA0AAAAAAAAAAAABAARALBAAAAAAAAAAAAAABBiACCAAAAAAAAAAAAABBmGACEAAAAAAAAAAAAAAAgBwEcAAAAAAAAAAAAABAACK9gAAAAAAAAAAAAAEAAHgCAAAAAAAAAAAAAABAAEAGAAAAAAAAAAAAAAAAAABwAAAAAAAAAAwAAABAAAQAAAAAAAAAAAAAAAAAACMAAAAAAAAAAAAAAEBAABAAAAAAAAAAAAAAAGAAAAYAAAAAAAAAAABAAIBAAAEAAAAAAAAAAAAD4AAAAAEAAAAAAAAAAHA5AABAAABAAAAAAAAAAI5AgAAAAABAAAAOAAAAAQZAAABAAABAAAAJwAAAAQI+AAAAAAAAAAAAQAAABgLDAABAAABAAAsAIAAABAAAQAAAGQCAADAGMAAACAAAIABAIDeAN8ABBgAACAAACAAAQAAAQAZBAwAAAAAABgBAIAAAIAQwgEAAEAAAAQAAQAAAQAIQcCAAEA/wAABAIAABgAIGCAAADhAMAgAAAAAEAAoBAiAfPAAB+ABAIAAIAAkAB4Bw/gAAAAIAQAAQUAgAKZABAAAAAABAQAAQYAEABAggwAAAAAAAgAASAAwAFAhhwAIAAEBAYAAQAAAAEAa4wAIAAGAAAAAgAAAP8ArwwAAAAAZAIABAAAAGIABgIAAAAAMAPgEAAO1BAABCMAAAAAJAAT4D4gBAQADADhD4AAAAAYAIAACAAAAAEw4QAABAAMAgAABAAAAQAAAQAAAAAH+AAABAAAAfAA8QAABAAQAAAABAAAAAAAYAAAAAAgAAAAEAAAAAAAAAAEB';
  const BOUNDS={west:-13,east:47,north:72,south:34};
  const PROJECTION={centerLon:17,centerLat:52.5,angle:0,
    uMin:-30*Math.cos(52.5*Math.PI/180),uMax:30*Math.cos(52.5*Math.PI/180),
    vMin:-18.5,vMax:19.5};
  const CITIES=[["London",-0.13,51.51,"eu",3,false],["Edinburgh",-3.18,55.95,"eu",2,false],["Dublin",-6.26,53.35,"eu",2,false],["Paris",2.35,48.86,"eu",3,true],["Lyon",4.83,45.76,"eu",2,false],["Marseille",5.37,43.3,"eu",2,false],["Madrid",-3.7,40.42,"eu",3,false],["Barcelona",2.17,41.38,"eu",2,false],["Lisbon",-9.14,38.72,"eu",2,false],["Berlin",13.4,52.52,"eu",3,true],["Hamburg",10,53.55,"eu",2,false],["Munich",11.58,48.14,"eu",2,false],["Amsterdam",4.9,52.37,"eu",2,false],["Brussels",4.35,50.85,"eu",2,false],["Copenhagen",12.57,55.68,"eu",2,false],["Oslo",10.75,59.91,"eu",2,false],["Stockholm",18.06,59.33,"eu",3,false],["Helsinki",24.94,60.17,"eu",2,false],["Prague",14.42,50.08,"eu",2,false],["Vienna",16.37,48.21,"eu",3,true],["Warsaw",21,52.23,"eu",3,true],["Krakow",19.94,50.06,"eu",2,false],["Budapest",19.04,47.5,"eu",2,false],["Rome",12.5,41.9,"eu",3,false],["Milan",9.19,45.46,"eu",2,false],["Naples",14.27,40.85,"eu",2,false],["Bucharest",26.1,44.43,"eu",2,true],["Belgrade",20.46,44.79,"eu",2,false],["St Petersburg",30.3,59.93,"eb",3,true],["Moscow",37.62,55.75,"eb",3,true],["Minsk",27.56,53.9,"eb",3,true],["Kyiv",30.52,50.45,"eb",3,true],["Istanbul",28.98,41.01,"eb",3,true],["Smolensk",32.05,54.78,"eb",2,false],["Pskov",28.33,57.82,"eb",2,false],["Novgorod",31.28,58.52,"eb",2,false],["Tver",35.91,56.86,"eb",2,false],["Bryansk",34.36,53.25,"eb",2,false],["Kaluga",36.26,54.51,"eb",2,false],["Kharkiv",36.23,49.99,"eb",2,false],["Odessa",30.73,46.48,"eb",2,false],["Lviv",24.03,49.84,"eb",2,false],["Riga",24.11,56.95,"eb",2,false],["Vilnius",25.28,54.69,"eb",2,false]];
  const ARMY_GROUPS=[
    ['eu','Paris','medium',3,'leila'],['eu','Paris','support',2,'margaret'],
    ['eu','Warsaw','heavy',3,'akito'],['eu','Warsaw','assault',3],['eu','Warsaw','rocket',2,'yukiya'],
    ['eu','Krakow','medium',3,'ryo'],['eu','Krakow','assault',2],
    ['eu','Berlin','heavy',3,'ayano'],['eu','Berlin','support',2,'anna'],
    ['eu','Vienna','siege',2,'smilas'],['eu','Vienna','medium',2,'eduardo'],
    ['eu','Bucharest','medium',3,'oscar'],['eu','Bucharest','assault',2],
    ['eu','Belgrade','light',2,'fernando'],['eu','Helsinki','light',2],
    ['eu','Prague','support',2,'ferilli'],['eu','Milan','assault',2],
    ['eu','London','medium',2,'pierre'],['eu','Madrid','light',2,'olivia'],
    ['eb','Minsk','heavy',4,'shin'],['eb','Minsk','assault',3,'kewell'],
    ['eb','Lviv','heavy',4,'manfredi'],['eb','Lviv','raider',3],
    ['eb','Kyiv','medium',4,'ashley'],['eb','Kyiv','rocket',2,'farnese'],
    ['eb','Moscow','siege',3,'julius'],['eb','Moscow','heavy',3,'augustus'],
    ['eb','Smolensk','medium',3],['eb','Smolensk','support',2],
    ['eb','Riga','raider',3],['eb','Vilnius','assault',3],
    ['eb','Kharkiv','heavy',2],['eb','Odessa','light',2],
    ['eb','St Petersburg','siege',2],['eb','Istanbul','medium',2]
  ];
  const PORTS={London:2,Edinburgh:1,Dublin:1,Marseille:2,Lisbon:2,
    Barcelona:1,Copenhagen:2,Stockholm:2,Helsinki:2,
    'St Petersburg':2,Riga:2,Odessa:2,Istanbul:2};
  const FLEETS=[
    ['eu','London','eu_carrier',1],['eu','Marseille','panzer_frosch_ii',2],
    ['eu','Copenhagen','eu_carrier',1],['eu','Stockholm','panzer_frosch',2],
    ['eb','St Petersburg','carrier_battleship',1],
    ['eb','Riga','portman_ii',2],['eb','Odessa','carrier_battleship',1],
    ['eb','Istanbul','portman',1]
  ];
  const FUNDING={eu:{credits:560,industry:345,science:60,sakuradite:20},
    eb:{credits:430,industry:280,science:48,sakuradite:17}};
  function geo(c,r){
    return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*60/COLS,
      lat:BOUNDS.north-(r+.5)*38/ROWS};
  }
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/38-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/60-.5-.5*(r&1))))};
  }
  function nearest(g,p,valid,radius=9){return E.nearestTile(g,p,valid,radius);}
  const MOUNTAINS=[[8.5,46.4,5,1.4],[21,48.4,5.4,1.8],
    [-1,43,5,1.2],[24,42.1,3.5,1.1],[10.8,62,4,5.3],[15,68,3.5,2.8]];
  const FORESTS=[[24,55,6,4],[28,59,6,3],[15,57,6,4],[9,51,6,3]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS);
    return mountain>.63?'mountain':
      mountain>.29||forest>.51||p.lat>66||((c*29+r*17)%31<4&&p.lat>49)
        ?'forest':'plains';
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
  function create(player='eu',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported European War faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'european-war',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{eu:0,eb:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{eb:E.FACTIONS.eb},lineup:{eb:E.ROSTER.eb}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'european-war',key:'europe',title:'The European War',
      phase:'continental-war',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION};
    // Euro Britannia uses compatible Britannian Elite Forces for this
    // scenario only. No global HQ, Conquest, or Japan access is changed.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu')),
      eb:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    const packed=root.EUROPE_LAND_BITS || (typeof require==='function'?
      require('./europe-landmask.js'):null);
    const bits=typeof packed==='string'?packed:root.EUROPE_LAND_BITS;
    if(!bits)throw Error('European tactical landmask was not loaded');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/8)throw Error('European tactical landmask is corrupt');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const land=!!(raw.charCodeAt(i>>3)&(128>>(i&7)));
      return {c,r,owner:null,terrain:land?landscape(p,c,r):'sea'};
    });
    // The packed continental coastline includes the African coast and Asian
    // Anatolia. Audit its connected landmasses BEFORE allocating city provinces:
    // islands such as Sicily, Sardinia, Corsica and Crete must remain playable.
    const rawComponents=new Int16Array(g.tiles.length).fill(-1),rawRegions=[];
    for(let i=0;i<g.tiles.length;i++){
      if(g.tiles[i].terrain==='sea'||rawComponents[i]>=0)continue;
      const q=[g.tiles[i]],id=rawRegions.length;
      rawComponents[i]=id;
      let minLon=Infinity,maxLon=-Infinity,maxLat=-Infinity;
      for(let k=0;k<q.length;k++){
        const t=q[k],p=geo(t.c,t.r);
        minLon=Math.min(minLon,p.lon);maxLon=Math.max(maxLon,p.lon);
        maxLat=Math.max(maxLat,p.lat);
        for(const n of E.adjacent(g,t)){
          const j=n.r*COLS+n.c;
          if(n.terrain==='sea'||rawComponents[j]>=0)continue;
          rawComponents[j]=id;q.push(n);
        }
      }
      rawRegions.push({size:q.length,minLon,maxLon,maxLat});
    }
    const mainland=rawRegions.indexOf(rawRegions.reduce((best,r)=>
      r.size>best.size?r:best,rawRegions[0]));
    const excludedRegions=new Set(rawRegions.flatMap((region,id)=>
      id!==mainland&&region.maxLat<38&&region.minLon<12&&region.maxLon>-7?[id]:[]));
    function anatolianLand(p){
      // West of the Bosporus (European Thrace) remains in the theatre.
      // Beyond it, the Black Sea / Caucasus boundary excludes Asia.
      if(p.lon<26.5)return false;
      if(p.lon<28)return p.lat<40.25;
      if(p.lon<29.2)return p.lat<40.65;
      return p.lat<41.55+0.07*(p.lon-29.2);
    }
    const excludedLand=new Uint8Array(g.tiles.length);
    for(let i=0;i<g.tiles.length;i++){
      const t=g.tiles[i];
      if(t.terrain!=='sea'&&(excludedRegions.has(rawComponents[i])||
          (rawComponents[i]===mainland&&anatolianLand(geo(t.c,t.r))))){
        excludedLand[i]=1;
        t.terrain='sea'; // Temporarily water for city/army placement.
      }
    }
    // An adjacent sea hex does not, by itself, make a land hex coastal.
    // Require a shoreline intersecting the actual hex footprint.
    const shore=typeof atob==='function'?atob(SHORE_BITS):
      Buffer.from(SHORE_BITS,'base64').toString('latin1');
    if(shore.length!==COLS*ROWS/8)throw Error('European coastline reference corrupt');
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const i=t.r*COLS+t.c;
      if((shore.charCodeAt(i>>3)&(128>>(i&7)))&&
          E.adjacent(g,t).some(n=>n.terrain==='sea'&&
            !excludedLand[n.r*COLS+n.c]))t.terrain='coast';
    }
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place European city '+name);
      const capital=name==='Paris'||name==='St Petersburg';
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
      if(g.tiles[i].terrain==='sea'||components[i]>=0)continue;
      const q=[g.tiles[i]];components[i]=id;
      for(let k=0;k<q.length;k++)for(const n of E.adjacent(g,q[k])){
        const j=n.r*COLS+n.c;
        if(n.terrain==='sea'||components[j]>=0)continue;
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
    for(const t of g.tiles)if(t.terrain!=='sea'){
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
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),10);
        if(!at)throw Error('Cannot deploy unit at '+name);
        const cmd=i===0?commander:null;
        const stack=side==='eb'?(i===0?3:2):(i===0?2:1);
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,name).units.push(u.id);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    const taken=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const at=nearest(g,s,t=>t.terrain==='sea'&&!taken.has(E.key(t)),9);
      if(!at)throw Error('Cannot place naval port '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      taken.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!E.TYPES[type]?.naval)throw Error('Invalid European fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),10);
        if(!at)throw Error('Cannot deploy navy at '+name);
        fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
      }
      g.scenario.groups.push(fleet);
    }
    // The ocean stays visually continuous while only coastal shipping
    // theatres within five hexes of land are actionable.
    const depth=new Int16Array(g.tiles.length).fill(-1),q=[];
    for(const t of g.tiles)if(t.terrain!=='sea'){
      depth[t.r*COLS+t.c]=0;q.push(t);
    }
    for(let i=0;i<q.length;i++){
      const t=q[i],d=depth[t.r*COLS+t.c];
      if(d>=5)continue;
      for(const n of E.adjacent(g,t)){
        const j=n.r*COLS+n.c;
        if(n.terrain==='sea'&&depth[j]===-1){depth[j]=d+1;q.push(n);}
      }
    }
    for(const t of g.tiles)if(t.terrain==='sea'&&
      (excludedLand[t.r*COLS+t.c]||depth[t.r*COLS+t.c]<0||
       depth[t.r*COLS+t.c]>5))t.terrain='offmap';
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*(side==='eu'?2:3);
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>v!==player))
        for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
          E.addDifficultyFrames(u,difficulty);
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Euro Britannia attacks from the east; the European republic defends its industrial heartland.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' European cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='european-war'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in Europe.'};
    return null;
  }
  const api={id:'european-war',title:'The European War',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{europeanRegion:true,coastBuffer:0,homeZoom:5.4,overviewMarkers:true},
    elite:true,eliteRosterOnly:true,
    ai:{doctrine:'europe'},
    text:{
      era:"Europe · 2017 a.t.b.",
      intro:"Euro Britannia versus Europia United. No scripted turn limit: capture every enemy city.",
      diplomacy:"Both sides are hostile from turn 1. Europia United has the larger industrial economy; Euro Britannia begins with a heavier eastern field army.",
      elite:"Elite Europe: both armies and fleets begin as single-frame Lv.1 elites, including rival starting commanders. Euro Britannia borrows Britannian Elite Forces. AI factories produce unlimited Lv.1 elites with full research; player-deployed elites use their unlocked HQ levels (up to Lv.5).",
      focus:{
        eu:"Warsaw",
        eb:"Minsk"
      }
    },
    blurbs:{
      eu:"Hold the industrial cities of western and central Europe against the eastern offensive.",
      eb:"Lead Euro Britannia’s elite spearheads from Russia and eastern Europe toward Paris."
    }};
  E.scenarios={...(E.scenarios||{}),europe:api,
    byId:{...(E.scenarios?.byId||{}),'european-war':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

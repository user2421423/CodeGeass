/* The Bering Strait Crisis — 2017 alternate history, Britannia versus Europia United.
   120 x 80 GSHHS intermediate-resolution geography with longitude unwrapped across the date line.
   Amphibious invasion, naval battles and conquest victory; no Chinese involvement. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=120,ROWS=80,SIDES=['britannia','eu'];
  // GSHHG-i geographic shoreline fraction, sampled 37 times per hex.
  // Coast requires 20–80% land; dry coast-adjacent tiles stay inland.
  const SHORE_BITS='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAYAAAAAABwAAAAAAAAAAABAAAAAACEAAAADgAAAAAB+MAAAAH4AAAAt+AAAAAAABAAAAAAAAABAFkAAAAAABAAAAAAAAAMAAD4AAAAABAAx/AAAAAIAAADIAAAAB/60A4AAAAAAAAAHgbAAAgAiACAAAAAAAAAAIkAAAAAUABgAAPAAAAAAHBAAAAAAAAQAAIAAAAAAAgAAAAAAAAMAAAAAAAAAABAAAAAAAADAAGAAAAAAAAAAAAAAAAAgADAAAAAAABAAAAAAAAAQAAgAAAAAAAAAAAAAAAAfAA4AAAAAABAAAAAAAAAAABPAAAAAAAAAAAAAAAAIQFHAAAAAABAAAAAAAAgAIY8AAAAAAAAAAAAAAAwCRAAAAAAAABAAAAAAAANBAwAAAAAAAAAAAAAAABAAAQAAAAAAABAAAAAAA+AbAIGAAAAAAAAAAAAAAAAOAGUAAAAAABAAAAAAAEAAAACAAAAAAAAAAAAAAEAAQACAAAAAABAAAAAAACAA2AMAAAAAAAAAAAAAACAAMDwAAAAAABAAAAgAABAAAAAAAAAAAAAAACgAA+AAAEAAAAAAABAAACAABAAAAEAAAAAAAAAAfBAAMAAAAIAAAAAAABAAQkAAQAAAAAAAAAAAAAAAhQAAgAAAAEAAAYAAQBAAAzABAAAAADgAAxoAAAACAMDyAAAAAAAABhYAABAAAIOAAAAAAVoABxRQAAAAARgAAAAAAZ4ASGgFABXGAAAAAAAAAAAA8oAAgEjUBAgAAAAAAAIAIgAAQhBwBDgAAAAAAAHqAAAABQAACAAAAAAAAAE9KAAAFxAAEAAAAAAAAAAELAAAB4AAYMAAAAAAAAADmAAAA5AAQCAAAAAAAAAEtAAAAUAAgEAAAAAAAAAASAAAA9AAgCAAAAAAAAACMAAAAOABACAAAAAAAAAoIAAAAfABAEAAAAAAAABIAAAAAfAAAIAAAAAAAAGwAAAAAHABAIAAAAAAAAJAAAAAABAAAAIAAAAAAAeAAAAAAFABAAEAAAAAAB4AAAAAADAAAIAAAAAAADgAAAAAAAABAgAAAAAAAAAAAAAAAAABBAAAAAAAAYAAAAAAADAAAAAAAAAAAYAAAAAAACABBAAAAAAADgAAAAAAADAACAAAQAAABAAAAAAAABAAEAAAAAAAAAAAAAAAAAAAkAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAHAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const BOUNDS={west:148,east:228,north:74,south:48};
  const K=Math.cos(61*Math.PI/180);
  const PROJECTION={centerLon:188,centerLat:61,angle:0,uMin:-40*K,uMax:40*K,vMin:-13,vMax:13};
  // Military formations and factories are alternate history. Coordinates are real locations.
  const CITIES=[["Anchorage",210.1,61.22,"britannia",3,true],["Fairbanks",212.5,64.84,"britannia",3,true],["Nome",194.6,64.5,"britannia",3,true],["Kotzebue",197.4,66.9,"britannia",2,true],["Utqiagvik",203.21,71.29,"britannia",1,false],["Bethel",198.25,60.79,"britannia",2,false],["Unalaska",193.46,53.87,"britannia",2,false],["Adak",183.38,51.88,"britannia",2,false],["Kodiak",207.6,57.79,"britannia",2,false],["Valdez",213.65,61.13,"britannia",2,false],["Dillingham",201.1,59.04,"britannia",2,false],["Cold Bay",197.29,55.2,"britannia",1,false],["Prudhoe Bay",211.67,70.26,"britannia",2,false],["Seward",210.55,60.1,"britannia",2,false],["Magadan",150.8,59.56,"eu",3,true],["Anadyr",177.5,64.73,"eu",3,true],["Provideniya",186.23,64.43,"eu",3,true],["Uelen",190.3,66.16,"eu",2,true],["Pevek",170.3,69.7,"eu",2,false],["Bilibino",166.45,68.05,"eu",2,false],["Egvekinot",179.11,66.33,"eu",2,false],["Petropavlovsk",158.65,53.02,"eu",3,false],["Ust-Kamchatsk",162.54,56.22,"eu",2,false],["Palana",159.83,59.08,"eu",2,false],["Tigil",158.67,57.76,"eu",1,false],["Ossora",163.08,59.25,"eu",2,false],["Beringovsky",179.1,63.05,"eu",1,false],["Khatyrka",175.32,62.05,"eu",2,false]];
  const ARMY_GROUPS=[["britannia","Nome","heavy",3,"cornelia"],["britannia","Nome","rocket",2,"cecile"],["britannia","Nome","assault",2,"guilford"],["britannia","Kotzebue","medium",3,"gino"],["britannia","Kotzebue","support",2,null],["britannia","Bethel","raider",2,"villetta"],["britannia","Fairbanks","heavy",3,"bismarck"],["britannia","Fairbanks","medium",2,"darlton"],["britannia","Anchorage","heavy",2,"suzaku"],["britannia","Anchorage","siege",2,null],["britannia","Unalaska","assault",3,"jeremiah"],["britannia","Adak","medium",2,"oldrin"],["britannia","Kodiak","medium",2,null],["britannia","Valdez","light",2,null],["eu","Uelen","heavy",3,"akito"],["eu","Uelen","rocket",2,"yukiya"],["eu","Provideniya","assault",3,"ryo"],["eu","Provideniya","heavy",2,"ayano"],["eu","Anadyr","medium",3,"leila"],["eu","Anadyr","support",2,"anna"],["eu","Pevek","rocket",2,"smilas"],["eu","Pevek","medium",2,null],["eu","Egvekinot","assault",2,"klaus"],["eu","Magadan","heavy",3,"oscar"],["eu","Magadan","siege",2,null],["eu","Petropavlovsk","medium",3,"olivia"],["eu","Petropavlovsk","assault",2,"fernando"],["eu","Ust-Kamchatsk","raider",2,null],["eu","Ossora","light",2,null]];
  const PORTS={"Nome":3,"Kotzebue":2,"Unalaska":3,"Adak":2,"Kodiak":3,"Dillingham":2,"Cold Bay":2,"Valdez":2,"Seward":2,"Anadyr":3,"Provideniya":3,"Uelen":3,"Pevek":2,"Petropavlovsk":3,"Ust-Kamchatsk":2,"Magadan":2,"Egvekinot":2,"Ossora":2};
  const FLEETS=[["britannia","Nome","carrier_battleship",2],["britannia","Adak","carrier_battleship",1],["britannia","Kodiak","carrier_battleship",1],["britannia","Kotzebue","portman_ii",2],["britannia","Unalaska","portman_ii",2],["britannia","Dillingham","portman",2],["britannia","Cold Bay","portman_ii",2],["britannia","Seward","portman",2],["eu","Uelen","eu_carrier",2],["eu","Anadyr","eu_carrier",1],["eu","Petropavlovsk","eu_carrier",1],["eu","Provideniya","panzer_frosch_ii",2],["eu","Pevek","panzer_frosch",2],["eu","Ust-Kamchatsk","panzer_frosch_ii",2],["eu","Ossora","panzer_frosch",2],["eu","Egvekinot","panzer_frosch_ii",2]];
  const FUNDING={britannia:{credits:420,industry:245,science:43,sakuradite:26},
    eu:{credits:405,industry:245,science:43,sakuradite:26}};
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
  const MOUNTAINS=[[157,57,6,3],[171,65,8,4],[184,64,5,2],[204,62,8,3],[216,63,8,5],[213,69,5,2]];
  const FORESTS=[[154,60,7,3],[210,63,10,5],[222,61,9,4]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS);
    return mountain>.63?'mountain':
      mountain>.29||forest>.53||p.lat>70||((c*29+r*17)%31<4&&p.lat>60)
        ?'forest':'plains';
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
  function create(player='eu',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported Bering Strait Crisis faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'bering-strait',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'bering-strait',key:'bering',title:'The Bering Strait Crisis',
      phase:'amphibious-war',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION};
    // Britannia uses compatible Britannian Elite Forces for this
    // scenario only. No global HQ, Conquest, or Japan access is changed.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    // Sea routes remain unrestricted across the strait and the entire
    // Kamchatka–Aleutian flank, rather than stopping five hexes offshore.
    const packed=root.BERING_LAND_BITS || (typeof require==='function'?
      require('./bering-landmask.js'):null);
    const bits=typeof packed==='string'?packed:root.BERING_LAND_BITS;
    if(!bits)throw Error('Bering shoreline mask was not loaded');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/8)throw Error('Bering shoreline mask is corrupt');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const land=!!(raw.charCodeAt(i>>3)&(128>>(i&7)));
      return {c,r,owner:null,terrain:land?landscape(p,c,r):'sea'};
    });
    const shoreline=typeof atob==='function'?atob(SHORE_BITS):
      Buffer.from(SHORE_BITS,'base64').toString('latin1');
    if(shoreline.length!==COLS*ROWS/8)throw Error('Bering coastline mask corrupt');
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const i=t.r*COLS+t.c;
      if((shoreline.charCodeAt(i>>3)&(128>>(i&7)))&&
          E.adjacent(g,t).some(n=>n.terrain==='sea'))t.terrain='coast';
    }
    // Single-hex real islands have no 'interior'; keep them landable even
    // if the subhex coast source represents the island as too small.
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const n=E.adjacent(g,t);
      if(n.length>0&&n.every(v=>v.terrain==='sea'))t.terrain='coast';
    }
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Bering city '+name);
      const capital=name==='Anchorage'||name==='Magadan';
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
        const stack=i===0?3:2;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,name).units.push(u.id);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    const taken=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&!taken.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(n=>n.terrain==='sea').length-
          E.adjacent(g,a).filter(n=>n.terrain==='sea').length)[0];
      if(!at)throw Error('Cannot place naval port '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      taken.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!E.TYPES[type]?.naval)throw Error('Invalid Bering fleet type '+type);
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
    // The entire connected regional sea stays navigable for fleets.
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*2;
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>v!==player))
        for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
          E.addDifficultyFrames(u,difficulty);
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Britannia and Europia United contest the Bering Strait, with invasion routes through Kamchatka and the Aleutians.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Bering theatre cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='bering-strait'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Bering theatre.'};
    return null;
  }
  const api={id:'bering-strait',title:'The Bering Strait Crisis',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.shorelineBits=SHORE_BITS;
  api.meta={map:{painter:'beringGeographic'},
    elite:true,
    ai:{doctrine:'europe'},
    text:{
      era:"Bering Strait · Alternate 2017",
      intro:"Britannia versus Europia United: a two-front naval and amphibious war from Alaska to Kamchatka. Conquer every enemy city.",
      diplomacy:"Britannia and Europia United are at war from turn 1. There is no Chinese Federation involvement or scripted deadline.",
      elite:"Elite Bering: land and amphibious forces begin as Lv.1 Elite Forces; enemy named commanders begin at Lv.3. Carriers remain conventional. Rival AI has advanced research and elite factories; players follow HQ unlock rules.",
      focus:{
        britannia:"Nome",
        eu:"Provideniya"
      }
    },
    blurbs:{
      britannia:"Command the Alaskan land army and carrier fleets. Cross the Bering Strait or strike Kamchatka through the Aleutians.",
      eu:"Defend eastern Siberia and Chukotka, then counter-invade Alaska using fortified northern ports and Kamchatka bases."
    }};
  E.scenarios={...(E.scenarios||{}),bering:api,
    byId:{...(E.scenarios?.byId||{}),'bering-strait':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

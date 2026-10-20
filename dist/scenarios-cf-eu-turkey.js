/* Invasion of Turkey — Chinese Federation vs E.U. standalone scenario.
   Original Turkey shoreline, straits and projection retained; deployments are independent.
   Integrator owns the manifest, catalog and campaign registration. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=144,ROWS=104,SIDES=['cf','eu'];
  // GSHHG-i 37-point fractional shoreline: 20–80% dry => coast.
  const SHORE_BITS='AAAADAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAACAAAAABAAAAIAAAAAAAAAAAAAgAAAAAAAAAQAAAAAAAAAAAAAgAAAABAAAAQAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAACAAAABAAAAQAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAABgAAABAAAAwAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAACAAAAAAAAAAAAAAAIAAAAAAAHAAAAAAAAAAAAAAAIAAABAAAAgAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAQAAAAAAAAAAAAAAEAAAAAAAAQAAAAAAAgAAAAAAEAAABAAAAIAAAAA3/QAAAAAACAAAAAAAAQAAAACAAQAAAAAAAAAABAAAAAAAAAIAAIAAAAAACAAAAAAAAAAAAAgAAJwAAAAAEAAABAAAAAAAABAAACIAAAAAEAAAAAAAAEAAAEAAAAAAAAAAIAAABAAAABAAAMAAAAIAAAAAIAAAAAAAAAgAAgAAAAFwAAAAgAAABAAAAAPAAAAAAACIAAABAAAAAAAAAAA+xAAAAAAMgAAEAAAABAAAAOAAGAAAAAABwHQYAAIAAJwACx4AAAAAAAAAOwHgAAAABWHACACAAAAAAAAAAAAAAAAAAsAgEADwAAAAAAAAAAAAAAAABCAAFAHwAAAAAAAAAAAAAAAAAMAdTAQAAAAAAAAAAAAAAAAAZAGDgwZgAAAAAAAAAAAAAAAAMAELw/pgAAAAAAAAAAAAAAAALgAKDgAAAAAAAAAAAAAAAAAAEgBEARAAAAAAAAAAAAAAAAAAAQDoARgAAAAAAAAAAAAAAAAADAAYAAAAAAAAAAAAAAAAAAAABAoAAAAAAAAAAAAAAAAAAAAAAAwQAAAAAAAAAAAAAAAAAAAABAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAATgAAAAAAAAAAAAAAAAAAAAAAYgAAAAAAAAAAAAAAAAAAABAAIAAAAAAAAAAAAAAAAAAAAAABiAAAAAAAAAAAAAAAAAAAABAAJAAAAAAAEAAAAAAAAAAAAAAB0AAAAAAAQAAAAAAAAAAAABAAagAAAAAAYAAAAAAAAAAAAAIABgAAAAAAgAAAAAAAAAA0ABMAAQAAAAAAsAAAAAAAAAAcAAAABAAAAAAAEAAAAAAAAAMQABAAFAAAABAAQAAAAAAAAAAQAAABpAAAABwAQAAAAAAAAAAQABgAUQAAAAwAAAAAAAAAAAPIAAAAHgAAAAAAAAAAAAAAAABQABAA4AAAAAAAAAAAAAAAAAAAAEwBnAAAAIAAAAAAAAAAAAAAATEACgAAAEAAAAAAAAAEAAAAAFYAAYAAAMAAAAAAAAAEAAAAALBAAAAAAEwAAAAAAAAAAAAAAIDABIAAaAwAAAAAAAAAAAAAALBADYAACAIAAAAAAAAAAAAAAFRg5QAAAAwAAAAAAAAAAAAAAAQQwIAAAAAAAAAAAAAAAAAAAAQAAIAAAAAAAAAAAAAAAAAAAEIAAEAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAEAEAAAAAAAAAAAAAAAAAAAAACA0AKAAAAAAAAAAAAAAAAAAABAcAX8AAAAAAAAAAAAAAAAAAAABgIAAAAAAAAAQAAAAAAAAABABAd7AATgAADAoAAAAAAAAAAYQAnc4AAQAAEhIAAAAAAAAABAAEAIUAQMAAIJAAAAAAAAAAAAAIAAAAgCAAQAQAAAAAAAAABAAAAEEAABAAQAQAAAAAAAAAAAAAAQEAgAAAgAEAAAAAAAAABAAAAEBGgAAAgAgAAAAAAAAAAAAABIAwAAQMAAgAAAAAAAAAhAAAAoAAAAPgAAQAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAABAAAAgAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAABAAAIAAAAAAAAAgAAAAAAAAAAAAAQAAAAAAAMBAAAAAAAAAABgAAIAAAAAAAYAgAAAAAAAAAAnAAQAAAAAADgAgAAAAAAAAABQ+AAAAAAAB8gAAAAAAAAAAAAACwAAAAAACBAAgAAAAAAAAABYBIAAAAAAKAAAAAAAAAAAAAAEBwAAAAAAwAAAgAAAAAAAAABD8AAAAAAAADgAAAAAAAAAAAAAAAAAAAAAgEAAgAAAAAAAAABAAAAAAAAAQIAAQAAAAAAAAAAAAAAAAAAANgAAAAAAAAAAAABAAAAAAAAABAAAQAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAABAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAgABAAAAAAAAAAAABAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAwABAAAAAAAAAAAABAAAAAAAAAIAAAAAAAAAAAAACAAAAAAAAkAB';
  const BOUNDS={west:24.1,east:45.6,north:43.5,south:33.9};
  const K=Math.cos(38.7*Math.PI/180);
  const PROJECTION={centerLon:34.85,centerLat:38.7,angle:0,uMin:-10.75*K,uMax:10.75*K,vMin:-4.8,vMax:4.8};
  // Historical urban coordinates; borders and deployment are Code Geass alternate history.
  // The E.U. defends Anatolia, while Chinese Federation stages from northern Syria and Iraq.
  const CITIES=[["Edirne",26.56,41.68,"eu",3,true],["Tekirdag",27.51,40.98,"eu",2,false],["Istanbul",28.98,41.01,"eu",3,true],["Canakkale",26.41,40.15,"eu",2,true],["Bursa",29.06,40.2,"eu",3,true],["Balikesir",27.88,39.65,"eu",2,false],["Izmir",27.14,38.42,"eu",3,true],["Manisa",27.43,38.61,"eu",2,false],["Aydin",27.85,37.85,"eu",2,false],["Denizli",29.09,37.78,"eu",2,false],["Mugla",28.36,37.21,"eu",2,false],["Antalya",30.71,36.9,"eu",3,true],["Isparta",30.55,37.76,"eu",2,false],["Afyon",30.54,38.75,"eu",2,false],["Eskisehir",30.52,39.77,"eu",3,true],["Ankara",32.86,39.93,"eu",3,true],["Bolu",31.61,40.73,"eu",2,false],["Zonguldak",31.79,41.45,"eu",2,false],["Kastamonu",33.78,41.39,"eu",2,false],["Sinop",35.15,42.03,"eu",2,false],["Samsun",36.33,41.29,"eu",3,true],["Ordu",37.88,40.98,"eu",2,false],["Trabzon",39.72,41,"eu",3,true],["Rize",40.52,41.02,"eu",2,false],["Corum",34.95,40.55,"eu",2,false],["Yozgat",34.81,39.82,"eu",2,false],["Kayseri",35.49,38.72,"eu",3,true],["Konya",32.48,37.87,"eu",3,true],["Karaman",33.21,37.18,"eu",2,false],["Mersin",34.63,36.81,"eu",3,true],["Adana",35.32,37,"eu",3,true],["Nigde",34.68,37.97,"eu",2,false],["Sivas",37.02,39.75,"eu",3,true],["Erzincan",39.49,39.75,"eu",2,false],["Erzurum",41.27,39.91,"eu",3,true],["Kars",43.1,40.6,"eu",2,false],["Van",43.38,38.49,"eu",3,true],["Malatya",38.31,38.35,"eu",3,true],["Elazig",39.22,38.67,"eu",2,false],["Mus",41.49,38.73,"eu",2,false],["Bitlis",42.11,38.4,"eu",2,false],["Batman",41.14,37.88,"eu",2,false],["Diyarbakir",40.23,37.91,"eu",3,true],["Kahramanmaras",36.94,37.58,"eu",3,true],["Siirt",41.94,37.93,"eu",2,false],["Antakya",36.16,36.2,"eu",3,true],["Iskenderun",36.17,36.59,"eu",3,true],["Kilis",37.12,36.72,"eu",2,false],["Gaziantep",37.38,37.07,"eu",3,true],["Sanliurfa",38.79,37.16,"eu",3,true],["Mardin",40.74,37.32,"eu",3,true],["Cizre",42.2,37.33,"eu",2,false],["Hakkari",43.74,37.57,"eu",2,false],["Artvin",41.82,41.18,"eu",2,true],["Ardahan",42.71,41.11,"eu",2,true],["Igdir",44.04,39.92,"eu",2,true],["Dogubayazit",44.08,39.55,"eu",2,true],["Bayburt",40.22,40.26,"eu",2,false],["Tbilisi",44.8,41.71,"cf",3,true],["Akhaltsikhe",42.99,41.64,"cf",2,false],["Poti",42.14,42.15,"cf",2,true],["Batumi",41.65,41.65,"cf",3,true],["Gyumri",43.84,40.79,"cf",3,true],["Yerevan",44.51,40.18,"cf",3,true],["Nakhchivan",45.41,39.21,"cf",3,true],["Maku",44.48,39.29,"cf",2,false],["Khoy",44.95,38.55,"cf",3,true],["Salmas",44.77,38.2,"cf",2,false],["Urmia",45.08,37.55,"cf",3,true],["Mosul",43.13,36.34,"cf",3,true],["Erbil",44,36.19,"cf",3,true]];
  const ARMY_GROUPS=[["cf","Tbilisi","heavy",10,"xingke"],["cf","Tbilisi","rocket",6,"gaohai"],["cf","Gyumri","heavy",9,"xianglin"],["cf","Gyumri","siege",5,null],["cf","Akhaltsikhe","assault",5,"ren"],["cf","Batumi","medium",6,"meiling"],["cf","Yerevan","super",10,"honggu"],["cf","Yerevan","rocket",6,"cao"],["cf","Nakhchivan","heavy",8,"chaojielun"],["cf","Nakhchivan","rocket",5,null],["cf","Maku","heavy",8,"zhaohao"],["cf","Maku","siege",4,null],["cf","Khoy","super",10,"sawasaki"],["cf","Khoy","rocket",6,"vritra"],["cf","Salmas","medium",6,"leifeng"],["cf","Urmia","heavy",10,"chengzhong"],["cf","Urmia","rocket",6,"zidien"],["cf","Mosul","heavy",9,"lifeng"],["cf","Mosul","rocket",5,null],["cf","Erbil","super",9,"huangqian"],["cf","Erbil","assault",5,null],["eu","Kars","heavy",7,"akito"],["eu","Kars","rocket",5,"yukiya"],["eu","Ardahan","assault",3,"ryo"],["eu","Artvin","medium",3,"ayano"],["eu","Igdir","heavy",3,"oscar"],["eu","Dogubayazit","rocket",3,null],["eu","Erzurum","heavy",8,"smilas"],["eu","Erzurum","rocket",5,"anna"],["eu","Van","heavy",7,"leila"],["eu","Van","rocket",3,null],["eu","Hakkari","heavy",3,"klaus"],["eu","Cizre","medium",3,null],["eu","Diyarbakir","heavy",7,"olivia"],["eu","Diyarbakir","rocket",3,null],["eu","Mardin","assault",3,null],["eu","Sanliurfa","heavy",3,"fernando"],["eu","Trabzon","heavy",3,"marirrosa"],["eu","Trabzon","rocket",3,null],["eu","Rize","medium",3,null],["eu","Sivas","heavy",5,"margaret"],["eu","Sivas","rocket",3,null],["eu","Erzincan","medium",3,null],["eu","Malatya","heavy",3,"pierre"],["eu","Malatya","rocket",3,null],["eu","Gaziantep","heavy",3,"eduardo"],["eu","Antakya","assault",3,null],["eu","Adana","heavy",4,null],["eu","Adana","rocket",3,null],["eu","Kayseri","heavy",3,null],["eu","Kayseri","siege",2,null],["eu","Konya","heavy",3,null],["eu","Konya","rocket",3,null],["eu","Ankara","heavy",7,null],["eu","Ankara","rocket",3,null],["eu","Ankara","siege",3,null],["eu","Eskisehir","medium",3,null],["eu","Samsun","heavy",3,null],["eu","Istanbul","heavy",6,null],["eu","Istanbul","rocket",3,null],["eu","Edirne","medium",3,null],["eu","Izmir","heavy",3,null],["eu","Bursa","heavy",3,null],["eu","Antalya","medium",3,null],["eu","Mersin","assault",3,null]];
  const PORTS={"Istanbul":3,"Tekirdag":2,"Canakkale":3,"Izmir":3,"Antalya":3,"Mersin":3,"Zonguldak":2,"Sinop":2,"Samsun":3,"Trabzon":3,"Rize":2,"Iskenderun":3,"Batumi":3,"Poti":2};
  const FLEETS=[["cf","Batumi","cf_carrier",3],["cf","Batumi","shui_gun_ru_ii",4],["cf","Poti","shui_gun_ru_ii",3],["eu","Trabzon","eu_carrier",2],["eu","Samsun","panzer_frosch_ii",3],["eu","Istanbul","eu_carrier",2],["eu","Istanbul","panzer_frosch_ii",3],["eu","Canakkale","panzer_frosch",2],["eu","Izmir","eu_carrier",2],["eu","Antalya","panzer_frosch_ii",2],["eu","Mersin","eu_carrier",1]];
  const FUNDING={"cf":{"credits":1150,"industry":675,"science":95,"sakuradite":58},"eu":{"credits":1020,"industry":635,"science":95,"sakuradite":58}};
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
  const MOUNTAIN_PASSES=[[44.0,39.9,.30,.28],[43.1,40.65,.37,.30],[42.2,40.4,.37,.29],[43.5,37.8,.34,.25],[41.9,41.2,.29,.22]];
  const MOUNTAINS=[[30.3,37.1,2.2,.8],[34.0,37.3,2.0,.78],[36.7,37.45,1.5,.8],[39.6,38.7,1.7,1.0],[42.7,39.2,2.6,2.2],[35.5,41.1,2.0,.62],[39.7,40.7,2.6,.66]];
  const FORESTS=[[30.7,40.7,2.6,.75],[33.2,41.3,2.0,.8],[37.8,41.0,3.0,.7],[27.7,39.7,1.8,1.1]];
  const LOWLANDS=[[32.7,39.2,2.8,1.7],[27.6,38.4,1.3,1.7],[35.6,37.1,1.9,.65],[29.1,40.3,1.7,.6],[38.6,37.3,1.6,.6]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    // Pass gaps keep Aras, Kars, Van and the Black Sea corridor traversable.
    if(MOUNTAIN_PASSES.some(([x,y,w,h])=>Math.abs(p.lon-x)<w&&Math.abs(p.lat-y)<h))return 'plains';
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS),river=density(p,LOWLANDS);
    return river>.67?'plains':mountain>.63?'mountain':
      mountain>.29||forest>.53||((c*29+r*17)%31<4&&p.lat>16)
        ?'forest':'plains';
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
  function create(player='cf',difficulty='normal',seed=201726){
    if(!SIDES.includes(player))throw Error('Unsupported Turkey faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'turkey',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{cf:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'cf-eu-turkey',key:'cf-eu-turkey',title:'Invasion of Turkey',
      phase:'land-sea-offensive',aiDoctrine:'europe',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
      rivers:{Sakarya:[[30.3,40.45],[30.4,40.2],[31.5,40.5],[30.8,41.1]],Kizilirmak:[[35.5,39.0],[35.2,40.2],[34.8,41.4],[35.2,41.75]],Euphrates:[[39.4,39.7],[38.7,38.8],[39.0,37.7],[38.5,36.8]],Tigris:[[40.3,38.7],[40.4,37.9],[41.0,37.2],[42.1,36.8]]},
      straits:{Bosporus:[[29.13,41.28],[29.07,41.12],[29.0,41.01],[28.93,40.89]],Dardanelles:[[26.2,39.96],[26.5,40.13],[26.68,40.33],[26.85,40.53]]},
      operationalFronts:[{name:'Caucasus Passes',attack:'cf',objective:'Kars'},{name:'Ararat Front',attack:'cf',objective:'Erzurum'},{name:'Persian Front',attack:'cf',objective:'Van'},{name:'Mesopotamian Front',attack:'cf',objective:'Diyarbakir'},{name:'Thracian Straits',attack:'eu',objective:'Istanbul'}]};
    // Both sides use their own established faction Elite Force rosters.
    // Other scenarios, global HQ and Conquest remain unchanged.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&E.ELITE_FORCES[id].availableTo.includes('eu')),
      cf:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&E.ELITE_FORCES[id].availableTo.includes('cf'))
    };
    // Only the connected Aegean–Marmara–Black Sea–Mediterranean basin is
    // operational for carriers and harbours; tiny inland lakes are not ports.
    const packed=root.TURKEY_LAND_BITS || (typeof require==='function'?
      require('./turkey-landmask.js'):null);
    const bits=typeof packed==='string'?packed:root.TURKEY_LAND_BITS;
    if(!bits)throw Error('Turkey shoreline mask was not loaded');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/8)throw Error('Turkey shoreline mask is corrupt');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const land=!!(raw.charCodeAt(i>>3)&(128>>(i&7)));
      return {c,r,owner:null,terrain:land?landscape(p,c,r):'sea'};
    });
    const shore=typeof atob==='function'?atob(SHORE_BITS):
      Buffer.from(SHORE_BITS,'base64').toString('latin1');
    if(shore.length!==COLS*ROWS/8)throw Error('Turkey shoreline data corrupt');
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const i=t.r*COLS+t.c;
      if((shore.charCodeAt(i>>3)&(128>>(i&7)))&&
          E.adjacent(g,t).some(n=>n.terrain==='sea'))t.terrain='coast';
    }
    // The 20–80% coastal mask creates some isolated lagoon cells.
    // Find the largest continuous sea basin once, before placing any ports.
    const visitedSea=new Set();
    let openSea=new Set();
    for(const start of g.tiles){
      if(start.terrain!=='sea'||visitedSea.has(E.key(start)))continue;
      const queue=[start],component=new Set([E.key(start)]);
      visitedSea.add(E.key(start));
      for(let i=0;i<queue.length;i++)for(const n of E.adjacent(g,queue[i])){
        const k=E.key(n);
        if(n.terrain!=='sea'||visitedSea.has(k))continue;
        visitedSea.add(k);component.add(k);queue.push(n);
      }
      if(component.size>openSea.size)openSea=component;
    }
    if(openSea.size<2500)throw Error('Anatolian maritime approaches are disconnected');
    const navigable=t=>t.terrain==='sea'&&openSea.has(E.key(t));
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>navigable(n)))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Turkey city '+name);
      const capital=name==='Ankara'||name==='Yerevan';
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
      const at=E.adjacent(g,s).filter(t=>navigable(t)&&!taken.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(n=>n.terrain==='sea').length-
          E.adjacent(g,a).filter(n=>n.terrain==='sea').length)[0];
      if(!at)throw Error('Cannot place naval port '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      taken.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!E.TYPES[type]?.naval)throw Error('Invalid Turkey fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>navigable(t)&&!E.unitAt(g,t)&&
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
    E.log(g,'Chinese Federation Army Groups enter Anatolia through the Caucasus and Persian approaches; the E.U. defends Van, Kars, Erzurum and Ankara. The Bosporus must be crossed to conquer Thrace.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Turkey theatre cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='cf-eu-turkey'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Turkey theatre.'};
    return null;
  }
  const api={id:'cf-eu-turkey',title:'Invasion of Turkey',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={
    elite:true,saveVersion:1,eliteRosterOnly:true,terrainCosts:{mountain:2},
    map:{centreSampled:true,coastBuffer:1,overlays:['turkey'],overviewMarkers:true},
    ai:{doctrine:'europe',recovery:true,routeBias:'cf',
      operationalAxes:{invader:'cf',defender:'eu',axes:{
        'Tbilisi Command':['Ardahan','Kars','Erzurum','Sivas','Ankara'],
        'Gyumri Command':['Kars','Erzurum','Erzincan','Ankara'],
        'Akhaltsikhe Command':['Artvin','Trabzon','Samsun'],
        'Batumi Command':['Rize','Trabzon','Samsun'],
        'Yerevan Command':['Igdir','Dogubayazit','Erzurum','Sivas','Ankara'],
        'Nakhchivan Command':['Igdir','Kars','Erzurum'],
        'Maku Command':['Dogubayazit','Van','Malatya','Kayseri'],
        'Khoy Command':['Van','Mus','Elazig','Kayseri'],
        'Salmas Command':['Van','Bitlis','Diyarbakir'],
        'Urmia Command':['Hakkari','Van','Diyarbakir','Adana'],
        'Mosul Command':['Cizre','Mardin','Sanliurfa','Gaziantep'],
        'Erbil Command':['Hakkari','Diyarbakir','Malatya','Konya']
      },defenderHubs:['Kars','Ardahan','Igdir','Van','Erzurum','Diyarbakir','Sivas','Ankara','Trabzon','Istanbul','Izmir']}},
    text:{terrain:'Eastern Anatolia has rugged mountain defenses and several open pass corridors. Mountain terrain costs 2 movement; fleets use the actual Black Sea, Marmara and Mediterranean hexes.',
      era:'Anatolia · Alternate 2017',
      intro:'Federation armies advance from Georgia, Armenia, northwest Persia and northern Iraq into E.U.-held Anatolia. Take Ankara and cross the Bosporus to Istanbul and Thrace. All cities must fall: no turn limit.',
      diplomacy:'Two factions: the Chinese Federation and Europia United. The Black Sea and Mediterranean ports have separate capturable berth ownership; the Bosporus and Dardanelles connect the sea approaches.',
      elite:'All four difficulties retain faction-appropriate named commanders and Elite Force conversion. Each side has its own eligible roster and standard HQ restrictions.',
      focus:{cf:'Yerevan',eu:'Erzurum'}},
    blurbs:{
      cf:'Strike Kars and Erzurum from the Caucasus and Iran, advance on Ankara, seize Black Sea harbours and force the Bosporus into Istanbul.',
      eu:'Defend Van, Kars and the Armenian frontier in depth, sustain Ankara and western industry, then retake the Persian and Caucasus staging cities.'}};
  E.scenarios={...(E.scenarios||{}),cfEuTurkey:api,
    byId:{...(E.scenarios?.byId||{}),'cf-eu-turkey':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

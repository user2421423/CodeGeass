/* Invasion of Turkey — Britannian drive out of Syria and Iraq against the Europian Anatolian frontier.
   144 × 104 GSHHS-sampled regional map, with navigable Bosporus and Dardanelles.
   All armies and fleets use standard faction equipment and engine combat rules. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=144,ROWS=104,SIDES=['britannia','eu'];
  // GSHHG-i 37-point fractional shoreline: 20–80% dry => coast.
  const SHORE_BITS='AAAADAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAACAAAAABAAAAIAAAAAAAAAAAAAgAAAAAAAAAQAAAAAAAAAAAAAgAAAABAAAAQAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAACAAAABAAAAQAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAABgAAABAAAAwAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAACAAAAAAAAAAAAAAAIAAAAAAAHAAAAAAAAAAAAAAAIAAABAAAAgAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAQAAAAAAAAAAAAAAEAAAAAAAAQAAAAAAAgAAAAAAEAAABAAAAIAAAAA3/QAAAAAACAAAAAAAAQAAAACAAQAAAAAAAAAABAAAAAAAAAIAAIAAAAAACAAAAAAAAAAAAAgAAJwAAAAAEAAABAAAAAAAABAAACIAAAAAEAAAAAAAAEAAAEAAAAAAAAAAIAAABAAAABAAAMAAAAIAAAAAIAAAAAAAAAgAAgAAAAFwAAAAgAAABAAAAAPAAAAAAACIAAABAAAAAAAAAAA+xAAAAAAMgAAEAAAABAAAAOAAGAAAAAABwHQYAAIAAJwACx4AAAAAAAAAOwHgAAAABWHACACAAAAAAAAAAAAAAAAAAsAgEADwAAAAAAAAAAAAAAAABCAAFAHwAAAAAAAAAAAAAAAAAMAdTAQAAAAAAAAAAAAAAAAAZAGDgwZgAAAAAAAAAAAAAAAAMAELw/pgAAAAAAAAAAAAAAAALgAKDgAAAAAAAAAAAAAAAAAAEgBEARAAAAAAAAAAAAAAAAAAAQDoARgAAAAAAAAAAAAAAAAADAAYAAAAAAAAAAAAAAAAAAAABAoAAAAAAAAAAAAAAAAAAAAAAAwQAAAAAAAAAAAAAAAAAAAABAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAATgAAAAAAAAAAAAAAAAAAAAAAYgAAAAAAAAAAAAAAAAAAABAAIAAAAAAAAAAAAAAAAAAAAAABiAAAAAAAAAAAAAAAAAAAABAAJAAAAAAAEAAAAAAAAAAAAAAB0AAAAAAAQAAAAAAAAAAAABAAagAAAAAAYAAAAAAAAAAAAAIABgAAAAAAgAAAAAAAAAA0ABMAAQAAAAAAsAAAAAAAAAAcAAAABAAAAAAAEAAAAAAAAAMQABAAFAAAABAAQAAAAAAAAAAQAAABpAAAABwAQAAAAAAAAAAQABgAUQAAAAwAAAAAAAAAAAPIAAAAHgAAAAAAAAAAAAAAAABQABAA4AAAAAAAAAAAAAAAAAAAAEwBnAAAAIAAAAAAAAAAAAAAATEACgAAAEAAAAAAAAAEAAAAAFYAAYAAAMAAAAAAAAAEAAAAALBAAAAAAEwAAAAAAAAAAAAAAIDABIAAaAwAAAAAAAAAAAAAALBADYAACAIAAAAAAAAAAAAAAFRg5QAAAAwAAAAAAAAAAAAAAAQQwIAAAAAAAAAAAAAAAAAAAAQAAIAAAAAAAAAAAAAAAAAAAEIAAEAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAEAEAAAAAAAAAAAAAAAAAAAAACA0AKAAAAAAAAAAAAAAAAAAABAcAX8AAAAAAAAAAAAAAAAAAAABgIAAAAAAAAAQAAAAAAAAABABAd7AATgAADAoAAAAAAAAAAYQAnc4AAQAAEhIAAAAAAAAABAAEAIUAQMAAIJAAAAAAAAAAAAAIAAAAgCAAQAQAAAAAAAAABAAAAEEAABAAQAQAAAAAAAAAAAAAAQEAgAAAgAEAAAAAAAAABAAAAEBGgAAAgAgAAAAAAAAAAAAABIAwAAQMAAgAAAAAAAAAhAAAAoAAAAPgAAQAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAABAAAAgAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAABAAAIAAAAAAAAAgAAAAAAAAAAAAAQAAAAAAAMBAAAAAAAAAABgAAIAAAAAAAYAgAAAAAAAAAAnAAQAAAAAADgAgAAAAAAAAABQ+AAAAAAAB8gAAAAAAAAAAAAACwAAAAAACBAAgAAAAAAAAABYBIAAAAAAKAAAAAAAAAAAAAAEBwAAAAAAwAAAgAAAAAAAAABD8AAAAAAAADgAAAAAAAAAAAAAAAAAAAAAgEAAgAAAAAAAAABAAAAAAAAAQIAAQAAAAAAAAAAAAAAAAAAANgAAAAAAAAAAAABAAAAAAAAABAAAQAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAABAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAgABAAAAAAAAAAAABAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAwABAAAAAAAAAAAABAAAAAAAAAIAAAAAAAAAAAAACAAAAAAAAkAB';
  const BOUNDS={west:24.1,east:45.6,north:43.5,south:33.9};
  const K=Math.cos(38.7*Math.PI/180);
  const PROJECTION={centerLon:34.85,centerLat:38.7,angle:0,uMin:-10.75*K,uMax:10.75*K,vMin:-4.8,vMax:4.8};
  // Historical urban coordinates; borders and deployment are Code Geass alternate history.
  // The E.U. defends Anatolia, while Britannia stages from northern Syria and Iraq.
  const CITIES=[["Edirne",26.56,41.68,"eu",3,true],["Tekirdag",27.51,40.98,"eu",2,false],["Istanbul",28.98,41.01,"eu",3,true],["Canakkale",26.41,40.15,"eu",2,true],["Bursa",29.06,40.2,"eu",3,true],["Balikesir",27.88,39.65,"eu",2,false],["Izmir",27.14,38.42,"eu",3,true],["Manisa",27.43,38.61,"eu",2,false],["Aydin",27.85,37.85,"eu",2,false],["Denizli",29.09,37.78,"eu",2,false],["Mugla",28.36,37.21,"eu",2,false],["Antalya",30.71,36.9,"eu",3,true],["Isparta",30.55,37.76,"eu",2,false],["Afyon",30.54,38.75,"eu",2,false],["Eskisehir",30.52,39.77,"eu",3,true],["Ankara",32.86,39.93,"eu",3,true],["Bolu",31.61,40.73,"eu",2,false],["Zonguldak",31.79,41.45,"eu",2,false],["Kastamonu",33.78,41.39,"eu",2,false],["Sinop",35.15,42.03,"eu",2,false],["Samsun",36.33,41.29,"eu",3,true],["Ordu",37.88,40.98,"eu",2,false],["Trabzon",39.72,41,"eu",3,true],["Rize",40.52,41.02,"eu",2,false],["Corum",34.95,40.55,"eu",2,false],["Yozgat",34.81,39.82,"eu",2,false],["Kayseri",35.49,38.72,"eu",3,true],["Konya",32.48,37.87,"eu",3,true],["Karaman",33.21,37.18,"eu",2,false],["Mersin",34.63,36.81,"eu",3,true],["Adana",35.32,37,"eu",3,true],["Nigde",34.68,37.97,"eu",2,false],["Sivas",37.02,39.75,"eu",3,true],["Erzincan",39.49,39.75,"eu",2,false],["Erzurum",41.27,39.91,"eu",3,true],["Kars",43.1,40.6,"eu",2,false],["Van",43.38,38.49,"eu",3,true],["Malatya",38.31,38.35,"eu",3,true],["Elazig",39.22,38.67,"eu",2,false],["Mus",41.49,38.73,"eu",2,false],["Bitlis",42.11,38.4,"eu",2,false],["Batman",41.14,37.88,"eu",2,false],["Diyarbakir",40.23,37.91,"eu",3,true],["Kahramanmaras",36.94,37.58,"eu",3,true],["Siirt",41.94,37.93,"eu",2,false],["Antakya",36.16,36.2,"britannia",3,true],["Iskenderun",36.17,36.59,"britannia",3,true],["Kilis",37.12,36.72,"britannia",2,false],["Gaziantep",37.38,37.07,"britannia",3,true],["Sanliurfa",38.79,37.16,"britannia",3,true],["Mardin",40.74,37.32,"britannia",3,true],["Cizre",42.2,37.33,"britannia",2,false],["Hakkari",43.74,37.57,"britannia",2,false],["Aleppo",37.16,36.2,"britannia",3,true],["Latakia",35.77,35.52,"britannia",3,true],["Tartus",35.89,34.89,"britannia",2,true],["Raqqa",39.01,35.95,"britannia",2,false],["Mosul",43.13,36.34,"britannia",3,true],["Erbil",44,36.19,"britannia",3,true]];
  const ARMY_GROUPS=[["britannia","Antakya","heavy",4,"cornelia"],["britannia","Antakya","assault",3,"guilford"],["britannia","Antakya","rocket",2,"cecile"],["britannia","Iskenderun","medium",3,"suzaku"],["britannia","Iskenderun","assault",3],["britannia","Gaziantep","heavy",4,"bismarck"],["britannia","Gaziantep","siege",3],["britannia","Kilis","raider",3,"villetta"],["britannia","Sanliurfa","medium",4,"jeremiah"],["britannia","Sanliurfa","rocket",3],["britannia","Mardin","heavy",4,"darlton"],["britannia","Mardin","assault",3],["britannia","Cizre","raider",3],["britannia","Hakkari","medium",3],["britannia","Mosul","heavy",4],["britannia","Erbil","support",2],["britannia","Aleppo","heavy",4,"oldrin"],["britannia","Aleppo","rocket",3],["britannia","Latakia","assault",3],["britannia","Tartus","medium",3],["britannia","Raqqa","medium",3],["eu","Istanbul","heavy",4,"akito"],["eu","Istanbul","rocket",3,"yukiya"],["eu","Istanbul","support",2,"leila"],["eu","Edirne","assault",3,"ryo"],["eu","Canakkale","heavy",3,"ayano"],["eu","Izmir","medium",4],["eu","Bursa","heavy",4,"oscar"],["eu","Eskisehir","medium",3,"klaus"],["eu","Ankara","heavy",5,"smilas"],["eu","Ankara","rocket",3],["eu","Ankara","siege",3],["eu","Antalya","medium",4],["eu","Konya","heavy",4],["eu","Mersin","assault",3],["eu","Adana","heavy",4],["eu","Kahramanmaras","heavy",4],["eu","Kahramanmaras","rocket",2],["eu","Kayseri","medium",4],["eu","Sivas","medium",3],["eu","Diyarbakir","heavy",4],["eu","Diyarbakir","rocket",3],["eu","Malatya","assault",3],["eu","Erzurum","heavy",4],["eu","Van","medium",3],["eu","Trabzon","medium",3],["eu","Samsun","medium",3],["eu","Sinop","light",2],["eu","Zonguldak","medium",2],["eu","Kars","raider",2]];
  const PORTS={"Istanbul":3,"Tekirdag":2,"Canakkale":3,"Izmir":3,"Antalya":3,"Mersin":3,"Zonguldak":2,"Sinop":2,"Samsun":3,"Trabzon":3,"Rize":2,"Iskenderun":3,"Latakia":3,"Tartus":2};
  const FLEETS=[["britannia","Iskenderun","carrier_battleship",3],["britannia","Latakia","carrier_battleship",3],["britannia","Tartus","carrier_battleship",2],["britannia","Iskenderun","portman_ii",4],["britannia","Latakia","portman_ii",3],["britannia","Tartus","portman",3],["eu","Izmir","eu_carrier",2],["eu","Canakkale","panzer_frosch_ii",2],["eu","Antalya","eu_carrier",1],["eu","Mersin","panzer_frosch_ii",2],["eu","Istanbul","eu_carrier",1],["eu","Trabzon","eu_carrier",1],["eu","Samsun","panzer_frosch",2]];
  const FUNDING={britannia:{credits:600,industry:330,science:56,sakuradite:28},eu:{credits:690,industry:365,science:62,sakuradite:28}};
  function geo(c,r){
    return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
      lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};
  }
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function nearest(g,p,valid,radius=9){
    let best=null,d=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!valid(t))continue;
        const n=E.distance(p,t,g);
        if(n<d){d=n;best=t;}
      }
    return best;
  }
  const MOUNTAINS=[[30.3,37.1,2.2,.8],[34.0,37.3,2.0,.78],[36.7,37.45,1.5,.8],[39.6,38.7,1.7,1.0],[42.7,39.2,2.6,2.2],[35.5,41.1,2.0,.62],[39.7,40.7,2.6,.66]];
  const FORESTS=[[30.7,40.7,2.6,.75],[33.2,41.3,2.0,.8],[37.8,41.0,3.0,.7],[27.7,39.7,1.8,1.1]];
  const LOWLANDS=[[32.7,39.2,2.8,1.7],[27.6,38.4,1.3,1.7],[35.6,37.1,1.9,.65],[29.1,40.3,1.7,.6],[38.6,37.3,1.6,.6]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS),river=density(p,LOWLANDS);
    return river>.67?'plains':mountain>.63?'mountain':
      mountain>.29||forest>.53||((c*29+r*17)%31<4&&p.lat>16)
        ?'forest':'plains';
  }
  function orderGroup(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const group=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
    if(!group)return {ok:false,reason:'Army group not found'};
    let assigned=0,failed=0;
    for(const unitId of group.units){
      const u=g.units.find(v=>v.id===unitId&&v.hp>0&&v.side===g.player);
      if(!u)continue;
      const res=E.setGoto(g,u.id,target.c,target.r);
      if(res.ok)assigned++;else failed++;
    }
    if(assigned)group.destination={c:target.c,r:target.r};
    return {ok:assigned>0,assigned,failed,reason:assigned?'':'No group unit can reach that hex'};
  }
  function create(player='britannia',difficulty='normal',seed=201701){
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
      eliteDeployed:{},arsenal:{britannia:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'invasion-turkey',key:'turkey',title:'Invasion of Turkey',
      phase:'land-sea-offensive',aiDoctrine:'europe',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
      rivers:{Sakarya:[[30.3,40.45],[30.4,40.2],[31.5,40.5],[30.8,41.1]],Kizilirmak:[[35.5,39.0],[35.2,40.2],[34.8,41.4],[35.2,41.75]],Euphrates:[[39.4,39.7],[38.7,38.8],[39.0,37.7],[38.5,36.8]],Tigris:[[40.3,38.7],[40.4,37.9],[41.0,37.2],[42.1,36.8]]},
      straits:{Bosporus:[[29.13,41.28],[29.07,41.12],[29.0,41.01],[28.93,40.89]],Dardanelles:[[26.2,39.96],[26.5,40.13],[26.68,40.33],[26.85,40.53]]},
      operationalFronts:[{name:'Cilician Gates',attack:'britannia',objective:'Adana'},{name:'Euphrates Front',attack:'britannia',objective:'Diyarbakir'},{name:'Mediterranean Landings',attack:'britannia',objective:'Antalya'},{name:'Thracian Straits',attack:'eu',objective:'Istanbul'}]};
    // Both sides use their own established faction Elite Force rosters.
    // Other scenarios, global HQ and Conquest remain unchanged.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
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
      const capital=name==='Ankara'||name==='Aleppo';
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
      const factor=side===player?1:['challenge','elite'].includes(difficulty)?1.6:
        difficulty==='hard'?1.3:1;
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n*factor)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*2;
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>v!==player))
        for(const [i,u] of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval).entries())
          if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Britannia advances through the Taurus Mountains and toward Anatolia while the E.U. defends Ankara, Istanbul and the Bosporus-Dardanelles approaches.',player);
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
    if(g.mode!=='scenario'||g.scenario?.id!=='invasion-turkey'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Turkey theatre.'};
    return null;
  }
  const api={id:'invasion-turkey',title:'Invasion of Turkey',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={terrainCosts:{mountain:2},map:{centreSampled:true,overlays:['turkey']},
    elite:true,
    text:{terrain:'Mountains cost 2 movement; plains and marked passes cost 1. Float units ignore the extra terrain cost.',
      era:"Anatolia · Alternate 2017",
      intro:"Britannia attacks north from the Middle East while its expeditionary fleets target the Mediterranean coast. Europia United defends Turkey and the straits. Capture all 59 cities.",
      diplomacy:"Two powers are at war from turn 1. The Bosporus and Dardanelles are navigable; ports may change hands. No turn limit.",
      elite:"Elite Turkey uses standard faction Elite Force replacements for land and amphibious troops while ships remain conventional. AI income and commanders follow established Elite settings.",
      focus:{
        britannia:"Antakya",
        eu:"Ankara"
      }
    },
    blurbs:{
      britannia:"Lead the northern land offensive from Syria and Iraq, pierce the Taurus passes and land expeditionary fleets at Anatolian ports. Take every E.U. city.",
      eu:"Defend Istanbul, Ankara and the Anatolian interior, hold the Bosporus and Dardanelles, then counterattack into Syria and Mesopotamia."
    }};
  E.scenarios={...(E.scenarios||{}),turkey:api,
    byId:{...(E.scenarios?.byId||{}),'invasion-turkey':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

/* The Invasion of the Philippines — 2017 a.t.b. alternate history.
   China owns every Philippine city; Britannia invades from Palau and Yap.
   144 x 112 geographic hexes, real Philippine shoreline sampled from the
   repository's high-resolution coastal polygons; standard total conquest. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=144,ROWS=112,SIDES=['britannia','cf'];
  const BOUNDS={west:115.5,east:139.1,north:21.2,south:4.5};
  const K=Math.cos(13*Math.PI/180);
  const DLON=(BOUNDS.east-BOUNDS.west)/COLS, DLAT=(BOUNDS.north-BOUNDS.south)/ROWS;
  // Geographic atlas and playable hex centers must use the same projection.
  const PROJECTION={centerLon:127.3,centerLat:13,angle:0,
    uMin:(BOUNDS.west+DLON/2-127.3)*K,uMax:(BOUNDS.east-DLON/2-127.3)*K,
    vMin:BOUNDS.south+DLAT/2-13,vMax:BOUNDS.north-DLAT/2-13};
  // [city, real longitude, latitude, initial owner, factory tier, fortress]
  const CITIES=[["Manila",120.984,14.599,"cf",3,true],["Quezon City",121.05,14.676,"cf",3,true],["Baguio",120.596,16.402,"cf",2,true],["Laoag",120.596,18.197,"cf",2,false],["Tuguegarao",121.733,17.614,"cf",2,false],["Dagupan",120.34,16.04,"cf",2,false],["Tarlac",120.59,15.49,"cf",2,false],["Batangas",121.06,13.75,"cf",2,true],["Naga",123.18,13.62,"cf",2,false],["Legazpi",123.73,13.14,"cf",2,true],["Calapan",121.18,13.41,"cf",2,false],["San Jose",121.07,12.35,"cf",1,false],["Puerto Princesa",118.735,9.74,"cf",3,true],["El Nido",119.39,11.18,"cf",2,false],["Coron",120.2,12,"cf",1,false],["Iloilo",122.56,10.72,"cf",3,true],["Roxas",122.75,11.59,"cf",2,false],["Bacolod",122.95,10.66,"cf",3,true],["Dumaguete",123.31,9.31,"cf",2,false],["Cebu",123.89,10.32,"cf",3,true],["Bogo",124,11.05,"cf",2,false],["Tagbilaran",123.86,9.65,"cf",2,false],["Tacloban",125,11.24,"cf",3,true],["Ormoc",124.61,11.01,"cf",2,false],["Calbayog",124.6,12.07,"cf",2,false],["Masbate",123.62,12.37,"cf",2,false],["Cagayan de Oro",124.65,8.48,"cf",3,true],["Davao",125.61,7.07,"cf",3,true],["Zamboanga",122.07,6.91,"cf",3,true],["Butuan",125.54,8.95,"cf",2,false],["Iligan",124.24,8.23,"cf",2,false],["Cotabato",124.25,7.22,"cf",2,false],["General Santos",125.17,6.11,"cf",2,false],["Surigao",125.49,9.78,"cf",2,false],["Koror",134.48,7.34,"britannia",3,true],["Peleliu",134.24,7.03,"britannia",2,true],["Colonia",138.12,9.52,"britannia",3,true]];
  // Historical commanders and military forces are an alternate-history deployment.
  // Ground units must fit the actual separated base islands: Koror 9 dry hexes,
  // Peleliu 3 and Yap 10, with one city hex reserved at each staging base.
  const ARMY_GROUPS=[["britannia","Koror","heavy",3,"cornelia"],["britannia","Koror","rocket",1,"cecile"],["britannia","Koror","assault",3,"suzaku"],["britannia","Peleliu","heavy",1,"guilford"],["britannia","Peleliu","raider",1,"jeremiah"],["britannia","Colonia","heavy",2,"bismarck"],["britannia","Colonia","assault",3,"gino"],["britannia","Colonia","medium",4,"darlton"],["cf","Manila","heavy",3,"xingke"],["cf","Quezon City","rocket",2,"honggu"],["cf","Baguio","heavy",2,"xianglin"],["cf","Laoag","medium",2,null],["cf","Tuguegarao","assault",2,"cao"],["cf","Batangas","heavy",2,"gaohai"],["cf","Legazpi","medium",2,null],["cf","Calapan","assault",2,null],["cf","Puerto Princesa","heavy",3,"leifeng"],["cf","El Nido","medium",1,null],["cf","Iloilo","medium",3,"meiling"],["cf","Bacolod","heavy",3,"lifeng"],["cf","Cebu","heavy",3,"zhaohao"],["cf","Tagbilaran","medium",2,null],["cf","Tacloban","heavy",2,"ren"],["cf","Calbayog","rocket",2,null],["cf","Masbate","medium",2,null],["cf","Cagayan de Oro","heavy",3,"chengzhong"],["cf","Davao","heavy",3,"huangqian"],["cf","Zamboanga","heavy",3,"sawasaki"],["cf","Butuan","medium",2,null],["cf","Iligan","rocket",2,null],["cf","Cotabato","medium",2,null],["cf","General Santos","assault",2,null],["cf","Surigao","support",2,null]];
  const PORTS={"Manila":3,"Laoag":2,"Batangas":2,"Naga":2,"Legazpi":2,"Calapan":2,"San Jose":1,"Puerto Princesa":3,"El Nido":2,"Coron":1,"Iloilo":3,"Roxas":2,"Bacolod":3,"Dumaguete":2,"Cebu":3,"Bogo":2,"Tagbilaran":2,"Tacloban":3,"Ormoc":2,"Calbayog":2,"Masbate":2,"Cagayan de Oro":3,"Davao":3,"Zamboanga":3,"Butuan":2,"Iligan":2,"General Santos":2,"Surigao":2,"Koror":3,"Peleliu":3,"Colonia":3};
  const FLEETS=[["britannia","Koror","carrier_battleship",6],["britannia","Peleliu","carrier_battleship",3],["britannia","Colonia","carrier_battleship",3],["britannia","Koror","portman_ii",23],["britannia","Peleliu","portman_ii",16],["britannia","Colonia","portman_ii",16],["britannia","Koror","portman",7],["cf","Manila","cf_carrier",1],["cf","Cebu","cf_carrier",1],["cf","Davao","cf_carrier",1],["cf","Puerto Princesa","cf_carrier",1],["cf","Manila","shui_gun_ru_ii",2],["cf","Legazpi","shui_gun_ru_ii",2],["cf","Cebu","shui_gun_ru_ii",2],["cf","Iloilo","shui_gun_ru",2],["cf","Tacloban","shui_gun_ru_ii",2],["cf","Zamboanga","shui_gun_ru_ii",2],["cf","Davao","shui_gun_ru_ii",2],["cf","Puerto Princesa","shui_gun_ru",2]];
  const FUNDING={britannia:{credits:830,industry:460,science:47,sakuradite:48},
    cf:{credits:565,industry:335,science:42,sakuradite:34}};
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
  const MOUNTAINS=[[121,16,1.1,2.4],[123.3,13.5,.7,1.7],[124.9,8,1.7,1.8],[118.5,9.8,.5,2.2],[123,10,.5,1.7]];
  const FORESTS=[[121.6,17.3,1.2,2.3],[124.4,8.3,1.6,2],[118.5,10,.7,2.2],[123.2,12.1,1.1,1.4]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS);
    return mountain>.63?'mountain':
      mountain>.29||forest>.53||((c*29+r*17)%37<3&&p.lat>9)
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
    if(!SIDES.includes(player))throw Error('Unsupported Invasion of the Philippines faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'philippines-invasion',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'philippines-invasion',key:'philippines',title:'The Invasion of the Philippines',
      phase:'amphibious-war',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION};
    // Britannia uses compatible Britannian Elite Forces for this
    // scenario only. No global HQ, Conquest, or Japan access is changed.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      cf:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('cf')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    // The connected Philippine Sea remains navigable for Britannia's invasion;
    // Chinese AI defense rules prohibit counter-invasions of offshore bases.
    const packed=root.PHILIPPINES_LAND_BITS || (typeof require==='function'?
      require('./philippines-landmask.js'):null);
    const bits=typeof packed==='string'?packed:root.PHILIPPINES_LAND_BITS;
    if(!bits)throw Error('Philippine shoreline mask was not loaded');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/8)throw Error('Philippine shoreline mask is corrupt');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const land=!!(raw.charCodeAt(i>>3)&(128>>(i&7)));
      return {c,r,owner:null,terrain:land?landscape(p,c,r):'sea'};
    });
    for(const t of g.tiles)if(t.terrain!=='sea'&&
      E.adjacent(g,t).some(n=>n.terrain==='sea'))t.terrain='coast';
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Philippine city '+name);
      const capital=name==='Manila'||name==='Koror';
      const shield=fort?400:120+60*tier;
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
          t.owner===side&&!E.stationAt(g,t),10);
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
      if(!E.TYPES[type]?.naval)throw Error('Invalid Philippine fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),10);
        if(!at)throw Error('Cannot deploy navy at '+name);
        const ship=E.newUnit(g,type,side,at.c,at.r);
        // Keep expeditionary carriers with their staging force, and Chinese
        // patrols tied to their own Philippine naval district.
        if(side==='britannia'&&type==='carrier_battleship')ship.invasionGroup=name;
        if(side==='cf')ship.philippinesPatrol={c:s.c,r:s.r};
        fleet.units.push(ship.id);
      }
      g.scenario.groups.push(fleet);
    }
    // The original staging armies remain intact; only their deployment changes.
    // Embark the first attack waves before turn one, retaining land garrisons
    // at each base and leaving other carriers free to ferry reinforcements.
    // Cargo follows the same representation as the existing Hawaii invasion.
    if(difficulty==='elite')E.prepareEliteEurope(g);
    const carriers=g.units.filter(u=>u.side==='britannia'&&
      u.type==='carrier_battleship');
    for(const [name,reserve] of [['Koror',2],['Peleliu',1],['Colonia',3]]){
      const command=groupByCity.get('britannia:'+name);
      const units=(command?.units||[]).map(id=>g.units.find(u=>u.id===id))
        .filter(Boolean)
        .sort((a,b)=>Number(!!b.cmd)-Number(!!a.cmd)||a.id-b.id);
      for(const u of units.slice(0,Math.max(0,units.length-reserve))){
        const ship=carriers.find(v=>v.invasionGroup===name&&
          (v.cargo?.length||0)<E.TYPES[v.type].capacity);
        if(!ship)throw Error('Philippines invasion carrier capacity exceeded at '+name);
        u.c=ship.c;u.r=ship.r;
        (ship.cargo||=[]).push(u);
        g.units.splice(g.units.indexOf(u),1);
      }
    }
    // The entire connected regional sea stays navigable for fleets.
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
        for(const [i,u] of E.allUnits(g).filter(v=>v.side===side&&
          E.TYPES[v.type].naval!=='ship').entries())
          if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    // Include troops inside carriers in starting strength and all difficulty modes.
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,E.allUnits(g).filter(u=>u.side===s).length]));
    E.log(g,'China holds all Philippine cities. Britannia launches its amphibious invasion from Palau and Yap.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Capture all enemy-held Philippine theatre cities ('+
      g.stations.filter(s=>s.owner!==side).length+' remaining of '+CITIES.length+').';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='philippines-invasion'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Philippine theatre.'};
    return null;
  }
  const api={id:'philippines-invasion',title:'The Invasion of the Philippines',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  E.scenarios={...(E.scenarios||{}),philippines:api,
    byId:{...(E.scenarios?.byId||{}),'philippines-invasion':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

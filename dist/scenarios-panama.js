/* Panama Campaign — Europia United's two-ocean assault on Britannian Panama.
   156 x 100 geodetic hexes; intermediate GSHHG exact hex-area 20/80 coastal land fractions.
   The canal is a one-hex, lock-to-lock navigable channel with only mapped bridge crossings.
   Standard faction equipment, independently capturable ports and existing multi-front naval AI. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=156, ROWS=100, SIDES=['eu','britannia'];
  const BOUNDS={west:-84.35,east:-76.75,north:11.12,south:6.85};
  const K=Math.cos(8.985*Math.PI/180);
  const PROJECTION={centerLon:-80.55,centerLat:8.985,angle:0,uMin:-3.8*K,uMax:3.8*K,vMin:-2.135,vMax:2.135};
  // Historical urban locations; allegiances and mobilizations are alternate history.
  const CITIES=[
    ['Panama City',-79.5199,8.9824,'britannia',3,true],
    ['Colon',-79.900,9.359,'britannia',3,true],
    ['Balboa',-79.566,8.949,'britannia',3,true],
    ['David',-82.431,8.428,'britannia',3,true],
    ['Santiago',-80.981,8.102,'britannia',3,true],
    ['Changuinola',-82.516,9.433,'britannia',2,true],
    ['Bocas del Toro',-82.242,9.340,'britannia',2,true],
    ['Almirante',-82.399,9.299,'britannia',2,false],
    ['Puerto Armuelles',-82.867,8.278,'britannia',2,true],
    ['Boquete',-82.431,8.778,'britannia',2,false],
    ['Las Lajas',-81.860,8.237,'britannia',2,false],
    ['Sona',-81.318,8.014,'britannia',2,false],
    ['Aguadulce',-80.547,8.241,'britannia',2,false],
    ['Penonome',-80.359,8.519,'britannia',3,true],
    ['Chitre',-80.428,7.961,'britannia',2,true],
    ['Las Tablas',-80.277,7.765,'britannia',2,false],
    ['La Chorrera',-79.779,8.880,'britannia',3,true],
    ['Arraijan',-79.620,8.951,'britannia',2,true],
    ['Gatun',-79.936,9.263,'britannia',2,true],
    ['Gamboa',-79.706,9.119,'britannia',2,true],
    ['Portobelo',-79.653,9.552,'britannia',2,true],
    ['Nombre de Dios',-79.473,9.579,'britannia',2,false],
    ['Chepo',-79.101,9.172,'britannia',2,true],
    ['Tortí',-78.405,8.921,'britannia',2,false],
    ['La Palma',-78.140,8.406,'britannia',2,true],
    ['Meteti',-77.974,8.503,'britannia',2,true],
    ['Yaviza',-77.692,8.157,'britannia',2,false],
    ['Santa Fe',-81.077,8.508,'britannia',2,false],
    ['Taboga',-79.558,8.797,'britannia',2,false],
    ['Isla Colon',-82.268,9.406,'britannia',2,false]
  ];
  const PORTS={
    'Colon':3,'Balboa':3,'Panama City':3,'Bocas del Toro':3,
    'Almirante':2,'Puerto Armuelles':2,'Gatun':2,'Portobelo':3,
    'Nombre de Dios':2,'Changuinola':2,'La Palma':2,
    'Chitre':2,'Taboga':2,'Isla Colon':2
  };
  const LAND_GROUPS=[
    ['britannia','Colon','heavy',3,'cornelia',true],
    ['britannia','Colon','rocket',2,'cecile',true],
    ['britannia','Gatun','heavy',3,'guilford',true],
    ['britannia','Gatun','siege',2,null,true],
    ['britannia','Gamboa','heavy',3,'bismarck',true],
    ['britannia','Gamboa','rocket',2,null,true],
    ['britannia','Balboa','heavy',3,'suzaku',true],
    ['britannia','Balboa','rocket',2,null,true],
    ['britannia','Panama City','heavy',3,'jeremiah',true],
    ['britannia','Panama City','siege',2,null,true],
    ['britannia','Portobelo','assault',2,'darlton',false],
    ['britannia','La Chorrera','medium',3,'villetta',false],
    ['britannia','Penonome','heavy',3,'oldrin',false],
    ['britannia','Penonome','rocket',2,null,false],
    ['britannia','Santiago','heavy',3,null,false],
    ['britannia','David','heavy',3,null,false],
    ['britannia','David','medium',2,null,false],
    ['britannia','Bocas del Toro','medium',2,null,false],
    ['britannia','Changuinola','medium',2,null,false],
    ['britannia','Chepo','heavy',3,null,false],
    ['britannia','Meteti','medium',2,null,false],
    ['britannia','Puerto Armuelles','medium',2,null,false],
    ['britannia','Chitre','medium',2,null,false],
    ['eu','Caribbean North','heavy',5,'akito'],
    ['eu','Caribbean North','assault',4,'ryo'],
    ['eu','Caribbean North','rocket',3,'yukiya'],
    ['eu','Caribbean East','heavy',4,'smilas'],
    ['eu','Caribbean East','medium',4,'leila'],
    ['eu','Caribbean East','siege',3,null],
    ['eu','Pacific West','heavy',5,'oscar'],
    ['eu','Pacific West','assault',4,'ayano'],
    ['eu','Pacific West','rocket',3,'klaus'],
    ['eu','Pacific East','heavy',4,'olivia'],
    ['eu','Pacific East','medium',4,'pierre'],
    ['eu','Pacific East','siege',3,'margaret']
  ];
  const FLEETS=[
    ['eu','Caribbean North',-81.80,10.20,'eu_carrier',7],
    ['eu','Caribbean East',-78.52,10.50,'eu_carrier',6],
    ['eu','Pacific West',-82.05,7.35,'eu_carrier',7],
    ['eu','Pacific East',-79.35,7.38,'eu_carrier',6],
    ['eu','Caribbean North',-81.80,10.20,'panzer_frosch_ii',5],
    ['eu','Caribbean East',-78.52,10.50,'panzer_frosch_ii',4],
    ['eu','Pacific West',-82.05,7.35,'panzer_frosch_ii',5],
    ['eu','Pacific East',-79.35,7.38,'panzer_frosch_ii',4],
    ['britannia','Colon',null,null,'carrier_battleship',3],
    ['britannia','Portobelo',null,null,'carrier_battleship',2],
    ['britannia','Balboa',null,null,'carrier_battleship',3],
    ['britannia','Bocas del Toro',null,null,'portman_ii',4],
    ['britannia','Colon',null,null,'portman_ii',5],
    ['britannia','Balboa',null,null,'portman_ii',5],
    ['britannia','Puerto Armuelles',null,null,'portman',3]
  ];
  const FUNDING={eu:{credits:840,industry:440,science:78,sakuradite:35},
    britannia:{credits:795,industry:510,science:70,sakuradite:35}};
  const CANAL=[
    [-79.966,9.415],[-79.942,9.353],[-79.917,9.277],
    [-79.920,9.244],[-79.904,9.202],[-79.866,9.169],
    [-79.811,9.170],[-79.764,9.143],[-79.711,9.118],
    [-79.672,9.074],[-79.633,9.034],[-79.610,9.008],
    [-79.584,8.968],[-79.565,8.936],[-79.570,8.855]
  ];
  const BRIDGES=[[-79.639,9.035],[-79.564,8.938]]; // Centennial and Bridge of the Americas
  const MOUNTAINS=[[-82.56,8.78,0.35,.29],[-81.69,8.85,.78,.4],
    [-80.93,8.66,.7,.33],[-79.45,8.8,.62,.31],[-77.89,8.49,.66,.36]];
  const JUNGLE=[[-82.55,9.16,.78,.34],[-81.22,8.65,1.2,.55],
    [-79.92,9.43,.82,.55],[-78.72,8.77,.98,.61],[-77.7,8.48,.65,.8]];
  const PLAINS=[[-80.5,8.17,.60,.46],[-80.12,8.7,.45,.36],
    [-79.49,8.99,.48,.32],[-82.5,8.32,.46,.32]];
  function geo(c,r){return {lon:BOUNDS.west+(c+.5+.5*(r&1))*(BOUNDS.east-BOUNDS.west)/COLS,
    lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-1.6*((p.lon-x)**2/w**2+(p.lat-y)**2/h**2))));}
  function landscape(p){
    const m=density(p,MOUNTAINS),j=density(p,JUNGLE),low=density(p,PLAINS);
    return m>.59?'mountain':j>.40||m>.30&&low<.4?'forest':'plains';
  }
  function nearest(g,p,valid,radius=12){
    let best=null,dist=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
        const t=E.tile(g,c,r);if(!t||!valid(t))continue;
        const d=E.distance(p,t,g);if(d<dist){dist=d;best=t;}
      }
    return best;
  }
  function paintCanal(g){
    // Link locks and lakes over actual geographic centre-line, never carve
    // an arbitrary shortcut through the Darién, Chiriquí or the mountains.
    const route=[],used=new Set();
    for(let i=1;i<CANAL.length;i++){
      const target=locate(...CANAL[i]);
      let here=E.tile(g,...[locate(...CANAL[i-1]).c,locate(...CANAL[i-1]).r]);
      let count=0;
      while(E.distance(here,target,g)>0){
        if(++count>60)throw Error('Panama Canal route is disconnected');
        const next=E.adjacent(g,here).sort((a,b)=>
          E.distance(a,target,g)-E.distance(b,target,g))[0];
        here=next;
        const key=E.key(here);
        if(!used.has(key)){used.add(key);route.push(here);}
      }
    }
    // A ship may sail the entire lock corridor. Land crossing is possible only
    // over the two identified canal bridges, modelled as dual-use coast cells.
    const bridgeTiles=BRIDGES.map(([x,y])=>nearest(g,locate(x,y),
      t=>used.has(E.key(t)),4));
    if(bridgeTiles.some(t=>!t))throw Error('Missing canal bridge tile');
    const bridges=new Set(bridgeTiles.map(E.key));
    for(const t of route){t.terrain=bridges.has(E.key(t))?'coast':'sea';t.owner=null;}
    g.scenario.canal={route:route.map(t=>({c:t.c,r:t.r})),
      bridges:bridgeTiles.map(t=>({c:t.c,r:t.r})),endpoints:[
        locate(-79.966,9.415),locate(-79.57,8.855)]};
    return used;
  }
  function navigable(t){return t&&(t.terrain==='sea'||t.terrain==='coast');}
  function floodWater(g,start){
    const found=new Set([E.key(start)]),q=[start];
    for(let i=0;i<q.length;i++)for(const n of E.adjacent(g,q[i])){
      const k=E.key(n);
      if(navigable(n)&&!found.has(k)){found.add(k);q.push(n);}
    }
    return found;
  }
  function groupOrder(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const gr=g.scenario.groups.find(x=>x.id===id&&x.side===g.player);
    if(!gr)return {ok:false,reason:'Army Group missing'};
    let assigned=0,failed=0;
    for(const id of gr.units){
      const u=E.allUnits(g).find(v=>v.id===id&&v.hp>0&&v.side===g.player);
      if(!u){failed++;continue;}
      const res=E.setGoto(g,u.id,target.c,target.r);
      if(res.ok)assigned++;else failed++;
    }
    if(assigned)gr.destination={c:target.c,r:target.r};
    return {ok:!!assigned,assigned,failed};
  }
  function create(player='eu',difficulty='normal',seed=201719){
    if(!SIDES.includes(player))throw Error('Unsupported Panama side: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'panama',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,eliteDeployed:{},
      arsenal:{eu:0,britannia:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},lineup:{}};
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'eu-panama',key:'panama',title:'Panama Campaign',
      phase:'two-ocean-canal-assault',aiDoctrine:'europe',groups:[],funding:{},
      citylessFunding:['eu'],bounds:BOUNDS,projection:PROJECTION,
      operationalFronts:[
        {name:'Caribbean Canal Entry',attack:'eu',objective:'Colon'},
        {name:'Pacific Canal Exit',attack:'eu',objective:'Balboa'},
        {name:'Western Isthmus',attack:'eu',objective:'David'},
        {name:'Central Reserve',attack:'britannia',objective:'Penonome'},
        {name:'Darien Defense',attack:'britannia',objective:'Chepo'}
      ]};
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(s=>[s,eliteIds.filter(id=>
      !E.ELITE_FORCES[id].scenarioOnly&&E.ELITE_FORCES[id].availableTo.includes(s))]));
    const packed=root.PANAMA_COAST_BITS || (typeof require==='function'?require('./panama-landmask.js'):null);
    if(typeof packed!=='string')throw Error('Missing Panama GSHHG shoreline');
    const raw=typeof atob==='function'?atob(packed):Buffer.from(packed,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/4)throw Error('Invalid Panama coastline coverage');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,land=(raw.charCodeAt(i>>2)>>(6-2*(i&3)))&3;
      return {c,r,owner:null,terrain:land===0?'sea':land===1?'coast':landscape(geo(c,r))};
    });
    paintCanal(g);
    const caribbean=E.tile(g,locate(-79.99,9.72).c,locate(-79.99,9.72).r);
    const pacific=E.tile(g,locate(-79.54,8.56).c,locate(-79.54,8.56).r);
    if(caribbean.terrain!=='sea'||pacific.terrain!=='sea')throw Error('Panama canal sea mouths are blocked');
    const openWater=floodWater(g,caribbean);
    if(!openWater.has(E.key(pacific)))throw Error('Atlantic and Pacific are not connected through the Panama Canal');
    const mainWater=t=>navigable(t)&&openWater.has(E.key(t));
    const cityKeys=new Set();
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const port=Object.hasOwn(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!port||E.adjacent(g,t).some(n=>n.terrain==='sea'&&mainWater(n)))&&
        !cityKeys.has(E.key(t)),11);
      if(!at)throw Error('No valid site for Panama city '+name);
      cityKeys.add(E.key(at));
      const capital=name==='Panama City';
      const shield=fort?(capital?640:485):150+65*tier;
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
        industry:Math.round((capital?25:6*tier)*.55),
        science:Math.round((1+tier)*.55),producedTurn:0});
    }
    const landmass=new Int16Array(g.tiles.length).fill(-1);
    let mass=0;
    for(let i=0;i<g.tiles.length;i++){
      if(g.tiles[i].terrain==='sea'||landmass[i]>=0)continue;
      const queue=[g.tiles[i]];landmass[i]=mass;
      for(let p=0;p<queue.length;p++)for(const n of E.adjacent(g,queue[p])){
        const k=n.r*COLS+n.c;
        if(n.terrain==='sea'||landmass[k]>=0)continue;
        landmass[k]=mass;queue.push(n);
      }
      mass++;
    }
    const citiesOnMass=new Map();
    for(const s of g.stations){
      const id=landmass[s.r*COLS+s.c];
      if(!citiesOnMass.has(id))citiesOnMass.set(id,[]);
      citiesOnMass.get(id).push(s);
    }
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const cities=citiesOnMass.get(landmass[t.r*COLS+t.c])||g.stations;
      const city=cities.slice().sort((a,b)=>E.distance(t,a,g)-E.distance(t,b,g))[0];
      t.owner=city.owner;t.provinceCity=city.id;
    }
    const byName=Object.fromEntries(g.stations.map(s=>[s.name,s]));
    const groupMap=new Map();
    function group(side,name){
      const k=side+':'+name;
      if(!groupMap.has(k)){
        const gr={id:'army-'+groupMap.size,side,name:name+' Command',origin:name,units:[]};
        groupMap.set(k,gr);g.scenario.groups.push(gr);
      }
      return groupMap.get(k);
    }
    for(const [side,name,cls,count,commander,guard] of LAND_GROUPS){
      if(side!=='britannia')continue;
      const s=byName[name];
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),11);
        if(!at)throw Error('No Britannian formation site at '+name);
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        if(guard&&i===0){u.hold={c:s.c,r:s.r,radius:4};u.canalGuard=name;}
        group(side,name).units.push(u.id);
      }
    }
    const occupiedPorts=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=byName[name];
      const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&mainWater(t)&&
        !occupiedPorts.has(E.key(t))).sort((a,b)=>
          E.adjacent(g,b).filter(mainWater).length-E.adjacent(g,a).filter(mainWater).length)[0];
      if(!at)throw Error('No navigable Panama port at '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      occupiedPorts.add(E.key(at));
    }
    const shipsByGroup=new Map();
    for(const [side,name,lon,lat,type,count] of FLEETS){
      const anchor=side==='britannia'?byName[name]:locate(lon,lat);
      if(!E.TYPES[type]?.naval)throw Error('Unknown Panama ship '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,anchor,t=>t.terrain==='sea'&&mainWater(t)&&
          !E.unitAt(g,t)&&!occupiedPorts.has(E.key(t)),17);
        if(!at)throw Error('No naval position at '+name);
        const ship=E.newUnit(g,type,side,at.c,at.r);
        ship.invasionGroup=side==='eu'?name:null;
        fleet.units.push(ship.id);
        if(side==='eu'&&E.TYPES[type].naval==='ship'){
          if(!shipsByGroup.has(name))shipsByGroup.set(name,[]);
          shipsByGroup.get(name).push(ship);
        }
      }
      g.scenario.groups.push(fleet);
    }
    const passengers=[];
    for(const [side,name,cls,count,commander] of LAND_GROUPS){
      if(side!=='eu')continue;
      for(let i=0;i<count;i++){
        const ship=(shipsByGroup.get(name)||[]).find(v=>
          (v.pendingPassengers||0)<E.TYPES[v.type].capacity);
        if(!ship)throw Error('Insufficient invasion carrier berths for '+name);
        ship.pendingPassengers=(ship.pendingPassengers||0)+1;
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,ship.c,ship.r,i===0?3:2,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group(side,name).units.push(u.id);
        passengers.push({ship,u});
      }
    }
    if(difficulty==='elite'){
      // Scenario-local Elite conversion. Does not modify Conquest or other scenarios.
      const usage=new Map();
      for(const u of g.units){
        const old=E.TYPES[u.type];
        if(old.naval==='ship')continue;
        const roster=g.scenario.eliteRosters[u.side];
        const candidates=roster.filter(id=>E.TYPES[E.ELITE_FORCES[id].type]?.naval?
          E.TYPES[E.ELITE_FORCES[id].type].naval===old.naval:
          !old.naval&&E.TYPES[E.ELITE_FORCES[id].type].cls===old.cls);
        const landPool=roster.filter(id=>!E.TYPES[E.ELITE_FORCES[id].type]?.naval);
        const pool=candidates.length?candidates:landPool;
        if(!pool.length)continue;
        const index=usage.get(u.side+old.cls)||0;
        const id=pool[index%pool.length];usage.set(u.side+old.cls,index+1);
        u.type=E.ELITE_FORCES[id].type;u.elite=id;u.eliteLevel=u.side===player?1:u.cmd?5:3;
        u.stack=1;u.eliteStart=true;
        if(u.cmd&&u.side!==player){
          g.officers[u.cmd].rank=E.RANKS.length-1;u.cmdRank=E.RANKS.length-1;
        }
        u.hp=E.maxHP(u);
      }
      for(const s of g.stations)s.tier=Math.max(s.tier,2);
      for(const side of SIDES.filter(s=>s!==player))g.tech[side]=Object.fromEntries(
        Object.keys(E.TECH_NODES).map(k=>[k,4]));
    }
    for(const {ship,u} of passengers){(ship.cargo||=[]).push(u);g.units.splice(g.units.indexOf(u),1);}
    for(const list of shipsByGroup.values())for(const ship of list)delete ship.pendingPassengers;
    if(difficulty==='hard'||difficulty==='challenge'){
      for(const side of SIDES.filter(s=>s!==player))
        for(const [i,u] of E.allUnits(g).filter(v=>v.side===side&&!v.elite&&E.TYPES[v.type].naval!=='ship').entries())
          if(difficulty==='challenge'||i%2===0){
            u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);
          }
    }
    for(const side of SIDES){
      const factor=side===player?1:['challenge','elite'].includes(difficulty)?1.6:
        difficulty==='hard'?1.3:1;
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([k,v])=>[k,Math.round(v*factor)-base[k]]));
      const actual=E.income(g,side);
      for(const k of Object.keys(FUNDING[side]))
        g.economy[side][k]=actual[k]*(side==='eu'?3:2);
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,E.allUnits(g).filter(u=>u.side===s).length]));
    if(g.stations.some(s=>s.owner==='eu'))throw Error('E.U. must begin Panama with no cities');
    E.log(g,'Europia United launches simultaneous Caribbean and Pacific carrier assaults. Capture the canal and every Britannian city.',player);
    return g;
  }
  function onTurn(g){
    if(g.scenario?.id!=='eu-panama')return false;
    // Canal guards are ordered to hold while Britannia controls their sector.
    // Once a bridgehead falls, survivors join the dynamic multi-front AI
    // rather than guarding lost locks indefinitely.
    for(const u of g.units){
      if(u.side!=='britannia'||!u.canalGuard)continue;
      const city=g.stations.find(s=>s.name===u.canalGuard);
      if(!city||city.owner!=='britannia'){delete u.hold;delete u.canalGuard;}
    }
    return false;
  }
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((v,s)=>v+s.tier,0);
  }
  function objective(g,side=g.player){
    const captured=g.stations.filter(s=>s.owner===side).length;
    return (side==='eu'?'Secure the canal, then conquer':'Defend the canal and hold')+
      ' all '+CITIES.length+' Panama cities ('+captured+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='eu-panama'||g.stations.length!==CITIES.length)return null;
    if(g.stations.every(s=>s.owner==='eu'))
      return {winner:'eu',team:'eu',reason:'Europia United has seized the Panama Canal and every Britannian city.'};
    if(g.stations.every(s=>s.owner==='britannia')&&!E.allUnits(g).some(u=>u.side==='eu'&&u.hp>0))
      return {winner:'britannia',team:'britannia',reason:'Britannia has annihilated the Europian invasion fleets.'};
    return null;
  }
  const api={id:'eu-panama',title:'Panama Campaign',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:LAND_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,
    orderGroup:groupOrder};
  E.scenarios={...(E.scenarios||{}),panama:api,
    byId:{...(E.scenarios?.byId||{}),'eu-panama':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

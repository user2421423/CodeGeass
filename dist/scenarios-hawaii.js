/* Invasion of Hawaii — Chinese Federation expedition against Britannia.
   GSHHG intermediate-resolution coastline, 176x114 WGS84 sampling:
   <20% land = sea, 20–80% = mixed coast, >80% = land.
   Hawaiʻi, Maui, Kahoʻolawe, Lānaʻi, Molokaʻi, Oʻahu, Kauaʻi and Niʻihau
   remain separate, independently accessible islands. */
(function(root) {
  'use strict';
  const E = root.Knightmare || (typeof require === 'function' ? require('./engine.js') : null);
  const COLS=176,ROWS=114,SIDES=['cf','britannia'];
  const BOUNDS={west:-160.75,east:-154.55,north:22.45,south:18.75};
  const K=Math.cos(20.6*Math.PI/180);
  const PROJECTION={centerLon:-157.65,centerLat:20.6,angle:0,uMin:-3.1*K,uMax:3.1*K,vMin:-1.85,vMax:1.85};
  // Rows store only non-ocean hexes: [base36 column, terrain (1=coast,
  // 2=land), base36 run length]. Source was GSHHG intermediate via Basemap,
  // 37 point samples per geographic hex; coast uses the 20–80% rule.
  const COAST_RLE=';;;;;;12.1.1;v.1.1,w.2.2,y.1.1,z.2.4,13.1.1;u.1.1,v.2.a;s.1.1,t.2.c;s.1.1,t.2.c;r.1.1,s.2.c;r.1.1,s.2.c;r.2.c,13.1.1;i.2.1,j.1.1,s.1.1,t.2.b;g.1.1,h.2.1,i.1.1,u.1.1,v.2.8,13.1.1;f.1.1,g.2.3,v.1.1,w.2.6,12.1.1;e.2.3,h.1.1,x.1.3,10.2.1;e.1.1,f.2.1,g.1.1;e.2.1,f.1.1;f.1.1;;26.1.1;24.1.1,25.2.2;24.1.1,25.2.3,28.1.1;23.2.5;22.1.1,23.2.6;1y.1.1,1z.2.a,29.1.1;1z.1.1,20.2.a,2a.1.1;1z.2.b;20.1.1,21.2.a,2c.1.2;20.1.1,21.2.a,2b.1.1,2c.2.1;21.1.1,22.2.c;21.1.1,22.2.3,25.1.2,27.2.7;22.1.1,23.2.3,26.1.1,27.2.8;22.1.2,29.1.1,2a.2.5;2b.1.2,2e.1.1;;2r.2.2,2t.1.3,2z.1.1;2q.1.1,2r.2.9,30.1.3,33.2.2,35.1.1;2q.2.g;2p.1.1,2q.2.3,2t.1.3,2w.2.9;2z.1.2,31.2.2,33.1.1;39.1.1;38.2.3,3b.1.1;37.2.4,3b.1.1;37.2.5,3c.1.1,3g.1.4;2w.1.1,2x.2.4,31.1.1,36.1.1,37.2.5,3c.1.2,3e.2.6,3k.1.1;2x.2.5,32.1.1,37.1.1,38.2.e;2y.2.5,37.1.1,38.2.f;2y.1.1,2z.2.5,39.1.1,3a.2.f,3p.1.1;2y.2.5,3a.1.1,3d.2.d,3q.1.1;2z.1.1,30.2.1,31.1.2,3e.2.d;3d.1.1,3e.2.c,3q.1.1;3e.2.c,3q.1.1;3d.1.1,3e.2.9,3n.1.2;3e.2.6,3k.1.1,3m.1.1;38.1.1,39.2.2,3e.1.4;37.1.1,38.2.3,3b.1.1;36.1.5;;;;;;;;3t.1.1,3u.2.1,3v.1.1;3t.1.1,3u.2.4;3t.2.5,3y.1.1;3t.1.1,3u.2.6,40.1.1;3t.1.1,3u.2.7,41.1.3;3u.1.1,3v.2.b,46.1.1;3u.1.1,3v.2.d;3v.1.1,3w.2.e,4a.1.1;3v.2.g,4b.1.1;3v.2.i,4d.1.1;3t.1.1,3u.2.k;3t.1.1,3u.2.l,4f.1.1;3s.1.1,3t.2.n;3r.2.q;3p.1.1,3q.2.q,4g.1.1;3p.1.1,3q.2.r;3o.1.1,3p.2.r,4g.1.3;3p.1.1,3q.2.t,4j.1.1;3p.1.1,3q.2.t,4j.1.1;3q.1.1,3r.2.t;3r.2.t,4k.1.1;3r.1.1,3s.2.t,4l.1.1;3r.1.1,3s.2.u,4m.1.1;3s.2.w,4o.1.1;3s.1.1,3t.2.u,4n.1.1;3t.2.u,4n.1.1;3t.2.s,4l.1.1;3t.1.1,3u.2.r;3t.1.1,3u.2.p,4j.1.1;3u.2.n,4h.1.1;3t.2.m,4f.1.1;3t.1.1,3u.2.g,4a.1.1,4d.1.1;3t.2.f,48.1.1;3t.1.1,3u.2.e;3s.1.1,3t.2.d,46.1.1;3t.2.b,44.1.1;3t.2.a,43.1.1;3u.2.9,43.1.1;3u.1.1,3v.2.7,42.1.1;3x.1.1,3y.2.4,42.1.1;3y.1.1,3z.2.2;3z.1.2;;;;;';
  function coastMask(){
    const cells=new Uint8Array(COLS*ROWS);
    const rows=COAST_RLE.split(';');
    if(rows.length!==ROWS)throw Error('Hawaii coastline mask row count '+rows.length);
    rows.forEach((row,r)=>{if(!row)return;for(const run of row.split(',')){
      const [a,b,n]=run.split('.');
      const c=parseInt(a,36),len=parseInt(n,36),v=Number(b);
      if(!Number.isInteger(c)||!Number.isInteger(len)||!len||c+len>COLS||![1,2].includes(v))
        throw Error('Invalid Hawaii coast run '+run);
      for(let x=c;x<c+len;x++)cells[r*COLS+x]=v;
    }});
    return cells;
  }
  // [name, longitude, latitude, tier, fortified, island, airfield]
  const CITIES=[
    ['Honolulu',-157.8583,21.3099,3,true,'oahu',false],
    ['Pearl Harbor',-157.975,21.36,3,true,'oahu',false],
    ['Hickam Air Base',-157.926,21.326,2,true,'oahu',true],
    ['Kaneohe Air Station',-157.797,21.45,2,true,'oahu',true],
    ['Wheeler Army Airfield',-158.038,21.48,2,true,'oahu',true],
    ['Haleiwa',-158.107,21.597,1,false,'oahu',false],
    ['Kapolei',-158.08,21.335,2,true,'oahu',false],
    ['Lihue',-159.35,21.975,2,true,'kauai',true],
    ['Port Allen',-159.585,21.9,2,true,'kauai',false],
    ['Hanalei',-159.498,22.203,1,false,'kauai',false],
    ['Kekaha',-159.715,21.969,1,false,'kauai',false],
    ['Puuwai',-160.216,21.896,1,true,'niihau',false],
    ['Kaunakakai',-157.023,21.087,2,true,'molokai',false],
    ['Kalaupapa',-156.985,21.187,1,false,'molokai',false],
    ['Lanai City',-156.922,20.826,2,true,'lanai',false],
    ['Manele Bay',-156.885,20.742,1,false,'lanai',false],
    ['Kahului',-156.472,20.892,3,true,'maui',true],
    ['Lahaina',-156.684,20.879,2,true,'maui',false],
    ['Kihei',-156.461,20.764,1,false,'maui',false],
    ['Hana',-155.991,20.757,1,true,'maui',false],
    ['Kahoolawe Range',-156.603,20.55,1,true,'kahoolawe',false],
    ['Hilo',-155.09,19.729,3,true,'hawaii',true],
    ['Kailua-Kona',-155.996,19.641,2,true,'hawaii',true],
    ['Waimea',-155.667,20.024,2,true,'hawaii',false],
    ['Kawaihae',-155.827,20.042,2,true,'hawaii',false],
    ['Honokaa',-155.467,20.077,1,false,'hawaii',false],
    ['Pahoa',-154.944,19.497,1,false,'hawaii',false],
    ['Volcano',-155.233,19.431,2,true,'hawaii',false],
    ['Naalehu',-155.582,19.062,1,false,'hawaii',false],
    ['Hawi',-155.835,20.24,1,false,'hawaii',false]
  ];
  const PORTS={'Pearl Harbor':3,'Honolulu':3,'Lihue':2,'Port Allen':2,
    'Puuwai':1,'Kaunakakai':2,'Manele Bay':1,'Kahului':3,'Lahaina':2,
    'Hana':2,'Kahoolawe Range':1,'Hilo':3,'Kailua-Kona':3,'Kawaihae':2};
  // Chinese Federation carrier groups arrive from the western Pacific; no Chinese city at start.
  // [group, lon, lat, carrier count, amphibious count, land formations]
  const LANDINGS=[
    ['Kauai Task Force',-160.42,22.22,4,4,[['heavy',2,'sawasaki'],['rocket',2,'honggu'],['assault',2,'cao'],['siege',1,null]]],
    ['Oahu Assault',-158.55,21.74,5,4,[['heavy',2,'xingke'],['siege',2,'rakshata'],['medium',2,'meiling'],['rocket',2,null]]],
    ['Maui Expedition',-156.95,20.32,4,4,[['heavy',2,'leifeng'],['rocket',2,'huangqian'],['medium',2,null],['assault',1,'xianglin']]],
    // Approach the Big Island from the west rather than the eastern Pacific.
    ['Hawaii Western Landing',-156.28,19.55,5,5,[['heavy',2,'zhaohao'],['siege',2,null],['rocket',2,null],['assault',2,'lifeng']]]
  ];
  // Naval strongpoints and mobile island defenses; all standard roster units.
  const DEFENDERS=[
    ['Pearl Harbor','heavy',3,'suzaku'],['Pearl Harbor','siege',2,'cecile'],
    ['Honolulu','super',2,'cornelia'],['Honolulu','rocket',2,null],
    ['Hickam Air Base','heavy',2,'bismarck'],['Kaneohe Air Station','rocket',2,'guilford'],
    ['Wheeler Army Airfield','heavy',2,'gino'],['Kapolei','medium',2,null],
    ['Lihue','heavy',2,'jeremiah'],['Lihue','rocket',2,'darlton'],
    ['Port Allen','medium',2,'villetta'],['Kekaha','medium',1,null],
    ['Puuwai','medium',2,null],['Kaunakakai','heavy',2,'oldrin'],
    ['Kaunakakai','rocket',1,null],['Lanai City','medium',2,null],
    ['Kahului','heavy',3,'anya'],['Kahului','rocket',2,null],
    ['Lahaina','medium',2,null],['Hana','medium',2,null],
    ['Kahoolawe Range','medium',2,null],['Hilo','heavy',3,null],
    ['Hilo','siege',2,null],['Kailua-Kona','rocket',2,null],
    ['Waimea','heavy',2,null],['Kawaihae','medium',2,null],
    ['Volcano','heavy',2,null],['Naalehu','medium',2,null]
  ];
  const NAVY=[
    ['Pearl Harbor','carrier_battleship',3],['Pearl Harbor','portman_ii',4],
    ['Lihue','carrier_battleship',2],['Lihue','portman_ii',3],
    ['Kahului','carrier_battleship',2],['Kahului','portman_ii',3],
    ['Hilo','carrier_battleship',2],['Hilo','portman_ii',3],
    ['Kailua-Kona','carrier_battleship',1],['Kailua-Kona','portman_ii',2]
  ];
  const FUNDING={cf:{credits:850,industry:470,science:68,sakuradite:34},
    britannia:{credits:970,industry:540,science:70,sakuradite:39}};
  const MOUNTAINS=[
    [-155.47,19.82,.26,.28],[-155.60,19.48,.32,.33], // Mauna Kea and Mauna Loa
    [-155.28,19.42,.20,.20],[-156.25,20.71,.22,.20], // Kilauea, Haleakala
    [-156.58,20.89,.17,.13],[-159.49,22.06,.19,.17], // West Maui, Kauai
    [-157.99,21.48,.18,.15],[-157.80,21.43,.14,.14] // Waianae, Koolau
  ];
  function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
    lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round((lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function landscape(p){
    let m=0;
    for(const [x,y,dx,dy] of MOUNTAINS)m=Math.max(m,
      Math.exp(-(((p.lon-x)/dx)**2+((p.lat-y)/dy)**2)*1.6));
    return m>.58?'mountain':m>.25?'forest':'plains';
  }
  function nearest(g,origin,predicate,radius=12) {
    const p=origin.c==null?locate(origin.lon,origin.lat):origin;
    let best=null,dist=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!predicate(t))continue;
        const d=E.distance(p,t,g);
        if(d<dist){dist=d;best=t;}
      }
    return best;
  }
  function orderGroup(g,id,target) {
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const gr=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
    if(!gr)return {ok:false,reason:'Unknown task force'};
    let assigned=0,failed=0;
    for(const unitId of gr.units) {
      const u=g.units.find(v=>v.id===unitId&&v.hp>0&&v.side===g.player);
      if(!u)continue;
      const result=E.setGoto(g,u.id,target.c,target.r);
      if(result.ok)assigned++;else failed++;
    }
    if(assigned)gr.destination={c:target.c,r:target.r};
    return {ok:assigned>0,assigned,failed,reason:assigned?'':'No unit can reach destination'};
  }
  function create(player='cf',difficulty='normal',seed=201717){
    if(!SIDES.includes(player))throw Error('Unsupported Hawaii faction '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,
      player,difficulty,mode:'scenario',era:'invasion-hawaii',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},
      officers:Object.fromEntries(Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:{britannia:'britannia',cf:'cf'}};
    for(const side of [...SIDES,'neutral']) {
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'invasion-hawaii',key:'hawaii',title:'Invasion of Hawaii',
      version:1,phase:'cf-pacific-amphibious',aiDoctrine:'europe',
      groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,citylessFunding:['cf'],
      airfields:[],islandNames:['Niihau','Kauai','Oahu','Molokai','Lanai','Maui','Kahoolawe','Hawaii']};
    const elites=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      elites.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&E.ELITE_FORCES[id].availableTo.includes(side))]));
    const mask=coastMask();
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,v=mask[i];
      return {c,r,owner:null,terrain:v===0?'sea':v===1?'coast':landscape(geo(c,r))};
    });
    // Flood-fill physical islands: stations and ownership can never bridge open water.
    const components=new Int16Array(mask.length).fill(-1);
    let componentCount=0;
    for(let i=0;i<mask.length;i++){
      if(!mask[i]||components[i]>=0)continue;
      const q=[g.tiles[i]];components[i]=componentCount;
      for(let k=0;k<q.length;k++)for(const t of E.adjacent(g,q[k])){
        const j=t.r*COLS+t.c;
        if(mask[j]&&components[j]<0){components[j]=componentCount;q.push(t);}
      }
      componentCount++;
    }
    const islandComponent=new Map();
    for(const [name,lon,lat,tier,fort,island,airfield] of CITIES){
      const wanted=islandComponent.get(island);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r)&&
        (wanted==null||components[t.r*COLS+t.c]===wanted)&&
        (!Object.prototype.hasOwnProperty.call(PORTS,name)||
          E.adjacent(g,t).some(n=>n.terrain==='sea')),13);
      if(!at)throw Error('Cannot locate Hawaii city '+name+' on '+island);
      const component=components[at.r*COLS+at.c];
      if(wanted!=null&&component!==wanted)throw Error('City escaped island '+name);
      islandComponent.set(island,component);
      const capital=name==='Honolulu';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      const s={id:g.stations.length,name,c:at.c,r:at.r,owner:'britannia',tier,
        capital,capitalOf:capital?'britannia':null,fort:!!fort,
        gun:fort?name+' Coastal Battery':null,lab:airfield?1:0,refinery:0,
        airfield:!!airfield,island,
        shield,maxShield:shield,income:capital?52:Math.round(12+8*tier),
        industry:capital?28:5+7*tier,science:2+tier,producedTurn:0};
      g.stations.push(s);
      if(airfield)g.scenario.airfields.push(s.id);
    }
    if(islandComponent.size!==8||new Set(islandComponent.values()).size!==8)
      throw Error('Hawaiian island coastline connectivity audit failed');
    const byComponent=new Map();
    for(const s of g.stations){
      const id=components[s.r*COLS+s.c];
      if(!byComponent.has(id))byComponent.set(id,[]);
      byComponent.get(id).push(s);
    }
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const cities=byComponent.get(components[t.r*COLS+t.c]);
      if(!cities?.length)continue;
      const city=cities.reduce((best,v)=>!best||E.distance(t,v,g)<E.distance(t,best,g)?v:best,null);
      t.owner='britannia';t.provinceCity=city.id;
    }
    const portHexes=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&!portHexes.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(t=>t.terrain==='sea').length-
          E.adjacent(g,a).filter(t=>t.terrain==='sea').length)[0];
      if(!at)throw Error('No independent sea port at '+name);
      s.portAt={c:at.c,r:at.r};s.portOwner='britannia';s.portLevel=level;
      portHexes.add(E.key(at));
    }
    const groupIndex=new Map();
    function group(side,name){
      const key=side+':'+name;
      if(!groupIndex.has(key)){
        const v={id:'army-'+groupIndex.size,side,name:name+' Command',origin:name,units:[]};
        groupIndex.set(key,v);g.scenario.groups.push(v);
      }
      return groupIndex.get(key);
    }
    // Defensive formations are on land. Reserve armies can redeploy between islands
    // through the core carrier logistics; no faction or AI rule is overridden.
    for(const [name,cls,count,commander] of DEFENDERS){
      const s=g.stations.find(v=>v.name===name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner==='britannia'&&(!E.stationAt(g,t)||E.stationAt(g,t).owner==='britannia'),12);
        if(!at)throw Error('No defensive tile near '+name);
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor('britannia',cls,g),'britannia',at.c,at.r,i===0?2:1,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group('britannia',name).units.push(u.id);
      }
    }
    const placeFleet=(side,name,point,type,count,mark)=> {
      if(!E.TYPES[type]?.naval)throw Error('Invalid ship '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,point,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !portHexes.has(E.key(t)),16);
        if(!at)throw Error('No sea spawn near '+name);
        const u=E.newUnit(g,type,side,at.c,at.r);
        if(mark)u.invasionGroup=name;
        fleet.units.push(u.id);
      }
      g.scenario.groups.push(fleet);
    };
    for(const [name,lon,lat,carriers,amphibious] of LANDINGS){
      const at=locate(lon,lat);
      placeFleet('cf',name,at,'cf_carrier',carriers,true);
      placeFleet('cf',name+' Amphibious',at,'shui_gun_ru_ii',amphibious,false);
    }
    for(const [name,type,count] of NAVY) {
      const s=g.stations.find(v=>v.name===name);
      placeFleet('britannia',name,s,type,count,false);
    }
    const carriers=g.units.filter(u=>u.side==='cf'&&u.invasionGroup&&E.TYPES[u.type].capacity>0);
    const passengers=[];
    for(const [name,lon,lat,carrierCount,amphibious,formations] of LANDINGS)
      for(const [cls,count,commander] of formations)for(let i=0;i<count;i++){
        const ship=carriers.find(v=>v.invasionGroup===name&&
          (v.pendingPassengers||0)<E.TYPES[v.type].capacity);
        if(!ship)throw Error('Hawaii carrier capacity exceeded for '+name);
        ship.pendingPassengers=(ship.pendingPassengers||0)+1;
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor('cf',cls,g),'cf',ship.c,ship.r,i===0?2:1,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group('cf',name).units.push(u.id);
        passengers.push({ship,u});
      }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const {ship,u} of passengers){(ship.cargo||=[]).push(u);g.units.splice(g.units.indexOf(u),1);}
    for(const ship of carriers)delete ship.pendingPassengers;
    for(const side of SIDES){
      const factor=side===player?1:difficulty==='normal'?1:
        difficulty==='hard'?1.3:1.6;
      const baseline=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([k,v])=>[k,Math.round(v*factor)-baseline[k]]));
      const income=E.income(g,side);
      for(const k of Object.keys(FUNDING[side]))
        g.economy[side][k]=income[k]*(side==='cf'?3:2);
    }
    if(difficulty==='hard'||difficulty==='challenge'){
      for(const side of SIDES.filter(s=>s!==player)){
        let i=0;
        for(const u of g.units.flatMap(v=>[v,...(v.cargo||[])]).filter(v=>
          v.side===side&&E.TYPES[v.type].naval!=='ship')){
          if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
          i++;
        }
      }
    }
    g.startUnits=Object.fromEntries(SIDES.map(side=>[side,g.units.reduce((n,u)=>n+
      (u.side===side?1:0)+(u.cargo||[]).filter(v=>v.side===side).length,0)]));
    E.log(g,'The Chinese Federation launches four carrier-led amphibious assaults from the western Pacific. Conquer all 30 Britannian island bases without a turn limit.',player);
    return g;
  }
  // Let existing engine amphibious, pursuit, port, production and counterattack AI
  // handle each turn, including reinforcements. No scripted round cap.
  function onTurn(){return false;}
  function strategicScore(g,side){return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);}
  function objective(g,side=g.player){
    const remaining=g.stations.filter(s=>s.owner!==side).length;
    return side==='cf'
      ?'Seize all '+CITIES.length+' Hawaiian bases ('+remaining+' Britannian bases remain).'
      :'Repel the Chinese Federation landing forces ('+E.allUnits(g).filter(u=>u.side==='cf'&&u.hp>0).length+' hostile vessels or units remain).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='invasion-hawaii'||g.stations.length!==CITIES.length)return null;
    if(g.stations.every(s=>s.owner==='cf'))
      return {winner:'cf',team:'cf',reason:'The Chinese Federation has conquered every city and island base in Hawaii.'};
    // The invasion is only defeated after both its field forces (including cargo)
    // and every captured island foothold are gone.
    if(!g.stations.some(s=>s.owner==='cf') &&
       !E.allUnits(g).some(u=>u.side==='cf'&&u.hp>0))
      return {winner:'britannia',team:'britannia',reason:'Britannia has eliminated the Chinese Federation expedition and recaptured every island foothold.'};
    return null;
  }
  const api={id:'invasion-hawaii',title:'Invasion of Hawaii',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,ports:PORTS,
    landingData:LANDINGS,defenderData:DEFENDERS,create,onTurn,objective,winner,
    strategicScore,orderGroup};
  api.meta={map:{centreSampled:true},
    elite:true,expeditionSide:'cf',
    text:{
      era:"Hawaiian Islands · Alternate 2017",
      intro:"Following victories in the western Pacific, the Chinese Federation launches four carrier-borne assaults against Britannian Hawaii. China owns no Hawaiian city on turn one; seize all 30 bases.",
      diplomacy:"Britannia controls eight fortified islands, airfields and independently capturable ports. No alliances or turn limit.",
      elite:"Elite Hawaii: eligible transported land formations convert to Elite Forces. Naval carriers and amphibious fleets retain standardized mechanics.",
      focus:{
        cf:"",
        britannia:"Pearl Harbor"
      }
    },
    blurbs:{
      cf:"Lead four Chinese carrier-led amphibious invasions into Britannian Hawaii from the western Pacific. Capture every island base.",
      britannia:"Defend Pearl Harbor, Honolulu and the outer island garrisons. Use naval interception and island reserves to destroy Chinese transports."
    }};
  E.scenarios={...(E.scenarios||{}),hawaii:api,
    byId:{...(E.scenarios?.byId||{}),'invasion-hawaii':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

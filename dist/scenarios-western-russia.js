/* Invasion of St. Petersburg and Moscow: Britannian offensive across western Russia.
   Standalone, north-up regional theatre; all coordinates use real WGS84 city positions.
   The 2017 world atlas/EUROPE_LAND_BITS provides the coastal source; named lakes
   refine inland water. Victory is total city conquest, without a turn deadline. */
(function(root){
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const ID='britannia-western-russia', SIDES=['britannia','eu'];
  const COLS=128, ROWS=88;
  const BOUNDS={west:27,east:52,north:63.25,south:51.5};
  const K=Math.cos(57.375*Math.PI/180);
  const PROJECTION={centerLon:39.5,centerLat:57.375,angle:0,
    uMin:-12.5*K,uMax:12.5*K,vMin:-5.875,vMax:5.875};
  // [name,longitude,latitude,controller,factory tier,fortified]
  // The eastern Volga foothold represents the preceding Urals campaign.
  const CITIES=[
    ['Moscow',37.6173,55.7558,'eu',3,true],
    ['St. Petersburg',30.3159,59.9343,'eu',3,true],
    ['Smolensk',32.0453,54.7826,'eu',2,true],
    ['Tver',35.9119,56.8587,'eu',2,true],
    ['Veliky Novgorod',31.2758,58.5215,'eu',2,true],
    ['Nizhny Novgorod',44.002,56.3287,'eu',3,true],
    ['Pskov',28.3345,57.8194,'eu',2,true],
    ['Bryansk',34.3668,53.2436,'eu',2,false],
    ['Kaluga',36.2612,54.5138,'eu',2,false],
    ['Tula',37.6173,54.1931,'eu',2,true],
    ['Vladimir',40.3966,56.1291,'eu',2,true],
    ['Ryazan',39.7231,54.6292,'eu',2,true],
    ['Yaroslavl',39.8938,57.6261,'eu',2,true],
    ['Kostroma',40.9269,57.7679,'eu',2,false],
    ['Ivanovo',40.9739,56.9994,'eu',2,false],
    ['Rybinsk',38.8354,58.0485,'eu',2,false],
    ['Vologda',39.8915,59.2205,'eu',2,false],
    ['Cherepovets',37.9086,59.1277,'eu',2,false],
    ['Velikiye Luki',30.5452,56.3427,'eu',2,false],
    ['Torzhok',34.9622,57.0413,'eu',1,false],
    ['Vyazma',34.2984,55.2116,'eu',2,true],
    ['Rzhev',34.3282,56.2629,'eu',1,false],
    ['Serpukhov',37.4125,54.9136,'eu',1,false],
    ['Kolomna',38.7784,55.0794,'eu',2,false],
    ['Klin',36.7287,56.3317,'eu',1,false],
    ['Vyborg',28.752,60.708,'eu',2,true],
    ['Petrozavodsk',34.3496,61.7849,'eu',2,true],
    ['Shuya',41.3883,56.8545,'eu',1,false],
    ['Arzamas',43.8157,55.3866,'eu',2,false],
    ['Murom',42.0464,55.575,'eu',2,false],
    ['Kazan',49.1064,55.7961,'britannia',3,true],
    ['Kirov',49.668,58.6036,'britannia',3,true],
    ['Cheboksary',47.2519,56.1439,'britannia',2,true],
    ['Yoshkar-Ola',47.8958,56.6328,'britannia',2,false],
    ['Saransk',45.1838,54.1874,'britannia',2,true],
    ['Penza',45.017,53.2007,'britannia',2,false],
    ['Ulyanovsk',48.4026,54.3142,'britannia',2,false],
    ['Alatyr',46.5812,54.8422,'britannia',1,false],
    ['Kotelnich',48.348,58.3034,'britannia',2,false],
    ['Sharya',45.5156,58.3762,'britannia',1,false],
    ['Chistopol',50.6436,55.3723,'britannia',2,false]
  ];
  // Separate route commands are deliberately multi-axis; the engine's
  // existing European strategic AI independently manages city-defense fronts.
  const ARMY_GROUPS=[
    ['britannia','Kazan','heavy',4,'cornelia'],
    ['britannia','Kazan','siege',2,'bismarck'],
    ['britannia','Kazan','rocket',2,'cecile'],
    ['britannia','Cheboksary','assault',4,'guilford'],
    ['britannia','Cheboksary','medium',3,'darlton'],
    ['britannia','Yoshkar-Ola','heavy',3,'suzaku'],
    ['britannia','Yoshkar-Ola','support',2,'jeremiah'],
    ['britannia','Saransk','heavy',4,'gino'],
    ['britannia','Saransk','rocket',2,'oldrin'],
    ['britannia','Saransk','assault',3,'villetta'],
    ['britannia','Penza','medium',3,'kewell'],
    ['britannia','Ulyanovsk','medium',3,null],
    ['britannia','Alatyr','assault',2,null],
    ['britannia','Kirov','heavy',3,null],
    ['britannia','Kirov','siege',2,null],
    ['britannia','Kotelnich','medium',3,null],
    ['britannia','Sharya','raider',2,null],
    ['britannia','Chistopol','support',2,null],
    ['eu','Moscow','heavy',5,'akito'],
    ['eu','Moscow','rocket',3,'yukiya'],
    ['eu','Moscow','support',3,'leila'],
    ['eu','Moscow','siege',2,null],
    ['eu','St. Petersburg','heavy',4,'ayano'],
    ['eu','St. Petersburg','assault',3,'ryo'],
    ['eu','St. Petersburg','rocket',3,'anna'],
    ['eu','St. Petersburg','support',2,null],
    ['eu','Nizhny Novgorod','heavy',4,'smilas'],
    ['eu','Nizhny Novgorod','assault',3,'oscar'],
    ['eu','Nizhny Novgorod','rocket',2,null],
    ['eu','Tver','heavy',3,'fernando'],
    ['eu','Tver','support',2,null],
    ['eu','Vladimir','heavy',3,'olivia'],
    ['eu','Vladimir','rocket',2,null],
    ['eu','Ryazan','medium',3,null],
    ['eu','Tula','assault',3,null],
    ['eu','Yaroslavl','heavy',3,null],
    ['eu','Yaroslavl','support',2,null],
    ['eu','Smolensk','medium',3,null],
    ['eu','Veliky Novgorod','assault',3,null],
    ['eu','Pskov','medium',2,null],
    ['eu','Petrozavodsk','medium',3,null],
    ['eu','Vologda','medium',2,null],
    ['eu','Bryansk','assault',2,null],
    ['eu','Kostroma','medium',2,null],
    ['eu','Kaluga','medium',2,null]
  ];
  const FUNDING={
    britannia:{credits:495,industry:315,science:56,sakuradite:25},
    eu:{credits:625,industry:390,science:66,sakuradite:27}
  };
  // Natural inland-water boundaries, in geographical degrees. These complement
  // the global atlas coastline at the Gulf of Finland (not arbitrary random sea).
  const LAKES=[
    // Ladoga
    [[30.05,60.65],[30.37,60.33],[31.09,60.31],[31.75,60.44],[32.43,60.66],
     [32.88,61.01],[32.74,61.39],[32.27,61.67],[31.83,61.65],[31.2,61.35],[30.48,60.99]],
    // Onega
    [[34.25,61.05],[34.68,60.96],[35.2,61.16],[35.64,61.47],[36.0,61.8],
     [36.2,62.25],[35.83,62.77],[35.3,62.9],[34.92,62.64],[34.98,62.09],[34.56,61.65]],
    // Ilmen
    [[30.91,58.31],[31.05,58.07],[31.49,58.1],[31.71,58.33],[31.48,58.51],[31.09,58.49]],
    // Rybinsk reservoir (local reservoir, not a marine strait)
    [[38.05,58.36],[38.22,58.08],[38.51,58.02],[38.81,58.21],
     [38.89,58.57],[38.64,58.77],[38.31,58.63]]
  ];
  const RIVERS={
    volga:[[46.9,56.13],[45.8,56.26],[44.0,56.33],[42.8,56.2],[41.5,56.25],
      [40.3,56.74],[39.9,57.62],[39.1,57.92],[38.8,58.05]],
    oka:[[44.0,56.3],[42.0,55.6],[40.2,55.0],[39.7,54.63],[38.0,54.9],[36.4,54.65]],
    moscow:[[38.8,55.08],[38.2,55.5],[37.62,55.76],[36.8,55.7]],
    neva:[[30.16,59.96],[30.45,59.97],[30.7,60.05]],
    volkhov:[[31.32,58.52],[31.31,59.0],[31.34,59.5],[31.52,60.15]],
    dnieper:[[35.9,55.9],[34.8,55.5],[32.05,54.78],[31.9,53.9]]
  };
  const FORESTS=[[30.8,58,3.5,2],[33.3,60.7,4.6,2.2],[38.7,60.0,5,2.4],
    [43.7,59.0,5.5,3],[34,55.9,3.2,2.4]];
  function geo(c,r){
    return {lon:PROJECTION.centerLon+
      (PROJECTION.uMin+(c+.5*(r&1))*(PROJECTION.uMax-PROJECTION.uMin)/(COLS-1))/K,
      lat:PROJECTION.centerLat+PROJECTION.vMax-
        r*(PROJECTION.vMax-PROJECTION.vMin)/(ROWS-1)};
  }
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round(
      (PROJECTION.centerLat+PROJECTION.vMax-lat)*(ROWS-1)/(PROJECTION.vMax-PROJECTION.vMin))));
    const c=Math.max(0,Math.min(COLS-1,Math.round(
      ((lon-PROJECTION.centerLon)*K-PROJECTION.uMin)*(COLS-1)/
      (PROJECTION.uMax-PROJECTION.uMin)-.5*(r&1))));
    return {c,r};
  }
  function pointInPolygon(lon,lat,vertices){
    let yes=false;
    for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
      const a=vertices[i],b=vertices[j];
      if((a[1]>lat)!==(b[1]>lat) &&
        lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])yes=!yes;
    }
    return yes;
  }
  function sourceLandAt(lon,lat,raw){
    // The 120x80 European GSHHG mask covers [-13,47] longitude and [34,72]
    // latitude. Beyond its east edge this theatre is continuous Russian land.
    if(lon>46.75)return true;
    const c=Math.round((lon+13)*120/60-.5),
      r=Math.round((72-lat)*80/38-.5);
    if(c<0||c>=120||r<0||r>=80)return true;
    return !!(raw.charCodeAt((r*120+c)>>3)&(128>>((r*120+c)&7)));
  }
  function waterAt(lon,lat,raw){
    return !sourceLandAt(lon,lat,raw)||
      LAKES.some(poly=>pointInPolygon(lon,lat,poly));
  }
  function nearest(g,p,valid,radius=12){
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
  function forestDensity(p){
    return Math.max(0,...FORESTS.map(([lon,lat,w,h])=>
      Math.exp(-(((p.lon-lon)/w)**2+((p.lat-lat)/h)**2)*1.6)));
  }
  function landscape(p,c,r){
    const f=forestDensity(p),hash=((c*29+r*19+c*r%13)%43)/43;
    // The western Russian plain is mostly forest and open lowland, not alpine.
    return f>.45||p.lat>60.8&&hash<.74||hash<.12?'forest':'plains';
  }
  // 25 centre/edge samples. The mixed coast rule marks only 20-80% shoreline
  // hexes as amphibious; full land remains dry and water is genuinely navigable.
  const SHORE_SAMPLES=[[0,0]];
  for(const radius of [.42,.84]){
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,edge=Math.PI/3*Math.round(a/(Math.PI/3));
      const extent=Math.cos(Math.PI/6)/Math.cos(a-edge);
      SHORE_SAMPLES.push([radius*extent*Math.cos(a),radius*extent*Math.sin(a)]);
    }
  }
  function coastFraction(p,raw){
    const lonStep=(BOUNDS.east-BOUNDS.west)/(COLS-1),
      latStep=(BOUNDS.north-BOUNDS.south)/(ROWS-1);
    let land=0;
    for(const [x,y] of SHORE_SAMPLES){
      if(!waterAt(p.lon+x*lonStep/Math.sqrt(3),
        p.lat-y*latStep/1.5,raw))land++;
    }
    return land/SHORE_SAMPLES.length;
  }
  function orderGroup(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const gr=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
    if(!gr)return {ok:false,reason:'Army group not found'};
    let assigned=0,failed=0;
    for(const uid of gr.units){
      const u=g.units.find(v=>v.id===uid&&v.hp>0&&v.side===g.player);
      if(!u)continue;
      const result=E.setGoto(g,u.id,target.c,target.r);
      if(result.ok)assigned++;else failed++;
    }
    if(assigned)gr.destination={c:target.c,r:target.r};
    return {ok:assigned>0,assigned,failed,reason:assigned?'':'No reachable formation'};
  }
  function create(player='britannia',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported Western Russia faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},lineup:{}
    };
    for(const s of [...SIDES,'neutral']){
      g.economy[s]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[s]={};
    }
    g.scenario={id:ID,key:'western-russia',
      title:'Invasion of St. Petersburg and Moscow',
      phase:'continental-war',aiDoctrine:'europe',
      groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS};
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    const bits=root.EUROPE_LAND_BITS ||
      (typeof require==='function'?require('./europe-landmask.js'):null);
    // The module sets root.EUROPE_LAND_BITS; require returns an empty exports.
    const packed=typeof bits==='string'?bits:root.EUROPE_LAND_BITS;
    if(!packed)throw Error('Western Russia requires the European geography source mask');
    const raw=typeof atob==='function'?atob(packed):Buffer.from(packed,'base64').toString('latin1');
    if(raw.length!==120*80/8)throw Error('European geography source mask length incorrect');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      return {c,r,owner:null,terrain:waterAt(p.lon,p.lat,raw)?'sea':landscape(p,c,r)};
    });
    for(const t of g.tiles)if(t.terrain!=='sea'){
      if(!E.adjacent(g,t).some(n=>n.terrain==='sea'))continue;
      const frac=coastFraction(geo(t.c,t.r),raw);
      if(frac>=.2&&frac<=.8)t.terrain='coast';
    }
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const at=nearest(g,locate(lon,lat),t=>
        t.terrain!=='sea'&&!g.stations.some(s=>s.c===t.c&&s.r===t.r),10);
      if(!at)throw Error('Western Russia city outside dry grid: '+name);
      const capital=name==='Moscow'||name==='St. Petersburg';
      const shield=capital?680:fort?410:130+65*tier;
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?'eu':null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?55:tier===3?32:12+8*tier)*.55),
        industry:Math.round((capital?30:8*tier)*.55),
        science:Math.round((2+tier)*.55),producedTurn:0});
      if(at.terrain!=='coast')at.terrain='plains';
    }
    // Populate provinces by nearest station on the same connected landmass.
    const comps=new Int16Array(g.tiles.length).fill(-1);let comp=0;
    for(let i=0;i<g.tiles.length;i++){
      if(g.tiles[i].terrain==='sea'||comps[i]>=0)continue;
      const queue=[g.tiles[i]];comps[i]=comp;
      for(let j=0;j<queue.length;j++)for(const n of E.adjacent(g,queue[j])){
        const at=n.r*COLS+n.c;
        if(n.terrain==='sea'||comps[at]>=0)continue;
        comps[at]=comp;queue.push(n);
      }
      comp++;
    }
    const citiesByComponent=new Map();
    for(const s of g.stations){
      const id=comps[s.r*COLS+s.c];
      if(!citiesByComponent.has(id))citiesByComponent.set(id,[]);
      citiesByComponent.get(id).push(s);
    }
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const candidates=citiesByComponent.get(comps[t.r*COLS+t.c])||g.stations;
      let closest=null,d=Infinity;
      for(const s of candidates){
        const z=E.distance(t,s,g);
        if(z<d){d=z;closest=s;}
      }
      t.owner=closest.owner;t.provinceCity=closest.id;
    }
    // Army Group orders remain editable through the existing operations UI.
    const groupMap=new Map();
    function group(side,name){
      const k=side+':'+name;
      if(!groupMap.has(k)){
        const row={id:'army-'+groupMap.size,side,name:name+' Command',
          origin:name,units:[]};
        groupMap.set(k,row);g.scenario.groups.push(row);
      }
      return groupMap.get(k);
    }
    for(const [side,name,cls,count,commander] of ARMY_GROUPS){
      const s=g.stations.find(x=>x.name===name);
      if(!s||s.owner!==side)throw Error('Invalid Western Russia command: '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),11);
        if(!at)throw Error('Cannot place Western Russia formation: '+name);
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,
          i===0?3:2,i===0?commander:null);
        group(side,name).units.push(u.id);
        if(i===0&&commander&&g.officers[commander]){
          u.cmdRank=g.officers[commander].rank;u.hp=E.maxHP(u);
        }
      }
    }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const factor=side===player?1:difficulty==='hard'?1.3:
        ['challenge','elite'].includes(difficulty)?1.6:1;
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(Object.entries(FUNDING[side])
        .map(([res,n])=>[res,Math.round(n*factor)-base[res]]));
      const actual=E.income(g,side);
      for(const res of Object.keys(FUNDING[side]))
        g.economy[side][res]=actual[res]*2;
    }
    if(difficulty==='hard'||difficulty==='challenge'){
      const rivals=g.units.filter(u=>u.side!==player&&!E.TYPES[u.type].naval);
      for(const [i,u] of rivals.entries())if(difficulty==='challenge'||i%2===0){
        u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);
      }
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Britannian Army Groups advance from the Volga into western Russia; Moscow and St. Petersburg anchor the E.U. defense.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Capture all '+CITIES.length+' Western Russian cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+
      ' controlled). Moscow and St. Petersburg are strategic objectives.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' controls every city in western Russia.'};
    return null;
  }
  const api={id:ID,title:'Invasion of St. Petersburg and Moscow',
    cols:COLS,rows:ROWS,sides:SIDES,bounds:BOUNDS,cityData:CITIES,
    armyGroups:ARMY_GROUPS,lakes:LAKES,rivers:RIVERS,
    geographicAt:geo,
    coastFractionAt(c,r){
      const packed=root.EUROPE_LAND_BITS;
      if(!packed)throw Error('Missing European geography mask');
      const raw=typeof atob==='function'?atob(packed):Buffer.from(packed,'base64').toString('latin1');
      return coastFraction(geo(c,r),raw);
    },
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{europeanRegion:true,coastBuffer:1,overlays:['westernRussiaRivers']},
    elite:true,
    text:{
      era:"Western Russia · Alternate 2017",
      intro:"After crossing the Urals, Britannia invades E.U.-controlled western Russia. Capture all 41 cities to win; no turn limit.",
      diplomacy:"Two hostile powers from turn 1. Moscow and St. Petersburg are exceptionally fortified, but neither is invulnerable.",
      elite:"Elite Western Russia: single-frame eligible Elite Forces; AI named commanders begin at Level 5. AI has stronger research and production, while player unlocks follow HQ rules.",
      focus:{
        britannia:"Kazan",
        eu:"Moscow"
      }
    },
    blurbs:{
      britannia:"Advance west from the Volga through three Army Group axes, breach Moscow and St. Petersburg, then conquer all E.U. cities.",
      eu:"Hold Moscow, St. Petersburg, the Upper Volga and the wooded river approaches. Commit reserves to blunt the Britannian offensive."
    }};
  E.scenarios={...(E.scenarios||{}),westernRussia:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

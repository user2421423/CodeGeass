/* Invasion of Korea — Britannian amphibious offensive from Japan, 2017 a.t.b.
 * 184 × 160 geographically sampled Korean Peninsula, Jeju, Tsushima,
 * Kyushu, Shikoku and western Honshu. Separate ports; no scripted turn cap.
 * No shared unit balance, global AI, or World Campaign registry changes. */
(function(root){
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  const COLS=184,ROWS=160,SIDES=['britannia','cf'];
  const BOUNDS={west:123.5,east:137,north:43.5,south:31};
  const K=Math.cos(37.25*Math.PI/180);
  const PROJECTION={centerLon:130.25,centerLat:37.25,angle:0,
    uMin:-6.75*K,uMax:6.75*K,vMin:-6.25,vMax:6.25};
  // Natural Earth admin-0 mask: Chinese/Russian mainland in this viewport is
  // excluded offmap land, never navigable sea. Regenerate with
  // tools/build_korea_foreign_mask.py.
  const FOREIGN_KOREA_LAND=atob('//////////////////////////gAAAD/////////////////////////wAAAAP////////////////////////+AAAAA//////////////////8c/////AAAAAD//////////////////jj////wAAAAAP/////////////////8AP///8AAAAAA//////////////7///gA////AAAAAAD//////////////D//8AD///wAAAAAAP/////////////8D//wAAH/4AAAAAAA//////////////gf/8AAAHgAAAAAAAD/////////////+Af/gAAAAAAAAAAAAP/////////////4A8AAAAAAAAAAAAAA//////////////gA8AAAAAAAAAAAAAD/////////////4ADgAAAAAAAAAAAAAP////////////4AAGAAAAAAAAAAAAAA////////////+AAAAAAAAAAAAAAAAAD////////////8AAAAAAAAAAAAAAAAAP///////////+AAAAAAAAAAAAAAAAAA////////////wAAAAAAAAAAAAAAAAAD/////////+AAAAAAAAAAAAAAAAAAAAP/////////8AAAAAAAAAAAAAAAAAAAA//////////wAAAAAAAAAAAAAAAAAAAD///////j//gAAAAAAAAAAAAAAAAAAAP//////wP//AAAAAAAAAAAAAAAAAAAA///////Af/+AAAAAAAAAAAAAAAAAAAD//////4AP/wAAAAAAAAAAAAAAAAAAAP//////gAADAAAAAAAAAAAAAAAAAAAA//////8AAAAAAAAAAAAAAAAAAAAAAAD//////gAAAAAAAAAAAAAAAAAAAAAAAP/////8AAAAAAAAAAAAAAAAAAAAAAAA//////gAAAAAAAAAAAAAAAAAAAAAAAD/////4AAAAAAAAAAAAAAAAAAAAAAAAP/////gAAAAAAAAAAAAAAAAAAAAAAAA/////gAAAAAAAAAAAAAAAAAAAAAAAAD////8AAAAAAAAAAAAAAAAAAAAAAAAAP///+AAAAAAAAAAAAAAAAAAAAAAAAAA////gAAAAAAAAAAAAAAAAAAAAAAAAAD///wAAAAAAAAAAAAAAAAAAAAAAAAAAP//+AAAAAAAAAAAAAAAAAAAAAAAAAAA//+AAAAAAAAAAAAAAAAAAAAAAAAAAAD//4AAAAAAAAAAAAAAAAAAAAAAAAAAAP/+AAAAAAAAAAAAAAAAAAAAAAAAAAAA//gAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
  const foreignKoreaAt=(c,r)=>{
    const i=r*COLS+c;
    return !!(FOREIGN_KOREA_LAND.charCodeAt(i>>3)&(128>>(i&7)));
  };
  // [city, longitude, latitude, owner, factory tier, fortified].
  // Britannian mainland Japan is staging and reinforcement territory;
  // the Chinese Federation initially controls every Korean city.
  const CITIES=[
    ['Seoul',126.978,37.566,'cf',3,true],
    ['Incheon',126.705,37.456,'cf',3,true],
    ['Suwon',127.008,37.263,'cf',2,true],
    ['Paju',126.780,37.760,'cf',2,true],
    ['Kaesong',126.554,37.971,'cf',3,true],
    ['Cheorwon',127.313,38.148,'cf',2,true],
    ['Chuncheon',127.728,37.882,'cf',2,true],
    ['Wonju',127.944,37.343,'cf',2,false],
    ['Gangneung',128.876,37.751,'cf',2,true],
    ['Sokcho',128.591,38.207,'cf',2,false],
    ['Samcheok',129.165,37.449,'cf',2,false],
    ['Daejeon',127.384,36.351,'cf',3,true],
    ['Cheongju',127.489,36.643,'cf',2,false],
    ['Cheonan',127.152,36.815,'cf',2,false],
    ['Andong',128.729,36.568,'cf',2,true],
    ['Daegu',128.602,35.872,'cf',3,true],
    ['Gimcheon',128.113,36.139,'cf',2,false],
    ['Pohang',129.365,36.019,'cf',2,true],
    ['Ulsan',129.309,35.539,'cf',2,true],
    ['Busan',129.075,35.179,'cf',3,true],
    ['Changwon',128.681,35.228,'cf',2,true],
    ['Jinju',128.084,35.181,'cf',2,false],
    ['Jeonju',127.149,35.824,'cf',2,true],
    ['Gunsan',126.736,35.967,'cf',2,false],
    ['Gwangju',126.852,35.160,'cf',3,true],
    ['Mokpo',126.391,34.812,'cf',2,true],
    ['Yeosu',127.663,34.760,'cf',2,true],
    ['Suncheon',127.491,34.951,'cf',2,false],
    ['Jeju City',126.532,33.500,'cf',2,true],
    ['Seogwipo',126.560,33.254,'cf',2,false],
    ['Pyongyang',125.756,39.030,'cf',3,true],
    ['Nampo',125.403,38.734,'cf',3,true],
    ['Haeju',125.714,38.035,'cf',2,true],
    ['Sariwon',125.755,38.509,'cf',2,true],
    ['Sinuiju',124.403,40.099,'cf',3,true],
    ['Anju',125.665,39.618,'cf',2,true],
    ['Kaechon',125.910,39.698,'cf',2,false],
    ['Kusong',125.170,39.980,'cf',2,true],
    ['Kanggye',126.585,40.968,'cf',2,true],
    ['Hyesan',128.180,41.397,'cf',2,true],
    ['Wonsan',127.445,39.155,'cf',3,true],
    ['Hamhung',127.536,39.919,'cf',3,true],
    ['Kimchaek',129.200,40.670,'cf',2,true],
    ['Kilju',129.330,40.960,'cf',2,false],
    ['Chongjin',129.753,41.795,'cf',3,true],
    ['Rason',130.400,42.339,'cf',2,true],
    ['Fukuoka',130.402,33.590,'britannia',3,true],
    ['Sasebo',129.716,33.160,'britannia',3,true],
    ['Nagasaki',129.877,32.750,'britannia',2,true],
    ['Kitakyushu',130.875,33.883,'britannia',3,true],
    // Slightly east within the Shimonoseki harbour district so its navigable
    // port hex remains independent from Kitakyushu across the Kanmon Strait.
    ['Shimonoseki',130.985,34.008,'britannia',2,true],
    ['Hiroshima',132.455,34.386,'britannia',3,true],
    ['Iwakuni',132.218,34.167,'britannia',2,true],
    ['Matsuyama',132.766,33.840,'britannia',2,true],
    ['Maizuru',135.330,35.470,'britannia',3,true]
  ];
  // Harbours are deliberately separate capturable water hexes, not city tiles.
  const PORTS={
    'Incheon':3,'Gangneung':2,'Sokcho':2,'Samcheok':1,'Pohang':2,
    'Ulsan':2,'Busan':3,'Gunsan':2,'Mokpo':2,'Yeosu':2,
    'Jeju City':2,'Seogwipo':2,'Nampo':3,'Haeju':2,
    'Wonsan':3,'Hamhung':2,'Kimchaek':2,'Chongjin':3,'Rason':2,
    'Fukuoka':3,'Sasebo':3,'Nagasaki':2,'Kitakyushu':3,
    'Shimonoseki':2,'Hiroshima':3,'Iwakuni':2,'Matsuyama':2,'Maizuru':3
  };
  // Peninsular mountain ranges, with the western Seoul-Pyongyang corridor,
  // eastern coastal route and southeast Nakdong plain intentionally kept open.
  const HIGHLANDS=[
    [128.18,38.12,.54,1.05], // Taebaek Range
    [128.62,37.12,.58,.70],
    [128.00,36.65,.65,.50], // Sobaek Range
    [127.68,35.94,.52,.51],
    [127.35,40.35,.78,.72], // northern Kaema plateau
    [128.04,41.26,.91,.65],
    [128.51,40.48,.52,.68],
    [126.69,39.99,.40,.49],
    [126.91,38.55,.36,.33],
    [129.12,41.70,.48,.42]
  ];
  const WOODS=[
    [127.75,38.25,.85,.78],[127.75,36.40,1.25,1.15],
    [127.05,40.41,1.15,1.05],[128.80,41.10,.95,.95],
    [126.88,35.50,.68,.55],[128.35,35.28,.56,.38]
  ];
  // Geographic visual rivers (not falsely navigable ocean). The valleys below
  // carry slower forest tiles except at named crossing approaches.
  const RIVERS={
    yalu:[[127.9,41.7],[126.8,41.75],[126.16,40.94],[125.5,40.52],[124.95,40.12],[124.4,40.1],[124.33,39.9]],
    tumen:[[128.1,42.06],[129,42.42],[129.85,42.52],[130.4,42.35],[130.7,42.30]],
    taedong:[[126.35,39.5],[125.9,39.3],[125.76,39.04],[125.43,38.79],[125.2,38.68]],
    imjin:[[127.85,38.18],[127.17,38.02],[126.9,37.96],[126.67,37.82],[126.61,37.68]],
    han:[[128.50,37.73],[127.94,37.57],[127.38,37.54],[126.98,37.54],[126.63,37.58],[126.42,37.65]],
    nakdong:[[128.73,36.65],[128.34,36.26],[128.37,35.86],[128.62,35.50],[128.83,35.21],[128.93,35.13]],
    geum:[[127.90,36.56],[127.35,36.43],[126.98,36.24],[126.68,36.08],[126.59,36.06]],
    yeongsan:[[126.95,35.24],[126.74,35.08],[126.55,34.95],[126.41,34.83]]
  };
  const CROSSINGS=[
    [126.98,37.54,.23],[127.38,37.54,.20],[126.88,37.93,.19],
    [125.76,39.04,.19],[124.43,40.09,.23],[128.35,36.22,.20],
    [128.65,35.27,.23],[127.33,36.42,.19]
  ];
  // Federated defense commands form a layered three-front response.
  // [city, class, count, named commander] -- all units use faction standard types.
  const DEFENSE=[
    ['Incheon','heavy',4,'xingke'],['Incheon','rocket',2,null],
    ['Seoul','super',2,'honggu'],['Seoul','heavy',4,null],
    ['Kaesong','heavy',4,'xianglin'],['Paju','medium',3,null],
    ['Cheorwon','rocket',3,'cao'],['Chuncheon','heavy',3,null],
    ['Gangneung','medium',3,null],['Sokcho','medium',2,null],
    ['Daejeon','heavy',4,'gaohai'],['Cheongju','rocket',2,null],
    ['Daegu','heavy',4,'leifeng'],['Andong','rocket',3,null],
    ['Busan','super',2,'meiling'],['Busan','rocket',3,null],
    ['Ulsan','heavy',3,null],['Pohang','medium',3,null],
    ['Mokpo','heavy',3,'lifeng'],['Gwangju','heavy',3,null],
    ['Jeonju','rocket',3,null],['Gunsan','medium',2,null],
    ['Yeosu','medium',2,null],['Jeju City','heavy',3,null],
    ['Pyongyang','super',3,'zhaohao'],['Pyongyang','rocket',3,null],
    ['Nampo','heavy',4,'ren'],['Haeju','medium',3,null],
    ['Sariwon','heavy',3,null],['Sinuiju','heavy',3,'chengzhong'],
    ['Kanggye','heavy',3,'huangqian'],['Hyesan','rocket',2,null],
    ['Wonsan','heavy',4,'sawasaki'],['Wonsan','rocket',3,null],
    ['Hamhung','heavy',4,null],['Kimchaek','medium',3,null],
    ['Chongjin','heavy',4,null],['Chongjin','rocket',2,null],
    ['Rason','heavy',2,null]
  ];
  const JAPAN_GARRISONS=[
    ['Fukuoka','heavy',2,'cornelia'],['Fukuoka','rocket',1,'cecile'],
    ['Sasebo','heavy',2,'suzaku'],['Sasebo','medium',2,null],
    ['Kitakyushu','heavy',2,'guilford'],
    ['Hiroshima','heavy',2,'bismarck'],['Hiroshima','rocket',2,null],
    ['Maizuru','medium',2,'gino'],['Maizuru','rocket',1,null],
    ['Matsuyama','medium',2,null],['Shimonoseki','assault',2,null],
    ['Nagasaki','medium',1,null],['Iwakuni','medium',1,null]
  ];
  // Five simultaneous amphibious fronts: the Korea Strait, Jeju/Yellow
  // Sea, west-coast industrial corridor, Wonsan, and North-East Korea.
  // Each group stages from a Japanese base, but starts with its transports
  // already at sea. Land forces begin INSIDE their carriers as live cargo.
  // [group name, source base, sea longitude, sea latitude, carriers,
  //  amphibious ships, embarked formations [class,count,commander]]
  const INVASIONS=[
    ['Korea Strait Assault','Fukuoka',129.80,34.50,4,6,
      [['heavy',3,'jeremiah'],['assault',2,'darlton'],['rocket',2,null]]],
    ['Yellow Sea Expedition','Sasebo',125.90,33.65,4,5,
      [['heavy',2,'oldrin'],['medium',2,'villetta'],['siege',2,null]]],
    ['Incheon Strike Force','Nagasaki',125.15,36.85,4,5,
      [['heavy',3,'anya'],['assault',2,null],['rocket',2,null]]],
    ['East Sea Offensive','Maizuru',129.85,37.75,4,6,
      [['heavy',2,null],['siege',2,null],['medium',2,null]]],
    ['Northern Coastal Flank','Hiroshima',130.45,40.05,3,5,
      [['heavy',2,null],['rocket',2,null],['assault',2,null]]]
  ];
  const CHINESE_FLEETS=[
    ['Incheon','cf_carrier',2],['Incheon','shui_gun_ru_ii',3],
    ['Nampo','cf_carrier',2],['Nampo','shui_gun_ru_ii',3],
    ['Busan','cf_carrier',3],['Busan','shui_gun_ru_ii',4],
    ['Jeju City','shui_gun_ru_ii',3],['Yeosu','shui_gun_ru',3],
    ['Wonsan','cf_carrier',2],['Wonsan','shui_gun_ru_ii',3],
    ['Chongjin','cf_carrier',2],['Chongjin','shui_gun_ru_ii',3],
    ['Hamhung','shui_gun_ru',2],['Rason','shui_gun_ru_ii',2]
  ];
  const FUNDING={
    britannia:{credits:980,industry:570,science:70,sakuradite:48},
    cf:{credits:960,industry:580,science:70,sakuradite:47}
  };
  function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
    lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round(
      (BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function nearest(g,point,valid,radius=13){
    const p=point.c==null?locate(point.lon,point.lat):point;
    let found=null,best=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(ROWS-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(COLS-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!valid(t))continue;
        const d=E.distance(p,t,g);
        if(d<best){found=t;best=d;}
      }
    return found;
  }
  function intensity(p,areas){
    let best=0;
    for(const [x,y,w,h] of areas)
      best=Math.max(best,Math.exp(-1.6*(((p.lon-x)/w)**2+((p.lat-y)/h)**2)));
    return best;
  }
  function riverDistance(p) {
    let best=Infinity;
    for(const line of Object.values(RIVERS))
      for(let i=1;i<line.length;i++){
        const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1];
        const k=Math.max(0,Math.min(1,
          ((p.lon-a[0])*dx+(p.lat-a[1])*dy)/(dx*dx+dy*dy||1)));
        best=Math.min(best,Math.hypot((p.lon-a[0]-k*dx)*K,p.lat-a[1]-k*dy));
      }
    return best;
  }
  function landscape(p){
    // Keep coherent, navigable plains near Seoul, western North Korea and
    // the lower Nakdong; forests/plateau impose meaningful movement costs.
    const high=intensity(p,HIGHLANDS),wood=intensity(p,WOODS);
    if(high>.51)return 'mountain';
    if(high>.25||wood>.40)return 'forest';
    if(CROSSINGS.some(([x,y,r])=>Math.hypot((p.lon-x)*K,p.lat-y)<r))return 'plains';
    return riverDistance(p)<.072?'forest':'plains';
  }
  function decode(bits){
    return typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
  }
  function orderGroup(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const group=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
    if(!group)return {ok:false,reason:'Unknown Army Group'};
    const ordered=new Set();
    let assigned=0,failed=0;
    const goal=E.tile(g,target.c,target.r);
    if(!goal)return {ok:false,reason:'Outside the theatre'};
    for(const unitId of group.units){
      let u=g.units.find(v=>v.id===unitId&&v.hp>0&&v.side===g.player);
      // An embarked Army Group is controlled by the transports carrying it.
      // Group IDs stay tied to the actual land formations after deployment.
      if(!u)u=g.units.find(v=>v.hp>0&&v.side===g.player&&
        (v.cargo||[]).some(c=>c.id===unitId&&c.hp>0));
      if(!u||ordered.has(u.id))continue;
      ordered.add(u.id);
      const ship=E.TYPES[u.type].naval==='ship';
      // Warships cannot receive a standing order to an inland tile. Route
      // the carriers to an accessible coastal approach to the chosen objective.
      const dest=ship&&goal.terrain!=='sea'&&goal.terrain!=='coast'
        ?nearest(g,goal,t=>t.terrain==='sea',12):goal;
      if(!dest){failed++;continue;}
      const res=E.setGoto(g,u.id,dest.c,dest.r);
      if(res.ok)assigned++;else failed++;
    }
    if(assigned)group.destination={c:target.c,r:target.r};
    return {ok:assigned>0,assigned,failed,
      reason:assigned?'':'No operational Army Group formation can reach the destination'};
  }
  function create(player='britannia',difficulty='normal',seed=201718){
    if(!SIDES.includes(player))throw Error('Unsupported Invasion of Korea side '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,
      player,difficulty,mode:'scenario',era:'invasion-korea',
      order:[player,...SIDES.filter(s=>s!==player)],seed,wrap:false,
      cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},lineup:{}};
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[side]={};
    }
    g.scenario={id:'invasion-korea',key:'korea',title:'Invasion of Korea',version:1,
      phase:'peninsular-amphibious-war',aiDoctrine:'europe',
      groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
      rivers:RIVERS,crossings:CROSSINGS,landingFronts:INVASIONS.map(x=>x[0])};
    const elites=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      elites.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    const geography=root.KOREA_GEOGRAPHY||(typeof require==='function'?
      require('./korea-landmask.js'):null);
    if(!geography||geography.cols!==COLS||geography.rows!==ROWS)
      throw Error('Korean 20–80 coastline geometry missing or incompatible');
    const raw=decode(geography.land),coast=decode(geography.mixed);
    if(raw.length!==COLS*ROWS/8||coast.length!==raw.length)
      throw Error('Corrupt Korean shoreline');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const land=!!(raw.charCodeAt(i>>3)&(128>>(i&7)));
      const mixed=!!(coast.charCodeAt(i>>3)&(128>>(i&7)));
      if(mixed&&!land)throw Error('Korean coast outside land mask');
      return {c,r,owner:null,terrain:land?(mixed?'coast':landscape(p)):foreignKoreaAt(c,r)?'offmap':'sea'};
    });
    // Landmask boundaries come from 37-point geographic sampling; the
    // coastline is never guessed by proximity to a city's port.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const port=Object.prototype.hasOwnProperty.call(PORTS,name);
      const t=nearest(g,locate(lon,lat),v=>v.terrain!=='sea'&&
        !E.stationAt(g,v)&&(!port||E.adjacent(g,v).some(n=>n.terrain==='sea')),13);
      if(!t)throw Error('No Korean or Japanese city location: '+name);
      const capital=name==='Seoul'||name==='Pyongyang'||name==='Fukuoka';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      g.stations.push({id:g.stations.length,name,c:t.c,r:t.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,income:capital?50:Math.round(12+9*tier),
        industry:capital?27:6+7*tier,science:1+tier,producedTurn:0});
    }
    // Physical land components control province ownership. Japanese territory
    // never jumps the Korea Strait; Jeju remains a separate defended island.
    const components=new Int16Array(g.tiles.length).fill(-1);
    let nextComponent=0;
    for(let i=0;i<g.tiles.length;i++){
      if(g.tiles[i].terrain==='sea'||E.TERRAIN[g.tiles[i].terrain]?.blocked||components[i]>=0)continue;
      const queue=[g.tiles[i]];
      components[i]=nextComponent;
      for(let k=0;k<queue.length;k++)
        for(const n of E.adjacent(g,queue[k])){
          const j=n.r*COLS+n.c;
          if(n.terrain==='sea'||E.TERRAIN[n.terrain]?.blocked||components[j]>=0)continue;
          components[j]=nextComponent;queue.push(n);
        }
      nextComponent++;
    }
    const provinceCities=new Map();
    for(const s of g.stations){
      const component=components[s.r*COLS+s.c];
      if(!provinceCities.has(component))provinceCities.set(component,[]);
      provinceCities.get(component).push(s);
    }
    for(const t of g.tiles)if(t.terrain!=='sea'&&!E.TERRAIN[t.terrain]?.blocked){
      const cities=provinceCities.get(components[t.r*COLS+t.c]);
      if(!cities?.length)continue; // Uninhabited islets are neutral.
      let closest=null,shortest=Infinity;
      for(const s of cities){
        const d=E.distance(t,s,g);
        if(d<shortest){shortest=d;closest=s;}
      }
      t.owner=closest.owner;t.provinceCity=closest.id;
    }
    // Each harbour occupies a unique adjacent navigable sea tile.
    const portHexes=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const water=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&!portHexes.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(n=>n.terrain==='sea').length-
          E.adjacent(g,a).filter(n=>n.terrain==='sea').length)[0];
      if(!water)throw Error('No independent coastal port at '+name);
      s.portAt={c:water.c,r:water.r};s.portOwner=s.owner;s.portLevel=level;
      portHexes.add(E.key(water));
    }
    const groups=new Map();
    function group(side,name,origin=name){
      const key=side+':'+name;
      if(!groups.has(key)){
        const v={id:'army-'+groups.size,side,name,origin,units:[]};
        groups.set(key,v);g.scenario.groups.push(v);
      }
      return groups.get(key);
    }
    function formation(side,name,cls,count,commander){
      const base=g.stations.find(s=>s.name===name&&s.owner===side);
      if(!base)throw Error('Invalid Army Group staging: '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,base,t=>t.terrain!=='sea'&&t.owner===side&&
          !E.unitAt(g,t)&&!E.stationAt(g,t),13);
        if(!at)throw Error('No ground deployment area at '+name);
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group(side,name+' Defense',name).units.push(u.id);
      }
    }
    for(const [name,cls,n,cmd] of DEFENSE)formation('cf',name,cls,n,cmd);
    for(const [name,cls,n,cmd] of JAPAN_GARRISONS)formation('britannia',name,cls,n,cmd);
    function fleet(side,name,point,type,count,tag,origin){
      if(!E.TYPES[type]?.naval)throw Error('Invalid Korea fleet class '+type);
      const gr=group(side,name,origin||name);
      for(let i=0;i<count;i++){
        const at=nearest(g,point,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !portHexes.has(E.key(t)),20);
        if(!at)throw Error('No navigable sea deployment at '+name);
        const u=E.newUnit(g,type,side,at.c,at.r);
        if(tag)u.invasionGroup=tag;
        gr.units.push(u.id);
      }
    }
    for(const [name,base,lon,lat,carriers,amphibious] of INVASIONS){
      const point=locate(lon,lat);
      fleet('britannia',name+' Carrier Group',point,'carrier_battleship',carriers,name,base);
      fleet('britannia',name+' Amphibious Wing',point,'portman_ii',amphibious,name,base);
    }
    for(const [name,type,n] of CHINESE_FLEETS){
      const s=g.stations.find(v=>v.name===name);
      fleet('cf',name+' '+type+' Flotilla',s,type,n,null,name);
    }
    const passengers=[];
    for(const [name,base,lon,lat,carriers,amphibious,units] of INVASIONS)
      for(const [cls,count,commander] of units)for(let i=0;i<count;i++){
        const ship=g.units.find(u=>u.side==='britannia'&&u.invasionGroup===name&&
          E.TYPES[u.type].capacity>0&&
          (u.pendingPassengers||0)<E.TYPES[u.type].capacity);
        if(!ship)throw Error('Insufficient carrier capacity in '+name);
        ship.pendingPassengers=(ship.pendingPassengers||0)+1;
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor('britannia',cls,g),'britannia',ship.c,ship.r,i===0?3:2,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group('britannia',name+' Landing Army',base).units.push(u.id);
        passengers.push({ship,u});
      }
    // Standard regional Elite conversion applies to land, transported land
    // and amphibious frames, while conventional carrier hulls remain intact.
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const {ship,u} of passengers){
      (ship.cargo||=[]).push(u);
      g.units.splice(g.units.indexOf(u),1);
    }
    for(const u of g.units)delete u.pendingPassengers;
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(Object.entries(FUNDING[side])
        .map(([kind,amount])=>[kind,Math.round(amount)-base[kind]]));
      const current=E.income(g,side);
      for(const kind of Object.keys(FUNDING[side]))
        g.economy[side][kind]=current[kind]*(side==='britannia'?3:2);
    }
    if(['hard','challenge'].includes(difficulty)){
      const enemies=g.units.flatMap(u=>[u,...(u.cargo||[])]).filter(u=>
        u.side!==player&&E.TYPES[u.type].naval!=='ship');
      enemies.forEach(u=>E.addDifficultyFrames(u,difficulty));
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(side=>[side,
      g.units.reduce((n,u)=>n+(u.side===side?1:0)+
        (u.cargo||[]).filter(v=>v.side===side).length,0)]));
    E.log(g,'Britannia launches five carrier-led invasions from Japanese bases against the Federation in Korea. Seize every enemy city without a turn limit.',player);
    return g;
  }
  function onTurn(){return false;} // Established regional AI handles both fronts.
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer every enemy city in Korea and the Japanese staging theatre ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='invasion-korea'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,team:side,
        reason:E.FACTIONS[side].name+' has conquered every theatre city.'};
    return null;
  }
  const api={id:'invasion-korea',title:'Invasion of Korea',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,ports:PORTS,rivers:RIVERS,
    invasionData:INVASIONS,defenderData:DEFENSE,create,onTurn,objective,
    winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,land:'korea',overlays:['regionalRivers']},
    groupsStartEmbarked:true,
    elite:true,
    text:{
      era:"Korean Peninsula and Japan · Alternate 2017",
      intro:"Britannia launches five major amphibious fronts from its Japanese bases. The Federation holds all 46 Korean cities; nine Japanese staging cities provide the Britannian supply base. Capture every theatre city to win.",
      diplomacy:"Two hostile powers. Sea routes, separate capturable harbours, dense Korean mountain corridors and major rivers define the battle. No turn limit or scripted alliance.",
      elite:"Elite Korea uses the established faction-specific land and amphibious Elite Forces and upgraded AI commanders. Carriers remain standard naval vessels.",
      focus:{
        britannia:"Fukuoka",
        cf:"Seoul"
      }
    },
    blurbs:{
      britannia:"Lead five simultaneous carrier-led assaults from Japanese bases: Korea Strait, Jeju and the Yellow Sea, Incheon, Wonsan, and the north-east coast. Fight inland through western plains and mountain passes.",
      cf:"Hold Seoul, Pyongyang, Busan and both Korean coasts. Concentrate fortified reserve armies at the Imjin, Han, Nakdong and Yalu lines while your fleets intercept Britannian landings."
    }};
  E.scenarios={...(E.scenarios||{}),korea:api,
    byId:{...(E.scenarios?.byId||{}),'invasion-korea':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

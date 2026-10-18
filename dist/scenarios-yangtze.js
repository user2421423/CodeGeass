/* Battle of the Yangtze River — Britannian crossing offensive against the Chinese Federation.
   Standalone regional battle. Rivers use surveyed WGS84 centre-line anchors (simplified
   between settlements); tactical width is enlarged to keep hex crossings and river fleets playable.
   No global movement, combat, AI or World Campaign registry changes. */
(function(root){
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=196,ROWS=122,SIDES=['britannia','cf'];
  const BOUNDS={west:110.55,east:119.95,north:33.55,south:28.50};
  const K=Math.cos(31.0*Math.PI/180);
  const PROJECTION={centerLon:115.25,centerLat:31.025,angle:0,
    uMin:-4.70*K,uMax:4.70*K,vMin:-2.525,vMax:2.525};
  // City positions are geographical; the imperial occupation and order of battle are fictional.
  // [name, lon, lat, side, level, fortified]. Forward Federation pockets south
  // of the river (Huangshi, Jiujiang, Wuhu) deliberately make the first crossings contested.
  const CITIES=[
    ['Yidu',111.45,30.40,'britannia',2,true],
    ['Songzi',111.77,30.18,'britannia',2],
    ['Jingzhou',112.19,30.35,'britannia',3,true],
    ['Gong’an',112.23,30.05,'britannia',2],
    ['Shishou',112.41,29.73,'britannia',2],
    ['Huarong',112.54,29.53,'britannia',2],
    ['Yueyang',113.12,29.38,'britannia',3,true],
    ['Linxiang',113.45,29.48,'britannia',2],
    ['Chibi',113.88,29.72,'britannia',3,true],
    ['Jiayu',113.94,29.97,'britannia',2],
    ['Xianning',114.32,29.84,'britannia',3,true],
    ['Daye',114.97,30.09,'britannia',3],
    ['Yangxin',115.21,29.83,'britannia',2],
    ['Ruichang',115.68,29.68,'britannia',2,true],
    ['De’an',115.76,29.32,'britannia',2],
    ['Nanchang',115.86,28.68,'britannia',3,true],
    ['Duchang',116.20,29.27,'britannia',2],
    ['Poyang',116.70,29.02,'britannia',2],
    ['Dongzhi',116.99,30.11,'britannia',2],
    ['Chizhou',117.49,30.66,'britannia',3,true],
    ['Xuancheng',118.76,30.94,'britannia',2],
    ['Gaochun',118.88,31.33,'britannia',2],
    ['Dangtu',118.50,31.57,'britannia',2],
    ['Jurong',119.16,31.95,'britannia',3,true],
    ['Lishui',119.03,31.65,'britannia',2],
    ['Yichang',111.29,30.70,'cf',3,true],
    ['Dangyang',111.79,30.82,'cf',2],
    ['Jingmen',112.20,31.03,'cf',3,true],
    ['Qianjiang',112.90,30.40,'cf',2,true],
    ['Tianmen',113.17,30.66,'cf',2],
    ['Xiantao',113.45,30.37,'cf',3,true],
    ['Hanchuan',113.83,30.65,'cf',2],
    ['Wuhan',114.31,30.59,'cf',3,true],
    ['Huanggang',114.87,30.45,'cf',3,true],
    ['Ezhou',114.89,30.39,'cf',2,true],
    ['Huangshi',115.04,30.20,'cf',3,true],
    ['Wuxue',115.55,29.85,'cf',2,true],
    ['Huangmei',115.95,30.10,'cf',2],
    ['Jiujiang',116.00,29.72,'cf',3,true],
    ['Hukou',116.22,29.74,'cf',2,true],
    ['Susong',116.13,30.15,'cf',2],
    ['Taihu',116.31,30.46,'cf',2],
    ['Wangjiang',116.69,30.12,'cf',2,true],
    ['Qianshan',116.56,30.63,'cf',2],
    ['Anqing',117.05,30.53,'cf',3,true],
    ['Huaining',116.83,30.73,'cf',2,true],
    ['Tongcheng',116.95,31.05,'cf',2],
    ['Zongyang',117.22,30.70,'cf',2,true],
    ['Tongling',117.82,30.94,'cf',3,true],
    ['Wuwei',117.91,31.30,'cf',2,true],
    ['Wuhu',118.38,31.34,'cf',3,true],
    ['Ma’anshan',118.51,31.70,'cf',3,true],
    ['Chaohu',117.87,31.60,'cf',2],
    ['Hefei',117.28,31.86,'cf',3,true],
    ['Lu’an',116.52,31.75,'cf',2],
    ['Chuzhou',118.32,32.30,'cf',3,true],
    ['Nanjing',118.79,32.06,'cf',3,true],
    ['Yizheng',119.18,32.27,'cf',2,true],
    ['Zhenjiang',119.45,32.20,'cf',3,true],
    ['Yangzhou',119.42,32.39,'cf',3,true]
  ];
  // Simplified, continuously navigable main channel. Tributaries and Poyang
  // are drawn as geographical underlay ONLY: do not create implausible fleet
  // shortcuts through narrow, shallow or seasonally variable inland rivers.
  const YANGTZE=[
    [110.65,30.78],[110.89,30.71],[111.16,30.71],[111.34,30.69],
    [111.66,30.49],[111.94,30.40],[112.22,30.35],[112.53,30.19],
    [112.79,29.98],[113.04,29.90],[113.25,29.80],[113.46,29.82],
    [113.74,30.01],[113.89,30.12],[114.08,30.36],[114.28,30.55],
    [114.51,30.57],[114.70,30.51],[114.87,30.39],[115.08,30.23],
    [115.26,30.09],[115.45,29.93],[115.65,29.83],[115.84,29.74],
    [116.00,29.73],[116.22,29.74],[116.44,29.79],[116.64,29.96],
    [116.78,30.18],[116.91,30.37],[117.07,30.50],[117.34,30.61],
    [117.56,30.79],[117.79,30.93],[118.03,31.12],[118.24,31.24],
    [118.41,31.37],[118.51,31.57],[118.67,31.79],[118.78,32.09],
    [118.99,32.21],[119.22,32.24],[119.47,32.19],[119.83,32.23]
  ];
  const RIVERS={
    Yangtze:YANGTZE,
    Han:[ [112.03,31.72],[112.35,31.25],[112.82,31.08],[113.20,30.80],
      [113.55,30.68],[113.90,30.60],[114.29,30.55] ],
    Qingjiang:[[110.74,30.22],[111.26,30.31],[111.48,30.40]],
    DongtingOutlet:[[113.08,29.48],[113.16,29.76],[113.31,29.87]],
    Gan:[[115.85,28.60],[115.92,29.10],[116.06,29.44],[116.02,29.73]],
    Xiu:[[114.97,29.06],[115.42,29.26],[115.75,29.48]],
    Wan:[[116.48,30.42],[116.83,30.48],[117.05,30.53]]
  };
  // Geographic named crossing corridors. One or two overlapping mixed bank
  // cells stand in for a bridge deck; coast terrain remains navigable to ships.
  const BRIDGES=[
    ['Yichang Yangtze Bridge',111.32,30.69],
    ['Jingzhou Yangtze Bridge',112.24,30.35],
    ['Wuhan Yangtze Bridge',114.28,30.55],
    ['Huangshi Yangtze Bridge',115.08,30.23],
    ['Jiujiang Yangtze Bridge',116.00,29.73],
    ['Anqing Yangtze Bridge',117.08,30.51],
    ['Tongling Yangtze Bridge',117.79,30.93],
    ['Wuhu Yangtze Bridge',118.41,31.37],
    ['Nanjing Yangtze Bridge',118.78,32.09]
  ];
  // All ports are inland-river harbours, separately capturable from their cities.
  const PORTS={
    Yichang:3,Jingzhou:3,Wuhan:3,Huangshi:2,Jiujiang:3,
    Anqing:3,Tongling:2,Wuhu:3,Nanjing:3,Zhenjiang:2,
    Wuxue:2,Hukou:2,Ezhou:2
  };
  // [side, base, type, count, commander, operational Army Group].
  // Successive formations share a genuine Army Group rather than separate
  // pseudo-groups. Rear reserves begin inland, not atop bridge hexes.
  const ARMY_GROUPS=[
    ['britannia','Yidu','heavy',5,'cornelia','I Army Group · Upper River'],
    ['britannia','Yidu','rocket',4,'guilford','I Army Group · Upper River'],
    ['britannia','Songzi','assault',5,null,'I Army Group · Upper River'],
    ['britannia','Jingzhou','heavy',6,'bismarck','II Army Group · Jingzhou'],
    ['britannia','Jingzhou','siege',4,null,'II Army Group · Jingzhou'],
    ['britannia','Shishou','medium',5,'darlton','II Army Group · Jingzhou'],
    ['britannia','Yueyang','heavy',6,'suzaku','III Army Group · Wuhan'],
    ['britannia','Yueyang','rocket',5,'cecile','III Army Group · Wuhan'],
    ['britannia','Chibi','assault',6,'gino','III Army Group · Wuhan'],
    ['britannia','Xianning','heavy',6,'jeremiah','IV Army Group · Huangshi'],
    ['britannia','Xianning','siege',4,null,'IV Army Group · Huangshi'],
    ['britannia','Daye','assault',5,'villetta','IV Army Group · Huangshi'],
    ['britannia','Ruichang','heavy',6,'oldrin','V Army Group · Jiujiang'],
    ['britannia','Nanchang','rocket',5,null,'V Army Group · Jiujiang'],
    ['britannia','Duchang','medium',5,null,'V Army Group · Jiujiang'],
    ['britannia','Chizhou','heavy',5,'schneizel','VI Army Group · Anqing'],
    ['britannia','Chizhou','siege',4,null,'VI Army Group · Anqing'],
    ['britannia','Xuancheng','assault',5,null,'VI Army Group · Anqing'],
    ['britannia','Jurong','heavy',6,'kewell','VII Army Group · Nanjing'],
    ['britannia','Jurong','rocket',5,null,'VII Army Group · Nanjing'],
    ['britannia','Gaochun','assault',4,null,'VII Army Group · Nanjing'],
    ['cf','Yichang','heavy',5,'xingke','Western River Defense'],
    ['cf','Yichang','rocket',5,'honggu','Western River Defense'],
    ['cf','Jingmen','medium',5,'cao','Western River Defense'],
    ['cf','Qianjiang','heavy',5,'xianglin','Jingzhou Counterattack'],
    ['cf','Tianmen','rocket',4,null,'Jingzhou Counterattack'],
    ['cf','Xiantao','assault',5,'chengzhong','Jingzhou Counterattack'],
    ['cf','Wuhan','heavy',6,'ren','Wuhan Fortress Group'],
    ['cf','Wuhan','siege',5,null,'Wuhan Fortress Group'],
    ['cf','Hanchuan','rocket',5,'chaojielun','Wuhan Fortress Group'],
    ['cf','Huanggang','heavy',5,'sawasaki','Eastern Wuhan Defense'],
    ['cf','Huangshi','assault',5,null,'Eastern Wuhan Defense'],
    ['cf','Ezhou','rocket',4,null,'Eastern Wuhan Defense'],
    ['cf','Jiujiang','heavy',6,'gaohai','Jiujiang Line'],
    ['cf','Jiujiang','siege',5,null,'Jiujiang Line'],
    ['cf','Wuxue','medium',5,null,'Jiujiang Line'],
    ['cf','Hukou','rocket',4,null,'Jiujiang Line'],
    ['cf','Anqing','heavy',6,'xingke','Anqing Defense'],
    ['cf','Anqing','siege',5,null,'Anqing Defense'],
    ['cf','Huaining','rocket',5,null,'Anqing Defense'],
    ['cf','Tongling','heavy',5,'cao','Tongling–Wuhu Group'],
    ['cf','Tongling','rocket',4,null,'Tongling–Wuhu Group'],
    ['cf','Wuhu','assault',6,'xianglin','Tongling–Wuhu Group'],
    ['cf','Nanjing','heavy',6,'honggu','Nanjing Fortress Group'],
    ['cf','Nanjing','siege',5,null,'Nanjing Fortress Group'],
    ['cf','Chuzhou','rocket',5,null,'Nanjing Fortress Group'],
    ['cf','Yangzhou','heavy',5,null,'Northern Strategic Reserve'],
    ['cf','Hefei','heavy',5,'ren','Northern Strategic Reserve'],
    ['cf','Lu’an','assault',5,null,'Northern Strategic Reserve']
  ];
  // Riverine vessels use existing naval models; carriers represent alternate-
  // history support ships, not ocean-going blue-water fleets in the upper river.
  const FLEETS=[
    ['britannia','Jingzhou','portman_ii',3],
    ['britannia','Jingzhou','portman',3],
    ['britannia','Yidu','portman_ii',2],
    ['cf','Yichang','shui_gun_ru_ii',3],
    ['cf','Wuhan','shui_gun_ru_ii',4],
    ['cf','Huangshi','shui_gun_ru',3],
    ['cf','Jiujiang','shui_gun_ru_ii',4],
    ['cf','Anqing','shui_gun_ru_ii',3],
    ['cf','Wuhu','shui_gun_ru',3],
    ['cf','Nanjing','shui_gun_ru_ii',4]
  ].filter(x=>x[3]>0);
  const FUNDING={
    britannia:{credits:1270,industry:650,science:115,sakuradite:85},
    cf:{credits:1380,industry:710,science:120,sakuradite:85}
  };
  const MOUNTAINS=[
    [111.0,30.15,.46,.52],[111.3,31.35,.70,.42],
    [112.12,31.62,.82,.44],[113.08,31.65,.95,.48],
    [115.08,29.48,.66,.56],[116.45,29.23,.72,.36],
    [118.05,30.63,.85,.51],[118.82,30.61,.86,.53]
  ];
  const FORESTS=[
    [111.26,31.15,.70,.72],[112.04,31.25,.75,.63],
    [114.62,29.42,.85,.48],[115.20,29.11,.95,.46],
    [117.66,30.41,.70,.58],[118.60,30.57,.82,.62]
  ];
  const WETLANDS=[
    [112.99,29.84,.66,.29],[113.36,29.92,.62,.28],
    [115.95,29.48,.65,.43],[116.50,29.33,.45,.36]
  ];
  function geo(c,r){return {lon:BOUNDS.west+(c+.5+.5*(r&1))*(BOUNDS.east-BOUNDS.west)/COLS,
    lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {c:Math.max(0,Math.min(COLS-1,Math.round((lon-BOUNDS.west)*COLS/
      (BOUNDS.east-BOUNDS.west)-.5-.5*(r&1)))),r};
  }
  function ellipses(p,list){return Math.max(0,...list.map(([x,y,w,h])=>
    Math.exp(-1.6*(((p.lon-x)/w)**2+((p.lat-y)/h)**2))));}
  function landscape(p,c,r){
    const m=ellipses(p,MOUNTAINS),f=ellipses(p,FORESTS),wet=ellipses(p,WETLANDS);
    return m>.72?'mountain':m>.37||f>.52?'forest':
      wet>.54&&((c*13+r*7)%5<3)?'forest':'plains';
  }
  // Use projected WGS84 centre-lines to sample river surface coverage of each
  // tactical hex. Only 20–80% mixed hexes become 'coast'; deep water is 'sea'.
  // Named bridge decks are the explicit exception: engineered navigable coast.
  const SQ=Math.sqrt(3),toXY=([lon,lat])=>[
    SQ*((lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5),
    1.5*((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)];
  const TRACK=YANGTZE.map(toXY);
  const SEGMENTS=TRACK.slice(1).map((p,i)=>{
    const a=TRACK[i],dx=p[0]-a[0],dy=p[1]-a[1];
    return {x:a[0],y:a[1],dx,dy,len:dx*dx+dy*dy};
  });
  function distanceToRiver(x,y){
    let best=Infinity;
    for(const s of SEGMENTS){
      const t=Math.max(0,Math.min(1,((x-s.x)*s.dx+(y-s.y)*s.dy)/s.len));
      const dx=x-s.x-t*s.dx,dy=y-s.y-t*s.dy;
      best=Math.min(best,dx*dx+dy*dy);
    }
    return Math.sqrt(best);
  }
  const SAMPLES=[[0,0]];
  for(const radius of [.52,.88])for(let i=0;i<12;i++){
    const a=Math.PI*i/6;SAMPLES.push([radius*Math.cos(a),radius*Math.sin(a)]);
  }
  function riverFraction(c,r){
    const x=SQ*(c+.5*(r&1)),y=1.5*r;
    const centre=distanceToRiver(x,y);
    if(centre>2.5)return 0;
    let n=0;for(const [dx,dy] of SAMPLES)
      if(distanceToRiver(x+dx,y+dy)<1.24)n++;
    return n/SAMPLES.length;
  }
  function nearest(g,p,allowed,radius=12){
    let best=null,dist=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
        const t=E.tile(g,c,r);if(!t||!allowed(t))continue;
        const d=E.distance(p,t,g);
        if(d<dist){dist=d;best=t;}
      }
    return best;
  }
  function flood(g,start,allowed){
    const seen=new Set([E.key(start)]),q=[start];
    for(let i=0;i<q.length;i++)for(const n of E.adjacent(g,q[i])){
      const k=E.key(n);if(!seen.has(k)&&allowed(n)){seen.add(k);q.push(n);}
    }
    return seen;
  }
  function orderGroup(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const gr=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
    if(!gr)return {ok:false,reason:'Army Group not found'};
    let assigned=0,failed=0;
    for(const id of gr.units){
      const u=g.units.find(v=>v.id===id&&v.hp>0&&v.side===g.player);
      if(!u)continue;
      const res=E.setGoto(g,u.id,target.c,target.r);
      if(res.ok)assigned++;else failed++;
    }
    if(assigned)gr.destination={c:target.c,r:target.r};
    return {ok:assigned>0,assigned,failed};
  }
  function create(player='britannia',difficulty='normal',seed=201720){
    if(!SIDES.includes(player))throw Error('Invalid Yangtze side: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'bf-yangtze',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
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
    g.scenario={id:'bf-yangtze',key:'yangtze',title:'Battle of the Yangtze River',
      phase:'great-river-crossing',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,
      bridges:[],riverWidthHex:1.24,
      operationalFronts:[
        {name:'Yichang Gorge Exit',side:'britannia',from:'Yidu',objectives:['Yichang','Jingmen']},
        {name:'Jingzhou Bridgeheads',side:'britannia',from:'Jingzhou',objectives:['Qianjiang','Tianmen']},
        {name:'Wuhan Breakthrough',side:'britannia',from:'Chibi',objectives:['Wuhan','Hanchuan']},
        {name:'Huangshi Riverbend',side:'britannia',from:'Xianning',objectives:['Huangshi','Huanggang']},
        {name:'Jiujiang Crossings',side:'britannia',from:'Ruichang',objectives:['Jiujiang','Hukou']},
        {name:'Anqing–Tongling',side:'britannia',from:'Chizhou',objectives:['Anqing','Tongling']},
        {name:'Nanjing Assault',side:'britannia',from:'Jurong',objectives:['Nanjing','Yangzhou']},
        {name:'Northern Reserve',side:'cf',from:'Hefei',objectives:['Wuhan','Anqing','Nanjing']}
      ]};
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),fraction=riverFraction(c,r);
      return {c,r,owner:null,terrain:fraction>.8?'sea':
        fraction>=.2?'coast':landscape(p,c,r),waterFraction:fraction};
    });
    // Continuous main channel: discretization must not sever ship navigation
    // at a sharp meander or omit a short reach between sampled anchor points.
    const river=new Set();
    for(let i=1;i<YANGTZE.length;i++){
      const a=YANGTZE[i-1],b=YANGTZE[i];
      const count=Math.max(1,Math.ceil(Math.hypot(
        (b[0]-a[0])*COLS/(BOUNDS.east-BOUNDS.west),
        (b[1]-a[1])*ROWS/(BOUNDS.north-BOUNDS.south))*4));
      for(let n=0;n<=count;n++){
        const s=n/count,p=locate(a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s);
        const at=E.tile(g,p.c,p.r);
        if(!at)throw Error('Yangtze channel falls outside the map');
        at.terrain='sea';at.waterFraction=1;river.add(E.key(at));
      }
    }
    for(const [name,lon,lat] of BRIDGES){
      const centre=nearest(g,locate(lon,lat),t=>river.has(E.key(t)),3);
      if(!centre)throw Error('Missing geographic crossing '+name);
      const deck=[centre,...E.adjacent(g,centre).filter(t=>t.terrain==='sea')];
      for(const t of deck){t.terrain='coast';t.waterFraction=.5;}
      g.scenario.bridges.push({name,lon,lat,c:centre.c,r:centre.r,
        tiles:deck.map(t=>({c:t.c,r:t.r}))});
    }
    // Place river ports next to playable water; no river is a hidden teleport
    // between inland factories and a distant dry-side shipping square.
    for(const [name,lon,lat,side,tier,fort=false] of CITIES){
      const port=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r)&&
        (!port||E.adjacent(g,t).some(n=>n.terrain==='sea')),9);
      if(!at)throw Error('Cannot place Yangtze city '+name);
      const capital=name==='Wuhan'||name==='Nanjing'||name==='Jingzhou';
      const shield=Math.round((fort?(capital?740:490):(150+65*tier)) / 50) * 50;
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner:side,tier,
        capital,capitalOf:capital?side:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,
        lab:0,refinery:0,shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
        industry:Math.round((capital?25:6*tier)*.55),
        science:Math.round((1+tier)*.55),producedTurn:0});
    }
    for(const t of g.tiles)if(t.terrain!=='sea'){
      let closest=null,minimum=Infinity;
      for(const s of g.stations){
        const d=E.distance(t,s,g);
        if(d<minimum){minimum=d;closest=s;}
      }
      t.owner=closest.owner;t.provinceCity=closest.id;
    }
    // Station hexes and their bridgehead environs retain their owner's
    // allegiance even where the nearest province boundaries are contested.
    for(const s of g.stations){
      const t=E.tile(g,s.c,s.r);t.owner=s.owner;t.provinceCity=s.id;
    }
    const groupMap=new Map();
    function group(side,name,origin){
      const key=side+':'+name;
      if(!groupMap.has(key)){
        const v={id:'army-'+groupMap.size,side,name,origin,units:[]};
        groupMap.set(key,v);g.scenario.groups.push(v);
      }
      return groupMap.get(key);
    }
    for(const [side,name,cls,count,commander,army] of ARMY_GROUPS){
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side)throw Error('Wrong Yangtze Army Group staging: '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&t.owner===side&&
          !E.unitAt(g,t)&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),14);
        if(!at)throw Error('No Army Group staging hex near '+name);
        const cmd=i===0&&commander?commander:null;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group(side,army,name).units.push(u.id);
      }
    }
    const occupiedPorts=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      if(!s)throw Error('Missing Yangtze port town '+name);
      const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&
        !occupiedPorts.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(t=>t.terrain==='sea').length-
          E.adjacent(g,a).filter(t=>t.terrain==='sea').length)[0];
      if(!at)throw Error('No independent river port for '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      occupiedPorts.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      if(!E.TYPES[type]?.naval)throw Error('Invalid Yangtze riverine ship '+type);
      const s=g.stations.find(v=>v.name===name);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' River Squadron',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain==='sea'&&
          !E.unitAt(g,t)&&!occupiedPorts.has(E.key(t)),14);
        if(!at)throw Error('No navigable river squadron berth near '+name);
        const u=E.newUnit(g,type,side,at.c,at.r);
        fleet.units.push(u.id);
      }
      g.scenario.groups.push(fleet);
    }
    // Map construction audits, not a simulation: bridgehead land access,
    // connected active shipping channel, separately capturable ports, and
    // no inaccessible station. 'coast' remains navigable by engine rules.
    const wet=t=>t.terrain==='sea'||t.terrain==='coast';
    const start=E.tile(g,...[locate(111.32,30.69).c,locate(111.32,30.69).r]);
    const riverNet=flood(g,start,wet);
    for(const t of g.tiles)if(river.has(E.key(t))&&!riverNet.has(E.key(t)))
      throw Error('Disconnected navigable Yangtze reach at '+E.key(t));
    for(const s of g.stations.filter(s=>s.portAt)){
      const p=E.tile(g,s.portAt.c,s.portAt.r);
      if(!p||p.terrain!=='sea'||!E.adjacent(g,s).includes(p)||
        !riverNet.has(E.key(p)))throw Error('Unreachable or detached river port '+s.name);
    }
    const crossings=flood(g,g.stations.find(s=>s.name==='Jingzhou'),
      t=>t.terrain!=='sea');
    if(!crossings.has(E.key(g.stations.find(s=>s.name==='Wuhan'))))
      throw Error('River bridge decks cannot connect southern and northern armies');
    // Retain existing Elite transformations and challenge tiers.
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const factor=side===player?1:['challenge','elite'].includes(difficulty)?1.6:
        difficulty==='hard'?1.3:1;
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,value])=>
          [resource,Math.round(value*factor)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*2;
    }
    if(difficulty!=='normal'&&difficulty!=='elite')
      for(const side of SIDES.filter(v=>v!==player))
        for(const [i,u] of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval).entries())
          if(difficulty==='challenge'||i%2===0){
            u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);
          }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Britannia attacks along seven Yangtze sectors. Federation artillery, reserve armies and inland squadrons defend nine strategic crossing corridors.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){return g.stations.filter(s=>s.owner===side)
    .reduce((n,s)=>n+s.tier,0);}
  function objective(g,side=g.player){
    return 'Capture all '+CITIES.length+' Yangtze corridor cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+
      ' controlled). The river has no turn limit.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='bf-yangtze'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Yangtze River theatre.'};
    return null;
  }
  const api={id:'bf-yangtze',title:'Battle of the Yangtze River',
    cols:COLS,rows:ROWS,sides:SIDES,bounds:BOUNDS,cityData:CITIES,
    armyGroups:ARMY_GROUPS,ports:PORTS,rivers:RIVERS,bridges:BRIDGES,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,overlays:['yangtzeRiver']},
    elite:true,
    ai:{riverlineDefense:{side:'cf',attacker:'britannia',river:'Yangtze'}},
    text:{
      era:"Central and Eastern Yangtze · Alternate 2017",
      intro:"After South China, Britannia reaches the great Yangtze barrier. Cross its nine defended bridge corridors, seize every one of 60 cities, and advance deep into Federation territory. No turn limit.",
      diplomacy:"Britannia and the Chinese Federation are hostile from the opening turn. River ships use the navigable main channel; ports are independently capturable. Tributaries are visual and geographic obstacles, not imaginary blue-water shortcuts.",
      elite:"Elite Yangtze uses established Britannian and Chinese Elite Force replacements. Riverine fleets retain standard naval models and commander, production and income scaling follow existing Elite rules.",
      focus:{
        britannia:"Jingzhou",
        cf:"Wuhan"
      }
    },
    blurbs:{
      britannia:"Lead seven enormous Army Groups across the Yangtze. Seize bridgeheads from Yichang to Nanjing, destroy Chinese river squadrons, and exploit breakthroughs toward the north.",
      cf:"Hold the river crossing corridors, defend Wuhan and Nanjing, contest river ports, and commit inland reserves to crush isolated Britannian bridgeheads."
    }};
  E.scenarios={...(E.scenarios||{}),yangtze:api,
    byId:{...(E.scenarios?.byId||{}),'bf-yangtze':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

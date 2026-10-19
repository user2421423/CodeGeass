/* Invasion of Sichuan — E.U. advance from Tibetan staging cities into the
 * Hengduan ranges and fortified Chengdu Basin. Standalone E.U. vs CF module.
 * WGS84 place/road/river control points are approximate, not a DEM raster.
 * Inland theatre: NO ocean water, navy or seaport spawns. Three fully
 * traversable mountain approaches are cut explicitly through rough terrain.
 * The integrator, not this module, owns manifest / campaign activation. */
(function(root) {
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  const ID='eu-cf-sichuan',COLS=148,ROWS=108,SIDES=['eu','cf'];
  const BOUNDS={west:94.0,east:109.1,north:34.3,south:26.1};
  const K=Math.cos(30.2*Math.PI/180);
  const PROJECTION={centerLon:101.55,centerLat:30.2,angle:0,
    uMin:-7.55*K,uMax:7.55*K,vMin:-4.1,vMax:4.1};
  // [settlement, WGS84 longitude, latitude, starting faction, tier, fort].
  // Borders/factions are alternate history; settlement geography is real.
  const CITIES=[
    ['Nyingchi',94.36,29.65,'eu',2,true],
    ['Banbar',94.72,31.93,'eu',2,false],
    ['Dengqen',95.60,31.41,'eu',2,true],
    ['Bomi',95.77,29.86,'eu',2,false],
    ['Riwoche',96.60,31.21,'eu',2,false],
    ['Baxoi',96.92,30.05,'eu',2,true],
    ['Rawu',96.77,29.50,'eu',1,false],
    ['Chamdo',97.18,31.14,'eu',3,true],
    ['Zogang',97.84,29.67,'eu',2,true],
    ['Jomda',98.22,31.49,'eu',2,true],
    ['Gonjo',98.28,32.30,'eu',2,true],
    ['Markam',98.60,29.68,'eu',3,true],
    ['Dege',98.58,31.81,'cf',2,true],
    ['Shiqu',98.10,32.98,'cf',2,true],
    ['Baiyu',98.82,31.21,'cf',2,true],
    ['Batang',99.12,30.00,'cf',3,true],
    ['Garze',100.00,31.63,'cf',3,true],
    ['Xinlong',100.31,30.94,'cf',2,true],
    ['Litang',100.27,29.99,'cf',3,true],
    ['Daocheng',100.30,29.05,'cf',2,true],
    ['Xiangcheng',99.80,28.93,'cf',2,true],
    ['Yajiang',101.02,30.03,'cf',2,true],
    ['Luhuo',100.68,31.39,'cf',2,true],
    ['Aba',101.71,32.90,'cf',2,true],
    ['Hongyuan',102.54,32.79,'cf',2,true],
    ['Maerkang',102.21,31.90,'cf',3,true],
    ['Danba',101.89,30.88,'cf',2,true],
    ['Kangding',101.96,30.05,'cf',3,true],
    ['Jiulong',101.51,29.00,'cf',2,true],
    ['Muli',101.28,27.92,'cf',2,false],
    ['Xichang',102.26,27.89,'cf',3,true],
    ['Panzhihua',101.72,26.58,'cf',3,true],
    ['Huili',102.25,26.66,'cf',2,false],
    ['Yanyuan',101.51,27.42,'cf',2,false],
    ['Shimian',102.36,29.23,'cf',2,true],
    ['Hanyuan',102.68,29.35,'cf',2,true],
    ['Yaan',103.00,29.98,'cf',3,true],
    ['Tianquan',102.76,30.07,'cf',2,true],
    ['Wenchuan',103.58,31.48,'cf',2,true],
    ['Maoxian',103.85,31.68,'cf',2,true],
    ['Songpan',103.60,32.64,'cf',2,true],
    ['Dujiangyan',103.62,31.00,'cf',3,true],
    ['Pengzhou',103.94,30.99,'cf',2,true],
    ['Chongzhou',103.67,30.63,'cf',2,true],
    ['Chengdu',104.07,30.67,'cf',3,true],
    ['Meishan',103.85,30.08,'cf',3,true],
    ['Leshan',103.77,29.56,'cf',3,true],
    ['Yibin',104.64,28.75,'cf',3,true],
    ['Zigong',104.78,29.34,'cf',3,true],
    ['Neijiang',105.04,29.58,'cf',3,true],
    ['Deyang',104.40,31.13,'cf',3,true],
    ['Mianyang',104.73,31.47,'cf',3,true],
    ['Jiangyou',104.75,31.78,'cf',2,true],
    ['Guangyuan',105.84,32.44,'cf',3,true],
    ['Jianyang',104.55,30.39,'cf',2,true],
    ['Suining',105.59,30.53,'cf',3,true],
    ['Nanchong',106.11,30.78,'cf',3,true],
    ['Luzhou',105.44,28.87,'cf',3,true],
    ['Dazhou',107.50,31.21,'cf',3,true],
    ['Bazhong',106.77,31.85,'cf',2,true],
    ['Guangan',106.63,30.46,'cf',2,true],
    ['Yunyang',108.70,30.93,'cf',2,true]
  ];
  // The river-lines are narrow, non-navigable inland features. They remain
  // terrain/visual defensive belts, not connected seas or imaginary ports.
  const RIVERS={
    Jinsha:[[97.0,32.7],[98.1,31.8],[98.7,30.65],[99.1,29.75],
      [100.0,28.6],[100.7,27.8],[101.72,26.58],[102.8,27.7],[104.64,28.75]],
    Yalong:[[100.3,33.6],[100.2,32.3],[101.0,31.1],[101.5,30.0],
      [101.6,28.7],[101.72,26.58]],
    Dadu:[[102.4,31.4],[102.0,30.6],[102.4,30.05],[102.7,29.4],[103.77,29.56]],
    Min:[[103.6,32.65],[103.85,31.68],[103.62,31.00],
      [103.85,30.08],[103.77,29.56],[104.64,28.75]],
    Tuo:[[104.20,31.4],[104.50,30.7],[104.77,29.35],[105.43,28.88]],
    Jialing:[[105.10,33.8],[105.84,32.44],[105.54,31.8],
      [106.11,30.78],[106.6,29.6]]
  };
  // Survey-level heights are not encoded: envelopes follow named Hengduan,
  // Qionglai, Min and Longmen mountainous regions, not political strips.
  const RIDGES=[
    [97.4,32.5,2.7,1.45],[97.1,29.2,2.7,1.8],
    [99.2,30.8,2.6,1.9],[100.6,33.3,2.5,1.1],
    [101.2,28.6,2.1,1.5],[101.45,31.65,1.45,1.7],
    [102.25,30.45,.85,1.15],[103.0,32.0,.78,1.45],
    [106.8,32.9,1.2,.70],[107.4,31.1,1.3,.65]
  ];
  const LOWLANDS=[
    [104.3,30.65,2.05,1.06],[104.4,29.54,1.35,.75],
    [105.8,30.45,1.72,.85],[106.1,31.45,.75,.50],
    [104.9,28.80,1.00,.5],[102.25,27.90,.42,.45]
  ];
  const WOODLANDS=[
    [102.8,29.75,.9,.75],[103.3,31.80,.7,1.1],
    [106.4,32.25,1.6,.65],[107.8,30.65,.9,.8]
  ];
  // Always connected at least three tiles wide on this grid, including all
  // mountain pinch points and entrances to the Chengdu lowland.
  const PASS_ROUTES={
    'Northern Garze corridor':[[98.28,32.30],[98.58,31.81],[100.0,31.63],
      [100.68,31.39],[102.21,31.90],[103.58,31.48],[103.62,31.0],[104.07,30.67]],
    'Central Kangding corridor':[[97.18,31.14],[98.60,29.68],[99.12,30.00],
      [100.27,29.99],[101.02,30.03],[101.96,30.05],[103.0,29.98],
      [103.85,30.08],[104.07,30.67]],
    'Southern Xichang corridor':[[97.84,29.67],[98.60,29.68],[99.80,28.93],
      [100.30,29.05],[101.51,29.00],[102.26,27.89],[102.68,29.35],
      [103.77,29.56],[104.64,28.75]],
    'Northern plateau relief':[[98.22,31.49],[98.82,31.21],[100.31,30.94],
      [101.89,30.88],[103.00,29.98]],
    'Eastern basin highway':[[103.62,31.00],[104.07,30.67],[104.4,31.13],
      [104.73,31.47],[105.84,32.44]],
    'Southern industrial highway':[[104.64,28.75],[104.78,29.34],
      [105.04,29.58],[105.59,30.53],[106.11,30.78]]
  };
  const CROSSINGS=[
    ['Upper Jinsha ford',99.12,30.00],
    ['Dadu crossing',102.76,30.07],
    ['Min River crossing',103.62,31.00],
    ['Leshan confluence bridge',103.77,29.56],
    ['Jialing crossing',106.11,30.78]
  ];
  const FRONTS=[
    {name:'Northern Plateau Army',side:'eu',bases:['Gonjo','Jomda','Chamdo'],
      route:['Dege','Garze','Maerkang','Wenchuan','Dujiangyan','Chengdu']},
    {name:'Central Expedition',side:'eu',bases:['Markam','Zogang','Baxoi'],
      route:['Batang','Litang','Kangding','Yaan','Chengdu']},
    {name:'Southern Highlands Army',side:'eu',bases:['Bomi','Nyingchi','Rawu'],
      route:['Xiangcheng','Daocheng','Xichang','Leshan','Yibin']},
    {name:'Western Mountain Garrisons',side:'cf',bases:['Dege','Batang','Garze'],
      route:['Markam','Chamdo','Jomda']},
    {name:'Chengdu Basin Defense',side:'cf',bases:['Chengdu','Deyang','Dujiangyan','Mianyang'],
      route:['Yaan','Kangding','Batang']},
    {name:'Southern River Reserve',side:'cf',bases:['Yibin','Leshan','Xichang'],
      route:['Markam','Baxoi']}
  ];
  // Distinct standard formations, capped at normal three-frame stacks.
  // Deployments emphasize EU weight at the passes and CF basin reserves.
  const ARMIES=[
    ['eu','Chamdo','heavy',8,'akito'],['eu','Chamdo','rocket',6,'yukiya'],
    ['eu','Chamdo','assault',5,'ryo'],['eu','Chamdo','siege',4],
    ['eu','Jomda','heavy',7,'leila'],['eu','Jomda','medium',5],
    ['eu','Gonjo','raider',7,'ayano'],['eu','Gonjo','rocket',4],
    ['eu','Riwoche','heavy',5,'oscar'],['eu','Riwoche','support',3],
    ['eu','Dengqen','medium',3,'klaus'],['eu','Banbar','assault',3],
    ['eu','Markam','heavy',8,'smilas'],['eu','Markam','rocket',7],
    ['eu','Markam','siege',5],['eu','Zogang','heavy',7,'fernando'],
    ['eu','Zogang','assault',5],['eu','Baxoi','medium',6,'olivia'],
    ['eu','Baxoi','rocket',4],['eu','Bomi','heavy',5,'anna'],
    ['eu','Bomi','assault',3],['eu','Nyingchi','raider',3],
    ['eu','Rawu','medium',3],['eu','Baxoi','support',2],
    ['cf','Dege','heavy',4,'xingke'],['cf','Dege','rocket',3,'gaohai'],
    ['cf','Baiyu','medium',2],['cf','Garze','heavy',4,'honggu'],
    ['cf','Garze','rocket',2],['cf','Batang','heavy',4,'lifeng'],
    ['cf','Batang','siege',2],['cf','Litang','heavy',3,'zhaohao'],
    ['cf','Litang','rocket',3],['cf','Kangding','super',4,'chengzhong'],
    ['cf','Kangding','rocket',3],['cf','Kangding','siege',3],
    ['cf','Maerkang','heavy',3,'huangqian'],['cf','Danba','medium',2],
    ['cf','Yaan','super',4,'cao'],['cf','Yaan','siege',3],
    ['cf','Wenchuan','heavy',3],['cf','Dujiangyan','heavy',3],
    ['cf','Xichang','heavy',4,'chaojielun'],['cf','Xichang','rocket',3],
    ['cf','Panzhihua','heavy',3],['cf','Yibin','heavy',4,'leifeng'],
    ['cf','Yibin','siege',3],['cf','Leshan','heavy',3],
    ['cf','Chengdu','super',5],['cf','Chengdu','rocket',5],
    ['cf','Chengdu','siege',5],['cf','Chengdu','assault',4],
    ['cf','Deyang','heavy',3],['cf','Mianyang','rocket',3],
    ['cf','Meishan','heavy',3],['cf','Nanchong','heavy',3],
    ['cf','Guangyuan','medium',3],['cf','Luzhou','medium',3]
  ];
  const FUNDING={
    eu:{credits:890,industry:600,science:92,sakuradite:38},
    cf:{credits:930,industry:620,science:94,sakuradite:40}
  };
  function geo(c,r) {
    return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
      lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};
  }
  function locate(lon,lat) {
    const r=Math.max(0,Math.min(ROWS-1,
      Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,
      Math.round((lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function density(p,ellipses) {
    return Math.max(0,...ellipses.map(([x,y,w,h])=>
      Math.exp(-1.6*((((p.lon-x)*K)/w)**2+((p.lat-y)/h)**2))));
  }
  function segmentDistance(p,a,b){
    const dx=(b[0]-a[0])*K,dy=b[1]-a[1];
    const t=Math.max(0,Math.min(1,
      (((p.lon-a[0])*K*dx+(p.lat-a[1])*dy)/(dx*dx+dy*dy||1))));
    return Math.hypot((p.lon-a[0]-t*(b[0]-a[0]))*K,
      p.lat-a[1]-t*(b[1]-a[1]));
  }
  function lineDistance(p,line){
    let d=Infinity;
    for(let i=1;i<line.length;i++)
      d=Math.min(d,segmentDistance(p,line[i-1],line[i]));
    return d;
  }
  function onRoad(p){
    return Object.values(PASS_ROUTES).some(points=>lineDistance(p,points)<.17);
  }
  function landscape(p,c,r){
    const relief=density(p,RIDGES),low=density(p,LOWLANDS),
      trees=density(p,WOODLANDS);
    const texture=((c*19+r*31+c*r%29)%53)/53;
    // East of the Qionglai range opens into the cultivated Sichuan basin.
    if(low>.47)return trees>.72?'forest':'plains';
    // Every named pass is explicitly cut through otherwise blocked terrain.
    if(onRoad(p))return relief>.45?'forest':'plains';
    if(relief>.80)return 'peak';
    if(relief>.52)return 'mountain';
    if(relief>.24)return texture>.14?'mountain':'forest';
    return trees>.40||texture<.08?'forest':'plains';
  }
  function nearest(g,p,test,radius=12) {
    let best=null,bestDist=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!test(t))continue;
        const d=E.distance(p,t,g);
        if(d<bestDist){best=t;bestDist=d;}
      }
    return best;
  }
  function polylineCells(points){
    const cells=new Set();
    for(let k=1;k<points.length;k++){
      const a=locate(...points[k-1]),b=locate(...points[k]);
      const steps=Math.max(1,Math.ceil(E.distance(a,b)*4));
      for(let i=0;i<=steps;i++){
        const f=i/steps;
        const p=locate(points[k-1][0]+f*(points[k][0]-points[k-1][0]),
          points[k-1][1]+f*(points[k][1]-points[k-1][1]));
        cells.add(p.r*COLS+p.c);
      }
    }
    return cells;
  }
  function makeRiver(g){
    // A continuous rough river bank provides defensible approaches. These
    // are NOT ocean / sea cells: the Jinsha, Min and Dadu cannot spawn ships.
    for(const line of Object.values(RIVERS))
      for(const i of polylineCells(line)){
        const t=g.tiles[i];
        if(t&&t.terrain==='plains')t.terrain='forest';
        if(t)t.inlandRiver=true;
      }
    for(const [name,lon,lat] of CROSSINGS){
      const near=locate(lon,lat);
      const at=nearest(g,near,t=>t.inlandRiver,6);
      if(!at)throw Error('Missing inland river crossing '+name);
      at.riverCrossing=name;
      if(at.terrain!=='peak')at.terrain='plains';
    }
  }
  function openApproaches(g){
    // Carve the exact named switchback and mountain pass axes; river crossings
    // remain open at corridors, avoiding impassable victory routes.
    for(const line of Object.values(PASS_ROUTES)){
      for(const i of polylineCells(line)){
        const at=g.tiles[i];
        if(at)at.terrain='plains';
      }
    }
    // Validate every successive pass control point has a continuous dry route.
    for(const [name,line] of Object.entries(PASS_ROUTES)){
      for(const [lon,lat] of line){
        const t=E.tile(g,locate(lon,lat).c,locate(lon,lat).r);
        if(!t||t.terrain==='peak'||t.terrain==='sea')
          throw Error('Blocked Sichuan mountain pass: '+name);
      }
    }
  }
  function assignProvinces(g) {
    for(const t of g.tiles){
      if(t.terrain==='sea')continue;
      let pick=null,best=Infinity;
      for(const s of g.stations){
        const d=E.distance(s,t,g);
        if(d<best){best=d;pick=s;}
      }
      t.owner=pick.owner;
      t.provinceCity=pick.id;
    }
  }
  function orderGroup(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const group=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
    if(!group)return {ok:false,reason:'Army group not found'};
    let assigned=0,failed=0;
    for(const uid of group.units){
      const u=g.units.find(v=>v.id===uid&&v.hp>0&&v.side===g.player);
      if(!u)continue;
      const result=E.setGoto(g,u.id,target.c,target.r);
      if(result.ok)assigned++;else failed++;
    }
    if(assigned)group.destination={c:target.c,r:target.r};
    return {ok:assigned>0,assigned,failed,reason:assigned?'':'No reachable formations'};
  }
  function create(player='eu',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported Sichuan faction '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,
      player,difficulty,mode:'scenario',era:ID,
      order:[player,...SIDES.filter(s=>s!==player)],seed,wrap:false,
      cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{eu:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},
      // The shared 2017 Chinese roster supplies the correct class-to-frame mapping:
      // Raider = Gun-Ru Mobile; Light Armor = Chuyen; Super-heavy = Shen Hu.
      lineup:{cf:{...E.LINEUPS.cf2017}}
    };
    for(const s of [...SIDES,'neutral']){
      g.economy[s]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[s]={};
    }
    g.scenario={id:ID,key:'sichuan-offensive',title:'Invasion of Sichuan',
      phase:'tibetan-mountain-offensive',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,crossings:CROSSINGS,
      operationalFronts:FRONTS,mountainPasses:PASS_ROUTES,
      capital:'Chengdu',inlandRivers:true,
      totalConquest:true,turnLimit:null};
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      Object.keys(E.ELITE_FORCES).filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0;
      return {c,r,owner:null,terrain:landscape(geo(c,r),c,r)};
    });
    makeRiver(g);
    openApproaches(g);
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const at=nearest(g,locate(lon,lat),t=>
        t.terrain!=='sea'&&t.terrain!=='peak'&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),10);
      if(!at)throw Error('Unreachable Sichuan theatre city: '+name);
      const capital=name==='Chengdu'||name==='Chamdo';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,
        owner,tier,capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,
        lab:0,refinery:0,shield,maxShield:shield,
        income:Math.round((capital?65:tier===3?32:18)*.55),
        industry:Math.round((capital?38:8*tier)*.55),
        science:Math.round((tier+2)*.55),producedTurn:0});
      if(at.terrain!=='coast')at.terrain='plains';
    }
    assignProvinces(g);
    const byGroup=new Map();
    function group(side,base){
      const k=side+':'+base;
      if(!byGroup.has(k)){
        const row={id:'army-'+byGroup.size,side,name:base+' Army Group',
          origin:base,units:[]};
        byGroup.set(k,row);g.scenario.groups.push(row);
      }
      return byGroup.get(k);
    }
    for(const [side,base,cls,count,commander] of ARMIES){
      const station=g.stations.find(s=>s.name===base);
      if(!station||station.owner!==side)throw Error('Invalid Luoyang army base '+base);
      for(let i=0;i<count;i++){
        const at=nearest(g,station,t=>t.terrain!=='sea'&&t.terrain!=='peak'&&
          t.owner===side&&!E.unitAt(g,t)&&
          (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),14);
        if(!at)throw Error('No clear deployment hex at '+base);
        const cmd=i===0?commander:null;
        if(cmd&&!g.officers[cmd])throw Error('Unknown Sichuan commander '+cmd);
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,
          i===0?3:2,cmd);
        group(side,base).units.push(u.id);
        if(cmd){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const mult=side===player?1:difficulty==='hard'?1.25:
        ['challenge','elite'].includes(difficulty)?1.5:1;
      const base=E.income(g,side),wanted=FUNDING[side];
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(wanted).map(([kind,rate])=>
          [kind,Math.max(0,Math.round(rate*mult)-base[kind])]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(wanted))
        g.economy[side][resource]=actual[resource]*3;
    }
    // Enemy advantages use the same standard difficulty stack rules as other
    // regional battles. Elite is handled exclusively by the shared system.
    if(difficulty==='hard'||difficulty==='challenge'){
      const adversaries=g.units.filter(u=>u.side!==player&&!u.elite);
      for(const [i,u] of adversaries.entries())
        if(difficulty==='challenge'||i%2===0){
          u.stack=Math.min(3,u.stack+1);
          u.hp=E.maxHP(u);
        }
    }
    g.startUnits=Object.fromEntries(
      SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'The E.U. advances from eastern Tibet along three mountain corridors. The Federation defends the Hengduan passes and marshals reserves around Chengdu and the river basins.',player);
    return g;
  }
  function onTurn(){return false;} // No scripted reinforcements or victory timers.
  function objective(g,side=g.player){
    const own=g.stations.filter(s=>s.owner===side).length;
    return (side==='eu'?'Break through the mountain approaches: ':
      'Hold the Chengdu Basin, then counterattack Tibet: ')+
      'control all '+CITIES.length+' theatre cities ('+own+' held); no turn limit.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Sichuan theatre.'};
    return null;
  }
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>
      n+s.tier+(s.name==='Chengdu'?5:0),0);
  }
  // The geographic painter can be hooked by the map-drawing integrator.
  // It renders narrow river strokes but never changes tactical navigability.
  function paintRelief(ctx,g,{R,SQ,left,right,top,bottom}){
    if(g.scenario?.id!==ID)return;
    const sx=SQ*R*g.cols/(BOUNDS.east-BOUNDS.west),
      sy=1.5*R*g.rows/(BOUNDS.north-BOUNDS.south);
    const xy=([lon,lat])=>[R-SQ*R*.5+(lon-BOUNDS.west)*sx,
      R-.75*R+(BOUNDS.north-lat)*sy];
    ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle='rgba(98,188,214,.75)';
    ctx.lineWidth=Math.max(1,R*.14);
    for(const river of Object.values(RIVERS)){
      ctx.beginPath();river.forEach((v,i)=>{
        const [x,y]=xy(v);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      });ctx.stroke();
    }
    ctx.setLineDash([Math.max(1,R*.15),Math.max(2,R*.21)]);
    ctx.strokeStyle='rgba(236,196,108,.65)';ctx.lineWidth=Math.max(.8,R*.08);
    for(const road of Object.values(PASS_ROUTES)){
      ctx.beginPath();road.forEach((v,i)=>{
        const [x,y]=xy(v);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      });ctx.stroke();
    }
    ctx.restore();
  }
  const api={id:ID,title:'Invasion of Sichuan',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,projection:PROJECTION,
    cityData:CITIES,armyGroups:ARMIES,rivers:RIVERS,crossings:CROSSINGS,
    mountainPasses:PASS_ROUTES,operationalFronts:FRONTS,
    create,onTurn,objective,winner,strategicScore,orderGroup,geo,locate,paintRelief};
  api.meta={
    map:{centreSampled:true,homeZoom:3.8,overviewMarkers:true,coastBuffer:0},
    terrainCosts:{mountain:2},elite:true,saveVersion:1,
    ai:{doctrine:'europe',recovery:true},
    text:{
      terrain:'Hengduan mountain slopes slow ground forces; the three mapped passes and basin roads are accessible.',
      era:'Eastern Tibet → Sichuan · E.U.–Federation War',
      intro:'E.U. armies break out of Tibet on northern, central and southern passes. Fortified Federation defenses cover western Sichuan; Chengdu commands the industrial basin and eastern reserves.',
      diplomacy:'Only E.U. and the Chinese Federation are present. This landlocked region has no seaports or naval units. All opposing cities must be captured; no turn limit.',
      elite:'Uses standard faction Elite Forces, Elite conversion, opposing commander ranks and factories. No scenario-only combat buffs.',
      focus:{eu:'Chamdo',cf:'Chengdu'}
    },
    blurbs:{
      eu:'Coordinate the three passes, breach Batang and Dege, exploit Kangding toward Chengdu, then finish the eastern river-defense belt.',
      cf:'Use mountain garrisons to stall the invasion, defend the Chengdu Basin with strong reserves and recapture Tibetan staging cities.'
    }
  };
  E.scenarios={...(E.scenarios||{}),sichuan:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;

  })(typeof window!=='undefined'?window:globalThis);

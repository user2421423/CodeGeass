/* E.U. vs Chinese Federation — independent Battle of Luoyang finale.
   Own runtime scenario; original Britannia–China operation remains untouched.
   Reuses 83-city Henan geography and Yellow River crossings. */
(function(root) {
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  const ID='eu-cf-luoyang', COLS=174, ROWS=116, SIDES=['eu','cf'];
  // Henan plus northern/southern/western operational approaches. Geographic
  // coordinates use WGS84 longitude and latitude, with a north-up projection.
  const BOUNDS={west:108.55,east:118.45,north:38.2,south:31.65};
  const K=Math.cos(34.95*Math.PI/180);
  const PROJECTION={centerLon:113.5,centerLat:34.925,angle:0,
    uMin:-4.95*K,uMax:4.95*K,vMin:-3.275,vMax:3.275};
  // [name, lon, lat, initial owner, city tier, fortifications].
  // Northern Shanxi/Hebei and Nanyang southwest are E.U. bridgeheads.
  // Eastern and central Henan plus the capital are defended by China.
  const CITIES=[
    ['Luoyang',112.45,34.62,'cf',3,true],
    ['Mengjin',112.44,34.83,'cf',3,true],
    ['Yanshi',112.79,34.73,'cf',3,true],
    ['Xin an',112.14,34.73,'cf',2,true],
    ['Yiyang',112.18,34.51,'cf',2,true],
    ['Yichuan',112.43,34.43,'cf',2,true],
    ['Ruyang',112.47,34.15,'cf',2,true],
    ['Songxian',112.08,34.13,'cf',2,true],
    ['Luanchuan',111.62,33.78,'cf',2,true],
    ['Luoning',111.65,34.39,'cf',2,true],
    ['Yima',111.87,34.75,'cf',2,true],
    ['Mianchi',111.76,34.77,'cf',3,true],
    ['Sanmenxia',111.19,34.77,'cf',3,true],
    ['Lingbao',110.89,34.52,'cf',3,true],
    ['Lushi',111.05,34.06,'cf',2,true],
    ['Jiyuan',112.60,35.09,'cf',3,true],
    ['Gongyi',112.98,34.75,'cf',3,true],
    ['Dengfeng',113.02,34.45,'cf',3,true],
    ['Ruzhou',112.84,34.17,'cf',2,true],
    ['Jiaozuo',113.24,35.21,'cf',3,true],
    ['Qinyang',112.93,35.09,'cf',2,true],
    ['Boai',113.07,35.17,'cf',2,true],
    ['Wenxian',113.08,34.94,'cf',2,true],
    ['Mengzhou',112.79,34.91,'cf',2,true],
    ['Wuzhi',113.40,35.10,'cf',2,true],
    ['Xiuwu',113.45,35.23,'cf',2,true],
    ['Huojia',113.66,35.26,'cf',2,true],
    ['Weihui',114.06,35.39,'cf',2,true],
    ['Xinxiang',113.93,35.30,'cf',3,true],
    ['Yuanyang',113.96,35.05,'cf',2,true],
    ['Changyuan',114.68,35.20,'cf',2,true],
    ['Zhengzhou',113.63,34.75,'cf',3,true],
    ['Xingyang',113.38,34.79,'cf',3,true],
    ['Xinmi',113.38,34.54,'cf',2,true],
    ['Xinzheng',113.74,34.40,'cf',3,true],
    ['Zhongmu',114.02,34.73,'cf',2,true],
    ['Kaifeng',114.30,34.80,'cf',3,true],
    ['Lankao',114.82,34.82,'cf',2,true],
    ['Qixian',114.78,34.55,'cf',2,true],
    ['Tongxu',114.47,34.48,'cf',2,true],
    ['Yuzhou',113.47,34.16,'cf',2,true],
    ['Pingdingshan',113.30,33.74,'cf',3,true],
    ['Baofeng',113.05,33.88,'cf',2,true],
    ['Jiaxian',113.22,34.01,'cf',2,true],
    ['Lushan',112.91,33.74,'cf',2,true],
    ['Yexian',113.36,33.63,'cf',2,true],
    ['Nanzhao',112.43,33.49,'cf',2,true],
    ['Xiangcheng',113.48,33.85,'cf',2,true],
    ['Fugou',114.39,34.06,'cf',2,true],
    ['Taikang',114.84,34.07,'cf',2,true],
    ['Jincheng',112.85,35.50,'cf',3,true],
    ['Yangcheng',112.41,35.49,'cf',2,true],
    ['Yangquan',113.58,37.85,'eu',2,false],
    ['Changzhi',113.12,36.19,'eu',3,false],
    ['Handan',114.49,36.61,'eu',3,false],
    ['Anyang',114.39,36.10,'eu',3,false],
    ['Linzhou',113.82,36.08,'eu',2,false],
    ['Tangyin',114.36,35.92,'eu',2,false],
    ['Hebi',114.27,35.75,'eu',3,false],
    ['Qi County',114.20,35.61,'eu',2,false],
    ['Huaxian',114.52,35.58,'eu',2,false],
    ['Neihuang',114.90,35.95,'eu',2,false],
    ['Puyang',115.03,35.76,'eu',3,false],
    ['Qingfeng',115.11,35.88,'eu',2,false],
    ['Heze',115.48,35.24,'cf',3,false],
    ['Dingtao',115.57,35.07,'cf',2,false],
    ['Jining',116.59,35.41,'cf',3,false],
    ['Shangqiu',115.65,34.45,'cf',3,false],
    ['Minquan',115.15,34.65,'cf',2,false],
    ['Ningling',115.31,34.45,'cf',2,false],
    ['Zhoukou',114.65,33.63,'cf',3,false],
    ['Luohe',114.02,33.57,'cf',3,false],
    ['Linying',113.94,33.81,'cf',2,false],
    ['Xuchang',113.82,34.03,'cf',3,false],
    ['Yanling',114.20,34.10,'cf',2,false],
    ['Zhumadian',114.02,32.98,'cf',3,false],
    ['Xinyang',114.09,32.13,'cf',3,false],
    ['Nanyang',112.54,32.99,'eu',3,false],
    ['Zhenping',112.23,33.04,'eu',2,false],
    ['Dengzhou',112.08,32.68,'eu',3,false],
    ['Fangcheng',113.01,33.26,'eu',2,false],
    ['Tanghe',112.84,32.70,'eu',2,false],
    ['Xichuan',111.49,33.14,'eu',2,false]
  ];
  const RIVERS={
    YellowRiver:[[109.05,34.66],[109.5,34.75],[110.05,34.8],[110.50,34.78],
      [110.92,34.78],[111.18,34.86],[111.41,34.95],[111.75,34.99],
      [112.07,34.93],[112.34,34.96],[112.59,34.98],[112.85,34.87],
      [113.06,34.93],[113.40,34.96],[113.64,34.99],[113.99,34.98],
      [114.31,34.96],[114.62,34.94],[115.02,34.96],[115.52,35.00],
      [116.03,35.03],[116.44,35.08],[117.06,35.13],[117.94,35.20]],
    LuoRiver:[[111.1,34.43],[111.64,34.41],[112.06,34.49],
      [112.45,34.60],[112.82,34.65],[113.01,34.78]],
    YiRiver:[[112.18,33.90],[112.31,34.20],[112.43,34.44],[112.77,34.71]],
    QinRiver:[[112.80,35.47],[112.96,35.24],[113.25,35.09],[113.48,34.97]],
    HuaiRiver:[[113.06,32.36],[113.65,32.43],[114.10,32.52],
      [114.54,32.71],[115.10,32.94]]
  };
  // The Yellow River is a real one-hex-wide water barrier, not an
  // impermeable peak wall; bridges/fords create strategic land corridors.
  // Off-bridge crossings remain possible with the standard transport rules.
  const CROSSINGS=[
    ['Sanmenxia Crossing',111.24,34.88],
    ['Mengjin Bridge',112.58,34.98],
    ['Gongyi Ford',113.06,34.93],
    ['Zhengzhou Railway Bridge',113.66,34.99],
    ['Kaifeng Crossing',114.35,34.96],
    ['Lankao Crossing',114.85,34.95]
  ];
  const RIDGES=[
    [109.5,33.75,1.7,.45],[110.6,33.72,1.5,.58],
    [111.5,33.95,1.1,.42],[112.20,33.45,1.3,.46],
    [112.8,34.45,.40,.25],[113.09,34.52,.38,.21],
    [112.25,35.60,.80,.62],[112.8,36.10,.75,.88],
    [113.32,36.42,.38,.62],[113.7,36.84,.35,.55],
    [109.45,35.60,.62,.75],[110.05,34.25,.6,.46]
  ];
  const WOODLANDS=[[111.0,33.98,1.1,.60],[112.10,33.36,.90,.55],
    [112.9,35.82,.38,.67],[110.6,35.80,.85,.55]];
  const LOWLANDS=[[113.95,34.45,2.15,.90],[114.70,35.13,1.5,.95],
    [112.44,34.64,.52,.21],[113.2,33.5,.85,.65],
    [114.30,36.25,.70,.55],[111.18,34.79,.75,.22]];
  // Operational routes across genuine, passable northern and southwestern axes.
  const FRONTS=[
    {name:"Northern Breakthrough",side:'eu',from:'Handan',objectives:["Xinxiang","Zhengzhou","Luoyang"]},
    {name:"Shanxi Flank",side:'eu',from:'Changzhi',objectives:["Jincheng","Jiyuan","Mengjin","Luoyang"]},
    {name:"Taihang Passes",side:'eu',from:'Linzhou',objectives:["Jiaozuo","Gongyi","Yanshi"]},
    {name:"Eastern Northern Screen",side:'eu',from:'Puyang',objectives:["Changyuan","Kaifeng","Zhengzhou"]},
    {name:"Nanyang Offensive",side:'eu',from:'Nanyang',objectives:["Pingdingshan","Ruzhou","Yichuan","Luoyang"]},
    {name:"Southwestern Basin",side:'eu',from:'Dengzhou',objectives:["Lushan","Songxian","Yiyang","Luoyang"]},
    {name:"Western Qinling Flank",side:'eu',from:'Xichuan',objectives:["Lushi","Sanmenxia","Mianchi","Luoyang"]},
    {name:"Capital Guard",side:'cf',from:'Luoyang',objectives:["Mengjin","Yanshi","Yichuan","Luoyang"]},
    {name:"Northern Counterattack",side:'cf',from:'Xinxiang',objectives:["Hebi","Anyang","Handan"]},
    {name:"Yellow River Defense",side:'cf',from:'Jiaozuo',objectives:["Jiyuan","Changzhi"]},
    {name:"Southwestern Counterattack",side:'cf',from:'Pingdingshan',objectives:["Nanyang","Dengzhou"]},
    {name:"Western River Defense",side:'cf',from:'Sanmenxia',objectives:["Lushi","Xichuan"]},
    {name:"Eastern Reserve",side:'cf',from:'Zhengzhou',objectives:["Kaifeng","Xinxiang","Luoyang"]}
  ];
  // Formations, not stack buffs: E.U. advances with field-army superiority.
  const ARMIES=[
    ['eu','Handan','heavy',12,'akito'],
    ['eu','Handan','rocket',7,'yukiya'],
    ['eu','Handan','assault',6,'ryo'],
    ['eu','Anyang','super',9,'leila'],
    ['eu','Anyang','siege',6,'smilas'],
    ['eu','Changzhi','heavy',9,'ayano'],
    ['eu','Changzhi','rocket',5,'anna'],
    ['eu','Linzhou','raider',6,'oscar'],
    ['eu','Hebi','heavy',7,'klaus'],
    ['eu','Hebi','support',3],
    ['eu','Puyang','heavy',8,'olivia'],
    ['eu','Puyang','rocket',5],
    ['eu','Yangquan','medium',3],
    ['eu','Tangyin','assault',4],
    ['eu','Nanyang','super',10,'eduardo'],
    ['eu','Nanyang','rocket',7,'ferilli'],
    ['eu','Nanyang','siege',6],
    ['eu','Dengzhou','heavy',8,'margaret'],
    ['eu','Dengzhou','assault',6,'pierre'],
    ['eu','Xichuan','heavy',7,'fernando'],
    ['eu','Xichuan','raider',4],
    ['eu','Zhenping','medium',4],
    ['eu','Fangcheng','heavy',5],
    ['eu','Tanghe','assault',4],
    ['eu','Neihuang','medium',4],
    ['eu','Qi County','support',3],
    ['cf','Xinxiang','super',4,'xingke'],
    ['cf','Xinxiang','rocket',4,'gaohai'],
    ['cf','Weihui','heavy',3],
    ['cf','Huojia','assault',2],
    ['cf','Jiaozuo','super',4,'honggu'],
    ['cf','Jiaozuo','siege',3],
    ['cf','Jincheng','heavy',3,'lifeng'],
    ['cf','Jiyuan','heavy',4],
    ['cf','Jiyuan','rocket',3],
    ['cf','Gongyi','super',4,'zhaohao'],
    ['cf','Gongyi','siege',3],
    ['cf','Zhengzhou','super',4,'chengzhong'],
    ['cf','Zhengzhou','rocket',4,'huangqian'],
    ['cf','Zhengzhou','assault',3],
    ['cf','Kaifeng','heavy',3,'leifeng'],
    ['cf','Kaifeng','siege',2],
    ['cf','Sanmenxia','super',4,'cao'],
    ['cf','Sanmenxia','rocket',3],
    ['cf','Mianchi','heavy',3],
    ['cf','Lingbao','assault',2],
    ['cf','Pingdingshan','super',4,'chaojielun'],
    ['cf','Pingdingshan','siege',3],
    ['cf','Ruzhou','heavy',3],
    ['cf','Dengfeng','heavy',3],
    ['cf','Dengfeng','rocket',2],
    ['cf','Luoyang','super',5],
    ['cf','Luoyang','siege',4],
    ['cf','Luoyang','assault',3],
    ['cf','Mengjin','super',4],
    ['cf','Mengjin','rocket',3],
    ['cf','Yanshi','heavy',3],
    ['cf','Yanshi','siege',3],
    ['cf','Yichuan','medium',3],
    ['cf','Yiyang','medium',3],
    ['cf','Yima','rocket',2],
    ['cf','Xingyang','heavy',3],
    ['cf','Nanzhao','medium',2],
    ['cf','Lushan','rocket',2]
  ];
  const FUNDING={
    eu:{credits:1140,industry:720,science:110,sakuradite:54},
    cf:{credits:1190,industry:760,science:105,sakuradite:54}
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
  function landscape(p,c,r) {
    const relief=density(p,RIDGES),low=density(p,LOWLANDS),
      trees=density(p,WOODLANDS);
    const texture=((c*19+r*31+c*r%29)%53)/53;
    if(relief>.74&&low<.30)return 'peak';
    if(relief>.52&&low<.50)return 'mountain';
    if(relief>.25&&low<.5)return texture>.22?'mountain':'forest';
    return trees>.44||texture<.085&&low<.72?'forest':'plains';
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
  function polylineCells(points) {
    const coords=new Set();
    for(let k=1;k<points.length;k++){
      const a=locate(...points[k-1]),b=locate(...points[k]);
      const steps=Math.max(1,Math.ceil(E.distance(a,b)*4));
      for(let i=0;i<=steps;i++){
        const fraction=i/steps,
          point=locate(points[k-1][0]+(points[k][0]-points[k-1][0])*fraction,
            points[k-1][1]+(points[k][1]-points[k-1][1])*fraction);
        coords.add(point.r*COLS+point.c);
      }
    }
    return coords;
  }
  // Strengthen bridges rather than closing every riverbank. Their dry crossing
  // cells remain traversable by land forces; water cells support standard
  // unescorted transport crossing, so the river cannot hard-lock the war.
  function makeRiver(g) {
    const occupied=polylineCells(RIVERS.YellowRiver);
    for(const index of occupied){
      const t=g.tiles[index];if(t)t.terrain='sea';
    }
    for(const [name,lon,lat] of CROSSINGS){
      const p=locate(lon,lat),
        at=nearest(g,p,t=>t.terrain==='sea',5);
      if(!at)throw Error('Missing Yellow River crossing: '+name);
      at.terrain='coast';
      at.riverCrossing=name;
    }
    // The geometric bank is forest/rough only where it is not cultivated
    // lowland; city hexes and the six crossings are deliberately accessible.
    for(const t of g.tiles)if(t.terrain==='plains'&&!t.riverCrossing &&
      E.adjacent(g,t).some(n=>n.terrain==='sea')){
      const p=geo(t.c,t.r);
      if(density(p,LOWLANDS)<.48)t.terrain='forest';
    }
  }
  function openApproaches(g) {
    // Historic road/rail approach corridors into the central plain and Songshan
    // passes. Do not overwrite river water or designated bridge hexes.
    const roads=[
      [[114.49,36.61],[114.39,36.10],[114.27,35.75],[113.93,35.30]],
      [[112.85,35.5],[113.24,35.21],[113.62,34.75]],
      [[113.0,33.26],[113.3,33.74],[113.47,34.16],[113.02,34.45],[112.45,34.62]],
      [[112.54,32.99],[112.91,33.74],[112.84,34.17],[112.45,34.62]],
      [[115.65,34.45],[114.82,34.82],[114.30,34.80],[113.63,34.75]],
      [[111.49,33.14],[111.05,34.06],[111.19,34.77],[111.76,34.77],[112.45,34.62]],
      [[113.63,34.75],[112.98,34.75],[112.79,34.73],[112.45,34.62]]
    ];
    for(const road of roads)
      for(const i of polylineCells(road)){
        const t=g.tiles[i];
        if(t&&t.terrain!=='sea'&&!t.riverCrossing)t.terrain='plains';
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
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No reachable formations');}
  function create(player='eu',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported Luoyang faction '+player);
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
    g.scenario={id:ID,key:'eu-cf-luoyang-finale',title:'Battle of Luoyang — E.U. vs Federation',
      version:2,phase:'two-front-final-offensive',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,crossings:CROSSINGS,
      operationalFronts:FRONTS,capital:'Luoyang',
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
      if(!at)throw Error('Unreachable Luoyang theatre city: '+name);
      const capital=name==='Luoyang';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,
        owner,tier,capital,capitalOf:capital?'cf':null,fort:!!fort,
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
        if(cmd&&!g.officers[cmd])throw Error('Unknown Luoyang commander '+cmd);
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
    E.log(g,'Luoyang: E.U. armies converge from the north and southwest; the Federation holds its capital behind the Yellow River and defensive belts.',player);
    return g;
  }
  function onTurn(){return false;} // No scripted spawns or artificial deadlines.
  function objective(g,side=g.player){
    return 'Take every city in the Luoyang theatre ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+
      ' held). Luoyang alone is not sufficient; there is no turn limit.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city of the Luoyang campaign finale.'};
    return null;
  }
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>
      n+s.tier+(s.name==='Luoyang'?8:0),0);
  }
  const api={id:ID,title:'Battle of Luoyang — E.U. vs Federation',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMIES,
    rivers:RIVERS,crossings:CROSSINGS,operationalFronts:FRONTS,
    create,onTurn,objective,winner,strategicScore,orderGroup,geo,locate};
  api.meta={saveVersion:2,elite:true,eliteRosterOnly:true,
    map:{centreSampled:true,overlays:['yellowRiver'],homeZoom:5.1,overviewMarkers:true},
    // The older Luoyang guard switch assumes Britannian attackers, so do not
    // use it for E.U.; retain standard multi-front/defense and recovery AI.
    ai:{doctrine:'europe',recovery:true},
    text:{
      era:"Henan · E.U.–Federation World Campaign Finale",
      intro:"The E.U. converges from the north and southwest. Breach the Yellow River defense, seize Luoyang and conquer every Federation city without a turn limit.",
      diplomacy:"Two hostile factions, 83 inland cities and six playable bridge/fords. Eastern Henan is held by the Federation from the start.",
      elite:"Both factions use their own Elite Forces, the standard recruitment/research rules, and no unique combat buffs.",
      focus:{eu:"Anyang",cf:"Luoyang"}
    },
    blurbs:{
      eu:"Advance from the northern Shanxi/Hebei and southwestern Nanyang bridgeheads toward the fortified capital.",
      cf:"Hold successive defensive belts around Luoyang, protect river crossings and counterattack the divided E.U. offensives."
    }};
  E.scenarios={...(E.scenarios||{}),euCfLuoyang:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

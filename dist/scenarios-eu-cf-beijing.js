/* Battle of Beijing — E.U. southward offensive from Manchuria.
 * Self-contained Bohai land/water sampling, distinct ports, terrain corridors,
 * faction-correct forces, standard economy/elite rules and total conquest.
 * The shared campaign registry is deliberately not modified in this lane. */
(function(root){
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  const ID='eu-cf-beijing',KEY='euCfBeijing',SIDES=['eu','cf'];
  const COLS=176,ROWS=112;
  const BOUNDS={west:114.3,east:125.2,north:43.3,south:37.4};
  const K=Math.cos(40.35*Math.PI/180);
  const PROJECTION={centerLon:119.75,centerLat:40.35,angle:0,
    uMin:-5.45*K,uMax:5.45*K,vMin:-2.95,vMax:2.95};
  // Name, longitude, latitude, owner, industry tier, starting fortification.
  // The front is the Liaoxi corridor: EU holds southern Manchurian staging
  // territory; the Federation defends Hebei, Beijing and Tianjin.
  const CITIES=[
    ['Shenyang',123.43,41.80,'eu',3,true],
    ['Fushun',123.92,41.87,'eu',2,false],
    ['Tieling',123.84,42.29,'eu',2,false],
    ['Benxi',123.77,41.29,'eu',2,false],
    ['Liaoyang',123.24,41.27,'eu',3,false],
    ['Anshan',122.99,41.11,'eu',3,false],
    ['Panjin',122.07,41.12,'eu',2,false],
    ['Yingkou',122.24,40.67,'eu',3,true],
    ['Bayuquan',122.12,40.27,'eu',2,false],
    ['Jinzhou',121.13,41.10,'eu',3,true],
    ['Huludao',120.84,40.75,'eu',2,false],
    ['Fuxin',121.67,42.02,'eu',2,false],
    ['Chaoyang',120.45,41.57,'eu',3,false],
    ['Beipiao',120.77,41.80,'eu',2,false],
    ['Chifeng',118.96,42.27,'eu',3,false],
    ['Dalian',121.61,38.91,'eu',3,true],
    ['Lushun',121.26,38.81,'eu',2,false],
    ['Suizhong',120.33,40.32,'cf',2,true],
    ['Shanhaiguan',119.75,40.01,'cf',3,true],
    ['Qinhuangdao',119.60,39.94,'cf',3,true],
    ['Funing',119.25,39.89,'cf',2,true],
    ['Lulong',118.89,39.89,'cf',2,false],
    ['Qianan',118.70,40.00,'cf',2,true],
    ['Tangshan',118.18,39.63,'cf',3,true],
    ['Luanxian',118.70,39.74,'cf',2,true],
    ['Caofeidian',118.47,39.23,'cf',2,true],
    ['Zunhua',117.96,40.19,'cf',2,true],
    ['Chengde',117.94,40.97,'cf',3,true],
    ['Pingquan',118.70,40.99,'cf',2,true],
    ['Kuancheng',118.49,40.61,'cf',2,true],
    ['Xinglong',117.49,40.43,'cf',2,true],
    ['Weichang',117.76,41.93,'cf',2,true],
    ['Fengning',116.65,41.21,'cf',2,true],
    ['Beijing',116.41,39.91,'cf',3,true],
    ['Tongzhou',116.66,39.90,'cf',3,true],
    ['Changping',116.23,40.22,'cf',2,true],
    ['Huairou',116.63,40.32,'cf',2,true],
    ['Miyun',116.84,40.38,'cf',2,true],
    ['Yanqing',115.98,40.45,'cf',2,true],
    ['Mentougou',116.10,39.94,'cf',2,true],
    ['Fangshan',116.14,39.75,'cf',2,true],
    ['Tianjin',117.20,39.12,'cf',3,true],
    ['Tanggu',117.67,39.02,'cf',3,true],
    ['Hangu',117.80,39.24,'cf',2,true],
    ['Ninghe',117.82,39.34,'cf',2,false],
    ['Baodi',117.31,39.72,'cf',2,true],
    ['Wuqing',117.05,39.38,'cf',2,true],
    ['Langfang',116.69,39.52,'cf',3,true],
    ['Zhuozhou',116.00,39.49,'cf',2,true],
    ['Baoding',115.47,38.87,'cf',3,true],
    ['Renqiu',116.10,38.71,'cf',2,false],
    ['Cangzhou',116.83,38.30,'cf',3,true],
    ['Huanghua',117.33,38.37,'cf',2,true],
    ['Zhangjiakou',114.88,40.77,'cf',3,true],
    ['Xuanhua',115.06,40.60,'cf',2,true],
    ['Huailai',115.52,40.41,'cf',2,true]
  ];
  // Sea-only berths remain separate from their parent land cities.
  const PORTS={Yingkou:3,Bayuquan:2,Huludao:2,Dalian:3,Lushun:2,
    Qinhuangdao:3,Shanhaiguan:2,Caofeidian:2,Tanggu:3,Hangu:1,Huanghua:2};
  // Geographic coast of western/northern Bohai, Liaodong Bay, and the
  // Liaodong Peninsula; the last points extend out of the scenario viewport.
  // This intentionally has no invented ocean north of the Great Wall.
  const SEA_OUTLINE=[
    [117.23,37.0],[125.8,37.0],[125.8,40.0],[123.6,39.3],
    [122.65,39.5],[122.48,40.2],[122.28,40.60],
    [122.08,40.75],[121.72,40.70],[121.18,40.65],
    [120.78,40.72],[120.38,40.47],[120.10,40.23],
    [119.76,40.04],[119.36,39.88],[119.08,39.67],
    [118.73,39.61],[118.48,39.43],[118.09,39.22],
    [117.79,39.19],[117.68,39.02],[117.40,38.84],[117.23,38.66]
  ];
  const LIAODONG_PENINSULA=[
    [122.10,40.8],[122.31,40.53],[122.23,40.17],
    [122.00,39.76],[121.85,39.51],[121.71,39.28],
    [121.70,39.02],[121.57,38.81],[121.26,38.72],
    [121.16,38.84],[121.34,39.18],[121.40,39.49],
    [121.54,39.79],[121.72,40.08],[121.73,40.48]
  ];
  const RIDGES=[
    [115.12,40.55,1.22,.48],[116.15,40.68,1.05,.43],
    [117.13,40.66,1.03,.45],[118.03,40.93,.85,.46],
    [118.78,40.57,.65,.32],[119.65,40.53,.65,.29],
    [120.35,41.13,.68,.38],[116.12,39.93,.56,.32],
    [123.20,41.13,.58,.38]
  ];
  const WOODS=[[118.15,41.42,1.72,.72],[120.58,42.2,1.45,.60],
    [124.05,41.74,1.2,.66],[116.21,40.99,1.18,.51]];
  const PLAINS=[[118.49,39.60,1.05,.54],[116.82,39.35,1.37,.72],
    [121.25,41.1,1.1,.54],[123.2,41.65,1.24,.63]];
  const RIVERS={
    Liao:[[123.65,42.74],[123.22,42.29],[122.95,41.84],[122.44,41.50],[122.09,41.16]],
    Daling:[[120.36,42.12],[120.6,41.72],[120.84,41.39],[121.14,41.10],[121.45,40.92]],
    Luan:[[117.86,41.66],[118.29,40.82],[118.58,40.22],[118.72,39.83],[118.54,39.46]],
    Hai:[[116.34,39.96],[116.72,39.71],[117.08,39.35],[117.22,39.11],[117.64,39.06]],
    Yongding:[[115.24,40.34],[115.82,40.07],[116.21,39.94],[116.58,39.65],[116.73,39.44]]
  };
  const ROADS=[
    [[123.43,41.80],[122.99,41.11],[121.13,41.10],[120.84,40.75],[120.33,40.32],[119.75,40.01],[119.60,39.94],[118.18,39.63]],
    [[120.45,41.57],[118.96,42.27],[118.70,40.99],[117.94,40.97],[117.49,40.43],[116.84,40.38],[116.41,39.91]],
    [[121.13,41.10],[120.33,40.32],[119.75,40.01],[118.70,39.74],[118.18,39.63],[117.82,39.34],[117.20,39.12]],
    [[119.60,39.94],[118.89,39.89],[117.96,40.19],[117.31,39.72],[116.66,39.90],[116.41,39.91]],
    [[117.94,40.97],[117.49,40.43],[116.63,40.32],[116.41,39.91],[116.69,39.52],[117.20,39.12]],
    [[115.06,40.60],[115.52,40.41],[115.98,40.45],[116.23,40.22],[116.41,39.91]],
    [[116.00,39.49],[116.69,39.52],[117.05,39.38],[117.2,39.12],[116.83,38.30]]
  ];
  // Side, staging city, standing Army Group, class, formations, lead commander.
  const ARMIES=[
    ['eu','Jinzhou','Liaoxi Breakthrough','heavy',11,'akito'],
    ['eu','Jinzhou','Liaoxi Breakthrough','assault',9,'ryo'],
    ['eu','Jinzhou','Liaoxi Breakthrough','rocket',7,'yukiya'],
    ['eu','Huludao','Liaoxi Breakthrough','heavy',9,'ayano'],
    ['eu','Huludao','Liaoxi Breakthrough','siege',6],
    ['eu','Chaoyang','Northern Encirclement','heavy',8,'leila'],
    ['eu','Chaoyang','Northern Encirclement','medium',6,'oscar'],
    ['eu','Chifeng','Northern Encirclement','heavy',9,'smilas'],
    ['eu','Chifeng','Northern Encirclement','rocket',6,'eduardo'],
    ['eu','Beipiao','Northern Encirclement','raider',5],
    ['eu','Yingkou','Bohai Coastal Army','heavy',8,'romero'],
    ['eu','Yingkou','Bohai Coastal Army','assault',5,'olivia'],
    ['eu','Panjin','Bohai Coastal Army','medium',5],
    ['eu','Dalian','Bohai Amphibious Reserve','heavy',8,'pierre'],
    ['eu','Dalian','Bohai Amphibious Reserve','rocket',5,'ferilli'],
    ['eu','Dalian','Bohai Amphibious Reserve','assault',5],
    ['eu','Shenyang','Manchurian Reserve','heavy',8,'anna'],
    ['eu','Shenyang','Manchurian Reserve','rocket',5],
    ['eu','Liaoyang','Manchurian Reserve','medium',5],
    ['eu','Anshan','Manchurian Reserve','heavy',5],
    ['eu','Fuxin','Northern Encirclement','medium',6],
    ['eu','Fushun','Manchurian Reserve','support',4],
    ['cf','Shanhaiguan','Liaoxi Gate Defense','super',3,'xingke'],
    ['cf','Shanhaiguan','Liaoxi Gate Defense','rocket',3,'gaohai'],
    ['cf','Qinhuangdao','Liaoxi Gate Defense','heavy',4,'honggu'],
    ['cf','Suizhong','Liaoxi Gate Defense','assault',3],
    ['cf','Funing','Liaoxi Gate Defense','heavy',3],
    ['cf','Tangshan','Tangshan Industrial Army','super',4,'cao'],
    ['cf','Tangshan','Tangshan Industrial Army','rocket',3,'huangqian'],
    ['cf','Qianan','Tangshan Industrial Army','heavy',3],
    ['cf','Luanxian','Tangshan Industrial Army','medium',2],
    ['cf','Chengde','Great Wall Mountain Guard','super',3,'zhaohao'],
    ['cf','Chengde','Great Wall Mountain Guard','siege',2],
    ['cf','Pingquan','Great Wall Mountain Guard','heavy',3,'leifeng'],
    ['cf','Kuancheng','Great Wall Mountain Guard','rocket',2],
    ['cf','Zunhua','Great Wall Mountain Guard','heavy',3],
    ['cf','Xinglong','Great Wall Mountain Guard','medium',2],
    ['cf','Beijing','Capital Defense','super',4,'chengzhong'],
    ['cf','Beijing','Capital Defense','rocket',4,'xianglin'],
    ['cf','Beijing','Capital Defense','siege',3],
    ['cf','Tongzhou','Capital Defense','heavy',3,'meiling'],
    ['cf','Changping','Capital Defense','heavy',3],
    ['cf','Miyun','Capital Defense','rocket',2],
    ['cf','Tianjin','Hai River Defense','super',4,'lifeng'],
    ['cf','Tianjin','Hai River Defense','rocket',3],
    ['cf','Tanggu','Hai River Defense','heavy',3,'ren'],
    ['cf','Hangu','Hai River Defense','rocket',2],
    ['cf','Baodi','Hai River Defense','heavy',3],
    ['cf','Langfang','Southern Reserve','heavy',3],
    ['cf','Baoding','Southern Reserve','heavy',2],
    ['cf','Cangzhou','Southern Reserve','medium',3],
    ['cf','Zhangjiakou','Western Barrier','heavy',2],
    ['cf','Xuanhua','Western Barrier','rocket',2]
  ];
  const FLEETS=[
    ['eu','Dalian','eu_carrier',2],['eu','Dalian','panzer_frosch_ii',3],
    ['eu','Yingkou','eu_carrier',2],['eu','Yingkou','panzer_frosch_ii',3],
    ['eu','Huludao','panzer_frosch_ii',2],
    ['cf','Qinhuangdao','cf_carrier',2],['cf','Qinhuangdao','shui_gun_ru_ii',3],
    ['cf','Tanggu','cf_carrier',2],['cf','Tanggu','shui_gun_ru_ii',3],
    ['cf','Caofeidian','shui_gun_ru_ii',2]
  ];
  const FUNDING={eu:{credits:900,industry:560,science:85,sakuradite:40},
    cf:{credits:1050,industry:650,science:100,sakuradite:48}};
  function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
    lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round(
      (BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function inside(p,poly){
    let yes=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];
      if(((a[1]>p.lat)!==(b[1]>p.lat))&&
        p.lon<(b[0]-a[0])*(p.lat-a[1])/(b[1]-a[1])+a[0])yes=!yes;
    }
    return yes;
  }
  function seawater(p){
    return inside(p,SEA_OUTLINE)&&!inside(p,LIAODONG_PENINSULA);
  }
  function coastFraction(p){
    const dx=(BOUNDS.east-BOUNDS.west)/COLS,dy=(BOUNDS.north-BOUNDS.south)/ROWS;
    let land=0;
    // 9 footprint samples detect genuinely mixed land/water centres. Do not
    // inflate a coastal buffer over wholly dry hexes.
    for(const x of [-.38,0,.38])for(const y of [-.38,0,.38])
      if(!seawater({lon:p.lon+x*dx,lat:p.lat+y*dy}))land++;
    return land/9;
  }
  function density(p,areas){
    let best=0;
    for(const [x,y,w,h] of areas)
      best=Math.max(best,Math.exp(-1.6*(((p.lon-x)*K/w)**2+((p.lat-y)/h)**2)));
    return best;
  }
  function riverDistance(p){
    let best=Infinity;
    for(const line of Object.values(RIVERS))for(let j=1;j<line.length;j++){
      const a=line[j-1],b=line[j],vx=(b[0]-a[0])*K,vy=b[1]-a[1],
        px=(p.lon-a[0])*K,py=p.lat-a[1];
      const f=Math.max(0,Math.min(1,(px*vx+py*vy)/(vx*vx+vy*vy||1)));
      best=Math.min(best,Math.hypot(px-f*vx,py-f*vy));
    }
    return best;
  }
  function landscape(p,c,r){
    const high=density(p,RIDGES),plain=density(p,PLAINS);
    if(high>.66&&plain<.46)return 'mountain';
    if(high>.37&&plain<.48)return 'forest';
    if(density(p,WOODS)>.46&&plain<.5)return 'forest';
    if(riverDistance(p)<.055&&plain<.6)return 'forest';
    return 'plains';
  }
  function nearest(g,p,valid,radius=12){
    let at=null,best=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(ROWS-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(COLS-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!valid(t))continue;
        const d=E.distance(p,t,g);
        if(d<best){best=d;at=t;}
      }
    return at;
  }
  function lineCells(line){
    const out=new Set();
    for(let j=1;j<line.length;j++){
      const a=locate(...line[j-1]),b=locate(...line[j]),
        steps=Math.max(1,Math.ceil(E.distance(a,b)*3));
      for(let k=0;k<=steps;k++){
        const f=k/steps,p=locate(
          line[j-1][0]+f*(line[j][0]-line[j-1][0]),
          line[j-1][1]+f*(line[j][1]-line[j-1][1]));
        out.add(p.r*COLS+p.c);
      }
    }
    return out;
  }
  function orderGroup(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const group=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
    if(!group)return {ok:false,reason:'Unknown Army Group'};
    const dest=E.tile(g,target.c,target.r);
    if(!dest)return {ok:false,reason:'Outside the scenario map'};
    let assigned=0,failed=0;
    for(const uid of group.units){
      const u=g.units.find(v=>v.id===uid&&v.hp>0&&v.side===g.player);
      if(!u)continue;
      const ship=!!E.TYPES[u.type]?.naval;
      const goal=ship&&dest.terrain!=='sea'
        ?nearest(g,dest,t=>t.terrain==='sea',14):dest;
      const result=goal&&E.setGoto(g,u.id,goal.c,goal.r);
      if(result?.ok)assigned++;else failed++;
    }
    if(assigned)group.destination={c:target.c,r:target.r};
    return {ok:assigned>0,assigned,failed,
      reason:assigned?'':'No reachable formation can accept the order'};
  }
  function create(player='eu',difficulty='normal',seed=201712){
    if(!SIDES.includes(player))throw Error('Unknown Beijing faction '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,
      player,difficulty,mode:'scenario',era:ID,
      order:[player,...SIDES.filter(s=>s!==player)],seed,wrap:false,
      cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{eu:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},lineup:{cf:{...E.LINEUPS.cf2017}}};
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:ID,key:KEY,title:'Battle of Beijing',version:1,
      phase:'manchurian-southward-offensive',aiDoctrine:'europe',
      groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
      rivers:RIVERS,roads:ROADS,ports:PORTS,capital:'Beijing',
      offensiveAxes:{
        eu:{
          'Liaoxi Breakthrough':['Suizhong','Shanhaiguan','Qinhuangdao','Tangshan','Tianjin'],
          'Northern Encirclement':['Pingquan','Chengde','Miyun','Beijing'],
          'Bohai Coastal Army':['Caofeidian','Tanggu','Tianjin','Langfang','Beijing']
        },
        cf:{
          'Liaoxi Gate Defense':['Huludao','Jinzhou','Panjin','Shenyang'],
          'Great Wall Mountain Guard':['Chaoyang','Chifeng'],
          'Hai River Defense':['Yingkou','Anshan','Shenyang']
        }
      },totalConquest:true,turnLimit:null};
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      Object.keys(E.ELITE_FORCES).filter(id=>
        !E.ELITE_FORCES[id].scenarioOnly&&E.ELITE_FORCES[id].availableTo.includes(side))]));
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),fraction=coastFraction(p);
      const land=fraction>=.5;
      return {c,r,owner:null,terrain:land?
        (fraction<.8?'coast':landscape(p,c,r)):'sea'};
    });
    // Keep the Great Wall routes, Shanhaiguan gate and mountain roads fully
    // traversable for both attacking and counterattacking ground forces.
    for(const road of ROADS)for(const i of lineCells(road)){
      const t=g.tiles[i];if(t&&t.terrain!=='sea')t.terrain='plains';
    }
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const isPort=Object.prototype.hasOwnProperty.call(PORTS,name);
      const p=locate(lon,lat);
      const t=nearest(g,p,v=>v.terrain!=='sea'&&v.terrain!=='peak'&&
        !E.stationAt(g,v)&&
        (!isPort||E.adjacent(g,v).some(n=>n.terrain==='sea')),isPort?13:8);
      if(!t)throw Error('Invalid Beijing city / harbour: '+name);
      const capital=name==='Beijing'||name==='Tianjin'||name==='Shenyang';
      const shield=E.scenarioCityDefenseHP(tier,!!fort,name);
      g.stations.push({id:g.stations.length,name,c:t.c,r:t.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Fortified Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?54:tier===3?33:20)*.58),
        industry:Math.round((capital?36:8*tier)*.58),
        science:Math.max(1,Math.round((tier+2)*.58)),producedTurn:0});
    }
    // Stable nearest-city provinces never claim sea. 176x112 tiles and only
    // 56 cities keep this simple approach small and fast on mobile.
    for(const t of g.tiles){
      if(t.terrain==='sea')continue;
      let best=Infinity,nearestCity=null;
      for(const s of g.stations){
        const dx=(t.c-s.c),dy=(t.r-s.r),d=dx*dx+dy*dy;
        if(d<best){best=d;nearestCity=s;}
      }
      t.owner=nearestCity.owner;t.provinceCity=nearestCity.id;
    }
    const portHexes=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(x=>x.name===name);
      const water=E.adjacent(g,s).filter(t=>
        t.terrain==='sea'&&!portHexes.has(E.key(t))).
        sort((a,b)=>E.adjacent(g,b).filter(n=>n.terrain==='sea').length-
          E.adjacent(g,a).filter(n=>n.terrain==='sea').length)[0];
      if(!water)throw Error('No independent port water hex: '+name);
      s.portAt={c:water.c,r:water.r};s.portOwner=s.owner;s.portLevel=level;
      portHexes.add(E.key(water));
    }
    const groups=new Map();
    function group(side,name,origin){
      const key=side+':'+name;
      if(!groups.has(key)){
        const v={id:'army-'+groups.size,side,name,origin,units:[]};
        groups.set(key,v);g.scenario.groups.push(v);
      }
      return groups.get(key);
    }
    for(const [side,base,formation,cls,count,commander] of ARMIES){
      const s=g.stations.find(v=>v.name===base&&v.owner===side);
      if(!s)throw Error('Invalid Beijing army deployment: '+base+'/'+side);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&
          !E.TERRAIN[t.terrain]?.blocked&&t.owner===side&&
          !E.unitAt(g,t)&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),17);
        if(!at)throw Error('Army cannot deploy at '+base);
        const cmd=i===0?commander:null;
        if(cmd&&!g.officers[cmd])throw Error('Unknown Beijing commander '+cmd);
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
        if(cmd){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group(side,formation,base).units.push(u.id);
      }
    }
    for(const [side,base,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===base&&v.owner===side);
      if(!s||!E.TYPES[type]?.naval)throw Error('Invalid Beijing fleet: '+base+'/'+type);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !portHexes.has(E.key(t)),18);
        if(!at)throw Error('No clear Bohai fleet deployment near '+base);
        const u=E.newUnit(g,type,side,at.c,at.r);
        group(side,base+' Flotilla',base).units.push(u.id);
      }
    }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const current=E.income(g,side),desired=FUNDING[side];
      g.scenario.funding[side]=Object.fromEntries(Object.entries(desired).map(
        ([type,amount])=>[type,Math.max(0,Math.round(amount)-current[type])]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(desired))
        g.economy[side][resource]=actual[resource]*2;
    }
    if(difficulty==='hard'||difficulty==='challenge'){
      g.units.filter(u=>u.side!==player&&!E.TYPES[u.type]?.naval).forEach(u=>E.addDifficultyFrames(u,difficulty));
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(side=>[
      side,g.units.filter(u=>u.side===side).length]));
    E.log(g,'The E.U. advances from Manchuria through Shanhaiguan and the Great Wall approaches. The Federation defends Tangshan, Beijing and Tianjin while both fleets contest the Bohai Sea. Total conquest decides the campaign.',player);
    return g;
  }
  function onTurn(){return false;}
  function objective(g,side=g.player){
    return 'Capture every Beijing–Tianjin theatre city ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+
      ' held). No turn-limit victory.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' controls all cities in the Beijing theatre.'};
    return null;
  }
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((sum,s)=>sum+s.tier+
      (s.name==='Beijing'?8:s.name==='Tianjin'?4:0),0);
  }
  const api={id:ID,title:'Battle of Beijing',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMIES,
    fleetData:FLEETS,ports:PORTS,rivers:RIVERS,roads:ROADS,
    create,onTurn,objective,winner,strategicScore,orderGroup,geo,locate};
  api.meta={elite:true,saveVersion:1,terrainCosts:{mountain:2},
    map:{centreSampled:true,coastBuffer:0,overlays:['regionalRivers'],overviewMarkers:true},
    ai:{doctrine:'europe',recovery:true,routeBias:'eu',
      operationalAxes:{invader:'eu',defender:'cf',
        axes:{
          'Liaoxi Breakthrough':['Suizhong','Shanhaiguan','Qinhuangdao','Tangshan'],
          'Northern Encirclement':['Pingquan','Chengde','Miyun','Beijing'],
          'Bohai Coastal Army':['Caofeidian','Tanggu','Tianjin'],
          'Capital Defense':['Shanhaiguan','Tangshan'],
          'Hai River Defense':['Tanggu','Tianjin']
        },defenderHubs:['Beijing','Tangshan','Tianjin','Chengde']}},
    text:{terrain:'Great Wall highlands cost extra movement; Shanhaiguan and the mapped mountain roads remain passable.',
      era:'Northern China · E.U.–Federation Campaign',
      intro:'From Manchuria, the E.U. drives south through the Liaoxi corridor towards Beijing and Tianjin. Defended mountain gateways, industrial cities and the Bohai coast create three linked fronts. No turn limit.',
      diplomacy:'Only the E.U. and Chinese Federation are hostile. Independent capturable harbours provide naval counterplay; factories and the normal research economy operate on both sides.',
      elite:'Elite difficulty uses the established faction Elite Forces and rival commander rules, without scenario-only weapons or reward overrides.',
      focus:{eu:'Jinzhou',cf:'Beijing'}},
    blurbs:{
      eu:'Force the Shanhaiguan gate, outflank the Great Wall via Chengde and use the Bohai flotillas to threaten Tianjin.',
      cf:'Hold the mountain approaches and Tangshan factories; concentrate reserves around Beijing and Tianjin before counterattacking Manchuria.'
    }};
  E.scenarios={...(E.scenarios||{}),[KEY]:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

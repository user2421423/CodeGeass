/* Battle for Moscow: Federation advance from the Volga against the E.U.
 * Standalone two-sided inland theatre; WGS84 city / reservoir positions.
 * No fabricated coastline, no deadline and no modified engine/campaign files. */
(function(root){
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  const ID='cf-eu-moscow',KEY='cfEuMoscow',SIDES=['cf','eu'];
  const COLS=160,ROWS=100;
  const BOUNDS={west:31.4,east:50.9,north:60.0,south:52.0};
  const K=Math.cos(56*Math.PI/180);
  const PROJECTION={centerLon:41.15,centerLat:56,angle:0,
    uMin:-9.75*K,uMax:9.75*K,vMin:-4,vMax:4};
  // [name, longitude, latitude, controller, industrial tier, fortified].
  // Faction control is alternate-history; settlements are real geographic sites.
  const CITIES=[
    ['Kazan',49.1064,55.7961,'cf',3,true],
    ['Chistopol',50.6436,55.3723,'cf',2,false],
    ['Kirov',49.668,58.6036,'cf',3,true],
    ['Kotelnich',48.348,58.3034,'cf',2,false],
    ['Sharya',45.5156,58.3762,'cf',2,false],
    ['Yoshkar-Ola',47.8958,56.6328,'cf',2,false],
    ['Cheboksary',47.2519,56.1439,'cf',3,true],
    ['Alatyr',46.5812,54.8422,'cf',2,false],
    ['Ulyanovsk',48.4026,54.3142,'cf',3,false],
    ['Saransk',45.1838,54.1874,'cf',3,true],
    ['Penza',45.017,53.2007,'cf',3,false],
    ['Sergach',45.468,55.53,'cf',2,false],
    ['Arzamas',43.8157,55.3866,'cf',2,true],
    ['Nizhny Novgorod',44.002,56.3287,'cf',3,true],
    ['Gorodets',43.4722,56.6448,'cf',2,true],
    ['Yuryevets',43.1086,57.3229,'cf',2,false],
    ['Murom',42.0464,55.575,'cf',2,true],
    ['Kineshma',42.1358,57.4425,'eu',2,true],
    ['Kostroma',40.9269,57.7679,'eu',3,true],
    ['Ivanovo',40.9739,56.9994,'eu',3,true],
    ['Kovrov',41.319,56.357,'eu',2,true],
    ['Vladimir',40.3966,56.1291,'eu',3,true],
    ['Gus-Khrustalny',40.651,55.616,'eu',2,false],
    ['Kasimov',41.397,54.937,'eu',2,true],
    ['Ryazan',39.7231,54.6292,'eu',3,true],
    ['Tula',37.6173,54.1931,'eu',3,true],
    ['Kolomna',38.7784,55.0794,'eu',2,true],
    ['Yaroslavl',39.8938,57.6261,'eu',3,true],
    ['Rybinsk',38.8354,58.0485,'eu',3,true],
    ['Poshekhonye',39.121,58.501,'eu',2,true],
    ['Rostov Veliky',39.414,57.185,'eu',2,false],
    ['Pereslavl-Zalessky',38.856,56.737,'eu',2,false],
    ['Vologda',39.8915,59.2205,'eu',3,true],
    ['Cherepovets',37.9086,59.1277,'eu',3,false],
    ['Tver',35.9119,56.8587,'eu',3,true],
    ['Rzhev',34.3282,56.2629,'eu',2,true],
    ['Torzhok',34.9622,57.0413,'eu',2,false],
    ['Dubna',37.167,56.733,'eu',2,true],
    ['Dmitrov',37.527,56.344,'eu',2,true],
    ['Klin',36.7287,56.3317,'eu',2,true],
    ['Sergiyev Posad',38.136,56.3,'eu',2,true],
    ['Moscow',37.6173,55.7558,'eu',3,true],
    ['Khimki',37.43,55.89,'eu',2,true],
    ['Mytishchi',37.74,55.91,'eu',2,true],
    ['Lyubertsy',37.89,55.68,'eu',2,true],
    ['Podolsk',37.54,55.43,'eu',3,true],
    ['Mozhaysk',36.03,55.5,'eu',2,true],
    ['Zvenigorod',36.85,55.73,'eu',2,true],
    ['Serpukhov',37.4125,54.9136,'eu',2,true],
    ['Kashira',38.15,54.83,'eu',2,true],
    ['Kaluga',36.2612,54.5138,'eu',3,true],
    ['Vyazma',34.2984,55.2116,'eu',2,true],
    ['Smolensk',32.0453,54.7826,'eu',3,true],
    ['Bryansk',34.3668,53.2436,'eu',3,false],
    ['Oryol',36.06,52.96,'eu',3,true],
    ['Yelets',38.5,52.63,'eu',2,false]
  ];
  // Russia is landlocked here. The ONLY sea-classified tiles are limited
  // navigable reservoir water on the real Volga. Berths are separate sea
  // hexes and cannot be confused with ocean ports or sea passages.
  const WATER={
    Rybinsk:[
      [37.74,58.34],[37.90,58.11],[38.24,58.06],[38.66,58.17],
      [38.80,58.10],[38.97,58.18],[38.89,58.30],[39.06,58.56],[39.13,58.85],[38.90,59.0],
      [38.54,58.82],[38.15,58.73],[37.78,58.57]
    ],
    Gorky:[
      [42.52,57.43],[42.78,57.48],[43.04,57.33],[43.27,57.13],
      [43.55,56.97],[43.80,56.79],[43.65,56.65],[43.43,56.76],
      [43.17,56.98],[42.85,57.16],[42.56,57.28]
    ]
  };
  const PORTS={Gorodets:2,Yuryevets:2,Rybinsk:3,Poshekhonye:2};
  const FLEETS=[
    ['cf','Gorodets','shui_gun_ru_ii',2],
    ['cf','Yuryevets','shui_gun_ru_ii',2],
    ['eu','Rybinsk','panzer_frosch_ii',2],
    ['eu','Poshekhonye','panzer_frosch_ii',2]
  ];
  // Rivers draw true strategic axes; narrower waterways stay LAND at this
  // resolution so ordinary bridges and ground crossings are never blocked.
  const RIVERS={
    Volga:[[35.91,56.86],[37.17,56.73],[38.31,57.53],[38.84,58.05],
      [39.89,57.63],[40.93,57.77],[42.14,57.44],[43.11,57.32],
      [43.47,56.65],[44.0,56.33],[47.25,56.14],[49.11,55.80]],
    Oka:[[35.62,54.42],[36.26,54.51],[37.41,54.91],
      [38.78,55.08],[39.72,54.63],[41.40,54.94],[42.05,55.58],[44.0,56.33]],
    Moskva:[[36.03,55.5],[36.85,55.73],[37.62,55.76],[37.89,55.68],[38.78,55.08]],
    Klyazma:[[37.9,56.12],[39.1,56.2],[40.4,56.13],[41.32,56.36],[42.05,55.58]],
    Dnieper:[[34.85,55.82],[34.3,55.21],[32.05,54.78],[31.7,54.15]]
  };
  const ROADS=[
    [[49.1,55.8],[47.25,56.14],[44,56.33],[41.32,56.36],[40.4,56.13],[38.14,56.3],[37.62,55.76]],
    [[48.35,58.30],[45.52,58.38],[43.11,57.32],[42.14,57.44],[40.93,57.77],[39.89,57.63],[37.17,56.73],[37.62,55.76]],
    [[45.18,54.19],[43.82,55.39],[42.05,55.58],[41.4,54.94],[39.72,54.63],[38.78,55.08],[37.62,55.76]],
    [[45.02,53.2],[41.4,54.94],[39.72,54.63],[37.62,54.19],[37.54,55.43],[37.62,55.76]],
    [[40.93,57.77],[40.97,57.0],[40.4,56.13],[38.14,56.3],[37.62,55.76]],
    [[39.89,59.22],[39.89,57.63],[38.84,58.05],[37.17,56.73],[35.91,56.86],[34.33,56.26]]
  ];
  const BRIDGES=['Nizhny Novgorod','Murom','Kasimov','Ryazan','Kolomna',
    'Serpukhov','Dubna','Tver','Kostroma','Yaroslavl','Rybinsk'];
  const WOODS=[[35.0,57.5,2.5,1.2],[37.6,59.3,2.8,1.1],
    [41.4,58.8,3.7,1.4],[45.9,59.1,3.8,1.1],[40.5,56.7,2.4,.8],
    [34.1,55.7,2.7,1.0],[39.4,53.6,2.1,.75]];
  // [faction, staging city, Army Group name, class, formation count, commander].
  // 3 distinct Chinese approaches and E.U. forward / inner / rear belts.
  const ARMIES=[
    ['cf','Kazan','Northern Volga Army','heavy',14,'xingke'],
    ['cf','Kazan','Northern Volga Army','rocket',10,'gaohai'],
    ['cf','Kirov','Northern Volga Army','heavy',11,'honggu'],
    ['cf','Kotelnich','Northern Volga Army','medium',6],
    ['cf','Sharya','Northern Volga Army','raider',7],
    ['cf','Yuryevets','Northern Volga Army','rocket',5],
    ['cf','Cheboksary','Central Breakthrough Army','heavy',14,'cao'],
    ['cf','Cheboksary','Central Breakthrough Army','assault',6],
    ['cf','Nizhny Novgorod','Central Breakthrough Army','super',7,'zhaohao'],
    ['cf','Nizhny Novgorod','Central Breakthrough Army','siege',8],
    ['cf','Nizhny Novgorod','Central Breakthrough Army','rocket',7],
    ['cf','Gorodets','Central Breakthrough Army','support',5],
    ['cf','Arzamas','Central Breakthrough Army','heavy',12,'meiling'],
    ['cf','Saransk','Southern Encirclement Army','heavy',13,'leifeng'],
    ['cf','Saransk','Southern Encirclement Army','rocket',8,'huangqian'],
    ['cf','Penza','Southern Encirclement Army','assault',10],
    ['cf','Murom','Southern Encirclement Army','heavy',11,'lifeng'],
    ['cf','Sergach','Southern Encirclement Army','medium',6],
    ['cf','Alatyr','Southern Encirclement Army','rocket',5],
    ['cf','Ulyanovsk','Volga Strategic Reserve','heavy',6,'chengzhong'],
    ['cf','Yoshkar-Ola','Volga Strategic Reserve','medium',5],
    ['cf','Chistopol','Volga Strategic Reserve','assault',4],
    ['eu','Kineshma','Upper Volga Forward Line','heavy',5,'akito'],
    ['eu','Kineshma','Upper Volga Forward Line','rocket',3,'yukiya'],
    ['eu','Kostroma','Upper Volga Forward Line','heavy',6,'leila'],
    ['eu','Kostroma','Upper Volga Forward Line','siege',3],
    ['eu','Ivanovo','Northern Blocking Army','heavy',5,'ayano'],
    ['eu','Kovrov','Northern Blocking Army','medium',4],
    ['eu','Vladimir','Vladimir Defensive Line','heavy',7,'smilas'],
    ['eu','Vladimir','Vladimir Defensive Line','rocket',5,'anna'],
    ['eu','Gus-Khrustalny','Vladimir Defensive Line','support',3],
    ['eu','Kasimov','Oka Defensive Line','heavy',4,'oscar'],
    ['eu','Ryazan','Oka Defensive Line','heavy',7,'olivia'],
    ['eu','Ryazan','Oka Defensive Line','rocket',4],
    ['eu','Tula','Southern Bastion','heavy',6,'ryo'],
    ['eu','Tula','Southern Bastion','rocket',4],
    ['eu','Yaroslavl','Northern Reserve','heavy',5,'fernando'],
    ['eu','Yaroslavl','Northern Reserve','rocket',3],
    ['eu','Tver','Western Volga Reserve','heavy',5,'klaus'],
    ['eu','Tver','Western Volga Reserve','siege',3],
    ['eu','Moscow','Moscow Garrison','heavy',9,'romero'],
    ['eu','Moscow','Moscow Garrison','rocket',5,'pierre'],
    ['eu','Moscow','Moscow Garrison','siege',4],
    ['eu','Podolsk','Moscow Outer Ring','heavy',5,'marirrosa'],
    ['eu','Kolomna','Moscow Outer Ring','assault',4],
    ['eu','Sergiyev Posad','Moscow Outer Ring','heavy',4],
    ['eu','Dmitrov','Moscow Outer Ring','medium',3],
    ['eu','Klin','Moscow Outer Ring','medium',3],
    ['eu','Kaluga','Southwestern Reserve','heavy',4,'eduardo'],
    ['eu','Smolensk','Southwestern Reserve','medium',3],
    ['eu','Rybinsk','Reservoir Guard','medium',3],
    ['eu','Vologda','Northern Reserve','medium',3],
    ['eu','Oryol','Southern Bastion','assault',4]
  ];
  const FUNDING={
    cf:{credits:1080,industry:710,science:115,sakuradite:60},
    eu:{credits:910,industry:600,science:110,sakuradite:56}
  };
  function geo(c,r){
    return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
      lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};
  }
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round(
      (BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function inside(lon,lat,poly){
    let yes=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];
      if((a[1]>lat)!==(b[1]>lat)&&
        lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])yes=!yes;
    }
    return yes;
  }
  function water(p){
    return Object.values(WATER).some(poly=>inside(p.lon,p.lat,poly));
  }
  function coastFraction(p){
    const dx=(BOUNDS.east-BOUNDS.west)/COLS,dy=(BOUNDS.north-BOUNDS.south)/ROWS;
    let land=0;
    for(const x of [-.38,0,.38])for(const y of [-.38,0,.38])
      if(!water({lon:p.lon+x*dx,lat:p.lat+y*dy}))land++;
    return land/9;
  }
  function density(p,areas){
    let best=0;
    for(const [lon,lat,w,h] of areas){
      const dx=(p.lon-lon)*K/w,dy=(p.lat-lat)/h;
      best=Math.max(best,Math.exp(-1.6*(dx*dx+dy*dy)));
    }
    return best;
  }
  function landscape(p,c,r){
    const forest=density(p,WOODS);
    // Central Russia's mixed woods and lowlands; no fictitious mountains.
    if(forest>.48||forest>.28&&(c*17+r*13)%11<6)return 'forest';
    if((c*7+r*11)%31<3&&p.lat>56.7)return 'forest';
    return 'plains';
  }
  function nearest(g,p,predicate,radius=12){
    let best=null,dist=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(ROWS-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(COLS-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!predicate(t))continue;
        const d=E.distance(p,t,g);
        if(d<dist){dist=d;best=t;}
      }
    return best;
  }
  function lineCells(line){
    const out=new Set();
    for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i];
      const steps=Math.max(1,Math.ceil(E.distance(locate(...a),locate(...b))*3));
      for(let k=0;k<=steps;k++){
        const f=k/steps,p=locate(a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1]));
        out.add(p.r*COLS+p.c);
      }
    }
    return out;
  }
  function orderGroup(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)
      return {ok:false,reason:'Not your turn'};
    const group=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
    if(!group)return {ok:false,reason:'Army Group not found'};
    const dest=E.tile(g,target.c,target.r);
    if(!dest)return {ok:false,reason:'Outside map'};
    let assigned=0,failed=0;
    for(const unitId of group.units){
      const u=g.units.find(v=>v.id===unitId&&v.hp>0&&v.side===g.player);
      if(!u)continue;
      const goal=E.TYPES[u.type]?.naval&&dest.terrain!=='sea'
        ?nearest(g,dest,t=>t.terrain==='sea',14):dest;
      const result=goal&&E.setGoto(g,u.id,goal.c,goal.r);
      if(result?.ok)assigned++;else failed++;
    }
    if(assigned)group.destination={c:target.c,r:target.r};
    return {ok:assigned>0,assigned,failed,
      reason:assigned?'':'No eligible formation can reach the destination'};
  }
  function create(player='cf',difficulty='normal',seed=201709){
    if(!SIDES.includes(player))throw Error('Unsupported Moscow side: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))
      difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,
      player,difficulty,mode:'scenario',era:ID,
      order:[player,...SIDES.filter(s=>s!==player)],seed,wrap:false,
      cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(id=>[id,E.defaultOfficer(id)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{cf:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},lineup:{cf:{...E.LINEUPS.cf2017}}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[side]={};
    }
    g.scenario={id:ID,key:KEY,title:'Battle for Moscow',version:1,
      phase:'volga-to-moscow-offensive',aiDoctrine:'europe',
      groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
      rivers:RIVERS,roads:ROADS,bridges:BRIDGES,ports:PORTS,
      offensiveAxes:{
        cf:{
          'Northern Volga Army':['Kineshma','Kostroma','Yaroslavl','Tver','Moscow'],
          'Central Breakthrough Army':['Kovrov','Vladimir','Sergiyev Posad','Moscow'],
          'Southern Encirclement Army':['Kasimov','Ryazan','Kolomna','Tula','Moscow'],
          'Volga Strategic Reserve':['Vladimir','Moscow']
        },
        eu:{
          'Upper Volga Forward Line':['Yuryevets','Gorodets','Nizhny Novgorod','Cheboksary'],
          'Vladimir Defensive Line':['Murom','Arzamas','Saransk','Penza'],
          'Oka Defensive Line':['Murom','Arzamas','Nizhny Novgorod'],
          'Southern Bastion':['Saransk','Penza','Ulyanovsk'],
          'Moscow Garrison':['Vladimir','Nizhny Novgorod']
        }
      },totalConquest:true,turnLimit:null};
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[
      side,Object.keys(E.ELITE_FORCES).filter(id=>
        !E.ELITE_FORCES[id].scenarioOnly&&E.ELITE_FORCES[id].availableTo.includes(side))
    ]));
    g.tiles=Array.from({length:COLS*ROWS},(_,index)=>{
      const c=index%COLS,r=(index/COLS)|0,p=geo(c,r),
        fraction=coastFraction(p);
      return {c,r,owner:null,terrain:fraction<.5?'sea':
        fraction<.8?'coast':landscape(p,c,r)};
    });
    // Mapped transport routes preserve traversable land on the central
    // plain without carving invented land bridges through reservoirs.
    for(const road of ROADS)for(const i of lineCells(road)){
      const t=g.tiles[i];if(t&&t.terrain!=='sea')t.terrain='plains';
    }
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const isPort=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        !E.stationAt(g,t)&&(!isPort||E.adjacent(g,t).some(n=>n.terrain==='sea')),
        isPort?15:10);
      if(!at)throw Error('Moscow city placement failed: '+name);
      const capital=name==='Moscow'||name==='Nizhny Novgorod'||name==='Kazan';
      const shield=E.scenarioCityDefenseHP(tier,!!fort,name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,
        owner,tier,capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?54:tier===3?34:14+7*tier)*.62),
        industry:Math.round((capital?36:8*tier)*.62),
        science:Math.max(1,Math.round((tier+2)*.62)),
        producedTurn:0});
    }
    // Provincial borders are nearest real city, never random ownership and
    // never across a reservoir. Sea and unowned water stay unclaimable land.
    for(const t of g.tiles){
      if(t.terrain==='sea')continue;
      let best=Infinity,nearestCity=null;
      for(const s of g.stations){
        const dx=t.c-s.c,dy=t.r-s.r,d=dx*dx+dy*dy;
        if(d<best){best=d;nearestCity=s;}
      }
      t.owner=nearestCity.owner;t.provinceCity=nearestCity.id;
    }
    // Independent sea-cell port berths; two genuine inland-water basins.
    const usedPorts=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const berth=E.adjacent(g,s).filter(t=>
        t.terrain==='sea'&&!usedPorts.has(E.key(t))).
        sort((a,b)=>E.adjacent(g,b).filter(t=>t.terrain==='sea').length-
          E.adjacent(g,a).filter(t=>t.terrain==='sea').length)[0];
      if(!berth)throw Error('Moscow independent port inaccessible: '+name);
      s.portAt={c:berth.c,r:berth.r};
      s.portOwner=s.owner;s.portLevel=level;
      usedPorts.add(E.key(berth));
    }
    const groups=new Map();
    function group(side,name,origin){
      const key=side+':'+name;
      if(!groups.has(key)){
        const gr={id:'army-'+groups.size,side,name,origin,units:[]};
        groups.set(key,gr);g.scenario.groups.push(gr);
      }
      return groups.get(key);
    }
    for(const [side,base,formation,cls,count,commander] of ARMIES){
      const city=g.stations.find(s=>s.name===base&&s.owner===side);
      if(!city)throw Error('Bad Moscow Army Group origin: '+base);
      if(commander&&!g.officers[commander])
        throw Error('Unknown Moscow commander: '+commander);
      for(let i=0;i<count;i++){
        const at=nearest(g,city,t=>t.terrain!=='sea'&&
          !E.TERRAIN[t.terrain]?.blocked&&t.owner===side&&
          !E.unitAt(g,t)&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),20);
        if(!at)throw Error('Not enough Moscow deployment hexes: '+base);
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
        if(cmd){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group(side,formation,base).units.push(u.id);
      }
    }
    for(const [side,base,type,count] of FLEETS){
      const city=g.stations.find(s=>s.name===base&&s.owner===side);
      if(!city||!E.TYPES[type]?.naval)
        throw Error('Invalid Moscow river flotilla: '+base+'/'+type);
      for(let i=0;i<count;i++){
        const at=nearest(g,city,t=>t.terrain==='sea'&&
          !E.unitAt(g,t)&&!usedPorts.has(E.key(t)),17);
        if(!at)throw Error('Insufficient reservoir water: '+base);
        const u=E.newUnit(g,type,side,at.c,at.r);
        group(side,base+' Reservoir Flotilla',base).units.push(u.id);
      }
    }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const current=E.income(g,side),desired=FUNDING[side];
      g.scenario.funding[side]=Object.fromEntries(Object.entries(desired).
        map(([type,n])=>[type,Math.max(0,Math.round(n)-current[type])]));
      const income=E.income(g,side);
      for(const resource of Object.keys(desired))
        g.economy[side][resource]=({"cf":{"credits":2000,"industry":500,"science":230},"eu":{"credits":1820,"industry":500,"science":220}}[side]||{})[resource] ?? (income[resource]*2);
    }
    if(difficulty==='hard'||difficulty==='challenge'){
      g.units.filter(u=>u.side!==player&&!E.TYPES[u.type]?.naval).
        forEach(u=>E.addDifficultyFrames(u,difficulty));
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(side=>[
      side,g.units.filter(u=>u.side===side).length]));
    E.log(g,'The Federation advances from the Volga on three axes. E.U. outer lines, Moscow factories and deep reserves defend the capital; only complete conquest ends the battle.',player);
    return g;
  }
  function onTurn(){return false;}
  function objective(g,side=g.player){
    return 'Capture every Moscow theatre city ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+
      ' controlled). Moscow is the capital objective; no turn limit.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' controls all cities in the Moscow theatre.'};
    return null;
  }
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>
      n+s.tier+(s.name==='Moscow'?10:s.name==='Nizhny Novgorod'?4:0),0);
  }
  const api={id:ID,title:'Battle for Moscow',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMIES,
    riverData:RIVERS,rivers:RIVERS,roads:ROADS,bridges:BRIDGES,
    ports:PORTS,reservoirs:WATER,fleetData:FLEETS,
    geo,locate,coastFractionAt(c,r){return coastFraction(geo(c,r));},
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={
    elite:true,saveVersion:1,
    map:{centreSampled:true,coastBuffer:0,
      overlays:['regionalRivers'],overviewMarkers:true,homeZoom:2.3},
    ai:{doctrine:'europe',recovery:true,routeBias:'cf',
      operationalAxes:{invader:'cf',defender:'eu',
        axes:{
          'Northern Volga Army':['Kineshma','Kostroma','Yaroslavl','Tver','Moscow'],
          'Central Breakthrough Army':['Kovrov','Vladimir','Sergiyev Posad','Moscow'],
          'Southern Encirclement Army':['Kasimov','Ryazan','Kolomna','Tula','Moscow'],
          'Vladimir Defensive Line':['Murom','Arzamas','Nizhny Novgorod'],
          'Oka Defensive Line':['Murom','Arzamas','Saransk'],
          'Moscow Garrison':['Vladimir','Nizhny Novgorod']
        },
        defenderHubs:['Moscow','Vladimir','Ryazan','Tula','Kostroma','Yaroslavl']}},
    text:{
      era:'Western Russia · Federation–E.U. Campaign',
      intro:'After the Volga campaign, Chinese Army Groups press toward Moscow via the northern river towns, Vladimir and the southern Oka corridor. The E.U. fights from successive fortified belts. Every city must fall; there is no deadline.',
      diplomacy:'Only Federation and E.U. forces contest this inland theatre. Volga reservoirs support limited local flotillas; no fictional sea route or St. Petersburg objective.',
      elite:'Eligible faction Elite Forces, the usual opponent commander upgrades, research, HQ limits and rewards follow standard scenario rules.',
      focus:{cf:'Nizhny Novgorod',eu:'Moscow'}
    },
    blurbs:{
      cf:'Use three converging axes, protect the Nizhny industrial base, take Vladimir and Ryazan, then encircle the heavily fortified Moscow core.',
      eu:'Delay the advance at Kineshma, Vladimir, Ryazan and Tula; preserve Moscow industry, deploy reserves and counterattack the exposed Volga staging cities.'
    }
  };
  E.scenarios={...(E.scenarios||{}),[KEY]:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

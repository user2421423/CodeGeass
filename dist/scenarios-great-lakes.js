/* Battle for the Great Lakes — post-Canada Europian push into Britannian industry.
   176 × 112 geographic hex battlefield; all five Great Lakes are navigable.
   Standard faction units, independent capturable harbours and total conquest. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=176,ROWS=112,SIDES=['eu','britannia'];
  const BOUNDS={west:-93.4,east:-75.4,north:49.2,south:40.4};
  const K=Math.cos(44.8*Math.PI/180);
  const PROJECTION={centerLon:-84.4,centerLat:44.8,angle:0,uMin:-9*K,uMax:9*K,vMin:-4.4,vMax:4.4};
  // Military formations and factories are alternate history. Coordinates are real locations.
  const CITIES=[["Thunder Bay",-89.2477,48.3809,"eu",3,true],["Sault Ste. Marie",-84.3461,46.5219,"eu",3,true],["Sudbury",-80.993,46.49,"eu",3,true],["North Bay",-79.46,46.31,"eu",2,true],["Toronto",-79.3832,43.6532,"eu",3,true],["Hamilton",-79.8711,43.2557,"eu",3,true],["London",-81.2453,42.9849,"eu",3,true],["Windsor",-83.0364,42.3149,"eu",3,true],["Kingston",-76.4813,44.2312,"eu",3,true],["Oshawa",-78.8658,43.8971,"eu",2,false],["Kitchener",-80.4777,43.4516,"eu",2,true],["Barrie",-79.6903,44.3894,"eu",2,false],["Peterborough",-78.3197,44.3091,"eu",2,false],["Owen Sound",-80.9356,44.5679,"eu",2,true],["Sarnia",-82.4066,42.9745,"eu",2,true],["St. Catharines",-79.2483,43.1594,"eu",2,true],["Belleville",-77.3832,44.1628,"eu",2,false],["Brantford",-80.2644,43.1394,"eu",2,false],["Duluth",-92.1005,46.7867,"britannia",3,true],["Superior",-92.1041,46.7208,"britannia",2,false],["Ashland",-90.8838,46.5924,"britannia",2,false],["Marquette",-87.3954,46.5436,"britannia",3,true],["Escanaba",-87.0646,45.7452,"britannia",2,false],["Green Bay",-88.0198,44.5133,"britannia",3,true],["Milwaukee",-87.9065,43.0389,"britannia",3,true],["Racine",-87.7829,42.7261,"britannia",2,false],["Kenosha",-87.8212,42.5847,"britannia",2,false],["Waukegan",-87.8448,42.3636,"britannia",2,false],["Chicago",-87.6298,41.8781,"britannia",3,true],["Gary",-87.3464,41.5934,"britannia",3,true],["South Bend",-86.251,41.6764,"britannia",2,false],["Grand Rapids",-85.6681,42.9634,"britannia",3,true],["Holland",-86.1089,42.7875,"britannia",2,false],["Muskegon",-86.2484,43.2342,"britannia",2,false],["Traverse City",-85.6206,44.7631,"britannia",2,false],["Petoskey",-84.9553,45.3733,"britannia",2,false],["Lansing",-84.5555,42.7325,"britannia",3,true],["Flint",-83.6875,43.0125,"britannia",2,true],["Bay City",-83.8889,43.5945,"britannia",2,false],["Detroit",-83.0458,42.3314,"britannia",3,true],["Pontiac",-83.291,42.6389,"britannia",2,true],["Ann Arbor",-83.743,42.2808,"britannia",2,true],["Port Huron",-82.4249,42.9709,"britannia",2,true],["Alpena",-83.4327,45.0617,"britannia",2,false],["Toledo",-83.5552,41.6639,"britannia",3,true],["Sandusky",-82.7079,41.4489,"britannia",2,true],["Cleveland",-81.6944,41.4993,"britannia",3,true],["Lorain",-82.1824,41.4528,"britannia",2,false],["Akron",-81.519,41.0814,"britannia",2,true],["Youngstown",-80.6495,41.0998,"britannia",2,true],["Ashtabula",-80.7898,41.8651,"britannia",2,false],["Erie",-80.0851,42.1292,"britannia",3,true],["Buffalo",-78.8784,42.8864,"britannia",3,true],["Rochester",-77.6109,43.1566,"britannia",3,true],["Syracuse",-76.1474,43.0481,"britannia",2,false],["Kalamazoo",-85.5872,42.2917,"britannia",2,false]];
  const ARMY_GROUPS=[["eu","Thunder Bay","heavy",4,"akito"],["eu","Thunder Bay","rocket",3,"yukiya"],["eu","Thunder Bay","assault",3,"ryo"],["eu","Thunder Bay","siege",2],["eu","Sault Ste. Marie","heavy",4,"ayano"],["eu","Sault Ste. Marie","assault",3],["eu","Sault Ste. Marie","rocket",3],["eu","Sudbury","heavy",4,"smilas"],["eu","Sudbury","medium",3,"klaus"],["eu","North Bay","raider",3],["eu","Toronto","heavy",5,"leila"],["eu","Toronto","siege",3],["eu","Toronto","rocket",4],["eu","Toronto","assault",3],["eu","Hamilton","heavy",4,"oscar"],["eu","Hamilton","medium",3],["eu","Hamilton","support",2],["eu","London","heavy",4,"fernando"],["eu","London","rocket",3],["eu","London","assault",3],["eu","Windsor","heavy",5,"olivia"],["eu","Windsor","siege",3],["eu","Windsor","assault",3],["eu","Kingston","heavy",4,"anna"],["eu","Kingston","medium",3],["eu","Kingston","rocket",3],["eu","Sarnia","heavy",3],["eu","Oshawa","assault",3],["eu","Kitchener","medium",3],["eu","Owen Sound","medium",3],["eu","St. Catharines","assault",3],["britannia","Chicago","heavy",5,"cornelia"],["britannia","Chicago","siege",3],["britannia","Chicago","rocket",4],["britannia","Detroit","heavy",5,"bismarck"],["britannia","Detroit","siege",3],["britannia","Detroit","assault",3],["britannia","Cleveland","heavy",5,"guilford"],["britannia","Cleveland","rocket",3],["britannia","Cleveland","medium",4],["britannia","Buffalo","heavy",4,"suzaku"],["britannia","Buffalo","rocket",3],["britannia","Toledo","heavy",4,"darlton"],["britannia","Toledo","siege",3],["britannia","Milwaukee","heavy",4,"gino"],["britannia","Milwaukee","rocket",3],["britannia","Green Bay","heavy",3,"villetta"],["britannia","Duluth","heavy",3,"jeremiah"],["britannia","Marquette","medium",3,"oldrin"],["britannia","Marquette","rocket",2],["britannia","Lansing","heavy",3],["britannia","Lansing","support",2],["britannia","Grand Rapids","heavy",3],["britannia","Grand Rapids","rocket",3],["britannia","Rochester","medium",3],["britannia","Rochester","rocket",2],["britannia","Erie","medium",3],["britannia","Port Huron","heavy",3],["britannia","Flint","medium",3],["britannia","Ann Arbor","assault",3],["britannia","Gary","assault",3],["britannia","Akron","medium",3],["britannia","Youngstown","rocket",2],["britannia","Sandusky","assault",3],["britannia","Kalamazoo","medium",2],["eu","Thunder Bay","heavy",4],["eu","Thunder Bay","rocket",4],["eu","Sault Ste. Marie","heavy",4],["eu","Sault Ste. Marie","siege",3],["eu","Toronto","heavy",4],["eu","Toronto","rocket",4],["eu","Toronto","assault",3],["eu","Windsor","heavy",5],["eu","Windsor","rocket",3],["eu","Hamilton","heavy",4],["eu","Hamilton","assault",3],["eu","Kingston","medium",4],["eu","Kingston","siege",3],["eu","London","medium",4],["eu","London","rocket",3]];
  const PORTS={"Thunder Bay":3,"Sault Ste. Marie":3,"Toronto":3,"Hamilton":2,"Windsor":3,"Kingston":3,"Owen Sound":2,"Sarnia":2,"St. Catharines":2,"Duluth":3,"Marquette":3,"Milwaukee":3,"Chicago":3,"Muskegon":2,"Traverse City":2,"Port Huron":3,"Alpena":2,"Toledo":3,"Cleveland":3,"Sandusky":2,"Erie":3,"Buffalo":3,"Rochester":3,"Escanaba":2,"Detroit":3};
  const FLEETS=[["eu","Thunder Bay","eu_carrier",2],["eu","Sault Ste. Marie","eu_carrier",2],["eu","Sault Ste. Marie","panzer_frosch_ii",3],["eu","Owen Sound","panzer_frosch_ii",2],["eu","Windsor","eu_carrier",2],["eu","Windsor","panzer_frosch",2],["eu","Toronto","eu_carrier",2],["eu","Kingston","panzer_frosch_ii",2],["eu","St. Catharines","panzer_frosch",2],["britannia","Duluth","carrier_battleship",2],["britannia","Marquette","portman_ii",2],["britannia","Chicago","carrier_battleship",2],["britannia","Milwaukee","portman_ii",2],["britannia","Port Huron","carrier_battleship",2],["britannia","Alpena","portman_ii",2],["britannia","Cleveland","carrier_battleship",2],["britannia","Toledo","portman_ii",2],["britannia","Buffalo","portman_ii",2],["britannia","Rochester","carrier_battleship",2]];
  const FUNDING={britannia:{credits:760,industry:460,science:74,sakuradite:42},
    eu:{credits:1020,industry:520,science:84,sakuradite:48}};
  function geo(c,r){
    return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
      lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};
  }
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function nearest(g,p,valid,radius=9){return E.nearestTile(g,p,valid,radius);}
  // Uplands, northern forests and the urbanized industrial corridor.
  const MOUNTAINS=[[-88.5,46.1,2,.65],[-86.9,46.25,1.0,.56],[-85.1,46.5,1.5,.8],
    [-81.4,46.4,1.6,.6],[-79.5,45.2,1.1,.7]];
  const FORESTS=[[-89.5,47.4,3,1.2],[-85.6,46.8,2.7,1.1],[-83.8,45.0,2.4,.6],
    [-81.8,45.5,2.8,1.0],[-77.5,44.3,1.2,.7]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS);
    if(mountain>.8)return 'mountain';
    if(mountain>.48||forest>.52)return 'forest';
    return ((c*29+r*17)%37<3&&p.lat>44.6)?'forest':'plains';
  }
  const RIVERS={"StClair":[[-82.43,42.98],[-82.55,42.65]],"Detroit":[[-82.85,42.38],[-83.08,42.25],[-83.15,41.9]],"Niagara":[[-79.09,42.86],[-79.04,43.1],[-79.07,43.28]],"StLawrence":[[-76.47,44.18],[-76.05,44.3],[-75.62,44.48]],"GrandRiver":[[-80.72,43.65],[-80.22,43.38],[-79.89,43.24]],"Maumee":[[-84.8,41.55],[-84.07,41.56],[-83.47,41.66]]};
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
  function geographicLakes(){
    return root.GREAT_LAKES_GEOGRAPHY||(typeof require==='function'?
      require('./great-lakes-geography.js'):null);
  }
  function create(player='eu',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported Great Lakes faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'eu-great-lakes',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'eu-great-lakes',key:'great-lakes',title:'Battle for the Great Lakes',
      phase:'northern-lake-offensive',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,
      lakes:geographicLakes().lakes,channels:geographicLakes().channels,
      operationalFronts:[
        {name:'Upper Lakes',side:'eu',from:'Thunder Bay',objectives:['Duluth','Marquette','Milwaukee']},
        {name:'Mackinac Crossing',side:'eu',from:'Sault Ste. Marie',objectives:['Alpena','Lansing','Grand Rapids']},
        {name:'Detroit-Windsor Corridor',side:'eu',from:'Windsor',objectives:['Detroit','Toledo','Chicago']},
        {name:'Lake Erie Industrial Belt',side:'eu',from:'Hamilton',objectives:['Buffalo','Cleveland','Erie']},
        {name:'Lake Ontario Offensive',side:'eu',from:'Kingston',objectives:['Rochester','Syracuse']}
      ]};
    // Britannia uses compatible Britannian Elite Forces for this
    // scenario only. No global HQ, Conquest, or Japan access is changed.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    // Sample lake polygons in WGS84 instead of treating inland freshwater as land.
    const geography=geographicLakes();
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),water=geography.waterFraction(c,r);
      // 20–80% shoreline: mixed hex, available to amphibious units.
      const channel=geography.channelAt(p.lon,p.lat,1.35);
      const terrain=channel||water>.80?'sea':water>=.20?'coast':landscape(p,c,r);
      return {c,r,owner:null,terrain,waterFraction:water};
    });
    // Guarantee a continuous narrow sea route along each navigable lock/river.
    for(const line of Object.values(geography.channels))for(let j=1;j<line.length;j++){
      const a=line[j-1],b=line[j],steps=Math.ceil(Math.hypot(
        (b[0]-a[0])*COLS/(BOUNDS.east-BOUNDS.west),
        (b[1]-a[1])*ROWS/(BOUNDS.north-BOUNDS.south))*5);
      for(let n=0;n<=steps;n++){
        const p=locate(a[0]+(b[0]-a[0])*n/steps,a[1]+(b[1]-a[1])*n/steps);
        const t=E.tile(g,p.c,p.r);if(t)t.terrain='sea';
      }
    }
    // All five lakes must be reachable by ship. No broad water shortcuts.
    const navigable=t=>t.terrain==='sea';
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),7);
      if(!at)throw Error('Cannot place Great Lakes city '+name);
      const capital=name==='Toronto'||name==='Chicago'||name==='Detroit';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
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
      if(!s||s.owner!==side)throw Error('Invalid Great Lakes staging city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),10);
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
      if(!at)throw Error('Cannot place navigable Great Lakes port '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      taken.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!E.TYPES[type]?.naval)throw Error('Invalid Great Lakes fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),10);
        if(!at)throw Error('Cannot deploy navy at '+name);
        fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
      }
      g.scenario.groups.push(fleet);
    }
    // The entire connected regional sea stays navigable for fleets.
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=({"britannia":{"credits":1520,"industry":500,"science":148},"eu":{"credits":2000,"industry":500,"science":168}}[side]||{})[resource] ?? (actual[resource]*2);
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>v!==player))
        for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
          E.addDifficultyFrames(u,difficulty);
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Following the Canadian campaign, Europia advances across the five Great Lakes toward Chicago, Detroit and Cleveland, while Britannian fleets and industrial garrisons resist.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Great Lakes theatre cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='eu-great-lakes'||
      g.stations.length!==CITIES.length)return null;
    // The E.U. expedition stays in play while any of its units survive, carried ones included.
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side)&&
      (side==='eu'||!E.allUnits(g).some(u=>u.side==='eu'&&u.hp>0)))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Great Lakes theatre.'};
    return null;
  }
  const api={id:'eu-great-lakes',title:'Battle for the Great Lakes',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,ports:PORTS,rivers:RIVERS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,overlays:['lakes']},
    elite:true,expeditionSide:'eu',
    text:{
      era:"Great Lakes · Alternate 2017",
      intro:"After conquering Canada, Europia invades the Britannian Great Lakes industrial heartland. Fight across all five navigable lakes and seize all 56 cities without a turn limit.",
      diplomacy:"E.U. and Britannia are hostile from turn 1. Mackinac, St. Marys, Detroit and St. Clair are navigable. The Welland Canal bypasses Niagara Falls. Harbours can be captured separately.",
      elite:"Elite Great Lakes converts eligible land formations to established faction Elite Forces; naval vessels remain conventional and enemy aces gain their normal Elite bonuses.",
      focus:{
        eu:"Toronto",
        britannia:"Detroit"
      }
    },
    blurbs:{
      eu:"Lead five coordinated offensives out of Ontario. Cross the inland seas, break Detroit and Buffalo, then take Chicago and the industrial belt.",
      britannia:"Defend Chicago, Detroit, Cleveland and Buffalo with heavy formations, fortified cities, shipborne reserves and inland fleets."
    }};
  E.scenarios={...(E.scenarios||{}),greatLakes:api,
    byId:{...(E.scenarios?.byId||{}),'eu-great-lakes':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

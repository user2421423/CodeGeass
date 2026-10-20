/* Federation vs E.U. — Invasion of the Caucasus. Scenario-owned tactical module.
 * Geographic coordinates WGS84; fictional alternate-history territorial control.
 * Caspian and Black Sea are distinct enclosed sea components on this map.
 * The shared manifest/campaign registry is intentionally left to the integrator. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='cf-eu-caucasus', KEY='cfEuCaucasus', SIDES=['cf','eu'];
const COLS=164, ROWS=114;
const BOUNDS={west:37.1,east:51.9,north:46.65,south:37.05};
const CLAT=41.85, K=Math.cos(CLAT*Math.PI/180);
const PROJECTION={centerLon:44.5,centerLat:CLAT,angle:0,
  uMin:-7.4*K,uMax:7.4*K,vMin:-4.8,vMax:4.8};
const CITIES=[["Tabriz",46.29,38.08,"cf",3,1],["Khoy",44.95,38.55,"cf",2,1],["Urmia",45.07,37.55,"cf",3,1],["Maku",44.48,39.29,"cf",2,1],["Jolfa",45.63,38.94,"cf",2,1],["Maragheh",46.24,37.39,"cf",2,0],["Ahar",47.07,38.48,"cf",2,1],["Ardabil",48.3,38.25,"cf",3,1],["Parsabad",47.92,39.65,"cf",2,1],["Bilasuvar",48.46,39.46,"cf",2,1],["Astara",48.87,38.45,"cf",2,1],["Lankaran",48.85,38.75,"cf",3,1],["Rasht",49.59,37.28,"cf",3,0],["Van",43.38,38.49,"cf",3,1],["Igdir",44.05,39.93,"eu",2,1],["Dogubayazit",44.09,39.55,"eu",2,1],["Kars",43.1,40.6,"eu",3,1],["Artvin",41.82,41.18,"eu",2,1],["Hopa",41.44,41.39,"eu",2,1],["Nakhchivan",45.42,39.21,"eu",3,1],["Goris",46.34,39.51,"eu",2,1],["Yerevan",44.51,40.18,"eu",3,1],["Gyumri",43.85,40.79,"eu",3,1],["Vanadzor",44.49,40.81,"eu",2,1],["Dilijan",44.86,40.74,"eu",2,0],["Batumi",41.64,41.65,"eu",3,1],["Poti",41.67,42.15,"eu",3,1],["Kutaisi",42.7,42.27,"eu",3,1],["Zugdidi",41.87,42.51,"eu",2,0],["Akhaltsikhe",42.99,41.64,"eu",2,1],["Akhalkalaki",43.49,41.4,"eu",2,1],["Gori",44.11,41.98,"eu",3,1],["Tbilisi",44.8,41.72,"eu",3,1],["Telavi",45.48,41.92,"eu",2,1],["Stepantsminda",44.64,42.66,"eu",2,1],["Oni",43.44,42.58,"eu",2,0],["Qazax",45.36,41.09,"eu",2,1],["Ganja",46.36,40.68,"eu",3,1],["Shamkir",46.02,40.83,"eu",2,0],["Mingachevir",47.06,40.77,"eu",3,1],["Yevlakh",47.15,40.62,"eu",2,0],["Shaki",47.17,41.19,"eu",2,1],["Gabala",47.85,40.98,"eu",2,0],["Shamakhi",48.64,40.63,"eu",2,1],["Baku",49.89,40.38,"eu",3,1],["Sumqayit",49.67,40.59,"eu",3,1],["Quba",48.51,41.36,"eu",2,1],["Qusar",48.43,41.43,"eu",2,1],["Derbent",48.29,42.06,"eu",3,1],["Makhachkala",47.5,42.98,"eu",3,1],["Khasavyurt",46.59,43.25,"eu",2,1],["Kizlyar",46.71,43.85,"eu",2,0],["Grozny",45.7,43.32,"eu",3,1],["Vladikavkaz",44.68,43.04,"eu",3,1],["Nalchik",43.61,43.48,"eu",3,1],["Pyatigorsk",43.06,44.05,"eu",3,1],["Kislovodsk",42.72,43.91,"eu",2,1],["Cherkessk",42.05,44.23,"eu",2,0],["Stavropol",41.97,45.04,"eu",3,1],["Armavir",41.12,45,"eu",3,0],["Krasnodar",38.98,45.04,"eu",3,1],["Sochi",39.72,43.59,"eu",3,1],["Tuapse",39.08,44.1,"eu",2,1],["Novorossiysk",37.77,44.72,"eu",3,1],["Elista",44.27,46.31,"eu",2,0],["Astrakhan",48.04,46.35,"eu",3,1],["Budyonnovsk",44.15,44.78,"eu",2,0]];
const ARMY_GROUPS=[["cf","Van","Western Persia Army","heavy",9,"zhaohao"],["cf","Van","Western Persia Army","rocket",4,null],["cf","Maku","Western Persia Army","assault",7,"meiling"],["cf","Tabriz","Aras Breakthrough","heavy",12,"honggu"],["cf","Tabriz","Aras Breakthrough","rocket",7,"leifeng"],["cf","Jolfa","Aras Breakthrough","assault",6,null],["cf","Khoy","Aras Breakthrough","medium",4,null],["cf","Ardabil","Kura Offensive","heavy",10,"gaohai"],["cf","Ardabil","Kura Offensive","rocket",7,"cao"],["cf","Ahar","Kura Offensive","assault",5,null],["cf","Parsabad","Kura Offensive","medium",4,null],["cf","Lankaran","Caspian Coastal Army","heavy",11,"xingke"],["cf","Lankaran","Caspian Coastal Army","rocket",5,"xianglin"],["cf","Bilasuvar","Caspian Coastal Army","assault",7,null],["cf","Astara","Caspian Coastal Army","medium",4,null],["cf","Urmia","Persian Mobile Reserve","heavy",6,"lifeng"],["cf","Urmia","Persian Mobile Reserve","rocket",4,null],["cf","Maragheh","Persian Mobile Reserve","assault",4,null],["cf","Rasht","Caspian Reserve","medium",5,"ren"],["eu","Yerevan","Armenian Fortress Corps","heavy",5,"leila"],["eu","Yerevan","Armenian Fortress Corps","rocket",5,"akito"],["eu","Goris","Armenian Fortress Corps","assault",3,null],["eu","Nakhchivan","Aras Border Guard","heavy",4,"ayano"],["eu","Nakhchivan","Aras Border Guard","rocket",3,null],["eu","Kars","Anatolian Border Corps","heavy",5,"olivia"],["eu","Kars","Anatolian Border Corps","siege",3,null],["eu","Tbilisi","Georgian Defensive Line","heavy",6,"smilas"],["eu","Tbilisi","Georgian Defensive Line","rocket",4,"yukiya"],["eu","Gori","Georgian Defensive Line","medium",5,null],["eu","Kutaisi","Western Georgia Corps","heavy",4,"ryo"],["eu","Batumi","Western Georgia Corps","assault",4,null],["eu","Baku","Caspian Fortress Corps","heavy",6,"fernando"],["eu","Baku","Caspian Fortress Corps","rocket",4,"anna"],["eu","Sumqayit","Caspian Fortress Corps","medium",4,null],["eu","Ganja","Kura Reserve","heavy",5,"pierre"],["eu","Mingachevir","Kura Reserve","rocket",4,null],["eu","Vladikavkaz","Darial Defense","heavy",5,"marirrosa"],["eu","Vladikavkaz","Darial Defense","rocket",4,null],["eu","Nalchik","Western Pass Guard","heavy",3,"oscar"],["eu","Derbent","Caspian Mountain Gate","heavy",4,"margaret"],["eu","Makhachkala","Caspian Mountain Gate","rocket",4,null],["eu","Grozny","North Caucasus Reserve","heavy",4,"klaus"],["eu","Pyatigorsk","North Caucasus Reserve","heavy",4,null],["eu","Stavropol","North Caucasus Reserve","rocket",3,null],["eu","Krasnodar","Black Sea Reserve","heavy",3,"eduardo"],["eu","Astrakhan","Lower Volga Reserve","medium",3,null]];
const PORTS={"Astara":2,"Lankaran":3,"Baku":3,"Sumqayit":2,"Derbent":2,"Makhachkala":3,"Astrakhan":2,"Batumi":3,"Poti":2,"Sochi":2,"Tuapse":2,"Novorossiysk":3};
const FLEETS=[["cf","Astara","shui_gun_ru_ii",2],["cf","Lankaran","cf_carrier",1],["cf","Lankaran","shui_gun_ru_ii",2],["eu","Baku","eu_carrier",1],["eu","Baku","panzer_frosch_ii",2],["eu","Makhachkala","panzer_frosch_ii",2],["eu","Batumi","eu_carrier",1],["eu","Poti","panzer_frosch_ii",2],["eu","Novorossiysk","panzer_frosch_ii",2]];
const FUNDING={cf:{credits:1000,industry:660,science:108,sakuradite:64},
  eu:{credits:980,industry:620,science:106,sakuradite:62}};
// Approximate mapped shores are separate and do not imply a Caspian–Black Sea canal.
const CASPIAN_SHORE=[[37.0,49.55],[38.0,49.06],[38.65,48.84],
  [39.4,49.03],[40.0,49.54],[40.36,49.79],[40.75,49.22],
  [41.25,48.84],[42.06,48.32],[43.0,47.53],[43.8,47.12],
  [44.5,46.89],[45.2,46.92],[46.0,47.43],[46.65,47.64]];
const BLACK_SEA_SHORE=[[40.50,41.55],[41.3,41.55],[41.7,41.66],
  [42.1,41.69],[42.6,41.19],[43.0,40.5],[43.5,39.8],
  [44.0,39.2],[44.5,38.1],[44.9,37.2],[45.1,37.0]];
// Greater Caucasus ridge: Abkhazia -> Elbrus -> Kazbek -> Dagestan.
const RIDGE=[[39.75,43.52],[40.5,43.35],[41.5,43.24],[42.45,43.32],
  [43.48,42.67],[44.65,42.72],[45.40,42.52],[46.3,42.14],
  [47.3,41.72],[48.0,41.60]];
// Roki, Mamison and Darial connect Georgia to the north; western Klukhor
// and eastern Derbent corridors provide genuinely different approaches.
const PASSES=[['Klukhor',41.67,43.24,.61],['Roki',43.55,42.62,.60],
  ['Mamison',43.77,42.72,.59],['Darial',44.64,42.72,.61],
  ['Caspian Gate',48.25,41.72,.80]];
const RIVERS={
  Kura:[[43.2,41.28],[44.1,41.79],[44.8,41.70],[45.45,41.45],
    [46.4,40.9],[47.15,40.60],[48.0,40.30],[49.25,39.45]],
  Aras:[[43.0,39.57],[44.1,39.6],[45.42,39.20],[46.6,39.35],
    [47.9,39.56],[48.8,39.5]],
  Terek:[[44.67,42.82],[44.68,43.04],[45.15,43.29],[46.2,43.5],
    [46.8,43.8],[47.25,43.7]],
  Rioni:[[43.4,42.6],[42.7,42.27],[41.95,42.2],[41.65,42.15]],
  Kuban:[[42.0,43.8],[41.8,44.2],[41.1,44.62],[40.3,45.1],[38.9,45.3]]
};
const BRIDGE_CITIES=['Tbilisi','Gori','Mingachevir','Yevlakh',
  'Vladikavkaz','Grozny','Kutaisi','Jolfa','Nakhchivan'];
const AXES={
  'Western Persia Army':['Dogubayazit','Igdir','Kars','Akhaltsikhe','Kutaisi','Sochi'],
  'Aras Breakthrough':['Nakhchivan','Goris','Yerevan','Gori','Tbilisi','Vladikavkaz'],
  'Kura Offensive':['Qazax','Ganja','Mingachevir','Shaki','Grozny'],
  'Caspian Coastal Army':['Shamakhi','Baku','Sumqayit','Quba','Derbent','Makhachkala'],
  'Persian Mobile Reserve':['Gyumri','Vanadzor','Tbilisi','Nalchik'],
  'Caspian Reserve':['Quba','Derbent','Makhachkala','Astrakhan']
};
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
  lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){
  const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
  return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
    (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
}
function interpolate(lat,shore){
  if(lat<=shore[0][0])return shore[0][1];
  for(let i=1;i<shore.length;i++)if(lat<=shore[i][0]){
    const [ay,ax]=shore[i-1],[by,bx]=shore[i];
    return ax+(bx-ax)*(lat-ay)/(by-ay);
  }
  return shore[shore.length-1][1];
}
function basin(lon,lat){
  if(lat>=37.05&&lat<=46.65&&lon>interpolate(lat,CASPIAN_SHORE))return 'caspian';
  if(lat>=40.5&&lat<=45.1&&lon<interpolate(lat,BLACK_SEA_SHORE))return 'black-sea';
  return null;
}
function waterAt(c,r){
  let n=0;for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){
    const p=geo(c+x*.34,r+y*.34);
    if(basin(p.lon,p.lat))n++;
  }
  return n/9;
}
function lineDistance(p,line){
  let best=Infinity;
  for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],vx=(b[0]-a[0])*K,vy=b[1]-a[1],
      px=(p.lon-a[0])*K,py=p.lat-a[1],
      t=Math.max(0,Math.min(1,(px*vx+py*vy)/(vx*vx+vy*vy||1)));
    best=Math.min(best,Math.hypot(px-t*vx,py-t*vy));
  }
  return best;
}
function landscape(p,c,r){
  const pass=PASSES.some(([,lon,lat,radius])=>Math.hypot((p.lon-lon)*K,p.lat-lat)<radius);
  const d=lineDistance(p,RIDGE);
  if(d<.19&&!pass)return 'peak';
  if(d<.64&&!pass)return 'mountain';
  if((p.lat>43.5&&p.lon<44.5&&(c*13+r*7)%11<5)||
      (p.lat>41&&p.lat<43.1&&p.lon<45&&(c*7+r*11)%13<3))return 'forest';
  if(p.lat>=45.0&&p.lon>44.5&&(c*17+r*7)%19<4)return 'desert';
  return 'plains';
}
function nearest(g,p,valid,radius=12){return E.nearestTile(g,p,valid,radius);}
function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No reachable order target');}
function create(player='cf',difficulty='normal',seed=201705){
  if(!SIDES.includes(player))throw Error('Unsupported Caucasus faction: '+player);
  if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
  const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,
    player,difficulty,mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
    seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
    tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
    fallen:{},economy:{},tech:{},officers:Object.fromEntries(
      Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
    roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
    eliteDeployed:{},arsenal:{cf:0,eu:0},automation:{enabled:false,
      autoUpgrade:true,stack:1,reserve:{},cities:{}},mapRevision:0,
    teams:null,factions:{},lineup:{}};
  for(const s of [...SIDES,'neutral']){
    g.economy[s]={credits:0,industry:0,science:0,sakuradite:0};g.tech[s]={};
  }
  g.scenario={id:ID,key:KEY,title:'Invasion of the Caucasus',
    version:1,phase:'caucasus-northern-offensive',groups:[],funding:{},
    bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,
    mountainPasses:PASSES,riverCrossings:BRIDGE_CITIES,
    offensiveAxes:{cf:AXES},totalConquest:true,turnLimit:null};
  const eliteIds=Object.keys(E.ELITE_FORCES);
  g.scenario.eliteRosters=Object.fromEntries(SIDES.map(s=>[s,
    eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
      E.ELITE_FORCES[id].availableTo.includes(s))]));
  g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
    const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),fraction=waterAt(c,r);
    return {c,r,owner:null,terrain:fraction>=.8?'sea':
      fraction>=.2?'coast':landscape(p,c,r),waterFraction:fraction,
      waterBasin:basin(p.lon,p.lat)};
  });
  // Every naval port must directly touch a sea tile in its own real basin.
  const basinForPort=name=>['Batumi','Poti','Sochi','Tuapse','Novorossiysk'].includes(name)
    ?'black-sea':'caspian';
  const navigable=(t,name)=>t&&t.terrain==='sea'&&
    basin(geo(t.c,t.r).lon,geo(t.c,t.r).lat)===basinForPort(name);
  for(const [name,lon,lat,owner,tier,fort] of CITIES){
    const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
    const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
      !E.TERRAIN[t.terrain]?.blocked&&
      !g.stations.some(s=>s.c===t.c&&s.r===t.r)&&
      (!coastal||E.adjacent(g,t).some(n=>navigable(n,name))),coastal?10:7);
    if(!at)throw Error('Unplaceable Caucasus city or sea-facing port: '+name);
    const capital=['Tabriz','Lankaran','Yerevan','Tbilisi','Baku','Grozny','Stavropol'].includes(name);
    const shield=E.scenarioCityDefenseHP(tier,!!fort,name);
    g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
      capital,capitalOf:capital?owner:null,fort:!!fort,
      gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
      shield,maxShield:shield,
      income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
      industry:Math.round((capital?25:6*tier)*.55),
      science:Math.round((1+tier)*.55),producedTurn:0});
    if(at.terrain!=='coast')at.terrain='plains';
  }
  // Provinces are assigned only within the same connected landmass.
  const components=new Int16Array(g.tiles.length).fill(-1);let componentId=0;
  for(let i=0;i<g.tiles.length;i++){
    if(g.tiles[i].terrain==='sea'||components[i]>=0)continue;
    const queue=[g.tiles[i]];components[i]=componentId;
    for(let j=0;j<queue.length;j++)for(const n of E.adjacent(g,queue[j])){
      const ix=n.r*COLS+n.c;
      if(n.terrain==='sea'||components[ix]>=0)continue;
      components[ix]=componentId;queue.push(n);
    }
    componentId++;
  }
  const byComponent=new Map();
  for(const s of g.stations){
    const k=components[s.r*COLS+s.c];
    if(!byComponent.has(k))byComponent.set(k,[]);
    byComponent.get(k).push(s);
  }
  for(const t of g.tiles)if(t.terrain!=='sea'){
    const eligible=byComponent.get(components[t.r*COLS+t.c])||[];
    let city=null,d=Infinity;
    for(const s of eligible){
      const n=E.distance(t,s,g);if(n<d){d=n;city=s;}
    }
    if(city){t.owner=city.owner;t.provinceCity=city.id;}
  }
  // River barriers use true polyline/hex-edge intersections, exempting bridges.
  function orient(a,b,p){return (b.lon-a.lon)*(p.lat-a.lat)-(b.lat-a.lat)*(p.lon-a.lon);}
  function crosses(a,b,x,y){
    const X={lon:x[0],lat:x[1]},Y={lon:y[0],lat:y[1]};
    const u=orient(a,b,X),v=orient(a,b,Y),m=orient(X,Y,a),n=orient(X,Y,b);
    return ((u>0&&v<0)||(u<0&&v>0))&&((m>0&&n<0)||(m<0&&n>0));
  }
  const segments=Object.values(RIVERS).flatMap(line=>line.slice(1).map((p,i)=>[line[i],p]));
  const bridges=g.stations.filter(s=>BRIDGE_CITIES.includes(s.name)),barriers={};
  for(const t of g.tiles){
    if(t.terrain==='sea'||E.TERRAIN[t.terrain]?.blocked)continue;
    const a=geo(t.c,t.r),from=t.r*COLS+t.c;
    for(const n of E.adjacent(g,t)){
      const to=n.r*COLS+n.c;
      if(to<=from||n.terrain==='sea'||E.TERRAIN[n.terrain]?.blocked)continue;
      const b=geo(n.c,n.r);
      if(!segments.some(([x,y])=>crosses(a,b,x,y)))continue;
      if(bridges.some(s=>E.distance(s,t,g)<=1&&E.distance(s,n,g)<=1))continue;
      barriers[from+':'+to]=true;
    }
  }
  g.scenario.riverBarriers=barriers;
  const groups=new Map();
  function group(side,name,origin){
    const key=side+':'+name;
    if(!groups.has(key)){
      const gr={id:'army-'+groups.size,side,name,origin,units:[]};
      groups.set(key,gr);g.scenario.groups.push(gr);
    }
    return groups.get(key);
  }
  for(const [side,name,formation,cls,count,commander] of ARMY_GROUPS){
    const s=g.stations.find(v=>v.name===name);
    if(!s||s.owner!==side)throw Error('Invalid Caucasus staging city: '+name);
    for(let i=0;i<count;i++){
      const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.TERRAIN[t.terrain]?.blocked&&
        !E.unitAt(g,t)&&t.owner===side&&
        (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),18);
      if(!at)throw Error('Insufficient deployment room near '+name);
      const cmd=i===0?commander:null,stack=i===0?3:2;
      const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
      group(side,formation,name).units.push(u.id);
      if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
    }
  }
  const taken=new Set();
  for(const [name,level] of Object.entries(PORTS)){
    const s=g.stations.find(v=>v.name===name);
    if(!s)throw Error('Missing Caucasus harbour: '+name);
    const at=E.adjacent(g,s).filter(t=>navigable(t,name)&&!taken.has(E.key(t)))
      .sort((a,b)=>E.adjacent(g,b).filter(t=>navigable(t,name)).length-
        E.adjacent(g,a).filter(t=>navigable(t,name)).length)[0];
    if(!at)throw Error('No adjacent navigable harbour: '+name);
    s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
    taken.add(E.key(at));
  }
  for(const [side,name,type,count] of FLEETS){
    const s=g.stations.find(v=>v.name===name);
    if(!s||!E.TYPES[type]?.naval)throw Error('Invalid Caucasus fleet '+name+'/'+type);
    const fleet={id:'fleet-'+g.scenario.groups.length,side,
      name:name+' Flotilla',origin:name,units:[]};
    for(let i=0;i<count;i++){
      const at=nearest(g,s,t=>navigable(t,name)&&!E.unitAt(g,t)&&
        !taken.has(E.key(t)),14);
      if(!at)throw Error('No berth for Caucasus fleet: '+name);
      fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
    }
    g.scenario.groups.push(fleet);
  }
  if(difficulty==='elite')E.prepareEliteEurope(g);
  for(const side of SIDES){
    const base=E.income(g,side);
    g.scenario.funding[side]=Object.fromEntries(
      Object.entries(FUNDING[side]).map(([res,n])=>[res,Math.round(n)-base[res]]));
    const actual=E.income(g,side);
    for(const res of Object.keys(FUNDING[side]))g.economy[side][res]=actual[res]*2;
  }
  if(difficulty!=='normal'&&difficulty!=='elite')
    for(const side of SIDES.filter(s=>s!==player))
      for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
        E.addDifficultyFrames(u,difficulty);
  E.applyScenarioDifficulty(g,difficulty);
  g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
  E.log(g,'Chinese Federation columns push from Persia through Azerbaijan, Armenia and Georgia against fortified E.U. Caucasus defenses. The Black and Caspian seas remain separate. Take every city to win.',player);
  return g;
}
function onTurn(){return false;}
function strategicScore(g,side){return g.stations.filter(s=>s.owner===side)
  .reduce((n,s)=>n+s.tier,0);}
function objective(g,side=g.player){return 'Conquer all '+CITIES.length+
  ' Caucasus theatre cities ('+g.stations.filter(s=>s.owner===side).length+
  '/'+CITIES.length+' controlled). No turn limit.';}
function winner(g){
  if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
  for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
    return {winner:side,reason:E.FACTIONS[side].name+' holds every Caucasus city.'};
  return null;
}
const api={id:ID,title:'Invasion of the Caucasus',cols:COLS,rows:ROWS,
  sides:SIDES,bounds:BOUNDS,projection:PROJECTION,cityData:CITIES,
  armyGroups:ARMY_GROUPS,ports:PORTS,fleetData:FLEETS,
  rivers:RIVERS,mountainPasses:PASSES,operationalAxes:AXES,
  geo,locate,create,onTurn,objective,winner,strategicScore,orderGroup};
api.meta={saveVersion:1,elite:true,terrainCosts:{mountain:2},
  map:{centreSampled:true,coastBuffer:1,overviewMarkers:true,
    overlays:['regionalRivers']},
  ai:{doctrine:'europe',recovery:true,routeBias:'cf',
    operationalAxes:{invader:'cf',defender:'eu',axes:AXES,
      defenderHubs:['Yerevan','Tbilisi','Ganja','Baku',
        'Vladikavkaz','Grozny','Makhachkala','Stavropol']}},
  text:{
    era:'Caucasus · Alternate 2017',
    terrain:'Greater Caucasus ridgeline includes high impassable peaks, but Darial, Roki, Mamison, Klukhor and the eastern Caspian coastal gate are traversable. Mountains cost 2 movement.',
    intro:'The Chinese Federation drives north from Persia against Europian Azerbaijan, Georgia, Armenia and southern Russia. Cross the mountains through real passes, capture Baku and reach the northern plains. Victory requires every opposing city, without a turn limit.',
    diplomacy:'The Chinese Federation and Europia United are at war. Caspian and Black Sea fleets operate in separate waters. Capturable ports retain their own control.',
    elite:'Faction-specific Elite Forces, commanders and the standard HQ/research/reward rules apply.',
    focus:{cf:'Tabriz',eu:'Tbilisi'}},
  blurbs:{
    cf:'Advance from Tabriz, Ardabil and Lankaran along the Aras, Kura and Caspian axes; split E.U. mountain defenses and capture the northern industrial hubs.',
    eu:'Hold Baku and the Kura line while defending the Darial and western Caucasus routes. Reinforce Georgia from Vladikavkaz, Grozny and Stavropol before counterattacking Persia.'
  }
};
E.scenarios={...(E.scenarios||{}),[KEY]:api,
  byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

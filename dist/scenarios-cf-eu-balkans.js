/* Balkan Offensive — Chinese Federation northwest from Turkish Thrace.
 * Self-contained tactical scenario. The integrator owns manifest/catalog/campaign wiring.
 * Coordinates are WGS84; faction control is alternate-history, not modern borders. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='cf-eu-balkans',KEY='cfEuBalkans',COLS=160,ROWS=116,SIDES=['cf','eu'];
const BOUNDS={west:15,east:31.8,north:47.3,south:34.8};
const MID=(BOUNDS.north+BOUNDS.south)/2,K=Math.cos(MID*Math.PI/180);
const PROJECTION={centerLon:23.4,centerLat:MID,angle:0,uMin:-8.4*K,uMax:8.4*K,vMin:-6.25,vMax:6.25};
// [settlement, longitude, latitude, initial owner, industry tier, defended]
const CITIES=[
  ['Istanbul',28.98,41.01,'cf',3,true],
  ['Edirne',26.56,41.68,'cf',3,true],
  ['Kirklareli',27.23,41.74,'cf',2,true],
  ['Tekirdag',27.51,40.98,'cf',3,true],
  ['Corlu',27.81,41.16,'cf',2,true],
  ['Ipsala',26.38,40.92,'cf',2,true],
  ['Canakkale',26.41,40.15,'cf',3,true],
  ['Gelibolu',26.67,40.41,'cf',2,true],
  ['Svilengrad',26.2,41.77,'eu',2,true],
  ['Haskovo',25.56,41.93,'eu',2,true],
  ['Kardzhali',25.37,41.65,'eu',2,true],
  ['Plovdiv',24.75,42.14,'eu',3,true],
  ['Sofia',23.32,42.70,'eu',3,true],
  ['Blagoevgrad',23.09,42.02,'eu',2,true],
  ['Pleven',24.62,43.41,'eu',2,true],
  ['Ruse',25.96,43.85,'eu',3,true],
  ['Veliko Tarnovo',25.62,43.08,'eu',2,false],
  ['Stara Zagora',25.63,42.43,'eu',2,true],
  ['Burgas',27.47,42.50,'eu',3,true],
  ['Varna',27.92,43.22,'eu',3,true],
  ['Vidin',22.87,43.99,'eu',2,true],
  ['Alexandroupoli',25.88,40.85,'eu',3,true],
  ['Komotini',25.40,41.12,'eu',2,true],
  ['Kavala',24.40,40.94,'eu',2,true],
  ['Serres',23.55,41.09,'eu',2,true],
  ['Thessaloniki',22.94,40.64,'eu',3,true],
  ['Larissa',22.42,39.64,'eu',3,true],
  ['Volos',22.95,39.36,'eu',2,false],
  ['Ioannina',20.85,39.66,'eu',2,true],
  ['Athens',23.73,37.98,'eu',3,true],
  ['Piraeus',23.64,37.94,'eu',3,true],
  ['Patras',21.73,38.25,'eu',3,true],
  ['Skopje',21.43,42.00,'eu',3,true],
  ['Bitola',21.34,41.03,'eu',2,true],
  ['Pristina',21.16,42.66,'eu',2,true],
  ['Nis',21.90,43.32,'eu',3,true],
  ['Kragujevac',20.92,44.01,'eu',2,true],
  ['Belgrade',20.46,44.79,'eu',3,true],
  ['Novi Sad',19.84,45.25,'eu',3,true],
  ['Tirana',19.82,41.33,'eu',3,true],
  ['Durres',19.45,41.32,'eu',2,false],
  ['Vlore',19.49,40.47,'eu',2,true],
  ['Podgorica',19.26,42.44,'eu',2,true],
  ['Bar',19.09,42.10,'eu',2,false],
  ['Sarajevo',18.41,43.86,'eu',3,true],
  ['Mostar',17.81,43.34,'eu',2,true],
  ['Banja Luka',17.19,44.77,'eu',2,true],
  ['Dubrovnik',18.09,42.65,'eu',2,true],
  ['Split',16.44,43.51,'eu',3,true],
  ['Zagreb',15.98,45.81,'eu',3,true],
  ['Osijek',18.69,45.55,'eu',2,true],
  ['Bucharest',26.10,44.43,'eu',3,true],
  ['Craiova',23.79,44.32,'eu',3,true],
  ['Constanta',28.65,44.18,'eu',3,true],
  ['Galati',28.05,45.44,'eu',2,true],
  ['Brasov',25.60,45.65,'eu',2,true],
  ['Timisoara',21.23,45.75,'eu',2,true]
];
// [side, staging city, army-group name, class, unit count, first-unit commander]
const ARMY_GROUPS=[
 ['cf','Edirne','Thracian Spearhead','heavy',9,'xingke'],
 ['cf','Edirne','Thracian Spearhead','rocket',5,null],
 ['cf','Edirne','Thracian Spearhead','assault',4,null],
 ['cf','Kirklareli','Rhodope Breach Army','heavy',6,'leifeng'],
 ['cf','Kirklareli','Rhodope Breach Army','rocket',3,null],
 ['cf','Ipsala','Aegean March Army','heavy',6,'meiling'],
 ['cf','Ipsala','Aegean March Army','assault',4,null],
 ['cf','Tekirdag','Macedonian Column','heavy',5,'gaohai'],
 ['cf','Tekirdag','Macedonian Column','rocket',4,null],
 ['cf','Corlu','Thracian Strategic Reserve','heavy',4,'cao'],
 ['cf','Corlu','Thracian Strategic Reserve','support',3,null],
 ['cf','Istanbul','Black Sea Army','heavy',6,'zhaohao'],
 ['cf','Istanbul','Black Sea Army','medium',4,null],
 ['cf','Canakkale','Aegean Landing Corps','heavy',5,'lifeng'],
 ['cf','Canakkale','Aegean Landing Corps','assault',4,null],
 ['cf','Canakkale','Aegean Landing Corps','rocket',2,null],
 ['cf','Gelibolu','Dardanelles Expedition','medium',4,'xianglin'],
 ['cf','Gelibolu','Dardanelles Expedition','assault',3,null],
 ['eu','Svilengrad','Maritsa Border Army','heavy',5,'akito'],
 ['eu','Svilengrad','Maritsa Border Army','rocket',3,'yukiya'],
 ['eu','Haskovo','Rhodope Defense Army','heavy',5,'ryo'],
 ['eu','Haskovo','Rhodope Defense Army','rocket',3,null],
 ['eu','Kardzhali','Rhodope Defense Army','medium',3,null],
 ['eu','Alexandroupoli','Western Thrace Army','heavy',5,'ayano'],
 ['eu','Alexandroupoli','Western Thrace Army','rocket',2,null],
 ['eu','Komotini','Western Thrace Army','assault',3,null],
 ['eu','Burgas','Black Sea Coastal Army','heavy',4,'fernando'],
 ['eu','Burgas','Black Sea Coastal Army','rocket',2,null],
 ['eu','Plovdiv','Bulgarian Field Army','heavy',5,'smilas'],
 ['eu','Plovdiv','Bulgarian Field Army','rocket',3,null],
 ['eu','Sofia','Sofia Capital Guard','heavy',6,'leila'],
 ['eu','Sofia','Sofia Capital Guard','siege',3,null],
 ['eu','Stara Zagora','Bulgarian Field Army','medium',3,null],
 ['eu','Varna','Black Sea Coastal Army','medium',3,null],
 ['eu','Ruse','Danube Defense Army','heavy',4,'margaret'],
 ['eu','Pleven','Danube Defense Army','rocket',3,null],
 ['eu','Thessaloniki','Macedonian Defense Army','heavy',6,'oscar'],
 ['eu','Thessaloniki','Macedonian Defense Army','rocket',3,null],
 ['eu','Serres','Macedonian Defense Army','heavy',3,null],
 ['eu','Skopje','Vardar Reserve','heavy',4,'klaus'],
 ['eu','Nis','Morava Field Army','heavy',4,'pierre'],
 ['eu','Belgrade','Belgrade Defense Army','heavy',5,'eduardo'],
 ['eu','Belgrade','Belgrade Defense Army','rocket',3,null],
 ['eu','Bucharest','Romanian Field Army','heavy',5,'olivia'],
 ['eu','Bucharest','Romanian Field Army','rocket',3,null],
 ['eu','Craiova','Danube Defense Army','medium',3,null],
 ['eu','Athens','Hellenic Capital Guard','heavy',4,'anna'],
 ['eu','Piraeus','Hellenic Capital Guard','rocket',2,null],
 ['eu','Tirana','Adriatic Reserve','medium',3,null],
 ['eu','Sarajevo','Dinaric Reserve','heavy',3,null],
 ['eu','Split','Adriatic Coastal Army','medium',3,null],
 ['eu','Zagreb','Croatian Army','heavy',3,null],
 ['eu','Novi Sad','Belgrade Defense Army','assault',3,null]
];
const PORTS={
 Istanbul:3,Tekirdag:2,Canakkale:3,Gelibolu:2,
 Alexandroupoli:2,Kavala:2,Thessaloniki:3,Volos:2,Piraeus:3,Patras:2,
 Burgas:3,Varna:3,Constanta:3,Durres:2,Vlore:2,Bar:2,
 Dubrovnik:2,Split:3
};
const FLEETS=[
 ['cf','Gelibolu','cf_carrier',2],['cf','Canakkale','shui_gun_ru_ii',3],
 ['cf','Tekirdag','cf_carrier',2],['cf','Istanbul','shui_gun_ru_ii',3],
 ['eu','Thessaloniki','eu_carrier',2],['eu','Piraeus','panzer_frosch_ii',3],
 ['eu','Varna','eu_carrier',2],['eu','Burgas','panzer_frosch_ii',2],
 ['eu','Split','eu_carrier',2],['eu','Constanta','panzer_frosch_ii',2]
];
const FUNDING={
 cf:{credits:920,industry:560,science:100,sakuradite:48},
 eu:{credits:960,industry:580,science:105,sakuradite:50}
};
const RIVERS={
 Maritsa:[[28.60,41.32],[27.58,41.50],[26.56,41.68],[26.18,41.85],[25.73,41.94],[25.50,41.79],[25.91,40.84]],
 Danube:[[21.0,44.47],[22.55,44.69],[23.79,43.99],[25.97,43.85],[26.70,44.10],[27.96,44.25],[28.80,45.15]],
 Sava:[[15.99,45.81],[17.20,45.28],[18.72,45.15],[19.70,44.89],[20.46,44.79]],
 Morava:[[22.03,42.99],[21.9,43.32],[21.66,43.78],[21.00,44.35],[20.46,44.79]],
 Vardar:[[21.43,42.00],[21.50,41.35],[21.82,40.94],[22.54,40.56]],
 Struma:[[23.16,42.02],[23.10,41.45],[23.02,41.06],[23.13,40.57]],
 Nestos:[[24.52,41.51],[24.62,41.11],[24.78,40.92]]
};
// Topographic chains in geographic coordinates; valley passes are explicitly open.
const RANGES={
 Rhodopes:[[23.3,41.88],[24.12,41.69],[24.86,41.61],[25.62,41.56]],
 Balkan:[[22.25,43.11],[23.57,42.9],[24.8,42.77],[26.26,42.83],[27.3,42.72]],
 Rila:[[23.11,42.15],[23.54,42.08]],Pirin:[[23.46,41.91],[23.39,41.52]],
 Pindus:[[20.70,40.46],[21.11,39.86],[21.71,39.17],[22.09,38.64]],
 Dinaric:[[16.38,44.36],[17.32,43.91],[18.65,43.27],[19.37,42.7],[20.34,42.26]],
 Carpathian:[[22.85,46.39],[23.64,45.68],[24.69,45.5],[25.74,45.65],[26.7,45.53]]
};
const PASSES=[[26.20,41.77,.40],[25.88,40.85,.41],[25.57,41.93,.35],
 [24.75,42.14,.34],[23.09,42.02,.37],[23.16,41.71,.3],
 [22.94,40.64,.38],[21.90,43.32,.44],[21.43,42,.38],
 [20.46,44.79,.4],[25.97,43.85,.40]];
const ROADS={
 'Thrace Sofia corridor':[[28.98,41.01],[27.51,40.98],[26.56,41.68],[26.20,41.77],[25.56,41.93],[24.75,42.14],[23.32,42.70],[21.90,43.32],[20.46,44.79]],
 'Via Egnatia':[[25.88,40.85],[25.40,41.12],[24.40,40.94],[23.55,41.09],[22.94,40.64],[20.85,39.66],[19.82,41.33]],
 'Morava Vardar corridor':[[22.94,40.64],[21.43,42.00],[21.90,43.32],[20.92,44.01],[20.46,44.79],[19.84,45.25]],
 'Black Sea coastal highway':[[28.98,41.01],[27.47,42.50],[27.92,43.22],[28.65,44.18]],
 'Danube routes':[[20.46,44.79],[23.79,44.32],[25.96,43.85],[26.10,44.43],[28.65,44.18]],
 'Adriatic coastal road':[[16.44,43.51],[17.81,43.34],[18.09,42.65],[19.09,42.10],[19.45,41.32],[19.49,40.47]],
 'Greek north south':[[22.94,40.64],[22.42,39.64],[22.95,39.36],[23.73,37.98],[23.64,37.94]]
};
const BRIDGES=['Edirne','Svilengrad','Plovdiv','Ruse','Vidin','Belgrade','Nis',
  'Skopje','Thessaloniki','Novi Sad','Craiova','Alexandroupoli'];
function geo(c,r){return {lon:BOUNDS.west+(c+.5+.5*(r&1))*(BOUNDS.east-BOUNDS.west)/COLS,
 lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){
 const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
 return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
 (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
}
function nearest(g,p,valid,radius=12){
 let best=null,score=Infinity;
 for(let r=Math.max(0,p.r-radius);r<=Math.min(ROWS-1,p.r+radius);r++)
  for(let c=Math.max(0,p.c-radius);c<=Math.min(COLS-1,p.c+radius);c++){
   const t=E.tile(g,c,r);
   if(!t||!valid(t))continue;
   const d=E.distance(p,t,g);
   if(d<score){best=t;score=d;}
  }
 return best;
}
function lineDistance(p,line){
 let best=Infinity;
 for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],vx=(b[0]-a[0])*.82,vy=b[1]-a[1],
   px=(p.lon-a[0])*.82,py=p.lat-a[1],q=vx*vx+vy*vy,
   t=Math.max(0,Math.min(1,(px*vx+py*vy)/(q||1)));
  best=Math.min(best,Math.hypot(px-vx*t,py-vy*t));
 }
 return best;
}
function landscape(p,c,r){
 const gap=Math.min(...PASSES.map(([x,y,w])=>Math.hypot((p.lon-x)*.82,p.lat-y)/w));
 const dist=Math.min(...Object.values(RANGES).map(line=>lineDistance(p,line)));
 if(dist<.19&&gap>1.4&&((c*13+r*7)%17===0))return 'peak';
 if(dist<.41&&gap>.75)return 'mountain';
 if(dist<.78&&gap>1.15)return 'forest';
 if((p.lat>43.1&&p.lon<22.7&&((c*17+r*11)%13)<3))return 'forest';
 return 'plains';
}
function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army Group not found','No group unit can reach this hex');}
function create(player='cf',difficulty='normal',seed=201720){
 if(!SIDES.includes(player))throw Error('Unsupported Balkan side: '+player);
 if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
 const g={
  game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
  mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
  seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
  tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
  fallen:{},economy:{},tech:{},officers:Object.fromEntries(
   Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
  roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
  eliteDeployed:{},arsenal:{cf:0,eu:0},
  automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
  mapRevision:0,teams:null,factions:{},lineup:{}
 };
 for(const side of [...SIDES,'neutral']){
  g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
 }
 g.scenario={id:ID,key:KEY,title:'Balkan Offensive',version:1,
  phase:'thracian-breakthrough',aiDoctrine:'europe',groups:[],funding:{},
  bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,roads:ROADS,
  riverCrossings:BRIDGES, mountainPasses:PASSES.map(v=>v.slice(0,2)),
  operationalFronts:[
   {name:'Thrace-Maritsa',attack:'cf',bases:['Edirne','Kirklareli'],route:['Svilengrad','Haskovo','Plovdiv','Sofia']},
   {name:'Aegean Corridor',attack:'cf',bases:['Ipsala','Tekirdag'],route:['Alexandroupoli','Komotini','Kavala','Thessaloniki']},
   {name:'Black Sea Coast',attack:'cf',bases:['Istanbul'],route:['Burgas','Varna','Constanta']},
   {name:'Macedonia-Morava',attack:'cf',bases:['Canakkale','Gelibolu'],route:['Thessaloniki','Skopje','Nis','Belgrade']},
   {name:'Adriatic Flank',attack:'cf',bases:['Gelibolu'],route:['Piraeus','Patras','Durres','Split']}
  ],
  offensiveAxes:{cf:{
   'Thracian Spearhead':['Svilengrad','Haskovo','Plovdiv','Sofia','Nis'],
   'Rhodope Breach Army':['Kardzhali','Haskovo','Plovdiv','Sofia'],
   'Aegean March Army':['Alexandroupoli','Komotini','Kavala','Thessaloniki'],
   'Macedonian Column':['Alexandroupoli','Thessaloniki','Skopje','Nis','Belgrade'],
   'Thracian Strategic Reserve':['Svilengrad','Plovdiv','Sofia'],
   'Black Sea Army':['Burgas','Varna','Constanta','Bucharest'],
   'Aegean Landing Corps':['Thessaloniki','Volos','Piraeus','Patras'],
   'Dardanelles Expedition':['Kavala','Thessaloniki','Skopje','Nis']
  }}
 };
 const eliteIds=Object.keys(E.ELITE_FORCES);
 g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
  eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
   E.ELITE_FORCES[id].availableTo.includes(side))]));
 const packed=root.CF_EU_BALKANS_COAST||
  (typeof require==='function'?require('./cf-eu-balkans-coast.js'):null);
 if(!packed||packed.length!==COLS*ROWS/4)throw Error('Balkan 2-bit coast missing/corrupt');
 g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
  const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
  const cls=(packed.charCodeAt(i>>2)>>(6-2*(i&3)))&3;
  return {c,r,owner:null,terrain:cls===0?'sea':cls===1?'coast':landscape(p,c,r)};
 });
 // Keep narrow Bosporus and Dardanelles open without making an overland bridge.
 // Most Chinese ground forces start WEST of the Bosporus, in Turkish Thrace.
 const STRAITS=[
  [[29.06,41.21],[29.08,41.15],[29.02,41.10],[29.00,41.05],[28.99,40.99]],
  [[26.18,40.03],[26.27,40.12],[26.39,40.22],[26.52,40.30],[26.64,40.37],[26.77,40.51],[26.92,40.56]]
 ];
 for(const t of g.tiles){
  if(t.terrain==='sea')continue;
  const p=geo(t.c,t.r);
  if(STRAITS.some(line=>lineDistance(p,line)<.15))t.terrain='sea';
 }
 // Select only the largest navigable sea component for working harbours.
 // Inland lagoons and raster artefacts cannot become naval spawn positions.
 const checkedWater=new Set();let operationalSea=new Set();
 for(const start of g.tiles){
  if(start.terrain!=='sea'||checkedWater.has(E.key(start)))continue;
  const queue=[start],connected=new Set([E.key(start)]);
  checkedWater.add(E.key(start));
  for(let i=0;i<queue.length;i++)for(const n of E.adjacent(g,queue[i])){
   const key=E.key(n);
   if(n.terrain!=='sea'||checkedWater.has(key))continue;
   checkedWater.add(key);connected.add(key);queue.push(n);
  }
  if(connected.size>operationalSea.size)operationalSea=connected;
 }
 if(operationalSea.size<2000)throw Error('Balkan maritime basins are disconnected');
 const navigable=t=>t.terrain==='sea'&&operationalSea.has(E.key(t));
 // A geographic river is a movement-edge penalty, not an uncrossable wall.
 function orientation(a,b,p){return (b.lon-a.lon)*(p.lat-a.lat)-(b.lat-a.lat)*(p.lon-a.lon);}
 function intersects(a,b,x,y){
  const u=orientation(a,b,{lon:x[0],lat:x[1]}),v=orientation(a,b,{lon:y[0],lat:y[1]}),
   m=orientation({lon:x[0],lat:x[1]},{lon:y[0],lat:y[1]},a),
   n=orientation({lon:x[0],lat:x[1]},{lon:y[0],lat:y[1]},b);
  return ((u>0&&v<0)||(u<0&&v>0))&&((m>0&&n<0)||(m<0&&n>0));
 }
 const segments=Object.values(RIVERS).flatMap(line=>line.slice(1).map((p,i)=>[line[i],p]));
 // Place coast cities against REAL navigable sea, instead of inventing shipyards inland.
 for(const [name,lon,lat,owner,tier,fort] of CITIES){
  const isPort=Object.prototype.hasOwnProperty.call(PORTS,name);
  const target=locate(lon,lat);
  const at=nearest(g,target,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
   t.terrain!=='peak'&&!g.stations.some(s=>s.c===t.c&&s.r===t.r)&&
   (!isPort||E.adjacent(g,t).some(n=>navigable(n))),isPort?13:6);
  if(!at)throw Error('Cannot place Balkan settlement '+name);
  const capital=['Istanbul','Sofia','Athens','Belgrade','Bucharest','Zagreb'].includes(name);
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
 const components=new Int16Array(g.tiles.length).fill(-1);
 let island=0;
 for(let i=0;i<g.tiles.length;i++){
  const first=g.tiles[i];if(first.terrain==='sea'||components[i]>=0)continue;
  const queue=[first];components[i]=island;
  for(let j=0;j<queue.length;j++)for(const n of E.adjacent(g,queue[j])){
   const k=n.r*COLS+n.c;
   if(n.terrain==='sea'||components[k]>=0)continue;
   components[k]=island;queue.push(n);
  }
  island++;
 }
 const byIsland=new Map();
 for(const s of g.stations){
  const k=components[s.r*COLS+s.c];
  if(!byIsland.has(k))byIsland.set(k,[]);
  byIsland.get(k).push(s);
 }
 for(const t of g.tiles)if(t.terrain!=='sea'){
  const nearby=byIsland.get(components[t.r*COLS+t.c])||[];
  if(!nearby.length)continue;
  let best=null,d=Infinity;
  for(const s of nearby){const v=E.distance(t,s,g);if(v<d){best=s;d=v;}}
  t.owner=best.owner;t.provinceCity=best.id;
 }
 // Store river-crossing cost edges in serializable state; city bridges are exempt.
 const edges={},bridgeSites=g.stations.filter(s=>BRIDGES.includes(s.name));
 for(const t of g.tiles){
  if(t.terrain==='sea'||E.TERRAIN[t.terrain]?.blocked)continue;
  const index=t.r*COLS+t.c,a=geo(t.c,t.r);
  for(const n of E.adjacent(g,t)){
   const j=n.r*COLS+n.c;
   if(j<=index||n.terrain==='sea'||E.TERRAIN[n.terrain]?.blocked)continue;
   const b=geo(n.c,n.r);
   if(!segments.some(([x,y])=>intersects(a,b,x,y)))continue;
   if(bridgeSites.some(s=>E.distance(s,t,g)<=1&&E.distance(s,n,g)<=1))continue;
   edges[index+':'+j]=true;
  }
 }
 g.scenario.riverBarriers=edges;
 const names=new Map();
 function group(side,name,origin){
  const key=side+':'+name;
  if(!names.has(key)){
   const formation={id:'army-'+names.size,side,name,origin,units:[]};
   names.set(key,formation);g.scenario.groups.push(formation);
  }
  return names.get(key);
 }
 for(const [side,city,name,cls,count,commander] of ARMY_GROUPS){
  const s=g.stations.find(x=>x.name===city);
  if(!s||s.owner!==side)throw Error('Army Group staged in wrong city '+city);
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.TERRAIN[t.terrain]?.blocked&&
    t.owner===side&&!E.unitAt(g,t)&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),15);
   if(!at)throw Error('No available Army Group deployment near '+city);
   const cmd=i===0?commander:null,stack=i===0?3:2;
   const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
   group(side,name,city).units.push(u.id);
   if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
  }
 }
 const occupiedPorts=new Set();
 for(const [name,level] of Object.entries(PORTS)){
  const s=g.stations.find(v=>v.name===name);
  const at=E.adjacent(g,s).filter(t=>navigable(t)&&!occupiedPorts.has(E.key(t)))
   .sort((a,b)=>E.adjacent(g,b).filter(n=>n.terrain==='sea').length-
    E.adjacent(g,a).filter(n=>n.terrain==='sea').length)[0];
  if(!at)throw Error('Balkan port lacks water access: '+name);
  s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
  occupiedPorts.add(E.key(at));
 }
 for(const [side,origin,type,count] of FLEETS){
  const s=g.stations.find(v=>v.name===origin);
  if(!s||!E.TYPES[type]?.naval)throw Error('Invalid Balkan fleet '+origin+'/'+type);
  const fleet={id:'fleet-'+g.scenario.groups.length,side,
   name:origin+' Fleet',origin,units:[]};
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>navigable(t)&&!E.unitAt(g,t)&&
    !occupiedPorts.has(E.key(t))&&!g.stations.some(v=>v.c===t.c&&v.r===t.r),13);
   if(!at)throw Error('No deployment water for '+origin+' Fleet');
   fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
  }
  g.scenario.groups.push(fleet);
 }
 if(difficulty==='elite')E.prepareEliteEurope(g);
 for(const side of SIDES){
  const factor=side===player?1:E.scenarioIncomeFactor(difficulty);
  const base=E.income(g,side);
  g.scenario.funding[side]=Object.fromEntries(
   Object.entries(FUNDING[side]).map(([resource,n])=>[resource,Math.round(n*factor)-base[resource]]));
  const actual=E.income(g,side);
  for(const res of Object.keys(FUNDING[side]))g.economy[side][res]=actual[res]*2;
 }
 if(difficulty!=='normal'&&difficulty!=='elite'){
  for(const side of SIDES.filter(s=>s!==player))
   for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
    E.addDifficultyFrames(u,difficulty);
 }
 g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
 E.log(g,'The Chinese Federation drives northwest out of Turkish Thrace into Bulgaria, Greece and Serbia. European defenses anchor the Rhodopes, Maritsa and Danube. Total conquest decides the battle.',player);
 return g;
}
function onTurn(){return false;}
function strategicScore(g,side){
 return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
}
function objective(g,side=g.player){
 return 'Capture all '+CITIES.length+' Balkan theatre cities ('+
  g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
}
function winner(g){
 if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
 for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
  return {winner:side,reason:E.FACTIONS[side].name+' has conquered every Balkan theatre city.'};
 return null;
}
const api={id:ID,title:'Balkan Offensive',cols:COLS,rows:ROWS,sides:SIDES,
 bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,fleetData:FLEETS,ports:PORTS,
 create,onTurn,objective,winner,strategicScore,orderGroup};
api.meta={
 saveVersion:1,elite:true,eliteRosterOnly:true,
 terrainCosts:{mountain:2},
 map:{centreSampled:true,europeanRegion:true,coastBuffer:1,homeZoom:5.2,
  overviewMarkers:true,overlays:['regionalRivers','roads']},
 ai:{doctrine:'europe',recovery:true,routeBias:'cf',synchronizedFlotillas:true,
  operationalAxes:{invader:'cf',defender:'eu',axes:{
   'Thracian Spearhead':['Svilengrad','Haskovo','Plovdiv','Sofia'],
   'Rhodope Breach Army':['Kardzhali','Plovdiv','Sofia'],
   'Aegean March Army':['Alexandroupoli','Komotini','Kavala','Thessaloniki'],
   'Macedonian Column':['Thessaloniki','Skopje','Nis','Belgrade'],
   'Black Sea Army':['Burgas','Varna','Constanta','Bucharest'],
   'Aegean Landing Corps':['Thessaloniki','Piraeus','Patras'],
   'Dardanelles Expedition':['Kavala','Thessaloniki','Skopje']
  },defenderHubs:['Svilengrad','Haskovo','Alexandroupoli','Burgas','Plovdiv',
    'Sofia','Thessaloniki','Skopje','Belgrade','Bucharest']}},
 text:{
  era:'Balkans · Alternate 2017',
  terrain:'Rhodope, Balkan, Pindus, Dinaric and Carpathian ranges slow heavy armies. Thrace, Maritsa bridges and coastal routes remain passable.',
  intro:'The Chinese Federation advances from Turkish Thrace into Greece, Bulgaria and Serbia. Aegean, Adriatic and Black Sea fleets contest real ports. Conquer every city; no turn limit.',
  diplomacy:'Two opposing armies only: Federation and E.U. Turkish Thrace provides the Chinese staging area while the E.U. controls the Balkans and beyond.',
  elite:'Elite difficulty uses standard faction-specific Elite Forces and HQ restrictions; ships stay standard naval hulls. Enemy bonuses, production and research follow existing rules.',
  focus:{cf:'Edirne',eu:'Sofia'}
 },
 blurbs:{
  cf:'Break the Maritsa frontier with three Army Groups, turn the Rhodopes via Greek Thrace and seize Sofia, Thessaloniki and Belgrade.',
  eu:'Defend Svilengrad and Alexandroupoli, fall back behind the Rhodopes and Danube, and counterattack the Chinese Thracian bases.'
 }
};
E.scenarios={...(E.scenarios||{}),[KEY]:api,
 byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

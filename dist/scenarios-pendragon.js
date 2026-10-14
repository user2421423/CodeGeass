/* Dual Pendragon regional geography and E.U. eastern finale.
   The capital is fictionally fixed at WGS84 (-117,37.5). The same static
   Nevada / eastern California / Utah grid is used by both independent battles.
   Shared renderer and campaign registry are intentionally unchanged. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);

const COLS=180,ROWS=126;
const BOUNDS={west:-121.25,east:-111.55,north:41.05,south:34.8};
const K=Math.cos(37.925*Math.PI/180);
const PROJECTION={centerLon:-116.4,centerLat:37.925,angle:0,
  uMin:-4.85*K,uMax:4.85*K,vMin:-3.125,vMax:3.125};
// Fictional imperial fortresses are intentionally distinguished from real towns.
// [city, WGS84 longitude, latitude, shared Britannian baseline, tier, fortification]
const GEOGRAPHIC_CITIES=[
 ['Reno',-119.814,39.53,'britannia',3,true],
 ['Carson City',-119.767,39.163,'britannia',3,true],
 ['Truckee',-120.183,39.328,'britannia',2,false],
 ['Fallon',-118.777,39.474,'britannia',2,true],
 ['Hawthorne',-118.631,38.524,'britannia',2,true],
 ['Bridgeport',-119.231,38.255,'britannia',2,false],
 ['Mammoth Lakes',-118.973,37.649,'britannia',2,true],
 ['Bishop',-118.399,37.361,'britannia',3,true],
 ['Independence',-118.2,36.802,'britannia',2,true],
 ['Lone Pine',-118.063,36.606,'britannia',2,false],
 ['Ridgecrest',-117.67,35.623,'britannia',3,true],
 ['Mojave',-118.174,35.053,'britannia',2,false],
 ['Pahrump',-115.984,36.208,'britannia',2,true],
 ['Caliente',-114.513,37.615,'britannia',2,true],
 ['Pioche',-114.453,37.929,'britannia',2,false],
 ['Austin',-117.069,39.493,'britannia',2,true],
 ['Dyer',-118.068,37.673,'britannia',2,false],
 ['Pendragon',-117,37.5,'britannia',3,true],
 ['Imperial Citadel',-117.15,37.7,'britannia',3,true],
 ['Western Imperial Gate',-117.54,37.48,'britannia',2,true],
 ['Eastern Imperial Gate',-116.52,37.55,'britannia',2,true],
 ['Southern Imperial Gate',-116.98,37.05,'britannia',2,true],
 ['Northern Imperial Gate',-117.04,38.02,'britannia',2,true],
 ['Imperial Air Command',-116.92,37.85,'britannia',3,true],
 ['Royal Arsenal',-116.6,37.27,'britannia',3,true],
 ['Tonopah',-117.231,38.068,'britannia',3,true],
 ['Goldfield',-117.235,37.708,'britannia',3,true],
 ['Beatty',-116.759,36.908,'britannia',2,true],
 ['Rachel',-115.79,37.647,'britannia',2,true],
 ['Alamo',-115.164,37.36,'britannia',2,true],
 ['Hiko',-115.192,37.602,'britannia',2,false],
 ['Warm Springs',-116.372,38.192,'britannia',2,true],
 ['Gabbs',-117.925,38.869,'britannia',2,true],
 ['Eureka',-115.961,39.512,'britannia',2,true],
 ['Ely',-114.888,39.247,'britannia',3,true],
 ['Lund',-115.007,38.855,'britannia',2,false],
 ['Round Mountain',-117.065,38.711,'britannia',2,true],
 ['Amargosa Valley',-116.401,36.644,'britannia',2,true],
 ['Mercury',-116.103,36.659,'britannia',2,true],
 ['Indian Springs',-115.669,36.569,'britannia',3,true],
 ['Las Vegas',-115.14,36.17,'britannia',3,true],
 ['Nellis Air Base',-115.034,36.236,'britannia',3,true],
 ['Death Valley Junction',-116.339,36.302,'britannia',2,false],
 ['Shoshone',-116.272,35.974,'britannia',2,false],
 ['Tecopa',-116.229,35.847,'britannia',1,false],
 ['Panaca',-114.384,37.791,'britannia',2,false],
 ['Silver Peak',-117.637,37.757,'britannia',2,false],
 ['Lida',-117.489,37.487,'britannia',2,true]
];
// Strategic mountain chains. Corridor passes follow genuine intermontane valleys;
// mountain cost/cover remains active off the road, but no impassable ring is built.
const RIDGES=[
 [[-120.17,39.95],[-119.77,39.0],[-119.35,38.55],[-119.05,37.95],[-118.78,37.4],[-118.53,36.82],[-118.44,36.1]],
 [[-118.47,38.18],[-118.31,37.7],[-118.27,37.25],[-118.11,36.85]],
 [[-117.72,39.92],[-117.49,39.3],[-117.46,38.89]],
 [[-116.68,39.96],[-116.36,39.37],[-116.21,38.7]],
 [[-115.61,39.91],[-115.45,39.26],[-115.33,38.82]],
 [[-115.89,36.79],[-115.74,36.5],[-115.69,36.16]],
 [[-116.85,36.22],[-116.72,35.95],[-116.58,35.62]]
];
// Interstates, US highways, and key desert routes; roads provide valley passability.
const ROADS={
 US95:[[-119.81,39.53],[-118.78,39.47],[-118.63,38.52],[-117.23,38.07],[-117.24,37.71],[-117,37.5],[-116.76,36.91],[-115.99,36.21],[-115.14,36.17]],
 US6:[[-118.63,38.52],[-117.23,38.07],[-116.37,38.19],[-115.96,39.51],[-114.89,39.25]],
 US395:[[-120.18,39.33],[-119.81,39.53],[-119.23,38.26],[-118.97,37.65],[-118.4,37.36],[-118.2,36.8],[-118.06,36.6],[-117.67,35.62]],
 US93:[[-114.89,39.25],[-115.01,38.85],[-114.51,37.62],[-115.19,37.6],[-115.16,37.36],[-115.03,36.24],[-115.14,36.17]],
 I15:[[-114.15,37.2],[-115.03,36.24],[-115.14,36.17],[-116.0,35.2]],
 ImperialWest:[[-118.4,37.36],[-117.49,37.49],[-117,37.5]],
 ImperialEast:[[-114.51,37.62],[-115.79,37.65],[-116.52,37.55],[-117,37.5]],
 ImperialNorth:[[-117.07,39.49],[-117.06,38.71],[-117.23,38.07],[-117.15,37.7],[-117,37.5]],
 ImperialSouth:[[-117.67,35.62],[-116.4,36.64],[-116.98,37.05],[-117,37.5]]
};

/* The capital remains at the established -117,37.5 WGS84 point.
   Both battles use this ONE surveyed regional coordinate frame; only owners,
   armies and objectives differ. Nevada/California/Utah features never move. */
GEOGRAPHIC_CITIES.push(
 ['South Lake Tahoe',-119.977,38.939,'britannia',2,true],
 ['Lee Vining',-119.12,37.958,'britannia',2,false],
 ['Big Pine',-118.29,37.165,'britannia',2,false],
 ['McGill',-114.78,39.41,'britannia',2,true],
 ['Baker',-114.13,38.98,'britannia',2,true],
 ['Mesquite',-114.067,36.806,'britannia',2,true],
 ['Wendover',-114.037,40.739,'britannia',3,true],
 ['Tooele',-112.298,40.53,'britannia',3,true],
 ['Delta',-112.577,39.353,'britannia',3,true],
 ['Fillmore',-112.327,38.968,'britannia',2,true],
 ['Richfield',-111.835,38.773,'britannia',3,true],
 ['Milford',-113.011,38.397,'britannia',3,true],
 ['Beaver',-112.641,38.277,'britannia',3,true],
 ['Cedar City',-113.061,37.677,'britannia',3,true],
 ['Enterprise',-113.721,37.574,'britannia',2,true],
 ['Saint George',-113.583,37.096,'britannia',3,true],
 ['Kanab',-112.527,37.047,'britannia',2,true],
 ['Panguitch',-112.436,37.823,'britannia',2,true],
 ['Fernley',-119.251,39.608,'britannia',2,true],
 ['Lovelock',-118.474,40.179,'britannia',2,true],
 ['Winnemucca',-117.736,40.973,'britannia',3,true],
 ['Elko',-115.763,40.834,'britannia',3,true]
);
RIDGES.push(
 // House and Confusion ranges, Snake Range, Mineral Range, Wasatch foothills,
 // Pine Valley Mountains and the San Rafael highlands. Valleys remain passable.
 [[-113.65,40.0],[-113.32,39.65],[-113.43,39.22],[-113.43,38.94]],
 [[-114.38,39.78],[-114.23,39.22],[-114.20,38.74]],
 [[-113.37,38.95],[-113.20,38.58],[-113.23,38.23]],
 [[-112.05,40.9],[-111.85,40.30],[-111.90,39.78],[-111.83,39.28]],
 [[-113.96,37.77],[-113.63,37.45],[-113.46,37.18]],
 [[-111.80,39.32],[-111.96,38.85],[-112.16,38.45]]
);
Object.assign(ROADS,{
 // I-80 follows Truckee Meadows, the Humboldt corridor and the Salt Flats;
 // US-50/US-6 run through real Great Basin valleys rather than ridgeline cuts.
 I80:[[-119.814,39.53],[-119.251,39.608],[-118.474,40.179],
      [-117.736,40.973],[-115.763,40.834],[-114.037,40.739],
      [-112.298,40.53]],
 US50:[[-119.767,39.163],[-118.777,39.474],[-117.069,39.493],
       [-115.961,39.512],[-114.888,39.247],[-112.577,39.353]],
 US6:[[-118.399,37.361],[-117.231,38.068],[-116.372,38.192],
      [-114.888,39.247],[-112.577,39.353]],
 US395:[[-119.814,39.53],[-119.767,39.163],[-119.231,38.255],
        [-118.973,37.649],[-118.399,37.361],[-118.2,36.802],
        [-118.063,36.606],[-117.67,35.623]],
 I15:[[-112.641,38.277],[-113.061,37.677],[-113.583,37.096],
      [-114.067,36.806],[-115.14,36.17],[-117.02,34.9]],
 UT21:[[-114.13,38.98],[-113.011,38.397],[-112.641,38.277]],
 UT130:[[-113.011,38.397],[-113.061,37.677]],
 UT14:[[-113.061,37.677],[-112.436,37.823]],
 US89:[[-111.835,38.773],[-112.436,37.823],[-112.527,37.047]],
 EastNevadaCorridor:[[-114.888,39.247],[-115.007,38.855],[-114.453,37.929],
       [-114.513,37.615],[-115.192,37.602],[-116.52,37.55]],
 SouthernUtahCorridor:[[-112.641,38.277],[-113.061,37.677],
       [-113.583,37.096],[-114.067,36.806],[-115.164,37.36],[-116.52,37.55]]
});
const DESERT_BASINS=[[-116.96,36.55,1.2,.75],[-117.25,37.9,1.7,1.5],
 [-115.9,38.05,1.65,1.6],[-118.18,38.7,1.2,1.0]];
const EU_STAGING=new Set(["Alamo","Baker","Beaver","Caliente","Cedar City","Delta","Ely","Enterprise","Fillmore","Hiko","Kanab","Lund","McGill","Mesquite","Milford","Panaca","Pioche","Richfield","Saint George","Tooele","Wendover","Panguitch"]);
const EU_ARMIES=[["eu","Tooele","heavy",9,"akito"],["eu","Tooele","rocket",6,null],["eu","Wendover","heavy",8,"leila"],["eu","Wendover","siege",5,null],["eu","Delta","heavy",8,"smilas"],["eu","Delta","rocket",6,"yukiya"],["eu","Fillmore","medium",5,null],["eu","Richfield","heavy",7,"fernando"],["eu","Richfield","siege",5,"oscar"],["eu","Milford","heavy",8,"ayano"],["eu","Milford","rocket",6,null],["eu","Beaver","heavy",8,"marirrosa"],["eu","Beaver","siege",5,null],["eu","Cedar City","heavy",9,"ryo"],["eu","Cedar City","rocket",6,null],["eu","Saint George","heavy",8,"klaus"],["eu","Saint George","assault",6,null],["eu","Enterprise","medium",5,null],["eu","Ely","heavy",10,"anna"],["eu","Ely","siege",6,null],["eu","McGill","heavy",7,"pierre"],["eu","Baker","rocket",6,null],["eu","Pioche","heavy",8,"margaret"],["eu","Pioche","rocket",6,null],["eu","Panaca","assault",6,null],["eu","Caliente","heavy",9,"olivia"],["eu","Caliente","siege",5,null],["eu","Hiko","assault",6,null],["eu","Alamo","heavy",8,null],["eu","Alamo","rocket",6,null],["eu","Mesquite","medium",5,null],["eu","Lund","heavy",5,null],["eu","Kanab","assault",5,null],["eu","Panguitch","assault",5,null]];
const EAST_DEFENSE=[["britannia","Pendragon","heavy",13,"suzaku"],["britannia","Pendragon","rocket",9,"bismarck"],["britannia","Pendragon","siege",7,null],["britannia","Imperial Citadel","heavy",11,"cornelia"],["britannia","Imperial Citadel","siege",8,"schneizel"],["britannia","Imperial Air Command","heavy",10,"gino"],["britannia","Imperial Air Command","rocket",7,null],["britannia","Royal Arsenal","heavy",10,"jeremiah"],["britannia","Royal Arsenal","support",6,null],["britannia","Eastern Imperial Gate","heavy",13,"guilford"],["britannia","Eastern Imperial Gate","rocket",9,"darlton"],["britannia","Eastern Imperial Gate","siege",7,null],["britannia","Northern Imperial Gate","heavy",9,"anya"],["britannia","Northern Imperial Gate","rocket",6,null],["britannia","Southern Imperial Gate","heavy",8,"villetta"],["britannia","Western Imperial Gate","heavy",7,"oldrin"],["britannia","Tonopah","heavy",8,"nonette"],["britannia","Tonopah","rocket",5,null],["britannia","Goldfield","heavy",8,"kewell"],["britannia","Goldfield","rocket",5,null],["britannia","Rachel","heavy",9,"monica"],["britannia","Rachel","siege",6,null],["britannia","Warm Springs","heavy",8,"dorothea"],["britannia","Warm Springs","rocket",6,null],["britannia","Round Mountain","heavy",7,"luciano"],["britannia","Round Mountain","rocket",5,null],["britannia","Austin","heavy",8,"manfredi"],["britannia","Austin","medium",6,null],["britannia","Eureka","heavy",6,"augustus"],["britannia","Las Vegas","heavy",8,null],["britannia","Nellis Air Base","rocket",6,null],["britannia","Pahrump","heavy",8,null],["britannia","Indian Springs","rocket",6,null],["britannia","Gabbs","heavy",6,null],["britannia","Silver Peak","heavy",6,null],["britannia","Lida","heavy",6,null],["britannia","Amargosa Valley","siege",5,null],["britannia","Elko","heavy",7,null],["britannia","Winnemucca","medium",3,null]];
const EU_FRONTS=[
 {name:'Great Basin Northern Advance',side:'eu',bases:['Wendover','Tooele','Delta','Ely'],goal:'Northern Imperial Gate'},
 {name:'Central Nevada Breakthrough',side:'eu',bases:['Milford','Baker','McGill','Pioche'],goal:'Eastern Imperial Gate'},
 {name:'Southern Utah Thrust',side:'eu',bases:['Cedar City','Saint George','Caliente','Alamo'],goal:'Royal Arsenal'},
 {name:'Eastern Imperial Defense',side:'britannia',bases:['Eastern Imperial Gate','Rachel','Tonopah','Warm Springs'],goal:'Eastern Imperial Gate'},
 {name:'Mobile Counteroffensive',side:'britannia',bases:['Pendragon','Royal Arsenal','Imperial Air Command'],goal:'Ely'}
];
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
 lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
 return {c:Math.max(0,Math.min(COLS-1,Math.round((lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1)))),r};}
function segmentDistance(p,a,b){
 const k=Math.cos(p.lat*Math.PI/180),dx=(b[0]-a[0])*k,dy=b[1]-a[1];
 const t=Math.max(0,Math.min(1,(((p.lon-a[0])*k)*dx+(p.lat-a[1])*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot((p.lon-a[0]-t*(b[0]-a[0]))*k,p.lat-a[1]-t*(b[1]-a[1]));
}
function lineDistance(p,line){
 let best=Infinity;for(let i=1;i<line.length;i++)best=Math.min(best,segmentDistance(p,line[i-1],line[i]));
 return best;
}
function landscape(p){
 const road=Math.min(...Object.values(ROADS).map(line=>lineDistance(p,line)));
 const ridge=Math.min(...RIDGES.map(line=>lineDistance(p,line)));
 const basin=Math.max(...DESERT_BASINS.map(([x,y,w,h])=>
   Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*2)));
 // Roads are playable passes, not graphical teleport links. Adjacent cells still
 // require normal movement points; all 136x104 battlefield hexes are land.
 if(road<.045)return 'plains';
 if(ridge<.11)return 'mountain';
 if(ridge<.19 && basin<.5)return 'mountain';
 if(basin>.30)return 'desert';
 return ridge<.3?'forest':'desert';
}
function nearest(g,p,valid,radius=14){
 let best=null,d=Infinity;
 for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
  for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
   const t=E.tile(g,c,r);if(!t||!valid(t))continue;
   const n=E.distance(p,t,g);if(n<d){d=n;best=t;}
  }
 return best;
}
function defineScenario(config){
 const {id:ID,title,attacker,staging,armies,defense,funding:FUNDING,
  startingSeed,openingText,attackerVictory,operationKey,approach,
  fronts,counterattackBases}=config;
 const SIDES=[attacker,'britannia'];
 // Geographic city entries are immutable between stories; ownership alone differs.
 const CITIES=GEOGRAPHIC_CITIES.map(([name,lon,lat,_baselineOwner,tier,fort])=>
  [name,lon,lat,staging.has(name)?attacker:'britannia',tier,fort]);
 const ARMY_GROUPS=[...armies,...defense];
function orderGroup(g,id,target){
 if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
 const gr=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
 if(!gr)return {ok:false,reason:'Army Group not found'};
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
function create(player=attacker,difficulty='normal',seed=startingSeed){
 if(!SIDES.includes(player))throw Error('Unsupported Pendragon faction: '+player);
 if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
 const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
  mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
  seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
  tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
  fallen:{},economy:{},tech:{},officers:Object.fromEntries(
   Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
  roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
  eliteDeployed:{},arsenal:{[attacker]:0,britannia:0},
  automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
  mapRevision:0,teams:{[attacker]:attacker,britannia:'britannia'},factions:{},lineup:{}};
 for(const side of [...SIDES,'neutral']){
  g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
 }
 g.scenario={id:ID,key:operationKey,title,phase:'imperial-final-offensive',
  aiDoctrine:'europe',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
  roads:ROADS,ridges:RIDGES,capitalCoordinate:[-117,37.5],
  approach:approach,operationalFronts:fronts,counterattackBases:counterattackBases,
  mapDatum:'WGS84',mapRegion:'Nevada-Eastern-California-Utah'};
 const eliteIds=Object.keys(E.ELITE_FORCES);
 g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
  eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&E.ELITE_FORCES[id].availableTo.includes(side))]));
 g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
  const c=i%COLS,r=(i/COLS)|0;
  return {c,r,owner:null,terrain:landscape(geo(c,r))};
 });
 for(const [name,lon,lat,owner,tier,fort] of CITIES){
  const p=locate(lon,lat);
  const at=nearest(g,p,t=>t.terrain!=='peak'&&!g.stations.some(s=>s.c===t.c&&s.r===t.r),12);
  if(!at)throw Error('Pendragon station cannot be placed: '+name);
  const capital=name==='Pendragon';
  const inner=['Imperial Citadel','Western Imperial Gate','Eastern Imperial Gate',
   'Southern Imperial Gate','Northern Imperial Gate','Imperial Air Command','Royal Arsenal'].includes(name);
  const shield=capital?1100:inner?650:fort?390:160+60*tier;
  g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
   capital,capitalOf:capital?'britannia':null,fort:!!fort,
   gun:fort?name+' Defensive Battery':null,lab:capital?1:0,refinery:0,
   shield,maxShield:shield,
   income:Math.round((capital?60:tier===3?34:12+8*tier)*.6),
   industry:Math.round((capital?36:tier*8)*.6),
   science:Math.round((2+tier)*.6),producedTurn:0});
  at.terrain='plains';
 }
 // Every land province has a connected ground route; control extends from
 // nearest city without adding invisible borders or impenetrable capital walls.
 for(const t of g.tiles){
  let nearestCity=null,dist=Infinity;
  for(const s of g.stations){const d=E.distance(t,s,g);if(d<dist){dist=d;nearestCity=s;}}
  t.owner=nearestCity.owner;t.provinceCity=nearestCity.id;
 }
 const groupMap=new Map();
 function group(side,name){
  const key=side+':'+name;
  if(!groupMap.has(key)){
   const gr={id:'army-'+groupMap.size,side,name:name+' Army Group',
    origin:name,units:[]};
   groupMap.set(key,gr);g.scenario.groups.push(gr);
  }
  return groupMap.get(key);
 }
 for(const [side,name,cls,count,commander] of ARMY_GROUPS){
  const s=g.stations.find(v=>v.name===name);
  if(!s||s.owner!==side)throw Error('Invalid Pendragon staging city: '+name);
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>t.terrain!=='peak'&&!E.unitAt(g,t)&&t.owner===side&&
    (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),16);
   if(!at)throw Error('Cannot deploy '+name+' Army Group');
   const cmd=i===0?commander:null;
   const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
   group(side,name).units.push(u.id);
   if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
  }
 }
 if(difficulty==='elite')E.prepareEliteEurope(g);
 if(difficulty==='hard'||difficulty==='challenge'){
  for(const side of SIDES.filter(v=>v!==player))
   for(const [i,u] of g.units.filter(v=>v.side===side).entries())
    if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
 }
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
 g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
 E.log(g,openingText,player);
 return g;
}
function onTurn(){return false;}
function strategicScore(g,side){
 return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier+(s.name==='Pendragon'?6:0),0);
}
function objective(g,side=g.player){
 const own=g.stations.filter(s=>s.owner===side).length;
 const remaining=g.stations.length-own;
 return 'Conquer all '+CITIES.length+' cities ('+own+' controlled; '+remaining+
  ' remain). Pendragon is the imperial capital; the other fortresses and cities must also fall.';
}
function winner(g){
 if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
 for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
  return {winner:side,reason:side===attacker?
   attackerVictory:
   'The imperial capital and every city remain under Holy Britannian rule.'};
 return null;
}
const api={id:ID,title,cols:COLS,rows:ROWS,sides:SIDES,
 bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,ridges:RIDGES,roads:ROADS,
 geographicAt:geo,locate,create,onTurn,objective,winner,strategicScore,orderGroup};
 return api;
}
const euApi=defineScenario({
 id:'eu-pendragon',title:'Battle of Pendragon — Eastern Offensive',
 attacker:'eu',staging:EU_STAGING,armies:EU_ARMIES,defense:EAST_DEFENSE,
 funding:{eu:{credits:1850,industry:1250,science:145,sakuradite:80},
  britannia:{credits:2100,industry:1480,science:160,sakuradite:98}},
 startingSeed:201799,operationKey:'pendragon-east',approach:'east',
 fronts:EU_FRONTS,
 counterattackBases:['Rachel','Tonopah','Pendragon','Royal Arsenal','Warm Springs'],
 openingText:'Europia advances westward from Utah and eastern Nevada. Britannian mobile reserves counterattack through the eastern imperial gates.',
 attackerVictory:'Europia United has conquered Pendragon and every remaining Britannian city from the eastern approaches.'
});
root.PENDRAGON_SHARED=Object.freeze({
 defineScenario,BOUNDS,PROJECTION,COLS,ROWS,
 geographicCities:GEOGRAPHIC_CITIES,
 geographicAt:geo,locate,ridges:RIDGES,roads:ROADS
});
E.scenarios={...(E.scenarios||{}),pendragon:euApi,
 byId:{...(E.scenarios?.byId||{}),'eu-pendragon':euApi}};
if(typeof module!=='undefined')module.exports=euApi;
})(typeof window!=='undefined'?window:globalThis);

/* Battle of Pendragon — final Europia United World Campaign battle.
   Pendragon is fictional and fixed at the existing Campaign marker (-117, 37.5).
   Surrounding Nevada and eastern California features are georeferenced to WGS84.
   All theatre cities must change hands: the capital alone does not end the war.
   No new global mechanics or scenario-specific regression tests are introduced. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='eu-pendragon', SIDES=['eu','britannia'];
const COLS=136,ROWS=104;
const BOUNDS={west:-120.5,east:-114,north:40,south:35};
const K=Math.cos(37.5*Math.PI/180);
const PROJECTION={centerLon:-117.25,centerLat:37.5,angle:0,
  uMin:-3.25*K,uMax:3.25*K,vMin:-2.5,vMax:2.5};
// Fictional imperial fortresses are intentionally distinguished from real towns.
// [city, longitude, latitude, controller, factory tier, fortification]
const CITIES=[
 ['Reno',-119.814,39.53,'eu',3,true],
 ['Carson City',-119.767,39.163,'eu',3,true],
 ['Truckee',-120.183,39.328,'eu',2,false],
 ['Fallon',-118.777,39.474,'eu',2,true],
 ['Hawthorne',-118.631,38.524,'eu',2,true],
 ['Bridgeport',-119.231,38.255,'eu',2,false],
 ['Mammoth Lakes',-118.973,37.649,'eu',2,true],
 ['Bishop',-118.399,37.361,'eu',3,true],
 ['Independence',-118.2,36.802,'eu',2,true],
 ['Lone Pine',-118.063,36.606,'eu',2,false],
 ['Ridgecrest',-117.67,35.623,'eu',3,true],
 ['Mojave',-118.174,35.053,'eu',2,false],
 ['Pahrump',-115.984,36.208,'eu',2,true],
 ['Caliente',-114.513,37.615,'eu',2,true],
 ['Pioche',-114.453,37.929,'eu',2,false],
 ['Austin',-117.069,39.493,'eu',2,true],
 ['Dyer',-118.068,37.673,'eu',2,false],
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
 I95:[[-119.81,39.53],[-118.78,39.47],[-118.63,38.52],[-117.23,38.07],[-117.24,37.71],[-117,37.5],[-116.76,36.91],[-115.99,36.21],[-115.14,36.17]],
 US6:[[-118.63,38.52],[-117.23,38.07],[-116.37,38.19],[-115.96,39.51],[-114.89,39.25]],
 US395:[[-120.18,39.33],[-119.81,39.53],[-119.23,38.26],[-118.97,37.65],[-118.4,37.36],[-118.2,36.8],[-118.06,36.6],[-117.67,35.62]],
 US93:[[-114.89,39.25],[-115.01,38.85],[-114.51,37.62],[-115.19,37.6],[-115.16,37.36],[-115.03,36.24],[-115.14,36.17]],
 I15:[[-114.15,37.2],[-115.03,36.24],[-115.14,36.17],[-116.0,35.2]],
 ImperialWest:[[-118.4,37.36],[-117.49,37.49],[-117,37.5]],
 ImperialEast:[[-114.51,37.62],[-115.79,37.65],[-116.52,37.55],[-117,37.5]],
 ImperialNorth:[[-117.07,39.49],[-117.06,38.71],[-117.23,38.07],[-117.15,37.7],[-117,37.5]],
 ImperialSouth:[[-117.67,35.62],[-116.4,36.64],[-116.98,37.05],[-117,37.5]]
};
const DESERT_BASINS=[[-116.96,36.55,1.2,.75],[-117.25,37.9,1.7,1.5],
 [-115.9,38.05,1.65,1.6],[-118.18,38.7,1.2,1.0]];
const ARMY_GROUPS=[
 ['eu','Reno','heavy',5,'akito'],['eu','Reno','rocket',3,'yukiya'],['eu','Carson City','assault',4,'leila'],
 ['eu','Fallon','heavy',4,'smilas'],['eu','Fallon','siege',3,'oscar'],
 ['eu','Hawthorne','assault',4,'ryo'],['eu','Hawthorne','rocket',3,null],
 ['eu','Austin','heavy',5,'ayano'],['eu','Austin','siege',3,'anna'],
 ['eu','Mammoth Lakes','heavy',4,'pierre'],['eu','Mammoth Lakes','rocket',3,null],
 ['eu','Bishop','heavy',5,'fernando'],['eu','Bishop','siege',3,null],
 ['eu','Independence','assault',4,'olivia'],['eu','Lone Pine','rocket',3,null],
 ['eu','Ridgecrest','heavy',5,'margaret'],['eu','Ridgecrest','rocket',3,null],
 ['eu','Pahrump','heavy',5,'klaus'],['eu','Pahrump','siege',3,null],
 ['eu','Caliente','heavy',5,null],['eu','Caliente','rocket',3,null],
 ['eu','Pioche','assault',3,null],['eu','Dyer','medium',3,null],
 ['eu','Mojave','assault',3,null],
 ['britannia','Pendragon','heavy',6,'suzaku'],['britannia','Pendragon','rocket',4,'bismarck'],
 ['britannia','Imperial Citadel','heavy',5,'cornelia'],['britannia','Imperial Citadel','siege',4,'schneizel'],
 ['britannia','Imperial Air Command','heavy',4,'gino'],['britannia','Imperial Air Command','rocket',3,null],
 ['britannia','Royal Arsenal','heavy',4,'jeremiah'],['britannia','Royal Arsenal','support',3,'cecile'],
 ['britannia','Western Imperial Gate','heavy',4,'guilford'],['britannia','Western Imperial Gate','rocket',3,'darlton'],
 ['britannia','Eastern Imperial Gate','heavy',4,'oldrin'],['britannia','Eastern Imperial Gate','siege',3,null],
 ['britannia','Southern Imperial Gate','heavy',3,'villetta'],['britannia','Southern Imperial Gate','rocket',2,null],
 ['britannia','Northern Imperial Gate','heavy',4,'kewell'],['britannia','Northern Imperial Gate','siege',3,null],
 ['britannia','Tonopah','heavy',4,null],['britannia','Tonopah','rocket',3,null],
 ['britannia','Goldfield','heavy',4,null],['britannia','Goldfield','siege',2,null],
 ['britannia','Ely','heavy',3,null],['britannia','Las Vegas','heavy',4,null],
 ['britannia','Nellis Air Base','rocket',3,null],['britannia','Beatty','medium',3,null],
 ['britannia','Rachel','assault',3,null],['britannia','Alamo','medium',3,null],
 ['britannia','Warm Springs','heavy',3,null],['britannia','Gabbs','medium',3,null],
 ['britannia','Eureka','medium',3,null],['britannia','Round Mountain','support',2,null],
 ['britannia','Indian Springs','heavy',3,null],['britannia','Amargosa Valley','rocket',2,null],
 ['britannia','Lida','assault',2,null],['britannia','Mercury','support',2,null]
];
const FUNDING={
 eu:{credits:1420,industry:940,science:116,sakuradite:62},
 britannia:{credits:1540,industry:1080,science:125,sakuradite:72}
};
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
function create(player='eu',difficulty='normal',seed=201799){
 if(!SIDES.includes(player))throw Error('Unsupported Pendragon faction: '+player);
 if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
 const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
  mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
  seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
  tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
  fallen:{},economy:{},tech:{},officers:Object.fromEntries(
   Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
  roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
  eliteDeployed:{},arsenal:{eu:0,britannia:0},
  automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
  mapRevision:0,teams:{eu:'eu',britannia:'britannia'},factions:{},lineup:{}};
 for(const side of [...SIDES,'neutral']){
  g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
 }
 g.scenario={id:ID,key:'pendragon',title:'Battle of Pendragon',phase:'imperial-final-offensive',
  aiDoctrine:'europe',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
  roads:ROADS,ridges:RIDGES,capitalCoordinate:[-117,37.5]};
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
 E.log(g,'The final offensive begins. E.U. armies converge through Nevada and the Sierra Nevada passes; Britannia defends its last imperial citadel.',player);
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
  return {winner:side,reason:side==='eu'?
   'Europia United has captured Pendragon and every remaining Britannian city. The Holy Britannian Empire has fallen.':
   'The imperial capital and every city remain under Holy Britannian rule.'};
 return null;
}
const api={id:ID,title:'Battle of Pendragon',cols:COLS,rows:ROWS,sides:SIDES,
 bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,ridges:RIDGES,roads:ROADS,
 geographicAt:geo,locate,create,onTurn,objective,winner,strategicScore,orderGroup};
E.scenarios={...(E.scenarios||{}),pendragon:api,
 byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

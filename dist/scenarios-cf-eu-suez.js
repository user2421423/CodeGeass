/* Crossing the Suez Canal — standalone Chinese Federation vs E.U. regional scenario.
   Egyptian geography is represented by actual WGS84 city anchors and legible
   tactical shorelines. The canal is rasterised wider than its real ~200m width. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='cf-eu-suez',KEY='cfEuSuez',SIDES=['cf','eu'];
const COLS=144,ROWS=112,BOUNDS={west:28.75,east:35.55,north:32.05,south:27.65};
const K=Math.cos(29.85*Math.PI/180);
const PROJECTION={centerLon:32.15,centerLat:29.85,angle:0,
 uMin:-3.4*K,uMax:3.4*K,vMin:-2.2,vMax:2.2};
const CITIES=[["Cairo",31.235,30.044,"eu",3,true],["Giza",31.211,30.013,"eu",3,true],["Helwan",31.334,29.846,"eu",2,true],["New Cairo",31.491,30.029,"eu",2,false],["6th October City",30.975,29.928,"eu",3,true],["Faiyum",30.842,29.309,"eu",3,true],["Beni Suef",31.109,29.074,"eu",2,false],["Qalyub",31.206,30.179,"eu",2,false],["Benha",31.183,30.467,"eu",2,true],["Tanta",31.003,30.788,"eu",3,true],["Shibin El Kom",31.01,30.554,"eu",2,false],["Damanhur",30.467,31.035,"eu",2,false],["Kafr El Sheikh",30.942,31.111,"eu",2,false],["Rosetta",30.417,31.405,"eu",2,true],["Alexandria",29.919,31.2,"eu",3,true],["Borg El Arab",29.608,30.916,"eu",2,false],["El Alamein",28.953,30.83,"eu",2,false],["Mansoura",31.378,31.04,"eu",3,true],["Mit Ghamr",31.258,30.716,"eu",2,false],["Damietta",31.814,31.417,"eu",3,true],["Port Said",32.302,31.265,"eu",3,true],["Zagazig",31.503,30.587,"eu",3,true],["Bilbeis",31.567,30.421,"eu",2,false],["Ismailia",32.272,30.596,"eu",3,true],["El Qantara West",32.279,30.857,"eu",2,true],["Suez",32.55,29.966,"eu",3,true],["Ain Sukhna",32.354,29.604,"eu",2,false],["Ras Gharib",32.354,28.36,"eu",2,false],["El Salheya",32.089,30.743,"eu",2,false],["Port Fuad",32.341,31.253,"cf",2,true],["Qantara East",32.372,30.856,"cf",3,true],["Abu Suweir East",32.453,30.557,"cf",3,true],["Serapeum East",32.497,30.453,"cf",2,true],["El Arish",33.798,31.132,"cf",3,true],["Rafah",34.245,31.282,"cf",2,true],["Sheikh Zuweid",34.113,31.217,"cf",2,false],["Bir al Abd",33.011,31.019,"cf",2,false],["Bir Thamada",33.012,30.31,"cf",2,false],["Nakhl",33.751,29.906,"cf",2,false],["Ras Sudr",32.724,29.601,"cf",3,true],["Abu Zenima",33.13,29.049,"cf",2,false],["Abu Rudeis",33.202,28.899,"cf",2,false],["El Tor",33.623,28.239,"cf",3,true],["Sharm el-Sheikh",34.33,27.916,"cf",3,true],["Nuweiba",34.664,29.035,"cf",2,false],["Taba",34.898,29.492,"cf",2,false]];
const ARMY_GROUPS=[["cf","Qantara East","Northern Canal Spearhead","heavy",8,"xingke"],["cf","Qantara East","Northern Canal Spearhead","rocket",6,"xianglin"],["cf","Qantara East","Northern Canal Spearhead","assault",3,null],["cf","Port Fuad","Delta Amphibious Wing","assault",5,"meiling"],["cf","Port Fuad","Delta Amphibious Wing","medium",3,null],["cf","Abu Suweir East","Central Canal Breakthrough","heavy",9,"honggu"],["cf","Abu Suweir East","Central Canal Breakthrough","rocket",6,"zhaohao"],["cf","Abu Suweir East","Central Canal Breakthrough","siege",3,null],["cf","Abu Suweir East","Central Canal Breakthrough","assault",3,null],["cf","Serapeum East","Ismailia Assault Force","heavy",7,"gaohai"],["cf","Serapeum East","Ismailia Assault Force","assault",3,null],["cf","Ras Sudr","Suez Southern Column","heavy",8,"leifeng"],["cf","Ras Sudr","Suez Southern Column","rocket",5,null],["cf","El Arish","Sinai Strategic Reserve","heavy",9,"cao"],["cf","El Arish","Sinai Strategic Reserve","siege",3,null],["cf","Bir al Abd","Northern Sinai Reserve","assault",4,null],["cf","Nakhl","Desert Flanking Force","medium",4,"lifeng"],["cf","El Tor","Red Sea Amphibious Corps","assault",6,null],["eu","El Qantara West","West Bank Northern Corps","heavy",5,"akito"],["eu","El Qantara West","West Bank Northern Corps","rocket",4,"yukiya"],["eu","El Qantara West","West Bank Northern Corps","siege",2,null],["eu","Ismailia","Ismailia Fortified Sector","heavy",4,"smilas"],["eu","Ismailia","Ismailia Fortified Sector","rocket",4,null],["eu","Suez","Suez Defensive Line","heavy",4,"oscar"],["eu","Suez","Suez Defensive Line","rocket",4,null],["eu","Suez","Suez Defensive Line","siege",3,null],["eu","Port Said","Port Said Garrison","heavy",3,"ayano"],["eu","Damietta","Delta Coastal Command","heavy",4,"anna"],["eu","Damietta","Delta Coastal Command","medium",3,null],["eu","Mansoura","Delta Mobile Reserve","heavy",4,"klaus"],["eu","Mansoura","Delta Mobile Reserve","rocket",4,null],["eu","Zagazig","Eastern Egypt Counterattack","heavy",4,"olivia"],["eu","Cairo","Cairo Defense Army","heavy",5,"leila"],["eu","Cairo","Cairo Defense Army","rocket",5,null],["eu","Alexandria","Alexandria Coastal Command","heavy",4,"fernando"],["eu","Alexandria","Alexandria Coastal Command","medium",4,null],["eu","Ain Sukhna","Red Sea Coastal Command","heavy",3,"marirrosa"],["eu","Giza","Cairo Mobile Reserve","assault",4,"ryo"]];
const PORTS={'Alexandria':3,'Rosetta':2,'Damietta':2,'Port Said':3,
 'Ismailia':2,'Suez':3,'Ain Sukhna':2,'Ras Gharib':2,
 'Port Fuad':3,'Qantara East':2,'El Arish':2,'El Tor':3,
 'Sharm el-Sheikh':3,'Nuweiba':2};
const FLEETS=[
 ['eu','Alexandria','eu_carrier',2],['eu','Alexandria','panzer_frosch_ii',2],
 ['eu','Port Said','eu_carrier',2],['eu','Port Said','panzer_frosch_ii',2],
 ['eu','Suez','eu_carrier',2],['eu','Ain Sukhna','panzer_frosch_ii',3],
 ['cf','Port Fuad','cf_carrier',2],['cf','El Arish','shui_gun_ru_ii',3],
 ['cf','El Tor','cf_carrier',2],['cf','El Tor','shui_gun_ru_ii',3],
 ['cf','Sharm el-Sheikh','cf_carrier',1],
 ['cf','Nuweiba','shui_gun_ru_ii',2]];
const FUNDING={cf:{credits:1100,industry:650,science:112,sakuradite:60},
 eu:{credits:1010,industry:610,science:108,sakuradite:57}};
const RIVERS={
 Nile:[[31.12,28.4],[31.10,29.08],[31.22,29.58],[31.235,30.044],[31.185,30.47]],
 RosettaBranch:[[31.185,30.47],[31.00,30.79],[30.73,31.09],[30.417,31.405]],
 DamiettaBranch:[[31.185,30.47],[31.27,30.72],[31.378,31.04],[31.814,31.417]]
};
// Real geographic control points. Hex-scale water width is exaggerated at Suez.
const MEDITERRANEAN=[[28.75,30.77],[28.953,30.83],[29.919,31.20],
 [30.417,31.405],[30.95,31.50],[31.814,31.417],
 [32.302,31.265],[33.0,31.13],[33.798,31.132],
 [34.245,31.282],[35.55,31.25]];
const CANAL=[[32.302,31.265],[32.310,30.94],[32.280,30.596],
 [32.382,30.34],[32.550,29.966]];
const BRIDGES=[['Qantara',32.31,30.857],['Ismailia',32.28,30.596],
 ['Suez',32.55,29.966]];
const WEST_GULF=[[27.65,32.76],[28.36,32.354],[29.05,32.42],
 [29.60,32.354],[29.966,32.550]];
const EAST_GULF=[[27.65,34.06],[28.239,33.623],[28.90,33.20],
 [29.60,32.724],[29.966,32.655]];
const AQABA_WEST=[[27.65,34.18],[27.916,34.330],[29.035,34.664],
 [29.492,34.898]];
const AQABA_EAST=[[27.65,34.84],[27.916,34.92],[29.035,35.01],
 [29.492,35.08]];
function interpolate(y,points){for(let i=1;i<points.length;i++){
 const a=points[i-1],b=points[i];
 if(y<=b[0])return a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));
 }return points[points.length-1][1];}
function coastLatitude(x){const p=MEDITERRANEAN;
 for(let i=1;i<p.length;i++)if(x<=p[i][0]){
  const a=p[i-1],b=p[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
 }return p[p.length-1][1];}
function lineDistance(p,points){
 let best=Infinity;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],vx=(b[0]-a[0])*.866,vy=b[1]-a[1],
   px=(p.lon-a[0])*.866,py=p.lat-a[1],
   d=vx*vx+vy*vy,t=d?Math.max(0,Math.min(1,(px*vx+py*vy)/d)):0;
  best=Math.min(best,Math.hypot(px-t*vx,py-t*vy));
 }return best;
}
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
 lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,
 Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
 return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
 (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};}
function seaAt(p){
 if(p.lat>coastLatitude(p.lon))return true;
 // South of Ras Muhammad (27.73 N), the two gulfs join the Red Sea.
 // Keep a navigable southern mouth instead of trapping Aqaba flotillas.
 if(p.lat<27.74&&p.lon>=32.62&&p.lon<=35.10)return true;
 if(p.lat>=29.94&&p.lat<=31.28&&lineDistance(p,CANAL)<.080)return true;
 if(p.lat<29.966){
  const west=interpolate(p.lat,WEST_GULF),east=interpolate(p.lat,EAST_GULF);
  if(p.lon>=west&&p.lon<=east)return true;
 }
 if(p.lat<29.492){
  const west=interpolate(p.lat,AQABA_WEST),east=interpolate(p.lat,AQABA_EAST);
  if(p.lon>=west&&p.lon<=east)return true;
 }return false;
}
function crossingAt(p){return BRIDGES.some(([,lon,lat])=>
 Math.abs(p.lat-lat)<.046&&Math.abs(p.lon-lon)<.155&&
 lineDistance(p,CANAL)<.095);}
function landscape(p,c,r){
 if(p.lon>32.1&&p.lat<31.05&&p.lon<34.9){
  if(p.lon>33.05&&p.lat<29.9&&p.lat>28.3&&((c*11+r*7)%29)<5)return 'mountain';
  if(p.lat<29.15&&p.lon>33.0&&p.lon<34.2)return 'mountain';
  return 'desert';
 }
 if(p.lon<32.2&&p.lat<29.6&&p.lon>31.5)return 'desert';
 if(p.lon>31.7&&p.lat<31.2&&p.lon<32.3)return 'desert';
 if(p.lat>30.0&&p.lat<31.4&&p.lon>30.3&&p.lon<32.15)
  return (c*7+r*13)%17<4?'forest':'plains';
 return 'plains';
}
function nearest(g,p,valid,radius=12){
 let pick=null,best=Infinity;
 for(let r=Math.max(0,p.r-radius);r<=Math.min(ROWS-1,p.r+radius);r++)
 for(let c=Math.max(0,p.c-radius);c<=Math.min(COLS-1,p.c+radius);c++){
  const t=E.tile(g,c,r);
  if(!t||!valid(t))continue;
  const d=E.distance(p,t,g);if(d<best){best=d;pick=t;}
 }return pick;
}
function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group units can reach destination');}
function riverBarriers(g){
 const segments=Object.values(RIVERS).flatMap(line=>
  line.slice(1).map((p,i)=>[line[i],p]));
 const crosses=(a,b,x,y)=>{
  const cross=(p,q,r)=>(q.lon-p.lon)*(r.lat-p.lat)-(q.lat-p.lat)*(r.lon-p.lon);
  const x1={lon:x[0],lat:x[1]},y1={lon:y[0],lat:y[1]},
   u=cross(a,b,x1),v=cross(a,b,y1),m=cross(x1,y1,a),n=cross(x1,y1,b);
  return ((u>0&&v<0)||(u<0&&v>0))&&((m>0&&n<0)||(m<0&&n>0));
 };
 const bridges=g.stations.filter(s=>['Cairo','Giza','Benha','Tanta',
  'Mansoura','Damietta','Rosetta'].includes(s.name));
 const edges={};
 for(const t of g.tiles){
  if(t.terrain==='sea'||E.TERRAIN[t.terrain]?.blocked)continue;
  const a=geo(t.c,t.r),i=t.r*COLS+t.c;
  for(const n of E.adjacent(g,t)){
   const j=n.r*COLS+n.c;
   if(j<=i||n.terrain==='sea'||E.TERRAIN[n.terrain]?.blocked)continue;
   if(bridges.some(s=>E.distance(s,t,g)<=1&&E.distance(s,n,g)<=1))continue;
   if(segments.some(([x,y])=>crosses(a,geo(n.c,n.r),x,y)))edges[i+':'+j]=true;
  }
 }return edges;
}
function create(player='cf',difficulty='normal',seed=201708){
 if(!SIDES.includes(player))throw Error('Unsupported Suez side: '+player);
 if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
 const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
  mode:'scenario',era:ID,order:[player,...SIDES.filter(x=>x!==player)],
  seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
  tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
  fallen:{},economy:{},tech:{},officers:Object.fromEntries(
   Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
  roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
  eliteDeployed:{},arsenal:{cf:0,eu:0},
  automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
  mapRevision:0,teams:null,factions:{},lineup:{}};
 for(const side of [...SIDES,'neutral']){
  g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
 }
 g.scenario={id:ID,key:KEY,title:'Crossing the Suez Canal',version:1,
  phase:'sinai-canal-offensive',aiDoctrine:'europe',groups:[],funding:{},
  bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,
  riverCrossings:['Cairo','Giza','Benha','Tanta','Mansoura','Rosetta','Damietta'],
  canal:CANAL,canalCrossings:BRIDGES,
  operationalFronts:[
   {name:'Northern Canal',attack:'cf',bases:['Qantara East','Port Fuad'],
    route:['El Qantara West','Port Said','Damietta','Mansoura']},
   {name:'Central Canal',attack:'cf',bases:['Abu Suweir East','Serapeum East'],
    route:['Ismailia','Zagazig','Benha','Cairo']},
   {name:'Southern Canal',attack:'cf',bases:['Ras Sudr'],
    route:['Suez','Ain Sukhna','Helwan','Cairo']},
   {name:'Delta Counterattack',attack:'eu',bases:['Mansoura','Zagazig'],
    route:['Ismailia','Qantara East','El Arish']},
   {name:'Red Sea Counterattack',attack:'eu',bases:['Suez','Ain Sukhna'],
    route:['Ras Sudr','El Tor']}],
  offensiveAxes:{cf:{
   'Northern Canal Spearhead':['El Qantara West','Port Said','Damietta','Mansoura'],
   'Delta Amphibious Wing':['Port Said','Damietta','Mansoura'],
   'Central Canal Breakthrough':['Ismailia','Zagazig','Benha','Cairo'],
   'Ismailia Assault Force':['Ismailia','Zagazig','Cairo'],
   'Suez Southern Column':['Suez','Ain Sukhna','Helwan','Cairo'],
   'Sinai Strategic Reserve':['Ismailia','Cairo'],
   'Desert Flanking Force':['Suez','Cairo'],
   'Red Sea Amphibious Corps':['Ain Sukhna','Suez','Helwan']},
   eu:{
    'West Bank Northern Corps':['Qantara East','Bir al Abd','El Arish'],
    'Ismailia Fortified Sector':['Abu Suweir East','Serapeum East','El Arish'],
    'Suez Defensive Line':['Ras Sudr','El Tor'],
    'Delta Mobile Reserve':['Qantara East','El Arish'],
    'Eastern Egypt Counterattack':['Serapeum East','Nakhl']}}};
 g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
  Object.keys(E.ELITE_FORCES).filter(id=>
   !E.ELITE_FORCES[id].scenarioOnly&&E.ELITE_FORCES[id].availableTo.includes(side))]));
 g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
  const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),sea=seaAt(p);
  return {c,r,owner:null,terrain:sea?(crossingAt(p)?'coast':'sea'):landscape(p,c,r)};
 });
 // Coast is dual-passable in the existing engine. The three narrow coast ribbons
 // make named bridges traversable; elsewhere the canal consists of actual sea.
 for(const t of g.tiles)if(t.terrain!=='sea'&&
   E.adjacent(g,t).some(n=>n.terrain==='sea')&&t.terrain!=='coast')
    t.terrain='coast';
 for(const [name,lon,lat,owner,tier,fort] of CITIES){
  const port=Object.prototype.hasOwnProperty.call(PORTS,name);
  const at=nearest(g,locate(lon,lat),t=>
   t.terrain!=='sea'&&t.terrain!=='offmap'&&
   !E.TERRAIN[t.terrain]?.blocked&&!g.stations.some(s=>s.c===t.c&&s.r===t.r)&&
   (!port||E.adjacent(g,t).some(n=>n.terrain==='sea')),port?14:8);
  if(!at)throw Error('Suez city or berth inaccessible: '+name);
  const capital=name==='Cairo'||name==='El Arish';
  const shield=E.scenarioCityDefenseHP(tier,fort,name);
  g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
   capital,capitalOf:capital?owner:null,fort,gun:fort?name+' Fortified Battery':null,
   lab:0,refinery:0,shield,maxShield:shield,
   income:Math.round((capital?50:tier===3?33:tier===2?23:14)*.65),
   industry:Math.round((capital?28:7*tier)*.65),
   science:Math.round((tier+2)*.65),producedTurn:0});
 }
 // Separate land components keep sea cells unowned and prevent phantom islands.
 const component=new Int16Array(g.tiles.length).fill(-1);
 let next=0;
 for(let i=0;i<g.tiles.length;i++){
  if(g.tiles[i].terrain==='sea'||component[i]>=0)continue;
  const queue=[g.tiles[i]];component[i]=next;
  for(let j=0;j<queue.length;j++)for(const n of E.adjacent(g,queue[j])){
   const k=n.r*COLS+n.c;
   if(n.terrain!=='sea'&&component[k]<0){component[k]=next;queue.push(n);}
  }next++;
 }
 const byComponent=new Map();
 for(const s of g.stations){
  const id=component[s.r*COLS+s.c];
  if(!byComponent.has(id))byComponent.set(id,[]);
  byComponent.get(id).push(s);
 }
 for(const t of g.tiles)if(t.terrain!=='sea'){
  const cities=byComponent.get(component[t.r*COLS+t.c])||[];
  let pick=null,dist=Infinity;
  for(const s of cities){const d=E.distance(t,s,g);if(d<dist){dist=d;pick=s;}}
  if(pick){t.owner=pick.owner;t.provinceCity=pick.id;}
 }
 g.scenario.riverBarriers=riverBarriers(g);
 const groupMap=new Map();
 function group(side,name,origin){
  const key=side+':'+name;
  if(!groupMap.has(key)){
   const gr={id:'army-'+groupMap.size,side,name,origin,units:[]};
   groupMap.set(key,gr);g.scenario.groups.push(gr);
  }return groupMap.get(key);
 }
 for(const [side,city,name,cls,count,commander] of ARMY_GROUPS){
  const s=g.stations.find(v=>v.name===city);
  if(!s||s.owner!==side)throw Error('Incorrect Suez Army Group origin '+city);
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>t.terrain!=='sea'&&
    !E.TERRAIN[t.terrain]?.blocked&&!E.unitAt(g,t)&&t.owner===side&&
    (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),17);
   if(!at)throw Error('Suez Army Group could not deploy near '+city);
   const cmd=i===0?commander:null;
   const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
   group(side,name,city).units.push(u.id);
   if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
  }
 }
 const used=new Set();
 for(const [name,level] of Object.entries(PORTS)){
  const s=g.stations.find(x=>x.name===name);
  if(!s)throw Error('Missing Suez port '+name);
  const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&
   !used.has(E.key(t))&&!g.stations.some(x=>x.c===t.c&&x.r===t.r))
   .sort((a,b)=>E.adjacent(g,b).filter(t=>t.terrain==='sea').length-
      E.adjacent(g,a).filter(t=>t.terrain==='sea').length)[0];
  if(!at)throw Error('No true water berth at '+name);
  s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
  used.add(E.key(at));
 }
 for(const [side,name,type,count] of FLEETS){
  const s=g.stations.find(x=>x.name===name);
  if(!s||!E.TYPES[type]?.naval)throw Error('Invalid Suez fleet '+name+'/'+type);
  const fleet={id:'fleet-'+g.scenario.groups.length,side,name:name+' Fleet',
   origin:name,units:[]};
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
    !used.has(E.key(t))&&!g.stations.some(v=>v.c===t.c&&v.r===t.r),20);
   if(!at)throw Error('No available Suez fleet tile at '+name);
   fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
  }g.scenario.groups.push(fleet);
 }
 if(difficulty==='elite')E.prepareEliteEurope(g);
 for(const side of SIDES){
  const factor=side===player?1:E.scenarioIncomeFactor(difficulty);
  const base=E.income(g,side);
  g.scenario.funding[side]=Object.fromEntries(
   Object.entries(FUNDING[side]).map(([res,n])=>[res,Math.round(n*factor)-base[res]]));
  const actual=E.income(g,side);
  for(const resource of Object.keys(FUNDING[side]))
   g.economy[side][resource]=actual[resource]*2;
 }
 if(difficulty!=='normal'&&difficulty!=='elite'){
  for(const side of SIDES.filter(x=>x!==player))
   for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
    E.addDifficultyFrames(u,difficulty);
 }
 g.startUnits=Object.fromEntries(SIDES.map(side=>[side,
  g.units.filter(u=>u.side===side).length]));
 E.log(g,'Federation Army Groups advance from Sinai across the guarded Suez Canal; E.U. defenses cover Ismailia, Cairo, Alexandria and the Nile Delta. Amphibious forces may bypass the canal line.',player);
 return g;
}
function onTurn(){return false;}
function strategicScore(g,side){return g.stations.filter(s=>s.owner===side)
 .reduce((score,s)=>score+s.tier,0);}
function objective(g,side=g.player){
 return 'Control all '+CITIES.length+' Suez theatre cities ('+
  g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+
  '). No turn limit. Destroy a surviving Federation expedition to secure E.U. victory.';
}
function winner(g){
 if(g.mode!=='scenario'||g.scenario?.id!==ID||
  g.stations.length!==CITIES.length)return null;
 if(g.stations.every(s=>s.owner==='cf'))return {winner:'cf',
  reason:'The Chinese Federation controls every Suez and Egyptian theatre city.'};
 if(g.stations.every(s=>s.owner==='eu')){
  const surviving=g.units.some(u=>(u.side==='cf'&&u.hp>0)||
   (u.cargo||[]).some(v=>v.side==='cf'&&v.hp>0));
  if(!surviving)return {winner:'eu',
   reason:'The E.U. has recovered all theatre cities and destroyed the Sinai expedition.'};
 }
 return null;
}
const api={id:ID,title:'Crossing the Suez Canal',cols:COLS,rows:ROWS,
 sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
 fleetData:FLEETS,ports:PORTS,rivers:RIVERS,bridges:BRIDGES,
 create,onTurn,objective,winner,strategicScore,orderGroup};
api.meta={
 elite:true,eliteRosterOnly:true,expeditionSide:'cf',saveVersion:1,
 terrainCosts:{mountain:2},
 map:{centreSampled:true,coastBuffer:0,overviewMarkers:true,
  overlays:['regionalRivers'],homeZoom:2.8},
 ai:{doctrine:'europe',recovery:true,routeBias:'cf',
  operationalAxes:{invader:'cf',defender:'eu',axes:{
   'Northern Canal Spearhead':['El Qantara West','Port Said','Damietta'],
   'Delta Amphibious Wing':['Port Said','Damietta','Mansoura'],
   'Central Canal Breakthrough':['Ismailia','Zagazig','Cairo'],
   'Ismailia Assault Force':['Ismailia','Zagazig','Cairo'],
   'Suez Southern Column':['Suez','Ain Sukhna','Helwan'],
   'Red Sea Amphibious Corps':['Ain Sukhna','Suez','Helwan']},
   defenderHubs:['Port Said','El Qantara West','Ismailia','Suez',
    'Zagazig','Mansoura','Cairo','Alexandria']}},
 text:{
  era:'Suez Canal and Nile Delta · Alternate 2017',
  intro:'The Chinese Federation attacks from Sinai across Qantara, Ismailia and Suez, backed by amphibious forces. Break the fortified E.U. west bank and advance through Cairo, Alexandria and the Nile Delta.',
  diplomacy:'Both factions are playable. All ports are individually capturable. Federation units survive the loss of all Sinai cities, and E.U. victory requires their elimination. No turn-limit victory.',
  terrain:'The canal is navigable water with three bridge/ferry corridors. The Nile and Delta branches impose a movement surcharge away from road bridges. Southern Sinai terrain restricts movement.',
  elite:'Elite uses faction-eligible Elite Forces and standard HQ restrictions. Carriers remain conventional. Rewards require real total conquest.',
  focus:{cf:'Qantara East',eu:'Ismailia'}},
 blurbs:{
  cf:'Synchronize the Qantara, Ismailia and Suez crossings. Use Mediterranean and Red Sea landings to outflank fortified positions before advancing to Cairo.',
  eu:'Hold the west-bank line, defend Alexandria and the Delta, protect naval approaches and counterattack the Sinai expedition with mobile reserves.'}
};
E.scenarios={...(E.scenarios||{}),[KEY]:api,
 byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

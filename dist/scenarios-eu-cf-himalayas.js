/* Crossing the Himalayas — E.U. vs Chinese Federation World Campaign mission 10.
   WGS84 control-point relief with open pass corridors; no invented ocean or ports.
   Only this independent scenario module is owned by the scenario lane. */
(function(root) {
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='eu-cf-himalayas', SIDES=['eu','cf'], COLS=144, ROWS=108;
const BOUNDS={west:74.4,east:96.5,north:35.8,south:25.8};
const MID=(BOUNDS.north+BOUNDS.south)/2, K=Math.cos(MID*Math.PI/180);
const PROJECTION={centerLon:(BOUNDS.west+BOUNDS.east)/2,centerLat:MID,
 angle:0,uMin:-(BOUNDS.east-BOUNDS.west)*K/2,uMax:(BOUNDS.east-BOUNDS.west)*K/2,
 vMin:-(BOUNDS.north-BOUNDS.south)/2,vMax:(BOUNDS.north-BOUNDS.south)/2};
// [city, longitude, latitude, owner, factory tier, fortified].
const CITIES=[["Kargil",76.13,34.55,"eu",2,0],["Leh",77.58,34.15,"eu",3,1],["Chushul",78.65,33.55,"eu",2,1],["Demchok",79.55,32.68,"eu",2,1],["Keylong",77.04,32.57,"eu",2,0],["Manali",77.18,32.24,"eu",2,0],["Dharamshala",76.32,32.22,"eu",2,0],["Shimla",77.17,31.1,"eu",3,1],["Dehradun",78.03,30.32,"eu",3,1],["Joshimath",79.57,30.56,"eu",2,1],["Uttarkashi",78.44,30.73,"eu",2,0],["Pithoragarh",80.21,29.58,"eu",3,1],["Dharchula",80.56,29.85,"eu",2,1],["Simikot",81.81,29.97,"eu",2,1],["Jumla",82.18,29.27,"eu",2,0],["Nepalgunj",81.62,28.05,"eu",3,0],["Pokhara",83.99,28.21,"eu",3,1],["Jomsom",83.73,28.79,"eu",2,1],["Kathmandu",85.32,27.71,"eu",3,1],["Syabrubesi",85.32,28.16,"eu",2,1],["Kodari",85.95,27.95,"eu",2,1],["Dhulikhel",85.55,27.62,"eu",2,0],["Salleri",86.59,27.5,"eu",2,0],["Siliguri",88.43,26.73,"eu",3,1],["Gangtok",88.61,27.33,"eu",3,1],["Thimphu",89.64,27.47,"eu",3,1],["Paro",89.41,27.43,"eu",2,0],["Tawang",91.88,27.59,"eu",3,1],["Bomdila",92.42,27.26,"eu",2,1],["Tezpur",92.8,26.63,"eu",3,0],["Itanagar",93.61,27.09,"eu",3,0],["Rutog",79.74,33.43,"cf",2,1],["Shiquanhe",80.09,32.5,"cf",3,1],["Zanda",79.8,31.48,"cf",2,0],["Moincer",81.15,31,"cf",2,0],["Purang",81.18,30.29,"cf",3,1],["Coqen",85.16,31.02,"cf",2,1],["Nyima",87.24,31.79,"cf",2,0],["Saga",85.23,29.33,"cf",3,1],["Gyirong",85.33,28.38,"cf",2,1],["Zhangmu",85.95,27.98,"cf",2,1],["Nyalam",85.98,28.17,"cf",2,1],["Tingri",87.1,28.66,"cf",3,1],["Lhatse",87.64,29.08,"cf",2,1],["Shigatse",88.88,29.27,"cf",3,1],["Gyantse",89.6,28.92,"cf",3,1],["Yadong",88.9,27.5,"cf",2,1],["Kangmar",89.69,28.67,"cf",2,0],["Damxung",91.1,30.48,"cf",2,1],["Lhasa",91.13,29.65,"cf",3,1],["Nagqu",92.06,31.48,"cf",3,1],["Tsetang",91.77,29.23,"cf",3,1],["Tsona",91.95,27.98,"cf",2,1],["Lhozhag",90.87,28.37,"cf",2,0],["Nyingchi",94.36,29.65,"cf",3,1],["Mainling",94.21,29.22,"cf",2,0],["Bomi",95.77,29.86,"cf",2,1]];
const FORMATIONS=[["eu","Leh","Ladakh Expedition","heavy",5,"akito"],["eu","Leh","Ladakh Expedition","rocket",4,"yukiya"],["eu","Chushul","Pangong Breakthrough","medium",4,"ayano"],["eu","Demchok","Pangong Breakthrough","assault",3],["eu","Shimla","Western Reserve","heavy",4,"leila"],["eu","Dehradun","Western Reserve","rocket",3,"smilas"],["eu","Joshimath","Kumaon Mountain Corps","medium",4,"ryo"],["eu","Pithoragarh","Kumaon Mountain Corps","heavy",4,"olivia"],["eu","Dharchula","Kumaon Mountain Corps","assault",4],["eu","Simikot","Karnali Passage Force","medium",4,"oscar"],["eu","Jumla","Karnali Passage Force","rocket",3],["eu","Pokhara","Central Nepal Assault","heavy",5,"fernando"],["eu","Jomsom","Central Nepal Assault","assault",4],["eu","Kathmandu","Kathmandu Valley Corps","heavy",5,"anna"],["eu","Kathmandu","Kathmandu Valley Corps","rocket",4],["eu","Syabrubesi","Rasuwa Pass Column","assault",4,"klaus"],["eu","Kodari","Kodari Pass Column","assault",4],["eu","Siliguri","Sikkim Offensive","heavy",5,"margaret"],["eu","Gangtok","Sikkim Offensive","rocket",4,"pierre"],["eu","Thimphu","Bhutan Reserve","medium",4,"eduardo"],["eu","Tawang","Eastern Himalayan Corps","heavy",5],["eu","Tawang","Eastern Himalayan Corps","rocket",4],["eu","Bomdila","Eastern Himalayan Corps","assault",3],["cf","Rutog","Ngari Border Guard","heavy",4,"gaohai"],["cf","Shiquanhe","Ngari Border Guard","rocket",3],["cf","Zanda","Western Plateau Reserve","medium",3],["cf","Purang","Purang Pass Defense","heavy",4,"honggu"],["cf","Purang","Purang Pass Defense","rocket",3],["cf","Moincer","Purang Pass Defense","assault",2],["cf","Coqen","Western Plateau Reserve","heavy",4],["cf","Nyima","Western Plateau Reserve","medium",3],["cf","Gyirong","Rasuwa Border Defense","heavy",4,"zhaohao"],["cf","Saga","Tsangpo Counterattack","heavy",4,"xingke"],["cf","Saga","Tsangpo Counterattack","rocket",4],["cf","Zhangmu","Kodari Border Defense","heavy",3,"xianglin"],["cf","Nyalam","Kodari Border Defense","rocket",3],["cf","Tingri","Everest Plateau Reserve","heavy",5],["cf","Lhatse","Everest Plateau Reserve","assault",3],["cf","Shigatse","Shigatse Defensive Army","heavy",5,"cao"],["cf","Shigatse","Shigatse Defensive Army","siege",3],["cf","Yadong","Chumbi Valley Guard","heavy",4,"meiling"],["cf","Gyantse","Chumbi Valley Guard","rocket",4],["cf","Lhasa","Lhasa Capital Army","heavy",6,"lifeng"],["cf","Lhasa","Lhasa Capital Army","siege",4],["cf","Nagqu","Northern Mobile Reserve","heavy",4],["cf","Damxung","Northern Mobile Reserve","medium",3],["cf","Tsona","Tsona Frontier Corps","heavy",4,"leifeng"],["cf","Tsetang","Tsona Frontier Corps","rocket",3],["cf","Nyingchi","Eastern Plateau Army","heavy",4],["cf","Nyingchi","Eastern Plateau Army","rocket",3],["cf","Bomi","Eastern Plateau Army","medium",3]];
// Named trans-Himalayan routes follow real valleys and passes. Geometry is
// approximate at 144x108 hex resolution; gaps stay continuous and playable.
const PASSES=[["Demchok–Rutog",[[77.58,34.15],[78.65,33.55],[79.55,32.68],[79.74,33.43],[80.09,32.5]],0.46],["Lipulekh",[[80.21,29.58],[80.56,29.85],[80.87,30.2],[81.18,30.29],[81.15,31]],0.38],["Hilsa–Purang",[[82.18,29.27],[81.81,29.97],[81.35,30.1],[81.18,30.29]],0.38],["Rasuwagadhi–Gyirong",[[85.32,27.71],[85.32,28.16],[85.33,28.38],[85.23,29.33]],0.36],["Kodari–Zhangmu",[[85.32,27.71],[85.95,27.95],[85.95,27.98],[85.98,28.17],[87.1,28.66]],0.34],["Nathu La–Chumbi Valley",[[88.43,26.73],[88.61,27.33],[88.83,27.39],[88.9,27.5],[89.6,28.92]],0.38],["Bum La–Tsona",[[92.8,26.63],[91.88,27.59],[92.05,27.73],[91.95,27.98],[91.77,29.23]],0.4]];
const OPERATIONAL_FRONTS=[{"side":"eu","name":"Ladakh Breakthrough","from":"Leh","objectives":["Rutog","Shiquanhe","Zanda"]},{"side":"eu","name":"Lipulekh and Karnali","from":"Dharchula","objectives":["Purang","Moincer","Coqen"]},{"side":"eu","name":"Rasuwa Corridor","from":"Syabrubesi","objectives":["Gyirong","Saga","Shigatse"]},{"side":"eu","name":"Kodari Corridor","from":"Kodari","objectives":["Zhangmu","Nyalam","Tingri","Lhatse"]},{"side":"eu","name":"Chumbi Valley","from":"Gangtok","objectives":["Yadong","Gyantse","Lhasa"]},{"side":"eu","name":"Bum La Offensive","from":"Tawang","objectives":["Tsona","Tsetang","Nyingchi"]},{"side":"cf","name":"Western Counterattack","from":"Purang","objectives":["Dharchula","Pithoragarh","Dehradun"]},{"side":"cf","name":"Central Plateau Counterattack","from":"Saga","objectives":["Gyirong","Syabrubesi","Kathmandu"]},{"side":"cf","name":"Eastern Plateau Counterattack","from":"Tsetang","objectives":["Tsona","Tawang","Tezpur"]}];
const FUNDING={eu:{credits:1000,industry:610,science:96,sakuradite:55},
 cf:{credits:1090,industry:665,science:102,sakuradite:58}};
const RIVERS={
 Indus:[[76.4,34.6],[77.58,34.15],[78.7,33.62],[79.1,32.7]],
 YarlungTsangpo:[[82.3,30.1],[85.23,29.33],[87.64,29.08],[88.88,29.27],[91.13,29.65],[92.5,29.5],[94.3,29.48]],
 KaliGandaki:[[83.74,28.79],[83.99,28.21],[83.96,27.93]],
 Trishuli:[[85.32,28.38],[85.32,28.16],[85.23,27.85],[85.32,27.71]],
 Teesta:[[88.61,27.33],[88.43,26.73]],
 Brahmaputra:[[94.21,29.22],[94.36,29.65],[95.77,29.86]]
};
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
 lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,
 Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
 return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
 (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};}
function nearest(g,p,valid,radius=12){
 let best=null,d=Infinity;
 for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
 for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
  const t=E.tile(g,c,r);if(!t||!valid(t))continue;
  const n=E.distance(p,t,g);
  if(n<d){d=n;best=t;}
 }
 return best;
}
function segmentDistance(p,a,b){
 const k=.88,vx=(b[0]-a[0])*k,vy=b[1]-a[1],
  px=(p.lon-a[0])*k,py=p.lat-a[1];
 const f=Math.max(0,Math.min(1,(px*vx+py*vy)/(vx*vx+vy*vy||1)));
 return Math.hypot(px-f*vx,py-f*vy);
}
function passageDistance(p,waypoints){
 let d=Infinity;
 for(let i=1;i<waypoints.length;i++)
  d=Math.min(d,segmentDistance(p,waypoints[i-1],waypoints[i]));
 return d;
}
// Plateau logistics roads are traversable even where the eastern syntaxis
// and the southern Himalayan wall otherwise create scattered cliff hexes.
const PLATEAU_ROADS=[
 [[85.23,29.33],[87.64,29.08],[88.88,29.27],[89.6,28.92],
  [91.13,29.65],[91.77,29.23],[94.36,29.65],[95.77,29.86]],
 [[89.6,28.92],[90.87,28.37],[91.95,27.98]]];
const RIDGE=[[74.4,34.6],[77.6,33.35],[79.6,31.65],[81.6,30.37],
 [84.2,29.15],[86.5,28.42],[88.9,28.18],[91.8,28.32],[94.2,29.15],[96.5,30.35]];
function ridgeLatitude(lon){
 for(let i=1;i<RIDGE.length;i++)if(lon<=RIDGE[i][0]){
  const a=RIDGE[i-1],b=RIDGE[i],t=(lon-a[0])/(b[0]-a[0]);
  return a[1]+(b[1]-a[1])*t;
 }
 return RIDGE.at(-1)[1];
}
function landscape(p,c,r){
 const ridge=Math.abs(p.lat-ridgeLatitude(p.lon));
 const pass=Math.min(...PASSES.map(([,pts])=>passageDistance(p,pts)));
 const supply=Math.min(...PLATEAU_ROADS.map(pts=>passageDistance(p,pts)));
 // Cliff bands are impassable only away from the seven through-valleys.
 // Western Karakoram and the eastern syntaxis create second defenses.
 const karakoram=p.lon<79.2&&p.lat>33.65;
 const eastWall=p.lon>93.1&&p.lat>28.2&&p.lat<30.5;
 if(pass>.44&&supply>.36&&((ridge<.34)||(karakoram&&ridge<.62)||
    (eastWall&&ridge<.50))&&((c*17+r*29)%11<9))return 'peak';
 if(pass<.26)return 'mountain';
 if(ridge<1.03||karakoram||eastWall)return 'mountain';
 if(p.lat>ridgeLatitude(p.lon)+.9)return 'snow'; // Tibetan high plateau, attrition
 if(p.lat>31.5&&p.lon<82)return 'mountain';
 if(p.lon>92&&p.lat<28.4&&((c*13+r*11)%17)<6)return 'forest';
 if(p.lat<28.2&&p.lon>83&&((c*13+r*7)%13)<5)return 'forest';
 return 'plains';
}
function orderGroup(g,id,target){
 if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
 const group=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
 if(!group)return {ok:false,reason:'Army group not found'};
 let assigned=0,failed=0;
 for(const unitId of group.units){
  const u=g.units.find(v=>v.id===unitId&&v.hp>0&&v.side===g.player);
  if(!u)continue;
  const res=E.setGoto(g,u.id,target.c,target.r);
  if(res.ok)assigned++;else failed++;
 }
 if(assigned)group.destination={c:target.c,r:target.r};
 return {ok:assigned>0,assigned,failed,reason:assigned?'':'No reachable group formation'};
}
function create(player='eu',difficulty='normal',seed=20261019){
 if(!SIDES.includes(player))throw Error('Unsupported Himalayan faction '+player);
 if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
 const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
  mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
  seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
  tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
  fallen:{},economy:{},tech:{},officers:Object.fromEntries(
   Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
  roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
  eliteDeployed:{},arsenal:{eu:0,cf:0},
  automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
  mapRevision:0,teams:null,factions:{},lineup:{}};
 for(const side of [...SIDES,'neutral']){
  g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
 }
 g.scenario={id:ID,key:'euCfHimalayas',title:'Crossing the Himalayas',
  version:1,phase:'high-mountain-offensive',aiDoctrine:'europe',
  groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,
  mountainPasses:PASSES,supplyCorridors:PASSES.map(([name,pts])=>({name,points:pts})),
  operationalFronts:OPERATIONAL_FRONTS,
  offensiveAxes:{
   eu:{"Ladakh Expedition":["Rutog","Shiquanhe","Zanda"],
    "Kumaon Mountain Corps":["Purang","Moincer","Coqen"],
    "Rasuwa Pass Column":["Gyirong","Saga","Shigatse"],
    "Kodari Pass Column":["Zhangmu","Nyalam","Tingri"],
    "Sikkim Offensive":["Yadong","Gyantse","Lhasa"],
    "Eastern Himalayan Corps":["Tsona","Tsetang","Nyingchi"]},
   cf:{"Tsangpo Counterattack":["Gyirong","Syabrubesi","Kathmandu"],
    "Purang Pass Defense":["Dharchula","Pithoragarh","Dehradun"],
    "Tsona Frontier Corps":["Tawang","Bomdila","Tezpur"]}
  }};
 const elites=Object.keys(E.ELITE_FORCES);
 g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
  elites.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
   E.ELITE_FORCES[id].availableTo.includes(side))]));
 // This theatre is entirely inland. Rivers are tactical geography, NOT sea.
 // Navy/shipyards are intentionally absent rather than fictionalized.
 g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
  const c=i%COLS,r=(i/COLS)|0;
  return {c,r,owner:null,terrain:landscape(geo(c,r),c,r)};
 });
 for(const [name,lon,lat,owner,tier,fort] of CITIES){
  const at=nearest(g,locate(lon,lat),t=>t.terrain!=='peak'&&
   !g.stations.some(s=>s.c===t.c&&s.r===t.r),8);
  if(!at)throw Error('Himalayan city unreachable at placement: '+name);
  const capital=name==='Kathmandu'||name==='Lhasa';
  const shield=E.scenarioCityDefenseHP(tier,!!fort,name);
  g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
   capital,capitalOf:capital?owner:null,fort:!!fort,
   gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
   shield,maxShield:shield,
   income:Math.round((capital?50:tier===3?32:20)*.55),
   industry:Math.round((capital?28:7*tier)*.55),
   science:Math.max(1,Math.round((1+tier)*.55)),producedTurn:0});
  at.terrain='plains';
 }
 // Peaks never create unreachable islands or artificial victory barriers.
 const start=g.stations.find(s=>s.name==='Kathmandu');
 const open=new Set([start.r*COLS+start.c]),queue=[E.tile(g,start.c,start.r)];
 for(let i=0;i<queue.length;i++)for(const n of E.adjacent(g,queue[i])){
  const j=n.r*COLS+n.c;
  if(n.terrain==='peak'||open.has(j))continue;
  open.add(j);queue.push(n);
 }
 for(const s of g.stations)if(!open.has(s.r*COLS+s.c))
  throw Error('Impassable Himalayan route isolates '+s.name);
 for(const [name,points] of PASSES){
  for(const [lon,lat] of points){
   const t=E.tile(g,locate(lon,lat).c,locate(lon,lat).r);
   if(!t||t.terrain==='peak'||!open.has(t.r*COLS+t.c))
    throw Error('Himalayan corridor severed: '+name);
  }
 }
 // Give each tile a capturable political province centered on the closest city.
 for(const t of g.tiles){
  if(t.terrain==='peak')continue;
  let city=null,d=Infinity;
  for(const s of g.stations){
   const q=E.distance(t,s,g);
   if(q<d){city=s;d=q;}
  }
  t.owner=city.owner;t.provinceCity=city.id;
 }
 const groups=new Map();
 function group(side,name,origin){
  const k=side+':'+name;
  if(!groups.has(k)){
   const obj={id:'army-'+groups.size,side,name,origin,units:[]};
   groups.set(k,obj);g.scenario.groups.push(obj);
  }
  return groups.get(k);
 }
 for(const [side,cityName,name,cls,count,commander] of FORMATIONS){
  const s=g.stations.find(v=>v.name===cityName);
  if(!s||s.owner!==side)throw Error('Incorrect staging city '+cityName);
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>t.terrain!=='peak'&&
    !E.unitAt(g,t)&&t.owner===side&&
    (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),15);
   if(!at)throw Error('No free deployable land hex at '+cityName);
   const cmd=i===0?commander:null;
   const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
   group(side,name,cityName).units.push(u.id);
   if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
  }
 }
 if(difficulty==='elite')E.prepareEliteEurope(g);
 for(const side of SIDES){
  const factor=side===player?1:['challenge','elite'].includes(difficulty)?1.6:
   difficulty==='hard'?1.3:1;
  const base=E.income(g,side);
  g.scenario.funding[side]=Object.fromEntries(
   Object.entries(FUNDING[side]).map(([resource,n])=>
    [resource,Math.round(n*factor)-base[resource]]));
  const actual=E.income(g,side);
  for(const resource of Object.keys(FUNDING[side]))
   g.economy[side][resource]=actual[resource]*2;
 }
 if(difficulty==='hard'||difficulty==='challenge'){
  for(const side of SIDES.filter(s=>s!==player))
   for(const [i,u] of g.units.filter(u=>u.side===side).entries())
    if(difficulty==='challenge'||i%2===0){
     u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);
    }
 }
 g.startUnits=Object.fromEntries(SIDES.map(side=>[
  side,g.units.filter(u=>u.side===side).length]));
 E.log(g,'E.U. mountain corps advance from India and Nepal through the Ladakh, Lipulekh, Rasuwa, Kodari, Nathu La and Bum La corridors. Federation reserves defend Tibet and the plateau cities.',player);
 return g;
}
function onTurn(){return false;}
function strategicScore(g,side){return g.stations.filter(s=>s.owner===side)
 .reduce((n,s)=>n+s.tier,0);}
function objective(g,side=g.player){return 'Capture all '+CITIES.length+
 ' Himalayan theatre cities ('+g.stations.filter(s=>s.owner===side).length+
 '/'+CITIES.length+' controlled). No turn limit.';}
function winner(g){
 if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
 for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
  return {winner:side,reason:E.FACTIONS[side].name+' has secured all Himalayan passes and Tibetan cities.'};
 return null;
}
const api={id:ID,title:'Crossing the Himalayas',cols:COLS,rows:ROWS,sides:SIDES,
 bounds:BOUNDS,projection:PROJECTION,cityData:CITIES,armyGroups:FORMATIONS,
 mountainPasses:PASSES,operationalFronts:OPERATIONAL_FRONTS,rivers:RIVERS,
 create,onTurn,objective,winner,strategicScore,orderGroup,locate,geo};
api.meta={terrainCosts:{mountain:2,snow:2},
 map:{centreSampled:true,overlays:['regionalRivers'],overviewMarkers:true},
 elite:true,eliteRosterOnly:true,
 ai:{doctrine:'europe',recovery:true,routeBias:'eu'},
 text:{era:'Himalayan Front · Alternate 2017',
  intro:'Europia United pushes north from India and Nepal across six principal mountain sectors into Tibet. Seven mapped high-altitude routes are genuinely passable; capture every city to win.',
  terrain:'Mountain hexes cost 2 movement and reduce damage by 25%; high plateau tundra inflicts standard 2.5% attrition. Dark peaks cannot be crossed. Pass corridors stay open.',
  diplomacy:'E.U. and Chinese Federation only. No invented ocean, warships, ports or naval shortcuts. Both sides hold producing cities and can recruit throughout the fight.',
  elite:'Elite difficulty uses the existing E.U./Federation Elite Force conversion, research and AI commander upgrades.',
  focus:{eu:'Kathmandu',cf:'Lhasa'}},
 blurbs:{
  eu:'Coordinate Ladakh, Lipulekh, Rasuwa, Kodari, Nathu La and Bum La attacks, then advance across the snowy plateau toward Shigatse and Lhasa.',
  cf:'Hold guarded passes, use mountain cover and high-plateau reserves to counterattack through the exposed border approaches.'
 }};
E.scenarios={...(E.scenarios||{}),euCfHimalayas:api,
 byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

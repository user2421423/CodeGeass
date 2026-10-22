/* Invasion of Mongolia — E.U. versus Chinese Federation, alternate 2017.
 * Independent landlocked regional theatre: the Siberian railheads are E.U.
 * bases, Mongolia is Federation-held. No fictitious seaports or sea hexes.
 * Geography is approximate at hex scale; settlements have real coordinates. */
(function(root) {
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='eu-cf-mongolia', COLS=164, ROWS=96, SIDES=['eu','cf'];
const BOUNDS={west:87.4,east:120.6,north:54.2,south:41.2};
const MID=(BOUNDS.north+BOUNDS.south)/2, K=Math.cos(MID*Math.PI/180);
const PROJECTION={centerLon:104,centerLat:MID,angle:0,
  uMin:(BOUNDS.west-104)*K,uMax:(BOUNDS.east-104)*K,
  vMin:BOUNDS.south-MID,vMax:BOUNDS.north-MID};
// [real-world settlement, longitude, latitude, starting owner, industry tier, fortified]
// The northern Siberian rail/road towns are attacker bases, NOT Mongolian cities.
const CITIES=[
 ['Ak-Dovurak',90.60,51.18,'eu',2,false],
 ['Kyzyl',94.45,51.72,'eu',3,true],
 ['Turan',93.92,52.14,'eu',2,false],
 ['Irkutsk',104.29,52.29,'eu',3,true],
 ['Slyudyanka',103.70,51.67,'eu',2,false],
 ['Gusinoozyorsk',106.52,51.28,'eu',2,false],
 ['Ulan-Ude',107.58,51.83,'eu',3,true],
 ['Kyakhta',106.45,50.36,'eu',3,true],
 ['Chita',113.50,52.03,'eu',3,true],
 ['Borzya',116.52,50.39,'eu',2,true],
 ['Zabaykalsk',117.33,49.65,'eu',2,false],
 ['Tsagaannuur',89.15,49.53,'cf',2,false],
 ['Olgii',89.97,48.97,'cf',3,true],
 ['Ulaangom',92.08,49.98,'cf',3,true],
 ['Khovd',91.64,48.01,'cf',3,true],
 ['Tes',93.59,50.04,'cf',2,false],
 ['Tolbo',90.29,48.41,'cf',1,false],
 ['Songino',95.84,48.99,'cf',2,false],
 ['Uliastai',96.84,47.74,'cf',3,true],
 ['Tosontsengel',98.28,48.75,'cf',2,false],
 ['Altai',96.26,46.37,'cf',3,true],
 ['Moron',100.16,49.63,'cf',3,true],
 ['Khatgal',100.17,50.44,'cf',2,true],
 ['Tarialan',99.73,49.61,'cf',2,false],
 ['Khutag-Undur',102.71,49.36,'cf',2,true],
 ['Erdenet',104.08,49.03,'cf',3,true],
 ['Bulgan',103.54,48.81,'cf',2,true],
 ['Darkhan',105.92,49.49,'cf',3,true],
 ['Sukhbaatar',106.20,50.23,'cf',3,true],
 ['Baruunburen',104.87,49.00,'cf',2,false],
 ['Tsetserleg',101.45,47.48,'cf',2,true],
 ['Kharkhorin',102.82,47.20,'cf',2,true],
 ['Arvaikheer',102.78,46.26,'cf',3,false],
 ['Bayankhongor',100.72,46.19,'cf',2,false],
 ['Bogd',100.10,44.67,'cf',2,false],
 ['Ulaanbaatar',106.90,47.92,'cf',3,true],
 ['Zuunmod',106.95,47.71,'cf',2,true],
 ['Nalaikh',107.28,47.77,'cf',2,true],
 ['Baganuur',108.36,47.78,'cf',2,false],
 ['Choir',108.37,46.36,'cf',3,true],
 ['Mandalgovi',106.27,45.76,'cf',2,false],
 ['Dalanzadgad',104.42,43.57,'cf',3,true],
 ['Sainshand',110.12,44.89,'cf',3,true],
 ['Zamyn-Uud',111.91,43.72,'cf',2,false],
 ['Chinggis City',110.65,47.32,'cf',3,true],
 ['Berkh',111.19,47.78,'cf',2,false],
 ['Baruun-Urt',113.28,46.68,'cf',3,true],
 ['Choibalsan',114.53,48.07,'cf',3,true],
 ['Dashbalbar',114.34,49.54,'cf',2,true],
 ['Ereentsav',115.92,49.88,'cf',2,true],
 ['Matad',115.55,46.91,'cf',2,false]
];
// Counts are FORMATIONS, not stacks; tuning is deliberately in starting
// forces rather than permanent modifiers to damage, HP or production.
const ARMY_GROUPS=[
 ['eu','Ak-Dovurak','heavy',6,'ayano'],['eu','Ak-Dovurak','rocket',4,'yukiya'],
 ['eu','Kyzyl','heavy',8,'akito'],['eu','Kyzyl','assault',7,'ryo'],
 ['eu','Kyzyl','raider',5],['eu','Turan','medium',5],['eu','Turan','support',2,'anna'],
 ['eu','Irkutsk','heavy',7,'leila'],['eu','Irkutsk','rocket',5,'smilas'],
 ['eu','Irkutsk','siege',4],['eu','Slyudyanka','medium',5],
 ['eu','Gusinoozyorsk','medium',4,'oscar'],
 ['eu','Ulan-Ude','heavy',8,'fernando'],['eu','Ulan-Ude','assault',6,'klaus'],
 ['eu','Ulan-Ude','rocket',4],
 ['eu','Kyakhta','heavy',8,'olivia'],['eu','Kyakhta','assault',7],
 ['eu','Kyakhta','siege',4],['eu','Kyakhta','support',2],
 ['eu','Chita','heavy',7,'marirrosa'],['eu','Chita','rocket',5],
 ['eu','Chita','siege',4],
 ['eu','Borzya','assault',6],['eu','Borzya','medium',5],
 ['eu','Zabaykalsk','medium',5],['eu','Zabaykalsk','raider',4],
 ['cf','Olgii','heavy',3,'cao'],['cf','Olgii','rocket',2],
 ['cf','Ulaangom','medium',4],['cf','Ulaangom','rocket',2],
 ['cf','Khovd','heavy',4,'ren'],['cf','Khovd','medium',2],
 ['cf','Uliastai','medium',3],['cf','Altai','medium',2],
 ['cf','Moron','heavy',6,'chaojielun'],['cf','Moron','rocket',2],
 ['cf','Khatgal','medium',2],
 ['cf','Erdenet','heavy',6,'xianglin'],['cf','Erdenet','rocket',4],
 ['cf','Darkhan','heavy',8,'honggu'],['cf','Darkhan','rocket',5],
 ['cf','Sukhbaatar','heavy',6],['cf','Sukhbaatar','assault',3],
 ['cf','Ulaanbaatar','heavy',11,'xingke'],['cf','Ulaanbaatar','rocket',8,'chengzhong'],
 ['cf','Ulaanbaatar','siege',4],['cf','Ulaanbaatar','assault',6],
 ['cf','Zuunmod','medium',3],['cf','Nalaikh','assault',3],
 ['cf','Chinggis City','heavy',6],['cf','Chinggis City','rocket',3],
 ['cf','Choibalsan','heavy',6],['cf','Choibalsan','rocket',5],
 ['cf','Dashbalbar','medium',2],['cf','Ereentsav','medium',2],
 ['cf','Baruun-Urt','medium',3],['cf','Sainshand','medium',5],
 ['cf','Dalanzadgad','medium',3],['cf','Choir','assault',4]
];
const FUNDING={eu:{credits:920,industry:540,science:85,sakuradite:62},
  cf:{credits:910,industry:510,science:82,sakuradite:58}};
// Two E.U. flanking sweeps and the central railway thrust converge at the
// three industrial/administrative hubs. Federation fronts can counterattack.
const OPERATIONAL_FRONTS=[
 {name:'Altai Western Sweep',side:'eu',from:'Kyzyl',objectives:['Ulaangom','Uliastai','Khovd']},
 {name:'Khövsgöl Maneuver',side:'eu',from:'Irkutsk',objectives:['Moron','Erdenet','Kharkhorin']},
 {name:'Selenge Railway Assault',side:'eu',from:'Kyakhta',objectives:['Sukhbaatar','Darkhan','Ulaanbaatar']},
 {name:'Eastern Steppe Drive',side:'eu',from:'Borzya',objectives:['Choibalsan','Chinggis City','Ulaanbaatar']},
 {name:'Ulaanbaatar Fortress Belt',side:'cf',from:'Ulaanbaatar',objectives:['Zuunmod','Nalaikh','Darkhan']},
 {name:'Orkhon Reserves',side:'cf',from:'Erdenet',objectives:['Moron','Darkhan','Sukhbaatar']},
 {name:'Eastern Counterstroke',side:'cf',from:'Choibalsan',objectives:['Ereentsav','Borzya','Chita']},
 {name:'Western Counterstroke',side:'cf',from:'Ulaangom',objectives:['Kyzyl','Ak-Dovurak']}
];
const RIVERS={
  Selenge:[[102.9,50.6],[103.5,49.8],[105.0,49.8],[106.20,50.23],[106.6,50.5],[107.4,51.0]],
  Orkhon:[[102.8,47.15],[103.4,48.2],[104.08,49.03],[105.3,49.5],[106.2,50.23]],
  Tuul:[[107.3,48.0],[106.90,47.92],[105.3,47.5],[103.8,47.8],[103.1,48.4]],
  Kherlen:[[107.7,47.8],[110.65,47.32],[112.9,47.7],[114.53,48.07],[117.1,48.6]],
  Onon:[[109.3,48.9],[111.2,49.3],[113.3,50.1],[115.0,50.35]],
  Zavkhan:[[97.4,47.5],[96.2,48.8],[95.0,49.4],[93.0,49.8]],
  Delgermoron:[[98.6,50.45],[100.16,49.63],[101.8,49.9]]
};
const PASSES=[
 ['Ulaangom Basin',92.0,49.95,1.0,.35],
 ['Khovd Corridor',91.6,48.0,1.0,.5],
 ['Tosontsengel Valley',98.28,48.75,1.6,.42],
 ['Moron Valley',100.16,49.63,1.55,.42],
 ['Orkhon Corridor',103.7,49.1,1.25,.4],
 ['Selenge Corridor',106.1,50.1,1.3,.45],
 ['Khentii Gap',110.8,49.2,1.4,.45],
 ['Eastern Steppe Corridor',114.2,48.65,2.0,.6]
];
// Terrain is 100% connected land. Mountain massifs impede but never wall off
// strategic cities. Lakes are represented by relief, not imaginary ocean.
const MOUNTAINS=[
 [90.0,48.7,2.1,1.7], [93.0,47.5,2.8,1.0], // Mongol Altai
 [96.5,46.4,3.6,1.0], [100.9,47.5,4.0,.8],// Gobi Altai / Khangai
 [101.0,49.9,1.8,1.0], [108.6,49.1,2.5,1.0], // Khövsgöl / Khentii
 [105.4,48.5,2.2,.7]
];
const WOODS=[[100.0,50.5,2.2,1.2],[104.6,49.6,2.1,.7],
  [107.7,49.0,2.7,1.5],[112.1,50.7,2.5,.9]];
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
  lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){
 const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
 return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
   (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
}
function nearest(g,p,valid,radius=12){
 let best=null,d=Infinity;
 for(let r=Math.max(0,p.r-radius);r<=Math.min(ROWS-1,p.r+radius);r++)
 for(let c=Math.max(0,p.c-radius);c<=Math.min(COLS-1,p.c+radius);c++){
   const t=E.tile(g,c,r);
   if(!t||!valid(t))continue;
   const dist=E.distance(p,t,g);
   if(dist<d){best=t;d=dist;}
 }
 return best;
}
function density(p,areas){
 let result=0;
 for(const [lon,lat,w,h] of areas){
   const d=((p.lon-lon)/w)**2+((p.lat-lat)/h)**2;
   result=Math.max(result,Math.exp(-1.5*d));
 }
 return result;
}
function landscape(p,c,r){
 if(PASSES.some(([,x,y,w,h])=>Math.abs(p.lon-x)<w&&Math.abs(p.lat-y)<h))
   return 'plains';
 const ridge=density(p,MOUNTAINS),forest=density(p,WOODS);
 if(ridge>.62)return 'mountain';
 if(forest>.42 || (ridge>.34&&(c*17+r*13)%7<5))return 'forest';
 // The southern Gobi is dry, OPEN terrain, not an invented sea or obstruction.
 return 'plains';
}
function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
function create(player='eu',difficulty='normal',seed=201701){
 if(!SIDES.includes(player))throw Error('Unsupported Mongolia faction '+player);
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
  g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};
  g.tech[side]={};
 }
 g.scenario={id:ID,key:'mongolia',title:'Invasion of Mongolia',version:1,
  phase:'siberian-invasion',aiDoctrine:'europe',groups:[],funding:{},
  bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,mountainPasses:PASSES,
  operationalFronts:OPERATIONAL_FRONTS,ports:{}};
 const eliteIds=Object.keys(E.ELITE_FORCES);
 g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
  eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly &&
    E.ELITE_FORCES[id].availableTo.includes(side))]));
 g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
  const c=i%COLS,r=(i/COLS)|0;
  return {c,r,owner:null,terrain:landscape(geo(c,r),c,r)};
 });
 for(const [name,lon,lat,owner,tier,fort] of CITIES){
  const at=nearest(g,locate(lon,lat),t=>!g.stations.some(s=>s.c===t.c&&s.r===t.r),8);
  if(!at)throw Error('Cannot place Mongolia settlement: '+name);
  const capital=name==='Ulaanbaatar'||name==='Irkutsk'||name==='Chita';
  const shield=E.scenarioCityDefenseHP(tier,!!fort,name);
  g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
   capital,capitalOf:capital?owner:null,fort:!!fort,
   gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
   shield,maxShield:shield,
   income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
   industry:Math.round((capital?25:6*tier)*.55),
   science:Math.round((1+tier)*.55),producedTurn:0});
  at.terrain='plains';
 }
 // Province ownership uses settlement catchments, including the Siberian
 // staging strip; no out-of-bounds claims or impassable land bridges.
 for(const t of g.tiles){
  let nearestCity=null,best=Infinity;
  for(const s of g.stations){
   const d=E.distance(t,s,g);
   if(d<best){best=d;nearestCity=s;}
  }
  t.owner=nearestCity.owner;t.provinceCity=nearestCity.id;
 }
 const commands=new Map();
 function group(side,name){
  const key=side+':'+name;
  if(!commands.has(key)){
   const command={id:'army-'+commands.size,side,name:name+' Command',
    origin:name,units:[]};
   commands.set(key,command);g.scenario.groups.push(command);
  }
  return commands.get(key);
 }
 for(const [side,name,cls,count,commander] of ARMY_GROUPS){
  const s=g.stations.find(v=>v.name===name);
  if(!s||s.owner!==side)throw Error('Invalid Mongolia deployment '+side+' '+name);
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>!E.unitAt(g,t)&&t.owner===side&&
    (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),14);
   if(!at)throw Error('No deployment hex for '+side+' '+name);
   const cmd=i===0?commander:null,stack=i===0?3:2;
   const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
   group(side,name).units.push(u.id);
   if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
  }
 }
 if(difficulty==='elite')E.prepareEliteEurope(g);
 for(const side of SIDES){
  const base=E.income(g,side);
  g.scenario.funding[side]=Object.fromEntries(
   Object.entries(FUNDING[side]).map(([resource,n])=>
    [resource,Math.round(n)-base[resource]]));
  const income=E.income(g,side);
  for(const resource of Object.keys(FUNDING[side]))
   g.economy[side][resource]={"eu":{"credits":1840,"industry":500,"science":170,"sakuradite":124},"cf":{"credits":1820,"industry":500,"science":164,"sakuradite":116}}[side][resource];
 }
 if(difficulty==='hard'||difficulty==='challenge'){
  for(const side of SIDES.filter(s=>s!==player))
   for(const u of g.units.filter(u=>u.side===side))
    E.addDifficultyFrames(u,difficulty);
 }
 E.applyScenarioDifficulty(g,difficulty);
 g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
 E.log(g,'E.U. forces invade from Siberia along the Altai, Selenge railway and eastern steppe fronts. Federation reserves hold Ulaanbaatar and the interior.',player);
 return g;
}
function onTurn(){return false;}
function strategicScore(g,side){
 return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
}
function objective(g,side=g.player){
 return 'Conquer all '+CITIES.length+' Mongolia theatre cities ('+
  g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled). No turn limit.';
}
function winner(g){
 if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)
  return null;
 for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
  return {winner:side,reason:E.FACTIONS[side].name+
   ' controls every city in the Mongolia theatre.'};
 return null;
}
const api={id:ID,title:'Invasion of Mongolia',cols:COLS,rows:ROWS,
 sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
 rivers:RIVERS,mountainPasses:PASSES,operationalFronts:OPERATIONAL_FRONTS,
 ports:{},create,onTurn,objective,winner,strategicScore,orderGroup,geo,locate};
api.meta={
 elite:true,saveVersion:1,terrainCosts:{mountain:2},
 ai:{doctrine:'europe',recovery:true},
 map:{centreSampled:true,overlays:['regionalRivers'],overviewMarkers:true},
 text:{
  terrain:'The Altai, Khangai and Khentii massifs slow movement. Valleys and eastern steppe remain traversable; there are no sea routes.',
  era:'Mongolia · Alternate 2017',
  intro:'Europia United invades south from Siberia into Federation-held Mongolia. Four widely separated offensives must converge on a fortified Ulaanbaatar.',
  diplomacy:'E.U. and the Chinese Federation are at war from the first turn. Win by capturing every city; there is no turn limit.',
  elite:'Standard faction-legal Elite Forces, commanders and scenario difficulty rules are retained.',
  focus:{eu:'Kyakhta',cf:'Ulaanbaatar'}
 },
 blurbs:{
  eu:'Sweep around the western Altai, drive through the Selenge corridor, and exploit the open eastern steppe. Encircle Ulaanbaatar rather than assaulting its defenses head-on.',
  cf:'Defend Ulaanbaatar, Darkhan and Erdenet with mobile reserves. Contest the northern roads, then counterattack along the eastern and western flanks.'
 }};
E.scenarios={...(E.scenarios||{}),mongolia:api,
 byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

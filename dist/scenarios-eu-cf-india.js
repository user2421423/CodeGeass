/* Invasion of India — E.U. vs Chinese Federation, regional campaign #7.
   E.U. pushes east from Persia and Afghanistan while three carrier forces land on
   the Arabian Sea coast. Geographic positions are WGS84; borders are fictional.
   All economy, production, capture and Elite logic is shared-engine behavior. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='eu-cf-india',KEY='euCfIndia',SIDES=['eu','cf'];
const COLS=168,ROWS=124,BOUNDS={west:57,east:94,north:37,south:5.5};
const K=Math.cos(21.25*Math.PI/180);
const PROJECTION={centerLon:75.5,centerLat:21.25,angle:0,uMin:-18.5*K,uMax:18.5*K,vMin:-15.75,vMax:15.75};
// City rows: name|longitude|latitude|starting faction|tier|fortified.
// The E.U. starts from Iranian/Afghan forward bases; the Federation defends
// the Indus, Ganges, Deccan, coasts and Sri Lankan southern naval approaches.
const CITY_ROWS=`
Chabahar|60.64|25.29|eu|3|1
Zahedan|60.86|29.5|eu|3|1
Zabol|61.49|31.03|eu|2|0
Iranshahr|60.68|27.2|eu|2|0
Herat|62.21|34.35|eu|3|1
Farah|62.12|32.37|eu|2|0
Kandahar|65.71|31.61|eu|3|1
Lashkar Gah|64.37|31.59|eu|2|0
Kabul|69.21|34.53|eu|3|1
Ghazni|68.42|33.55|eu|2|0
Bamyan|67.83|34.82|eu|2|0
Quetta|67.02|30.18|cf|3|1
Peshawar|71.58|34.01|cf|3|1
Islamabad|73.05|33.69|cf|3|1
Rawalpindi|73.05|33.57|cf|2|1
Lahore|74.35|31.55|cf|3|1
Amritsar|74.87|31.64|cf|3|1
Faisalabad|73.09|31.42|cf|3|1
Multan|71.47|30.2|cf|3|1
Bahawalpur|71.68|29.4|cf|2|0
Sukkur|68.86|27.71|cf|3|1
Hyderabad Sindh|68.37|25.4|cf|3|1
Karachi|67.01|24.86|cf|3|1
Gwadar|62.32|25.12|cf|3|1
Pasni|63.47|25.26|cf|2|0
Turbat|63.07|26.0|cf|2|0
Jammu|74.86|32.73|cf|3|1
Srinagar|74.88|34.08|cf|3|1
Chandigarh|76.78|30.73|cf|3|1
Shimla|77.17|31.1|cf|2|0
Dehradun|78.03|30.32|cf|2|0
Ludhiana|75.86|30.9|cf|3|0
Jalandhar|75.58|31.33|cf|2|0
New Delhi|77.21|28.61|cf|3|1
Gurugram|77.03|28.46|cf|2|0
Meerut|77.71|28.98|cf|2|0
Jaipur|75.79|26.91|cf|3|1
Jodhpur|73.02|26.24|cf|3|1
Bikaner|73.31|28.02|cf|2|0
Jaisalmer|70.91|26.92|cf|2|0
Udaipur|73.69|24.58|cf|3|1
Ajmer|74.64|26.45|cf|2|0
Agra|78.01|27.18|cf|3|1
Gwalior|78.18|26.22|cf|2|1
Kanpur|80.33|26.45|cf|3|1
Lucknow|80.95|26.85|cf|3|1
Prayagraj|81.85|25.44|cf|3|0
Varanasi|82.97|25.32|cf|3|1
Gorakhpur|83.37|26.76|cf|2|0
Patna|85.14|25.6|cf|3|1
Gaya|85.0|24.8|cf|2|0
Muzaffarpur|85.39|26.12|cf|2|0
Ranchi|85.32|23.34|cf|3|1
Dhanbad|86.43|23.8|cf|2|0
Kolkata|88.36|22.57|cf|3|1
Haldia|88.07|22.07|cf|3|1
Siliguri|88.43|26.73|cf|3|1
Guwahati|91.74|26.14|cf|3|1
Shillong|91.89|25.58|cf|2|0
Dhaka|90.41|23.81|cf|3|1
Khulna|89.57|22.82|cf|2|0
Chattogram|91.8|22.34|cf|3|1
Rajshahi|88.6|24.37|cf|2|0
Ahmedabad|72.57|23.02|cf|3|1
Gandhinagar|72.63|23.22|cf|2|0
Mundra|69.73|22.84|cf|3|1
Bhuj|69.67|23.25|cf|2|0
Porbandar|69.63|21.64|cf|2|1
Rajkot|70.8|22.3|cf|3|0
Veraval|70.37|20.91|cf|2|0
Vadodara|73.18|22.31|cf|3|1
Surat|72.83|21.17|cf|3|1
Mumbai|72.88|19.07|cf|3|1
Nashik|73.79|19.99|cf|2|0
Pune|73.86|18.52|cf|3|1
Aurangabad|75.34|19.88|cf|2|0
Panaji|73.83|15.5|cf|3|1
Karwar|74.13|14.81|cf|2|0
Belagavi|74.5|15.85|cf|2|0
Kolhapur|74.24|16.7|cf|2|0
Solapur|75.91|17.66|cf|2|0
Indore|75.86|22.72|cf|3|1
Bhopal|77.41|23.26|cf|3|1
Jabalpur|79.99|23.18|cf|2|0
Nagpur|79.09|21.15|cf|3|1
Raipur|81.63|21.25|cf|3|0
Bhubaneswar|85.82|20.3|cf|3|1
Cuttack|85.88|20.46|cf|2|0
Paradip|86.61|20.32|cf|2|1
Visakhapatnam|83.3|17.69|cf|3|1
Vijayawada|80.64|16.51|cf|3|1
Kakinada|82.25|16.99|cf|2|0
Hyderabad Deccan|78.49|17.39|cf|3|1
Warangal|79.59|17.98|cf|2|0
Bengaluru|77.59|12.97|cf|3|1
Mysuru|76.64|12.3|cf|2|0
Mangaluru|74.86|12.91|cf|3|1
Kozhikode|75.78|11.26|cf|2|0
Kochi|76.27|9.97|cf|3|1
Thiruvananthapuram|76.94|8.52|cf|3|1
Coimbatore|76.96|11.02|cf|3|0
Madurai|78.12|9.93|cf|3|1
Tiruchirappalli|78.69|10.79|cf|2|0
Chennai|80.27|13.08|cf|3|1
Puducherry|79.83|11.93|cf|2|0
Tirupati|79.42|13.63|cf|2|0
Nellore|79.99|14.44|cf|2|0
Kurnool|78.04|15.83|cf|2|0
Colombo|79.86|6.93|cf|3|1
Galle|80.22|6.04|cf|2|1
Kandy|80.63|7.29|cf|3|1
Trincomalee|81.23|8.57|cf|3|1
Jaffna|80.01|9.66|cf|2|1`;
const CITIES=CITY_ROWS.trim().split('\n').map(s=>{
 const [name,lon,lat,side,tier,fort]=s.split('|');
 return [name,+lon,+lat,side,+tier,fort==='1'];
});
const PORTS={
 Chabahar:3,Gwadar:3,Pasni:2,Karachi:3,Mundra:3,Porbandar:2,Veraval:2,
 Surat:2,Mumbai:3,Panaji:3,Karwar:2,Mangaluru:3,Kozhikode:2,Kochi:3,
 Thiruvananthapuram:2,Colombo:3,Galle:2,Trincomalee:3,Jaffna:2,
 Chennai:3,Puducherry:2,Visakhapatnam:3,Kakinada:2,Paradip:3,Haldia:3,
 Chattogram:3
};
// side, staging city, operational Army Group, class, number of formations, commander.
const ARMY_GROUPS=[
 ['eu','Herat','Northern Expedition','heavy',9,'akito'],
 ['eu','Herat','Northern Expedition','rocket',8,'yukiya'],
 ['eu','Kabul','Khyber Spearhead','heavy',9,'ryo'],
 ['eu','Kabul','Khyber Spearhead','assault',8,'ayano'],
 ['eu','Ghazni','Khyber Spearhead','medium',6,'anna'],
 ['eu','Kandahar','Indus Breakthrough','heavy',11,'leila'],
 ['eu','Kandahar','Indus Breakthrough','rocket',8,'smilas'],
 ['eu','Lashkar Gah','Indus Breakthrough','assault',8,'oscar'],
 ['eu','Farah','Western Reserve','medium',8,'eduardo'],
 ['eu','Bamyan','Northern Expedition','assault',6,'klaus'],
 ['eu','Zahedan','Makran Army','heavy',9,'margaret'],
 ['eu','Zahedan','Makran Army','rocket',8,'ferilli'],
 ['eu','Chabahar','Makran Army','assault',8,'marirrosa'],
 ['eu','Iranshahr','Western Reserve','siege',6,null],
 ['eu','Zabol','Western Reserve','medium',6,null],
 ['cf','Peshawar','Khyber Defence','heavy',4,'gaohai'],
 ['cf','Peshawar','Khyber Defence','rocket',3,null],
 ['cf','Quetta','Balochistan Guard','heavy',4,'cao'],
 ['cf','Quetta','Balochistan Guard','rocket',3,null],
 ['cf','Gwadar','Makran Coast Army','assault',4,'rakshata'],
 ['cf','Karachi','Sindh Defence','heavy',5,'honggu'],
 ['cf','Karachi','Sindh Defence','rocket',3,null],
 ['cf','Sukkur','Indus Riverline','heavy',4,'xianglin'],
 ['cf','Multan','Indus Riverline','rocket',4,null],
 ['cf','Islamabad','Northern Shield','heavy',4,'xingke'],
 ['cf','Lahore','Punjab Field Army','heavy',4,'zhaohao'],
 ['cf','Faisalabad','Punjab Field Army','assault',2,null],
 ['cf','Amritsar','Punjab Field Army','rocket',2,null],
 ['cf','New Delhi','Capital Defence','heavy',5,'leifeng'],
 ['cf','New Delhi','Capital Defence','siege',2,null],
 ['cf','Jaipur','Rajasthan Army','heavy',3,'meiling'],
 ['cf','Jodhpur','Rajasthan Army','medium',2,null],
 ['cf','Ahmedabad','Gujarat Defence','heavy',3,'lifeng'],
 ['cf','Surat','Gujarat Defence','rocket',2,null],
 ['cf','Mumbai','Konkan Coastal Army','heavy',3,null],
 ['cf','Mumbai','Konkan Coastal Army','rocket',2,null],
 ['cf','Pune','Deccan Mobile Reserve','heavy',3,null],
 ['cf','Indore','Central India Reserve','heavy',3,null],
 ['cf','Bhopal','Central India Reserve','rocket',2,null],
 ['cf','Lucknow','Ganges Defence','heavy',3,null],
 ['cf','Kanpur','Ganges Defence','assault',2,null],
 ['cf','Varanasi','Ganges Defence','rocket',2,null],
 ['cf','Patna','Eastern Reserve','heavy',3,null],
 ['cf','Kolkata','Bengal Industrial Defence','heavy',3,null],
 ['cf','Kolkata','Bengal Industrial Defence','rocket',2,null],
 ['cf','Dhaka','Bengal Industrial Defence','medium',2,null],
 ['cf','Bhubaneswar','Odisha Coastal Guard','heavy',2,null],
 ['cf','Visakhapatnam','Eastern Naval Screen','rocket',2,null],
 ['cf','Hyderabad Deccan','Deccan Defence','heavy',3,null],
 ['cf','Nagpur','Deccan Defence','rocket',2,null],
 ['cf','Bengaluru','Southern Army','heavy',3,null],
 ['cf','Chennai','Southern Army','rocket',2,null],
 ['cf','Mangaluru','Malabar Coast Army','heavy',2,null],
 ['cf','Kochi','Malabar Coast Army','assault',2,null],
 ['cf','Colombo','Ceylon Garrison','heavy',2,null],
 ['cf','Trincomalee','Ceylon Garrison','rocket',2,null],
 ['cf','Guwahati','Northeast Guard','heavy',2,null]
];
// Each landfall fleet is separated from the coastal defenders by open Arabian Sea.
const FLEETS=[
 ['eu','Sindh Landings',65.1,22.1,'eu_carrier',4],
 ['eu','Gujarat Landings',69.1,19.4,'eu_carrier',4],
 ['eu','Konkan Landings',72.0,15.9,'eu_carrier',4],
 ['eu','Sindh Landings',65.5,21.4,'panzer_frosch_ii',2],
 ['eu','Gujarat Landings',69.3,18.4,'panzer_frosch_ii',2],
 ['eu','Konkan Landings',71.4,14.8,'panzer_frosch_ii',2],
 ['cf','Karachi Fleet',66.8,23.5,'cf_carrier',2],
 ['cf','Gwadar Fleet',62.4,24.0,'cf_carrier',1],
 ['cf','Mumbai Fleet',71.8,18.7,'cf_carrier',2],
 ['cf','Goa Fleet',72.9,15.0,'cf_carrier',1],
 ['cf','Kochi Fleet',75.2,9.3,'cf_carrier',2],
 ['cf','Colombo Fleet',78.7,6.5,'cf_carrier',1],
 ['cf','Chennai Fleet',81.1,12.5,'cf_carrier',1],
 ['cf','Bengal Fleet',89.0,20.5,'cf_carrier',1]
];
const LANDINGS=[
 ['Sindh Landings','heavy',3,'fernando'],['Sindh Landings','assault',3,null],
 ['Gujarat Landings','heavy',3,null],['Gujarat Landings','rocket',3,null],
 ['Konkan Landings','assault',3,null],['Konkan Landings','heavy',3,null]
];
const FUNDING={
 eu:{credits:1550,industry:970,science:180,sakuradite:80},
 cf:{credits:1360,industry:850,science:165,sakuradite:75}
};
const RIVERS={
 Indus:[[72.7,34.1],[72.0,32.2],[71.2,30.0],[69.8,28.2],[68.9,26.8],[68.4,25.4],[67.5,24.3]],
 Ganges:[[78.0,30.1],[80.3,27.6],[82.5,25.7],[85.1,25.3],[87.5,25.1],[89.3,24.0],[90.3,23.2]],
 Brahmaputra:[[94.0,27.5],[92.0,26.0],[90.6,25.0],[90.4,23.4]],
 Narmada:[[75.4,22.7],[73.4,21.4],[72.7,21.7]],
 Godavari:[[78.5,19.8],[80.4,19.0],[82.1,16.9]],
 Krishna:[[76.0,17.5],[78.7,16.7],[80.6,16.5]]
};
const PASSES=[[70.65,34.05,0.8],[67.1,30.18,0.9],[73.06,33.68,0.8],
 [74.83,32.73,0.7],[77.17,31.1,0.7],[78.03,30.32,0.7]];
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
 lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,
 Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
 return {r,c:Math.max(0,Math.min(COLS-1,
 Math.round((lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};}
function nearest(g,p,valid,radius=12){
 let best=null,distance=Infinity;
 for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
  for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
   const t=E.tile(g,c,r);if(!t||!valid(t))continue;
   const d=E.distance(p,t,g);if(d<distance){distance=d;best=t;}
  }
 return best;
}
function lineDistance(p,points){
 let best=Infinity;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],vx=(b[0]-a[0])*.89,vy=b[1]-a[1],
   px=(p.lon-a[0])*.89,py=p.lat-a[1],
   k=Math.max(0,Math.min(1,(px*vx+py*vy)/(vx*vx+vy*vy||1)));
  best=Math.min(best,Math.hypot(px-k*vx,py-k*vy));
 }
 return best;
}
function terrain(p,c,r){
 const mountains=p.lat>29.6&&p.lon>69&&p.lon<90;
 const pass=Math.min(...PASSES.map(([x,y,w])=>Math.hypot((p.lon-x)*.89,p.lat-y)/w));
 if(mountains&&p.lat>33.8&&p.lon>73&&pass>1.4&&(c+5*r)%13===0)return 'peak';
 if(mountains&&pass>.8&&(
    p.lat>32.2||(p.lat>30&&p.lon>77&&p.lon<88)))return 'mountain';
 if(p.lon>67&&p.lon<75&&p.lat>25&&p.lat<29.2)return 'desert';
 if(p.lon>70&&p.lon<77&&p.lat>22&&p.lat<27&&(c*7+r*3)%11<4)return 'desert';
 if(p.lon>80&&p.lon<94&&p.lat>23&&p.lat<27&&(c*3+r*7)%13<4)return 'forest';
 if(p.lon>74&&p.lon<86&&p.lat<19&&(c*11+r*7)%17<4)return 'forest';
 return 'plains';
}
function orderGroup(g,id,target){
 if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
 const group=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
 if(!group)return {ok:false,reason:'Army group not found'};
 let assigned=0,failed=0;
 for(const id of group.units){
  const u=g.units.find(v=>v.id===id&&v.hp>0&&v.side===g.player);
  if(!u)continue;
  const res=E.setGoto(g,u.id,target.c,target.r);
  if(res.ok)assigned++;else failed++;
 }
 if(assigned)group.destination={c:target.c,r:target.r};
 return {ok:assigned>0,assigned,failed,reason:assigned?'':'No formation can reach destination'};
}
function create(player='eu',difficulty='normal',seed=201717){
 if(!SIDES.includes(player))throw Error('Unsupported India faction '+player);
 if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
 const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
  mode:'scenario',era:ID,order:[player,...SIDES.filter(x=>x!==player)],
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
 g.scenario={id:ID,key:KEY,title:'Invasion of India',version:1,
  phase:'persian-indian-offensive',aiDoctrine:'europe',groups:[],funding:{},
  bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,
  operationalFronts:[
   {name:'Khyber and Punjab',attack:'eu',objective:'Lahore'},
   {name:'Quetta–Indus Corridor',attack:'eu',objective:'Multan'},
   {name:'Makran Coast',attack:'eu',objective:'Karachi'},
   {name:'Sindh Landings',attack:'eu',objective:'Karachi'},
   {name:'Gujarat Landings',attack:'eu',objective:'Ahmedabad'},
   {name:'Konkan Landings',attack:'eu',objective:'Mumbai'},
   {name:'Ganges Offensive',attack:'eu',objective:'New Delhi'},
   {name:'Deccan Breakthrough',attack:'eu',objective:'Hyderabad Deccan'},
   {name:'Eastern Campaign',attack:'eu',objective:'Kolkata'}],
  offensiveAxes:{
   'Northern Expedition':['Peshawar','Islamabad','Lahore','New Delhi'],
   'Khyber Spearhead':['Peshawar','Amritsar','Lahore','New Delhi'],
   'Indus Breakthrough':['Quetta','Multan','Jaipur','New Delhi'],
   'Makran Army':['Gwadar','Karachi','Hyderabad Sindh','Mumbai'],
   'Sindh Landings':['Karachi','Hyderabad Sindh','Sukkur'],
   'Gujarat Landings':['Mundra','Ahmedabad','Surat','Mumbai'],
   'Konkan Landings':['Panaji','Mumbai','Pune','Hyderabad Deccan']},
  riverCrossings:['Sukkur','Multan','Prayagraj','Varanasi','Patna','Vijayawada'],
  mountainPasses:['Peshawar','Quetta','Islamabad','Jammu','Shimla','Dehradun']};
 const eliteIds=Object.keys(E.ELITE_FORCES);
 g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
  eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
   E.ELITE_FORCES[id].availableTo.includes(side))]));
 const geography=root.EU_CF_INDIA_GEOGRAPHY||
  (typeof require==='function'?require('./eu-cf-india-geography.js'):null);
 if(!geography?.makeClasses)throw Error('India coastline module missing');
 const coastClasses=geography.makeClasses(COLS,ROWS,BOUNDS);
 g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
  const c=i%COLS,r=(i/COLS)|0,cls=coastClasses[i];
  return {c,r,owner:null,terrain:cls===0?'sea':cls===1?'coast':terrain(geo(c,r),c,r)};
 });
 // All sea components can be navigated independently: the Arabian Sea,
 // Bay of Bengal and Sri Lankan waters connect through the southern ocean.
 const seaStart=nearest(g,locate(67,20),t=>t.terrain==='sea',10);
 if(!seaStart)throw Error('Arabian Sea not navigable');
 const water=new Set([E.key(seaStart)]),queue=[seaStart];
 for(let i=0;i<queue.length;i++)for(const t of E.adjacent(g,queue[i])){
  const key=E.key(t);
  if((t.terrain==='sea'||t.terrain==='coast')&&!water.has(key)){
   water.add(key);queue.push(t);
  }
 }
 const navigable=t=>t&&water.has(E.key(t))&&
   (t.terrain==='sea'||t.terrain==='coast');
 // Locate coastal cities only at cells adjacent to the connected sea.
 // Other cities remain within their historical settlements where possible.
 for(const [name,lon,lat,owner,tier,fort] of CITIES){
  const port=Object.prototype.hasOwnProperty.call(PORTS,name);
  const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
   t.terrain!=='offmap'&&!E.TERRAIN[t.terrain]?.blocked&&
   !g.stations.some(x=>x.c===t.c&&x.r===t.r)&&
   (!port||E.adjacent(g,t).some(n=>n.terrain==='sea'&&navigable(n))),port?10:6);
  if(!at)throw Error('India city inaccessible '+name);
  const capital=name==='New Delhi'||name==='Kabul'||name==='Colombo';
  const shield=E.scenarioCityDefenseHP(tier,!!fort,name);
  g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
   capital,capitalOf:capital?owner:null,fort:!!fort,
   gun:fort?name+' Fortified Battery':null,lab:0,refinery:0,
   shield,maxShield:shield,
   income:Math.round((capital?55:tier===3?33:tier===2?22:13)*.65),
   industry:Math.round((capital?28:7*tier)*.65),
   science:Math.round((tier+2)*.65),producedTurn:0});
 }
 // Flood-fill islands separately. Assign province ownership only within
 // connected land; sea never becomes a province or crossing shortcut.
 const component=new Int16Array(g.tiles.length).fill(-1);
 let nComponents=0;
 for(let i=0;i<g.tiles.length;i++){
  const t=g.tiles[i];
  if(t.terrain==='sea'||t.terrain==='offmap'||component[i]>=0)continue;
  const q=[t];component[i]=nComponents;
  for(let j=0;j<q.length;j++)for(const a of E.adjacent(g,q[j])){
   const idx=a.r*COLS+a.c;
   if(a.terrain!=='sea'&&a.terrain!=='offmap'&&component[idx]<0){
    component[idx]=nComponents;q.push(a);
   }
  }
  nComponents++;
 }
 const grouped=new Map();
 for(const s of g.stations){
  const k=component[s.r*COLS+s.c];
  if(!grouped.has(k))grouped.set(k,[]);
  grouped.get(k).push(s);
 }
 for(const t of g.tiles)if(t.terrain!=='sea'&&t.terrain!=='offmap'){
  const cities=grouped.get(component[t.r*COLS+t.c])||[];
  let pick=null,best=Infinity;
  for(const s of cities){const d=E.distance(t,s,g);if(d<best){best=d;pick=s;}}
  if(pick){t.owner=pick.owner;t.provinceCity=pick.id;}
 }
 const armyMap=new Map();
 function group(side,name,origin){
  const key=side+':'+name;
  if(!armyMap.has(key)){
   const gr={id:'army-'+armyMap.size,side,name,origin,units:[]};
   armyMap.set(key,gr);g.scenario.groups.push(gr);
  }
  return armyMap.get(key);
 }
 for(const [side,city,name,cls,count,commander] of ARMY_GROUPS){
  const s=g.stations.find(v=>v.name===city);
  if(!s||s.owner!==side)throw Error('Army staging city absent '+city);
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
    !E.TERRAIN[t.terrain]?.blocked&&!E.unitAt(g,t)&&t.owner===side&&
    (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),15);
   if(!at)throw Error('No Army Group space '+city);
   const cmd=i===0?commander:null;
   const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
   group(side,name,city).units.push(u.id);
   if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
  }
 }
 const usedPortHexes=new Set();
 for(const [name,level] of Object.entries(PORTS)){
  const s=g.stations.find(v=>v.name===name);
  if(!s)throw Error('Missing India port '+name);
  const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&navigable(t)&&
   !usedPortHexes.has(E.key(t))&&!g.stations.some(x=>x.c===t.c&&x.r===t.r))
   .sort((a,b)=>E.adjacent(g,b).filter(navigable).length-
    E.adjacent(g,a).filter(navigable).length)[0];
  if(!at)throw Error('No navigable berth at '+name);
  s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
  usedPortHexes.add(E.key(at));
 }
 for(const [side,name,lon,lat,type,count] of FLEETS){
  if(!E.TYPES[type]?.naval)throw Error('Invalid India naval type '+type);
  const f={id:'fleet-'+g.scenario.groups.length,side,
   name:name+' Fleet',origin:name,units:[]};
  for(let i=0;i<count;i++){
   const at=nearest(g,locate(lon,lat),t=>t.terrain==='sea'&&navigable(t)&&
    !E.unitAt(g,t)&&!usedPortHexes.has(E.key(t)),22);
   if(!at)throw Error('No navigable fleet berth '+name);
   const u=E.newUnit(g,type,side,at.c,at.r);
   if(side==='eu'&&type==='eu_carrier')u.invasionGroup=name;
   f.units.push(u.id);
  }
  g.scenario.groups.push(f);
 }
 // Embark three self-contained assault Army Groups. They are fully converted
 // in the ordinary Elite pass before they are removed from map to cargo.
 const carriers=g.units.filter(u=>u.side==='eu'&&u.invasionGroup);
 const passengers=[];
 for(const [name,cls,count,commander] of LANDINGS)for(let i=0;i<count;i++){
  const ship=carriers.find(v=>v.invasionGroup===name&&
   (v.pendingPassengers||0)<E.TYPES[v.type].capacity);
  if(!ship)throw Error('Insufficient India carrier capacity '+name);
  ship.pendingPassengers=(ship.pendingPassengers||0)+1;
  const cmd=i===0?commander:null;
  const u=E.newUnit(g,E.typeFor('eu',cls,g),'eu',ship.c,ship.r,
    i===0?3:2,cmd);
  if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
  passengers.push({ship,u});group('eu',name,name).units.push(u.id);
 }
 if(difficulty==='elite')E.prepareEliteEurope(g);
 for(const {ship,u} of passengers){
  (ship.cargo||=[]).push(u);g.units.splice(g.units.indexOf(u),1);
 }
 for(const ship of carriers)delete ship.pendingPassengers;
 for(const side of SIDES){
  const factor=side===player?1:['challenge','elite'].includes(difficulty)?1.6:
    difficulty==='hard'?1.3:1;
  const base=E.income(g,side);
  g.scenario.funding[side]=Object.fromEntries(Object.entries(FUNDING[side])
   .map(([res,n])=>[res,Math.round(n*factor)-base[res]]));
  const actual=E.income(g,side);
  for(const res of Object.keys(FUNDING[side]))
   g.economy[side][res]=actual[res]*2;
 }
 if(difficulty!=='normal'&&difficulty!=='elite'){
  for(const side of SIDES.filter(x=>x!==player))
   for(const [i,u] of g.units.flatMap(v=>[v,...(v.cargo||[])])
    .filter(v=>v.side===side&&E.TYPES[v.type].naval!=='ship').entries())
    if(difficulty==='challenge'||i%2===0){
     u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);
    }
 }
 g.startUnits=Object.fromEntries(SIDES.map(side=>[side,g.units.reduce((n,u)=>
  n+(u.side===side?1:0)+(u.cargo||[]).filter(v=>v.side===side).length,0)]));
 E.log(g,'E.U. columns advance east from Persia and Afghanistan while three carrier corps attack Sindh, Gujarat and Konkan. Chinese Federation cities, ports and naval forces defend the Indian theatre.',player);
 return g;
}
function onTurn(){return false;}
function strategicScore(g,side){return g.stations.filter(s=>s.owner===side)
 .reduce((v,s)=>v+s.tier,0);}
function objective(g,side=g.player){
 return 'Conquer all '+CITIES.length+' India theatre cities ('+
  g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+
  ' controlled). No turn limit.';
}
function winner(g){
 if(g.mode!=='scenario'||g.scenario?.id!==ID||
   g.stations.length!==CITIES.length)return null;
 for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
  return {winner:side,reason:E.FACTIONS[side].name+
   ' has conquered every city in the Indian theatre.'};
 return null;
}
const api={id:ID,title:'Invasion of India',cols:COLS,rows:ROWS,sides:SIDES,
 bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,fleetData:FLEETS,
 landingData:LANDINGS,ports:PORTS,rivers:RIVERS,create,onTurn,objective,winner,
 strategicScore,orderGroup};
api.meta={elite:true,terrainCosts:{mountain:2},
 map:{centreSampled:true,coastBuffer:0,overviewMarkers:true},
 ai:{doctrine:'europe',recovery:true,synchronizedFlotillas:true,
  operationalAxes:{invader:'eu',defender:'cf',axes:{
   'Northern Expedition':['Peshawar','Islamabad','Lahore'],
   'Indus Breakthrough':['Quetta','Multan','Jaipur'],
   'Sindh Landings':['Karachi','Hyderabad Sindh'],
   'Gujarat Landings':['Mundra','Ahmedabad','Surat'],
   'Konkan Landings':['Panaji','Mumbai','Pune']},
   defenderHubs:['Lahore','New Delhi','Mumbai','Kolkata','Hyderabad Deccan']}},
 text:{
  era:'India · Alternate 2017',
  intro:'Europia United invades from Persia and Afghanistan, supported by Arabian Sea carrier landings at Sindh, Gujarat and Konkan. Fight across the Indus, Ganges and Deccan to capture every theatre city.',
  diplomacy:'Only E.U. and the Chinese Federation participate. Ports are individually capturable, factories and AI production remain active, and neither faction has a turn-limit victory.',
  elite:'Elite India follows standard faction-specific Elite Force conversion, commander progression and recruitment rules; carrier hulls remain standard naval units.',
  terrain:'Himalayan and Hindu Kush slopes raise movement costs. Khyber, Quetta and Jammu corridors remain playable.',
  focus:{eu:'Kandahar',cf:'New Delhi'}},
 blurbs:{
  eu:'Break through the northwest frontier and coordinate three Arabian Sea landings to seize the western ports, the Indus valley and the industrial heartland.',
  cf:'Hold the Indus and Punjab, defend the coastal factories and ports, contain the landings, and counterattack from the Ganges and Deccan reserves.'
 }};
E.scenarios={...(E.scenarios||{}),[KEY]:api,
 byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

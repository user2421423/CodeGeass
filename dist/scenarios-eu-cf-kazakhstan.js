/* Invasion of Kazakhstan — E.U. vs Federation, fourth E.U. World Campaign mission.
   Geographic WGS84 settlement control points; political occupation is alternate history.
   Inland Caspian naval basin and separate non-navigable inter-lake connections.
   Integrator alone enables the scenario in the manifest and campaign registry. */
(function(root) {
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='eu-cf-kazakhstan', COLS=156,ROWS=104,SIDES=['eu','cf'];
const BOUNDS={west:44.5,east:87.5,north:56.4,south:40.6};
const PROJECTION={centerLon:66,centerLat:48.5,angle:0,
uMin:-21.5*Math.cos(48.5*Math.PI/180),uMax:21.5*Math.cos(48.5*Math.PI/180),vMin:-7.9,vMax:7.9};
// [name,longitude,latitude,owner,factory tier,fortification]
const CITIES=[["Astrakhan",48.04,46.35,"eu",3,1],["Saratov",46.03,51.53,"eu",3,1],["Samara",50.15,53.2,"eu",3,1],["Buzuluk",52.26,52.78,"eu",2,0],["Orenburg",55.1,51.77,"eu",3,1],["Orsk",58.57,51.2,"eu",3,1],["Magnitogorsk",58.98,53.39,"eu",3,0],["Troitsk",61.56,54.09,"eu",2,0],["Kurgan",65.34,55.44,"eu",3,0],["Omsk",73.37,54.99,"eu",3,1],["Barnaul",83.78,53.35,"eu",3,0],["Rubtsovsk",81.21,51.51,"eu",2,0],["Oral (Uralsk)",51.37,51.23,"cf",3,1],["Aksai",53,51.17,"cf",2,0],["Atyrau",51.88,47.1,"cf",3,1],["Inderbor",51.83,48.55,"cf",1,0],["Kulsary",54.01,46.95,"cf",2,0],["Aktau",51.16,43.65,"cf",3,1],["Fort-Shevchenko",50.26,44.51,"cf",1,0],["Zhanaozen",52.86,43.34,"cf",2,0],["Beyneu",55.2,45.32,"cf",2,0],["Aktobe",57.17,50.28,"cf",3,1],["Khromtau",58.43,50.25,"cf",2,0],["Kandyagash",57.42,49.47,"cf",2,0],["Shalkar",59.61,47.83,"cf",2,0],["Kostanay",63.63,53.21,"cf",3,1],["Rudny",63.12,52.97,"cf",3,0],["Lisakovsk",62.49,52.54,"cf",2,0],["Zhitikara",61.2,52.19,"cf",2,0],["Petropavl",69.16,54.87,"cf",3,1],["Kokshetau",69.39,53.28,"cf",3,0],["Stepnogorsk",71.89,52.35,"cf",2,0],["Atbasar",68.36,51.82,"cf",2,0],["Astana",71.43,51.17,"cf",3,1],["Arkalyk",66.91,50.25,"cf",2,0],["Zhezkazgan",67.71,47.79,"cf",3,1],["Satpayev",67.53,47.9,"cf",2,0],["Karaganda",73.09,49.8,"cf",3,1],["Temirtau",72.96,50.05,"cf",3,0],["Balkhash",74.98,46.84,"cf",2,0],["Priozersk",73.5,46.03,"cf",2,0],["Aralsk",61.66,46.8,"cf",2,0],["Baikonur",63.32,45.62,"cf",2,0],["Kyzylorda",65.5,44.85,"cf",3,1],["Turkistan",68.27,43.3,"cf",3,0],["Kentau",68.5,43.51,"cf",2,0],["Shymkent",69.58,42.32,"cf",3,1],["Taraz",71.36,42.9,"cf",3,1],["Saryagash",69.17,41.45,"cf",2,0],["Pavlodar",76.95,52.29,"cf",3,1],["Ekibastuz",75.38,51.72,"cf",3,0],["Kurchatov",78.54,50.75,"cf",2,0],["Semey",80.25,50.41,"cf",3,1],["Oskemen",82.62,49.97,"cf",3,1],["Ridder",83.51,50.34,"cf",2,0],["Altai",84.27,49.74,"cf",2,0],["Ayagoz",80.43,47.96,"cf",2,0],["Zaysan",84.86,47.47,"cf",2,0],["Urzhar",81.62,47.1,"cf",2,0],["Usharal",80.94,46.17,"cf",2,0],["Taldykorgan",78.38,45.01,"cf",3,0],["Konaev",77.07,43.87,"cf",2,0],["Almaty",76.95,43.24,"cf",3,1],["Zharkent",80,44.16,"cf",2,0],["Tekeli",78.82,44.83,"cf",2,0]];
const ARMY_GROUPS=[["eu","Astrakhan","medium",5,"leila"],["eu","Astrakhan","rocket",3,"anna"],["eu","Saratov","heavy",5,"fernando"],["eu","Saratov","assault",4,"oscar"],["eu","Samara","heavy",7,"akito"],["eu","Samara","rocket",5,"yukiya"],["eu","Samara","assault",4,"ryo"],["eu","Buzuluk","medium",4,"olivia"],["eu","Orenburg","heavy",8,"ayano"],["eu","Orenburg","rocket",5,"smilas"],["eu","Orenburg","assault",5,"klaus"],["eu","Orsk","heavy",7,"margaret"],["eu","Orsk","rocket",4,"pierre"],["eu","Orsk","raider",4,null],["eu","Magnitogorsk","heavy",6,"eduardo"],["eu","Magnitogorsk","siege",3,null],["eu","Troitsk","medium",5,null],["eu","Kurgan","heavy",6,null],["eu","Kurgan","rocket",4,null],["eu","Omsk","heavy",7,null],["eu","Omsk","assault",5,null],["eu","Barnaul","heavy",5,null],["eu","Barnaul","rocket",4,null],["eu","Rubtsovsk","medium",4,null],["cf","Oral (Uralsk)","heavy",5,"gaohai"],["cf","Oral (Uralsk)","rocket",3,null],["cf","Atyrau","medium",4,"meiling"],["cf","Atyrau","rocket",3,null],["cf","Aktau","heavy",3,"honggu"],["cf","Aktobe","heavy",5,"zhaohao"],["cf","Aktobe","rocket",4,null],["cf","Kostanay","heavy",5,"cao"],["cf","Kostanay","assault",4,null],["cf","Petropavl","heavy",4,"lifeng"],["cf","Kokshetau","rocket",4,null],["cf","Astana","heavy",7,"xingke"],["cf","Astana","rocket",4,"xianglin"],["cf","Astana","siege",3,null],["cf","Karaganda","heavy",6,"chaojielun"],["cf","Karaganda","assault",4,null],["cf","Zhezkazgan","medium",4,null],["cf","Kyzylorda","medium",4,"ren"],["cf","Kyzylorda","rocket",3,null],["cf","Shymkent","heavy",5,"leifeng"],["cf","Taraz","assault",4,null],["cf","Pavlodar","heavy",5,"chengzhong"],["cf","Pavlodar","rocket",3,null],["cf","Semey","heavy",5,"vritra"],["cf","Semey","rocket",3,null],["cf","Oskemen","heavy",5,"zidien"],["cf","Oskemen","assault",3,null],["cf","Almaty","heavy",6,null],["cf","Almaty","rocket",4,null],["cf","Taldykorgan","medium",4,null],["cf","Ayagoz","raider",4,null],["cf","Balkhash","medium",3,null]];
const FUNDING={eu:{credits:1180,industry:960,science:105,sakuradite:62},
cf:{credits:980,industry:810,science:110,sakuradite:66}};
const PORTS={'Astrakhan':2,'Atyrau':2,'Aktau':3,'Fort-Shevchenko':2};
const FLEETS=[['eu','Astrakhan','panzer_frosch_ii',3],
['cf','Atyrau','shui_gun_ru_ii',2],['cf','Aktau','shui_gun_ru_ii',2]];
const MOUNTAIN_PASSES=[["Karkaraly hills",75.8,49.1,0.65],["Dzungarian Gate",80.25,45.45,0.7],["Korday Pass",75.2,43,0.65],["Altai Irtysh valley",82.1,49.6,0.8],["Urzhar basin",81.9,47.35,0.7]];
const SUPPLY_CORRIDORS=[["Northern railway",["Samara","Orenburg","Aktobe","Kostanay","Astana","Pavlodar","Semey"]],["Southern steppe",["Orsk","Aktobe","Shalkar","Aralsk","Kyzylorda","Turkistan","Shymkent"]],["Trans-Kazakhstan railway",["Kostanay","Arkalyk","Zhezkazgan","Karaganda","Balkhash","Almaty"]],["Siberian axis",["Omsk","Petropavl","Kokshetau","Astana","Karaganda"]],["Eastern industrial axis",["Barnaul","Oskemen","Semey","Ekibastuz","Pavlodar"]]];
const RIVERS={"Ural":[[58.6,51.2],[56,51.5],[53,51.2],[51.37,51.23],[51.5,48.5],[51.88,47.1]],"Tobol":[[61,52.1],[62.5,52.7],[63.63,53.21],[65.34,55.44]],"Ishim":[[73.1,49.8],[71.43,51.17],[69.39,53.28],[69.16,54.87],[69.5,55.3]],"Irtysh":[[85,47.8],[82.62,49.97],[80.25,50.41],[76.95,52.29],[73.37,54.99]],"Syr Darya":[[69.6,41.7],[68.27,43.3],[65.5,44.85],[63.32,45.62],[61.66,46.8]],"Ili":[[80,43.2],[78.8,43.8],[77.07,43.87],[75.5,45.2],[74.9,46.5]]};
const OPERATIONAL_AXES={
western:['Samara','Orenburg','Oral (Uralsk)','Aktobe','Aralsk','Kyzylorda'],
northern:['Magnitogorsk','Troitsk','Kostanay','Arkalyk','Astana','Karaganda'],
siberian:['Kurgan','Omsk','Petropavl','Kokshetau','Pavlodar','Ekibastuz'],
eastern:['Barnaul','Rubtsovsk','Oskemen','Semey','Ayagoz','Almaty']};
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,
Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
(lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};}
function nearest(g,p,valid,radius=10){let best=null,d=Infinity;
for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
const t=E.tile(g,c,r);if(!t||!valid(t))continue;const n=E.distance(p,t,g);
if(n<d){d=n;best=t;}}return best;}
// Distinguish enclosed Caspian waters from the fragmented Aral, Balkhash,
// and Zaysan lakes. Shore cells follow the shared 20-80% mixed-cell standard.
function interpolate(lat,points){
  for(let i=1;i<points.length;i++)if(lat<=points[i][0]){
    const [ay,ax]=points[i-1],[by,bx]=points[i];
    return ax+(bx-ax)*Math.max(0,Math.min(1,(lat-ay)/(by-ay)));
  }
  return points[points.length-1][1];
}
function basin(lon,lat){
  if(lat>=40.6&&lat<=47.4){
    const w=interpolate(lat,[[40.6,47],[42.2,47.2],[44,47.4],[45.5,47.5],[46.4,48.4],[47.4,50]]);
    const e=interpolate(lat,[[40.6,53],[42.2,52.7],[43.6,51.35],[44.6,52.05],[46,53.15],[47,52.05],[47.4,50]]);
    if(lon>w&&lon<e)return 'caspian';
  }
  const ell=(x,y,rx,ry)=>((lon-x)/rx)**2+((lat-y)/ry)**2<1;
  if(ell(60.55,46.62,.87,.47)||ell(59.7,44.65,1.2,.61))return 'aral';
  if(ell(75.6,46.45,2.35,.42)||ell(78.15,46.55,1,.35))return 'balkhash';
  if(ell(84.7,47.82,1.2,.30))return 'zaysan';
  return null;
}
function waterAt(c,r){
  let count=0;
  for(let sy=-1;sy<=1;sy++)for(let sx=-1;sx<=1;sx++){
    const p=geo(c+sx*.29,r+sy*.29);
    if(basin(p.lon,p.lat))count++;
  }
  return count/9;
}
function landscape(p,c,r){
  const ell=(x,y,rx,ry)=>((p.lon-x)/rx)**2+((p.lat-y)/ry)**2;
  const pass=MOUNTAIN_PASSES.some(([,x,y,w])=>Math.hypot((p.lon-x)*.8,p.lat-y)<w);
  if(!pass&&(ell(82,49.7,3.9,1.8)<1||ell(78.8,42.1,5.8,1.75)<1))
    return (c*7+r*13)%9<7?'mountain':'forest';
  if((p.lat>53.6&&p.lon>66&&(c*11+r*17)%11<3)||
     (p.lon>80&&p.lat>48&&(c*19+r*23)%13<4))return 'forest';
  return 'plains'; // primary tank maneuver theater
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
    return {ok:assigned>0,assigned,failed,reason:assigned?'':'No group unit can reach that hex'};
  }
function create(player='eu',difficulty='normal',seed=201704){
if(!SIDES.includes(player))throw Error('Unsupported Kazakhstan faction: '+player);
if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{eu:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:ID,key:'kazakhstan',title:'Invasion of Kazakhstan',version:1,
phase:'steppe-offensive',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
aiDoctrine:'europe',rivers:RIVERS,mountainPasses:MOUNTAIN_PASSES,
supplyCorridors:SUPPLY_CORRIDORS,offensiveAxes:OPERATIONAL_AXES,
operationalAxes:OPERATIONAL_AXES,totalConquest:true,turnLimit:null};
    // Use only faction-correct units and roster-compatible Elite Forces.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    // Continental theatre; no fake water or impassable land cutoff.
g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),fraction=waterAt(c,r);
return {c,r,owner:null,terrain:fraction>=.8?'sea':
  fraction>=.2?'coast':landscape(p,c,r),waterFraction:fraction,
  waterBasin:basin(p.lon,p.lat)};});
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
!g.stations.some(s=>s.c===t.c&&s.r===t.r),10);
      if(!at)throw Error('Cannot place Kazakhstan city '+name);
      const capital=['Samara','Orenburg','Omsk','Astana','Almaty'].includes(name);
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
      if(!s||s.owner!==side)throw Error('Invalid staging city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),16);
        if(!at)throw Error('Cannot deploy Kazakhstan unit at '+name);
        const cmd=i===0?commander:null;
        const stack=i===0?3:2;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,name).units.push(u.id);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    // Independent ports are capturable sea tiles; naval ships remain within
    // the Caspian. No ship is spawned in the isolated Aral/Balkhash/Zaysan lakes.
    const portCells=new Set();
    const caspianSea=t=>t&&t.terrain==='sea'&&
      basin(geo(t.c,t.r).lon,geo(t.c,t.r).lat)==='caspian';
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      if(!s)throw Error('Missing Kazakhstan port '+name);
      const at=nearest(g,s,t=>caspianSea(t)&&!portCells.has(E.key(t)),11);
      if(!at)throw Error('No navigable Caspian harbour for '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      portCells.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      if(!E.TYPES[type]?.naval)throw Error('Invalid Caspian ship '+type);
      const s=g.stations.find(v=>v.name===name);
      const fleet={id:'fleet-'+side+'-'+name,side,
        name:name+' Caspian Flotilla',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>caspianSea(t)&&!E.unitAt(g,t),13);
        if(!at)throw Error('No available Caspian berth at '+name);
        fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
      }
      g.scenario.groups.push(fleet);
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
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>v!==player))
        for(const [i,u] of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval).entries())
          if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Europian armies advance across the Kazakh steppe from Russia; Federation mobile reserves hold its industrial rail junctions.',player);
return g;
}
function onTurn(){return false;}
function strategicScore(g,side){return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);}
function objective(g,side=g.player){return 'Conquer all '+CITIES.length+
 ' Kazakhstan theater cities ('+g.stations.filter(s=>s.owner===side).length+
 '/'+CITIES.length+' controlled). No turn limit.';}
function winner(g){if(g.mode!=='scenario'||g.scenario?.id!==ID||
 g.stations.length!==CITIES.length)return null;
 for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
   return {winner:side,reason:E.FACTIONS[side].name+' controls every Kazakhstan theater city.'};
 return null;}
const api={id:ID,title:'Invasion of Kazakhstan',cols:COLS,rows:ROWS,
 sides:SIDES,bounds:BOUNDS,projection:PROJECTION,cityData:CITIES,
 armyGroups:ARMY_GROUPS,ports:PORTS,fleetData:FLEETS,
 operationalAxes:OPERATIONAL_AXES,mountainPasses:MOUNTAIN_PASSES,
 supplyCorridors:SUPPLY_CORRIDORS,rivers:RIVERS,
 create,onTurn,objective,winner,strategicScore,orderGroup,locate,geo};
api.meta={terrainCosts:{mountain:2},saveVersion:1,elite:true,
 map:{centreSampled:true,coastBuffer:1,overviewMarkers:true,overlays:['regionalRivers']},
 ai:{doctrine:'europe',recovery:true,operationalAxes:{
   invader:'eu',defender:'cf',
   axes:{'Samara Command':['Oral (Uralsk)','Atyrau','Aktau'],
     'Orenburg Command':['Aktobe','Shalkar','Kyzylorda'],
     'Omsk Command':['Petropavl','Kokshetau','Astana'],
     'Barnaul Command':['Oskemen','Semey','Almaty']},
   defenderHubs:['Aktobe','Kostanay','Astana','Karaganda','Semey','Almaty']}},
 text:{
 terrain:'Open steppe favours armored mobility. Altai and Tien Shan mountain hexes cost 2 movement; named passes are traversable. Caspian fleets cannot enter other lakes.',
 era:'Kazakhstan · E.U.–Federation Eastern Front',
 intro:'Four Europian thrusts enter Kazakhstan from Russia, contesting the Caspian frontier, northern rails and eastern industrial belt. Take every city, without turn limits.',
 diplomacy:'Europia United and the Chinese Federation are hostile from turn 1. Caspian harbours are independently capturable; fleets never traverse disconnected lakes.',
 elite:'Normal faction Elite Forces, named commanders, research, production and difficulty scaling.',
 focus:{eu:'Orenburg',cf:'Astana'}},
 blurbs:{
 eu:'Drive across open armored corridors from Orenburg, Samara, Omsk and Barnaul; isolate Federation industry before its mobile reserves consolidate.',
 cf:'Hold Kostanay, Astana, Karaganda and Almaty with layered armor and artillery; counterattack exposed E.U. spearheads.'
 }};
E.scenarios={...(E.scenarios||{}),kazakhstan:api,
 byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

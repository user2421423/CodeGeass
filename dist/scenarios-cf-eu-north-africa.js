/* Federation vs E.U. — North African Offensive (alternate 2017).
   Independent two-sided regional battle; Egyptian Federation staging advances
   through Libya, Tunisia and Algeria. All ports are capturable sea hexes.
   Geographic coordinates are WGS84; ownership is alternate history. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='cf-eu-north-africa',KEY='cfEuNorthAfrica',SIDES=['cf','eu'];
const COLS=176,ROWS=108;
const BOUNDS={west:-1.8,east:34.3,north:40.5,south:22.4};
const MID=(BOUNDS.north+BOUNDS.south)/2,K=Math.cos(MID*Math.PI/180);
const PROJECTION={centerLon:(BOUNDS.west+BOUNDS.east)/2,centerLat:MID,angle:0,
  uMin:(BOUNDS.west-(BOUNDS.west+BOUNDS.east)/2)*K,
  uMax:(BOUNDS.east-(BOUNDS.west+BOUNDS.east)/2)*K,
  vMin:BOUNDS.south-MID,vMax:BOUNDS.north-MID};
// The Mediterranean-facing shoreline traces actual capes, the Gulf of Sidra,
// the Tunisian east coast and the Nile Delta in geographic order. Unlike a
// single longitude->latitude mask it preserves the concave coast of Tunisia.
const SHORE=[
 [-1.8,35.2],[-1.35,35.5],[-0.64,35.70],[0.0,35.82],[1.05,36.18],
 [2.48,36.62],[3.07,36.77],[4.10,36.88],[5.08,36.76],[6.35,36.92],
 [7.77,36.90],[8.58,36.95],[9.30,37.25],[9.87,37.29],
 [10.24,36.92],[10.56,36.42],[10.63,35.83],[10.75,35.28],
 [10.80,34.73],[10.03,34.00],[10.80,33.77],[11.27,33.65],
 [11.48,33.17],[12.08,32.91],[13.19,32.91],[14.42,32.51],
 [15.08,32.37],[16.02,31.98],[16.59,31.21],[17.35,30.53],
 [18.48,30.37],[19.65,30.80],[20.06,32.12],[20.83,32.85],
 [22.64,32.77],[23.95,32.08],[24.50,31.77],[25.16,31.60],
 [26.95,31.36],[27.25,31.35],[28.27,31.05],[29.92,31.20],
 [30.60,31.45],[31.23,31.50],[32.38,31.28],[32.54,31.00],
 [34.3,31.15]
];
const LAND_POLY=[...SHORE,[BOUNDS.east,BOUNDS.south],[BOUNDS.west,BOUNDS.south]];
// City: name, longitude, latitude, owner, industrial tier, fortification.
const CITIES=[
 ['Cairo',31.24,30.04,'cf',3,true],['Giza',31.21,30.01,'cf',2,false],
 ['Alexandria',29.92,31.20,'cf',3,true],['El Alamein',28.96,30.83,'cf',2,true],
 ['El Dabaa',28.45,31.03,'cf',2,false],['Marsa Matruh',27.24,31.35,'cf',3,true],
 ['Sidi Barrani',25.93,31.61,'cf',2,true],['Sallum',25.16,31.55,'cf',2,true],
 ['Siwa',25.52,29.20,'cf',2,true],
 ['Bardia',25.09,31.76,'eu',2,true],['Tobruk',23.95,32.08,'eu',3,true],
 ['Derna',22.64,32.77,'eu',2,true],['Al Bayda',21.74,32.76,'eu',2,true],
 ['Benghazi',20.07,32.12,'eu',3,true],['Ajdabiya',20.23,30.76,'eu',2,true],
 ['Al Jaghbub',24.53,29.74,'eu',2,false],['Sirte',16.59,31.21,'eu',3,true],
 ['Waddan',16.14,29.16,'eu',2,false],['Misrata',15.09,32.38,'eu',3,true],
 ['Zliten',14.57,32.47,'eu',2,false],['Khoms',14.26,32.65,'eu',2,true],
 ['Tripoli',13.19,32.89,'eu',3,true],['Zuwara',12.08,32.93,'eu',2,true],
 ['Nalut',10.85,31.87,'eu',2,true],['Ghadames',9.50,30.14,'eu',2,false],
 ['Sabha',14.43,27.04,'eu',3,true],['Ghat',10.17,24.96,'eu',2,false],
 ['Tunis',10.18,36.81,'eu',3,true],['Bizerte',9.87,37.28,'eu',3,true],
 ['Hammamet',10.62,36.40,'eu',2,false],['Sousse',10.64,35.83,'eu',2,true],
 ['Kairouan',10.10,35.68,'eu',2,true],['Sfax',10.76,34.74,'eu',3,true],
 ['Gabes',10.10,33.88,'eu',2,true],['Medenine',10.50,33.35,'eu',2,true],
 ['Gafsa',8.78,34.43,'eu',2,true],['Kasserine',8.84,35.17,'eu',2,false],
 ['Algiers',3.06,36.75,'eu',3,true],['Blida',2.83,36.48,'eu',2,true],
 ['Oran',-0.64,35.70,'eu',3,true],['Tlemcen',-1.32,34.88,'eu',2,true],
 ['Bejaia',5.08,36.76,'eu',3,true],['Annaba',7.77,36.90,'eu',3,true],
 ['Skikda',6.90,36.88,'eu',2,true],['Jijel',5.77,36.82,'eu',2,false],
 ['Constantine',6.61,36.36,'eu',3,true],['Setif',5.41,36.19,'eu',2,true],
 ['Batna',6.17,35.55,'eu',2,true],['Biskra',5.73,34.85,'eu',2,true],
 ['Ghardaia',3.67,32.49,'eu',2,true],['Tizi Ouzou',4.05,36.71,'eu',2,false]
];
// Faction, staging city, Army Group, frame class, formation count, officer.
const ARMY_GROUPS=[
 ['cf','Sallum','Western Desert Vanguard','heavy',8,'xingke'],
 ['cf','Sallum','Western Desert Vanguard','assault',6,'xianglin'],
 ['cf','Sallum','Western Desert Vanguard','rocket',5,null],
 ['cf','Sidi Barrani','Coastal Breakthrough Army','heavy',9,'honggu'],
 ['cf','Sidi Barrani','Coastal Breakthrough Army','medium',6,null],
 ['cf','Sidi Barrani','Coastal Breakthrough Army','siege',4,null],
 ['cf','Marsa Matruh','Mediterranean Expedition','heavy',8,'cao'],
 ['cf','Marsa Matruh','Mediterranean Expedition','rocket',6,'gaohai'],
 ['cf','Marsa Matruh','Mediterranean Expedition','assault',5,null],
 ['cf','El Alamein','Nile Mobile Reserve','heavy',6,'zhaohao'],
 ['cf','El Alamein','Nile Mobile Reserve','medium',6,null],
 ['cf','Alexandria','Alexandrian Naval Corps','assault',6,'meiling'],
 ['cf','Alexandria','Alexandrian Naval Corps','rocket',4,null],
 ['cf','Cairo','Egyptian Support Army','heavy',6,'leifeng'],
 ['cf','Cairo','Egyptian Support Army','siege',4,null],
 ['cf','Siwa','Siwa Southern Flank','heavy',8,'lifeng'],
 ['cf','Siwa','Siwa Southern Flank','raider',6,null],
 ['cf','Siwa','Siwa Southern Flank','rocket',4,null],
 ['eu','Bardia','Marmarica Forward Defense','heavy',5,'akito'],
 ['eu','Bardia','Marmarica Forward Defense','rocket',3,'yukiya'],
 ['eu','Tobruk','Tobruk Garrison','heavy',7,'leila'],
 ['eu','Tobruk','Tobruk Garrison','siege',4,null],
 ['eu','Derna','Cyrenaican Counterstroke','heavy',4,'ryo'],
 ['eu','Derna','Cyrenaican Counterstroke','assault',4,null],
 ['eu','Benghazi','Benghazi Defence Army','heavy',6,'smilas'],
 ['eu','Benghazi','Benghazi Defence Army','rocket',4,null],
 ['eu','Ajdabiya','Gulf of Sidra Reserve','medium',4,'ayano'],
 ['eu','Sirte','Sirte Coastal Line','heavy',5,'oscar'],
 ['eu','Sirte','Sirte Coastal Line','rocket',3,null],
 ['eu','Misrata','Tripolitanian Front','heavy',5,'olivia'],
 ['eu','Misrata','Tripolitanian Front','assault',4,null],
 ['eu','Tripoli','Tripoli Mobile Army','heavy',6,'klaus'],
 ['eu','Tripoli','Tripoli Mobile Army','rocket',4,null],
 ['eu','Sabha','Fezzan Desert Reserve','heavy',4,'margaret'],
 ['eu','Sabha','Fezzan Desert Reserve','medium',4,null],
 ['eu','Tunis','Tunis Northern Command','heavy',5,'marirrosa'],
 ['eu','Tunis','Tunis Northern Command','rocket',4,null],
 ['eu','Bizerte','Bizerte Mediterranean Fleet Guard','heavy',4,'pierre'],
 ['eu','Sfax','Gabes Coastal Defence','medium',4,null],
 ['eu','Gabes','Gabes Coastal Defence','heavy',3,null],
 ['eu','Annaba','Eastern Algeria Command','heavy',4,'fernando'],
 ['eu','Constantine','Eastern Algeria Command','rocket',3,null],
 ['eu','Algiers','Algerian Capital Defence','heavy',7,'anna'],
 ['eu','Algiers','Algerian Capital Defence','siege',4,null],
 ['eu','Bejaia','Kabylia Mountain Guard','medium',4,null],
 ['eu','Oran','Oran Western Reserve','heavy',5,null],
 ['eu','Oran','Oran Western Reserve','rocket',3,null],
 ['eu','Ghardaia','Sahara Interior Reserve','medium',4,null]
];
const PORTS={'Alexandria':3,'El Dabaa':2,'Marsa Matruh':3,
 'Sallum':2,'Bardia':2,'Tobruk':3,'Derna':2,'Benghazi':3,
 'Sirte':2,'Misrata':3,'Khoms':2,'Tripoli':3,'Zuwara':2,
 'Bizerte':3,'Tunis':3,'Sousse':2,'Sfax':3,'Gabes':2,
 'Algiers':3,'Bejaia':3,'Annaba':3,'Skikda':2,'Oran':3};
const FLEETS=[
 ['cf','Alexandria','cf_carrier',3],['cf','Alexandria','shui_gun_ru_ii',4],
 ['cf','Marsa Matruh','cf_carrier',2],['cf','Marsa Matruh','shui_gun_ru_ii',4],
 ['eu','Tobruk','eu_carrier',2],['eu','Tobruk','panzer_frosch_ii',3],
 ['eu','Benghazi','eu_carrier',2],['eu','Benghazi','panzer_frosch_ii',3],
 ['eu','Tripoli','eu_carrier',2],['eu','Tripoli','panzer_frosch_ii',3],
 ['eu','Tunis','eu_carrier',2],['eu','Tunis','panzer_frosch_ii',3],
 ['eu','Algiers','eu_carrier',2],['eu','Algiers','panzer_frosch_ii',3]
];
const FUNDING={cf:{credits:1150,industry:690,science:118,sakuradite:60},
 eu:{credits:990,industry:590,science:106,sakuradite:54}};
const AXES={
 'Western Desert Vanguard':['Bardia','Tobruk','Derna','Benghazi'],
 'Coastal Breakthrough Army':['Tobruk','Derna','Benghazi','Sirte'],
 'Mediterranean Expedition':['Benghazi','Sirte','Misrata','Tripoli'],
 'Nile Mobile Reserve':['Bardia','Tobruk','Benghazi'],
 'Alexandrian Naval Corps':['Tobruk','Benghazi','Tripoli','Tunis'],
 'Egyptian Support Army':['Tobruk','Benghazi','Tripoli'],
 'Siwa Southern Flank':['Al Jaghbub','Ajdabiya','Sabha','Sirte']
};
const RIVERS={Nile:[[31.2,29.5],[31.25,30.1],[31.05,30.6],[30.6,31.4]],
 'Medjerda':[[8.45,36.15],[9.18,36.44],[9.84,36.85]]};
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
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
  const t=E.tile(g,c,r);if(!t||!valid(t))continue;
  const d=E.distance(p,t,g);if(d<score){best=t;score=d;}
 }return best;
}
function inLand(lon,lat){
 let inside=false;
 for(let i=0,j=LAND_POLY.length-1;i<LAND_POLY.length;j=i++){
  const a=LAND_POLY[i],b=LAND_POLY[j];
  if((a[1]>lat)!==(b[1]>lat)&&
   lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;
}
function coastalDistance(lon,lat){
 let best=Infinity;
 for(let i=1;i<SHORE.length;i++){
  const a=SHORE[i-1],b=SHORE[i],dx=(b[0]-a[0])*.84,dy=b[1]-a[1],
    x=(lon-a[0])*.84,y=lat-a[1];
  const t=Math.max(0,Math.min(1,(x*dx+y*dy)/(dx*dx+dy*dy||1)));
  best=Math.min(best,Math.hypot(x-t*dx,y-t*dy));
 }return best;
}
const HIGHLANDS=[[21.85,32.5,1.5,.65],[11.0,31.85,1.6,.78],
 [5.6,36.15,2.2,.6],[6.2,35.25,1.5,.7],
 [3.3,36.0,2.5,.7],[-0.5,34.7,1.4,.9]];
function landscape(p,c,r){
 const mountains=HIGHLANDS.some(([x,y,w,h])=>((p.lon-x)/w)**2+((p.lat-y)/h)**2<.7);
 if(mountains)return (c*17+r*13)%11===0?'peak':'mountain';
 // The sea-facing coastal roads and the Siwa–Fezzan inland route never
 // become impassable walls; most of the true Sahara is open desert.
 if(coastalDistance(p.lon,p.lat)<.85)return 'plains';
 if(p.lat<34.2||p.lon>14&&p.lat<31.3)return 'desert';
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
    return {ok:assigned>0,assigned,failed,reason:assigned?'':'No formation can reach the destination'};
  }
  function create(player='cf',difficulty='normal',seed=201719){
    if(!SIDES.includes(player))throw Error('Unsupported North African faction: '+player);
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
      mapRevision:0,teams:null,factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[side]={};
    }
    g.scenario={id:ID,key:KEY,title:'North African Offensive',version:1,
      phase:'cf-western-mediterranean-offensive',aiDoctrine:'europe',
      groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,
      offensiveAxes:{cf:AXES},operationalFronts:[
       {name:'Marmarica Front',side:'cf',from:'Sallum',objectives:['Bardia','Tobruk','Derna']},
       {name:'Cyrenaican Coastal Drive',side:'cf',from:'Marsa Matruh',objectives:['Benghazi','Sirte','Misrata']},
       {name:'Fezzan Flank',side:'cf',from:'Siwa',objectives:['Al Jaghbub','Sabha','Tripoli']},
       {name:'Tripoli–Tunisia',side:'cf',from:'Alexandria',objectives:['Tripoli','Sfax','Tunis']},
       {name:'Algerian Seaboard',side:'cf',from:'Alexandria',objectives:['Annaba','Bejaia','Algiers','Oran']},
       {name:'E.U. Eastern Counteroffensive',side:'eu',from:'Tobruk',objectives:['Sallum','Marsa Matruh']},
       {name:'E.U. Interior Reserve',side:'eu',from:'Sabha',objectives:['Siwa','El Alamein']},
       {name:'E.U. Mediterranean Defence',side:'eu',from:'Tripoli',objectives:['Misrata','Sirte','Benghazi']}
      ]};
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    // A polygon coastline, not a synthetic rectangular beach. Hexes nearest
    // the true shoreline are mixed coast; ships sail through the Mediterranean
    // but cannot teleport through the Sahara or Tunisian mainland.
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const d=coastalDistance(p.lon,p.lat);
      return {c,r,owner:null,terrain:d<.13?'coast':
        inLand(p.lon,p.lat)?landscape(p,c,r):'sea'};
    });
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const port=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>
        t.terrain!=='sea'&&t.terrain!=='offmap'&&t.terrain!=='peak'&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r)&&
        (!port||E.adjacent(g,t).some(n=>n.terrain==='sea')),
        port?10:6);
      if(!at)throw Error('North African city inaccessible: '+name);
      const capital=['Alexandria','Cairo','Tripoli','Tunis','Algiers'].includes(name);
      const shield=E.scenarioCityDefenseHP(tier,!!fort,name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defence Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?52:tier===3?32:22)*.55),
        industry:Math.round((capital?29:7*tier)*.55),
        science:Math.round((tier+2)*.55),producedTurn:0});
    }
    // Provinces follow their nearest real settlement, not rectangular national
    // stripes. All land shares a contiguous traversable coastal/Saharan route.
    for(const t of g.tiles)if(t.terrain!=='sea'){
      let closest=null,score=Infinity;
      for(const s of g.stations){
        const d=E.distance(t,s,g);
        if(d<score){score=d;closest=s;}
      }
      if(closest){t.owner=closest.owner;t.provinceCity=closest.id;}
    }
    const groupMap=new Map();
    function group(side,name,origin){
      const key=side+':'+name;
      if(!groupMap.has(key)){
        const gr={id:'army-'+groupMap.size,side,name,origin,units:[]};
        groupMap.set(key,gr);g.scenario.groups.push(gr);
      }
      return groupMap.get(key);
    }
    for(const [side,name,formation,cls,count,commander] of ARMY_GROUPS){
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side)throw Error('Invalid African staging city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
          !E.TERRAIN[t.terrain]?.blocked&&!E.unitAt(g,t)&&t.owner===side&&
          (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),16);
        if(!at)throw Error('Cannot deploy Army Group near '+name);
        const cmd=i===0?commander:null,stack=i===0?3:2;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,formation,name).units.push(u.id);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    const usedBerths=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      if(!s)throw Error('Missing Mediterranean port city '+name);
      const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&
        !usedBerths.has(E.key(t))&&!E.stationAt(g,t))
        .sort((a,b)=>E.adjacent(g,b).filter(v=>v.terrain==='sea').length-
          E.adjacent(g,a).filter(v=>v.terrain==='sea').length)[0];
      if(!at)throw Error('No Mediterranean berth at '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      usedBerths.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side||!E.TYPES[type]?.naval)
        throw Error('Invalid Mediterranean fleet '+name+'/'+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,name:name+' Fleet',
        origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !usedBerths.has(E.key(t))&&!E.stationAt(g,t),20);
        if(!at)throw Error('Cannot deploy fleet at '+name);
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
        Object.entries(FUNDING[side]).map(([res,n])=>[res,Math.round(n*factor)-base[res]]));
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
    E.log(g,'The Chinese Federation advances west from Egypt through Libya, Tunisia and Algeria. Control every city and capture Mediterranean ports for the next assault on southern France.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((score,s)=>score+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' North African campaign cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' controls every city from Egypt to Algeria.'};
    return null;
  }
  const api={id:ID,title:'North African Offensive',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={
    elite:true,eliteRosterOnly:true,saveVersion:1,
    map:{centreSampled:true,coastBuffer:1,overviewMarkers:true,homeZoom:2.4},
    ai:{doctrine:'europe',recovery:true,routeBias:'cf',
      operationalAxes:{invader:'cf',defender:'eu',axes:AXES,
      defenderHubs:['Tobruk','Benghazi','Sirte','Tripoli','Tunis','Annaba','Algiers','Oran']}},
    text:{
      era:'North Africa · Alternate 2017',
      terrain:'Coastal plains, the Jebel Akhdar, Nafusa and Atlas hills, and traversable Sahara. The Mediterranean is open water with distinct ports.',
      intro:'Push west from Federation-held Egypt through Libya, Tunisia and Algeria. The E.U. can counterattack east. Both sides win only after complete city conquest, with no turn limit.',
      diplomacy:'Two factions only: Chinese Federation and Europia United. Ports are independently capturable; holding North African harbours sets the stage for a later sea assault on southern France.',
      elite:'Elite difficulty uses faction-restricted Elite Forces, standard HQ rules, commander ranks and normal research, repairs and recruitment.',
      focus:{cf:'Sallum',eu:'Tobruk'}},
    blurbs:{
      cf:'Breach the Tobruk line, push along the Tripoli coastal axis, and seize Tunis and Algiers. Protect your southern Siwa flank and capture harbours for the French invasion.',
      eu:'Delay the Egyptian attack at Bardia and Tobruk. Use the Cyrenaica reserves, defend the Tripolitanian coast and reinforce Tunis and Algiers.'}
  };
  E.scenarios={...(E.scenarios||{}),[KEY]:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

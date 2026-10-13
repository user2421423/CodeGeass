/* The Conquest of Area 18 — three-way 2017 Middle Eastern regional war.
   Natural Earth sampled landmask, Persian Gulf fleets and Suez navigation.
   No scripted diplomacy, F.L.E.I.J.A. or turn limit. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=120,ROWS=88,SIDES=['britannia','eu','cf'];
  const BOUNDS={west:29,east:70,north:42,south:10.5};
  const K=Math.cos(26.25*Math.PI/180);
  const PROJECTION={centerLon:49.5,centerLat:26.25,angle:0,uMin:-20.5*K,uMax:20.5*K,vMin:-15.75,vMax:15.75};
  // Named positions are real; the 2017 factions and deployments are alternate history.
  const CITIES=[["Riyadh",46.68,24.71,"britannia",3,true],["Jeddah",39.17,21.54,"britannia",3,true],["Mecca",39.83,21.42,"britannia",2,false],["Medina",39.61,24.47,"britannia",2,false],["Dammam",50.1,26.43,"britannia",3,true],["Hofuf",49.59,25.38,"britannia",2,false],["Buraydah",43.97,26.36,"britannia",2,false],["Tabuk",36.57,28.38,"britannia",2,true],["Hail",41.69,27.52,"britannia",2,false],["Najran",44.13,17.49,"britannia",2,false],["Abha",42.51,18.22,"britannia",2,false],["Kuwait City",47.98,29.38,"britannia",3,true],["Basra",47.78,30.51,"britannia",3,true],["Baghdad",44.37,33.32,"britannia",3,true],["Doha",51.53,25.29,"britannia",2,false],["Abu Dhabi",54.37,24.45,"britannia",2,false],["Dubai",55.27,25.2,"britannia",2,false],["Muscat",58.41,23.59,"britannia",3,true],["Salalah",54.09,17.02,"britannia",2,false],["Sana'a",44.21,15.37,"britannia",2,true],["Aden",45.03,12.79,"britannia",2,true],["Damascus",36.29,33.51,"eu",3,true],["Aleppo",37.16,36.2,"eu",3,true],["Latakia",35.79,35.52,"eu",2,true],["Beirut",35.5,33.89,"eu",3,true],["Homs",36.72,34.73,"eu",2,false],["Amman",35.93,31.95,"eu",2,true],["Jerusalem",35.23,31.77,"eu",2,true],["Haifa",34.99,32.81,"eu",2,false],["Aqaba",35.01,29.53,"eu",2,false],["Mosul",43.13,36.34,"eu",3,true],["Erbil",44.01,36.19,"eu",2,true],["Port Said",32.3,31.26,"eu",2,true],["Suez",32.55,29.97,"eu",2,true],["Cairo",31.24,30.04,"eu",3,true],["Tehran",51.43,35.69,"cf",3,true],["Isfahan",51.68,32.65,"cf",3,true],["Shiraz",52.54,29.59,"cf",3,true],["Tabriz",46.29,38.08,"cf",3,true],["Ahvaz",48.68,31.32,"cf",3,true],["Kermanshah",47.07,34.32,"cf",3,true],["Hamadan",48.51,34.8,"cf",2,false],["Qom",50.88,34.64,"cf",2,false],["Yazd",54.37,31.9,"cf",2,false],["Mashhad",59.61,36.3,"cf",3,true],["Kerman",57.07,30.29,"cf",2,false],["Zahedan",60.86,29.5,"cf",2,false],["Bandar Abbas",56.28,27.18,"cf",3,true],["Bushehr",50.84,28.92,"cf",3,true],["Herat",62.2,34.35,"cf",2,true]];
  const ARMY_GROUPS=[["britannia","Baghdad","heavy",4,"cornelia"],["britannia","Baghdad","rocket",3,"guilford"],["britannia","Baghdad","assault",3,"darlton"],["britannia","Basra","heavy",3,"suzaku"],["britannia","Basra","assault",3,"jeremiah"],["britannia","Kuwait City","medium",3,"gino"],["britannia","Kuwait City","rocket",2,null],["britannia","Dammam","heavy",3,"bismarck"],["britannia","Dammam","assault",3,"villetta"],["britannia","Tabuk","medium",3,"nonette"],["britannia","Tabuk","raider",2,null],["britannia","Riyadh","heavy",3,"schneizel"],["britannia","Riyadh","siege",2,null],["britannia","Buraydah","medium",3,null],["britannia","Hail","raider",2,null],["britannia","Jeddah","medium",3,"monica"],["britannia","Jeddah","assault",2,null],["britannia","Muscat","medium",3,"anya"],["britannia","Muscat","rocket",2,null],["britannia","Dubai","raider",2,null],["britannia","Abu Dhabi","medium",2,null],["britannia","Aden","medium",2,null],["britannia","Sana'a","assault",2,null],["eu","Mosul","heavy",4,"akito"],["eu","Mosul","rocket",3,"yukiya"],["eu","Erbil","heavy",3,"ryo"],["eu","Erbil","assault",3,"ayano"],["eu","Aleppo","medium",3,"leila"],["eu","Aleppo","rocket",3,"smilas"],["eu","Damascus","heavy",4,"oscar"],["eu","Damascus","assault",3,"klaus"],["eu","Homs","medium",3,"anna"],["eu","Homs","support",2,null],["eu","Amman","medium",3,"fernando"],["eu","Amman","raider",2,null],["eu","Latakia","medium",2,"marirrosa"],["eu","Beirut","assault",2,null],["eu","Aqaba","medium",2,null],["eu","Suez","medium",2,null],["eu","Cairo","assault",2,null],["cf","Kermanshah","heavy",4,"xingke"],["cf","Kermanshah","rocket",3,"xianglin"],["cf","Ahvaz","heavy",4,"honggu"],["cf","Ahvaz","assault",3,"cao"],["cf","Tabriz","heavy",3,"gaohai"],["cf","Tabriz","rocket",2,null],["cf","Tehran","heavy",3,"zhaohao"],["cf","Tehran","siege",2,null],["cf","Isfahan","heavy",3,"leifeng"],["cf","Isfahan","assault",3,"meiling"],["cf","Shiraz","medium",3,"lifeng"],["cf","Shiraz","rocket",2,null],["cf","Bushehr","medium",3,null],["cf","Bushehr","assault",2,null],["cf","Bandar Abbas","medium",3,"rakshata"],["cf","Bandar Abbas","raider",2,null],["cf","Mashhad","medium",3,null],["cf","Herat","raider",2,null],["cf","Yazd","rocket",2,null],["cf","Kerman","assault",2,null]];
  const PORTS={"Jeddah":3,"Dammam":3,"Kuwait City":2,"Doha":2,"Abu Dhabi":2,"Dubai":2,"Muscat":3,"Salalah":2,"Aden":3,"Latakia":3,"Beirut":2,"Haifa":2,"Aqaba":2,"Port Said":3,"Suez":3,"Bandar Abbas":3,"Bushehr":3};
  const FLEETS=[["britannia","Dammam","carrier_battleship",2],["britannia","Muscat","carrier_battleship",2],["britannia","Jeddah","carrier_battleship",1],["britannia","Kuwait City","portman_ii",2],["britannia","Doha","portman_ii",2],["britannia","Dubai","portman",2],["britannia","Aden","portman_ii",2],["britannia","Salalah","portman",2],["eu","Latakia","eu_carrier",2],["eu","Port Said","eu_carrier",1],["eu","Haifa","panzer_frosch_ii",2],["eu","Suez","panzer_frosch_ii",2],["eu","Aqaba","panzer_frosch",2],["cf","Bandar Abbas","cf_carrier",2],["cf","Bushehr","cf_carrier",1],["cf","Bushehr","shui_gun_ru_ii",2],["cf","Bandar Abbas","shui_gun_ru_ii",2]];
  const FUNDING={britannia:{credits:760,industry:430,science:76,sakuradite:42},
    eu:{credits:650,industry:380,science:72,sakuradite:38},
    cf:{credits:690,industry:405,science:74,sakuradite:40}};
  function geo(c,r){
    return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
      lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};
  }
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function nearest(g,p,valid,radius=9){
    let best=null,d=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!valid(t))continue;
        const n=E.distance(p,t,g);
        if(n<d){d=n;best=t;}
      }
    return best;
  }
  // Zagros and Alborz ridges, Asir, Hajar and northern Levant highlands.
  // Deliberate Iraqi-Khuzestan, Kermanshah and Shiraz passes stay traversable.
  const MOUNTAINS=[[35.9,34.9,1.7,2.4],[43.9,37.7,2.4,1.6],
    [47.9,35.7,1.1,2.0],[49.5,33.5,1.35,2.9],[51.6,31.6,1.2,2.5],
    [53.7,29.5,1.4,2.2],[55.5,27.7,1.4,1.4],[52.1,36.5,4.2,1],
    [57.1,35.0,2.4,1.9],[42.9,19.5,1.1,4.3],[57.4,23.6,1.35,1.8]];
  const FORESTS=[[35.7,35.0,1.1,1.7],[46.6,36.6,1.7,1.2],
    [51.8,36.7,3.4,0.9],[41.8,15.6,1.2,2.0]];
  const PASSES=[[46.9,34.35,0.85,0.75],[48.6,31.3,1.25,0.95],
    [51.6,30.5,0.8,0.65],[56.2,27.2,0.8,0.65]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p){
    const mountain=density(p,MOUNTAINS),pass=density(p,PASSES),forest=density(p,FORESTS);
    // Passes remove impenetrable terrain without erasing the Zagros foothills.
    if(mountain>.87&&pass<.38)return 'peak';
    if(mountain>.35&&pass<.75)return 'mountain';
    if(forest>.55&&p.lat>29)return 'forest';
    // Tigris-Euphrates lowlands, Mediterranean basin and Iranian Gulf plain.
    const mesopotamia=p.lon>42.4&&p.lon<49.1&&p.lat>29.2&&p.lat<36.6;
    const levant=p.lon<41&&p.lat>29;
    const khuzestan=p.lon>47.2&&p.lon<50.1&&p.lat>29.3&&p.lat<32.5;
    if(mesopotamia||levant||khuzestan)return 'plains';
    if(p.lat<30.1&&p.lon>35.5&&p.lon<60.5)return 'desert';
    if(p.lon>53&&p.lon<64&&p.lat>27&&p.lat<35.5)return 'desert';
    if(p.lon>40&&p.lon<48&&p.lat<31.5)return 'desert';
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
    return {ok:assigned>0,assigned,failed,reason:assigned?'':'No group unit can reach that hex'};
  }
  function create(player='eu',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported Area 18 faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'area-18',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,eu:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'area-18',key:'area18',title:'The Conquest of Area 18',
      phase:'three-way-war',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION};
    // Britannia uses compatible Britannian Elite Forces for this
    // scenario only. No global HQ, Conquest, or Japan access is changed.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu')),
      cf:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('cf')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    // Mediterranean–Suez–Red Sea–Arabian Sea–Persian Gulf routes remain open.
    const packed=root.AREA18_LAND_BITS || (typeof require==='function'?
      require('./area18-landmask.js'):null);
    const bits=typeof packed==='string'?packed:root.AREA18_LAND_BITS;
    if(!bits)throw Error('Area 18 shoreline mask was not loaded');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/8)throw Error('Area 18 shoreline mask is corrupt');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const land=!!(raw.charCodeAt(i>>3)&(128>>(i&7)));
      return {c,r,owner:null,terrain:land?landscape(p):'sea'};
    });
    for(const t of g.tiles)if(t.terrain!=='sea'&&
      E.adjacent(g,t).some(n=>n.terrain==='sea'))t.terrain='coast';
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Area 18 city '+name);
      const capital=name==='Riyadh'||name==='Damascus'||name==='Tehran';
      const shield=fort?400:120+60*tier;
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
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),10);
        if(!at)throw Error('Cannot deploy unit at '+name);
        const cmd=i===0?commander:null;
        const stack=i===0?3:2;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,name).units.push(u.id);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    const taken=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&!taken.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(n=>n.terrain==='sea').length-
          E.adjacent(g,a).filter(n=>n.terrain==='sea').length)[0];
      if(!at)throw Error('Cannot place naval port '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      taken.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!E.TYPES[type]?.naval)throw Error('Invalid Area 18 fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),10);
        if(!at)throw Error('Cannot deploy navy at '+name);
        fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
      }
      g.scenario.groups.push(fleet);
    }
    // The entire connected regional sea stays navigable for fleets.
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
    E.log(g,'Britannia holds Arabia and Mesopotamia, Europia United advances from the Levant, and the Chinese Federation attacks from Persia. All three powers are at war.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Area 18 theatre cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='area-18'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in Area 18.'};
    return null;
  }
  const api={id:'area-18',title:'The Conquest of Area 18',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  E.scenarios={...(E.scenarios||{}),area18:api,
    byId:{...(E.scenarios?.byId||{}),'area-18':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

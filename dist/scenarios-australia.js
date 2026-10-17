/* The War for Australia — 2018 alternate-history three-way continental war.
   Standalone 132 x 92 regional hex map: Australia, Bass Strait and Tasmania.
   No alliances, forced diplomacy, F.L.E.I.J.A., or scenario turn deadline. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=132,ROWS=92,SIDES=['britannia','cf','eu'];
  // Independently sampled 37-point GSHHG-i mixed shoreline, 20–80% land.
  const SHORE_BITS='AAAAAADMAAAAAAB+AAGQIAAAAAbAAgAAAAAAAAACDYAAAAAACgBAAAAAAAAAAAw0AAAAAAAAcAAAAAAAAAAADQAAAAAAAAQAAAAAAAAMAAAQAAAAAAAAAAACuAAAAUAAAAAAAAAAAAAAAGTgAAACAAAACAAAAAAAAAABCO0AAiAAAAAAAAAAAAAAABIAOAABAAAAAAAAAAAAAAAEAAEAAhAAAAAAAAAAAAAAAAAAMAAAgAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAADYIAAMAAggAAAAAAAAAAAAcIQAAQAAA4AAAAAAAAAAAAQB4AAAAAgCAAAAAAAAAAABwEAAAYAAACAAAAAAAAAAABAAAAAHAAgBAAAAAAAAAAABABAAADgBAAAAAAAAAAAAAXABAAAAIhAAAAAAAAAAAABYAAAAAAOCAAgAAAAAAAAAAMAAAAAABiAAQAAAAAAAAACAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAEAAAAAAAAAAAQAAAAAAAAAEAAAAAAAAAAAIAAAAAAAAAIAAAAAAAAAAAMAAAAAAAAAwAAAAAAAAAAABAAAAAAAAeAAAAAAAAAAAAAQAAAAAADgAAAAAAAAAAAAAEAAAAABAAAAAAAAAAAAAAAEAAAAACAAAAAAAAAAAAAAACAAAAAYAAAAAAAAAAAAAAACAAAABAAAAAAAAAAAAAAAABAAAADAAAAAAAAAAAAAAAABYAAACAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAIAAACAAAAAAAAAAAAAAAAACAAAEAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAMAANAAAAAAAAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAAAAEAAGAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAACAABAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAEAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAEAAAAAAAAAAAAAAAAAIAAACAAAAAB/YAAAAAAAAAIAAAAAAAACcAFwAAAAAAAAQAAACAAAAYAAAMAAAAAAAAQAAAEAAADAAAAAAwAAAAABAAAAAAAACAAAAAAgAAAAAAAAAAIAA8sAAAABDQAAAAAAAAAAIAEAAAAAAAkIAAAAAEAAAAEA4AAAAAAAo4AAAAAIAAAAB/AAAAAAAARwAAAAAAAAAAAAAAAAAAAABIAAAAAQAAAAAAAAAAAAAADVAAAAAQAAAAAAAAAAAAAADAgAAAAgAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAgAAAAAAAAAAAAAAAAIAEA/AAAAAAAAAAAAAAAAADQPBAAAAAAAAAAAAAAAAAAAGzMAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAwAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABnQAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAABAQAAAAAAAAAAAAAAAAAAACAgAAAAAAAAAAAAAAAAAAAAhgAAAAAAAAAAAAAAAAAAAA2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const BOUNDS={west:110,east:156,north:-9,south:-46};
  const K=Math.cos(27.5*Math.PI/180);
  const PROJECTION={centerLon:133,centerLat:-27.5,angle:0,
    uMin:-23*K,uMax:23*K,vMin:-18.5,vMax:18.5};
  // Historical coordinates; alternate political borders and military factories.
  const CITIES=[["Sydney",151.21,-33.87,"britannia",3,true],["Melbourne",144.96,-37.81,"britannia",3,true],["Brisbane",153.03,-27.47,"britannia",3,true],["Newcastle",151.78,-32.93,"britannia",2,false],["Wollongong",150.89,-34.43,"britannia",2,false],["Canberra",149.13,-35.28,"britannia",3,true],["Gold Coast",153.43,-28.02,"britannia",2,false],["Toowoomba",151.95,-27.56,"britannia",2,false],["Coffs Harbour",153.11,-30.3,"britannia",2,false],["Dubbo",148.61,-32.25,"britannia",2,false],["Wagga Wagga",147.37,-35.12,"britannia",2,false],["Albury",146.91,-36.08,"britannia",2,false],["Bendigo",144.28,-36.76,"britannia",2,false],["Geelong",144.36,-38.15,"britannia",2,false],["Cairns",145.77,-16.92,"britannia",3,true],["Townsville",146.82,-19.26,"britannia",2,false],["Rockhampton",150.51,-23.38,"britannia",2,false],["Mackay",149.19,-21.14,"britannia",2,false],["Hobart",147.32,-42.88,"britannia",2,true],["Launceston",147.14,-41.43,"britannia",2,false],["Darwin",130.84,-12.46,"cf",3,true],["Katherine",132.27,-14.46,"cf",2,false],["Tennant Creek",134.19,-19.65,"cf",2,false],["Alice Springs",133.88,-23.7,"cf",3,true],["Nhulunbuy",136.77,-12.18,"cf",2,false],["Jabiru",132.84,-12.67,"cf",1,false],["Kununurra",128.74,-15.77,"cf",2,false],["Broome",122.23,-17.96,"cf",2,true],["Derby",123.62,-17.3,"cf",2,false],["Mount Isa",139.49,-20.73,"cf",3,true],["Normanton",141.07,-17.67,"cf",2,false],["Weipa",141.88,-12.63,"cf",2,false],["Cooktown",145.25,-15.47,"cf",2,true],["Port Hedland",118.58,-20.31,"cf",2,true],["Perth",115.86,-31.95,"eu",3,true],["Bunbury",115.64,-33.33,"eu",2,false],["Albany",117.89,-35.02,"eu",2,false],["Geraldton",114.61,-28.77,"eu",2,false],["Kalgoorlie",121.47,-30.75,"eu",3,true],["Esperance",121.89,-33.86,"eu",2,false],["Karratha",116.85,-20.74,"eu",2,true],["Carnarvon",113.66,-24.88,"eu",2,false],["Meekatharra",118.48,-26.59,"eu",1,false],["Adelaide",138.6,-34.93,"eu",3,true],["Port Augusta",137.76,-32.49,"eu",2,false],["Port Lincoln",135.86,-34.73,"eu",2,false],["Coober Pedy",134.75,-29.01,"eu",2,false],["Ceduna",133.66,-32.12,"eu",2,true]];
  const ARMY_GROUPS=[["britannia","Sydney","heavy",3,"cornelia"],["britannia","Sydney","rocket",2,"cecile"],["britannia","Brisbane","heavy",3,"guilford"],["britannia","Brisbane","assault",2,"gino"],["britannia","Cairns","assault",3,"suzaku"],["britannia","Townsville","medium",3,"jeremiah"],["britannia","Rockhampton","medium",2,"villetta"],["britannia","Melbourne","heavy",3,"bismarck"],["britannia","Melbourne","siege",2,"darlton"],["britannia","Canberra","medium",3,"oldrin"],["britannia","Wagga Wagga","medium",2,null],["britannia","Hobart","medium",2,null],["britannia","Newcastle","light",2,null],["britannia","Geelong","support",2,null],["cf","Darwin","heavy",3,"xingke"],["cf","Darwin","rocket",2,"xianglin"],["cf","Katherine","medium",3,"chaojielun"],["cf","Alice Springs","heavy",3,"cao"],["cf","Alice Springs","siege",2,null],["cf","Mount Isa","assault",3,"honggu"],["cf","Mount Isa","rocket",2,"huangqian"],["cf","Weipa","medium",2,"ren"],["cf","Broome","medium",3,"sawasaki"],["cf","Port Hedland","heavy",3,"vritra"],["cf","Kununurra","light",2,null],["cf","Normanton","support",2,null],["cf","Cooktown","assault",2,null],["eu","Perth","heavy",3,"akito"],["eu","Perth","rocket",2,"yukiya"],["eu","Kalgoorlie","heavy",3,"leila"],["eu","Kalgoorlie","assault",2,"ryo"],["eu","Adelaide","heavy",3,"smilas"],["eu","Adelaide","rocket",2,"oscar"],["eu","Port Augusta","assault",3,"ayano"],["eu","Coober Pedy","medium",3,"anna"],["eu","Karratha","medium",3,"klaus"],["eu","Karratha","support",2,null],["eu","Albany","medium",2,null],["eu","Esperance","assault",2,null],["eu","Geraldton","light",2,null],["eu","Ceduna","siege",2,null],["cf","Mount Isa","heavy",3,null],["cf","Alice Springs","rocket",3,null],["cf","Port Hedland","assault",3,null],["cf","Kununurra","medium",3,null],["eu","Adelaide","heavy",3,null],["eu","Ceduna","medium",3,null],["eu","Karratha","rocket",3,null],["eu","Kalgoorlie","assault",3,null]];
  const PORTS={"Sydney":3,"Melbourne":3,"Brisbane":3,"Newcastle":2,"Wollongong":2,"Gold Coast":2,"Coffs Harbour":2,"Geelong":2,"Cairns":3,"Townsville":2,"Rockhampton":2,"Mackay":2,"Hobart":2,"Darwin":3,"Nhulunbuy":2,"Broome":3,"Derby":2,"Normanton":2,"Weipa":2,"Cooktown":2,"Port Hedland":3,"Perth":3,"Bunbury":2,"Albany":2,"Geraldton":2,"Esperance":2,"Karratha":3,"Carnarvon":2,"Adelaide":3,"Port Augusta":2,"Port Lincoln":2,"Ceduna":2};
  const FLEETS=[["britannia","Sydney","carrier_battleship",2],["britannia","Brisbane","carrier_battleship",2],["britannia","Melbourne","carrier_battleship",1],["britannia","Cairns","portman_ii",3],["britannia","Townsville","portman_ii",2],["britannia","Hobart","portman",2],["cf","Darwin","cf_carrier",2],["cf","Broome","cf_carrier",1],["cf","Port Hedland","cf_carrier",1],["cf","Weipa","shui_gun_ru_ii",3],["cf","Darwin","shui_gun_ru_ii",2],["cf","Cooktown","shui_gun_ru",2],["eu","Perth","eu_carrier",2],["eu","Adelaide","eu_carrier",2],["eu","Karratha","eu_carrier",1],["eu","Geraldton","panzer_frosch_ii",2],["eu","Albany","panzer_frosch_ii",2],["eu","Ceduna","panzer_frosch",2],["cf","Nhulunbuy","cf_carrier",1],["eu","Albany","eu_carrier",1]];
  // Fixed turn-income equalization keeps the populated east valuable while
  // preserving two viable competitors even on the long inland front.
  const FUNDING={britannia:{credits:535,industry:305,science:55,sakuradite:30},
    cf:{credits:580,industry:350,science:58,sakuradite:32},
    eu:{credits:595,industry:365,science:59,sakuradite:33}};
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
  // Inland aridity is concentrated in the Great Sandy, Gibson, Simpson,
  // Great Victoria and Tanami deserts, with navigable low-cost corridors.
  const MOUNTAINS=[[145.5,-18,3.0,3.4],[148.7,-27.3,2.5,6.4],
    [148.8,-35.9,2.9,3.4],[139.3,-30.7,2.2,2.5],[118.9,-23.6,3.1,2.1]];
  const FORESTS=[[146,-17.4,2.8,3.5],[151.2,-29.2,2.7,6.0],
    [147,-37.2,4.5,3.1],[146.8,-42.1,2.3,1.5],
    [116.0,-34,2.6,2.3],[130.7,-12.8,5.0,2.7]];
  const DESERTS=[[124,-23,5.4,6.4],[130,-27,6.0,6.5],
    [137,-25,3.2,5.4],[121,-29.1,4.6,4.5]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS),
      desert=density(p,DESERTS);
    if(mountain>.58)return 'mountain';
    if(forest>.46)return 'forest';
    if(desert>.35)return 'desert';
    return mountain>.31||forest>.29?'forest':'plains';
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
  function create(player='britannia',difficulty='normal',seed=201801){
    if(!SIDES.includes(player))throw Error('Unsupported War for Australia faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'war-for-australia',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,cf:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'war-for-australia',key:'australia',title:'The War for Australia',
      phase:'three-way-war',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION};
    // Elite rosters remain faction-scoped and use the shared regional conversion.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    // Full continental coastal sea network; Tasmania is a separate landmass.
    const geographic=root.AUSTRALIA_GEOGRAPHY || (typeof require==='function'?
      require('./australia-landmask.js'):null);
    const bits=geographic?.bits||root.AUSTRALIA_LAND_BITS;
    if(!bits)throw Error('Australian shoreline mask was not loaded');
    const raw=geographic?.binary || (typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1'));
    if(raw.length!==COLS*ROWS/8)throw Error('Australian shoreline mask is corrupt');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const land=!!(raw.charCodeAt(i>>3)&(128>>(i&7)));
      return {c,r,owner:null,terrain:land?landscape(p,c,r):'sea'};
    });
    const shore=typeof atob==='function'?atob(SHORE_BITS):
      Buffer.from(SHORE_BITS,'base64').toString('latin1');
    if(shore.length!==COLS*ROWS/8)throw Error('Australia coastline reference corrupt');
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const i=t.r*COLS+t.c;
      if((shore.charCodeAt(i>>3)&(128>>(i&7)))&&
          E.adjacent(g,t).some(n=>n.terrain==='sea'))t.terrain='coast';
    }
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Australia city '+name);
      const capital=['Sydney','Melbourne','Brisbane','Darwin','Perth','Adelaide'].includes(name);
      const shield=fort?400:120+60*tier;
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?52:tier===3?33:tier===2?19:11)*(owner==='britannia'?1.18:1)),
        industry:Math.round((capital?26:7*tier)*(owner==='britannia'?1.15:1)),
        science:Math.max(1,Math.round((1+tier)*.85)),producedTurn:0});
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
      if(!E.TYPES[type]?.naval)throw Error('Invalid Australia fleet type '+type);
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
    // Elite uses the same map with faction-specific elite formations.
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
          if(difficulty!=='hard'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Britannia holds the east, China advances south from Darwin, and Europia United contests the west. All three are hostile.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Australian cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='war-for-australia'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in Australia.'};
    return null;
  }
  const api={id:'war-for-australia',title:'The War for Australia',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,land:'australia'},
    elite:true,
    ai:{doctrine:'europe'},
    text:{
      era:"Australia · Alternate 2018",
      intro:"Britannia holds the east, China the north, and Europia the west. Three-way continental and naval war. Conquer every rival city.",
      diplomacy:"All three powers are enemies from turn 1. No alliances, scripted diplomacy, or turn limit.",
      elite:"Elite Australia: rivals gain 60% extra turn income and veteran three-frame land formations; all sides use their established faction units and commander rosters.",
      focus:{
        britannia:"Sydney",
        cf:"Darwin",
        eu:"Perth"
      }
    },
    blurbs:{
      britannia:"Hold Sydney, Melbourne, Brisbane and Australia’s eastern industrial heartland. Counter northern advances and Western amphibious landings.",
      cf:"Push south from Darwin through the Outback, fight for Cape York, and launch amphibious assaults on the eastern and western coasts.",
      eu:"Defend Perth and Adelaide, exploit the southern coastal corridor, and launch carrier-led landings to outflank eastern strongholds."
    }};
  E.scenarios={...(E.scenarios||{}),australia:api,
    byId:{...(E.scenarios?.byId||{}),'war-for-australia':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

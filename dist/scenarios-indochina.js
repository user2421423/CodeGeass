/* Defense of Indochina — Britannia holds the Southeast Asian frontier against
   China's three-pronged invasion, then counterattacks into Federation territory.
   Reuses the original conquest-indochina ID, 120 × 104 GSHHS-derived shoreline,
   independent capturable ports and total-city conquest victory. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=120,ROWS=104,SIDES=['britannia','cf'];
  // Reference GSHHG-i coastline: 37 hex-footprint samples and 20–80% land.
  const SHORE_BITS='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAIABAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAIAAwAAAAAAAAAAAAAAAAEF7AAAAAAAAAAAAAAAAAKeAAAAAAAAAAAAAAAAAAFwAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAACAIAvAAAAAAAAAAAAAAAPyADCAAAAAAAAAAAAAABgfB8AAAAAAAAAAAAAAACABCAAAAAAAAAAAAAAAAEACMAAAAAAAAAAAAAAAA4AAMAAAAAAAAAAAAAAABQAAIAAAAAAAAAAAAAAABAAAEAAAAAAAAAAAAAAACAAAoAAAAAAAAAAAAAAACAAACAAAAAAAAAAAAAAAYAADlAAAAAAAAAAAAAAAQAAIAgAAAAAAAAAAAAAAgAAwBAAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAACAAAAAAAAAAAAAAAAAAABAIAAAAAAAAAAAAAAAAABBgAAAAAAAAAAAAAAAIAANAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAABAAAAAAAAAAEAAAAAAAABAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAEAAAAAAAAAAAAAAAAAAAEAAAAAgAAAEAAAAAAAAAYQAAAAAAAACAAAAAAAAAgQAAAAAAAAAgAAAAAAAAAQAAAAAAAAAQAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAEAAAAAAAAAIAAAAAAAAACAAAAAAAAAIAAAAAAAAACAAAAAAAAAAAAAAAAAAAAgAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAEAAAAAAAAAAQAAAAAAAACAAAAAAAQAAIAAAAAAAAAAAAAAAAgAAAAAAAAAAABAAAAAAAAAAIAAAAAAAACAAAAAAAQAAAAAAAAAAAAACIAAAAQAAAAAAAAAAAAAEIAAwAQAAIAAAAAAAAAQAAAAQAIAAEAAAAAAAAAQEIAAcAQAAAAAAAAAAAAgEP4AEAAAAIAAAAAAAABwAAMADAAAAIAAAAAAAACQEACAAAAAAIAAAAAAAAAQAADgAAAAAAAAAAAAAAAQIAAQACAAAIAAAAAAAABoAAAQAAAAAQAAAAAAAABIQAAIAIAAAQAAAAAAAAAAAAAIAEAABgAAAAAAAAAIAAAFgMAADAAAAAAAAAAQgAACgIAAIAAAAAAAAABQgAAAgCAAQAAAAAAAAAAhAAABcGADAAAAAAAAAAARAAAAJBA8AAAAAAAAAAAiAAAAZgZAAAAAAAAAAABQAAAAAIDAAAAAAAAAAAACAAAAAQCAAAAAAAAAAAAQEAAAAQAAAAAAAAAAAAAgEAAAAAIAAAAAAAAAAAAhYAAAAQYAAAAAAAAAAABAIAAAAjAAAAAAAAAAAAAAEAAAACAAAAAAAAAAAABAAAAAAsAAAAAAAAAAAABAAAAAAYAAAAAAAAAAAABwCAAAAAAAAAAAAAAAAAAoBAAAAAAAAAAAAAAAAABMAAAAAAAAAAAAAAAACAAiAAAAAAAAAAAAAAAAAAABBAAAAAAAAAAAAAAAA';
  const BOUNDS={west:96.2,east:117.2,north:27,south:7.5};
  const K=Math.cos(17.25*Math.PI/180);
  const DLON=(BOUNDS.east-BOUNDS.west)/COLS,DLAT=(BOUNDS.north-BOUNDS.south)/ROWS;
  // Match geo()/locate(): each tactical hex samples the centre of its
  // geographic cell. The regional vector underlay must use these identical
  // half-cell bounds (including the odd-row hex offset), not viewport edges.
  // The atlas uses the same centre-sampled transform as the tactical grid.
  const PROJECTION={centerLon:106.7,centerLat:17.25,angle:0,
    uMin:(BOUNDS.west+DLON/2-106.7)*K,uMax:(BOUNDS.east-DLON/2-106.7)*K,
    vMin:BOUNDS.south+DLAT/2-17.25,vMax:BOUNDS.north-DLAT/2-17.25};
  // Land formations and factories are alternate history; city coordinates reflect real settlements.
  // China's superior land strength counters Britannia's deep coastal economy and carrier fleet.
  const CITIES=[["Guangzhou",113.26,23.13,"cf",3,true],["Nanning",108.32,22.82,"cf",3,true],["Kunming",102.83,25.04,"cf",3,true],["Liuzhou",109.41,24.33,"cf",2],["Beihai",109.12,21.48,"cf",2],["Fangchenggang",108.35,21.62,"cf",2],["Baise",106.62,23.9,"cf",2],["Wenshan",104.24,23.37,"cf",2],["Mengzi",103.39,23.37,"cf",2],["Jinghong",100.8,22.01,"cf",1],["Hanoi",105.83,21.03,"cf",3,true],["Haiphong",106.68,20.86,"cf",2,true],["Lao Cai",103.97,22.49,"cf",2],["Lang Son",106.76,21.85,"cf",2],["Cao Bang",106.25,22.66,"cf",1],["Dien Bien Phu",103.02,21.39,"cf",2],["Phongsali",102.1,21.68,"cf",1],["Luang Prabang",102.13,19.89,"cf",2],["Haikou",110.35,20.02,"cf",2],["Sanya",109.51,18.25,"cf",2],["Vinh",105.69,18.68,"britannia",2,true],["Dong Hoi",106.6,17.46,"britannia",2,true],["Hue",107.59,16.46,"britannia",2,true],["Da Nang",108.22,16.05,"britannia",3,true],["Quy Nhon",109.22,13.78,"britannia",2],["Nha Trang",109.2,12.24,"britannia",2],["Da Lat",108.44,11.94,"britannia",2],["Ho Chi Minh City",106.7,10.82,"britannia",3,true],["Can Tho",105.78,10.04,"britannia",2],["Vientiane",102.62,17.97,"britannia",3,true],["Thakhek",104.83,17.4,"britannia",2,true],["Savannakhet",104.75,16.55,"britannia",2,true],["Pakse",105.78,15.12,"britannia",2],["Phnom Penh",104.92,11.56,"britannia",3,true],["Siem Reap",103.86,13.36,"britannia",2],["Battambang",103.2,13.1,"britannia",2],["Sihanoukville",103.5,10.63,"britannia",2],["Bangkok",100.5,13.75,"britannia",3,true],["Chiang Mai",98.99,18.79,"britannia",2,true],["Chiang Rai",99.83,19.91,"britannia",2],["Khon Kaen",102.83,16.43,"britannia",2,true],["Udon Thani",102.79,17.41,"britannia",2],["Nakhon Ratchasima",102.1,14.97,"britannia",2],["Trat",102.51,12.24,"britannia",1]];
  const ARMY_GROUPS=[["cf","Nanning","heavy",5,"xingke"],["cf","Nanning","assault",4,"cao"],["cf","Nanning","rocket",3,"honggu"],["cf","Hanoi","medium",5,"xianglin"],["cf","Hanoi","assault",4,"chengzhong"],["cf","Hanoi","siege",3],["cf","Haiphong","assault",2],["cf","Lang Son","medium",4],["cf","Lao Cai","medium",2],["cf","Dien Bien Phu","heavy",4,"ren"],["cf","Dien Bien Phu","light",4],["cf","Luang Prabang","assault",5,"chaojielun"],["cf","Phongsali","scout",3],["cf","Kunming","heavy",4],["cf","Kunming","rocket",2],["cf","Wenshan","medium",5],["cf","Mengzi","support",2],["cf","Baise","raider",2],["cf","Guangzhou","medium",2],["britannia","Vinh","heavy",4,"cornelia"],["britannia","Vinh","rocket",2,"cecile"],["britannia","Vinh","assault",2],["britannia","Dong Hoi","medium",3,"guilford"],["britannia","Hue","heavy",3,"darlton"],["britannia","Hue","support",2],["britannia","Da Nang","assault",3,"suzaku"],["britannia","Da Nang","rocket",2],["britannia","Vientiane","heavy",4,"bismarck"],["britannia","Vientiane","medium",2],["britannia","Thakhek","medium",3,"villetta"],["britannia","Savannakhet","assault",2],["britannia","Chiang Mai","medium",3,"oldrin"],["britannia","Chiang Rai","scout",2],["britannia","Khon Kaen","medium",2],["britannia","Udon Thani","light",2],["britannia","Bangkok","heavy",3,"jeremiah"],["britannia","Bangkok","rocket",2],["britannia","Phnom Penh","medium",3],["britannia","Ho Chi Minh City","heavy",2,"kewell"],["britannia","Nha Trang","light",2],
    // Federation breakthroughs are built around three supported operational axes.
    ["cf","Hanoi","heavy",2],["cf","Hanoi","rocket",2],
    ["cf","Nanning","assault",2],["cf","Dien Bien Phu","siege",2],
    ["cf","Luang Prabang","rocket",2],["cf","Kunming","medium",2],
    // Britannian forward lines, defended passes, and mobile second-echelon reserves.
    ["britannia","Vinh","medium",2],["britannia","Dong Hoi","heavy",2],
    ["britannia","Hue","rocket",2],["britannia","Da Nang","heavy",2],
    ["britannia","Vientiane","rocket",2],["britannia","Thakhek","heavy",2],
    ["britannia","Savannakhet","heavy",3],["britannia","Chiang Mai","rocket",2],
    ["britannia","Nakhon Ratchasima","heavy",3],
    ["britannia","Phnom Penh","rocket",2]];
  const PORTS={"Beihai":2,"Fangchenggang":2,"Haiphong":3,"Haikou":2,"Sanya":2,"Dong Hoi":1,"Da Nang":3,"Quy Nhon":2,"Nha Trang":2,"Ho Chi Minh City":3,"Sihanoukville":2,"Bangkok":3,"Trat":1};
  const FLEETS=[["britannia","Da Nang","carrier_battleship",2],["britannia","Ho Chi Minh City","carrier_battleship",2],["britannia","Sihanoukville","carrier_battleship",1],["britannia","Bangkok","carrier_battleship",1],["britannia","Nha Trang","carrier_battleship",1],["britannia","Da Nang","portman_ii",3],["britannia","Ho Chi Minh City","portman_ii",3],["britannia","Bangkok","portman",2],["britannia","Quy Nhon","portman",2],["cf","Haiphong","cf_carrier",1],["cf","Beihai","cf_carrier",1],["cf","Haikou","cf_carrier",1],["cf","Haiphong","shui_gun_ru_ii",2],["cf","Sanya","shui_gun_ru",2]];
  // Named axes are tactical preferences, not scripted attacks or extra movement.
  // AI only applies them to already reachable enemy objectives; captured targets
  // fall out of the sequence, enabling coordinated exploitation.
  const OFFENSIVE_AXES={cf:{
    'Red River':['Vinh','Dong Hoi','Hue','Da Nang','Quy Nhon','Nha Trang','Ho Chi Minh City'],
    'Mekong Valley':['Vientiane','Thakhek','Savannakhet','Pakse','Phnom Penh','Can Tho'],
    'Thai Highlands':['Chiang Rai','Chiang Mai','Udon Thani','Khon Kaen','Nakhon Ratchasima','Bangkok']
  }};
  const CF_ORIGIN_AXIS={
    Nanning:'Red River',Hanoi:'Red River',Haiphong:'Red River',
    'Lang Son':'Red River','Cao Bang':'Red River',Wenshan:'Red River',
    Guangzhou:'Red River',Baise:'Red River','Lao Cai':'Red River',
    Kunming:'Thai Highlands',Mengzi:'Thai Highlands',Jinghong:'Thai Highlands',
    'Dien Bien Phu':'Mekong Valley',Phongsali:'Mekong Valley',
    'Luang Prabang':'Mekong Valley'
  };
  // A small AI city screen is released as the danger moves away; these
  // are not permanently immobile formations or a limit on counterattacks.
  const DEFENSE_POSTS=[
    ['Vinh',2,8],['Vientiane',2,8],['Dong Hoi',1,7],
    ['Hue',1,7],['Da Nang',1,7],['Thakhek',1,7],
    ['Savannakhet',1,7],['Chiang Mai',1,7],['Khon Kaen',1,7]
  ];
  const FUNDING={"britannia":{"credits":600,"industry":320,"science":56,"sakuradite":26},
    "cf":{"credits":630,"industry":355,"science":58,"sakuradite":25}};
  function geo(c,r){
    return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
      lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};
  }
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function nearest(g,p,valid,radius=9){return E.nearestTile(g,p,valid,radius);}
  const MOUNTAINS=[[103.8,24.5,2.3,1.7],[105.1,21.5,1.1,1.6],[105.1,19.1,.9,2.4],[106.8,16.5,.75,2.3],[107.3,13.8,1.05,2.6],[99.6,19,1.5,3.1],[101,21.8,1.4,2.1]];
  const FORESTS=[[103.3,18.9,2.4,3.7],[106.3,14.9,3,3],[104.2,12.3,2.6,2],[98.9,16.4,1.4,3.8]];
  const LOWLANDS=[[105.9,21,.9,.65],[106.6,10.7,1.6,1.1],[104.9,11.6,1.5,1.2],[102.8,17.6,.65,2.5],[105.6,15.5,.9,2]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS),river=density(p,LOWLANDS);
    return river>.67?'plains':mountain>.63?'mountain':
      mountain>.29||forest>.53||((c*29+r*17)%31<4&&p.lat>16)
        ?'forest':'plains';
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
  function create(player='britannia',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported Indochina faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'indochina',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'conquest-indochina',key:'indochina',title:'The Conquest of Indochina',
      phase:'southward-invasion',aiDoctrine:'europe',groups:[],funding:{},
      offensiveAxes:OFFENSIVE_AXES,defensePosts:DEFENSE_POSTS,
      bounds:BOUNDS,projection:PROJECTION,
      rivers:{Mekong:[[100.3,21.3],[101.8,19.9],[102.7,18.1],[104.7,16.6],[105.1,15.5],[105.8,13.8],[105.1,11.6],[106.6,10.1]],Red:[[103.8,22.4],[104.8,21.6],[105.9,21],[106.8,20.8]]}};
    // Both sides use their own established faction Elite Force rosters.
    // Other scenarios, global HQ and Conquest remain unchanged.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      cf:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('cf')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    // Connected waters include the Gulf of Thailand, Gulf of Tonkin and South China Sea.
    // Every shipyard launches at an adjacent navigable hex.
    const packed=root.INDOCHINA_LAND_BITS || (typeof require==='function'?
      require('./indochina-landmask.js'):null);
    const bits=typeof packed==='string'?packed:root.INDOCHINA_LAND_BITS;
    if(!bits)throw Error('Indochina shoreline mask was not loaded');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/8)throw Error('Indochina shoreline mask is corrupt');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const land=!!(raw.charCodeAt(i>>3)&(128>>(i&7)));
      return {c,r,owner:null,terrain:land?landscape(p,c,r):'sea'};
    });
    const shore=typeof atob==='function'?atob(SHORE_BITS):
      Buffer.from(SHORE_BITS,'base64').toString('latin1');
    if(shore.length!==COLS*ROWS/8)throw Error('Indochina shore mask corrupt');
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const i=t.r*COLS+t.c;
      if((shore.charCodeAt(i>>3)&(128>>(i&7)))&&
          E.adjacent(g,t).some(n=>n.terrain==='sea'))t.terrain='coast';
    }
    // Separate open ocean from isolated inland water in the authoritative
    // shoreline mask. Shipyards and starting fleets use this sea basin only.
    const visitedSea=new Set(),openSea=new Set(),basinSizes=[];
    for(const start of g.tiles){
      if(start.terrain!=='sea'||visitedSea.has(E.key(start)))continue;
      const queue=[start],component=new Set([E.key(start)]);
      let edge=false;
      visitedSea.add(E.key(start));
      for(let i=0;i<queue.length;i++){
        const here=queue[i];
        if(here.c===0||here.c===COLS-1||here.r===0||here.r===ROWS-1)edge=true;
        for(const n of E.adjacent(g,here)){
          const key=E.key(n);
          if(n.terrain!=='sea'||visitedSea.has(key))continue;
          visitedSea.add(key);component.add(key);queue.push(n);
        }
      }
      // The Andaman-side sea and South China Sea are genuinely separate
      // basins. Both remain open water, but no land shortcut joins them.
      if(edge&&component.size>=100){
        for(const key of component)openSea.add(key);
        basinSizes.push(component.size);
      }
    }
    if(!basinSizes.length)throw Error('Indochina navigable sea is disconnected');
    const navigable=t=>t.terrain==='sea'&&openSea.has(E.key(t));
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Cities stay at the nearest actual land hex to their coordinates.
      // PortAt is a separately captured coastal tile: inland Bangkok and
      // Ho Chi Minh City must not be teleported to a beach to get a harbour.
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Indochina city '+name);
      const capital=name==='Bangkok'||name==='Nanning';
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
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),10);
        if(!at)throw Error('Cannot deploy unit at '+name);
        const cmd=i===0?commander:null;
        const stack=i===0?3:2;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,name).units.push(u.id);
        if(side==='cf')u.invasionGroup=CF_ORIGIN_AXIS[name]||null;
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    const taken=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const at=nearest(g,s,t=>navigable(t)&&!taken.has(E.key(t))&&
        E.adjacent(g,t).some(n=>n.terrain!=='sea'),14);
      if(!at)throw Error('No open-sea coastal port near '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      taken.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!E.TYPES[type]?.naval)throw Error('Invalid Indochina fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s.portAt||s,t=>navigable(t)&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),12);
        if(!at)throw Error('Cannot deploy navy at '+name);
        fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
      }
      g.scenario.groups.push(fleet);
    }
    // The entire connected regional sea stays navigable for fleets.
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]={"britannia":{"credits":1200,"industry":500,"science":112,"sakuradite":52},"cf":{"credits":1260,"industry":500,"science":116,"sakuradite":50}}[side][resource];
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>v!==player))
        for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
          E.addDifficultyFrames(u,difficulty);
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,player==='cf'
      ? 'The Federation advances on the Red River, Mekong and northern Thai axes. Coordinate your Army Groups, overcome Britannian reserves and capture every enemy city.'
      : 'The Federation attacks on the Red River, Mekong and northern Thai axes. Britannia must hold its layered frontier, concentrate reserves, then take every Chinese city.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    const controlled=g.stations.filter(s=>s.owner===side).length;
    return (side==='britannia'?'Defend Southeast Asia, then counterattack: ':
      'Break the Britannian frontier: ')+
      'control every Indochina theatre city ('+controlled+'/'+CITIES.length+').';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='conquest-indochina'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Indochina theatre.'};
    return null;
  }
  const api={id:'conquest-indochina',title:'The Conquest of Indochina',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={terrainCosts:{mountain:2},map:{centreSampled:true,coastBuffer:0,overlays:['indochinaRivers']},
    elite:true,
    ai:{doctrine:'europe',guards:'indochina',routeBias:'cf'},
    text:{terrain:'Mountains cost 2 movement; plains and marked passes cost 1. Float units ignore the extra terrain cost.',
      era:"Indochina · Alternate 2017",
      intro:"Defense of Indochina: Britannia must withstand a three-axis Federation land offensive before advancing into Chinese-controlled northern Vietnam and southern China. Win only by capturing all 44 cities; there is no turn limit.",
      diplomacy:"Britannia and the Federation are hostile from turn 1. Cities, independent naval ports and army concentrations change hands normally. F.L.E.I.J.A. is disabled.",
      elite:"Elite Indochina applies the established faction Elite Force conversion, stronger rival commanders and difficulty scaling. Carriers remain conventional.",
      focus:{
        britannia:"Vinh",
        cf:"Hanoi"
      }
    },
    blurbs:{
      britannia:"Hold Vinh and Vientiane against the first offensives. Use the Dong Hoi–Hue–Da Nang line, Thai highlands and reserves at Savannakhet and Nakhon Ratchasima; then counterattack Hanoi, Nanning and Kunming.",
      cf:"Concentrate offensives along the Red River, Mekong Valley and northern Thai highlands. Break the forward fortifications, isolate Britannian reserves and capture every southern city."
    }};
  E.scenarios={...(E.scenarios||{}),indochina:api,
    byId:{...(E.scenarios?.byId||{}),'conquest-indochina':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

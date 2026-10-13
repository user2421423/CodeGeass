/* Operation Stonehenge — Britannia's fully seaborne invasion of E.U.-held Western Europe.
   British Isles, France, Iberia, and nearby Low Countries; no Britannian cities. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=120,ROWS=96,SIDES=['britannia','eu'];
  const MASK_COLS=120,MASK_ROWS=80;
  const BOUNDS={west:-13,east:10,north:60,south:35.5};
  const PROJECTION={centerLon:-1.5,centerLat:47.75,angle:0,
    uMin:-11.5*Math.cos(47.75*Math.PI/180),uMax:11.5*Math.cos(47.75*Math.PI/180),
    vMin:-12.25,vMax:12.25};
  const CITIES=[
    ["London",-0.13,51.51,"eu",3,true],
    ["Edinburgh",-3.18,55.95,"eu",2,false],
    ["Glasgow",-4.25,55.86,"eu",2,false],
    ["Manchester",-2.24,53.48,"eu",2,false],
    ["Liverpool",-2.99,53.41,"eu",2,true],
    ["Birmingham",-1.89,52.49,"eu",2,false],
    ["Bristol",-2.59,51.45,"eu",2,false],
    ["Southampton",-1.4,50.91,"eu",2,true],
    ["Plymouth",-4.14,50.38,"eu",2,true],
    ["Belfast",-5.93,54.6,"eu",2,true],
    ["Dublin",-6.26,53.35,"eu",2,true],
    ["Cork",-8.47,51.9,"eu",2,true],
    ["Galway",-9.05,53.27,"eu",2,false],
    ["Paris",2.35,48.86,"eu",3,true],
    ["Lille",3.06,50.63,"eu",2,false],
    ["Le Havre",0.11,49.49,"eu",2,true],
    ["Brest",-4.49,48.39,"eu",3,true],
    ["Nantes",-1.55,47.22,"eu",2,true],
    ["Bordeaux",-0.58,44.84,"eu",2,true],
    ["Lyon",4.83,45.76,"eu",2,false],
    ["Toulouse",1.44,43.6,"eu",2,false],
    ["Marseille",5.37,43.3,"eu",3,true],
    ["Calais",1.86,50.95,"eu",2,true],
    ["Madrid",-3.7,40.42,"eu",3,true],
    ["Barcelona",2.17,41.38,"eu",2,true],
    ["Lisbon",-9.14,38.72,"eu",3,true],
    ["Porto",-8.63,41.15,"eu",2,true],
    ["Seville",-5.98,37.39,"eu",2,false],
    ["Valencia",-0.38,39.47,"eu",2,true],
    ["Bilbao",-2.93,43.26,"eu",2,true],
    ["Zaragoza",-0.89,41.65,"eu",2,false],
    ["Vigo",-8.72,42.24,"eu",2,true],
    ["Cadiz",-6.29,36.53,"eu",2,true],
    ["Malaga",-4.42,36.72,"eu",2,true],
    ["Amsterdam",4.9,52.37,"eu",2,true],
    ["Brussels",4.35,50.85,"eu",2,false],
    ["Rotterdam",4.48,51.92,"eu",2,true]
  ];
  const ARMY_GROUPS=[
    ["britannia","Western Approaches","heavy",2,"cornelia"],
    ["britannia","Western Approaches","rocket",2,"cecile"],
    ["britannia","Western Approaches","medium",2,"guilford"],
    ["britannia","Western Approaches","assault",2,"suzaku"],
    ["britannia","Bay of Biscay","heavy",2,"bismarck"],
    ["britannia","Bay of Biscay","siege",2],
    ["britannia","Bay of Biscay","raider",2,"jeremiah"],
    ["britannia","Bay of Biscay","medium",2,"darlton"],
    ["britannia","Iberian Atlantic","heavy",2,"gino"],
    ["britannia","Iberian Atlantic","rocket",2],
    ["britannia","Iberian Atlantic","medium",2],
    ["britannia","Iberian Atlantic","assault",2,"villetta"],
    ["eu","Paris","medium",3,"leila"],
    ["eu","Paris","support",2,"margaret"],
    ["eu","Brest","heavy",3,"pierre"],
    ["eu","Brest","rocket",2],
    ["eu","London","heavy",3],
    ["eu","London","rocket",2],
    ["eu","Liverpool","medium",2],
    ["eu","Edinburgh","light",2],
    ["eu","Southampton","assault",2],
    ["eu","Plymouth","medium",2],
    ["eu","Belfast","light",2],
    ["eu","Bordeaux","medium",3,"olivia"],
    ["eu","Nantes","rocket",2],
    ["eu","Le Havre","heavy",2],
    ["eu","Marseille","medium",3,"akito"],
    ["eu","Marseille","support",2,"yukiya"],
    ["eu","Lyon","heavy",2,"ayano"],
    ["eu","Madrid","heavy",3,"smilas"],
    ["eu","Madrid","rocket",2],
    ["eu","Lisbon","medium",2,"eduardo"],
    ["eu","Porto","assault",2],
    ["eu","Barcelona","medium",2],
    ["eu","Seville","light",2],
    ["eu","Rotterdam","heavy",2,"anna"],
    ["eu","Calais","assault",2],
    ["eu","Bilbao","support",2]
  ];
  const PORTS={"London":3,"Edinburgh":2,"Liverpool":2,"Southampton":3,"Plymouth":3,"Belfast":2,"Dublin":2,"Cork":2,"Le Havre":2,"Brest":3,"Nantes":2,"Bordeaux":2,"Marseille":2,"Calais":2,"Barcelona":2,"Lisbon":3,"Porto":2,"Valencia":2,"Bilbao":2,"Vigo":2,"Cadiz":2,"Malaga":2,"Amsterdam":2,"Rotterdam":2};
  const FLEETS=[
    ["britannia","Western Approaches",-10.5,53.4,"carrier_battleship",4],
    ["britannia","Bay of Biscay",-6.4,47.7,"carrier_battleship",4],
    ["britannia","Iberian Atlantic",-10.5,39.5,"carrier_battleship",4],
    ["britannia","Western Approaches",-10.5,53.4,"portman_ii",9],
    ["britannia","Bay of Biscay",-6.4,47.7,"portman_ii",8],
    ["britannia","Iberian Atlantic",-10.5,39.5,"portman_ii",8],
    ["eu","London",null,null,"eu_carrier",1],
    ["eu","Brest",null,null,"eu_carrier",1],
    ["eu","Lisbon",null,null,"eu_carrier",1],
    ["eu","Southampton",null,null,"panzer_frosch_ii",3],
    ["eu","Brest",null,null,"panzer_frosch_ii",3],
    ["eu","Liverpool",null,null,"panzer_frosch",2],
    ["eu","Marseille",null,null,"panzer_frosch_ii",2]
  ];
  const FUNDING={britannia:{credits:760,industry:460,science:65,sakuradite:28},
    eu:{credits:760,industry:475,science:75,sakuradite:35}};
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
  const MOUNTAINS=[[-4.8,57,2.8,1.8],[-3.7,43.1,4,0.8],[0.7,42.7,4.3,0.9],
    [-3.2,37.2,2.0,0.8],[3.1,45.4,2.4,1.5],[8.3,46,1.8,1.1]];
  const FORESTS=[[5,50.5,1.6,1.4],[-1.1,44.3,1.8,2],[2.0,47.5,3.3,2.5],
    [-5,54,2,1.5],[-6.1,40,2.2,2]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS);
    return mountain>.63?'mountain':
      mountain>.29||forest>.51||p.lat>66||((c*29+r*17)%31<4&&p.lat>45)
        ?'forest':'plains';
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
  function create(player='britannia',difficulty='normal',seed=201717){
    if(!SIDES.includes(player))throw Error('Unsupported Operation Stonehenge faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'operation-stonehenge',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:{britannia:'britannia',eu:'eu'}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'operation-stonehenge',key:'stonehenge',title:'Operation Stonehenge',
      version:2,phase:'atlantic-invasion',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,citylessFunding:['britannia']};
    // Only Britannia and Europia United are playable here.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia')),
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu'))
    };
    const packed=root.EUROPE_LAND_BITS || (typeof require==='function'?
      require('./europe-landmask.js'):null);
    const bits=typeof packed==='string'?packed:root.EUROPE_LAND_BITS;
    if(!bits)throw Error('European tactical landmask was not loaded');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    if(raw.length!==MASK_COLS*MASK_ROWS/8)throw Error('European tactical landmask is corrupt');
    // Crop and resample the original packed European shoreline onto Western Europe.
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const sr=Math.round((72-p.lat)*MASK_ROWS/38-.5);
      const sc=Math.round((p.lon+13)*MASK_COLS/60-.5-.5*(sr&1));
      const j=sr*MASK_COLS+sc;
      const land=sr>=0&&sr<MASK_ROWS&&sc>=0&&sc<MASK_COLS&&
        !!(raw.charCodeAt(j>>3)&(128>>(j&7)));
      return {c,r,owner:null,terrain:land?landscape(p,c,r):'sea'};
    });
    // The packed continental coastline includes the African coast and Asian
    // Anatolia. Audit its connected landmasses BEFORE allocating city provinces:
    // islands such as Sicily, Sardinia, Corsica and Crete must remain playable.
    const rawComponents=new Int16Array(g.tiles.length).fill(-1),rawRegions=[];
    for(let i=0;i<g.tiles.length;i++){
      if(g.tiles[i].terrain==='sea'||rawComponents[i]>=0)continue;
      const q=[g.tiles[i]],id=rawRegions.length;
      rawComponents[i]=id;
      let minLon=Infinity,maxLon=-Infinity,maxLat=-Infinity;
      for(let k=0;k<q.length;k++){
        const t=q[k],p=geo(t.c,t.r);
        minLon=Math.min(minLon,p.lon);maxLon=Math.max(maxLon,p.lon);
        maxLat=Math.max(maxLat,p.lat);
        for(const n of E.adjacent(g,t)){
          const j=n.r*COLS+n.c;
          if(n.terrain==='sea'||rawComponents[j]>=0)continue;
          rawComponents[j]=id;q.push(n);
        }
      }
      rawRegions.push({size:q.length,minLon,maxLon,maxLat});
    }
    const mainland=rawRegions.indexOf(rawRegions.reduce((best,r)=>
      r.size>best.size?r:best,rawRegions[0]));
    const excludedRegions=new Set(rawRegions.flatMap((region,id)=>
      id!==mainland&&region.maxLat<38&&region.minLon<12&&region.maxLon>-7?[id]:[]));
    function anatolianLand(p){
      // West of the Bosporus (European Thrace) remains in the theatre.
      // Beyond it, the Black Sea / Caucasus boundary excludes Asia.
      if(p.lon<26.5)return false;
      if(p.lon<28)return p.lat<40.25;
      if(p.lon<29.2)return p.lat<40.65;
      return p.lat<41.55+0.07*(p.lon-29.2);
    }
    const excludedLand=new Uint8Array(g.tiles.length);
    for(let i=0;i<g.tiles.length;i++){
      const t=g.tiles[i];
      if(t.terrain!=='sea'&&(excludedRegions.has(rawComponents[i])||
          (rawComponents[i]===mainland&&anatolianLand(geo(t.c,t.r))))){
        excludedLand[i]=1;
        t.terrain='sea'; // Temporarily water for city/army placement.
      }
    }
    // Remove sub-hex enclosed water artifacts from the raster mask. They are
    // small inland holes, not viable sea links or fleet harbours (notably Cork).
    // The Atlantic, English Channel, North Sea and real inland seas are retained.
    const seaVisited=new Uint8Array(g.tiles.length);
    for(let start=0;start<g.tiles.length;start++){
      if(seaVisited[start]||g.tiles[start].terrain!=='sea'||excludedLand[start])continue;
      const region=[g.tiles[start]];seaVisited[start]=1;
      let touchesEdge=false;
      for(let i=0;i<region.length;i++){
        const t=region[i];
        if(t.c===0||t.r===0||t.c===COLS-1||t.r===ROWS-1)touchesEdge=true;
        for(const n of E.adjacent(g,t)){
          const j=n.r*COLS+n.c;
          if(n.terrain==='sea'&&!excludedLand[j]&&!seaVisited[j]){
            seaVisited[j]=1;region.push(n);
          }
        }
      }
      if(!touchesEdge&&region.length<=4)
        for(const t of region)t.terrain='plains';
    }
    // Every genuine land-to-sea edge is coastal, including island tips.
    // A theatre-border cut is NOT a new navigable shoreline.
    for(const t of g.tiles)if(t.terrain!=='sea'){
      if(E.adjacent(g,t).some(n=>n.terrain==='sea'&&
          !excludedLand[n.r*COLS+n.c]))t.terrain='coast';
    }
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place European city '+name);
      const capital=name==='Paris';
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
      if(side==='britannia')continue; // Load troops into offshore carriers below.
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side)throw Error('Invalid staging city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),10);
        if(!at)throw Error('Cannot deploy unit at '+name);
        const cmd=i===0?commander:null;
        const stack=i===0?2:1;
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
    for(const [side,name,lon,lat,type,count] of FLEETS){
      const s=side==='eu'?g.stations.find(v=>v.name===name):null;
      const anchor=s||locate(lon,lat);
      if(!E.TYPES[type]?.naval)throw Error('Invalid Stonehenge fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,anchor,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),18);
        if(!at)throw Error('Cannot deploy navy at '+name);
        const ship=E.newUnit(g,type,side,at.c,at.r);
        if(side==='britannia')ship.invasionGroup=name;
        fleet.units.push(ship.id);
      }
      g.scenario.groups.push(fleet);
    }
    // Create exactly 24 land formations; all are loaded before the player starts.
    const carriers=g.units.filter(u=>u.side==='britannia'&&E.TYPES[u.type].naval==='ship');
    const passengers=[];
    for(const [side,name,cls,count,commander] of ARMY_GROUPS){
      if(side!=='britannia')continue;
      for(let i=0;i<count;i++){
        const ship=carriers.find(v=>v.invasionGroup===name&&
          (v.pendingPassengers||0)<E.TYPES[v.type].capacity);
        if(!ship)throw Error('Not enough carrier capacity in '+name);
        ship.pendingPassengers=(ship.pendingPassengers||0)+1;
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,ship.c,ship.r,i===0?2:1,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        passengers.push({ship,u});
        group(side,name).units.push(u.id);
      }
    }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const {ship,u} of passengers){
      (ship.cargo||=[]).push(u);
      g.units.splice(g.units.indexOf(u),1);
    }
    for(const ship of carriers)delete ship.pendingPassengers;
    // Keep open-water approach lanes to the British Isles, Biscay and Iberia.
    const depth=new Int16Array(g.tiles.length).fill(-1),q=[];
    for(const t of g.tiles)if(t.terrain!=='sea'){
      depth[t.r*COLS+t.c]=0;q.push(t);
    }
    for(let i=0;i<q.length;i++){
      const t=q[i],d=depth[t.r*COLS+t.c];
      if(d>=30)continue;
      for(const n of E.adjacent(g,t)){
        const j=n.r*COLS+n.c;
        if(n.terrain==='sea'&&depth[j]===-1){depth[j]=d+1;q.push(n);}
      }
    }
    for(const t of g.tiles)if(t.terrain==='sea'&&
      (excludedLand[t.r*COLS+t.c]||depth[t.r*COLS+t.c]<0||
       depth[t.r*COLS+t.c]>30))t.terrain='offmap';
    // The historical Stonehenge Sakuradite discovery is worked from London.
    // Site yield follows London ownership upon capture, using standard refinery rules.
    const london=g.stations.find(s=>s.name==='London');
    london.refinery=Math.max(1,london.refinery||0);
    g.sites.push({id:0,name:'Stonehenge',c:london.c,r:london.r,base:20,city:london.id});
    for(const side of SIDES){
      const factor=side===player||!E.foe(g,side,player)?1:['challenge','elite'].includes(difficulty)?1.6:
        difficulty==='hard'?1.3:1;
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n*factor)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*(side==='eu'?2:3);
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>E.foe(g,v,player)))
        for(const [i,u] of g.units.flatMap(v=>[v,...(v.cargo||[])])
          .filter(v=>v.side===side&&E.TYPES[v.type].naval!=='ship').entries())
          if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.reduce((n,u)=>
      n+(u.side===s?1:0)+(u.cargo||[]).filter(v=>v.side===s).length,0)]));
    E.log(g,'Britannia starts with no cities: carrier-borne forces and amphibious escorts launch an all-out Atlantic invasion.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    const euCities=g.stations.filter(s=>s.owner==='eu').length;
    const britCities=g.stations.filter(s=>s.owner==='britannia').length;
    const afloat=g.units.filter(u=>u.side==='britannia'&&u.hp>0).length;
    return side==='eu'
      ? 'Hold the coast and destroy Britannia’s expedition ('+afloat+' hostile units afloat; '+britCities+' occupied cities).'
      : 'Land troops from carriers and conquer all '+CITIES.length+' cities ('+euCities+' E.U. cities remain).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='operation-stonehenge'||
       g.stations.length!==CITIES.length)return null;
    const eu=g.stations.some(s=>s.owner==='eu');
    const britCities=g.stations.some(s=>s.owner==='britannia');
    const britUnits=g.units.some(u=>u.side==='britannia'&&u.hp>0);
    if(!eu)return {winner:'britannia',team:'britannia',
      reason:'Britannia has conquered every E.U. city in Western Europe.'};
    if(!britCities&&!britUnits)return {winner:'eu',team:'eu',
      reason:'Europia United has destroyed every invading Britannian formation.'};
    return null;
  }
  const api={id:'operation-stonehenge',title:'Operation Stonehenge',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  E.scenarios={...(E.scenarios||{}),stonehenge:api,
    byId:{...(E.scenarios?.byId||{}),'operation-stonehenge':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

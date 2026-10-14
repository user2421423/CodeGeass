/* Iraq–Iran Campaign — Britannian western offensive against the Chinese Federation.
   Two independently hostile factions, no E.U. and no Area 18 reuse.
   The embedded tactical coast uses Natural Earth fractional land coverage (20–80% shore).
   All combat, ports, Army Groups and elite rules use existing engine mechanics. */
(function(root){
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  const ID='britannia-iraq-iran', KEY='iraqIran';
  const COLS=168,ROWS=112,SIDES=['britannia','cf'];
  const BOUNDS={west:34,east:65,north:40.4,south:22.3};
  const K=Math.cos(31.35*Math.PI/180);
  const PROJECTION={centerLon:49.5,centerLat:31.35,angle:0,
    uMin:-15.5*K,uMax:15.5*K,vMin:-9.05,vMax:9.05};
  // All real-world positions are WGS84; faction borders are alternate history.
  const CITIES=[["Aleppo",37.16,36.2,"britannia",3,true],["Raqqa",39.01,35.95,"britannia",2,true],["Deir ez-Zor",40.15,35.33,"britannia",3,true],["Al-Hasakah",40.74,36.51,"britannia",3,true],["Palmyra",38.28,34.55,"britannia",2,false],["Damascus",36.29,33.51,"britannia",3,true],["Amman",35.93,31.95,"britannia",3,true],["Arar",41.04,30.98,"britannia",2,false],["Rafha",43.51,29.63,"britannia",2,false],["Sakakah",40.2,29.97,"britannia",2,false],["Hafar al-Batin",45.97,28.43,"britannia",3,true],["Kuwait City",47.98,29.37,"britannia",3,true],["Dammam",50.1,26.43,"britannia",3,true],["Doha",51.53,25.29,"britannia",3,true],["Abu Dhabi",54.37,24.45,"britannia",3,true],["Dubai",55.27,25.2,"britannia",3,true],["Muscat",58.41,23.59,"britannia",3,true],["Mosul",43.13,36.34,"cf",3,true],["Erbil",44.01,36.19,"cf",3,true],["Dohuk",43,36.86,"cf",2,true],["Zakho",42.69,37.14,"cf",2,false],["Sulaymaniyah",45.44,35.56,"cf",3,true],["Kirkuk",44.39,35.47,"cf",3,true],["Tikrit",43.68,34.61,"cf",2,true],["Samarra",43.88,34.2,"cf",2,true],["Baqubah",44.65,33.75,"cf",2,true],["Baghdad",44.37,33.32,"cf",3,true],["Fallujah",43.79,33.35,"cf",2,true],["Ramadi",43.3,33.42,"cf",2,true],["Haditha",42.37,34.14,"cf",2,false],["Rutba",40.28,33.04,"cf",2,false],["Karbala",44.03,32.61,"cf",2,true],["Najaf",44.33,31.99,"cf",3,true],["Hilla",44.43,32.48,"cf",2,false],["Kut",45.82,32.51,"cf",3,true],["Diwaniyah",44.93,31.99,"cf",2,false],["Nasiriyah",46.26,31.05,"cf",3,true],["Amarah",47.15,31.83,"cf",3,true],["Basra",47.78,30.51,"cf",3,true],["Umm Qasr",47.93,30.04,"cf",2,true],["Tabriz",46.29,38.08,"cf",3,true],["Urmia",45.07,37.55,"cf",2,true],["Khoy",44.95,38.55,"cf",2,false],["Maragheh",46.24,37.39,"cf",2,false],["Ardabil",48.3,38.25,"cf",2,false],["Zanjan",48.49,36.67,"cf",2,true],["Saqqez",46.27,36.25,"cf",2,true],["Sanandaj",46.99,35.31,"cf",3,true],["Kermanshah",47.07,34.32,"cf",3,true],["Ilam",46.42,33.63,"cf",2,true],["Hamadan",48.51,34.8,"cf",3,true],["Khorramabad",48.35,33.48,"cf",3,true],["Arak",49.68,34.09,"cf",3,true],["Dezful",48.4,32.38,"cf",2,true],["Ahvaz",48.68,31.32,"cf",3,true],["Abadan",48.3,30.34,"cf",3,true],["Tehran",51.42,35.69,"cf",3,true],["Karaj",50.99,35.84,"cf",3,true],["Qazvin",50,36.27,"cf",3,true],["Qom",50.88,34.64,"cf",2,true],["Kashan",51.44,33.98,"cf",2,false],["Isfahan",51.68,32.65,"cf",3,true],["Yasuj",51.59,30.66,"cf",2,true],["Shiraz",52.54,29.59,"cf",3,true],["Jahrom",53.56,28.5,"cf",2,false],["Lar",54.45,27.67,"cf",2,true],["Bushehr",50.84,28.92,"cf",3,true],["Bandar Lengeh",54.88,26.56,"cf",2,true],["Bandar Abbas",56.28,27.18,"cf",3,true],["Bandar Jask",57.77,25.65,"cf",2,true],["Chabahar",60.64,25.29,"cf",3,true],["Yazd",54.37,31.9,"cf",3,true],["Semnan",53.4,35.58,"cf",2,true],["Sari",53.06,36.56,"cf",2,false],["Rasht",49.59,37.28,"cf",2,false],["Kerman",57.08,30.28,"cf",3,true],["Sirjan",55.67,29.44,"cf",2,false],["Rafsanjan",55.99,30.41,"cf",2,false],["Bam",58.36,29.1,"cf",2,true],["Zahedan",60.86,29.5,"cf",3,true],["Zabol",61.49,31.03,"cf",2,true],["Birjand",59.21,32.86,"cf",3,true],["Mashhad",59.61,36.3,"cf",3,true],["Neyshabur",58.79,36.21,"cf",2,false]];
  // [faction, origin city, operational formation, type class, count, named commander].
  const ARMY_GROUPS=[["britannia","Aleppo","Northern Expedition","heavy",4,"cornelia"],["britannia","Aleppo","Northern Expedition","rocket",3,"guilford"],["britannia","Raqqa","Euphrates Spearhead","heavy",4,"bismarck"],["britannia","Raqqa","Euphrates Spearhead","assault",3,"darlton"],["britannia","Deir ez-Zor","Euphrates Spearhead","medium",4,"gino"],["britannia","Deir ez-Zor","Euphrates Spearhead","rocket",3,"cecile"],["britannia","Al-Hasakah","Jazira Army","heavy",4,"suzaku"],["britannia","Al-Hasakah","Jazira Army","assault",3,"jeremiah"],["britannia","Palmyra","Desert Encirclement","raider",4,"villetta"],["britannia","Arar","Desert Encirclement","heavy",3,"oldrin"],["britannia","Rafha","Desert Encirclement","medium",4,"nonette"],["britannia","Kuwait City","Southern Mesopotamia Army","heavy",5,"schneizel"],["britannia","Kuwait City","Southern Mesopotamia Army","rocket",4,"monica"],["britannia","Hafar al-Batin","Southern Mesopotamia Army","assault",4,"anya"],["britannia","Damascus","Imperial Strategic Reserve","heavy",4,null],["britannia","Amman","Imperial Strategic Reserve","siege",3,null],["britannia","Dammam","Gulf Expeditionary Corps","heavy",4,null],["britannia","Dammam","Gulf Expeditionary Corps","assault",3,null],["britannia","Muscat","Hormuz Landing Corps","medium",3,null],["britannia","Muscat","Hormuz Landing Corps","rocket",2,null],["cf","Mosul","Northern Iraq Defense","heavy",5,null],["cf","Mosul","Northern Iraq Defense","rocket",4,null],["cf","Erbil","Kurdistan Mountain Defense","heavy",4,"gaohai"],["cf","Kirkuk","Kurdistan Mountain Defense","rocket",3,null],["cf","Sulaymaniyah","Kurdistan Mountain Defense","assault",3,null],["cf","Tikrit","Tigris Defense Line","heavy",4,null],["cf","Samarra","Tigris Defense Line","rocket",3,null],["cf","Baghdad","Baghdad Defense Army","heavy",6,"xingke"],["cf","Baghdad","Baghdad Defense Army","siege",4,"xianglin"],["cf","Baqubah","Baghdad Defense Army","rocket",3,null],["cf","Fallujah","Euphrates Defense Line","heavy",4,null],["cf","Ramadi","Euphrates Defense Line","medium",3,null],["cf","Haditha","Euphrates Defense Line","rocket",2,null],["cf","Basra","Lower Mesopotamia Army","heavy",5,"honggu"],["cf","Basra","Lower Mesopotamia Army","rocket",4,"cao"],["cf","Kut","Lower Mesopotamia Army","assault",3,null],["cf","Amarah","Lower Mesopotamia Army","medium",3,null],["cf","Najaf","Central Iraq Reserve","heavy",3,null],["cf","Nasiriyah","Central Iraq Reserve","medium",3,null],["cf","Kermanshah","Central Zagros Guard","heavy",5,"zhaohao"],["cf","Kermanshah","Central Zagros Guard","rocket",4,null],["cf","Sanandaj","Northern Zagros Guard","heavy",4,null],["cf","Saqqez","Northern Zagros Guard","rocket",3,null],["cf","Hamadan","Northern Zagros Guard","medium",3,null],["cf","Ilam","Southern Zagros Guard","heavy",4,null],["cf","Khorramabad","Southern Zagros Guard","rocket",3,null],["cf","Ahvaz","Khuzestan Counterattack Army","heavy",5,"leifeng"],["cf","Ahvaz","Khuzestan Counterattack Army","assault",4,"meiling"],["cf","Dezful","Khuzestan Counterattack Army","rocket",3,null],["cf","Abadan","Khuzestan Counterattack Army","medium",3,null],["cf","Tabriz","Azerbaijan Reserve","heavy",5,null],["cf","Urmia","Azerbaijan Reserve","rocket",3,null],["cf","Zanjan","Azerbaijan Reserve","medium",3,null],["cf","Tehran","Capital Defense Army","heavy",6,null],["cf","Tehran","Capital Defense Army","siege",4,null],["cf","Karaj","Capital Defense Army","rocket",4,null],["cf","Qazvin","Capital Defense Army","medium",4,null],["cf","Isfahan","Plateau Mobile Reserve","heavy",5,null],["cf","Isfahan","Plateau Mobile Reserve","rocket",4,null],["cf","Arak","Plateau Mobile Reserve","assault",3,null],["cf","Shiraz","Southern Plateau Army","heavy",5,"lifeng"],["cf","Shiraz","Southern Plateau Army","rocket",3,null],["cf","Yasuj","Southern Plateau Army","medium",3,null],["cf","Bushehr","Persian Gulf Coastal Guard","heavy",3,null],["cf","Bandar Abbas","Hormuz Defense Army","heavy",5,"rakshata"],["cf","Bandar Abbas","Hormuz Defense Army","rocket",3,null],["cf","Lar","Hormuz Defense Army","assault",3,null],["cf","Kerman","Eastern Plateau Reserve","heavy",4,null],["cf","Yazd","Eastern Plateau Reserve","rocket",4,null],["cf","Zahedan","Eastern Plateau Reserve","medium",3,null],["cf","Mashhad","Northeast Counterattack Reserve","heavy",4,null],["cf","Mashhad","Northeast Counterattack Reserve","rocket",3,null],["cf","Birjand","Northeast Counterattack Reserve","medium",3,null]];
  // Ports are separate capturable sea cells, not inseparable city ownership.
  const PORTS={"Kuwait City":3,"Dammam":3,"Doha":2,"Abu Dhabi":2,"Dubai":3,"Muscat":3,"Umm Qasr":2,"Bushehr":3,"Bandar Lengeh":2,"Bandar Abbas":3,"Bandar Jask":2,"Chabahar":3};
  const FLEETS=[["britannia","Kuwait City","carrier_battleship",2],["britannia","Kuwait City","portman_ii",3],["britannia","Dammam","carrier_battleship",2],["britannia","Dammam","portman_ii",3],["britannia","Doha","carrier_battleship",1],["britannia","Dubai","carrier_battleship",2],["britannia","Dubai","portman_ii",3],["britannia","Muscat","carrier_battleship",2],["britannia","Muscat","portman_ii",4],["cf","Umm Qasr","cf_carrier",1],["cf","Umm Qasr","shui_gun_ru_ii",2],["cf","Bushehr","cf_carrier",2],["cf","Bushehr","shui_gun_ru_ii",3],["cf","Bandar Abbas","cf_carrier",2],["cf","Bandar Abbas","shui_gun_ru_ii",4],["cf","Chabahar","cf_carrier",1],["cf","Chabahar","shui_gun_ru_ii",2]];
  const FUNDING={britannia:{credits:1080,industry:560,science:95,sakuradite:48},
    cf:{credits:1550,industry:810,science:130,sakuradite:64}};
  const RIVERS={
    Tigris:[[42.72,37.12],[43.15,36.45],[43.55,35.65],[43.68,34.65],
      [44.1,34.2],[44.37,33.33],[45.20,32.93],[45.78,32.5],
      [47.15,31.83],[47.43,31.02],[47.77,30.5]],
    Euphrates:[[39.17,36.82],[39.52,35.96],[40.15,35.33],[41.17,34.43],
      [42.35,34.13],[43.31,33.43],[43.78,33.35],[44.05,32.6],
      [44.34,32.02],[44.93,31.98],[46.25,31.04],[47.43,31.02]],
    Karun:[[49.44,32.28],[48.67,31.32],[48.34,30.34],[48.01,30.06]]
  };
  const ZAGROS=[[45.45,38.4],[46.65,36.85],[47.45,35.25],
    [48.56,33.30],[49.73,31.95],[51.12,30.41],[52.56,29.15],
    [54.18,27.90],[55.53,27.23]];
  const ALBORZ=[[49.7,36.6],[51.2,36.25],[52.8,36.37],[54.7,36.7]];
  const PASSES=[[47.05,34.28,0.75],[48.48,32.38,0.6],
    [48.65,31.34,0.75],[51.58,30.63,0.7],[55.95,27.30,0.65],
    [46.85,36.75,0.65],[49.9,35.05,0.65]];
  function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
    lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function nearest(g,p,valid,radius=10){
    let best=null,score=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!valid(t))continue;
        const d=E.distance(p,t,g);
        if(d<score){best=t;score=d;}
      }
    return best;
  }
  function lineDistance(p,line){
    let best=Infinity;
    for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i],vx=(b[0]-a[0])*.84,vy=b[1]-a[1],
        px=(p.lon-a[0])*.84,py=p.lat-a[1],
        t=Math.max(0,Math.min(1,(px*vx+py*vy)/(vx*vx+vy*vy||1)));
      best=Math.min(best,Math.hypot(px-t*vx,py-t*vy));
    }
    return best;
  }
  function landscape(p,c,r){
    const zagros=lineDistance(p,ZAGROS),alborz=lineDistance(p,ALBORZ);
    const pass=Math.min(...PASSES.map(([x,y,w])=>Math.hypot((p.lon-x)*.84,p.lat-y)/w));
    // The Zagros is a major defensive barrier, but the named passes stay open.
    if(zagros<.22&&pass>1.2&&((c*13+r*7)%11<3))return 'peak';
    if(zagros<.73&&pass>.52)return 'mountain';
    if(alborz<.40&&pass>.7)return 'mountain';
    if(p.lon>52.0&&p.lon<60.5&&p.lat>28.0&&p.lat<35.0)return 'desert';
    if(p.lon>53&&p.lon<57.5&&p.lat>33&&p.lat<35.6)return 'desert';
    if(p.lon<46.3&&p.lat<32.5&&p.lon>37)return 'desert';
    if(p.lon>42.2&&p.lon<48.8&&p.lat>29.4&&p.lat<37.2)return 'plains';
    if(p.lon>47.5&&p.lon<50.6&&p.lat>30.1&&p.lat<32.7)return 'plains';
    if(p.lat>36.4&&p.lon>46&&p.lon<55&&((c*17+r*11)%19)<5)return 'forest';
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
  function create(player='britannia',difficulty='normal',seed=201718){
    if(!SIDES.includes(player))throw Error('Unsupported Iraq–Iran faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[side]={};
    }
    g.scenario={id:ID,key:KEY,title:'Iraq–Iran Campaign',version:1,
      phase:'western-offensive',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,
      operationalFronts:[
        {name:'Upper Tigris',attack:'britannia',objective:'Mosul'},
        {name:'Middle Euphrates',attack:'britannia',objective:'Baghdad'},
        {name:'Southern Mesopotamia',attack:'britannia',objective:'Basra'},
        {name:'Northern Zagros',attack:'britannia',objective:'Tabriz'},
        {name:'Central Zagros',attack:'britannia',objective:'Kermanshah'},
        {name:'Khuzestan Corridor',attack:'britannia',objective:'Ahvaz'},
        {name:'Iranian Plateau',attack:'britannia',objective:'Isfahan'},
        {name:'Capital Offensive',attack:'britannia',objective:'Tehran'},
        {name:'Strait of Hormuz',attack:'britannia',objective:'Bandar Abbas'}],
      riverCrossings:['Mosul','Tikrit','Samarra','Baghdad','Fallujah','Kut','Amarah','Nasiriyah'],
      mountainPasses:['Kermanshah','Khorramabad','Ahvaz','Yasuj','Sanandaj']};
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    // Four 2-bit classifications per byte. Embed instead of loading maps online.
    const packed=root.IRAQ_IRAN_COAST_CLASSES||
      (typeof require==='function'?require('./iraq-iran-coast.js'):null);
    const raw=typeof atob==='function'?atob(packed):Buffer.from(packed,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/4)throw Error('Corrupt Iraq–Iran 20–80% coastline');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const cls=(raw.charCodeAt(i>>2)>>(6-2*(i&3)))&3;
      return {c,r,owner:null,terrain:cls===0?'sea':cls===1?'coast':landscape(p,c,r)};
    });
    // Restrict all assigned Gulf harbours/fleets to the one connected water basin
    // through the Strait of Hormuz; the Caspian is never joined to the Gulf.
    const gulfStart=nearest(g,locate(52.3,26.6),t=>t.terrain==='sea',8);
    if(!gulfStart)throw Error('Persian Gulf absent from shoreline source');
    const reachable=new Set([E.key(gulfStart)]),queue=[gulfStart];
    for(let i=0;i<queue.length;i++)for(const n of E.adjacent(g,queue[i])){
      const key=E.key(n);
      if((n.terrain==='sea'||n.terrain==='coast')&&!reachable.has(key)){
        reachable.add(key);queue.push(n);
      }
    }
    const gulf=t=>(t.terrain==='sea'||t.terrain==='coast')&&reachable.has(E.key(t));
    // River edges are crossed where a movement segment intersects the real
    // river polyline. The map uses hex-centre approximations at tactical scale.
    // Bridge cities offer exempt approaches; everywhere else land units pay +1
    // movement. The saved scenario stores ordinary JSON for pathfinding.
    function orientation(a,b,p){
      return (b.lon-a.lon)*(p.lat-a.lat)-(b.lat-a.lat)*(p.lon-a.lon);
    }
    function intersects(a,b,x,y){
      const u=orientation(a,b,{lon:x[0],lat:x[1]}),
        v=orientation(a,b,{lon:y[0],lat:y[1]}),
        m=orientation({lon:x[0],lat:x[1]},{lon:y[0],lat:y[1]},a),
        n=orientation({lon:x[0],lat:x[1]},{lon:y[0],lat:y[1]},b);
      return ((u>0&&v<0)||(u<0&&v>0))&&((m>0&&n<0)||(m<0&&n>0));
    }
    const riverSegments=Object.values(RIVERS).flatMap(polyline=>
      polyline.slice(1).map((p,i)=>[polyline[i],p]));
    const bridges=new Set(g.scenario.riverCrossings);
    const bridgeCities=()=>g.stations.filter(s=>bridges.has(s.name));
    function riverBarriers(){
      const edges={},crossings=bridgeCities();
      for(const t of g.tiles){
        if(t.terrain==='sea'||t.terrain==='offmap'||E.TERRAIN[t.terrain]?.blocked)continue;
        const a=geo(t.c,t.r),from=t.r*COLS+t.c;
        for(const n of E.adjacent(g,t)){
          const to=n.r*COLS+n.c;
          if(to<=from||n.terrain==='sea'||n.terrain==='offmap'||
             E.TERRAIN[n.terrain]?.blocked)continue;
          const b=geo(n.c,n.r);
          if(!riverSegments.some(([x,y])=>intersects(a,b,x,y)))continue;
          if(crossings.some(s=>E.distance(s,t,g)<=1&&E.distance(s,n,g)<=1))
            continue;
          edges[from+':'+to]=true;
        }
      }
      return edges;
    }
    // Place each city at or very near its actual coordinates. A defended port
    // must border navigable Gulf water instead of bridging over land.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const coast=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>
        t.terrain!=='sea'&&t.terrain!=='offmap'&&t.terrain!=='peak'&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r)&&
        (!coast||E.adjacent(g,t).some(n=>gulf(n))),coast?10:6);
      if(!at)throw Error('Iraq–Iran city inaccessible: '+name);
      const capital=name==='Damascus'||name==='Tehran'||name==='Baghdad';
      const shield=fort?470:130+70*tier;
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Fortified Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?55:tier===3?33:tier===2?22:13)*.55),
        industry:Math.round((capital?28:7*tier)*.55),
        science:Math.round((tier+2)*.55),producedTurn:0});
    }
    // Assign land ownership by nearest city on the same contiguous land mass.
    // This prevents ownership colors flooding across Persian Gulf water.
    const components=new Int16Array(g.tiles.length).fill(-1);
    let componentId=0;
    for(let i=0;i<g.tiles.length;i++){
      const first=g.tiles[i];
      if(first.terrain==='sea'||first.terrain==='offmap'||components[i]>=0)continue;
      const q=[first];components[i]=componentId;
      for(let j=0;j<q.length;j++)for(const n of E.adjacent(g,q[j])){
        const index=n.r*COLS+n.c;
        if(n.terrain==='sea'||n.terrain==='offmap'||components[index]>=0)continue;
        components[index]=componentId;q.push(n);
      }
      componentId++;
    }
    const byComponent=new Map();
    for(const s of g.stations){
      const key=components[s.r*COLS+s.c];
      if(!byComponent.has(key))byComponent.set(key,[]);
      byComponent.get(key).push(s);
    }
    for(const t of g.tiles)if(t.terrain!=='sea'&&t.terrain!=='offmap'){
      const nearby=byComponent.get(components[t.r*COLS+t.c])||[];
      if(!nearby.length)continue; // unoccupied islands must not gain a land bridge.
      let closest=null,dist=Infinity;
      for(const city of nearby){
        const d=E.distance(t,city,g);
        if(d<dist){dist=d;closest=city;}
      }
      if(closest){t.owner=closest.owner;t.provinceCity=closest.id;}
    }
    g.scenario.riverBarriers=riverBarriers();
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
      if(!s||s.owner!==side)throw Error('Invalid Iraq–Iran Army Group staging '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
          !E.TERRAIN[t.terrain]?.blocked&&!E.unitAt(g,t)&&t.owner===side&&
          (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),14);
        if(!at)throw Error('Cannot deploy Iraq–Iran army near '+name);
        const cmd=i===0?commander:null,stack=i===0?3:2;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,formation,name).units.push(u.id);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    const usedPortHexes=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      if(!s)throw Error('Missing Gulf port city '+name);
      const at=E.adjacent(g,s).filter(t=>gulf(t)&&
        !usedPortHexes.has(E.key(t))&&!g.stations.some(x=>x.c===t.c&&x.r===t.r))
        .sort((a,b)=>E.adjacent(g,b).filter(gulf).length-
          E.adjacent(g,a).filter(gulf).length)[0];
      if(!at)throw Error('No navigable berth at '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      usedPortHexes.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!s||!E.TYPES[type]?.naval)throw Error('Invalid Gulf fleet '+name+'/'+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,name:name+' Fleet',
        origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>gulf(t)&&!E.unitAt(g,t)&&
          !usedPortHexes.has(E.key(t))&&!g.stations.some(x=>x.c===t.c&&x.r===t.r),16);
        if(!at)throw Error('Insufficient naval berths for '+name);
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
    E.log(g,'Britannia launches a western two-theater offensive: fight across the Tigris–Euphrates lowlands, break the Zagros passes, then conquer the Iranian Plateau. Federation reserves contest the Gulf and the interior.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((score,s)=>score+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Iraq–Iran campaign cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has captured all cities across Iraq and Iran.'};
    return null;
  }
  const api={id:ID,title:'Iraq–Iran Campaign',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  E.scenarios={...(E.scenarios||{}),[KEY]:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

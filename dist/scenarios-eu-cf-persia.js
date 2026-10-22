/* E.U. vs Chinese Federation — Invasion of Persia (eu-cf-persia).
   Reuses the Persia 168×112 20–80% coast without changing shared files.
   E.U. fronts advance from southern Caucasus, Mesopotamia and Persian Gulf;
   every Iranian theater city is initially Federation controlled. */
(function(root){
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  const ID='eu-cf-persia', KEY='euCfPersia';
  const COLS=168,ROWS=112,SIDES=['eu','cf'];
  const BOUNDS={west:34,east:65,north:40.4,south:22.3};
  const K=Math.cos(31.35*Math.PI/180);
  const PROJECTION={centerLon:49.5,centerLat:31.35,angle:0,
    uMin:-15.5*K,uMax:15.5*K,vMin:-9.05,vMax:9.05};
  // All real-world positions are WGS84; faction borders are alternate history.
  const CITIES=[["Yerevan",44.51,40.18,"eu",3,true],["Goris",46.34,39.51,"eu",2,true],["Meghri",46.25,38.9,"eu",2,false],["Nakhchivan",45.42,39.2,"eu",3,true],["Bilasuvar",48.46,39.46,"eu",2,true],["Lankaran",48.85,38.75,"eu",2,false],["Van",43.38,38.49,"eu",3,true],["Mosul",43.13,36.34,"eu",3,true],["Erbil",44.01,36.19,"eu",3,true],["Kirkuk",44.39,35.47,"eu",3,true],["Sulaymaniyah",45.44,35.56,"eu",3,true],["Baghdad",44.37,33.32,"eu",3,true],["Kut",45.82,32.51,"eu",3,true],["Amarah",47.15,31.83,"eu",3,true],["Basra",47.78,30.51,"eu",3,true],["Umm Qasr",47.93,30.04,"eu",2,true],["Kuwait City",47.98,29.37,"eu",3,true],["Tabriz",46.29,38.08,"cf",3,true],["Urmia",45.07,37.55,"cf",2,true],["Khoy",44.95,38.55,"cf",2,false],["Maragheh",46.24,37.39,"cf",2,false],["Ardabil",48.3,38.25,"cf",2,false],["Zanjan",48.49,36.67,"cf",2,true],["Saqqez",46.27,36.25,"cf",2,true],["Sanandaj",46.99,35.31,"cf",3,true],["Kermanshah",47.07,34.32,"cf",3,true],["Ilam",46.42,33.63,"cf",2,true],["Hamadan",48.51,34.8,"cf",3,true],["Khorramabad",48.35,33.48,"cf",3,true],["Arak",49.68,34.09,"cf",3,true],["Dezful",48.4,32.38,"cf",2,true],["Ahvaz",48.68,31.32,"cf",3,true],["Abadan",48.3,30.34,"cf",3,true],["Tehran",51.42,35.69,"cf",3,true],["Karaj",50.99,35.84,"cf",3,true],["Qazvin",50,36.27,"cf",3,true],["Qom",50.88,34.64,"cf",2,true],["Kashan",51.44,33.98,"cf",2,false],["Isfahan",51.68,32.65,"cf",3,true],["Yasuj",51.59,30.66,"cf",2,true],["Shiraz",52.54,29.59,"cf",3,true],["Jahrom",53.56,28.5,"cf",2,false],["Lar",54.45,27.67,"cf",2,true],["Bushehr",50.84,28.92,"cf",3,true],["Bandar Lengeh",54.88,26.56,"cf",2,true],["Bandar Abbas",56.28,27.18,"cf",3,true],["Bandar Jask",57.77,25.65,"cf",2,true],["Chabahar",60.64,25.29,"cf",3,true],["Yazd",54.37,31.9,"cf",3,true],["Semnan",53.4,35.58,"cf",2,true],["Sari",53.06,36.56,"cf",2,false],["Rasht",49.59,37.28,"cf",2,false],["Kerman",57.08,30.28,"cf",3,true],["Sirjan",55.67,29.44,"cf",2,false],["Rafsanjan",55.99,30.41,"cf",2,false],["Bam",58.36,29.1,"cf",2,true],["Zahedan",60.86,29.5,"cf",3,true],["Zabol",61.49,31.03,"cf",2,true],["Birjand",59.21,32.86,"cf",3,true],["Mashhad",59.61,36.3,"cf",3,true],["Neyshabur",58.79,36.21,"cf",2,false]];
  // [faction, origin city, operational formation, type class, count, named commander].
  const ARMY_GROUPS=[["eu","Yerevan","Caucasus Expedition","heavy",6,"akito"],["eu","Yerevan","Caucasus Expedition","rocket",4,"yukiya"],["eu","Yerevan","Caucasus Expedition","assault",4,"ryo"],["eu","Yerevan","Caucasus Expedition","support",2,"anna"],["eu","Goris","Aras Crossing Army","heavy",4,"leila"],["eu","Goris","Aras Crossing Army","medium",3,null],["eu","Meghri","Aras Crossing Army","medium",3,null],["eu","Nakhchivan","Azerbaijan Breakthrough","heavy",5,"smilas"],["eu","Nakhchivan","Azerbaijan Breakthrough","rocket",4,"olivia"],["eu","Nakhchivan","Azerbaijan Breakthrough","assault",3,null],["eu","Bilasuvar","Caspian Flank","heavy",4,"ayano"],["eu","Bilasuvar","Caspian Flank","medium",4,null],["eu","Lankaran","Caspian Flank","assault",4,"fernando"],["eu","Van","Lake Van Column","heavy",4,"oscar"],["eu","Van","Lake Van Column","siege",3,null],["eu","Mosul","Northern Zagros Expedition","heavy",5,"marirrosa"],["eu","Mosul","Northern Zagros Expedition","rocket",4,null],["eu","Erbil","Northern Zagros Expedition","heavy",5,"klaus"],["eu","Erbil","Northern Zagros Expedition","assault",4,null],["eu","Sulaymaniyah","Kermanshah Breach Army","heavy",6,"pierre"],["eu","Sulaymaniyah","Kermanshah Breach Army","siege",3,null],["eu","Sulaymaniyah","Kermanshah Breach Army","medium",4,null],["eu","Kirkuk","Zagros Reserve","heavy",4,"margaret"],["eu","Kirkuk","Zagros Reserve","rocket",4,null],["eu","Baghdad","Central Plateau Expedition","heavy",6,"eduardo"],["eu","Baghdad","Central Plateau Expedition","rocket",4,null],["eu","Baghdad","Central Plateau Expedition","siege",3,null],["eu","Kut","Central Plateau Expedition","assault",5,null],["eu","Amarah","Khuzestan Expedition","heavy",5,null],["eu","Basra","Khuzestan Expedition","heavy",5,null],["eu","Basra","Khuzestan Expedition","rocket",3,null],["eu","Basra","Khuzestan Expedition","medium",3,null],["eu","Umm Qasr","Gulf Amphibious Corps","assault",3,null],["eu","Kuwait City","Gulf Amphibious Corps","heavy",4,null],["eu","Kuwait City","Gulf Amphibious Corps","rocket",3,null],["cf","Kermanshah","Central Zagros Guard","heavy",8,"zhaohao"],["cf","Kermanshah","Central Zagros Guard","rocket",6,null],["cf","Sanandaj","Northern Zagros Guard","heavy",6,null],["cf","Saqqez","Northern Zagros Guard","rocket",4,null],["cf","Hamadan","Northern Zagros Guard","medium",5,null],["cf","Ilam","Southern Zagros Guard","heavy",5,null],["cf","Khorramabad","Southern Zagros Guard","rocket",4,null],["cf","Ahvaz","Khuzestan Counterattack Army","heavy",7,"leifeng"],["cf","Ahvaz","Khuzestan Counterattack Army","assault",4,"meiling"],["cf","Dezful","Khuzestan Counterattack Army","rocket",3,null],["cf","Abadan","Khuzestan Counterattack Army","medium",3,null],["cf","Tabriz","Azerbaijan Reserve","heavy",7,"gaohai"],["cf","Urmia","Azerbaijan Reserve","rocket",3,null],["cf","Zanjan","Azerbaijan Reserve","medium",3,null],["cf","Tehran","Capital Defense Army","heavy",9,"honggu"],["cf","Tehran","Capital Defense Army","siege",6,null],["cf","Karaj","Capital Defense Army","rocket",6,null],["cf","Qazvin","Capital Defense Army","medium",4,null],["cf","Isfahan","Plateau Mobile Reserve","heavy",8,"cao"],["cf","Isfahan","Plateau Mobile Reserve","rocket",6,null],["cf","Arak","Plateau Mobile Reserve","assault",4,null],["cf","Shiraz","Southern Plateau Army","heavy",7,"lifeng"],["cf","Shiraz","Southern Plateau Army","rocket",3,null],["cf","Yasuj","Southern Plateau Army","medium",3,null],["cf","Bushehr","Persian Gulf Coastal Guard","heavy",3,null],["cf","Bandar Abbas","Hormuz Defense Army","heavy",5,"xingke"],["cf","Bandar Abbas","Hormuz Defense Army","rocket",3,null],["cf","Lar","Hormuz Defense Army","assault",3,null],["cf","Kerman","Eastern Plateau Reserve","heavy",4,null],["cf","Yazd","Eastern Plateau Reserve","rocket",4,null],["cf","Zahedan","Eastern Plateau Reserve","medium",3,null],["cf","Mashhad","Northeast Counterattack Reserve","heavy",4,"xianglin"],["cf","Mashhad","Northeast Counterattack Reserve","rocket",3,null],["cf","Birjand","Northeast Counterattack Reserve","medium",3,null]];
  // Ports are separate capturable sea cells, not inseparable city ownership.
  const PORTS={"Kuwait City":3,"Umm Qasr":2,"Bushehr":3,"Bandar Lengeh":2,"Bandar Abbas":3,"Bandar Jask":2,"Chabahar":3};
  const FLEETS=[["eu","Kuwait City","eu_carrier",2],["eu","Kuwait City","panzer_frosch_ii",3],["eu","Umm Qasr","eu_carrier",2],["eu","Umm Qasr","panzer_frosch_ii",3],["cf","Bushehr","cf_carrier",2],["cf","Bushehr","shui_gun_ru_ii",3],["cf","Bandar Abbas","cf_carrier",2],["cf","Bandar Abbas","shui_gun_ru_ii",3],["cf","Chabahar","cf_carrier",1],["cf","Chabahar","shui_gun_ru_ii",2]];
  const FUNDING={"eu":{"credits":1000,"industry":580,"science":112,"sakuradite":55},"cf":{"credits":1080,"industry":650,"science":118,"sakuradite":58}};
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
    // The fertile Tigris–Euphrates and Khuzestan corridors remain plains
    // even where desert polygons overlap their river valleys.
    if(p.lon>42.2&&p.lon<48.8&&p.lat>29.4&&p.lat<37.2)return 'plains';
    if(p.lon>47.5&&p.lon<50.6&&p.lat>30.1&&p.lat<32.7)return 'plains';
    if(p.lon<46.3&&p.lat<32.5&&p.lon>37)return 'desert';
    if(p.lat>36.4&&p.lon>46&&p.lon<55&&((c*17+r*11)%19)<5)return 'forest';
    return 'plains';
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No formation can reach the destination');}
  function create(player='eu',difficulty='normal',seed=201719){
    if(!SIDES.includes(player))throw Error('Unsupported Persia faction: '+player);
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
    g.scenario={id:ID,key:KEY,title:'Invasion of Persia',version:1,
      phase:'eu-persian-offensive',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,
      operationalFronts:[{"name":"Caucasus to Azerbaijan","attack":"eu","bases":["Yerevan","Goris","Nakhchivan"],"route":["Khoy","Tabriz","Zanjan","Qazvin","Tehran"]},{"name":"South Caspian Approach","attack":"eu","bases":["Bilasuvar","Lankaran"],"route":["Ardabil","Rasht","Qazvin","Karaj","Tehran"]},{"name":"Northern Zagros","attack":"eu","bases":["Mosul","Erbil","Sulaymaniyah"],"route":["Saqqez","Sanandaj","Hamadan","Arak","Isfahan"]},{"name":"Central Zagros","attack":"eu","bases":["Kirkuk","Baghdad"],"route":["Kermanshah","Khorramabad","Arak","Qom","Tehran"]},{"name":"Khuzestan Corridor","attack":"eu","bases":["Kut","Amarah","Basra"],"route":["Ahvaz","Dezful","Yasuj","Shiraz","Isfahan"]},{"name":"Persian Gulf","attack":"eu","bases":["Kuwait City","Umm Qasr"],"route":["Bushehr","Bandar Lengeh","Bandar Abbas","Chabahar"]}],
      offensiveAxes:{eu:{"Caucasus Expedition":["Tabriz","Zanjan","Qazvin","Tehran"],"Aras Crossing Army":["Khoy","Urmia","Tabriz"],"Azerbaijan Breakthrough":["Urmia","Tabriz","Zanjan"],"Caspian Flank":["Ardabil","Rasht","Tehran"],"Northern Zagros Expedition":["Saqqez","Sanandaj","Hamadan"],"Kermanshah Breach Army":["Kermanshah","Khorramabad","Arak"],"Central Plateau Expedition":["Kermanshah","Arak","Isfahan"],"Khuzestan Expedition":["Ahvaz","Dezful","Yasuj","Shiraz"],"Gulf Amphibious Corps":["Bushehr","Bandar Abbas","Chabahar"]}},
      riverCrossings:['Baghdad','Kut','Amarah','Basra'],
      mountainPasses:['Urmia','Tabriz','Sanandaj','Kermanshah','Khorramabad','Ahvaz','Yasuj']};
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    // Four 2-bit classifications per byte. Embed instead of loading maps online.
    const packed=root.IRAQ_IRAN_COAST_CLASSES||
      (typeof require==='function'?require('./iraq-iran-coast.js'):null);
    const raw=typeof atob==='function'?atob(packed):Buffer.from(packed,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/4)throw Error('Corrupt Persia 20–80% coastline');
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
      if(!at)throw Error('Persia city inaccessible: '+name);
      const capital=name==='Yerevan'||name==='Baghdad'||name==='Tehran';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
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
      if(!s||s.owner!==side)throw Error('Invalid Persia Army Group staging '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
          !E.TERRAIN[t.terrain]?.blocked&&!E.unitAt(g,t)&&t.owner===side&&
          (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),14);
        if(!at)throw Error('Cannot deploy Persia army near '+name);
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
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([res,n])=>[res,Math.round(n)-base[res]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]={"eu":{"credits":2000,"industry":500,"science":224,"sakuradite":110},"cf":{"credits":2000,"industry":500,"science":236,"sakuradite":116}}[side][resource];
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>v!==player))
        for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
          E.addDifficultyFrames(u,difficulty);
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'The E.U. advances from the southern Caucasus and Iraq into Chinese-held Iran. Break the Zagros, take Tehran and contest the Gulf; total city conquest decides the battle.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((score,s)=>score+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Persia campaign cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has captured all cities across Iran and its approaches.'};
    return null;
  }
  const api={id:ID,title:'Invasion of Persia',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={
    terrainCosts:{mountain:2},
    map:{centreSampled:true,coastBuffer:1,overlays:['regionalRivers'],overviewMarkers:true},
    elite:true,
    ai:{doctrine:'europe',recovery:true,operationalAxes:{invader:'eu',defender:'cf',axes:{"Caucasus Expedition":["Tabriz","Zanjan","Qazvin","Tehran"],"Aras Crossing Army":["Khoy","Urmia","Tabriz"],"Azerbaijan Breakthrough":["Urmia","Tabriz","Zanjan"],"Caspian Flank":["Ardabil","Rasht","Tehran"],"Northern Zagros Expedition":["Saqqez","Sanandaj","Hamadan"],"Kermanshah Breach Army":["Kermanshah","Khorramabad","Arak"],"Central Plateau Expedition":["Kermanshah","Arak","Isfahan"],"Khuzestan Expedition":["Ahvaz","Dezful","Yasuj","Shiraz"],"Gulf Amphibious Corps":["Bushehr","Bandar Abbas","Chabahar"]},defenderHubs:['Tabriz','Ardabil','Kermanshah','Ahvaz','Hamadan','Tehran','Isfahan','Shiraz','Bandar Abbas']}},
    text:{
      terrain:'Zagros and Alborz mountains cost 2 movement. Valleys and named passes remain traversable; Persian Gulf water separates the coasts.',
      era:'Persia · Alternate 2017',
      intro:'Europia United invades Chinese-held Iran from Armenia, Azerbaijan, Iraq and the Persian Gulf. Break the Zagros toward Tehran and Isfahan, or land through Hormuz. Capture all '+CITIES.length+' cities to win; no turn limit.',
      diplomacy:'Only the E.U. and Chinese Federation fight. All Iranian cities begin under Federation control. Gulf ports are independently capturable, and the Caspian is not connected to the Gulf.',
      elite:'Elite Persia uses standard faction-specific Elite Force conversion, named officers, production and research rules. Carrier hulls remain conventional.',
      focus:{eu:'Yerevan',cf:'Kermanshah'}},
    blurbs:{
      eu:'Attack Tabriz from Armenia and Azerbaijan; break the Zagros from Iraq; advance into Khuzestan and launch Gulf landings. The Plateau is the strategic prize.',
      cf:'Hold Zagros mountain cities; reinforce Tehran, Isfahan and Ahvaz from interior industry; contest the Strait of Hormuz while retaining mobile reserves.'}
  };
  E.scenarios={...(E.scenarios||{}),[KEY]:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

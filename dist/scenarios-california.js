/* Invasion of California — Chinese Federation offensive from Oregon and the Pacific.
   Existing GSHHS intermediate coastal polygons retain the 20–80% land rule on
   the original 160 × 120 WGS84 hex grid. Oregon is the Federation staging area.
   Californian cities, defended independent ports, mountain passes and
   offshore transports form a self-contained, no-turn-limit scenario. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=160,ROWS=120,SIDES=['cf','britannia'];
  const BOUNDS={west:-127,east:-112,north:45,south:31.5};
  const K=Math.cos(38.25*Math.PI/180);
  const PROJECTION={centerLon:-119.5,centerLat:38.25,angle:0,uMin:-7.5*K,uMax:7.5*K,vMin:-6.75,vMax:6.75};
  // S: <20% land (sea), C: 20–80% (coast), L: >80% (land).
  // GSHHS polygons include the Channel Islands and real San Francisco Bay.
  const COAST_ROWS="S31,C1,L128;S31,L128,C1;S31,C1,L128;S31,L128,C1;S31,L129;S30,C1,L128,C1;S31,L129;S30,L129,C1;S30,C1,L129;S30,L129,C1;S30,L130;S29,C1,L129,C1;S29,C1,L130;S28,C1,L130,C1;S28,C1,L131;S27,C1,L131,C1;S27,C1,L132;S26,C1,L132,C1;S26,C1,L133;S25,C1,L133,C1;S27,C1,L132;S27,L132,C1;S27,C1,L132;S27,L132,C1;S27,C1,L132;S27,C1,L131,C1;S29,C1,L130;S29,C1,L129,C1;S29,C1,L130;S30,L129,C1;S31,L129;S31,L128,C1;S31,L129;S30,C1,L128,C1;S30,C1,L129;S30,L129,C1;S30,C1,L129;S29,C1,L129,C1;S28,C1,L131;S27,C1,L131,C1;S27,C1,L132;S27,C1,L131,C1;S28,C1,L131;S29,C2,L128,C1;S31,C1,L128;S32,C1,L126,C1;S33,C1,L126;S33,C1,L125,C1;S34,C1,L125;S33,C1,L125,C1;S34,L126;S34,L125,C1;S35,L125;S34,C1,L124,C1;S35,C1,L124;S36,C1,L122,C1;S38,C1,L121;S39,C1,L119,C1;S41,C1,L118;S41,C1,L117,C1;S43,L117;S42,C1,L4,C1,S1,C1,L109,C1;S44,C1,L3,S1,C1,L110;S46,C2,S1,C1,L109,C1;S48,L1,C2,L109;S47,C1,L1,S2,L108,C1;S48,L3,C2,L107;S48,C1,L110,C1;S49,L111;S48,C1,L110,C1;S50,C1,L109;S51,C3,L105,C1;S55,C1,L104;S55,L104,C1;S54,C1,L105;S53,C1,L105,C1;S54,C1,L105;S54,C1,L104,C1;S56,C1,L103;S57,C1,L101,C1;S59,L101;S59,C1,L99,C1;S60,C1,L99;S61,C1,L97,C1;S63,C1,L96;S65,L94,C1;S65,C1,L94;S65,C2,L92,C1;S68,L92;S67,L92,C1;S68,L92;S67,C1,L91,C1;S68,L92;S69,C5,L85,C1;S77,C1,S2,C1,L79;S81,C1,L77,C1;S83,C1,L76;S72,C2,S1,C4,S6,C5,L69,C1;S72,C3,S16,C1,L68;S91,L68,C1;S92,C1,S2,C1,L64;S96,C2,L61,C1;S90,C1,S8,C1,L60;S90,C2,S8,C1,L58,C1;S102,L58;S102,C1,L56,C1;S103,C1,L56;S89,C2,S12,C1,L55,C1;S91,C1,S12,L56;S104,C1,L54,C1;S105,C1,L54;S105,L54,C1;S106,L54;S106,C1,L52,C1;S108,L52;S107,C1,L51,C1;S109,C1,L50;S110,L19,C3,L27,C1;S110,C1,L19,C2,S1,C1,L26;S109,C1,L19,C1,S5,C1,L2,C1,S1,C1,L18,C1".split(';').map(encoded=>{
    const cells=new Uint8Array(COLS);let c=0;
    for(const run of encoded.split(',')){
      const n=Number(run.slice(1)),kind=run[0]==='S'?0:run[0]==='C'?1:2;
      if(!n||c+n>COLS)throw Error('Corrupt California coastline row');
      cells.fill(kind,c,c+n);c+=n;
    }
    if(c!==COLS)throw Error('Incomplete California coastline row');
    return cells;
  });
  if(COAST_ROWS.length!==ROWS)throw Error('Incomplete California coastline');
  function coastCoverageClass(c,r){return COAST_ROWS[r][c];}
  // [name, WGS84 longitude, latitude, controller, settlement tier, fortified]
  const CITIES=[["Eugene",-123.09,44.05,"cf",3,true],["Roseburg",-123.34,43.22,"cf",2,false],["Coos Bay",-124.22,43.37,"cf",2,true],["Newport",-124.05,44.64,"cf",2,true],["Florence",-124.1,43.98,"cf",2,true],["Medford",-122.88,42.33,"cf",3,true],["Ashland",-122.71,42.19,"cf",2,false],["Grants Pass",-123.33,42.44,"cf",2,false],["Brookings",-124.29,42.06,"cf",2,true],["Klamath Falls",-121.78,42.22,"cf",3,true],["Bend",-121.32,44.06,"cf",2,false],["Lakeview",-120.35,42.19,"cf",2,false],["Crescent City",-124.2,41.75,"britannia",2,true],["Eureka",-124.16,40.8,"britannia",3,true],["Arcata",-124.08,40.87,"britannia",2,false],["Redding",-122.39,40.59,"britannia",3,true],["Mount Shasta",-122.31,41.31,"britannia",2,true],["Yreka",-122.64,41.73,"britannia",2,false],["Chico",-121.84,39.73,"britannia",2,false],["Fort Bragg",-123.81,39.45,"britannia",2,true],["Ukiah",-123.21,39.15,"britannia",2,false],["Santa Rosa",-122.71,38.44,"britannia",3,true],["Napa",-122.29,38.3,"britannia",2,false],["Vallejo",-122.26,38.1,"britannia",2,true],["Sacramento",-121.49,38.58,"britannia",3,true],["Davis",-121.74,38.54,"britannia",2,false],["Stockton",-121.29,37.96,"britannia",3,true],["Modesto",-120.99,37.64,"britannia",2,false],["Merced",-120.48,37.3,"britannia",2,false],["Fresno",-119.79,36.74,"britannia",3,true],["Visalia",-119.29,36.33,"britannia",2,false],["Bakersfield",-119.02,35.37,"britannia",3,true],["San Francisco",-122.42,37.78,"britannia",3,true],["Oakland",-122.27,37.8,"britannia",3,true],["Richmond",-122.35,37.94,"britannia",2,true],["San Jose",-121.89,37.34,"britannia",3,true],["Palo Alto",-122.14,37.44,"britannia",2,false],["Santa Cruz",-122.03,36.97,"britannia",2,true],["Monterey",-121.89,36.6,"britannia",3,true],["Salinas",-121.66,36.68,"britannia",2,false],["San Luis Obispo",-120.66,35.28,"britannia",2,false],["Morro Bay",-120.85,35.37,"britannia",2,true],["Santa Barbara",-119.7,34.42,"britannia",3,true],["Ventura",-119.29,34.28,"britannia",2,true],["Oxnard",-119.18,34.2,"britannia",2,true],["Los Angeles",-118.24,34.05,"britannia",3,true],["Long Beach",-118.19,33.77,"britannia",3,true],["Anaheim",-117.91,33.84,"britannia",2,false],["Irvine",-117.83,33.68,"britannia",2,false],["Riverside",-117.4,33.95,"britannia",3,true],["San Bernardino",-117.29,34.11,"britannia",3,true],["Palm Springs",-116.55,33.83,"britannia",2,false],["Barstow",-117.02,34.9,"britannia",2,false],["Lancaster",-118.14,34.7,"britannia",2,false],["San Diego",-117.16,32.72,"britannia",3,true],["Oceanside",-117.38,33.2,"britannia",2,true],["Carlsbad",-117.35,33.16,"britannia",2,false],["El Centro",-115.56,32.79,"britannia",2,true],["Bishop",-118.4,37.36,"britannia",2,false],["Truckee",-120.18,39.33,"britannia",2,true],["South Lake Tahoe",-119.98,38.94,"britannia",2,true],["Placerville",-120.8,38.73,"britannia",2,false],["Auburn",-121.08,38.9,"britannia",2,false]];
  // Federation northern Army Groups and carrier-embarked assault formations.
  // Preserve the named Britannian commanders and reinforce inland counterattack reserves.
  const ARMY_GROUPS=[
    ["cf","Medford","heavy",5,"xingke"],
    ["cf","Medford","rocket",3,"honggu"],
    ["cf","Ashland","assault",4,"cao"],
    ["cf","Grants Pass","heavy",4,"leifeng"],
    ["cf","Klamath Falls","siege",3,"chaojielun"],
    ["cf","Klamath Falls","medium",4,"xianglin"],
    ["cf","Brookings","assault",3,"lifeng"],
    ["cf","Roseburg","rocket",2,"vritra"],
    ["cf","Bend","medium",3,"meiling"],
    ["cf","Eugene","heavy",3,"zhaohao"],
    ["cf","North Pacific Force","heavy",3,"zidien"],
    ["cf","North Pacific Force","assault",3,"ren"],
    ["cf","North Pacific Force","rocket",2,null],
    ["cf","Golden Gate Force","heavy",3,"sawasaki"],
    ["cf","Golden Gate Force","assault",3,"chengzhong"],
    ["cf","Golden Gate Force","siege",3,"rakshata"],
    ["cf","Central Coast Force","heavy",3,null],
    ["cf","Central Coast Force","medium",3,null],
    ["cf","Central Coast Force","rocket",3,"huangqian"],
    ["cf","Southern Beaches Force","heavy",3,null],
    ["cf","Southern Beaches Force","assault",3,"xiawang"],
    ["cf","Southern Beaches Force","rocket",3,null],
    ["britannia","Eureka","heavy",3,"cornelia"],
    ["britannia","Eureka","rocket",2,"cecile"],
    ["britannia","Redding","heavy",3,"guilford"],
    ["britannia","Mount Shasta","medium",2,"gino"],
    ["britannia","Sacramento","heavy",5,"bismarck"],
    ["britannia","Sacramento","rocket",3,"darlton"],
    ["britannia","Sacramento","siege",2,null],
    ["britannia","Stockton","medium",3,"jeremiah"],
    ["britannia","Fresno","heavy",4,"villetta"],
    ["britannia","Fresno","rocket",2,null],
    ["britannia","Bakersfield","heavy",4,"oldrin"],
    ["britannia","Bakersfield","siege",2,null],
    ["britannia","San Francisco","heavy",4,"suzaku"],
    ["britannia","San Francisco","rocket",3,null],
    ["britannia","Oakland","heavy",3,null],
    ["britannia","San Jose","heavy",4,null],
    ["britannia","Monterey","medium",3,null],
    ["britannia","Santa Barbara","medium",3,null],
    ["britannia","Los Angeles","heavy",5,null],
    ["britannia","Los Angeles","siege",3,null],
    ["britannia","Long Beach","rocket",3,null],
    ["britannia","Riverside","heavy",4,null],
    ["britannia","San Bernardino","rocket",3,null],
    ["britannia","San Diego","heavy",5,null],
    ["britannia","San Diego","rocket",3,null],
    ["britannia","Barstow","medium",2,null],
    ["britannia","Truckee","medium",2,null],
    ["britannia","South Lake Tahoe","medium",2,null],
    ["britannia","Bishop","medium",2,null],
    ["britannia","El Centro","assault",2,null],
    ["britannia","Chico","assault",3,null],
    ["britannia","Sacramento","medium",3,null],
    ["britannia","Fresno","medium",3,null],
    ["britannia","Bakersfield","rocket",2,null],
    ["britannia","Santa Barbara","rocket",2,null],
    ["britannia","Los Angeles","medium",3,null],
    ["britannia","San Diego","assault",3,null],
    ["britannia","Oceanside","medium",2,null]
  ];
  const PORTS={"Coos Bay":2,"Newport":2,"Florence":2,"Brookings":2,"Crescent City":3,"Eureka":3,"Fort Bragg":2,"Vallejo":2,"San Francisco":3,"Oakland":3,"Richmond":2,"Santa Cruz":2,"Monterey":3,"Morro Bay":2,"Santa Barbara":3,"Ventura":2,"Oxnard":2,"Los Angeles":3,"Long Beach":3,"San Diego":3,"Oceanside":2};
  // Five Chinese carriers per amphibious axis support the enlarged embarked corps;
  // Shui Gun-Ru II escorts operate independently of carrier cargo.
  const FLEETS=[
    ["cf","North Pacific Force",-125.35,41.55,"cf_carrier",5],
    ["cf","Golden Gate Force",-124.25,37.95,"cf_carrier",5],
    ["cf","Central Coast Force",-122.35,35.25,"cf_carrier",5],
    ["cf","Southern Beaches Force",-120.3,33.1,"cf_carrier",5],
    ["cf","North Pacific Force",-125.35,41.55,"shui_gun_ru_ii",3],
    ["cf","Golden Gate Force",-124.25,37.95,"shui_gun_ru_ii",3],
    ["cf","Central Coast Force",-122.35,35.25,"shui_gun_ru_ii",3],
    ["cf","Southern Beaches Force",-120.3,33.1,"shui_gun_ru_ii",3],
    ["britannia","Eureka",null,null,"carrier_battleship",2],
    ["britannia","San Francisco",null,null,"carrier_battleship",3],
    ["britannia","Long Beach",null,null,"carrier_battleship",3],
    ["britannia","San Diego",null,null,"carrier_battleship",3],
    ["britannia","Oakland",null,null,"portman_ii",3],
    ["britannia","Monterey",null,null,"portman_ii",2],
    ["britannia","Oxnard",null,null,"portman_ii",2],
    ["britannia","San Diego",null,null,"portman_ii",3]
  ];
  const FUNDING={cf:{credits:1250,industry:720,science:105,sakuradite:50},
    britannia:{credits:1020,industry:670,science:88,sakuradite:40}};
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
  // Sierra Nevada, Cascade volcanoes, Coast Ranges, Transverse Ranges,
  // Mojave/Colorado deserts and the broad Central Valley.
  const MOUNTAINS=[
    [-120.3,38.3,0.54,3.2],[-121.6,40.8,0.5,1.8],[-122.25,41.5,0.5,1.1],
    [-123.3,40.8,0.72,1.3],[-123.6,39.0,0.55,1.5],[-122.3,37.3,0.42,1.3],
    [-121.0,35.6,0.6,1.3],[-119.8,34.55,0.8,0.4],[-118.4,34.4,1.5,0.45],
    [-116.7,34.0,0.7,0.8],[-117.2,36.0,1.0,1.7]];
  const FORESTS=[[-123.3,41.1,1.2,1.7],[-123.6,39.8,0.6,1.3],
    [-121.5,41.0,0.9,2.1],[-120.3,38.7,0.85,2.2],[-123,43.2,1.1,1.6],
    [-122.4,38.3,0.65,1.1],[-121.4,36.7,0.55,1.0]];
  const DESERTS=[[-115.5,35.5,2.3,2.0],[-116.1,33.9,1.25,1.0],
    [-118.0,36.8,0.45,1.2],[-115.3,32.8,1.3,0.9]];
  const VALLEYS=[[-121.6,39,0.9,1.8],[-120.7,37.3,0.8,1.9],
    [-119.3,35.9,0.7,1.0],[-122.9,42.45,0.6,1.0],[-118.15,34,0.55,0.55]];
  // Open well-known real road/rail gaps without punching through the ocean.
  const PASSES=[[-122.6,42.05,0.38],[-121.45,40.45,0.2],
    [-120.32,39.31,0.23],[-120.04,38.81,0.21],[-119.25,37.91,0.22],
    [-118.46,35.1,0.30],[-117.42,34.32,0.27],[-119.3,36.3,0.3]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p){
    if(PASSES.some(([x,y,r])=>Math.hypot((p.lon-x)*.8,p.lat-y)<r))return 'plains';
    const v=density(p,VALLEYS),m=density(p,MOUNTAINS),
      f=density(p,FORESTS),d=density(p,DESERTS);
    if(v>.48)return 'plains';
    if(d>.45)return 'desert';
    if(m>.67)return 'mountain';
    if(f>.51||m>.32)return 'forest';
    return 'plains';
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
  function create(player='britannia',difficulty='normal',seed=201717){
    if(!SIDES.includes(player))throw Error('Unsupported Invasion of California faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'invasion-california',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:{britannia:'britannia',cf:'cf'}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    // The 'europe' doctrine is the shared regional AI planner, not a faction identifier.
    g.scenario={id:'invasion-california',key:'california',title:'Invasion of California',
      version:3,phase:'federation-pacific-offensive',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,operationalFronts:[
        {name:'Oregon–Siskiyou land offensive',attack:'cf',objective:'Redding'},
        {name:'Sacramento convergence',attack:'cf',objective:'Sacramento'},
        {name:'Golden Gate amphibious offensive',attack:'cf',objective:'San Francisco'},
        {name:'Central Coast and valley offensive',attack:'cf',objective:'Fresno'},
        {name:'Southern California amphibious offensive',attack:'cf',objective:'Los Angeles'},
        {name:'Britannian northern reserve',attack:'britannia',objective:'Sacramento'},
        {name:'Britannian central reserve',attack:'britannia',objective:'Bakersfield'},
        {name:'Britannian southern reserve',attack:'britannia',objective:'San Diego'}
      ],rivers:{Sacramento:[[-122.3,40.3],[-121.5,39],[-121.55,38.6]],SanJoaquin:[[-119.7,37.8],[-120.9,37.5],[-121.45,38]],Colorado:[[-114.75,36],[-114.55,34.5],[-114.7,32.8]],Klamath:[[-121.8,42],[-123.1,41.5],[-124.1,41.6]]}};
    // Only Britannia and the Chinese Federation are playable here.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia')),
      cf:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('cf'))
    };
    // Authoritative tactical coast: each cell's clipped polygon land share is
    // <20%=sea, 20–80%=coast, >80%=land. Unlike a center-point mask this
    // preserves real bay inlets, Channel Islands, and narrow coastal approaches.
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),fraction=coastCoverageClass(c,r);
      return {c,r,owner:null,terrain:fraction===0?'sea':
        fraction===1?'coast':landscape(p)};
    });
    const excludedLand=new Uint8Array(g.tiles.length);
    // Audit connectivity: a ship may use sea and mixed-coast cells only.
    // No artificial inland waterways or shortcuts across Californian land.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place California city '+name);
      const capital=false; // Pendragon is not inside the California theater.
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Coastal Defence Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
        industry:Math.round((capital?25:6*tier)*.55),
        science:Math.round((1+tier)*.55),producedTurn:0});
      // Do not overwrite a mixed-coast designation for a harbour.
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
      if(!g.stations.some(v=>v.name===name))continue; // Offshore Federation groups embark below.
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
      const s=lon==null?g.stations.find(v=>v.name===name):null;
      const anchor=s||locate(lon,lat);
      if(!E.TYPES[type]?.naval)throw Error('Invalid California fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,anchor,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),18);
        if(!at)throw Error('Cannot deploy navy at '+name);
        const ship=E.newUnit(g,type,side,at.c,at.r);
        if(side==='cf'&&lon!=null)ship.invasionGroup=name;
        fleet.units.push(ship.id);
      }
      g.scenario.groups.push(fleet);
    }
    // Load all four Federation landing corps into the matching carrier groups before turn one.
    const carriers=g.units.filter(u=>u.side==='cf'&&E.TYPES[u.type].naval==='ship');
    const passengers=[];
    for(const [side,name,cls,count,commander] of ARMY_GROUPS){
      if(side!=='cf'||g.stations.some(v=>v.name===name))continue;
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
    // Keep all four Pacific invasion corridors navigable.
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
    // No scripted Sakuradite site: standard research and refinery balance.
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]={"cf":{"credits":2000,"industry":500,"science":210,"sakuradite":100},"britannia":{"credits":2000,"industry":500,"science":264,"sakuradite":120}}[side][resource];
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>E.foe(g,v,player)))
        for(const u of g.units.flatMap(v=>[v,...(v.cargo||[])])
          .filter(v=>v.side===side&&E.TYPES[v.type].naval!=='ship'))
          E.addDifficultyFrames(u,difficulty);
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.reduce((n,u)=>
      n+(u.side===s?1:0)+(u.cargo||[]).filter(v=>v.side===s).length,0)]));
    E.log(g,'The Chinese Federation advances south from conquered Oregon while four carrier task forces land around Northern California, San Francisco Bay, the Central Coast and Southern California.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    const enemy=side==='cf'?'britannia':'cf';
    const count=g.stations.filter(s=>s.owner===enemy).length;
    return 'Conquer every '+(enemy==='britannia'?'Britannian':'Federation')+
      ' city ('+count+' remain). No turn limit; Pendragon is a separate battle.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='invasion-california'||
        g.stations.length!==CITIES.length)return null;
    if(!g.stations.some(s=>s.owner==='britannia'))return {winner:'cf',team:'cf',
      reason:'The Chinese Federation controls every Britannian city in California. The offensive against Pendragon remains separate.'};
    if(!g.stations.some(s=>s.owner==='cf') &&
       !E.allUnits(g).some(u=>u.side==='cf'&&u.hp>0))return {winner:'britannia',team:'britannia',
      reason:'Britannia has reclaimed every Federation staging city in Oregon and California.'};
    return null;
  }
  const api={id:'invasion-california',title:'Invasion of California',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,overlays:['regionalRivers']},
    elite:true,expeditionSide:'cf',
    text:{
      era:"California and Southern Oregon · Alternate 2017",
      intro:"The Chinese Federation launches four carrier-led landings supported by an offensive from conquered Oregon. Britannia holds the California cities; China controls the Oregon staging towns.",
      diplomacy:"Two sides at war from turn 1. Capture every hostile city without a turn limit. Pendragon remains a separate final campaign battle.",
      elite:"Existing Elite Force rules replace eligible land formations; fleets retain conventional naval roles and rival commanders follow the current difficulty rules.",
      focus:{
        cf:"Medford",
        britannia:"Sacramento"
      }
    },
    blurbs:{
      cf:"Advance south from Federation-held Oregon while Chinese carrier fleets land near San Francisco, the central coast and southern California.",
      britannia:"Defend San Francisco, Los Angeles, San Diego and the Central Valley with layered Army Groups, Pacific naval interception and reinforcements from Sierra passes."
    }};
  E.scenarios={...(E.scenarios||{}),california:api,
    byId:{...(E.scenarios?.byId||{}),'invasion-california':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

/* Chinese Federation Invasion of the Pacific Northwest (2017 a.t.b.).
 * Scenario-only regional model; no World Campaign registry or shared engine changes.
 * 176 x 120 WGS84 / GSHHS intermediate shoreline atlas. Hex classifications:
 * <20% dry = sea, 20-80% dry = mixed coastline, >80% dry = land.
 * Built from 61 samples per hex; geographic renderer uses the same global
 * GSHHG-family shoreline and reprojects it via this scenario's projection.
 */
(function(root){
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  if(!E)throw Error('Pacific Northwest scenario requires Knightmare engine');
  const ID='cf-pacific-northwest',SIDES=['cf','britannia'];
  const COLS=176,ROWS=120;
  const BOUNDS={west:-130.1,east:-112.45,north:49.15,south:41.85};
  const DLON=(BOUNDS.east-BOUNDS.west)/COLS,DLAT=(BOUNDS.north-BOUNDS.south)/ROWS;
  const MID_LON=(BOUNDS.west+BOUNDS.east)/2,MID_LAT=(BOUNDS.north+BOUNDS.south)/2;
  const K=Math.cos(MID_LAT*Math.PI/180);
  const PROJECTION={centerLon:MID_LON,centerLat:MID_LAT,angle:0,
    uMin:(BOUNDS.west+DLON/2-MID_LON)*K,
    uMax:(BOUNDS.east-DLON/2-MID_LON)*K,
    vMin:BOUNDS.south+DLAT/2-MID_LAT,vMax:BOUNDS.north-DLAT/2-MID_LAT};
  // Encoded coastline generated from GSHHS intermediate-resolution land
  // polygons, sampling hex footprints rather than drawing arbitrary hex islands.
  // S = sea; C = genuinely mixed coast (20-80%); L = land.
  const COAST_ATLAS="S42,C2,L8,C1,L9,C1,S6,C1,L106;S42,C1,L8,C1,L10,C1,S6,L1,C2,L103,C1;S44,C1,L2,S1,L1,C2,L12,S7,C1,S2,L103;S45,C1,S4,C1,L12,S1,C1,S7,C1,L102,C1;S50,C1,L13,C2,S7,L103;S48,C1,L15,C1,L1,S7,L102,C1;S49,C1,L14,C3,S7,C2,L100;S50,C1,L14,C1,S4,C2,S3,L100,C1;S53,L12,C1,L1,S2,C2,L1,C1,S3,L100;S54,C1,L10,C2,S1,C1,L1,S5,C1,L99,C1;S56,C2,L9,C1,S1,C1,L1,S3,C1,S1,L100;S58,C1,L8,C1,S5,C1,L101,C1;S54,C1,S6,C1,L4,S8,C2,L100;S53,C1,L1,C1,S7,C2,S8,C1,L1,S1,L99,C1;S54,L3,C2,S14,C4,L99;S53,C1,L5,C1,S13,C4,L98,C1;S53,C1,L8,C1,L1,C2,S2,C2,S2,C1,S1,C3,L99;S53,C1,L16,C3,S1,C3,L98,C1;S54,L18,C2,S1,L2,S1,C1,L97;S53,C1,L19,C1,S1,C1,L1,C1,L97,C1;S54,C1,L19,C2,S1,C1,L98;S55,L18,C2,S1,C1,L98,C1;S56,L16,C2,L2,S1,L99;S56,L15,C2,L1,C1,S1,C2,L97,C1;S57,L14,C2,L1,C1,S1,C1,L1,C1,L97;S56,C1,L13,C1,L2,C2,S1,C2,L97,C1;S57,C1,L12,C1,L3,C3,L1,C1,L97;S57,L12,C1,L5,S1,C1,L98,C1;S57,C1,L11,C1,L1,C1,L3,C1,S1,C1,L98;S57,L12,C2,L1,C2,L1,S2,L98,C1;S58,C1,L13,S1,C1,L1,C2,L99;S58,L11,C1,L1,S1,L1,S1,C1,L100,C1;S59,L12,C1,S3,L101;S58,C1,L11,C4,L101,C1;S59,L117;S58,C1,S1,C1,L114,C1;S59,C1,S1,C1,L114;S59,C1,L115,C1;S59,C1,L116;S59,C1,L1,C1,L113,C1;S62,L114;S59,C1,S1,L114,C1;S60,C2,L114;S59,C1,S1,L114,C1;S60,C2,L114;S60,C1,L114,C1;S60,C1,L115;S61,C1,S2,C2,L109,C1;S61,C2,S2,L111;S61,L114,C1;S61,C1,L114;S61,L114,C1;S61,L115;S60,C1,L114,C1;S61,L115;S60,C1,L114,C1;S61,C1,L114;S61,L114,C1;S61,C1,L114;S61,C1,L113,C1;S61,L115;S61,L114,C1;S61,L115;S61,L114,C1;S61,L115;S60,C1,L114,C1;S61,L115;S60,L115,C1;S60,C1,L115;S60,L115,C1;S60,C1,L115;S59,C1,L115,C1;S60,L116;S59,C1,L115,C1;S60,C1,L115;S59,C1,L115,C1;S60,L116;S59,C1,L115,C1;S60,L116;S59,L116,C1;S59,C1,L116;S59,L116,C1;S59,C1,L116;S59,L116,C1;S59,C1,L116;S59,L116,C1;S59,L117;S58,C1,L116,C1;S59,L117;S58,C1,L116,C1;S58,C1,L117;S58,L117,C1;S58,C1,L117;S57,C1,L117,C1;S57,C2,L117;S56,C1,L118,C1;S57,L119;S56,C1,L118,C1;S56,C1,L119;S56,L119,C1;S56,C1,L119;S55,C1,L119,C1;S56,L120;S55,L120,C1;S55,C1,L120;S55,C1,L119,C1;S56,C1,L119;S56,C1,L118,C1;S57,L119;S56,L119,C1;S56,C1,L119;S56,L119,C1;S56,C1,L119;S56,C1,L118,C1;S57,L119;S57,L118,C1;S57,C1,L118;S58,L117,C1;S59,L117;S58,L117,C1";
  const COVERAGE=COAST_ATLAS.split(';').map(line=>{
    const row=new Uint8Array(COLS);let c=0;
    for(const part of line.split(',')){
      const n=+part.slice(1),value=part[0]==='S'?0:part[0]==='C'?1:2;
      if(!n||c+n>COLS)throw Error('Corrupt Pacific Northwest coast row');
      row.fill(value,c,c+n);c+=n;
    }
    if(c!==COLS)throw Error('Truncated Pacific Northwest coast row');
    return row;
  });
  if(COVERAGE.length!==ROWS)throw Error('Truncated Pacific Northwest coastline atlas');

  // City coordinates are real-world WGS84. Every settlement begins Britannian.
  // Conquest California is deliberately outside the battlefield (southern edge 41.85).
  const CITIES=[
    ['Seattle',-122.332,47.606,3,true],['Tacoma',-122.444,47.253,3,true],
    ['Olympia',-122.901,47.037,3,true],['Everett',-122.202,47.979,3,true],
    ['Bellingham',-122.477,48.752,2,true],['Mount Vernon',-122.338,48.421,2,false],
    ['Anacortes',-122.612,48.512,2,true],['Oak Harbor',-122.646,48.294,2,true],
    ['Port Angeles',-123.430,48.118,2,true],['Port Townsend',-122.761,48.118,2,true],
    ['Bremerton',-122.628,47.567,2,true],['Aberdeen',-123.817,46.975,2,true],
    ['Longview',-122.938,46.138,2,true],['Vancouver (Washington)',-122.661,45.638,3,true],
    ['Centralia',-122.954,46.717,2,false],['Shelton',-123.099,47.216,2,false],
    ['Sequim',-123.101,48.080,2,false],['Spokane',-117.426,47.658,3,true],
    ['Yakima',-120.506,46.602,3,true],['Kennewick',-119.137,46.211,3,true],
    ['Wenatchee',-120.310,47.424,2,true],['Ellensburg',-120.549,46.997,2,true],
    ['Moses Lake',-119.278,47.131,2,false],['Walla Walla',-118.343,46.064,2,true],
    ['Pullman',-117.179,46.731,2,true],['Omak',-119.527,48.410,2,false],
    ['Portland',-122.676,45.515,3,true],['Salem',-123.035,44.942,3,true],
    ['Eugene',-123.087,44.052,3,true],['Bend',-121.315,44.059,3,true],
    ['Medford',-122.876,42.327,3,true],['Astoria',-123.831,46.187,2,true],
    ['Ilwaco',-124.029,46.310,2,true],['Tillamook',-123.844,45.456,2,true],
    ['Newport',-124.054,44.636,2,true],['Florence',-124.100,43.983,2,true],
    ['Coos Bay',-124.218,43.366,3,true],['Bandon',-124.410,43.119,2,true],
    ['Gold Beach',-124.422,42.407,2,true],['Brookings',-124.284,42.053,2,true],
    ['Corvallis',-123.262,44.565,2,false],['Albany',-123.105,44.636,2,false],
    ['Roseburg',-123.341,43.216,2,true],['Grants Pass',-123.329,42.439,2,true],
    ['Ashland',-122.710,42.195,2,false],['Klamath Falls',-121.782,42.225,2,true],
    ['Redmond',-121.174,44.273,2,false],['Hood River',-121.521,45.709,2,true],
    ['The Dalles',-121.179,45.601,2,true],['Pendleton',-118.788,45.673,2,true],
    ['La Grande',-118.087,45.324,2,true],['Baker City',-117.834,44.774,2,false],
    ['Ontario',-116.963,44.026,2,true],['Burns',-118.788,43.587,2,false],
    ['Boise',-116.203,43.616,3,true],['Nampa',-116.563,43.540,2,true],
    ['Caldwell',-116.688,43.663,2,false],['Coeur d\'Alene',-116.780,47.678,3,true],
    ['Sandpoint',-116.552,48.277,2,true],['Lewiston',-117.017,46.416,2,true],
    ['Moscow',-117.001,46.732,2,false],['McCall',-116.097,44.911,2,true],
    ['Mountain Home',-115.692,43.132,2,false]
  ];
  // Only real ocean/Sound/estuary ports are shipyards; Portland is inland
  // rather than being given an invented sea route through the Columbia Gorge.
  const PORTS={
    'Seattle':3,'Tacoma':3,'Everett':3,'Bellingham':2,'Anacortes':2,
    'Oak Harbor':2,'Port Angeles':2,'Port Townsend':2,'Bremerton':3,
    'Aberdeen':2,'Astoria':3,'Ilwaco':2,'Tillamook':2,'Newport':2,
    'Florence':2,'Coos Bay':3,'Bandon':2,'Gold Beach':2,'Brookings':2
  };
  const RIVERS={
    Columbia:[[-118.98,47.96],[-119.90,47.48],[-120.31,47.42],[-119.97,46.95],
      [-119.12,46.26],[-119.98,45.88],[-120.55,45.70],[-121.18,45.61],
      [-121.53,45.71],[-122.68,45.62],[-123.13,46.14],[-123.83,46.18],[-124.08,46.25]],
    Snake:[[-115.78,43.05],[-116.39,43.28],[-116.95,44.02],
      [-116.98,45.12],[-117.02,46.42],[-117.65,46.55],[-118.66,46.22],[-119.13,46.26]],
    Willamette:[[-123.12,43.92],[-123.09,44.05],[-123.26,44.56],
      [-123.04,44.94],[-122.76,45.29],[-122.72,45.60]],
    Deschutes:[[-121.31,43.58],[-121.32,44.06],[-121.11,44.64],
      [-121.15,45.18],[-120.97,45.63]],
    Yakima:[[-121.16,47.23],[-120.55,46.99],[-120.51,46.60],
      [-120.27,46.35],[-119.21,46.22]],
    Spokane:[[-116.79,47.69],[-117.43,47.67],[-118.23,47.82],[-118.33,47.90]],
    Skagit:[[-121.24,48.60],[-121.69,48.49],[-122.34,48.42],[-122.50,48.41]],
    Umpqua:[[-122.39,43.29],[-123.34,43.22],[-123.65,43.66],[-124.19,43.70]],
    Rogue:[[-122.38,42.37],[-122.88,42.33],[-123.35,42.43],
      [-123.87,42.61],[-124.42,42.42]]
  };
  const PASSES=[
    ['North Cascades Highway',-120.66,48.52,.18],
    ['Stevens Pass',-121.09,47.75,.19],
    ['Snoqualmie Pass',-121.41,47.42,.20],
    ['Chinook Pass',-121.53,46.87,.16],
    ['White Pass',-121.38,46.64,.19],
    ['Columbia River Gorge',-121.52,45.68,.27],
    ['Barlow Pass',-121.58,45.23,.16],
    ['Santiam Pass',-121.85,44.43,.18],
    ['McKenzie Pass',-121.98,44.26,.17],
    ['Willamette Pass',-122.03,43.60,.20],
    ['Diamond Lake Highway',-122.18,43.13,.17]
  ];
  // Cascades, Olympics, Oregon Coast Range, Blue/Wallowa Mountains,
  // Columbia Plateau, Idaho Batholith and inhabited lowland corridors.
  const RIDGES=[
    [-121.15,48.35,.70,.91],[-121.26,47.33,.57,1.50],
    [-121.62,46.33,.60,1.12],[-121.80,45.02,.51,1.24],
    [-121.96,43.67,.54,1.45],[-122.02,42.45,.50,.68],
    [-123.72,47.76,.86,.62],[-123.48,47.42,.71,.54],
    [-123.56,45.48,.58,1.04],[-123.42,43.84,.62,1.39],
    [-118.35,45.48,1.06,.76],[-117.62,45.28,.75,.68],
    [-115.85,47.25,1.18,1.34],[-115.25,44.70,1.42,1.40]
  ];
  const WOODS=[
    [-123.80,47.60,1.15,1.30],[-123.46,46.13,1.05,1.33],
    [-123.58,44.03,1.14,2.40],[-122.28,48.15,1.04,.88],
    [-122.10,46.80,1.14,1.65],[-122.05,44.30,1.10,2.12],
    [-122.30,42.86,1.19,.97],[-116.1,47.30,1.20,1.15],
    [-115.52,45.32,1.33,1.40]
  ];
  const VALLEYS=[
    [-122.72,47.47,.62,1.15],[-122.94,44.63,.65,1.78],
    [-123.10,43.40,.61,.90],[-122.85,42.40,.56,.51],
    [-120.38,46.53,.77,.66],[-119.16,46.21,.92,.60],
    [-117.40,47.67,.70,.65],[-116.29,43.62,1.23,.68],
    [-121.17,44.08,.64,.56],[-121.33,45.63,1.05,.46]
  ];
  const FRONTS=[
    {name:'Juan de Fuca / Salish Sea',attack:'cf',objective:'Bellingham'},
    {name:'Puget Sound Beachheads',attack:'cf',objective:'Seattle'},
    {name:'Columbia Estuary',attack:'cf',objective:'Astoria'},
    {name:'Central Oregon Landings',attack:'cf',objective:'Newport'},
    {name:'Southern Oregon Landings',attack:'cf',objective:'Coos Bay'},
    {name:'Olympic Coastal Defence',attack:'britannia',objective:'Aberdeen'},
    {name:'Cascade Pass Defence',attack:'britannia',objective:'Yakima'},
    {name:'Columbia Gorge Defence',attack:'britannia',objective:'The Dalles'},
    {name:'Eastern Washington Counterattack',attack:'britannia',objective:'Spokane'},
    {name:'Idaho Mobile Reserve',attack:'britannia',objective:'Boise'}
  ];
  // Britannia's standing Army Groups protect cities, mountain gaps and
  // concentrated east-of-Cascades reserves. Named commanders are canonical.
  const GARRISONS=[
    ['Seattle','heavy',6,'cornelia'],['Seattle','rocket',4,'cecile'],
    ['Tacoma','heavy',5,'guilford'],['Tacoma','siege',3],
    ['Olympia','assault',4,'darlton'],['Everett','heavy',4,'gino'],
    ['Bellingham','medium',4],['Bremerton','rocket',4],
    ['Port Angeles','heavy',3],['Port Townsend','medium',2],
    ['Aberdeen','heavy',4],['Astoria','heavy',4],
    ['Longview','rocket',3],['Portland','heavy',6,'jeremiah'],
    ['Portland','siege',3],['Salem','medium',4],
    ['Eugene','heavy',4],['Medford','heavy',5,'villetta'],
    ['Coos Bay','assault',4],['Newport','medium',3],
    ['Gold Beach','medium',2],['Brookings','assault',2],
    ['Yakima','heavy',6,'bismarck'],['Yakima','rocket',4],
    ['Ellensburg','heavy',4],['Wenatchee','rocket',4],
    ['Hood River','heavy',4],['The Dalles','siege',4],
    ['Bend','heavy',5,'oldrin'],['Bend','rocket',3],
    ['Klamath Falls','heavy',4],['Pendleton','heavy',4],
    ['Spokane','heavy',7,'kewell'],['Spokane','rocket',5],
    ['Kennewick','heavy',6],['Walla Walla','medium',5],
    ['Coeur d\'Alene','heavy',5],['Lewiston','heavy',4],
    ['Sandpoint','medium',3],['Boise','heavy',7],
    ['Boise','rocket',4],['Nampa','medium',4],['McCall','assault',3],
    ['La Grande','medium',4],['Baker City','medium',3]
  ];
  // Five sizeable independent carrier groups arrive solely from the central
  // Pacific; none has a mainland city or magically appears inside Puget Sound.
  // Each carrier has two berths, so the cargo specification fits exactly.
  // [name, longitude, latitude, carriers, amphibious escorts, troops]
  const INVASIONS=[
    ['Juan de Fuca Fleet',-126.40,48.03,6,7,
      [['heavy',4,'xingke'],['assault',4,'xianglin'],['rocket',4,'honggu']]],
    ['Puget Sound Task Force',-126.15,47.15,6,7,
      [['heavy',4,'cao'],['assault',4,'ren'],['siege',4,'chaojielun']]],
    ['Columbia Expedition',-126.25,46.19,7,8,
      [['heavy',5,'chengzhong'],['rocket',5,'gaohai'],['assault',4,'leifeng']]],
    ['Central Oregon Fleet',-126.00,44.64,6,7,
      [['heavy',4,'huangqian'],['medium',4,'meiling'],['siege',4,'zhaohao']]],
    ['Southern Oregon Fleet',-126.15,43.38,7,8,
      [['heavy',5,'sawasaki'],['assault',5,'vritra'],['rocket',4,null]]]
  ];
  const DEFENSIVE_FLEETS=[
    ['Seattle','carrier_battleship',3],['Tacoma','carrier_battleship',2],
    ['Everett','portman_ii',4],['Bellingham','portman_ii',3],
    ['Bremerton','carrier_battleship',3],['Port Angeles','portman_ii',3],
    ['Aberdeen','carrier_battleship',2],['Astoria','carrier_battleship',3],
    ['Coos Bay','carrier_battleship',2],['Newport','portman_ii',3],
    ['Gold Beach','portman_ii',2],['Brookings','portman_ii',2]
  ];
  const FUNDING={cf:{credits:1500,industry:920,science:120,sakuradite:86},
    britannia:{credits:1750,industry:1090,science:130,sakuradite:90}};

  function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*DLON,
    lat:BOUNDS.north-(r+.5)*DLAT};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)/DLAT-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)/DLON-.5-.5*(r&1))))};
  }
  function nearest(g,p,accept,radius=10){
    const start=p.c==null?locate(p.lon,p.lat):p;
    let best=null,dist=Infinity;
    for(let r=Math.max(0,start.r-radius);r<=Math.min(ROWS-1,start.r+radius);r++)
      for(let c=Math.max(0,start.c-radius);c<=Math.min(COLS-1,start.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!accept(t))continue;
        const d=E.distance(start,t,g);
        if(d<dist){dist=d;best=t;}
      }
    return best;
  }
  function intensity(p,areas){
    let value=0;
    for(const [x,y,w,h] of areas)
      value=Math.max(value,Math.exp(-1.6*(((p.lon-x)/w)**2+((p.lat-y)/h)**2)));
    return value;
  }
  function landscape(p){
    if(PASSES.some(([,x,y,r])=>Math.hypot((p.lon-x)*K,p.lat-y)<r))
      return 'plains';
    const ridge=intensity(p,RIDGES),forest=intensity(p,WOODS),low=intensity(p,VALLEYS);
    if(low>.61)return 'plains';
    if(ridge>.57)return 'mountain';
    if(forest>.47||ridge>.23)return 'forest';
    return 'plains';
  }
  function water(t){return t.terrain==='sea'||t.terrain==='coast';}
  function mainOcean(g){
    const seen=new Uint8Array(g.tiles.length);let largest=[];
    for(let i=0;i<g.tiles.length;i++){
      if(seen[i]||!water(g.tiles[i]))continue;
      const q=[g.tiles[i]];seen[i]=1;
      for(let j=0;j<q.length;j++)for(const n of E.adjacent(g,q[j])){
        const k=n.r*COLS+n.c;
        if(seen[k]||!water(n))continue;
        seen[k]=1;q.push(n);
      }
      if(q.length>largest.length)largest=q;
    }
    if(largest.length<5000)throw Error('Pacific inlet or offshore ocean disconnected');
    return new Set(largest.map(t=>E.key(t)));
  }
  function orderGroup(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const gr=g.scenario.groups.find(x=>x.id===id&&x.side===g.player);
    if(!gr)return {ok:false,reason:'Army Group unavailable'};
    const dest=E.tile(g,target.c,target.r);
    if(!dest)return {ok:false,reason:'Outside the theatre'};
    let assigned=0,failed=0;const hostOrders=new Set();
    for(const id of gr.units){
      let u=g.units.find(x=>x.id===id&&x.side===g.player&&x.hp>0);
      if(!u)u=g.units.find(x=>x.side===g.player&&x.hp>0&&
        (x.cargo||[]).some(v=>v.id===id&&v.hp>0));
      if(!u||hostOrders.has(u.id))continue;
      hostOrders.add(u.id);
      const at=E.TYPES[u.type].naval==='ship'&&!water(dest)
        ?nearest(g,dest,t=>t.terrain==='sea'&&g.scenario.oceanKeys.includes(E.key(t)),12)
        :dest;
      const res=at?E.setGoto(g,u.id,at.c,at.r):{ok:false};
      if(res.ok)assigned++;else failed++;
    }
    if(assigned)gr.destination={c:dest.c,r:dest.r};
    return {ok:assigned>0,assigned,failed,reason:assigned?'':'No formation can reach that hex'};
  }
  function group(g,side,name,kind){
    let gr=g.scenario.groups.find(x=>x.side===side&&x.origin===name&&x.kind===kind);
    if(!gr){gr={id:'group-'+g.scenario.groups.length,side,kind,origin:name,
      name:name+(kind==='fleet'?' Naval Command':' Army Group'),units:[]};
      g.scenario.groups.push(gr);}
    return gr;
  }
  function eliteStarts(g,player){
    // Global prepareEliteEurope is ID-whitelisted; apply the same roster
    // conversion locally to avoid changing the shared game engine here.
    const used={};
    for(const u of E.allUnits(g)){
      const base=E.TYPES[u.type];
      if(!base||base.naval==='ship')continue;
      const roster=g.scenario.eliteRosters[u.side]||[];
      const candidates=roster.filter(id=>{
        const type=E.TYPES[E.ELITE_FORCES[id]?.type];
        return type&& (base.naval?type.naval===base.naval:
          !type.naval&&type.cls===base.cls);
      });
      const fallback=roster.filter(id=>{
        const type=E.TYPES[E.ELITE_FORCES[id]?.type];
        return type&& (base.naval?type.naval===base.naval:
          !type.naval&&type.branch===base.branch);
      });
      const pool=candidates.length?candidates:fallback;
      if(!pool.length)throw Error('Missing faction Elite for '+u.side+' '+u.type);
      const key=u.side+':'+base.cls;
      const id=pool[(used[key]||0)%pool.length];used[key]=(used[key]||0)+1;
      u.type=E.ELITE_FORCES[id].type;u.elite=id;
      u.eliteLevel=u.side===player?1:u.cmd?5:3;
      u.eliteStart=true;u.stack=1;
      if(u.cmd&&u.side!==player&&g.officers[u.cmd])
        g.officers[u.cmd].rank=E.RANKS.length-1;
      if(u.cmd)u.cmdRank=g.officers[u.cmd]?.rank??u.cmdRank;
      u.hp=E.maxHP(u);
    }
  }
  function create(player='cf',difficulty='normal',seed=201718){
    if(!SIDES.includes(player))throw Error('Unsupported Pacific Northwest side '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,
      player,difficulty,mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{cf:0,britannia:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},lineup:{}};
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:ID,key:'cfPacificNorthwest',title:'Chinese Federation Invasion of the Pacific Northwest',
      version:1,phase:'transpacific-invasion',aiDoctrine:'europe',bounds:BOUNDS,
      projection:PROJECTION,groups:[],funding:{},citylessFunding:['cf'],
      rivers:RIVERS,passes:PASSES,reliefZones:RIDGES,forestZones:WOODS,
      valleyZones:VALLEYS,operationalFronts:FRONTS,landingFronts:INVASIONS.map(x=>x[0])};
    const ids=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(s=>[s,
      ids.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(s))]));
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),share=COVERAGE[r][c];
      return {c,r,owner:null,terrain:share===0?'sea':share===1?'coast':landscape(p)};
    });
    const ocean=mainOcean(g);
    // Only the real connected Pacific/Salish Sea is accessible to fleets.
    // Small disconnected coastal lagoons are land-coast terrain, not seaports.
    g.scenario.oceanKeys=[...ocean]; // Used for embarked Army Group orders after loading.
    for(const [name,lon,lat,tier,fort] of CITIES){
      const port=PORTS[name]!=null,origin=locate(lon,lat);
      const at=nearest(g,origin,t=>t.terrain!=='sea'&&!E.stationAt(g,t)&&
        (!port||E.adjacent(g,t).some(n=>n.terrain==='sea'&&ocean.has(E.key(n)))),port?9:5);
      if(!at||E.distance(origin,at,g)> (port?9:5))
        throw Error('No geographic city or usable harbour for '+name);
      const capital=name==='Seattle'||name==='Portland'||name==='Boise';
      const shield=fort?(tier===3?520:390):140+65*tier;
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner:'britannia',
        tier,capital,capitalOf:capital?'britannia':null,fort:!!fort,
        gun:fort?name+' Coastal / Mountain Defence Battery':null,
        lab:0,refinery:0,shield,maxShield:shield,
        income:Math.round((capital?52:tier===3?33:21)*.55),
        industry:Math.round((capital?31:tier===3?20:12)*.55),
        science:Math.round((tier+1)*.55),producedTurn:0});
      if(at.terrain!=='coast')at.terrain='plains';
    }
    // Assign each physically contiguous landmass its own province network.
    // Unsettled Canadian islands, including Vancouver Island, stay neutral.
    const component=new Int32Array(g.tiles.length).fill(-1);
    let componentCount=0;
    for(let i=0;i<g.tiles.length;i++){
      if(g.tiles[i].terrain==='sea'||component[i]!==-1)continue;
      const q=[g.tiles[i]];component[i]=componentCount;
      for(let k=0;k<q.length;k++)for(const n of E.adjacent(g,q[k])){
        const ix=n.r*COLS+n.c;
        if(n.terrain==='sea'||component[ix]!==-1)continue;
        component[ix]=componentCount;q.push(n);
      }
      componentCount++;
    }
    const citiesByMass=new Map();
    for(const s of g.stations){
      const mass=component[s.r*COLS+s.c];
      if(!citiesByMass.has(mass))citiesByMass.set(mass,[]);
      citiesByMass.get(mass).push(s);
    }
    for(const t of g.tiles){
      if(t.terrain==='sea')continue;
      const p=geo(t.c,t.r),cities=citiesByMass.get(component[t.r*COLS+t.c]);
      if(!cities||p.lat>49.0)continue;
      let best=null,score=Infinity;
      for(const s of cities){
        const d=E.distance(t,s,g);
        if(d<score){score=d;best=s;}
      }
      t.owner='britannia';t.provinceCity=best.id;
    }
    const reserved=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(x=>x.name===name);
      if(!s)throw Error('Missing regional port city '+name);
      const at=E.adjacent(g,s)
        .filter(t=>t.terrain==='sea'&&ocean.has(E.key(t))&&!reserved.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(water).length-E.adjacent(g,a).filter(water).length)[0];
      if(!at)throw Error('Blocked or non-ocean port at '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner='britannia';
      reserved.add(E.key(at));
    }
    for(const [city,cls,count,commander] of GARRISONS){
      const s=g.stations.find(x=>x.name===city);
      if(!s||s.owner!=='britannia')throw Error('Invalid Britannian garrison '+city);
      if(commander&&!g.officers[commander])throw Error('Missing named defender '+commander);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&t.owner==='britannia'&&
          !E.unitAt(g,t)&&(!E.stationAt(g,t)||E.stationAt(g,t).owner==='britannia'),12);
        if(!at)throw Error('Defender deployment blocked at '+city);
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor('britannia',cls,g),'britannia',
          at.c,at.r,i===0?3:2,cmd);
        if(cmd){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group(g,'britannia',city,'army').units.push(u.id);
      }
    }
    // Defensive fleets launch from actual independently capturable ports.
    for(const [city,type,count] of DEFENSIVE_FLEETS){
      const s=g.stations.find(x=>x.name===city);
      if(!s?.portAt||E.TYPES[type]?.naval!=='ship'&&E.TYPES[type]?.naval!=='amphibious')
        throw Error('Invalid Britannian naval base '+city);
      for(let i=0;i<count;i++){
        const at=nearest(g,s.portAt,t=>water(t)&&ocean.has(E.key(t))&&
          !E.unitAt(g,t)&&!reserved.has(E.key(t)),14);
        if(!at)throw Error('Britannian harbor blockade at '+city);
        const ship=E.newUnit(g,type,'britannia',at.c,at.r);
        group(g,'britannia',city,'fleet').units.push(ship.id);
      }
    }
    const loads=[];
    for(const [name,lon,lat,carrierCount,escortCount,formations] of INVASIONS){
      const anchor=locate(lon,lat),carriers=[];
      for(const [type,count] of [['cf_carrier',carrierCount],['shui_gun_ru_ii',escortCount]]){
        if(!E.TYPES[type]||!E.TYPES[type].naval)
          throw Error('Missing standardized Chinese naval frame '+type);
        for(let i=0;i<count;i++){
          const at=nearest(g,anchor,t=>t.terrain==='sea'&&ocean.has(E.key(t))&&
            !E.unitAt(g,t)&&!reserved.has(E.key(t)),20);
          if(!at)throw Error('Pacific fleet cannot assemble at '+name);
          const ship=E.newUnit(g,type,'cf',at.c,at.r);
          if(type==='cf_carrier'){ship.invasionGroup=name;carriers.push(ship);}
          group(g,'cf',name,'fleet').units.push(ship.id);
        }
      }
      for(const [cls,count,commander] of formations){
        if(commander&&!g.officers[commander])throw Error('Missing named Chinese commander '+commander);
        for(let i=0;i<count;i++){
          const carrier=carriers.find(x=>(x.pendingPassengers||0)<E.TYPES[x.type].capacity);
          if(!carrier)throw Error('Fleet has too few carrier berths: '+name);
          carrier.pendingPassengers=(carrier.pendingPassengers||0)+1;
          const cmd=i===0?commander:null;
          const u=E.newUnit(g,E.typeFor('cf',cls,g),'cf',
            carrier.c,carrier.r,i===0?3:2,cmd);
          if(cmd){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
          loads.push({carrier,u});group(g,'cf',name,'army').units.push(u.id);
        }
      }
    }
    if(difficulty==='elite')eliteStarts(g,player);
    for(const {carrier,u} of loads){
      (carrier.cargo||=[]).push(u);
      g.units.splice(g.units.indexOf(u),1);
    }
    for(const u of g.units)delete u.pendingPassengers;
    // Difficulty scales the opponent, not the human player. On Elite all
    // starting non-carrier units are faction-appropriate Elite Forces.
    for(const side of SIDES){
      const factor=side===player?1:difficulty==='hard'?1.3:
        difficulty==='challenge'||difficulty==='elite'?1.6:1;
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,target])=>
          [resource,Math.round(target*factor)-base[resource]]));
      const actual=E.income(g,side);
      for(const key of Object.keys(FUNDING[side]))
        g.economy[side][key]=actual[key]*(side==='cf'?3:2);
    }
    if(difficulty==='hard'||difficulty==='challenge'){
      for(const side of SIDES.filter(s=>s!==player))
        for(const [index,u] of g.units.flatMap(x=>[x,...(x.cargo||[])])
          .filter(x=>x.side===side&&E.TYPES[x.type].naval!=='ship').entries())
          if(difficulty==='challenge'||index%2===0){
            u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);
          }
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.reduce((n,u)=>
      n+(u.side===s?1:0)+(u.cargo||[]).filter(v=>v.side===s).length,0)]));
    E.log(g,'The Chinese Federation arrives from the central Pacific in five separate carrier-led invasions. Britannia holds the coastal fortresses, Cascade passes and inland reserves.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((total,s)=>total+s.tier,0);
  }
  function objective(g,side=g.player){
    if(side==='cf')return 'Capture every Britannian city, from the coast through the Cascades to Idaho ('+
      g.stations.filter(s=>s.owner==='britannia').length+' remain). No turn limit.';
    return 'Defend every Pacific Northwest city, break the Chinese beachheads and destroy the expeditionary fleet.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
    if(g.stations.every(s=>s.owner==='cf'))return {winner:'cf',team:'cf',
      reason:'The Chinese Federation has captured every Britannian Pacific Northwest city.'};
    const remaining=g.units.some(u=>u.side==='cf'&&u.hp>0||
      (u.cargo||[]).some(v=>v.side==='cf'&&v.hp>0));
    if(!remaining&&!g.stations.some(s=>s.owner==='cf'))return {
      winner:'britannia',team:'britannia',
      reason:'Britannia has annihilated the Chinese Pacific Northwest expedition.'};
    return null;
  }
  const api={id:ID,title:'Chinese Federation Invasion of the Pacific Northwest',
    sides:SIDES,cols:COLS,rows:ROWS,bounds:BOUNDS,projection:PROJECTION,
    cityData:CITIES,ports:PORTS,armyGroups:GARRISONS,invasionData:INVASIONS,
    fleetData:DEFENSIVE_FLEETS,rivers:RIVERS,passes:PASSES,operationalFronts:FRONTS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,overlays:['reliefZones','regionalRivers']},
    elite:true,expeditionSide:'cf',
    text:{
      era:"Pacific Northwest · Federation World Campaign",
      intro:"China lands five carrier-led invasions along the Washington and Oregon coast and advances across the Cascades. Total city conquest.",
      diplomacy:"Britannia owns all inland cities; independent ports and mountain passes determine where beachheads can expand.",
      elite:"Chinese and Britannian Elite Forces follow the standard four-difficulty system.",
      focus:{
        cf:"",
        britannia:"Seattle"
      }
    },
    blurbs:{
      cf:"Land carrier-led armies near Puget Sound, Columbia estuary and Oregon, then fight through the Cascades.",
      britannia:"Repel simultaneous Pacific landings and defend the mountain passes and inland reserves."
    }};
  E.scenarios={...(E.scenarios||{}),cfPacificNorthwest:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

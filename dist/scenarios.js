/* Scenario Mode: the 2017 alternate-history Chinese Federation invasion of Japan.
   Stage one: local Japan geography, cities, and the three starting armies.
   NOAA/GSHHS intermediate-resolution Japanese island landmask; 112 x 88 hexes.
   Encoded as packed bits (row-major, most-significant-bit first), keeping the asset small. */
(function (root) {
  'use strict';
  const E = root.Knightmare || (typeof require === 'function' ? require('./engine.js') : null);
  // North-up, tightly cropped Japan theatre. Keep full-resolution
  // Conquest coastlines but do not rotate the tactical islands.
  const MASK_COLS = 112, MASK_ROWS = 88;
  const COLS = 110, ROWS = 84;
  // Original NOAA mask bounds stay fixed; scenario viewport is tighter.
  const BOUNDS = { west: 126.5, east: 146.5, north: 45.8, south: 29.0 };
  const PROJECTION = {
    centerLon: 137.65, centerLat: 38.1, angle: 0,
    uMin: -6.61, uMax: 6.65, vMin: -7.60, vMax: 7.65,
  };
  const theta=PROJECTION.angle*Math.PI/180, X=Math.cos(theta), Y=Math.sin(theta),
    K=Math.cos(PROJECTION.centerLat*Math.PI/180);
  function uv(lon,lat) {
    const x=(lon-PROJECTION.centerLon)*K,y=lat-PROJECTION.centerLat;
    return {u:x*X+y*Y,v:-x*Y+y*X};
  }
  function geographicAt(c,r) {
    const u=PROJECTION.uMin+(c+.5*(r&1))*(PROJECTION.uMax-PROJECTION.uMin)/(COLS-1),
      v=PROJECTION.vMax-r*(PROJECTION.vMax-PROJECTION.vMin)/(ROWS-1);
    return {lon:PROJECTION.centerLon+(u*X-v*Y)/K,lat:PROJECTION.centerLat+u*Y+v*X};
  }
  const LAND_BITS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAAAE8AAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAfwAAAAAAAAAAAAAAAAB/gABAAAAAAAAAAAAAAH/gAIAAAAAAAAAAAAAA//4QAAAAAAAAAAAAAAD///AAAAAAAAAAAAAAA///4AAAAAAAAAAAAAAB///4AAAAAAAAAAAAAEH///QAAAAAAAAAAAAAP///8AAAAAAAAAAAAAB///gAAAAAAAAAAAAAAP//8AAAAAAAAAAAAAADnD/AAAAAAAAAAAAAAAOAB8AAAAAAAAAAAAAAAcABgAAAAAAAAAAAAAAA+AAAAAAAAAAAAAAAAAHIAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAABiAAAAAAAAAAAAAAAAAGIAAAAAAAAAAAAAAAAAfgAAAAAAAAAAAAAAAAP+AAAAAAAAAAAAAAAAAf+AAAAAAAAAAAAAAAAB/4AAAAAAAAAAAAAAAAH/wAAAAAAAAAAAAAAAAf/AAAAAAAAAAAAAAAAA/+AAAAAAAAAAAAAAAAH/wAAAAAAAAAAAAAAAAf/AAAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAP/AAAAAAAAAAAAAAAAB/4AAAAAAAAAAAAAAAAH/wAAAAAAAAAAAAAAAg/4AAAAAAAAAAAAAAACD/gAAAAAAAAAAAAAAAR/8AAAAAAAAAAAAAAAAH/4AAAAAAAAAAAAAAEB//gAAAAAAAAAAAAABwH/+AAAAAAAAAAAAAAED//wAAAAAAAAAAAAAAZ///AAAAAAAAAAAAAAB///4AAAAAAAAAAAAAAP///gAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAP///4AAAAAAAAAAAAAB////gAAAAAAAAAAAAAD////AAAAAAAAAAAMH8///8wAAAAAAAAAAB//////nAAAAAAAAAAAf/////w4AAAAAAAAAAD///+/5AAAAAAAAAAAA////2/MAAAAAAAAAAAH/+A/kAAAAAAAAAAAAF/4An/AAAAAAAAAAAAAfyD6fwAAAAAAAAAAAACzEfj8AAAAAAAAAAAAIYAf/HwAAAAAAAAAAAALiH/wcAAAAAAAAAAAAB/4/iAAAAAAAAAAAAAA//h4AAAAAAAAAAAAAAA7/ngAAAAAAAAAAAAAABP8MAAAAAAAAAAAAAAABfwAAAAAAAAAAAAAAAAN+AAAAAAAAAAAAAAAAAn4AAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAH8AAAAAAAAAAAAAAAAAbwAAAAAAAAAAAAAAAAAvAAAAAAAAAAAAAAAAAOwAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  // The original packed mask was missing its last 24 (ocean-only) bytes.
  // Pad explicitly and check the 112 × 88 bit length so truncated geography never silently loads.
  const LAND_BITS_COMPLETE = LAND_BITS; // Last 24 ocean-only bytes are appended after decoding.
  const SIDES = ['britannia', 'bk', 'cf'];
  // [city, longitude, latitude, owner, tier, fortress]; each is snapped to dry land.
  const CITIES = [
    ['Sapporo',141.35,43.06,'britannia',2], ['Hakodate',140.73,41.77,'britannia',1],
    ['Asahikawa',142.37,43.77,'britannia',1], ['Kushiro',144.38,42.98,'britannia',1],
    ['Aomori',140.74,40.82,'britannia',1], ['Morioka',141.15,39.70,'britannia',1],
    ['Akita',140.10,39.72,'britannia',1], ['Sendai',140.87,38.27,'britannia',2],
    ['Niigata',139.04,37.92,'britannia',2], ['Fukushima',140.47,37.76,'britannia',1],
    ['Tokyo Settlement',139.69,35.68,'britannia',3,true],
    ['Yokohama',139.64,35.45,'britannia',2],
    ['Chiba',140.12,35.61,'britannia',1], ['Narita',140.31,35.78,'bk',1],
    ['Saitama',139.65,35.86,'britannia',1],
    ['Kofu',138.57,35.66,'britannia',1], ['Mount Fuji',138.73,35.36,'britannia',2,true],
    ['Nagano',138.19,36.65,'bk',1], ['Shizuoka',138.38,34.98,'britannia',1],
    ['Hamamatsu',137.73,34.71,'britannia',1], ['Kanazawa',136.66,36.56,'britannia',1],
    ['Nagoya',136.91,35.18,'britannia',2],
    ['Kyoto',135.77,35.01,'bk',2,true], ['Osaka',135.50,34.69,'britannia',3,true],
    ['Kobe',135.20,34.69,'britannia',2], ['Nara',135.80,34.68,'bk',1],
    ['Wakayama',135.17,34.23,'britannia',1],
    ['Takamatsu',134.05,34.34,'britannia',1], ['Matsuyama',132.77,33.84,'britannia',1],
    ['Kochi',133.53,33.56,'britannia',1],
    ['Tottori',134.24,35.50,'britannia',1], ['Okayama',133.93,34.66,'britannia',1],
    ['Hiroshima',132.46,34.39,'britannia',2], ['Matsue',133.05,35.47,'bk',1],
    ['Yamaguchi',131.47,34.18,'britannia',1], ['Shimonoseki',130.94,33.96,'britannia',1],
    ['Kitakyushu',130.88,33.88,'cf',2,true], ['Fukuoka',130.40,33.59,'cf',3,true],
    ['Nagasaki',129.88,32.75,'cf',2], ['Sasebo',129.72,33.16,'cf',1],
    ['Oita',131.61,33.24,'cf',1], ['Kumamoto',130.71,32.80,'cf',2],
    ['Miyazaki',131.42,31.91,'cf',1], ['Kagoshima',130.56,31.60,'cf',2]
  ];
  // Normal-mode opening income targets. China and the Black Knights receive
  // roughly 300 credits per turn, but less Sakuradite than before.
  const INCOME_TARGETS = {
    britannia: { credits: 400, industry: 220, science: 42, sakuradite: 28 },
    bk:         { credits: 300, industry: 175, science: 32, sakuradite: 12 },
    cf:         { credits: 320, industry: 185, science: 34, sakuradite: 15 },
  };
  // China's expeditionary war chest is four turns of income; the other
  // factions begin with two turns. Apply after difficulty adjustments.
  const STARTING_RESERVE_TURNS = { britannia: 2, bk: 2, cf: 4 };
  // City production is deliberately smaller than Conquest city production.
  // The remainder is off-map war financing, so Britannia's 35 cities don't
  // overwhelm the four-city invasion economy from turn one.
  const CITY_OUTPUT_FACTOR = 0.4;
  const ARMY_GROUPS = [
    // [side, staging city, class, formations, commander (optional)]
    // Fourteen land formations + six naval formations = exactly twenty starting units.
    // Hold the Tokyo/Osaka industrial core and the Kanmon line; leave reserves spread thin.
    ['britannia','Tokyo Settlement','medium',2,'suzaku'],
    ['britannia','Tokyo Settlement','heavy',1,'cornelia'],
    ['britannia','Yokohama','assault',1,'guilford'],
    ['britannia','Osaka','medium',2,'darlton'],
    ['britannia','Osaka','rocket',1],
    ['britannia','Hiroshima','light',1],
    ['britannia','Shimonoseki','assault',2],
    ['britannia','Okayama','medium',1],
    ['britannia','Yamaguchi','light',1],
    ['britannia','Sendai','medium',1],
    ['britannia','Sapporo','light',1],
    ['bk','Kyoto','medium',3,'zero'],
    ['bk','Kyoto','assault',2,'kallen'],
    ['bk','Nara','light',2,'tohdoh'],
    ['bk','Narita','scout',2,'ohgi'],
    ['bk','Nagano','medium',2],
    ['bk','Matsue','assault',2],
    // Spread the expeditionary corps across all eight friendly Kyushu cities.
    // Keep the 21 land formations and their class mix, without stacking at the ports.
    ['cf','Fukuoka','medium',2,'xingke'],
    ['cf','Fukuoka','assault',1],
    ['cf','Kitakyushu','medium',2,'xianglin'],
    ['cf','Kitakyushu','rocket',1],
    ['cf','Nagasaki','light',2],
    ['cf','Nagasaki','support',1],
    ['cf','Sasebo','scout',2],
    ['cf','Oita','medium',1],
    ['cf','Oita','support',1],
    ['cf','Kumamoto','medium',2],
    ['cf','Kumamoto','assault',1],
    ['cf','Miyazaki','assault',1],
    ['cf','Miyazaki','scout',1],
    ['cf','Kagoshima','assault',1],
    ['cf','Kagoshima','rocket',1],
    ['cf','Kagoshima','light',1],
  ];
  function landMask() {
    const bytes = (typeof atob === 'function' ? atob(LAND_BITS_COMPLETE) : Buffer.from(LAND_BITS_COMPLETE, 'base64').toString('latin1')) + '\0'.repeat(24);
    if (bytes.length !== MASK_COLS * MASK_ROWS / 8)
      throw new Error('Japan source landmask must contain exactly 1,232 bytes');
    const mask=[];
    for (let i=0;i<MASK_COLS*MASK_ROWS;i++)
      mask.push(!!(bytes.charCodeAt(i>>3)&(128>>(i&7))));
    return mask;
  }
  function locate(lon,lat) {
    const {u,v}=uv(lon,lat);
    const r=Math.max(0,Math.min(ROWS-1,Math.round((PROJECTION.vMax-v)*(ROWS-1)/(PROJECTION.vMax-PROJECTION.vMin))));
    const c=Math.max(0,Math.min(COLS-1,Math.round((u-PROJECTION.uMin)*(COLS-1)/(PROJECTION.uMax-PROJECTION.uMin)-.5*(r&1))));
    return {c,r};
  }
  function nearest(g, point, eligible, radius=12) {
    let best=null, distance=Infinity;
    for (let r=Math.max(0,point.r-radius);r<=Math.min(g.rows-1,point.r+radius);r++)
      for (let c=Math.max(0,point.c-radius);c<=Math.min(g.cols-1,point.c+radius);c++) {
        const t=E.tile(g,c,r);
        if (!t || !eligible(t)) continue;
        const d=E.distance(point,t,g);
        if (d<distance) {distance=d;best=t;}
      }
    return best;
  }

  // Approximate mountain corridors rather than the old random scatter of mountain tiles.
  // These zones represent Hokkaido's central range, Tohoku spine, Japan's central Alps,
  // the Kii mountains, Shikoku's interior and the volcanic spine of Kyushu.
  const RIDGES = [
    [142.8,43.8,1.1,0.85],[143.4,42.9,1.25,0.85],
    [140.65,39.5,0.65,1.45],[140.55,37.5,0.55,1.1],
    [138.15,36.3,1.15,0.85],[137.15,35.65,1.15,0.85],
    [136.1,34.4,0.75,0.48],[133.45,33.65,1.18,0.48],
    [131.05,32.2,0.75,0.95],
  ];
  const LOWLANDS = [
    [139.7,35.75,0.88,0.65],[136.9,35.1,0.7,0.48],
    [135.55,34.7,0.85,0.5],[130.65,33.65,0.68,0.45],
    [141.3,43.05,0.77,0.6],[140.85,38.3,0.55,0.55],
  ];
  function landscape(lon,lat,c,r) {
    const ellipses = (list, factor) => Math.max(0,...list.map(([x,y,dx,dy]) =>
      Math.exp(-(((lon-x)/dx)**2+((lat-y)/dy)**2)*factor)));
    const mountain = ellipses(RIDGES,1.6);
    const lowland = ellipses(LOWLANDS,1.7);
    const variation = ((c*11+r*17+(c*r)%19)%29)/29;
    if(mountain>0.60 && lowland<0.52) return 'mountain';
    if(mountain>0.26 && lowland<0.74) return variation<0.79?'forest':'mountain';
    if(lat>40.5 && lowland<0.6) return variation<0.49?'forest':'plains';
    return 'plains';
  }
  // Re-evaluate existing dry hexes against Japan's source shoreline.
  // Preserve the original land/sea mask and narrow Kanmon Strait exactly.
  const SHORE_SAMPLES=[[0,0]];
  for(const radius of [0.42,0.84])
    for(let k=0;k<12;k++){
      const angle=Math.PI*k/6, edgeAngle=Math.PI/3*Math.round(angle/(Math.PI/3));
      const extent=Math.cos(Math.PI/6)/Math.cos(angle-edgeAngle);
      SHORE_SAMPLES.push([radius*extent*Math.cos(angle),radius*extent*Math.sin(angle)]);
    }
  function japanDryAt(mask,lon,lat){
    const r=Math.round((BOUNDS.north-lat)*(MASK_ROWS-1)/(BOUNDS.north-BOUNDS.south));
    const c=Math.round((lon-BOUNDS.west)*(MASK_COLS-1)/(BOUNDS.east-BOUNDS.west)-.5*(r&1));
    return r>=0&&r<MASK_ROWS&&c>=0&&c<MASK_COLS&&!!mask[r*MASK_COLS+c];
  }
  function shorelineLandFraction(landAt,t){
    const p=geographicAt(t.c,t.r),
      lonStep=(PROJECTION.uMax-PROJECTION.uMin)/(COLS-1)/K,
      latStep=(PROJECTION.vMax-PROJECTION.vMin)/(ROWS-1);
    let land=0;
    for(const [dx,dy] of SHORE_SAMPLES)
      if(landAt(p.lon+lonStep*dx/Math.sqrt(3),
        p.lat-latStep*dy/1.5))land++;
    return land/SHORE_SAMPLES.length;
  }
  function classifyJapanCoast(g,mask){
    // Mixed-terrain coast must match the actual shoreline, not merely touch a
    // tactical sea hex. The browser shares the detailed GSHHG land polygons
    // with the map painter; headless tests fall back to the source landmask.
    const landAt=typeof GEOGRAPHY!=='undefined' &&
      typeof GEOGRAPHY.japanLandAt==='function'
        ? GEOGRAPHY.japanLandAt
        : (lon,lat)=>japanDryAt(mask,lon,lat);
    const depth=new Int8Array(g.tiles.length).fill(-1),queue=[];
    for(const t of g.tiles) if(t.terrain==='sea'){
      depth[t.r*g.cols+t.c]=0;queue.push(t);
    }
    for(let i=0;i<queue.length;i++){
      const t=queue[i],d=depth[t.r*g.cols+t.c];
      if(d>=2)continue;
      for(const n of E.adjacent(g,t)){
        const k=n.r*g.cols+n.c;
        if(depth[k]>=0)continue;
        depth[k]=d+1;queue.push(n);
      }
    }
    for(const t of g.tiles){
      if(t.terrain==='sea')continue;
      const d=depth[t.r*g.cols+t.c];
      if(d!==1 && d!==2)continue;
      const dry=shorelineLandFraction(landAt,t);
      // Only a genuinely mixed 20–80% land/water hex is navigable coast.
      // A fully dry hex beside tactical sea remains its original land terrain.
      if(dry>=.2 && dry<=.8)t.terrain='coast';
    }
  }
  // Manual Japan-terrain review (2026-10-11, 110 x 84 north-up grid).
  // 169 explicit visual-coastline corrections from the per-hex audit.
  // Land entries use local biome; coast means mixed amphibious ground; sea is navigable.
  // Thirty additional flagged hexes are deliberately unchanged to preserve the
  // four main islands' separation, operational ports, fleets and starting armies.
  // Coordinates are [column, row], zero-based, NOT flattened world-grid indices.
  const MANUAL_JAPAN_TERRAIN = {
  coast: [
    [80,2],[86,4],[89,7],[93,8],[104,8],[103,9],[101,10],[103,10],[102,11],[73,13],[78,13],[106,13],
    [72,14],[103,14],[104,14],[105,14],[96,15],[97,15],[98,15],[99,15],[100,15],[101,15],[71,16],[94,16],
    [95,16],[68,17],[72,18],[78,18],[92,18],[71,19],[74,20],[75,20],[91,20],[76,21],[79,24],[78,25],
    [75,26],[76,26],[70,27],[78,27],[79,28],[68,32],[69,32],[83,34],[82,36],[80,37],[66,39],[79,39],
    [66,40],[58,42],[60,42],[65,42],[59,43],[62,43],[75,43],[50,45],[76,45],[59,46],[48,47],[56,47],
    [75,48],[48,49],[74,49],[74,50],[46,51],[73,51],[26,52],[73,52],[43,53],[44,54],[69,55],[73,55],
    [69,56],[21,57],[68,57],[20,58],[64,58],[18,59],[61,59],[68,59],[16,60],[17,60],[51,60],[52,60],
    [14,61],[31,61],[47,61],[48,61],[12,62],[13,62],[26,62],[38,62],[19,63],[34,63],[13,64],[15,64],
    [16,64],[17,64],[25,64],[26,64],[27,64],[35,64],[38,64],[18,65],[38,65],[7,66],[3,67],[15,67],
    [27,67],[30,67],[32,67],[41,67],[26,68],[32,68],[2,69],[7,70],[18,70],[3,71],[15,73],[15,74],
    [14,75],[6,76],[8,77],[9,77],[6,78],[10,78],
  ],
  sea: [
    [109,7],[108,8],[97,9],[104,12],[93,17],[72,23],[76,41],[76,42],[25,55],[32,55],[39,55],[72,57],
    [49,60],[59,60],[50,61],[51,61],[3,65],[44,65],[19,67],[1,68],[17,69],[6,72],[7,72],[5,73],
    [6,74],[14,78],[12,79],[11,82],
  ],
  land: [
    [103,13],[95,15],[69,17],[77,24],[81,36],[62,44],[75,47],[70,55],[63,59],[48,62],[38,63],[43,66],
    [9,72],[10,76],[7,78],
  ],
  };
  function applyManualJapanTerrain(g) {
    for (const [kind, positions] of Object.entries(MANUAL_JAPAN_TERRAIN)) {
      for (const [c, r] of positions) {
        const t = E.tile(g, c, r);
        if (!t) throw new Error('Out-of-bounds Japan terrain override: '+c+','+r);
        const p = geographicAt(c, r);
        t.terrain = kind === 'land' ? landscape(p.lon, p.lat, c, r) : kind;
      }
    }
  }

  const islandNames = {
    'Sapporo':'hokkaido','Hakodate':'hokkaido','Asahikawa':'hokkaido','Kushiro':'hokkaido',
    'Takamatsu':'shikoku','Matsuyama':'shikoku','Kochi':'shikoku',
    'Kitakyushu':'kyushu','Fukuoka':'kyushu','Nagasaki':'kyushu',
    'Sasebo':'kyushu','Oita':'kyushu','Kumamoto':'kyushu',
    'Miyazaki':'kyushu','Kagoshima':'kyushu',
  };
  function component(g, start) {
    const seen = new Set(), queue = [start];
    if(!start) return seen;
    seen.add(E.key(start));
    for(let i=0;i<queue.length;i++)
      for(const t of E.adjacent(g,queue[i])) {
        const k=E.key(t);
        if(t.terrain!=='sea' && !seen.has(k)){seen.add(k);queue.push(t);}
      }
    return seen;
  }
  const NAVAL_START = [
    // side, port, unit model, count; naval forces begin at sea, never on cities.
    ['cf','Fukuoka','cf_carrier',2],
    ['cf','Kitakyushu','shui_gun_ru_ii',3],
    ['cf','Nagasaki','shui_gun_ru',3],
    ['britannia','Yokohama','carrier_battleship',1],
    ['britannia','Kobe','portman_ii',2],
    ['britannia','Shimonoseki','portman',2],
    ['britannia','Osaka','carrier_battleship',1],
  ];
  const PORTS = { 'Fukuoka':2,'Kitakyushu':2,'Nagasaki':2,'Sasebo':1,
    'Yokohama':2,'Kobe':2,'Osaka':2,'Shimonoseki':1,'Hiroshima':1 };
  const OBJECTIVES = {
    britannia: 'Secure Tokyo, Osaka and Fukuoka, and hold at least 60% of Japan’s strategic city value.',
    bk: 'Secure Tokyo and Kyoto, and control at least 50% of Japan’s strategic city value.',
    cf: 'Capture Tokyo and Osaka, hold Fukuoka, and control at least 55% of strategic city value.'
  };
  function buildGroups(g) {
    return g.scenario.groups || [];
  }
  function orderGroup(g, id, point) {
    if(g.mode!=='scenario' || g.phase!==g.player) return {ok:false,reason:'Not your turn'};
    const group=buildGroups(g).find(v=>v.id===id&&v.side===g.player);
    if(!group)return {ok:false,reason:'Army group not found'};
    let assigned=0,failed=0;
    for(const unitId of group.units){
      const u=g.units.find(v=>v.id===unitId && v.hp>0 && v.side===g.player);
      if(!u)continue;
      const res=E.setGoto(g,u.id,point.c,point.r);
      if(res.ok)assigned++;else failed++;
    }
    if(assigned)group.destination={c:point.c,r:point.r};
    return {ok:assigned>0,assigned,failed,reason:assigned?'': 'No group unit can reach that hex'};
  }
  // Naval movement stops four hexes offshore. Retain a continuous blue
  // geographic ocean background even where the hex grid is unplayable.
  const NAVAL_COASTAL_WIDTH = 4;
  function restrictNavalTheatre(g) {
    const cols=g.cols,N=g.tiles.length,depth=new Int16Array(N).fill(-1),queue=[];
    for(const t of g.tiles) if(t.terrain!=='sea') {
      depth[t.r*cols+t.c]=0;queue.push(t);
    }
    for(let i=0;i<queue.length;i++){
      const t=queue[i],d=depth[t.r*cols+t.c];
      if(d>=NAVAL_COASTAL_WIDTH)continue;
      for(const n of E.adjacent(g,t)){
        const j=n.r*cols+n.c;
        if(n.terrain!=='sea'||depth[j]>=0)continue;
        depth[j]=d+1;queue.push(n);
      }
    }
    let active=0,excluded=0,first=null;
    for(let i=0;i<N;i++){
      const t=g.tiles[i];
      if(t.terrain!=='sea')continue;
      if(depth[i]>0 && depth[i]<=NAVAL_COASTAL_WIDTH){
        active++;if(!first)first=t;
      }else{t.terrain='offmap';excluded++;}
    }
    if(!first)throw new Error('Japan has no navigable coastal water');
    const connected=new Set([E.key(first)]),todo=[first];
    for(let i=0;i<todo.length;i++)
      for(const n of E.adjacent(g,todo[i])){
        const k=E.key(n);
        if(n.terrain==='sea'&&!connected.has(k)){connected.add(k);todo.push(n);}
      }
    if(connected.size!==active)
      throw new Error('Japan coastal sea must remain one connected naval theatre');
    const ports=g.stations.filter(s=>s.portAt);
    if(ports.some(s=>!connected.has(E.key(s.portAt))))
      throw new Error('A scenario port is isolated from the connected coastal sea');
    if(g.units.some(u=>E.TYPES[u.type].naval &&
      !connected.has(E.key(u))))
      throw new Error('A scenario naval unit is outside the coastal sea network');
    g.scenario.coastalSea={width:NAVAL_COASTAL_WIDTH,active,excluded};
  }
  function create(player='britannia',difficulty='normal',seed=246801) {
    if (!SIDES.includes(player)) throw new Error('Unsupported scenario faction: '+player);
    // Dedicated lightweight initializer: do not generate the 13,680-hex conquest world,
    // global cities or world-army order of battle merely to discard it.
    if(!E.DIFFICULTIES[difficulty])difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'invasion-japan',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,bk:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}}
    };
    const mask=landMask();
    g.mapRevision=0;
    g.teams={britannia:'defenders',bk:'defenders',cf:'invaders'};
    g.economy={};
    g.tech={};
    for (const side of SIDES) {
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[side]={};
    }
    g.economy.neutral={credits:0,industry:0,science:0,sakuradite:0};
    g.tech.neutral={};
    g.factions={bk:E.FACTIONS.bk};
    g.lineup={bk:E.ROSTER.bk};
    g.scenario={id:'invasion-japan',title:'The Invasion of Japan',turnLimit:60,
      phase:'opening',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION};
    // Sample the same geographic NOAA landmask into a higher-detail grid.
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,{lon,lat}=geographicAt(c,r),
        sourceR=Math.round((BOUNDS.north-lat)*(MASK_ROWS-1)/(BOUNDS.north-BOUNDS.south)),
        sourceC=Math.round((lon-BOUNDS.west)*(MASK_COLS-1)/(BOUNDS.east-BOUNDS.west)-.5*(sourceR&1));
      const dry=sourceR>=0&&sourceR<MASK_ROWS&&sourceC>=0&&sourceC<MASK_COLS&&
        mask[sourceR*MASK_COLS+sourceC];
      return {c,r,owner:null,terrain:dry?landscape(lon,lat,c,r):'sea'};
    });
    // Keep the historically navigable Kanmon Strait between Honshu and
    // Kyushu. Indices from the old rotated map are deliberately not reused.
    // At this coarse tactical scale Kitakyushu and Shimonoseki touch.
    // Leave their separate city hexes intact while opening a sea channel
    // one hex north of the Kitakyushu shoreline.
    const channel=locate(130.95,33.99);
    const kanmon=E.tile(g,channel.c,channel.r);
    if(!kanmon || kanmon.terrain==='sea')
      throw new Error('North-up Kanmon channel anchor moved');
    kanmon.terrain='sea';
    // Recompute mixed coastal hexes before city and island assignments.
    classifyJapanCoast(g,mask);
    // Apply audited per-hex fixes before island components, cities, ports and armies.
    applyManualJapanTerrain(g);
    const hokkaidoStart=nearest(g,locate(141.35,43.06),t=>t.terrain!=='sea',4);
    const shikokuStart=nearest(g,locate(132.77,33.84),t=>t.terrain!=='sea',4);
    const kyushuStart=nearest(g,locate(130.71,32.80),t=>t.terrain!=='sea',4);
    const islandTiles={
      hokkaido:component(g,hokkaidoStart),
      shikoku:component(g,shikokuStart),
      kyushu:component(g,kyushuStart),
    };
    for (const [name,lon,lat,owner,tier,fort=false] of CITIES) {
      const required=islandTiles[islandNames[name]];
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea' &&
        (!required||required.has(E.key(t))) && !g.stations.some(s=>s.c===t.c && s.r===t.r),8);
      if (!at) throw new Error('No playable Japan land tile near '+name);
      const capital=name==='Tokyo Settlement' || name==='Kyoto' || name==='Fukuoka';
      const shield=fort?400:120+60*tier;
      const s={id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,
        lab:0,refinery:0,shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*CITY_OUTPUT_FACTOR),
        industry:Math.round((capital?25:6*tier)*CITY_OUTPUT_FACTOR),
        science:Math.round((1+tier)*CITY_OUTPUT_FACTOR),producedTurn:0};
      g.stations.push(s);
      // A coastal city remains coastal instead of becoming impassable inland
      // terrain for amphibious and harbor operations.
      if(at.terrain!=='coast')at.terrain='plains';
    }
    // Province assignment stays on the same island. In particular, the
    // Kanmon Strait may not allow a Shimonoseki province to own Kyushu.
    // This is tactical ownership, independent of the new geographic art.
    const islandByHex=new Map();
    let componentId=0;
    for(const t of g.tiles){
      if(t.terrain==='sea'||islandByHex.has(E.key(t)))continue;
      for(const key of component(g,t))islandByHex.set(key,componentId);
      componentId++;
    }
    const islandCities=new Map();
    for(const city of g.stations){
      const id=islandByHex.get(E.key(city));
      if(!islandCities.has(id))islandCities.set(id,[]);
      islandCities.get(id).push(city);
    }
    for(const t of g.tiles){
      if(t.terrain==='sea')continue;
      const candidates=islandCities.get(islandByHex.get(E.key(t)))||g.stations;
      let city=null,d=Infinity;
      for(const s of candidates){
        const v=E.distance(t,s,g);
        if(v<d){d=v;city=s;}
      }
      if(city){t.owner=city.owner;t.provinceCity=city.id;}
    }
    if([...islandTiles.kyushu].some(key=>!g.tiles.find(t=>E.key(t)===key&&t.owner==='cf')))
      throw new Error('All of Kyushu must be controlled by the Chinese Federation');
    // Each staging command becomes a real, clickable army group with owned unit IDs.
    // Multiple branches staged at the same city belong to the same formation.
    const groupMap=new Map();
    const groupFor=(side,cityName)=>{
      const key=side+':'+cityName;
      if(!groupMap.has(key)) {
        const gr={id:'army-'+groupMap.size,side,name:cityName+' Command',origin:cityName,units:[]};
        groupMap.set(key,gr);g.scenario.groups.push(gr);
      }
      return groupMap.get(key);
    };
    for (const [side,cityName,cls,count,commander] of ARMY_GROUPS) {
      const city=g.stations.find(s=>s.name===cityName);
      if (!city) throw new Error('Missing army staging city '+cityName);
      for(let i=0;i<count;i++) {
        const at=nearest(g,city,t=>t.terrain!=='sea' && !E.unitAt(g,t) &&
          t.owner===side && (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),8);
        if(!at)throw new Error('No staging hex for '+side+' '+cityName);
        const type=E.typeFor(side,cls,g);
        const cmd=i===0 && commander?commander:null;
        const unit=E.newUnit(g,type,side,at.c,at.r,i===0?2:1,cmd);
        groupFor(side,cityName).units.push(unit.id);
        if (cmd && g.officers[cmd]) {unit.cmdRank=g.officers[cmd].rank;unit.hp=E.maxHP(unit);}
      }
    }
    // The same three Sakuradite deposits as the world game, tied to local cities.
    // Their output makes Mount Fuji, Sapporo and Fukuoka strategically important.
    for(const [name,cityName,base,refinery] of [
      ['Mount Fuji','Mount Fuji',40,1],
      ['Hokkaido','Sapporo',15,0],
      ['Kyushu','Fukuoka',15,0]
    ]) {
      const station=g.stations.find(s=>s.name===cityName);
      if(!station)throw new Error('Missing Sakuradite site '+cityName);
      station.refinery=refinery;
      g.sites.push({id:g.sites.length,name,c:station.c,r:station.r,base,city:station.id});
    }
    // Port hexes must be adjacent sea and not already occupied by another port.
    const portTaken=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const city=g.stations.find(s=>s.name===name);
      if(!city)throw new Error('Missing scenario port city '+name);
      const at=E.adjacent(g,city).filter(t=>t.terrain==='sea'&&!portTaken.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(t=>t.terrain==='sea').length-
            E.adjacent(g,a).filter(t=>t.terrain==='sea').length)[0]
        // Detailed islands have inland harbors like Hiroshima, one extra
        // hex back from the coast. Keep the designated operational port.
        ||nearest(g,city,t=>t.terrain==='sea'&&!portTaken.has(E.key(t)),4);
      if(!at)throw new Error('No navigable harbor near '+name);
      city.portAt={c:at.c,r:at.r};city.portLevel=level;city.portOwner=city.owner;
      portTaken.add(E.key(at));
    }
    for(const [side,cityName,type,count] of NAVAL_START){
      if(!E.TYPES[type] || !E.TYPES[type].naval)throw new Error('Unknown naval model '+type);
      const city=g.stations.find(s=>s.name===cityName);
      if(!city)throw new Error('Missing naval staging city '+cityName);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,name:cityName+' Fleet',origin:cityName,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,city,t=>t.terrain==='sea'&&!E.unitAt(g,t) &&
          !g.stations.some(s=>s.portAt?.c===t.c&&s.portAt?.r===t.r),9);
        if(!at)throw new Error('No sea staging tile near '+cityName);
        fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
      }
      g.scenario.groups.push(fleet);
    }
    // Limit playable naval hexes without cropping the visual ocean.
    restrictNavalTheatre(g);
    // Fixed external war support tops up actual city/deposit income to the
    // target opening rates. It remains fixed thereafter; city captures and
    // upgrades change earned income normally. Higher difficulties strengthen
    // rival income as well as their initial land formations.
    for(const side of SIDES) {
      const factor=side===player ? 1 : difficulty==='challenge' ? 1.6 :
        difficulty==='hard' ? 1.3 : 1;
      const base=E.income(g,side),target=INCOME_TARGETS[side];
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(target).map(([resource,value])=>
          [resource,Math.round(value*factor)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(target))
        g.economy[side][resource]=actual[resource]*STARTING_RESERVE_TURNS[side];
    }
    if(difficulty!=='normal'){
      const challenge=difficulty==='challenge';
      for(const side of SIDES.filter(s=>s!==player))
        for(const [i,u] of g.units.filter(u=>u.side===side&&!E.TYPES[u.type].naval).entries())
          if(challenge||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Chinese Federation forces control Kyushu. Britannia and the Black Knights are temporarily allied.',player);
    return g;
  }
  // The opening alliance ends at turn 10. Later work can add story/dialogue and reinforcement events.
  function onTurn(g) {
    if (g.mode !== 'scenario' || g.scenario?.id !== 'invasion-japan' ||
        g.turn < 10 || g.scenario.phase !== 'opening') return false;
    g.teams = null;
    g.scenario.phase = 'three-way-war';
    g.mapRevision = (g.mapRevision || 0) + 1;
    E.log(g, 'Turn 10: the temporary Britannia–Black Knights alliance collapses. All three powers are now at war.', g.player);
    return true;
  }
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){return OBJECTIVES[side]||'Hold strategic Japanese cities.';}
  function winner(g){
    if(g.mode!=='scenario')return null;
    const total=g.stations.reduce((n,s)=>n+s.tier,0);
    const has=(name,side)=>g.stations.some(s=>s.name===name&&s.owner===side);
    for(const side of SIDES) {
      if(g.turn<10 || !g.stations.some(s=>s.owner===side))continue;
      const required=side==='britannia'
        ? ['Tokyo Settlement','Osaka','Fukuoka']
        : side==='bk' ? ['Tokyo Settlement','Kyoto'] :
          ['Tokyo Settlement','Osaka','Fukuoka'];
      const fraction=side==='britannia'?.60:side==='bk'?.50:.55;
      if(required.every(n=>has(n,side)) && strategicScore(g,side)>=total*fraction)
        return {winner:side,reason:E.FACTIONS[side].name+' has achieved its strategic objectives in Japan.'};
    }
    return null;
  }
  const api={id:'invasion-japan',title:'The Invasion of Japan',cols:COLS,rows:ROWS,sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,create,onTurn,objective,winner,strategicScore,orderGroup};
  E.scenarios={...(E.scenarios||{}),japan:api};
  if (typeof module!=='undefined') module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

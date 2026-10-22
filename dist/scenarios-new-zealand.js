/* Chinese Federation Invasion of New Zealand, 160x160 regional hexes.
   Tactical coastline: GSHHG intermediate polygons, 37 sample points per hex:
   <20% sea, 20-80% mixed coast, >80% inland land.
   Both islands, Cook Strait and Stewart Island are physical geographic landmasses.
   No scripted time limit, no special unit stat modifications or regression tests. */
(function(root) {
  'use strict';
  const E = root.Knightmare || (typeof require === 'function' ? require('./engine.js') : null);
  const COLS=160,ROWS=160,SIDES=['cf','britannia'];
  const BOUNDS={west:160,east:179.8,north:-32,south:-48.8};
  const K=Math.cos(-40.4*Math.PI/180);
  const PROJECTION={centerLon:169.9,centerLat:-40.4,angle:0,uMin:-9.9*K,uMax:9.9*K,vMin:-8.4,vMax:8.4};
  // Rows store only non-ocean hexes: [base36 column, terrain (1=coast,
  // 2=land), base36 run length]. Source was GSHHG intermediate via Basemap,
  // 37 point samples per geographic hex; coast uses the 20–80% rule.
  const COAST_RLE=';;;;;;;;;;;;;;;;;;;;;;;2u.1.3;2v.1.2;2v.1.1,2w.2.1;2x.2.1,2y.1.1;2x.2.1,2y.1.2;2y.1.6;2y.2.6,34.1.1;2x.1.1,2y.2.7,35.1.1;2y.2.7,35.1.1,36.2.1,37.1.1;2z.2.1,30.1.1,31.2.7,38.1.1;2z.1.1,30.2.8,38.1.1;30.1.1,31.2.8,39.1.1;30.1.1,31.2.8;32.1.1,33.2.5,38.1.2;32.1.1,33.2.5,38.1.1;33.1.1,34.2.5,39.1.1;34.2.1,35.1.2,37.2.2,39.1.1,3f.1.2;35.1.4,39.2.2,3b.1.1,3g.1.2;35.1.3,38.2.3,3g.1.1;36.1.3,39.2.2,3g.1.1;36.1.2,38.2.2,3a.1.1,3f.1.2;37.1.1,38.2.3,3b.1.1,3g.1.1,3h.2.1;37.1.1,38.2.2,3a.1.1,3g.1.1,3h.2.1,3i.1.1;38.1.1,39.2.1,3a.1.4,3g.1.1,3h.2.2,3j.1.1;38.1.2,3b.1.1,3c.2.2,3e.1.1,3g.1.1,3h.2.2,3j.1.1;39.1.3,3c.2.3,3f.1.1,3h.1.1,3i.2.2,3k.1.1;39.1.1,3a.2.5,3f.1.2,3h.2.3;3a.1.1,3b.2.9,3k.1.1;3a.1.1,3b.2.9,3k.1.1;3b.2.a,42.1.1;3b.2.9,3k.1.1,40.1.1,41.2.2,43.1.2;3b.1.1,3c.2.a,3m.1.3,3z.1.1,40.2.5,45.1.1;3b.2.e,3p.1.2,3x.1.1,3y.2.6,44.1.1;3b.1.1,3c.2.g,3s.1.2,3x.1.1,3y.2.6,44.1.1;3b.1.1,3c.2.s;3b.1.1,3c.2.s,44.1.1;3a.1.1,3b.2.s,43.1.1;3a.1.1,3b.2.t;3a.2.t,43.1.1;3a.1.1,3b.2.s,43.1.1;39.1.1,3a.2.r,41.1.1;3a.2.r;38.1.1,39.2.r,40.1.1;36.1.3,39.2.r,40.1.1;34.1.1,35.2.p,3u.1.7;33.1.1,34.2.q,40.1.1;32.1.1,33.2.p,3s.1.1;33.1.1,34.2.o,3s.1.1;33.1.1,34.2.o;36.1.2,38.2.l,3t.1.1;37.1.1,38.2.l,3t.1.1;39.1.2,3b.2.i,3t.1.1;3c.1.1,3d.2.f,3s.1.1;3d.1.1,3e.2.e,3s.1.1;3e.2.d,3r.1.1;3f.2.c,3r.1.1;3e.1.1,3f.2.b;3f.2.b,3q.1.1;2t.1.2,3e.1.1,3f.2.9,3o.1.1;2s.1.1,2t.2.1,2u.1.1,3e.1.1,3f.2.9,3o.1.1;2q.1.1,2r.2.3,2u.1.1,33.1.1,3d.1.1,3e.2.9;2q.2.7,2x.1.1,33.1.2,3d.1.1,3e.2.9;2p.1.1,2q.2.7,32.1.4,3c.1.1,3d.2.9;2q.2.7,31.1.6,3b.1.1,3c.2.a;2p.1.1,2q.2.7,2z.1.2,31.2.2,33.1.3,3a.1.1,3b.2.9,3k.1.1;2p.1.1,2q.2.8,2y.1.1,2z.2.6,35.1.2,3a.1.3,3d.2.7,3k.1.1;2o.1.1,2p.2.g,3b.1.3,3e.2.4,3i.1.1;2o.1.1,2p.2.g,35.1.1,3f.2.2,3h.1.1;2n.1.1,2o.2.i,3e.1.2;2l.1.2,2n.2.j,36.1.1;2k.2.m,36.1.1;2k.1.1,2l.2.l;2j.1.1,2k.2.k,34.1.1;2j.1.1,2k.2.k,34.1.1;2j.2.k,33.1.1;2j.2.k;2i.2.j,31.1.1;2i.2.j;2g.1.1,2h.2.j,30.1.1;2g.1.1,2h.2.j,30.1.1;2e.1.1,2f.2.k;2d.1.2,2f.2.j,2y.1.1;2b.1.1,2c.2.j,2v.1.2;2a.1.1,2b.2.k,2v.1.1;28.1.1,29.2.l,2u.1.1;27.1.2,29.2.l,2u.1.1;26.1.1,27.2.n,2u.1.1;24.1.2,26.2.p,2v.1.2;22.1.1,23.2.u,2x.1.1;21.1.1,22.2.n,2p.1.2,2r.2.2,2t.1.2,2v.2.1,2w.1.2;1z.1.1,20.2.p,2p.1.1,2v.1.1;1v.1.2,1x.2.1,1y.1.1,1z.2.o,2n.1.2;1u.1.1,1v.2.o,2j.1.3;1t.1.1,1u.2.q,2k.1.1;1s.1.1,1t.2.p,2i.1.1;1r.1.1,1s.2.r;1q.1.1,1r.2.r;1p.1.1,1q.2.s,2i.1.1;1n.1.2,1p.2.s,2h.1.1;1n.1.1,1o.2.u,2i.1.1;1l.1.1,1m.2.v,2h.1.1;1l.1.1,1m.2.v,2h.1.1;1k.2.v,2f.1.1;1j.1.2,1l.2.u,2f.1.1;1i.1.1,1j.2.w;1i.1.1,1j.2.w,2f.1.1;1g.1.3,1j.2.v;1h.1.3,1k.2.u;1g.1.2,1i.2.v,2d.1.2;1g.2.w,2c.1.3;1g.1.2,1i.2.s,2a.1.1;1h.1.1,1i.2.6,1o.1.1,1p.2.l,2a.1.1;1h.1.6,1p.1.1,1q.2.i,28.1.1;1q.1.1,1r.2.1,1s.1.2,1u.2.d,27.1.1;1u.1.1,1v.2.b,26.1.1;1u.1.2,1w.2.1,1x.1.2,1z.2.5,24.1.2;1z.1.5;1q.1.1,1r.2.1,1s.1.1;1q.2.2,1s.1.1;1q.1.1,1r.2.2,1t.1.1;1p.1.1,1q.2.3,1t.1.1;1p.1.4;1o.1.1;;;;;;;;;;;;;;';
  function coastMask(){
    const cells=new Uint8Array(COLS*ROWS);
    const rows=COAST_RLE.split(';');
    if(rows.length!==ROWS)throw Error('New Zealand coastline mask row count '+rows.length);
    rows.forEach((row,r)=>{if(!row)return;for(const run of row.split(',')){
      const [a,b,n]=run.split('.');
      const c=parseInt(a,36),len=parseInt(n,36),v=Number(b);
      if(!Number.isInteger(c)||!Number.isInteger(len)||!len||c+len>COLS||![1,2].includes(v))
        throw Error('Invalid New Zealand coast run '+run);
      for(let x=c;x<c+len;x++)cells[r*COLS+x]=v;
    }});
    return cells;
  }
  // [name, longitude, latitude, tier, fortified, island, airfield]

  // [place, WGS84 longitude, latitude, tier, fortified, landmass, airbase].
  // Landmass labels constrain nearby city placement to its real physical island.
  const CITIES=[
    ['Kaitaia',173.26,-35.115,2,true,'north',false],
    ['Kerikeri',173.95,-35.225,2,false,'north',false],
    ['Whangarei',174.323,-35.725,3,true,'north',false],
    ['Dargaville',173.88,-35.94,2,false,'north',false],
    ['Auckland',174.763,-36.849,3,true,'north',true],
    ['Whenuapai Air Base',174.627,-36.79,2,true,'north',true],
    ['Pukekohe',174.901,-37.2,2,false,'north',false],
    ['Thames',175.54,-37.14,2,false,'north',false],
    ['Hamilton',175.279,-37.787,3,true,'north',false],
    ['Cambridge',175.44,-37.89,2,false,'north',false],
    ['Tauranga',176.167,-37.687,3,true,'north',false],
    ['Whakatane',176.987,-37.959,2,true,'north',false],
    ['Rotorua',176.25,-38.136,3,true,'north',false],
    ['Taupo',176.07,-38.687,3,true,'north',false],
    ['Tokoroa',175.87,-38.23,2,false,'north',false],
    ['Te Kuiti',175.16,-38.33,2,false,'north',false],
    ['New Plymouth',174.083,-39.055,3,true,'north',false],
    ['Stratford',174.286,-39.34,2,false,'north',false],
    ['Waiouru',175.67,-39.47,3,true,'north',true],
    ['Gisborne',178.02,-38.66,3,true,'north',false],
    ['Wairoa',177.42,-39.04,2,false,'north',false],
    ['Napier',176.912,-39.49,3,true,'north',false],
    ['Hastings',176.85,-39.64,2,true,'north',false],
    ['Waipukurau',176.56,-40.0,2,false,'north',false],
    ['Whanganui',175.05,-39.93,2,true,'north',false],
    ['Palmerston North',175.61,-40.35,3,true,'north',false],
    ['Ohakea Air Base',175.39,-40.205,3,true,'north',true],
    ['Masterton',175.66,-40.95,2,true,'north',false],
    ['Levin',175.29,-40.62,2,false,'north',false],
    ['Porirua',174.84,-41.13,2,true,'north',false],
    ['Wellington',174.777,-41.288,3,true,'north',true],
    ['Takaka',172.81,-40.86,2,false,'south',false],
    ['Motueka',173.02,-41.12,2,false,'south',false],
    ['Nelson',173.285,-41.271,3,true,'south',false],
    ['Picton',174.002,-41.291,3,true,'south',false],
    ['Blenheim',173.956,-41.512,3,true,'south',true],
    ['Westport',171.6,-41.75,2,true,'south',false],
    ['Murchison',172.33,-41.8,2,false,'south',false],
    ['Reefton',171.86,-42.12,2,false,'south',false],
    ['Kaikoura',173.681,-42.401,2,true,'south',false],
    ['Hanmer Springs',172.83,-42.52,2,false,'south',false],
    ['Greymouth',171.21,-42.45,3,true,'south',false],
    ['Hokitika',170.97,-42.72,2,true,'south',false],
    ['Arthur’s Pass',171.56,-42.94,2,true,'south',false],
    ['Christchurch',172.636,-43.532,3,true,'south',true],
    ['Rangiora',172.59,-43.30,2,true,'south',false],
    ['Lyttelton',172.718,-43.604,3,true,'south',false],
    ['Ashburton',171.75,-43.90,2,false,'south',false],
    ['Haast',169.04,-43.88,2,true,'south',false],
    ['Timaru',171.252,-44.396,3,true,'south',false],
    ['Twizel',170.1,-44.26,2,true,'south',false],
    ['Oamaru',170.967,-45.097,2,true,'south',false],
    ['Queenstown',168.662,-45.031,3,true,'south',false],
    ['Wanaka',169.14,-44.70,2,true,'south',false],
    ['Cromwell',169.2,-45.04,2,false,'south',false],
    ['Te Anau',167.72,-45.41,2,true,'south',false],
    ['Alexandra',169.39,-45.25,2,false,'south',false],
    ['Dunedin',170.503,-45.878,3,true,'south',true],
    ['Balclutha',169.74,-46.24,2,false,'south',false],
    ['Gore',168.94,-46.10,2,true,'south',false],
    ['Invercargill',168.354,-46.413,3,true,'south',false],
    ['Bluff',168.32,-46.60,3,true,'south',false],
    ['Oban',168.13,-46.90,2,true,'stewart',false]
  ];
  // Port owner/port hex is independent of the city; coastal ownership transfers
  // only through existing capture rules, not through scripted territorial edits.
  const PORTS={
    'Whangarei':3,'Auckland':3,'Tauranga':3,'Whakatane':2,'Gisborne':2,
    'Napier':3,'New Plymouth':3,'Wellington':3,
    'Nelson':3,'Picton':3,'Westport':2,'Kaikoura':2,
    'Greymouth':2,'Hokitika':2,'Lyttelton':3,'Timaru':3,
    'Oamaru':2,'Dunedin':3,'Bluff':3,'Oban':2
  };
  // Chinese Federation expeditionary formations start offshore: no land or city.
  // [fleet name, longitude, latitude, carrier count, amphibious escort count, cargo]
  const LANDINGS=[
    ['Northern Tasman Armada',170.9,-34.85,4,4,
      [['heavy',2,'xingke'],['assault',2,'xianglin'],['rocket',2,null],['medium',2,null]]],
    ['Bay of Plenty Strike Fleet',178.3,-36.15,4,4,
      [['heavy',2,'cao'],['assault',2,'honggu'],['medium',2,null],['support',2,null]]],
    ['Taranaki Expedition',169.8,-39.20,4,3,
      [['heavy',2,'chaojielun'],['rocket',2,'huangqian'],['assault',2,null],['medium',2,null]]],
    ['Cook Strait Breakthrough',171.05,-40.95,5,5,
      [['heavy',3,'ren'],['rocket',2,'sawasaki'],['assault',2,null],['support',2,null]]],
    ['Westland Invasion Fleet',164.4,-43.15,4,4,
      [['heavy',2,'vritra'],['assault',2,'chengzhong'],['rocket',2,null],['medium',2,null]]],
    ['Canterbury Landing Fleet',177.0,-43.9,5,5,
      [['heavy',3,'gaohai'],['assault',2,'zhaohao'],['rocket',2,null],['medium',2,null]]],
    ['Southern Ocean Expedition',173.5,-46.85,4,4,
      [['heavy',2,'leifeng'],['assault',2,'meiling'],['medium',2,null],['siege',2,null]]]
  ];
  // Britannian standing armies, garrisons and operational reserves.
  const DEFENDERS=[
    ['Auckland','heavy',4,'cornelia'],['Auckland','rocket',3,'cecile'],
    ['Whangarei','assault',3,'guilford'],['Whenuapai Air Base','medium',2,null],
    ['Hamilton','heavy',4,'jeremiah'],['Hamilton','rocket',2,null],
    ['Tauranga','assault',3,'gino'],['Rotorua','medium',3,'villetta'],
    ['Taupo','heavy',3,null],['Waiouru','heavy',4,'bismarck'],
    ['New Plymouth','heavy',3,'oldrin'],['Gisborne','medium',3,null],
    ['Napier','assault',3,'darlton'],['Palmerston North','heavy',4,'suzaku'],
    ['Ohakea Air Base','rocket',3,null],['Wellington','heavy',5,null],
    ['Wellington','rocket',3,null],['Masterton','medium',3,null],
    ['Nelson','heavy',3,null],['Picton','heavy',4,null],
    ['Blenheim','rocket',3,null],['Westport','medium',3,null],
    ['Greymouth','heavy',3,null],['Kaikoura','medium',3,null],
    ['Christchurch','heavy',5,null],['Christchurch','rocket',3,null],
    ['Lyttelton','heavy',3,null],['Ashburton','medium',3,null],
    ['Timaru','heavy',4,null],['Oamaru','medium',3,null],
    ['Dunedin','heavy',4,null],['Dunedin','rocket',3,null],
    ['Queenstown','heavy',4,null],['Twizel','heavy',3,null],
    ['Invercargill','heavy',4,null],['Bluff','assault',3,null],
    ['Te Anau','medium',3,null],['Oban','medium',2,null]
  ];
  const NAVY=[
    ['Auckland','carrier_battleship',4],['Auckland','portman_ii',4],
    ['Whangarei','portman_ii',3],['Tauranga','carrier_battleship',3],
    ['Napier','portman_ii',3],['New Plymouth','carrier_battleship',3],
    ['Wellington','carrier_battleship',4],['Wellington','portman_ii',5],
    ['Picton','carrier_battleship',3],['Picton','portman_ii',3],
    ['Nelson','portman_ii',3],['Lyttelton','carrier_battleship',4],
    ['Lyttelton','portman_ii',4],['Timaru','portman_ii',2],
    ['Dunedin','carrier_battleship',3],['Bluff','carrier_battleship',3],
    ['Bluff','portman_ii',3],['Oban','portman_ii',2]
  ];
  const FUNDING={cf:{credits:1190,industry:665,science:82,sakuradite:46},
    britannia:{credits:1250,industry:690,science:90,sakuradite:50}};
  // Approximate relief by topographic corridors; shoreline itself is GSHHG.
  const MOUNTAINS=[
    [172.6,-41.65,.58,.45],[172.4,-42.2,.58,.52],
    [171.65,-42.95,.65,.62],[170.55,-43.58,.77,.72],
    [169.7,-44.15,.75,.78],[168.9,-44.75,.72,.72],
    [167.95,-45.38,1.05,.68],[167.45,-45.95,.70,.53],
    [175.6,-39.27,.57,.57],[175.95,-38.7,.43,.45],
    [176.18,-38.22,.43,.40],[176.4,-39.3,.58,.54],
    [175.1,-40.65,.58,.48],[173.45,-42.37,.43,.50]
  ];
  const FORESTS=[
    [173.8,-35.6,1.5,.95],[175.45,-38.5,.98,.94],
    [176.8,-39.2,.78,.64],[175.1,-40.8,.8,.56],
    [171.35,-42.25,.83,.7],[170.8,-43.8,1.2,1.2],
    [168.0,-45.65,1.2,.9],[169.4,-46.3,1.0,.55]
  ];
  // Geographic vectors remain distinct from gameplay terrain. Cook Strait is
  // open sea; rivers are rendered as waterways, not ship shortcuts.
  const RIVERS={
    Waikato:[[175.95,-38.72],[175.68,-38.53],[175.32,-37.87],[175.18,-37.48],[174.75,-37.38]],
    Whanganui:[[175.65,-39.35],[175.29,-39.55],[175.16,-39.81],[175.06,-39.94]],
    Rangitikei:[[175.85,-39.55],[175.61,-39.92],[175.28,-40.06]],
    Waimakariri:[[171.58,-42.89],[172.03,-43.24],[172.60,-43.39]],
    Rakaia:[[171.50,-43.28],[172.05,-43.58],[172.60,-43.88]],
    Waitaki:[[170.3,-44.2],[170.95,-44.58],[171.15,-44.94]],
    Clutha:[[169.1,-44.7],[169.2,-45.05],[169.45,-45.48],[169.64,-46.0],[169.77,-46.25]]
  };
  function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
    lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round((lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function landscape(p){
    const density=areas=>Math.max(0,...areas.map(([x,y,dx,dy])=>
      Math.exp(-(((p.lon-x)/dx)**2+((p.lat-y)/dy)**2)*1.6)));
    const m=density(MOUNTAINS),f=density(FORESTS);
    if(m>.55)return 'mountain';
    if(f>.42||m>.24)return 'forest';
    return 'plains';
  }
  function nearest(g,origin,predicate,radius=12) {
    const p=origin.c==null?locate(origin.lon,origin.lat):origin;
    let best=null,dist=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!predicate(t))continue;
        const d=E.distance(p,t,g);
        if(d<dist){dist=d;best=t;}
      }
    return best;
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Unknown task force','No unit can reach destination');}
  function create(player='cf',difficulty='normal',seed=201717){
    if(!SIDES.includes(player))throw Error('Unsupported New Zealand faction '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,
      player,difficulty,mode:'scenario',era:'cf-new-zealand',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},
      officers:Object.fromEntries(Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:{britannia:'britannia',cf:'cf'}};
    for(const side of [...SIDES,'neutral']) {
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'cf-new-zealand',key:'newZealand',title:'Chinese Federation Invasion of New Zealand',
      version:1,phase:'federation-twin-island-offensive',aiDoctrine:'europe',
      groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,citylessFunding:['cf'],
      airfields:[],islandNames:['North Island','South Island','Stewart Island'],
      reliefZones:MOUNTAINS,forestZones:FORESTS};
    const elites=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      elites.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&E.ELITE_FORCES[id].availableTo.includes(side))]));
    const mask=coastMask();
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,v=mask[i];
      return {c,r,owner:null,terrain:v===0?'sea':v===1?'coast':landscape(geo(c,r))};
    });
    // Flood-fill physical islands: stations and ownership can never bridge open water.
    const components=new Int16Array(mask.length).fill(-1);
    let componentCount=0;
    for(let i=0;i<mask.length;i++){
      if(!mask[i]||components[i]>=0)continue;
      const q=[g.tiles[i]];components[i]=componentCount;
      for(let k=0;k<q.length;k++)for(const t of E.adjacent(g,q[k])){
        const j=t.r*COLS+t.c;
        if(mask[j]&&components[j]<0){components[j]=componentCount;q.push(t);}
      }
      componentCount++;
    }
    const islandComponent=new Map();
    for(const [name,lon,lat,tier,fort,island,airfield] of CITIES){
      const wanted=islandComponent.get(island);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r)&&
        (wanted==null||components[t.r*COLS+t.c]===wanted)&&
        (!Object.prototype.hasOwnProperty.call(PORTS,name)||
          E.adjacent(g,t).some(n=>n.terrain==='sea')),13);
      if(!at)throw Error('Cannot locate New Zealand city '+name+' on '+island);
      const component=components[at.r*COLS+at.c];
      if(wanted!=null&&component!==wanted)throw Error('City escaped island '+name);
      islandComponent.set(island,component);
      const capital=name==='Wellington';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      const s={id:g.stations.length,name,c:at.c,r:at.r,owner:'britannia',tier,
        capital,capitalOf:capital?'britannia':null,fort:!!fort,
        gun:fort?name+' Coastal Battery':null,lab:airfield?1:0,refinery:0,
        airfield:!!airfield,island,
        shield,maxShield:shield,income:capital?52:Math.round(12+8*tier),
        industry:capital?28:5+7*tier,science:2+tier,producedTurn:0};
      g.stations.push(s);
      if(airfield)g.scenario.airfields.push(s.id);
    }
    if(islandComponent.size!==3||new Set(islandComponent.values()).size!==3)
      throw Error('New Zealand island coastline connectivity audit failed');
    const byComponent=new Map();
    for(const s of g.stations){
      const id=components[s.r*COLS+s.c];
      if(!byComponent.has(id))byComponent.set(id,[]);
      byComponent.get(id).push(s);
    }
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const cities=byComponent.get(components[t.r*COLS+t.c]);
      if(!cities?.length)continue;
      const city=cities.reduce((best,v)=>!best||E.distance(t,v,g)<E.distance(t,best,g)?v:best,null);
      t.owner='britannia';t.provinceCity=city.id;
    }
    const portHexes=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&!portHexes.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(t=>t.terrain==='sea').length-
          E.adjacent(g,a).filter(t=>t.terrain==='sea').length)[0];
      if(!at)throw Error('No independent sea port at '+name);
      s.portAt={c:at.c,r:at.r};s.portOwner='britannia';s.portLevel=level;
      portHexes.add(E.key(at));
    }
    const groupIndex=new Map();
    function group(side,name){
      const key=side+':'+name;
      if(!groupIndex.has(key)){
        const v={id:'army-'+groupIndex.size,side,name:name+' Command',origin:name,units:[]};
        groupIndex.set(key,v);g.scenario.groups.push(v);
      }
      return groupIndex.get(key);
    }
    // Defensive formations are on land. Reserve armies can redeploy between islands
    // through the core carrier logistics; no faction or AI rule is overridden.
    for(const [name,cls,count,commander] of DEFENDERS){
      const s=g.stations.find(v=>v.name===name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner==='britannia'&&(!E.stationAt(g,t)||E.stationAt(g,t).owner==='britannia'),12);
        if(!at)throw Error('No defensive tile near '+name);
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor('britannia',cls,g),'britannia',at.c,at.r,i===0?2:1,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group('britannia',name).units.push(u.id);
      }
    }
    const placeFleet=(side,name,point,type,count,mark)=> {
      if(!E.TYPES[type]?.naval)throw Error('Invalid ship '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,point,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !portHexes.has(E.key(t)),16);
        if(!at)throw Error('No sea spawn near '+name);
        const u=E.newUnit(g,type,side,at.c,at.r);
        if(mark)u.invasionGroup=name;
        fleet.units.push(u.id);
      }
      g.scenario.groups.push(fleet);
    };
    for(const [name,lon,lat,carriers,amphibious] of LANDINGS){
      const at=locate(lon,lat);
      placeFleet('cf',name,at,'cf_carrier',carriers,true);
      placeFleet('cf',name+' Amphibious',at,'shui_gun_ru_ii',amphibious,false);
    }
    for(const [name,type,count] of NAVY) {
      const s=g.stations.find(v=>v.name===name);
      placeFleet('britannia',name,s,type,count,false);
    }
    const carriers=g.units.filter(u=>u.side==='cf'&&u.invasionGroup&&E.TYPES[u.type].capacity>0);
    const passengers=[];
    for(const [name,lon,lat,carrierCount,amphibious,formations] of LANDINGS)
      for(const [cls,count,commander] of formations)for(let i=0;i<count;i++){
        const ship=carriers.find(v=>v.invasionGroup===name&&
          (v.pendingPassengers||0)<E.TYPES[v.type].capacity);
        if(!ship)throw Error('New Zealand carrier capacity exceeded for '+name);
        ship.pendingPassengers=(ship.pendingPassengers||0)+1;
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor('cf',cls,g),'cf',ship.c,ship.r,i===0?2:1,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group('cf',name).units.push(u.id);
        passengers.push({ship,u});
      }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const {ship,u} of passengers){(ship.cargo||=[]).push(u);g.units.splice(g.units.indexOf(u),1);}
    for(const ship of carriers)delete ship.pendingPassengers;
    for(const side of SIDES){
      const baseline=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([k,v])=>[k,Math.round(v)-baseline[k]]));
      const income=E.income(g,side);
      for(const k of Object.keys(FUNDING[side]))
        g.economy[side][k]=({"cf":{"credits":2000,"industry":500,"science":246},"britannia":{"credits":2000,"industry":500,"science":180}}[side]||{})[k] ?? (income[k]*(sid);
    }
    if(difficulty==='hard'||difficulty==='challenge'){
      for(const side of SIDES.filter(s=>s!==player)){
        let i=0;
        for(const u of g.units.flatMap(v=>[v,...(v.cargo||[])]).filter(v=>
          v.side===side&&E.TYPES[v.type].naval!=='ship')){
          E.addDifficultyFrames(u,difficulty);
          i++;
        }
      }
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(side=>[side,g.units.reduce((n,u)=>n+
      (u.side===side?1:0)+(u.cargo||[]).filter(v=>v.side===side).length,0)]));
    E.log(g,'The Federation launches seven carrier-led invasions of both main islands while Britannia contests Cook Strait. Take every city without a turn limit.',player);
    return g;
  }
  // Let existing engine amphibious, pursuit, port, production and counterattack AI
  // handle each turn, including reinforcements. No scripted round cap.
  function onTurn(){return false;}
  function strategicScore(g,side){return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);}
  function objective(g,side=g.player){
    const left=g.stations.filter(s=>s.owner==='britannia').length;
    return side==='cf'
      ?'Land on both islands, seize Cook Strait and conquer every city ('+left+' Britannian cities remain).'
      :'Destroy the Chinese Federation expedition or recapture every occupied city ('+
        g.stations.filter(s=>s.owner==='cf').length+' cities lost).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='cf-new-zealand'||
       g.stations.length!==CITIES.length)return null;
    if(g.stations.every(s=>s.owner==='cf'))
      return {winner:'cf',team:'cf',reason:'The Chinese Federation has conquered every New Zealand city.'};
    if(!g.stations.some(s=>s.owner==='cf')&&
       !E.allUnits(g).some(u=>u.side==='cf'&&u.hp>0))
      return {winner:'britannia',team:'britannia',
        reason:'Britannia has destroyed the Chinese Federation expedition and holds all New Zealand cities.'};
    return null;
  }
  const api={id:'cf-new-zealand',title:'Chinese Federation Invasion of New Zealand',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,ports:PORTS,rivers:RIVERS,
    landingData:LANDINGS,defenderData:DEFENDERS,create,onTurn,objective,winner,
    strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,overlays:['reliefZones','regionalRivers']},
    elite:true,expeditionSide:'cf',
    text:{
      era:"New Zealand · Chinese Federation World Campaign",
      intro:"The Chinese Federation has no mainland cities: seven carrier-led task forces invade North Island, South Island and Stewart Island while Britannia defends all cities and major naval bases. Total conquest without a turn limit.",
      diplomacy:"Both sides are hostile from turn one. Carrier cargo must land amphibiously; Cook Strait remains navigable; shipyards are independently capturable. Army Groups cover both island campaigns.",
      elite:"Elite uses standardized Chinese and Britannian Elite Force rosters, rival Level 5 commanders and established difficulty scaling; carrier hulls remain conventional.",
      focus:{
        cf:"",
        britannia:"Wellington"
      }
    },
    blurbs:{
      cf:"Lead seven carrier-led landing fleets against North Island and South Island simultaneously. Force Cook Strait, establish beachheads, cross the Southern Alps and take every Britannian city.",
      britannia:"Hold both New Zealand islands with fortified Army Groups, naval bases and mobile reserves. Intercept Chinese carrier fleets in Cook Strait and counterattack every bridgehead."
    }};
  E.scenarios={...(E.scenarios||{}),newZealand:api,
    byId:{...(E.scenarios?.byId||{}),'cf-new-zealand':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

/* Invasion of the Caribbean — E.U. offshore island-hopping against Britannia.
   184 x 120 WGS84 regional hexes; GSHHS intermediate coast with clipped 20–80%
   mixed cells. Mainland is off-map; open Caribbean passages remain navigable.
   All starting towns are Britannian. Original faction stats are unchanged. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=184,ROWS=120,SIDES=['eu','britannia'];
  const BOUNDS={west:-86,east:-58.5,north:27.5,south:9.3};
  const K=Math.cos(18.4*Math.PI/180);
  const PROJECTION={centerLon:-72.25,centerLat:18.4,angle:0,
    uMin:-13.75*K,uMax:13.75*K,vMin:-9.1,vMax:9.1};
  // Exact hex-clip classifications from GSHHS intermediate:
  // 0 water (<20% land), 1 mixed (20–80%), 2 land (>80%), 3 off-map mainland.
  // Each semicolon is a complete grid row. Runs are base-36 start.length.class.
  const SHORE_RUNS="m.g.3;m.g.3;n.g.3;n.g.3;p.f.3,1l.1.1;p.1.1,q.e.3,1d.1.2,1e.4.1,1l.1.1;q.e.3,1c.2.1,1n.1.1;r.c.3,1m.2.1;s.c.3,1m.1.1;r.c.3,1l.2.1;t.b.3,1m.1.1;u.9.3;w.6.3;w.6.3,1p.1.1;w.6.3;w.4.3,1f.2.1,1t.1.1;1g.2.1,1l.1.1;1f.1.1,1g.1.2,1h.1.1,1t.1.1;1f.1.1,1g.3.2,1t.1.1;1e.1.1,1f.3.2,1i.1.1;1g.1.1,1h.1.2,1i.1.1,1y.1.1;1i.2.1,1y.1.1;1i.3.1,1y.1.1,25.1.1;1i.1.1,1j.1.2,1k.1.1,24.1.1;;1u.1.1;20.1.1;;o.6.1,20.1.1;i.5.1,n.8.2,v.3.1,y.1.2,z.1.1,21.1.1;g.2.1,i.k.2,12.1.1,13.1.2,14.1.1,22.1.1;d.2.1,f.6.2,l.4.1,p.g.2,15.1.1,26.3.1;c.1.1,d.7.2,k.1.1,t.e.2,17.1.1,1d.2.1,28.1.1;a.1.1,b.7.2,i.1.1,p.3.1,s.g.2,18.4.1,1d.4.1,27.1.1,2d.3.1;a.1.1,b.7.2,r.1.1,s.4.2,w.1.1,x.h.2,1e.1.1,1g.2.1,27.1.1,2g.1.1;a.1.1,b.2.2,d.1.1,u.3.1,x.i.2,1f.4.1;8.2.1,a.2.2,c.2.1,k.1.1,11.1.1,12.f.2,1h.3.1,2l.1.1;7.1.1,9.2.1,j.2.2,l.1.1,12.2.1,14.e.2,1i.3.1,2j.1.1,2l.3.1;k.3.2,15.3.1,18.4.2,1c.1.1,1d.8.2,1l.3.1,2o.1.1;i.2.1,k.1.2,l.2.1,1c.1.1,1d.9.2,1m.2.1,2e.1.1;1e.b.2,1p.2.1;1d.1.1,1e.c.2,1q.1.1,1r.1.2,1s.1.1,2b.1.1,2d.2.1;1e.1.1,1f.f.2,1u.1.1,1v.2.2,1x.1.1,2a.1.1,2b.3.2,2e.1.1;1f.1.1,1g.h.2,2a.2.1;1g.3.1,1j.d.2,1w.3.1;1m.1.1,1n.f.2,22.1.1;1n.1.1,1o.g.2,24.1.1;1m.1.1,1n.i.2,25.2.1;1l.1.1,1m.l.2;1j.1.1,1k.5.2,1p.7.1,1w.4.2,20.2.1,2f.2.1;1j.3.1,1z.1.1,2c.1.1,2d.5.2,2i.1.1,2n.1.1,2o.1.2,2p.3.1,2s.1.2,2t.2.1;2b.1.1,2c.8.2,2k.3.1,2n.9.2,2w.1.1,2y.1.1;2f.1.1,2g.k.2;v.1.1,2g.1.1,2h.i.2,2z.1.1;2g.1.1,2h.k.2,31.4.1;2g.l.2,31.2.1;2d.2.1,2h.1.1,2i.p.2,37.1.1;2d.3.1,2h.1.1,2i.q.2,38.1.1;25.4.1,2j.1.1,2k.q.2;1f.8.1,24.1.1,25.5.2,2a.7.1,2h.i.2,2z.2.1,31.2.2,33.1.1,34.5.2,39.1.1,3h.9.1;1f.1.1,1g.9.2,1p.1.1,25.2.1,27.m.2,2t.1.1,2v.3.2,2y.1.1,37.1.2,38.1.1,3h.1.1,3i.a.2,3s.1.1;1f.2.1,1h.9.2,1q.2.1,27.1.1,28.1.2,29.1.1,2d.5.1,2l.1.1,2m.5.2,2r.1.1,2v.1.1,37.1.1,3h.1.1,3i.9.2,3r.3.1;1i.1.1,1j.a.2,29.1.1,2n.1.1,2o.3.2,2r.1.1,3i.8.2,3q.1.1;1i.7.1,1q.3.1,2n.1.1,2o.2.2,2q.1.1;1m.1.1,2o.1.1,2p.1.2,3x.2.1;4h.1.1;4b.1.1;;4h.2.1;;4f.1.1;;4k.1.1;4h.4.1;4i.1.2,4j.2.1;0.1.3,4h.1.1,4i.1.2;0.9.3,4l.1.1;0.c.3;0.e.3,4k.1.1;0.d.3,4j.1.1,4k.1.2;0.h.3,4k.2.1;0.i.3;0.j.3;0.i.3,4l.2.1;0.i.3,4m.1.2,4n.1.1;0.i.3,4m.1.1,4n.1.2;0.j.3;0.i.3;0.i.3,4n.1.1;0.h.3,4m.2.1;0.h.3,4n.1.1;0.g.3;0.h.3;0.g.3,4l.1.1;0.h.3,4l.2.1,4w.2.1;0.g.3;0.h.3;0.g.3;0.h.3,2z.1.1;0.g.3,2n.3.3,34.1.1;0.g.3,2l.6.3,35.1.1,3a.1.1;0.f.3,2k.7.3,2x.3.3,35.2.1,3a.1.1,4h.2.1;0.f.3,2k.7.3,2x.4.3;0.f.3,2h.9.3,2x.3.3;0.g.3,2g.8.3,2x.4.3;0.f.3,2e.8.3,2y.1.3,30.5.3;0.f.3,27.2.3,2d.9.3,2w.c.3,4p.1.1;0.e.3,26.h.3,2s.h.3,4o.2.1;2.d.3,22.3.3,26.i.3,2r.k.3,40.3.1,43.1.2,44.1.1;0.g.3,20.n.3,2p.l.3,3t.2.1,42.2.1;2.e.3,1z.1c.3,48.9.3,4j.2.1,4l.2.2,4n.1.1;1.f.3,1y.1d.3,3g.9.3,41.e.3,4j.1.1,4k.2.2,4m.1.1;1.g.3,1y.q.3,2p.11.3,41.b.3,4k.3.2;0.i.3,1x.q.3,2p.12.3,3z.d.3,4j.1.1,4k.3.2;1.i.3,1y.p.3,2q.15.3,3x.h.3,4h.2.1,4j.3.2,4m.1.1;1.j.3,1x.o.3,2q.1q.3;3.5.3,9.c.3,1x.o.3,2s.1s.3;4.2.3,8.e.3,1x.o.3,2r.1u.3;9.f.3,16.5.3,1x.p.3,2s.1w.3;c.c.3,14.b.3,1u.t.3,2r.1x.3";
  const SHORE=SHORE_RUNS.split(';').map(line=>{
    const row=new Uint8Array(COLS);
    if(line)for(const token of line.split(',')){
      const [start,length,kind]=token.split('.');
      const first=parseInt(start,36),end=first+parseInt(length,36);
      row.fill(Number(kind),first,end);
    }
    return row;
  });
  if(SHORE.length!==ROWS)throw Error('Caribbean shoreline has incorrect row count');
  function coastCoverageClass(c,r){return SHORE[r][c];}
  // [name, longitude, latitude, owner, factory tier, coastal fortification]
  const CITIES=[["Havana",-82.366,23.114,"britannia",3,true],["Matanzas",-81.575,23.051,"britannia",2,false],["Cienfuegos",-80.452,22.149,"britannia",2,true],["Santa Clara",-79.964,22.408,"britannia",2,false],["Camaguey",-77.916,21.381,"britannia",3,true],["Holguin",-76.26,20.89,"britannia",2,false],["Santiago de Cuba",-75.83,20.02,"britannia",3,true],["Guantanamo",-75.21,20.14,"britannia",2,true],["Pinar del Rio",-83.697,22.417,"britannia",2,false],["Ciego de Avila",-78.76,21.84,"britannia",2,false],["Port-au-Prince",-72.34,18.54,"britannia",3,true],["Cap-Haitien",-72.2,19.76,"britannia",2,true],["Les Cayes",-73.76,18.2,"britannia",2,true],["Santo Domingo",-69.93,18.49,"britannia",3,true],["Santiago de los Caballeros",-70.69,19.45,"britannia",3,false],["La Romana",-68.97,18.43,"britannia",2,true],["Punta Cana",-68.4,18.58,"britannia",2,true],["Kingston",-76.79,17.97,"britannia",3,true],["Montego Bay",-77.89,18.48,"britannia",2,true],["Port Antonio",-76.46,18.17,"britannia",2,true],["San Juan",-66.11,18.47,"britannia",3,true],["Ponce",-66.61,18.01,"britannia",2,true],["Mayaguez",-67.15,18.2,"britannia",2,true],["Nassau",-77.35,25.05,"britannia",3,true],["Freeport",-78.7,26.54,"britannia",2,true],["Marsh Harbour",-77.06,26.55,"britannia",2,true],["George Town",-75.87,23.5,"britannia",2,true],["Matthew Town",-73.67,20.95,"britannia",2,true],["Clarence Town",-74.97,23.1,"britannia",2,true],["Cockburn Town",-71.14,21.45,"britannia",2,true],["Basseterre",-62.72,17.3,"britannia",2,true],["St John's",-61.85,17.12,"britannia",2,true],["Pointe-a-Pitre",-61.53,16.24,"britannia",3,true],["Roseau",-61.39,15.3,"britannia",2,true],["Fort-de-France",-61.06,14.6,"britannia",3,true],["Castries",-60.99,14,"britannia",2,true],["Kingstown",-61.22,13.16,"britannia",2,true],["Bridgetown",-59.61,13.1,"britannia",2,true],["St George's",-61.75,12.05,"britannia",2,true],["Port of Spain",-61.52,10.66,"britannia",3,true],["Scarborough",-60.73,11.18,"britannia",2,true]];
  // Named invasion columns and island defense commands.
  const ARMY_GROUPS=[["eu","Western Cuba","heavy",3,"akito"],["eu","Western Cuba","rocket",3,"yukiya"],["eu","Western Cuba","assault",3,"ryo"],["eu","Western Cuba","medium",2,"ayano"],["eu","Windward Passage","heavy",3,"leila"],["eu","Windward Passage","siege",2,"smilas"],["eu","Windward Passage","assault",2,"oscar"],["eu","Jamaica Channel","heavy",3,"klaus"],["eu","Jamaica Channel","rocket",2,"anna"],["eu","Jamaica Channel","medium",2,"olivia"],["eu","Bahama Banks","heavy",3,"margaret"],["eu","Bahama Banks","assault",2,"fernando"],["eu","Bahama Banks","raider",2,"pierre"],["eu","Antilles Arc","heavy",3,"yukiya"],["eu","Antilles Arc","assault",3,"akito"],["eu","Antilles Arc","rocket",2,"ryo"],["eu","Eastern Caribbean","heavy",3,"leila"],["eu","Eastern Caribbean","rocket",2,"oscar"],["eu","Eastern Caribbean","medium",2,"klaus"],["britannia","Havana","heavy",4,"cornelia"],["britannia","Havana","rocket",2,"cecile"],["britannia","Santiago de Cuba","heavy",3,"suzaku"],["britannia","Camaguey","medium",3,"gino"],["britannia","Guantanamo","assault",2,"jeremiah"],["britannia","Pinar del Rio","rocket",2,"guilford"],["britannia","Santo Domingo","heavy",4,"bismarck"],["britannia","Port-au-Prince","heavy",3,"darlton"],["britannia","Cap-Haitien","rocket",2,"villetta"],["britannia","La Romana","medium",2,null],["britannia","Kingston","heavy",3,"oldrin"],["britannia","Montego Bay","rocket",2,null],["britannia","San Juan","heavy",3,null],["britannia","Ponce","rocket",2,null],["britannia","Nassau","heavy",3,null],["britannia","Freeport","medium",2,null],["britannia","Marsh Harbour","assault",2,null],["britannia","Pointe-a-Pitre","heavy",2,null],["britannia","Fort-de-France","rocket",2,null],["britannia","Port of Spain","heavy",3,null],["britannia","St John's","medium",2,null],["britannia","Bridgetown","medium",2,null],["britannia","Castries","medium",2,null],["britannia","St George's","medium",2,null]];
  // Every port is an independent naval facility; its controller follows port capture.
  const PORTS={"Havana":3,"Cienfuegos":2,"Camaguey":3,"Santiago de Cuba":3,"Guantanamo":2,"Port-au-Prince":3,"Cap-Haitien":2,"Les Cayes":2,"Santo Domingo":3,"La Romana":2,"Punta Cana":2,"Kingston":3,"Montego Bay":2,"Port Antonio":2,"San Juan":3,"Ponce":2,"Mayaguez":2,"Nassau":3,"Freeport":2,"Marsh Harbour":2,"George Town":2,"Matthew Town":2,"Clarence Town":2,"Cockburn Town":2,"Basseterre":2,"St John's":2,"Pointe-a-Pitre":3,"Roseau":2,"Fort-de-France":3,"Castries":2,"Kingstown":2,"Bridgetown":2,"St George's":2,"Port of Spain":3,"Scarborough":2};
  // [side, task force or harbour, longitude, latitude, ship type, count]
  const FLEETS=[["eu","Western Cuba",-84.9,20.1,"eu_carrier",6],["eu","Western Cuba",-84.9,20.1,"panzer_frosch_ii",3],["eu","Windward Passage",-73.9,21.4,"eu_carrier",4],["eu","Windward Passage",-73.9,21.4,"panzer_frosch_ii",3],["eu","Jamaica Channel",-78.7,16,"eu_carrier",4],["eu","Jamaica Channel",-78.7,16,"panzer_frosch_ii",3],["eu","Bahama Banks",-79.8,24.3,"eu_carrier",4],["eu","Bahama Banks",-79.8,24.3,"panzer_frosch_ii",3],["eu","Antilles Arc",-63.4,14.5,"eu_carrier",4],["eu","Antilles Arc",-63.4,14.5,"panzer_frosch_ii",3],["eu","Eastern Caribbean",-64.6,18.5,"eu_carrier",4],["eu","Eastern Caribbean",-64.6,18.5,"panzer_frosch_ii",3],["britannia","Havana",null,null,"carrier_battleship",2],["britannia","Santiago de Cuba",null,null,"portman_ii",3],["britannia","Kingston",null,null,"carrier_battleship",2],["britannia","Montego Bay",null,null,"portman_ii",2],["britannia","Santo Domingo",null,null,"carrier_battleship",2],["britannia","Port-au-Prince",null,null,"portman_ii",2],["britannia","San Juan",null,null,"carrier_battleship",2],["britannia","Ponce",null,null,"portman_ii",2],["britannia","Nassau",null,null,"carrier_battleship",2],["britannia","Freeport",null,null,"portman_ii",2],["britannia","Fort-de-France",null,null,"carrier_battleship",2],["britannia","Pointe-a-Pitre",null,null,"portman_ii",2],["britannia","Port of Spain",null,null,"carrier_battleship",2]];
  const FUNDING={eu:{credits:860,industry:470,science:70,sakuradite:30},
    britannia:{credits:760,industry:470,science:70,sakuradite:30}};
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
  // Escarpment, Drakensberg, Cape Fold Belt, Namib and Kalahari.
  // Interior mountains on Cuba, Hispaniola, Jamaica and Puerto Rico; green
  // lower ridges on the Lesser Antilles. No fictitious mountain barriers at sea.
  const MOUNTAINS=[[-83.7,22.1,1.5,.55],[-76.7,20.45,1.9,.8],
    [-72.9,18.8,1.9,.7],[-70.6,19.0,1.5,.8],[-77.4,18.14,.9,.4],
    [-66.4,18.15,.9,.4],[-61.1,15.1,1.3,1.8]];
  const FORESTS=[[-79,21.5,3.2,1.4],[-75.9,20.4,1.6,.8],
    [-72.4,19.1,2.2,1.2],[-76.9,18.2,1.4,.7],
    [-66.6,18.1,1.6,.7],[-61.6,14.4,1.2,3.3]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p){
    const m=density(p,MOUNTAINS),f=density(p,FORESTS);
    return m>.66?'mountain':(m>.28||f>.48)?'forest':'plains';
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
  function create(player='eu',difficulty='normal',seed=201739){
    if(!SIDES.includes(player))throw Error('Unsupported Invasion of the Caribbean faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'invasion-caribbean',order:[player,...SIDES.filter(s=>s!==player)],
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
    g.scenario={id:'invasion-caribbean',key:'caribbean',title:'Invasion of the Caribbean',
      version:2,phase:'caribbean-island-hopping',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,citylessFunding:['eu']};
    // Only Britannia and Europia United are playable here.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia')),
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu'))
    };
    // Authoritative tactical coast: each cell's clipped polygon land share is
    // <20%=sea, 20–80%=coast, >80%=land. Unlike a center-point mask this
    // preserves the Caribbean archipelago and narrow coastal approaches.
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),fraction=coastCoverageClass(c,r);
      return {c,r,owner:null,terrain:fraction===0?'sea':
        fraction===1?'coast':fraction===3?'offmap':landscape(p)};
    });
    // Mainland coastline is explicitly off-map, not capturable land.
    // Audit connectivity: a ship may use sea and mixed-coast cells only.
    // No artificial inland waterways or shortcuts across Caribbean land.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Caribbean city '+name);
      const capital=name==='Havana';
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
      if(['sea','offmap'].includes(g.tiles[i].terrain)||components[i]>=0)continue;
      const q=[g.tiles[i]];components[i]=id;
      for(let k=0;k<q.length;k++)for(const n of E.adjacent(g,q[k])){
        const j=n.r*COLS+n.c;
        if(['sea','offmap'].includes(n.terrain)||components[j]>=0)continue;
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
    for(const t of g.tiles)if(t.terrain!=='sea'&&t.terrain!=='offmap'){
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
      if(side==='eu')continue; // All E.U. invasion columns embark offshore.
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side)throw Error('Invalid staging city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&!E.unitAt(g,t)&&
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
      const s=side==='britannia'?g.stations.find(v=>v.name===name):null;
      const anchor=s||locate(lon,lat);
      if(!E.TYPES[type]?.naval)throw Error('Invalid Caribbean fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,anchor,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),18);
        if(!at)throw Error('Cannot deploy navy at '+name);
        const ship=E.newUnit(g,type,side,at.c,at.r);
        if(side==='eu')ship.invasionGroup=name;
        fleet.units.push(ship.id);
      }
      g.scenario.groups.push(fleet);
    }
    // Load all 24 E.U. land formations into offshore carriers before turn one.
    const carriers=g.units.filter(u=>u.side==='eu'&&E.TYPES[u.type].naval==='ship');
    const passengers=[];
    for(const [side,name,cls,count,commander] of ARMY_GROUPS){
      if(side!=='eu')continue;
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
    // All real Caribbean sea lanes remain open for inter-island navigation.
    // No scripted Sakuradite site: standard research and refinery balance.
    for(const side of SIDES){
      const factor=side===player||!E.foe(g,side,player)?1:['challenge','elite'].includes(difficulty)?1.6:
        difficulty==='hard'?1.3:1;
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n*factor)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*(side==='eu'?3:2);
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>E.foe(g,v,player)))
        for(const [i,u] of g.units.flatMap(v=>[v,...(v.cargo||[])])
          .filter(v=>v.side===side&&E.TYPES[v.type].naval!=='ship').entries())
          if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.reduce((n,u)=>
      n+(u.side===s?1:0)+(u.cargo||[]).filter(v=>v.side===s).length,0)]));
    E.log(g,'Europia United begins with no cities, deploying six carrier task forces against Britannia throughout the Caribbean.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    const held=g.stations.filter(s=>s.owner==='britannia').length;
    const taken=g.stations.length-held;
    const invaders=g.units.filter(u=>u.side==='eu'&&u.hp>0).length;
    return side==='eu'
      ?'Secure every Caribbean island city and port ('+held+' Britannian cities remain; '+taken+' taken).'
      :'Defend the island chain and destroy the E.U. carrier invasion ('+invaders+' E.U. units at sea or ashore).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='invasion-caribbean'||
       g.stations.length!==CITIES.length)return null;
    if(g.stations.every(s=>s.owner==='eu'))return {winner:'eu',team:'eu',
      reason:'Europia United has conquered every Britannian city in the Caribbean.'};
    // A cityless invader is beaten only after its last afloat or landed unit falls.
    if(!g.stations.some(s=>s.owner==='eu')&&
       !g.units.some(u=>u.side==='eu'&&u.hp>0))
      return {winner:'britannia',team:'britannia',
        reason:'Britannia has repelled the E.U. invasion of the Caribbean.'};
    return null;
  }
  const api={id:'invasion-caribbean',title:'Invasion of the Caribbean',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true},
    elite:true,expeditionSide:'eu',
    text:{
      era:"Caribbean Sea · Alternate 2017",
      intro:"Six E.U. task forces begin offshore with no cities; Britannia holds 41 island cities across the Caribbean.",
      diplomacy:"Capture every hostile city to win. No turn limit and no F.L.E.I.J.A.",
      elite:"Elite Caribbean converts eligible land forces and amphibious troops under the standard regional Elite rules; naval carriers remain conventional.",
      focus:{
        eu:"",
        britannia:"Havana"
      }
    },
    blurbs:{
      eu:"Command six loaded carrier forces, capture island harbours and advance from Cuba and the Bahamas through Hispaniola to the Lesser Antilles.",
      britannia:"Defend the major islands and harbours, concentrate naval patrols and counterattack isolated beachheads."
    }};
  E.scenarios={...(E.scenarios||{}),caribbean:api,
    byId:{...(E.scenarios?.byId||{}),'invasion-caribbean':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

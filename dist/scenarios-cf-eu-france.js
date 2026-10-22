/* Federation vs E.U. — Invasion of France (cf-eu-france).
 * Owned exclusively by the France scenario lane. No manifest, engine or
 * other campaign files are changed here.
 * A two-sided, cityless Mediterranean expedition against metropolitan France.
 */
(function(root){
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  if(!E)throw Error('France requires Knightmare engine');
  const ID='cf-eu-france',KEY='cfEuFrance',SIDES=['cf','eu'];
  const COLS=142,ROWS=104;
  const BOUNDS={west:-5.85,east:9.65,north:51.55,south:40.95};
  const K=Math.cos(46.25*Math.PI/180);
  const PROJECTION={centerLon:1.9,centerLat:46.25,angle:0,
    uMin:-7.75*K,uMax:7.75*K,vMin:-5.3,vMax:5.3};
  // Latitude/longitude coastal trace of metropolitan France; foreign territory
  // is OFFMAP, never converted into an artificial German invasion front.
  // Coordinates are geographical approximations at tactical hex resolution.
  const MAINLAND=[
    [-1.79,43.36],[-1.57,43.5],[-1.55,43.72],[-1.37,44.19],
    [-1.23,44.66],[-1.23,45.04],[-1.13,45.56],[-1.02,45.63],
    [-1.2,46.17],[-1.19,46.33],[-1.74,46.77],[-2.1,47.08],
    [-2.51,47.25],[-3.02,47.44],[-3.32,47.66],[-3.94,47.86],
    [-4.49,48.39],[-4.79,48.38],[-4.47,48.54],[-4.14,48.73],
    [-3.53,48.83],[-3.01,48.66],[-2.69,48.51],[-2.14,48.65],
    [-1.94,48.69],[-1.62,49.64],[-1.35,49.38],[-0.33,49.35],
    [0.12,49.5],[0.65,49.84],[1.52,50.2],[1.59,50.79],
    [1.86,50.95],[2.37,51.05],[2.55,51.09],[2.56,50.75],
    [3.13,50.69],[3.67,50.35],[4.13,50.16],[4.23,49.95],
    [4.83,49.98],[5.47,49.54],[5.82,49.53],[6.36,49.18],
    [6.77,49.16],[7.42,49.17],[8.2,48.97],[8.03,48.77],
    [7.57,48.1],[7.61,47.59],[7.2,47.49],[6.97,47.37],
    [6.92,47.11],[6.15,46.37],[6.11,46.14],[6.77,46.43],
    [7.03,46.11],[7.17,45.69],[7.12,45.41],[7.52,44.13],
    [7.72,43.79],[7.5,43.78],[7.26,43.7],[7.02,43.55],
    [6.73,43.42],[6.45,43.28],[6.0,43.09],[5.93,43.12],
    [5.37,43.29],[5.07,43.29],[4.83,43.41],[4.56,43.36],
    [4.25,43.45],[3.85,43.55],[3.69,43.4],[3.46,43.29],
    [3.14,43.18],[3.03,42.94],[3.16,42.44],
    [2.54,42.34],[1.79,42.44],[1.44,42.6],[0.62,42.72],
    [-0.31,42.83],[-1.15,43.08],[-1.47,43.27],[-1.79,43.36]
  ];
  const CORSICA=[[8.54,43.01],[8.83,42.98],[9.45,42.7],
    [9.48,42.31],[9.36,41.89],[9.22,41.38],[8.8,41.37],
    [8.6,41.6],[8.68,42.08],[8.58,42.47],[8.54,43.01]];
  // Foreign British, Spanish and Italian land at the Channel and coastal edges is
  // impassable background, not open water. Raster built from Natural Earth.
  const FOREIGN_FRANCE_LAND=atob('AAAPj////8AAAAPv///////8AAAIf////4AAABB////////wAAAD//////4AA//////////AAH////////AAf/////////8AAf///////wAH//////////wAP///////8AAf//////////AA////////AAB//////////8AH////wYHAAAD//////////wA//4fh8AAAAAAf/////////AH/4AAAAAAAAAB/////////8A//gAAAAAAAAAA/////////wP9+AAAAAAAAAAB/////////B8AwAAAAAAAAAAAf///////8+AAAAAAAAAAAAAB////////yYAAAAAAAAAAAAAD7///////AAAAAAAAAAAAAAAef//////8AAAAAAAAAAAAAAAA///////wAAAAAAAAAAAAAAAB///////AAAAAAAAAAAAAAAAA//////8AAAAAAAAAAAAAAAAB//////wAAAAQAAAAAAAAAAAAI/////AAAAAAAAAAAAAAAAAAB////8AAAAAQAAAAAAAAAAAAD////wAAAAAAAAAAAAAAAAAAB////AAAAAAAAAAAAAAAAAAAAD//8AAAAAAAAAAAAAAAAAAAAA//wAAAAAAAAAAAAAAAAAAAAD//AAAAAAAAAAAAAAAAAAAAA//8AAAAAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAAAAA///AAAAAAAAAAAAAAAAAAAAB//8AAAAAAAAAAAAAAAAAAAAP//wAAAAAAAAAAAAAAAAAAAA///AAAAAAAAAAAAAAAAAAAAH//8AAAAAAAAAAAAAAAAAAAAf//wAAAAAAAAAAAAAAAAAAAB///AAAAAAAAAAAAAAAAAAAAH//8AAAAAAAAAAAAAAAAAAAA///wAAAAAAAAAAAAAAAAAAAB///AAAAAAAAAAAAAAAAAAAAP//8AAAAAAAAAAAAAAAAAAAf///wAAAAAAAAAAAAAAAAAAB////AAAAAAAAAAAAAAAAAAAH///8AAAAAAAAAAAAAAAAAAB////wAAAAAAAAAAAAAAAAAAP////AAAAAAAAAAAAAAAAAAD////8AAAAAAAAAAAAAAAAAAP////wAAAAAAAAAAAAAAAAAB/////AAAAAAAAAAAAAAAAAAP////8AAAAAAAAAAAAAAAAAB/////wAAAAAAAAAAAAAAAAAHD////AAAAAAAAAAAAAAAAAAQf///8AAAAAAAAAAAAAAAAADA////wAAAAAAAAAAAAAAAAAAD////AAAAAAAAAAAAAAAAAAAH///8AAAAAAAAAAAAAAAAAAAf///wAAAAAAAAAAAAAAAAAAD////AAAAAAAAAAAAAAAAAAAP///8AAAAAAAAAAAAAAAAAAAf///wAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAB///8AAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAB////AAAAAAAAAAAAAAAAAAA////8AAAAAAAAAAAAAAAAAAB////wAAAAAAAAAAAAAAAAAAD////AAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAf///wAAAAAAAAAAAAAAAAAAB////AAAAAAAAAAAAAAAAAAAP///8AAAAAAAAAAAAAAAAAAAf/8HwAAAAAAAAAAAAAAAAAAB//AHAAAAAAAAAAAAAAAAAAAA78AAAAAAAAAAAAAAAAAAAAAAfAAAAAAAAAAAAAAAAAAAAAAB8AAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA+AAAAAAAAAAAAAAAAAAAAAAD/wfwgAAAAAAAAAAAAAAAAAAP////8YAAAAAAAAAAAAAAAAA//////8AAAAAAAAAAAAAAAAD//////4AAAAAAAAAAAAAAAAP//////QAAAAAAAAAAAAAAAA///////+AAAAAAAAAAAAAAAD///////4AEAAAAAAAAAAAAAP////////APAAAAAAAAAAAAA///////////QAAAAAAAAAAAD///////////gAAAAAAAAAAAP///////////gHgAAAAAAAAA//////////////AAAAAAAAAD/////////////wAAAAAAAAAP/////////////gAAAAAAAAA/////////////+AAAAAAAAAD/////////////4AAAAAAAAAP////////////+AAAAAAAAAA/////////////wAAAAAAAAAD////////////4AAAAAAAAAAP////////////AAAAAAAAAAA////////////wAAAAAAAAAAD///////////+AAAAAAAAAAAP//////////8AAAAAAAAAAAQ//////////+AAAAAAAAAAED7//////////AAAAAAAAAAAg/g==');
  const foreignFranceAt=(c,r)=>{
    const index=r*COLS+c;
    return !!(FOREIGN_FRANCE_LAND.charCodeAt(index>>3)&(128>>(index&7)));
  };
  const CITIES=[
    ['Paris',2.35,48.86,3,true],['Lille',3.06,50.63,3,true],
    ['Dunkirk',2.38,51.05,2,true],['Calais',1.86,50.95,2,true],
    ['Amiens',2.30,49.90,2,false],['Reims',4.03,49.26,2,true],
    ['Metz',6.18,49.12,2,true],['Nancy',6.18,48.69,2,false],
    ['Strasbourg',7.75,48.58,3,true],['Dijon',5.04,47.32,2,true],
    ['Besançon',6.02,47.24,2,false],['Orléans',1.90,47.90,2,false],
    ['Tours',0.69,47.39,2,false],['Le Havre',0.11,49.49,2,true],
    ['Cherbourg',-1.62,49.64,2,true],['Brest',-4.49,48.39,3,true],
    ['Rennes',-1.68,48.11,2,false],['Nantes',-1.55,47.22,2,false],
    ['La Rochelle',-1.15,46.16,2,true],['Bordeaux',-0.58,44.84,3,true],
    ['Limoges',1.26,45.83,2,false],['Clermont-Ferrand',3.08,45.78,2,false],
    ['Lyon',4.83,45.76,3,true],['Grenoble',5.72,45.19,2,true],
    ['Valence',4.89,44.93,2,false],['Avignon',4.81,43.95,2,true],
    ['Montpellier',3.88,43.61,2,false],['Marseille',5.37,43.30,3,true],
    ['Toulon',5.93,43.13,3,true],['Nice',7.26,43.70,2,true],
    ['Toulouse',1.44,43.60,3,true],['Perpignan',2.90,42.70,2,false],
    ['Ajaccio',8.74,41.93,2,true],['Bastia',9.45,42.70,2,true]
  ].map(([name,lon,lat,tier,fort])=>[name,lon,lat,'eu',tier,fort]);
  const PORTS={'Marseille':3,'Toulon':3,'Nice':2,'Ajaccio':2,'Bastia':2,
    'La Rochelle':2,'Brest':3,'Cherbourg':2,'Le Havre':2,
    'Calais':2,'Dunkirk':2};
  // [faction, home city, operational group, class, formations, commander].
  // Paris and the Rhone line are defended in depth; beachheads are contestable.
  const DEFENSE=[
    ['eu','Marseille','Provence Coastal Command','medium',2,'akito'],
    ['eu','Marseille','Provence Coastal Command','support',1,'yukiya'],
    ['eu','Toulon','Toulon Naval Guard','heavy',2,'ayano'],
    ['eu','Nice','Riviera Guard','medium',1,'ryo'],
    ['eu','Ajaccio','Corsican Defense','medium',1,null],
    ['eu','Bastia','Corsican Defense','assault',1,null],
    ['eu','Avignon','Rhone Defensive Line','heavy',3,'pierre'],
    ['eu','Valence','Rhone Defensive Line','rocket',2,null],
    ['eu','Lyon','Rhone Defensive Line','heavy',3,'leila'],
    ['eu','Lyon','Rhone Defensive Line','rocket',2,'margaret'],
    ['eu','Grenoble','Alpine Reserve','medium',2,'olivia'],
    ['eu','Montpellier','Southern Reserves','medium',1,null],
    ['eu','Toulouse','Southwest Defense','medium',2,'eduardo'],
    ['eu','Bordeaux','Southwest Defense','rocket',1,null],
    ['eu','Dijon','Burgundy Defense','heavy',2,'fernando'],
    ['eu','Besançon','Burgundy Defense','rocket',1,null],
    ['eu','Strasbourg','Alsace Security Command','medium',2,'anna'],
    ['eu','Metz','Lorraine Guard','heavy',2,'smilas'],
    ['eu','Paris','Paris Capital Guard','heavy',4,'klaus'],
    ['eu','Paris','Paris Capital Guard','rocket',3,'marirrosa'],
    ['eu','Paris','Paris Capital Guard','siege',1,null],
    ['eu','Reims','Northern Counterattack Army','heavy',2,'oscar'],
    ['eu','Orléans','Loire Mobile Reserve','medium',2,null],
    ['eu','Lille','Northern Army','heavy',2,null],
    ['eu','Amiens','Northern Army','rocket',1,null],
    ['eu','Brest','Atlantic Guard','medium',1,null],
    ['eu','Le Havre','Channel Defense','assault',1,null]
  ];
  // All Federation KMF land formations are embarked on a carrier from turn 1.
  // [flotilla, target shore, offshore lon/lat, first-wave troops].
  const INVASIONS=[
    {name:'Marseille Assault Fleet',target:'Marseille',at:[5.0,42.35],troops:[
      ['heavy','honggu'],['assault','meiling'],['heavy','cao'],['rocket','gaohai'],
      ['medium',null],['heavy',null],['assault',null],['support',null],
      ['heavy',null],['rocket',null],['medium',null],['assault',null]]},
    {name:'Toulon Landing Fleet',target:'Toulon',at:[6.0,42.3],troops:[
      ['heavy','zhaohao'],['assault','lifeng'],['heavy','xingke'],['rocket','leifeng'],
      ['medium',null],['assault',null],['rocket',null],['heavy',null],
      ['medium',null],['support',null],['heavy',null],['assault',null]]},
    {name:'Riviera Landing Fleet',target:'Nice',at:[7.0,42.5],troops:[
      ['heavy',null],['assault','xianglin'],['rocket',null],['medium',null],
      ['heavy',null],['assault',null],['rocket',null],['medium',null]]},
    {name:'Corsica Landing Fleet',target:'Ajaccio',at:[8.0,41.5],troops:[
      ['heavy',null],['assault',null],['medium',null],['rocket',null]]}
  ];
  const DEFENSIVE_FLEETS=[
    ['eu','Marseille','eu_carrier',1],['eu','Toulon','eu_carrier',1],
    ['eu','Toulon','panzer_frosch_ii',2],['eu','Nice','panzer_frosch_ii',2],
    ['eu','Ajaccio','eu_carrier',1],['eu','Bastia','panzer_frosch_ii',1],
    ['eu','Brest','eu_carrier',1],['eu','Le Havre','panzer_frosch_ii',1]
  ];
  const RIVERS={
    Rhone:[[4.85,46.1],[4.84,45.76],[4.91,45.35],[4.88,44.94],
      [4.74,44.48],[4.82,44.12],[4.65,43.71],[4.61,43.42]],
    Seine:[[2.95,48.43],[2.35,48.86],[1.85,49.02],[1.10,49.44],[0.12,49.5]],
    Loire:[[4.3,45.9],[3.1,46.2],[2.3,47.1],[1.91,47.9],
      [0.68,47.39],[-0.55,47.47],[-1.55,47.22]],
    Garonne:[[1.44,43.60],[1.00,43.98],[0.50,44.12],[0.14,44.30],[-0.58,44.84]],
  };
  const BRIDGES=['Lyon','Valence','Avignon','Paris','Tours','Orléans','Nantes','Toulouse','Bordeaux'];
  const FUNDING={cf:{credits:880,industry:500,science:100,sakuradite:45},
    eu:{credits:820,industry:530,science:100,sakuradite:46}};
  const SEA=n=>n.terrain==='sea';
  function geo(c,r){return {lon:BOUNDS.west+(c+.5+.5*(r&1))*(BOUNDS.east-BOUNDS.west)/COLS,
    lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/
      (BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function contains(p,poly){
    let inside=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];
      if((a[1]>p.lat)!==(b[1]>p.lat) &&
        p.lon<(b[0]-a[0])*(p.lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  // Shores are explicitly sea, foreign mainland explicitly out-of-play.
  // Do not classify neutral German/Swiss/Italian land as naval water.
  function openWater(p){
    if(p.lon<-3.9&&p.lat>47)return true;                    // Brittany/Atlantic
    if(p.lon<-1.4&&p.lat>43.2&&p.lat<49.8)return true;    // Bay of Biscay
    if(p.lon<-0.95&&p.lat>44.0&&p.lat<47.7)return true;   // Atlantic shelf
    if(p.lat>49.42&&p.lon<2.65)return true;                // Channel
    if(p.lon>2.6&&p.lon<7.63&&p.lat<43.65)return true;    // Mediterranean
    if(p.lon>5.1&&p.lon<7.62&&p.lat<43.87)return true;    // Riviera
    if(p.lon>7.55&&p.lat<43.2)return true;                 // Corsican basin
    return false;
  }
  function lineDistance(p,path){
    let best=Infinity;
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],dx=(b[0]-a[0])*.7,dy=b[1]-a[1],
        x=(p.lon-a[0])*.7,y=p.lat-a[1],k=Math.max(0,Math.min(1,
          (x*dx+y*dy)/(dx*dx+dy*dy||1)));
      best=Math.min(best,Math.hypot(x-k*dx,y-k*dy));
    }
    return best;
  }
  function terrain(p,c,r){
    const alps=Math.hypot((p.lon-6.6)*.7,p.lat-45.25);
    const pyrenees=Math.abs(p.lat-(42.6+.07*p.lon));
    if((p.lon>5.45&&p.lat<46.35&&alps<1.65)||
        (p.lat<43.18&&p.lon<2.8&&pyrenees<.43))
      return 'mountain';
    if(p.lon>2.1&&p.lon<4.7&&p.lat>44.1&&p.lat<46.6&&
       ((c*17+r*7)%19)<11)return 'mountain'; // Massif Central
    if((p.lat>47&&p.lon>2.4&&p.lon<5.8)||
       (p.lon<-1.2&&p.lat>44.2&&p.lat<48.4))return ((c*17+r*23)%11)<5?'forest':'plains';
    return 'plains';
  }
  function nearest(g,p,valid,radius=13){
    let best=null,d=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(ROWS-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(COLS-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!valid(t))continue;
        const n=E.distance(p,t,g);
        if(n<d){best=t;d=n;}
      }
    return best;
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army Group not found','No reachable unit');}
  function create(player='cf',difficulty='normal',seed=201713){
    if(!SIDES.includes(player))throw Error('Unsupported French invasion side: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{cf:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},lineup:{}};
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:ID,key:KEY,title:'Invasion of France',version:1,
      phase:'mediterranean-landing',aiDoctrine:'invasion',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,citylessFunding:['cf'],
      rivers:RIVERS,riverCrossings:BRIDGES,
      offensiveAxes:{cf:{
        'Marseille Assault Fleet':['Marseille','Avignon','Valence','Lyon','Dijon','Paris'],
        'Toulon Landing Fleet':['Toulon','Marseille','Avignon','Lyon','Orléans','Paris'],
        'Riviera Landing Fleet':['Nice','Grenoble','Lyon','Dijon','Reims','Paris'],
        'Corsica Landing Fleet':['Ajaccio','Bastia']}},
      operationalFronts:[
        {name:'Provence beachheads',attack:'cf',bases:['Marseille','Toulon'],
         route:['Avignon','Valence','Lyon','Dijon','Paris']},
        {name:'Alpine flank',attack:'cf',bases:['Nice'],
         route:['Grenoble','Lyon','Besançon','Reims','Paris']},
        {name:'Atlantic sweep',attack:'cf',bases:['Toulouse','Bordeaux'],
         route:['La Rochelle','Nantes','Brest','Cherbourg','Le Havre']}]};
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),
        land=contains(p,MAINLAND)||contains(p,CORSICA),
        kind=land?terrain(p,c,r):foreignFranceAt(c,r)?'offmap':openWater(p)?'sea':'offmap';
      return {c,r,owner:null,terrain:kind};
    });
    // The coast is represented by walkable coastal land next to actual water.
    // Keep the land tile for disembarkation, with no invented offshore bridge.
    for(const t of g.tiles)if(t.terrain!=='sea'&&t.terrain!=='offmap'&&
       E.adjacent(g,t).some(SEA))t.terrain='coast';
    // Every city is French and E.U. held; not even a hidden Chinese bridgehead.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const port=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        t.terrain!=='offmap'&&!E.TERRAIN[t.terrain]?.blocked&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r)&&
        (!port||E.adjacent(g,t).some(SEA)),port?11:7);
      if(!at)throw Error('No legal French city or harbour hex: '+name);
      const capital=name==='Paris',shield=E.scenarioCityDefenseHP(tier,fort,name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort,
        gun:fort?name+' E.U. Defense Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:capital?55:tier===3?33:20,
        industry:capital?35:tier===3?23:13,
        science:capital?6:tier===3?4:2,producedTurn:0});
      if(at.terrain!=='coast')at.terrain='plains';
    }
    // Connected island provinces must not inherit mainland ownership through sea.
    const components=new Int16Array(g.tiles.length).fill(-1);
    let mass=0;
    for(let i=0;i<g.tiles.length;i++){
      const t=g.tiles[i];
      if(t.terrain==='sea'||t.terrain==='offmap'||components[i]>=0)continue;
      const q=[t];components[i]=mass;
      for(let j=0;j<q.length;j++)for(const n of E.adjacent(g,q[j])){
        const k=n.r*COLS+n.c;
        if(n.terrain==='sea'||n.terrain==='offmap'||components[k]>=0)continue;
        components[k]=mass;q.push(n);
      }
      mass++;
    }
    const byMass=new Map();
    for(const s of g.stations){
      const id=components[s.r*COLS+s.c];
      if(id<0)throw Error('City was placed off mainland and islands: '+s.name);
      if(!byMass.has(id))byMass.set(id,[]);
      byMass.get(id).push(s);
    }
    for(const t of g.tiles)if(t.terrain!=='sea'&&t.terrain!=='offmap'){
      const local=byMass.get(components[t.r*COLS+t.c]);
      if(!local)continue;
      let city=null,d=Infinity;
      for(const s of local){const n=E.distance(t,s,g);if(n<d){d=n;city=s;}}
      t.owner=city.owner;t.provinceCity=city.id;
    }
    // Cross the Rhone, Seine, Loire and Garonne at genuine river edges.
    // Bridges near named cities bypass the movement penalty, never seal routes.
    const riverSegments=Object.values(RIVERS).flatMap(line=>
      line.slice(1).map((v,i)=>[line[i],v]));
    function orientation(a,b,p){
      return (b.lon-a.lon)*(p.lat-a.lat)-(b.lat-a.lat)*(p.lon-a.lon);
    }
    function crosses(a,b,p,q){
      const l={lon:p[0],lat:p[1]},r={lon:q[0],lat:q[1]},
        x=orientation(a,b,l),y=orientation(a,b,r),
        u=orientation(l,r,a),v=orientation(l,r,b);
      return ((x>0&&y<0)||(x<0&&y>0))&&
             ((u>0&&v<0)||(u<0&&v>0));
    }
    const bridges=g.stations.filter(s=>BRIDGES.includes(s.name)),edges={};
    for(const t of g.tiles){
      if(t.terrain==='sea'||t.terrain==='offmap')continue;
      const a=geo(t.c,t.r),from=t.r*COLS+t.c;
      for(const n of E.adjacent(g,t)){
        const to=n.r*COLS+n.c;
        if(to<=from||n.terrain==='sea'||n.terrain==='offmap')continue;
        if(bridges.some(s=>E.distance(s,t,g)<=1&&E.distance(s,n,g)<=1))
          continue;
        const b=geo(n.c,n.r);
        if(riverSegments.some(([p,q])=>crosses(a,b,p,q)))
          edges[from+':'+to]=true;
      }
    }
    g.scenario.riverBarriers=edges;
    // Real port ownership is separate from adjacent city ownership.
    const reserved=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const port=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&
        !reserved.has(E.key(t))).sort((a,b)=>
          E.adjacent(g,b).filter(SEA).length-E.adjacent(g,a).filter(SEA).length)[0];
      if(!port)throw Error('Port not navigable independently: '+name);
      s.portAt={c:port.c,r:port.r};s.portLevel=level;s.portOwner='eu';
      reserved.add(E.key(port));
    }
    function group(side,name,origin,kind='army'){
      let gr=g.scenario.groups.find(v=>v.side===side&&v.name===name);
      if(!gr){
        gr={id:kind+'-'+g.scenario.groups.length,side,name,origin,units:[]};
        g.scenario.groups.push(gr);
      }
      return gr;
    }
    // Defenders are distributed across French cities, including reserves
    // which the AI can produce/redeploy once beachheads are established.
    for(const [side,origin,name,cls,count,commander] of DEFENSE){
      const city=g.stations.find(s=>s.name===origin);
      for(let i=0;i<count;i++){
        const at=nearest(g,city,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
          !E.TERRAIN[t.terrain]?.blocked&&!E.unitAt(g,t)&&t.owner===side&&
          (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),13);
        if(!at)throw Error('No defender deployment at '+origin);
        const cmd=i===0?commander:null,
          u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?2:1,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        group(side,name,origin).units.push(u.id);
      }
    }
    for(const [side,name,type,count] of DEFENSIVE_FLEETS){
      const city=g.stations.find(s=>s.name===name);
      if(!E.TYPES[type]?.naval)throw Error('Unknown French fleet: '+type);
      for(let i=0;i<count;i++){
        const at=nearest(g,city,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !reserved.has(E.key(t)),13);
        if(!at)throw Error('French fleet lacks sea access at '+name);
        const u=E.newUnit(g,type,side,at.c,at.r);
        group(side,name+' Defense Fleet',name,'fleet').units.push(u.id);
      }
    }
    // Navy transports 2 KMF formations per carrier. Assemble all land units
    // BEFORE standard Elite conversion, then embark preserving commander/HP.
    const passengers=[];
    for(const invasion of INVASIONS){
      const army=group('cf',invasion.name,invasion.target);
      const fleet=group('cf',invasion.name+' Naval Escort',invasion.target,'fleet');
      if(invasion.troops.length%2)throw Error('Uneven transport load');
      for(let i=0;i<invasion.troops.length;i+=2){
        const anchor=locate(...invasion.at);
        const at=nearest(g,anchor,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !reserved.has(E.key(t)),15);
        if(!at)throw Error('No navigable Mediterranean launch hex: '+invasion.name);
        const ship=E.newUnit(g,'cf_carrier','cf',at.c,at.r);
        ship.invasionGroup=invasion.name;
        fleet.units.push(ship.id);
        for(const [cls,cmd] of invasion.troops.slice(i,i+2)){
          const commander=cmd&&g.officers[cmd]?cmd:null;
          const u=E.newUnit(g,E.typeFor('cf',cls,g),'cf',at.c,at.r,2,commander);
          if(commander){u.cmdRank=g.officers[commander].rank;u.hp=E.maxHP(u);}
          passengers.push({ship,u});army.units.push(u.id);
        }
      }
    }
    // Amphibious escorts support landings but cannot bypass the carrier cargo.
    for(const invasion of INVASIONS){
      const escort=group('cf',invasion.name+' Naval Escort',invasion.target,'fleet');
      for(let i=0;i<Math.max(2,Math.ceil(invasion.troops.length/4));i++){
        const at=nearest(g,locate(...invasion.at),t=>t.terrain==='sea'&&
          !E.unitAt(g,t)&&!reserved.has(E.key(t)),18);
        if(!at)throw Error('No sea tiles for escort '+invasion.name);
        escort.units.push(E.newUnit(g,'shui_gun_ru_ii','cf',at.c,at.r).id);
      }
    }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const {ship,u} of passengers){
      (ship.cargo||=[]).push(u);
      g.units.splice(g.units.indexOf(u),1);
    }
    // Separate navigable Mediterranean and Atlantic basins; foreign dry land
    // stays offmap rather than magically becoming another naval passage.
    const oceanStart=nearest(g,locate(6.0,41.2),SEA,9);
    if(!oceanStart)throw Error('Mediterranean staging water is absent');
    const ocean=new Set([E.key(oceanStart)]),q=[oceanStart];
    for(let i=0;i<q.length;i++)for(const n of E.adjacent(g,q[i])){
      if(n.terrain!=='sea'||ocean.has(E.key(n)))continue;
      ocean.add(E.key(n));q.push(n);
    }
    for(const invasion of INVASIONS){
      const ships=g.units.filter(u=>u.side==='cf'&&u.invasionGroup===invasion.name);
      if(!ships.length||ships.some(u=>!ocean.has(E.key(u))))
        throw Error('Invasion ships disconnected from Mediterranean: '+invasion.name);
    }
    // Standard scenario funding supports a fleet without initial cities.
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([key,value])=>
          [key,Math.max(0,Math.round(value)-base[key])]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*(side==='cf'?3:2);
    }
    if(difficulty==='hard'||difficulty==='challenge')
      for(const side of SIDES.filter(s=>s!==player))
        for(const u of g.units.flatMap(x=>[x,...(x.cargo||[])])
          .filter(u=>u.side===side&&E.TYPES[u.type].naval!=='ship'))
          E.addDifficultyFrames(u,difficulty);
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(side=>[side,
      g.units.reduce((n,u)=>n+(u.side===side?1:0)+
        (u.cargo||[]).filter(x=>x.side===side).length,0)]));
    if(g.stations.some(s=>s.owner==='cf')||
       g.units.some(u=>u.side==='cf'&&!E.TYPES[u.type].naval))
      throw Error('Federation has illegal initial French bridgehead');
    E.log(g,'Federation carrier groups approach Marseille and Toulon from North Africa. Take Provence, break the Rhone line and capture Paris. The E.U. holds every French city.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    const remaining=g.stations.filter(s=>s.owner==='eu').length;
    const expedition=E.allUnits(g).filter(u=>u.side==='cf'&&u.hp>0).length;
    return side==='cf'
      ?'Land at Marseille/Toulon, advance through Lyon and capture or destroy all opposing French cities ('+
        remaining+' E.U. cities remain). No turn limit.'
      :'Defend France; recapture any beachheads and eliminate the Federation expedition ('+
        expedition+' invaders active).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||
      g.stations.length+(g.ruins||[]).length!==CITIES.length)return null;
    if(g.stations.every(s=>s.owner==='cf'))return {
      winner:'cf',team:'cf',reason:'Chinese Federation has eliminated every E.U.-held city in France.'};
    if(!g.stations.some(s=>s.owner==='cf')&&
       !E.allUnits(g).some(u=>u.side==='cf'&&u.hp>0))return {
      winner:'eu',team:'eu',reason:'The E.U. retained France and destroyed the entire Federation expedition.'};
    return null;
  }
  const api={id:ID,title:'Invasion of France',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,projection:PROJECTION,cityData:CITIES,
    armyGroups:DEFENSE,invasionData:INVASIONS,fleetData:DEFENSIVE_FLEETS,
    ports:PORTS,rivers:RIVERS,create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={elite:true,eliteRosterOnly:true,expeditionSide:'cf',
    saveVersion:1,groupsStartEmbarked:true,
    ai:{doctrine:'invasion',recovery:true,synchronizedFlotillas:true,
      operationalAxes:{invader:'cf',defender:'eu',axes:{
        'Marseille Assault Fleet':['Marseille','Avignon','Valence','Lyon','Dijon','Paris'],
        'Toulon Landing Fleet':['Toulon','Avignon','Lyon','Orléans','Paris'],
        'Riviera Landing Fleet':['Nice','Grenoble','Lyon','Reims','Paris'],
        'Corsica Landing Fleet':['Ajaccio','Bastia']
      },defenderHubs:['Marseille','Toulon','Lyon','Dijon','Orléans','Paris']}},
    map:{centreSampled:true,europeanRegion:true,coastBuffer:0,
      homeZoom:5.4,overviewMarkers:true,overlays:['regionalRivers']},
    text:{era:'France · Federation final campaign · 2017 a.t.b.',
      terrain:'The Alps, Pyrenees and Massif Central shape overland access; only Mediterranean carriers provide the initial Chinese landing.',
      intro:'Chinese Federation carrier groups arrive from North African bases and land at Marseille and Toulon; no French city is initially Chinese. Drive through Lyon toward Paris and complete the conquest.',
      diplomacy:'France alone is in the theatre; Germany and Italy are outside the battlefield. Cityless expedition survival continues while the fleet and embarked troops live.',
      elite:'Elite France uses existing Chinese Federation and E.U. Elite Force rosters, faction commander limits and HQ research.',
      focus:{cf:'',eu:'Paris'}},
    blurbs:{cf:'Launch your North African carrier expedition, seize Provence and march north to capture all of France.',
      eu:'Hold Marseille and Toulon, counterattack the Rhone line and defend Paris until the Chinese expedition is destroyed.'}};
  E.scenarios={...(E.scenarios||{}),cfEuFrance:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

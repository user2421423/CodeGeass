/* Invasion of the American East Coast — six EU amphibious fronts.
   GSHHG intermediate 1.25' land-sea mask sampled at thirteen sites per
   hex: sea below 20%, mixed coastline 20–80%, land above 80%. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=160,ROWS=176,SIDES=['eu','britannia'];
  const BOUNDS={west:-85.6,east:-65.4,north:47.2,south:24.0};
  const K=Math.cos(36*Math.PI/180);
  const PROJECTION={centerLon:-75.5,centerLat:36,angle:0,uMin:-10.1*K,uMax:10.1*K,vMin:-12.0,vMax:11.2};
  const COVERAGE_RLE='BUCYQIlAg0CBQJJBq0ABQKYFQJdAikCDQ79CqAdBoECHQZVCjECUQatBgEACQZtBo0KNQL+GQAJAv7+bQ4BAv7+eQABCm0IAQb+4QYBAAUiQRb+vQABBgkCDQw1BrUCvQZlAgwNAgEADSgBCAEEDRKZAsUCXQYQEQQxDgkQGv5VAoQJAg0EOQIFCB0C/lEGDQIdBkQOGQQ9ACUC/lECgAUKHQRhAgEC/skEAQI5ADEIIQL+tQIBBAo9ADECAQAhAu0CnQoBDB0CODkCAQAhAgkCvQYVAp0AMQI9ADoFACECbQJQAQJFAm0ELQJEPgECAAEADQIBAmkGUQACtQIBAAEAHQJJADkCEQAJAg0CFQI9AlUAAQKtCAUAGQJUOiEGDQABAgkOSQJFBoUCBQIBAgUELQZNBDECOQpZCk0ChAECAQgBADUCVDkCZQYhDAECUQKBAAkAAQBCUQANACJ9AgECCA0GUQKEWk0ADQIJABkCXRQFCgUAEQJRAmkGAQABAFkCRQAJAhEAGk0IMQAVAlECVQIJDGkCSQABBhUAFQJFAF0CTQI9Ah0AfQABAmUAFkBhBpUCGQCJDlwVAjkAIQAxBr0AmlkAEQI5AA0KIRrBAKJdAApRAmUGnQCiXQZhAv4Aqr0KAQL8qqEEIQI1AgECtQCqVQYdJCECPQIBArUEolAFAhUAKQAVAkUCuQCqTQQFAg0AQQLdBiEArkUCGQQ9Bv4RBKpJAhEAPQb+JKZBAAUEAQA5Bv4tAA0AkkEAQQr+QA0Ajj0ENQb+NQYJAgEMkkkIIQL+PAECAQAFBJ5NAgES/k0AAQAJBKL+oRQVBAkEjv6BBPL+eQAZFMr+cR4BDNb+cQIVCOL+ZQIBAgEI+v5lAPwS/mj8Ev5s/A7+aPwS/mj8Ev5k/Bb+ZQD8Ev41AiT8Gv4oAQIFAh0A/Br+HQoNBhEE/B7+GQQCFQABBgUA/CL+GQAGFQAKAQD8Jv4dChUABQD8Kv4ZAAECGQD8Nv4ZAAEGHPwy/gECEQABBhkA/DL+AQIBAg0GIPwy/gkKBAUKEQD8Mv4NEAkCDQD8Nv4ZAA0CCQD8Ov4hAA0CAQD8Ov4VAgQNBPxC/hkIBQIBAPxC/hECBQAFAgEA/Eb+FQIBBAUA/Er+DQIBBAkA/E61BlUGAQD8Vv4ZCPxW/iz8TtUCTQD8TgEGzQoBBjkA/ErdAkUE/Er+LQT8Rv4dFPxG/hUIDQD8Rv4VAgECBQIA/Er+KQIEAQD8Pv4xAPxG/hkCDPxO/g0Y/FL+GQAZAPw+/hUA/GL+DRT8Vv4dAPxa/gkQ/F5RAqkA/HZNBqEE/HotAr0A/IYtAr0A/IZ9BmUA/IpZBn0GAPyOYQJpBPyiZQJhAPyqyQD8rqEGHPyyqAIRBPyyxQD8srkE/Lq1APzCrQD8yqkE/MqZCPzWlQIA/N6VAPzikQD85o0A/OqJAPzuhQD88oUA/PKBAPz2gQD89n0A/Pp9APz6fQD8+hEGYQD8+n0A/PqA/Pp5BPz6gQD89iEKRQIE/PkCHQAJBj0CAQD8+QINAB49AgEA/P0IKQJBAPz8MQJBAPz8OQI9APz8NQIpBgkA/Pw9BiECDQD8/D0CNQD8/EECNQD8/D0CNQD8/EIdAhUE/Pw1AjUCAQD8/Do5BPz8Nj0A/Pw6QQD8/DEGJQIRAPz8NQohAhEA/PwxAAECOQD8/DpBAPz8LQJE/Pw6IQYZAPz8LQIxAgz8/DUCKQAGDPz8NQoYCQIM/Pw5AAIdAAYNAE0A/OYlAhEAJRQNAPzlAjwlCB0I/N0CNFoA/OUCMQBVBPzhAjBVAPztAi0AUQT86QYlAFUA/PkCHQD8/FUCGQD8/F0CFQBtAPzpBhEA/PxhBgUI/PxhAA0AQQQNACEA/Pw+AQAJBB0A/Pw6BQAtAPz8OQIJAC0A/PwxAg0APQD8/CUGBQD8/G0ESQD8/DIFAD0A/PwpAgRdAPwc=';
  function coverage(){
    const raw=typeof atob==='function'?atob(COVERAGE_RLE):Buffer.from(COVERAGE_RLE,'base64').toString('latin1');
    const out=new Uint8Array(COLS*ROWS);let k=0;
    for(let i=0;i<raw.length;i++){
      const v=raw.charCodeAt(i),cls=v>>6,n=(v&63)+1;
      if(cls>2||k+n>out.length)throw Error('East Coast shoreline data is corrupt');
      out.fill(cls,k,k+n);k+=n;
    }
    if(k!==out.length)throw Error('East Coast shoreline grid is incomplete');
    return out;
  }
  const CITIES=[["Portland",-70.256,43.659,"britannia",3,true],["Bangor",-68.77,44.8,"britannia",2,false],["Augusta",-69.78,44.31,"britannia",2,false],["Portsmouth",-70.76,43.07,"britannia",2,true],["Manchester",-71.46,42.99,"britannia",2,false],["Boston",-71.058,42.36,"britannia",3,true],["Worcester",-71.8,42.26,"britannia",2,false],["Providence",-71.41,41.82,"britannia",3,true],["Newport",-71.31,41.49,"britannia",2,true],["New London",-72.1,41.35,"britannia",2,true],["Hartford",-72.68,41.76,"britannia",2,false],["New Haven",-72.93,41.31,"britannia",2,true],["Bridgeport",-73.19,41.18,"britannia",2,true],["Albany",-73.76,42.65,"britannia",2,false],["Poughkeepsie",-73.93,41.7,"britannia",2,false],["New York City",-74.006,40.713,"britannia",3,true],["Newark",-74.17,40.74,"britannia",3,true],["Trenton",-74.76,40.22,"britannia",2,false],["Philadelphia",-75.165,39.952,"britannia",3,true],["Allentown",-75.47,40.6,"britannia",2,false],["Scranton",-75.66,41.41,"britannia",2,false],["Harrisburg",-76.88,40.27,"britannia",2,false],["Wilmington",-75.55,39.74,"britannia",2,true],["Dover",-75.52,39.16,"britannia",2,false],["Baltimore",-76.612,39.29,"britannia",3,true],["Annapolis",-76.49,38.97,"britannia",2,true],["Washington D.C.",-77.037,38.907,"britannia",3,true],["Frederick",-77.41,39.41,"britannia",2,false],["Richmond",-77.44,37.54,"britannia",3,true],["Norfolk",-76.29,36.85,"britannia",3,true],["Newport News",-76.43,37.09,"britannia",3,true],["Virginia Beach",-76.05,36.85,"britannia",2,true],["Roanoke",-79.94,37.27,"britannia",2,false],["Charlottesville",-78.48,38.03,"britannia",2,false],["Raleigh",-78.64,35.78,"britannia",3,true],["Durham",-78.9,36,"britannia",2,false],["Greensboro",-79.79,36.07,"britannia",2,false],["Fayetteville",-78.88,35.05,"britannia",2,false],["Wilmington NC",-77.95,34.23,"britannia",3,true],["Charlotte",-80.84,35.23,"britannia",3,true],["Columbia",-81.03,34,"britannia",3,true],["Charleston",-79.93,32.78,"britannia",3,true],["Myrtle Beach",-78.89,33.69,"britannia",2,true],["Greenville",-82.4,34.85,"britannia",2,false],["Savannah",-81.1,32.08,"britannia",3,true],["Augusta GA",-81.98,33.47,"britannia",2,false],["Macon",-83.63,32.84,"britannia",2,false],["Brunswick",-81.49,31.15,"britannia",2,true],["Jacksonville",-81.655,30.332,"britannia",3,true],["St. Augustine",-81.31,29.9,"britannia",2,true],["Daytona Beach",-81.02,29.21,"britannia",2,true],["Orlando",-81.38,28.54,"britannia",3,true],["Cape Canaveral",-80.61,28.39,"britannia",2,true],["Tampa",-82.46,27.95,"britannia",3,true],["St. Petersburg",-82.64,27.77,"britannia",2,true],["Gainesville",-82.32,29.65,"britannia",2,false],["Tallahassee",-84.28,30.44,"britannia",2,false],["West Palm Beach",-80.05,26.72,"britannia",2,true],["Fort Lauderdale",-80.14,26.12,"britannia",2,true],["Miami",-80.19,25.76,"britannia",3,true],["Fort Myers",-81.87,26.64,"britannia",2,true],["Key West",-81.78,24.56,"britannia",2,true]];
  // Six simultaneous invasion army groups aboard fourteen-capacity flotillas.
  const ARMY_GROUPS=[["eu","New England","heavy",4,"leila"],["eu","New England","assault",4,"yukiya"],["eu","New England","rocket",3,"anna"],["eu","New England","medium",3,"ryo"],["eu","New York","heavy",4,"akito"],["eu","New York","assault",4,"oscar"],["eu","New York","rocket",3,"klaus"],["eu","New York","medium",3,"margaret"],["eu","Chesapeake","heavy",4,"smilas"],["eu","Chesapeake","assault",4,"ayano"],["eu","Chesapeake","rocket",3,"pierre"],["eu","Chesapeake","medium",3,"olivia"],["eu","Carolinas","heavy",4,"ryo"],["eu","Carolinas","assault",4,"leila"],["eu","Carolinas","rocket",3,"akito"],["eu","Carolinas","medium",3,"yukiya"],["eu","Georgia","heavy",4,"klaus"],["eu","Georgia","assault",4,"anna"],["eu","Georgia","rocket",3,"oscar"],["eu","Georgia","medium",3,"smilas"],["eu","Florida","heavy",4,"ayano"],["eu","Florida","assault",4,"margaret"],["eu","Florida","rocket",3,"pierre"],["eu","Florida","medium",3,"olivia"],["britannia","Portland","heavy",4,"cornelia"],["britannia","Portland","medium",2,null],["britannia","Boston","rocket",3,"suzaku"],["britannia","Providence","assault",3,"guilford"],["britannia","New York City","heavy",3,"bismarck"],["britannia","New York City","medium",2,null],["britannia","Newark","rocket",3,"darlton"],["britannia","Philadelphia","assault",4,"jeremiah"],["britannia","Baltimore","heavy",3,"villetta"],["britannia","Baltimore","medium",2,null],["britannia","Washington D.C.","rocket",3,"oldrin"],["britannia","Richmond","assault",3,"gino"],["britannia","Norfolk","heavy",3,"cecile"],["britannia","Norfolk","medium",2,null],["britannia","Raleigh","rocket",4,"marianne"],["britannia","Wilmington NC","assault",3,"nonette"],["britannia","Charlotte","heavy",3,"kewell"],["britannia","Charlotte","medium",2,null],["britannia","Columbia","rocket",3,"cornelia"],["britannia","Charleston","assault",3,"suzaku"],["britannia","Savannah","heavy",4,"guilford"],["britannia","Savannah","medium",2,null],["britannia","Jacksonville","rocket",3,"bismarck"],["britannia","Orlando","assault",3,"darlton"],["britannia","Tampa","heavy",3,"jeremiah"],["britannia","Tampa","medium",2,null],["britannia","Miami","rocket",3,"villetta"],["britannia","Tallahassee","assault",4,"oldrin"],["britannia","Roanoke","heavy",3,"gino"],["britannia","Roanoke","medium",2,null],["britannia","Hartford","rocket",3,"cecile"],["britannia","Albany","assault",3,"marianne"],["britannia","Wilmington","heavy",3,"nonette"],["britannia","Wilmington","medium",2,null],["britannia","Cape Canaveral","rocket",4,"kewell"]];
  const PORTS={"Portland":2,"Portsmouth":2,"Boston":3,"Providence":2,"Newport":2,"New London":2,"New Haven":2,"Bridgeport":2,"New York City":3,"Newark":2,"Philadelphia":3,"Wilmington":2,"Baltimore":3,"Annapolis":2,"Norfolk":3,"Newport News":2,"Virginia Beach":2,"Wilmington NC":2,"Charleston":3,"Myrtle Beach":2,"Savannah":2,"Brunswick":2,"Jacksonville":3,"St. Augustine":2,"Cape Canaveral":2,"Tampa":2,"St. Petersburg":2,"West Palm Beach":2,"Fort Lauderdale":2,"Miami":3,"Fort Myers":2,"Key West":2};
  const FLEETS=[["eu","New England",-69.1,41.5,"eu_carrier",7],["eu","New England",-69.1,41.5,"panzer_frosch_ii",4],["eu","New York",-71.5,39.7,"eu_carrier",7],["eu","New York",-71.5,39.7,"panzer_frosch_ii",4],["eu","Chesapeake",-73.9,36.9,"eu_carrier",7],["eu","Chesapeake",-73.9,36.9,"panzer_frosch_ii",4],["eu","Carolinas",-75.4,33.2,"eu_carrier",7],["eu","Carolinas",-75.4,33.2,"panzer_frosch_ii",4],["eu","Georgia",-78.5,30.6,"eu_carrier",7],["eu","Georgia",-78.5,30.6,"panzer_frosch_ii",4],["eu","Florida",-78.4,27.1,"eu_carrier",7],["eu","Florida",-78.4,27.1,"panzer_frosch_ii",4],["britannia","Boston",null,null,"carrier_battleship",1],["britannia","Boston",null,null,"portman_ii",3],["britannia","New York City",null,null,"carrier_battleship",2],["britannia","New York City",null,null,"portman_ii",3],["britannia","Norfolk",null,null,"carrier_battleship",2],["britannia","Norfolk",null,null,"portman_ii",3],["britannia","Charleston",null,null,"carrier_battleship",1],["britannia","Charleston",null,null,"portman_ii",3],["britannia","Jacksonville",null,null,"carrier_battleship",1],["britannia","Jacksonville",null,null,"portman_ii",3],["britannia","Miami",null,null,"carrier_battleship",1],["britannia","Miami",null,null,"portman_ii",3],["britannia","Portland",null,null,"carrier_battleship",1],["britannia","Portland",null,null,"portman_ii",3],["britannia","Baltimore",null,null,"carrier_battleship",1],["britannia","Baltimore",null,null,"portman_ii",3]];
  const FUNDING={eu:{credits:1450,industry:760,science:110,sakuradite:55},britannia:{credits:1550,industry:815,science:118,sakuradite:60}};
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
  // Mountains and wooded uplands follow the Appalachian spine and New England.
  const RIDGES=[[-71.5,44.7,1.6,2.2],[-73.7,43.4,1.3,1.8],[-75.2,41.4,1.6,2.5],[-78.2,38.1,1.7,3.1],[-81.2,35.6,1.5,2.7],[-83.4,34.5,1.3,2.1]];
  const WOODS=[[-69.7,45.5,3,3],[-73.1,43,3,3],[-77.0,39,2.3,3.1],[-80.1,35.5,2.5,3.2],[-82,31,2.6,2.8],[-81,28.6,2.1,2.8]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p){const m=density(p,RIDGES),f=density(p,WOODS);
    return m>.67?'mountain':m>.29||f>.41?'forest':'plains';}
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
  function create(player='eu',difficulty='normal',seed=201717){
    if(!SIDES.includes(player))throw Error('Unsupported Invasion of the American East Coast faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'invasion-american-east-coast',order:[player,...SIDES.filter(s=>s!==player)],
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
    g.scenario={id:'invasion-american-east-coast',key:'eastCoast',title:'Invasion of the American East Coast',
      version:1,phase:'transatlantic-amphibious',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,citylessFunding:['eu'],
      rivers:{Hudson:[[-73.9,43.7],[-73.8,42.7],[-73.75,42.0],[-74.02,40.7]],Delaware:[[-75.2,40.8],[-75.6,40.0],[-75.5,39.6],[-75.3,39.2]],Susquehanna:[[-76.0,42.0],[-76.6,40.5],[-76.2,39.65]],Potomac:[[-78.2,39.5],[-77.3,39.1],[-77.0,38.9],[-76.4,38.2]],James:[[-79.7,37.5],[-78.8,37.6],[-77.5,37.5],[-76.3,37.05]],Chesapeake:[[-76.1,39.6],[-76.2,38.9],[-76.2,37.7],[-76.0,36.9]],Savannah:[[-82.7,34.1],[-82.1,33.4],[-81.1,32.08]],StJohns:[[-81.65,28.1],[-81.5,29.2],[-81.65,30.33]]},
      operationalFronts:['New England','New York','Chesapeake','Carolinas','Georgia','Florida'].map(name=>({name,attack:'eu',objective:({'New England':'Boston','New York':'New York City',Chesapeake:'Norfolk',Carolinas:'Charleston',Georgia:'Savannah',Florida:'Miami'})[name]}))};
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
    // preserves the Cape of Good Hope and narrow coastal approaches.
    const coastal=coverage();
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),fraction=coastal[i];
      return {c,r,owner:null,terrain:fraction===0?'sea':
        fraction===1?'coast':landscape(p)};
    });
    // GSHHG coastal samples have isolated inland lakes. Keep ocean only.
    const visited=new Set();let ocean=new Set();
    for(const start of g.tiles){
      if(start.terrain!=='sea'||visited.has(E.key(start)))continue;
      const q=[start],component=new Set([E.key(start)]);visited.add(E.key(start));
      for(let i=0;i<q.length;i++)for(const n of E.adjacent(g,q[i])){
        const key=E.key(n);if(n.terrain!=='sea'||visited.has(key))continue;
        visited.add(key);component.add(key);q.push(n);
      }
      if(component.size>ocean.size)ocean=component;
    }
    if(ocean.size<6000)throw Error('East Coast ocean basin is unexpectedly fragmented');
    // Keep isolated water classified as sea through province assignment; ban
    // it only after city, province and unit deployment have finished.
    const navigable=t=>t.terrain==='sea'&&ocean.has(E.key(t));
    const taken=new Set(); // Reserve independent port hexes while choosing harbor city anchors.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const hasPort=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!hasPort||E.adjacent(g,t).some(n=>navigable(n)&&!taken.has(E.key(n))))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place European city '+name);
      const capital=name==='New York City';
      const shield=fort?400:120+60*tier;
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Coastal Defence Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
        industry:Math.round((capital?25:6*tier)*.55),
        science:Math.round((1+tier)*.55),producedTurn:0});
      if(hasPort){
        const port=E.adjacent(g,at).filter(t=>navigable(t)&&!taken.has(E.key(t)))
          .sort((a,b)=>E.adjacent(g,b).filter(n=>n.terrain==='sea').length-
            E.adjacent(g,a).filter(n=>n.terrain==='sea').length)[0];
        if(!port)throw Error('Cannot reserve independent naval port for '+name);
        const station=g.stations[g.stations.length-1];
        station.portAt={c:port.c,r:port.r};station.portLevel=PORTS[name];station.portOwner=owner;
        taken.add(E.key(port));
      }
      // Preserve mixed-coast city land adjacency; ports never share a hex.
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
      if(side==='eu')continue; // Load EU forces into offshore carriers below.
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
    for(const [side,name,lon,lat,type,count] of FLEETS){
      const s=side==='britannia'?g.stations.find(v=>v.name===name):null;
      const anchor=s||locate(lon,lat);
      if(!E.TYPES[type]?.naval)throw Error('Invalid the American East Coast fleet type '+type);
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
    // Load all 24 Britannian land formations into offshore carriers before turn one.
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
    // Preserve the entire connected Atlantic and Gulf theatre for transatlantic
    // carrier approaches. Only disconnected inland water is impassable.
    for(const t of g.tiles)if(t.terrain==='sea'&&!ocean.has(E.key(t)))t.terrain='offmap';
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
        g.economy[side][resource]=actual[resource]*(side==='eu'?4:3);
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>E.foe(g,v,player)))
        for(const [i,u] of g.units.flatMap(v=>[v,...(v.cargo||[])])
          .filter(v=>v.side===side&&E.TYPES[v.type].naval!=='ship').entries())
          if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.reduce((n,u)=>
      n+(u.side===s?1:0)+(u.cargo||[]).filter(v=>v.side===s).length,0)]));
    E.log(g,'Europia United begins without cities; six offshore carrier groups strike the Britannian seaboard from Maine to Florida.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    const remaining=g.stations.filter(s=>s.owner!==side).length;
    return side==='eu'?'Capture every East Coast city ('+remaining+' remain).':
      'Repel the invasion and hold the American East Coast ('+remaining+' occupied cities).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='invasion-american-east-coast'||g.stations.length!==CITIES.length)return null;
    if(g.stations.every(s=>s.owner==='eu'))return {winner:'eu',team:'eu',reason:'Europia United has captured every Britannian East Coast city.'};
    const invaders=g.units.some(u=>u.side==='eu'&&u.hp>0)||g.units.some(u=>(u.cargo||[]).some(v=>v.side==='eu'&&v.hp>0));
    if(!invaders&&!g.stations.some(s=>s.owner==='eu'))return {winner:'britannia',team:'britannia',reason:'Britannia has destroyed the E.U. expedition.'};
    return null;
  }
  const api={id:'invasion-american-east-coast',title:'Invasion of the American East Coast',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  E.scenarios={...(E.scenarios||{}),eastCoast:api,
    byId:{...(E.scenarios?.byId||{}),'invasion-american-east-coast':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

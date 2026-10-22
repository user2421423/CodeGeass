/* Invasion of Greenland — E.U. carrier invasion of Britannian Arctic bases.
   140 x 120 WGS84-aligned GSHHS intermediate coastline, sampled at 17 points
   per hex. Below 20% sea, 20–80% mixed land/coast, above 80% inland.
   Greenland's ice sheet is impassable; every city remains on an accessible coast.
   Preserves common faction units, AI and combat mechanics. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=140,ROWS=120,SIDES=['britannia','eu'];
  const BOUNDS={west:-78,east:-10,north:84,south:58};
  const K=Math.cos(71*Math.PI/180);
  const PROJECTION={centerLon:-44,centerLat:71,angle:0,uMin:-34*K,uMax:34*K,vMin:-13,vMax:13};
  // Natural Earth source for Canadian Arctic islands outside playable Greenland.
  const FOREIGN_GREENLAND_LAND=atob('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABw7gAAAAAAAAAAAAAAAAAAACfv/yoAAAAAAAAAAAAAAAAAA9////gAAAAAAAAAAAAAAAAAP/////AAAAAAAAAAAAAAAAAD/////gAAAAAAAAAAAAAAAAA/////gAAAAAAAAAAAAAAAAAP///8AAAAAAAAAAAAAAAAAAD///wAAAAAAAAAAAAAAAAAAAf//nwAAAAAAAAAAAAAAAAAAP///gAAAAAAAAAAAAAAAAAAA///gAAAAAAAAAAAAAAAAAAA///gAAAAAAAAAAAAAAAAAAAP/+wAAAAAAAAAAAAAAAAAAAD//AAAAAAAAAAAAAAAAAAAAA//4AAAAAAAAAAAAAAAAAAAAP84AAAAAAAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAP4AAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAA/gAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAAfAAAAAAAAAAAAAAAAAAAAAAPYAAAAAAAAAAAAAAAAAAAAAD2gAAAAAAAAAAAAAAAAAAAAA/3AAAAAAAAAAAAAAAAAAAAAP38AAAAAAAAAAAAAAAAAAAAD/+AAAAAAAAAAAAAAAAAAAAA/+4AAAAAAAAAAAAAAAAAAAAP//wAAAAAAAAAAAAAAAAAAAD///AAAAAAAAAAAAAAAAAAAA//+IAAAAAAAAAAAAAAAAAAAH///AAAAAAAAAAAAAAAAAAAA///wAAAAAAAAAAAAAAAAAAAP//IAAAAAAAAAAAAAAAAAAAE///AAAAAAAAAAAAAAAAAAAAH/+AAAAAAAAAAAAAAAAAAAAO//4AAAAAAAAAAAAAAAAAAABH/8AAAAAAAAAAAAAAAAAAAAE//gAAAAAAAAAAAAAAAAAAAGD/+AAAAAAAAAAAAAAAAAAAD4//wAAAAAAAAAAAAAAAAAAA9n//gAAAAAAAAAAAAAAAAAAeB//8AAAAAAAAAAAAAAAAAADwP//gAAAAAAAAAAAAAAAAAAAH//8AAAAAAAAAAAAAAAAAAAB///IAAAAAAAAAAAAAAAAAAA///+AAAAAAAAAAAAAAAAAAAf///gAAAAAAAAAAAAAAAAAAP/9/4AAAAAAAAAAAAAAAAAAH//H+AAAAAAAAAAAAAAAAAAA//A/AAAAAAAAAAAAAAAAAAAH/4PwAAAAAAAAAAAAAAAAAAH//DwAAAAAAAAAAAAAAAAAB3//wcAAAAAAAAAAAAAAAAAA///+AAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAD9///AAAAAAAAAAAAAAAAAAA+H//4AAAAAAAAAAAAAAAAAAAA//8AAAAAAAAAAAAAAAAAACAH//gAAAAAAAAAAAAAAAAAAAB/f4AAAAAAAAAAAAAAAAAACAD4/AAAAAAAAAAAAAAAAAAAAD+PAAAAAAAAAAAAAAAAAAAAAP44AAAAAAAAAAAAAAAAAAAAB/EAAAAAAAAAAAAAAAAAAABAT4gAAAAAAAAAAAAAAAAAA4IA+IAAAAAAAAAAAAAAAAAAP3AD4AAAAAAAAAAAAAAAAAAD/4AEAAAAAAAAAAAAAAAAAAA//AAIAAAAAAAAAAAAAAAAAAP/4AGAAAAAAAAAAAAAAAAAAB/+AAAAAAAAAAAAAAAAAAAAA//wAAAAAAAAAAAAAAAAAAAAP//QAAAAAAAAAAAAAAAAAAAD//4AAAAAAAAAAAAAAAAAAAAf/+IEAAAAAAAAAAAAAAAAAAP//kCAAAAAAAAAAAAAAAAAAB//4AAAAAAAAAAAAAAAAAAAAf/+AMAAAAAAAAAAAAAAAAAAH//gDgAAAAAAAAAAAAAAAAAD//4BwAAAAAAAAAAAAAAAAAA///AfAAAAAAAAAAAAAAAAAAP//wHwAAAAAAAAAAAAAAAAAD//3B+AAAAAAAAAAAAAAAAAA///x/AAAAAAAAAAAAAAAAAAP//+/8AAAAAAAAAAAAAAAAAB////9AAAAAAAAAAAAAAAAAA');
  const foreignGreenlandAt=(c,r)=>{const i=r*COLS+c;return !!(FOREIGN_GREENLAND_LAND.charCodeAt(i>>3)&(128>>(i&7)));};
  // GSHHS intermediate-resolution Greenland-only polygons, including nearshore islets.
  // Each hex sampled at 17 locations; transition coordinates are hexadecimal columns.
  const COAST_ROWS=`;58.1,5b.0;4e.1,53.2,62.1,68.0;44.1,48.0,4a.1,51.2,60.1,62.2,67.1,69.0;3f.1,44.2,49.1,4a.2,4b.1,50.2,58.1,59.2,5a.1,5f.2,64.1,68.2,6b.1,6c.0;3b.1,3d.0,3f.1,4a.2,57.1,58.2,6a.1,6b.2,6d.1,71.0;3d.1,3e.2,40.1,43.2,48.1,49.2,4a.1,4d.2,73.1,74.0;36.2,3a.1,3b.0,3e.1,3f.2,42.1,45.2,4b.1,4c.2,70.1,71.0;27.1,2c.2,30.0,31.2,33.1,35.0,37.1,38.2,3d.1,40.0,41.1,43.2,5f.1,6d.0,75.1,76.0;22.1,26.2,30.0,31.1,39.2,40.1,41.0,42.1,43.2,5b.1,5e.0,5f.1,63.2,68.1,6b.0,6d.2,71.1,72.0,75.1,77.0,7d.1,82.0;21.1,22.2,26.1,28.2,30.1,32.2,38.1,39.2,5a.1,5d.2,69.1,6b.0,6c.1,6e.2,72.1,73.0,79.1,7a.0,7b.1,7d.2,85.1,87.0;21.1,22.2,28.1,29.2,66.1,6a.2,71.1,72.0,73.1,7b.2,86.1,87.0;21.1,22.2,70.1,72.0,73.1,74.2,84.1,85.0;1b.1,1d.2,1f.1,22.2,6f.1,70.0,71.2,81.1,83.0;1a.1,1b.2,6f.1,70.2,80.1,82.0;17.1,19.2,6d.1,6f.2,75.1,76.2,79.1,7d.0;16.1,17.2,7e.1,7f.0;15.1,16.2,1b.1,1c.2,76.1,7d.0;18.1,1a.0,1b.1,1d.2,76.1,78.2,7c.1,7d.0;1a.1,1b.2,76.1,77.2,78.1,7b.0;1b.1,1c.2,78.0;19.1,1a.2,77.1,78.0;13.1,19.2,77.1,79.0;11.1,12.2,75.1,79.0;e.1,f.2,75.1,76.0;b.2,74.1,75.0;b.2,74.1,75.0;a.1,b.2,73.1,74.0,75.1,76.0;d.1,10.2,73.1,75.2,76.1,79.0,7b.1,7d.0;f.1,11.2,15.1,16.0,17.1,18.2,75.1,76.0,77.1,79.0;b.1,10.0,13.1,18.2,77.1,7b.0;e.1,f.2,11.1,12.2,13.1,14.2,7a.1,7b.0;e.1,f.2,10.1,11.2,76.1,78.2,7b.0;10.1,12.2,13.1,14.2,71.1,72.0,73.2,74.1,75.0,79.1,7a.0;12.1,13.2,73.1,74.0,79.1,7a.0;11.1,12.2,18.1,19.2,1b.1,1c.2,1d.1,1f.2,73.1,76.0,79.1,7a.0;13.1,15.2,16.1,18.0,19.1,1b.0,23.1,24.2,77.1,78.0,7a.1,7b.0;25.1,26.2,76.1,78.0;27.1,29.2,73.1,74.2,78.1,79.0;28.1,29.2,74.1,75.2,78.1,79.0;28.1,29.2,75.1,76.0,77.1,7a.2,7b.1,7c.0;29.1,2a.2,75.1,77.0,79.1,7c.0;2b.1,2c.2,76.1,78.0;2a.1,2c.2,78.1,7a.0;2c.1,2d.2,73.1,74.2,76.1,77.2,79.0;2b.1,2d.2,72.1,76.0;2c.1,2e.2,74.1,76.0;2d.2,6c.1,70.2,76.0;2e.1,2f.2,6c.1,6e.0,6f.1,70.2,74.1,77.0;2e.1,2f.2,68.1,6c.2,6f.1,70.0,71.1,73.0;2e.1,2f.2,68.1,69.2,6d.1,6e.2,71.1,72.0;2e.1,30.2,69.1,6e.2,70.1,71.2,72.1,73.0;2d.1,2f.0,30.2,6d.1,6f.2,71.1,73.0;2d.1,2f.2,6b.1,6e.0,6f.1,70.2,71.1,73.0;2e.1,30.2,31.1,32.2,6f.1,70.0,71.1,73.0;2d.1,2f.2,65.1,67.2,71.1,72.0;2e.1,2f.2,32.1,34.2,67.1,69.2,71.1,73.0;2d.1,2e.2,31.1,36.2,67.1,6c.2,71.1,73.0;33.1,37.2,6c.1,6e.2,72.1,74.0;31.2,32.0,34.1,37.2,6a.1,6b.0,6d.1,6e.2,73.1,74.0;35.1,38.2,66.1,6b.2,6c.1,6d.0,6e.1,6f.2,73.1,74.0;30.2,34.1,38.2,66.1,68.2,6b.1,6c.0,6e.1,6f.2,73.1,74.0;2f.1,30.0,31.1,32.2,36.1,38.2,66.1,67.2,68.1,6a.0,70.1,74.0;2f.1,30.2,31.1,34.2,67.1,6b.2,6d.1,6f.0;30.1,31.2,33.1,34.0,35.1,39.2,66.1,69.2,72.1,73.0;2f.2,34.1,35.0,36.1,39.2,70.1,71.0;2f.1,31.2,35.1,36.0,37.1,38.2,6f.1,70.0;30.1,31.2,32.1,34.0,37.1,38.2,6d.1,6e.0;37.1,3a.2,6d.0;37.2,6b.1,6c.0;34.1,35.0,37.1,38.2,6a.1,6b.0;33.1,37.2,5d.1,5e.2,65.1,68.0;33.1,34.2,36.1,38.2,5e.1,5f.2,62.1,65.0;32.1,33.2,35.1,38.2,5e.0,5f.1,62.0;32.1,33.2,34.1,35.2,37.1,39.2,5d.1,5e.0;31.1,32.2,35.1,37.2,5c.0;32.2,5c.0;31.1,33.2,5b.0;32.1,33.2,5a.1,5b.0;32.1,34.2,35.1,37.2,5a.0;32.1,34.2,59.1,5a.0;31.1,32.2,52.1,53.2,58.1,59.0;32.1,33.2,52.1,54.2,57.0;32.1,33.2,51.1,53.2,54.1,56.0;33.1,34.2,37.1,38.2,4f.1,50.2,52.1,54.0;33.1,35.2,4e.1,4f.0;34.1,35.2,4e.1,4f.0;34.1,35.2,4b.1,4c.0,4d.1,4e.0;35.1,36.2,4c.1,4d.0;34.1,35.2,36.1,39.2,4c.1,4d.0;35.1,3a.2,4c.1,4e.0;35.1,38.2,4a.1,4d.0;36.1,37.2,4d.0;36.2,4b.1,4d.0;37.1,38.2,4c.1,4d.0;37.1,38.2,4a.1,4c.0;38.1,39.2,49.1,4c.0;38.1,39.2,48.1,49.2,4a.0;39.1,3a.2,48.1,4a.0;38.1,39.2,48.1,49.0;3a.1,3b.2,49.1,4a.0;3a.1,3c.2,48.1,4a.0;3a.1,3c.2,49.1,4a.0;3b.2,48.1,49.0;3c.1,3d.2,49.0;3c.1,3d.2,41.1,43.2,48.0;3d.1,42.2,48.1,49.0;41.1,42.2,47.1,48.0;42.1,45.2,47.1,48.0;42.1,44.2,47.0;44.1,48.0;45.1,46.0;;;;;;;;`.split(';').map(row=>row?row.split(',').map(s=>{
    const [column,klass]=s.split('.');return [parseInt(column,16),Number(klass)];}):[]);
  function coastCoverageClass(c,r){
    let value=0;
    for(const [column,klass] of COAST_ROWS[r]){if(c<column)break;value=klass;}
    return value;
  }
  const CITIES=[["Nuuk",-51.74,64.18,"britannia",3,true],["Sisimiut",-53.67,66.94,"britannia",3,true],["Ilulissat",-51.1,69.22,"britannia",3,true],["Qaqortoq",-46.03,60.72,"britannia",3,true],["Aasiaat",-52.87,68.71,"britannia",2,true],["Maniitsoq",-52.9,65.42,"britannia",2,true],["Paamiut",-49.67,61.99,"britannia",2,true],["Uummannaq",-52.13,70.67,"britannia",2,true],["Upernavik",-56.16,72.79,"britannia",2,true],["Tasiilaq",-37.64,65.61,"britannia",3,true],["Ittoqqortoormiit",-21.96,70.48,"britannia",2,true],["Narsaq",-46.05,60.91,"britannia",2,false],["Nanortalik",-45.23,60.14,"britannia",2,true],["Kangerlussuaq",-50.7,67.01,"britannia",2,false],["Qeqertarsuaq",-53.54,69.24,"britannia",2,true],["Qaanaaq",-69.23,77.47,"britannia",2,true],["Kulusuk",-37.18,65.57,"britannia",2,true],["Narsarsuaq",-45.42,61.16,"britannia",2,false]];
  const ARMY_GROUPS=[["eu","Southwest Landing Force","heavy",3,"akito"],["eu","Southwest Landing Force","rocket",3,"yukiya"],["eu","Southwest Landing Force","assault",2,"leila"],["eu","Davis Strait Force","heavy",3,"oscar"],["eu","Davis Strait Force","medium",3,"ryo"],["eu","Davis Strait Force","siege",2,"anna"],["eu","East Greenland Force","heavy",3,"smilas"],["eu","East Greenland Force","rocket",3,"olivia"],["eu","East Greenland Force","assault",2,"klaus"],["eu","Baffin Bay Force","heavy",2,"ayano"],["eu","Baffin Bay Force","medium",2,"fernando"],["britannia","Nuuk","heavy",3,"cornelia"],["britannia","Nuuk","rocket",2,"cecile"],["britannia","Nuuk","assault",2,"guilford"],["britannia","Sisimiut","heavy",2,"bismarck"],["britannia","Sisimiut","rocket",2,"darlton"],["britannia","Ilulissat","heavy",2,"suzaku"],["britannia","Ilulissat","medium",2,"gino"],["britannia","Qaqortoq","heavy",2,"jeremiah"],["britannia","Qaqortoq","siege",2,"villetta"],["britannia","Aasiaat","medium",2,"oldrin"],["britannia","Maniitsoq","medium",2,null],["britannia","Tasiilaq","heavy",2,"dorothea"],["britannia","Tasiilaq","rocket",2,null],["britannia","Ittoqqortoormiit","medium",2,null],["britannia","Qaanaaq","medium",2,null],["britannia","Uummannaq","medium",2,null],["britannia","Upernavik","assault",2,null],["britannia","Nanortalik","medium",2,null],["britannia","Qeqertarsuaq","rocket",2,null],["britannia","Kulusuk","medium",2,null]];
  const PORTS={"Nuuk":3,"Sisimiut":3,"Ilulissat":3,"Qaqortoq":3,"Aasiaat":2,"Maniitsoq":2,"Paamiut":2,"Uummannaq":2,"Upernavik":2,"Tasiilaq":3,"Ittoqqortoormiit":2,"Nanortalik":2,"Qeqertarsuaq":2,"Qaanaaq":2,"Kulusuk":2};
  const FLEETS=[["eu","Southwest Landing Force",-55.2,62.1,"eu_carrier",5],["eu","Davis Strait Force",-59,68,"eu_carrier",5],["eu","East Greenland Force",-32.9,66.7,"eu_carrier",5],["eu","Baffin Bay Force",-62.8,74,"eu_carrier",4],["eu","Southwest Landing Force",-55.2,62.1,"panzer_frosch_ii",3],["eu","Davis Strait Force",-59,68,"panzer_frosch_ii",3],["eu","East Greenland Force",-32.9,66.7,"panzer_frosch_ii",3],["eu","Baffin Bay Force",-62.8,74,"panzer_frosch_ii",2],["britannia","Nuuk",null,null,"carrier_battleship",2],["britannia","Sisimiut",null,null,"portman_ii",2],["britannia","Ilulissat",null,null,"portman_ii",2],["britannia","Qaqortoq",null,null,"carrier_battleship",1],["britannia","Tasiilaq",null,null,"portman_ii",2],["britannia","Ittoqqortoormiit",null,null,"portman_ii",1]];
  const FUNDING={britannia:{credits:480,industry:310,science:58,sakuradite:25},
    eu:{credits:750,industry:400,science:65,sakuradite:32}};
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
  // Adjacent fjord slopes remain mountainous; Greenland's ice cap uses
  // existing 'peak' hexes, rather than inventing a new global unit rule.
  function landscape(p){
    return p.lat>=76?'snow':p.lon>-42&&p.lat<71?'mountain':'snow';
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
  function create(player='eu',difficulty='normal',seed=201720){
    if(!SIDES.includes(player))throw Error('Unsupported Invasion of Greenland faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'eu-greenland',order:[player,...SIDES.filter(s=>s!==player)],
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
    g.scenario={id:'eu-greenland',key:'greenland',title:'Invasion of Greenland',
      version:2,phase:'greenland-amphibious',aiDoctrine:'europe',groups:[],funding:{},
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
    // preserves the Cape of Good Hope and narrow coastal approaches.
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),fraction=coastCoverageClass(c,r);
      return {c,r,owner:null,terrain:foreignGreenlandAt(c,r)?'offmap':
        fraction===0?'sea':fraction===1?'coast':landscape(p)};
    });
    // Map Greenland's inland ice cover from actual distance to marine shore.
    // Coastal snow and fjord mountains remain traversable; the thick inland
    // cap is blocked, but there are no inland enemy-city objectives.
    const iceDistance=new Int16Array(g.tiles.length).fill(-1),iceQueue=[];
    for(const t of g.tiles){
      if(t.terrain==='sea'||t.terrain==='offmap')continue;
      if(E.adjacent(g,t).some(n=>n.terrain==='sea')){
        iceDistance[t.r*COLS+t.c]=0;iceQueue.push(t);
      }
    }
    for(let i=0;i<iceQueue.length;i++)for(const n of E.adjacent(g,iceQueue[i])){
      const index=n.r*COLS+n.c;
      if(n.terrain==='sea'||n.terrain==='offmap'||iceDistance[index]>=0)continue;
      iceDistance[index]=iceDistance[iceQueue[i].r*COLS+iceQueue[i].c]+1;
      iceQueue.push(n);
    }
    for(const t of g.tiles){
      if(t.terrain==='sea'||t.terrain==='coast'||t.terrain==='offmap')continue;
      const depth=iceDistance[t.r*COLS+t.c];
      if(depth>=6){t.terrain='peak';t.biome='ice-sheet';}
      else if(depth>=3){t.terrain='snow';t.biome='ice-sheet';}
      else if(t.terrain==='mountain'){t.biome='fjords';}
      else t.terrain='snow';
    }
    const excludedLand=new Uint8Array(g.tiles.length);
    // Audit connectivity: a ship may use sea and mixed-coast cells only.
    // No artificial inland waterways or shortcuts across African land.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&t.terrain!=='peak'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Greenland coastal city '+name);
      const capital=name==='Nuuk'||name==='Ilulissat'||name==='Tasiilaq';
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
      if(g.tiles[i].terrain==='sea'||g.tiles[i].terrain==='offmap'||components[i]>=0)continue;
      const q=[g.tiles[i]];components[i]=id;
      for(let k=0;k<q.length;k++)for(const n of E.adjacent(g,q[k])){
        const j=n.r*COLS+n.c;
        if(n.terrain==='sea'||n.terrain==='offmap'||components[j]>=0)continue;
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
      if(side==='eu')continue; // Load expeditionary forces aboard offshore carriers.
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side)throw Error('Invalid staging city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&!E.TERRAIN[t.terrain]?.blocked&&!E.unitAt(g,t)&&
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
      if(!E.TYPES[type]?.naval)throw Error('Invalid Greenland fleet type '+type);
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
    // Embark every E.U. land formation at turn one. Fleet groups are separate landing axes.
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
    // Keep the North Atlantic, Davis Strait, Baffin Bay and east-coast corridors navigable.
    const depth=new Int16Array(g.tiles.length).fill(-1),q=[];
    for(const t of g.tiles)if(t.terrain!=='sea'&&t.terrain!=='offmap'){
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
    // No scripted sites or deadlines; use the normal economy and research systems.
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*(side==='eu'?2:3);
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
    E.log(g,'Europia United begins offshore with four carrier-led landing groups; Britannia holds every Greenlandic coastal city.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    const remaining=g.stations.filter(s=>s.owner==='britannia').length;
    return side==='eu'
      ? 'Land from your carriers, secure the fjords and conquer all '+CITIES.length+
        ' Greenland cities ('+remaining+' Britannian cities remain).'
      : 'Defend all Greenland coastal bases. Repel the E.U. invasion ('+
        g.stations.filter(s=>s.owner==='eu').length+' bases occupied).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='eu-greenland'||
       g.stations.length!==CITIES.length)return null;
    if(g.stations.every(s=>s.owner==='eu'))
      return {winner:'eu',team:'eu',reason:'Europia United has captured every Greenland base.'};
    const foothold=g.stations.some(s=>s.owner==='eu');
    const invaders=g.units.some(u=>u.side==='eu'&&u.hp>0);
    if(!foothold&&!invaders)return {winner:'britannia',team:'britannia',
      reason:'Britannia has eliminated the E.U. invasion of Greenland.'};
    return null;
  }
  const api={id:'eu-greenland',title:'Invasion of Greenland',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,land:'greenland',overlays:['greenland']},
    elite:true,expeditionSide:'eu',
    text:{
      era:"Greenland · Alternate 2017",
      intro:"Europia United launches a carrier-borne assault to take Greenland’s North Atlantic bases. Capture every enemy city; no turn limit.",
      diplomacy:"Britannia controls every city. Europia starts at sea with no city, but can seize independent harbours and reinforce coastal landing zones.",
      elite:"Elite Greenland uses the standard E.U. and Britannian elite conversion and increased AI resources; the geography and carrier rules are unchanged.",
      focus:{
        eu:"Nuuk",
        britannia:"Nuuk"
      }
    },
    blurbs:{
      eu:"Start offshore with four carrier-supported Army Groups. Seize Greenland’s fjord ports and advance around the ice sheet to each Britannian base.",
      britannia:"Hold Nuuk, Sisimiut, Ilulissat, Tasiilaq and the northern garrisons. Concentrate coastal reserves, patrol the straits and counterattack invaded harbours."
    }};
  E.scenarios={...(E.scenarios||{}),greenland:api,
    byId:{...(E.scenarios?.byId||{}),'eu-greenland':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

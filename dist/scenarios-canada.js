/* Invasion of Canada — E.U. combined Atlantic and Arctic offensive, alternate 2017.
   196 × 112 north-up GSHHS regional map, 20–80% mixed coast. No turn limit. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=196,ROWS=112,SIDES=['eu','britannia'],ID='invasion-canada';
  const BOUNDS={west:-147,east:-40,north:83.8,south:41};
  const K=Math.cos(62.4*Math.PI/180);
  const PROJECTION={centerLon:-93.5,centerLat:62.4,angle:0,uMin:-53.5*K,uMax:53.5*K,vMin:-21.4,vMax:21.4};
  const GEO=root.CANADA_GEOGRAPHY || (typeof require==='function'?require('./canada-landmask.js'):null);
  if(!GEO||GEO.cols!==COLS||GEO.rows!==ROWS||GEO.coverage.length!==COLS*ROWS)
    throw Error('Missing Canada coastline coverage');
  const COAST=GEO.coverage;
  const CITIES=[["Nuuk",-51.72,64.18,"eu",3,true],["Sisimiut",-53.67,66.94,"eu",2,true],["Ilulissat",-51.1,69.22,"eu",2,true],["Qaqortoq",-46.03,60.72,"eu",2,true],["Iqaluit",-68.52,63.75,"eu",2,true],["Pond Inlet",-77.96,72.7,"eu",2,true],["Vancouver",-123.12,49.28,"britannia",3,true],["Victoria",-123.37,48.43,"britannia",3,true],["Nanaimo",-123.94,49.16,"britannia",2,true],["Prince Rupert",-130.32,54.31,"britannia",2,true],["Terrace",-128.6,54.52,"britannia",2,false],["Prince George",-122.75,53.92,"britannia",2,true],["Kamloops",-120.33,50.67,"britannia",2,false],["Kelowna",-119.49,49.89,"britannia",2,false],["Abbotsford",-122.29,49.05,"britannia",2,false],["Fort St. John",-120.85,56.25,"britannia",2,false],["Whitehorse",-135.06,60.72,"britannia",2,true],["Dawson City",-139.43,64.06,"britannia",2,false],["Calgary",-114.07,51.05,"britannia",3,true],["Edmonton",-113.49,53.55,"britannia",3,true],["Fort McMurray",-111.38,56.73,"britannia",2,true],["Lethbridge",-112.84,49.69,"britannia",2,false],["Grande Prairie",-118.8,55.17,"britannia",2,false],["Regina",-104.62,50.45,"britannia",3,true],["Saskatoon",-106.67,52.13,"britannia",3,true],["Prince Albert",-105.75,53.2,"britannia",2,false],["Winnipeg",-97.14,49.9,"britannia",3,true],["Brandon",-99.95,49.85,"britannia",2,false],["Thompson",-97.86,55.74,"britannia",2,true],["Churchill",-94.17,58.77,"britannia",2,true],["Yellowknife",-114.37,62.45,"britannia",2,true],["Inuvik",-133.72,68.36,"britannia",2,true],["Tuktoyaktuk",-133.04,69.45,"britannia",1,false],["Norman Wells",-126.82,65.28,"britannia",2,false],["Cambridge Bay",-105.05,69.12,"britannia",2,true],["Resolute",-94.83,74.7,"britannia",1,true],["Rankin Inlet",-92.09,62.81,"britannia",2,true],["Arviat",-94.06,61.11,"britannia",1,false],["Toronto",-79.38,43.65,"britannia",3,true],["Ottawa",-75.7,45.42,"britannia",3,true],["Hamilton",-79.87,43.26,"britannia",3,true],["London",-81.24,42.98,"britannia",2,false],["Windsor",-83.04,42.31,"britannia",2,true],["Kitchener",-80.48,43.45,"britannia",2,false],["Kingston",-76.49,44.23,"britannia",2,true],["Barrie",-79.69,44.39,"britannia",2,false],["Sudbury",-80.99,46.49,"britannia",2,true],["North Bay",-79.46,46.31,"britannia",2,false],["Thunder Bay",-89.25,48.38,"britannia",3,true],["Sault Ste. Marie",-84.35,46.53,"britannia",2,true],["Timmins",-81.33,48.47,"britannia",2,false],["Kenora",-94.49,49.77,"britannia",2,false],["Montréal",-73.57,45.5,"britannia",3,true],["Québec City",-71.21,46.81,"britannia",3,true],["Trois-Rivières",-72.55,46.35,"britannia",2,false],["Sherbrooke",-71.9,45.4,"britannia",2,false],["Saguenay",-71.07,48.42,"britannia",2,true],["Rimouski",-68.52,48.45,"britannia",2,false],["Sept-Îles",-66.38,50.21,"britannia",2,true],["Baie-Comeau",-68.15,49.22,"britannia",2,true],["Kuujjuaq",-68.4,58.1,"britannia",2,true],["Labrador City",-66.91,52.94,"britannia",2,true],["Happy Valley-Goose Bay",-60.41,53.3,"britannia",2,true],["Halifax",-63.58,44.65,"britannia",3,true],["Sydney",-60.19,46.14,"britannia",2,true],["Truro",-63.27,45.36,"britannia",2,false],["Fredericton",-66.64,45.96,"britannia",2,false],["Saint John",-66.06,45.28,"britannia",2,true],["Moncton",-64.78,46.09,"britannia",2,false],["Bathurst",-65.65,47.62,"britannia",2,false],["Charlottetown",-63.13,46.24,"britannia",2,true],["St. John's",-52.71,47.56,"britannia",3,true],["Corner Brook",-57.96,48.95,"britannia",2,true],["Gander",-54.61,48.95,"britannia",2,true]];
  const ARMY_GROUPS=[["eu","Nuuk","heavy",3,"akito"],["eu","Nuuk","rocket",2,"yukiya"],["eu","Nuuk","support",1,"leila"],["eu","Sisimiut","medium",2,"ryo"],["eu","Ilulissat","assault",2,"ayano"],["eu","Iqaluit","heavy",3,"smilas"],["eu","Iqaluit","rocket",2,"klaus"],["eu","Iqaluit","raider",2,null],["eu","Pond Inlet","medium",3,"oscar"],["eu","Pond Inlet","support",2,null],["eu","Atlantic Vanguard","heavy",3,"marirrosa"],["eu","Atlantic Vanguard","assault",2,"fernando"],["eu","Atlantic Vanguard","rocket",2,"anna"],["eu","Atlantic Vanguard","raider",1,null],["eu","Maritime Assault","heavy",3,"olivia"],["eu","Maritime Assault","rocket",2,"pierre"],["eu","Maritime Assault","assault",3,null],["eu","Hudson Strait Force","heavy",3,"margaret"],["eu","Hudson Strait Force","rocket",2,"sophie"],["eu","Hudson Strait Force","assault",3,null],["eu","Labrador Pincer","medium",3,"kate"],["eu","Labrador Pincer","siege",2,null],["eu","Labrador Pincer","assault",3,null],["eu","Beaufort Passage","heavy",3,"sarah"],["eu","Beaufort Passage","rocket",2,null],["eu","Beaufort Passage","raider",3,null],["britannia","Halifax","heavy",4,"cornelia"],["britannia","Halifax","rocket",3,"cecile"],["britannia","Sydney","assault",3,"guilford"],["britannia","St. John's","heavy",3,"jeremiah"],["britannia","Corner Brook","medium",3,"oldrin"],["britannia","Happy Valley-Goose Bay","heavy",3,"darlton"],["britannia","Québec City","heavy",4,"bismarck"],["britannia","Montréal","rocket",4,"schneizel"],["britannia","Ottawa","heavy",4,"suzaku"],["britannia","Ottawa","siege",3,null],["britannia","Toronto","heavy",5,"gino"],["britannia","Toronto","rocket",4,null],["britannia","Hamilton","medium",3,null],["britannia","Windsor","assault",3,null],["britannia","Kingston","medium",3,null],["britannia","Winnipeg","heavy",4,"villetta"],["britannia","Winnipeg","rocket",3,null],["britannia","Thunder Bay","medium",3,null],["britannia","Regina","heavy",3,null],["britannia","Saskatoon","medium",3,null],["britannia","Calgary","heavy",4,null],["britannia","Calgary","rocket",3,null],["britannia","Edmonton","heavy",4,null],["britannia","Vancouver","heavy",4,null],["britannia","Vancouver","rocket",3,null],["britannia","Victoria","assault",3,null],["britannia","Prince Rupert","medium",3,null],["britannia","Whitehorse","medium",3,null],["britannia","Inuvik","medium",2,null],["britannia","Yellowknife","heavy",3,null],["britannia","Churchill","heavy",3,null],["britannia","Churchill","rocket",2,null],["britannia","Rankin Inlet","medium",2,null],["britannia","Cambridge Bay","medium",2,null],["britannia","Resolute","support",1,null],["britannia","Kuujjuaq","heavy",3,null],["britannia","Labrador City","medium",3,null],["britannia","Sept-Îles","medium",2,null],["britannia","Fredericton","medium",2,null],["britannia","Moncton","assault",2,null]];
  const PORTS={"Nuuk":3,"Sisimiut":2,"Ilulissat":2,"Qaqortoq":2,"Iqaluit":3,"Pond Inlet":2,"Vancouver":3,"Victoria":3,"Nanaimo":2,"Prince Rupert":2,"Churchill":3,"Tuktoyaktuk":2,"Cambridge Bay":2,"Resolute":2,"Rankin Inlet":2,"Kuujjuaq":2,"Halifax":3,"Sydney":2,"Saint John":2,"Charlottetown":2,"Sept-Îles":3,"Baie-Comeau":2,"St. John's":3,"Corner Brook":2,"Gander":2};
  const FLEETS=[["eu","Atlantic Vanguard",-51,45.8,"eu_carrier",4],["eu","Maritime Assault",-60.5,42.5,"eu_carrier",4],["eu","Hudson Strait Force",-66.8,62,"eu_carrier",4],["eu","Labrador Pincer",-57.7,56.5,"eu_carrier",4],["eu","Beaufort Passage",-144,71,"eu_carrier",4],["eu","Atlantic Vanguard",-51,45.8,"panzer_frosch_ii",5],["eu","Maritime Assault",-60.5,42.5,"panzer_frosch_ii",5],["eu","Hudson Strait Force",-66.8,62,"panzer_frosch_ii",5],["eu","Labrador Pincer",-57.7,56.5,"panzer_frosch",4],["eu","Beaufort Passage",-144,71,"panzer_frosch_ii",5],["britannia","Halifax",0,0,"carrier_battleship",3],["britannia","St. John's",0,0,"carrier_battleship",3],["britannia","Vancouver",0,0,"carrier_battleship",3],["britannia","Churchill",0,0,"carrier_battleship",2],["britannia","Québec City",0,0,"portman_ii",3],["britannia","Sydney",0,0,"portman_ii",3],["britannia","Prince Rupert",0,0,"portman_ii",2],["britannia","Inuvik",0,0,"portman",2],["britannia","Corner Brook",0,0,"portman_ii",2]];
  const FUNDING={eu:{credits:1180,industry:670,science:90,sakuradite:46},britannia:{credits:1280,industry:730,science:92,sakuradite:48}};
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
  const MOUNTAINS=[[-125,53,8,6],[-122,57,7,6],[-129,61,7,5],[-116,50,7,4],[-114,60,7,7],[-63,52,4,5]];
  const FORESTS=[[-125,54,12,8],[-112,57,7,7],[-101,56,12,8],[-90,51,10,8],[-84,48,8,6],[-77,47,9,6],[-68,50,12,8],[-61,54,7,6]];
  const SHIELD=[[-87,53,17,10],[-79,55,11,8],[-95,57,12,7]];
  const RIVERS={"fraser":[[-122.75,53.9],[-121.4,52.1],[-121.7,50.7],[-122.6,49.2]],"mackenzie":[[-114.35,62.5],[-118,64],[-123,65.5],[-127.5,66.7],[-133.7,69.2]],"saskatchewan":[[-113.5,53.6],[-107.5,53.2],[-103.9,53.9],[-99.6,53.9],[-97.8,53.8]],"nelson":[[-97.2,53.9],[-96.1,55],[-94.9,56.8],[-92.8,57.1]],"ottawa":[[-78,46],[-76.4,45.7],[-75.7,45.4],[-73.6,45.5]],"stlawrence":[[-76.5,44.2],[-73.6,45.5],[-71.2,46.8],[-68.5,48.5],[-66,49.2]],"churchill":[[-104.7,56],[-100,56.3],[-97,56.6],[-94.2,58.8]]};
  const PRAIRIES=[[-107,52,12,4],[-105,50,9,3.7],[-97,50,8,3.6]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const m=density(p,MOUNTAINS),f=density(p,FORESTS),
      rock=density(p,SHIELD),prairie=density(p,PRAIRIES);
    if(m>.72&&prairie<.48)return 'mountain';
    if(p.lat>73)return 'plains';
    if(prairie>.43)return 'plains';
    if(m>.30||f>.41||rock>.62)return 'forest';
    return ((c*19+r*23)%41<9&&p.lat>50&&p.lat<67)?'forest':'plains';
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
  function create(player='eu',difficulty='normal',seed=201720){
    if(!SIDES.includes(player))throw Error('Unsupported Invasion of Canada faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
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
    g.scenario={id:ID,key:'canada',title:'Invasion of Canada',
      version:1,phase:'northern-multifront',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,operations:['Atlantic','Maritimes','Hudson','Labrador','Arctic','Transcontinental'],
      supplyCorridors:{atlantic:['St. John\'s','Corner Brook','Halifax','Moncton','Québec City','Montréal','Ottawa','Toronto'],hudson:['Kuujjuaq','Rankin Inlet','Churchill','Thompson','Winnipeg','Thunder Bay'],prairie:['Winnipeg','Regina','Saskatoon','Calgary','Edmonton','Vancouver'],arctic:['Pond Inlet','Resolute','Cambridge Bay','Inuvik','Yellowknife']}};
    // Only Britannia and Europia United are playable here.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia')),
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu'))
    };
    // GSHHS 20–80% coastal hex samples preserve Hudson Bay, Arctic islands,
    // the Atlantic approaches, Vancouver Island and the Great Lakes.
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),kind=COAST[i];
      return {c,r,owner:null,terrain:kind===0?'sea':kind===1?'coast':landscape(p,c,r),
        biome:kind&&p.lat>69?'tundra':kind&&p.lat>55?'taiga':null};
    });
    // Hydrographic straits narrower than a 196 x 112 strategic hex must not
    // become land bridges. These eight independently GSHHS-checked cells
    // correct Georgia Strait, Johnstone Strait, Fury and Hecla Strait,
    // Belle Isle Strait and Northumberland Strait. A fully land-covered
    // cell at Johnstone Strait represents both opposing shores at this scale.
    const STRAIT_WATER=[[42,91,1],[42,92,1],[41,92,1],
      [35,86,1],[37,87,2],[114,36,1],[166,84,1],
      [151,98,1],[153,99,1]];
    for(const [c,r,expected] of STRAIT_WATER){
      const i=r*COLS+c;
      if(COAST[i]!==expected)throw Error('Canadian strait source geometry changed');
      g.tiles[i].terrain='sea';
    }
    // Isolated lake pixels must not create unusable ocean ports. The Atlantic,
    // Labrador, Beaufort and Pacific basins are identifiable by their large
    // connected navigable water components; narrow freshwater basins are not.
    const ocean=new Uint8Array(g.tiles.length),visited=new Uint8Array(g.tiles.length);
    for(let i=0;i<g.tiles.length;i++){
      if(visited[i]||g.tiles[i].terrain!=='sea')continue;
      const q=[i];visited[i]=1;
      for(let k=0;k<q.length;k++)for(const n of E.adjacent(g,g.tiles[q[k]])){
        const j=n.r*COLS+n.c;
        if(n.terrain==='sea'&&!visited[j]){visited[j]=1;q.push(j);}
      }
      if(q.length>500)for(const j of q)ocean[j]=1;
    }
    const openWater=t=>t.terrain==='sea'&&ocean[t.r*COLS+t.c]===1;
    const taken=new Set();
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>openWater(n)&&!taken.has(E.key(n))))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),16);
      if(!at)throw Error('Cannot place Canadian city '+name);
      const capital=name==='Ottawa'||name==='Nuuk';
      const shield=name==='Ottawa'?650:name==='Toronto'||name==='Montréal'?540:
        fort?390:120+60*tier;
      const city={id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.45),
        industry:Math.round((capital?25:6*tier)*.45),
        science:Math.max(1,Math.round((1+tier)*.45)),producedTurn:0};
      if(coastal){
        const berth=E.adjacent(g,at).filter(n=>openWater(n)&&!taken.has(E.key(n)))
          .sort((a,b)=>E.adjacent(g,b).filter(v=>v.terrain==='sea').length-
            E.adjacent(g,a).filter(v=>v.terrain==='sea').length)[0];
        if(!berth)throw Error('Port reservation failed for '+name);
        city.portAt={c:berth.c,r:berth.r};city.portLevel=PORTS[name];city.portOwner=owner;
        taken.add(E.key(berth));
      }
      g.stations.push(city);
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
      if(side==='eu'&&!['Nuuk','Sisimiut','Ilulissat','Qaqortoq','Iqaluit','Pond Inlet'].includes(name))continue; // E.U. expedition embarks offshore.
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
      if(!E.TYPES[type]?.naval)throw Error('Invalid Canada fleet type '+type);
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
    // Embark all five E.U. expeditionary Army Groups before turn one.
    const carriers=g.units.filter(u=>u.side==='eu'&&E.TYPES[u.type].naval==='ship');
    const passengers=[];
    for(const [side,name,cls,count,commander] of ARMY_GROUPS){
      if(side!=='eu'||['Nuuk','Sisimiut','Ilulissat','Qaqortoq','Iqaluit','Pond Inlet'].includes(name))continue;
      for(let i=0;i<count;i++){
        const ship=carriers.find(v=>v.invasionGroup===name&&
          (v.pendingPassengers||0)<E.TYPES[v.type].capacity);
        if(!ship)throw Error('Not enough carrier capacity in '+name);
        ship.pendingPassengers=(ship.pendingPassengers||0)+1;
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,ship.c,ship.r,i===0?2:1,cmd);
        u.invasionGroup=name; // Persistent operational front after unloading.
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
    // Do not remove deep ocean: Atlantic and Northwest Passage fleets must retain
    // their actual routes without granting vessels movement over inland land.
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
    E.log(g,'Europia United strikes from Greenland, the Atlantic, Hudson Strait and the Beaufort Sea, confronting Britannia across Canada.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Canada theatre cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||
       g.stations.length!==CITIES.length)return null;
    // The E.U. expedition stays in play while any of its units survive, carried ones included.
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side)&&
      (side==='eu'||!E.allUnits(g).some(u=>u.side==='eu'&&u.hp>0)))
      return {winner:side,team:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Canadian theatre.'};
    return null;
  }
  const api={id:ID,title:'Invasion of Canada',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,rivers:RIVERS,create,onTurn,
    objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,overlays:['regionalRivers']},
    elite:true,expeditionSide:'eu',
    ai:{operationalAxes:{invader:'eu',defender:'britannia',
    // Each E.U. carrier army's route of supply hubs, in order.
    axes:{
      'Atlantic Vanguard':["St. John's",'Gander','Corner Brook','Sydney','Halifax','Québec City','Montréal','Ottawa'],
      'Maritime Assault':['Halifax','Saint John','Sydney','Moncton','Fredericton','Québec City','Montréal','Ottawa'],
      'Hudson Strait Force':['Kuujjuaq','Rankin Inlet','Churchill','Thompson','Winnipeg','Thunder Bay','Regina'],
      'Labrador Pincer':['Happy Valley-Goose Bay','Labrador City','Sept-Îles','Baie-Comeau','Saguenay','Québec City','Montréal'],
      'Beaufort Passage':['Tuktoyaktuk','Inuvik','Norman Wells','Yellowknife','Fort McMurray','Edmonton','Calgary','Vancouver']
    },
    // Britannian counterattacks concentrate on these arterial cities.
    defenderHubs:['Halifax','Québec City','Montréal','Ottawa','Toronto',
      'Winnipeg','Regina','Calgary','Edmonton','Vancouver','Churchill']}},
    text:{
      era:"Canada · Alternate 2017",
      intro:"Following Greenland, Europia United launches coordinated naval and northern invasions against Britannian Canada. All 74 theatre cities must fall; no turn limit.",
      diplomacy:"Two hostile powers. Five amphibious invasion axes and continental defense with independently capturable ports and no scripted deadline.",
      elite:"Elite Canada uses established single-frame Elite Forces and veteran enemy commanders. Carriers remain conventional; all faction mechanics are unchanged.",
      focus:{
        eu:"Iqaluit",
        britannia:"Ottawa"
      }
    },
    blurbs:{
      eu:"Command six northern footholds and launch five carrier-led invasions from the Atlantic, Hudson Strait, Labrador Sea and Arctic. Seize ports, then converge on the industrial heartland.",
      britannia:"Hold Canada's fortified ports, prairie supply routes, Rocky Mountain passes and Great Lakes industrial network. Move reserves between threatened fronts."
    }};
  E.scenarios={...(E.scenarios||{}),canada:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

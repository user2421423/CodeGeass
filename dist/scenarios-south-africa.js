/* Invasion of South Africa — Britannia's carrier-borne attack on E.U. southern Africa.
   144 x 108 WGS84-aligned theatre, GSHHG intermediate coastline coverage:
   S <20% land, C 20–80% mixed, L >80% land. E.U. owns every city on turn one.
   No scripted deadline; no changes to faction unit stats or generic AI. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=144,ROWS=108,SIDES=['britannia','eu'];
  const BOUNDS={west:10.5,east:39.5,north:-18,south:-38};
  const K=Math.cos(28*Math.PI/180);
  const PROJECTION={centerLon:25,centerLat:-28,angle:0,uMin:-14.5*K,uMax:14.5*K,vMin:-10,vMax:10};
  // Source: GSHHG intermediate-resolution clipped to these geographic bounds.
  // Each row stores transitions between sea, mixed coastline and inland land.
  const COAST_ROWS=`6,7,131,132;6,7,129,130;7,8,129,130;7,9,128,129;9,10,127,129;9,10,125,126;10,11,124,125;10,11,123,124;11,12,122,124;11,12,120,122;12,13,120,121;12,13,119,120;13,14,120,121;13,14,119,120;14,15,121,122;13,15,121,122;15,16,121,123;15,16,121,122;16,17,122,123;16,17,122,123;17,18,123,124;17,18,122,123;18,19,123,124;18,19,123,124;19,20,124,125;19,20,123,124;19,20,124,125;18,20,123,124;19,20,124,125;19,20,123,124;19,20,123,124;19,20,123,124;19,20,124,125;19,20,123,124;20,21,123,124;19,21,121,122;21,22,120,121;20,21,116,118;21,22,114,116;20,21,112,113;21,22,111,112;21,22,110,111;21,22,110,111;21,22,109,110;22,23,110,112;22,23,110,111;22,24,111,112;22,23,110,111;23,24,111,112;23,24,110,111;23,24,110,111;24,25,109,110;25,26,109,110;25,26,109,110;26,27,109,110;26,28,108,109;28,29,108,109;29,30,107,108;30,31,106,108;30,31,104,106;31,32,104,105;31,32,102,104;32,33,102,103;32,33,101,102;32,33,101,102;32,33,100,101;33,34,100,101;33,34,99,100;34,35,99,100;34,35,98,99;35,36,97,98;35,36,96,97;37,38,95,97;37,38,94,95;38,39,93,94;38,39,92,93;38,39,91,92;38,39,90,91;38,39,89,90;36,38,87,89;36,37,87,88;36,37,85,86;37,38,84,85;38,39,82,83;39,40,80,82;38,40,74,75;38,40,58,68,71,76;38,39,40,41,56,57,69,71;42,44,51,57;43,44,48,49;45,48;;;;;;;;;;;;;;;;;`.split(';').map(s=>s?s.split(',').map(Number):[]);
  function coastCoverageClass(c,r){
    const changes=COAST_ROWS[r];let phase=0;
    for(const x of changes){if(c<x)break;phase++;}
    if(r===86)return [0,1,2,1,2,1,0][phase];
    if(r===87)return [0,1,0,1,2,1,0,1,0][phase];
    if(changes.length===2)return [0,1,0][phase];
    return [0,1,2,1,0][phase]||0;
  }
  const CITIES=[["Cape Town",18.424,-33.925,"eu",3,true],["Johannesburg",28.045,-26.205,"eu",3,true],["Pretoria",28.188,-25.747,"eu",3,true],["Durban",31.021,-29.858,"eu",3,true],["Gqeberha",25.603,-33.96,"eu",3,true],["East London",27.911,-33.015,"eu",2,true],["Bloemfontein",26.215,-29.116,"eu",3,true],["Kimberley",24.762,-28.729,"eu",2,false],["Polokwane",29.448,-23.904,"eu",2,true],["Mbombela",30.987,-25.467,"eu",2,false],["Rustenburg",27.244,-25.667,"eu",2,false],["Potchefstroom",27.099,-26.714,"eu",2,false],["eMalahleni",29.194,-25.872,"eu",2,false],["Ladysmith",29.778,-28.558,"eu",2,false],["Newcastle",29.933,-27.759,"eu",2,false],["Pietermaritzburg",30.379,-29.61,"eu",2,false],["Richards Bay",32.057,-28.78,"eu",2,true],["Port Shepstone",30.454,-30.741,"eu",2,false],["George",22.462,-33.963,"eu",2,false],["Mossel Bay",22.15,-34.183,"eu",2,true],["Saldanha Bay",17.945,-33.022,"eu",2,true],["Stellenbosch",18.861,-33.935,"eu",2,false],["Worcester",19.448,-33.645,"eu",2,false],["Upington",21.257,-28.458,"eu",2,false],["Springbok",17.886,-29.665,"eu",2,false],["Port Nolloth",16.866,-29.251,"eu",2,true],["De Aar",24.012,-30.65,"eu",2,false],["Beaufort West",22.583,-32.356,"eu",2,false],["Mthatha",28.784,-31.588,"eu",2,false],["Komani",26.882,-31.898,"eu",2,false],["Makhanda",26.527,-33.307,"eu",2,false],["Secunda",29.167,-26.517,"eu",2,false],["Windhoek",17.083,-22.56,"eu",3,true],["Walvis Bay",14.505,-22.958,"eu",3,true],["Swakopmund",14.526,-22.678,"eu",2,false],["Luderitz",15.16,-26.648,"eu",2,true],["Keetmanshoop",18.129,-26.575,"eu",2,false],["Gaborone",25.913,-24.658,"eu",3,true],["Francistown",27.507,-21.17,"eu",2,false],["Maun",23.419,-19.984,"eu",2,false],["Bulawayo",28.582,-20.154,"eu",2,true],["Maseru",27.483,-29.317,"eu",2,false],["Mbabane",31.14,-26.325,"eu",2,false],["Maputo",32.588,-25.969,"eu",3,true],["Xai-Xai",33.644,-25.05,"eu",2,true],["Inhambane",35.383,-23.865,"eu",2,false],["Vilankulo",35.323,-22,"eu",2,false]];
  const ARMY_GROUPS=[["britannia","Cape Approaches","heavy",2,"cornelia"],["britannia","Cape Approaches","rocket",2,"cecile"],["britannia","Cape Approaches","assault",2,"suzaku"],["britannia","Agulhas Force","heavy",2,"bismarck"],["britannia","Agulhas Force","siege",2,"guilford"],["britannia","Agulhas Force","medium",2,"gino"],["britannia","Indian Ocean Force","heavy",2,"jeremiah"],["britannia","Indian Ocean Force","assault",2,"villetta"],["britannia","Indian Ocean Force","rocket",2,"darlton"],["britannia","Namibian Flank","heavy",2,"oldrin"],["britannia","Namibian Flank","medium",2,null],["britannia","Namibian Flank","assault",2,null],["eu","Cape Town","heavy",3,"leila"],["eu","Cape Town","rocket",2,"yukiya"],["eu","Saldanha Bay","medium",2,"anna"],["eu","Gqeberha","heavy",3,"akito"],["eu","Gqeberha","rocket",2,"ryo"],["eu","East London","medium",2,"ayano"],["eu","Durban","heavy",3,"smilas"],["eu","Durban","rocket",2,"oscar"],["eu","Richards Bay","medium",2,"klaus"],["eu","Maputo","heavy",3,"olivia"],["eu","Maputo","rocket",2,null],["eu","Walvis Bay","heavy",3,"pierre"],["eu","Walvis Bay","rocket",2,null],["eu","Luderitz","medium",2,null],["eu","Windhoek","heavy",3,"margaret"],["eu","Johannesburg","heavy",3,null],["eu","Johannesburg","rocket",2,null],["eu","Pretoria","heavy",3,null],["eu","Bloemfontein","heavy",3,null],["eu","Kimberley","medium",2,null],["eu","Polokwane","medium",2,null],["eu","Gaborone","medium",3,null],["eu","Bulawayo","rocket",2,null],["eu","Maseru","light",2,null],["eu","Springbok","medium",2,null],["eu","Pietermaritzburg","medium",2,null],["eu","Mbombela","assault",2,null]];
  const PORTS={"Cape Town":3,"Saldanha Bay":3,"Mossel Bay":2,"Gqeberha":3,"East London":2,"Durban":3,"Richards Bay":3,"Port Shepstone":2,"Walvis Bay":3,"Swakopmund":2,"Luderitz":3,"Port Nolloth":2,"Maputo":3,"Xai-Xai":2,"Inhambane":2,"Vilankulo":2};
  const FLEETS=[["britannia","Cape Approaches",16.3,-36.7,"carrier_battleship",3],["britannia","Agulhas Force",24.1,-36.8,"carrier_battleship",3],["britannia","Indian Ocean Force",37,-30.2,"carrier_battleship",3],["britannia","Namibian Flank",11.6,-27.2,"carrier_battleship",3],["britannia","Cape Approaches",16.3,-36.7,"portman_ii",5],["britannia","Agulhas Force",24.1,-36.8,"portman_ii",5],["britannia","Indian Ocean Force",37,-30.2,"portman_ii",5],["britannia","Namibian Flank",11.6,-27.2,"portman_ii",4],["eu","Cape Town",null,null,"eu_carrier",2],["eu","Durban",null,null,"eu_carrier",2],["eu","Walvis Bay",null,null,"eu_carrier",1],["eu","Maputo",null,null,"eu_carrier",1],["eu","Gqeberha",null,null,"panzer_frosch_ii",3],["eu","East London",null,null,"panzer_frosch",2],["eu","Richards Bay",null,null,"panzer_frosch_ii",3],["eu","Saldanha Bay",null,null,"panzer_frosch_ii",2],["eu","Luderitz",null,null,"panzer_frosch",2],["eu","Xai-Xai",null,null,"panzer_frosch_ii",2]];
  const FUNDING={britannia:{credits:825,industry:460,science:65,sakuradite:30},eu:{credits:850,industry:520,science:75,sakuradite:35}};
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
  // Escarpment, Drakensberg, Cape Fold Belt, Namib and Kalahari.
  const MOUNTAINS=[[29,-29.5,2.5,3.2],[29.6,-28.3,1.8,2.4],[26.7,-31.8,3.4,1.4],[21,-33.1,3.8,1.1],[30.5,-25,2.0,1.5]];
  const FORESTS=[[31.4,-29,2.3,3.0],[30.5,-25,2.7,2.2],[25.5,-33.9,3.4,1.3],[18.9,-34,1.6,1.5],[35.3,-23.4,1.7,3.7]];
  const DESERTS=[[15.5,-25.9,2.9,5.2],[22,-24.3,4.9,4.3],[20.8,-29,3.3,2.3]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p){
    const m=density(p,MOUNTAINS),f=density(p,FORESTS),d=density(p,DESERTS);
    if(m>.60)return 'mountain';
    if(f>.49)return 'forest';
    if(d>.42)return 'desert';
    return m>.28||f>.30?'forest':'plains';
  }
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
  function create(player='britannia',difficulty='normal',seed=201717){
    if(!SIDES.includes(player))throw Error('Unsupported Invasion of South Africa faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'invasion-south-africa',order:[player,...SIDES.filter(s=>s!==player)],
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
    g.scenario={id:'invasion-south-africa',key:'southAfrica',title:'Invasion of South Africa',
      version:2,phase:'southern-africa-amphibious',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,citylessFunding:['britannia']};
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
      return {c,r,owner:null,terrain:fraction===0?'sea':
        fraction===1?'coast':landscape(p)};
    });
    const excludedLand=new Uint8Array(g.tiles.length);
    // Audit connectivity: a ship may use sea and mixed-coast cells only.
    // No artificial inland waterways or shortcuts across African land.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place European city '+name);
      const capital=name==='Johannesburg';
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
      if(side==='britannia')continue; // Load troops into offshore carriers below.
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
      const s=side==='eu'?g.stations.find(v=>v.name===name):null;
      const anchor=s||locate(lon,lat);
      if(!E.TYPES[type]?.naval)throw Error('Invalid South Africa fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,anchor,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),18);
        if(!at)throw Error('Cannot deploy navy at '+name);
        const ship=E.newUnit(g,type,side,at.c,at.r);
        if(side==='britannia')ship.invasionGroup=name;
        fleet.units.push(ship.id);
      }
      g.scenario.groups.push(fleet);
    }
    // Load all 24 Britannian land formations into offshore carriers before turn one.
    const carriers=g.units.filter(u=>u.side==='britannia'&&E.TYPES[u.type].naval==='ship');
    const passengers=[];
    for(const [side,name,cls,count,commander] of ARMY_GROUPS){
      if(side!=='britannia')continue;
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
    // Keep all four Atlantic, Cape and Indian Ocean invasion corridors navigable.
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
    E.log(g,'Britannia begins without mainland cities, launching four carrier-led offensives against E.U.-controlled southern Africa.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    const euCities=g.stations.filter(s=>s.owner==='eu').length;
    const britCities=g.stations.filter(s=>s.owner==='britannia').length;
    const afloat=g.units.filter(u=>u.side==='britannia'&&u.hp>0).length;
    return side==='eu'
      ? 'Hold the coast and destroy Britannia’s expedition ('+afloat+' hostile units afloat; '+britCities+' occupied cities).'
      : 'Land troops from carriers and conquer all '+CITIES.length+' cities ('+euCities+' E.U. cities remain).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='invasion-south-africa'||
       g.stations.length!==CITIES.length)return null;
    const eu=g.stations.some(s=>s.owner==='eu');
    const britCities=g.stations.some(s=>s.owner==='britannia');
    const britUnits=g.units.some(u=>u.side==='britannia'&&u.hp>0);
    if(!eu)return {winner:'britannia',team:'britannia',
      reason:'Britannia has conquered every E.U. city in southern Africa.'};
    if(!britCities&&!britUnits)return {winner:'eu',team:'eu',
      reason:'Europia United has destroyed every invading Britannian formation.'};
    return null;
  }
  const api={id:'invasion-south-africa',title:'Invasion of South Africa',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true},
    elite:true,expeditionSide:'britannia',
    text:{
      era:"Southern Africa · Alternate 2017",
      intro:"Four Britannian carrier groups attack E.U.-controlled southern Africa from the Atlantic and Indian Oceans. Britannia owns no cities at the start.",
      diplomacy:"Only Britannia and Europia United are at war. No turn limit: conquer every enemy city or eliminate the invading expedition.",
      elite:"Elite South Africa: eligible Lv.1 Elite Forces replace transported land formations; enemy named commanders begin at Lv.3. Carriers and fleet escorts remain conventional.",
      focus:{
        britannia:"",
        eu:"Cape Town"
      }
    },
    blurbs:{
      britannia:"Begin without cities. Land carrier-borne Knightmares at the Cape, along the southern coast, in KwaZulu-Natal or Namibia; seize ports before pushing inland.",
      eu:"Hold all mainland cities, ports and industrial corridors. Intercept the carrier fleets, defend beaches and counterattack seized harbours."
    }};
  E.scenarios={...(E.scenarios||{}),southAfrica:api,
    byId:{...(E.scenarios?.byId||{}),'invasion-south-africa':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

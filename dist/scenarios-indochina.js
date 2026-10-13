/* The Conquest of Indochina — alternate-2017 Chinese southward invasion of Britannian Southeast Asia.
   120 × 104 regional theatre, GSHHS landmask, standard combat and conquest victory. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=120,ROWS=104,SIDES=['britannia','cf'];
  const BOUNDS={west:96.2,east:117.2,north:27,south:7.5};
  const K=Math.cos(17.25*Math.PI/180);
  const PROJECTION={centerLon:106.7,centerLat:17.25,angle:0,uMin:-10.5*K,uMax:10.5*K,vMin:-9.75,vMax:9.75};
  // Military formations and factories are alternate history. Coordinates are real locations.
  const CITIES=[["Guangzhou",113.26,23.13,"cf",3,true],["Nanning",108.32,22.82,"cf",3,true],["Kunming",102.83,25.04,"cf",3,true],["Liuzhou",109.41,24.33,"cf",2],["Beihai",109.12,21.48,"cf",2],["Fangchenggang",108.35,21.62,"cf",2],["Baise",106.62,23.9,"cf",2],["Wenshan",104.24,23.37,"cf",2],["Mengzi",103.39,23.37,"cf",2],["Jinghong",100.8,22.01,"cf",1],["Hanoi",105.83,21.03,"cf",3,true],["Haiphong",106.68,20.86,"cf",2,true],["Lao Cai",103.97,22.49,"cf",2],["Lang Son",106.76,21.85,"cf",2],["Cao Bang",106.25,22.66,"cf",1],["Dien Bien Phu",103.02,21.39,"cf",2],["Phongsali",102.1,21.68,"cf",1],["Luang Prabang",102.13,19.89,"cf",2],["Haikou",110.35,20.02,"cf",2],["Sanya",109.51,18.25,"cf",2],["Vinh",105.69,18.68,"britannia",2,true],["Dong Hoi",106.6,17.46,"britannia",2],["Hue",107.59,16.46,"britannia",2,true],["Da Nang",108.22,16.05,"britannia",3,true],["Quy Nhon",109.22,13.78,"britannia",2],["Nha Trang",109.2,12.24,"britannia",2],["Da Lat",108.44,11.94,"britannia",2],["Ho Chi Minh City",106.7,10.82,"britannia",3,true],["Can Tho",105.78,10.04,"britannia",2],["Vientiane",102.62,17.97,"britannia",3,true],["Thakhek",104.83,17.4,"britannia",2],["Savannakhet",104.75,16.55,"britannia",2],["Pakse",105.78,15.12,"britannia",2],["Phnom Penh",104.92,11.56,"britannia",3,true],["Siem Reap",103.86,13.36,"britannia",2],["Battambang",103.2,13.1,"britannia",2],["Sihanoukville",103.5,10.63,"britannia",2],["Bangkok",100.5,13.75,"britannia",3,true],["Chiang Mai",98.99,18.79,"britannia",2],["Chiang Rai",99.83,19.91,"britannia",2],["Khon Kaen",102.83,16.43,"britannia",2],["Udon Thani",102.79,17.41,"britannia",2],["Nakhon Ratchasima",102.1,14.97,"britannia",2],["Trat",102.51,12.24,"britannia",1]];
  const ARMY_GROUPS=[["cf","Nanning","heavy",4,"xingke"],["cf","Nanning","assault",3,"cao"],["cf","Nanning","rocket",2,"honggu"],["cf","Hanoi","medium",4,"xianglin"],["cf","Hanoi","assault",3,"chengzhong"],["cf","Hanoi","siege",2],["cf","Haiphong","assault",2],["cf","Lang Son","medium",3],["cf","Lao Cai","medium",2],["cf","Dien Bien Phu","heavy",3,"ren"],["cf","Dien Bien Phu","light",2],["cf","Luang Prabang","assault",3,"chaojielun"],["cf","Phongsali","scout",2],["cf","Kunming","heavy",3],["cf","Kunming","rocket",2],["cf","Wenshan","medium",3],["cf","Mengzi","support",2],["cf","Baise","raider",2],["cf","Guangzhou","medium",2],["britannia","Vinh","heavy",4,"cornelia"],["britannia","Vinh","rocket",2,"cecile"],["britannia","Vinh","assault",2],["britannia","Dong Hoi","medium",3,"guilford"],["britannia","Hue","heavy",3,"darlton"],["britannia","Hue","support",2],["britannia","Da Nang","assault",3,"suzaku"],["britannia","Da Nang","rocket",2],["britannia","Vientiane","heavy",4,"bismarck"],["britannia","Vientiane","medium",2],["britannia","Thakhek","medium",3,"villetta"],["britannia","Savannakhet","assault",2],["britannia","Chiang Mai","medium",3,"oldrin"],["britannia","Chiang Rai","scout",2],["britannia","Khon Kaen","medium",2],["britannia","Udon Thani","light",2],["britannia","Bangkok","heavy",3,"jeremiah"],["britannia","Bangkok","rocket",2],["britannia","Phnom Penh","medium",3],["britannia","Ho Chi Minh City","heavy",2,"kewell"],["britannia","Nha Trang","light",2]];
  const PORTS={"Beihai":2,"Fangchenggang":2,"Haiphong":3,"Haikou":2,"Sanya":2,"Dong Hoi":1,"Da Nang":3,"Quy Nhon":2,"Nha Trang":2,"Ho Chi Minh City":3,"Can Tho":1,"Sihanoukville":2,"Bangkok":3,"Trat":1};
  const FLEETS=[["britannia","Da Nang","carrier_battleship",2],["britannia","Ho Chi Minh City","carrier_battleship",2],["britannia","Sihanoukville","carrier_battleship",1],["britannia","Bangkok","carrier_battleship",1],["britannia","Nha Trang","carrier_battleship",1],["britannia","Da Nang","portman_ii",3],["britannia","Ho Chi Minh City","portman_ii",3],["britannia","Bangkok","portman",2],["britannia","Quy Nhon","portman",2],["cf","Haiphong","cf_carrier",1],["cf","Beihai","cf_carrier",1],["cf","Haikou","cf_carrier",1],["cf","Haiphong","shui_gun_ru_ii",2],["cf","Sanya","shui_gun_ru",2]];
  const FUNDING={"britannia":{"credits":560,"industry":300,"science":56,"sakuradite":26},"cf":{"credits":535,"industry":315,"science":54,"sakuradite":23}};
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
  const MOUNTAINS=[[103.8,24.5,2.3,1.7],[105.1,21.5,1.1,1.6],[105.1,19.1,.9,2.4],[106.8,16.5,.75,2.3],[107.3,13.8,1.05,2.6],[99.6,19,1.5,3.1],[101,21.8,1.4,2.1]];
  const FORESTS=[[103.3,18.9,2.4,3.7],[106.3,14.9,3,3],[104.2,12.3,2.6,2],[98.9,16.4,1.4,3.8]];
  const LOWLANDS=[[105.9,21,.9,.65],[106.6,10.7,1.6,1.1],[104.9,11.6,1.5,1.2],[102.8,17.6,.65,2.5],[105.6,15.5,.9,2]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS),river=density(p,LOWLANDS);
    return river>.67?'plains':mountain>.63?'mountain':
      mountain>.29||forest>.53||((c*29+r*17)%31<4&&p.lat>16)
        ?'forest':'plains';
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
  function create(player='eu',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported Indochina faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'indochina',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'conquest-indochina',key:'indochina',title:'The Conquest of Indochina',
      phase:'southward-invasion',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
      rivers:{Mekong:[[100.3,21.3],[101.8,19.9],[102.7,18.1],[104.7,16.6],[105.1,15.5],[105.8,13.8],[105.1,11.6],[106.6,10.1]],Red:[[103.8,22.4],[104.8,21.6],[105.9,21],[106.8,20.8]]}};
    // Britannia uses compatible Britannian Elite Forces for this
    // scenario only. No global HQ, Conquest, or Japan access is changed.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      cf:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('cf')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    // Sea routes remain unrestricted across the strait and the entire
    // Kamchatka–Aleutian flank, rather than stopping five hexes offshore.
    const packed=root.INDOCHINA_LAND_BITS || (typeof require==='function'?
      require('./indochina-landmask.js'):null);
    const bits=typeof packed==='string'?packed:root.INDOCHINA_LAND_BITS;
    if(!bits)throw Error('Indochina shoreline mask was not loaded');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/8)throw Error('Indochina shoreline mask is corrupt');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const land=!!(raw.charCodeAt(i>>3)&(128>>(i&7)));
      return {c,r,owner:null,terrain:land?landscape(p,c,r):'sea'};
    });
    for(const t of g.tiles)if(t.terrain!=='sea'&&
      E.adjacent(g,t).some(n=>n.terrain==='sea'))t.terrain='coast';
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Indochina city '+name);
      const capital=name==='Bangkok'||name==='Nanning';
      const shield=fort?400:120+60*tier;
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
        industry:Math.round((capital?25:6*tier)*.55),
        science:Math.round((1+tier)*.55),producedTurn:0});
      if(at.terrain!=='coast')at.terrain='plains';
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
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side)throw Error('Invalid staging city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),10);
        if(!at)throw Error('Cannot deploy unit at '+name);
        const cmd=i===0?commander:null;
        const stack=i===0?3:2;
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
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!E.TYPES[type]?.naval)throw Error('Invalid Indochina fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),10);
        if(!at)throw Error('Cannot deploy navy at '+name);
        fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
      }
      g.scenario.groups.push(fleet);
    }
    // The entire connected regional sea stays navigable for fleets.
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const factor=side===player?1:['challenge','elite'].includes(difficulty)?1.6:
        difficulty==='hard'?1.3:1;
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n*factor)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*2;
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>v!==player))
        for(const [i,u] of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval).entries())
          if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'The Chinese Federation pushes south along the Red River and Lao mountain passes. Britannia commands the coast and southern plains.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Indochina theatre cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='conquest-indochina'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Indochina theatre.'};
    return null;
  }
  const api={id:'conquest-indochina',title:'The Conquest of Indochina',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  E.scenarios={...(E.scenarios||{}),indochina:api,
    byId:{...(E.scenarios?.byId||{}),'conquest-indochina':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

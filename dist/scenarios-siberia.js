/* Invasion of Siberia — 2017 alternate-history continental campaign.
   160 × 88 GSHHG-sampled regional theatre across Siberia and the Russian Far East.
   All enemy cities must fall; no scripted deadlines or changes to shared unit balance. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=160,ROWS=88,SIDES=['britannia','eu'];
  const BOUNDS={west:55,east:180,north:79,south:47};
  const K=Math.cos(63*Math.PI/180);
  const PROJECTION={centerLon:117.5,centerLat:63,angle:0,uMin:-62.5*K,uMax:62.5*K,vMin:-16,vMax:16};
  // Military formations and factories are alternate history. Coordinates are real locations.
  const CITIES=[["Anadyr",177.5,64.73,"britannia",3,true],["Pevek",170.3,69.7,"britannia",2,true],["Bilibino",166.45,68.05,"britannia",2,false],["Magadan",150.8,59.56,"britannia",3,true],["Susuman",148.15,62.78,"britannia",2,false],["Ust-Nera",143.2,64.57,"britannia",2,false],["Oymyakon",142.8,63.46,"britannia",2,false],["Okhotsk",143.24,59.36,"britannia",2,true],["Petropavlovsk-Kamchatsky",158.65,53.02,"britannia",3,true],["Ust-Kamchatsk",162.54,56.22,"britannia",2,false],["Palana",159.83,59.08,"britannia",2,false],["Tomtor",143.08,63.27,"britannia",1,false],["Ust-Maya",134.56,60.42,"britannia",3,true],["Yakutsk",129.73,62.04,"eu",3,true],["Khandyga",135.6,62.65,"eu",3,true],["Aldan",125.4,58.61,"eu",3,true],["Neryungri",124.73,56.66,"eu",2,true],["Verkhoyansk",133.39,67.55,"eu",2,true],["Tiksi",128.87,71.64,"eu",2,true],["Mirny",113.98,62.54,"eu",3,true],["Lensk",114.91,60.73,"eu",2,false],["Olekminsk",120.41,60.38,"eu",2,false],["Vilyuysk",121.63,63.75,"eu",2,false],["Zhigansk",123.38,66.77,"eu",1,false],["Udachny",112.29,66.43,"eu",2,false],["Norilsk",88.2,69.35,"eu",3,true],["Dudinka",86.18,69.4,"eu",2,true],["Turukhansk",87.96,65.79,"eu",2,false],["Tura",100.43,64.27,"eu",2,false],["Vanavara",102.28,60.35,"eu",1,false],["Bratsk",101.61,56.15,"eu",3,true],["Ust-Ilimsk",102.66,58,"eu",2,false],["Irkutsk",104.29,52.29,"eu",3,true],["Ulan-Ude",107.58,51.83,"eu",2,false],["Severobaikalsk",109.32,55.63,"eu",2,false],["Krasnoyarsk",92.87,56.02,"eu",3,true],["Kansk",95.7,56.2,"eu",2,false],["Achinsk",90.5,56.27,"eu",2,false],["Abakan",91.44,53.72,"eu",2,false],["Novosibirsk",82.92,55.03,"eu",3,true],["Tomsk",84.95,56.48,"eu",3,true],["Kemerovo",86.08,55.35,"eu",2,false],["Omsk",73.37,54.99,"eu",3,true],["Tobolsk",68.25,58.2,"eu",2,false],["Surgut",73.4,61.25,"eu",3,true],["Nizhnevartovsk",76.55,60.94,"eu",2,false],["Khanty-Mansiysk",69.02,61,"eu",2,false],["Yeniseysk",92.17,58.45,"eu",2,false],["Dikson",80.55,73.5,"eu",2,true]];
  const ARMY_GROUPS=[["britannia","Ust-Maya","heavy",4,"cornelia"],["britannia","Ust-Maya","rocket",3,"cecile"],["britannia","Ust-Maya","assault",3,"guilford"],["britannia","Oymyakon","medium",3,"gino"],["britannia","Oymyakon","raider",2,"villetta"],["britannia","Magadan","heavy",3,"bismarck"],["britannia","Magadan","siege",2,"darlton"],["britannia","Magadan","medium",2,null],["britannia","Okhotsk","assault",2,"jeremiah"],["britannia","Susuman","medium",2,"oldrin"],["britannia","Ust-Nera","rocket",2,null],["britannia","Pevek","medium",2,"suzaku"],["britannia","Anadyr","assault",2,null],["britannia","Bilibino","medium",2,null],["britannia","Petropavlovsk-Kamchatsky","medium",2,null],["eu","Khandyga","heavy",4,"akito"],["eu","Khandyga","rocket",3,"yukiya"],["eu","Khandyga","assault",3,"ryo"],["eu","Yakutsk","heavy",4,"ayano"],["eu","Yakutsk","siege",2,"smilas"],["eu","Yakutsk","medium",2,"leila"],["eu","Verkhoyansk","medium",3,"klaus"],["eu","Aldan","heavy",3,"oscar"],["eu","Aldan","rocket",2,null],["eu","Neryungri","assault",3,"fernando"],["eu","Mirny","heavy",3,"olivia"],["eu","Mirny","support",2,"anna"],["eu","Tiksi","medium",2,null],["eu","Irkutsk","heavy",3,"marirrosa"],["eu","Irkutsk","rocket",2,null],["eu","Krasnoyarsk","heavy",3,null],["eu","Krasnoyarsk","siege",2,null],["eu","Novosibirsk","medium",3,null],["eu","Omsk","medium",2,null],["eu","Norilsk","assault",2,null],["eu","Bratsk","medium",2,null],["eu","Surgut","raider",2,null],["britannia","Ust-Maya","heavy",4,null],["britannia","Ust-Maya","rocket",3,null],["britannia","Ust-Maya","support",2,null],["britannia","Tomtor","assault",3,null]];
  const PORTS={"Anadyr":3,"Pevek":2,"Magadan":3,"Okhotsk":2,"Petropavlovsk-Kamchatsky":3,"Ust-Kamchatsk":2,"Palana":2,"Tiksi":3,"Dikson":2};
  const FLEETS=[["britannia","Magadan","carrier_battleship",2],["britannia","Petropavlovsk-Kamchatsky","carrier_battleship",2],["britannia","Anadyr","carrier_battleship",1],["britannia","Pevek","portman_ii",2],["britannia","Okhotsk","portman_ii",2],["britannia","Ust-Kamchatsk","portman",1],["eu","Tiksi","eu_carrier",2],["eu","Dikson","eu_carrier",1],["eu","Tiksi","panzer_frosch_ii",2],["eu","Dikson","panzer_frosch",2]];
  const FUNDING={britannia:{credits:650,industry:380,science:60,sakuradite:36},
    eu:{credits:600,industry:360,science:58,sakuradite:34}};
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
  // Altai/Sayan, Baikal, Stanovoy, Verkhoyansk, Chersky and Kamchatka ranges.
  const MOUNTAINS=[[87,51.5,4,2],[94,52.2,6,3],[109,54,5,3],[124,55.5,6,2.5],
    [135,66,5,5],[147,66,9,5],[160,57,4,5],[141,61,3,4]];
  const FORESTS=[[84,59,17,6],[104,58,20,6],[123,59,10,6],
    [144,60,8,5],[93,55,13,4],[110,53,8,3]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS);
    if(mountain>.65)return 'mountain';
    if(p.lat>=70)return 'plains'; // tundra uses traversable plains; no new global terrain type.
    if(mountain>.33||forest>.40)return 'forest';
    return ((c*29+r*17)%31<4&&p.lat>58&&p.lat<68)?'forest':'plains';
  }
  // Rivers are geographic underlays: keep shared movement rules, avoid invented sea crossings.
  const RIVERS={
    lena:[[107.6,53.9],[114.5,59.8],[121.5,63.7],[126.0,67.2],[125.5,71.4],[127.5,72.5]],
    yenisei:[[92.5,53.7],[92.9,56.0],[92.2,58.5],[90.1,63.1],[87.3,66.5],[82.9,71.6]],
    ob:[[82.9,55.0],[79.2,57.2],[74.5,61.1],[70.1,65.2],[66.9,67.3]],
    irtysh:[[73.4,55.0],[71.1,56.8],[68.2,58.2],[67.8,60.5]],
    angara:[[104.3,52.3],[103,55],[101.6,56.2],[98,57.0],[92.9,58.2]],
    amur:[[124,50.2],[133.0,48.5],[140.0,49.3]]
  };
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
    if(!SIDES.includes(player))throw Error('Unsupported Invasion of Siberia faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'britannia-siberia',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'britannia-siberia',key:'siberia',title:'Invasion of Siberia',
      phase:'continental-offensive',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS};
    // Britannia uses compatible Britannian Elite Forces for this
    // scenario only. No global HQ, Conquest, or Japan access is changed.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    // Sea routes remain unrestricted across the strait and the entire
    // Kamchatka–Aleutian flank, rather than stopping five hexes offshore.
    const geographic=root.SIBERIA_GEOGRAPHY || (typeof require==='function'?
      require('./siberia-landmask.js'):null);
    const bits=geographic?.bits;
    const mixed=geographic?.mixed;
    if(!bits||!mixed)throw Error('Siberia shoreline masks were not loaded');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    const coastal=typeof atob==='function'?atob(mixed):Buffer.from(mixed,'base64').toString('latin1');
    if(raw.length!==COLS*ROWS/8||coastal.length!==raw.length)
      throw Error('Siberia shoreline mask is corrupt');
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      const land=!!(raw.charCodeAt(i>>3)&(128>>(i&7)));
      const mixedCoast=!!(coastal.charCodeAt(i>>3)&(128>>(i&7)));
      return {c,r,owner:null,terrain:land?(mixedCoast?'coast':landscape(p,c,r)):'sea',
        biome:land&&p.lat>69?'tundra':land&&p.lat>62?'taiga':null};
    });
    // The 19-point geographic mixed-coast mask is authoritative. Do not
    // turn fully dry land into coast merely because the next tile is sea.
    // This previously promoted 320 additional non-mixed land hexes.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Siberia city '+name);
      const capital=name==='Magadan'||name==='Yakutsk'||name==='Novosibirsk';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
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
      if(!E.TYPES[type]?.naval)throw Error('Invalid Siberia fleet type '+type);
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
    E.log(g,'Britannia attacks west from eastern Siberian footholds toward the Lena, Yenisei and Trans-Siberian railway, while E.U. field armies defend the interior.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Siberian theatre cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='britannia-siberia'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in Siberia.'};
    return null;
  }
  const api={id:'britannia-siberia',title:'Invasion of Siberia',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,ports:PORTS,rivers:RIVERS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,overlays:['regionalRivers']},
    elite:true,
    text:{
      era:"Siberia · Alternate 2017",
      intro:"Following the Bering Strait victory, Britannia attacks west from Russian Far Eastern footholds. Capture every one of 49 Siberian cities to win.",
      diplomacy:"Britannia and Europia United are hostile from turn 1. No F.L.E.I.J.A., scripted alliances or turn limit.",
      elite:"Elite Siberia uses the established Elite Force conversion, rival veteran commanders and scenario research rules. No global faction unit changes.",
      focus:{
        britannia:"Ust-Maya",
        eu:"Yakutsk"
      }
    },
    blurbs:{
      britannia:"Launch the great westward offensive from Magadan, Oymyakon and Ust-Maya. Break E.U. defenses on the Lena and drive for the Trans-Siberian railway.",
      eu:"Defend Yakutsk and Khandyga, protect the industrial railway hubs, preserve mobile reserves and counterattack Britannian columns."
    }};
  E.scenarios={...(E.scenarios||{}),siberia:api,
    byId:{...(E.scenarios?.byId||{}),'britannia-siberia':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

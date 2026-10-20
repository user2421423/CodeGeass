/* Crossing the Urals — alternate-history continental scenario.
   City coordinates and the curving Ural watershed are geographic; political control is fictional.
   The six named passes offer lower-cost alternatives to mountain hexes. */
(function(root) {
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const COLS=120,ROWS=90,SIDES=['britannia','eu'];
const BOUNDS={west:51,east:75,north:67,south:49};
const PROJECTION={centerLon:63,centerLat:58,angle:0,uMin:-12*Math.cos(58*Math.PI/180),
uMax:12*Math.cos(58*Math.PI/180),vMin:-9,vMax:9};
const CITIES=[["Tyumen",65.53,57.15,"britannia",3,1],["Tobolsk",68.25,58.2,"britannia",2,0],["Ishim",69.46,56.11,"britannia",2,0],["Kurgan",65.34,55.44,"britannia",3,1],["Shadrinsk",63.63,56.09,"britannia",2,0],["Yekaterinburg",60.61,56.84,"britannia",3,1],["Chelyabinsk",61.4,55.16,"britannia",3,1],["Kamensk-Uralsky",61.94,56.4,"britannia",2,0],["Pervouralsk",59.94,56.91,"britannia",2,0],["Nevyansk",60.22,57.49,"britannia",2,0],["Nizhny Tagil",59.96,57.91,"britannia",3,1],["Verkhnyaya Salda",60.55,58.05,"britannia",2,0],["Troitsk",61.56,54.09,"britannia",2,0],["Yugorsk",63.33,61.31,"britannia",2,0],["Khanty-Mansiysk",69.02,61,"britannia",2,0],["Surgut",73.4,61.25,"britannia",3,0],["Nyagan",65.39,62.14,"britannia",2,0],["Perm",56.25,58.01,"eu",3,1],["Ufa",55.97,54.74,"eu",3,1],["Izhevsk",53.2,56.85,"eu",3,1],["Solikamsk",56.77,59.64,"eu",2,1],["Berezniki",56.8,59.41,"eu",2,0],["Chusovoy",57.82,58.29,"eu",2,1],["Kungur",56.94,57.43,"eu",2,1],["Lysva",57.81,58.1,"eu",2,0],["Krasnovishersk",57.08,60.41,"eu",2,0],["Serov",60.58,59.61,"eu",2,1],["Ivdel",60.42,60.69,"eu",2,1],["Zlatoust",59.66,55.17,"eu",2,1],["Miass",60.11,55.05,"eu",2,1],["Beloretsk",58.4,53.97,"eu",2,1],["Magnitogorsk",58.98,53.39,"eu",3,1],["Sterlitamak",55.93,53.63,"eu",2,0],["Orenburg",55.1,51.77,"eu",3,0],["Orsk",58.57,51.2,"eu",2,0],["Neftekamsk",54.25,56.08,"eu",2,0],["Sarapul",53.8,56.47,"eu",2,0],["Ukhta",53.7,63.56,"eu",2,0],["Pechora",57.22,65.13,"eu",2,1],["Inta",60.17,66.03,"eu",2,1]];
const ARMY_GROUPS=[["britannia","Tyumen","heavy",4,"cornelia"],["britannia","Tyumen","rocket",2,"cecile"],["britannia","Yekaterinburg","heavy",5,"suzaku"],["britannia","Yekaterinburg","assault",4,"guilford"],["britannia","Yekaterinburg","siege",2],["britannia","Chelyabinsk","heavy",4,"bismarck"],["britannia","Chelyabinsk","rocket",3,"gino"],["britannia","Chelyabinsk","raider",2,"villetta"],["britannia","Kurgan","medium",5,"darlton"],["britannia","Kurgan","assault",3,"oldrin"],["britannia","Nizhny Tagil","medium",4,"jeremiah"],["britannia","Nizhny Tagil","support",2],["britannia","Yugorsk","medium",3,"kewell"],["britannia","Yugorsk","rocket",2],["britannia","Shadrinsk","light",3],["britannia","Tobolsk","light",3],["eu","Perm","heavy",5,"akito"],["eu","Perm","rocket",3,"yukiya"],["eu","Perm","support",2,"anna"],["eu","Ufa","heavy",5,"leila"],["eu","Ufa","assault",4,"ryo"],["eu","Ufa","rocket",2],["eu","Izhevsk","heavy",4,"ayano"],["eu","Izhevsk","siege",2,"smilas"],["eu","Chusovoy","medium",4,"oscar"],["eu","Chusovoy","rocket",2],["eu","Kungur","medium",3,"olivia"],["eu","Kungur","support",2],["eu","Zlatoust","heavy",3,"fernando"],["eu","Zlatoust","siege",2],["eu","Miass","assault",4,"klaus"],["eu","Miass","support",2],["eu","Beloretsk","medium",3,"eduardo"],["eu","Magnitogorsk","heavy",3,"margaret"],["eu","Serov","medium",3,"pierre"],["eu","Ivdel","medium",3],["eu","Solikamsk","light",3],["eu","Inta","light",2],["eu","Orenburg","medium",3],["eu","Sterlitamak","assault",3]];
const FUNDING={britannia:{credits:610,industry:385,science:57,sakuradite:31},
eu:{credits:640,industry:415,science:58,sakuradite:29}};
const MOUNTAIN_PASSES=[["Chusovoy–Yekaterinburg",59.35,56.98,0.35],["Perm–Nizhny Tagil",59,57.82,0.3],["Zlatoust–Chelyabinsk",59.75,55.17,0.38],["Beloretsk corridor",58.9,53.9,0.36],["Serov–Ivdel road",60.3,60.13,0.34],["Pechora–Inta northern route",61.5,65.5,0.38]];
const SUPPLY_CORRIDORS=[["Trans-Siberian railway",["Perm","Kungur","Pervouralsk","Yekaterinburg","Kamensk-Uralsky","Tyumen"]],["Southern industrial road",["Ufa","Beloretsk","Zlatoust","Miass","Chelyabinsk","Kurgan"]],["Northern supply axis",["Solikamsk","Serov","Ivdel","Yugorsk","Nyagan"]]];
const RIVERS={"Kama":[[56.1,60.8],[56.65,59.83],[56.42,59.15],[56.25,58.03],[55.9,57.35],[54.9,56.83]],"Chusovaya":[[59.9,57],[59.2,57.4],[58.4,57.91],[57.82,58.28],[56.65,58.05]],"Belaya":[[58.5,53.6],[57.6,53.95],[56,54.74],[55.5,55.25],[54.1,55.8]],"Ural":[[58.55,51.55],[57,51.3],[55.1,51.77],[54.5,52.4]],"Iset":[[60.8,56.8],[62.2,56.35],[64.4,56.12],[65.2,55.65]],"Tobol":[[61.4,54.1],[63.1,54.9],[65.3,55.45],[67,56.6],[68.25,58.2]],"Tura":[[60.7,58.05],[61.9,57.65],[63.3,57.5],[65.53,57.15]],"Pechora":[[60.9,65.4],[59.35,65.1],[57.22,65.13],[55.6,65.7]]};
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,
Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
(lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};}
function nearest(g,p,valid,radius=10){return E.nearestTile(g,p,valid,radius);}
function ridgeLongitude(lat){return lat<54?58.6+(lat-53)*.20:
lat<59?58.8+(lat-54)*.23:lat<63?59.95+(lat-59)*.38:61.47+(lat-63)*.62;}
function landscape(p,c,r){
const ridge=Math.abs(p.lon-ridgeLongitude(p.lat));
const valley=MOUNTAIN_PASSES.some(([,x,y,w])=>Math.abs(p.lat-y)<w&&Math.abs(p.lon-x)<1.65);
if(ridge<1.10&&p.lat>52.4&&!valley)return 'mountain';
const wooded=p.lat>60||(p.lat>55.5&&p.lon<61.8)||(p.lat>54&&p.lon>62.5&&p.lon<69.5);
if(ridge<2.2||(wooded&&(c*19+r*11)%13<10))return 'forest';
return 'plains';
}
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
function create(player='britannia',difficulty='normal',seed=201701){
if(!SIDES.includes(player))throw Error('Unsupported Urals faction: '+player);
if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'crossing-urals',order:[player,...SIDES.filter(s=>s!==player)],
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
    g.scenario={id:'crossing-urals',key:'urals',title:'Crossing the Urals',
      phase:'mountain-offensive',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,aiDoctrine:'europe',rivers:RIVERS,mountainPasses:MOUNTAIN_PASSES,supplyCorridors:SUPPLY_CORRIDORS};
    // Britannia uses compatible Britannian Elite Forces for this
    // scenario only. No global HQ, Conquest, or Japan access is changed.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    // Continental theatre; no fake water or impassable land cutoff.
g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
const c=i%COLS,r=(i/COLS)|0;return {c,r,owner:null,terrain:landscape(geo(c,r),c,r)};});
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
!g.stations.some(s=>s.c===t.c&&s.r===t.r),10);
      if(!at)throw Error('Cannot place Urals city '+name);
      const capital=name==='Tyumen'||name==='Perm';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
        industry:Math.round((capital?25:6*tier)*.55),
        science:Math.round((1+tier)*.55),producedTurn:0});
      at.terrain='plains';
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
    E.log(g,'Britannia drives west across the Urals against E.U. industrial fortresses and mountain defense lines.',player);
return g;
}
function onTurn(){return false;}
function strategicScore(g,side){return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);}
function objective(g,side=g.player){return 'Conquer all '+CITIES.length+' Urals cities ('+
g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';}
function winner(g){if(g.mode!=='scenario'||g.scenario?.id!=='crossing-urals'||g.stations.length!==CITIES.length)return null;
for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
return {winner:side,reason:E.FACTIONS[side].name+' controls every city across the Urals.'};
return null;}
const api={id:'crossing-urals',title:'Crossing the Urals',cols:COLS,rows:ROWS,
sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,mountainPasses:MOUNTAIN_PASSES,
supplyCorridors:SUPPLY_CORRIDORS,rivers:RIVERS,create,onTurn,objective,winner,strategicScore,orderGroup,locate,geo};
api.meta={terrainCosts:{mountain:2},map:{centreSampled:true,overlays:['uralsRivers']},
  elite:true,
  text:{terrain:'Mountains cost 2 movement; plains and marked passes cost 1. Float units ignore the extra terrain cost.',
    era:"The Urals · Alternate 2017",
    intro:"Britannia advances from Siberia into E.U.-held industrial Russia. Capture every city without a turn limit.",
    diplomacy:"Both sides are hostile from the start. Routes through the mountains are slower except at named valleys.",
    elite:"Elite Urals uses the existing land Elite Force conversion, rival commanders and difficulty scaling.",
    focus:{
      britannia:"Yekaterinburg",
      eu:"Perm"
    }
  },
  blurbs:{
    britannia:"Drive west from Yekaterinburg and Chelyabinsk through the mountain pass corridors.",
    eu:"Hold Perm, Ufa and the defended industrial passes; counterattack eastern spearheads."
  }};
E.scenarios={...(E.scenarios||{}),urals:api,byId:{...(E.scenarios?.byId||{}),'crossing-urals':api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

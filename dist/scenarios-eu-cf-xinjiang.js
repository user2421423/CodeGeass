/* Battle for Xinjiang — E.U. invasion from Kazakhstan, 2017 alternate history.
   Coordinates anchor Kazakhstan and Xinjiang cities; terrain is an explicitly
   approximate, traversable Tianshan/Altai/Kunlun relief model with real passes.
   Inland lakes are blocked hexes, never artificial naval shipping lanes. */
(function(root) {
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='eu-cf-xinjiang';
const COLS=144,ROWS=96,SIDES=['eu','cf'];
const BOUNDS={west:73,east:96.5,north:50.3,south:35.6};
const PROJECTION={centerLon:84.75,centerLat:42.95,angle:0,
 uMin:-11.75*Math.cos(43*Math.PI/180),uMax:11.75*Math.cos(43*Math.PI/180),vMin:-7.35,vMax:7.35};
const CITIES=[["Almaty",76.95,43.24,"eu",3,1],["Konaev",77.06,43.88,"eu",3,1],["Talgar",77.23,43.29,"eu",2,0],["Saryozek",77.97,44.36,"eu",2,0],["Taldykorgan",78.38,45.02,"eu",3,1],["Tekeli",78.82,44.83,"eu",2,0],["Zharkent",80,44.17,"eu",3,1],["Khorgos (KZ)",80.39,44.21,"eu",3,1],["Kegen",79.22,43.02,"eu",2,0],["Narynkol",80.17,42.72,"eu",2,0],["Sarkand",79.92,45.41,"eu",2,0],["Lepsy",80.62,45.52,"eu",2,0],["Usharal",80.94,46.16,"eu",2,0],["Dostyk",82.47,45.25,"eu",3,1],["Makanchi",82.14,46.77,"eu",2,0],["Urzhar",81.61,47.11,"eu",2,0],["Ayagoz",80.43,47.97,"eu",3,1],["Zaysan",84.87,47.47,"eu",3,1],["Balkhash",74.98,46.85,"eu",3,1],["Alashankou",82.56,45.17,"cf",3,1],["Bole",82.07,44.9,"cf",3,1],["Jinghe",82.89,44.6,"cf",2,1],["Horgos (CN)",80.41,44.21,"cf",3,1],["Huocheng",80.88,44.06,"cf",2,0],["Yining",81.32,43.92,"cf",3,1],["Chabuchar",81.15,43.84,"cf",2,0],["Gongliu",82.23,43.49,"cf",2,0],["Zhaosu",81.13,43.15,"cf",2,1],["Tekes",81.84,43.22,"cf",2,0],["Nileke",82.51,43.8,"cf",2,0],["Tacheng",82.98,46.75,"cf",3,1],["Emin",83.62,46.52,"cf",2,0],["Yumin",82.98,46.2,"cf",2,0],["Jimunai",85.88,47.44,"cf",2,1],["Habahe",86.42,48.06,"cf",2,0],["Burqin",86.87,47.7,"cf",2,0],["Altay",88.14,47.85,"cf",3,1],["Fuhai",87.49,47.11,"cf",2,0],["Beitun",87.83,47.35,"cf",3,0],["Karamay",84.87,45.58,"cf",3,1],["Wusu",84.68,44.43,"cf",2,0],["Kuytun",84.9,44.43,"cf",3,1],["Dushanzi",84.88,44.33,"cf",3,1],["Shihezi",86.04,44.31,"cf",3,1],["Changji",87.3,44.02,"cf",3,1],["Ürümqi",87.62,43.82,"cf",3,1],["Fukang",87.95,44.16,"cf",2,1],["Qitai",89.59,44.02,"cf",2,0],["Turpan",89.19,42.95,"cf",3,1],["Shanshan",90.22,42.87,"cf",2,0],["Hami",93.52,42.83,"cf",3,1],["Korla",86.15,41.76,"cf",3,1],["Yanqi",86.57,42.06,"cf",2,0],["Hejing",86.4,42.31,"cf",2,1],["Kuqa",82.96,41.72,"cf",3,1],["Baicheng",81.88,41.8,"cf",2,0],["Aksu",80.26,41.17,"cf",3,1],["Wensu",80.24,41.28,"cf",2,0],["Kalpin",78.57,40.51,"cf",2,0],["Maralbexi",78.54,39.8,"cf",2,0],["Artux",76.17,39.72,"cf",2,0],["Kashgar",75.99,39.47,"cf",3,1],["Yarkand",77.25,38.41,"cf",3,1],["Tashkurgan",75.23,37.77,"cf",2,1],["Hotan",79.92,37.11,"cf",3,1],["Minfeng",82.69,37.07,"cf",2,0],["Qiemo",85.53,38.15,"cf",2,0],["Ruoqiang",88.17,39.02,"cf",2,0],["Aral",81.28,40.55,"cf",2,0],["Yuli",86.25,41.35,"cf",2,0]];
const ARMY_GROUPS=[["eu","Dostyk","Dzungarian Gate Army","heavy",12,"akito"],["eu","Dostyk","Dzungarian Gate Army","rocket",9,"yukiya"],["eu","Dostyk","Dzungarian Gate Army","assault",8,"ryo"],["eu","Usharal","Northern Steppe Corps","heavy",8,"oscar"],["eu","Usharal","Northern Steppe Corps","medium",6,null],["eu","Ayagoz","Northern Steppe Corps","rocket",6,"smilas"],["eu","Zaysan","Altai Expedition","heavy",10,"fernando"],["eu","Zaysan","Altai Expedition","raider",8,"klaus"],["eu","Zaysan","Altai Expedition","rocket",4,null],["eu","Zharkent","Ili Valley Army","heavy",12,"leila"],["eu","Zharkent","Ili Valley Army","assault",9,"ayano"],["eu","Khorgos (KZ)","Ili Valley Army","rocket",9,"anna"],["eu","Khorgos (KZ)","Ili Valley Army","medium",6,null],["eu","Kegen","Tianshan Mountain Corps","heavy",7,"margaret"],["eu","Narynkol","Tianshan Mountain Corps","assault",7,null],["eu","Kegen","Tianshan Mountain Corps","siege",6,null],["eu","Taldykorgan","Western Strategic Reserve","heavy",7,"olivia"],["eu","Almaty","Western Strategic Reserve","rocket",5,null],["eu","Konaev","Western Strategic Reserve","support",3,null],["eu","Balkhash","Logistics Defense","medium",4,null],["cf","Alashankou","Dzungarian Gate Guard","heavy",5,"gaohai"],["cf","Alashankou","Dzungarian Gate Guard","rocket",4,null],["cf","Bole","Dzungarian Gate Guard","assault",4,null],["cf","Yining","Ili Defense Command","heavy",6,"honggu"],["cf","Yining","Ili Defense Command","rocket",4,"cao"],["cf","Horgos (CN)","Ili Defense Command","assault",4,null],["cf","Tacheng","Northern Border Corps","heavy",5,"zhaohao"],["cf","Emin","Northern Border Corps","medium",3,null],["cf","Jimunai","Altai Frontier Army","heavy",4,"leifeng"],["cf","Altay","Altai Frontier Army","rocket",4,null],["cf","Karamay","Dzungarian Mobile Reserve","heavy",5,"meiling"],["cf","Karamay","Dzungarian Mobile Reserve","raider",4,null],["cf","Kuytun","Central Railway Defense","heavy",5,"huangqian"],["cf","Shihezi","Central Railway Defense","rocket",4,null],["cf","Dushanzi","Tianshan Pass Guard","heavy",5,"chengzhong"],["cf","Dushanzi","Tianshan Pass Guard","siege",3,null],["cf","Nileke","Tianshan Pass Guard","assault",3,null],["cf","Ürümqi","Ürümqi Capital Army","heavy",6,"xingke"],["cf","Ürümqi","Ürümqi Capital Army","rocket",5,"xianglin"],["cf","Changji","Ürümqi Capital Army","medium",5,null],["cf","Turpan","Eastern Counterattack Command","heavy",3,"rakshata"],["cf","Hami","Eastern Counterattack Command","medium",4,null],["cf","Korla","Tarim Basin Defense","heavy",4,"lifeng"],["cf","Korla","Tarim Basin Defense","rocket",4,null],["cf","Kuqa","Tarim Basin Defense","medium",4,null],["cf","Aksu","Southern Mountain Guard","heavy",4,"indira"],["cf","Aksu","Southern Mountain Guard","siege",3,null],["cf","Kashgar","Kashgar Regional Reserve","heavy",3,null],["cf","Hotan","Kashgar Regional Reserve","medium",3,null]];
const FUNDING={eu:{credits:1140,industry:665,science:96,sakuradite:57},
 cf:{credits:1120,industry:690,science:101,sakuradite:60}};
const MOUNTAIN_PASSES=[["Dzungarian Gate / Alashankou",82.52,45.2,0.46],["Horgos crossing",80.42,44.2,0.37],["Jimunai–Zaysan gap",85.85,47.43,0.55],["Ili River valley",81.45,43.87,0.48],["Duku / Tianshan Highway",84.45,42.95,0.48],["Muzart historical pass",80.92,42.3,0.33],["Turpan Basin gap",88.8,43.02,0.45],["Tekes valley approach",81.9,43.24,0.42],["Northern Alatau foothills",82.2,45.85,0.38]];
const SUPPLY_CORRIDORS=[["Dzungarian Gate",["Dostyk","Alashankou","Jinghe","Kuytun","Shihezi","Ürümqi"]],["Ili Corridor",["Zharkent","Khorgos (KZ)","Horgos (CN)","Yining","Gongliu","Nileke","Kuytun"]],["Altai Frontier",["Zaysan","Jimunai","Burqin","Altay","Karamay"]],["Tianshan South",["Yining","Zhaosu","Tekes","Kuqa","Aksu","Korla"]],["Duku Highway",["Dushanzi","Kuqa","Korla"]],["Tarim Ring",["Aksu","Kashgar","Yarkand","Hotan","Qiemo","Ruoqiang","Korla"]]];
const ROADS={"Dzungarian Gate":[[82.47,45.25],[82.56,45.17],[82.89,44.6],[84.68,44.43],[86.04,44.31],[87.62,43.82]],"Ili corridor":[[80,44.17],[80.41,44.21],[80.89,44.06],[81.32,43.92],[82.23,43.49],[82.51,43.8],[84.9,44.43]],"Altai route":[[84.87,47.47],[85.88,47.44],[86.87,47.7],[88.14,47.85],[87.49,47.11],[84.87,45.58]],"Duku Highway":[[84.88,44.33],[84.52,43.47],[84.45,42.95],[83.68,42.3],[82.96,41.72]],"Tarim northern rim":[[75.99,39.47],[78.54,39.8],[80.26,41.17],[81.88,41.8],[82.96,41.72],[86.15,41.76],[89.19,42.95]],"Tarim southern rim":[[75.99,39.47],[77.25,38.41],[79.92,37.11],[82.69,37.07],[85.53,38.15],[88.17,39.02],[86.15,41.76]],"Historical Muzart route":[[81.32,43.92],[81.13,43.15],[80.92,42.3],[80.26,41.17]]};
const RIVERS={"Ili":[[79.4,43.34],[80.33,43.93],[81.32,43.92],[82.23,43.49],[82.64,44.22],[82.47,45.25]],"Tarim":[[80.2,41.1],[81.3,40.55],[83.2,40.7],[85,40.85],[87.7,40.3],[89.2,40.1]],"Irtysh":[[88,47.7],[87.15,47.6],[86.3,47.8],[85,47.6],[84,48.2]],"Kaqun":[[76,39.45],[77.2,39],[79,39.5]],"Kaidu":[[85.9,42.2],[86.7,42.1],[86.7,41.8],[86.15,41.76]]};
const OPERATIONAL_FRONTS=[{"name":"Dzungarian Gate","attack":"eu","from":"Dostyk","route":["Alashankou","Jinghe","Kuytun","Shihezi","Ürümqi"]},{"name":"Ili Valley","attack":"eu","from":"Zharkent","route":["Horgos (CN)","Yining","Nileke","Dushanzi","Ürümqi"]},{"name":"Altai Frontier","attack":"eu","from":"Zaysan","route":["Jimunai","Burqin","Altay","Karamay"]},{"name":"Tianshan South","attack":"eu","from":"Narynkol","route":["Zhaosu","Tekes","Kuqa","Aksu","Korla"]},{"name":"Dzungarian Counterattack","attack":"cf","from":"Bole","route":["Dostyk","Usharal","Ayagoz"]},{"name":"Ili Counterattack","attack":"cf","from":"Yining","route":["Khorgos (KZ)","Zharkent","Taldykorgan","Almaty"]},{"name":"Altai Counterattack","attack":"cf","from":"Jimunai","route":["Zaysan","Ayagoz"]},{"name":"Southern Counterattack","attack":"cf","from":"Aksu","route":["Narynkol","Kegen","Almaty"]}];
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,
Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
(lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};}
function nearest(g,p,valid,radius=10){return E.nearestTile(g,p,valid,radius);}
// Relief follows the Tianshan, Altai, Dzungarian Alatau, Kunlun and Pamir arcs.
const LAKES=[["Lake Balkhash",[[73.03,46.12],[73.45,46.4],[74.5,46.56],[75.4,46.57],[76.8,46.38],[78.5,46.19],[79.5,46.13],[78.5,45.86],[77.2,46.02],[75.5,45.92],[74.1,46.02]]],["Lake Alakol",[[81.25,46.28],[81.53,46.36],[81.94,46.32],[82.14,46.08],[82.03,45.82],[81.55,45.77],[81.27,45.93]]],["Lake Issyk-Kul",[[76.13,42.33],[76.25,42.6],[77.25,42.68],[78.2,42.59],[78.3,42.37],[77.4,42.28]]]];
function inLake(p,poly){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a[1]>p.lat)!==(b[1]>p.lat)&&
     p.lon<(b[0]-a[0])*(p.lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
const RANGES=[
 {width:.72,points:[[77.0,42.9],[79.2,42.7],[81.1,42.65],[83.4,42.9],[85.6,43.15],[88.2,43.40],[91,43.75]]},
 {width:.65,points:[[84.5,48.8],[86.6,48.55],[88.6,48.3],[91.0,47.8],[93.0,47.6]]},
 {width:.57,points:[[78.2,45.2],[79.8,45.4],[81.2,45.7],[82.4,45.95],[83.3,46.25]]},
 {width:.82,points:[[74.3,38.1],[75.0,37.9],[77.8,36.6],[80.3,36.35],[83.0,36.3],[86.0,36.8],[88.8,37.1],[91.0,37.8]]},
 {width:.68,points:[[74.2,40.9],[75.1,39.0],[76.2,38.0],[77.2,37.3]]}
];
function segDistance(p,a,b){
 const k=Math.cos(p.lat*Math.PI/180);
 const x=(p.lon-a[0])*k,y=p.lat-a[1],dx=(b[0]-a[0])*k,dy=b[1]-a[1];
 const t=Math.max(0,Math.min(1,(x*dx+y*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(x-t*dx,y-t*dy);
}
function lineDistance(p,line){
 let d=Infinity;for(let i=1;i<line.length;i++)d=Math.min(d,segDistance(p,line[i-1],line[i]));
 return d;
}
function landscape(p,c,r){
 // Block water outright: no sea tiles, transports or floating ports.
 if(LAKES.some(([,poly])=>inLake(p,poly)))return 'peak';
 const pass=MOUNTAIN_PASSES.some(([,x,y,w])=>
   Math.hypot((p.lon-x)*Math.cos(p.lat*Math.PI/180),p.lat-y)<w);
 const road=Object.values(ROADS).some(route=>lineDistance(p,route)<.17);
 const ridge=RANGES.some(range=>lineDistance(p,range.points)<range.width);
 const foothill=RANGES.some(range=>lineDistance(p,range.points)<range.width+.38);
 const taklamakan=((p.lon-83.0)/7.4)**2+((p.lat-39.0)/2.55)**2<1;
 const gurbantunggut=((p.lon-87.7)/3.0)**2+((p.lat-45.8)/1.20)**2<1;
 const kumtag=((p.lon-92.0)/2.75)**2+((p.lat-40.5)/1.45)**2<1;
 // Clear road-width corridors without eliminating surrounding defensive ridges.
 if(pass||road)return 'plains';
 if(ridge)return 'mountain';
 if(foothill)return 'forest';
 if(taklamakan||gurbantunggut||kumtag)return 'desert';
 return p.lat>47.7&&((c*17+r*13)%19)<2?'forest':'plains';
}
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
function create(player='eu',difficulty='normal',seed=201701){
if(!SIDES.includes(player))throw Error('Unsupported Xinjiang faction: '+player);
if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'eu-cf-xinjiang',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{cf:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,
      factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'eu-cf-xinjiang',key:'xinjiang',title:'Battle for Xinjiang',version:1,
      phase:'mountain-offensive',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,aiDoctrine:'europe',rivers:RIVERS,mountainPasses:MOUNTAIN_PASSES,
      supplyCorridors:SUPPLY_CORRIDORS,roads:ROADS,operationalFronts:OPERATIONAL_FRONTS};
    // Per-side roster filtering preserves faction-specific Elite Forces.
    // No changes to global HQ, Conquest, rewards or research rules.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu')),
      cf:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('cf'))
    };
    // Continental theatre; no fake water or impassable land cutoff.
g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
const c=i%COLS,r=(i/COLS)|0;return {c,r,owner:null,terrain:landscape(geo(c,r),c,r)};});
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
!g.stations.some(s=>s.c===t.c&&s.r===t.r),10);
      if(!at)throw Error('Cannot place Xinjiang city '+name);
      const capital=name==='Ürümqi'||name==='Almaty';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
        industry:Math.round((capital?25:6*tier)*.55),
        science:Math.round((1+tier)*.55),producedTurn:0});
      at.terrain='plains'; // inhabited oasis, road hub or highland settlement
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
    function group(side,label,name){
      const k=side+':'+label;
      if(!groupByCity.has(k)){
        const gr={id:'army-'+groupByCity.size,side,name:label,origin:name,units:[]};
        groupByCity.set(k,gr);g.scenario.groups.push(gr);
      }
      return groupByCity.get(k);
    }
    for(const [side,name,label,cls,count,commander] of ARMY_GROUPS){
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side)throw Error('Invalid staging city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),14);
        if(!at)throw Error('Cannot deploy unit at '+name);
        const cmd=i===0?commander:null;
        const stack=i===0?3:2;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,label,name).units.push(u.id);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*2;
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>v!==player))
        for(const u of g.units.filter(v=>v.side===side&&!E.TYPES[v.type].naval))
          E.addDifficultyFrames(u,difficulty);
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'E.U. armies enter Xinjiang from Kazakhstan through the Dzungarian Gate, Ili Valley, Altai frontier and southern Tianshan corridors. The Federation defends Ürümqi and Tarim oases.',player);
return g;
}
function onTurn(){return false;}
function strategicScore(g,side){return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);}
function objective(g,side=g.player){return 'Capture all '+CITIES.length+' Kazakhstan–Xinjiang theatre cities ('+
g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';}
function winner(g){if(g.mode!=='scenario'||g.scenario?.id!=='eu-cf-xinjiang'||g.stations.length!==CITIES.length)return null;
for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
return {winner:side,reason:E.FACTIONS[side].name+' has captured all Kazakhstan–Xinjiang theatre cities.'};
return null;}
function paintRelief(ctx,g,{R,SQ,left,right,top,bottom}){
 if(g.scenario?.id!==ID)return;
 const sx=SQ*R*g.cols/(BOUNDS.east-BOUNDS.west),sy=1.5*R*g.rows/(BOUNDS.north-BOUNDS.south);
 const xy=([lon,lat])=>[R-SQ*R*.5+(lon-BOUNDS.west)*sx,R-.75*R+(BOUNDS.north-lat)*sy];
 ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
 for(const [,poly] of LAKES){
  ctx.beginPath();poly.forEach((p,i)=>{const [x,y]=xy(p);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();
  ctx.fillStyle='rgba(46,107,137,.86)';ctx.fill();
  ctx.strokeStyle='rgba(177,221,222,.6)';ctx.lineWidth=Math.max(.7,R*.1);ctx.stroke();
 }
 ctx.restore();
}
const api={id:ID,title:'Battle for Xinjiang',cols:COLS,rows:ROWS,
sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,mountainPasses:MOUNTAIN_PASSES,
supplyCorridors:SUPPLY_CORRIDORS,rivers:RIVERS,roads:ROADS,operationalFronts:OPERATIONAL_FRONTS,lakes:LAKES,paintRelief,create,onTurn,objective,winner,strategicScore,orderGroup,locate,geo};
api.meta={
  terrainCosts:{mountain:2},map:{centreSampled:true,overlays:['regionalRivers'],overviewMarkers:true},
  elite:true,saveVersion:1,
  ai:{doctrine:'europe',recovery:true,routeBias:'eu'},
  text:{
    terrain:'Mountain hexes cost 2 movement; marked passes and roads are traversable. Deserts cause normal desert attrition; blocked lake hexes cannot be crossed, and there are no naval ports.',
    era:'Xinjiang and eastern Kazakhstan · Alternate 2017',
    intro:'Europia United launches a four-axis invasion from Kazakhstan. Break through the Dzungarian Gate, Ili Valley and northern Altai while forcing the Tianshan passes. Capture all '+CITIES.length+' cities with no turn limit.',
    diplomacy:'Only the E.U. and Chinese Federation fight. Kazakhstan is E.U.-held staging territory, while the Federation controls Xinjiang. Every remaining enemy city counts.',
    elite:'Faction-specific E.U. and Federation Elite Forces, research, upgraded rival commanders and standard rewards remain in force.',
    focus:{eu:'Dostyk',cf:'Ürümqi'}
  },
  blurbs:{
    eu:'Attack through Alashankou and Horgos, probe the Altai, then seize Ürümqi and circle the Tarim Basin. Preserve industry and logistics through deserts.',
    cf:'Hold the Dzungarian and Ili border gates, use Tianshan passes to concentrate reserves, then counterattack Kazakhstan while protecting Tarim oases.'
  }
};
E.scenarios={...(E.scenarios||{}),euCfXinjiang:api,byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

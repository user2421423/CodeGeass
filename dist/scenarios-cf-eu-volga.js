/* Chinese Federation vs E.U. — Battle for the Volga (cf-eu-volga).
  Real river crossings, Northern Caspian seaports, industrial cities;
  playable Chinese Federation and E.U.; victory only by total conquest. */
(function(root){
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  const ID='cf-eu-volga', KEY='cfEuVolga';
  const COLS=164,ROWS=112,SIDES=['cf','eu'];
  const BOUNDS={west:40.5,east:60.7,north:59.15,south:42.15};
  const K=Math.cos(50.65*Math.PI/180);
  const PROJECTION={centerLon:50.6,centerLat:50.65,angle:0,
    uMin:-10.1*K,uMax:10.1*K,vMin:-8.5,vMax:8.5};
// All real-world positions are WGS84; faction borders are alternate history.
  const CITIES=[["Stavropol",41.97,45.04,"cf",3,true],["Georgiyevsk",43.47,44.15,"cf",2,false],["Budennovsk",44.16,44.79,"cf",2,true],["Makhachkala",47.5,42.97,"cf",3,true],["Kaspiysk",47.64,42.88,"cf",2,false],["Khasavyurt",46.59,43.25,"cf",2,false],["Kizlyar",46.71,43.85,"cf",2,true],["Elista",44.27,46.31,"cf",3,true],["Yashkul",45.34,46.17,"cf",2,false],["Lagan",47.37,45.39,"cf",2,true],["Divnoye",43.35,45.91,"cf",2,false],["Salsk",41.54,46.48,"cf",3,true],["Kotelnikovo",43.15,47.63,"cf",2,true],["Zimovniki",42.02,47.15,"cf",2,false],["Remontnoye",43.67,46.56,"cf",2,false],["Orenburg",55.1,51.77,"cf",3,true],["Orsk",58.57,51.23,"cf",3,true],["Sol-Iletsk",54.99,51.16,"cf",2,false],["Mednogorsk",57.6,51.41,"cf",2,false],["Sorochinsk",53.12,52.43,"cf",2,false],["Buzuluk",52.26,52.78,"cf",3,true],["Buguruslan",52.44,53.65,"cf",2,true],["Abdulino",53.65,53.68,"cf",2,false],["Kumertau",55.8,52.76,"cf",2,false],["Sterlitamak",55.93,53.63,"cf",3,true],["Salavat",55.92,53.36,"cf",2,false],["Ufa",55.97,54.74,"cf",3,true],["Birsk",55.53,55.42,"cf",2,false],["Neftekamsk",54.25,56.08,"cf",2,true],["Belebey",54.1,54.1,"cf",2,false],["Astrakhan",48.04,46.35,"eu",3,true],["Olya",47.55,45.77,"eu",2,true],["Akhtubinsk",46.17,48.28,"eu",2,true],["Znamensk",45.73,48.59,"eu",2,false],["Volgograd",44.51,48.71,"eu",3,true],["Volzhsky",44.78,48.79,"eu",3,true],["Kalach-na-Donu",43.53,48.69,"eu",2,true],["Ilovlya",43.98,49.3,"eu",2,false],["Kamyshin",45.38,50.08,"eu",2,true],["Frolovo",43.66,49.77,"eu",2,false],["Pallasovka",46.88,50.05,"eu",2,true],["Saratov",46.03,51.54,"eu",3,true],["Engels",46.12,51.49,"eu",3,true],["Balakovo",47.8,52.02,"eu",3,true],["Volsk",47.39,52.04,"eu",2,true],["Atkarsk",45,51.88,"eu",2,false],["Petrovsk",45.39,52.31,"eu",2,false],["Pugachyov",48.8,52.01,"eu",2,true],["Samara",50.15,53.2,"eu",3,true],["Tolyatti",49.42,53.51,"eu",3,true],["Syzran",48.47,53.16,"eu",3,true],["Kinel",50.63,53.22,"eu",2,true],["Ulyanovsk",48.4,54.31,"eu",3,true],["Dimitrovgrad",49.55,54.22,"eu",2,true],["Kazan",49.12,55.79,"eu",3,true],["Cheboksary",47.25,56.14,"eu",3,true],["Nizhnekamsk",51.82,55.63,"eu",3,true],["Naberezhnye Chelny",52.4,55.74,"eu",3,true],["Almetyevsk",52.32,54.9,"eu",3,true],["Chistopol",50.64,55.36,"eu",2,true],["Zelenodolsk",48.52,55.84,"eu",2,false],["Yoshkar-Ola",47.9,56.63,"eu",2,false],["Saransk",45.19,54.18,"eu",3,true],["Penza",45.02,53.2,"eu",3,true],["Nizhny Novgorod",44,56.33,"eu",3,true],["Arzamas",43.82,55.39,"eu",2,false],["Kirov",49.66,58.6,"eu",3,true],["Izhevsk",53.22,56.85,"eu",3,true],["Sarapul",53.8,56.47,"eu",2,true]];
// [faction, origin city, operational formation, type class, count, named commander].
  const ARMY_GROUPS=[["cf","Stavropol","Caucasus Breakthrough","heavy",6,"xingke"],["cf","Stavropol","Caucasus Breakthrough","rocket",4,null],["cf","Budennovsk","Caucasus Breakthrough","assault",4,"zhaohao"],["cf","Georgiyevsk","Caucasus Reserve","medium",4,null],["cf","Makhachkala","Caspian Coastal Army","heavy",5,"meiling"],["cf","Makhachkala","Caspian Coastal Army","rocket",4,null],["cf","Kizlyar","Caspian Coastal Army","assault",4,"gaohai"],["cf","Kaspiysk","Caspian Coastal Army","support",3,null],["cf","Elista","Lower Volga Shock Group","heavy",7,"honggu"],["cf","Elista","Lower Volga Shock Group","rocket",5,null],["cf","Elista","Lower Volga Shock Group","siege",3,null],["cf","Yashkul","Astrakhan Pincer","heavy",4,"leifeng"],["cf","Lagan","Astrakhan Pincer","medium",4,null],["cf","Divnoye","Lower Volga Shock Group","assault",4,null],["cf","Salsk","Don Flanking Corps","heavy",5,"lifeng"],["cf","Salsk","Don Flanking Corps","rocket",3,null],["cf","Kotelnikovo","Don Flanking Corps","assault",4,null],["cf","Zimovniki","Don Flanking Corps","medium",3,null],["cf","Orenburg","Eastern Volga Offensive","heavy",6,"cao"],["cf","Orenburg","Eastern Volga Offensive","rocket",4,null],["cf","Orenburg","Eastern Volga Offensive","siege",3,null],["cf","Sol-Iletsk","Southern Samara Attack","heavy",4,null],["cf","Buzuluk","Southern Samara Attack","heavy",6,"xianglin"],["cf","Buzuluk","Southern Samara Attack","assault",4,null],["cf","Sorochinsk","Southern Samara Attack","rocket",4,null],["cf","Buguruslan","Northern Samara Attack","heavy",5,null],["cf","Buguruslan","Northern Samara Attack","medium",4,null],["cf","Sterlitamak","Kama Offensive","heavy",5,null],["cf","Sterlitamak","Kama Offensive","rocket",4,null],["cf","Ufa","Kazan Axis","heavy",6,null],["cf","Ufa","Kazan Axis","rocket",4,null],["cf","Ufa","Kazan Axis","siege",3,null],["cf","Neftekamsk","Kama Offensive","medium",4,null],["cf","Orsk","Eastern Strategic Reserve","heavy",4,null],["cf","Orsk","Eastern Strategic Reserve","rocket",3,null],["eu","Volgograd","Volgograd River Guard","heavy",5,"akito"],["eu","Volgograd","Volgograd River Guard","rocket",4,"yukiya"],["eu","Volgograd","Volgograd River Guard","siege",2,null],["eu","Volzhsky","Volgograd River Guard","assault",3,"ryo"],["eu","Kalach-na-Donu","Don Western Screen","medium",4,"oscar"],["eu","Kalach-na-Donu","Don Western Screen","rocket",2,null],["eu","Astrakhan","Caspian Delta Defense","heavy",4,"leila"],["eu","Astrakhan","Caspian Delta Defense","rocket",3,"anna"],["eu","Olya","Caspian Delta Defense","medium",2,null],["eu","Akhtubinsk","Lower Volga Defense","heavy",4,"ayano"],["eu","Akhtubinsk","Lower Volga Defense","rocket",2,null],["eu","Kamyshin","Lower Volga Defense","medium",3,null],["eu","Saratov","Saratov River Guard","heavy",5,"smilas"],["eu","Saratov","Saratov River Guard","rocket",4,"olivia"],["eu","Engels","Saratov River Guard","assault",4,null],["eu","Balakovo","Saratov River Guard","heavy",4,null],["eu","Balakovo","Saratov River Guard","siege",2,null],["eu","Samara","Samara Industrial Defense","heavy",5,"fernando"],["eu","Samara","Samara Industrial Defense","rocket",4,null],["eu","Tolyatti","Samara Industrial Defense","assault",3,null],["eu","Syzran","Western Industrial Reserve","heavy",4,"margaret"],["eu","Ulyanovsk","Ulyanovsk Bridge Guard","heavy",4,"eduardo"],["eu","Ulyanovsk","Ulyanovsk Bridge Guard","rocket",3,null],["eu","Kazan","Kazan Northern Defense","heavy",5,"klaus"],["eu","Kazan","Kazan Northern Defense","rocket",4,null],["eu","Kazan","Kazan Northern Defense","siege",2,null],["eu","Nizhnekamsk","Kama River Guard","heavy",4,"pierre"],["eu","Naberezhnye Chelny","Kama River Guard","medium",4,null],["eu","Cheboksary","Western Volga Reserve","heavy",4,null],["eu","Penza","Western Volga Reserve","rocket",2,null],["eu","Nizhny Novgorod","Northern Strategic Reserve","heavy",4,null],["eu","Izhevsk","Northern Strategic Reserve","medium",3,null]];
// Ports are separate capturable sea cells, not inseparable city ownership.
  const PORTS={"Makhachkala":3,"Kaspiysk":2,"Lagan":2,"Olya":3};
  const FLEETS=[["cf","Makhachkala","cf_carrier",2],["cf","Makhachkala","shui_gun_ru_ii",3],["cf","Lagan","cf_carrier",1],["cf","Lagan","shui_gun_ru_ii",2],["eu","Olya","eu_carrier",2],["eu","Olya","panzer_frosch_ii",3]];
  const FUNDING={cf:{credits:1100,industry:720,science:105,sakuradite:60},eu:{credits:950,industry:640,science:100,sakuradite:54}};
const RIVERS={"Volga":[[44,56.33],[45.37,56.29],[47.25,56.14],[48.5,55.99],[49.12,55.79],[49.3,55.22],[48.4,54.31],[49.42,53.51],[50.15,53.2],[49.25,52.85],[48.02,52.05],[47.8,52.02],[46.12,51.49],[46.03,51.54],[45.38,50.08],[44.51,48.71],[44.78,48.79],[46.17,48.28],[47.6,47.22],[48.04,46.35],[47.7,45.8]],"Kama":[[55.34,56],[53.8,56.47],[52.4,55.74],[51.82,55.63],[50.64,55.36],[49.3,55.22]],"Samara":[[53.7,52.35],[52.26,52.78],[51.35,53],[50.15,53.2]],"Ural":[[58.57,51.23],[57.6,51.4],[55.1,51.77],[53.7,51.6]],"Don":[[41.7,49.3],[42.7,49.1],[43.53,48.69],[44.08,48.52]],"Akhtuba":[[44.78,48.79],[46.17,48.28],[47.3,47.25],[48.13,46.48]]};
  function landscape(p,c,r){
    if(p.lat>54.8&&p.lon<57.5&&(c*17+r*11)%19<10)return 'forest';
    if(p.lat>56.3&&(c*7+r*13)%13<9)return 'forest';
    if(p.lat>47.5&&p.lat<52.2&&p.lon<43.9&&(c*7+r*19)%17<4)return 'forest';
    return 'plains';
  }
  // A coastline-sampled Caspian basin with the Olya delta estuary.
  function caspian(p){
    if(p.lon<46.9||p.lon>54.5||p.lat<42.15||p.lat>47.1)return false;
    const north=[[46.9,44.8],[47.4,45.48],[47.7,45.92],[48,46.04],
      [48.6,46.4],[49.2,46.7],[50.8,46.86],[52,47],[53.4,46.65],[54.5,46]];
    let boundary=north[north.length-1][1];
    for(let i=1;i<north.length;i++)if(p.lon<=north[i][0]){
      const a=north[i-1],b=north[i];
      boundary=a[1]+(b[1]-a[1])*(p.lon-a[0])/(b[0]-a[0]);break;
    }
    const west=p.lat<43.15?48.3-(p.lat-42.15)*.75:
      p.lat<44.3?47.55-(p.lat-43.15)*.2:47.32-.1*(p.lat-44.3);
    return p.lon>=west&&p.lat<boundary;
  }
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
    lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function nearest(g,p,valid,radius=10){
    let best=null,score=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!valid(t))continue;
        const d=E.distance(p,t,g);
        if(d<score){best=t;score=d;}
      }
    return best;
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
    return {ok:assigned>0,assigned,failed,reason:assigned?'':'No formation can reach the destination'};
  }
  function create(player='cf',difficulty='normal',seed=201707){
    if(!SIDES.includes(player))throw Error('Unsupported Volga faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{eu:0,cf:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},lineup:{}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[side]={};
    }
    g.scenario={id:ID,key:KEY,title:'Battle for the Volga',version:1,
      phase:'chinese-volga-offensive',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,rivers:RIVERS,
      operationalFronts:[
    {name:'Lower Volga from Caucasus',attack:'cf',bases:['Elista','Salsk','Kotelnikovo'],route:['Kalach-na-Donu','Volgograd','Kamyshin','Saratov']},
    {name:'Caspian delta',attack:'cf',bases:['Makhachkala','Kizlyar','Lagan'],route:['Olya','Astrakhan','Akhtubinsk']},
    {name:'Samara from east',attack:'cf',bases:['Orenburg','Buzuluk','Buguruslan'],route:['Pugachyov','Samara','Ulyanovsk']},
    {name:'Kama crossings',attack:'cf',bases:['Ufa','Neftekamsk'],route:['Naberezhnye Chelny','Nizhnekamsk','Kazan']}],
    offensiveAxes:{cf:{"Caucasus Breakthrough":["Kotelnikovo","Kalach-na-Donu","Volgograd","Volzhsky"],"Caucasus Reserve":["Kalach-na-Donu","Frolovo","Kamyshin"],"Caspian Coastal Army":["Olya","Astrakhan","Akhtubinsk"],"Lower Volga Shock Group":["Kotelnikovo","Kalach-na-Donu","Volgograd","Kamyshin"],"Astrakhan Pincer":["Olya","Astrakhan","Akhtubinsk","Pallasovka"],"Don Flanking Corps":["Kalach-na-Donu","Volgograd","Saratov"],"Eastern Volga Offensive":["Pugachyov","Balakovo","Engels","Saratov"],"Southern Samara Attack":["Pugachyov","Samara","Syzran","Ulyanovsk"],"Northern Samara Attack":["Kinel","Samara","Tolyatti","Ulyanovsk"],"Kama Offensive":["Almetyevsk","Nizhnekamsk","Kazan","Cheboksary"],"Kazan Axis":["Naberezhnye Chelny","Nizhnekamsk","Chistopol","Kazan"],"Eastern Strategic Reserve":["Buzuluk","Pugachyov","Balakovo"]}},
    riverCrossings:['Volgograd','Volzhsky','Kamyshin','Saratov','Engels','Balakovo','Samara','Tolyatti','Syzran','Ulyanovsk','Kazan','Cheboksary','Nizhnekamsk','Naberezhnye Chelny','Astrakhan','Akhtubinsk'],
    riverLines:['Volga','Kama','Akhtuba']};
    
const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    // Coast and sea are classified locally, without adding shared map assets.
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r);
      return {c,r,owner:null,terrain:caspian(p)?'sea':landscape(p,c,r)};
    });
    for(const t of g.tiles)if(t.terrain!=='sea'&&
      E.adjacent(g,t).some(n=>n.terrain==='sea'))t.terrain='coast';
    const gulfStart=nearest(g,locate(49.5,44.2),t=>t.terrain==='sea',9);
    if(!gulfStart)throw Error('Caspian sea absent');
    const reachable=new Set([E.key(gulfStart)]),queue=[gulfStart];
    for(let i=0;i<queue.length;i++)for(const n of E.adjacent(g,queue[i])){
      const key=E.key(n);
      if((n.terrain==='sea'||n.terrain==='coast')&&!reachable.has(key)){
        reachable.add(key);queue.push(n);
      }
    }
    const gulf=t=>(t.terrain==='sea'||t.terrain==='coast')&&reachable.has(E.key(t));
    
// River edges are crossed where a movement segment intersects the real
    // river polyline. The map uses hex-centre approximations at tactical scale.
    // Bridge cities offer exempt approaches; everywhere else land units pay +1
    // movement. The saved scenario stores ordinary JSON for pathfinding.
    function orientation(a,b,p){
      return (b.lon-a.lon)*(p.lat-a.lat)-(b.lat-a.lat)*(p.lon-a.lon);
    }
    function intersects(a,b,x,y){
      const u=orientation(a,b,{lon:x[0],lat:x[1]}),
        v=orientation(a,b,{lon:y[0],lat:y[1]}),
        m=orientation({lon:x[0],lat:x[1]},{lon:y[0],lat:y[1]},a),
        n=orientation({lon:x[0],lat:x[1]},{lon:y[0],lat:y[1]},b);
      return ((u>0&&v<0)||(u<0&&v>0))&&((m>0&&n<0)||(m<0&&n>0));
    }
    const riverSegments=Object.values(RIVERS).flatMap(polyline=>
      polyline.slice(1).map((p,i)=>[polyline[i],p]));
    const bridges=new Set(g.scenario.riverCrossings);
    const bridgeCities=()=>g.stations.filter(s=>bridges.has(s.name));
    function riverBarriers(){
      const edges={},crossings=bridgeCities();
      for(const t of g.tiles){
        if(t.terrain==='sea'||t.terrain==='offmap'||E.TERRAIN[t.terrain]?.blocked)continue;
        const a=geo(t.c,t.r),from=t.r*COLS+t.c;
        for(const n of E.adjacent(g,t)){
          const to=n.r*COLS+n.c;
          if(to<=from||n.terrain==='sea'||n.terrain==='offmap'||
             E.TERRAIN[n.terrain]?.blocked)continue;
          const b=geo(n.c,n.r);
          if(!riverSegments.some(([x,y])=>intersects(a,b,x,y)))continue;
          if(crossings.some(s=>E.distance(s,t,g)<=1&&E.distance(s,n,g)<=1))
            continue;
          edges[from+':'+to]=true;
        }
      }
      return edges;
    }
    // Place each city at or very near its actual coordinates. A defended port
    // must border navigable Caspian water instead of bridging over land.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const coast=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>
        t.terrain!=='sea'&&t.terrain!=='offmap'&&t.terrain!=='peak'&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r)&&
        (!coast||E.adjacent(g,t).some(n=>gulf(n))),coast?12:8);
      if(!at)throw Error('Volga city inaccessible: '+name);
      const capital=['Stavropol','Orenburg','Ufa','Volgograd','Saratov','Samara','Kazan'].includes(name);
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Riverline Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?55:tier===3?33:tier===2?22:13)*.55),
        industry:Math.round((capital?28:7*tier)*.55),
        science:Math.round((tier+2)*.55),producedTurn:0});
    }
    // Assign land ownership by nearest city on the same contiguous land mass.
    // This prevents ownership colors flooding across Volgan Caspian water.
    const components=new Int16Array(g.tiles.length).fill(-1);
    let componentId=0;
    for(let i=0;i<g.tiles.length;i++){
      const first=g.tiles[i];
      if(first.terrain==='sea'||first.terrain==='offmap'||components[i]>=0)continue;
      const q=[first];components[i]=componentId;
      for(let j=0;j<q.length;j++)for(const n of E.adjacent(g,q[j])){
        const index=n.r*COLS+n.c;
        if(n.terrain==='sea'||n.terrain==='offmap'||components[index]>=0)continue;
        components[index]=componentId;q.push(n);
      }
      componentId++;
    }
    const byComponent=new Map();
    for(const s of g.stations){
      const key=components[s.r*COLS+s.c];
      if(!byComponent.has(key))byComponent.set(key,[]);
      byComponent.get(key).push(s);
    }
    for(const t of g.tiles)if(t.terrain!=='sea'&&t.terrain!=='offmap'){
      const nearby=byComponent.get(components[t.r*COLS+t.c])||[];
      if(!nearby.length)continue; // unoccupied islands must not gain a land bridge.
      let closest=null,dist=Infinity;
      for(const city of nearby){
        const d=E.distance(t,city,g);
        if(d<dist){dist=d;closest=city;}
      }
      if(closest){t.owner=closest.owner;t.provinceCity=closest.id;}
    }
    g.scenario.riverBarriers=riverBarriers();
    const groupMap=new Map();
    function group(side,name,origin){
      const key=side+':'+name;
      if(!groupMap.has(key)){
        const gr={id:'army-'+groupMap.size,side,name,origin,units:[]};
        groupMap.set(key,gr);g.scenario.groups.push(gr);
      }
      return groupMap.get(key);
    }
    for(const [side,name,formation,cls,count,commander] of ARMY_GROUPS){
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side)throw Error('Invalid Volga Army Group staging '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
          !E.TERRAIN[t.terrain]?.blocked&&!E.unitAt(g,t)&&t.owner===side&&
          (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),14);
        if(!at)throw Error('Cannot deploy Volga army near '+name);
        const cmd=i===0?commander:null,stack=i===0?3:2;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,formation,name).units.push(u.id);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    const usedPortHexes=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      if(!s)throw Error('Missing Caspian port city '+name);
      const at=E.adjacent(g,s).filter(t=>gulf(t)&&
        !usedPortHexes.has(E.key(t))&&!g.stations.some(x=>x.c===t.c&&x.r===t.r))
        .sort((a,b)=>E.adjacent(g,b).filter(gulf).length-
          E.adjacent(g,a).filter(gulf).length)[0];
      if(!at)throw Error('No navigable berth at '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      usedPortHexes.add(E.key(at));
    }
    for(const [side,name,type,count] of FLEETS){
      const s=g.stations.find(v=>v.name===name);
      if(!s||!E.TYPES[type]?.naval)throw Error('Invalid Caspian fleet '+name+'/'+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,name:name+' Fleet',
        origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>gulf(t)&&!E.unitAt(g,t)&&
          !usedPortHexes.has(E.key(t))&&!g.stations.some(x=>x.c===t.c&&x.r===t.r),16);
        if(!at)throw Error('Insufficient naval berths for '+name);
        fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
      }
      g.scenario.groups.push(fleet);
    }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const side of SIDES){
      const factor=side===player?1:['challenge','elite'].includes(difficulty)?1.6:
        difficulty==='hard'?1.3:1;
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([res,n])=>[res,Math.round(n*factor)-base[res]]));
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
    E.log(g,'Chinese forces advance from the Caucasus and the eastern approaches to cross the E.U. Volga riverline; total conquest decides the battle.',player);
    
return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((score,s)=>score+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Conquer all '+CITIES.length+' Volga campaign cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has captured all cities across the Volga basin and its approaches.'};
    return null;
  }
  const api={id:ID,title:'Battle for the Volga',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={
    map:{centreSampled:true,coastBuffer:1,overlays:['regionalRivers'],overviewMarkers:true},
    elite:true,eliteRosterOnly:true,
    ai:{doctrine:'europe',recovery:true,routeBias:'cf',
      riverlineDefense:{side:'eu',attacker:'cf',river:'Volga'},
      operationalAxes:{invader:'cf',defender:'eu',axes:{"Caucasus Breakthrough":["Kotelnikovo","Kalach-na-Donu","Volgograd","Volzhsky"],"Caucasus Reserve":["Kalach-na-Donu","Frolovo","Kamyshin"],"Caspian Coastal Army":["Olya","Astrakhan","Akhtubinsk"],"Lower Volga Shock Group":["Kotelnikovo","Kalach-na-Donu","Volgograd","Kamyshin"],"Astrakhan Pincer":["Olya","Astrakhan","Akhtubinsk","Pallasovka"],"Don Flanking Corps":["Kalach-na-Donu","Volgograd","Saratov"],"Eastern Volga Offensive":["Pugachyov","Balakovo","Engels","Saratov"],"Southern Samara Attack":["Pugachyov","Samara","Syzran","Ulyanovsk"],"Northern Samara Attack":["Kinel","Samara","Tolyatti","Ulyanovsk"],"Kama Offensive":["Almetyevsk","Nizhnekamsk","Kazan","Cheboksary"],"Kazan Axis":["Naberezhnye Chelny","Nizhnekamsk","Chistopol","Kazan"],"Eastern Strategic Reserve":["Buzuluk","Pugachyov","Balakovo"]},
        defenderHubs:['Astrakhan','Volgograd','Volzhsky','Saratov','Engels','Balakovo','Samara','Tolyatti','Ulyanovsk','Kazan','Nizhnekamsk']}},
    text:{
      terrain:'Volga, Kama and Akhtuba crossings cost movement away from bridge cities. Forests slow the northern approaches. Caspian ports are capturable.',
      era:'Volga · Alternate 2017',
      intro:'Chinese Army Groups strike north from the Caucasus and west from Orenburg and Ufa to break the E.U. Volga riverline at Volgograd, Saratov, Samara and Kazan. Total conquest only, without a turn limit.',
      diplomacy:'The Chinese Federation and E.U. fight alone, and Caspian harbours are independent capturable ports.',
      elite:'Standard faction Elite Forces and HQ, repairs, rewards, production and research rules apply.',
      focus:{cf:'Elista',eu:'Volgograd'}},
    blurbs:{
      cf:'Coordinate the lower Volga and Don breakthroughs, secure the Caspian delta, advance toward Samara and outflank Kazan via Kama.',
      eu:'Fortify the bridgeheads, defend the great industrial cities and counterattack exposed Chinese Army Groups.'}
  };
  
E.scenarios={...(E.scenarios||{}),[KEY]:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

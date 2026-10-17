/* Invasion of South China — Britannia's combined continental and amphibious offensive.
   GSHHS-derived Indochina coastal atlas, 20–80% mixed-coast treatment,
   navigable Hainan and Guangdong waters. Standalone scenario, no World Campaign edits. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=168,ROWS=124,SIDES=['britannia','cf'];
  const BOUNDS={west:98,east:117.2,north:28.4,south:16.25};
  const K=Math.cos(22.325*Math.PI/180),DLON=(BOUNDS.east-BOUNDS.west)/COLS,
    DLAT=(BOUNDS.north-BOUNDS.south)/ROWS;
  const PROJECTION={centerLon:107.6,centerLat:22.325,angle:0,
    uMin:(BOUNDS.west+DLON/2-107.6)*K,uMax:(BOUNDS.east-DLON/2-107.6)*K,
    vMin:BOUNDS.south+DLAT/2-22.325,vMax:BOUNDS.north-DLAT/2-22.325};
  // Settlement coordinates are geographic; formations and factories are fictional.
  const CITIES=[["Hanoi",105.83,21.03,"britannia",3,true],["Haiphong",106.68,20.86,"britannia",3,true],["Lang Son",106.76,21.85,"britannia",3,true],["Cao Bang",106.25,22.66,"britannia",2,true],["Lao Cai",103.97,22.49,"britannia",3,true],["Dien Bien Phu",103.02,21.39,"britannia",3,true],["Ha Giang",104.98,22.82,"britannia",2,true],["Phongsali",102.1,21.68,"britannia",2,true],["Luang Prabang",102.13,19.89,"britannia",3,true],["Thanh Hoa",105.78,19.81,"britannia",2,false],["Nam Dinh",106.17,20.42,"britannia",2,false],["Vinh",105.69,18.68,"britannia",2,false],["Kunming",102.83,25.04,"cf",3,true],["Qujing",103.8,25.49,"cf",2,true],["Yuxi",102.55,24.35,"cf",2,false],["Chuxiong",101.54,25.03,"cf",2,false],["Pu'er",100.98,22.78,"cf",2,false],["Jinghong",100.8,22.01,"cf",2,false],["Wenshan",104.24,23.37,"cf",2,true],["Mengzi",103.39,23.37,"cf",2,false],["Gejiu",103.15,23.36,"cf",2,false],["Baise",106.62,23.9,"cf",3,true],["Hechi",108.06,24.7,"cf",2,true],["Nanning",108.32,22.82,"cf",3,true],["Pingxiang",106.75,22.09,"cf",2,true],["Chongzuo",107.36,22.42,"cf",2,true],["Longzhou",106.85,22.34,"cf",2,true],["Fangchenggang",108.35,21.62,"cf",2,true],["Dongxing",107.97,21.54,"cf",2,true],["Qinzhou",108.61,21.97,"cf",2,true],["Beihai",109.12,21.48,"cf",2,true],["Yulin",110.15,22.64,"cf",2,false],["Guigang",109.6,23.1,"cf",2,false],["Liuzhou",109.41,24.33,"cf",3,true],["Laibin",109.22,23.73,"cf",2,false],["Guilin",110.3,25.27,"cf",3,true],["Wuzhou",111.28,23.48,"cf",2,true],["Hezhou",111.55,24.41,"cf",2,false],["Yongzhou",111.61,26.42,"cf",2,false],["Chenzhou",113.02,25.77,"cf",2,true],["Shaoguan",113.59,24.8,"cf",3,true],["Qingyuan",113.05,23.68,"cf",2,false],["Zhaoqing",112.46,23.05,"cf",2,false],["Foshan",113.12,23.02,"cf",3,true],["Guangzhou",113.26,23.13,"cf",3,true],["Dongguan",113.75,23.02,"cf",3,true],["Shenzhen",114.06,22.54,"cf",3,true],["Hong Kong",114.17,22.3,"cf",3,true],["Zhuhai",113.57,22.27,"cf",3,true],["Zhongshan",113.39,22.52,"cf",2,false],["Jiangmen",113.08,22.58,"cf",2,false],["Huizhou",114.42,23.1,"cf",3,true],["Meizhou",116.1,24.3,"cf",2,true],["Heyuan",114.7,23.75,"cf",2,false],["Shanwei",115.36,22.78,"cf",2,true],["Shantou",116.68,23.35,"cf",3,true],["Chaozhou",116.62,23.66,"cf",2,false],["Jieyang",116.37,23.55,"cf",2,false],["Yangjiang",111.98,21.86,"cf",2,true],["Maoming",110.92,21.66,"cf",2,false],["Zhanjiang",110.36,21.27,"cf",3,true],["Leizhou",110.1,20.9,"cf",2,true],["Haikou",110.35,20.02,"cf",2,true],["Danzhou",109.58,19.52,"cf",2,false],["Sanya",109.51,18.25,"cf",2,true]];
  const ARMY_GROUPS=[["britannia","Lang Son","heavy",6,"cornelia"],["britannia","Lang Son","assault",5,"guilford"],["britannia","Lang Son","rocket",4,"cecile"],["britannia","Cao Bang","heavy",5,"bismarck"],["britannia","Cao Bang","medium",4,"darlton"],["britannia","Cao Bang","siege",3],["britannia","Lao Cai","heavy",6,"jeremiah"],["britannia","Lao Cai","assault",5,"suzaku"],["britannia","Lao Cai","rocket",3],["britannia","Ha Giang","medium",5,"villetta"],["britannia","Ha Giang","support",3],["britannia","Dien Bien Phu","heavy",5,"oldrin"],["britannia","Dien Bien Phu","assault",4],["britannia","Dien Bien Phu","rocket",3],["britannia","Phongsali","medium",4,"kewell"],["britannia","Phongsali","raider",3],["britannia","Luang Prabang","medium",3],["britannia","Hanoi","heavy",5],["britannia","Hanoi","rocket",4],["britannia","Hanoi","siege",3],["britannia","Haiphong","assault",5],["britannia","Haiphong","support",3],["britannia","Thanh Hoa","medium",3],["cf","Kunming","heavy",6,"xingke"],["cf","Kunming","rocket",5,"honggu"],["cf","Kunming","siege",3],["cf","Wenshan","heavy",5,"cao"],["cf","Wenshan","assault",5],["cf","Mengzi","medium",4],["cf","Baise","heavy",5,"ren"],["cf","Baise","rocket",4],["cf","Hechi","assault",4],["cf","Nanning","heavy",7,"xianglin"],["cf","Nanning","rocket",6,"chengzhong"],["cf","Nanning","siege",4],["cf","Pingxiang","assault",6],["cf","Chongzuo","medium",5],["cf","Longzhou","scout",3],["cf","Fangchenggang","medium",4],["cf","Qinzhou","rocket",3],["cf","Beihai","heavy",4],["cf","Liuzhou","heavy",5,"chaojielun"],["cf","Liuzhou","rocket",4],["cf","Guilin","heavy",5],["cf","Guilin","siege",4],["cf","Guangzhou","heavy",7],["cf","Guangzhou","rocket",6],["cf","Guangzhou","siege",5],["cf","Foshan","medium",5],["cf","Dongguan","heavy",4],["cf","Shenzhen","assault",6],["cf","Hong Kong","rocket",5],["cf","Zhuhai","heavy",5],["cf","Zhanjiang","heavy",5],["cf","Zhanjiang","rocket",4],["cf","Haikou","heavy",4],["cf","Sanya","assault",3],["cf","Shaoguan","heavy",5],["cf","Shaoguan","rocket",4],["cf","Huizhou","medium",4],["cf","Shantou","heavy",4],["cf","Shanwei","assault",3],["cf","Wuzhou","medium",4],["cf","Chenzhou","rocket",3]];
  const PORTS={"Haiphong":3,"Fangchenggang":3,"Dongxing":2,"Qinzhou":2,"Beihai":3,"Zhanjiang":3,"Yangjiang":2,"Zhuhai":3,"Shenzhen":2,"Hong Kong":3,"Shanwei":2,"Shantou":3,"Haikou":3,"Sanya":2};
  const FLEETS=[["britannia","Tonkin Carrier Command",108.15,19.2,"carrier_battleship",4],["britannia","Hainan Carrier Command",111.7,18.5,"carrier_battleship",3],["britannia","Pearl Delta Carrier Command",113.6,19.4,"carrier_battleship",4],["britannia","Eastern Carrier Command",116.1,21.1,"carrier_battleship",3],["britannia","Tonkin Escort Screen",108.3,19.6,"portman_ii",9],["britannia","Hainan Amphibious Corps",111.9,18.8,"portman_ii",8],["britannia","Pearl Delta Landing Corps",113.9,20.1,"portman_ii",10],["britannia","Eastern Landing Corps",116.3,21.4,"portman_ii",8],["cf","Guangxi Coastal Fleet",109.1,20.9,"cf_carrier",3],["cf","Pearl River Fleet",113.6,21.1,"cf_carrier",3],["cf","Shantou Fleet",116.4,22.5,"cf_carrier",2],["cf","Hainan Sea Defense",110.4,19,"shui_gun_ru_ii",7],["cf","Guangxi Torpedo Defense",109.1,20.6,"shui_gun_ru_ii",6],["cf","Pearl Delta Interceptors",113.5,21.4,"shui_gun_ru_ii",8],["cf","Eastern Interceptors",116.1,22.1,"shui_gun_ru",6]];
  const OPERATIONAL_FRONTS=[{"name":"Western Yunnan","side":"britannia","from":"Dien Bien Phu","objectives":["Mengzi","Kunming","Qujing"]},{"name":"Red River Spearhead","side":"britannia","from":"Lao Cai","objectives":["Wenshan","Baise","Kunming"]},{"name":"Guangxi Border Offensive","side":"britannia","from":"Lang Son","objectives":["Pingxiang","Nanning","Liuzhou"]},{"name":"Northeastern Border Offensive","side":"britannia","from":"Cao Bang","objectives":["Longzhou","Baise","Hechi"]},{"name":"Gulf of Tonkin Landings","side":"britannia","from":"Haiphong","objectives":["Beihai","Zhanjiang","Yulin"]},{"name":"Pearl Delta Landings","side":"britannia","from":"Pearl Delta Carrier Command","objectives":["Zhuhai","Hong Kong","Guangzhou"]},{"name":"Eastern Coastal Landings","side":"britannia","from":"Eastern Carrier Command","objectives":["Shanwei","Shantou","Huizhou"]},{"name":"Kunming Reserve","side":"cf","from":"Kunming","objectives":["Wenshan","Mengzi","Lao Cai"]},{"name":"Guangxi Counterattack","side":"cf","from":"Nanning","objectives":["Pingxiang","Lang Son","Hanoi"]},{"name":"Pearl Industrial Defense","side":"cf","from":"Guangzhou","objectives":["Zhuhai","Shenzhen","Hong Kong"]}];
  const FUNDING={britannia:{credits:990,industry:575,science:85,sakuradite:72},
    cf:{credits:1080,industry:650,science:95,sakuradite:78}};
  const RIVERS={
    Pearl:[[112.46,23.05],[112.85,23.02],[113.25,22.95],[113.55,22.7],[113.85,22.55]],
    Xi:[[107.35,23.9],[109.6,23.1],[111.28,23.48],[112.46,23.05],[113.1,22.95]],
    Bei:[[113.56,25.17],[113.6,24.8],[113.05,23.68],[113.2,23.1]],
    Dong:[[115.3,24.2],[114.7,23.75],[114.42,23.1],[113.83,23.03]],
    Li:[[110.45,25.5],[110.3,25.27],[110.48,24.77],[110.54,24.25]],
    Hongshui:[[105.9,24.2],[107.45,24.45],[108.3,24.1],[109.2,23.73]],
    Yu:[[106.6,23.1],[107.35,22.6],[108.32,22.82],[109.6,23.1]],
    Red:[[103.15,23.36],[103.97,22.49],[104.7,21.65],[105.83,21.03]],
    Lancang:[[99.5,25.6],[100.2,24.5],[100.8,22.01],[100.8,20.9]]
  };
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

  // Yunnan uplands, the Guangxi karst, Nanling ranges and river-valley passes.
  const MOUNTAINS=[[101.6,25.5,2.4,1.7],[103.9,24.8,2.2,1.6],
    [105.7,24.5,2.0,1.2],[107.7,24.8,1.6,1.3],[110.4,25.5,1.9,1.3],
    [112.5,25.4,2.2,1.0],[114.9,25.7,1.9,1.35],[115.4,24.2,1.0,1.4],
    [106.1,22.25,.9,.8],[104.8,21.8,1.0,1.2],[101.2,22.3,1.2,2.3]];
  const FORESTS=[[100.5,23.4,2.1,3.0],[104.9,24.4,2.1,1.7],
    [108.5,24.65,2.0,1.4],[110.9,26.0,2.0,1.6],[114.7,24.8,2.0,1.6],
    [110.4,19.5,1.8,1.6],[106.2,20.4,1.8,1.5]];
  const LOWLANDS=[[108.3,22.8,1.2,.75],[109.5,23.2,1.4,.55],
    [110.35,25.25,.65,.65],[111.35,23.45,1.3,.55],[112.7,23.1,2.0,.65],
    [113.65,22.8,1.6,.65],[114.5,23.1,1.1,.55],[110.4,21.5,1.3,.7],
    [103.95,22.5,.7,1.4],[105.8,21.1,.85,.75],[110.35,20.02,1.0,.65]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function landscape(p,c,r){
    const mountain=density(p,MOUNTAINS),forest=density(p,FORESTS),
      valley=density(p,LOWLANDS);
    if(valley>.60)return 'plains';
    if(mountain>.68)return 'mountain';
    return mountain>.33||forest>.54||((c*29+r*17)%37<3&&p.lat>22)
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
  function create(player='britannia',difficulty='normal',seed=201701){
    if(!SIDES.includes(player))throw Error('Unsupported South China faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'southChina',order:[player,...SIDES.filter(s=>s!==player)],
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
    g.scenario={id:'bf-south-china',key:'southChina',title:'Invasion of South China',
      version:2,phase:'britannian-northern-offensive',aiDoctrine:'europe',operationalFronts:OPERATIONAL_FRONTS,groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
      rivers:RIVERS};
    // Both sides use their own established faction Elite Force rosters.
    // Other scenarios, global HQ and Conquest remain unchanged.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      cf:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('cf')),
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia'))
    };
    // Connected waters include the Gulf of Thailand, Gulf of Tonkin and South China Sea.
    // Every shipyard launches at an adjacent navigable hex.

    const bits=root.INDOCHINA_LAND_BITS || (typeof require==='function'?
      require('./indochina-landmask.js'):null);
    if(!bits)throw Error('South China requires the GSHHS Indochina shoreline atlas');
    const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('latin1');
    if(raw.length!==120*104/8)throw Error('Coastal atlas is corrupt');
    function sampledLand(lon,lat){
      if(lat>=27)return true;
      if(lon<96.2||lon>=117.2||lat<7.5)return false;
      const r=Math.max(0,Math.min(103,Math.round((27-lat)*104/19.5-.5)));
      const c=Math.max(0,Math.min(119,Math.round((lon-96.2)*120/21-.5-.5*(r&1))));
      const i=r*120+c;
      return !!(raw.charCodeAt(i>>3)&(128>>(i&7)));
    }
    // Coast rule: <20% land is sea, 20–80% mixed coast, >80% inland.
    function landShare(p){
      let land=0;
      for(let y=0;y<5;y++)for(let x=0;x<5;x++)
        if(sampledLand(p.lon+(x-2)*DLON/5,p.lat+(y-2)*DLAT/5))land++;
      return land/25;
    }
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),share=landShare(p);
      return {c,r,owner:null,terrain:share<.20?'sea':
        share<=.80?'coast':landscape(p,c,r)};
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
      if(!at)throw Error('Cannot place South China city '+name);
      const capital=name==='Hanoi'||name==='Guangzhou';
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

    // Named naval groups remain separate from overland Army Groups.
    for(const [side,name,lon,lat,type,count] of FLEETS){
      if(!E.TYPES[type]?.naval)throw Error('Invalid South China fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,name,origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,locate(lon,lat),t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),13);
        if(!at)throw Error('Cannot deploy fleet '+name);
        const ship=E.newUnit(g,type,side,at.c,at.r);
        if(side==='britannia'&&type==='carrier_battleship')ship.invasionGroup=name;
        fleet.units.push(ship.id);
      }
      g.scenario.groups.push(fleet);
    }
    // The entire connected regional sea stays navigable for fleets.
    // Load 24 assault formations across four independent carrier operations.
    // Cargo stays in the regular Elite conversion pass before embarking.
    const invasionLoads=[
      ['Tonkin Carrier Command','assault',4],
      ['Tonkin Carrier Command','rocket',2],
      ['Hainan Carrier Command','heavy',4],
      ['Hainan Carrier Command','assault',2],
      ['Pearl Delta Carrier Command','heavy',4],
      ['Pearl Delta Carrier Command','siege',2],
      ['Eastern Carrier Command','assault',4],
      ['Eastern Carrier Command','rocket',2]
    ];
    const carriers=g.units.filter(u=>u.side==='britannia'&&u.invasionGroup);
    const passengers=[];
    for(const [name,cls,count] of invasionLoads){
      for(let i=0;i<count;i++){
        const ship=carriers.find(v=>v.invasionGroup===name&&
          (v.pendingPassengers||0)<E.TYPES[v.type].capacity);
        if(!ship)throw Error('Insufficient carrier capacity in '+name);
        ship.pendingPassengers=(ship.pendingPassengers||0)+1;
        const u=E.newUnit(g,E.typeFor('britannia',cls,g),'britannia',
          ship.c,ship.r,2);
        passengers.push({ship,u});
        group('britannia',name).units.push(u.id);
      }
    }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const {ship,u} of passengers){
      (ship.cargo||=[]).push(u);
      g.units.splice(g.units.indexOf(u),1);
    }
    for(const ship of carriers)delete ship.pendingPassengers;
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
        for(const [i,u] of g.units.flatMap(v=>[v,...(v.cargo||[])])
          .filter(v=>v.side===side&&E.TYPES[v.type].naval!=='ship').entries())
          if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.reduce((n,u)=>
      n+(u.side===s?1:0)+(u.cargo||[]).filter(v=>v.side===s).length,0)]));
    E.log(g,'Britannian Army Groups advance out of Indochina into Guangxi and Yunnan while four carrier commands threaten the Federation coastal industrial belt.',player);
    return g;
  }

  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Capture all '+CITIES.length+' South China theatre cities ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled). No turn limit.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='bf-south-china'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in South China.'};
    return null;
  }
  const api={id:'bf-south-china',title:'Invasion of South China',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,rivers:RIVERS,operationalFronts:OPERATIONAL_FRONTS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={terrainCosts:{mountain:2},map:{centreSampled:true,overlays:['regionalRivers']},
    elite:true,
    text:{terrain:'Mountains cost 2 movement; plains and marked passes cost 1. Float units ignore the extra terrain cost.',
      era:"South China · Alternate 2017",
      intro:"Britannia attacks southern China on several continental fronts while carrier battle groups open a second front along the coast. Conquer all 65 theatre cities on a large regional map without a turn limit.",
      diplomacy:"Britannia and the Chinese Federation are hostile from turn 1. Inland Army Groups and offshore invasion fleets operate independently; Chinese reserves and fleets defend mountain corridors, cities and strategic ports.",
      elite:"Elite South China uses the standard faction Elite Force conversion and rival commander upgrades. Carrier fleets remain conventional; no unit balance or global campaign rules are changed.",
      focus:{
        britannia:"Lang Son",
        cf:"Guangzhou"
      }
    },
    blurbs:{
      britannia:"Command coordinated offensives from Indochina against Yunnan and Guangxi, while four carrier groups invade the Gulf of Tonkin, Hainan, Pearl Delta and eastern Guangdong. Capture every Chinese city.",
      cf:"Defend Kunming, Nanning, Guangzhou and Shenzhen with fortified mountain corridors, industrial reserves and coastal fleets. Counterattack through the border passes and repel landings."
    }};
  E.scenarios={...(E.scenarios||{}),southChina:api,
    byId:{...(E.scenarios?.byId||{}),'bf-south-china':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

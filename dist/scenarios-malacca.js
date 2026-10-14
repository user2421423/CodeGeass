/* Battle of the Strait of Malacca — Britannia vs Chinese Federation.
   168 x 132 WGS84 maritime theatre: Malay Peninsula, Singapore, east Sumatra.
   GSHHS intermediate geography, 20–80% mixed coastal hexes; total city conquest.
   Separate from central World Campaign registry. */
(function(root){
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=168,ROWS=132,SIDES=['britannia','cf'];
  const BOUNDS={west:97.4,east:105.85,north:8.35,south:0.45};
  const K=Math.cos(4.4*Math.PI/180);
  const PROJECTION={centerLon:101.625,centerLat:4.4,angle:0,uMin:-4.225*K,uMax:4.225*K,vMin:-3.95,vMax:3.95};
  // GSHHS intermediate-level 1 polygons, 43 stratified sample points per hex;
  // 0: <20% land, 1: 20-80% mixed coastal hex, 2: >80% land.
  // RLE cells: URL-safe base64 alphabet; index mod 3 = class, floor(index/3)+1 = run.
  const COAST_DATA='wLEAE-aB_____zIBJB-aB_____zEFBJB-aB_____wHGBDB-aB_____wBCEAEG-d_____wFBDEGK-OB_____wBFGBS-RB_____tFBGBSE-L_____wBCBeE-LB_____tEhB-OB______YEAB-FB______VEAE-CB______VHDB-C______VBJB-B______YBJB-B______kB-B______kBFBCByB______kK1B______kBDByH______qBvBDE______qBAEpBFB______tB4B______qB7B______kB-CE______hB-IEGT______B-pB______AB-mB_____zBGE-m_____zEJB-mB_____SHMBCME-jB_____YBPEPE-gB_____zEJB-jB_____nBLBJB-mB_____hEIBJB-mE_____kHPB-pE_____eBCBPB-sH_____2B-4E_____qB-7B_____wB-4B_____t-7B_____tB-7B_____qB--B_____q--FBSB_____JB--IB_____eB--LE_____Y--RB_____YB--UE_____PB--aB_____DBCBAB--dB_____FE--jB____8BCBAB--jB__bB__YEDB--jB__YBCB__kB--jB__VIB__eB--mB__VLB__bB--s__SOB__YB--sB__PUB__VB--sB__MXE__PE--pB__MdB__SB--pB__JdB__SE--mB__Jg__V--s__Jg__VB--mB__JgB__SB--pB__GgH__MB--pB__GsB__J--pB__GvB__DB--p__JyB__AB--pB__GvB__AB--sB__Gy__AE--pB__GsE__DE--jB__JsH__JB--dB__JyH__DB--aB__M-E_8H--XB__J-CE_2B--dB__M-LB_zB--aB__M-LB_2B--XB__M-OB_2B--U__P-RE_zB--OB__P-dE_tB--LB__M-jB_t--OB__J-pE_nB--LB__G-sE_kB--IB__J-yE_hB--I__J-4B_hB--CB__J-7E_hB--__J--H_b--B__J--LB_VB--B__G--OB_SB-7B__J--RB_MH-7__ABD--UB_JE-7B__HAE--UB_DE--__AFBDE--O_GB--CnB_SEPB--LB_JE-7BhE_SBP--LE_MB-7BeBC_qB--LBCK_DB-7B__JB--RBFB_JE-4E__D--UBFB_SB-1B__B--g_SB-1B__A--gB_SB-1kB_YB--dB_YB-vB__AB--dBeB5B-vBDB_zQ--OBVBIB5B-s__PE--OBDBGOB5H-jB__SB--OHDBOE_E-dB__YB--REABUBPBCBnE-a__YH--OEXBABCBIBtB-XB__hB--OBXABUtB-XB__eE--IEUEUBwB-U__nB--IEUERBzK-IE__kB--gEOB_B-LB__nBAB--aHFE_DH-CB__VHJB--dT_GE-B__YHJB--vEDH8EmELB__kB--4BDBFQwBjEL_bB_J---BAEUzaBFEL_YCB_G---CEAHIBzRBCQIB_YI_GB---FEFBFBwBFHOBDBFB_YIB_DB---FABIBCzHAHFE_tLB_D---FELE_GB_zLE_A---FELB_YEGQ_GUB_---FEIEGNVBeHCBAEOB_DXB5B---FBIECBABOBPCBVELBABUB_Dd5B---CEIBFNLBMEPECEFEANIBDB5BXB5B---FEFBUBIEMBSECAKJBIBGB8ERB8B---IEaHFBJHPBABAKJBIB_GBR_B---IEdKJFBGNJBCBJECE_MBLB_B---LcFEJBFBGHPBCBJHAB_JBIB_AB---RBITMBFGEVBCBPB_SBIB_A---pBABABCBDBCBnB_nIB_DB---pHFBwB_zB_J---sBAQGBeB__8B---sBAELB__G';
  function coastMask(){
    const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const mask=new Uint8Array(COLS*ROWS);
    let p=0;
    for(const ch of COAST_DATA){
      const n=chars.indexOf(ch);
      if(n<0)throw Error('Invalid Malacca shoreline code');
      const size=Math.floor(n/3)+1,kind=n%3;
      if(p+size>mask.length)throw Error('Malacca shoreline exceeds map bounds');
      mask.fill(kind,p,p+size);p+=size;
    }
    if(p!==mask.length)throw Error('Truncated Malacca shoreline: '+p);
    return mask;
  }
  const CITIES=[["Phuket",98.392,7.88,"britannia",3,true],["Krabi",98.906,8.086,"britannia",3,true],["Trang",99.612,7.556,"britannia",3,true],["Satun",100.071,6.624,"britannia",3,true],["Hat Yai",100.47,7.01,"britannia",3,true],["Songkhla",100.59,7.197,"britannia",2,true],["Pattani",101.265,6.87,"britannia",3,true],["Yala",101.285,6.54,"britannia",2],["Narathiwat",101.82,6.43,"britannia",2],["Kangar",100.199,6.44,"cf",2,true],["Alor Setar",100.368,6.121,"cf",3,true],["Langkawi",99.8,6.31,"cf",2,true],["George Town",100.335,5.415,"cf",3,true],["Butterworth",100.367,5.4,"cf",2,true],["Taiping",100.745,4.852,"cf",2],["Ipoh",101.09,4.597,"cf",3,true],["Lumut",100.629,4.229,"cf",2,true],["Teluk Intan",101.02,4.02,"cf",2],["Kuala Selangor",101.254,3.341,"cf",2],["Port Klang",101.39,3,"cf",3,true],["Kuala Lumpur",101.693,3.139,"cf",3,true],["Seremban",101.942,2.73,"cf",2],["Port Dickson",101.79,2.527,"cf",2,true],["Malacca",102.251,2.189,"cf",3,true],["Muar",102.567,2.046,"cf",2,true],["Batu Pahat",102.931,1.85,"cf",2,true],["Kluang",103.319,2.033,"cf",2],["Johor Bahru",103.762,1.492,"cf",3,true],["Singapore",103.82,1.352,"cf",3,true],["Pasir Gudang",103.912,1.466,"cf",2,true],["Kota Bharu",102.25,6.125,"cf",3,true],["Kuala Terengganu",103.137,5.33,"cf",2,true],["Dungun",103.42,4.76,"cf",2],["Kemaman",103.425,4.236,"cf",2],["Kuantan",103.326,3.816,"cf",3,true],["Pekan",103.39,3.49,"cf",2],["Temerloh",102.422,3.45,"cf",2],["Mersing",103.842,2.429,"cf",2,true],["Medan",98.67,3.59,"cf",3,true],["Belawan",98.69,3.78,"cf",3,true],["Binjai",98.482,3.597,"cf",2],["Tebing Tinggi",99.156,3.33,"cf",2],["Pematangsiantar",99.063,2.96,"cf",2],["Kisaran",99.625,2.983,"cf",2],["Tanjungbalai",99.79,2.97,"cf",2,true],["Rantauprapat",99.83,2.1,"cf",2],["Bagansiapiapi",100.84,2.16,"cf",2,true],["Dumai",101.45,1.67,"cf",3,true],["Bengkalis",102.1,1.49,"cf",2,true],["Pekanbaru",101.45,0.54,"cf",3,true],["Selatpanjang",102.71,1.02,"cf",2,true],["Tanjung Balai Karimun",103.43,1,"cf",2,true],["Batam",104.03,1.13,"cf",3,true],["Tanjung Pinang",104.45,0.92,"cf",2,true]];
  const ARMY_GROUPS=[["britannia","Phuket","heavy",5,"cornelia"],["britannia","Phuket","rocket",3,"cecile"],["britannia","Krabi","assault",4,"guilford"],["britannia","Krabi","medium",3],["britannia","Trang","heavy",5,"bismarck"],["britannia","Trang","siege",3],["britannia","Satun","heavy",4,"darlton"],["britannia","Satun","rocket",3],["britannia","Hat Yai","heavy",5,"suzaku"],["britannia","Hat Yai","assault",4],["britannia","Songkhla","rocket",3,"jeremiah"],["britannia","Pattani","heavy",4,"oldrin"],["britannia","Pattani","siege",3],["britannia","Yala","medium",3],["britannia","Narathiwat","assault",3],["cf","Alor Setar","heavy",4,"xingke"],["cf","Alor Setar","rocket",3,"honggu"],["cf","Kangar","medium",3],["cf","George Town","heavy",4,"cao"],["cf","George Town","siege",2],["cf","Ipoh","heavy",4,"ren"],["cf","Ipoh","rocket",3],["cf","Lumut","assault",3],["cf","Kuala Lumpur","heavy",4,"chaojielun"],["cf","Kuala Lumpur","rocket",3],["cf","Port Klang","heavy",3],["cf","Malacca","heavy",4,"xianglin"],["cf","Malacca","siege",3],["cf","Port Dickson","medium",2],["cf","Johor Bahru","heavy",4,"chengzhong"],["cf","Johor Bahru","rocket",3],["cf","Singapore","heavy",5],["cf","Singapore","rocket",4],["cf","Singapore","siege",3],["cf","Pasir Gudang","assault",3],["cf","Kota Bharu","heavy",3],["cf","Kuala Terengganu","medium",3],["cf","Kuantan","heavy",3],["cf","Kuantan","rocket",2],["cf","Medan","heavy",5],["cf","Medan","rocket",3],["cf","Belawan","assault",3],["cf","Tanjungbalai","medium",3],["cf","Bagansiapiapi","heavy",3],["cf","Dumai","heavy",4],["cf","Dumai","rocket",3],["cf","Pekanbaru","heavy",4],["cf","Pekanbaru","siege",2],["cf","Bengkalis","medium",2],["cf","Batam","heavy",3],["cf","Batam","rocket",2],["cf","Tanjung Pinang","medium",2],["cf","Tanjung Balai Karimun","medium",2]];
  const PORTS={"Phuket":3,"Krabi":2,"Satun":3,"Songkhla":2,"Narathiwat":2,"Langkawi":2,"George Town":3,"Butterworth":2,"Lumut":2,"Port Klang":3,"Port Dickson":2,"Malacca":3,"Muar":2,"Batu Pahat":2,"Johor Bahru":3,"Singapore":3,"Pasir Gudang":2,"Kota Bharu":2,"Kuala Terengganu":2,"Kuantan":2,"Mersing":2,"Belawan":3,"Tanjungbalai":2,"Bagansiapiapi":2,"Dumai":3,"Bengkalis":2,"Selatpanjang":2,"Tanjung Balai Karimun":2,"Batam":3,"Tanjung Pinang":2};
  const FLEETS=[["britannia","Phuket","carrier_battleship",2],["britannia","Phuket","portman_ii",3],["britannia","Satun","carrier_battleship",2],["britannia","Satun","portman",3],["britannia","Songkhla","portman_ii",2],["britannia","Western Landing","carrier_battleship",2,99.15,5.4],["britannia","Western Landing","portman_ii",3,99.15,5.4],["britannia","Sumatra Landing","carrier_battleship",2,100.2,3.45],["britannia","Sumatra Landing","portman_ii",3,100.2,3.45],["britannia","Singapore Flank","carrier_battleship",2,103.35,1.68],["britannia","Singapore Flank","portman_ii",3,103.35,1.68],["cf","George Town","cf_carrier",2],["cf","George Town","shui_gun_ru_ii",3],["cf","Langkawi","shui_gun_ru",2],["cf","Port Klang","cf_carrier",2],["cf","Port Klang","shui_gun_ru_ii",3],["cf","Singapore","cf_carrier",3],["cf","Singapore","shui_gun_ru_ii",4],["cf","Johor Bahru","shui_gun_ru",2],["cf","Belawan","cf_carrier",2],["cf","Belawan","shui_gun_ru_ii",3],["cf","Dumai","cf_carrier",2],["cf","Dumai","shui_gun_ru_ii",3],["cf","Batam","cf_carrier",2],["cf","Batam","shui_gun_ru_ii",3]];
  const LANDINGS=[["Western Landing",[["heavy",2,"gino"],["assault",2,null]]],["Sumatra Landing",[["heavy",2,"anya"],["rocket",2,null]]],["Singapore Flank",[["heavy",2,"kewell"],["siege",2,null]]]];
  const FUNDING={britannia:{credits:810,industry:485,science:74,sakuradite:37},cf:{credits:850,industry:510,science:76,sakuradite:37}};

  function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
    lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function nearest(g,p,valid,radius=12){
    let best=null,d=Infinity;
    for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
      for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
        const t=E.tile(g,c,r);if(!t||!valid(t))continue;
        const x=E.distance(p,t,g);
        if(x<d){d=x;best=t;}
      }
    return best;
  }

  // Titiwangsa spine, southern Thai ranges, Barisan highlands; coastal plain and tropical forest.
  const MOUNTAINS=[[101.10,5.10,.55,2.10],[100.16,7.45,.45,.8],
    [100.14,2.65,.70,2.6],[99.44,4.10,.58,1.6],[98.96,2.50,.48,1.50]];
  const FORESTS=[[102.3,4.6,1.25,2.25],[99.2,3.5,1.0,2.15],
    [101.4,1.0,1.4,.7],[100.5,6.4,.9,1.2],[103.1,2.5,.65,1]];
  const LOWLANDS=[[101.55,3.1,.65,.6],[102.25,2.15,.62,.55],
    [103.75,1.5,.55,.4],[98.75,3.55,.7,.5],[101.4,1.65,.8,.5]];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>
    Math.exp(-1.6*(((p.lon-x)/w)**2+((p.lat-y)/h)**2))));}
  function landscape(p,c,r) {
    const m=density(p,MOUNTAINS),f=density(p,FORESTS),low=density(p,LOWLANDS);
    return m>.63&&low<.4?'mountain':m>.27||f>.48?'forest':'plains';
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
  function create(player='britannia',difficulty='normal',seed=201718){
    if(!SIDES.includes(player))throw Error('Unsupported Malacca faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'malacca',order:[player,...SIDES.filter(s=>s!==player)],
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
    g.scenario={id:'bf-malacca',key:'malacca',title:'Battle of the Strait of Malacca',
      version:1,phase:'britannian-strait-offensive',aiDoctrine:'europe',
      groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
      operationalFronts:[
        {name:'Northern Peninsular Breakthrough',attack:'britannia',objective:'George Town'},
        {name:'Western Strait Fleet Battle',attack:'britannia',objective:'Port Klang'},
        {name:'Sumatra Amphibious Front',attack:'britannia',objective:'Dumai'},
        {name:'Singapore Southern Approach',attack:'britannia',objective:'Singapore'},
        {name:'Penang Defensive Line',attack:'cf',objective:'George Town'},
        {name:'Singapore Strait Guard',attack:'cf',objective:'Singapore'},
        {name:'Sumatra Coastal Reserve',attack:'cf',objective:'Dumai'}
      ],
      chokepoint:{name:'Strait of Malacca',westernGate:[99.25,5.45],
        centralGate:[101.2,3.4],southernGate:[103.35,1.62],
        note:'Naval control offers fleet access and local firepower; no global blockade or automatic Indonesian supply cut.'}};
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
    const mask=coastMask();
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,v=mask[i];
      return {c,r,owner:null,terrain:v===0?'sea':v===1?'coast':landscape(geo(c,r),c,r)};
    });
    // The main shipping lane is real open sea, not a scripted blockade.
    // Mixed coastal cells remain passable for land and warships as in the core engine.
    // Select the largest contiguous sea component. Narrow landlocked lagoons
    // must never masquerade as military harbours or trap task forces.
    const mainWater=(()=>{
      const visited=new Uint8Array(g.tiles.length);
      let largest=[];
      for(let i=0;i<g.tiles.length;i++){
        if(visited[i]||g.tiles[i].terrain!=='sea')continue;
        const flood=[g.tiles[i]];visited[i]=1;
        for(let j=0;j<flood.length;j++)for(const next of E.adjacent(g,flood[j])){
          const k=next.r*COLS+next.c;
          if(visited[k]||next.terrain!=='sea')continue;
          visited[k]=1;flood.push(next);
        }
        if(flood.length>largest.length)largest=flood;
      }
      if(largest.length<100)throw Error('Malacca regional shipping channel not navigable');
      return new Set(largest.map(E.key));
    })();
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'&&mainWater.has(E.key(n))))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Malacca city '+name);
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
      const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&mainWater.has(E.key(t))&&!taken.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(n=>n.terrain==='sea').length-
          E.adjacent(g,a).filter(n=>n.terrain==='sea').length)[0];
      if(!at)throw Error('Cannot place naval port '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      taken.add(E.key(at));
    }
    const activePortHexes=new Set(g.stations.filter(v=>v.portAt).map(v=>E.key(v.portAt)));
    for(const [side,name,type,count,lon,lat] of FLEETS){
      const city=g.stations.find(v=>v.name===name);
      const anchor=city||locate(lon,lat);
      if(!anchor||!E.TYPES[type]?.naval)throw Error('Invalid Malacca fleet '+name+' '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,anchor,t=>t.terrain==='sea'&&mainWater.has(E.key(t))&&!E.unitAt(g,t)&&
          !activePortHexes.has(E.key(t)),22);
        if(!at)throw Error('Cannot deploy fleet '+name);
        const ship=E.newUnit(g,type,side,at.c,at.r);
        if(side==='britannia'&&!city&&type==='carrier_battleship')ship.invasionGroup=name;
        fleet.units.push(ship.id);
      }
      g.scenario.groups.push(fleet);
    }
    // Three distinct amphibious attacks: peninsular west coast, Sumatra, Singapore.
    const passengers=[];
    for(const [name,formations] of LANDINGS){
      const carriers=g.units.filter(u=>u.side==='britannia'&&u.invasionGroup===name&&
        E.TYPES[u.type].naval==='ship'&&E.TYPES[u.type].capacity>0);
      const group={id:'army-'+g.scenario.groups.length,side:'britannia',
        name:name+' Amphibious Command',origin:name,units:[]};
      for(const [cls,count,commander] of formations)for(let i=0;i<count;i++){
        const carrier=carriers.find(u=>(u.pendingPassengers||0)<E.TYPES[u.type].capacity);
        if(!carrier)throw Error('Insufficient Malacca carrier capacity: '+name);
        carrier.pendingPassengers=(carrier.pendingPassengers||0)+1;
        const cmd=i===0?commander:null;
        const unit=E.newUnit(g,E.typeFor('britannia',cls,g),'britannia',
          carrier.c,carrier.r,i===0?3:2,cmd);
        if(cmd&&g.officers[cmd]){unit.cmdRank=g.officers[cmd].rank;unit.hp=E.maxHP(unit);}
        group.units.push(unit.id);passengers.push({carrier,unit});
      }
      g.scenario.groups.push(group);
    }
    // Scenario-local Elite conversion. Standard faction rosters, no new unit definitions
    // or changes to the global Elite preparation whitelist.
    if(difficulty==='elite'){
      const usage=new Map();
      for(const u of g.units){
        const old=E.TYPES[u.type];
        if(old.naval==='ship')continue; // carriers remain ordinary naval hulls
        const eligible=g.scenario.eliteRosters[u.side];
        const candidates=eligible.filter(id=>{
          const type=E.TYPES[E.ELITE_FORCES[id].type];
          return old.naval ? type?.naval===old.naval :
            !type?.naval&&type?.cls===old.cls;
        });
        const land=eligible.filter(id=>!E.TYPES[E.ELITE_FORCES[id].type]?.naval);
        const pool=candidates.length?candidates:old.naval?[]:land;
        if(!pool.length)continue;
        const key=u.side+':'+old.cls+':'+(old.naval||'land');
        const index=usage.get(key)||0;usage.set(key,index+1);
        const id=pool[index%pool.length];
        u.type=E.ELITE_FORCES[id].type;u.elite=id;
        u.eliteLevel=u.side===player?1:u.cmd?5:3;
        u.stack=1;u.eliteStart=true;
        if(u.cmd&&u.side!==player&&g.officers[u.cmd]){
          g.officers[u.cmd].rank=E.RANKS.length-1;
          u.cmdRank=E.RANKS.length-1;
        }
        u.hp=E.maxHP(u);
      }
      for(const city of g.stations)city.tier=Math.max(2,city.tier);
      for(const side of SIDES.filter(v=>v!==player))
        g.tech[side]=Object.fromEntries(Object.keys(E.TECH_NODES).map(k=>[k,4]));
    }
    for(const {carrier,unit} of passengers){
      (carrier.cargo||=[]).push(unit);
      g.units.splice(g.units.indexOf(unit),1);
    }
    for(const carrier of g.units)delete carrier.pendingPassengers;
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
    g.startUnits=Object.fromEntries(SIDES.map(side=>[side,E.allUnits(g).filter(u=>u.side===side).length]));
    E.log(g,'Britannia strikes from southern Thailand while fleets contest Malacca and land on Sumatra and the Singapore approaches. China defends both shores and the shipping channel.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Capture every city on the Malay Peninsula, Singapore and Sumatra ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='bf-malacca'||
      g.stations.length!==CITIES.length)return null;
    for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
      return {winner:side,reason:E.FACTIONS[side].name+
        ' has conquered every city in the Malacca theatre.'};
    return null;
  }
  const api={id:'bf-malacca',title:'Battle of the Strait of Malacca',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,fleetData:FLEETS,ports:PORTS,landings:LANDINGS,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  E.scenarios={...(E.scenarios||{}),malacca:api,
    byId:{...(E.scenarios?.byId||{}),'bf-malacca':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

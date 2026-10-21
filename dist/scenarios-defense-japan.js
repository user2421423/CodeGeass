/* Defense of Japan — Black Knights defend the full existing Japan map from a
   cityless Britannian carrier invasion. Existing Japan variants are untouched. */
(function (root) {
  'use strict';
  const E = root.Knightmare || (typeof require === 'function' ? require('./engine.js') : null);
  const japan = E.scenarios?.japan || (typeof require === 'function' ? require('./scenarios.js') : null);
  if (!japan) throw new Error('Defense of Japan requires the original Japan scenario');
  const SIDES = Object.freeze(['bk', 'britannia']);
  const TITLE = 'Defense of Japan';
  const CITY_COUNT = japan.cityData.length;

  // All 29 defenders deploy ashore as two-frame formations (58 land frames).
  // Other cities retain their existing defenses, factories and production.
  // [city, class, count, optional first-formation commander]
  const DEFENDERS = Object.freeze([
    ['Sapporo','medium',2,'tohdoh'], ['Sapporo','rocket',1],
    ['Aomori','scout',1], ['Sendai','assault',2,'asahina'],
    ['Niigata','rocket',1,'chiba'],
    ['Tokyo Settlement','heavy',2,'zero'], ['Yokohama','medium',1,'kallen'],
    ['Saitama','assault',1], ['Nagoya','medium',2,'ohgi'],
    ['Kanazawa','rocket',1], ['Kyoto','heavy',1],
    ['Osaka','medium',2], ['Kobe','assault',1], ['Nara','support',1],
    ['Hiroshima','medium',2], ['Shimonoseki','assault',2],
    ['Takamatsu','light',1], ['Matsuyama','assault',1],
    ['Fukuoka','medium',2], ['Nagasaki','rocket',1],
    ['Kagoshima','assault',1]
  ]);
  // Eleven ships across the five threatened coasts: five carrier hulls and
  // six amphibious interceptors. Ports and inland land formations stay intact.
  const DEFENDER_FLEETS = Object.freeze([
    ['Sapporo','bk_carrier',1], ['Sendai','bk_carrier',1],
    ['Tokyo Settlement','bk_carrier',1], ['Yokohama','bk_carrier',1],
    ['Osaka','bk_carrier',1], ['Fukuoka','bk_amphibious_ii',2],
    ['Shimonoseki','bk_amphibious_ii',1], ['Hiroshima','bk_amphibious_ii',1],
    ['Matsue','bk_amphibious_ii',1], ['Nagasaki','bk_amphibious_ii',1]
  ]);
  // Every Britannian formation starts as one of two embarked troops per
  // carrier. There are NO Britannian cities, land units or escorts on the map.
  // Each named flotilla deploys together in the existing Japan coastal sea.
  const INVASIONS = Object.freeze([
    {name:'Northern Landing Force',anchor:'Sapporo',troops:[
      ['medium','cornelia'],['assault'],['heavy'],['rocket'],
      ['medium'],['light'],['assault'],['support']]},
    {name:'Tohoku Landing Force',anchor:'Sendai',troops:[
      ['medium','guilford'],['assault'],['heavy'],['rocket'],
      ['medium'],['light'],['assault'],['support']]},
    {name:'Kanto Landing Force',anchor:'Chiba',troops:[
      ['heavy','suzaku'],['medium'],['assault'],['rocket'],
      ['medium','jeremiah'],['heavy'],['light'],['assault']]},
    {name:'Western Honshu Landing Force',anchor:'Matsue',troops:[
      ['medium','darlton'],['assault'],['heavy'],
      ['rocket'],['medium'],['light']]},
    {name:'Kyushu Landing Force',anchor:'Nagasaki',troops:[
      ['medium','villetta'],['assault'],['heavy'],
      ['rocket'],['medium'],['light']]}
  ]);
  const TARGET_INCOME = Object.freeze({
    bk:{credits:620,industry:350,science:65,sakuradite:32},
    britannia:{credits:540,industry:330,science:55,sakuradite:26}
  });
  function nearest(g, origin, valid, radius=14) {
    let best=null, distance=Infinity;
    for (let r=Math.max(0,origin.r-radius);r<=Math.min(g.rows-1,origin.r+radius);r++)
      for (let c=Math.max(0,origin.c-radius);c<=Math.min(g.cols-1,origin.c+radius);c++) {
        const t=E.tile(g,c,r);
        if(!t || !valid(t)) continue;
        const d=E.distance(origin,t,g);
        if(d<distance){best=t;distance=d;}
      }
    return best;
  }
  function coastalDepth(g) {
    const depth=new Int16Array(g.tiles.length).fill(-1), queue=[];
    for (const t of g.tiles) if (t.terrain!=='sea' && t.terrain!=='offmap') {
      depth[t.r*g.cols+t.c]=0;queue.push(t);
    }
    for (let i=0;i<queue.length;i++) {
      const t=queue[i], next=depth[t.r*g.cols+t.c]+1;
      for(const n of E.adjacent(g,t)) {
        const k=n.r*g.cols+n.c;
        if(n.terrain==='sea' && depth[k]<0){depth[k]=next;queue.push(n);}
      }
    }
    return depth;
  }
  function create(player='bk',difficulty='normal',seed=246801) {
    if(!SIDES.includes(player))throw new Error('Unsupported Defense of Japan faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    // Reuse the complete 110x84 Japan theatre (44 cities, island-aware
    // provinces, terrain, coastline, ports and Sakuradite sites).
    const g=japan.create(player,'normal',seed);
    const cities=new Map(g.stations.map(s=>[s.name,s]));
    g.startUnits=null; // Do not localize income before our own setup is complete.
    g.player=player;g.difficulty=difficulty;g.era='defense-japan';
    g.order=[player,...SIDES.filter(s=>s!==player)];
    g.phase=player;g.teams=null;g.fallen={};
    g.arsenal={bk:0,britannia:0};
    g.economy={neutral:{credits:0,industry:0,science:0,sakuradite:0}};
    g.tech={neutral:{}};
    for(const side of SIDES){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[side]={};
    }
    g.scenario={
      id:'defense-japan',title:TITLE,version:1,phase:'carrier-invasion',
      groups:[],funding:{},citylessFunding:['britannia'],
      citylessWarChestTurns:3, // This invasion's finite reserve; other scenarios keep the global default.
      bounds:japan.bounds,projection:g.scenario.projection,
      coastalSea:g.scenario.coastalSea
    };
    // No hidden enemy beachheads or neutral settlements: every Japanese city,
    // island province and original harbor belongs to the Black Knights.
    for(const s of g.stations){
      s.owner='bk';s.capitalOf=s.capital?'bk':null;
      if(s.portAt)s.portOwner='bk';
    }
    for(const t of g.tiles)if(t.provinceCity!=null)t.owner='bk';
    g.units=[];g.nextId=1;
    const groups=new Map();
    function landGroup(side, name) {
      const key=side+':'+name;
      if(!groups.has(key)){
        const group={id:'army-'+groups.size,side,name:name+' Command',
          origin:name,units:[]};
        groups.set(key,group);g.scenario.groups.push(group);
      }
      return groups.get(key);
    }
    for(const [name,cls,count,commander] of DEFENDERS) {
      const city=cities.get(name);
      if(!city)throw Error('Missing Japanese defender city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,city,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
          t.owner==='bk'&&!E.unitAt(g,t)&&
          (!E.stationAt(g,t)||E.stationAt(g,t).owner==='bk'),10);
        if(!at)throw Error('No defender deployment hex at '+name);
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor('bk',cls,g),'bk',at.c,at.r,
          2,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        landGroup('bk',name).units.push(u.id);
      }
    }
    const takenPorts=new Set(g.stations.filter(s=>s.portAt).map(s=>E.key(s.portAt)));
    for(const [name,type,count] of DEFENDER_FLEETS) {
      const city=cities.get(name);
      if(!city || !E.TYPES[type]?.naval)throw Error('Invalid defender fleet '+name+' '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side:'bk',
        name:name+' Defense Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,city,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !takenPorts.has(E.key(t)),12);
        if(!at)throw Error('No Black Knights fleet sea tile near '+name);
        fleet.units.push(E.newUnit(g,type,'bk',at.c,at.r).id);
      }
      g.scenario.groups.push(fleet);
    }
    const depth=coastalDepth(g), passengers=[];
    for(const invasion of INVASIONS){
      const city=cities.get(invasion.anchor);
      if(!city || invasion.troops.length%2)throw Error('Invalid invasion at '+invasion.anchor);
      const fleet={id:'fleet-'+g.scenario.groups.length,side:'britannia',
        name:invasion.name+' Fleet',origin:invasion.anchor,units:[]};
      const army={id:'army-'+g.scenario.groups.length,side:'britannia',
        name:invasion.name,origin:invasion.anchor,units:[]};
      for(let i=0;i<invasion.troops.length;i+=2){
        const available=t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !takenPorts.has(E.key(t));
        // Begin offshore, rather than already in a defending harbor. The
        // original Japan map has a four-hex navigable coastal belt.
        const at=nearest(g,city,t=>available(t)&&depth[t.r*g.cols+t.c]>=2,14)
          ||nearest(g,city,available,14);
        if(!at)throw Error('No carrier staging sea near '+invasion.anchor);
        const ship=E.newUnit(g,'carrier_battleship','britannia',at.c,at.r);
        ship.invasionGroup=invasion.name;
        fleet.units.push(ship.id);
        for(const [cls,cmd] of invasion.troops.slice(i,i+2)){
          const u=E.newUnit(g,E.typeFor('britannia',cls,g),
            'britannia',ship.c,ship.r,2,cmd||null);
          if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
          passengers.push({ship,u});
          army.units.push(u.id);
        }
      }
      g.scenario.groups.push(fleet,army);
    }
    // Convert land formations while temporarily in g.units, as in existing
    // amphibious scenarios. Carrier hulls remain normal on Elite difficulty.
    if(difficulty==='elite')E.prepareEliteJapan(g);
    for(const {ship,u} of passengers){
      (ship.cargo||=[]).push(u);
      g.units.splice(g.units.indexOf(u),1);
    }
    // Keep the existing economic model: income is localized to the cities
    // after setup, while a cityless invader receives a finite war chest.
    for(const side of SIDES){
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(TARGET_INCOME[side]).map(([key,value])=>
          [key,Math.max(0,Math.round(value)-base[key])]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(TARGET_INCOME[side]))
        g.economy[side][resource]=actual[resource]*(side==='britannia'?3:2);
    }
    if(difficulty!=='normal'&&difficulty!=='elite')
      for(const side of SIDES.filter(s=>s!==player))
        for(const u of g.units.flatMap(v=>[v,...(v.cargo||[])])
          .filter(v=>v.side===side&&E.TYPES[v.type].naval!=='ship'))
          E.addDifficultyFrames(u,difficulty);
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(side=>[side,
      g.units.reduce((n,u)=>n+(u.side===side?1:0)+
        (u.cargo||[]).filter(v=>v.side===side).length,0)]));
    g.mapRevision=(g.mapRevision||0)+1;
    E.log(g,'The Black Knights hold all Japan. Britannian carrier fleets approach five coasts with no foothold ashore.',player);
    return g;
  }
  function objective(g,side=g.player){
    const bkCities=g.stations.filter(s=>s.owner==='bk').length;
    const britCities=g.stations.filter(s=>s.owner==='britannia').length;
    const invaders=g.units.filter(u=>u.side==='britannia'&&u.hp>0).length;
    return side==='bk'
      ?'Defend all of Japan and eliminate the Britannian invasion ('+
        bkCities+'/'+CITY_COUNT+' cities held; '+invaders+' invading units at large).'
      :'Land carrier troops and capture all '+CITY_COUNT+' Japanese cities ('+
        britCities+'/'+CITY_COUNT+' captured).';
  }
  function winner(g) {
    if(g.mode!=='scenario'||g.scenario?.id!=='defense-japan'||
      g.stations.length!==CITY_COUNT)return null;
    if(g.stations.every(s=>s.owner==='britannia'))
      return {winner:'britannia',team:'britannia',
        reason:'Britannia has conquered every city in Japan.'};
    if(!g.stations.some(s=>s.owner==='britannia')&&
      !g.units.some(u=>u.side==='britannia'&&u.hp>0))
      return {winner:'bk',team:'bk',
        reason:'The Black Knights have destroyed the Britannian invasion and defended Japan.'};
    return null;
  }
  const api={id:'defense-japan',title:TITLE,cols:japan.cols,rows:japan.rows,
    sides:SIDES,bounds:japan.bounds,cityData:japan.cityData,
    create,onTurn:()=>false,objective,winner,
    strategicScore:japan.strategicScore,orderGroup:japan.orderGroup};
  api.meta={
    elite:'japan',saveVersion:1,expeditionSide:'britannia',
    groupsStartEmbarked:true,
    ai:{doctrine:'invasion',synchronizedFlotillas:true},
    text:{
      era:'Japan · Alternate 2017',
      intro:'The Black Knights defend all 44 Japanese cities with reinforced garrisons and eleven ships. Britannia arrives in loaded carriers with no bases ashore and a three-turn reserve.',
      diplomacy:'The Black Knights and Britannia are enemies from turn 1. Capture all cities as Britannia, or destroy the cityless invasion as the Black Knights.',
      elite:'Elite Japan upgrades eligible land formations to faction Elite Forces while carriers remain conventional. Existing Elite difficulty research and commander rules apply.',
      focus:{bk:'Tokyo Settlement',britannia:''}
    },
    blurbs:{
      bk:'Defend the Japanese home islands, hold key ports and repel five Britannian landing forces.',
      britannia:'Launch landings from 18 loaded carriers without a single starting city; seize harbors to establish production.'
    }
  };
  E.scenarios={...E.scenarios,defenseJapan:api,
    byId:{...(E.scenarios.byId||{}),'invasion-japan':japan,'defense-japan':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

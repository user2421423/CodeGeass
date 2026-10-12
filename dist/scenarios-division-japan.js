/* The Division of Japan · 2017 a.t.b. · three-way alternate-history conquest.
   Reuses the existing 44-city Japan theatre, without altering Invasion of Japan. */
(function(root) {
  'use strict';
  const E = root.Knightmare || (typeof require === 'function' ? require('./engine.js') : null);
  const japan = E.scenarios?.japan || (typeof require === 'function' ? require('./scenarios.js') : null);
  if (!japan) throw new Error('Division of Japan requires the original Japan scenario to load first');

  const SIDES = Object.freeze(['britannia', 'eu', 'cf']);
  // Every one of the existing 44 cities appears exactly once. Northern Kanto
  // coastal enclaves (Chiba/Narita) give Europia a second offensive front.
  const REGIONS = Object.freeze({
    eu: [
      'Sapporo','Hakodate','Asahikawa','Kushiro',
      'Aomori','Morioka','Akita','Sendai','Fukushima',
      'Niigata','Chiba','Narita'
    ],
    britannia: [
      'Tokyo Settlement','Yokohama','Saitama','Kofu','Mount Fuji',
      'Nagano','Shizuoka','Hamamatsu','Kanazawa','Nagoya',
      'Kyoto','Osaka','Kobe','Nara','Wakayama'
    ],
    cf: [
      'Takamatsu','Matsuyama','Kochi','Tottori','Okayama',
      'Hiroshima','Matsue','Yamaguchi','Shimonoseki',
      'Kitakyushu','Fukuoka','Nagasaki','Sasebo','Oita',
      'Kumamoto','Miyazaki','Kagoshima'
    ],
  });
  const OWNERS = Object.fromEntries(Object.entries(REGIONS)
    .flatMap(([side, cities]) => cities.map(name => [name, side])));
  if (Object.keys(OWNERS).length !== 44 ||
      japan.cityData.some(([name]) => !OWNERS[name]))
    throw new Error('Division of Japan must allocate all 44 map cities exactly once');

  // [staging city, class, count, named commander for first formation].
  // 24 ground formations per power; four commanders each; four naval units.
  const LAND = Object.freeze({
    britannia: [
      ['Tokyo Settlement','medium',2,'suzaku'],['Tokyo Settlement','heavy',2,'cornelia'],
      ['Nagoya','assault',2,'guilford'],['Nagoya','medium',2],
      ['Kyoto','medium',2,'darlton'],['Kyoto','light',2],
      ['Osaka','rocket',2],['Osaka','heavy',2],
      ['Kanazawa','medium',2],['Kanazawa','support',2],
      ['Shizuoka','light',2],['Shizuoka','scout',2],
    ],
    eu: [
      ['Sapporo','medium',2,'leila'],['Sapporo','support',2],
      ['Sendai','assault',2,'akito'],['Sendai','medium',2],
      ['Niigata','medium',2,'ryo'],['Niigata','rocket',2],
      ['Aomori','scout',2,'ayano'],['Aomori','assault',2],
      ['Chiba','assault',2],['Chiba','medium',2],
      ['Narita','rocket',2],['Narita','light',2],
    ],
    cf: [
      ['Hiroshima','medium',2,'xingke'],['Hiroshima','assault',2],
      ['Shimonoseki','medium',2,'xianglin'],['Shimonoseki','rocket',2],
      ['Okayama','medium',2,'honggu'],['Okayama','scout',2],
      ['Matsue','support',2],['Matsue','assault',2],
      ['Fukuoka','heavy',2,'cao'],['Fukuoka','medium',2],
      ['Kumamoto','light',2],['Kumamoto','rocket',2],
    ]
  });
  const NAVY = Object.freeze({
    britannia: [
      ['Yokohama','carrier_battleship'],['Osaka','carrier_battleship'],
      ['Kobe','portman_ii'],['Kobe','portman']
    ],
    eu: [
      ['Sapporo','eu_carrier'],['Sendai','panzer_frosch_ii'],
      ['Niigata','panzer_frosch'],['Chiba','panzer_frosch']
    ],
    cf: [
      ['Fukuoka','cf_carrier'],['Nagasaki','cf_carrier'],
      ['Kitakyushu','shui_gun_ru_ii'],['Hiroshima','shui_gun_ru']
    ],
  });
  const PORT_ADDITIONS = Object.freeze({
    Sapporo: 2, Sendai: 2, Niigata: 2, Chiba: 2
  });
  // Keep the industrial core desirable but offset China's territorial depth and
  // Europia's smaller northern economy with fixed off-map wartime support.
  const INCOME_TARGETS = Object.freeze({
    britannia: {credits:420,industry:230,science:43,sakuradite:25},
    eu: {credits:365,industry:200,science:40,sakuradite:19},
    cf: {credits:390,industry:210,science:40,sakuradite:20},
  });
  const RESERVES = Object.freeze({britannia:2,eu:3,cf:3});

  function nearby(g,origin,allowed,radius) {
    let best=null,dist=Infinity;
    for (const t of g.tiles) {
      if (Math.abs(t.c-origin.c)>radius || Math.abs(t.r-origin.r)>radius || !allowed(t)) continue;
      const d=E.distance(origin,t,g);
      if (d<dist) {best=t;dist=d;}
    }
    return best;
  }
  function create(player='britannia',difficulty='normal',seed=246801) {
    if (!SIDES.includes(player)) throw new Error('Unsupported Division of Japan faction: '+player);
    // Elite uses the same conversion and AI rules as the Invasion variant.
    if (!['normal','hard','challenge','elite'].includes(difficulty)) difficulty='normal';
    const g=japan.create('britannia','normal',seed);
    const cityByName=new Map(g.stations.map(s=>[s.name,s]));
    g.player=player;
    g.order=[player,...SIDES.filter(s=>s!==player)];
    g.phase=player;
    g.difficulty=difficulty;
    g.era='division-japan';
    g.teams=null;
    g.fallen={};
    g.arsenal={britannia:0,eu:0,cf:0};
    g.factions={};
    g.lineup={};
    g.economy={neutral:{credits:0,industry:0,science:0,sakuradite:0}};
    g.tech={neutral:{}};
    for (const side of SIDES) {
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[side]={};
    }
    g.scenario={
      id:'division-japan',title:'The Division of Japan',phase:'three-way-war',
      year:'2017 a.t.b.',groups:[],funding:{},
      bounds:japan.bounds,projection:g.scenario.projection,
      coastalSea:g.scenario.coastalSea
    };
    for (const s of g.stations) {
      s.owner=OWNERS[s.name];
      s.capitalOf=({Sapporo:'eu','Tokyo Settlement':'britannia',Fukuoka:'cf'})[s.name]||null;
      s.capital=!!s.capitalOf;
      if(s.portAt) s.portOwner=s.owner;
    }
    // Preserve island-aware provinces; update only political ownership.
    for(const t of g.tiles)
      if(t.provinceCity!==undefined && t.provinceCity!==null)
        t.owner=g.stations[t.provinceCity].owner;

    // New northern and Pacific harbours ensure the E.U. has fleet production,
    // not merely starting ships. Original Japan ports remain unchanged.
    const taken=new Set(g.stations.filter(s=>s.portAt).map(s=>E.key(s.portAt)));
    for(const [name,level] of Object.entries(PORT_ADDITIONS)) {
      const s=cityByName.get(name);
      const at=nearby(g,s,t=>t.terrain==='sea'&&!taken.has(E.key(t)),12);
      if(!at) throw new Error('No navigable Division port near '+name);
      s.portAt={c:at.c,r:at.r};
      s.portLevel=level;
      s.portOwner=s.owner;
      taken.add(E.key(at));
    }

    g.units=[];
    g.nextId=1;
    for(const side of SIDES) {
      for(const [cityName,cls,count,commander] of LAND[side]) {
        const s=cityByName.get(cityName);
        if(s.owner!==side)throw new Error('Foreign staging city: '+side+' '+cityName);
        const group={id:'army-'+g.scenario.groups.length,side,
          name:cityName+' Command',origin:cityName,units:[]};
        for(let i=0;i<count;i++) {
          const at=nearby(g,s,t=>t.owner===side && t.terrain!=='sea' &&
            t.terrain!=='offmap' && !E.unitAt(g,t) &&
            (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),9);
          if(!at)throw new Error('No free deployment tile for '+side+' '+cityName);
          const cmd=i===0&&commander?commander:null;
          const unit=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?2:1,cmd);
          if(cmd && g.officers[cmd]) {
            unit.cmdRank=g.officers[cmd].rank;
            unit.hp=E.maxHP(unit);
          }
          group.units.push(unit.id);
        }
        g.scenario.groups.push(group);
      }
    }
    for(const side of SIDES)
      for(const [cityName,type] of NAVY[side]){
        const s=cityByName.get(cityName);
        if(s.owner!==side)throw new Error('Foreign fleet harbour: '+side+' '+cityName);
        if(!E.TYPES[type]?.naval)throw new Error('Unknown fleet unit: '+type);
        const at=nearby(g,s,t=>t.terrain==='sea'&&!E.unitAt(g,t) &&
          !g.stations.some(st=>st.portAt?.c===t.c&&st.portAt?.r===t.r),12);
        if(!at)throw new Error('No free naval deployment near '+cityName);
        const unit=E.newUnit(g,type,side,at.c,at.r);
        g.scenario.groups.push({id:'fleet-'+g.scenario.groups.length,side,
          name:cityName+' Fleet',origin:cityName,units:[unit.id]});
      }

    // Same Elite Japan upgrade, research, single-frame and commander rules;
    // the three-way scenario provides its own E.U. roster and coastal deployments.
    if (difficulty === 'elite') E.prepareEliteJapan(g);

    // Same difficulty convention as the original: rivals receive stronger
    // economy and stacks on Hard/Challenge, with no hidden player penalty.
    for(const side of SIDES) {
      const factor=side===player?1:(difficulty==='challenge'||difficulty==='elite')?1.6:difficulty==='hard'?1.3:1;
      const before=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(Object.entries(INCOME_TARGETS[side])
        .map(([resource,target])=>[resource,Math.max(0,Math.round(target*factor)-before[resource])]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(actual))
        g.economy[side][resource]=actual[resource]*RESERVES[side];
    }
    if(difficulty!=='normal' && difficulty!=='elite')
      for(const side of SIDES.filter(s=>s!==player))
        for(const [i,u] of g.units.filter(u=>u.side===side&&!E.TYPES[u.type].naval).entries())
          if(difficulty==='challenge'||i%2===0) {
            u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);
          }

    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    g.mapRevision=(g.mapRevision||0)+1;
    E.log(g,'Alternate 2017: Japan is divided among Europia, Britannia, and the Chinese Federation. All three powers are at war.',player);
    return g;
  }
  function objective(g,side=g.player) {
    return 'Conquer all 44 Japanese cities ('+
      g.stations.filter(s=>s.owner===side).length+'/44 controlled).';
  }
  function winner(g) {
    if(g.mode!=='scenario'||g.scenario?.id!=='division-japan'||g.stations.length!==44)return null;
    for(const side of SIDES)
      if(g.stations.every(s=>s.owner===side))
        return {winner:side,reason:E.FACTIONS[side].name+' has conquered all 44 cities in Japan.'};
    return null;
  }
  const api={id:'division-japan',title:'The Division of Japan',cols:japan.cols,
    rows:japan.rows,sides:SIDES,bounds:japan.bounds,cityData:japan.cityData,
    regions:REGIONS,land:LAND,navy:NAVY,create,
    onTurn:()=>false,objective,winner,
    strategicScore:japan.strategicScore,orderGroup:japan.orderGroup};
  E.scenarios={...E.scenarios,divisionJapan:api,
    byId:{...(E.scenarios.byId||{}),'invasion-japan':japan,'division-japan':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

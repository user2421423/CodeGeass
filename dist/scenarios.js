/* Scenario Mode: the 2017 alternate-history Chinese Federation invasion of Japan.
   Stage one: local Japan geography, cities, and the three starting armies.
   NOAA/GSHHS intermediate-resolution Japanese island landmask; 112 x 88 hexes.
   Encoded as packed bits (row-major, most-significant-bit first), keeping the asset small. */
(function (root) {
  'use strict';
  const E = root.Knightmare || (typeof require === 'function' ? require('./engine.js') : null);
  const COLS = 112, ROWS = 88;
  const BOUNDS = { west: 126.5, east: 146.5, north: 45.8, south: 29.0 };
  const LAND_BITS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAAAE8AAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAfwAAAAAAAAAAAAAAAAB/gABAAAAAAAAAAAAAAH/gAIAAAAAAAAAAAAAA//4QAAAAAAAAAAAAAAD///AAAAAAAAAAAAAAA///4AAAAAAAAAAAAAAB///4AAAAAAAAAAAAAEH///QAAAAAAAAAAAAAP///8AAAAAAAAAAAAAB///gAAAAAAAAAAAAAAP//8AAAAAAAAAAAAAADnD/AAAAAAAAAAAAAAAOAB8AAAAAAAAAAAAAAAcABgAAAAAAAAAAAAAAA+AAAAAAAAAAAAAAAAAHIAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAABiAAAAAAAAAAAAAAAAAGIAAAAAAAAAAAAAAAAAfgAAAAAAAAAAAAAAAAP+AAAAAAAAAAAAAAAAAf+AAAAAAAAAAAAAAAAB/4AAAAAAAAAAAAAAAAH/wAAAAAAAAAAAAAAAAf/AAAAAAAAAAAAAAAAA/+AAAAAAAAAAAAAAAAH/wAAAAAAAAAAAAAAAAf/AAAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAP/AAAAAAAAAAAAAAAAB/4AAAAAAAAAAAAAAAAH/wAAAAAAAAAAAAAAAg/4AAAAAAAAAAAAAAACD/gAAAAAAAAAAAAAAAR/8AAAAAAAAAAAAAAAAH/4AAAAAAAAAAAAAAEB//gAAAAAAAAAAAAABwH/+AAAAAAAAAAAAAAED//wAAAAAAAAAAAAAAZ///AAAAAAAAAAAAAAB///4AAAAAAAAAAAAAAP///gAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAP///4AAAAAAAAAAAAAB////gAAAAAAAAAAAAAD////AAAAAAAAAAAMH8///8wAAAAAAAAAAB//////nAAAAAAAAAAAf/////w4AAAAAAAAAAD///+/5AAAAAAAAAAAA////2/MAAAAAAAAAAAH/+A/kAAAAAAAAAAAAF/4An/AAAAAAAAAAAAAfyD6fwAAAAAAAAAAAACzEfj8AAAAAAAAAAAAIYAf/HwAAAAAAAAAAAALiH/wcAAAAAAAAAAAAB/4/iAAAAAAAAAAAAAA//h4AAAAAAAAAAAAAAA7/ngAAAAAAAAAAAAAABP8MAAAAAAAAAAAAAAABfwAAAAAAAAAAAAAAAAN+AAAAAAAAAAAAAAAAAn4AAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAH8AAAAAAAAAAAAAAAAAbwAAAAAAAAAAAAAAAAAvAAAAAAAAAAAAAAAAAOwAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const SIDES = ['britannia', 'bk', 'cf'];
  // [city, longitude, latitude, owner, tier, fortress]; each is snapped to dry land.
  const CITIES = [
    ['Sapporo',141.35,43.06,'britannia',2], ['Hakodate',140.73,41.77,'britannia',1],
    ['Asahikawa',142.37,43.77,'britannia',1], ['Kushiro',144.38,42.98,'britannia',1],
    ['Aomori',140.74,40.82,'britannia',1], ['Morioka',141.15,39.70,'britannia',1],
    ['Akita',140.10,39.72,'britannia',1], ['Sendai',140.87,38.27,'britannia',2],
    ['Niigata',139.04,37.92,'britannia',2], ['Fukushima',140.47,37.76,'britannia',1],
    ['Tokyo Settlement',139.69,35.68,'britannia',3,true],
    ['Yokohama',139.64,35.45,'britannia',2],
    ['Chiba',140.12,35.61,'britannia',1], ['Narita',140.31,35.78,'bk',1],
    ['Saitama',139.65,35.86,'britannia',1],
    ['Kofu',138.57,35.66,'britannia',1], ['Mount Fuji',138.73,35.36,'britannia',2,true],
    ['Nagano',138.19,36.65,'bk',1], ['Shizuoka',138.38,34.98,'britannia',1],
    ['Hamamatsu',137.73,34.71,'britannia',1], ['Kanazawa',136.66,36.56,'britannia',1],
    ['Nagoya',136.91,35.18,'britannia',2],
    ['Kyoto',135.77,35.01,'bk',2,true], ['Osaka',135.50,34.69,'britannia',3,true],
    ['Kobe',135.20,34.69,'britannia',2], ['Nara',135.80,34.68,'bk',1],
    ['Wakayama',135.17,34.23,'britannia',1],
    ['Takamatsu',134.05,34.34,'britannia',1], ['Matsuyama',132.77,33.84,'britannia',1],
    ['Kochi',133.53,33.56,'britannia',1],
    ['Tottori',134.24,35.50,'britannia',1], ['Okayama',133.93,34.66,'britannia',1],
    ['Hiroshima',132.46,34.39,'britannia',2], ['Matsue',133.05,35.47,'bk',1],
    ['Yamaguchi',131.47,34.18,'britannia',1], ['Shimonoseki',130.94,33.96,'britannia',1],
    ['Kitakyushu',130.88,33.88,'cf',2,true], ['Fukuoka',130.40,33.59,'cf',3,true],
    ['Nagasaki',129.88,32.75,'cf',2], ['Sasebo',129.72,33.16,'cf',1],
    ['Oita',131.61,33.24,'britannia',1], ['Kumamoto',130.71,32.80,'britannia',2],
    ['Miyazaki',131.42,31.91,'britannia',1], ['Kagoshima',130.56,31.60,'britannia',2]
  ];
  const BASE = {
    britannia: { credits: 900, industry: 380, science: 40, sakuradite: 150 },
    bk:         { credits: 480, industry: 180, science: 25, sakuradite: 120 },
    cf:         { credits: 800, industry: 320, science: 35, sakuradite: 150 }
  };
  const ARMY_GROUPS = [
    // [side, staging city, class, formations, commander (optional)]
    ['britannia','Tokyo Settlement','medium',4,'suzaku'],
    ['britannia','Tokyo Settlement','heavy',2,'cornelia'],
    ['britannia','Yokohama','assault',3,'guilford'],
    ['britannia','Osaka','medium',4,'darlton'],
    ['britannia','Osaka','rocket',2],
    ['britannia','Hiroshima','light',3],
    ['britannia','Shimonoseki','assault',3],
    ['britannia','Kumamoto','medium',3],
    ['britannia','Kagoshima','light',2],
    ['britannia','Sendai','medium',2],
    ['britannia','Sapporo','light',2],
    ['britannia','Nagoya','rocket',2],
    ['bk','Kyoto','medium',3,'zero'],
    ['bk','Kyoto','assault',2,'kallen'],
    ['bk','Nara','light',2,'tohdoh'],
    ['bk','Narita','scout',2,'ohgi'],
    ['bk','Nagano','medium',2],
    ['bk','Matsue','assault',2],
    ['cf','Fukuoka','medium',4,'xingke'],
    ['cf','Fukuoka','assault',4],
    ['cf','Kitakyushu','medium',3,'xianglin'],
    ['cf','Kitakyushu','rocket',2],
    ['cf','Nagasaki','light',3],
    ['cf','Nagasaki','support',2],
    ['cf','Sasebo','scout',3],
  ];
  function landMask() {
    const bytes = typeof atob === 'function' ? atob(LAND_BITS) : Buffer.from(LAND_BITS, 'base64').toString('latin1');
    const mask = [];
    for (let i=0;i<COLS*ROWS;i++) mask.push(!!(bytes.charCodeAt(i >> 3) & (128 >> (i & 7))));
    return mask;
  }
  function locate(lon,lat) {
    const r = Math.max(0, Math.min(ROWS-1, Math.round((BOUNDS.north-lat)*(ROWS-1)/(BOUNDS.north-BOUNDS.south))));
    const c = Math.max(0, Math.min(COLS-1, Math.round((lon-BOUNDS.west)*(COLS-1)/(BOUNDS.east-BOUNDS.west)-0.5*(r&1))));
    return {c,r};
  }
  function nearest(g, point, eligible, radius=12) {
    let best=null, distance=Infinity;
    for (let r=Math.max(0,point.r-radius);r<=Math.min(g.rows-1,point.r+radius);r++)
      for (let c=Math.max(0,point.c-radius);c<=Math.min(g.cols-1,point.c+radius);c++) {
        const t=E.tile(g,c,r);
        if (!t || !eligible(t)) continue;
        const d=E.distance(point,t,g);
        if (d<distance) {distance=d;best=t;}
      }
    return best;
  }
  function create(player='britannia',difficulty='normal',seed=246801) {
    if (!SIDES.includes(player)) throw new Error('Unsupported scenario faction: '+player);
    // Reuse initialized engine state, but replace the world geography and all world-war entities.
    const g=E.createGame('britannia',difficulty,'conquest',seed);
    const mask=landMask();
    g.mode='scenario';g.era='invasion-japan';g.wrap=false;g.cols=COLS;g.rows=ROWS;
    g.player=player;g.phase=player;g.order=[player,...SIDES.filter(s=>s!==player)];
    g.turn=1;g.over=null;g.fallen={};g.nextId=1;g.mapRevision=0;
    g.stations=[];g.units=[];g.sites=[];g.strikes=[];g.launches=[];
    g.arsenal={britannia:0,bk:0,cf:0};
    g.teams={britannia:'defenders',bk:'defenders',cf:'invaders'};
    g.economy={};
    g.tech={};
    for (const side of SIDES) {g.economy[side]={...BASE[side]};g.tech[side]={};}
    g.economy.neutral={credits:0,industry:0,science:0,sakuradite:0};
    g.tech.neutral={};
    g.factions={bk:E.FACTIONS.bk};
    g.lineup={bk:E.ROSTER.bk};
    g.scenario={id:'invasion-japan',title:'The Invasion of Japan',turnLimit:60,phase:'opening'};
    g.tiles=mask.map((dry,i)=>{
      const c=i%COLS,r=(i/COLS)|0;
      const hill=(c*17+r*11+((c*r)%13))%23;
      return {c,r,owner:null,terrain:dry?(hill<5?'mountain':hill<12?'forest':'plains'):'sea'};
    });
    // Coast tiles support naval movement and amphibious landings.
    for (const t of g.tiles)
      if (t.terrain!=='sea' && E.adjacent(g,t).some(n=>n.terrain==='sea')) t.terrain='coast';
    for (const [name,lon,lat,owner,tier,fort=false] of CITIES) {
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea' && !g.stations.some(s=>s.c===t.c && s.r===t.r),8);
      if (!at) throw new Error('No playable Japan land tile near '+name);
      const capital=name==='Tokyo Settlement' || name==='Kyoto' || name==='Fukuoka';
      const shield=fort?400:120+60*tier;
      const s={id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Defensive Battery':null,
        lab:0,refinery:0,shield,maxShield:shield,
        income:capital?48:tier===3?30:tier===2?20:12,
        industry:capital?25:6*tier,science:1+tier,producedTurn:0};
      g.stations.push(s);
      at.terrain='plains';
    }
    // Preserve city-based regions; sea stays unowned and is not accidentally recolored.
    for (const t of g.tiles) {
      if (t.terrain==='sea')continue;
      let city=null,d=Infinity;
      for (const s of g.stations) {
        const v=E.distance(t,s,g);
        if(v<d) {d=v;city=s;}
      }
      if(city){t.owner=city.owner;t.provinceCity=city.id;}
    }
    for (const [side,cityName,cls,count,commander] of ARMY_GROUPS) {
      const city=g.stations.find(s=>s.name===cityName);
      if (!city) throw new Error('Missing army staging city '+cityName);
      for(let i=0;i<count;i++) {
        const at=nearest(g,city,t=>t.terrain!=='sea' && !E.unitAt(g,t) &&
          t.owner===side && (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),8);
        if(!at)throw new Error('No staging hex for '+side+' '+cityName);
        const type=E.typeFor(side,cls,g);
        const cmd=i===0 && commander?commander:null;
        const unit=E.newUnit(g,type,side,at.c,at.r,i===0?2:1,cmd);
        if (cmd && g.officers[cmd]) {unit.cmdRank=g.officers[cmd].rank;unit.hp=E.maxHP(unit);}
      }
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
    E.log(g,'Chinese Federation forces have landed in northern Kyushu. Britannia and the Black Knights are temporarily allied.',player);
    return g;
  }
  // The opening alliance ends at turn 10. Later work can add story/dialogue and reinforcement events.
  function onTurn(g) {
    if (g.mode !== 'scenario' || g.scenario?.id !== 'invasion-japan' ||
        g.turn < 10 || g.scenario.phase !== 'opening') return false;
    g.teams = null;
    g.scenario.phase = 'three-way-war';
    g.mapRevision = (g.mapRevision || 0) + 1;
    E.log(g, 'Turn 10: the temporary Britannia–Black Knights alliance collapses. All three powers are now at war.', g.player);
    return true;
  }
  const api={id:'invasion-japan',title:'The Invasion of Japan',cols:COLS,rows:ROWS,sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,create,onTurn};
  E.scenarios={...(E.scenarios||{}),japan:api};
  if (typeof module!=='undefined') module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

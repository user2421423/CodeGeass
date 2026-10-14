  // Normal Division of Japan: Britannia must screen both Kanto and western Honshu.
  // Unlike the other Japan scenarios, these defenders keep a local post while
  // the rest of the army can counterattack; a lost city releases its guards.
  // Finale-specific layer doctrine: keep a small standing capital guard and
  // divert local reserves to threatened approach cities. All remaining units
  // are left with the normal multi-front AI to attack vulnerable spearheads
  // and recapture Britannian staging cities. No scripted reinforcements.
  function assignLuoyangGuards(g, side){
    if(g.mode!=='scenario'||g.scenario?.id!=='battle-luoyang'||side!=='cf')
      return {};
    const enemy=g.units.filter(u=>u.side==='britannia'&&u.hp>0&&!isShip(u)),
      own=g.units.filter(u=>u.side==='cf'&&u.hp>0&&!isShip(u)&&!atSea(g,u)),
      reserved={},
      posts=[
        ['Luoyang',4,9],['Mengjin',3,8],['Yanshi',2,8],
        ['Zhengzhou',3,8],['Gongyi',2,8],['Jiyuan',2,8],
        ['Jiaozuo',2,8],['Kaifeng',2,8],['Xinxiang',2,8],
        ['Sanmenxia',2,8],['Pingdingshan',2,8]
      ];
    for(const [name,quota,radius] of posts){
      const s=g.stations.find(c=>c.name===name&&c.owner==='cf');
      if(!s)continue; // A fallen city releases its guard into the offensive.
      const nearby=enemy.filter(u=>dist(g,u,s)<=10);
      if(name!=='Luoyang'&&!nearby.length&&g.turn>4)continue;
      const urgency=nearby.some(u=>dist(g,u,s)<=4);
      const candidates=own.filter(u=>!reserved[u.id]&&
        dist(g,u,s)<=radius)
        .sort((a,b)=>
          dist(g,a,s)-dist(g,b,s)||
          Number(!!a.cmd)-Number(!!b.cmd)||a.id-b.id);
      // Unthreatened posts retain only a minimal watch. When attacked they
      // request their full allocation, with battle losses naturally reducing
      // that allocation rather than conjuring new units.
      const required=urgency?quota:name==='Luoyang'?3:Math.min(1,quota);
      for(const u of candidates.slice(0,required))
        reserved[u.id]={c:s.c,r:s.r,id:s.id,emergency:urgency};
    }
    return reserved;
  }
  function assignDivisionBritanniaGuards(g, side) {
    if (g.mode !== 'scenario' || g.scenario?.id !== 'division-japan' ||
        g.difficulty !== 'normal' || side !== 'britannia') return {};
    const own = g.units.filter(u => u.hp > 0 && u.side === side &&
      !atSea(g, u) && !isShip(u) && !u.hold),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      taken = {},
      // Reserve no more than 12 of 32 starting formations for local defense.
      posts = [
        ['Tokyo Settlement', 3, 7], ['Osaka', 3, 7],
        ['Saitama', 2, 6], ['Kobe', 2, 6],
        ['Yokohama', 1, 6], ['Kyoto', 1, 6]
      ];
    for (const [name, need, radius] of posts) {
      const s = g.stations.find(city => city.name === name && city.owner === side);
      if (!s || (g.turn > 3 && !foes.some(u => dist(g, u, s) <= 9))) continue;
      const candidates = own.filter(u => !taken[u.id] &&
        massOf(g, u) === massOf(g, s) && dist(g, u, s) <= radius)
        .sort((a, b) => dist(g, a, s) - dist(g, b, s) ||
          Number(!!a.cmd) - Number(!!b.cmd) || a.id - b.id);
      for (const u of candidates.slice(0, need))
        taken[u.id] = { c: s.c, r: s.r, id: s.id,
          emergency: foes.some(f => dist(g, f, s) <= 4) };
    }
    return taken;
  }
  // Indochina is explicitly a defense-first theatre for Britannia. The
  // normal multi-front AI otherwise launches every formation at Chinese cities
  // and leaves Vinh, Vientiane and the mountain passes unprotected. Guard
  // assignments expire when the threat recedes, releasing troops for a real
  // counteroffensive. China reserves units only when its own cities are at risk.
  function assignIndochinaGuards(g,side) {
    if(g.mode!=='scenario'||g.scenario?.id!=='conquest-indochina')return {};
    const own=g.units.filter(u=>u.hp>0&&u.side===side&&!atSea(g,u)&&
      !isShip(u)&&!u.hold);
    const foes=g.units.filter(u=>u.hp>0&&foe(g,u.side,side)&&
      u.side!=='neutral'&&!isShip(u));
    const posts=side==='britannia'?(g.scenario.defensePosts||[]):[
      ['Hanoi',1,7],['Nanning',1,7],['Kunming',1,7],
      ['Luang Prabang',1,7],['Haiphong',1,7]
    ];
    const guards={};
    // Prevent an AI fortress screen from swallowing the counterattack force.
    const cap=Math.max(2,Math.floor(own.length*(side==='britannia'?0.28:0.14)));
    let assigned=0;
    for(const [name,openingNeed,radius] of posts) {
      if(assigned>=cap)break;
      const city=g.stations.find(s=>s.name===name&&s.owner===side);
      if(!city)continue;
      const nearby=foes.filter(u=>massOf(g,u)===massOf(g,city)&&
        dist(g,u,city)<=10);
      const opening=side==='britannia'&&g.turn<=4;
      if(!nearby.length&&!opening)continue;
      const urgent=nearby.some(u=>dist(g,u,city)<=5);
      const need=Math.min(cap-assigned,urgent?Math.max(2,openingNeed):
        opening?openingNeed:1);
      const candidates=own.filter(u=>!guards[u.id]&&
        massOf(g,u)===massOf(g,city)&&dist(g,u,city)<=radius)
        .sort((a,b)=>dist(g,a,city)-dist(g,b,city)||
          Number(!!a.cmd)-Number(!!b.cmd)||a.id-b.id);
      for(const u of candidates.slice(0,need)) {
        guards[u.id]={c:city.c,r:city.r,id:city.id,emergency:urgent};
        assigned++;
      }
    }
    return guards;
  }
  function assignGuards(g, side) {
    const own = g.units.filter(u => u.hp > 0 && u.side === side && !atSea(g, u) && !isShip(u)),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      taken = {},
      threat = s => foes.reduce((a, f) => a + threatTo(g, f, s), 0),
      urgent = (p, t) => t > 0 && foes.some(f => dist(g, f, p) <= 4),
      guard = (u, post, emergency = false) => {
        if (taken[u.id]) return false;
        taken[u.id] = { ...post, emergency };
        return true;
      };
    const routes = new Map(),
      nearby = (post, radius) => own
        .filter(u => !taken[u.id] && dist(g, u, post) <= radius)
        .map(u => {
          const key = `${post.c},${post.r},${u.type},${radius}`;
          // A guard cannot be selected beyond this cost, so do not scan the whole world for each post/type.
          if (!routes.has(key)) routes.set(key, goalField(g, side, [[post, 0]], TYPES[u.type].naval === 'amphibious' ? null : 'land', u, radius));
          return { u, cost: routes.get(key)[u.r * g.cols + u.c] };
        })
        .filter(p => Number.isFinite(p.cost) && p.cost <= radius)
        .sort((a, b) => a.cost - b.cost || a.u.id - b.u.id)
        .map(p => p.u);
    // A city building a F.L.E.I.J.A. warhead is guarded like the capital.
    const cities = g.stations
      .filter(s => s.owner === side)
      .map(s => ({
        s,
        threat: threat(s),
        capital: s.capitalOf === side || s.project?.side === side || s.eliminatorProject?.side === side || (s.eliminator || 0) > 0,
      }))
      .filter(c => c.capital || c.threat > 0)
      .sort((a, b) => b.capital - a.capital || b.s.tier - a.s.tier || b.threat - a.threat);
    for (const { s, threat: t, capital } of cities) {
      const need = capital ? (t > 0 ? 4 : 2) : Math.min(3, Math.ceil(t / 2));
      const near = nearby(s, capital ? aiRange(g).capitalGuard : aiRange(g).cityGuard);
      let assigned = 0;
      for (const u of near) {
        if (assigned >= need) break;
        if (guard(u, { c: s.c, r: s.r, id: s.id }, urgent(s, t))) assigned++;
      }
    }
    // Strongholds (Conquest): fortress cities and level-2+ naval bases
    // each request one available land defender, independently of front strength.
    if (g.mode !== 'campaign')
      for (const s of g.stations) {
        if (s.owner !== side || !(s.fort || (s.portLevel >= 2 && s.portOwner === side))) continue;
        if (Object.values(taken).some(t => t.id === s.id)) continue;
        for (const u of nearby(s, aiRange(g).cityGuard)) {
          if (guard(u, { c: s.c, r: s.r, id: s.id })) break;
        }
      }
    // Own mines: major deposits seek one guard; threatened mines can draw up to two defenders.
    for (const d of g.sites || []) {
      if (d.city != null || d.owner !== side) continue;
      const t = threat(d),
        need = t > 0 ? Math.min(2, Math.ceil(t / 2)) : d.base >= 30 ? 1 : 0;
      const near = nearby(d, aiRange(g).mineGuard);
      let assigned = 0;
      for (const u of near) {
        if (assigned >= need) break;
        if (guard(u, { c: d.c, r: d.r, site: d.id }, urgent(d, t))) assigned++;
      }
    }
    return taken;
  }
  // Preserve valuable wounded formations without turning the whole army into a retreat.
  // Guards and essential city defenders keep their duty. Two health thresholds prevent
  // an injured commander from alternating between the front and the repair destination.

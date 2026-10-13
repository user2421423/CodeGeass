/* Knightmare Conquest AI: rival high command (production, F.L.E.I.J.A., carriers), theaters and unit orders.
   Loads after engine.js and adds the AI to its API; it uses the rules through the engine's shared internals. */
(function (root) {
  'use strict';
  const E = root.Knightmare;
  const {
    COMMANDERS,
    ELIMINATOR,
    ELITE_FORCES,
    TERRAIN,
    cityBusyReason,
    key,
    shortfall,
    FACTIONS,
    FLEIJA,
    fleijaLabTurn,
    fleijaWarheadCount,
    fleijaPlayerPriority,
    MAJORS,
    powersOf,
    isMajor,
    NAVAL,
    TYPES,
    adjacent,
    aiLaunchTarget,
    alive,
    allUnits,
    amphibiousSea,
    assign,
    atSea,
    attack,
    build,
    buildCost,
    buildReason,
    buildingLevel,
    canBoard,
    carrierCapacity,
    canBuy,
    canCapture,
    deploy,
    deployReason,
    deployTargets,
    deployTargetsAt,
    aiEliteRecruitReason,
    eliteEligible,
    recruitAIElite,
    eliteAIProduction,
    eliteScenario,
    elitePrice,
    depositHost,
    depositOwner,
    dist,
    eliminatorReason,
    eliminatorUnlocked,
    feint,
    feintReason,
    actionTargets,
    rangeOf,
    fireFortress,
    fleijaCity,
    foe,
    fortressTargets,
    funds,
    goalField,
    goalSeeds,
    hasFleija,
    income,
    isReady,
    isSea,
    navigable,
    isShip,
    launch,
    log,
    massOf,
    maxHP,
    move,
    nearFriendlyCity,
    portAtHex,
    portSite,
    preview,
    price,
    projectReason,
    random,
    reachable,
    recruit,
    refine,
    reindex,
    reinforce,
    reinforceCost,
    repair,
    repairCost,
    seaMove,
    serves,
    sideEliminators,
    eliminatorCity,
    siteAt,
    startEliminator,
    startProject,
    stationAt,
    targets,
    tile,
    typeFor,
    unitAt,
  } = E.internal;
  // ======== AI ========
  // Strategic awareness is scaled for the 180 × 76 world. Combat ranges remain deliberately unchanged.
  const AI_RANGE = {
    threat: 5,
    capitalGuard: 13,
    cityGuard: 7,
    mineGuard: 8,
    enemyScan: 16,
    convoyLand: 4,
    convoySea: 6,
  };
  // Campaign battlefields are a few dozen hexes across and keep the original, tighter radii.
  const AI_RANGE_CAMPAIGN = { threat: 3, capitalGuard: 8, cityGuard: 4, mineGuard: 5, enemyScan: 10, convoyLand: 2, convoySea: 6 },
    aiRange = g => (g.mode === 'campaign' ? AI_RANGE_CAMPAIGN : AI_RANGE);
  const aiMemo = new WeakMap();
  const threatMemo = new WeakMap();
  // Human-player targeting preference is Conquest-only, at every difficulty.
  // Scenarios and Campaign never favor player-owned targets, even if a game has
  // an explicit aiPlayerPriorityBonus override. This changes decisions only.
  const PLAYER_PRIORITY_DEFAULT = 1;
  function playerPriorityBonus(g, side) {
    if (g?.mode !== 'conquest' || !g.player || side === g.player || !foe(g, g.player, side)) return 0;
    const value = Number(g.aiPlayerPriorityBonus ?? PLAYER_PRIORITY_DEFAULT);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : PLAYER_PRIORITY_DEFAULT;
  }
  function playerPriorityTarget(g, side, owner) {
    return g?.mode === 'conquest' && owner === g.player && owner !== side && foe(g, owner, side);
  }
  function playerPrioritySeeds(g, side, seeds = goalSeeds(g, side)) {
    const bonus = playerPriorityBonus(g, side);
    if (!bonus) return seeds;
    return seeds.map(([p, cost]) => [p, playerPriorityTarget(g, side, p.owner) ? cost - 6 * bonus : cost]);
  }
  // Each AI turn starts with a plan: garrisons, then (Conquest) the theaters it fights in. Campaign battlefields are a
  // single theater and keep one side-wide goal field.
  function aiPlan(g, side) {
    let memo = aiMemo.get(g);
    if (!memo) aiMemo.set(g, (memo = {}));
    if (!memo[side] || memo[side].turn !== g.turn) {
      // Campaign scripting stays authoritative. Scenarios use a doctrine
      // selected by ID; multi-front battles get mobile (not permanent) defense
      // and commander recovery, while rapid assaults retain their tempo.
      const scenario = g.mode === 'scenario',
        doctrine = scenario ? scenarioDoctrine(g) : null,
        recovery = !scenario || doctrine === 'division' || doctrine === 'europe';
      memo[side] = { turn: g.turn, doctrine, guards: scenario ? {} : assignGuards(g, side) };
      if (recovery) planRecovery(g, side, memo[side]);
      if (g.mode === 'campaign') memo[side].field = goalField(g, side);
      else if (scenario) planScenarioOffense(g, side, memo[side]);
      else planFronts(g, side, memo[side]);
    }
    return memo[side];
  }
  // ======== Theaters ========
  // Objectives within `radius` hexes form one front. Every emergency and the `max` best other fronts are fought at once,
  // units keep their front for `sticky` turns, and an offensive gathers within `rally` hexes before attacking
  // (or after `wait` turns). Garrisons and defensive fronts respond to threats; no army is held in strategic reserve.
  const FRONT = { radius: 16, defenseRadius: 7, near: 14, max: 6, sticky: 4, far: 60, rally: 4, wait: 3, pull: 15, stray: 4, floor: 0.25, emergencyRatio: 1, emergencyMinShare: 0.2, emergencyMaxShare: 0.35, approachingWeight: 0.6, multiCityBonus: 12, alertShare: 0.25, alertRecovery: 2, emergencyCombinedShare: 0.65, capitalCrisisAlertShare: 0.42, capitalCrisisOffenseShare: 0.27, normalExpeditionShare: 0.4, retreatRatio: 0.35 };
  // Planning strength of a formation: frames in the stack, health and generation; commanders and Elite Forces count more.
  function unitStrength(u) {
    const t = TYPES[u.type];
    return u.stack * Math.max(0.2, u.hp / maxHP(u)) * (1 + 0.25 * ((t.tier || 1) - 1)) * (u.cmd ? 1.5 : 1) * (t.elite ? 1.5 : 1);
  }
  // Japan Scenario: offensive columns follow real terrain and naval routes.
  // These distance fields persist for the lifetime of a map; captures change
  // ownership, not terrain. A new map instance gets a fresh cache. Travel
  // estimates are cached per turn, keyed by unit, position and target.
  const scenarioRoutes = new WeakMap();
  // With only one or two hostile cities left, columns may grow to `finalUnits` to finish the war.
  const SCENARIO_COLUMN = { maxUnits: 5, finalUnits: 10, switchMargin: 1.35, exploitTurns: 2, exploitRadius: 9 };
  function scenarioCache(g) {
    let cache = scenarioRoutes.get(g);
    if (!cache || cache.tiles !== g.tiles) {
      cache = { tiles: g.tiles, fields: new Map(), beaches: new Map() };
      scenarioRoutes.set(g, cache);
    }
    return cache;
  }
  // 'mixed': goalField's combined land/sea costs; 'land': marches only; 'sea': water hexes
  // seeded from the shore next to the target's landmass (null when it has no reachable shore).
  function scenarioRouteField(g, f, surface = 'mixed') {
    const cache = scenarioCache(g), id = f.anchor.id + ':' + surface;
    if (cache.fields.has(id)) return cache.fields.get(id);
    let field;
    if (surface === 'mixed') field = goalField(g, f.side, [[f.anchor, 0]]);
    else if (surface === 'land') field = goalField(g, f.side, [[f.anchor, 0]], 'land');
    else {
      const land = scenarioRouteField(g, f, 'land'),
        targetMass = massOf(g, f.anchor),
        shore = g.tiles.filter(p => navigable(p) && !stationAt(g, p)).flatMap(p => {
          const approaches = adjacent(g, p).filter(n =>
            !isSea(n) && massOf(g, n) === targetMass && Number.isFinite(land[n.r * g.cols + n.c]));
          return approaches.length ? [[p, 4 + Math.min(...approaches.map(n => land[n.r * g.cols + n.c]))]] : [];
        });
      field = shore.length ? goalField(g, f.side, shore, 'sea') : null;
    }
    cache.fields.set(id, field);
    return field;
  }
  // Sea hexes touching a landmass, each paired with the land hex an army embarks from.
  function scenarioBeaches(g, mass) {
    const cache = scenarioCache(g);
    if (cache.beaches.has(mass)) return cache.beaches.get(mass);
    const beaches = g.tiles.filter(p => navigable(p) && !stationAt(g, p))
      .flatMap(p => adjacent(g, p).filter(n => !isSea(n) && massOf(g, n) === mass).map(n => ({ sea: p, land: n })));
    cache.beaches.set(mass, beaches);
    return beaches;
  }
  // Estimated movement turns for a unit (or, for a city, a generic 4-move army) to reach a front's
  // target: land marches by land, other islands by embarking, crossing at the unit's own sea speed
  // and landing. Do not assume hex distance.
  function scenarioTravel(g, u, f) {
    const index = u.r * g.cols + u.c;
    if (!u.type) {
      const cost = scenarioRouteField(g, f)[index];
      return Number.isFinite(cost) ? cost / 4 : Infinity;
    }
    const cache = scenarioCache(g);
    if (cache.travelTurn !== g.turn) {
      cache.travelTurn = g.turn;
      cache.travel = new Map();
    }
    const speed = Math.max(1, E.movement(g, u)),
      key = [u.id, u.side, u.type, u.c, u.r, speed, f.anchor.id].join(':');
    if (cache.travel.has(key)) return cache.travel.get(key);
    const done = cost => (cache.travel.set(key, cost), cost);
    const type = TYPES[u.type],
      srcMass = massOf(g, u),
      ship = type.naval === 'ship',
      afloat = ship || isSea(tile(g, u.c, u.r));
    if (!afloat && srcMass === massOf(g, f.anchor)) {
      const cost = scenarioRouteField(g, f, 'land')[index];
      return done(Number.isFinite(cost) ? cost / speed : Infinity);
    }
    const water = scenarioRouteField(g, f, 'sea');
    if (!water) return done(Infinity);
    const seaSpeed = ship ? speed
      : type.naval === 'amphibious' ? Math.max(1, amphibiousSea(g, u)) : Math.max(1, seaMove(g, u));
    if (afloat) {
      const cost = water[index];
      return done(Number.isFinite(cost) ? cost / seaSpeed + (ship ? 0.8 : 1) : Infinity);
    }
    let best = Infinity;
    for (const edge of scenarioBeaches(g, srcMass)) {
      const seaCost = water[edge.sea.r * g.cols + edge.sea.c];
      if (!Number.isFinite(seaCost)) continue;
      // Landmass connectivity guarantees an inland approach; embarking, the crossing and landing take time.
      const approach = (dist(g, u, edge.land) * 1.25) / speed,
        crossing = type.naval === 'amphibious' ? 0.65 : 1.7;
      best = Math.min(best, approach + seaCost / seaSpeed + crossing);
    }
    return done(best);
  }
  // Capturing a city opens a short breakthrough window for raiders and other
  // fast capture-capable units against nearby unguarded, weakened cities.
  function scenarioCityCost(g, u, f) {
    let turns = scenarioTravel(g, u, f);
    if (!Number.isFinite(turns)) return turns;
    const fast = u.type && canCapture(u) &&
      (TYPES[u.type].move >= 4 || TYPES[u.type].cls === 'raider');
    const weakened = !unitAt(g, f.anchor) &&
      f.anchor.shield <= Math.max(120, (f.anchor.maxShield || 1) * 0.55);
    if (fast && weakened) {
      const recent = g.ai?.[u.side]?.recentCaptures || [];
      if (recent.some(p => g.turn - p.turn <= SCENARIO_COLUMN.exploitTurns &&
        dist(g, p, f.anchor) <= SCENARIO_COLUMN.exploitRadius)) turns -= 2.5;
      else turns -= 0.5;
    }
    // Scenario columns prioritize actual travel time, regardless of who controls the target.
    return Math.max(0, turns);
  }
  function scenarioRememberCapture(g, side, city) {
    const state = ((g.ai ||= {})[side] ||= {}),
      history = (state.recentCaptures ||= []);
    if (!history.some(p => p.id === city.id && p.turn === g.turn))
      history.push({ id: city.id, c: city.c, r: city.r, turn: g.turn });
    state.recentCaptures = history.filter(p => g.turn - p.turn <= SCENARIO_COLUMN.exploitTurns);
  }
  function scenarioPick(g, memo, u, old = null) {
    const availableTargets = memo.fronts.filter(f => foe(g, f.anchor.owner, u.side) &&
      Number.isFinite(scenarioTravel(g, u, f))),
      wing = memo.wings?.[u.id],
      matched = wing && availableTargets.filter(f=>f.anchor.owner===wing),
      fronts = matched?.length ? matched : availableTargets;
    if (!fronts.length) return null;
    const limit = memo.fronts.length <= 2 ? SCENARIO_COLUMN.finalUnits : SCENARIO_COLUMN.maxUnits;
    const understrength = fronts.filter(f => f.members.length < limit &&
      f.assigned < f.desiredStrength);
    const withRoom = fronts.filter(f => f.members.length < limit);
    const candidates = understrength.length ? understrength : withRoom.length ? withRoom : fronts;
    // Keep a column intact unless its target falls or a substantially
    // better attack opens. This is not a defensive staging requirement.
    if (old && candidates.includes(old)) {
      const best = Math.min(...candidates.map(f => scenarioCityCost(g, u, f)));
      if (scenarioCityCost(g, u, old) <= best * SCENARIO_COLUMN.switchMargin + 0.5)
        return old;
    }
    return candidates.slice().sort((a, b) =>
      scenarioCityCost(g, u, a) - scenarioCityCost(g, u, b) ||
      a.members.length - b.members.length || a.anchor.id - b.anchor.id)[0];
  }
  function scenarioGive(g, memo, u, next) {
    const old = memo.byId[memo.assign[u.id]];
    if (old?.id === next?.id) return next;
    if (old) {
      old.assigned = Math.max(0, old.assigned - unitStrength(u));
      old.members = old.members.filter(id => id !== u.id);
    }
    memo.assign[u.id] = next?.id ?? null;
    if (!next) return null;
    next.assigned += unitStrength(u);
    next.members.push(u.id);
    ((g.ai ||= {})[u.side] ||= {}).assignments ||= {};
    g.ai[u.side].assignments[u.id] = { front: next.id, since: g.turn };
    return next;
  }
  // Scenario doctrines retain the fast Japanese invasion planner where useful,
  // but give genuinely multi-front scenarios stateful operational commitments.
  function scenarioDoctrine(g) {
    const id = g.scenario?.id || '';
    if (id === 'division-japan') return 'division';
    if (id.includes('europe')) return 'europe';
    if (id.includes('invasion-japan') || id === 'japan') return 'invasion';
    return 'assault';
  }
  const STRATEGIC = { commitment: 4, margin: 1.3, transferCooldown: 4,
    arrivalWindow: 4, transferBuffer: 2, defenseRadius: 6 };
  // Route-aware arriving strength. A unit on another island or six turns
  // away cannot contribute to a four-turn defense, even if already assigned.
  function frontArrival(g, u, f) {
    if (!u || !f) return Infinity;
    const from = u.cargoHost || u, target = f.rally || f.anchor;
    if (!target) return Infinity;
    if (g.mode === 'scenario') return scenarioTravel(g, from, f);
    if (atSea(g, from) || massOf(g, from) < 0 || massOf(g, from) !== massOf(g, target))
      return Infinity; // Overseas expeditions require actual shipping first.
    const owner=u.side||f.side||g.phase,
      cache = scenarioCache(g), cacheKey = 'conquest:' + target.c + ':' + target.r + ':' + owner;
    if (!cache.fields.has(cacheKey))
      cache.fields.set(cacheKey, goalField(g, owner, [[target,0]], 'land'));
    const cost = cache.fields.get(cacheKey)[from.r*g.cols+from.c];
    return Number.isFinite(cost) ? cost / Math.max(1,u.type?E.movement(g,u):4) : Infinity;
  }
  // Scenario theater strength and targets are saved as plain data in g.ai.
  // Opponents are theater IDs: 'eu' and 'cf' in Division of Japan, for example.
  function planScenarioTheaters(g, side, troops, memo, state) {
    memo.wings = {};
    memo.theaters = {};
    const doctrine = scenarioDoctrine(g);
    if (doctrine !== 'division' && doctrine !== 'europe' && doctrine !== 'invasion') return;
    const enemies = g.stations.filter(s=>foe(g,s.owner,side) && s.owner !== 'neutral');
    const rivalIds = [...new Set(enemies.map(s=>s.owner))].sort();
    if (rivalIds.length < 2 && doctrine !== 'europe') {
      state.wingSince = {};
      state.wings = {};
      state.wingTransfers = {};
      return;
    }
    const land = troops.filter(u=>!TYPES[u.type].naval && !atSea(g,u)),
      allies = g.stations.filter(s=>s.owner===side),
      opponents = g.units.filter(u=>u.hp>0 && foe(g,u.side,side) && !isShip(u)),
      nearest = (u,cities)=>cities.length?Math.min(...cities.map(s=>dist(g,u,s))):Infinity,
      prior = state.wings || {}, since=state.wingSince || {},
      assignments = {}, dates = {}, counts=Object.fromEntries(rivalIds.map(r=>[r,0]));
    const threat = Object.fromEntries(rivalIds.map(r=>{
      const cities = enemies.filter(s=>s.owner===r),
        border = allies.slice().sort((a,b)=>nearest(a,cities)-nearest(b,cities)).slice(0,5);
      const enemyPower = opponents.filter(u=>u.side===r).reduce((v,u)=>{
        const range=nearest(u,border);
        return v+(range<=12 ? unitStrength(u)*(1-range/16):0);
      },0),
        objectiveValue = border.reduce((v,s)=>v+(s.capitalOf===side?6:s.tier>=3?3:1),0);
      return [r,Math.max(1,enemyPower+objectiveValue+cities.length*0.3)];
    }));
    const savedPressure=state.theaterPressure||{};
    for(const r of rivalIds) threat[r]=savedPressure[r]==null?threat[r]:
      0.55*savedPressure[r]+0.45*threat[r];
    state.theaterPressure={...threat};
    const total = rivalIds.reduce((s,r)=>s+threat[r],0);
    const quotas = Object.fromEntries(rivalIds.map(r=>[r,Math.round(land.length*Math.max(0.35,
      Math.min(0.65, threat[r]/total)))]));
    if(rivalIds.length===2){ const second=rivalIds[1]; quotas[second]=land.length-quotas[rivalIds[0]]; }
    for(const u of land) if(rivalIds.includes(prior[u.id])){
      assignments[u.id]=prior[u.id]; dates[u.id]=since[u.id]??g.turn; counts[prior[u.id]]++;
    }
    // Opening: geographic 50/50 in Division, weighted elsewhere. Newly raised
    // units reinforce locally unless they are on a genuine theater boundary.
    const recruits=land.filter(u=>!assignments[u.id]);
    if(!Object.keys(assignments).length && rivalIds.length===2){
      const a=rivalIds[0], b=rivalIds[1], citiesA=enemies.filter(s=>s.owner===a),
        citiesB=enemies.filter(s=>s.owner===b);
      recruits.sort((x,y)=>(nearest(x,citiesA)-nearest(x,citiesB))-
        (nearest(y,citiesA)-nearest(y,citiesB))||x.id-y.id);
      const n=doctrine==='division'?Math.ceil(recruits.length/2):quotas[a];
      recruits.forEach((u,i)=>{const wing=i<n?a:b;
        assignments[u.id]=wing; dates[u.id]=g.turn; counts[wing]++;});
    }else for(const u of recruits.sort((a,b)=>a.id-b.id)){
      const ranked=rivalIds.slice().sort((a,b)=>{
        const da=nearest(u,enemies.filter(s=>s.owner===a)),db=nearest(u,enemies.filter(s=>s.owner===b));
        return da+5<db?-1:db+5<da?1:
          (quotas[b]-counts[b])-(quotas[a]-counts[a])||da-db;
      });
      const wing=ranked[0];assignments[u.id]=wing;dates[u.id]=g.turn;counts[wing]++;
    }
    // Assess real arrivals, rather than counting the entire wing at the border.
    for(const rival of rivalIds){
      const cities=enemies.filter(s=>s.owner===rival),
        anchor=cities.slice().sort((a,b)=>nearest(a,allies)-nearest(b,allies))[0],
        f=anchor&&{anchor,side},
        wing=land.filter(u=>assignments[u.id]===rival),
        available=wing.reduce((v,u)=>v+(frontArrival(g,u,f)<=2?unitStrength(u):0),0),
        arriving=wing.reduce((v,u)=>v+(frontArrival(g,u,f)<=4?unitStrength(u):0),0),
        required=Math.max(2, threat[rival]*1.1),
        deficit=Math.max(0,required-arriving);
      memo.theaters[rival]={rival, anchor:anchor?.id??null, required,
        available, arriving, deficit, pressure:threat[rival], members:wing.map(u=>u.id)};
    }
    // Transfer at most one safe mobile formation after a meaningful 30% priority
    // improvement. Respect a 4-turn tour and a transfer already underway.
    const oldTransfers=state.wingTransfers||{}, transfers={};
    for(const [id,t] of Object.entries(oldTransfers))if(g.turn-(t.started??0)<=10 &&
      land.some(u=>u.id===Number(id)))transfers[id]=t;
    if(rivalIds.length===2 && g.turn-(state.lastWingTransfer??-99)>=STRATEGIC.transferCooldown){
      const capital=allies.find(s=>s.capitalOf===side),
        capitalAttackers=capital?opponents.filter(u=>
          massOf(g,u)===massOf(g,capital) && dist(g,u,capital)<=3):[],
        capitalThreat=capitalAttackers.reduce((v,u)=>v+unitStrength(u),0),
        capitalCover=capital?land.filter(u=>dist(g,u,capital)<=4)
          .reduce((v,u)=>v+unitStrength(u),0):0,
        capitalCrisis=capitalAttackers.length>0 && capitalThreat>Math.max(2,capitalCover*1.2),
        threatened=capitalCrisis?capitalAttackers[0].side:null,
        urgent=threatened&&rivalIds.includes(threatened)?threatened:
          rivalIds.slice().sort((a,b)=>memo.theaters[b].deficit-memo.theaters[a].deficit)[0],
        donor=rivalIds.find(r=>r!==urgent),
        target=memo.theaters[urgent], source=memo.theaters[donor],
        emergency=capitalCrisis && urgent===threatened;
      if((emergency || target?.deficit>2 && target.pressure>source.pressure*STRATEGIC.margin) &&
        counts[donor]>Math.max(3,Math.floor(land.length*0.33))){
        const dest=emergency?capital:g.stations.find(s=>s.id===target.anchor),
          f=dest&&{anchor:dest,side},
          options=land.filter(u=>assignments[u.id]===donor && !transfers[u.id] &&
            (emergency || g.turn-dates[u.id]>=STRATEGIC.commitment) &&
            !opponents.some(e=>dist(g,u,e)<=4) &&
            frontArrival(g,u,f)<=STRATEGIC.arrivalWindow)
          .sort((a,b)=>frontArrival(g,a,f)-frontArrival(g,b,f)||a.id-b.id);
        const chosen=options[0];
        if(chosen){
          assignments[chosen.id]=urgent;dates[chosen.id]=g.turn;
          transfers[chosen.id]={from:donor,to:urgent,started:g.turn,
            target:dest.id,emergency};
          counts[donor]--;counts[urgent]++;state.lastWingTransfer=g.turn;
        }
      }
    }
    memo.wings=assignments;
    state.wings={...assignments};state.wingSince={...dates};state.wingTransfers=transfers;
    state.theaterSnapshot={turn:g.turn,theaters:Object.fromEntries(Object.entries(memo.theaters)
      .map(([id,f])=>[id,{required:f.required,available:f.available,
        arriving:f.arriving,deficit:f.deficit,pressure:f.pressure,count:counts[id]}]))};
  }
  // Temporary city counterattacks: one hostile formation alarms only its
  // nearest vulnerable city. Responders never lose their long-term front.
  function planScenarioMobileDefense(g,side,troops,memo,state){
    memo.localDefense={alerts:[],dispatched:0};
    const doctrine=scenarioDoctrine(g);
    if(doctrine!=='division' && doctrine!=='europe' &&
      !(doctrine==='invasion' && g.scenario?.phase==='three-way-war'))return;
    const own=g.stations.filter(s=>s.owner===side),
      enemies=g.units.filter(u=>u.hp>0&&foe(g,u.side,side)&&!isShip(u)),
      alerts=new Map(),deployed=new Set(),next={},
      // European War: E.U. preserves defensive depth, while Euro Britannia
      // retains its concentrated attack rather than scattering city screens.
      cap=doctrine==='europe'?(side==='eu'?0.30:0.12):0.25,
      max=Math.min(Math.floor(troops.length*cap),doctrine==='division'?8:side==='eu'?8:4);
    for(const e of enemies){
      const city=own.filter(s=>!atSea(g,e) && massOf(g,e)===massOf(g,s) &&
        dist(g,e,s)<=STRATEGIC.defenseRadius)
        .sort((a,b)=>dist(g,e,a)-dist(g,e,b)||a.id-b.id)[0];
      if(!city)continue;
      if(!alerts.has(city.id))alerts.set(city.id,{city,enemies:[]});
      alerts.get(city.id).enemies.push(e);
    }
    const sorted=[...alerts.values()].sort((a,b)=>
      (b.city.capitalOf===side?10:0)+b.enemies.length*3-
      ((a.city.capitalOf===side?10:0)+a.enemies.length*3));
    for(const {city,enemies:attackers} of sorted){
      if(deployed.size>=max)break;
      const threat=attackers.reduce((v,u)=>v+unitStrength(u),0),
        sameFront=attackers[0].side,
        eligible=troops.filter(u=>!deployed.has(u.id)&&!TYPES[u.type].naval &&
          massOf(g,u)===massOf(g,city)&&dist(g,u,city)<=8 &&
          (!memo.wings[u.id]||memo.wings[u.id]===sameFront)),
        ordered=eligible.sort((a,b)=>dist(g,a,city)-dist(g,b,city)||a.id-b.id),
        need=Math.min(doctrine==='europe' && side==='eb'?1:3,
          Math.max(1,Math.ceil(threat/3)));
      let count=0;
      for(const u of ordered){
        if(count>=need||deployed.size>=max)break;
        memo.guards[u.id]={c:city.c,r:city.r,id:city.id,emergency:true,response:true};
        next[u.id]={city:city.id,turn:g.turn};deployed.add(u.id);count++;
      }
      if(count)memo.localDefense.alerts.push({city:city.id,count,front:sameFront});
    }
    memo.localDefense.dispatched=deployed.size;
    state.localResponses=next;
  }
  function planScenarioOffense(g, side, memo) {
    const state = ((g.ai ||= {})[side] ||= {}),
      own = g.stations.filter(s => s.owner === side),
      carried = new Map(),
      troops = allUnits(g).filter(u => u.hp > 0 && u.side === side && !isShip(u) && !u.hold),
      enemies = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral');
    for (const ship of g.units) for (const cargo of ship.cargo || [])
      carried.set(cargo.id, ship);
    state.recentCaptures = (state.recentCaptures || [])
      .filter(p => g.turn - p.turn <= SCENARIO_COLUMN.exploitTurns);
    const previous = state.assignments || {};
    planScenarioTheaters(g,side,troops,memo,state);
    planScenarioMobileDefense(g,side,troops,memo,state);
    const active=troops.filter(u=>!memo.guards?.[u.id]&&!memo.recoveries?.has(u.id));
    const fronts = g.stations.filter(s => foe(g, s.owner, side)).map(s => {
      const opponents = enemies.filter(u => dist(g, u, s) <= 6),
        mass = massOf(g, s),
        local = own.filter(c => massOf(g, c) === mass),
        coastal = own.filter(c => coastTile(g, c)),
        rally = (local.length ? local : coastal).slice()
          .sort((a, b) => dist(g, a, s) - dist(g, b, s) || a.id - b.id)[0] || null,
        opposition = opponents.reduce((total, u) => total + unitStrength(u), 0),
        fortified = !!s.fort || s.shield >= 300;
      return {
        id: 'j' + s.id, side, anchor: s, name: s.name,
        type: 'offensive', state: 'attacking', overseas: !local.length,
        rally, objectives: [{ ...s, key: 's' + s.id, value: 10, seed: 0, fortified }],
        enemies: opponents, enemyStrength: opposition,
        desiredStrength: Math.max(3, opposition * 1.15 + (fortified ? 3 : 1)),
        assigned: 0, members: [], friendlyStrength: 0, target: 0,
        masses: new Set([mass]), seeds: [[s, 0]],
        score: 1, priority: 1, fortified,
      };
    });
    Object.assign(memo, { fronts, byId: Object.fromEntries(fronts.map(f => [f.id, f])),
      assign: {}, fields: {}, columns: {} });
    const at = u => carried.get(u.id) || u;
    const best = u => Math.min(Infinity, ...fronts.map(f => scenarioTravel(g, at(u), f)));
    active.sort((a, b) => best(a) - best(b) || a.id - b.id);
    for (const u of active) {
      const old = memo.byId[previous[u.id]?.front] || null,
        next = scenarioPick(g, memo, at(u), old);
      if (next) scenarioGive(g, memo, u, next);
    }
    for (const f of fronts) {
      f.friendlyStrength = f.assigned;
      f.arrivingFour = active.filter(u=>memo.assign[u.id]===f.id &&
        frontArrival(g,at(u),f)<=4).reduce((sum,u)=>sum+unitStrength(u),0);
      f.deficit = Math.max(0,f.desiredStrength-f.arrivingFour);
      const posture=(state.scenarioPostures||{})[f.id]||{};
      const crisis=f.enemyStrength>f.arrivingFour*1.5 && f.enemyStrength>=4;
      f.state = (memo.doctrine==='division'||memo.doctrine==='europe') && crisis && f.rally ? 'regrouping' : 'attacking';
      f.seeds = f.state==='regrouping' ? [[f.rally,0]] : [[f.anchor,0]];
      (state.scenarioPostures ||= {})[f.id]={state:f.state,since:posture.state===f.state?posture.since:g.turn};
      f.target = f.desiredStrength;
      f.need = frontNeeds(f, active.filter(u => memo.assign[u.id] === f.id), g);
      memo.columns[f.id] = f.members;
    }
    fronts.sort((a, b) => {
      const nearest = f => Math.min(Infinity, ...(active.length ?
        active.map(u => scenarioTravel(g, at(u), f)) :
        own.map(c => scenarioTravel(g, c, f))));
      return nearest(a) - nearest(b) || a.anchor.id - b.anchor.id;
    });
    state.assignments = Object.fromEntries(Object.entries(memo.assign)
      .filter(([, target]) => target).map(([id, target]) =>
        [id, { front: target, since: previous[id]?.front === target ? previous[id].since : g.turn }]));
    state.columns = Object.fromEntries(fronts.filter(f => f.members.length).map(f =>
      [f.id, { city: f.anchor.id, units: f.members.slice(), strength: f.assigned, since: g.turn }]));
    memo.staging = fronts.find(f => f.overseas && f.assigned > 0 && f.rally)?.rally || null;
  }
  // Anticipate second-turn land approaches on a continuous landmass. The exact next-turn
  // threat forecast remains threatTo(); this is a bounded early warning, not an assertion
  // that every possible route will be unobstructed two turns from now.
  function approachingThreat(g, f, p) {
    if (g.mode === 'campaign' || f.hp <= 0 || isShip(f) || atSea(g, f)) return false;
    const destination = tile(g, p.c, p.r);
    if (!destination || isSea(destination) || TERRAIN[destination.terrain]?.blocked) return false;
    const fromMass = massOf(g, f);
    if (fromMass < 0 || fromMass !== massOf(g, destination)) return false;
    const maxMove = E.movement(g, f);
    return maxMove > 0 && dist(g, f, p) <= 2 * maxMove + rangeOf(g, f).max;
  }
  // What a side cares about this turn: enemy cities near its territory, every rival capital and F.L.E.I.J.A. project,
  // Sakuradite mines, and its own threatened cities, capital and mines. `value` scores the front, `seed` feeds its field.
  function frontObjectives(g, side) {
    const R = aiRange(g),
      own = g.stations.filter(s => s.owner === side),
      army = g.units.filter(u => u.hp > 0 && u.side === side && !isShip(u)),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      near = p => own.some(s => dist(g, s, p) <= FRONT.near) || army.some(u => dist(g, u, p) <= FRONT.near),
      cities = Object.fromEntries(powersOf(g).map(faction =>
        [faction, g.stations.filter(s => s.owner === faction).length])),
      lead = Math.max(1, ...powersOf(g).filter(faction => alive(g, faction)).map(faction => cities[faction])),
      // Every faction considers a stronger surviving rival the greater long-run threat.
      // This discourages two great powers from continually devouring a losing third.
      rivalWeight = owner => !isMajor(g, owner) ? 1 :
        Math.max(0.35, Math.pow((cities[owner] || 0) / lead, 3.5)),
      // An expensive enemy capital or mine is worth pursuing only if a feasible
      // regional land approach or a loaded expedition actually exists.
      operational = p => {
        if (!near(p)) return false;
        const mass = massOf(g, p);
        if (mass >= 0 && (own.some(s => dist(g, s, p) <= FRONT.near && massOf(g, s) === mass) ||
          army.some(u => dist(g, u, p) <= FRONT.near && massOf(g, u) === mass))) return true;
        return g.units.some(u => u.hp > 0 && u.side === side && isShip(u) &&
          u.cargo?.length && dist(g, u, p) <= FRONT.near);
      },
      warning = p => {
        let immediate = false, projected = false;
        for (const f of foes) {
          if (threatTo(g, f, p) > 0) { immediate = true; break; }
          if (approachingThreat(g, f, p)) projected = true;
        }
        return { immediate, projected };
      },
      list = [];
    for (const s of g.stations) {
      if (foe(g, s.owner, side)) {
        const project = s.project || s.eliminatorProject,
          capital = s.capitalOf && alive(g, s.owner);
        if (!operational(s)) continue;
        const [value, seed] = project ? [100, -8] : capital ? [70, -6] : s.owner === 'neutral' ? [8, 1] : s.tier >= 3 ? [20, -1] : [10, 0];
        list.push({ key: 's' + s.id, c: s.c, r: s.r, name: s.name, owner: s.owner,
          value: project ? value : Math.max(6, Math.round(value * rivalWeight(s.owner))),
          seed, fortified: value >= 20 });
      } else if (s.owner === side) {
        const vital = s.capitalOf === side || s.project?.side === side || s.eliminatorProject?.side === side;
        const w = warning(s);
        if (w.immediate || w.projected)
          list.push({ key: 'd' + s.id, c: s.c, r: s.r, name: s.name, defend: true, city: true,
            immediate: w.immediate, projected: !w.immediate && w.projected,
            vital, value: vital ? 100 : 20, seed: vital ? -6 : -2 });
      }
    }
    for (const d of g.sites || []) {
      if (d.city != null) continue;
      const major = d.base >= 30;
      if (foe(g, d.owner, side) && operational(d))
        list.push({ key: 'm' + d.id, c: d.c, r: d.r, name: d.name,
          value: Math.max(6, Math.round((major ? 40 : 10) * rivalWeight(d.owner))),
          seed: major ? -5 : -1 });
      else if (d.owner === side && major) {
        const w = warning(d);
        if (w.immediate || w.projected)
          list.push({ key: 'n' + d.id, c: d.c, r: d.r, name: d.name, defend: true,
            immediate: w.immediate, projected: !w.immediate && w.projected, value: 40, seed: -4 });
      }
    }
    return list;
  }
  // Clusters objectives into fronts, scores them against enemy strength, and assigns non-garrison units
  // to offensive or defensive theaters, prioritizing emergencies and force deficits. No strategic reserve
  // is maintained. Front states and assignments persist in g.ai[side].fronts and .assignments.
  function planFronts(g, side, memo) {
    const R = aiRange(g),
      state = ((g.ai ||= {})[side] ||= { saving: false }),
      saved = (state.fronts ||= {}),
      sticky = (state.assignments ||= {}),
      own = g.stations.filter(s => s.owner === side),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      host = {};
    for (const v of g.units) for (const c of v.cargo || []) host[c.id] = v;
    const at = u => host[u.id] || u,
      units = allUnits(g).filter(u => u.hp > 0 && u.side === side && !isShip(u) && !u.hold && !memo.guards[u.id] && !memo.recoveries?.has(u.id)),
      sum = list => list.reduce((a, u) => a + unitStrength(u), 0),
      byDist = (p, list) => list.slice().sort((a, b) => dist(g, a.anchor || a, p) - dist(g, b.anchor || b, p) || (a.id < b.id ? -1 : 1)),
      // Terrain/path-aware ETA. Disconnected landmasses do not magically
      // reinforce each other across the sea. Arrivals count only at ETA.
      travelTurns = (u, f) => frontArrival(g, at(u), f);
    // 1. Cluster: existing fronts re-form around their old anchors so ids stay stable from turn to turn.
    const objectives = frontObjectives(g, side).sort(
      (a, b) => !!saved[b.key] - !!saved[a.key] || b.value - a.value || (a.key < b.key ? -1 : 1),
    );
    let fronts = [];
    for (const o of objectives) {
      if (o.front) continue;
      const f = { id: o.key, side, anchor: o, objectives: [], assigned: 0 };
      for (const q of objectives)
        if (!q.front && !!q.defend === !!o.defend &&
          dist(g, q, o) <= (o.defend ? FRONT.defenseRadius : FRONT.radius) &&
          (!o.defend || massOf(g, q) === massOf(g, o))) {
          q.front = f;
          f.objectives.push(q);
        }
      fronts.push(f);
    }
    // 2. Score and size: objective values, minus distance from the nearest own city; enemy strength sets the force needed.
    const army = sum(units);
    for (const f of fronts) {
      const attack = f.objectives.filter(o => !o.defend),
        defend = f.objectives.filter(o => o.defend),
        worth = list => list.reduce((a, o) => a + o.value, 0),
        home = own.length ? Math.min(...own.map(s => dist(g, s, f.anchor))) : 0,
        enemies = foes.filter(v => f.objectives.some(o => dist(g, v, o) <= 6));
      const imminent = defend.filter(o => o.immediate);
      const projected = defend.filter(o => o.projected);
      f.endangeredCities = defend.filter(o => o.city).length;
      f.immediateCities = imminent.filter(o => o.city).length;
      f.projectedCities = projected.filter(o => o.city).length;
      const bestAttack = attack.length ? Math.max(...attack.map(o => o.value)) : 0;
      f.vital = imminent.some(o => o.vital);
      f.projectedVital = projected.some(o => o.vital);
      f.enemies = enemies;
      f.enemyStrength = sum(enemies);
      // Only a legal attack on the next enemy turn may trigger a defensive emergency.
      const immediateMenace = foes
          .filter(v => imminent.some(o => threatTo(g, v, o) > 0))
          .reduce((total, v) => total + unitStrength(v) + sum(v.cargo || []), 0),
        projectedMenace = foes
          .filter(v => !imminent.some(o => threatTo(g, v, o) > 0) &&
            projected.some(o => approachingThreat(g, v, o)))
          .reduce((total, v) => total + unitStrength(v) + sum(v.cargo || []), 0),
        present = sum(g.units.filter(u => u.hp > 0 && u.side === side && !isShip(u) &&
          imminent.some(o => dist(g, u, o) <= R.threat))),
        garrison = sum(g.units.filter(u => memo.guards[u.id] &&
          imminent.some(o => dist(g, u, o) <= R.threat)));
      // Enemy formations outside the two-turn attack window still matter when
      // planning cover for a capital. They are not legal immediate attackers.
      f.stagingMenace = defend.length ? foes.reduce((total, v) => {
        const distance = Math.min(...defend.map(o => dist(g, v, o)));
        const weight = distance <= R.threat ? 0 :
          distance <= R.threat * 2 ? 0.4 :
            distance <= R.enemyScan ? 0.18 : 0;
        return total + weight * (unitStrength(v) + sum(v.cargo || []));
      }, 0) : 0;
      f.immediateMenace = immediateMenace;
      f.projectedMenace = projectedMenace;
      f.menace = immediateMenace + projectedMenace * FRONT.approachingWeight +
        f.stagingMenace * 0.35;
      f.present = present;
      // Readiness of friendly troops already stationed in this particular sector,
      // not soldiers on the other side of a continent-wide defensive cluster.
      f.localStrength = sum(g.units.filter(u => u.hp > 0 && u.side === side && !isShip(u) &&
        defend.some(o => dist(g, u, o) <= R.threat)));
      f.localGarrison = sum(g.units.filter(u => memo.guards[u.id] &&
        defend.some(o => dist(g, u, o) <= R.threat)));
      f.pressure = f.immediateMenace * 1.6 + f.projectedMenace +
        f.stagingMenace * 0.6 + Math.max(0, f.enemyStrength - f.localStrength) * 0.4;
      const shortage = immediateMenace > 0 && present < immediateMenace * FRONT.emergencyRatio;
      f.emergency = f.vital || shortage;
      // A future threat may create an alert, never a full theater-wide holding order.
      // A mixed attack/defense front remains offensive unless immediate danger is serious.
      f.type = f.emergency && (f.vital || f.immediateCities >= 2 ||
        (imminent.length && worth(imminent) >= bestAttack))
        ? 'defensive' : attack.length ? 'offensive' : 'alert';
      // In the U.F.N. conquest, allied armies contribute only if physically
      // present near the same operational objectives; they do not count as
      // reinforcements from across the globe.
      f.coalitionSupport = g.era === 'ufn2018'
        ? g.units.filter(u=>u.hp>0 && u.side!==side && u.side!=='neutral' &&
          !foe(g,u.side,side) && !isShip(u) &&
          f.objectives.some(o=>dist(g,u,o)<=6) &&
          massOf(g,u)===massOf(g,f.anchor)).reduce((v,u)=>v+unitStrength(u),0)
        : 0;
      f.desiredStrength = f.type === 'defensive'
        ? Math.max(f.vital ? 8 : 2, immediateMenace * 1.2 +
            (f.vital ? projectedMenace * 0.8 + f.stagingMenace * 0.45 : 0) -
            garrison * (f.vital ? 0.5 : 1))
        : f.type === 'alert'
          ? Math.max(2, f.immediateMenace * 1.2 + f.projectedMenace * 0.9 +
            f.stagingMenace * 0.45 + (f.projectedVital ? 5 : 0) +
            Math.max(0, f.enemyStrength - f.localStrength) * 0.5 -
            f.localGarrison * 0.25)
          : Math.max(3, f.enemyStrength * 1.5 + attack.length * 0.5);
      if (f.coalitionSupport)
        f.desiredStrength=Math.max(2,f.desiredStrength - f.coalitionSupport*0.45);
      // A long list of projected endangered cities cannot drown out a major offensive.
      const imminentValue = imminent.length
        ? Math.max(...imminent.map(o => o.value)) +
          (worth(imminent) - Math.max(...imminent.map(o => o.value))) / 2 : 0;
      const attackValue = attack.length ? bestAttack + (worth(attack) - bestAttack) / 2 : 0;
      const emphasis = f.type === 'defensive'
        ? Math.max(imminentValue, 20) +
          Math.min(24, Math.max(0, f.immediateCities - 1) * FRONT.multiCityBonus)
        : f.type === 'alert'
          ? 24 + Math.min(32, f.pressure * 2) + (f.immediateCities ? 10 : 0) +
            (f.projectedVital ? 12 : 0) + (f.vital ? 10 : 0)
          : attackValue || 12;
      f.score = Math.round(emphasis - Math.max(0, home - 8) * 1.2);
      f.name = f.type === 'offensive'
        ? attack.reduce((a, o) => o.value > a.value ? o : a).name : f.anchor.name;
      const previous = saved[f.id] || {};
      f.quiet = f.emergency || imminent.length || projected.length ? 0 : (previous.quiet || 0) + 1;
      f.posture = f.type === 'defensive' ? 'defensive'
        : (imminent.length || projected.length ||
           (previous.posture === 'defensive' && f.quiet < FRONT.alertRecovery))
          ? 'alert' : 'offensive';
      // Offensives stage at the nearest own city on the target's landmass, else at the nearest own coastal city.
      if (f.type === 'offensive') {
        const land = own.filter(s => massOf(g, s) === massOf(g, f.anchor));
        f.overseas = !land.length;
        f.rally = byDist(f.anchor, land.length ? land : own.filter(s => coastTile(g, s)))[0] || null;
      }
      // Track what can plausibly arrive within a tactical window. Distant
      // assignments still exist, but are not usable as near-term defenders.
      f.availableTwo = sum(units.filter(u => travelTurns(u, f) <= 2));
      f.availableFour = sum(units.filter(u => travelTurns(u, f) <= 4));
      f.arrivingTwo = 0;
      f.arrivingFour = 0;
      // Preserve local garrisons while allowing an overwhelmed mobile field
      // detachment to fall back to an uncontested friendly city on the same landmass.
      const retreatOptions = f.type === 'defensive' && !f.vital && f.immediateMenace >= 8 &&
        f.localStrength > 0 && f.localStrength < f.immediateMenace * FRONT.retreatRatio
        ? own.filter(s => massOf(g, s) === massOf(g, f.anchor) &&
            dist(g, s, f.anchor) >= 4 && dist(g, s, f.anchor) <= 18 &&
            !foes.some(v => dist(g, v, s) <= R.threat))
          .sort((a, b) => dist(g, a, f.anchor) - dist(g, b, f.anchor) || a.id - b.id)
        : [];
      f.fallback = retreatOptions[0] || null;
      f.withdraw = !!f.fallback;
      // Priority: the score, discounted (down to `floor`) when half the army could not field the force it needs.
      // Offensives gain priority in proportion to the share of their objective value the human player owns.
      const attackingValue = worth(attack),
        playerValue = worth(attack.filter(o => playerPriorityTarget(g, side, o.owner))),
        playerShare = f.type === 'offensive' && attackingValue ? playerValue / attackingValue : 0;
      f.priority = f.score * Math.min(1, Math.max(FRONT.floor, (army * 0.5) / f.desiredStrength)) *
        (1 + playerPriorityBonus(g, side) * playerShare);
    }
    // Every immediate defensive emergency is active. Among routine theaters,
    // protect at least two offensive slots so density of alert cities cannot crowd
    // all campaigns out of the theater planner.
    const rank = (a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1);
    const urgent = fronts.filter(f => f.type === 'defensive' && f.emergency).sort(rank);
    const routine = fronts.filter(f => !(f.type === 'defensive' && f.emergency)).sort(rank);
    const attacks = routine.filter(f => f.type === 'offensive').slice(0, Math.min(2, FRONT.max));
    const rest = routine.filter(f => !attacks.includes(f)).slice(0, FRONT.max - attacks.length);
    fronts = [...urgent, ...attacks, ...rest].sort((a, b) =>
      (b.type === 'defensive' && b.emergency) - (a.type === 'defensive' && a.emergency) || rank(a, b));
    // Garrisons have already been excluded from the deployable field army.
    // All remaining formations can reinforce offensives or defensive fronts as needed.
    const byId = Object.fromEntries(fronts.map(f => [f.id, f]));
    // 3. Persist theater assignments. A 30% priority margin, genuine
    // four-turn deficit and a secure donor are needed to countermand a tour.
    const sourceReady = Object.fromEntries(fronts.map(f=>[f.id,
      units.filter(u=>sticky[u.id]?.front===f.id && travelTurns(u,f)<=4)
        .reduce((v,u)=>v+unitStrength(u),0)]));
    const assign = {},
      emergencies = fronts.filter(f => f.emergency && f.type === 'defensive'),
      give = (u, f) => {
        assign[u.id] = f.id;
        f.assigned += unitStrength(u);
        const eta = travelTurns(u, f);
        if (eta <= 2) f.arrivingTwo += unitStrength(u);
        if (eta <= 4) f.arrivingFour += unitStrength(u);
        if (sticky[u.id]?.front !== f.id)
          sticky[u.id] = {front:f.id,since:g.turn,
            lockUntil:g.turn+Math.max(STRATEGIC.commitment,Math.ceil(Math.min(20,eta))+2)};
      };
    for (const u of units) {
      const a = sticky[u.id],
        f = a && byId[a.front];
      if (!f) continue;
      // Keep already-moving formations committed, even if the four-turn
      // minimum elapses before they reach their destination.
      const age = g.turn-a.since, eta = travelTurns(u,f),
        candidates = fronts.filter(e=>e!==f &&
          e.priority > Math.max(1,f.priority)*STRATEGIC.margin &&
          e.desiredStrength > e.arrivingFour+STRATEGIC.transferBuffer &&
          travelTurns(u,e)<=STRATEGIC.arrivalWindow),
        alternative = candidates.sort((a,b)=>b.priority-a.priority)[0],
        safeDonor = f.type!=='defensive' && !f.emergency &&
          sourceReady[f.id]-unitStrength(u) >= Math.min(f.target*0.65,f.desiredStrength*0.65);
      const emergencyOverride = alternative?.type==='defensive' &&
        alternative.vital && alternative.immediateMenace>0 &&
        travelTurns(u,alternative)<=2;
      const allowSwitch = alternative && safeDonor &&
        (emergencyOverride || (age>=STRATEGIC.commitment &&
          g.turn >= (a.lockUntil??a.since+STRATEGIC.commitment) && eta<=2));
      if (!allowSwitch || dist(g,at(u),f.anchor)<=FRONT.far && !alternative)
        give(u,f);
      else sourceReady[f.id]-=unitStrength(u);
    }
    // 4. Emergency fronts get priority; remaining forces are shared across both
    // offensive and routine defensive fronts by priority and actual strength need.
    const alerts = fronts.filter(f => f.type === 'alert'),
      // A projected attack on a capital across several sectors is a genuine
      // strategic crisis even though it must not force every local front to hold.
      capitalCrisis = alerts.length + emergencies.length >= 2 &&
        fronts.some(f => (f.projectedVital && f.projectedMenace > 0) ||
          (f.vital && f.immediateMenace > 0)),
      expeditionLimit = army * FRONT.normalExpeditionShare,
      open = fronts.filter(f => f.type === 'offensive' || (f.type === 'defensive' && !f.emergency)),
      weight = new Map(open.map((f, i) => [f, [0.5, 0.25, 0.15, 0.1][i] || 0.1]));
    let pot = army,
      emergencyPool = army * FRONT.emergencyCombinedShare,
      left = open;
    // Non-vital emergencies receive a threat-proportional 20-35% of the available field
    // army. Garrison units are not included, and competing fronts cannot overcommit it.
    for (const f of emergencies) {
      const shortage = Math.max(0, f.immediateMenace - f.present) / Math.max(1, f.immediateMenace);
      const share = FRONT.emergencyMinShare + (FRONT.emergencyMaxShare - FRONT.emergencyMinShare) * shortage;
      // Multiple unrelated emergencies cannot consume the whole field army.
      // Critical capitals may still claim the full remaining mobile force.
      // A vital capital may use more than the shared emergency quota. Never let
      // that deficit turn the following non-vital front's target negative.
      f.target = Math.max(0, Math.min(f.desiredStrength, f.vital ? army : army * share,
        f.vital ? pot : Math.max(0, emergencyPool), pot));
      pot -= f.target;
      emergencyPool -= f.target;
    }
    // All alert-only fronts share a bounded field-army budget. This is staging,
    // not a permanent reserve or an excuse to halt nearby offensives.
    const alertPool = Math.min(pot, army *
      (capitalCrisis ? FRONT.capitalCrisisAlertShare : FRONT.alertShare));
    // Weighted, capacity-constrained division: an inland capital warning cannot
    // monopolize cover while exposed border sectors are left without a formation.
    const pending = alerts.slice();
    let remaining = alertPool;
    for (const f of alerts) f.target = 0;
    while (pending.length && remaining > 1e-6) {
      const weights = pending.map(f => Math.max(1, f.priority) * Math.max(1, f.desiredStrength));
      const total = weights.reduce((sum, n) => sum + n, 0);
      const capped = pending.filter((f, i) =>
        f.desiredStrength - f.target <= remaining * weights[i] / total + 1e-9);
      if (!capped.length) {
        for (let i = 0; i < pending.length; i++)
          pending[i].target += remaining * weights[i] / total;
        remaining = 0;
        break;
      }
      for (const f of capped) {
        const grant = f.desiredStrength - f.target;
        f.target += grant;
        remaining -= grant;
        pending.splice(pending.indexOf(f), 1);
      }
    }
    pot -= alertPool - remaining;
    while (left.length) {
      const w = left.reduce((a, f) => a + weight.get(f), 0),
        capped = left.filter(f => f.desiredStrength <= (pot * weight.get(f)) / w);
      if (!capped.length) {
        for (const f of left) f.target = (pot * weight.get(f)) / w;
        break;
      }
      for (const f of capped) pot -= f.target = f.desiredStrength;
      left = left.filter(f => !capped.includes(f));
    }
    // While the capital is under projected multi-sector pressure, even a land
    // offensive close to home cannot monopolize the mobilized field army. In
    // ordinary periods only long-distance amphibious offensives are constrained.
    const offensiveLimit = capitalCrisis ? army * FRONT.capitalCrisisOffenseShare : expeditionLimit;
    let reclaimed = 0;
    for (const f of open) if (f.type === 'offensive' &&
      (capitalCrisis || f.overseas) && f.target > offensiveLimit) {
      reclaimed += f.target - offensiveLimit;
      f.target = offensiveLimit;
    }
    if (reclaimed > 0 && !capitalCrisis)
      for (const f of open.filter(f => f.type === 'offensive' && !f.overseas)) {
        const grant = Math.min(reclaimed, Math.max(0, f.desiredStrength - f.target));
        f.target += grant;
        reclaimed -= grant;
        if (reclaimed <= 0) break;
      }
    // The pool goes to emergencies first, then the fronts furthest below their
    // targets. Leftover units join active fronts, respecting expedition caps.
    const pool = units.filter(u => !assign[u.id]),
      take = (f, range = Infinity) => {
        let best = null,
          bd = Infinity;
        for (const u of pool) {
          if (assign[u.id]) continue;
          const eta = travelTurns(u, f);
          if (eta > 4 || dist(g, at(u), f.anchor) > range) continue;
          const d = eta * 6 + dist(g, at(u), f.anchor) * 0.2 -
            (sticky[u.id]?.front === f.id ? 2 : 0);
          if (d < bd || (d === bd && (!best || u.id < best.id))) {
            bd = d;
            best = u;
          }
        }
        if (best) give(best, f);
        return !!best;
      };
    for (const f of emergencies) while (f.arrivingFour < f.target && take(f, FRONT.pull + 10));
    for (;;) {
      const needy = fronts.filter(f => f.arrivingFour < f.target)
        .sort((a, b) => b.target - b.arrivingFour - (a.target - a.arrivingFour));
      if (!needy.some(f => take(f))) break;
    }
    // If targets are already filled, prefer sending extra strength to an
    // offensive instead of accumulating units in routine defensive positions.
    const offensive = fronts.filter(f => f.type === 'offensive' && !f.overseas),
      localDefense = fronts.filter(f => f.type === 'alert' || f.emergency),
      overflow = capitalCrisis && localDefense.length
        ? localDefense : offensive.length ? offensive : localDefense.length ? localDefense : fronts;
    for (const u of pool) {
      if (assign[u.id]) continue;
      const reachableDefense = localDefense.filter(f => travelTurns(u, f) <= 6),
        reachableOverflow = overflow.filter(f => travelTurns(u, f) <= 10),
        local = byDist(at(u), reachableDefense)[0],
        preferred = byDist(at(u), reachableOverflow)[0],
        nearbyCover = local && local.assigned < local.target &&
          (!preferred || dist(g, at(u), local.anchor) + FRONT.pull < dist(g, at(u), preferred.anchor));
      const pick = nearbyCover ? local : preferred;
      if (pick) give(u, pick);
    }
    for(const f of fronts){
      f.deficit=Math.max(0,f.desiredStrength-f.arrivingFour);
      f.geographicExposure=f.objectives.filter(o=>o.defend).length;
      f.strategicValue=f.score;
      f.offensivePotential=f.type==='offensive' ?
        f.arrivingFour/Math.max(1,f.enemyStrength+2) : 0;
      f.stability=f.deficit>f.desiredStrength*0.6?'collapsing':
        f.type==='defensive'?'holding':f.offensivePotential>=1.25?'advancing':'contested';
    }
    // 5. Offensives: ASSEMBLING until enough of the assigned army stands at the rally city (or ahead of it), then
    // ATTACKING; an attack that has lost over half its force falls back to regroup. Defensive fronts hold.
    for (const f of fronts) {
      const st = (saved[f.id] ||= { state: 'assembling', since: g.turn });
      st.seen = g.turn;
      st.quiet = f.quiet;
      st.posture = f.posture;
      const mine = units.filter(u => assign[u.id] === f.id),
        set = v => {
          if (st.state !== v) Object.assign(st, { state: v, since: g.turn });
        };
      if (f.type !== 'offensive' || !f.rally)
        set(f.withdraw ? 'regrouping' :
          f.type === 'defensive' ? 'holding' : f.type === 'alert' ? 'alert' : 'attacking');
      else {
        if (st.state === 'holding' || st.state === 'alert' || st.state === 'regrouping') set('assembling');
        f.readyStrength = sum(mine.filter(u => dist(g, at(u), f.rally) <= FRONT.rally || aheadOfRally(g, f, at(u))));
        f.attackThreshold = Math.max(2, Math.min(f.desiredStrength * 0.8, f.assigned * 0.5));
        // Waiting alone does not make an army ready. After a short staging
        // period a smaller assault is allowed only when it can overpower its
        // nearby opposition; otherwise keep gathering instead of feeding units in.
        const limitedAssault = g.turn - st.since >= FRONT.wait &&
          f.readyStrength >= Math.max(1, f.assigned * 0.35) &&
          f.readyStrength >= f.enemyStrength * 1.2;
        if (st.state === 'assembling' && (f.readyStrength >= f.attackThreshold || limitedAssault)) {
          set('attacking');
          st.force = f.assigned;
          if (side !== g.player && f.objectives.some(o => o.owner === g.player))
            log(g, `${(g.factions?.[side] || FACTIONS[side]).short} forces massed at ${f.rally.name} open an offensive toward ${f.name}.`, side);
        } else if (st.state === 'attacking' && g.turn - st.since >= 2 && f.assigned < (st.force || 0) * 0.45) set('assembling');
      }
      f.state = st.state;
      f.friendlyStrength = f.assigned;
    }
    // A front that drops out of the plan keeps its state for three turns in case it returns.
    for (const [id, st] of Object.entries(saved)) if (g.turn - (st.seen ?? st.since) > 3) delete saved[id];
    // Destroyed units drop their assignment too (compact saves leave them out entirely).
    const living = new Set(allUnits(g).filter(u => u.hp > 0).map(u => u.id));
    for (const id of Object.keys(sticky)) if (!living.has(+id)) delete sticky[id];
    // 6. One goal field per front (built when a unit first asks): an assembling offensive pulls toward its rally city;
    // otherwise the objectives, and for threatened own cities the enemy units menacing them. An attacking front also
    // takes targets of opportunity, but only those `stray` path cost nearer than its own.
    const elsewhere = playerPrioritySeeds(g, side).map(([p, d]) => [p, d + FRONT.stray]);
    for (const f of fronts) {
      const seeds = (f.seeds =
        f.state === 'assembling'
          ? [[f.rally, 0]]
          : f.state === 'regrouping'
            ? [[f.fallback, -2]]
          : f.type === 'alert'
            ? f.objectives.filter(o => o.defend).map(o => [o, o.immediate ? -5 : -3])
            : f.objectives.flatMap(o =>
                o.defend
                  ? o.immediate && f.type === 'defensive'
                    ? [[o, o.seed], ...foes.filter(v => dist(g, v, o) <= R.threat).map(v => [v, o.seed + 1])]
                    : [] // projected warnings never redirect attacking units toward friendly cities
                  : [[o, o.seed]],
              ));
      f.masses = new Set(seeds.map(([p]) => massOf(g, p)).filter(m => m >= 0));
      if (f.state === 'attacking') f.seeds = [...playerPrioritySeeds(g, side, seeds), ...elsewhere];
      f.need = frontNeeds(f, units.filter(u => assign[u.id] === f.id));
    }
    // Idle carriers wait off the rally city of the best offensive across the sea.
    const lift = fronts.find(f => f.overseas && f.rally);
    Object.assign(memo, { fronts, byId, assign, fields: {}, staging: lift?.rally || null });
    planConquestMobileReserve(g,side,memo,state,units,fronts,emergencies);
  }
  // Conquest-only optional mobile reserve: 10% of a large field army camps
  // near a safe central transport junction. An active emergency releases it.
  function planConquestMobileReserve(g,side,memo,state,units,fronts,urgent){
    delete memo.reserve;
    if(g.mode!=='conquest'||urgent.length||units.length<20||fronts.length<3){
      state.mobileReserve=null;
      return;
    }
    const foes=g.units.filter(u=>u.hp>0&&foe(g,u.side,side)&&!isShip(u)),
      cities=g.stations.filter(s=>s.owner===side&&!foes.some(u=>dist(g,u,s)<=8)),
      main=fronts.slice(0,3);
    if(!cities.length||main.length<2)return;
    const hub=cities.slice().sort((a,b)=>{
      const weight=s=>main.reduce((sum,f)=>sum+dist(g,s,f.anchor),0);
      return weight(a)-weight(b)||a.id-b.id;
    })[0],
      count=Math.min(3,Math.floor(units.length*0.1)),
      previous=new Set(state.mobileReserve?.units||[]);
    const selected=units.filter(u=>!memo.guards?.[u.id]&&
      !memo.recoveries?.has(u.id)&&!foes.some(v=>dist(g,v,u)<=6)&&
      massOf(g,u)===massOf(g,hub)&&dist(g,u,hub)<=12 &&
      memo.byId[memo.assign[u.id]]?.type==='offensive')
      .sort((a,b)=>Number(previous.has(b.id))-Number(previous.has(a.id)) ||
        dist(g,a,hub)-dist(g,b,hub)||a.id-b.id).slice(0,count);
    memo.reserve={units:[],hub:null};
    for(const u of selected){
      const f=memo.byId[memo.assign[u.id]];
      if(!f||f.arrivingFour<Math.max(2,f.target*0.7))continue;
      f.assigned=Math.max(0,f.assigned-unitStrength(u));
      const eta=frontArrival(g,u,f);
      if(eta<=2)f.arrivingTwo=Math.max(0,f.arrivingTwo-unitStrength(u));
      if(eta<=4)f.arrivingFour=Math.max(0,f.arrivingFour-unitStrength(u));
      f.deficit=Math.max(0,f.desiredStrength-f.arrivingFour);
      delete memo.assign[u.id];
      delete state.assignments[u.id];
      memo.reserve.units.push(u.id);
    }
    if(memo.reserve?.units?.length){
      memo.reserve.hub={c:hub.c,r:hub.r,id:hub.id};
      state.mobileReserve={hub:hub.id,units:memo.reserve.units.slice(),since:state.mobileReserve?.since??g.turn};
    }else{delete memo.reserve;state.mobileReserve=null;}
  }
  // Already nearer an assembling front's target than its rally city is, on the rally's landmass.
  const aheadOfRally = (g, f, p) => massOf(g, p) === massOf(g, f.rally) && dist(g, p, f.anchor) < dist(g, f.rally, f.anchor);
  // Two formations may share a carrier when their fronts head for the same landmass.
  const sameLift = (a, b) => a === b || (!!a?.masses && !!b?.masses && [...a.masses].some(m => b.masses.has(m)));
  // What a front asks its factories for, by the enemy's composition there and its own: assault frames and rockets
  // against Armor, Armor against Infantry, guns when it lacks artillery, siege for fortified cities, and fast raiders
  // around a medium-frame core for an invasion across the sea (every formation needs a hull).
  function frontNeeds(f, mine, g = null) {
    const mix = list => {
        const m = { Infantry: 0, Armor: 0, Artillery: 0, total: 0 };
        for (const u of list) {
          const v = unitStrength(u);
          m[TYPES[u.type].branch] = (m[TYPES[u.type].branch] || 0) + v;
          m.total += v;
        }
        return m;
      },
      enemy = mix((f.enemies || []).filter(u => !isShip(u))),
      ours = mix(mine);
     const need = f.overseas
      ? ['raider', 'medium', 'assault', 'heavy']
      : f.type === 'defensive'
        ? ['heavy', 'rocket', 'medium', 'support']
        : enemy.total && enemy.Armor >= enemy.total * 0.5
          ? ['assault', 'rocket', 'heavy', 'medium']
          : ['medium', 'heavy', 'rocket', 'light'];
    if (!f.overseas && ours.Artillery < ours.total * 0.2)
      need.unshift(f.type === 'offensive' && f.objectives.some(o => o.fortified) ? 'siege' : 'rocket');
    if (g?.mode === 'scenario') {
      if (f.fortified && ours.Artillery < Math.max(1.5, ours.total * 0.3))
        need.unshift('siege', 'rocket', 'assault');
      else if (!unitAt(g, f.anchor) && f.anchor.shield < f.anchor.maxShield * 0.35)
        need.unshift('raider', 'assault', 'medium');
      if (f.overseas) need.unshift('raider', 'medium');
    }
    return [...new Set(need)];
  }
  // The active front a unit serves; newly raised formations reinforce understrength fronts.
  function frontOf(g, memo, u) {
    if (!memo?.byId || !u || memo.reserve?.units?.includes(u.id) || memo.guards?.[u.id] || memo.recoveries?.has(u.id) || isShip(u) || u.hold) return null;
    // Once a city falls, redirect the remaining attacking units immediately
    // instead of marching toward a city that is already theirs until next turn.
    if (g.mode === 'scenario') {
      const old = memo.byId[memo.assign[u.id]];
      if (old && !foe(g, old.anchor.owner, u.side))
        scenarioRememberCapture(g, u.side, old.anchor);
      const next = !old || !foe(g, old.anchor.owner, u.side)
        ? scenarioPick(g, memo, u)
        : old;
      if (next?.id !== old?.id) scenarioGive(g, memo, u, next);
      if (next) memo.columns[next.id] = next.members;
      return next || null;
    }
    if (!(u.id in memo.assign)) {
      const short = memo.fronts.filter(f => f.assigned < (f.target ?? f.desiredStrength)),
        offensive = memo.fronts.filter(f => f.type === 'offensive' || f.emergency),
        candidates = short.length ? short : offensive.length ? offensive : memo.fronts,
        f = candidates
          .slice()
          .sort((a, b) => dist(g, u, a.anchor) - dist(g, u, b.anchor) || (a.id < b.id ? -1 : 1))[0];
      memo.assign[u.id] = f?.id ?? null;
      if (f) {
        f.assigned += unitStrength(u);
        g.ai[u.side].assignments[u.id] = { front: f.id, since: g.turn };
      }
    }
    return memo.byId[memo.assign[u.id]] || null;
  }
  // The goal field a unit follows: the assigned front's. Guards and
  // unassigned units use the side-wide field; unassigned warships may use the leading front.
  function fieldFor(g, memo, u) {
    if(memo.reserve?.hub&&memo.reserve.units.includes(u.id)){
      const h=memo.reserve.hub;
      memo.reserveField ||= goalField(g,u.side,[[h,0]],'land');
      return p=>{const cost=memo.reserveField[p.r*g.cols+p.c];
        return Number.isFinite(cost)?cost:60;};
    }
    const f = frontOf(g, memo, u) || (isShip(u) ? memo.fronts?.[0] : null);
    let field = null;
    return p => {
      field ||= (f && (memo.fields[f.id] ||= goalField(g, f.side, f.seeds))) || (memo.field ||= goalField(g, u.side));
      const v = field[p.r * g.cols + p.c];
      return Number.isFinite(v) ? v : 60;
    };
  }
  // Frames able to reach or fire on a position next turn. Forecast legal movement rather
  // than treating units across a strait or impassable ridge as an immediate land threat.
  function threatTo(g, f, p) {
    const d = dist(g, f, p);
    const t = TYPES[f.type];
    const cargoReach = isShip(f) && f.cargo?.length ? t.move + Math.max(...f.cargo.map(c => E.movement(g, c) + rangeOf(g, c).max)) : 0,
      scan = Math.max(aiRange(g).threat, E.movement(g, f), cargoReach, t.naval === 'amphibious' ? amphibiousSea(g, f) : seaMove(g, f)) + rangeOf(g, f).max + 2;
    if (d > scan || f.hp <= 0) return 0;
    // Forecast the enemy's next fresh turn without changing the live phase or order flags.
    let memo = threatMemo.get(g);
    if (!memo || memo.turn !== g.turn || memo.phase !== g.phase) {
      memo = { turn: g.turn, phase: g.phase, units: new Map(), lands: new Map() };
      threatMemo.set(g, memo);
    }
    let paths = memo.units.get(f.id);
    if (!paths) {
      const future = { ...g, phase: f.side, over: false },
        unit = { ...f, moved: false, attacked: false, movedDistance: 0, skillReposition: 0, withdrawMove: false, morale: Math.max(-2, f.morale) };
      paths = { future, unit, positions: [tile(g, f.c, f.r), ...[...reachable(future, unit).keys()].map(k => {
        const [c, r] = k.split(',').map(Number);
        return tile(g, c, r);
      })] };
      memo.units.set(f.id, paths);
    }
    const canFire = q => {
      if (isSea(q) && !t.naval) return false;
      const r = rangeOf(g, { ...f, c: q.c, r: q.r, movedDistance: dist(g, f, q) });
      const distance = dist(g, q, p);
      return distance >= r.min && distance <= r.max;
    };
    const direct = paths.positions.some(q => canFire(q) || (canCapture(f) && !isShip(f) && q.c === p.c && q.r === p.r));
    let cargo = 0;
    if (isShip(f) && g.mode !== 'campaign' && f.cargo?.length) {
      // Cargo can launch and act immediately. A land-only route from a legal beach prevents
      // apparent threats across impassable terrain or onto a disconnected island.
      let land = memo.lands.get(key(p));
      if (!land) { land = goalField(g, f.side, [[p, 0]], 'land'); memo.lands.set(key(p), land); }
      const landReach = Math.max(...f.cargo.map(c => E.movement(g, c) + rangeOf(g, c).max)),
        launchable = paths.positions.some(q => deployTargetsAt(paths.future, q, f.side).some(beach => land[beach.r * g.cols + beach.c] <= landReach));
      if (launchable) cargo = f.cargo.reduce((a, c) => a + c.stack, 0);
    }
    return (direct ? f.stack : 0) + cargo;
  }
  // Garrison duty: the capital seeks two defenders (four when threatened).
  // Threatened cities, fortress cities, major ports, and mines draw defenders independently
  // of front assignments; nearby enemies are marked as urgent. No reserve quota applies.
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
  function planRecovery(g, side, memo) {
    const state = ((g.ai ||= {})[side] ||= { saving: false }),
      saved = (state.recovery ||= {}),
      recoveries = (memo.recoveries = new Map()),
      own = g.units.filter(u => u.hp > 0 && u.side === side),
      enemies = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      cities = g.stations.filter(s => s.owner === side),
      living = new Set(own.map(u => u.id));
    for (const id of Object.keys(saved)) if (!living.has(+id)) delete saved[id];
    const security = new Map(cities.map(s => [s.id, !enemies.some(v => threatTo(g, v, s) > 0)])),
      secure = s => security.get(s.id),
      covered = s => own.some(v => v.hp / maxHP(v) >= 0.5 && !isShip(v) && dist(g, v, s) <= 2),
      safeCities = cities.filter(s => secure(s) || covered(s));
    let recoveryBoard = null;
    const landRoute = seeds => {
      // Healing routes cannot assume the formation will fight through a hostile city
      // or enemy unit. Friendly occupancy may change before the formation gets there.
      if (!recoveryBoard) {
        const blocked = new Set([...enemies.map(key), ...g.stations.filter(s => foe(g, s.owner, side)).map(key)]);
        recoveryBoard = { ...g, tiles: g.tiles.map(p => blocked.has(key(p)) ? { ...p, terrain: 'peak' } : p) };
      }
      return goalField(recoveryBoard, side, seeds, 'land');
    };
    for (const u of own) {
      const ratio = u.hp / maxHP(u), active = saved[u.id],
        critical = !!u.cmd && localThreat(g, u, u) >= u.hp * 0.75;
      const essential = cities.some(s => dist(g, u, s) <= 1 && !secure(s) &&
        !own.some(v => v.id !== u.id && !isShip(v) && v.hp / maxHP(v) >= 0.4 && dist(g, v, s) <= 2));
      if (!(u.cmd || u.elite) || isSea(tile(g, u.c, u.r)) || u.hold || (memo.guards[u.id]?.emergency || (memo.guards[u.id] && !critical)) || essential || (ratio >= 0.7 && !critical)) {
        delete saved[u.id];
        continue;
      }
      if (!active && ratio >= 0.35 && !critical) continue;
      // If no secure repair route exists, a commander facing lethal local damage
      // may take a legal safer hex. This is a fallback of the existing recovery
      // planner, not a competing campaign retreat/front system.
      const localCover = () => {
        if (!critical || u.moved || u.attacked) return false;
        const current = localThreat(g, u, u);
        const options = [...reachable(g, u).keys()].map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        }).filter(p => p && !isSea(p) && !unitAt(g, p))
          .map(p => ({ p, risk: localThreat(g, u, p) }))
          .sort((a, b) => a.risk - b.risk || dist(g, a.p, u) - dist(g, b.p, u) ||
            a.p.r - b.p.r || a.p.c - b.p.c);
        if (!options.length || options[0].risk >= current * 0.8) return false;
        recoveries.set(u.id, { tactical: { c: options[0].p.c, r: options[0].p.r } });
        return true;
      };

      const seedsFor = s => [tile(g, s.c, s.r), ...adjacent(g, s)]
        .filter(p => !isSea(p) && !TERRAIN[p.terrain]?.blocked && (!stationAt(g, p) || stationAt(g, p).owner === side) && (!unitAt(g, p) || unitAt(g, p).id === u.id))
        .map(p => [p, 0]),
        candidates = safeCities.filter(s => massOf(g, s) === massOf(g, u)),
        previous = active && candidates.find(s => s.id === active.city);
      let city = previous, field = previous && landRoute(seedsFor(previous));
      if (!field || !Number.isFinite(field[u.r * g.cols + u.c])) {
        const seeds = candidates.flatMap(seedsFor);
        if (!seeds.length) { if (!localCover()) delete saved[u.id]; continue; }
        const route = landRoute(seeds);
        if (!Number.isFinite(route[u.r * g.cols + u.c])) { if (!localCover()) delete saved[u.id]; continue; }
        // Select the repair city by land route distance from this formation.
        const fromUnit = landRoute([[u, 0]]);
        city = candidates.slice().sort((a, b) => {
          const cost = s => Math.min(...seedsFor(s).map(([p]) => fromUnit[p.r * g.cols + p.c]));
          return cost(a) - cost(b) || a.id - b.id;
        })[0];
        field = city && landRoute(seedsFor(city));
      }
      if (!city || !Number.isFinite(field[u.r * g.cols + u.c])) { if (!localCover()) delete saved[u.id]; continue; }
      saved[u.id] = { city: city.id, since: active?.since ?? g.turn };
      recoveries.set(u.id, { city, field });
    }
  }
  // Enemy high command, run once at the start of each AI turn before its units act: batteries, repairs, saving for
  // super-heavies, upgrades, reinforcements, then production that prefers 2- and 3-frame formations.
  const hostileMass = (g, side, mass) => g.stations.some(s => massOf(g, s) === mass && foe(g, s.owner, side));
  // Troops worth lifting: their front's goal (its rally city while assembling) lies on another landmass, or (no front)
  // nothing to attack on theirs; or (city-taking Infantry and Armor only) far from it (goal field 14+), unless they are
  // still gathering.
  function wantsLift(g, u, memo) {
    if (TYPES[u.type].naval || atSea(g, u) || u.hold || memo.recoveries?.has(u.id)) return false;
    const front = frontOf(g, memo, u),
      mass = massOf(g, u),
      far = canCapture(u) && fieldFor(g, memo, u)(u) >= 14;
    if (front?.masses) return !front.masses.has(mass) || (far && front.state !== 'assembling');
    return !hostileMass(g, u.side, mass) || far;
  }
  // A landing hex: enemy frames within 3 hexes (threat) and an undefended enemy city within 2 (prize). Lower is better;
  // null when the beach is defended by more frames than the carrier brings.
  function landingScore(g, side, t, strength, fieldAt, masses = null) {
    if (!hostileMass(g, side, massOf(g, t)) && !masses?.has(massOf(g, t))) return null;
    const threat = g.units
      .filter(v => v.hp > 0 && foe(g, v.side, side) && !isShip(v) && !atSea(g, v) && dist(g, v, t) <= 3)
      .reduce((a, v) => a + v.stack, 0);
    if (threat > strength * (g.mode === 'scenario' ? 1.5 : 1)) return null;
    const prize = g.stations.some(s => foe(g, s.owner, side) && !unitAt(g, s) && dist(g, s, t) <= 2);
    return fieldAt(t) + threat * 3 - (prize ? 25 : 0);
  }
  // Launch every ready formation onto the best landing hex (toward its front, which may be a friendly rally city), then
  // give each its full turn.
  function aiLaunch(g, ship, events, fieldAt, masses) {
    const landed = [];
    const supportingCargo = g.units.filter(v => v.id !== ship.id && v.side === ship.side &&
      v.hp > 0 && TYPES[v.type]?.capacity > 0 && v.cargo?.length &&
      dist(g, v, ship) <= 3).reduce((a, v) =>
        a + v.cargo.reduce((sum, u) => sum + u.stack, 0), 0);
    for (let i = (ship.cargo?.length || 0) - 1; i >= 0; i--) {
      if (deployReason(g, ship, i)) continue;
      const strength = ship.cargo.reduce((a, c) => a + c.stack, 0),
        spot = deployTargets(g, ship, i)
          .map(t => ({ t, s: landingScore(g, ship.side, t, strength + supportingCargo + landed.filter(v => v.hp > 0 && !atSea(g, v) && dist(g, v, t) <= 3).reduce((a, v) => a + v.stack, 0), fieldAt, masses) }))
          .filter(o => o.s != null)
          .sort((a, b) => a.s - b.s)[0]?.t;
      if (!spot) break;
      const d = deploy(g, ship.id, i, spot.c, spot.r);
      if (!d.ok) continue;
      landed.push(d.unit);
      events.push({ kind: 'deploy', id: d.unit.id, from: { c: ship.c, r: ship.r }, to: d.to });
      events.push(...aiOrder(g, d.unit.id));
    }
  }
  // A carrier's operation: wait off a coast where troops bound overseas gather, sail for their front once loaded (full,
  // or after three turns), launch everything ashore; badly damaged and empty, head home to a port; idle, wait off the
  // rally city of the best offensive across the sea. One carrier serves one front. Returns false when there is nothing
  // to do, so the generic orders use it as a gunship.
  function seaCoasts(g, memo) {
    // Where a carrier can wait off a shore: open water or a coast hex, next to land troops can reach.
    return memo.coasts ||= g.tiles.filter(p => navigable(p) && !stationAt(g, p) && adjacent(g, p).some(n => !isSea(n) && !TERRAIN[n.terrain]?.blocked));
  }
  const WAVE_WAIT = 2; // turns a loaded carrier may hold on a beach for a second wave
  function aiCarrier(g, u, memo, events, fieldAt) {
    // Escorting is a fallback: a transport only escorts once the boarding
    // planner below finds no troops anywhere that need a lift and no staging
    // area. Hulls without capacity (future dedicated escorts) always escort.
    const canTransport = TYPES[u.type]?.capacity > 0;
    const escort = () => {
      const leader = g.units.filter(v => v.id !== u.id && v.side === u.side && v.hp > 0 &&
        isShip(v) && TYPES[v.type]?.capacity > 0 && v.cargo?.length &&
        dist(g, v, u) <= 8).sort((a, b) => dist(g, a, u) - dist(g, b, u) || a.id - b.id)[0];
      if (!leader || dist(g, u, leader) <= 2) return false;
      const choice = [...reachable(g, u).keys()].map(k => {
        const [c, r] = k.split(',').map(Number);
        return tile(g, c, r);
      }).filter(p => navigable(p) && !unitAt(g, p) && dist(g, p, leader) < dist(g, u, leader))
        .sort((a, b) => dist(g, a, leader) - dist(g, b, leader) || a.r - b.r || a.c - b.c)[0];
      const m = choice && move(g, u.id, choice.c, choice.r);
      if (!m?.ok) return false;
      events.push({ kind: 'move', ...m, id: u.id });
      return true;
    };
    if (!canTransport) return escort();
    const bound = u.cargo?.length ? frontOf(g, memo, u.cargo[0]) : null,
      masses = bound?.masses || null;
    if (bound) fieldAt = fieldFor(g, memo, u.cargo[0]);
    const fleet = (((g.ai ||= {})[u.side] ||= {}).fleet ||= {}),
      job = (fleet[u.id] ||= { wait: 0 }),
      teams = (memo.navalTeams ||= {}),
      team = bound ? (teams[bound.id] ||= { landing: null }) : null,
      cargo = u.cargo || [],
      reach = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .filter(p => !unitAt(g, p)),
      sail = p => {
        if (!p || (p.c === u.c && p.r === u.r)) return;
        const m = move(g, u.id, p.c, p.r);
        if (m.ok) events.push({ kind: 'move', ...m, id: u.id });
      },
      danger = p => g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, p) <= 2).length,
      strength = cargo.reduce((a, c) => a + c.stack, 0),
      landingSupport = g.units.filter(v => v.id !== u.id && v.side === u.side && v.hp > 0 &&
        TYPES[v.type]?.capacity > 0 && v.cargo?.length),
      landing = p => {
        // Count only a nearby loaded carrier as prospective same-wave support.
        const support = landingSupport.filter(v => dist(g, v, p) <= 3)
          .reduce((n, v) => n + v.cargo.reduce((a, c) => a + c.stack, 0), 0);
        const scores = deployTargetsAt(g, p, u.side, cargo.length > 0)
          .map(t => landingScore(g, u.side, t, strength + support, fieldAt, masses))
          .filter(v => v != null);
        return scores.length ? Math.min(...scores) + danger(p) * 2 + (team?.landing ? Math.min(30, dist(g, p, team.landing) * 4) : 0) : null;
      };
    const here = tile(g, u.c, u.r),
      // The route is sea-only even when its goal is a city or troops ashore. Include
      // the current hex so an unreachable or temporarily blocked route holds safely.
      followSea = seeds => {
        if (!seeds.length) return false;
        const route = goalField(g, u.side, seeds, 'sea'),
          value = p => route[p.r * g.cols + p.c],
          choices = [here, ...reach].filter(p => Number.isFinite(value(p)))
            .sort((a, b) => value(a) - value(b) || danger(a) - danger(b) || dist(g, a, u) - dist(g, b, u));
        if (!choices.length) return false;
        sail(choices[0]);
        return true;
      },
      coastSeeds = (landField, limit = Infinity) => seaCoasts(g, memo).flatMap(p => {
        const costs = adjacent(g, p).filter(n => !isSea(n) && !TERRAIN[n.terrain]?.blocked)
          .map(n => landField[n.r * g.cols + n.c]).filter(v => Number.isFinite(v) && v <= limit);
        return costs.length ? [[p, Math.min(...costs)]] : [];
      });
    const ports = g.stations.filter(s => s.portAt && s.portOwner === u.side).map(s => tile(g, s.portAt.c, s.portAt.r));
    if (!cargo.length && u.hp / maxHP(u) < 0.4 && ports.length) {
      followSea(ports.map(p => [p, 0]));
      return true;
    }
    const ready = cargo.some(c => c.boardedTurn !== g.turn);
    if (ready && (cargo.length >= carrierCapacity(g, u) || job.wait >= 3)) {
      if (landing(tile(g, u.c, u.r)) == null) {
        // Seed feasible landing positions, then route through navigable water rather
        // than following a land shortcut in the formation's strategic goal field.
        const seeds = seaCoasts(g, memo).map(p => [p, landing(p)]).filter(([, score]) => score != null)
          .sort((a, b) => a[1] - b[1] || a[0].r - b[0].r || a[0].c - b[0].c);
        if (team && seeds.length) team.landing = seeds[0][0];
        followSea(seeds);
      }
      // Briefly hold for a second wave bound for the same front instead of
      // drip-feeding lone transports. Only on a quiet beach, only while that
      // carrier keeps closing in, and never while it is itself holding (so two
      // carriers cannot wait on each other). The wave timer is separate from
      // the boarding timer and capped at WAVE_WAIT turns.
      const spot = tile(g, u.c, u.r), // after any move above
        atBeach = landing(spot) != null,
        wave = atBeach && !danger(spot) && (job.waveWait || 0) < WAVE_WAIT && landingSupport
          .filter(v => isShip(v) && !fleet[v.id]?.waveWait && sameLift(frontOf(g, memo, v.cargo[0]), bound))
          .map(v => ({ v, d: dist(g, v, u) }))
          .filter(({ v, d }) => d > 3 && d <= 6 && !(job.waveGap?.id === v.id && d >= job.waveGap.d))
          .sort((a, b) => a.d - b.d || a.v.id - b.v.id)[0];
      if (wave) {
        job.waveWait = (job.waveWait || 0) + 1;
        job.waveGap = { id: wave.v.id, d: wave.d };
        return true;
      }
      job.waveWait = 0;
      delete job.waveGap;
      if (atBeach) aiLaunch(g, u, events, fieldAt, masses);
      if (!u.cargo.length) job.wait = 0;
      return true;
    }
    if (cargo.length) job.wait++;
    const riders = g.units.filter(
      v => v.hp > 0 && v.side === u.side && !memo.guards?.[v.id] && (!cargo.length || sameLift(frontOf(g, memo, v), bound)) && wantsLift(g, v, memo),
    );
    if (!riders.length) {
      const stage = !cargo.length && memo.staging;
      if (!stage) return cargo.length > 0 || escort();
      if (dist(g, u, stage) > 2) {
        const land = goalField(g, u.side, [[stage, 0]], 'land');
        followSea(coastSeeds(land, FRONT.rally));
      }
      return true;
    }
    const land = goalField(g, u.side, riders.map(v => [v, 0]), 'land');
    followSea(coastSeeds(land));
    return true;
  }
  function aiProduction(g) {
    const side = g.phase,
      e = funds(g, side),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      own = () => g.units.filter(u => u.hp > 0 && u.side === side),
      front = p => {
        let best = 99;
        for (const u of foes) best = Math.min(best, dist(g, u, p));
        return best;
      },
      plan = ((g.ai ||= {})[side] ||= {}),
      memo = aiPlan(g, side),
      eliteCampaign = g.mode === 'campaign' && g.difficulty === 'elite',
      eliteAI = eliteCampaign || eliteAIProduction(g),
      builds = g.mode !== 'campaign' || !!g.campaign?.production?.includes(side) ||
        (eliteCampaign && foe(g, side, g.player));
    const bases = g.stations.filter(s => s.owner === side).sort((a, b) => front(a) - front(b));
    const yard3 = bases.filter(s => s.tier >= 3);
    const superType = typeFor(side, 'super', g);
    // 0. Fire every ready battery at the strongest enemy unit in range (the UI animates g.strikes).
    g.strikes = [];
    for (const s of bases) {
      const target = fortressTargets(g, s)
        .map(p => unitAt(g, p))
        .sort((a, b) => b.hp - a.hp || a.id - b.id)[0];
      if (target) {
        const shot = fireFortress(g, s.id, target.c, target.r);
        if (shot.ok) g.strikes.push(shot);
      }
    }
    // 0b. F.L.E.I.J.A.: one ready warhead maximum; rival Eliminator sites are unknown.
    g.launches = [];
    if (g.mode !== 'scenario' && (g.arsenal?.[side] || 0) > 0 && !g.over) {
      const p = aiLaunchTarget(g, side),
        shot = p && launch(g, side, p.c, p.r);
      if (shot?.ok) g.launches.push(shot);
    }
    // 1. Repair badly damaged units resting at a friendly city (this spends their turn).
    for (const u of (g.mode === 'scenario' && !['division','europe'].includes(memo.doctrine) ? [] : own())
      .filter(u => u.hp / maxHP(u) < (memo.recoveries?.has(u.id) ? 0.7 : 0.55) && nearFriendlyCity(g, u) && !atSea(g, u))
      .sort((a, b) => a.hp / maxHP(a) - b.hp / maxHP(b))) {
      if (e.credits - repairCost(u, g) >= 60) repair(g, u.id);
    }
    g.vacated = [];
    if (!builds) return;
    // 1b. Clear the factories, as a player would (a unit on the city hex blocks building there). A ready unit on a
    // quiet city carries out its orders first. Threatened cities clear their garrison only in tryBuild,
    // immediately before a replacement is purchased with the final resource reserves applied.
    // The UI plays these moves from g.vacated ({ id, orders }).
    for (const s of bases) {
      const u = unitAt(g, s);
      if (!u || u.side !== side || u.moved || !isReady(g, u)) continue;
      if (!foes.some(f => dist(g, f, s) <= 2)) {
        const orders = aiOrder(g, u.id);
        // Without a dedicated garrison, the unit may not have a local
        // objective. It must still clear the city's production hex.
        if (u.c === s.c && u.r === s.r && !u.moved) {
          const reach = reachable(g, u);
          const spot = adjacent(g, s)
            .filter(p => reach.has(key(p)) && !isSea(p) && !stationAt(g, p) && !unitAt(g, p))
            .sort((a, b) => (TERRAIN[b.terrain]?.cover || 0) - (TERRAIN[a.terrain]?.cover || 0) || a.r - b.r || a.c - b.c)[0];
          const moveOut = spot && move(g, u.id, spot.c, spot.r);
          if (moveOut?.ok) orders.push({ kind: 'move', ...moveOut, id: u.id });
        }
        g.vacated.push({ id: u.id, orders });
        continue;
      }
    }
    // 2. Super-heavy production is now a normal factory choice, evaluated by
    // local battlefield demand. Retire legacy savings/cooldown flags in old saves.
    delete plan.saving;
    delete plan.lastSuperTurn;
    const ordinaryBudget = price(typeFor(side, 'scout', g), 2, g, side);
    // 2b. F.L.E.I.J.A. Eliminator: the moment countermeasures are available, rivals build them before anything else,
    // starting every charge they can afford (up to ELIMINATOR.max) and saving for the next one. With no free lab-3
    // city outside their charges' cover, step 3 raises a lab for one (defensePrep).
    const wantsDefense = () => g.mode !== 'scenario' && eliminatorUnlocked(g) && sideEliminators(g, side).length < ELIMINATOR.max;
    let defenseCity = null;
    while (wantsDefense() && (defenseCity = eliminatorCity(g, side)) && !eliminatorReason(g, defenseCity)) {
      startEliminator(g, defenseCity.id);
      defenseCity = null;
    }
    plan.eliminator = !!defenseCity;
    const defensePrep = wantsDefense() && !defenseCity ? eliminatorCity(g, side, true) : null;
    // 2c. F.L.E.I.J.A.: one warhead per strategic pool (shared by the 2018 Britannian allies). The human
    // Britannian partner has first claim when it can afford a project. A power with the
    // Sakuradite for it (or the income to gather it soon) keeps that Sakuradite back, then saves credits and industry
    // and starts the project in its best-lab city.
    const warCity =
      g.mode !== 'scenario' && !plan.eliminator &&
      hasFleija(g, side) &&
      fleijaWarheadCount(g, side) < FLEIJA.max &&
      !fleijaPlayerPriority(g, side)
        ? fleijaCity(g, side, front)
        : null;
    plan.warhead = !!warCity && ((e.sakuradite || 0) >= FLEIJA.cost.sakuradite || income(g, side).sakuradite >= 15);
    if (plan.warhead && !projectReason(g, warCity)) {
      startProject(g, warCity.id);
      plan.warhead = false;
    }
    const defenseSaving = plan.eliminator && (e.sakuradite || 0) >= ELIMINATOR.cost.sakuradite,
      warSaving = plan.warhead && (e.sakuradite || 0) >= FLEIJA.cost.sakuradite;
    // Reserve strategic-weapon funds as before; super-heavies no longer hoard resources.
    const reserve = eliteCampaign ? 0 : defenseSaving
      ? Math.min(e.credits, ELIMINATOR.cost.credits)
      : warSaving ? Math.min(e.credits, FLEIJA.cost.credits) : 60;
    const reserveInd = defenseSaving
      ? Math.min(e.industry, ELIMINATOR.cost.industry)
      : warSaving ? Math.min(e.industry, FLEIJA.cost.industry) : 0;
    const reserveSak = plan.eliminator
      ? ELIMINATOR.cost.sakuradite
      : plan.warhead ? FLEIJA.cost.sakuradite : 0;
    const spendable = () => Math.max(0, e.credits - reserve);
    // Sakuradite held back for a project only blocks purchases that spend Sakuradite.
    const affordable = c =>
      c.credits <= spendable() &&
      e.industry - (c.industry || 0) >= reserveInd &&
      (!c.sakuradite || (e.sakuradite || 0) - c.sakuradite >= reserveSak);
    // Preserve an ordinary formation budget when making optional investments;
    // the recruitment pass itself remains free to use that budget.
    const developmentAffordable = c => affordable(c) &&
      spendable() - c.credits >= ordinaryBudget.credits &&
      e.industry - reserveInd - (c.industry || 0) >= ordinaryBudget.industry;
    // Lighter frames leave enough Sakuradite for one heavy frame once a level-3 factory exists.
    const heavySak = yard3.length ? price(typeFor(side, 'heavy', g), 1, g, side).sakuradite : 0;
    const keepsHeavy = (type, c) =>
      !c.sakuradite || TYPES[type].tier >= 3 || (e.sakuradite || 0) - c.sakuradite >= heavySak;
    // 3. Upgrade one building per turn when there is surplus: Sakuradite refineries first (richest deposit first),
    // then the lowest-level factory or lab at the safest city.
    if (g.turn >= 2) {
      let upgraded = false;
      // Rivals can prepare Labs I-II early, but Lab III obeys the current conquest's gate.
      // A city that needs a lab for its next Eliminator comes first.
      const unlockTurn = fleijaLabTurn(g),
        soon = g.turn >= unlockTurn - 5,
        prep =
          side !== g.player && isMajor(g, side) ? defensePrep || (soon ? fleijaCity(g, side, front) : null) : null;
      if (
        prep &&
        (prep.lab || 0) < FLEIJA.lab &&
        ((prep.lab || 0) < FLEIJA.lab - 1 || g.turn >= unlockTurn)
      ) {
        const cost = buildCost(prep, 'lab');
        if (spendable() - cost.credits >= 100 && developmentAffordable(cost)) upgraded = build(g, prep.id, 'lab').ok;
      }
      for (const d of (g.sites || []).filter(d => depositOwner(g, d) === side).sort((a, b) => b.base - a.base)) {
        const host = depositHost(g, d),
          cost = buildCost(host, 'refinery');
        if (upgraded) break;
        if ((host.refinery || 0) >= 3 || spendable() - cost.credits < 150 || !developmentAffordable(cost)) continue;
        upgraded = (d.city == null ? refine(g, d.id) : build(g, host.id, 'refinery')).ok;
        if (upgraded) break;
      }
      const options = bases
        .flatMap(s => (g.mode === 'scenario' ? ['factory'] : ['factory', 'lab'])
          .map(kind => ({ s, kind, level: buildingLevel(s, kind) })))
        .filter(o => o.level < 3 && !(o.kind === 'lab' && o.level === 2 && g.turn < unlockTurn))
        .sort((a, b) => a.level - b.level || front(b.s) - front(a.s) || random(g) - 0.5);
      const pick = options[0];
      if (
        !upgraded &&
        pick &&
        spendable() - buildCost(pick.s, pick.kind).credits >= 250 &&
        developmentAffordable(buildCost(pick.s, pick.kind))
      )
        build(g, pick.s.id, pick.kind);
    }
    // 4. Reinforce healthy Armor and Artillery units parked at a friendly city.
    for (const u of own()
      .filter(
        u =>
          u.stack < 3 &&
          !u.moved &&
          !u.attacked &&
          TYPES[u.type].branch !== 'Infantry' &&
          u.hp / maxHP(u) >= 0.7 &&
          nearFriendlyCity(g, u) &&
          !atSea(g, u) &&
          // Keep the garrison's move available until replacement recruitment is decided.
          !(stationAt(g, u)?.owner === side && front(u) <= 2 &&
            stationAt(g, u).producedTurn !== g.turn && !cityBusyReason(g, stationAt(g, u))),
      )
      .sort((a, b) => TYPES[b.type].cost - TYPES[a.type].cost)) {
      const c = reinforceCost(u.type, g, side, u);
      if (developmentAffordable(c) && keepsHeavy(u.type, c) && spendable() - c.credits >= 150) reinforce(g, u.id);
    }
    // 5. Build: factories serving the front with the largest strength deficit first (then front-line ones), each
    // putting what its front asks for at the top of its menu. There is no army cap; the treasury is the limit.
    const yardFront = new Map(),
      // Factories must reinforce a front they can actually reach. Deficits use
      // near-term arrivals rather than distant assigned troops that will not
      // defend the city in the next few turns.
      factoryETA = (s, f) => f && frontArrival(g,s,f),
      // Japan Scenario: reinforcements march toward an active, understrength attack along
      // real terrain and naval routes instead of a generic nearest enemy or a rear-area defense.
      // A capture-capable unit standing at the factory estimates the real land or sea route,
      // so island factories can reinforce overseas columns.
      scenarioServes = s => {
        const needing = memo.fronts.filter(f => (f.deficit ??
          Math.max(0,f.desiredStrength-f.assigned)) > 0);
        const choices = needing.length ? needing : memo.fronts;
        const sample = allUnits(g).find(u => u.side === side && u.hp > 0 && canCapture(u) && !isShip(u)),
          proxy = sample && { ...sample, id: 'factory:' + s.id, c: s.c, r: s.r },
          route = f => scenarioTravel(g, proxy || s, f);
        return choices.slice().sort((a,b) => {
          const score = f => (f.deficit??Math.max(0,f.desiredStrength-f.assigned))*2 /
            (1+route(f)) + (f.state==='regrouping'?2:0);
          return score(b)-score(a)||route(a)-route(b)||a.anchor.id-b.anchor.id;
        })[0];
      },
      scenarioUrgency = s => {
        const f = scenarioServes(s);
        if (!f) return 0;
        const shortage = f.deficit ?? Math.max(0,f.desiredStrength-f.assigned);
        const travel = frontArrival(g,s,f);
        return shortage*3/(1+Math.min(10,travel)/3) + (f.state==='regrouping'?2:0);
      },
      serves = s => {
        if (g.mode === 'scenario') return scenarioServes(s);
        if (!yardFront.has(s.id)) {
          const chosen = (memo.fronts || [])
            .map(f => ({ f, eta: factoryETA(s, f),
              gap: f.deficit ?? Math.max(0, f.desiredStrength - (f.arrivingFour || 0)) }))
            .filter(x => x.eta <= 5 && x.gap > 0)
            .sort((a, b) =>
              b.gap * (1 + (b.f.type === 'defensive' ? 0.8 : 0.1)) /
                (1 + b.eta * 0.4) -
              a.gap * (1 + (a.f.type === 'defensive' ? 0.8 : 0.1)) /
                (1 + a.eta * 0.4) || a.eta - b.eta)[0];
          yardFront.set(s.id, chosen || null);
        }
        return yardFront.get(s.id)?.f || null;
      },
      urgency = s => {
        if (g.mode === 'scenario') return scenarioUrgency(s);
        const chosen = yardFront.get(s.id);
        const f = serves(s);
        const eta = chosen?.eta ?? factoryETA(s, f || { anchor: s });
        const nearbyThreat = foes.some(u => dist(g, u, s) <= aiRange(g).threat) ? 8 : 0;
        return nearbyThreat + (f
          ? (f.deficit ?? Math.max(0, f.desiredStrength - (f.arrivingFour || 0))) *
              (0.5 + Math.max(0, f.score) / 100) / (1 + eta * 0.35)
          : 0);
      },
      yards = bases.slice().sort((a, b) => urgency(b) - urgency(a) || a.id - b.id);
    // 4b. Navy: fleet and port construction scale with coastal exposure, enemy naval
    // threats and overseas fronts rather than arbitrary per-faction ship/port caps.
    // Spending on the fleet must still leave a normal two-frame Scout formation
    // affordable, so coastal construction cannot starve the field army.
    const navy = g.mode !== 'campaign' && (g.mode === 'conquest' && g.era === 'ufn2018' && side === 'cf' ? NAVAL.bk : NAVAL[side]);
    if (navy) {
      const coastal = [
          ...bases.filter(s => portSite(g, s)),
          // Captured shipyards remain available while their cities are still enemy-held.
          ...g.stations.filter(s => s.owner !== side && s.portAt && s.portLevel && (s.portOwner || s.owner) === side),
        ],
        availableFleet = own().filter(u => !!TYPES[u.type].naval),
        navalThreats = foes.filter(u => TYPES[u.type].naval &&
          coastal.some(s => dist(g, s, u) <= aiRange(g).enemyScan)),
        invasions = (memo.fronts || []).filter(f => f.overseas && f.type === 'offensive' &&
          (g.mode !== 'scenario' || f.assigned > 0)),
        invasionIds = new Set(invasions.map(f => f.id)),
        invasionTroops = own().filter(u => !TYPES[u.type].naval && invasionIds.has(memo.assign?.[u.id])).length,
        desiredCarriers = coastal.length
          ? Math.ceil(coastal.length / 12) + Math.ceil(invasionTroops / 7) + Math.ceil(navalThreats.length / 3)
          : 0,
        desiredAmphibious = coastal.length
          ? Math.ceil(coastal.length / 9) + Math.ceil(invasionTroops / 5) + Math.ceil(navalThreats.length / 2)
          : 0,
        desiredPorts = Math.max(invasions.length, Math.ceil((desiredCarriers + desiredAmphibious) / 4)),
        desiredCarrierPorts = Math.ceil(desiredCarriers / 3),
        navyAffordable = c => affordable(c) &&
          spendable() - c.credits >= ordinaryBudget.credits &&
          e.industry - reserveInd - (c.industry || 0) >= ordinaryBudget.industry,
        ownedPorts = () => coastal.filter(s => s.portLevel && (s.portOwner || s.owner) === side),
        fleetCount = (...roles) => availableFleet.filter(u => eliteScenario(g)
          ? roles.some(r => r === 'carrier' ? TYPES[u.type].naval === 'ship' : TYPES[u.type].naval === 'amphibious')
          : roles.some(r => u.type === navy[r])).length;

      const ports = ownedPorts();
      const carrierPorts = ports.filter(s => s.portLevel >= 2);
      // More distant ports extend support to additional coastlines, and forward
      // rally cities get priority when several coastal cities are available.
      const portCandidates = coastal
        .filter(s => !s.portLevel && !buildReason(g, s, 'port'))
        .map(s => {
          const separation = ports.length ? Math.min(...ports.map(p => dist(g, s, p))) : 99;
          const invasionPriority = invasions.length
            ? Math.max(...invasions.map(f => Math.max(0, 20 - dist(g, s, f.rally || f.anchor))))
            : 0;
          const threatPriority = navalThreats.some(u => dist(g, s, u) <= aiRange(g).threat * 2) ? 15 : 0;
          return { s, separation, score: Math.min(30, separation) * 2 + invasionPriority + threatPriority };
        })
        .filter(o => o.separation >= 6 || !ports.length)
        .sort((a, b) => b.score - a.score || a.s.id - b.s.id);
      // Upgrade existing carrier berths before adding capacity. One port reaches
      // level 3 so landing tech and higher-tier naval research are usable.
      const portToUpgrade =
        (carrierPorts.length < desiredCarrierPorts
          ? ports.find(s => s.portLevel === 1 && !buildReason(g, s, 'port'))
          : null) ||
        (g.turn >= 3 && !ports.some(s => s.portLevel >= 3)
          ? carrierPorts.find(s => !buildReason(g, s, 'port'))
          : null);
      const portToBuild = portToUpgrade ||
        (ports.length < desiredPorts ? portCandidates[0]?.s : null);
      if (portToBuild) {
        const cost = buildCost(portToBuild, 'port');
        if (navyAffordable(cost) && spendable() - cost.credits >= ordinaryBudget.credits + 100)
          build(g, portToBuild.id, 'port');
      }

      // Every available berth may recruit when the navy is undersized. Balance
      // carriers against amphibious formations by proportional shortage, not a
      // static fleet ceiling. Port availability and the treasury remain limits.
      for (const port of ownedPorts().sort((a, b) => front(a) - front(b))) {
        const carriers = fleetCount('carrier'),
          amph = fleetCount('amphibious', 'amphibious2'),
          carrierGap = desiredCarriers - carriers,
          amphGap = desiredAmphibious - amph;
        if (carrierGap <= 0 && amphGap <= 0) break;
        const carrierFirst = carrierGap > 0 &&
          (amphGap <= 0 || carrierGap / Math.max(1, desiredCarriers) >= amphGap / Math.max(1, desiredAmphibious));
        const roles = carrierFirst ? ['carrier', 'amphibious2', 'amphibious'] :
          ['amphibious2', 'amphibious', 'carrier'];
        for (const role of roles) {
          if ((role === 'carrier' && carrierGap <= 0) || (role !== 'carrier' && amphGap <= 0)) continue;
          if (eliteScenario(g) && role !== 'carrier') {
            const id = Object.keys(ELITE_FORCES).find(k => {
              const e = ELITE_FORCES[k], t = TYPES[e.type];
              return eliteEligible(g, side, k) &&
                (role === 'carrier' ? t.naval === 'ship' : t.naval === 'amphibious');
            });
            if (!id) continue;
            const cost = elitePrice(id, 1);
            if (navyAffordable(cost) && !aiEliteRecruitReason(g, port, id) &&
                recruitAIElite(g, port.id, id).ok) {
              availableFleet.push(g.units[g.units.length - 1]);
              break;
            }
          } else {
            const type = navy[role], cost = price(type, 1, g, side);
            if (navyAffordable(cost) && canBuy(g, port, type, 1) && recruit(g, port.id, type, 1).ok) {
              availableFleet.push(g.units[g.units.length - 1]);
              break;
            }
          }
        }
      }
    }
    // Formations first: every factory tries a 3- or 2-frame formation before
    // unfilled factories may produce an affordable single-frame unit. A successful
    // formation elsewhere must not block production at an otherwise idle factory.
    // Super-heavy demand is proportional to the actual armored/high-tier threat
    // at an understrength front. There is no arbitrary ownership or turn cap.
    // Include new recruits as they are produced, so simultaneous factories
    // cannot all oversupply the same front based on an outdated plan snapshot.
    const superDemand = f => {
      if (!f || f.overseas) return false;
      const enemies = f.enemies || [],
        armored = enemies.filter(u => TYPES[u.type].branch === 'Armor')
          .reduce((total, u) => total + unitStrength(u), 0),
        elite = enemies.filter(u => (TYPES[u.type].tier || 1) >= 3)
          .reduce((total, u) => total + unitStrength(u), 0),
        fortified = f.type === 'offensive' && f.objectives.some(o => o.fortified);
      if (armored < 3 && elite < 3 && !fortified) return false;
      const desired = Math.min(f.desiredStrength * 0.35,
          Math.max(fortified ? 3 : 0, armored * 0.6 + elite * 0.3)),
        existing = own().filter(u => u.type === superType &&
          (memo.assign?.[u.id] === f.id ||
            (!memo.assign?.[u.id] && dist(g, u, f.anchor) <= 25)))
          .reduce((total, u) => total + unitStrength(u), 0);
      return existing < desired;
    };
    const menuOf = s => {
      if (eliteAI) {
        const theater = serves(s),
          needed = theater?.need || [],
          anchor = theater?.rally || theater?.anchor || s,
          enemy = (theater?.enemies?.length ? theater.enemies : foes.filter(u => dist(g, u, s) <= 9))
            .filter(u => !TYPES[u.type].naval),
          ally = own().filter(u => !TYPES[u.type].naval && dist(g, u, anchor) <= 10),
          branchCount = branch => ally.filter(u => TYPES[u.type].branch === branch).length,
          enemyCount = branch => enemy.filter(u => TYPES[u.type].branch === branch).length,
          attacked = enemy.some(u => dist(g, u, s) <= 3),
          defensive = attacked || theater?.type === 'defensive',
          fortified = theater?.type === 'offensive' && (theater.objectives || []).some(o => o.fortified);
        // Prefer classes requested by an actual front. Adjust for missing
        // artillery/infantry/armor, enemy threats and fortified objectives.
        // The small per-factory tie break prevents identical spam from every city.
        const score = id => {
          const t = TYPES[ELITE_FORCES[id].type],
            rank = needed.indexOf(t.cls),
            total = Math.max(1, ally.length),
            desired = t.branch === 'Armor' ? 0.50 : t.branch === 'Artillery' ? 0.25 : 0.25,
            scarcity = desired - branchCount(t.branch) / total;
          let value = (rank < 0 ? 0 : 36 - rank * 4) + scarcity * 28;
          if (fortified && t.branch === 'Artillery') value += 25;
          if (fortified && t.cls === 'super') value += 11;
          if (defensive && t.branch === 'Armor') value += 9;
          if (defensive && t.branch === 'Infantry') value += 5;
          if (enemyCount('Armor') > enemyCount('Infantry') && t.cls === 'super') value += 12;
          if (enemyCount('Infantry') > enemyCount('Armor') && t.branch === 'Artillery') value += 12;
          if (enemyCount('Artillery') && (t.cls === 'raider' || t.cls === 'assault')) value += 10;
          if (!theater && !attacked && t.branch === 'Infantry') value += 4;
          // Never ignore a front's demand, but avoid filling an entire theater
          // with the first highly rated unit. Recent builds count, not the
          // diverse historical starting army; revisit demand after each build.
          const alreadyBuilt = own().filter(u => u.elite === id && !u.eliteStart).length;
          value -= Math.min(42, alreadyBuilt * 10);
          if (s.tier >= 3 && t.tier >= 3) value += 12;
          // Premium frames against active threats; lighter forces for quiet fronts.
          if (enemy.length || fortified) value += t.tier * 2;
          const hash = [...id].reduce((v, ch) => v + ch.charCodeAt(0), 0);
          return value + ((s.id * 13 + g.turn * 7 + hash) % 13) / 6;
        };
        return (eliteCampaign ? g.campaign?.eliteRosters?.[side] || [] : Object.keys(ELITE_FORCES))
          .filter(id => (eliteCampaign || eliteEligible(g, side, id)) &&
            !TYPES[ELITE_FORCES[id].type].naval &&
            TYPES[ELITE_FORCES[id].type].tier <= s.tier)
          .sort((a, b) => score(b) - score(a) || a.localeCompare(b));
      }
      // Tier-1 frames (no Sakuradite) follow as fallbacks when Sakuradite runs short.
      const classes =
          s.tier >= 3
            ? ['heavy', 'siege', 'medium', 'rocket', 'light', 'assault', 'support', 'scout']
            : s.tier === 2
              ? ['medium', 'rocket', 'raider', 'light', 'support', 'assault', 'scout']
              : ['light', 'support', 'assault', 'scout'],
        need = (serves(s)?.need || []).filter(c => classes.includes(c)),
        menu = [...need, ...classes.filter(c => !need.includes(c))].map(cls => typeFor(side, cls, g)),
        // Scenario factories obey the assault column's requested unit mix.
        // Other modes retain their existing randomized menu preference.
        preferred = g.mode === 'scenario' && need.length ? menu[0] :
          menu[Math.floor(random(g) * Math.min(menu.length, 3))];
      // Super-heavy competes in the same formation-size and affordability passes
      // when demanded, instead of being purchased by a separate saving routine.
      return s.tier >= 3 && superDemand(serves(s))
        ? [superType, preferred, ...menu.filter(x => x !== preferred)]
        : [preferred, ...menu.filter(x => x !== preferred)];
    };
    // The frame the front asks for comes first, in the largest formation affordable, then the next frame on the menu.
    const tryBuild = (s, menu, sizes) => {
      const defender = unitAt(g, s),
        vacating = defender?.side === side && isReady(g, defender) && !defender.moved && front(s) <= 2 ? defender : null,
        reach = vacating && reachable(g, vacating),
        spot = reach && adjacent(g, s)
          .filter(p => reach.has(key(p)) && !isSea(p) && !stationAt(g, p) && !unitAt(g, p))
          .sort((a, b) => (TERRAIN[b.terrain]?.cover || 0) - (TERRAIN[a.terrain]?.cover || 0) || a.r - b.r || a.c - b.c)[0];
      if (eliteAI) {
        for (const id of menu) {
          const cost = elitePrice(id, eliteCampaign ? 3 : 1);
          if (!affordable(cost) || aiEliteRecruitReason(g, s, id, spot ? vacating : null)) continue;
          if (vacating) {
            if (!spot) continue;
            const m = move(g, vacating.id, spot.c, spot.r);
            if (!m.ok) continue;
            g.vacated.push({ id: vacating.id, orders: [{ kind: 'move', ...m, id: vacating.id }] });
          }
          if (recruitAIElite(g, s.id, id).ok) return true;
        }
        return false;
      }
      for (const type of menu)
        for (const n of sizes) {
          const c = price(type, n, g, side);
          if (type === superType &&
              (!superDemand(serves(s)) ||
                spendable() - c.credits < ordinaryBudget.credits ||
                e.industry - reserveInd - c.industry < ordinaryBudget.industry)) continue;
          if (!canBuy(g, s, type, n, spot ? vacating : null) || !affordable(c) || !keepsHeavy(type, c)) continue;
          if (vacating) {
            if (!spot) continue;
            const m = move(g, vacating.id, spot.c, spot.r);
            if (!m.ok) continue;
            g.vacated.push({ id: vacating.id, orders: [{ kind: 'move', ...m, id: vacating.id }] });
          }
          // No other spending occurs between validating the replacement, clearing the city and recruiting.
          if (recruit(g, s.id, type, n).ok) return true;
        }
      return false;
    };
    if (eliteAI) {
      // Re-evaluate after each successful purchase: elite role shortages and
      // production diversity change as new units join the theater.
      for (const s of yards) tryBuild(s, menuOf(s), [1]);
    } else {
      const menus = new Map(yards.map(s => [s, menuOf(s)]));
      for (const s of yards) tryBuild(s, menus.get(s), [3, 2]);
      // Only factories that have not produced this turn get the single-frame
      // fallback. Respect the same affordability and reserve checks as above.
      for (const s of yards)
        if (s.producedTurn !== g.turn) tryBuild(s, menus.get(s), [1]);
    }
  }
  // Local, bounded tactical assessments shared by AI selection and execution.
  function commanderValue(g, v) {
    if (!v?.cmd) return 0;
    const o = E.officerOf(g, v), rank = o?.rank || 0;
    const mobility = Math.max(0, E.movement(g, v) - (TYPES[v.type]?.move || 0));
    return Math.min(150, 30 + rank * 13 + mobility * 7 + Math.max(0, maxHP(v) - 110) * 0.09);
  }
  function localThreat(g, u, p) {
    let expected = 0;
    for (const v of g.units) {
      if (v.hp <= 0 || !foe(g, v.side, u.side) || atSea(g, v)) continue;
      const d = dist(g, v, p);
      if (d > 7) continue;
      const r = rangeOf(g, v).max;
      if (d <= r + Math.min(3, E.movement(g, v))) {
        const attack = TYPES[v.type]?.attack || 0;
        expected += attack * (1 + 0.35 * Math.max(0, v.stack - 1)) * (d <= r ? 0.7 : 0.35);
      }
    }
    return expected;
  }
  function focusValue(g, u, enemy, initial, memo) {
    if (!enemy || enemy.hp <= 0) return 0;
    memo.focusCache ||= new Map();
    const k = enemy.id + ':' + enemy.hp + ':' + u.id + ':' + u.c + ':' + u.r;
    if (memo.focusCache.has(k)) return memo.focusCache.get(k);
    let potential = initial.unit, helpers = 0;
    for (const v of g.units) {
      if (helpers >= 7) break;
      if (v.id === u.id || v.side !== u.side || v.hp <= 0 || v.attacked || v.morale <= -3 ||
          dist(g, v, enemy) > Math.min(6, rangeOf(g, v).max)) continue;
      const shot = preview(g, v.id, enemy.c, enemy.r);
      if (!shot || shot.unit <= 0) continue;
      potential += shot.unit;
      helpers++;
    }
    const marked = memo.focusTargets?.get(enemy.id);
    const feasible = helpers && potential >= enemy.hp * 0.92;
    const value = (feasible ? 100 + Math.min(45, commanderValue(g, enemy) * 0.3) : 0) +
      (marked?.turn === g.turn && dist(g, u, enemy) <= 6 ? 62 : 0) -
      (initial.counter > u.hp * 0.8 ? 55 : 0);
    if (memo.focusCache.size > 500) memo.focusCache.clear();
    memo.focusCache.set(k, value);
    return value;
  }
  function trafficBoost(g, u, memo) {
    if (u.hold || memo.guards?.[u.id] || u.moved) return 0;
    memo.trafficCache ||= new Map();
    if (memo.trafficCache.has(u.id)) return memo.trafficCache.get(u.id);
    // A unit at the head of a column acts before nearby followers whose
    // route cost is higher. This clears occupied tiles without displacing guards.
    const front = memo.assign?.[u.id], route = fieldFor(g, memo, u);
    const position = route(u);
    let followers = 0;
    for (const v of g.units) {
      if (v.side !== u.side || v.id === u.id || v.hp <= 0 || v.hold ||
          memo.guards?.[v.id] || v.moved || dist(g, v, u) > 2) continue;
      if (front != null && memo.assign?.[v.id] != null && memo.assign[v.id] !== front) continue;
      if (route(v) + 0.1 < position) continue;
      followers++;
      if (followers >= 4) break;
    }
    const value = Math.min(1.6, followers * 0.45);
    memo.trafficCache.set(u.id, value);
    return value;
  }
  function aiNextActor(g, ids, start) {
    if (start >= ids.length) return start;
    const first = g.units.find(v => v.id === ids[start]);
    if (!first) return start;
    const memo = aiPlan(g, first.side);
    memo.actors ||= new Map(g.units.map(u => [u.id, u]));
    let selected = start, best = -Infinity;
    for (let i = start; i < Math.min(ids.length, start + 16); i++) {
      const u = memo.actors.get(ids[i]);
      if (!u || u.hp <= 0 || u.attacked || !isReady(g, u)) continue;
      const priority = aiOrderPriority(g, u);
      // Defensive emergencies remain authoritative over opportunistic attacks.
      let score = priority < -2 ? 1500 - priority * 20 :
        -priority * 32 + trafficBoost(g, u, memo) * 24;
      for (const p of targets(g, u).slice(0, 12)) {
        const shot = preview(g, u.id, p.c, p.r);
        if (!shot) continue;
        const enemy = unitAt(g, p), city = stationAt(g, p);
        const value = shot.unit + shot.shield * 0.6 - shot.counter * 0.45 +
          (enemy && shot.unit >= enemy.hp ? 135 : 0) +
          (enemy ? commanderValue(g, enemy) + focusValue(g, u, enemy, shot, memo) : 0) +
          (city && foe(g, city.owner, u.side) && city.shield <= shot.shield ? 65 : 0);
        const human = playerPriorityTarget(g, u.side, enemy?.side) ||
          playerPriorityTarget(g, u.side, city?.owner);
        score = Math.max(score, (human ? value * (1 + playerPriorityBonus(g, u.side)) : value) - priority * 14);
      }
      if (score > best || (score === best && ids[i] < ids[selected])) {
        best = score;
        selected = i;
      }
    }
    return selected;
  }
  function coastTile(g, p) {
    return !isSea(p) && adjacent(g, p).some(isSea);
  }
  // Scenario and Conquest resolve attacks in tactical order: batteries suppress shields,
  // armor and assault units defeat defenders, then fast troops capture opened cities.
  // Command and withdrawal leaders act last so their actions can coordinate allies.
  // In Conquest, formations responding to an immediate defensive emergency act first.
  function aiOrderPriority(g, u) {
    const commander = ['command', 'withdraw'].includes(COMMANDERS[u.cmd]?.action?.kind);
    if (g.mode !== 'scenario' && g.mode !== 'conquest') return commander ? 9 : 1;
    const type = TYPES[u.type];
    const tactical = commander ? 9
      : type.branch === 'Artillery' ? 0
      : type.branch === 'Armor' || type.cls === 'assault' ? 2
      : canCapture(u) && (type.move >= 4 || type.cls === 'raider') ? 4
      : 3;
    if (g.mode === 'scenario') {
      const memo=aiPlan(g,u.side);
      return memo.guards?.[u.id]?.response?tactical-10:
        tactical-trafficBoost(g,u,memo);
    }
    const memo = aiPlan(g, u.side),
      assignedFront = memo.byId?.[memo.assign?.[u.id]],
      emergency = memo.guards?.[u.id]?.emergency ||
        (assignedFront?.type === 'defensive' && assignedFront.emergency);
    return emergency ? tactical - 10 : tactical - trafficBoost(g, u, memo);
  }
  function aiOrder(g, id) {
    const u = g.units.find(u => u.id === id);
    if (!u || !isReady(g, u)) return [];
    const events = [],
      memo = aiPlan(g, u.side),
      guard = memo.guards?.[u.id],
      front = frontOf(g, memo, u),
      // Units already ahead of an assembling front's rally city hold their ground rather than walk back.
      forward = front?.state === 'assembling' && aheadOfRally(g, front, u),
      home = { c: u.c, r: u.r },
      fieldAt = forward ? p => dist(g, p, home) : fieldFor(g, memo, u);
    const recovery = memo.recoveries?.get(u.id);
    if (recovery) {
      if (u.moved || u.attacked) return events;
      if (recovery.tactical) {
        const p = tile(g, recovery.tactical.c, recovery.tactical.r);
        if (p && !unitAt(g, p) && reachable(g, u).has(key(p))) {
          const m = move(g, id, p.c, p.r);
          if (m.ok) events.push({ kind: 'move', ...m, id });
        }
        return events;
      }
      const field = recovery.field,
        value = p => field[p.r * g.cols + p.c] + g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && !atSea(g, v) && dist(g, v, p) <= rangeOf(g, v).max).length * 8
          - (p.c === recovery.city.c && p.r === recovery.city.r ? 2 : 0),
        picks = [...reachable(g, u).keys()].map(k => { const [c, r] = k.split(',').map(Number); return tile(g, c, r); })
          .filter(p => !isSea(p) && !unitAt(g, p) && Number.isFinite(field[p.r * g.cols + p.c]))
          .sort((a, b) => value(a) - value(b));
      if (picks[0] && value(picks[0]) < value(u)) {
        const m = move(g, id, picks[0].c, picks[0].r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
      return events;
    }
    // Trigger available newcomer abilities for AI-led armies, rather than leaving them player-only.
    if(COMMANDERS[u.cmd]?.action?.kind==='special'&&!feintReason(g,u)) {
      const targets=actionTargets(g,u), used=feint(g,id,targets[0]?.id);
      if(used?.ok)events.push({kind:'feint',id,affected:used.affected});
    }
    // Withdraw already-fired allies before Leila's own movement can take her out of range.
    if (COMMANDERS[u.cmd]?.action?.kind === 'withdraw' && !feintReason(g, u)) {
      const friends = actionTargets(g, u).map(v => v.id), r = feint(g, id);
      if (r.ok) {
        events.push({ kind: 'feint', id, affected: r.affected });
        for (const friend of friends) events.push(...aiOrder(g, friend));
      }
    }
    // Navies: a carrier runs its own operation; idle troops board a carrier waiting within reach.
    const steered = isShip(u) && !u.moved && aiCarrier(g, u, memo, events, fieldAt);
    if (!u.moved && !guard && u.deployedTurn !== g.turn && wantsLift(g, u, memo)) {
      const berth = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .find(p => {
          const v = unitAt(g, p);
          return v && v !== u && v.side === u.side && canBoard(g, v) && (!v.cargo?.length || sameLift(frontOf(g, memo, v.cargo[0]), front));
        });
      const m = berth && move(g, id, berth.c, berth.r);
      if (m?.ok) return [...events, { kind: 'move', ...m, id }];
    }
    const action = COMMANDERS[u.cmd]?.action;
    if (action && !['command', 'withdraw'].includes(action.kind) && !feintReason(g, u)) {
      const r = feint(g, id);
      if (r.ok) events.push({ kind: 'feint', id, affected: r.affected });
    }
    const choose = () =>
      targets(g, u)
        .map(p => {
          const d = unitAt(g, p),
            s = stationAt(g, p),
            pr = preview(g, id, p.c, p.r);
          const score =
            pr.unit +
            pr.shield * 0.7 +
            (d && pr.unit >= d.hp ? 130 : 0) +
            (s ? (g.mode === 'scenario'
              ? 170 + (front?.anchor.id === s.id ? 80 : 0) +
                (s.shield > 0 && TYPES[u.type].branch === 'Artillery'
                  ? Math.min(100, pr.shield * 1.8) : 0) +
                (s.shield <= 0 && canCapture(u) ? 150 : 0)
              : 35) : 0) +
            (s?.capitalOf ? 60 : 0) +
            (s?.project ? 120 : 0) +
            (guard?.response && d && dist(g,d,guard)<=4 ? 150 : 0) +
            (d ? commanderValue(g, d) + focusValue(g, u, d, pr, memo) : 0) -
            pr.counter * 0.5;
          // Conquest/Scenario: a legal attack on a hostile human unit or city scores higher (Campaign bonus is 0).
          const humanTarget = playerPriorityTarget(g, u.side, d?.side) || playerPriorityTarget(g, u.side, s?.owner);
          return { p, score: humanTarget ? score * (1 + playerPriorityBonus(g, u.side)) : score };
        })
        .sort((a, b) => b.score - a.score)[0];
    const maneuver = () => {
      if (u.moved || u.attacked || steered) return;
      // Boarding is decided above (idle troops and waiting carriers), so occupied hexes are not destinations here.
      const spots = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .filter(p => !unitAt(g, p));
      const enemies = g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, u) <= aiRange(g).enemyScan);
      const old = { c: u.c, r: u.r };
      // Overseas invasions assemble before embarking. Nearby land formations stage on the coast; units already at sea
      // count as an escort so follow-on waves do not get stranded waiting for a fresh three-unit convoy.
      const naval = !!TYPES[u.type].naval,
        fromLand = !naval && !atSea(g, u),
        freeAllies = g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && !memo.guards?.[v.id]),
        landGroup = freeAllies.filter(v => !atSea(g, v) && dist(g, v, u) <= aiRange(g).convoyLand).length,
        seaEscort = freeAllies.filter(v => atSea(g, v) && dist(g, v, u) <= aiRange(g).convoySea).length,
        // A front still gathering (or holding) on this landmass keeps its troops ashore; one bound overseas lets a lone
        // formation cross where no enemy is near.
        ashore = front && front.state !== 'attacking' && front.masses?.has(massOf(g, u)),
        safe = front && !enemies.some(v => dist(g, v, u) <= aiRange(g).enemyScan / 2),
        convoy = fromLand && !guard && !ashore &&
          (g.mode === 'scenario' || landGroup >= 2 || (landGroup >= 1 && seaEscort >= 1) || safe),
        currentField = fieldAt(old);
      const placeScore = p => {
        const station = stationAt(g, p);
        let sc = station && foe(g, station.owner, u.side) && !isShip(u) &&
          (station.shield === 0 || TYPES[u.type].naval === 'amphibious' || atSea(g, u))
          ? 400 + (station.capitalOf ? 600 : 0) : 0;
        if (COMMANDERS[u.cmd]?.fx.treasury && station?.owner === u.side) sc += 250 + station.income * 4;
        const mine = siteAt(g, p);
        if (mine && foe(g, mine.owner, u.side) && canCapture(u)) sc += mine.base >= 30 ? 550 : 250;
        // A city guard stands beside its city while no enemy is within 2 hexes of it, leaving the factory free (a
        // unit on the city hex blocks production); when one comes close it steps onto the city.
        const onGuard = guard && p.c === guard.c && p.r === guard.r,
          guardBonus = !onGuard ? 0 : guard.id != null && !enemies.some(v => dist(g, v, guard) <= 2) ? -40 : 25;
        sc -= guard ? dist(g, p, guard) * (guard.response?22:30) - guardBonus : u.hold ? 0 : fieldAt(p) * 8;
        if (u.hold) sc -= Math.max(0, dist(g, p, u.hold) - (u.hold.radius ?? 2)) * 40;
        if (g.mode === 'scenario' && front) {
          // Columns converge without waiting or retreating: a modest cohesion
          // bonus cannot outweigh movement toward the enemy objective.
          const mates = (memo.columns?.[front.id] || [])
            .filter(id => id !== u.id).map(id => g.units.find(v => v.id === id))
            .filter(v => v && v.hp > 0);
          if (mates.length && fieldAt(p) > 1) {
            const nearest = Math.min(...mates.map(v => dist(g, p, v)));
            sc += Math.min(2, mates.filter(v => dist(g, p, v) <= 3).length) * 8;
            sc -= Math.min(18, Math.max(0, nearest - 6) * 3);
          }
          const fast = canCapture(u) && (TYPES[u.type].move >= 4 ||
            TYPES[u.type].cls === 'raider');
          if (fast && station && foe(g, station.owner, u.side) &&
            !unitAt(g, station) && station.shield <= Math.max(120, station.maxShield * 0.55) &&
            (g.ai?.[u.side]?.recentCaptures || []).some(q => g.turn - q.turn <= 2 &&
              dist(g, q, station) <= 9)) sc += 130;
        }
        let nearestEnemy = 15,
          danger = 0;
        for (const v of enemies) {
          const d = dist(g, v, p);
          nearestEnemy = Math.min(nearestEnemy, d);
          if (d <= 1) danger++;
        }
        if (isSea(p) && naval) {
          sc -= danger * 20;
        } else if (isSea(p)) {
          sc -= 14 + danger * 40 + (nearestEnemy <= 2 ? 30 : 0) + (fromLand && (!convoy || guard) ? 1000 : 0);
          if (fromLand && convoy && fieldAt(p) < currentField) sc += 75;
        } else if (!fromLand) {
          sc += naval ? 30 : 90;
        } else if (!guard && !convoy && coastTile(g, p) && fieldAt(p) <= currentField) {
          const assembling = freeAllies.filter(v => !atSea(g, v) && dist(g, v, p) <= aiRange(g).convoyLand).length;
          sc += 28 + Math.min(3, assembling) * 12;
        }
        if (TYPES[u.type].branch === 'Artillery') {
          sc -= danger * 28;
          sc -= Math.abs(nearestEnemy - TYPES[u.type].max) * 6;
        } else sc -= nearestEnemy * 2;
        const skill = COMMANDERS[u.cmd]?.fx || {};
        const allies = freeAllies.filter(v => dist(g, v, p) <= 2);
        if (skill.loneRaider) sc -= allies.filter(v => dist(g, v, p) === 1).length * 18;
        if (skill.engineeringPen || skill.reassure || skill.repairSupply || skill.bodyguard || skill.defensiveDoctrine || skill.orderCommander)
          sc += Math.min(4, allies.length) * 12;
        if (station?.owner === u.side && u.hp / maxHP(u) < 0.5) sc += 20;
        if (naval && u.hp / maxHP(u) < 0.5 && portAtHex(g, p)?.portOwner === u.side) sc += 150;
        if (u.cmd && !u.attacked)
          sc -= Math.min(95, localThreat(g, u, p) * 0.36);
        if (TYPES[u.type].branch === 'Artillery' && !guard && !u.hold && !station && !isSea(p) &&
            adjacent(g, p).filter(q => !isSea(q) && !TERRAIN[q.terrain]?.blocked).length <= 2 &&
            freeAllies.filter(v => !v.moved && dist(g, v, p) <= 2).length >= 2)
          sc -= 24; // avoid parking in the only route through a narrow pass
        return sc;
      };
      let best = null,
        bestScore = -Infinity;
      for (const p of spots) {
        let sc = placeScore(p);
        u.c = p.c;
        u.r = p.r;
        const oldDistance = u.movedDistance, oldMoved = u.moved;
        u.movedDistance = (oldDistance || 0) + dist(g, old, p);
        u.moved = true;
        reindex(g, u, old);
        const shot = choose();
        u.c = old.c;
        u.r = old.r;
        u.movedDistance = oldDistance;
        u.moved = oldMoved;
        reindex(g, u, p);
        if (shot) sc += shot.score * 0.6;
        if (sc > bestScore) {
          bestScore = sc;
          best = p;
        }
      }
      const current = choose(),
        stay = placeScore(tile(g, u.c, u.r)) + (current ? current.score * 0.6 : 0);
      if (best && bestScore > stay + 4) {
        const m = move(g, id, best.c, best.r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    };
    // Reevaluate positioning after each kill that restores movement/refire, within a bounded action budget.
    for (let chain = 0; chain < 8 && !u.attacked && !g.over && u.hp > 0; chain++) {
      maneuver();
      // A designation may only now be in range.
      if (action && !['command', 'withdraw'].includes(action.kind) && !feintReason(g, u)) {
        const r = feint(g, id);
        if (r.ok) events.push({ kind: 'feint', id, affected: r.affected });
      }
      const shot = choose();
      if (!shot) break;
      const target = unitAt(g, shot.p);
      const a = attack(g, id, shot.p.c, shot.p.r);
      if (a.ok) {
        events.push({ kind: 'attack', ...a, id });
        if (target) {
          memo.focusTargets ||= new Map();
          memo.focusTargets.delete(target.id);
          if (target.hp > 0) memo.focusTargets.set(target.id, { turn: g.turn });
        }
        memo.focusCache?.clear();
      }
      else break;
    }
    // Spend restored movement on a safe hex, including withdrawal moves after firing.
    if (!u.moved && (u.attacked || u.skillReposition || u.withdrawMove) && !g.over && u.hp > 0) {
      const score = p => -fieldAt(p) * 8 - g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, p) <= rangeOf(g, v).max).length * 30;
      const picks = [...reachable(g, u).keys()].map(k => { const [c, r] = k.split(',').map(Number); return tile(g, c, r); })
        .filter(p => !unitAt(g, p)).sort((a, b) => score(b) - score(a));
      if (picks[0] && score(picks[0]) > score(u)) {
        const m = move(g, id, picks[0].c, picks[0].r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    }
    // Zero and Leila use their actions after allied orders. UI ordering puts them last.
    if (action?.kind === 'command' && !g.over && u.hp > 0 && !feintReason(g, u)) {
      const r = feint(g, id);
      if (r.ok) events.push({ kind: 'feint', id, affected: 1 }, ...aiOrder(g, r.target));
    }
    if (action?.kind === 'withdraw' && !g.over && u.hp > 0 && !feintReason(g, u)) {
      const friends = actionTargets(g, u).map(v => v.id), r = feint(g, id);
      if (r.ok) {
        events.push({ kind: 'feint', id, affected: r.affected });
        for (const friend of friends) events.push(...aiOrder(g, friend));
      }
    }
    memo.focusCache?.clear();
    memo.trafficCache?.clear();
    return events;
  }
  Object.assign(E, { aiProduction, aiOrder, aiOrderPriority, aiNextActor, aiPlan, unitStrength, FRONT, playerPriorityBonus, playerPrioritySeeds });
})(typeof window !== 'undefined' ? window : globalThis);

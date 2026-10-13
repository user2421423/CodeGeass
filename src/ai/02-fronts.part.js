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
    if (id.includes('europe') || id === 'bering-strait' || id === 'area-18') return 'europe';
    if (id.includes('invasion-japan') || id === 'japan') return 'invasion';
    return 'assault';
  }
  const STRATEGIC = { commitment: 4, margin: 1.3, transferCooldown: 4,
    arrivalWindow: 4, transferBuffer: 2 };
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
  function planScenarioOffense(g, side, memo) {
    const state = ((g.ai ||= {})[side] ||= {}),
      own = g.stations.filter(s => s.owner === side),
      carried = new Map(),
      troops = allUnits(g).filter(u => u.hp > 0 && u.side === side && !isShip(u) && !u.hold && !memo.guards?.[u.id]),
      enemies = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral');
    for (const ship of g.units) for (const cargo of ship.cargo || [])
      carried.set(cargo.id, ship);
    state.recentCaptures = (state.recentCaptures || [])
      .filter(p => g.turn - p.turn <= SCENARIO_COLUMN.exploitTurns);
    const previous = state.assignments || {};
    // Old saved games may still contain dispatch metadata; retire it without
    // touching persistent theater assignments or normal city garrisons.
    delete state.localResponses;
    planScenarioTheaters(g,side,troops,memo,state);
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
        // Warhead projects are public intelligence; rival Eliminator projects are classified.
        const project = s.project,
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

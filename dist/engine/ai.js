/* Knightmare Conquest AI: rival high command (production, F.L.E.I.J.A., carriers), theaters and unit orders.
   Loads after engine.js and adds the AI to its API; it uses the rules through the engine's shared internals. */
(function (root) {
  'use strict';
  const E = root.Knightmare;
  const {
    COMMANDERS,
    ELIMINATOR,
    TERRAIN,
    cityBusyReason,
    key,
    shortfall,
    FACTIONS,
    FLEIJA,
    MAJORS,
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
  // Each AI turn starts with a plan: garrisons, then (Conquest) the theaters it fights in. Campaign battlefields are a
  // single theater and keep one side-wide goal field.
  function aiPlan(g, side) {
    let memo = aiMemo.get(g);
    if (!memo) aiMemo.set(g, (memo = {}));
    if (!memo[side] || memo[side].turn !== g.turn) {
      memo[side] = { turn: g.turn, guards: assignGuards(g, side) };
      planRecovery(g, side, memo[side]);
      if (g.mode === 'campaign') memo[side].field = goalField(g, side);
      else planFronts(g, side, memo[side]);
    }
    return memo[side];
  }
  // ======== Theaters ========
  // Objectives within `radius` hexes form one front. Every emergency and the `max` best other fronts are fought at once,
  // units keep their front for `sticky` turns, an offensive gathers within `rally` hexes of its rally city before it
  // attacks (or after `wait` turns), and `reserve` of the army's strength waits at the capital.
  const FRONT = { radius: 16, near: 20, max: 4, sticky: 4, far: 60, rally: 4, reserve: 0.1, wait: 3, pull: 15, stray: 4, floor: 0.25 };
  // Planning strength of a formation: frames in the stack, health and generation; commanders and Elite Forces count more.
  function unitStrength(u) {
    const t = TYPES[u.type];
    return u.stack * Math.max(0.2, u.hp / maxHP(u)) * (1 + 0.25 * ((t.tier || 1) - 1)) * (u.cmd ? 1.5 : 1) * (t.elite ? 1.5 : 1);
  }
  // What a side cares about this turn: enemy cities near its territory, every rival capital and F.L.E.I.J.A. project,
  // Sakuradite mines, and its own threatened cities, capital and mines. `value` scores the front, `seed` feeds its field.
  function frontObjectives(g, side) {
    const R = aiRange(g),
      own = g.stations.filter(s => s.owner === side),
      army = g.units.filter(u => u.hp > 0 && u.side === side && !isShip(u)),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      near = p => own.some(s => dist(g, s, p) <= FRONT.near) || army.some(u => dist(g, u, p) <= FRONT.near),
      threatened = (p, vital) => foes.some(f => (vital && dist(g, f, p) <= R.threat * 2) || threatTo(g, f, p) > 0),
      list = [];
    for (const s of g.stations) {
      if (foe(g, s.owner, side)) {
        const project = s.project || s.eliminatorProject,
          capital = s.capitalOf && alive(g, s.owner);
        if (!project && !capital && !near(s)) continue;
        const [value, seed] = project ? [100, -8] : capital ? [70, -6] : s.owner === 'neutral' ? [8, 1] : s.tier >= 3 ? [20, -1] : [10, 0];
        list.push({ key: 's' + s.id, c: s.c, r: s.r, name: s.name, owner: s.owner, value, seed, fortified: value >= 20 });
      } else if (s.owner === side) {
        const vital = s.capitalOf === side || s.project?.side === side || s.eliminatorProject?.side === side;
        if (threatened(s, vital))
          list.push({ key: 'd' + s.id, c: s.c, r: s.r, name: s.name, defend: true, vital, value: vital ? 100 : 20, seed: vital ? -6 : -2 });
      }
    }
    for (const d of g.sites || []) {
      if (d.city != null) continue;
      const major = d.base >= 30;
      if (foe(g, d.owner, side) && (major || near(d)))
        list.push({ key: 'm' + d.id, c: d.c, r: d.r, name: d.name, value: major ? 40 : 10, seed: major ? -5 : -1 });
      else if (d.owner === side && major && threatened(d, false))
        list.push({ key: 'n' + d.id, c: d.c, r: d.r, name: d.name, defend: true, value: 40, seed: -4 });
    }
    return list;
  }
  // Clusters objectives into fronts, scores and sizes them against the enemy strength there, assigns the army (sticky,
  // emergencies and strength deficits first, a strategic reserve kept back), moves offensives between ASSEMBLING and
  // ATTACKING, and builds one goal field per front. Persistent state lives in g.ai[side].fronts and .assignments.
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
      byDist = (p, list) => list.slice().sort((a, b) => dist(g, a.anchor || a, p) - dist(g, b.anchor || b, p) || (a.id < b.id ? -1 : 1));
    // 1. Cluster: existing fronts re-form around their old anchors so ids stay stable from turn to turn.
    const objectives = frontObjectives(g, side).sort(
      (a, b) => !!saved[b.key] - !!saved[a.key] || b.value - a.value || (a.key < b.key ? -1 : 1),
    );
    let fronts = [];
    for (const o of objectives) {
      if (o.front) continue;
      const f = { id: o.key, side, anchor: o, objectives: [], assigned: 0 };
      for (const q of objectives)
        if (!q.front && dist(g, q, o) <= FRONT.radius) {
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
      f.type = defend.some(o => o.vital) || worth(defend) >= worth(attack) ? 'defensive' : 'offensive';
      f.vital = defend.some(o => o.vital);
      // The best objective counts in full and the rest at half, so a sprawl of small towns does not drown out a capital.
      const best = Math.max(...f.objectives.map(o => o.value));
      f.score = Math.round(best + (worth(f.objectives) - best) / 2 - Math.max(0, home - 8) * 1.2);
      f.name = (f.type === 'offensive' ? attack.reduce((a, o) => (o.value > a.value ? o : a)) : f.anchor).name;
      f.enemies = enemies;
      f.enemyStrength = sum(enemies);
      // Defense is sized against the enemies menacing the threatened cities, less the garrisons already there.
      const menace = foes
          .filter(v => defend.some(o => (o.vital && dist(g, v, o) <= R.threat * 2) || threatTo(g, v, o) > 0))
          .reduce((a, v) => a + unitStrength(v) + sum(v.cargo || []), 0),
        present = sum(g.units.filter(u => u.hp > 0 && u.side === side && !isShip(u) && defend.some(o => dist(g, u, o) <= R.threat))),
        garrison = sum(g.units.filter(u => memo.guards[u.id] && defend.some(o => dist(g, u, o) <= R.threat)));
      f.desiredStrength =
        f.type === 'defensive'
          ? Math.max(2, menace * 1.2 - garrison)
          : Math.max(3, f.enemyStrength * 1.5 + attack.length * 0.5);
      // A defensive front is an emergency when the capital or a F.L.E.I.J.A. project is threatened, or when the friendly
      // strength at its threatened cities (garrisons included) is under 60% of the enemy strength menacing them.
      f.emergency = f.type === 'defensive' && (f.vital || (menace > 0 && present / menace < 0.6));
      // Offensives stage at the nearest own city on the target's landmass, else at the nearest own coastal city.
      if (f.type === 'offensive') {
        const land = own.filter(s => massOf(g, s) === massOf(g, f.anchor));
        f.overseas = !land.length;
        f.rally = byDist(f.anchor, land.length ? land : own.filter(s => coastTile(g, s)))[0] || null;
      }
      // Priority: the score, discounted (down to `floor`) when half the army could not field the force it needs.
      f.priority = f.score * Math.min(1, Math.max(FRONT.floor, (army * 0.5) / f.desiredStrength));
    }
    // Every emergency, plus the `max` best other fronts.
    fronts = fronts
      .sort((a, b) => b.emergency - a.emergency || b.priority - a.priority || (a.id < b.id ? -1 : 1))
      .filter((f, i, all) => f.emergency || i - all.filter(e => e.emergency).length < FRONT.max);
    const byId = Object.fromEntries(fronts.map(f => [f.id, f])),
      capital =
        own.find(s => s.capitalOf === side) ||
        own.slice().sort((a, b) => b.tier - a.tier || (b.factory || 0) - (a.factory || 0) || a.id - b.id)[0],
      reserve = capital && {
        id: 'reserve',
        side,
        type: 'reserve',
        name: capital.name,
        anchor: capital,
        objectives: [{ c: capital.c, r: capital.r, seed: 0 }],
        assigned: 0,
        desiredStrength: FRONT.reserve * army,
        score: 0,
      };
    if (reserve) byId.reserve = reserve;
    // 3. Sticky assignments hold unless the front is gone, the unit has served its turns, drifted extremely far, or a
    // vital emergency nearby (any emergency, for the reserve) needs it.
    const assign = {},
      emergencies = fronts.filter(f => f.emergency),
      give = (u, f) => {
        assign[u.id] = f.id;
        f.assigned += unitStrength(u);
        if (sticky[u.id]?.front !== f.id) sticky[u.id] = { front: f.id, since: g.turn };
      };
    for (const u of units) {
      const a = sticky[u.id],
        f = a && byId[a.front];
      if (!f) continue;
      const pulled =
        f === reserve ? emergencies.length > 0 : emergencies.some(e => e !== f && e.vital && dist(g, at(u), e.anchor) <= FRONT.pull);
      if (!pulled && g.turn - a.since < FRONT.sticky && dist(g, at(u), f.anchor) <= FRONT.far) give(u, f);
    }
    // 4. Targets: emergencies get their full need and the reserve its share; the rest of the army splits 50/25/15/10 by
    // front rank, a front never taking more than it needs (the surplus flows to the others).
    const open = fronts.filter(f => !f.emergency),
      weight = new Map(open.map((f, i) => [f, [0.5, 0.25, 0.15, 0.1][i] || 0.1]));
    let pot = army - (reserve?.desiredStrength || 0),
      left = open;
    // A vital emergency (capital, F.L.E.I.J.A. project) may claim everything it needs; any other at most a fifth.
    for (const f of emergencies) pot -= f.target = f.vital ? f.desiredStrength : Math.min(f.desiredStrength, army * 0.2);
    pot = Math.max(0, pot);
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
    // The pool goes to emergencies, then the reserve, then whichever front is furthest below its target; each front
    // takes the nearest free unit (a little nearer if it served there before). Leftovers join the nearest front.
    const pool = units.filter(u => !assign[u.id]),
      take = (f, range = Infinity) => {
        let best = null,
          bd = Infinity;
        for (const u of pool) {
          if (assign[u.id]) continue;
          const d = dist(g, at(u), f.anchor) - (sticky[u.id]?.front === f.id ? 10 : 0);
          if (d <= range && (d < bd || (d === bd && u.id < best.id))) {
            bd = d;
            best = u;
          }
        }
        if (best) give(best, f);
        return !!best;
      };
    for (const f of emergencies) while (f.assigned < f.target && take(f, FRONT.pull + 10));
    if (reserve) while (reserve.assigned < reserve.desiredStrength && take(reserve, 25));
    for (;;) {
      const f = fronts.filter(f => f.assigned < f.target).sort((a, b) => b.target - b.assigned - (a.target - a.assigned))[0];
      if (!f || !take(f)) break;
    }
    for (const u of pool) {
      if (assign[u.id]) continue;
      const f = byDist(at(u), fronts)[0] || reserve;
      if (f) give(u, f);
    }
    // 5. Offensives: ASSEMBLING until enough of the assigned army stands at the rally city (or ahead of it), then
    // ATTACKING; an attack that has lost over half its force falls back to regroup. Defensive fronts hold.
    for (const f of fronts) {
      const st = (saved[f.id] ||= { state: 'assembling', since: g.turn });
      st.seen = g.turn;
      const mine = units.filter(u => assign[u.id] === f.id),
        set = v => {
          if (st.state !== v) Object.assign(st, { state: v, since: g.turn });
        };
      if (f.type !== 'offensive' || !f.rally) set(f.type === 'offensive' ? 'attacking' : 'holding');
      else {
        if (st.state === 'holding') set('assembling');
        f.readyStrength = sum(mine.filter(u => dist(g, at(u), f.rally) <= FRONT.rally || aheadOfRally(g, f, at(u))));
        f.attackThreshold = Math.max(2, Math.min(f.desiredStrength * 0.8, f.assigned * 0.5));
        if (st.state === 'assembling' && (f.readyStrength >= f.attackThreshold || g.turn - st.since >= FRONT.wait)) {
          set('attacking');
          st.force = f.assigned;
          if (side !== g.player && f.objectives.some(o => o.owner === g.player))
            log(g, `${FACTIONS[side].short} forces massed at ${f.rally.name} open an offensive toward ${f.name}.`, side);
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
    const elsewhere = goalSeeds(g, side).map(([p, d]) => [p, d + FRONT.stray]);
    for (const f of [...fronts, ...(reserve ? [reserve] : [])]) {
      const seeds = (f.seeds =
        f.state === 'assembling'
          ? [[f.rally, 0]]
          : f.objectives.flatMap(o =>
              o.defend ? [[o, o.seed], ...foes.filter(v => dist(g, v, o) <= R.threat).map(v => [v, o.seed + 1])] : [[o, o.seed]],
            ));
      f.masses = new Set(seeds.map(([p]) => massOf(g, p)).filter(m => m >= 0));
      if (f.state === 'attacking') f.seeds = [...seeds, ...elsewhere];
      f.need = frontNeeds(f, units.filter(u => assign[u.id] === f.id));
    }
    // Idle carriers wait off the rally city of the best offensive across the sea.
    const lift = fronts.find(f => f.overseas && f.rally);
    Object.assign(memo, { fronts, byId, assign, fields: {}, reserve, staging: lift?.rally || null });
  }
  // Already nearer an assembling front's target than its rally city is, on the rally's landmass.
  const aheadOfRally = (g, f, p) => massOf(g, p) === massOf(g, f.rally) && dist(g, p, f.anchor) < dist(g, f.rally, f.anchor);
  // Two formations may share a carrier when their fronts head for the same landmass.
  const sameLift = (a, b) => a === b || (!!a?.masses && !!b?.masses && [...a.masses].some(m => b.masses.has(m)));
  // What a front asks its factories for, by the enemy's composition there and its own: assault frames and rockets
  // against Armor, Armor against Infantry, guns when it lacks artillery, siege for fortified cities, and fast raiders
  // around a medium-frame core for an invasion across the sea (every formation needs a hull).
  function frontNeeds(f, mine) {
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
    if (f.type === 'reserve') return ['heavy', 'medium', 'rocket'];
    const need = f.overseas
      ? ['raider', 'medium', 'assault', 'heavy']
      : f.type === 'defensive'
        ? ['heavy', 'rocket', 'medium', 'support']
        : enemy.total && enemy.Armor >= enemy.total * 0.5
          ? ['assault', 'rocket', 'heavy', 'medium']
          : ['medium', 'heavy', 'rocket', 'light'];
    if (!f.overseas && ours.Artillery < ours.total * 0.2)
      need.unshift(f.type === 'offensive' && f.objectives.some(o => o.fortified) ? 'siege' : 'rocket');
    return [...new Set(need)];
  }
  // The front (or reserve) a unit serves; formations raised after the plan join the nearest front still short of strength.
  function frontOf(g, memo, u) {
    if (!memo?.byId || !u || memo.guards?.[u.id] || memo.recoveries?.has(u.id) || isShip(u) || u.hold) return null;
    if (!(u.id in memo.assign)) {
      const short = memo.fronts.filter(f => f.assigned < f.desiredStrength),
        f = (short.length ? short : memo.fronts)
          .slice()
          .sort((a, b) => dist(g, u, a.anchor) - dist(g, u, b.anchor) || (a.id < b.id ? -1 : 1))[0] || memo.reserve;
      memo.assign[u.id] = f?.id ?? null;
      if (f) {
        f.assigned += unitStrength(u);
        g.ai[u.side].assignments[u.id] = { front: f.id, since: g.turn };
      }
    }
    return memo.byId[memo.assign[u.id]] || null;
  }
  // The goal field a unit follows: its front's; guards lean on the reserve's and warships on the main front's; else the
  // side-wide field. Fields are built on first use.
  function fieldFor(g, memo, u) {
    const f = frontOf(g, memo, u) || (isShip(u) ? memo.fronts?.[0] : memo.reserve);
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
  // Garrison duty: the capital always keeps two defenders (four when threatened); on the denser world, cities react
  // to enemies within five hexes (or a landing's reach, see threatTo) and draw defenders from proportionally larger
  // strategic radii. In Conquest, fortress cities and naval bases also keep one defender. Returns { unitId: city }.
  function assignGuards(g, side) {
    const own = g.units.filter(u => u.hp > 0 && u.side === side && !atSea(g, u) && !isShip(u)),
      foes = g.units.filter(u => u.hp > 0 && foe(g, u.side, side) && u.side !== 'neutral'),
      taken = {},
      threat = s => foes.reduce((a, f) => a + threatTo(g, f, s), 0);
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
      const near = own
        .filter(u => !taken[u.id] && dist(g, u, s) <= (capital ? aiRange(g).capitalGuard : aiRange(g).cityGuard))
        .sort((a, b) => dist(g, a, s) - dist(g, b, s));
      for (const u of near.slice(0, need)) taken[u.id] = { c: s.c, r: s.r, id: s.id };
    }
    // Strongholds (Conquest): the fortress cities that guard the straits, and level-2+ naval bases, are never left
    // empty, even in quiet times.
    if (g.mode !== 'campaign')
      for (const s of g.stations) {
        if (s.owner !== side || !(s.fort || (s.portLevel >= 2 && s.portOwner === side))) continue;
        if (Object.values(taken).some(t => t.id === s.id)) continue;
        const u = own
          .filter(u => !taken[u.id] && dist(g, u, s) <= aiRange(g).cityGuard)
          .sort((a, b) => dist(g, a, s) - dist(g, b, s) || a.id - b.id)[0];
        if (u) taken[u.id] = { c: s.c, r: s.r, id: s.id };
      }
    // Own mines: Mount Fuji always keeps a guard; any threatened mine draws up to two.
    for (const d of g.sites || []) {
      if (d.city != null || d.owner !== side) continue;
      const t = threat(d),
        need = t > 0 ? Math.min(2, Math.ceil(t / 2)) : d.base >= 30 ? 1 : 0;
      const near = own.filter(u => !taken[u.id] && dist(g, u, d) <= aiRange(g).mineGuard).sort((a, b) => dist(g, a, d) - dist(g, b, d));
      for (const u of near.slice(0, need)) taken[u.id] = { c: d.c, r: d.r, site: d.id };
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
      const ratio = u.hp / maxHP(u), active = saved[u.id];
      const essential = cities.some(s => dist(g, u, s) <= 1 && !secure(s) &&
        !own.some(v => v.id !== u.id && !isShip(v) && v.hp / maxHP(v) >= 0.4 && dist(g, v, s) <= 2));
      if (!(u.cmd || u.elite) || isSea(tile(g, u.c, u.r)) || u.hold || memo.guards[u.id] || essential || ratio >= 0.7) {
        delete saved[u.id];
        continue;
      }
      if (!active && ratio >= 0.35) continue;
      const seedsFor = s => [tile(g, s.c, s.r), ...adjacent(g, s)]
        .filter(p => !isSea(p) && !TERRAIN[p.terrain]?.blocked && (!stationAt(g, p) || stationAt(g, p).owner === side) && (!unitAt(g, p) || unitAt(g, p).id === u.id))
        .map(p => [p, 0]),
        candidates = safeCities.filter(s => massOf(g, s) === massOf(g, u)),
        previous = active && candidates.find(s => s.id === active.city);
      let city = previous, field = previous && landRoute(seedsFor(previous));
      if (!field || !Number.isFinite(field[u.r * g.cols + u.c])) {
        const seeds = candidates.flatMap(seedsFor);
        if (!seeds.length) { delete saved[u.id]; continue; }
        const route = landRoute(seeds);
        if (!Number.isFinite(route[u.r * g.cols + u.c])) { delete saved[u.id]; continue; }
        // Select the repair city by land route distance from this formation.
        const fromUnit = landRoute([[u, 0]]);
        city = candidates.slice().sort((a, b) => {
          const cost = s => Math.min(...seedsFor(s).map(([p]) => fromUnit[p.r * g.cols + p.c]));
          return cost(a) - cost(b) || a.id - b.id;
        })[0];
        field = city && landRoute(seedsFor(city));
      }
      if (!city || !Number.isFinite(field[u.r * g.cols + u.c])) { delete saved[u.id]; continue; }
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
    if (threat > strength) return null;
    const prize = g.stations.some(s => foe(g, s.owner, side) && !unitAt(g, s) && s.shield <= 60 && dist(g, s, t) <= 2);
    return fieldAt(t) + threat * 3 - (prize ? 25 : 0);
  }
  // Launch every ready formation onto the best landing hex (toward its front, which may be a friendly rally city), then
  // give each its full turn.
  function aiLaunch(g, ship, events, fieldAt, masses) {
    const landed = [];
    for (let i = (ship.cargo?.length || 0) - 1; i >= 0; i--) {
      if (deployReason(g, ship, i)) continue;
      const strength = ship.cargo.reduce((a, c) => a + c.stack, 0),
        spot = deployTargets(g, ship)
          .map(t => ({ t, s: landingScore(g, ship.side, t, strength + landed.filter(v => v.hp > 0 && !atSea(g, v) && dist(g, v, t) <= 3).reduce((a, v) => a + v.stack, 0), fieldAt, masses) }))
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
  function aiCarrier(g, u, memo, events, fieldAt) {
    const bound = u.cargo?.length ? frontOf(g, memo, u.cargo[0]) : null,
      masses = bound?.masses || null;
    if (bound) fieldAt = fieldFor(g, memo, u.cargo[0]);
    const fleet = (((g.ai ||= {})[u.side] ||= {}).fleet ||= {}),
      job = (fleet[u.id] ||= { wait: 0 }),
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
      landing = p => {
        const scores = deployTargetsAt(g, p, u.side)
          .map(t => landingScore(g, u.side, t, strength, fieldAt, masses))
          .filter(v => v != null);
        return scores.length ? Math.min(...scores) + danger(p) * 2 : null;
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
        const seeds = seaCoasts(g, memo).map(p => [p, landing(p)]).filter(([, score]) => score != null);
        followSea(seeds);
      }
      if (landing(tile(g, u.c, u.r)) != null) aiLaunch(g, u, events, fieldAt, masses);
      if (!u.cargo.length) job.wait = 0;
      return true;
    }
    if (cargo.length) job.wait++;
    const riders = g.units.filter(
      v => v.hp > 0 && v.side === u.side && !memo.guards?.[v.id] && (!cargo.length || sameLift(frontOf(g, memo, v), bound)) && wantsLift(g, v, memo),
    );
    if (!riders.length) {
      const stage = !cargo.length && memo.staging;
      if (!stage) return cargo.length > 0;
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
      plan = ((g.ai ||= {})[side] ||= { saving: false }),
      memo = aiPlan(g, side),
      builds = g.mode !== 'campaign' || !!g.campaign?.production?.includes(side);
    const bases = g.stations.filter(s => s.owner === side).sort((a, b) => front(a) - front(b));
    const yard3 = bases.filter(s => s.tier >= 3);
    const superType = typeFor(side, 'super', g),
      superPrice = price(superType, 1, g, side);
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
    // 0b. F.L.E.I.J.A.: launch every ready warhead, each at the most valuable target that spares its own units and
    // cities (the UI plays g.launches).
    g.launches = [];
    while ((g.arsenal?.[side] || 0) > 0 && !g.over) {
      const p = aiLaunchTarget(g, side),
        shot = p && launch(g, side, p.c, p.r);
      if (!shot?.ok) break;
      g.launches.push(shot);
    }
    // 1. Repair badly damaged units resting at a friendly city (this spends their turn).
    for (const u of own()
      .filter(u => u.hp / maxHP(u) < (memo.recoveries?.has(u.id) ? 0.7 : 0.55) && nearFriendlyCity(g, u) && !atSea(g, u))
      .sort((a, b) => a.hp / maxHP(a) - b.hp / maxHP(b))) {
      if (e.credits - repairCost(u, g) >= 60) repair(g, u.id);
    }
    g.vacated = [];
    if (!builds) return;
    // 1b. Clear the factories, as a player would (a unit on the city hex blocks building there). A ready unit on a
    // quiet city carries out its orders first. On a city with an enemy within 2 hexes, the defender steps beside it
    // (best cover) so the city can build another defender, but only when the side can pay for a unit there;
    // otherwise it holds the city. The UI plays these moves from g.vacated ({ id, orders }).
    const cheapest = price(typeFor(side, 'scout', g), 1, g, side);
    for (const s of bases) {
      const u = unitAt(g, s);
      if (!u || u.side !== side || u.moved || !isReady(g, u)) continue;
      if (!foes.some(f => dist(g, f, s) <= 2)) {
        g.vacated.push({ id: u.id, orders: aiOrder(g, u.id) });
        continue;
      }
      if (s.producedTurn === g.turn || cityBusyReason(g, s) || shortfall(e, cheapest)) continue;
      const reach = reachable(g, u),
        spot = adjacent(g, s)
          .filter(p => reach.has(key(p)) && !isSea(p) && !stationAt(g, p) && !unitAt(g, p))
          .sort((a, b) => (TERRAIN[b.terrain]?.cover || 0) - (TERRAIN[a.terrain]?.cover || 0) || a.r - b.r || a.c - b.c)[0];
      const m = spot && move(g, u.id, spot.c, spot.r);
      if (m?.ok) g.vacated.push({ id: u.id, orders: [{ kind: 'move', ...m, id: u.id }] });
    }
    // 2. Save for super-heavy formations only from the surplus after keeping enough
    // credits and industry for an ordinary two-frame Scout formation. There is no
    // limit on how many super-heavies a faction may own, but stagger the priority
    // purchases so frontline factories still build other classes.
    const ordinaryBudget = price(typeFor(side, 'scout', g), 2, g, side);
    const superCooldown = g.turn - (plan.lastSuperTurn ?? -Infinity) < 3;
    // Only start saving once Sakuradite is in hand; never lock the treasury when
    // there is no eligible factory or during the post-purchase cooldown.
    if (!yard3.length || superCooldown) plan.saving = false;
    else if (!plan.saving && g.turn >= 3 && (e.sakuradite || 0) >= superPrice.sakuradite && random(g) < 0.35)
      plan.saving = true;
    // 2b. F.L.E.I.J.A. Eliminator: the moment countermeasures are available, rivals build them before anything else,
    // starting every charge they can afford (up to ELIMINATOR.max) and saving for the next one. With no free lab-3
    // city outside their charges' cover, step 3 raises a lab for one (defensePrep).
    const wantsDefense = () => eliminatorUnlocked(g) && sideEliminators(g, side).length < ELIMINATOR.max;
    let defenseCity = null;
    while (wantsDefense() && (defenseCity = eliminatorCity(g, side)) && !eliminatorReason(g, defenseCity)) {
      startEliminator(g, defenseCity.id);
      defenseCity = null;
    }
    plan.eliminator = !!defenseCity;
    const defensePrep = wantsDefense() && !defenseCity ? eliminatorCity(g, side, true) : null;
    // 2c. F.L.E.I.J.A.: one warhead at a time, started again as soon as the last one is fired. A power with the
    // Sakuradite for it (or the income to gather it soon) keeps that Sakuradite back, then saves credits and industry
    // and starts the project in its best-lab city.
    const warCity =
      !plan.eliminator &&
      hasFleija(g, side) &&
      !g.stations.some(s => s.project?.side === side) &&
      !(g.arsenal?.[side] > 0)
        ? fleijaCity(g, side, front)
        : null;
    plan.warhead = !!warCity && ((e.sakuradite || 0) >= FLEIJA.cost.sakuradite || income(g, side).sakuradite >= 15);
    if (plan.warhead && !projectReason(g, warCity)) {
      startProject(g, warCity.id);
      plan.warhead = false;
    }
    const defenseSaving = plan.eliminator && (e.sakuradite || 0) >= ELIMINATOR.cost.sakuradite,
      warSaving = plan.warhead && (e.sakuradite || 0) >= FLEIJA.cost.sakuradite;
    if (plan.eliminator || plan.warhead) plan.saving = false;
    // Buy the largest affordable super-heavy while still funding normal troops.
    // Keep this budget even when only one factory is available: later turns can
    // spend it after the priority purchase's cooldown.
    if (plan.saving)
      for (const n of [3, 2, 1]) {
        const cost = price(superType, n, g, side);
        if (e.credits - cost.credits < ordinaryBudget.credits ||
            e.industry - cost.industry < ordinaryBudget.industry) continue;
        const yard = yard3.find(s => canBuy(g, s, superType, n));
        if (yard && recruit(g, yard.id, superType, n).ok) {
          plan.lastSuperTurn = g.turn;
          plan.saving = false;
          break;
        }
      }
    const reserve = defenseSaving
      ? Math.min(e.credits, ELIMINATOR.cost.credits)
      : warSaving
        ? Math.min(e.credits, FLEIJA.cost.credits)
        : plan.saving
          ? Math.min(superPrice.credits, Math.max(0, e.credits - ordinaryBudget.credits))
          : 60;
    const reserveInd = defenseSaving
      ? Math.min(e.industry, ELIMINATOR.cost.industry)
      : warSaving
        ? Math.min(e.industry, FLEIJA.cost.industry)
        : plan.saving
          ? Math.min(superPrice.industry, Math.max(0, e.industry - ordinaryBudget.industry))
          : 0;
    const reserveSak = plan.eliminator
      ? ELIMINATOR.cost.sakuradite
      : plan.warhead
        ? FLEIJA.cost.sakuradite
        : plan.saving
          ? superPrice.sakuradite
          : 0;
    const spendable = () => Math.max(0, e.credits - reserve);
    // Sakuradite held back for a project only blocks purchases that spend Sakuradite.
    const affordable = c =>
      c.credits <= spendable() &&
      e.industry - (c.industry || 0) >= reserveInd &&
      (!c.sakuradite || (e.sakuradite || 0) - c.sakuradite >= reserveSak);
    // Lighter frames leave enough Sakuradite for one heavy frame once a level-3 factory exists.
    const heavySak = yard3.length ? price(typeFor(side, 'heavy', g), 1, g, side).sakuradite : 0;
    const keepsHeavy = (type, c) =>
      !c.sakuradite || TYPES[type].tier >= 3 || (e.sakuradite || 0) - c.sakuradite >= heavySak;
    // 3. Upgrade one building per turn when there is surplus: Sakuradite refineries first (richest deposit first),
    // then the lowest-level factory or lab at the safest city.
    if (!plan.saving && g.turn >= 2) {
      let upgraded = false;
      // Rivals can prepare Labs I-II before turn 15, but Lab III obeys the same turn gate as the player. A city that
      // needs a lab for its next Eliminator comes first.
      const soon = g.turn >= FLEIJA.labTurn - 5,
        prep =
          side !== g.player && MAJORS.includes(side) ? defensePrep || (soon ? fleijaCity(g, side, front) : null) : null;
      if (
        prep &&
        (prep.lab || 0) < FLEIJA.lab &&
        ((prep.lab || 0) < FLEIJA.lab - 1 || g.turn >= FLEIJA.labTurn)
      ) {
        const cost = buildCost(prep, 'lab');
        if (spendable() - cost.credits >= 100 && affordable(cost)) upgraded = build(g, prep.id, 'lab').ok;
      }
      for (const d of (g.sites || []).filter(d => depositOwner(g, d) === side).sort((a, b) => b.base - a.base)) {
        const host = depositHost(g, d),
          cost = buildCost(host, 'refinery');
        if (upgraded) break;
        if ((host.refinery || 0) >= 3 || spendable() - cost.credits < 150 || !affordable(cost)) continue;
        upgraded = (d.city == null ? refine(g, d.id) : build(g, host.id, 'refinery')).ok;
        if (upgraded) break;
      }
      const options = bases
        .flatMap(s => ['factory', 'lab'].map(kind => ({ s, kind, level: buildingLevel(s, kind) })))
        .filter(o => o.level < 3 && !(o.kind === 'lab' && o.level === 2 && g.turn < FLEIJA.labTurn))
        .sort((a, b) => a.level - b.level || front(b.s) - front(a.s) || random(g) - 0.5);
      const pick = options[0];
      if (
        !upgraded &&
        pick &&
        spendable() - buildCost(pick.s, pick.kind).credits >= 250 &&
        affordable(buildCost(pick.s, pick.kind))
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
          !atSea(g, u),
      )
      .sort((a, b) => TYPES[b.type].cost - TYPES[a.type].cost)) {
      const c = reinforceCost(u.type, g, side, u);
      if (affordable(c) && keepsHeavy(u.type, c) && spendable() - c.credits >= 150) reinforce(g, u.id);
    }
    // 5. Build: factories serving the front with the largest strength deficit first (then front-line ones), each
    // putting what its front asks for at the top of its menu. There is no army cap; the treasury is the limit.
    const serves = s =>
        (memo.fronts || [])
          .filter(f => f.assigned < f.desiredStrength && dist(g, s, f.rally || f.anchor) <= 25)
          .sort((a, b) => dist(g, s, a.rally || a.anchor) - dist(g, s, b.rally || b.anchor))[0],
      urgency = s => {
        const f = serves(s);
        return f ? (f.desiredStrength - f.assigned) * (0.5 + Math.max(0, f.score) / 100) : 0;
      },
      yards = bases.slice().sort((a, b) => urgency(b) - urgency(a));
    // 4b. Navy: one level-2 port for carriers and up to three ports in all (one port build a turn), then a fleet of up
    // to four Carrier-Battleships and six amphibious formations.
    const navy = g.mode !== 'campaign' && NAVAL[side];
    if (navy) {
      const coastal = bases.filter(s => portSite(g, s)),
        ports = coastal.filter(s => s.portLevel && s.portOwner === side),
        pick = !ports.some(s => s.portLevel >= 2)
          ? ports.sort((a, b) => b.portLevel - a.portLevel || front(b) - front(a))[0] ||
            coastal.sort((a, b) => front(b) - front(a))[0]
          : ports.length < Math.min(3, coastal.length)
            ? coastal.filter(s => !s.portLevel).sort((a, b) => front(a) - front(b))[0]
            : null;
      if (pick && !buildReason(g, pick, 'port')) {
        const cost = buildCost(pick, 'port');
        if (spendable() - cost.credits >= 150 && affordable(cost)) build(g, pick.id, 'port');
      }
      const count = (...roles) => own().filter(u => roles.some(r => u.type === navy[r])).length;
      for (const [role, short] of [
        ['carrier', count('carrier') < 4],
        ['amphibious2', count('amphibious', 'amphibious2') < 6],
        ['amphibious', count('amphibious', 'amphibious2') < 6],
      ]) {
        if (!short || random(g) >= 0.5) continue;
        const type = navy[role],
          c = price(type, 1, g, side),
          yard = bases.find(s => canBuy(g, s, type, 1));
        if (yard && affordable(c) && keepsHeavy(type, c) && recruit(g, yard.id, type, 1).ok) break;
      }
    }
    // Formations first: every factory builds a 3- or 2-frame formation when the treasury allows, taking a cheaper frame
    // from its menu as a formation before settling for a lone frame. Only when no factory can afford any formation
    // does the most urgent one build a single frame; otherwise the money is saved for formations.
    const menuOf = s => {
      // Tier-1 frames (no Sakuradite) follow as fallbacks when Sakuradite runs short.
      const classes =
          s.tier >= 3
            ? ['heavy', 'siege', 'medium', 'rocket', 'light', 'assault', 'support', 'scout']
            : s.tier === 2
              ? ['medium', 'rocket', 'raider', 'light', 'support', 'assault', 'scout']
              : ['light', 'support', 'assault', 'scout'],
        need = (serves(s)?.need || []).filter(c => classes.includes(c)),
        menu = [...need, ...classes.filter(c => !need.includes(c))].map(cls => typeFor(side, cls, g)),
        preferred = menu[Math.floor(random(g) * Math.min(menu.length, 3))];
      return [preferred, ...menu.filter(x => x !== preferred)];
    };
    // The frame the front asks for comes first, in the largest formation affordable, then the next frame on the menu.
    const tryBuild = (s, menu, sizes) => {
      for (const type of menu)
        for (const n of sizes) {
          const c = price(type, n, g, side);
          if (canBuy(g, s, type, n) && affordable(c) && keepsHeavy(type, c) && recruit(g, s.id, type, n).ok) return true;
        }
      return false;
    };
    const menus = new Map(yards.map(s => [s, menuOf(s)]));
    let formations = 0;
    for (const s of yards) if (tryBuild(s, menus.get(s), [3, 2])) formations++;
    if (!formations) for (const s of yards) if (tryBuild(s, menus.get(s), [1])) break;
  }
  function coastTile(g, p) {
    return !isSea(p) && adjacent(g, p).some(isSea);
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
            (s ? 35 : 0) +
            (s?.capitalOf ? 60 : 0) +
            (s?.project ? 120 : 0) +
            (d?.cmd ? 30 : 0) -
            pr.counter * 0.5;
          return { p, score };
        })
        .sort((a, b) => b.score - a.score)[0];
    if (!u.moved && !u.attacked && !steered) {
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
        convoy = fromLand && !guard && !ashore && (landGroup >= 2 || (landGroup >= 1 && seaEscort >= 1) || safe),
        currentField = fieldAt(old);
      const placeScore = p => {
        const station = stationAt(g, p);
        let sc = station && foe(g, station.owner, u.side) && station.shield === 0 ? 400 + (station.capitalOf ? 600 : 0) : 0;
        if (COMMANDERS[u.cmd]?.fx.treasury && station?.owner === u.side) sc += 250 + station.income * 4;
        const mine = siteAt(g, p);
        if (mine && foe(g, mine.owner, u.side) && canCapture(u)) sc += mine.base >= 30 ? 550 : 250;
        // A city guard stands beside its city while no enemy is within 2 hexes of it, leaving the factory free (a
        // unit on the city hex blocks production); when one comes close it steps onto the city.
        const onGuard = guard && p.c === guard.c && p.r === guard.r,
          guardBonus = !onGuard ? 0 : guard.id != null && !enemies.some(v => dist(g, v, guard) <= 2) ? -40 : 25;
        sc -= guard ? dist(g, p, guard) * 30 - guardBonus : u.hold ? 0 : fieldAt(p) * 8;
        if (u.hold) sc -= Math.max(0, dist(g, p, u.hold) - (u.hold.radius ?? 2)) * 40;
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
    }
    // Recheck after movement: a designation may only now be in range.
    if (action && !['command', 'withdraw'].includes(action.kind) && !feintReason(g, u)) {
      const r = feint(g, id);
      if (r.ok) events.push({ kind: 'feint', id, affected: r.affected });
    }
    for (let chain = 0; chain < 8 && !u.attacked && !g.over && u.hp > 0; chain++) {
      const shot = choose();
      if (!shot) break;
      const a = attack(g, id, shot.p.c, shot.p.r);
      if (a.ok) events.push({ kind: 'attack', ...a, id });
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
    return events;
  }
  Object.assign(E, { aiProduction, aiOrder, aiPlan, unitStrength, FRONT });
})(typeof window !== 'undefined' ? window : globalThis);

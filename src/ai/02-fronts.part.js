  // ======== Theaters ========
  // Objectives within `radius` hexes form one front. Every emergency and the `max` best other fronts are fought at once,
  // units keep their front for `sticky` turns, and an offensive gathers within `rally` hexes before attacking
  // (or after `wait` turns). `reserve` is the total routine defense share, including garrisons and defensive fronts.
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
    // One peacetime defensive allocation: garrisons, routine defensive
    // fronts and the mobile reserve all share 10% of available ground strength.
    // Genuine emergencies can exceed that allocation.
    const guardedStrength = sum(allUnits(g).filter(u => u.hp > 0 && u.side === side && memo.guards[u.id]));
    let uncommittedDefense = Math.max(0, FRONT.reserve * (army + guardedStrength) - guardedStrength);
    for (const f of fronts) {
      if (f.type !== 'defensive' || f.emergency) continue;
      f.target = Math.min(f.desiredStrength, uncommittedDefense);
      uncommittedDefense -= f.target;
    }
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
        desiredStrength: uncommittedDefense,
        score: 0,
      };
    if (reserve) byId.reserve = reserve;
    // 3. Sticky assignments hold unless the front is gone, the unit has served its turns, drifted extremely far, or a
    // vital emergency nearby (any emergency, for the reserve) needs it.
    const assign = {},
      emergencies = fronts.filter(f => f.emergency),
      fitsDefense = (u, f) => {
        const maximum = f === reserve ? f.desiredStrength :
          f.type === 'defensive' && !f.emergency ? f.target : Infinity;
        return f.assigned + unitStrength(u) <= maximum + 1e-9;
      },
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
      if (!pulled && fitsDefense(u, f) && g.turn - a.since < FRONT.sticky && dist(g, at(u), f.anchor) <= FRONT.far) give(u, f);
    }
    // 4. Targets: emergencies get their full need and the reserve its share; the rest of the army splits 50/25/15/10 by
    // front rank, a front never taking more than it needs (the surplus flows to the others).
    const open = fronts.filter(f => !f.emergency && f.type === 'offensive'),
      routineDefense = fronts.reduce((a, f) => a + (f.type === 'defensive' && !f.emergency ? f.target : 0), 0),
      weight = new Map(open.map((f, i) => [f, [0.5, 0.25, 0.15, 0.1][i] || 0.1]));
    let pot = army - (reserve?.desiredStrength || 0) - routineDefense,
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
          if (assign[u.id] || !fitsDefense(u, f)) continue;
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
      const needy = fronts.filter(f => f.assigned < f.target)
        .sort((a, b) => b.target - b.assigned - (a.target - a.assigned));
      if (!needy.some(f => take(f))) break;
    }
    // Remaining formations reinforce offensives or genuine emergencies,
    // never routine defensive fronts already covered by the 10% allocation.
    const deployable = fronts.filter(f => f.type === 'offensive' || f.emergency);
    for (const u of pool) {
      if (assign[u.id]) continue;
      const f = byDist(at(u), deployable)[0];
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
  // Garrison duty: the capital seeks two defenders (four when threatened), but routine guards share
  // the 10% defense budget with defensive fronts and the mobile reserve. Nearby enemies within four hexes
  // warrant extra emergency guards. Fortress cities and major naval bases seek one guard when budget allows.

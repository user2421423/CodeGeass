  // ======== Theaters ========
  // Objectives within `radius` hexes form one front. Every emergency and the `max` best other fronts are fought at once,
  // units keep their front for `sticky` turns, and an offensive gathers within `rally` hexes before attacking
  // (or after `wait` turns). Garrisons and defensive fronts respond to threats; no army is held in strategic reserve.
  const FRONT = { radius: 16, near: 20, max: 4, sticky: 4, far: 60, rally: 4, wait: 3, pull: 15, stray: 4, floor: 0.25 };
  // Planning strength of a formation: frames in the stack, health and generation; commanders and Elite Forces count more.
  function unitStrength(u) {
    const t = TYPES[u.type];
    return u.stack * Math.max(0.2, u.hp / maxHP(u)) * (1 + 0.25 * ((t.tier || 1) - 1)) * (u.cmd ? 1.5 : 1) * (t.elite ? 1.5 : 1);
  }
  // Japan Scenario: offensive columns follow real terrain and naval routes.
  // These distance fields persist for the lifetime of a map; captures change
  // ownership, not terrain. A new map instance gets a fresh cache.
  const scenarioRoutes = new WeakMap();
  const SCENARIO_COLUMN = { maxUnits: 5, switchMargin: 1.35, exploitTurns: 2, exploitRadius: 9 };
  function scenarioRouteField(g, f) {
    let cache = scenarioRoutes.get(g);
    if (!cache || cache.tiles !== g.tiles) {
      cache = { tiles: g.tiles, fields: new Map() };
      scenarioRoutes.set(g, cache);
    }
    let field = cache.fields.get(f.anchor.id);
    if (!field) {
      field = goalField(g, f.side, [[f.anchor, 0]]);
      cache.fields.set(f.anchor.id, field);
    }
    return field;
  }
  function scenarioTravel(g, u, f) {
    const cost = scenarioRouteField(g, f)[u.r * g.cols + u.c];
    if (!Number.isFinite(cost)) return Infinity;
    // A route estimates movement turns, with terrain and changes between
    // land/sea already priced by goalField. Do not assume hex distance.
    const speed = u.type ? Math.max(1, E.movement(g, u)) : 4;
    return cost / speed;
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
    const fronts = memo.fronts.filter(f => foe(g, f.anchor.owner, u.side) &&
      Number.isFinite(scenarioTravel(g, u, f)));
    if (!fronts.length) return null;
    const understrength = fronts.filter(f => f.members.length < SCENARIO_COLUMN.maxUnits &&
      f.assigned < f.desiredStrength);
    const withRoom = fronts.filter(f => f.members.length < SCENARIO_COLUMN.maxUnits);
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
    troops.sort((a, b) => best(a) - best(b) || a.id - b.id);
    for (const u of troops) {
      const old = memo.byId[previous[u.id]?.front] || null,
        next = scenarioPick(g, memo, at(u), old);
      if (next) scenarioGive(g, memo, u, next);
    }
    for (const f of fronts) {
      f.friendlyStrength = f.assigned;
      f.target = f.desiredStrength;
      f.need = frontNeeds(f, troops.filter(u => memo.assign[u.id] === f.id), g);
      memo.columns[f.id] = f.members;
    }
    fronts.sort((a, b) => {
      const nearest = f => Math.min(Infinity, ...(troops.length ?
        troops.map(u => scenarioTravel(g, at(u), f)) :
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
    // Garrisons have already been excluded from the deployable field army.
    // All remaining formations can reinforce offensives or defensive fronts as needed.
    const byId = Object.fromEntries(fronts.map(f => [f.id, f]));
    // 3. Sticky assignments persist unless the front disappears, its term ends, the unit
    // drifts far away, or a nearby vital emergency demands redeployment.
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
      const pulled = emergencies.some(e => e !== f && e.vital && dist(g, at(u), e.anchor) <= FRONT.pull);
      if (!pulled && g.turn - a.since < FRONT.sticky && dist(g, at(u), f.anchor) <= FRONT.far) give(u, f);
    }
    // 4. Emergency fronts get priority; remaining forces are shared across both
    // offensive and routine defensive fronts by priority and actual strength need.
    const open = fronts.filter(f => !f.emergency),
      weight = new Map(open.map((f, i) => [f, [0.5, 0.25, 0.15, 0.1][i] || 0.1]));
    let pot = army,
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
    // The pool goes to emergencies first, then the fronts furthest below their
    // targets. Leftover units join an active front, preferably an offensive.
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
     for (;;) {
      const needy = fronts.filter(f => f.assigned < f.target)
        .sort((a, b) => b.target - b.assigned - (a.target - a.assigned));
      if (!needy.some(f => take(f))) break;
    }
    // If targets are already filled, prefer sending extra strength to an
    // offensive instead of accumulating units in routine defensive positions.
    const offensive = fronts.filter(f => f.type === 'offensive' || f.emergency),
      overflow = offensive.length ? offensive : fronts;
    for (const u of pool) {
      if (assign[u.id]) continue;
      const f = byDist(at(u), overflow)[0];
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
    for (const f of fronts) {
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
    Object.assign(memo, { fronts, byId, assign, fields: {}, staging: lift?.rally || null });
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
    if (!memo?.byId || !u || memo.guards?.[u.id] || memo.recoveries?.has(u.id) || isShip(u) || u.hold) return null;
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

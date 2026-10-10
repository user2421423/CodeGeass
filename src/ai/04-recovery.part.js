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

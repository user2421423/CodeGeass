  // ======== Sakuradite: the fourth resource, mined at a handful of deposits ========
  // Japan holds 70 of the world's 120 base output, and its output is allocated internationally (episode 8): the power
  // controlling a Japanese deposit keeps 60% and every other surviving major power receives 20%. The split, outputs,
  // extraction rates, the starting stockpile and prices are balance values, not canon quantities.
  const SAKURADITE = {
    start: 100,
    extraction: [0.25, 0.5, 0.75, 1], // share of a deposit's output by refinery level 0–3
    exportCredits: 15, // a level-3 refinery also exports for credits
    // Per frame, by class; basic classes need none (credits and industry cover them). Extra frames follow the 85% rule.
    cost: { raider: 2, medium: 3, rocket: 3, heavy: 5, siege: 8, super: 10 },
    // Elite Forces: one unique frame, priced by rarity whatever its Elite level.
    elite: { Rare: 5, Epic: 10, Legendary: 15 },
    allocation: { sites: ['Mount Fuji', 'Hokkaido', 'Kyushu'], share: 0.2 }, // each other power's share of Japan
    national: 5, // every surviving major power's own supply a turn, tied to no deposit (Conquest only)
  };
  // Stockpiles and deposits for a new game.
  function setupSakuradite(g) {
    for (const [side, e] of Object.entries(g.economy)) e.sakuradite ??= MAJORS.includes(side) ? SAKURADITE.start : 0;
    if (g.sites) return g;
    g.sites = [];
    for (const [name, lon, lat, base, level, terrain] of RESOURCE_SITES) {
      const h = hexOf(lon, lat),
        t = tile(g, h.c, h.r),
        city = t && stationAt(g, t),
        id = g.sites.length;
      if (!t) continue;
      if (city) {
        city.refinery = Math.max(city.refinery || 0, level);
        g.sites.push({ id, name, c: city.c, r: city.r, base, city: city.id });
        continue;
      }
      const open = n => !navigable(n) && !TERRAIN[n.terrain]?.blocked && !stationAt(g, n),
        at = open(t) ? t : nearest(g, t, open);
      if (!at) continue;
      if (terrain) setTileTerrain(g, at, terrain);
      g.sites.push({ id, name, c: at.c, r: at.r, base, city: null, owner: at.owner || 'neutral', refinery: level });
    }
    return g;
  }
  // A deposit's refinery and owner live on its city, or on the mine itself.
  function depositHost(g, d) {
    return d.city == null ? d : g.stations.find(s => s.id === d.city) || null;
  }
  function depositOwner(g, d) {
    return depositHost(g, d)?.owner || null;
  }
  function depositOf(g, s) {
    return (s && g.sites?.find(d => d.city === s.id)) || null;
  }
  function siteAt(g, p) {
    return (p && g.sites?.find(d => d.city == null && d.c === p.c && d.r === p.r)) || null;
  }
  function depositYield(g, d) {
    const host = depositHost(g, d),
      level = clamp(host?.refinery || 0, 0, 3),
      rate = host ? SAKURADITE.extraction[level] : 0;
    return {
      level,
      rate,
      sakuradite: Math.round(d.base * rate),
      credits: rate && level >= 3 ? SAKURADITE.exportCredits : 0,
    };
  }
  // Who receives a deposit's extraction this turn: its owner, or for a Japanese deposit held by a major power, the
  // international allocation. Shares of powers that have surrendered stay with the controller. Unrounded.
  function depositShares(g, d) {
    const owner = depositOwner(g, d),
      out = depositYield(g, d).sakuradite,
      a = SAKURADITE.allocation;
    if (!owner || !out) return {};
    if (g.mode === 'campaign' || !a.sites.includes(d.name) || !alive(g, owner)) return { [owner]: out };
    const others = MAJORS.filter(s => s !== owner && alive(g, s)),
      shares = { [owner]: out * (1 - a.share * others.length) };
    for (const s of others) shares[s] = out * a.share;
    return shares;
  }
  function spend(e, cost) {
    e.credits -= cost.credits || 0;
    e.industry -= cost.industry || 0;
    if (cost.science) e.science -= cost.science;
    if (cost.sakuradite) e.sakuradite = (e.sakuradite || 0) - cost.sakuradite;
  }
  // A city's output per turn, with the deposit it works.
  function cityOutput(g, s) {
    const stationed = g.units.find(u => u.hp > 0 && u.side === s.owner && u.cmd && u.c === s.c && u.r === s.r),
      bonus = id => stationed ? 1 + 0.04 * genericLevel(g, stationed, id) : 1;
    return {
      credits: Math.round(s.income * treasuryBonus(g, s) * bonus('economic_expert')),
      industry: s.industry * (1 + techValue(g, s.owner, 'cities.industry')) * bonus('industrial_expert'),
      science: s.science * bonus('technology_expert'),
    };
  }
  function cityYield(g, s) {
    const d = depositOf(g, s),
      y = d ? depositYield(g, d) : { sakuradite: 0, credits: 0 },
      output = cityOutput(g, s);
    return { credits: output.credits + y.credits, industry: Math.round(output.industry), science: Math.round(output.science), sakuradite: y.sakuradite };
  }
  // Infantry or Armor moving onto a mine seizes it; it has no defenses.
  function seizeDeposit(g, u, p) {
    const d = siteAt(g, p);
    if (!d || d.owner === u.side || !canCapture(u)) return null;
    const loser = d.owner;
    d.owner = u.side;
    log(
      g,
      `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} seizes the ${d.name} Sakuradite mine${FACTIONS[loser] && loser !== 'neutral' ? ' from the ' + FACTIONS[loser].short : ''}.`,
      u.side,
    );
    return d.name;
  }
  // A surrendering power's mines and half its Sakuradite pass to the conqueror.
  function annexDeposits(g, loser, winner) {
    for (const d of g.sites || []) if (d.city == null && d.owner === loser) d.owner = winner;
    const e = funds(g, loser),
      w = funds(g, winner);
    if (!e || !w) return;
    w.sakuradite = (w.sakuradite || 0) + Math.round((e.sakuradite || 0) / 2);
    e.sakuradite = 0;
  }
  // Refineries at mines of their own (deposits under a city use the city's refinery building).
  function refineReason(g, d) {
    if (!d || d.city != null) return 'Unavailable';
    const foe = unitAt(g, d);
    return (
      (g.over ? 'Operation over' : d.owner !== g.phase ? 'Not your mine' : null) ||
      ((d.refinery || 0) >= 3 ? 'Maximum level' : null) ||
      (foe && foe.side !== d.owner ? 'Enemy unit on the mine' : null) ||
      shortfall(funds(g, d.owner), buildCost(d, 'refinery'))
    );
  }
  function refine(g, id) {
    const d = g.sites?.find(d => d.id === id),
      why = refineReason(g, d);
    if (why) return { ok: false, reason: why };
    spend(funds(g, d.owner), buildCost(d, 'refinery'));
    d.refinery = (d.refinery || 0) + 1;
    log(g, `${d.name}: Sakuradite refinery upgraded to level ${d.refinery}.`, d.owner);
    return { ok: true };
  }

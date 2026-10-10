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
        for (const u of own
          .filter(u => !taken[u.id] && dist(g, u, s) <= aiRange(g).cityGuard)
          .sort((a, b) => dist(g, a, s) - dist(g, b, s) || a.id - b.id)) {
          if (guard(u, { c: s.c, r: s.r, id: s.id })) break;
        }
      }
    // Own mines: major deposits seek one guard; threatened mines can draw up to two defenders.
    for (const d of g.sites || []) {
      if (d.city != null || d.owner !== side) continue;
      const t = threat(d),
        need = t > 0 ? Math.min(2, Math.ceil(t / 2)) : d.base >= 30 ? 1 : 0;
      const near = own.filter(u => !taken[u.id] && dist(g, u, d) <= aiRange(g).mineGuard).sort((a, b) => dist(g, a, d) - dist(g, b, d));
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

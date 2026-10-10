  // ======== Commander development ========
  // Two kinds of commander. Scenario commanders come with the operation, sit on their units with fixed stats
  // (g.officers) and are never upgraded. Your commanders (profile.roster) are bought once, upgraded in HQ, kept
  // between operations and assignable in any operation, even beside the scenario's own version (u.personal).
  const STARTERS = { britannia: ['suzaku', 'cornelia'], eu: ['leila', 'akito'], cf: ['xingke', 'xianglin'] };
  function fx(u) {
    return (u?.cmd && COMMANDER_EFFECTS[u.cmd]) || NOFX;
  }
  function recruitPrice(k) {
    const a = COMMANDERS[k];
    return a?.recruit ?? (a?.stars >= 5 ? 400 : a?.stars >= 4 ? 300 : 200);
  }
  // Rarity slots: 2★=0, 3★=1, 4★=2, 5★=3; all start empty.
  function genericSlots(k) { return Math.max(0, Math.min(3, (COMMANDERS[k]?.stars || 2) - 2)); }
  function defaultOfficer(k) {
    return { rank: COMMANDERS[k].stars >= 5 ? 1 : 0, ratings: { ...RATINGS[k] }, medals: [], generics: {}, commanderVersion: COMMANDER_VERSION };
  }
  function cleanOfficer(k, rec) {
    const base = defaultOfficer(k);
    if (!rec) return base;
    const ratings = { ...rec.ratings };
    // Cornelia's old +2 skill movement becomes two Mobility stars, once per record.
    if (k === 'cornelia' && !rec.commanderVersion && ratings.mobility != null)
      ratings.mobility = Math.min(MAX_RATING, ratings.mobility + 2);
    return {
      commanderVersion: COMMANDER_VERSION,
      rank: clamp(Number.isInteger(rec.rank) ? rec.rank : base.rank, 0, RANKS.length - 1),
      ratings: Object.fromEntries(
        Object.keys(base.ratings).map(b => [b, clamp((ratings[b] ?? base.ratings[b]) | 0, 1, MAX_RATING)]),
      ),
      medals: (rec.medals || []).filter(m => MEDALS[m]),
      generics: Object.fromEntries(Object.entries(rec.generics || {})
        .filter(([id, level]) => GENERIC_SKILLS[id] && Number.isInteger(level) && level >= 1 && level <= 5)
        .slice(0, genericSlots(k))),
    };
  }
  // The persistent roster, created on first use: the two starters per faction.
  function roster(profile) {
    if (!profile.roster) {
      profile.roster = {};
      for (const k of Object.values(STARTERS).flat()) profile.roster[k] = defaultOfficer(k);
    }
    for (const [k, rec] of Object.entries(profile.roster))
      if (COMMANDERS[k] && rec?.commanderVersion !== COMMANDER_VERSION) {
        // Mobility now starts at 6: return tokens paid for Cornelia's old fifth/sixth star. Only records from before
        // versioning (no commanderVersion) paid for them; later version bumps must not refund again.
        if (k === 'cornelia' && !rec?.commanderVersion) for (let star = 5; star <= Math.min(6, rec?.ratings?.mobility || 4); star++)
          profile.tokens = (profile.tokens || 0) + STAR_COST[star];
        profile.roster[k] = cleanOfficer(k, rec);
      }
    return profile.roster;
  }
  function owns(profile, k) {
    return !!roster(profile)[k];
  }
  function officer(g, k) {
    if (!k || !COMMANDERS[k]) return null;
    g.officers ||= {};
    const rec = (g.officers[k] ||= defaultOfficer(k));
    return rec.commanderVersion === COMMANDER_VERSION ? rec : (g.officers[k] = cleanOfficer(k, rec));
  }
  // The record behind a unit's commander: your commander for personal units, the scenario commander otherwise.
  function officerOf(g, u) {
    if (!u?.cmd) return null;
    return (u.personal && g.roster?.[u.cmd]) || officer(g, u.cmd);
  }
  function genericLevel(g, u, id) {
    const skill = GENERIC_SKILLS[id];
    if (!skill || !u?.cmd || (skill.branch && TYPES[u.type].branch !== skill.branch)) return 0;
    return officerOf(g, u)?.generics?.[id] || 0;
  }
  function genericDescription(id, level = 5) {
    const s = GENERIC_SKILLS[id];
    if (!s) return '';
    const amount = Math.round(s.step * Math.max(1, Math.min(5, level)) * 100);
    const branch = s.branch ? s.branch + ': ' : '';
    const rule = {
      crit: '+' + amount + ' percentage points critical chance',
      damage: '+' + amount + '% attack damage',
      avoid: amount + '% chance to prevent enemy counterattack',
      counter: '+' + amount + '% counterattack damage',
      defense: '-' + amount + '% incoming damage (all three branches)',
      credits: '+' + amount + '% credits from occupied friendly city',
      industry: '+' + amount + '% industry from occupied friendly city',
      science: '+' + amount + '% research from occupied friendly city',
      hpPenalty: 'Negates ' + amount + '% of attack loss caused by missing HP',
      regen: 'Restores ' + amount + '% maximum HP at start of each turn',
    };
    return branch + (rule[s.kind] || '');
  }
  function wears(g, u, medal) {
    return !!officerOf(g, u)?.medals?.includes(medal);
  }
  function medalSlots(o) {
    return 1 + Math.floor(o.rank / 4);
  }
  // Damage dealt and taken by a commander's unit: branch rating and medals.
  function officerAttack(g, u) {
    if (!u.cmd) return 1;
    const o = officerOf(g, u);
    return (
      (1 + 0.04 * ((o.ratings[branchOf(u.type)] || 3) - 3)) *
      (wears(g, u, 'valor') ? 1.08 : 1) *
      (wears(g, u, 'campaign') ? 1.04 : 1)
    );
  }
  function officerDefense(g, u) {
    if (!u.cmd) return 1;
    const o = officerOf(g, u);
    return Math.max(
      0.5,
      (1 - 0.03 * ((o.ratings[branchOf(u.type)] || 3) - 3)) *
        (wears(g, u, 'laurel') ? 0.92 : 1) *
        (wears(g, u, 'campaign') ? 0.96 : 1),
    );
  }
  function auraRange(a) {
    return fx(a).aura?.range || 1;
  }
  // Lowest morale a unit can be pushed to: steady for commanders with a floor; Fernando's calm stops confusion and
  // Ohgi's Organizer keeps adjacent units at Low or better.
  function moraleFloor(g, v) {
    if (fx(v).floor != null) return fx(v).floor;
    return g.units.some(
      m => m.hp > 0 && m.side === v.side && (fx(m).calm || (fx(m).organizer && m.id !== v.id) || (fx(m).discipline && !v.cmd && m.id !== v.id)) && dist(g, m, v) <= 1,
    )
      ? -1
      : -3;
  }
  // ---- HQ commanders: every action below works on the profile, outside or inside an operation ----
  function tokenShort(profile, cost) {
    const have = profile?.tokens || 0;
    return cost > have ? `Need ${cost - have} more command tokens` : null;
  }
  function recruitReason(profile, k) {
    if (!COMMANDERS[k]) return 'Unknown commander';
    if (owns(profile, k)) return 'Already one of your commanders';
    return tokenShort(profile, recruitPrice(k));
  }
  function recruitCommander(profile, k) {
    const why = recruitReason(profile, k);
    if (why) return { ok: false, reason: why };
    profile.tokens -= recruitPrice(k);
    roster(profile)[k] = defaultOfficer(k);
    return { ok: true };
  }
  function ownedReason(profile, k) {
    if (!COMMANDERS[k]) return 'Unknown commander';
    return owns(profile, k) ? null : `Recruit for ${recruitPrice(k)} command tokens first`;
  }
  function promoteCost(o) {
    return PROMOTE_COST[o.rank + 1] ?? Infinity;
  }
  function promoteReason(profile, k) {
    const why = ownedReason(profile, k);
    if (why) return why;
    const o = roster(profile)[k];
    return o.rank >= RANKS.length - 1 ? 'Highest rank reached' : tokenShort(profile, promoteCost(o));
  }
  function promote(profile, k) {
    const why = promoteReason(profile, k);
    if (why) return { ok: false, reason: why };
    const o = roster(profile)[k];
    profile.tokens -= promoteCost(o);
    o.rank++;
    return { ok: true, rank: o.rank };
  }
  // Command tokens (the medals of this game) buy extra branch stars, up to six.
  const MAX_RATING = 6;
  const STAR_COST = [0, 0, 0, 60, 120, 220, 360];
  function starCost(profile, k, branch) {
    const o = roster(profile)[k] || defaultOfficer(k);
    return STAR_COST[(o.ratings[branch] || 0) + 1] ?? Infinity;
  }
  function starReason(profile, k, branch) {
    if (!BRANCH_NAMES[branch]) return 'Unknown branch';
    const why = ownedReason(profile, k);
    if (why) return why;
    return (roster(profile)[k].ratings[branch] || 0) >= MAX_RATING
      ? `Already ${MAX_RATING} stars`
      : tokenShort(profile, starCost(profile, k, branch));
  }
  function buyStar(profile, k, branch) {
    const why = starReason(profile, k, branch);
    if (why) return { ok: false, reason: why };
    profile.tokens -= starCost(profile, k, branch);
    const o = roster(profile)[k];
    o.ratings[branch]++;
    return { ok: true, stars: o.ratings[branch] };
  }
  const GENERIC_COSTS = [0, 100, 120, 150, 200, 260];
  const GENERIC_RESPEC_COST = 40;
  function genericCost(level = 0) { return GENERIC_COSTS[level + 1] ?? Infinity; }
  function genericReason(profile, k, id) {
    const why = ownedReason(profile, k);
    if (why) return why;
    if (!GENERIC_SKILLS[id]) return 'Unknown generic skill';
    const o = roster(profile)[k], existing = o.generics?.[id] || 0;
    if (existing >= 5) return 'Already Level 5';
    if (!existing && Object.keys(o.generics || {}).length >= genericSlots(k)) return 'No empty generic skill slots';
    return tokenShort(profile, genericCost(existing));
  }
  function buyGeneric(profile, k, id) {
    const why = genericReason(profile, k, id);
    if (why) return { ok: false, reason: why };
    const o = roster(profile)[k], level = o.generics?.[id] || 0;
    profile.tokens -= genericCost(level);
    (o.generics ||= {})[id] = level + 1;
    return { ok: true, level: level + 1 };
  }
  function removeGenericReason(profile, k, id) {
    const why = ownedReason(profile, k);
    if (why) return why;
    if (!roster(profile)[k].generics?.[id]) return 'Skill is not equipped';
    return tokenShort(profile, GENERIC_RESPEC_COST);
  }
  function removeGeneric(profile, k, id) {
    const why = removeGenericReason(profile, k, id);
    if (why) return { ok: false, reason: why };
    profile.tokens -= GENERIC_RESPEC_COST;
    delete roster(profile)[k].generics[id];
    return { ok: true };
  }
  function equipReason(profile, k, medal) {
    const why = ownedReason(profile, k);
    if (why) return why;
    const o = roster(profile)[k];
    return (
      (!(profile.medals || []).includes(medal) ? 'Not in your medal case' : null) ||
      (o.medals.includes(medal) ? 'Already wearing this medal' : null) ||
      (o.medals.length >= medalSlots(o) ? `All ${medalSlots(o)} medal slots in use` : null)
    );
  }
  function equipMedal(profile, k, medal) {
    const why = equipReason(profile, k, medal);
    if (why) return { ok: false, reason: why };
    profile.medals.splice(profile.medals.indexOf(medal), 1);
    roster(profile)[k].medals.push(medal);
    return { ok: true };
  }
  function unequipMedal(profile, k, medal) {
    const why = ownedReason(profile, k);
    if (why) return { ok: false, reason: why };
    const o = roster(profile)[k],
      i = o.medals.indexOf(medal);
    if (i < 0) return { ok: false, reason: 'Not wearing that medal' };
    o.medals.splice(i, 1);
    (profile.medals ||= []).push(medal);
    return { ok: true };
  }
  function award(g, side, id, reason) {
    if (side !== g.player || !MEDALS[id]) return;
    (g.medalInventory ||= []).push(id);
    (g.medalsEarned ||= []).push({ id, reason, turn: g.turn });
    log(g, `${MEDALS[id].name} awarded: ${reason}.`, side);
  }


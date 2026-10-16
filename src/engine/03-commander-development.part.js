  // ======== Commander development ========
  // Two kinds of commander. Scenario commanders come with the operation, sit on their units with fixed stats
  // (g.officers) and are never upgraded. Your commanders (profile.roster) are bought once, upgraded in HQ, kept
  // between operations and assignable in any operation, even beside the scenario's own version (u.personal).
  const HQ_RANK_CAP = PROMOTE_COST.length - 1; // Marshal; higher ranks are Elite-only AI bonuses.
  const STARTERS = { britannia: ['cornelia'], bk: ['zero'] };
  function fx(u) {
    return u?.expSilenced ? NOFX : (u?.cmd && COMMANDER_EFFECTS[u.cmd]) || NOFX;
  }
  // Commission determines generic slots; rank determines combat-star caps.
  const COMMISSION_NAMES = { standard: 'Standard', distinguished: 'Distinguished', legendary: 'Legendary' };
  const COMMISSION_ORDER = ['standard', 'distinguished', 'legendary'];
  const HIGH_COMMAND_BASE_CAPACITY = 2;
  // Approved permanent HQ upgrades. Each entry is the incremental price for the next level.
  const COMMISSION_UPGRADE_PRICES = { distinguished: 200, legendary: 350 };
  const HIGH_COMMAND_EXPANSION_PRICES = { 3: 1800, 4: 3200, 5: 5500, 6: 9000 };
  function commissionName(c) { return COMMISSION_NAMES[c] || 'Standard'; }
  function commissionOf(k, officer = null) {
    const tier = officer?.commission || COMMANDERS[k]?.commission || 'standard';
    return COMMISSION_NAMES[tier] ? tier : 'standard';
  }
  function genericSlots(k, officer = null) { return COMMISSION_ORDER.indexOf(commissionOf(k, officer)) + 1; }
  function commandStage(rank) { return rank >= 8 ? 2 : rank >= 4 ? 1 : 0; }
  function commandStageName(rank) { return ['Tactical Command', 'Operational Command', 'High Command'][commandStage(rank)]; }
  function ratingCap(rank, branch = 'armor') {
    return branch === 'mobility' ? [4, 5, 6][commandStage(rank)] : [2, 4, 6][commandStage(rank)];
  }
  function highCommandCapacity(profile) { return Math.max(2, Math.min(6, profile?.highCommandCapacity || 2)); }
  function recruitPrice(k) {
    const a = COMMANDERS[k];
    return a?.recruit ?? ({ standard: 200, distinguished: 300, legendary: 400 })[commissionOf(k)];
  }
  function defaultOfficer(k, personal = false) {
    const ratings = { ...RATINGS[k] };
    if (personal) {
      for (const branch of ['infantry', 'armor', 'artillery']) ratings[branch] = Math.min(2, ratings[branch]);
      ratings.mobility = Math.min(4, ratings.mobility);
    }
    return {
      rank: personal ? 0 : (commissionOf(k) === 'legendary' ? 1 : 0),
      ratings, commission: commissionOf(k), medals: [], generics: {},
      spending: { promotions: {}, stars: {} }, commanderVersion: COMMANDER_VERSION,
    };
  }
  function cleanOfficer(k, rec, rankCap = HQ_RANK_CAP) {
    const base = defaultOfficer(k);
    if (!rec) return base;
    const ratings = { ...rec.ratings };
    // Cornelia's old +2 skill movement becomes two Mobility stars, once per record.
    if (k === 'cornelia' && !rec.commanderVersion && ratings.mobility != null)
      ratings.mobility = Math.min(MAX_RATING, ratings.mobility + 2);
    return {
      commanderVersion: COMMANDER_VERSION,
      rank: clamp(Number.isInteger(rec.rank) ? rec.rank : base.rank, 0, rankCap),
      commission: commissionOf(k, rec),
      spending: rec.spending && typeof rec.spending === 'object'
        ? { promotions: { ...(rec.spending.promotions || {}) }, stars: { ...(rec.spending.stars || {}) } }
        : { promotions: {}, stars: {} },
      ratings: Object.fromEntries(
        Object.keys(base.ratings).map(b => [b, clamp((ratings[b] ?? base.ratings[b]) | 0, 1, MAX_RATING)]),
      ),
      medals: (rec.medals || []).filter(m => MEDALS[m]),
      generics: Object.fromEntries(Object.entries(rec.generics || {})
        .filter(([id, level]) => GENERIC_SKILLS[id] && Number.isInteger(level) && level >= 1 && level <= 5)
        .slice(0, genericSlots(k, rec))),
    };
  }
  // Fresh profiles have exactly two free commanders total; existing profile rosters are preserved.
  function roster(profile) {
    profile.roster ||= {};
    for (const k of Object.values(STARTERS).flat())
      if (!profile.roster[k]) profile.roster[k] = defaultOfficer(k, true);
    for (const [k, rec] of Object.entries(profile.roster))
      if (COMMANDERS[k] && rec?.commanderVersion !== COMMANDER_VERSION) {
        // Mobility now starts at 6: return tokens paid for Cornelia's old fifth/sixth star. Only records from before
        // versioning (no commanderVersion) paid for them; later version bumps must not refund again.
        if (k === 'cornelia' && !rec?.commanderVersion) for (let star = 5; star <= Math.min(6, rec?.ratings?.mobility || 4); star++)
          profile.tokens = (profile.tokens || 0) + STAR_COST[star];
        profile.roster[k] = cleanOfficer(k, rec);
      }
    // One-time migration: preserve saved ratings as inactive beyond new rank caps.
    if (profile.commanderProgressionVersion !== 1) {
      profile.commanderProgressionVersion = 1;
      profile.highCommandCapacity = highCommandCapacity(profile);
      const high = Object.keys(profile.roster).filter(k => COMMANDERS[k] && profile.roster[k].rank >= 8)
        .sort((a, b) => profile.roster[b].rank - profile.roster[a].rank || a.localeCompare(b));
      for (const k of high.slice(highCommandCapacity(profile))) relinquishHighCommand(profile, k, 1);
    }
    return profile.roster;
  }
  function highCommandUsed(profile) {
    return Object.entries(roster(profile)).filter(([k,o]) => COMMANDERS[k] && o.rank >= 8).length;
  }
  function highCommandExpansionPrice(profile) {
    return HIGH_COMMAND_EXPANSION_PRICES[highCommandCapacity(profile) + 1] ?? null;
  }
  function expandHighCommandReason(profile) {
    if (highCommandCapacity(profile) >= 6) return 'Maximum of six High Command positions';
    const price = highCommandExpansionPrice(profile);
    return price == null ? 'High Command expansion unavailable' : tokenShort(profile, price);
  }
  function expandHighCommand(profile) {
    const why = expandHighCommandReason(profile);
    if (why) return { ok: false, reason: why };
    profile.tokens -= highCommandExpansionPrice(profile);
    profile.highCommandCapacity = highCommandCapacity(profile) + 1;
    return { ok: true, capacity: profile.highCommandCapacity };
  }
  function commissionUpgradePrice(profile, k) {
    const current = commissionOf(k, roster(profile)[k]);
    const next = COMMISSION_ORDER[COMMISSION_ORDER.indexOf(current) + 1];
    return next ? COMMISSION_UPGRADE_PRICES[next] : null;
  }
  function upgradeCommissionReason(profile, k) {
    const why = ownedReason(profile, k);
    if (why) return why;
    if (commissionOf(k, roster(profile)[k]) === 'legendary') return 'Already a Legendary Commission';
    const price = commissionUpgradePrice(profile, k);
    return price == null ? 'Commission upgrade unavailable' : tokenShort(profile, price);
  }
  function upgradeCommission(profile, k) {
    const why = upgradeCommissionReason(profile, k);
    if (why) return { ok: false, reason: why };
    const officer = roster(profile)[k];
    profile.tokens -= commissionUpgradePrice(profile, k);
    officer.commission = COMMISSION_ORDER[COMMISSION_ORDER.indexOf(commissionOf(k, officer)) + 1];
    return { ok: true, commission: officer.commission };
  }
  function owns(profile, k) {
    return !!roster(profile)[k];
  }
  function officer(g, k) {
    if (!k || !COMMANDERS[k]) return null;
    g.officers ||= {};
    const rec = (g.officers[k] ||= defaultOfficer(k));
    return rec.commanderVersion === COMMANDER_VERSION ? rec : (g.officers[k] = cleanOfficer(k, rec,
      (eliteAIProduction(g) && COMMANDERS[k].side !== g.player) ||
        (eliteCampaign(g) && g.units?.some(u => u.cmd === k && foe(g, u.side, g.player)))
          ? RANKS.length - 1 : HQ_RANK_CAP));
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
  // Personal commander ratings above a rank's cap remain saved but inactive.
  function effectiveRating(g, u, branch) {
    const o = officerOf(g, u);
    if (!o) return 0;
    return u.personal ? Math.min(o.ratings[branch] || 0, ratingCap(o.rank, branch)) : (o.ratings[branch] || 0);
  }
  // Each combat-branch star contributes +5 flat base attack (1★ = +5, 6★ = +30).
  // The bonus is applied before Elite Force and formation multipliers, not as a percentage.
  function officerBaseAttack(g, u) {
    if (!u.cmd) return 0;
    return 5 * effectiveRating(g, u, branchOf(u.type));
  }
  // Commander medals still multiply attack; defensive branch-star scaling is unchanged.
  function officerAttack(g, u) {
    if (!u.cmd) return 1;
    return (wears(g, u, 'valor') ? 1.08 : 1) *
      (wears(g, u, 'campaign') ? 1.04 : 1);
  }
  function officerDefense(g, u) {
    if (!u.cmd) return 1;
    const o = officerOf(g, u);
    return Math.max(
      0.5,
      (1 - 0.03 * (effectiveRating(g, u, branchOf(u.type)) - 3)) *
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
    if(g.units.some(m=>m.hp>0&&!atSea(g,m)&&m.side===v.side&&fx(m).imperialAuthority&&dist(g,m,v)<=3))return 0;
    if (fx(v).floor != null) return fx(v).floor;
    return g.units.some(
      m => m.hp > 0 && m.side === v.side && (fx(m).calm || (fx(m).organizer && m.id !== v.id) || (fx(m).discipline && !v.cmd && m.id !== v.id) || (fx(m).nationalUnity && dist(g,m,v)<=3) || (fx(m).commanderlessAttack && !v.cmd)) && dist(g, m, v) <= (fx(m).nationalUnity ? 3 : 2),
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
    roster(profile)[k] = defaultOfficer(k, true);
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
    if (o.rank >= HQ_RANK_CAP) return 'Highest rank reached';
    if (o.rank === 7 && highCommandUsed(profile) >= highCommandCapacity(profile))
      return 'All High Command slots are occupied across the roster';
    return tokenShort(profile, promoteCost(o));
  }
  function promote(profile, k) {
    const why = promoteReason(profile, k);
    if (why) return { ok: false, reason: why };
    const o = roster(profile)[k];
    const next = o.rank + 1, cost = promoteCost(o);
    profile.tokens -= cost;
    o.rank = next;
    (o.spending ||= { promotions: {}, stars: {} }).promotions[next] = cost;
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
    const o = roster(profile)[k], limit = ratingCap(o.rank, branch), have = o.ratings[branch] || 0;
    if (have >= limit) return have >= MAX_RATING ? 'Already six stars' : `Rank-limited to ${limit} stars`;
    return tokenShort(profile, starCost(profile, k, branch));
  }
  function buyStar(profile, k, branch) {
    const why = starReason(profile, k, branch);
    if (why) return { ok: false, reason: why };
    const o = roster(profile)[k], cost = starCost(profile, k, branch);
    profile.tokens -= cost;
    o.ratings[branch]++;
    (o.spending ||= { promotions: {}, stars: {} }).stars[branch] ||= {};
    o.spending.stars[branch][o.ratings[branch]] = cost;
    return { ok: true, stars: o.ratings[branch] };
  }
  // Retiring releases one global High Command seat, retaining Commission and generic skills.
  function relinquishHighCommand(profile, k, proportion = 0.9) {
    const o = profile.roster?.[k];
    if (!o || o.rank < 8) return { ok: false, reason: 'Not currently in High Command' };
    const spent = o.spending || { promotions: {}, stars: {} };
    let reimbursable = 0;
    for (let i = 8; i <= o.rank; i++) {
      reimbursable += spent.promotions?.[i] ?? PROMOTE_COST[i];
      if (spent.promotions) delete spent.promotions[i];
    }
    for (const branch of Object.keys(o.ratings)) {
      const cap = ratingCap(7, branch);
      for (let level = cap + 1; level <= o.ratings[branch]; level++) {
        reimbursable += spent.stars?.[branch]?.[level] ??
          (level > (RATINGS[k]?.[branch] || 0) ? (STAR_COST[level] || 0) : 0);
        if (spent.stars?.[branch]) delete spent.stars[branch][level];
      }
      o.ratings[branch] = Math.min(cap, o.ratings[branch]);
    }
    o.rank = 7;
    while (o.medals.length > medalSlots(o)) (profile.medals ||= []).push(o.medals.pop());
    o.spending = spent;
    const refund = Math.round(reimbursable * proportion);
    profile.tokens = (profile.tokens || 0) + refund;
    return { ok: true, rank: o.rank, refund, eligible: reimbursable };
  }
  function retireCommissionPreview(profile, k) {
    const o = roster(profile)[k];
    if (!o || o.rank < 8) return 0;
    let value = 0;
    for (let i = 8; i <= o.rank; i++) value += o.spending?.promotions?.[i] ?? PROMOTE_COST[i];
    for (const branch of Object.keys(o.ratings))
      for (let level = ratingCap(7, branch) + 1; level <= o.ratings[branch]; level++)
        value += o.spending?.stars?.[branch]?.[level] ?? (level > (RATINGS[k]?.[branch] || 0) ? STAR_COST[level] : 0);
    return Math.round(value * 0.9);
  }
  function retireCommission(profile, k) {
    const why = ownedReason(profile, k);
    return why ? { ok: false, reason: why } : relinquishHighCommand(profile, k, 0.9);
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
    if (!existing && Object.keys(o.generics || {}).length >= genericSlots(k, o)) return 'No empty generic skill slots';
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


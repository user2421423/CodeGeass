  // ======== Commander development ========
  // Two kinds of commander. Scenario commanders come with the operation, sit on their units with fixed stats
  // (g.officers) and are never upgraded. Your commanders (profile.roster) are bought once, upgraded in HQ, kept
  // between operations and assignable in any operation, even beside the scenario's own version (u.personal).
  const HQ_RANK_CAP = PROMOTE_COST.length - 1; // Marshal; higher ranks are Elite-only AI bonuses.
  const STARTERS = { britannia: ['cornelia'], bk: ['zero'], eu: ['akito'], cf: ['xingke'] };
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
  // Battle credits paid each time a personal commander is assigned. Commission affects generic slots;
  // military rank affects command strength. Neither the frame nor its Elite status affects this cost.
  function assignmentCost(g, k) {
    const officer = g?.roster?.[k];
    return 100 + 40 * COMMISSION_ORDER.indexOf(commissionOf(k, officer))
      + 30 * commandStage(officer?.rank ?? 0);
  }
  function ratingCap(rank, branch = 'armor') {
    return [2, 4, 6][commandStage(rank)];
  }
  // Paid positions retain their original two-to-six pricing ladder.
  // Challenge Pass adds a separate, permanent seventh position on top.
  function purchasedHighCommandCapacity(profile) {
    return Math.max(2, Math.min(6, profile?.highCommandCapacity || 2));
  }
  function highCommandCapacity(profile) {
    return purchasedHighCommandCapacity(profile) +
      (profile?.challengePass?.milestones?.[1600] === true ? 1 : 0);
  }
  function recruitPrice(k) {
    const a = COMMANDERS[k];
    return a?.recruit ?? ({ standard: 200, distinguished: 300, legendary: 400 })[commissionOf(k)];
  }
  function defaultOfficer(k, personal = false) {
    const ratings = { ...RATINGS[k] };
    if (personal) {
      for (const branch of ['infantry', 'armor', 'artillery']) ratings[branch] = Math.min(2, ratings[branch]);
      ratings.mobility = Math.min(ratingCap(0, 'mobility'), ratings.mobility);
    }
    return {
      rank: personal ? 0 : (commissionOf(k) === 'legendary' ? 1 : 0),
      ratings, commission: commissionOf(k), medals: [], honors: [], generics: {},
      spending: { promotions: {}, stars: {} }, genericSpending: {}, commanderVersion: COMMANDER_VERSION,
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
      honors: (Array.isArray(rec.honors) ? rec.honors : []).filter(h => h && MEDALS[h.id] && Array.isArray(h.citations)),
      generics: Object.fromEntries(Object.entries(rec.generics || {})
        .filter(([id, level]) => GENERIC_SKILLS[id] && Number.isInteger(level) && level >= 1 && level <= 5)
        .slice(0, genericSlots(k, rec))),
      // Older saves never recorded per-skill spending; use the old price schedule
      // conservatively unless a newer explicit spending record is available.
      genericSpending: Object.fromEntries(Object.entries(rec.generics || {})
        .filter(([id, level]) => GENERIC_SKILLS[id] && Number.isInteger(level) && level >= 1 && level <= 5)
        .map(([id, level]) => [id, Number.isSafeInteger(rec.genericSpending?.[id]) &&
          rec.genericSpending[id] >= 0 ? rec.genericSpending[id] : legacyGenericInvestment(level)])),
    };
  }
  // Every faction has a free starting HQ commander; existing roster upgrades are preserved.
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
    // Migrate shared and equipped legacy medals into an account archive. Original
    // transferable medals have no trustworthy individual recipient; never invent one.
    if (profile.honorsVersion !== 1) {
      const legacy = (profile.legacyHonors ||= []);
      const moveLegacy = (id, formerOwner = null) => {
        if (!MEDALS[id]) return;
        const row = legacy.find(m => m.id === id && m.formerOwner === formerOwner);
        if (row) row.count += 1;
        else legacy.push({ id, formerOwner, count: 1 });
      };
      for (const id of profile.medals || []) moveLegacy(id);
      for (const [k, officer] of Object.entries(profile.roster))
        for (const id of officer.medals || []) moveLegacy(id, k);
      profile.medals = [];
      for (const officer of Object.values(profile.roster)) officer.medals = [];
      profile.honorsVersion = 1;
    }
    // One-time migration: preserve saved ratings as inactive beyond new rank caps.
    if (profile.commanderProgressionVersion !== 1) {
      profile.commanderProgressionVersion = 1;
      profile.highCommandCapacity = purchasedHighCommandCapacity(profile);
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
    return HIGH_COMMAND_EXPANSION_PRICES[purchasedHighCommandCapacity(profile) + 1] ?? null;
  }
  function expandHighCommandReason(profile) {
    if (purchasedHighCommandCapacity(profile) >= 6) return 'All six purchasable High Command positions unlocked';
    const price = highCommandExpansionPrice(profile);
    return price == null ? 'High Command expansion unavailable' : tokenShort(profile, price);
  }
  function expandHighCommand(profile) {
    const why = expandHighCommandReason(profile);
    if (why) return { ok: false, reason: why };
    profile.tokens -= highCommandExpansionPrice(profile);
    profile.highCommandCapacity = purchasedHighCommandCapacity(profile) + 1;
    return { ok: true, capacity: highCommandCapacity(profile) };
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
  // All ranks display any number of earned awards. Historical medal slots and
  // transferable loadouts were removed; this exists for old save compatibility.
  function medalSlots() { return 0; }
  // Story Mode uses mode 'campaign'; the Campaign map launches regional wars.
  function canEarnHonors(g) {
    return g?.mode === 'conquest' || (g?.mode === 'scenario' && !!g.warCampaign);
  }
  function honorService(g, u) {
    if (!canEarnHonors(g) || !u?.cmd || u.side !== g.player || !u.personal) return null;
    const key = (u.personal ? 'hq:' : 'script:') + u.cmd;
    const stats = (g.honorService ||= {});
    return (stats[key] ||= { commander: u.cmd, personal: !!u.personal,
      combats: 0, kills: 0, commanderDefeats: 0, cities: 0, capitals: 0 });
  }
  function honorAction(g, u, kind) {
    const service = honorService(g, u);
    if (service && Object.hasOwn(service, kind)) service[kind] += 1;
  }
  // Personal ratings over the rank cap remain saved but inactive. Mobility follows
  // the same rank-based active-star limits even for fixed operation commanders;
  // scripted commanders retain their uncapped combat-branch ratings.
  function effectiveRating(g, u, branch) {
    const o = officerOf(g, u);
    if (!o) return 0;
    const stars = o.ratings[branch] || 0;
    return (u.personal || branch === 'mobility') ? Math.min(stars, ratingCap(o.rank, branch)) : stars;
  }
  // Each combat-branch star contributes +5 flat base attack (1★ = +5, 6★ = +30).
  // The bonus is applied before Elite Force and formation multipliers, not as a percentage.
  function officerBaseAttack(g, u) {
    if (!u.cmd) return 0;
    return 5 * effectiveRating(g, u, branchOf(u.type));
  }
  // Honors are purely commemorative. Combat-branch ratings retain their own rules.
  function officerAttack() { return 1; }
  function officerDefense(g, u) {
    return u.cmd ? Math.max(0.5, 1 - 0.03 * (effectiveRating(g, u, branchOf(u.type)) - 3)) : 1;
  }
  function auraRange(a) {
    return fx(a).aura?.range || 1;
  }
  // Leila's Blue Geass protects herself and every same-side formation in the
  // two-hex command radius. The effect does not increase Steady morale to High.
  function leilaCommand(g, v) {
    return g.units.some(m => m.hp > 0 && m.side === v.side && !atSea(g, m) &&
      fx(m).steadfastCommand && dist(g, m, v) <= fx(m).steadfastCommand.range);
  }
  function applyLeilaMoraleFloor(g) {
    for (const v of g.units)
      if (v.hp > 0 && v.morale < 0 && leilaCommand(g, v)) v.morale = 0;
  }
  // Lowest morale a unit can be pushed to: steady for commanders with a floor; Fernando's calm stops confusion and
  // Ohgi's Organizer keeps adjacent units at Low or better.
  function moraleFloor(g, v) {
    if (leilaCommand(g, v)) return 0;
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
  const GENERIC_COSTS = [0, 100, 150, 200, 350, 500];
  const GENERIC_COSTS_LEGACY = [0, 100, 120, 150, 200, 260];
  const GENERIC_RESPEC_COST = 40;
  function genericCost(level = 0) { return GENERIC_COSTS[level + 1] ?? Infinity; }
  function legacyGenericInvestment(level) {
    return GENERIC_COSTS_LEGACY.slice(1, Math.min(5, level) + 1).reduce((a, b) => a + b, 0);
  }
  function genericRefundPreview(profile, k, id) {
    const o = roster(profile)[k], level = o?.generics?.[id] || 0;
    if (!level) return 0;
    const recorded = o.genericSpending?.[id];
    const invested = Number.isSafeInteger(recorded) && recorded >= 0 ?
      recorded : legacyGenericInvestment(level);
    return Math.round(invested * 0.9);
  }
  // Full-development planner. Future stars require Marshal rank; all three
  // generic skills require Legendary Commission. These are accounted for in
  // the grand total, without purchasing anything or mutating the roster.
  function commanderPlan(profile, k) {
    const o = roster(profile)[k];
    if (!o) return null;
    const promotions = PROMOTE_COST.slice(o.rank + 1).reduce((a, b) => a + b, 0);
    const stars = Object.fromEntries(Object.keys(BRANCH_NAMES).map(branch => [
      branch, STAR_COST.slice(Math.min(MAX_RATING, o.ratings[branch] || 0) + 1)
        .reduce((a, b) => a + b, 0),
    ]));
    const commissionIndex = COMMISSION_ORDER.indexOf(commissionOf(k, o));
    const commission = COMMISSION_ORDER.slice(commissionIndex + 1)
      .reduce((a, tier) => a + (COMMISSION_UPGRADE_PRICES[tier] || 0), 0);
    const skillLevels = Object.values(o.generics || {}).slice(0, 3);
    const skills = Array.from({ length: 3 }, (_, i) =>
      GENERIC_COSTS.slice((skillLevels[i] || 0) + 1).reduce((a, b) => a + b, 0));
    const starTotal = Object.values(stars).reduce((a, b) => a + b, 0);
    const skillsTotal = skills.reduce((a, b) => a + b, 0);
    return {
      promotions, stars, starTotal, commission, skills, skillsTotal,
      total: promotions + starTotal + commission + skillsTotal,
      highCommandSeat: o.rank < 8 && highCommandUsed(profile) >= highCommandCapacity(profile),
    };
  }
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
    const cost = genericCost(level);
    const recorded = o.genericSpending?.[id];
    const prior = Number.isSafeInteger(recorded) && recorded >= 0 ?
      recorded : legacyGenericInvestment(level);
    profile.tokens -= cost;
    (o.generics ||= {})[id] = level + 1;
    (o.genericSpending ||= {})[id] = prior + cost;
    return { ok: true, level: level + 1 };
  }
  function removeGenericReason(profile, k, id) {
    const why = ownedReason(profile, k);
    if (why) return why;
    if (!roster(profile)[k].generics?.[id]) return 'Skill is not equipped';
    // The fee is deducted from the refund, so the player does not need to
    // hold 40 tokens merely to reclaim a previously purchased skill.
    return tokenShort(profile, Math.max(0, GENERIC_RESPEC_COST - genericRefundPreview(profile, k, id)));
  }
  function removeGeneric(profile, k, id) {
    const why = removeGenericReason(profile, k, id);
    if (why) return { ok: false, reason: why };
    const officer = roster(profile)[k];
    const refund = genericRefundPreview(profile, k, id);
    profile.tokens += refund - GENERIC_RESPEC_COST;
    delete officer.generics[id];
    if (officer.genericSpending) delete officer.genericSpending[id];
    return { ok: true, refund, fee: GENERIC_RESPEC_COST, netRefund: refund - GENERIC_RESPEC_COST };
  }
  // No equipment actions: an award belongs permanently to the commander who earned it.
  function equipReason() { return 'Decorations are permanent service records, not equipment'; }
  function equipMedal() { return { ok: false, reason: equipReason() }; }
  function unequipMedal() { return { ok: false, reason: equipReason() }; }
  function award(g, side, id, reason, unit, key = reason) {
    if (!canEarnHonors(g)) return;
    if (side !== g.player || !MEDALS[id] || !unit?.personal || !unit?.cmd || !COMMANDERS[unit.cmd]) return;
    const events = (g.honorEvents ||= []);
    // Repeat achievements become citations across operations, not spammable
    // identical decorations in the same battle.
    if (events.some(e => e.id === id && e.commander === unit.cmd &&
        e.personal === !!unit.personal && (id !== 'star' || e.key === key))) return;
    events.push({ id, commander: unit.cmd, personal: !!unit.personal,
      reason, key, turn: g.turn });
    log(g, `${MEDALS[id].name}: ${COMMANDERS[unit.cmd].short} — ${reason}.`, side);
  }
  function finalizeHonors(g) {
    if (!canEarnHonors(g) || !g.over || g.honorsFinalized) return;
    g.honorsFinalized = true;
    if (g.over.winner !== g.player) return;
    const services = Object.values(g.honorService || {})
      .filter(s => s.personal && (s.combats || s.kills || s.cities || s.capitals || s.commanderDefeats));
    const operation = g.mode === 'campaign' ? (g.campaign?.id || 'Story Mode') :
      g.mode === 'scenario' ? (g.scenario?.title || g.scenario?.id || 'Scenario') :
        (g.era || 'Conquest');
    for (const s of services)
      award(g, g.player, 'campaign', `Participated in the victorious ${operation} operation`,
        { cmd: s.commander, personal: s.personal });
    const laurel = { hard: 'laurel_hard', challenge: 'laurel_challenge', elite: 'laurel_elite' }[g.difficulty];
    if (laurel && g.mode === 'conquest') {
      const best = services.filter(s => s.personal).sort((a, b) => {
        const score = s => 10*s.capitals + 5*s.commanderDefeats + 3*s.cities + Math.min(5,s.kills);
        return score(b)-score(a) || b.capitals-a.capitals ||
          b.commanderDefeats-a.commanderDefeats || b.kills-a.kills ||
          a.commander.localeCompare(b.commander);
      })[0];
      if (best) award(g, g.player, laurel, `Highest contribution to the ${g.difficulty} conquest victory`,
        { cmd: best.commander, personal: true });
    }
  }
  // Claim only after saving a unique operation ID. Recheck eligibility so old
  // Story Mode and standalone Scenario saves cannot claim pending decorations.
  function claimHonors(profile, g, claimId) {
    if (!canEarnHonors(g)) return { awarded: [] };
    roster(profile);
    if (!claimId || (profile.honorClaims ||= {})[claimId]) return { awarded: [] };
    const awarded = [];
    const operation = g.mode === 'campaign' ? (g.campaign?.id || 'Story Mode') :
      g.mode === 'scenario' ? (g.scenario?.id || 'Scenario') : (g.era || 'Conquest');
    const difficulty = g.difficulty || 'normal';
    for (const event of g.honorEvents || []) {
      if (!event.personal || !profile.roster[event.commander] || !MEDALS[event.id]) continue;
      const officer = profile.roster[event.commander];
      const honors = (officer.honors ||= []);
      let medal = honors.find(m => m.id === event.id);
      if (!medal) honors.push(medal = { id: event.id, citations: [] });
      medal.citations.push({ operation, difficulty, reason: event.reason,
        turn: event.turn, claimId });
      awarded.push(event);
    }
    // An old operation save can contain awards from the previous shared-inventory
    // system. Preserve them in the legacy cabinet without assigning recipients.
    for (const old of g.medalsEarned || []) {
      if (!MEDALS[old.id]) continue;
      const row = (profile.legacyHonors ||= []).find(m => m.id === old.id && m.formerOwner === null);
      if (row) row.count += 1;
      else profile.legacyHonors.push({ id: old.id, formerOwner: null, count: 1 });
    }
    profile.honorClaims[claimId] = true;
    return { awarded };
  }



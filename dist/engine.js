/* Knightmare Conquest: deterministic hex rules for a Code Geass world war. No UI or network dependencies. */
(function (root) {
  'use strict';
  // The data lives in engine/frames.js, commanders.js, research.js and world.js, loaded before this file by index.html
  // and required here under Node. engine/ai.js loads afterwards and adds the AI.
  if (typeof module !== 'undefined')
    for (const part of ['frames', 'commanders', 'generic-skills', 'research', 'world', 'conquests']) require(`./engine/${part}.js`);
  const {
    // frames.js
    FACTIONS,
    MAJORS,
    CLASSES,
    CLASS_ORDER,
    AMPHIBIOUS,
    AMPHIBIOUS_II,
    CARRIER,
    KNIGHTMARES,
    LINEUPS,
    ELITE_MAX_LEVEL,
    ELITE_UNLOCK_FRAGMENTS,
    ELITE_UPGRADE_FRAGMENTS,
    ELITE_LEVEL_SCALE,
    ELITE_FORCES,
    // commanders.js
    COMMANDERS,
    RANKS,
    RANK_HP,
    PROMOTE_COST,
    MEDALS,
    RATINGS,
    GENERIC_SKILLS,
    // research.js
    BRANCHES,
    BRANCH_NAMES,
    TECH_TIERS,
    TECH_TREE,
    // world.js
    RESOURCE_SITES,
    WORLD_ROWS,
    WORLD,
    CITY_DATA,
    CITY_TWEAKS,
    TERRITORY,
    ARMY_DATA,
    GARRISONS,
    PORT_DATA,
    NAVY_DATA,
    COASTAL_CITY_HEXES,
    COASTAL_PORT_HEXES,
    CONQUESTS,
  } = root.KnightmareData;
  const TYPES = Object.fromEntries(
    Object.entries(KNIGHTMARES).map(([id, k]) => {
      const c = CLASSES[k.cls];
      return [
        id,
        {
          ...c,
          ...k,
          id,
          short: k.name,
          code: k.name
            .replace(/[^A-Za-z ]/g, '')
            .split(' ')
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          desc: k.desc || `${c.rule}${k.float ? ' Integrated Float System: ignores terrain movement costs.' : ''}`,
        },
      ];
    }),
  );
  const ROSTER = {
    ...Object.fromEntries(
      MAJORS.map(side => [
        side,
        Object.fromEntries(
          Object.entries(KNIGHTMARES)
            .filter(([, k]) => k.side === side && !k.elite && !k.campaign && !k.naval && !k.worldOnly)
            .map(([id, k]) => [k.cls, id]),
        ),
      ]),
    ),
    ...LINEUPS,
  };
  // The 2018 U.F.N. has the Black Knights' complete field lineup, not
  // separate Chinese Federation or E.U. factory inventories. This reads the
  // scenario ID, so it also applies to saves made before the roster change.
  function ufnBlackKnights(g, side) {
    return g?.mode === 'conquest' && g.era === 'ufn2018' && side === 'cf';
  }
  function worldChina(g, side) {
    return g?.mode === 'conquest' && g.era === 'world' && side === 'cf';
  }
  function typeFor(side, cls, g = null) {
    if (ufnBlackKnights(g, side)) return ROSTER.bk[cls] || ROSTER.cf[cls];
    if (worldChina(g, side)) return LINEUPS.cf2017[cls];
    return g?.lineup?.[side]?.[cls] || ROSTER[side]?.[cls] || ROSTER.britannia[cls];
  }
  function lineupOf(g, side) {
    if (ufnBlackKnights(g, side)) return { ...ROSTER.bk };
    if (worldChina(g, side)) return { ...LINEUPS.cf2017 };
    return { ...(ROSTER[side] || {}), ...(g?.lineup?.[side] || {}) };
  }

  // ======== Elite Forces: persistent unique units ========
  const ELITE_TYPE_TO_ID = Object.fromEntries(Object.entries(ELITE_FORCES).map(([id, e]) => [e.type, id]));
  function eliteProfile(profile = {}) {
    profile.elites ||= {};
    for (const [id, e] of Object.entries(ELITE_FORCES)) {
      if (e.scenarioOnly) continue; // Mission ships never enter persistent HQ data.
      const rec = profile.elites[id] || {};
      profile.elites[id] = {
        level: Math.max(0, Math.min(ELITE_MAX_LEVEL, Number.isInteger(rec.level) ? rec.level : 0)),
        fragments: Math.max(0, Number.isFinite(rec.fragments) ? Math.floor(rec.fragments) : e.starter ? ELITE_UNLOCK_FRAGMENTS : 0),
      };
    }
    return profile.elites;
  }
  function eliteRecord(profile, id) {
    return ELITE_FORCES[id] && !ELITE_FORCES[id].scenarioOnly ? eliteProfile(profile)[id] : null;
  }
  function eliteScale(u) {
    if (!u?.elite) return ELITE_LEVEL_SCALE[1];
    return ELITE_LEVEL_SCALE[Math.max(1, Math.min(ELITE_MAX_LEVEL, u.eliteLevel || 1))];
  }
  function eliteFx(u) {
    const e = u?.elite && ELITE_FORCES[u.elite];
    if (!e || (u.eliteLevel || 1) < 3) return {};
    return (u.eliteLevel || 1) >= 5 ? { ...e.lv3, ...e.lv5 } : e.lv3;
  }
  function eliteStats(id, level = 1) {
    const e = ELITE_FORCES[id], t = e && TYPES[e.type];
    if (!e || !t) return null;
    level = Math.max(1, Math.min(ELITE_MAX_LEVEL, level | 0));
    const s = ELITE_LEVEL_SCALE[level],
      ef = level >= 5 ? { ...e.lv3, ...e.lv5 } : level >= 3 ? e.lv3 : {};
    return {
      hp: Math.round(t.hp * s.hp),
      attack: Math.round(t.attack * s.attack),
      armor: t.armor + s.armor,
      move: t.move + (ef.move || 0),
      min: t.min,
      max: t.max + (ef.range || 0),
    };
  }
  function eliteUpgradeReason(profile, id) {
    const e = ELITE_FORCES[id], rec = e && eliteRecord(profile, id);
    if (!rec) return 'Unknown Elite Force';
    if (rec.level >= ELITE_MAX_LEVEL) return 'Maximum Elite level reached';
    const next = rec.level + 1,
      cost = ELITE_UPGRADE_FRAGMENTS[next];
    return rec.fragments < cost
      ? `Need ${cost - rec.fragments} more ${TYPES[e.type].name} fragments`
      : null;
  }
  function upgradeElite(profile, id) {
    const why = eliteUpgradeReason(profile, id);
    if (why) return { ok: false, reason: why };
    const rec = eliteRecord(profile, id),
      next = rec.level + 1,
      cost = ELITE_UPGRADE_FRAGMENTS[next];
    rec.fragments -= cost;
    rec.level = next;
    return { ok: true, level: rec.level, fragments: rec.fragments, cost };
  }
  function grantEliteFragments(profile, awards = {}) {
    const records = eliteProfile(profile);
    for (const [id, amount] of Object.entries(awards))
      if (records[id] && amount > 0) records[id].fragments += Math.floor(amount);
    return records;
  }
  // Fragment drops are deterministic: first clears pay more; rarity controls acquisition speed rather than raw strength.
  function eliteVictoryReward(g, profile = {}) {
    if (!g || g.over?.winner !== g.player) return {};
    const first = !(profile.cleared || {})[operationKey(g)],
      base = first
        ? ({ normal: 12, hard: 18, challenge: 24 }[g.difficulty] || 12)
        : ({ normal: 5, hard: 8, challenge: 12 }[g.difficulty] || 5),
      rarity = { Rare: 1, Epic: 0.75, Legendary: 0.5 };
    return Object.fromEntries(
      Object.entries(ELITE_FORCES)
        .filter(([id, e]) => !e.scenarioOnly && eliteEligible(g, g.player, id))
        .map(([id, e]) => [id, Math.max(1, Math.round(base * (rarity[e.rarity] || 1)))])
    );
  }
  // ======== Commanders (recruitable officers): signature abilities are data, read by the combat rules ========
  const NOFX = {};
  // Calculated once: permanent personal stats and situational skills are displayed separately,
  // but the existing combat pipeline can read both without applying either twice.
  const COMMANDER_EFFECTS = Object.fromEntries(Object.entries(COMMANDERS).map(([id, c]) =>
    [id, { ...(c.stats || {}), ...c.fx }]));
  const COMMANDER_VERSION = 2;
  function commanderStatsText(k) {
    const st = COMMANDERS[k]?.stats || {}, out = [], pct = n => Math.round(n * 100);
    if (st.dmg) out.push(`Damage +${pct(st.dmg)}%${st.attackOnly ? ' on attacks' : ''}`);
    for (const [branch, n] of Object.entries(st.dmgBranch || {})) out.push(`${branch} damage +${pct(n)}%${st.attackOnly ? ' on attacks' : ''}`);
    if (st.crit) out.push(`Critical chance +${pct(st.crit)} percentage points`);
    if (st.critBonus) out.push(`Critical multiplier +${st.critBonus.toFixed(2)}`);
    if (st.pen) out.push(`Armor penetration +${pct(st.pen)} percentage points`);
    if (st.taken) out.push(`Damage taken −${pct(1 - st.taken)}%`);
    if (st.counter) out.push(`Counter-fire +${pct(st.counter)}%`);
    return out.join(' · ');
  }
  // Flat index: 'armor.guns' → node, with its branch and id.
  const TECH_NODES = Object.fromEntries(
    Object.entries(TECH_TREE).flatMap(([b, tree]) =>
      Object.entries(tree.nodes).map(([k, n]) => [
        `${b}.${k}`,
        { ...n, id: `${b}.${k}`, branch: b, max: n.values.length },
      ]),
    ),
  );
  function branchOf(type) {
    return BRANCHES[TYPES[type].branch];
  }
  // Research saved before the Naval branch existed moves to it.
  const LEGACY_RESEARCH = {
    'sakura.landing': 'naval.landing',
    'infantry.armor': 'infantry.urban',
    'artillery.armor': 'artillery.counterbattery',
  };
  function normalizeResearch(research = {}) {
    const out = { ...(research || {}) };
    for (const [old, now] of Object.entries(LEGACY_RESEARCH))
      if (out[old]) {
        out[now] = Math.max(out[now] || 0, out[old]);
        delete out[old];
      }
    for (const [id, level] of Object.entries(out))
      if (TECH_NODES[id]) out[id] = Math.max(0, Math.min(level | 0, TECH_NODES[id].max));
    return out;
  }
  function techLevel(g, side, id) {
    return g?.tech?.[side]?.[id] || 0;
  }
  function techValue(g, side, id) {
    const l = techLevel(g, side, id);
    return l ? TECH_NODES[id].values[l - 1] : 0;
  }
  // Branch-wide tech for a unit, e.g. unitTech(g, u, 'guns') reads 'armor.guns' for a Sutherland.
  function unitTech(g, u, k) {
    if (TYPES[u.type].naval) return 0;
    return techValue(g, u.side, `${branchOf(u.type)}.${k}`);
  }
  // Naval units use the Naval HP research instead of inheriting Armor/Artillery frames.
  function hullTech(g, u) {
    return unitTech(g, u, 'hull') + (TYPES[u.type].naval ? techValue(g, u.side, 'naval.hulls') : 0);
  }

  // ======== Commander development ========
  // Two kinds of commander. Scenario commanders come with the operation, sit on their units with fixed stats
  // (g.officers) and are never upgraded. Your commanders (profile.roster) are bought once, upgraded in HQ, kept
  // between operations and assignable in any operation, even beside the scenario's own version (u.personal).
  const HQ_RANK_CAP = PROMOTE_COST.length - 1; // Marshal; higher ranks are Elite-only AI bonuses.
  const STARTERS = { britannia: ['suzaku', 'cornelia'], eu: ['leila', 'akito'], cf: ['xingke', 'xianglin'] };
  function fx(u) {
    return u?.expSilenced ? NOFX : (u?.cmd && COMMANDER_EFFECTS[u.cmd]) || NOFX;
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
  // Each combat-branch star contributes +5 flat base attack (1★ = +5, 6★ = +30).
  // The bonus is applied before Elite Force and formation multipliers, not as a percentage.
  function officerBaseAttack(g, u) {
    if (!u.cmd) return 0;
    return 5 * (officerOf(g, u).ratings[branchOf(u.type)] || 3);
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
      m => m.hp > 0 && m.side === v.side && (fx(m).calm || (fx(m).organizer && m.id !== v.id) || (fx(m).discipline && !v.cmd && m.id !== v.id) || (fx(m).nationalUnity && dist(g,m,v)<=2)) && dist(g, m, v) <= 2,
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
    return o.rank >= HQ_RANK_CAP ? 'Highest rank reached' : tokenShort(profile, promoteCost(o));
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

  // ======== Reasons an order is unavailable (null when it is allowed) ========
  function shortfall(e, cost) {
    const need = [
      ['credits', 'credits'],
      ['industry', 'industry'],
      ['science', 'research'],
      ['sakuradite', 'Sakuradite'],
    ]
      .filter(([k]) => (cost[k] || 0) > (e?.[k] || 0))
      .map(([k, label]) => `${Math.ceil(cost[k] - (e?.[k] || 0))} more ${label}`);
    return need.length ? 'Need ' + need.join(' and ') : null;
  }
  function turnReason(g, side) {
    return g.over ? 'Operation over' : g.phase !== side ? 'Not your turn' : null;
  }
  function actedReason(u) {
    return u.morale <= -3
      ? 'Unit is confused'
      : u.attacked
        ? 'Already fired'
        : u.moved
          ? 'Already moved this turn'
          : null;
  }
  function nearFriendlyCity(g, u) {
    return g.stations.some(s => s.owner === u.side && dist(g, s, u) <= 1);
  }
  function repairReason(g, u) {
    if (!u) return 'Select a unit';
    if (u.hp <= 0) return 'Unit destroyed';
    return (
      turnReason(g, u.side) ||
      actedReason(u) ||
      (atSea(g, u) ? 'Embarked at sea' : null) ||
      (u.hp >= maxHP(u) ? 'Frame already intact' : null) ||
      (g.stations.some(s=>s.expSupplyBlocked?.owner===u.side&&dist(g,u,s)<=1)?'City supply lines are disrupted':null) ||
      (!nearFriendlyCity(g, u) ? 'No friendly city nearby' : null) ||
      shortfall(funds(g, u.side), { credits: repairCost(u, g) })
    );
  }
  function reinforceReason(g, u) {
    if (!u) return 'Select a unit';
    if (u.hp <= 0) return 'Unit destroyed';
    return (
      turnReason(g, u.side) ||
      (u.elite ? 'Elite Forces are single unique frames and cannot be reinforced' : null) ||
      (isShip(u) ? 'Warships cannot be reinforced' : null) ||
      (u.stack >= 3 ? 'Already at 3 frames' : null) ||
      (g.stations.some(s=>s.expSupplyBlocked?.owner===u.side&&dist(g,u,s)<=1)?'City supply lines are disrupted':null) ||
      actedReason(u) ||
      (atSea(g, u) ? 'Embarked at sea' : null) ||
      (!nearFriendlyCity(g, u) ? 'No friendly city nearby' : null) ||
      shortfall(funds(g, u.side), reinforceCost(u.type, g, u.side, u))
    );
  }
  // `vacating` lets the AI validate a replacement before moving the current garrison.
  // Every other recruitment rule still applies; the actual purchase requires an empty hex.
  function buyReason(g, s, type, stack = 1, vacating = null) {
    const t = TYPES[type];
    if (!t || !s) return 'Unavailable';
    const producer = t.naval ? (s.portOwner || s.owner) : s.owner;
    return (
      (g.over ? 'Operation over' : producer !== g.phase ? (t.naval ? 'Not your port' : 'Not your city') : null) ||
      (t.elite ? 'Deploy Elite Forces from the Elite Forces factory tab' : null) ||
      (eliteCampaign(g) && !t.naval ? 'Elite Campaign factories produce only Elite Forces' : null) ||
      (eliteAIProduction(g) && producer !== g.player && (eliteScenario(g) ? t.naval !== 'ship' : !t.naval) ? 'Rival factories can only produce Elite Forces' : null) ||
      (!(g.buildable?.[producer] || [...Object.values(lineupOf(g, producer)), ...navalTypes(g, producer)]).includes(type)
        ? 'Not built by this faction'
        : null) ||
      (!t.naval ? cityBusyReason(g, s) : null) ||
      (s.expSupplyBlocked?.owner===s.owner?'City supply lines are disrupted':null) ||
      (t.naval && (s.portLevel || 0) < t.port ? `Requires a level-${t.port} port` : null) ||
      (!t.naval && s.tier < t.tier ? `Requires factory level ${t.tier}` : null) ||
      (!Number.isInteger(stack) || stack < 1 || stack > 3 ? 'Choose 1–3 frames' : null) ||
      (t.naval === 'ship' && stack !== 1 ? 'Warships are built one at a time' : null) ||
      // The city factory and its port are separate yards: each launches one unit a turn.
      (t.naval
        ? s.portProducedTurn === g.turn ? 'This port already launched a unit this turn' : null
        : s.producedTurn === g.turn ? 'Already built here this turn' : null) ||
      (!recruitOptions(g, s, producer, type).length && !(vacating && !t.naval && unitAt(g, s) === vacating)
        ? (t.naval ? 'A unit is on the port' : 'A unit is on the city') : null) ||
      shortfall(funds(g, producer), TYPES[type].naval ? price(type,stack,g,producer) : decreePrice(price(type,stack,g,producer),s))
    );
  }
  function decreePrice(cost,s){return s?.expDecree?{...cost,credits:Math.ceil((cost.credits||0)*.7),industry:Math.ceil((cost.industry||0)*.7)}:cost;}
  function buildReason(g, s, kind) {
    if (!s || !BUILDINGS[kind]) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (buildingLevel(s, kind) >= 3 ? 'Maximum level' : null) ||
      (s.expSupplyBlocked?.owner===s.owner?'City supply lines are disrupted':null) ||
      (kind === 'lab' && buildingLevel(s, kind) === 2 && g.turn < fleijaLabTurn(g)
        ? `Research lab level 3 unlocks on turn ${fleijaLabTurn(g)}`
        : null) ||
      (kind === 'refinery' && !depositOf(g, s) ? 'No Sakuradite deposit here' : null) ||
      (kind === 'port' && g.mode === 'campaign' ? 'No ports in story missions' : null) ||
      (kind === 'port' && !portSite(g, s) ? 'Not a coastal city' : null) ||
      (kind === 'port' && s.portLevel && s.portOwner !== s.owner ? 'An enemy fleet holds the port' : null) ||
      cityBusyReason(g, s) ||
      shortfall(funds(g, s.owner), decreePrice(buildCost(s, kind),s))
    );
  }
  // HQ research works on the persistent profile: { tokens, wins, research: { 'armor.guns': 2, ... } }.
  function researchReason(profile, id) {
    const n = TECH_NODES[id];
    if (!n) return 'Unavailable';
    const research = normalizeResearch(profile?.research),
      l = research[id] || 0;
    if (l >= n.max) return 'Fully researched';
    const tier = n.tiers[l],
      wins = profile?.wins || 0;
    if (wins < TECH_TIERS[tier])
      return `Tier ${tier}: win ${TECH_TIERS[tier] - wins} more operation${TECH_TIERS[tier] - wins > 1 ? 's' : ''}`;
    if (n.req) {
      const [k, need] = n.req,
        rid = `${n.branch}.${k}`;
      if ((research[rid] || 0) < need) return `Requires ${TECH_NODES[rid].name} ${ROMAN[need]}`;
    }
    const cost = researchCost(id, l),
      have = profile?.tokens || 0;
    return cost > have ? `Need ${cost - have} more command tokens` : null;
  }
  // Only your own commanders can be assigned; the operation's commanders stay on the units they came with.
  function assignReason(g, u, k) {
    const a = COMMANDERS[k];
    if (!a) return 'Unknown commander';
    if (u && u.hp <= 0) return 'Unit destroyed';
    if (u && isShip(u)) return 'Carrier-Battleships cannot have commanders';
    if (!g.roster?.[k]) return `Not one of your commanders: recruit in HQ for ${recruitPrice(k)} command tokens`;
    const busy = allUnits(g).find(v => v.hp > 0 && v.personal && v.cmd === k);
    if (busy) return `Commanding ${TYPES[busy.type].short}`;
    if (!u) return 'Select one of your units first';
    return (
      turnReason(g, u.side) ||
      (!serves(k, u.side, g) ? 'Serves another faction' : null) ||
      (u.cmd ? 'Unit already has a commander' : null) ||
      shortfall(funds(g, u.side), { credits: a.cost })
    );
  }
  function feintReason(g, u) {
    const action = COMMANDERS[u?.cmd]?.action;
    if (!u || !action) return 'This commander has no command action';
    const why = turnReason(g, u.side) || (u.hp <= 0 ? 'Unit destroyed' : atSea(g, u) ? 'Embarked units cannot use command actions' : u.morale <= -3 ? 'Unit is confused' : null)
      || (u.feintCD > 0 ? `Ready in ${u.feintCD} turns` : null);
    if (why) return why;
    if (action.kind === 'cleanse') return actionTargets(g, u).some(v => v.morale < 0 || !v.moraleWard) ? null : 'Nearby allies are already protected';
    if (action.kind === 'special') return actionTargets(g,u).length ? null : 'No eligible targets in range';
    return actionTargets(g, u).length ? null : ['designate', 'stratagem'].includes(action.kind)
      ? 'No enemy within 2 hexes' : action.kind === 'command' ? 'No friendly unit within 2 hexes has acted'
      : action.kind === 'withdraw' ? 'No friendly unit within 2 hexes has fired' : 'No enemy within 2 hexes';
  }
  // Bring the profile into an operation: a copy of your commanders (for assignment and personal units) and research.
  function applyProfile(g, profile = {}) {
    applyRoster(g, profile);
    applyElites(g, profile);
    return applyTech(g, profile?.research);
  }
  function applyElites(g, profile = {}) {
    const records = eliteProfile(profile);
    g.eliteDeployed ||= {};
    // Kept on the game so Elite Forces that join mid-operation (campaign spawns and upgrades) use the same levels.
    g.eliteLevels = Object.fromEntries(Object.entries(records).filter(([, r]) => r?.level).map(([id, r]) => [id, r.level]));
    for (const u of allUnits(g)) {
      // Only your own Elite Forces use your HQ levels; mission aces on other sides keep the level they were given.
      if (!u.elite || u.side !== g.player || eliteCampaign(g)) continue;
      const old = maxHP(u),
        rec = records[u.elite];
      if (rec?.level) u.eliteLevel = rec.level;
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    return g;
  }
  // Refresh your commanders inside an operation, e.g. after an HQ promotion; personal units keep their damage.
  function applyRoster(g, profile = {}) {
    g.roster = Object.fromEntries(Object.entries(roster(profile)).map(([k, rec]) => [k, cleanOfficer(k, rec)]));
    for (const u of allUnits(g)) {
      if (!u.cmd) continue;
      const old = maxHP(u);
      u.cmdRank = officerOf(g, u).rank;
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    return g;
  }
  // Load HQ research into the player's side: frame bonuses keep each unit's damage, city defenses follow.
  function applyTech(g, research = {}) {
    g.tech ||= {};
    g.tech[g.player] = Object.fromEntries(
      Object.entries(normalizeResearch(research))
        .filter(([id, l]) => TECH_NODES[id] && Number.isInteger(l) && l > 0)
        .map(([id, l]) => [id, Math.min(l, TECH_NODES[id].max)]),
    );
    for (const u of allUnits(g)) {
      if (u.side !== g.player) continue;
      const old = maxHP(u);
      u.hpTech = hullTech(g, u);
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    g.stations.forEach(s => fortify(g, s));
    return g;
  }
  // Fortification research raises the defenses of cities its owner holds.
  function fortify(g, s) {
    const bonus = techValue(g, s.owner, 'cities.fort'),
      old = s.fortBonus || 0;
    if (bonus === old) return;
    s.maxShield += bonus - old;
    s.shield = clamp(s.shield + Math.max(0, bonus - old), 0, s.maxShield);
    s.fortBonus = bonus;
  }
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
  function researchCost(id, level = 0) {
    return TECH_NODES[id]?.costs[level] ?? Infinity;
  }
  function research(profile, id) {
    const why = researchReason(profile, id);
    if (why) return { ok: false, reason: why };
    profile.research = normalizeResearch(profile.research);
    const l = profile.research?.[id] || 0;
    profile.tokens -= researchCost(id, l);
    (profile.research ||= {})[id] = l + 1;
    return { ok: true, level: l + 1 };
  }
  // Command tokens are paid only for the first victory with each faction at each difficulty (Hard ×1.5,
  // Challenge ×2); the first victory ever earns a bonus. Banked research converts 5 : 1, up to 300 tokens.
  const TOKEN_REWARD = { victory: 250, conquest: 150, first: 150, research: 5, researchCap: 300 };
  function operationKey(g) {
    return `conquest:${g.era || 'world'}:${g.player || 'britannia'}:${DIFFICULTIES[g.difficulty] ? g.difficulty : 'normal'}`;
  }
  function missionReward(g, wins = 0, cleared = {}) {
    if (!g.over || g.over.winner !== g.player) return { total: 0, parts: [] };
    if (cleared[operationKey(g)]) return { total: 0, parts: [], repeat: true };
    const parts = [
      ['Victory', TOKEN_REWARD.victory],
      ['World conquest', TOKEN_REWARD.conquest],
    ];
    const banked = Math.min(
      TOKEN_REWARD.researchCap,
      Math.floor((funds(g, g.player)?.science || 0) / TOKEN_REWARD.research),
    );
    if (banked) parts.push(['Banked research', banked]);
    const scale = DIFFICULTIES[g.difficulty]?.tokens || 1;
    if (scale !== 1) parts.push([`${DIFFICULTIES[g.difficulty].name} ×${scale}`, 0]);
    let total = Math.round(parts.reduce((a, [, v]) => a + v, 0) * scale);
    if (!wins) {
      parts.push(['First victory', TOKEN_REWARD.first]);
      total += TOKEN_REWARD.first;
    }
    return { total, parts };
  }

  // ======== Hex geometry: odd-r offset rows; world maps wrap east to west ========
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1],
  ];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const axial = p => ({ q: p.c - Math.floor(p.r / 2), r: p.r });
  function hexDistance(a, b) {
    a = axial(a);
    b = axial(b);
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  }
  // Pass g for wrapped maps: the shortest way round the world counts.
  function distance(a, b, g = null) {
    const d = hexDistance(a, b);
    if (!g?.wrap) return d;
    const W = g.cols;
    return Math.min(d, hexDistance(a, { c: b.c + W, r: b.r }), hexDistance(a, { c: b.c - W, r: b.r }));
  }
  const dist = (g, a, b) => distance(a, b, g);
  const key = p => p.c + ',' + p.r;
  function tile(g, c, r) {
    if (r < 0 || r >= g.rows) return null;
    if (g.wrap) c = ((c % g.cols) + g.cols) % g.cols;
    else if (c < 0 || c >= g.cols) return null;
    return g.tiles[r * g.cols + c] || null;
  }
  function adjacent(g, p) {
    const a = axial(p);
    return DIRS.map(d => {
      const r = a.r + d[1],
        c = a.q + d[0] + Math.floor(r / 2);
      return tile(g, c, r);
    }).filter(Boolean);
  }
  // Every tile within n hexes of p (including p).
  function within(g, p, n) {
    const out = [],
      a = axial(p);
    for (let dq = -n; dq <= n; dq++)
      for (let dr = Math.max(-n, -dq - n); dr <= Math.min(n, -dq + n); dr++) {
        const r = a.r + dr,
          c = a.q + dq + Math.floor(r / 2),
          t = tile(g, c, r);
        if (t) out.push(t);
      }
    return out;
  }
  // Occupancy indexes: rebuilt when the unit list grows or a stale entry is found; move() keeps them current.
  const unitIndex = new WeakMap(),
    cityIndex = new WeakMap();
  function indexUnits(g) {
    const m = new Map();
    for (const u of g.units) if (u.hp > 0) m.set(key(u), u);
    const idx = { len: g.units.length, map: m };
    unitIndex.set(g.units, idx);
    return idx;
  }
  function unitAt(g, p) {
    let idx = unitIndex.get(g.units);
    if (!idx || idx.len !== g.units.length) idx = indexUnits(g);
    const k = key(p);
    let u = idx.map.get(k);
    if (u && (u.hp <= 0 || u.c !== p.c || u.r !== p.r)) u = indexUnits(g).map.get(k);
    return u || null;
  }
  function reindex(g, u, from) {
    const idx = unitIndex.get(g.units);
    if (!idx) return;
    if (from && idx.map.get(key(from)) === u) idx.map.delete(key(from));
    if (u.hp > 0) idx.map.set(key(u), u);
  }
  function stationAt(g, p) {
    let idx = cityIndex.get(g.stations);
    if (!idx || idx.len !== g.stations.length) {
      idx = { len: g.stations.length, map: new Map(g.stations.map(s => [key(s), s])) };
      cityIndex.set(g.stations, idx);
    }
    return idx.map.get(key(p)) || null;
  }
  function random(g) {
    g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
    return g.seed / 4294967296;
  }
  function log(g, text, side) {
    g.log.unshift({ turn: g.turn, text, side: side || g.phase });
    g.log = g.log.slice(0, 40);
  }
  function funds(g, side) {
    return g.economy[side];
  }
  function powersOf(g) { return g?.mode === 'conquest' && Array.isArray(g.majors) ? g.majors : MAJORS; }
  function isMajor(g, side) { return powersOf(g).includes(side); }
  function hostilePowers(g, side) { return powersOf(g).filter(other => other !== side && foe(g, other, side)); }
  function alive(g, side) {
    return ((g?.mode === 'campaign' || g?.mode === 'scenario') ? (g.order || []).includes(side) : powersOf(g).includes(side)) && !g.fallen?.[side];
  }
  // Whether two sides fight each other. Campaign missions may ally sides into teams (g.teams); Conquest has none.
  function foe(g, a, b) {
    return a !== b && !(g?.teams?.[a] && g.teams[a] === g.teams[b]);
  }
  const isFoe = foe;
  // Optional rule hooks, set by the campaign module (dist/campaign.js): turn(g, side), capture(g, city, unit),
  // kill(g, victim, attacker), decide(g), objective(g), title(g).
  const hooks = {};

  // ======== Terrain ========
  const TERRAIN = {
    sea: { name: 'Ocean', desc: 'Units embark as transports: they cannot attack and take 50% extra damage.' },
    // Scenario-only blue background water. Not a playable hex: no warship,
    // transport, amphibious landing or movement can enter this area.
    offmap: { name: 'Open ocean (off map)', blocked: true, desc: 'Outside the active Japan naval theatre.' },
    // Shoreline hexes that are part land, part water: land for land units, open water for warships (one unit per hex).
    coast: {
      name: 'Coast',
      cost: 1,
      desc: 'Movement cost 1. Shore and shallows: land units stand and fight here as on land, and warships can sail through.',
    },
    plains: { name: 'Plains', cost: 1, desc: 'Movement cost 1. No terrain defense or attrition.' },
    forest: { name: 'Forest', cost: 2, cover: 0.15, desc: 'Movement cost 2. Incoming damage reduced by 15%.' },
    mountain: { name: 'Mountains', cost: 2, cover: 0.25, desc: 'Movement cost 2. Incoming damage reduced by 25%.' },
    desert: {
      name: 'Desert',
      cost: 1,
      attrition: 0.03,
      desc: 'Movement cost 1. Heat strains Energy Fillers: units lose 3% of their frame each turn they start here.',
    },
    snow: {
      name: 'Tundra',
      cost: 2,
      attrition: 0.025,
      desc: 'Movement cost 2. Units lose 2.5% of their frame each turn they start here.',
    },
    peak: { name: 'Impassable peaks', blocked: true, desc: 'The high Himalaya and the Greenland ice cap: impassable.' },
    // City ruins appear on campaign maps only.
    urban: { name: 'City ruins', cost: 1, cover: 0.2, desc: 'Movement cost 1. Buildings and rubble cut incoming damage by 20%.' },
    crater: {
      name: 'F.L.E.I.J.A. crater',
      cost: 2,
      desc: 'Movement cost 2. A F.L.E.I.J.A. warhead erased everything here and glassed the ground pink and white.',
    },
  };
  const TERRAIN_CODES = {
    '.': 'sea',
    p: 'plains',
    f: 'forest',
    m: 'mountain',
    d: 'desert',
    s: 'snow',
    x: 'peak',
    u: 'urban',
    c: 'crater',
    w: 'coast',
  };
  const CONQUEST_MOVE_BONUS = 2,
    SEA_MOVE = { conquest: 5, campaign: 5 },
    CARRIER_ESCORT_SEA = 10; // a Portman that starts next to a friendly Carrier-Battleship swims this far
  // Warships and amphibious frames, built only in Conquest.
  const NAVAL = {
    britannia: { amphibious: 'portman', amphibious2: 'portman_ii', carrier: 'carrier_battleship' },
    eu: { amphibious: 'panzer_frosch', amphibious2: 'panzer_frosch_ii', carrier: 'eu_carrier' },
    cf: { amphibious: 'shui_gun_ru', amphibious2: 'shui_gun_ru_ii', carrier: 'cf_carrier' },
    eb: { amphibious: 'portman', amphibious2: 'portman_ii', carrier: 'carrier_battleship' },
    bk: { amphibious: 'bk_amphibious', amphibious2: 'bk_amphibious_ii', carrier: 'bk_carrier' },
  };
  // The 2018 U.F.N. army uses Black Knights equipment, including its naval roster.
  const navalRoster = (g, side) => ufnBlackKnights(g, side) ? NAVAL.bk : NAVAL[side];
  const navalTypes = (g, side) => g?.mode === 'campaign' ? [] : Object.values(navalRoster(g, side) || {});
  const isShip = u => TYPES[u?.type]?.naval === 'ship';
  // Ports: a city building on one sea hex beside the city (repair: PORT.repair by level).
  const PORT = { repair: [0, 0.1, 0.2, 0.3] };
  function portSite(g, s) {
    if (s.portAt) return tile(g, s.portAt.c, s.portAt.r);
    // Baseline starting ports must stay on their exact original hexes.
    // Non-starting ports retain the normal neighbour-selection rules.
    const anchored = g.mode === 'conquest' ? COASTAL_PORT_HEXES[s.name] : null;
    if (anchored) {
      const fixed = tile(g, anchored[0], anchored[1]);
      if (!fixed || !isSea(fixed) || !adjacent(g, s).includes(fixed) ||
          g.stations.some(o => o !== s && o.portAt && key(o.portAt) === key(fixed)))
        throw new Error('Unavailable fixed starting port for ' + s.name);
      return fixed;
    }
    const taken = new Set(g.stations.filter(o => o.portAt).map(o => key(o.portAt)));
    return (
      adjacent(g, s)
        .filter(t => isSea(t) && !taken.has(key(t)))
        .sort((a, b) => adjacent(g, b).filter(navigable).length - adjacent(g, a).filter(navigable).length || a.r - b.r || a.c - b.c)[0] ||
      null
    );
  }
  function openPort(g, s, level) {
    const t = portSite(g, s);
    if (!t) return;
    s.portAt = { c: t.c, r: t.r };
    s.portLevel = level;
    s.portOwner = s.owner;
  }
  const portAtHex = (g, p) => g.stations.find(s => s.portLevel && s.portAt && s.portAt.c === p.c && s.portAt.r === p.r) || null;
  const hasPort3 = (g, side) => g.stations.some(s => (s.portLevel || 0) >= 3 && s.portOwner === side);
  function carrierCapacity(g, ship) {
    if (!isShip(ship)) return 0;
    return TYPES[ship.type].capacity + (techLevel(g, ship.side, 'naval.hangars') ? 1 : 0);
  }
  const canBoard = (g, ship) => isShip(ship) && ship.hp > 0 && (ship.cargo?.length || 0) < carrierCapacity(g, ship);
  // Every unit on the map plus the Knightmares carried inside Carrier-Battleships.
  const allUnits = g => g.units.flatMap(u => (u.cargo?.length ? [u, ...u.cargo] : [u]));
  // Single source of truth for visual geography invalidation. Only actual tile changes advance it.
  function setTileOwner(g, t, owner) {
    if (t.owner === owner) return;
    t.owner = owner;
    g.mapRevision = (g.mapRevision || 0) + 1;
  }
  function setTileTerrain(g, t, terrain) {
    if (t.terrain === terrain) return;
    t.terrain = terrain;
    g.mapRevision = (g.mapRevision || 0) + 1;
  }
  const isSea = t => t?.terrain === 'sea';
  // Coast hexes count as land for land units (isSea is false) and as water for warships.
  const isCoast = t => t?.terrain === 'coast';
  const navigable = t => isSea(t) || isCoast(t);
  // Embarked as a transport: a land unit on a sea hex. Warships and amphibious frames fight normally at sea.
  function atSea(g, u) {
    return isSea(tile(g, u.c, u.r)) && !TYPES[u.type].naval;
  }
  function amphibiousSea(g, u) {
    const escort = adjacent(g, u).some(n => {
      const v = unitAt(g, n);
      return v && v.side === u.side && isShip(v);
    });
    const sea = TYPES[u.type].seaMove;
    return escort ? Math.max(CARRIER_ESCORT_SEA, sea) : sea;
  }
  // Embarked units take extra damage; Landing Craft halves the penalty.
  function seaPenalty(g, side) {
    return techLevel(g, side, 'naval.landing') ? 0.25 : 0.5;
  }
  function seaMove(g, u) {
    const base = g?.mode === 'campaign' ? SEA_MOVE.campaign : SEA_MOVE.conquest;
    return base;
  }

  // A commander's rank scales unit HP from 120% (Second Lieutenant) to 200% (Marshal).
  function maxHP(u) {
    const es = eliteScale(u);
    return Math.round(
      TYPES[u.type].hp *
        es.hp *
        (1 + 0.7 * (u.stack - 1)) *
        (u.cmdRank == null ? 1 : RANK_HP[u.cmdRank] || 1) *
        (1 + (u.hpTech || 0)),
    );
  }
  // Version 3 added Sakuradite. Older saves were all made on the old 100 × 42 map and are rejected.
  const RULES_VERSION = 3;
  // 2026 coastline alignment: retain old saves while matching the revised
  // new-game map. Occupied legacy hexes stay playable until a new conquest;
  // never strand a unit or move a player-built site during migration.
  const COASTAL_SEA_FIXES = [[13, 9], [168, 9], [50, 10], [49, 12],
    [81, 32], [113, 51], [157, 44], [49, 31],
    [0, 6], [127, 0], [158, 1], [55, 8], [56, 8], [156, 63],
    [141, 44],  // Malacca: only unoccupied legacy land becomes water
    [111, 36]];  // Bab-el-Mandeb
  // The Caspian was the sole isolated sea component. Legacy saves migrate
  // it to traversable land, preserving occupied old tiles and player-built sites.
  // Red Sea coast hexes (Egypt 107,27; Yemen 111,34 and 111,35) became land the same way.
  const CASPIAN_LAND_FIXES = [[113,17],[114,17],[114,18],[115,17],[115,18],[114,19],[115,19],[115,20],[116,20],[115,21],[114,21],
    [107,27], [111,34], [111,35]];
  const TSUGARU_STRAIT = [160, 19];
  function coastalTileOccupied(g, c, r) {
    return g.units.some(u => u.hp > 0 && u.c === c && u.r === r) ||
      g.stations?.some(s => (s.c === c && s.r === r) ||
        (s.portAt?.c === c && s.portAt?.r === r)) ||
      g.sites?.some(site => site.c === c && site.r === r);
  }
  function migrateCoastalTerrain(g) {
    for (const [c, r] of COASTAL_SEA_FIXES) {
      // Historical sea fixes must not undo the newly approved 20/80 coastline.
      if (WORLD_ROWS[r]?.[c] !== '.') continue;
      const t = g.tiles[r * g.cols + c];
      if (!t || t.terrain === 'sea') continue;
      if (g.units.some(u => u.hp > 0 && u.c === c && u.r === r)) continue;
      if (g.stations?.some(s => (s.c === c && s.r === r) ||
        (s.portAt?.c === c && s.portAt?.r === r))) continue;
      if (g.sites?.some(site => site.c === c && site.r === r)) continue;
      setTileTerrain(g, t, 'sea');
      setTileOwner(g, t, null);
    }
    const [tc, tr] = TSUGARU_STRAIT;
    const strait = g.tiles[tr * g.cols + tc];
    if (WORLD_ROWS[tr]?.[tc] === '.' && strait && strait.terrain !== 'sea' && !coastalTileOccupied(g, tc, tr)) {
      setTileTerrain(g, strait, 'sea');
      setTileOwner(g, strait, null);
    }
    const filled = [];
    for (const [c, r] of CASPIAN_LAND_FIXES) {
      if ('.w'.includes(WORLD_ROWS[r]?.[c])) continue;
      const t = g.tiles[r * g.cols + c];
      if (!t || t.terrain !== 'sea' || coastalTileOccupied(g, c, r)) continue;
      setTileTerrain(g, t, 'plains');
      setTileOwner(g, t, null);
      filled.push(t);
    }
    // Coast hexes (part land, part water) arrived after older saves were made. A sea hex turned coast
    // inherits a neighbouring owner; craters and other later terrain changes are kept.
    const KEEP = new Set(['coast', 'crater', 'urban', 'peak']);
    for (const t of g.tiles) {
      if (WORLD_ROWS[t.r]?.[t.c] !== 'w' || KEEP.has(t.terrain)) continue;
      const wasSea = t.terrain === 'sea';
      setTileTerrain(g, t, 'coast');
      if (wasSea) filled.push(t);
    }
    // Carry over the saved political situation rather than assigning a
    // new game faction. Progress from neighbouring owned land inward.
    for (let pass = 0; pass < CASPIAN_LAND_FIXES.length; pass++) {
      let changed = false;
      for (const t of filled) {
        if (t.owner) continue;
        const n = adjacent(g, t).find(n => n.terrain !== 'sea' && n.owner);
        if (n) { setTileOwner(g, t, n.owner); changed = true; }
      }
      if (!changed) break;
    }
    // Newfoundland was restored as land by the previous correction batch.
    const t = g.tiles[15 * g.cols + 61];
    if (t && !'.w'.includes(WORLD_ROWS[15]?.[61]) && t.terrain === 'sea' &&
        !g.units.some(u => u.hp > 0 && u.c === 61 && u.r === 15)) {
      setTileTerrain(g, t, 'plains');
    }
  }
  // Christchurch owns unclaimed South Island land in new conquests.
  // Older saves without Christchurch still attach those tiles to Auckland.
  // Never overwrite tiles already owned or conquered.
  const NZ_SOUTH_ISLAND = [
    [175, 68], [176, 68], [173, 69], [174, 69],
    [175, 69], [173, 70], [174, 70], [175, 70],
  ];
  function attachUnclaimedNewZealand(g) {
    const anchor = g.stations.find(s => s.name === 'Christchurch') ||
      g.stations.find(s => s.name === 'Auckland');
    if (!anchor?.owner) return;
    for (const [c, r] of NZ_SOUTH_ISLAND) {
      const t = tile(g, c, r);
      // Never overwrite territory that changed hands during an existing game.
      if (!t || isSea(t) || t.owner || t.provinceCity != null) continue;
      setTileOwner(g, t, anchor.owner);
      t.provinceCity = anchor.id;
    }
  }
  // Each painted conquest land hex is permanently attached to one city. Existing ownership
  // determines its initial faction; the closest city of that faction becomes its province
  // center. This keeps historical borders and Indonesia's intentional overrides intact.
  // City IDs (unlike array indices) survive captures and F.L.E.I.J.A. removals.
  // A coarse navigable coastline can touch the opposite bank of a real sea.
  // Province and starting-territory floods must not walk across that contact.
  // This changes POLITICAL adjacency only; movement/naval terrain is unchanged.
  const SAKHALIN_WORLD_HEXES = new Set(['161,12','160,13','161,14','160,15','161,16']);
  function isSakhalinWorldHex(t) {
    return !!t && SAKHALIN_WORLD_HEXES.has(t.c + ',' + t.r);
  }
  function persianGulfPoliticalBank(t) {
    const lon = WORLD.lon0 + WORLD.dlon * (t.c + 0.5 * (t.r & 1));
    const lat = WORLD.lat0 - WORLD.dlat * t.r;
    const axis = [[47,30.4],[49,29.1],[51,27.8],[53.5,26.7],[56,25.7],[58,25.2]];
    if (lon < 47 || lon > 58 || lat < 23 || lat > 32) return 0;
    for (let i = 1; i < axis.length; i++) {
      if (lon > axis[i][0]) continue;
      const a = axis[i - 1], b = axis[i];
      const middle = a[1] + (lon - a[0]) * (b[1] - a[1]) / (b[0] - a[0]);
      return Math.abs(lat - middle) <= 3.25 ? (lat < middle ? -1 : 1) : 0;
    }
    return 0;
  }
  function crossesWorldPoliticalStrait(g, a, b) {
    if (!a || !b || g.cols !== WORLD.cols || g.rows !== WORLD.rows) return false;
    // The Soya/La Perouse Strait separates Russian Sakhalin from Area 11.
    if (isSakhalinWorldHex(a) !== isSakhalinWorldHex(b) &&
        (isSakhalinWorldHex(a) || isSakhalinWorldHex(b))) return true;
    // Gibraltar (87,22) is on Iberia; coastal tiles (86,23) and (87,23)
    // are on Morocco. The coarse hex grid makes them adjacent across water.
    // Treat that contact as a strait for province/starting ownership only:
    // military movement and naval passage remain governed by terrain.
    const gibraltar = t => t.c === 87 && t.r === 22;
    const morocco = t => t.r === 23 && (t.c === 86 || t.c === 87);
    if ((gibraltar(a) && morocco(b)) || (gibraltar(b) && morocco(a))) return true;
    const aa = persianGulfPoliticalBank(a), bb = persianGulfPoliticalBank(b);
    return aa !== 0 && bb !== 0 && aa !== bb;
  }
  function assignCityProvinces(g) {
    // City influence follows same-faction playable LAND, not a direct line
    // through oceans. This also repairs detached provinces in older saves.
    const components = new Int32Array(g.tiles.length);
    components.fill(-1);
    let nextComponent = 0;
    for (let i = 0; i < g.tiles.length; i++) {
      const source = g.tiles[i];
      if (isSea(source) || !source.owner || components[i] >= 0) continue;
      const queue = [source], owner = source.owner;
      components[i] = nextComponent;
      for (let head = 0; head < queue.length; head++)
        for (const n of adjacent(g, queue[head])) {
          const k = n.r * g.cols + n.c;
          if (isSea(n) || n.owner !== owner || components[k] >= 0 ||
              crossesWorldPoliticalStrait(g, queue[head], n)) continue;
          components[k] = nextComponent;
          queue.push(n);
        }
      nextComponent++;
    }
    const byOwner = new Map(), byComponent = new Map();
    const cityById = new Map(g.stations.map(s => [s.id, s]));
    for (const s of g.stations) {
      if (!byOwner.has(s.owner)) byOwner.set(s.owner, []);
      byOwner.get(s.owner).push(s);
      const component = components[s.r * g.cols + s.c];
      if (component < 0) continue;
      if (!byComponent.has(component)) byComponent.set(component, []);
      byComponent.get(component).push(s);
    }
    for (const t of g.tiles) {
      if (isSea(t) || !t.owner) {
        delete t.provinceCity;
        continue;
      }
      const component = components[t.r * g.cols + t.c];
      const local = byComponent.get(component);
      const cities = local?.length ? local : (byOwner.get(t.owner) || []);
      const previous = cityById.get(t.provinceCity);
      // Capture retains the fixed province unless it points across water to
      // another landmass which has its own city of the same owner.
      if (previous && previous.owner === t.owner &&
          (!local?.length || components[previous.r * g.cols + previous.c] === component))
        continue;
      let nearestCity = null, nearestDistance = Infinity;
      for (const s of cities) {
        const d = dist(g, s, t);
        if (d < nearestDistance || (d === nearestDistance &&
            (nearestCity === null || s.id < nearestCity.id))) {
          nearestCity = s;
          nearestDistance = d;
        }
      }
      if (nearestCity) t.provinceCity = nearestCity.id;
      else delete t.provinceCity;
    }
  }


  // Event-driven War Report. Aggregates survive when detailed event history is capped.
  const WAR_EVENT_LIMIT=2500;
  function warSides(g){return [...new Set([...(g.order||[]),...(g.majors||[]),
    ...g.stations.map(s=>s.owner),...g.units.map(u=>u.side)])].filter(s=>s&&s!=='neutral');}
  function warSnapshot(g,turn){const sides={};for(const side of warSides(g)){
    const e=g.economy?.[side]||{};
    sides[side]={cities:g.stations.filter(s=>s.owner===side).length,
      units:g.units.filter(u=>u.hp>0&&u.side===side).length,
      credits:e.credits||0,industry:e.industry||0,science:e.science||0,sakuradite:e.sakuradite||0};}
    return {turn,sides};}
  function ensureWarReport(g){if(!g.warReport||!Array.isArray(g.warReport.events)||!Array.isArray(g.warReport.snapshots))
    g.warReport={version:1,since:g.turn||1,legacy:(g.turn||1)>1,
      lastCompleted:Math.max(0,(g.turn||1)-1),events:[],turns:{},groups:{},
      snapshots:[warSnapshot(g,Math.max(0,(g.turn||1)-1))]};
    return g.warReport;}
  function warCounters(r,turn,side){const row=(r.turns[turn] ||= {});
    return(row[side] ||= {citiesCaptured:0,citiesLost:0,enemiesDestroyed:0,unitsLost:0,
      unitsProduced:0,inflicted:0,received:0,commandersLost:0,invasionsWon:0,invasionsLost:0,
      fleijaLaunched:0,fleijaIntercepted:0,
      income:{credits:0,industry:0,science:0,sakuradite:0},
      spending:{credits:0,industry:0,science:0,sakuradite:0}});}
  function warGroup(g,u){const x=u&&(g.armyGroups||[]).find(a=>a.side===u.side&&a.units?.includes(u.id));
    return x?String(x.id):null;}
  function recordWarEvent(g,kind,side,data={}){if(!g||g.warReportMuted)return;
    const r=ensureWarReport(g);
    // Routine damage, recruitment and economy actions remain in the exact per-turn
    // aggregates, avoiding huge saves and burying the major operational events.
    const notable=['cityCaptured','cityDestroyed','surrender','portCaptured','fleijaLaunch'].includes(kind)
      || (kind==='unitDestroyed'&&(!!data.commander||!!data.invasion));
    if(notable){r.events.push({turn:g.turn,side,kind,...data});
      if(r.events.length>WAR_EVENT_LIMIT)r.events.splice(0,r.events.length-WAR_EVENT_LIMIT);}
    const x=warCounters(r,g.turn,side),other=data.targetSide||data.previousOwner||data.unitSide;
    if(kind==='cityCaptured'){x.citiesCaptured++;
      if(other&&other!==side)warCounters(r,g.turn,other).citiesLost++;
      if(data.naval)x.invasionsWon++;
    }else if(kind==='cityDestroyed')warCounters(r,g.turn,data.owner||side).citiesLost++;
    else if(kind==='unitDestroyed'){const loss=other&&other!==side?warCounters(r,g.turn,other):x;
      loss.unitsLost++;if(data.commander)loss.commandersLost++;
      if(data.invasion)loss.invasionsLost++;
      if(data.byCombat&&other&&other!==side)x.enemiesDestroyed++;
    }else if(kind==='unitProduced')x.unitsProduced++;
    else if(kind==='damage'){const n=Math.max(0,Math.round(data.value||0));x.inflicted+=n;
      if(other&&other!==side)warCounters(r,g.turn,other).received+=n;
    }else if(kind==='fleijaLaunch'){x.fleijaLaunched++;
      if(data.intercepted&&data.defender)warCounters(r,g.turn,data.defender).fleijaIntercepted++;
    }else if(kind==='income'||kind==='spending'){
      for(const k of Object.keys(x[kind]))x[kind][k]+=Math.max(0,Math.round(data[k]||0));}
    if(data.group!=null&&['cityCaptured','unitDestroyed','damage'].includes(kind)){
      const key=side+':'+data.group,a=(r.groups[key] ||= {side,id:data.group,cities:0,kills:0,damage:0});
      if(kind==='cityCaptured')a.cities++;
      if(kind==='unitDestroyed'&&data.byCombat)a.kills++;
      if(kind==='damage')a.damage+=Math.max(0,Math.round(data.value||0));}}
  function warSpend(g,side,cost,purpose='military'){if(cost)
    recordWarEvent(g,'spending',side,{purpose,credits:cost.credits||0,
      industry:cost.industry||0,science:cost.science||0,sakuradite:cost.sakuradite||0});}
  function finishWarTurn(g,turn=g.turn){const r=ensureWarReport(g);
    if(turn>r.lastCompleted){r.snapshots.push(warSnapshot(g,turn));r.lastCompleted=turn;}
    return r;}
  // ======== Compact saves ========
  // A conquest save stores the world as changes from the starting map instead of all 13,680 hexes: terrain that
  // differs from WORLD_ROWS, and every other per-hex field (owner, provinceCity, any future one) as runs over the
  // hexes in map order: [value, count], or [count] where the field is absent. Destroyed units are dropped (nothing
  // reads them; unit ids keep counting from g.nextId). Campaign maps are small and their saves stay whole.
  // unpackSave turns either kind back into a full game; migrateSave then runs as usual.
  const SAVE_PACK = 1;
  const baseTerrain = (c, r) => TERRAIN_CODES[WORLD_ROWS[r]?.[c]] || 'sea';
  function packSave(g) {
    // Regional scenarios have their own map, so their terrain is packed with the other tile fields
    // instead of as differences from the world map.
    const regional = g.mode === 'scenario';
    if (g.mode === 'campaign' || (!regional && (g.cols !== WORLD.cols || g.rows !== WORLD.rows)) ||
        g.tiles?.length !== g.cols * g.rows)
      return g;
    const { tiles, units, ...rest } = g;
    const fields = [...new Set(tiles.flatMap(t => Object.keys(t)))]
      .filter(k => k !== 'c' && k !== 'r' && (regional || k !== 'terrain'));
    const runs = {};
    for (const f of fields) {
      const out = (runs[f] = []);
      let value, has, n = 0;
      for (const t of tiles) {
        const h = f in t;
        if (n && h === has && t[f] === value) n++;
        else {
          if (n) out.push(has ? [value, n] : [n]);
          value = t[f];
          has = h;
          n = 1;
        }
      }
      if (n) out.push(has ? [value, n] : [n]);
    }
    return {
      ...rest,
      units: units.filter(u => u.hp > 0),
      packedTiles: {
        v: SAVE_PACK,
        terrain: regional ? [] : tiles.flatMap((t, i) => (t.terrain !== baseTerrain(t.c, t.r) ? [[i, t.terrain]] : [])),
        fields: runs,
      },
    };
  }
  function unpackSave(p) {
    if (!p?.packedTiles) return p;
    const { packedTiles: pk, ...g } = p;
    if (pk.v !== SAVE_PACK || !(g.cols > 0 && g.rows > 0)) return null;
    const n = g.cols * g.rows,
      tiles = new Array(n);
    for (let i = 0; i < n; i++) {
      const c = i % g.cols,
        r = (i / g.cols) | 0;
      tiles[i] = { c, r, terrain: g.mode === 'scenario' ? 'sea' : baseTerrain(c, r) };
    }
    for (const [i, terrain] of pk.terrain || []) if (tiles[i]) tiles[i].terrain = terrain;
    for (const [f, list] of Object.entries(pk.fields || {})) {
      let i = 0;
      for (const run of list) {
        const count = run.length === 1 ? run[0] : run[1];
        if (run.length === 2) for (let k = i; k < Math.min(n, i + count); k++) tiles[k][f] = run[0];
        i += count;
      }
    }
    g.tiles = tiles;
    return g;
  }
  function migrateSave(g) {
    g = unpackSave(g);
    if (!g || g.game !== 'knightmare' || !Array.isArray(g.units)) return null;
    const regional = g.mode === 'scenario';
    // Regional scenarios carry their own map; the world-map checks and repairs below do not apply to them.
    if (regional && (!g.scenario?.id || !(g.cols > 0) || g.tiles?.length !== g.cols * g.rows)) return null;
    // Old Stonehenge saves had a different map and an extra playable power.
    if (regional && g.scenario?.id === 'operation-stonehenge' && g.scenario.version !== 2) return null;
    // The high-resolution conquest rebuild cannot safely load saves from the old 100 × 42 world.
    if (g.mode !== 'campaign' && !regional && (g.cols !== WORLD.cols || g.rows !== WORLD.rows || g.tiles?.length !== WORLD.cols * WORLD.rows)) return null;
    if (g.rulesVersion !== RULES_VERSION) return null;
    // Preserve saves containing retired scenario-only Elite carrier-battleships.
    const legacyCarriers = {
      elite_europe_eu_carrier: 'eu_carrier',
      elite_europe_eb_carrier: 'carrier_battleship',
      elite_japan_britannia_carrier: 'carrier_battleship',
      elite_japan_eu_carrier: 'eu_carrier',
      elite_japan_cf_carrier: 'cf_carrier',
      elite_japan_bk_carrier: 'bk_carrier',
    };
    for (const u of g.units.flatMap(v => [v, ...(v.cargo || [])])) {
      if (!legacyCarriers[u.type]) continue;
      u.type = legacyCarriers[u.type];
      delete u.elite;
      delete u.eliteLevel;
      delete u.eliteStart;
      u.stack = 1;
      u.hp = Math.min(u.hp, maxHP(u));
    }
    if (g.scenario?.eliteRosters) for (const side of Object.keys(g.scenario.eliteRosters))
      g.scenario.eliteRosters[side] = (g.scenario.eliteRosters[side] || [])
        .filter(id => !!ELITE_FORCES[id]);
    if (g.eliteDeployed) for (const id of Object.keys(g.eliteDeployed))
      if (/(?:japan|europe)_.*_carrier/.test(id)) delete g.eliteDeployed[id];
    if (!g.units.every(u => TYPES[u.type])) return null;
    if (g.mode === 'conquest') {
      const cfg = CONQUESTS[g.era || 'world'];
      if (!cfg) return null;
      g.era = cfg.id;
      g.majors = [...cfg.majors];
      g.teams = { ...cfg.teams };
      g.factions = cfg.factions ? JSON.parse(JSON.stringify(cfg.factions)) : null;
      if (!cfg.selectable.includes(g.player)) return null;
      // Reconcile old saves to one warhead per pool. In 2018 the Britannian
      // partners count together, with a human-owned warhead/project kept first.
      // Cancelled projects refund their ORIGINAL owner's treasury, not the ally's.
      g.arsenal ||= {};
      const visitedPools = new Set();
      for (const side of g.majors) {
        const members = fleijaPoolSides(g, side);
        const poolKey = members.join('/');
        if (visitedPools.has(poolKey)) continue;
        visitedPools.add(poolKey);
        const entries = [];
        for (const member of members) {
          if ((g.arsenal[member] || 0) > 0)
            entries.push({ member, kind: 'stored' });
          for (const s of g.stations.filter(s => s.project?.side === member))
            entries.push({ member, kind: 'project', station: s });
        }
        entries.sort((a, b) =>
          Number(b.member === g.player) - Number(a.member === g.player) ||
          Number(b.kind === 'stored') - Number(a.kind === 'stored') ||
          (a.station?.project.ready || 0) - (b.station?.project.ready || 0) ||
          g.majors.indexOf(a.member) - g.majors.indexOf(b.member));
        for (const member of members) g.arsenal[member] = 0;
        for (const [i, entry] of entries.entries()) {
          if (i < FLEIJA.max) {
            if (entry.kind === 'stored') g.arsenal[entry.member] = 1;
          } else if (entry.kind === 'project') {
            entry.station.project = null;
            const treasury = funds(g, entry.member);
            if (treasury) for (const [resource, amount] of Object.entries(FLEIJA.cost))
              treasury[resource] = (treasury[resource] || 0) + amount;
          }
        }
      }
    }
    if (g.mode !== 'campaign' && !regional) {
      migrateCoastalTerrain(g);
      attachUnclaimedNewZealand(g);
      repairCapeYorkOwnership(g);
      repairSakhalinTerritory(g);
      repairLegacyRegionalZones(g);
      // Older saves have no province IDs. Bind their existing painted land to
      // its closest still-controlled city, without resetting conquest progress.
      assignCityProvinces(g);
    }
    g.eliteDeployed ||= {};
    for (const [which, records] of [['officers', g.officers], ['roster', g.roster]])
      if (records) for (const [k, rec] of Object.entries(records))
        if (COMMANDERS[k]) records[k] = cleanOfficer(k, rec,
          which === 'officers' && ((eliteConquest(g) && (g.era === 'ufn2018' ? !serves(k, g.player, g) : COMMANDERS[k].side !== g.player)) ||
              (eliteCampaign(g) && g.units.some(u => u.cmd === k && foe(g, u.side, g.player))))
            ? RANKS.length - 1 : HQ_RANK_CAP);
    if (g.mode !== 'campaign') automationState(g);
    for (const u of g.units.flatMap(v => [v, ...(v.cargo || [])])) {
      const elite = u.elite || ELITE_TYPE_TO_ID[u.type];
      if (elite) {
        u.elite = elite;
        u.eliteLevel ||= 1;
        // Elite Forces are single frames; older saves let rival elites carry up to three.
        if (u.stack > 1 && u.hp > 0) {
          const share = u.hp / maxHP(u);
          u.stack = 1;
          u.hp = Math.max(1, Math.round(share * maxHP(u)));
        }
        // Scripted campaign elites and preplaced Elite Conquest/scenario starts never spend the player's
        // recruit allowance; in scenarios only the player's own deployments count.
        const preplaced = (eliteConquest(g) || eliteScenario(g)) && u.eliteStart;
        if (!eliteCampaign(g) && !preplaced && (!regional || u.side === g.player))
          g.eliteDeployed[elite] = true;
      }
      // Older saves left carried units at the hex where they boarded.
      for (const c of u.cargo || []) {
        c.c = u.c;
        c.r = u.r;
      }
    }
    return g;
  }
  function newUnit(g, type, side, c, r, stack = 1, cmd = null, ready = true) {
    const u = {
      id: g.nextId++,
      type,
      side,
      c,
      r,
      stack: ELITE_TYPE_TO_ID[type] ? 1 : stack, // Elite Forces are always single frames, for every side.
      hp: 0,
      morale: 0,
      moved: !ready,
      attacked: !ready,
      cmd,
      kills: 0,
      chain: 0,
      xp: 0,
      feintCD: 0,
      held: false,
      guardReady: false,
      entrenched: false,
      movedDistance: 0,
      skillReposition: 0,
      withdrawMove: false,
      elite: ELITE_TYPE_TO_ID[type] || null,
      eliteLevel: ELITE_TYPE_TO_ID[type] ? 1 : 0,
      eliteMoveAfterKill: false,
    };
    u.hpTech = hullTech(g, u);
    u.hp = maxHP(u);
    g.units.push(u);
    if(g.warReport)recordWarEvent(g,'unitProduced',side,{unitId:u.id,unitType:type});
    return u;
  }
  function movement(g, u) {
    const t = TYPES[u.type],
      f = fx(u),
      mobilityStars = u.cmd ? officerOf(g, u)?.ratings?.mobility || 1 : 0;
    let n = t.move + (eliteFx(u).move || 0);
    // Only world Conquest has the +2 high-resolution map movement bonus.
    // Scenario/Campaign units and warships use their normal movement values.
    if (g?.mode === 'conquest' && t.naval !== 'ship') n += CONQUEST_MOVE_BONUS;
    // Every commander Mobility star grants +1 movement (1★ = +1 through 6★ = +6).
    n += mobilityStars;
    if(u.expJammedActive)n=Math.max(1,n-2);
    n += wears(g, u, 'star') ? 1 : 0;
    n += f.move || 0;
    return n;
  }
  function terrainCost(g, u, t) {
    if (isSea(t)) return 1;
    const type = TYPES[u.type];
    if (fx(u).ignoreTerrain || u.expRetrofit || type.float || eliteFx(u).float) return 1;
    if (type.branch === 'Armor' && techLevel(g, u.side, 'sakura.float') >= 1) return 1;
    const nav = type.branch === 'Infantry' ? techLevel(g, u.side, 'infantry.nav') : 0;
    if (nav >= 2 || (nav >= 1 && (t.terrain === 'forest' || t.terrain === 'mountain'))) return 1;
    return TERRAIN[t.terrain]?.cost || 1;
  }
  function canCapture(u) {
    return TYPES[u.type].naval !== 'ship';
  }
  // Amphibious frames and embarked transports may capture an empty enemy city
  // even when its shields have not yet been reduced to zero.
  function navalCityAssault(g, u) {
    return TYPES[u.type].naval === 'amphibious' || atSea(g, u);
  }
  function isReady(g, u) {
    return !g.over && g.phase === u.side && u.hp > 0 && u.morale > -3;
  }
  // Movement: a Dijkstra search. Land units may embark onto an adjacent sea hex (which ends the move); embarked
  // units sail up to their sea movement and may land on a coast hex (which ends the move).
  function reachable(g, u) {
    const found = new Map();
    const ef = eliteFx(u);
    if (!isReady(g, u) || u.expDisabledActive || u.expPinnedActive || (u.expJammedActive && u.attacked) || u.moved || (u.attacked && !ef.moveAfterAttack && !u.eliteMoveAfterKill && !u.skillReposition && !u.withdrawMove)) return found;
    const t = TYPES[u.type],
      start = tile(g, u.c, u.r),
      fromSea = isSea(start),
      navalAssault = t.naval === 'amphibious' || (!t.naval && fromSea),
      ship = t.naval === 'ship',
      amphibious = t.naval === 'amphibious',
      landMove = movement(g, u),
      seaMv = amphibious ? amphibiousSea(g, u) : 0,
      budget = u.skillReposition ? Math.min(landMove, u.skillReposition) : ship ? landMove : amphibious ? landMove * seaMv : fromSea ? seaMove(g, u) : landMove,
      boards = !u.skillReposition && !t.naval && u.deployedTurn !== g.turn,
      stateKey = p => key(p),
      costs = new Map([[stateKey(start), 0]]),
      queue = [{ p: start, cost: 0, order: 0 }];
    let nextOrder = 1;
    const before = (a, b) => a.cost < b.cost || (a.cost === b.cost && a.order < b.order);
    const push = entry => {
      entry.order = nextOrder++;
      let i = queue.length;
      queue.push(entry);
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (!before(entry, queue[parent])) break;
        queue[i] = queue[parent];
        i = parent;
      }
      queue[i] = entry;
    };
    const pop = () => {
      const first = queue[0], last = queue.pop();
      if (queue.length) {
        let i = 0;
        for (;;) {
          const left = i * 2 + 1, right = left + 1;
          if (left >= queue.length) break;
          const child = right < queue.length && before(queue[right], queue[left]) ? right : left;
          if (!before(queue[child], last)) break;
          queue[i] = queue[child];
          i = child;
        }
        queue[i] = last;
      }
      return first;
    };
    while (queue.length) {
      const { p, cost } = pop();
      if (cost > costs.get(stateKey(p))) continue;
      for (const n of adjacent(g, p)) {
        if (TERRAIN[n.terrain]?.blocked || (ship && !navigable(n)) || (u.skillReposition && !t.naval && isSea(n) && !fromSea)) continue;
        const occ = unitAt(g, n),
          st = stationAt(g, n);
        if (ship && st) continue;
        if (occ && occ.side !== u.side) continue;
        if (occ && boards && canBoard(g, occ)) {
          if (cost < budget) found.set(key(n), budget);
          continue;
        }
        if (st && foe(g, st.owner, u.side) && !((canCapture(u) && st.shield <= 0) || navalAssault)) continue;
        const cross = !t.naval && isSea(n) !== fromSea;
        const step = isSea(n) ? 1 : terrainCost(g, u, n);
        const nc = u.skillReposition
          ? cost + step
          : cross
          ? budget
          : ship
            ? cost + 1
            : amphibious
              ? cost + (isSea(n) ? landMove : terrainCost(g, u, n) * seaMv)
              : cost + step;
        const sk = stateKey(n);
        if (nc > budget || (cross && cost >= budget) || nc >= (costs.get(sk) ?? Infinity)) continue;
        costs.set(sk, nc);
        if (!cross) push({ p: n, cost: nc });
        if (!occ && key(n) !== key(start)) found.set(key(n), Math.min(found.get(key(n)) ?? Infinity, nc));
      }
    }
    return found;
  }
  // Fire Control II adds one hex of range to all Artillery.
  function rangeOf(g, u) {
    const t = TYPES[u.type];
    return {
      min: t.min,
      max:
        t.max +
        (eliteFx(u).range || 0) +
        (g && t.branch === 'Artillery' && !t.naval && techLevel(g, u.side, 'artillery.fire') >= 2 && (u.movedDistance || 0) === 0 ? 1 : 0) +
        (g && t.branch === 'Artillery' && spotted(g, u) ? 1 : 0) + (u.expNavalRelay ? 1 : 0), // Minami's Ikaruga Fire Control
    };
  }
  function inRange(a, p, g) {
    const { min, max } = rangeOf(g, a),
      d = dist(g, a, p);
    return d >= min && d <= max;
  }
  function hostileTarget(g, u, p) {
    const target = unitAt(g, p),
      st = stationAt(g, p);
    if (target) return foe(g, target.side, u.side);
    return !!st && foe(g, st.owner, u.side) && st.shield > 0;
  }
  // Whether a unit still has any order besides holding position: firing, moving, repairing, reinforcing or an action.
  function hasOrders(g, u) {
    if (!u || !isReady(g, u)) return false;
    if (!u.attacked && targets(g, u).length) return true;
    if (!u.moved && !u.goto && reachable(g, u).size) return true;
    if (!repairReason(g, u) || !reinforceReason(g, u)) return true;
    if (u.cargo?.some((c, i) => !deployReason(g, u, i))) return true;
    return !!COMMANDERS[u.cmd]?.action && !feintReason(g, u);
  }
  // Carrier cargo can land on an empty enemy city, but cannot displace a garrison.
  function deployTargetsAt(g, p, side, carriesTroops = false) {
    return adjacent(g, p).filter(t =>
      !isSea(t) && !TERRAIN[t.terrain]?.blocked && !unitAt(g, t) &&
      (carriesTroops || !stationAt(g, t) || !foe(g, stationAt(g, t).owner, side)),
    );
  }
  const deployTargets = (g, ship, i = 0) => deployTargetsAt(g, ship, ship.side, !!ship.cargo?.[i]);
  function deployReason(g, ship, i) {
    const u = ship?.cargo?.[i];
    if (!u) return 'No unit aboard';
    return (
      turnReason(g, ship.side) ||
      (!deployTargets(g, ship, i).length ? 'No empty land hex next to the carrier' : null)
    );
  }
  function deploy(g, shipId, i, c, r) {
    const ship = g.units.find(v => v.id === shipId && v.hp > 0),
      why = ship ? deployReason(g, ship, i) : 'Carrier not found';
    if (why) return { ok: false, reason: why };
    const t = deployTargets(g, ship, i).find(p => p.c === c && p.r === r);
    if (!t) return { ok: false, reason: 'Choose an empty land hex next to the carrier.' };
    const [u] = ship.cargo.splice(i, 1);
    u.c = t.c;
    u.r = t.r;
    u.moved = u.attacked = false;
    u.deployedTurn = u.launched = g.turn;
    g.units.push(u);
    // Only city captures transfer territory; ordinary landings cannot repaint it.
    const { captured, annexed } = captureCity(g, u, true);
    const seized = seizeDeposit(g, u, t);
    log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} launches from the Carrier-Battleship.`, u.side);
    checkVictory(g);
    return { ok: true, unit: u, to: { c: t.c, r: t.r }, captured, annexed, seized };
  }
  // Embarked units cannot fire.
  function targets(g, u) {
    if (atSea(g, u)) return [];
    return within(g, u, rangeOf(g, u).max).filter(p => inRange(u, p, g) && hostileTarget(g, u, p));
  }
  function claim(g, p, owner) {
    if (g.mode !== 'campaign') {
      // Capturing a city transfers its entire fixed province, not the nearby
      // provinces and not just the seven hexes immediately around the city.
      let changed = 0;
      for (const t of g.tiles)
        if (!isSea(t) && t.provinceCity === p.id) {
          setTileOwner(g, t, owner);
          changed++;
        }
      // Custom maps and old standalone tests may not have city provinces.
      if (!changed) setTileOwner(g, tile(g, p.c, p.r), owner);
      return;
    }
    // Campaign missions use small tactical maps, not the conquest province map.
    for (const t of [tile(g, p.c, p.r), ...adjacent(g, p)])
      if (!isSea(t) && !TERRAIN[t.terrain]?.blocked) setTileOwner(g, t, owner);
  }
  // A port is seized by entering its water hex, independently of its city and territory.
  function capturePort(g, u) {
    const s = portAtHex(g, u);
    if (!s || !foe(g, s.portOwner || s.owner, u.side)) return null;
    const previousOwner=s.portOwner||s.owner;
    s.portOwner=u.side;
    recordWarEvent(g,'portCaptured',u.side,{cityId:s.id,city:s.name,previousOwner,unitId:u.id});
    log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} captures the port of ${s.name}.`, u.side);
    return s.name;
  }
  // City capture changes provinces, but does not automatically transfer ports.
  function captureCity(g, u, navalLanding = false) {
    const s = stationAt(g, u);
    if (!s || !foe(g, s.owner, u.side) ||
      !(canCapture(u) || navalLanding) || (s.shield > 0 && !navalLanding))
      return { captured: null, annexed: null };
    const loser = s.owner;
    if(fx(u).taxSeizure){funds(g,u.side).credits+=Math.min(150,3*cityOutput(g,s).credits);s.expTaxUntil=g.turn+2;}
    delete s.expSupplyBlocked;delete s.expDecree;
    s.owner = u.side;
    recordWarEvent(g,'cityCaptured',u.side,{cityId:s.id,city:s.name,previousOwner:loser,
      unitId:u.id,commander:u.cmd||null,naval:!!navalLanding,group:warGroup(g,u)});
    s.shield = 0;
    s.capturedTurn = g.turn;
    dropProject(g, s, 'captured');
    dropEliminator(g, s, 'captured');
    u.morale = 1;
    funds(g, u.side).credits += 40;
    fortify(g, s);
    claim(g, s, u.side);
    if (fx(u).captureHeal) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * fx(u).captureHeal));
    if (fx(u).specialOps && (s.gunReady || 0) > g.turn) s.gunReady--;
    log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} captures ${s.name}.`, u.side);
    hooks.capture?.(g, s, u, loser);
    if (s.capitalOf && s.capitalOf === loser) award(g, u.side, 'star', `${s.name} captured`);
    const expeditionAfloat = g.scenario?.id === 'operation-stonehenge' &&
      loser === 'britannia' && g.units.some(v => v.side === loser && v.hp > 0);
    const annexed = g.mode !== 'campaign' && alive(g, loser) &&
      !g.stations.some(c => c.owner === loser) && !expeditionAfloat
      ? surrender(g, loser, u.side, s) : null;
    return { captured: s.name, annexed };
  }
  function move(g, id, c, r) {
    const u = g.units.find(u => u.id === id);
    if (!u) return { ok: false, reason: 'Unit not found.' };
    const dest = tile(g, c, r),
      reach = dest && reachable(g, u),
      moveCost = dest && reach?.get(key(dest));
    if (!dest || moveCost == null) return { ok: false, reason: 'That hex is not reachable this turn.' };
    const from = { c: u.c, r: u.r },
      fromSea = isSea(tile(g, u.c, u.r)),
      t = TYPES[u.type],
      carrier = unitAt(g, dest);
    // Boarding: the Knightmare goes aboard (off the map) and its action ends.
    if (carrier && carrier !== u && carrier.side === u.side && canBoard(g, carrier)) {
      g.units.splice(g.units.indexOf(u), 1);
      u.c = dest.c;
      u.r = dest.r;
      u.moved = u.attacked = true;
      u.held = false;
      u.guardReady = false;
      u.skillReposition = 0;
      u.withdrawMove = false;
      u.movedDistance = (u.movedDistance || 0) + dist(g, from, dest);
      u.lastTurnMoved = true;
      u.boardedTurn = g.turn;
      (carrier.cargo ||= []).push(u);
      log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} boards the Carrier-Battleship.`, u.side);
      return { ok: true, from, to: { c: dest.c, r: dest.r }, loaded: carrier.id };
    }
    u.c = dest.c;
    u.r = dest.r;
    // Units aboard a Carrier-Battleship travel with it (rallies and other distance rules read their position).
    for (const c of u.cargo || []) {
      c.c = dest.c;
      c.r = dest.r;
    }
    u.moved = true;
    // Amphibious units gain one full extra movement and attack after landing each turn.
    // A per-turn stamp prevents unlimited actions by hopping across the coastline.
    const freshLanding = t.naval === 'amphibious' && fromSea && !isSea(dest) && u.landingRefreshTurn !== g.turn;
    if (freshLanding) {
      u.landingRefreshTurn = g.turn;
      u.moved = false;
      u.attacked = false;
      u.chain = 0;
    }
    u.held = false;
    u.guardReady = false;
    u.movedDistance = freshLanding ? 0 : (u.movedDistance || 0) + dist(g, from, dest);
    if(fromSea&&!isSea(dest))u.expLandedTurn=g.turn;
    if(u.expRetrofit){u.expRetrofitStrike=u.movedDistance>=3;delete u.expRetrofit;}
    u.lastTurnMoved = true;
    u.skillReposition = 0;
    u.withdrawMove = false;
    u.eliteMoveAfterKill = false;
    reindex(g, u, from);
    newcomerOverwatch(g,u);
    if(u.hp<=0){checkVictory(g);return {ok:true,from,to:{c:dest.c,r:dest.r},destroyed:true};}
    // Moving through enemy or neutral territory never changes its map color.
    const { captured, annexed } = captureCity(g, u, t.naval === 'amphibious' || (!t.naval && fromSea));
    const portCaptured = capturePort(g, u);
    const seized = seizeDeposit(g, u, dest);
    checkVictory(g);
    return { ok: true, from, to: { c: dest.c, r: dest.r }, captured, annexed, portCaptured, seized };
  }
  // `last` is the city whose capture left the loser with none; anything it still held passes to the conqueror.
  function surrender(g, loser, winner, last) {
    (g.fallen ||= {})[loser] = { by: winner, turn: g.turn, city: last.name };
    recordWarEvent(g,'surrender',winner,{loser,city:last.name});
    // Clear strategic defenses while any remaining cities still identify their original owner.
    annexStrategic(g, loser);
    let cities = 0,
      units = 0;
    for (const s of g.stations) {
      // Defeated powers cannot keep ports, but third-party harbour control survives.
      if (s.portAt && s.portOwner === loser) s.portOwner = winner;
      if (s.owner === loser) {
        s.owner = winner;
        s.shield = Math.round(s.maxShield * 0.5);
        s.producedTurn = s.portProducedTurn = g.turn;
        fortify(g, s);
        cities++;
      }
    }
    // Any land formerly attached to an already destroyed city now belongs to
    // a surviving city of the conqueror, so later captures can still transfer it.
    const winnerCities = new Set(g.stations.filter(s => s.owner === winner).map(s => s.id));
    for (const t of g.tiles) if (t.owner === loser) {
      setTileOwner(g, t, winner);
      if (!winnerCities.has(t.provinceCity)) delete t.provinceCity;
    }
    if (g.mode !== 'campaign') assignCityProvinces(g);
    for (const v of g.units)
      if (v.hp > 0 && v.side === loser) {
        v.hp = 0;
        kill(g, v, null, true); // also sinks the Knightmares aboard a Carrier-Battleship
        units++;
      }
    const e = funds(g, loser),
      w = funds(g, winner);
    w.credits += Math.round(e.credits / 2);
    w.industry += Math.round(e.industry / 2);
    e.credits = e.industry = 0;
    annexDeposits(g, loser, winner);
    log(
      g,
      `${last.name}, the last city of the ${FACTIONS[loser].name}, has fallen. It surrenders to the ${FACTIONS[winner].name}: ${units} units disbanded.`,
      winner,
    );
    return { loser, winner, cities, units, city: last.name };
  }
  // Command auras: every commander lifts adjacent friends by 8%; some reach farther or further.
  function auraBonus(g, u) {
    let bonus = 0;
    for (const a of g.units) {
      if (a.hp <= 0 || a.side !== u.side || a.id === u.id) continue;
      if (a.cmd && !a.auraDisrupted && dist(g, a, u) <= auraRange(a)) bonus = Math.max(bonus, fx(a).aura?.value || 0.08);
      const ea = eliteFx(a).aura;
      if (ea && dist(g, a, u) <= ea.range && (!ea.branches || ea.branches.includes(TYPES[u.type].branch)))
        bonus = Math.max(bonus, ea.value);
    }
    return bonus;
  }
  // Permanent frame/commander strength shared by the dock and combat. Situational
  // modifiers (morale, health, terrain, targets and auras) remain in power().
  function intrinsicAttack(g, u, counter = false) {
    const t = TYPES[u.type], f = fx(u), strike = !counter || !f.attackOnly,
      attackGeneric = { Infantry: 'raider', Armor: 'armored_assault', Artillery: 'accuracy' }[t.branch];
    let attack = (t.attack + officerBaseAttack(g, u)) * eliteScale(u).attack * (1 + 0.45 * (u.stack - 1));
    if (f.dmg && strike) attack *= 1 + f.dmg;
    if (f.dmgBranch?.[t.branch] && strike) attack *= 1 + f.dmgBranch[t.branch];
    return attack * officerAttack(g, u) * (1 + 0.06 * genericLevel(g, u, attackGeneric));
  }
  function power(g, u, target, st, counter = false, direct = true) {
    const t = TYPES[u.type],
      victim = target ? TYPES[target.type] : null,
      f = fx(u),
      ef = eliteFx(u),
      strike = !counter || !f.attackOnly;
    let attack = intrinsicAttack(g, u, counter) * (1 + 0.07 * Math.min(5, u.xp));
    attack *= u.morale >= 1 ? 1.25 : u.morale === -1 ? 0.75 : u.morale === -2 ? 0.5 : u.morale <= -3 ? 0 : 1;
    if (u.despairWeakened) attack *= 1 - u.despairWeakened.value;
    const gritSkill = { Infantry: 'bayonet_charge', Armor: 'tide_of_iron', Artillery: 'artillery_barrage' }[t.branch];
    const missingHpPenalty = 0.6 * (1 - clamp(u.hp / maxHP(u), 0, 1));
    attack *= 1 - missingHpPenalty * (1 - 0.2 * genericLevel(g, u, gritSkill)) * (u.hp/maxHP(u)<.5&&g.units.some(v=>v.hp>0&&v.side===u.side&&fx(v).stabilize&&dist(g,u,v)<=2)?.5:1);
    attack *= 1 + auraBonus(g, u);
    attack *= newcomerAttack(g,u,target,counter);
    // Portmans hunt transports and warships; the Portman II also fights harder in the water (Aquatic Combat).
    if (t.naval === 'amphibious' && target && (atSea(g, target) || isShip(target))) attack *= 1.25;
    if (t.naval === 'amphibious' && target && isShip(target)) attack *= 1 + techValue(g, u.side, 'naval.torpedoes');
    if (t.aquatic && isSea(tile(g, u.c, u.r))) attack *= 1 + t.aquatic;
    if (t.naval === 'ship') {
      attack *= 1 + techValue(g, u.side, 'naval.gunnery');
      if (counter) attack *= 1 + techValue(g, u.side, 'naval.firecontrol');
    }
    // Rapid Launch Systems: the first attack on the turn a Knightmare launched from a carrier (needs a level-3 port).
    if (!counter && u.launched === g.turn && hasPort3(g, u.side)) attack *= 1 + techValue(g, u.side, 'naval.launch');
    // Commander signature abilities (attacker side).
    if (f.opening && !counter && !u.moved) attack *= 1 + f.opening;
    if (counter && f.counter) attack *= 1 + f.counter;
    if (counter) attack *= 1 + 0.05 * genericLevel(g, u, 'crossfire');
    attack *= skillAttack(g, u, counter) * commanderAttack(g, u, target, counter);
    if (ef.dmg && strike) attack *= 1 + ef.dmg;
    if (counter && ef.counter) attack *= 1 + ef.counter;
    if (ef.vsArmor && victim?.branch === 'Armor' && strike) attack *= 1 + ef.vsArmor;
    if (ef.cityAttack && g.stations.some(s => s.owner === u.side && dist(g, s, u) <= 1) && strike)
      attack *= 1 + ef.cityAttack;
    if (f.artist && target)
      attack *=
        1 +
        f.artist *
          Math.min(3, g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && dist(g, v, target) === 1).length);
    if (t.boarding && (target ? victim.branch === 'Armor' : !!st)) attack *= 1.55;
    // HQ research: branch weapons and class counters.
    attack *= 1 + unitTech(g, u, 'guns');
    if (!t.naval && t.branch === 'Armor' && victim?.branch === 'Infantry') attack *= 1 + techValue(g, u.side, 'armor.secondary');
    if (!t.naval && t.branch === 'Artillery' && victim?.branch === 'Infantry') attack *= 1 + techValue(g, u.side, 'artillery.shells');
    const friends = (side, at, test) =>
      g.units.some(v => v.hp > 0 && v.side === side && v.id !== u.id && dist(g, v, at) === 1 && test(TYPES[v.type]));
    // Lance Formation and Factsphere Fire Control.
    if (!t.naval && t.branch === 'Armor' && techLevel(g, u.side, 'armor.formation') >= 1 && friends(u.side, u, v => v.branch === 'Armor' && !v.naval))
      attack *= 1.12;
    if (
      !t.naval &&
      t.branch === 'Artillery' &&
      target &&
      techLevel(g, u.side, 'artillery.fire') >= 1 &&
      friends(u.side, target, v => v.branch !== 'Artillery')
    )
      attack *= 1.2;
    const pen = Math.min(.95,armorPenetration(g,u,target)
      +(u.expCalibration?.15:0)
      +(fx(u).diagnosis&&target&&u.expDiagnosisId===target.id?.1*(u.expDiagnosisCount||0):0)
      +(u.elite&&!TYPES[u.type].naval&&g.units.some(v=>v.hp>0&&v.side===u.side&&fx(v).elitePenSupport&&dist(g,v,u)<=2)?0.12:0));
    const formationArmor =
      target &&
      !victim.naval &&
      victim.branch === 'Armor' &&
      techLevel(g, target.side, 'armor.formation') >= 1 &&
      g.units.some(v => v.hp > 0 && v.side === target.side && v.id !== target.id && !TYPES[v.type].naval && TYPES[v.type].branch === 'Armor' && dist(g, v, target) === 1)
        ? 5
        : 0;
    const armor = target ? victim.armor + eliteScale(target).armor + unitTech(g, target, 'armor') + formationArmor : 35;
    attack *= 100 / (100 + armor * (1 - pen) * 2);
    if (target) {
      const tf = fx(target),
        nearCity = g.stations.some(s => s.owner === target.side && dist(g, s, target) <= 1);
      attack *= officerDefense(g, target);
      attack *= 1 - 0.03 * genericLevel(g, target, 'fortification');
      if (!victim.naval && t.branch === 'Artillery' && victim.branch === 'Armor') attack *= 1 - techValue(g, target.side, 'armor.blaze');
      if (!victim.naval && t.cls === 'siege' && victim.branch === 'Armor') attack *= 1 - techValue(g, target.side, 'armor.bulkheads');
      if (!victim.naval && victim.branch === 'Artillery' && !t.naval && t.branch === 'Artillery')
        attack *= 1 - techValue(g, target.side, 'artillery.counterbattery');
      const ground = tile(g, target.c, target.r);
      if (!victim.naval && victim.branch === 'Infantry' && (ground.terrain === 'urban' || !!stationAt(g, target)))
        attack *= 1 - techValue(g, target.side, 'infantry.urban');
      if (!victim.naval && victim.branch === 'Infantry' && target.entrenched)
        attack *= 1 - techValue(g, target.side, 'infantry.entrench');
      if (nearCity) attack *= 1 - techValue(g, target.side, 'cities.bunkers');
      attack *= 1 - techValue(g, target.side, 'sakura.blaze');
      // Factsphere Screen: Infantry shields neighbouring Artillery.
      if (
        !victim.naval &&
        victim.branch === 'Artillery' &&
        techLevel(g, target.side, 'infantry.picket') >= 1 &&
        g.units.some(
          v => v.hp > 0 && v.side === target.side && TYPES[v.type].branch === 'Infantry' && dist(g, v, target) === 1,
        )
      )
        attack *= 0.85;
      // Commander signature abilities (defender side).
      if (tf.taken) attack *= tf.taken;
      const tef = eliteFx(target);
      if (tef.taken) attack *= tef.taken;
      const protector = g.units.find(v => {
        const p = eliteFx(v).protect;
        return v.hp > 0 && v.side === target.side && v.id !== target.id && p && dist(g, v, target) <= p.range;
      });
      if (protector) attack *= eliteFx(protector).protect.value;
      if (tf.belowHalf && target.hp / maxHP(target) < 0.5) attack *= tf.belowHalf;
      if (tf.counterTaken && counter) attack *= tf.counterTaken;
      if (tf.cityGuard && nearCity) attack *= tf.cityGuard;
      if (nearCity && skillNear(g, target, 'garrisonCommand', 1, false)) attack *= 0.9;
      if (g.units.some(v => v.hp > 0 && v.side === target.side && fx(v).rearguard && dist(g, v, target) <= 1))
        attack *= 0.9;
      attack *= skillDefense(g,target,counter,direct) *
        commanderDefense(g,target,u,counter,direct) *
        newcomerDefense(g,target,u,counter,direct);
      if (isSea(ground)) attack *= TYPES[target.type].naval ? 1 : 1 + seaPenalty(g, target.side);
      else {
        const bypass=(u.forcedOffensive?.3:0)+(target.expRadar?.side===u.side&&TYPES[u.type].branch==='Artillery'?1:0)+(fx(u).highland&&tile(g,u.c,u.r)?.terrain==='mountain'?.5:0)+(fx(u).ziAmbush&&target?.cmd&&u.movedDistance>=2&&u.expZiAmbushTurn!==g.turn?.5:0);
        attack*=1-(TERRAIN[ground.terrain]?.cover||0)*(1-Math.min(1,bypass));
      }
    }
    if (counter) attack *= !t.naval && t.branch === 'Infantry' && techLevel(g, u.side, 'infantry.picket') >= 2 ? 0.85 : 0.65;
    return Math.max(1, Math.round(attack));
  }
  function preview(g, id, c, r) {
    const a = g.units.find(u => u.id === id),
      p = tile(g, c, r);
    if (!a || !p || atSea(g, a) || !hostileTarget(g, a, p) || !inRange(a, p, g)) return null;
    const t = TYPES[a.type],
      f = fx(a),
      d = unitAt(g, p),
      s = stationAt(g, p);
    const base = power(g, a, d, s),
      shield = s && foe(g, s.owner, a.side) && s.shield > 0;
    const unitDmg = d ? Math.round(base * (shield ? 0.55 : 1)) : 0;
    // Chaos Mines and city-breaker commanders raise damage to city defenses.
    const ef = eliteFx(a),
      raid = (1 + (t.branch === 'Infantry' ? techValue(g, a.side, 'infantry.mines') : 0)) * (1 + (f.vsCity || 0)) * (1 + (ef.vsCity || 0)) * bombardBonus(g, a, s);
    const shieldDmg = shield
      ? Math.round(
          base *
            (t.boarding && d && TYPES[d.type].branch !== 'Armor' ? 1.55 : 1) *
            (t.siege || 1) *
            (d ? 0.8 : 1.45) *
            raid,
        )
      : 0;
    // Asahina's Rapid Assault: a target already hit this turn by his side cannot counter, and he crits more often.
    const followUp = !!f.followUp && !!d && d.struck?.turn === g.turn && d.struck.side === a.side;
    const counter =
      !followUp &&
      !(f.timeStop && a.timeStopTurn !== g.turn) &&
      !(f.dashStrike&&a.movedDistance>=3&&a.expDashTurn!==g.turn) &&
      !targetMarked(g, a, d).noCounter &&
      !!d &&
      !t.noCounter &&
      !ef.noCounter &&
      d.morale > -3 &&
      !atSea(g, d) &&
      inRange(d, a, g) &&
      hostileTarget(g, d, a);
    const crit = clamp(
      t.crit +
        (f.crit || 0) +
        (a.expCalibration ? .25 : 0) +
        (f.chargeCrit && a.movedDistance >= 2 ? f.chargeCrit : 0) +
        0.06 * genericLevel(g, a, { Infantry: 'infantry_leader', Armor: 'armor_leader', Artillery: 'artillery_leader' }[t.branch]) +
        (followUp ? f.followUp : 0) +
        (wears(g, a, 'marksman') ? 0.08 : 0) +
        techValue(g, a.side, 'sakura.varis'),
      0,
      1,
    );
    return {
      unit: unitDmg,
      shield: shieldDmg,
      counter: counter ? power(g, d, a, stationAt(g, a), true) : 0,
      counterAllowed: counter,
      crit,
      critMult: (t.critMult || 1.55) + (f.critBonus || 0),
      splash: (t.splash || 0) + (ef.splash || 0) + (!t.naval && t.branch === 'Artillery' && (t.splash || ef.splash) ? techValue(g, a.side, 'artillery.salvo') : 0),
      armorPen: Math.min(.95,armorPenetration(g,a,d)
        +(a.expCalibration?.15:0)
        +(fx(a).diagnosis&&d&&a.expDiagnosisId===d.id?.1*(a.expDiagnosisCount||0):0)
        +(a.elite&&!TYPES[a.type].naval&&g.units.some(v=>v.hp>0&&v.side===a.side&&fx(v).elitePenSupport&&dist(g,v,a)<=2)?.12:0)),
    };
  }
  // force: nothing survives (F.L.E.I.J.A.); otherwise C.C.'s Code Bearer saves her unit once per operation.
  // by: the side responsible when there is no attacking unit (a city battery).
  function kill(g, v, attacker, force = false, by = null) {
    if (v.hp > 0) return;
    if (fx(v).undying && !v.undyingUsed && !force) {
      v.hp = 1;
      v.undyingUsed = true;
      log(g, `${COMMANDERS[v.cmd].short} survives a lethal blow: Code Bearer.`, v.side);
      return;
    }
    v.hp = 0;
    dropCarriedEliminator(g, v, 'carrier destroyed');
    if(!v.warCounted){v.warCounted=true;
      recordWarEvent(g,'unitDestroyed',attacker?.side||by||v.side,{unitId:v.id,unitType:v.type,
        unitSide:v.side,commander:v.cmd||null,byCombat:!!attacker||!!by,
        group:warGroup(g,attacker),invasion:!!v.landingRefreshTurn&&v.landingRefreshTurn===g.turn});}
    // A sunk Carrier-Battleship takes the Knightmares aboard down with it.
    for (const c of v.cargo?.splice(0) || []) {
      c.hp = 0;
      kill(g, c, attacker, true);
    }
    // Urabe's Final Stand: his fall rallies friendly units within 2 hexes to High morale.
    if (fx(v).martyr) for (const w of g.units) if (w.hp > 0 && w.side === v.side && dist(g, w, v) <= 2) w.morale = 1;
    if (attacker) {
      if (attacker.cmd) {
        const k = attacker.cmd,
          tally = (g.missionKills ||= {}),
          instances = (g.missionCommanderKills ||= {}),
          instance = `${attacker.side}:${k}:${attacker.personal ? 'personal' : 'operation'}`;
        tally[k] = (tally[k] || 0) + 1;
        // Legacy aggregate tallies cannot distinguish officer instances; never inherit another one's kills.
        instances[instance] = (instances[instance] || 0) + 1;
        if (v.cmd) award(g, attacker.side, 'valor', `${COMMANDERS[k].short} defeated ${COMMANDERS[v.cmd].short}`);
        if (instances[instance] === 5) award(g, attacker.side, 'marksman', `${COMMANDERS[k].short} destroyed 5 units`);
      }
      attacker.kills++;
      attacker.xp = Math.min(5, attacker.xp + 1);
      attacker.morale = clamp(attacker.morale + 1, -3, 1);
    }
    if (v.cmd) log(g, `${COMMANDERS[v.cmd].short}'s unit is lost.`, v.side);
    newcomerKilled(g,v,attacker);
    hooks.kill?.(g, v, attacker, by);
  }
  function attack(g, id, c, r) {
    const a = g.units.find(u => u.id === id);
    if (!a) return { ok: false, reason: 'Unit not found.' };
    const why =
      turnReason(g, a.side) ||
      (a.hp <= 0 ? 'Unit destroyed' : a.morale <= -3 ? 'Unit is confused' : a.attacked ? 'Already fired' : null);
    if (why) return { ok: false, reason: why };
    const pr = preview(g, id, c, r);
    if (!pr) return { ok: false, reason: atSea(g, a) ? 'Embarked units cannot fire.' : 'No hostile target in range.' };
    const p = tile(g, c, r),
      d = unitAt(g, p),
      s = stationAt(g, p),
      f = fx(a),
      crit = random(g) < pr.crit,
      mult = (0.92 + random(g) * 0.16) * (crit ? pr.critMult : 1),
      hit = [];
    const timeStop = !!f.timeStop && a.timeStopTurn !== g.turn;
    const avoidance = genericLevel(g, a, TYPES[a.type].branch === 'Armor' ? 'blitzkrieg' : 'guerrilla');
    const evadeCounter = pr.counterAllowed && avoidance > 0 && random(g) < 0.12 * avoidance;
    // A volley has one firing state: retaliation and kill rewards cannot change later splash hits.
    const splashHits = pr.splash ? g.units
      .filter(v => v.hp > 0 && foe(g, v.side, a.side) && v.id !== d?.id && dist(g, v, p) === 1)
      .map(v => ({ unit: v, amount: Math.round(power(g, a, v, stationAt(g, v), false, false) * pr.splash) })) : [];
    // Keep track of any unused movement before firing; a kill that earns another attack
    // should not consume it. Limited skill repositioning must stay limited.
    const movementBeforeAttack = !a.moved
      ? { skillReposition: a.skillReposition || 0, withdrawMove: !!a.withdrawMove }
      : null;
    a.attacked = true;
    a.moved = true;
    a.skillReposition = 0;
    a.withdrawMove = false;
    a.launched = null;
    let dmg = 0,
      sd = 0;
    if (d) {
      dmg = newcomerIntercept(g,d,Math.round(pr.unit * mult));
      consumeDefensiveSkills(g, d, a);
      const priorHP=d.hp;
      d.hp = Math.max(0, d.hp - dmg);
      recordWarEvent(g,'damage',a.side,{targetSide:d.side,value:priorHP-d.hp,unitId:a.id,group:warGroup(g,a)});
      hit.push({ id: d.id, c: p.c, r: p.r, damage: dmg });
      // Senba's guard covers only the first attack each phase; Asahina reads who was struck this turn.
      d.struck = { turn: g.turn, side: a.side };
      if(d.skillMarks?.length)d.skillMarks=d.skillMarks.filter(m=>m.side!==a.side||!m.uses);
    }
    if (s && foe(g, s.owner, a.side)) {
      // Even after the defenses reach zero, another successful city assault
      // keeps its next regeneration suppressed.
      s.attackedSinceRegen = true;
      if (pr.shield) {
        sd = Math.min(s.shield, Math.round(pr.shield * mult));
        s.shield -= sd;
      }
    }
    if (f.terror && d && d.hp > 0) {
      lowerMorale(g, d, 1);
      if (f.terrorWeaken) d.despairWeakened = { side: a.side, value: Math.max(d.despairWeakened?.value || 0, f.terrorWeaken) };
    }
    const aef = eliteFx(a);
    if (aef.stun && d && d.hp > 0) {
      d.moved = true;
      d.attacked = true;
      lowerMorale(g, d, 1);
    }
    let retaliation = 0;
    if (d && d.hp > 0 && pr.counterAllowed && !evadeCounter) {
      // Worked out after the hit, so a damaged defender returns weaker fire (attack scales with remaining frame).
      retaliation = Math.round(power(g, d, a, stationAt(g, a), true) * (0.94 + random(g) * 0.12));
      const priorHP=a.hp;
      a.hp = Math.max(0, a.hp - retaliation);
      recordWarEvent(g,'damage',d.side,{targetSide:a.side,value:priorHP-a.hp,unitId:d.id,group:warGroup(g,d)});
      if (f.reflect) d.hp = Math.max(0, d.hp - Math.round(retaliation * f.reflect));
      kill(g, a, d);
    }
    if (splashHits.length) {
      for (const { unit: v, amount } of splashHits) {
        if (v.hp <= 0) continue;
        const priorHP=v.hp;
        v.hp = Math.max(0, v.hp - amount);
        recordWarEvent(g,'damage',a.side,{targetSide:v.side,value:priorHP-v.hp,unitId:a.id,group:warGroup(g,a)});
        hit.push({ id: v.id, c: v.c, r: v.r, damage: amount });
        kill(g, v, a);
      }
    }
    if (d && d.hp <= 0) kill(g, d, a);
    if(d)newcomerSupport(g,d,a);
    const destroyed = !!d && d.hp <= 0;
    const eliteBreakthrough = !!aef.breakthrough,
      eliteRelentless = !!aef.relentless;
    let cap = f.refire || aef.refire ? 2 : 1;
    // Breakthrough Doctrine: a kill at the cap may still earn one more breakthrough.
    if (destroyed && a.hp > 0 && (TYPES[a.type].breakthrough || eliteBreakthrough) && a.chain === cap) {
      const chance = !TYPES[a.type].naval && TYPES[a.type].branch === 'Armor' ? techValue(g, a.side, 'armor.assault') : 0;
      if (chance && random(g) < chance) cap++;
    }
    let breakthrough = false;
    if (destroyed && a.hp > 0 && (TYPES[a.type].breakthrough || eliteBreakthrough) && a.chain < cap) {
      // Breakthrough: a kill lets the frame fire again. Line and mainline frames get no extra movement; heavy
      // and super-heavy frames also regain movement on their first kill.
      a.chain++;
      a.attacked = false;
      if ((TYPES[a.type].relentless || eliteRelentless)) a.moved = false;
      breakthrough = true;
    } else if (destroyed && a.hp > 0 && (TYPES[a.type].relentless || eliteRelentless)) {
      // Heavy and super-heavy frames always fire again after a kill, beyond the breakthrough cap.
      a.attacked = false;
      breakthrough = true;
    }
    // Kallen's Ace of the Black Knights: her first kill each turn grants another attack.
    if (destroyed && a.hp > 0 && f.ace && a.aceTurn !== g.turn) {
      a.aceTurn = g.turn;
      if (breakthrough) grantReposition(a, 2);
      else { a.attacked = false; breakthrough = true; }
    }
    if (a.hp > 0 && aef.moveAfterAttack) { a.moved = false; a.skillReposition = 0; }
    if (destroyed && a.hp > 0 && aef.moveAfterKill) {
      a.moved = false;
      a.skillReposition = 0;
      a.eliteMoveAfterKill = true;
    }
    afterCommanderAttack(g,a,d,s,destroyed,timeStop);
    // Preserve the movement that was already available when a killing attack
    // refreshes another shot. Do not grant an extra move to a unit that had
    // spent it; existing Relentless, elite and commander rewards still apply.
    if (destroyed && a.hp > 0 && !a.attacked && movementBeforeAttack) {
      a.moved = false;
      if (!(TYPES[a.type].relentless || eliteRelentless || aef.moveAfterAttack || aef.moveAfterKill)) {
        if (!movementBeforeAttack.skillReposition && !movementBeforeAttack.withdrawMove) {
          a.skillReposition = 0;
          a.withdrawMove = false;
        } else {
          a.skillReposition = Math.max(a.skillReposition, movementBeforeAttack.skillReposition);
          a.withdrawMove ||= movementBeforeAttack.withdrawMove;
        }
      }
    }
    if(f.dashStrike)a.expDashTurn=g.turn;
    if(f.ziAmbush&&d?.cmd&&a.movedDistance>=2&&a.expZiAmbushTurn!==g.turn)a.expZiAmbushTurn=g.turn;
    if(f.highland)a.expHighlandTurn=g.turn;
    if(f.diagnosis&&d){const before=a.expDiagnosisId===d.id?a.expDiagnosisCount||0:0;a.expDiagnosisId=d.id;a.expDiagnosisCount=Math.min(3,before+1);}
    if(f.decapitation&&d?.cmd&&!(a.expDecapitationCd>0)&&!g.units.some(v=>v.hp>0&&v.side===d.side&&v.id!==d.id&&dist(g,v,d)===1)){d.expSilenced=true;a.expDecapitationCd=3;}
    if(f.afterimage&&destroyed&&a.expAfterimageTurn!==g.turn){a.expAfterimage=true;a.expAfterimageTurn=g.turn;}
    if(a.expCalibration){a.hp=Math.max(1,a.hp-Math.round(maxHP(a)*.08));delete a.expCalibration;}
    if(a.forcedOffensive)delete a.forcedOffensive;
    if(a.expRetrofitStrike)delete a.expRetrofitStrike;
    if(a.expNavalRelay)delete a.expNavalRelay;
    if(a.expBreach&&destroyed&&d&&!unitAt(g,d)&&(!stationAt(g,d)||stationAt(g,d).shield<=0)){
      const old={c:a.c,r:a.r};a.c=d.c;a.r=d.r;reindex(g,a,old);captureCity(g,a);delete a.expBreach;
    }
    log(
      g,
      `${COMMANDERS[a.cmd]?.short || TYPES[a.type].short}: ${crit ? 'critical hit · ' : ''}${dmg ? dmg + ' frame damage' : ''}${sd ? (dmg ? ' + ' : '') + sd + ' city damage' : ''}${destroyed ? ' · enemy destroyed' : ''}${breakthrough ? ' · breakthrough' : ''}${retaliation ? ' · ' + retaliation + ' counter-fire' : ''}.`,
      a.side,
    );
    checkVictory(g);
    return {
      ok: true,
      from: { c: a.c, r: a.r },
      to: { c: p.c, r: p.r },
      damage: dmg,
      shieldDamage: sd,
      crit,
      counter: retaliation,
      hit,
      destroyed,
      breakthrough,
    };
  }

  // ======== Economy and cities ========
  function income(g, side) {
    const refining = 1 + techValue(g, side, 'cities.refining');
    const total = g.stations
      .filter(s => s.owner === side)
      .reduce((a, s) => {
        const y = cityOutput(g, s);
        a.credits += y.credits*(s.expTaxUntil>=g.turn?.8:1);
        if(g.units.some(u=>u.hp>0&&u.side===side&&u.c===s.c&&u.r===s.r&&fx(u).nationalUnity))a.credits+=Math.round(y.credits*.15);
        if(g.units.some(u=>u.hp>0&&u.side===side&&u.c===s.c&&u.r===s.r&&fx(u).royalCompassion))a.credits+=Math.round(y.credits*.15);
        a.industry += y.industry;
        a.science += y.science;
        return a;
      }, { credits: 0, industry: 0, science: 0 });
    total.industry = Math.round(total.industry);
    total.science = Math.round(total.science);
    // Sakuradite deposits: extraction by refinery level, with Japan's output allocated among the powers; a level-3
    // refinery also exports for credits.
    total.sakuradite = 0;
    for (const d of g.sites || []) {
      total.sakuradite += (depositShares(g, d)[side] || 0) * refining * (g.units.some(u=>u.hp>0&&u.side===side&&fx(u).kyoto&&dist(g,u,d)<=2)?1.2:1);
      if (depositOwner(g, d) === side) total.credits += depositYield(g, d).credits;
    }
    if (g.mode !== 'campaign' && (g.mode === 'scenario' ? g.order.includes(side) : isMajor(g, side)) && alive(g, side)) total.sakuradite += SAKURADITE.national;
    total.sakuradite = Math.round(total.sakuradite);
    // Regional operations receive fixed off-map military funding in addition
    // to city output. Captured cities still add (or remove) their normal
    // earnings. Do not give stipends to eliminated powers.
    const support = g.mode === 'scenario' && alive(g, side) &&
      (g.stations.some(s => s.owner === side) ||
        g.scenario?.citylessFunding?.includes(side)) ? g.scenario?.funding?.[side] : null;
    if (support) for (const resource of ['credits','industry','science','sakuradite'])
      total[resource] += support[resource] || 0;
    return total;
  }
  // New units deploy on the city hex itself, naval units on the port's sea hex; nothing is built while a unit stands
  // there (move it off first).
  function recruitOptions(g, s, side, type = null) {
    if ((TYPES[type]?.naval ? s.portOwner || s.owner : s.owner) !== side) return [];
    const at = TYPES[type]?.naval ? s.portAt && tile(g, s.portAt.c, s.portAt.r) : tile(g, s.c, s.r);
    return at && !unitAt(g, at) ? [at] : [];
  }
  // Unit prices depend on the frame and stack size, not faction.
  function price(type, stack = 1, g = null, side = null) {
    const t = TYPES[type];
    return {
      credits: Math.round(t.cost * (1 + 0.85 * (stack - 1))),
      industry: Math.round(t.industry * (1 + 0.85 * (stack - 1))),
      sakuradite: Math.round((t.sakuradite ?? SAKURADITE.cost[t.cls] ?? 0) * (1 + 0.85 * (stack - 1))),
    };
  }
  function canBuy(g, s, type, stack = 1, vacating = null) {
    return !buyReason(g, s, type, stack, vacating);
  }
  function recruit(g, stationId, type, stack = 1, position) {
    const s = g.stations.find(s => s.id === stationId);
    const why = buyReason(g, s, type, stack);
    if (why) return { ok: false, reason: why };
    const producer = TYPES[type].naval ? (s.portOwner || s.owner) : s.owner;
    const options = recruitOptions(g, s, producer, type);
    const p = position ? options.find(p => p.c === position.c && p.r === position.r) : options[0];
    if (!p) return { ok: false, reason: 'Deployment hex unavailable.' };
    const cost = decreePrice(price(type, stack, g, producer),s);
    if(s.expDecree&&!TYPES[type].naval)delete s.expDecree;
    warSpend(g,producer,cost,'production');
    spend(funds(g, producer), cost);
    if (TYPES[type].naval) s.portProducedTurn = g.turn;
    else s.producedTurn = g.turn;
    const u = newUnit(g, type, producer, p.c, p.r, stack, null, false);
    log(g, `${TYPES[type].short} ×${stack} rolls out at ${s.name}. Ready next turn.`, producer);
    return { ok: true, unit: u };
  }

  function elitePrice(id, level = 1) {
    const e = ELITE_FORCES[id], t = e && TYPES[e.type];
    if (!t) return { credits: 0, industry: 0, sakuradite: 0 };
    const premium = 1 + 0.04 * Math.max(0, level - 1);
    return {
      credits: Math.round(t.cost * premium),
      industry: Math.round(t.industry * premium),
      sakuradite: SAKURADITE.elite[e.rarity] ?? 0,
    };
  }
  // Land elites use a city factory; amphibious elites use the independently owned
  // port and its separate one-unit-per-turn shipyard slot.
  // Mission-owned roster snapshots provide an explicit, save-safe borrowing map.
  // Outside Elite Campaign, ordinary faction unlock/recruit rules remain unchanged.
  function eliteEligible(g, side, id) {
    const e = ELITE_FORCES[id];
    if (!e) return false;
    const roster = eliteCampaign(g) ? g.campaign?.eliteRosters?.[side] :
      g?.scenario?.id === 'european-war' ? g.scenario.eliteRosters?.[side] : null;
    if (roster) return roster.includes(id);
    if (ufnBlackKnights(g, side)) return e.availableTo.includes('bk');
    return e.availableTo.includes(side) || (g.era === 'ufn2018' && side === 'eb' && e.availableTo.includes('britannia'));
  }
  function eliteDeployReason(g, s, id, profile = {}) {
    const e = ELITE_FORCES[id],
      rec = e && eliteRecord(profile, id),
      t = e && TYPES[e.type];
    if (!e || !s || !t) return 'Unavailable';
    const naval = !!t.naval,
      producer = naval ? (s.portOwner || s.owner) : s.owner,
      availableLevel = e.scenarioOnly && eliteScenario(g) ? 1 : rec?.level;
    return (
      (g.over ? 'Operation over' : producer !== g.phase ? (naval ? 'Not your port' : 'Not your city') : null) ||
      (naval && g.mode === 'campaign' ? 'Naval elites are unavailable in campaign' : null) ||
      (!naval ? cityBusyReason(g, s) : null) ||
      (!eliteEligible(g, producer, id) ? 'This Elite Force is not available to this faction' : null) ||
      (e.scenarioOnly && !eliteScenario(g) ? 'Available only in the relevant Elite scenario' : null) ||
      (!availableLevel ? `Locked — collect ${ELITE_UNLOCK_FRAGMENTS} fragments and unlock it in HQ` : null) ||
      (naval && (!s.portAt || (s.portLevel || 0) < t.port) ? `Requires a level-${t.port} port` : null) ||
      (!naval && s.tier < t.tier ? `Requires factory level ${t.tier}` : null) ||
      (g.eliteDeployed?.[id] ? 'Already deployed in this operation' : null) ||
      (naval
        ? s.portProducedTurn === g.turn ? 'This port already launched a unit this turn' : null
        : s.producedTurn === g.turn ? 'Already built here this turn' : null) ||
      (!recruitOptions(g, s, producer, e.type).length ? (naval ? 'A unit is on the port' : 'A unit is on the city') : null) ||
      shortfall(funds(g, producer), elitePrice(id, eliteCampaign(g) ? 1 : availableLevel || 1))
    );
  }
  function deployElite(g, stationId, id, profile = {}, position) {
    const s = g.stations.find(v => v.id === stationId),
      why = eliteDeployReason(g, s, id, profile);
    if (why) return { ok: false, reason: why };
    const e = ELITE_FORCES[id],
      t = TYPES[e.type],
      producer = t.naval ? (s.portOwner || s.owner) : s.owner,
      rec = e.scenarioOnly && eliteScenario(g) ? { level: 1 } : eliteRecord(profile, id),
      options = recruitOptions(g, s, producer, e.type),
      p = position ? options.find(v => v.c === position.c && v.r === position.r) : options[0],
      cost = elitePrice(id, eliteCampaign(g) ? 1 : rec.level);
    if (!p) return { ok: false, reason: 'Deployment hex unavailable.' };
    warSpend(g,producer,cost,'production');
    spend(funds(g, producer), cost);
    if (t.naval) s.portProducedTurn = g.turn;
    else s.producedTurn = g.turn;
    g.eliteDeployed ||= {};
    g.eliteDeployed[id] = true;
    const u = newUnit(g, e.type, producer, p.c, p.r, 1, null, false);
    u.elite = id;
    u.eliteLevel = eliteCampaign(g) ? 1 : rec.level;
    u.hp = maxHP(u);
    log(g, `${t.name} · Elite Lv.${u.eliteLevel} deploys at ${t.naval ? 'the port of ' : ''}${s.name}. Ready next turn.`, producer);
    return { ok: true, unit: u, cost };
  }
  // Rival factories can repeat Elite Forces indefinitely, but each frame must
  // satisfy its factory tier just as it does for a player.
  function aiEliteRecruitReason(g, s, id, vacating = null) {
    const e = ELITE_FORCES[id], t = e && TYPES[e.type];
    if ((!eliteAIProduction(g) && !eliteCampaign(g)) || !s || !e || !t) return 'Not an Elite AI operation';
    const naval = !!t.naval,
      producer = naval ? (s.portOwner || s.owner) : s.owner;
    if (producer === g.player || !eliteEligible(g, producer, id) ||
        (eliteConquest(g) && (naval || !isMajor(g, producer))) ||
        (eliteScenario(g) && !g.order.includes(producer)) ||
        (eliteCampaign(g) && (naval || (!foe(g, producer, g.player) &&
          !g.campaign?.production?.includes(producer)))) ||
        (e.scenarioOnly && !eliteScenario(g)))
      return 'Not an eligible Elite AI factory or port';
    return (
      turnReason(g, producer) ||
      (!naval ? cityBusyReason(g, s) : null) ||
      (naval && (!s.portAt || (s.portLevel || 0) < t.port)
        ? `Requires port level ${t.port}` : null) ||
      (!naval && s.tier < t.tier ? `Requires factory level ${t.tier}` : null) ||
      ((naval ? s.portProducedTurn : s.producedTurn) === g.turn
        ? 'Already produced here this turn' : null) ||
      (!recruitOptions(g, s, producer, e.type).length &&
        !(vacating && !naval && unitAt(g, s) === vacating)
        ? (naval ? 'A unit is on the port' : 'A unit is on the city') : null) ||
      shortfall(funds(g, producer), elitePrice(id, eliteCampaign(g) ? 3 : 1))
    );
  }
  function recruitAIElite(g, stationId, id) {
    const s = g.stations.find(v => v.id === stationId);
    const why = aiEliteRecruitReason(g, s, id);
    if (why) return { ok: false, reason: why };
    const e = ELITE_FORCES[id], t = TYPES[e.type],
      producer = t.naval ? (s.portOwner || s.owner) : s.owner,
      p = recruitOptions(g, s, producer, e.type)[0],
      level = eliteCampaign(g) ? 3 : 1,
      cost = elitePrice(id, level);
    if (!p) return { ok: false, reason: 'Deployment hex unavailable' };
    warSpend(g,producer,cost,'production');
    spend(funds(g, producer), cost);
    if (t.naval) s.portProducedTurn = g.turn;
    else s.producedTurn = g.turn;
    const u = newUnit(g, e.type, producer, p.c, p.r, 1, null, false);
    u.eliteLevel = level;
    u.hp = maxHP(u);
    log(g, `${t.name} · Elite Lv.${level} deploys at ${t.naval ? 'the port of ' : ''}${s.name}. Ready next turn.`, producer);
    return { ok: true, unit: u, cost };
  }
  function unitStats(g, u) {
    const t = TYPES[u.type], s = eliteScale(u), r = rangeOf(g, u);
    return {
      hp: maxHP(u),
      attack: Math.round(intrinsicAttack(g, u)),
      armor: t.armor + s.armor,
      move: isSea(tile(g, u.c, u.r))
        ? t.naval === 'amphibious' ? amphibiousSea(g, u) : atSea(g, u) ? seaMove(g, u) : movement(g, u)
        : movement(g, u),
      min: r.min,
      max: r.max,
    };
  }
  // u: the unit being reinforced, for Inoue's Resistance Logistics discount (30% off credits and industry).
  function reinforceCost(type, g = null, side = null, u = null) {
    const p = price(type, 1, g, side),
      k = u && g && logisticsNear(g, u) ? 0.7 : 1;
    return { credits: Math.round(p.credits * k), industry: Math.round(p.industry * k), sakuradite: p.sakuradite };
  }
  // Repairs restore 35% of the frame for a fifth of the unit's build price.
  function repairCost(u, g = null) {
    const half = g && skillNear(g, u, 'repairSupply', 2) ? 0.5 : 1;
    const staff = g && skillNear(g, u, 'staffRepair', 1) ? 0.8 : 1;
    const camelot = g && u.elite && !TYPES[u.type].naval && skillNear(g, u, 'combatEngineering', 2) ? 0.8 : 1;
    return Math.max(10, Math.round(baseRepairCost(u) * half * staff * camelot * (g && logisticsNear(g, u) ? 0.7 : 1)));
  }
  function baseRepairCost(u) {
    return Math.max(20, Math.round(price(u.type, u.stack, null, u.side).credits * 0.2));
  }
  function reinforce(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = reinforceReason(g, u);
    if (why) return { ok: false, reason: why };
    const cost = reinforceCost(u.type, g, u.side, u),
      e = funds(g, u.side);
    warSpend(g,u.side,cost,'reinforcement');
    spend(e, cost);
    const old = maxHP(u);
    u.stack++;
    u.hp += maxHP(u) - old;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} reinforced to ${u.stack} frames.`, u.side);
    return { ok: true };
  }
  function repair(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = repairReason(g, u);
    if (why) return { ok: false, reason: why };
    const cost = repairCost(u, g);
    warSpend(g,u.side,{credits:cost},'repair');
    funds(g, u.side).credits -= cost;
    const amount = Math.min(maxHP(u) - u.hp, Math.round(maxHP(u) * 0.35));
    u.hp += amount;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} repairs ${amount} frame.`, u.side);
    return { ok: true, amount };
  }
  const BUILDINGS = {
    factory: {
      name: 'Knightmare factory',
      field: 'tier',
      desc: 'Unlocks heavier frames (level 2: mainline, raider and rocket; level 3: heavy, super-heavy and siege). +10 industry and +60 defense per level.',
    },
    lab: {
      name: 'Research lab',
      field: 'lab',
      desc: 'Produces research (+8 per level). Research banked when you win becomes command tokens.',
    },
    port: {
      name: 'Port',
      field: 'portLevel',
      desc: 'Coastal cities only, on a sea hex beside the city. Level 1 builds amphibious Knightmares, level 2 Carrier-Battleships; naval units berthed there repair 10%, 20% or 30% a turn, and level 3 enables tier IV naval research.',
    },
    refinery: {
      name: 'Sakuradite refinery',
      field: 'refinery',
      desc: 'Only where there is a Sakuradite deposit. Extracts 25% of its output, then 50%, 75% and 100% (+15 credits) at levels 1–3.',
    },
  };
  function buildingLevel(s, kind) {
    return s[BUILDINGS[kind].field] || 0;
  }
  function buildCost(s, kind) {
    const l = buildingLevel(s, kind);
    // A factory wrecked to level 0 (F.L.E.I.J.A.) is rebuilt for the price of a level-1 lab.
    if (kind === 'factory') return l ? { credits: 160 * l, industry: 40 * l } : { credits: 110, industry: 25 };
    if (kind === 'lab') return { credits: 110 * (l + 1), industry: 25 * (l + 1) };
    if (kind === 'port') return { credits: 140 * (l + 1), industry: 35 * (l + 1) };
    return { credits: 120 * (l + 1), industry: 30 * (l + 1) };
  }
  // Remember each city's output before building contributions, including custom campaign cities.
  // World-city data also recovers the foundation in older saves whose factories were already damaged.
  // The foundation can be negative: some starting factories have less output than upgrades add.
  function buildingFoundation(g, s) {
    if (s.buildingFoundation) return s.buildingFoundation;
    const row = g.mode !== 'campaign' && CITY_DATA.find(r => r[0] === s.name),
      base = row ? cityBase(row) : s,
      tier = row ? row[4] : s.tier || 0,
      lab = row ? row[5] ? 1 : 0 : s.lab || 0;
    return s.buildingFoundation ||= {
      industry: base.industry - 10 * tier,
      science: base.science - 8 * lab,
      maxShield: base.maxShield - (row ? 0 : s.fortBonus || 0) - 60 * tier,
    };
  }
  function syncBuildings(g, s) {
    const base = buildingFoundation(g, s);
    s.industry = Math.max(0, base.industry + 10 * (s.tier || 0));
    s.science = Math.max(0, base.science + 8 * (s.lab || 0));
    s.maxShield = Math.max(0, base.maxShield + 60 * (s.tier || 0) + (s.fortBonus || 0));
  }
  function build(g, id, kind) {
    const s = g.stations.find(s => s.id === id),
      b = BUILDINGS[kind];
    const why = buildReason(g, s, kind);
    if (why) return { ok: false, reason: why };
    const cost = decreePrice(buildCost(s, kind),s),
      e = funds(g, s.owner);
    if(s.expDecree)delete s.expDecree;
    buildingFoundation(g, s);
    warSpend(g,s.owner,cost,'construction');
    spend(e, cost);
    if (kind === 'port' && !s.portAt) {
      const t = portSite(g, s);
      s.portAt = { c: t.c, r: t.r };
      s.portOwner = s.owner;
    }
    s[b.field] = buildingLevel(s, kind) + 1;
    if (kind === 'factory') {
      syncBuildings(g, s);
      s.shield = Math.min(s.maxShield, s.shield + 60);
    } else if (kind === 'lab') syncBuildings(g, s);
    log(g, `${s.name}: ${b.name} upgraded to level ${s[b.field]}.`, s.owner);
    return { ok: true };
  }
  // ======== Player city automation ========
  // Per-city automation is intentionally simple: each city either builds one exact normal unit every turn or is off.
  // Global Production Command settings handle building upgrades, formation size and protected reserves.
  const AUTOMATION_DEFAULT_RESERVE = { credits: 500, industry: 150, sakuradite: 25 };
  function automationState(g) {
    const a = (g.automation ||= {});
    a.enabled ??= false;
    a.autoUpgrade ??= true;
    a.stack = [1, 2, 3].includes(+a.stack) ? +a.stack : 1;
    a.reserve ||= {};
    for (const [k, v] of Object.entries(AUTOMATION_DEFAULT_RESERVE))
      if (!Number.isFinite(+a.reserve[k]) || +a.reserve[k] < 0) a.reserve[k] = v;
      else a.reserve[k] = Math.floor(+a.reserve[k]);
    a.cities ||= {};
    // Clean up the earlier policy prototype if a branch save already contains it.
    delete a.autoProduce;
    delete a.defaultPolicy;
    for (const o of Object.values(a.cities)) {
      delete o.policy;
      delete o.autoUpgrade;
      delete o.autoProduce;
      if (o.unit && !TYPES[o.unit]) delete o.unit;
    }
    return a;
  }
  function automationUnitOptions(g, s) {
    if (!s) return [];
    const land = g.buildable?.[s.owner] || Object.values(lineupOf(g, s.owner)),
      navy = s.portAt || portSite(g, s) ? navalTypes(g, s.owner) : [];
    return [...new Set([...land, ...navy])]
      .filter(id => {
        const t = TYPES[id];
        return t && !t.elite && !t.campaign && (t.side === s.owner || t.side === 'neutral' || (g.buildable?.[s.owner] || []).includes(id));
      })
      .sort((a, b) => {
        const ta = TYPES[a],
          tb = TYPES[b],
          navalA = ta.naval ? 1 : 0,
          navalB = tb.naval ? 1 : 0,
          branchOrder = { Infantry: 0, Armor: 1, Artillery: 2 };
        return (
          navalA - navalB ||
          (branchOrder[ta.branch] ?? 9) - (branchOrder[tb.branch] ?? 9) ||
          ta.tier - tb.tier ||
          ta.name.localeCompare(tb.name)
        );
      });
  }
  function cityAutomation(g, s) {
    const a = automationState(g),
      o = a.cities?.[s?.id] || {},
      options = automationUnitOptions(g, s);
    return { unit: options.includes(o.unit) ? o.unit : null };
  }
  function setCityAutomation(g, stationId, patch = {}) {
    const a = automationState(g),
      s = g.stations.find(v => v.id === +stationId);
    if (!s) return { ok: false, reason: 'Unknown city' };
    const o = (a.cities[s.id] ||= {});
    if ('unit' in patch) {
      if (patch.unit == null || patch.unit === '') delete o.unit;
      else if (!automationUnitOptions(g, s).includes(patch.unit)) return { ok: false, reason: 'This city cannot queue that unit type' };
      else o.unit = patch.unit;
    }
    if (!Object.keys(o).length) delete a.cities[s.id];
    return { ok: true, settings: cityAutomation(g, s) };
  }
  function automationReserveAllows(g, side, cost = {}, reserve = null) {
    const e = funds(g, side),
      r = reserve || automationState(g).reserve;
    // A reserve only guards resources this order spends: low Sakuradite must not stop a frame that costs none.
    return ['credits', 'industry', 'sakuradite'].every(k => !cost[k] || (e?.[k] || 0) - cost[k] >= (r?.[k] || 0));
  }
  function automationUpgradeOrder(g, s, unit) {
    const t = TYPES[unit];
    const order = [];
    // If a queued unit is blocked by infrastructure, upgrade that infrastructure first.
    if (t?.naval && (s.portLevel || 0) < (t.port || 0)) order.push('port');
    if (t && !t.naval && s.tier < t.tier) order.push('factory');
    // Otherwise improve the economy in a predictable global order.
    order.push('refinery', 'lab', 'factory', 'port');
    return [...new Set(order)];
  }
  function emptyAutomationReport() {
    return { units: 0, upgrades: 0, spent: { credits: 0, industry: 0, sakuradite: 0 }, entries: [] };
  }
  function addAutomationSpend(report, cost = {}) {
    for (const k of ['credits', 'industry', 'sakuradite']) report.spent[k] += cost[k] || 0;
  }
  function runCityAutomation(g, side = g.player, opts = {}) {
    const a = automationState(g),
      report = emptyAutomationReport();
    if (g.mode !== 'conquest' || g.over || g.phase !== side || (!a.enabled && !opts.force)) return report;
    const reserve = a.reserve;
    for (const s of g.stations.filter(v => v.owner === side).sort((x, y) => x.id - y.id)) {
      const unit = cityAutomation(g, s).unit;
      if (a.autoUpgrade) {
        for (const kind of automationUpgradeOrder(g, s, unit)) {
          if (buildReason(g, s, kind)) continue;
          const cost = buildCost(s, kind);
          if (!automationReserveAllows(g, side, cost, reserve)) continue;
          const r = build(g, s.id, kind);
          if (r.ok) {
            report.upgrades++;
            addAutomationSpend(report, cost);
            report.entries.push({ kind: 'upgrade', city: s.name, building: kind, cost });
            break;
          }
        }
      }
      if (!unit || (TYPES[unit].naval ? s.portProducedTurn : s.producedTurn) === g.turn) continue;
      const t = TYPES[unit],
        stack = t.naval === 'ship' ? 1 : a.stack,
        cost = price(unit, stack, g, side);
      if (!automationReserveAllows(g, side, cost, reserve) || buyReason(g, s, unit, stack)) continue;
      const r = recruit(g, s.id, unit, stack);
      if (r.ok) {
        report.units++;
        addAutomationSpend(report, cost);
        report.entries.push({ kind: 'unit', city: s.name, type: unit, stack, cost });
      }
    }
    a.lastReport = { ...report, turn: g.turn };
    if (report.units || report.upgrades)
      log(
        g,
        `AUTOMATED LOGISTICS: ${report.units} unit${report.units === 1 ? '' : 's'} produced · ${report.upgrades} building upgrade${report.upgrades === 1 ? '' : 's'} · ${report.spent.credits} credits · ${report.spent.industry} industry${report.spent.sakuradite ? ` · ${report.spent.sakuradite} Sakuradite` : ''} spent.`,
        side,
      );
    return report;
  }
  function bulkCityUpgrade(g, side = g.player, kind) {
    const report = emptyAutomationReport(),
      a = automationState(g);
    if (g.mode !== 'conquest') return { ...report, reason: 'Production Command is Conquest-only' };
    if (g.over || g.phase !== side) return { ...report, reason: 'Not your turn' };
    if (!BUILDINGS[kind]) return { ...report, reason: 'Unknown building' };
    for (const s of g.stations.filter(v => v.owner === side).sort((x, y) => x.id - y.id)) {
      if (buildReason(g, s, kind)) continue;
      const cost = buildCost(s, kind);
      if (!automationReserveAllows(g, side, cost, a.reserve)) continue;
      const r = build(g, s.id, kind);
      if (!r.ok) continue;
      report.upgrades++;
      addAutomationSpend(report, cost);
      report.entries.push({ kind: 'upgrade', city: s.name, building: kind, cost });
    }
    a.lastReport = { ...report, turn: g.turn, bulk: kind };
    return report;
  }

  function assign(g, id, k) {
    const u = g.units.find(u => u.id === id),
      a = COMMANDERS[k];
    const why = assignReason(g, u, k);
    if (why) return { ok: false, reason: why };
    funds(g, u.side).credits -= a.cost;
    const old = maxHP(u);
    u.cmd = k;
    u.personal = true;
    u.cmdRank = g.roster[k].rank;
    u.hp += maxHP(u) - old;
    log(g, `${a.short} takes command of ${TYPES[u.type].short}.`, u.side);
    return { ok: true };
  }
  // Command actions share cooldown/range validation; only targeted actions require a picker.
  function actionTargets(g, u) {
    if (!u || !COMMANDERS[u.cmd]?.action) return [];
    const kind = COMMANDERS[u.cmd].action.kind;
    if (kind === 'command') return commandTargets(g, u);
    if (kind === 'special') return newcomerTargets(g,u);
    return g.units.filter(v => v.hp > 0 && !atSea(g, v) && dist(g, u, v) <= (kind === 'cleanse' ? 1 : 2) &&
      (kind === 'cleanse' ? v.side === u.side : kind === 'withdraw' ? v.id !== u.id && v.side === u.side && v.attacked && v.morale > -3
        : foe(g, v.side, u.side)));
  }
  function feint(g, id, targetId = null) {
    const u = g.units.find(v => v.id === id), why = feintReason(g, u);
    if (why) return { ok: false, reason: why };
    const action = COMMANDERS[u.cmd].action, options = actionTargets(g, u);
    if (action.kind === 'special') return newcomerUse(g,u,targetId);
    if (['command', 'designate', 'stratagem'].includes(action.kind)) {
      const v = targetId == null ? options.sort((a, b) => TYPES[b.type].attack * b.stack - TYPES[a.type].attack * a.stack || a.id - b.id)[0]
        : options.find(v => v.id === targetId);
      if (!v) return { ok: false, reason: 'Choose a valid target within 2 hexes' };
      if (action.kind === 'command') {
        v.moved = v.attacked = false;
        v.skillReposition = 0;
        v.withdrawMove = false;
        // Keep chain/ace/reposition stamps: an extra activation must not refresh once-per-turn skills.
      } else addTargetMark(v, { side: u.side, source: u.id, range: 2,
        damage: action.kind === 'designate' ? 0.2 : 0, noCounter: action.kind === 'stratagem' });
      u.feintCD = 3;
      log(g, `${action.verb}: ${COMMANDERS[v.cmd]?.short || TYPES[v.type].short} ${action.kind === 'command' ? 'acts again' : 'designated'}.`, u.side);
      return { ok: true, target: v.id, affected: 1 };
    }
    for (const v of options) {
      if (action.kind === 'cleanse') { v.morale = Math.max(0, v.morale); v.moraleWard = { side: u.side }; }
      else if (action.kind === 'withdraw') { v.moved = false; v.withdrawMove = true; v.skillReposition = 0; }
      else lowerMorale(g, v, 2);
    }
    u.feintCD = 3;
    log(g, `${action.verb} affects ${options.length} units.`, u.side);
    return { ok: true, affected: options.length };
  }

  // ======== Black Knights and JLF commanders: allegiance and signature skills ========
  // Only the 2018 U.F.N. coalition may field Black Knights and JLF
  // commanders; the 2017 Chinese Federation is independent.
  const ALLIES = { bk: ['jlf'] };
  function serves(k, side, g = null) {
    const a = COMMANDERS[k];
    // In 2018, former E.U. and Black Knights commanders serve the united federation.
    if (g?.mode === 'conquest' && g.era === 'ufn2018') {
      if (side === 'cf' && ['cf', 'eu', 'bk', 'jlf'].includes(a?.side)) return true;
      if (side === 'eb' && ['eb', 'britannia'].includes(a?.side)) return true;
    }
    return !!a && (a.side === side || !!ALLIES[side]?.includes(a.side));
  }
  // Zero's Tactical Command: friendly units within 2 hexes (not his own) that have already moved or fired.
  function commandTargets(g, u) {
    return g.units.filter(
      v => v.hp > 0 && v.side === u.side && v.id !== u.id && (v.moved || v.attacked) && !atSea(g, v) && v.morale > -3 && dist(g, u, v) <= 2,
    );
  }
  const skillNear = (g, u, flag, range, self = true) =>
    g.units.some(
      v => v.hp > 0 && !atSea(g, v) && v.side === u.side && (self || v.id !== u.id) && fx(v)[flag] &&
        (!v.auraDisrupted || !['orderCommander', 'screenedFire'].includes(flag)) && dist(g, v, u) <= range,
    );
  function friendlyNeighbors(g, u, predicate = () => true) {
    return g.units.filter(v => v.hp > 0 && !atSea(g, v) && v.side === u.side && v.id !== u.id && dist(g, u, v) === 1 && predicate(v));
  }
  function lowerMorale(g, u, steps) {
    if (!u.moraleWard) u.morale = Math.max(moraleFloor(g, u), u.morale - steps);
  }
  function addTargetMark(u, mark) {
    u.skillMarks ||= [];
    u.skillMarks = u.skillMarks.filter(m => !(m.side === mark.side && m.source === mark.source));
    u.skillMarks.push(mark);
  }
  function targetMarked(g, attacker, victim) {
    let damage = 0, noCounter = false;
    for (const m of victim?.skillMarks || []) {
      if (m.side !== attacker.side) continue;
      if (m.range) {
        const source = g.units.find(v => v.id === m.source && v.hp > 0 && !atSea(g, v));
        if (!source || dist(g, source, attacker) > m.range) continue;
      }
      damage = Math.max(damage, m.damage || 0);
      noCounter ||= !!m.noCounter;
    }
    return { damage, noCounter };
  }
  function armorPenetration(g, u, target = null) {
    const engineering = skillNear(g, u, 'engineeringPen', 2) ? 0.1 : 0,
      harken = target && TYPES[u.type].branch === 'Infantry' && TYPES[target.type].branch === 'Armor'
        ? techValue(g, u.side, 'infantry.harken')
        : 0;
    return clamp(TYPES[u.type].pen + (fx(u).pen || 0) + (eliteFx(u).pen || 0) + engineering + harken, 0, 0.95);
  }
  function commanderAttack(g, u, target, counter) {
    const f = fx(u), friends = friendlyNeighbors(g, u);
    let mult = 1;
    if (counter) {
      if (u.guardReady && u.held && skillNear(g, u, 'defensiveDoctrine', 2)) mult *= 1.25;
      return mult;
    }
    if (u.assaultInspired) mult *= 1 + u.assaultInspired.value;
    if (!u.cmd && skillNear(g, u, 'commanderlessAttack', 1, false)) mult *= 1.1;
    if (TYPES[u.type].branch === 'Infantry' && skillNear(g, u, 'infantryCommand', 1, false)) mult *= 1.15;
    if (TYPES[u.type].branch === 'Armor' && skillNear(g, u, 'armorLeader', 2, false)) mult *= 1.1;
    if (f.loneRaider && !friends.length) mult *= 1 + f.loneRaider;
    if (f.runCharge && u.movedDistance >= 2) mult *= 1 + f.runCharge;
    if (f.combinedArms && friends.some(v => TYPES[v.type].branch !== TYPES[u.type].branch)) mult *= 1 + f.combinedArms;
    if (TYPES[u.type].branch === 'Armor' && friends.some(v => TYPES[v.type].branch === 'Armor') && skillNear(g, u, 'orderCommander', 1)) mult *= 1.15;
    if (!target) return mult;
    if (f.duelist && target.cmd) mult *= 1 + f.duelist;
    if (f.intrigueBonus && target.cmd) mult *= 1 + f.intrigueBonus;
    if (f.finisher && target.hp / maxHP(target) < 0.5) mult *= 1 + f.finisher;
    if (f.opener && target.hp >= maxHP(target)) mult *= 1 + f.opener;
    if (f.pursuit && target.lastTurnMoved) mult *= 1 + f.pursuit;
    mult *= 1 + targetMarked(g, u, target).damage;
    if (rangeOf(g, u).max > 1 && skillNear(g, u, 'screenedFire', 2) &&
      g.units.some(v => v.hp > 0 && !atSea(g, v) && v.side === u.side && TYPES[v.type].branch !== 'Artillery' && dist(g, v, target) === 1)) mult *= 1.2;
    return mult;
  }
  function bodyguarded(g, target) {
    return !!target.cmd && skillNear(g, target, 'bodyguard', 1, false);
  }
  function commanderDefense(g, target, attacker, counter, direct) {
    const f = fx(target), friends = friendlyNeighbors(g, target),
      guarded = bodyguarded(g, target);
    let mult = guarded ? 0.9 : 1;
    if (skillNear(g, target, 'calmDefense', 1)) mult *= 0.9;
    if (target.guardReady && target.held && skillNear(g, target, 'veteranSupport', 1, false)) mult *= 0.9;
    if (f.loneRisk && !friends.length) mult *= f.loneRisk;
    if (f.steadyRanks && friends.length >= 2) mult *= f.steadyRanks;
    if (counter && f.swordplay && dist(g, attacker, target) === 1) mult *= f.swordplay;
    if (!counter && direct) {
      if (f.foresight && target.foresightTurn !== g.turn) mult *= f.foresight;
      if (f.liveOn && target.hp / maxHP(target) < 0.4 && target.liveOnTurn !== g.turn) mult *= f.liveOn;
      if (guarded && target.bodyguardTurn !== g.turn) mult *= 0.8;
    }
    return mult;
  }
  function consumeDefensiveSkills(g, target, attacker) {
    const f = fx(target);
    if (f.guard && target.guardReady && target.held) target.guardStamp = guardStamp(g);
    if (f.foresight) target.foresightTurn = g.turn;
    if (f.liveOn && target.hp / maxHP(target) < 0.4) target.liveOnTurn = g.turn;
    if (bodyguarded(g, target)) target.bodyguardTurn = g.turn;
  }
  function grantReposition(u, range) {
    // Preserve a frame's unrestricted restored movement; a skill only fills a missing movement action.
    if (u.moved) { u.moved = false; u.skillReposition = range; }
  }
  function afterCommanderAttack(g, a, d, city, destroyed, timeStop) {
    const f = fx(a);
    if (d?.hp > 0) {
      if (f.targetMark) addTargetMark(d, { side: a.side, source: a.id, damage: f.targetMark });
      if (f.intrigue && d.cmd) d.auraDisrupted = { side: a.side };
    }
    if (city && foe(g, city.owner, a.side)) {
      if (f.focusBombard) {
        const old = a.focusCity;
        const count = old?.city === city.id && old.lastTurn >= g.turn - 1 ? Math.min(3, old.count + (old.lastTurn < g.turn ? 1 : 0)) : 0;
        a.focusCity = { city: city.id, count, lastTurn: g.turn };
      }
      if (f.siegeMark && a.siegeMarkTurn !== g.turn) {
        city.bombardMark = { side: a.side, value: f.siegeMark };
        a.siegeMarkTurn = g.turn;
      }
    } else if (f.focusBombard) delete a.focusCity;
    if (timeStop) {
      a.timeStopTurn = g.turn;
      if (a.hp > 0) a.hp = Math.max(1, a.hp - Math.round(maxHP(a) * f.timeStop));
    }
    if (a.hp <= 0) return;
    if (f.reposition && a.repositionTurn !== g.turn) { a.repositionTurn = g.turn; grantReposition(a, f.reposition); }
    if (!destroyed) return;
    if (f.killReposition && a.killRepositionTurn !== g.turn) { a.killRepositionTurn = g.turn; grantReposition(a, f.killReposition); }
    if (f.killHeal && a.killHealTurn !== g.turn) { a.killHealTurn = g.turn; a.hp = Math.min(maxHP(a), a.hp + Math.round(maxHP(a) * f.killHeal)); }
    if (f.assaultLeader && a.assaultLeaderTurn !== g.turn) {
      a.assaultLeaderTurn = g.turn;
      for (const v of g.units) {
        if (v.hp <= 0 || atSea(g, v) || v.side !== a.side || v.id === a.id || dist(g, a, v) > (f.assaultRange || 1)) continue;
        v.assaultInspired = { side: a.side, value: Math.max(v.assaultInspired?.value || 0, f.assaultLeader) };
      }
    }
  }
  function bombardBonus(g, u, city) {
    if (!city) return 1;
    const raiko=TYPES[u.type].branch==='Artillery'&&skillNear(g,u,'raikoCity',2)?1.15:1;
    let mult = city.bombardMark?.side === u.side ? 1 + city.bombardMark.value : 1;
    const old = u.focusCity;
    if (fx(u).focusBombard && old?.city === city.id && old.lastTurn >= g.turn - 1)
      mult *= 1 + Math.min(3, old.count + (old.lastTurn < g.turn ? 1 : 0)) * fx(u).focusBombard;
    return mult*raiko;
  }
  function treasuryBonus(g, city) {
    const holder = g.units.find(u => u.hp > 0 && u.side === city.owner && u.c === city.c && u.r === city.r && fx(u).treasury);
    return 1 + (holder ? fx(holder).treasury : 0);
  }
  function commanderStatusText(g, u) {
    const out = [];
    if (u.skillMarks?.length) out.push('Designated target');
    if (u.auraDisrupted) out.push('Command damage aura suppressed');
    if (u.moraleWard) out.push('Protected against morale disruption');
    if (u.assaultInspired) out.push(`Inspired: attack damage +${Math.round(u.assaultInspired.value * 100)}%`);
    if (u.despairWeakened) out.push(`Despair: damage dealt −${Math.round(u.despairWeakened.value * 100)}%`);
    if (!u.moved && u.skillReposition) out.push(`Reposition: up to ${u.skillReposition} hexes`);
    if (!u.moved && u.withdrawMove) out.push('Withdrawal movement ready');
    return out.join(' · ');
  }
  // Tohdoh's Miracle Worker: 1 for units beside him; 2 for Tohdoh himself with two or more friendly units adjacent.
  function miracle(g, u) {
    if (fx(u).miracle)
      return g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && dist(g, v, u) === 1).length >= 2 ? 2 : 0;
    return skillNear(g, u, 'miracle', 1, false) ? 1 : 0;
  }
  const guardStamp = g => g.turn;
  // Attack multiplier: Miracle Worker counter-fire, Urabe's Final Stand, Tamaki's Reckless Charge.
  function skillAttack(g, u, counter) {
    const f = fx(u);
    let m = counter ? [1, 1.25, 1.4][miracle(g, u)] : 1;
    if (f.lastStand && u.hp / maxHP(u) < 0.4) m *= 1 + f.lastStand;
    if (f.charge && !counter && u.moved && !u.chain) m *= 1 + f.charge;
    return m;
  }
  // Damage-taken multiplier: Miracle Worker, Senba's Veteran's Guard, Katase's Prepared Position.
  function skillDefense(g, target, counter, direct = true) {
    const tf = fx(target),
      ground = tile(g, target.c, target.r);
    let m = [1, 0.9, 0.8][miracle(g, target)];
    if (tf.guard && !counter && direct && target.guardReady && target.held && target.guardStamp !== guardStamp(g)) m *= tf.guard;
    if (
      skillNear(g, target, 'prepared', 1) &&
      (ground?.terrain === 'mountain' || g.stations.some(s => s.owner === target.side && dist(g, s, target) <= 1))
    )
      m *= 0.85;
    return m;
  }
  // Inoue's Resistance Logistics (repair and reinforce discount, extra city repair) and Minami's spotting reach.
  const logisticsNear = (g, u) =>
    g.units.some(v => v.hp > 0 && v.side === u.side && fx(v).logistics && dist(g, v, u) <= fx(v).logistics);
  const spotted = (g, u) =>
    g.units.some(v => v.hp > 0 && v.side === u.side && fx(v).spotter && dist(g, v, u) <= fx(v).spotter);

  // Approved newcomers: active powers and reactive combat effects.
  // Existing commanders retain their original skill definitions and mechanics.
  function newcomerTargets(g,u){
    const a=COMMANDERS[u?.cmd]?.action,k=a?.target,range=a?.range||0;
    if(!k)return [];
    if(k==='self')return [u].filter(v=>v.hp>0&&(u.cmd==='tianzi'
      ? g.stations.some(s=>s.owner===u.side&&dist(g,s,u)<=3)
      : u.cmd==='chengzhong' ? g.stations.some(s=>foe(g,s.owner,u.side)&&dist(g,s,u)<=2):true));
    return g.units.filter(v=>v.hp>0&&!atSea(g,v)&&dist(g,u,v)<=range&&(
      ['enemy','enemyCommander'].includes(k)
        ? foe(g,v.side,u.side)&&(k!=='enemyCommander'||!!v.cmd)&&
          (u.cmd!=='indira'||['Infantry','Armor'].every(b=>g.units.some(x=>x.hp>0&&x.side===u.side&&TYPES[x.type].branch===b&&dist(g,x,v)===1)))
        : v.id!==u.id&&v.side===u.side&&(k==='ally'||k==='commander'&&!!COMMANDERS[v.cmd]?.action||
          k==='elite'&&!!v.elite||k==='ship'&&isShip(v)||k==='wounded'&&v.hp<maxHP(v)||
          k==='garrison'&&stationAt(g,v)?.owner===v.side&&!v.elite&&!isShip(v)&&v.stack<3)
    ));
  }
  function newcomerUse(g,u,targetId){
    const choices=newcomerTargets(g,u),v=targetId==null?choices[0]:choices.find(x=>x.id===targetId);
    if(!v)return {ok:false,reason:'No eligible target within range.'};
    const nearby=predicate=>g.units.find(w=>w.hp>0&&w.side===u.side&&w.id!==u.id&&!atSea(g,w)&&predicate(w));
    switch(u.cmd){
      case 'marrybell':v.forcedOffensive=true;break;
      case 'norland':v.expOverwatch=true;break;
      case 'sakuya':v.expDisabledNext=true;break;
      case 'charles':v.feintCD=Math.max(0,(v.feintCD||0)-2);break;
      case 'lloyd':v.expCalibration=true;break;
      case 'sophie':{
        const w=nearby(w=>w.id!==v.id&&dist(g,u,w)<=2&&dist(g,v,w)<=2);
        if(!w)return {ok:false,reason:'Need two friendly formations within 2 hexes.'};
        v.expLink={partner:w.id};w.expLink={partner:v.id};break;
      }
      case 'sarah':v.expJammedNext=true;break;
      case 'olivia':{
        const w=nearby(w=>w.id!==v.id&&!isShip(w)&&!isShip(v)&&!atSea(g,w)&&!atSea(g,v)&&dist(g,w,v)===1&&dist(g,u,w)<=2);
        if(!w)return {ok:false,reason:'Need two adjacent friendly land units.'};
        const p={c:v.c,r:v.r},q={c:w.c,r:w.r};
        v.c=q.c;v.r=q.r;w.c=p.c;w.r=p.r;reindex(g,v,p);reindex(g,w,q);break;
      }
      case 'margaret':{
        const cost=reinforceCost(v.type,g,v.side,v),bank=funds(g,v.side);
        if(v.elite)return {ok:false,reason:'Elite Forces are single frames and cannot be reinforced.'};
        if(v.stack>=3||shortfall(bank,cost))return {ok:false,reason:'Cannot afford this reinforcement.'};
        const old=maxHP(v);spend(bank,cost);v.stack++;v.hp+=maxHP(v)-old;break;
      }
      case 'chloe':v.hp=Math.min(maxHP(v),v.hp+Math.round(maxHP(v)*.2));break;
      case 'tianzi':{
        const city=g.stations.filter(s=>s.owner===u.side&&dist(g,u,s)<=3).sort((a,b)=>dist(g,u,a)-dist(g,u,b))[0];
        if(!city)return {ok:false,reason:'No friendly city in range.'};city.expDecree=true;break;
      }
      case 'chengzhong':{
        const city=g.stations.filter(s=>foe(g,s.owner,u.side)&&dist(g,u,s)<=2).sort((a,b)=>dist(g,u,a)-dist(g,u,b))[0];
        if(!city)return {ok:false,reason:'No enemy city in range.'};city.expSupplyBlocked={owner:city.owner};break;
      }
      case 'diethard':addTargetMark(v,{side:u.side,source:u.id,damage:.2,uses:1});break;
      case 'kinoshita':v.expBreach=true;break;
      case 'savitri':v.expRetrofit=true;break;
      case 'mutsuki':v.expNavalRelay=true;break;
      case 'ichijiku':v.expRadar={side:u.side};break;
      case 'indira':v.expPinnedNext=true;break;
      default:return {ok:false,reason:'Unknown approved signature action.'};
    }
    u.feintCD=COMMANDERS[u.cmd].action.cooldown||3;
    log(g,COMMANDERS[u.cmd].short+' uses '+COMMANDERS[u.cmd].skill+'.',u.side);
    return {ok:true,target:v.id,affected:1};
  }
  function newcomerAttack(g,u,target,counter){
    const f=fx(u),terrain=tile(g,u.c,u.r);let m=1;
    if(!counter&&f.dashStrike&&u.movedDistance>=3&&u.expDashTurn!==g.turn)m*=1.3;
    if(!counter&&f.highland&&terrain?.terrain==='mountain'&&u.expHighlandTurn!==g.turn)m*=1.25;
    if(!counter&&f.beachhead&&target&&(g.turn-(u.expLandedTurn??-999))<=1&&tile(g,target.c,target.r)?.terrain==='coast')m*=1.25;
    if(!counter&&f.decapitation&&target?.cmd&&!(u.expDecapitationCd>0)&&
      !g.units.some(v=>v.hp>0&&v.side===target.side&&v.id!==target.id&&dist(g,v,target)===1))m*=1.25;
    // Chao's combined-arms doctrine is granted only to nearby ranged/armored allies
    // attacking a target screened by friendly infantry. Multiple copies never stack.
    if(!counter&&target&&['Armor','Artillery'].includes(TYPES[u.type].branch)&&
      g.units.some(v=>v.hp>0&&v.side===u.side&&v.id!==u.id&&fx(v).combinedFront&&dist(g,v,u)<=2)&&
      g.units.some(v=>v.hp>0&&v.side===u.side&&v.id!==u.id&&TYPES[v.type].branch==='Infantry'&&dist(g,v,target)===1))m*=1.15;
    // Zi Dien's movement-triggered raid may activate once per turn against a commander.
    if(!counter&&f.ziAmbush&&target?.cmd&&u.movedDistance>=2&&u.expZiAmbushTurn!==g.turn)m*=1+f.ziAmbush;
    if(!counter&&u.expRetrofitStrike)m*=1.1;
    if(!counter&&g.units.some(v=>v.hp>0&&v.side===u.side&&v.id!==u.id&&fx(v).expendable&&dist(g,v,u)===1))m*=1.25;
    // Eduardo: mountain defenders counterstrike harder under nearby Georgian command.
    if(counter&&tile(g,u.c,u.r)?.terrain==='mountain'&&
      g.units.some(v=>v.hp>0&&v.side===u.side&&fx(v).blackSeaFox&&dist(g,v,u)<=2))m*=1.25;
    return m;
  }
  function newcomerDefense(g,target,attacker,counter,direct){
    let m=1;
    if(g.units.some(v=>v.hp>0&&v.side===target.side&&v.id!==target.id&&fx(v).expendable&&dist(g,v,target)===1))m*=1.15;
    if(fx(target).beachhead&&(g.turn-(target.expLandedTurn??-999))<=1&&tile(g,target.c,target.r)?.terrain==='coast')m*=.8;
    if(fx(target).afterimage&&target.expAfterimage&&direct&&!counter)m*=.65;
    // Eduardo: improved defensive deployment on mountain hexes.
    if(direct&&tile(g,target.c,target.r)?.terrain==='mountain'&&
      g.units.some(v=>v.hp>0&&v.side===target.side&&fx(v).blackSeaFox&&dist(g,v,target)<=2))m*=.85;
    if(rangeOf(g,attacker).max>1&&g.units.some(v=>v.hp>0&&v.side===target.side&&fx(v).rangeShield&&dist(g,v,target)<=2))m*=.85;
    if(target.forcedOffensive&&counter)m*=1.2;

    // Ferilli's W-0 telemetry prevents avoidable losses to retaliatory fire.
    // Passive, non-stacking, and deliberately separate from Sophie's support attacks.
    if(counter&&direct&&target&&!TYPES[target.type].naval&&
      g.units.some(v=>v.hp>0&&v.side===target.side&&fx(v).counterfireRouting&&dist(g,v,target)<=2))m*=.8;
    return m;
  }
  function newcomerIntercept(g,target,amount){
    const guard=g.units.find(v=>v.hp>1&&v.side===target.side&&v.id!==target.id&&fx(v).guardianIntercept&&v.expGuardTurn!==g.turn&&dist(g,v,target)===1);
    if(guard){const diverted=Math.min(guard.hp-1,Math.round(amount*.35));guard.hp-=diverted;amount-=diverted;guard.expGuardTurn=g.turn;}
    if(target.expAfterimage)delete target.expAfterimage;
    return amount;
  }
  function newcomerSupport(g,defender,attacker){
    if(!defender||attacker.hp<=0)return;
    const assists=g.units.filter(v=>v.hp>0&&v.side===defender.side&&v.id!==defender.id&&!atSea(g,v)&&inRange(v,attacker,g)&&
      (v.expLink?.partner===defender.id&&v.expLinkTurn!==g.turn||
       fx(v).relief&&v.expReliefTurn!==g.turn&&dist(g,v,defender)<=2));
    const unit=assists.sort((a,b)=>b.hp-a.hp)[0];if(!unit)return;
    const n=Math.max(1,Math.round(power(g,unit,attacker,stationAt(g,attacker),true)*(fx(unit).relief?.6:.5)));
    attacker.hp=Math.max(0,attacker.hp-n);
    if(fx(unit).relief)unit.expReliefTurn=g.turn;else unit.expLinkTurn=g.turn;
    kill(g,attacker,unit);
  }
  function newcomerOverwatch(g,moved){
    const guards=g.units.filter(v=>v.hp>0&&v.expOverwatch&&foe(g,v.side,moved.side)&&!atSea(g,v)&&inRange(v,moved,g));
    for(const u of guards){if(moved.hp<=0)break;delete u.expOverwatch;
      const amount=Math.max(1,Math.round(power(g,u,moved,stationAt(g,moved))*.6));
      moved.hp=Math.max(0,moved.hp-newcomerIntercept(g,moved,amount));kill(g,moved,u);}
  }
  function newcomerKilled(g,v,attacker){
    if(!attacker)return;
    for(const u of g.units)if(u.hp>0&&u.side===attacker.side&&fx(u).salvage&&u.expSalvageTurn!==g.turn&&dist(g,u,v)<=2){
      funds(g,u.side).industry+=Math.min(15,Math.round(price(v.type,v.stack,g,v.side).industry*.1));
      u.expSalvageTurn=g.turn;break;
    }
  }
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
    for (const [side, e] of Object.entries(g.economy)) e.sakuradite ??= isMajor(g, side) ? SAKURADITE.start : 0;
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
    const others = (g.mode === 'scenario' ? g.order : powersOf(g)).filter(s => s !== owner && alive(g, s)),
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
    if (!d || !foe(g, d.owner, u.side) || !canCapture(u)) return null;
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
  // ======== F.L.E.I.J.A.: the Sakuradite superweapon ========
  // The high-resolution world uses roughly 200 km hexes. A warhead reaches two rings: the first is catastrophic,
  // while the second is a weaker blast fringe. Campaign maps can still pass an explicit radius to blastArea().
  const FLEIJA = {
    radius: 2,
    cost: { credits: 1800, industry: 450, science: 300, sakuradite: 150 },
    turns: 4, // construction time
    max: 1, // combined stored and unfinished warheads; shared by Britannia and Euro Britannia in 2018
    lab: 3, // research lab level needed
    labTurn: 15, // 2017 World War: Research Lab III and F.L.E.I.J.A. unlock
    ufnLabTurn: 5, // 2018 Rise of the U.F.N.: earlier strategic-weapons unlock
    ringHP: 0.1, // first ring: units are left with 10% of their frame
    outerHP: 0.55, // second ring: units are left with at most 55%
    outerShield: 0.35, // second-ring cities retain at most 35% of their defenses
    aiThreshold: 1500, // the least target value a rival will spend a warhead on
  };
  const ELIMINATOR = {
    range: 3, // defense radius measured from the unit carrying the charge, or the city where it waits for one
    cost: { credits: 1200, industry: 300, science: 250, sakuradite: 60 },
    turns: 2,
    lab: 3,
    research: 2, // turns after the first detonation before Eliminators can be built
    max: 3, // charges a power may hold at once (building, waiting in a city or carried), one per city or unit
  };
  // The turn Eliminator research completes (g.fleijaDetonated is the turn of the first detonation), or null.
  function eliminatorTurn(g) {
    if (g.mode === 'scenario') return null; // All regional scenarios keep every city capturable.
    const first = g.fleijaDetonated;
    if (typeof first === 'number') return first + ELIMINATOR.research;
    if (first || (g.log || []).some(l => String(l.text || '').startsWith('F.L.E.I.J.A. detonation'))) return 0;
    return null;
  }
  function eliminatorUnlocked(g) {
    const at = eliminatorTurn(g);
    return at != null && g.turn >= at;
  }
  // Every Eliminator charge in play, positioned for dist(): one building or waiting in a city, or one carried by a
  // unit (aboard a Carrier-Battleship it covers from the ship). `ready` charges can intercept; a project completing
  // this turn already can, before its owner's phase begins.
  function eliminatorCharges(g, side = null) {
    const out = [];
    for (const s of g.stations) {
      if (side && s.owner !== side) continue;
      if ((s.eliminator || 0) > 0) out.push({ c: s.c, r: s.r, owner: s.owner, city: s, ready: true });
      else if (s.eliminatorProject?.side === s.owner)
        out.push({ c: s.c, r: s.r, owner: s.owner, city: s, ready: s.eliminatorProject.ready <= g.turn });
    }
    for (const v of g.units)
      if (v.hp > 0 && (!side || v.side === side))
        for (const u of [v, ...(v.cargo || [])])
          if (u.hp > 0 && (u.eliminator || 0) > 0) out.push({ c: v.c, r: v.r, owner: v.side, unit: u, ready: true });
    return out;
  }
  // A power's Eliminator charges: building, waiting in a city or carried.
  function sideEliminators(g, side) {
    return eliminatorCharges(g, side);
  }
  // How the owner's UI names whoever holds a charge.
  function eliminatorHolderName(holder) {
    if (!holder) return '';
    if (holder.city) return holder.city.name;
    const u = holder.unit;
    return u.cmd ? `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short}'s ${TYPES[u.type].short}` : TYPES[u.type].short;
  }
  // A ready charge changes hands between a city and a unit in or next to it, or between two adjacent units. It is
  // free, but each charge moves once a turn, so it cannot relay down a line of units. `from`/`to` are
  // { city: id } or { unit: id }; units aboard a Carrier-Battleship cannot take part.
  function eliminatorHolder(g, ref) {
    if (ref?.city != null) return g.stations.find(s => s.id === ref.city) || null;
    if (ref?.unit != null) return g.units.find(u => u.id === ref.unit && u.hp > 0) || null;
    return null;
  }
  function transferEliminatorReason(g, from, to) {
    const a = eliminatorHolder(g, from),
      b = eliminatorHolder(g, to);
    if (g.mode === 'scenario') return 'F.L.E.I.J.A. Eliminators are unavailable in regional scenarios';
    if (g.over) return 'Operation over';
    if (!a || !b || a === b) return 'Unavailable';
    const side = from.city != null ? a.owner : a.side,
      other = to.city != null ? b.owner : b.side;
    if (from.city != null && to.city != null) return 'A charge moves between a city and a unit, or between units';
    if (side !== g.phase) return 'Not your turn';
    if (other !== side) return 'Only your own units and cities can hold your charges';
    if (!((a.eliminator || 0) > 0)) return 'No Eliminator charge to hand over';
    if ((b.eliminator || 0) > 0) return `${to.city != null ? 'That city' : 'That unit'} already holds an Eliminator charge`;
    if (to.city != null && b.eliminatorProject) return 'That city is building an Eliminator charge';
    if (a.eliminatorMoved === g.turn) return 'This charge has already changed hands this turn';
    if (dist(g, a, b) > 1) return 'Must be in the same or an adjacent hex';
    return null;
  }
  function transferEliminator(g, from, to) {
    const why = transferEliminatorReason(g, from, to);
    if (why) return { ok: false, reason: why };
    const a = eliminatorHolder(g, from),
      b = eliminatorHolder(g, to);
    a.eliminator = 0;
    delete a.eliminatorMoved;
    b.eliminator = 1;
    b.eliminatorMoved = g.turn;
    return { ok: true, holder: eliminatorHolderName(to.city != null ? { city: b } : { unit: b }) };
  }
  // A carrier that is destroyed takes its charge with it.
  function dropCarriedEliminator(g, v, why) {
    if (!((v?.eliminator || 0) > 0)) return;
    v.eliminator = 0;
    log(g, `A F.L.E.I.J.A. Eliminator charge is lost${why ? ' (' + why + ')' : ''}.`, v.side);
  }
  // F.L.E.I.J.A. is conquest-only. All major powers share their conquest's Lab III gate.
  function fleijaLabTurn(g) {
    return g.mode === 'conquest' && g.era === 'ufn2018' ? FLEIJA.ufnLabTurn : FLEIJA.labTurn;
  }
  function hasFleija(g, side) {
    return g.mode === 'conquest' && isMajor(g, side) && g.turn >= fleijaLabTurn(g);
  }
  // The 2018 Britannian allies share one strategic arsenal slot, but never
  // share funds, project ownership, a warhead's launch control, or unit orders.
  function fleijaPoolSides(g, side) {
    return g.mode === 'conquest' && g.era === 'ufn2018' &&
      (side === 'britannia' || side === 'eb') &&
      g.teams?.britannia && g.teams.britannia === g.teams.eb
      ? ['britannia', 'eb'] : [side];
  }
  function fleijaWarheadCount(g, side) {
    const members = fleijaPoolSides(g, side);
    return members.reduce((n, member) => n + (g.arsenal?.[member] || 0), 0) +
      g.stations.filter(s => members.includes(s.project?.side)).length;
  }
  // If a Britannian player has a funded, idle level-III lab, the AI ally must
  // not claim the newly free shared slot first (including after an AI launch).
  // The AI may use the slot if the player is unable to begin a project.
  function fleijaPlayerPriority(g, side) {
    if (side === g.player || !fleijaPoolSides(g, side).includes(g.player) ||
        !hasFleija(g, g.player) || g.over) return false;
    return g.stations.some(s => s.owner === g.player && !cityBusyReason(g, s) &&
      (s.lab || 0) >= FLEIJA.lab && !shortfall(funds(g, g.player), FLEIJA.cost));
  }
  function cityBusyReason(g, s) {
    return s.project
      ? 'F.L.E.I.J.A. project under way'
      : s.eliminatorProject
        ? 'F.L.E.I.J.A. Eliminator project under way'
        : null;
  }
  function projectReason(g, s) {
    if (!s) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (!hasFleija(g, s.owner) ? (g.mode !== 'conquest'
        ? 'F.L.E.I.J.A. is unavailable outside conquests'
        : `Research lab level 3 unlocks on turn ${fleijaLabTurn(g)}`) : null) ||
      cityBusyReason(g, s) ||
      (fleijaWarheadCount(g, s.owner) >= FLEIJA.max
        ? (fleijaPoolSides(g, s.owner).length > 1
          ? 'Britannia and Euro Britannia share one F.L.E.I.J.A. warhead slot (ready or under construction)'
          : 'Only one F.L.E.I.J.A. warhead may be held or under construction per faction') : null) ||
      ((s.lab || 0) < FLEIJA.lab ? `Requires research lab level ${FLEIJA.lab}` : null) ||
      shortfall(funds(g, s.owner), FLEIJA.cost)
    );
  }
  // Starting a warhead alerts every power; the city builds nothing else until it is done.
  function startProject(g, id) {
    const s = g.stations.find(s => s.id === id),
      why = projectReason(g, s);
    if (why) return { ok: false, reason: why };
    warSpend(g,s.owner,FLEIJA.cost,'F.L.E.I.J.A.');
    spend(funds(g, s.owner), FLEIJA.cost);
    s.project = { side: s.owner, started: g.turn, ready: g.turn + FLEIJA.turns };
    log(g, `INTELLIGENCE: Strategic weapons research detected in ${s.name}.`, s.owner);
    return { ok: true, ready: s.project.ready };
  }
  function eliminatorReason(g, s) {
    if (!s) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (eliminatorTurn(g) == null
        ? 'Available after the first F.L.E.I.J.A. detonation'
        : !eliminatorUnlocked(g)
          ? `Eliminator research completes on turn ${eliminatorTurn(g)}`
          : null) ||
      cityBusyReason(g, s) ||
      ((s.lab || 0) < ELIMINATOR.lab ? `Requires research lab level ${ELIMINATOR.lab}` : null) ||
      ((s.eliminator || 0) > 0 ? 'This city already holds an Eliminator charge' : null) ||
      (sideEliminators(g, s.owner).length >= ELIMINATOR.max
        ? `At most ${ELIMINATOR.max} Eliminator charges at once (building, waiting or carried)`
        : null) ||
      shortfall(funds(g, s.owner), ELIMINATOR.cost)
    );
  }
  function startEliminator(g, id) {
    const s = g.stations.find(s => s.id === id),
      why = eliminatorReason(g, s);
    if (why) return { ok: false, reason: why };
    warSpend(g,s.owner,ELIMINATOR.cost,'Eliminator');
    spend(funds(g, s.owner), ELIMINATOR.cost);
    s.eliminatorProject = { side: s.owner, started: g.turn, ready: g.turn + ELIMINATOR.turns };
    // Defensive project locations are classified, unlike offensive warhead production.
    log(g, 'F.L.E.I.J.A. Eliminator development initiated at a classified site.', s.owner);
    return { ok: true, ready: s.eliminatorProject.ready };
  }
  function dropProject(g, s, why) {
    if (!s?.project) return;
    log(g, `${s.name}: the F.L.E.I.J.A. project is lost${why ? ' (' + why + ')' : ''}.`, s.owner);
    s.project = null;
  }
  function dropEliminator(g, s, why) {
    if (!s) return;
    if (s.eliminatorProject) {
      log(g, `A F.L.E.I.J.A. Eliminator project is lost${why ? ' (' + why + ')' : ''}.`, s.owner);
      s.eliminatorProject = null;
    }
    if (s.eliminator) {
      log(g, `A F.L.E.I.J.A. Eliminator charge is destroyed${why ? ' (' + why + ')' : ''}.`, s.owner);
      s.eliminator = 0;
      delete s.eliminatorMoved;
    }
  }
  // A surrendering power's projects and warheads are lost.
  function annexStrategic(g, loser) {
    for (const s of g.stations) {
      if (s.project?.side === loser) dropProject(g, s, 'surrender');
      if (s.eliminatorProject?.side === loser || (s.owner === loser && s.eliminator)) dropEliminator(g, s, 'surrender');
    }
    for (const v of g.units)
      if (v.side === loser) for (const u of [v, ...(v.cargo || [])]) dropCarriedEliminator(g, u, 'surrender');
    if (g.arsenal) g.arsenal[loser] = 0;
  }
  // Start of a power's turn: finished strategic projects come online.
  function strategicTurn(g, side) {
    if (g.mode === 'scenario') return; // Suppress even saved projects in every regional scenario.
    if (eliminatorTurn(g) === g.turn && !g.eliminatorAnnounced) {
      g.eliminatorAnnounced = true;
      log(g, 'INTELLIGENCE: F.L.E.I.J.A. Eliminator countermeasures are now available at level-3 research labs.', side);
    }
    for (const s of g.stations) {
      if (s.project?.side === side && s.owner === side && s.project.ready <= g.turn) {
        s.project = null;
        (g.arsenal ||= {})[side] = Math.min(FLEIJA.max, (g.arsenal[side] || 0) + 1);
        log(g, `${s.name} completes a F.L.E.I.J.A. warhead.`, side);
      }
      if (s.eliminatorProject?.side === side && s.owner === side && s.eliminatorProject.ready <= g.turn) {
        s.eliminatorProject = null;
        s.eliminator = 1;
        log(g, 'A F.L.E.I.J.A. Eliminator charge is ready at a classified site and waits for a carrier.', side);
      }
    }
  }
  function blastArea(g, p, radius = FLEIJA.radius) {
    return within(g, p, radius);
  }
  // The ready enemy charge nearest the target, carried or waiting in a city, or null. Carriers before cities at a tie.
  function eliminatorDefender(g, attacker, p) {
    if (!p) return null;
    return (
      eliminatorCharges(g)
        .filter(h => h.ready && foe(g, h.owner, attacker) && isMajor(g, h.owner) && dist(g, h, p) <= ELIMINATOR.range)
        .sort(
          (a, b) =>
            dist(g, a, p) - dist(g, b, p) ||
            Number(!!a.city) - Number(!!b.city) ||
            (a.unit || a.city).id - (b.unit || b.city).id,
        )[0] || null
    );
  }
  // What a strike is called: the city or mine at ground zero, else the nearest city.
  function targetName(g, p) {
    const near = g.stations.slice().sort((a, b) => dist(g, a, p) - dist(g, b, p) || a.id - b.id)[0];
    return stationAt(g, p)?.name || siteAt(g, p)?.name || (near ? `near ${near.name}` : `hex ${p.c},${p.r}`);
  }
  function launchReason(g, side, p) {
    if (g.mode === 'scenario') return 'F.L.E.I.J.A. is unavailable in regional scenarios';
    if (g.over) return 'Operation over';
    if (g.phase !== side) return 'Not your turn';
    if (!(g.arsenal?.[side] > 0)) return 'No F.L.E.I.J.A. warhead in the arsenal';
    if (!g.stations.some(s => s.owner === side)) return 'No city to launch from';
    if (!p || !tile(g, p.c, p.r)) return 'Choose a target hex';
    // No allied or own casualties, property damage, mine loss or city destruction anywhere in the blast radius.
    if (g.era === 'ufn2018' && blastArea(g, p).some(t => {
      const v = unitAt(g, t), city = stationAt(g, t), mine = siteAt(g, t);
      return (v && !foe(g, v.side, side)) ||
        (city && !foe(g, city.owner, side)) ||
        (mine && !foe(g, depositOwner(g, mine), side));
    })) return 'F.L.E.I.J.A. blast would harm friendly or allied forces, territory or facilities';
    if (stationAt(g, p)?.owner === side && g.stations.filter(s => s.owner === side).length === 1)
      return 'That is your last city';
    return null;
  }
  // Knock down every building by `levels` (Infinity: back to level 0) with the output and defenses they added.
  function ruin(g, s, levels) {
    buildingFoundation(g, s);
    const lostFactory = Math.min(levels, s.tier || 0),
      lostLab = Math.min(levels, s.lab || 0);
    s.tier = (s.tier || 0) - lostFactory;
    s.lab = (s.lab || 0) - lostLab;
    s.refinery = Math.max(0, (s.refinery || 0) - levels);
    s.portLevel = Math.max(0, (s.portLevel || 0) - levels);
    syncBuildings(g, s);
    s.shield = 0;
    dropProject(g, s, 'destroyed');
    dropEliminator(g, s, 'destroyed');
  }
  // Ground zero destroys a city for the rest of the conquest: it stops being a city (no owner, output, port, project or
  // Eliminator charge, and it cannot be captured or rebuilt) and its deposit is lost. Its ruins stay on the map
  // (g.ruins) for the UI.
  function destroyCity(g, s) {
    dropProject(g, s, 'destroyed');
    dropEliminator(g, s, 'destroyed');
    const d = depositOf(g, s),
      lost = d ? destroyDeposit(g, d) : null;
    recordWarEvent(g,'cityDestroyed',s.owner,{cityId:s.id,city:s.name,owner:s.owner});
    (g.ruins ||= []).push({ name: s.name, c: s.c, r: s.r, owner: s.owner, capital: !!s.capital, turn: g.turn });
    g.stations.splice(g.stations.indexOf(s), 1);
    if (g.mode !== 'campaign') {
      // Its province does not become an unclaimable ghost region. Remaining
      // cities of the same faction inherit the land without changing its color.
      // If this was the last city, surrender will attach it to the victor.
      for (const t of g.tiles) if (t.provinceCity === s.id) delete t.provinceCity;
      assignCityProvinces(g);
    }
    if (g.automation?.cities) delete g.automation.cities[s.id];
    log(g, `${s.name} is destroyed by F.L.E.I.J.A.: only ruins remain for the rest of the war.`, s.owner);
    return lost;
  }
  // A deposit at ground zero never produces again.
  function destroyDeposit(g, d) {
    g.sites.splice(g.sites.indexOf(d), 1);
    log(g, `The ${d.name} Sakuradite deposit is destroyed and will never produce again.`, depositOwner(g, d) || g.phase);
    return d.name;
  }
  // Detonation: everything at ground zero is erased, the ring is left at 10% with collapsed morale.
  function launch(g, side, c, r) {
    const center = tile(g, c, r),
      why = launchReason(g, side, center);
    if (why) return { ok: false, reason: why };
    const origin = g.stations
        .filter(s => s.owner === side)
        .sort((a, b) => dist(g, a, center) - dist(g, b, center) || a.id - b.id)[0],
      name = targetName(g, center);
    g.arsenal[side]--;
    (g.launched ||= {})[side] = g.turn;
    const defense = eliminatorDefender(g, side, center);
    recordWarEvent(g,'fleijaLaunch',side,{city:name,c,r,intercepted:!!defense,defender:defense?.owner||null});
    if (defense) {
      // A charge completing this turn can defend before its owner's phase begins.
      // Two turns of research + two of production therefore beat the second warhead.
      const holder = defense.unit || defense.city;
      if (defense.city?.eliminatorProject?.ready <= g.turn) defense.city.eliminatorProject = null;
      holder.eliminator = 0;
      delete holder.eliminatorMoved;
      log(g, `F.L.E.I.J.A. Eliminator neutralizes the incoming warhead aimed at ${name}.`, defense.owner);
      return {
        ok: true,
        side,
        from: origin ? { c: origin.c, r: origin.r } : { c, r },
        to: { c, r },
        name,
        intercepted: true,
        defender: defense.owner,
        eliminatorCity: eliminatorHolderName(defense),
        eliminatorCarrier: defense.unit ? defense.unit.id : null,
        destroyed: [],
        crippled: [],
        damaged: [],
        cities: [],
        hit: [],
      };
    }
    const unlocksEliminator = eliminatorTurn(g) == null;
    const destroyed = [],
      crippled = [],
      damaged = [],
      cities = [],
      depleted = [],
      hit = [];
    for (const t of blastArea(g, center)) {
      const blastDistance = dist(g, t, center),
        ring = blastDistance === 1,
        outer = blastDistance > 1,
        v = unitAt(g, t),
        s = stationAt(g, t),
        d = siteAt(g, t);
      if (v && blastDistance === 0) {
        hit.push({ id: v.id, c: t.c, r: t.r, damage: v.hp });
        recordWarEvent(g,'damage',side,{targetSide:v.side,value:v.hp,weapon:'F.L.E.I.J.A.'});
        v.hp = 0;
        kill(g, v, null, true, side);
        destroyed.push(v.id);
      } else if (v) {
        const ratio = outer ? FLEIJA.outerHP : FLEIJA.ringHP,
          left = Math.min(v.hp, Math.max(1, Math.round(maxHP(v) * ratio)));
        hit.push({ id: v.id, c: t.c, r: t.r, damage: v.hp - left });
        recordWarEvent(g,'damage',side,{targetSide:v.side,value:v.hp-left,weapon:'F.L.E.I.J.A.'});
        v.hp = left;
        if (ring) {
          v.morale = moraleFloor(g, v);
          crippled.push(v.id);
        } else {
          v.morale = Math.min(v.morale ?? 0, -1);
          damaged.push(v.id);
        }
      }
      if (s) {
        if (blastDistance === 0) {
          const lost = destroyCity(g, s);
          if (lost) depleted.push(lost);
          cities.push({ name: s.name, severity: 'ground', destroyed: true, owner: s.owner });
        } else if (ring) {
          ruin(g, s, 1);
          s.attackedSinceRegen = true;
          cities.push({ name: s.name, severity: 'inner' });
        } else {
          s.shield = Math.min(s.shield, Math.round(s.maxShield * FLEIJA.outerShield));
          s.attackedSinceRegen = true;
          cities.push({ name: s.name, severity: 'outer' });
        }
      }
      if (d) {
        if (blastDistance === 0) depleted.push(destroyDeposit(g, d));
        else if (ring) d.refinery = Math.max(0, (d.refinery || 0) - 1);
      }
      if (blastDistance === 0 && !navigable(t) && !TERRAIN[t.terrain]?.blocked) setTileTerrain(g, t, 'crater');
    }
    if (unlocksEliminator) g.fleijaDetonated = g.turn;
    // A power whose last city was destroyed surrenders to the launcher.
    const ground = cities.find(c => c.destroyed);
    if (ground && ground.owner !== side && alive(g, ground.owner) && !g.stations.some(c => c.owner === ground.owner))
      surrender(g, ground.owner, side, ground);
    log(
      g,
      `F.L.E.I.J.A. detonation at ${name}: ${destroyed.length} units erased, ${crippled.length} crippled, ${damaged.length} damaged${cities.length ? ', ' + cities.length + ' cities affected' : ''}.`,
      side,
    );
    if (unlocksEliminator)
      log(
        g,
        `INTELLIGENCE: every power begins F.L.E.I.J.A. Eliminator research; countermeasures are available from turn ${eliminatorTurn(g)}.`,
        side,
      );
    checkVictory(g);
    return {
      ok: true,
      side,
      from: origin ? { c: origin.c, r: origin.r } : { c, r },
      to: { c, r },
      name,
      destroyed,
      crippled,
      damaged,
      cities,
      depleted,
      hit,
      eliminatorUnlocked: unlocksEliminator,
      eliminatorTurn: eliminatorTurn(g),
    };
  }
  // ---- Rival high command and F.L.E.I.J.A. ----
  // The project city: the best lab, then the city farthest from the enemy.
  function fleijaCity(g, side, front) {
    return (
      g.stations
        .filter(s => s.owner === side && !cityBusyReason(g, s))
        .sort((a, b) => (b.lab || 0) - (a.lab || 0) || front(b) - front(a) || a.id - b.id)[0] || null
    );
  }
  // Where a rival builds its next Eliminator: a free level-3-lab city outside the cover of its other charges, the
  // capital first, then the richest. Null when there is none. `anyLab`: the best such city to raise a lab in instead.
  function eliminatorCity(g, side, anyLab = false) {
    const cover = sideEliminators(g, side);
    return (
      g.stations
        .filter(
          s =>
            s.owner === side &&
            !cityBusyReason(g, s) &&
            !(s.eliminator > 0) &&
            (anyLab || (s.lab || 0) >= ELIMINATOR.lab) &&
            !cover.some(c => dist(g, c, s) <= ELIMINATOR.range),
        )
        .sort(
          (a, b) =>
            (anyLab ? (b.lab || 0) - (a.lab || 0) : 0) ||
            Number(b.capitalOf === side) - Number(a.capitalOf === side) ||
            b.income + b.industry - (a.income + a.industry) ||
            a.id - b.id,
        )[0] || null
    );
  }
  // The most valuable target that spares the launcher's own units and cities, or null below the threshold.
  function aiLaunchTarget(g, side) {
    const rival = s => !!s && s !== 'neutral' && foe(g, s, side),
      seen = new Set();
    let best = null;
    const candidates = [
      ...g.units.filter(u => u.hp > 0 && rival(u.side)),
      ...g.stations.filter(s => rival(s.owner)),
    ].map(p => tile(g, p.c, p.r));
    for (const p of candidates) {
      if (!p || seen.has(key(p))) continue;
      seen.add(key(p));
      let score = 0,
        safe = true;
      for (const t of blastArea(g, p)) {
        const blastDistance = dist(g, t, p),
          ring = blastDistance > 0,
          outer = blastDistance > 1,
          v = unitAt(g, t),
          s = stationAt(g, t);
        if ((v && !foe(g, v.side, side)) || (s && !foe(g, s.owner, side)) ||
            (g.era === 'ufn2018' && siteAt(g, t) && !foe(g, depositOwner(g, siteAt(g, t)), side))) {
          safe = false;
          break;
        }
        if (v && rival(v.side))
          score +=
            price(v.type, v.stack, g, v.side).credits * (v.hp / maxHP(v)) * (outer ? 0.35 : ring ? 0.75 : 1) + (v.cmd ? 200 : 0);
        // Cities are worth what the blast destroys: one at ground zero is erased with its output (and its owner
        // surrenders if it was the last); a capital in the inner ring is worth more only when the launcher has troops
        // close enough to take it afterwards.
        const d = !ring && (siteAt(g, t) || (s && depositOf(g, s)));
        if (d && rival(depositOwner(g, d))) score += 25 * d.base;
        if (s && rival(s.owner)) {
          const levels = (s.tier || 0) + (s.lab || 0) + (s.refinery || 0);
          score += outer
            ? 15 * levels + s.shield * 0.08
            : ring
              ? 40 * levels + s.shield * 0.2
              : 300 + 100 * levels + s.shield * 0.5 + 5 * (s.income + s.industry + s.science);
          if (!ring && isMajor(g, s.owner) && g.stations.filter(c => c.owner === s.owner).length === 1) score += 3000;
          if (s.project) score += 2000;
          if (
            ring &&
            !outer &&
            s.capitalOf === s.owner &&
            alive(g, s.owner) &&
            g.units.some(u => u.hp > 0 && u.side === side && canCapture(u) && dist(g, u, s) <= 4)
          )
            score += 1500;
        }
      }
      if (!safe) continue;
      const pick = { p, score };
      // Enemy Eliminator positions are secret: do not probe their interception coverage.
      if (!best || score > best.score) best = pick;
    }
    return best && best.score >= FLEIJA.aiThreshold ? best.p : null;
  }
  function beginTurn(g, side, collect = true) {
    // Entrenchment is earned when a power finishes its turn without moving the Infantry unit.
    // The protection persists through rival turns, then ends when that power's next turn begins.
    const outgoing = g.phase;
    if(outgoing){for(const v of g.units)if(v.side===outgoing)delete v.expSilenced;
      for(const station of g.stations)if(station.expSupplyBlocked?.owner===outgoing)delete station.expSupplyBlocked;}
    if (outgoing && outgoing !== side)
      for (const u of g.units)
        if (u.hp > 0 && u.side === outgoing && !TYPES[u.type].naval && TYPES[u.type].branch === 'Infantry')
          u.entrenched = !u.lastTurnMoved;
    g.phase = side;
    if (collect) {
      const inc = income(g, side),
        e = funds(g, side),
        modifier = side !== g.player ? DIFFICULTIES[g.difficulty]?.income || 1 : 1;
      e.credits += Math.round(inc.credits * modifier);
      e.industry += Math.round(inc.industry * modifier);
      e.science += Math.round(inc.science * modifier);
      e.sakuradite = (e.sakuradite || 0) + Math.round(inc.sakuradite * modifier);
      recordWarEvent(g,'income',side,{credits:Math.round(inc.credits*modifier),
        industry:Math.round(inc.industry*modifier),science:Math.round(inc.science*modifier),
        sakuradite:Math.round(inc.sakuradite*modifier)});
    }
    for (const v of allUnits(g)) {
      v.skillMarks = (v.skillMarks || []).filter(m => m.side !== side);
      for (const field of ['auraDisrupted', 'moraleWard', 'assaultInspired', 'despairWeakened']) if (v[field]?.side === side) delete v[field];
    }
    for (const city of g.stations) if (city.bombardMark?.side === side) delete city.bombardMark;
    // Off-map passengers have no terrain, morale or healing effects, but their
    // commander action cooldown advances on their faction's turn.
    for (const ship of g.units) if (ship.side === side)
      for (const passenger of ship.cargo || []) if (passenger.hp > 0 && passenger.side === side)
        passenger.feintCD = Math.max(0, (passenger.feintCD || 0) - 1);
    const mine = g.units.filter(u => u.hp > 0 && u.side === side);
    for (const u of mine) {
      u.entrenched = false;
      u.lastTurnMoved = false;
      u.guardReady = !!u.held;
      u.movedDistance = 0;
      u.skillReposition = 0;
      u.withdrawMove = false;
      u.moved = false;
      u.attacked = false;
      u.expDisabledActive=!!u.expDisabledNext;delete u.expDisabledNext;
      u.expPinnedActive=!!u.expPinnedNext;delete u.expPinnedNext;
      u.expJammedActive=!!u.expJammedNext;delete u.expJammedNext;
      if(u.expDisabledActive){u.moved=true;u.attacked=true;}else if(u.expPinnedActive)u.moved=true;
      delete u.expOverwatch;delete u.expLink;
      u.chain = 0;
      u.eliteMoveAfterKill = false;
      u.held = true; // cleared by move(): Senba's guard needs a turn without moving
      u.feintCD = Math.max(0, (u.feintCD || 0) - 1);
      u.expDecapitationCd=Math.max(0,(u.expDecapitationCd||0)-1);
      const nearby = g.units.filter(v => v.hp > 0 && foe(g, v.side, side) && dist(g, u, v) === 1).length;
      let desired = nearby >= 3 ? -2 : nearby >= 2 ? -1 : 0;
      desired = Math.max(moraleFloor(g, u), desired);
      if (u.morale < desired) u.morale++;
      else if (u.morale > desired) u.morale--;
      if (nearby >= 2) u.morale = Math.min(u.morale, desired);
      // Engineers within 2 hexes reassure: one extra morale step and 5% of the frame.

      // Euphemia: one additional morale recovery step within 2 hexes, no stacking.
      if (mine.some(m => m.hp > 0 && fx(m).royalCompassion && dist(g, m, u) <= 2))
        u.morale = Math.min(1, u.morale + 1);
      // Cécile: passive field maintenance applies only to friendly elite land Knightmares.
      if (u.elite && !TYPES[u.type].naval && mine.some(m => m.hp > 0 && fx(m).combatEngineering && dist(g, m, u) <= 2))
        u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.05));
      if (mine.some(m => m.hp > 0 && fx(m).reassure && dist(g, m, u) <= 2)) {
        u.morale = Math.min(1, u.morale + 1);
        u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.05));
      }
      if (fx(u).regen) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * fx(u).regen));
      const repairSkill = { Infantry: 'replacement', Armor: 'machinist', Artillery: 'artillery_maintenance' }[TYPES[u.type].branch];
      const repairLevel = genericLevel(g, u, repairSkill);
      if (repairLevel) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.01 * repairLevel));
      const energy = techValue(g, side, 'sakura.energy');
      if (energy && nearby === 0) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * energy));
      const auras = mine.filter(v => v.hp > 0 && v.cmd && v.id !== u.id && dist(g, u, v) <= auraRange(v)),
        aura = auras.find(v => fx(v).rally) || auras[0];
      if (aura && nearby < 3) u.morale = Math.min(1, u.morale + (fx(aura).rally || 1));
      // Ohgi's Organizer: the morale step comes even when surrounded.
      else if (nearby >= 3 && mine.some(m => m.hp > 0 && m.id !== u.id && fx(m).organizer && dist(g, m, u) <= 1))
        u.morale = Math.min(1, u.morale + 1);
      const t = tile(g, u.c, u.r),
        attrition = TERRAIN[t.terrain]?.attrition;
      if (attrition) {
        const filler = !TYPES[u.type].naval && TYPES[u.type].branch === 'Infantry' ? techValue(g, side, 'infantry.filler') : 0;
        u.hp = Math.max(1, u.hp - Math.round(maxHP(u) * attrition * (1 - filler)));
        if (filler && (t.terrain === 'desert' || t.terrain === 'snow'))
          u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.03));
      }
      // City occupancy no longer heals frames by itself. Inoue's separate
      // Resistance Logistics bonus still applies to friendly city garrisons.
      const s = stationAt(g, u);
      if (s?.owner === side && logisticsNear(g, u))
        u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.05));
      const port = TYPES[u.type].naval && portAtHex(g, u);
      if (port && port.portOwner === side)
        u.hp = Math.min(
          maxHP(u),
          u.hp + Math.round(maxHP(u) * (PORT.repair[port.portLevel] + (isShip(u) ? techValue(g, side, 'naval.damage') : 0))),
        );
    }
    // Captured port control persists after the occupying ship sails away.
    g.strikes = [];
    // Katase boosts nearby city defense recovery by 25 percentage points; Gao Hai boosts the city he occupies by 15.
    const prepared = mine.filter(m => m.hp > 0 && fx(m).prepared);
    for (const s of g.stations) {
      if (s.owner !== side) continue;
      const palaceTreasury = mine.some(m => fx(m).treasury && m.c === s.c && m.r === s.r);
      const rate = 0.12 + techValue(g, side, 'cities.engineering') +
        (prepared.some(m => dist(g, m, s) <= 2) ? 0.25 : 0) + (palaceTreasury ? 0.15 : 0) + (mine.some(m=>fx(m).adminCity&&dist(g,m,s)<=2)?.12:0);
      // Consume this marker at the owner's next regeneration. A hit by any
      // rival phase is counted once, even when factions take turns in one round.
      const recovery = s.attackedSinceRegen ? rate * 0.5 : rate;
      s.shield = Math.min(s.maxShield, s.shield + Math.round(s.maxShield * recovery));
      delete s.attackedSinceRegen;
    }
    strategicTurn(g, side);
    hooks.turn?.(g, side);
    checkVictory(g);
  }
  // Fortress batteries: range 2 (3 with Overcharge), then always two turns to recharge.
  const FORTRESS_GUN = { range: 2, recharge: 2, fixed: 60, share: 0.1 };
  function fortressName(s) {
    return s.gun || `${s.name} battery`;
  }
  function fortressRecharge(g, s) {
    return FORTRESS_GUN.recharge;
  }
  function fortressRange(g, s) {
    return FORTRESS_GUN.range + (techLevel(g, s.owner, 'cities.overcharge') >= 1 ? 1 : 0);
  }
  function fortressReady(g, s) {
    return !!s?.fort && s.owner === g.phase && !g.over && s.shield > 0 && (s.gunReady || 0) <= g.turn;
  }
  // Battery Capacitors raise the owner's battery damage; Electromagnetic Armor shrugs part of it off.
  function fortressDamage(g, foe, owner) {
    return Math.max(
      1,
      Math.round(
        (FORTRESS_GUN.fixed + maxHP(foe) * FORTRESS_GUN.share) *
          (1 + techValue(g, owner, 'cities.battery')) *
          (TYPES[foe.type].branch === 'Armor' ? 1 - techValue(g, foe.side, 'armor.bulkheads') : 1),
      ),
    );
  }
  function fortressTargets(g, s) {
    if (!fortressReady(g, s)) return [];
    return within(g, s, fortressRange(g, s))
      .map(p => unitAt(g, p))
      .filter(u => u && foe(g, u.side, s.owner))
      .map(u => tile(g, u.c, u.r));
  }
  function fireFortress(g, id, c, r) {
    const s = g.stations.find(s => s.id === id);
    if (!fortressReady(g, s)) return { ok: false, reason: 'The battery is not ready.' };
    const foe = unitAt(g, { c, r });
    if (!foe || !isFoe(g, foe.side, s.owner) || dist(g, s, foe) > fortressRange(g, s))
      return { ok: false, reason: `No enemy unit within ${fortressRange(g, s)} hexes of the city.` };
    const damage = fortressDamage(g, foe, s.owner),
      name = fortressName(s),
      hit = [];
    const priorHP=foe.hp;
    foe.hp = Math.max(0, foe.hp - damage);
    recordWarEvent(g,'damage',s.owner,{targetSide:foe.side,value:priorHP-foe.hp,city:s.name});
    lowerMorale(g, foe, 1);
    s.gunReady = g.turn + fortressRecharge(g, s);
    log(g, `${name} strikes ${TYPES[foe.type].short} for ${damage}.`, s.owner);
    // Battery Overcharge II: the blast also catches enemy units next to the target.
    if (techLevel(g, s.owner, 'cities.overcharge') >= 2)
      for (const v of g.units) {
        if (v.hp <= 0 || !isFoe(g, v.side, s.owner) || v.id === foe.id || dist(g, v, foe) !== 1) continue;
        const amount = Math.round(fortressDamage(g, v, s.owner) * 0.4);
        const priorHP=v.hp;
        v.hp = Math.max(0, v.hp - amount);
        recordWarEvent(g,'damage',s.owner,{targetSide:v.side,value:priorHP-v.hp,city:s.name});
        hit.push({ id: v.id, c: v.c, r: v.r, damage: amount });
        kill(g, v, null, false, s.owner);
      }
    kill(g, foe, null, false, s.owner);
    const destroyed = foe.hp <= 0;
    checkVictory(g);
    return { ok: true, name, from: { c: s.c, r: s.r }, to: { c: foe.c, r: foe.r }, id: foe.id, damage, destroyed, hit };
  }
  const ARMISTICE = 120;
  function checkVictory(g) {
    if (g.over) return g.over;
    decideVictory(g);
    if (g.over && g.over.winner === g.player) {
      award(g, g.player, 'campaign', 'Operation won');
      if (DIFFICULTIES[g.difficulty]?.level) award(g, g.player, 'laurel', `${DIFFICULTIES[g.difficulty].name} victory`);
    }
    return g.over;
  }
  // The regional scenario module behind a game: by scenario id, then by key, else Invasion of Japan.
  function scenarioOf(g) {
    const all = root.Knightmare.scenarios;
    return all?.byId?.[g?.scenario?.id] || all?.[g?.scenario?.key] || all?.japan;
  }
  // World conquest: every rival surrenders (a power surrenders when it holds no city), or hold the most cities at the
  // armistice.
  function decideVictory(g) {
    if (g.mode === 'campaign') return hooks.decide?.(g);
    if (g.mode === 'scenario') {
      const conquest = scenarioOf(g)?.winner(g),
        contenders = g.order.filter(s => g.stations.some(c => c.owner === s));
      // Britannia begins Stonehenge with no cities; the navy is the foothold.
      if (g.scenario?.id === 'operation-stonehenge') {
        if (conquest) g.over = conquest;
        return g.over;
      }
      if (!contenders.includes(g.player)) {
        // Player defeat can end their run, but award no faction a victory
        // until that faction controls every Japanese city.
        const soleVictor = conquest?.winner || null;
        g.over = {
          winner: soleVictor,
          eliminated: true,
          eliminatedBy: g.fallen?.[g.player]?.by || null,
          reason: soleVictor
            ? 'Your last stronghold in this theatre has fallen. The ' + FACTIONS[soleVictor].name +
              ' has conquered every city in the theatre.'
            : contenders.length === 1
              ? 'Your last Japanese stronghold has fallen. The surviving power has not yet conquered every city in this theatre.'
              : 'Your last Japanese stronghold has fallen. ' +
                'The war continues between ' +
                contenders.map(side => FACTIONS[side].name).join(' and ') + '.',
        };
        return g.over;
      }
      if (conquest) g.over = conquest;
      return g.over;
    }
    if (g.era === 'ufn2018') {
      const britannian = g.stations.filter(s => s.owner === 'britannia' || s.owner === 'eb').length;
      const ufn = g.stations.filter(s => s.owner === 'cf').length;
      const britPlayer = g.player === 'britannia' || g.player === 'eb';
      const coalitionWinner = britPlayer ? g.player : 'britannia';
      if (!ufn || !britannian || g.turn > ARMISTICE) {
        const winningTeam = !ufn ? 'britannian' : !britannian ? 'ufn' : britannian === ufn ? 'draw' : britannian > ufn ? 'britannian' : 'ufn';
        g.over = {
          winner: winningTeam === 'draw' ? 'draw' : winningTeam === 'ufn' ? 'cf' : coalitionWinner,
          team: winningTeam,
          reason: !ufn ? 'The U.F.N. has surrendered. The Britannian alliance is victorious.'
            : !britannian ? 'Both Britannian powers have surrendered. The U.F.N. is victorious.'
            : `The ${ARMISTICE}-turn armistice: Britannian alliance ${britannian} cities; U.F.N. ${ufn} cities.${winningTeam === 'draw' ? ' A tie is a draw.' : ''}`,
        };
      }
      return g.over;
    }
    const P = g.player,
      fall = g.fallen?.[P],
      rivals = MAJORS.filter(s => s !== P && alive(g, s));
    if (fall)
      g.over = { winner: fall.by, reason: `${fall.city}, your last city, has fallen. The ${FACTIONS[P].name} has surrendered.` };
    else if (!rivals.length)
      g.over = {
        winner: P,
        reason: `Every rival power has surrendered to the ${FACTIONS[P].name}. The world is yours.`,
      };
    else if (g.turn > ARMISTICE) {
      const held = s => g.stations.filter(c => c.owner === s).length,
        mine = held(P),
        best = Math.max(...rivals.map(held)),
        leader = rivals.find(s => held(s) === best);
      g.over = {
        winner: mine === best ? 'draw' : mine > best ? P : leader,
        reason: `The ${ARMISTICE}-turn armistice: you hold ${mine} cities; the strongest rival holds ${best}.`,
      };
    }
    return g.over;
  }
  function objectiveText(g) {
    if (g.mode === 'campaign' && hooks.objective) return hooks.objective(g);
    if (g.mode === 'scenario')
      return (scenarioOf(g)?.objective(g) || 'Conquer every enemy city') +
        (g.scenario?.id === 'invasion-japan' ?
          (g.scenario.phase === 'opening' ? ' · Alliance ends on turn 10.' : ' · All three powers are at war.')
          : g.scenario?.id === 'division-japan' ? ' · All three powers are at war.' : '');
    if (g.era === 'ufn2018') return g.player === 'cf'
      ? 'Defeat both Britannian powers. Australia is not a victory target.'
      : 'Fight alongside the other Britannian power to eliminate the U.F.N. Australia is not a victory target.';
    const rivals = MAJORS.filter(s => s !== g.player && alive(g, s)).map(s => `the ${FACTIONS[s].short}`);
    return rivals.length
      ? `Defeat ${rivals.join(' and ')}. A power surrenders only when it has lost every city.`
      : 'Every rival power has surrendered.';
  }
  function modeTitle(g) {
    if (g?.mode === 'campaign' && hooks.title) return hooks.title(g);
    if (g?.mode === 'scenario') return g.scenario?.title || 'Scenario · Japan';
    return g?.era === 'ufn2018' ? 'Rise of the U.F.N. · 2018 a.t.b.' : 'World War · 2017 a.t.b.';
  }

  // A city's starting output and defenses by tier, with its CITY_TWEAKS balance overrides.
  function cityBase([name, , , , tier, capital = false, fort = false]) {
    return {
      maxShield: capital ? 600 : fort ? 400 : 120 + 60 * tier,
      // Capitals: 50 plus the 15 their old refinery exported (refineries now need a Sakuradite deposit).
      income: capital ? 65 : tier === 3 ? 30 : tier === 2 ? 20 : 12,
      industry: capital ? 30 : 6 * tier,
      science: capital ? 10 : 1 + tier,
      ...CITY_TWEAKS[name],
    };
  }
  // ======== The world ========
  function hexOf(lon, lat) {
    const r = clamp(Math.round((WORLD.lat0 - lat) / WORLD.dlat), 0, WORLD.rows - 1),
      c = Math.round((lon - WORLD.lon0) / WORLD.dlon - 0.5 - 0.5 * (r & 1));
    return { c: ((c % WORLD.cols) + WORLD.cols) % WORLD.cols, r };
  }
  function lonLatOf(p) {
    return { lon: WORLD.lon0 + (p.c + 0.5 + 0.5 * (p.r & 1)) * WORLD.dlon, lat: WORLD.lat0 - p.r * WORLD.dlat };
  }
  // The 2° Cape York coastal hex overlaps Australian land, but falls outside
  // the simplified mainland point mask. The nearest-city flood wrongly gives
  // that one hex to Port Moresby across Torres Strait. It must be neutral.
  // The same correction applies to legacy saves while Australia's six cities
  // remain neutral; legitimate Australian conquests must not be overwritten.
  function repairCapeYorkOwnership(g) {
    if (g.mode !== 'conquest' || g.cols !== WORLD.cols || g.rows !== WORLD.rows) return false;
    const cape = tile(g, 161, 50);
    if (!cape || isSea(cape) || cape.owner !== 'cf' ||
        tile(g, 160, 51)?.owner !== 'neutral' || tile(g, 161, 52)?.owner !== 'neutral') return false;
    const australianCities = ['Sydney', 'Melbourne', 'Perth', 'Darwin', 'Brisbane', 'Adelaide'];
    if (!australianCities.every(name => g.stations.some(s => s.name === name && s.owner === 'neutral')))
      return false;
    setTileOwner(g, cape, 'neutral');
    // Legacy compact saves may still attach the hex to a Papua province;
    // assignCityProvinces will reconcile the owner and province ID.
    delete cape.provinceCity;
    return true;
  }
  // Repair pre-audit saves only where the ORIGINAL incorrect province and
  // city ownership still exist. Do not reset territory that was truly captured.
  // Sakhalin is Russian territory, NOT an extension of Britannian
  // Hokkaido. At the 2-degree resolution coast hexes physically touch across
  // the Soya Strait, allowing Sapporo's starting flood to annex the island.
  // Initial games explicitly assign the five Sakhalin hexes; legacy saves are
  // repaired only when their old Sapporo province remains unchanged.
  function repairSakhalinTerritory(g, initial = false) {
    if (g.mode !== 'conquest' || g.cols !== WORLD.cols || g.rows !== WORLD.rows) return;
    const russian = g.era === 'ufn2018' ? 'eb' : 'eu';
    const sapporo = g.stations.find(s => s.name === 'Sapporo');
    const petropavlovsk = g.stations.find(s => s.name === 'Petropavlovsk');
    if (!initial && (sapporo?.owner !== 'britannia' || petropavlovsk?.owner !== russian))
      return;
    for (const id of SAKHALIN_WORLD_HEXES) {
      const [c,r] = id.split(',').map(Number), t = tile(g, c, r);
      if (!t || isSea(t)) continue;
      if (!initial && !(t.owner === 'britannia' && t.provinceCity === sapporo.id))
        continue;
      setTileOwner(g, t, russian);
      delete t.provinceCity;
    }
  }
  // Correct pre-fix 2018 saves that still have Gibraltar's Euro-Britannian
  // province running through western Morocco and the Sahara. A tile is repaired
  // only if it remains tied to Gibraltar (or has no old province ID), while
  // both neighbouring African cities still belong to Britannia. Captured
  // African cities and their genuine Euro-Britannian provinces are preserved.
  function repairGibraltarAfricanCorridor(g) {
    if (g.mode !== 'conquest' || g.era !== 'ufn2018' ||
        g.cols !== WORLD.cols || g.rows !== WORLD.rows) return;
    const city = name => g.stations.find(s => s.name === name);
    const gibraltar = city('Gibraltar');
    if (gibraltar?.owner !== 'eb' ||
        city('Casablanca')?.owner !== 'britannia' ||
        city('Algiers')?.owner !== 'britannia') return;
    for (const t of g.tiles) {
      if (isSea(t) || t.owner !== 'eb' ||
          t.c < 85 || t.c > 94 || t.r < 23 || t.r > 35 ||
          (t.provinceCity != null && t.provinceCity !== gibraltar.id)) continue;
      setTileOwner(g, t, 'britannia');
      delete t.provinceCity;
    }
  }
  function repairLegacyRegionalZones(g) {
    if (g.mode !== 'conquest' || g.cols !== WORLD.cols || g.rows !== WORLD.rows) return;
    repairGibraltarAfricanCorridor(g);
    const city = name => g.stations.find(s => s.name === name);
    const is2018 = g.era === 'ufn2018';
    const iraq = is2018 ? 'britannia' : 'neutral';
    const europe = is2018 ? 'eb' : 'eu';
    const oldGulf = is2018 ? 'britannia' : 'neutral';
    const baghdad = city('Baghdad'), tbilisi = city('Tbilisi');
    const northernIraq = tile(g, 110, 22);
    if (baghdad?.owner === iraq && tbilisi?.owner === europe &&
        northernIraq?.owner === europe && northernIraq.provinceCity === tbilisi.id) {
      setTileOwner(g, northernIraq, iraq);
      delete northernIraq.provinceCity;
    }
    const dubai = city('Dubai'), tehran = city('Tehran');
    if (dubai?.owner !== oldGulf || tehran?.owner !== 'cf') return;
    const misplaced = [[116,26],[117,26],[118,26],[119,26],
      [115,27],[116,27],[117,27],[118,27],[119,27]];
    for (const [c,r] of misplaced) {
      const t = tile(g, c, r);
      if (t?.owner !== oldGulf || t.provinceCity !== dubai.id) continue;
      setTileOwner(g, t, 'cf');
      delete t.provinceCity;
    }
  }
  const ERAS = {
    world: {
      name: 'World War · 2017 a.t.b.',
      year: '2017 a.t.b.',
      desc: 'The Holy Britannian Empire holds the Americas, Area 11 and its Pacific bases; the Europia United holds Europe, Russia and Africa; the Chinese Federation holds Asia. Australia and the Middle Eastern Federation stand neutral.',
      rulesText:
        'A power surrenders only when it has lost every city: its armies disband and its mines pass to the conqueror. Defeat every rival, or hold the most cities at the 120-turn armistice.',
    },
  };

  ERAS.ufn2018 = { ...CONQUESTS.ufn2018, name: CONQUESTS.ufn2018.title };

  // Operation difficulty. Normal is the operation as designed. Hard gives every rival power all tier I–II
  // HQ research, upgrades every other enemy unit one class and adds one unit per four. Challenge gives them all
  // research, upgrades every unit (with an extra frame), adds one unit per two and a richer treasury.
  const DIFFICULTIES = {
    normal: { name: 'Normal', level: 0, tokens: 1, desc: 'The world as it stands in 2017 a.t.b.' },
    elite: {
      name: 'Elite',
      level: 3,
      tokens: 2.5,
      techTier: 4,
      upgradeEvery: 1,
      extraPer: 2,
      stack: true,
      ranks: RANKS.length - 1, // Two Elite-only AI ranks above Marshal.
      income: 1.25,
      preserveNaval: true,
      desc: 'Inherits Challenge enemy research, reinforcements, extra frames and income. Enemy commanders reach Supreme Commander, two ranks above Marshal. Every starting land unit becomes an elite; AI starting commanders receive Lv.5 elite frames. Elite Forces are always single frames, on every side. Rival factories build unlimited elites by tier; player factories deploy each elite once plus normal units. Ships and amphibious units stay unchanged.',
    },
    hard: {
      name: 'Hard',
      level: 1,
      tokens: 1.5,
      techTier: 2,
      upgradeEvery: 2,
      extraPer: 4,
      ranks: 3,
      income: 1,
      desc: 'Rival powers have all tier I–II research, half their units are upgraded a class and there are more of them. Enemy commanders gain three ranks.',
    },
    challenge: {
      name: 'Challenge',
      level: 2,
      tokens: 2,
      techTier: 4,
      upgradeEvery: 1,
      extraPer: 2,
      stack: true,
      ranks: PROMOTE_COST.length - 1, // Every starting rank reaches Marshal.
      income: 1.25,
      desc: 'Rival powers have every technology, every unit is upgraded with an extra frame, and their armies swell. Enemy commanders reach maximum rank.',
    },
  };
  function eliteConquest(g) {
    return g?.mode === 'conquest' && g.difficulty === 'elite';
  }
  function eliteCampaign(g) {
    return g?.mode === 'campaign' && g.difficulty === 'elite';
  }
  function eliteScenario(g) {
    return g?.mode === 'scenario' &&
      ['invasion-japan', 'division-japan', 'european-war', 'bering-strait', 'conquest-indochina', 'operation-stonehenge', 'area-18'].includes(g.scenario?.id) &&
      g.difficulty === 'elite';
  }
  function eliteAIProduction(g) {
    return eliteConquest(g) || eliteScenario(g);
  }
  // The player's unique factory deployment allowance is separate from
  // starting formations. Preplaced elite frames never consume it.
  function convertConquestEliteStarts(g) {
    if (!eliteConquest(g)) return;
    const used = {},
      landElites = Object.entries(ELITE_FORCES).filter(([, e]) => !TYPES[e.type].naval);
    for (const u of g.units) {
      const original = TYPES[u.type];
      if (!original || original.naval) continue; // ships/amphibious unchanged
      const faction = landElites.filter(([id]) => eliteEligible(g, u.side, id));
      // Neutral guards use elite templates but keep their neutral allegiance.
      const pool = faction.length ? faction : landElites;
      const sameClass = pool.filter(([, e]) => TYPES[e.type].cls === original.cls);
      const sameBranch = pool.filter(([, e]) => TYPES[e.type].branch === original.branch);
      const choices = sameClass.length ? sameClass : sameBranch.length ? sameBranch : pool;
      const id = choices[(used[u.side] || 0) % choices.length][0];
      used[u.side] = (used[u.side] || 0) + 1;
      u.type = ELITE_FORCES[id].type;
      u.elite = id;
      u.eliteLevel = u.cmd && u.side !== g.player ? 5 : 1;
      u.eliteStart = true;
      u.stack = 1; // Elite Forces are single frames on every side, AI included.
      u.hpTech = hullTech(g, u);
      u.hp = maxHP(u);
    }
  }
  // One class up within each branch: a scout becomes an assault frame, a line frame a mainline frame, and so on.
  const UPGRADE = {
    scout: 'assault',
    assault: 'light',
    raider: 'light',
    light: 'medium',
    medium: 'heavy',
    heavy: 'super',
    support: 'rocket',
    rocket: 'siege',
  };
  function upgradeType(type, side = null, g = null) {
    const t = TYPES[type],
      next = UPGRADE[t.cls];
    if (t.naval) return t.naval === 'amphibious' && NAVAL[t.side] ? NAVAL[t.side].amphibious2 : type;
    if (!next || t.side === 'neutral') return type;
    // Challenge/Hard reinforcement upgrades must respect the U.F.N. lineup.
    return typeFor(ufnBlackKnights(g, side) ? side : t.side, next, g);
  }
  function techUpToTier(tier) {
    return Object.fromEntries(
      Object.values(TECH_NODES)
        .map(n => [n.id, n.tiers.filter(t => t <= tier).length])
        .filter(([, l]) => l > 0),
    );
  }
  function harden(g, d) {
    const foes = [...powersOf(g), 'neutral'].filter(side => side !== g.player),
      enemyUnits = g.units.filter(u => foes.includes(u.side) && (!d.preserveNaval || !TYPES[u.type].naval));
    for (const side of foes) {
      g.tech[side] = techUpToTier(d.techTier);
      if (g.economy[side]) g.economy[side].credits = Math.round(g.economy[side].credits * d.income);
    }
    for (const [k, a] of Object.entries(COMMANDERS))
      if ((g.era === 'ufn2018' ? !serves(k, g.player, g) : a.side !== g.player)) g.officers[k].rank = Math.min(d.preserveNaval ? RANKS.length - 1 : HQ_RANK_CAP, g.officers[k].rank + d.ranks);
    enemyUnits.forEach((u, i) => {
      if (i % d.upgradeEvery === 0 && !(u.cmd && TYPES[u.type].cls === 'heavy')) u.type = upgradeType(u.type, u.side, g);
      if (d.stack && !u.elite) u.stack = Math.min(3, u.stack + 1);
    });
    // Reinforcements: copies of existing enemy units (never super-heavies) on free land hexes beside them.
    const extra = Math.ceil(enemyUnits.length / d.extraPer),
      land = enemyUnits.filter(u => !TYPES[u.type].naval);
    for (let n = 0, tries = 0; n < extra && tries < extra * 6; tries++) {
      const src = land[Math.floor(random(g) * land.length)],
        spot = adjacent(g, src).find(
          p =>
            !isSea(p) &&
            p.owner === src.side &&
            !TERRAIN[p.terrain]?.blocked &&
            !unitAt(g, p) &&
            (!stationAt(g, p) || stationAt(g, p).owner === src.side),
        );
      if (!spot) continue;
      const type = TYPES[src.type].cls === 'super' ? typeFor(src.side, 'heavy', g) : src.type;
      newUnit(g, type, src.side, spot.c, spot.r, src.stack);
      n++;
    }
    for (const u of g.units)
      if (foes.includes(u.side)) {
        u.hpTech = hullTech(g, u);
        u.hp = maxHP(u);
      }
    g.stations.forEach(st => fortify(g, st));
  }
  // All Elite Conquest cities (including the player's and neutral cities) start
  // at factory Tier II or higher. Elite rivals retain their extra Tier III hubs.
  // Use the ordinary building calculations so displayed tier, yields and shields
  // agree; a raw change to s.tier would leave these statistics out of sync.
  function raiseFactoryTier(g, s, tier) {
      if (s.tier >= tier) return;
      const oldShield = s.shield, oldMaxShield = s.maxShield;
      buildingFoundation(g, s); // Snapshot the original city's Tier-I/II foundations.
      s.tier = tier;
      syncBuildings(g, s);
      // Equivalent to buying the missing factory upgrades: newly gained
      // shield capacity starts repaired, while existing damage stays intact.
      s.shield = Math.min(s.maxShield, oldShield + Math.max(0, s.maxShield - oldMaxShield));
  }
  function prepareEliteConquestFactories(g) {
    if (!eliteConquest(g)) return;
    for (const s of g.stations) raiseFactoryTier(g, s, 2);
    for (const side of powersOf(g).filter(s => s !== g.player)) {
      const cities = g.stations.filter(s => s.owner === side);
      const enemies = g.stations.filter(s => foe(g, s.owner, side) && isMajor(g, s.owner));
      const closest = s => Math.min(...enemies.map(other => dist(g, s, other)));
      const nearFront = cities.slice().sort((a, b) => closest(a) - closest(b) || a.id - b.id);
      let advanced = cities.filter(s => s.tier >= 3).length;
      for (const s of nearFront) {
        if (advanced >= Math.max(6, Math.ceil(cities.length / 8))) break;
        if (s.tier < 3) { raiseFactoryTier(g, s, 3); advanced++; }
      }
    }
  }
  // Elite Japan reuses Elite Conquest's frame conversion philosophy without
  // importing any persistent HQ research or commander upgrades. Starting units
  // use Level 1 frames, except AI starting commanders on Level 5; HQ unlocks only matter at the player's factory.
  function prepareEliteJapan(g) {
    // Both Japan scenarios share this setup; the European War has its own.
    if (!eliteScenario(g) || !['invasion-japan', 'division-japan'].includes(g.scenario?.id)) return g;
    const sides = g.order; // Use this scenario's playable allegiances.
    const signature = {
      suzaku: 'lancelot', cornelia: 'cornelia_gloucester',
      kallen: 'guren_mkii', zero: 'shinkiro',
      tohdoh: 'tohdoh_gekka', xingke: 'shen_hu',
      leila: 'leila_alexander', akito: 'akito_liberte',
      ryo: 'ryo_valiant', ayano: 'ayano_valiant',
    };
    for (const side of sides.filter(s => s !== g.player)) {
      g.tech[side] = techUpToTier(4);
    }
    // Keep the theatre's original output foundations before using the engine's
    // standard synchronization, even when a Japan city shares a world city name.
    for (const s of g.stations) {
      s.buildingFoundation ||= {
        industry: s.industry - 10 * s.tier,
        science: s.science - 8 * (s.lab || 0),
        maxShield: s.maxShield - (s.fortBonus || 0) - 60 * s.tier,
      };
      raiseFactoryTier(g, s, 2);
    }
    for (const side of sides.filter(s => s !== g.player)) {
      const own = g.stations.filter(s => s.owner === side),
        enemies = g.stations.filter(s => s.owner !== side && sides.includes(s.owner)),
        nearestEnemy = s => Math.min(...enemies.map(other => dist(g, s, other)));
      const candidates = own.slice().sort((a, b) => nearestEnemy(a) - nearestEnemy(b) || a.id - b.id);
      const target = Math.max(1, Math.ceil(own.length / 8));
      let upgraded = own.filter(s => s.tier >= 3).length;
      for (const s of candidates) {
        if (upgraded >= target) break;
        if (s.tier < 3) { raiseFactoryTier(g, s, 3); upgraded++; }
      }
    }
    for (const [id, rec] of Object.entries(g.officers))
      if (COMMANDERS[id]?.side !== g.player) rec.rank = RANKS.length - 1;
    const used = {};
    for (const u of g.units) {
      const old = TYPES[u.type];
      if (!old) throw new Error('Unknown Japan starting unit ' + u.type);
      // Elite scenarios retain ordinary carriers, including cargo rules.
      if (old.naval === 'ship') continue;
      let id = null;
      if (old.naval === 'amphibious') {
        id = { britannia:'portman_ii', cf:'shui_gun_ru_ii',
          bk:'japan_bk_amphibious', eu:'panzer_frosch_ii' }[u.side];
      } else {
        const pool = Object.entries(ELITE_FORCES).filter(([, e]) =>
          !e.scenarioOnly && !TYPES[e.type].naval && e.availableTo.includes(u.side));
        const byClass = pool.filter(([, e]) => TYPES[e.type].cls === old.cls),
          byBranch = pool.filter(([, e]) => TYPES[e.type].branch === old.branch),
          choices = byClass.length ? byClass : byBranch.length ? byBranch : pool;
        if (!choices.length) throw new Error('Missing Japan Elite roster for ' + u.side);
        id = u.cmd && signature[u.cmd] && ELITE_FORCES[signature[u.cmd]]?.availableTo.includes(u.side)
          ? signature[u.cmd] : choices[(used[u.side + ':' + old.cls] || 0) % choices.length][0];
        used[u.side + ':' + old.cls] = (used[u.side + ':' + old.cls] || 0) + 1;
      }
      if (!ELITE_FORCES[id]) throw new Error('Missing Japan naval Elite Force for ' + u.side);
      u.type = ELITE_FORCES[id].type;
      u.elite = id;
      u.eliteLevel = u.cmd && u.side !== g.player ? 5 : 1;
      u.eliteStart = true;
      u.stack = 1; // Elite Forces are single frames on every side, AI included.
      if (u.cmd) u.cmdRank = g.officers[u.cmd]?.rank ?? u.cmdRank;
      u.hpTech = hullTech(g, u);
      u.hp = maxHP(u);
    }
    for (const s of g.stations) fortify(g, s);
    return g;
  }
  // Elite European War uses its own two-faction roster instead of modifying the
  // historical Japan roster or Britannian unlock eligibility in other modes.
  function prepareEliteEurope(g) {
    if (!eliteScenario(g) || !['european-war','bering-strait','conquest-indochina','operation-stonehenge','area-18','britannia-western-russia'].includes(g.scenario?.id)) return g;
    const sides = g.scenario.id === 'area-18' ? ['britannia','eu','cf'] :
      g.scenario.id === 'operation-stonehenge' ? ['britannia','eu'] :
      g.scenario.id === 'bering-strait' || g.scenario.id === 'britannia-western-russia' ? ['britannia','eu'] :
      g.scenario.id === 'conquest-indochina' ? ['britannia','cf'] : ['eu','eb'];
    const signatures = {
      leila: 'leila_alexander', akito: 'akito_liberte',
      ryo: 'ryo_valiant', ayano: 'ayano_valiant',
      yukiya: 'yukiya_valiant', smilas: 'hummel_battery',
      suzaku: 'lancelot', cornelia: 'cornelia_gloucester',
      shin: 'lancelot', julius: 'mordred',
      ashley: 'vincent_ward', manfredi: 'cornelia_gloucester',
    };
    const naval = {
      eu: {amphibious:'panzer_frosch_ii'},
      cf: {amphibious:'shui_gun_ru_ii'},
      eb: {amphibious:'portman_ii'},
      britannia: {amphibious:'portman_ii'},
    };
    // Preserve this map's smaller city yields before raising factory tiers.
    for (const s of g.stations) {
      s.buildingFoundation ||= {
        industry: s.industry - 10 * s.tier,
        science: s.science - 8 * (s.lab || 0),
        maxShield: s.maxShield - (s.fortBonus || 0) - 60 * s.tier,
      };
      raiseFactoryTier(g, s, 2);
    }
    for (const side of sides.filter(side => side !== g.player)) {
      g.tech[side] = techUpToTier(4);
      const own = g.stations.filter(s => s.owner === side);
      const rivals = g.stations.filter(s => foe(g, s.owner, side) && sides.includes(s.owner));
      const distanceToEnemy = s => Math.min(...rivals.map(other => dist(g, s, other)));
      const byFront = own.slice().sort((a,b) =>
        distanceToEnemy(a) - distanceToEnemy(b) || a.id - b.id);
      const advanced = Math.max(1, Math.ceil(own.length / 8));
      let tier3 = own.filter(s => s.tier >= 3).length;
      for (const s of byFront) {
        if (tier3 >= advanced) break;
        if (s.tier < 3) { raiseFactoryTier(g, s, 3); tier3++; }
      }
    }
    // Only the actual rival officers deployed in this theatre become Supreme
    // Commanders. Euro Britannian commanders retain their global data-side.
    for (const u of g.units)
      if (u.cmd && u.side !== g.player && g.officers[u.cmd])
        g.officers[u.cmd].rank = RANKS.length - 1;
    const used = {};
    for (const u of g.units) {
      const old = TYPES[u.type];
      if (!old) throw new Error('Unknown European War starting unit '+u.type);
      // Carrier-battleships remain ordinary hulls even on Elite difficulty.
      if (old.naval === 'ship') continue;
      const roster = g.scenario.eliteRosters[u.side] || [];
      let id = old.naval ? naval[u.side]?.[old.naval] : null;
      if (!old.naval) {
        const pool = roster.filter(id => !TYPES[ELITE_FORCES[id]?.type]?.naval);
        const sameClass = pool.filter(id => TYPES[ELITE_FORCES[id].type].cls === old.cls);
        const sameBranch = pool.filter(id => TYPES[ELITE_FORCES[id].type].branch === old.branch);
        const choices = sameClass.length ? sameClass : sameBranch.length ? sameBranch : pool;
        if (!choices.length) throw new Error('Missing European Elite Force for '+u.side);
        const signature = signatures[u.cmd];
        const n = u.side+':'+old.cls;
        id = signature && roster.includes(signature)
          ? signature : choices[(used[n] || 0) % choices.length];
        used[n] = (used[n] || 0) + 1;
      }
      if (!id || !roster.includes(id) || !ELITE_FORCES[id])
        throw new Error('Missing European naval/land Elite Force for '+u.side+': '+u.type);
      u.type = ELITE_FORCES[id].type;
      u.elite = id;
      u.eliteLevel = u.cmd && u.side !== g.player ? 5 : 1;
      u.eliteStart = true;
      u.stack = 1;
      if (u.cmd) u.cmdRank = g.officers[u.cmd]?.rank ?? u.cmdRank;
      u.hpTech = hullTech(g,u);
      u.hp = maxHP(u);
    }
    for (const s of g.stations) fortify(g,s);
    return g;
  }
  // Nearest tile to p (breadth-first, wrapping) that passes test.
  function nearest(g, p, test) {
    const start = tile(g, p.c, p.r),
      seen = new Set([key(start)]),
      queue = [start];
    while (queue.length) {
      const t = queue.shift();
      if (test(t)) return t;
      for (const n of adjacent(g, t))
        if (!seen.has(key(n))) {
          seen.add(key(n));
          queue.push(n);
        }
    }
    return null;
  }
  // mode: 'conquest' (the world war). The player's faction acts first; rivals follow in a fixed order.
  function createGame(player = 'britannia', difficulty = 'normal', mode = 'conquest', seed = 246801, conquest = 'world') {
    const cfg = CONQUESTS[conquest] || CONQUESTS.world;
    const majors = cfg.majors;
    if (!cfg.selectable.includes(player)) player = 'britannia';
    const g = {
      game: 'knightmare',
      version: 1,
      rulesVersion: RULES_VERSION,
      player,
      difficulty,
      mode: 'conquest',
      era: cfg.id,
      majors: [...majors],
      teams: { ...cfg.teams },
      factions: cfg.factions ? JSON.parse(JSON.stringify(cfg.factions)) : null,
      order: [player, ...majors.filter(s => s !== player)],
      seed,
      wrap: true,
      cols: WORLD.cols,
      rows: WORLD.rows,
      turn: 1,
      phase: player,
      nextId: 1,
      tiles: [],
      units: [],
      stations: [],
      log: [],
      strikes: [],
      fallen: {},
      economy: Object.fromEntries(
        [...majors, 'neutral'].map(s => [s, { credits: s === 'neutral' ? 0 : 500, industry: 200, science: 40, ...(cfg.initialTreasury?.[s] || {}) }]),
      ),
      tech: Object.fromEntries([...majors, 'neutral'].map(s => [s, {}])),
      officers: Object.fromEntries(Object.keys(COMMANDERS).map(k => [k, defaultOfficer(k)])),
      roster: {},
      medalInventory: [],
      medalsEarned: [],
      over: null,
      stats: {},
      eliteDeployed: {},
      automation: {
        enabled: false,
        autoUpgrade: true,
        stack: 1,
        reserve: { ...AUTOMATION_DEFAULT_RESERVE },
        cities: {},
      },
    };
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++)
        g.tiles.push({ c, r, terrain: TERRAIN_CODES[WORLD_ROWS[r]?.[c]] || 'sea', owner: null });
    const freeLand = t => !isSea(t) && !TERRAIN[t.terrain].blocked;
    // Cities, mines and starting armies stand on solid land, never on a coast hex.
    const solidLand = t => freeLand(t) && !isCoast(t);
    for (const [name, lon, lat, oldOwner, tier, oldCapital = false, fort = false, gun] of CITY_DATA) {
      const owner = cfg.ownership?.[name] || oldOwner;
      const capital = cfg.id === 'ufn2018' ? ['Pendragon', 'St. Petersburg', 'Luoyang'].includes(name) : oldCapital;
      const fixed = COASTAL_CITY_HEXES[name];
      const at = fixed ? tile(g, fixed[0], fixed[1]) :
        nearest(g, hexOf(lon, lat), t => solidLand(t) && !stationAt(g, t));
      if (!at || !solidLand(at) || stationAt(g, at))
        throw new Error('Unavailable fixed starting city for ' + name);
      const s = {
        id: g.stations.length,
        name,
        c: at.c,
        r: at.r,
        owner,
        tier,
        lab: capital ? 1 : 0,
        refinery: 0,
        capital,
        capitalOf: capital ? owner : null,
        fort,
        gun: gun || null,
        ...cityBase([name, lon, lat, owner, tier, capital, fort]),
        producedTurn: 0,
      };
      s.shield = s.maxShield;
      setTileTerrain(g, at, 'plains');
      g.stations.push(s);
    }
    if (cfg.expectedCities) {
      const actual = Object.fromEntries([...majors, 'neutral'].map(side => [side, g.stations.filter(s => s.owner === side).length]));
      if (g.stations.length !== 168 || Object.keys(cfg.expectedCities).some(side => actual[side] !== cfg.expectedCities[side]))
        throw new Error('Invalid 2018 conquest territory: ' + JSON.stringify(actual));
    }
    // Territory: each land hex belongs to the nearest city over land. Radius 11 preserves the old geographic reach on the denser map.
    const frontier = g.stations.map(s => ({ t: tile(g, s.c, s.r), owner: s.owner, d: 0 })),
      seenT = new Set(frontier.map(f => key(f.t)));
    for (const f of frontier) setTileOwner(g, f.t, f.owner);
    while (frontier.length) {
      const f = frontier.shift();
      if (f.d >= 11) continue;
      for (const n of adjacent(g, f.t))
        if (!seenT.has(key(n)) && freeLand(n) && !crossesWorldPoliticalStrait(g, f.t, n)) {
          seenT.add(key(n));
          setTileOwner(g, n, f.owner);
          frontier.push({ t: n, owner: f.owner, d: f.d + 1 });
        }
    }
    for (const [c, r, owner] of TERRITORY) {
      const t = tile(g, c, r);
      if (t && freeLand(t)) setTileOwner(g, t, cfg.id === 'ufn2018' && owner === 'eu' ? 'cf' : owner);
    }
    // Indonesia (including Borneo and its smaller islands) is entirely Chinese
    // Federation at the start of conquest. City-based land floodfill sometimes
    // assigned parts of Borneo to the Philippine/Britannian frontier or left
    // remote islands unowned. Correct GAME ownership here, not just the tint.
    // The geographic windows contain land belonging to the Indonesian
    // archipelago; unplayable ocean hexes are never assigned ownership.
    const indonesiaBands = [
      [94, 107.9, -7.8, 7.5],   // Sumatra and the western archipelago
      [106, 119.5, -11.5, 8],  // Java, Borneo and western Lesser Sunda
      [118, 134, -11.5, 4.5],  // Sulawesi, Lesser Sunda and Maluku
      [133, 141.9, -11.5, 3], // western New Guinea / Indonesian Papua
    ];
    for (const t of g.tiles) {
      if (isSea(t)) continue;
      const lon = WORLD.lon0 + WORLD.dlon * (t.c + 0.5 * (t.r & 1));
      const lat = WORLD.lat0 - WORLD.dlat * t.r;
      if (indonesiaBands.some(([west, east, south, north]) =>
          lon >= west && lon <= east && lat >= south && lat <= north))
        setTileOwner(g, t, 'cf');
    }
    // Political borders near narrow straits cannot be determined by an unconstrained
    // nearest-city flood: coastal gameplay hexes can touch across separate landmasses.
    // These fixed geographic regions only establish the INITIAL map; later captures
    // and loaded saves continue to use their actual tile and city ownership.
    const mainlandAustralia = [
      [113.6,-22],[114,-26.2],[115,-29.5],[115.7,-32],[115,-33.6],
      [117.9,-35.1],[123.5,-33.9],[129,-31.6],[132,-32],[135.3,-34.6],
      [137.7,-33],[138.1,-35.6],[140.5,-38],[143.6,-38.8],
      [146.3,-39.1],[150,-37.5],[151.2,-33.9],[153.1,-30],
      [153.6,-28.2],[153.1,-25],[150.8,-22.6],[149.2,-21],
      [146.8,-19.2],[145.8,-16.9],[145.3,-14.9],
      [143.5,-12],[142.5,-10.7],[141.6,-12.8],[141.4,-16.5],
      [140.8,-17.5],[139.3,-17.4],[137,-15.9],[135.9,-14.9],
      [136.7,-12.2],[132.6,-11.5],[130.8,-12.4],[129.5,-15],
      [127.2,-13.9],[125,-15.5],[122.2,-17.9],[118.8,-20.3],
      [114.5,-21.8]
    ];
    // Southern shores of the Persian Gulf and the Arabian Peninsula; the
    // opposite shore of the gulf remains Iranian/Chinese Federation territory.
    const arabianPeninsula = [
      [34,31],[37,34],[41,35],[44.5,35.5],[47.3,31.7],
      [49,29.4],[50,27.5],[52.5,26.4],[55.5,25.2],
      [58,24.9],[61,23],[59,18],[56,17],[51,12],
      [45,12],[41,14],[39,17],[37,21],[35,27]
    ];
    function insidePolygon(lon, lat, polygon) {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j];
        if ((a[1] > lat) !== (b[1] > lat) &&
            lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0])
          inside = !inside;
      }
      return inside;
    }
    for (const t of g.tiles) {
      if (isSea(t)) continue;
      const lon = WORLD.lon0 + WORLD.dlon * (t.c + 0.5 + 0.5 * (t.r & 1));
      const lat = WORLD.lat0 - WORLD.dlat * t.r;
      if (insidePolygon(lon, lat, mainlandAustralia)) setTileOwner(g, t, 'neutral');
      else if (insidePolygon(lon, lat, arabianPeninsula))
        setTileOwner(g, t, cfg.id === 'ufn2018' ? 'britannia' : 'neutral');
    }
    // Political province audit: the global radius-11 flood must not let
    // Caucasian cities annex northern Iraq or Dubai claim Iran's north shore.
    // These controls are applied BEFORE city-province IDs are assigned, in
    // both eras. Territory subsequently changes only through city captures.
    const iraqBorder = [
      [39,34], [40,36.7], [42.7,37.5], [44.5,37.3],
      [46.1,36.3], [47.5,34.7], [48.5,32],
      [47.9,29.6], [46,29.2], [43,30], [41,31.5], [39,33]
    ];
    const iranGulfShore = [
      [49.4,31.5], [50,29.5], [51.8,28.0], [53.3,27.2],
      [54.9,27], [56.3,27], [57.7,27],
      [60.5,27], [61.8,28.5], [61,32], [49.4,32]
    ];
    for (const t of g.tiles) {
      if (isSea(t)) continue;
      const lon = WORLD.lon0 + WORLD.dlon * (t.c + 0.5 + 0.5 * (t.r & 1));
      const lat = WORLD.lat0 - WORLD.dlat * t.r;
      if (insidePolygon(lon, lat, iraqBorder))
        setTileOwner(g, t, cfg.id === 'ufn2018' ? 'britannia' : 'neutral');
      else if (insidePolygon(lon, lat, iranGulfShore))
        setTileOwner(g, t, 'cf');
    }
    repairCapeYorkOwnership(g);
    // This runs after regional ownership masks and before coastal infill.
    repairSakhalinTerritory(g, true);
    repairGibraltarAfricanCorridor(g);
    // A coast hex beyond the cities' reach follows the land it borders, so shores never stand out unowned.
    for (let pass = 0, changed = true; changed && pass < 4; pass++) {
      changed = false;
      for (const t of g.tiles) {
        if (!isCoast(t) || t.owner) continue;
        const n = adjacent(g, t).find(n => !isSea(n) && n.owner &&
          !crossesWorldPoliticalStrait(g, t, n));
        if (n) { setTileOwner(g, t, n.owner); changed = true; }
      }
    }
    // At 2-degree resolution a few UAE/Omani southern-shore coastal centres
    // lie north of the Arabian polygon. They remain on Dubai's bank even when
    // the Gulf shoreline barrier prevents Iran's city flood crossing water.
    for (const [c, r] of [[117,28],[118,28],[119,28]]) {
      const shore = tile(g, c, r);
      if (shore && !isSea(shore))
        setTileOwner(g, shore, cfg.id === 'ufn2018' ? 'britannia' : 'neutral');
    }
    attachUnclaimedNewZealand(g);
    assignCityProvinces(g);
    for (const [side, cls, lon, lat, stack, cmd, frameSource] of (cfg.armies || ARMY_DATA)) {
      const at = nearest(
        g,
        hexOf(lon, lat),
        t => solidLand(t) && !unitAt(g, t) && (cfg.id !== 'ufn2018' || t.owner === side) && (!stationAt(g, t) || stationAt(g, t).owner === side),
      );
      if (at) newUnit(g, typeFor(ufnBlackKnights(g, side) ? 'bk' : (frameSource || side), cls, g), side, at.c, at.r, stack, cmd || null);
    }
    for (const [city, type, stack] of (cfg.garrisons || GARRISONS)) {
      const s = g.stations.find(s => s.name === city);
      newUnit(g, type, 'neutral', s.c, s.r, stack);
    }
    for (const [city, level] of PORT_DATA) {
      const s = g.stations.find(s => s.name === city);
      if (s) openPort(g, s, level);
    }
    for (const [side, role, lon, lat, stack] of (cfg.navy || NAVY_DATA)) {
      const at = nearest(g, hexOf(lon, lat), t => isSea(t) && !unitAt(g, t));
      if (at) newUnit(g, navalRoster(g, side)[role], side, at.c, at.r, stack);
    }
    setupSakuradite(g);
    if (DIFFICULTIES[difficulty]?.level) harden(g, DIFFICULTIES[difficulty]);
    convertConquestEliteStarts(g); // Also converts every Challenge-style land reinforcement.
    prepareEliteConquestFactories(g);
    for (const u of g.units)
      if (u.cmd) {
        u.cmdRank = g.officers[u.cmd].rank;
        u.hp = maxHP(u);
      }
    g.startUnits = Object.fromEntries(majors.map(s => [s, g.units.filter(u => u.side === s).length]));
    log(g, (ERAS[cfg.id] || ERAS.world).desc, player);
    log(g, (ERAS[cfg.id] || ERAS.world).rulesText, player);
    ensureWarReport(g);
    return g;
  }

  // ======== Pathfinding: goal fields and landmasses, for standing orders and the AI ========
  // The side-wide targets as [position, value] pairs: rival cities (a F.L.E.I.J.A. project outranks even a capital) and
  // Sakuradite mines held by others (Mount Fuji pulls almost like a capital). Rival Eliminator projects are classified,
  // so they never attract attention.
  function goalSeeds(g, side) {
    const seeds = [];
    for (const s of g.stations)
      if (foe(g, s.owner, side))
        seeds.push([s, s.project ? -8 : s.capitalOf && alive(g, s.owner) ? -6 : s.owner === 'neutral' ? 1 : 0]);
    for (const d of g.sites || []) if (d.city == null && foe(g, d.owner, side)) seeds.push([d, d.base >= 30 ? -5 : -1]);
    return seeds;
  }
  // Path cost from every hex to the nearest city this side wants (rival capitals count extra), over land and sea.
  // `seeds` ([position, value] pairs) replaces the side-wide targets, e.g. with one front's objectives; `only`
  // ('land' or 'sea') keeps the paths on one surface.
  // Optional unit routing excludes hexes that reachable()/move() cannot traverse.
  // An inaccessible goal can still seed an approach: standing orders finish beside it.
  function routePassable(g, u, p) {
    const t = TYPES[u.type], st = stationAt(g, p), occ = unitAt(g, p);
    if (t.naval === 'ship' && (!navigable(p) || st)) return false;
    if (st && foe(g, st.owner, u.side) && !((canCapture(u) && st.shield <= 0) || navalCityAssault(g, u))) return false;
    return !occ || occ === u || (occ.side === u.side && (t.naval || !canBoard(g, occ)));
  }
  function goalField(g, side, seeds = null, only = null, unit = null, maxCost = Infinity) {
    const field = new Float32Array(g.tiles.length).fill(Infinity),
      hd = [],
      hi = [];
    // Binary heap over parallel arrays (distance, tile index).
    const push = (i, d) => {
      let n = hd.length;
      hd.push(d);
      hi.push(i);
      while (n > 0) {
        const p = (n - 1) >> 1;
        if (hd[p] <= d) break;
        hd[n] = hd[p];
        hi[n] = hi[p];
        n = p;
      }
      hd[n] = d;
      hi[n] = i;
    };
    const pop = () => {
      const top = hi[0],
        d = hd.pop(),
        i = hi.pop(),
        size = hd.length;
      if (size) {
        let n = 0;
        for (;;) {
          const l = 2 * n + 1,
            r = l + 1;
          let m = l < size && hd[l] < d ? l : -1;
          if (r < size && hd[r] < (m < 0 ? d : hd[l])) m = r;
          if (m < 0) break;
          hd[n] = hd[m];
          hi[n] = hi[m];
          n = m;
        }
        hd[n] = d;
        hi[n] = i;
      }
      return top;
    };
    for (const [p, d] of seeds || goalSeeds(g, side)) {
      const i = p.r * g.cols + p.c;
      if (d < field[i]) {
        field[i] = d;
        push(i, d);
      }
    }
    if (g.mode === 'campaign' && !seeds) {
      for (const u of g.units)
        if (u.hp > 0 && foe(g, u.side, side)) {
          const i = u.r * g.cols + u.c;
          if (field[i] > 2) {
            field[i] = 2;
            push(i, 2);
          }
        }
      for (const [c, r, d = -4] of g.campaign?.goals?.[side] || []) {
        const i = r * g.cols + c;
        field[i] = d;
        push(i, d);
      }
    }
    const nb = neighborTable(g),
      tiles = g.tiles;
    while (hd.length) {
      const d = hd[0],
        i = pop();
      if (d > field[i] || d >= maxCost) continue;
      const sea = isSea(tiles[i]);
      for (let k = i * 6; k < i * 6 + 6; k++) {
        const j = nb[k];
        if (j < 0) continue;
        const n = tiles[j];
        if (TERRAIN[n.terrain]?.blocked || (only === 'sea' ? !navigable(n) : only === 'land' && isSea(n))) continue;
        if (unit && !routePassable(g, unit, n)) continue;
        const step = unit ? isSea(tiles[i]) ? 1 : terrainCost(g, unit, tiles[i]) : isSea(n) ? 1 : TERRAIN[n.terrain].cost;
        const nd = d + (only === 'sea' ? 1 : (isSea(n) !== sea ? 4 : 0) + step);
        if (nd <= maxCost && nd < field[j]) {
          field[j] = nd;
          push(j, nd);
        }
      }
    }
    return field;
  }
  // Six neighbour indices per tile (-1 off the map), cached per map; terrain is read live since craters can appear.
  const neighborCache = new WeakMap();
  function neighborTable(g) {
    let nb = neighborCache.get(g.tiles);
    if (nb) return nb;
    nb = new Int32Array(g.tiles.length * 6).fill(-1);
    for (const t of g.tiles) adjacent(g, t).forEach((n, k) => (nb[(t.r * g.cols + t.c) * 6 + k] = n.r * g.cols + n.c));
    neighborCache.set(g.tiles, nb);
    return nb;
  }
  // Islands and continents, for deciding which troops need a ship (cached per map).
  const landCache = new WeakMap();
  function landmass(g) {
    let m = landCache.get(g.tiles);
    if (m) return m;
    m = new Int32Array(g.tiles.length).fill(-1);
    let id = 0;
    for (const t of g.tiles) {
      if (isSea(t) || TERRAIN[t.terrain]?.blocked || m[t.r * g.cols + t.c] >= 0) continue;
      const q = [t];
      m[t.r * g.cols + t.c] = id;
      while (q.length) {
        const x = q.pop();
        for (const n of adjacent(g, x))
          if (!isSea(n) && !TERRAIN[n.terrain]?.blocked && m[n.r * g.cols + n.c] < 0) {
            m[n.r * g.cols + n.c] = id;
            q.push(n);
          }
      }
      id++;
    }
    landCache.set(g.tiles, m);
    return m;
  }
  const massOf = (g, p) => landmass(g)[p.r * g.cols + p.c];
  // ======== Standing orders ========
  // A player's unit can be given a destination (u.goto). At the start of each of its side's turns it moves as far
  // along the way as it can, until it arrives or the order is cancelled. Warships keep to the sea; other units take to
  // the sea only when the destination lies across it (amphibious frames go either way). It never attacks on its own.
  function gotoSurface(g, u, p) {
    const t = TYPES[u.type];
    if (t.naval === 'ship') return 'sea';
    return !t.naval && !atSea(g, u) && massOf(g, u) >= 0 && massOf(g, u) === massOf(g, p) ? 'land' : null;
  }
  function routeField(g, u, p, avoidBlockers = true) {
    const surface = gotoSurface(g, u, p),
      field = goalField(g, u.side, [[p, 0]], surface, avoidBlockers ? u : null);
    // A stale map component or an impassable land route must not prevent a viable coastal journey.
    return surface === 'land' && !Number.isFinite(field[u.r * g.cols + u.c]) &&
      (!avoidBlockers || !Number.isFinite(goalField(g, u.side, [[p, 0]], surface)[u.r * g.cols + u.c]))
      ? goalField(g, u.side, [[p, 0]], null, avoidBlockers ? u : null) : field;
  }
  function gotoReason(g, u, p) {
    if (!u || u.hp <= 0) return 'Unavailable';
    if (g.over) return 'Operation over';
    if (u.side !== g.phase) return 'Not your unit';
    const t = p && tile(g, p.c, p.r),
      naval = TYPES[u.type].naval;
    if (!t) return 'Choose a hex on the map';
    if (TERRAIN[t.terrain]?.blocked) return 'Impassable terrain';
    if (naval === 'ship' && (!navigable(t) || stationAt(g, t))) return 'Warships stay at sea';
    if (!naval && isSea(t)) return 'Choose a land hex';
    if (t.c === u.c && t.r === u.r) return 'Already there';
    // Temporary occupancy or defenses may clear before the unit arrives.
    return Number.isFinite(routeField(g, u, t, false)[u.r * g.cols + u.c]) ? null : 'No route there';
  }
  function setGoto(g, id, c, r) {
    const u = g.units.find(v => v.id === id),
      p = tile(g, c, r),
      why = gotoReason(g, u, p);
    if (why) return { ok: false, reason: why };
    u.goto = { c: p.c, r: p.r };
    return { ok: true, goto: u.goto };
  }
  function clearGoto(g, id) {
    const u = g.units.find(v => v.id === id);
    if (!u?.goto) return { ok: false, reason: 'No destination set' };
    delete u.goto;
    return { ok: true };
  }
  // Arrived: on the destination, or beside it when it cannot be entered (occupied, or an enemy city it cannot take).
  function gotoDone(g, u, p) {
    if (u.c === p.c && u.r === p.r) return true;
    if (dist(g, u, p) > 1) return false;
    const occ = unitAt(g, p),
      st = stationAt(g, p);
    return (!!occ && occ !== u) || (!!st && foe(g, st.owner, u.side) && !((canCapture(u) && st.shield <= 0) || navalCityAssault(g, u)));
  }
  // Moves every unit of `side` with a destination one turn along its route, nearest first. Returns what happened:
  // moved [{ id, from, to, captured, seized, annexed }], arrived [id] (order complete), blocked [id] (no free hex
  // farther along its legal route this turn) and lost [id] (no terrain route remains; order cancelled).
  function runGotos(g, side, { assaultOnly = false } = {}) {
    const report = { moved: [], arrived: [], blocked: [], lost: [] },
      fields = new Map();
    const orders = g.units
      // Never rerun a standing order after a unit has moved manually or by automation this turn.
      // Some elite/mobility skills refresh u.moved; autoOrderTurn closes that loophole.
      .filter(u => u.side === side && u.hp > 0 && u.goto && !u.moved && !u.lastTurnMoved && u.autoOrderTurn !== g.turn)
      // The post-fire capture pass must not rerun unrelated personal orders.
      .filter(u => !assaultOnly || (g.armyGroups || []).some(gr =>
        gr.side === side && gr.stance === 'assault' && gr.units.includes(u.id) &&
        gr.operation?.autoRouted?.[u.id]?.c === u.goto?.c &&
        gr.operation?.autoRouted?.[u.id]?.r === u.goto?.r))
      .sort((a, b) => dist(g, a, a.goto) - dist(g, b, b.goto) || a.id - b.id);
    for (const u of orders) {
      if (g.over) break;
      const dest = tile(g, u.goto.c, u.goto.r);
      const assault = (g.armyGroups || []).some(gr => gr.stance === 'assault' && gr.side === side && gr.units.includes(u.id));
      const defendedObjective = assault && dest && dist(g, u, dest) <= 1 &&
        ((unitAt(g, dest) && unitAt(g, dest) !== u && foe(g, unitAt(g, dest).side, side)) ||
         (stationAt(g, dest) && foe(g, stationAt(g, dest).owner, side) && stationAt(g, dest).shield > 0));
      if (dest && gotoDone(g, u, dest) && !defendedObjective) {
        report.arrived.push(u.id);
        delete u.goto;
        continue;
      }
      // A hostile, occupied or shielded objective may be unenterable this turn.
      // Hold the Assault order for bombardment rather than canceling an otherwise valid objective.
      // Amphibious units that can legally enter the tile still proceed with their capture.
      if (defendedObjective && !reachable(g, u).has(key(dest))) {
        report.blocked.push(u.id);
        continue;
      }
      // Replan separately for this unit against the live board, after earlier orders move.
      const field = dest && routeField(g, u, dest);
      const cost = p => field[p.r * g.cols + p.c],
        here = field ? cost(u) : Infinity;
      if (!Number.isFinite(here)) {
        const k = dest && `${dest.c},${dest.r},${gotoSurface(g, u, dest)}`;
        if (dest && !fields.has(k)) fields.set(k, routeField(g, u, dest, false));
        if (dest && Number.isFinite(fields.get(k)[u.r * g.cols + u.c])) report.blocked.push(u.id);
        else {
          report.lost.push(u.id);
          delete u.goto;
        }
        continue;
      }
      let best = null;
      for (const key of reachable(g, u).keys()) {
        const [c, r] = key.split(',').map(Number),
          p = tile(g, c, r),
          v = cost(p);
        if (unitAt(g, p) || !(v < here)) continue;
        if (!best || v < best.v || (v === best.v && dist(g, p, dest) < dist(g, best.p, dest))) best = { p, v };
      }
      const m = best && move(g, u.id, best.p.c, best.p.r);
      if (!m?.ok) {
        // Assault orders persist when adjacent to an enemy-held objective.
        if (defendedObjective) continue;
        report.blocked.push(u.id);
        continue;
      }
      u.autoOrderTurn = g.turn;
      report.moved.push({ id: u.id, from: m.from, to: m.to, captured: m.captured, seized: m.seized, annexed: m.annexed });
      if (gotoDone(g, u, dest) && !(assault && dest && dist(g, u, dest) <= 1 &&
        ((unitAt(g, dest) && unitAt(g, dest) !== u && foe(g, unitAt(g, dest).side, side)) ||
         (stationAt(g, dest) && foe(g, stationAt(g, dest).owner, side) && stationAt(g, dest).shield > 0)))) {
        report.arrived.push(u.id);
        delete u.goto;
      }
    }
    return report;
  }
  root.Knightmare = {
    FACTIONS,
    MAJORS,
    CONQUESTS,
    powersOf,
    hostilePowers,
    isMajor,
    CLASSES,
    NAVAL,
    PORT,
    navalTypes,
    portSite,
    normalizeResearch,
    allUnits,
    setTileOwner,
    setTileTerrain,
    deploy,
    deployReason,
    deployTargets,
    CLASS_ORDER,
    TYPES,
    ROSTER,
    LINEUPS,
    typeFor,
    ELITE_FORCES,
    ELITE_MAX_LEVEL,
    ELITE_UNLOCK_FRAGMENTS,
    ELITE_UPGRADE_FRAGMENTS,
    eliteProfile,
    eliteRecord,
    eliteStats,
    eliteFx,
    eliteUpgradeReason,
    upgradeElite,
    grantEliteFragments,
    eliteVictoryReward,
    elitePrice,
    eliteEligible,
    eliteDeployReason,
    eliteEligible,
    deployElite,
    aiEliteRecruitReason,
    recruitAIElite,
    eliteAIProduction,
    eliteScenario,
    prepareEliteJapan,
    prepareEliteEurope,
    unitStats,
    applyElites,
    lineupOf,
    COMMANDERS,
    RATINGS,
    TERRAIN_CODES,
    hooks,
    foe,
    defaultOfficer,
    fortify,
    claim,
    kill,
    isReady,
    TERRAIN,
    WORLD,
    hexOf,
    lonLatOf,
    reinforceCost,
    repairCost,
    BUILDINGS,
    buildingLevel,
    buildCost,
    build,
    AUTOMATION_DEFAULT_RESERVE,
    automationState,
    automationUnitOptions,
    cityAutomation,
    setCityAutomation,
    automationReserveAllows,
    runCityAutomation,
    bulkCityUpgrade,
    FORTRESS_GUN,
    fortressName,
    fortressReady,
    fortressDamage,
    fortressTargets,
    fireFortress,
    ERAS,
    ARMISTICE,
    objectiveText,
    scenarioOf,
    modeTitle,
    TECH_TREE,
    TECH_NODES,
    TECH_TIERS,
    TOKEN_REWARD,
    normalizeResearch,
    carrierCapacity,
    DIFFICULTIES,
    UPGRADE,
    operationKey,
    ROMAN,
    BRANCHES,
    BRANCH_NAMES,
    branchOf,
    techLevel,
    techValue,
    applyTech,
    missionReward,
    fortressRecharge,
    fortressRange,
    rangeOf,
    RANKS,
    RANK_HP,
    PROMOTE_COST,
    MEDALS,
    GENERIC_SKILLS,
    GENERIC_RESPEC_COST,
    genericSlots,
    genericDescription,
    genericLevel,
    genericCost,
    genericReason,
    buyGeneric,
    removeGenericReason,
    removeGeneric,
    officer,
    medalSlots,
    moraleFloor,
    STARTERS,
    recruitPrice,
    roster,
    owns,
    officerOf,
    applyRoster,
    recruitReason,
    recruitCommander,
    MAX_RATING,
    starCost,
    starReason,
    buyStar,
    promoteCost,
    promote,
    equipMedal,
    unequipMedal,
    applyProfile,
    shortfall,
    repairReason,
    reinforceReason,
    buyReason,
    buildReason,
    researchReason,
    assignReason,
    feintReason,
    promoteReason,
    equipReason,
    clamp,
    key,
    distance,
    opponents: side => MAJORS.filter(s => s !== side),
    alive,
    tile,
    adjacent,
    within,
    unitAt,
    stationAt,
    random,
    log,
    maxHP,
    hullTech,
    raiseFactoryTier,
    migrateSave,
    newUnit,
    movement,
    seaMove,
    atSea,
    isSea,
    isCoast,
    navigable,
    packSave,
    unpackSave,
    ensureWarReport,
    recordWarEvent,
    finishWarTurn,
    reachable,
    hasOrders,
    targets,
    preview,
    move,
    attack,
    income,
    price,
    canBuy,
    recruitOptions,
    recruit,
    reinforce,
    repair,
    researchCost,
    research,
    assign,
    feint,
    beginTurn,
    checkVictory,
    createGame,
    goalField,
    gotoReason,
    setGoto,
    clearGoto,
    runGotos,
    canCapture,
    // Sakuradite.
    SAKURADITE,
    RESOURCE_SITES,
    RULES_VERSION,
    setupSakuradite,
    depositHost,
    depositOwner,
    depositOf,
    depositYield,
    depositShares,
    siteAt,
    cityYield,
    refineReason,
    refine,
    // F.L.E.I.J.A.
    FLEIJA,
    ELIMINATOR,
    fleijaLabTurn,
    hasFleija,
    fleijaPoolSides,
    fleijaWarheadCount,
    fleijaPlayerPriority,
    eliminatorUnlocked,
    eliminatorTurn,
    eliminatorReason,
    startEliminator,
    eliminatorDefender,
    eliminatorCharges,
    eliminatorHolderName,
    transferEliminatorReason,
    transferEliminator,
    projectReason,
    startProject,
    launchReason,
    launch,
    blastArea,
    targetName,
    aiLaunchTarget,
    // Black Knights and JLF commanders.
    ALLIES,
    serves,
    commandTargets,
    actionTargets,
    commanderStatsText,
    commanderStatusText,
  };
  // Shared with the engine's own parts (engine/ai.js); not part of the game's API.
  Object.defineProperty(root.Knightmare, 'internal', {
    value: {
      COMMANDERS,
      ELIMINATOR,
      ELITE_FORCES,
      aiEliteRecruitReason,
      eliteEligible,
      recruitAIElite,
      eliteAIProduction,
      eliteScenario,
      elitePrice,
      TERRAIN,
      cityBusyReason,
      key,
      shortfall,
      FACTIONS,
      FLEIJA,
      fleijaLabTurn,
      fleijaPoolSides,
      fleijaWarheadCount,
      fleijaPlayerPriority,
      MAJORS,
      powersOf,
      isMajor,
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
      isCoast,
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
      transferEliminator,
      siteAt,
      startEliminator,
      startProject,
      stationAt,
      targets,
      tile,
      typeFor,
      unitAt,
    },
  });
  if (typeof module !== 'undefined') {
    module.exports = root.Knightmare;
    require('./engine/ai.js');
  }
})(typeof window !== 'undefined' ? window : globalThis);

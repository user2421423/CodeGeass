  // ======== Elite Forces: persistent unique units ========
  const ELITE_TYPE_TO_ID = Object.fromEntries(Object.entries(ELITE_FORCES).map(([id, e]) => [e.type, id]));
  function eliteProfile(profile = {}) {
    profile.elites ||= {};
    for (const [id, e] of Object.entries(ELITE_FORCES)) {
      const rec = profile.elites[id] || {};
      profile.elites[id] = {
        level: Math.max(0, Math.min(ELITE_MAX_LEVEL, Number.isInteger(rec.level) ? rec.level : 0)),
        fragments: Math.max(0, Number.isFinite(rec.fragments) ? Math.floor(rec.fragments) : e.starter ? ELITE_UNLOCK_FRAGMENTS : 0),
      };
    }
    return profile.elites;
  }
  function eliteRecord(profile, id) {
    return ELITE_FORCES[id] ? eliteProfile(profile)[id] : null;
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
        .filter(([, e]) => e.availableTo.includes(g.player))
        .map(([id, e]) => [id, Math.max(1, Math.round(base * (rarity[e.rarity] || 1)))])
    );
  }

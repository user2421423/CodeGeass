  // ======== Commanders (recruitable officers): signature abilities are data, read by the combat rules ========
  const NOFX = {};
  // Calculated once: permanent personal stats and situational skills are displayed separately,
  // but the existing combat pipeline can read both without applying either twice.
  const COMMANDER_EFFECTS = Object.fromEntries(Object.entries(COMMANDERS).map(([id, c]) =>
    [id, { ...(c.stats || {}), ...c.fx }]));
  const COMMANDER_VERSION = 3;
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
    const t = TYPES[type];
    if (t.naval === 'ship') return 'naval';
    if (t.naval === 'amphibious') return 'amphibious';
    return BRANCHES[t.branch];
  }
  // No old research purchases migrate; unrelated HQ progress remains intact.
  function normalizeResearch(research = {}) {
    const out = {};
    for (const [id, level] of Object.entries(research || {}))
      if (TECH_NODES[id] && Number.isInteger(level) && level > 0)
        out[id] = Math.min(level, TECH_NODES[id].max);
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
    const branch = branchOf(u.type);
    // Infantry Body Armor is a distinct node, so it does not conflict
    // with the Armor branch's own armor-research key.
    if (branch === 'infantry' && k === 'armor')
      return techValue(g, u.side, 'infantry.bodyarmor');
    return techValue(g, u.side, `${branch}.${k}`);
  }
  // Naval units use the Naval HP research instead of inheriting Armor/Artillery frames.
  function hullTech(g, u) {
    return unitTech(g, u, 'hull') + (TYPES[u.type].naval === 'ship' ? techValue(g, u.side, 'naval.hulls') : 0);
  }


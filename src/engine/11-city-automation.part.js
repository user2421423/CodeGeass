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
      if (!unit || s.producedTurn === g.turn) continue;
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
    return g.units.filter(v => v.hp > 0 && !atSea(g, v) && dist(g, u, v) <= (kind === 'cleanse' ? 1 : 2) &&
      (kind === 'cleanse' ? v.side === u.side : kind === 'withdraw' ? v.id !== u.id && v.side === u.side && v.attacked && v.morale > -3
        : foe(g, v.side, u.side)));
  }
  function feint(g, id, targetId = null) {
    const u = g.units.find(v => v.id === id), why = feintReason(g, u);
    if (why) return { ok: false, reason: why };
    const action = COMMANDERS[u.cmd].action, options = actionTargets(g, u);
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


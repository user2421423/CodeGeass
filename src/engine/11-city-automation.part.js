  // ======== Player city automation ========
  // Each automated city has one selected normal unit and makes one attempt
  // per run; automation can be rerun if a produced unit vacates the city.
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
  function automationUnitOptions(g, s, side = g.player) {
    if (!s) return [];
    const landOwned = s.owner === side,
      portOwned = (s.portOwner || s.owner) === side,
      land = landOwned ? (g.buildable?.[side] || Object.values(lineupOf(g, side))) : [],
      navy = portOwned && (s.portAt || (landOwned && portSite(g, s))) ? navalTypes(g, side) : [],
      air = landOwned && airshipType(g, side) ? [airshipType(g, side)] : [];
    return [...new Set([...land, ...navy, ...air])]
      .filter(id => {
        const t = TYPES[id];
        return t && !t.elite && !t.campaign && (portBuilt(t) ? portOwned : landOwned) &&
          (t.side === side || t.side === 'neutral' || t.air || (g.buildable?.[side] || []).includes(id));
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
  function cityAutomation(g, s, side = g.player) {
    const a = automationState(g),
      o = a.cities?.[s?.id] || {},
      options = automationUnitOptions(g, s, side);
    return { unit: options.includes(o.unit) ? o.unit : null };
  }
  function setCityAutomation(g, stationId, patch = {}) {
    const a = automationState(g),
      s = g.stations.find(v => v.id === +stationId);
    if (!s) return { ok: false, reason: 'Unknown city' };
    if (s.owner !== g.player && (!s.portAt || (s.portOwner || s.owner) !== g.player))
      return { ok: false, reason: 'Not your city or port' };
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
    return ['credits', 'industry', 'science', 'sakuradite'].every(k =>
      !cost[k] || (e?.[k] || 0) - cost[k] >= (r?.[k] || 0));
  }
  function automationUpgradeOrder(g, s, unit) {
    const t = TYPES[unit];
    const order = [];
    // If a queued unit is blocked by infrastructure, upgrade that infrastructure first.
    if (portBuilt(t) && (s.portLevel || 0) < (t.port || 0)) order.push('port');
    if (t && !portBuilt(t) && s.tier < t.tier) order.push('factory');
    // Otherwise improve the economy in a predictable global order.
    order.push('refinery', 'lab', 'factory', 'port');
    return [...new Set(order)];
  }
  function emptyAutomationReport() {
    return { units: 0, upgrades: 0, spent: { credits: 0, industry: 0, science: 0, sakuradite: 0 }, entries: [] };
  }
  function addAutomationSpend(report, cost = {}) {
    for (const k of ['credits', 'industry', 'science', 'sakuradite']) report.spent[k] += cost[k] || 0;
  }
  function runCityAutomation(g, side = g.player, opts = {}) {
    const a = automationState(g),
      report = emptyAutomationReport();
    if (g.mode !== 'conquest' || g.over || g.phase !== side || (!a.enabled && !opts.force)) return report;
    const reserve = a.reserve;
    // An independent captured port may operate naval production without owning the city.
    for (const s of g.stations.filter(v => v.owner === side ||
      (v.portAt && (v.portOwner || v.owner) === side)).sort((x, y) => x.id - y.id)) {
      const unit = cityAutomation(g, s, side).unit;
      if (s.owner === side && a.autoUpgrade) {
        for (const kind of automationUpgradeOrder(g, s, unit)) {
          if (buildReason(g, s, kind)) continue;
          const cost = decreePrice(buildCost(s, kind), s);
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
      if (!unit || (portBuilt(TYPES[unit]) && s.portProducedTurn === g.turn)) continue;
      const t = TYPES[unit],
        producer = portBuilt(t) ? (s.portOwner || s.owner) : s.owner;
      if (producer !== side) continue;
      const stack = t.naval === 'ship' ? 1 : a.stack,
        cost = decreePrice(recruitCost(g, s, unit, stack), s.owner === side ? s : null);
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
        `AUTOMATED LOGISTICS: ${report.units} unit${report.units === 1 ? '' : 's'} produced · ${report.upgrades} building upgrade${report.upgrades === 1 ? '' : 's'} · ${report.spent.credits} credits · ${report.spent.industry} industry${report.spent.science ? ` · ${report.spent.science} research` : ''}${report.spent.sakuradite ? ` · ${report.spent.sakuradite} Sakuradite` : ''} spent.`,
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
      const cost = decreePrice(buildCost(s, kind), s);
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
    funds(g, u.side).credits -= assignmentCost(g, k);
    const old = maxHP(u);
    u.cmd = k;
    u.personal = true;
    if (g.mode === 'conquest' && u.side === g.player && g.challengePassRun?.version === 1)
      g.challengePassRun.assigned[k] = true;
    u.cmdRank = g.roster[k].rank;
    u.hp += maxHP(u) - old;
    if (k === 'leila' || k === 'fernando') applyLeilaMoraleFloor(g);
    log(g, `${a.short} takes command of ${TYPES[u.type].short}.`, u.side);
    return { ok: true };
  }
  // A bonus shot still requires the shooter's real range and weapon class.
  function grandMastersParticipants(g, u, target) {
    if (!target || target.hp <= 0 || !foe(g, target.side, u.side)) return [];
    const eligible = w => w.hp > 0 && !atSea(g,w) &&
      w.expFarneseSlaughterTurn !== g.turn &&
      inRange(w,target,g) && hostileTarget(g,w,target);
    const leader = eligible(u) ? [u] : [];
    const allies = g.units.filter(w => w.id !== u.id && w.side === u.side &&
      dist(g,u,w) <= 2 && eligible(w));
    allies.sort((a,b) => power(g,b,target,stationAt(g,target)) -
      power(g,a,target,stationAt(g,target)) || a.id - b.id);
    return leader.concat(allies.slice(0,3));
  }
  // Command actions share cooldown/range validation; only targeted actions require a picker.
  function actionTargets(g, u) {
    if (!u || !COMMANDERS[u.cmd]?.action) return [];
    const kind = COMMANDERS[u.cmd].action.kind;
    if (kind === 'farneseWithdrawal') return g.units.some(v =>
      v.hp > 0 && v.side === u.side && dist(g,u,v) <= 3 &&
      v.hp < maxHP(v) * 0.5) ? [u] : [];
    if (kind === 'manfrediRequisition') return g.units.filter(v=>v.hp>0&&v.side===u.side&&!atSea(g,v)&&dist(g,u,v)<=2&&!TYPES[v.type].elite&&v.stack<3);
    if (kind === 'arkFleet') return g.stations.filter(s=>s.owner&&foe(g,s.owner,u.side));
    if (kind === 'command') return u.cmd === 'zero'
      ? commandTargets(g, u).concat(g.units.filter(v => v.hp > 0 &&
          foe(g, v.side, u.side) && !atSea(g, v) && dist(g, u, v) <= 2 &&
          g.units.some(w=>w.hp>0&&w.id!==v.id&&w.side===v.side&&!atSea(g,w)&&inRange(v,w,g))))
      : commandTargets(g, u);
    if (kind === 'special') return newcomerTargets(g,u);
    if (kind === 'shinDeath') return g.units.filter(v=>v.hp>0&&foe(g,v.side,u.side)&&!atSea(g,v)&&dist(g,u,v)<=2);
    if (kind === 'maskFalls') return g.units.filter(v=>v.hp>0&&v.side===u.side&&!atSea(g,v)&&dist(g,u,v)<=3);
    if (kind === 'miguelSupply') return g.units.filter(v=>v.hp>0&&foe(g,v.side,u.side)&&!atSea(g,v)&&dist(g,u,v)<=3);
    if (kind === 'electricalOverload') return g.units.filter(v => v.hp > 0 &&
      foe(g, v.side, u.side) && !atSea(g, v) && dist(g, u, v) === 1 &&
      inRange(u, v, g) && hostileTarget(g, u, v));
    if (kind === 'freeze') return g.units.filter(v => v.hp > 0 &&
      foe(g, v.side, u.side) && !atSea(g, v) && dist(g, u, v) <= 1);
    if (kind === 'checkmate') return g.units.filter(v => v.hp > 0 &&
      foe(g,v.side,u.side) && !atSea(g,v) && dist(g,u,v) <= 3);
    if (kind === 'grandMastersAssault') return g.units.filter(v => v.hp > 0 &&
      foe(g,v.side,u.side) && !atSea(g,v) && dist(g,u,v) <= 3 &&
      grandMastersParticipants(g,u,v).length > 0);
    if (kind === 'memoryRewrite') return g.units.filter(v => v.hp > 0 &&
      foe(g, v.side, u.side) && !atSea(g, v) && dist(g, u, v) <= 3 &&
      v.morale > -3 && !v.expCharlesMemoryRewrite && !v.moraleWard && moraleFloor(g, v) <= -3);
    if (kind === 'geassCancel') return g.units.filter(v => v.hp > 0 &&
      foe(g,v.side,u.side) && !atSea(g,v) && dist(g,u,v) <= 2);
    // C.C. protects one ally, not herself; all playable land formations qualify.
    if (kind === 'expendableVanguard') return g.units.filter(v => v.hp > 0 &&
      v.side === u.side && v.id !== u.id && !atSea(g, v) &&
      dist(g, u, v) <= 2 && !v.expSmilasVanguardCharge);
    if (kind === 'ohgiHeal') return g.units.filter(v => v.hp > 0 &&
      v.side === u.side && v.id !== u.id && !atSea(g, v) &&
      dist(g, u, v) <= 2 && v.hp < maxHP(v));
    if (kind === 'protection' || kind === 'oscarDefense') return g.units.filter(v => v.hp > 0 &&
      v.side === u.side && v.id !== u.id && !atSea(g, v) && dist(g, u, v) <= 2);
    // Imperial Command affects every on-map friendly formation in range,
    // including Lelouch himself. No target selection is required.
    if (kind === 'imperial') return g.units.filter(v => v.hp > 0 &&
      v.side === u.side && !atSea(g, v) && dist(g, u, v) <= 2);
    // Synchronized Maneuver refreshes Leila too, and any friendly on-map
    // formation (including naval units) that has spent its movement or attack.
    if (kind === 'withdraw') return g.units.filter(v => v.hp > 0 && v.side === u.side &&
      dist(g, u, v) <= 2 && (v.moved || v.attacked));
    return g.units.filter(v => v.hp > 0 && !atSea(g, v) && dist(g, u, v) <= (kind === 'cleanse' ? 1 : 2) &&
      (kind === 'cleanse' ? v.side === u.side : foe(g, v.side, u.side)));
  }
  // Cosmetic combat records describe strikes already resolved by the rules.
  // They never execute a second attack or spend a formation's normal actions.
  function commanderCombatRecord(attacker, target, damage, shieldDamage = 0, counter = 0) {
    return {
      attacker: { id:attacker.id, type:attacker.type, side:attacker.side, c:attacker.c, r:attacker.r },
      result: {
        ok:true, from:{c:attacker.c,r:attacker.r}, to:{c:target.c,r:target.r}, targetId:target.id,
        hit:[{id:target.id,c:target.c,r:target.r,damage:Math.max(0,damage)}],
        shieldDamage, counter:Math.max(0,counter), destroyed:target.hp<=0, crit:false,
      },
    };
  }
  // Transient presentation records stay outside saved game state. Nested
  // attacks (such as Electrical Overload) share their outer action's queue.
  const abilityVisualQueues = new WeakMap();
  function collectAbilityVisuals(g, resolve) {
    if (abilityVisualQueues.has(g)) return resolve();
    const events = [];
    abilityVisualQueues.set(g, events);
    try {
      const result = resolve();
      if (result?.ok && events.length) result.abilityEffects = events;
      return result;
    } finally { abilityVisualQueues.delete(g); }
  }
  function recordAbilityAttack(g, attacker, target, damage, crit = false) {
    const events = abilityVisualQueues.get(g);
    if (!events) return;
    const record = commanderCombatRecord(attacker,target,damage);
    record.result.crit = crit;
    events.push({kind:'attack',...record,target:{id:target.id,type:target.type,
      side:target.side,stack:target.stack,c:target.c,r:target.r}});
  }
  function recordAbilitySignal(g, target, label, kind = 'buff') {
    abilityVisualQueues.get(g)?.push({kind:'signal',to:{c:target.c,r:target.r},label,tone:kind});
  }
  function feint(g, id, targetId = null) {
    return collectAbilityVisuals(g, () => resolveFeint(g,id,targetId));
  }
  function resolveFeint(g, id, targetId = null) {
    const check = validateAction(g, { kind: 'commander', id });
    if (!check.ok) return check;
    const u = check.actor;
    const action = COMMANDERS[u.cmd].action, options = actionTargets(g, u);
    if (action.kind === 'special') return newcomerUse(g,u,targetId);
    if (action.kind === 'farneseWithdrawal') {
      let affected = 0;
      for (const ally of g.units) {
        if (ally.hp <= 0 || ally.side !== u.side || dist(g,u,ally) > 3 ||
            ally.hp >= maxHP(ally) * 0.5) continue;
        // Restore a spent move; bank a full extra move for units that have
        // not yet spent their movement. Attack availability is unchanged.
        if (ally.moved) {
          if (!heavyMoveLimitReached(g,ally)) {
            ally.moved = false; ally.withdrawMove = true;
            ally.skillReposition = 0;
          }
        } else if (!heavyMoveLimitReached(g,ally)) {
          ally.expFarneseExtraMove = Math.max(1,ally.expFarneseExtraMove||0);
        }
        ally.expFarneseWithdrawal = {side:ally.side,source:u.id};
        affected++;
      }
      if (!affected) return {ok:false,reason:'No friendly formations below 50% HP within 3 hexes'};
      u.feintCD = 0;u.feintUsedTurn = g.turn;
      log(g,'Orderly Withdrawal grants '+affected+' endangered friendly formations movement and protection.',u.side);
      return {ok:true,affected};
    }
    if(action.kind==='manfrediRequisition'){
      const v=targetId==null?options[0]:options.find(w=>w.id===targetId);
      if(!v)return {ok:false,reason:'Choose a normal friendly formation within 2 hexes with room for another frame'};
      const priorMax=maxHP(v);
      v.stack++;
      v.hp=Math.min(maxHP(v),v.hp+Math.max(1,Math.round(maxHP(v)-priorMax)));
      u.feintCD=action.cooldown;u.feintUsedTurn=g.turn;
      log(g,'Grand Master Manfredi adds a free frame to '+(COMMANDERS[v.cmd]?.short||TYPES[v.type].short)+'.',u.side);
      return {ok:true,target:v.id,affected:1,frames:1};
    }
    if (action.kind === 'arkFleet') {
      const city=targetId==null?options[0]:options.find(s=>s.id===targetId);
      if(!city)return {ok:false,reason:'Choose an enemy city'};
      city.expArkFleet={source:u.id,owner:city.owner,turns:2};
      for(const enemy of g.units)if(enemy.hp>0&&foe(g,enemy.side,u.side)&&!atSea(g,enemy)&&dist(g,enemy,city)<=3){
        lowerMorale(g,enemy,1);
        enemy.expArkFleetSlow={side:enemy.side,turns:2,penalty:2};
      }
      // Independent deployment timer; ordinary Ark Fleet use never resets it.
      let airship=null;
      if(u.arkFleetAirshipCD==null)u.arkFleetAirshipCD=10;
      if(u.arkFleetAirshipCD<=0){
        const type='logres_airship';
        const bases=g.stations.filter(s=>s.owner===u.side).sort((a,b)=>dist(g,a,city)-dist(g,b,city)||b.tier-a.tier);
        for(const base of bases){
          const p=nearest(g,base,t=>solidLand(t)&&t.owner===u.side&&!unitAt(g,t)&&!stationAt(g,t));
          if(p){airship=newUnit(g,type,u.side,p.c,p.r,1,null,false);u.arkFleetAirshipCD=10;break;}
        }
      }
      u.feintCD=0;u.feintUsedTurn=g.turn;
      log(g,'Ark Fleet spreads terror around '+city.name+(airship?' and deploys a free Logres airship':'' )+'.',u.side);
      return {ok:true,target:city.id,affected:1,airship:airship?.id};
    }
    if (action.kind === 'shinDeath') {
      const v=options.find(w=>w.id===targetId) || (targetId==null?options[0]:null);
      if(!v)return {ok:false,reason:'Choose an enemy within 2 hexes'};
      // The percentage defines base strike power, not unavoidable true damage.
      // Scale through the same attack/defense power ratio used by ordinary combat.
      const base=Math.max(1,Math.round(maxHP(v)*0.5));
      const ordinary=Math.max(0,power(g,u,v,stationAt(g,v),false,false));
      const unprotected=Math.max(1,power(g,u,null,null,false,false));
      const damage=Math.max(1,Math.round(base*ordinary/unprotected));
      const before=v.hp;
      smilasDealCombatDamage(g,v,u,damage);
      if(v.hp<=0){v.expDirectIncoming=true;kill(g,v,u,false,null,damage);delete v.expDirectIncoming;}
      u.feintCD=action.cooldown;u.feintUsedTurn=g.turn;
      log(g,'Command to Die strikes '+(COMMANDERS[v.cmd]?.short||TYPES[v.type].short)+'.',u.side);
      checkVictory(g);
      return {ok:true,target:v.id,damage:before-v.hp,
        combat:[commanderCombatRecord(u,v,before-v.hp)]};
    }
    if (action.kind === 'maskFalls') {
      if(u.side!==g.player)return {ok:false,reason:'The AI cannot use The Mask Falls'};
      const cost=Math.min(Math.max(0,u.hp-1),Math.round(maxHP(u)*0.8));
      u.hp-=cost;u.moved=true;u.attacked=true;
      for(const v of options){
        if(v.id!==u.id){
          v.moved=false;v.attacked=false;v.chain=0;v.moveActionsThisTurn=0;
          v.movedDistance=0;v.skillReposition=0;v.eliteMoveAfterKill=false;
          delete v.expKallenReposition;
        }
        // Death rally takes precedence only for units without an active Mask buff.
        if(!v.expDeathEmperor){
          v.expMaskFalls={side:u.side,source:u.id,attackReady:true};
        }
      }
      u.feintCD=0;u.feintUsedTurn=g.turn;
      log(g,'The Mask Falls: Lelouch sacrifices '+cost+' HP to rally '+options.length+' formations.',u.side);
      return {ok:true,affected:options.length,cost};
    }
    if(action.kind==='miguelSupply'){
      const v=targetId==null?[...options].sort((a,b)=>Number(!!b.cmd)-Number(!!a.cmd)||b.hp-a.hp||a.id-b.id)[0]
        :options.find(w=>w.id===targetId);
      if(!v)return {ok:false,reason:'Choose an enemy formation within 3 hexes'};
      v.expMiguelSupply={source:u.id,side:u.side};
      u.feintCD=0;u.feintUsedTurn=g.turn;
      log(g,'Miguel severs the supply lines of '+(COMMANDERS[v.cmd]?.short||TYPES[v.type].short)+'.',u.side);
      return {ok:true,target:v.id,affected:1};
    }
    if (action.kind === 'grandMastersAssault') {
      const v = targetId == null ? [...options].sort((a,b) =>
        Number(!!b.cmd)-Number(!!a.cmd) || b.hp-a.hp || a.id-b.id)[0]
        : options.find(w => w.id === targetId);
      if (!v) return { ok:false, reason:'Choose a reachable enemy formation within 3 hexes' };
      const participants = grandMastersParticipants(g,u,v);
      if (!participants.length) return { ok:false, reason:'No allied weapon can reach the target' };
      // Start cooldown before damage: allied kills may immediately shorten it.
      u.feintCD = action.cooldown;
      u.feintUsedTurn = g.turn;
      let totalDamage=0, shieldDamage=0, fired=0;
      const combat = [];
      for (const shooter of participants) {
        if (v.hp <= 0 || g.over) break;
        const shot = preview(g,shooter.id,v.c,v.r);
        if (!shot) continue;
        const city = stationAt(g,v);
        let shotShieldDamage = 0;
        if (city && foe(g,city.owner,shooter.side)) {
          city.attackedSinceRegen = true;
          const lost = Math.min(city.shield, Math.max(0,Math.round((shot.shield || 0)*.75)));
          city.shield -= lost;
          shieldDamage += lost;
          shotShieldDamage = lost;
        }
        let incoming = Math.max(1,Math.round((shot.rawUnit ?? shot.unit)*.75));
        if (v.expCCProtection) delete v.expCCProtection;
        consumeDefensiveSkills(g,v,shooter);
        incoming = newcomerIntercept(g,v,incoming);
        if (fx(v).futureSightDodge && random(g) < fx(v).futureSightDodge) {
          incoming = 0;
          recordAbilitySignal(g,v,'EVADED','guard');
          log(g,'FUTURE SIGHT — EVADED',v.side);
        }
        const prior=v.hp;
        smilasDealCombatDamage(g,v,shooter,incoming);
        const dealt=prior-v.hp;
        totalDamage += dealt;
        fired++;
        recordWarEvent(g,'damage',shooter.side,{targetSide:v.side,
          value:dealt,unitId:shooter.id,group:warGroup(g,shooter)});
        v.struck={turn:g.turn,side:shooter.side};
        if(v.skillMarks?.length)v.skillMarks=v.skillMarks.filter(m=>m.side!==shooter.side||!m.uses);
        if (v.hp <= 0) {
          v.expDirectIncoming = true;
          kill(g,v,shooter,false,null,incoming);
          delete v.expDirectIncoming;
        }
        combat.push(commanderCombatRecord(shooter,v,dealt,shotShieldDamage));
      }
      log(g,"Grand Master's Assault: "+fired+' participating shots, '+
        totalDamage+' damage and '+shieldDamage+' city-shield damage.',u.side);
      checkVictory(g);
      return {ok:true,target:v.id,affected:fired,damage:totalDamage,shieldDamage,combat};
    }
    if (action.kind === 'electricalOverload') {
      const v = targetId == null ? options[0] : options.find(w => w.id === targetId);
      if (!v) return { ok: false, reason: 'Choose an adjacent enemy in attack range' };
      // A regular damaging attack with its usual attack cost, but without
      // either normal retaliation or Senba's special defensive reaction.
      u.expFernandoOverloadStrike = true;
      let result;
      try { result = attack(g, u.id, v.c, v.r); }
      finally { delete u.expFernandoOverloadStrike; }
      if (!result.ok) return result;
      if (v.hp > 0) {
        v.expFernandoOverload = { source: u.id, side: u.side };
        v.moved = true;
      }
      u.feintCD = 0;
      u.feintUsedTurn = g.turn;
      log(g, `Electrical Overload strikes ${COMMANDERS[v.cmd]?.short || TYPES[v.type].short}.`, u.side);
      return { ok: true, target: v.id, affected: v.hp > 0 ? 1 : 0, attack: result };
    }
    if (action.kind === 'oscarDefense') {
      // Once per turn, select one allied formation, not Oscar himself.
      const v=targetId==null ? [...options].sort((a,b)=>
        Number(!!b.attacked)-Number(!!a.attacked) || a.hp/maxHP(a)-b.hp/maxHP(b) || a.id-b.id)[0]
        : options.find(w=>w.id===targetId);
      if(!v)return {ok:false,reason:'Choose an allied formation within 2 hexes'};
      // One designated defensive center per Oscar; no hidden stacking.
      for(const ally of g.units)
        if(ally.expOscarDefense?.source===u.id)delete ally.expOscarDefense;
      v.expOscarDefense={source:u.id,side:u.side};
      // Separate movement permission: 3 legal movement points, not an
      // action reset. A move consumes this free reposition first and leaves
      // the normal move and attack flags exactly as they were.
      v.expOscarReposition=true;
      u.feintCD=0;
      u.feintUsedTurn=g.turn;
      log(g,`Oscar places ${COMMANDERS[v.cmd]?.short||TYPES[v.type].short} under Emergency Defense.`,u.side);
      return {ok:true,target:v.id,affected:1,reposition:3};
    }
    if (action.kind === 'expendableVanguard') {
      const v = targetId == null ? [...options].sort((a,b) =>
        Number(!!b.cmd)-Number(!!a.cmd) ||
        Number(!!b.attacked)-Number(!!a.attacked) ||
        TYPES[b.type].attack*(b.stack||1)-TYPES[a.type].attack*(a.stack||1) ||
        a.id-b.id)[0] : options.find(v => v.id === targetId);
      if (!v) return { ok:false, reason:'Choose an eligible allied formation within 2 hexes' };
      // A full activation is granted even if both actions were still unused.
      // Keep once-per-turn special stamps and heavy-frame move caps intact.
      v.moved = false;
      v.attacked = false;
      v.chain = 0;
      v.skillReposition = 0;
      v.withdrawMove = false;
      v.eliteMoveAfterKill = false;
      delete v.expAkitoMoveReady;
      v.expSmilasVanguardCharge = true;
      u.feintCD = action.cooldown ?? 3;
      u.feintUsedTurn = g.turn;
      log(g, `Expendable Vanguard sends ${COMMANDERS[v.cmd]?.short||TYPES[v.type].short} forward at a deadly cost.`,u.side);
      return { ok:true, target:v.id, affected:1 };
    }
    if (action.kind === 'ohgiHeal') {
      const cost = Math.max(1, Math.round(maxHP(u) * 0.20));
      if (u.hp <= cost) return { ok: false, reason: 'Ohgi must survive the HP sacrifice' };
      const v = targetId == null ? [...options].sort((a, b) =>
        Math.min(maxHP(b) * 0.30, maxHP(b) - b.hp) -
        Math.min(maxHP(a) * 0.30, maxHP(a) - a.hp) ||
        Number(!!b.cmd) - Number(!!a.cmd) || a.id - b.id)[0]
        : options.find(w => w.id === targetId);
      if (!v) return { ok: false, reason: 'Choose a wounded ally within 2 hexes' };
      const healed = Math.min(maxHP(v) - v.hp, Math.max(1, Math.round(maxHP(v) * 0.30)));
      v.hp += healed;
      u.hp -= cost;
      u.feintCD = action.cooldown ?? 3;
      u.feintUsedTurn = g.turn;
      log(g, `Ohgi sacrifices ${cost} HP to heal ${COMMANDERS[v.cmd]?.short || TYPES[v.type].short} for ${healed} HP.`, u.side);
      return { ok: true, target: v.id, affected: 1, healed, cost };
    }
    if (action.kind === 'memoryRewrite') {
      const v = targetId == null ? [...options].sort((a, b) =>
        Number(!!b.cmd) - Number(!!a.cmd) ||
        TYPES[b.type].attack * (b.stack || 1) - TYPES[a.type].attack * (a.stack || 1) ||
        a.id - b.id)[0] : options.find(w => w.id === targetId);
      if (!v) return { ok: false, reason: 'Choose a vulnerable enemy formation within 3 hexes' };
      // Confused is the existing -3 morale state. Remember the previous
      // morale so this single-turn rewrite does not cause lasting penalties.
      v.expCharlesMemoryRewrite = { source: u.id, previousMorale: v.morale };
      v.morale = -3;
      u.feintCD = action.cooldown ?? 3;
      u.feintUsedTurn = g.turn;
      log(g, `Charles rewrites the memories of ${COMMANDERS[v.cmd]?.short || TYPES[v.type].short}: Confused until its next turn ends.`, u.side);
      return { ok: true, target: v.id, affected: 1 };
    }
    if (action.kind === 'checkmate') {
      const v = targetId == null ? [...options].sort((a,b) =>
        Number(!!b.cmd)-Number(!!a.cmd) || b.hp-a.hp || a.id-b.id)[0]
        : options.find(w => w.id === targetId);
      if (!v) return {ok:false,reason:'Choose an enemy formation within 3 hexes'};
      // A commander may designate only one formation at a time.
      for (const other of g.units)
        if (other.expCheckmate?.source === u.id) delete other.expCheckmate;
      v.expCheckmate = {source:u.id,side:u.side};
      u.feintCD = 0;
      u.feintUsedTurn = g.turn;
      log(g,`Checkmate: ${COMMANDERS[v.cmd]?.short||TYPES[v.type].short} is marked for concentrated fire.`,u.side);
      return {ok:true,target:v.id,affected:1};
    }
    if (action.kind === 'freeze') {
      // Freeze everybody before the health cost; even a lethal activation works.
      for (const v of options) {
        v.expRoloFrozen = { source: u.id, side: u.side };
        v.moved = true;
        v.attacked = true;
      }
      const cost = Math.max(1, Math.round(maxHP(u) * 0.10));
      u.hp = Math.max(0, u.hp - cost);
      u.feintCD = action.cooldown ?? 3;
      u.feintUsedTurn = g.turn;
      log(g, `Rolo's Absolute Suspension freezes ${options.length} enemy formations and costs ${cost} HP.`, u.side);
      if (u.hp <= 0) kill(g, u, null, true);
      checkVictory(g);
      return { ok: true, affected: options.length, cost, selfDestructed: u.hp <= 0 };
    }
    if (action.kind === 'geassCancel') {
      const v = targetId == null ? [...options].sort((a,b) =>
        Number(!!b.cmd)-Number(!!a.cmd) || b.hp-a.hp || a.id-b.id)[0]
        : options.find(w => w.id === targetId);
      if (!v) return {ok:false,reason:'Choose an enemy formation within 2 hexes'};
      // Dispel temporary commander-granted benefits, not intrinsic skills,
      // research or elite upgrades. Also lift Geass-induced negative statuses.
      for (const key of ['expImperialCommand','expCCProtection','expKallenReposition',
        'expKallenMoveBank','expAkitoMoveReady','expZeroGeass']) {
        if (key === 'expZeroGeass' && v.expZeroGeass)
          v.morale = Math.min(1,v.morale+(v.expZeroGeass.moraleLost||0));
        delete v[key];
      }
      // Suppress active use through the target's next faction activation.
      v.expGeassCancelled = true;
      u.feintCD = 0;
      u.feintUsedTurn = g.turn;
      log(g,`Geass Canceller disrupts ${COMMANDERS[v.cmd]?.short||TYPES[v.type].short}.`,u.side);
      return {ok:true,target:v.id,affected:1};
    }
    if (action.kind === 'protection') {
      // Player picks an ally explicitly; the AI chooses the ally most in need.
      const v = targetId == null ? [...options].sort((a, b) =>
        (maxHP(b) - b.hp) - (maxHP(a) - a.hp) ||
        a.morale - b.morale || a.id - b.id)[0] : options.find(w => w.id === targetId);
      if (!v) return { ok: false, reason: 'Choose an eligible ally within 2 hexes' };
      v.hp = Math.min(maxHP(v), v.hp + Math.round(maxHP(v) * 0.15));
      v.morale = Math.max(0, v.morale);
      // One-hit protection is not additive: recasting replaces its charge.
      v.expCCProtection = { source: u.id, side: u.side };
      u.feintCD = 0;
      u.feintUsedTurn = g.turn;
      log(g, `C.C.'s Protection shields ${COMMANDERS[v.cmd]?.short || TYPES[v.type].short}.`, u.side);
      return { ok: true, target: v.id, affected: 1 };
    }
    if (action.kind === 'imperial') {
      // One-turn support; repeated commanders refresh rather than stack.
      for (const v of options) {
        v.morale = 1;
        v.expImperialCommand = { side: u.side, source: u.id, turn: g.turn };
      }
      u.feintCD = 0;
      u.feintUsedTurn = g.turn;
      log(g, `Imperial Command strengthens ${options.length} friendly formations.`, u.side);
      return { ok: true, affected: options.length };
    }
    if (['command', 'designate', 'stratagem'].includes(action.kind)) {
      const combat = [];
      const v = targetId == null ? options.sort((a, b) => TYPES[b.type].attack * b.stack - TYPES[a.type].attack * a.stack || a.id - b.id)[0]
        : options.find(v => v.id === targetId);
      if (!v) return { ok: false, reason: 'Choose a valid target within 2 hexes' };
      if (action.kind === 'command' && u.cmd === 'zero' && foe(g, v.side, u.side)) {
        const victims=g.units.filter(w=>w.hp>0&&w.id!==v.id&&w.side===v.side&&!atSea(g,w)&&inRange(v,w,g))
          .sort((a,b)=>dist(g,v,a)-dist(g,v,b)||a.id-b.id);
        const w=victims[0];
        if(!w)return {ok:false,reason:'No same-faction formation within weapon range'};
        // A compelled strike bypasses hostility checks but not armor, terrain,
        // city cover or ordinary counterfire eligibility.
        const hit=Math.max(1,Math.round(power(g,v,w,stationAt(g,w),false,false)));
        const priorTargetHP = w.hp, priorAttackerHP = v.hp;
        smilasDealCombatDamage(g,w,v,hit);
        if(w.hp<=0){w.expDirectIncoming=true;kill(g,w,v,false,null,hit);delete w.expDirectIncoming;}
        if(v.hp>0&&w.hp>0&&inRange(w,v,g)&&w.morale>-3&&!w.expRoloFrozen&&!w.expCharlesMemoryRewrite){
          const retaliation=Math.max(1,Math.round(power(g,w,v,stationAt(g,v),true,false)));
          smilasDealCombatDamage(g,v,w,retaliation);
          if(v.hp<=0){v.expDirectIncoming=true;kill(g,v,w,false,null,retaliation);delete v.expDirectIncoming;}
        }
        combat.push(commanderCombatRecord(v,w,priorTargetHP-w.hp,0,priorAttackerHP-v.hp));
        checkVictory(g);
      } else if (action.kind === 'command') {
        v.moved = v.attacked = false;
        v.chain = 0;
        v.moveActionTurn = g.turn;
        v.moveActionsThisTurn = 0;
        v.movedDistance = 0;
        v.eliteMoveAfterKill = false;
        v.skillReposition = 0;
        v.withdrawMove = false;
        // Kallen's earned movement bank stays, but a pending limited
        // reposition must not override the full movement Zero restores.
        delete v.expKallenReposition;
        // A new normal activation, NOT a new turn: retain once-per-turn
        // stamps for commander skills, Elite perks and other special effects.
      } else addTargetMark(v, { side: u.side, source: u.id, range: 2,
        damage: action.kind === 'designate' ? 0.2 : 0, noCounter: action.kind === 'stratagem' });
      u.feintCD = COMMANDERS[u.cmd].action.cooldown ?? 3;
      u.feintUsedTurn = g.turn;
      log(g, `${action.verb}: ${COMMANDERS[v.cmd]?.short || TYPES[v.type].short} ${action.kind === 'command' ? (v.side === u.side ? 'receives a fresh activation' : 'is forced to attack its own faction') : 'designated'}.`, u.side);
      return { ok: true, target: v.id, affected: 1, combat };
    }
    for (const v of options) {
      if (action.kind === 'cleanse') { v.morale = Math.max(0, v.morale); v.moraleWard = { side: u.side }; }
      else if (action.kind === 'withdraw') {
        v.moved = false;
        v.withdrawMove = true; // One FULL legal movement action, including after attacking.
        v.skillReposition = 0;
        // Never restore v.attacked: the command does not grant additional attacks.
      }
      else lowerMorale(g, v, 2);
    }
    u.feintCD = COMMANDERS[u.cmd].action.cooldown ?? 3;
    u.feintUsedTurn = g.turn;
    log(g, `${action.verb} affects ${options.length} units.`, u.side);
    return { ok: true, affected: options.length };
  }


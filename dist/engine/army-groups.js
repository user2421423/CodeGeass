/* Player-defined operational groups for world conquest and regional scenarios.
   Groups issue ordinary standing orders and never bypass movement, combat or capture rules.
   Source of truth: this standalone extension; loaded after engine.js. */
(function (E) {
  'use strict';
  const MAX_GROUPS = 12;
  const MAX_UNITS = 24;

  // Legacy saves used Defend; upgrade it to passive Hold Position on first access.
  const groups = g => {
    const list = (g.armyGroups ||= []);
    for (const gr of list) {
      if (gr.stance !== 'defend') continue;
      for (const id of gr.units || [])
        clearMatchingOrder(g, g.units.find(u => u.id === id), gr.destination);
      gr.stance = 'hold';
      delete gr.operation;
    }
    return list;
  };
  const find = (g, id) => groups(g).find(v => v.id === id && v.side === g.player);
  function canEdit(g) {
    if (g.mode !== 'conquest' && g.mode !== 'scenario') return 'Available in conquest or scenarios only';
    if (g.over) return 'Operation over';
    if (g.phase !== g.player) return 'Not your turn';
    return null;
  }
  function prune(g) {
    const seen = new Set();
    for (const gr of groups(g)) {
      gr.units = (gr.units || []).filter(id => {
        // Keep members aboard carriers: they retain their IDs and rejoin the map when deployed.
        const alive = g.units.some(u => (u.id === id && u.hp > 0 && u.side === gr.side) ||
          (u.cargo || []).some(v => v.id === id && v.hp > 0 && v.side === gr.side));
        if (!alive || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }
  }
  function clearMatchingOrder(g, u, p) {
    if (u && p && u.goto?.c === p.c && u.goto?.r === p.r) delete u.goto;
  }
  function create(g, firstUnitId = null) {
    const why = canEdit(g);
    if (why) return { ok: false, reason: why };
    if (groups(g).length >= MAX_GROUPS) return { ok: false, reason: 'Maximum 12 army groups' };
    const first = firstUnitId == null ? null : g.units.find(u => u.id === firstUnitId && u.hp > 0 && u.side === g.player);
    if (firstUnitId != null && !first) return { ok: false, reason: 'Unit unavailable' };
    g.nextArmyGroupId = Math.max(g.nextArmyGroupId || 1, ...groups(g).map(gr => gr.id + 1), 1);
    const id = g.nextArmyGroupId++;
    const group = { id, side: g.player, name: 'Army Group ' + id, units: [], destination: null, stance: 'advance' };
    groups(g).push(group);
    if (first) add(g, id, first.id);
    return { ok: true, group };
  }
  function add(g, groupId, unitId) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    const u = g.units.find(v => v.id === unitId && v.hp > 0 && v.side === g.player);
    if (!u) return { ok: false, reason: 'Unit unavailable' };
    if (group.units.includes(unitId)) return { ok: false, reason: 'Already assigned' };
    if (group.units.length >= MAX_UNITS) return { ok: false, reason: 'Maximum 24 units per group' };
    const previous = groups(g).find(gr => gr.units.includes(unitId));
    if (previous) {
      previous.units = previous.units.filter(id => id !== unitId);
      clearMatchingOrder(g, u, previous.destination);
      clearPlanned(g, previous, u);
    }
    group.units.push(unitId);
    let routed = false;
    if (group.destination && group.stance !== 'hold' && group.stance !== 'assault') {
      if (u.c === group.destination.c && u.r === group.destination.r) {
        delete u.goto;
        routed = true;
      } else routed = E.setGoto(g, u.id, group.destination.c, group.destination.r).ok;
    }
    return { ok: true, routed };
  }
  function remove(g, groupId, unitId) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    if (!group.units.includes(unitId)) return { ok: false, reason: 'Unit not in this group' };
    group.units = group.units.filter(id => id !== unitId);
    clearMatchingOrder(g, g.units.find(u => u.id === unitId), group.destination);
    clearPlanned(g, group, g.units.find(u => u.id === unitId));
    return { ok: true };
  }
  function order(g, groupId, c, r) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    const p = E.tile(g, c, r);
    if (!p || E.TERRAIN[p.terrain]?.blocked) return { ok: false, reason: 'Choose a traversable hex' };
    const members = group.units.map(id => g.units.find(u => u.id === id && u.hp > 0 && u.side === g.player)).filter(Boolean);
    if (!members.length && E.isSea(p)) return { ok: false, reason: 'Choose a land destination for an empty group' };
    // First validate every route: a wholly impossible order leaves old destinations unchanged.
    const ready = [], rejected = [];
    for (const u of members) {
      const arrived = u.c === c && u.r === r;
      if (arrived || !E.gotoReason(g, u, p)) ready.push(u);
      else rejected.push(u.id);
    }
    if (members.length && !ready.length)
      return { ok: false, reason: 'No group unit has a route to that destination', failed: rejected.length };
    // A held group's objective is dormant; individual standing orders are untouched.
    if (group.stance !== 'hold' && group.stance !== 'assault') for (const u of ready) {
      if (u.c === c && u.r === r) delete u.goto;
      else E.setGoto(g, u.id, c, r);
    }
    if (group.autoConquer) { group.autoConquer = false; group.autoRouted = {}; group.targetStationId = null; }
    resetOperation(g, group);
    group.destination = { c: p.c, r: p.r };
    if (group.stance === 'assault') planGroupAssault(g, group);
    return { ok: true, assigned: ready.length, failed: rejected.length };
  }
  function cancel(g, groupId) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    if (!group.destination && !group.autoConquer && !group.operation) return { ok: false, reason: 'No objective set' };
    if (group.autoConquer) setConquest(g, groupId, false);
    for (const id of group.units) clearMatchingOrder(g, g.units.find(u => u.id === id), group.destination);
    resetOperation(g, group);
    group.destination = null;
    group.autoStatus = '';
    return { ok: true };
  }
  function disband(g, groupId) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    if (group.autoConquer) setConquest(g, groupId, false);
    if (group.destination) cancel(g, groupId);
    g.armyGroups = groups(g).filter(gr => gr !== group);
    return { ok: true };
  }
  const STANCES = Object.freeze({
    advance: 'Advance',
    hold: 'Hold Position',
    assault: 'Assault',
  });
  // Advance = movement alone. Hold Position = no group movement or fire.
  // Assault = movement followed by legal fire, retaining enemy objectives until captured.
  function setStance(g, groupId, stance) {
    const why = canEdit(g), group = find(g, groupId);
    if (why || !group) return { ok: false, reason: why || 'Army group not found' };
    if (!Object.hasOwn(STANCES, stance)) return { ok: false, reason: 'Unknown group stance' };
    if (stance === 'hold' && group.autoConquer) setConquest(g, groupId, false);
    if (stance === (group.stance || 'advance')) return { ok: true, unchanged: true };
    const prior = group.destination;
    if (group.stance === 'assault' || stance === 'hold') resetOperation(g, group);
    if (stance === 'hold' || stance === 'assault') {
      for (const id of group.units) clearMatchingOrder(g, g.units.find(u => u.id === id), prior);
    } else if (prior) {
      for (const id of group.units) {
        const u = g.units.find(v => v.id === id && v.hp > 0 && v.side === g.player);
        if (!u) continue;
        if (u.c === prior.c && u.r === prior.r) delete u.goto;
        else E.setGoto(g, u.id, prior.c, prior.r);
      }
    }
    group.stance = stance;
    if (stance === 'assault' && (prior || group.autoConquer)) planGroupAssault(g, group);
    return { ok: true, stance };
  }

  // Optional late-game conquest automation. This only assigns ordinary standing
  // destinations; all movement, capture legality and action budgets remain in E.runGotos.
  const matches = (u, p) => !!u?.goto && !!p && u.goto.c === p.c && u.goto.r === p.r;
  function setConquest(g, groupId, enabled) {
    const why = canEdit(g), gr = find(g, groupId);
    if (why || !gr) return { ok: false, reason: why || 'Army group not found' };
    if (!!gr.autoConquer === !!enabled) return { ok: true, unchanged: true };
    const old = gr.destination;
    for (const id of gr.units) {
      const u = g.units.find(v => v.id === id);
      if (matches(u, gr.autoRouted?.[id]) || (enabled && matches(u, old))) delete u.goto;
    }
    gr.autoConquer = !!enabled;
    gr.autoRouted = {};
    gr.manualOverrides = {};
    resetOperation(g, gr);
    gr.destination = null;
    gr.targetStationId = null;
    gr.autoStatus = enabled ? 'Choosing a city' : '';
    // Advance remains movement-only; Assault can coordinate automatic city conquest.
    return { ok: true };
  }
  function suspendConquestUnit(g, id, preserveGoto = false) {
    for (const gr of groups(g)) {
      if (!gr.units.includes(id)) continue;
      (gr.manualOverrides ||= {})[id] = g.turn;
      const u = g.units.find(v => v.id === id);
      if (!preserveGoto && matches(u, gr.autoRouted?.[id])) delete u.goto;
      if (gr.autoRouted) delete gr.autoRouted[id];
      clearPlanned(g, gr, u, preserveGoto);
      if (gr.operation) (gr.operation.manualOverrides ||= {})[id] = g.turn;
      return true;
    }
    return false;
  }
  function planConquests(g, side) {
    if ((g.mode !== 'conquest' && g.mode !== 'scenario') || g.over || g.phase !== side || side !== g.player) return;
    prune(g);
    const cities = g.stations.filter(s => foeSide(g, s.owner, side) &&
      E.tile(g, s.c, s.r) && !E.TERRAIN[E.tile(g, s.c, s.r).terrain]?.blocked);
    const reserved = new Set();
    const active = groups(g).filter(gr => gr.side === side && gr.autoConquer && gr.stance !== 'assault').sort((a, b) => a.id - b.id);
    for (const gr of active) {
      const members = gr.units.map(id => g.units.find(u => u.id === id && u.hp > 0 && u.side === side)).filter(Boolean),
        manual = gr.manualOverrides || {},
        prior = (gr.autoRouted ||= {}),
        available = members.filter(u => manual[u.id] !== g.turn && (!u.goto || matches(u, prior[u.id]))),
        capturers = available.filter(u => E.canCapture(u) && E.TYPES[u.type].naval !== 'ship');
      if (!capturers.length) {
        gr.autoStatus = 'Waiting for capturable units or manual orders';
        continue;
      }
      // Keep the previous objective while it remains hostile and unclaimed by
      // another group. Only perform costly route searches when selecting a new city.
      let city = cities.find(s => s.id === gr.targetStationId && !reserved.has(s.id));
      if (!city) {
        const choices = cities.map(s => ({
          s,
          score: Math.min(...capturers.map(u => E.distance(u, s, g))) +
            (reserved.has(s.id) ? 250 : 0),
        })).sort((a, b) => a.score - b.score || String(a.s.id).localeCompare(String(b.s.id)));
        // Usually the nearest feasible target wins; unreachable terrain does not
        // lead to futile repeated moves. The exact engine remains authoritative.
        for (const v of choices) {
          const p = E.tile(g, v.s.c, v.s.r);
          if (capturers.some(u => (u.c === p.c && u.r === p.r) || !E.gotoReason(g, u, p))) {
            city = v.s;
            break;
          }
        }
      }
      if (!city) {
        gr.autoStatus = cities.length ? 'Blocked: no reachable enemy city' : 'No remaining enemy cities';
        gr.targetStationId = null;
        gr.destination = null;
        continue;
      }
      reserved.add(city.id);
      const goal = { c: city.c, r: city.r };
      for (const u of available) {
        if (matches(u, goal)) { prior[u.id] = goal; continue; }
        if (u.goto && matches(u, prior[u.id])) delete u.goto;
        if (u.c === goal.c && u.r === goal.r) { delete prior[u.id]; continue; }
        // Non-capturing supporting units are moved too, where terrain allows.
        if (E.gotoReason(g, u, E.tile(g, goal.c, goal.r))) continue;
        if (E.setGoto(g, u.id, goal.c, goal.r).ok) prior[u.id] = goal;
      }
      gr.destination = goal;
      gr.targetStationId = city.id;
      const occupant = E.unitAt(g, goal);
      const defended = city.shield > 0 || !!occupant && E.foe(g, occupant.side, side);
      const near = capturers.some(u => E.distance(u, goal, g) <= 1);
      gr.autoStatus = defended && near ? 'Combat required (manual attacks)' :
        available.some(u => matches(u, goal) && !u.moved) ? 'Advancing' : 'Waiting or blocked';
    }
  }
  function foeSide(g, owner, side) {
    return owner != null && owner !== side && E.foe(g, owner, side);
  }


  // Coordination preferences only: no combat stats or action budgets are altered.
  const ASSAULT_TUNING = Object.freeze({
    readiness: .7, overwhelming: 1.5, assemblyGrace: 3, maxShotsPerUnit: 5,
    damage: 1, kill: 95, objective: 70, routeOpening: 105, counterRisk: 1.2,
  });
  const hkey = p => p.c + ',' + p.r;
  const sameHex = (a,b) => !!a && !!b && a.c === b.c && a.r === b.r;
  const unitRole = u => {
    const t = E.TYPES[u.type];
    return t.naval === 'ship' ? 'naval' : t.branch === 'Artillery' ? 'artillery' :
      /Heavy/.test(t.role || '') ? 'heavy' : /Raider|Scout/.test(t.role || '') ? 'raider' :
      t.role === 'Assault' ? 'assault' : 'mainline';
  };
  function clearPlanned(g, gr, u, preserveGoto = false) {
    if (!u || !gr?.operation) return;
    if (!preserveGoto && matches(u, gr.operation.autoRouted?.[u.id])) delete u.goto;
    delete gr.operation.autoRouted?.[u.id];
  }
  function resetOperation(g, gr) {
    if (!gr?.operation) return;
    for (const id of gr.units || []) clearPlanned(g,gr,g.units.find(u=>u.id===id));
    delete gr.operation;
  }
  const live = (g,gr) => (gr.units || []).map(id =>
    g.units.find(u => u.id === id && u.hp > 0 && u.side === gr.side)).filter(Boolean);
  function manual(g,gr,u) {
    return gr.manualOverrides?.[u.id] === g.turn ||
      gr.operation?.manualOverrides?.[u.id] === g.turn ||
      (!!u.goto && !matches(u, gr.operation?.autoRouted?.[u.id]));
  }
  function hostileCity(g,gr,units) {
    const hostile = s => s && s.owner != null && E.foe(g,s.owner,gr.side);
    const marked = g.stations.find(s => s.id === gr.operation?.targetCityId);
    if (marked && hostile(marked)) return marked;
    const ordered = g.stations.find(s => sameHex(s,gr.destination));
    if (ordered && hostile(ordered)) return ordered;
    if (!gr.autoConquer) return null;
    const capturers = units.filter(u => E.canCapture(u) && unitRole(u)!=='naval');
    const reserved = new Set(groups(g).filter(x => x !== gr && x.side === gr.side &&
      x.stance === 'assault').map(x => x.operation?.targetCityId).filter(x => x != null));
    const candidates = g.stations.filter(s=>hostile(s) && !reserved.has(s.id))
      .sort((a,b)=>Math.min(...capturers.map(u=>E.distance(u,a,g))) -
        Math.min(...capturers.map(u=>E.distance(u,b,g))) || String(a.id).localeCompare(String(b.id)));
    return candidates.find(s=>capturers.some(u=>sameHex(u,s) ||
      !E.gotoReason(g,u,E.tile(g,s.c,s.r)))) || null;
  }
  function routeMember(g,gr,u,p) {
    const op=gr.operation;
    if (!p || manual(g,gr,u)) return false;
    if (sameHex(u,p)) { clearPlanned(g,gr,u); return true; }
    if (matches(u,p)) { op.autoRouted[u.id]={c:p.c,r:p.r}; return true; }
    clearPlanned(g,gr,u);
    if (u.goto) return false;
    if (!E.setGoto(g,u.id,p.c,p.r).ok) return false;
    op.autoRouted[u.id]={c:p.c,r:p.r};
    return true;
  }
  // Reserve a different reachable hex per unit, using terrain and occupancy.
  // Artillery prefers its firing range behind the frontline; fast capturers prefer ring one.
  function stage(g,u,city,reserved) {
    const role=unitRole(u), t=E.TYPES[u.type];
    const preferred=role==='artillery'?Math.max(1,Math.min(3,t.max||1)):
      role==='naval'?2:role==='raider'||role==='heavy'?1:2;
    const radius=role==='artillery'?3:2;
    let best=null;
    for (const p of E.within(g,city,radius)) {
      if (sameHex(p,city) || reserved.has(hkey(p)) || E.TERRAIN[p.terrain]?.blocked) continue;
      const occupant=E.unitAt(g,p);
      if (occupant && occupant!==u) continue;
      if (!sameHex(p,u) && E.gotoReason(g,u,p)) continue;
      const ring=E.distance(p,city,g), trip=E.distance(p,u,g);
      const exposed=role==='artillery' && g.units.some(v=>v.hp>0 &&
        E.foe(g,v.side,u.side) && E.distance(v,p,g)<=1);
      const score=Math.abs(ring-preferred)*16+trip*2+(exposed?35:0)+
        (occupant===u?-12:0);
      if(!best || score<best.score || score===best.score && hkey(p)<hkey(best.p))
        best={p,score};
    }
    return best?.p || null;
  }
  function planGroupAssault(g,gr) {
    if (!gr || gr.stance!=='assault' || g.over || g.phase!==gr.side) return null;
    const units=live(g,gr);
    if(!units.length){gr.autoStatus='No active members';return null;}
    const old=gr.operation, oldCity=old && g.stations.find(s=>s.id===old.targetCityId);
    if(oldCity && !foeSide(g,oldCity.owner,gr.side)){
      if(old.phase!=='consolidating'){
        for(const u of units)clearPlanned(g,gr,u);
        old.phase='consolidating';
        gr.autoStatus='Consolidating at '+oldCity.name;
        if(!gr.autoConquer)gr.destination=null;
        return old;
      }
      if(g.turn<=old.lastPlanTurn)return old; // continue next turn, never immediately leapfrog
      resetOperation(g,gr);
    }
    const city=hostileCity(g,gr,units);
    if(!city){
      gr.autoStatus=gr.autoConquer?'No reachable hostile cities':'Select a hostile city';
      return null;
    }
    if(!gr.operation || gr.operation.targetCityId!==city.id){
      resetOperation(g,gr);
      gr.operation={targetCityId:city.id,phase:'planning',startedTurn:g.turn,
        rallyHex:{c:city.c,r:city.r},lastPlanTurn:0,manualOverrides:{},
        autoRouted:{},staging:{}};
    }
    const op=gr.operation;
    gr.destination={c:city.c,r:city.r};
    gr.targetStationId=city.id;
    const defenders=g.units.filter(u=>u.hp>0 && E.foe(g,u.side,gr.side) &&
      E.distance(u,city,g)<=2);
    const active=units.filter(u=>unitRole(u)!=='naval'||E.distance(u,city,g)<=3);
    const strength=active.reduce((sum,u)=>sum+u.hp,0);
    const near=active.filter(u=>E.distance(u,city,g)<=Math.max(2,Math.min(3,E.TYPES[u.type].max||1)));
    const close=near.reduce((sum,u)=>sum+u.hp,0);
    const resistance=defenders.reduce((sum,u)=>sum+u.hp,0)+Math.max(0,city.shield||0);
    const threatened=near.some(u=>defenders.some(e=>E.distance(e,u,g)<=1));
    const proceed=near.length && (close >= ASSAULT_TUNING.readiness*Math.max(1,strength) ||
      close >= ASSAULT_TUNING.overwhelming*Math.max(1,resistance) || threatened ||
      g.turn-op.startedTurn>=ASSAULT_TUNING.assemblyGrace);
    if(proceed)op.phase='assault';
    else if(op.phase!=='assault')op.phase='assembling';
    const cityOccupant=E.unitAt(g,city);
    const open=city.shield<=0 && !cityOccupant;
    const capturers=units.filter(u=>E.canCapture(u) && unitRole(u)!=='naval' && !manual(g,gr,u))
      .sort((a,b)=>(unitRole(a)==='raider'?-100:0)-(unitRole(b)==='raider'?-100:0) ||
        E.distance(a,city,g)-E.distance(b,city,g) || a.id-b.id);
    let capturing=null;
    if(open && capturers.length) {
      const u=capturers.find(u=>!u.moved && !u.lastTurnMoved && u.autoOrderTurn!==g.turn &&
        (sameHex(u,city)||!E.gotoReason(g,u,E.tile(g,city.c,city.r))));
      if(u && !sameHex(u,city) && routeMember(g,gr,u,city))capturing=u.id;
    }
    const priority={heavy:0,mainline:1,assault:2,raider:3,artillery:4,naval:5};
    const reserved=new Set();
    if(capturing!=null)reserved.add(hkey(city));
    for(const u of units.slice().sort((a,b)=>priority[unitRole(a)]-priority[unitRole(b)]||a.id-b.id)){
      if(u.id===capturing || manual(g,gr,u) || sameHex(u,city))continue;
      const p=stage(g,u,city,reserved);
      if(!p)continue;
      reserved.add(hkey(p));
      op.staging[u.id]={c:p.c,r:p.r};
      routeMember(g,gr,u,p);
    }
    op.lastPlanTurn=g.turn;
    gr.autoStatus=op.phase==='assembling'?'Assembling '+Math.round(close/Math.max(1,strength)*100)+'% strength':
      open?'City open for capture':'Coordinated assault';
    return op;
  }
  function planAssaults(g,side) {
    if(g.over||g.phase!==side||side!==g.player)return;
    prune(g);
    for(const gr of groups(g).filter(x=>x.side===side&&x.stance==='assault'))planGroupAssault(g,gr);
  }
  function attackScore(g,gr,u,p,pr) {
    const t=E.TYPES[u.type], role=unitRole(u), v=E.unitAt(g,p),
      s=E.stationAt(g,p), city=g.stations.find(x=>x.id===gr.operation?.targetCityId);
    const kill=v && pr.unit>=v.hp?ASSAULT_TUNING.kill:0;
    const objective=city && sameHex(city,p)?ASSAULT_TUNING.objective:
      city && E.distance(city,p,g)<=2?25:0;
    const opens=city && sameHex(city,p) &&
      (v && pr.unit>=v.hp || s?.shield>0 && pr.shield>=s.shield) ?
      ASSAULT_TUNING.routeOpening:0;
    const roleBonus=role==='artillery'&&s?.shield>0?50:
      (role==='heavy'||role==='assault')&&v&&E.TYPES[v.type].branch==='Armor'?25:
      role==='mainline'&&v&&v.hp<E.maxHP(v)/2?20:0;
    const exposure=pr.counter*ASSAULT_TUNING.counterRisk*
      (role==='artillery'||u.hp<E.maxHP(u)*.4?1.5:1);
    return ASSAULT_TUNING.damage*(pr.unit+pr.shield)+kill+objective+opens+roleBonus-exposure;
  }
  function runFire(g,side) {
    const report={fired:[],failed:[]},counts=new Map();
    if(g.over||g.phase!==side)return report;
    const limit=groups(g).filter(gr=>gr.side===side&&gr.stance==='assault')
      .reduce((n,gr)=>n+gr.units.length,0)*ASSAULT_TUNING.maxShotsPerUnit;
    for(let i=0;i<limit&&!g.over;i++){
      let best=null;
      for(const gr of groups(g)){
        if(gr.side!==side||gr.stance!=='assault'||gr.operation?.phase!=='assault')continue;
        for(const u of live(g,gr)){
          if(manual(g,gr,u)||u.attacked||u.morale<=-3||
            (counts.get(u.id)||0)>=ASSAULT_TUNING.maxShotsPerUnit)continue;
          for(const p of E.targets(g,u)){
            const pr=E.preview(g,u.id,p.c,p.r);
            if(!pr)continue;
            const score=attackScore(g,gr,u,p,pr);
            if(!best||score>best.score||score===best.score&&u.id<best.u.id)
              best={gr,u,p,score};
          }
        }
      }
      if(!best)break;
      const {gr,u,p}=best,result=E.attack(g,u.id,p.c,p.r);
      counts.set(u.id,(counts.get(u.id)||0)+1);
      if(result.ok){
        u.autoFireTurn=g.turn;
        report.fired.push({id:u.id,...result});
        // Legal targets are recomputed after every single attack.
        planGroupAssault(g,gr);
      }else report.failed.push(u.id);
    }
    return report;
  }
  E.suspendArmyGroupConquestUnit = suspendConquestUnit;
  E.setArmyGroupConquest = setConquest;
  E.planArmyGroupConquest = planConquests;
  E.ARMY_GROUP_STANCES = STANCES;
  E.setArmyGroupStance = setStance;
  E.runArmyGroupFire = runFire;
  E.planArmyGroupAssault = planAssaults;
  E.planGroupAssault = planGroupAssault;
  E.ARMY_GROUP_ASSAULT_TUNING = ASSAULT_TUNING;
  E.armyGroups = groups;
  E.armyGroup = find;
  E.armyGroupPrune = prune;
  E.createArmyGroup = create;
  E.addArmyGroupUnit = add;
  E.removeArmyGroupUnit = remove;
  E.orderArmyGroup = order;
  E.cancelArmyGroup = cancel;
  E.disbandArmyGroup = disband;
})(Knightmare);

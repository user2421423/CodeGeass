  // The 29 reworked signatures are player-only active actions. Their passive
  // rules still affect every faction through the normal engine combat pipeline.
  const playerOnlyReworkedActions = new Set([
    'marrybell','kate','gaohai','chengzhong','huangqian','sugiyama','kirihara','indira','olivia','diethard','sayoko','margaret'
  ]);
  function coastTile(g, p) {
    return !isSea(p) && adjacent(g, p).some(isSea);
  }
  // Scenario and Conquest resolve attacks in tactical order: batteries suppress shields,
  // armor and assault units defeat defenders, then fast troops capture opened cities.
  // Command and withdrawal leaders act last so their actions can coordinate allies.
  // In Conquest, formations responding to an immediate defensive emergency act first.
  function aiOrderPriority(g, u) {
    const commander = ['command', 'withdraw', 'farneseWithdrawal'].includes(COMMANDERS[u.cmd]?.action?.kind);
    if (g.mode !== 'scenario' && g.mode !== 'conquest') return commander ? 9 : 1;
    const type = TYPES[u.type];
    const tactical = commander ? 9
      : type.branch === 'Artillery' ? 0
      : type.branch === 'Armor' || type.cls === 'assault' ? 2
      : canCapture(u) && (type.move >= 4 || type.cls === 'raider') ? 4
      : 3;
    if (g.mode === 'scenario') {
      const memo=aiPlan(g,u.side);
      const assigned=memo.byId?.[memo.assign?.[u.id]];
      return tactical-(assigned?.dynamicDefense?10:0)-trafficBoost(g,u,memo);
    }
    const memo = aiPlan(g, u.side),
      assignedFront = memo.byId?.[memo.assign?.[u.id]],
      emergency = memo.guards?.[u.id]?.emergency ||
        (assignedFront?.type === 'defensive' && assignedFront.emergency);
    return emergency ? tactical - 10 : tactical - trafficBoost(g, u, memo);
  }
  // Rolo freezes real threats rather than firing at the first weak target.
  // The AI avoids lethal activation; a human player may still choose it.
  function aiRoloFreeze(g, u, events) {
    if (u.cmd !== 'rolo' || feintReason(g, u)) return false;
    const victims = actionTargets(g, u).filter(v => !v.expRoloFrozen);
    if (!victims.length) return false;
    const cost = Math.max(1, Math.round(maxHP(u) * 0.10));
    if (u.hp <= cost) return false;
    const priority = victims.some(v => !!v.cmd || !!v.elite ||
      TYPES[v.type].attack * (v.stack || 1) >= TYPES[u.type].attack * (u.stack || 1) * 1.6);
    if (victims.length < 2 && !priority) return false;
    const activated = feint(g, u.id);
    if (!activated?.ok) return false;
    events.push({ kind: 'feint', id: u.id, affected: activated.affected });
    return true;
  }
  // Charles uses Memory Rewrite against valuable, vulnerable formations.
  function aiCharlesMemoryRewrite(g, u, events) {
    if (u.cmd !== 'charles' || feintReason(g, u)) return false;
    const choices = actionTargets(g, u).sort((a, b) =>
      Number(!!b.cmd) - Number(!!a.cmd) ||
      TYPES[b.type].attack * (b.stack || 1) - TYPES[a.type].attack * (a.stack || 1) ||
      a.id - b.id);
    if (!choices.length) return false;
    const used = feint(g, u.id, choices[0].id);
    if (!used?.ok) return false;
    events.push({ kind: 'feint', id: u.id, target: used.target, affected: 1 });
    return true;
  }
  // Ohgi heals a genuinely wounded comrade only when he can survive the cost.
  // Give wounded commanders a slight priority without wasting the sacrifice
  // on nearly full-health formations.
  function aiOhgiHeal(g, u, events) {
    if (u.cmd !== 'ohgi' || feintReason(g, u)) return false;
    const options = actionTargets(g, u)
      .filter(v => maxHP(v) - v.hp >= maxHP(v) * 0.20)
      .sort((a, b) =>
        (Math.min(maxHP(b) * 0.30, maxHP(b) - b.hp) / maxHP(b) + (b.cmd ? 0.05 : 0)) -
        (Math.min(maxHP(a) * 0.30, maxHP(a) - a.hp) / maxHP(a) + (a.cmd ? 0.05 : 0)) ||
        a.id - b.id);
    if (!options.length) return false;
    const r = feint(g, u.id, options[0].id);
    if (!r?.ok) return false;
    events.push({ kind: 'feint', id: u.id, target: r.target, healed: r.healed, cost: r.cost });
    return true;
  }
  // Smilas expends a comrade's next volley for extra damage. Prefer an
  // already-fired, combat-ready formation; avoid charging helpless reserves.
  function aiSmilasVanguard(g, u, events) {
    if (u.cmd !== 'smilas' || feintReason(g,u)) return false;
    const candidates=actionTargets(g,u).filter(v =>
      v.hp > maxHP(v)*0.20 || v.attacked);
    if (!candidates.length) return false;
    const enemyNear=v=>g.units.some(w => w.hp>0 && foe(g,w.side,v.side) &&
      !atSea(g,w) && dist(g,v,w) <= Math.max(3,rangeOf(g,v).max+1));
    const priority=candidates.filter(enemyNear).sort((a,b) =>
      Number(!!b.attacked)-Number(!!a.attacked) ||
      TYPES[b.type].attack*(b.stack||1)-TYPES[a.type].attack*(a.stack||1) ||
      b.hp-a.hp || a.id-b.id);
    if (!priority.length) return false;
    const r=feint(g,u.id,priority[0].id);
    if (!r?.ok) return false;
    events.push({kind:'feint',id:u.id,target:r.target,affected:1});
    return true;
  }
  // Chinese patrol fleets contest invasions near the Philippine islands,
  // but never sail to capture Britannia's remote Palau and Yap bases.
  // Ground defense and the global amphibious doctrine remain unchanged.
  function philippinesNavalInterception(g, u, events) {
    if (u.moved) return true;
    const base=u.philippinesPatrol||{c:u.c,r:u.r};
    const islandPorts=g.stations.filter(s=>philippinesHome(g,s)&&s.portAt);
    const coastalDistance=p=>Math.min(Infinity,
      ...islandPorts.map(s=>dist(g,s,p)));
    const intruders=g.units.filter(v=>v.hp>0&&foe(g,v.side,u.side)&&
      (isShip(v)||isSea(tile(g,v.c,v.r)))&&
      dist(g,base,v)<=18&&coastalDistance(v)<=9)
      .sort((a,b)=>coastalDistance(a)-coastalDistance(b)||
        dist(g,u,a)-dist(g,u,b)||
        (b.cargo?.length||0)-(a.cargo?.length||0));
    const target=intruders[0];
    if(!target||dist(g,u,target)<=rangeOf(g,u).max)return true;
    const options=[...reachable(g,u).keys()].map(k=>{
      const [c,r]=k.split(',').map(Number);return tile(g,c,r);
    }).filter(p=>p&&navigable(p)&&!unitAt(g,p)&&
      dist(g,base,p)<=18&&coastalDistance(p)<=11)
      .sort((a,b)=>dist(g,a,target)-dist(g,b,target)||
        coastalDistance(a)-coastalDistance(b));
    const next=options[0];
    if(next&&dist(g,next,target)<dist(g,u,target)){
      const moved=move(g,u.id,next.c,next.r);
      if(moved.ok)events.push({kind:'move',...moved,id:u.id});
    }
    return true;
  }
  function aiOrder(g, id) {
    const u = g.units.find(u => u.id === id);
    if (!u || !isReady(g, u)) return [];
    const events = [],
      memo = aiPlan(g, u.side),
      guard = memo.guards?.[u.id],
      front = frontOf(g, memo, u),
      // Units already ahead of an assembling front's rally city hold their ground rather than walk back.
      forward = front?.state === 'assembling' && aheadOfRally(g, front, u),
      home = { c: u.c, r: u.r },
      fieldAt = forward ? p => dist(g, p, home) : fieldFor(g, memo, u);
    // Julius selects strategically valuable enemy cities, favoring front-line
    // offensives, high shield strength, and concentrations of enemy troops.
    if(u.cmd==='julius'&&!feintReason(g,u)){
      const targets=actionTargets(g,u);
      const score=s=>{
        const enemy=g.units.filter(v=>v.hp>0&&foe(g,v.side,u.side)&&dist(g,v,s)<=3);
        const friendly=g.units.filter(v=>v.hp>0&&v.side===u.side&&dist(g,v,s)<=5);
        return (s.capitalOf===s.owner?18:0)+(s.tier||1)*4+
          (s.maxShield?12*s.shield/Math.max(1,s.maxShield):0)+
          enemy.length*5+friendly.length*3+
          (s.expArkFleet? -35:0)-
          Math.min(20,dist(g,u,s));
      };
      targets.sort((a,b)=>score(b)-score(a)||String(a.id).localeCompare(String(b.id)));
      const chosen=targets[0];
      if(chosen){const r=feint(g,id,chosen.id);if(r.ok)events.push({kind:'feint',id,target:chosen.id,airship:r.airship});}
    }
    // On Normal Story escape missions, the required named commander must
    // actually walk to the exit instead of chasing incidental enemies.
    // Uses reachable() and move() like a human player, and does not give
    // free movement, teleportation, or immunity to counterfire.
    const extraction = g.mode === 'campaign' && g.difficulty === 'normal' &&
      u.side === g.player && g.campaign?.aiObjective?.type === 'reach' &&
      ['bk_saitama', 'bk_tohdoh'].includes(g.campaign.id)
      ? g.campaign.aiObjective : null;
    const evacuation = extraction && u.cmd && extraction.by === u.cmd ? extraction : null;
    // A different ally can stand on a friendly exit before the required
    // commander gets there. Vacate that tile legally and keep it clear.
    if (extraction && !evacuation && !u.moved &&
        u.c === extraction.c && u.r === extraction.r) {
      const candidates = [...reachable(g, u).keys()].map(k => {
        const [c,r] = k.split(',').map(Number);
        return tile(g,c,r);
      }).filter(p => p && !unitAt(g,p) &&
        !(p.c === extraction.c && p.r === extraction.r) &&
        !isSea(p)).sort((a,b) =>
        dist(g,a,extraction)-dist(g,b,extraction));
      for (const p of candidates) {
        const moved = move(g,id,p.c,p.r);
        if (moved.ok) {
          events.push({ kind:'move', ...moved, id });
          return events;
        }
      }
    }
    if (evacuation && !u.moved) {
      if (u.c === evacuation.c && u.r === evacuation.r) return events;
      const target = tile(g, evacuation.c, evacuation.r);
      const field = goalField(g, u.side, [[target, 0]], null, u);
      const current = field[u.r * g.cols + u.c];
      const options = [...reachable(g, u).keys()].map(k => {
        const [c, r] = k.split(',').map(Number);
        return tile(g, c, r);
      }).filter(p => p && !unitAt(g, p) &&
        Number.isFinite(field[p.r * g.cols + p.c]) &&
        field[p.r * g.cols + p.c] < current)
        .sort((a,b) => field[a.r*g.cols+a.c]-field[b.r*g.cols+b.c] ||
          dist(g,a,evacuation)-dist(g,b,evacuation));
      for (const p of options.slice(0, 5)) {
        const moved = move(g, id, p.c, p.r);
        if (moved.ok) {
          events.push({ kind: 'move', ...moved, id });
          return events;
        }
      }
    }
    // Every formation weighs the fire it can take next turn: the share of its
    // health nearby enemies could strip, after terrain cover, which is worth
    // most where shots can land. Wounded units weigh exposure most; healthy
    // ones still advance along the goal field.
    const exposure = p => {
      // Garrisons and held positions keep their duty whatever the danger.
      if (isSea(p) || guard || u.hold) return 0;
      const cover = TERRAIN[p.terrain]?.cover || 0,
        exposed = Math.min(2, localThreat(g, u, p) / Math.max(1, u.hp));
      return exposed * (1 - cover) * 50 * Math.max(0, 1.1 - u.hp / maxHP(u)) - Math.min(1, exposed) * cover * 60;
    };
    const islandDefender = philippinesDefense(g, u.side);
    const defenseStep = p => !islandDefender ||
      (!isShip(u) && !isSea(p) &&
        philippinesHome(g, g.stations[p.provinceCity]) &&
        (atSea(g, u) ? dist(g, u, p) === 1 : massOf(g, p) === massOf(g, u)));
    // Use sacrifices or medical support before moving out of range.
    aiSmilasVanguard(g, u, events);
    aiOhgiHeal(g, u, events);
    // Use targeted memory rewriting before recovery moves Charles away.
    aiCharlesMemoryRewrite(g, u, events);
    // Freeze valuable clusters before recovery moves Rolo away.
    aiRoloFreeze(g, u, events);
    if (u.hp <= 0 || g.over) return events;
    const recovery = memo.recoveries?.get(u.id);
    if (recovery) {
      if (u.moved || u.attacked) return events;
      if (recovery.tactical) {
        const p = tile(g, recovery.tactical.c, recovery.tactical.r);
        if (p && !unitAt(g, p) && reachable(g, u).has(key(p))) {
          const m = move(g, id, p.c, p.r);
          if (m.ok) events.push({ kind: 'move', ...m, id });
        }
        return events;
      }
      // Scores are cached per hex: the board does not change while the candidates are ranked.
      const field = recovery.field, scored = new Map(),
        value = p => scored.get(p) ?? scored.set(p, field[p.r * g.cols + p.c] + g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && !atSea(g, v) && dist(g, v, p) <= rangeOf(g, v).max).length * 8
          - (p.c === recovery.city.c && p.r === recovery.city.r ? 2 : 0)).get(p),
        picks = [...reachable(g, u).keys()].map(k => { const [c, r] = k.split(',').map(Number); return tile(g, c, r); })
          .filter(p => !isSea(p) && !unitAt(g, p) && Number.isFinite(field[p.r * g.cols + p.c]))
          .sort((a, b) => value(a) - value(b));
      if (picks[0] && value(picks[0]) < value(u)) {
        const m = move(g, id, picks[0].c, picks[0].r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
      return events;
    }
    // Trigger available newcomer abilities for AI-led armies, rather than leaving them player-only.
    if(COMMANDERS[u.cmd]?.action?.kind==='checkmate'&&!feintReason(g,u)) {
      const targets=actionTargets(g,u).sort((a,b)=>
        Number(!!b.cmd)-Number(!!a.cmd) || b.hp-a.hp || a.id-b.id);
      const used=feint(g,id,targets[0]?.id);
      if(used?.ok)events.push({kind:'feint',id,affected:used.affected});
    }
    if(COMMANDERS[u.cmd]?.action?.kind==='special'&&!playerOnlyReworkedActions.has(u.cmd)&&!feintReason(g,u)) {
      const targets=actionTargets(g,u);
      // Place Darlton's summoned knights near the front, avoiding enemy contact
      // when a safer supporting hex is available.
      if(u.cmd==='darlton'){
        const enemies=g.units.filter(v=>v.hp>0&&foe(g,v.side,u.side));
        const score=p=>{
          const nearest=enemies.length?Math.min(...enemies.map(v=>dist(g,v,p))):3;
          return Math.abs(nearest-2)*2+(nearest<=1?10:0)+(p.owner!==u.side?1:0);
        };
        targets.sort((a,b)=>score(a)-score(b)||a.id.localeCompare(b.id));
      }
      const used=feint(g,id,targets[0]?.id);
      if(used?.ok)events.push({kind:'feint',id,affected:used.affected});
    }
    // Protect endangered allies before the AI moves Andrea outside their radius.
    if (u.cmd === 'farnese' && !feintReason(g,u)) {
      const r = feint(g,u.id);
      if (r.ok) events.push({kind:'feint',id:u.id,affected:r.affected});
    }
    // Withdraw already-fired allies before Leila's own movement can take her out of range.
    if (COMMANDERS[u.cmd]?.action?.kind === 'withdraw' && !feintReason(g, u)) {
      const friends = actionTargets(g, u).map(v => v.id), r = feint(g, id);
      if (r.ok) {
        events.push({ kind: 'feint', id, affected: r.affected });
        for (const friend of friends) events.push(...aiOrder(g, friend));
      }
    }
    // Airships run their own orders (strike, lift and drop, retreat to repair); nothing else moves them.
    if (isAir(u)) {
      aiAirship(g, u, memo, events);
      return events;
    }
    // Navies: a carrier runs its own operation; idle troops board a carrier waiting within reach.
    const steered = islandDefender && isShip(u)
      ? philippinesNavalInterception(g, u, events)
      : isShip(u) && !u.moved && aiCarrier(g, u, memo, events, fieldAt);
    if (!u.moved && !guard && u.deployedTurn !== g.turn && wantsLift(g, u, memo)) {
      const berth = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .find(p => {
          const v = unitAt(g, p);
          return v && v !== u && v.side === u.side && canBoard(g, v) && (!v.cargo?.length || sameLift(frontOf(g, memo, v.cargo[0]), front));
        });
      const m = berth && move(g, id, berth.c, berth.r);
      if (m?.ok) return [...events, { kind: 'move', ...m, id }];
    }
    // Troops far from their front board an airship in reach that serves it; aiAirship flies them forward.
    const airship = !guard && u.deployedTurn !== g.turn && airBerth(g, u, memo, front),
      ride = airship && move(g, id, airship.c, airship.r);
    if (ride?.ok) return [...events, { kind: 'move', ...ride, id }];
    const action = COMMANDERS[u.cmd]?.action;
    if (action && !playerOnlyReworkedActions.has(u.cmd) && !['command', 'withdraw', 'freeze', 'memoryRewrite', 'ohgiHeal', 'expendableVanguard'].includes(action.kind) && !feintReason(g, u)) {
      const r = feint(g, id);
      if (r.ok) events.push({ kind: 'feint', id, affected: r.affected });
    }
    // targets() from a hypothetical hex scans that hex's whole range disc, and most reachable hexes have nothing in it.
    // Hostile hexes (units, cities) near anywhere `u` can reach are listed once, so each candidate hex only tests those.
    const hostilePool = spots => {
      if (g.wrap) return null;
      const reach = Math.max(0, ...spots.map(p => dist(g, u, p))),
        radius = reach + rangeOf(g, u).max + 3; // fire control, spotting and relay add at most 3 at another hex
      const seen = new Set(), pool = [];
      const add = p => { if (!seen.has(p) && dist(g, u, p) <= radius) { seen.add(p); pool.push(p); } };
      for (const v of g.units) if (v.hp > 0 && foe(g, v.side, u.side)) add(tile(g, v.c, v.r));
      for (const s of g.stations) if (foe(g, s.owner, u.side)) add(tile(g, s.c, s.r));
      return pool;
    };
    const choose = pool =>
      (pool ? targetsAmong(g, u, pool) : targets(g, u))
        .map(p => {
          const d = unitAt(g, p),
            s = stationAt(g, p),
            pr = preview(g, id, p.c, p.r);
          // Transport and chained orders can invalidate an enumerated target.
          // Score only candidates the combat engine can still preview.
          if (!pr) return null;
          const score =
            pr.unit +
            pr.shield * 0.7 +
            (d && pr.unit >= d.hp ? 130 : 0) +
            (s ? (g.mode === 'scenario'
              ? 170 + (front?.anchor.id === s.id ? 80 : 0) +
                (s.shield > 0 && TYPES[u.type].branch === 'Artillery'
                  ? Math.min(100, pr.shield * 1.8) : 0) +
                (s.shield <= 0 && canCapture(u) ? 150 : 0)
              : 35) : 0) +
            (s?.capitalOf ? 60 : 0) +
            (s?.project ? 120 : 0) +
            (d ? commanderValue(g, d) + focusValue(g, u, d, pr, memo) + threatRemoved(g, d, pr.unit) : 0) -
            pr.counter * 0.5;
          // Conquest/Scenario: a legal attack on a hostile human unit or city scores higher (Campaign bonus is 0).
          const humanTarget = playerPriorityTarget(g, u.side, d?.side) || playerPriorityTarget(g, u.side, s?.owner);
          return { p, score: humanTarget ? score * (1 + playerPriorityBonus(g, u.side)) : score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)[0];
    const maneuver = () => {
      if (u.moved || u.attacked || steered) return;
      // Boarding is decided above (idle troops and waiting carriers), so occupied hexes are not destinations here.
      const spots = [...reachable(g, u).keys()]
        .map(k => {
          const [c, r] = k.split(',').map(Number);
          return tile(g, c, r);
        })
        .filter(p => !unitAt(g, p) && defenseStep(p) &&
          !(extraction && !evacuation &&
            p.c === extraction.c && p.r === extraction.r));
      const enemies = g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, u) <= aiRange(g).enemyScan);
      const old = { c: u.c, r: u.r };
      // Overseas invasions assemble before embarking. Nearby land formations stage on the coast; units already at sea
      // count as an escort so follow-on waves do not get stranded waiting for a fresh three-unit convoy.
      const naval = !!TYPES[u.type].naval,
        fromLand = !naval && !atSea(g, u),
        freeAllies = g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && !memo.guards?.[v.id]),
        landGroup = freeAllies.filter(v => !atSea(g, v) && dist(g, v, u) <= aiRange(g).convoyLand).length,
        seaEscort = freeAllies.filter(v => atSea(g, v) && dist(g, v, u) <= aiRange(g).convoySea).length,
        // A front still gathering (or holding) on this landmass keeps its troops ashore; one bound overseas lets a lone
        // formation cross where no enemy is near.
        ashore = front && front.state !== 'attacking' && front.masses?.has(massOf(g, u)),
        safe = front && !enemies.some(v => dist(g, v, u) <= aiRange(g).enemyScan / 2),
        convoy = fromLand && !guard && !ashore &&
          (g.mode === 'scenario' || landGroup >= 2 || (landGroup >= 1 && seaEscort >= 1) || safe ||
            (g.mode === 'campaign' && g.campaign?.aiObjective?.side === u.side &&
              ['bk_yokosuka2','br_yokosuka2'].includes(g.campaign.id))),
        currentField = fieldAt(old),
        mates = g.mode === 'scenario' && front ? (memo.columns?.[front.id] || [])
          .filter(id => id !== u.id).map(id => g.units.find(v => v.id === id))
          .filter(v => v && v.hp > 0) : [],
        skill = COMMANDERS[u.cmd]?.fx || {},
        needsNearbyAllies = skill.loneRaider || skill.engineeringPen || skill.reassure ||
          skill.repairSupply || skill.bodyguard || skill.defensiveDoctrine || skill.orderCommander;
      const placeScore = p => {
        const station = stationAt(g, p);
        const storyObjective = g.mode === 'campaign' && u.side === g.player &&
          g.campaign?.aiObjective?.side === u.side ? g.campaign.aiObjective : null;
        let sc = station && foe(g, station.owner, u.side) && !isShip(u) &&
          station.shield <= 0 && canCapture(u)
          ? 400 + (station.capitalOf ? 600 : 0) : 0;
        if (storyObjective && p.c === storyObjective.c && p.r === storyObjective.r &&
            canCapture(u) && !isShip(u)) sc += 260;
        if (storyObjective && ['bk_yokosuka2','br_yokosuka2'].includes(g.campaign.id) &&
            canCapture(u) && !isShip(u))
          sc += (dist(g, old, storyObjective) - dist(g, p, storyObjective)) * 55;
        if (COMMANDERS[u.cmd]?.fx.treasury && station?.owner === u.side) sc += 250 + station.income * 4;
        const mine = siteAt(g, p);
        if (mine && foe(g, mine.owner, u.side) && canCapture(u)) sc += mine.base >= 30 ? 550 : 250;
        // A city guard stands beside its city while no enemy is within 2 hexes of it, leaving the factory free (a
        // unit on the city hex blocks production); when one comes close it steps onto the city.
        const onGuard = guard && p.c === guard.c && p.r === guard.r,
          guardBonus = !onGuard ? 0 : guard.id != null && !enemies.some(v => dist(g, v, guard) <= 2) ? -40 : 25;
        sc -= guard ? dist(g, p, guard) * 30 - guardBonus : u.hold ? 0 : fieldAt(p) * 8;
        if (u.hold) sc -= Math.max(0, dist(g, p, u.hold) - (u.hold.radius ?? 2)) * 40;
        if (g.mode === 'scenario' && front?.dynamicDefense) {
          const distance=dist(g,p,front.anchor);
          sc-=Math.max(0,distance-3)*42;
          if (distance>=1 && distance<=3)
            sc+=(TERRAIN[p.terrain]?.cover||0)*10;
          if (station?.id===front.anchor.id &&
              !enemies.some(v=>dist(g,v,front.anchor)<=5)) sc-=25;
        }
        if (g.mode === 'scenario' && front) {
          // Columns converge without waiting or retreating: a modest cohesion
          // bonus cannot outweigh movement toward the enemy objective.
          if (mates.length && fieldAt(p) > 1) {
            const nearest = Math.min(...mates.map(v => dist(g, p, v)));
            sc += Math.min(2, mates.filter(v => dist(g, p, v) <= 3).length) * 8;
            sc -= Math.min(18, Math.max(0, nearest - 6) * 3);
          }
          const fast = canCapture(u) && (TYPES[u.type].move >= 4 ||
            TYPES[u.type].cls === 'raider');
          if (fast && station && foe(g, station.owner, u.side) &&
            !unitAt(g, station) && station.shield <= Math.max(120, station.maxShield * 0.55) &&
            (g.ai?.[u.side]?.recentCaptures || []).some(q => g.turn - q.turn <= 2 &&
              dist(g, q, station) <= 9)) sc += 130;
        }
        let nearestEnemy = 15,
          danger = 0;
        for (const v of enemies) {
          const d = dist(g, v, p);
          nearestEnemy = Math.min(nearestEnemy, d);
          if (d <= 1) danger++;
        }
        if (isSea(p) && naval) {
          sc -= danger * 20;
        } else if (isSea(p)) {
          sc -= 14 + danger * 40 + (nearestEnemy <= 2 ? 30 : 0) + (fromLand && (!convoy || guard) ? 1000 : 0);
          if (fromLand && convoy && fieldAt(p) < currentField) sc += 75;
        } else if (!fromLand) {
          sc += naval ? 30 : 90;
        } else if (!guard && !convoy && coastTile(g, p) && fieldAt(p) <= currentField) {
          const assembling = freeAllies.filter(v => !atSea(g, v) && dist(g, v, p) <= aiRange(g).convoyLand).length;
          sc += 28 + Math.min(3, assembling) * 12;
        }
        if (TYPES[u.type].branch === 'Artillery') {
          sc -= danger * 28;
          sc -= Math.abs(nearestEnemy - TYPES[u.type].max) * 6;
        } else sc -= nearestEnemy * 2;
        sc -= exposure(p);
        const allies = needsNearbyAllies ? freeAllies.filter(v => dist(g, v, p) <= 2) : [];
        if (skill.loneRaider) sc -= allies.filter(v => dist(g, v, p) === 1).length * 18;
        if (skill.engineeringPen || skill.reassure || skill.repairSupply || skill.bodyguard || skill.defensiveDoctrine || skill.orderCommander)
          sc += Math.min(4, allies.length) * 12;
        if (station?.owner === u.side && u.hp / maxHP(u) < 0.5) sc += 20;
        if (naval && u.hp / maxHP(u) < 0.5 && portAtHex(g, p)?.portOwner === u.side) sc += 150;
        if (u.cmd && !u.attacked)
          sc -= Math.min(95, localThreat(g, u, p) * 0.36);
        if (TYPES[u.type].branch === 'Artillery' && !guard && !u.hold && !station && !isSea(p) &&
            adjacent(g, p).filter(q => !isSea(q) && !TERRAIN[q.terrain]?.blocked).length <= 2 &&
            freeAllies.filter(v => !v.moved && dist(g, v, p) <= 2).length >= 2)
          sc -= 24; // avoid parking in the only route through a narrow pass
        return sc;
      };
      const pool = hostilePool(spots);
      let best = null,
        bestScore = -Infinity;
      memo.helperShots = new Map();
      try {
        for (const p of spots) {
          let sc = placeScore(p);
          u.c = p.c;
          u.r = p.r;
          const oldDistance = u.movedDistance, oldMoved = u.moved;
          u.movedDistance = (oldDistance || 0) + dist(g, old, p);
          u.moved = true;
          reindex(g, u, old);
          let shot;
          try { shot = choose(pool); }
          finally {
            u.c = old.c;
            u.r = old.r;
            u.movedDistance = oldDistance;
            u.moved = oldMoved;
            reindex(g, u, p);
          }
          if (shot) sc += shot.score * 0.6;
          if (sc > bestScore) {
            bestScore = sc;
            best = p;
          }
        }
      } finally { memo.helperShots = null; }
      const current = choose(),
        stay = placeScore(tile(g, u.c, u.r)) + (current ? current.score * 0.6 : 0);
      if (best && bestScore > stay + 4) {
        const m = move(g, id, best.c, best.r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    };
    // Reevaluate positioning after each kill that restores movement/refire, within a bounded action budget.
    for (let chain = 0; chain < 8 && !u.attacked && !g.over && u.hp > 0; chain++) {
      maneuver();
      // Reevaluate commander tactics after maneuvering, before firing.
      aiSmilasVanguard(g, u, events);
      aiOhgiHeal(g, u, events);
      aiCharlesMemoryRewrite(g, u, events);
      aiRoloFreeze(g, u, events);
      // A designation may only now be in range.
      if (action && !playerOnlyReworkedActions.has(u.cmd) && !['command', 'withdraw', 'freeze', 'memoryRewrite', 'ohgiHeal', 'expendableVanguard'].includes(action.kind) && !feintReason(g, u)) {
        const r = feint(g, id);
        if (r.ok) events.push({ kind: 'feint', id, affected: r.affected });
      }
      const shot = choose();
      if (!shot) break;
      const target = unitAt(g, shot.p);
      const a = attack(g, id, shot.p.c, shot.p.r);
      if (a.ok) {
        events.push({ kind: 'attack', ...a, id });
        if (target) {
          memo.focusTargets ||= new Map();
          memo.focusTargets.delete(target.id);
          if (target.hp > 0) memo.focusTargets.set(target.id, { turn: g.turn });
        }
        memo.focusCache?.clear();
      }
      else break;
    }
    // Spend restored movement on a safe hex, including withdrawal moves after firing.
    if (!u.moved && (u.attacked || u.skillReposition || u.withdrawMove) && !g.over && u.hp > 0) {
      // Scores are cached per hex: the board does not change while the candidates are ranked.
      const scored = new Map(),
        score = p => scored.get(p) ?? scored.set(p, -fieldAt(p) * 8 - exposure(p) - g.units.filter(v => v.hp > 0 && foe(g, v.side, u.side) && dist(g, v, p) <= rangeOf(g, v).max).length * 30).get(p);
      const picks = [...reachable(g, u).keys()].map(k => { const [c, r] = k.split(',').map(Number); return tile(g, c, r); })
        .filter(p => !unitAt(g, p) && defenseStep(p)).sort((a, b) => score(b) - score(a));
      if (picks[0] && score(picks[0]) > score(tile(g, u.c, u.r))) {
        const m = move(g, id, picks[0].c, picks[0].r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    }
    // Zero chooses between restoring a useful allied activation and suppressing
  // an enemy threat. The same legal-target list powers the player picker.
  // Never recursively issue allied orders to an enemy selected for Geass.
  function zeroCommandTarget(g, u) {
    const options = actionTargets(g, u);
    if (!options.length) return null;
    const allies = options.filter(v => v.side === u.side);
    const enemies = options.filter(v => foe(g, v.side, u.side));
    const strength = v => TYPES[v.type].attack * (v.stack || 1) * Math.max(.25, v.hp / Math.max(1, maxHP(v)));
    const nearbyEnemy = v => g.units.some(e => e.hp > 0 && foe(g, e.side, v.side) &&
      !atSea(g, e) && dist(g, v, e) <= rangeOf(g, v).max);
    const bestAlly = allies.map(v => ({
      unit: v,
      score: strength(v) * (v.attacked ? 1.15 : .65) *
        (nearbyEnemy(v) ? 1.45 : 0.65),
    })).sort((a, b) => b.score - a.score || a.unit.id - b.unit.id)[0];
    const bestEnemy = enemies.map(v => ({
      unit: v,
      score: strength(v) * (v.morale > -2 ? .45 : .15) *
        (g.units.some(a => a.hp > 0 && a.side === u.side &&
          dist(g, a, v) <= rangeOf(g, a).max) ? 1.5 : 0.65),
    })).sort((a, b) => b.score - a.score || a.unit.id - b.unit.id)[0];
    return (!bestEnemy || (bestAlly && bestAlly.score >= bestEnemy.score))
      ? bestAlly?.unit : bestEnemy.unit;
  }
  // Zero and Leila use their actions after allied orders. UI ordering puts them last.
    if (action?.kind === 'command' && !g.over && u.hp > 0 && !feintReason(g, u)) {
      const chosen = u.cmd === 'zero' ? zeroCommandTarget(g, u) : null;
      const r = feint(g, id, chosen?.id);
      if (r.ok) {
        events.push({ kind: 'feint', id, affected: r.affected, combat: r.combat });
        const refreshed = g.units.find(v => v.id === r.target);
        if (refreshed && refreshed.side === u.side && refreshed.id !== u.id)
          events.push(...aiOrder(g, refreshed.id));
      }
    }
    if (action?.kind === 'withdraw' && !g.over && u.hp > 0 && !feintReason(g, u)) {
      const friends = actionTargets(g, u).map(v => v.id), r = feint(g, id);
      if (r.ok) {
        events.push({ kind: 'feint', id, affected: r.affected });
        for (const friend of friends) events.push(...aiOrder(g, friend));
      }
    }
    memo.focusCache?.clear();
    memo.trafficCache?.clear();
    return events;
  }
  Object.assign(E, { aiProduction, aiAssignEliminators, aiOrder, aiOrderPriority, aiNextActor, aiPlan, unitStrength, FRONT, playerPriorityBonus, playerPrioritySeeds });
})(typeof window !== 'undefined' ? window : globalThis);

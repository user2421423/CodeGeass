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
      // Ports supply shipyards, not passive naval healing. Ships must use an explicit
      // repair action (or a separate earned ability) to recover HP.
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
  // Per-scenario rule switches the scenario module declares on itself (no fallback to Japan).
  function scenarioMeta(g) {
    return (g?.mode === 'scenario' && root.Knightmare.scenarios?.byId?.[g.scenario?.id]?.meta) || {};
  }
  // World conquest: every rival surrenders (a power surrenders when it holds no city), or hold the most cities at the
  // armistice.
  function decideVictory(g) {
    if (g.mode === 'campaign') return hooks.decide?.(g);
    if (g.mode === 'scenario') {
      const conquest = scenarioOf(g)?.winner(g),
        contenders = g.order.filter(s => g.stations.some(c => c.owner === s));
      // Amphibious regional invasions may start with no cities; surviving expeditions remain in play.
      if (scenarioMeta(g).expeditionSide) {
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
              ? 'Your last stronghold in this theatre has fallen. The surviving power has not yet conquered every city in this theatre.'
              : 'Your last stronghold in this theatre has fallen. ' +
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
      return scenarioOf(g)?.objective(g) || 'Conquer every enemy city';
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

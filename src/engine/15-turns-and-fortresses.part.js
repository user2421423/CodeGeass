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
    const tier1Phase = (g.fleijaSuccessfulCityHits?.[side] || 0) >= 5;
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
        if (v && rival(v.side)) {
          score +=
            price(v.type, v.stack, g, v.side).credits * (v.hp / maxHP(v)) * (outer ? 0.35 : ring ? 0.75 : 1) + (v.cmd ? 200 : 0);
          if (tier1Phase && COMMANDERS[v.cmd]?.storyTier === 1)
            score += !ring ? 4500 : outer ? 300 : 1100;
        }
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
    if(outgoing){for(const v of g.units)if(v.side===outgoing){
        if(v.expInformationWarfare)delete v.expInformationWarfare;
        if(v.expMargaretRedeploy){v.moved=!!v.expMargaretRedeploy.wasMoved;v.skillReposition=0;delete v.expMargaretRedeploy;}
        if(v.expShadowMove){v.moved=true;v.skillReposition=0;delete v.expShadowMove;}
        delete v.expMargaretBonusTurn;delete v.expShadowAttackTurn;delete v.expPrecisionTarget;
        delete v.expSilenced;
        // Sword Breaker persists throughout the affected side's next turn.
        delete v.expAyanoSwordBreak;
        // Expire Rolo's freeze only AFTER this faction has lost its entire
        // next turn, never at the start of its disabled activation.
        delete v.expRoloFrozen;
        // Charles's rewrite persists through the target's next full turn.
        // Restore morale only as that faction's action phase finishes.
        if (v.expCharlesMemoryRewrite) {
          v.morale = v.expCharlesMemoryRewrite.previousMorale;
          delete v.expCharlesMemoryRewrite;
        }
        // Slow lasts through the target faction's next action phase.
        delete v.expKallenSlowActive;
        if(v.expChengWeaken?.turns>0&&!--v.expChengWeaken.turns)delete v.expChengWeaken;
        if(v.expPuristCounter&&v.expPuristCounter.startTurn<g.turn)delete v.expPuristCounter;
        if(v.expSmilasSuppression&&v.expSmilasSuppressionTurn<g.turn)delete v.expSmilasSuppression;
        if(v.despairWeakened?.source==='zi')delete v.despairWeakened;
      }
      for(const station of g.stations)if(station.expSupplyBlocked?.owner===outgoing){station.expSupplyBlocked.turns=(station.expSupplyBlocked.turns||1)-1;if(station.expSupplyBlocked.turns<=0)delete station.expSupplyBlocked;}}
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
      if(v.expJoeDiagnosis?.until<g.turn)delete v.expJoeDiagnosis;
      v.skillMarks = (v.skillMarks || []).filter(m => m.side !== side);
      if (v.expCheckmate?.side === side) delete v.expCheckmate;
      for (const field of ['auraDisrupted', 'moraleWard', 'assaultInspired', 'despairWeakened']) if (v[field]?.side === side) delete v[field];
    }
    for (const city of g.stations){if(city.bombardMark?.side===side)delete city.bombardMark;if(city.expYoshidaBreak?.turn<g.turn)delete city.expYoshidaBreak;}
    // Off-map passengers have no terrain, morale or healing effects, but their
    // commander action cooldown advances on their faction's turn.
    for (const ship of g.units) if (ship.side === side)
      for (const passenger of ship.cargo || []) if (passenger.hp > 0 && passenger.side === side)
        passenger.feintCD = Math.max(0, (passenger.feintCD || 0) - 1);
    const mine = g.units.filter(u => u.hp > 0 && u.side === side);
    // Existing negative morale is brought up to Steady immediately while
    // protected; this never promotes a unit from Steady to High.
    applyLeilaMoraleFloor(g);
    for (const u of mine) {
      // Geass Absolute Command's enemy-mode effects expire at the START
      // of the affected faction's next turn, before ordinary morale recovery.
      if (u.expZeroGeass) {
        u.morale = Math.min(1, u.morale + (u.expZeroGeass.moraleLost || 0));
        delete u.expZeroGeass;
      }
      // Lasts through opponents' turns; expires on this formation's next turn.
      delete u.expImperialCommand;
      delete u.expGeassCancelled;
      u.expKallenSlowActive = !!u.expKallenSlowNext;
      delete u.expKallenSlowNext;
      if (u.cmd === 'kallen') u.expKallenFirstTargets = [];
      delete u.expKallenReposition;
      // Do not clear expKallenMoveBank: unspent movement carries forward.
      u.entrenched = false;
      u.lastTurnMoved = false;
      u.guardReady = !!u.held;
      u.movedDistance = 0;
      u.skillReposition = 0;
      u.withdrawMove = false;
      delete u.expAkitoMoveReady;
      u.moved = false;
      u.attacked = false;
      u.expDisabledActive=!!u.expDisabledNext;delete u.expDisabledNext;
      u.expPinnedActive=!!u.expPinnedNext;delete u.expPinnedNext;
      u.expPinnedWeakenActive=u.expPinnedWeakenNext||0;delete u.expPinnedWeakenNext;
      u.expJammedActive=!!u.expJammedNext;delete u.expJammedNext;
      if(u.expZiWeakenNext){u.despairWeakened={side:u.side,source:'zi',value:u.expZiWeakenNext};delete u.expZiWeakenNext;}
      if(u.expDisabledActive || u.expRoloFrozen){u.moved=true;u.attacked=true;}else if(u.expPinnedActive)u.moved=true;
      delete u.expOverwatch;delete u.expLink;
      u.chain = 0;
      u.eliteMoveAfterKill = false;
      u.held = true; // cleared by move(): Senba's guard needs a turn without moving
      u.feintCD = Math.max(0, (u.feintCD || 0) - 1);
      u.expSalvageIndustry=0;u.expSalvageCount=0;
      // A forced-offensive attack stays charged until used; its vulnerability ends on the recipient's next turn.
      delete u.expForcedVulnerable;
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
      // Leila's new Steady floor must not inherit the generic commander
      // morale-increase aura (which would incorrectly raise 0 to High).
      const auras = mine.filter(v => v.hp > 0 && v.cmd && !['leila', 'zero', 'lelouch', 'schneizel'].includes(v.cmd) && v.id !== u.id && dist(g, u, v) <= auraRange(v)),
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
      }
      // City occupancy no longer heals frames by itself. Inoue's separate
      // Resistance Logistics bonus still applies to friendly city garrisons.
      const s = stationAt(g, u);
      if (s?.owner === side && logisticsNear(g, u))
        u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.05));
      // Ports supply shipyards, not passive naval healing. Ships must use an explicit
      // repair action (or a separate earned ability) to recover HP.
      // End-of-turn-start morale recovery and allied rally effects cannot
      // break the one-turn Geass confusion.
      if (u.expCharlesMemoryRewrite) {
        u.morale = -3;
        u.moved = true;
        u.attacked = true;
      }
    }
    // Captured port control persists after the occupying ship sails away.
    g.strikes = [];
    // Shield recovery follows the city's engineering upgrades and Huang Qian's nearby administration aura.
    for (const s of g.stations) {
      if (s.owner !== side) continue;
      const baseRate = .12+techValue(g,side,'cities.engineering');
      const administrationBonus=mine.some(m=>fx(m).adminCity&&dist(g,m,s)<=3) ? .15 : 0;
      // Incoming fire halves ordinary repair, but Huang Qian still restores
      // the full additional 15% maximum shields every friendly turn.
      const recovery=s.expSupplyBlocked?.owner===side||s.expShieldRegenBlocked?.owner===side
        ? 0 : (s.attackedSinceRegen?baseRate*.5:baseRate)+administrationBonus;
      if(s.expShieldRegenBlocked?.owner===side){s.expShieldRegenBlocked.turns--;if(s.expShieldRegenBlocked.turns<=0)delete s.expShieldRegenBlocked;}
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
          (!TYPES[foe.type].naval && TYPES[foe.type].branch === 'Armor' ? 1 - techValue(g, foe.side, 'armor.bulkheads') : 1),
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
    const check = validateAction(g, { kind: 'fortress', id, c, r });
    if (!check.ok) return check;
    const s = check.station, foe = check.defender;
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
  function checkVictory(g) {
    if (g.over) { finalizeHonors(g); return g.over; }
    decideVictory(g);
    if (g.over) finalizeHonors(g);
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
  // World conquest ends only when a faction or coalition eliminates every rival power.
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
      if (!ufn || !britannian) {
        const winningTeam = !ufn ? 'britannian' : 'ufn';
        g.over = {
          winner: winningTeam === 'ufn' ? 'cf' : coalitionWinner,
          team: winningTeam,
          reason: !ufn ? 'The U.F.N. has surrendered. The Britannian alliance is victorious.'
            : 'Both Britannian powers have surrendered. The U.F.N. is victorious.',
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

  // City development is separate from the factory production tier.
  function cityTierOf(s) {
    // Older/custom regional factories may already have been raised without
    // recording cityTier. Their authored base HP identifies the city level;
    // the factory level must not silently become a city upgrade on load.
    const baseHP = (s?.maxShield || 0) - (s?.fortBonus || 0),
      inferred = s?.fort ? 4 : ({200:1,250:2,300:3,400:4}[baseHP] ?? s?.tier);
    return Math.max(1, Math.min(4, Math.trunc(Number(s?.cityTier ?? inferred) || 1)));
  }
  function cityTierCost(s) {
    return [{ credits: 200, industry: 50 }, { credits: 300, industry: 75 },
      { credits: 500, industry: 125 }][cityTierOf(s) - 1] || null;
  }
  // Shared defenses: factory and research-lab levels do not affect base HP.
  function cityDefenseHP(tier, fort = false, capital = false) {
    if (capital) return 600;
    if (fort || tier >= 4) return 400;
    return [0, 200, 250, 300][Math.max(1, Math.min(3, Math.trunc(Number(tier)) || 1))];
  }
  // Only canonical faction capitals get the 600-HP tier in regional scenarios.
  // Regional command centers (e.g. Sydney, Ottawa, Mexico City) are not empire capitals.
  function scenarioCityDefenseHP(tier, fort, name) {
    const trueCapital = CITY_DATA.some(row => row[0] === name && row[5] === true);
    return cityDefenseHP(tier, fort, trueCapital);
  }
  // Regional HQ flags also drive economy/objectives and must not confer the
  // true-capital HP tier during loading or subsequent building upgrades.
  function cityDefenseFor(g, s) {
    const tier = cityTierOf(s);
    return g.mode === 'scenario'
      ? scenarioCityDefenseHP(tier, !!s.fort, s.name)
      : cityDefenseHP(tier, !!s.fort, !!s.capital);
  }
  // A city's starting output and defenses by tier, with its CITY_TWEAKS balance overrides.
  function cityBase([name, , , , tier, capital = false, fort = false]) {
    return {
      maxShield: cityDefenseHP(tier, fort, capital),
      // Capitals: 50 plus the 15 their old refinery exported (refineries now need a Sakuradite deposit).
      income: capital ? 65 : tier === 3 ? 30 : tier === 2 ? 20 : 12,
      industry: capital ? 30 : 6 * tier,
      science: capital ? 10 : 1 + tier,
      ...CITY_TWEAKS[name],
    };
  }

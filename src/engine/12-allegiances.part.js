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
    // Euro Britannia's Story campaign uses the shared imperial HQ pool.
    // Britannia continues to use these officers as before.
    if (side === 'eb' && ['julius', 'shin', 'ashley', 'manfredi', 'farnese', 'augustus', 'kewell', 'norland'].includes(k))
      return true;
    return !!a && (a.side === side || !!ALLIES[side]?.includes(a.side));
  }
  // Geass Absolute Command: a fresh activation for ONE acted ally (never
  // Zero himself), or disruption of ONE enemy. Both share the same use stamp.
  function commandTargets(g, u) {
    return g.units.filter(
      v => v.hp > 0 && v.side === u.side && v.id !== u.id &&
        (v.moved || v.attacked || v.chain > 0) && !atSea(g, v) &&
        v.morale > -3 && dist(g, u, v) <= 2,
    );
  }
  const skillNear = (g, u, flag, range, self = true) =>
    g.units.some(
      v => v.hp > 0 && !atSea(g, v) && v.side === u.side && (self || v.id !== u.id) && (!u.expInformationWarfare || v.id===u.id) && fx(v)[flag] &&
        (!v.auraDisrupted || !['orderCommander', 'screenedFire'].includes(flag)) && dist(g, v, u) <= range,
    );
  // Akito's Brain Raid requires complete separation from friendly AND
  // campaign-team allied formations, counting ships and the full two-hex ring.
  function akitoIsolated(g, u) {
    return !g.units.some(v => v.hp > 0 && v.id !== u.id &&
      !foe(g, v.side, u.side) && dist(g, u, v) <= 2);
  }
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
  // Exploit Weakness: at least two surviving, deployed friendly formations
  // must be adjacent to this specific enemy. The initiating attacker must be
  // Xianglin herself or a friendly formation within 2 hexes of a living
  // Xianglin. This is one non-stacking positional bonus, never a status mark.
  function xianglinExploitWeakness(g, attacker, target) {
    if (!attacker || !target || attacker.hp <= 0 || target.hp <= 0 ||
        !foe(g, attacker.side, target.side) || atSea(g, attacker)) return false;
    const nearby = g.units.filter(v =>
      v.hp > 0 && v.side === attacker.side && !atSea(g, v) &&
      dist(g, v, target) === 1);
    if (nearby.length < 2) return false;
    return g.units.some(v =>
      v.hp > 0 && v.side === attacker.side && v.cmd === 'xianglin' &&
      !atSea(g, v) && !v.auraDisrupted && fx(v).exploitWeakness &&
      dist(g, v, attacker) <= 2 &&
      (!attacker.expInformationWarfare || v.id === attacker.id));
  }
  // Selfless Leadership is active only while Ohgi is alive and STRICTLY
  // below half HP. Every qualifying ally, including Ohgi, receives one
  // non-stacking offensive/defensive bonus while within two hexes.
  function ohgiSelflessLeadership(g, recipient) {
    if (!recipient || recipient.hp <= 0) return false;
    return g.units.some(v => v.hp > 0 && v.side === recipient.side &&
      v.cmd === 'ohgi' && !atSea(g, v) && !v.auraDisrupted &&
      fx(v).selflessLeadership && v.hp < maxHP(v) * 0.5 &&
      dist(g, v, recipient) <= 2 &&
      (!recipient.expInformationWarfare || v.id === recipient.id));
  }
  function commanderAttack(g, u, target, counter) {
    const f = fx(u), friends = friendlyNeighbors(g, u);
    let mult = 1;
    // Brain Raid strengthens both direct attacks and counter-fire.
    if (f.loneRaider && akitoIsolated(g, u)) mult *= 1 + f.loneRaider;
    // Divine Tiger targets commander-led formations in both attacks and retaliation.
    if (f.duelist && target?.cmd) mult *= 1 + f.duelist;
    if (counter) {
      if (u.guardReady && u.held && skillNear(g, u, 'defensiveDoctrine', 2)) mult *= 1.25;
      return mult;
    }
    if (u.assaultInspired) mult *= 1 + u.assaultInspired.value;
    if (!u.cmd && skillNear(g, u, 'commanderlessAttack', 2, false)) mult *= 1.15;
    if (TYPES[u.type].branch === 'Infantry' && skillNear(g, u, 'infantryCommand', 1, false)) mult *= 1.15;
    if (TYPES[u.type].branch === 'Armor' && skillNear(g, u, 'armorLeader', 2, false)) mult *= 1.1;
    if (f.runCharge && u.movedDistance >= 2) mult *= 1 + f.runCharge;
    if (f.combinedArms && friends.some(v => TYPES[v.type].branch !== TYPES[u.type].branch)) mult *= 1 + f.combinedArms;
    if (TYPES[u.type].branch === 'Armor' && friends.some(v => TYPES[v.type].branch === 'Armor') && skillNear(g, u, 'orderCommander', 1)) mult *= 1.15;
    if (!target) return mult;
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
    if (f.loneTaken && akitoIsolated(g, target)) mult *= f.loneTaken;
    if (f.duelistTaken && attacker?.cmd) mult *= f.duelistTaken;
    if(target.guardReady&&target.held&&skillNear(g,target,'defensiveDoctrine',2))mult*=.85;
    if (counter && f.swordplay && dist(g, attacker, target) === 1) mult *= f.swordplay;
    if (!counter && direct) {
      if (f.foresight && target.foresightTurn !== g.turn) mult *= f.foresight;
      if (guarded && target.bodyguardTurn !== g.turn) mult *= 0.8;
    }
    return mult;
  }
  function consumeDefensiveSkills(g, target, attacker) {
    const f = fx(target);
    if (f.guard && target.guardReady && target.held) target.guardStamp = guardStamp(g);
    if (f.foresight) target.foresightTurn = g.turn;
    if (bodyguarded(g, target)) target.bodyguardTurn = g.turn;
  }
  function grantReposition(u, range) {
    // Preserve a frame's unrestricted restored movement; a skill only fills a missing movement action.
    if (u.moved) { u.moved = false; u.skillReposition = range; }
  }
  function afterCommanderAttack(g, a, d, city, destroyed, defensesDestroyed = false) {
    const f = fx(a);
    if (d?.hp > 0) {
      if (f.targetMark) addTargetMark(d, { side: a.side, source: a.id, damage: f.targetMark });
      if (f.intrigue && d.cmd) d.auraDisrupted = { side: a.side };
    }
    if (city && foe(g, city.owner, a.side)) {
      if (f.focusBombard) {
        const old = a.focusCity;
        const count = old?.city === city.id && old.lastTurn >= g.turn - 1 ? Math.min(3, old.count + 1) : 0;
        a.focusCity = { city: city.id, count, lastTurn: g.turn };
      }
      if (f.siegeMark && a.siegeMarkTurn !== g.turn) {
        city.bombardMark = { side: a.side, value: f.siegeMark };
        a.siegeMarkTurn = g.turn;
      }
    } else if (f.focusBombard) delete a.focusCity;
    if (a.hp <= 0) return;
    // Cornelia's recovery rewards either a frame kill or a fresh city-defense
    // break. A single volley that achieves both only heals once.
    if (f.destroyHeal && (destroyed || defensesDestroyed))
      a.hp = Math.min(maxHP(a), a.hp + Math.round(maxHP(a) * f.destroyHeal));
    if ((f.adaptiveBreakthrough&&a.movedDistance>=3||f.highland&&tile(g,a.c,a.r)?.terrain==='mountain'||f.blackSeaFox&&tile(g,a.c,a.r)?.terrain==='mountain'||f.swordplay&&d&&dist(g,a,d)===1)&&a.repositionTurn!==g.turn){a.repositionTurn=g.turn;grantReposition(a,2);}
    if (f.reposition && a.repositionTurn !== g.turn) { a.repositionTurn = g.turn; grantReposition(a, f.reposition); }
    // City defense breakthroughs share the kill-based movement reward, but
    // do not trigger unrelated kill-only healing or inspiration effects.
    if (destroyed || defensesDestroyed) {
      if (f.killReposition && a.killRepositionTurn !== g.turn) {
        a.killRepositionTurn = g.turn;
        grantReposition(a, f.killReposition);
      }
    }
    if (!destroyed) return;
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
    const raiko=TYPES[u.type].branch==='Artillery'&&skillNear(g,u,'raikoCity',2)?1.25:1;
    let mult = city.bombardMark?.side === u.side ? 1 + city.bombardMark.value : 1;
    const old = u.focusCity;
    // Focused Bombardment is applied in power(), not a second time here.
    return mult*raiko;
  }
  function treasuryBonus(g, city) {
    const holder = g.units.find(u => u.hp > 0 && u.side === city.owner && u.c === city.c && u.r === city.r && fx(u).treasury);
    return 1 + (holder ? fx(holder).treasury : 0);
  }
  function commanderStatusText(g, u) {
    const out = [];
    if (u.skillMarks?.length) out.push('Designated target');
    if(u.expChengWeaken?.turns>0)out.push('Supply disruption: attack −15%');
    if(u.expZeroGeass)out.push('Geass Absolute Command: counterattacks suppressed');

    if(u.expInformationWarfare)out.push('Information warfare: attack −20%, cover −25%, support suppressed');
    if(u.expPrecisionTarget?.turn===g.turn)out.push('Precision target: +25 penetration points, cover bypass 40%');
    if(u.expShadowMove)out.push('Shadow infiltration: legal 3-point move');
    if(u.expShadowAttackTurn===g.turn)out.push('Shadow strike: next attack +30%, no commander counter');
    if(u.expMargaretRedeploy)out.push('Strategic redeployment: free 3-point move');
    if(u.expMargaretBonusTurn===g.turn)out.push('Strategic redeployment: next attack +15%');
    if(u.expRoloFrozen)out.push('Absolute Suspension: frozen until the end of next turn; no moves, attacks, commands or counterattacks');
    if(u.expPinnedActive)out.push('Pinned: movement disabled');
    if(u.expPinnedWeakenActive)out.push('Pinned: attack −25%');
    if(u.forcedOffensive||u.expForcedVulnerable)out.push(`Forced Offensive: ${u.forcedOffensive?'next attack +35%; ':''}${u.expForcedVulnerable?'incoming damage +15%':''}`);
    if(u.feintUsedTurn===g.turn&&COMMANDERS[u.cmd]?.action)out.push('Signature action used this turn');
    else if(COMMANDERS[u.cmd]?.action&&((COMMANDERS[u.cmd].action.cooldown ?? 3) === 0 || !(u.feintCD>0)))out.push('Signature action ready');
    if(u.expSalvageIndustry>0)out.push(`Salvage: +${u.expSalvageIndustry}/60 industry`);
    if(u.expSmilasSuppression)out.push('Suppressed: next attack −20%');
    if(u.expPuristCounter)out.push('Purist discipline: counterattack +20%');
    if(u.expZiWeakenNext||u.despairWeakened?.source==='zi')out.push('Shadow ambush: next turn attack −20%');
    if(u.expBeachheadStart!=null&&g.turn<=u.expBeachheadUntil)out.push(`Beachhead: ${u.expBeachheadUntil-g.turn+1} turns remain`);
    if(u.expJoeDiagnosis?.until>=g.turn)out.push('Armor diagnosed: allied penetration +15 points');
    if (u.auraDisrupted) out.push('Command damage aura suppressed');
    if (u.moraleWard) out.push('Protected against morale disruption');
    if (u.assaultInspired) out.push(`Inspired: attack damage +${Math.round(u.assaultInspired.value * 100)}%`);
    if (u.despairWeakened) out.push(`Despair: damage dealt −${Math.round(u.despairWeakened.value * 100)}%`);
    if (!u.moved && u.skillReposition) out.push(`Reposition: up to ${u.skillReposition} hexes`);
    if (!u.moved && u.withdrawMove) out.push('Withdrawal movement ready');
    return out.join(' · ');
  }
  const guardStamp = g => g.turn;
  // Counterattack-only last stand: Tohdoh becomes dangerous after dropping
  // strictly below 50% HP. Ordinary initiating attacks remain unchanged.
  function skillAttack(g, u, counter) {
    const f = fx(u);
    let m = 1;
    if (counter && f.lastStandCounter && u.hp / maxHP(u) < 0.5) m *= 1 + f.lastStandCounter;
    if (f.lastStand && u.hp / maxHP(u) < 0.5) m *= 1 + f.lastStand;
    if (f.charge && !counter && u.movedDistance>=2 && u.expTamakiUsedTurn!==g.turn) m *= 1 + f.charge;
    return m;
  }
  // Damage-taken multiplier: Senba's Veteran's Guard and other independent effects.
  // Tohdoh's permanent 50% damage reduction is applied once through fx(taken).
  function skillDefense(g, target, counter, direct = true) {
    const tf = fx(target);
    let m = 1;
    if (tf.guard && target.held && target.guardReady) m *= tf.guard;
    return m;
  }
  // Inoue's Resistance Logistics (repair and reinforce discount, extra city repair) and Minami's spotting reach.
  const logisticsNear = (g, u) =>
    g.units.some(v => v.cmd && v.hp > 0 && v.side === u.side && fx(v).logistics && dist(g, v, u) <= fx(v).logistics);
  const spotted = (g, u) =>
    g.units.some(v => v.cmd && v.hp > 0 && v.side === u.side && fx(v).spotter && dist(g, v, u) <= fx(v).spotter);


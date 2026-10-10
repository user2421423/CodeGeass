  // ======== Black Knights and JLF commanders: allegiance and signature skills ========
  // In Conquest the Chinese Federation commands the Black Knights and the JLF: recruit them in HQ, assign them to
  // Federation units. Skill numbers are first-pass balance guesses.
  const ALLIES = { cf: ['bk', 'jlf'] };
  function serves(k, side) {
    const a = COMMANDERS[k];
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
    if (f.loneRaider && !friends.length) mult *= 1 + f.loneRaider;
    if (f.runCharge && u.movedDistance >= 2) mult *= 1 + f.runCharge;
    if (f.combinedArms && friends.some(v => TYPES[v.type].branch !== TYPES[u.type].branch)) mult *= 1 + f.combinedArms;
    if (TYPES[u.type].branch === 'Armor' && friends.some(v => TYPES[v.type].branch === 'Armor') && skillNear(g, u, 'orderCommander', 1)) mult *= 1.15;
    if (!target) return mult;
    if (f.duelist && target.cmd) mult *= 1 + f.duelist;
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
    const f = fx(target), friends = friendlyNeighbors(g, target);
    let mult = 1;
    if (f.loneRisk && !friends.length) mult *= f.loneRisk;
    if (f.steadyRanks && friends.length >= 2) mult *= f.steadyRanks;
    if (counter && f.swordplay && dist(g, attacker, target) === 1) mult *= f.swordplay;
    if (!counter && direct) {
      if (f.foresight && target.foresightTurn !== g.turn) mult *= f.foresight;
      if (f.liveOn && target.hp / maxHP(target) < 0.4 && target.liveOnTurn !== g.turn) mult *= f.liveOn;
      if (bodyguarded(g, target) && target.bodyguardTurn !== g.turn) mult *= 0.8;
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
      for (const v of friendlyNeighbors(g, a)) v.assaultInspired = { side: a.side, value: f.assaultLeader };
    }
  }
  function bombardBonus(g, u, city) {
    if (!city) return 1;
    let mult = city.bombardMark?.side === u.side ? 1 + city.bombardMark.value : 1;
    const old = u.focusCity;
    if (fx(u).focusBombard && old?.city === city.id && old.lastTurn >= g.turn - 1)
      mult *= 1 + Math.min(3, old.count + (old.lastTurn < g.turn ? 1 : 0)) * fx(u).focusBombard;
    return mult;
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
    if (u.assaultInspired) out.push('Inspired: attack damage +15%');
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


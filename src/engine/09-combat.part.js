  function auraBonus(g, u) {
    let bonus = 0;
    for (const a of g.units) {
      if (a.hp <= 0 || a.side !== u.side || a.id === u.id) continue;
      if (a.cmd && !a.auraDisrupted && dist(g, a, u) <= auraRange(a)) bonus = Math.max(bonus, fx(a).aura?.value || 0.08);
      const ea = eliteFx(a).aura;
      if (ea && dist(g, a, u) <= ea.range && (!ea.branches || ea.branches.includes(TYPES[u.type].branch)))
        bonus = Math.max(bonus, ea.value);
    }
    return bonus;
  }
  // Permanent frame/commander strength shared by the dock and combat. Situational
  // modifiers (morale, health, terrain, targets and auras) remain in power().
  function intrinsicAttack(g, u, counter = false) {
    const t = TYPES[u.type], f = fx(u), strike = !counter || !f.attackOnly,
      attackGeneric = { Infantry: 'raider', Armor: 'armored_assault', Artillery: 'accuracy' }[t.branch];
    let attack = t.attack * eliteScale(u).attack * (1 + 0.45 * (u.stack - 1));
    if (f.dmg && strike) attack *= 1 + f.dmg;
    if (f.dmgBranch?.[t.branch] && strike) attack *= 1 + f.dmgBranch[t.branch];
    return attack * officerAttack(g, u) * (1 + 0.06 * genericLevel(g, u, attackGeneric));
  }
  function power(g, u, target, st, counter = false, direct = true) {
    const t = TYPES[u.type],
      victim = target ? TYPES[target.type] : null,
      f = fx(u),
      ef = eliteFx(u),
      strike = !counter || !f.attackOnly;
    let attack = intrinsicAttack(g, u, counter) * (1 + 0.07 * Math.min(5, u.xp));
    attack *= u.morale >= 1 ? 1.25 : u.morale === -1 ? 0.75 : u.morale === -2 ? 0.5 : u.morale <= -3 ? 0 : 1;
    const gritSkill = { Infantry: 'bayonet_charge', Armor: 'tide_of_iron', Artillery: 'artillery_barrage' }[t.branch];
    const missingHpPenalty = 0.6 * (1 - clamp(u.hp / maxHP(u), 0, 1));
    attack *= 1 - missingHpPenalty * (1 - 0.2 * genericLevel(g, u, gritSkill));
    attack *= 1 + auraBonus(g, u);
    // Faction doctrines.
    if (u.side === 'britannia' && t.branch === 'Armor') attack *= 1.08;
    if (u.side === 'eu' && t.branch === 'Artillery') attack *= 1.1;
    if (u.side === 'bk' && ['forest', 'mountain', 'urban'].includes(tile(g, u.c, u.r)?.terrain)) attack *= 1.1;
    if (u.side === 'eb' && u.cmd) attack *= 1.1;
    // Portmans hunt transports and warships; the Portman II also fights harder in the water (Aquatic Combat).
    if (t.naval === 'amphibious' && target && (atSea(g, target) || isShip(target))) attack *= 1.25;
    if (t.naval === 'amphibious' && target && isShip(target)) attack *= 1 + techValue(g, u.side, 'naval.torpedoes');
    if (t.aquatic && isSea(tile(g, u.c, u.r))) attack *= 1 + t.aquatic;
    if (t.naval === 'ship') {
      attack *= 1 + techValue(g, u.side, 'naval.gunnery');
      if (counter) attack *= 1 + techValue(g, u.side, 'naval.firecontrol');
    }
    // Rapid Launch Systems: the first attack on the turn a Knightmare launched from a carrier (needs a level-3 port).
    if (!counter && u.launched === g.turn && hasPort3(g, u.side)) attack *= 1 + techValue(g, u.side, 'naval.launch');
    // Commander signature abilities (attacker side).
    if (f.opening && !counter && !u.moved) attack *= 1 + f.opening;
    if (counter && f.counter) attack *= 1 + f.counter;
    if (counter) attack *= 1 + 0.05 * genericLevel(g, u, 'crossfire');
    attack *= skillAttack(g, u, counter) * commanderAttack(g, u, target, counter);
    if (ef.dmg && strike) attack *= 1 + ef.dmg;
    if (counter && ef.counter) attack *= 1 + ef.counter;
    if (ef.vsArmor && victim?.branch === 'Armor' && strike) attack *= 1 + ef.vsArmor;
    if (ef.cityAttack && g.stations.some(s => s.owner === u.side && dist(g, s, u) <= 1) && strike)
      attack *= 1 + ef.cityAttack;
    if (f.artist && target)
      attack *=
        1 +
        f.artist *
          Math.min(3, g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && dist(g, v, target) === 1).length);
    if (t.boarding && (target ? victim.branch === 'Armor' : !!st)) attack *= 1.55;
    // HQ research: branch weapons and class counters.
    attack *= 1 + unitTech(g, u, 'guns');
    if (!t.naval && t.branch === 'Armor' && victim?.branch === 'Infantry') attack *= 1 + techValue(g, u.side, 'armor.secondary');
    if (!t.naval && t.branch === 'Artillery' && victim?.branch === 'Infantry') attack *= 1 + techValue(g, u.side, 'artillery.shells');
    if (!t.naval && t.branch === 'Artillery' && techLevel(g, u.side, 'artillery.drives') >= 2 && (u.movedDistance || 0) <= 1)
      attack *= 1.1;
    const friends = (side, at, test) =>
      g.units.some(v => v.hp > 0 && v.side === side && v.id !== u.id && dist(g, v, at) === 1 && test(TYPES[v.type]));
    // Lance Formation and Factsphere Fire Control.
    if (!t.naval && t.branch === 'Armor' && techLevel(g, u.side, 'armor.formation') >= 1 && friends(u.side, u, v => v.branch === 'Armor' && !v.naval))
      attack *= 1.12;
    if (
      !t.naval &&
      t.branch === 'Artillery' &&
      target &&
      techLevel(g, u.side, 'artillery.fire') >= 1 &&
      friends(u.side, target, v => v.branch !== 'Artillery')
    )
      attack *= 1.2;
    const pen = armorPenetration(g, u, target);
    const formationArmor =
      target &&
      !victim.naval &&
      victim.branch === 'Armor' &&
      techLevel(g, target.side, 'armor.formation') >= 1 &&
      g.units.some(v => v.hp > 0 && v.side === target.side && v.id !== target.id && !TYPES[v.type].naval && TYPES[v.type].branch === 'Armor' && dist(g, v, target) === 1)
        ? 5
        : 0;
    const armor = target ? victim.armor + eliteScale(target).armor + unitTech(g, target, 'armor') + formationArmor : 35;
    attack *= 100 / (100 + armor * (1 - pen) * 2);
    if (target) {
      const tf = fx(target),
        nearCity = g.stations.some(s => s.owner === target.side && dist(g, s, target) <= 1);
      attack *= officerDefense(g, target);
      attack *= 1 - 0.03 * genericLevel(g, target, 'fortification');
      if (!victim.naval && t.branch === 'Artillery' && victim.branch === 'Armor') attack *= 1 - techValue(g, target.side, 'armor.blaze');
      if (!victim.naval && t.cls === 'siege' && victim.branch === 'Armor') attack *= 1 - techValue(g, target.side, 'armor.bulkheads');
      if (!victim.naval && victim.branch === 'Artillery' && !t.naval && t.branch === 'Artillery')
        attack *= 1 - techValue(g, target.side, 'artillery.counterbattery');
      const ground = tile(g, target.c, target.r);
      if (!victim.naval && victim.branch === 'Infantry' && (ground.terrain === 'urban' || !!stationAt(g, target)))
        attack *= 1 - techValue(g, target.side, 'infantry.urban');
      if (!victim.naval && victim.branch === 'Infantry' && target.entrenched)
        attack *= 1 - techValue(g, target.side, 'infantry.entrench');
      if (nearCity) attack *= 1 - techValue(g, target.side, 'cities.bunkers');
      attack *= 1 - techValue(g, target.side, 'sakura.blaze');
      // Factsphere Screen: Infantry shields neighbouring Artillery.
      if (
        !victim.naval &&
        victim.branch === 'Artillery' &&
        techLevel(g, target.side, 'infantry.picket') >= 1 &&
        g.units.some(
          v => v.hp > 0 && v.side === target.side && TYPES[v.type].branch === 'Infantry' && dist(g, v, target) === 1,
        )
      )
        attack *= 0.85;
      // Commander signature abilities (defender side).
      if (tf.taken) attack *= tf.taken;
      const tef = eliteFx(target);
      if (tef.taken) attack *= tef.taken;
      const protector = g.units.find(v => {
        const p = eliteFx(v).protect;
        return v.hp > 0 && v.side === target.side && v.id !== target.id && p && dist(g, v, target) <= p.range;
      });
      if (protector) attack *= eliteFx(protector).protect.value;
      if (tf.belowHalf && target.hp / maxHP(target) < 0.5) attack *= tf.belowHalf;
      if (tf.counterTaken && counter) attack *= tf.counterTaken;
      if (tf.cityGuard && nearCity) attack *= tf.cityGuard;
      if (g.units.some(v => v.hp > 0 && v.side === target.side && fx(v).rearguard && dist(g, v, target) <= 1))
        attack *= 0.9;
      attack *= skillDefense(g, target, counter, direct) * commanderDefense(g, target, u, counter, direct);
      if (target.side === 'jlf' && (ground.terrain === 'forest' || ground.terrain === 'mountain')) attack *= 0.9;
      if (isSea(ground)) attack *= TYPES[target.type].naval ? 1 : 1 + seaPenalty(g, target.side);
      else attack *= 1 - (TERRAIN[ground.terrain]?.cover || 0);
    }
    if (counter) attack *= !t.naval && t.branch === 'Infantry' && techLevel(g, u.side, 'infantry.picket') >= 2 ? 0.85 : 0.65;
    return Math.max(1, Math.round(attack));
  }
  function preview(g, id, c, r) {
    const a = g.units.find(u => u.id === id),
      p = tile(g, c, r);
    if (!a || !p || atSea(g, a) || !hostileTarget(g, a, p) || !inRange(a, p, g)) return null;
    const t = TYPES[a.type],
      f = fx(a),
      d = unitAt(g, p),
      s = stationAt(g, p);
    const base = power(g, a, d, s),
      shield = s && foe(g, s.owner, a.side) && s.shield > 0;
    const unitDmg = d ? Math.round(base * (shield ? 0.55 : 1)) : 0;
    // Chaos Mines and city-breaker commanders raise damage to city defenses.
    const ef = eliteFx(a),
      raid = (1 + (t.branch === 'Infantry' ? techValue(g, a.side, 'infantry.mines') : 0)) * (1 + (f.vsCity || 0)) * (1 + (ef.vsCity || 0)) * bombardBonus(g, a, s);
    const shieldDmg = shield
      ? Math.round(
          base *
            (t.boarding && d && TYPES[d.type].branch !== 'Armor' ? 1.55 : 1) *
            (t.siege || 1) *
            (d ? 0.8 : 1.45) *
            raid,
        )
      : 0;
    // Asahina's Rapid Assault: a target already hit this turn by his side cannot counter, and he crits more often.
    const followUp = !!f.followUp && !!d && d.struck?.turn === g.turn && d.struck.side === a.side;
    const counter =
      !followUp &&
      !(f.timeStop && a.timeStopTurn !== g.turn) &&
      !targetMarked(g, a, d).noCounter &&
      !!d &&
      !t.noCounter &&
      !ef.noCounter &&
      d.morale > -3 &&
      !atSea(g, d) &&
      inRange(d, a, g) &&
      hostileTarget(g, d, a);
    const crit = clamp(
      t.crit +
        (f.crit || 0) +
        0.06 * genericLevel(g, a, { Infantry: 'infantry_leader', Armor: 'armor_leader', Artillery: 'artillery_leader' }[t.branch]) +
        (followUp ? f.followUp : 0) +
        (wears(g, a, 'marksman') ? 0.08 : 0) +
        techValue(g, a.side, 'sakura.varis'),
      0,
      1,
    );
    return {
      unit: unitDmg,
      shield: shieldDmg,
      counter: counter ? power(g, d, a, stationAt(g, a), true) : 0,
      counterAllowed: counter,
      crit,
      critMult: (t.critMult || 1.55) + (f.critBonus || 0),
      splash: (t.splash || 0) + (ef.splash || 0) + (!t.naval && t.branch === 'Artillery' && (t.splash || ef.splash) ? techValue(g, a.side, 'artillery.salvo') : 0),
      armorPen: armorPenetration(g, a, d),
    };
  }
  // force: nothing survives (F.L.E.I.J.A.); otherwise C.C.'s Code Bearer saves her unit once per operation.
  // by: the side responsible when there is no attacking unit (a city battery).
  function kill(g, v, attacker, force = false, by = null) {
    if (v.hp > 0) return;
    if (fx(v).undying && !v.undyingUsed && !force) {
      v.hp = 1;
      v.undyingUsed = true;
      log(g, `${COMMANDERS[v.cmd].short} survives a lethal blow: Code Bearer.`, v.side);
      return;
    }
    v.hp = 0;
    // A sunk Carrier-Battleship takes the Knightmares aboard down with it.
    for (const c of v.cargo?.splice(0) || []) {
      c.hp = 0;
      kill(g, c, attacker, true);
    }
    // Urabe's Final Stand: his fall rallies friendly units within 2 hexes to High morale.
    if (fx(v).martyr) for (const w of g.units) if (w.hp > 0 && w.side === v.side && dist(g, w, v) <= 2) w.morale = 1;
    if (attacker) {
      if (attacker.cmd) {
        const k = attacker.cmd,
          tally = (g.missionKills ||= {}),
          instances = (g.missionCommanderKills ||= {}),
          instance = `${attacker.side}:${k}:${attacker.personal ? 'personal' : 'operation'}`;
        tally[k] = (tally[k] || 0) + 1;
        // Legacy aggregate tallies cannot distinguish officer instances; never inherit another one's kills.
        instances[instance] = (instances[instance] || 0) + 1;
        if (v.cmd) award(g, attacker.side, 'valor', `${COMMANDERS[k].short} defeated ${COMMANDERS[v.cmd].short}`);
        if (instances[instance] === 5) award(g, attacker.side, 'marksman', `${COMMANDERS[k].short} destroyed 5 units`);
      }
      attacker.kills++;
      attacker.xp = Math.min(5, attacker.xp + 1);
      attacker.morale = clamp(attacker.morale + 1, -3, 1);
    }
    if (v.cmd) log(g, `${COMMANDERS[v.cmd].short}'s unit is lost.`, v.side);
    hooks.kill?.(g, v, attacker, by);
  }
  function attack(g, id, c, r) {
    const a = g.units.find(u => u.id === id);
    if (!a) return { ok: false, reason: 'Unit not found.' };
    const why =
      turnReason(g, a.side) ||
      (a.hp <= 0 ? 'Unit destroyed' : a.morale <= -3 ? 'Unit is confused' : a.attacked ? 'Already fired' : null);
    if (why) return { ok: false, reason: why };
    const pr = preview(g, id, c, r);
    if (!pr) return { ok: false, reason: atSea(g, a) ? 'Embarked units cannot fire.' : 'No hostile target in range.' };
    const p = tile(g, c, r),
      d = unitAt(g, p),
      s = stationAt(g, p),
      f = fx(a),
      crit = random(g) < pr.crit,
      mult = (0.92 + random(g) * 0.16) * (crit ? pr.critMult : 1),
      hit = [];
    const timeStop = !!f.timeStop && a.timeStopTurn !== g.turn;
    const avoidance = genericLevel(g, a, TYPES[a.type].branch === 'Armor' ? 'blitzkrieg' : 'guerrilla');
    const evadeCounter = pr.counterAllowed && avoidance > 0 && random(g) < 0.12 * avoidance;
    // A volley has one firing state: retaliation and kill rewards cannot change later splash hits.
    const splashHits = pr.splash ? g.units
      .filter(v => v.hp > 0 && foe(g, v.side, a.side) && v.id !== d?.id && dist(g, v, p) === 1)
      .map(v => ({ unit: v, amount: Math.round(power(g, a, v, stationAt(g, v), false, false) * pr.splash) })) : [];
    a.attacked = true;
    a.moved = true;
    a.skillReposition = 0;
    a.withdrawMove = false;
    a.launched = null;
    let dmg = 0,
      sd = 0;
    if (d) {
      dmg = Math.round(pr.unit * mult);
      consumeDefensiveSkills(g, d, a);
      d.hp = Math.max(0, d.hp - dmg);
      hit.push({ id: d.id, c: p.c, r: p.r, damage: dmg });
      // Senba's guard covers only the first attack each phase; Asahina reads who was struck this turn.
      d.struck = { turn: g.turn, side: a.side };
    }
    if (s && pr.shield) {
      sd = Math.min(s.shield, Math.round(pr.shield * mult));
      s.shield -= sd;
    }
    if (f.terror && d && d.hp > 0) lowerMorale(g, d, 1);
    const aef = eliteFx(a);
    if (aef.stun && d && d.hp > 0) {
      d.moved = true;
      d.attacked = true;
      lowerMorale(g, d, 1);
    }
    let retaliation = 0;
    if (d && d.hp > 0 && pr.counterAllowed && !evadeCounter) {
      // Worked out after the hit, so a damaged defender returns weaker fire (attack scales with remaining frame).
      retaliation = Math.round(power(g, d, a, stationAt(g, a), true) * (0.94 + random(g) * 0.12));
      a.hp = Math.max(0, a.hp - retaliation);
      if (f.reflect) d.hp = Math.max(0, d.hp - Math.round(retaliation * f.reflect));
      kill(g, a, d);
    }
    if (splashHits.length) {
      for (const { unit: v, amount } of splashHits) {
        if (v.hp <= 0) continue;
        v.hp = Math.max(0, v.hp - amount);
        lowerMorale(g, v, 1);
        hit.push({ id: v.id, c: v.c, r: v.r, damage: amount });
        kill(g, v, a);
      }
    }
    if (d && d.hp <= 0) kill(g, d, a);
    const destroyed = !!d && d.hp <= 0;
    const eliteBreakthrough = !!aef.breakthrough,
      eliteRelentless = !!aef.relentless;
    let cap = f.refire || aef.refire ? 2 : 1;
    // Breakthrough Doctrine: a kill at the cap may still earn one more breakthrough.
    if (destroyed && a.hp > 0 && (TYPES[a.type].breakthrough || eliteBreakthrough) && a.chain === cap) {
      const chance = !TYPES[a.type].naval && TYPES[a.type].branch === 'Armor' ? techValue(g, a.side, 'armor.assault') : 0;
      if (chance && random(g) < chance) cap++;
    }
    let breakthrough = false;
    if (destroyed && a.hp > 0 && (TYPES[a.type].breakthrough || eliteBreakthrough) && a.chain < cap) {
      // Breakthrough: a kill lets the frame fire again. Line and mainline frames get no extra movement; heavy
      // and super-heavy frames also regain movement on their first kill.
      a.chain++;
      a.attacked = false;
      if ((TYPES[a.type].relentless || eliteRelentless)) a.moved = false;
      breakthrough = true;
    } else if (destroyed && a.hp > 0 && (TYPES[a.type].relentless || eliteRelentless)) {
      // Heavy and super-heavy frames always fire again after a kill, beyond the breakthrough cap.
      a.attacked = false;
      breakthrough = true;
    }
    if (
      destroyed &&
      a.hp > 0 &&
      !TYPES[a.type].naval &&
      TYPES[a.type].branch === 'Armor' &&
      techLevel(g, a.side, 'armor.drives') >= 2 &&
      a.overdriveTurn !== g.turn
    ) {
      a.overdriveTurn = g.turn;
      grantReposition(a, 1);
    }
    // Kallen's Ace of the Black Knights: her first kill each turn grants another attack.
    if (destroyed && a.hp > 0 && f.ace && a.aceTurn !== g.turn) {
      a.aceTurn = g.turn;
      if (breakthrough) grantReposition(a, 2);
      else { a.attacked = false; breakthrough = true; }
    }
    if (a.hp > 0 && aef.moveAfterAttack) { a.moved = false; a.skillReposition = 0; }
    if (destroyed && a.hp > 0 && aef.moveAfterKill) {
      a.moved = false;
      a.skillReposition = 0;
      a.eliteMoveAfterKill = true;
    }
    afterCommanderAttack(g, a, d, s, destroyed, timeStop);
    log(
      g,
      `${COMMANDERS[a.cmd]?.short || TYPES[a.type].short}: ${crit ? 'critical hit · ' : ''}${dmg ? dmg + ' frame damage' : ''}${sd ? (dmg ? ' + ' : '') + sd + ' city damage' : ''}${destroyed ? ' · enemy destroyed' : ''}${breakthrough ? ' · breakthrough' : ''}${retaliation ? ' · ' + retaliation + ' counter-fire' : ''}.`,
      a.side,
    );
    checkVictory(g);
    return {
      ok: true,
      from: { c: a.c, r: a.r },
      to: { c: p.c, r: p.r },
      damage: dmg,
      shieldDamage: sd,
      crit,
      counter: retaliation,
      hit,
      destroyed,
      breakthrough,
    };
  }


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
    let attack = (t.attack + officerBaseAttack(g, u)) * eliteScale(u).attack * (1 + 0.45 * (u.stack - 1));
    if (f.dmg && strike) attack *= 1 + f.dmg;
    if (f.dmgBranch?.[t.branch] && strike) attack *= 1 + f.dmgBranch[t.branch];
    return attack * officerAttack(g, u) * (1 + 0.06 * genericLevel(g, u, attackGeneric));
  }
  // Shared geography test: coastal land, not open water or inland terrain.
  function coastalLand(g, u) {
    const here = tile(g, u.c, u.r);
    return !!here && !isSea(here) &&
      (isCoast(here) || adjacent(g, u).some(n => isSea(n)));
  }
  // Suppressive Fire reduces retaliation to the initiating Infantry/Armor unit,
  // but never removes the defender's ability to counter.
  function suppressiveCounterFactor(g, u) {
    const t = TYPES[u.type];
    return !t.naval && (t.branch === 'Infantry' || t.branch === 'Armor')
      ? 1 - techValue(g, u.side, `${branchOf(u.type)}.suppressive`) : 1;
  }
  function power(g, u, target, st, counter = false, direct = true) {
    const t = TYPES[u.type],
      victim = target ? TYPES[target.type] : null,
      f = fx(u),
      ef = eliteFx(u),
      strike = !counter || !f.attackOnly;
    let attack = intrinsicAttack(g, u, counter) * (1 + 0.07 * Math.min(5, u.xp));
    attack *= u.morale >= 1 ? 1.25 : u.morale === -1 ? 0.75 : u.morale === -2 ? 0.5 : u.morale <= -3 ? 0 : 1;
    if (u.despairWeakened) attack *= 1 - u.despairWeakened.value;
    if(u.expPinnedWeakenActive)attack*=1-u.expPinnedWeakenActive;
    if(u.expChengWeaken?.turns>0)attack*=1-u.expChengWeaken.value;
    if(!counter&&u.expSmilasSuppression)attack*=1-u.expSmilasSuppression;
    if(!counter&&u.forcedOffensive)attack*=1.35;
    const gritSkill = { Infantry: 'bayonet_charge', Armor: 'tide_of_iron', Artillery: 'artillery_barrage' }[t.branch];
    const missingHpPenalty = 0.6 * (1 - clamp(u.hp / maxHP(u), 0, 1));
    attack *= 1 - missingHpPenalty * (1 - 0.2 * genericLevel(g, u, gritSkill)) * (u.hp/maxHP(u)<.7&&g.units.some(v=>v.cmd&&v.hp>0&&v.side===u.side&&fx(v).stabilize&&dist(g,u,v)<=2)?.5:1);
    attack *= 1 + (u.expInformationWarfare?0:auraBonus(g,u));
    if(u.expInformationWarfare)attack*=.8;
    attack *= newcomerAttack(g,u,target,counter);
    if(!counter&&st&&foe(g,st.owner,u.side)&&fx(u).focusBombard&&u.focusCity?.city===st.id&&u.focusCity.lastTurn>=g.turn-1)
      attack*=1+Math.min(3,u.focusCity.count)*fx(u).focusBombard;
    // Portmans hunt transports and warships; the Portman II also fights harder in the water (Aquatic Combat).
    if (t.naval === 'amphibious' && target && (atSea(g, target) || isShip(target))) attack *= 1.25;
    if (t.naval === 'amphibious' && target && isShip(target)) attack *= 1 + techValue(g, u.side, 'amphibious.torpedoes');
    if (t.naval === 'amphibious' && target && coastalLand(g, target))
      attack *= 1 + techValue(g, u.side, 'amphibious.clearance');
    if (t.naval === 'amphibious' && counter && coastalLand(g, u))
      attack *= 1 + techValue(g, u.side, 'amphibious.counterfire');
    if (t.aquatic && isSea(tile(g, u.c, u.r))) attack *= 1 + t.aquatic;
    if (t.naval === 'ship') {
      attack *= 1 + techValue(g, u.side, 'naval.gunnery');
      if (counter) attack *= 1 + techValue(g, u.side, 'naval.firecontrol');
      if (target && victim.naval === 'amphibious')
        attack *= 1 + techValue(g, u.side, 'naval.antiamphib');
      if (target && atSea(g, target))
        attack *= 1 + techValue(g, u.side, 'naval.interdiction');
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
    // Amphibious Elite abilities: the Lv.5 values replace, rather than stack with, Lv.3.
    const amphibiousAtSea = isSea(tile(g, u.c, u.r));
    const coastalTarget = target || st;
    if (ef.vsNaval && target &&
        (isShip(target) || (victim?.naval === 'amphibious' && isSea(tile(g, target.c, target.r)))))
      attack *= 1 + ef.vsNaval;
    if (counter && amphibiousAtSea && ef.seaCounter) attack *= 1 + ef.seaCounter;
    if (!counter && ef.coastalAttack && coastalTarget && coastalLand(g, coastalTarget))
      attack *= 1 + ef.coastalAttack;
    if (!counter && ef.landingStrike && amphibiousAtSea && coastalTarget &&
        !isSea(tile(g, coastalTarget.c, coastalTarget.r)))
      attack *= 1 + ef.landingStrike;
    // Shui Gun-Ru's coastal aura is positional and applies only on attacks against coastal land.
    // Multiple Shui supporters do not stack.
    if (!counter && coastalTarget && coastalLand(g, coastalTarget) &&
        g.units.some(v => v.hp > 0 && v.id !== u.id && v.side === u.side &&
          dist(g, v, u) === 1 && eliteFx(v).coastalSupport))
      attack *= 1.10;
    if (f.artist && target)
      attack *=
        1 +
        f.artist *
          Math.min(3, g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && dist(g, v, target) === 1).length);
    if (t.boarding && (target ? victim.branch === 'Armor' : !!st)) attack *= 1.50;
    // HQ research: branch weapons and class counters.
    attack *= 1 + unitTech(g, u, 'guns');
    if (!t.naval && t.branch === 'Infantry' && victim && !victim.naval) {
      if (victim.branch === 'Armor') attack *= 1 + techValue(g, u.side, 'infantry.antiarmor');
      if (victim.branch === 'Artillery') attack *= 1 + techValue(g, u.side, 'infantry.antiartillery');
    }
    if (!t.naval && t.branch === 'Armor' && counter)
      attack *= 1 + techValue(g, u.side, 'armor.reactive');
    if (!t.naval && t.branch === 'Armor' && !counter && u.expAssaultMomentumTurn === g.turn)
      attack *= 1 + techValue(g, u.side, 'armor.momentum');
    if (!t.naval && t.branch === 'Artillery' && victim && !victim.naval && victim.branch === 'Artillery')
      attack *= 1 + techValue(g, u.side, 'artillery.counterammo');
    if (!t.naval && t.branch === 'Artillery' && target && dist(g, u, target) >= 2)
      attack *= 1 + techValue(g, u.side, 'artillery.longrange');
    if (t.naval === 'amphibious' && !counter && u.expLandedTurn === g.turn && u.landingAssaultUsedTurn !== g.turn)
      attack *= 1 + techValue(g, u.side, 'amphibious.landing');
    if (!t.naval && t.branch === 'Armor' && victim?.branch === 'Infantry') attack *= 1 + techValue(g, u.side, 'armor.secondary');
    if (!t.naval && t.branch === 'Artillery' && victim?.branch === 'Infantry') attack *= 1 + techValue(g, u.side, 'artillery.shells');
    const friends = (side, at, test) =>
      g.units.some(v => v.hp > 0 && v.side === side && v.id !== u.id && dist(g, v, at) === 1 && test(TYPES[v.type]));
    // Lance Formation and Factsphere Fire Control.
    if (!t.naval && t.branch === 'Armor' && techLevel(g, u.side, 'armor.formation') >= 1 && friends(u.side, u, v => v.branch === 'Armor' && !v.naval))
      attack *= 1 + techValue(g, u.side, 'armor.formation');
    if (
      !t.naval &&
      t.branch === 'Artillery' &&
      target &&
      techLevel(g, u.side, 'artillery.fire') >= 1 &&
      friends(u.side, target, v => v.branch !== 'Artillery')
    )
      attack *= 1.2;
    const pen = Math.min(.95,armorPenetration(g,u,target)
      + (!t.naval && t.branch === 'Armor' && victim && !victim.naval && victim.branch === 'Armor'
        ? techValue(g, u.side, 'armor.precision') : 0)
      + (!t.naval && t.branch === 'Artillery' && victim && !victim.naval && victim.branch === 'Armor'
        ? techValue(g, u.side, 'artillery.shellfuses') : 0)
      +(u.expCalibration?.15:0)
      +joePenetration(g,u,target)
      +(!counter&&target&&u.expPrecisionTarget?.turn===g.turn&&u.expPrecisionTarget.id===target.id?.25:0)
      +(u.elite&&!TYPES[u.type].naval&&g.units.some(v=>v.cmd&&v.hp>0&&v.side===u.side&&fx(v).elitePenSupport&&dist(g,v,u)<=2)?0.15:0));
    const formationArmor =
      target &&
      !victim.naval &&
      victim.branch === 'Armor' &&
      techLevel(g, target.side, 'armor.formation') >= 2 &&
      g.units.some(v => v.hp > 0 && v.side === target.side && v.id !== target.id && !TYPES[v.type].naval && TYPES[v.type].branch === 'Armor' && dist(g, v, target) === 1)
        ? 5
        : 0;
    const armor = target ? victim.armor + eliteScale(target).armor + unitTech(g, target, 'armor') + formationArmor : 35;
    const vritraBypass=!counter&&f.elitePenSupport&&victim?.branch==='Armor'&&u.expVritraUsedTurn!==g.turn;
    // First anti-armor hit bypasses 20% of the entire target-defense reduction,
    // rather than adding a second penetration or cover modifier.
    const beforeDefenses=attack;
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
      // Exclusive class defenses: warships and amphibious units cannot inherit
      // Infantry/Armor/Artillery research through their underlying frame class.
      if (!victim.naval && victim.branch === 'Infantry' && !t.naval && t.branch === 'Armor')
        attack *= 1 - techValue(g, target.side, 'infantry.armorcounters');
      if (!victim.naval && victim.branch === 'Infantry' && !t.naval && t.branch === 'Artillery' && t.cls === 'siege')
        attack *= 1 - techValue(g, target.side, 'infantry.antisiege');
      if (!victim.naval && victim.branch === 'Armor' && !t.naval && t.branch === 'Armor')
        attack *= 1 - techValue(g, target.side, 'armor.turrets');
      if (victim.naval === 'ship' && t.naval === 'ship')
        attack *= 1 - techValue(g, target.side, 'naval.bulkheads');
      if (victim.naval === 'ship' && t.naval === 'amphibious')
        attack *= 1 - techValue(g, target.side, 'naval.closein');
      if (victim.naval === 'amphibious' && t.naval === 'ship' && isSea(tile(g, target.c, target.r)))
        attack *= 1 - techValue(g, target.side, 'amphibious.openwater');
      const ground = tile(g, target.c, target.r);
      if (!victim.naval && victim.branch === 'Infantry' && (ground.terrain === 'urban' || !!stationAt(g, target)))
        attack *= 1 - techValue(g, target.side, 'infantry.urban');
      if (!victim.naval && victim.branch === 'Infantry' && target.entrenched)
        attack *= 1 - techValue(g, target.side, 'infantry.entrench');
      if (nearCity) attack *= 1 - techValue(g, target.side, 'cities.bunkers');
      attack *= 1 - techValue(g, target.side, 'cities.shields');
      // Factsphere Screen: Infantry shields neighbouring Artillery.
      if (
        !victim.naval &&
        victim.branch === 'Artillery' &&
        techLevel(g, target.side, 'infantry.picket') >= 1 &&
        g.units.some(
          v => v.hp > 0 && v.side === target.side && TYPES[v.type].branch === 'Infantry' && dist(g, v, target) === 1,
        )
      )
        attack *= 0.80;
      // Commander signature abilities (defender side).
      if (tf.taken) attack *= tf.taken;
      const tef = eliteFx(target);
      if (tef.taken) attack *= tef.taken;
      if (tef.seaTaken && isSea(tile(g, target.c, target.r))) attack *= tef.seaTaken;
      if (tef.navalCounterTaken && counter && t.naval) attack *= tef.navalCounterTaken;
      const protector = g.units.find(v => {
        const p = eliteFx(v).protect;
        return v.hp > 0 && v.side === target.side && v.id !== target.id && p && dist(g, v, target) <= p.range;
      });
      if (protector) attack *= eliteFx(protector).protect.value;
      if (tf.belowHalf && target.hp / maxHP(target) < 0.5) attack *= tf.belowHalf;
      if (tf.counterTaken && counter) attack *= tf.counterTaken;
      if (tf.cityGuard && nearCity) attack *= tf.cityGuard;
      if (nearCity && skillNear(g, target, 'garrisonCommand', 1, false)) attack *= 0.9;
      if (g.units.some(v => v.cmd && v.hp > 0 && v.side === target.side && fx(v).rearguard && dist(g, v, target) <= 1))
        attack *= 0.9;
      attack *= skillDefense(g,target,counter,direct) *
        commanderDefense(g,target,u,counter,direct) *
        newcomerDefense(g,target,u,counter,direct);
      if (isSea(ground)) attack *= TYPES[target.type].naval ? 1 : 1 + seaPenalty(g, target.side);
      else {
        const bypass=(target.expInformationWarfare?.side===u.side?.25:0)+(!counter&&u.expPrecisionTarget?.turn===g.turn&&u.expPrecisionTarget.id===target.id?.4:0)+(u.forcedOffensive?.5:0)+(target.expRadar?.side===u.side&&TYPES[u.type].branch==='Artillery'?1:0)+(fx(u).highland&&tile(g,u.c,u.r)?.terrain==='mountain'?.5:0)+(fx(u).adaptiveBreakthrough&&u.movedDistance>=3?.2:0)+(fx(u).ziAmbush&&u.movedDistance>=2&&u.expZiAmbushTurn!==g.turn?.3:0)+(f.blackSeaFox&&u.expEduardoMountainTurn!==g.turn&&tile(g,u.c,u.r)?.terrain==='mountain'?.25:0);
        attack*=1-(TERRAIN[ground.terrain]?.cover||0)*(1-Math.min(1,bypass));
      }
    }
    if(vritraBypass&&attack<beforeDefenses)attack+=.2*(beforeDefenses-attack);
    if (counter) attack *= !t.naval && t.branch === 'Infantry' && techLevel(g, u.side, 'infantry.picket') >= 2 ? 0.90 : 0.65;
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
    // Specialized infantry, artillery and naval research can increase city shield damage.
    const ef = eliteFx(a),
      raid = (1 + (!t.naval && t.branch === 'Infantry' ? techValue(g, a.side, 'infantry.mines') : 0)) *
        (1 + (!t.naval && t.branch === 'Artillery' ? techValue(g, a.side, 'artillery.siege') : 0)) *
        (1 + (t.naval === 'ship' && s && (s.portAt || adjacent(g, s).some(v => navigable(v)))
          ? techValue(g, a.side, 'naval.coastal') : 0)) *
        (1 + (t.naval === 'amphibious' && s &&
          (s.portAt || adjacent(g, s).some(v => navigable(v)))
          ? techValue(g, a.side, 'amphibious.coastal') : 0)) *
        (1 + (f.vsCity || 0)) * (1 + (ef.vsCity || 0)) * bombardBonus(g, a, s);
    const shieldDmg = shield
      ? Math.round(
          base *
            (t.boarding && d && TYPES[d.type].branch !== 'Armor' ? 1.50 : 1) *
            (t.siege || 1) *
            (d ? 0.8 : 1.45) *
            raid,
        )
      : 0;
    // Asahina's Rapid Assault: a target already hit this turn by his side cannot counter, and he crits more often.
    const followUp = !!f.followUp && !!d && d.struck?.turn === g.turn && d.struck.side === a.side;
    const senbaReaction=!!d&&!(a.cmd==='sayoko'&&a.expShadowAttackTurn===g.turn&&d.cmd)&&d.hp>0&&fx(d).guard&&d.held&&d.guardReady&&d.expSenbaCounterTurn!==g.turn&&
      !atSea(g,d)&&inRange(d,a,g)&&hostileTarget(g,d,a);
    const counter =
      !followUp &&
      !(a.cmd==='sayoko'&&a.expShadowAttackTurn===g.turn&&d?.cmd) &&
      !(f.timeStop && a.timeStopTurn !== g.turn) &&
      !(f.dashStrike&&a.movedDistance>=3&&a.expDashTurn!==g.turn) &&
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
        (a.expCalibration ? .25 : 0) +
        (f.chargeCrit && a.movedDistance >= 2 ? f.chargeCrit : 0) +
        0.06 * genericLevel(g, a, { Infantry: 'infantry_leader', Armor: 'armor_leader', Artillery: 'artillery_leader' }[t.branch]) +
        (followUp ? f.followUp : 0) +
        techValue(g, a.side, 'cities.targeting'),
      0,
      1,
    );
    return {
      unit: unitDmg,
      shield: shieldDmg,
      counter: (senbaReaction ? Math.round(power(g,d,a,stationAt(g,a),true)*(.5/.65)) : counter ? power(g,d,a,stationAt(g,a),true) : 0) *
        suppressiveCounterFactor(g, a),
      counterAllowed: counter||senbaReaction,
      crit,
      baseCritMult: (t.critMult || 1.55) + (f.critBonus || 0),
      critMult: (t.critMult || 1.55) + (f.critBonus || 0) +
        techValue(g, a.side, `${branchOf(a.type)}.critpower`),
      splash: (t.splash || 0) + (ef.splash || 0) + (!t.naval && t.branch === 'Artillery' && (t.splash || ef.splash) ? techValue(g, a.side, 'artillery.salvo') : 0),
      armorPen: Math.min(.95,armorPenetration(g,a,d)
        + (!t.naval && t.branch === 'Armor' && d && !TYPES[d.type].naval && TYPES[d.type].branch === 'Armor'
          ? techValue(g, a.side, 'armor.precision') : 0)
        + (!t.naval && t.branch === 'Artillery' && d && !TYPES[d.type].naval && TYPES[d.type].branch === 'Armor'
          ? techValue(g, a.side, 'artillery.shellfuses') : 0)
        +(a.expCalibration?.15:0)
        +joePenetration(g,a,d)
        +(a.elite&&!TYPES[a.type].naval&&g.units.some(v=>v.cmd&&v.hp>0&&v.side===a.side&&fx(v).elitePenSupport&&dist(g,v,a)<=2)?.15:0)),
    };
  }
  // force: nothing survives (F.L.E.I.J.A.); otherwise C.C.'s Code Bearer saves her unit once per operation.
  // by: the side responsible when there is no attacking unit (a city battery).
  function kill(g, v, attacker, force = false, by = null) {
    if (v.hp > 0) return;
    if ((fx(v).undying && !v.undyingUsed || v.cmd==='urabe'&&!v.expFinalStandUsed&&!!attacker&&!!v.expDirectIncoming) && !force) {
      // A commander who forces a lethal Code Bearer / Final Stand activation
      // has still earned a Valor citation, despite the scripted survival.
      if (v.cmd && attacker?.cmd)
        award(g, attacker.side, 'valor', `Overcame ${COMMANDERS[v.cmd].short}'s final defense`, attacker);
      if(v.cmd==='urabe'){
        v.expFinalStandUsed=true;v.hp=1;
        log(g,'Urabe survives a lethal direct hit: Final Stand.',v.side);
        if(attacker.hp>0&&!atSea(g,v)&&inRange(v,attacker,g)&&hostileTarget(g,v,attacker)){
          const amount=power(g,v,attacker,stationAt(g,attacker),false);
          const oldHp=attacker.hp;attacker.hp=Math.max(0,attacker.hp-amount);
          recordWarEvent(g,'damage',v.side,{targetSide:attacker.side,value:oldHp-attacker.hp,unitId:v.id,group:warGroup(g,v)});
          if(attacker.hp<=0){attacker.expDirectIncoming=true;kill(g,attacker,v);delete attacker.expDirectIncoming;}
        }
        return;
      }
      v.hp = 1;
      v.undyingUsed = true;
      log(g, `${COMMANDERS[v.cmd].short} survives a lethal blow: Code Bearer.`, v.side);
      return;
    }
    v.hp = 0;
    dropCarriedEliminator(g, v, 'carrier destroyed');
    if(!v.warCounted){v.warCounted=true;
      recordWarEvent(g,'unitDestroyed',attacker?.side||by||v.side,{unitId:v.id,unitType:v.type,
        unitSide:v.side,commander:v.cmd||null,byCombat:!!attacker||!!by,
        group:warGroup(g,attacker),invasion:!!v.landingRefreshTurn&&v.landingRefreshTurn===g.turn});}
    // A sunk Carrier-Battleship takes the Knightmares aboard down with it.
    for (const c of v.cargo?.splice(0) || []) {
      c.hp = 0;
      kill(g, c, attacker, true);
    }
    // Urabe's Final Stand: his fall rallies friendly units within 2 hexes to High morale.
    if (fx(v).martyr) for (const w of g.units) if (w.hp > 0 && w.side === v.side && dist(g, w, v) <= 2) w.morale = 1;
    // Cargo lost with a destroyed carrier is a consequential loss, not a
    // separate direct kill by the commander who sank the carrier.
    if (attacker && !force) {
      if (attacker.cmd) {
        const k = attacker.cmd,
          tally = (g.missionKills ||= {}),
          instances = (g.missionCommanderKills ||= {}),
          instance = `${attacker.side}:${k}:${attacker.personal ? 'personal' : 'operation'}`;
        tally[k] = (tally[k] || 0) + 1;
        // Legacy aggregate tallies cannot distinguish officer instances; never inherit another one's kills.
        instances[instance] = (instances[instance] || 0) + 1;
        honorAction(g, attacker, 'kills');
        if (v.cmd) {
          honorAction(g, attacker, 'commanderDefeats');
          award(g, attacker.side, 'valor', `Defeated ${COMMANDERS[v.cmd].short}`, attacker);
        }
        if (instances[instance] === 5) award(g, attacker.side, 'marksman', 'Destroyed 5 enemy units', attacker);
      }
      attacker.kills++;
      attacker.xp = Math.min(5, attacker.xp + 1);
      attacker.morale = clamp(attacker.morale + 1, -3, 1);
    }
    if (v.cmd) log(g, `${COMMANDERS[v.cmd].short}'s unit is lost.`, v.side);
    newcomerKilled(g,v,attacker);
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
      variance = 0.92 + random(g) * 0.16,
      mult = variance * (crit ? pr.critMult : 1),
      shieldMult = variance * (crit ? pr.baseCritMult : 1),
      hit = [];
    const timeStop = !!f.timeStop && a.timeStopTurn !== g.turn;
    const avoidance = genericLevel(g, a, TYPES[a.type].branch === 'Armor' ? 'blitzkrieg' : 'guerrilla');
    const evadeCounter = pr.counterAllowed && avoidance > 0 && random(g) < 0.12 * avoidance;
    // A volley has one firing state: retaliation and kill rewards cannot change later splash hits.
    const splashHits = pr.splash ? g.units
      .filter(v => v.hp > 0 && foe(g, v.side, a.side) && v.id !== d?.id && dist(g, v, p) === 1)
      .map(v => ({ unit: v, amount: Math.round(power(g, a, v, stationAt(g, v), false, false) * pr.splash) })) : [];
    // Keep track of any unused movement before firing; a kill that earns another attack
    // should not consume it. Limited skill repositioning must stay limited.
    const movementBeforeAttack = !a.moved
      ? { skillReposition: a.skillReposition || 0, withdrawMove: !!a.withdrawMove }
      : null;
    // Consume earned Assault Momentum on the next volley, regardless of outcome.
    if (a.expAssaultMomentumTurn === g.turn) delete a.expAssaultMomentumTurn;
    a.expTamakiCharging=!!f.charge&&a.movedDistance>=2&&a.expTamakiUsedTurn!==g.turn;
    a.attacked = true;
    honorAction(g, a, 'combats');
    a.moved = true;
    a.skillReposition = 0;
    a.withdrawMove = false;
    a.launched = null;
    // Consume the landing research bonus on the first attack only.
    if (TYPES[a.type].naval === 'amphibious' && a.expLandedTurn === g.turn)
      a.landingAssaultUsedTurn = g.turn;
    // Any prior suppression was included in preview and splash calculations;
    // clear it only after preparing the complete volley, not after the counterattack.
    let dmg = 0,
      sd = 0;
    if(a.expSmilasSuppression)delete a.expSmilasSuppression;
    if (d) {
      dmg = newcomerIntercept(g,d,Math.round(pr.unit * mult));
      consumeDefensiveSkills(g, d, a);
      const priorHP=d.hp;
      d.hp = Math.max(0, d.hp - dmg);
      recordWarEvent(g,'damage',a.side,{targetSide:d.side,value:priorHP-d.hp,unitId:a.id,group:warGroup(g,a)});
      hit.push({ id: d.id, c: p.c, r: p.r, damage: dmg });
      // Senba's guard covers only the first attack each phase; Asahina reads who was struck this turn.
      d.struck = { turn: g.turn, side: a.side };
      if(d.skillMarks?.length)d.skillMarks=d.skillMarks.filter(m=>m.side!==a.side||!m.uses);
    }
    if (s && foe(g, s.owner, a.side)) {
      const priorShield=s.shield;
      // Even after the defenses reach zero, another successful city assault
      // keeps its next regeneration suppressed.
      s.attackedSinceRegen = true;
      if (pr.shield) {
        sd = Math.min(s.shield, Math.round(pr.shield * shieldMult));
        s.shield -= sd;
      }
      if(priorShield>0&&s.shield<=0&&TYPES[a.type].branch==='Artillery'&&skillNear(g,a,'raikoCity',2))s.expYoshidaBreak={side:a.side,turn:g.turn};
    }
    if (f.terror && d && d.hp > 0) {
      lowerMorale(g, d, 1);
      if (f.terrorWeaken) d.despairWeakened = { side: a.side, value: Math.max(d.despairWeakened?.value || 0, f.terrorWeaken) };
    }
    const aef = eliteFx(a);
    if (aef.stun && d && d.hp > 0) {
      d.moved = true;
      d.attacked = true;
      // Rival action flags refresh at turn start; carry the stun into that activation.
      d.expDisabledNext = true;
      lowerMorale(g, d, 1);
    }
    let retaliation = 0;
    const senbaCounter=!!d&&!(a.cmd==='sayoko'&&a.expShadowAttackTurn===g.turn&&d.cmd)&&d.hp>0&&fx(d).guard&&d.held&&d.guardReady&&d.expSenbaCounterTurn!==g.turn&&
      !atSea(g,d)&&inRange(d,a,g)&&hostileTarget(g,d,a);
    if (d && d.hp > 0 && (senbaCounter || (pr.counterAllowed && !evadeCounter))) {
      // First Senba retaliation replaces, rather than duplicates, ordinary counterfire.
      retaliation = Math.round(power(g,d,a,stationAt(g,a),true) *
        (senbaCounter ? .5/.65 : 1) * suppressiveCounterFactor(g, a) *
        (0.94+random(g)*.12));
      if(senbaCounter)d.expSenbaCounterTurn=g.turn;
      if(d.guardReady&&d.held&&skillNear(g,d,'defensiveDoctrine',2)&&d.expSmilasCounterTurn!==g.turn){
        d.expSmilasCounterTurn=g.turn;a.expSmilasSuppression=.2;a.expSmilasSuppressionTurn=g.turn;
      }
      const priorHP=a.hp;
      a.hp = Math.max(0, a.hp - retaliation);
      recordWarEvent(g,'damage',d.side,{targetSide:a.side,value:priorHP-a.hp,unitId:d.id,group:warGroup(g,d)});
      if (f.reflect) d.hp = Math.max(0, d.hp - Math.round(retaliation * f.reflect));
      a.expDirectIncoming=true;kill(g,a,d);delete a.expDirectIncoming;
    }
    if (splashHits.length) {
      for (const { unit: v, amount } of splashHits) {
        if (v.hp <= 0) continue;
        const priorHP=v.hp;
        v.hp = Math.max(0, v.hp - amount);
        recordWarEvent(g,'damage',a.side,{targetSide:v.side,value:priorHP-v.hp,unitId:a.id,group:warGroup(g,a)});
        hit.push({ id: v.id, c: v.c, r: v.r, damage: amount });
        kill(g, v, a);
      }
    }
    if (d && d.hp <= 0){d.expDirectIncoming=true;kill(g,d,a);delete d.expDirectIncoming;}
    if(d)newcomerSupport(g,d,a);
    const destroyed = !!d && d.hp <= 0;
    // A shield-breaking volley must actually reduce an intact hostile city's defenses to zero.
    const defensesDestroyed = !!s && sd > 0 && s.shield <= 0;
    const eliteBreakthrough = !!aef.breakthrough,
      eliteRelentless = !!aef.relentless;
    // Elite Forces that already have Breakthrough may chain kills indefinitely.
    // Ordinary frames retain their existing limit and Breakthrough Doctrine bonus.
    const unlimitedEliteChain = !!TYPES[a.type].elite &&
      (TYPES[a.type].breakthrough || eliteBreakthrough);
    let cap = unlimitedEliteChain ? Infinity : (f.refire || aef.refire ? 2 : 1);
    // Breakthrough Doctrine: a kill at a finite cap may still earn one more breakthrough.
    if (destroyed && a.hp > 0 && (TYPES[a.type].breakthrough || eliteBreakthrough) && a.chain === cap) {
      const chance = !TYPES[a.type].naval && TYPES[a.type].branch === 'Armor' ? techValue(g, a.side, 'armor.assault') : 0;
      if (chance && random(g) < chance) cap++;
    }
    let breakthrough = false;
    if (destroyed && a.hp > 0 && (TYPES[a.type].breakthrough || eliteBreakthrough) && a.chain < cap) {
      // Breakthrough refreshes the attack. Heavy and super-heavy movement
      // is governed separately by their two-move-per-turn limit.
      a.chain++;
      a.attacked = false;
      if ((TYPES[a.type].relentless || eliteRelentless)) a.moved = false;
      breakthrough = true;
    } else if (destroyed && a.hp > 0 && (TYPES[a.type].relentless || eliteRelentless)) {
      // Heavy and super-heavy frames always fire again after a kill, beyond the breakthrough cap.
      a.attacked = false;
      breakthrough = true;
    }
    // Kallen's Ace of the Black Knights: her first kill each turn grants another attack.
    if (destroyed && a.hp > 0 && f.ace && a.aceTurn !== g.turn) {
      a.aceTurn = g.turn;
      if (breakthrough) grantReposition(a, 2);
      else { a.attacked = false; breakthrough = true; }
    }
    // Destroying city defenses grants one additional attack to any surviving unit.
    // A simultaneous frame kill cannot bank a second follow-up attack.
    if (defensesDestroyed && a.hp > 0 && a.attacked) {
      a.attacked = false;
      breakthrough = true;
    }
    // Gekka Lv.5: one extra attack per turn after defeating a coastal defender.
    // Shield-breaking already refreshes an attack for every unit; do not double-bank it
    // or consume the Gekka's unique once-per-turn refresh if another rule granted one.
    if (a.hp > 0 && a.attacked && aef.coastalRefresh &&
        a.expCoastalRefreshTurn !== g.turn &&
        ((destroyed && coastalLand(g, d)) ||
          (defensesDestroyed && coastalLand(g, s)))) {
      a.expCoastalRefreshTurn = g.turn;
      a.attacked = false;
      breakthrough = true;
    }
    if (a.hp > 0 && aef.moveAfterAttack) { a.moved = false; a.skillReposition = 0; }
    if (destroyed && a.hp > 0 && aef.moveAfterKill) {
      a.moved = false;
      a.skillReposition = 0;
      a.eliteMoveAfterKill = true;
    }
    // All heavy/super-heavy frames, including Elite variants, can reposition
    // after a kill, but never more than twice in a single turn.
    if (destroyed && a.hp > 0 && isHeavyChainMover(a) && !heavyMoveLimitReached(g, a)) {
      a.moved = false;
      a.skillReposition = 0;
    }
    afterCommanderAttack(g,a,d,s,destroyed,timeStop);
    // A kill only primes momentum if an existing breakthrough or signature
    // ability actually granted another attack. It never grants one itself.
    if (destroyed && a.hp > 0 && !a.attacked &&
        !TYPES[a.type].naval && TYPES[a.type].branch === 'Armor')
      a.expAssaultMomentumTurn = g.turn;
    // Preserve the movement that was already available when a killing attack
    // refreshes another shot. Do not grant an extra move to a unit that had
    // spent it; existing Relentless, elite and commander rewards still apply.
    if ((destroyed || defensesDestroyed) && a.hp > 0 && !a.attacked && movementBeforeAttack) {
      a.moved = false;
      if (!(TYPES[a.type].relentless || eliteRelentless || aef.moveAfterAttack || aef.moveAfterKill)) {
        if (!movementBeforeAttack.skillReposition && !movementBeforeAttack.withdrawMove) {
          a.skillReposition = 0;
          a.withdrawMove = false;
        } else {
          a.skillReposition = Math.max(a.skillReposition, movementBeforeAttack.skillReposition);
          a.withdrawMove ||= movementBeforeAttack.withdrawMove;
        }
      }
    }

    // Resolve Mutsuki's guerrilla reward after the kill and final attack flags.
    const guerrillaPosition=destroyed&&['forest','mountain'].includes(tile(g,a.c,a.r)?.terrain)&&
      ['Infantry','Armor'].includes(TYPES[a.type].branch)&&
      g.units.some(v=>v.hp>0&&v.side===a.side&&v.cmd==='mutsuki'&&dist(g,v,a)<=2);
    if(guerrillaPosition&&a.hp>0&&a.expGuerrillaMoveTurn!==g.turn){
      a.expGuerrillaMoveTurn=g.turn;grantReposition(a,1);
    }
    if(a.expPrecisionTarget){
      if(destroyed&&d?.id===a.expPrecisionTarget.id&&a.expPrecisionTarget.turn===g.turn&&a.hp>0)grantReposition(a,2);
      delete a.expPrecisionTarget;
    }
    if(a.expMargaretBonusTurn===g.turn)delete a.expMargaretBonusTurn;
    if(a.expShadowAttackTurn===g.turn)delete a.expShadowAttackTurn;
    if(f.dashStrike)a.expDashTurn=g.turn;
    if(f.ziAmbush&&a.movedDistance>=2&&a.expZiAmbushTurn!==g.turn){a.expZiAmbushTurn=g.turn;if(d?.cmd)d.expZiWeakenNext=.2;}
    if(f.highland)a.expHighlandTurn=g.turn;
    if(f.blackSeaFox&&tile(g,a.c,a.r)?.terrain==='mountain')a.expEduardoMountainTurn=g.turn;
    if(f.elitePenSupport&&d&&TYPES[d.type].branch==='Armor')a.expVritraUsedTurn=g.turn;
    if(f.charge&&a.expTamakiCharging){
      a.expTamakiUsedTurn=g.turn;
      if(destroyed)delete a.expTamakiPenaltyTurn;
      else a.expTamakiPenaltyTurn=g.turn;
    }
    delete a.expTamakiCharging;
    if(f.diagnosis&&d)d.expJoeDiagnosis={side:a.side,until:g.turn+1};
    if(f.afterimage&&destroyed&&a.expAfterimageTurn!==g.turn){a.expAfterimage=true;a.expAfterimageTurn=g.turn;}
    if(a.expCalibration){
      // The calibration cost is nonlethal, but combat deaths must remain deaths.
      if(a.hp>0)a.hp=Math.max(1,a.hp-Math.round(maxHP(a)*.08));
      delete a.expCalibration;
    }
    if(a.forcedOffensive)delete a.forcedOffensive;
    if(a.expNavalRelay)delete a.expNavalRelay;
    if(f.breachPassive&&destroyed&&d&&a.expBreachTurn!==g.turn){
      if(a.hp>0&&!unitAt(g,d)){
        // A free advance still follows legal movement, terrain, city defenses,
        // overwatch and port/deposit capture rules. It grants no extra activation.
        const actions={moved:a.moved,attacked:a.attacked,chain:a.chain,
          skillReposition:a.skillReposition,withdrawMove:a.withdrawMove,
          eliteMoveAfterKill:a.eliteMoveAfterKill};
        a.moved=a.attacked=false;
        a.skillReposition=0;
        a.withdrawMove=false;
        try {const advance=move(g,a.id,d.c,d.r);if(advance.ok){a.expBreachTurn=g.turn;a.expBreachAuraAt={c:a.c,r:a.r,turn:g.turn};}}
        finally { Object.assign(a,actions); }
      }
    }
    // Skills and Elite Lv.5 bonuses may also reopen movement. Keep the attack
    // chain intact while closing movement after the second completed move.
    if (heavyMoveLimitReached(g, a)) {
      a.moved = true;
      a.skillReposition = 0;
      a.withdrawMove = false;
      a.eliteMoveAfterKill = false;
    }
    log(
      g,
      `${COMMANDERS[a.cmd]?.short || TYPES[a.type].short}: ${crit ? 'critical hit · ' : ''}${dmg ? dmg + ' frame damage' : ''}${sd ? (dmg ? ' + ' : '') + sd + ' city damage' : ''}${destroyed ? ' · enemy destroyed' : ''}${defensesDestroyed ? ' · city defenses destroyed' : ''}${breakthrough ? ' · breakthrough' : ''}${retaliation ? ' · ' + retaliation + ' counter-fire' : ''}.`,
      a.side,
    );
    checkVictory(g);
    return {
      ok: true,
      from: { c: a.c, r: a.r },
      to: { c: p.c, r: p.r },
      damage: dmg,
      shieldDamage: sd,
      defensesDestroyed,
      crit,
      counter: retaliation,
      hit,
      destroyed,
      breakthrough,
    };
  }


  function auraBonus(g, u) {
    let bonus = 0;
    for (const a of g.units) {
      if (a.hp <= 0 || a.side !== u.side || a.id === u.id) continue;
      // Leila's new skill replaces both her old +12% damage aura and the
      // default commander +8% damage aura; she provides defense instead.
      if (a.cmd && a.cmd !== 'leila' && a.cmd !== 'zero' && a.cmd !== 'lelouch' && a.cmd !== 'schneizel' && a.cmd !== 'bismarck' && a.cmd !== 'ayano' && a.cmd !== 'yukiya' && a.cmd !== 'rakshata' && a.cmd !== 'xianglin' && a.cmd !== 'ohgi' && a.cmd !== 'smilas' && !a.auraDisrupted && (a.cmd !== 'ashley' || !atSea(g, a)) && dist(g, a, u) <= auraRange(a)) bonus = Math.max(bonus, fx(a).aura?.value || 0.08);
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
  // Manfredi must be immediately adjacent to the enemy. Other friendly
  // formations must also be adjacent; the attacking unit may count as one.
  function manfrediSuperiority(g,attacker,target){
    if(!attacker||!target||attacker.side===target.side)return 0;
    const masters=g.units.filter(v=>v.hp>0&&v.cmd==='manfredi'&&v.side===attacker.side&&!atSea(g,v)&&dist(g,v,target)===1);
    for(const master of masters){
      const others=g.units.filter(v=>v.hp>0&&v.side===master.side&&v.id!==master.id&&!atSea(g,v)&&dist(g,v,target)===1);
      if(others.length>=2)return 2;
      if(others.length>=1)return 1;
    }
    return 0;
  }
  function power(g, u, target, st, counter = false, direct = true) {
    const t = TYPES[u.type],
      victim = target ? TYPES[target.type] : null,
      f = fx(u),
      ef = eliteFx(u),
      strike = !counter || !f.attackOnly;
    let attack = intrinsicAttack(g, u, counter) * (1 + 0.07 * Math.min(5, u.xp));
    // Preview Cornelia's opening morale step before the volley without mutating game state.
    // attack() applies the actual increase only after a legal attack is confirmed.
    const morale = !counter && f.firstAttackMorale && u.firstAttackMoraleTurn !== g.turn && u.morale > -3
      ? Math.min(1, u.morale + f.firstAttackMorale)
      : u.morale;
    attack *= morale >= 1 ? 1.25 : morale === -1 ? 0.75 : morale === -2 ? 0.5 : morale <= -3 ? 0 : 1;
    // Foulbout Titan Mode empowers both initiating attacks and defensive counterfire.
    if (u.cmd === 'norland' && u.expNorlandTitan) attack *= 1.30;
    if (u.despairWeakened) attack *= 1 - u.despairWeakened.value;
    if(u.expPinnedWeakenActive)attack*=1-u.expPinnedWeakenActive;
    if(u.expChengWeaken?.turns>0)attack*=1-u.expChengWeaken.value;
    if (!counter && u.expSmilasVanguardCharge) attack *= 1.50;
    if (!counter && u.expToruPromiseDamage) attack *= 1.30;
    if(!counter&&u.expSmilasSuppression)attack*=1-u.expSmilasSuppression;
    // Yukiya's electronic disruption weakens all attacks (including counterfire)
    // only during the victim's next activation.
    if (u.expYukiyaElectronicActive) attack *= 0.75;
    if(!counter&&u.forcedOffensive)attack*=1.35;
    const gritSkill = { Infantry: 'bayonet_charge', Armor: 'tide_of_iron', Artillery: 'artillery_barrage' }[t.branch];
    const missingHpPenalty = 0.6 * (1 - clamp(u.hp / maxHP(u), 0, 1));
    attack *= 1 - missingHpPenalty * (1 - 0.2 * genericLevel(g, u, gritSkill)) * (u.hp/maxHP(u)<.7&&g.units.some(v=>v.cmd&&v.hp>0&&v.side===u.side&&fx(v).stabilize&&dist(g,u,v)<=2)?.5:1);
    attack *= 1 + (u.expInformationWarfare?0:auraBonus(g,u));
    if(u.expInformationWarfare)attack*=.8;
    attack *= newcomerAttack(g,u,target,counter);
    // Ohgi's half-health leadership supports outgoing attacks and counterfire.
    if (ohgiSelflessLeadership(g, u)) attack *= 1.35;
    // Star of Madrid rewards wounded allies' initiating attacks and counterfire.
    if (u.hp < maxHP(u) * 0.50 && starOfMadridNear(g, u)) attack *= 1.25;
    // Xianglin's coordination only strengthens direct initiating attacks.
    // Previews and resolved volleys share this calculation; splash damage
    // and defensive counterattacks never receive the +30% bonus.
    if (!counter && direct && target && xianglinExploitWeakness(g, u, target))
      attack *= 1.30;
    // Checkmate boosts direct attacks and counterattacks against its marked
    // formation, without granting Schneizel a passive aura.
    if (target?.expCheckmate?.side === u.side) attack *= 1.25;
    // Portmans hunt transports and warships; the Portman II also fights harder in the water (Aquatic Combat).
    // Nothing deals bonus damage to airships: anti-ship and coastal bonuses skip them.
    const seaShip = target && isShip(target) && !isAir(target);
    if (t.naval === 'amphibious' && target && (atSea(g, target) || seaShip)) attack *= 1.25;
    if (t.naval === 'amphibious' && seaShip) attack *= 1 + techValue(g, u.side, 'amphibious.torpedoes');
    if (t.naval === 'amphibious' && target && !isAir(target) && coastalLand(g, target))
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
    // Only the first DIRECT attack against each individual enemy formation.
    // Splash damage, counterattacks and city-only bombardment do not trigger it.
    if (!counter && direct && target && f.firstStrike &&
        !(u.expKallenFirstTargets || []).includes(target.id))
      attack *= 1 + f.firstStrike;
    if (!counter && f.liveOnAttack && u.hp / maxHP(u) < 0.5) attack *= 1 + f.liveOnAttack;
    if (counter && f.counter) attack *= 1 + f.counter;
    // Ayano's swordplay counters only adjacent formations.
    if (counter && f.swordmaster && target && dist(g, u, target) === 1) attack *= 1.5;
    if (counter) attack *= 1 + 0.05 * genericLevel(g, u, 'crossfire');
    attack *= skillAttack(g, u, counter) * commanderAttack(g, u, target, counter);
    if(!counter){
      if(u.expMaskFalls?.attackReady)attack*=1.50;
      else if(u.expDeathEmperor)attack*=1.50;
    }
    if (ef.dmg && strike) attack *= 1 + ef.dmg;
    if (counter && ef.counter) attack *= 1 + ef.counter;
    if (ef.vsArmor && victim?.branch === 'Armor' && strike) attack *= 1 + ef.vsArmor;
    // Cornelia's Royal Guard Raid applies near any city, whether held or hostile.
    if (ef.cityAttack && g.stations.some(s => dist(g, s, u) <= 1) && strike)
      attack *= 1 + ef.cityAttack;
    // Amphibious Elite abilities: the Lv.5 values replace, rather than stack with, Lv.3.
    const amphibiousAtSea = isSea(tile(g, u.c, u.r));
    const coastalTarget = target ? (isAir(target) ? null : target) : st;
    if (ef.vsNaval && target &&
        (seaShip || (victim?.naval === 'amphibious' && isSea(tile(g, target.c, target.r)))))
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
    // Armored Exploitation replaces the old kill-chain cap bonus. It applies
    // only to ordinary land Armor attacking a living, weakened enemy frame.
    // It does not boost counterfire, city defenses, elites or amphibious units.
    if (!counter && !t.elite && !t.naval && t.branch === 'Armor' &&
        target && target.hp > 0 && target.hp < maxHP(target) * 0.5)
      attack *= 1 + techValue(g, u.side, 'armor.assault');
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
    const armor = target
      ? (victim.armor + eliteScale(target).armor + unitTech(g, target, 'armor') + formationArmor)
        * (target.expAyanoSwordBreak ? 0.75 : 1)
        * (f.swordmaster && dist(g, u, target) === 1 ? 0.60 : 1)
        * (fx(target).fortressArmor && stationAt(g, target)?.owner === target.side ? 1 + fx(target).fortressArmor : 1)
      : 35;
    const vritraBypass=!counter&&f.elitePenSupport&&victim?.branch==='Armor'&&u.expVritraUsedTurn!==g.turn;
    // First anti-armor hit bypasses 20% of the entire target-defense reduction,
    // rather than adding a second penetration or cover modifier.
    const beforeDefenses=attack;
    attack *= 100 / (100 + armor * (1 - pen) * (counter||!target||manfrediSuperiority(g,u,target)<1?2:1));
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
      // -30% defense from Electrical Overload is +30% incoming combat damage.
      if (target.expFernandoOverload && foe(g, target.side, u.side)) attack *= 1.30;
      if (tf.taken) attack *= tf.taken;
      if (ohgiSelflessLeadership(g, target)) attack *= 0.75;
      if (tf.swordmaster && dist(g, u, target) === 1) attack *= 0.70;
      // Death of the Emperor stacks multiplicatively with the 25% Imperial Army shield.
      // Mask Falls never stacks with either of those protections.
      if(target.expMaskFalls) attack *= 0.60;
      else {
        if(target.expImperialCommand) attack *= 0.75;
        if(target.expDeathEmperor) attack *= 0.75;
      }
      // The charge remains intact during previews, then is spent by the
      // actual direct hit, counterattack or splash resolution.
      if (target.expCCProtection) attack *= 0.70;
      if (target.expFarneseWithdrawal) attack *= 0.70;
      if (target.cmd === 'norland' && target.expNorlandTitan) attack *= 0.70;
      // Non-stacking Blue Geass protection, including Leila herself and
      // friendly formations at exactly two hexes. No offensive bonus.
      if (leilaCommand(g, target)) attack *= 0.9;
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
      if (tf.highMoraleTaken && target.morale >= 1) attack *= tf.highMoraleTaken;
      if (tf.counterTaken && counter) attack *= tf.counterTaken;
      if (tf.cityGuard && nearCity) attack *= tf.cityGuard;
      if (nearCity && skillNear(g, target, 'garrisonCommand', 1, false)) attack *= 0.9;
      // Oscar passively protects other allies within two hexes of himself.
      // His marked ally instead receives 20% protection even after moving away.
      attack *= oscarDefenseMultiplier(g,target);
      if (target.expKlausLoyalty?.side === target.side) attack *= 0.8;
      attack *= skillDefense(g,target,counter,direct) *
        commanderDefense(g,target,u,counter,direct) *
        newcomerDefense(g,target,u,counter,direct);
      if (isSea(ground)) attack *= TYPES[target.type].naval ? 1 : 1 + seaPenalty(g, target.side);
      // Airships fly above the terrain: no cover, and no extra damage either.
      else if (!isAir(target)) {
        const bypass=(target.expInformationWarfare?.side===u.side?.25:0)+(!counter&&u.expPrecisionTarget?.turn===g.turn&&u.expPrecisionTarget.id===target.id?.4:0)+(u.forcedOffensive?.5:0)+(target.expRadar?.side===u.side&&TYPES[u.type].branch==='Artillery'?1:0)+(fx(u).highland&&tile(g,u.c,u.r)?.terrain==='mountain'?.5:0)+(fx(u).adaptiveBreakthrough&&u.movedDistance>=3?.2:0)+(fx(u).ziAmbush&&u.movedDistance>=2&&u.expZiAmbushTurn!==g.turn?.3:0)+(f.blackSeaFox&&u.expEduardoMountainTurn!==g.turn&&tile(g,u.c,u.r)?.terrain==='mountain'?.25:0);
        attack*=1-(TERRAIN[ground.terrain]?.cover||0)*(1-Math.min(1,bypass));
      }
    }
    if(vritraBypass&&attack<beforeDefenses)attack+=.2*(beforeDefenses-attack);
    // Standing next to Smilas is always dangerous for his allies, independent
    // of whether the current incoming hit is one he redirected.
    if (target && smilasAdjacentShield(g,target)) attack *= 1.15;
    // Xingke's Perfect Counter replaces the ordinary 65% retaliation multiplier.
    if (counter) attack *= f.unrestrictedCounter || ((f.perfectCounter || romeroStandFast(g,u)) ? 1
      : !t.naval && t.branch === 'Infantry' && techLevel(g, u.side, 'infantry.picket') >= 2 ? 0.90 : 0.65);
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
    const xianglinOpening = !!d && xianglinExploitWeakness(g, a, d),
      base = power(g, a, d, s),
      // Xianglin's target-specific 30% damage and Kallen's first strike are
      // unit-only bonuses; neither may amplify fortified city shields.
      cityBase = base /
        (d && f.firstStrike && !(a.expKallenFirstTargets || []).includes(d.id) ? 1 + f.firstStrike : 1) /
        (xianglinOpening ? 1.30 : 1),
      shield = s && foe(g, s.owner, a.side) && s.shield > 0;
    // Demolition Expert boosts direct hits on any enemy stationed in a city, even if its shield is down.
    const fullUnitDmg = d ? Math.round(base * (shield ? 0.55 : 1) * (f.yukiyaDemolition && s ? 1.50 : 1)) : 0;
    const smilasPreview = d ? smilasDamageShare(g,d,fullUnitDmg) : null;
    const unitDmg = smilasPreview ? smilasPreview.primary : 0;
    // Specialized infantry, artillery and naval research can increase city shield damage.
    const ef = eliteFx(a),
      raid = (1 + (!t.naval && t.branch === 'Infantry' ? techValue(g, a.side, 'infantry.mines') : 0)) *
        (1 + (!t.naval && t.branch === 'Artillery' ? techValue(g, a.side, 'artillery.siege') : 0)) *
        (1 + (t.naval === 'ship' && s && (s.portAt || adjacent(g, s).some(v => navigable(v)))
          ? techValue(g, a.side, 'naval.coastal') : 0)) *
        (1 + (t.naval === 'amphibious' && s &&
          (s.portAt || adjacent(g, s).some(v => navigable(v)))
          ? techValue(g, a.side, 'amphibious.coastal') : 0)) *
        (1 + (f.vsCity || 0)) * (1 + (ef.vsCity || 0)) *
        (f.yukiyaDemolition ? 1.50 : 1) * bombardBonus(g, a, s);
    const shieldDmg = shield
      ? Math.round(
          cityBase *
            (t.boarding && d && TYPES[d.type].branch !== 'Armor' ? 1.50 : 1) *
            (t.siege || 1) *
            (d ? 0.8 : 1.45) *
            raid,
        )
      : 0;
    // Asahina's Rapid Assault: a target already hit this turn by his side cannot counter, and he crits more often.
    const followUp = !!f.followUp && !!d && d.struck?.turn === g.turn && d.struck.side === a.side;
    const senbaReaction=!!d&&!a.expFernandoOverloadStrike&&!xianglinOpening&&d.morale>-3&&!d.expCharlesMemoryRewrite&&!d.expZeroGeass&&!d.expRoloFrozen&&!f.noCounterAttack&&!(a.cmd==='sayoko'&&a.expShadowAttackTurn===g.turn&&d.cmd)&&d.hp>0&&fx(d).guard&&d.held&&d.guardReady&&d.expSenbaCounterTurn!==g.turn&&
      !atSea(g,d)&&inRange(d,a,g)&&hostileTarget(g,d,a);
    const counter = (!!d && d.hp > 0 && fx(d).unrestrictedCounter && !atSea(g,d) && foe(g,d.side,a.side)) ||
      !a.expFernandoOverloadStrike &&
      !f.noCounterAttack &&
      !followUp &&
      !xianglinOpening &&
      !(a.cmd==='sayoko'&&a.expShadowAttackTurn===g.turn&&d?.cmd) &&
      !(f.dashStrike&&a.movedDistance>=3&&a.expDashTurn!==g.turn) &&
      !targetMarked(g, a, d).noCounter &&
      !!d &&
      !d.expZeroGeass &&
      !d.expRoloFrozen &&
      !d.expCharlesMemoryRewrite &&
      !t.noCounter &&
      !ef.noCounter &&
      d.morale > -3 &&
      !atSea(g, d) &&
      inRange(d, a, g) &&
      hostileTarget(g, d, a);
    const crit = f.guaranteedCrit ? 1 : clamp(
      t.crit +
        (f.crit || 0) +
         (f.liveOnCrit && a.hp / maxHP(a) < 0.5 ? f.liveOnCrit : 0) +
        (a.expCalibration ? .25 : 0) +
        (f.chargeCrit && a.movedDistance >= 2 ? f.chargeCrit : 0) +
        0.06 * genericLevel(g, a, { Infantry: 'infantry_leader', Armor: 'armor_leader', Artillery: 'artillery_leader' }[t.branch]) +
        (followUp ? f.followUp : 0) +
        techValue(g, a.side, 'cities.targeting'),
      0,
      1,
    );
    const counterAllowed = counter || senbaReaction;
    // Luck of the Devil applies to defensive counterfire, not just initiated volleys.
    // Ordinary commanders' counterfire remains non-critical.
    const counterCritMult = d && fx(d).guaranteedCrit && !fx(a).critImmune
      ? (TYPES[d.type].critMult || 1.55) + (fx(d).critBonus || 0) +
        techValue(g, d.side, `${branchOf(d.type)}.critpower`)
      : 1;
    const counterDamage = (senbaReaction ? Math.round(power(g,d,a,stationAt(g,a),true)*(.5/.65))
      : counter ? power(g,d,a,stationAt(g,a),true) : 0) *
      (fx(d).unrestrictedCounter ? 1 : suppressiveCounterFactor(g, a)) * counterCritMult;
    // Preview the approximate 5% reflection; the actual volley uses HP lost
    // after damage rolls and interception, and reflects only if Xingke survives.
    const counterReflection = counterAllowed && d.hp > unitDmg && fx(d).counterReflect
      ? Math.round(Math.min(d.hp, unitDmg) * fx(d).counterReflect) : 0;
    return {
      unit: unitDmg,
      rawUnit: fullUnitDmg,
      shieldRedirect: smilasPreview?.redirected || 0,
      shieldRedirectId: smilasPreview?.ally?.id || null,
      shield: shieldDmg,
      counter: counterDamage + counterReflection,
      counterAllowed,
      // A critical hit cannot land on an immune defending formation.
      crit: d && fx(d).critImmune ? 0 : crit,
      baseCritMult: (t.critMult || 1.55) + (f.critBonus || 0),
      critMult: (t.critMult || 1.55) + (f.critBonus || 0) +
        techValue(g, a.side, `${branchOf(a.type)}.critpower`),
      // Marirrosa's sole passive replaces class splash with full-strength hits
      // on every adjacent enemy, at any legal range (including range 1).
      splash: f.estrellaBarrage ? 1 : (t.splash || 0) + (ef.splash || 0) + (!t.naval && t.branch === 'Artillery' && (t.splash || ef.splash) ? techValue(g, a.side, 'artillery.salvo') : 0),
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
  // Guilford's rescue resolves on actual combat damage, not in power()/preview():
  // redirected hits bypass Guilford's own defenses and can kill him.
  function guilfordCleanse(target) {
    // No restoration of spent normal actions: cleanse incapacitating effects,
    // not a free attack or move on an already-acted commander.
    if (target.expCharlesMemoryRewrite?.previousMorale != null)
      target.morale = Math.max(target.morale, target.expCharlesMemoryRewrite.previousMorale);
    target.morale = Math.max(0, target.morale);
    target.skillMarks = (target.skillMarks || []).filter(mark => mark.side === target.side);
    const debuffs = [
      'auraDisrupted', 'despairWeakened', 'expZeroGeass', 'expCharlesMemoryRewrite',
      'expRoloFrozen', 'expGeassCancelled', 'expFernandoOverload',
      'expDisabledNext', 'expDisabledActive', 'expPinnedNext', 'expPinnedActive',
      'expPinnedWeakenNext', 'expPinnedWeakenActive', 'expJammedNext', 'expJammedActive',
      'expYukiyaElectronicNext', 'expYukiyaElectronicActive',
      'expKallenSlowNext', 'expKallenSlowActive', 'expAyanoSwordBreak',
      'expZiWeakenNext', 'expChengWeaken', 'expSmilasSuppression',
      'expSmilasSuppressionTurn', 'expInformationWarfare', 'expJoeDiagnosis',
      'expCheckmate', 'expForcedVulnerable', 'expDecapitationMark'
    ];
    for (const key of debuffs) delete target[key];
  }
  function guilfordProtect(g, victim, attacker, amount) {
    const incoming = Math.max(0, Math.round(amount || 0));
    if (!incoming || !victim?.cmd || victim.hp <= 0 || !attacker ||
        !foe(g, victim.side, attacker.side) || atSea(g, victim))
      return incoming;
    const guards = g.units.filter(v => v.hp > 0 && v.id !== victim.id &&
      v.side === victim.side && v.cmd === 'guilford' && fx(v).guilfordGuard &&
      !atSea(g,v) && dist(g,v,victim) === 1).sort((a,b) => a.id-b.id);
    if (!guards.length) return incoming;
    // A lethal hit triggers the once-per-turn complete rescue BEFORE the usual
    // 50% sharing rule. Once spent, subsequent hits still share 50% normally.
    const sacrifice = incoming >= victim.hp
      ? guards.find(v => v.expGuilfordSacrificeUsedTurn !== g.turn) : null;
    const guard = sacrifice || guards[0];
    const redirected = sacrifice ? incoming : Math.round(incoming * .5);
    const before = guard.hp;
    guard.hp = Math.max(0, guard.hp - redirected);
    if (sacrifice) {
      guard.expGuilfordSacrificeUsedTurn = g.turn;
      victim.expGuilfordSavedAttack = { turn:g.turn, attackerId:attacker.id };
      guilfordCleanse(victim);
    }
    recordAbilitySignal(g,victim,sacrifice ? 'ULTIMATE SACRIFICE' : 'GUILFORD GUARD','guard');
    // Multiple threatened commanders can name different attackers; the +30%
    // does not stack against a single attacker.
    if (guard.hp > 0) {
      const mark = guard.expGuilfordRetribution || { targets:[], turnsLeft:0 };
      if (!mark.targets.includes(attacker.id)) mark.targets.push(attacker.id);
      mark.turnsLeft = Math.max(mark.turnsLeft, g.phase === guard.side ? 2 : 1);
      guard.expGuilfordRetribution = mark;
    }
    recordWarEvent(g,'damage',attacker.side,{targetSide:guard.side,
      value:before-guard.hp,unitId:attacker.id,group:warGroup(g,attacker)});
    log(g, sacrifice
      ? 'Ultimate Sacrifice: Guilford absorbs a lethal strike and cleanses the protected commander.'
      : 'My Princess, My Justice: Guilford intercepts half the strike.', guard.side);
    // A sacrificed Guilford is a genuine combat casualty, but the rescued
    // formation receives ZERO damage even if he is killed by the full blow.
    if (guard.hp <= 0) kill(g,guard,attacker,false,null,redirected);
    return sacrifice ? 0 : incoming - redirected;
  }
  // Combat damage is distributed immediately. Guilford's protection precedes
  // Smilas's own damage-share rule; redirected hits are not new attacks.
  // Protect Our Father diverts half of an incoming hit once per turn.
  // Only Darlton's own summoned knights qualify; redirected damage is not
  // a new attack and can kill its recipient, triggering A Father's Vengeance.
  function darltonProtect(g,victim,attacker,amount){
    const incoming=Math.max(0,Math.round(amount||0));
    if(!incoming||victim?.cmd!=='darlton'||victim.hp<=0||
       victim.expDarltonProtectTurn===g.turn||!attacker||
       !foe(g,victim.side,attacker.side)||atSea(g,victim))return incoming;
    const knight=g.units.filter(w=>w.hp>0&&w.side===victim.side&&
      w.expDarltonSummonedBy===victim.id&&!atSea(g,w)&&dist(g,w,victim)<=2)
      .sort((a,b)=>dist(g,a,victim)-dist(g,b,victim)||a.id-b.id)[0];
    if(!knight)return incoming;
    const redirected=Math.round(incoming*.5),before=knight.hp;
    victim.expDarltonProtectTurn=g.turn;
    recordAbilitySignal(g,victim,'PROTECT OUR FATHER','guard');
    knight.hp=Math.max(0,knight.hp-redirected);
    recordWarEvent(g,'damage',attacker.side,{targetSide:knight.side,
      value:before-knight.hp,unitId:attacker.id,group:warGroup(g,attacker)});
    log(g,'Protect Our Father: a Glaston Knight absorbs '+redirected+' combat damage.',victim.side);
    if(knight.hp<=0)kill(g,knight,attacker,false,null,redirected);
    return incoming-redirected;
  }
  // Johanne's designation persists on his unit in saved games, not the
  // protected unit: changing targets instantly removes the previous ward.
  // An enemy phase stamp means protection recharges for each hostile faction
  // turn, even when several powers attack in the same world round.
  function johanneBodyguard(g,victim,attacker){
    if(!victim||victim.hp<=0||!attacker||!foe(g,victim.side,attacker.side))return null;
    const phase=g.turn+':'+g.phase;
    return g.units.find(v=>v.hp>0&&v.id!==victim.id&&v.cmd==='johanne'&&
      v.side===victim.side&&v.expJohanneWardTarget===victim.id&&
      v.expJohanneRedirectPhase!==phase)||null;
  }
  function johanneAbsorb(g,victim,attacker,guard,amount){
    const incoming=Math.max(0,Math.round(amount||0)),previous=guard.hp;
    guard.expJohanneRedirectPhase=g.turn+':'+g.phase;
    guard.hp=Math.max(0,guard.hp-incoming);
    guard.struck={turn:g.turn,side:attacker.side};
    recordAbilitySignal(g,victim,'DRAW THEIR FIRE','guard');
    recordAbilitySignal(g,guard,'INTERCEPT '+(previous-guard.hp),'guard');
    recordWarEvent(g,'damage',attacker.side,{targetSide:guard.side,
      value:previous-guard.hp,unitId:attacker.id,group:warGroup(g,attacker)});
    log(g,'Draw Their Fire: Johanne absorbs '+(previous-guard.hp)+
      ' damage protecting '+(COMMANDERS[victim.cmd]?.short||TYPES[victim.type].short)+
      ' from anywhere on the map.',guard.side);
    if(guard.hp<=0){
      guard.expDirectIncoming=true;
      kill(g,guard,attacker,false,null,incoming);
      delete guard.expDirectIncoming;
    }
  }
  function smilasDealCombatDamage(g, victim, attacker, amount, allowJohanne=true) {
    // Scripted volleys, support strikes and splash cannot bypass the same
    // barrier that prevents ordinary ranged targeting.
    if(rangedImmuneTo(g,victim,attacker))return 0;
    const guard=allowJohanne?johanneBodyguard(g,victim,attacker):null;
    if(guard){johanneAbsorb(g,victim,attacker,guard,amount);return 0;}
    const incoming = darltonProtect(g,victim,attacker,guilfordProtect(g,victim,attacker,amount));
    const priorHP = victim.hp;
    const split = smilasDamageShare(g,victim,incoming);
    // Intercept before applying the hit to Smilas, so a bodyguard killed
    // shielding a mortally wounded Smilas still triggers Sacrifices.
    if (split.ally && split.redirected > 0) {
      const ally = split.ally, before = ally.hp;
      ally.hp = Math.max(0,ally.hp-split.redirected);
      klausLoyaltyAfterHit(g, ally, attacker, before);
      recordWarEvent(g,'damage',attacker.side,{
        targetSide:ally.side,value:before-ally.hp,unitId:attacker.id,group:warGroup(g,attacker)});
      // The full REDIRECTED killing blow (including its 15% exposure) is
      // what Necessary Sacrifices measures, not the ally's remaining HP.
      kill(g,ally,attacker,false,null,split.redirected);
    }
    victim.hp = Math.max(0,victim.hp-split.primary);
    klausLoyaltyAfterHit(g, victim, attacker, priorHP);
    return split.primary;
  }
  // force: nothing survives (F.L.E.I.J.A.); C.C.'s Code Bearer
  // can save one lethal hit per global turn, without granting invulnerability.
  // by: the side responsible when there is no attacking unit (a city battery).
  function kill(g, v, attacker, force = false, by = null, incomingDamage = 0) {
    if (v.hp > 0) return;
    // Marianne's Awakening: Anya survives an otherwise fatal hit at full HP.
    // The per-formation stamp persists in saves and follows the game's global turns.
    // Forced kills (F.L.E.I.J.A., lost carrier cargo) remain final.
    if (!force && fx(v).marianneAwakening &&
        (v.expMarianneAwakeningTurn == null ||
         g.turn - v.expMarianneAwakeningTurn >= fx(v).marianneAwakening)) {
      v.hp = maxHP(v);
      v.expMarianneAwakeningTurn = g.turn;
      log(g, "Marianne's Awakening restores Anya to full health.", v.side);
      recordAbilitySignal(g,v,"MARIANNE'S AWAKENING",'heal');
      return;
    }
    if ((fx(v).undying && v.undyingUsedTurn !== g.turn || v.cmd==='urabe'&&!v.expFinalStandUsed&&!!attacker&&!!v.expDirectIncoming) && !force) {
      // A commander who forces a lethal Code Bearer / Final Stand activation
      // has still earned a Valor citation, despite the scripted survival.
      if (v.cmd && attacker?.cmd)
        award(g, attacker.side, 'valor', `Overcame ${COMMANDERS[v.cmd].short}'s final defense`, attacker);
      if(v.cmd==='urabe'){
        v.expFinalStandUsed=true;v.hp=1;
        log(g,'Urabe survives a lethal direct hit: Final Stand.',v.side);
        if(attacker.hp>0&&!v.expRoloFrozen&&!atSea(g,v)&&inRange(v,attacker,g)&&hostileTarget(g,v,attacker)){
          const amount=power(g,v,attacker,stationAt(g,attacker),false);
          const oldHp=attacker.hp;
          smilasDealCombatDamage(g,attacker,v,amount);
          recordWarEvent(g,'damage',v.side,{targetSide:attacker.side,value:oldHp-attacker.hp,unitId:v.id,group:warGroup(g,v)});
          if(attacker.hp<=0){attacker.expDirectIncoming=true;kill(g,attacker,v,false,null,amount);delete attacker.expDirectIncoming;}
          recordAbilityAttack(g,v,attacker,oldHp-attacker.hp);
        }
        recordAbilitySignal(g,v,'FINAL STAND','guard');
        return;
      }
      v.hp = 1;
      v.undyingUsedTurn = g.turn;
      log(g, `${COMMANDERS[v.cmd].short} survives a lethal blow: Code Bearer.`, v.side);
      recordAbilitySignal(g,v,'CODE BEARER','guard');
      return;
    }
    // The intrinsic survivals above (Anya, C.C., Urabe) and earlier combat
    // diversions (Guilford, Darlton) take priority. Only an otherwise fatal
    // enemy combat hit on another allied commander can trigger Masaki.
    if(!force&&!v.expMasakiSacrificeUsed&&attacker&&v.cmd&&
       foe(g,v.side,attacker.side)){
      const rescuer=g.units.filter(m=>m.hp>0&&m.id!==v.id&&m.cmd==='masaki'&&
        m.side===v.side&&!atSea(g,m)&&fx(m).ultimateGuardian&&
        !m.expMasakiSacrificeUsed&&dist(g,m,v)<=2).sort((a,b)=>a.id-b.id)[0];
      if(rescuer){
        v.hp=maxHP(v);
        recordAbilitySignal(g,v,'ULTIMATE GUARDIAN','heal');
        rescuer.expMasakiSacrificeUsed=true;
        rescuer.hp=0;
        log(g,'Ultimate Guardian: Masaki sacrifices himself to restore '+
          COMMANDERS[v.cmd].short+' to full HP.',v.side);
        kill(g,rescuer,attacker,false,null,0);
        return;
      }
    }
    v.hp = 0;
    if(v.cmd==='lelouch'&&!v.expDeathEmperorTriggered){
      v.expDeathEmperorTriggered=true;
      for(const ally of g.units){
        if(ally.hp<=0||ally.id===v.id||ally.side!==v.side||atSea(g,ally)||dist(g,v,ally)>3||ally.expMaskFalls)continue;
        ally.expDeathEmperor={side:v.side,turns:2};
        ally.morale=1;ally.moved=false;ally.attacked=false;ally.chain=0;
        ally.moveActionsThisTurn=0;ally.movedDistance=0;
      }
      log(g,'The Death of the Emperor rallies nearby Britannian formations.',v.side);
    }
    // All Hail Lelouch: one heal pulse per confirmed enemy formation destroyed.
    if(attacker&&attacker.side!==v.side){
      const emperors=g.units.filter(e=>e.hp>0&&e.cmd==='lelouch'&&e.side===attacker.side&&dist(g,e,attacker)<=3);
      if(emperors.length)for(const ally of g.units){
        if(ally.hp>0&&ally.side===attacker.side&&!atSea(g,ally)&&emperors.some(e=>dist(g,e,ally)<=3))
          ally.hp=Math.min(maxHP(ally),ally.hp+Math.max(1,Math.round(maxHP(ally)*0.05)));
      }
    }
    // Every confirmed combat death can reflect half the uncapped killing
    // attack. No counterattack is created; reflection damage cannot itself
    // trigger Necessary Sacrifices or retaliation.
    const reflected = !force && !v.warCounted
      ? smilasSacrificeReflection(g,v,attacker,incomingDamage) : 0;
    if (reflected && attacker.hp > 0) {
      const before = attacker.hp;
      attacker.hp = Math.max(0,attacker.hp-reflected);
      recordWarEvent(g,'damage',v.side,{
        targetSide:attacker.side,value:before-attacker.hp,unitId:v.id,group:warGroup(g,v)});
      log(g,`Necessary Sacrifices reflects ${reflected} damage onto ${COMMANDERS[attacker.cmd]?.short||TYPES[attacker.type].short}.`,v.side);
      recordAbilitySignal(g,attacker,'REFLECT −'+Math.max(0,before-attacker.hp),'debuff');
      // No attack source or incomingDamage: an attacker killed by reflection
      // gets ordinary survival checks, but cannot reflect or counter again.
      if (attacker.hp <= 0) kill(g,attacker,null,false,v.side,0);
    }
    dropCarriedEliminator(g, v, 'carrier destroyed');
    if(!v.warCounted){v.warCounted=true;
      recordWarEvent(g,'unitDestroyed',attacker?.side||by||v.side,{unitId:v.id,unitType:v.type,
        unitSide:v.side,commander:v.cmd||null,personal:!!v.personal,byCombat:!!attacker||!!by,
        group:warGroup(g,attacker),invasion:!!v.landingRefreshTurn&&v.landingRefreshTurn===g.turn});
      farneseOnDeath(g,v,attacker);
    }
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
      }
      // Asura Strike Force: actual combat kills, including lethal counterfire,
      // rally Ashley and friendly on-map formations within two hexes. Forced
      // deaths (e.g. carrier cargo) and non-hostile deaths do not trigger it.
      if (fx(attacker).asuraStrikeForce && foe(g, v.side, attacker.side)) {
        for (const ally of g.units) {
          if (ally.hp > 0 && ally.side === attacker.side && !atSea(g, ally) &&
              dist(g, attacker, ally) <= 2)
            ally.morale = Math.min(1, ally.morale + 1);
        }
      }
      attacker.kills++;
      attacker.xp = Math.min(5, attacker.xp + 1);
      attacker.morale = clamp(attacker.morale + 1, -3, 1);
    }
    if (v.cmd) log(g, `${COMMANDERS[v.cmd].short}'s unit is lost.`, v.side);
    newcomerKilled(g,v,attacker);
    // Toru must rally on a genuine death, including enemy counterfire.
    if(!force&&attacker&&foe(g,v.side,attacker.side))toruLastPromise(g,v,attacker);
    hooks.kill?.(g, v, attacker, by);
  }
  // Centralized post-volley action restoration. Distinguish a frame kill from a
  // newly destroyed city shield: both qualify for movement refresh where the
  // unit/skill allows it, but only true kills grant kill-only rewards.
  function applyAttackConsequences(g, a, d, s, destroyed, defensesDestroyed, movementBeforeAttack, f, aef) {
    const eliteBreakthrough = !!aef.breakthrough,
      eliteRelentless = !!aef.relentless;
    // Light Armor has no kill-based Breakthrough. Medium, heavy, super-heavy
    // and Amphibious II frames (ordinary or elite) can chain killing attacks
    // indefinitely; existing other Breakthrough elites retain that benefit.
    const type = TYPES[a.type];
    const hasBreakthrough = !(type.cls === 'light' && !type.naval) &&
      !!(type.breakthrough || eliteBreakthrough);
    const unlimitedChain = hasBreakthrough &&
      (type.elite || type.naval === 'amphibious' ||
        ['medium', 'heavy', 'super'].includes(type.cls));
    const cap = unlimitedChain ? Infinity : (f.refire || aef.refire ? 2 : 1);
    let breakthrough = false;
    if (destroyed && a.hp > 0 && hasBreakthrough && a.chain < cap) {
      // Breakthrough refreshes the attack. Heavy and super-heavy movement
      // is governed separately by their two-move-per-turn limit.
      a.chain++;
      a.attacked = false;
      if ((TYPES[a.type].relentless || eliteRelentless)) a.moved = false;
      breakthrough = true;
    } else if (destroyed && a.hp > 0 && (TYPES[a.type].relentless || eliteRelentless)) {
      // Relentless frames also fire again after a kill when Breakthrough is unavailable.
      a.attacked = false;
      breakthrough = true;
    }

    // Only Siege Artillery and units with Breakthrough earn a follow-up attack
    // for destroying city defenses. A simultaneous kill cannot bank a second attack.
    if (defensesDestroyed && a.hp > 0 && a.attacked &&
        (hasBreakthrough || (type.cls === 'siege' && type.branch === 'Artillery'))) {
      a.attacked = false;
      breakthrough = true;
    }

    // Every amphibious Elite (all factions, any Elite level) can chain both
    // movement and attacks after a kill or city-defense break, even if it moved
    // before firing. Normal Amphibious II keeps attack-only Breakthrough.
    if ((destroyed || defensesDestroyed) && a.hp > 0 &&
        type.elite && type.naval === 'amphibious') {
      a.attacked = false;
      a.moved = false;
      a.skillReposition = 0;
      a.eliteMoveAfterKill = true;
      breakthrough = true;
    }
    if (a.hp > 0 && aef.moveAfterAttack) { a.moved = false; a.skillReposition = 0; }
    // Kill-triggered Elite movement also triggers when city defenses fall.
    // Vincent Ward's Lv.5 refresh remains limited to its first qualifying
    // event per turn; its unlimited Breakthrough attack chain is unchanged.
    if ((destroyed || defensesDestroyed) && a.hp > 0 && aef.moveAfterKill &&
        (a.elite !== 'vincent_ward' || a.expVincentMoveTurn !== g.turn)) {
      if (a.elite === 'vincent_ward') a.expVincentMoveTurn = g.turn;
      a.moved = false;
      a.skillReposition = 0;
      a.eliteMoveAfterKill = true;
    }
    // Heavy/super-heavy frames reposition after kills or city-defense breaks,
    // but never more than twice in a single turn.
    if ((destroyed || defensesDestroyed) && a.hp > 0 &&
        isHeavyChainMover(a) && !heavyMoveLimitReached(g, a)) {
      a.moved = false;
      a.skillReposition = 0;
    }
    afterCommanderAttack(g,a,d,s,destroyed,defensesDestroyed);
    // A kill only primes momentum if an existing breakthrough or signature
    // ability actually granted another attack. It never grants one itself.
    if (destroyed && a.hp > 0 && !a.attacked &&
        !TYPES[a.type].naval && TYPES[a.type].branch === 'Armor')
      a.expAssaultMomentumTurn = g.turn;
    // Preserve movement that was available before an attack refreshed another
    // shot. A new move is granted only by a class, Elite or commander ability.
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

    // The kill's suppression overrides every chain and elite action refresh.
    if (a.expFarneseSlaughterTurn === g.turn) {
      a.moved = true; a.attacked = true;
      a.withdrawMove = false; a.skillReposition = 0;
      a.eliteMoveAfterKill = false;
    }
    return breakthrough;
  }
  function attack(g, id, c, r) {
    return collectAbilityVisuals(g, () => resolveAttack(g,id,c,r));
  }
  function resolveAttack(g, id, c, r) {
    const check = validateAction(g, { kind: 'attack', id, c, r });
    if (!check.ok) return check;
    const a = check.actor, pr = check.preview, f = fx(a);
    // The opening morale step was accounted for in the damage preview; persist
    // it now, before any damage or counterfire, but only for a legal first attack.
    if (f.firstAttackMorale && a.firstAttackMoraleTurn !== g.turn) {
      a.firstAttackMoraleTurn = g.turn;
      a.morale = Math.min(1, a.morale + f.firstAttackMorale);
    }
    const p = tile(g, c, r),
      d = unitAt(g, p),
      s = stationAt(g, p),
      // A persistent Johanne ward redirects the entire first initiating
      // strike. It does not grant the remote bodyguard free counterfire.
      johanneRedirect = !!johanneBodyguard(g,d,a),
      crit = !(d && fx(d).critImmune) && random(g) < pr.crit,
      variance = 0.92 + random(g) * 0.16,
      mult = variance * (crit ? pr.critMult : 1),
      shieldMult = variance * (crit ? pr.baseCritMult : 1),
      hit = [];
    const kallenFirstStrike = !johanneRedirect && !!d && !!f.firstStrike &&
      !(a.expKallenFirstTargets || []).includes(d.id);
    if (kallenFirstStrike) {
      (a.expKallenFirstTargets ||= []).push(d.id);
      // Applied only on the victim's next turn; multiple hits never stack.
      d.expKallenSlowNext = true;
    }
    const avoidance = genericLevel(g, a, TYPES[a.type].branch === 'Armor' ? 'blitzkrieg' : 'guerrilla');
    const evadeCounter = pr.counterAllowed && avoidance > 0 && random(g) < 0.12 * avoidance;
    // A volley has one firing state: retaliation and kill rewards cannot change later splash hits.
    const splashHits = !johanneRedirect && pr.splash ? g.units
      .filter(v => v.hp > 0 && foe(g, v.side, a.side) && v.id !== d?.id && dist(g, v, p) === 1 &&
        !rangedImmuneTo(g,v,a) && (!isAir(v) || canHitAir(a)))
      .map(v => ({ unit: v, amount: Math.round(power(g, a, v, stationAt(g, v), false, false) * pr.splash) })) : [];
    // Next initiating volley consumes vengeance, including its already-computed splash.
    if(a.cmd==='darlton'&&a.expDarltonVengeanceBonus)delete a.expDarltonVengeanceBonus;
    // Keep track of any unused movement before firing; a kill that earns another attack
    // should not consume it. Limited skill repositioning must stay limited.
    const movementBeforeAttack = !a.moved
      ? { skillReposition: a.skillReposition || 0, withdrawMove: !!a.withdrawMove }
      : null;
    // The Last Promise's first initiating strike consumes the +30% charge.
    const toruPromiseShot=!!a.expToruPromiseDamage;
    // Consume earned Assault Momentum on the next volley, regardless of outcome.
    if (a.expAssaultMomentumTurn === g.turn) delete a.expAssaultMomentumTurn;
    a.expTamakiCharging=!!f.charge&&a.movedDistance>=2&&a.expTamakiUsedTurn!==g.turn;
    a.attacked = true;
    if(a.expMaskFalls?.attackReady)a.expMaskFalls.attackReady=false;
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
      fullDirectDamage = 0,
      sd = 0,
      actualDefenderDamage = 0;
    if(a.expSmilasSuppression)delete a.expSmilasSuppression;
    if (d) {
      if(johanneRedirect){
        // This unit/city was never struck: its shields, statuses, normal
        // counterattack and adjacent splash are all untouched. The shot
        // is completely diverted, but still costs the attacker its action.
        const incoming=Math.max(0,Math.round((pr.rawUnit??pr.unit)*mult));
        smilasDealCombatDamage(g,d,a,incoming);
        hit.push({id:d.id,c:p.c,r:p.r,damage:0});
      } else {
      dmg = newcomerIntercept(g,d,Math.round((pr.rawUnit ?? pr.unit) * mult));
      if (d.expCCProtection) delete d.expCCProtection;
      consumeDefensiveSkills(g, d, a);
      // One independent Future Sight roll per incoming direct attack.
      // No dodge roll is made for indirect splash or city shield damage.
      if (fx(d).futureSightDodge && random(g) < fx(d).futureSightDodge) {
        dmg = 0;
        recordAbilitySignal(g,d,'EVADED','guard');
        log(g, 'FUTURE SIGHT — EVADED', d.side);
      }
      const fullDmg = dmg, priorHP=d.hp;
      fullDirectDamage = fullDmg;
      dmg = smilasDealCombatDamage(g,d,a,fullDmg);
      actualDefenderDamage = priorHP - d.hp;
      // Sword Breaker weakens the armor of an adjacent formation through
      // its next complete action phase, including when the strike is dodged.
      if (f.swordmaster && dist(g, a, d) === 1) d.expAyanoSwordBreak = true;
      // Applies at the start of the victim's next turn, not immediately.
      if (f.yukiyaElectronic && d.hp > 0) d.expYukiyaElectronicNext = true;
      recordWarEvent(g,'damage',a.side,{targetSide:d.side,value:actualDefenderDamage,unitId:a.id,group:warGroup(g,a)});
      hit.push({ id: d.id, c: p.c, r: p.r, damage: dmg });
      // Senba's guard covers only the first attack each phase; Asahina reads who was struck this turn.
      d.struck = { turn: g.turn, side: a.side };
      if(d.skillMarks?.length)d.skillMarks=d.skillMarks.filter(m=>m.side!==a.side||!m.uses);
      }
    }
    if (!johanneRedirect && s && foe(g, s.owner, a.side)) {
      const priorShield=s.shield;
      // Even after the defenses reach zero, another successful city assault
      // keeps its next regeneration suppressed.
      s.attackedSinceRegen = true;
      // Block exactly the defender's next shield recovery; the existing
      // shield-regeneration system clears this after that turn.
      if (f.yukiyaDemolition)
        s.expShieldRegenBlocked = { owner: s.owner, turns: 1 };
      if (pr.shield) {
        sd = Math.min(s.shield, Math.round(pr.shield * shieldMult));
        s.shield -= sd;
      }
      if(priorShield>0&&s.shield<=0&&TYPES[a.type].branch==='Artillery'&&skillNear(g,a,'raikoCity',2))s.expYoshidaBreak={side:a.side,turn:g.turn};
    }
    if (!johanneRedirect && f.terror && d && d.hp > 0) {
      lowerMorale(g, d, 1);
      if (f.terrorWeaken) d.despairWeakened = { side: a.side, value: Math.max(d.despairWeakened?.value || 0, f.terrorWeaken) };
    }
    const aef = eliteFx(a);
    if (!johanneRedirect && aef.stun && d && d.hp > 0) {
      d.moved = true;
      d.attacked = true;
      // Rival action flags refresh at turn start; carry the stun into that activation.
      d.expDisabledNext = true;
      lowerMorale(g, d, 1);
    }
    let retaliation = 0;
    const senbaCounter=!!d&&!a.expFernandoOverloadStrike&&!xianglinExploitWeakness(g, a, d)&&d.morale>-3&&!d.expCharlesMemoryRewrite&&!d.expZeroGeass&&!d.expRoloFrozen&&!f.noCounterAttack&&!(a.cmd==='sayoko'&&a.expShadowAttackTurn===g.turn&&d.cmd)&&d.hp>0&&fx(d).guard&&d.held&&d.guardReady&&d.expSenbaCounterTurn!==g.turn&&
      !atSea(g,d)&&inRange(d,a,g)&&hostileTarget(g,d,a);
    if (!johanneRedirect && a.hp > 0 && d && d.hp > 0 && manfrediSuperiority(g,a,d)<2 && (fx(d).unrestrictedCounter || senbaCounter || (pr.counterAllowed && !evadeCounter))) {
      // First Senba retaliation replaces, rather than duplicates, ordinary counterfire.
      // Guaranteed critical counterfire uses the same critical multiplier as
      // a normal attacking volley; other defenders keep ordinary counterfire.
      const counterCritMult = fx(d).guaranteedCrit && !fx(a).critImmune
        ? (TYPES[d.type].critMult || 1.55) + (fx(d).critBonus || 0) +
          techValue(g, d.side, `${branchOf(d.type)}.critpower`)
        : 1;
      retaliation = Math.round(power(g,d,a,stationAt(g,a),true) *
        (senbaCounter ? .5/.65 : 1) * (fx(d).unrestrictedCounter ? 1 : suppressiveCounterFactor(g, a)) *
        counterCritMult * (0.94+random(g)*.12));
      // The reflected 5% is additional damage on EACH legal counterattack,
      // computed from actual HP lost in this attack (not the raw preview).
      if (fx(d).counterReflect)
        retaliation += Math.round(actualDefenderDamage * fx(d).counterReflect);
      if(senbaCounter)d.expSenbaCounterTurn=g.turn;
      if (fx(d).swordmaster && dist(g, d, a) === 1) a.expAyanoSwordBreak = true;
      if (a.expCCProtection) delete a.expCCProtection;
      if (fx(a).futureSightDodge && random(g) < fx(a).futureSightDodge) {
        retaliation = 0;
        recordAbilitySignal(g,a,'EVADED','guard');
        log(g, 'FUTURE SIGHT — EVADED', a.side);
      }
      const priorHP=a.hp, fullRetaliation=retaliation;
      retaliation=smilasDealCombatDamage(g,a,d,fullRetaliation);
      recordWarEvent(g,'damage',d.side,{targetSide:a.side,value:priorHP-a.hp,unitId:d.id,group:warGroup(g,d)});
      if (f.reflect && retaliation > 0) {
        const priorDefenderHP=d.hp;
        d.hp = Math.max(0,d.hp-Math.round(retaliation*f.reflect));
        // This is reflection damage, not an enemy attack against the
        // defender. Finalize its death without re-triggering Sacrifices.
        if (priorDefenderHP > 0 && d.hp <= 0)
          kill(g,d,null,false,a.side,0);
      }
      a.expDirectIncoming=true;kill(g,a,d,false,null,fullRetaliation);delete a.expDirectIncoming;
    }
    if (splashHits.length) {
      for (const { unit: v, amount } of splashHits) {
        if (v.hp <= 0) continue;
        if (v.expCCProtection) delete v.expCCProtection;
        const priorHP=v.hp;
        const landed=smilasDealCombatDamage(g,v,a,amount,false); // Splash is not a direct targeted attack.
        recordWarEvent(g,'damage',a.side,{targetSide:v.side,value:priorHP-v.hp,unitId:a.id,group:warGroup(g,a)});
        hit.push({ id: v.id, c: v.c, r: v.r, damage: landed });
        kill(g, v, a,false,null,amount);
      }
    }
    if (d && d.hp <= 0 && !d.warCounted) {
      d.expDirectIncoming=true;
      kill(g,d,a,false,null,fullDirectDamage);
      delete d.expDirectIncoming;
    }
    // No reactive supporting fire against an Estrella Barrage: its primary
    // and adjacent victims cannot answer with retaliation of any kind.
    if(d && !johanneRedirect && !f.estrellaBarrage)newcomerSupport(g,d,a);
    const destroyed = !!d && d.hp <= 0;
    // A shield-breaking volley must actually reduce an intact hostile city's defenses to zero.
    const defensesDestroyed = !!s && sd > 0 && s.shield <= 0;
    const breakthrough = applyAttackConsequences(g, a, d, s, destroyed, defensesDestroyed, movementBeforeAttack, f, aef);
    // Resolve Mutsuki's guerrilla reward after the kill and final attack flags.
    const guerrillaPosition=(destroyed||defensesDestroyed)&&['forest','mountain'].includes(tile(g,a.c,a.r)?.terrain)&&
      ['Infantry','Armor'].includes(TYPES[a.type].branch)&&
      g.units.some(v=>v.hp>0&&v.side===a.side&&v.cmd==='mutsuki'&&dist(g,v,a)<=2);
    if(guerrillaPosition&&a.hp>0&&a.expGuerrillaMoveTurn!==g.turn){
      a.expGuerrillaMoveTurn=g.turn;grantReposition(a,1);
    }
    // The Expendable Vanguard charge is consumed by one completed initiating
    // attack, including a city strike or a lethal counterfire response.
    if (a.expSmilasVanguardCharge) {
      delete a.expSmilasVanguardCharge;
      if (a.hp > 0) {
        const cost=Math.max(1,Math.round(maxHP(a)*0.20));
        a.hp=Math.max(0,a.hp-cost);
        if (a.hp <= 0) kill(g,a,null,false,null,0);
      }
    }
    if(toruPromiseShot)delete a.expToruPromiseDamage;
    if(a.expPrecisionTarget){
      if(destroyed&&d?.id===a.expPrecisionTarget.id&&a.expPrecisionTarget.turn===g.turn&&a.hp>0)grantReposition(a,2);
      delete a.expPrecisionTarget;
    }
    if(a.expMargaretBonusTurn===g.turn)delete a.expMargaretBonusTurn;
    if(a.expShadowAttackTurn===g.turn)delete a.expShadowAttackTurn;
    if(f.dashStrike)a.expDashTurn=g.turn;
    if(f.ziAmbush&&a.movedDistance>=2&&a.expZiAmbushTurn!==g.turn){a.expZiAmbushTurn=g.turn;if(d?.cmd&&!johanneRedirect)d.expZiWeakenNext=.2;}
    if(f.highland)a.expHighlandTurn=g.turn;
    if(f.blackSeaFox&&tile(g,a.c,a.r)?.terrain==='mountain')a.expEduardoMountainTurn=g.turn;
    if(f.elitePenSupport&&d&&TYPES[d.type].branch==='Armor')a.expVritraUsedTurn=g.turn;
    if(f.charge&&a.expTamakiCharging){
      a.expTamakiUsedTurn=g.turn;
      if(destroyed)delete a.expTamakiPenaltyTurn;
      else a.expTamakiPenaltyTurn=g.turn;
    }
    delete a.expTamakiCharging;
    if(f.diagnosis&&d&&!johanneRedirect)d.expJoeDiagnosis={side:a.side,until:g.turn+1};
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
    // Brain Raid: once per turn, an isolated Akito recovers a FULL movement
    // action after any attack, including an unsuccessful attack or city volley.
    // Keep the attack flag unchanged and respect existing heavy-frame caps.
    if (a.hp > 0 && f.loneMove && a.expAkitoMoveTurn !== g.turn &&
        akitoIsolated(g, a) && !heavyMoveLimitReached(g, a)) {
      a.expAkitoMoveTurn = g.turn;
      a.expAkitoMoveReady = true;
      a.moved = false;
      a.skillReposition = 0;
      a.withdrawMove = false;
    }
    // Firing consumes the earlier reposition. A first attack on a NEW target
    // earns one movement point, with no cap; this does not restore an attack.
    delete a.expKallenReposition;
    if (kallenFirstStrike && a.hp > 0)
      a.expKallenMoveBank = (a.expKallenMoveBank || 0) + 1;
    if (a.hp > 0 && f.firstStrike && a.expKallenMoveBank > 0 &&
        a.moved && !heavyMoveLimitReached(g, a)) {
      a.moved = false;
      a.skillReposition = a.expKallenMoveBank;
      a.expKallenReposition = true;
    }
    // Skills and Elite Lv.5 bonuses may also reopen movement. Keep the attack
    // chain intact while closing movement after the second completed move.
    if (heavyMoveLimitReached(g, a)) {
      a.moved = true;
      a.skillReposition = 0;
      a.withdrawMove = false;
      a.eliteMoveAfterKill = false;
      delete a.expKallenReposition;
    }
    // Status debuffs inflicted later in the same volley must not undo a rescue.
    for (const protectedAlly of g.units) {
      if (protectedAlly.expGuilfordSavedAttack?.turn !== g.turn ||
          protectedAlly.expGuilfordSavedAttack.attackerId !== a.id) continue;
      guilfordCleanse(protectedAlly);
      delete protectedAlly.expGuilfordSavedAttack;
    }
    // Banked Last Promise attacks are earned IN ADDITION to an ordinary
    // attack and do not bypass commander skill cooldowns or kill-chain caps.
    if(a.hp>0&&a.expToruExtraAttack>0&&a.attacked){
      a.expToruExtraAttack--;
      a.attacked=false;
    }
    log(
      g,
      `${COMMANDERS[a.cmd]?.short || TYPES[a.type].short}: ${crit ? 'critical hit · ' : ''}${dmg ? dmg + ' frame damage' : ''}${sd ? (dmg ? ' + ' : '') + sd + ' city damage' : ''}${destroyed ? ' · enemy destroyed' : ''}${defensesDestroyed ? ' · city defenses destroyed' : ''}${breakthrough ? ' · breakthrough' : ''}${retaliation ? ' · ' + retaliation + ' counter-fire' : ''}.`,
      a.side,
    );
    // Grand Master's Offensive: one coordinated second wave per friendly
    // turn. Only allies that had already spent an attack are refreshed.
    if(a.cmd==='manfredi'&&a.hp>0&&a.expManfrediOffensiveTurn!==g.turn){
      a.expManfrediOffensiveTurn=g.turn;
      for(const ally of g.units)if(ally.hp>0&&ally.side===a.side&&ally.id!==a.id&&!atSea(g,ally)&&dist(g,a,ally)<=2&&ally.attacked){
        ally.attacked=false;
        ally.chain=0;
      }
    }
    // Post-volley commander refreshes cannot undo Andrea's exhaustion.
    if (a.expFarneseSlaughterTurn === g.turn) {
      a.moved = true; a.attacked = true;
      a.withdrawMove = false; a.skillReposition = 0;
      a.eliteMoveAfterKill = false;
      a.expToruExtraAttack = 0; a.expToruExtraMove = 0;
    }
    // Full-strength free Oscar retaliation after an enemy initiates an
    // attack against an allied formation. This cannot produce counterfire.
    const oscarReaction = d && !johanneRedirect && !f.estrellaBarrage ? oscarGuardCounterstrike(g,a,d) : [];
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
      oscarReaction,
      hit,
      destroyed,
      breakthrough,
    };
  }


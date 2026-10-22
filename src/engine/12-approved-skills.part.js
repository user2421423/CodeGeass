  // Approved newcomers: active powers and reactive combat effects.
  // Existing commanders retain their original skill definitions and mechanics.
  // Elite Darlton formations summon a standard frame of the same class.
  function darltonSummonType(g,u){
    const current=TYPES[u.type];
    if(!current)return null;
    if(!current.elite)return u.type;
    const regular=lineupOf(g,u.side)?.[current.cls];
    return regular&&TYPES[regular]&&!TYPES[regular].elite?regular:null;
  }
  function darltonSummonTargets(g,u){
    const type=darltonSummonType(g,u),t=TYPES[type];
    if(!type||u.hp<=0||!t||atSea(g,u))return [];
    const seen=new Set();
    return within(g,u,2).filter(p=>{
      const id=key(p);
      if(seen.has(id))return false;
      seen.add(id);
      if(dist(g,u,p)<1||dist(g,u,p)>2||unitAt(g,p))return false;
      const city=stationAt(g,p);
      if(city&&city.owner!==u.side)return false;
      if(t.air)return true;
      if(TERRAIN[p.terrain]?.blocked)return false;
      if(t.naval==='ship')return navigable(p)&&!city;
      return !isSea(p)||t.naval==='amphibious';
    }).map(p=>({...p,id:key(p)}));
  }
  // A free positional exchange uses destination legality, not remaining
  // movement points or whether either unit has already fired.
  function jeanExchangeLegalHex(g,unit,p){
    if(!p || !TYPES[unit.type])return false;
    const t=TYPES[unit.type],city=stationAt(g,p);
    if(city && foe(g,city.owner,unit.side))return false;
    if(t.air)return !city;
    if(TERRAIN[p.terrain]?.blocked)return false;
    if(t.naval==='ship')return navigable(p) && !city;
    return t.naval==='amphibious'||!isSea(p);
  }
  function jeanExchangeEligible(g,jean,v){
    if(!jean||jean.cmd!=='jeanrowe'||!v||jean.id===v.id||
       jean.hp<=0||v.hp<=0||jean.side!==v.side||
       atSea(g,jean)||atSea(g,v)||dist(g,jean,v)>5)return false;
    const from=tile(g,jean.c,jean.r),to=tile(g,v.c,v.r);
    return !!from&&!!to&&unitAt(g,from)===jean&&unitAt(g,to)===v&&
      jeanExchangeLegalHex(g,jean,to)&&jeanExchangeLegalHex(g,v,from);
  }
  function newcomerTargets(g,u){
    const a=COMMANDERS[u?.cmd]?.action,k=a?.target,range=a?.range||0;
    if(!k)return [];
    if(u.cmd==='darlton')return darltonSummonTargets(g,u);
    if(u.cmd==='jeanrowe')return g.units.filter(v=>jeanExchangeEligible(g,u,v));
    if(u.cmd==='gaohai')return g.stations.filter(s=>s.id!=null&&s.owner===u.side&&dist(g,u,s)===1&&s.shield<s.maxShield&&g.stations.some(o=>o.owner===u.side&&o.c===u.c&&o.r===u.r&&o.shield>0));
    if(u.cmd==='huangqian')return g.stations.filter(s=>s.id!=null&&s.owner===u.side&&dist(g,u,s)<=3&&s.shield<s.maxShield);
    if(u.cmd==='chengzhong')return g.stations.filter(s=>s.id!=null&&foe(g,s.owner,u.side)&&dist(g,u,s)<=3);
    if(k==='self')return u.hp>0&&!(u.cmd==='sayoko'&&u.attacked)?[u]:[];
    if(u.cmd==='sugiyama')return g.stations.filter(s=>s.id!=null&&foe(g,s.owner,u.side)&&dist(g,u,s)===1);
    if(u.cmd==='olivia')return u.attacked?[]:g.units.filter(v=>v.hp>0&&foe(g,v.side,u.side)&&!atSea(g,v)&&inRange(u,v,g)&&hostileTarget(g,u,v));
    if(u.cmd==='margaret')return g.units.filter(v=>v.hp>0&&v.id!==u.id&&v.side===u.side&&!atSea(g,v)&&!v.attacked&&dist(g,u,v)<=3&&!v.expMargaretRedeploy);
    return g.units.filter(v=>v.hp>0&&!atSea(g,v)&&dist(g,u,v)<=range&&(
      ['enemy','enemyCommander'].includes(k)
        ? foe(g,v.side,u.side)&&(k!=='enemyCommander'||!!v.cmd)&&
          (u.cmd!=='indira'||['Infantry','Armor'].some(b=>g.units.some(x=>x.hp>0&&x.side===u.side&&TYPES[x.type].branch===b&&dist(g,x,v)===1)))
        : (v.id!==u.id||u.cmd==='marrybell')&&v.side===u.side&&(k==='ally'||k==='commander'&&!!COMMANDERS[v.cmd]?.action||
          k==='elite'&&!!v.elite||k==='ship'&&isShip(v)||k==='wounded'&&v.hp<maxHP(v)||
          k==='garrison'&&stationAt(g,v)?.owner===v.side&&!v.elite&&!isShip(v)&&v.stack<3&&
          !g.stations.some(s=>s.expSupplyBlocked?.owner===v.side&&dist(g,v,s)<=1))
    ));
  }
  function newcomerUse(g,u,targetId){
    const choices=newcomerTargets(g,u),action=COMMANDERS[u.cmd]?.action;
    if(targetId==null&&['marrybell','kate','gaohai','chengzhong','huangqian','sugiyama','kirihara','indira','olivia','diethard','margaret','darlton','jeanrowe'].includes(u.cmd))return {ok:false,reason:'Select the intended skill target.'};
    const v=targetId==null?choices[0]:choices.find(x=>x.id===targetId);
    if(!v)return {ok:false,reason:'No eligible target within range.'};
    const nearby=predicate=>g.units.find(w=>w.hp>0&&w.side===u.side&&w.id!==u.id&&!atSea(g,w)&&predicate(w));
    switch(u.cmd){
      case 'darlton':{
        const type=darltonSummonType(g,u);
        if(!type)return {ok:false,reason:'No matching standard unit class for this formation.'};
        const knight=newUnit(g,type,u.side,v.c,v.r,1,null,true);
        knight.expDarltonSummonedBy=u.id;
        log(g,'Darlton summons a Glaston Knight ('+TYPES[knight.type].short+') at hex '+v.c+','+v.r+'.',u.side);
        break;
      }
      case 'jeanrowe':{
        if(!jeanExchangeEligible(g,u,v))
          return {ok:false,reason:'The selected exchange is no longer legal.'};
        const from={c:u.c,r:u.r},to={c:v.c,r:v.r};
        u.c=to.c;u.r=to.r;v.c=from.c;v.r=from.r;
        // Rebuild the unit index atomically; sequential reindex() calls
        // would otherwise corrupt the map during an occupied-hex swap.
        indexUnits(g);
        for(const unit of [u,v]){
          for(const passenger of unit.cargo||[]){passenger.c=unit.c;passenger.r=unit.r;}
          // Preserve move/attack/chain flags and action counters; stationary
          // guard and entrenched positions cannot travel with a formation.
          unit.held=false;unit.guardReady=false;unit.entrenched=false;
        }
        recordAbilitySignal(g,u,'EXCHANGE','buff');
        recordAbilitySignal(g,v,'EXCHANGE','buff');
        log(g,'Emergency Exchange: Jean trades positions with '+
          (COMMANDERS[v.cmd]?.short||TYPES[v.type].short)+'.',u.side);
        break;
      }
      case 'marrybell':v.forcedOffensive=true;v.expForcedVulnerable=true;v.expForcedOffensiveTurn=g.turn;break;
      case 'norland':u.expNorlandTitan=true;break;
      case 'sakuya':v.expDisabledNext=true;break;
      case 'lloyd':v.expCalibration=true;break;
      case 'sophie':{
        const w=nearby(w=>w.id!==v.id&&dist(g,u,w)<=2&&dist(g,v,w)<=2);
        if(!w)return {ok:false,reason:'Need two friendly formations within 2 hexes.'};
        v.expLink={partner:w.id};w.expLink={partner:v.id};break;
      }
      case 'sarah':v.expJammedNext=true;break;
      case 'olivia':u.expPrecisionTarget={id:v.id,turn:g.turn};break;
      case 'sayoko':
        u.expShadowMove={turn:g.turn};u.expShadowAttackTurn=g.turn;
        u.moved=false;u.skillReposition=3;break;
      case 'margaret':
        v.expMargaretRedeploy={turn:g.turn,wasMoved:!!v.moved};v.expMargaretBonusTurn=g.turn;
        v.moved=false;v.skillReposition=3;break;
      case 'chloe':v.hp=Math.min(maxHP(v),v.hp+Math.round(maxHP(v)*.2));break;
      case 'chengzhong':{
        const city=v;city.expSupplyBlocked={owner:city.owner,turns:2};for(const w of g.units)if(w.hp>0&&w.side===city.owner&&dist(g,w,city)<=2)w.expChengWeaken={turns:1,value:.15};break;
      }
      case 'diethard':v.expInformationWarfare={side:u.side,source:u.id};break;
      case 'ichijiku':v.expRadar={side:u.side};break;
      case 'indira':v.expPinnedNext=true;v.expPinnedWeakenNext=.25;break;
      case 'kate':v.hp=Math.min(maxHP(v),v.hp+Math.round(maxHP(v)*.15));break;
      case 'gaohai':{
        const source=g.stations.find(s=>s.owner===u.side&&s.c===u.c&&s.r===u.r);
        if(!source||source.shield<=0)return {ok:false,reason:'Gao Hai must occupy a shielded friendly city.'};
        const amount=Math.min(source.shield,Math.round(source.maxShield*.2),v.maxShield-v.shield);
        if(amount<=0)return {ok:false,reason:'No shields can be transferred.'};source.shield-=amount;v.shield+=amount;break;
      }
      case 'huangqian':v.shield=Math.min(v.maxShield,v.shield+Math.round(v.maxShield*.2));break;
      case 'kirihara':{
        v.hp=Math.min(maxHP(v),v.hp+Math.round(maxHP(v)*.1));
        // Sakuradite is the faction's actual energy resource. Units have no energy gauge.
        funds(g,v.side).sakuradite=(funds(g,v.side).sakuradite||0)+Math.max(1,Math.round(income(g,v.side).sakuradite*.2));break;
      }
      case 'sugiyama':{
        const city=v;city.expShieldRegenBlocked={owner:city.owner,turns:1};break;
      }
      default:return {ok:false,reason:'Unknown approved signature action.'};
    }
    u.feintCD=COMMANDERS[u.cmd].action.cooldown ?? 3;
    u.feintUsedTurn=g.turn;
    log(g,COMMANDERS[u.cmd].short+' uses '+COMMANDERS[u.cmd].skill+'.',u.side);
    return {ok:true,target:v.id,affected:1};
  }
  function beachheadSupport(g,u){
    return g.units.some(v=>v.hp>0&&v.side===u.side&&v.cmd==='sawasaki'&&
      v.expBeachheadStart!=null&&g.turn<=v.expBeachheadUntil&&
      (v.id===u.id||(TYPES[u.type].naval==='amphibious'&&dist(g,v,u)<=2)));
  }
  function preparedPosition(g,u){
    return (tile(g,u.c,u.r)?.terrain==='mountain'||stationAt(g,u)?.owner===u.side)&&
      skillNear(g,u,'prepared',2);
  }
  function hongGuGuardian(g,u){
    const guardians=g.units.filter(v=>v.hp>0&&v.side===u.side&&v.cmd==='honggu'&&dist(g,v,u)<=2);
    return guardians.some(h=>friendlyNeighbors(g,h).length>=2) ? .8 : guardians.length ? .9 : 1;
  }
  function joePenetration(g,u,target){
    if(!target)return 0;
    if(target.expJoeDiagnosis?.side===u.side&&target.expJoeDiagnosis.until>=g.turn)return .15;
    return fx(u).diagnosis ? .1 : 0;
  }
  function newcomerAttack(g,u,target,counter){
    const f=fx(u),terrain=tile(g,u.c,u.r);let m=1;
    // Villetta's commanderless hunter bonus applies to initiating,
    // automatic interception, and defensive attacks on formations only.
    if(target && !target.cmd && f.vsCommanderless)m*=1+f.vsCommanderless;
    if(!counter&&f.dashStrike&&u.movedDistance>=3&&u.expDashTurn!==g.turn)m*=1.3;
    if(!counter&&f.highland&&terrain?.terrain==='mountain')m*=1.35;
    if(!counter&&f.adaptiveBreakthrough&&u.movedDistance>=3)m*=1.2;
    

    if(!counter&&u.cmd==='sayoko'&&u.expShadowAttackTurn===g.turn)m*=1.3;
    if(!counter&&u.cmd==='darlton'&&u.expDarltonVengeanceBonus)m*=1.5;
    if(!counter&&u.expMargaretBonusTurn===g.turn)m*=1.15;
    if(!counter&&['Infantry','Armor'].includes(TYPES[u.type].branch)&&['forest','mountain'].includes(terrain?.terrain)&&
      g.units.some(v=>v.hp>0&&v.side===u.side&&v.cmd==='mutsuki'&&dist(g,v,u)<=2))m*=1.2;
    if(counter&&stationAt(g,u)?.owner===u.side&&g.units.some(v=>v.hp>0&&v.side===u.side&&v.cmd==='tianzi'&&dist(g,v,stationAt(g,u))<=3))m*=1.2;
    if(!counter&&beachheadSupport(g,u))m*=1.25;
    // Chao's combined-arms doctrine is granted only to nearby ranged/armored allies
    // attacking a target screened by friendly infantry. Multiple copies never stack.
    if(!counter&&target&&['Armor','Artillery'].includes(TYPES[u.type].branch)&&
      g.units.some(v=>v.cmd&&v.hp>0&&v.side===u.side&&v.id!==u.id&&fx(v).combinedFront&&dist(g,v,u)<=2)&&
      g.units.some(v=>v.hp>0&&v.side===u.side&&v.id!==u.id&&TYPES[v.type].branch==='Infantry'&&dist(g,v,target)===1))m*=1.15;
    // Zi Dien's movement-triggered raid may activate once per turn against a commander.
    if(!counter&&f.ziAmbush&&u.movedDistance>=2&&u.expZiAmbushTurn!==g.turn)m*=1+f.ziAmbush;
    if(!counter&&target&&g.stations.some(s=>s.c===target.c&&s.r===target.r&&s.expYoshidaBreak?.side===u.side&&s.expYoshidaBreak.turn===g.turn))m*=1.15;
    if(!counter&&target&&g.units.some(v=>v.hp>0&&v.side===u.side&&v.cmd==='kinoshita'&&v.expBreachAuraAt?.turn===g.turn&&dist(g,v.expBreachAuraAt,u)<=2&&dist(g,v.expBreachAuraAt,target)<=2))m*=1.15;
    
    if(!counter&&g.units.some(v=>v.cmd&&v.hp>0&&v.side===u.side&&v.id!==u.id&&fx(v).expendable&&dist(g,v,u)===1))m*=1.25;
    // Eduardo: mountain defenders counterstrike harder under nearby Georgian command.
    if(counter&&preparedPosition(g,u)&&u.held&&u.guardReady)m*=1.2;
    if(counter&&g.units.some(v=>v.hp>0&&v.side===u.side&&v.cmd==='honggu'&&dist(g,v,u)<=2&&friendlyNeighbors(g,v).length>=2))m*=1.15;
    if(counter&&u.expPuristCounter?.turns>0)m*=1.2;
    if(counter&&tile(g,u.c,u.r)?.terrain==='mountain'&&
      g.units.some(v=>v.cmd&&v.hp>0&&v.side===u.side&&fx(v).blackSeaFox&&dist(g,v,u)<=2))m*=1.25;
    return m;
  }
  // Oscar's passive guard is centered on Oscar himself, always on
  // while his commander effect is active, and protects OTHER friendly
  // formations within two hexes. It never radiates from a selected ally.
  // Emergency Defense keeps its independent moving 20% marked-unit
  // protection and takes precedence rather than stacking with the aura.
  function oscarDefenseMultiplier(g,target){
    if(!target||target.hp<=0)return 1;
    if(target.expOscarDefense?.side===target.side)return .8;
    return g.units.some(v=>v.hp>0&&v.id!==target.id&&v.side===target.side&&
      fx(v).oscarGuardAura&&!atSea(g,v)&&dist(g,v,target)<=2) ? .9 : 1;
  }
  // Klaus's rescue triggers only after an enemy attack crosses the
  // 30%-HP threshold without killing the victim.
  function klausLoyaltyAfterHit(g, victim, attacker, priorHP) {
    if (!victim || !attacker || !foe(g, attacker.side, victim.side) ||
        victim.hp <= 0 || victim.hp >= maxHP(victim) * 0.30 ||
        priorHP < maxHP(victim) * 0.30) return;
    const klaus = g.units.find(v => v.hp > 0 && v.side === victim.side &&
      fx(v).klausLoyalty && !atSea(g, v) && dist(g, v, victim) <= 2 &&
      v.expKlausLoyaltyTurn !== g.turn);
    if (!klaus) return;
    klaus.expKlausLoyaltyTurn = g.turn;
    victim.hp = Math.min(maxHP(victim), victim.hp + Math.round(maxHP(victim) * 0.15));
    victim.expKlausLoyalty = { side: victim.side, source: klaus.id };
    log(g, 'Klaus rallies a critically wounded wZERO formation.', victim.side);
  }
  // Oscar fires an independent full-strength reaction after an enemy's
  // initiating attack against ANOTHER allied formation within 2 hexes.
  // No normal attack action, retaliation, or attack-chain refresh is created.
  function oscarGuardCounterstrike(g,attacker,defender){
    if(!attacker||attacker.hp<=0||!defender||!foe(g,attacker.side,defender.side))return [];
    const guards=g.units.filter(v=>v.hp>0&&fx(v).guardCounterstrike&&
      v.id!==defender.id&&v.side===defender.side&&v.morale>-3&&
      !v.expRoloFrozen&&!v.expCharlesMemoryRewrite&&!atSea(g,v)&&
      dist(g,v,defender)<=2&&inRange(v,attacker,g)&&hostileTarget(g,v,attacker));
    const strikes=[];
    for(const oscar of guards){
      if(attacker.hp<=0)break;
      // A distinct enemy can trigger once per Oscar per global turn.
      if(oscar.expOscarCounterTargets?.turn!==g.turn)
        oscar.expOscarCounterTargets={turn:g.turn,ids:[]};
      if(oscar.expOscarCounterTargets.ids.includes(attacker.id))continue;
      oscar.expOscarCounterTargets.ids.push(attacker.id);
      const station=stationAt(g,attacker),pr=preview(g,oscar.id,attacker.c,attacker.r);
      if(!pr)continue;
      const crit=random(g)<pr.crit;
      const damage=Math.max(1,Math.round(pr.rawUnit*(.92+random(g)*.16)*
        (crit?pr.critMult:1)));
      if(attacker.expCCProtection)delete attacker.expCCProtection;
      let incoming=newcomerIntercept(g,attacker,damage);
      if(fx(attacker).futureSightDodge&&random(g)<fx(attacker).futureSightDodge){
        incoming=0;
        recordAbilitySignal(g,attacker,'EVADED','guard');
        log(g,'FUTURE SIGHT — EVADED',attacker.side);
      }
      const before=attacker.hp;
      const dealt=smilasDealCombatDamage(g,attacker,oscar,incoming);
      recordWarEvent(g,'damage',oscar.side,{targetSide:attacker.side,
        value:before-attacker.hp,unitId:oscar.id,group:warGroup(g,oscar)});
      attacker.struck={turn:g.turn,side:oscar.side};
      if(attacker.skillMarks?.length)
        attacker.skillMarks=attacker.skillMarks.filter(m=>m.side!==oscar.side||!m.uses);
      if(attacker.hp<=0){
        attacker.expDirectIncoming=true;
        kill(g,attacker,oscar,false,null,incoming);
        delete attacker.expDirectIncoming;
      }
      log(g,'Oscar counterstrikes '+(COMMANDERS[attacker.cmd]?.short||TYPES[attacker.type].short)+
        ' for '+dealt+' damage; no counterfire.',oscar.side);
      strikes.push({oscar:oscar.id,target:attacker.id,damage:dealt});
      recordAbilityAttack(g,oscar,attacker,before-attacker.hp,crit);
    }
    return strikes;
  }
  // Andrea reacts only to a confirmed death, after survival and rescue checks.
  // His heal is once per round; his exhaustion has no cooldown.
  function farneseOnDeath(g,v,attacker) {
    for (const andrea of g.units) {
      if (andrea.hp <= 0 || andrea.cmd !== 'farnese' || andrea.side !== v.side ||
          atSea(g,andrea) || dist(g,andrea,v) > 3) continue;
      const ability = fx(andrea);
      if (ability.honorFallen && andrea.expFarneseHonorTurn !== g.turn) {
        andrea.expFarneseHonorTurn = g.turn;
        for (const ally of g.units) if (ally.hp > 0 && ally.side === andrea.side &&
            dist(g,andrea,ally) <= 2) {
          ally.hp = Math.min(maxHP(ally),ally.hp + Math.max(1,Math.round(maxHP(ally)*0.1)));
          ally.morale = Math.max(0,ally.morale);
          recordAbilitySignal(g,ally,'HONOR THE FALLEN','heal');
        }
        log(g,'Honor the Fallen: Andrea rallies and repairs nearby survivors.',andrea.side);
      }
      if (ability.endSlaughter && attacker && attacker.hp > 0 &&
          foe(g,attacker.side,v.side)) {
        attacker.expFarneseSlaughterTurn = g.turn;
        attacker.attacked = true; attacker.moved = true;
        attacker.skillReposition = 0; attacker.withdrawMove = false;
        attacker.eliteMoveAfterKill = false;
        attacker.expToruExtraAttack = 0; attacker.expToruExtraMove = 0;
        recordAbilitySignal(g,attacker,'END THE SLAUGHTER','debuff');
        log(g,'End the Slaughter exhausts the attacking formation.',andrea.side);
      }
    }
  }
  // Romero holds a defensive line until each formation physically moves.
  // Action refreshes do not erase the move flag, and multiple Romeros do
  // not stack damage reduction or counterfire multipliers.
  function romeroStandFast(g,u){
    return !!u&&u.hp>0&&!u.expRomeroMoved&&g.units.some(v=>
      v.hp>0&&v.cmd==='romero'&&fx(v).standFast&&v.side===u.side&&
      !atSea(g,v)&&dist(g,v,u)<=2);
  }
  // Last Promise: a true enemy combat death (counterattack included).
  // If Toru falls on the enemy turn, bank another legal action for allies'
  // following friendly activation instead of erasing it at turn reset.
  function toruLastPromise(g,toru,attacker){
    if(toru.cmd!=='toru'||!fx(toru).lastPromise||toru.expToruPromiseUsed||
       !attacker||!foe(g,toru.side,attacker.side))return;
    toru.expToruPromiseUsed=true;
    const immediate=g.phase===toru.side;
    for(const ally of g.units){
      if(ally.hp<=0||ally.id===toru.id||ally.side!==toru.side||
         atSea(g,ally)||dist(g,toru,ally)>2)continue;
      ally.morale=1;
      recordAbilitySignal(g,ally,'THE LAST PROMISE');
      ally.expToruPromiseDamage=true;
      if(!immediate){
        ally.expToruPromisePending=true;
        continue;
      }
      // Previously exhausted actions refresh immediately; actions not yet
      // spent receive a banked extra action after their first use.
      if(ally.attacked)ally.attacked=false;
      else ally.expToruExtraAttack=Math.max(ally.expToruExtraAttack||0,1);
      if(ally.moved)ally.moved=heavyMoveLimitReached(g,ally);
      else if(!heavyMoveLimitReached(g,ally))
        ally.expToruExtraMove=Math.max(ally.expToruExtraMove||0,1);
      ally.skillReposition=0;
      ally.withdrawMove=false;
    }
    log(g,"The Last Promise: Toru's sacrifice rallies nearby allies.",toru.side);
  }
  function newcomerDefense(g,target,attacker,counter,direct){
    let m=romeroStandFast(g,target)?0.75:1;
    if(g.units.some(v=>v.cmd&&v.hp>0&&v.side===target.side&&v.id!==target.id&&fx(v).expendable&&dist(g,v,target)===1))m*=1.15;

    if(target.cmd==='jeremiah')m*=.85;
    if(beachheadSupport(g,target))m*=.85;
    m*=hongGuGuardian(g,target);
    if(preparedPosition(g,target))m*=.85;
    if(fx(target).lastStand&&target.hp/maxHP(target)<.5)m*=.8;
    if(counter&&target.cmd==='tamaki'&&(target.expTamakiPenaltyTurn===g.turn||target.movedDistance>=2&&target.expTamakiUsedTurn!==g.turn))m*=1.2;
    if(fx(target).afterimage&&target.expAfterimage&&direct&&!counter)m*=.65;
    // Eduardo: improved defensive deployment on mountain hexes.
    if(direct&&tile(g,target.c,target.r)?.terrain==='mountain'&&
      g.units.some(v=>v.cmd&&v.hp>0&&v.side===target.side&&fx(v).blackSeaFox&&dist(g,v,target)<=2))m*=.85;
    if(rangeOf(g,attacker).max>1&&g.units.some(v=>v.cmd&&v.hp>0&&v.side===target.side&&fx(v).rangeShield&&dist(g,v,target)<=2))m*=.85;
    if(target.expForcedVulnerable)m*=1.15;

    // Ferilli's W-0 telemetry prevents avoidable losses to retaliatory fire.
    // Passive, non-stacking, and deliberately separate from Sophie's support attacks.
    if(counter&&direct&&target&&!TYPES[target.type].naval&&
      g.units.some(v=>v.cmd&&v.hp>0&&v.side===target.side&&fx(v).counterfireRouting&&dist(g,v,target)<=2))m*=.8;
    return m;
  }
  function newcomerIntercept(g,target,amount){
    // Only lethal direct unit strikes qualify: not bombardment, FLEIJA, or splash.
    if(target?.cmd&&amount>=target.hp){
      const half=Math.round(amount*.5);
      const guard=g.units.find(v=>v.cmd==='jeremiah'&&v.hp>half&&v.id!==target.id&&v.side===target.side&&
        !atSea(g,v)&&v.expLoyaltyTurn!==g.turn&&dist(g,v,target)<=2);
      if(guard){
        guard.hp-=half;guard.expLoyaltyTurn=g.turn;
        recordWarEvent(g,'damage',guard.side,{targetSide:guard.side,value:half,unitId:guard.id,group:warGroup(g,guard)});
        amount=Math.min(Math.max(0,target.hp-1),amount-half);
        log(g,'Jeremiah intercepts a lethal strike for '+(COMMANDERS[target.cmd]?.short||'an allied commander')+'.',guard.side);
        recordAbilitySignal(g,target,'JEREMIAH INTERCEPT','guard');
      }
    }
    const guard=g.units.find(v=>v.cmd&&v.hp>1&&v.side===target.side&&v.id!==target.id&&fx(v).guardianIntercept&&v.expGuardTurn!==g.turn&&dist(g,v,target)===1);
    if(guard){const diverted=Math.min(guard.hp-1,Math.round(amount*.35));guard.hp-=diverted;amount-=diverted;guard.expGuardTurn=g.turn;recordAbilitySignal(g,target,'GUARDIAN INTERCEPT','guard');}
    if(target.expAfterimage)delete target.expAfterimage;
    return amount;
  }
  function newcomerSupport(g,defender,attacker){
    if(!defender||attacker.hp<=0)return;
    const assists=g.units.filter(v=>v.hp>0&&v.morale>-3&&!v.expCharlesMemoryRewrite&&!v.expRoloFrozen&&v.side===defender.side&&v.id!==defender.id&&!atSea(g,v)&&inRange(v,attacker,g)&&
      (v.expLink?.partner===defender.id&&v.expLinkTurn!==g.turn||
       fx(v).relief&&v.expReliefTurn!==g.turn&&dist(g,v,defender)<=2));
    const unit=assists.sort((a,b)=>b.hp-a.hp)[0];if(!unit)return;
    const n=Math.max(1,Math.round(power(g,unit,attacker,stationAt(g,attacker),true)*(fx(unit).relief?.6:.5)));
    const taken=attacker.cmd==='darlton'?darltonProtect(g,attacker,unit,n):n;
    const before = attacker.hp;
    attacker.hp=Math.max(0,attacker.hp-taken);
    if(fx(unit).relief)unit.expReliefTurn=g.turn;else unit.expLinkTurn=g.turn;
    kill(g,attacker,unit);
    recordAbilityAttack(g,unit,attacker,before-attacker.hp);
  }
  // Villetta reacts to a commanderless enemy MOVING into an adjacent hex.
  // This is an independent free strike: it never calls attack(), consumes
  // a normal attack, refreshes a kill chain, or permits counterfire.
  function villettaIntercept(g,moved){
    if(moved.hp<=0||moved.cmd||moved.expVillettaInterceptedTurn===g.turn)return false;
    const hunter=g.units.find(v=>v.hp>0&&fx(v).adjacentCommanderlessIntercept&&
      v.morale>-3&&!v.expRoloFrozen&&!v.expCharlesMemoryRewrite&&
      foe(g,v.side,moved.side)&&dist(g,v,moved)===1);
    if(!hunter)return false;
    // Mark on the target, not the hunter: different enemies can each trigger
    // once this turn, even when Villetta has already made her normal attack.
    moved.expVillettaInterceptedTurn=g.turn;
    const station=stationAt(g,moved);
    const pr=preview(g,hunter.id,moved.c,moved.r);
    const base=pr?.rawUnit??Math.round(power(g,hunter,moved,station)*
      (station&&foe(g,station.owner,hunter.side)&&station.shield>0?.55:1));
    const crit=!!pr&&random(g)<pr.crit;
    const damage=Math.max(1,Math.round(base*(.92+random(g)*.16)*
      (crit?pr.critMult:1)));
    if(moved.expCCProtection)delete moved.expCCProtection;
    let incoming=newcomerIntercept(g,moved,damage);
    if(fx(moved).futureSightDodge&&random(g)<fx(moved).futureSightDodge){
      incoming=0;
      recordAbilitySignal(g,moved,'EVADED','guard');
      log(g,'FUTURE SIGHT — EVADED',moved.side);
    }
    const before=moved.hp;
    const landed=smilasDealCombatDamage(g,moved,hunter,incoming);
    recordWarEvent(g,'damage',hunter.side,{targetSide:moved.side,
      value:before-moved.hp,unitId:hunter.id,group:warGroup(g,hunter)});
    moved.struck={turn:g.turn,side:hunter.side};
    if(moved.skillMarks?.length)moved.skillMarks=moved.skillMarks.filter(m=>m.side!==hunter.side||!m.uses);
    if(moved.hp<=0){
      moved.expDirectIncoming=true;
      kill(g,moved,hunter,false,null,incoming);
      delete moved.expDirectIncoming;
    }
    log(g,'Villetta intercepts a commanderless enemy'+
      (crit?' (critical)':'')+': '+landed+' damage; no counterfire.',hunter.side);
    recordAbilityAttack(g,hunter,moved,before-moved.hp,crit);
    return true;
  }
  // Loki Network fires at the first hostile formation to move within weapon range
  // during EACH enemy faction phase. It is a free reaction, not an attack action:
  // it cannot cause retaliation or use Norland's normal attack allowance.
  function newcomerOverwatch(g,moved){
    let reacted=false;
    const phaseKey = g.turn + ':' + g.phase;
    for (const u of g.units) {
      if (moved.hp <= 0) break;
      if (u.cmd !== 'norland' || !fx(u).lokiNetwork || u.hp <= 0 ||
          u.expNorlandOverwatchPhase === phaseKey ||
          u.morale <= -3 || u.expRoloFrozen || u.expCharlesMemoryRewrite ||
          atSea(g,u) || !foe(g,u.side,moved.side) ||
          !inRange(u,moved,g) || !hostileTarget(g,u,moved)) continue;
      // Mark before resolving the hit, so kills and other nested effects
      // cannot cause a second attack during this same enemy turn.
      u.expNorlandOverwatchPhase = phaseKey;
      reacted=true;
      const station=stationAt(g,moved);
      const pr=preview(g,u.id,moved.c,moved.r);
      const base=pr?.rawUnit ?? Math.round(power(g,u,moved,station) *
        (station && foe(g,station.owner,u.side) && station.shield > 0 ? .55 : 1));
      const crit=!!pr && random(g)<pr.crit;
      const amount=Math.max(1,Math.round(base*(.92+random(g)*.16)*
        (crit ? pr.critMult : 1)));
      if(moved.expCCProtection)delete moved.expCCProtection;
      let incoming=newcomerIntercept(g,moved,amount);
      if(fx(moved).futureSightDodge && random(g)<fx(moved).futureSightDodge){
        incoming=0;
        recordAbilitySignal(g,moved,'EVADED','guard');
        log(g,'FUTURE SIGHT — EVADED',moved.side);
      }
      const before=moved.hp;
      const dealt=smilasDealCombatDamage(g,moved,u,incoming);
      recordWarEvent(g,'damage',u.side,{targetSide:moved.side,
        value:before-moved.hp,unitId:u.id,group:warGroup(g,u)});
      moved.struck={turn:g.turn,side:u.side};
      if(moved.skillMarks?.length)moved.skillMarks=moved.skillMarks.filter(m=>m.side!==u.side||!m.uses);
      if(moved.hp<=0){
        moved.expDirectIncoming=true;
        kill(g,moved,u,false,null,incoming);
        delete moved.expDirectIncoming;
      }
      log(g,'Loki Network: Norland fires for '+dealt+' damage; no counterfire.',u.side);
      recordAbilityAttack(g,u,moved,before-moved.hp,crit);
    }
    if(moved.hp>0 && villettaIntercept(g,moved))reacted=true;
    return reacted;
  }
  function newcomerKilled(g,v,attacker){
    if(!v.cmd&&g.units.some(k=>k.hp>0&&k.side===v.side&&k.cmd==='kewell'&&dist(g,k,v)<=2))
      for(const ally of g.units)if(ally.hp>0&&ally.side===v.side&&dist(g,ally,v)===1)
        ally.expPuristCounter={turns:1,startTurn:g.turn};
    // A Father's Vengeance: the marked knight's confirmed loss empowers Darlton.
    if(v.expDarltonSummonedBy!=null){
      const father=g.units.find(w=>w.id===v.expDarltonSummonedBy&&w.hp>0&&w.cmd==='darlton'&&w.side===v.side);
      if(father&&father.expDarltonVengeanceTurn!==g.turn){
        father.expDarltonVengeanceTurn=g.turn;
        father.attacked=false;
        father.moved=heavyMoveLimitReached(g,father);
        father.skillReposition=0;
        father.withdrawMove=false;
        father.eliteMoveAfterKill=false;
        father.expDarltonVengeanceBonus=true;
        log(g,"A Father's Vengeance restores Darlton's movement and attack and empowers his next attack.",father.side);
      }
    }
    if(!attacker)return;
    // St. Uriel's Relentless Pursuit: another allied formation's confirmed kill
    // within 3 hexes restores legal actions and advances Assault's cooldown.
    if (foe(g, attacker.side, v.side)) for (const raymond of g.units) {
      if (raymond.cmd !== 'raymond' || !fx(raymond).relentlessPursuit ||
          raymond.hp <= 0 || raymond.id === attacker.id || raymond.side !== attacker.side ||
          atSea(g, raymond) || dist(g, raymond, v) > 3) continue;
      raymond.attacked = false;
      raymond.moved = heavyMoveLimitReached(g, raymond);
      raymond.skillReposition = 0;
      raymond.withdrawMove = false;
      raymond.eliteMoveAfterKill = false;
      raymond.feintCD = Math.max(0, (raymond.feintCD || 0) - 1);
      log(g, "Relentless Pursuit refreshes Raymond's actions and advances Grand Master's Assault.", raymond.side);
    }
    // Spearhead's Retribution: a genuine kill of an enemy Guilford protected
    // against restores normal movement and attack exactly once each turn.
    if (attacker.cmd === 'guilford' && attacker.hp > 0 &&
        attacker.expGuilfordRetribution?.targets?.includes(v.id) &&
        attacker.expGuilfordRetributionKillTurn !== g.turn) {
      attacker.expGuilfordRetributionKillTurn = g.turn;
      attacker.attacked = false;
      attacker.moved = heavyMoveLimitReached(g,attacker);
      attacker.skillReposition = 0;
      attacker.withdrawMove = false;
      attacker.eliteMoveAfterKill = false;
      const previous = attacker.expGuilfordRetributionRefresh;
      attacker.expGuilfordRetributionRefresh = { turn:g.turn,
        count:(previous?.turn===g.turn ? previous.count : 0)+1 };
    }
    // Exploit the Opening: only an OTHER allied formation's actual kill can
    // refresh Ryo and the killer. No new attack is created on mere damage,
    // shields, a Ryo solo kill, or indirect deaths without an allied killer.
    // Uses ordinary marked targets, so Yukiya's weaker mark cannot stack.
    for(const mark of v.skillMarks||[]){
      if(!mark.ryo||mark.side!==attacker.side||mark.source===attacker.id)continue;
      const ryo=g.units.find(u=>u.id===mark.source&&u.cmd==='ryo'&&u.hp>0&&
        u.side===attacker.side&&!atSea(g,u)&&fx(u).ryoOpening);
      if(!ryo)continue;
      for(const ally of [ryo,attacker]){
        if(ally.hp<=0)continue;
        ally.attacked=false;
        // A full normal move, without resetting heavy-frame action counts or
        // rearming any once-per-turn commander/Elite ability.
        ally.moved=heavyMoveLimitReached(g,ally);
        ally.skillReposition=0;
        ally.withdrawMove=false;
        ally.eliteMoveAfterKill=false;
      }
      // Small AI-turn signal: if Ryo acted earlier, the rival turn runner can
      // let him spend his newly restored action without a complex new planner.
      const prior=ryo.expRyoOpeningRefresh;
      ryo.expRyoOpeningRefresh={turn:g.turn,count:(prior?.turn===g.turn?prior.count:0)+1};
    }
    for(const u of g.units)if(u.hp>0&&u.side===attacker.side&&fx(u).salvage&&dist(g,u,v)<=2){
      const gained=Math.min(20,60-(u.expSalvageIndustry||0));funds(g,u.side).industry+=Math.max(0,gained);u.expSalvageIndustry=(u.expSalvageIndustry||0)+Math.max(0,gained);
      u.expSalvageCount=(u.expSalvageCount||0)+1;
      if(u.expSalvageCount%3===0)u.hp=Math.min(maxHP(u),u.hp+Math.round(maxHP(u)*.1));
      break;
    }
  }

  // Approved newcomers: active powers and reactive combat effects.
  // Existing commanders retain their original skill definitions and mechanics.
  function newcomerTargets(g,u){
    const a=COMMANDERS[u?.cmd]?.action,k=a?.target,range=a?.range||0;
    if(!k)return [];
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
    if(targetId==null&&['marrybell','kate','gaohai','chengzhong','huangqian','sugiyama','kirihara','indira','olivia','diethard','margaret'].includes(u.cmd))return {ok:false,reason:'Select the intended skill target.'};
    const v=targetId==null?choices[0]:choices.find(x=>x.id===targetId);
    if(!v)return {ok:false,reason:'No eligible target within range.'};
    const nearby=predicate=>g.units.find(w=>w.hp>0&&w.side===u.side&&w.id!==u.id&&!atSea(g,w)&&predicate(w));
    switch(u.cmd){
      case 'marrybell':v.forcedOffensive=true;v.expForcedVulnerable=true;v.expForcedOffensiveTurn=g.turn;break;
      case 'norland':v.expOverwatch=true;break;
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
    if(!counter&&f.dashStrike&&u.movedDistance>=3&&u.expDashTurn!==g.turn)m*=1.3;
    if(!counter&&f.highland&&terrain?.terrain==='mountain')m*=1.35;
    if(!counter&&f.adaptiveBreakthrough&&u.movedDistance>=3)m*=1.2;
    

    if(!counter&&u.cmd==='sayoko'&&u.expShadowAttackTurn===g.turn)m*=1.3;
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
  function newcomerDefense(g,target,attacker,counter,direct){
    let m=1;
    if(g.units.some(v=>v.cmd&&v.hp>0&&v.side===target.side&&v.id!==target.id&&fx(v).expendable&&dist(g,v,target)===1))m*=1.15;

    if(target.cmd==='jeremiah'&&g.units.some(v=>v.hp>0&&v.id!==target.id&&v.side===target.side&&!!v.cmd&&dist(g,v,target)===1))m*=.85;
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
        !atSea(g,v)&&v.expLoyaltyTurn!==g.turn&&dist(g,v,target)===1);
      if(guard){
        guard.hp-=half;guard.expLoyaltyTurn=g.turn;
        recordWarEvent(g,'damage',guard.side,{targetSide:guard.side,value:half,unitId:guard.id,group:warGroup(g,guard)});
        amount=Math.min(Math.max(0,target.hp-1),amount-half);
        log(g,'Jeremiah intercepts a lethal strike for '+(COMMANDERS[target.cmd]?.short||'an allied commander')+'.',guard.side);
      }
    }
    const guard=g.units.find(v=>v.cmd&&v.hp>1&&v.side===target.side&&v.id!==target.id&&fx(v).guardianIntercept&&v.expGuardTurn!==g.turn&&dist(g,v,target)===1);
    if(guard){const diverted=Math.min(guard.hp-1,Math.round(amount*.35));guard.hp-=diverted;amount-=diverted;guard.expGuardTurn=g.turn;}
    if(target.expAfterimage)delete target.expAfterimage;
    return amount;
  }
  function newcomerSupport(g,defender,attacker){
    if(!defender||attacker.hp<=0)return;
    const assists=g.units.filter(v=>v.hp>0&&v.side===defender.side&&v.id!==defender.id&&!atSea(g,v)&&inRange(v,attacker,g)&&
      (v.expLink?.partner===defender.id&&v.expLinkTurn!==g.turn||
       fx(v).relief&&v.expReliefTurn!==g.turn&&dist(g,v,defender)<=2));
    const unit=assists.sort((a,b)=>b.hp-a.hp)[0];if(!unit)return;
    const n=Math.max(1,Math.round(power(g,unit,attacker,stationAt(g,attacker),true)*(fx(unit).relief?.6:.5)));
    attacker.hp=Math.max(0,attacker.hp-n);
    if(fx(unit).relief)unit.expReliefTurn=g.turn;else unit.expLinkTurn=g.turn;
    kill(g,attacker,unit);
  }
  function newcomerOverwatch(g,moved){
    const guards=g.units.filter(v=>v.hp>0&&v.expOverwatch&&foe(g,v.side,moved.side)&&!atSea(g,v)&&inRange(v,moved,g));
    for(const u of guards){if(moved.hp<=0)break;delete u.expOverwatch;
      const amount=Math.max(1,Math.round(power(g,u,moved,stationAt(g,moved))*.6));
      moved.hp=Math.max(0,moved.hp-newcomerIntercept(g,moved,amount));kill(g,moved,u);}
  }
  function newcomerKilled(g,v,attacker){
    if(!v.cmd&&g.units.some(k=>k.hp>0&&k.side===v.side&&k.cmd==='kewell'&&dist(g,k,v)<=2))
      for(const ally of g.units)if(ally.hp>0&&ally.side===v.side&&dist(g,ally,v)===1)
        ally.expPuristCounter={turns:1,startTurn:g.turn};
    if(!attacker)return;
    for(const u of g.units)if(u.hp>0&&u.side===attacker.side&&fx(u).salvage&&dist(g,u,v)<=2){
      const gained=Math.min(20,60-(u.expSalvageIndustry||0));funds(g,u.side).industry+=Math.max(0,gained);u.expSalvageIndustry=(u.expSalvageIndustry||0)+Math.max(0,gained);
      u.expSalvageCount=(u.expSalvageCount||0)+1;
      if(u.expSalvageCount%3===0)u.hp=Math.min(maxHP(u),u.hp+Math.round(maxHP(u)*.1));
      break;
    }
  }

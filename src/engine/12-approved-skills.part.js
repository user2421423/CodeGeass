  // Approved newcomers: active powers and reactive combat effects.
  // Existing commanders retain their original skill definitions and mechanics.
  function newcomerTargets(g,u){
    const a=COMMANDERS[u?.cmd]?.action,k=a?.target,range=a?.range||0;
    if(!k)return [];
    if(k==='self')return [u].filter(v=>v.hp>0&&(u.cmd==='tianzi'
      ? g.stations.some(s=>s.owner===u.side&&dist(g,s,u)<=3)
      : u.cmd==='chengzhong' ? g.stations.some(s=>foe(g,s.owner,u.side)&&dist(g,s,u)<=2):true));
    return g.units.filter(v=>v.hp>0&&!atSea(g,v)&&dist(g,u,v)<=range&&(
      ['enemy','enemyCommander'].includes(k)
        ? foe(g,v.side,u.side)&&(k!=='enemyCommander'||!!v.cmd)&&
          (u.cmd!=='indira'||['Infantry','Armor'].every(b=>g.units.some(x=>x.hp>0&&x.side===u.side&&TYPES[x.type].branch===b&&dist(g,x,v)===1)))
        : v.id!==u.id&&v.side===u.side&&(k==='ally'||k==='commander'&&!!COMMANDERS[v.cmd]?.action||
          k==='elite'&&!!v.elite||k==='ship'&&isShip(v)||k==='wounded'&&v.hp<maxHP(v)||
          k==='garrison'&&stationAt(g,v)?.owner===v.side&&!v.elite&&!isShip(v)&&v.stack<3)
    ));
  }
  function newcomerUse(g,u,targetId){
    const choices=newcomerTargets(g,u),v=targetId==null?choices[0]:choices.find(x=>x.id===targetId);
    if(!v)return {ok:false,reason:'No eligible target within range.'};
    const nearby=predicate=>g.units.find(w=>w.hp>0&&w.side===u.side&&w.id!==u.id&&!atSea(g,w)&&predicate(w));
    switch(u.cmd){
      case 'marrybell':v.forcedOffensive=true;break;
      case 'norland':v.expOverwatch=true;break;
      case 'sakuya':v.expDisabledNext=true;break;
      case 'shalio':u.expGambit=true;break;
      case 'shamna':v.expForeknowledge=true;break;
      case 'charles':v.feintCD=Math.max(0,(v.feintCD||0)-2);break;
      case 'lloyd':v.expCalibration=true;break;
      case 'sophie':{
        const w=nearby(w=>w.id!==v.id&&dist(g,u,w)<=2&&dist(g,v,w)<=2);
        if(!w)return {ok:false,reason:'Need two friendly formations within 2 hexes.'};
        v.expLink={partner:w.id};w.expLink={partner:v.id};break;
      }
      case 'sarah':v.expJammedNext=true;break;
      case 'olivia':{
        const w=nearby(w=>w.id!==v.id&&!isShip(w)&&!isShip(v)&&!atSea(g,w)&&!atSea(g,v)&&dist(g,w,v)===1&&dist(g,u,w)<=2);
        if(!w)return {ok:false,reason:'Need two adjacent friendly land units.'};
        const p={c:v.c,r:v.r},q={c:w.c,r:w.r};
        v.c=q.c;v.r=q.r;w.c=p.c;w.r=p.r;reindex(g,v,p);reindex(g,w,q);break;
      }
      case 'margaret':{
        const cost=reinforceCost(v.type,g,v.side,v),bank=funds(g,v.side);
        if(v.stack>=3||shortfall(bank,cost))return {ok:false,reason:'Cannot afford this reinforcement.'};
        const old=maxHP(v);spend(bank,cost);v.stack++;v.hp+=maxHP(v)-old;break;
      }
      case 'chloe':v.hp=Math.min(maxHP(v),v.hp+Math.round(maxHP(v)*.2));break;
      case 'tianzi':{
        const city=g.stations.filter(s=>s.owner===u.side&&dist(g,u,s)<=3).sort((a,b)=>dist(g,u,a)-dist(g,u,b))[0];
        if(!city)return {ok:false,reason:'No friendly city in range.'};city.expDecree=true;break;
      }
      case 'chengzhong':{
        const city=g.stations.filter(s=>foe(g,s.owner,u.side)&&dist(g,u,s)<=2).sort((a,b)=>dist(g,u,a)-dist(g,u,b))[0];
        if(!city)return {ok:false,reason:'No enemy city in range.'};city.expSupplyBlocked={owner:city.owner};break;
      }
      case 'diethard':addTargetMark(v,{side:u.side,source:u.id,damage:.2,uses:1});break;
      case 'kinoshita':v.expBreach=true;break;
      case 'savitri':v.expRetrofit=true;break;
      case 'mutsuki':v.expNavalRelay=true;break;
      case 'ichijiku':v.expRadar={side:u.side};break;
      case 'indira':v.expPinnedNext=true;break;
      default:return {ok:false,reason:'Unknown approved signature action.'};
    }
    u.feintCD=COMMANDERS[u.cmd].action.cooldown||3;
    log(g,COMMANDERS[u.cmd].short+' uses '+COMMANDERS[u.cmd].skill+'.',u.side);
    return {ok:true,target:v.id,affected:1};
  }
  function newcomerAttack(g,u,target,counter){
    const f=fx(u),terrain=tile(g,u.c,u.r);let m=1;
    if(!counter&&f.dashStrike&&u.movedDistance>=3&&u.expDashTurn!==g.turn)m*=1.3;
    if(!counter&&f.deepCover&&target?.cmd&&u.expDeepTurn!==g.turn&&
      !g.units.some(v=>v.hp>0&&v.side===u.side&&v.id!==u.id&&dist(g,u,v)<=2))m*=1.35;
    if(counter&&f.phoenixReversal&&target?.cmd&&u.expPhoenixTurn!==g.turn)m*=1.4;
    if(!counter&&f.highland&&terrain?.terrain==='mountain'&&u.expHighlandTurn!==g.turn)m*=1.25;
    if(!counter&&f.beachhead&&target&&(g.turn-(u.expLandedTurn??-999))<=1&&tile(g,target.c,target.r)?.terrain==='coast')m*=1.25;
    if(!counter&&f.decapitation&&target?.cmd&&!(u.expDecapitationCd>0)&&
      !g.units.some(v=>v.hp>0&&v.side===target.side&&v.id!==target.id&&dist(g,v,target)===1))m*=1.25;
    if(!counter&&u.expRetrofitStrike)m*=1.1;
    if(!counter&&g.units.some(v=>v.hp>0&&v.side===u.side&&v.id!==u.id&&fx(v).expendable&&dist(g,v,u)===1))m*=1.25;
    return m;
  }
  function newcomerDefense(g,target,attacker,counter,direct){
    let m=1;
    if(g.units.some(v=>v.hp>0&&v.side===target.side&&v.id!==target.id&&fx(v).expendable&&dist(g,v,target)===1))m*=1.15;
    if(fx(target).beachhead&&(g.turn-(target.expLandedTurn??-999))<=1&&tile(g,target.c,target.r)?.terrain==='coast')m*=.8;
    if(fx(target).afterimage&&target.expAfterimage&&direct&&!counter)m*=.65;
    if(rangeOf(g,attacker).max>1&&g.units.some(v=>v.hp>0&&v.side===target.side&&fx(v).rangeShield&&dist(g,v,target)<=2))m*=.85;
    if(target.forcedOffensive&&counter)m*=1.2;
    return m;
  }
  function newcomerIntercept(g,target,amount){
    if(target.expForeknowledge&&amount>=target.hp){delete target.expForeknowledge;amount=Math.max(0,target.hp-1);}
    const guard=g.units.find(v=>v.hp>1&&v.side===target.side&&v.id!==target.id&&fx(v).guardianIntercept&&v.expGuardTurn!==g.turn&&dist(g,v,target)===1);
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
    if(!attacker)return;
    for(const u of g.units)if(u.hp>0&&u.side===attacker.side&&fx(u).salvage&&u.expSalvageTurn!==g.turn&&dist(g,u,v)<=2){
      funds(g,u.side).industry+=Math.min(15,Math.round(price(v.type,v.stack,g,v.side).industry*.1));
      u.expSalvageTurn=g.turn;break;
    }
  }

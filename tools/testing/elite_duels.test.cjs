#!/usr/bin/env node
'use strict';
// Deterministic head-to-head audit against a neutral ordinary three-stack Super-Heavy.
// No commanders, research, city defenses, terrain cover, auto-heal or reinforcements.
// Models both initiative orders; uses the ACTUAL engine's attack and counter routines.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../dist/engine.js');
const SEEDS = Number(process.env.ELITE_DUEL_SEEDS || 128);
const HP_FLOOR = 0.5;
const g = E.createGame('britannia','normal','conquest',20261019,'world');
g.cols=7;g.rows=7;g.wrap=false;
g.tiles=Array.from({length:49},(_,i)=>({c:i%7,r:Math.floor(i/7),terrain:'plains',owner:null}));
g.stations=[];g.tech.britannia={};g.tech.eu={};
g.automation={enabled:false};g.warReport=null;
const entries=Object.entries(E.ELITE_FORCES).filter(([_,e])=>!e.scenarioOnly);
function duel(id,type,seed,enemyFirst) {
  g.units=[]; g.over=null;g.phase='britannia';g.turn=1;g.nextId=1;g.seed=seed>>>0;
  // Adjacent for melee (including marines); distance 2 for pure ranged artillery.
  const tt=E.TYPES[type];
  const d=tt.min===2?2:1;
  const att=E.newUnit(g,type,'britannia',2,3,1);
  const def=E.newUnit(g,'brighton','eu',2+d,3,3);
  att.eliteLevel=5;att.hp=E.maxHP(att);
  def.hp=E.maxHP(def);
  att.morale=0; def.morale=0;att.xp=0;def.xp=0;
  assert.equal(att.stack,1);
  assert.equal(def.stack,3);
  const fullHp=att.hp;
  for(let round=1;round<=60;round++) {
    g.turn=round;
    att.attacked=false;att.moved=false;def.attacked=false;def.moved=false;
    const order=enemyFirst?[[def,att,'eu'],[att,def,'britannia']]:[[att,def,'britannia'],[def,att,'eu']];
    for(const [active,target,side] of order) {
      if(active.hp<=0||target.hp<=0)break;
      if(active.expDisabledNext) {delete active.expDisabledNext;continue;}
      if(active.attacked) continue;
      g.phase=side;
      const res=E.attack(g,active.id,target.c,target.r);
      assert.ok(res.ok, id+' '+side+' turn '+round+': '+JSON.stringify(res));
    }
    if(att.hp<=0||def.hp<=0)
      return {won:def.hp<=0&&att.hp>0,remaining:Math.max(0,att.hp)/fullHp,round};
  }
  return {won:false,remaining:att.hp/fullHp,round:60};
}
test('elite L5 full-engine duel benchmark (informational until tuning is approved)',()=>{
  const results=[];
  for(const [id,e] of entries) {
    const typ=E.TYPES[e.type];let wins=0,total=0,low=1,worst=1,rounds=0;
    for(const first of [false,true])for(let s=1;s<=SEEDS;s++){
      const d=duel(id,e.type,(((s*2654435761)>>>0)^(first?0xcab005e:0xa19e9a))>>>0,first);
      total++;wins+=d.won?1:0;rounds+=d.round;
      worst=Math.min(worst,d.remaining);
      if(d.won)low=Math.min(low,d.remaining);
    }
    results.push({name:id,cls:typ.naval==='amphibious'?'amphibious':typ.cls,attack:typ.attack,hp:typ.hp,crit:typ.crit,winPct:(100*wins/total).toFixed(1),minHpPct:(100*worst).toFixed(1),rounds:(rounds/total).toFixed(1),pass:(wins===total&&worst>=HP_FLOOR)});
  }
  console.log('ELITE_DUEL_REPORT '+JSON.stringify({seedsPerInitiative:SEEDS,n:results.length,results}));
  assert.equal(results.length,entries.length);
});

test('calibration search: conservative class attack changes and targeted level-5 defense',()=>{
 const attackProposal={raider:155,medium:160,heavy:165,super:175,rocket:140,siege:135,amphibious:145};
 const original={};
 for(const [id,e] of entries){
   const t=E.TYPES[e.type],cls=t.naval==='amphibious'?'amphibious':t.cls;
   original[id]=t.attack;
   t.attack=attackProposal[cls]??t.attack;
 }
 function stats(id,e,trialSeeds=72){
  let win=0,lowest=1;for(const first of [false,true])for(let s=1;s<=trialSeeds;s++){
    const d=duel(id,e.type,(((s*2654435761)>>>0)^(first?0xcab005e:0xa19e9a))>>>0,first);
    win+=d.won?1:0; lowest=Math.min(lowest,d.remaining);
  }return {winPct:100*win/(trialSeeds*2),minHpPct:100*lowest};
 }
 const proposed=[];
 for(const [id,e] of entries) {
   const t=E.TYPES[e.type],cls=t.naval==='amphibious'?'amphibious':t.cls;
   const saved={...e.lv5},pre=stats(id,e);
   let best=null,st=pre;
   if(pre.winPct<100||pre.minHpPct<52){
    const originalTaken=e.lv5?.taken??1;
    for(let n=1;n<=16;n++){
      const taken=Number(Math.max(.20,originalTaken-n*.05).toFixed(2));
      e.lv5={...saved,taken};
      st=stats(id,e);
      if(st.winPct===100 && st.minHpPct>=52) {best=taken;break;}
    }
   }
   proposed.push({id,cls,oldAttack:original[id],newAttack:t.attack,takenBefore:saved.taken??1,takenAfter:best??(saved.taken??1),baselineCandidate:pre,final:st,pass:st.winPct===100&&st.minHpPct>=50});
   e.lv5=saved;
 }
 console.log('ELITE_CALIBRATION_REPORT '+JSON.stringify({attackProposal,proposed}));
 for(const [id,e] of entries)E.TYPES[e.type].attack=original[id];
});
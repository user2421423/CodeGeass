#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../dist/engine.js');
const CP = require('../dist/campaign.js');
const camp = CP.CAMPAIGNS.cf_ufn;
assert.equal(camp.missions.length, 12);
assert.equal(CP.CAMPAIGNS.cf_r2.missions.length, 10, 'original revolution remains intact');
assert.equal(camp.season, 4, 'separate selectable story arc');
assert.equal(CP.campaignElite('cf_ufn'), 'shen_hu');
assert.equal(new Set(camp.missions.map(m => JSON.stringify(m.map))).size, 12, 'distinct chapter maps');
assert.deepEqual(CP.milestoneStatus({}, 'cf_ufn').map(m => m.stars), [18,27,36]);
const profile = { campaign: {} };
for (const [i,m] of camp.missions.entries()) {
  assert.equal(CP.unlocked(profile,m.id),true);
  assert.equal(CP.next(m.id),camp.missions[i+1]?.id || null);
  profile.campaign[m.id]=1;
}
const make=(id,mode='normal')=>CP.createMission(id,417,mode);
const all=g=>g.units.flatMap(u=>[u,...(u.cargo||[])]);
const conditions=m=>Array.isArray(m.win)?m.win:[m.win];
function fulfill(g,m) {
  for(const c of conditions(m)) {
    for(const name of c.capture||[])g.stations.find(s=>s.name===name).owner=g.player;
    if(c.hold)g.turn=Math.max(g.turn,c.hold+1);
    if(c.turn)g.turn=Math.max(g.turn,c.turn);
    for(const name of c.reach||[]) {
      const target=g.stations.find(s=>s.name===name),u=all(g).find(u=>u.side===g.player&&(!c.by||u.cmd===c.by));
      assert.ok(target&&u);u.c=target.c;u.r=target.r;
    }
  }
}
for(const m of camp.missions) for(const mode of Object.keys(CP.DIFFICULTIES)) {
  const g=make(m.id,mode);
  assert.equal(g.player,'cf'); assert.equal(E.hooks.decide(g),null);
  assert.ok(g.economy.cf.industry>0);
  assert.equal(m.stars.length,2);
  const seen=new Set();
  for(const u of g.units) {
    const p=E.tile(g,u.c,u.r),k=E.key(u);
    assert.ok(p&&!E.TERRAIN[p.terrain].blocked&&!seen.has(k),m.id+'/'+mode+': deployment');seen.add(k);
    assert.equal(E.isSea(p),E.TYPES[u.type].naval==='ship');
  }
  for(const u of all(g)) {
    assert.ok(E.TYPES[u.type]&&u.hp>0);
    assert.equal(u.side==='cf'&&!!u.elite ? E.eliteEligible(g,'cf',u.elite):true,true);
    if(mode==='normal')assert.ok(!u.elite&&u.stack<=3,'Normal has ordinary formations');
    if(mode==='elite'&&E.TYPES[u.type].naval!=='ship')assert.ok(u.elite&&u.stack===1);
  }
  const saved=JSON.parse(JSON.stringify(g));CP.normalizeUnits(saved);
  assert.deepEqual(all(saved).map(u=>[u.id,u.type,u.hp,u.eliteLevel]),all(g).map(u=>[u.id,u.type,u.hp,u.eliteLevel]));
  fulfill(g,m);
  const outcome=E.hooks.decide(g);assert.equal(outcome?.winner,'cf',m.id+'/'+mode+': satisfiable objectives');
  g.over.stars=2;assert.equal(CP.reward(g,{}).fragmentChoice,0);
  g.over.stars=3;assert.equal(CP.reward(g,{}).fragmentChoice,10);
  assert.equal(CP.reward(g,{campaign:{[m.id]:3},campaignDifficulty:{[m.id]:{[mode]:3}}}).fragmentChoice,0);
  const late=make(m.id,mode);fulfill(late,m);late.turn=late.campaign.turnLimit+1;
  assert.notEqual(E.hooks.decide(late)?.winner,'cf',m.id+': deadline cannot be bypassed');
  const dead=make(m.id,mode);dead.campaign.killed.push('xingke');
  assert.notEqual(E.hooks.decide(dead)?.winner,'cf','Xingke loss fails');
}
// Every chapter's reward box offers the same faction and rarity rules as the original campaign.
const rewardProfile={elites:{},pendingEliteRewards:[],claimedEliteChoices:{}};
const ctx={E,loadProfile:()=>rewardProfile,saveProfile:()=>true,esc:String};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require.resolve('../dist/ui/turns.js'),'utf8'),ctx);
const api=vm.runInContext('({queueEliteReward,eligibleEliteRewardOptions})',ctx);
for(const m of camp.missions)for(const [mode,rarity]of Object.entries({normal:'Rare',hard:'Epic',challenge:'Legendary',elite:'Any'})){
 const key='story:'+m.id+':'+mode;
 assert.equal(api.queueEliteReward(rewardProfile,{player:'cf',difficulty:mode},key,10,'Story 3★'),true);
 const box=rewardProfile.pendingEliteRewards.find(r=>r.key===key);
 assert.equal(box.side,'cf');assert.equal(box.amount,10);assert.equal(box.rarity,rarity);
 const options=Array.from(api.eligibleEliteRewardOptions(box,rewardProfile));assert.ok(options.length);
 assert.ok(options.every(id=>E.ELITE_FORCES[id].availableTo.includes('cf')&&(rarity==='Any'||E.ELITE_FORCES[id].rarity===rarity)));
 assert.equal(api.queueEliteReward(rewardProfile,{player:'cf',difficulty:mode},key,10,'Story 3★'),false);
}
// Scripted arrivals, departure and hazards stay idempotent across reloads.
for(const id of ['ufn4','ufn7','ufn10']){
 const g=make(id);g.turn=4;E.hooks.turn(g,g.player);
 const fired=g.campaign.fired.length;
 if(id==='ufn4')assert.ok(!all(g).some(u=>u.cmd==='luciano'&&u.hp>0));
 if(id==='ufn7')assert.equal(g.campaign.fx.filter(f=>f.name==='Fuji eruption').length,1);
 if(id==='ufn10')assert.ok(!all(g).some(u=>u.cmd==='suzaku'&&u.hp>0));
 const saved=JSON.parse(JSON.stringify(g));CP.normalizeUnits(saved);E.hooks.turn(saved,saved.player);
 assert.equal(saved.campaign.fired.length,fired);
 assert.equal(saved.campaign.fx.length,g.campaign.fx.length);
}
const landing=make('ufn1'),ship=landing.units.find(u=>u.cargo?.length);
assert.equal(ship.type,'cf_carrier','scripted Federation carrier must remain a warship');
const destination=[...E.reachable(landing,ship).keys()].map(k=>{const[c,r]=k.split(',').map(Number);return E.tile(landing,c,r);})
 .find(t=>E.internal.deployTargetsAt(landing,t,ship.side,true).length);
assert.ok(destination);assert.equal(E.move(landing,ship.id,destination.c,destination.r).ok,true);
const beach=E.deployTargets(landing,ship,0)[0];assert.equal(E.deploy(landing,ship.id,0,beach.c,beach.r).ok,true);
assert.match(CP.mission('ufn12').victory,/already released/);
assert.ok(!camp.missions.some(m=>JSON.stringify(m.win).includes('lelouch')),'no fictional victory over Lelouch');
console.log('Xingke UFN Story: PASS (12 chapters x 4 difficulties; maps, objectives, progression, saves, carriers and standard Federation rewards)');

// Optional reproducible Normal feasibility trials. The player uses the same
// tactical AI as the opponents, plus explicit legal movement to named reach goals.
if(process.argv.includes('--playout')){
 require('../dist/engine/ai.js');
 let failures=0;
 for(const m of camp.missions){
  let wins=0;
  for(const seed of [11,43,79]){
   const g=CP.createMission(m.id,seed,'normal');let attacks=0,landings=0;
   const reach=conditions(m).find(c=>c.reach);
   const target=reach&&g.stations.find(s=>s.name===reach.reach[0]);
   for(let turn=1;turn<=g.campaign.turnLimit+1&&!g.over;turn++){
    g.turn=turn;
    for(let i=0;i<g.order.length&&!g.over;i++){
     const side=g.order[i];if(!(turn===1&&i===0))E.beginTurn(g,side,turn>1);
     if(g.over)break;E.aiProduction(g);if(g.over)break;
     if(target){
      const blocker=E.unitAt(g,target);
      if(blocker?.side===side&&blocker.cmd!==reach.by){
       const spare=[...E.reachable(g,blocker).keys()].map(k=>{const[c,r]=k.split(',').map(Number);return E.tile(g,c,r);}).find(t=>!E.isSea(t)&&!E.stationAt(g,t));
       if(spare)E.move(g,blocker.id,spare.c,spare.r);
      }
     }
     const units=g.units.filter(u=>u.hp>0&&u.side===side).sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id);
     for(const u of units){
      if(g.over||u.hp<=0)continue;
      if(target&&side===g.player&&u.cmd===reach.by){
       const field=E.internal.goalField(g,side,[[target,0]],'land');
       const value=p=>field[p.r*g.cols+p.c];
       const choices=[...E.reachable(g,u).keys()].map(k=>{const[c,r]=k.split(',').map(Number);return E.tile(g,c,r);})
        .filter(t=>!E.isSea(t)).sort((a,b)=>value(a)-value(b));
       if(choices[0]&&value(choices[0])<value(u))E.move(g,u.id,choices[0].c,choices[0].r);
       E.hooks.decide(g);if(g.over)break;
      }
      for(const e of E.aiOrder(g,u.id)||[]){if(e.kind==='attack')attacks++;if(e.kind==='deploy')landings++;}
      E.hooks.decide(g);
     }
    }
    E.hooks.decide(g);
   }
   const win=g.over?.winner===g.player;if(win)wins++;
   console.log(m.id+' seed '+seed+': '+(win?'victory':'loss')+' T'+g.turn+', '+attacks+' attacks, '+landings+' landings; '+g.over?.reason);
  }
  if(!wins)failures++;
 }
 assert.equal(failures,0,'Every new Normal chapter must be demonstrably completable in these objective-guided trials');
}

#!/usr/bin/env node
'use strict';
// Full-engine checks for the six approved European Story additions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../dist/engine.js');
const CP = require('../dist/campaign.js');
const ids = ['eb_el_alamein', 'eb_italy', 'eu_lakeside_rescue', 'eu_apollo', 'eb_hold_petersburg', 'eu_white_death'];
const modes = Object.keys(CP.DIFFICULTIES);
const make = (id, mode = 'normal') => CP.createMission(id, 20261019, mode);
const city = (g, name) => g.stations.find(s => s.name === name);
const allUnits = g => g.units.flatMap(u => [u, ...(u.cargo || [])]);

for (const cid of ['eb_europe', 'eu_europe']) {
  const camp = CP.CAMPAIGNS[cid];
  assert.equal(camp.missions.length, 11, cid + ' has eleven missions');
  assert.equal(new Set(camp.missions.map(m => m.id)).size, 11);
  assert.deepEqual(CP.milestoneStatus({}, cid).map(m => m.stars), [17, 25, 33]);
  const profile = { campaign: {} };
  for (const [index, m] of camp.missions.entries()) {
    assert.equal(m.index, index);
    assert.equal(CP.unlocked(profile, m.id), true, m.id + ' unlocks sequentially');
    profile.campaign[m.id] = 1;
    assert.equal(CP.next(m.id), camp.missions[index + 1]?.id || null);
  }
}
assert.equal(CP.next('eu_weisswolf'), 'eu_lakeside_rescue');
assert.equal(CP.next('eu_lakeside_rescue'), 'eu_apollo');
assert.equal(CP.next('eu_apollo'), 'eu_assault');
assert.equal(CP.next('eb_assault'), 'eb_italy');
assert.equal(CP.next('eb_el_alamein'), 'eb_hold_petersburg');
assert.equal(CP.next('eb_hold_petersburg'), 'eb_narva');
assert.equal(CP.next('eu_paris'), 'eu_white_death');
assert.equal(CP.next('eu_white_death'), null);
assert.equal(CP.mission('eb_retake_slonim'), null, 'only the final two selections are added');
assert.equal(CP.unlocked({ campaign: { eb_narva: 3 } }, 'eb_narva'), true,
  'inserting a prologue must not lock a previously completed mission');

for (const id of ids) for (const mode of modes) {
  const g = make(id, mode), m = CP.mission(id);
  assert.equal(E.hooks.decide(g), null, id + '/' + mode + ' does not start won/lost');
  assert.ok(g.economy[g.player].industry > 0);
  assert.equal(m.stars.length, 2, 'victory plus two mastery stars');
  const seen = new Set();
  for (const u of g.units) {
    assert.ok(u.hp > 0 && E.TYPES[u.type]);
    const t = E.tile(g, u.c, u.r), k = u.c + ',' + u.r;
    assert.ok(t && !E.TERRAIN[t.terrain].blocked);
    assert.equal(E.isSea(t), E.TYPES[u.type].naval === 'ship', id + ': legal deployment');
    assert.ok(!seen.has(k), id + ': units may not overlap');
    seen.add(k);
    for (const passenger of u.cargo || []) {
      assert.equal(passenger.side, u.side);
      assert.equal(passenger.c, u.c); assert.equal(passenger.r, u.r);
      assert.ok(!E.TYPES[passenger.type].naval);
      assert.ok(!g.units.includes(passenger), 'cargo is off the battlefield');
    }
  }
  const fighters = allUnits(g).filter(u => E.TYPES[u.type].naval !== 'ship');
  if (mode === 'normal') assert.ok(fighters.every(u => !u.elite && u.stack <= 3));
  if (mode === 'elite') assert.ok(fighters.every(u => u.elite && u.stack === 1));
  const saved = JSON.parse(JSON.stringify(g));
  CP.normalizeUnits(saved);
  assert.deepEqual(allUnits(saved).map(u => [u.id, u.type, u.hp, u.eliteLevel]),
    allUnits(g).map(u => [u.id, u.type, u.hp, u.eliteLevel]), 'save/load preserves ships and cargo');
  g.over = { winner: g.player, stars: 2 };
  assert.equal(CP.reward(g, {}).fragmentChoice, 0);
  g.over.stars = 3;
  assert.equal(CP.reward(g, {}).fragmentChoice, 10);
  const paid = { campaign: { [id]: 3 }, campaignDifficulty: { [id]: { [mode]: 3 } } };
  assert.equal(CP.reward(g, paid).fragmentChoice, 0, 'no repeated mastery loot');
  g.over = null;
  g.turn = g.campaign.turnLimit + 1;
  assert.notEqual(E.hooks.decide(g).winner, g.player, 'deadline really fails');
}

// Carriers sail and launch through the same legal action API used in the UI.
for (const mode of modes) {
  const g = make('eb_italy', mode);
  const flagship = g.units.find(u => u.cmd === 'schneizel');
  assert.equal(E.TYPES[flagship.type].naval, 'ship');
  const ship = g.units.find(u => u.cargo?.length && u.cmd !== 'schneizel');
  const destination = [...E.reachable(g, ship).keys()].map(k => {
    const [c, r] = k.split(',').map(Number); return E.tile(g, c, r);
  }).find(t => E.internal.deployTargetsAt(g, t, ship.side, true).length > 0);
  assert.ok(destination, 'an opening landing route exists');
  assert.equal(E.move(g, ship.id, destination.c, destination.r).ok, true);
  const beach = E.deployTargets(g, ship, 0)[0];
  const result = E.deploy(g, ship.id, 0, beach.c, beach.r);
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.unit.moved, false, 'landing formation retains its movement');
  assert.equal(result.unit.attacked, false, 'landing formation retains its attack');
  g.turn = 4; E.hooks.turn(g, g.player);
  assert.ok(allUnits(g).some(u => u.cmd === 'suzaku'), 'Suzaku arrives aboard a second wave');
  assert.ok(CP.holds(g, { alive: ['suzaku'] }), 'embarked commanders count as alive');
  const post = city(g, 'Coastal Command Post'); post.owner = g.player;
  assert.equal(E.hooks.decide(g).winner, g.player);
  const failure = make('eb_italy', mode);
  const sunk = failure.units.find(u => u.cmd === 'schneizel'); sunk.hp = 0;
  E.kill(failure, sunk, null, true);
  assert.notEqual(E.hooks.decide(failure).winner, failure.player, 'flagship destruction fails');
}

// The rescue is two-stage, event-driven, and survives saves without duplicating Leila.
for (const mode of modes) {
  const g = make('eu_lakeside_rescue', mode);
  assert.ok(!allUnits(g).some(u => u.cmd === 'leila'));
  const meeting = city(g, 'Lakeside Meeting'), rescuer = g.units.find(u => u.cmd === 'akito');
  meeting.owner = g.player;
  E.hooks.capture(g, meeting, rescuer, 'eb');
  assert.equal(E.hooks.decide(g), null, 'rescuing Leila alone is not victory');
  const saved = JSON.parse(JSON.stringify(g)); CP.normalizeUnits(saved);
  E.hooks.capture(saved, city(saved, 'Lakeside Meeting'), saved.units.find(u => u.cmd === 'akito'), 'eb');
  assert.equal(allUnits(saved).filter(u => u.cmd === 'leila').length, 1);
  const leila = saved.units.find(u => u.cmd === 'leila'), jetty = city(saved, 'Evacuation Jetty');
  // Check passable spatial access independently of combat and turn tactics.
  const queue = [E.tile(saved, leila.c, leila.r)], seen = new Set(queue.map(E.key));
  for (let i = 0; i < queue.length; i++) for (const t of E.adjacent(saved, queue[i]))
    if (!E.isSea(t) && !E.TERRAIN[t.terrain].blocked && !seen.has(E.key(t))) {
      seen.add(E.key(t)); queue.push(t);
    }
  assert.ok(seen.has(E.key(jetty)), 'rescued Leila has a land path to the boat');
  Object.assign(leila, { c: jetty.c, r: jetty.r });
  assert.equal(E.hooks.decide(saved).winner, saved.player);
  const failed = make('eu_lakeside_rescue', mode);
  failed.campaign.killed.push('leila');
  assert.notEqual(E.hooks.decide(failed).winner, failed.player);
}

// A generic capture cannot replace Ayano's personal arrival at the controls.
for (const mode of modes) {
  const g = make('eu_apollo', mode), control = city(g, 'Apollo’s Chariot Launch Control');
  control.owner = g.player;
  assert.equal(E.hooks.decide(g), null);
  Object.assign(g.units.find(u => u.cmd === 'ayano'), { c: control.c, r: control.r });
  assert.equal(E.hooks.decide(g).winner, g.player);
  const late = make('eu_apollo', mode); city(late, control.name).owner = late.player;
  Object.assign(late.units.find(u => u.cmd === 'ayano'), { c: control.c, r: control.r });
  late.turn = 13;
  assert.notEqual(E.hooks.decide(late).winner, late.player, 'late arrival cannot undo the launch deadline');
}
const defense = make('eb_el_alamein');
city(defense, 'E.U. Artillery Position').owner = defense.player;
assert.equal(E.hooks.decide(defense), null, 'early capture does not bypass the defensive phase');
defense.turn = 9;
assert.equal(E.hooks.decide(defense).winner, defense.player);

// Both new missions enforce their defensive phase, mandatory objective and
// commander/route protection independently on every difficulty.
for (const mode of modes) {
  const g = make('eb_hold_petersburg', mode);
  city(g, 'Narva Withdrawal Junction').owner = g.player;
  assert.equal(E.hooks.decide(g), null, 'early counterattack cannot skip city defense');
  g.turn = 9;
  assert.equal(E.hooks.decide(g)?.winner, g.player);
  assert.equal(g.over.stars, 3, 'both mastery objectives are satisfiable');
  const stalled = make('eb_hold_petersburg', mode); stalled.turn = 9;
  assert.equal(E.hooks.decide(stalled), null, 'holding alone cannot skip the junction');
  for (const id of ['eb_hold_petersburg', 'eu_white_death']) {
    const m = CP.mission(id), failed = make(id, mode);
    failed.campaign.killed.push(m.lose.cmd[0]);
    assert.notEqual(E.hooks.decide(failed)?.winner, failed.player);
    const lost = make(id, mode); lost.campaign.lostCities.push(m.lose.cities[0]);
    assert.notEqual(E.hooks.decide(lost)?.winner, lost.player);
  }
  const eu = make('eu_white_death', mode), exit = city(eu, 'Evacuation Route');
  Object.assign(eu.units.find(u => u.cmd === 'oscar'), { c: exit.c, r: exit.r });
  assert.equal(E.hooks.decide(eu), null, 'early arrival must still cover the withdrawal');
  eu.turn = 4; E.hooks.turn(eu, eu.player);
  assert.equal(allUnits(eu).filter(u => u.cmd === 'suzaku').length, 1);
  const saved = JSON.parse(JSON.stringify(eu)); CP.normalizeUnits(saved);
  E.hooks.turn(saved, saved.player);
  assert.equal(allUnits(saved).filter(u => u.cmd === 'suzaku').length, 1, 'arrival is not duplicated after load');
  const suzaku = saved.units.find(u => u.cmd === 'suzaku');
  assert.ok(suzaku.hp > 0 && (mode !== 'normal' || !suzaku.elite));
  const seen = new Set();
  for (const u of saved.units) {
    assert.ok(!seen.has(E.key(u)), 'scripted arrival has a free deployment hex'); seen.add(E.key(u));
    assert.equal(E.isSea(E.tile(saved, u.c, u.r)), E.TYPES[u.type].naval === 'ship');
  }
  saved.turn = 7;
  assert.equal(E.hooks.decide(saved)?.winner, saved.player, 'evacuation succeeds with Suzaku still alive');
  assert.equal(saved.over.stars, 3);
  const missing = make('eu_white_death', mode); missing.turn = 7;
  assert.equal(E.hooks.decide(missing), null, 'Oscar must personally reach the route');
}

// Use the real reward-box UI functions to verify both missions pay E.U.
// fragments, including the Euro Britannian chapter, at the standard rarities.
const rewardProfile = { elites: {}, pendingEliteRewards: [], claimedEliteChoices: {} };
const ctx = { E, loadProfile: () => rewardProfile, saveProfile: () => true, esc: String };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require.resolve('../dist/ui/turns.js'), 'utf8'), ctx);
const rewardAPI = vm.runInContext('({queueEliteReward, eligibleEliteRewardOptions})', ctx);
for (const id of ['eb_hold_petersburg', 'eu_white_death'])
 for (const [mode, rarity] of Object.entries({ normal: 'Rare', hard: 'Epic', challenge: 'Legendary', elite: 'Any' })) {
  const key = 'story:' + id + ':' + mode, g = make(id, mode);
  assert.equal(rewardAPI.queueEliteReward(rewardProfile, g, key, 10, 'Story 3★'), true);
  const box = rewardProfile.pendingEliteRewards.find(r => r.key === key);
  assert.equal(box.side, 'eu'); assert.equal(box.amount, 10); assert.equal(box.rarity, rarity);
  const options = Array.from(rewardAPI.eligibleEliteRewardOptions(box, rewardProfile));
  assert.ok(options.length && options.every(id => E.ELITE_FORCES[id].availableTo.includes('eu') &&
    (rarity === 'Any' || E.ELITE_FORCES[id].rarity === rarity)));
  assert.equal(rewardAPI.queueEliteReward(rewardProfile, g, key, 10, 'Story 3★'), false);
 }
console.log('Europe Story expansion: PASS (6 additions x 4 difficulties; eleven missions each, objectives, carriers, saves and E.U. rewards)');

// Optional deterministic gameplay trials: enemy tactical AI remains fully active.
// The player uses tactical AI plus explicit escort/control-room movement orders.
if (process.argv.includes('--playout')) {
 require('../dist/engine/ai.js');
for(const id of ids)for(const seed of [11,43,79]){
 const g=CP.createMission(id,seed,'normal');let attacks=0,landings=0;
 for(let turn=1;turn<=g.campaign.turnLimit+1&&!g.over;turn++){
  g.turn=turn;
  for(let i=0;i<g.order.length&&!g.over;i++){
   const side=g.order[i];if(!(turn===1&&i===0))E.beginTurn(g,side,turn>1);
   if(g.over)break;
   E.aiProduction(g);
   if(side===g.player&&id==='eu_white_death'){
    const target=city(g,'Evacuation Route'), blocker=E.unitAt(g,target);
    if(blocker?.side===side&&blocker.cmd!=='oscar'){
     const spare=[...E.reachable(g,blocker).keys()].map(k=>{const[c,r]=k.split(',').map(Number);return E.tile(g,c,r);})
      .find(t=>!E.isSea(t)&&!E.stationAt(g,t));
     if(spare)E.move(g,blocker.id,spare.c,spare.r);
    }
   }
   if(side===g.player&&id==='eu_apollo'){
    const control=g.stations.find(s=>s.name==='Apollo’s Chariot Launch Control');
    const blocker=E.unitAt(g,control);
    if(control.owner===g.player&&blocker&&blocker.cmd!=='ayano'){
     const spare=[...E.reachable(g,blocker).keys()].map(k=>{const[c,r]=k.split(',').map(Number);return E.tile(g,c,r);}).find(t=>!E.isSea(t)&&!E.stationAt(g,t));
     if(spare)E.move(g,blocker.id,spare.c,spare.r);
    }
   }
   const units=g.units.filter(u=>u.side===side&&u.hp>0).sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id);
   for(const u of units){if(g.over||u.hp<=0)continue;
    if(side===g.player&&u.cmd==='oscar'&&id==='eu_white_death'){
     const target=city(g,'Evacuation Route');
     const field=E.internal.goalField(g,side,[[target,0]],'land'),value=p=>field[p.r*g.cols+p.c];
     const choices=[...E.reachable(g,u).keys()].map(k=>{const[c,r]=k.split(',').map(Number);return E.tile(g,c,r);})
      .filter(t=>!E.isSea(t)).sort((a,b)=>value(a)-value(b));
     if(choices[0]&&value(choices[0])<value(u))E.move(g,u.id,choices[0].c,choices[0].r);
     E.hooks.decide(g);continue;
    }
    // A player-like escort order after Leila has been rescued; all combat uses real AI.
    if(side===g.player&&u.cmd==='leila'&&id==='eu_lakeside_rescue'){
     const target=g.stations.find(s=>s.name==='Evacuation Jetty');
     const choices=[...E.reachable(g,u).keys()].map(k=>{const[c,r]=k.split(',').map(Number);return E.tile(g,c,r);}).sort((a,b)=>E.distance(a,target,g)-E.distance(b,target,g));
     if(choices[0]&&E.distance(choices[0],target,g)<E.distance(u,target,g))E.move(g,u.id,choices[0].c,choices[0].r);
     E.hooks.decide(g);if(g.over)break;
    }
    if(side===g.player&&u.cmd==='ayano'&&id==='eu_apollo'&&g.stations.find(s=>s.name==='Apollo’s Chariot Launch Control').owner===g.player){
     const target=g.stations.find(s=>s.name==='Apollo’s Chariot Launch Control');
     const choices=[...E.reachable(g,u).keys()].map(k=>{const[c,r]=k.split(',').map(Number);return E.tile(g,c,r);}).sort((a,b)=>E.distance(a,target,g)-E.distance(b,target,g));
     if(choices[0])E.move(g,u.id,choices[0].c,choices[0].r);
     E.hooks.decide(g);if(g.over)break;
    }
    for(const ev of E.aiOrder(g,u.id)||[]){if(ev.kind==='attack')attacks++;if(ev.kind==='deploy')landings++;}
    E.hooks.decide(g);
   }
  }
  E.hooks.decide(g);
 }
 assert.equal(g.over?.winner, g.player, id + ' Normal objective-guided playout seed ' + seed);
 if(id==='eb_italy')assert.ok(landings>0, 'real carrier landings occurred');
 console.log(id+' seed '+seed+': victory T'+g.turn+', '+attacks+' attacks, '+landings+' landings');
}
}

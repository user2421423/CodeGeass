#!/usr/bin/env node
'use strict';
// Prove Story Mode no longer requires a mission-specific opt-in before AI can
// recruit regular (Normal/Hard/Challenge) or elite (Elite) formations.
// The substantial wallets in this isolated smoke test are test fixtures only:
// live Story difficulty resources, prices and income are unchanged.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/missions.js');
require('../dist/campaign.js');
const difficulties = ['normal', 'hard', 'challenge', 'elite'];
const ids = Object.values(E.campaign.CAMPAIGNS).flatMap(c => c.missions.map(m => m.id));
assert.equal(ids.length, 58, 'all registered Story missions remain available');

let candidates = 0, purchases = 0, ordinary = 0, elite = 0;
const groups = new Map();
for (const id of ids) {
 for (const difficulty of difficulties) {
  const g = E.campaign.createMission(id, 424242, difficulty);
  // Use every non-player side with a legal factory. Real allied and enemy
  // players take their own turns; a simulated player takes AI turns too.
  for (const side of g.order.filter(s => s !== 'neutral')) {
   const owned = g.stations.filter(s => s.owner === side);
   if (!owned.length) continue;
   candidates++;
   const before = g.units.filter(u => u.hp > 0 && u.side === side).length;
   const wallet = g.economy[side];
   const old = {...wallet};
   // Funding is only to establish eligibility in a deterministic smoke test;
   // no starting resources are changed in the actual missions.
   Object.assign(wallet,{credits:3000,industry:1500,science:500,sakuradite:900});
   // Clear one production hex to avoid a script garrison masking the
   // production test. This happens only to the isolated simulation object.
   const site = owned[0];
   g.units = g.units.filter(u => !(u.c === site.c && u.r === site.r));
   const clearBefore = g.units.filter(u => u.hp > 0 && u.side === side).length;
   const existing = new Set(g.units.map(u => u.id));
   g.phase = side;
   assert.doesNotThrow(() => E.aiProduction(g),id+'/'+difficulty+'/'+side);
   const recruited = g.units.filter(u => u.side === side && !existing.has(u.id));
   for(const u of recruited){
    assert.ok(E.TYPES[u.type],id+': built unknown type '+u.type);
    assert.equal(!!E.TYPES[u.type].elite,difficulty==='elite',
      id+'/'+difficulty+'/'+side+': wrong factory class');
    assert.equal(u.deployedTurn,g.turn,id+': unit must be unavailable immediately');
   }
   assert.ok(wallet.credits>=0 && wallet.industry>=0 && wallet.science>=0 && wallet.sakuradite>=0,
     id+'/'+difficulty+'/'+side+': purchased with an overdraft');
   assert.ok(g.units.filter(u => u.hp > 0 && u.side === side).length >= clearBefore,
     id+'/'+difficulty+'/'+side+': AI production unexpectedly killed its own forces');
   purchases+=recruited.length;
   if (recruited.length) {
    groups.set(difficulty,(groups.get(difficulty)||0)+1);
    if(difficulty==='elite')elite+=recruited.length;
    else ordinary+=recruited.length;
   }
   // Unfunded states cannot mint resources or free units.
   const dry = E.campaign.createMission(id, 9999, difficulty);
   if(!dry.stations.some(s=>s.owner===side))continue;
   Object.assign(dry.economy[side],{credits:0,industry:0,science:0,sakuradite:0});
   dry.phase=side;
   const dryIds=new Set(dry.units.map(u=>u.id));
   assert.doesNotThrow(()=>E.aiProduction(dry),id+'/'+difficulty+'/'+side+' (unfunded)');
   assert.equal(dry.units.filter(u=>!dryIds.has(u.id)).length,0,
     id+'/'+difficulty+'/'+side+': created free formations');
  }
 }
}
assert.ok(candidates>=200,'inspected all campaigns and multiple difficulties');
assert.ok(purchases>=50,'AI should buy formations in funded Story missions');
assert.ok(elite>0,'Elite Story AI must buy Elite Forces');
for(const difficulty of difficulties)assert.ok(groups.get(difficulty)>0,
 difficulty+': at least one Story factory should build successfully');
console.log('Story AI factory production: '+purchases+' recruits across '+candidates+
  ' side/difficulty factory trials; regular='+ordinary+' elite='+elite+
  '; producing trials by difficulty: '+JSON.stringify(Object.fromEntries(groups))+' PASS');

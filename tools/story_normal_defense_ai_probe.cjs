#!/usr/bin/env node
'use strict';
// Deterministic actual-turn AI-vs-AI playtest, not just static initial-condition checks.
// An automated defender is not a human-player benchmark; the result is an additional
// reproducible viability signal for a hold-out Story operation.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/missions.js');
require('../dist/campaign.js');
const id = 'br_tohdoh';
const seeds = [101, 202, 303, 404, 505, 606, 707, 808];
const m = E.campaign.CAMPAIGNS.britannia_s1.missions.find(m => m.id === id);
const baseUnits = m.units;
const baseEvents = m.events;
const B = 'britannia';
const extras3 = [
  [B, 'gloucester', 9, 5, 3, null, { normalOnly:true, hold:2 }],
  [B, 'gloucester', 10, 4, 3, null, { normalOnly:true, hold:2 }],
  [B, 'sutherland', 12, 7, 3, null, { normalOnly:true, hold:2 }],
];
const extras5 = [
  ...extras3,
  [B, 'gracchus', 14, 6, 2, null, { normalOnly:true, hold:2 }],
  [B, 'gloucester', 15, 7, 3, null, { normalOnly:true, hold:2 }],
];
const extras7 = [
  ...extras5,
  [B, 'sutherland', 9, 6, 3, null, { normalOnly:true, hold:2 }],
  [B, 'gloucester', 14, 4, 3, null, { normalOnly:true, hold:2 }],
];
const variants = [
  ['current', [], false],
  ['+3 strong defenders', extras3, false],
  ['+5 strong defenders', extras5, false],
  ['+7 strong defenders', extras7, false],
  ['+3 & nearby Lancelot', extras3, true],
  ['+5 & nearby Lancelot', extras5, true],
];
for (const [name, extras, nearbySuzaku] of variants) {
m.units = [...baseUnits, ...extras];
m.events = nearbySuzaku ? baseEvents.map(e => e.turn === 3 ? { ...e, spawn: [[B, 'elite_lancelot', 15, 6, 1, 'suzaku']] } : e) : baseEvents;
const results = [];
for (const seed of seeds) {
  const g = E.campaign.createMission(id, seed, 'normal');
  const initialPrison = g.stations.find(s => s.name === 'Chofu Detention Center');
  assert.equal(initialPrison.owner, 'britannia');
  for (let turn = 1; turn <= 12 && !g.over; turn++) {
    g.turn = turn;
    for (let order = 0; order < g.order.length && !g.over; order++) {
      const side = g.order[order];
      if (!E.alive(g, side)) continue;
      if (!(turn === 1 && order === 0)) E.beginTurn(g, side, turn > 1);
      if (g.over) break;
      E.aiProduction(g);
      if (g.over) break;
      const ids = g.units.filter(u => u.hp > 0 && u.side === side && !u.attacked)
        .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id)
        .map(u=>u.id);
      for (let i=0;i<ids.length && !g.over;i++) {
        const j=E.aiNextActor(g, ids, i);
        if (j>i && j<ids.length) [ids[i],ids[j]]=[ids[j],ids[i]];
        const u=g.units.find(v=>v.id===ids[i]);
        if (!u||u.hp<=0||u.side!==side) continue;
        E.aiOrder(g, u.id);
        E.hooks.decide(g);
      }
    }
    E.hooks.decide(g);
  }
  assert.ok(g.over && g.over.winner, id + ' did not resolve by its hold deadline');
  results.push({seed,winner:g.over.winner,turn:g.turn,
    prisonOwner:g.stations.find(s=>s.name==='Chofu Detention Center').owner,
    alive:g.units.filter(u=>u.hp>0&&u.side==='britannia').length});
}
const wins=results.filter(r=>r.winner==='britannia').length;
console.log('CHOFU VARIANT '+name+' => '+wins+' / '+results.length+' Britannia defender wins');
console.log(results.map(r=>r.winner+':T'+r.turn).join(' '));
}
m.units = baseUnits;
m.events = baseEvents;
console.log('Finished seeded Chofu balance comparison');

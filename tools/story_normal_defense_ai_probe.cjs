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
console.log('Chofu Detention Center, 8 seeded Normal full-AI games:');
for (const result of results) console.log(JSON.stringify(result));
console.log('Britannian defender AI victories: '+wins+' / '+results.length);
assert.ok(wins>=1, 'Britannia should be able to successfully defend the detention center in at least one seeded full-AI game');

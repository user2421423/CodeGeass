#!/usr/bin/env node
'use strict';
// Deterministic Story Mode self-play audit with the actual combat and tactical AI.
// Self-play losses are diagnostic and do not prove human unwinnability.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/missions.js');
require('../dist/campaign.js');

const CAMPAIGN_IDS = ['bk_r2', 'britannia_r2', 'cf_r2'];
const seeds = (process.env.STORY_BALANCE_SEEDS || '101,202,303')
  .split(',').map(s => Number(s.trim())).filter(Number.isFinite);
assert.ok(seeds.length > 0 && seeds.length <= 15, 'Provide 1–15 seeds');
const campaigns = CAMPAIGN_IDS.map(id => E.campaign.CAMPAIGNS[id]);
assert.deepEqual(campaigns.map(c => c.missions.length), [12, 12, 10],
  'Expect all 34 Season 2 Story Mode missions');

function simulate(id, seed) {
  const m = E.campaign.mission(id), g = E.campaign.createMission(id, seed, 'normal');
  const deadline = Math.min(25, (m.lose?.turns || m.win?.hold || 20) + 2);
  for (let turn = 1; turn <= deadline && !g.over; turn++) {
    g.turn = turn;
    for (let i = 0; i < g.order.length && !g.over; i++) {
      const side = g.order[i];
      if (!E.alive(g, side)) continue;
      if (!(turn === 1 && i === 0)) E.beginTurn(g, side, turn > 1);
      if (g.over) break;
      E.aiProduction(g);
      if (g.over) break;
      const ids = g.units.filter(u => u.hp > 0 && u.side === side && !u.attacked)
        .sort((a, b) => E.aiOrderPriority(g, a) - E.aiOrderPriority(g, b) || a.id - b.id)
        .map(u => u.id);
      for (let k = 0; k < ids.length && !g.over; k++) {
        const j = E.aiNextActor(g, ids, k);
        if (j > k && j < ids.length) [ids[k], ids[j]] = [ids[j], ids[k]];
        const u = g.units.find(v => v.id === ids[k]);
        if (!u || u.hp <= 0 || u.side !== side) continue;
        E.aiOrder(g, u.id);
        E.hooks.decide(g);
      }
    }
    E.hooks.decide(g);
  }
  return {
    seed, winner: g.over?.winner || null, turn: g.turn,
    reason: g.over?.reason || 'No decision before test limit',
    friendlySurvivors: g.units.filter(u => u.hp > 0 && u.side === g.player).length,
    enemySurvivors: g.units.filter(u => u.hp > 0 && E.foe(g, u.side, g.player)).length,
    remainingObjectives: g.stations.filter(s => E.foe(g, s.owner, g.player)).map(s => s.name)
  };
}
const results = [], failures = [];
for (const id of CAMPAIGN_IDS) {
  const camp = E.campaign.CAMPAIGNS[id];
  console.log('\n# ' + id);
  for (const m of camp.missions) {
    const trials = [];
    for (const seed of seeds) {
      try {
        trials.push(simulate(m.id, seed));
      } catch (e) {
        failures.push({ mission: m.id, seed, error: e.stack || String(e) });
        console.error('SIMULATION_EXCEPTION ' + m.id + ' seed=' + seed + ' ' + (e.stack || e));
      }
    }
    const wins = trials.filter(t => t.winner === m.player).length;
    const losses = trials.filter(t => t.winner && t.winner !== m.player).length;
    const undecided = trials.filter(t => !t.winner).length;
    console.log('R2_BALANCE ' + m.id + ' | friendly ' + wins + '/' + trials.length +
      ' | losses ' + losses + ' | undecided ' + undecided +
      ' | ' + trials.map(t => (t.winner || 'unresolved') + ':T' + t.turn).join(' '));
    results.push({ campaign: id, mission: m.id, title: m.title, wins, losses, undecided, trials });
  }
}
const summary = {
  seedCount: seeds.length, totalMissions: results.length,
  friendlyWins: results.reduce((n, r) => n + r.wins, 0),
  missionsWithAnyAIWin: results.filter(r => r.wins > 0).length,
  zeroAIWinMissions: results.filter(r => r.wins === 0).map(r => r.mission),
  errors: failures
};
console.log('R2_BALANCE_SUMMARY ' + JSON.stringify(summary));
console.log('R2_BALANCE_FULL_JSON ' + JSON.stringify(results));
if (failures.length) process.exitCode = 1;

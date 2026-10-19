#!/usr/bin/env node
'use strict';
// Deterministic Story Mode self-play audit with the actual combat and tactical AI.
// Self-play losses are diagnostic and do not prove human unwinnability.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/missions.js');
require('../dist/campaign.js');

const R2_IDS = ['bk_r2', 'britannia_r2', 'cf_r2'];
const CAMPAIGN_IDS = [...R2_IDS, 'bk_s1', 'britannia_s1', 'eb_europe', 'eu_europe', 'cf_ufn'];
const seeds = (process.env.STORY_BALANCE_SEEDS || '101,202,303')
  .split(',').map(s => Number(s.trim())).filter(Number.isFinite);
const focusSeeds = (process.env.STORY_BALANCE_FOCUS_SEEDS || '101,202,303,404,505,606,707,808,909,1001')
  .split(',').map(s => Number(s.trim())).filter(Number.isFinite);
const focus = new Set(['bk5','bk_rescue','bk_pacific','bk_yokosuka2','br7','br_execution',
  'br_yokosuka2','br_xiaopei','br_mausoleum','br10','br_kagoshima']);
assert.ok(seeds.length > 0 && seeds.length <= 15, 'Provide 1–15 seeds');
assert.ok(focusSeeds.length >= 10 && focusSeeds.length <= 30, 'Provide 10–30 focused seeds');
const campaigns = CAMPAIGN_IDS.map(id => E.campaign.CAMPAIGNS[id]);
assert.deepEqual(campaigns.map(c => c.missions.length), [12, 12, 10, 10, 10, 11, 11, 12],
  'Expect all 88 registered Story Mode missions');

function simulate(id, seed) {
  const m = E.campaign.mission(id), g = E.campaign.createMission(id, seed, 'normal');
  const deadline = Math.min(40, (g.campaign?.turnLimit || m.win?.hold || m.lose?.turns || 20) + 2);
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
    for (const seed of (focus.has(m.id) ? focusSeeds : seeds)) {
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
    console.log((R2_IDS.includes(id) ? 'R2_BALANCE ' : 'STORY_BALANCE ') + m.id + ' | friendly ' + wins + '/' + trials.length +
      ' | losses ' + losses + ' | undecided ' + undecided +
      ' | ' + trials.map(t => (t.winner || 'unresolved') + ':T' + t.turn).join(' '));
    results.push({ campaign: id, mission: m.id, title: m.title, wins, losses, undecided, trials });
  }
}
function summarize(items) {
  return {
    seedCount: seeds.length, focusedSeedCount: focusSeeds.length,
    simulationCount: items.reduce((n,r) => n+r.trials.length,0), totalMissions: items.length,
    friendlyWins: items.reduce((n, r) => n + r.wins, 0),
    missionsWithAnyAIWin: items.filter(r => r.wins > 0).length,
    zeroAIWinMissions: items.filter(r => r.wins === 0).map(r => r.mission),
    errors: failures.filter(e => items.some(r => r.mission === e.mission))
  };
}
const r2 = results.filter(r => R2_IDS.includes(r.campaign));
console.log('R2_BALANCE_SUMMARY ' + JSON.stringify(summarize(r2)));
console.log('STORY_BALANCE_SUMMARY ' + JSON.stringify(summarize(results)));
console.log('STORY_BALANCE_FULL_JSON ' + JSON.stringify(results));
if (failures.length) process.exitCode = 1;

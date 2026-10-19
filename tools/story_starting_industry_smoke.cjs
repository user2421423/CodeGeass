#!/usr/bin/env node
'use strict';
// Story missions should have a first-turn Industry reserve without changing
// existing designer-authored budgets, enemy economies, or save files.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const CP = require('../dist/campaign.js');

const difficulties = ['normal', 'hard', 'challenge', 'elite'];
const defaults = [
  [600, 250], [500, 200], [400, 150], [300, 120],
  [250, 100], [200, 80], [150, 60],
];
const fallback = credits => defaults.find(([min]) => credits >= min)?.[1] ?? 0;

let missions = 0;
let missing = 0;
let explicit = 0;
for (const campaign of Object.values(CP.CAMPAIGNS)) {
  for (const mission of campaign.missions) {
    missions++;
    const id = mission.id;
    const side = mission.player;
    const credits = mission.economy?.[side] ?? 0;
    const authored = mission.industry?.[side];
    const base = authored ?? fallback(credits);
    if (authored == null) {
      missing++;
      assert.ok(base > 0, id + ': missing Industry must get a usable reserve');
    } else {
      explicit++;
    }
    const missionIndustryBefore = JSON.stringify(mission.industry ?? null);
    for (const difficulty of difficulties) {
      const d = CP.DIFFICULTIES[difficulty];
      const g = CP.createMission(id, 20261019, difficulty);
      const context = id + ' / ' + difficulty;
      const playerMultiplier = d.economy || 1;
      assert.equal(g.economy[side].industry, Math.round(base * playerMultiplier),
        context + ': starting Industry');
      assert.equal(g.economy[side].credits, Math.round(credits * playerMultiplier),
        context + ': existing Credits remain unchanged');
      for (const [other, funds] of Object.entries(g.economy)) {
        if (other === side) continue;
        const starting = mission.industry?.[other] ?? 0;
        const enemyMultiplier = d.level && g.order.includes(other) &&
          E.foe(g, other, side) ? (d.income || 1) : 1;
        assert.equal(funds.industry, Math.round(starting * enemyMultiplier),
          context + ': do not grant fallback Industry to ' + other);
      }
    }
    assert.equal(JSON.stringify(mission.industry ?? null), missionIndustryBefore,
      id + ': campaign initialization must not rewrite authored mission data');
  }
}

assert.equal(missions, 58, 'audit every registered Story mission');
assert.equal(missing, 39, '39 previously had no starting Industry');
assert.equal(explicit, 19, '19 authored starting budgets remain protected');
for (const [id, expected] of Object.entries({
  bk1: 60, bk2: 80, bk3: 100, bk_fukuoka: 120,
  bk_pacific: 150, bk4: 120, br1: 80, eu_front: 200,
})) {
  const g = CP.createMission(id, 20261019, 'hard');
  const configured = CP.mission(id).industry?.[g.player];
  const credits = CP.mission(id).economy[g.player];
  const base = configured ?? fallback(credits);
  assert.equal(base, expected, id + ': agreed allocation');
}
console.log('Story starting Industry: PASS (' + missions + ' missions x ' +
  difficulties.length + ' difficulties; ' + missing + ' new defaults, ' +
  explicit + ' authored budgets preserved)');

#!/usr/bin/env node
'use strict';
// Elite difficulty uses Lv.1 enemy formations and Lv.3 enemy commander-led
// elites, including scripted Story starts, Conquest, and elite regional wars.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
require('../dist/campaign.js');
const { E: regionalEngine } = require('./scenario_sim.cjs');

let missions = 0, conquests = 0, scenarios = 0, enemyAces = 0, regularEnemies = 0;
const unitsOf = g => g.units.flatMap(u => [u, ...(u.cargo || [])]);

function check(g, context) {
  assert.equal(g.difficulty, 'elite', context + ': not Elite difficulty');
  const starts = unitsOf(g).filter(u => u.elite && u.eliteStart);
  assert.ok(starts.length, context + ': no converted starting elites');
  for (const u of starts) {
    const enemy = E.foe(g, u.side, g.player);
    const level = enemy && u.cmd ? 3 : 1;
    assert.equal(u.eliteLevel, level,
      context + ': ' + u.side + ' / ' + (u.cmd || u.type) + ' has wrong level');
    assert.equal(u.stack, 1, context + ': elite forces remain single-frame');
    if (enemy && u.cmd) enemyAces++;
    if (enemy && !u.cmd) regularEnemies++;
  }
}

for (const camp of Object.values(E.campaign.CAMPAIGNS)) {
  for (const mission of camp.missions) {
    const g = E.campaign.createMission(mission.id, 20261021, 'elite');
    check(g, 'Story ' + mission.id);
    missions++;
  }
}
assert.ok(missions >= 80, 'All registered Story missions should be checked');

for (const era of ['world', 'ufn2018']) {
  const g = E.createGame('britannia', 'elite', 'conquest', 20261021, era);
  check(g, 'Conquest ' + era);
  conquests++;
}

for (const model of Object.values(regionalEngine.scenarios.byId)) {
  if (!model.meta?.elite) continue;
  for (const side of model.sides) {
    const g = model.create(side, 'elite', 20261021);
    check(g, 'Scenario ' + model.id + ' / ' + side);
    scenarios++;
  }
}
assert.ok(scenarios >= 2, 'Elite regional scenario conversions should be tested');
assert.ok(enemyAces > 0 && regularEnemies > 0, 'Both enemy commander and ordinary cases must be exercised');

// Existing battle saves are not rewritten or damaged by the new starting balance.
const saved = E.campaign.createMission('bk1', 20261021, 'elite');
const legacyAce = unitsOf(saved).find(u => u.elite && u.cmd && E.foe(saved, u.side, saved.player));
assert.ok(legacyAce, 'Need an enemy ace for the legacy-save regression');
legacyAce.eliteLevel = 5;
const recovered = JSON.parse(JSON.stringify(saved));
E.campaign.normalizeUnits(recovered);
assert.equal(unitsOf(recovered).find(u => u.id === legacyAce.id).eliteLevel, 5,
  'Existing Elite saves keep their recorded unit levels');

console.log('Elite Lv.1 ordinary / Lv.3 rival commander regression: PASS ' +
  JSON.stringify({ missions, conquests, scenarios, enemyAces, regularEnemies }));

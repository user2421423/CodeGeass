'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const invasion = require('../dist/scenarios.js');
const division = require('../dist/scenarios-division-japan.js');
const europe = require('../dist/scenarios-europe.js');

test('All Scenario modes and difficulties ignore human-targeting priority, even when explicitly overridden', () => {
  for (const scenario of [invasion, division, europe]) {
    for (const difficulty of ['normal', 'hard', 'challenge', 'elite']) {
      for (const player of scenario.sides) {
        const g = scenario.create(player, difficulty, 321);
        g.aiPlayerPriorityBonus = 1; // Overrides must not re-enable the bias.
        const playerCity = g.stations.find(s => s.owner === player);
        assert.ok(playerCity, scenario.id + ': player has a city');
        for (const side of scenario.sides.filter(s => E.foe(g, s, player))) {
          const otherCity = g.stations.find(s => s.owner === side);
          const seeds = [[playerCity, 5], [otherCity, 5]];
          const context = scenario.id + ' ' + difficulty + ' human=' + player + ' ai=' + side;
          assert.equal(E.playerPriorityBonus(g, side), 0, context);
          assert.deepEqual(E.playerPrioritySeeds(g, side, seeds), seeds, context);
          assert.strictEqual(E.playerPrioritySeeds(g, side, seeds), seeds,
            context + ': neutral seeds are unchanged rather than reweighted');
        }
      }
    }
  }
});

test('Division of Japan AI column assignments do not depend on which rival is human', () => {
  const britanniaHuman = division.create('britannia', 'normal', 901);
  const europiaHuman = division.create('eu', 'normal', 901);
  britanniaHuman.aiPlayerPriorityBonus = 1;
  europiaHuman.aiPlayerPriorityBonus = 1;
  const signature = g => g.units.map(u => [u.id, u.side, u.type, u.c, u.r]);
  assert.deepEqual(signature(britanniaHuman), signature(europiaHuman),
    'identical initial armies are required for a fair AI target-choice comparison');
  const planBritanniaHuman = E.aiPlan(britanniaHuman, 'cf');
  const planEuropiaHuman = E.aiPlan(europiaHuman, 'cf');
  assert.deepEqual(planBritanniaHuman.assign, planEuropiaHuman.assign,
    'same Chinese Federation units must choose the same cities with either rival set as human');
});

test('The unchanged Conquest AI continues to apply its existing human-target preference', () => {
  const g = E.createGame('eu', 'normal', 'conquest', 92);
  const side = 'britannia';
  assert.equal(E.foe(g, side, g.player), true);
  assert.equal(E.playerPriorityBonus(g, side), 1);
  g.aiPlayerPriorityBonus = 0.25;
  assert.equal(E.playerPriorityBonus(g, side), 0.25);
  g.aiPlayerPriorityBonus = 0;
  assert.equal(E.playerPriorityBonus(g, side), 0);
});

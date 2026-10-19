#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../dist/engine.js');

for (const difficulty of ['normal', 'hard', 'challenge', 'elite']) {
  for (const mode of ['story', 'scenario', 'campaign', 'conquest']) {
    const eligible = mode === 'campaign' || mode === 'conquest';
    const g = E.createGame('britannia', difficulty, 'conquest', 20261019, 'world');
    g.mode = mode === 'story' ? 'campaign' : mode === 'conquest' ? 'conquest' : 'scenario';
    if (g.mode === 'scenario') g.scenario = { id: 'honors-regression' };
    if (mode === 'campaign') g.warCampaign = { faction: 'britannia', missionId: 'britannia-invasion-japan' };
    const p = { tokens: 0, roster: {} };
    E.applyRoster(g, p);
    g.units = [];
    const u = E.newUnit(g, 'sutherland', g.player, 0, 0);
    u.cmd = 'cornelia';
    u.personal = true;
    assert.equal(E.canEarnHonors(g), eligible, `${mode}/${difficulty} eligibility`);

    // Exercise the combat engine's direct-kill medals and participation tracking.
    for (let i = 0; i < 5; i++) {
      const enemy = E.newUnit(g, 'estrella', 'eu', 1, 0);
      if (i === 0) enemy.cmd = 'akito';
      enemy.hp = 0;
      E.kill(g, enemy, u);
    }
    assert.equal((g.honorEvents || []).length, eligible ? 2 : 0, 'Valor and Marksman earning');
    assert.equal(!!g.honorService, eligible, 'Only eligible modes track service');
    g.over = { winner: g.player };
    E.finalizeHonors(g);
    const expected = eligible ? ['valor', 'marksman', 'campaign'] : [];
    if (mode === 'conquest' && difficulty !== 'normal') expected.push('laurel_' + difficulty);
    assert.deepEqual((g.honorEvents || []).map(e => e.id), expected, 'Victory honors by mode');

    // Old saves can contain both pending personal awards and legacy shared medals.
    if (!eligible) {
      g.honorEvents = [{ id: 'star', commander: 'cornelia', personal: true, reason: 'Old award', turn: 1 }];
      g.medalsEarned = [{ id: 'valor' }];
    }
    const before = JSON.stringify(p);
    assert.equal(E.claimHonors(p, g, 'mode-test').awarded.length, expected.length);
    if (!eligible) assert.equal(JSON.stringify(p), before, 'Disabled claims never mutate HQ');
    assert.equal(E.claimHonors(p, g, 'mode-test').awarded.length, 0, 'Claims cannot pay twice');

    // Reloaded Story Mode results must hide previously generated pending medals.
    const ui = { E, game: g, esc: s => s };
    vm.createContext(ui);
    vm.runInContext(fs.readFileSync(require.resolve('../dist/ui/honors.js'), 'utf8'), ui);
    assert.equal(vm.runInContext('honorsEarnedHTML()', ui) !== '', eligible);
  }
}
console.log('Commander medals restricted to Campaign and World Conquest: PASS');

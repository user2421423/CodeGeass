// Run after: node tools/build_sources.cjs
// Regression checks for the Saitama mission, all four difficulties, and legacy progression.
'use strict';
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const C = require('../dist/campaign.js');

const missions = C.CAMPAIGNS.bk_s1.missions;
assert.equal(missions.length, 10, 'Black Knights Season 1 must have ten missions');
assert.deepEqual(missions.slice(0, 3).map(m => m.id), ['bk1', 'bk_saitama', 'bk2']);
const m = C.mission('bk_saitama');
assert.equal(m.stars.length, 2, 'Two bonus stars, plus the victory star');
assert.equal(C.starElite(m.id), 'guren_mkii', 'Same fragment pool as other early BK missions');
assert.equal(C.next('bk1'), 'bk_saitama');
assert.equal(C.next('bk_saitama'), 'bk2');
assert.equal(C.unlocked({ campaign: { bk1: 1 } }, 'bk_saitama'), true);
assert.equal(C.unlocked({ campaign: { bk2: 2 } }, 'bk2'), true, 'Past clears remain accessible');

for (const mode of ['normal', 'hard', 'challenge', 'elite']) {
  const game = C.createMission('bk_saitama', 1357, mode);
  assert.equal(game.difficulty, mode);
  assert.equal(game.mode, 'campaign');
  assert.equal(game.campaign.id, 'bk_saitama');
  assert.equal(game.campaign.turnLimit, 13);
  const zero = game.units.find(u => u.cmd === 'zero' && u.side === game.player);
  const exit = game.stations.find(s => s.name === 'Western Escape Route');
  assert.ok(zero && exit, mode + ': Zero and the escape destination must exist');
  assert.ok(game.units.some(u => u.cmd === 'cornelia'), mode + ': Cornelia must be present');
  assert.ok(game.units.filter(u => u.side === game.player).length >= 5, mode + ': force should not be unwinnable by design');

  // An early escape is not a win: Zero must actually face the trap.
  game.campaign.kills = 1;
  zero.c = exit.c;
  zero.r = exit.r;
  game.turn = 3;
  assert.equal(E.hooks.decide(game), null, mode + ': early withdrawal must not win');
  game.turn = 4;
  const outcome = E.hooks.decide(game);
  assert.equal(outcome.winner, game.player, mode + ': survival + skirmish + escape wins');
  assert.equal(outcome.stars, 2, mode + ': default win with no losses earns two stars');
  const payout = C.reward(game, {});
  assert.ok(payout.total > 0, mode + ': clearing the mission earns standard tokens');

  const mastery = C.createMission('bk_saitama', 1357, mode);
  mastery.campaign.kills = 3;
  const mz = mastery.units.find(u => u.cmd === 'zero' && u.side === mastery.player);
  const mx = mastery.stations.find(s => s.name === 'Western Escape Route');
  mz.c = mx.c; mz.r = mx.r;
  mastery.turn = 4;
  const mastered = E.hooks.decide(mastery);
  assert.equal(mastered.stars, 3, mode + ': bonus objectives earn three stars');
  assert.equal(C.reward(mastery, {}).fragmentChoice, 10, mode + ': 3 stars earn standard fragment choice');
}
console.log('Saitama Story Mode: four difficulties, progression, stars and rewards passed.');

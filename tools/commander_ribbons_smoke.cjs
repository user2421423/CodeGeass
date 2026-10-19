#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const copy = value => JSON.parse(JSON.stringify(value));
const events = (g, id) => (g.honorEvents || []).filter(e => e.id === id);

function battle(mode = 'conquest') {
  const g = E.createGame('britannia', 'normal', 'conquest', 20261019, 'world');
  if (mode === 'campaign') {
    g.mode = 'scenario';
    g.scenario = { id: 'ribbon-regression' };
    g.warCampaign = { faction: 'britannia', missionId: 'britannia-invasion-japan' };
  }
  const profile = { roster: {}, tokens: 0 };
  E.applyRoster(g, profile);
  g.units = [];
  const u = E.newUnit(g, 'sutherland', g.player, 0, 0);
  u.cmd = 'cornelia';
  u.personal = true;
  return { g, u, profile };
}
function kill(g, u, turn, force = false) {
  g.turn = turn;
  const v = E.newUnit(g, 'estrella', 'eu', 1, 0);
  v.hp = 0;
  E.kill(g, v, u, force);
}

// Window edges are inclusive, with no requirement to score a kill every turn.
for (const [turns, expected] of [
  [[1, 1, 2, 3, 3], 1],
  [[1, 1, 1, 1, 1], 1],
  [[1, 3, 3, 3, 3], 1],
  [[1, 2, 3, 4, 4], 0],
  [[1, 1, 1, 1, 4], 0],
  [[1, 2, 3, 4, 4, 4], 1],
]) {
  const { g, u } = battle();
  for (const turn of turns) kill(g, u, turn);
  assert.equal(events(g, 'marksman').length, expected, JSON.stringify(turns));
  assert.ok(g.honorService['hq:cornelia'].killTurns.length <= 5, 'History stays bounded');
}

// Continued kills and a second qualifying burst never award a second citation.
const burst = battle('campaign');
for (const turn of [1, 1, 2]) kill(burst.g, burst.u, turn);
const reloaded = E.unpackSave(copy(E.packSave(burst.g)));
const officer = reloaded.units.find(u => u.cmd === 'cornelia');
for (const turn of [3, 3, 3, 8, 8, 8, 8, 8]) kill(reloaded, officer, turn);
assert.equal(events(reloaded, 'marksman').length, 1, 'Window and award survive reload');

// A different commander, scripted officer or lost carrier cargo cannot supply kills.
const separate = battle();
for (let i = 0; i < 4; i++) kill(separate.g, separate.u, 1);
kill(separate.g, { ...separate.u, cmd: 'suzaku' }, 1);
kill(separate.g, { ...separate.u, personal: false }, 1);
kill(separate.g, separate.u, 1, true);
assert.equal(events(separate.g, 'marksman').length, 0);
kill(separate.g, separate.u, 3);
assert.equal(events(separate.g, 'marksman').length, 1);

// Campaign service requires attacks/captures, not merely finishing blows.
const killsOnly = battle();
for (let i = 1; i <= 20; i++) kill(killsOnly.g, killsOnly.u, i);
killsOnly.g.over = { winner: killsOnly.g.player };
E.finalizeHonors(killsOnly.g);
assert.equal(events(killsOnly.g, 'campaign').length, 0);

for (const mode of ['campaign', 'conquest']) {
  const { g, u, profile } = battle(mode);
  const clear = p => p.terrain === 'plains' && !E.internal.stationAt(g, p);
  const adjacent = p => E.internal.adjacent(g, p);
  const city = g.stations.find(s => s.owner === 'eu' && adjacent(s).some(p =>
    clear(p) && adjacent(p).some(clear)));
  assert.ok(city);
  const start = adjacent(city).find(p => clear(p) && adjacent(p).some(clear));
  const target = adjacent(start).find(clear);
  u.c = start.c; u.r = start.r;
  // Count actual legal attacks, including attacks that do not destroy the target.
  for (let i = 1; i <= 19; i++) {
    g.turn = i;
    g.phase = g.player;
    u.moved = u.attacked = false;
    u.hp = E.maxHP(u);
    g.units = [u];
    const v = E.newUnit(g, 'estrella', 'eu', target.c, target.r);
    v.hp = 100000;
    const result = E.attack(g, u.id, target.c, target.r);
    assert.equal(result.ok, true, result.reason);
    assert.equal(result.destroyed, false);
  }
  assert.equal(g.honorService['hq:cornelia'].combats, 19);
  const beforeThreshold = copy(g);
  beforeThreshold.over = { winner: g.player };
  E.finalizeHonors(beforeThreshold);
  assert.equal(events(beforeThreshold, 'campaign').length, 0, '19 actions do not qualify');

  // One city capture supplies the twentieth action; movement alone supplies none.
  g.turn = 20;
  g.units = [u];
  u.moved = u.attacked = false;
  city.shield = 0;
  const move = E.move(g, u.id, city.c, city.r);
  assert.equal(move.ok, true, move.reason);
  assert.equal(city.owner, g.player);
  assert.equal(g.honorService['hq:cornelia'].cities, 1);
  assert.equal(events(g, 'campaign').length, 0, 'No award before victory');
  const loss = copy(g);
  loss.over = { winner: 'eu' };
  E.finalizeHonors(loss);
  assert.equal(events(loss, 'campaign').length, 0, 'A loss does not qualify');

  g.over = { winner: g.player };
  E.finalizeHonors(g);
  assert.equal(events(g, 'campaign').length, 1, '20 combined actions qualify');
  g.honorsFinalized = false;
  E.finalizeHonors(g);
  assert.equal(events(g, 'campaign').length, 1, 'Repeated finalization cannot duplicate awards');
  E.claimHonors(profile, g, 'ribbon-operation');
  E.claimHonors(profile, g, 'ribbon-operation');
  const earned = profile.roster.cornelia.honors.find(h => h.id === 'campaign');
  assert.equal(earned.citations.length, 1, 'Claim retries cannot duplicate citations');
  const oldCitations = copy(earned.citations);
  // A distinct operation grants one additional citation and preserves history.
  const next = copy(g);
  next.honorEvents = [];
  next.honorsFinalized = false;
  E.finalizeHonors(next);
  E.claimHonors(profile, next, 'ribbon-next-operation');
  assert.equal(earned.citations.length, 2);
  assert.deepEqual(earned.citations.slice(0, 1), oldCitations);
}

assert.equal(E.MEDALS.marksman.name, 'Combat Excellence Ribbon');
console.log('Campaign service threshold and Combat Excellence three-turn window: PASS');

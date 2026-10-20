#!/usr/bin/env node
'use strict';
// Anya's sole passive: full-health escape from a killing blow every 10 turns.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const anya = E.COMMANDERS.anya;
assert.equal(anya.skill, "Marianne's Awakening");
assert.deepEqual(anya.fx, { marianneAwakening: 10 });
assert.equal(Object.hasOwn(anya, 'stats'), false, 'No personal Artillery damage bonus');
assert.equal(Object.hasOwn(anya, 'action'), false, 'No active or second ability');
assert.doesNotMatch(anya.desc, /Focused Bombardment|capture.*reposition/i);

function makeGame() {
  const g = E.createGame('britannia', 'normal', 'conquest', 20261020, 'world');
  g.units = [];
  g.phase = 'britannia';
  const unitType = Object.keys(E.TYPES).find(id => {
    const t = E.TYPES[id];
    return t.side === 'britannia' && t.branch === 'Artillery' &&
      !t.naval && !t.elite && t.min === 1 && t.max === 1;
  });
  assert.ok(unitType, 'Expected an ordinary Britannian Artillery unit');
  const spot = g.tiles.find(p => p.terrain === 'plains' && !E.internal.stationAt(g, p));
  assert.ok(spot);
  const unit = E.newUnit(g, unitType, 'britannia', spot.c, spot.r, 1, 'anya');
  assert.equal(unit.cmd, 'anya');
  return { g, unit };
}
// The first lethal hit revives to exactly maximum HP without reopening actions.
{
  const { g, unit } = makeGame();
  unit.moved = true;
  unit.attacked = true;
  unit.hp = 0;
  E.kill(g, unit, null);
  assert.equal(unit.hp, E.maxHP(unit));
  assert.equal(unit.expMarianneAwakeningTurn, g.turn);
  assert.equal(unit.moved, true);
  assert.equal(unit.attacked, true);
  assert.equal(unit.warCounted, undefined, 'Revival must not count as a lost unit');
  // The stamp is serialized with the formation for save/load.
  const saved = E.unpackSave(JSON.parse(JSON.stringify(E.packSave(g))));
  const loaded = saved.units.find(u => u.id === unit.id);
  assert.equal(loaded.expMarianneAwakeningTurn, g.turn);
  // Once ten global turns pass, another killing blow revives her again.
  g.turn += 10;
  unit.hp = 0;
  E.kill(g, unit, null);
  assert.equal(unit.hp, E.maxHP(unit));
  assert.equal(unit.expMarianneAwakeningTurn, g.turn);
  // A second hit before the cooldown is ready is fatal.
  unit.hp = 0;
  E.kill(g, unit, null);
  assert.equal(unit.hp, 0);
  assert.equal(unit.warCounted, true);
}
// Nine turns are insufficient to recharge.
{
  const { g, unit } = makeGame();
  unit.hp = 0;
  E.kill(g, unit, null);
  g.turn += 9;
  unit.hp = 0;
  E.kill(g, unit, null);
  assert.equal(unit.hp, 0);
}
// Forced annihilation must still destroy her (F.L.E.I.J.A./lost cargo).
{
  const { g, unit } = makeGame();
  unit.hp = 0;
  E.kill(g, unit, null, true);
  assert.equal(unit.hp, 0);
}
console.log("Anya Marianne's Awakening 10-turn passive: PASS");

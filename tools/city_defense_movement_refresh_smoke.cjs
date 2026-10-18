#!/usr/bin/env node
'use strict';
// Real-engine regression: breaking an intact hostile city's defenses grants
// exactly the movement rewards an enemy-unit kill would grant.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const side = 'britannia', enemy = 'eu';
const adjacent = (g, p) => E.internal.adjacent(g, p);

function battle(type, level = 1, commander = null) {
  const g = E.createGame(side, 'normal', 'conquest', 20261018, 'world');
  g.phase = side;
  g.units = [];
  const city = g.stations.find(s => s.owner === enemy &&
    adjacent(g, s).some(p => p.terrain === 'plains' &&
      !E.internal.stationAt(g, p)));
  assert.ok(city, 'An enemy city with adjacent plains exists');
  const start = adjacent(g, city).find(p => p.terrain === 'plains' &&
    !E.internal.stationAt(g, p));
  assert.ok(start);
  city.shield = 1;
  const attacker = E.newUnit(g, type, side, start.c, start.r);
  attacker.eliteLevel = level;
  attacker.cmd = commander;
  attacker.moved = true; // A real refresh, not unused movement.
  const fire = () => E.attack(g, attacker.id, city.c, city.r);
  return { g, city, start, attacker, fire };
}

function breakCity(b) {
  const result = b.fire();
  assert.equal(result.ok, true, result.reason || 'The attack must be legal');
  assert.equal(result.defensesDestroyed, true, 'The city shield must reach zero in this volley');
  assert.equal(result.destroyed, false, 'A shield break is not an enemy-unit kill');
  return result;
}

// Standard heavies and super-heavies share this rule in all three factions.
for (const type of ['vincent_commander', 'brighton', 'panzer_wespe',
  'alexander_elite', 'akatsuki_zikisan', 'akatsuki_air']) {
  const b = battle(type);
  breakCity(b);
  assert.equal(b.attacker.moved, false, type + ' regains movement');
  assert.equal(b.attacker.attacked, false, type + ' regains its Breakthrough attack');
}

// The existing two-movement-actions cap must not be bypassed.
const exhausted = battle('panzer_wespe');
exhausted.attacker.moveActionTurn = exhausted.g.turn;
exhausted.attacker.moveActionsThisTurn = 2;
breakCity(exhausted);
assert.equal(exhausted.attacker.moved, true, 'Two-move cap survives city break');
assert.equal(E.reachable(exhausted.g, exhausted.attacker).size, 0,
  'Movement remains blocked at the action cap');

// All four amphibious Elites get their innate move-and-attack refresh.
const amphibious = Object.entries(E.ELITE_FORCES)
  .filter(([, def]) => E.TYPES[def.type].naval === 'amphibious');
assert.equal(amphibious.length, 4);
for (const [id, def] of amphibious) {
  for (const level of [1, 5]) {
    const b = battle(def.type, level);
    breakCity(b);
    assert.equal(b.attacker.moved, false, id + ' Lv.' + level + ' regains movement');
    assert.equal(b.attacker.attacked, false, id + ' Lv.' + level + ' regains attack');
    assert.equal(b.attacker.eliteMoveAfterKill, true, id + ' permits postattack movement');
  }
}

// Level 5 kill-based movement skills must also activate on a shield break.
for (const [id, def] of Object.entries(E.ELITE_FORCES)
  .filter(([, def]) => def.lv5?.moveAfterKill)) {
  const b = battle(def.type, 5);
  breakCity(b);
  assert.equal(b.attacker.moved, false, id + ' Lv.5 restores movement');
  assert.equal(b.attacker.eliteMoveAfterKill, true,
    id + ' Lv.5 permits movement after attacking');
}

// Vincent Ward can only use its special movement refresh once per turn.
const ward = battle('elite_vincent_ward', 5);
ward.attacker.expVincentMoveTurn = ward.g.turn;
breakCity(ward);
assert.equal(ward.attacker.moved, true, 'Vincent Ward once-per-turn limit preserved');

// Commander reposition skills share the new trigger; other kill-only rewards do not.
const ashley = battle('gloucester', 1, 'ashley');
breakCity(ashley);
assert.equal(ashley.attacker.moved, false, 'Ashley can reposition after city shield break');
assert.equal(ashley.attacker.skillReposition, 2, 'Ashley receives exactly two hexes');

const kallen = battle('vincent_ward', 1, 'kallen');
breakCity(kallen);
assert.equal(kallen.attacker.moved, false, 'Kallen gets Breakthrough reposition');
assert.equal(kallen.attacker.skillReposition, 2, 'Kallen gets her two-hex reward');

// Mutsuki's network also grants movement after destroying defenses from forest.
const guerrilla = battle('gloucester');
guerrilla.start.terrain = 'forest';
const allyAt = adjacent(guerrilla.g, guerrilla.start)
  .find(p => p.terrain === 'plains' && !E.internal.stationAt(guerrilla.g, p) &&
    !(p.c === guerrilla.city.c && p.r === guerrilla.city.r));
assert.ok(allyAt, 'A nearby hex for a Mutsuki commander exists');
E.newUnit(guerrilla.g, 'glasgow', side, allyAt.c, allyAt.r).cmd = 'mutsuki';
breakCity(guerrilla);
assert.equal(guerrilla.attacker.moved, false, 'Mutsuki network grants movement');
assert.equal(guerrilla.attacker.skillReposition, 1, 'Mutsuki bonus is one hex');

// Units without a kill-based movement ability must not gain one.
for (const type of ['gloucester', 'portman_ii', 'gareth']) {
  const b = battle(type);
  breakCity(b);
  assert.equal(b.attacker.moved, true, type + ' does not gain new movement');
}
console.log('City-defense movement refresh, Elite abilities, commanders and limits: PASS');

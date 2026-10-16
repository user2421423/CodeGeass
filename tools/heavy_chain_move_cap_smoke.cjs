#!/usr/bin/env node
'use strict';
// Heavy and Super-Heavy units (including Elite Forces) get at most two
// movement actions per turn, without limiting consecutive killing attacks.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

const positionKey = p => p.c + ',' + p.r;
const distinct = (...positions) => new Set(positions.map(positionKey)).size === positions.length;
function battlefield(g) {
  const clear = p => p && !E.isSea(p) && !E.TERRAIN[p.terrain]?.blocked &&
    !g.stations.some(s => s.c === p.c && s.r === p.r);
  for (const origin of g.tiles) {
    if (!clear(origin)) continue;
    for (const first of E.adjacent(g, origin).filter(clear)) {
      for (const second of E.adjacent(g, first).filter(clear)) {
        if (!distinct(origin, first, second)) continue;
        for (const victim1 of E.adjacent(g, first).filter(clear)) {
          if (!distinct(origin, first, second, victim1)) continue;
          const later = E.adjacent(g, second).filter(clear)
            .filter(p => distinct(origin, first, second, victim1, p));
          if (later.length >= 2) return { origin, first, second, victim1, victim2: later[0], victim3: later[1] };
        }
      }
    }
  }
  throw new Error('No sufficiently open six-hex battlefield');
}

const cases = [
  ['ordinary heavy', g => E.typeFor('britannia', 'heavy', g)],
  ['ordinary super-heavy', g => E.typeFor('britannia', 'super', g)],
  ['Elite heavy', () => E.ELITE_FORCES.lancelot.type],
  ['Elite super-heavy', () => E.ELITE_FORCES.lancelot_albion.type],
];
for (const [label, getType] of cases) {
  const g = E.createGame('britannia', 'normal', 'conquest', 20261017, 'world');
  const p = battlefield(g);
  g.units = [];
  g.phase = g.player;
  const type = getType(g);
  assert.ok(['heavy', 'super'].includes(E.TYPES[type].cls), label + ' is in a heavy class');
  const hero = E.newUnit(g, type, g.player, p.origin.c, p.origin.r);
  if (hero.elite) { hero.eliteLevel = 5; hero.hp = E.maxHP(hero); }
  const victims = [p.victim1, p.victim2, p.victim3].map(pos => {
    const unit = E.newUnit(g, 'glasgow', 'eu', pos.c, pos.r);
    unit.hp = 1;
    return unit;
  });
  assert.equal(E.move(g, hero.id, p.first.c, p.first.r).ok, true, label + ' initial move');
  assert.equal(hero.moveActionsThisTurn, 1, label + ' counts initial move');
  assert.equal(E.attack(g, hero.id, victims[0].c, victims[0].r).destroyed, true, label + ' first kill');
  assert.equal(hero.attacked, false, label + ' can chain attacks after a kill');
  assert.equal(E.move(g, hero.id, p.second.c, p.second.r).ok, true, label + ' second move');
  assert.equal(hero.moveActionsThisTurn, 2, label + ' counts second move');
  assert.equal(E.attack(g, hero.id, victims[1].c, victims[1].r).destroyed, true, label + ' second kill');
  assert.equal(hero.attacked, false, label + ' keeps attack chains after second move');
  assert.equal(E.reachable(g, hero).size, 0, label + ' has no third move');
  // Simulate an Elite/commander ability restoring movement after the cap.
  hero.moved = false;
  hero.skillReposition = 3;
  hero.eliteMoveAfterKill = true;
  assert.equal(E.reachable(g, hero).size, 0, label + ' skill does not bypass cap');
  assert.equal(E.move(g, hero.id, p.first.c, p.first.r).ok, false, label + ' rejects third move');
  assert.equal(E.attack(g, hero.id, victims[2].c, victims[2].r).destroyed, true, label + ' can still chain attack');
  assert.equal(hero.attacked, false, label + ' retains unlimited killing attacks');
  assert.equal(E.reachable(g, hero).size, 0, label + ' remains capped after further kills');
  // A fresh turn resets the two-action budget; past saves lack stamped counters.
  g.turn += 1;
  hero.moved = false;
  hero.attacked = false;
  hero.skillReposition = 0;
  hero.eliteMoveAfterKill = false;
  assert.ok(E.reachable(g, hero).size > 0, label + ' moves again next turn');
}
console.log('Heavy/Super-Heavy (including Elite) move budget and kill-chain attacks: PASS');

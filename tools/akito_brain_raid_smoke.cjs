#!/usr/bin/env node
'use strict';
// Real-engine Brain Raid regression: no passive base bonuses, allied two-hex
// isolation, offensive/defensive damage, and one full postattack move per turn.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const D = E.internal.dist;
const k = p => p.c + ',' + p.r;
const infantryOf = side => Object.keys(E.TYPES).find(id => {
  const t = E.TYPES[id];
  return t.side === side && t.branch === 'Infantry' && !t.naval && !t.elite &&
    t.min === 1 && t.max >= 1;
});
const euInf = infantryOf('eu'), brInf = infantryOf('britannia'), cfInf = infantryOf('cf');
assert.ok(euInf && brInf && cfInf, 'Native basic infantry classes exist');
assert.equal(Object.hasOwn(E.COMMANDERS.akito, 'stats'), false,
  'Akito has no unconditional personal damage, critical or counter-fire stats');
assert.deepEqual(E.COMMANDERS.akito.fx,
  { loneRaider: 0.3, loneTaken: 0.7, loneMove: true });

function setup() {
  const g = E.createGame('eu', 'normal', 'conquest', 20261019, 'world');
  g.phase = 'eu';
  g.units = [];
  const valid = p => p.terrain === 'plains' && !E.internal.stationAt(g, p);
  const city = g.stations.find(s => s.owner === 'britannia' &&
    E.adjacent(g, s).some(valid));
  assert.ok(city, 'Need enemy city with unoccupied plains neighbor');
  const start = E.adjacent(g, city).find(valid);
  city.shield = 10000;
  const akito = E.newUnit(g, euInf, 'eu', start.c, start.r);
  akito.cmd = 'akito';
  const slot = radius => E.within(g, akito, radius).find(p =>
    D(g, akito, p) === radius && valid(p) && !E.internal.unitAt(g, p) &&
    !(city.c === p.c && city.r === p.r));
  return { g, city, akito, slot, fire: () => E.attack(g, akito.id, city.c, city.r),
    shot: () => E.preview(g, akito.id, city.c, city.r) };
}

// Exactly two hexes disables the damage bonus. Three restores it.
// The crit chance must not change with isolation.
{
  const b = setup();
  const solo = b.shot();
  assert.ok(solo && solo.shield > 0);
  const near2 = b.slot(2);
  assert.ok(near2, 'Need a radius-two support hex');
  const ally = E.newUnit(b.g, euInf, 'eu', near2.c, near2.r);
  const supported = b.shot();
  assert.ok(Math.abs(solo.shield / supported.shield - 1.3) < .04,
    'Isolated attack receives +30%, with rounding tolerance');
  assert.equal(solo.crit, supported.crit, 'No Brain Raid critical chance bonus');
  ally.hp = 0;
  const near3 = b.slot(3);
  assert.ok(near3, 'Need a radius-three support hex');
  E.newUnit(b.g, euInf, 'eu', near3.c, near3.r);
  assert.equal(b.shot().shield, solo.shield, 'Third-ring ally does not break isolation');
}

// An allied *different* faction in the same campaign team also blocks Brain Raid.
{
  const b = setup();
  const lone = b.shot().shield;
  const near2 = b.slot(2);
  b.g.teams = { eu: 'alliance', cf: 'alliance' };
  E.newUnit(b.g, cfInf, 'cf', near2.c, near2.r);
  assert.ok(b.shot().shield < lone, 'Team ally counts in the isolation ring');
}

// Incoming direct attacks also receive 30% damage reduction while isolated.
{
  const b = setup();
  b.g.phase = 'britannia';
  const hostile = E.newUnit(b.g, brInf, 'britannia', b.city.c, b.city.r);
  const isolated = E.preview(b.g, hostile.id, b.akito.c, b.akito.r);
  assert.ok(isolated && isolated.unit > 0);
  const near2 = b.slot(2);
  E.newUnit(b.g, euInf, 'eu', near2.c, near2.r);
  const supported = E.preview(b.g, hostile.id, b.akito.c, b.akito.r);
  assert.ok(Math.abs(isolated.unit / supported.unit - .7) < .09,
    'Brain Raid reduces incoming direct damage 30% when isolated');
}

// Successful attacks grant a whole normal move with no second attack.
{
  const b = setup();
  b.akito.moved = true;
  const attack = b.fire();
  assert.equal(attack.ok, true, attack.reason);
  assert.equal(b.akito.moved, false, 'Full move reset is granted despite earlier movement');
  assert.equal(b.akito.attacked, true, 'No additional attack');
  assert.equal(b.akito.skillReposition, 0, 'No shortened movement budget');
  const options = E.reachable(b.g, b.akito);
  assert.ok(options.size > 0, 'Full postattack move is legal');
  const destination = [...options.keys()].map(x => {
    const [c, r] = x.split(',').map(Number);
    return E.tile(b.g, c, r);
  }).find(p => p && p.terrain === 'plains' && !E.internal.stationAt(b.g, p));
  assert.ok(destination, 'Need legal land movement destination');
  const moved = E.move(b.g, b.akito.id, destination.c, destination.r);
  assert.equal(moved.ok, true, moved.reason);
  assert.equal(!!b.akito.expAkitoMoveReady, false, 'Move consumes the reset');
  assert.equal(E.reachable(b.g, b.akito).size, 0, 'No third move');
}

// Isolation must still hold when using the free movement.
{
  const b = setup();
  b.akito.moved = true;
  assert.equal(b.fire().ok, true);
  const near2 = b.slot(2);
  const ally = E.newUnit(b.g, euInf, 'eu', near2.c, near2.r);
  assert.equal(E.reachable(b.g, b.akito).size, 0,
    'Nearby ally suspends the postattack movement');
  ally.hp = 0;
  assert.ok(E.reachable(b.g, b.akito).size > 0,
    'Leaving isolation restores the unconsumed movement');
}

// Even if another mechanic refreshes Akito's attack, Brain Raid cannot
// produce a second movement reset that turn.
{
  const b = setup();
  b.akito.moved = true;
  assert.equal(b.fire().ok, true);
  const stamp = b.akito.expAkitoMoveTurn;
  delete b.akito.expAkitoMoveReady;
  b.akito.attacked = false; // Emulate an independent Breakthrough refresh.
  b.akito.moved = true;
  assert.equal(b.fire().ok, true);
  assert.equal(b.akito.expAkitoMoveTurn, stamp);
  assert.equal(b.akito.moved, true, 'Brain Raid does not refresh movement twice');
}
console.log('Akito Brain Raid damage, team isolation and single full move: PASS');

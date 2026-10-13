'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');

// A conquest where China has a ready charge waiting in a city and Britannia holds a warhead.
function setup(seed = 401) {
  const g = E.createGame('britannia', 'normal', 'conquest', seed);
  g.units = [];
  g.fleijaDetonated = 1;
  g.turn = 20;
  g.phase = 'cf';
  g.arsenal = { britannia: 1 };
  const city = g.stations.find(s => s.owner === 'cf' && s.capitalOf === 'cf') || g.stations.find(s => s.owner === 'cf');
  city.eliminator = 1;
  return { g, city };
}
const land = (g, p, d) => E.within(g, p, d).filter(t =>
  E.distance(t, p, g) === d && !E.TERRAIN[t.terrain]?.blocked && t.terrain !== 'sea' && t.terrain !== 'ocean' &&
  !E.stationAt(g, t) && !E.unitAt(g, t));
const unit = (g, side, p, cmd = null) => E.newUnit(g, E.typeFor(side, 'scout'), side, p.c, p.r, 1, cmd);

test('a waiting charge covers 3 hexes of its city, then 3 hexes of the unit that takes it', () => {
  const { g, city } = setup();
  assert.equal(E.ELIMINATOR.range, 3);
  const at3 = land(g, city, 3)[0], at4 = land(g, city, 4)[0];
  assert.ok(at3 && at4);
  assert.equal(E.eliminatorDefender(g, 'britannia', at3)?.city?.id, city.id);
  assert.equal(E.eliminatorDefender(g, 'britannia', at4), null);
  const u = unit(g, 'cf', land(g, city, 1)[0], 'xingke');
  assert.equal(E.transferEliminator(g, { city: city.id }, { unit: u.id }).ok, true);
  assert.equal(city.eliminator, 0);
  assert.equal(u.eliminator, 1);
  // Cover follows the carrier: far from the city it protects only around itself.
  const far = land(g, city, 9).find(t => land(g, t, 1).length);
  assert.ok(far);
  u.c = far.c;
  u.r = far.r;
  assert.equal(E.eliminatorDefender(g, 'britannia', city), null);
  assert.equal(E.eliminatorDefender(g, 'britannia', land(g, far, 3)[0])?.unit, u);
  assert.equal(E.eliminatorDefender(g, 'britannia', land(g, far, 4)[0] || at4), null);
});

test('an intercepting carrier spends its charge and the launch names it', () => {
  const { g, city } = setup();
  const u = unit(g, 'cf', land(g, city, 1)[0], 'xingke');
  E.transferEliminator(g, { city: city.id }, { unit: u.id });
  g.phase = 'britannia';
  const target = land(g, u, 2)[0];
  const shot = E.launch(g, 'britannia', target.c, target.r);
  assert.equal(shot.ok, true, shot.reason);
  assert.equal(shot.intercepted, true);
  assert.equal(shot.eliminatorCarrier, u.id);
  assert.match(shot.eliminatorCity, /Xingke/);
  assert.equal(u.eliminator, 0);
  assert.equal(u.hp > 0, true);
  assert.equal(g.arsenal.britannia, 0);
});

test('hand-overs need adjacency, a free holder, your own turn, and happen once per turn per charge', () => {
  const { g, city } = setup();
  const ring = land(g, city, 1);
  const a = ring.find(p => ring.some(q => E.distance(p, q, g) === 1)),
    b = ring.find(q => E.distance(a, q, g) === 1);
  assert.ok(a && b);
  const first = unit(g, 'cf', a), second = unit(g, 'cf', b);
  const far = unit(g, 'cf', land(g, city, 4)[0]);
  const rival = unit(g, 'britannia', land(g, city, 2)[0]);
  assert.match(E.transferEliminatorReason(g, { city: city.id }, { unit: far.id }), /adjacent/);
  assert.match(E.transferEliminatorReason(g, { city: city.id }, { unit: rival.id }), /own units/);
  assert.equal(E.transferEliminator(g, { city: city.id }, { unit: first.id }).ok, true);
  assert.match(E.transferEliminatorReason(g, { unit: first.id }, { unit: second.id }), /already changed hands/);
  g.turn++;
  assert.equal(E.transferEliminator(g, { unit: first.id }, { unit: second.id }).ok, true);
  assert.equal(second.eliminator, 1);
  assert.equal(first.eliminator, 0);
  g.phase = 'britannia';
  assert.match(E.transferEliminatorReason(g, { unit: second.id }, { unit: first.id }), /Not your turn/);
  g.phase = 'cf';
  city.eliminator = 1;
  assert.match(E.transferEliminatorReason(g, { city: city.id }, { unit: second.id }), /already holds/);
});

test('a destroyed carrier loses its charge and frees the slot; carried charges count toward the cap', () => {
  const { g, city } = setup();
  const u = unit(g, 'cf', land(g, city, 1)[0]);
  E.transferEliminator(g, { city: city.id }, { unit: u.id });
  const others = g.stations.filter(s => s.owner === 'cf' && s !== city).slice(0, 2);
  for (const s of others) s.eliminator = 1;
  assert.equal(E.eliminatorCharges(g, 'cf').length, 3);
  const spare = g.stations.find(s => s.owner === 'cf' && !s.eliminator && s !== city);
  spare.lab = 3;
  g.economy.cf = { credits: 99999, industry: 99999, science: 99999, sakuradite: 99999 };
  assert.match(E.eliminatorReason(g, spare), /At most 3/);
  u.hp = 0;
  E.kill(g, u, null, true);
  assert.equal(u.eliminator, 0);
  assert.equal(E.eliminatorCharges(g, 'cf').length, 2);
  assert.equal(E.eliminatorReason(g, spare), null);
});

test('a carrier aboard a Carrier-Battleship covers from the ship', () => {
  const { g, city } = setup();
  const u = unit(g, 'cf', land(g, city, 1)[0], 'xingke');
  E.transferEliminator(g, { city: city.id }, { unit: u.id });
  const sea = g.tiles.find(t => t.terrain === 'sea' && E.distance(t, city, g) > 12 && !E.unitAt(g, t));
  const ship = E.newUnit(g, E.typeFor('cf', 'carrier') || 'cf_carrier', 'cf', sea.c, sea.r);
  g.units.splice(g.units.indexOf(u), 1);
  (ship.cargo ||= []).push(u);
  assert.equal(E.eliminatorDefender(g, 'britannia', sea)?.unit, u);
  assert.equal(E.eliminatorDefender(g, 'britannia', land(g, city, 1)[1] || city), null);
});

test('saves keep carried charges', () => {
  const { g, city } = setup();
  const u = unit(g, 'cf', land(g, city, 1)[0]);
  E.transferEliminator(g, { city: city.id }, { unit: u.id });
  const loaded = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
  assert.ok(loaded);
  assert.equal(loaded.units.find(v => v.id === u.id).eliminator, 1);
  assert.equal(E.eliminatorCharges(loaded, 'cf').length, 1);
});

test('the AI hands a waiting charge to the best commander next to the city, never to an ordinary formation', () => {
  const { g, city } = setup();
  const [a, b] = land(g, city, 1);
  const plain = unit(g, 'cf', a);
  E.aiAssignEliminators(g, 'cf');
  assert.equal(city.eliminator, 1, 'no commander or Elite Force nearby: the charge stays in the city');
  assert.equal(plain.eliminator || 0, 0);
  const officer = unit(g, 'cf', b, 'xingke');
  E.aiAssignEliminators(g, 'cf');
  assert.equal(city.eliminator, 0);
  assert.equal(officer.eliminator, 1);
  assert.equal(plain.eliminator || 0, 0);
});

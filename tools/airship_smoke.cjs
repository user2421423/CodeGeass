#!/usr/bin/env node
'use strict';
// Real-engine checks for airships: one per power with identical stats, built in a level-3
// city factory, flying over land and sea, carrying cargo, and taking no bonus damage.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const I = E.internal;

const IDS = { britannia: 'logres_airship', eb: 'logres_airship', eu: 'charlemagne_airship',
  cf: 'shenlong_airship', bk: 'ikaruga_airship' };
const STATS = ['hp', 'attack', 'armor', 'move', 'min', 'max', 'capacity', 'cost', 'industry', 'sakuradite', 'research', 'tier'];
const ref = E.TYPES.logres_airship;
for (const id of new Set(Object.values(IDS))) {
  const t = E.TYPES[id];
  assert.ok(t?.air && t.naval === 'ship', id + ' is an airship');
  for (const k of STATS) assert.equal(t[k], ref[k], `${id} shares ${k}`);
  assert.equal(E.portBuilt(t), false, id + ' is built in a factory');
}
assert.deepEqual(E.price('logres_airship', 1), { credits: 1800, industry: 500, sakuradite: 60, science: 150 });
// Airships never replace a class slot in any faction's lineup or navy.
for (const side of E.MAJORS) {
  assert.ok(!Object.values(E.ROSTER[side] || {}).some(id => E.TYPES[id]?.air), side + ' roster has no airship');
  assert.ok(!E.navalTypes(null, side).some(id => E.TYPES[id]?.air), side + ' navy has no airship');
}

const world = side => E.createGame(side, 'normal', 'conquest', 20261020, 'world');
{
  const g = world('britannia');
  for (const [side, id] of Object.entries(IDS)) assert.equal(E.airshipType(g, side), id, side);
  assert.equal(E.airshipType({ mode: 'campaign' }, 'britannia'), null, 'No airships in Story Mode');
  const ufn = E.createGame('cf', 'normal', 'conquest', 20261020, 'ufn2018');
  assert.equal(E.airshipType(ufn, 'cf'), 'ikaruga_airship', 'The U.F.N. flies the Ikaruga');
  const lab = ufn.stations.find(s => s.owner === 'cf');
  assert.ok(E.automationUnitOptions(ufn, lab, 'cf').includes('ikaruga_airship'), 'U.F.N. Production Command lists the Ikaruga');
}

// Shared setup: an inland Britannian city with open land around it, and a nearby coast.
function setup() {
  const g = world('britannia');
  g.phase = 'britannia';
  const s = g.stations.find(s => s.owner === 'britannia' && E.adjacent(g, s).filter(p => p.terrain === 'plains' &&
    !E.stationAt(g, p)).length >= 4);
  assert.ok(s, 'Need an open Britannian city');
  g.units = g.units.filter(u => E.distance(u, s, g) > 8);
  Object.assign(E.internal.funds(g, 'britannia'), { credits: 9000, industry: 3000, science: 900, sakuradite: 400 });
  return { g, s };
}

{
  const { g, s } = setup();
  s.tier = 2;
  assert.equal(E.buyReason(g, s, 'logres_airship', 1), 'Requires factory level 3');
  s.tier = 3;
  assert.equal(E.buyReason(g, s, 'charlemagne_airship', 1), 'Not built by this faction');
  assert.equal(E.buyReason(g, s, 'logres_airship', 2), 'Warships are built one at a time');
  assert.equal(E.buyReason(g, s, 'logres_airship', 1), null);
  assert.ok(E.automationUnitOptions(g, s, 'britannia').includes('logres_airship'), 'Production Command can queue it');
  const before = { ...I.funds(g, 'britannia') };
  const r = E.recruit(g, s.id, 'logres_airship', 1);
  assert.ok(r.ok, r.reason);
  assert.deepEqual([r.unit.c, r.unit.r], [s.c, s.r], 'Rolls out on the city hex');
  assert.equal(s.producedTurn, g.turn);
  assert.notEqual(s.portProducedTurn, g.turn, 'Does not use a port slot');
  const after = I.funds(g, 'britannia');
  assert.equal(before.credits - after.credits, 1800);
  assert.equal(before.science - after.science, 150);
  assert.equal(before.sakuradite - after.sakuradite, 60);
  // No cap: a second one can be bought once the city hex is clear.
  assert.equal(E.buyReason(g, s, 'logres_airship', 1), 'A unit is on the city');
  const off = E.adjacent(g, s).find(p => !E.unitAt(g, p) && !E.stationAt(g, p) && !E.isSea(p));
  r.unit.c = off.c;
  r.unit.r = off.r;
  assert.equal(E.buyReason(g, s, 'logres_airship', 1), null, 'No per-faction cap');
}

{
  // Flight: ten hexes over land, sea and peaks, never into a city.
  const { g, s } = setup();
  const coast = g.tiles.find(p => E.isSea(p) && E.distance(p, s, g) <= 12 &&
    E.adjacent(g, p).some(n => !E.isSea(n) && !E.stationAt(g, n) && !E.TERRAIN[n.terrain]?.blocked));
  assert.ok(coast, 'Need a nearby coast');
  const land = E.adjacent(g, coast).find(n => !E.isSea(n) && !E.stationAt(g, n) && !E.TERRAIN[n.terrain]?.blocked);
  const ship = E.newUnit(g, 'logres_airship', 'britannia', land.c, land.r);
  const reach = E.reachable(g, ship);
  const hexes = [...reach.keys()].map(k => k.split(',').map(Number)).map(([c, r]) => E.tile(g, c, r));
  assert.ok(hexes.some(p => E.isSea(p)), 'Flies over the sea');
  assert.ok(hexes.some(p => !E.isSea(p) && !E.isCoast(p)), 'Flies over inland terrain');
  assert.ok(hexes.every(p => !E.stationAt(g, p)), 'Never enters a city');
  assert.ok(hexes.every(p => E.distance(p, ship, g) <= 10), 'Ten hexes a turn');
  assert.equal(Math.max(...[...reach.values()]), 10);
  // A peak is passable only by air.
  const step = E.adjacent(g, ship).find(p => !E.isSea(p) && !E.stationAt(g, p) && !E.unitAt(g, p));
  const old = step.terrain;
  step.terrain = 'peak';
  assert.ok(E.TERRAIN.peak.blocked);
  assert.ok(E.reachable(g, ship).has(E.key(step)), 'Flies over impassable peaks');
  step.terrain = old;
  assert.equal(E.canCapture(ship), false);

  // Cargo: a land unit boards from any adjacent hex and launches onto any adjacent land.
  const infantry = E.typeFor('britannia', 'scout', g);
  const p = E.adjacent(g, ship).find(n => !E.isSea(n) && !E.stationAt(g, n) && !E.unitAt(g, n) &&
    !E.TERRAIN[n.terrain]?.blocked);
  const trooper = E.newUnit(g, infantry, 'britannia', p.c, p.r);
  const board = E.move(g, trooper.id, ship.c, ship.r);
  assert.ok(board.ok && board.loaded === ship.id, 'Boards the airship');
  assert.equal(ship.cargo.length, 1);
  const inland = E.adjacent(g, ship).filter(n => !E.isSea(n) && !E.stationAt(g, n) && !E.unitAt(g, n) &&
    !E.TERRAIN[n.terrain]?.blocked);
  const sky = [...E.reachable(g, ship).keys()].map(k => k.split(',').map(Number))
    .map(([c, r]) => E.tile(g, c, r)).find(q => !E.isSea(q) && E.distance(q, ship, g) >= 4);
  assert.ok(E.move(g, ship.id, sky.c, sky.r).ok, 'Carries cargo inland');
  assert.deepEqual([trooper.c, trooper.r], [sky.c, sky.r], 'Cargo travels with it');
  const drop = E.deployTargets(g, ship, 0)[0];
  assert.ok(drop, 'Can launch onto adjacent land');
  assert.ok(E.deploy(g, ship.id, 0, drop.c, drop.r).ok);
  assert.ok(inland.length);

  // Repairs beside a friendly city, not only at a port.
  ship.hp = Math.round(E.maxHP(ship) / 2);
  ship.moved = ship.attacked = false;
  const nearCity = E.adjacent(g, s).find(n => !E.unitAt(g, n) && !E.stationAt(g, n));
  ship.c = nearCity.c;
  ship.r = nearCity.r;
  assert.equal(E.repairReason(g, ship), null);
  assert.equal(E.reinforceReason(g, ship), 'Airships cannot add frames');
  // No passive healing at the start of a turn, even beside a friendly city.
  const hp = ship.hp;
  E.beginTurn(g, 'britannia', true);
  assert.equal(ship.hp, hp, 'Airships never heal on their own');

  // Standing orders can cross the sea to an inland hex.
  ship.moved = false;
  const far = g.tiles.find(q => !E.isSea(q) && !E.stationAt(g, q) && !E.unitAt(g, q) &&
    E.distance(q, ship, g) >= 15 && E.distance(q, ship, g) <= 25);
  assert.equal(E.gotoReason(g, ship, far), null);
  assert.equal(E.gotoReason(g, ship, s), 'Airships cannot enter cities');
}

{
  // No bonus damage: anti-ship, coastal and terrain bonuses all skip airships.
  const { g } = setup();
  const water = g.tiles.find(p => E.isSea(p) && E.adjacent(g, p).filter(E.isSea).length === 6 &&
    !g.units.some(u => E.distance(u, p, g) <= 2));
  const swimmer = E.newUnit(g, 'panzer_frosch_ii', 'eu', water.c, water.r);
  const spot = E.adjacent(g, water)[0];
  const ship = E.newUnit(g, 'logres_airship', 'britannia', spot.c, spot.r);
  g.phase = 'eu';
  const asAirship = E.preview(g, swimmer.id, ship.c, ship.r);
  E.TYPES.logres_airship.air = false;
  const asWarship = E.preview(g, swimmer.id, ship.c, ship.r);
  E.TYPES.logres_airship.air = true;
  assert.ok(asAirship && asWarship);
  const dmg = p => p.rawUnit;
  assert.ok(dmg(asAirship) < dmg(asWarship), `Amphibious anti-ship bonus skipped (${dmg(asAirship)} < ${dmg(asWarship)})`);

  // Over land, a forest gives no cover and no penalty.
  const { g: h } = setup();
  const field = h.tiles.find(p => p.terrain === 'plains' && !E.stationAt(h, p) &&
    E.adjacent(h, p).filter(n => n.terrain === 'plains' && !E.stationAt(h, n)).length === 6 &&
    !h.units.some(u => E.distance(u, p, h) <= 2));
  const target = E.newUnit(h, 'logres_airship', 'britannia', field.c, field.r);
  const gp = E.adjacent(h, field)[0];
  const gunner = E.newUnit(h, E.typeFor('eu', 'light', h), 'eu', gp.c, gp.r);
  h.phase = 'eu';
  const open = dmg(E.preview(h, gunner.id, target.c, target.r));
  field.terrain = 'forest';
  const wooded = dmg(E.preview(h, gunner.id, target.c, target.r));
  assert.equal(wooded, open, 'No terrain cover for airships');
}

console.log('airship smoke: ok');

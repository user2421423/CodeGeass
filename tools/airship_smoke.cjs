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
  // Who can engage an airship: Heavy, Super-heavy, Rocket and Siege units (regular or Elite of those
  // classes), warships, other airships and Float-equipped units. Everything else can neither attack nor
  // return fire. Nothing deals bonus damage, and the airship gets no terrain cover.
  const { g } = setup();
  const field = g.tiles.find(p => p.terrain === 'plains' && !E.stationAt(g, p) &&
    E.within(g, p, 2).every(q => !E.isSea(q) && !E.stationAt(g, q) && !E.TERRAIN[q.terrain]?.blocked) &&
    !g.units.some(u => E.distance(u, p, g) <= 4));
  assert.ok(field, 'Need an open plain');
  const ship = E.newUnit(g, 'logres_airship', 'britannia', field.c, field.r);
  g.phase = 'eu';
  const canEngage = type => {
    const t = E.TYPES[type], at = E.within(g, field, t.max).find(q => E.distance(q, field, g) === t.max && !E.unitAt(g, q));
    const v = E.newUnit(g, type, 'eu', at.c, at.r);
    const ok = E.targets(g, v).some(q => q.c === field.c && q.r === field.r);
    g.units.splice(g.units.indexOf(v), 1);
    return ok;
  };
  for (const cls of E.CLASS_ORDER) {
    const allowed = ['heavy', 'super', 'rocket', 'siege'].includes(cls);
    assert.equal(canEngage(E.typeFor('eu', cls, g)), allowed, `Regular ${cls} ${allowed ? 'can' : 'cannot'} engage`);
    const elite = Object.values(E.ELITE_FORCES).map(e => e.type)
      .find(type => E.TYPES[type].cls === cls && !E.TYPES[type].naval && !E.TYPES[type].float);
    if (elite) assert.equal(canEngage(elite), allowed, `Elite ${cls} ${allowed ? 'can' : 'cannot'} engage`);
  }
  assert.equal(canEngage('panzer_frosch_ii'), false, 'Amphibious frames cannot engage');
  assert.equal(canEngage('charlemagne_airship'), true, 'Airships engage each other');
  // Return fire follows the same rule.
  g.phase = 'britannia';
  const near = E.adjacent(g, field);
  const inf = E.newUnit(g, E.typeFor('eu', 'scout', g), 'eu', near[0].c, near[0].r);
  const heavy = E.newUnit(g, E.typeFor('eu', 'heavy', g), 'eu', near[3].c, near[3].r);
  assert.equal(E.preview(g, ship.id, inf.c, inf.r).counter, 0, 'Infantry cannot return fire');
  assert.ok(E.preview(g, ship.id, heavy.c, heavy.r).counter > 0, 'Heavy armor returns fire');
  // No terrain cover over a forest.
  g.phase = 'eu';
  const open = E.preview(g, heavy.id, ship.c, ship.r).rawUnit;
  field.terrain = 'forest';
  assert.equal(E.preview(g, heavy.id, ship.c, ship.r).rawUnit, open, 'No terrain cover for airships');
  field.terrain = 'plains';
}

{
  // Every Conquest power opens with exactly one single-frame airship beside its capital, on its own land.
  for (const era of ['world', 'ufn2018']) for (const difficulty of ['normal', 'elite']) {
    const g = E.createGame('britannia', difficulty, 'conquest', 20261020, era);
    for (const side of g.majors) {
      const mine = g.units.filter(u => u.side === side && E.TYPES[u.type].air);
      assert.equal(mine.length, 1, `${era} ${difficulty}: ${side} starts with one airship`);
      assert.equal(mine[0].type, E.airshipType(g, side));
      assert.equal(mine[0].stack, 1);
      // In 2018 Britannia has no rear-area troops: its airship starts at Baghdad on the front instead.
      const home = era === 'ufn2018' && side === 'britannia'
        ? g.stations.find(s => s.name === 'Baghdad' && s.owner === side)
        : g.stations.find(s => s.capitalOf === side);
      if (home) assert.ok(E.distance(mine[0], home, g) <= 2, `${era}: ${side} airship starts by ${home.name}`);
      assert.equal(E.tile(g, mine[0].c, mine[0].r).owner, side);
    }
  }
}

{
  // AI: an airship carrying troops drops them onto an open enemy city, which falls the same turn.
  const g = world('britannia');
  g.phase = 'britannia';
  const target = g.stations.find(s => s.owner === 'eu' && !s.capitalOf &&
    E.adjacent(g, s).filter(p => !E.isSea(p) && !E.stationAt(g, p) && !E.TERRAIN[p.terrain]?.blocked).length >= 4 &&
    g.stations.every(o => o === s || E.distance(o, s, g) > 3));
  assert.ok(target, 'Need an isolated E.U. city');
  g.units = g.units.filter(u => E.distance(u, target, g) > 12);
  target.shield = 0;
  const pad = E.within(g, target, 5).find(p => E.distance(p, target, g) === 5 && !E.isSea(p) &&
    !E.stationAt(g, p) && !E.TERRAIN[p.terrain]?.blocked);
  const ship = E.newUnit(g, 'logres_airship', 'britannia', pad.c, pad.r);
  const trooper = E.newUnit(g, E.typeFor('britannia', 'scout', g), 'britannia', pad.c, pad.r);
  g.units.splice(g.units.indexOf(trooper), 1);
  ship.cargo = [trooper];
  E.aiOrder(g, ship.id);
  assert.equal(target.owner, 'britannia', 'Dropped troops take the open city');
  assert.equal(ship.cargo.length, 0);
}

// AI fronts: two shielded E.U. cities 10-14 hexes apart, the airship serving an offensive toward the farther one.
function frontSetup() {
  const g = world('britannia');
  g.phase = 'britannia';
  const open = s => !s.capitalOf && E.adjacent(g, s).filter(p => !E.isSea(p) && !E.stationAt(g, p) &&
    !E.TERRAIN[p.terrain]?.blocked).length >= 4;
  const cities = g.stations.filter(s => s.owner === 'eu' && open(s));
  let aim, decoy;
  for (const a of cities) {
    decoy = cities.find(b => b !== a && E.distance(a, b, g) >= 10 && E.distance(a, b, g) <= 14 &&
      g.stations.every(o => o === a || o === b || E.distance(o, a, g) > 4 && E.distance(o, b, g) > 4));
    if (decoy) { aim = a; break; }
  }
  assert.ok(aim && decoy, 'Need two isolated E.U. cities');
  g.units = g.units.filter(u => E.distance(u, aim, g) > 16 && E.distance(u, decoy, g) > 16);
  aim.shield = decoy.shield = 50;
  const memo = E.aiPlan(g, 'britannia');
  const front = { id: 'smoke', side: 'britannia', type: 'offensive', state: 'attacking', assigned: 0, rally: null,
    anchor: aim, objectives: [{ key: 's' + aim.id, c: aim.c, r: aim.r, owner: 'eu', value: 10 }] };
  memo.fronts.unshift(front);
  memo.byId.smoke = front;
  const free = p => p && !E.isSea(p) && !E.stationAt(g, p) && !E.unitAt(g, p) && !E.TERRAIN[p.terrain]?.blocked;
  return { g, memo, front, aim, decoy, free };
}

{
  // AI: loaded troops land toward the airship's front objective, not beside the nearer enemy city.
  const { g, memo, aim, decoy, free } = frontSetup();
  const pad = E.within(g, decoy, 2).find(p => E.distance(p, decoy, g) === 2 && free(p) &&
    E.distance(p, aim, g) >= E.distance(decoy, aim, g));
  assert.ok(pad, 'Need a hex behind the decoy city');
  const ship = E.newUnit(g, 'logres_airship', 'britannia', pad.c, pad.r);
  for (const cls of ['scout', 'medium']) {
    const trooper = E.newUnit(g, E.typeFor('britannia', cls, g), 'britannia', pad.c, pad.r);
    g.units.splice(g.units.indexOf(trooper), 1);
    ship.cargo = [...(ship.cargo || []), trooper];
  }
  g.ai.britannia.airships = { [ship.id]: { front: 'smoke', since: g.turn } };
  const drops = E.aiOrder(g, ship.id).filter(e => e.kind === 'deploy');
  assert.equal(drops.length, 2, 'Both formations land');
  for (const d of drops) {
    assert.ok(E.distance(d.to, aim, g) <= 4, `Lands near the front's objective (${E.distance(d.to, aim, g)} hexes)`);
    assert.ok(E.distance(d.to, decoy, g) > 4, 'Not beside the nearer city');
  }
  assert.ok(memo.byId.smoke, 'Plan unchanged');
}

{
  // AI: an empty airship flies to a formation of its front far from the objective and lifts it; a formation that
  // acts first boards an airship in reach that serves its front.
  const { g, memo, aim, free } = frontSetup();
  const home = g.tiles.filter(p => free(p) && E.distance(p, aim, g) >= 14 && E.distance(p, aim, g) <= 18 &&
    g.stations.every(s => E.distance(s, p, g) > 3));
  const spot = home.find(p => home.some(q => E.distance(p, q, g) === 6));
  assert.ok(spot, 'Need open ground far from the objective');
  const rider = E.newUnit(g, E.typeFor('britannia', 'medium', g), 'britannia', spot.c, spot.r);
  memo.assign[rider.id] = 'smoke';
  const start = home.find(q => E.distance(spot, q, g) === 6);
  const ship = E.newUnit(g, 'logres_airship', 'britannia', start.c, start.r);
  g.ai.britannia.airships = { [ship.id]: { front: 'smoke', since: g.turn } };
  E.aiOrder(g, ship.id);
  assert.deepEqual(ship.cargo.map(u => u.id), [rider.id], 'Flies over and lifts the front\'s formation');

  ship.cargo = [];
  g.units.push(rider);
  const next = E.adjacent(g, ship).find(free);
  Object.assign(rider, { c: next.c, r: next.r, moved: false, attacked: false });
  ship.moved = ship.attacked = false;
  const walk = E.adjacent(g, rider).find(p => free(p) && E.distance(p, ship, g) === 2);
  Object.assign(rider, { c: walk.c, r: walk.r });
  E.aiOrder(g, rider.id);
  assert.deepEqual(ship.cargo.map(u => u.id), [rider.id], 'Boards the airship serving its front');
}

{
  // AI: with three formations of its front beside it, the airship lifts the commander-led and the hardest-hitting
  // ones and leaves the plain scout.
  const { g, memo, aim, free } = frontSetup();
  const spot = g.tiles.find(p => free(p) && E.distance(p, aim, g) >= 14 && E.adjacent(g, p).filter(free).length >= 4 &&
    g.stations.every(s => E.distance(s, p, g) > 3));
  assert.ok(spot, 'Need open ground far from the objective');
  const ship = E.newUnit(g, 'logres_airship', 'britannia', spot.c, spot.r);
  g.ai.britannia.airships = { [ship.id]: { front: 'smoke', since: g.turn } };
  const [a, b, c] = E.adjacent(g, spot).filter(free);
  const scout = E.newUnit(g, E.typeFor('britannia', 'scout', g), 'britannia', a.c, a.r);
  const led = E.newUnit(g, E.typeFor('britannia', 'scout', g), 'britannia', b.c, b.r, 1, 'cornelia');
  const heavy = E.newUnit(g, E.typeFor('britannia', 'heavy', g), 'britannia', c.c, c.r);
  for (const v of [scout, led, heavy]) memo.assign[v.id] = 'smoke';
  E.aiOrder(g, ship.id);
  assert.deepEqual(ship.cargo.map(u => u.id).sort(), [led.id, heavy.id].sort(), 'Lifts the commander and the heavy');

  // The scout acting on its own leaves the last seat to the stronger formation that can still reach it.
  ship.cargo = [];
  g.units.push(led, heavy);
  Object.assign(led, { c: b.c, r: b.r, moved: false });
  Object.assign(heavy, { c: c.c, r: c.r, moved: false });
  ship.cargo = [led];
  g.units.splice(g.units.indexOf(led), 1);
  E.aiOrder(g, scout.id);
  assert.ok(!ship.cargo.includes(scout), 'The scout does not take the heavy\'s seat');
}

{
  // AI: a pickup this turn comes before a killing shot elsewhere.
  const { g, memo, aim, free } = frontSetup();
  const home = g.tiles.filter(p => free(p) && E.distance(p, aim, g) >= 14 && E.distance(p, aim, g) <= 18 &&
    g.stations.every(s => E.distance(s, p, g) > 3));
  const spot = home.find(p => home.some(q => E.distance(p, q, g) === 5 &&
    g.tiles.some(t => free(t) && E.distance(t, q, g) === 5 && E.distance(t, p, g) >= 10)));
  assert.ok(spot, 'Need room for a rider, the airship and a target');
  const start = home.find(q => E.distance(spot, q, g) === 5 &&
    g.tiles.some(t => free(t) && E.distance(t, q, g) === 5 && E.distance(t, spot, g) >= 10));
  const prey = g.tiles.find(t => free(t) && E.distance(t, start, g) === 5 && E.distance(t, spot, g) >= 10);
  const rider = E.newUnit(g, E.typeFor('britannia', 'medium', g), 'britannia', spot.c, spot.r);
  memo.assign[rider.id] = 'smoke';
  const ship = E.newUnit(g, 'logres_airship', 'britannia', start.c, start.r);
  g.ai.britannia.airships = { [ship.id]: { front: 'smoke', since: g.turn } };
  const target = E.newUnit(g, E.typeFor('eu', 'scout', g), 'eu', prey.c, prey.r);
  target.hp = 1;
  E.aiOrder(g, ship.id);
  assert.deepEqual(ship.cargo.map(u => u.id), [rider.id], 'Lifts the formation instead of chasing the kill');
}

{
  // AI: a badly damaged airship heads for a friendly city instead of fighting, then repairs beside it.
  const g = world('britannia');
  g.phase = 'britannia';
  const home = g.stations.find(s => s.owner === 'britannia' && !s.capitalOf &&
    E.adjacent(g, s).filter(p => !E.isSea(p) && !E.stationAt(g, p)).length >= 4);
  g.units = g.units.filter(u => E.distance(u, home, g) > 14);
  const far = E.within(g, home, 8).find(p => E.distance(p, home, g) === 8 && !E.stationAt(g, p) &&
    !E.TERRAIN[p.terrain]?.blocked && g.stations.every(s => s.owner !== 'britannia' || E.distance(s, p, g) >= 3));
  const ship = E.newUnit(g, 'logres_airship', 'britannia', far.c, far.r);
  ship.hp = Math.round(E.maxHP(ship) * 0.3);
  const ownCity = p => Math.min(...g.stations.filter(s => s.owner === 'britannia').map(s => E.distance(s, p, g)));
  const before = ownCity(ship);
  E.aiOrder(g, ship.id);
  assert.ok(ownCity(ship) < before, 'Wounded airship flies toward a friendly city');
  if (ownCity(ship) <= 1) {
    ship.moved = ship.attacked = false;
    const hp = ship.hp;
    Object.assign(E.internal.funds(g, 'britannia'), { credits: 5000 });
    E.aiOrder(g, ship.id);
    assert.ok(ship.hp > hp, 'Repairs once beside the city');
  }
}

console.log('airship smoke: ok');

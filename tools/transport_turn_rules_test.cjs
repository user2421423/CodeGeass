#!/usr/bin/env node
'use strict';
// Focused, full-engine regression checks for naval transport and airlift turns.
// Run after: node tools/build_sources.cjs
const assert = require('node:assert/strict');
const { E, simulate } = require('./scenario_sim.cjs');

const scenario = E.scenarios?.byId?.['defense-japan'];
assert(scenario, 'Defense of Japan scenario must load');
const g = scenario.create('britannia', 'normal', 11);
g.phase = 'britannia';
g.turn = 1;

const carrier = g.units.find(u => E.TYPES[u.type]?.capacity === 2 && !E.TYPES[u.type]?.air && u.cargo?.length === 2);
assert(carrier, 'Expected a scenario carrier with two preloaded formations');
assert.equal(E.carrierCapacity(g, carrier), 2, 'Carriers keep their two-formation limit');

// Scenario-scripted and legacy-save cargo without a boarding timestamp is
// already aboard and may launch immediately when a beach becomes available.
const approach = [...E.reachable(g, carrier).keys()]
  .map(k => { const [c, r] = k.split(',').map(Number); return E.tile(g, c, r); })
  .find(p => p && E.deployTargets(g, { ...carrier, c: p.c, r: p.r }, 0).length);
assert(approach, 'Starting carrier must be able to approach at least one landing hex');
assert.equal(E.move(g, carrier.id, approach.c, approach.r).ok, true, 'Carrier can sail to a beach');
assert.equal(E.deployReason(g, carrier, 0), null, 'Preloaded legacy cargo should be ready');

const rider = carrier.cargo[0];
rider.boardedTurn = g.turn;
assert.match(E.deployReason(g, carrier, 0), /turn after boarding/i, 'Same-turn carrier launch is blocked');
const landing = E.deployTargets(g, carrier, 0)[0];
assert(landing, 'Carrier has a landing target');
const blocked = E.deploy(g, carrier.id, 0, landing.c, landing.r);
assert.equal(blocked.ok, false, 'Action validation must block the exploit');
assert.equal(carrier.cargo.length, 2, 'Blocked deployment must not remove cargo');

g.turn += 1;
assert.equal(E.deployReason(g, carrier, 0), null, 'Passenger is ready on the next turn');
const launch = E.deploy(g, carrier.id, 0, landing.c, landing.r);
assert.equal(launch.ok, true, 'Next-turn carrier deployment is legal');
assert.equal(launch.unit.moved, false, 'Launched troop receives full movement');
assert.equal(launch.unit.attacked, false, 'Launched troop receives full attack');
assert.equal(carrier.cargo.length, 1);

// Airships share the exact two-slot cargo and next-turn departure rule, but
// remain able to traverse all terrain and land troops inland.
const airHex = g.tiles.find(p => E.isSea(p) && !E.unitAt(g, p));
assert(airHex, 'Need an empty sea hex to stage an airship');
const airship = E.newUnit(g, 'logres_airship', 'britannia', airHex.c, airHex.r);
assert.equal(E.TYPES[airship.type].air, true);
assert.equal(E.carrierCapacity(g, airship), 2);
airship.cargo = [{ ...launch.unit, boardedTurn: g.turn }];
assert.match(E.deployReason(g, airship, 0), /turn after boarding/i, 'Airship instant drop is blocked');
g.turn += 1;
assert.doesNotMatch(E.deployReason(g, airship, 0) || '', /turn after boarding/i,
  'Airship passenger becomes eligible next turn');

// A sea transport can sail toward shore, but cannot both sail and land during
// the same movement action. When it starts adjacent to the landing hex,
// disembarking consumes its entire movement for that turn.
const unoccupied = p => !E.unitAt(g, p);
const legalLand = p => !E.isSea(p) && !E.TERRAIN[p.terrain]?.blocked &&
  unoccupied(p) && !E.stationAt(g, p);
let trip;
for (const start of g.tiles) {
  if (!E.isSea(start) || !unoccupied(start) ||
      E.adjacent(g, start).some(p => !E.isSea(p))) continue;
  for (const near of E.adjacent(g, start)) {
    if (!E.isSea(near) || !unoccupied(near)) continue;
    const land = E.adjacent(g, near).find(legalLand);
    if (land) { trip = { start, near, land }; break; }
  }
  if (trip) break;
}
assert(trip, 'Need a deep-water-to-coast route for the transport test');
const transport = E.newUnit(g, launch.unit.type, 'britannia', trip.start.c, trip.start.r);
let reach = E.reachable(g, transport);
assert.equal(reach.has(E.key(trip.land)), false, 'Cannot sail and land in one movement action');
assert.equal(reach.has(E.key(trip.near)), true, 'Transport can stage at sea beside land');
assert.equal(E.move(g, transport.id, trip.near.c, trip.near.r).ok, true);
g.turn += 1;
transport.moved = false;
transport.attacked = false;
reach = E.reachable(g, transport);
assert.equal(reach.has(E.key(trip.land)), true, 'Can land when the turn begins adjacent to land');
assert.equal(E.move(g, transport.id, trip.land.c, trip.land.r).ok, true);
assert.equal(transport.moved, true, 'An ordinary transport landing ends its move');

// Full AI orders must obey the common action validators: neither side may
// deploy newly boarded carrier or airship cargo. Existing preloaded invasions
// must still operate without throwing exceptions.
let aiLandings = 0;
const run = simulate(scenario, 'britannia', 'normal', 11, 3, {
  events(state, actor, events) {
    for (const event of events || []) {
      if (event.kind !== 'deploy') continue;
      aiLandings += 1;
      const unit = state.units.find(u => u.id === event.id);
      assert(unit, 'AI deployment should create a map unit');
      assert.notEqual(unit.boardedTurn, state.turn, 'AI must never deploy freshly boarded cargo');
    }
  },
});
assert.deepEqual(run.r.errors, [], 'Naval invasion AI must complete orders without errors');
console.log('TRANSPORT_TURN_RULES_PASS ' + JSON.stringify({ carrierCapacity: 2, aiLandings }));

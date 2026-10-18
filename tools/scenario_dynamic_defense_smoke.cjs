#!/usr/bin/env node
'use strict';
// Smoke check for dynamic home-defense transitions and route-aware assignments.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const DIST = path.join(__dirname, '../dist');
for (const f of fs.readdirSync(DIST).filter(f =>
  /^(scenarios.*|.*-landmask|.*-geography)\.js$/.test(f)).sort())
  require(path.join(DIST, f));

const api = E.internal;
const scenario = E.scenarios.byId['war-for-australia'];
assert(scenario, 'Australian scenario registered');
const side = 'britannia';
const g = scenario.create(side, 'normal', 11);
const enemies = g.units.filter(u => u.hp > 0 &&
  api.foe(g, u.side, side) && !api.isShip(u) && !api.atSea(g, u));
const ownCities = g.stations.filter(c => c.owner === side);
assert(enemies.length >= 8, 'requires at least eight hostile land formations');

const options = ownCities.map(city => {
  const free = g.tiles.filter(p => p && !api.isSea(p) &&
    !api.TERRAIN[p.terrain]?.blocked && api.massOf(g, p) === api.massOf(g, city) &&
    api.dist(g, p, city) >= 1 && api.dist(g, p, city) <= 3 &&
    !api.unitAt(g, p) && !api.stationAt(g, p));
  const defenders = g.units.filter(u => u.side === side && u.hp > 0 &&
    api.dist(g, u, city) <= 6).length;
  return { city, free, defenders };
}).filter(v => v.free.length >= 8).sort((a, b) =>
  a.defenders - b.defenders || a.city.id - b.city.id);
assert(options.length, 'needs a target city with room for an invasion');
const { city, free } = options[0];
const relocated = [];
for (let i = 0; i < 8; i++) {
  const u = enemies[i], old = { c: u.c, r: u.r };
  u.c = free[i].c; u.r = free[i].r;
  api.reindex(g, u, old);
  relocated.push(u);
}
// Simulate an overwhelmed local defense without changing unit counts or types.
for (const u of g.units.filter(u => u.hp > 0 && u.side === side &&
  api.massOf(g,u) === api.massOf(g,city) && api.dist(g,u,city) <= 10))
  u.hp = Math.max(1, Math.floor(u.hp * 0.2));
g.turn = (g.turn || 1) + 1;
const crisis = E.aiPlan(g, side);
const target = crisis.fronts.find(f => f.dynamicDefense &&
  (f.anchor.id === city.id || f.protectedCities.includes(city.id)));
if (!target) console.log('DEFENSE_DIAGNOSTICS', JSON.stringify({
  city: city.name, cityId: city.id,
  homeDefense: g.ai?.[side]?.homeDefense,
  dynamic: crisis.fronts.filter(f => f.dynamicDefense).map(f => f.name),
  invaders: relocated.map(u => ({ type: u.type, at: [u.c,u.r],
    distance: api.dist(g,u,city),sameLand:api.massOf(g,u)===api.massOf(g,city) }))
}));
assert(target, 'invasion triggers a local defensive objective');
assert.equal(target.type, 'defensive');
assert.equal(target.state, 'holding');
assert(crisis.defenseBudget > 0, 'crisis has a positive mobile diversion budget');
const committed = crisis.fronts.filter(f => f.dynamicDefense)
  .reduce((n, f) => n + f.assigned, 0);
const largest = Math.max(0, ...g.units.filter(u => u.side === side)
  .map(u => E.unitStrength(u)));
assert(committed <= crisis.defenseBudget + largest + 0.001,
  'mobile defensive assignments stay within budget, allowing one formation of rounding');
assert(target.need?.length, 'defense supplies production preferences');

// Once attackers disappear, the temporary front must be released after two turns.
for (const u of g.units) if (api.foe(g, u.side, side)) u.hp = 0;
g.turn += 1;
E.aiPlan(g, side);
g.turn += 1;
const recovered = E.aiPlan(g, side);
assert(!recovered.fronts.some(f => f.dynamicDefense &&
  (f.anchor.id === city.id || f.protectedCities.includes(city.id))),
  'the threatened city returns to normal offensive targeting after two quiet turns');

// The Philippines' special no-counter-invasion doctrine must remain authoritative.
const philippines = E.scenarios.byId['philippines-invasion'] ||
  Object.values(E.scenarios.byId).find(s => /philippine/i.test(s.id));
assert(philippines, 'Philippines scenario registered');
const islands = philippines.create('cf', 'normal', 11);
assert(!E.aiPlan(islands, 'cf').fronts.some(f => f.dynamicDefense),
  'island defender retains its special dedicated defense');
console.log('SCENARIO_DYNAMIC_DEFENSE_SMOKE OK', JSON.stringify({
  threatenedCity: city.name, defenders: options[0].defenders,
  budget: crisis.defenseBudget, committed, state: target.state
}));

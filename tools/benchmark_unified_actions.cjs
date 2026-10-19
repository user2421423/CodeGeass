#!/usr/bin/env node
'use strict';
// Representative repeated real combat execution, not just a synthetic math microbenchmark.
// Usage: node tools/benchmark_unified_actions.cjs [path-to-engine.js]
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const E = require(path.resolve(process.argv[2] || path.join(__dirname, '../dist/engine.js')));
function fixture() {
  const g = E.createGame('britannia', 'normal', 'conquest', 317);
  let city, spot;
  for (const s of g.stations) {
    if (s.owner !== 'eu') continue;
    const p = E.adjacent(g, s).find(t =>
      !E.isSea(t) && !E.internal.TERRAIN[t.terrain]?.blocked &&
      !E.unitAt(g, t) && !E.stationAt(g, t) && !E.unitAt(g, s));
    if (p) { city = s; spot = p; break; }
  }
  if (!city) throw Error('No empty EU city approach found for benchmark');
  const u = E.newUnit(g, E.typeFor('britannia', 'scout', g), 'britannia', spot.c, spot.r);
  g.phase = u.side;
  if (!E.preview(g, u.id, city.c, city.r)) throw Error('Benchmark attack not legal');
  return { g, u, city };
}
const trials = [];
const OPS = Number(process.env.COMBAT_BENCH_OPS || 1000);
for (let pass = 0; pass < 4; pass++) {
  const { g, u, city } = fixture();
  let count = 0;
  const start = performance.now();
  for (let i = 0; i < OPS; i++) {
    // Reopen exactly one ordinary attack: no simulation turns, healing or economy.
    city.shield = 600;
    u.attacked = false;
    u.moved = false;
    const r = E.attack(g, u.id, city.c, city.r);
    if (!r.ok) throw Error('Benchmark action failed on iteration ' + i + ': ' + r.reason);
    count++;
  }
  if (pass > 0) trials.push((performance.now() - start) * 1000 / count);
}
trials.sort((a, b) => a - b);
console.log(JSON.stringify({
  operationsPerTrial: OPS,
  trialsMicrosecondsPerAttack: trials,
  medianMicrosecondsPerAttack: trials[Math.floor(trials.length / 2)]
}, null, 2));

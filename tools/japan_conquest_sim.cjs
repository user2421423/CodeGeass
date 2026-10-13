#!/usr/bin/env node
'use strict';
// Matched, normal-difficulty, full-44-city Japan conquest benchmark.
// Unlike the playable scenario, do not stop observing when the selected
// human faction loses. Only actual 44-city ownership resolves the war.
const fs = require('node:fs');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const japan = require('../dist/scenarios.js');

const SIDES = ['britannia', 'bk', 'cf'];
function arg(name, fallback) {
  const at = process.argv.indexOf(name);
  return at < 0 ? fallback : process.argv[at + 1];
}
const runs = Number(arg('--runs', 15));
const offset = Number(arg('--offset', 0));
const maxTurns = Number(arg('--max-turns', 150));
const baseSeed = Number(arg('--seed', 246801));
const output = arg('--output', 'japan-conquest-results.json');
if (![runs, offset, maxTurns, baseSeed].every(Number.isInteger) ||
    runs < 1 || offset < 0 || maxTurns < 50)
  throw Error('Invalid benchmark arguments');

const counts = g => Object.fromEntries([...SIDES, 'neutral'].map(side =>
  [side, g.stations.filter(s => s.owner === side).length]));
const all = g => g.units.flatMap(u => [u, ...(u.cargo || [])]);
const median = xs => {
  if (!xs.length) return null;
  const a = xs.slice().sort((x, y) => x - y), n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
};
const average = xs => xs.length ? xs.reduce((n, x) => n + x, 0) / xs.length : null;

function game(index) {
  const player = SIDES[index % SIDES.length];
  const seed = (baseSeed + Math.imul(index, 7919)) >>> 0;
  const g = japan.create(player, 'normal', seed);
  if (g.stations.length !== 44) throw Error('Changed Japan city count');
  const previous = g.stations.map(s => s.owner);
  const distinct = new Set(), flips = new Map(), seen = new Map();
  const actions = { attacks: 0, moves: 0, deploys: 0 };
  let captured = 0, recaptured = 0, lastChangeTurn = 0;
  const snapshots = {};
  const learn = () => {
    for (const u of all(g)) if (u.hp > 0 && !seen.has(u.id)) seen.set(u.id, u.side);
  };
  const ownership = () => {
    for (let i = 0; i < previous.length; i++) {
      if (previous[i] === g.stations[i].owner) continue;
      captured++; distinct.add(g.stations[i].id);
      flips.set(g.stations[i].id, (flips.get(g.stations[i].id) || 0) + 1);
      if (flips.get(g.stations[i].id) > 1) recaptured++;
      previous[i] = g.stations[i].owner;
      lastChangeTurn = g.turn;
    }
    learn();
  };
  function observe() {
    ownership();
    return japan.winner(g);
  }
  function snapshot(turn) {
    snapshots[turn] = {
      cities: counts(g), leader: Math.max(...SIDES.map(s => counts(g)[s])),
      captures: captured, distinctCities: distinct.size, recaptures: recaptured,
      formationsLost: [...seen].filter(([id]) => !all(g).some(u => u.hp > 0 && u.id === id)).length
    };
  }
  learn();
  let winner = null, winTurn = null;
  for (let turn = 1; turn <= maxTurns; turn++) {
    g.turn = turn;
    // Same per-turn scenario hook as the game (dist/ui/turns.js): ends the
    // Britannia–Black Knights alliance at turn 10.
    japan.onTurn(g);
    for (const side of g.order) {
      if (!E.alive(g, side)) continue;
      if (!(turn === 1 && side === g.order[0]))
        E.beginTurn(g, side, turn > 1);
      // checkVictory() deliberately ends a player's run when its final city
      // falls. Continue observing the surviving factions without declaring
      // that an unrelated side has conquered all 44 cities.
      if ((winner = observe())) { winTurn = turn; break; }
      if (g.over) g.over = null;
      E.aiProduction(g);
      if ((winner = observe())) { winTurn = turn; break; }
      if (g.over) g.over = null;
      const ids = g.units.filter(u => u.hp > 0 && u.side === side && !u.attacked)
        .sort((a, b) => E.aiOrderPriority(g, a) - E.aiOrderPriority(g, b) || a.id - b.id)
        .map(u => u.id);
      for (let step = 0; step < ids.length; step++) {
        const next = E.aiNextActor(g, ids, step);
        if (next !== step) [ids[step], ids[next]] = [ids[next], ids[step]];
        const id = ids[step];
        const u = g.units.find(v => v.id === id);
        if (!u || u.hp <= 0 || u.side !== side) continue;
        const events = E.aiOrder(g, id) || [];
        for (const event of events) {
          if (event.kind === 'attack') actions.attacks++;
          if (event.kind === 'move') actions.moves++;
          if (event.kind === 'deploy') actions.deploys++;
        }
        if ((winner = observe())) { winTurn = turn; break; }
        if (g.over) g.over = null;
      }
      if (winner) break;
    }
    if (turn === 25 || turn === 50) snapshot(turn);
    if (winner) break;
  }
  if (winner && winTurn < 50) {
    for (const t of [25, 50]) if (!snapshots[t] && t > winTurn) {
      const owned = Object.fromEntries([...SIDES, 'neutral'].map(s => [s, s === winner.winner ? 44 : 0]));
      snapshots[t] = {
        cities: owned, leader: 44, captures: captured,
        distinctCities: distinct.size, recaptures: recaptured,
        formationsLost: [...seen].filter(([id]) => !all(g).some(u => u.hp > 0 && u.id === id)).length
      };
    }
  }
  const finalLosses = Object.fromEntries(SIDES.map(side => [side,
    [...seen].filter(([id, original]) => original === side &&
      !all(g).some(u => u.hp > 0 && u.id === id)).length]));
  return {
    index, seed, player, difficulty: 'normal', totalCities: 44,
    completed: !!winner, winner: winner?.winner || null, winTurn,
    snapshots, finalCities: counts(g), captures: captured,
    distinctCities: distinct.size, recaptures: recaptured,
    formationLosses: finalLosses, turnsWithoutCapture: (winTurn || maxTurns) - lastChangeTurn,
    actions
  };
}
const results = [];
for (let i = 0; i < runs; i++) {
  const result = game(offset + i);
  results.push(result);
  console.log(JSON.stringify({ index: result.index, completed: result.completed,
    winner: result.winner, winTurn: result.winTurn,
    turn25: result.snapshots[25]?.cities, turn50: result.snapshots[50]?.cities,
    final: result.finalCities, stagnant: result.turnsWithoutCapture }));
}
const won = results.filter(r => r.completed);
const summary = {
  games: results.length, resolved: won.length,
  completionRate: won.length / results.length,
  winnerCounts: Object.fromEntries(SIDES.map(s => [s, won.filter(r => r.winner === s).length])),
  avgWinTurn: average(won.map(r => r.winTurn)),
  medianWinTurn: median(won.map(r => r.winTurn)),
  unresolved: results.length - won.length,
  avgTurn25Leader: average(results.map(r => r.snapshots[25]?.leader).filter(Number.isFinite)),
  avgTurn50Leader: average(results.map(r => r.snapshots[50]?.leader).filter(Number.isFinite)),
  avgCaptures25: average(results.map(r => r.snapshots[25]?.captures).filter(Number.isFinite)),
  avgCaptures50: average(results.map(r => r.snapshots[50]?.captures).filter(Number.isFinite)),
  avgRecaptures: average(results.map(r => r.recaptures)),
  avgFormationLosses: average(results.map(r => Object.values(r.formationLosses).reduce((a, b) => a + b, 0))),
  avgStall: average(results.map(r => r.turnsWithoutCapture))
};
fs.writeFileSync(output, JSON.stringify({ version: process.env.BENCHMARK_VERSION || 'local',
  config: { runs, offset, maxTurns, baseSeed }, summary, results }, null, 2) + '\n');
console.log('SUMMARY ' + JSON.stringify(summary));

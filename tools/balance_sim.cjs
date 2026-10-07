#!/usr/bin/env node
'use strict';

/*
 * Long-run conquest balance simulator.
 *
 * Every power is controlled by the same AI. Difficulty semantics match the
 * live game: the selected player faction is unboosted while its rivals receive
 * the chosen Hard/Challenge bonuses.
 */

const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');

const MAJORS = ['britannia', 'eu', 'cf'];
const DIFFICULTIES = ['normal', 'hard', 'challenge'];
const DEFAULT_SNAPSHOTS = [10, 20, 40, 60, 80, 100, 120];

function parseArgs(argv) {
  const out = {
    runs: 5,
    maxTurns: 120,
    players: [...MAJORS],
    difficulties: [...DIFFICULTIES],
    seed: 20261007,
    snapshots: [...DEFAULT_SNAPSHOTS],
    output: 'balance-results.json',
    summary: 'balance-summary.md',
    quiet: false,
  };
  const value = flag => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : null;
  };
  const intArg = (flag, fallback, min, max) => {
    const raw = value(flag);
    if (raw == null) return fallback;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${flag} must be an integer from ${min} to ${max}`);
    return n;
  };
  out.runs = intArg('--runs', out.runs, 1, 1000);
  out.maxTurns = intArg('--max-turns', out.maxTurns, 1, 120);
  out.seed = intArg('--seed', out.seed, 0, 0xffffffff);
  if (value('--players')) out.players = value('--players').split(',').map(v => v.trim()).filter(Boolean);
  if (value('--difficulties')) out.difficulties = value('--difficulties').split(',').map(v => v.trim()).filter(Boolean);
  if (value('--snapshot-turns'))
    out.snapshots = value('--snapshot-turns')
      .split(',')
      .map(v => Number.parseInt(v.trim(), 10))
      .filter(v => Number.isInteger(v) && v > 0 && v <= out.maxTurns);
  if (value('--output')) out.output = value('--output');
  if (value('--summary')) out.summary = value('--summary');
  out.quiet = argv.includes('--quiet');
  for (const p of out.players) if (!MAJORS.includes(p)) throw new Error(`Unknown player faction: ${p}`);
  for (const d of out.difficulties) if (!DIFFICULTIES.includes(d)) throw new Error(`Unknown difficulty: ${d}`);
  out.snapshots = [...new Set(out.snapshots)].sort((a, b) => a - b);
  return out;
}

function allUnits(g) {
  return g.units.flatMap(u => (u.cargo?.length ? [u, ...u.cargo] : [u]));
}

function activeUnits(g, side) {
  return allUnits(g).filter(u => u.hp > 0 && u.side === side);
}

function countBySide(items, sides, pick) {
  return Object.fromEntries(sides.map(side => [side, items.filter(v => pick(v) === side).length]));
}

function snapshot(g) {
  const sides = [...MAJORS, 'neutral'];
  const units = allUnits(g).filter(u => u.hp > 0);
  return {
    turn: g.turn,
    cities: countBySide(g.stations, sides, s => s.owner),
    units: countBySide(units, sides, u => u.side),
    strength: Object.fromEntries(
      sides.map(side => [
        side,
        +units
          .filter(u => u.side === side)
          .reduce((sum, u) => sum + (typeof E.unitStrength === 'function' ? E.unitStrength(u) : u.stack || 1), 0)
          .toFixed(2),
      ]),
    ),
    economy: Object.fromEntries(
      MAJORS.map(side => [
        side,
        {
          credits: Math.round(g.economy[side]?.credits || 0),
          industry: Math.round(g.economy[side]?.industry || 0),
          science: Math.round(g.economy[side]?.science || 0),
          sakuradite: Math.round(g.economy[side]?.sakuradite || 0),
        },
      ]),
    ),
    fallen: { ...(g.fallen || {}) },
  };
}

function playSide(g, side, counters) {
  if (!E.alive(g, side) || g.over) return;
  const before = activeUnits(g, side).length;
  E.aiProduction(g);
  const after = activeUnits(g, side).length;
  counters.produced[side] += Math.max(0, after - before);

  const ids = g.units.filter(u => u.hp > 0 && u.side === side && !u.attacked).map(u => u.id);
  for (const id of ids) {
    if (g.over) break;
    const u = g.units.find(v => v.id === id);
    if (!u || u.hp <= 0 || u.side !== side) continue;
    const events = E.aiOrder(g, id) || [];
    for (const event of events) {
      if (event.kind === 'move' || event.kind === 'deploy') counters.moves[side]++;
      else if (event.kind === 'attack') counters.attacks[side]++;
      else if (event.kind === 'feint') counters.special[side]++;
    }
  }
}

function simulate({ player, difficulty, seed, maxTurns, snapshotTurns }) {
  const started = process.hrtime.bigint();
  const g = E.createGame(player, difficulty, 'conquest', seed >>> 0);
  const wanted = new Set(snapshotTurns);
  const timeline = [];
  const start = snapshot(g);
  const counters = {
    produced: Object.fromEntries(MAJORS.map(s => [s, 0])),
    moves: Object.fromEntries(MAJORS.map(s => [s, 0])),
    attacks: Object.fromEntries(MAJORS.map(s => [s, 0])),
    special: Object.fromEntries(MAJORS.map(s => [s, 0])),
  };

  // Turn 1 begins with the selected player's units already refreshed, exactly
  // like the browser game. Rivals call beginTurn(..., false) before acting.
  while (!g.over && g.turn <= maxTurns) {
    playSide(g, g.player, counters);

    for (const side of g.order.slice(1)) {
      if (g.over || !E.alive(g, side)) continue;
      E.beginTurn(g, side, g.turn > 1);
      if (!g.over) playSide(g, side, counters);
    }

    if (wanted.has(g.turn)) timeline.push(snapshot(g));
    if (g.over) break;

    g.turn++;
    // This also resolves the live game's 120-turn armistice when turn 121 begins.
    E.beginTurn(g, g.player, true);
  }

  const end = snapshot(g);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  return {
    player,
    difficulty,
    seed: seed >>> 0,
    turnsPlayed: Math.min(maxTurns, Math.max(1, g.turn - (g.turn > maxTurns ? 1 : 0))),
    resolved: !!g.over,
    winner: g.over?.winner || null,
    playerWin: g.over?.winner === player,
    draw: g.over?.winner === 'draw',
    reason: g.over?.reason || `Stopped at the ${maxTurns}-turn simulation limit.`,
    elapsedMs: +elapsedMs.toFixed(2),
    start,
    final: end,
    actions: counters,
    timeline,
  };
}

function average(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
}

function aggregate(results) {
  const groups = {};
  for (const r of results) {
    const key = `${r.player}|${r.difficulty}`;
    (groups[key] ||= []).push(r);
  }
  return Object.fromEntries(
    Object.entries(groups).map(([key, rows]) => {
      const [player, difficulty] = key.split('|');
      const wins = Object.fromEntries([...MAJORS, 'draw', 'unresolved'].map(s => [s, 0]));
      for (const r of rows) wins[r.winner || 'unresolved']++;
      return [
        key,
        {
          player,
          difficulty,
          games: rows.length,
          playerWins: rows.filter(r => r.playerWin).length,
          playerWinRate: +(rows.filter(r => r.playerWin).length / rows.length).toFixed(4),
          resolved: rows.filter(r => r.resolved).length,
          winners: wins,
          avgTurns: +average(rows.map(r => r.turnsPlayed)).toFixed(2),
          medianTurns: +median(rows.map(r => r.turnsPlayed)).toFixed(2),
          avgRuntimeMs: +average(rows.map(r => r.elapsedMs)).toFixed(2),
          avgFinalCities: Object.fromEntries(
            MAJORS.map(side => [side, +average(rows.map(r => r.final.cities[side] || 0)).toFixed(2)]),
          ),
          avgFinalUnits: Object.fromEntries(
            MAJORS.map(side => [side, +average(rows.map(r => r.final.units[side] || 0)).toFixed(2)]),
          ),
          avgFinalStrength: Object.fromEntries(
            MAJORS.map(side => [side, +average(rows.map(r => r.final.strength[side] || 0)).toFixed(2)]),
          ),
        },
      ];
    }),
  );
}

function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function markdown(report) {
  const lines = [
    '# Knightmare Conquest long-game balance report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Runs per scenario: **${report.config.runs}** · Max turns: **${report.config.maxTurns}** · Base seed: **${report.config.seed}**`,
    '',
    '> Every faction is AI-controlled. Difficulty matches the live game: the selected player faction is unboosted while its rivals receive Hard/Challenge bonuses.',
    '',
    '| Player | Difficulty | Games | Player wins | Avg turns | B wins | E.U. wins | C.F. wins | Draw | Unresolved |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const player of report.config.players)
    for (const difficulty of report.config.difficulties) {
      const a = report.aggregate[`${player}|${difficulty}`];
      if (!a) continue;
      lines.push(
        `| ${player} | ${difficulty} | ${a.games} | ${a.playerWins} (${pct(a.playerWinRate)}) | ${a.avgTurns} | ${a.winners.britannia} | ${a.winners.eu} | ${a.winners.cf} | ${a.winners.draw} | ${a.winners.unresolved} |`,
      );
    }
  lines.push('', '## Average final city counts', '', '| Player | Difficulty | Britannia | E.U. | C.F. |', '|---|---:|---:|---:|---:|');
  for (const player of report.config.players)
    for (const difficulty of report.config.difficulties) {
      const a = report.aggregate[`${player}|${difficulty}`];
      if (!a) continue;
      lines.push(`| ${player} | ${difficulty} | ${a.avgFinalCities.britannia} | ${a.avgFinalCities.eu} | ${a.avgFinalCities.cf} |`);
    }
  lines.push('', '## Average final unit counts', '', '| Player | Difficulty | Britannia | E.U. | C.F. |', '|---|---:|---:|---:|---:|');
  for (const player of report.config.players)
    for (const difficulty of report.config.difficulties) {
      const a = report.aggregate[`${player}|${difficulty}`];
      if (!a) continue;
      lines.push(`| ${player} | ${difficulty} | ${a.avgFinalUnits.britannia} | ${a.avgFinalUnits.eu} | ${a.avgFinalUnits.cf} |`);
    }
  lines.push(
    '',
    '## Interpretation notes',
    '',
    '- **Normal** is the cleanest faction/AI balance signal because no faction receives difficulty bonuses.',
    '- **Hard/Challenge** measure how well each selected player faction survives against the live game\'s boosted rivals.',
    '- A result can end before world conquest when the selected player capital falls, matching the actual game-over rule.',
    '- Full per-run timelines, economies, force strength and action counts are in `balance-results.json`.',
    '',
  );
  return lines.join('\n');
}

function ensureParent(file) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
}

function main() {
  const config = parseArgs(process.argv.slice(2));
  const results = [];
  const total = config.players.length * config.difficulties.length * config.runs;
  let done = 0;

  for (const player of config.players)
    for (const difficulty of config.difficulties)
      for (let run = 0; run < config.runs; run++) {
        // The same run number uses the same seed in every scenario, making
        // comparisons reproducible without coupling them to loop order.
        const seed = (config.seed + Math.imul(run, 7919)) >>> 0;
        const result = simulate({
          player,
          difficulty,
          seed,
          maxTurns: config.maxTurns,
          snapshotTurns: config.snapshots,
        });
        results.push(result);
        done++;
        if (!config.quiet)
          console.log(
            `[${done}/${total}] ${player} ${difficulty} seed=${seed} -> ${result.winner || 'unresolved'} in ${result.turnsPlayed} turns (${result.elapsedMs.toFixed(0)} ms)`,
          );
      }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    engineRulesVersion: E.RULES_VERSION,
    config,
    aggregate: aggregate(results),
    results,
  };
  const md = markdown(report);
  ensureParent(config.output);
  ensureParent(config.summary);
  fs.writeFileSync(config.output, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(config.summary, md + '\n');
  console.log(`\nWrote ${config.output} and ${config.summary}.`);
  console.log(md);
}

try {
  main();
} catch (error) {
  console.error(error?.stack || error);
  process.exitCode = 1;
}

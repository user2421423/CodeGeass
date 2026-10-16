#!/usr/bin/env node
'use strict';
// Read-only all-AI balance telemetry. Uses the shipped game engine and scenario
// initializers; no alternative movement, production, combat or victory rules.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const report = require('./balance_dashboard_report_expanded.cjs');
// Read the shipped manifest rather than maintaining an incomplete second catalog.
// The manifest only declares a browser loader; no DOM functions are invoked here.
const manifestSource = fs.readFileSync(path.join(__dirname, '../dist/scenario-manifest.js'), 'utf8');
const catalog = vm.runInNewContext(manifestSource +
  '\n;({ entries: SCENARIO_MANIFEST, files: SCENARIO_FILES })');
for (const file of catalog.files) require(path.join(__dirname, '../dist', file));
const missing = catalog.entries.filter(entry => !E.scenarios?.byId?.[entry.id]);
if (missing.length) throw new Error('Missing regional scenario modules: ' + missing.map(v => v.id).join(', '));
const regional = Object.fromEntries(catalog.entries.map(entry => {
  const scenario = E.scenarios.byId[entry.id];
  return [entry.id, { title: scenario.title || entry.title, sides: scenario.sides, scenario }];
}));
const MODES = Object.freeze({
  '2017': { title: '2017 — World War', sides: ['britannia', 'eu', 'cf'], era: 'world' },
  '2018': { title: '2018 — Rise of the U.F.N.', sides: ['britannia', 'eb', 'cf'], era: 'ufn2018' },
  ...regional,
  // Legacy mode names remain accepted, but are excluded from the default matrix.
  invasion: regional['invasion-japan'],
  division: regional['division-japan'],
  europe: regional['european-war']
});
const ALL_MODES = ['2017', '2018', ...catalog.entries.map(v => v.id)];
const DIFFICULTIES = ['normal', 'hard', 'challenge', 'elite'];
const DEFAULT_TURNS = [10, 20, 30, 40, 50];

function parse(argv) {
  const value = (flag, fallback) => {
    const i = argv.indexOf(flag);
    return i === -1 ? fallback : argv[i + 1];
  };
  const number = (flag, fallback, min, max) => {
    const v = Number(value(flag, fallback));
    if (!Number.isSafeInteger(v) || v < min || v > max)
      throw new Error(flag + ' must be an integer from ' + min + ' to ' + max);
    return v;
  };
  const list = (flag, fallback) => String(value(flag, fallback)).split(',').map(s => s.trim()).filter(Boolean);
  const options = {
    modes: list('--modes', 'all'),
    difficulties: list('--difficulties', 'all'),
    shard: value('--shard', null),
    runs: number('--runs', 1, 1, 100),
    seed: number('--seed', 20261007, 0, 4294967295),
    turns: number('--max-turns', 30, 1, 120),
    output: value('--output', 'balance-dashboard.json'),
    html: value('--html', 'balance-dashboard.html'),
    summary: value('--summary', 'balance-dashboard.md'),
    baseline: value('--baseline', null),
    players: list('--players', '')
  };
  options.snapshots = [...new Set(list('--snapshot-turns', DEFAULT_TURNS.join(','))
    .map(Number).filter(t => Number.isInteger(t) && t >= 1 && t <= options.turns))].sort((a, b) => a - b);
  if (!options.snapshots.includes(options.turns)) options.snapshots.push(options.turns);
  options.modes = [...new Set(options.modes.flatMap(m =>
    m === 'all' ? ALL_MODES : m === 'regional' ? catalog.entries.map(v => v.id) :
      m === 'conquest' ? ['2017', '2018'] : [m]))];
  options.difficulties = [...new Set(options.difficulties.flatMap(d =>
    d === 'all' ? DIFFICULTIES : [d]))];
  if (options.shard != null) {
    const match = /^(\d+)\/(\d+)$/.exec(options.shard);
    if (!match || +match[2] < 1 || +match[2] > 64 || +match[1] >= +match[2])
      throw new Error('--shard must be index/count, e.g. 0/8');
    options.modes = options.modes.filter((_, i) => i % +match[2] === +match[1]);
  }
  // Some workers intentionally receive no modes when a small selection is
  // split into more shards than scenarios. They still emit mergeable reports.
  if ((!options.modes.length && options.shard == null) || options.modes.some(m => !MODES[m]))
    throw new Error('Unknown or missing mode; valid: ' + Object.keys(MODES).join(', '));
  if (!options.difficulties.length || options.difficulties.some(d => !DIFFICULTIES.includes(d)))
    throw new Error('Difficulty must be normal, hard, challenge or elite');
  if (options.players.length && options.players.some(p => !options.modes.some(m => MODES[m].sides.includes(p))))
    throw new Error('Unknown player selection');
  for (const file of [options.output, options.html, options.summary])
    if (!file || typeof file !== 'string' || file.startsWith('--')) throw new Error('Invalid output path');
  return options;
}
function createGame(mode, player, difficulty, seed) {
  const cfg = MODES[mode];
  return cfg.scenario ? cfg.scenario.create(player, difficulty, seed) :
    E.createGame(player, difficulty, 'conquest', seed, cfg.era);
}
function allUnits(g) {
  return g.units.flatMap(u => [u, ...(u.cargo || [])]).filter(u => u.hp > 0);
}
function count(g, sides, kind) {
  const result = Object.fromEntries(sides.map(s => [s, 0]));
  for (const item of kind === 'cities' ? g.stations : allUnits(g))
    if (Object.hasOwn(result, kind === 'cities' ? item.owner : item.side))
      result[kind === 'cities' ? item.owner : item.side]++;
  return result;
}
function captureSnapshot(g, sides, turn) {
  const units = allUnits(g);
  return {
    turn, cities: count(g, sides, 'cities'), units: count(g, sides, 'units'),
    strength: Object.fromEntries(sides.map(side => [side,
      +units.filter(u => u.side === side)
        .reduce((sum, u) => sum + u.stack * Math.max(0.2, u.hp / Math.max(1, E.maxHP(u))), 0).toFixed(2)])),
    resources: Object.fromEntries(sides.map(side => [side, {
      credits: Math.round(g.economy?.[side]?.credits || 0),
      industry: Math.round(g.economy?.[side]?.industry || 0),
      sakuradite: Math.round(g.economy?.[side]?.sakuradite || 0)
    }]))
  };
}
function tally(sides) {
  return Object.fromEntries(sides.map(s => [s, 0]));
}
function coastalCity(g, city) {
  return !!city.portAt || E.adjacent(g, city).some(p => p.terrain === 'sea');
}
function winnerFor(g, mode, sides, turn) {
  const cfg = MODES[mode];
  if (cfg.scenario) return cfg.scenario.winner(g)?.winner || null;
  const cities = count(g, sides, 'cities');
  if (mode === '2018') {
    const brit = cities.britannia + cities.eb, ufn = cities.cf;
    if (!ufn) return 'britannian';
    if (!brit) return 'cf';
    if (turn >= 120) return brit === ufn ? 'draw' : brit > ufn ? 'britannian' : 'cf';
    return null;
  }
  const active = sides.filter(side => cities[side] > 0);
  if (active.length === 1) return active[0];
  if (turn >= 120) {
    const highest = Math.max(...sides.map(s => cities[s]));
    const leaders = sides.filter(s => cities[s] === highest);
    return leaders.length === 1 ? leaders[0] : 'draw';
  }
  return null;
}
// An observer match still starts from a real, player-configured operation;
// all factions are controlled by the shipped AI. This preserves the actual
// asymmetric difficulty boosts and scenario alliance transitions.
function simulate(mode, player, difficulty, seed, maxTurns, snapshots) {
  const cfg = MODES[mode], sides = cfg.sides, g = createGame(mode, player, difficulty, seed);
  const initial = captureSnapshot(g, sides, 0);
  const metrics = {
    attacks: tally(sides), moves: tally(sides), deployments: tally(sides),
    seaLandings: tally(sides), navalLosses: tally(sides),
    unitsBuilt: tally(sides), unitsLost: tally(sides),
    hostileLossesByPlayer: tally(sides),
    cityCaptures: tally(sides), coastalCaptures: tally(sides),
    frontSwitches: tally(sides), pairedAttacks: {},
    cityTransfers: [], navalLandingLog: [], frontSwitchLog: [],
    navalSuccesses: tally(sides), commanderStarts: tally(sides),
    commanderSurvivors: tally(sides), commandersLost: tally(sides),
    longestStallTurns: 0, stalemate: false
  };
  const seen = new Map();
  const lastAssignments = Object.fromEntries(sides.map(side => [side, {}]));
  const owners = new Map(g.stations.map(s => [s.id, s.owner]));
  const recentLandings = [];
  // Track only officers present at scenario setup; replacements aren't retroactively
  // counted as survival, and embarked officers are included.
  const openingCommanders = allUnits(g).filter(u => u.cmd).map(u => ({
    id: u.id, side: u.side, commander: u.cmd
  }));
  for (const u of openingCommanders)
    if (Object.hasOwn(metrics.commanderStarts, u.side)) metrics.commanderStarts[u.side]++;
  const timeline = [initial];
  let winner = null, played = 0, initialObservationComplete = false;
  let idleTurns = 0;
  function inspect() {
    const current = new Map(allUnits(g).map(u => [u.id, u]));
    for (const [id, u] of current)
      if (!seen.has(id)) {
        seen.set(id, { side: u.side, naval: E.TYPES[u.type]?.naval === 'ship', wasStarting: !initialObservationComplete });
        if (initialObservationComplete) metrics.unitsBuilt[u.side] = (metrics.unitsBuilt[u.side] || 0) + 1;
      }
    for (const [id, unit] of seen) if (!current.has(id) && !unit.lost) {
      unit.lost = true;
      if (Object.hasOwn(metrics.unitsLost, unit.side)) {
        metrics.unitsLost[unit.side]++;
        if (unit.naval) metrics.navalLosses[unit.side]++;
      }
      // Attribute opposing casualties using the alliance/hostility rules
      // effective when the formation disappears, not just faction inequality.
      for (const perspective of sides)
        if (perspective !== unit.side && E.foe(g, perspective, unit.side))
          metrics.hostileLossesByPlayer[perspective]++;
    }
    for (const city of g.stations) {
      const from = owners.get(city.id);
      if (from === city.owner) continue;
      if (Object.hasOwn(metrics.cityCaptures, city.owner)) {
        metrics.cityCaptures[city.owner]++;
        const coastal = coastalCity(g, city);
        if (coastal) metrics.coastalCaptures[city.owner]++;
      }
      metrics.cityTransfers.push({ turn: g.turn, city: city.name, from, to: city.owner });
      // A landing counts as operationally successful only when a nearby hostile
      // coastal city is captured within five turns. This is a proxy, not proof
      // the landing force itself made the capture.
      if (coastalCity(g, city) && from !== city.owner)
        for (const landing of recentLandings) {
          if (landing.side !== city.owner || landing.success ||
              g.turn - landing.turn > 5 || g.turn < landing.turn ||
              E.distance(landing.to, city, g) > 5) continue;
          landing.success = true;
          metrics.navalSuccesses[landing.side]++;
        }
      owners.set(city.id, city.owner);
    }
  }
  function inspectFronts(side) {
    const current = g.ai?.[side]?.assignments || {};
    const previous = lastAssignments[side];
    for (const [id, assignment] of Object.entries(current)) {
      const front = typeof assignment === 'object' ? assignment.front : assignment;
      if (previous[id] != null && previous[id] !== front) {
        metrics.frontSwitches[side]++;
        metrics.frontSwitchLog.push({ turn: g.turn, side, unitId: +id, from: previous[id], to: front });
      }
      previous[id] = front;
    }
    for (const id of Object.keys(previous)) if (!Object.hasOwn(current, id)) delete previous[id];
  }
  function actionEvents(side, actor, events, preTargets) {
    for (const o of events || []) {
      if (o.kind === 'attack') {
        metrics.attacks[side]++;
        const enemy = o.to && preTargets.get(o.to.c + ',' + o.to.r);
        if (enemy && enemy !== side) {
          const key = side + '->' + enemy;
          metrics.pairedAttacks[key] = (metrics.pairedAttacks[key] || 0) + 1;
        }
      } else if (o.kind === 'deploy') {
        metrics.deployments[side]++;
        if (actor && E.TYPES[actor.type]?.naval === 'ship' && o.to &&
            E.tile(g, o.to.c, o.to.r)?.terrain !== 'sea') {
          metrics.seaLandings[side]++;
          {
            const landing = { side, turn: g.turn, to: o.to, success: false };
            recentLandings.push(landing);
            metrics.navalLandingLog.push({ side, turn: g.turn, c: o.to.c, r: o.to.r });
          }
        }
      } else if (o.kind === 'move') {
        metrics.moves[side]++;
        if (o.from && o.to && E.tile(g, o.from.c, o.from.r)?.terrain === 'sea' &&
            E.tile(g, o.to.c, o.to.r)?.terrain !== 'sea') {
          metrics.seaLandings[side]++;
          const landing = { side, turn: g.turn, to: o.to, success: false };
          recentLandings.push(landing);
          metrics.navalLandingLog.push({ side, turn: g.turn, c: o.to.c, r: o.to.r });
        }
      }
    }
  }
  inspect();
  initialObservationComplete = true;
  const started = process.hrtime.bigint();
  for (let turn = 1; turn <= maxTurns; turn++) {
    const progressBefore = metrics.cityTransfers.length +
      Object.values(metrics.unitsLost).reduce((a, b) => a + b, 0);
    g.turn = turn;
    if (cfg.scenario) cfg.scenario.onTurn(g);
    for (const side of g.order) {
      if (!sides.includes(side) || !E.alive(g, side)) continue;
      if (!(turn === 1 && side === g.order[0])) E.beginTurn(g, side, turn > 1);
      // The normal UI stops at human elimination. In an observer run the
      // surviving AI powers must continue, with no fictitious victor assigned.
      g.over = null;
      E.aiProduction(g);
      inspect();
      const ids = g.units.filter(u => u.hp > 0 && u.side === side && !u.attacked)
        .sort((a, b) => E.aiOrderPriority(g, a) - E.aiOrderPriority(g, b) || a.id - b.id)
        .map(u => u.id);
      inspectFronts(side);
      for (let step = 0; step < ids.length; step++) {
        // Mirror the live browser's bounded reordering after earlier orders.
        const next = E.aiNextActor(g, ids, step);
        if (next !== step) [ids[step], ids[next]] = [ids[next], ids[step]];
        const id = ids[step];
        const actor = g.units.find(u => u.id === id && u.hp > 0 && u.side === side);
        if (!actor) continue;
        const targetOwners = new Map(g.units.filter(u => u.hp > 0).map(u => [u.c + ',' + u.r, u.side]));
        for (const s of g.stations) if (!targetOwners.has(s.c + ',' + s.r))
          targetOwners.set(s.c + ',' + s.r, s.owner);
        const events = E.aiOrder(g, id);
        actionEvents(side, actor, events, targetOwners);
        inspect();
        g.over = null;
      }
      inspectFronts(side);
      g.over = null;
    }
    inspect();
    played = turn;
    winner = winnerFor(g, mode, sides, turn);
    const progressAfter = metrics.cityTransfers.length +
      Object.values(metrics.unitsLost).reduce((a, b) => a + b, 0);
    const opposingCities = sides.filter(side => g.stations.some(s => s.owner === side)).length >= 2;
    idleTurns = opposingCities && progressAfter === progressBefore ? idleTurns + 1 : 0;
    metrics.longestStallTurns = Math.max(metrics.longestStallTurns, idleTurns);
    if (snapshots.includes(turn) || winner) timeline.push(captureSnapshot(g, sides, turn));
    if (winner) break;
  }
  const survivors = new Set(allUnits(g).map(u => u.id));
  for (const u of openingCommanders) {
    const field = survivors.has(u.id) ? 'commanderSurvivors' : 'commandersLost';
    if (Object.hasOwn(metrics[field], u.side)) metrics[field][u.side]++;
  }
  // Eight turns without a city transfer or a formation loss while opposing
  // city owners remain is flagged as an AI stalemate, not as a game draw.
  metrics.stalemate = !winner && maxTurns >= 8 && idleTurns >= 8 &&
    sides.filter(side => g.stations.some(s => s.owner === side)).length >= 2;
  const selectedLosses = metrics.unitsLost[player] || 0;
  const opposingLosses = metrics.hostileLossesByPlayer[player] || 0;
  return {
    mode, player, difficulty, seed, maxTurns, turnsPlayed: played,
    resolved: !!winner, winner, result: winner || 'unresolved',
    initial, final: captureSnapshot(g, sides, played), timeline, metrics,
    casualtyRatio: selectedLosses ? +(opposingLosses / selectedLosses).toFixed(3) : null,
    casualtyTotals: { friendly: selectedLosses, opposing: opposingLosses },
    elapsedMs: +(Number(process.hrtime.bigint() - started) / 1e6).toFixed(1),
    msPerTurn: played ? +(Number(process.hrtime.bigint() - started) / 1e6 / played).toFixed(1) : 0
  };
}
function run(options) {
  const rows = [];
  for (const mode of options.modes) {
    const sides = MODES[mode].sides.filter(side => !options.players.length || options.players.includes(side));
    for (const difficulty of options.difficulties)
      for (const player of sides)
        for (let index = 0; index < options.runs; index++) {
          const seed = (options.seed + Math.imul(index, 7919)) >>> 0;
          const item = simulate(mode, player, difficulty, seed, options.turns, options.snapshots);
          rows.push(item);
          process.stdout.write(mode + ' / ' + player + ' / ' + difficulty + ' / ' + seed +
            ': ' + item.result + ' at turn ' + item.turnsPlayed + '\n');
        }
  }
  return {
    schema: 2, generatedAt: new Date().toISOString(), engine: 'Knightmare Conquest (shipped rules)',
    configuration: { modes: options.modes, difficulties: options.difficulties,
      players: options.players, runs: options.runs, seed: options.seed,
      maxTurns: options.turns, snapshotTurns: options.snapshots, shard: options.shard },
    modes: Object.fromEntries(options.modes.map(m => [m, { title: MODES[m].title, sides: MODES[m].sides }])),
    rows
  };
}
function write(filename, contents) {
  fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  fs.writeFileSync(filename, contents);
}
function main() {
  const opt = parse(process.argv.slice(2));
  const current = run(opt), baseline = opt.baseline ? JSON.parse(fs.readFileSync(opt.baseline, 'utf8')) : null;
  const comparison = report.compare(current, baseline);
  write(opt.output, JSON.stringify(current, null, 2) + '\n');
  write(opt.summary, report.markdown(current, comparison));
  write(opt.html, report.html(current, comparison, baseline));
  process.stdout.write('Report: ' + opt.output + ', ' + opt.summary + ', ' + opt.html + '\n');
}
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}
module.exports = { MODES, parse, createGame, winnerFor, captureSnapshot, simulate, run };

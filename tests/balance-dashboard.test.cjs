'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const runner = require('../tools/balance_dashboard.cjs');
const view = require('../tools/balance_dashboard_report.cjs');

test('all five operations and every playable faction are registered', () => {
  assert.deepEqual(Object.keys(runner.MODES), ['2017', '2018', 'invasion', 'division', 'europe']);
  for (const [id, mode] of Object.entries(runner.MODES)) {
    for (const side of mode.sides) {
      const g = runner.createGame(id, side, 'normal', 42);
      assert.equal(g.mode, mode.scenario ? 'scenario' : 'conquest');
      assert.equal(g.player, side);
      assert.equal(g.phase, side);
      assert.ok(g.units.length);
      assert.ok(g.stations.length);
    }
  }
});

test('CLI validates missing modes and unrecognized difficulties', () => {
  assert.throws(() => runner.parse(['--modes', 'unknown']), /Unknown/);
  assert.throws(() => runner.parse(['--difficulties', 'impossible']), /Difficulty/);
  assert.throws(() => runner.parse(['--runs', '0']), /integer/);
  const opts = runner.parse(['--modes', '2017', '--runs', '2', '--max-turns', '12']);
  assert.deepEqual(opts.modes, ['2017']);
  assert.equal(opts.runs, 2);
  assert.deepEqual(opts.snapshots, [10, 12]);
});

test('victory checks distinguish 2018 coalition and 44-city scenario conquest', () => {
  const coalition = runner.createGame('2018', 'eb', 'normal', 19);
  assert.equal(runner.winnerFor(coalition, '2018', runner.MODES['2018'].sides, 15), null);
  for (const city of coalition.stations) if (city.owner === 'cf') city.owner = 'britannia';
  assert.equal(runner.winnerFor(coalition, '2018', runner.MODES['2018'].sides, 15), 'britannian');
  const japan = runner.createGame('division', 'cf', 'normal', 19);
  assert.equal(runner.winnerFor(japan, 'division', runner.MODES.division.sides, 15), null);
  for (const city of japan.stations) city.owner = 'cf';
  assert.equal(runner.winnerFor(japan, 'division', runner.MODES.division.sides, 15), 'cf');
});

function fake(mode, player, seed, cities, result) {
  const sides = ['britannia', 'cf'];
  const item = {
    mode, player, difficulty: 'normal', seed, resolved: result !== null,
    winner: result, result: result || 'unresolved', elapsedMs: 100,
    metrics: {
      attacks: { britannia: 2, cf: 1 }, unitsLost: { britannia: 1, cf: 1 },
      seaLandings: { britannia: 0, cf: 0 }, frontSwitches: { britannia: 0, cf: 0 }
    },
    initial: { turn: 0, cities: { britannia: 10, cf: 10 } },
    final: { turn: 8, cities: { britannia: cities, cf: 20 - cities } },
    timeline: [
      { turn: 0, cities: { britannia: 10, cf: 10 } },
      { turn: 8, cities: { britannia: cities, cf: 20 - cities } }
    ]
  };
  return item;
}
const pack = rows => ({
  schema: 1, generatedAt: '2026-10-13T00:00:00Z',
  configuration: { modes: ['2017'], maxTurns: 8, difficulties: ['normal'] },
  modes: { '2017': { title: '2017 World War', sides: ['britannia', 'cf'] } }, rows
});
test('paired comparison only matches identical setup and seed', () => {
  const base = pack([fake('2017', 'britannia', 13, 11, null)]);
  const latest = pack([fake('2017', 'britannia', 13, 14, 'britannia')]);
  const diff = view.compare(latest, base);
  assert.equal(diff.rows[0].cityChange, 3);
  assert.equal(diff.rows[0].afterWin, true);
  assert.equal(diff.byGroup['2017|britannia|normal'].winChange, 1);
  const html = view.html(latest, diff, base);
  assert.match(html, /<!doctype html>/);
  assert.match(html, /dashed: baseline/);
  assert.match(html, /<svg /);
  assert.match(view.markdown(latest, diff), /Matched comparison/);
  assert.throws(() => view.compare(pack([fake('2017', 'britannia', 99, 14, null)]), base), /Missing baseline/);
  assert.throws(() => view.compare(latest, pack([...base.rows, fake('2017', 'cf', 13, 11, null)])), /extra runs/);
});

test('one real one-turn world simulation keeps legal results and a timeline', () => {
  const r = runner.simulate('2017', 'britannia', 'normal', 42, 1, [1]);
  assert.equal(r.mode, '2017');
  assert.equal(r.turnsPlayed, 1);
  assert.equal(r.timeline[0].turn, 0);
  assert.equal(r.timeline.at(-1).turn, 1);
  assert.equal(Object.values(r.final.cities).reduce((n, x) => n + x, 0) <= 168, true);
  assert.ok(r.metrics.attacks.britannia >= 0);
  assert.ok(r.metrics.unitsLost.cf >= 0);
});

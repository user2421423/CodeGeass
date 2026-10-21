#!/usr/bin/env node
'use strict';
// 2018-only Britannian deployment regression. Run after tools/build_sources.cjs.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const region = u => {
  const lat = 74 - u.r * (128 / 75);
  const lon = -180 + (u.c + 0.5 + 0.5 * (u.r & 1)) * 2;
  if (lon >= 90 && lon <= 124 && lat >= 46 && lat <= 65) return 'Siberia';
  if (lon >= 125 && lon <= 150 && lat >= 25 && lat <= 48) return 'Japan';
  if (lon >= 115 && lon < 130 && lat >= 4 && lat <= 25) return 'Philippines';
  if (lon >= 28 && lon <= 65 && lat >= 21 && lat <= 42) return 'Middle East';
  if (lon >= 8 && lon <= 42 && lat >= -32 && lat <= 21) return 'African UFN front';
  return 'OUTSIDE';
};
for (const player of ['britannia','eb','cf']) {
  const g = E.createGame(player, 'normal', 'conquest', 20261021, 'ufn2018');
  const units = g.units.filter(u => u.side === 'britannia' && u.hp > 0);
  const land = units.filter(u => !E.TYPES[u.type].naval);
  const air = units.filter(u => E.TYPES[u.type].air);
  const navy = units.filter(u => E.TYPES[u.type].naval && !E.TYPES[u.type].air);
  assert.equal(land.length, 21, player + ': only 21 commander-led Britannian land formations spawn');
  assert.ok(land.every(u => !!u.cmd), player + ': no anonymous Britannian land starts');
  assert.equal(navy.length, 7, player + ': all 7 Britannian naval formations spawn');
  assert.equal(air.length, 1, player + ': Britannian frontline airship spawns');
  const starts = { 'Middle East':0, 'Japan':0, 'Philippines':0, 'Siberia':0, 'African UFN front':0 };
  for (const u of units) assert.notEqual(region(u), 'OUTSIDE',
    player + ': unexpected off-front Britannian ' + (u.cmd || u.type) +
    ' at ' + u.c + ',' + u.r);
  for (const u of land) starts[region(u)]++;
  assert.equal(Object.values(starts).reduce((total,n) => total + n, 0), 21,
    player + ': all Britannian land formations remain on permitted fronts');
  assert.ok(Object.values(starts).every(n => n > 0),
    player + ': all five designated fronts retain Britannian commander formations');
  assert.equal(land.filter(u => u.cmd).length, 21, player + ': all 21 Britannian commanders deploy');
  const alliedLand = g.units.filter(u => u.side === 'eb' && !E.TYPES[u.type].naval);
  const ufnLand = g.units.filter(u => u.side === 'cf' && !E.TYPES[u.type].naval);
  const namedBritannia = land.filter(u => u.cmd);
  const namedEuroBritannia = alliedLand.filter(u => u.cmd);
  assert.equal(alliedLand.length, 38, player + ': all Euro-Britannian land formations spawn');
  assert.equal(namedEuroBritannia.length, 10, player + ': all Euro-Britannian commanders deploy');
  assert.ok([...namedBritannia, ...namedEuroBritannia].every(u => u.stack === 3),
    player + ': every Britannian and Euro-Britannian commander leads exactly three frames');
  assert.equal(ufnLand.length, 69, player + ': exactly 69 named U.F.N. ground starts');
  assert.ok(ufnLand.every(u => !!u.cmd), player + ': no anonymous U.F.N. land starts');
  assert.equal(ufnLand.filter(u => u.cmd).length, 69,
    player + ': all U.F.N. commanders and formations remain deployed');
  assert.equal(ufnLand.reduce((total,u) => total + u.stack, 0), 104,
    player + ': U.F.N. retains all commander frames, omitting 3 spare frames');
  assert.equal(land.reduce((total,u) => total + u.stack, 0), 63,
    player + ': 21 Britannian commanders each retain three frames');
  assert.equal(alliedLand.reduce((total,u) => total + u.stack, 0), 77,
    player + ': Euro Britannian land frames are unchanged');
  assert.equal(alliedLand.filter(u => !u.cmd).length, 28,
    player + ': Euro Britannia keeps its 28 anonymous ground formations');
  assert.equal(g.units.filter(u => u.side === 'cf' && E.TYPES[u.type].naval && !E.TYPES[u.type].air).length, 8,
    player + ': the U.F.N. retains its eight navy formations');
  assert.equal(g.units.filter(u => u.side === 'eb' && E.TYPES[u.type].naval && !E.TYPES[u.type].air).length, 6,
    player + ': Euro Britannia retains its six navy formations');
  assert.deepEqual(
    ['britannia','eb','cf'].map(side => [side,
      g.economy[side].credits, g.economy[side].industry, g.economy[side].science]),
    [['britannia',650,260,60],['eb',450,190,36],['cf',800,350,140]],
    player + ': use the approved 2018 starting resources without changing science');
  if (player === 'cf') console.log('UFN2018_BALANCE ' + JSON.stringify(
    Object.fromEntries(['britannia','eb','cf'].map(side => {
      const units = g.units.filter(u => u.side === side && !E.TYPES[u.type].naval);
      return [side, {
        formations: units.length,
        frames: units.reduce((total,u)=>total+u.stack,0),
        commanderLed: units.filter(u=>u.cmd).length,
        commanderFrames: units.filter(u=>u.cmd).reduce((total,u)=>total+u.stack,0),
        startingCredits: g.economy[side].credits,
        startingIndustry: g.economy[side].industry,
        startingScience: g.economy[side].science
      }];
    }))
  ));
  assert.equal(region(land.find(u => u.cmd === 'charles')), 'Middle East');
  assert.equal(region(land.find(u => u.cmd === 'bismarck')), 'Siberia');
  assert.equal(region(air[0]), 'Middle East');
  for (const u of land.filter(u => region(u) === 'Siberia')) {
    assert.equal(E.tile(g,u.c,u.r).owner, 'eb',
      'Britannian Siberian contingent must stage on allied Euro-Britannian territory');
  }
}
// Higher-difficulty reinforcements must also satisfy this 2018-specific rule.
for (const difficulty of ['hard','challenge']) {
  for (const player of ['britannia','eb','cf']) {
    const game = E.createGame(player,difficulty,'conquest',20261021,'ufn2018');
    for (const side of ['britannia','cf']) {
      const land = game.units.filter(u => u.hp > 0 && u.side === side && !E.TYPES[u.type].naval);
      assert.ok(land.every(u => !!u.cmd),
        difficulty + '/' + player + ': every ' + side + ' ground formation has a commander');
      assert.equal(land.length, side === 'britannia' ? 21 : 69,
        difficulty + '/' + player + ': no anonymous reinforcement for ' + side);
    }
  }
}
const world = E.createGame('britannia','normal','conquest',20261021,'world');
assert.equal(world.economy.britannia.credits, 500, '2017 starting treasury remains untouched');
assert.ok(world.units.some(u => u.side === 'britannia' && region(u) === 'OUTSIDE'),
  'The 2017 world war keeps its original worldwide Britannian deployments');
console.log('2018 Britannian frontlines, navy, airship, Siberian allied staging, and 2017 isolation: PASS');

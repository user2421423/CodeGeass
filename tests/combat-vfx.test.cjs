'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness(reduced = false) {
  const attacker = { id: 1, type: 'frame', side: 'britannia', c: 1, r: 1, hp: 100 };
  const defender = { id: 2, type: 'infantry', side: 'bk', c: 2, r: 1, hp: 70 };
  const splash = { id: 3, type: 'infantry', side: 'bk', c: 3, r: 1, hp: 20 };
  const before = new Map([attacker, defender, splash].map(u => [u.id, { ...u }]));
  const sound = [];
  const world = {
    effects: [], game: { units: [attacker, defender, splash] },
    E: { TYPES: { frame: { cls: 'heavy' }, infantry: { cls: 'light' } } },
    SFX: { weapon: cls => cls === 'heavy' ? 'railgun' : 'laser',
      play: (...args) => sound.push(args) },
    reducedMotion: () => reduced, onScreen: () => true,
    requestMapFrame() {}, skipAI: false, aiSide: null,
  };
  vm.createContext(world);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist/ui/effects.js'), 'utf8'), world);
  return { world, attacker, defender, splash, before, sound };
}

test('critical damage and counterfire pop only at their corresponding impacts', () => {
  const { world, attacker, before } = harness();
  world.addCombatEffects({
    from: { c: 1, r: 1 }, to: { c: 2, r: 1 },
    crit: true, counter: 18, damage: 41, shieldDamage: 14, destroyed: false,
    hit: [{ id: 2, c: 2, r: 1, damage: 41 }],
  }, attacker, before);
  const shots = world.effects.filter(e => e.kind === 'shot');
  assert.equal(shots.length, 2);
  assert.equal(shots[0].weapon, 'railgun');
  assert.equal(shots[1].weapon, 'laser');
  assert.equal(shots[1].counter, true);
  assert(shots[1].delay >= shots[0].impact, 'retaliation follows the opening hit');
  const labels = world.effects.filter(e => e.kind === 'text');
  assert.equal(labels.length, 3);
  const impact = shots[0].impact;
  assert(labels.filter(e => e.text.includes('CRIT') || e.text.includes('DEF'))
    .every(e => e.delay === impact), 'initial hit numbers wait for impact');
  assert(labels.find(e => e.text.includes('COUNTER')).delay > impact,
    'counter damage waits for retaliatory impact');
});

test('splash and counter kills get correctly timed wrecks and individual explosions', () => {
  const { world, attacker, before } = harness();
  world.game.units = [{ id: 2, type: 'infantry', side: 'bk', c: 2, r: 1, hp: 30 }];
  world.addCombatEffects({
    from: { c: 1, r: 1 }, to: { c: 2, r: 1 }, crit: false,
    counter: 50, destroyed: false, hit: [
      { id: 2, c: 2, r: 1, damage: 40 },
      { id: 3, c: 3, r: 1, damage: 20 },
    ],
  }, attacker, before);
  const blasts = world.effects.filter(e => e.kind === 'blast');
  const wrecks = world.effects.filter(e => e.kind === 'wreck');
  assert.equal(blasts.length, 2, 'splash kill and counterfire kill both explode');
  assert.equal(wrecks.length, 2);
  const counterWreck = wrecks.find(e => e.to.c === 1);
  const splashWreck = wrecks.find(e => e.to.c === 3);
  assert(counterWreck.delay > splashWreck.delay);
  assert(world.effects.some(e => e.kind === 'text' && e.text.startsWith('COUNTER')));
});

test('reduced motion still delays feedback and avoids long combat animations', () => {
  const { world, attacker, before } = harness(true);
  world.addCombatEffects({
    from: { c: 1, r: 1 }, to: { c: 2, r: 1 },
    crit: false, counter: 9, destroyed: true,
    hit: [{ id: 2, c: 2, r: 1, damage: 70 }],
  }, attacker, before);
  const shot = world.effects.find(e => e.kind === 'shot');
  assert.equal(shot.duration, 0.18);
  assert(world.effects.find(e => e.kind === 'text').delay > 0);
  assert(world.effects.some(e => e.kind === 'blast'));
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { E } = require('../scenario_sim.cjs');

const heavy = 'vercingetorix', superHeavy = 'ahura_mazda';
function ordinaryEuroArmor(g, side = 'eb') {
  for (const u of E.allUnits(g)) {
    if (u.side !== side || u.elite) continue;
    const t = E.TYPES[u.type];
    if (t.naval || t.side === 'neutral') continue;
    if (t.cls === 'heavy') assert.equal(u.type, heavy, 'Euro-Britannian heavy uses Vercingetorix');
    if (t.cls === 'super') assert.equal(u.type, superHeavy, 'Euro-Britannian super-heavy uses Ahura Mazda');
  }
}

test('Euro Britannia keeps its own armor in the factory, AI lineup and 2018 Conquest', () => {
  assert.equal(E.ROSTER.eb.heavy, heavy);
  assert.equal(E.ROSTER.eb.super, superHeavy);
  assert.equal(E.typeFor('eb', 'heavy'), heavy);
  assert.equal(E.typeFor('eb', 'super'), superHeavy);
  const g = E.createGame('eb', 'normal', 'conquest', 303, 'ufn2018');
  ordinaryEuroArmor(g);
  assert.equal(E.lineupOf(g, 'eb').heavy, heavy);
  assert.equal(E.lineupOf(g, 'eb').super, superHeavy);
  const town = g.stations.find(s => s.owner === 'eb');
  assert.ok(town, 'Euro Britannia owns a city');
  const options = E.automationUnitOptions(g, town, 'eb');
  assert.ok(options.includes(heavy), 'city automation can produce Vercingetorix');
  assert.ok(options.includes(superHeavy), 'city automation can produce Ahura Mazda');
  assert.equal(E.buyReason(g, town, 'vincent_commander', 1), 'Not built by this faction');
  assert.equal(E.buyReason(g, town, 'brighton', 1), 'Not built by this faction');
  const mixed = {
    ...g, lineup: { eb: { heavy: 'vincent_commander', super: 'brighton' } },
    buildable: { eb: ['glasgow', 'vincent_commander', 'brighton'] },
  };
  assert.deepEqual(E.buildableTypes(mixed, 'eb'), ['glasgow', heavy, superHeavy]);
  assert.equal(E.typeFor('eb', 'heavy', mixed), heavy);
  assert.equal(E.typeFor('eb', 'super', mixed), superHeavy);
});

test('Euro Britannian births and old save units normalize without changing class stats or damage', () => {
  const g = E.createGame('eb', 'normal', 'conquest', 304, 'ufn2018');
  const sample = g.units.find(u => u.side === 'eb' && !u.elite && !E.TYPES[u.type].naval);
  assert.ok(sample);
  assert.equal(E.newUnit(g, 'vincent_commander', 'eb', sample.c, sample.r).type, heavy);
  assert.equal(E.newUnit(g, 'brighton', 'eb', sample.c, sample.r).type, superHeavy);
  assert.equal(E.TYPES[heavy].hp, E.TYPES.vincent_commander.hp);
  assert.equal(E.TYPES[heavy].attack, E.TYPES.vincent_commander.attack);
  assert.equal(E.TYPES[superHeavy].hp, E.TYPES.brighton.hp);
  assert.equal(E.TYPES[superHeavy].attack, E.TYPES.brighton.attack);
  const legacy = g.units.find(u => u.type === heavy && !u.elite);
  assert.ok(legacy);
  legacy.type = 'vincent_commander';
  legacy.hp = Math.round(E.maxHP(legacy) * 0.5);
  const savedFraction = legacy.hp / E.maxHP(legacy);
  const restored = E.migrateSave(JSON.parse(JSON.stringify(g)));
  assert.ok(restored, '2018 save remains loadable');
  const fixed = restored.units.find(u => u.id === legacy.id);
  assert.equal(fixed.type, heavy);
  assert.ok(Math.abs(fixed.hp / E.maxHP(fixed) - savedFraction) < 0.015);
});

test('European War and Shin breakaway use Euro Britannian regular armor; Elite armies remain Imperial elites', () => {
  for (const id of ['european-war', 'shin-independence']) {
    const scenario = E.scenarios.byId[id];
    assert.ok(scenario, id + ' is registered');
    for (const difficulty of ['normal', 'hard', 'challenge', 'elite']) {
      const player = id === 'european-war' ? 'eb' : 'shinregime';
      const g = scenario.create(player, difficulty, 305);
      if (id === 'european-war' && difficulty !== 'elite') ordinaryEuroArmor(g);
      if (id === 'shin-independence') {
        assert.equal(g.scenario.equipment.shinregime, 'eb');
        assert.equal(E.typeFor('shinregime', 'heavy', g), heavy);
        assert.equal(E.typeFor('shinregime', 'super', g), superHeavy);
        if (difficulty !== 'elite') {
          for (const u of E.allUnits(g).filter(u => u.side === 'shinregime' && !u.elite)) {
            const cls = E.TYPES[u.type].cls;
            if (cls === 'heavy') assert.equal(u.type, heavy);
            if (cls === 'super') assert.equal(u.type, superHeavy);
          }
        }
      }
      if (difficulty === 'elite') assert.ok(g.units.some(u => u.elite), 'Elite conversion remains active');
    }
  }
});

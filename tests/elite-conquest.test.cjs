const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');

function rich(g, side) {
  Object.assign(g.economy[side], { credits: 100000, industry: 100000, sakuradite: 100000, science: 100000 });
}
function clearCity(g, s) {
  // The test isolates factory rules from starting-city occupation.
  g.units = g.units.filter(u => u.c !== s.c || u.r !== s.r);
}

test('Elite is selectable and replaces all initial nonnaval forces, including player and neutral guards', () => {
  assert.equal(E.DIFFICULTIES.elite.name, 'Elite');
  for (const side of E.MAJORS) {
    const normal = E.createGame(side, 'normal', 'conquest', 20261012);
    const g = E.createGame(side, 'elite', 'conquest', 20261012);
    assert.equal(g.units.length, normal.units.length);
    assert.deepEqual(g.stations.map(s => s.owner), normal.stations.map(s => s.owner));
    assert.deepEqual(g.units.map(u => [u.id, u.c, u.r, u.side]), normal.units.map(u => [u.id, u.c, u.r, u.side]));
    for (let i = 0; i < g.units.length; i++) {
      const u = g.units[i], before = normal.units[i];
      if (E.TYPES[before.type].naval) {
        assert.equal(u.type, before.type, 'navy and amphibious types do not change');
        assert.equal(u.stack, before.stack, 'navy/amphibious stacks do not change');
      } else {
        assert(E.TYPES[u.type].elite, 'all land units must use elite frames: ' + before.side);
        assert(u.elite && u.eliteStart);
        assert.equal(u.eliteLevel, 1);
        assert.equal(u.stack, 1);
        assert.equal(u.hp, E.maxHP(u));
        if (E.MAJORS.includes(u.side))
          assert(E.ELITE_FORCES[u.elite].availableTo.includes(u.side), 'starting elite belongs to faction');
      }
    }
    assert(g.units.some(u => u.side === side && u.eliteStart));
    assert(g.units.some(u => u.side === 'neutral' && u.eliteStart));
    assert.deepEqual(g.eliteDeployed, {}, 'starting elites do not consume player factory allowances');
  }
});

test('Player retains ordinary recruitment and may deploy each elite only once without HQ unlocks', () => {
  const g = E.createGame('britannia', 'elite', 'conquest', 19);
  const cities = g.stations.filter(s => s.owner === g.player && s.tier >= 1).slice(0, 3);
  assert.equal(cities.length, 3);
  cities.forEach(s => clearCity(g, s));
  rich(g, g.player);
  const profile = {};
  assert.equal(E.eliteRecord(profile, 'cornelia_gloucester').level, 0, 'start locked in HQ');
  const id = 'cornelia_gloucester', eliteType = E.ELITE_FORCES[id].type;
  assert.equal(E.eliteDeployReason(g, cities[0], id, profile), null);
  const first = E.deployElite(g, cities[0].id, id, profile);
  assert(first.ok, first.reason);
  assert.equal(first.unit.type, eliteType);
  assert.equal(first.unit.eliteLevel, 1);
  assert.equal(E.eliteDeployReason(g, cities[1], id, profile), 'Already deployed in this operation');
  assert.equal(E.deployElite(g, cities[1].id, id, profile).ok, false);
  const normal = E.recruit(g, cities[2].id, E.typeFor(g.player, 'scout'), 1);
  assert(normal.ok, normal.reason);
  assert(!E.TYPES[normal.unit.type].elite, 'player may still purchase standard frames');
});

test('AI elite production is repeatable and ordinary land recruitment is forbidden', () => {
  const g = E.createGame('britannia', 'elite', 'conquest', 33), side = 'eu';
  g.phase = side;
  rich(g, side);
  const id = Object.keys(E.ELITE_FORCES).find(k => E.ELITE_FORCES[k].availableTo.includes(side));
  const cities = g.stations.filter(s => s.owner === side).slice(0, 3);
  assert.equal(cities.length, 3);
  cities.forEach(s => clearCity(g, s));
  for (const s of cities.slice(0, 2)) {
    assert.equal(E.aiEliteRecruitReason(g, s, id), null);
    const res = E.recruitAIElite(g, s.id, id);
    assert(res.ok, res.reason);
    assert.equal(res.unit.elite, id);
    assert.equal(res.unit.stack, 1);
  }
  assert.equal(g.units.filter(u => u.side === side && u.elite === id && !u.eliteStart).length, 2,
    'AI is not subject to the player\'s one-of-each limit');
  const normal = E.recruit(g, cities[2].id, E.typeFor(side, 'scout'), 1);
  assert.equal(normal.ok, false);
  assert.match(normal.reason, /only produce Elite/);
  const playerCity = g.stations.find(s => s.owner === g.player);
  assert.equal(E.aiEliteRecruitReason(g, playerCity, id) !== null, true);
});

test('AI production turn builds no non-elite land units in Elite difficulty', () => {
  const g = E.createGame('britannia', 'elite', 'conquest', 44);
  g.phase = 'eu';
  rich(g, 'eu');
  // Unblock the E.U. factories so there is a real opportunity to recruit.
  for (const s of g.stations.filter(s => s.owner === 'eu')) clearCity(g, s);
  const startIds = new Set(g.units.map(u => u.id));
  E.aiProduction(g);
  const newUnits = g.units.filter(u => !startIds.has(u.id) && u.side === 'eu');
  assert(newUnits.some(u => !E.TYPES[u.type].naval), 'AI should produce elite ground forces');
  for (const u of newUnits) {
    if (!E.TYPES[u.type].naval) assert(E.TYPES[u.type].elite, 'AI ground factory made a normal unit');
  }
});

test('Normal and Challenge rules are unaffected by the Elite difficulty', () => {
  for (const difficulty of ['normal', 'hard', 'challenge']) {
    const g = E.createGame('britannia', difficulty, 'conquest', 57);
    assert(g.units.some(u => !E.TYPES[u.type].naval && !E.TYPES[u.type].elite));
    assert.equal(E.aiEliteRecruitReason(g, g.stations.find(s => s.owner === 'eu'), 'leila_alexander') !== null, true);
  }
});

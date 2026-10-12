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

test('Elite inherits Challenge enemy bonuses, converts every land reinforcement and keeps naval units intact', () => {
  assert.equal(E.DIFFICULTIES.elite.name, 'Elite');
  const marshal = E.PROMOTE_COST.length - 1;
  assert.equal(E.RANKS[E.RANKS.length - 1], 'Supreme Commander');
  assert.equal(E.RANKS.length - 1, marshal + 2);
  for (const side of E.MAJORS) {
    const normal = E.createGame(side, 'normal', 'conquest', 20261012);
    const challenge = E.createGame(side, 'challenge', 'conquest', 20261012);
    const g = E.createGame(side, 'elite', 'conquest', 20261012);
    assert(g.units.length > normal.units.length, 'Challenge-style reinforcements exist');
    assert.deepEqual(g.stations.map(s => s.owner), normal.stations.map(s => s.owner));
    const originalById = new Map(normal.units.map(u => [u.id, u]));
    for (const [id, cmd] of Object.entries(E.COMMANDERS)) {
      const mine = cmd.side === side;
      assert.equal(g.officers[id].rank, mine ? E.defaultOfficer(id).rank : E.RANKS.length - 1);
      assert.equal(challenge.officers[id].rank, mine ? E.defaultOfficer(id).rank : marshal);
    }
    for (const foe of [...E.MAJORS, 'neutral'].filter(s => s !== side)) {
      assert.deepEqual(g.tech[foe], challenge.tech[foe], 'Challenge maximum research');
      assert.equal(g.economy[foe].credits, challenge.economy[foe].credits,
        'Challenge 25% initial treasury bonus');
    }
    for (const before of normal.units) {
      const u = g.units.find(v => v.id === before.id);
      assert(u, 'original unit retained: ' + before.id);
      assert.deepEqual([u.c, u.r, u.side], [before.c, before.r, before.side]);
      if (E.TYPES[before.type].naval) {
        assert.equal(u.type, before.type, 'ships and amphibious types unchanged');
        assert.equal(u.stack, before.stack, 'ships and amphibious stacks unchanged');
      } else {
        assert(E.TYPES[u.type].elite, 'all starting land units must be elite');
        assert(u.elite && u.eliteStart);
        assert.equal(u.eliteLevel, 1);
        assert.equal(u.stack, before.side === side ? 1 : Math.min(3, before.stack + 1),
          'Challenge added frames apply to AI elites');
        assert.equal(u.hp, E.maxHP(u));
        if (E.MAJORS.includes(u.side))
          assert(E.ELITE_FORCES[u.elite].availableTo.includes(u.side));
      }
    }
    for (const u of g.units.filter(u => !originalById.has(u.id)))
      assert(E.TYPES[u.type].elite && u.eliteStart && u.side !== side,
        'Challenge-style reinforcements are hostile land elites');
    for (const foe of E.MAJORS.filter(x => x !== side)) {
      const cities = g.stations.filter(s => s.owner === foe);
      assert(cities.filter(s => s.tier >= 3).length >= 6, 'advanced AI elite factories');
      assert(cities.every(s => s.tier >= 2), 'AI factories have at least one available elite');
    }
    assert.deepEqual(g.eliteDeployed, {}, 'starting elites do not consume the player factory limit');
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

test('AI cannot manufacture a Tier-III elite in a Tier-I factory', () => {
  const g = E.createGame('britannia', 'elite', 'conquest', 200);
  g.phase = 'cf';
  rich(g, 'cf');
  const low = g.stations.find(s => s.owner === 'cf' && s.tier === 2);
  assert(low, 'need a medium-tier Chinese factory');
  clearCity(g, low);
  low.tier = 1;
  assert.match(E.aiEliteRecruitReason(g, low, 'shen_hu'), /Requires factory level 3/);
  assert.equal(E.recruitAIElite(g, low.id, 'shen_hu').ok, false);
  const advanced = g.stations.find(s => s.owner === 'cf' && s.tier >= 3);
  clearCity(g, advanced);
  assert.equal(E.aiEliteRecruitReason(g, advanced, 'shen_hu'), null);
  assert(E.recruitAIElite(g, advanced.id, 'shen_hu').ok);
});

test('Elite-only ranks persist across save and load while player commander cap stays Marshal', () => {
  const g = E.createGame('britannia', 'elite', 'conquest', 203);
  const saved = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
  assert(saved);
  const hostile = Object.keys(E.COMMANDERS).find(id => E.COMMANDERS[id].side === 'eu');
  assert.equal(saved.officers[hostile].rank, E.RANKS.length - 1);
  assert.equal(saved.officers.suzaku.rank, E.defaultOfficer('suzaku').rank);
  const profile = { tokens: 100000 };
  E.roster(profile).suzaku.rank = E.PROMOTE_COST.length - 1;
  assert.equal(E.promoteReason(profile, 'suzaku'), 'Highest rank reached');
});

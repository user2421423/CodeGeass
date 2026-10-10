const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

function board(size = 20) {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  Object.assign(g, {
    cols: size, rows: size, wrap: false, units: [], nextId: 1, sites: [],
    tiles: Array.from({ length: size * size }, (_, i) => ({ c: i % size, r: Math.floor(i / size), terrain: 'plains', owner: null })),
    stations: E.MAJORS.map((owner, id) => ({
      id, name: owner, owner, c: id ? size - 1 : 0, r: id === 2 ? size - 1 : 0,
      tier: 3, lab: 0, capital: true, capitalOf: owner, fort: false,
      shield: 100, maxShield: 100, income: 10, industry: 10, science: 1, producedTurn: 0,
    })),
  });
  for (const side of E.MAJORS) g.economy[side] = { credits: 5000, industry: 5000, science: 0, sakuradite: 500 };
  return g;
}

test('Threatened garrisons leave only when a legal replacement can be bought after reserves', () => {
  for (const credits of [60, 119, 120]) {
    const g = board(12);
    g.phase = 'eu';
    g.economy.eu = { credits, industry: 10, science: 0, sakuradite: 0 };
    const city = g.stations.find(s => s.owner === 'eu');
    city.shield = 0;
    const guard = E.newUnit(g, E.typeFor('eu', 'light'), 'eu', city.c, city.r);
    E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', city.c - 2, city.r);
    E.aiProduction(g);
    if (credits < 120) {
      assert.equal(E.unitAt(g, city), guard, `${credits} credits cannot pay for a scout plus the reserve`);
      assert.equal(g.vacated.length, 0);
      E.aiOrder(g, guard.id);
      assert.equal(E.unitAt(g, city), guard, 'the tactical pass must also keep the unreplaceable defender in place');
    } else {
      assert.equal(E.distance(guard, city, g), 1);
      assert.notEqual(E.unitAt(g, city), guard);
      assert.equal(E.unitAt(g, city)?.side, 'eu');
      assert.equal(city.producedTurn, g.turn);
      assert.equal(g.economy.eu.credits, 60);
    }
  }
  // Raw affordability must not bypass a faction's restricted campaign recruitment menu.
  const g = board(12);
  g.phase = 'eu';
  g.buildable = { eu: [] };
  const city = g.stations.find(s => s.owner === 'eu');
  const guard = E.newUnit(g, E.typeFor('eu', 'light'), 'eu', city.c, city.r);
  E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', city.c - 2, city.r);
  E.aiProduction(g);
  assert.equal(E.unitAt(g, city), guard);
});

test('Strategic savings and busy factories cannot strand a vacated capital', () => {
  for (const busy of [false, true]) {
    const g = board(12);
    g.phase = 'eu';
    g.turn = 15;
    g.economy.eu = { credits: 600, industry: 600, science: 0, sakuradite: 150 };
    const city = g.stations.find(s => s.owner === 'eu');
    city.lab = 3;
    if (busy) city.producedTurn = g.turn;
    const guard = E.newUnit(g, E.typeFor('eu', 'light'), 'eu', city.c, city.r);
    E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', city.c - 2, city.r);
    E.aiProduction(g);
    assert.equal(E.unitAt(g, city), guard);
  }
});

test('Ground guards require a legal land route; amphibious guards can cross straits', () => {
  const g = board();
  g.phase = 'eu';
  for (const t of g.tiles) if (t.c >= 4 && t.c <= 6) t.terrain = 'sea';
  const capital = g.stations.find(s => s.owner === 'eu');
  Object.assign(capital, { c: 3, r: 10 });
  const stranded = E.newUnit(g, E.typeFor('eu', 'light'), 'eu', 7, 10);
  const local = E.newUnit(g, E.typeFor('eu', 'light'), 'eu', 2, 10);
  const swimmer = E.newUnit(g, E.NAVAL.eu.amphibious, 'eu', 7, 11);
  for (g.turn = 3; g.turn <= 6; g.turn++) {
    const guards = E.aiPlan(g, 'eu').guards;
    assert.equal(guards[stranded.id], undefined, 'a transport journey is not a ground garrison route');
    assert.equal(guards[local.id]?.id, capital.id);
    assert.equal(guards[swimmer.id]?.id, capital.id);
  }
});

function corridor(detour = true) {
  const g = board(22);
  for (const t of g.tiles) t.terrain = 'peak';
  for (let c = 2; c <= 18; c++) E.tile(g, c, 5).terrain = 'plains';
  if (detour) {
    for (let r = 5; r <= 15; r++) for (const c of [8, 11]) E.tile(g, c, r).terrain = 'plains';
    for (let c = 8; c <= 11; c++) E.tile(g, c, 15).terrain = 'plains';
  }
  const blocker = g.stations.find(s => s.owner === 'eu');
  Object.assign(blocker, { c: 9, r: 5 });
  const u = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 8, 5);
  assert.equal(E.setGoto(g, u.id, 18, 5).ok, true);
  return { g, u, blocker };
}

test('Standing orders take a legal detour even when the first move increases straight-line distance', () => {
  const { g, u } = corridor();
  const initial = E.distance(u, u.goto, g);
  const report = E.runGotos(g, g.player);
  assert.equal(report.moved.length, 1);
  assert(E.distance(u, u.goto, g) > initial, 'first leg travels away from the static shortest route');
  for (let turn = 0; u.goto && turn < 30; turn++) {
    u.moved = u.attacked = false;
    u.movedDistance = 0;
    E.runGotos(g, g.player);
  }
  assert.equal(u.goto, undefined, 'detour reaches its destination');
  assert.deepEqual([u.c, u.r], [18, 5]);
});

test('A temporary route blockage keeps standing orders and replans when defenses fall', () => {
  const { g, u, blocker } = corridor(false);
  assert.deepEqual(E.runGotos(g, g.player).blocked, [u.id]);
  assert(u.goto, 'temporary obstacles must not cancel the order');
  blocker.shield = 0;
  assert.equal(E.runGotos(g, g.player).moved.length, 1);
});

test('AI heavy uses breakthrough to move into range and fire at the next enemy', () => {
  const g = board();
  g.phase = 'eu';
  const heavy = E.newUnit(g, E.typeFor('eu', 'heavy'), 'eu', 8, 10);
  assert.equal(E.move(g, heavy.id, 10, 10).ok, true);
  const first = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 11, 10);
  first.hp = 1;
  const second = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 15, 10);
  const hp = second.hp;
  const events = E.aiOrder(g, heavy.id);
  assert.equal(first.hp, 0);
  assert(second.hp < hp, 'second target is attacked after the restored move');
  assert.deepEqual(events.map(e => e.kind), ['attack', 'move', 'attack']);
});

test('Geass Canceller protects morale against fortress fire, while unprotected targets still lose morale', () => {
  const g = board();
  const jeremiah = E.newUnit(g, E.typeFor('britannia', 'heavy'), 'britannia', 4, 5, 1, 'jeremiah');
  const target = E.newUnit(g, E.typeFor('britannia', 'heavy'), 'britannia', 5, 5);
  assert.equal(E.feint(g, jeremiah.id).ok, true);
  assert(target.moraleWard);
  const battery = g.stations.find(s => s.owner === 'eu');
  Object.assign(battery, { c: 6, r: 5, fort: true });
  g.phase = 'eu';
  assert.equal(E.fireFortress(g, battery.id, target.c, target.r).ok, true);
  assert.equal(target.morale, 0);
  delete target.moraleWard;
  g.turn = battery.gunReady;
  assert.equal(E.fireFortress(g, battery.id, target.c, target.r).ok, true);
  assert.equal(target.morale, -1);
});

test('Nuclear destruction and rebuilding restore the same city output across saves', () => {
  for (const blasts of [1, 3]) {
    let g = E.createGame('britannia', 'normal', 'conquest', 123);
    g.turn = 20;
    let city = g.stations.find(s => s.name === 'New York');
    const original = [city.industry, city.science, city.maxShield];
    const center = E.adjacent(g, city).find(p => !E.stationAt(g, p));
    for (let n = 0; n < blasts; n++) {
      g.phase = 'eu';
      (g.arsenal ||= {}).eu = 1;
      assert.equal(E.launch(g, 'eu', center.c, center.r).ok, true);
    }
    g = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
    assert(g);
    city = g.stations.find(s => s.name === 'New York');
    g.phase = city.owner;
    Object.assign(g.economy[city.owner], { credits: 10000, industry: 10000 });
    while (city.tier < 3) assert.equal(E.build(g, city.id, 'factory').ok, true);
    assert.deepEqual([city.industry, city.science, city.maxShield], original, `${blasts} blasts must not inflate output`);
  }
});

test('Amphibious stats use sea speed, including research and carrier escorts', () => {
  const g = board();
  const swimmer = E.newUnit(g, 'portman', 'britannia', 10, 10);
  assert.equal(E.unitStats(g, swimmer).move, E.movement(g, swimmer));
  for (const p of E.within(g, swimmer, 9)) p.terrain = 'sea';
  assert.equal(E.unitStats(g, swimmer).move, 6);
  g.tech.britannia['naval.amphibious'] = 1;
  assert.equal(E.unitStats(g, swimmer).move, 7);
  delete g.tech.britannia['naval.amphibious'];
  E.newUnit(g, E.NAVAL.britannia.carrier, 'britannia', 11, 10);
  assert.equal(E.unitStats(g, swimmer).move, E.internal.amphibiousSea(g, swimmer));
  assert(E.unitStats(g, swimmer).move >= 6);
});

test('Factories damaged in an older save rebuild to their original world-city output', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  const city = g.stations.find(s => s.name === 'New York');
  const original = [city.industry, city.science, city.maxShield];
  // The previous ruin implementation kept the founding output when lowering tier.
  city.tier--;
  city.shield = 0;
  delete city.buildingFoundation;
  Object.assign(g.economy.britannia, { credits: 10000, industry: 10000 });
  assert.equal(E.build(g, city.id, 'factory').ok, true);
  assert.deepEqual([city.industry, city.science, city.maxShield], original);
});

test('Bought generic damage skills increase displayed Attack and preview damage for every branch', () => {
  for (const [cls, skill] of [['scout', 'raider'], ['heavy', 'armored_assault'], ['support', 'accuracy']]) {
    const g = board(), profile = { tokens: 20000 };
    E.roster(profile);
    E.applyProfile(g, profile);
    const u = E.newUnit(g, E.typeFor('britannia', cls), 'britannia', 5, 5, 1, 'suzaku');
    u.personal = true;
    E.applyRoster(g, profile);
    const victim = E.newUnit(g, E.typeFor('eu', 'heavy'), 'eu', 6, 5);
    const old = E.unitStats(g, u).attack, damage = E.preview(g, u.id, victim.c, victim.r).unit;
    for (let n = 0; n < 5; n++) assert.equal(E.buyGeneric(profile, 'suzaku', skill).ok, true);
    E.applyRoster(g, profile);
    assert(Math.abs(E.unitStats(g, u).attack - old * 1.3) <= 1);
    assert(Math.abs(E.preview(g, u.id, victim.c, victim.r).unit - damage * 1.3) <= 1);
  }
});

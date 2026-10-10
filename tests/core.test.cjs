const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
const C = require('../dist/campaign.js');

function blank(player = 'britannia', size = 12) {
  const g = E.createGame(player, 'normal', 'conquest', 123);
  g.cols = size;
  g.rows = size;
  g.wrap = false;
  g.tiles = Array.from({ length: size * size }, (_, n) => ({
    c: n % size,
    r: Math.floor(n / size),
    terrain: 'plains',
    owner: null,
  }));
  g.units = [];
  g.nextId = 1;
  g.sites = [];
  g.phase = player;
  g.over = null;
  g.fallen = {};
  g.stations = E.MAJORS.map((owner, id) => ({
    id,
    name: owner,
    c: id === 0 ? 0 : size - 1,
    r: id === 2 ? size - 1 : 0,
    owner,
    tier: 3,
    capital: true,
    capitalOf: owner,
    fort: false,
    shield: 100,
    maxShield: 100,
    income: 10,
    industry: 10,
    science: 1,
    producedTurn: 0,
  }));
  for (const side of E.MAJORS) {
    g.economy[side] = { credits: 5000, industry: 5000, science: 0, sakuradite: 500 };
  }
  return g;
}

test('Conquest initializes coherently for every playable power', () => {
  for (const side of E.MAJORS) {
    const g = E.createGame(side, 'normal', 'conquest', 7);
    assert.equal(g.player, side);
    assert.equal(g.tiles.length, g.cols * g.rows);
    assert(g.units.length > 0 && g.stations.length > 0);
    assert.equal(new Set(g.order).size, E.MAJORS.length);
    for (const major of E.MAJORS) assert(g.order.includes(major));

    for (const u of g.units) {
      assert(E.TYPES[u.type], `unknown unit type ${u.type}`);
      assert(!u.cmd || E.COMMANDERS[u.cmd], `unknown commander ${u.cmd}`);
      assert(u.c >= 0 && u.c < g.cols && u.r >= 0 && u.r < g.rows);
    }
    for (const major of E.MAJORS) {
      assert(g.stations.some(s => s.owner === major), `${major} must start with a city`);
    }
  }
});

test('Every painted conquest hex belongs to one fixed city province', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 9);
  const cities = new Map(g.stations.map(s => [s.id, s]));
  for (const t of g.tiles) {
    if (t.terrain === 'sea') {
      assert.equal(t.provinceCity, undefined, 'sea never belongs to a city province');
      continue;
    }
    if (t.owner) {
      assert.notEqual(t.provinceCity, undefined, 'painted land must have a city');
      assert.equal(cities.get(t.provinceCity)?.owner, t.owner,
        'initial province city must control its land');
    }
  }
  const paris = g.stations.find(s => s.name === 'Paris');
  assert(g.tiles.filter(t => t.provinceCity === paris.id).length > 7,
    'city provinces include more than the old seven-hex capture radius');
  const legacy = structuredClone(g);
  for (const t of legacy.tiles) delete t.provinceCity;
  assert.equal(E.migrateSave(legacy), legacy);
  assert(legacy.tiles.every(t => t.terrain === 'sea' || !t.owner || t.provinceCity != null),
    'old saves acquire stable province assignments');
});

test('Moving through a province does not recolor it; capturing its city flips only that province', () => {
  const g = blank();
  const paris = g.stations.find(s => s.owner === 'eu');
  const otherCity = { ...paris, id: 3, name: 'Other E.U. City', c: 7, r: 0,
    capital: false, capitalOf: null };
  g.stations.push(otherCity);
  const owned = (c, r, city) => {
    const t = E.tile(g, c, r);
    t.owner = city.owner;
    t.provinceCity = city.id;
    return t;
  };
  const walked = owned(5, 5, paris);
  const mover = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 5, 4);
  assert.equal(E.move(g, mover.id, 5, 5).ok, true);
  assert.equal(walked.owner, 'eu', 'ordinary movement cannot repaint enemy territory');

  const parisProvince = [[11, 0], [10, 0], [11, 1], [9, 1]].map(([c, r]) => owned(c, r, paris));
  const neighboringProvince = owned(10, 1, otherCity); // Adjacent to Paris, but not its province
  const remoteProvince = owned(7, 1, otherCity);
  paris.shield = 0;
  const invader = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 10, 0);
  const capture = E.move(g, invader.id, paris.c, paris.r);
  assert.equal(capture.ok, true);
  assert.equal(capture.captured, paris.name);
  assert(parisProvince.every(t => t.owner === 'britannia'));
  assert.equal(walked.owner, 'britannia', 'even a remote hex of Paris province flips');
  assert.equal(neighboringProvince.owner, 'eu', 'adjacent city province must remain E.U.');
  assert.equal(remoteProvince.owner, 'eu');
  assert.equal(otherCity.owner, 'eu', 'other city is not captured');
  const saved = structuredClone(g);
  assert.deepEqual(saved.tiles.map(t => [t.owner, t.provinceCity]),
    g.tiles.map(t => [t.owner, t.provinceCity]), 'province boundaries survive serialization');
});

test('World map: islands, straits and joins that gameplay depends on', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 7);
  const land = t => t.terrain !== 'sea';
  // Every hex reachable from `from` over hexes passing `pass`.
  const region = (from, pass) => {
    const seen = new Set([E.key(from)]), queue = [from];
    while (queue.length) for (const n of E.adjacent(g, queue.shift())) if (pass(n) && !seen.has(E.key(n))) seen.add(E.key(n)), queue.push(n);
    return seen;
  };
  const city = name => g.stations.find(s => s.name === name);
  const at = (c, r) => E.tile(g, c, r);
  const linked = (a, b, pass) => region(a, pass).has(E.key(b));
  assert(!linked(city('London'), city('Paris'), land), 'Great Britain is an island (Strait of Dover)');
  assert(!linked(city('Dublin'), city('London'), land), 'Ireland is an island');
  assert(linked(city('Rome'), at(96, 21), land), 'Sicily is joined to Italy (Strait of Messina closed)');
  assert(linked(at(106, 18), at(102, 21), t => !land(t)), 'the Bosporus opens the Black Sea to the Aegean');
  assert(linked(at(83, 21), at(92, 20), t => !land(t)), 'Strait of Gibraltar is open');
  assert(linked(at(88, 14), at(91, 11), t => !land(t)), 'the English Channel reaches the North Sea');
  assert(linked(at(97, 18), at(98, 22), t => !land(t)), 'the Adriatic opens to the Ionian Sea');
  assert(!linked(city('Tokyo Settlement'), city('Sapporo'), land), 'Hokkaido is separated from Honshu by Tsugaru Strait');
  assert(!linked(city('Tokyo Settlement'), city('Seoul'), land), 'Japan is not joined to Korea');
  assert(!linked(city('Taipei'), city('Hong Kong'), land), 'Taiwan is an island');
  // Every city stands within one hex of where its coordinates put it.
  for (const [name, lon, lat] of require('../dist/engine/world.js').CITY_DATA) {
    const s = city(name);
    assert(s && E.distance(s, E.hexOf(lon, lat), g) <= 1, `${name} sits where its coordinates put it`);
  }
});

test('Core combat keeps breakthrough and movement rules intact', () => {
  const g = blank();

  const heavy = E.newUnit(g, E.typeFor('britannia', 'heavy'), 'britannia', 5, 5);
  const victim = E.newUnit(g, E.typeFor('eu', 'scout'), 'eu', 6, 5);
  victim.hp = 1;
  const heavyHit = E.attack(g, heavy.id, victim.c, victim.r);
  assert(heavyHit.ok && heavyHit.destroyed);
  assert.equal(heavy.attacked, false, 'heavy frame may fire again after a kill');
  assert.equal(heavy.moved, false, 'relentless heavy frame regains movement on its first kill');
  assert(E.reachable(g, heavy).size > 0, 'movement is actually available after the kill');

  const line = E.newUnit(g, E.typeFor('britannia', 'light'), 'britannia', 5, 8);
  const secondVictim = E.newUnit(g, E.typeFor('eu', 'scout'), 'eu', 6, 8);
  secondVictim.hp = 1;
  const lineHit = E.attack(g, line.id, secondVictim.c, secondVictim.r);
  assert(lineHit.ok && lineHit.destroyed);
  assert.equal(line.attacked, false, 'line frame gets its normal breakthrough shot');
  assert.equal(line.moved, true, 'ordinary breakthrough does not also restore movement');
  assert.equal(E.reachable(g, line).size, 0);
});

test('F.L.E.I.J.A. leaves a city at ground zero as ruins, destroys its deposit and forces its owner to surrender', () => {
  const g = blank();
  const paris = g.stations.find(s => s.owner === 'eu');
  const inherited = E.tile(g, paris.c - 1, paris.r);
  inherited.owner = 'eu';
  inherited.provinceCity = paris.id;
  g.sites = [{ id: 0, name: 'Paris Field', c: paris.c, r: paris.r, base: 20, city: paris.id }];
  g.arsenal = { britannia: 1 };
  const r = E.launch(g, 'britannia', paris.c, paris.r);
  assert(r.ok);
  assert(!g.stations.includes(paris), 'no longer a city');
  assert.equal(g.ruins[0].name, paris.name);
  assert.deepEqual(r.depleted, ['Paris Field']);
  assert.equal(g.sites.length, 0);
  assert.equal(g.fallen.eu.by, 'britannia');
  assert.equal(inherited.owner, 'britannia', 'surrender transfers an orphaned province');
  assert.equal(inherited.provinceCity, g.stations.find(s => s.owner === 'britannia').id,
    'orphaned province becomes attached to a living city');
  assert.equal(E.tile(g, paris.c, paris.r).terrain, 'crater');
});

test('A defender returns fire with the health it has left after the hit', () => {
  const g = blank();
  const a = E.newUnit(g, E.typeFor('britannia', 'super'), 'britannia', 5, 5, 3);
  const d = E.newUnit(g, E.typeFor('eu', 'light'), 'eu', 6, 5, 3);
  const before = E.preview(g, a.id, 6, 5).counter; // full-health return fire
  const r = E.attack(g, a.id, 6, 5);
  assert(d.hp > 0 && d.hp < E.maxHP(d) * 0.85, 'the defender survives, clearly damaged');
  assert(r.counter < before * 0.94, `counter ${r.counter} should be below the full-health ${before}`);
});

test('The conquest AI can take a turn without throwing', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 11);
  const side = g.order.find(s => s !== g.player);
  E.beginTurn(g, side, false);
  E.aiProduction(g);
  const units = g.units.filter(u => u.hp > 0 && u.side === side).slice(0, 12);
  assert(units.length > 0);
  for (const u of units) E.aiOrder(g, u.id);
  assert.equal(g.phase, side);
});

test('AI chooses super-heavy units from armored-front demand without waiting for cooldown', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  const side = 'eu', superType = E.typeFor(side, 'super', g);
  g.phase = side;
  g.turn = 8;
  // Legacy values from existing saves must not restrict modern production.
  g.ai = { [side]: { saving: false, lastSuperTurn: 7 } };
  g.economy[side] = { credits: 20000, industry: 20000, science: 200, sakuradite: 3000 };

  const before = new Set(g.units.map(u => u.id));
  E.aiProduction(g);
  const produced = g.units.filter(u => u.side === side && !before.has(u.id));

  assert(produced.some(u => u.type === superType),
    'battlefield demand should build super-heavies without a special savings flag or cooldown');
  assert(produced.some(u => u.type !== superType),
    'ordinary unit production continues beside super-heavies');
  assert.equal(g.ai[side].saving, undefined, 'legacy savings flag is cleared');
  assert.equal(g.ai[side].lastSuperTurn, undefined, 'legacy cooldown is cleared');
});

test('Expensive super-heavy options do not starve affordable regular troops', () => {
  const side = 'eu';
  for (const [credits, industry] of [[250, 300], [1000, 90]]) {
    const g = E.createGame('britannia', 'normal', 'conquest', 123);
    g.phase = side;
    g.turn = 8;
    g.ai = { [side]: { saving: true } };
    g.economy[side] = { credits, industry, science: 100, sakuradite: 3000 };
    const before = new Set(g.units.map(u => u.id));

    E.aiProduction(g);
    const produced = g.units.filter(u => u.side === side && !before.has(u.id));
    assert(produced.some(u => E.TYPES[u.type].cls !== 'super'),
      `must produce ordinary troops with a limited budget (credits=${credits}, industry=${industry})`);
    assert(!produced.some(u => E.TYPES[u.type].cls === 'super'),
      'cannot spend ordinary troop budget on unaffordable super-heavy frames');
    assert.equal(g.ai[side].saving, undefined);
  }
});

test('AI does not prioritize super-heavy units when no front needs them', () => {
  const side = 'eu';
  const g = blank();
  g.phase = side;
  g.turn = 8;
  g.units = [];
  for (const s of g.stations) s.owner = side;
  g.economy[side] = { credits: 20000, industry: 20000, science: 100, sakuradite: 3000 };
  const before = new Set(g.units.map(u => u.id));
  E.aiProduction(g);
  const produced = g.units.filter(u => u.side === side && !before.has(u.id));

  assert(produced.some(u => E.TYPES[u.type].cls !== 'super'), 'ordinary recruitment still works');
  assert(!produced.some(u => E.TYPES[u.type].cls === 'super'),
    'no super-heavy units when there are no enemy fronts, armored threats, or fortifications');
});

// A rich naval threat scenario must allow naval growth beyond the old fixed caps.
function navalPressureScenario() {
  const side = 'eu';
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  g.phase = side;
  g.turn = 8;
  g.economy[side] = { credits: 80000, industry: 30000, science: 200, sakuradite: 3000 };
  const coast = g.stations.filter(s => s.owner === side && E.internal.portSite(g, s));
  const enemyCarrier = E.internal.NAVAL.britannia.carrier;
  const threatenedSea = g.tiles.filter(t => t.terrain === 'sea' && !E.unitAt(g, t) &&
    coast.some(s => E.internal.dist(g, s, t) <= 16) &&
    !coast.some(s => s.portAt?.c === t.c && s.portAt?.r === t.r));
  assert(threatenedSea.length >= 30, 'scenario needs enough coastal sea hexes');
  for (const t of threatenedSea.slice(0, 30))
    E.newUnit(g, enemyCarrier, 'britannia', t.c, t.r);
  const slots = g.tiles.filter(t => t.terrain === 'sea' && !E.unitAt(g, t) &&
    !coast.some(s => s.portAt?.c === t.c && s.portAt?.r === t.r));
  const navy = E.internal.NAVAL[side];
  let index = 0;
  const add = (role, n) => {
    assert(slots.length - index >= n, 'scenario requires free sea hexes');
    for (let i = 0; i < n; i++) {
      const t = slots[index++];
      E.newUnit(g, navy[role], side, t.c, t.r);
    }
  };
  return { g, side, navy, coast, add };
}

test('AI carrier fleet may grow beyond four ships when naval threats justify it', () => {
  const { g, side, navy, add } = navalPressureScenario();
  add('carrier', 5);
  add('amphibious', 30);
  const existing = new Set(g.units.map(u => u.id));
  assert(g.units.filter(u => u.side === side && u.type === navy.carrier).length > 4);
  E.aiProduction(g);
  const produced = g.units.filter(u => u.side === side && !existing.has(u.id));
  assert(produced.some(u => u.type === navy.carrier), 'more carriers are built despite existing fleet >4');
  assert(produced.some(u => !E.TYPES[u.type].naval), 'land production is still funded');
});

test('AI amphibious fleet may grow beyond six formations when naval threats justify it', () => {
  const { g, side, navy, add } = navalPressureScenario();
  add('carrier', 30);
  add('amphibious', 7);
  const existing = new Set(g.units.map(u => u.id));
  assert(g.units.filter(u => u.side === side && u.type === navy.amphibious).length > 6);
  E.aiProduction(g);
  const produced = g.units.filter(u => u.side === side && !existing.has(u.id));
  assert(produced.some(u => u.type === navy.amphibious || u.type === navy.amphibious2),
    'more amphibious formations are built despite existing fleet >6');
  assert(produced.some(u => !E.TYPES[u.type].naval), 'land production is still funded');
});

test('AI expands past three ports when needed and upgrades ports to level three', () => {
  const { g, side, coast } = navalPressureScenario();
  const ports = coast.filter(s => s.portLevel && s.portOwner === side);
  assert(ports.length > 3, 'scenario starts with more than three ports');
  for (const port of ports) port.portLevel = 3;
  E.aiProduction(g);
  assert(coast.filter(s => s.portLevel && s.portOwner === side).length > ports.length,
    'AI expands port network past old fixed cap in naval emergency');

  // With no major naval emergency, the AI must also finish an existing level-2
  // port instead of leaving every port permanently below level 3.
  const quiet = E.createGame('britannia', 'normal', 'conquest', 123);
  quiet.phase = side;
  quiet.turn = 8;
  quiet.economy[side] = { credits: 80000, industry: 30000, science: 200, sakuradite: 3000 };
  const current = quiet.stations.filter(s => s.owner === side && s.portLevel && s.portOwner === side);
  assert(current.length > 0);
  for (const port of current) port.portLevel = 2;
  E.aiProduction(quiet);
  assert(current.some(s => s.portLevel === 3), 'AI upgrades an existing port to level 3');
});

test('A rival moves a unit off its city before building there, as a player would', () => {
  const g = blank();
  g.phase = 'eu';
  const paris = g.stations.find(s => s.owner === 'eu');
  const u = E.newUnit(g, E.typeFor('eu', 'light'), 'eu', paris.c, paris.r);
  E.aiProduction(g);
  assert(!(u.c === paris.c && u.r === paris.r), 'the unit stepped off the city');
  assert.equal(paris.producedTurn, g.turn, 'and the city built this turn');
});

test('A threatened rival city builds another defender; its defender stays beside it, or holds it when broke', () => {
  const setup = credits => {
    const g = blank();
    g.phase = 'eu';
    g.economy.eu.credits = credits;
    const paris = g.stations.find(s => s.owner === 'eu');
    const u = E.newUnit(g, E.typeFor('eu', 'light'), 'eu', paris.c, paris.r);
    E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', paris.c - 2, paris.r);
    E.aiProduction(g);
    return { g, paris, u };
  };
  const rich = setup(5000);
  assert.equal(E.distance(rich.u, rich.paris, rich.g), 1, 'the defender steps beside the city');
  assert.equal(rich.paris.producedTurn, rich.g.turn, 'and the city builds another defender');
  const broke = setup(0);
  assert(broke.u.c === broke.paris.c && broke.u.r === broke.paris.r, 'with no money the defender holds the city');
});

test('Every campaign mission builds with valid references', () => {
  const ids = Object.values(C.CAMPAIGNS).flatMap(c => c.missions.map(m => m.id));
  assert(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length, 'campaign mission ids must be unique');

  for (const id of ids) {
    const m = C.mission(id);
    const g = C.createMission(id, 7);
    assert.equal(g.mode, 'campaign', id);
    assert.equal(g.tiles.length, g.cols * g.rows, id);
    assert(g.campaign?.queue?.length > 0, `${id}: missing opening briefing`);

    for (const u of g.units) {
      assert(E.TYPES[u.type], `${id}: unknown frame ${u.type}`);
      assert(!u.cmd || E.COMMANDERS[u.cmd], `${id}: unknown commander ${u.cmd}`);
      assert(u.c >= 0 && u.c < g.cols && u.r >= 0 && u.r < g.rows, `${id}: unit outside map`);
    }

    for (const ev of m.events || []) {
      for (const spawn of ev.spawn || []) {
        assert(E.TYPES[spawn[1]] || E.CLASS_ORDER.includes(spawn[1]), `${id}: unknown spawn ${spawn[1]}`);
      }
    }

    for (const objective of [...[m.win].flat(), ...(m.stars || [])]) {
      for (const name of objective.capture || objective.keep || objective.reach || []) {
        assert(g.stations.some(s => s.name === name), `${id}: objective references missing city ${name}`);
      }
    }
  }
});

test('Generic rarity slots, purchases, upgrades, replacements and save migration', () => {
  const p = { tokens: 20000 };
  E.roster(p);
  assert.equal(Object.keys(E.GENERIC_SKILLS).length, 19);
  for (const [k, a] of Object.entries(E.COMMANDERS))
    assert.equal(E.genericSlots(k), Math.max(0, a.stars - 2));
  assert.deepEqual(E.roster(p).suzaku.generics, {});
  assert.equal(E.buyGeneric(p, 'suzaku', 'armor_leader').level, 1);
  assert.equal(E.buyGeneric(p, 'suzaku', 'armor_leader').level, 2);
  assert.equal(E.buyGeneric(p, 'suzaku', 'armored_assault').level, 1);
  assert.equal(E.buyGeneric(p, 'suzaku', 'fortification').level, 1);
  assert.equal(E.buyGeneric(p, 'suzaku', 'crossfire').ok, false);
  assert.equal(E.removeGeneric(p, 'suzaku', 'fortification').ok, true);
  assert.equal(E.buyGeneric(p, 'suzaku', 'crossfire').level, 1);
  const old = E.roster({ roster: { suzaku: { rank: 1, ratings: { ...E.roster(p).suzaku.ratings }, medals: [], commanderVersion: 1 } }, tokens: 0 });
  assert.deepEqual(old.suzaku.generics, {});
});
test('Leader crit chance and Tide of Iron protect low-HP damage', () => {
  const g = blank(), p = { tokens: 20000 };
  E.roster(p);
  for (let i = 0; i < 5; i++) {
    E.buyGeneric(p, 'suzaku', 'armor_leader');
    E.buyGeneric(p, 'suzaku', 'tide_of_iron');
    E.buyGeneric(p, 'suzaku', 'machinist');
  }
  E.applyProfile(g, p);
  const a = E.newUnit(g, E.typeFor('britannia', 'heavy'), 'britannia', 5, 5, 1, 'suzaku');
  a.personal = true;
  E.applyRoster(g, p);
  E.newUnit(g, E.typeFor('eu', 'heavy'), 'eu', 6, 5);
  const withSkill = E.preview(g, a.id, 6, 5).crit;
  delete g.roster.suzaku.generics.armor_leader;
  const withoutSkill = E.preview(g, a.id, 6, 5).crit;
  g.roster.suzaku.generics.armor_leader = 5;
  assert(withSkill - withoutSkill > 0.29);
  const full = E.preview(g, a.id, 6, 5).unit;
  a.hp = Math.round(E.maxHP(a) * 0.2);
  assert.equal(E.preview(g, a.id, 6, 5).unit, full);
  a.hp -= 30;
  const injured = a.hp;
  E.beginTurn(g, 'britannia', false);
  assert(a.hp > injured, 'Machinist restored some HP');
});


test('Carrier-Battleships cannot be assigned personal commanders', () => {
  const g = blank();
  const carrier = E.newUnit(g, E.NAVAL.britannia.carrier, 'britannia', 5, 5);
  const k = Object.keys(E.COMMANDERS).find(k => E.serves(k, 'britannia'));
  const credits = g.economy.britannia.credits;
  assert.match(E.assignReason(g, carrier, k), /Carrier-Battleships cannot have commanders/);
  assert.equal(E.assign(g, carrier.id, k).ok, false);
  assert.equal(carrier.cmd, null);
  assert.equal(g.economy.britannia.credits, credits);
});

test('A Knightmare can board and launch on the same turn with full actions', () => {
  const g = blank();
  E.tile(g, 5, 5).terrain = 'sea';
  const ship = E.newUnit(g, E.NAVAL.britannia.carrier, 'britannia', 5, 5);
  const scout = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 5, 6);
  const board = E.move(g, scout.id, 5, 5);
  assert.equal(board.ok, true);
  assert.equal(board.loaded, ship.id);
  assert.equal(ship.cargo[0].boardedTurn, g.turn);
  assert.equal(E.deployReason(g, ship, 0), null);
  const target = E.deployTargets(g, ship).find(p => p.c !== 5 || p.r !== 6);
  assert(target);
  const landingTile = E.tile(g, target.c, target.r);
  landingTile.owner = 'eu';
  const launch = E.deploy(g, ship.id, 0, target.c, target.r);
  assert.equal(launch.ok, true);
  assert.equal(landingTile.owner, 'eu', 'unopposed carrier landing cannot repaint territory');
  assert.equal(launch.unit.moved, false);
  assert.equal(launch.unit.attacked, false);
  assert(E.reachable(g, launch.unit).size > 0);
  assert.equal(E.reachable(g, launch.unit).has(E.key(ship)), false);
});

test('An amphibious sea-to-land movement refreshes both actions once per turn', () => {
  const g = blank();
  E.tile(g, 5, 5).terrain = 'sea';
  E.tile(g, 5, 7).terrain = 'sea';
  const u = E.newUnit(g, E.NAVAL.britannia.amphibious, 'britannia', 5, 5);
  const first = E.move(g, u.id, 5, 6);
  assert.equal(first.ok, true);
  assert.equal(u.landingRefreshTurn, g.turn);
  assert.equal(u.moved, false);
  assert.equal(u.attacked, false);
  assert(E.reachable(g, u).size > 0);
  const target = E.newUnit(g, E.typeFor('eu','scout'), 'eu', 6, 6);
  assert(E.targets(g, u).some(t => t.c === target.c && t.r === target.r));
  assert.equal(E.attack(g, u.id, target.c, target.r).ok, true);
  // Manually ready the unit to exercise the protection against a second refresh.
  u.moved = u.attacked = false;
  assert.equal(E.move(g, u.id, 5, 7).ok, true);
  u.moved = u.attacked = false;
  assert.equal(E.move(g, u.id, 5, 6).ok, true);
  assert.equal(u.moved, true);
});

test('Reviewed coastal conversions preserve naval routes, cities and existing occupied saves', () => {
  const changes = [[13, 9], [168, 9], [50, 10], [49, 12], [81, 32],
    [113, 51], [157, 44], [49, 31], [0, 6], [127, 0],
    [158, 1], [55, 8], [56, 8], [156, 63]];
  const game = E.createGame('britannia', 'normal', 'conquest', 123);
  for (const [c, r] of changes) {
    assert.equal(E.tile(game, c, r).terrain, 'sea', `(${c},${r}) must be navigable water`);
    assert(!game.stations.some(s => (s.c === c && s.r === r) ||
      (s.portAt?.c === c && s.portAt?.r === r)), 'No city or port may be converted');
    assert(!game.units.some(u => u.c === c && u.r === r), 'No starting unit may be stranded');
  }
  for (const [c, r] of [[106, 26], [111, 36], [140, 43], [142, 46]])
    assert.equal(E.tile(game, c, r).terrain, 'sea', 'Protected straits remain water');
  for (const [c, r] of [[107, 27], [111, 34], [111, 35]])
    assert.notEqual(E.tile(game, c, r).terrain, 'sea', 'Red Sea coast hexes are land');

  const old = structuredClone(game);
  for (const [c, r] of changes) {
    const tile = E.tile(old, c, r);
    tile.terrain = 'plains';
    tile.owner = 'britannia';
  }
  E.tile(old, 61, 15).terrain = 'sea';
  const occupied = old.units[0], [c, r] = changes[0];
  occupied.c = c;
  occupied.r = r;
  assert.equal(E.migrateSave(old), old);
  assert.equal(E.tile(old, c, r).terrain, 'plains', 'Do not strand a unit in a legacy save');
  for (const [cx, ry] of changes.slice(1)) {
    assert.equal(E.tile(old, cx, ry).terrain, 'sea', 'Unoccupied legacy coastal land migrates');
    assert.equal(E.tile(old, cx, ry).owner, null, 'Water hexes must not retain land ownership');
  }
  assert.notEqual(E.tile(old, 61, 15).terrain, 'sea', 'Previous Newfoundland fix migrates');
});

test('Caspian inland water is land and Tsugaru separates Hokkaido from Honshu', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  const caspian = [[113,17],[114,17],[114,18],[115,17],[115,18],[114,19],[115,19],[115,20],[116,20],[115,21],[114,21]];
  for (const [c,r] of caspian) assert.notEqual(E.tile(g,c,r).terrain,'sea');
  assert.equal(E.tile(g,160,19).terrain,'sea', 'Tsugaru is navigable water');
  const tokyo=g.stations.find(s=>s.name==='Tokyo Settlement');
  const sapporo=g.stations.find(s=>s.name==='Sapporo');
  const q=[E.tile(g,tokyo.c,tokyo.r)], seen=new Set();
  for(let i=0;i<q.length;i++){
    const t=q[i], key=`${t.c},${t.r}`;
    if(seen.has(key)) continue;seen.add(key);
    for(const n of E.adjacent(g,t))
      if(n.terrain!=='sea'&&!seen.has(`${n.c},${n.r}`))q.push(n);
  }
  assert(!seen.has(`${sapporo.c},${sapporo.r}`), 'Hokkaido requires sea crossing');
  const old=structuredClone(g);
  for(const [c,r] of caspian){const t=E.tile(old,c,r);t.terrain='sea';t.owner=null;}
  E.tile(old,160,19).terrain='plains';E.tile(old,160,19).owner='britannia';
  assert.equal(E.migrateSave(old),old);
  for(const [c,r] of caspian) {
    const t=E.tile(old,c,r);assert.equal(t.terrain,'plains');
    assert(t.owner,'Migrated lake adopts nearby territorial ownership');
  }
  assert.equal(E.tile(old,160,19).terrain,'sea');
});


test('Every Indonesian island starts as Federation territory, without changing the Philippines', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  const bands = [[94,107.9,-7.8,7.5], [106,119.5,-11.5,8],
    [118,134,-11.5,4.5], [133,141.9,-11.5,3]];
  const land = g.tiles.filter(t => {
    const lon = -180 + 2 * (t.c + 0.5 * (t.r & 1));
    const lat = 74 - t.r * (128 / 75);
    return t.terrain !== 'sea' &&
      bands.some(([west,east,south,north]) =>
        lon >= west && lon <= east && lat >= south && lat <= north);
  });
  assert(land.length >= 35, 'audit a meaningful number of island land hexes');
  for (const t of land)
    assert.equal(t.owner, 'cf', `Indonesian land (${t.c},${t.r}) must start as Federation`);
  assert.equal(g.stations.find(s=>s.name==='Manila').owner, 'britannia',
    'Indonesian assignment cannot change the Philippines');
  for (const name of ['Jakarta','Surabaya','Singapore','Kuala Lumpur']) {
    const city = g.stations.find(s => s.name === name);
    assert.equal(city?.owner, 'cf', name+' stays Federation');
  }
});

test('Coast hexes are land for land units and water for warships, one unit per hex', () => {
  const g = blank();
  // Column 4 is open sea, column 5 is coast, the rest is plains.
  for (let r = 0; r < 12; r++) {
    E.tile(g, 4, r).terrain = 'sea';
    E.tile(g, 5, r).terrain = 'coast';
  }
  const scout = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 6, 5);
  // A land unit walks onto the coast as land: it is not embarked and keeps its fire.
  assert(E.reachable(g, scout).has('5,5'));
  assert.equal(E.move(g, scout.id, 5, 5).ok, true);
  assert.equal(E.atSea(g, scout), false);
  // An embarked unit that reaches the coast lands there (and the landing ends its move).
  const raft = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 4, 8);
  assert.equal(E.atSea(g, raft), true);
  assert(E.reachable(g, raft).has('5,8'));
  assert.equal(E.move(g, raft.id, 5, 8).ok, true);
  assert.equal(E.atSea(g, raft), false);
  // Warships sail sea and coast, never onto plains or into a city.
  const ship = E.newUnit(g, E.NAVAL.britannia.carrier, 'britannia', 4, 2);
  const reach = E.reachable(g, ship);
  assert(reach.has('5,2') && !reach.has('6,2'));
  assert.equal(E.move(g, ship.id, 5, 2).ok, true);
  g.stations.push({ id: 999, name: 'Shore Town', c: 5, r: 3, owner: 'britannia', tier: 1, shield: 0, maxShield: 120 });
  ship.moved = false;
  assert(!E.reachable(g, ship).has('5,3'), 'warships never enter a city hex');
  // One unit per hex: a ship on the coast blocks troops, and a Knightmare stepping onto its own carrier boards it.
  const other = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 6, 2);
  assert.equal(E.move(g, other.id, 5, 2).loaded, ship.id);
  assert.equal(E.unitAt(g, { c: 5, r: 2 }), ship);
  // A Knightmare launches from the carrier onto a free coast hex.
  assert(E.deployTargets(g, ship).some(p => p.terrain === 'coast'));
  // A Portman's sea-to-coast move is a landing: its once-per-turn refresh applies.
  const portman = E.newUnit(g, E.NAVAL.britannia.amphibious, 'britannia', 4, 10);
  assert.equal(E.move(g, portman.id, 5, 10).ok, true);
  assert.equal(portman.landingRefreshTurn, g.turn);
  assert.equal(portman.moved, false);
});

test('The world map has coast hexes and older saves pick them up on load', () => {
  const game = E.createGame('britannia', 'normal', 'conquest', 123);
  const coast = game.tiles.filter(t => t.terrain === 'coast');
  assert(coast.length > 300, 'coast hexes along the world shoreline');
  assert(!game.stations.some(s => E.tile(game, s.c, s.r).terrain === 'coast'), 'cities stand on solid land');
  assert(!game.stations.some(s => s.portAt && E.tile(game, s.portAt.c, s.portAt.r).terrain !== 'sea'), 'ports stay at sea');
  const old = structuredClone(game);
  for (const t of old.tiles) if (t.terrain === 'coast') t.terrain = 'sea';
  E.migrateSave(old);
  assert.equal(old.tiles.filter(t => t.terrain === 'coast').length, coast.length);
});

test('Compact saves keep the whole game except destroyed units, at a fraction of the size', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 7);
  for (let round = 0; round < 6; round++) {
    for (const side of g.order) {
      if (g.over || !E.alive(g, side)) continue;
      E.beginTurn(g, side, g.turn > 1);
      E.aiProduction(g);
      for (const u of g.units.filter(u => u.hp > 0 && u.side === side)) if (u.hp > 0) E.aiOrder(g, u.id);
    }
    g.turn++;
  }
  // Make sure the save carries a crater, a destroyed unit and a hex owned away from its starting faction.
  E.tile(g, 120, 20).terrain = 'crater';
  g.units.find(u => u.hp > 0 && u.side === 'eu').hp = 0;
  const full = JSON.stringify(g),
    packed = JSON.stringify(E.packSave(g));
  assert(packed.length * 5 < full.length, `compact save ${packed.length} vs full ${full.length}`);
  const back = E.unpackSave(JSON.parse(packed));
  const expected = JSON.parse(full);
  expected.units = expected.units.filter(u => u.hp > 0);
  assert.deepEqual(back, expected, 'unpacking restores every field, hex and living unit');
  assert.equal(E.migrateSave(JSON.parse(packed)).tiles.length, g.tiles.length, 'a compact save loads like any other');
  // Campaign saves are small maps and stay whole.
  assert.equal(E.packSave({ ...g, mode: 'campaign' }).tiles, g.tiles);
});

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
  g.sites = [{ id: 0, name: 'Paris Field', c: paris.c, r: paris.r, base: 20, city: paris.id }];
  g.arsenal = { britannia: 1 };
  const r = E.launch(g, 'britannia', paris.c, paris.r);
  assert(r.ok);
  assert(!g.stations.includes(paris), 'no longer a city');
  assert.equal(g.ruins[0].name, paris.name);
  assert.deepEqual(r.depleted, ['Paris Field']);
  assert.equal(g.sites.length, 0);
  assert.equal(g.fallen.eu.by, 'britannia');
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
  for (const [c, r] of [[106, 26], [107, 27], [111, 35], [140, 43], [142, 46]])
    assert.equal(E.tile(game, c, r).terrain, 'sea', 'Protected straits remain water');

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

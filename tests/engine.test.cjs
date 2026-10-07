const test = require('node:test'),
  assert = require('node:assert/strict'),
  E = require('../dist/engine.js');
// A small flat test map (no wrap) with one capital per major power, far apart.
function blank(player = 'britannia', size = 12) {
  const g = E.createGame(player, 'normal', 'conquest', 123);
  g.cols = size;
  g.rows = size;
  g.wrap = false;
  g.tiles = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) g.tiles.push({ c, r, terrain: 'plains', owner: null });
  g.units = [];
  g.nextId = 1;
  const city = (id, name, c, r, owner, capital = false) => ({
    id,
    name,
    c,
    r,
    owner,
    tier: 3,
    capital,
    capitalOf: capital ? owner : null,
    fort: false,
    shield: 100,
    maxShield: 100,
    income: 10,
    industry: 10,
    science: 1,
    producedTurn: 0,
  });
  g.stations = [
    city(0, 'Pendragon', 0, 0, 'britannia', true),
    city(1, 'Paris', size - 1, 0, 'eu', true),
    city(2, 'Luoyang', size - 1, size - 1, 'cf', true),
  ];
  g.phase = player;
  g.over = null;
  g.fallen = {};
  g.sites = [];
  for (const s of E.MAJORS) g.economy[s] = { credits: 5000, industry: 5000, science: 0, sakuradite: 500 };
  return g;
}
const mine = (owner, c = 6, r = 5, base = 40, refinery = 0) => ({
  id: 0,
  name: 'Test Mine',
  c,
  r,
  base,
  city: null,
  owner,
  refinery,
});
const T = (side, cls) => E.typeFor(side, cls);
test('Each power fields ten Knightmares across the three branches', () => {
  assert.equal(Object.values(E.TYPES).filter(t => !t.elite && !t.campaign).length, 31);
  assert.equal(Object.values(E.TYPES).filter(t => t.elite).length, 19);
  assert.equal(Object.values(E.TYPES).filter(t => t.campaign).length, 8);
  for (const side of E.MAJORS) {
    assert.deepEqual(Object.keys(E.ROSTER[side]).sort(), [...E.CLASS_ORDER].sort());
    const branches = E.CLASS_ORDER.map(c => E.TYPES[T(side, c)].branch);
    assert.equal(branches.filter(b => b === 'Infantry').length, 3);
    assert.equal(branches.filter(b => b === 'Armor').length, 4);
    assert.equal(branches.filter(b => b === 'Artillery').length, 3);
  }
  assert.equal(T('britannia', 'light'), 'sutherland');
  assert.equal(T('eu', 'rocket'), 'panzer_hummel');
  assert.equal(T('cf', 'scout'), 'gun_ru');
  const lineup = side => E.CLASS_ORDER.slice(4).map(c => T(side, c));
  assert.deepEqual(lineup('britannia'), ['vincent_ward', 'vincent_commander', 'brighton', 'liverpool', 'sutherland_air', 'gareth']);
  assert.deepEqual(lineup('eu'), ['alexander_mp', 'panzer_wespe', 'alexander_elite', 'gardmare', 'panzer_hummel', 'hummel_battery']);
  assert.deepEqual(lineup('cf'), ['akatsuki', 'akatsuki_zikisan', 'akatsuki_air', 'gekka_rocket', 'akatsuki_missile', 'akatsuki_heavy']);
  assert.equal(T('eu', 'assault'), 'estrella_cc');
  assert.equal(T('cf', 'assault'), 'burai_kai');
  assert.deepEqual(Object.keys(E.TYPES).filter(k => E.TYPES[k].float && !E.TYPES[k].elite && !E.TYPES[k].campaign).sort(), ['akatsuki_air', 'sutherland_air']);
});
test('The world map wraps east to west and every city stands on land', () => {
  const g = E.createGame('eu', 'normal', 'conquest', 5);
  const last = E.WORLD.cols - 1;
  assert.equal(g.tiles.length, E.WORLD.cols * E.WORLD.rows);
  assert.deepEqual([E.WORLD.cols, E.WORLD.rows], [180, 76]);
  assert.equal(E.distance({ c: 0, r: 6 }, { c: last, r: 6 }, g), 1);
  assert.equal(E.distance({ c: 0, r: 6 }, { c: last, r: 6 }), last);
  assert(E.adjacent(g, { c: 0, r: 6 }).some(t => t.c === last));
  // Islands stay islands: no land route from London to Paris or from Seoul to Fukuoka.
  const city = n => g.stations.find(s => s.name === n);
  const byLand = (a, b) => {
    const seen = new Set([E.key(a)]),
      queue = [E.tile(g, a.c, a.r)];
    while (queue.length) {
      const t = queue.shift();
      if (t.c === b.c && t.r === b.r) return true;
      for (const n of E.adjacent(g, t))
        if (!seen.has(E.key(n)) && !E.isSea(n) && n.terrain !== 'peak') {
          seen.add(E.key(n));
          queue.push(n);
        }
    }
    return false;
  };
  assert(!byLand(city('London'), city('Paris')));
  assert(!byLand(city('Seoul'), city('Fukuoka')));
  assert(byLand(city('Fukuoka'), city('Tokyo Settlement')));
  assert(byLand(city('Moscow'), city('Beijing')));
  const landDistance = (a, b) => {
    const seen = new Set([E.key(a)]),
      queue = [[E.tile(g, a.c, a.r), 0]];
    while (queue.length) {
      const [t, d] = queue.shift();
      if (t.c === b.c && t.r === b.r) return d;
      for (const n of E.adjacent(g, t))
        if (!seen.has(E.key(n)) && !E.isSea(n) && n.terrain !== 'peak') {
          seen.add(E.key(n));
          queue.push([n, d + 1]);
        }
    }
    return Infinity;
  };
  assert(landDistance(city('Madrid'), city('Algiers')) > 20, 'Gibraltar remains a sea crossing, not a land bridge');
  assert(byLand(city('Bangkok'), city('Kuala Lumpur')), 'Thai–Malay peninsula stays continuous');
  assert(!byLand(city('Surabaya'), city('Kuala Lumpur')), 'Sunda Strait keeps Java separated from mainland Asia');
  for (const s of g.stations) assert.notEqual(E.tile(g, s.c, s.r).terrain, 'sea', s.name);
  const capitals = g.stations.filter(s => s.capital).map(s => [s.name, s.owner]);
  assert.deepEqual(capitals.sort(), [
    ['Luoyang', 'cf'],
    ['Paris', 'eu'],
    ['Pendragon', 'britannia'],
  ]);
  assert.equal(new Set(g.stations.map(E.key)).size, g.stations.length);
  assert.equal(g.stations.length, 149);
  assert.deepEqual(
    Object.fromEntries(['britannia', 'eu', 'cf', 'neutral'].map(side => [side, g.stations.filter(s => s.owner === side).length])),
    { britannia: 39, eu: 56, cf: 42, neutral: 12 },
  );
  for (const name of ['Vancouver', 'Sao Paulo', 'Amsterdam', 'Dar es Salaam', 'Chengdu', 'Kuala Lumpur', 'Brisbane', 'Jerusalem'])
    assert(city(name), name + ' should be present in conquest');
  assert(g.units.every(u => !E.isSea(E.tile(g, u.c, u.r))));
  assert.deepEqual(g.startUnits, { britannia: 38, eu: 47, cf: 40 });
  for (const [lon, lat, terrain, name] of [
    [10, 47, 'mountain', 'Alps'],
    [41, 43, 'mountain', 'Caucasus'],
    [61, 58, 'mountain', 'Urals'],
    [-70, -20, 'mountain', 'Andes'],
    [10, 25, 'desert', 'Sahara'],
    [100, 43, 'desert', 'Gobi'],
    [128, -24, 'desert', 'Australian interior'],
    [88, 28.5, 'peak', 'Himalaya'],
  ]) {
    const h = E.hexOf(lon, lat);
    assert.equal(E.tile(g, h.c, h.r).terrain, terrain, name);
  }
  assert.deepEqual(g.order, ['eu', 'britannia', 'cf']);
});
test('Movement obeys terrain, occupancy and the one-move rule', () => {
  let g = blank();
  const u = E.newUnit(g, T('britannia', 'siege'), 'britannia', 5, 5);
  assert.equal(E.movement(g, u), 3);
  E.tile(g, 6, 5).terrain = 'forest';
  assert(E.reachable(g, u).has('6,5'), 'high-resolution siege units can spend their full move entering forest');
  assert(E.move(g, u.id, 6, 5).ok);
  assert(!E.move(g, u.id, 7, 5).ok);
  g = blank();
  const a = E.newUnit(g, T('britannia', 'scout'), 'britannia', 5, 5);
  E.tile(g, 6, 5).terrain = 'peak';
  assert(!E.reachable(g, a).has('6,5'));
  E.newUnit(g, T('eu', 'scout'), 'eu', 5, 6);
  assert(!E.reachable(g, a).has('5,6'));
});
test('Units embark onto the sea, sail as transports that cannot fire, and land on a coast', () => {
  const g = blank('britannia', 20);
  for (const t of g.tiles) if (t.c >= 4 && t.c <= 14) t.terrain = 'sea';
  const u = E.newUnit(g, T('britannia', 'light'), 'britannia', 3, 5);
  const reach = E.reachable(g, u);
  assert(reach.has('4,5'), 'adjacent sea hex reachable');
  assert(!reach.has('5,5'), 'embarking ends the move');
  assert(E.move(g, u.id, 4, 5).ok);
  assert(E.atSea(g, u));
  const raider = E.newUnit(g, T('eu', 'scout'), 'eu', 5, 5);
  assert.equal(E.targets(g, u).length, 0, 'embarked units cannot fire');
  raider.hp = 0;
  // Next turn: sail ten hexes; landing takes a step and ends the move.
  E.beginTurn(g, 'britannia', false);
  const sail = E.reachable(g, u);
  assert(sail.has('14,5') && !sail.has('15,5'), 'sails ten hexes');
  assert(!sail.has('16,5'), 'cannot move beyond the ten-hex transport range');
  assert(E.move(g, u.id, 14, 5).ok);
  E.beginTurn(g, 'britannia', false);
  const land = E.reachable(g, u);
  assert(land.has('15,5'), 'lands on the coast');
  assert(E.move(g, u.id, 15, 5).ok && !E.atSea(g, u));
  assert.equal(E.reachable(g, u).size, 0, 'landing ends the move');
  // An embarked unit takes 50% extra damage and gives no counter-fire.
  const g2 = blank();
  g2.tiles.find(t => t.c === 6 && t.r === 5).terrain = 'sea';
  const shooter = E.newUnit(g2, T('britannia', 'light'), 'britannia', 5, 5);
  const boat = E.newUnit(g2, T('eu', 'light'), 'eu', 6, 5);
  const atSea = E.preview(g2, shooter.id, 6, 5);
  g2.tiles.find(t => t.c === 6 && t.r === 5).terrain = 'plains';
  const ashore = E.preview(g2, shooter.id, 6, 5);
  assert.equal(atSea.counterAllowed, false);
  assert(ashore.counterAllowed);
  assert(atSea.unit > ashore.unit * 1.45 && atSea.unit < ashore.unit * 1.55);
  assert(boat);
});
test('AI assembles a coastal group and embarks toward an overseas objective', () => {
  const g = blank('eu');
  for (const t of g.tiles) if (t.c === 5 || t.c === 6) t.terrain = 'sea';
  g.stations = [
    {
      ...g.stations[0],
      id: 0,
      name: 'Enemy Port',
      c: 8,
      r: 5,
      owner: 'britannia',
      capital: false,
      capitalOf: null,
      shield: 120,
      maxShield: 120,
    },
  ];
  g.units = [];
  g.nextId = 1;
  g.phase = 'eu';
  const lead = E.newUnit(g, T('eu', 'light'), 'eu', 4, 4),
    wing = E.newUnit(g, T('eu', 'light'), 'eu', 4, 5),
    reserve = E.newUnit(g, T('eu', 'light'), 'eu', 4, 6);
  const orders = E.aiOrder(g, lead.id);
  assert(orders.some(o => o.kind === 'move'));
  assert(E.atSea(g, lead), 'lead unit embarks once its convoy is assembled');
  assert(wing && reserve);
});
test('Fire support suppresses counter-fire; Infantry and Armor exchange it', () => {
  const g = blank(),
    a = E.newUnit(g, T('britannia', 'support'), 'britannia', 5, 5);
  E.newUnit(g, T('eu', 'medium'), 'eu', 6, 5, 3);
  const r = E.attack(g, a.id, 6, 5);
  assert.equal(r.counter, 0);
  assert.equal(a.hp, E.maxHP(a));
  for (const cls of ['scout', 'assault', 'raider', 'light', 'medium', 'heavy', 'super']) {
    const h = blank(),
      u = E.newUnit(h, T('britannia', cls), 'britannia', 5, 5);
    E.newUnit(h, T('eu', 'super'), 'eu', 6, 5, 3);
    assert(E.attack(h, u.id, 6, 5).counter > 0, cls + ' should receive counter-fire');
    const long = blank(),
      v = E.newUnit(long, T('britannia', cls), 'britannia', 5, 5);
    E.newUnit(long, T('eu', 'super'), 'eu', 7, 5, 3);
    assert.equal(!!E.preview(long, v.id, 7, 5), ['heavy', 'super'].includes(cls), cls + ' range');
  }
});
test('Rocket and siege artillery fire at exactly 2 hexes; rockets splash; siege breaks cities', () => {
  for (const cls of ['rocket', 'siege']) {
    const g = blank('eu'),
      u = E.newUnit(g, T('eu', cls), 'eu', 5, 5);
    E.newUnit(g, T('britannia', 'super'), 'britannia', 6, 5, 3);
    E.newUnit(g, T('britannia', 'super'), 'britannia', 7, 5, 3);
    assert.equal(E.preview(g, u.id, 6, 5), null);
    assert(E.preview(g, u.id, 7, 5));
    assert.equal(E.attack(g, u.id, 7, 5).counter, 0);
  }
  const g = blank('eu'),
    rocket = E.newUnit(g, T('eu', 'rocket'), 'eu', 5, 5),
    target = E.newUnit(g, T('britannia', 'light'), 'britannia', 7, 5),
    beside = E.newUnit(g, T('britannia', 'light'), 'britannia', 8, 5);
  const r = E.attack(g, rocket.id, 7, 5);
  assert(r.hit.some(h => h.id === beside.id));
  assert(target.hp < E.maxHP(target));
  const s = blank('eu'),
    siege = E.newUnit(s, T('eu', 'siege'), 'eu', 2, 0),
    rocket2 = E.newUnit(s, T('eu', 'rocket'), 'eu', 1, 2);
  s.stations[0].shield = s.stations[0].maxShield = 1000;
  assert(E.preview(s, siege.id, 0, 0).shield > E.preview(s, rocket2.id, 0, 0).shield);
});
test('Assault frames deal +55% to Armor; doctrines shape each power', () => {
  const g = blank(),
    assault = E.newUnit(g, T('britannia', 'assault'), 'britannia', 5, 5);
  E.newUnit(g, T('eu', 'medium'), 'eu', 6, 5);
  E.newUnit(g, T('eu', 'raider'), 'eu', 4, 5);
  const vsArmor = E.preview(g, assault.id, 6, 5).unit,
    vsInfantry = E.preview(g, assault.id, 4, 5).unit;
  assert(vsArmor > vsInfantry);
  assert.equal(E.price(T('cf', 'scout'), 1, g, 'cf').credits, Math.round(E.TYPES[T('cf', 'scout')].cost * 0.85));
  assert.equal(E.price(T('cf', 'light'), 1, g, 'cf').credits, E.TYPES[T('cf', 'light')].cost);
  // Britannian Armor hits 8% harder than the same frame stats elsewhere.
  const h = blank(),
    br = E.newUnit(h, 'sutherland', 'britannia', 5, 5),
    eu = E.newUnit(h, 'estrella', 'eu', 6, 5);
  const brHit = E.preview(h, br.id, 6, 5).unit;
  h.phase = 'eu';
  const euHit = E.preview(h, eu.id, 5, 5).unit;
  assert(brHit > euHit);
});
test('Armor breakthroughs: line frames fire again after a kill; heavies also move again', () => {
  const g = blank(),
    line = E.newUnit(g, T('britannia', 'light'), 'britannia', 5, 5, 3);
  E.newUnit(g, T('eu', 'scout'), 'eu', 6, 5).hp = 1;
  const r = E.attack(g, line.id, 6, 5);
  assert(r.destroyed && r.breakthrough);
  assert.equal(line.attacked, false);
  assert.equal(line.moved, true);
  const h = blank(),
    heavy = E.newUnit(h, T('britannia', 'heavy'), 'britannia', 5, 5, 3);
  E.newUnit(h, T('eu', 'scout'), 'eu', 6, 5).hp = 1;
  E.attack(h, heavy.id, 6, 5);
  assert.equal(heavy.moved, false);
});
test('Capturing a capital makes that power surrender, as in WC4', () => {
  const g = blank('britannia');
  g.stations.push({ ...g.stations[2], id: 3, name: 'Beijing', c: 9, r: 9, capital: false, capitalOf: null });
  const cfUnit = E.newUnit(g, T('cf', 'light'), 'cf', 9, 10);
  const u = E.newUnit(g, T('britannia', 'light'), 'britannia', 11, 10);
  g.stations[2].shield = 0;
  const r = E.move(g, u.id, 11, 11);
  assert(r.ok && r.annexed);
  assert.equal(r.annexed.loser, 'cf');
  assert.equal(g.stations.find(s => s.name === 'Beijing').owner, 'britannia');
  assert.equal(cfUnit.hp, 0);
  assert(!E.alive(g, 'cf'));
  assert.equal(g.over, null);
  g.stations[1].shield = 0;
  E.beginTurn(g, 'britannia', false);
  g.stations[1].shield = 0;
  const u2 = E.newUnit(g, T('britannia', 'scout'), 'britannia', 10, 0);
  assert(E.move(g, u2.id, 11, 0).ok);
  assert.equal(g.over.winner, 'britannia');
});
test('Losing your own capital loses the war', () => {
  const g = blank('eu');
  g.phase = 'britannia';
  g.stations[1].shield = 0;
  const u = E.newUnit(g, T('britannia', 'scout'), 'britannia', 10, 0);
  assert(E.move(g, u.id, 11, 0).ok);
  assert.equal(g.over.winner, 'britannia');
  assert.equal(E.missionReward(g).total, 0);
});
test('Commander abilities: Geass Command, Live On, Excalibur, Old Soldier’s Rations', () => {
  const g = blank(),
    julius = E.newUnit(g, T('britannia', 'medium'), 'britannia', 5, 5, 1, 'julius'),
    foe = E.newUnit(g, T('eu', 'light'), 'eu', 6, 5);
  assert.equal(E.feintReason(g, julius), null);
  assert(E.feint(g, julius.id).ok);
  assert.equal(foe.morale, -2);
  assert.match(E.feintReason(g, julius), /Ready in 3/);
  const suzaku = E.newUnit(g, T('britannia', 'super'), 'britannia', 2, 2, 1, 'suzaku');
  assert.equal(E.moraleFloor(g, suzaku), 0);
  // Speed now comes from the Mobility rating: Suzaku's 6 stars give +4 movement (plus Conquest's +2 world bonus).
  assert.equal(E.movement(g, suzaku), E.TYPES[suzaku.type].move + 2 + 4);
  const h = blank(),
    bis = E.newUnit(h, T('britannia', 'heavy'), 'britannia', 5, 5, 1, 'bismarck'),
    tank = E.newUnit(h, T('eu', 'super'), 'eu', 6, 5, 3);
  const before = tank.hp,
    r = E.attack(h, bis.id, 6, 5);
  assert(before - tank.hp > r.damage, 'Excalibur reflects counter-fire');
  const k = blank('eu'),
    klaus = E.newUnit(k, T('eu', 'scout'), 'eu', 5, 5, 1, 'klaus'),
    hurt = E.newUnit(k, T('eu', 'light'), 'eu', 10, 0);
  const full = E.repairCost(hurt);
  assert.equal(E.repairCost(hurt, k), Math.round(full / 2));
  assert(klaus);
});
test('Fortress batteries strike for 40% of a frame, then recharge', () => {
  const g = blank();
  g.stations[0].fort = true;
  const foe = E.newUnit(g, T('eu', 'heavy'), 'eu', 2, 1);
  assert.equal(E.fortressTargets(g, g.stations[0]).length, 1);
  const r = E.fireFortress(g, 0, 2, 1);
  assert(r.ok);
  assert.equal(r.damage, Math.round(E.maxHP(foe) * 0.4));
  assert(!E.fortressReady(g, g.stations[0]));
});
test('HQ: research gates, recruiting, promotion, branch stars and medals', () => {
  const p = { tokens: 2000, wins: 0 };
  assert.match(E.researchReason(p, 'armor.drives'), /Tier 2/);
  assert(E.research(p, 'infantry.guns').ok);
  assert.match(E.researchReason(p, 'infantry.mines'), /Tier 2|Requires/);
  assert(E.owns(p, 'suzaku') && E.owns(p, 'leila') && E.owns(p, 'xingke'));
  assert(!E.owns(p, 'anya'));
  assert(E.recruitCommander(p, 'anya').ok);
  assert(E.promote(p, 'anya').ok);
  assert.equal(E.roster(p).anya.rank, 1);
  assert(E.buyStar(p, 'anya', 'artillery').ok);
  assert.equal(E.roster(p).anya.ratings.artillery, 6);
  p.medals = ['valor'];
  assert(E.equipMedal(p, 'anya', 'valor').ok);
  assert(E.unequipMedal(p, 'anya', 'valor').ok);
  const g = E.applyProfile(E.createGame('britannia'), p);
  const u = g.units.find(u => u.side === 'britannia' && !u.cmd);
  assert.equal(E.assignReason(g, u, 'anya'), null);
  assert(E.assign(g, u.id, 'anya').ok);
  assert.match(E.assignReason(g, u, 'leila'), /another faction|already/);
});
test('Difficulty: Hard and Challenge strengthen every rival power', () => {
  const n = E.createGame('cf', 'normal', 'conquest', 9),
    h = E.createGame('cf', 'hard', 'conquest', 9),
    c = E.createGame('cf', 'challenge', 'conquest', 9);
  const rivals = g => g.units.filter(u => u.side !== 'cf');
  assert(rivals(h).length > rivals(n).length);
  assert(rivals(c).length > rivals(h).length);
  assert(Object.keys(h.tech.britannia).length > 0 && Object.keys(c.tech.eu).length > Object.keys(h.tech.eu).length);
  assert.equal(Object.keys(h.tech.cf).length, 0);
});
test('Rival powers take their turns without errors and respect the army cap', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 31);
  for (let turn = 0; turn < 6; turn++) {
    for (const side of g.order) {
      if (!E.alive(g, side) || g.over) continue;
      E.beginTurn(g, side, g.turn > 1);
      E.aiProduction(g);
      for (const u of g.units.filter(u => u.hp > 0 && u.side === side && !u.attacked)) E.aiOrder(g, u.id);
    }
    g.turn++;
  }
  for (const side of E.MAJORS) {
    const cities = g.stations.filter(s => s.owner === side).length;
    assert(g.units.filter(u => u.hp > 0 && u.side === side).length <= 14 + Math.round(cities * 0.9) + 12);
  }
});
test('Rewards are paid for the first victory only; saves from other versions are rejected', () => {
  const g = E.createGame('eu');
  g.over = { winner: 'eu', reason: 'test' };
  const first = E.missionReward(g, 0, {});
  assert(first.total >= 250 + 150 + 150);
  assert(E.missionReward(g, 1, { [E.operationKey(g)]: true }).repeat);
  assert.equal(E.migrateSave({ ...g, rulesVersion: 0 }), null);
  assert.equal(E.migrateSave(JSON.parse(JSON.stringify(g))).player, 'eu');
  const oldMap = JSON.parse(JSON.stringify(g));
  oldMap.cols = 100;
  oldMap.rows = 42;
  assert.equal(E.migrateSave(oldMap), null, 'old low-resolution conquest saves are rejected');
});
test('Sakuradite: Japan holds 70% of the deposits; Fuji is a mine of its own, island deposits are worked from cities', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 3),
    site = n => g.sites.find(d => d.name === n),
    city = n => g.stations.find(s => s.name === n);
  assert.equal(g.sites.reduce((a, d) => a + d.base, 0), 100);
  assert.equal(['Mount Fuji', 'Hokkaido', 'Kyushu'].reduce((a, n) => a + site(n).base, 0), 70);
  const fuji = site('Mount Fuji');
  assert.equal(fuji.city, null);
  assert.equal(fuji.owner, 'britannia');
  assert.equal(E.distance(fuji, city('Tokyo Settlement'), g), 1);
  assert.equal(E.tile(g, fuji.c, fuji.r).terrain, 'mountain');
  assert.equal(site('Hokkaido').city, city('Sapporo').id);
  assert.equal(site('Kyushu').city, city('Fukuoka').id);
  assert.equal(site('Stonehenge').city, city('London').id);
  assert.equal(E.depositOwner(g, site('Stonehenge')), 'eu');
  assert.equal(site('Rocky Mountains').owner, 'britannia');
  assert.equal(site('Qaidam Basin').owner, 'cf');
  for (const s of E.MAJORS) assert.equal(g.economy[s].sakuradite, E.SAKURADITE.start);
  // Capitals keep their old income: 50 plus the 15 their refinery used to export.
  assert.equal(city('Pendragon').income, 65);
  assert.equal(city('Pendragon').refinery, 0);
  // The AI wants Fuji almost as much as a capital.
  assert.equal(E.goalField(g, 'cf')[fuji.r * g.cols + fuji.c], -5);
});
test('Refineries extract 25/50/75/100% of a deposit; a level-3 refinery also exports for credits', () => {
  const g = blank();
  g.sites = [mine('britannia', 5, 5)];
  const levels = [0, 1, 2, 3].map(l => {
    g.sites[0].refinery = l;
    return E.income(g, 'britannia');
  });
  assert.deepEqual(levels.map(i => i.sakuradite), [10, 20, 30, 40]);
  assert.equal(levels[3].credits - levels[2].credits, E.SAKURADITE.exportCredits);
  g.sites[0].refinery = 0;
  const credits = g.economy.britannia.credits;
  assert(E.refine(g, 0).ok);
  assert.equal(g.sites[0].refinery, 1);
  assert.equal(g.economy.britannia.credits, credits - E.buildCost({ refinery: 0 }, 'refinery').credits);
  E.newUnit(g, T('eu', 'support'), 'eu', 5, 5);
  assert.match(E.refineReason(g, g.sites[0]), /Enemy unit/);
  // A deposit under a city uses the city's refinery; a city without one cannot build a refinery.
  assert.match(E.buildReason(g, g.stations[0], 'refinery'), /No Sakuradite deposit/);
  g.sites.push({ id: 1, name: 'City Field', c: 0, r: 0, base: 15, city: 0 });
  assert.equal(E.buildReason(g, g.stations[0], 'refinery'), null);
  assert(E.build(g, 0, 'refinery').ok);
  assert.equal(E.cityYield(g, g.stations[0]).sakuradite, Math.round(15 * 0.5));
});
test('Heavier frames cost Sakuradite by class; shortfalls name it', () => {
  const g = blank();
  for (const cls of ['scout', 'assault', 'light', 'support'])
    assert.equal(E.price(T('britannia', cls), 1, g).sakuradite, 0);
  for (const cls of ['raider', 'medium', 'rocket']) assert.equal(E.price(T('britannia', cls), 1, g).sakuradite, 5);
  assert.equal(E.price(T('britannia', 'heavy'), 1, g).sakuradite, 10);
  assert.equal(E.price(T('britannia', 'siege'), 1, g).sakuradite, 10);
  assert.equal(E.price(T('britannia', 'super'), 1, g).sakuradite, 25);
  assert.equal(E.price(T('britannia', 'heavy'), 3, g).sakuradite, Math.round(10 * 2.7));
  assert.equal(E.price(T('cf', 'raider'), 1, g, 'cf').sakuradite, Math.round(5 * 0.85), 'Federation Infantry discount');
  g.economy.britannia.sakuradite = 4;
  assert.equal(E.buyReason(g, g.stations[0], T('britannia', 'heavy'), 1), 'Need 6 more Sakuradite');
  g.economy.britannia.sakuradite = 30;
  assert(E.recruit(g, 0, T('britannia', 'heavy'), 1).ok);
  assert.equal(g.economy.britannia.sakuradite, 20);
  assert.equal(E.reinforceCost(T('britannia', 'heavy'), g, 'britannia').sakuradite, 10);
});
test('Infantry and Armor seize a mine by moving onto it; artillery cannot; city deposits change hands with the city', () => {
  const g = blank(),
    gun = E.newUnit(g, T('britannia', 'support'), 'britannia', 5, 5);
  g.sites = [mine('eu', 6, 5, 40, 2)];
  assert(E.move(g, gun.id, 6, 5).ok);
  assert.equal(g.sites[0].owner, 'eu', 'artillery cannot seize');
  const h = blank(),
    scout = E.newUnit(h, T('britannia', 'scout'), 'britannia', 5, 5);
  h.sites = [mine('eu', 6, 5, 40, 2)];
  const r = E.move(h, scout.id, 6, 5);
  assert.equal(r.seized, 'Test Mine');
  assert.equal(h.sites[0].owner, 'britannia');
  assert.equal(h.sites[0].refinery, 2, 'the refinery is taken intact');
  assert.equal(E.income(h, 'britannia').sakuradite, 30);
  assert.equal(E.income(h, 'eu').sakuradite, 0);
  // Paris falls: the E.U. surrenders, so its city deposit, its own mines and half its Sakuradite pass over.
  const k = blank();
  k.sites = [{ id: 0, name: 'Paris Field', c: 11, r: 0, base: 10, city: 1 }, { ...mine('eu', 4, 8), id: 1 }];
  k.economy.eu.sakuradite = 100;
  k.economy.britannia.sakuradite = 0;
  k.stations[1].shield = 0;
  const u = E.newUnit(k, T('britannia', 'scout'), 'britannia', 10, 0);
  assert(E.move(k, u.id, 11, 0).annexed);
  assert.equal(E.depositOwner(k, k.sites[0]), 'britannia');
  assert.equal(k.sites[1].owner, 'britannia');
  assert.equal(k.economy.britannia.sakuradite, 50);
  assert.equal(k.economy.eu.sakuradite, 0);
});
test('Version 2 saves on the current map (before Sakuradite) are upgraded: deposits placed, refineries away from a deposit become credits', () => {
  const v1 = JSON.parse(JSON.stringify(E.createGame('britannia', 'normal', 'conquest', 4))),
    city = n => v1.stations.find(s => s.name === n);
  v1.rulesVersion = 2;
  delete v1.sites;
  for (const e of Object.values(v1.economy)) delete e.sakuradite;
  Object.assign(city('Pendragon'), { income: 50, refinery: 1 });
  city('London').refinery = 2;
  city('Madrid').refinery = 2;
  const madrid = city('Madrid').income,
    g = E.migrateSave(v1);
  assert.equal(g.rulesVersion, E.RULES_VERSION);
  assert.equal(g.sites.length, E.RESOURCE_SITES.length);
  assert.equal(g.economy.eu.sakuradite, E.SAKURADITE.start);
  assert.equal(g.economy.neutral.sakuradite, 0);
  assert.equal(city('Pendragon').income, 65);
  assert.equal(city('Pendragon').refinery, 0);
  assert.equal(city('Madrid').income, madrid + 30);
  assert.equal(city('Madrid').refinery, 0);
  assert.equal(city('London').refinery, 2, 'London works the Stonehenge deposit');
  assert.equal(E.migrateSave({ ...v1, rulesVersion: 0 }), null);
  assert.equal(E.migrateSave({ ...JSON.parse(JSON.stringify(v1)), rulesVersion: 1 }), null, 'Version 1 saves use retired frames');
});
test('F.L.E.I.J.A. is conquest-only behind Research Lab III, which unlocks on turn 15', () => {
  const g = blank(),
    s = g.stations[0];
  assert.equal(E.TECH_NODES['sakura.fleija'], undefined, 'F.L.E.I.J.A. is not persistent HQ research');
  s.lab = 2;
  g.turn = E.FLEIJA.labTurn - 1;
  assert.equal(E.buildReason(g, s, 'lab'), `Research lab level 3 unlocks on turn ${E.FLEIJA.labTurn}`);
  assert.equal(E.projectReason(g, s), `Research lab level 3 unlocks on turn ${E.FLEIJA.labTurn}`);
  assert(!E.hasFleija(g, 'britannia'));
  assert(!E.hasFleija(g, 'eu'));
  g.difficulty = 'challenge';
  g.turn = E.FLEIJA.labTurn;
  assert(E.hasFleija(g, 'britannia'));
  assert(E.hasFleija(g, 'eu'), 'difficulty does not change the unlock turn');
  assert.equal(E.buildReason(g, s, 'lab'), null);
  assert(E.build(g, s.id, 'lab').ok);
  assert.equal(s.lab, 3);
  g.economy.britannia = { credits: 1000, industry: 5000, science: 5000, sakuradite: 500 };
  assert.equal(E.projectReason(g, s), 'Need 800 more credits');
  g.economy.britannia.credits = 5000;
  const r = E.startProject(g, 0);
  assert(r.ok);
  assert.equal(r.ready, g.turn + E.FLEIJA.turns);
  assert.deepEqual(g.economy.britannia, { credits: 3200, industry: 4550, science: 4700, sakuradite: 350 });
  assert(g.log.some(l => l.text === 'INTELLIGENCE: Strategic weapons research detected in Pendragon.'));
  // The city builds nothing else meanwhile.
  assert.equal(E.buyReason(g, s, T('britannia', 'scout')), 'F.L.E.I.J.A. project under way');
  s.tier = 2;
  assert.equal(E.buildReason(g, s, 'factory'), 'F.L.E.I.J.A. project under way');
  for (let t = 1; t < E.FLEIJA.turns; t++) {
    g.turn++;
    E.beginTurn(g, 'britannia', false);
    assert.equal(g.arsenal?.britannia || 0, 0, 'not ready on turn ' + g.turn);
  }
  g.turn++;
  E.beginTurn(g, 'britannia', false);
  assert.equal(g.arsenal.britannia, 1);
  assert.equal(s.project, null);
});
test('F.L.E.I.J.A. Eliminator unlocks after the first detonation and intercepts one nearby warhead', () => {
  const g = blank('britannia'),
    pendragon = g.stations[0];
  g.turn = E.FLEIJA.labTurn;
  pendragon.lab = 3;
  assert.equal(E.eliminatorReason(g, pendragon), 'Available after the first F.L.E.I.J.A. detonation');
  g.phase = 'eu';
  g.arsenal = { eu: 1 };
  const first = E.launch(g, 'eu', 6, 6);
  assert(first.ok && !first.intercepted);
  assert(first.eliminatorUnlocked);
  assert(E.eliminatorUnlocked(g));
  g.phase = 'britannia';
  g.economy.britannia = { credits: 5000, industry: 5000, science: 5000, sakuradite: 500 };
  assert.equal(E.eliminatorReason(g, pendragon), null);
  const project = E.startEliminator(g, pendragon.id);
  assert(project.ok);
  assert.equal(project.ready, g.turn + E.ELIMINATOR.turns);
  assert.deepEqual(g.economy.britannia, { credits: 3800, industry: 4700, science: 4750, sakuradite: 400 });
  assert.equal(E.buyReason(g, pendragon, T('britannia', 'scout')), 'F.L.E.I.J.A. Eliminator project under way');
  for (let t = 0; t < E.ELIMINATOR.turns; t++) {
    g.turn++;
    E.beginTurn(g, 'britannia', false);
  }
  assert.equal(pendragon.eliminator, 1);
  assert.equal(pendragon.eliminatorProject, null);
  const protectedTile = E.tile(g, 1, 0),
    beforeTerrain = protectedTile.terrain;
  g.phase = 'eu';
  g.arsenal.eu = 1;
  const blocked = E.launch(g, 'eu', protectedTile.c, protectedTile.r);
  assert(blocked.ok && blocked.intercepted);
  assert.equal(blocked.eliminatorCity, 'Pendragon');
  assert.equal(pendragon.eliminator, 0);
  assert.equal(protectedTile.terrain, beforeTerrain);
  pendragon.eliminator = 1;
  g.turn++;
  g.phase = 'eu';
  g.arsenal.eu = 1;
  const far = E.tile(g, 8, 8),
    hit = E.launch(g, 'eu', far.c, far.r);
  assert(hit.ok && !hit.intercepted);
  assert.equal(far.terrain, 'crater');
  assert.equal(pendragon.eliminator, 1);
});
test('Capturing a city ends its F.L.E.I.J.A. project; a surrendering power loses its warheads', () => {
  const g = blank('britannia');
  g.stations.push({
    ...g.stations[2],
    id: 3,
    name: 'Beijing',
    c: 6,
    r: 6,
    capital: false,
    capitalOf: null,
    shield: 0,
    project: { side: 'cf', started: 1, ready: 5 },
    eliminatorProject: { side: 'cf', started: 1, ready: 4 },
    eliminator: 1,
  });
  const u = E.newUnit(g, T('britannia', 'scout'), 'britannia', 5, 6);
  assert(E.move(g, u.id, 6, 6).ok);
  assert.equal(g.stations[3].project, null);
  assert.equal(g.stations[3].eliminatorProject, null);
  assert.equal(g.stations[3].eliminator, 0);
  assert(g.log.some(l => /Beijing: the F\.L\.E\.I\.J\.A\. project is lost/.test(l.text)));
  g.arsenal = { cf: 2 };
  g.stations[2].eliminator = 1;
  g.stations[2].shield = 0;
  const v = E.newUnit(g, T('britannia', 'scout'), 'britannia', 10, 11);
  assert(E.move(g, v.id, 11, 11).annexed);
  assert.equal(g.arsenal.cf, 0);
  assert.equal(g.stations[2].eliminator, 0);
});
test('A F.L.E.I.J.A. strike erases ground zero, cripples the ring and devastates the city there', () => {
  const g = blank('britannia'),
    city = (id, name, c, r, extra) => ({ ...g.stations[1], id, name, c, r, capital: false, capitalOf: null, ...extra });
  const berlin = city(3, 'Berlin', 6, 6, { tier: 3, lab: 2, refinery: 1, shield: 300, maxShield: 300, industry: 40 });
  const vienna = city(4, 'Vienna', 7, 6, { tier: 2, lab: 1, shield: 240, maxShield: 240, industry: 30, science: 11 });
  const prague = city(5, 'Prague', 8, 6, { tier: 2, lab: 1, shield: 240, maxShield: 240, industry: 30, science: 11 });
  g.stations.push(berlin, vienna, prague);
  const heavy = E.newUnit(g, T('eu', 'heavy'), 'eu', 6, 6, 3),
    scout = E.newUnit(g, T('eu', 'scout'), 'eu', 5, 6),
    own = E.newUnit(g, T('britannia', 'scout'), 'britannia', 6, 5),
    outer = E.newUnit(g, T('eu', 'light'), 'eu', 8, 6),
    far = E.newUnit(g, T('eu', 'scout'), 'eu', 2, 2);
  assert.match(E.launchReason(g, 'britannia', { c: 6, r: 6 }), /No F\.L\.E\.I\.J\.A\. warhead/);
  g.arsenal = { britannia: 2 };
  const r = E.launch(g, 'britannia', 6, 6);
  assert(r.ok);
  assert.equal(r.name, 'Berlin');
  assert.equal(heavy.hp, 0);
  assert.deepEqual(r.destroyed, [heavy.id]);
  for (const v of [scout, own]) {
    assert.equal(v.hp, Math.max(1, Math.round(E.maxHP(v) * E.FLEIJA.ringHP)));
    assert.equal(v.morale, -3);
  }
  assert.equal(outer.hp, Math.max(1, Math.round(E.maxHP(outer) * E.FLEIJA.outerHP)));
  assert.equal(outer.morale, -1);
  assert(r.damaged.includes(outer.id));
  assert.equal(prague.tier, 2, 'outer ring does not remove factory levels');
  assert.equal(prague.shield, Math.round(prague.maxShield * E.FLEIJA.outerShield));
  assert.equal(far.hp, E.maxHP(far), 'outside the blast');
  // Ground zero: devastated for 10 turns, every building at level 0, a crater; the owner is unchanged.
  assert.equal(berlin.owner, 'eu');
  assert.equal(berlin.devastated, g.turn + E.FLEIJA.devastation);
  assert.deepEqual([berlin.shield, berlin.tier, berlin.lab, berlin.refinery], [0, 0, 0, 0]);
  assert.equal(berlin.industry, 18, 'back to its founding industry');
  assert.equal(E.tile(g, 6, 6).terrain, 'crater');
  assert.deepEqual(E.cityYield(g, berlin), { credits: 0, industry: 0, science: 0, sakuradite: 0 });
  // The ring: defenses gone and one level of every building.
  assert.deepEqual([vienna.shield, vienna.tier, vienna.lab], [0, 1, 0]);
  assert.equal(vienna.industry, 20);
  assert.equal(E.launchReason(g, 'britannia', { c: 2, r: 2 }), 'One launch per turn');
  assert(g.log.some(l => l.text.startsWith('F.L.E.I.J.A. detonation at Berlin: 1 units erased, 2 crippled')));
  // Ruins stay without defenses or output; the factory must be rebuilt afterwards.
  E.beginTurn(g, 'eu', true);
  assert.equal(berlin.shield, 0);
  assert(vienna.shield > 0);
  assert.equal(E.buyReason(g, berlin, T('eu', 'scout')), `Devastated by F.L.E.I.J.A. until turn ${berlin.devastated}`);
  g.turn += E.FLEIJA.devastation;
  assert(!E.devastated(g, berlin));
  assert.equal(E.buyReason(g, berlin, T('eu', 'scout')), 'Requires factory level 1');
  assert.deepEqual(E.buildCost(berlin, 'factory'), { credits: 110, industry: 25 });
});
test('Rival powers aim warheads at the most valuable target and never at their own forces', () => {
  const g = blank('britannia');
  g.stations.push({
    ...g.stations[0],
    id: 3,
    name: 'Chicago',
    c: 3,
    r: 8,
    capital: false,
    capitalOf: null,
    project: { side: 'britannia', started: 1, ready: 9 },
  });
  E.newUnit(g, T('britannia', 'heavy'), 'britannia', 7, 7, 3);
  const guard = E.newUnit(g, T('eu', 'scout'), 'eu', 8, 7);
  g.phase = 'eu';
  g.arsenal = { eu: 1 };
  assert.deepEqual(E.aiLaunchTarget(g, 'eu'), E.tile(g, 3, 8), 'the project city, not the stack beside its own unit');
  E.aiProduction(g);
  assert.equal(g.launches.length, 1);
  assert.equal(g.launches[0].name, 'Chicago');
  assert.equal(guard.hp, E.maxHP(guard));
  // Nothing worth a warhead: hold it.
  const h = blank('britannia');
  E.newUnit(h, T('britannia', 'scout'), 'britannia', 6, 6);
  assert.equal(E.aiLaunchTarget(h, 'eu'), null);
});


test('Elite Forces are persistent single-frame units with fragment progression', () => {
  assert.equal(Object.keys(E.ELITE_FORCES).length, 19);
  for (const side of ['britannia', 'eu', 'cf', 'bk'])
    assert(Object.values(E.ELITE_FORCES).some(e => e.availableTo.includes(side)), `${side} has Elite Forces`);
  const p = {};
  const roster = E.eliteProfile(p);
  assert.equal(roster.cornelia_gloucester.fragments, E.ELITE_UNLOCK_FRAGMENTS);
  assert.equal(roster.tohdoh_gekka.fragments, E.ELITE_UNLOCK_FRAGMENTS);
  assert.equal(roster.lancelot.fragments, 0);
  assert(E.upgradeElite(p, 'cornelia_gloucester').ok);
  assert.equal(roster.cornelia_gloucester.level, 1);

  const g = E.applyProfile(blank('britannia'), p);
  const r = E.deployElite(g, 0, 'cornelia_gloucester', p);
  assert(r.ok, r.reason);
  assert.equal(r.unit.stack, 1);
  assert.equal(r.unit.elite, 'cornelia_gloucester');
  assert.match(E.reinforceReason(g, r.unit), /single unique/i);
  assert.match(E.eliteDeployReason(g, g.stations[0], 'cornelia_gloucester', p), /Already deployed/);
});

test('Elite levels scale stats and unlock signature abilities at Lv.3/Lv.5', () => {
  const one = E.eliteStats('lancelot_albion', 1),
    five = E.eliteStats('lancelot_albion', 5);
  assert(five.hp > one.hp);
  assert(five.attack > one.attack);
  assert(five.armor > one.armor);
  assert.equal(five.move, one.move + 2);

  const albion = { elite: 'lancelot_albion', eliteLevel: 3 },
    seiten = { elite: 'guren_seiten', eliteLevel: 5 };
  assert.equal(E.eliteFx(albion).moveAfterAttack, true);
  assert.equal(E.eliteFx(albion).float, true);
  assert.equal(E.eliteFx(seiten).noCounter, true);
  assert.equal(E.eliteFx(seiten).refire, true);
});

test('Elite fragment rewards are slower for higher rarities', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 9);
  g.over = { winner: 'britannia' };
  const first = E.eliteVictoryReward(g, { cleared: {} });
  assert.equal(first.cornelia_gloucester, 12);
  assert.equal(first.lancelot, 9);
  assert.equal(first.lancelot_albion, 6);
  const repeat = E.eliteVictoryReward(g, { cleared: { [E.operationKey(g)]: true } });
  assert(repeat.cornelia_gloucester > repeat.lancelot_albion);
});
test('Black Knights and JLF commanders are recruited in HQ and serve the Chinese Federation in Conquest', () => {
  const p = { tokens: 5000, wins: 0 };
  assert(E.recruitCommander(p, 'kallen').ok);
  assert(E.recruitCommander(p, 'katase').ok);
  assert(E.serves('kallen', 'cf') && E.serves('katase', 'cf'));
  assert(!E.serves('kallen', 'britannia') && !E.serves('kallen', 'eu'));
  const g = E.applyProfile(E.createGame('cf', 'normal', 'conquest', 7), p),
    u = g.units.find(u => u.side === 'cf' && !u.cmd);
  assert.equal(E.assignReason(g, u, 'kallen'), null);
  assert(E.assign(g, u.id, 'kallen').ok);
  const h = E.applyProfile(E.createGame('britannia', 'normal', 'conquest', 7), p);
  assert.match(E.assignReason(h, h.units.find(u => u.side === 'britannia' && !u.cmd), 'katase'), /another faction/);
});
test('Black Knights skills: Tactical Command, Ace, Code Bearer, Rapid Assault and Veteran’s Guard', () => {
  // Zero: a friendly unit within 2 hexes that has acted goes again; not Zero himself; then a 3-turn wait.
  const g = blank('cf'),
    zero = E.newUnit(g, T('cf', 'medium'), 'cf', 5, 5, 1, 'zero'),
    ace = E.newUnit(g, T('cf', 'heavy'), 'cf', 6, 5);
  assert.match(E.feintReason(g, zero), /No friendly unit/);
  ace.moved = ace.attacked = true;
  zero.moved = true;
  assert.deepEqual(E.commandTargets(g, zero).map(v => v.id), [ace.id]);
  assert.equal(E.feint(g, zero.id, ace.id).target, ace.id);
  assert(!ace.moved && !ace.attacked);
  assert.match(E.feintReason(g, zero), /Ready in 3/);
  // Kallen: her first kill each turn grants another attack.
  const k = blank('cf'),
    kallen = E.newUnit(k, T('cf', 'support'), 'cf', 5, 5, 1, 'kallen');
  E.newUnit(k, T('eu', 'scout'), 'eu', 6, 5).hp = 1;
  assert(E.attack(k, kallen.id, 6, 5).destroyed);
  assert.equal(kallen.attacked, false);
  E.newUnit(k, T('eu', 'scout'), 'eu', 4, 5).hp = 1;
  E.attack(k, kallen.id, 4, 5);
  assert.equal(kallen.attacked, true, 'only once per turn');
  // C.C.: a lethal blow leaves her at 1 HP once; F.L.E.I.J.A. spares no one.
  const c = blank('eu'),
    cc = E.newUnit(c, T('cf', 'scout'), 'cf', 6, 5, 1, 'cc');
  cc.hp = 1;
  E.attack(c, E.newUnit(c, T('eu', 'heavy'), 'eu', 5, 5, 3).id, 6, 5);
  assert.equal(cc.hp, 1);
  assert(cc.undyingUsed);
  assert.equal(E.moraleFloor(c, cc), -2);
  // Asahina: a target already hit this turn cannot counter him and he crits more often.
  const a = blank('cf'),
    first = E.newUnit(a, T('cf', 'support'), 'cf', 4, 5),
    asahina = E.newUnit(a, T('cf', 'light'), 'cf', 6, 6, 1, 'asahina');
  E.newUnit(a, T('eu', 'super'), 'eu', 5, 5, 3);
  const before = E.preview(a, asahina.id, 5, 5);
  assert(before.counterAllowed);
  E.attack(a, first.id, 5, 5);
  const after = E.preview(a, asahina.id, 5, 5);
  assert(!after.counterAllowed && after.crit > before.crit);
  // Senba: unmoved since his last turn, the first attack against him each phase is cut by 40%.
  const s = blank('eu'),
    senba = E.newUnit(s, T('cf', 'medium'), 'cf', 6, 5, 1, 'senba'),
    gun = E.newUnit(s, T('eu', 'support'), 'eu', 5, 5);
  const open = E.preview(s, gun.id, 6, 5).unit;
  senba.held = true;
  assert(E.preview(s, gun.id, 6, 5).unit < open * 0.65);
  E.attack(s, gun.id, 6, 5);
  assert.equal(E.preview(s, gun.id, 6, 5).unit, open, 'the guard is spent');
});

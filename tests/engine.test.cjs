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
  for (const s of E.MAJORS) g.economy[s] = { credits: 5000, industry: 5000, science: 0 };
  return g;
}
const T = (side, cls) => E.typeFor(side, cls);
test('Each power fields ten Knightmares across the three branches', () => {
  assert.equal(Object.keys(E.TYPES).length, 31);
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
  assert.deepEqual(Object.keys(E.TYPES).filter(k => E.TYPES[k].float).sort(), ['akatsuki_air', 'sutherland_air']);
});
test('The world map wraps east to west and every city stands on land', () => {
  const g = E.createGame('eu', 'normal', 'conquest', 5);
  const last = E.WORLD.cols - 1;
  assert.equal(g.tiles.length, E.WORLD.cols * E.WORLD.rows);
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
  for (const s of g.stations) assert.notEqual(E.tile(g, s.c, s.r).terrain, 'sea', s.name);
  const capitals = g.stations.filter(s => s.capital).map(s => [s.name, s.owner]);
  assert.deepEqual(capitals.sort(), [
    ['Luoyang', 'cf'],
    ['Paris', 'eu'],
    ['Pendragon', 'britannia'],
  ]);
  assert.equal(new Set(g.stations.map(E.key)).size, g.stations.length);
  assert(g.units.every(u => !E.isSea(E.tile(g, u.c, u.r))));
  assert.deepEqual(g.order, ['eu', 'britannia', 'cf']);
});
test('Movement obeys terrain, occupancy and the one-move rule', () => {
  let g = blank();
  const u = E.newUnit(g, T('britannia', 'siege'), 'britannia', 5, 5);
  E.tile(g, 6, 5).terrain = 'forest';
  assert(!E.reachable(g, u).has('6,5'));
  E.tile(g, 6, 5).terrain = 'plains';
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
  const g = blank();
  for (const t of g.tiles) if (t.c >= 4 && t.c <= 10) t.terrain = 'sea';
  const u = E.newUnit(g, T('britannia', 'light'), 'britannia', 3, 5);
  const reach = E.reachable(g, u);
  assert(reach.has('4,5'), 'adjacent sea hex reachable');
  assert(!reach.has('5,5'), 'embarking ends the move');
  assert(E.move(g, u.id, 4, 5).ok);
  assert(E.atSea(g, u));
  const raider = E.newUnit(g, T('eu', 'scout'), 'eu', 5, 5);
  assert.equal(E.targets(g, u).length, 0, 'embarked units cannot fire');
  raider.hp = 0;
  // Next turn: sail five hexes; landing takes a step and ends the move.
  E.beginTurn(g, 'britannia', false);
  const sail = E.reachable(g, u);
  assert(sail.has('9,5') && !sail.has('10,5'), 'sails five hexes');
  assert(!sail.has('11,5'), 'no movement left to land');
  assert(E.move(g, u.id, 9, 5).ok);
  E.beginTurn(g, 'britannia', false);
  const land = E.reachable(g, u);
  assert(land.has('11,5'), 'lands on the coast');
  assert(E.move(g, u.id, 11, 5).ok && !E.atSea(g, u));
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
  assert.equal(E.movement(g, suzaku), E.TYPES[suzaku.type].move + 1);
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
});

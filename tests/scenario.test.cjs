'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const japan = require('../dist/scenarios.js');

const city = (g, name) => g.stations.find(s => s.name === name);
function landReachable(g, origin, destination) {
  const start = city(g, origin), finish = city(g, destination);
  const seen = new Set([E.key(start)]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    if (E.key(queue[i]) === E.key(finish)) return true;
    for (const n of E.adjacent(g, queue[i])) {
      const key = E.key(n);
      if (n.terrain !== 'sea' && !E.TERRAIN[n.terrain]?.blocked && !seen.has(key)) {
        seen.add(key);
        queue.push(n);
      }
    }
  }
  return false;
}

test('Japan uses a tightly cropped north-up regional map with unchanged island connectivity', () => {
  const g = japan.create('britannia', 'normal', 11);
  assert.equal(g.mode, 'scenario');
  assert.equal(g.wrap, false);
  assert.equal(g.cols, 110);
  assert.equal(g.rows, 84);
  assert.equal(g.tiles.length, 9240);
  assert.equal(g.scenario.projection.angle, 0);
  assert.equal(g.stations.length, 44);
  assert.equal(new Set(g.stations.map(s => E.key(s))).size, 44);
  assert.equal(new Set(g.units.map(u => E.key(u))).size, g.units.length);
  assert.ok(g.tiles.some(t => t.terrain === 'mountain'));
  assert.ok(g.tiles.some(t => t.terrain === 'forest'));
  assert.ok(g.tiles.some(t => t.terrain === 'coast'));
  assert.ok(g.tiles.some(t => t.terrain === 'sea'));
  assert.ok(g.stations.every(s => E.tile(g, s.c, s.r).terrain !== 'sea'));
  assert.ok(g.units.every(u => E.TYPES[u.type].naval || E.tile(g, u.c, u.r).terrain !== 'sea'));
  assert.ok(g.tiles.every(t => t.terrain === 'sea' || t.terrain === 'offmap' || (t.owner && t.provinceCity != null)));
});

test('North-up Japan grid crops the offshore margins without losing Japanese land', () => {
  const g = japan.create('britannia', 'normal', 11);
  const land = g.tiles.filter(t => t.owner && !E.TERRAIN[t.terrain]?.blocked).length;
  const sea = g.tiles.filter(t => t.terrain === 'sea').length;
  const offmap = g.tiles.filter(t => t.terrain === 'offmap').length;
  assert.ok(land >= 1250, 'north-up islands retain more than 1250 land hexes');
  assert.ok(land / g.tiles.length > 0.14, 'cropped land share exceeds the old full rectangle');
  assert.equal(sea, 1628, 'only the four coastal rings are navigable');
  assert.equal(offmap, 6271, 'deep-ocean cells are excluded from navigation');
  assert.equal(g.scenario.coastalSea.width, 4);
  assert.equal(g.stations.length, 44, 'all original Japan cities remain present');
});

test('Every visible sea hex is within four hexes of Japanese land', () => {
  const g = japan.create('cf', 'normal', 19);
  const depth = new Int16Array(g.tiles.length).fill(-1), queue = [];
  for (const tile of g.tiles) if (tile.owner) {
    depth[tile.r * g.cols + tile.c] = 0;
    queue.push(tile);
  }
  for (let i = 0; i < queue.length; i++) {
    const tile = queue[i], d = depth[tile.r * g.cols + tile.c];
    for (const n of E.adjacent(g, tile)) {
      const key = n.r * g.cols + n.c;
      if (depth[key] === -1 && (n.terrain === 'sea' || n.terrain === 'offmap')) {
        depth[key] = d + 1; queue.push(n);
      }
    }
  }
  assert.ok(g.tiles.filter(t => t.terrain === 'sea').every(t =>
    depth[t.r * g.cols + t.c] > 0 && depth[t.r * g.cols + t.c] <= 4));
  assert.ok(g.tiles.filter(t => t.terrain === 'offmap').every(t =>
    depth[t.r * g.cols + t.c] > 4));
});

test('Japan coast is genuinely mixed land/water, not every land hex beside sea', () => {
  const g=japan.create('cf','normal',19);
  const coastalCities=g.stations.filter(s=>E.adjacent(g,s).some(t=>t.terrain==='sea'));
  assert.ok(coastalCities.length>=20,'scenario contains substantial coastal settlements');
  // The original classifier incorrectly marked almost 300 completely dry or
  // ocean-covered source-mask hexes as navigable coast.
  const coast=g.tiles.filter(t=>t.terrain==='coast');
  assert.ok(coast.length>=150 && coast.length<=250,'only mixed shoreline is coast');
  for(const [c,r] of [[82,2],[83,3],[85,5]])
    assert.notEqual(E.tile(g,c,r).terrain,'coast','dry source-mask hex '+c+','+r);
  assert.equal(g.tiles.filter(t=>t.terrain==='sea').length,1628);
  for(const s of g.stations.filter(s=>s.portAt))
    assert.equal(E.tile(g,s.portAt.c,s.portAt.r).terrain,'sea');
});

test('Japan coastline follows the visible vector atlas when available', () => {
  const prior=globalThis.GEOGRAPHY;
  try {
    // A synthetic all-land atlas cannot contain genuinely mixed coastal hexes.
    // The test also proves that using a different sampler leaves the tactical
    // land/sea mask and all nine ports unchanged.
    globalThis.GEOGRAPHY={japanLandAt:()=>true};
    const g=japan.create('cf','normal',19);
    assert.equal(g.tiles.filter(t=>t.terrain==='coast').length,0);
    assert.equal(g.tiles.filter(t=>t.terrain==='sea').length,1628);
    assert.equal(g.stations.filter(s=>s.portAt).length,9);
    for(const s of g.stations.filter(s=>s.portAt))
      assert.equal(E.tile(g,s.portAt.c,s.portAt.r).terrain,'sea');
  } finally {
    if(prior===undefined)delete globalThis.GEOGRAPHY;
    else globalThis.GEOGRAPHY=prior;
  }
});

test('North-up layout places Hokkaido above Honshu and Kyushu below it', () => {
  const g = japan.create('cf', 'normal', 11);
  assert.equal(g.scenario.projection.angle, 0);
  assert.ok(city(g, 'Sapporo').r < city(g, 'Tokyo Settlement').r);
  assert.ok(city(g, 'Tokyo Settlement').r < city(g, 'Kagoshima').r);
  assert.ok(city(g, 'Fukuoka').c < city(g, 'Tokyo Settlement').c);
  assert.ok(city(g, 'Tokyo Settlement').c < city(g, 'Kushiro').c);
});

test('Takamatsu stays on Shikoku, straits and other islands are not accidental land bridges', () => {
  const g = japan.create('britannia', 'normal', 22);
  assert.equal(landReachable(g, 'Takamatsu', 'Matsuyama'), true);
  assert.equal(landReachable(g, 'Takamatsu', 'Kobe'), false);
  assert.equal(landReachable(g, 'Kitakyushu', 'Shimonoseki'), false);
  assert.equal(landReachable(g, 'Sapporo', 'Aomori'), false);
  assert.equal(E.tile(g, 11, 64).terrain, 'sea');
});

test('All Kyushu cities, provinces and shoreline hexes start as Chinese Federation land', () => {
  const g = japan.create('cf', 'normal', 23);
  const kyushuNames = ['Kitakyushu','Fukuoka','Nagasaki','Sasebo',
    'Oita','Kumamoto','Miyazaki','Kagoshima'];
  for (const name of kyushuNames)
    assert.equal(city(g, name).owner, 'cf', name + ' should be Chinese');
  const first = city(g, 'Kumamoto'), queue = [E.tile(g, first.c, first.r)],
    seen = new Set([E.key(first)]);
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    assert.equal(t.owner, 'cf', 'Kyushu hex ' + E.key(t));
    assert.equal(g.stations[t.provinceCity].owner, 'cf');
    for (const n of E.adjacent(g, t)) {
      const key = E.key(n);
      if (n.terrain !== 'sea' && !E.TERRAIN[n.terrain]?.blocked && !seen.has(key)) {
        seen.add(key);
        queue.push(n);
      }
    }
  }
  assert.ok(queue.length > 100, 'test traverses the entire Kyushu landmass');
  assert.equal(landReachable(g, 'Kumamoto', 'Shimonoseki'), false,
    'Kanmon Strait still prevents accidental land movement');
  assert.ok(g.units.filter(u => u.side === 'britannia' && !E.TYPES[u.type].naval)
    .every(u => E.tile(g, u.c, u.r).owner === 'britannia'),
    'Britannian starting troops remain outside Chinese territory');
  assert.deepEqual(g.scenario.bounds, japan.bounds);
});


test('Chinese invasion formations cover all eight Kyushu cities without changing army size', () => {
  const g = japan.create('cf', 'normal', 11);
  const groups = g.scenario.groups.filter(gr => gr.side === 'cf' && gr.id.startsWith('army-'));
  const cities = ['Kitakyushu', 'Fukuoka', 'Nagasaki', 'Sasebo',
    'Oita', 'Kumamoto', 'Miyazaki', 'Kagoshima'];
  assert.deepEqual(groups.map(gr => gr.origin).sort(), cities.sort());
  assert.ok(groups.every(gr => gr.units.length >= 2 && gr.units.length <= 3),
    'no Chinese city concentrates more than three starting land units');
  const land = g.units.filter(u => u.side === 'cf' && !E.TYPES[u.type].naval);
  assert.equal(land.length, 21);
  assert.equal(new Set(groups.flatMap(gr => gr.units)).size, land.length);
  for (const group of groups) {
    const origin = city(g, group.origin);
    for (const id of group.units) {
      const unit = land.find(u => u.id === id);
      assert.ok(unit, 'army-group IDs must refer to Chinese land units');
      assert.equal(E.tile(g, unit.c, unit.r).owner, 'cf');
      assert.ok(E.distance(unit, origin, g) <= 3,
        group.origin + ' formations should remain near their staging city');
    }
  }
});

test('Black Knights use near-black political colouring with a gold UI accent', () => {
  const g = japan.create('bk', 'normal', 17);
  assert.equal(E.FACTIONS.bk.color, '#18181f');
  assert.equal(g.factions.bk.color, '#18181f');
  assert.ok(g.tiles.some(t => t.owner === 'bk'),
    'Black Knight territorial provinces remain identifiable');
});

test('All three playable factions share one map, can act and have the expected forces', () => {
  const expected = { britannia: [31, 20], bk: [5, 13], cf: [8, 29] };
  const starts = [];
  for (const player of japan.sides) {
    const g = japan.create(player, 'normal', 11);
    assert.equal(g.player, player);
    assert.equal(g.order[0], player);
    assert.deepEqual(new Set(g.order), new Set(japan.sides));
    assert.equal(E.alive(g, 'bk'), true);
    assert.equal(E.foe(g, 'britannia', 'bk'), false);
    assert.equal(E.foe(g, 'britannia', 'cf'), true);
    assert.equal(E.foe(g, 'bk', 'cf'), true);
    assert.equal(g.units.length, 62);
    assert.equal(g.startUnits.britannia, 20);
    assert.equal(g.units.filter(u => u.side === 'britannia' && E.TYPES[u.type].naval).length, 6);
    for (const side of japan.sides)
      assert.deepEqual([
        g.stations.filter(s => s.owner === side).length,
        g.units.filter(u => u.side === side).length
      ], expected[side]);
    starts.push(g.tiles.map(t => t.terrain).join(','));
    assert.equal(E.checkVictory(g), null);
  }
  assert.equal(starts[0], starts[1]);
  assert.equal(starts[1], starts[2]);
});

test('Scenario initialization never constructs a disposable world conquest', () => {
  const before = E.createGame;
  E.createGame = () => { throw Error('Unexpected world initialization'); };
  try {
    assert.equal(japan.create('bk').tiles.length, 9240);
  } finally {
    E.createGame = before;
  }
});

test('Nine ports and all starting fleets share a connected coastal sea network', () => {
  const g = japan.create('cf', 'normal', 19);
  const sea = g.tiles.filter(t => t.terrain === 'sea');
  const queue = [sea[0]], seen = new Set([E.key(sea[0])]);
  for (let i = 0; i < queue.length; i++)
    for (const n of E.adjacent(g,queue[i])) {
      const k=E.key(n);
      if(n.terrain==='sea'&&!seen.has(k)){seen.add(k);queue.push(n);}
    }
  assert.equal(seen.size,sea.length);
  for(const station of g.stations.filter(s=>s.portAt))
    assert.ok(seen.has(E.key(station.portAt)),station.name+' harbor is accessible');
  for(const unit of g.units.filter(u=>E.TYPES[u.type].naval))
    assert.ok(seen.has(E.key(unit)),'fleet can reach other coastal seas');
});

test('Removed deep sea is not navigable by ships or amphibious units', () => {
  const g = japan.create('cf', 'normal', 19);
  const deep = g.tiles.find(t => t.terrain === 'offmap');
  assert.ok(deep);
  assert.equal(E.TERRAIN.offmap.blocked,true);
  assert.equal(E.navigable(deep),false);
  const ship = g.units.find(u=>u.side==='cf' && E.TYPES[u.type].naval==='ship');
  assert.ok(ship);
  assert.equal(E.setGoto(g,ship.id,deep.c,deep.r).ok,false);
  for(const key of E.reachable(g,ship).keys()){
    const [c,r] = key.split(',').map(Number);
    assert.notEqual(E.tile(g,c,r).terrain,'offmap');
  }
});

test('Nine legal ports, fourteen waterborne formations and Japanese Sakuradite sites', () => {
  const g = japan.create('cf');
  const ports = g.stations.filter(s => s.portAt);
  assert.equal(ports.length, 9);
  assert.equal(new Set(ports.map(s => E.key(s.portAt))).size, ports.length);
  assert.ok(ports.every(s => E.tile(g, s.portAt.c, s.portAt.r).terrain === 'sea'));
  const ships = g.units.filter(u => E.TYPES[u.type].naval);
  assert.equal(ships.length, 14);
  assert.ok(ships.every(u => E.tile(g, u.c, u.r).terrain === 'sea'));
  assert.deepEqual(g.sites.map(d => d.name), ['Mount Fuji', 'Hokkaido', 'Kyushu']);
  assert.ok(E.income(g, 'bk').sakuradite > 0);
  assert.ok(E.income(g, 'cf').sakuradite > 0);
});

test('Opening economy: China and Black Knights earn around 300 credits and China holds four turns of reserves', () => {
  const normal = {
    britannia: { credits: 400, industry: 220, science: 42, sakuradite: 28 },
    bk:         { credits: 300, industry: 175, science: 32, sakuradite: 12 },
    cf:         { credits: 320, industry: 185, science: 34, sakuradite: 15 },
  };
  for (const player of japan.sides) {
    for (const difficulty of ['normal', 'hard', 'challenge']) {
      const g = japan.create(player, difficulty, 11);
      for (const side of japan.sides) {
        const factor = side === player ? 1 : difficulty === 'challenge' ? 1.6 :
          difficulty === 'hard' ? 1.3 : 1;
        const expected = Object.fromEntries(
          Object.entries(normal[side]).map(([resource, amount]) =>
            [resource, Math.round(amount * factor)]));
        assert.deepEqual(E.income(g, side), expected);
        for (const [resource, amount] of Object.entries(expected))
          assert.equal(g.economy[side][resource], (side === 'cf' ? 4 : 2) * amount);
      }
    }
  }
});

test('Captured cities change income and preserve fixed command funding', () => {
  const g = japan.create('cf', 'normal', 11);
  const fundingBefore = { ...g.scenario.funding.cf };
  const beforeBritannia = E.income(g, 'britannia');
  const beforeChina = E.income(g, 'cf');
  const hiroshima = city(g, 'Hiroshima');
  hiroshima.owner = 'cf';
  const afterBritannia = E.income(g, 'britannia');
  const afterChina = E.income(g, 'cf');
  assert.ok(afterBritannia.credits < beforeBritannia.credits);
  assert.ok(afterBritannia.industry < beforeBritannia.industry);
  assert.ok(afterChina.credits > beforeChina.credits);
  assert.ok(afterChina.industry > beforeChina.industry);
  assert.deepEqual(g.scenario.funding.cf, fundingBefore);
});

test('Difficulty selector changes rival formation strength while preserving the map', () => {
  const normal = japan.create('bk', 'normal', 11);
  const hard = japan.create('bk', 'hard', 11);
  const challenge = japan.create('bk', 'challenge', 11);
  const strength = g => g.units.filter(u => u.side !== g.player).reduce((n, u) => n + u.stack, 0);
  assert.ok(strength(hard) > strength(normal));
  assert.ok(strength(challenge) > strength(hard));
  assert.deepEqual(normal.stations.map(s => E.key(s)), hard.stations.map(s => E.key(s)));
});

test('Army group orders assign actual unit destinations, not just visual labels', () => {
  const g = japan.create('bk', 'normal', 11);
  assert.ok(g.scenario.groups.length >= 20);
  const group = g.scenario.groups.find(x => x.side === 'bk' && x.origin === 'Kyoto');
  assert.ok(group);
  const t = city(g, 'Tokyo Settlement');
  const result = japan.orderGroup(g, group.id, t);
  assert.equal(result.ok, true);
  assert.ok(result.assigned > 0);
  assert.ok(group.units.some(id => g.units.find(u => u.id === id)?.goto));
  assert.equal(japan.orderGroup(g, 'invalid-id', t).ok, false);
});

test('Alliance changes exactly once on turn 10 and faction victory goals differ', () => {
  const g = japan.create('britannia', 'normal', 11);
  g.turn = 9;
  assert.equal(japan.onTurn(g), false);
  assert.equal(E.foe(g, 'britannia', 'bk'), false);
  g.turn = 10;
  assert.equal(japan.onTurn(g), true);
  assert.equal(E.foe(g, 'britannia', 'bk'), true);
  assert.equal(japan.onTurn(g), false);
  assert.equal(g.scenario.phase, 'three-way-war');
  assert.notEqual(japan.objective(g, 'britannia'), japan.objective(g, 'cf'));
  assert.notEqual(japan.objective(g, 'bk'), japan.objective(g, 'britannia'));
});

test('Controlling required regional strongholds actually wins a scenario', () => {
  const g = japan.create('cf', 'normal', 11);
  g.turn = 14;
  g.scenario.phase = 'three-way-war';
  for (const s of g.stations) s.owner = 'cf';
  assert.equal(E.checkVictory(g).winner, 'cf');
});

test('Scenario defeat does not assign victory to an arbitrary survivor', () => {
  const g = japan.create('bk', 'normal', 11);
  g.turn = 11;
  for (const s of g.stations)
    if (s.owner === 'bk') s.owner = 'cf';
  // China leads overwhelmingly, but Britannia is still alive and neither
  // side has secured the whole war. The eliminated player has merely lost.
  const result = E.checkVictory(g);
  assert.equal(result.eliminated, true);
  assert.equal(result.winner, null);
  assert.ok(result.reason.includes('war continues'));
  assert.ok(result.reason.includes(E.FACTIONS.cf.name));
  assert.ok(result.reason.includes(E.FACTIONS.britannia.name));
});

test('Scenario defeat names the real winner if one power remains', () => {
  const g = japan.create('bk', 'normal', 11);
  g.turn = 11;
  for (const s of g.stations) s.owner = 'cf';
  const result = E.checkVictory(g);
  assert.equal(result.eliminated, true);
  assert.equal(result.winner, 'cf');
});

test('Both AI enemies can produce and act without crashing in all three modes', () => {
  for (const player of japan.sides) {
    const g = japan.create(player, 'normal', 21);
    for (const side of g.order.slice(1)) {
      E.beginTurn(g, side, false);
      E.aiProduction(g);
      for (const id of g.units.filter(u => u.hp > 0 && u.side === side).map(u => u.id))
        E.aiOrder(g, id);
    }
    E.beginTurn(g, g.player, true);
    assert.equal(E.checkVictory(g), null);
  }
});

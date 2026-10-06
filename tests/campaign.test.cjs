const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
const C = require('../dist/campaign.js');

const ids = Object.values(C.CAMPAIGNS).flatMap(c => c.missions.map(m => m.id));
// Every side plays its turn with the AI, including the player's, as endTurn does for rivals.
function play(g, turns) {
  for (let t = 0; t < turns && !g.over; t++) {
    for (const side of g.order) {
      if (g.over) break;
      if (side !== g.player || g.turn > 1 || t > 0) E.beginTurn(g, side, g.turn > 1);
      E.aiProduction(g);
      for (const u of g.units.filter(v => v.hp > 0 && v.side === side)) if (!g.over) E.aiOrder(g, u.id);
    }
    if (!g.over) g.turn++;
  }
  return g;
}

test('Both campaigns list their missions in order: 10 for the Black Knights, 11 for Britannia', () => {
  assert.equal(C.CAMPAIGNS.bk.missions.length, 10);
  assert.equal(C.CAMPAIGNS.britannia.missions.length, 11);
  assert(C.unlocked({}, 'bk1') && C.unlocked({}, 'br1'));
  assert(!C.unlocked({}, 'bk2'));
  assert(C.unlocked({ campaign: { bk1: 1 } }, 'bk2'));
  assert.equal(C.next('bk1'), 'bk2');
  assert.equal(C.next('bk10'), null);
});

test('Every mission builds: rectangular map, cities on open land, known frames and commanders, every side fielded', () => {
  for (const id of ids) {
    const m = C.mission(id),
      g = C.createMission(id, 7);
    assert.equal(g.mode, 'campaign', id);
    assert.equal(g.tiles.length, g.cols * g.rows, id);
    for (const u of g.units) {
      assert(E.TYPES[u.type], `${id}: unknown frame ${u.type}`);
      assert(!u.cmd || E.COMMANDERS[u.cmd], `${id}: unknown commander ${u.cmd}`);
      const t = E.tile(g, u.c, u.r);
      assert(!E.TERRAIN[t.terrain].blocked && !E.isSea(t), `${id}: unit on ${t.terrain}`);
    }
    const spawned = new Set((m.events || []).flatMap(ev => (ev.spawn || []).map(s => s[0])));
    for (const side of g.order) assert(g.units.some(u => u.side === side) || spawned.has(side), `${id}: ${side} has no units`);
    for (const ev of m.events || [])
      for (const s of ev.spawn || []) assert(E.TYPES[s[1]] || E.CLASS_ORDER.includes(s[1]), `${id}: unknown spawn ${s[1]}`);
    for (const c of [...[m.win].flat(), ...m.stars]) for (const n of c.capture || c.keep || c.reach || []) assert(g.stations.some(s => s.name === n), `${id}: no city ${n}`);
    assert.equal(m.stars.length, 2, id);
    assert(E.objectiveText(g).length > 10 && E.modeTitle(g).includes(m.title), id);
    assert(g.campaign.queue.length > 0, `${id}: opening briefing`);
  }
});

test('The AI plays every mission for eight turns without errors, and the same seed gives the same game', () => {
  for (const id of ids) {
    const a = play(C.createMission(id, 11), 8);
    assert(a.turn > 1 || a.over, id);
    const b = play(C.createMission(id, 11), 8);
    assert.equal(JSON.stringify(a.units), JSON.stringify(b.units), `${id}: deterministic`);
  }
});

test('Named aces are single-frame Elite Forces at level 3; Elite levels from HQ apply only to your own units', () => {
  const g = C.createMission('bk3', 3),
    guren = g.units.find(u => u.cmd === 'kallen');
  assert.equal(guren.type, 'elite_guren_mkii');
  assert.equal(guren.elite, 'guren_mkii');
  assert.equal(guren.eliteLevel, 3);
  assert.equal(guren.stack, 1);
  const h = C.createMission('br4', 3);
  E.applyProfile(h, { elites: { guren_mkii: { level: 5, fragments: 0 } } });
  play(h, 4);
  const enemy = h.units.find(u => u.cmd === 'kallen');
  assert(enemy && enemy.eliteLevel === 3, 'the enemy Guren keeps its mission level');
});

test('Allies never target each other; Conquest lineups exclude campaign and Elite Force frames', () => {
  const g = C.createMission('bk3', 1),
    zero = g.units.find(u => u.cmd === 'zero'),
    ally = g.units.find(u => u.side === 'jlf');
  assert(!E.foe(g, 'bk', 'jlf') && E.foe(g, 'bk', 'britannia'));
  ally.c = zero.c + 1;
  ally.r = zero.r;
  assert(!E.targets(g, zero).some(p => p.c === ally.c && p.r === ally.r));
  for (const side of E.MAJORS)
    for (const id of Object.values(E.ROSTER[side])) assert(!E.TYPES[id].campaign && !E.TYPES[id].elite, id);
  assert.equal(E.ROSTER.bk.super, 'akatsuki_air');
  const conquest = E.createGame('britannia', 'normal', 'conquest', 5);
  assert(!conquest.units.some(u => E.TYPES[u.type].campaign));
});

test('Scripted events: the Narita landslide, F.L.E.I.J.A. craters and Gefjun Disturbers', () => {
  const g = C.createMission('bk3', 2),
    before = g.units.filter(u => u.side === 'britannia').reduce((a, u) => a + u.hp, 0),
    rebels = g.units.filter(u => u.side !== 'britannia').reduce((a, u) => a + u.hp, 0);
  g.turn = 3;
  E.beginTurn(g, 'bk', true);
  assert(g.units.filter(u => u.side === 'britannia').reduce((a, u) => a + Math.max(0, u.hp), 0) < before, 'landslide hurts Britannia');
  assert(g.units.filter(u => u.side !== 'britannia').reduce((a, u) => a + Math.max(0, u.hp), 0) >= rebels, 'only Britannia');
  assert(g.campaign.fx.some(f => f.kind === 'blast'));
  const t = C.createMission('bk7', 2);
  t.turn = 7;
  E.beginTurn(t, 'bk', true);
  assert.equal(E.tile(t, 12, 7).terrain, 'crater');
  assert(!t.units.some(u => u.hp > 0 && u.c === 12 && u.r === 7));
  const s = C.createMission('bk7', 2),
    point = s.stations.find(c => c.name === 'Gefjun Point North'),
    unit = s.units.find(u => u.side === 'bk' && u.cmd === 'ohgi'),
    guard = E.unitAt(s, point);
  if (guard) guard.hp = 0;
  point.shield = 0;
  unit.c = point.c - 1;
  unit.r = point.r;
  unit.moved = false;
  s.units = s.units.filter(u => u.hp > 0);
  const r = E.move(s, unit.id, point.c, point.r);
  assert(r.ok && r.captured, r.reason);
  assert(s.units.filter(u => u.side === 'britannia' && E.distance(u, { c: 17, r: 6 }, s) <= 3 && u.hp > 0).every(u => u.morale === -3));
  assert.equal(s.stations.find(c => c.name === 'Government Bureau').shield, 120);
});

test('Victory grades stars; rewards pay a first clear and new stars once; losing Zero fails the mission', () => {
  const g = C.createMission('bk1', 4),
    base = g.stations.find(s => s.name === 'G-1 Base');
  base.owner = 'bk';
  E.checkVictory(g);
  assert.equal(g.over.winner, 'bk');
  assert.deepEqual(g.over.starList, [true, true, true]);
  const r = C.reward(g, {});
  assert.equal(r.total, C.REWARD.first + 2 * C.REWARD.star);
  assert(C.reward(g, { campaign: { bk1: 3 } }).repeat);
  const h = C.createMission('bk1', 4),
    zero = h.units.find(u => u.cmd === 'zero');
  zero.hp = 0;
  E.kill(h, zero, null);
  E.checkVictory(h);
  assert.equal(h.over.winner, 'britannia');
  assert.match(h.over.reason, /Zero/);
  const k = C.createMission('br5', 4);
  k.turn = 11;
  E.beginTurn(k, 'britannia', true);
  assert.equal(k.over?.winner, 'britannia', 'holding until turn 10 wins');
});

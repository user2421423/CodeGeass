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

test('Three story arcs, each played from both sides; missions unlock in order within each campaign', () => {
  const count = Object.fromEntries(Object.entries(C.CAMPAIGNS).map(([k, c]) => [k, c.missions.length]));
  assert.deepEqual(count, { bk_s1: 9, britannia_s1: 10, bk_r2: 12, britannia_r2: 11, eb_europe: 8, eu_europe: 8 });
  assert.deepEqual(Object.keys(C.SEASONS), ['1', '2', '3']);
  for (const c of Object.values(C.CAMPAIGNS)) assert(C.SEASONS[c.season] && E.FACTIONS[c.side]);
  assert.equal(new Set(ids).size, ids.length, 'every mission belongs to one campaign');
  for (const id of ['bk1', 'br1', 'bk5', 'br7', 'eb_narva', 'eu_narva']) assert(C.unlocked({}, id), `${id} opens its campaign`);
  assert(!C.unlocked({}, 'bk2'));
  assert(C.unlocked({ campaign: { bk1: 1 } }, 'bk2'));
  assert.equal(C.next('bk3'), 'bk_yokosuka');
  assert.equal(C.next('bk4'), null, 'the Black Rebellion ends Season 1');
  assert.equal(C.next('bk5'), 'bk_rescue', 'Babel Tower is followed by the Gallows rescue');
  assert.equal(C.next('bk_yokosuka2'), 'bk_zhengzhou', 'Zhengzhou sits between Second Yokosuka and Xiaopei');
  assert.equal(C.next('bk_geass'), 'bk8', 'Kagoshima comes before the Second Battle of Tokyo');
  assert.equal(C.next('bk8'), 'bk7', 'Second Tokyo follows the Kagoshima landing');
  assert.equal(C.next('br8'), 'br_kamejima', 'Kamejima bridges Second Tokyo and Emperor Lelouch');
  assert.equal(C.next('bk10'), null);
});
test('Restored canon battles build and use their intended story roles', () => {
  const mef = C.createMission('br_mef', 3);
  assert(mef.units.filter(u => u.type === 'bamides').length >= 4, 'Area 18 fields the Bamides gun line');
  assert.equal(C.mission('bk5').title, 'Battle of Babel Tower');

  const rescue = C.createMission('bk_rescue', 3),
    gallows = rescue.stations.find(c => c.name === 'Execution Ground');
  gallows.owner = 'bk';
  E.hooks.capture(rescue, gallows, rescue.units.find(u => u.cmd === 'zero'), 'britannia');
  assert(rescue.units.some(u => u.cmd === 'tohdoh'), 'capturing the gallows frees Tohdoh');
  assert(rescue.campaign.fx.some(f => f.name === 'Collapsing execution platform'), 'Zero springs the execution-ground trap');

  const zhengzhou = C.createMission('bk_zhengzhou', 3);
  assert(zhengzhou.units.some(u => u.cmd === 'xingke' && u.type === 'elite_shen_hu'), 'Xingke pursues in the Shen Hu');

  const kamejima = C.createMission('br_kamejima', 3);
  assert(kamejima.units.some(u => u.cmd === 'suzaku' && u.type === 'elite_lancelot_albion'), 'Suzaku joins Lelouch at Kamejima');
  assert(kamejima.stations.some(c => c.name === 'Thought Elevator'));
});

test('Season-split events: Gawain on Kamine, Kallen captured at Xiaopei, the Siegfried at the Geass Order', () => {
  const s = C.createMission('bk_shikine', 5),
    ruins = s.stations.find(c => c.name === 'Kamine Ruins');
  ruins.owner = 'bk';
  E.hooks.capture(s, ruins, s.units.find(u => u.side === 'bk'), 'britannia');
  assert.equal(s.units.find(u => u.cmd === 'zero').type, 'elite_gawain');
  const x = C.createMission('bk_xiaopei', 5);
  x.turn = 4;
  E.beginTurn(x, 'bk', true);
  assert(!x.units.some(u => u.hp > 0 && u.cmd === 'kallen'), 'Kallen is taken off the field');
  assert(!x.campaign.killed.includes('kallen') && x.campaign.losses === 0, 'a capture is not a loss');
  const g = C.createMission('bk_geass', 5);
  g.turn = 3;
  E.beginTurn(g, 'bk', true);
  assert(g.units.some(u => u.type === 'siegfried' && u.side === 'neutral'));
});
test('The Euro Britannia War: Euro Britannia is a campaign-only side; Ryo’s bridge falls; Yukiya’s bomb hits only the knights', () => {
  assert(E.FACTIONS.eb.campaign && !E.MAJORS.includes('eb'));
  assert.equal(E.ROSTER.eb.siege, 'canterbury');
  assert.equal(C.mission('br6').player, 'eb', 'the European Front is fought by Euro Britannia');
  const r = C.createMission('eu_ambush', 2);
  assert.equal(E.tile(r, 7, 5).terrain, 'peak', 'the land bridge collapses on turn 1');
  const w = C.createMission('eu_weisswolf', 2),
    eu = w.units.filter(u => u.side === 'eu').reduce((a, u) => a + u.hp, 0);
  w.turn = 6;
  E.beginTurn(w, 'eu', true);
  assert(w.units.filter(u => u.side === 'eu').reduce((a, u) => a + Math.max(0, u.hp), 0) >= eu, 'the bomb spares the E.U.');
  assert(w.campaign.fx.some(f => f.name === 'Sakuradite bomb'));
  const hard = C.createMission('eb_narva', 2, 'hard');
  assert.equal(hard.difficulty, 'hard');
  assert(Object.keys(hard.tech.eu).length > 0, 'Hard gives the enemy research');
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
  // Kallen's Guren joins the enemy on turn 4; reloading a level-5 HQ Guren afterwards must not touch hers.
  const h = C.createMission('br4', 3);
  h.turn = 4;
  E.beginTurn(h, h.player, true);
  E.applyProfile(h, { elites: { guren_mkii: { level: 5, fragments: 0 } } });
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


test('Normal campaign keeps full enemy strength while using time and force-count advantages', () => {
  const g = C.createMission('bk2', 11, 'normal'),
    enemy = g.units.find(u => E.foe(g, u.side, g.player)),
    hotel = g.stations.find(s => s.name === 'Convention Center Hotel');
  assert.equal(enemy.hp, E.maxHP(enemy), 'Normal enemies start at 100% HP');
  assert.equal(hotel.shield, 240, 'Normal enemy city defenses stay at 100%');
  assert.equal(g.campaign.turnLimit, 14, 'Normal keeps the mission’s original turn limit');
  assert.equal(g.units.filter(u => u.side === 'bk').length, 6, 'BK2 gets one extra player formation on Normal');

  const br2 = C.createMission('br2', 21, 'normal'),
    jeremiah = br2.units.find(u => u.cmd === 'jeremiah'),
    villetta = br2.units.find(u => u.cmd === 'villetta'),
    oneFrame = br2.units.find(u => u.side === 'britannia' && u.type === 'sutherland' && !u.cmd && u.stack === 1);
  assert.equal(jeremiah.stack, 2, 'Normal keeps Jeremiah at the authored two-frame formation');
  assert.equal(villetta.stack, 2, 'Normal keeps Villetta at the authored two-frame formation');
  assert(oneFrame, 'Normal keeps authored one-frame Britannian formations instead of inflating them');

  const hold = C.createMission('br5', 12, 'normal');
  assert.equal(hold.campaign.turnLimit, 0, 'hold missions without a failure timer do not gain a bogus turn limit');

  const invasion = C.createMission('br1', 13, 'normal'),
    tohdoh = invasion.units.find(u => u.cmd === 'tohdoh');
  assert(E.TYPES.jp_tank.hp < E.TYPES.glasgow.hp);
  assert(E.TYPES.jp_tank.attack < E.TYPES.glasgow.attack);
  assert(E.TYPES.jp_tank.armor < E.TYPES.glasgow.armor);
  assert(E.TYPES.jp_tank.move < E.TYPES.glasgow.move);
  assert.equal(tohdoh.stack, 3, 'Tohdoh alone commands a full conventional armored formation');
});

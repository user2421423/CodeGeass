#!/usr/bin/env node
'use strict';
// The AI uses the approved signature actions (formerly player-only) and the reworked targeted actions:
// it picks the target a player would and holds the action when it would be wasted.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

// An empty World Conquest map with a wide patch of open land, the given side to act.
function field(side) {
  const g = E.createGame(side, 'normal', 'conquest', 20261021, 'world');
  g.units = [];
  g.phase = side;
  const open = p => p && !E.isSea(p) && !E.TERRAIN[p.terrain]?.blocked && !E.stationAt(g, p);
  const center = g.tiles.find(p => p.terrain === 'plains' && E.within(g, p, 5).filter(q => E.distance(p, q, g) <= 5).every(open));
  assert.ok(center, 'Need a patch of open land');
  const at = d => g.tiles.filter(q => E.distance(center, q, g) === d && !E.unitAt(g, q));
  return { g, center, at };
}
// With no other troops on the map, the planner posts the test formations as guards of distant cities. Post each
// at its own hex instead (or at `posts[id]`), so it fights here rather than marching across the world map.
function order(g, id, posts = {}) {
  const u = g.units.find(v => v.id === id), memo = E.aiPlan(g, u.side);
  memo.guards = {};
  for (const v of g.units) if (v.side === u.side) memo.guards[v.id] = { ...(posts[v.id] || { c: v.c, r: v.r }), emergency: false };
  return E.aiOrder(g, id);
}
const feints = (events, id) => events.filter(e => e.kind === 'feint' && e.id === id);

{
  // Kirihara's Energy Resupply goes to the most wounded ally in reach.
  // Black Knights commanders lead Federation formations in World Conquest.
  const { g, center, at } = field('cf');
  const kirihara = E.newUnit(g, E.typeFor('cf', 'heavy', g), 'cf', center.c, center.r, 1, 'kirihara');
  const [a, b] = at(2), scout = E.typeFor('cf', 'scout', g);
  const hurt = E.newUnit(g, scout, 'cf', a.c, a.r), scratched = E.newUnit(g, scout, 'cf', b.c, b.r);
  hurt.hp = Math.round(E.maxHP(hurt) * 0.5);
  scratched.hp = E.maxHP(scratched) - 1;
  const before = hurt.hp;
  assert.equal(feints(order(g, kirihara.id), kirihara.id)[0]?.target, hurt.id, 'Kirihara resupplies the wounded ally');
  assert.ok(hurt.hp > before);
}

{
  // Diethard disrupts the enemy commander in reach.
  const { g, center, at } = field('bk');
  const diethard = E.newUnit(g, 'zangetsu', 'bk', center.c, center.r, 1, 'diethard');
  const [a, b] = at(4);
  E.newUnit(g, 'vincent_commander', 'britannia', a.c, a.r);
  const led = E.newUnit(g, 'sutherland', 'britannia', b.c, b.r, 1, 'cornelia');
  order(g, diethard.id);
  assert.ok(led.expInformationWarfare, 'Information Warfare lands on the enemy commander');
}

{
  // Marrybell's Forced Offensive goes to the hard hitter that can still strike, not to herself.
  const { g, center, at } = field('britannia');
  const marrybell = E.newUnit(g, 'glasgow', 'britannia', center.c, center.r, 1, 'marrybell');
  const [a] = at(2);
  const heavy = E.newUnit(g, 'brighton', 'britannia', a.c, a.r);
  const foe = g.tiles.find(q => E.distance(q, heavy, g) === 3 && E.distance(q, center, g) >= 4 && !E.unitAt(g, q));
  E.newUnit(g, 'estrella', 'eu', foe.c, foe.r);
  const events = order(g, marrybell.id);
  assert.equal(feints(events, marrybell.id)[0]?.target, heavy.id, 'Forced Offensive buffs the super-heavy');
  assert.equal(heavy.forcedOffensive, true);
}

{
  // Fernando fires Electrical Overload at the adjacent enemy he chose to attack: no counterfire, pinned if alive.
  const { g, center, at } = field('eu');
  const fernando = E.newUnit(g, 'alexander_mp', 'eu', center.c, center.r, 1, 'fernando');
  const a = at(1)[0], foe = E.newUnit(g, 'vincent_ward', 'britannia', a.c, a.r, 2);
  const hp = fernando.hp;
  const events = order(g, fernando.id);
  assert.equal(feints(events, fernando.id)[0]?.target, foe.id, 'Electrical Overload on the target');
  assert.equal(fernando.hp, hp, 'No counterfire');
  assert.ok(foe.hp <= 0 || foe.expFernandoOverload, 'Survivor is overloaded');
}

{
  // Olivia marks the target she is about to fire on.
  const { g, center, at } = field('eu');
  const olivia = E.newUnit(g, 'panzer_hummel', 'eu', center.c, center.r, 1, 'olivia');
  const a = at(2)[0], foe = E.newUnit(g, 'vincent_ward', 'britannia', a.c, a.r, 2);
  const events = order(g, olivia.id);
  const mark = events.findIndex(e => e.kind === 'feint' && e.id === olivia.id),
    shot = events.findIndex(e => e.kind === 'attack' && e.id === olivia.id);
  assert.ok(mark >= 0 && shot > mark, 'Precision Breakthrough comes just before the attack');
  assert.equal(events[mark].target, foe.id);
}

{
  // Sayoko infiltrates when an enemy is close enough to strike.
  const { g, center, at } = field('bk');
  const sayoko = E.newUnit(g, 'burai', 'bk', center.c, center.r, 1, 'sayoko');
  const a = at(1)[0];
  E.newUnit(g, 'sutherland', 'britannia', a.c, a.r);
  assert.equal(feints(order(g, sayoko.id), sayoko.id).length, 1, 'Shadow Infiltration used');
}

console.log('AI commander signatures smoke: ok');

#!/usr/bin/env node
'use strict';
// Regression: standardize Elite Force class stats and factory tiers, not Lv.3/5 abilities.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const eliteIds = Object.entries(E.ELITE_FORCES);
const groups = new Map();
const stats = t => ({
  hp: t.hp, attack: t.attack, armor: t.armor, move: t.move,
  min: t.min, max: t.max, cost: t.cost, industry: t.industry,
  tier: t.tier, crit: t.crit, pen: t.pen,
  breakthrough: !!t.breakthrough, relentless: !!t.relentless,
  noCounter: !!t.noCounter, splash: t.splash || 0,
  siege: t.siege || 0,
});
for (const [id, elite] of eliteIds) {
  const t = E.TYPES[elite.type];
  assert.ok(t?.elite, 'Missing Elite Force unit type for ' + id);
  const group = t.naval === 'amphibious' ? 'amphibious' : t.cls;
  const peers = groups.get(group) || [];
  peers.push({ id, stats: stats(t) });
  groups.set(group, peers);
}
for (const [group, peers] of groups) {
  const expected = peers[0].stats;
  for (const { id, stats: actual } of peers.slice(1))
    assert.deepEqual(actual, expected, group + ' Elite class stats differ for ' + id);
}
assert.equal(groups.get('heavy').length, 4);
assert.equal(groups.get('rocket').length, 4);
assert.equal(groups.get('super').length, 4);
for (const { id } of groups.get('heavy'))
  assert.equal(E.TYPES[E.ELITE_FORCES[id].type].tier, 3, id + ' must need Factory Tier 3');
for (const { id } of groups.get('rocket'))
  assert.equal(E.TYPES[E.ELITE_FORCES[id].type].tier, 2, id + ' must need Factory Tier 2');
for (const { id } of groups.get('super'))
  assert.equal(E.TYPES[E.ELITE_FORCES[id].type].breakthrough, true, id + ' must have breakthrough');
// Assert representative signatures to ensure the standardized stats did not replace special abilities.
assert.deepEqual(E.ELITE_FORCES.lancelot.lv3, { range: 1, taken: 0.85, pen: 0.10 });
assert.deepEqual(E.ELITE_FORCES.guren_mkii.lv5,
  { vsArmor: 0.50, pen: 0.30, noCounter: true, stun: true });
assert.deepEqual(E.ELITE_FORCES.gawain.lv5,
  { float: true, range: 1, splash: 0.35, aura: { range: 2, value: 0.20 } });
// Approved skill refinements must remain distinct from standard class stats.
assert.equal(E.ELITE_FORCES.cornelia_gloucester.lv5.cityAttack, 0.50);
assert.equal(E.ELITE_FORCES.akatsuki_zikisan.lv3.aura.range, 2);
assert.deepEqual(E.ELITE_FORCES.akatsuki_zikisan.lv5.aura,
  { range: 2, value: 0.15, branches: ['Infantry', 'Armor'] });
assert.equal(E.ELITE_FORCES.vincent_ward.lv5.moveAfterKill, true);
assert.equal(E.ELITE_FORCES.japan_bk_amphibious.lv5.coastalMoveAfterKill, true);
assert.equal(E.ELITE_FORCES.japan_bk_amphibious.lv5.coastalRefresh, undefined);
assert.deepEqual(E.ELITE_FORCES.lancelot_albion.lv5,
  { float: true, move: 2, moveAfterAttack: true, refire: true, splash: 0.20, breakthrough: true });
assert.deepEqual(E.ELITE_FORCES.guren_seiten.lv5,
  { float: true, move: 2, dmg: 0.30, splash: 0.35,
    noCounter: true, refire: true, breakthrough: true });
console.log('Elite class standardization and unique abilities: PASS');

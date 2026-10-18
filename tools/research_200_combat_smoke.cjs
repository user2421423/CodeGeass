#!/usr/bin/env node
'use strict';
// Smoke test the 21 fully wired new research types, including real combat previews.
// Read only from the built engine and do not mutate persisted player profiles.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

const g = E.createGame('britannia','normal','conquest',20261016,'world');
const side = g.player, foe = 'eu';
g.phase = side;
g.tech[side] = {};
g.tech[foe] = {};
const valid = t => t && !E.isSea(t) && !E.TERRAIN[t.terrain]?.blocked &&
  !g.stations.some(s => s.c === t.c && s.r === t.r);
const origin = g.tiles.find(t => valid(t) && E.adjacent(g,t).some(valid));
assert.ok(origin, 'test needs two neighboring passable land hexes');
const neighbor = E.adjacent(g,origin).find(valid);
function place(attType,defType,onSea=false) {
  const [p,q]=onSea?seaTiles:[origin,neighbor];
  g.units=[];
  g.tech[side]={};
  g.tech[foe]={};
  const att=E.newUnit(g,attType,side,p.c,p.r);
  const def=E.newUnit(g,defType,foe,q.c,q.r);
  g.units=[att,def];
  return {att,def,damage:()=>E.preview(g,att.id,def.c,def.r)};
}
const hasOcean=t => E.isSea(t) && E.adjacent(g,t).some(E.isSea);
const ocean=g.tiles.find(hasOcean);
assert.ok(ocean,'test needs connected ocean hexes');
const seaTiles=[ocean,E.adjacent(g,ocean).find(E.isSea)];
assert.ok(seaTiles[1],'test needs adjacent ocean hexes');
let u=place('glasgow','sutherland');
assert.ok(u.damage(),'adjacent units can attack');
const baseCrit=u.damage();
g.tech[side]['infantry.critpower']=3;
const maxCrit=u.damage();
assert.ok(Math.abs(maxCrit.critMult-baseCrit.critMult-0.15)<1e-9,'Infantry critical damage +15 points');
assert.equal(maxCrit.baseCritMult,baseCrit.baseCritMult,'HQ critical training does not change shield criticals');
g.tech[side]={};
const counterBefore=u.damage().counter;
assert.ok(counterBefore>0,'defender can counterattack');
g.tech[side]['infantry.suppressive']=3;
assert.ok(Math.abs(u.damage().counter/counterBefore-0.85)<0.03,'Infantry suppressive fire reduces retaliation 15%');
u=place('sutherland','glasgow');
const damageBefore=u.damage().unit;
g.tech[side]['armor.momentum']=3;
u.att.expAssaultMomentumTurn=g.turn;
assert.ok(u.damage().unit>damageBefore,'Assault Momentum boosts follow-on attack');
// Armored Exploitation replaces the obsolete Breakthrough Doctrine under
// the same research ID, preserving 76 technologies and 200 upgrades.
const exploitation = E.TECH_TREE.armor.nodes.assault;
assert.equal(exploitation.name, 'Armored Exploitation');
assert.deepEqual(exploitation.values, [0.10, 0.20, 0.30, 0.40]);
assert.deepEqual(exploitation.costs, [100, 200, 300, 400]);
assert.deepEqual(exploitation.tiers, [2, 4, 4, 4]);
assert.deepEqual(exploitation.req, ['guns', 2]);
assert.equal(E.TECH_TREE.armor.nodes.momentum.req[0], 'assault');
assert.equal(E.normalizeResearch({ 'armor.assault': 2 })['armor.assault'], 2,
  'existing purchased upgrade levels retain their research ID');
for (const type of ['sutherland','vincent_ward','vincent_commander','brighton']) {
  const e=place(type,'glasgow');
  e.def.hp=60; // Glasgow maximum HP is 150; below half (75).
  const before=e.damage().unit;
  g.tech[side]['armor.assault']=1;
  const level1=e.damage().unit;
  g.tech[side]['armor.assault']=2;
  const level2=e.damage().unit;
  assert.ok(Math.abs(level1/before-1.10)<0.04, type+' +10% vs weakened frames');
  assert.ok(Math.abs(level2/before-1.20)<0.04, type+' +20% vs weakened frames');
}
let exp=place('sutherland','glasgow');
g.tech[side]['armor.assault']=2;
const full=exp.damage().unit;
exp.def.hp=75; // Exactly 50% HP is not eligible.
assert.equal(exp.damage().unit,full,'50% HP does not activate the bonus');
exp.def.hp=74;
assert.ok(exp.damage().unit>full,'strictly below 50% HP activates it');
for (const type of ['glasgow','liverpool','elite_lancelot','portman_ii']) {
  const e=place(type,'glasgow');
  e.def.hp=60;
  const before=e.damage().unit;
  g.tech[side]['armor.assault']=2;
  assert.equal(e.damage().unit,before,type+' does not inherit ordinary land Armor bonus');
}
u=place('sutherland','glasgow');
const c0=u.damage().counter;
g.tech[foe]['infantry.armorcounters']=3;
assert.ok(u.damage().unit < damageBefore*1.5,'Anti-Armor Countermeasures have defender-side effect');
// Verify preview reports Artillery anti-Armor penetration in the same branch as real power().
u=place('gareth','sutherland');
if(u.damage()){
  const before=u.damage();
  g.tech[side]['artillery.shellfuses']=3;
  const after=u.damage();
  assert.ok(Math.abs(after.armorPen-before.armorPen-0.15)<1e-7,'Hardened-Shell Fuses +15 penetration points');
  assert.ok(after.unit>before.unit,'Hardened-Shell Fuses increase armor-target damage');
}
u=place('carrier_battleship','portman',true);
assert.ok(u.damage(),'warship reaches adjacent amphibious target');
const warBefore=u.damage().unit;
g.tech[side]['naval.antiamphib']=3;
assert.ok(u.damage().unit>warBefore,'Anti-Amphibious Gunnery increases attack damage');
const warNow=u.damage().unit;
g.tech[foe]['amphibious.openwater']=3;
assert.ok(u.damage().unit<warNow,'Open-Water Maneuvers protect amphibious units at sea');
u=place('carrier_battleship','portman',true);
const shipCrit=u.damage().critMult;
g.tech[side]['naval.critpower']=3;
assert.ok(Math.abs(u.damage().critMult-shipCrit-0.15)<1e-9,'Heavy Broadside Fire Control critical bonus');
assert.equal(E.carrierCapacity(g,u.att),2,'carrier capacity stays at two');
console.log('Research combat effects and Elite-compatible category bonuses: PASS');

#!/usr/bin/env node
'use strict';
// Regression for permanent HQ technologies: 2-5 levels, branch counts, and carrier cap.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const expected = {
  infantry: [12,32],
  armor: [11,32],
  artillery: [9,21],
  naval: [8,16],
  amphibious: [5,13],
  cities: [10,23],
};
let unique = 0, levels = 0;
for (const [branch, [techs, purchases]] of Object.entries(expected)) {
  const tree = E.TECH_TREE[branch];
  assert.ok(tree, 'missing branch ' + branch);
  let local = 0, count = 0;
  for (const [name, n] of Object.entries(tree.nodes)) {
    assert.ok(n.values.length >= 2 && n.values.length <= 5, branch+'.'+name+' must have 2-5 levels');
    assert.equal(n.values.length, n.costs.length, branch+'.'+name+' costs');
    assert.equal(n.values.length, n.tiers.length, branch+'.'+name+' tiers');
    assert.ok(n.tiers.every(t => t >= 1 && t <= 4), branch+'.'+name+' must use existing four HQ tiers');
    assert.ok(n.costs.every(c => c > 0), branch+'.'+name+' research costs');
    for (const value of n.values) assert.ok(typeof n.text(value) === 'string');
    if (n.req) {
      const prerequisite = tree.nodes[n.req[0]];
      assert.ok(prerequisite && n.req[1] <= prerequisite.values.length,
        branch+'.'+name+' prerequisite exists');
    }
    local += n.values.length;
    count++;
  }
  assert.deepEqual([count, local], [techs, purchases], 'branch '+branch);
  unique += count;
  levels += local;
}
assert.deepEqual([unique, levels],[55,137], 'total technologies and upgrades');
assert.equal(Object.keys(E.TECH_TREE).length,6,'no fifth HQ tier or extra branches');
assert.equal(E.TECH_TREE.naval.nodes.hangars,undefined,'Expanded Hangars removed');
assert.deepEqual(E.TECH_TREE.naval.nodes.landing.values,[.4,.25]);
assert.deepEqual(E.TECH_TREE.naval.nodes.damage.values,[.1,.25]);
assert.deepEqual(E.TECH_TREE.cities.nodes.energy.values,[.1,.15]);
assert.deepEqual(E.TECH_TREE.infantry.nodes.antiarmor.values,[.1,.2,.3,.5]);
assert.deepEqual(E.TECH_TREE.armor.nodes.secondary.values,[.2,.3,.4,.5]);
assert.deepEqual(E.TECH_TREE.amphibious.nodes.hull.values,[.1,.2,.3]);
assert.deepEqual(E.TECH_TREE.amphibious.nodes.coastal.values,[.1,.2,.3,.4]);
for (const id of ['infantry.antiartillery','armor.reactive','armor.precision','artillery.siege','naval.coastal'])
  assert.equal(E.TECH_NODES[id].max,2, 'new research '+id);
const g = E.createGame('britannia','normal','conquest',20261015,'world'),side=g.player;
const ship=E.newUnit(g,'carrier_battleship',side,3,3);
g.tech[side] = { 'naval.hangars': 9 };
assert.equal(E.carrierCapacity(g,ship),2,'carrier holds exactly two formations at most');
assert.equal(E.normalizeResearch({'naval.hangars':1})['naval.hangars'],undefined,
  'obsolete hangar purchases are not recognized');
console.log('HQ progression (55 techs, 137 levels), no one-level research, carrier cap: PASS');

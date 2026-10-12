'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const roster = require('../dist/engine/commanders.js').COMMANDERS;
const missions = require('../dist/missions.js');
const invasion = require('../dist/scenarios.js');
const division = require('../dist/scenarios-division-japan.js');
require('../dist/europe-landmask.js');
const europe = require('../dist/scenarios-europe.js');

test('2017 deploys its own three factions; 2018 deploys all 100 coalition officers', () => {
  const ids = Object.keys(roster).sort();
  assert.equal(ids.length, 100);
  for (const [era, side] of [['world', 'britannia'], ['ufn2018', 'cf']]) {
    const g = E.createGame(side, 'normal', 'conquest', 101, era);
    const units = g.units.filter(u => u.cmd);
    const deployed = units.map(u => u.cmd);
    const expected = era === 'ufn2018' ? ids : ids.filter(id => ['britannia','eu','cf'].includes(roster[id].side));
    assert.deepEqual(deployed.slice().sort(), expected, era + ': only era-eligible officers deploy exactly once');
    for (const u of units) {
      assert.equal(E.serves(u.cmd, u.side, g), true, era + ' allegiance: ' + u.cmd);
      if (era === 'ufn2018')
        assert.equal(E.tile(g, u.c, u.r).owner, u.side, era + ' territory: ' + u.cmd);
    }
    if (era === 'ufn2018') {
      for (const u of units.filter(u => u.side === 'cf'))
        assert.equal(E.COMMANDERS[u.cmd].side !== 'britannia', true, 'U.F.N. cannot command Britannian officers');
      assert.equal(units.filter(u => u.side === 'eb' && ['klaus','oscar'].includes(u.cmd)).length, 0);
    }
  }
});

test('Scenario rosters contain unique eligible named commanders', () => {
  const specs = [
    ['invasion', invasion.create, ['britannia','bk','cf'], {britannia:8,bk:6,cf:8}],
    ['division', division.create, ['britannia','eu','cf'], {britannia:9,eu:9,cf:9}],
    ['europe', europe.create, ['eu','eb'], {eu:14,eb:7}],
  ];
  for (const [name, factory, sides, minimum] of specs) {
    const g = factory(sides[0], 'normal', 101);
    const used = g.units.filter(u => u.cmd);
    assert.equal(new Set(used.map(u => u.cmd)).size, used.length, name + ': duplicate commander');
    for (const u of used) {
      assert.ok(roster[u.cmd], name + ': unregistered commander ' + u.cmd);
      assert.equal(u.side === 'eb' ? roster[u.cmd].side === 'britannia'
        : E.serves(u.cmd, u.side, g), true, name + ': invalid allegiance ' + u.cmd);
    }
    for (const side of sides) {
      assert.ok(used.filter(u => u.side === side).length >= minimum[side],
        name + ': missing named '+side+' commanders');
    }
  }
});

test('Fukuoka campaign uses Sawasaki only where he is physically leading his troops', () => {
  const all = Object.values(missions.CAMPAIGNS).flatMap(c => c.missions);
  for (const id of ['bk_fukuoka','br_fukuoka']) {
    const m = all.find(m => m.id === id);
    assert.ok(m, id);
    assert.equal(m.units.filter(u => u[5] === 'sawasaki').length, 1, id + ': Sawasaki present');
  }
});

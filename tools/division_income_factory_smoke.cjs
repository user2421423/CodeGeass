#!/usr/bin/env node
'use strict';
// Division of Japan local income and repeat factory production regression.
// Run after: node tools/build_sources.cjs
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/scenarios.js');
const division = require('../dist/scenarios-division-japan.js');
const SIDES = ['britannia','eu','cf'];
const TARGETS = {
  britannia:{credits:420,industry:230,science:43,sakuradite:25},
  eu:{credits:365,industry:200,science:40,sakuradite:19},
  cf:{credits:390,industry:210,science:40,sakuradite:20},
};
for (const player of SIDES) {
  for (const difficulty of ['normal','hard','challenge','elite']) {
    const g = division.create(player,difficulty,2741);
    assert.deepEqual(g.scenario.funding,{},'Division has no off-map stipend');
    for (const side of SIDES) {
      const factor = side === player ? 1 : difficulty === 'hard' ? 1.3 :
        ['challenge','elite'].includes(difficulty) ? 1.6 : 1;
      const actual = E.income(g,side);
      for (const [resource,target] of Object.entries(TARGETS[side])) {
        assert.equal(actual[resource],Math.round(target*factor),
          `${difficulty}/${player}: ${side} starting ${resource} income`);
      }
      assert.ok(g.stations.some(s=>s.owner===side && s.divisionIncome),
        `Starting cities must hold ${side}'s formerly off-map income`);
    }
  }
}
// A completed factory build alone cannot close the factory for the turn.
// Occupying its hex still prevents a second build until the unit is moved.
const g=division.create('britannia','normal',2741);
const side='britannia';
const s=g.stations.find(s=>s.owner===side && s.tier>=1 && !E.unitAt(g,s));
assert.ok(s,'The scenario has a free starting Britannian factory');
Object.assign(g.economy[side],{credits:100000,industry:100000,sakuradite:100000});
const type=E.typeFor(side,'scout',g);
s.producedTurn=g.turn; // Legacy once-per-turn flag must not block land factories.
const first=E.recruit(g,s.id,type,1);
assert.equal(first.ok,true,first.reason||'First land unit builds');
const occupied=E.recruit(g,s.id,type,1);
assert.equal(occupied.ok,false,'An occupied city still blocks another build');
const free=g.tiles.find(t=>t.owner===side && !E.isSea(t) &&
  t.terrain!=='offmap' && !E.stationAt(g,t) && !E.unitAt(g,t));
assert.ok(free,'A vacant friendly land tile exists');
first.unit.c=free.c;first.unit.r=free.r; // Represents a skill clearing the city hex.
const second=E.recruit(g,s.id,type,1);
assert.equal(second.ok,true,second.reason||'Vacated land factory builds again');
const port=g.stations.find(s=>s.owner===side && s.portAt && s.portLevel>=1 &&
  !E.unitAt(g,s.portAt));
assert.ok(port,'A free Britannian port exists');
const naval=E.navalTypes(g,side).find(id=>(E.TYPES[id].port||0)<=port.portLevel);
assert.ok(naval,'A buildable naval type exists');
const launched=E.recruit(g,port.id,naval,1);
assert.equal(launched.ok,true,launched.reason||'First naval unit launches');
const sea=g.tiles.find(t=>E.isSea(t) && !E.unitAt(g,t) &&
  !g.stations.some(s=>s.portAt?.c===t.c&&s.portAt?.r===t.r));
assert.ok(sea,'An empty sea tile exists');
launched.unit.c=sea.c;launched.unit.r=sea.r;
assert.equal(E.recruit(g,port.id,naval,1).ok,false,
  'Ports retain their one-launch-per-turn limit even after clearing');
// Legacy saves with old support must migrate without resetting the campaign.
const legacy=division.create('britannia','normal',2741);
for(const s of legacy.stations)delete s.divisionIncome;
legacy.scenario.funding=Object.fromEntries(SIDES.map(side=>[side,
  {credits:20,industry:10,science:2,sakuradite:3}]));
const migrated=E.migrateSave(legacy);
assert.ok(migrated,'Legacy Division save must still load');
assert.deepEqual(migrated.scenario.funding,{},'Legacy stipends are retired');
for(const side of SIDES) {
  const originalCities=migrated.stations.filter(s=>division.regions[side].includes(s.name));
  const sum=resource=>originalCities.reduce((n,s)=>n+(s.divisionIncome?.[resource]||0),0);
  assert.equal(sum('credits'),20);
  assert.equal(sum('industry'),10);
  assert.equal(sum('science'),2);
  assert.equal(sum('sakuradite'),8,'Legacy national Sakuradite is transferred into cities');
}
console.log('Division city income, repeat land factories, and save migration: PASS');

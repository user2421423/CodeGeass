'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/europe-landmask.js');
const invasion = require('../dist/scenarios.js');
const division = require('../dist/scenarios-division-japan.js');
const europe = require('../dist/scenarios-europe.js');

test('2017 FLEIJA unlocks on turn 15 and 2018 U.F.N. on turn 5', () => {
  for (const [era, unlock] of [['world',15], ['ufn2018',5]]) {
    const g = E.createGame('britannia', 'normal', 'conquest', 41, era);
    const s = g.stations.find(city => city.owner === g.player);
    assert.ok(s);
    g.economy[g.player] = { credits: 99999, industry: 99999, science: 99999, sakuradite: 99999 };
    g.phase = g.player;
    s.lab = 2;
    g.turn = unlock - 1;
    assert.equal(E.fleijaLabTurn(g), unlock);
    assert.match(E.buildReason(g,s,'lab'), new RegExp('unlocks on turn '+unlock));
    assert.equal(E.hasFleija(g,g.player),false);
    g.turn = unlock;
    assert.equal(E.buildReason(g,s,'lab'),null,era+' lab III gate');
    s.lab = 3;
    assert.equal(E.hasFleija(g,g.player),true);
    assert.equal(E.projectReason(g,s),null,era+' warhead gate');
    const project = E.startProject(g,s.id);
    assert.equal(project.ok,true);
    assert.equal(project.ready,unlock+E.FLEIJA.turns);
  }
});

for(const [name,scenario] of [
  ['Invasion of Japan',invasion],
  ['Division of Japan',division],
  ['The European War',europe],
]) {
  test('FLEIJA disabled in '+name+' even with imported arsenal/projects',()=>{
    const g = scenario.create(scenario.sides[0],'normal',51);
    const s = g.stations.find(city=>city.owner===g.player);
    assert.ok(s);
    g.turn=40; g.phase=g.player; s.lab=3;
    g.arsenal={ [g.player]:1 };
    g.fleijaDetonated=19;
    s.project={ side:g.player,started:35,ready:37 };
    assert.equal(E.hasFleija(g,g.player),false);
    assert.match(E.projectReason(g,s),/unavailable outside conquests/);
    assert.equal(E.startProject(g,s.id).ok,false);
    assert.equal(E.eliminatorTurn(g),null);
    assert.equal(E.startEliminator(g,s.id).ok,false);
    assert.match(E.launchReason(g,g.player,s),/unavailable in regional scenarios/);
    const before=g.units.length;
    assert.equal(E.launch(g,g.player,s.c,s.r).ok,false);
    assert.equal(g.arsenal[g.player],1);
    assert.equal(g.units.length,before);
  });
}

#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const profile={roster:{cornelia:E.defaultOfficer('cornelia',true)},medals:['valor','laurel'],tokens:600};
profile.roster.cornelia.medals=['campaign'];
E.roster(profile);
assert.equal(profile.honorsVersion,1);
assert.equal(profile.medals.length,0);
assert.equal(profile.roster.cornelia.medals.length,0);
assert.equal(profile.legacyHonors.reduce((s,m)=>s+m.count,0),3);
E.roster(profile);
assert.equal(profile.legacyHonors.reduce((s,m)=>s+m.count,0),3,'migration must be once only');
assert.equal(profile.tokens,600);
const g=E.createGame('britannia','elite','conquest',20261016,'world');
g.mode='conquest';g.difficulty='elite';g.over={winner:g.player,reason:'Conquest'};
g.honorService={
  'hq:cornelia':{commander:'cornelia',personal:true,combats:2,kills:5,commanderDefeats:1,cities:2,capitals:1},
  'script:suzaku':{commander:'suzaku',personal:false,combats:2,kills:2,commanderDefeats:0,cities:0,capitals:0}
};
E.finalizeHonors(g);
assert.ok(g.honorEvents.some(e=>e.id==='laurel_elite'&&e.commander==='cornelia'&&e.personal));
assert.ok(g.honorEvents.some(e=>e.id==='campaign'&&e.commander==='suzaku'&&!e.personal));
const first=E.claimHonors(profile,g,'honor-smoke:1');
assert.ok(first.awarded.length);
const before=profile.roster.cornelia.honors.reduce((s,h)=>s+h.citations.length,0);
assert.equal(E.claimHonors(profile,g,'honor-smoke:1').awarded.length,0,'same operation cannot pay twice');
assert.equal(profile.roster.cornelia.honors.reduce((s,h)=>s+h.citations.length,0),before);
assert.ok(!profile.roster.suzaku,'scripted Suzaku cannot receive persistent medal');
assert.equal(E.equipMedal(profile,'cornelia','valor').ok,false);
assert.equal(E.unequipMedal(profile,'cornelia','valor').ok,false);
const hard=E.createGame('britannia','hard','conquest',20261017,'world');
hard.over={winner:hard.player};hard.honorService={'hq:cornelia':{commander:'cornelia',personal:true,combats:1,kills:1,commanderDefeats:0,cities:0,capitals:0}};
E.finalizeHonors(hard);
assert.ok(hard.honorEvents.some(e=>e.id==='laurel_hard'));
const challenge=E.createGame('britannia','challenge','conquest',20261018,'world');
challenge.over={winner:challenge.player};challenge.honorService=hard.honorService;
E.finalizeHonors(challenge);
assert.ok(challenge.honorEvents.some(e=>e.id==='laurel_challenge'));
console.log('Military honors persistence, migration, tiers, scripted attribution: PASS');

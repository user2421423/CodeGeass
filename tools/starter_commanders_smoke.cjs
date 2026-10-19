#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const E = require('../dist/engine.js');

const starters = { britannia: 'cornelia', bk: 'zero', eu: 'akito', cf: 'xingke' };
const roster = E.roster({ roster: {} });
assert.deepEqual(Object.keys(roster).sort(), Object.values(starters).sort());
for (const [side,id] of Object.entries(starters)) {
  assert.equal(roster[id].rank,0,id+' starter rank');
  assert.equal(roster[id].commission,'legendary',id+' starting commission');
  assert.equal(E.serves(id,side),true,id+' faction');
}
const src = fs.readFileSync(path.join(__dirname,'../dist/ui/core.js'),'utf8');
const begin=src.indexOf('function loadProfile() {');
const end=src.indexOf('\nfunction saveProfile(',begin);
assert.ok(begin>=0 && end>begin);
const key='profile-smoke';
const data=new Map();
const context={ E, PROFILE_KEY:key,
  syncResearchCampaignCompletions:()=>false,
  localStorage:{
    getItem:k=>data.get(k)||null,
    setItem:(k,v)=>data.set(k,v)
  }
};
vm.createContext(context);
vm.runInContext(src.slice(begin,end),context);
const load=()=>vm.runInContext('loadProfile()',context);
let fresh=load();
assert.equal(fresh.startingSetupVersion,3);
assert.equal(Object.keys(fresh.roster).length,4);
assert.equal(fresh.elites?.leila_alexander,undefined,'no free Elite fragments for new profiles');
const upgraded=E.defaultOfficer('xingke',true);
upgraded.rank=5; upgraded.ratings.armor=4;
const old={ startingSetupVersion:2, commanderProgressionVersion:1, honorsVersion:1,
  researchVersion:E.RESEARCH_VERSION, armorFloatRefundVersion:1,
  tokens:720, roster:{cornelia:E.defaultOfficer('cornelia',true),
    zero:E.defaultOfficer('zero',true),xingke:upgraded,
    leila:E.defaultOfficer('leila',true)} };
data.set(key,JSON.stringify(old));
const migrated=load();
assert.equal(migrated.startingSetupVersion,3);
assert.equal(migrated.tokens,720);
assert.ok(migrated.roster.akito);
assert.equal(JSON.stringify(migrated.roster.xingke),JSON.stringify(upgraded),'preserve existing upgrades');
assert.ok(migrated.roster.leila,'existing additional commander retained');
const serialized=data.get(key);
load();
assert.equal(data.get(key),serialized,'migration only once');
data.set(key,JSON.stringify({tokens:50}));
const legacy=load();
assert.equal(legacy.legacyStarterEntitlements,true);
assert.equal(legacy.startingSetupVersion,3);
assert.ok(legacy.roster.akito && legacy.roster.xingke);
console.log('Four starting HQ commanders and legacy migration: PASS');

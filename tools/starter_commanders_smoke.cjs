#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const E = require('../dist/engine.js');

const starters = { britannia: 'suzaku', bk: 'zero', eu: 'akito', cf: 'xingke' };
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
assert.equal(fresh.startingSetupVersion,4);
assert.equal(Object.keys(fresh.roster).length,4);
assert.equal(fresh.roster.cornelia,undefined,'Cornelia is not a free starter');
assert.equal(fresh.elites?.leila_alexander,undefined,'no free Elite fragments for new profiles');
const upgraded=E.defaultOfficer('xingke',true);
upgraded.rank=5; upgraded.ratings.armor=4;
const suzaku=E.defaultOfficer('suzaku',true);
suzaku.rank=5; suzaku.ratings.armor=4;
const investedCornelia=E.defaultOfficer('cornelia',true);
investedCornelia.rank=9; investedCornelia.ratings.mobility=6;
delete investedCornelia.commanderVersion; // Would trigger an old star refund if cleaned.
const old={ startingSetupVersion:2, commanderProgressionVersion:1, honorsVersion:1,
  researchVersion:E.RESEARCH_VERSION, armorFloatRefundVersion:1,
  tokens:720, roster:{cornelia:investedCornelia,suzaku,
    zero:E.defaultOfficer('zero',true),xingke:upgraded,
    leila:E.defaultOfficer('leila',true)} };
data.set(key,JSON.stringify(old));
const migrated=load();
assert.equal(migrated.startingSetupVersion,4);
assert.equal(migrated.tokens,720,'Cornelia investment is discarded without refund');
assert.equal(migrated.roster.cornelia,undefined,'remove old Cornelia');
assert.equal(JSON.stringify(migrated.roster.suzaku),JSON.stringify(suzaku),'preserve invested Suzaku');
assert.ok(migrated.roster.akito);
assert.equal(JSON.stringify(migrated.roster.xingke),JSON.stringify(upgraded),'preserve existing upgrades');
assert.ok(migrated.roster.leila,'existing additional commander retained');
const serialized=data.get(key);
load();
assert.equal(data.get(key),serialized,'migration only once');
data.set(key,JSON.stringify({tokens:50}));
const legacy=load();
assert.equal(legacy.legacyStarterEntitlements,true);
assert.equal(legacy.startingSetupVersion,4);
assert.ok(legacy.roster.akito && legacy.roster.xingke && legacy.roster.suzaku);
assert.equal(legacy.roster.cornelia,undefined);
const future=load();
future.roster.cornelia=E.defaultOfficer('cornelia',true);
data.set(key,JSON.stringify(future));
assert.ok(load().roster.cornelia,'later purchased Cornelia survives versioned migration');

// Existing battle saves also migrate commander assignments, without touching
// scripted (non-personal) Cornelia or duplicating Suzaku on the field.
const oldBattle=E.createGame('britannia','normal','conquest',12345,'world');
oldBattle.roster={cornelia:investedCornelia,suzaku};
const unit=oldBattle.units.find(u=>u.side==='britannia' && !u.cmd && u.hp>0);
assert.ok(unit,'available Britannian unit');
unit.cmd='cornelia'; unit.personal=true; unit.cmdRank=9;
const scripted=oldBattle.units.find(u=>u.cmd==='cornelia' && !u.personal);
const migratedBattle=E.migrateSave(oldBattle);
assert.ok(migratedBattle);
assert.equal(migratedBattle.roster.cornelia,undefined);
assert.equal(migratedBattle.roster.suzaku.rank,5);
assert.equal(unit.cmd,'suzaku','migrate active personal Cornelia to Suzaku');
if (scripted) assert.equal(scripted.cmd,'cornelia','scripted Cornelia is unchanged');
assert.equal(migratedBattle.britanniaStarterMigrationVersion,1);
assert.equal(E.migrateSave(migratedBattle).units.find(u=>u.id===unit.id).cmd,'suzaku','idempotent battle migration');
const duplicateBattle=E.createGame('britannia','normal','conquest',23456,'world');
duplicateBattle.roster={cornelia:investedCornelia,suzaku};
const openUnits=duplicateBattle.units.filter(u=>u.side==='britannia' && !u.cmd && u.hp>0);
assert.ok(openUnits.length>=2,'two available Britannian units');
openUnits[0].cmd='cornelia';openUnits[0].personal=true;
openUnits[1].cmd='suzaku';openUnits[1].personal=true;
E.migrateSave(duplicateBattle);
assert.equal(openUnits[0].cmd,null,'unassign Cornelia if Suzaku is already deployed');
assert.equal(openUnits[0].personal,false);
assert.equal(openUnits[1].cmd,'suzaku','keep deployed Suzaku');
console.log('Suzaku starter, HQ profile and saved-battle migrations: PASS');

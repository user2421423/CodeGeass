#!/usr/bin/env node
'use strict';
// Era separation regression: every 2017 Chinese formation uses its native
// Gun-Ru / Chuyen / Shen Hu roster; the 2018 UFN uses Black Knights equipment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');

const NATIVE = E.LINEUPS.cf2017;
const UFN = E.LINEUPS.bk;
const CLASSES = E.CLASS_ORDER;
const NATIVE_ELITES = new Set(['chuyen','wang_hu','shen_hu','akatsuki_zikisan','akatsuki_missile','akatsuki_heavy','shui_gun_ru_ii']);
const images = JSON.parse(fs.readFileSync(path.join(__dirname, '../dist/assets/art/manifest.json'), 'utf8')).units;
const artAlias = {
  bk_carrier: 'cf_carrier',
  bk_amphibious: 'burai',
  bk_amphibious_ii: 'gekka'
};
function checkArt(id) {
  assert.ok(images[id] || images[artAlias[id]], 'Missing sprite for ' + id);
}
function checkGame(g, label) {
  const lineup = g.era === 'ufn2018' && g.mode === 'conquest' ? UFN : NATIVE;
  const navy = g.era === 'ufn2018' && g.mode === 'conquest' ? E.NAVAL.bk : E.NAVAL.cf;
  assert.deepEqual(E.lineupOf(g,'cf'),lineup,label + ': complete land roster');
  for (const cls of CLASSES)
    assert.equal(E.typeFor('cf',cls,g),lineup[cls],label + ': '+cls);
  const allowed = new Set([...Object.values(lineup),...Object.values(navy),E.airshipType(g,'cf')]);
  for(const u of g.units.filter(u=>u.side==='cf')){
    if(u.elite) {
      assert.ok(E.eliteEligible(g,'cf',u.elite),label+': illegal Elite '+u.type);
    } else {
      assert.ok(allowed.has(u.type),label+': wrong-era Chinese starting unit '+u.type);
    }
  }
  for (const id of allowed) checkArt(id);
  if(g.era==='ufn2018' && g.mode==='conquest'){
    assert.equal(E.eliteEligible(g,'cf','shen_hu'),false,'UFN cannot deploy Shen Hu Elite');
    assert.equal(E.eliteEligible(g,'cf','guren_mkii'),true,'UFN can deploy Black Knights Guren');
  }else{
    assert.equal(E.eliteEligible(g,'cf','guren_mkii'),false,'2017 Chinese cannot deploy Black Knights Guren');
    for (const id of NATIVE_ELITES)
      assert.equal(E.eliteEligible(g,'cf',id),true,'2017 Chinese Elite: '+id);
  }
}
assert.equal(NATIVE.raider,'gun_ru_light','2017 raider is Gun-Ru Mobile');
assert.equal(NATIVE.light,'chuyen','2017 light armor is Chuyen');
assert.equal(NATIVE.super,'shen_hu','2017 super-heavy is Shen Hu');
for(const cls of CLASSES){
  assert.equal(E.TYPES[NATIVE[cls]].cls,cls,'2017 class mismatch: '+cls);
  assert.equal(E.TYPES[UFN[cls]].cls,cls,'UFN class mismatch: '+cls);
}
for (const era of ['world','ufn2018']){
  for (const difficulty of ['normal','hard','challenge','elite']){
    const g=E.createGame('britannia',difficulty,'conquest',417,era);
    checkGame(g,era+' '+difficulty);
    if(difficulty==='normal'){
      const injected = E.newUnit(g,era==='world'?'akatsuki':'gun_ru','cf',0,0);
      assert.equal(injected.type,era==='world'?'chuyen_medium':'burai',era+' scripted ordinary unit');
      g.units.pop();
      const importedMarine=E.newUnit(g,era==='world'?'bk_amphibious_ii':'shui_gun_ru_ii','cf',0,0);
      assert.equal(importedMarine.type,era==='world'?'shui_gun_ru_ii':'bk_amphibious_ii',era+' scripted navy');
      g.units.pop();
    }
  }
}
const luoyang = require('../dist/scenarios-luoyang.js');
for(const difficulty of ['normal','hard','challenge','elite']){
  const g=luoyang.create('britannia',difficulty,201701);
  checkGame(g,'Luoyang '+difficulty);
}
// Existing operation saves can still carry the old, incomplete roster snapshot.
const saved = E.createGame('cf','normal','conquest',417,'world');
saved.mode = 'campaign';
saved.campaign = { eliteRosters: { cf: ['chuyen','wang_hu','shen_hu','shui_gun_ru_ii'] } };
for (const id of NATIVE_ELITES)
  assert.equal(E.eliteEligible(saved,'cf',id),true,'Old save retains native Federation elite '+id);
const factory = saved.stations.find(s=>s.owner==='cf');
factory.tier = 3;
saved.phase = 'cf';
saved.units = saved.units.filter(u=>u.c!==factory.c || u.r!==factory.r);
Object.assign(saved.economy.cf,{credits:100000,industry:100000,science:100000,sakuradite:100000});
const profile = {elites:{akatsuki_missile:{level:3,fragments:0}}};
assert.equal(E.eliteDeployReason(saved,factory,'akatsuki_missile',profile),null,
  'Previously hidden, HQ-unlocked missile elite can deploy from an old save');
const deployed = E.deployElite(saved,factory.id,'akatsuki_missile',profile);
assert.equal(deployed.ok,true,deployed.reason);
assert.equal(deployed.unit.eliteLevel,3,'Factory retains HQ upgrade level');
assert.match(E.eliteDeployReason(saved,factory,'akatsuki_missile',profile),/Already deployed/,
  'Once-per-operation limit remains in force');
console.log('Federation 2017 / UFN 2018 rosters, Elite eligibility, Luoyang and art: PASS');

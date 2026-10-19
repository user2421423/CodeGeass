#!/usr/bin/env node
'use strict';
// All Story difficulties allow HQ elite deployment. Scripted rosters must
// distinguish the 2017 Chinese Federation from Black Knights / UFN equipment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../dist/engine.js');
require('../dist/missions.js');
require('../dist/campaign.js');

const CP = E.campaign;
const difficulties = ['normal', 'hard', 'challenge', 'elite'];
const chinese = new Set(Object.values(E.LINEUPS.cf2017));
const blackKnights = new Set(Object.values(E.LINEUPS.bk));
let tested = 0;

for (const campaign of Object.values(CP.CAMPAIGNS)) {
  for (const mission of campaign.missions) {
    for (const difficulty of difficulties) {
      const g = CP.createMission(mission.id, 20261019, difficulty);
      assert.equal(g.mode, 'campaign');
      assert.deepEqual(E.lineupOf(g, 'cf'), E.LINEUPS.cf2017);
      assert.deepEqual(E.lineupOf(g, 'bk'), E.LINEUPS.bk);
      assert.ok(g.campaign.eliteRosters, mission.id + ': elite rosters in every difficulty');
      assert.equal(E.eliteEligible(g, 'bk', 'shen_hu'), false, 'Black Knights cannot deploy native Federation elites');
      assert.equal(E.eliteEligible(g, 'bk', 'guren_mkii'), true, 'Black Knights have Guren');
      assert.equal(E.eliteEligible(g, 'cf', 'shen_hu'), true, '2017 Chinese retain Shen Hu');
      assert.equal(E.eliteEligible(g, 'cf', 'akatsuki_missile'), false, '2017 Chinese cannot deploy UFN-era Akatsuki missile');
      for (const u of g.units) {
        if (u.side === 'bk' && !u.elite)
          assert.ok(!chinese.has(u.type) || blackKnights.has(u.type),
            mission.id + ': native Chinese frame assigned to Black Knights: ' + u.type);
        if (u.side === 'cf') {
          if (u.elite) assert.ok(E.eliteEligible(g, 'cf', u.elite),
            mission.id + ': CF received foreign Elite Force ' + u.elite);
          else assert.ok(chinese.has(u.type),
            mission.id + ': CF received foreign ordinary equipment ' + u.type);
        }
        if (u.side === 'britannia' || u.side === 'eu' || u.side === 'eb' || u.side === 'jlf')
          assert.ok(!chinese.has(u.type),
            mission.id + ': Chinese 2017 frame leaked into ' + u.side);
      }
      if (g.campaign.id === 'bk6' && g.order.includes('neutral') && difficulty === 'elite') {
        const eunuchs = g.units.filter(u => u.side === 'neutral');
        assert.ok(eunuchs.length > 0 && eunuchs.every(u => u.elite && g.campaign.eliteRosters.neutral.includes(u.elite)),
          'Luoyang Eunuchs should use Chinese, not Britannian, elites');
      }
      tested++;
    }
  }
}

const b2 = CP.createMission('bk2', 20261019, 'normal');
const factory = b2.stations.find(s => s.owner === 'bk');
assert.ok(factory, 'mission has a Black Knights factory');
factory.tier = 3;
b2.units = b2.units.filter(u => u.c !== factory.c || u.r !== factory.r);
Object.assign(b2.economy.bk, { credits: 100000, industry: 100000, sakuradite: 100000, science: 100000 });
const profile = { elites: { guren_mkii: { level: 3, fragments: 0 } } };
const reason = E.eliteDeployReason(b2, factory, 'guren_mkii', profile);
assert.equal(reason, null, 'HQ-unlocked Guren deploys on Normal Story: ' + reason);
const deployed = E.deployElite(b2, factory.id, 'guren_mkii', profile);
assert.equal(deployed.ok, true, deployed.reason);
assert.equal(deployed.unit.eliteLevel, 3, 'recruit keeps upgraded HQ level');
assert.equal(deployed.unit.storyHQDeployed, true, 'player HQ deployment is marked for saves');
assert.equal(deployed.unit.stack, 1);
assert.match(E.eliteDeployReason(b2, factory, 'guren_mkii', profile), /Already deployed/,
  'once-per-operation cap is unchanged');
CP.normalizeUnits(b2);
assert.equal(deployed.unit.type, 'elite_guren_mkii', 'reloaded Normal Story preserves player elite');
assert.equal(deployed.unit.eliteLevel, 3, 'reloaded Normal Story preserves HQ level');

// HQ eligibility must also apply to the other normal/Hard/Challenge story campaigns.
for (const difficulty of ['normal', 'hard', 'challenge']) {
  const eb = CP.createMission('eb_weisswolf', 20261019, difficulty);
  assert.ok(E.eliteEligible(eb, 'eb', 'lancelot'),
    'Euro Britannia borrows Britannia Elite roster outside Elite difficulty');
  const bk = CP.createMission('bk2', 20261019, difficulty);
  assert.ok(E.eliteEligible(bk, 'bk', 'guren_mkii'));
}

const ui = fs.readFileSync(require.resolve('../dist/ui/dialogs.js'), 'utf8');
assert.match(ui, /: port \? \[NAVAL_TAB, ELITE_NAVAL_TAB\]/,
  'Story port tabs include Elite Amphibious');
assert.match(ui, /\[\.\.\.BRANCH_LIST, ELITE_FACTORY_TAB\]/,
  'Story factory tabs include Elite Forces');

console.log('Story elite deployment and faction roster regression: PASS (' + tested + ' missions x difficulties)');

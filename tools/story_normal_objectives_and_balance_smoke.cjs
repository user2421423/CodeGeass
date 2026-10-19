#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
require('../dist/campaign.js');
const missions = Object.values(globalThis.KnightmareMissions.CAMPAIGNS).flatMap(c => c.missions);
assert.ok(missions.length >= 58, 'all legacy and newly registered missions included');
assert.equal(new Set(missions.map(m => m.id)).size, missions.length, 'unique registered missions');
for (const mission of missions) {
  for (const mode of ['normal', 'hard', 'challenge']) {
    const deployed = new Set();
    for (const [side, type, c, r, stack, cmd, options = {}] of mission.units) {
      if ((options.normalOnly && mode !== 'normal') || (options.skipNormal && mode === 'normal')) continue;
      const terrain = mission.map[r]?.[c];
      const ship = E.TYPES[type]?.naval === 'ship';
      assert.ok(terrain && terrain !== 'x' && (ship ? terrain === '.' : terrain !== '.'), mission.id + ' ' + mode + ': invalid deployment ' + type + '@' + c + ',' + r);
      const pos = c + ',' + r;
      assert.ok(!deployed.has(pos), mission.id + ' ' + mode + ': overlap at ' + pos);
      deployed.add(pos);
    }
    const g = E.campaign.createMission(mission.id, 1357, mode);
    assert.ok(g.units.length > 0, mission.id + ' ' + mode + ': no units');
  }
}
const coalition = E.campaign.createMission('bk8', 1357, 'normal');
coalition.stations.find(s => s.name === 'Kagoshima Settlement').owner = 'cf';
assert.equal(E.hooks.decide(coalition)?.winner, 'bk', 'Allied UFN capture must win');
const hostile = E.campaign.createMission('bk8', 1357, 'normal');
hostile.stations.find(s => s.name === 'Kagoshima Settlement').owner = 'britannia';
assert.equal(E.hooks.decide(hostile), null, 'Enemy ownership cannot win');
for (const [id, min] of Object.entries({
  bk1: 11, br5: 16, br_tohdoh: 14, bk_yokosuka: 11, bk_shikine: 11,
  bk_pacific: 11, bk_xiaopei: 11, bk9: 12,
  eb_weisswolf: 13, eb_fall: 10, eu_ark: 9
})) {
  const g = E.campaign.createMission(id, 1357, 'normal');
  assert.ok(g.units.filter(u => u.hp > 0 && u.side === g.player).length >= min, id + ' missing reinforcements');
}
// Mission-specific shields and deadlines must not alter harder difficulties.
for (const [id,name,shield] of [
  ['br7','Sakuradite Refinery',1100],
  ['br_mausoleum','Vermillion Forbidden City',1400],
  ['br_kagoshima','Kagoshima Settlement',1300],
  ['br10','Ikaruga',220],
  ['br10','Avalon Landing',750],
]) {
  const normal=E.campaign.createMission(id,1357,'normal'),
        hard=E.campaign.createMission(id,1357,'hard');
  assert.equal(normal.stations.find(s=>s.name===name).maxShield,shield,id+': Normal shield');
  assert.notEqual(hard.stations.find(s=>s.name===name).maxShield,shield,id+': Hard shield unchanged');
}
assert.equal(E.campaign.createMission('br10',1357,'normal').campaign.turnLimit,24);
assert.equal(E.campaign.createMission('br10',1357,'hard').campaign.turnLimit,
  E.campaign.mission('br10').lose.turns + (E.campaign.DIFFICULTIES?.hard?.extraTurns || 0),
  'Hard mission deadline must remain unchanged');
console.log('Story normal objectives, deployments and reinforcements: PASS');

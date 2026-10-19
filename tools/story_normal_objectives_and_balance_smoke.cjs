#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
require('../dist/campaign.js');
const missions = Object.values(globalThis.KnightmareMissions.CAMPAIGNS).flatMap(c => c.missions);
assert.equal(missions.length, 58);
for (const mission of missions) {
  for (const mode of ['normal', 'hard', 'challenge']) {
    const deployed = new Set();
    for (const [side, type, c, r, stack, cmd, options = {}] of mission.units) {
      if ((options.normalOnly && mode !== 'normal') || (options.skipNormal && mode === 'normal')) continue;
      assert.ok(mission.map[r]?.[c] && !['.', 'x'].includes(mission.map[r][c]), mission.id + ' ' + mode + ': invalid deployment ' + type + '@' + c + ',' + r);
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
  bk1: 7, br5: 13, bk_yokosuka: 11, bk_shikine: 11,
  bk_pacific: 11, bk_xiaopei: 11, bk9: 12,
  eb_weisswolf: 13, eb_fall: 10, eu_ark: 9
})) {
  const g = E.campaign.createMission(id, 1357, 'normal');
  assert.ok(g.units.filter(u => u.hp > 0 && u.side === g.player).length >= min, id + ' missing reinforcements');
}
console.log('Story normal objectives, deployments and reinforcements: PASS');

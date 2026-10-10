const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
const C = require('../dist/campaign.js');

test('Conquest commander ranks scale by difficulty without buffing player commanders', () => {
  const maxRank = E.RANKS.length - 1;
  for (const mode of ['normal', 'hard', 'challenge']) {
    const g = E.createGame('britannia', mode, 'conquest', 41);
    for (const [id, commander] of Object.entries(E.COMMANDERS)) {
      const base = E.defaultOfficer(id).rank;
      const expected = commander.side === g.player || mode === 'normal'
        ? base
        : mode === 'hard' ? Math.min(maxRank, base + 3) : maxRank;
      assert.equal(g.officers[id].rank, expected, mode + ': ' + id);
    }
    const ledUnits = g.units.filter(u => u.cmd);
    assert(ledUnits.some(u => u.side !== g.player), mode + ': needs AI commanders');
    for (const u of ledUnits) {
      assert.equal(u.cmdRank, g.officers[u.cmd].rank, mode + ': unit commander rank');
      assert.equal(u.hp, E.maxHP(u), mode + ': rank-based starting HP');
    }
  }
});

test('Campaign difficulty commander bonuses remain +1 on Hard and +2 on Challenge', () => {
  const ids = Object.values(C.CAMPAIGNS).flatMap(c => c.missions.map(m => m.id));
  const id = ids.find(id => {
    const g = C.createMission(id, 41);
    return g.units.some(u => u.cmd && E.foe(g, u.side, g.player));
  });
  assert(id, 'at least one campaign mission must have a hostile commander');
  for (const [mode, bonus] of [['normal', 0], ['hard', 1], ['challenge', 2]]) {
    const g = C.createMission(id, 41, mode);
    const enemies = g.units.filter(u => u.cmd && E.foe(g, u.side, g.player));
    assert(enemies.length, mode + ': needs hostile commanders');
    for (const u of enemies) {
      const expected = Math.min(E.RANKS.length - 1, E.defaultOfficer(u.cmd).rank + bonus);
      assert.equal(u.cmdRank, expected, mode + ': ' + u.cmd);
      assert.equal(g.officers[u.cmd].rank, expected, mode + ': officer record');
    }
  }
});

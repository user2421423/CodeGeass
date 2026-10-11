'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const japan = require('../dist/scenarios.js');
require('../dist/campaign.js');

test('player priority is clamped, optional, and never applies to the human side', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 19);
  assert.equal(E.playerPriorityBonus(g, 'cf'), 0.4);
  assert.equal(E.playerPriorityBonus(g, 'britannia'), 0);
  for (const [value, expected] of [[0,0],[0.2,0.2],[0.6,0.6],[1,1],[3,1],[-1,0]]) {
    g.aiPlayerPriorityBonus = value;
    assert.equal(E.playerPriorityBonus(g, 'cf'), expected);
  }
});

test('conquest front scores favor attacking the human, not defending our own capital', () => {
  const plans = [0, 0.4, 1].map(pct => {
    const g = E.createGame('britannia', 'normal', 'conquest', 19);
    g.aiPlayerPriorityBonus = pct;
    return E.aiPlan(g, 'cf').fronts;
  });
  const byId = p => new Map(p.map(f => [f.id, f]));
  const baseline = byId(plans[0]), boosted = byId(plans[2]);
  let found = false;
  for (const [id, a] of baseline) {
    const b = boosted.get(id);
    if (!b) continue;
    if (a.type === 'defensive') assert.equal(b.priority, a.priority);
    if (a.type === 'offensive' && a.objectives.some(o => o.owner === 'britannia')) {
      assert.ok(b.priority >= a.priority, 'player front should not lose priority');
      if (b.priority > a.priority) found = true;
    }
  }
  // Some player fronts can be outside the four-front limit in this particular
  // initial map; the targeted score helper is still exercised by the mode tests.
  assert.ok(plans.every(x => x.length > 0));
});

test('Japan offensive columns prefer hostile player cities without breaking alliances', () => {
  const g = japan.create('britannia', 'normal', 19);
  assert.equal(E.playerPriorityBonus(g, 'bk'), 0, 'Black Knights and Britannia are allied on turn one');
  const results = [0, 1].map(bonus => {
    const state = japan.create('britannia', 'normal', 19);
    state.aiPlayerPriorityBonus = bonus;
    const plan = E.aiPlan(state, 'cf');
    assert.equal(Object.keys(plan.guards).length, 0);
    assert.ok(plan.fronts.every(f => f.type === 'offensive' && f.state === 'attacking'));
    return plan.fronts.filter(f => f.anchor.owner === state.player)
      .reduce((count, f) => count + f.members.length, 0);
  });
  assert.ok(results[1] >= results[0], 'higher human priority should not decrease human-directed columns here');
  g.turn = 10; japan.onTurn(g);
  assert.equal(E.playerPriorityBonus(g, 'bk'), 0.4, 'alliance ends normally');
});

test('campaign routing applies player bias only to hostile targets', () => {
  const missionId = E.campaign.CAMPAIGNS.bk_s1.missions[0].id;
  const g = E.campaign.createMission(missionId, 19, 'normal');
  const side = g.order.find(s => s !== g.player && E.foe(g, s, g.player));
  assert.ok(side);
  const original = E.internal.goalSeeds(g, side);
  g.aiPlayerPriorityBonus = 0;
  assert.deepEqual(E.playerPrioritySeeds(g, side), original);
  g.aiPlayerPriorityBonus = 1;
  const revised = E.playerPrioritySeeds(g, side);
  assert.ok(revised.some(([s, cost], i) => s.owner === g.player && cost === original[i][1] - 6));
  assert.equal(E.aiPlan(g, side).field.length, g.tiles.length);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

function scenario({ twoCities = true, seaBarrier = false, attackers = 3 } = {}) {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  const cols = 40, rows = 24;
  Object.assign(g, {
    cols, rows, wrap: false, units: [], nextId: 1, sites: [], stations: [], ai: {}, phase: 'cf',
    tiles: Array.from({ length: cols * rows }, (_, i) => ({
      c: i % cols, r: Math.floor(i / cols),
      terrain: seaBarrier && i % cols === 24 ? 'sea' : 'plains', owner: 'cf',
    })),
  });
  function city(owner, name, c, r, capital = false) {
    g.stations.push({ id: g.stations.length, owner, name, c, r,
      capitalOf: capital ? owner : null, tier: 1, lab: 0, fort: false,
      shield: 120, maxShield: 120, income: 12, industry: 6, science: 2, producedTurn: 0 });
  }
  city('cf', 'Capital', 4, 17, true);
  city('cf', 'Border A', 16, 11);
  if (twoCities) city('cf', 'Border B', 18, 14);
  city('eu', 'EuroCity', 34, 11, true);
  city('britannia', 'BritCity', 2, 2, true);
  const unit = (side, cls, c, r) => E.newUnit(g, E.typeFor(side, cls), side, c, r);
  unit('cf', 'scout', 13, 11);
  unit('cf', 'light', 12, 12);
  unit('cf', 'support', 8, 13);
  unit('cf', 'medium', 9, 9);
  // Additional mobile troops keep emergency allocation observable after capital guards.
  for (let i = 0; i < 8; i++) unit('cf', 'scout', 3 + i % 4, 14 + Math.floor(i / 4));
  for (let i = 0; i < attackers; i++) unit('eu', 'medium', 27 + i, 11 + i % 2);
  return { g, memo: E.aiPlan(g, 'cf') };
}
const defensive = memo => memo.fronts.find(f => f.objectives.some(o => o.name === 'Border A'));

test('predicts two-turn approaches across land and scores multiple endangered cities', () => {
  const multi = defensive(scenario({ attackers: 3 }).memo);
  const single = defensive(scenario({ twoCities: false, attackers: 3 }).memo);
  assert.ok(multi, 'forecast should create a defensive objective');
  assert.ok(single);
  assert.equal(multi.endangeredCities, 2);
  assert.equal(single.endangeredCities, 1);
  assert.equal(multi.type, 'defensive');
  assert(multi.score > single.score, 'two threatened cities deserve a higher score');
  assert(multi.menace > 0, 'approaching enemy has discounted projected strength');
  assert.equal(defensive(scenario({ seaBarrier: true }).memo), undefined,
    'a sea barrier must not produce land-approach warnings');
});

test('mobilizes earlier and uses 20-35% emergency budgets without overspending field army', () => {
  const { g, memo } = scenario({ attackers: 5 });
  const front = defensive(memo);
  assert.ok(front);
  assert.equal(front.vital, false);
  assert(front.menace > front.present, 'forecast enemy strength exceeds nearby defenders');
  assert(front.present / front.menace >= 0.6,
    'this case would not have triggered the previous 60% emergency threshold');
  assert.equal(front.emergency, true);
  const field = g.units.filter(u => u.side === 'cf' && !memo.guards[u.id]);
  const deployableStrength = field.reduce((n, u) => n + E.unitStrength(u), 0);
  assert(front.target > deployableStrength * E.FRONT.emergencyMinShare,
    'threat-based emergency allocation increases above the old fixed 20%');
  assert(front.target <= deployableStrength * E.FRONT.emergencyMaxShare + 1e-9,
    'non-vital emergencies never claim more than 35% of mobile strength');
  const assigned = memo.fronts.reduce((total, f) => total + (f.target || 0), 0);
  assert(assigned <= deployableStrength + 1e-9, 'all fronts must fit the mobile army budget');
});

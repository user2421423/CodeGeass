'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
function setup({ barrier = false, nearby = false, enemyCity = false, defenders = 4 } = {}) {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  const cols = 40, rows = 24;
  Object.assign(g, {
    cols, rows, wrap: false, units: [], nextId: 1, sites: [], stations: [], ai: {}, phase: 'cf',
    tiles: Array.from({ length: cols * rows }, (_, i) => ({
      c: i % cols, r: Math.floor(i / cols),
      terrain: barrier && i % cols === 24 ? 'sea' : 'plains', owner: 'cf',
    })),
  });
  function city(owner, name, c, r, capital = false) {
    g.stations.push({ id: g.stations.length, owner, name, c, r, capitalOf: capital ? owner : null,
      tier: 1, lab: 0, fort: false, shield: 120, maxShield: 120,
      income: 12, industry: 6, science: 2, producedTurn: 0 });
  }
  city('cf', 'Capital', 4, 17, true);
  city('cf', 'Border A', 16, 11);
  city('cf', 'Border B', 18, 14);
  if (enemyCity) city('eu', 'Forward objective', 17, 18);
  city('eu', 'EuroCity', 34, 11, true);
  city('britannia', 'BritCity', 2, 2, true);
  const unit = (side, cls, c, r) => E.newUnit(g, E.typeFor(side, cls), side, c, r);
  unit('cf', 'scout', 13, 11);
  unit('cf', 'light', 12, 12);
  unit('cf', 'support', 8, 13);
  unit('cf', 'medium', 9, 9);
  for (let i = 0; i < defenders; i++) unit('cf', 'scout', 3 + i % 4, 14 + Math.floor(i / 4));
  for (let i = 0; i < 5; i++) unit('eu', 'medium', (nearby ? 21 : 25) + i, 11 + i % 2);
  return { g, memo: E.aiPlan(g, 'cf') };
}
const border = memo => memo.fronts.find(f => f.objectives.some(o => o.name === 'Border A'));
test('two-turn warning is an alert, never a defensive emergency', () => {
  const { memo } = setup();
  const f = border(memo);
  assert.ok(f);
  assert.equal(f.immediateMenace, 0);
  assert(f.projectedMenace > 0);
  assert.equal(f.emergency, false);
  assert.equal(f.posture, 'alert');
  assert.notEqual(f.state, 'holding');
  assert.equal(border(setup({barrier:true}).memo), undefined);
});
test('near-term legal attacks trigger genuine emergency holding and strength caps', () => {
  const { memo, g } = setup({nearby:true, defenders:8});
  const f = border(memo);
  assert.ok(f);
  assert(f.immediateMenace > 0);
  assert.equal(f.emergency, true);
  assert.equal(f.type, 'defensive');
  assert.equal(f.state, 'holding');
  const deployable = g.units.filter(u => u.side === 'cf' && !memo.guards[u.id])
    .reduce((n,u) => n + E.unitStrength(u), 0);
  assert(f.target <= deployable * E.FRONT.emergencyMaxShare + 1e-9);
  assert(memo.fronts.reduce((total,x)=>total+(x.target||0),0) <= deployable + 1e-9);
});
test('separate alert detachments preserve adjacent offensive theaters', () => {
  const {memo} = setup({enemyCity:true});
  const cover = border(memo);
  const assault = memo.fronts.find(f => f.type === 'offensive' &&
    f.objectives.some(o => o.name === 'Forward objective'));
  assert.ok(cover, 'threatened border city gets its own theater');
  assert.ok(assault, 'enemy objective remains an active offensive theater');
  assert.equal(cover.type, 'alert');
  assert.equal(cover.state, 'alert');
  assert.notEqual(assault.state, 'holding');
  assert(cover.seeds.some(([p]) => p.name === 'Border A'),
    'alert units stage near endangered friendly cities, not distant enemy capitals');
  assert(assault.seeds.some(([p]) => p.name === 'Forward objective') || assault.state === 'assembling');
});
test('alert-only theater budgets are shared and capped at fifteen percent', () => {
  const {memo, g}=setup();
  const deployable = g.units.filter(u=>u.side==='cf'&&!memo.guards[u.id])
    .reduce((n,u)=>n+E.unitStrength(u),0);
  const alerts=memo.fronts.filter(f=>f.type==='alert');
  assert(alerts.length>0);
  assert(alerts.reduce((total,f)=>total+(f.target||0),0) <= deployable*E.FRONT.alertShare+1e-9);
});

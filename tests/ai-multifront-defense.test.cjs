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
test('alert-only theater budgets are shared and capped at twenty-five percent', () => {
  const {memo, g}=setup();
  const deployable = g.units.filter(u=>u.side==='cf'&&!memo.guards[u.id])
    .reduce((n,u)=>n+E.unitStrength(u),0);
  const alerts=memo.fronts.filter(f=>f.type==='alert');
  assert(alerts.length>0);
  assert(alerts.reduce((total,f)=>total+(f.target||0),0) <= deployable*E.FRONT.alertShare+1e-9);
});

test('distant high-value capitals do not create impossible global invasion fronts', () => {
  const {memo} = setup();
  assert(!memo.fronts.some(f => f.objectives.some(o => o.name === 'EuroCity')),
    'the remote E.U. capital is not a regional offensive without a local army');
});
test('separated endangered cities form local defensive sectors', () => {
  const {g} = setup();
  g.stations.push({id: g.stations.length, owner: 'cf', name: 'Northern warning', c: 16, r: 2,
    capitalOf: null, tier: 1, lab: 0, fort: false,
    shield: 120, maxShield: 120, income: 12, industry: 6, science: 2, producedTurn: 0});
  E.newUnit(g, E.typeFor('eu', 'medium'), 'eu', 25, 2);
  // Use a new game object: the strategic planner caches each side once per turn.
  const copy = { ...g, ai: {}, stations: g.stations.slice(), units: g.units.slice() };
  const memo2 = E.aiPlan(copy, 'cf');
  const sectors = memo2.fronts.filter(f => f.type === 'alert' || f.type === 'defensive');
  assert(sectors.every(f => f.objectives.filter(o => o.defend).every(o =>
    E.internal.dist(copy, o, f.anchor) <= E.FRONT.defenseRadius)));
});
test('alert target allocations are nonnegative and bounded by the shared army cap', () => {
  const {g, memo} = setup({ enemyCity: true });
  const army = g.units.filter(u => u.side === 'cf' && !memo.guards[u.id])
    .reduce((sum,u) => sum + E.unitStrength(u),0);
  assert(memo.fronts.every(f => f.target >= -1e-8 && f.assigned >= -1e-8));
  assert(memo.fronts.filter(f => f.type === 'alert').reduce((n,f)=>n+f.target,0) <=
    army * E.FRONT.alertShare + 1e-8);
});

test('projected multi-sector pressure on a capital caps offensive commitments for every faction', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  g.phase = 'cf';
  const memo = E.aiPlan(g, 'cf');
  const mobile = E.internal.allUnits(g).filter(u => u.side === 'cf' && !E.internal.isShip(u) &&
    !memo.guards[u.id] && !u.hold && !memo.recoveries?.has(u.id))
    .reduce((n,u) => n + E.unitStrength(u),0);
  assert(memo.fronts.some(f => f.projectedVital && f.projectedMenace > 0),
    'there is an expected two-turn approach toward an important capital');
  assert(memo.fronts.filter(f => f.type === 'alert').length >= 2,
    'defensive coverage uses multiple sectors');
  const assaults = memo.fronts.filter(f => f.type === 'offensive');
  assert(assaults.length > 0, 'there are still real offensives');
  assert(assaults.every(f => f.target <= mobile * E.FRONT.capitalCrisisOffenseShare + 1e-8),
    'an exposed capital prevents one invasion from monopolizing the army');
  assert(memo.fronts.filter(f => f.type === 'alert')
    .reduce((n,f) => n+f.target,0) <= mobile*E.FRONT.capitalCrisisAlertShare+1e-8);
});

test('an immediate capital attack retains crisis reinforcements instead of shrinking to two frames', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  g.phase = 'cf';
  const capital = g.stations.find(s => s.capitalOf === 'cf');
  assert(capital);
  for(let i = 0; i < 4; i++)
    E.newUnit(g, E.typeFor('britannia', 'heavy', g), 'britannia',
      capital.c + 3 + i % 2, capital.r + Math.floor(i / 2));
  const memo = E.aiPlan(g, 'cf');
  const crisis = memo.fronts.find(f => f.objectives.some(o => o.name === capital.name));
  assert(crisis, 'capital remains an active defensive sector');
  assert.equal(crisis.type, 'defensive');
  assert.equal(crisis.vital, true);
  assert(crisis.immediateMenace > 0);
  assert(crisis.desiredStrength > 2, 'capital cover must incorporate next-wave arrivals');
  const army = E.internal.allUnits(g).filter(u => u.side === 'cf' && !E.internal.isShip(u) &&
    !memo.guards[u.id] && !u.hold && !memo.recoveries?.has(u.id))
    .reduce((n,u)=>n + E.unitStrength(u), 0);
  assert(memo.fronts.filter(f => f.type === 'offensive')
    .every(f => f.target <= army * E.FRONT.capitalCrisisOffenseShare + 1e-8),
    'an immediate, vital threat keeps other offensives within the crisis budget');
});

test('major-power objective values respond to overall rival strength', () => {
  const {g, memo} = setup({enemyCity: true});
  const first = memo.fronts.flatMap(f => f.objectives)
    .find(o => o.name === 'Forward objective');
  assert(first);
  for(let i = 0; i < 5; i++)
    g.stations.push({ ...g.stations.find(s => s.name === 'EuroCity'),
      id: 100 + i, capitalOf: null, name: 'Distant E.U. city '+i,
      c: 30 + i, r: 2 });
  const other = { ...g, ai: {}, stations: g.stations.slice(), units: g.units.slice() };
  const stronger = E.aiPlan(other, 'cf').fronts.flatMap(f => f.objectives)
    .find(o => o.name === 'Forward objective');
  assert(stronger);
  assert(stronger.value > first.value,
    'nearby enemy cities gain strategic weight when their owner becomes the strongest power');
});

// Regression: a capital emergency can exhaust the shared quota before ordinary
// border emergencies are allocated. Their targets must never become negative.
test('capital crises cannot create negative targets on other defensive fronts', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  g.phase = 'cf';
  const capital = g.stations.find(s => s.capitalOf === 'cf');
  assert(capital);
  for (let i = 0; i < 4; i++)
    E.newUnit(g, E.typeFor('britannia', 'heavy', g), 'britannia',
      capital.c + 3 + i % 2, capital.r + Math.floor(i / 2));
  const memo = E.aiPlan(g, 'cf');
  assert(memo.fronts.some(f => f.vital && f.emergency),
    'capital must be in a genuine immediate crisis');
  assert(memo.fronts.every(f => Number.isFinite(f.target) && f.target >= 0),
    'every front receives a nonnegative reinforcement target');
  const mobile = g.units.filter(u => u.side === 'cf' && !memo.guards[u.id])
    .reduce((sum, u) => sum + E.unitStrength(u), 0);
  assert(memo.fronts.reduce((sum, f) => sum + f.target, 0) <= mobile + 1e-8);
});

test('fronts report usable one-to-four-turn strength rather than distant assigned strength', () => {
  const { g } = setup({ nearby: true, defenders: 4 });
  const memo = E.aiPlan(g, 'cf');
  for (const f of memo.fronts) {
    assert(Number.isFinite(f.availableTwo) && Number.isFinite(f.availableFour));
    assert(f.availableTwo <= f.availableFour + 1e-8);
    assert(f.arrivingTwo <= f.arrivingFour + 1e-8);
    assert(f.arrivingFour <= f.assigned + 1e-8);
  }
});

test('overwhelmed noncapital theaters never withdraw their fixed capital garrisons', () => {
  const { g } = setup({ nearby: true, defenders: 2 });
  const memo = E.aiPlan(g, 'cf');
  for (const f of memo.fronts.filter(f => f.withdraw)) {
    assert.equal(f.type, 'defensive');
    assert.equal(f.vital, false);
    assert(f.fallback);
    assert.equal(f.state, 'regrouping');
    assert(f.seeds.some(([p]) => p === f.fallback));
  }
  const guards = Object.keys(memo.guards).map(Number);
  assert(guards.every(id => memo.assign[id] === undefined));
});

test('offensives may not launch solely because their assembly timer expires', () => {
  const { g } = setup({enemyCity: true, defenders: 4});
  const memo = E.aiPlan(g, 'cf');
  const offensive = memo.fronts.find(f => f.type === 'offensive' && f.rally);
  assert(offensive, 'there should be an active real offensive');
  const st = g.ai.cf.fronts[offensive.id];
  assert(st);
  if (offensive.state === 'assembling')
    assert(offensive.readyStrength < offensive.attackThreshold &&
      (g.turn - st.since < E.FRONT.wait ||
        offensive.readyStrength < Math.max(1, offensive.assigned * 0.35) ||
        offensive.readyStrength < offensive.enemyStrength * 1.2));
});

test('a recovered defensive regrouping theater can resume its offensive', () => {
  const { g, memo } = setup({ enemyCity: true });
  const assault = memo.fronts.find(f => f.type === 'offensive');
  assert(assault);
  const state = { ...g.ai.cf, fronts: { [assault.id]: {
    state: 'regrouping', since: g.turn - 8,
  } }, assignments: {} };
  const fresh = { ...g, ai: { cf: state }, units: g.units.slice(), stations: g.stations.slice() };
  const updated = E.aiPlan(fresh, 'cf');
  const active = updated.fronts.find(f => f.id === assault.id);
  assert(active);
  assert.equal(active.type, 'offensive');
  assert.notEqual(active.state, 'regrouping');
});

test('outnumbered frontier detachments select an uncontested same-landmass fallback', () => {
  const { g } = setup({ nearby: true, defenders: 1 });
  for (let i = 0; i < 12; i++)
    E.newUnit(g, E.typeFor('eu', 'heavy', g), 'eu',
      20 + i % 3, 8 + Math.floor(i / 3));
  // The setup has already planned this turn, so force a new memo on a fresh object.
  const fresh = { ...g, ai: {}, units: g.units.slice(), stations: g.stations.slice() };
  const memo = E.aiPlan(fresh, 'cf');
  const retreat = memo.fronts.find(f => f.withdraw);
  assert(retreat, 'a badly outnumbered noncapital front should choose to regroup');
  assert.equal(retreat.type, 'defensive');
  assert.equal(retreat.vital, false);
  assert.equal(retreat.state, 'regrouping');
  assert(retreat.fallback && retreat.seeds.some(([p]) => p === retreat.fallback));
});

test('quiet Conquest strongholds and major mines do not freeze mobile formations', () => {
  const { g } = setup();
  const safe = g.stations.find(s => s.name === 'Capital');
  safe.fort = true;
  g.sites.push({ id: 1234, owner: 'cf', name: 'Safe Mine', base: 40,
    c: 5, r: 15, city: null });
  const clone = { ...g, ai: {}, stations: g.stations.slice(),
    sites: g.sites.slice(), units: g.units.slice() };
  const memo = E.aiPlan(clone, 'cf');
  assert(Object.values(memo.guards || {}).every(g =>
    g.site !== 1234), 'a safe deposit should not consume a permanent field-army guard');
  assert(Object.values(memo.guards || {}).some(g => g.id === safe.id),
    'the national capital remains protected');
});

test('emergency mobilization protects an ordinary recruiting budget', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  g.phase = 'cf';
  const capital = g.stations.find(s => s.capitalOf === 'cf');
  assert(capital);
  for (let i = 0; i < 6; i++)
    E.newUnit(g, E.typeFor('britannia', 'heavy', g), 'britannia',
      capital.c + 2 + (i % 2), capital.r + Math.floor(i / 2));
  E.aiProduction(g);
  assert.equal(g.ai.cf.conventionalCrisis, true);
});

test('a single scout threatening a capital does not suspend strategic savings', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  g.phase = 'cf';
  const capital = g.stations.find(s => s.capitalOf === 'cf');
  g.units = g.units.filter(u => u.side !== 'britannia');
  E.newUnit(g, E.typeFor('britannia', 'scout', g), 'britannia',
    capital.c + 2, capital.r);
  E.aiProduction(g);
  assert.equal(g.ai.cf.conventionalCrisis, false);
});

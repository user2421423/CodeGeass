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

test('Eliminator preparation protects the capital even when other level-3 labs exist', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 123);
  const side = 'cf', capital = g.stations.find(s => s.owner === side && s.capitalOf === side);
  assert(capital);
  g.phase = side;
  g.turn = 16;
  capital.lab = 2;
  for(const s of g.stations) if(s.owner === side && s !== capital) s.lab = 3;
  g.economy[side] = {credits: 20000, industry: 20000, science: 5000, sakuradite: 3000};
  E.aiProduction(g);
  assert.equal(capital.lab, 3,
    'build a capital-covering lab instead of relying on remote ready laboratories');
  g.turn = 27;
  g.fleijaDetonated = 22;
  g.phase = side;
  // This isolated fixture skips the 11 intervening income-collection turns.
  // Replenish the treasury rather than testing an artificial resource shortage.
  g.economy[side] = {credits: 20000, industry: 20000, science: 5000, sakuradite: 3000};
  E.aiProduction(g);
  assert(g.stations.some(s => s.owner === side && s.eliminatorProject?.side === side &&
    E.internal.dist(g, s, capital) <= E.ELIMINATOR.range),
    'first available charge is developed inside interception range of the capital');
});

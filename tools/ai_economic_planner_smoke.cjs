#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {E}=require('./scenario_sim.cjs');
const scenarios=Object.values(E.scenarios.byId);
const scenario=scenarios.find(s=>s.sides?.length>=2 &&
  s.create(s.sides[0],'normal',11).stations.some(c=>c.owner===s.sides[0]));
assert(scenario,'expected regional scenario with a production city');
const side=scenario.sides[0],g=scenario.create(side,'normal',11);
g.phase=side;
const wallet=E.internal.funds(g,side);
E.internal.income(g,side); // complete one-time localized regional economy initialization
const allies=g.stations.filter(c=>c.owner===side),
  foes=g.units.filter(u=>u.hp>0&&u.side!==side),
  memo={fronts:[]},
  plan=(distance=()=>10)=>E.aiEconomicPlan(g,side,memo,allies,foes,distance);
const before=JSON.stringify(g);
const p=plan();
assert.deepEqual(JSON.parse(JSON.stringify(g)),JSON.parse(before),
  'planner must not persist state or change save data');
assert.equal(p.horizon>=3&&p.horizon<=8,true,'bounded forecasting horizon');
assert.equal(p.mode,'consolidation');
for(const resource of ['credits','industry','science','sakuradite']){
  assert.equal(p.forecast[resource]>=(wallet[resource]||0),true);
  const impossible={[resource]:(wallet[resource]||0)+1};
  assert.equal(p.budget.allows(impossible,'production'),false,
    'overspending '+resource+' must be impossible');
}
assert.equal(p.budget.allows({credits:-1}),false,'negative costs are invalid');
assert.equal(p.budget.allows({credits:NaN}),false,'invalid costs rejected');
assert.equal(p.budget.allows({credits:0,industry:0},'production'),true);
assert.equal(plan(),p,'forecast cached for current turn and memo');
g.turn++;
const next=plan();
assert.notEqual(next,p,'forecast invalidates after turn change');
// Danger overrides optional development without blocking emergency field spending.
g.turn++;
allies[0].shield=allies[0].maxShield*0.3;
const threatened=plan(()=>1);
assert.equal(threatened.critical,true);
assert.equal(threatened.mode,'defensive');
assert.equal(threatened.budget.allows({credits:1},'factory'),false);
assert.equal(threatened.budget.allows({credits:1},'production',true),true);
// High-income faction with no safe factories should not reserve an impossible
// future recruitment, or burn money in threatened economic buildings.
wallet.credits=5000;wallet.industry=3000;
for(const c of allies)c.tier=0;
g.turn++;
const noFactories=plan(()=>1);
assert.equal(noFactories.safeCapacity,0);
assert.equal(noFactories.budget.allows({credits:100},'lab'),false);
assert.equal(noFactories.budget.allows({credits:100},'production',true),true);
// City investment never invents tier-4+ upgrades.
const city=allies[0], cost={credits:200,industry:50};
city.cityTier=4;
assert.equal(noFactories.cityScore(city,cost),-Infinity);
const beforeTech=JSON.stringify(g.tech||{});
noFactories.buildingScore(city,'lab',{credits:100,industry:20});
assert.equal(JSON.stringify(g.tech||{}),beforeTech,'HQ research untouched');
console.log('AI_ECONOMIC_PLANNER_SMOKE PASS scenario='+scenario.id);

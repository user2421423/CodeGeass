'use strict';
// Permanent regressions for defects found by the tournament audit.
const test=require('node:test');
const assert=require('node:assert/strict');
const {E,simulate}=require('../scenario_sim.cjs');
for(const difficulty of ['normal','elite']) test('save/load preserves regional HQ defense capacity: area-18/'+difficulty,()=>{
  const g=E.scenarios.byId['area-18'].create('britannia',difficulty,11);
  const original=g.stations.find(s=>s.name==='Riyadh');
  original.shield=Math.round(original.maxShield*.25);
  const loaded=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
  const restored=loaded.stations.find(s=>s.id===original.id);
  assert.equal(restored.maxShield,original.maxShield,
    'Saving/loading alone must not promote a regional HQ to a 600-base-HP faction capital');
  assert.equal(restored.shield,original.shield,'combat damage survives the load');
  // Repair a save that already passed through the defective migration.
  restored.cityTier=4;restored.maxShield+=200;restored.shield+=200;
  const repaired=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(loaded))));
  const city=repaired.stations.find(s=>s.id===original.id);
  assert.equal(city.maxShield,original.maxShield);
  assert.equal(city.shield,original.shield);
  const again=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(repaired))));
  assert.deepEqual(again.stations,repaired.stations,'regional defense repair is idempotent');
});
test('Elite Panama Atlantic AI completes two turns without an invalid-preview crash',()=>{
  const {r}=simulate(E.scenarios.byId['eu-panama'],'eu','elite',11,2);
  assert.deepEqual(r.errors,[],'Every target selected by the AI must have a valid combat preview');
  assert.equal(r.snapshots.length,2);
  assert.ok(Object.values(r.attacks).reduce((a,b)=>a+b,0)>0,'AI continues fighting');
});
test('regional HQ factory/lab upgrades cannot acquire true-capital defenses',()=>{
  const g=E.scenarios.byId['war-for-australia'].create('britannia','normal',11);
  const city=g.stations.find(s=>s.name==='Sydney');
  Object.assign(g.economy.britannia,{credits:100000,industry:100000});g.units=[];
  city.tier=1;city.shield=123;const max=city.maxShield;
  assert.equal(E.build(g,city.id,'factory').ok,true);
  assert.equal(E.build(g,city.id,'lab').ok,true);
  assert.equal(city.maxShield,max);assert.equal(city.shield,123);
});

'use strict';
// Strict reproductions of inherited defects. These deliberately remain failing
// until their engine/scenario owners fix the behavior; no skips or TODO masking.
const test=require('node:test');
const assert=require('node:assert/strict');
const {E,simulate}=require('../scenario_sim.cjs');
for(const difficulty of ['normal','elite']) test('save/load preserves regional HQ defense capacity: area-18/'+difficulty,()=>{
  const g=E.scenarios.byId['area-18'].create('britannia',difficulty,11);
  const original=g.stations.find(s=>s.name==='Riyadh');
  const loaded=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
  const restored=loaded.stations.find(s=>s.id===original.id);
  assert.equal(restored.maxShield,original.maxShield,
    'Saving/loading alone must not promote a regional HQ to a 600-base-HP faction capital');
});
test('Elite Panama Atlantic AI completes two turns without an invalid-preview crash',()=>{
  const {r}=simulate(E.scenarios.byId['eu-panama'],'eu','elite',11,2);
  assert.deepEqual(r.errors,[],'Every target selected by the AI must have a valid combat preview');
});

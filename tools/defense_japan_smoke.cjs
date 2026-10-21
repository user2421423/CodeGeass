#!/usr/bin/env node
'use strict';
// Run after: node tools/build_sources.cjs
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/scenarios.js');
const scenario=require('../dist/scenarios-defense-japan.js');
const {simulate}=require('./scenario_sim.cjs');
const difficulties=['normal','hard','challenge','elite'];

assert.equal(E.scenarios.byId['defense-japan'],scenario);
assert.deepEqual([...scenario.sides],['bk','britannia']);
for(const player of scenario.sides)for(const difficulty of difficulties){
  const g=scenario.create(player,difficulty,11);
  assert.equal(g.scenario.id,'defense-japan');
  assert.equal(g.stations.length,44);
  assert.equal(g.cols,110);assert.equal(g.rows,84);
  assert.deepEqual(g.order,[player,...scenario.sides.filter(s=>s!==player)]);
  assert.ok(g.stations.every(s=>s.owner==='bk'),'Black Knights own every city');
  assert.ok(g.stations.filter(s=>s.portAt).every(s=>s.portOwner==='bk'),
    'Black Knights own every starting port');
  assert.ok(g.tiles.filter(t=>t.provinceCity!=null).every(t=>t.owner==='bk'),
    'Black Knights own all Japanese land provinces');
  assert.ok(g.units.every(u=>['bk','britannia'].includes(u.side)),
    'No Chinese or EU units');
  const carriers=g.units.filter(u=>u.side==='britannia');
  assert.equal(carriers.length,18,'Exactly eighteen Britannian carrier hulls');
  assert.ok(carriers.every(u=>u.type==='carrier_battleship'),
    'All Britannian map units must be carriers');
  assert.ok(carriers.every(u=>u.terrain!=='offmap'&&E.tile(g,u.c,u.r).terrain==='sea'),
    'Carrier starting hexes must be navigable sea');
  assert.ok(carriers.every(u=>u.cargo?.length===2),
    'Both troop slots must start filled');
  const embarked=carriers.flatMap(u=>u.cargo);
  assert.equal(embarked.length,36,'Thirty-six embarked Britannian land formations');
  assert.ok(embarked.every(u=>u.side==='britannia'&&!E.TYPES[u.type].naval),
    'Only Britannian land frames are embarked');
  assert.ok(embarked.every(u=>!g.units.includes(u)),
    'No Britannian formations start ashore');
  const defenders=g.units.filter(u=>u.side==='bk'&&!E.TYPES[u.type].naval);
  const defenseNavy=g.units.filter(u=>u.side==='bk'&&E.TYPES[u.type].naval);
  assert.equal(defenders.length,29,'Keep 29 Black Knights land formations');
  assert.equal(defenseNavy.length,11,'Deploy eleven Black Knights naval formations');
  assert.equal(defenseNavy.filter(u=>u.type==='bk_carrier').length,5);
  assert.equal(defenseNavy.filter(u=>u.type==='bk_amphibious_ii').length,6);
  assert.equal(g.scenario.citylessWarChestTurns,3);
  if(difficulty==='normal')
    assert.equal(defenders.reduce((sum,u)=>sum+u.stack,0),58,
      'All Black Knights defenders are two-frame formations');
  assert.deepEqual(g.startUnits,{bk:g.units.filter(u=>u.side==='bk').length,britannia:54});
  assert.equal(scenario.winner(g),null,'No instant victory');
  assert.equal(scenario.meta.expeditionSide,'britannia');
  assert.ok(scenario.objective(g,'bk').includes('44'));
  assert.ok(scenario.objective(g,'britannia').includes('44'));
  // Both win conditions must work regardless of which faction is controlled.
  const noFleet=scenario.create(player,difficulty,11);
  noFleet.units=noFleet.units.filter(u=>u.side!=='britannia');
  assert.equal(scenario.winner(noFleet)?.winner,'bk');
  const conquered=scenario.create(player,difficulty,11);
  conquered.stations.forEach(s=>{s.owner='britannia';});
  assert.equal(scenario.winner(conquered)?.winner,'britannia');
  // Starting income should be localized only once all formations exist.
  assert.ok(E.income(g,'bk').credits>0);
  assert.equal(E.income(g,'britannia').credits,0,
    'A cityless invader earns no repeating income after setup');
  assert.ok(g.economy.britannia.credits>0,
    'Cityless invader has a finite opening war chest');
  if(difficulty==='normal') {
    assert.equal(g.economy.britannia.credits,1620,
      'Britannia must receive three turns of credits, not ten');
    assert.equal(g.economy.britannia.industry,990,
      'Britannia must receive three turns of industry, not ten');
  }
  if(difficulty==='elite'){
    assert.ok(embarked.every(u=>u.elite),'Elite scenario converts embarked land formations');
    assert.ok(g.units.filter(u=>u.side==='bk'&&!E.TYPES[u.type].naval)
      .every(u=>u.elite),'Elite scenario converts defenders');
  }
}
for(const player of scenario.sides){
  const {r}=simulate(scenario,player,'normal',11,3);
  assert.equal(r.errors.length,0,player+' must complete short AI turns without errors: '+JSON.stringify(r.errors));
}
console.log('Defense of Japan smoke: PASS (2 factions x 4 difficulties; 3-turn AI tests)');

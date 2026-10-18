'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { E, DIFFICULTIES } = require('../scenario_sim.cjs');
const affected=['cf-pacific-northwest','bf-malacca','cf-mexico','cf-panama'];
const fast=process.env.KC_TEST_SUITE==='fast';
const scenarios=Object.values(E.scenarios.byId).filter(s=>!fast||affected.includes(s.id));
for (const scenario of scenarios) for (const player of scenario.sides)
  for (const difficulty of fast?['elite']:DIFFICULTIES) test(`setup/roster ${scenario.id}/${player}/${difficulty}`,()=>{
    const g=scenario.create(player,difficulty,11), ids=new Set();
    const all=g.units.flatMap(u=>[u,...(u.cargo||[])]);
    const chinese=new Set([...Object.values(E.LINEUPS.cf2017),...Object.values(E.NAVAL.cf)]);
    for(const u of all) {
      assert.ok(E.TYPES[u.type],u.type+' exists');
      assert.ok(!ids.has(u.id),'unique formation ID '+u.id);ids.add(u.id);
      assert.ok(Number.isFinite(u.hp),'finite HP '+u.id);
      if(u.elite) { assert.equal(u.stack,1,'Elite single frame');assert.ok(E.eliteEligible(g,u.side,u.elite),'legal Elite '+u.side+'/'+u.elite); }
      else if(u.side==='cf') assert.ok(chinese.has(u.type),'native CF ordinary roster '+u.type);
    }
    for(const city of g.stations) {
      assert.ok(city.shield>=0&&city.shield<=city.maxShield,'valid city shield '+city.name);
      assert.ok([200,250,300,400,600].includes(city.maxShield-(city.fortBonus||0)),'standard city defense '+city.name);
    }
    if(affected.includes(g.scenario.id))
      for(const id of g.scenario.eliteRosters?.cf||[])
      assert.ok(E.eliteEligible(g,'cf',id),'native CF selectable Elite roster '+id);
    const loaded=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
    assert.ok(loaded,'scenario save can be loaded');
    for(const city of g.stations) {
      const restored=loaded.stations.find(c=>c.id===city.id);
      assert.equal(restored.maxShield,city.maxShield,'load preserves capacity '+city.name);
      assert.equal(restored.shield,city.shield,'load preserves damage '+city.name);
    }
  });

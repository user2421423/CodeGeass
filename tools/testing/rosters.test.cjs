'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { E, DIFFICULTIES } = require('../scenario_sim.cjs');
for (const scenario of Object.values(E.scenarios.byId)) for (const player of scenario.sides)
  for (const difficulty of DIFFICULTIES) test(`setup/roster ${scenario.id}/${player}/${difficulty}`,()=>{
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
  });

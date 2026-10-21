#!/usr/bin/env node
'use strict';
// All regional scenarios: no external per-turn funding after launch.
// Cityless amphibious invasions use an initial war chest instead (ten turns unless the scenario sets
// citylessWarChestTurns).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const dist=path.resolve(__dirname,'../dist');
for(const file of fs.readdirSync(dist)
  .filter(x=>/^(scenarios.*|.*-landmask|.*-geography)\.js$/.test(x)).sort())
  require(path.join(dist,file));
const resources=['credits','industry','science','sakuradite'];
const entries=Object.entries(E.scenarios?.byId||{});
assert.ok(entries.length>=37,'Every regional scenario must be registered');
let cityless=0,local=0,checked=0;
for(const [id,scenario] of entries){
  if(!scenario || typeof scenario.create!=='function')throw Error('Missing scenario '+id);
  const g=scenario.create(scenario.sides[0],'normal',2117);
  assert.ok(g.startUnits,'Scenario must complete starting force setup: '+id);
  const sides=Object.keys(g.scenario.funding||{});
  if(id==='division-japan'){
    assert.equal(sides.length,0,'Division already uses locally assigned production');
    continue;
  }
  if(g.scenario.economyLocalized){
    assert.equal(sides.length,0,'Already-localized scenarios cannot retain off-map funding: '+id);
    sides.push(...scenario.sides);
  }else assert.ok(sides.length>0,'Expected initial scenario funding: '+id);
  const startUnits=g.startUnits;
  g.startUnits=null; // Inspect the authored opening targets before localization.
  const before=Object.fromEntries(sides.map(side=>[side,E.income(g,side)]));
  g.startUnits=startUnits;
  E.income(g,scenario.sides[0]); // Automatic one-time localization.
  assert.equal(g.scenario.economyLocalized,true,'Income localized: '+id);
  assert.deepEqual(g.scenario.funding,{},'Fixed funding removed: '+id);
  for(const side of sides){
    const cities=g.stations.filter(s=>s.owner===side);
    const now=E.income(g,side);
    if(cities.length){
      for(const resource of resources){
        assert.ok(Math.abs(now[resource]-before[side][resource])<1.01,
          id+'/'+side+' '+resource+' preserved '+before[side][resource]+' -> '+now[resource]);
      }
      assert.ok(cities.some(s=>s.regionalIncome),
        'Starting cities hold the additional income: '+id+'/'+side);
      local++;
    }else{
      cityless++;
      for(const resource of resources){
        assert.equal(now[resource],0,id+'/'+side+' cityless '+resource+' income is zero');
        assert.ok((g.economy[side][resource]||0)>=
          // A scenario may set its own reserve (Defense of Japan: three turns); the default is ten.
          Math.max(0,Math.round(before[side][resource]*(g.scenario.citylessWarChestTurns||10))),
          id+'/'+side+' cityless initial '+resource+' war chest is high enough');
      }
    }
    checked++;
  }
  // Capturing a city should transfer its income, never reinstate a stipend.
  const a=g.stations.find(s=>s.regionalIncome && s.owner===scenario.sides[0]);
  if(a){
    const priorOwner=a.owner,opponent=scenario.sides.find(s=>s!==priorOwner);
    if(opponent){
      const prior=E.income(g,opponent);
      a.owner=opponent;
      const next=E.income(g,opponent);
      assert.ok(next.credits>prior.credits,
        'Capturing a city transfers its local credit income: '+id);
    }
  }
}
console.log('Regional city-local funding: PASS; scenarios='+entries.length+
  '; checkedSides='+checked+'; startingCitySides='+local+'; citylessSides='+cityless);

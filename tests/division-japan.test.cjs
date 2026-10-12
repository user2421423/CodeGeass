'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const invasion = require('../dist/scenarios.js');
const division = require('../dist/scenarios-division-japan.js');

const city = (g, name) => g.stations.find(s => s.name === name);

test('Division registers as a separate 44-city scenario without mutating Invasion', () => {
  assert.equal(division.id, 'division-japan');
  assert.equal(E.scenarios.japan, invasion);
  assert.equal(E.scenarios.byId['division-japan'], division);
  assert.equal(E.scenarios.byId['invasion-japan'], invasion);
  assert.deepEqual(division.sides, ['britannia','eu','cf']);
  assert.deepEqual(Object.fromEntries(Object.entries(division.regions)
    .map(([side,cities])=>[side,cities.length])), {eu:12,britannia:15,cf:17});
  const names=Object.values(division.regions).flat();
  assert.equal(new Set(names).size,44);
  assert.deepEqual(names.slice().sort(), invasion.cityData.map(c=>c[0]).sort());
  const old=invasion.create('britannia','normal',11);
  assert.equal(old.scenario.id,'invasion-japan');
  assert.deepEqual(invasion.sides,['britannia','bk','cf']);
  assert.equal(E.foe(old,'britannia','bk'),false);
});

test('All three factions begin with real territory, armies, fleets and commanders', () => {
  const expected={britannia:15,eu:12,cf:17};
  for(const player of division.sides){
    const g=division.create(player,'normal',11);
    assert.equal(g.mode,'scenario');
    assert.equal(g.scenario.id,'division-japan');
    assert.equal(g.player,player);
    assert.equal(g.phase,player);
    assert.equal(g.turn,1);
    assert.equal(g.teams,null);
    assert.equal(g.stations.length,44);
    assert.equal(g.tiles.length,9240);
    assert.deepEqual(new Set(g.order),new Set(division.sides));
    assert.equal(g.units.length,84);
    assert.equal(new Set(g.units.map(u=>E.key(u))).size,84,'no overlapping starting units');
    for(const side of division.sides){
      assert.equal(g.stations.filter(s=>s.owner===side).length,expected[side]);
      assert.equal(g.units.filter(u=>u.side===side&&!E.TYPES[u.type].naval).length,24);
      assert.equal(g.units.filter(u=>u.side===side&&E.TYPES[u.type].naval).length,4);
      const named=g.units.filter(u=>u.side===side&&u.cmd);
      assert.equal(named.length,4,side+' receives four named commanders');
      assert.equal(new Set(named.map(u=>u.cmd)).size,4);
      assert.ok(named.every(u=>E.COMMANDERS[u.cmd]?.side===side));
      assert.equal(g.startUnits[side],28);
      assert.ok(g.stations.some(s=>s.owner===side&&s.portAt&&s.portOwner===side),
        side+' needs a functional controlled shipyard');
    }
    for(const side of division.sides)
      for(const other of division.sides)
        if(side!==other)assert.equal(E.foe(g,side,other),true);
    assert.equal(E.checkVictory(g),null);
    assert.equal(g.scenario.phase,'three-way-war');
    assert.equal(g.scenario.turnLimit,undefined);
    assert.ok(g.scenario.groups.every(gr=>gr.units.every(id=>
      g.units.some(u=>u.id===id&&u.side===gr.side))));
    for(const u of g.units){
      const t=E.tile(g,u.c,u.r);
      assert.equal(E.TYPES[u.type].naval ? t.terrain==='sea' : t.owner===u.side,
        true, 'formation must be deployed on legal territory or at sea');
    }
    assert.ok(E.income(g,'britannia').industry>E.income(g,'eu').industry,
      'Britannia has stronger industry despite fewer cities than China');
  }
});

test('The three fronts reflect the approved political boundaries', () => {
  const g=division.create('eu','normal',11);
  for(const [name,side] of [
    ['Sapporo','eu'],['Sendai','eu'],['Niigata','eu'],['Chiba','eu'],['Narita','eu'],
    ['Tokyo Settlement','britannia'],['Mount Fuji','britannia'],['Nagoya','britannia'],
    ['Kyoto','britannia'],['Osaka','britannia'],['Kobe','britannia'],
    ['Hiroshima','cf'],['Shimonoseki','cf'],['Fukuoka','cf'],
    ['Nagasaki','cf'],['Kumamoto','cf'],['Takamatsu','cf'],
  ]) {
    const c=city(g,name);
    assert.equal(c.owner,side,name);
    assert.equal(E.tile(g,c.c,c.r).owner,side,'city tile owner '+name);
  }
  assert.equal(city(g,'Sapporo').capitalOf,'eu');
  assert.equal(city(g,'Tokyo Settlement').capitalOf,'britannia');
  assert.equal(city(g,'Fukuoka').capitalOf,'cf');
  for(const s of g.stations.filter(s=>s.portAt))
    assert.equal(s.portOwner,s.owner,s.name+' port belongs to city owner');
});

test('The division is a no-turn-limit total conquest, not a score-based mission', () => {
  for(const player of division.sides){
    const g=division.create(player,'normal',37);
    for(const side of division.sides){
      for(const s of g.stations)s.owner=side;
      city(g,'Kushiro').owner=player===side?'cf':player;
      if(city(g,'Kushiro').owner===side)
        city(g,'Kushiro').owner=division.sides.find(t=>t!==side);
      for(const turn of [1,61,120,200]){
        g.turn=turn;
        assert.equal(division.winner(g),null);
        assert.equal(E.checkVictory(g),null);
      }
      for(const s of g.stations)s.owner=side;
      assert.equal(division.winner(g)?.winner,side);
      assert.equal(E.checkVictory(g)?.winner,side);
      g.over=null;
    }
  }
});

test('Hard and Challenge strengthen opposing armies and resources only', () => {
  for(const player of division.sides){
    const normal=division.create(player,'normal',41);
    const hard=division.create(player,'hard',41);
    const challenge=division.create(player,'challenge',41);
    const strength=(g,s)=>g.units.filter(u=>u.side===s&&!E.TYPES[u.type].naval)
      .reduce((n,u)=>n+u.stack,0);
    assert.deepEqual(normal.stations.map(s=>[s.name,s.owner]),
      challenge.stations.map(s=>[s.name,s.owner]));
    assert.equal(strength(normal,player),strength(hard,player));
    for(const side of division.sides.filter(s=>s!==player)){
      assert.ok(strength(hard,side)>strength(normal,side));
      assert.ok(strength(challenge,side)>strength(hard,side));
      assert.ok(E.income(challenge,side).credits>E.income(hard,side).credits);
      assert.ok(E.income(hard,side).credits>E.income(normal,side).credits);
    }
  }
});

test('Scenario AI can plan, produce and act as either opposing power', () => {
  for(const player of division.sides){
    const g=division.create(player,'normal',51);
    for(const side of g.order.slice(1)){
      E.beginTurn(g,side,false);
      assert.doesNotThrow(()=>E.aiPlan(g,side));
      assert.doesNotThrow(()=>E.aiProduction(g));
      for(const id of g.units.filter(u=>u.side===side&&u.hp>0).slice(0,6).map(u=>u.id))
        assert.doesNotThrow(()=>E.aiOrder(g,id));
    }
  }
});

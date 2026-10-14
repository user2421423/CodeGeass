'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');

function war() {
  const g=E.createGame('britannia','normal','conquest',401);
  g.units=[];g.turn=31;g.phase='britannia';g.over=null;
  g.fleijaDetonated=1;g.arsenal={...g.arsenal,britannia:1};
  return g;
}
function landAt(g,p,radius,side=null) {
  return E.within(g,p,radius).filter(t=>
    E.distance(t,p,g)===radius && !E.TERRAIN[t.terrain]?.blocked &&
    t.terrain!=='sea'&&t.terrain!=='ocean' &&
    !E.stationAt(g,t)&&!E.unitAt(g,t) &&
    (side==null||!g.stations.some(s=>s.owner===side&&E.distance(s,t,g)<=3)));
}

test('new forward-city anchor preserves the capital and shields a threatened city troop cluster',()=>{
  const g=war();g.phase='cf';
  const capital=g.stations.find(s=>s.owner==='cf'&&s.capitalOf==='cf');
  const forward=g.stations.filter(s=>s.owner==='cf'&&s!==capital&&
    E.distance(s,capital,g)>E.ELIMINATOR.range&&
    landAt(g,s,1).length>=2&&landAt(g,s,8).length)
    .sort((a,b)=>E.distance(b,capital,g)-E.distance(a,capital,g))[0];
  assert.ok(capital&&forward);
  const spare=g.stations.find(s=>s.owner==='cf'&&s!==capital&&s!==forward&&
    E.distance(s,capital,g)>E.ELIMINATOR.range&&
    E.distance(s,forward,g)>E.ELIMINATOR.range);
  assert.ok(spare,'three charges are available while one stays mobile');
  capital.eliminator=1;forward.eliminator=1;spare.eliminator=1;
  forward.tier=4;forward.income=50;forward.industry=50;
  const friendly=landAt(g,forward,1);
  E.newUnit(g,E.typeFor('cf','scout'),'cf',friendly[0].c,friendly[0].r);
  E.newUnit(g,E.typeFor('cf','scout'),'cf',friendly[1].c,friendly[1].r);
  const enemy=landAt(g,forward,8)[0];assert.ok(enemy);
  E.newUnit(g,E.typeFor('britannia','scout'),'britannia',enemy.c,enemy.r);
  E.aiAssignEliminators(g,'cf');
  assert.equal(capital.eliminator,1,'capital anchor is reserved');
  assert.equal(forward.eliminator,1,'second city-and-army anchor is retained');
});

test('2018 returns original defensive allocations without forward-city anchor override',()=>{
  const g=war(); g.era='ufn2018'; g.phase='cf';
  const capital=g.stations.find(s=>s.owner==='cf'&&s.capitalOf==='cf');
  const far=g.stations.find(s=>s.owner==='cf'&&s!==capital&&E.distance(s,capital,g)>8);
  assert.ok(capital&&far);
  capital.eliminator=1;
  far.eliminator=1;
  // With only two charges, baseline allocation leaves the best city anchor
  // and existing courier/escort policies remain in force.
  const stateBefore=E.eliminatorCharges(g,'cf').length;
  E.aiAssignEliminators(g,'cf');
  assert.equal(stateBefore,2);
  assert.equal(E.eliminatorCharges(g,'cf').length,2);
});

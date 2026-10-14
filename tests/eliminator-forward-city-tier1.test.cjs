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

test('five-hit threshold counts only unintercepted enemy cities at ground zero and persists in saves',()=>{
  const g=war();
  const city=g.stations.find(s=>s.owner==='cf'&&
    g.stations.filter(x=>x.owner==='cf').length>1);
  assert.ok(city);
  g.fleijaSuccessfulCityHits={britannia:4};
  const shot=E.launch(g,'britannia',city.c,city.r);
  assert.ok(shot.ok&&!shot.intercepted,shot.reason);
  assert.equal(g.fleijaSuccessfulCityHits.britannia,5);
  const loaded=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
  assert.ok(loaded);
  assert.equal(loaded.fleijaSuccessfulCityHits.britannia,5);
  assert.equal(loaded.fleijaSuccessfulCityHits.cf||0,0);
});

test('intercepted city strike does not advance the five-hit threshold',()=>{
  const g=war();
  const target=g.stations.find(s=>s.owner==='cf');
  target.eliminator=1;
  g.fleijaSuccessfulCityHits={britannia:4};
  const shot=E.launch(g,'britannia',target.c,target.r);
  assert.ok(shot.intercepted);
  assert.equal(g.fleijaSuccessfulCityHits.britannia,4);
});

test('splash near a city is not counted as a successful ground-zero city hit',()=>{
  const g=war();
  const city=g.stations.find(s=>s.owner==='cf'&&landAt(g,s,1).length);
  const p=landAt(g,city,1)[0];
  g.fleijaSuccessfulCityHits={britannia:4};
  const shot=E.launch(g,'britannia',p.c,p.r);
  assert.ok(shot.ok&&!shot.intercepted,shot.reason);
  assert.equal(g.fleijaSuccessfulCityHits.britannia,4);
});

test('after five city hits AI prefers a legally targetable Tier 1 enemy commander',()=>{
  const g=war();
  const frontier=g.stations.find(s=>s.owner==='cf'&&landAt(g,s,7,'britannia').length);
  const p=landAt(g,frontier,7,'britannia').find(t=>
    !g.stations.some(s=>E.distance(s,t,g)<=2));
  assert.ok(p,'need a legal open-field Tier 1 target');
  const officer=E.newUnit(g,E.typeFor('cf','scout'),'cf',p.c,p.r,1,'xingke');
  assert.equal(E.COMMANDERS[officer.cmd]?.storyTier,1);
  g.fleijaSuccessfulCityHits={britannia:4};
  const early=E.aiLaunchTarget(g,'britannia');
  g.fleijaSuccessfulCityHits.britannia=5;
  const later=E.aiLaunchTarget(g,'britannia');
  assert.ok(later,'AI should select a strategic target');
  assert.equal(E.distance(later,officer,g),0,'Tier 1 officer should become a direct target');
  assert.ok(!early||E.distance(early,officer,g)>0,'before threshold, commander is not preferred');
});

test('new forward-city anchor preserves the capital and shields a threatened city troop cluster',()=>{
  const g=war();g.phase='cf';
  const capital=g.stations.find(s=>s.owner==='cf'&&s.capitalOf==='cf');
  const forward=g.stations.filter(s=>s.owner==='cf'&&s!==capital&&
    E.distance(s,capital,g)>E.ELIMINATOR.range&&
    landAt(g,s,1).length>=2&&landAt(g,s,8).length)
    .sort((a,b)=>E.distance(b,capital,g)-E.distance(a,capital,g))[0];
  assert.ok(capital&&forward);
  capital.eliminator=1;forward.eliminator=1;
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

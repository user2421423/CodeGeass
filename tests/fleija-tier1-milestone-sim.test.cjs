'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
test('full fifth real city detonation activates Tier 1 commander target in a subsequent AI production phase',()=>{
  const g=E.createGame('britannia','normal','conquest',401);
  g.units=[];g.turn=31;g.phase='britannia';g.over=null;
  g.fleijaDetonated=1;g.fleijaSuccessfulCityHits={britannia:4};
  g.arsenal={...g.arsenal,britannia:1};
  const city=g.stations.find(s=>s.owner==='cf'&&g.stations.filter(x=>x.owner==='cf').length>1);
  const fifth=E.launch(g,'britannia',city.c,city.r);
  assert.ok(fifth.ok&&!fifth.intercepted,fifth.reason);
  assert.equal(g.fleijaSuccessfulCityHits.britannia,5);
  g.arsenal.britannia=1;g.over=null;
  const legalLand=p=>!E.TERRAIN[p.terrain]?.blocked&&p.terrain!=='sea'&&p.terrain!=='ocean'&&
    !E.stationAt(g,p)&&!E.unitAt(g,p)&&
    !g.stations.some(s=>E.distance(s,p,g)<=2);
  const defenderCity=g.stations.find(s=>s.owner==='cf'&&
    E.within(g,s,7).some(p=>E.distance(p,s,g)===7&&legalLand(p)));
  assert.ok(defenderCity);
  const location=E.within(g,defenderCity,7).find(p=>E.distance(p,defenderCity,g)===7&&legalLand(p));
  assert.ok(location);
  const officer=E.newUnit(g,E.typeFor('cf','scout'),'cf',location.c,location.r,1,'xingke');
  assert.equal(E.COMMANDERS[officer.cmd]?.storyTier,1);
  const intended=E.aiLaunchTarget(g,'britannia');
  assert.equal(E.distance(intended,officer,g),0);
  E.aiProduction(g);
  const shot=(g.launches||[])[0];
  assert.ok(shot?.ok,'production AI should actually fire the ready warhead');
  assert.equal(E.distance(shot.to,location,g),0,'production AI should target Tier 1 at ground zero');
});

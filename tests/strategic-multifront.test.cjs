'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const japan = require('../dist/scenarios.js');
const division = require('../dist/scenarios-division-japan.js');
const europe = require('../dist/scenarios-europe.js');

const land = (g,side)=>g.units.filter(u=>u.hp>0&&u.side===side&&!E.TYPES[u.type].naval);

test('Division of Japan uses persistent two-theater commitments without permanent garrisons',()=>{
  const g=division.create('britannia','normal',412);
  const plan=E.aiPlan(g,'britannia');
  assert.equal(plan.doctrine,'division');
  const wings=Object.values(plan.wings);
  assert.equal(wings.length,land(g,'britannia').length);
  assert.equal(wings.filter(w=>w==='eu').length,Math.ceil(wings.length/2));
  assert.equal(wings.filter(w=>w==='cf').length,Math.floor(wings.length/2));
  assert.ok(Object.values(plan.guards).every(p=>p.response && p.emergency),'any initial defenders are threat-triggered');
  assert.ok(plan.theaters.eu && plan.theaters.cf);
  assert.ok(Number.isFinite(plan.theaters.eu.arriving));
  assert.ok(plan.theaters.eu.arriving<=land(g,'britannia').reduce((v,u)=>v+E.unitStrength(u),0));
  const initial={...plan.wings};
  for(let turn=2;turn<=7;turn++){
    g.turn=turn;
    const before={...g.ai.britannia.wings};
    const next=E.aiPlan(g,'britannia');
    const changes=Object.keys(next.wings).filter(id=>next.wings[id]!==before[id]);
    assert.ok(changes.length<=1,'one transfer maximum per turn');
    if(changes.length) assert.ok(turn>=5,'no premature reassignment');
    assert.ok(next.theaters.eu && next.theaters.cf);
  }
  assert.ok(Object.keys(initial).every(id=>g.ai.britannia.wings[id]));
  assert.doesNotThrow(()=>JSON.stringify(g.ai.britannia),'wing decisions remain save-safe');
});

test('Mobile city response dispatches nearby field formations and releases them after danger',()=>{
  const g=division.create('britannia','normal',987);
  for(const u of g.units)if(u.side!=='britannia')u.hp=0;
  const initial=E.aiPlan(g,'britannia');
  const trials=g.stations.filter(s=>s.owner==='britannia').flatMap(city=>
    ['eu','cf'].map(rival=>({city,rival,
      defenders:land(g,'britannia').filter(u=>initial.wings[u.id]===rival&&E.distance(u,city,g)<=7),
      spawn:E.adjacent(g,city).find(p=>p.terrain!=='sea'&&
        !E.TERRAIN[p.terrain]?.blocked&&!E.unitAt(g,p))})))
    .filter(p=>p.defenders.length>=2&&p.spawn)
    .sort((a,b)=>b.defenders.length-a.defenders.length);
  assert.ok(trials.length);
  const {city,rival,spawn}=trials[0];
  const hostile=E.newUnit(g,E.typeFor(rival,'medium',g),rival,spawn.c,spawn.r);
  g.turn=2;
  const defend=E.aiPlan(g,'britannia');
  const intercepted=Object.entries(defend.guards).filter(([,p])=>p.id===city.id);
  assert.ok(intercepted.length>0&&intercepted.length<=3);
  for(const [id,post] of intercepted){
    assert.equal(post.response,true);
    assert.equal(defend.wings[id],rival,'no transfer to another strategic front');
    assert.equal(defend.assign[id],undefined,'temporarily paused offensive');
    assert.ok(E.distance(g.units.find(u=>u.id===Number(id)),city,g)<=8);
  }
  hostile.hp=0;g.turn=3;
  const resumed=E.aiPlan(g,'britannia');
  assert.deepEqual(resumed.guards,{});
  for(const [id] of intercepted){
    assert.equal(resumed.wings[id],rival);
    assert.ok(resumed.assign[id],'return to existing offensive theater');
    assert.equal(resumed.byId[resumed.assign[id]].anchor.owner,rival);
  }
});

test('European and Invasion scenarios choose doctrines; Campaign retains scripted planner',()=>{
  const eu=europe.create('eu','normal',71);
  assert.equal(E.aiPlan(eu,'eu').doctrine,'europe');
  assert.ok(E.aiPlan(eu,'eu').localDefense);
  const invasion=japan.create('britannia','normal',71);
  const opening=E.aiPlan(invasion,'britannia');
  assert.equal(opening.doctrine,'invasion');
  assert.equal(opening.localDefense?.dispatched,0);
  invasion.turn=10;
  assert.equal(japan.onTurn(invasion),true,'story alliance ends at the scenario hook');
  const postCollapse=E.aiPlan(invasion,'britannia');
  assert.equal(postCollapse.doctrine,'invasion');
  assert.ok(postCollapse.localDefense,'defensive response activated after alliance change');
  const divisionHard=division.create('britannia','hard',71);
  assert.equal(E.aiPlan(divisionHard,'britannia').doctrine,'division');
});

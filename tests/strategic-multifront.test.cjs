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
  const g=division.create('britannia','hard',412);
  const plan=E.aiPlan(g,'britannia');
  assert.equal(plan.doctrine,'division');
  const wings=Object.values(plan.wings);
  assert.equal(wings.length,land(g,'britannia').length);
  assert.equal(wings.filter(w=>w==='eu').length,Math.ceil(wings.length/2));
  assert.equal(wings.filter(w=>w==='cf').length,Math.floor(wings.length/2));
  assert.ok(Object.values(plan.guards).every(p=>!p.response),'no temporary city responders');
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

test('Adjacent enemies never divert scenario theater units into mobile city guards',()=>{
  const g=division.create('britannia','hard',987);
  for(const u of g.units)if(u.side!=='britannia')u.hp=0;
  const opening=E.aiPlan(g,'britannia');
  const site=g.stations.filter(s=>s.owner==='britannia')
    .map(city=>({city,spawn:E.adjacent(g,city).find(p=>p.terrain!=='sea'&&
      !E.TERRAIN[p.terrain]?.blocked&&!E.unitAt(g,p))}))
    .find(({city,spawn})=>spawn&&land(g,'britannia').some(u=>E.distance(u,city,g)<=8));
  assert.ok(site,'a city with an adjacent enemy spawn must exist');
  const hostile=E.newUnit(g,E.typeFor('eu','medium',g),'eu',site.spawn.c,site.spawn.r);
  g.turn=2;
  const threatened=E.aiPlan(g,'britannia');
  assert.deepEqual(threatened.guards,{},'hard scenario does not dispatch mobile guards');
  assert.equal(threatened.localDefense,undefined);
  assert.equal(g.ai.britannia.localResponses,undefined);
  assert.ok(Object.values(threatened.wings).length>0,'theater assignments remain active');
  hostile.hp=0;
  g.turn=3;
  const resumed=E.aiPlan(g,'britannia');
  assert.deepEqual(resumed.guards,{});
  assert.ok(Object.values(resumed.assign).some(Boolean),'offensive orders remain');
});

test('European and Invasion scenarios choose doctrines; Campaign retains scripted planner',()=>{
  const eu=europe.create('eu','normal',71);
  assert.equal(E.aiPlan(eu,'eu').doctrine,'europe');
  assert.equal(E.aiPlan(eu,'eu').localDefense,undefined);
  assert.ok(Object.values(E.aiPlan(eu,'eu').guards).every(p=>!p.response));
  const euroBritannia=europe.create('eb','normal',72);
  assert.equal(E.aiPlan(euroBritannia,'eb').localDefense,undefined);
  const invasion=japan.create('britannia','normal',71);
  const opening=E.aiPlan(invasion,'britannia');
  assert.equal(opening.doctrine,'invasion');
  assert.equal(opening.localDefense,undefined);
  invasion.turn=10;
  assert.equal(japan.onTurn(invasion),true,'story alliance ends at the scenario hook');
  const postCollapse=E.aiPlan(invasion,'britannia');
  assert.equal(postCollapse.doctrine,'invasion');
  assert.equal(postCollapse.localDefense,undefined,'no responses after alliance change');
  assert.ok(Object.values(postCollapse.guards).every(p=>!p.response));
  const divisionHard=division.create('britannia','hard',71);
  assert.equal(E.aiPlan(divisionHard,'britannia').doctrine,'division');
  assert.equal(E.aiPlan(divisionHard,'britannia').localDefense,undefined);
  const divisionNormal=division.create('britannia','normal',71);
  const ordinaryGuards=Object.values(E.aiPlan(divisionNormal,'britannia').guards);
  assert.ok(ordinaryGuards.length>0,'preserve Normal Division Britannia local garrisons');
  assert.ok(ordinaryGuards.every(p=>!p.response),'garrisons are permanent, not responders');
});

test('Prior mobile response data is retired without disabling scenario recovery',()=>{
  const g=division.create('britannia','hard',987);
  for(const u of g.units)if(u.side!=='britannia')u.hp=0;
  const officers=land(g,'britannia').filter(u=>u.cmd);
  assert.ok(officers.length);
  for(const u of officers)u.hp=Math.max(1,Math.floor(E.maxHP(u)*0.2));
  (g.ai.britannia ||= {}).localResponses={123:{city:1,turn:1}};
  g.turn=2;
  const plan=E.aiPlan(g,'britannia');
  assert.ok(plan.recoveries?.size>0,'commander recovery remains enabled');
  assert.equal(g.ai.britannia.localResponses,undefined,'outdated saved state removed');
  assert.ok(Object.values(plan.guards).every(p=>!p.response));
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {frontsObserver}=require('../tournament_fronts.cjs');
test('front inactivity is tracked separately and an attack resets its quiet interval',()=>{
  const f=frontsObserver(3),u={id:1,side:'a'},v={id:2,side:'a'};
  const g={turn:1,ai:{a:{assignments:{1:{front:'east'},2:{front:'west'}}}}};
  const initial=JSON.stringify(g);
  f.turn(g,[u,v]);assert.equal(JSON.stringify(g),initial);
  g.turn=2;f.activity(g,u,'attack');f.turn(g,[u,v]);
  g.turn=3;f.turn(g,[u,v]);assert.equal(f.intervals.length,1);assert.equal(f.intervals[0].front,'west');
  g.turn=4;f.turn(g,[u,v]);g.turn=5;f.turn(g,[u,v]);assert.ok(f.intervals.some(r=>r.front==='east'));
  g.turn=6;f.activity(g,u,'attack');f.turn(g,[u,v]);
  assert.equal(f.timeline.at(-1).fronts.find(r=>r.id==='east').quietTurns,0);
});
test('carrier units without assignments are not invented as fronts; operation names work',()=>{
  const f=frontsObserver(2),g={turn:1,ai:{a:{operations:{2:'western-axis'}}}};
  f.turn(g,[{id:1,side:'a'},{id:2,side:'a'}]);
  assert.deepEqual(f.timeline[0].fronts.map(r=>r.id),['western-axis']);
  f.remember(g,[{id:2,side:'a'}]);delete g.ai.a.operations[2];g.turn=2;
  f.turn(g,[{id:2,side:'a'}]);assert.equal(f.timeline.at(-1).fronts.length,0,'removed assignments are not retained as live fronts');
});

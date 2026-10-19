#!/usr/bin/env node
'use strict';
// Real-engine regression for Leila's two-hex passive support and once-per-turn
// mass full-movement reset, including Leila herself and postattack movement.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const dist = E.internal.dist;
const C = E.COMMANDERS.leila;
assert.equal(Object.hasOwn(C, 'stats'), false, 'No old personal combat bonuses');
assert.deepEqual(C.fx, {steadfastCommand:{range:2,taken:.9,moraleFloor:0}});
assert.equal(C.action.kind,'withdraw');
assert.equal(C.action.cooldown,0,'The active ability has no multi-turn cooldown');
assert.equal(Object.hasOwn(C.fx,'aura'),false,'Old +12% damage aura is removed');

const type=(side,branch)=>Object.keys(E.TYPES).find(id=>{
  const t=E.TYPES[id];
  return t.side===side&&t.branch===branch&&!t.naval&&!t.elite&&t.min===1&&t.max===1;
});
const euArt=type('eu','Artillery'),euInf=type('eu','Infantry'),brInf=type('britannia','Infantry');
assert.ok(euArt&&euInf&&brInf,'EU artillery/infantry and Britannian infantry exist');
function setup(){
  const g=E.createGame('eu','normal','conquest',20261019,'world');
  g.units=[];g.phase='eu';
  const clear=p=>p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length>=5&&
    E.within(g,p,3).filter(clear).length>=28);
  assert.ok(center,'Need a large open area');
  const place=radius=>E.within(g,center,radius).find(p=>clear(p)&&
    dist(g,center,p)===radius&&!E.internal.unitAt(g,p));
  const leila=E.newUnit(g,euArt,'eu',center.c,center.r,1,'leila');
  const p1=place(1),p2=place(2),p3=place(3);
  assert.ok(p1&&p2&&p3,'Need clear positions in all three rings');
  const near=E.newUnit(g,euInf,'eu',p1.c,p1.r);
  const edge=E.newUnit(g,euInf,'eu',p2.c,p2.r);
  const outside=E.newUnit(g,euInf,'eu',p3.c,p3.r);
  return {g,leila,near,edge,outside,place,clear};
}
function approx(actual,expected,tolerance=.07){
  assert.ok(expected>0&&Math.abs(actual/expected-1)<tolerance,
    'Expected '+actual+' approximately '+expected);
}

// Passive protection includes Leila herself and exactly the second hex ring;
// units in the third ring are not protected.
{
  const b=setup();
  assert.equal(E.internal.moraleFloor(b.g,b.leila),0);
  assert.equal(E.internal.moraleFloor(b.g,b.near),0);
  assert.equal(E.internal.moraleFloor(b.g,b.edge),0);
  assert.equal(E.internal.moraleFloor(b.g,b.outside),-3);
  b.near.morale=-2;b.edge.morale=-3;b.leila.morale=-1;
  E.beginTurn(b.g,'eu',false);
  for(const v of [b.leila,b.near,b.edge])
    assert.equal(v.morale,0,'Steady floor normalizes existing negative morale');
  E.beginTurn(b.g,'eu',false);
  for(const v of [b.leila,b.near,b.edge])
    assert.equal(v.morale,0,'Leila does not raise Steady morale to High');
}

// Defense aura is nonstacking and confers no generic +8% offensive aura.
{
  const b=setup();
  const p=E.adjacent(b.g,b.leila).find(p=>b.clear(p)&&
    dist(b.g,p,b.near)===1&&!E.internal.unitAt(b.g,p));
  assert.ok(p,'Need a common neighbor for the enemy');
  const enemy=E.newUnit(b.g,brInf,'britannia',p.c,p.r);
  b.g.phase='britannia';
  const guarded=E.preview(b.g,enemy.id,b.leila.c,b.leila.r);
  assert.ok(guarded&&guarded.unit>0,'Enemy can attack Leila');
  b.leila.expSilenced=true;
  const unguarded=E.preview(b.g,enemy.id,b.leila.c,b.leila.r);
  delete b.leila.expSilenced;
  approx(guarded.unit,unguarded.unit*.9,.09);
  // Compare an ally's attack against the same target with Leila present
  // versus silenced. Her old +12% and default +8% damage auras are gone.
  b.g.phase='eu';
  const shot=E.preview(b.g,b.near.id,enemy.c,enemy.r);
  assert.ok(shot&&shot.unit>0,'Nearby infantry can fire on enemy');
  b.leila.expSilenced=true;
  const silenced=E.preview(b.g,b.near.id,enemy.c,enemy.r);
  delete b.leila.expSilenced;
  assert.equal(shot.unit,silenced.unit,'Leila gives no offensive damage bonus');
}

// Once per turn, the clickable command restores full movement for Leila
// and every nearby unit that has already moved or fired, not units in ring 3.
{
  const b=setup();
  b.leila.moved=true;b.leila.attacked=true;
  b.near.moved=true;b.near.attacked=true;
  b.edge.moved=true;b.edge.attacked=false;
  b.outside.moved=true;b.outside.attacked=true;
  b.leila.feintCD=2; // A legacy save may contain the old 3-turn cooldown.
  assert.equal(E.feintReason(b.g,b.leila),null,
    'New once-per-turn action ignores legacy multi-turn cooldown');
  const result=E.feint(b.g,b.leila.id);
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.affected,3,'Leila plus both nearby allies are refreshed');
  for(const v of [b.leila,b.near,b.edge]){
    assert.equal(v.moved,false,'Full movement refreshed');
    assert.equal(v.withdrawMove,true,'Postattack movement allowed');
    assert.equal(v.skillReposition,0,'Not a short reposition');
  }
  assert.equal(b.leila.attacked,true,'No additional Leila attack');
  assert.equal(b.near.attacked,true,'No additional allied attack');
  assert.equal(b.outside.moved,true,'Third-ring unit is unaffected');
  assert.ok(E.reachable(b.g,b.leila).size>0,'Leila can move after attacking');
  assert.ok(E.reachable(b.g,b.near).size>0,'Nearby ally can move after attacking');
  const p=[...E.reachable(b.g,b.leila).keys()].map(k=>{
    const [c,r]=k.split(',').map(Number);return E.tile(b.g,c,r);
  }).find(p=>p&&p.terrain==='plains'&&!E.internal.stationAt(b.g,p));
  assert.ok(p,'Legal destination exists for Leila');
  const move=E.move(b.g,b.leila.id,p.c,p.r);
  assert.equal(move.ok,true,move.reason);
  assert.equal(b.leila.attacked,true,'Movement does not restore attack');
  assert.equal(b.leila.withdrawMove,false,'Move consumes the command');
  assert.equal(E.reachable(b.g,b.leila).size,0,'Cannot move repeatedly');
  const repeat=E.feint(b.g,b.leila.id);
  assert.equal(repeat.ok,false,'Cannot use command twice in one turn');
  assert.match(repeat.reason,/Already used this turn/);
  b.g.turn++;
  b.leila.moved=true;
  assert.equal(E.feintReason(b.g,b.leila),null,'Ability available next turn');
}

// Leila approaching a demoralized formation immediately restores Steady.
{
  const b=setup();
  b.outside.morale=-2;
  const choices=[...E.reachable(b.g,b.leila).keys()].map(k=>{
    const [c,r]=k.split(',').map(Number);return E.tile(b.g,c,r);
  }).filter(p=>p&&p.terrain==='plains'&&dist(b.g,p,b.outside)<=2);
  assert.ok(choices.length,'Leila can approach a third-ring unit');
  const p=choices[0];
  assert.equal(E.move(b.g,b.leila.id,p.c,p.r).ok,true);
  assert.equal(b.outside.morale,0,'Leila immediately stabilizes nearby low morale');
}
console.log('Leila synchronized movement, damage resistance and Steady morale: PASS');

#!/usr/bin/env node
'use strict';
// Emperor Lelouch (reworked): Unbreakable Imperial Army turn-start passive, The Mask Falls (player only),
// All Hail Lelouch kill heals, and the Death of the Emperor rally.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const C = E.COMMANDERS.lelouch;
const dist = E.internal.dist;
assert.equal(C.skill, 'Unbreakable Imperial Army / All Hail Lelouch / Zero Requiem');
assert.equal(C.action.name, 'The Mask Falls');
assert.equal(C.action.kind, 'maskFalls');
assert.equal(C.action.cooldown, 0);
assert.deepEqual(C.fx, {});
assert.equal(Object.hasOwn(C, 'stats'), false);
const type = (side, branch) => Object.keys(E.TYPES).find(id => {
  const t = E.TYPES[id];
  return t.side === side && t.branch === branch && !t.naval && !t.elite && t.min === 1 && t.max === 1;
});
const brArmor = type('britannia','Armor'), brInf = type('britannia','Infantry'), euInf = type('eu','Infantry');
assert.ok(brArmor && brInf && euInf);
function setup() {
  const g = E.createGame('britannia','normal','conquest',20261019,'world');
  g.units=[];g.phase='britannia';
  const clear=p=>p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length>=5&&E.within(g,p,4).filter(clear).length>=45);
  assert.ok(center,'Need an open area');
  const pick=(radius,predicate=()=>true)=>E.within(g,center,radius).find(p=>clear(p)&&dist(g,center,p)===radius&&!E.internal.unitAt(g,p)&&predicate(p));
  const emperor=E.newUnit(g,brArmor,'britannia',center.c,center.r,1,'lelouch');
  const p1=pick(1);assert.ok(p1);
  const ally=E.newUnit(g,brInf,'britannia',p1.c,p1.r);
  const p3=pick(3);assert.ok(p3);
  const third=E.newUnit(g,brInf,'britannia',p3.c,p3.r);
  const p4=pick(4);assert.ok(p4);
  const outside=E.newUnit(g,brInf,'britannia',p4.c,p4.r);
  const enemyP=E.adjacent(g,ally).find(p=>clear(p)&&!E.internal.unitAt(g,p)&&dist(g,center,p)===2);assert.ok(enemyP);
  const enemy=E.newUnit(g,euInf,'eu',enemyP.c,enemyP.r);
  return {g,emperor,ally,third,outside,enemy};
}
{
  // Unbreakable Imperial Army: at the start of Britannia's turn, allies within 2 hexes get High morale,
  // 25% less incoming damage and +2 movement until their next turn; formations farther away get nothing.
  const b=setup();
  const moveBefore=E.movement(b.g,b.ally), thirdBefore=E.movement(b.g,b.third);
  const exposed=E.preview(b.g,b.enemy.id,b.ally.c,b.ally.r);
  b.ally.morale=-2;b.third.morale=-1;
  b.g.turn++;
  E.beginTurn(b.g,'britannia',false);
  for(const v of [b.emperor,b.ally]){
    assert.equal(v.morale,1,'High morale within 2 hexes');
    assert.ok(v.expImperialCommand,'Imperial Army protection within 2 hexes');
  }
  assert.equal(b.third.expImperialCommand,undefined,'Three hexes away is outside the passive');
  assert.equal(E.movement(b.g,b.ally),moveBefore+2,'Movement increases by 2');
  assert.equal(E.movement(b.g,b.third),thirdBefore);
  b.g.phase='eu';
  const shielded=E.preview(b.g,b.enemy.id,b.ally.c,b.ally.r);
  assert.ok(exposed.unit>0&&shielded.unit>0);
  assert.ok(Math.abs(shielded.unit/exposed.unit-.75)<.09,'25% less incoming damage');
  b.g.phase='britannia';
  assert.equal(E.internal.actionTargets(b.g,b.emperor).length>0,true,'The Mask Falls has allies in range');
}
{
  // The Mask Falls is player only: the AI is refused, the player pays 80% maximum HP (never below 1), spends
  // Lelouch's actions, refreshes allies within 3 hexes and grants them +50% next attack and 40% damage reduction.
  const b=setup();
  b.g.player='eu';
  assert.equal(E.feint(b.g,b.emperor.id).ok,false,'The AI cannot use The Mask Falls');
  b.g.player='britannia';
  b.ally.moved=b.ally.attacked=true;b.third.moved=true;
  const before=E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  const r=E.feint(b.g,b.emperor.id);
  assert.equal(r.ok,true,r.reason);
  assert.equal(r.affected,3,'Lelouch and allies within 3 hexes');
  assert.equal(b.emperor.hp,E.maxHP(b.emperor)-Math.round(E.maxHP(b.emperor)*0.8));
  assert.ok(b.emperor.moved&&b.emperor.attacked,'Lelouch spends his actions');
  assert.ok(!b.ally.moved&&!b.ally.attacked&&!b.third.moved,'Allies are refreshed');
  assert.equal(b.outside.expMaskFalls,undefined,'Four hexes away is outside');
  const after=E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  assert.ok(Math.abs(after.unit/before.unit-1.5)<.12,'+50% next-attack damage');
  b.g.phase='eu';
  const guarded=E.preview(b.g,b.enemy.id,b.ally.c,b.ally.r);
  delete b.ally.expMaskFalls;
  const open=E.preview(b.g,b.enemy.id,b.ally.c,b.ally.r);
  assert.ok(Math.abs(guarded.unit/open.unit-.6)<.09,'40% less incoming damage');
  b.g.phase='britannia';
  b.emperor.hp=1;b.emperor.feintUsedTurn=null;
  assert.equal(E.feint(b.g,b.emperor.id).ok,true);
  assert.equal(b.emperor.hp,1,'The sacrifice never kills Lelouch');
}
{
  // All Hail Lelouch: an allied kill within 3 hexes of Lelouch heals nearby allies 5% maximum HP.
  const b=setup();
  b.third.hp=Math.round(E.maxHP(b.third)*0.5);
  const hp=b.third.hp;
  b.enemy.hp=1;
  const a=E.attack(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  assert.equal(a.ok,true,a.reason);
  assert.ok(b.enemy.hp<=0,'Enemy destroyed');
  assert.equal(b.third.hp,hp+Math.max(1,Math.round(E.maxHP(b.third)*0.05)),'Ally within 3 hexes heals 5%');
}
{
  // Death of the Emperor: when Lelouch falls, allies within 3 hexes rally for two turns with High morale and
  // refreshed actions.
  const b=setup();
  b.g.phase='eu';
  b.ally.moved=b.ally.attacked=true;b.ally.morale=-1;
  b.emperor.hp=1;
  const spot=E.adjacent(b.g,b.emperor).find(p=>!E.internal.unitAt(b.g,p)&&!E.isSea(p)&&!E.internal.stationAt(b.g,p));
  const killer=E.newUnit(b.g,euInf,'eu',spot.c,spot.r);
  const a=E.attack(b.g,killer.id,b.emperor.c,b.emperor.r);
  assert.equal(a.ok,true,a.reason);
  assert.ok(b.emperor.hp<=0,'Lelouch falls');
  assert.deepEqual(b.ally.expDeathEmperor,{side:'britannia',turns:2},'Rally lasts two turns');
  assert.equal(b.ally.morale,1);
  assert.ok(!b.ally.moved&&!b.ally.attacked,'Rallied ally is refreshed');
  assert.equal(b.outside.expDeathEmperor,undefined,'Four hexes away does not rally');
}
console.log('Emperor Lelouch Imperial Army, Mask Falls, All Hail Lelouch and Death of the Emperor: PASS');

#!/usr/bin/env node
'use strict';
// Emperor Lelouch: once-per-turn mass command, 2-hex passive crit support,
// damage resistance, movement, expiry, and removal of the old damage aura.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const C = E.COMMANDERS.lelouch;
const dist = E.internal.dist;
assert.equal(C.skill, 'Imperial Command');
assert.equal(C.action.name, 'Imperial Command');
assert.equal(C.action.kind, 'imperial');
assert.equal(C.action.cooldown, 0);
assert.deepEqual(C.fx, {supremeCommander:{range:2,crit:.1}});
assert.equal(Object.hasOwn(C, 'stats'), false);
const type = (side, branch) => Object.keys(E.TYPES).find(id => {
  const t = E.TYPES[id];
  return t.side === side && t.branch === branch && !t.naval && !t.elite && t.min === 1 && t.max === 1;
});
const brArmor = type('britannia','Armor'), brInf = type('britannia','Infantry'), bkInf = type('bk','Infantry');
assert.ok(brArmor && brInf && bkInf);
function setup() {
  const g = E.createGame('britannia','normal','conquest',20261019,'world');
  g.units=[];g.phase='britannia';
  const clear=p=>p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length>=5&&E.within(g,p,3).filter(clear).length>=28);
  assert.ok(center,'Need an open area');
  const pick=(radius,predicate=()=>true)=>E.within(g,center,radius).find(p=>clear(p)&&dist(g,center,p)===radius&&!E.internal.unitAt(g,p)&&predicate(p));
  const emperor=E.newUnit(g,brArmor,'britannia',center.c,center.r,1,'lelouch');
  const p1=pick(1);assert.ok(p1);
  const ally=E.newUnit(g,brInf,'britannia',p1.c,p1.r);
  const p2=pick(2,p=>dist(g,p,ally)===1);assert.ok(p2);
  const edge=E.newUnit(g,brInf,'britannia',p2.c,p2.r);
  const p3=pick(3);assert.ok(p3);
  const outside=E.newUnit(g,brInf,'britannia',p3.c,p3.r);
  const enemyP=E.adjacent(g,ally).find(p=>clear(p)&&!E.internal.unitAt(g,p));assert.ok(enemyP);
  const enemy=E.newUnit(g,bkInf,'bk',enemyP.c,enemyP.r);
  return {g,emperor,ally,edge,outside,enemy};
}
{
  const b=setup();
  const withAura=E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  assert.ok(withAura&&withAura.unit>0,'Ally can attack');
  b.emperor.expSilenced=true;
  const without=E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  delete b.emperor.expSilenced;
  assert.ok(Math.abs(withAura.crit-without.crit-.1)<1e-8,'Passive adds 10 critical points');
  assert.equal(withAura.unit,without.unit,'Old damage aura is removed');
  const moveBefore=E.movement(b.g,b.ally), outsideBefore=E.movement(b.g,b.outside);
  b.ally.morale=-2;b.edge.morale=-1;b.emperor.morale=0;b.outside.morale=-2;
  b.emperor.feintCD=3;
  assert.equal(E.feintReason(b.g,b.emperor),null,'No legacy multi-turn cooldown');
  const result=E.feint(b.g,b.emperor.id);
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.affected,3);
  for(const v of [b.emperor,b.ally,b.edge]){
    assert.equal(v.morale,1,'All recipients gain maximum morale');
    assert.ok(v.expImperialCommand,'All recipients are protected');
  }
  assert.equal(b.outside.morale,-2,'Third ring receives no morale bonus');
  assert.equal(b.outside.expImperialCommand,undefined);
  assert.equal(E.movement(b.g,b.ally),moveBefore+2,'Movement increases by 2');
  assert.equal(E.movement(b.g,b.outside),outsideBefore);
  assert.equal(E.feint(b.g,b.emperor.id).ok,false,'Only once per turn');
  const protectedPreview=E.preview(b.g,b.enemy.id,b.ally.c,b.ally.r);
  assert.ok(protectedPreview&&protectedPreview.unit>0);
  delete b.ally.expImperialCommand;
  const unprotectedPreview=E.preview(b.g,b.enemy.id,b.ally.c,b.ally.r);
  assert.ok(unprotectedPreview&&unprotectedPreview.unit>0);
  assert.ok(Math.abs(protectedPreview.unit/unprotectedPreview.unit-.75)<.09,'25% less incoming damage');
  b.ally.expImperialCommand={side:'britannia',source:b.emperor.id,turn:b.g.turn};
  b.g.turn++;
  E.beginTurn(b.g,'britannia',false);
  assert.equal(b.ally.expImperialCommand,undefined,'Buff expires next friendly turn');
  assert.equal(E.movement(b.g,b.ally),moveBefore);
  assert.equal(E.feintReason(b.g,b.emperor),null,'Ready again next turn');
}
console.log('Emperor Lelouch Imperial Command and Supreme Commander: PASS');

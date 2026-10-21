#!/usr/bin/env node
'use strict';
// Real-engine tests for C.C.'s Protection, one-use charge and Code Bearer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../dist/engine.js');
const C = E.COMMANDERS.cc;
assert.equal(C.skill,"C.C.'s Protection");
assert.equal(C.action.name,"C.C.'s Protection");
assert.equal(C.action.kind,'protection');
assert.equal(C.action.cooldown,0);
assert.deepEqual(C.fx,{floor:-2,regen:.05,undying:true});
const dist = E.internal.dist;
const type = (side,branch) => Object.keys(E.TYPES).find(k => {
  const t = E.TYPES[k];
  return t.side===side&&t.branch===branch&&!t.naval&&!t.elite&&t.min===1&&t.max===1;
});
const bkArmor=type('bk','Armor') || type('bk','Infantry'),bkInf=type('bk','Infantry'),brInf=type('britannia','Infantry');
assert.ok(bkArmor&&bkInf&&brInf);
function setup(){
  const g=E.createGame('bk','normal','conquest',20261019,'world');
  g.units=[];g.phase='bk';
  const clear=p=>p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length>=5&&E.within(g,p,3).filter(clear).length>=28);
  assert.ok(center,'Need open area');
  const pick=(radius,predicate=()=>true)=>E.within(g,center,radius).find(p=>clear(p)&&dist(g,center,p)===radius&&!E.internal.unitAt(g,p)&&predicate(p));
  const cc=E.newUnit(g,bkArmor,'bk',center.c,center.r,1,'cc');
  const nearP=pick(1);assert.ok(nearP);
  const near=E.newUnit(g,bkInf,'bk',nearP.c,nearP.r,3);
  const edgeP=pick(2,p=>dist(g,p,near)===1);assert.ok(edgeP);
  const edge=E.newUnit(g,bkInf,'bk',edgeP.c,edgeP.r);
  const farP=pick(3);assert.ok(farP);
  const far=E.newUnit(g,bkInf,'bk',farP.c,farP.r);
  const enemyP=E.adjacent(g,near).find(p=>clear(p)&&!E.internal.unitAt(g,p));assert.ok(enemyP);
  const enemy=E.newUnit(g,brInf,'britannia',enemyP.c,enemyP.r);
  return {g,cc,near,edge,far,enemy};
}
{
  const b=setup();
  assert.equal(E.actionTargets(b.g,b.cc).some(v=>v.id===b.cc.id),false,'Cannot target C.C. herself');
  assert.equal(E.actionTargets(b.g,b.cc).some(v=>v.id===b.edge.id),true,'Second ring eligible');
  assert.equal(E.actionTargets(b.g,b.cc).some(v=>v.id===b.far.id),false,'Third ring excluded');
  const hp=E.maxHP(b.near),lost=Math.round(hp*.5);
  b.near.hp=hp-lost;b.near.morale=-2;
  b.edge.morale=1;
  const outside=E.feint(b.g,b.cc.id,b.far.id);
  assert.equal(outside.ok,false,'Invalid target does not consume action');
  assert.equal(b.cc.feintUsedTurn,undefined);
  b.cc.feintCD=2; // Old save's cooldown must not block this new one-turn action.
  assert.equal(E.feintReason(b.g,b.cc),null);
  const r=E.feint(b.g,b.cc.id,b.near.id);
  assert.equal(r.ok,true,r.reason);
  assert.equal(r.target,b.near.id);
  assert.equal(b.near.hp,Math.min(hp,hp-lost+Math.round(hp*.15)));
  assert.equal(b.near.morale,0);
  assert.ok(b.near.expCCProtection);
  assert.equal(E.feint(b.g,b.cc.id,b.edge.id).ok,false,'Cannot use twice in one turn');
  b.g.turn++;
  assert.equal(E.feintReason(b.g,b.cc),null,'Available following turn');
  assert.equal(E.feint(b.g,b.cc.id,b.edge.id).ok,true);
  assert.equal(b.edge.morale,1,'High morale is never reduced');
  assert.ok(b.edge.expCCProtection);
}
{
  const b=setup();
  assert.equal(E.feint(b.g,b.cc.id,b.near.id).ok,true);
  b.g.phase='britannia';
  const guarded=E.preview(b.g,b.enemy.id,b.near.c,b.near.r);
  assert.ok(guarded && guarded.unit>0);
  delete b.near.expCCProtection;
  const plain=E.preview(b.g,b.enemy.id,b.near.c,b.near.r);
  assert.ok(plain && plain.unit>0);
  assert.ok(Math.abs(guarded.unit/plain.unit-.7)<.09,'Shield absorbs 30% of attack damage');
  b.near.expCCProtection={side:'bk',source:b.cc.id};
  assert.ok(E.preview(b.g,b.enemy.id,b.near.c,b.near.r));
  assert.ok(b.near.expCCProtection,'Preview does not consume the shield');
  const hit=E.attack(b.g,b.enemy.id,b.near.c,b.near.r);
  assert.equal(hit.ok,true,hit.reason);
  assert.equal(b.near.expCCProtection,undefined,'Actual hit consumes the shield');
  assert.ok(E.preview(b.g,b.enemy.id,b.near.c,b.near.r)?.unit !== guarded.unit ||
    !b.near.expCCProtection,'Subsequent combat has no shield');
}
{
  const b=setup();
  b.cc.hp=0;E.kill(b.g,b.cc,b.enemy);
  assert.equal(b.cc.hp,1,'First lethal attack survives at 1 HP');
  assert.equal(b.cc.undyingUsedTurn,b.g.turn);
  b.cc.hp=0;E.kill(b.g,b.cc,b.enemy);
  assert.equal(b.cc.hp,0,'A second lethal attack in same turn can kill C.C.');
}
{
  const b=setup();
  b.cc.hp=0;E.kill(b.g,b.cc,b.enemy);
  b.g.turn++;
  b.cc.hp=0;E.kill(b.g,b.cc,b.enemy);
  assert.equal(b.cc.hp,1,'Immortality renews on the next global turn');
  b.cc.hp=Math.max(1,Math.round(E.maxHP(b.cc)*.5));b.cc.morale=-3;
  assert.equal(E.moraleFloor(b.g,b.cc),-2,'Retain existing morale floor');
  b.g.phase='bk';E.beginTurn(b.g,'bk',false);
  assert.ok(b.cc.hp>Math.round(E.maxHP(b.cc)*.5),'Retain 5% start-of-turn regeneration');
}
const ui=fs.readFileSync(require.resolve('../dist/ui/input.js'),'utf8');
// Every active commander now shares the map-picker dispatch; target metadata
// decides whether it needs a selection. Behavior is covered by ability_targeting_smoke.
assert.match(ui,/case 'feint':[\s\S]*?commandDialog\(u\)/,'Player action opens target picker');
console.log("C.C.'s Protection and per-turn Code Bearer: PASS");

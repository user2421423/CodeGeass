#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const C=E.COMMANDERS;
assert.equal(Object.keys(C).length,118,'The 118-commander roster retains both Grand Masters');
for(const id of ['gaudefroy','raymond']){
  assert.equal(C[id].side,'eb');
  assert.equal(C[id].role,'Armor');
  assert.ok(E.RATINGS[id],'Commander must have star ratings');
}
assert.equal(C.gaudefroy.fx.unrestrictedCounter,1.5);
assert.equal(C.gaudefroy.fx.fortressRegeneration,1.5);
assert.equal(C.gaudefroy.fx.fortressArmor,.3);
assert.equal(C.gaudefroy.fx.regen,.02);
assert.equal(C.raymond.action.kind,'grandMastersAssault');
assert.equal(C.raymond.action.cooldown,5);
const brScout=E.typeFor('britannia','scout'),
      brInf=E.typeFor('britannia','scout'),
      euInf=E.typeFor('eu','scout'),
      euLong=E.typeFor('eu','rocket');
assert.ok(brScout&&brInf&&euInf&&euLong,'Standard units must exist');
function setup(){
  const g=E.createGame('britannia','normal','conquest',20261021,'world');
  g.units=[];g.phase='britannia';
  const clear=p=>p&&p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const origin=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length===6&&
    E.within(g,p,3).filter(clear).length>=30);
  assert.ok(origin,'An open battlefield is required');
  return {g,origin,clear};
}
// Any legal incoming direct attack receives counterfire regardless of range.
{
  const {g,origin,clear}=setup();
  const outer=E.within(g,origin,2).find(p=>clear(p)&&E.internal.dist(g,p,origin)===2);
  assert.ok(outer);
  const guard=E.newUnit(g,brInf,'britannia',origin.c,origin.r,1,'gaudefroy');
  const artillery=E.newUnit(g,euLong,'eu',outer.c,outer.r,1);
  const far=E.preview(g,artillery.id,guard.c,guard.r);
  assert.ok(far&&far.counterAllowed&&far.counter>0,'Gaudefroy returns fire at 2 hexes');
  guard.expSilenced=true;
  const normal=E.preview(g,artillery.id,guard.c,guard.r);
  assert.ok(!normal.counterAllowed,'Ordinary short-range infantry cannot retaliate at range 2');
}
// City recovery ignores recent attack's half rate and Gaudefroy regains 2% HP.
{
  const {g}=setup();
  const city=g.stations.find(s=>s.owner==='britannia'&&s.maxShield>0&&
    !E.isSea(E.internal.tile(g,s.c,s.r)));
  assert.ok(city,'An owned city with shields is required');
  const guard=E.newUnit(g,brInf,'britannia',city.c,city.r,1,'gaudefroy');
  guard.hp=Math.floor(E.maxHP(guard)*.5);
  const hpBefore=guard.hp;
  city.shield=Math.floor(city.maxShield*.2);
  city.attackedSinceRegen=true;
  const before=city.shield;
  E.beginTurn(g,'britannia',false);
  assert.ok(guard.hp>=hpBefore+Math.round(E.maxHP(guard)*.02),'2% natural regeneration');
  assert.ok(city.shield-before>=Math.round(city.maxShield*.17),'50% boosted shield recovery ignores attack penalty');
}
// The coordinated attack uses only eligible ordinary ranges and leaves normal actions available.
{
  const {g,origin,clear}=setup();
  const positions=E.adjacent(g,origin).filter(clear);
  const targetPos=positions[0];
  const allyPos=positions.find(p=>E.internal.dist(g,p,targetPos)===1);
  assert.ok(allyPos,'Need a nearby supporting formation');
  const raymond=E.newUnit(g,brScout,'britannia',origin.c,origin.r,1,'raymond');
  const ally=E.newUnit(g,brInf,'britannia',allyPos.c,allyPos.r,1);
  const enemy=E.newUnit(g,euInf,'eu',targetPos.c,targetPos.r,1);
  enemy.hp=50000;
  assert.ok(E.actionTargets(g,raymond).some(u=>u.id===enemy.id));
  const shot=E.feint(g,raymond.id,enemy.id);
  assert.equal(shot.ok,true,shot.reason);
  assert.ok(shot.affected>=2,'Raymond and his ally both contribute');
  assert.ok(shot.damage>0);
  assert.equal(raymond.attacked,false);
  assert.equal(ally.attacked,false);
  assert.equal(raymond.feintCD,5);
  assert.ok(E.feintReason(g,raymond),'Cannot cast again before cooldown resets');
  // A kill by another allied formation refreshes Raymond and reduces Assault CD.
  enemy.hp=1;raymond.moved=raymond.attacked=true;raymond.feintCD=4;
  const result=E.attack(g,ally.id,enemy.c,enemy.r);
  assert.equal(result.ok,true,result.reason);
  assert.equal(enemy.hp,0);
  assert.equal(raymond.attacked,false,'Relentless Pursuit restores a full attack');
  assert.equal(raymond.moved,false,'Relentless Pursuit restores legal movement');
  assert.equal(raymond.feintCD,3,'Confirmed allied kill removes one cooldown turn');
  assert.equal(ally.attacked,true,'The killing ally spends its ordinary attack');
}
console.log('Euro Britannian Grand Masters roster, counterfire, fortress and pursuit: PASS');

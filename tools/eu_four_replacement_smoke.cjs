#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const C=E.COMMANDERS;
assert.equal(Object.keys(C).length,100,'Two new Euro Britannian Grand Masters fill the two vacated Britannian commander slots');
assert.equal(Object.values(C).filter(x=>x.side==='eu').length,22);
for(const k of ['miguel','romero','masaki','toru']){
  assert.ok(C[k],k+' recruitable');
  assert.equal(C[k].side,'eu');
  assert.ok(E.RATINGS[k],k+' has ratings');
}
for(const k of ['margaret','kate','hilda','chloe']){
  assert.equal(C[k],undefined,k+' retired');
  assert.equal(E.RATINGS[k],undefined,k+' old ratings removed');
}
assert.equal(C.miguel.action.kind,'miguelSupply');
assert.equal(C.miguel.action.cooldown,0);
for(const [id,fx] of [['romero','standFast'],['masaki','ultimateGuardian'],['toru','lastPromise']])
  assert.ok(C[id].fx[fx],id+' correct passive');

const range=(g,a,b)=>E.internal.dist(g,a,b);
const types={eu:Object.keys(E.TYPES).find(k=>E.TYPES[k].side==='eu'&&E.TYPES[k].branch==='Infantry'&&!E.TYPES[k].naval&&E.TYPES[k].min===1&&E.TYPES[k].max===1),
  enemy:Object.keys(E.TYPES).find(k=>E.TYPES[k].side==='britannia'&&E.TYPES[k].branch==='Infantry'&&!E.TYPES[k].naval&&E.TYPES[k].min===1&&E.TYPES[k].max===1)};
assert.ok(types.eu&&types.enemy);
function setup(){
  const g=E.createGame('eu','normal','conquest',20261020,'world');
  g.units=[];g.phase='eu';
  const clear=p=>p&&p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const c=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length===6&&
    E.within(g,p,3).filter(clear).length>=30);
  assert.ok(c);
  const around=E.adjacent(g,c).filter(clear);
  const spawn=(id,side,p,cmd)=>E.newUnit(g,side==='eu'?types.eu:types.enemy,side,p.c,p.r,1,cmd);
  return {g,c,around,clear,spawn};
}
{
  const b=setup();
  const miguel=b.spawn(1,'eu',b.c,'miguel');
  const enemy=b.spawn(2,'britannia',b.around[0],null);
  const before=E.movement(b.g,enemy);
  assert.equal(E.feint(b.g,miguel.id,enemy.id).ok,true);
  assert.equal(E.movement(b.g,enemy),Math.max(0,before-2));
  assert.match(E.repairReason(b.g,enemy),/supply lines/);
  assert.match(E.reinforceReason(b.g,enemy),/supply lines/);
  assert.equal(E.feint(b.g,miguel.id,enemy.id).ok,false,'Only once per turn');
  E.beginTurn(b.g,'britannia',false);
  assert.ok(enemy.expMiguelSupply,'Debuff must survive until target acts');
  E.beginTurn(b.g,'eu',false);
  assert.equal(enemy.expMiguelSupply,undefined,'Debuff must expire after enemy turn');
}
{
  const b=setup();
  const romero=b.spawn(1,'eu',b.c,'romero');
  const ally=b.spawn(2,'eu',b.around[0],null);
  const enemyPos=b.around.find(p=>range(b.g,p,ally)===1);
  const enemy=b.spawn(3,'britannia',enemyPos,null);
  const p=E.preview(b.g,enemy.id,ally.c,ally.r);
  assert.ok(p&&p.unit>0&&p.counter>0);
  ally.expRomeroMoved=true;
  const q=E.preview(b.g,enemy.id,ally.c,ally.r);
  assert.ok(p.counter>q.counter*1.4,'Full counterattack rather than 65%');
  assert.ok(q.unit>p.unit,'Stationary ally receives 25% less damage');
  ally.morale=0;ally.expRomeroMoved=false;
  E.beginTurn(b.g,'britannia',false);
  // Enemy phase: morale floor is still active before ally moves.
  E.internal.lowerMorale?.(b.g,ally,1);
  assert.ok(ally.morale>=0,'Romero prevents negative morale');
}
{
  const b=setup();
  const masaki=b.spawn(1,'eu',b.c,'masaki');
  const ally=b.spawn(2,'eu',b.around[0],'leila');
  const enemyPos=b.around.find(p=>range(b.g,p,ally)===1);
  const enemy=b.spawn(3,'britannia',enemyPos,null);
  ally.hp=1;
  b.g.phase='britannia';
  const r=E.attack(b.g,enemy.id,ally.c,ally.r);
  assert.equal(r.ok,true,r.reason);
  assert.equal(ally.hp,E.maxHP(ally),'Commander must be restored to 100% HP');
  assert.equal(masaki.hp,0,'Masaki dies in sacrifice');
  assert.equal(masaki.warCounted,true,'Masaki is a real casualty');
}
{
  const b=setup();
  const toru=b.spawn(1,'eu',b.c,'toru');
  const ally=b.spawn(2,'eu',b.around[1],null);
  const ep=b.around.find(p=>range(b.g,p,toru)===1);
  const enemy=b.spawn(3,'britannia',ep,null);
  toru.hp=1;ally.moved=ally.attacked=true;ally.morale=-1;
  b.g.phase='britannia';
  const r=E.attack(b.g,enemy.id,toru.c,toru.r);
  assert.equal(r.ok,true,r.reason);
  assert.equal(toru.hp,0,'Toru truly killed by enemy');
  assert.equal(ally.expToruPromisePending,true,'Enemy-turn death banks extra actions');
  assert.equal(ally.expToruPromiseDamage,true);
  E.beginTurn(b.g,'eu',false);
  assert.equal(ally.expToruExtraAttack,1);
  assert.equal(ally.expToruExtraMove,1);
  assert.equal(ally.morale,1,'High morale after pending reward');
}
{
  // The Last Promise MUST also activate when Toru dies to counterfire
  // during his own initiating attack, refreshing allies immediately.
  const trial=setup();
  const toru=trial.spawn(1,'eu',trial.c,'toru');
  const ally=trial.spawn(2,'eu',trial.around[1],null);
  const enemy=trial.spawn(3,'britannia',trial.around[0],null);
  enemy.hp=9000;toru.hp=1;ally.attacked=ally.moved=true;ally.morale=-1;
  const before=E.preview(trial.g,toru.id,enemy.c,enemy.r);
  assert.ok(before&&before.counterAllowed,'Enemy can counter Toru in this test');
  const attack=E.attack(trial.g,toru.id,enemy.c,enemy.r);
  assert.equal(attack.ok,true,attack.reason);
  assert.equal(toru.hp,0,'Toru dies to the counterattack');
  assert.equal(ally.expToruPromiseDamage,true);
  assert.equal(ally.morale,1);
  assert.equal(ally.attacked,false,'Immediate allied attack refresh');
  assert.equal(ally.moved,false,'Immediate allied movement refresh');
}
{
  // Old personal HQ and deployed commander IDs preserve prior progression.
  const b=setup();
  const old=b.spawn(1,'eu',b.c,'romero');
  old.cmd='margaret';
  b.g.roster={margaret:{rank:4,ratings:{infantry:3,armor:4,artillery:5,mobility:2},commission:'legendary'}};
  const loaded=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(b.g))));
  assert.ok(loaded);
  assert.equal(loaded.units.find(x=>x.id===old.id).cmd,'romero');
  assert.equal(loaded.roster.romero.rank,4);
  assert.equal(loaded.roster.margaret,undefined);
}
console.log('E.U. four-for-four roster, disruption, Stand Fast, Guardian and Last Promise: PASS');

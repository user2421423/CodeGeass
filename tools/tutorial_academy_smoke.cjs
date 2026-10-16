#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const E=require('../dist/engine.js');
require('../dist/engine/army-groups.js');
const basic=fs.readFileSync(require.resolve('../dist/ui/tutorial.js'),'utf8');
const labs=fs.readFileSync(require.resolve('../dist/ui/tutorial-labs.js'),'utf8');
const context=vm.createContext({E});
const T=vm.runInContext(basic+'\n'+labs+'\n({ tutorialMakeGame, tutorialScenario, TRAINING_LABS })',context);
E.scenarios={...(E.scenarios||{}),byId:{...(E.scenarios?.byId||{})}};
T.tutorialScenario();
const setup=id=>{
  const g=T.tutorialMakeGame(),t={lab:id,step:0,ids:{},notes:{}};
  T.TRAINING_LABS.find(x=>x.id===id).setup(g,t);
  assert.equal(g.scenario.id,'training-grounds');
  assert.ok(g.units.length>0,id+' must create actual units');
  assert.equal(g.tiles.length,99);
  return {g,t};
};
assert.equal(T.TRAINING_LABS.length,11);
assert.ok(!T.TRAINING_LABS.some(x=>/commander abilities/i.test(x.name)),'commander abilities were excluded');
for(const lab of T.TRAINING_LABS)setup(lab.id);
{
  const {g,t}=setup('combat'),u=g.units.find(v=>v.id===t.ids.hero);
  assert.ok(E.reachable(g,u).has('3,4'));
  let r=E.move(g,u.id,3,4);assert.ok(r.ok,r.reason);
  r=E.attack(g,u.id,4,4);assert.ok(r.ok,r.reason);
  assert.ok(!g.units.some(x=>x.id===t.ids.enemy&&x.hp>0));
}
{
  const {g,t}=setup('cities'),u=g.units.find(v=>v.id===t.ids.hero);
  let r=E.attack(g,u.id,5,4);assert.ok(r.ok,r.reason);
  assert.equal(g.stations[1].shield,0);
  E.finishWarTurn(g,g.turn);g.turn++;E.beginTurn(g,g.player,true);
  r=E.move(g,u.id,5,4);assert.ok(r.ok,r.reason);
  assert.equal(g.stations[1].owner,'britannia');
}
{
  const {g,t}=setup('economy');
  const type=E.lineupOf(g,g.player).scout;
  const r=E.recruit(g,0,type);assert.ok(r.ok,r.reason);
  assert.ok(r.unit.id!==t.ids.hero);
}
{
  const {g,t}=setup('repairs');
  const u=g.units.find(v=>v.id===t.ids.hurt);
  const old=u.hp;let r=E.repair(g,u.id);
  assert.ok(r.ok,r.reason);assert.ok(u.hp>old);
  const v=g.units.find(x=>x.id===t.ids.fresh);
  r=E.reinforce(g,v.id);assert.ok(r.ok,r.reason);assert.equal(v.stack,2);
}
{
  const {g,t}=setup('terrain');const u=g.units.find(v=>v.id===t.ids.hero);
  const r=E.move(g,u.id,3,4);assert.ok(r.ok,r.reason);
  assert.equal(E.tile(g,3,4).terrain,'forest');
}
{
  const {g,t}=setup('controls');const u=g.units.find(v=>v.id===t.ids.other);
  const r=E.setGoto(g,u.id,5,5);assert.ok(r.ok,r.reason);
  assert.deepEqual({...u.goto}, {c:5,r:5});
}
{
  const {g,t}=setup('naval');const ship=g.units.find(v=>v.id===t.ids.ship);
  const old=ship.hp;let r=E.repair(g,ship.id);assert.ok(r.ok,r.reason);assert.ok(ship.hp>old);
  const a=g.units.find(v=>v.id===t.ids.amph);
  r=E.move(g,a.id,5,4);assert.ok(r.ok,r.reason);
  assert.equal(g.stations[1].owner,'britannia');
}
{
  const {g,t}=setup('groups');let r=E.createArmyGroup(g,t.ids.first);assert.ok(r.ok,r.reason);
  const id=r.group.id;r=E.addArmyGroupUnit(g,id,t.ids.second);assert.ok(r.ok,r.reason);
  r=E.orderArmyGroup(g,id,6,4);assert.ok(r.ok,r.reason);
  assert.equal(r.assigned,2);
}
{
  const {g}=setup('fleija');
  const prev=g.mode;g.mode='conquest';let r;
  try{r=E.launch(g,'britannia',9,4);}finally{g.mode=prev;}
  assert.ok(r.ok,r.reason);
  assert.equal(r.intercepted,true);
  assert.equal(g.stations[2].eliminator,0);
}
const html=fs.readFileSync(require.resolve('../dist/index.html'),'utf8');
assert.ok(html.includes('ui/tutorial-labs.js'));
console.log('Interactive tutorial academy: 11 sandbox drills and combat, siege, economy, repair, navigation, naval, group, F.L.E.I.J.A. mechanics PASS');

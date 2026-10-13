'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/army-groups.js');

function battlefield(shield = 25, defenderHP = 22) {
  const g = E.createGame('britannia', 'normal', 'conquest', 32041);
  g.cols = 14;
  g.rows = 12;
  g.wrap = false;
  g.tiles = Array.from({length:g.cols*g.rows},(_,i)=>({
    c:i%g.cols,r:Math.floor(i/g.cols),terrain:'plains',owner:null
  }));
  g.units = [];
  g.stations = [
    {id:101,name:'Objective',c:7,r:5,owner:'eu',shield,maxShield:100,tier:1,
      portLevel:0,producedTurn:-1,portProducedTurn:-1,income:3,industry:2,science:1},
    {id:102,name:'Home',c:2,r:2,owner:'britannia',shield:0,maxShield:100,tier:1,
      portLevel:0,producedTurn:-1,portProducedTurn:-1,income:3,industry:2,science:1},
    {id:103,name:'Federation',c:11,r:9,owner:'cf',shield:0,maxShield:100,tier:1,
      portLevel:0,producedTurn:-1,portProducedTurn:-1,income:3,industry:2,science:1},
    {id:104,name:'Europe',c:12,r:2,owner:'eu',shield:0,maxShield:100,tier:1,
      portLevel:0,producedTurn:-1,portProducedTurn:-1,income:3,industry:2,science:1},
  ];
  g.sites = [];
  g.fallen = {};
  g.phase = g.player;
  g.over = null;
  g.turn = 2;
  const artillery = E.newUnit(g,E.typeFor('britannia','support'),g.player,6,4);
  const heavy = E.newUnit(g,E.typeFor('britannia','heavy'),g.player,6,5);
  const raider = E.newUnit(g,E.typeFor('britannia','raider'),g.player,7,6);
  const defender = E.newUnit(g,E.typeFor('eu','scout'),'eu',7,5);
  defender.hp = defenderHP;
  const created = E.createArmyGroup(g);
  assert(created.ok, created.reason);
  for (const u of [artillery,heavy,raider])
    assert(E.addArmyGroupUnit(g,created.group.id,u.id).ok);
  return {g,gr:created.group,artillery,heavy,raider,defender,city:g.stations[0]};
}
function automate(g) {
  E.planArmyGroupConquest(g,g.player);
  E.planArmyGroupAssault(g,g.player);
  const first=E.runGotos(g,g.player);
  E.planArmyGroupAssault(g,g.player);
  const fire=E.runArmyGroupFire(g,g.player);
  E.planArmyGroupAssault(g,g.player);
  const follow=E.runGotos(g,g.player,{assaultOnly:true});
  E.planArmyGroupAssault(g,g.player);
  return {moves:first.moved.concat(follow.moved),shots:fire.fired};
}
test('Assault creates a phased city operation with non-overlapping approach hexes',()=>{
  const {g,gr}=battlefield();
  assert(E.setArmyGroupStance(g,gr.id,'assault').ok);
  assert(E.orderArmyGroup(g,gr.id,7,5).ok);
  assert.equal(gr.operation.targetCityId,101);
  assert(['assembling','assault'].includes(gr.operation.phase));
  const destinations=Object.values(gr.operation.staging).map(p=>p.c+','+p.r);
  assert.equal(destinations.length,new Set(destinations).size);
  assert.equal(gr.destination.c,7);
  assert.equal(gr.destination.r,5);
  assert(Object.keys(E.ARMY_GROUP_ASSAULT_TUNING).includes('readiness'));
});
test('Assault uses ordinary damage, kills and capture; no individual player attacks required',()=>{
  const {g,gr,city}=battlefield();
  assert(E.setArmyGroupStance(g,gr.id,'assault').ok);
  assert(E.orderArmyGroup(g,gr.id,city.c,city.r).ok);
  let shots=0;
  for(let turn=0;turn<8 && city.owner!==g.player;turn++){
    if(turn){g.turn++;E.beginTurn(g,g.player,false);}
    const result=automate(g);
    shots+=result.shots.length;
  }
  assert(shots>0,'the engine performed at least one legal group attack');
  assert.equal(city.owner,g.player,'the group captured a defended city');
  assert(['consolidating','assault'].includes(gr.operation?.phase) || !gr.operation);
});
test('Manual overrides block group fire and routing this turn',()=>{
  const {g,gr,heavy,city}=battlefield();
  assert(E.setArmyGroupStance(g,gr.id,'assault').ok);
  assert(E.orderArmyGroup(g,gr.id,city.c,city.r).ok);
  E.suspendArmyGroupConquestUnit(g,heavy.id);
  assert.equal(gr.operation.manualOverrides[heavy.id],g.turn);
  E.planArmyGroupAssault(g,g.player);
  assert(!heavy.goto,'planner did not reinstate overridden member route');
  const shots=E.runArmyGroupFire(g,g.player);
  assert(!shots.fired.some(s=>s.id===heavy.id));
  // A personal route must not be overwritten by planner, even on a later turn.
  assert(E.setGoto(g,heavy.id,3,4).ok);
  E.suspendArmyGroupConquestUnit(g,heavy.id,true);
  g.turn++;
  E.beginTurn(g,g.player,false);
  E.planArmyGroupAssault(g,g.player);
  assert.deepEqual(heavy.goto,{c:3,r:4});
});
test('Hold Position and cancelled orders never automate members',()=>{
  const {g,gr,city}=battlefield();
  assert(E.setArmyGroupStance(g,gr.id,'hold').ok);
  assert(E.orderArmyGroup(g,gr.id,city.c,city.r).ok);
  E.planArmyGroupAssault(g,g.player);
  assert.equal(gr.operation,undefined);
  assert.equal(E.runArmyGroupFire(g,g.player).fired.length,0);
  assert(E.setArmyGroupStance(g,gr.id,'assault').ok);
  assert(E.cancelArmyGroup(g,gr.id).ok);
  assert.equal(gr.operation,undefined);
  assert.equal(gr.destination,null);
  assert.equal(E.runArmyGroupFire(g,g.player).fired.length,0);
});
test('Advance never fires and automated city selection coexists with Assault',()=>{
  const {g,gr,city}=battlefield();
  assert(E.orderArmyGroup(g,gr.id,city.c,city.r).ok);
  assert.equal(E.runArmyGroupFire(g,g.player).fired.length,0);
  assert(E.setArmyGroupConquest(g,gr.id,true).ok);
  assert(E.setArmyGroupStance(g,gr.id,'assault').ok);
  E.planArmyGroupAssault(g,g.player);
  assert(gr.operation?.targetCityId != null);
  assert.equal(gr.autoConquer,true);
  assert(E.setArmyGroupStance(g,gr.id,'hold').ok);
  assert.equal(gr.autoConquer,false);
});
test('A routed group member cannot move twice under the two-pass order executor',()=>{
  const {g,gr,city}=battlefield(70,100);
  assert(E.setArmyGroupStance(g,gr.id,'assault').ok);
  assert(E.orderArmyGroup(g,gr.id,city.c,city.r).ok);
  const report=automate(g);
  const movedIds=report.moves.map(x=>x.id);
  assert.equal(new Set(movedIds).size,movedIds.length,
    'native autoOrderTurn and lastTurnMoved prohibit duplicate movement');
});

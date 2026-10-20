#!/usr/bin/env node
'use strict';
// Glaston summons, standard Elite conversion, damage sharing, vengeance and saves.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const d=E.COMMANDERS.darlton;
assert.equal(d.action.cooldown,10);
assert.equal(d.action.target,'hex');
assert.equal(d.fx.rally,undefined,'Old morale aura must be removed');
assert.equal(d.fx.infantryCommand,undefined,'Old Infantry bonus must be removed');
const standard=(side,cls)=>Object.keys(E.TYPES).find(id=>{
  const t=E.TYPES[id];
  return t.side===side&&t.cls===cls&&!t.elite&&!t.naval&&!t.air;
});
const infantry=standard('britannia','raider');
const enemyType=standard('eu','scout');
assert.ok(infantry&&enemyType,'Need standard test frames');
function battlefield(type=infantry){
  const g=E.createGame('britannia','normal','conquest',20261020,'world');
  g.units=[];g.phase='britannia';
  const clear=p=>p&&p.terrain==='plains'&&!E.stationAt(g,p);
  const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length===6);
  assert.ok(center,'Need an empty six-neighbor battlefield');
  const father=E.newUnit(g,type,'britannia',center.c,center.r,1,'darlton');
  return {g,father,center,clear};
}
function summon(g,father){
  const choices=E.actionTargets(g,father);
  assert.ok(choices.length,'At least one legal summon tile');
  const target=choices[0];
  assert.equal(E.unitAt(g,target),null);
  assert.equal(E.feint(g,father.id,'99999,99999').ok,false,'Invalid hex rejected');
  assert.equal(father.feintCD,0,'Invalid action must not spend cooldown');
  const r=E.feint(g,father.id,target.id);
  assert.equal(r.ok,true,r.reason);
  const knight=E.unitAt(g,target);
  assert.ok(knight&&knight.id!==father.id);
  assert.equal(knight.cmd,null);
  assert.equal(knight.stack,1);
  assert.equal(knight.elite,null);
  assert.equal(knight.expDarltonSummonedBy,father.id);
  assert.equal(knight.moved,false);
  assert.equal(knight.attacked,false);
  assert.equal(father.feintCD,10);
  assert.equal(E.feint(g,father.id,target.id).ok,false,'10-turn cooldown applies');
  return knight;
}
{
  const {g,father}=battlefield();
  const knight=summon(g,father);
  assert.equal(knight.type,infantry,'Standard source must copy its exact frame type');
  const loaded=E.unpackSave(JSON.parse(JSON.stringify(E.packSave(g))));
  assert.equal(loaded.units.find(u=>u.id===knight.id).expDarltonSummonedBy,father.id);
  assert.equal(loaded.units.find(u=>u.id===father.id).feintCD,10);
}
{
  const elite='elite_cornelia_gloucester';
  assert.ok(E.TYPES[elite]?.elite);
  const {g,father}=battlefield(elite);
  const knight=summon(g,father);
  assert.equal(knight.type,E.lineupOf(g,'britannia')[E.TYPES[elite].cls],
    'Elite frame must summon regular faction equivalent');
  assert.equal(E.TYPES[knight.type].elite,false);
}
{
  const {g,father,clear}=battlefield(),knight=summon(g,father);
  const pick=()=>E.adjacent(g,father).find(p=>clear(p)&&!E.unitAt(g,p));
  const enemyTile=pick();
  assert.ok(enemyTile);
  const enemy=E.newUnit(g,enemyType,'eu',enemyTile.c,enemyTile.r);
  g.phase='eu';
  assert.ok(E.preview(g,enemy.id,father.c,father.r),'Enemy can attack Darlton');
  const beforeFather=father.hp,beforeKnight=knight.hp;
  const r=E.attack(g,enemy.id,father.c,father.r);
  assert.equal(r.ok,true,r.reason);
  const takenFather=beforeFather-father.hp,takenKnight=beforeKnight-knight.hp;
  assert.ok(takenFather>0&&takenKnight>0,'Glaston Knight must share a real incoming hit');
  assert.ok(Math.abs(takenFather-takenKnight)<=2,'Half damage should go to the knight');
  assert.equal(father.expDarltonProtectTurn,g.turn);
  const tile=pick();assert.ok(tile);
  const another=E.newUnit(g,enemyType,'eu',tile.c,tile.r);
  const hp=knight.hp;
  assert.equal(E.attack(g,another.id,father.c,father.r).ok,true);
  assert.equal(knight.hp,hp,'Interception triggers only once per turn');
}
{
  const {g,father,clear}=battlefield(),knight=summon(g,father);
  const tile=E.adjacent(g,father).find(p=>clear(p)&&!E.unitAt(g,p));
  const enemy=E.newUnit(g,enemyType,'eu',tile.c,tile.r);
  enemy.morale=-3;
  father.attacked=true;father.moved=true;
  knight.hp=0;
  E.kill(g,knight,null);
  assert.equal(father.attacked,false);
  assert.equal(father.moved,false);
  assert.equal(father.expDarltonVengeanceBonus,true);
  assert.equal(father.expDarltonVengeanceTurn,g.turn);
  const boosted=E.preview(g,father.id,enemy.c,enemy.r).unit;
  delete father.expDarltonVengeanceBonus;
  const baseline=E.preview(g,father.id,enemy.c,enemy.r).unit;
  assert.ok(boosted>baseline*1.45&&boosted<baseline*1.55,
    'Next initiating attack gains 50% damage');
  father.expDarltonVengeanceBonus=true;
  assert.equal(E.attack(g,father.id,enemy.c,enemy.r).ok,true);
  assert.equal(father.expDarltonVengeanceBonus,undefined,'Bonus consumed exactly once');
}
console.log('Darlton Glaston summon, protection, vengeance and save persistence: PASS');

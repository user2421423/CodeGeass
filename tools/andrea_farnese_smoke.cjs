#!/usr/bin/env node
'use strict';
// Andrea: mass endangered-unit retreat, limited heal and full action exhaustion.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const C=E.COMMANDERS.farnese, dist=E.internal.dist;
assert.equal(C.skill,'Orderly Withdrawal / Honor the Fallen / End the Slaughter');
assert.deepEqual(C.fx,{honorFallen:true,endSlaughter:true});
assert.equal(C.action.kind,'farneseWithdrawal');
assert.equal(C.action.cooldown,0);
assert.equal(C.fx.siegeMark,undefined,'Old siege marking removed');
assert.equal(C.stats,undefined,'Old artillery attack buff removed');
const type=(side,branch)=>Object.keys(E.TYPES).find(id=>{
 const t=E.TYPES[id];return t.side===side&&t.branch===branch&&!t.naval&&!t.elite&&t.min===1&&t.max===1;
});
const brArt=type('britannia','Artillery'),brInf=type('britannia','Infantry'),euInf=type('eu','Infantry');
assert.ok(brArt&&brInf&&euInf,'Expected infantry and artillery class');
function setup(){
 const g=E.createGame('britannia','normal','conquest',20261021,'world');
 g.units=[];g.phase='britannia';
 const clear=p=>p&&p.terrain==='plains'&&!E.internal.stationAt(g,p)&&!E.internal.unitAt(g,p);
 const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length===6&&
  E.within(g,p,4).filter(clear).length>=34);
 assert.ok(center,'Need an open four-ring battlefield');
 const f=E.newUnit(g,brArt,'britannia',center.c,center.r,1,'farnese');
 const place=(radius,side='britannia',t=brInf)=> {
   const p=E.within(g,center,radius).find(p=>clear(p)&&dist(g,center,p)===radius);
   assert.ok(p,'Need free hex in ring '+radius);
   return E.newUnit(g,t,side,p.c,p.r,1);
 };
 return {g,f,clear,center,place};
}
function enemyNear(b,v){
 const p=E.adjacent(b.g,v).find(p=>b.clear(p));
 assert.ok(p,'Need open adjacent enemy hex');
 return E.newUnit(b.g,euInf,'eu',p.c,p.r,1);
}
// Once per turn, the whole below-half-HP group receives protection,
// a restored move (when already spent), or an extra banked full move.
{
 const b=setup(),wounded=b.place(1),edge=b.place(3),outside=b.place(4),healthy=b.place(2);
 wounded.hp=Math.floor(E.maxHP(wounded)*.4);
 wounded.moved=true;wounded.attacked=true;
 edge.hp=Math.floor(E.maxHP(edge)*.3);
 outside.hp=Math.floor(E.maxHP(outside)*.2);
 healthy.hp=Math.ceil(E.maxHP(healthy)*.5);
 assert.equal(E.actionTargets(b.g,b.f).length,1,'Self-click activates group skill');
 assert.equal(E.feintReason(b.g,b.f),null);
 const r=E.feint(b.g,b.f.id);assert.equal(r.ok,true,r.reason);
 assert.equal(r.affected,2,'Only wounded allies within 3 hexes');
 assert.equal(wounded.moved,false);
 assert.equal(wounded.withdrawMove,true);
 assert.equal(wounded.attacked,true,'Withdrawal never grants an attack');
 assert.equal(edge.expFarneseExtraMove,1,'Unspent normal movement earns another move');
 assert.equal(healthy.expFarneseWithdrawal,undefined,'Exactly half HP does not qualify');
 assert.equal(outside.expFarneseWithdrawal,undefined,'No effect beyond 3 hexes');
 assert.equal(E.feint(b.g,b.f.id).ok,false,'Once per turn');
 const enemy=enemyNear(b,wounded);
 b.g.phase='eu';
 const protectedShot=E.preview(b.g,enemy.id,wounded.c,wounded.r);
 assert.ok(protectedShot);
 delete wounded.expFarneseWithdrawal;
 const ordinary=E.preview(b.g,enemy.id,wounded.c,wounded.r);
 assert.ok(Math.abs(protectedShot.unit/ordinary.unit-.7)<.08,'30% damage reduction');
 wounded.expFarneseWithdrawal={side:'britannia',source:b.f.id};
 E.beginTurn(b.g,'britannia',false);
 assert.equal(wounded.expFarneseWithdrawal,undefined,'Protection expires next friendly turn');
}
// A confirmed death triggers 10% healing + morale normalization and exhausts
// the killer, even if another skill subsequently clears its action flags.
{
 const b=setup(),victim=b.place(1),healed=b.place(1),outside=b.place(4);
 const enemy=enemyNear(b,victim);
 const hpBefore=Math.floor(E.maxHP(healed)*.4);
 healed.hp=hpBefore;healed.morale=-2;
 outside.hp=Math.floor(E.maxHP(outside)*.4);
 victim.hp=1;b.g.phase='eu';
 const r=E.attack(b.g,enemy.id,victim.c,victim.r);
 assert.equal(r.ok,true,r.reason);
 assert.equal(victim.hp,0);
 assert.equal(healed.hp,hpBefore+Math.round(E.maxHP(healed)*.1));
 assert.equal(healed.morale,0);
 assert.equal(enemy.expFarneseSlaughterTurn,b.g.turn);
 assert.equal(enemy.moved,true,'Movement is exhausted');
 assert.equal(enemy.attacked,true,'Attack is exhausted, despite kill chain');
 enemy.moved=false;enemy.attacked=false; // Simulate another skill refreshing it.
 assert.equal(E.reachable(b.g,enemy).size,0,'Movement stays blocked after refresh');
 const second=E.attack(b.g,enemy.id,b.f.c,b.f.r);
 assert.equal(second.ok,false);
 assert.match(second.reason,/End the Slaughter/,'Attack stays blocked after refresh');
 const loaded=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(b.g))));
 assert.equal(loaded.units.find(u=>u.id===enemy.id).expFarneseSlaughterTurn,b.g.turn,'Suppression survives saving');
 E.beginTurn(b.g,'britannia',false);
 assert.equal(enemy.expFarneseSlaughterTurn,undefined,'Expires after current turn, not next enemy turn');
 E.beginTurn(b.g,'eu',false);
 assert.ok(E.reachable(b.g,enemy).size>0,'Next turn restores ordinary movement');
}
console.log('Andrea Farnese three-ability rework: PASS');

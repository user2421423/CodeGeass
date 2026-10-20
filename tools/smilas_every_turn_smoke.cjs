#!/usr/bin/env node
'use strict';
// Smilas's Expendable Vanguard must be available every turn,
// once per turn, even in saved games with a legacy cooldown counter.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const sm=E.COMMANDERS.smilas;
assert.equal(sm.action.kind,'expendableVanguard');
assert.equal(sm.action.cooldown,0,'Smilas has no multi-turn cooldown');
assert.match(sm.desc,/once every turn/);
assert.match(sm.action.desc,/Once per turn/);
assert.deepEqual(sm.fx,{humanShields:true,necessarySacrifices:true},
  'Human Shields and Necessary Sacrifices remain unchanged');
const pick=branch=>Object.keys(E.TYPES).find(key=>{
  const t=E.TYPES[key];return t.side==='eu'&&t.branch===branch&&!t.naval&&!t.elite&&t.min===1&&t.max===1;
});
const armor=pick('Armor'), infantry=pick('Infantry');
assert.ok(armor&&infantry,'European ground units available');
const g=E.createGame('eu','normal','conquest',20261020,'world');
g.units=[];g.phase='eu';
const clear=p=>p?.terrain==='plains'&&!E.internal.stationAt(g,p);
const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length>=3);
assert.ok(center,'Open ground available');
const smilas=E.newUnit(g,armor,'eu',center.c,center.r,1,'smilas');
const neighbors=E.adjacent(g,center).filter(clear);
const first=E.newUnit(g,infantry,'eu',neighbors[0].c,neighbors[0].r);
const second=E.newUnit(g,infantry,'eu',neighbors[1].c,neighbors[1].r);
first.moved=true;first.attacked=true;
smilas.feintCD=3; // A save from before the rework must not retain a forced wait.
assert.equal(E.feintReason(g,smilas),null,'Ignore the legacy 3-turn cooldown');
let result=E.feint(g,smilas.id,first.id);
assert.equal(result.ok,true,result.reason);
assert.equal(first.moved,false,'Movement refreshed');
assert.equal(first.attacked,false,'Attack refreshed');
assert.equal(first.expSmilasVanguardCharge,true,'Existing costly damage buff remains');
assert.equal(smilas.feintCD,0,'No extra cooldown is created');
assert.equal(smilas.feintUsedTurn,g.turn,'One-use stamp stored');
assert.match(E.feintReason(g,smilas),/Already used this turn/);
assert.equal(E.feint(g,smilas.id,second.id).ok,false,'Cannot use twice in one turn');
g.turn++;
assert.equal(E.feintReason(g,smilas),null,'Can use again on next turn');
result=E.feint(g,smilas.id,second.id);
assert.equal(result.ok,true,result.reason);
assert.equal(second.expSmilasVanguardCharge,true);
assert.equal(smilas.feintCD,0);
console.log('Smilas Expendable Vanguard available every turn: PASS');

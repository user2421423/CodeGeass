#!/usr/bin/env node
'use strict';
// Ryo's first-hit mark, stronger allied damage, and mutual refresh on an
// OTHER ally's kill. This is the same attack/kill code path used by the AI.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const E=require('../dist/engine.js');
const c=E.COMMANDERS.ryo;
assert.equal(c.skill,'Marked for Attack / Exploit the Opening');
assert.equal(c.fx.ryoMark,.3);
assert.equal(c.fx.ryoOpening,true);
assert.ok(!c.fx.runCharge&&!c.fx.counterTaken,'Replaces old charge and counterfire penalty');

const type=(side,branch)=>Object.keys(E.TYPES).find(id=>{
  const t=E.TYPES[id];
  return t.side===side&&t.branch===branch&&!t.naval&&!t.elite&&!t.airship&&t.min<=1&&t.max>=1;
});
const euArmor=type('eu','Armor'),brInf=type('britannia','Infantry');
assert.ok(euArmor&&brInf,'Both sides have a regular unit');
const dist=E.internal.dist;
function setup(){
  const g=E.createGame('eu','normal','conquest',20261020,'world');
  g.units=[];g.phase='eu';
  const clear=p=>p&&p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length===6);
  assert.ok(center,'Need a clear six-neighbor battlefield');
  const allyTile=E.adjacent(g,center).find(clear);
  const enemyTile=E.adjacent(g,center).find(p=>clear(p)&&dist(g,p,allyTile)===1);
  assert.ok(allyTile&&enemyTile,'Need two allied attackers in range of the enemy');
  const ryo=E.newUnit(g,euArmor,'eu',center.c,center.r,1,'ryo');
  const ally=E.newUnit(g,euArmor,'eu',allyTile.c,allyTile.r,1);
  const enemy=E.newUnit(g,brInf,'britannia',enemyTile.c,enemyTile.r,1);
  enemy.hp=1000;
  enemy.morale=-3; // Suppress unrelated retaliation and keep the target alive for marking.
  return {g,ryo,ally,enemy};
}
const approx=(v,w,msg)=>assert.ok(w>0&&v/w>1.22&&v/w<1.38,msg+' (ratio '+v/w+')');

// Mark is created after a legal first attack, helps another ally +30%, and
// never gives Ryo his own bonus. A second hit cannot stack the same mark.
{
  const {g,ryo,ally,enemy}=setup();
  const originalAlly=E.preview(g,ally.id,enemy.c,enemy.r).unit;
  const originalRyo=E.preview(g,ryo.id,enemy.c,enemy.r).unit;
  assert.ok(originalAlly>0&&originalRyo>0);
  const a=E.attack(g,ryo.id,enemy.c,enemy.r);
  assert.equal(a.ok,true,a.reason);
  assert.ok(enemy.hp>0);
  const marks=(enemy.skillMarks||[]).filter(m=>m.ryo&&m.source===ryo.id);
  assert.equal(marks.length,1);
  assert.equal(marks[0].damage,.3);
  approx(E.preview(g,ally.id,enemy.c,enemy.r).unit,originalAlly,
    'Other allies should deal 30% more damage');
  assert.equal(E.preview(g,ryo.id,enemy.c,enemy.r).unit,originalRyo,
    'Ryo does not benefit from his own mark');
  const saved=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
  assert.ok(saved&&saved.units.find(u=>u.id===enemy.id).skillMarks.some(m=>m.ryo),
    'Existing saves retain the mark without a migration');
  // Both Ryo and the killing ally receive their complete normal activations.
  enemy.hp=1;
  ryo.attacked=true;ryo.moved=true;
  ally.moved=true;
  ryo.feintUsedTurn=ally.feintUsedTurn=g.turn;
  const killed=E.attack(g,ally.id,enemy.c,enemy.r);
  assert.equal(killed.ok,true,killed.reason);
  assert.equal(enemy.hp,0);
  assert.equal(ryo.moved,false);
  assert.equal(ryo.attacked,false);
  assert.equal(ally.moved,false);
  assert.equal(ally.attacked,false);
  assert.equal(ryo.feintUsedTurn,g.turn,'Commander cooldowns do not reset');
  assert.equal(ally.feintUsedTurn,g.turn,'Ally cooldowns do not reset');
  assert.equal(ryo.expRyoOpeningRefresh?.count,1,'AI can observe the refreshed commander');
}
// Ryo must NEVER trigger the team refresh from his own kill.
{
  const {g,ryo,enemy}=setup();
  assert.equal(E.attack(g,ryo.id,enemy.c,enemy.r).ok,true);
  assert.ok(enemy.skillMarks?.some(m=>m.ryo));
  enemy.hp=1;
  ryo.attacked=false;ryo.moved=false; // External refresh for the solo-kill check.
  assert.equal(E.attack(g,ryo.id,enemy.c,enemy.r).ok,true);
  assert.equal(enemy.hp,0);
  assert.equal(ryo.expRyoOpeningRefresh,undefined,'Only another ally can trigger the skill');
}
// Yukiya's weaker +15% mark must not stack with Ryo's +30%.
{
  const {g,ryo,ally,enemy}=setup();
  const base=E.preview(g,ally.id,enemy.c,enemy.r).unit;
  enemy.skillMarks=[{side:'eu',source:ally.id+3000,damage:.15}];
  assert.equal(E.attack(g,ryo.id,enemy.c,enemy.r).ok,true);
  approx(E.preview(g,ally.id,enemy.c,enemy.r).unit,base,
    'Ryo mark takes precedence over Yukiya mark');
  E.beginTurn(g,'britannia',false);
  assert.ok(enemy.skillMarks.some(m=>m.ryo),'Mark lasts through enemy phase');
  E.beginTurn(g,'eu',false);
  assert.ok(!enemy.skillMarks.some(m=>m.ryo),'Mark expires on Ryo faction next turn');
}
// Ensure the production AI runner requeues Ryo only on genuine refreshes.
const runner=fs.readFileSync(require('node:path').join(__dirname,'../dist/ui/turns.js'),'utf8');
assert.match(runner,/ryoExtraOrders < 12/);
assert.match(runner,/ids\.push\(ryo\.id\)/);
console.log('Ryo marking, allied damage, mutual kill refresh, persistence and AI queue: PASS');

#!/usr/bin/env node
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../../dist/engine.js');
const dist=E.internal.dist;
const type=(side,branch)=>Object.keys(E.TYPES).find(id=>{
  const t=E.TYPES[id];
  return t.side===side&&t.branch===branch&&!t.naval&&!t.elite&&!t.airship&&t.min<=1&&t.max>=1;
});
function setup(){
  const g=E.createGame('britannia','normal','conquest',20261020,'world');
  g.units=[];
  const plain=p=>p&&p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const center=g.tiles.find(p=>plain(p)&&E.adjacent(g,p).filter(plain).length===6);
  assert.ok(center);
  const adjacent=E.adjacent(g,center).filter(plain);
  const ally=E.newUnit(g,type('britannia','Infantry'),'britannia',center.c,center.r,1,'cornelia');
  const guard=E.newUnit(g,type('britannia','Infantry'),'britannia',adjacent[0].c,adjacent[0].r,1,'guilford');
  const enemy=E.newUnit(g,type('eu','Infantry'),'eu',adjacent[2].c,adjacent[2].r,1);
  g.phase='eu';
  enemy.morale=0;
  return {g,ally,guard,enemy};
}
test('approved Guilford roster replaces Bodyguard with all three passives',()=>{
  const c=E.COMMANDERS.guilford;
  assert.match(c.skill,/My Princess, My Justice/);
  assert.match(c.skill,/Ultimate Sacrifice/);
  assert.match(c.skill,/Spearhead's Retribution/);
  assert.equal(c.fx.guilfordGuard,true);
  assert.equal(c.fx.guilfordRetaliation,.3);
  assert.equal(c.fx.bodyguard,undefined);
});
test('nonlethal strike splits damage equally with adjacent Guilford',()=>{
  const {g,ally,guard,enemy}=setup();
  ally.hp=1000;guard.hp=1000;
  const hit=E.attack(g,enemy.id,ally.c,ally.r);
  assert.equal(hit.ok,true,hit.reason);
  const onAlly=1000-ally.hp, onGuard=1000-guard.hp;
  assert.ok(onAlly>0&&onGuard>0);
  assert.ok(Math.abs(onAlly-onGuard)<=1, 'Half the actual combat hit is intercepted');
  assert.ok(guard.expGuilfordRetribution.targets.includes(enemy.id));
});
test('lethal rescue preserves HP even if Guilford dies; cleanses hostile effects',()=>{
  const {g,ally,guard,enemy}=setup();
  ally.hp=2;guard.hp=1;
  ally.morale=-2;
  ally.expRoloFrozen=true;
  ally.expDisabledNext=true;
  ally.despairWeakened={side:'eu',value:.2};
  ally.skillMarks=[{side:'eu',source:enemy.id,damage:.3}];
  const res=E.attack(g,enemy.id,ally.c,ally.r);
  assert.equal(res.ok,true,res.reason);
  assert.equal(guard.hp,0,'Guilford can die for the ally');
  assert.equal(ally.hp,2,'Sacrifice preserves all pre-attack HP');
  assert.equal(ally.morale,0);
  assert.equal(ally.expRoloFrozen,undefined);
  assert.equal(ally.expDisabledNext,undefined);
  assert.equal(ally.despairWeakened,undefined);
  assert.equal(ally.skillMarks.length,0);
});
test('Ultimate Sacrifice only once per turn, then normal half redirection',()=>{
  const {g,ally,guard,enemy}=setup();
  ally.hp=2;guard.hp=1000;
  assert.equal(E.attack(g,enemy.id,ally.c,ally.r).ok,true);
  assert.equal(ally.hp,2);
  assert.equal(guard.expGuilfordSacrificeUsedTurn,g.turn);
  enemy.attacked=false;
  const again=E.attack(g,enemy.id,ally.c,ally.r);
  assert.equal(again.ok,true,again.reason);
  assert.equal(ally.hp,0,'A second lethal strike no longer gets total protection');
});
test('Retribution grants 30% vs the attacker, kill refreshes once, then expires',()=>{
  const {g,ally,guard,enemy}=setup();
  ally.hp=2;guard.hp=1000;
  ally.morale=-3;
  assert.equal(E.attack(g,enemy.id,ally.c,ally.r).ok,true);
  assert.ok(guard.hp>0);
  g.phase='britannia';
  const targets=guard.expGuilfordRetribution.targets;
  guard.expGuilfordRetribution.targets=[];
  const base=E.preview(g,guard.id,enemy.c,enemy.r)?.unit;
  guard.expGuilfordRetribution.targets=targets;
  const boosted=E.preview(g,guard.id,enemy.c,enemy.r)?.unit;
  assert.ok(base>0&&boosted/base>1.26&&boosted/base<1.34,
    'Only the enemy who attacked Guilford\'s ally takes +30%');
  enemy.hp=1;
  guard.moved=true;guard.attacked=false;
  assert.equal(E.attack(g,guard.id,enemy.c,enemy.r).ok,true);
  assert.equal(enemy.hp,0);
  assert.equal(guard.moved,false);
  assert.equal(guard.attacked,false);
  assert.equal(guard.expGuilfordRetributionKillTurn,g.turn);
  E.beginTurn(g,'eu',false);
  assert.equal(guard.expGuilfordRetribution,undefined,'Buff ends after friendly turn');
});

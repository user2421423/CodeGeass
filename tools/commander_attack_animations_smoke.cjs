#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const E=require('../dist/engine.js');
const {fixture}=require('./ability_targeting_smoke.cjs');
function ui(g,compact=false){
 const sounds=[];
 const s={E,game:g,effects:[],skipAI:false,aiSide:null,shake:0,
  reducedMotion:()=>compact,onScreen:()=>true,requestMapFrame(){},
  SFX:{weapon:cls=>({scout:'laser',light:'slash',medium:'cannon',heavy:'railgun',super:'beam',rocket:'rockets',siege:'siege'})[cls]||'laser',play:(...args)=>sounds.push(args)},
  setTimeout(){},clearTimeout(){},console,
 };
 vm.createContext(s);
 for(const p of ['effects','notifications'])vm.runInContext(fs.readFileSync(require.resolve('../dist/ui/'+p+'.js'),'utf8'),s);
 return {s,sounds};
}
// Every participating formation emits its own ordinary weapon shot, including
// mixed weapon classes. Normal actions and the resolved battle state stay intact.
for(const compact of [false,true]){
 const b=fixture('raymond'),{g,actor,enemy}=b;
 for(const cls of ['rocket','heavy','medium']){
  const type=E.typeFor('britannia',cls),t=E.TYPES[type];
  const p=E.within(g,actor,2).find(p=>!E.unitAt(g,p)&&E.distance(p,enemy,g)>=t.min&&E.distance(p,enemy,g)<=t.max);
  assert.ok(p,'Legal '+cls+' supporting position');E.newUnit(g,type,'britannia',p.c,p.r);
 }
 enemy.hp=50000;
 const actors=g.units.filter(v=>v.side===g.player).map(v=>[v.id,v.moved,v.attacked]);
 const beforeHP=enemy.hp,beforeShield=g.stations[2].shield;
 const {s,sounds}=ui(g,compact);
 const result=s.useCommanderAbility(actor.id,enemy.id);
 assert.equal(result.ok,true);assert.equal(result.combat.length,4,'Raymond and up to three supporters fire');
 assert.equal(result.affected,result.combat.length);
 assert.equal(beforeHP-enemy.hp,result.damage);
 assert.equal(beforeShield-g.stations[2].shield,result.shieldDamage);
 assert.deepEqual(g.units.filter(v=>v.side===g.player).map(v=>[v.id,v.moved,v.attacked]),actors,'Animations never spend normal orders');
 const shots=s.effects.filter(v=>v.kind==='shot');
 assert.equal(shots.length,result.combat.length,'Exactly one projectile per resolved strike');
 for(const [i,record] of result.combat.entries()){
  assert.deepEqual({...shots[i].from},record.result.from);
  assert.deepEqual({...shots[i].to},record.result.to);
  assert.equal(shots[i].weapon,s.SFX.weapon(E.TYPES[record.attacker.type].cls));
  assert.equal(shots[i].counter,false,'Assault never invents counterfire');
  assert.ok(i===0||shots[i].delay>shots[i-1].delay,'Shots have individual timing');
 }
 assert.equal(result.combat.reduce((sum,r)=>sum+r.result.hit[0].damage,0),result.damage);
 const state=JSON.stringify(E.packSave(g));
 s.addCommanderCombatEffects(result,actor,s.combatVisualSnapshot());
 assert.equal(JSON.stringify(E.packSave(g)),state,'Replaying visuals cannot resolve damage again');
 assert.ok(sounds.length>=4,'Every shooter uses its normal firing sound');
}
// Stop after a lethal first strike: no ghost shots from unused supporters.
{
 const {g,actor,enemy}=fixture('raymond');enemy.hp=1;
 const {s}=ui(g),r=s.useCommanderAbility(actor.id,enemy.id);
 assert.equal(r.combat.length,1);assert.equal(r.combat[0].result.destroyed,true);
 assert.equal(s.effects.filter(e=>e.kind==='shot').length,1);
 assert.equal(s.effects.filter(e=>e.kind==='wreck').length,1);
 assert.equal(s.effects.filter(e=>e.kind==='blast').length,1);
}
// Shin receives the same projectile and impact feedback, without extra damage.
{
 const {g,actor,enemy}=fixture('shin'),{s}=ui(g),before=enemy.hp;
 const r=s.useCommanderAbility(actor.id,enemy.id);
 assert.equal(r.combat.length,1);assert.equal(before-enemy.hp,r.damage);
 assert.equal(s.effects.filter(e=>e.kind==='shot').length,1);
 assert.equal(s.effects.find(e=>e.kind==='text'&&e.text==='−'+r.damage)?.to.c,enemy.c);
}
// Zero's compelled formation is the shooter, and same-faction counterfire is visible.
{
 const {g,actor,enemy}=fixture('zero'),{s}=ui(g);
 const r=s.useCommanderAbility(actor.id,enemy.id);
 assert.equal(r.ok,true);assert.equal(r.combat.length,1);
 assert.equal(r.combat[0].attacker.id,enemy.id);
 const shots=s.effects.filter(e=>e.kind==='shot');
 assert.equal(shots.length,2,'Compelled shot and real retaliation animate');
 assert.deepEqual({...shots[0].from},{c:enemy.c,r:enemy.r});
 assert.equal(shots[1].counter,true);
 assert.deepEqual(shots[1].to,shots[0].from);
}
// Fernando already returns a regular attack; the shared wrapper must animate it once.
{
 const {g,actor,enemy}=fixture('fernando'),{s}=ui(g);
 const r=s.useCommanderAbility(actor.id,enemy.id);
 assert.equal(r.attack.ok,true);assert.equal(s.effects.filter(e=>e.kind==='shot').length,1);
}
// Buffs, debuffs, allied refreshes, and rejected activations do not pretend to fire.
for(const k of ['cc','zero','miguel','oscar','manfredi','olivia']){
 const {g,actor}=fixture(k),{s}=ui(g),target=E.actionTargets(g,actor)[0];
 const r=s.useCommanderAbility(actor.id,target.id);assert.equal(r.ok,true,k);
 assert.equal(s.effects.filter(e=>e.kind==='shot').length,0,k+' has no damaging attack on activation');
}
{
 const {g,actor}=fixture('raymond'),{s}=ui(g);
 assert.equal(s.useCommanderAbility(actor.id,-1).ok,false);assert.equal(s.effects.length,0);
 s.skipAI=true;s.aiSide='eu';
 const r=s.useCommanderAbility(actor.id,E.actionTargets(g,actor)[0].id);
 assert.equal(r.ok,true);assert.equal(s.effects.length,0,'AI fast-forward retains normal skipped-effect policy');
}
console.log('Commander attack animations: individual shooters, weapon types, timing, deaths, Shin, Zero, Fernando, reduced motion and no extra attacks PASS');

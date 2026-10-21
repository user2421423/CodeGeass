#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../dist/engine.js');
const {fixture}=require('./ability_targeting_smoke.cjs');
function ui(g,compact=false){
 const s={E,game:g,effects:[],skipAI:false,aiSide:null,shake:0,reducedMotion:()=>compact,
  onScreen:()=>true,requestMapFrame(){},setTimeout(){},clearTimeout(){},console,
  SFX:{weapon:cls=>({scout:'laser',rocket:'rockets',heavy:'railgun'})[cls]||'cannon',play(){}},
 };
 vm.createContext(s);
 for(const name of ['effects','notifications'])vm.runInContext(fs.readFileSync(require.resolve('../dist/ui/'+name+'.js'),'utf8'),s);
 return s;
}
// Every active signature now has appropriate feedback, whether it attacks,
// heals, protects, debuffs, refreshes actions, or summons a formation.
for(const [id,c] of Object.entries(E.COMMANDERS).filter(([,c])=>c.action)){
 const {g,actor}=fixture(id),s=ui(g),target=E.actionTargets(g,actor).at(-1);
 const r=s.useCommanderAbility(actor.id,c.action.target==='self'?null:target?.id);
 assert.equal(r.ok,true,id+' activation');
 assert.ok(s.effects.some(e=>['shot','ability'].includes(e.kind)),id+' activation must be visible');
 if(!r.attack?.ok&&!r.combat?.length)assert.equal(s.effects.filter(e=>e.kind==='shot').length,0,id+' support is not a fake attack');
}
function reaction(commander,linked=false){
 const {g,actor,enemy}=fixture('suzaku');
 actor.hp=50000;enemy.hp=50000;enemy.cmd=null;
 const p=E.within(g,enemy,2).find(p=>!E.unitAt(g,p)&&E.distance(p,actor,g)===1);
 const guard=E.newUnit(g,E.typeFor('eu','heavy'),'eu',p.c,p.r,1,commander);
 if(linked)guard.expLink={partner:enemy.id};
 return {g,actor,enemy,guard};
}
for(const [commander,linked] of [['oscar',false],['kizuna',false],[null,true]]){
 const {g,actor,enemy,guard}=reaction(commander,linked),s=ui(g),before=s.combatVisualSnapshot();
 const r=E.attack(g,actor.id,enemy.c,enemy.r);assert.equal(r.ok,true,r.reason);
 const shot=r.abilityEffects?.find(e=>e.kind==='attack'&&e.attacker.id===guard.id);
 assert.ok(shot,(commander||'Sophie link')+' must report its actual supporting shot');
 assert.equal(shot.result.counter,0);assert.equal(guard.attacked,false,'Reaction does not spend normal attack');
 const state=JSON.stringify(E.packSave(g));s.addCombatEffects(r,actor,before);
 assert.ok(s.effects.some(e=>e.kind==='shot'&&e.from.c===guard.c&&e.from.r===guard.r),'Reaction fires from supporting formation');
 assert.equal(JSON.stringify(E.packSave(g)),state,'Visual replay does not change game state');
}
{
 const {g,actor,enemy}=fixture('suzaku');enemy.cmd='urabe';enemy.hp=1;actor.hp=50000;
 const s=ui(g),r=E.attack(g,actor.id,enemy.c,enemy.r);
 assert.ok(r.abilityEffects.some(e=>e.kind==='attack'&&e.attacker.id===enemy.id),'Urabe last stand retaliation is recorded');
 assert.ok(r.abilityEffects.some(e=>e.label==='FINAL STAND'));
}
// Moving into range triggers real overwatch/interception. A lethal reaction
// leaves its wreck at the destination, never at the pre-move snapshot position.
for(const commander of ['villetta','norland'])for(const lethal of [false,true]){
 const {g,actor}=fixture('suzaku');g.units=[actor];actor.cmd=null;actor.hp=lethal?1:50000;
 const guard=E.newUnit(g,E.typeFor('eu','heavy'),'eu',8,5,1,commander);
 if(commander==='norland')guard.expOverwatch=true;
 const p=E.within(g,actor,3).find(p=>!E.unitAt(g,p)&&
  E.distance(p,guard,g)===(commander==='villetta'?1:2)&&E.reachable(g,actor).has(E.key(p)));
 assert.ok(p,'Legal approach for '+commander);
 const s=ui(g),before=s.combatVisualSnapshot(),r=E.move(g,actor.id,p.c,p.r);
 assert.equal(r.ok,true,r.reason);assert.equal(r.hostileReaction,true);
 assert.ok(r.abilityEffects.some(e=>e.kind==='attack'&&e.attacker.id===guard.id),commander+' reaction is returned');
 const state=JSON.stringify(E.packSave(g));s.addAbilityEffects(r.abilityEffects,before,.45);
 assert.equal(JSON.stringify(E.packSave(g)),state);
 assert.equal(s.effects.filter(e=>e.kind==='shot').length,1);
 if(lethal){const wreck=s.effects.find(e=>e.kind==='wreck');assert.ok(wreck);assert.equal(wreck.to.c,p.c);assert.equal(wreck.to.r,p.r);}
}
// Lethal survivals emit restorative/protection signals, not invented shots.
for(const [commander,label] of [['anya',"MARIANNE'S AWAKENING"],['cc','CODE BEARER']]){
 const {g,actor,enemy}=fixture('suzaku');enemy.cmd=commander;enemy.hp=1;
 const r=E.attack(g,actor.id,enemy.c,enemy.r);
 assert.ok(r.abilityEffects.some(e=>e.label===label),commander+' survival pulse');
 assert.ok(enemy.hp>0);
}
// Reduced motion, offscreen filtering, AI skip and a bounded pulse count.
{
 const {g,actor}=fixture('sayoko'),s=ui(g,true);
 s.useCommanderAbility(actor.id);assert.equal(s.effects.find(e=>e.kind==='ability').duration,.18);
 const state=JSON.stringify(E.packSave(g));
 for(let i=0;i<100;i++)s.abilityPulse(actor,'TEST','buff');
 assert.equal(s.effects.filter(e=>e.kind==='ability').length,48);
 assert.equal(JSON.stringify(E.packSave(g)),state);
 s.effects=[];s.skipAI=true;s.aiSide='eu';s.abilityPulse(actor,'TEST');assert.equal(s.effects.length,0);
 s.skipAI=false;s.aiSide=null;s.onScreen=()=>false;s.abilityPulse(actor,'TEST');assert.equal(s.effects.length,0);
}
console.log('Remaining ability effects: all active powers, Oscar, Kizuna, linked support, Urabe, Villetta, Norland, lethal reactions, revivals and reduced motion PASS');
module.exports={ui,reaction};

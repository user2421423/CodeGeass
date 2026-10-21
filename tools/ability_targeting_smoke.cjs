#!/usr/bin/env node
'use strict';
// Exercise the actual UI picker with the actual rules for every active commander.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../dist/engine.js');
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/engine/army-groups.js'),'utf8'), {Knightmare:E});
function fixture(commander) {
  const g = E.createGame('britannia', 'normal', 'conquest', 20261021);
  g.cols = g.rows = 14; g.wrap = false; g.units = []; g.sites = [];
  g.tiles = Array.from({length:196}, (_,i) => ({c:i%14,r:Math.floor(i/14),terrain:'plains',owner:'britannia'}));
  const template = g.stations[0];
  g.stations = [
    {...template,id:1,name:'Source',c:5,r:5,owner:'britannia',capital:false,capitalOf:null,shield:80,maxShield:100},
    {...template,id:2,name:'Friendly city',c:6,r:5,owner:'britannia',capital:false,capitalOf:null,shield:20,maxShield:100},
    {...template,id:3,name:'Enemy city',c:5,r:6,owner:'eu',capital:false,capitalOf:null,shield:80,maxShield:100},
    {...template,id:4,name:'Distant enemy city',c:12,r:12,owner:'eu',capital:false,capitalOf:null,shield:80,maxShield:100},
  ];
  const actor = E.newUnit(g,E.typeFor('britannia','scout'),'britannia',5,5,1,commander);
  const ally = E.newUnit(g,E.typeFor('britannia','scout'),'britannia',6,5,1,'suzaku');
  const elite = Object.keys(E.TYPES).find(k=>E.TYPES[k].elite && E.TYPES[k].side==='britannia');
  E.newUnit(g,elite,'britannia',6,4,1);
  const enemy = E.newUnit(g,E.typeFor('eu','scout'),'eu',5,6,3,'akito');
  E.newUnit(g,E.typeFor('eu','scout'),'eu',6,6,3);
  for (const v of g.units) v.hp = Math.max(1,Math.round(E.maxHP(v)*.7));
  if (commander === 'farnese') ally.hp = Math.round(E.maxHP(ally)*.4);
  if (['zero','leila'].includes(commander)) ally.moved = ally.attacked = true;
  return {g,actor,ally,enemy};
}
function ui(commander) {
  const b = fixture(commander), nodes = new Map();
  let saves=0, announcements=0, calls=[];
  const s = { E,C:k=>E.COMMANDERS[k],game:b.g,selection:{kind:'unit',id:b.actor.id},
    abilityTargeting:null,abilityTargetCache:new Map(),uiStateRevision:1,
    routing:null,armyGroupRouting:null,scenarioRoutingGroup:null,deploying:null,strikeMode:false,
    carrierHoldOpen:null,detailOpen:false,multiSelectedIds:new Set(),hover:null,
    modal:{innerHTML:''},canvas:{style:{},focus(){}},esc:String,toast(){},centerOn(){},
    $:id=>{if(!nodes.has(id)) nodes.set(id,{textContent:''});return nodes.get(id);},
    selectedUnit:()=>s.game.units.find(v=>v.id===s.selection?.id&&v.hp>0),
    interactive:()=>!s.game.over&&s.game.phase===s.game.player,
    closeModal:()=>{s.modal.innerHTML='';},
    unitSnapshot:()=>({}),combatVisualSnapshot:()=>({}),moralePopups(){},addCombatEffects(){},
    updateSelection:()=>s.refreshAbilityTargets(),refreshAndSave:()=>{saves++;s.uiStateRevision++;s.refreshAbilityTargets();},
    useCommanderAbility:(id,target)=>{calls.push({id,target});const r=E.feint(s.game,id,target);if(r.ok)announcements++;return r;},
    doAction:fn=>{const r=fn();if(r.ok)s.refreshAndSave();},
  };
  vm.createContext(s);
  vm.runInContext(fs.readFileSync(require.resolve('../dist/ui/dialogs.js'),'utf8'),s);
  return {...b,s,get saves(){return saves;},get announcements(){return announcements;},calls};
}
const immediate = ['rolo','leila','lelouch','sayoko','farnese'];
const targeted = Object.keys(E.COMMANDERS).filter(k=>E.COMMANDERS[k].action&&!immediate.includes(k));
for (const k of targeted) {
  const b=ui(k), {s,actor}=b;
  assert.equal(E.feintReason(b.g,actor),null,k+' fixture must support activation');
  s.routing=actor.id;s.armyGroupRouting=1;s.scenarioRoutingGroup='test';s.strikeMode=true;
  s.commandDialog(actor);
  assert.ok(s.abilityTargeting,k+' must require an explicit map choice');
  assert.equal(s.routing,null);assert.equal(s.armyGroupRouting,null);assert.equal(s.scenarioRoutingGroup,null);
  assert.equal(s.strikeMode,false);assert.equal(b.calls.length,0,k+' must not auto-select');
  assert.equal(s.modal.innerHTML,'',k+' must leave the battlefield visible');
  const options=E.actionTargets(b.g,actor);
  assert.deepEqual([...s.abilityTargetCache.values()].map(v=>v.id),options.map(v=>v.id),k+' highlights legal targets only');
  const chosen=options.at(-1);assert.ok(chosen,k+' requires targets');
  assert.equal(s.abilityTargetCache.get(E.key(chosen)).id,chosen.id);
  // Bad clicks neither spend the ability nor select/move/attack something else.
  const unchanged=JSON.stringify(E.packSave(b.g));
  s.activateAbilityTarget({c:13,r:0});
  assert.equal(JSON.stringify(E.packSave(b.g)),unchanged,k+' invalid click must be harmless');
  assert.equal(b.calls.length,0);assert.ok(s.abilityTargeting);
  s.activateAbilityTarget(chosen);
  assert.equal(b.calls.length,1,k+' executes once');
  assert.equal(b.calls[0].target,chosen.id,k+' executes selected ID, including hex strings');
  assert.equal(b.announcements,1,k+' must actually activate');
  assert.equal(b.saves,1,k+' saves only success');
  assert.equal(s.abilityTargeting,null,k+' exits selection');
  assert.equal(actor.feintUsedTurn,b.g.turn,k+' use is recorded');
  if(k==='zero') assert.equal(chosen.side,'eu','Zero can choose enemy friendly fire');
}
for(const k of immediate) {
  const b=ui(k);b.s.commandDialog(b.actor);
  assert.equal(b.s.abilityTargeting,null,k+' does not ask for a target');
  assert.equal(b.calls.length,1);assert.equal(b.announcements,1,k+' immediate activation succeeds');
}
// Cancel, stale eligibility, changing commander/turn/selection, AI phase, and failed activation.
for(const mutate of [b=>b.actor.cmd='suzaku',b=>b.g.turn++,b=>b.s.selection={kind:'unit',id:b.ally.id},b=>b.g.phase='eu',b=>b.actor.hp=0]) {
  const b=ui('cc');b.s.commandDialog(b.actor);mutate(b);b.s.refreshAbilityTargets();
  assert.equal(b.s.abilityTargeting,null);assert.equal(b.s.abilityTargetCache.size,0);assert.equal(b.calls.length,0);
}
{
  const b=ui('cc');b.s.commandDialog(b.actor);b.s.clearAbilityTargeting();
  assert.equal(b.actor.feintUsedTurn,undefined);assert.equal(b.s.abilityTargetCache.size,0);assert.equal(b.saves,0);
}
{
  const b=ui('cc');b.s.commandDialog(b.actor);const target=[...b.s.abilityTargetCache.values()].at(-1);
  target.hp=0;b.s.activateAbilityTarget(target);
  assert.equal(b.calls.length,0,'Dead stale target cannot activate');assert.equal(b.actor.feintUsedTurn,undefined);
}
{
  const b=ui('cc');b.s.commandDialog(b.actor);const target=[...b.s.abilityTargetCache.values()].at(-1);
  b.s.useCommanderAbility=()=>({ok:false,reason:'Unavailable'});b.s.activateAbilityTarget(target);
  assert.ok(b.s.abilityTargeting,'A failed action allows another choice');assert.equal(b.saves,0);
}
{
  const b=ui('zero');b.s.commandDialog(b.actor);
  assert.match(b.s.abilityTargetLabel(b.ally),/Refresh actions/);
  assert.match(b.s.abilityTargetLabel(b.enemy),/Force friendly fire/);
  b.s.activateAbilityTarget(b.ally);assert.equal(b.ally.moved,false);assert.equal(b.ally.attacked,false);
}
console.log(`Visual ability targeting: ${targeted.length} targeted abilities, ${immediate.length} immediate abilities, cancellation and stale-target checks PASS`);
module.exports={fixture};

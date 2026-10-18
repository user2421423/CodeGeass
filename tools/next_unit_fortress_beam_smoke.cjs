#!/usr/bin/env node
'use strict';
// "Next unit" / N includes fortress beams only if a legal shot exists.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/hud/04-orders-and-actions.part.js','utf8');
const bundle=fs.readFileSync('dist/ui/hud.js','utf8');
const match=src.match(/function nextFleet\(\) \{[\s\S]*?\n\}(?=\nfunction refreshAndSave)/);
assert.ok(match,'Find the Next Unit cycling function');
assert.ok(bundle.includes(match[0]),'Generated HUD has the updated cycling code');
const player='britannia',game={
  player,turn:3,
  units:[{id:1,side:player,hp:200},{id:2,side:player,hp:200},
    {id:3,side:'eu',hp:200}],
  stations:[
    {id:11,name:'Stonehenge',owner:player,fort:true,shield:300,gunReady:2,targets:[{c:4,r:4}]},
    {id:12,name:'Exhausted',owner:player,fort:true,shield:300,gunReady:5,targets:[{c:5,r:5}]},
    {id:13,name:'Out of range',owner:player,fort:true,shield:300,gunReady:1,targets:[]},
    {id:14,name:'Collapsed',owner:player,fort:true,shield:0,gunReady:1,targets:[{c:6,r:6}]},
    {id:15,name:'Hostile',owner:'eu',fort:true,shield:300,gunReady:1,targets:[{c:2,r:2}]}
  ]
};
const calls=[],messages=[];
const ctx={
  game,
  selection:null,
  readyIds:new Set([1,2]),
  ownUnits:()=>game.units.filter(u=>u.hp>0&&u.side===player),
  E:{fortressTargets:(g,s)=>s.owner===g.player&&s.fort&&s.shield>0&&
    s.gunReady<=g.turn?s.targets:[]},
  selectUnit:(id,center)=>{assert.equal(center,true);calls.push(['unit',id]);ctx.selection={kind:'unit',id};},
  selectStation:(id,center)=>{assert.equal(center,true);calls.push(['station',id]);ctx.selection={kind:'station',id};},
  toast:s=>messages.push(s)
};
vm.createContext(ctx);
vm.runInContext(match[0],ctx);
ctx.nextFleet();
assert.deepEqual(calls.at(-1),['unit',1]);
ctx.nextFleet();
assert.deepEqual(calls.at(-1),['unit',2]);
ctx.nextFleet();
assert.deepEqual(calls.at(-1),['station',11],
  'Ready fortress joins after normal ready units');
ctx.nextFleet();
assert.deepEqual(calls.at(-1),['unit',1],
  'Cycling wraps after a fortress without selecting unavailable cities');
ctx.selection={kind:'station',id:11};
ctx.readyIds.clear();
ctx.nextFleet();
assert.deepEqual(calls.at(-1),['station',11],
  'A ready fortress appears even when all normal units have acted');
game.stations[0].gunReady=5; // Battery fired; it should no longer appear.
ctx.nextFleet();
assert.ok(messages.at(-1).includes('fortress batteries'),'No-ready toast covers both');
assert.deepEqual(calls.at(-1),['station',11],'No unusable fortress is selected');
game.stations[0].gunReady=1;game.stations[0].targets=[];
ctx.nextFleet();
assert.ok(messages.length>=2,'Charged fortress without a target cannot be cycled');
game.stations[0].targets=[{c:4,r:4}];
game.stations[0].owner='eu';
ctx.nextFleet();
assert.ok(messages.length>=3,'Captured fortress cannot be cycled');
const dock=fs.readFileSync('src/hud/05-command-dock.part.js','utf8');
assert.match(dock,/Fortress beam ready/,'City dock announces actionable beam');
assert.match(dock,/Select a red hex to fire/,'City dock explains how to fire');
console.log('Next Unit cycles ready fortress beam, skips cooldown/no target, and handles no units: PASS');

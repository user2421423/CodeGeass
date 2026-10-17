#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const E = require('../dist/engine.js');
const source = fs.readFileSync(path.join(__dirname, '../dist/ui/challenge-pass.js'), 'utf8');
let profile = {};
const queued = [];
const dialog = { innerHTML: '', querySelector: () => ({ scrollTop: 0 }) };
const sandbox = {
  E, console, modal: dialog, esc: String, focusDialog() {},
  loadProfile: () => profile,
  saveProfile: p => { profile = p; return true; },
  pendingEliteChoiceHTML: () => '',
  queueEliteReward: (p, game, key, amount, title) => {
    queued.push({ key, amount, title, difficulty: game.difficulty });
    return true;
  },
  startMenu() {}, resultDialog() {}, closeModal() {},
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'challenge-pass.js' });
const CP = vm.runInContext('CHALLENGE_PASS', sandbox);
assert.equal(CP.MAX_CP, 1850, '1,850 permanent CP');
assert.equal(CP.TRACKS.length, 16, 'six faction, eight speed, two mobilization');
assert.equal(CP.STRATEGIC.length, 12, 'six strategic achievements per era');
assert.equal(CP.MILESTONES.length, 32, '50-CP milestone spacing through 1,600 CP');
assert.equal(CP.MILESTONES.filter(x=>x.kind==='tokens').reduce((n,x)=>n+x.amount,0),6200);
assert.equal(CP.MILESTONES.filter(x=>x.kind==='fragments').reduce((n,x)=>n+x.amount,0),60);
assert.equal(CP.MILESTONES.filter(x=>x.kind==='cosmetic').length,5);
const mk = (era = 'world', difficulty = 'normal', side = 'britannia', turn = 45, id = 'run1') =>
  ({ mode: 'conquest', era, difficulty, player: side, turn, over: {winner:side}, rewardClaimId:id, units:[] });
const normal = mk();
assert.equal(CP.record(profile,normal),0,'old saves without run marker get no retroactive points');
CP.start(normal);
assert.equal(CP.record(profile,normal)>0,true);
assert.equal(CP.record(profile,normal),0,'idempotent victory recording');
assert.equal(CP.claimObjective('mastery:world:britannia').cp,10);
assert.equal(CP.claimObjective('mastery:world:britannia').ok,false,'Hard stage stays locked after Normal');
assert.equal(CP.claimObjective('speed:world:normal').cp,10);
assert.equal(CP.claimObjective('speed:world:normal').cp,15);
assert.equal(CP.claimObjective('speed:world:normal').cp,20);
assert.equal(CP.claimObjective('speed:world:hard').ok,false,'speed tracks are exact difficulty');
assert.equal(CP.claimObjective('strategy:world:no-doomsday').cp,15);
assert.equal(CP.claimObjective('strategy:world:no-doomsday').ok,false,'strategic claim is once only');
assert.equal(CP.earned(CP.state(profile)),70);
assert.equal(CP.claimMilestone(100).ok,false,'claiming unearned milestone blocked');
assert.equal(CP.claimMilestone(50).ok,true);
assert.equal(profile.tokens,200);
assert.equal(CP.claimMilestone(50).ok,false,'milestone cannot be repeated');
assert.equal(CP.claimMilestone(150).ok,false,'later milestone not unlocked');
const elite = mk('ufn2018','elite','cf',29,'run2');
CP.start(elite);
elite.challengePassRun.assigned = { zero:true, tohdoh:true, kallen:true };
elite.units = ['zero','tohdoh','kallen'].map((cmd,i)=>({id:i+1,cmd,side:'cf',hp:100,personal:true}));
const unlocked=CP.record(profile,elite);
assert.ok(unlocked>10,'Elite no-production victory qualifies all five mobilization stages');
for(let i=0;i<5;i++)assert.equal(CP.claimObjective('mobilization:ufn2018').cp,[10,15,20,25,30][i]);
assert.equal(CP.claimObjective('mobilization:ufn2018').ok,false);
assert.equal(CP.claimObjective('strategy:ufn2018:officer-safe').ok,true);
assert.equal(CP.claimObjective('strategy:ufn2018:no-high').ok,false,'assignments block No High Command');
const failed = mk('world','elite','britannia',30,'run3');CP.start(failed);
Object.assign(failed.challengePassRun,{ produced:1, eliteProduced:true, manualRepair:true,
  constructed:true, fleijaLaunch:true, officerLost:true, assigned:{cornelia:true,zero:true,suzaku:true}});
CP.record(profile,failed);
assert.equal(CP.state(profile).qualified['mobilization:world:4'],undefined,'any new frame blocks Starting Army Only');
assert.equal(CP.state(profile).qualified['strategy:world:no-repairs'],undefined,'repair violation blocks No Repairs');
const engine=E.createGame('britannia','normal','conquest',20261017,'world');
engine.phase=engine.player;engine.economy[engine.player].credits=100000;
engine.economy[engine.player].industry=100000;
CP.start(engine);
const city=engine.stations.find(s=>s.owner===engine.player);
const landType=Object.keys(E.TYPES).find(k=>E.TYPES[k].side===engine.player&&!E.TYPES[k].naval&&!E.TYPES[k].elite);
const shipType=Object.keys(E.TYPES).find(k=>E.TYPES[k].naval==='ship'&&E.TYPES[k].side===engine.player&&!E.TYPES[k].elite);
const amphibType=Object.keys(E.TYPES).find(k=>E.TYPES[k].naval==='amphibious'&&E.TYPES[k].side===engine.player&&!E.TYPES[k].elite);
assert.ok(landType && shipType && amphibType);
const land=E.newUnit(engine,landType,engine.player,city.c,city.r,3);
E.newUnit(engine,shipType,engine.player,city.c,city.r);
E.newUnit(engine,amphibType,engine.player,city.c,city.r);
assert.equal(engine.challengePassRun.produced,5,'3-stack + ship + amphib each counted');
E.recordWarEvent(engine,'fleijaLaunch',engine.player,{});
assert.equal(engine.challengePassRun.fleijaLaunch,true);
E.recordWarEvent(engine,'unitDestroyed','eu',{unitSide:engine.player,commander:'cornelia',personal:true});
assert.equal(engine.challengePassRun.officerLost,true);
const copy=E.unpackSave(E.packSave(engine));
assert.equal(copy.challengePassRun.produced,5,'audit survives save/reload');
assert.equal(copy.challengePassRun.officerLost,true);
assert.ok(land);
CP.open('mastery');
assert.match(dialog.innerHTML,/Conquest Challenge Pass/);
CP.open('rewards');
assert.match(dialog.innerHTML,/1,600 CP/);
console.log('Conquest Challenge Pass objectives, eligibility, claims, rewards, save safety and UI: PASS');

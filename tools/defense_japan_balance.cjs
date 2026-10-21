#!/usr/bin/env node
'use strict';
// Full-engine AI-vs-AI balance snapshots; keep the chosen player explicit so
// opening turn order and rival difficulty adjustments match the live game.
const {simulate,E}=require('./scenario_sim.cjs');
const scenario=E.scenarios.byId['defense-japan'];
const [player='bk',difficulty='normal',seedArg='11',turnsArg='25']=process.argv.slice(2);
const seed=Number(seedArg),turns=Number(turnsArg);
if(!scenario.sides.includes(player)||!['normal','hard','challenge','elite'].includes(difficulty)||
   !Number.isInteger(seed)||!Number.isInteger(turns)||turns<1||turns>150)
  throw Error('Usage: node tools/defense_japan_balance.cjs <bk|britannia> <normal|hard|challenge|elite> <seed> <turns>');
const {r,g}=simulate(scenario,player,difficulty,seed,turns);
const checkpoints=r.snapshots.filter(v=>[5,10,15,20,25,30,40,50].includes(v.turn));
const last=r.snapshots.at(-1)||null;
console.log('DEFENSE_JAPAN_BALANCE '+JSON.stringify({
  player,difficulty,seed,turnsCompleted:last?.turn||0,
  winner:r.winner,finalCities:last?.cities||{},
  finalUnits:last?.units||{},initialForces:r.startingForces,
  capturedCities:r.captures.length,capturesByBritannia:r.captures.filter(v=>v.to==='britannia').length,
  losses:r.losses,production:r.production,attacks:r.attacks,
  navalActions:r.navalActions,checkpoints,errors:r.errors
}));
if(r.errors.length)process.exitCode=1;

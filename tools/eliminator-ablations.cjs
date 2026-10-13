#!/usr/bin/env node
'use strict';
// Build a temporary AI bundle for a controlled ablation benchmark.
// All variants run with identical game rules, seed, engine, difficulty,
// and benchmark instrumentation; only AI tactics are varied.
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const ROOT = path.join(__dirname,'..');
const BASE = '3363c58445d0ea41535effa6fccd56862a068b74';
const ESCORT = '4fe86cb1e2979284a4015c74a5a8ee1cbeaa5ce9';
const ALLOCATION = 'c295bb54567c5ea7f8d8d42f8e83a4bcd7e71d0c';
const COMBINED = '17b1a56cfc2775b2db406bff6a3f750707a3566b';
const source = sha => cp.execFileSync('git',['show',sha+':dist/engine/ai.js'],{cwd:ROOT,encoding:'utf8',maxBuffer:10*1024*1024});
function region(s, start, end) {
  const i=s.indexOf(start), j=s.indexOf(end,i+1);
  if (i<0 || j<0) throw Error('Missing AI region: '+start+' to '+end);
  return s.slice(i,j);
}
function graft(old, fresh, start,end) {
  const chunk=region(old,start,end);
  if(fresh.includes(chunk)) return old;
  return old.replace(chunk,region(fresh,start,end));
}
function replaceSection(old,fresh,start,end){
  const from=region(old,start,end),to=region(fresh,start,end);
  if(old.split(from).length!==2)throw Error('Non unique AI section '+start);
  return old.replace(from,to);
}
const variant=process.argv[2];
if(!['current','escort','allocation','logistics','combined','original'].includes(variant)) throw Error('variant must be current,escort,allocation,logistics,combined,original');
let ai=source(variant==='original'?'7520e61a31d07196f49a929be081220bee89f9ac':BASE);
if(variant==='escort')ai=source(ESCORT);
if(variant==='combined')ai=source(COMBINED);
if(variant==='allocation')ai=replaceSection(ai,source(ALLOCATION),'  function eliminatorStationaryCities(','  function eliminatorAnchorCity(');
if(variant==='logistics'){
  const full=source(COMBINED);
  const oldConst="  const ELIMINATOR_AI = { pickupTurns: 4, maxPickupDistance: 24, maxRouteCost: 44, anchorMinimum: 75 };";
  const newConst="  const ELIMINATOR_AI = { pickupTurns: 8, maxPickupDistance: 36, maxRouteCost: 72, anchorMinimum: 75 };";
  if(!ai.includes(oldConst))throw Error('Route constants moved');
  ai=ai.replace(oldConst,newConst);
  ai=replaceSection(ai,full,'  function eliminatorProductionCity(','  function aiAssignEliminators(');
  ai=replaceSection(ai,full,'  function eliminatorCourierPlan(','  function eliminatorMobileCoverBonus(');
  ai=replaceSection(ai,full,'    const pickup = aiEliminatorPickup(g, u, memo);','    const recovery = memo.recoveries?.get(u.id);');
  const older='    while (wantsDefense() && (defenseCity = eliminatorProductionCity(g, side)) && !eliminatorReason(g, defenseCity)) {';
  const newer='    while (wantsDefense() && (defenseCity = eliminatorProductionCity(g, side, false, memo)) && !eliminatorReason(g, defenseCity)) {';
  if(!ai.includes(older))throw Error('Missing production call');
  ai=ai.replace(older,newer);
  const prepOld='    const defensePrep = wantsDefense() && !defenseCity ? eliminatorProductionCity(g, side, true) : null;';
  const prepNew='    const defensePrep = wantsDefense() && !defenseCity ? eliminatorProductionCity(g, side, true, memo) : null;';
  if(!ai.includes(prepOld))throw Error('Missing prep call');
  ai=ai.replace(prepOld,prepNew);
}
const target=path.join(ROOT,'dist/engine/ai.js');
fs.writeFileSync(target,ai);
console.log('AI_ABLATION_VARIANT',variant,ai.length);

#!/usr/bin/env node
'use strict';
// Headless, deterministic, all-AI F.L.E.I.J.A. / Eliminator benchmark.
// Run against the CURRENT dist/engine/ai.js; the Actions workflow swaps in
// the exact pre-feature AI for baseline while retaining identical game rules.
const E = require('../dist/engine.js');
const mode = process.argv[2] || '2017';
const seed = Number(process.argv[3] || 401);
const maxTurns = Number(process.argv[4] || 45);
const label = process.argv[5] || 'unspecified';
if (!['2017','2018'].includes(mode) || !Number.isInteger(seed) ||
    !Number.isInteger(maxTurns) || maxTurns < 20 || maxTurns > 120) throw Error('Invalid benchmark arguments');
const era = mode === '2017' ? 'world' : 'ufn2018';
const g = E.createGame('britannia','normal','conquest',seed,era);
// Nobody gets difficulty bonuses in Normal; all factions use rival AI in the observer simulation.
g.player = '__observer__';
const sides = mode === '2017' ? ['britannia','eu','cf'] : ['britannia','eb','cf'];
const charges = side => E.eliminatorCharges(g, side);
const units = () => g.units.flatMap(u => [u,...(u.cargo || [])]).filter(u => u.hp > 0);
const cityValue = c => 22 + (c.tier || 1) * 12 + (c.income || 0) * 3 + (c.industry || 0) * 2 +
  (c.capitalOf ? 240 : 0) + (c.project ? 130 : 0) + ((c.lab || 0) >= 3 ? 28 : 0);
const result = {
  variant: label, mode, seed, maxTurns, played: 0,
  warheads: 0, intercepted: 0, cityIntercepts: 0, carrierIntercepts: 0,
  unitsDestroyedByWarheads: 0, citiesDestroyedByWarheads: 0,
  chargesStarted: 0, pickedUp: 0, carrierLosses: 0, carrierTier1: 0, carrierOther: 0,
  relayStarted: 0, relayDelivered: 0, relayFailed: 0, relayDeliveryTurns: 0,
  chargedSideTurns: 0, carriedSideTurns: 0, waitingSideTurns: 0, buildingSideTurns: 0,
  importantCityExposure: 0, importantCityProtected: 0, weightedCityExposure: 0, weightedCityProtected: 0,
  armyExposure: 0, armyProtected: 0,
  armyValueExposed: 0, armyValueProtected: 0,
  frontValueExposed: 0, frontValueProtected: 0,
  commandsAliveAtStart: 0, commandsAliveAtEnd: 0,
  actions: { attacks:0, moves:0, deploys:0 },
  finalCities: {}, finalUnits: {}, perSide: {},
  startedTurn: {}, intercepts: [],
};
for (const side of sides) result.perSide[side] = {
  warheads:0, intercepted:0, chargesStarted:0, pickedUp:0, carrierLosses:0,
  carriedSideTurns:0, waitingSideTurns:0, importantCityProtected:0, importantCityExposure:0
};
const launchedChargeProjects = new Set();
const previous = new Map();
const armed = new Map();
const everCarried = new Set();
const initialCommanders = new Set(units().filter(u => u.cmd).map(u=>u.id));
result.commandsAliveAtStart = initialCommanders.size;
let beganAt = null;
const sample = () => {
  for (const side of sides) {
    const current = charges(side);
    if (!current.length) continue;
    result.chargedSideTurns++;
    const carried = current.filter(h => h.unit && h.ready).length;
    const waiting = current.filter(h => h.city && h.ready).length;
    result.carriedSideTurns += carried;
    result.waitingSideTurns += waiting;
    result.buildingSideTurns += current.filter(h => !h.ready).length;
    result.perSide[side].carriedSideTurns += carried;
    result.perSide[side].waitingSideTurns += waiting;
    const cities = g.stations.filter(s => s.owner === side && (s.capitalOf === side || s.tier >= 3));
    for (const s of cities) {
      const protectedByCharge = current.some(h => h.ready && E.distance(h,s,g) <= E.ELIMINATOR.range);
      const value = cityValue(s);
      result.importantCityExposure++;
      result.weightedCityExposure += value;
      result.perSide[side].importantCityExposure++;
      if (protectedByCharge) {
        result.importantCityProtected++;
        result.weightedCityProtected += value;
        result.perSide[side].importantCityProtected++;
      }
    }
    const rivals = units().filter(u => u.side !== side && u.side !== 'neutral' && E.foe(g,u.side,side));
    for (const u of units().filter(u => u.side === side)) {
      const ratio = Math.max(0.2,u.hp/Math.max(1,E.maxHP(u)));
      const nearBattle = rivals.some(v=>E.distance(v,u,g)<=7);
      const value = (40+Math.min(240,u.stack*15)+(u.cmd ? 160 : 0)) * ratio *
        (nearBattle ? 1.6 : 0.8);
      const protectedByCharge = current.some(h => h.ready && E.distance(h,u,g) <= E.ELIMINATOR.range);
      result.armyExposure++;
      result.armyValueExposed += value;
      if(nearBattle) result.frontValueExposed += value;
      if(protectedByCharge) {
        result.armyProtected++;
        result.armyValueProtected += value;
        if(nearBattle) result.frontValueProtected += value;
      }
    }
  }
};
const inspect = () => {
  for(const s of g.stations){
    const id = s.id;
    const before = previous.get(id);
    if(s.eliminatorProject && !launchedChargeProjects.has(String(id) + ':' + s.eliminatorProject.started)){
      launchedChargeProjects.add(String(id) + ':' + s.eliminatorProject.started);
      result.chargesStarted++;
      if(result.perSide[s.owner]) result.perSide[s.owner].chargesStarted++;
    }
    if(before === true && !s.eliminator && !s.eliminatorProject){
      // Every city->commander pickup leaves an armed unit within one hex and a transfer mark.
      const picked = units().some(u => u.side === s.owner && u.eliminator > 0 &&
        u.eliminatorMoved === g.turn && E.distance(u,s,g) <= 1);
      if(picked) {
        result.pickedUp++;
        if(result.perSide[s.owner]) result.perSide[s.owner].pickedUp++;
      }
    }
    previous.set(id,Boolean(s.eliminator > 0));
  }
  const live = new Set(units().map(u => u.id));
  for(const [id,side] of armed) if(!live.has(id)){
    result.carrierLosses++;
    if(result.perSide[side]) result.perSide[side].carrierLosses++;
    armed.delete(id);
  }
  for(const u of units()){
    if(u.eliminator > 0){
      armed.set(u.id,u.side);
      if(!everCarried.has(u.id)){
        everCarried.add(u.id);
        if(E.COMMANDERS[u.cmd]?.storyTier === 1) result.carrierTier1++;
        else result.carrierOther++;
      }
    } else armed.delete(u.id);
  }
};
const started = process.hrtime.bigint();
inspect();
for (let turn=1; turn<=maxTurns;turn++) {
  g.turn = turn;
  for(const side of g.order){
    if(!sides.includes(side) || !E.alive(g,side)) continue;
    if(!(turn===1 && side===g.order[0])) E.beginTurn(g,side,turn>1);
    g.over = null; // observer doesn't end on the nominated player's elimination
    E.aiProduction(g);
    inspect();
    for(const shot of g.launches || []){
      result.warheads++;
      result.perSide[side].warheads++;
      if(shot.intercepted){
        result.intercepted++;
        result.perSide[side].intercepted++;
        if(shot.eliminatorCarrier != null) result.carrierIntercepts++;
        else result.cityIntercepts++;
        result.intercepts.push({turn,attacker:side,type:shot.eliminatorCarrier!=null?'carrier':'city',target:shot.name});
      } else {
        result.unitsDestroyedByWarheads += (shot.destroyed || []).length;
        result.citiesDestroyedByWarheads += (shot.cities || []).filter(c=>c.destroyed).length;
      }
    }
    const ids = g.units.filter(u=>u.hp>0 && u.side===side && !u.attacked)
      .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id).map(u=>u.id);
    for(const id of ids){
      const u = g.units.find(v=>v.id===id && v.hp>0 && v.side===side);
      if(!u) continue;
      const events = E.aiOrder(g,id) || [];
      for (const e of events) if(e.kind==='attack') result.actions.attacks++;
      else if(e.kind==='move') result.actions.moves++;
      else if(e.kind==='deploy') result.actions.deploys++;
      inspect();
      g.over=null;
    }
  }
  if(g.fleijaDetonated != null || sides.some(side=>charges(side).length>0)){
    if(beganAt===null) beganAt=turn;
    sample();
  }
  result.played=turn;
  const living = sides.filter(side=>g.stations.some(s=>s.owner===side));
  if(living.length<=1) break;
}
result.firstEliminatorObservation=beganAt;
result.commandsAliveAtEnd = units().filter(u=>initialCommanders.has(u.id)).length;
for(const side of sides) {
  const ai=g.ai?.[side]||{};
  result.relayStarted+=(ai.eliminatorRelayStarted||0);
  result.relayDelivered+=(ai.eliminatorRelayDelivered||0);
  result.relayFailed+=(ai.eliminatorRelayFailed||0);
  result.relayDeliveryTurns+=(ai.eliminatorRelayDeliveryTurns||0);
}
result.avgRelayDeliveryTurns=result.relayDelivered ?
  +(result.relayDeliveryTurns/result.relayDelivered).toFixed(2):null;
result.armyValueProtectionRate = result.armyValueExposed ?
  +(result.armyValueProtected/result.armyValueExposed).toFixed(4) : null;
result.frontlineValueProtectionRate = result.frontValueExposed ?
  +(result.frontValueProtected/result.frontValueExposed).toFixed(4) : null;
result.cityProtectionRate=result.importantCityExposure
  ? +(result.importantCityProtected/result.importantCityExposure).toFixed(4):null;
result.weightedProtectionRate=result.weightedCityExposure
  ? +(result.weightedCityProtected/result.weightedCityExposure).toFixed(4):null;
result.armyProtectionRate=result.armyExposure
  ? +(result.armyProtected/result.armyExposure).toFixed(4):null;
result.interceptionRate=result.warheads ? +(result.intercepted/result.warheads).toFixed(4):null;
result.avgCarried=result.chargedSideTurns ? +(result.carriedSideTurns/result.chargedSideTurns).toFixed(3):0;
result.avgWaiting=result.chargedSideTurns ? +(result.waitingSideTurns/result.chargedSideTurns).toFixed(3):0;
result.finalCities=Object.fromEntries(sides.map(s=>[s,g.stations.filter(v=>v.owner===s).length]));
result.finalUnits=Object.fromEntries(sides.map(s=>[s,units().filter(v=>v.side===s).length]));
result.elapsedMs=+(Number(process.hrtime.bigint()-started)/1e6).toFixed(0);
console.log(JSON.stringify(result));

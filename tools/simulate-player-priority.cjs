#!/usr/bin/env node
'use strict';
// Headless, all-AI, paired-seed comparison. The player-designated faction is
// ALSO AI-controlled for a fair benchmark; this is not a human-skill test.
// Usage: node tools/simulate-player-priority.cjs --modes=conquest,scenario --bonuses=0,20,40,60,100 --seeds=19,91 --rounds=8
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const japan = require('../dist/scenarios.js');

const options = Object.fromEntries(process.argv.slice(2).filter(x => x.startsWith('--'))
  .map(x => x.slice(2).split(/=(.*)/s).slice(0,2)));
const csv = (name, fallback) => (options[name] || fallback).split(',').map(x => x.trim()).filter(Boolean);
const modes = csv('modes','conquest,scenario');
const bonuses = csv('bonuses','0,20,40,60,100').map(Number);
const seeds = csv('seeds','19,91').map(Number);
const rounds = Math.min(120, Math.max(1, Number(options.rounds || 8)));
const player = options.player || 'britannia';
if (bonuses.some(x => !Number.isFinite(x) || x < 0 || x > 100) ||
    seeds.some(x => !Number.isInteger(x)) || modes.some(x => !['conquest','scenario'].includes(x)))
  throw new Error('Invalid modes, bonus percentages or seeds');
function create(mode,seed) {
  if(mode==='scenario') return japan.create(player,'normal',seed);
  return E.createGame(player,'normal','conquest',seed);
}
function snapshot(g) {
  const own = g.units.filter(u=>u.hp>0&&u.side===g.player);
  return {
    cities:g.stations.filter(s=>s.owner===g.player).length,
    units:own.length,
    hp:Math.round(own.reduce((a,u)=>a+u.hp,0)),
    cityScore:g.stations.filter(s=>s.owner===g.player).reduce((a,s)=>a+(s.tier||1),0),
  };
}
function run(mode,seed,bonus) {
  const g=create(mode,seed);
  g.aiPlayerPriorityBonus=bonus/100;
  const start=snapshot(g);
  let playerAttacks=0, otherAttacks=0, playerUnitDamage=0, playerCityShieldDamage=0;
  let errors=0, roundsPlayed=0, playerFrontStrength=0, otherFrontStrength=0;
  for(let round=1;round<=rounds&&!g.over;round++) {
    roundsPlayed=round;
    for(const side of g.order) {
      if(g.over)break;
      if(!E.alive(g,side))continue;
      E.beginTurn(g,side,round>1);
      if(g.over)break;
      E.aiProduction(g);
      if(side!==g.player){
        const plan=E.aiPlan(g,side);
        for(const f of plan.fronts||[])if(f.type==='offensive'){
          const weight=f.assigned||0;
          if(f.objectives.some(o=>o.owner===g.player))playerFrontStrength+=weight;
          else otherFrontStrength+=weight;
        }
      }
      const ids=g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
        .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id).map(u=>u.id);
      for(let step=0;step<ids.length;step++) {
        if(g.over)break;
        const next=E.aiNextActor(g,ids,step);
        if(next!==step)[ids[step],ids[next]]=[ids[next],ids[step]];
        const id=ids[step];
        const owners=new Map(g.units.map(u=>[u.id,u.side]));
        const cityOwners=new Map(g.stations.map(s=>[`${s.c},${s.r}`,s.owner]));
        try{
          const events=E.aiOrder(g,id);
          if(side===g.player)continue;
          for(const a of events)if(a.kind==='attack') {
            const cityOwned=cityOwners.get(`${a.to.c},${a.to.r}`)===g.player;
            const hits=(a.hit||[]).filter(hit=>owners.get(hit.id)===g.player);
            if(cityOwned||hits.length){
              playerAttacks++;
              playerUnitDamage+=hits.reduce((sum,hit)=>sum+hit.damage,0);
              if(cityOwned)playerCityShieldDamage+=a.shieldDamage||0;
            }else otherAttacks++;
          }
        }catch(err){
          errors++;
          if(errors<=3)console.error(`AI order failed in ${mode} ${seed} ${bonus}% side ${side}: ${err.stack}`);
        }
      }
    }
    if(g.over)break;
    g.turn++;
    if(mode==='scenario')japan.onTurn(g);
  }
  return {mode,player:g.player,seed,bonus,roundsPlayed,starting:start,ending:snapshot(g),
    playerAttacks,otherAttacks,playerUnitDamage,playerCityShieldDamage,
    playerFrontStrength:Math.round(playerFrontStrength),otherFrontStrength:Math.round(otherFrontStrength),
    winner:g.over?.winner||null,errors};
}
const all=[];
for(const mode of modes)for(const seed of seeds)for(const bonus of bonuses) {
  const row=run(mode,seed,bonus);all.push(row);
  console.log('SIM_RESULT '+JSON.stringify(row));
}
console.log('SIM_SUMMARY '+JSON.stringify(
  Object.values(Object.groupBy ? Object.groupBy(all,r=>r.mode+':'+r.bonus) : all.reduce((groups,r)=>{
    (groups[r.mode+':'+r.bonus] ||= []).push(r);return groups;
  },{})).map(group=>({
    mode:group[0].mode,bonus:group[0].bonus,n:group.length,
    meanCitiesLost: +(group.reduce((a,r)=>a+r.starting.cities-r.ending.cities,0)/group.length).toFixed(2),
    meanPlayerAttacks:+(group.reduce((a,r)=>a+r.playerAttacks,0)/group.length).toFixed(2),
    meanPlayerDamage:+(group.reduce((a,r)=>a+r.playerUnitDamage+r.playerCityShieldDamage,0)/group.length).toFixed(2),
    errors:group.reduce((a,r)=>a+r.errors,0),
  }))
));

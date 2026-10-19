#!/usr/bin/env node
'use strict';
// Real engine and tactical AI turns across fixed seeds. Not a human win-rate estimate.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/missions.js');
require('../dist/campaign.js');
const seeds = [101, 202, 303, 404, 505, 606, 707, 808];
function play(id,seed) {
  const g=E.campaign.createMission(id,seed,'normal');
  for (let turn=1;turn<=20&&!g.over;turn++) {
    g.turn=turn;
    for (let i=0;i<g.order.length&&!g.over;i++) {
      const side=g.order[i];
      if(!E.alive(g,side))continue;
      if(!(turn===1&&i===0))E.beginTurn(g,side,turn>1);
      if(g.over)break;
      E.aiProduction(g);
      if(g.over)break;
      const ids=g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
        .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id)
        .map(u=>u.id);
      for(let k=0;k<ids.length&&!g.over;k++){
        const j=E.aiNextActor(g,ids,k);
        if(j>k&&j<ids.length)[ids[k],ids[j]]=[ids[j],ids[k]];
        const u=g.units.find(v=>v.id===ids[k]);
        if(!u||u.hp<=0||u.side!==side)continue;
        E.aiOrder(g,u.id);
        E.hooks.decide(g);
      }
    }
    E.hooks.decide(g);
  }
  assert.ok(g.over?.winner, id+': seeded battle did not resolve');
  return {seed,winner:g.over.winner,turn:g.turn,
    alive:g.units.filter(u=>u.hp>0&&u.side===g.player).length};
}
for(const id of ['br_tohdoh','br5','bk1']){
  const results=seeds.map(seed=>play(id,seed));
  const wins=results.filter(r=>r.winner===E.campaign.CAMPAIGNS[
    id==='bk1'?'bk_s1':'britannia_s1'].side).length;
  console.log(id+' Normal seeded AI-vs-AI: player '+wins+'/'+results.length+' wins');
  console.log(results.map(r=>r.seed+':'+r.winner+'(T'+r.turn+')').join(' '));
  if(id==='br_tohdoh')
    assert.ok(wins>=2, 'Chofu detention center must be defensible in multiple seeded AI trials');
}
console.log('Seeded Story Normal full-engine probes complete');

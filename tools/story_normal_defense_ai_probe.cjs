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

const K='bk',B='britannia';
const bk3=[
 [K,'sutherland',6,6,3,null,{normalOnly:true}],
 [K,'sutherland',6,8,3,null,{normalOnly:true}],
 [K,'glasgow',5,3,2,null,{normalOnly:true}],
];
const bk4=[...bk3,
 [K,'sutherland',7,7,3,null,{normalOnly:true}]
];
const bk5=[...bk4,
 [K,'sutherland',7,9,3,null,{normalOnly:true}]
];
const br3=[
 [B,'gloucester',17,4,3,null,{normalOnly:true,hold:2}],
 [B,'gloucester',13,8,3,null,{normalOnly:true,hold:2}],
 [B,'sutherland',11,5,3,null,{normalOnly:true,hold:2}],
];
const br4=[...br3,
 [B,'gloucester',17,9,3,null,{normalOnly:true,hold:2}]
];
const br5=[...br4,
 [B,'sutherland',14,4,3,null,{normalOnly:true,hold:2}]
];
function testVariants(id, variants) {
 const camp=E.campaign.CAMPAIGNS[id==='bk1'?'bk_s1':'britannia_s1'];
 const mission=camp.missions.find(m=>m.id===id),original=mission.units;
 for(const [name,extra,opts={}] of variants){
  mission.units=original.map(u=>{
   let v=u;
   if(opts.zero3&&u[5]==='zero'&&u[0]===K)v=[...u.slice(0,4),3,...u.slice(5)];
   if(opts.kallen3&&u[5]==='kallen'&&u[0]===K)v=[...u.slice(0,4),3,...u.slice(5)];
   if(opts.lessEnemy&&u[0]===(id==='bk1'?B:K)&&!u[5]&&u[1]===(id==='bk1'?'sutherland':'burai'))
     v=[...u.slice(0,6),{...u[6],skipNormal:true}];
   return v;
  }).concat(extra);
  const results=seeds.map(seed=>play(id,seed));
  const wins=results.filter(r=>r.winner===mission.player).length;
  const losses=results.filter(r=>r.winner!==mission.player).map(r=>r.turn);
  console.log('STORY BALANCE MATRIX '+id+' '+name+': player AI '+wins+'/8 victories; losses on turns ['+losses.join(',')+']');
 }
 mission.units=original;
}
const chofu=seeds.map(seed=>play('br_tohdoh',seed));
const chofuWins=chofu.filter(r=>r.winner==='britannia').length;
console.log('STORY BALANCE MATRIX br_tohdoh deployed '+chofuWins+'/8');
assert.ok(chofuWins>=2);
testVariants('bk1',[
 ['current',[]],
 ['+3 strong',bk3],
 ['+4 strong',bk4],
 ['+5 strong',bk5],
 ['+3 strong, Zero 3-stack',bk3,{zero3:true}],
]);
testVariants('br5',[
 ['current',[]],
 ['+3 strong defenders',br3],
 ['+4 strong defenders',br4],
 ['+5 strong defenders',br5],
]);
console.log('Finished Story Normal experimental force comparison');

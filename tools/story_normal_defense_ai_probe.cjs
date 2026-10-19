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
 const camp=E.campaign.CAMPAIGNS.britannia_s1;
 const mission=camp.missions.find(m=>m.id===id),original=mission.units,oldEvents=mission.events;
 for(const [name,extra,trim={}] of variants){
  mission.units=original.concat(extra);
  mission.events=oldEvents.map(e=>e.spawn&&trim[e.turn]?
    {...e,spawn:e.spawn.map((u,i)=>i<trim[e.turn]
      ?[...u.slice(0,6),{...(u[6]||{}),skipNormal:true}]:u)}:e);
  const results=seeds.map(seed=>play(id,seed));
  const wins=results.filter(r=>r.winner===mission.player).length;
  console.log('STORY BALANCE MATRIX '+id+' '+name+': Britannia AI '+wins+'/8 victories; '+results.map(r=>r.winner+':T'+r.turn).join(' '));
 }
 mission.units=original;mission.events=oldEvents;
}
const chofu=seeds.map(seed=>play('br_tohdoh',seed));
const chofuWins=chofu.filter(r=>r.winner==='britannia').length;
console.log('STORY BALANCE MATRIX br_tohdoh deployed '+chofuWins+'/8');
assert.ok(chofuWins>=2);
const shin=seeds.map(seed=>play('bk1',seed)),shinWins=shin.filter(r=>r.winner==='bk').length;
console.log('STORY BALANCE MATRIX bk1 adjusted '+shinWins+'/8');
assert.ok(shinWins>=3,'Shinjuku should be feasible for automated attackers');
testVariants('br5',[
 ['current',[]],
 ['+3 strong defenders',br3],
 ['+3, skip 2 turn-5 attackers',br3,{5:2}],
 ['+3, skip 1 turn-3 and 2 turn-5 attackers',br3,{3:1,5:2}],
 ['+3, skip all waves',br3,{3:2,5:2}],
 ['+5, skip 1 turn-3 and 2 turn-5 attackers',br5,{3:1,5:2}],
 ['+5, skip all waves',br5,{3:2,5:2}],
]);
console.log('Finished Story Normal experimental force comparison');

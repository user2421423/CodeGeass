#!/usr/bin/env node
'use strict';
// Marirrosa's only signature skill is full-strength area fire at any legal range.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const c=E.COMMANDERS.marirrosa;
assert.equal(c.skill,'Estrella Barrage');
assert.deepEqual(c.fx,{estrellaBarrage:true,noCounterAttack:true});
assert.equal(Object.hasOwn(c,'action'),false,'No active or extra signature skill');
assert.equal(Object.hasOwn(c,'stats'),false,'No personal damage bonus');
assert.doesNotMatch(c.desc,/Coordinated Fire|per friendly unit/i);

const distance=E.internal.dist;
function type(side,branch,range) {
  return Object.keys(E.TYPES).find(id=>{
    const t=E.TYPES[id];
    return t.side===side && t.branch===branch && !t.naval && !t.elite && !t.airship &&
      t.min<=range && t.max>=range;
  });
}
function setup(range){
  const branch=range===1?'Infantry':'Artillery';
  const friendlyType=type('eu',branch,range),enemyType=type('britannia',branch,range);
  assert.ok(friendlyType&&enemyType,'Both sides have ordinary '+branch+' with legal range '+range);
  const g=E.createGame('eu','normal','conquest',20261020,'world');
  g.units=[];g.phase='eu';
  const open=p=>p&&p.terrain==='plains'&&!E.internal.stationAt(g,p);
  let plan=null;
  for(const center of g.tiles){
    if(!open(center))continue;
    const ring=E.adjacent(g,center).filter(open);
    if(ring.length<5)continue;
    const possible=range===1?ring:ring.flatMap(p=>E.adjacent(g,p));
    for(const from of possible){
      if(!open(from)||distance(g,from,center)!==range)continue;
      const splashes=ring.filter(p=>distance(g,from,p)===range && (p.c!==from.c||p.r!==from.r));
      if(splashes.length<2)continue;
      const occupied=[from,...splashes.slice(0,2)];
      const friendly=ring.find(p=>!occupied.some(q=>q.c===p.c&&q.r===p.r));
      if(friendly){plan={center,from,splashes:splashes.slice(0,2),friendly};break;}
    }
    if(plan)break;
  }
  assert.ok(plan,'Expected clear hex cluster at range '+range);
  const attacker=E.newUnit(g,friendlyType,'eu',plan.from.c,plan.from.r,1,'marirrosa');
  const primary=E.newUnit(g,enemyType,'britannia',plan.center.c,plan.center.r,1);
  const splash=plan.splashes.map(p=>E.newUnit(g,enemyType,'britannia',p.c,p.r,1));
  const ally=E.newUnit(g,friendlyType,'eu',plan.friendly.c,plan.friendly.r,1);
  for(const u of [primary,...splash,ally])u.hp=20000; // Avoid overkill masking actual strike amount.
  return {g,attacker,primary,splash,ally};
}
for(const range of [1,2]){
  const {g,attacker,primary,splash,ally}=setup(range);
  const pr=E.preview(g,attacker.id,primary.c,primary.r);
  assert.ok(pr,'Normal attack must be legal at range '+range);
  assert.equal(pr.splash,1,'Every shot splashes exactly 100%, not a smaller class amount');
  assert.equal(pr.counterAllowed,false,'Primary enemy must not counterattack');
  const expected=splash.map(u=>{
    const hit=E.preview(g,attacker.id,u.c,u.r);
    assert.ok(hit,'Secondary targets chosen at the same legal firing distance');
    return hit.rawUnit;
  });
  const beforeHP=attacker.hp,allyHP=ally.hp;
  const result=E.attack(g,attacker.id,primary.c,primary.r);
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.counter,0,'No normal counterfire');
  assert.equal(result.oscarReaction.length,0,'No reactive Oscar counterstrike');
  assert.equal(attacker.hp,beforeHP,'Attacker survives without retaliation');
  assert.equal(ally.hp,allyHP,'Friendly neighbors are never splashed');
  assert.ok(result.hit.find(h=>h.id===primary.id&&h.damage>0),'Direct target damaged');
  for(let i=0;i<splash.length;i++){
    const hit=result.hit.find(h=>h.id===splash[i].id);
    assert.ok(hit,'All adjacent enemies are struck');
    assert.equal(hit.damage,expected[i],'Splash must do full normal damage to each enemy');
    assert.equal(splash[i].hp,20000-expected[i]);
  }
}
console.log('Marirrosa Estrella Barrage: range 1 + 2, full splash, no reactions: PASS');

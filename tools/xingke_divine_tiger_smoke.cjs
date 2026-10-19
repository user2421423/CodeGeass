#!/usr/bin/env node
'use strict';
// Real-engine regression for Divine Tiger and uncapped Perfect Counter.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const fx = E.COMMANDERS.xingke.fx;
assert.equal(Object.hasOwn(E.COMMANDERS.xingke, 'stats'), false,
  'Previous unconditional Xingke combat bonuses must be removed');
assert.deepEqual(fx, {duelist: .3, duelistTaken: .7, noCounterAttack: true,
  perfectCounter: true, counterReflect: .05});
const type = (side, branch) => Object.keys(E.TYPES).find(id => {
  const t = E.TYPES[id];
  return t.side === side && t.branch === branch && !t.naval && !t.elite &&
    t.min === 1 && t.max === 1;
});
const cfArmor = type('cf', 'Armor'), brInf = type('britannia', 'Infantry');
assert.ok(cfArmor && brInf, 'Chinese armor and Britannian Infantry are available');
function battle() {
  const g = E.createGame('cf', 'normal', 'conquest', 20261019, 'world');
  g.units = [];
  const valid = p => p.terrain === 'plains' && !E.internal.stationAt(g,p);
  const center = g.tiles.find(p => valid(p) &&
    E.adjacent(g,p).filter(valid).length >= 3);
  assert.ok(center, 'Battlefield provides three open neighboring tiles');
  const neighbors = E.adjacent(g,center).filter(valid);
  const x = E.newUnit(g,cfArmor,'cf',center.c,center.r,3);
  x.cmd = 'xingke';
  const foes = neighbors.slice(0,3).map((p) =>
    E.newUnit(g,brInf,'britannia',p.c,p.r));
  g.seed = 3891;
  return {g,x,foes};
}
const approx = (actual, expect, tolerance = .07) =>
  assert.ok(Math.abs(actual / expect - 1) < tolerance,
    'Expected ' + actual + ' to be approximately ' + expect);

// The +30% damage bonus applies only against commander-led defenders.
{
  const {g,x,foes} = battle();
  g.phase='cf';
  const target=foes[0]; target.cmd='cornelia';
  const active=E.preview(g,x.id,target.c,target.r);
  assert.ok(active && active.unit>0);
  x.expSilenced=true; // Disables signature effects without changing commander ratings.
  const ordinary=E.preview(g,x.id,target.c,target.r);
  delete x.expSilenced;
  approx(active.unit,ordinary.unit*1.3);
  target.cmd=null;
  const withoutCommander=E.preview(g,x.id,target.c,target.r);
  x.expSilenced=true;
  const withoutBonus=E.preview(g,x.id,target.c,target.r);
  delete x.expSilenced;
  assert.equal(withoutCommander.unit,withoutBonus.unit,
    'Noncommander targets get no Divine Tiger attack multiplier');
  assert.equal(active.counterAllowed,false,'Xingke denies ordinary counterattacks');
  assert.equal(active.counter,0);
  const fired=E.attack(g,x.id,target.c,target.r);
  assert.equal(fired.ok,true,fired.reason);
  assert.equal(fired.counter,0,'No actual enemy counterfire');
}

// A guard-based special retaliation must also be blocked.
{
  const {g,x,foes}=battle();g.phase='cf';
  const guard=foes[0];guard.cmd='senba';guard.held=true;guard.guardReady=true;
  const p=E.preview(g,x.id,guard.c,guard.r);
  assert.equal(p.counterAllowed,false,'Senba guard cannot bypass Divine Tiger');
  assert.equal(E.attack(g,x.id,guard.c,guard.r).counter,0);
}

// Defensive −30% only applies to commander-led attackers.
{
  const {g,x,foes}=battle();g.phase='britannia';
  const attacker=foes[0];attacker.cmd='cornelia';
  const reduced=E.preview(g,attacker.id,x.c,x.r).unit;
  x.expSilenced=true;
  const baseline=E.preview(g,attacker.id,x.c,x.r).unit;
  delete x.expSilenced;
  assert.ok(reduced>0);
  approx(reduced,baseline*.7,.1);
  attacker.cmd=null;
  const ordinary=E.preview(g,attacker.id,x.c,x.r).unit;
  x.expSilenced=true;
  const ordinaryWithout=E.preview(g,attacker.id,x.c,x.r).unit;
  delete x.expSilenced;
  assert.equal(ordinary,ordinaryWithout,'No damage reduction against ordinary attackers');
}

// Replay identical seeded attacks with Xingke's signature toggled by the
// existing expSilenced flag. Commander ratings and frame stats remain identical.
function counterTrial(silenced, twice = false) {
  const {g,x,foes}=battle();
  g.phase='britannia';
  x.expSilenced=!!silenced;
  const shots=[];
  for (const foe of foes.slice(0,twice?2:1)) {
    const preview=E.preview(g,foe.id,x.c,x.r);
    assert.ok(preview?.counterAllowed,'Xingke must be eligible to counter');
    const hp=x.hp;
    const result=E.attack(g,foe.id,x.c,x.r);
    assert.equal(result.ok,true,result.reason);
    assert.ok(x.hp>0,'Xingke must survive to retaliate');
    assert.ok(result.counter>0,'Actual counter must fire');
    shots.push({retaliation:result.counter,hpLost:hp-x.hp});
  }
  return shots;
}
{
  const standard=counterTrial(true)[0];
  const enhanced=counterTrial(false)[0];
  assert.ok(enhanced.retaliation>standard.retaliation,
    'Perfect Counter exceeds ordinary retaliation');
  assert.equal(enhanced.hpLost,standard.hpLost,'Reflection does not mitigate damage');
  const expected=Math.round(standard.retaliation/.65)+Math.round(enhanced.hpLost*.05);
  assert.ok(Math.abs(enhanced.retaliation-expected)<=3,
    'Perfect Counter restores approximately 100% attack strength and reflects 5% HP lost');
}
{
  const standard=counterTrial(true,true);
  const enhanced=counterTrial(false,true);
  assert.equal(enhanced.length,2);
  for(let i=0;i<2;i++){
    assert.equal(enhanced[i].hpLost,standard[i].hpLost);
    const expected=Math.round(standard[i].retaliation/.65)+
      Math.round(enhanced[i].hpLost*.05);
    assert.ok(Math.abs(enhanced[i].retaliation-expected)<=3,
      'Every counter, including the second in one turn, is full strength plus 5% reflection');
  }
}
console.log('Xingke Divine Tiger, no retaliation, perfect counter and repeated reflection: PASS');

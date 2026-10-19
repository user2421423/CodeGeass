#!/usr/bin/env node
'use strict';
// Zero: one shared once-per-turn command with allied fresh activation OR
// temporary enemy morale/counter suppression; no passive commander aura.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../dist/engine.js');
const C = E.COMMANDERS.zero;
assert.equal(C.skill, 'Geass Absolute Command');
assert.equal(C.action.name, 'Geass Absolute Command');
assert.equal(C.action.cooldown, 0);
assert.deepEqual(C.fx, {}, 'Zero has no passive skills or damage aura');
assert.equal(Object.hasOwn(C, 'stats'), false, 'No permanent combat modifiers');

const dist = E.internal.dist;
const type = (side,branch) => Object.keys(E.TYPES).find(id => {
  const t = E.TYPES[id];
  return t.side === side && t.branch === branch && !t.naval && !t.elite && t.min === 1 && t.max === 1;
});
const bkArt = type('bk','Artillery'), bkInf = type('bk','Infantry'), brInf = type('britannia','Infantry');
assert.ok(bkArt && bkInf && brInf, 'Both sides need standard units');
function setup(){
  const g=E.createGame('bk','normal','conquest',20261019,'world');
  g.units=[];g.phase='bk';
  const clear=p=>p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length>=5&&
    E.within(g,p,3).filter(clear).length>=28);
  assert.ok(center,'Need an open region');
  const pick=(radius,predicate=()=>true)=>E.within(g,center,radius).find(p=>clear(p)&&
    dist(g,center,p)===radius&&!E.internal.unitAt(g,p)&&predicate(p));
  const zero=E.newUnit(g,bkArt,'bk',center.c,center.r,1,'zero');
  const p1=pick(1);assert.ok(p1);
  const ally=E.newUnit(g,bkInf,'bk',p1.c,p1.r);
  const p2=pick(2,p=>dist(g,p,ally)===1);
  assert.ok(p2,'Enemy must be in second ring and adjacent to ally');
  const enemy=E.newUnit(g,brInf,'britannia',p2.c,p2.r);
  const p3=pick(3);assert.ok(p3);
  const outside=E.newUnit(g,brInf,'britannia',p3.c,p3.r);
  return {g,zero,ally,enemy,outside};
}
// No passive attack aura: the same attack preview with Zero silenced.
{
  const b=setup();
  const withZero=E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  assert.ok(withZero&&withZero.unit>0,'Ally can attack nearby enemy');
  b.zero.expSilenced=true;
  const withoutZero=E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  delete b.zero.expSilenced;
  assert.equal(withZero.unit,withoutZero.unit,'Zero grants no +10% or default +8% damage aura');
}
// Friendly mode: kill chains and heavy movement counters are reset; once-per-turn
// commander/elite perks remain stamped. Zero himself is never a valid target.
{
  const b=setup();
  assert.ok(!E.actionTargets(b.g,b.zero).some(v=>v.id===b.zero.id));
  b.ally.moved=b.ally.attacked=true;
  b.ally.chain=7;
  b.ally.moveActionTurn=b.g.turn;
  b.ally.moveActionsThisTurn=2;
  b.ally.movedDistance=6;
  b.ally.eliteMoveAfterKill=true;
  b.ally.aceTurn=b.g.turn;
  b.ally.expVincentMoveTurn=b.g.turn;
  b.ally.expAkitoMoveTurn=b.g.turn;
  b.zero.feintCD=2; // legacy save with old three-turn Tactical Command
  assert.equal(E.feintReason(b.g,b.zero),null,'No legacy multi-turn cooldown');
  const bad=E.feint(b.g,b.zero.id,b.zero.id);
  assert.equal(bad.ok,false,'Cannot refresh Zero himself');
  assert.equal(b.zero.feintUsedTurn,undefined,'Invalid targeting does not consume the command');
  const result=E.feint(b.g,b.zero.id,b.ally.id);
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.affected,1);
  assert.equal(b.ally.moved,false);
  assert.equal(b.ally.attacked,false);
  assert.equal(b.ally.chain,0,'Kill chain resets, regardless of prior kills');
  assert.equal(b.ally.moveActionsThisTurn,0,'Heavy-frame movement counter resets');
  assert.equal(b.ally.movedDistance,0);
  assert.equal(b.ally.eliteMoveAfterKill,false);
  assert.equal(b.ally.aceTurn,b.g.turn,'Kallen Ace stamp remains used');
  assert.equal(b.ally.expVincentMoveTurn,b.g.turn,'Elite stamp remains used');
  assert.equal(b.ally.expAkitoMoveTurn,b.g.turn,'Akito stamp remains used');
  assert.ok(E.reachable(b.g,b.ally).size>0,'Ally gets full legal movement');
  const shot=E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  assert.ok(shot&&shot.unit>0,'Ally has another attack');
  assert.equal(E.feint(b.g,b.zero.id,b.enemy.id).ok,false,'Enemy mode shares the same use');
  assert.match(E.feintReason(b.g,b.zero),/Already used this turn/);
  b.g.turn++;
  b.ally.moved=true;
  assert.equal(E.feintReason(b.g,b.zero),null,'Zero recharges on next turn');
}
// Enemy mode: two morale levels, but no lower than -2, no counterattacks
// (including reaction counters), and no friendly activation the same turn.
{
  const b=setup();
  const before=E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  assert.equal(before.counterAllowed,true,'Adjacent enemy normally counters');
  const r=E.feint(b.g,b.zero.id,b.enemy.id);
  assert.equal(r.ok,true,r.reason);
  assert.equal(b.enemy.morale,-2,'Steady enemy loses exactly two levels');
  assert.equal(b.enemy.expZeroGeass.moraleLost,2);
  const after=E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  assert.equal(after.counterAllowed,false,'Enemy cannot counterattack');
  assert.equal(after.counter,0);
  assert.equal(E.feint(b.g,b.zero.id,b.ally.id).ok,false,'Friendly mode shares the use');
  E.beginTurn(b.g,'britannia',false);
  assert.equal(b.enemy.expZeroGeass,undefined,'Suppression expires at enemy turn start');
  assert.ok(b.enemy.morale>=-1,'Temporary morale penalty was lifted before normal recovery');
  const recovered=E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r);
  assert.equal(recovered.counterAllowed,true,'Enemy can counterattack again');
}
// Caps, morale protection and range validation.
for(const [initial,expected] of [[1,-1],[-1,-2],[-2,-2],[-3,-3]]){
  const b=setup();b.enemy.morale=initial;
  assert.equal(E.feint(b.g,b.zero.id,b.enemy.id).ok,true);
  assert.equal(b.enemy.morale,expected,'Initial morale '+initial+' must cap correctly');
}
{
  const b=setup();
  b.enemy.moraleWard={side:'britannia'};
  assert.equal(E.feint(b.g,b.zero.id,b.enemy.id).ok,true);
  assert.equal(b.enemy.morale,0,'Morale immunity respected');
  assert.equal(E.preview(b.g,b.ally.id,b.enemy.c,b.enemy.r).counterAllowed,false,
    'Counterattack suppression remains useful against morale-immune enemies');
}
{
  const b=setup();
  assert.equal(E.feint(b.g,b.zero.id,b.outside.id).ok,false,'Third-ring enemy is not targetable');
  assert.equal(b.zero.feintUsedTurn,undefined);
}
// User-facing picker must expose both modes and share the same target action.
const ui=fs.readFileSync(require.resolve('../dist/ui/dialogs.js'),'utf8');
assert.match(ui,/Select an ally or enemy/);
assert.match(ui,/Ally · Reset actions/);
assert.match(ui,/Enemy · Suppress counters/);
console.log('Zero Geass Absolute Command: PASS');

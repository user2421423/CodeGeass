#!/usr/bin/env node
'use strict';
// Regression for Villetta's replacement signature skill. Requires built dist/engine.js.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const C = E.COMMANDERS.villetta;
assert.equal(C.skill, 'Purist Interception');
assert.equal(Object.hasOwn(C, 'stats'), false, 'Remove the old passive crit bonus');
assert.deepEqual(C.fx, {adjacentCommanderlessIntercept:true, vsCommanderless:.15},
  'Remove Elite Pursuit and retain only the approved new effects');

const hex = p => p.c+','+p.r;
const distance = E.internal.dist;
const ground = (side, branch) => Object.keys(E.TYPES).find(id=>{
  const t=E.TYPES[id];
  return t.side===side&&t.branch===branch&&!t.naval&&!t.elite&&t.min===1&&t.max===1;
});
const brArmor=ground('britannia','Armor'),bkInf=ground('bk','Infantry');
assert.ok(brArmor&&bkInf,'Britannian armor and BK infantry exist');
function base(){
  const g=E.createGame('britannia','normal','conquest',20261020,'world');
  g.units=[];g.phase='bk';
  const clear=p=>p&&p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length>=5);
  assert.ok(center,'Need open ground');
  const villetta=E.newUnit(g,brArmor,'britannia',center.c,center.r,1,'villetta');
  return {g,center,villetta,clear};
}
function entrant(b,command=null,except=[]){
  const {g,center,clear}=b;
  for(const dest of E.adjacent(g,center).filter(clear)){
    if(except.some(p=>hex(p)===hex(dest))||E.internal.unitAt(g,dest))continue;
    const starts=E.within(g,center,2).filter(p=>clear(p)&&distance(g,center,p)===2&&
      distance(g,p,dest)===1&&!E.internal.unitAt(g,p));
    for(const start of starts){
      const unit=E.newUnit(g,bkInf,'bk',start.c,start.r,1,command);
      if(E.reachable(g,unit).has(hex(dest)))return {unit,start,dest};
      g.units.splice(g.units.indexOf(unit),1);
    }
  }
  throw Error('Cannot find legal approach into Villetta adjacency');
}
const approx=(actual,expected)=>assert.ok(Math.abs(actual/expected-1)<.04,
  'Expected '+actual+' to be about '+expected);

// Target-specific damage bonus; commander-led enemies must not benefit.
{
  const b=base();
  const dest=E.adjacent(b.g,b.center).find(b.clear);
  const target=E.newUnit(b.g,bkInf,'bk',dest.c,dest.r);
  b.g.phase='britannia';
  const enhanced=E.preview(b.g,b.villetta.id,dest.c,dest.r);
  assert.ok(enhanced&&enhanced.unit>0,'Villetta can attack ordinary enemies');
  b.villetta.expSilenced=true;
  const ordinary=E.preview(b.g,b.villetta.id,dest.c,dest.r);
  delete b.villetta.expSilenced;
  approx(enhanced.unit,ordinary.unit*1.15);
  assert.equal(enhanced.crit,ordinary.crit,'Old +10-point critical bonus is gone');
  target.cmd='zero';
  const led=E.preview(b.g,b.villetta.id,dest.c,dest.r);
  b.villetta.expSilenced=true;
  const silenced=E.preview(b.g,b.villetta.id,dest.c,dest.r);
  delete b.villetta.expSilenced;
  assert.equal(led.unit,silenced.unit,'Commander-led target receives no bonus');
}
// An enemy entering adjacency triggers a full free strike even if Villetta
// already attacked. No counterfire is generated and no action is consumed.
{
  const b=base();const e=entrant(b);
  const hunterHP=b.villetta.hp,enemyHP=e.unit.hp;
  b.villetta.attacked=true;b.villetta.moved=true;
  const result=E.move(b.g,e.unit.id,e.dest.c,e.dest.r);
  assert.equal(result.ok,true,result.reason);
  assert.ok(result.hostileReaction,'Interception reported as a hostile reaction');
  assert.ok(e.unit.hp<enemyHP,'Enemy loses HP on entering adjacency');
  assert.equal(b.villetta.hp,hunterHP,'Enemy never counterfires');
  assert.equal(b.villetta.attacked,true,'Normal attack flag is unchanged');
  assert.equal(b.villetta.moved,true,'Normal movement flag is unchanged');
  assert.equal(e.unit.expVillettaInterceptedTurn,b.g.turn,'Target is stamped once');
  // A different commanderless formation may trigger in the very same turn.
  const next=entrant(b,null,[e.dest]);
  const nextHP=next.unit.hp;
  const r=E.move(b.g,next.unit.id,next.dest.c,next.dest.r);
  assert.equal(r.ok,true,r.reason);
  assert.ok(next.unit.hp<nextHP,'Second enemy is also intercepted');
  assert.equal(b.villetta.hp,hunterHP);
  assert.equal(b.villetta.attacked,true);
  // Moving an already-intercepted enemy into another adjacent tile must not
  // trigger the same target twice on a turn.
  const second=E.adjacent(b.g,b.center).find(p=>b.clear(p)&&hex(p)!==hex(e.dest)&&
    !E.internal.unitAt(b.g,p)&&distance(b.g,p,e.dest)===1);
  assert.ok(second,'An empty adjacent step is available');
  e.unit.moved=false;
  const lastHP=e.unit.hp;
  const repeat=E.move(b.g,e.unit.id,second.c,second.r);
  assert.equal(repeat.ok,true,repeat.reason);
  assert.equal(e.unit.hp,lastHP,'A target cannot trigger twice in one turn');
}
// Commander-led enemies never trigger, nor do commanderless enemies when
// Villetta is silenced.
for(const [command,silence] of [['zero',false],[null,true]]){
  const b=base(),e=entrant(b,command);
  b.villetta.expSilenced=silence;
  const before=e.unit.hp;
  const result=E.move(b.g,e.unit.id,e.dest.c,e.dest.r);
  assert.equal(result.ok,true,result.reason);
  assert.equal(e.unit.hp,before,
    command?'Commander-led enemy must be immune':'Silenced Villetta cannot intercept');
  assert.equal(!!result.hostileReaction,false);
}
console.log('Villetta Purist Interception, commanderless bonus, free attacks, no counterfire: PASS');

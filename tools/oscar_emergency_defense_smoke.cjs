#!/usr/bin/env node
'use strict';
// Oscar: free full-strength guard retaliation, targeted moving protection,
// and a free 3-point reposition that preserves normal movement/attack.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const C=E.COMMANDERS.oscar;
assert.equal(C.skill,"Guard's Counterstrike / Emergency Defense");
assert.equal(C.action.kind,'oscarDefense');
assert.equal(C.action.cooldown,0);
assert.deepEqual(C.fx,{guardCounterstrike:true,oscarGuardAura:.9},'Old Shield of wZERO is replaced with new passive guard aura');
assert.equal(Object.hasOwn(C,'stats'),false,'No old personal combat bonuses');
const d=E.internal.dist, hex=p=>p.c+','+p.r;
const type=(side,branch)=>Object.keys(E.TYPES).find(k=>{
  const t=E.TYPES[k];return t.side===side&&t.branch===branch&&!t.naval&&!t.elite&&t.min===1&&t.max===1;
});
const euArmor=type('eu','Armor'), euInf=type('eu','Infantry'), brInf=type('britannia','Infantry');
assert.ok(euArmor&&euInf&&brInf,'Standard armor and infantry must exist');
function setup(){
  const g=E.createGame('eu','normal','conquest',20261020,'world');
  g.units=[];g.phase='eu';
  const clear=p=>p&&p.terrain==='plains'&&!E.internal.stationAt(g,p);
  const center=g.tiles.find(p=>clear(p)&&E.adjacent(g,p).filter(clear).length===6&&
    E.within(g,p,3).filter(clear).length>=30);
  assert.ok(center,'Need sufficiently open terrain');
  const o=E.newUnit(g,euArmor,'eu',center.c,center.r,1,'oscar');
  const ap=E.adjacent(g,center).find(clear);
  const protectedUnit=E.newUnit(g,euInf,'eu',ap.c,ap.r,2);
  const ep=E.adjacent(g,center).find(p=>clear(p)&&
    d(g,p,protectedUnit)===1&&!E.internal.unitAt(g,p));
  assert.ok(ep,'Need common adjacent enemy');
  const enemy=E.newUnit(g,brInf,'britannia',ep.c,ep.r);
  const supportHex=E.within(g,protectedUnit,2).find(p=>clear(p)&&
    d(g,protectedUnit,p)===2&&d(g,p,ep)===1&&d(g,p,center)<=2&&
    !E.internal.unitAt(g,p));
  assert.ok(supportHex,'Need ally within exactly two hexes of protected unit');
  const support=E.newUnit(g,euInf,'eu',supportHex.c,supportHex.r);
  const outsideHex=E.within(g,protectedUnit,4).find(p=>clear(p)&&
    d(g,protectedUnit,p)>=3&&d(g,center,p)>=3&&!E.internal.unitAt(g,p));
  assert.ok(outsideHex);
  const outside=E.newUnit(g,euInf,'eu',outsideHex.c,outsideHex.r);
  const outsideEnemyHex=E.adjacent(g,outsideHex).find(p=>clear(p)&&!E.internal.unitAt(g,p));
  assert.ok(outsideEnemyHex,'Need hostile formation adjacent to uncovered ally');
  const outsideEnemy=E.newUnit(g,brInf,'britannia',outsideEnemyHex.c,outsideEnemyHex.r);
  return {g,o,protectedUnit,enemy,support,outside,outsideEnemy,clear};
}
function near(x,y,tolerance=.07){assert.ok(x>0&&Math.abs(x/y-1)<tolerance,
  'Expected '+x+' to be approximately '+y);}
{
  const b=setup();
  assert.ok(E.actionTargets(b.g,b.o).some(x=>x.id===b.protectedUnit.id));
  assert.ok(!E.actionTargets(b.g,b.o).some(x=>x.id===b.o.id),'Cannot designate Oscar himself');
  const shot=(unit,attacker)=>E.preview(b.g,attacker.id,unit.c,unit.r).unit;
  assert.ok(d(b.g,b.o,b.support)<=2,'Support ally is within Oscar passive aura');
  assert.ok(d(b.g,b.o,b.outside)>2,'Outside ally is outside Oscar passive aura');
  const passive={
    marked:shot(b.protectedUnit,b.enemy),
    support:shot(b.support,b.enemy),
    outside:shot(b.outside,b.outsideEnemy)
  };
  // A disabled Oscar is the reference for normal unprotected damage.
  b.o.expSilenced=true;
  const unprotected={
    marked:shot(b.protectedUnit,b.enemy),
    support:shot(b.support,b.enemy),
    outside:shot(b.outside,b.outsideEnemy)
  };
  delete b.o.expSilenced;
  near(passive.marked,unprotected.marked*.9);
  near(passive.support,unprotected.support*.9);
  assert.equal(passive.outside,unprotected.outside,'Oscar passive does not protect distant allies');
  // Active ability strengthens its one target from 10% to 20%; it does not
  // spread any reduction from the selected target.
  const result=E.feint(b.g,b.o.id,b.protectedUnit.id);
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.reposition,3);
  assert.equal(b.protectedUnit.expOscarDefense.source,b.o.id);
  assert.equal(b.protectedUnit.expOscarReposition,true);
  near(shot(b.protectedUnit,b.enemy),unprotected.marked*.8);
  assert.equal(shot(b.support,b.enemy),passive.support,
    'Nearby Oscar allies stay at 10%, not an active-dependent bonus');
  assert.equal(shot(b.outside,b.outsideEnemy),passive.outside,
    'No aura is emitted from the marked ally');
  assert.equal(E.feint(b.g,b.o.id,b.support.id).ok,false,'Once per turn');
  // Test save roundtrip while both buffs remain active.
  const loaded=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(b.g))));
  assert.ok(loaded);
  assert.equal(loaded.units.find(u=>u.id===b.protectedUnit.id).expOscarDefense.source,b.o.id);
  assert.equal(loaded.units.find(u=>u.id===b.protectedUnit.id).expOscarReposition,true);
  E.beginTurn(b.g,'britannia',false);
  assert.ok(b.protectedUnit.expOscarDefense,'Defense persists through the enemy turn');
  assert.equal(b.protectedUnit.expOscarReposition,undefined,
    'Unused free reposition expires with the recipient faction turn');
  E.beginTurn(b.g,'eu',false);
  assert.equal(b.protectedUnit.expOscarDefense,undefined,
    'Protection expires at the start of next friendly turn');
}
{
  const b=setup();
  const ally=b.protectedUnit;
  assert.equal(E.feint(b.g,b.o.id,ally.id).ok,true);
  ally.moved=ally.attacked=true;
  const options=E.reachable(b.g,ally);
  assert.ok(options.size>0,'Reposition works even after movement and attack');
  const dest=[...options.keys()].map(k=>{const [c,r]=k.split(',').map(Number);return E.tile(b.g,c,r)})
    .find(p=>b.clear(p)&&!E.internal.unitAt(b.g,p)&&d(b.g,p,ally)>0);
  assert.ok(dest);
  const r=E.move(b.g,ally.id,dest.c,dest.r);
  assert.equal(r.ok,true,r.reason);
  assert.equal(ally.moved,true,'Reposition does not refund spent normal movement');
  assert.equal(ally.attacked,true,'Reposition does not refund spent attack');
  assert.equal(ally.expOscarReposition,undefined,'Free reposition is consumed once');
  assert.equal(E.reachable(b.g,ally).size,0,'No duplicate reposition');
}
{
  const b=setup(),ally=b.protectedUnit;
  assert.equal(E.feint(b.g,b.o.id,ally.id).ok,true);
  const dest=[...E.reachable(b.g,ally).keys()].map(k=>{
    const [c,r]=k.split(',').map(Number);return E.tile(b.g,c,r)
  }).find(p=>b.clear(p)&&!E.internal.unitAt(b.g,p));
  assert.ok(dest);
  const r=E.move(b.g,ally.id,dest.c,dest.r);
  assert.equal(r.ok,true,r.reason);
  assert.equal(ally.moved,false,'Free reposition does not spend unused normal movement');
  assert.equal(ally.attacked,false,'Free reposition does not spend unused attack');
  assert.ok(E.reachable(b.g,ally).size>0,'Ordinary movement still available');
}

// The active target's former 10% radius MUST NOT grant damage reduction
// to allies outside Oscar's own passive two-hex radius.
{
  const b=setup();
  const g=b.g;
  const remoteHex=E.within(g,b.protectedUnit,2).find(p=>
    b.clear(p)&&d(g,b.protectedUnit,p)<=2&&d(g,b.o,p)>2&&
    !E.internal.unitAt(g,p)&&E.adjacent(g,p).some(q=>b.clear(q)&&!E.internal.unitAt(g,q)));
  assert.ok(remoteHex,'Find an ally outside Oscar but near the marked ally');
  const remote=E.newUnit(g,euInf,'eu',remoteHex.c,remoteHex.r);
  const ep=E.adjacent(g,remoteHex).find(p=>b.clear(p)&&!E.internal.unitAt(g,p));
  const foe=E.newUnit(g,brInf,'britannia',ep.c,ep.r);
  const initial=E.preview(g,foe.id,remote.c,remote.r).unit;
  assert.ok(initial>0);
  assert.equal(E.feint(g,b.o.id,b.protectedUnit.id).ok,true);
  assert.equal(E.preview(g,foe.id,remote.c,remote.r).unit,initial,
    'Marked formation does not project an active 10% protection aura');
}
// Guard's Counterstrike uses Oscar's full ordinary damage and cannot
// counterattack again or consume his own attack.
function guardTrial(disabled=false,repeat=false){
  const b=setup();
  const {g,o,protectedUnit,enemy}=b;
  protectedUnit.morale=-3; // Suppress regular defender counterfire.
  enemy.hp=9000; // Keep the same enemy alive for repeated-attack test.
  if(disabled)o.expSilenced=true;
  o.attacked=o.moved=true;
  g.phase='britannia';
  const before=enemy.hp,oscarHP=o.hp;
  const target={c:protectedUnit.c,r:protectedUnit.r};
  const first=E.attack(g,enemy.id,target.c,target.r);
  assert.equal(first.ok,true,first.reason);
  assert.equal(o.hp,oscarHP,'Guard counterstrike never invites enemy retaliation');
  assert.equal(o.attacked,true,'Guard counterstrike never spends normal attack');
  assert.equal(o.moved,true,'Guard counterstrike does not consume movement');
  if(!disabled) {
    assert.equal(first.oscarReaction.length,1,'Guard fires on enemy attack');
    assert.equal(first.oscarReaction[0].oscar,o.id);
  } else assert.equal(first.oscarReaction.length,0,'Silencing disables Guard');
  if(repeat){
    enemy.attacked=false;enemy.moved=false;
    const hp=enemy.hp;
    const second=E.attack(g,enemy.id,target.c,target.r);
    assert.equal(second.ok,true,second.reason);
    assert.equal(second.oscarReaction.length,0,'One reaction per distinct enemy per turn');
    assert.equal(enemy.hp,hp,'No second Oscar volley against same enemy');
  }
  return {damage:before-enemy.hp};
}
{
  const enabled=guardTrial(false).damage,disabled=guardTrial(true).damage;
  assert.ok(enabled>disabled,'Full-strength reaction deals additional damage');
  guardTrial(false,true);
}
console.log('Oscar full Guard Counterstrike, Emergency Defense, 3-point free move and save/turn expiry: PASS');

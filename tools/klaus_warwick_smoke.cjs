#!/usr/bin/env node
'use strict';
// Klaus Warwick: city/shipyard production and emergency rescue (repairs transferred to Anna).
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const K=E.COMMANDERS.klaus;
assert.equal(K.skill,'Field Supply / Loyalty to wZERO');
assert.equal(K.fx.fieldSupply,true);
assert.equal(K.fx.klausLoyalty,true);
assert.equal(K.fx.repairSupply,undefined,'Klaus no longer discounts repairs');
assert.equal(K.fx.regen,.08);
const euScout=E.typeFor('eu','scout'),brMedium=E.typeFor('britannia','medium'),
  euMedium=E.typeFor('eu','medium');
assert.ok(euScout&&brMedium&&euMedium,'Standard faction types');
function world(){
 const g=E.createGame('eu','normal','conquest',20261020,'world');
 g.units=[];g.phase='eu';
 Object.assign(g.economy.eu,{credits:100000,industry:100000,science:100000,sakuradite:100000});
 return g;
}
const fields=['credits','industry','science','sakuradite'];
function half(p){return Object.fromEntries(fields.map(key=>[key,Math.round((p[key]||0)*.5)]))}
{
 const g=world();
 const city=g.stations.find(s=>s.owner==='eu'&&E.adjacent(g,s).some(p=>!E.isSea(p)&&!E.internal.stationAt(g,p)));
 assert.ok(city,'EU must have a factory with an adjacent land hex');
 const kp=E.adjacent(g,city).find(p=>!E.isSea(p)&&!E.internal.stationAt(g,p));
 const klaus=E.newUnit(g,euScout,'eu',kp.c,kp.r,1,'klaus');
 const base=E.price(euScout,2,g,'eu');
 assert.deepEqual(E.recruitCost(g,city,euScout,2),half(base),'Factory charges half price for new units');
 const elite=Object.keys(E.ELITE_FORCES).find(id=>E.ELITE_FORCES[id].availableTo.includes('eu')&&
   !E.TYPES[E.ELITE_FORCES[id].type].naval);
 assert.ok(elite,'An E.U. land elite exists');
 assert.deepEqual(E.eliteRecruitCost(g,city,elite),half(E.elitePrice(elite)),
   'Elite recruitment is also half price');
 const ally=E.newUnit(g,euScout,'eu',city.c,city.r);
 const rein=E.reinforceCost(euScout,g,'eu',ally),repair=E.repairCost(ally,g);
 klaus.expSilenced=true;
 const reinBase=E.reinforceCost(euScout,g,'eu',ally),repairBase=E.repairCost(ally,g);
 assert.deepEqual(rein,reinBase,'Klaus no longer discounts additional frames');
 assert.equal(repair,repairBase,'Klaus no longer discounts repairs');
 assert.deepEqual(E.recruitCost(g,city,euScout,2),base,'Disabling Klaus removes the recruitment discount');
 delete klaus.expSilenced;
 g.units=g.units.filter(v=>v.id!==ally.id);
 const before={...g.economy.eu},cost=E.recruitCost(g,city,euScout,2);
 const result=E.recruit(g,city.id,euScout,2);
 assert.ok(result.ok,result.reason||'Production succeeds');
 for(const key of fields)assert.equal(g.economy.eu[key],before[key]-cost[key],
   key+' payment must match displayed Klaus discount');
 const far=g.stations.find(s=>s.owner==='eu'&&E.internal.dist(g,s,klaus)>2);
 if(far)assert.deepEqual(E.recruitCost(g,far,euScout,1),E.price(euScout,1,g,'eu'),
   'Factory beyond 2 hexes is full price');
}
{
 const g=world();
 const open=p=>p&&!E.isSea(p)&&p.terrain==='plains'&&!E.internal.stationAt(g,p);
 const center=g.tiles.find(p=>open(p)&&E.adjacent(g,p).filter(open).length>=5);
 assert.ok(center,'An open test hex exists');
 const klaus=E.newUnit(g,euScout,'eu',center.c,center.r,1,'klaus');
 const allyHex=E.adjacent(g,center).find(open);
 const ally=E.newUnit(g,euMedium,'eu',allyHex.c,allyHex.r,3);
 const foeHex=E.adjacent(g,allyHex).find(p=>open(p)&&!E.internal.unitAt(g,p));
 assert.ok(foeHex,'An enemy can stand beside the ally');
 const enemy=E.newUnit(g,brMedium,'britannia',foeHex.c,foeHex.r);
 ally.morale=-3;
 ally.hp=Math.ceil(E.maxHP(ally)*.3)+1;
 g.phase='britannia';
 const before=E.preview(g,enemy.id,ally.c,ally.r);
 assert.ok(before&&before.unit>1&&before.unit<ally.hp,'Attack can cross threshold without killing the ally');
 const outcome=E.attack(g,enemy.id,ally.c,ally.r);
 assert.equal(outcome.ok,true,outcome.reason||'Combat succeeds');
 assert.equal(ally.expKlausLoyalty?.source,klaus.id,'Klaus rescues the ally');
 assert.equal(klaus.expKlausLoyaltyTurn,g.turn,'Once-per-turn use is stamped on Klaus');
 assert.ok(ally.hp>Math.ceil(E.maxHP(ally)*.3)-before.unit,'The ally receives healing');
 const protectedPreview=E.preview(g,enemy.id,ally.c,ally.r).unit;
 const shield=ally.expKlausLoyalty;
 delete ally.expKlausLoyalty;
 const exposedPreview=E.preview(g,enemy.id,ally.c,ally.r).unit;
 ally.expKlausLoyalty=shield;
 assert.ok(protectedPreview<exposedPreview,'Temporary combat defense reduces incoming damage');
 const saved=E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
 assert.equal(saved.units.find(u=>u.id===ally.id)?.expKlausLoyalty?.source,klaus.id,
   'Save/reload preserves active protection');
 E.beginTurn(g,'eu',false);
 assert.equal(ally.expKlausLoyalty,undefined,'Protection expires at next friendly turn');
}
console.log('Klaus Field Supply and Loyalty to wZERO: PASS');

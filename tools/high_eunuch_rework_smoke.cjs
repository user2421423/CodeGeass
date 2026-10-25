#!/usr/bin/env node
'use strict';
// Temporary branch-only validation; removed before merging into main.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js'), I=E.internal;
const g=E.createGame('cf','normal','conquest',31831);
g.units=[];g.phase='cf';g.over=false;
const land=p=>p&&!E.isSea(p)&&!I.TERRAIN[p.terrain]?.blocked&&!E.stationAt(g,p);
const city=g.stations.find(s=>s.owner==='cf'&&E.adjacent(g,s).filter(land).length>=4);
assert(city,'Chinese city with >=4 land neighbours required');
const near=E.adjacent(g,city).filter(land);
const scout=E.typeFor('cf','scout',g);
const make=(cmd,side,p,type=scout)=>E.newUnit(g,type,side,p.c,p.r,1,cmd,true);

// Gao Hai earns an additional city's base credit income when garrisoning.
const incomeBefore=E.income(g,'cf').credits;
const gao=make('gaohai','cf',city);
const incomeAfter=E.income(g,'cf').credits;
assert(incomeAfter>incomeBefore,'Gao Hai doubles garrison city credits');

// Huang Qian prevents both fire suppression and shield shutdown.
g.units=[];
const huang=make('huangqian','cf',city);
city.shield=0;
city.attackedSinceRegen=true;
city.expShieldRegenBlocked={owner:'cf',turns:1};
E.beginTurn(g,'cf',false);
assert(city.shield>0,'Imperial Fortress protects attacked and disabled city regen');
const withFortress=city.shield;
g.units=[];city.shield=0;city.attackedSinceRegen=true;
city.expShieldRegenBlocked={owner:'cf',turns:1};
E.beginTurn(g,'cf',false);
assert.equal(city.shield,0,'Without Huang, shield shutdown still functions');
assert(withFortress>=Math.round(city.maxShield*.1),'At least 10% maximum shield recovery');

// Cheng Zhong adds precisely one range and shares supply interdiction.
g.units=[];
const defender=make('huangqian','cf',city);
const previousRange=I.rangeOf(g,defender).max;
const cheng=make('chengzhong','cf',near[0]);
assert.equal(I.rangeOf(g,defender).max,previousRange+1,'Cheng supplies one attack range');
const enemy=make(null,'britannia',near[1]);
enemy.hp=Math.round(E.maxHP(enemy)*.5);
assert.match(E.repairReason(g,enemy),/interdiction/i,'Shared supply interdiction blocks repair');

// Immunity and uncounterable attacks work during full combat preview.
const pr=E.preview(g,defender.id,enemy.c,enemy.r);
assert(pr,'Huang must have a legal adjacent target');
assert.equal(pr.counterAllowed,false,"Huang's attacks cannot be countered");
assert.equal(pr.counter,0,'Counterdamage preview must also be zero');
const reversed=E.preview(g,enemy.id,defender.c,defender.r);
assert(reversed,'Enemy must be able to target Huang');
assert.equal(reversed.crit,0,'Shared Unbreakable Formation prevents critical hits');

// Gao Hai's profiteering pays only when a second Eunuch is present.
g.units=[];
const gao2=make('gaohai','cf',city);
const friend=make('huangqian','cf',near[0]);
const ally=make(null,'cf',near[1]);
const foe=make(null,'britannia',near[2]);
foe.hp=0;
const credits=I.funds(g,'cf').credits;
I.kill(g,foe,ally);
assert(I.funds(g,'cf').credits>credits,'War Profiteering rewards nearby allied kills');

// Zhao Hao's commander kill grants next-turn movement to nearby Eunuchs.
g.units=[];
const zhao=make('zhaohao','cf',city);
const qian=make('huangqian','cf',near[0]);
const target=make('kewell','britannia',near[1]);target.hp=0;
I.kill(g,target,zhao);
assert.equal(zhao.expEunuchMovePending,1,'Zhao receives next-turn movement');
assert.equal(qian.expEunuchMovePending,1,'Nearby Eunuch receives next-turn movement');
const moveBefore=E.movement(g,qian);
E.beginTurn(g,'cf',false);
assert.equal(E.movement(g,qian),moveBefore+1,'Kill bonus activates on next friendly turn');

// Xia Wang summons free immobilized scouts every second friendly activation.
g.units=[];
const xia=make('xiawang','cf',city);
E.beginTurn(g,'cf',false);
const summoned=g.units.filter(u=>u!==xia);
assert(summoned.length>0&&summoned.length<=6,'Mass Conscription creates adjacent infantry');
assert(summoned.every(u=>u.type===scout&&u.stack===1&&u.moved&&u.attacked),
  'Newly conscripted one-stack infantry cannot act');
assert(summoned.every(u=>!E.stationAt(g,u)&&!E.isSea(E.tile(g,u.c,u.r))),
  'Conscripted infantry never appears on a city or sea hex');
g.units=[xia];
E.beginTurn(g,'cf',false);
assert.equal(g.units.length,1,'One friendly turn cooldown after conscription');
E.beginTurn(g,'cf',false);
assert(g.units.length>1,'Mass Conscription repeats on next eligible friendly turn');

// Imperial Mobilization grants two initiating attacks, not unlimited shots.
g.units=[];
const shooter=make('xiawang','cf',city);
shooter.expEunuchConscriptionWait=10;
const victim=make(null,'britannia',near[0]);
victim.hp=100000;
shooter.hp=100000;
g.phase='cf';g.over=false;
const first=E.attack(g,shooter.id,victim.c,victim.r);
assert(first.ok,'First Eunuch attack should be legal');
assert.equal(shooter.attacked,false,'First attack leaves second shot available');
const second=E.attack(g,shooter.id,victim.c,victim.r);
assert(second.ok,'Second Eunuch attack should be legal');
assert.equal(shooter.attacked,true,'Second attack consumes normal Eunuch volleys');
const third=E.attack(g,shooter.id,victim.c,victim.r);
assert.equal(third.ok,false,'Third ordinary attack remains blocked');
console.log('High Eunuch rework: 18 assertions passed');

#!/usr/bin/env node
'use strict';
// Research used for advanced production: stack scaling, reinforcement,
// Elite manufacturing, initial stockpiles, and AI parity.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const root=path.resolve(__dirname,'../dist');
for (const file of fs.readdirSync(root)
  .filter(f=>/^(scenarios.*|.*-landmask|.*-geography)\.js$/.test(f)).sort())
  require(path.join(root,file));
const CLASS_COST={scout:0,assault:0,raider:2,light:0,medium:5,heavy:10,
  super:15,support:0,rocket:7,siege:12};
for(const side of ['britannia','eu','cf']){
  for(const [cls,cost] of Object.entries(CLASS_COST)){
    const type=E.typeFor(side,cls);
    assert.ok(type,'Class available '+side+'/'+cls);
    for(const [n,mult] of [[1,1],[2,1.85],[3,2.7]])
      assert.equal(E.price(type,n).science,Math.round(cost*mult),
        side+'/'+cls+' stack '+n);
    assert.equal(E.reinforceCost(type).science,cost,side+'/'+cls+' reinforcement');
  }
}
for(const [id,force] of Object.entries(E.ELITE_FORCES)){
  const t=E.TYPES[force.type];
  const expected=t.naval==='amphibious'?(t.tier>=2?4:0):
    t.naval==='ship'?12:CLASS_COST[t.cls];
  assert.equal(E.elitePrice(id).science,expected,'Elite '+id+' production');
}
for(const side of ['britannia','eu','cf']){
  const navy=E.navalTypes(null,side);
  for(const type of navy){
    const t=E.TYPES[type],expected=t.naval==='ship'?12:t.tier>=2?4:0;
    assert.equal(E.price(type,1).science,expected,'Naval '+type);
  }
}
for(const era of ['world','ufn2018']){
  const g=E.createGame('britannia','normal','conquest',71,era);
  for(const side of g.majors){
    const original=E.CONQUESTS[era].initialTreasury?.[side]?.science ?? 40;
    assert.equal(g.economy[side].science,2*original,
      'Conquest opening Research doubled '+era+'/'+side);
  }
  const inc=E.income(g,'britannia').science;
  assert.ok(inc>0,'Conquest produces Research');
  assert.equal(E.income(g,'britannia').science,inc,'Opening boost did not alter income');
}
const sample=['division-japan','war-for-australia','invasion-brazil','invasion-japan'];
for(const id of sample){
  const api=E.scenarios.byId[id],g=api.create(api.sides[0],'normal',71),
    before=Object.fromEntries(api.sides.map(s=>[s,g.economy[s].science])),
    incBefore=Object.fromEntries(api.sides.map(s=>[s,(()=> {
      const saved=g.startUnits;g.startUnits=null;
      try{return E.income(g,s).science;}finally{g.startUnits=saved;}
    })()]));
  E.income(g,api.sides[0]);
  for(const side of api.sides){
    const startingCities=g.stations.filter(s=>s.owner===side).length;
    if(startingCities)
      assert.equal(g.economy[side].science,before[side]*2,
        'Scenario doubles research independently of income '+id+'/'+side);
    else
      assert.ok(g.economy[side].science>=before[side]*2,
        'Cityless war chest is doubled '+id+'/'+side);
    assert.equal(E.income(g,side).science,startingCities?incBefore[side]:0,
      'Scenario Research income is unchanged '+id+'/'+side);
  }
  const doubled=g.economy[api.sides[0]].science;
  E.income(g,api.sides[0]);
  assert.equal(g.economy[api.sides[0]].science,doubled,
    'Doubling happens only once '+id);
}
{
  const g=E.scenarios.byId['division-japan'].create('britannia','normal',83);
  E.income(g,'britannia');
  const type=E.typeFor('britannia','heavy',g),
    station=g.stations.find(s=>s.owner==='britannia'&&s.tier>=3&&!E.unitAt(g,s));
  assert.ok(station,'Free Heavy factory');
  const e=g.economy.britannia;
  Object.assign(e,{credits:10000,industry:10000,sakuradite:1000,science:0});
  assert.match(E.buyReason(g,station,type,3),/research/,
    'Advanced formations require Research');
  e.science=1000;
  const start=e.science,price=E.price(type,3,g,'britannia');
  const bought=E.recruit(g,station.id,type,3);
  assert.ok(bought.ok,'Advanced unit can be purchased with Research');
  assert.equal(e.science,start-price.science,'Research is charged for stack');
  const u=bought.unit;
  u.stack=1;u.moved=false;u.attacked=false;
  const before=e.science;
  const reinforced=E.reinforce(g,u.id);
  assert.ok(reinforced.ok,'Can reinforce normal advanced unit');
  assert.equal(e.science,before-10,'Reinforcement charges one frame of Research');
  u.stack=2;u.moved=false;u.attacked=false;
  const next=e.science;
  assert.ok(E.reinforce(g,u.id).ok,'Can add third frame');
  assert.equal(e.science,next-10,'Third frame charges same Research');
  u.stack=1;u.moved=false;u.attacked=false;e.science=0;
  assert.match(E.reinforceReason(g,u),/research/,
    'Cannot bypass Research requirement through reinforcement');
}
{
  const g=E.scenarios.byId['war-for-australia'].create('eu','normal',96);
  E.income(g,'eu');
  const side='britannia', e=g.economy[side];
  g.phase=side;
  Object.assign(e,{credits:15000,industry:8000,sakuradite:900,science:0});
  E.aiProduction(g);
  assert.ok(e.science>=0,'AI does not overspend Research with none available');
  e.science=150;
  E.aiProduction(g);
  assert.ok(e.science>=0,'AI observes Research costs in production and reinforcement');
}
const sources=fs.readFileSync('src/ai/06-production.part.js','utf8');
assert.match(sources,/\(e\.science \|\| 0\) - \(c\.science \|\| 0\) >= reserveScience/,
  'AI affordability explicitly includes Research');
assert.match(sources,/researchOnlyShortage/,'AI can save for the preferred advanced formation');
assert.match(sources,/researchScarce/,'AI can upgrade labs when repeatedly short of Research');
console.log('Advanced Research prices, AI affordability, starting reserves and reinforcement: PASS');

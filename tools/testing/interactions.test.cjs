'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { E } = require('../scenario_sim.cjs');
const C = require('../../dist/campaign.js');
function world(side = 'britannia', era = 'world') {
  const g = E.createGame(side,'normal','conquest',417,era);
  g.phase = side; g.units = [];
  Object.assign(g.economy[side],{credits:100000,industry:100000,science:100000,sakuradite:100000});
  return g;
}
function field(g) {
  const city = g.stations.find(c => c.owner === 'eu' && !c.capital);
  for (const p of E.within(g,city,5)) if (!E.stationAt(g,p)) p.terrain = 'plains';
  const at = E.adjacent(g,city).find(p=>!E.stationAt(g,p));
  return {city,at};
}
const save = g => E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
test('city shield break refreshes breakthrough once; an empty shield cannot farm actions',()=>{
  for (const type of ['gloucester','vincent_commander','gareth']) {
    const g=world(), {city,at}=field(g), u=E.newUnit(g,type,g.player,at.c,at.r);
    // Siege artillery must fire from range two.
    if(E.TYPES[type].min===2) {
      const p=E.within(g,city,2).find(p=>E.distance(city,p,g)===2&&!E.stationAt(g,p));
      u.c=p.c;u.r=p.r;
    }
    city.shield=1;u.moved=true;
    assert.equal(E.attack(g,u.id,city.c,city.r).ok,true,type);
    assert.equal(u.attacked,!(E.TYPES[type].breakthrough||E.TYPES[type].cls==='siege'),type+' action refresh follows class');
    const chain=u.chain, rng=g.seed;
    const repeated=E.attack(g,u.id,city.c,city.r);
    assert.equal(repeated.ok,false,'cannot attack already broken empty defenses');
    assert.equal(u.chain,chain);assert.equal(g.seed,rng,'invalid attacks consume no RNG');
  }
});
test('heavy moves twice across shield break and kill; attacks continue but movement cap survives save',()=>{
  const g=world(), {city,at}=field(g);
  const start=E.adjacent(g,at).find(p=>!E.stationAt(g,p)&&E.distance(city,p,g)>1);
  const u=E.newUnit(g,'vincent_commander',g.player,start.c,start.r);
  assert.equal(E.move(g,u.id,at.c,at.r).ok,true); city.shield=1;
  assert.equal(E.attack(g,u.id,city.c,city.r).ok,true);
  const p=E.adjacent(g,at).find(p=>!E.stationAt(g,p));
  assert.equal(E.move(g,u.id,p.c,p.r).ok,true);
  const enemyAt=E.adjacent(g,p).find(t=>!E.stationAt(g,t)&&!E.unitAt(g,t));
  const victim=E.newUnit(g,'alexander_drone','eu',enemyAt.c,enemyAt.r);victim.hp=1;
  const killed=E.attack(g,u.id,victim.c,victim.r);
  assert.equal(killed.ok,true);assert.equal(killed.destroyed,true);
  assert.equal(u.attacked,false);assert.equal(E.reachable(g,u).size,0);
  const loaded=save(g), again=loaded.units.find(v=>v.id===u.id);
  assert.equal(again.moveActionsThisTurn,2);assert.equal(again.chain,u.chain);
  assert.equal(E.reachable(loaded,again).size,0);
});
test('Zero reactivation preserves heavy move-action cap and once-per-turn commander stamp',()=>{
  const g=world(), {at}=field(g), heavy=E.newUnit(g,'vincent_commander',g.player,at.c,at.r);
  const p=E.adjacent(g,at).find(p=>!E.stationAt(g,p));
  const zero=E.newUnit(g,'glasgow',g.player,p.c,p.r,1,'zero');
  heavy.moved=heavy.attacked=true;heavy.moveActionTurn=g.turn;heavy.moveActionsThisTurn=2;
  heavy.expVincentMoveTurn=g.turn;
  assert.equal(E.feint(g,zero.id,heavy.id).ok,true);
  assert.equal(heavy.attacked,false);assert.equal(E.reachable(g,heavy).size,0);
  assert.equal(heavy.expVincentMoveTurn,g.turn);
  assert.equal(E.feint(g,zero.id,heavy.id).ok,false,'signature action cannot repeat');
  const loaded=save(g), commander=loaded.units.find(u=>u.id===zero.id);
  assert.equal(E.feint(loaded,commander.id,heavy.id).ok,false,'save cannot reset cooldown');
});
test('city tier upgrade spends exact resources, survives loading and retains once-per-turn lock',()=>{
  const g=world(), city=g.stations.find(c=>c.owner===g.player&&!c.capital&&!c.fort&&E.cityTierOf(c)===1);
  const before={...g.economy[g.player]}, cost=E.cityTierCost(city);city.shield=43;
  assert.equal(E.upgradeCityTier(g,city.id).ok,true);
  for(const resource of ['credits','industry']) assert.equal(g.economy[g.player][resource],before[resource]-cost[resource]);
  const loaded=save(g), c=loaded.stations.find(c=>c.id===city.id);
  assert.equal(c.shield,43);assert.equal(E.cityTierOf(c),2);
  assert.equal(E.upgradeCityTier(loaded,c.id).ok,false);
  loaded.turn++;assert.equal(E.upgradeCityTier(loaded,c.id).ok,true);
});
test('damaged CF and UFN cargo migrate by era without losing damage or turn state',()=>{
  for(const era of ['world','ufn2018']) {
    const g=world('cf',era), sea=g.tiles.find(E.isSea), ship=E.newUnit(g,E.NAVAL[era==='world'?'cf':'bk'].carrier,'cf',sea.c,sea.r);
    const u=E.newUnit(g,E.typeFor('cf','medium',g),'cf',sea.c,sea.r);
    g.units=g.units.filter(v=>v.id!==u.id);ship.cargo=[u];
    // A saved unit predating the roster correction.
    u.type=era==='world'?'akatsuki':'chuyen_medium';u.hp=Math.round(E.maxHP(u)*.4);
    const ratio=u.hp/E.maxHP(u);u.moved=u.attacked=true;u.moveActionsThisTurn=2;u.moveActionTurn=g.turn;
    const loaded=save(g), cargo=loaded.units.find(v=>v.id===ship.id).cargo[0];
    assert.equal(cargo.type,E.typeFor('cf','medium',loaded));
    assert.ok(Math.abs(cargo.hp/E.maxHP(cargo)-ratio)<=1/E.maxHP(cargo));
    assert.equal(cargo.moved,true);assert.equal(cargo.attacked,true);assert.equal(cargo.moveActionsThisTurn,2);
    assert.deepEqual(save(loaded).units.find(v=>v.id===ship.id).cargo,[cargo],'migration is idempotent');
  }
});
test('carrier landing captures zero-shield enemy city and keeps cargo ready across loading',()=>{
  const g=world(), city=g.stations.find(c=>c.owner==='eu'&&E.adjacent(g,c).some(E.isSea));
  assert.ok(city);city.shield=0;
  const sea=E.adjacent(g,city).find(E.isSea), ship=E.newUnit(g,E.NAVAL.britannia.carrier,g.player,sea.c,sea.r);
  const u=E.newUnit(g,'gloucester',g.player,sea.c,sea.r);g.units=g.units.filter(v=>v!==u);ship.cargo=[u];
  const loaded=save(g), carrier=loaded.units.find(v=>v.id===ship.id);
  assert.equal(E.deploy(loaded,carrier.id,0,city.c,city.r).ok,true);
  assert.equal(loaded.stations.find(c=>c.id===city.id).owner,g.player);
  const landed=loaded.units.find(v=>v.id===u.id);
  assert.equal(landed.moved,false);assert.equal(landed.attacked,false);
  assert.equal(carrier.cargo.length,0);assert.equal(E.deploy(loaded,carrier.id,0,city.c,city.r).ok,false);
});
test('regional compact saves round-trip terrain, ownership and deterministic continuation',()=>{
  const scenario=E.scenarios.byId['division-japan'];
  const original=save(scenario.create('britannia','normal',11)), loaded=save(original);
  assert.deepEqual(loaded.tiles,original.tiles);
  assert.deepEqual(loaded.stations,original.stations);
  // Compare the same shipped action after serialization, including RNG state.
  const id=original.units.find(u=>u.side===original.phase&&u.hp>0).id;
  const a=E.aiOrder(original,id), b=E.aiOrder(loaded,id);
  assert.deepEqual(b,a);assert.deepEqual(loaded.units,original.units);
});
test('conquest capital loss alone does not win; last opposing cities do',()=>{
  const g=world(), capital=g.stations.find(c=>c.capital&&c.owner==='eu');capital.owner=g.player;
  E.checkVictory(g);assert.ok(!g.over);
  for(const c of g.stations)c.owner=g.player;
  for(const side of ['eu','cf'])g.fallen[side]={by:g.player,city:'test last city'};
  E.checkVictory(g);assert.equal(g.over.winner,g.player);
});
test('campaign difficulty/mastery rewards cannot be claimed again after profile persistence',()=>{
  const campaign=Object.values(C.CAMPAIGNS)[0], mission=campaign.missions[0];
  const g=C.createMission(mission.id,'normal',11);g.over={winner:g.player,stars:3};
  const profile={}, first=C.reward(g,profile);assert.ok(first.total>0);assert.ok(first.fragmentChoice>0);
  profile.campaign={ [mission.id]: 3 };
  profile.campaignDifficulty={ [mission.id]: {normal:3} };
  const persisted=JSON.parse(JSON.stringify(profile));
  const repeated=C.reward(g,persisted);
  assert.equal(repeated.total,0);assert.equal(repeated.fragmentChoice,0);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');

// A conquest where China has a ready charge waiting in a city and Britannia holds a warhead.
function setup(seed = 401) {
  const g = E.createGame('britannia', 'normal', 'conquest', seed);
  g.units = [];
  g.fleijaDetonated = 1;
  g.turn = 20;
  g.phase = 'cf';
  g.arsenal = { britannia: 1 };
  const city = g.stations.find(s => s.owner === 'cf' && s.capitalOf === 'cf') || g.stations.find(s => s.owner === 'cf');
  city.eliminator = 1;
  return { g, city };
}
const land = (g, p, d) => E.within(g, p, d).filter(t =>
  E.distance(t, p, g) === d && !E.TERRAIN[t.terrain]?.blocked && t.terrain !== 'sea' && t.terrain !== 'ocean' &&
  !E.stationAt(g, t) && !E.unitAt(g, t));
const unit = (g, side, p, cmd = null) => E.newUnit(g, E.typeFor(side, 'scout'), side, p.c, p.r, 1, cmd);

test('a waiting charge covers 3 hexes of its city, then 3 hexes of the unit that takes it', () => {
  const { g, city } = setup();
  assert.equal(E.ELIMINATOR.range, 3);
  const at3 = land(g, city, 3)[0], at4 = land(g, city, 4)[0];
  assert.ok(at3 && at4);
  assert.equal(E.eliminatorDefender(g, 'britannia', at3)?.city?.id, city.id);
  assert.equal(E.eliminatorDefender(g, 'britannia', at4), null);
  const u = unit(g, 'cf', land(g, city, 1)[0], 'xingke');
  assert.equal(E.transferEliminator(g, { city: city.id }, { unit: u.id }).ok, true);
  assert.equal(city.eliminator, 0);
  assert.equal(u.eliminator, 1);
  // Cover follows the carrier: far from the city it protects only around itself.
  const far = land(g, city, 9).find(t => land(g, t, 1).length);
  assert.ok(far);
  u.c = far.c;
  u.r = far.r;
  assert.equal(E.eliminatorDefender(g, 'britannia', city), null);
  assert.equal(E.eliminatorDefender(g, 'britannia', land(g, far, 3)[0])?.unit, u);
  assert.equal(E.eliminatorDefender(g, 'britannia', land(g, far, 4)[0] || at4), null);
});

test('an intercepting carrier spends its charge and the launch names it', () => {
  const { g, city } = setup();
  const u = unit(g, 'cf', land(g, city, 1)[0], 'xingke');
  E.transferEliminator(g, { city: city.id }, { unit: u.id });
  g.phase = 'britannia';
  const target = land(g, u, 2)[0];
  const shot = E.launch(g, 'britannia', target.c, target.r);
  assert.equal(shot.ok, true, shot.reason);
  assert.equal(shot.intercepted, true);
  assert.equal(shot.eliminatorCarrier, u.id);
  assert.match(shot.eliminatorCity, /Xingke/);
  assert.equal(u.eliminator, 0);
  assert.equal(u.hp > 0, true);
  assert.equal(g.arsenal.britannia, 0);
});

test('hand-overs need adjacency, a free holder, your own turn, and happen once per turn per charge', () => {
  const { g, city } = setup();
  const ring = land(g, city, 1);
  const a = ring.find(p => ring.some(q => E.distance(p, q, g) === 1)),
    b = ring.find(q => E.distance(a, q, g) === 1);
  assert.ok(a && b);
  const first = unit(g, 'cf', a), second = unit(g, 'cf', b);
  const far = unit(g, 'cf', land(g, city, 4)[0]);
  const rival = unit(g, 'britannia', land(g, city, 2)[0]);
  assert.match(E.transferEliminatorReason(g, { city: city.id }, { unit: far.id }), /adjacent/);
  assert.match(E.transferEliminatorReason(g, { city: city.id }, { unit: rival.id }), /own units/);
  assert.equal(E.transferEliminator(g, { city: city.id }, { unit: first.id }).ok, true);
  assert.match(E.transferEliminatorReason(g, { unit: first.id }, { unit: second.id }), /already changed hands/);
  g.turn++;
  assert.equal(E.transferEliminator(g, { unit: first.id }, { unit: second.id }).ok, true);
  assert.equal(second.eliminator, 1);
  assert.equal(first.eliminator, 0);
  g.phase = 'britannia';
  assert.match(E.transferEliminatorReason(g, { unit: second.id }, { unit: first.id }), /Not your turn/);
  g.phase = 'cf';
  city.eliminator = 1;
  assert.match(E.transferEliminatorReason(g, { city: city.id }, { unit: second.id }), /already holds/);
});

test('a destroyed carrier loses its charge and frees the slot; carried charges count toward the cap', () => {
  const { g, city } = setup();
  const u = unit(g, 'cf', land(g, city, 1)[0]);
  E.transferEliminator(g, { city: city.id }, { unit: u.id });
  const others = g.stations.filter(s => s.owner === 'cf' && s !== city).slice(0, 2);
  for (const s of others) s.eliminator = 1;
  assert.equal(E.eliminatorCharges(g, 'cf').length, 3);
  const spare = g.stations.find(s => s.owner === 'cf' && !s.eliminator && s !== city);
  spare.lab = 3;
  g.economy.cf = { credits: 99999, industry: 99999, science: 99999, sakuradite: 99999 };
  assert.match(E.eliminatorReason(g, spare), /At most 3/);
  u.hp = 0;
  E.kill(g, u, null, true);
  assert.equal(u.eliminator, 0);
  assert.equal(E.eliminatorCharges(g, 'cf').length, 2);
  assert.equal(E.eliminatorReason(g, spare), null);
});

test('a carrier aboard a Carrier-Battleship covers from the ship', () => {
  const { g, city } = setup();
  const u = unit(g, 'cf', land(g, city, 1)[0], 'xingke');
  E.transferEliminator(g, { city: city.id }, { unit: u.id });
  const sea = g.tiles.find(t => t.terrain === 'sea' && E.distance(t, city, g) > 12 && !E.unitAt(g, t));
  const ship = E.newUnit(g, E.typeFor('cf', 'carrier') || 'cf_carrier', 'cf', sea.c, sea.r);
  g.units.splice(g.units.indexOf(u), 1);
  (ship.cargo ||= []).push(u);
  assert.equal(E.eliminatorDefender(g, 'britannia', sea)?.unit, u);
  assert.equal(E.eliminatorDefender(g, 'britannia', land(g, city, 1)[1] || city), null);
});

test('saves keep carried charges', () => {
  const { g, city } = setup();
  const u = unit(g, 'cf', land(g, city, 1)[0]);
  E.transferEliminator(g, { city: city.id }, { unit: u.id });
  const loaded = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
  assert.ok(loaded);
  assert.equal(loaded.units.find(v => v.id === u.id).eliminator, 1);
  assert.equal(E.eliminatorCharges(loaded, 'cf').length, 1);
});

test('the AI reserves a strategic city charge and equips Tier 1 commanders with spare charges', () => {
  const { g, city } = setup();
  const [a, b] = land(g, city, 1);
  const plain = unit(g, 'cf', a);
  const officer = unit(g, 'cf', b, 'xingke');
  E.aiAssignEliminators(g, 'cf');
  assert.equal(city.eliminator, 1, 'a capital defense stays stationary even with a Tier 1 commander nearby');
  assert.equal(officer.eliminator || 0, 0);
  assert.equal(plain.eliminator || 0, 0);
  const remote = g.stations.filter(s => s.owner === 'cf' && s !== city && land(g, s, 1).length)
    .sort((x, y) => E.distance(y, city, g) - E.distance(x, city, g))[0];
  assert.ok(remote);
  remote.eliminator = 1;
  const escort = unit(g, 'cf', land(g, remote, 1)[0], 'zero');
  // Zero is not a Chinese commander, so use a matching Tier 1 leader instead.
  escort.cmd = 'xingke';
  E.aiAssignEliminators(g, 'cf');
  assert.equal(city.eliminator, 1, 'the capital retains its stationary charge');
  assert.equal(escort.eliminator, 1, 'a second charge travels with the Tier 1 battle leader');
  assert.equal(remote.eliminator, 0);
});

test('non-Tier 1 officers cannot take an Eliminator and coverage metrics track placement', () => {
  const { g, city } = setup();
  const officerId = Object.keys(E.COMMANDERS).find(id =>
    E.COMMANDERS[id].side === 'cf' && E.COMMANDERS[id].storyTier !== 1);
  assert.ok(officerId);
  const junior = unit(g, 'cf', land(g, city, 1)[0], officerId);
  const before = E.aiEliminatorMetrics(g, 'cf');
  assert.equal(before.stationary, 1);
  assert.equal(before.carried, 0);
  assert.ok(before.importantCitiesCovered >= 1);
  E.aiAssignEliminators(g, 'cf');
  assert.equal(junior.eliminator || 0, 0);
  const charge = E.eliminatorCharges(g, 'cf')[0];
  assert.equal(charge.city.id, city.id);
});

test('Tier 1 couriers are routed toward a waiting spare charge without revealing rival charges', () => {
  const { g, city } = setup();
  const remote = g.stations.filter(s => s.owner === 'cf' && s !== city && land(g, s, 1).length >= 2)
    .sort((x, y) => E.distance(y, city, g) - E.distance(x, city, g))[0];
  assert.ok(remote);
  remote.eliminator = 1;
  const start = land(g, remote, 3).find(p =>
    E.internal.massOf(g, p) === E.internal.massOf(g, remote));
  assert.ok(start);
  const hero = unit(g, 'cf', start, 'xingke');
  const initial = E.distance(hero, remote, g);
  const orders = E.aiOrder(g, hero.id);
  assert.ok(orders.every(o => o.kind !== 'attack'), 'collection trip never starts a battle');
  assert.ok(E.distance(hero, remote, g) < initial || hero.eliminator === 1,
    'courier makes progress toward its collection site');
});


test('the AI keeps a multi-turn Tier 1 courier assignment until the charge is collected', () => {
  const { g, city } = setup(909);
  const distant = g.stations
    .filter(s => s.owner === 'cf' && s !== city && E.internal.massOf(g, s) >= 0 && land(g, s, 9).length)
    .sort((a, b) => E.distance(b, city, g) - E.distance(a, city, g))[0];
  assert.ok(distant, 'need a second reachable Chinese city');
  distant.eliminator = 1;
  const start = land(g, distant, 9).find(t => E.internal.massOf(g, t) === E.internal.massOf(g, distant));
  assert.ok(start, 'need a reachable same-landmass starting position');
  const hero = unit(g, 'cf', start, 'xingke');
  const before = E.distance(hero, distant, g);
  E.aiOrder(g, hero.id);
  const assignment = g.ai?.cf?.eliminatorCourierAssignments?.[hero.id];
  assert.equal(assignment, distant.id, 'courier has a persisted collection objective');
  assert.ok(E.distance(hero, distant, g) < before, 'commander marches toward the charge');
  const after = E.distance(hero, distant, g);
  g.turn++;
  hero.moved = false;
  hero.attacked = false;
  E.aiOrder(g, hero.id);
  assert.ok(E.distance(hero, distant, g) < after || hero.eliminator > 0,
    'courier continues to make progress on the next turn');
});

test('Eliminator metrics value coverage of a frontline formation, not only empty cities', () => {
  const { g, city } = setup(401);
  const near = land(g,city,1);
  const hero = unit(g,'cf',near[0],'xingke');
  const ally = unit(g,'cf',near[1]);
  const covered = E.aiEliminatorMetrics(g,'cf');
  assert.ok(covered.protectedUnitValue > 0);
  assert.ok(covered.threatenedUnitValue >= covered.protectedUnitValue);
  // A charge moves with its Tier 1 commander; nearby formations benefit.
  E.transferEliminator(g,{city:city.id},{unit:hero.id});
  const moved = E.aiEliminatorMetrics(g,'cf');
  assert.equal(moved.tier1Carriers,1);
  assert.ok(moved.protectedUnitValue > 0);
  assert.ok(ally.hp > 0);
});

test('charge production and courier scoring do not select unreachable Tier 1 leaders', () => {
  const {g,city}=setup(401);
  const spare = g.stations.find(s=>s.owner==='cf' && s!==city &&
    E.internal.massOf(g,s)!==E.internal.massOf(g,city) && land(g,s,1).length);
  if(!spare)return; // A map without a second landmass cannot exercise this fixture.
  spare.eliminator=1;
  const hero=unit(g,'cf',land(g,city,1)[0],'xingke');
  E.aiOrder(g,hero.id);
  assert.notEqual(g.ai?.cf?.eliminatorCourierAssignments?.[hero.id],spare.id);
  assert.equal(hero.eliminator||0,0);
});

test('frontline hero receives a charge via ordinary courier without leaving the battlefield', () => {
  const {g,city}=setup(401);
  const remote=g.stations.filter(s=>s.owner==='cf' && s!==city &&
    E.internal.massOf(g,s)>=0 && land(g,s,1).length>0 && land(g,s,4).length>0)
    .sort((a,b)=>E.distance(b,city,g)-E.distance(a,city,g))[0];
  assert.ok(remote,'requires a second defensible city with dry land approaches');
  remote.eliminator=1;
  const runnerHex=land(g,remote,1).find(p=>E.internal.massOf(g,p)===E.internal.massOf(g,remote));
  const heroHex=land(g,remote,4).find(p=>E.internal.massOf(g,p)===E.internal.massOf(g,remote));
  assert.ok(runnerHex&&heroHex,'units must have a connected route to the same city');
  const runner=unit(g,'cf',runnerHex);
  const hero=unit(g,'cf',heroHex,'xingke');
  const initialHero=[hero.c,hero.r];
  let delivered=false;
  for(let turn=0;turn<8;turn++){
    runner.moved=false;runner.attacked=false;
    g.turn=20+turn;
    E.aiOrder(g,runner.id);
    assert.deepEqual([hero.c,hero.r],initialHero,
      'the commander must not abandon its assigned frontline position');
    if(hero.eliminator>0){delivered=true;break;}
  }
  assert.ok(delivered,'relay should collect then hand off the spare charge');
  assert.equal(runner.eliminator||0,0,'the non-Tier 1 carrier is only a courier');
  assert.equal(city.eliminator,1,'the capital keeps its reserved charge');
  assert.equal(remote.eliminator||0,0,'the spare charge was collected');
});

test('charged relay hands off to adjacent Tier 1 commander before the army moves', () => {
  const {g,city}=setup(401);
  const remote=g.stations.find(s=>s.owner==='cf' && s!==city && land(g,s,2).length);
  assert.ok(remote);
  const heroTile=land(g,remote,2)[0];
  const runnerTile=land(g,heroTile,1).find(p=>
    E.internal.massOf(g,p)===E.internal.massOf(g,heroTile));
  assert.ok(heroTile&&runnerTile);
  const hero=unit(g,'cf',heroTile,'xingke');
  const runner=unit(g,'cf',runnerTile);
  runner.eliminator=1;
  g.ai ||= {};
  (g.ai.cf ||= {}).eliminatorRelayJobs={
    [runner.id]:{city:remote.id,hero:hero.id,started:g.turn-1,pickedTurn:g.turn-1}
  };
  assert.equal(E.aiOrderPriority(g,runner),11,'rear courier acts after the regular commanders');
  const at=[hero.c,hero.r];
  E.aiProduction(g);
  assert.equal(hero.eliminator,1,'the pre-movement rendezvous transfers the charge');
  assert.equal(runner.eliminator,0,'courier is disarmed after delivering');
  assert.deepEqual([hero.c,hero.r],at,'no commander detour');
  assert.equal(g.ai.cf.eliminatorRelayDelivered,1,'successful delivery is counted once');
});

test('rival Eliminators stay classified from AI targeting and from the player', () => {
  const { g, city } = setup();
  g.phase = 'britannia';
  const carrier = unit(g, 'cf', land(g, city, 1)[0], 'xingke');
  const seeds = () => JSON.stringify(E.internal.goalSeeds(g, 'britannia').map(([p, v]) => [p.c, p.r, v]));
  const target = () => { const t = E.aiLaunchTarget(g, 'britannia'); return t && [t.c, t.r]; };
  city.eliminator = 0;
  const before = [seeds(), target()];
  // A charge waiting, a project under way, and a carried charge must not change where the AI aims or marches.
  city.eliminator = 1;
  g.stations.find(s => s.owner === 'cf' && s !== city).eliminatorProject = { side: 'cf', started: 19, ready: 21 };
  carrier.eliminator = 1;
  assert.deepEqual([seeds(), target()], before);
  const read = p => require('node:fs').readFileSync(require('node:path').join(__dirname, '..', p), 'utf8');
  assert.match(read('src/ai/02-fronts.part.js'), /const project = s\.project,/);
  assert.match(read('src/renderer/05-frame-painting.part.js'), /u\.side === game\.player && u\.eliminator > 0/);
  assert.match(read('src/renderer/05-frame-painting.part.js'), /carrier\.side === game\.player && carrier\.eliminator > 0/);
  assert.match(read('src/hud/05-command-dock.part.js'), /ours && u\.eliminator > 0/);
  const input = read('dist/ui/input.js');
  assert.match(input, /cities: game\.stations\.map\(s => s\.owner === game\.player \? s : classified\(s\)\)/);
  assert.match(input, /units: game\.units\.filter\(u => u\.hp > 0\)\.map\(u => u\.side === game\.player \? u : classified\(u\)\)/);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const CONFIG = E.CONQUESTS.ufn2018;
const SIDES = ['britannia', 'eb', 'cf'];
const totals = g => Object.fromEntries([...SIDES, 'neutral'].map(side => [side, g.stations.filter(s => s.owner === side).length]));

test('2018 uses exactly 168 cities and the approved 75/15/72/6 partition with three capitals', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 707, 'ufn2018');
  assert.equal(g.cols, 180);
  assert.equal(g.rows, 76);
  assert.equal(g.stations.length, 168);
  assert.deepEqual(totals(g), CONFIG.expectedCities);
  assert.equal(new Set(g.stations.map(s => s.name)).size, 168);
  for (const s of g.stations) {
    const original = E.tile(g, s.c, s.r);
    assert.equal(original.owner, s.owner, 'City tile ownership: ' + s.name);
    if (CONFIG.ownership[s.name]) assert.equal(s.owner, CONFIG.ownership[s.name], s.name);
    assert.notEqual(s.owner, 'eu', 'No obsolete E.U. city');
  }
  for (const [name, side] of [['Pendragon', 'britannia'], ['St. Petersburg', 'eb'], ['Luoyang', 'cf']]) {
    const s = g.stations.find(x => x.name === name);
    assert.equal(s.owner, side);
    assert.equal(s.capitalOf, side);
  }
  assert.equal(g.stations.filter(s => s.capital).length, 3);
  assert.equal(g.stations.filter(s => s.portAt && s.portOwner !== s.owner).length, 0);
  assert.equal(g.stations.filter(s => s.portAt).length, 12);
  assert.equal(g.tiles.filter(t => t.owner === 'eu').length, 0, 'No stranded obsolete E.U. territory');
  for (const d of g.sites || []) {
    const host = E.depositHost(g, d);
    assert.notEqual(host?.owner, 'eu', 'No obsolete E.U. mine: ' + d.name);
  }
  const province = new Map(g.stations.map(s => [s.id,s]));
  for (const t of g.tiles) if (t.provinceCity != null) {
    assert.equal(t.owner, province.get(t.provinceCity)?.owner, 'Province mismatch at ' + t.c + ',' + t.r);
  }
});

test('The three playable factions have distinct administrations and a single starting officer per army', () => {
  for (const side of SIDES) {
    const g = E.createGame(side, 'normal', 'conquest', 20, 'ufn2018');
    assert.equal(g.player, side);
    assert.equal(g.phase, side);
    assert.deepEqual(g.order.slice().sort(), SIDES.slice().sort());
    assert.equal(g.era, 'ufn2018');
    assert.equal(g.factions.cf.name, 'United Federation of Nations');
    assert.equal(g.factions.eb.capital, 'St. Petersburg');
    assert.equal(g.units.filter(u => u.side === side && u.hp > 0).length > 0, true);
    assert.equal(g.units.filter(u => u.side === 'eu').length, 0);
    const command = g.units.flatMap(u => [u, ...(u.cargo || [])]).filter(u => u.cmd).map(u => u.cmd);
    assert.equal(new Set(command).size, command.length, 'Starting commander used twice');
    assert.equal(g.fallen.eb, undefined);
    assert.equal(g.teams.britannia, g.teams.eb);
    assert.notEqual(g.teams.cf, g.teams.eb);
    assert.equal(E.foe(g, 'britannia', 'eb'), false);
    assert.equal(E.foe(g, 'cf', 'eb'), true);
    assert.equal(E.foe(g, 'cf', 'britannia'), true);
    assert.equal(g.economy.britannia === g.economy.eb, false);
    assert.equal(g.tech.britannia === g.tech.eb, false);
    assert.equal(g.economy.britannia === g.economy.cf, false);
    assert.deepEqual(totals(g), CONFIG.expectedCities);
  }
});

test('2017 world conquest and its alliance-free diplomacy remain unchanged', () => {
  const g = E.createGame('cf', 'normal', 'conquest', 99);
  assert.equal(g.era, 'world');
  assert.deepEqual(g.order.slice().sort(), ['britannia', 'eu', 'cf'].sort());
  assert.equal(E.foe(g, 'britannia', 'eu'), true);
  assert.equal(E.foe(g, 'britannia', 'cf'), true);
  assert.equal(g.stations.length, 168);
  assert.equal(g.teams.britannia, undefined);
  assert.equal(g.units.filter(u => u.side === 'eb').length, 0);
});

test('Allied units are protected from attacks, captures and city bombardments', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 71, 'ufn2018');
  g.units = [];
  const s = g.stations.find(x => x.owner === 'eb' && x.name === 'St. Petersburg');
  const around = E.adjacent(g, s).find(t => !E.isSea(t) && !E.stationAt(g,t));
  assert.ok(around);
  const u = E.newUnit(g, E.typeFor('britannia', 'heavy'), 'britannia', around.c, around.r, 1);
  const v = E.newUnit(g, E.typeFor('eb', 'light'), 'eb', s.c, s.r, 1);
  assert.equal(E.preview(g, u.id, s.c, s.r), null, 'Allied unit cannot be targeted');
  assert.equal(E.attack(g, u.id, s.c, s.r).ok, false, 'Allied combat must reject');
  assert.equal(v.hp > 0, true);
  const originalOwner = s.owner;
  assert.equal(E.move(g, u.id, s.c, s.r).ok, false, 'Occupied allied tile cannot be entered');
  assert.equal(s.owner, originalOwner);
  g.units = g.units.filter(x => x !== v);
  const legal = E.reachable(g, u);
  assert.equal(legal.has(E.key(s)), true, 'Unoccupied allied city should allow passage');
  const r = E.move(g, u.id, s.c, s.r);
  assert.equal(r.ok, true);
  assert.equal(s.owner, 'eb', 'Moving into an allied city cannot capture it');
});

test('F.L.E.I.J.A. prohibits allied blast damage without spending a warhead', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 88, 'ufn2018');
  g.phase = 'britannia';
  g.arsenal = { britannia: 2 };
  const s = g.stations.find(x => x.owner === 'eb' && x.name === 'St. Petersburg');
  const original = s.shield, units = g.units.length;
  assert.match(E.launchReason(g, 'britannia', E.tile(g, s.c, s.r)) || '', /friendly or allied/);
  const r = E.launch(g, 'britannia', s.c, s.r);
  assert.equal(r.ok, false);
  assert.equal(g.arsenal.britannia, 2);
  assert.equal(s.shield, original);
  assert.equal(g.units.length, units);
});

test('Alliance liquidation victory, UFN victory, and armistice totals ignore Australia', () => {
  for (const side of SIDES) {
    const g = E.createGame(side, 'normal', 'conquest', 100, 'ufn2018');
    g.stations.filter(s => s.owner === 'cf').forEach(s => { s.owner = 'britannia'; });
    E.checkVictory(g);
    assert.equal(g.over?.team, 'britannian');
    assert.equal(g.over?.winner === g.player, side !== 'cf');
  }
  const ufn = E.createGame('cf', 'normal', 'conquest', 101, 'ufn2018');
  ufn.stations.filter(s => ['britannia','eb'].includes(s.owner)).forEach(s => { s.owner = 'cf'; });
  E.checkVictory(ufn);
  assert.equal(ufn.over?.team, 'ufn');
  assert.equal(ufn.over?.winner, 'cf');

  const equal = E.createGame('britannia', 'normal', 'conquest', 102, 'ufn2018');
  equal.stations.forEach((s,i) => { s.owner = i < 20 ? 'britannia' : i < 40 ? 'eb' : i < 80 ? 'cf' : 'neutral'; });
  equal.turn = 121;
  E.checkVictory(equal);
  assert.equal(equal.over?.winner, 'draw');
  const lead = E.createGame('eb', 'normal', 'conquest', 103, 'ufn2018');
  lead.turn = 121;
  E.checkVictory(lead);
  assert.equal(lead.over?.team, 'britannian');
  assert.equal(lead.over?.winner, 'eb', 'Allied Britannian player shares winning result');
});

test('2018 saved games retain conquest and coalition and 2017 stays distinct', () => {
  for (const era of ['world','ufn2018']) {
    const side = era === 'world' ? 'eu' : 'eb';
    const g = E.createGame(side, 'normal', 'conquest', 123, era);
    const copy = E.migrateSave(E.packSave(g));
    assert.ok(copy);
    assert.equal(copy.era, era);
    assert.equal(copy.player, side);
    assert.equal(copy.tiles.length, 180 * 76);
    assert.equal(copy.stations.length, 168);
    assert.deepEqual(copy.majors, E.CONQUESTS[era].majors);
    assert.deepEqual(copy.teams, E.CONQUESTS[era].teams);
    assert.equal(E.operationKey(copy).includes('conquest:' + era + ':'), true);
  }
});

test('All four difficulties initialize 2018 and retain their own expected Elite conventions', () => {
  for (const difficulty of ['normal','hard','challenge','elite'])
    for (const side of SIDES) {
      const g = E.createGame(side, difficulty, 'conquest', 333, 'ufn2018');
      assert.deepEqual(totals(g), CONFIG.expectedCities, difficulty + '/' + side);
      assert.equal(g.over, null);
      assert.equal(g.units.filter(u => u.hp > 0 && u.side === side).length > 0, true);
      if (difficulty === 'elite') {
        const ground = g.units.filter(u => u.hp > 0 && !E.TYPES[u.type].naval);
        assert.ok(ground.every(u => u.elite && u.stack === 1));
        assert.ok(ground.filter(u => u.side !== side && u.cmd).every(u => u.eliteLevel === 5));
      }
    }
});

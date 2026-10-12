'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');

function board() {
  const g = E.createGame('britannia', 'normal', 'conquest', 7722);
  g.cols = 12; g.rows = 12; g.wrap = false;
  g.tiles = Array.from({ length: 144 }, (_, i) => ({
    c: i % 12, r: Math.floor(i / 12), terrain: 'sea', owner: null,
  }));
  for (const [c, r, owner] of [[5, 4, 'eu'], [2, 2, 'britannia'], [9, 9, 'cf'], [8, 4, 'eu'], [5, 3, 'eu']]) {
    const t = E.tile(g, c, r); t.terrain = 'plains'; t.owner = owner;
  }
  g.units = []; g.nextId = 1; g.sites = []; g.fallen = {}; g.phase = 'britannia'; g.over = null;
  const makeCity = (id, name, c, r, owner) => ({
    id, name, c, r, owner, shield: 0, maxShield: 100,
    tier: 3, portLevel: 0, producedTurn: -1, portProducedTurn: -1,
    income: 10, industry: 10, science: 1,
  });
  const port = makeCity(101, 'Seaport', 5, 4, 'eu');
  port.portAt = { c: 5, r: 5 }; port.portLevel = 2; port.portOwner = 'eu';
  g.stations = [port, makeCity(102, 'Britannia Base', 2, 2, 'britannia'),
    makeCity(103, 'Federation Base', 9, 9, 'cf'), makeCity(104, 'Other EU City', 8, 4, 'eu')];
  for (const side of ['eu', 'britannia', 'cf'])
    g.economy[side] = { credits: 10000, industry: 10000, sakuradite: 10000, science: 1000 };
  return { g, port };
}

test('entering a hostile port takes it, not its city or territory, and control persists', () => {
  const { g, port } = board();
  const before = g.tiles.map(t => t.owner);
  const ship = E.newUnit(g, E.NAVAL.britannia.amphibious, 'britannia', 4, 5);
  const result = E.move(g, ship.id, 5, 5);
  assert.equal(result.ok, true);
  assert.equal(result.portCaptured, port.name);
  assert.equal(port.portOwner, 'britannia');
  assert.equal(port.owner, 'eu');
  assert.deepEqual(g.tiles.map(t => t.owner), before);
  ship.moved = false; ship.attacked = false;
  assert.equal(E.move(g, ship.id, 6, 5).ok, true);
  E.beginTurn(g, 'eu', false);
  assert.equal(port.portOwner, 'britannia', 'empty captured port stays captured');
  const retaker = E.newUnit(g, E.NAVAL.eu.amphibious, 'eu', 4, 5);
  const recapture = E.move(g, retaker.id, 5, 5);
  assert.equal(recapture.portCaptured, port.name);
  assert.equal(port.portOwner, 'eu');
  assert.deepEqual(g.tiles.map(t => t.owner), before);
});

test('taking a city does not also take its third-party harbour', () => {
  const { g, port } = board();
  port.portOwner = 'cf';
  const walker = E.newUnit(g, E.typeFor('britannia', 'scout'), 'britannia', 5, 3);
  const result = E.move(g, walker.id, port.c, port.r);
  assert.equal(result.ok, true);
  assert.equal(result.captured, port.name);
  assert.equal(port.owner, 'britannia');
  assert.equal(port.portOwner, 'cf');
});

test('port controller can recruit naval units without owning city', () => {
  const { g, port } = board();
  port.portOwner = 'britannia';
  const naval = E.NAVAL.britannia.amphibious;
  assert.equal(E.buyReason(g, port, naval), null);
  const recruit = E.recruit(g, port.id, naval);
  assert.equal(recruit.ok, true);
  assert.equal(recruit.unit.side, 'britannia');
  assert.equal(port.owner, 'eu');
  g.phase = 'eu';
  assert.equal(E.buyReason(g, port, E.NAVAL.eu.amphibious), 'Not your port');
});

test('city and port occupations clear undo; ports do not repaint map icons', () => {
  const source = fs.readFileSync(path.join(__dirname, '../dist/ui/view.js'), 'utf8');
  assert.match(source, /const irreversible = !!E\.stationAt\(game, p\).*result\.portCaptured/);
  assert.match(source, /refreshAndSave\(!irreversible\)/);
  const map = fs.readFileSync(path.join(__dirname, '../dist/ui/renderer.js'), 'utf8');
  assert.match(map, /holder = F\(s\.owner\)\.color/);
});

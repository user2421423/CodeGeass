const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

function seaMap(side) {
  const g = E.createGame(side, 'normal', 'conquest', 37);
  g.cols = 40;
  g.rows = 14;
  g.wrap = false;
  g.tiles = Array.from({ length: g.cols * g.rows }, (_, i) => ({
    c: i % g.cols, r: Math.floor(i / g.cols), terrain: 'sea', owner: null,
  }));
  g.stations = [];
  g.units = [];
  g.sites = [];
  g.nextId = 1;
  g.phase = side;
  g.over = null;
  return g;
}

test('Every faction carrier moves 10 sea hexes, not 12, in Conquest', () => {
  for (const side of E.MAJORS) {
    const g = seaMap(side);
    const carrier = E.newUnit(g, E.NAVAL[side].carrier, side, 10, 6);
    assert.equal(E.TYPES[carrier.type].move, 10, side + ' listed base movement');
    assert.equal(E.movement(g, carrier), 10, side + ' actual movement');
    const reachable = E.reachable(g, carrier);
    assert(reachable.has('20,6'), side + ' can sail ten hexes');
    assert(!reachable.has('21,6'), side + ' cannot sail eleven hexes');
    assert(!reachable.has('22,6'), side + ' cannot sail twelve hexes');
  }
});

test('Amphibious units still receive their existing ten-hex carrier escort bonus', () => {
  for (const side of E.MAJORS) {
    for (const [field, normal] of [['amphibious', 6], ['amphibious2', 7]]) {
      const g = seaMap(side);
      const ship = E.newUnit(g, E.NAVAL[side].carrier, side, 10, 6);
      const u = E.newUnit(g, E.NAVAL[side][field], side, 11, 6);
      assert(E.reachable(g, u).has('21,6'), side + ' escorted reach');
      assert(!E.reachable(g, u).has('22,6'), side + ' escorted cap');
      g.units.splice(g.units.indexOf(ship), 1);
      assert(E.reachable(g, u).has((11 + normal) + ',6'), side + ' solo reach');
      assert(!E.reachable(g, u).has((12 + normal) + ',6'), side + ' solo cap');
    }
  }
});

test('Normal land formations retain their universal +2 Conquest movement', () => {
  for (const side of E.MAJORS) {
    const g = seaMap(side);
    const u = E.newUnit(g, E.typeFor(side, 'scout'), side, 11, 6);
    assert.equal(E.movement(g, u), E.TYPES[u.type].move + 2);
  }
});

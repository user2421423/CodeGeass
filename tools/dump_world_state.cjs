// Prints a new conquest's cities, ports, mines and starting units as JSON, for tools/coast_hexes.py.
// Run: node tools/dump_world_state.cjs > /tmp/world-state.json
const E = require('../dist/engine.js'),
  g = E.createGame('britannia');
const out = {
  stations: g.stations.map(s => ({ name: s.name, c: s.c, r: s.r, portAt: s.portAt || null })),
  sites: (g.sites || []).map(s => ({ name: s.name, c: s.c, r: s.r })),
  units: g.units.map(u => ({ c: u.c, r: u.r })),
};
(typeof process !== 'undefined' ? s => process.stdout.write(s) : print)(JSON.stringify(out));

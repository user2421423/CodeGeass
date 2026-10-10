'use strict';
// Non-mutating diagnostics for the uniform coastline experiment.
// Run: node tools/audit_coastal_starting_positions.cjs
const E = require('../dist/engine.js');

const g = E.createGame('britannia', 'normal', 'conquest', 246801);
const wantedPorts = ['Pearl Harbor', 'New York', 'Kyoto', 'Los Angeles', 'London',
  'Gibraltar', 'Barcelona', 'Athens', 'Shanghai', 'Singapore', 'Hong Kong', 'Mumbai'];
const stations = Object.fromEntries(g.stations.map(s => [s.name, s]));
const missingPorts = wantedPorts.filter(name => !stations[name]?.portAt);
const place = name => {
  const s = stations[name];
  if (!s) return null;
  return { name, city: [s.c, s.r], port: s.portAt ? [s.portAt.c, s.portAt.r] : null };
};
const report = {
  branchPurpose: 'Experimental 20-80 percent coastal classification (no overrides)',
  cityCount: g.stations.length,
  unitCount: g.units.length,
  expectedStartingPorts: wantedPorts.length,
  missingPorts,
  sampleCities: ['Pearl Harbor', 'Gibraltar', 'Barcelona', 'Shanghai', 'Singapore',
    'Mumbai', 'Kyoto', 'Fukuoka', 'Taipei', 'Jakarta'].map(place),
  deposits: (g.sites || []).map(site => ({ name: site.name, c: site.c, r: site.r })),
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
if (missingPorts.length) process.stderr.write(
  'WARNING: experimental coastal map removes starting ports from: ' +
  missingPorts.join(', ') + '\n'
);

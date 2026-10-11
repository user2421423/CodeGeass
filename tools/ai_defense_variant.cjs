#!/usr/bin/env node
'use strict';
// Controlled ablations of the experimental defensive planner. This script only
// rewrites the CI checkout's generated AI bundle; it never changes the source tree or main.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const variant = process.argv[2];
const file = 'dist/engine/ai.js';
let ai = fs.readFileSync(file, 'utf8');
function replace(from, to) {
  const occurrences = ai.split(from).length - 1;
  if (occurrences !== 1) throw new Error('Expected exactly one match for '+from.slice(0,80)+': '+occurrences);
  ai = ai.replace(from,to);
}
switch (variant) {
  case 'baseline':
    ai = execFileSync('git', ['show', '1e2fa5c1b78115ec7a887a4094e5d9183d9600ed:dist/engine/ai.js'], { encoding: 'utf8' });
    break;
  case 'full':
    break;
  case 'no-multicity':
    replace('|| f.endangeredCities >= 2 ||', '||');
    replace('Math.min(36, Math.max(0, f.endangeredCities - 1) * FRONT.multiCityBonus)', '0');
    replace('(e.vital || (e.endangeredCities >= 2 && e.priority > f.priority && !f.emergency))', 'e.vital');
    break;
  case 'no-forecast': {
    const begin = ai.indexOf('  function approachingThreat(g, f, p) {');
    const end = ai.indexOf('\n  // What a side cares about this turn:', begin);
    if (begin < 0 || end < 0) throw new Error('Early-warning boundaries not found');
    ai = ai.slice(0, begin) + '  function approachingThreat() { return false; }' + ai.slice(end);
    break;
  }
  case 'old-emergency':
    replace('emergencyRatio: 1, emergencyMinShare: 0.2, emergencyMaxShare: 0.35', 'emergencyRatio: 0.6, emergencyMinShare: 0.2, emergencyMaxShare: 0.2');
    break;
  default:
    throw new Error('Unknown variant: '+variant);
}
fs.writeFileSync(file, ai);
console.log('Prepared AI simulation variant:', variant);

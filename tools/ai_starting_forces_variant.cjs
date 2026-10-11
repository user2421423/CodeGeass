#!/usr/bin/env node
'use strict';
// Simulation-only starting army experiment. Does not change source map or game builds.
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const variant = process.argv[2];
if (!['A','B','C','D'].includes(variant)) throw Error('Unknown deployment experiment: ' + variant);
const file = 'dist/engine/world.js';
// Reproduce the original A/B/C/D comparison against the exact pre-reinforcement
// starting world, even after +8 becomes the live deployment.
const original = execFileSync('git',
  ['show','0935ba19ba4c43984e3d0fdd27c40b0775340c38:dist/engine/world.js'],
  {encoding:'utf8'});
const key = 'const ARMY_DATA = [';
const begin = original.indexOf(key);
const end = original.indexOf('\n  ];', begin);
if (begin < 0 || end < 0) throw Error('Cannot locate ARMY_DATA');
const start = original.slice(begin,end);
const matches = side => [...start.matchAll(new RegExp("\\['" + side + "',\\s*'[^']+',\\s*-?[0-9.]+,\\s*-?[0-9.]+,\\s*\\d+",'g'))];
const chinaCount = matches('cf').length;
const euCount = matches('eu').length;
const britishCount = matches('britannia').length;
if (chinaCount !== 45 || euCount !== 43 || britishCount !== 38)
  throw Error('Starting-deployment fixture changed: '+JSON.stringify({chinaCount,euCount,britishCount}));
const moves = [
  // Existing underemployed rear formations: no unit added, commander moved, or frame count increased.
  ["['cf', 'scout', 103.8, 1.35, 1]", "['cf', 'medium', 54.9, 34.7, 1]"], // Iran
  ["['cf', 'scout', 100.5, 13.7, 1]", "['cf', 'medium', 70.8, 39.8, 1]"], // Central Asia
  ["['cf', 'scout', 124.2, 24.1, 1]", "['cf', 'assault', 130.8, 47.1, 1]"], // Manchuria
  ["['cf', 'light', 113.3, 23.1, 2]", "['cf', 'heavy', 55.6, 36.3, 2]"], // Iran
  ["['cf', 'light', 121.5, 31.2, 2]", "['cf', 'medium', 63.0, 39.2, 2]"], // Central Asia
  ["['cf', 'medium', 106.9, 47.9, 2]", "['cf', 'medium', 131.0, 46.6, 2]"], // Northeast
  ["['cf', 'light', 106.9, 47.9, 1]", "['cf', 'rocket', 67.7, 39.5, 1]"], // Central Asia
];
const extra4=[
  "    ['cf', 'heavy', 54.8, 34.8, 2],", // Iran
  "    ['cf', 'rocket', 65.7, 39.5, 2],", // Uzbek-Tajik approaches
  "    ['cf', 'medium', 72.7, 42.4, 2],", // Tashkent
  "    ['cf', 'heavy', 130.8, 46.2, 2],", // Northeast
];
const extra8=extra4.concat([
  "    ['cf', 'medium', 56.5, 38.7, 2],",
  "    ['cf', 'rocket', 68.2, 38.8, 2],",
  "    ['cf', 'heavy', 128.2, 48.3, 2],",
  "    ['cf', 'medium', 123.2, 42.4, 2],",
]);
let next = start;
if (variant === 'B') for (const [before,after] of moves) {
  if (next.split(before).length !== 2 || next.includes(after))
    throw Error('Ambiguous redeployment: '+before);
  next = next.replace(before,after);
}
if (variant === 'C' || variant === 'D') next += '\n' + (variant==='C'?extra4:extra8).join('\n');
const changed = original.slice(0,begin)+next+original.slice(end);
const num = [...next.matchAll(/\['cf',\s*'[^']+',\s*-?[0-9.]+,\s*-?[0-9.]+,\s*(\d+)/g)];
const totalFrames = num.reduce((n,m)=>n+Number(m[1]),0);
const expected = {A:[45,76],B:[45,76],C:[49,84],D:[53,92]}[variant];
if (num.length !== expected[0] || totalFrames !== expected[1])
 throw Error('Army strength mismatch: '+JSON.stringify({actual:[num.length,totalFrames],expected}));
fs.writeFileSync(file,changed);
console.log('SIM-ONLY STARTING ARMY: '+JSON.stringify({variant,formations:num.length,frames:totalFrames,baseline:variant==='A',extraUnits:num.length-45}));

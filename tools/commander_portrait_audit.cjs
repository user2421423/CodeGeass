#!/usr/bin/env node
'use strict';
// Check both published manifests, committed image files, and the live commander registry.
// Missing real source artwork is reported as pending rather than replaced with another face.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const { COMMANDERS } = require(path.join(root, 'dist/engine/commanders.js'));
const manifest = require(path.join(root, 'dist/assets/art/manifest.json'));
const script = fs.readFileSync(path.join(root, 'dist/assets/art/manifest.js'), 'utf8');
const scope = {};
vm.runInNewContext(script, scope, { filename: 'manifest.js' });
assert.deepEqual(JSON.parse(JSON.stringify(scope.KnightmareArtManifest)), manifest,
  'The published manifest.js must match manifest.json');
const portraitDir = path.join(root, 'dist/assets/art/portraits');
const published = fs.readdirSync(portraitDir);
const entries = Object.entries(COMMANDERS);
for (const [id, entry] of Object.entries(manifest.portraits)) {
  assert.ok(COMMANDERS[id], 'Portrait registered for unknown commander: ' + id);
  assert.ok(entry && /^portraits\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(entry.src),
    'Unexpected or unsafe portrait path for ' + id);
  assert.ok(fs.statSync(path.join(root, 'dist/assets/art', entry.src)).isFile(),
    'Published portrait file missing for ' + id + ': ' + entry.src);
}
const unmappedFiles = entries.filter(([id]) =>
  !manifest.portraits[id] &&
  published.some(filename => filename.startsWith(id + '-'))
).map(([id]) => id);
assert.deepEqual(unmappedFiles, [],
  'Available portrait files must be registered for: ' + unmappedFiles.join(', '));
const pending = entries.filter(([id]) => !manifest.portraits[id]);
console.log('Commander portraits: ' + (entries.length - pending.length) + '/' + entries.length + ' registered');
if (pending.length) console.log('Awaiting dedicated portraits: ' +
  pending.map(([id, commander]) => commander.name + ' (' + id + ')').join(', '));
if (process.argv.includes('--strict')) assert.equal(pending.length, 0, 'Commander portraits are still missing');

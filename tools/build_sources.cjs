'use strict';
// Builds the classic-script browser bundles listed in tools/bundles.json by concatenating src parts in order.
// The bundles are build output (git-ignored); tools/build_sources.py does the same without Node.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const BUNDLES = require('./bundles.json');
for (const [target, parts] of Object.entries(BUNDLES)) {
  fs.writeFileSync(path.join(ROOT, target), parts.map(p => fs.readFileSync(path.join(ROOT, p), 'utf8')).join(''));
  console.log('Built ' + target);
}

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BUNDLES, assemble } = require('../tools/build_sources.cjs');
const ROOT = path.join(__dirname, '..');
for (const [target, parts] of Object.entries(BUNDLES)) {
  test('source sections reproduce ' + target + ' exactly', () => {
    assert(parts.length >= 2, 'expected meaningful sections for ' + target);
    const unique = new Set(parts);
    assert.equal(unique.size, parts.length, 'duplicate sections');
    const generated = assemble(parts);
    assert.equal(generated, fs.readFileSync(path.join(ROOT, target), 'utf8'));
    assert(generated.length > 0);
  });
}

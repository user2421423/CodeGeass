'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const artSource = fs.readFileSync(path.join(root,'dist/art.js'),'utf8');
const context = {};
vm.runInNewContext(artSource + '\nthis.renderedFlags = ART;', context);
test('Britannia, Europia and Black Knights have standalone faction flags', () => {
  for (const side of ['britannia','eu','bk']) {
    const svg = context.renderedFlags.flagSVG(side);
    assert.match(svg, /<svg /);
    assert.match(svg, /viewBox="0 0 120 72"/);
    assert.match(svg, /<path /);
    assert.match(svg, /aria-label=/);
  }
  assert.equal(context.renderedFlags.flagSVG('neutral'), '');
});
test('the existing U.F.N. flag remains available', () => {
  assert.equal(context.renderedFlags.flagSVG('ufn'), context.renderedFlags.ufnFlagSVG());
});
test('faction flags are presented on map cities, setup cards and docks', () => {
  const art = fs.readFileSync(path.join(root,'dist/art.js'),'utf8');
  const hud = fs.readFileSync(path.join(root,'dist/ui/hud.js'),'utf8');
  const scenarios = fs.readFileSync(path.join(root,'dist/ui/scenario-screens.js'),'utf8');
  assert.match(art, /const standard = flagSVG\(side\)/);
  assert.match(hud, /ART\.flagSVG\(side\)/);
  assert.match(hud, /ART\.flagSVG\(artSide\(side\)\)/);
  assert.match(scenarios, /ART\.flagSVG\(s\)/);
});

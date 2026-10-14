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

const exactFlags = {
  britannia: [260,157],
  eu: [260,173],
  cf: [260,173],
  bk: [260,260],
};
test('each faction flag uses the actual uploaded artwork, not a hand-drawn substitute', () => {
  for (const [side, [width,height]] of Object.entries(exactFlags)) {
    const svg = context.renderedFlags.flagSVG(side);
    assert.match(svg, /<svg /);
    assert.match(svg, new RegExp('viewBox="0 0 ' + width + ' ' + height + '"'));
    assert.ok(svg.includes('href="assets/flags/' + side + '.webp"'));
    assert.match(svg, /<image /);
    assert.doesNotMatch(svg, /<path /, side + ' should show the uploaded flag instead of the SVG substitute');
    const data = fs.readFileSync(path.join(root,'dist/assets/flags',side+'.webp'));
    assert.equal(data.toString('ascii',0,4), 'RIFF');
    assert.equal(data.toString('ascii',8,12), 'WEBP');
    assert.ok(data.length > 500);
  }
  assert.equal(context.renderedFlags.flagSVG('neutral'), '');
});
test('U.F.N. flag still uses its original self-contained artwork', () => {
  assert.equal(context.renderedFlags.flagSVG('ufn'), context.renderedFlags.ufnFlagSVG());
});
test('faction flags appear on map cities, setup cards, scenario cards and docks', () => {
  const hud = fs.readFileSync(path.join(root,'dist/ui/hud.js'),'utf8');
  const scenarios = fs.readFileSync(path.join(root,'dist/ui/scenario-screens.js'),'utf8');
  assert.match(artSource, /const standard = flagSVG\(side\)/);
  assert.match(artSource, /flagAssetImage\(side\)/);
  assert.match(hud, /ART\.flagSVG\(side\)/);
  assert.match(hud, /ART\.flagSVG\(artSide\(side\)\)/);
  assert.match(scenarios, /ART\.flagSVG\(s\)/);
});

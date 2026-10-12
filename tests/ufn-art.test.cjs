'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
class FakeImage {
  constructor() { this.complete = true; this.naturalWidth = 200; this.naturalHeight = 200; }
  set src(v) { this._src = v; }
  get src() { return this._src; }
}
const context = vm.createContext({ Image: FakeImage });
vm.runInContext(read('dist/art.js') + '\n globalThis.testArt = ART;', context);
const ART = context.testArt;
test('U.F.N. flag and palette are distinct from 2017 Chinese Federation', () => {
  const flag = ART.ufnFlagSVG();
  assert.match(flag, /United Federation of Nations flag/);
  for (const color of ['#f8cf32', '#e70701', '#ffffff', '#187abd', '#5bc5e5', '#adecfd']) assert.ok(flag.includes(color));
  assert.match(flag, /viewBox="0 0 831 594"/);
  assert.doesNotMatch(flag, /Q26 0 49 5/);
  assert.equal(ART.FACTION_ART.ufn.flag, '#f8cf32');
  assert.equal(ART.FACTION_ART.cf.flag, '#b52a2a');
  assert.notEqual(ART.citySVG('capital', 'ufn'), ART.citySVG('capital', 'cf'));
});
test('U.F.N. city flag overlays the generic picture and does not render for China', () => {
  const calls = [];
  const ctx = { save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    drawImage(...args) { calls.push(args); } };
  assert.equal(ART.drawFlag(ctx, 'ufn', 5, -20, 32), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][3], 32);
  assert.ok(Math.abs(calls[0][4] - 32 * 594 / 831) < 0.01);
  assert.match(decodeURIComponent(calls[0][0].src), /United Federation of Nations flag/);
  assert.equal(ART.drawFlag(ctx, 'cf', 5, -20, 32), false);
  assert.equal(calls.length, 1);
  assert.match(ART.city('city', 'ufn'), /ufn-city-flag/);
  assert.doesNotMatch(ART.city('city', 'cf'), /ufn-city-flag/);
});
test('Conquest-only art alias preserves political teal and other factions', () => {
  const core = read('dist/ui/core.js');
  const map = read('src/renderer/01-map-primitives.part.js');
  const paint = read('src/renderer/05-frame-painting.part.js');
  assert.match(core, /game\.era === 'ufn2018' && side === 'cf' \? 'ufn' : side/);
  assert.match(map, /ufn: \{ light: '#454b49'.*trim: '#f6cf67'/);
  assert.match(map, /PLATE\[artSide\(u\.side\)\]/);
  assert.match(paint, /ART\.drawFlag\(ctx, artSide\(s\.owner\)/);
  assert.match(paint, /ART\.drawCity\(ctx, kind, artSide\(s\.owner\)/);
  // Units use the U.F.N. palette through their shared art alias; there is no
  // separate U crest over the model after the unit-ring cleanup.
  assert.match(paint, /PLATE\[artSide\(u\.side\)\]\.light/);
  assert.match(read('dist/engine/conquests.js'), /color: '#37bfa9'/);
});

test('Regular Black Knights carrier renders the same published sprite as other carriers', () => {
  ART.useLocal(JSON.parse(read('dist/assets/art/manifest.json')));
  const standard = ART.unit('cf_carrier', '', 'cf');
  const blackKnights = ART.unit('bk_carrier', '', 'bk');
  assert.match(standard, /generic_carrier-bf5e0799d818\.png/);
  assert.match(blackKnights, /generic_carrier-bf5e0799d818\.png/);
  assert.match(blackKnights, /<img src=/, 'the Black Knights carrier needs visible published art');
});

test('Burai and Gekka sprites for Black Knights amphibious regular and Elite units', () => {
  ART.useLocal(JSON.parse(read('dist/assets/art/manifest.json')));
  for (const [id, filename] of [
    ['bk_amphibious', 'burai-6f5b891028e0.png'],
    ['bk_amphibious_ii', 'gekka-6c896ee459cb.png'],
    ['elite_japan_bk_amphibious', 'gekka-6c896ee459cb.png'],
  ]) {
    const rendered = ART.unit(id, '', 'bk');
    assert.ok(rendered.includes(filename), id + ' must use the approved sprite');
    assert.match(rendered, /<img src=/, id + ' has visible art');
  }
});

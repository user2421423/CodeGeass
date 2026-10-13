'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const icons = fs.readFileSync(path.join(__dirname, '../dist/icons.js'), 'utf8');
const hud = fs.readFileSync(path.join(__dirname, '../dist/ui/hud.js'), 'utf8');
const dockFunction = hud.match(/function dockHTML\(\) \{[\s\S]*?\n\}/)?.[0];
assert(dockFunction, 'generated HUD must contain dockHTML');

function gauge(hp, max) {
  const context = vm.createContext({});
  vm.runInContext(icons, context);
  return vm.runInContext(`ICONS.hp(${hp}, ${max})`, context);
}
function dock(naval, branch = 'Armor') {
  const unit = { id: 7, type: 'test', side: 'britannia', cmd: null, hp: 321, stack: 2, morale: 0 };
  const sandbox = {
    selectedUnit: () => unit,
    selectedStation: () => null,
    selectedPort: () => null,
    selectedSite: () => null,
    game: { player: 'britannia', mode: 'conquest', stations: [] },
    E: {
      TYPES: { test: { naval, branch } },
      maxHP: () => 673, atSea: () => false,
      stationAt: () => null, siteAt: () => null,
      reinforceReason: () => null, repairReason: () => null,
    },
    C: () => null,
    F: () => ({ letter: 'B' }),
    ART: { unit: () => '' },
    ICONS: { hp: gauge },
    statRow: () => '',
    unitName: () => 'Alexander',
    moraleName: () => 'Steady',
    fireStatus: () => 'Already fired',
    armyGroupForUnit: () => null,
    routing: null, phaseReason: () => null,
    interactive: () => false, undoStack: [], act: () => '',
    esc: s => s,
  };
  return vm.runInNewContext(dockFunction + '\ndockHTML();', sandbox);
}

test('health circle shows remaining HP, not rounded percentage', () => {
  const svg = gauge(321, 673);
  assert.match(svg, /aria-label="Health 321 of 673 HP"/);
  assert.match(svg, /<text[^>]*>321<\/text>/);
  assert.doesNotMatch(svg, /<text[^>]*>48<\/text>/);
  assert.match(svg, /stroke-dasharray="45\.0 94\.2"/, 'the arc still shows proportional health');
});

test('health circle scales font to fit four-digit and five-digit HP', () => {
  assert.match(gauge(1321, 2000), /style="font-size:8px">1321<\/text>/);
  assert.match(gauge(12321, 15000), /style="font-size:6px">12321<\/text>/);
});

test('unit dock removes redundant X / Y frame label but retains frame count and morale', () => {
  const html = dock(null);
  assert.match(html, /Armor · ×2/);
  assert.match(html, /<text[^>]*>321<\/text>/);
  assert.doesNotMatch(html, /321 \/ 673 frame/);
  assert.match(html, /<p>Steady · Already fired<\/p>/);
});

test('only amphibious type changes from Armor to Naval in unit dock', () => {
  assert.match(dock('amphibious'), /Naval · ×2/);
  assert.doesNotMatch(dock('amphibious'), /Armor · ×2/);
  assert.match(dock(null), /Armor · ×2/);
  assert.match(dock('ship', 'Artillery'), /Artillery · ×2/);
});

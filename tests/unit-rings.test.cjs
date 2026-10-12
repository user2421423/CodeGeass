'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const renderer = fs.readFileSync(path.join(__dirname, '../dist/ui/renderer.js'), 'utf8');
function extract(name) {
  const start = renderer.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' should exist');
  const end = renderer.indexOf('\n}', start);
  assert.notEqual(end, -1, name + ' should have a closing brace');
  return renderer.slice(start, end + 2);
}
const drawingFns = ['hostileUnit', 'readyUnit', 'unitRingColor', 'drawPlate'].map(extract).join('\n');

function paint(unit, teams = {}) {
  const strokes = [];
  const ctx = {
    save() {}, restore() {}, beginPath() { this.path = null; },
    moveTo() {}, lineTo() {}, closePath() {}, fill() {}, fillRect() {}, quadraticCurveTo() {},
    createRadialGradient() { return { addColorStop() {} }; },
    ellipse(...args) { this.path = args; },
    stroke() { strokes.push({ color: this.strokeStyle, path: this.path }); },
  };
  const plate = { light: '#fff', mid: '#aaa', dark: '#222' };
  const sandbox = {
    ctx, unit,
    game: { player: 'britannia', teams },
    PLATE: Object.fromEntries(['britannia', 'eb', 'cf', 'neutral'].map(s => [s, plate])),
    artSide: s => s,
    E: { maxHP: () => 100, foe: (g, a, b) => a !== b && !(g.teams?.[a] && g.teams[a] === g.teams[b]) },
    interactive: () => false,
    hasOrders: () => false,
  };
  vm.runInNewContext(drawingFns + '\ndrawPlate(unit, 1, false, 0);', sandbox);
  return strokes;
}

test('one outlined ring uses gold for own/team allies, red for foes, grey for neutrals', () => {
  const teams = { britannia: 'imperial', eb: 'imperial', cf: 'ufn' };
  for (const [side, color] of [['britannia', '#f2c76a'], ['eb', '#f2c76a'], ['cf', '#ff334d'], ['neutral', '#9ca3af']]) {
    const strokes = paint({ side, hp: 100 }, teams);
    assert.equal(strokes.length, 2, side + ' should draw only one ring (track and health arc)');
    assert.equal(strokes[0].color, '#0c1924e0');
    assert.equal(strokes[1].color, color);
    assert.equal(strokes[0].path[2], strokes[1].path[2], 'track and arc must share radius');
    assert.equal(strokes[0].path[3], strokes[1].path[3], 'track and arc must share radius');
  }
});

test('health changes ring circumference, not allegiance color', () => {
  for (const hp of [25, 50, 80]) {
    const strokes = paint({ side: 'cf', hp });
    assert.equal(strokes[1].color, '#ff334d');
    const arc = strokes[1].path;
    assert.ok(Math.abs((arc[6] - arc[5]) / (Math.PI * 2) - hp / 100) < 1e-9);
  }
});

test('zoomed-out units use allegiance-colored HP arcs without a separate selection circle', () => {
  assert.match(renderer, /ctx\.strokeStyle = unitRingColor\(u\);/);
  assert.doesNotMatch(renderer, /ctx\.arc\(0, 0, 22, 0, Math\.PI \* 2\)/);
});

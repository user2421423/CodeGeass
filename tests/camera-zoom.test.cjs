'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual camera functions with a lightweight canvas stub.
// AI/engine state and deployed image assets are deliberately not needed.
const root = path.join(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'dist/ui/core.js'), 'utf8');
const view = fs.readFileSync(path.join(root, 'dist/ui/view.js'), 'utf8');
const maxMatch = core.match(/\bZOOM_MAX\s*=\s*(\d+)/);
assert(maxMatch, 'The UI must declare a maximum zoom');
const zoomMax = Number(maxMatch[1]);
assert(zoomMax >= 24, 'Close inspection must magnify at least 3x beyond the former zoom limit');

const R = 43;
const SQ = Math.sqrt(3);
const rows = 42;
const cols = 100;
const canvas = {
  style: {},
  getBoundingClientRect: () => ({ width: 1200, height: 900, left: 0, top: 0 }),
  focus() {},
  setPointerCapture() {},
};
const context = vm.createContext({
  R, SQ, ZOOM_MIN: 1, ZOOM_MAX: zoomMax, devicePixelRatio: 1,
  canvas, game: { wrap: true, cols, rows },
  WORLD_W: SQ * R * cols, WORLD_H: R * 1.5 * (rows - 1) + 2 * R,
  cam: { x: 1800, y: 1400 }, offset: { x: 0, y: 0 },
  baseScale: 1, mapSize: { w: 1200, h: 900 }, zoom: 7,
  E: {
    clamp: (x, min, max) => Math.min(max, Math.max(min, x)),
    tile: (game, c, r) => r < 0 || r >= game.rows ? null : {
      c: ((c % game.cols) + game.cols) % game.cols, r,
    },
  },
  wraps: () => context.game.wrap,
  requestMapFrame() {},
});
vm.runInContext(view, context, { filename: 'dist/ui/view.js' });
const run = expression => vm.runInContext(expression, context);

run('computeView()');
const start = run('toWorld(700, 450)');
run('changeZoom(100, { x: 700, y: 450 })');
assert.equal(run('zoom'), zoomMax, 'Wheel and button zoom must stop at the new maximum');
const end = run('toWorld(700, 450)');
assert(Math.abs(start.x - end.x) < 0.001, 'Zooming must keep the horizontal cursor anchor fixed');
assert(Math.abs(start.y - end.y) < 0.001, 'Zooming must keep the vertical cursor anchor fixed');

run('changeZoom(0.000001)');
assert.equal(run('zoom'), 1, 'Zooming out must still respect the original minimum');

// Unit/hex selection must still map the centre of a magnified hex correctly.
run('zoom = ZOOM_MAX; cam = hexCenter({ c: 44, r: 20 }); computeView()');
const midY = run('viewPad().top + (mapSize.h - viewPad().top - viewPad().bottom) / 2');
const hit = run('hitHex(600, ' + midY + ')');
assert.equal(hit.c, 44);
assert.equal(hit.r, 20);

run('zoom = 7; cam = { x: 1800, y: 1400 }; computeView(); attachMap()');
let prevented = false;
const wheelAt = (deltaY, deltaMode) => canvas.onwheel({
  deltaY, deltaMode, clientX: 700, clientY: 450,
  preventDefault() { prevented = true; },
});
const anchorBefore = run('toWorld(700, 450)');
wheelAt(-100, 0); // Typical mouse wheel delta.
assert(prevented, 'Canvas wheel handling should prevent page scrolling');
assert(run('zoom') > 8, 'A mouse-wheel notch should move noticeably toward close inspection');
const anchorAfter = run('toWorld(700, 450)');
assert(Math.abs(anchorBefore.x - anchorAfter.x) < 0.001);
assert(Math.abs(anchorBefore.y - anchorAfter.y) < 0.001);
const trackpadBefore = run('zoom');
wheelAt(-2, 0);
assert(run('zoom') > trackpadBefore);
assert(run('zoom') / trackpadBefore < 1.02, 'Small trackpad input should not jump the camera');
run('zoom = ZOOM_MAX; computeView()');
wheelAt(-100, 0);
assert.equal(run('zoom'), zoomMax, 'Wheel zoom must not exceed the cap');

console.log('Camera close-zoom regression checks passed.');

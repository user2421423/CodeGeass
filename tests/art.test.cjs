const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function setup(hostname = 'user2421423.github.io', published = {}) {
  const requests = [], images = [];
  class Image {
    constructor() { this.complete = false; this.naturalWidth = 0; this.naturalHeight = 0; images.push(this); }
    set src(value) { this.url = value; }
  }
  const env = { Image, location: { hostname }, KnightmareArtManifest: published,
    fetch: url => { requests.push(url); return Promise.resolve({ ok: false }); } };
  vm.createContext(env);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist/art.js'), 'utf8') + '\nthis.api = ART;', env);
  return { env, api: env.api, requests, images };
}
test('Published art works synchronously at a GitHub Pages subpath without fetching ignored files', () => {
  const { api, requests, images } = setup(undefined, { base: 'assets/art/', units: { glasgow: 'units/glasgow.png' } });
  assert(api.unit('glasgow').includes('src="assets/art/units/glasgow.png"'));
  assert(!api.unit('sutherland').includes('<img'));
  assert.equal(requests.length, 0);
  assert.equal(images[0].url, 'assets/art/units/glasgow.png');
});
test('Local overrides preserve the original path of untouched published artwork', () => {
  const { api } = setup(undefined, { base: 'assets/art/', units: { glasgow: 'units/glasgow.png' }, portraits: { suzaku: 'portraits/suzaku.jpg' } });
  api.useLocal({ units: { sutherland: 'units/sutherland.png' } }, true);
  assert(api.unit('glasgow').includes('assets/art/units/glasgow.png'));
  assert(api.unit('sutherland').includes('local-art/units/sutherland.png'));
  assert(api.portrait('suzaku').includes('assets/art/portraits/suzaku.jpg'));
});
test('Pending and failed unit images fall back; completed images draw with their own aspect ratio', () => {
  const { api, images } = setup(undefined, { base: 'assets/art/', units: { glasgow: 'units/glasgow.png' } });
  const calls = [], ctx = { save() {}, restore() {}, translate() {}, scale() {}, drawImage(...args) { calls.push(args); } };
  assert.equal(api.drawUnit(ctx, 'glasgow', 'britannia', 0, 0, 100), false);
  const fallback = images.find(i => i.url.startsWith('data:image/svg'));
  Object.assign(fallback, { complete: true, naturalWidth: 200, naturalHeight: 200 });
  assert.equal(api.drawUnit(ctx, 'glasgow', 'britannia', 0, 0, 100), true);
  assert.equal(calls.at(-1)[0], fallback);
  Object.assign(images[0], { complete: true, naturalWidth: 300, naturalHeight: 600 });
  api.drawUnit(ctx, 'glasgow', 'britannia', 0, 0, 100);
  assert.equal(calls.at(-1)[0], images[0]);
  assert.equal(calls.at(-1)[3], 50);
  assert.equal(calls.at(-1)[4], 100);
  images[0].onerror();
  api.drawUnit(ctx, 'glasgow', 'britannia', 0, 0, 100);
  assert.equal(calls.at(-1)[0], fallback);
});
test('Portrait crops stay within the image and invalid manifest paths retain drawn art', () => {
  const { api, images } = setup(undefined, { base: 'assets/art/', portraits: { suzaku: { src: 'portraits/suzaku.jpg', fx: 4, fy: -2 }, leila: '../raw/leila.png' } });
  Object.assign(images[0], { complete: true, naturalWidth: 500, naturalHeight: 700 });
  const crop = api.portraitSprite('suzaku', 13, 16);
  assert(crop.sx >= 0 && crop.sy >= 0 && crop.sx + crop.sw <= 500 && crop.sy + crop.sh <= 700);
  assert(api.portrait('suzaku').includes('object-position:100% 0%'));
  assert(!api.portrait('leila').includes('<img'));
  api.useLocal({ units: { glasgow: 'units/x.png" onerror="alert(1)' } });
  assert(!api.unit('glasgow').includes('<img'));
});

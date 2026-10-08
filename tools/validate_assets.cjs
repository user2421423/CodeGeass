// Validate exactly the files GitHub Pages ships, without network access or extra dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const E = require('../dist/engine.js');
const tracked = new Set(execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).trim().split('\n'));
const mustBeTracked = process.argv.includes('--tracked');
function checkFile(relative) {
  assert(!relative.includes('..') && !path.isAbsolute(relative), `Unsafe path: ${relative}`);
  const name = 'dist/' + relative;
  assert(fs.existsSync(path.join(dist, relative)), `Missing public asset: ${name}`);
  assert(fs.statSync(path.join(dist, relative)).size > 0, `Empty public asset: ${name}`);
  if (mustBeTracked) assert(tracked.has(name), `Asset will not deploy because it is untracked: ${name}`);
}
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (!/^(data:|https?:|#)/.test(match[1])) checkFile(match[1]);
}
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'assets/art/manifest.json'), 'utf8'));
checkFile('assets/art/manifest.json');
checkFile('assets/art/manifest.js');
const env = {};
vm.runInNewContext(fs.readFileSync(path.join(dist, 'assets/art/manifest.js'), 'utf8'), env);
assert.equal(JSON.stringify(env.KnightmareArtManifest), JSON.stringify(manifest), 'JSON and startup art manifests differ');
assert.equal(manifest.base, 'assets/art/');
for (const [kind, known] of [['units', E.TYPES], ['portraits', E.COMMANDERS], ['buildings', { city: 1, port: 1, port_coastal: 1, mine: 1 }]]) {
  assert(manifest[kind] && typeof manifest[kind] === 'object');
  for (const [id, entry] of Object.entries(manifest[kind])) {
    assert(Object.hasOwn(known, id), `Unknown ${kind} id: ${id}`);
    const src = typeof entry === 'string' ? entry : entry.src;
    assert(new RegExp(`^${kind}/[\\w-]+\\.(png|jpe?g|webp|gif)$`, 'i').test(src), `Unsafe art path: ${src}`);
    checkFile(manifest.base + src);
    const bytes = fs.readFileSync(path.join(dist, manifest.base, src));
    const ext = path.extname(src).toLowerCase();
    const valid = ext === '.png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : ext === '.webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
      : ext === '.gif' ? /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6))
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    assert(valid, `Invalid image content: ${src}`);
    for (const key of ['fx', 'fy']) if (typeof entry === 'object' && key in entry)
      assert(Number.isFinite(entry[key]) && entry[key] >= 0 && entry[key] <= 1, `Invalid portrait focus: ${id}.${key}`);
  }
  console.log(`${kind}: ${Object.keys(manifest[kind]).length}/${Object.keys(known).length} published; remaining entries use drawn art.`);
}
for (const name of tracked) assert(!/^dist\/(?:local-art\/(?!README\.md$)|assets\/art\/raw\/)/.test(name), `Raw/local-only art would leak into Pages: ${name}`);
console.log('PASS: public entrypoint, startup manifest, image paths, signatures, and deployment boundaries.');

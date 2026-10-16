'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const renderFile = path.join(root, 'src/renderer/01-map-primitives.part.js');
const renderSource = fs.readFileSync(renderFile, 'utf8');
const atlasSource = fs.readFileSync(path.join(root, 'src/renderer/04-map-caching.part.js'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist/ui/renderer.js'), 'utf8');
new vm.Script(bundle, { filename: 'renderer.js' }); // Catch broken braces / blank-map failures.
const counts = {
  forest:3, mountain:2, peak:2, desert:3, snow:2,
  urban:2, sea:3, coast:2, crater:1, cloud:2, storm:2,
};
for (const [kind, count] of Object.entries(counts)) for (let i=1;i<=count;i++) {
  const filename = path.join(root, 'dist/assets/terrain', kind+'-'+i+'.svg');
  const svg = fs.readFileSync(filename, 'utf8');
  assert.match(svg, /<svg\s/);
  assert.match(svg, /<\/svg>/);
  assert.match(svg, /<(?:path|ellipse|rect|circle|polygon)\s/);
  assert.ok(svg.length < 7000, filename+' is too large');
}
const paintedFile = path.join(root, 'dist/assets/terrain/generated-terrain-atlas.webp');
const paintedBytes = fs.readFileSync(paintedFile);
assert.equal(paintedBytes.subarray(0,4).toString(), 'RIFF');
assert.equal(paintedBytes.subarray(8,12).toString(), 'WEBP');
assert.ok(paintedBytes.byteLength < 30000, 'Painted atlas is unexpectedly large');
const begin = renderSource.indexOf('const TERRAIN_ART_VARIANTS = ');
const end = renderSource.indexOf('// Selected tile:', begin);
assert.ok(begin > 0 && end > begin, 'terrain art region missing');
const source = renderSource.slice(begin, end);
const calls = [];
let pacific = false;
const canvas = {
  drawImage(image, ...args) {
    if (args.length === 8) {
      const [sx,sy,sw,sh,x,y,w,h]=args;
      assert.equal(sw,48); assert.equal(sh,48);
      assert.ok(sx>=0 && sx<=192 && sx%48===0, 'atlas X outside sprite grid');
      assert.ok(sy===0 || sy===48, 'atlas Y outside sprite grid');
      calls.push({src:image.src,x,y,w,h,painted:true});
    } else {
      const [x,y,w,h]=args;
      calls.push({src:image.src,x,y,w,h,painted:false});
    }
  }
};
class FakeImage {
  constructor(){ this.complete = true; this.naturalWidth = 100; this.naturalHeight = 100; }
  set src(value) {
    this._src=value;
    if (value.endsWith('generated-terrain-atlas.webp')) {
      this.naturalWidth=240;this.naturalHeight=96;
    }
  }
  get src(){return this._src;}
}
const sandbox = {
  ctx:canvas, R:45, Image:FakeImage,
  game:{mode:'scenario',tiles:[],cols:1,rows:1}, E:{adjacent:()=>[]},
  isPacificAirBattle:()=>pacific,
  hash01(c,r,s=0) {
    const v = Math.sin(c * 127.1 + r * 311.7 + s * 74.7) * 43758.5453;
    return v - Math.floor(v);
  }
};
vm.createContext(sandbox);
vm.runInContext(source+'\nthis.renderTerrain = terrainProps;',sandbox,{timeout:1000});
function render(kind, c, r, scale=1.2){
  calls.length = 0;
  sandbox.renderTerrain({terrain:kind,c,r},200,180,scale);
  for(const call of calls){
    assert.ok(Math.abs(call.x+call.w/2-200) < 0.0001,kind+' not centered X');
    assert.ok(Math.abs(call.y+call.h/2-180) < 0.0001,kind+' not centered Y');
    assert.match(call.src, /assets\/terrain\//);
  }
  return calls.length;
}
for(const kind of ['forest','mountain','peak','desert','snow','urban','coast','crater','sea']){
  let visible=0;
  for(let r=0;r<6;r++)for(let c=0;c<8;c++)visible+=render(kind,c,r);
  assert.ok(visible>0,kind+' has no drawn terrain');
  assert.ok(calls.every(c=>c.painted),kind+' is not using new painted artwork');
}
for(const kind of ['forest','mountain','desert','snow','urban','sea']){
  let close=0, medium=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    close+=render(kind,c,r,1.2);
    medium+=render(kind,c,r,.8);
  }
  assert.ok(close>=medium,kind+' detail density increased when zooming out');
  assert.equal(render(kind,0,0,.45),0,kind+' appears at far zoom');
}
pacific=true;
assert.ok(render('forest',4,2)>0,'Pacific cloud missing');
assert.ok(render('mountain',4,2)>0,'Pacific storm missing');
assert.equal(render('desert',4,2),0,'land asset drawn in Pacific sky');
assert.match(atlasSource, /TERRAIN_REGION_TINTS/);
assert.match(atlasSource, /24, 26, 32, 43, Infinity/);
console.log('Terrain art check passed: 10 painted images + 24 SVG fallbacks, full bundle syntax, centered sprites, LOD and Pacific sky.');

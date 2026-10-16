'use strict';
/*
 * High-resolution world-aligned backdrops for regional scenario gameplay.
 * Unlike the small 1440x900 gallery pictures, these are detailed enough to
 * hold the map while expensive geographic chunks are generated off-frame.
 * Do not draw troops, stations or UI into these permanent map backgrounds.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright-core');
const DIST = path.resolve(__dirname, '../dist');
const OUT = path.join(DIST, 'scenario-hires');
const SIZE = { width: 4096, height: 2560 };
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml',
  '.json':'application/json' };
async function run() {
  fs.mkdirSync(OUT, { recursive:true });
  const server = http.createServer((req,res) => {
    let file;
    try {
      const uri = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      file = path.resolve(DIST, '.' + (uri === '/' ? '/index.html' : uri));
      if (!file.startsWith(DIST + path.sep)) { res.writeHead(403);res.end();return; }
    } catch(e) { res.writeHead(400);res.end();return; }
    fs.readFile(file,(err,bytes) => {
      if(err) {res.writeHead(404);res.end();return;}
      res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'});
      res.end(bytes);
    });
  });
  await new Promise((resolve,reject) => {
    server.once('error',reject); server.listen(0,'127.0.0.1',resolve);
  });
  let browser;
  try {
    const binary = ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
      '/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
    browser = await chromium.launch({headless:true,
      ...(binary ? {executablePath:binary} : {channel:'chrome'}),
      args:['--no-sandbox','--disable-dev-shm-usage','--js-flags=--expose-gc']});
    const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
    page.setDefaultTimeout(180000);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/',
      {waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(() => typeof scenariosReady !== 'undefined' &&
      scenariosReady && typeof paintMap === 'function' && E.scenarios?.byId,
      null,{timeout:180000});
    const ids = await page.evaluate(() =>
      SCENARIO_MANIFEST.map(s=>s.id).filter(id=>E.scenarios.byId[id]));
    console.log('Rendering '+ids.length+' detailed, troop-free theatre maps.');
    for(let i=0;i<ids.length;i++) {
      const id=ids[i];
      const data=await page.evaluate(({id,width,height})=>{
        const m=E.scenarios.byId[id];
        const game=m.create(m.sides[0],'normal',246801);
        const canvas=document.createElement('canvas');
        canvas.width=width;canvas.height=height;
        const b=canvas.getContext('2d',{alpha:false});
        if(!b)throw Error('Unable to allocate high-resolution canvas');
        // Exact world-to-pixel transform matches the tactical world; the
        // screenshot is stretched back to WORLD_W x WORLD_H by the renderer.
        paintMap(b,game,width,height,1,false,true);
        return canvas.toDataURL('image/webp',.91);
      },{id,width:SIZE.width,height:SIZE.height});
      if(!data.startsWith('data:image/webp;base64,'))
        throw Error('WebP export unsupported for '+id);
      const bytes=Buffer.from(data.split(',')[1],'base64');
      if(bytes.length<3000)throw Error('High-resolution image unexpectedly small for '+id);
      fs.writeFileSync(path.join(OUT,id+'.webp'),bytes);
      console.log((i+1)+'/'+ids.length+' '+id+' '+(bytes.length/1024).toFixed(1)+' KiB');
      if(i%3===0)await page.evaluate(()=>{if(typeof gc==='function')gc()});
    }
    if(errors.length)throw Error('Browser script errors: '+errors.join(' | '));
    const generated=fs.readdirSync(OUT).filter(n=>n.endsWith('.webp'));
    if(generated.length!==ids.length)
      throw Error('Expected '+ids.length+' maps, found '+generated.length);
    console.log('Completed all '+generated.length+' high-resolution backdrops');
  } finally {
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(e=>{console.error(e);process.exitCode=1;});

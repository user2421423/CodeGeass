'use strict';
// Headless comparison using the exact live camera/renderer and three scenarios.
// Run after node tools/build_sources.cjs.
// NODE_PATH=/tmp/perf-deps/node_modules node tools/benchmark_regional_maps.cjs
const fs = require('node:fs'),path = require('node:path'),http = require('node:http');
const { chromium } = require('playwright-core');
const DIST = path.resolve(__dirname,'../dist');
const SCENARIOS = ['war-for-australia','division-japan','invasion-california','invasion-korea'];
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
function percentile(values,p) {
  if (!values.length) return null;
  const sorted=values.slice().sort((a,b)=>a-b);
  return +sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))].toFixed(2);
}
(async()=>{
  const server=http.createServer((req,res)=>{
    let file;
    try {
      const uri=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      file=path.resolve(DIST,'.'+(uri==='/'?'/index.html':uri));
      if(!file.startsWith(DIST+path.sep)){res.writeHead(403);res.end();return;}
    } catch(e){res.writeHead(400);res.end();return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404);res.end();return;}
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
      res.end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    const bin=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
    browser=await chromium.launch({headless:true,...(bin?{executablePath:bin}:{channel:'chrome'}),args:['--no-sandbox','--disable-dev-shm-usage']});
    const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
    page.setDefaultTimeout(180000);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof scenariosReady!=='undefined'&&scenariosReady&&E.scenarios?.byId?.['invasion-california']&&typeof startScenario==='function'&&window.KNIGHTMARE_MAP_PERF,null,{timeout:180000});
    const cases=[];
    for(const id of SCENARIOS) {
      const result=await page.evaluate(async id=>{
        const model=E.scenarios.byId[id];
        scenarioKind=id; scenarioSide=model.sides[0]; scenarioDifficulty='normal';
        startScenario(scenarioSide);
        await new Promise(resolve=>setTimeout(resolve,400));
        window.KNIGHTMARE_MAP_PERF.reset();
        const durations=[];
        // The same 48 camera moves in all theatres; cross into uncached areas,
        // then return to the starting area to measure reuse.
        for(let i=0;i<48;i++){
          const t=i<24?i/23:(47-i)/23;
          cam.x=WORLD_W*(0.22+0.56*t);
          cam.y=WORLD_H*(0.27+0.46*(i%12)/11);
          const began=performance.now();
          requestMapFrame();
          await new Promise(resolve=>requestAnimationFrame(resolve));
          durations.push(performance.now()-began);
          await new Promise(resolve=>setTimeout(resolve,35));
        }
        await new Promise(resolve=>setTimeout(resolve,500));
        return {scenario:id,hexes:game.cols*game.rows,
          frameP50Ms:durations.slice().sort((a,b)=>a-b)[23],
          framesMs:durations,
          ...window.KNIGHTMARE_MAP_PERF.snapshot()};
      },id);
      cases.push({...result,frameP50Ms:percentile(result.framesMs,.5),frameP95Ms:percentile(result.framesMs,.95)});
      delete cases[cases.length-1].framesMs;
      console.log(id+': '+JSON.stringify(cases[cases.length-1]));
    }
    if(errors.length) throw Error('Browser errors: '+errors.join(' | '));
    const output={timestamp:new Date().toISOString(),viewport:'1440x900@1x',cases};
    fs.writeFileSync(process.env.BENCHMARK_OUTPUT||'regional-map-benchmark.json',JSON.stringify(output,null,2)+'\n');
    if(cases.some(c=>c.frameP95Ms==null||!Number.isFinite(c.frameP95Ms))) process.exitCode=1;
  } finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});

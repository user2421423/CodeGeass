'use strict';
// Headless comparison using the exact live camera/renderer and eight representative maps.
// Run after node tools/build_sources.cjs.
// NODE_PATH=/tmp/perf-deps/node_modules node tools/benchmark_regional_maps.cjs
const fs = require('node:fs'),path = require('node:path'),http = require('node:http');
const { chromium } = require('playwright-core');
const DIST = path.resolve(process.env.BENCHMARK_DIST || path.join(__dirname,'../dist'));
const SCENARIOS = process.env.BENCHMARK_STARTUP_ONLY ? [] : ['world','ufn2018','division-japan','invasion-california','war-for-australia','invasion-korea','cf-central-america','eu-rocky-mountains'];
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
    const bin=[process.env.BROWSER_EXECUTABLE_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(fs.existsSync);
    browser=await chromium.launch({headless:true,...(bin?{executablePath:bin}:{channel:'chrome'}),args:['--no-sandbox','--disable-dev-shm-usage']});
    const page=await browser.newPage(process.env.BENCHMARK_MOBILE ? {viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true} : {viewport:{width:1440,height:900},deviceScaleFactor:1});
    page.setDefaultTimeout(180000);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(() => {
      Date.now = () => 11; // Identical game seeds in both revisions.
      performance.setResourceTimingBufferSize(5000);
      window.menuReadyAt = null;
      new MutationObserver(() => {
        if (window.menuReadyAt == null && document.querySelector('[aria-label="Operation setup"]'))
          window.menuReadyAt = performance.now();
      }).observe(document, {subtree:true, childList:true});
    });
    const session = await page.context().newCDPSession(page);
    await session.send('Performance.enable');
    await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof startScenario==='function'&&window.KNIGHTMARE_MAP_PERF&&window.menuReadyAt!=null);
    await page.waitForTimeout(1200);
    const startup = await page.evaluate(() => ({menuInteractiveMs:window.menuReadyAt,
      jsBytes:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.js')).reduce((n,r)=>n+r.decodedBodySize,0),
      scripts:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.js')).map(r=>new URL(r.name).pathname)}));
    const initialMetrics = await session.send('Performance.getMetrics');
    startup.scriptExecutionMs = initialMetrics.metrics.find(m=>m.name==='ScriptDuration').value*1000;
    startup.heapBytes = initialMetrics.metrics.find(m=>m.name==='JSHeapUsedSize').value;
    const cases=[];
    await page.evaluate(() => { window.benchmarkDrawTimes=[]; const original=draw; draw=function(...args) { const began=performance.now(); try { return original(...args); } finally { window.benchmarkDrawTimes.push(performance.now()-began); } }; });
    for(const id of SCENARIOS.filter(id=>!process.env.SCENARIO_IDS || process.env.SCENARIO_IDS.split(',').includes(id))) {
      const result=await page.evaluate(async id=>{
        const beganLoad = performance.now();
        if (id === 'world' || id === 'ufn2018') {
          setup.conquest=id; setup.side=E.CONQUESTS[id].selectable[0];
          await newGame();
        } else {
          if (typeof ensureScenario === 'function') await ensureScenario(id);
          else await loadScenarios();
          const model=E.scenarios.byId[id];
          scenarioKind=id; scenarioSide=model.sides[0]; scenarioDifficulty='normal';
          await startScenario(scenarioSide);
        }
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const imageDeadline=performance.now()+30000;
        // An empty first canvas is not a playable frame. Eager main may finish
        // two animation frames before its preview/current-ownership layer loads.
        while (regionalMapLayers() && !mapAtlasFallback.failed &&
            (!mapAtlasFallback.ready || mapAtlasStrategicOwners.revision !== (game.mapRevision || 0))) {
          if (performance.now()>imageDeadline) throw Error('No valid opening map: '+id);
          requestMapFrame();await new Promise(resolve=>setTimeout(resolve,16));
        }
        await new Promise(resolve=>requestAnimationFrame(resolve));
        const startupMs = performance.now()-beganLoad;
        await new Promise(resolve=>setTimeout(resolve,400));
        window.KNIGHTMARE_MAP_PERF.reset();
        window.benchmarkDrawTimes.length=0;
        const durations=[];
        // The same 48 camera moves in all theatres; cross into uncached areas,
        // then return to the starting area to measure reuse.
        for(let i=0;i<48;i++){
          const t=i<24?i/23:(47-i)/23;
          cam.x=WORLD_W*(0.22+0.56*t);
          cam.y=WORLD_H*(0.27+0.46*(i%12)/11);
          const began=performance.now();
          noteMapNavigation(); requestMapFrame();
          await new Promise(resolve=>requestAnimationFrame(resolve));
          durations.push(performance.now()-began);
          await new Promise(resolve=>setTimeout(resolve,35));
        }
        await new Promise(resolve=>setTimeout(resolve,500));
        const draws=window.benchmarkDrawTimes.slice();
        const zoomTimes=[], zoomVisibleTimes=[], zoomSamples=[];
        for (const target of [24,32,38,32,24]) {
          zoom = Math.min(ZOOM_MAX, target/R/baseScale);
          const began = performance.now(); noteMapNavigation(); requestMapFrame();
          await new Promise(resolve=>requestAnimationFrame(resolve));
          // Keep visible presentation separate from optional neighbouring work.
          // Await the real completed LOD AND its crossfade, not only an empty queue.
          let visibleMs=null, queueMs=null;
          const regional=regionalMapLayers() && mapAtlasFallback.ready;
          const shown=()=>!regional || (regionLODPrevious()===mapAtlasState.scale &&
            mapAtlasFade.target===null && mapAtlasViewport && regionLODReady(mapAtlasState.scale,
              mapAtlasViewport.left,mapAtlasViewport.right,mapAtlasViewport.top,mapAtlasViewport.bottom));
          while(performance.now()-began<15000){
            const elapsed=performance.now()-began;
            if(visibleMs===null && shown()) visibleMs=elapsed;
            if(queueMs===null && visibleMs!==null && !mapAtlasWarmQueue.length) queueMs=elapsed;
            if(visibleMs!==null && queueMs!==null)break;
            await new Promise(resolve=>setTimeout(resolve,30));
          }
          if(visibleMs===null || queueMs===null)throw Error('Zoom did not settle: '+id+' / '+target);
          zoomTimes.push(queueMs);
          if(regional)zoomVisibleTimes.push(visibleMs);
          zoomSamples.push({target,visibleMs:regional?visibleMs:null,queueMs});
        }
        return {scenario:id,startupMs,zoomSettleMs:Math.max(...zoomTimes),zoomVisibleMs:zoomVisibleTimes.length?Math.max(...zoomVisibleTimes):null,zoomSamples,hexes:game.cols*game.rows,
          drawTimes:draws,frameP50Ms:durations.slice().sort((a,b)=>a-b)[23],
          framesMs:durations,
          ...window.KNIGHTMARE_MAP_PERF.snapshot()};
      },id);
      cases.push({...result,frameP50Ms:percentile(result.framesMs,.5),frameP95Ms:percentile(result.framesMs,.95),drawP50Ms:percentile(result.drawTimes,.5),drawP95Ms:percentile(result.drawTimes,.95)});
      delete cases[cases.length-1].framesMs;
      delete cases[cases.length-1].drawTimes;
      await session.send('HeapProfiler.collectGarbage');
      const memory=await session.send('Performance.getMetrics');
      cases[cases.length-1].heapBytes=memory.metrics.find(m=>m.name==='JSHeapUsedSize').value;
      console.log(id+': '+JSON.stringify(cases[cases.length-1]));
    }
    if(errors.length) throw Error('Browser errors: '+errors.join(' | '));
    const output={timestamp:new Date().toISOString(),browser:await browser.version(),viewport:process.env.BENCHMARK_MOBILE?'390x844@3x (Chromium touch emulation)':'1440x900@1x',startup,cases};
    fs.writeFileSync(process.env.BENCHMARK_OUTPUT||'regional-map-benchmark.json',JSON.stringify(output,null,2)+'\n');
    if(cases.some(c=>c.frameP95Ms==null||!Number.isFinite(c.frameP95Ms))) process.exitCode=1;
  } finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});

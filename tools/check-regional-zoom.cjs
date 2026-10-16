'use strict';
// Regressions for the regional map renderer zoom transition.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright-core');
const DIST=path.resolve(__dirname,'../dist');
const OUT=process.env.REGIONAL_ZOOM_OUTPUT||'/tmp/regional-zoom-checks';
const SCENARIOS=['invasion-korea','division-japan','invasion-california','war-for-australia'];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.webp':'image/webp','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'};
async function run(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=http.createServer((req,res)=>{
  let name;
  try{
   const p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   name=path.resolve(DIST,'.'+(p==='/'?'/index.html':p));
   if(!name.startsWith(DIST+path.sep)){res.writeHead(403);res.end();return;}
  }catch(e){res.writeHead(400);res.end();return;}
  fs.readFile(name,(e,bytes)=>{
   if(e){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream'});
   res.end(bytes);
  });
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 let browser;
 try{
  const bin=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
  browser=await chromium.launch({headless:true,...(bin?{executablePath:bin}:{channel:'chrome'}),
   args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.setDefaultTimeout(180000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>typeof scenariosReady!=='undefined'&&scenariosReady&&
   typeof startScenario==='function'&&typeof changeZoom==='function'&&window.KNIGHTMARE_MAP_PERF,
   null,{timeout:180000});
  const report=[];
  for(const id of SCENARIOS){
   const initial=await page.evaluate(async id=>{
    const model=E.scenarios.byId[id];if(!model)throw Error('Scenario missing '+id);
    scenarioKind=id;scenarioSide=model.sides[0];scenarioDifficulty='normal';
    startScenario(scenarioSide);
    await new Promise(resolve=>setTimeout(resolve,400));
    // World-relative map gradients must use the same endpoints for every
    // atlas viewport, independent of what is visible.
    const b=document.createElement('canvas').getContext('2d');
    const gradients=[];
    const original=b.createLinearGradient;
    b.createLinearGradient=function(...args){gradients.push(args);return original.apply(this,args);};
    GEOGRAPHY.paint(b,game,0,960,0,960,0.4,'static');
    if(!gradients.some(a=>a.length===4&&a[0]===0&&a[1]===0&&a[2]===0&&
       Math.abs(a[3]-mapH(game))<.01))
      throw Error('Scenario ocean gradient not world anchored: '+id);
    return {id,worldW:WORLD_W,worldH:WORLD_H,cols:game.cols,rows:game.rows};
   },id);
   const levels=[18,21.8,22.2,26,32,26,22.2,21.8,18];
   const samples=[];
   for(let i=0;i<levels.length;i++){
    const p=levels[i];
    const result=await page.evaluate(async ({p})=>{
      const targetZoom=Math.min(ZOOM_MAX,Math.max(ZOOM_MIN,p/(R*baseScale)));
      changeZoom(targetZoom/zoom,{x:mapSize.w/2,y:mapSize.h/2});
      requestMapFrame();
      await new Promise(resolve=>setTimeout(resolve,320));
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const data=ctx.getImageData(Math.floor(canvas.width/2),
        Math.floor(canvas.height/2),1,1).data;
      const perf=window.KNIGHTMARE_MAP_PERF.snapshot();
      if(!data[3])throw Error('Blank canvas: '+game.scenario.id+' at '+p);
      return {hexPixels:+(R*baseScale*zoom).toFixed(2),
        alpha:data[3],highRes:perf.highResolutionBackdrop,
        snapshotFrames:perf.snapshotFrames,
        reused:perf.reusedZoomFrames,
        faded:perf.blendedZoomFrames};
    },{p});
    if(!Number.isFinite(result.hexPixels)||result.hexPixels<=0)
      throw Error('Invalid zoom scale for '+id);
    if(i===0||i===4||i===8)
      await page.screenshot({path:path.join(OUT,id+'-'+i+'.png')});
    samples.push(result);
   }
   const last=samples[samples.length-1];
   const record={...initial,samples,highResolutionBackdrop:last.highRes,
    reusedFrames:last.reused,blendedFrames:last.faded};
   report.push(record);
   console.log(id+' '+JSON.stringify({
     grid:initial.cols+'x'+initial.rows,
     finalZoom:last.hexPixels,highResolutionBackdrop:last.highRes,
     reusedFrames:last.reused,blendedFrames:last.faded}));
  }
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({report,errors},null,2)+'\n');
  if(errors.length)throw Error('Uncaught browser exceptions: '+errors.join(' | '));
  if(report.length!==SCENARIOS.length)throw Error('Scenario zoom cases incomplete');
  console.log('PASS all four regional scenario zoom-in/zoom-out checks');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});

#!/usr/bin/env node
'use strict';
// Verify that the scenario selector shows the actual mainland-China battlefield,
// not the obsolete Luoyang-only preview, on both desktop and mobile.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../dist');
(async()=>{
 const preview=fs.readFileSync(path.join(ROOT,'scenario-previews/ufn-civil-war.webp'));
 assert(preview.length>700,'Missing mainland preview');
 assert.equal(preview.toString('ascii',0,4),'RIFF');
 assert.equal(preview.toString('ascii',8,12),'WEBP');
 const server=http.createServer((req,res)=>{
  let file;
  try{
   const url=new URL(req.url,'http://127.0.0.1');
   file=path.resolve(ROOT,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
   if(!file.startsWith(ROOT+path.sep))throw Error('unsafe');
  }catch{res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,bytes)=>{
   if(err){res.writeHead(404);res.end();return;}
   res.setHeader('Content-Type',file.endsWith('.webp')?'image/webp':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
   res.end(bytes);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  const chrome=[process.env.BROWSER_EXECUTABLE_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(x=>x&&fs.existsSync(x));
  browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{channel:'chrome'}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof scenarioDialog==='function'&&typeof ensureScenario==='function',{timeout:90000});
  await page.evaluate(async()=>{
   await ensureScenario('ufn-civil-war');
   scenarioWeeklySelected=false;
   scenarioKind='ufn-civil-war';
   scenarioSide='ufn';
   scenarioLibraryTheater='alternate-history';
   scenarioDialog();
  });
  const img=page.locator('#scenario-preview-map');
  await img.evaluate(el=>el.decode());
  async function inspect(){
   return await page.evaluate(()=>{
    const d=document.querySelector('.scenario-library'),im=document.querySelector('#scenario-preview-map');
    const p=document.querySelector('.scenario-brief-text>p');
    return {title:document.querySelector('.scenario-operation-header h2')?.textContent,
      cityText:document.querySelector('.scenario-map-legend')?.textContent,
      factions:[...document.querySelectorAll('.scenario-side-option')].map(x=>({side:x.dataset.scenarioFaction,stats:x.querySelector('.scenario-side-stats')?.textContent})),
      legend:document.querySelector('.scenario-mainland-opening')?.textContent,
      map:im.currentSrc,loaded:im.naturalWidth,height:im.naturalHeight,usedFallback:im.dataset.fallbackUsed,
      briefing:p?.textContent,whiteSpace:getComputedStyle(p).whiteSpace,
      viewport:innerWidth,dialogLeft:d.getBoundingClientRect().left,dialogRight:d.getBoundingClientRect().right};
   });
  }
  let state=await inspect();
  assert.equal(state.title,'UFN Civil War');
  assert.match(state.cityText,/119 cities/);assert.match(state.cityText,/232 starting formations/);
  assert.deepEqual(state.factions.map(x=>x.stats),['50 cities · 96 formations','69 cities · 136 formations']);
  assert.match(state.legend,/Nanjing/);assert.match(state.legend,/Luoyang/);
  assert.match(state.briefing,/mainland China/);
  assert.equal(state.whiteSpace,'normal','Mainland briefing is truncated on desktop');
  assert(state.map.endsWith('/ufn-civil-war.webp'));
  assert.equal(state.loaded,1440,'Menu is still using the obsolete mainland preview or SVG');
  assert(!state.usedFallback);
  await page.locator('[data-scenario-faction="cf"]').click();
  assert.equal(await page.evaluate(()=>scenarioSide),'cf');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>scenarioDialog());
  await page.locator('#scenario-preview-map').evaluate(el=>el.decode());
  state=await inspect();
  assert.equal(state.loaded,1440);
  assert(state.dialogLeft>=-3&&state.dialogRight<=state.viewport+3,'Menu overflows phone viewport');
  assert.match(state.legend,/Nanjing/);assert.match(state.legend,/Luoyang/);
  assert.deepEqual(errors,[],'JavaScript errors on menu page');
  console.log('PASS UFN Civil War national menu preview, briefing, faction stats and mobile controls');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error(e);process.exitCode=1});

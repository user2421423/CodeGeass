#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../dist');
const ids=['bk-civil-war','rounds-tournament','geass-war','protagonists-antagonists','partition-britannia','ufn-civil-war'];
(async()=>{
 for(const id of ids){
  const file=path.join(root,'scenario-previews',id+'.webp');
  const b=fs.readFileSync(file);
  assert(b.length>700,id+' preview missing');
  assert.equal(b.toString('ascii',0,4),'RIFF',id+' not a WebP');
  assert.equal(b.toString('ascii',8,12),'WEBP',id+' not WebP format');
 }
 const server=http.createServer((req,res)=>{
  let p;try{p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname==='/'
      ?'/index.html':new URL(req.url,'http://localhost').pathname));
   if(!p.startsWith(root+path.sep))throw Error('unsafe');
  }catch{res.writeHead(403);res.end();return}
  fs.readFile(p,(err,b)=>{if(err){res.writeHead(404);res.end();return}
   res.setHeader('Content-Type',p.endsWith('.webp')?'image/webp':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');
   res.end(b)});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  const chrome=[process.env.BROWSER_EXECUTABLE_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(p=>p&&fs.existsSync(p));
  browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{channel:'chrome'}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack)});
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof scenarioDialog==='function'&&typeof ensureScenario==='function',{timeout:90000});
  for(const id of ids){
   const result=await page.evaluate(async id=>{
    await ensureScenario(id);
    scenarioWeeklySelected=false;
    scenarioKind=id;scenarioSide=scenarioModel(id).sides[0];
    scenarioLibraryTheater='alternate-history';
    scenarioDialog();
    const dialog=document.querySelector('.scenario-library');
    const image=document.querySelector('#scenario-preview-map');
    await new Promise((resolve,reject)=>{
     if(image.complete)return image.naturalWidth?resolve():reject(Error('Preview failed to load'));
     image.addEventListener('load',resolve,{once:true});
     image.addEventListener('error',()=>reject(Error('Preview broken')),{once:true});
    });
    const sides=Array.from(document.querySelectorAll('.scenario-side-option')).map(e=>e.dataset.scenarioFaction);
    const difficulties=Array.from(document.querySelectorAll('#scenario-difficulty option')).map(e=>e.value);
    const outer=dialog.getBoundingClientRect();
    return {id,title:document.querySelector('.scenario-operation-header h2')?.textContent,
      sides,difficulties,flagsReady:sides.every(side=>ART.flagSVG(side)?.includes('<svg')),imageWidth:image.naturalWidth,imageHeight:image.naturalHeight,
      dialogLeft:outer.left,dialogRight:outer.right,viewport:innerWidth};
   },id);
   assert.equal(result.sides.length,id==='rounds-tournament'?6:id==='partition-britannia'?3:2,id+' wrong playable factions');
   assert(result.flagsReady,id+' missing alternate-history faction standard');
   assert.deepEqual(result.difficulties,['normal','hard','challenge','elite']);
   assert.equal(result.imageWidth,1440,id+' preview should match game renderer');
   assert(result.dialogLeft>=-3&&result.dialogRight<=result.viewport+3,id+' dialog overflows mobile viewport');
   console.log('MOBILE_UI '+JSON.stringify(result));
   for(const side of result.sides){
    await page.locator('[data-scenario-faction="'+side+'"]').click();
    assert.equal(await page.evaluate(()=>scenarioSide),side,id+' selector failed');
   }
   // Exercise the real deployment path and shared single regional save slot on
   // the same phone viewport, including the 500+ frame Pendragon scenario.
   const deployed=await page.evaluate(id=>{
     const side=E.scenarios.byId[id].sides[0],started=performance.now();
     startLoadedScenario(id,side,'normal',null);
     const elapsedMs=Math.round(performance.now()-started);
     const restored=getSave(SCENARIO_KEY);
     return {id,side,elapsedMs,units:game.units.length,tiles:game.tiles.length,
       savedId:restored?.scenario?.id,savedPlayer:restored?.player};
   },id);
   assert.equal(deployed.savedId,id,id+' did not use the existing regional save slot');
   assert.equal(deployed.savedPlayer,deployed.side,id+' changed player during save');
   assert(deployed.units>0&&deployed.tiles>0,id+' mobile battlefield did not load');
   assert(deployed.elapsedMs<30000,id+' initial mobile deployment exceeded 30 seconds');
   console.log('MOBILE_DEPLOY '+JSON.stringify(deployed));
  }
  // Exercise a real full rival cycle for all six scenarios at desktop size.
  await page.setViewportSize({width:1440,height:900});
  for(const id of ids){
   const cycle=await page.evaluate(async id=>{
    const sides=E.scenarios.byId[id].sides;
    startLoadedScenario(id,sides[0],'normal',null);
    const started=performance.now();
    await endTurn();
    return {id,turn:game.turn,phase:game.phase,player:game.player,
      elapsedMs:Math.round(performance.now()-started),aiSides:Object.keys(game.ai||{}),over:game.over};
   },id);
   assert.equal(cycle.turn,2,id+' failed to complete rival cycle');
   assert.equal(cycle.phase,cycle.player);
   console.log('DESKTOP_RIVAL_CYCLE '+JSON.stringify(cycle));
   if(id==='rounds-tournament'||id==='partition-britannia')await page.screenshot({path:'/tmp/codegeass-'+id+'.png'});
  }
  assert.deepEqual(errors,[],'Browser JS errors');
  console.log('PASS six scenario selectors, political previews, deployments, save slot and mobile dialog layout');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});

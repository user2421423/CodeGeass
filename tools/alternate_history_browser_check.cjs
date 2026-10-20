#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../dist');
const ids=['rounds-rebellion','shin-independence','chinese-civil-war','eu-military-coup'];
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
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
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
      sides,difficulties,imageWidth:image.naturalWidth,imageHeight:image.naturalHeight,
      dialogLeft:outer.left,dialogRight:outer.right,viewport:innerWidth};
   },id);
   assert.equal(result.sides.length,2,id+' needs two playable factions');
   assert.deepEqual(result.difficulties,['normal','hard','challenge','elite']);
   assert.equal(result.imageWidth,1440,id+' preview should match game renderer');
   assert(result.dialogLeft>=-3&&result.dialogRight<=result.viewport+3,id+' dialog overflows mobile viewport');
   console.log('MOBILE_UI '+JSON.stringify(result));
  }
  assert.deepEqual(errors,[],'Browser JS errors');
  console.log('PASS four faction selectors, four difficulty selectors, political previews and mobile dialog layout');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});

'use strict';
/*
 * One-time CI export of true game geographic maps to static WebP images.
 * No troops, city icons, mines, or other strategic markers are painted.
 * Browser scenario selector only fetches images; never creates preview games.
 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright-core');
const DIST=path.resolve(__dirname,'../dist'),OUT=path.join(DIST,'scenario-previews');
const SIZE={width:1440,height:900};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
async function generate(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=http.createServer((req,res)=>{
  let file;
  try{
   const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   file=path.resolve(DIST,'.'+(name==='/'?'/index.html':name));
   if(!file.startsWith(DIST+path.sep)){res.writeHead(403);res.end();return}
  }catch(e){res.writeHead(400);res.end();return}
  fs.readFile(file,(err,body)=>{
   if(err){res.writeHead(404);res.end();return}
   res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});
   res.end(body);
  });
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 let browser;
 try{
  const chrome=[process.env.BROWSER_EXECUTABLE_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(p=>fs.existsSync(p));
  browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{channel:'chrome'}),args:['--no-sandbox','--disable-dev-shm-usage','--js-flags=--expose-gc']});
  const page=await browser.newPage({viewport:SIZE,deviceScaleFactor:1});
  page.setDefaultTimeout(180000);
  page.on('pageerror',e=>console.error('Browser JS warning:',e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(() => typeof loadScenarios === 'function');
  await page.evaluate(() => loadScenarios());
  await page.waitForFunction(()=>typeof scenariosReady!=='undefined'&&scenariosReady&&typeof paintMap==='function'&&E.scenarios?.byId,null,{timeout:180000});
  const availableIds=await page.evaluate(()=>SCENARIO_MANIFEST.map(e=>e.id));
  const requestedIds=new Set((process.env.SCENARIO_IDS||'').split(',').map(x=>x.trim()).filter(Boolean));
  const ids=requestedIds.size?availableIds.filter(id=>requestedIds.has(id)):availableIds;
  if(requestedIds.size&&ids.length!==requestedIds.size)
   throw Error('Unknown scenario IDs: '+[...requestedIds].filter(id=>!availableIds.includes(id)).join(', '));
  // Preserve existing force statistics when exporting only a subset of scenarios.
  // Otherwise previously generated battlefields unexpectedly lose their stats.
  const metadataFile=path.join(OUT,'metadata.js');
  const metadata=requestedIds.size && fs.existsSync(metadataFile)
    ? {...vm.runInNewContext(fs.readFileSync(metadataFile,'utf8')+'\nSCENARIO_STATIC_MAPS')}
    : {};
  console.log('Generating '+ids.length+' static map images: '+SIZE.width+' x '+SIZE.height);
  for(let i=0;i<ids.length;i++){
   const id=ids[i];
   const result=await page.evaluate(({id,width,height})=>{
    const m=E.scenarios.byId[id];if(!m)throw Error('Missing model: '+id);
    const g=m.create(m.sides[0],'normal',246801);
    KnightmareScenarioForces.reduce(g);
    // Apply the fixed authored city roster before exporting city counts.
    // Regional rosters are finalized on the first engine income query.
    for (const side of m.sides) E.income(g,side);
    const sides=Object.fromEntries(m.sides.map(side=>[side,{
     cities:g.stations.filter(st=>st.owner===side).length,
     formations:g.units.reduce((n,u)=>n+(u.side===side?1:0)+(u.cargo||[]).filter(v=>v.side===side).length,0)
    }]));
    const data={cities:g.stations.length,formations:g.units.reduce((n,u)=>n+1+(u.cargo||[]).length,0),sides};
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable');
    // Preserve real coastlines/ownership, but skip every city and unit icon layer.
    paintMap(ctx,g,width,height,1,false,true);
    const webp=canvas.toDataURL('image/webp',.88);
    if(!webp.startsWith('data:image/webp;base64,'))throw Error('WebP unsupported');
    return {webp,data};
   },{id,width:SIZE.width,height:SIZE.height});
   const bytes=Buffer.from(result.webp.split(',')[1],'base64');
   if(bytes.length<700)throw Error('Empty image '+id);
   fs.writeFileSync(path.join(OUT,id+'.webp'),bytes);
   metadata[id]=result.data;
   console.log((i+1)+'/'+ids.length+' '+id+' '+Math.round(bytes.length/1024)+'KiB');
   if(i%5===0)await page.evaluate(()=>{if(typeof gc==='function')gc()});
  }
  if(ids.some(id=>!metadata[id])||(!requestedIds.size&&Object.keys(metadata).length!==ids.length))
    throw Error('Not all preview metadata exported');
  // Every successful selective run merges metadata for the requested scenarios
  // while retaining statistics for every previously exported operation.
  const updated='/* Static scenario data exported with geographic map pictures. */\n'
    +'const SCENARIO_STATIC_MAPS=Object.freeze('+JSON.stringify(metadata,null,2)+');\n';
  const tmpFile=metadataFile+'.tmp';
  fs.writeFileSync(tmpFile,updated);
  fs.renameSync(tmpFile,metadataFile);
  console.log('Generated '+ids.length+' geography-only pictures; metadata now covers '+Object.keys(metadata).length+' scenarios.');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
generate().catch(e=>{console.error(e);process.exitCode=1});

#!/usr/bin/env node
'use strict';
// Optional browser integration: BROWSER_EXECUTABLE_PATH=/path/to/chrome node tools/ability_targeting_browser.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright-core');
const {fixture}=require('./ability_targeting_smoke.cjs');
const E=require('../dist/engine.js');
const root=path.resolve(__dirname,'../dist');
const immediate=['rolo','leila','lelouch','sayoko','farnese'];
const ids=Object.keys(E.COMMANDERS).filter(k=>E.COMMANDERS[k].action&&!immediate.includes(k));
(async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const p=path.resolve(root,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));
  if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(p,(err,b)=>{if(err){res.writeHead(404);res.end();return;}
   const ext=path.extname(p);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[ext]||'text/html');res.end(b);
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const layout of ['desktop','portrait','landscape']){
   const mobile=layout!=='desktop';
   const context=await browser.newContext({viewport:layout==='portrait'?{width:390,height:844}:layout==='landscape'?{width:844,height:390}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
   await page.waitForFunction(()=>typeof commandDialog==='function'&&typeof render==='function');
   await page.evaluate(()=>ensureGeography());
   async function setup(id){
    const {g,actor}=fixture(id);
    await page.evaluate(({g,actor})=>{
     resetSession();game=g;selection={kind:'unit',id:actor.id};closeModal();setWorld();zoom=2.8;dockExpanded=false;render();centerOn(actor);
    },{g,actor});
   }
   async function point(p){return page.evaluate(p=>{const scale=computeView(),h=hexCenter(p),r=canvas.getBoundingClientRect();return{x:r.left+h.x*scale+offset.x,y:r.top+h.y*scale+offset.y};},p);}
   for(const id of ids){
    await setup(id);
    // Mobile intentionally starts with the ordinary Orders drawer folded.
    if(await page.locator('[data-action="mobile-unit-toggle"]').isVisible()) await page.locator('[data-action="mobile-unit-toggle"]').click();
    await page.locator('[data-action="feint"]').click();
    assert.equal(await page.evaluate(()=>!!abilityTargeting),true,id+' enters map mode');
    assert.equal(await page.locator('#modal-root > *').count(),0,id+' has no target list');
    await page.locator('[data-action="ability-cancel"]').waitFor({state:'visible'});
    const target=await page.evaluate(()=>[...abilityTargetCache.values()].at(-1));
    await page.evaluate(p=>centerOn(p),target);
    const xy=await point(target);
    if(mobile)await page.touchscreen.tap(xy.x,xy.y);else await page.mouse.click(xy.x,xy.y);
    const result=await page.evaluate(()=>({selecting:!!abilityTargeting,used:selectedUnit()?.feintUsedTurn,turn:game.turn}));
    assert.equal(result.selecting,false,id+' selection completes with '+(mobile?'tap':'mouse click'));
    assert.equal(result.used,result.turn,id+' spends one ability use');
    assert.equal(await page.evaluate(()=>effects.some(e=>e.kind==='shot'||e.kind==='ability')),true,id+' displays an attack or support effect');
   }
   // A map-selected Assault animates every actual shooter through the normal
   // weapon pipeline in desktop and both touch layouts.
   await setup('raymond');
   const assaultTarget=await page.evaluate(()=>{
    const actor=selectedUnit(),enemy=game.units.find(v=>v.side==='eu');enemy.hp=50000;
    const type=E.typeFor('britannia','rocket'),t=E.TYPES[type];
    const p=E.within(game,actor,2).find(p=>!E.unitAt(game,p)&&
      E.distance(p,enemy,game)>=t.min&&E.distance(p,enemy,game)<=t.max);
    E.newUnit(game,type,game.player,p.c,p.r);
    invalidateUIState();effects=[];commandDialog(actor);centerOn(enemy);return enemy;
   });
   const assaultPoint=await point(assaultTarget);
   if(mobile)await page.touchscreen.tap(assaultPoint.x,assaultPoint.y);
   else await page.mouse.click(assaultPoint.x,assaultPoint.y);
   const volley=await page.evaluate(()=>effects.filter(e=>e.kind==='shot').map(e=>({from:e.from,weapon:e.weapon,delay:e.delay})));
   assert.equal(volley.length,2,'Raymond and the supporting artillery each animate');
   assert.ok(new Set(volley.map(v=>v.weapon)).size===2,'Shooters retain their own weapon animation');
   assert.ok(volley[1].delay>volley[0].delay,'Individual shots are staggered');
   // The ordinary attack click also includes Oscar's independent response.
   await setup('suzaku');
   const reaction=await page.evaluate(()=>{
    const actor=selectedUnit(),enemy=game.units.find(v=>v.side==='eu');actor.hp=50000;enemy.hp=50000;enemy.cmd=null;
    const p=E.within(game,enemy,2).find(p=>!E.unitAt(game,p)&&E.distance(p,actor,game)===1);
    const guard=E.newUnit(game,E.typeFor('eu','heavy'),'eu',p.c,p.r,1,'oscar');
    render();centerOn(actor);return{target:enemy,guard};
   });
   const reactionPoint=await point(reaction.target);
   if(mobile){await page.touchscreen.tap(reactionPoint.x,reactionPoint.y);await page.touchscreen.tap(reactionPoint.x,reactionPoint.y);}
   else await page.mouse.click(reactionPoint.x,reactionPoint.y);
   assert.equal(await page.evaluate(guard=>effects.some(e=>e.kind==='shot'&&e.from.c===guard.c&&e.from.r===guard.r),reaction.guard),true,'Oscar fires his own weapon animation');
   // Movement-triggered interception reaches the same effects path.
   await setup('suzaku');
   const approach=await page.evaluate(()=>{
    const actor=selectedUnit();actor.cmd=null;actor.hp=50000;game.units=[actor];
    const guard=E.newUnit(game,E.typeFor('eu','heavy'),'eu',8,5,1,'villetta');
    const dest=E.within(game,actor,3).find(p=>!E.unitAt(game,p)&&E.distance(p,guard,game)===1&&E.reachable(game,actor).has(E.key(p)));
    render();centerOn(dest);return{dest,guard};
   });
   const approachPoint=await point(approach.dest);
   if(mobile)await page.touchscreen.tap(approachPoint.x,approachPoint.y);
   else await page.mouse.click(approachPoint.x,approachPoint.y);
   assert.equal(await page.evaluate(({guard,dest})=>effects.some(e=>e.kind==='shot'&&e.from.c===guard.c&&e.from.r===guard.r&&e.to.c===dest.c&&e.to.r===dest.r),approach),true,'Villetta intercepts at the movement destination');
   // Clicking a commander portrait selects its unit, including Shift-clicks.
   await setup('cc');
   const portrait=await page.evaluate(()=>{
    commandDialog(selectedUnit());const target=game.units.find(v=>v.cmd==='suzaku');centerOn(target);return target;
   });
   const portraitPoint=await point(portrait),scale=await page.evaluate(()=>computeView());
   portraitPoint.x-=22*scale;portraitPoint.y-=40*scale;
   if(mobile)await page.touchscreen.tap(portraitPoint.x,portraitPoint.y);
   else {await page.keyboard.down('Shift');await page.mouse.click(portraitPoint.x,portraitPoint.y);await page.keyboard.up('Shift');}
   assert.equal(await page.evaluate(()=>!!game.units.find(v=>v.cmd==='suzaku').expCCProtection),true,'Portrait activates selected target');
   assert.equal(await page.locator('#modal-root > *').count(),0,'Portrait must not open Commander Info');
   // Clickable cancellation and Escape must leave the ability unused.
   await setup('cc');
   if(await page.locator('[data-action="mobile-unit-toggle"]').isVisible() && await page.locator('[data-action="mobile-unit-toggle"]').getAttribute('aria-expanded')==='false') await page.locator('[data-action="mobile-unit-toggle"]').click();
   await page.locator('[data-action="feint"]').click();
   await page.locator('[data-action="ability-next-target"]').click();
   await page.locator('[data-action="ability-cancel"]').click();
   assert.equal(await page.evaluate(()=>selectedUnit().feintUsedTurn),undefined);
   if(await page.locator('[data-action="mobile-unit-toggle"]').isVisible() && await page.locator('[data-action="mobile-unit-toggle"]').getAttribute('aria-expanded')==='false') await page.locator('[data-action="mobile-unit-toggle"]').click();
   await page.locator('[data-action="feint"]').click();
   await page.keyboard.press('Escape');
   assert.equal(await page.evaluate(()=>!!abilityTargeting),false);
   // Space activates the highlighted keyboard cursor; arrow keys still navigate.
   await page.evaluate(()=>{commandDialog(selectedUnit());hover=E.tile(game,6,5);});
   await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Space');
   assert.equal(await page.evaluate(()=>selectedUnit().feintUsedTurn===game.turn),true);
   await setup('darlton');
   await page.evaluate(()=>commandDialog(selectedUnit()));
   await page.screenshot({path:process.env.ABILITY_SCREENSHOT_DIR?path.join(process.env.ABILITY_SCREENSHOT_DIR,`ability-targets-${layout}.png`):`/tmp/ability-targets-${layout}.png`});
   assert.deepEqual(errors,[],layout+' browser errors');
   console.log(layout+`: all ${ids.length} targeted abilities and cancellation/keyboard integration PASS`);
   await context.close();
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

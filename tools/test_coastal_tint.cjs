'use strict';
// Run: node tools/test_coastal_tint.cjs
const fs=require('node:fs'), path=require('node:path');
const geo=fs.readFileSync(path.join(__dirname,'../dist/ui/geography.js'),'utf8');
const manifest=fs.readFileSync(path.join(__dirname,'../dist/scenario-manifest.js'),'utf8');
const assert=(condition,msg)=>{if(!condition)throw Error(msg);};
const s=geo.indexOf('  let japanColorCache = null;');
const e=geo.indexOf('  // The Bering map crosses',s);
assert(s>=0&&e>s,'Missing regional stencil');
const regional=geo.slice(geo.indexOf('  function paintJapan('),geo.indexOf('  function paint(ctx,'));
const bering=geo.slice(geo.indexOf('  function paintBeringGeographic('),geo.indexOf('  function paintJapan('));
assert(regional.includes('ctx.globalAlpha = 1;'),'Regional faction opacity regression');
assert(bering.includes('ctx.globalAlpha = 1;'),'Bering opacity regression');
assert(regional.includes('clipPath(ctx, clip);'),'Geographic clipping missing');
assert(bering.includes('clipPath(ctx, land);'),'Bering geographic clipping missing');
const count=(manifest.match(/\{id:"[^"]+",title:/g)||[]).length;
assert(count>=37,'Scenario manifest shrank');
const engine={
  scenarios:{byId:{smoke:{meta:{map:{coastBuffer:1}}}}},
  adjacent(g,t){
    const odd=t.r&1, offsets=[[-1,0],[1,0],[-1+odd,-1],[odd,-1],[-1+odd,1],[odd,1]];
    const arr=[];
    for(const [dx,dy] of offsets){
      const c=t.c+dx,r=t.r+dy;
      if(c>=0&&r>=0&&c<g.cols&&r<g.rows)arr.push(g.tiles[r*g.cols+c]);
    }
    return arr;
  }
};
const groupsFor=Function('E',geo.slice(s,e)+';return japanColorGroups;')(engine);
const g={mode:'scenario',scenario:{id:'smoke'},cols:7,rows:5,mapRevision:0,
  tiles:Array.from({length:35},(_,i)=>({c:i%7,r:Math.floor(i/7),terrain:'sea',owner:null}))};
function land(c,r,owner){const t=g.tiles[r*g.cols+c];t.terrain='coast';t.owner=owner;}
const has=(groups,side,c,r)=>(groups.get(side)||[]).some(t=>t.c===c&&t.r===r);
land(1,2,'eu');land(5,2,'britannia');land(0,0,'eu');land(6,4,'britannia');
const original=JSON.stringify(g.tiles);
let groups=groupsFor(g);
assert(has(groups,'eu',1,2)&&has(groups,'britannia',5,2),'Gameplay land unpainted');
assert(has(groups,'eu',2,2)&&has(groups,'britannia',4,2),'Coastal buffering missing');
assert(!has(groups,'eu',3,2)&&!has(groups,'britannia',3,2),'Wrongly tinted narrow strait');
assert(has(groups,'eu',-1,0)&&has(groups,'eu',0,-1)&&has(groups,'eu',-1,-1),'Northwest gap');
assert(has(groups,'britannia',7,4)&&has(groups,'britannia',6,5)&&has(groups,'britannia',7,5),'Southeast gap');
assert(original===JSON.stringify(g.tiles),'Painting mutated gameplay terrain/ownership');
land(5,2,'eu');g.mapRevision++;groups=groupsFor(g);
assert(has(groups,'eu',5,2)&&!has(groups,'britannia',5,2),'Owner cache stale on capture');
console.log('Coastal tint checks passed across shared renderer; '+count+' scenarios registered.');

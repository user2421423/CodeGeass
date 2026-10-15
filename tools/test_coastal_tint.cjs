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
assert(regional.includes('clipRegionalLand(ctx, visibleLand);'),'Foreign regional coastlines visible');
assert(bering.includes('clipBeringLand(ctx, owners);'),'Foreign Bering coastlines visible');
assert(!regional.includes("fillPath(ctx, paths(ctx, shapes, a, b, c, d));"),
  'Off-theatre atlas land is being painted as neutral green');
assert(!bering.includes('fillPath(ctx, land);'),
  'Off-theatre Bering atlas land is being painted as neutral green');
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
const regionBuilder=Function('E','FAST_PATH',
  geo.slice(s,e)+';return {japanColorGroups,regionalVisibleLand};');
const {japanColorGroups:groupsFor,regionalVisibleLand:visibleFor}=
  regionBuilder(engine,false);
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
const visible=visibleFor(g);
assert(visible.tiles.some(t=>t.c===1&&t.r===2),'Playable land missing from visual mask');
assert(!visible.tiles.some(t=>t.c===3&&t.r===2),
  'Off-theatre sea included in geographic visual mask');
assert(original===JSON.stringify(g.tiles),'Painting mutated gameplay terrain/ownership');
land(5,2,'eu');g.mapRevision++;groups=groupsFor(g);
assert(has(groups,'eu',5,2)&&!has(groups,'britannia',5,2),'Owner cache stale on capture');
// Bering's date-line painter must stop coastal inference near owned land,
// not paint unrelated remote geographic islands by flooding through the sea.
const bs=geo.indexOf('  let beringGeographicOwnersCache =');
const be=geo.indexOf('  function clipBeringLand(',bs);
assert(bs>=0&&be>bs,'Bering restricted stencil missing');
const beringGroups=Function('E','FAST_PATH','mapMeta',
  geo.slice(bs,be)+';return beringOwnerGroups;')(engine,false,
  ()=>({coastBuffer:2}));
const bg={mode:'scenario',scenario:{id:'smoke'},cols:17,rows:9,
  mapRevision:0,tiles:Array.from({length:153},(_,i)=>({
    c:i%17,r:Math.floor(i/17),terrain:'sea',owner:null
  }))};
const eu=bg.tiles[4*17+2];eu.owner='eu';eu.terrain='plains';
const neutral=bg.tiles[5*17+4];neutral.terrain='plains';
const beringResult=beringGroups(bg);
const beringHas=(side,c,r)=>(beringResult.groups.get(side)||[])
  .some(t=>t.c===c&&t.r===r);
assert(beringHas('eu',3,4),'Bering near-shore tint missing');
assert(!beringHas('eu',16,0),'Bering tint flooded across distant sea');
assert(beringHas('neutral',4,5),'Neutral playable Bering land hidden');
console.log('Coastal tint and theatre bounds checks passed; '+count+' scenarios registered.');

#!/usr/bin/env node
'use strict';
// Independently rasterize the repo's high-resolution Philippine coastal polygons.
// The named strait cuts prevent sub-hex channels from becoming land bridges.
// Palau and Yap are expanded slightly to host usable reinforcement bases.
const assert=require('node:assert/strict');
const coastline=require('./data/coast.json').philippines;
const stored=require('../dist/philippines-landmask.js');
const W=144,H=112,DX=23.6/W,DY=16.7/H;
const shapes=coastline.map(p=>({p,minx:Math.min(...p.map(q=>q[0])),maxx:Math.max(...p.map(q=>q[0])),
 miny:Math.min(...p.map(q=>q[1])),maxy:Math.max(...p.map(q=>q[1]))}));
function pointInPolygon(x,y,p) {
 let inside=false;
 for(let i=0,j=p.length-1;i<p.length;j=i++){
  const a=p[i],b=p[j];
  if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])
   inside=!inside;
 }
 return inside;
}
const ellipse=(x,y,cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
function land(x,y) {
 return shapes.some(s=>x>=s.minx&&x<=s.maxx&&y>=s.miny&&y<=s.maxy&&pointInPolygon(x,y,s.p))
 ||ellipse(x,y,134.55,7.57,.19,.38)||ellipse(x,y,134.44,7.35,.15,.15)
 ||ellipse(x,y,134.24,7.03,.12,.16)||ellipse(x,y,134.57,8.05,.11,.13)
 ||ellipse(x,y,138.13,9.52,.36,.24);
}
const cuts=[
 ['Verde Island Passage',(x,y)=>Math.abs(y-13.57)<.16&&x>119.65&&x<122.5],
 ['Guimaras Strait',(x,y)=>Math.abs(x-122.80)<.17&&y>9.65&&y<12.15],
 ['Tañon Strait',(x,y)=>Math.abs(x-123.52)<.18&&y>8.8&&y<12],
 ['San Juanico Strait',(x,y)=>Math.abs(y-11.50)<.18&&x>123.95&&x<126.15],
 ['Peleliu separation',(x,y)=>Math.abs(y-7.18)<.09&&x>134.0&&x<134.85]
];
const bytes=Buffer.alloc(W*H/8);
const corrections=require('./data/philippines_hex_corrections.json');
let cells=0;
const cutsCount=Object.fromEntries(cuts.map(([name])=>[name,0]));
for(let r=0;r<H;r++)for(let c=0;c<W;c++){
 const x=115.5+(c+.5*(r&1)+.5)*DX,y=21.2-(r+.5)*DY;
 const filledLake=(c===40&&r===48)||(c===62&&r===93);
 if(!filledLake&&![land(x,y),land(x+.024,y),land(x-.024,y),land(x,y+.022),land(x,y-.022)].some(Boolean))continue;
 const cut=cuts.find(([,fn])=>fn(x,y));
 if(cut){cutsCount[cut[0]]++;continue;}
 const i=r*W+c;bytes[i>>3]|=128>>(i&7);cells++;
}
// Audit-derived corrections remove Borneo, split accidentally joined islets,
 // refine city landing shores and separate Palau/Yap staging landmasses.
 for(const [c,r] of corrections.land){
  assert.ok(c>=0&&c<W&&r>=0&&r<H);
  const i=r*W+c;bytes[i>>3]|=128>>(i&7);
 }
 for(const [c,r] of corrections.sea){
  assert.ok(c>=0&&c<W&&r>=0&&r<H);
  const i=r*W+c;bytes[i>>3]&=~(128>>(i&7));
 }
 cells=0;
 for(let i=0;i<W*H;i++)if(bytes[i>>3]&(128>>(i&7)))cells++;
 assert.equal(bytes.toString('base64'),stored,'Coast mask must match the source polygons and audited corrections');
if(require.main===module)console.log('PHILIPPINES_MASK_REPRODUCED '+JSON.stringify({cols:W,rows:H,
 land:cells,sea:W*H-cells,channelCorrections:cutsCount,landOverrides:corrections.land.length,seaOverrides:corrections.sea.length}));
module.exports={cols:W,rows:H,land:cells,cutsCount};

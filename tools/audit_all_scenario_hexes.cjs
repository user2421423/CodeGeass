#!/usr/bin/env node
'use strict';
// One-off exhaustive review of every registered scenario's land, mixed coast,
// navigable sea and deliberately excluded/off-map cells.
// Optional independent Natural Earth geometry is used only as diagnostic
// evidence, never as an automatic authority over scenario-specific coast masks.
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');
require('./scenario_sim.cjs');
const terr = new Set(Object.keys(E.TERRAIN));
const independent = process.argv[2] && fs.existsSync(process.argv[2])
  ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : null;
function inRing(x,y,ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
const polys=[];
if(independent)for(const ft of independent.features||[]) {
 const g=ft.geometry;if(!g)continue;
 for(const rings of g.type==='MultiPolygon'?g.coordinates:g.type==='Polygon'?[g.coordinates]:[]){
  const all=rings[0];if(!all?.length)continue;
  const bb=[Infinity,Infinity,-Infinity,-Infinity];
  for(const [x,y] of all){bb[0]=Math.min(bb[0],x);bb[1]=Math.min(bb[1],y);bb[2]=Math.max(bb[2],x);bb[3]=Math.max(bb[3],y);}
  polys.push({rings,bb});
 }
}
const index=new Map();
function bucket(x,y){return Math.floor((x+180)/3)+','+Math.floor((y+90)/3);}
for(let id=0;id<polys.length;id++){
 const b=polys[id].bb;
 for(let x=Math.max(0,Math.floor((b[0]+180)/3));x<=Math.min(119,Math.floor((b[2]+180)/3));x++)
  for(let y=Math.max(0,Math.floor((b[1]+90)/3));y<=Math.min(59,Math.floor((b[3]+90)/3));y++){
   const k=x+','+y;
   if(!index.has(k))index.set(k,[]);
   index.get(k).push(id);
  }
}
function land(x,y){
 if(x>180)x-=360;
 if(x< -180)x+=360;
 for(const id of index.get(bucket(x,y))||[]){
  const {rings,bb}=polys[id];
  if(x<bb[0]||x>bb[2]||y<bb[1]||y>bb[3])continue;
  if(inRing(x,y,rings[0])&&!rings.slice(1).some(r=>inRing(x,y,r)))return true;
 }
 return false;
}
function geoAt(m,g,c,r){
 if(typeof m.geographicAt==='function')return m.geographicAt(c,r);
 if(typeof m.geo==='function')return m.geo(c,r);
 const b=g.scenario?.bounds||m.bounds;
 if(!b||![b.west,b.east,b.north,b.south].every(Number.isFinite))return null;
 return {lon:b.west+(c+.5+.5*(r&1))*(b.east-b.west)/g.cols,
   lat:b.north-(r+.5)*(b.north-b.south)/g.rows};
}
function indexOf(g,t){return t.r*g.cols+t.c;}
function hasWater(t){return t.terrain==='sea'||t.terrain==='coast';}
const all=[], failures=[];
const registry=E.scenarios?.byId||{};
for(const id of Object.keys(registry).sort()){
 const m=registry[id], stats={id,sides:m.sides,cols:m.cols,rows:m.rows,terrain:{},
  cities:0,ports:0,units:0,geoCompared:0,geoMismatch:0,
  candidates:[],coastWithoutWater:0,unexpected:[],errors:[],warnings:[]};
 let baseline=null;
 for(const side of m.sides){
  let g;try{g=m.create(side,'normal',20261022);}
  catch(e){stats.errors.push(side+': create threw '+String(e.stack||e).slice(0,450));continue;}
  if(g.tiles.length!==g.cols*g.rows)stats.errors.push(side+': tile count mismatch');
  if(!baseline){
   baseline=g;
   stats.cols=g.cols;stats.rows=g.rows;
   const b=g.scenario?.bounds||m.bounds||null;stats.bounds=b;
   for(let i=0;i<g.tiles.length;i++){
    const t=g.tiles[i];
    if(!t||t.c!==i%g.cols||t.r!==(i/g.cols|0)){stats.errors.push('wrong hex index '+i);continue;}
    stats.terrain[t.terrain]=(stats.terrain[t.terrain]||0)+1;
    if(!terr.has(t.terrain))stats.errors.push('unknown terrain '+i+': '+t.terrain);
    if(t.terrain==='coast'&&!E.adjacent(g,t).some(hasWater))stats.coastWithoutWater++;
    if(t.terrain==='sea'&&t.owner!=null)stats.warnings.push('sea owned at '+t.c+','+t.r);
    if(t.terrain==='offmap'&&t.owner!=null)stats.warnings.push('offmap owned at '+t.c+','+t.r);
    // Coast needs subhex information; compare only unequivocal geographic
    // interior cells, and leave all shoreline candidates for human review.
    if(!independent||t.terrain==='offmap'||t.terrain==='coast')continue;
    const p=geoAt(m,g,t.c,t.r);
    if(!p||!Number.isFinite(p.lon)||!Number.isFinite(p.lat)||Math.abs(p.lat)>85)continue;
    stats.geoCompared++;
    const geoLand=land(p.lon,p.lat),playLand=t.terrain!=='sea';
    if(geoLand===playLand)continue;
    stats.geoMismatch++;
    const stepX=(stats.bounds?.east-stats.bounds?.west)/g.cols||.32;
    const stepY=(stats.bounds?.north-stats.bounds?.south)/g.rows||.24;
    let hits=0, samples=0;
    for(const dx of [-.32,0,.32])for(const dy of [-.32,0,.32]){
     samples++;if(land(p.lon+dx*stepX,p.lat+dy*stepY))hits++;
    }
    // Strongest candidates: independently mapped terrain completely disagrees
    // throughout nine subhex samples, not a marginal shoreline.
    if((playLand&&hits===0)||(!playLand&&hits===9)){
      if(stats.candidates.length<40)stats.candidates.push({c:t.c,r:t.r,terrain:t.terrain,reference:geoLand?'land':'water',
        lon:+p.lon.toFixed(2),lat:+p.lat.toFixed(2)});
    }
   }
   stats.cities=g.stations.length;stats.ports=g.stations.filter(s=>s.portAt).length;stats.units=g.units.length;
   for(const s of g.stations){
    const t=E.tile(g,s.c,s.r);
    if(!t||t.terrain==='sea'||E.TERRAIN[t.terrain]?.blocked)
      stats.errors.push('city invalid terrain '+s.name+' ('+s.c+','+s.r+')');
    if(s.portAt){
      const p=E.tile(g,s.portAt.c,s.portAt.r);
      if(!p||!hasWater(p))stats.errors.push('port not navigable '+s.name);
      else if(!E.adjacent(g,s).some(a=>indexOf(g,a)===indexOf(g,p)))stats.warnings.push('port not adjacent '+s.name);
    }
   }
   for(const u of g.units){
    const t=E.tile(g,u.c,u.r);
    if(!t||t.terrain==='offmap'||t.terrain==='peak')stats.errors.push('unit on blocked terrain '+u.id);
    if(t&&E.TYPES[u.type]?.naval==='ship'&&!hasWater(t))stats.errors.push('ship on land '+u.id);
   }
  }else{
   let changed=0;
   for(let i=0;i<g.tiles.length;i++)if(g.tiles[i]?.terrain!==baseline.tiles[i]?.terrain)changed++;
   if(changed)stats.errors.push('physical map differs for side '+side+': '+changed+' hexes');
  }
 }
 if(stats.errors.length)failures.push({id,errors:stats.errors.slice(0,12)});
 all.push(stats);
 console.log('SCENARIO_HEX '+JSON.stringify(stats));
}
const summary={scenarios:all.length,failedScenarios:failures.length,totalHexes:all.reduce((v,s)=>v+s.cols*s.rows,0),
 checkedAgainstIndependentGeography:all.reduce((v,s)=>v+s.geoCompared,0),
 totalGeoDisagreements:all.reduce((v,s)=>v+s.geoMismatch,0),
 highConfidenceSamples:all.reduce((v,s)=>v+s.candidates.length,0),failures};
console.log('ALL_SCENARIO_HEX_SUMMARY '+JSON.stringify(summary));
fs.writeFileSync('/tmp/all-scenario-hex-report.json',JSON.stringify({summary,scenarios:all},null,2));
process.exitCode=failures.length?1:0;

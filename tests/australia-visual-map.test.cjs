'use strict';
// Australia must use the global coastline atlas, geometrically aligned to its
// centre-sampled hex grid. Both main renderer and preview use GEOGRAPHY.paint.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const E=require('../dist/engine.js');
require('../dist/scenarios.js');
const australia=require('../dist/scenarios-australia.js');
const mask=require('../dist/australia-landmask.js');
const R=43,SQ=Math.sqrt(3),W=180*SQ*R,H=R*(1.5*75+2);
const shapes=vm.runInNewContext(fs.readFileSync(
  path.join(__dirname,'../dist/ui/geography-data.js'),'utf8')+'\nGEOGRAPHY_SHAPES');
const source=fs.readFileSync(path.join(__dirname,'../dist/ui/geography.js'),'utf8');
const atlas=new Function('R','SQ','WORLD_W','WORLD_H','GEOGRAPHY_SHAPES','E',
  source+'\nreturn GEOGRAPHY;')(R,SQ,W,H,shapes,E);
const px=lon=>(lon+180)*SQ*R/2+R-SQ*R/2;
const py=lat=>R+(74-lat)*1.5*R*75/128;

test('Australia selects only its real coastline polygons, not its neighbours',()=>{
  for(const [name,lon,lat] of [
    ['mainland',133.88,-23.7],['Tasmania',147.32,-42.88],
    ['Kangaroo Island',137.25,-35.8],['Flinders Island',148,-40],
    ['Melville Island',130.85,-11.45]])
    assert.equal(atlas.australiaLandAt(lon,lat),true,name);
  for(const [name,lon,lat] of [
    ['Bass Strait',146.5,-40],['Indian Ocean',112,-36],
    ['PNG',145,-7],['Indonesia',119,-8]])
    assert.equal(atlas.australiaLandAt(lon,lat),false,name);
});

test('Australian visible coastline fits every sampled gameplay hex centre',()=>{
  const g=australia.create('eu','normal',2026),transforms=[];
  let clips=0,strokes=0,fills=0;
  const ctx=new Proxy({
    createLinearGradient:()=>({addColorStop(){}}),
    transform:(...args)=>transforms.push(args),
    clip:()=>{clips++;},stroke:()=>{strokes++;},fill:()=>{fills++;}
  },{get:(o,k)=>o[k]||(()=>{})});
  assert.equal(atlas.paint(ctx,g,0,SQ*R*(g.cols+2),
    0,1.5*R*(g.rows+2),1),true);
  assert.ok(clips>0,'territory colour must clip to Australian geographic land');
  assert.ok(strokes>0,'Australian vector coast must be stroked');
  assert.ok(fills>0,'continental polygon and territories must be filled');
  const [A,C,B,D,tx,ty]=transforms[0];
  for(const [c,r] of [[0,0],[131,91],[60,5],[10,30],[75,50],[107,84]]){
    const {lon,lat}=mask.point(c,r);
    const actualX=A*px(lon)+B*py(lat)+tx;
    const actualY=C*px(lon)+D*py(lat)+ty;
    const expectedX=SQ*R*(c+0.5*(r&1))+R;
    const expectedY=1.5*R*r+R;
    assert.ok(Math.abs(actualX-expectedX)<1e-7,
      'visual longitude misaligned at hex '+c+','+r);
    assert.ok(Math.abs(actualY-expectedY)<1e-7,
      'visual latitude misaligned at hex '+c+','+r);
  }
});

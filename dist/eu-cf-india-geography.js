/* India–Persia theatre coastline (WGS84). Scenario-owned geography:
   a mainland coast polygon and an independent Sri Lankan island polygon.
   A 5 x 5 sub-hex footprint gives sea (<20% land), mixed coast (20–80%)
   and inland (>80%). No unrelated terrain is painted into the sea. */
(function(root){
'use strict';
const mainland=[
 [57,37.0],[94,37.0],[94,26.7],[93.2,25.5],[92.6,24.3],
 [92.15,23.4],[91.85,22.3],[91.35,22.15],[90.9,22.03],
 [90.5,22.0],[90.05,22.15],[89.55,21.85],[89.0,21.68],
 [88.35,21.75],[87.75,21.62],[87.15,21.47],[86.75,20.38],
 [86.28,19.94],[85.85,19.45],[85.1,19.05],[84.25,18.55],
 [83.6,18.15],[83.32,17.65],[82.95,16.85],[82.3,16.18],
 [81.8,15.85],[80.95,14.7],[80.3,13.05],[80.1,12.45],
 [79.85,11.2],[79.3,10.35],[78.35,8.75],[77.58,8.08],
 [77.13,8.35],[76.95,9.1],[76.38,9.86],[75.92,10.85],
 [75.32,11.95],[74.93,12.8],[74.71,13.7],[74.17,14.75],
 [73.8,15.38],[73.74,16.2],[73.46,16.85],[73.16,17.6],
 [72.83,18.85],[72.65,19.6],[72.75,20.2],[72.55,20.9],
 [72.62,21.68],[72.2,21.75],[71.65,21.05],[70.92,20.87],
 [70.3,21.56],[69.45,22.1],[68.5,22.45],[68.1,23.0],
 [68.45,23.78],[67.46,24.3],[67.1,24.9],[66.3,25.2],
 [65.45,25.05],[64.25,25.25],[63.35,25.3],[62.3,25.2],
 [61.65,25.15],[61.0,25.35],[60.55,25.55],[59.9,25.45],
 [59.45,25.58],[58.65,25.72],[57.9,25.85],[57,26.0]
];
const sriLanka=[
 [79.68,9.76],[80.05,9.85],[80.58,9.55],[80.82,8.8],
 [81.05,8.1],[81.35,7.55],[81.75,7.0],[81.82,6.52],
 [81.25,6.1],[80.62,5.9],[80.2,6.05],[79.82,6.7],
 [79.66,7.45],[79.7,8.2],[79.68,9.76]
];
const polygons=[mainland,sriLanka];
// Source-backed patch for solid mainland at the northeastern edge of the
// simplified polygon. Rebuild with tools/build_india_northeast_land.py.
const INDIA_NORTHEAST_LAND=atob('');
function inside(lon,lat,poly){
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[i],b=poly[j];
   if((a[1]>lat)!==(b[1]>lat) &&
      lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }
 return hit;
}
function land(lon,lat){return polygons.some(p=>inside(lon,lat,p));}
function makeClasses(cols,rows,bounds){
 const result=new Uint8Array(cols*rows),dx=(bounds.east-bounds.west)/cols,
  dy=(bounds.north-bounds.south)/rows;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   let landSamples=0;
   for(let y=0;y<5;y++)for(let x=0;x<5;x++){
     const lon=bounds.west+(c+.5*(r&1)+(x+.5)/5)*dx;
     const lat=bounds.north-(r+(y+.5)/5)*dy;
     if(land(lon,lat))landSamples++;
   }
   const index=r*cols+c;
   result[index]=landSamples<5?0:landSamples<=20?1:2;
   // Restore high-confidence northeastern land the crude theatre polygon
   // otherwise labels sea; preserve every other shoreline and waterway.
   if(cols===168&&rows===124&&bounds.west===57&&bounds.east===94&&
       result[index]===0&&
       (INDIA_NORTHEAST_LAND.charCodeAt(index>>3)&(128>>(index&7))))
     result[index]=2;
 }
 return result;
}
const api={makeClasses,land,polygons};
root.EU_CF_INDIA_GEOGRAPHY=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

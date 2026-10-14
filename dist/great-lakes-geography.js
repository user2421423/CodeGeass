/* Great Lakes operational hydrology. Survey-style hand-traced coastline control points;
   five separately named lakes plus the navigable Mackinac, Soo, St Clair,
   Detroit River and Welland Canal corridors. Coordinates are WGS84 lon/lat.
   The Welland Canal, not Niagara Falls, connects Erie to Ontario for ships.
   At tactical resolution channels are widened only enough for a continuous
   navigable hex route. Shoreline cells with 20-80% water are mixed coast. */
(function(root){
 'use strict';
 const cols=176,rows=112;
 const bounds={west:-93.4,east:-75.4,north:49.2,south:40.4};
 const lakes={"Superior":[[-92.2,46.7],[-92.1,46.85],[-91.7,47],[-91.15,47.12],[-90.65,47.41],[-90.2,47.75],[-89.7,47.9],[-89.33,48.12],[-89.18,48.43],[-88.75,48.27],[-88.25,48.25],[-87.75,48.18],[-87.05,48.04],[-86.65,47.95],[-86.25,47.66],[-85.64,47.55],[-85.16,47.3],[-84.75,47.12],[-84.55,46.79],[-84.64,46.53],[-85.14,46.5],[-85.7,46.66],[-86.35,46.75],[-86.9,46.55],[-87.49,46.47],[-88.12,46.46],[-88.8,46.57],[-89.42,46.77],[-89.9,46.69],[-90.55,46.55],[-91.1,46.56],[-91.69,46.65]],"Michigan":[[-87.53,41.64],[-87.24,41.63],[-86.82,41.72],[-86.6,41.88],[-86.42,42.31],[-86.22,42.81],[-86.22,43.24],[-86.18,43.72],[-86.24,44.17],[-86.55,44.57],[-86.37,45.04],[-86.06,45.35],[-85.58,45.58],[-85.18,45.68],[-85.04,45.9],[-85.72,45.82],[-86.35,45.7],[-86.89,45.66],[-87.46,45.69],[-87.67,45.36],[-87.41,44.87],[-87.6,44.45],[-87.92,43.96],[-87.89,43.32],[-87.88,42.85],[-87.81,42.34],[-87.66,41.94]],"Huron":[[-84.93,45.8],[-84.54,45.95],[-84.08,46.14],[-83.57,46.08],[-83.15,45.88],[-82.67,45.92],[-82.14,45.95],[-81.57,46.08],[-81.03,45.98],[-80.48,45.68],[-80.05,45.36],[-80.17,44.95],[-80.44,44.47],[-80.88,44.08],[-81.36,44],[-81.72,44.22],[-81.87,44.62],[-82.24,44.65],[-82.37,44.16],[-82.39,43.75],[-82.44,43.16],[-82.58,42.95],[-82.9,43.03],[-83.23,43.66],[-83.4,44.03],[-83.64,44.54],[-84,44.81],[-84.32,45.1],[-84.6,45.35],[-84.85,45.55]],"Erie":[[-83.43,41.78],[-83.13,41.59],[-82.62,41.42],[-82.11,41.39],[-81.75,41.38],[-81.36,41.42],[-80.9,41.61],[-80.49,41.75],[-80.09,42.02],[-79.65,42.23],[-79.15,42.51],[-78.84,42.88],[-79.12,42.92],[-79.7,42.84],[-80.19,42.66],[-80.78,42.52],[-81.31,42.43],[-81.93,42.25],[-82.49,42.04],[-82.99,41.93]],"Ontario":[[-79.89,43.29],[-79.61,43.27],[-79.25,43.29],[-78.8,43.26],[-78.42,43.25],[-78.04,43.24],[-77.59,43.22],[-77.22,43.28],[-76.79,43.59],[-76.47,43.94],[-76.57,44.18],[-77.12,44.18],[-77.58,44.07],[-78.03,43.88],[-78.51,43.74],[-78.98,43.69],[-79.35,43.66],[-79.67,43.53]]};
 const channels={"Straits of Mackinac":[[-85.38,45.87],[-85.02,45.89],[-84.85,45.85],[-84.66,45.8]],"St. Marys River":[[-84.55,46.61],[-84.36,46.49],[-84.34,46.38],[-84.32,46.22],[-84.28,46.08]],"St. Clair River":[[-82.47,43.18],[-82.43,42.98],[-82.47,42.81],[-82.55,42.66],[-82.64,42.55],[-82.65,42.42]],"Detroit River":[[-82.65,42.42],[-82.9,42.31],[-83.03,42.29],[-83.08,42.21],[-83.12,42.09],[-83.12,41.95],[-83.18,41.8]],"Welland Canal":[[-79.19,42.72],[-79.23,42.89],[-79.24,43.05],[-79.26,43.2],[-79.29,43.33]],"St. Lawrence":[[-76.65,44.06],[-76.3,44.13],[-76,44.22],[-75.7,44.29]]};
 const CHANNEL_WIDTH={ 'Straits of Mackinac':.12,'St. Marys River':.105,
   'St. Clair River':.09,'Detroit River':.085,
   'Welland Canal':.075,'St. Lawrence':.095 };
 function polygon(lon,lat,pts){
   let inside=false;
   for(let i=0,j=pts.length-1;i<pts.length;j=i++){
     const a=pts[i],b=pts[j];
     if((a[1]>lat)!==(b[1]>lat) && lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])
       inside=!inside;
   }
   return inside;
 }
 function routeDistance(lon,lat,line){
   let best=Infinity;
   for(let i=1;i<line.length;i++){
     const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1];
     const t=Math.max(0,Math.min(1,((lon-a[0])*dx+(lat-a[1])*dy)/(dx*dx+dy*dy||1)));
     best=Math.min(best,Math.hypot(lon-a[0]-t*dx,lat-a[1]-t*dy));
   }
   return best;
 }
 function channelAt(lon,lat,scale=1){
   return Object.entries(channels).some(([name,line])=>
     routeDistance(lon,lat,line)<=CHANNEL_WIDTH[name]*scale);
 }
 function lakeAt(lon,lat){
   return Object.values(lakes).some(poly=>polygon(lon,lat,poly));
 }
 function waterAt(lon,lat){return lakeAt(lon,lat)||channelAt(lon,lat);}
 function point(c,r){return {lon:bounds.west+(c+.5*(r&1)+.5)*(bounds.east-bounds.west)/cols,
   lat:bounds.north-(r+.5)*(bounds.north-bounds.south)/rows};}
 const SAMPLES=[[0,0],[-.5,-.65],[.5,-.65],[-.5,.65],[.5,.65],
   [-.8,0],[.8,0],[-.25,-.3],[.25,-.3],[-.25,.3],[.25,.3],
   [0,-.85],[0,.85]];
 function waterFraction(c,r){
   const p=point(c,r),dx=(bounds.east-bounds.west)/cols,
     dy=(bounds.north-bounds.south)/rows;
   let wet=0;
   for(const [x,y] of SAMPLES)if(waterAt(p.lon+x*dx,p.lat+y*dy))wet++;
   return wet/SAMPLES.length;
 }
 const api={cols,rows,bounds,lakes,channels,point,lakeAt,channelAt,waterAt,waterFraction,
   channelWidth:CHANNEL_WIDTH};
 root.GREAT_LAKES_GEOGRAPHY=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

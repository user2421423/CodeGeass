/* Australian continent and Tasmania landmask. Geographic shoreline control points
   in longitude/latitude, clockwise; 132 x 92 east-west / north-south sampling.
   Includes Gulf of Carpentaria, Cape York, Arnhem Land, Kimberley, Shark Bay,
   the Great Australian Bight, Spencer Gulf, Bass Strait and Tasmania.
   The hex coastline can be regenerated deterministically without network assets. */
(function(root){
  'use strict';
  const COLS=132,ROWS=92,BOUNDS={west:110,east:156,north:-9,south:-46};
  const MAINLAND=[
    [142.54,-10.69],[142.42,-11.4],[142.05,-12.5],[141.46,-13.55],
    [141.05,-14.7],[141.15,-15.65],[141.52,-16.55],[140.8,-17.27],
    [139.54,-17.73],[138.66,-17.15],[137.8,-16.15],[136.67,-15.78],
    [135.92,-14.65],[135.7,-13.74],[136.43,-13.13],[136.8,-12.27],
    [135.97,-12.0],[134.73,-12.07],[133.68,-11.65],[132.52,-11.5],
    [131.9,-11.64],[131.47,-12.18],[130.78,-12.45],[130.38,-11.93],
    [129.33,-12.42],[128.43,-14.72],[127.76,-14.63],[126.42,-14.25],
    [125.5,-14.38],[124.59,-15.04],[123.62,-16.36],[122.15,-17.97],
    [120.94,-19.04],[119.7,-19.65],[118.2,-20.3],[116.87,-20.73],
    [115.54,-21.45],[114.89,-22.19],[113.72,-23.15],[113.36,-24.25],
    [113.07,-25.3],[113.52,-26.13],[113.59,-27.55],[114.06,-28.79],
    [114.49,-30.1],[115.16,-31.71],[115.01,-32.71],[115.46,-33.6],
    [116.22,-34.43],[117.49,-35.0],[118.7,-34.94],[120.12,-34.48],
    [121.8,-33.9],[123.25,-33.85],[124.8,-33.14],[126.35,-32.51],
    [128.1,-31.78],[129.66,-31.58],[131.15,-31.64],[132.69,-32.01],
    [133.72,-32.52],[134.64,-33.47],[135.01,-34.5],[135.65,-34.85],
    [136.14,-34.36],[136.68,-33.32],[137.34,-33.04],[137.58,-33.96],
    [137.73,-34.61],[137.2,-35.05],[138.19,-35.6],[138.55,-35.37],
    [138.6,-34.84],[138.8,-35.6],[139.75,-36.07],[140.29,-37.25],
    [141.29,-38.12],[142.4,-38.56],[143.67,-38.85],[144.86,-38.35],
    [145.8,-38.61],[146.95,-39.11],[147.77,-38.55],[148.17,-37.75],
    [149.28,-37.62],[150.05,-36.95],[150.61,-35.87],[150.78,-34.83],
    [151.26,-33.85],[151.7,-32.74],[152.71,-31.41],[153.23,-29.9],
    [153.57,-28.16],[153.15,-27.33],[153.28,-26.36],[152.93,-25.62],
    [152.47,-24.46],[151.45,-23.58],[150.76,-22.49],[149.19,-21.3],
    [148.45,-20.15],[147.24,-19.4],[146.36,-18.74],[145.89,-17.98],
    [145.46,-16.89],[145.18,-15.82],[144.66,-14.42],[143.83,-13.28],
    [143.27,-12.16],[142.54,-10.69]
  ];
  const TASMANIA=[
    [144.67,-40.77],[145.46,-40.65],[146.48,-40.78],[147.64,-40.86],
    [148.4,-41.12],[148.21,-41.87],[147.87,-42.52],[147.55,-43.05],
    [146.95,-43.5],[146.11,-43.6],[145.47,-43.18],[145.08,-42.48],
    [144.68,-41.7],[144.67,-40.77]
  ];
  function inside(lon,lat,poly){
    let yes=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];
      if((a[1]>lat)!==(b[1]>lat) &&
        lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])yes=!yes;
    }
    return yes;
  }
  function isLand(lon,lat){return inside(lon,lat,MAINLAND)||inside(lon,lat,TASMANIA);}
  function point(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*46/COLS,
    lat:BOUNDS.north-(r+.5)*37/ROWS};}
  const raw=new Uint8Array(COLS*ROWS/8);
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const i=r*COLS+c,p=point(c,r);
    if(isLand(p.lon,p.lat))raw[i>>3]|=128>>(i&7);
  }
  let binary='';for(const b of raw)binary+=String.fromCharCode(b);
  const bits=typeof btoa==='function'?btoa(binary):Buffer.from(raw).toString('base64');
  root.AUSTRALIA_LAND_BITS=bits;
  const api={bits,cols:COLS,rows:ROWS,bounds:BOUNDS,mainland:MAINLAND,tasmania:TASMANIA,isLand,point};
  root.AUSTRALIA_GEOGRAPHY=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

/* Australian continent and Tasmania: GSHHS intermediate-resolution (GSHHS-i)
   geographic coastline sampled at each 132 x 92 staggered hex center.
   Source: GSHHG shoreline polygons bundled with mpl_toolkits.basemap_data,
   Australian mainland, Tasmania and immediate Australian coastal islands only.
   PNG and Indonesian islands are excluded from this Australian theatre.
   12,144 coverage samples, 1 bit per hex, row-major MSB-first.
   This static bitmap uses no browser network access or Node-only globals. */
(function(root){
  'use strict';
  const COLS=132,ROWS=92,BOUNDS={west:110,east:156,north:-9,south:-46};
  const bits='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAAAAMAAAAAAAAAAAAAAADxAAAAMAAAAAAAAAAAAAAAAD6QAAeAAAAAAAAAAAAAAAA//2AAeAAAAAAAAAAAAAAAD//4AAeAAAAAAAAAAAAAAAD//4AAfAAAAAAAAAAAAAAAP//wAA/AAAAAAAAAAAAACwP//yAA/gAAAAAAAAAAAAH4f//gAA/4AAAAAAAAAAAAP9H//gAAf+AAAAAAAAAAAAf////wAA/+AAAAAAAAAAAB/////9AA/+AAAAAAAAAAAB//////AA/+AAAAAAAAAAAX//////wA//AAAAAAAAAABn//////8B//AAAAAAAAAAB3///////B//gAAAAAAAAAD////////n//gAAAAAAAAAA///////////gAAAAAAAAAH///////////gAAAAAAAAAH///////////wAAAAAAAAAP///////////4AAAAAAAAAf////////////AAAAAAAAf/////////////gAAAAAAB//////////////8AAAAAA///////////////4AAAAAD///////////////8AAAAAP///////////////+AAAABf///////////////+AAAAC/////////////////gAAAB/////////////////4AAAD/////////////////4AAAD/////////////////8AAAH/////////////////+AAAD//////////////////gAAD//////////////////kAAB//////////////////4AAF//////////////////4AAG//////////////////8AAF//////////////////4AAB//////////////////8AAB//////////////////4AAA//////////////////8AAB//////////////////8AAAf/////////////////+AAAf/////////////////8AAAP/////////////////8AAAP/////////////////8AAAP/////////////////8AAAP/////////////////4AAAH/////////////////8AAAH/////////////////4AAAD//////AP/////////4AAAD/////wAA/////////wAAAD////4AAAP////////wAAAD///+AAAAH/v/////+AAAAD///8AAAAB/v/////+AAAAP///4AAAAB+f/////8AAAAP/8AAAAAAA8f/////8AAAAD/gAAAAAAAQ3/////4AAAAAfAAAAAAAAJz/////4AAAAAAAAAAAAAAAH/////wAAAAAAAAAAAAAADw/////gAAAAAAAAAAAAAAAA/////gAAAAAAAAAAAAAAAAP////gAAAAAAAAAAAAAAAAf////AAAAAAAAAAAAAAAAAP////gAAAAAAAAAAAAAAAAH///+AAAAAAAAAAAAAAAAAA/9/AAAAAAAAAAAAAAAAAAADh8AAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHDgAAAAAAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAB/gAAAAAAAAAAAAAAAAAAAB/AAAAAAAAAAAAAAAAAAAAA+AAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let binary='';
  for(let i=0;i<bits.length;i+=4){
    const a=abc.indexOf(bits[i]),b=abc.indexOf(bits[i+1]),
      c=bits[i+2]==='='?0:abc.indexOf(bits[i+2]),
      d=bits[i+3]==='='?0:abc.indexOf(bits[i+3]);
    binary+=String.fromCharCode((a<<2)|(b>>4));
    if(bits[i+2]!=='=')binary+=String.fromCharCode(((b&15)<<4)|(c>>2));
    if(bits[i+3]!=='=')binary+=String.fromCharCode(((c&3)<<6)|d);
  }
  if(binary.length!==COLS*ROWS/8)throw Error('Australian GIS shoreline mask corrupt');
  function point(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*46/COLS,
    lat:BOUNDS.north-(r+.5)*37/ROWS};}
  function isLand(lon,lat){
    if(lon<BOUNDS.west||lon>BOUNDS.east||lat>BOUNDS.north||lat<BOUNDS.south)return false;
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/37-.5)));
    const c=Math.max(0,Math.min(COLS-1,Math.round((lon-BOUNDS.west)*COLS/46-.5-.5*(r&1))));
    const i=r*COLS+c;
    return !!(binary.charCodeAt(i>>3)&(128>>(i&7)));
  }
  root.AUSTRALIA_LAND_BITS=bits;
  const api={bits,binary,cols:COLS,rows:ROWS,bounds:BOUNDS,isLand,point};
  root.AUSTRALIA_GEOGRAPHY=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

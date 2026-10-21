/* Scenario Mode exclusive: only the United States and Canada are playable land. */
(function(root){'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const common=root.KNIGHTMARE_EXCLUSIVE||(typeof require==='function'?require('./scenarios-exclusive-common.js'):null);
const GEO=root.PARTITION_GEOGRAPHY||(typeof require==='function'?require('./partition-geography.js'):null);
const B=GEO.bounds,C=GEO.cols,R=GEO.rows;
const places=[
 ['Vancouver',-123.12,49.28],['Victoria',-123.37,48.43],['Prince Rupert',-130.32,54.31],['Prince George',-122.75,53.92],
 ['Whitehorse',-135.06,60.72],['Dawson City',-139.43,64.06],['Yellowknife',-114.38,62.45],
 ['Calgary',-114.07,51.05],['Edmonton',-113.49,53.55],['Saskatoon',-106.67,52.13],['Regina',-104.62,50.45],
 ['Winnipeg',-97.14,49.90],['Thunder Bay',-89.25,48.38],['Toronto',-79.38,43.65],['Ottawa',-75.70,45.42],
 ['Montreal',-73.57,45.50],['Quebec City',-71.21,46.81],['Halifax',-63.58,44.65],['Moncton',-64.78,46.09],
 ["St John's",-52.71,47.56],['Sudbury',-80.99,46.49],['Churchill',-94.17,58.77],['Iqaluit',-68.52,63.75],
 ['Seattle',-122.33,47.61],['Spokane',-117.43,47.66],['Portland',-122.68,45.52],['Boise',-116.20,43.62],
 ['San Francisco',-122.42,37.77],['Sacramento',-121.49,38.58],['Los Angeles',-118.24,34.05],['San Diego',-117.16,32.72],
 ['Reno',-119.81,39.53],['Las Vegas',-115.14,36.17],['Salt Lake City',-111.89,40.76],['Phoenix',-112.07,33.45],
 ['Tucson',-110.97,32.22],['Albuquerque',-106.65,35.08],['El Paso',-106.49,31.76],['Denver',-104.99,39.74],
 ['Cheyenne',-104.82,41.14],['Billings',-108.50,45.78],['Great Falls',-111.30,47.50],['Bismarck',-100.78,46.81],
 ['Fargo',-96.79,46.88],['Minneapolis',-93.27,44.98],['Rapid City',-103.23,44.08],['Pierre',-100.35,44.37],
 ['North Platte',-100.77,41.14],['Omaha',-95.94,41.26],['Wichita',-97.33,37.69],['Kansas City',-94.58,39.10],
 ['Dallas',-96.80,32.78],['Houston',-95.37,29.76],['San Antonio',-98.49,29.42],['Oklahoma City',-97.52,35.47],
 ['Chicago',-87.63,41.88],['Detroit',-83.05,42.33],['Cleveland',-81.69,41.50],['Pittsburgh',-80.00,40.44],
 ['St Louis',-90.20,38.63],['Memphis',-90.05,35.15],['New Orleans',-90.07,29.95],['Nashville',-86.78,36.16],
 ['Atlanta',-84.39,33.75],['Charlotte',-80.84,35.23],['Miami',-80.19,25.76],['Tampa',-82.46,27.95],
 ['Jacksonville',-81.66,30.33],['Charleston',-79.93,32.78],['Richmond',-77.44,37.54],['Washington',-77.04,38.91],
 ['Baltimore',-76.61,39.29],['Philadelphia',-75.17,39.95],['New York',-74.01,40.71],['Boston',-71.06,42.36],
 ['Buffalo',-78.88,42.89],['Portland Maine',-70.26,43.66],['Bangor',-68.77,44.80]
];
// The Empire retains a continuous continental heartland between the Pacific and
// Atlantic occupations. The northern extensions keep Montana/NWT connected.
const centralOutposts=new Set(['Great Falls','Yellowknife']);
const heartlandHubs=new Set(['Winnipeg','Minneapolis','Denver','Kansas City','St Louis',
 'Dallas','Houston','San Antonio','Oklahoma City','Albuquerque','Omaha']);
const owner=row=>centralOutposts.has(row[0])||row[1]>=-110&&row[1]<=-89.5
 ?'remnants':row[1]<-110?'cf':'eu';
const cityData=places.map(row=>[...row,owner(row),
 owner(row)==='remnants'?(heartlandHubs.has(row[0])?3:2):3,false]);
function geo(c,r){return {lon:B.west+(c+.5+.5*(r&1))*(B.east-B.west)/C,lat:B.north-(r+.5)*(B.north-B.south)/R};}
function locate(lon,lat){const r=Math.max(0,Math.min(R-1,Math.round((B.north-lat)*R/(B.north-B.south)-.5)));return {r,c:Math.max(0,Math.min(C-1,Math.round((lon-B.west)*C/(B.east-B.west)-.5-.5*(r&1))))};}
const portNames=new Set(['Vancouver','Victoria','Prince Rupert','Seattle','Portland','San Francisco','Los Angeles','San Diego','Halifax',"St John's",'Boston','New York','Miami','New Orleans']);
function create(_,__,seed){
 const g=common.blank('eu',seed,C,R),raw=atob(GEO.coverage);
 const lon=(B.west+B.east)/2,lat=(B.north+B.south)/2,k=Math.cos(lat*Math.PI/180);
 g.scenario={bounds:B,projection:{centerLon:lon,centerLat:lat,angle:0,uMin:(B.west-lon)*k,uMax:(B.east-lon)*k,vMin:B.south-lat,vMax:B.north-lat}};
 g.tiles=Array.from({length:C*R},(_,i)=>{const c=i%C,r=(i/C)|0,p=geo(c,r),kind=raw.charCodeAt(i);
  const rocky=p.lon>-122&&p.lon<-104&&p.lat>35&&p.lat<61;
  return {c,r,owner:null,terrain:kind===0?'sea':kind===1?'coast':p.lat>61?'tundra':rocky?'mountain':p.lat>50||p.lon>-85?'forest':p.lon<-108&&p.lat<38?'desert':'plains'};
 });
 for(const [name,lon,lat,owner,tier] of cityData){
  const at=E.nearestTile(g,locate(lon,lat),t=>!E.isSea(t)&&!g.stations.some(s=>s.c===t.c&&s.r===t.r),5);
  if(!at)throw Error('Partition city has no dry hex: '+name);
  g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier});at.terrain='plains';
 }
 for(const s of g.stations)if(portNames.has(s.name)){
  // Use only navigable neighbouring sea, with no invented inland port tiles.
  const at=E.adjacent(g,s).find(t=>E.isSea(t)&&!g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r));
  if(at){s.portAt={c:at.c,r:at.r};s.portLevel=2;s.portOwner=s.owner;}
 }
 return g;
}
const geography={id:'partition-geography',title:'Continental North America',cols:C,rows:R,sides:['eu','cf','remnants'],bounds:B,cityData,create,
 meta:{map:{centreSampled:true,coastBuffer:0,homeZoom:3.2,overviewMarkers:true}}};
const byNation=source=>Object.keys(E.COMMANDERS).filter(k=>E.COMMANDERS[k].side===source);
// This is a west-to-east war with Britannia physically separating the two occupiers.
// Never split Chinese or E.U. armies into fixed opposing theaters: it assigns
// rear-area formations to unreachable distant goals across the imperial front.
// Local assault columns instead pursue accessible hostile cities, then retarget
// after each capture. This is runtime AI metadata, not part of the save format.
const api=common.define({id:'partition-britannia',title:'The Partition of Britannia',geography,owner,
 ai:{doctrine:'assault'},
 intro:'Britannia still controls the North American heartland, from the Canadian Prairies through the Great Plains and Texas. Europia United occupies the Atlantic states and eastern Canada, while the Chinese Federation holds the Pacific coast and western Canada. All three powers fight for total conquest.',
 terrain:'United States and Canada only, from the southern border to 70°N. Alaska is omitted; no Mexico, Greenland or Caribbean territory. Real country boundaries and Great Lakes; Rocky Mountain routes remain passable.',
 rosters:{eu:['eu'],cf:['cf'],remnants:['britannia']},commanders:{eu:byNation('eu'),cf:byNation('cf'),
  remnants:['charles','schneizel','cornelia','bismarck','suzaku','gino','anya',
   'jeremiah','guilford','darlton','villetta','lloyd']},
 // Disperse the imperial command across the eastern and western approaches.
 commanderHomes:{remnants:{charles:'Denver',schneizel:'Minneapolis',cornelia:'Dallas',
  bismarck:'Kansas City',suzaku:'Albuquerque',gino:'Great Falls',anya:'Winnipeg',
  jeremiah:'New Orleans',guilford:'St Louis',darlton:'Omaha',
  villetta:'San Antonio',lloyd:'Houston'}},
 focus:{eu:'Chicago',cf:'Salt Lake City',remnants:'Denver'},forces:{eu:96,cf:86,remnants:72},
 stack:{remnants:2},reserve:{eu:3,cf:3,remnants:3},
 airships:['eu','cf','remnants'],navy:['eu','cf'],signatures:{leila:'leila_alexander',akito:'akito_liberte',xingke:'shen_hu'},
 blurbs:{eu:'Atlantic occupation: major eastern urban and industrial centres, with Great Lakes access.',cf:'Pacific occupation: the western coast, western Canada and strong naval forces.',remnants:'Britannian heartland: 27 cities from the Prairies to Texas, veteran imperial officers, a substantial land army and a starting airship.'}
});
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

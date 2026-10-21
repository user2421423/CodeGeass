/* UFN Civil War uses the entire Chinese mainland rather than the Luoyang regional map.
 * National outline: johan/world.geo.json CHN, Natural Earth-derived geodata.
 * Taiwan and all foreign provinces are excluded from the playable territory. */
(function(root){'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const common=root.KNIGHTMARE_EXCLUSIVE||(typeof require==='function'?require('./scenarios-exclusive-common.js'):null);
const COLS=200,ROWS=120,BOUNDS={west:73,east:135.55,north:53.7,south:17.65};
const POLYGONS=[[[[110.339188,18.678395],[109.47521,18.197701],[108.655208,18.507682],[108.626217,19.367888],[109.119056,19.821039],[110.211599,20.101254],[110.786551,20.077534],[111.010051,19.69593],[110.570647,19.255879],[110.339188,18.678395]]],[[[127.657407,49.76027],[129.397818,49.4406],[130.582293,48.729687],[130.987282,47.790132],[132.506672,47.78897],[133.373596,48.183442],[135.026311,48.47823],[134.500814,47.57844],[134.112362,47.212467],[133.769644,46.116927],[133.097127,45.144066],[131.883454,45.321162],[131.025212,44.967953],[131.288555,44.11152],[131.144688,42.92999],[130.633866,42.903015],[130.640016,42.395009],[129.994267,42.985387],[129.596669,42.424982],[128.052215,41.994285],[128.208433,41.466772],[127.343783,41.503152],[126.869083,41.816569],[126.182045,41.107336],[125.079942,40.569824],[124.265625,39.928493],[122.86757,39.637788],[122.131388,39.170452],[121.054554,38.897471],[121.585995,39.360854],[121.376757,39.750261],[122.168595,40.422443],[121.640359,40.94639],[120.768629,40.593388],[119.639602,39.898056],[119.023464,39.252333],[118.042749,39.204274],[117.532702,38.737636],[118.059699,38.061476],[118.87815,37.897325],[118.911636,37.448464],[119.702802,37.156389],[120.823457,37.870428],[121.711259,37.481123],[122.357937,37.454484],[122.519995,36.930614],[121.104164,36.651329],[120.637009,36.11144],[119.664562,35.609791],[119.151208,34.909859],[120.227525,34.360332],[120.620369,33.376723],[121.229014,32.460319],[121.908146,31.692174],[121.891919,30.949352],[121.264257,30.676267],[121.503519,30.142915],[122.092114,29.83252],[121.938428,29.018022],[121.684439,28.225513],[121.125661,28.135673],[120.395473,27.053207],[119.585497,25.740781],[118.656871,24.547391],[117.281606,23.624501],[115.890735,22.782873],[114.763827,22.668074],[114.152547,22.22376],[113.80678,22.54834],[113.241078,22.051367],[111.843592,21.550494],[110.785466,21.397144],[110.444039,20.341033],[109.889861,20.282457],[109.627655,21.008227],[109.864488,21.395051],[108.522813,21.715212],[108.05018,21.55238],[107.04342,21.811899],[106.567273,22.218205],[106.725403,22.794268],[105.811247,22.976892],[105.329209,23.352063],[104.476858,22.81915],[103.504515,22.703757],[102.706992,22.708795],[102.170436,22.464753],[101.652018,22.318199],[101.80312,21.174367],[101.270026,21.201652],[101.180005,21.436573],[101.150033,21.849984],[100.416538,21.558839],[99.983489,21.742937],[99.240899,22.118314],[99.531992,22.949039],[98.898749,23.142722],[98.660262,24.063286],[97.60472,23.897405],[97.724609,25.083637],[98.671838,25.918703],[98.712094,26.743536],[98.68269,27.508812],[98.246231,27.747221],[97.911988,28.335945],[97.327114,28.261583],[96.248833,28.411031],[96.586591,28.83098],[96.117679,29.452802],[95.404802,29.031717],[94.56599,29.277438],[93.413348,28.640629],[92.503119,27.896876],[91.696657,27.771742],[91.258854,28.040614],[90.730514,28.064954],[90.015829,28.296439],[89.47581,28.042759],[88.814248,27.299316],[88.730326,28.086865],[88.120441,27.876542],[86.954517,27.974262],[85.82332,28.203576],[85.011638,28.642774],[84.23458,28.839894],[83.898993,29.320226],[83.337115,29.463732],[82.327513,30.115268],[81.525804,30.422717],[81.111256,30.183481],[79.721367,30.882715],[78.738894,31.515906],[78.458446,32.618164],[79.176129,32.48378],[79.208892,32.994395],[78.811086,33.506198],[78.912269,34.321936],[77.837451,35.49401],[76.192848,35.898403],[75.896897,36.666806],[75.158028,37.133031],[74.980002,37.41999],[74.829986,37.990007],[74.864816,38.378846],[74.257514,38.606507],[73.928852,38.505815],[73.675379,39.431237],[73.960013,39.660008],[73.822244,39.893973],[74.776862,40.366425],[75.467828,40.562072],[76.526368,40.427946],[76.904484,41.066486],[78.187197,41.185316],[78.543661,41.582243],[80.11943,42.123941],[80.25999,42.349999],[80.18015,42.920068],[80.866206,43.180362],[79.966106,44.917517],[81.947071,45.317027],[82.458926,45.53965],[83.180484,47.330031],[85.16429,47.000956],[85.720484,47.452969],[85.768233,48.455751],[86.598776,48.549182],[87.35997,49.214981],[87.751264,49.297198],[88.013832,48.599463],[88.854298,48.069082],[90.280826,47.693549],[90.970809,46.888146],[90.585768,45.719716],[90.94554,45.286073],[92.133891,45.115076],[93.480734,44.975472],[94.688929,44.352332],[95.306875,44.241331],[95.762455,43.319449],[96.349396,42.725635],[97.451757,42.74889],[99.515817,42.524691],[100.845866,42.663804],[101.83304,42.514873],[103.312278,41.907468],[104.522282,41.908347],[104.964994,41.59741],[106.129316,42.134328],[107.744773,42.481516],[109.243596,42.519446],[110.412103,42.871234],[111.129682,43.406834],[111.829588,43.743118],[111.667737,44.073176],[111.348377,44.457442],[111.873306,45.102079],[112.436062,45.011646],[113.463907,44.808893],[114.460332,45.339817],[115.985096,45.727235],[116.717868,46.388202],[117.421701,46.672733],[118.874326,46.805412],[119.66327,46.69268],[119.772824,47.048059],[118.866574,47.74706],[118.064143,48.06673],[117.295507,47.697709],[116.308953,47.85341],[115.742837,47.726545],[115.485282,48.135383],[116.191802,49.134598],[116.678801,49.888531],[117.879244,49.510983],[119.288461,50.142883],[119.279366,50.582908],[120.18205,51.643566],[120.738191,51.964115],[120.725789,52.516226],[120.177089,52.753886],[121.003085,53.251401],[122.245748,53.431726],[123.571507,53.458804],[125.068211,53.161045],[125.946349,52.792799],[126.564399,51.784255],[126.939157,51.353894],[127.287456,50.739797],[127.657407,49.76027]]]];
const PLACES=[["Urumqi",87.62,43.82],["Kashgar",75.99,39.47],["Aksu",80.26,41.17],["Hotan",79.92,37.11],["Yining",81.32,43.92],["Turpan",89.19,42.95],["Hami",93.51,42.82],["Korla",86.15,41.76],["Karamay",84.87,45.59],["Lhasa",91.14,29.65],["Shigatse",88.88,29.27],["Nyingchi",94.36,29.65],["Chamdo",97.17,31.14],["Nagqu",92.06,31.48],["Xining",101.78,36.62],["Golmud",94.9,36.41],["Yushu",97.01,33],["Lanzhou",103.83,36.06],["Tianshui",105.72,34.58],["Zhangye",100.45,38.93],["Jiuquan",98.51,39.74],["Dunhuang",94.66,40.14],["Yinchuan",106.28,38.47],["Wuwei",102.64,37.93],["Hohhot",111.75,40.84],["Baotou",109.84,40.66],["Ordos",109.99,39.82],["Chifeng",118.96,42.27],["Tongliao",122.26,43.61],["Hulunbuir",119.77,49.21],["Xilinhot",116.09,43.93],["Harbin",126.64,45.76],["Qiqihar",123.92,47.35],["Daqing",125.1,46.59],["Mudanjiang",129.6,44.58],["Jiamusi",130.36,46.8],["Changchun",125.32,43.82],["Jilin City",126.55,43.84],["Yanji",129.51,42.91],["Shenyang",123.43,41.8],["Dalian",121.61,38.91],["Anshan",122.99,41.11],["Jinzhou",121.13,41.12],["Beijing",116.41,39.9],["Tianjin",117.2,39.13],["Tangshan",118.18,39.63],["Qinhuangdao",119.6,39.94],["Zhangjiakou",114.89,40.81],["Shijiazhuang",114.51,38.04],["Baoding",115.46,38.87],["Cangzhou",116.84,38.3],["Taiyuan",112.55,37.87],["Datong",113.3,40.08],["Linfen",111.52,36.09],["Xian",108.94,34.34],["Baoji",107.24,34.36],["Hanzhong",107.02,33.07],["Yanan",109.49,36.6],["Zhengzhou",113.63,34.75],["Luoyang",112.45,34.62],["Kaifeng",114.3,34.8],["Anyang",114.39,36.1],["Nanyang",112.54,32.99],["Xinyang",114.09,32.13],["Wuhan",114.31,30.59],["Yichang",111.29,30.69],["Jingzhou",112.24,30.33],["Xiangyang",112.12,32.01],["Changsha",112.94,28.23],["Hengyang",112.57,26.9],["Yueyang",113.13,29.36],["Jinan",117.12,36.65],["Qingdao",120.38,36.07],["Yantai",121.45,37.46],["Weifang",119.16,36.71],["Linyi",118.36,35.1],["Jining",116.59,35.41],["Shanghai",121.47,31.23],["Nanjing",118.8,32.06],["Suzhou",120.59,31.3],["Nantong",120.89,31.98],["Xuzhou",117.18,34.26],["Hefei",117.23,31.82],["Wuhu",118.38,31.35],["Anqing",117.05,30.53],["Hangzhou",120.16,30.27],["Ningbo",121.55,29.87],["Wenzhou",120.7,28],["Jinhua",119.65,29.08],["Chengdu",104.07,30.67],["Mianyang",104.74,31.47],["Leshan",103.77,29.57],["Yibin",104.64,28.77],["Chongqing",106.55,29.56],["Wanzhou",108.41,30.81],["Guiyang",106.71,26.57],["Zunyi",106.93,27.73],["Kunming",102.83,25.04],["Dali",100.27,25.6],["Lijiang",100.23,26.87],["Qujing",103.8,25.5],["Jinghong",100.8,22.01],["Nanchang",115.86,28.68],["Ganzhou",114.93,25.83],["Fuzhou",119.3,26.08],["Xiamen",118.08,24.48],["Quanzhou",118.59,24.88],["Guangzhou",113.26,23.13],["Shenzhen",114.06,22.54],["Dongguan",113.75,23.05],["Shantou",116.68,23.35],["Zhanjiang",110.36,21.27],["Shaoguan",113.6,24.81],["Nanning",108.37,22.82],["Guilin",110.29,25.27],["Liuzhou",109.43,24.33],["Beihai",109.12,21.48],["Haikou",110.33,20.04],["Sanya",109.51,18.25]];
const UFN=new Set(["Beijing","Tianjin","Tangshan","Qinhuangdao","Shenyang","Dalian","Anshan","Jinzhou","Changchun","Harbin","Jinan","Qingdao","Yantai","Weifang","Linyi","Jining","Shanghai","Nanjing","Suzhou","Nantong","Xuzhou","Hefei","Wuhu","Anqing","Hangzhou","Ningbo","Wenzhou","Jinhua","Fuzhou","Xiamen","Quanzhou","Guangzhou","Shenzhen","Dongguan","Shantou","Zhanjiang","Shaoguan","Nanning","Guilin","Liuzhou","Beihai","Haikou","Sanya","Nanchang","Ganzhou","Wuhan","Changsha","Yueyang","Xinyang","Kaifeng"]);
const MAJOR=new Set(["Urumqi","Kashgar","Lhasa","Xining","Lanzhou","Yinchuan","Hohhot","Harbin","Changchun","Shenyang","Dalian","Beijing","Tianjin","Shijiazhuang","Taiyuan","Xian","Zhengzhou","Luoyang","Wuhan","Changsha","Jinan","Qingdao","Shanghai","Nanjing","Hefei","Hangzhou","Chengdu","Chongqing","Guiyang","Kunming","Nanchang","Fuzhou","Guangzhou","Shenzhen","Nanning","Haikou"]);
function inRing(x,y,ring){
 let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }return hit;
}
function mainland(x,y){return POLYGONS.some(p=>inRing(x,y,p[0])&&!p.slice(1).some(h=>inRing(x,y,h)));}
function geo(c,r){return {lon:BOUNDS.west+(c+.5+.5*(r&1))*(BOUNDS.east-BOUNDS.west)/COLS,
 lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
 return {c:Math.max(0,Math.min(COLS-1,Math.round((lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1)))),r};}
function terrain(lon,lat,c,r){
 const v=(c*37+r*19+(c*r)%31)%13;
 if((lon<103&&lat>26&&lat<38)||(lon<98&&lat<34)||(lon>101&&lon<106&&lat<33&&lat>27))return v<10?'mountain':'forest';
 if((lon<96&&lat>35)||(lon>103&&lon<111&&lat>39&&lat<43))return 'desert';
 if(lat>44&&lon>119)return 'forest';
 if(lat>39&&lon<115)return v<8?'plains':'desert';
 if(lat<30&&lon<119)return v<8?'forest':'mountain';
 return v<2?'forest':'plains';
}
const cityData=PLACES.map(([name,lon,lat])=>[name,lon,lat,UFN.has(name)?'ufn':'cf',MAJOR.has(name)?3:2,name==='Luoyang'||name==='Nanjing']);
function create(_,__,seed){
 const g=common.blank('ufn',seed,COLS,ROWS),lat=(BOUNDS.north+BOUNDS.south)/2,lon=(BOUNDS.west+BOUNDS.east)/2;
 const k=Math.cos(lat*Math.PI/180);
 g.scenario={bounds:BOUNDS,projection:{centerLon:lon,centerLat:lat,angle:0,
  uMin:(BOUNDS.west-lon)*k,uMax:(BOUNDS.east-lon)*k,vMin:BOUNDS.south-lat,vMax:BOUNDS.north-lat},mapRegion:'mainland-china'};
 g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
  const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),dry=mainland(p.lon,p.lat);let kind='offmap';
  if(dry){
   kind=terrain(p.lon,p.lat,c,r);
   const coastward=(p.lon>120&&p.lat<41)||(p.lat<24&&p.lon>107);
   if(coastward&&![[.23,0],[-.23,0],[0,.23],[0,-.23]].every(([dx,dy])=>mainland(p.lon+dx,p.lat+dy)))kind='coast';
  }
  return {c,r,owner:null,terrain:kind};
 });
 for(const [name,lon,lat,owner,tier,fort] of cityData){
  const at=E.nearestTile(g,locate(lon,lat),t=>t.terrain!=='offmap'&&!E.isSea(t)&&
   !g.stations.some(s=>s.c===t.c&&s.r===t.r),7);
  if(!at)throw Error('UFN mainland: cannot position '+name);
  g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,fort});at.terrain='plains';
 }
 return g;
}
const geography={id:'mainland-china',title:'Mainland China',cols:COLS,rows:ROWS,sides:['ufn','cf'],cityData,create,locate,geographicAt:geo,
 meta:{map:{centreSampled:true,coastBuffer:0,homeZoom:2.7,overviewMarkers:true}}};
const api=common.define({id:'ufn-civil-war',title:'UFN Civil War',geography,owner:row=>row[3],
 intro:'Alternate history: the UFN fractures across mainland China. The Black Knights and UFN-aligned eastern cities establish a rival government at Nanjing, while the Chinese Federation consolidates its western and interior provinces around Luoyang. The conflict now reaches Xinjiang, Tibet, Manchuria, Shanghai and the far south.',
 terrain:'All mainland China is playable, from Kashgar and Lhasa to Harbin and Guangzhou. No foreign provinces or Taiwan.',
 rosters:{ufn:['bk'],cf:['cf']},
 commanders:{ufn:['zero','kallen','cc','tohdoh','ohgi','chiba','asahina','senba','urabe','sugiyama','minami','tamaki','diethard','sayoko','kaguya','benio'],
 cf:['xingke','xianglin','honggu','cao','gaohai','zhaohao','leifeng','meiling','lifeng','rakshata','tianzi','ren','xiawang','chengzhong','huangqian','sawasaki','chaojielun','vritra','zidien']},
 focus:{ufn:'Nanjing',cf:'Luoyang'},forces:{ufn:95,cf:135},reserve:{ufn:5,cf:3},
 signatures:{zero:'shinkiro',kallen:'guren_seiten',cc:'gawain',tohdoh:'tohdoh_gekka',xingke:'shen_hu'},
 airships:['ufn','cf'],
 blurbs:{ufn:'UFN coalition: eastern cities, coastal industry and Black Knights spearheads.',
 cf:'Federation loyalists: western and interior provinces, mountain defenses and the larger initial army.'}
});
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

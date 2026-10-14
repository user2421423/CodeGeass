/* Conquest of the Mexican Heartland — Chinese Federation versus Britannia.
   A standalone geographic scenario. CENTRAL LOAD/ATLAS INTEGRATION IS REQUIRED;
   this file intentionally changes no shared engine, UI, or campaign module.
   GSHHS intermediate-resolution coastal polygons, clipped against each
   pointy hex footprint: <20% land = sea, 20–80% = coast, >80% = land.
   204 x 136 geodetic hexes; all Mexican cities start Britannian.
*/
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const ID='cf-mexico', COLS=204, ROWS=136, SIDES=['cf','britannia'];
  const BOUNDS={west:-108.8,east:-91.0,north:24.3,south:14.0};
  const K=Math.cos(19.15*Math.PI/180);
  const PROJECTION={centerLon:-99.9,centerLat:19.15,angle:0,
    uMin:-8.9*K,uMax:8.9*K,vMin:-5.15,vMax:5.15};
  const COAST_RLE="S15,C1,L110,C1,S77;S16,C1,L109,S78;S18,C1,L107,C1,S77;S18,C1,L106,C1,S78;S20,C1,L105,C1,S77;S20,C1,L105,S78;S22,L104,C1,S77;S22,L104,C1,S77;S23,L103,C1,S77;S23,C1,L102,S78;S24,C1,L101,C1,S77;S25,L101,S78;S26,C1,L99,C1,S77;S26,L100,S78;S27,C1,L98,C1,S77;S27,C1,L98,S78;S29,C1,L96,C1,S77;S29,C1,L96,S78;S31,L95,C1,S77;S31,C1,L93,C1,S78;S33,L92,C1,S78;S33,C1,L91,S79;S34,C1,L90,C1,S78;S34,C1,L90,S79;S35,C1,L89,C1,S78;S35,L90,C1,S78;S36,L90,S78;S35,C1,L89,C1,S78;S36,L90,C1,S77;S35,C1,L90,S78;S36,L91,S77;S36,L90,C1,S77;S37,C1,L89,S1,C1,S75;S37,C1,L89,S1,C1,S75;S24,C2,S12,L89,C1,S1,C1,S74;S24,C2,S12,C1,L88,C1,S1,C2,S73;S40,C1,L87,C1,S1,C2,S72;S40,C1,L87,C1,S1,C1,S73;S41,L88,C2,S73;S40,C1,L88,C1,S74;S41,L89,C1,S73;S40,C1,L89,S74;S41,L90,S73;S39,C1,L91,S73;S39,L93,S72;S37,C1,L94,S72;S38,L95,S71;S39,C1,L92,C1,S71;S41,L92,C1,S70;S39,C1,L94,S70;S36,C2,L97,C1,S68;S35,C1,L99,C1,S68;S36,L100,C1,S67;S36,C1,L100,S67;S37,L101,C1,S65;S37,L101,C1,S65;S37,C1,L102,S64;S38,L102,S64;S39,L102,C1,S62;S39,L102,C1,S62;S40,C1,L101,S62;S40,C1,L100,C1,S62;S42,C1,L99,C1,S61;S42,C1,L99,C1,S61;S43,C1,L99,S61;S43,C1,L98,C1,S61;S46,L98,C1,S59;S46,C1,L97,C1,S59;S49,C2,L94,C1,S57,C1;S51,L95,C1,S55,L2;S52,C2,L93,C1,S52,C1,L3;S54,C1,L92,C1,S50,C1,L5;S56,C1,L91,C1,S49,C2,L4;S56,C1,L91,C7,S36,C1,S3,C3,S2,C1,L3;S58,L99,S29,C3,L4,C4,S3,C1,L3;S58,L99,C1,S26,C1,L7,C2,S5,C1,L4;S59,C1,L100,C1,S22,C1,L10,C1,S3,C1,L5;S59,C1,L100,C1,S13,C8,L14,C1,L7;S60,C1,L100,C1,S12,C1,L4,C1,L24;S60,C2,L100,S7,C3,L32;S64,C1,L97,C1,S3,C3,L35;S66,C2,L136;S69,C3,L132;S72,C2,L3,C1,L126;S79,C1,L124;S80,L124;S81,C1,L122;S81,C1,L122;S83,C1,L120;S84,C1,L119;S86,C1,L117;S87,C1,L116;S88,C1,L115;S89,C2,L113;S92,C2,L110;S94,C2,L108;S97,C2,L105;S99,C2,L103;S101,C2,L101;S102,C1,L101;S104,C4,L96;S109,C3,L92;S113,C2,L89;S115,C1,L88;S116,C1,L87;S117,C1,L86;S120,C2,L37,C2,L43;S122,C1,L32,C1,S8,C2,L38;S124,C1,L29,C1,S12,C1,L36;S125,L28,S15,C2,L34;S127,C5,L18,C2,S19,C1,L32;S133,C1,L13,C2,S23,C1,L31;S135,C1,L10,C1,S27,C1,L29;S136,C3,L5,C1,S30,L29;S140,C1,S35,C1,L27;S177,C1,L26;S178,C1,L25;S179,C1,L24;S180,C1,L23;S181,L23;S182,C1,L21;S182,C1,L21;S184,L20;S184,C1,L19;S185,C1,L18;S186,C1,L17;S187,C1,L16;S188,L16;S189,C1,L14;S190,L14;S191,C1,L12;S192,C1,L11;S193,C1,L10;S194,C1,L9;S196,C1,L7;S197,C1,L6";
  const MEXICAN_CITIES=[["Mexico City",-99.1332,19.4326,3,1],["Puebla",-98.2063,19.0414,3,1],["Toluca",-99.6557,19.2826,3,1],["Guadalajara",-103.3496,20.6597,3,1],["Querétaro",-100.3899,20.5888,3,1],["León",-101.684,21.125,3,1],["Morelia",-101.1844,19.7026,3,1],["Pachuca",-98.7591,20.1011,3,1],["Oaxaca",-96.7266,17.0732,3,1],["Veracruz",-96.1342,19.1738,3,1],["Acapulco",-99.8853,16.8531,3,1],["Chilpancingo",-99.5005,17.552,2,1],["Cuernavaca",-99.2216,18.9242,3,1],["San Luis Potosí",-100.9855,22.1565,3,1],["Zacatecas",-102.5721,22.7709,3,1],["Tlaxcala",-98.2382,19.3182,2,1],["Aguascalientes",-102.296,21.8853,3,1],["Guanajuato",-101.2529,21.0186,2,1],["Irapuato",-101.3466,20.6767,2,0],["Salamanca",-101.1944,20.5709,2,0],["Celaya",-100.8157,20.5222,2,1],["San Juan del Río",-99.9989,20.3878,2,1],["Lagos de Moreno",-101.9317,21.356,2,1],["Tepic",-104.8957,21.5042,2,1],["Puerto Vallarta",-105.2302,20.6534,2,1],["Manzanillo",-104.316,19.053,3,1],["Colima",-103.7241,19.2452,2,1],["Ciudad Guzmán",-103.4658,19.7059,2,0],["Zamora",-102.2834,19.9855,2,0],["Uruapan",-102.0626,19.4203,2,1],["Pátzcuaro",-101.6092,19.514,2,0],["Apatzingán",-102.348,19.0886,2,0],["Lázaro Cárdenas",-102.1944,17.9568,3,1],["Zitácuaro",-100.3575,19.434,2,1],["Taxco",-99.6065,18.5567,2,1],["Iguala",-99.5415,18.3447,2,1],["Cuautla",-98.954,18.8134,2,0],["Atlixco",-98.4342,18.9089,2,1],["Tehuacán",-97.3945,18.4615,2,1],["Orizaba",-97.1046,18.8519,2,1],["Córdoba",-96.934,18.8842,2,1],["Xalapa",-96.9273,19.5438,3,1],["Poza Rica",-97.4468,20.5331,2,1],["Tuxpan",-97.401,20.9577,2,1],["Tampico",-97.8587,22.2331,3,1],["Ciudad Valles",-99.0183,21.9854,2,1],["Tula",-99.341,20.0534,2,1],["Tulancingo",-98.3679,20.0836,2,0],["Texcoco",-98.882,19.513,2,1],["Ecatepec",-99.058,19.601,2,1],["Naucalpan",-99.235,19.479,2,1],["Alvarado",-95.771,18.772,2,1],["Coatzacoalcos",-94.4205,18.1503,3,1],["Minatitlán",-94.553,17.989,2,1],["Villahermosa",-92.9303,17.9892,3,1],["Cárdenas",-93.3727,18.001,2,1],["Ciudad del Carmen",-91.833,18.653,3,1],["Tuxtepec",-96.126,18.086,2,1],["Juchitán",-95.0186,16.435,2,1],["Tehuantepec",-95.236,16.324,2,1],["Salina Cruz",-95.1938,16.168,3,1],["Puerto Escondido",-97.0767,15.862,2,1],["Santa Cruz Huatulco",-96.132,15.768,2,1],["Pinotepa Nacional",-98.054,16.341,2,1],["Huajuapan de León",-97.78,17.81,2,1],["Miahuatlán",-96.595,16.329,2,0],["Arriaga",-93.902,16.235,2,1],["Tonalá",-93.752,16.089,2,1],["Cintalapa",-93.726,16.699,2,1],["Tuxtla Gutiérrez",-93.115,16.753,3,1],["San Cristóbal de las Casas",-92.637,16.737,2,1],["Comitán",-92.135,16.25,2,1],["Tapachula",-92.265,14.905,3,1],["Huixtla",-92.468,15.139,2,0],["Mapastepec",-92.902,15.44,2,0],["Puerto Chiapas",-92.408,14.701,2,1]];
  const STAGING_CITIES=[["Quetzaltenango",-91.518,14.834,3,1],["Huehuetenango",-91.469,15.319,3,1],["Retalhuleu",-91.677,14.536,2,1],["San Marcos (Guatemala)",-91.794,14.965,2,1]];
  const CITIES=[
    ...MEXICAN_CITIES.map(([n,x,y,t,f])=>[n,x,y,'britannia',t,!!f]),
    ...STAGING_CITIES.map(([n,x,y,t,f])=>[n,x,y,'cf',t,!!f])
  ];
  const PORTS={"Veracruz":[3,"gulf"],"Tuxpan":[2,"gulf"],"Tampico":[3,"gulf"],"Alvarado":[2,"gulf"],"Coatzacoalcos":[3,"gulf"],"Ciudad del Carmen":[3,"gulf"],"Acapulco":[3,"pacific"],"Manzanillo":[3,"pacific"],"Puerto Vallarta":[2,"pacific"],"Lázaro Cárdenas":[3,"pacific"],"Salina Cruz":[3,"pacific"],"Puerto Escondido":[2,"pacific"],"Santa Cruz Huatulco":[2,"pacific"],"Puerto Chiapas":[2,"pacific"]};
  const LAND_GROUPS=[["cf","Huehuetenango","heavy",6,"xingke","southern"],["cf","Huehuetenango","medium",5,null,"southern"],["cf","Huehuetenango","rocket",3,null,"southern"],["cf","Quetzaltenango","heavy",6,null,"southern"],["cf","Quetzaltenango","assault",5,"xianglin","southern"],["cf","Quetzaltenango","rocket",4,"honggu","southern"],["cf","San Marcos (Guatemala)","assault",5,"cao","southern"],["cf","San Marcos (Guatemala)","siege",3,null,"southern"],["cf","San Marcos (Guatemala)","scout",3,"ren","southern"],["cf","Retalhuleu","heavy",6,null,"southern"],["cf","Retalhuleu","medium",5,null,"southern"],["cf","Retalhuleu","support",3,null,"southern"],["britannia","Mexico City","heavy",7,"bismarck","capital"],["britannia","Mexico City","rocket",5,null,"capital"],["britannia","Mexico City","siege",4,null,"capital"],["britannia","Puebla","heavy",6,"jeremiah","pass"],["britannia","Puebla","rocket",4,null,"pass"],["britannia","Toluca","heavy",5,"villetta","capital"],["britannia","Toluca","siege",3,null,"capital"],["britannia","Guadalajara","heavy",7,"suzaku","western"],["britannia","Guadalajara","rocket",4,null,"western"],["britannia","Querétaro","heavy",5,"oldrin","reserve"],["britannia","Querétaro","medium",4,null,"reserve"],["britannia","Morelia","heavy",5,"guilford","western"],["britannia","Morelia","siege",3,null,"western"],["britannia","León","heavy",4,"darlton","reserve"],["britannia","Aguascalientes","medium",4,null,"reserve"],["britannia","Zacatecas","heavy",5,null,"reserve"],["britannia","San Luis Potosí","heavy",5,null,"reserve"],["britannia","Pachuca","heavy",4,null,"capital"],["britannia","Oaxaca","heavy",5,"cornelia","pass"],["britannia","Oaxaca","rocket",3,null,"pass"],["britannia","Tehuacán","heavy",4,"kewell","pass"],["britannia","Orizaba","heavy",4,null,"pass"],["britannia","Veracruz","heavy",5,"cecile","eastern"],["britannia","Veracruz","rocket",3,null,"eastern"],["britannia","Xalapa","heavy",4,null,"eastern"],["britannia","Coatzacoalcos","heavy",4,null,"eastern"],["britannia","Villahermosa","medium",3,null,"eastern"],["britannia","Acapulco","heavy",5,"luciano","western"],["britannia","Acapulco","rocket",3,null,"western"],["britannia","Manzanillo","heavy",5,null,"western"],["britannia","Puerto Vallarta","medium",3,null,"western"],["britannia","Lázaro Cárdenas","heavy",4,null,"western"],["britannia","Chilpancingo","heavy",4,null,"pass"],["britannia","Tuxtla Gutiérrez","heavy",4,null,"southern"],["britannia","San Cristóbal de las Casas","medium",3,null,"southern"],["britannia","Tapachula","heavy",3,null,"southern"],["britannia","Juchitán","heavy",3,null,"southern"],["britannia","Salina Cruz","medium",3,null,"southern"]];
  const INVASION_LAND=[["Gulf Expedition","heavy",6,"sawasaki"],["Gulf Expedition","rocket",3,null],["Gulf Expedition","assault",3,null],["Acapulco Expedition","heavy",6,null],["Acapulco Expedition","assault",4,null],["Acapulco Expedition","siege",2,null],["Manzanillo Expedition","heavy",5,"chaojielun"],["Manzanillo Expedition","rocket",3,null],["Manzanillo Expedition","medium",3,null]];
  const FLEETS=[["cf","Gulf Expedition",-95.1,19.55,"cf_carrier",8,"gulf"],["cf","Gulf Expedition",-95.1,19.55,"shui_gun_ru_ii",5,"gulf"],["cf","Acapulco Expedition",-100.3,16.2,"cf_carrier",8,"pacific"],["cf","Acapulco Expedition",-100.3,16.2,"shui_gun_ru_ii",5,"pacific"],["cf","Manzanillo Expedition",-104.9,18.32,"cf_carrier",7,"pacific"],["cf","Manzanillo Expedition",-104.9,18.32,"shui_gun_ru_ii",5,"pacific"],["britannia","Gulf Defense",-96.18,19.36,"carrier_battleship",4,"gulf"],["britannia","Gulf Defense",-96.18,19.36,"portman_ii",5,"gulf"],["britannia","Southern Gulf Defense",-94.25,18.48,"carrier_battleship",3,"gulf"],["britannia","Pacific Defense",-99.95,16.5,"carrier_battleship",4,"pacific"],["britannia","Pacific Defense",-99.95,16.5,"portman_ii",4,"pacific"],["britannia","Colima Fleet",-104.43,18.66,"carrier_battleship",4,"pacific"]];
  const FUNDING={cf:{credits:1800,industry:1150,science:155,sakuradite:65},
    britannia:{credits:1750,industry:1160,science:145,sakuradite:62}};
  // Real regional ridgelines (WGS84): terrain is computed by distance to
  // curved mountain spines, never by axis-aligned rectangular bands.
  const RIDGES={
    'Sierra Madre Occidental':{width:.55,points:[
      [-106.5,24.1],[-105.8,23.45],[-105.25,22.55],[-104.65,21.75],
      [-104.23,21.25],[-103.95,20.83]]},
    'Sierra Madre Oriental':{width:.46,points:[
      [-100.25,24.25],[-100.01,23.25],[-99.4,22.2],[-99.0,21.3],
      [-98.35,20.5],[-97.65,19.7],[-97.22,18.8]]},
    'Sierra Madre del Sur':{width:.48,points:[
      [-104.2,19.05],[-103.08,18.7],[-102.22,18.3],[-101.15,17.9],
      [-100.0,17.45],[-99.0,16.85],[-97.75,16.72],[-96.7,16.55]]},
    'Trans-Mexican Volcanic Belt':{width:.38,points:[
      [-103.75,19.5],[-102.65,19.45],[-101.85,19.48],[-100.9,19.45],
      [-99.77,19.23],[-98.64,19.05],[-97.28,19.08]]},
    'Sierra Norte de Oaxaca':{width:.32,points:[
      [-98.2,18.65],[-97.3,18.3],[-96.45,17.86],[-95.66,17.45]]},
    'Sierra Madre de Chiapas':{width:.38,points:[
      [-94.7,16.8],[-93.9,16.5],[-93.1,16.15],[-92.45,15.42],[-91.9,14.85]]}
  };
  const PASSES={
    'Isthmus of Tehuantepec':{width:.16,points:[
      [-95.19,16.17],[-95.02,16.44],[-94.96,16.77],[-94.46,17.0],[-94.41,18.15]]},
    'Puebla–Orizaba corridor':{width:.14,points:[
      [-98.21,19.04],[-97.63,18.93],[-97.27,18.84],[-96.94,18.88],[-96.13,19.17]]},
    'Valley of Mexico east gateway':{width:.16,points:[
      [-99.13,19.43],[-98.94,19.48],[-98.45,19.39],[-98.21,19.04]]},
    'Oaxaca–Tehuacán route':{width:.14,points:[
      [-96.73,17.07],[-97.28,17.65],[-97.4,18.46],[-98.21,19.04]]},
    'Oaxaca–Chiapas Pan-American route':{width:.16,points:[
      [-96.73,17.07],[-95.72,16.85],[-94.55,16.58],[-93.7,16.7],[-93.1,16.75]]},
    'Guadalajara–Colima corridor':{width:.15,points:[
      [-103.35,20.66],[-103.46,19.71],[-103.73,19.25],[-104.32,19.05]]},
    'Guerrero–Cuernavaca highway':{width:.16,points:[
      [-99.89,16.86],[-99.54,18.35],[-99.61,18.56],[-99.22,18.92],[-99.13,19.43]]},
    'Western plateau Lerma corridor':{width:.18,points:[
      [-103.35,20.66],[-102.28,19.99],[-101.35,20.68],[-100.39,20.59]]},
    'Central plateau Mexico City–Querétaro':{width:.15,points:[
      [-99.13,19.43],[-99.34,20.05],[-100.0,20.39],[-100.39,20.59]]},
    'Balsas valley':{width:.13,points:[
      [-102.2,17.95],[-101.4,18.17],[-100.6,18.18],[-99.54,18.34]]}
  };
  const RIVERS={
    'Río Lerma':[[-99.65,19.30],[-100.02,19.65],[-100.45,20.16],
      [-101.18,20.57],[-101.91,20.44],[-102.58,20.75],[-103.3,20.86],[-104.37,21.46]],
    'Río Balsas':[[-98.67,18.58],[-99.55,18.48],[-100.34,18.24],
      [-101.25,18.2],[-102.17,17.95]],
    'Río Papaloapan':[[-97.32,17.25],[-96.85,17.75],
      [-96.4,18.15],[-95.92,18.75]],
    'Río Coatzacoalcos':[[-94.93,17.16],[-94.52,17.53],[-94.43,18.16]],
    'Río Grijalva':[[-92.1,15.65],[-92.92,16.25],[-93.15,16.75],
      [-93.46,17.36],[-92.92,17.99]],
    'Río Usumacinta':[[-91.5,16.1],[-91.25,17.0],[-91.05,17.7]]
  };
  const VOLCANOES=[
    ['Nevado de Colima',-103.62,19.56],['Parícutin',-102.25,19.49],
    ['Nevado de Toluca',-99.76,19.11],['Popocatépetl',-98.63,19.02],
    ['Iztaccíhuatl',-98.64,19.18],['La Malinche',-98.03,19.23],
    ['Pico de Orizaba',-97.27,19.03],['El Chichón',-93.23,17.36],
    ['Tacaná',-92.11,15.13]
  ];
  const LAKES={
    'Lake Chapala':[[-103.45,20.30],[-103.2,20.32],[-102.93,20.26],[-103.13,20.08],[-103.47,20.16]],
    'Lake Pátzcuaro':[[-101.71,19.64],[-101.56,19.64],[-101.53,19.5],[-101.65,19.49]],
    'Lake Cuitzeo':[[-101.21,20.03],[-100.95,20.03],[-100.92,19.9],[-101.22,19.9]]
  };
  const BASINS=[
    [-99.13,19.43,.86,.62], // Mexico City: high inland basin, never maritime
    [-100.7,20.67,1.2,.60],[-103.35,20.66,.9,.52],
    [-96.72,17.06,.48,.38],[-93.12,16.75,.70,.30]
  ];
  const WOODLANDS=[
    [-94.0,16.85,1.7,.72],[-92.5,15.6,.85,1.0],
    [-97.5,17.3,1.4,.65],[-99.1,17.1,1.1,.7],
    [-104.4,21.6,.7,1.35],[-101.7,18.6,1.5,.5]
  ];
  function geo(c,r){
    return {lon:BOUNDS.west+(c+.5+.5*(r&1))*(BOUNDS.east-BOUNDS.west)/COLS,
      lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};
  }
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,
      Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    const c=Math.max(0,Math.min(COLS-1,
      Math.round((lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))));
    return {c,r};
  }
  // East of the approximate Mexican–Guatemalan border polyline, only in
  // southern staging territory. No Mexican city may become Chinese at start.
  const BORDER=[[-92.15,14.67],[-92.07,14.91],[-91.95,15.17],
    [-91.81,15.40],[-91.61,15.66],[-91.41,15.83],[-91.0,16.0]];
  function guatemala(p) {
    if(p.lat<14.0||p.lat>16.0)return false;
    for(let i=1;i<BORDER.length;i++){
      const a=BORDER[i-1],b=BORDER[i];
      if(p.lat<=b[1]){
        const x=a[0]+(p.lat-a[1])*(b[0]-a[0])/(b[1]-a[1]);
        return p.lon>x;
      }
    }
    return false;
  }
  function routeDistance(p,points) {
    const k=Math.cos(p.lat*Math.PI/180);
    let best=Infinity;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],
        dx=(b[0]-a[0])*k,dy=b[1]-a[1],
        x=(p.lon-a[0])*k,y=p.lat-a[1],
        t=Math.max(0,Math.min(1,(x*dx+y*dy)/(dx*dx+dy*dy||1)));
      best=Math.min(best,Math.hypot(x-t*dx,y-t*dy));
    }
    return best;
  }
  function density(p,items){
    let out=0;
    for(const [x,y,w,h] of items)
      out=Math.max(out,Math.exp(-1.6*(((p.lon-x)/w)**2+((p.lat-y)/h)**2)));
    return out;
  }
  function landscape(p) {
    // Named transport gaps cross real ridge profiles. They are traversable
    // dry-land corridors, never artificial cuts through the sea.
    const pass=Object.values(PASSES).some(q=>routeDistance(p,q.points)<q.width);
    if(pass)return 'plains';
    if(density(p,BASINS)>.52)return 'plains';
    if(VOLCANOES.some(([,x,y])=>Math.hypot((p.lon-x)*.94,p.lat-y)<.17))
      return 'mountain';
    const mountains=Math.max(0,...Object.values(RIDGES).map(q=>
      Math.exp(-1.6*(routeDistance(p,q.points)/q.width)**2)));
    if(mountains>.60)return 'mountain';
    if(density(p,WOODLANDS)>.38||mountains>.29)return 'forest';
    if(p.lat>21.1&&p.lon>-104&&p.lon<-99)return 'desert';
    return 'plains';
  }
  const COAST_ROWS=COAST_RLE.split(';').map((line,r)=>{
    const a=new Uint8Array(COLS);let c=0;
    for(const run of line.split(',')){
      const n=Number(run.slice(1)),type=run[0],
        value=type==='S'?0:type==='C'?1:type==='L'?2:-1;
      if(!Number.isInteger(n)||n<1||value<0||c+n>COLS)
        throw Error('Invalid Mexico GSHHS row '+r);
      a.fill(value,c,c+n);c+=n;
    }
    if(c!==COLS)throw Error('Incomplete Mexico coastal row '+r);
    return a;
  });
  if(COAST_ROWS.length!==ROWS)throw Error('Incomplete Mexico GSHHS coverage');
  function nearest(g,pos,allowed,radius=10){
    let best=null,cost=Infinity;
    for(let r=Math.max(0,pos.r-radius);r<=Math.min(g.rows-1,pos.r+radius);r++)
      for(let c=Math.max(0,pos.c-radius);c<=Math.min(g.cols-1,pos.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!allowed(t))continue;
        const d=E.distance(pos,t,g);
        if(d<cost){best=t;cost=d;}
      }
    return best;
  }
  function floodWater(g,start){
    const visited=new Set([E.key(start)]),todo=[start];
    for(let i=0;i<todo.length;i++)
      for(const p of E.adjacent(g,todo[i])){
        if((p.terrain!=='sea'&&p.terrain!=='coast')||visited.has(E.key(p)))continue;
        visited.add(E.key(p));todo.push(p);
      }
    return visited;
  }
  function orderGroup(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const group=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
    if(!group)return {ok:false,reason:'Army Group missing'};
    let assigned=0,failed=0;
    for(const id of group.units){
      const u=g.units.find(v=>v.id===id&&v.hp>0&&v.side===g.player);
      if(!u){failed++;continue;}
      const result=E.setGoto(g,u.id,target.c,target.r);
      if(result.ok)assigned++;else failed++;
    }
    if(assigned)group.destination={c:target.c,r:target.r};
    return {ok:!!assigned,assigned,failed};
  }
  function create(player='cf',difficulty='normal',seed=201724){
    if(!SIDES.includes(player))throw Error('Unsupported Mexican campaign faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,
      player,difficulty,mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{cf:0,britannia:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      lineup:{cf:{...E.LINEUPS.cf2017}},mapRevision:0,
      teams:{cf:'cf',britannia:'britannia'},factions:{}};
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};
      g.tech[side]={};
    }
    g.scenario={id:ID,key:'mexico',title:'Conquest of the Mexican Heartland',
      version:1,aiDoctrine:'europe',phase:'continental-three-pronged-offensive',
      bounds:BOUNDS,projection:PROJECTION,groups:[],funding:{},
      noTurnLimit:true,completeConquest:true,
      coastline:{source:'GSHHS intermediate',landThresholds:[.2,.8],
        cols:COLS,rows:ROWS,centreSampled:true},
      atlas:{ridges:RIDGES,passes:PASSES,rivers:RIVERS,
        volcanoes:VOLCANOES,lakes:LAKES,basins:BASINS,border:BORDER},
      operationalFronts:[
        {name:'Southern Chiapas–Oaxaca Axis',attack:'cf',objective:'Oaxaca',
          route:['Tapachula','Tuxtla Gutiérrez','Juchitán','Oaxaca','Puebla','Mexico City']},
        {name:'Pacific West Amphibious Axis',attack:'cf',objective:'Guadalajara',
          route:['Manzanillo','Colima','Guadalajara','León','Querétaro']},
        {name:'Pacific South Amphibious Axis',attack:'cf',objective:'Acapulco',
          route:['Acapulco','Chilpancingo','Cuernavaca','Toluca','Mexico City']},
        {name:'Veracruz Gulf Axis',attack:'cf',objective:'Veracruz',
          route:['Veracruz','Xalapa','Orizaba','Puebla','Mexico City']},
        {name:'Plateau Mobile Reserve',attack:'britannia',objective:'Mexico City'},
        {name:'Volcanic Pass Defense',attack:'britannia',objective:'Puebla'}
      ]};
    const elites=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      elites.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,kind=COAST_ROWS[r][c],p=geo(c,r);
      return {c,r,owner:null,terrain:kind===0?'sea':kind===1?'coast':landscape(p)};
    });
    const seaSeed=(lon,lat)=>nearest(g,locate(lon,lat),
      t=>t.terrain==='sea',12);
    const pacificSeed=seaSeed(-105.4,18.1),gulfSeed=seaSeed(-95.0,20.1);
    if(!pacificSeed||!gulfSeed)throw Error('Mexico ocean seed missing');
    const basins={pacific:floodWater(g,pacificSeed),gulf:floodWater(g,gulfSeed)};
    if(basins.pacific.has(E.key(gulfSeed)))
      throw Error('The Mexican Isthmus accidentally connects both oceans');
    const byName={},occupiedCities=new Set();
    for(const [name,lon,lat,side,tier,fort] of CITIES){
      const port=PORTS[name],p=locate(lon,lat);
      const valid=t=>t.terrain!=='sea'&&!occupiedCities.has(E.key(t))&&
        (!port||E.adjacent(g,t).some(n=>n.terrain==='sea'&&
          basins[port[1]].has(E.key(n))));
      const at=nearest(g,p,valid,port?8:6);
      if(!at)throw Error('Unplaceable Mexico/Guatemala city: '+name);
      const actual=geo(at.c,at.r);
      if(Math.hypot((actual.lon-lon)*.94,actual.lat-lat)>(port ? 0.55 : 0.4))
        throw Error('Geography drift at '+name);
      if(side==='cf'&&!guatemala(actual))throw Error('Staging town outside Guatemala: '+name);
      if(side==='britannia'&&guatemala(actual))throw Error('Mexican town misplaced: '+name);
      occupiedCities.add(E.key(at));
      const capital=name==='Mexico City',shield=fort?(capital?720:tier>=3?540:420):145+75*tier;
      const station={id:g.stations.length,name,c:at.c,r:at.r,owner:side,tier,
        capital,capitalOf:capital?side:null,fort:!!fort,
        gun:fort?name+' Defense Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?55:tier===3?32:tier===2?20:12)*.55),
        industry:Math.round((capital?32:7*tier)*.55),
        science:Math.round((1+tier)*.55),producedTurn:0,
        wgs84:{lon,lat}};
      g.stations.push(station);byName[name]=station;
    }
    // Territorial allegiance is the real border, not nearest-city Voronoi.
    // Province-city IDs on land always refer to a same-side station.
    const provinceBySide=Object.fromEntries(SIDES.map(side=>[side,
      g.stations.filter(s=>s.owner===side)]));
    for(const t of g.tiles)if(t.terrain!=='sea'){
      t.owner=guatemala(geo(t.c,t.r))?'cf':'britannia';
      const near=provinceBySide[t.owner].reduce((best,s)=>
        !best||E.distance(t,s,g)<E.distance(t,best,g)?s:best,null);
      t.provinceCity=near.id;
    }
    // Each port belongs to its station independently of the dry-land city.
    // Ship berths touch authentic Gulf/Pacific sea neighbours only.
    const portWater=new Set();
    for(const [name,[level,basin]] of Object.entries(PORTS)){
      const s=byName[name];
      const choices=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&
        basins[basin].has(E.key(t))&&!portWater.has(E.key(t)));
      const at=choices.sort((a,b)=>E.adjacent(g,b).filter(t=>t.terrain==='sea').length-
        E.adjacent(g,a).filter(t=>t.terrain==='sea').length)[0];
      if(!at)throw Error('No independently navigable '+basin+' port for '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      s.portBasin=basin;portWater.add(E.key(at));
    }
    let index=0;
    const groups=new Map();
    function group(side,name,kind='army'){
      const key=side+':'+name+':'+kind;
      if(!groups.has(key)){
        const v={id:kind+'-'+index++,side,name:name+
          (kind==='fleet'?' Fleet':' Army Group'),origin:name,units:[],kind};
        groups.set(key,v);g.scenario.groups.push(v);
      }
      return groups.get(key);
    }
    for(const [side,name,cls,count,cmd,posture] of LAND_GROUPS){
      const s=byName[name];
      if(!s||s.owner!==side)throw Error('Invalid military staging '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&t.owner===side&&
          !E.unitAt(g,t)&&(!E.stationAt(g,t)||
            E.stationAt(g,t).owner===side),14);
        if(!at)throw Error('No formation deployment for '+name);
        const officer=i===0?cmd:null;
        if(officer&&!E.COMMANDERS[officer])throw Error('Unknown commander '+officer);
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,officer);
        if(officer&&g.officers[officer]){
          u.cmdRank=g.officers[officer].rank;u.hp=E.maxHP(u);
        }
        u.operationalSector=posture;
        // Entrenched defenders retain high ground until threatened; central
        // reserve formations become mobile once an approach is penetrated.
        if(side==='britannia'&&['capital','pass','reserve'].includes(posture)){
          u.hold={c:s.c,r:s.r,radius:posture==='pass'?3:6};
          if(posture==='reserve')u.mexicoReserve=true;
          else u.mexicoGuard=name;
        }
        group(side,name).units.push(u.id);
      }
    }
    const shipGroups=new Map();
    for(const [side,name,lon,lat,type,count,basin] of FLEETS){
      if(!E.TYPES[type]?.naval)throw Error('Invalid Mexico fleet type '+type);
      const anchor=locate(lon,lat),fleet=group(side,name,'fleet');
      for(let i=0;i<count;i++){
        const at=nearest(g,anchor,t=>t.terrain==='sea'&&
          basins[basin].has(E.key(t))&&!E.unitAt(g,t)&&
          !portWater.has(E.key(t)),22);
        if(!at)throw Error('Fleet has no '+basin+' water at '+name);
        const ship=E.newUnit(g,type,side,at.c,at.r);
        ship.invasionGroup=side==='cf'?name:null;
        ship.navalBasin=basin;
        fleet.units.push(ship.id);
        if(side==='cf'&&E.TYPES[type].naval==='ship'){
          if(!shipGroups.has(name))shipGroups.set(name,[]);
          shipGroups.get(name).push(ship);
        }
      }
    }
    const embarked=[];
    for(const [name,cls,count,commander] of INVASION_LAND){
      for(let i=0;i<count;i++){
        const carrier=(shipGroups.get(name)||[]).find(ship=>
          (ship.pendingPassengers||0)<E.TYPES[ship.type].capacity);
        if(!carrier)throw Error('Insufficient Chinese invasion berths for '+name);
        carrier.pendingPassengers=(carrier.pendingPassengers||0)+1;
        const officer=i===0?commander:null;
        if(officer&&!E.COMMANDERS[officer])throw Error('Unknown amphibious commander '+officer);
        const unit=E.newUnit(g,E.typeFor('cf',cls,g),'cf',
          carrier.c,carrier.r,i===0?3:2,officer);
        if(officer&&g.officers[officer]){
          unit.cmdRank=g.officers[officer].rank;unit.hp=E.maxHP(unit);
        }
        unit.invasionGroup=name;group('cf',name).units.push(unit.id);
        embarked.push({ship:carrier,unit});
      }
    }
    if(difficulty==='elite'){
      // Local 2017 Elite conversion; carriers/amphibious hulls stay unchanged.
      const used=new Map();
      for(const unit of g.units){
        const previous=E.TYPES[unit.type];
        if(previous.naval)continue;
        const roster=g.scenario.eliteRosters[unit.side]||[];
        const choices=roster.filter(id=>
          E.TYPES[E.ELITE_FORCES[id].type]?.cls===previous.cls&&
          !E.TYPES[E.ELITE_FORCES[id].type]?.naval);
        if(!choices.length)continue;
        const key=unit.side+':'+previous.cls,n=used.get(key)||0;
        const elite=choices[n%choices.length];used.set(key,n+1);
        unit.type=E.ELITE_FORCES[elite].type;unit.elite=elite;
        unit.eliteLevel=unit.side===player?1:unit.cmd?5:3;
        unit.eliteStart=true;unit.stack=1;
        if(unit.cmd&&unit.side!==player){
          g.officers[unit.cmd].rank=E.RANKS.length-1;
          unit.cmdRank=E.RANKS.length-1;
        }
        unit.hp=E.maxHP(unit);
      }
      for(const s of g.stations)s.tier=Math.max(s.tier,2);
      for(const side of SIDES.filter(s=>s!==player))
        g.tech[side]=Object.fromEntries(Object.keys(E.TECH_NODES).map(k=>[k,4]));
    }
    for(const {ship,unit} of embarked){
      (ship.cargo||=[]).push(unit);
      g.units.splice(g.units.indexOf(unit),1);
    }
    for(const vessels of shipGroups.values())
      for(const ship of vessels)delete ship.pendingPassengers;
    if(difficulty==='hard'||difficulty==='challenge'){
      for(const side of SIDES.filter(s=>s!==player))
        for(const [i,u] of E.allUnits(g).filter(v=>v.side===side&&
          !v.elite&&E.TYPES[v.type].naval!=='ship').entries())
          if(difficulty==='challenge'||i%2===0){
            u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);
          }
    }
    for(const side of SIDES){
      const factor=side===player?1:difficulty==='hard'?1.3:
        ['challenge','elite'].includes(difficulty)?1.6:1;
      const generated=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(Object.entries(FUNDING[side])
        .map(([resource,n])=>[resource,Math.round(n*factor)-generated[resource]]));
      const total=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=total[resource]*(side==='cf'?3:2);
    }
    g.startUnits=Object.fromEntries(SIDES.map(side=>[side,
      E.allUnits(g).filter(u=>u.side===side).length]));
    E.log(g,'The Chinese Federation advances from Guatemala toward Oaxaca, Puebla and Mexico City while carrier-led armies strike the Gulf and Pacific coasts. Only full-city conquest brings victory.',player);
    return g;
  }
  function onTurn(g){
    if(g.scenario?.id!==ID)return false;
    const enemies=E.allUnits(g).filter(u=>u.side==='cf'&&u.hp>0&&
      E.TYPES[u.type].naval!=='ship');
    for(const u of g.units){
      if(u.side!=='britannia'||(!u.mexicoGuard&&!u.mexicoReserve))continue;
      const home=g.stations.find(s=>s.name===(u.mexicoGuard||(
        Object.values(g.scenario.groups).find(gr=>gr.units.includes(u.id))?.origin)));
      const threatened=home&&enemies.some(e=>E.distance(e,home,g)<=9);
      if(!home||home.owner!=='britannia'||threatened&&u.mexicoReserve){
        delete u.hold;
        delete u.mexicoGuard;
        delete u.mexicoReserve;
      }
    }
    return false; // Shared dynamic AI remains responsible for combat/orders.
  }
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((v,s)=>v+s.tier,0);
  }
  function objective(g,side=g.player){
    const rival=side==='cf'?'britannia':'cf';
    const remaining=g.stations.filter(s=>s.owner===rival).length;
    return (side==='cf'?'Conquer all Britannian cities in Mexico':
      'Defend Mexico and seize all Chinese staging cities in Guatemala')+
      ' ('+remaining+' enemy cities remain). No turn limit.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||
      g.stations.length!==CITIES.length)return null;
    if(g.stations.every(s=>s.owner==='cf'))
      return {winner:'cf',team:'cf',
        reason:'The Chinese Federation has conquered every city of the Mexican Heartland.'};
    if(g.stations.every(s=>s.owner==='britannia') &&
       !E.allUnits(g).some(u=>u.side==='cf'&&u.hp>0))
      return {winner:'britannia',team:'britannia',
        reason:'Britannia has expelled the Federation and occupied its Guatemalan staging bases.'};
    return null;
  }
  const api={id:ID,title:'Conquest of the Mexican Heartland',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,projection:PROJECTION,
    cityData:CITIES,mexicanCityCount:MEXICAN_CITIES.length,
    armyGroups:LAND_GROUPS,invasionGroups:INVASION_LAND,
    fleetData:FLEETS,ports:PORTS,atlas:{ridges:RIDGES,passes:PASSES,
      rivers:RIVERS,volcanoes:VOLCANOES,lakes:LAKES,border:BORDER},
    coastalMask:COAST_ROWS,create,onTurn,objective,winner,
    strategicScore,orderGroup};
  E.scenarios={...(E.scenarios||{}),mexico:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

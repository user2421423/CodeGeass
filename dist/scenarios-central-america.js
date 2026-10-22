/* Central American Offensive — Chinese Federation versus Britannia.
 * Geodetic 184 x 168 regional tactical hexes; 43-sample GSHHS intermediate
 * shoreline classes (<20% sea, 20–80% mixed, >80% land). The visible coast
 * is rendered by the existing global GSHHG atlas, independently of hex edges.
 * Separate from Panama and all central World Campaign registration. */
(function(root){
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  const ID='cf-central-america',KEY='centralAmerica',SIDES=['cf','britannia'];
  const COLS=184,ROWS=168,BOUNDS={west:-94.4,east:-81.4,north:18.7,south:7.45};
  const SPAN_X=BOUNDS.east-BOUNDS.west,SPAN_Y=BOUNDS.north-BOUNDS.south;
  const MID_X=(BOUNDS.east+BOUNDS.west)/2,MID_Y=(BOUNDS.north+BOUNDS.south)/2;
  const K=Math.cos(MID_Y*Math.PI/180);
  // Exact centre-sampled alignment with the existing geographic painter's
  // generic regional transform (without modifying shared UI/geography.js).
  const PROJECTION={centerLon:MID_X,centerLat:MID_Y,angle:0,
    uMin:-SPAN_X*K*(COLS-1)/(2*COLS),
    uMax: SPAN_X*K*(COLS-1)/(2*COLS),
    vMin:-SPAN_Y*(ROWS-1)/(2*ROWS),
    vMax: SPAN_Y*(ROWS-1)/(2*ROWS)};
  // 0: open water; 1: 20–80% mixed shoreline; 2: mostly land.
  // Reproducible from GSHHS intermediate resolution, including lake holes,
  // using 43 stratified samples per centre-staggered tactical hex.
  const SHORE_RLE='8PHOAHM--CBDBIB88888SEaES--CBDBL88888VBaHPB--FGLB88888MBpED--IBGEFB8888wBOE---IBMBF8888nH---gBCEDE8888hK---yGC8888VH----CGB8888S----OGC8888S----LBDB8888V----LBDB8888V----IBDB8888Y----IB8888h----I8888k----IB8888h----FB8888k----FB8888k----FB8888k----I8888k----FB8888k----FB8888k----F8888naE---j8888nUBFH---d8888nmB---d8888k---H-8888k----I8888k----FB8888k----FB8888k----F8888n----F8888n----C8888q----C8888q----8YB888P-CB--48PH888S-B--1B8ME888b-H--sE8888w7EFE--gB88888B-HA--dB88888D4HCH--U88888PE1EFAB--LB85BCEYB88w-CE--IJEeB8HLBPLB88w-B--LEGEPBLBDBqBdBg88q---RBAIBGERBIHGHFE-FEL88eB---CEFBOBA--mB88bB--7B---O88h--vK---RB88bB--mBJ---UE88eB--gBGB---RBDB88bB--gB---dAEDB88bB------IBDE88SB------LABIB88SB------XB88PB------XB88VB------UB88SB------XB88V------OBC88YB------IE88h------FE88hBvD-----OB88n------FB88kB------C88t------C88qB------88wB-----4B88wB-----1885-----y885B-----s888DB-----m888J-----dB888SB-----UB888bc----sB8888AE----jB8888GB----g8888SB----X8888Y----RB8888bB----O8888eK----B88882B-B--sB88885ByAHCE--j88888GBsBDBA--mB88888GQXBJB--m88888YBATPB--jB888888DE--g888888AED--j888882BFBAB--gB888885LB--j888885B--sB888888AB--jAB888888DB--gB888888JB--gB888888JB--XE888888PBjB-pBABC888888PBaBAB-pBAF888888VRBJB-pAE888888YOBJBA-mB888888kUBDB-m888888kBRH-m888888qBjE-UB888888nBdBGE-LB888888tBdMB-IB888888tBaBP-FB8888882aBSB-AB888888wBXYB-8888885UBb-8888882BRBb7B8888888BOBbB1B8888888AOBbBy8888888JBLhBpB8888888MLhpB8888888VIBeBm8888888VBIBbBjB8888888YBLEVmB8888888VBUEJBmB8888888YEdEp8888888SBAB-RB8888888PB-dB8888888MB-aB8888888SB-X8888888S-a8888888SB-XB8888888MB-aB8888888JB-gB8888888GB-gB8888888G-mB8888888AB-p8888888DXB-RB8888888XAE-LB8888888AXGB-L8888888BUBDB-LB8888888BXBGB-I8888885EXBDB-IB8888888GBOBDB-IB8888888DBLBJ-IB8888888JIJB-OB8888888DEMB-RE8888888ABPB-UB8888888bE-LB8888888hB-LB8888888eB-FB8888888qB-B8888888q-8888888wB-BGE8888888b7BJE8888888eB4PCB8888888Y-EACBCB8888888YB-U8888888VB-UB8888888SB-d8888888JIBA-RB8888888JLBDE-I8888888JBLBAB-IB8888888MBLBAB-I8888888SECDB-FB8888888hB-I8888888kBFBGBABABgB8888888qCYKX8888888qBnELB8888888qEqBL8888888qBtBIB88888888kI88888888hBFB88888888kBF88888888kBCB88888888qB88888888bB88888888nBCB88888888kFM';
  function shoreMask(){
    const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const out=new Uint8Array(COLS*ROWS);let i=0;
    for(const symbol of SHORE_RLE){
      const x=abc.indexOf(symbol);
      if(x<0)throw Error('Invalid Central America shoreline code');
      const n=Math.floor(x/3)+1;
      if(i+n>out.length)throw Error('Central America shoreline overrun');
      out.fill(x%3,i,i+n);i+=n;
    }
    if(i!==out.length)throw Error('Truncated Central America shoreline '+i);
    return out;
  }
  // City names and WGS84 coordinates. All cities (including ports) start
  // Britannian. The Chinese have no cities, even on their Panama staging edge.
  const CITY_COORDS=[
    ['San José',-84.090,9.932,3,1],['Cartago',-83.919,9.864,2,1],
    ['Heredia',-84.118,10.003,2,0],['Alajuela',-84.215,10.018,2,1],
    ['Liberia',-85.438,10.631,3,1],['Nicoya',-85.452,10.147,2,0],
    ['Puntarenas',-84.833,9.977,3,1],['Quepos',-84.161,9.431,2,1],
    ['Pérez Zeledón',-83.704,9.373,2,1],['Golfito',-83.164,8.641,2,1],
    ['Ciudad Quesada',-84.429,10.325,2,1],['Limón',-83.033,9.991,3,1],
    ['Puerto Viejo',-82.753,9.658,2,1],['Guápiles',-83.784,10.216,2,0],
    ['Cañas',-85.087,10.429,2,1],['La Cruz',-85.585,11.213,2,1],
    ['Managua',-86.270,12.136,3,1],['León',-86.878,12.437,3,1],
    ['Granada',-85.957,11.934,3,1],['Masaya',-86.094,11.975,2,1],
    ['Chinandega',-87.128,12.629,2,1],['Corinto',-87.168,12.483,2,1],
    ['Estelí',-86.354,13.091,2,1],['Jinotega',-86.002,13.091,2,1],
    ['Matagalpa',-85.920,12.925,3,1],['Juigalpa',-85.373,12.089,2,1],
    ['San Carlos',-84.781,11.121,2,1],['Rivas',-85.826,11.438,2,1],
    ['San Juan del Sur',-85.870,11.251,2,1],
    ['Bluefields',-83.763,12.013,3,1],['Puerto Cabezas',-83.380,14.035,2,1],
    ['Ocotal',-86.473,13.632,2,1],['El Rama',-84.220,12.161,2,0],
    ['Tegucigalpa',-87.208,14.073,3,1],['Comayagua',-87.640,14.460,3,1],
    ['San Pedro Sula',-88.027,15.504,3,1],['Puerto Cortés',-87.955,15.828,3,1],
    ['La Ceiba',-86.793,15.783,3,1],['Tela',-87.462,15.775,2,1],
    ['Trujillo',-85.955,15.916,2,1],['Choluteca',-87.192,13.304,2,1],
    ['Danlí',-86.582,14.033,2,1],['Juticalpa',-86.219,14.669,2,1],
    ['Santa Rosa de Copán',-88.778,14.767,2,1],['Gracias',-88.582,14.586,2,1],
    ['El Progreso',-87.801,15.404,2,0],['Yoro',-87.127,15.138,2,0],
    ['San Salvador',-89.191,13.692,3,1],['Santa Ana',-89.559,13.995,3,1],
    ['San Miguel',-88.177,13.483,3,1],['Sonsonate',-89.724,13.718,2,1],
    ['Ahuachapán',-89.846,13.921,2,1],['La Libertad',-89.322,13.488,2,1],
    ['La Unión',-87.843,13.338,2,1],['Usulután',-88.447,13.347,2,1],
    ['Chalatenango',-88.936,14.041,2,1],
    ['Guatemala City',-90.506,14.634,3,1],
    ['Antigua Guatemala',-90.734,14.558,2,1],
    ['Quetzaltenango',-91.518,14.834,3,1],
    ['Puerto Barrios',-88.593,15.730,3,1],
    ['Escuintla',-90.786,14.300,3,1],
    ['Puerto San José',-90.823,13.927,2,1],
    ['Chiquimula',-89.543,14.797,2,1],
    ['Zacapa',-89.531,14.972,2,1],
    ['Cobán',-90.372,15.472,3,1],
    ['Huehuetenango',-91.469,15.319,2,1],
    ['Mazatenango',-91.503,14.533,2,0],
    ['Retalhuleu',-91.679,14.532,2,1],
    ['Morales',-88.829,15.482,2,1],
    ['Flores',-89.891,16.927,2,1],
    ['Poptún',-89.419,16.327,2,1],
    ['Sayaxché',-90.171,16.525,2,0],
    ['San Marcos',-91.794,14.966,2,1],
    ['Belize City',-88.197,17.499,3,1],
    ['Belmopan',-88.766,17.253,3,1],
    ['San Ignacio',-89.071,17.160,2,1],
    ['Orange Walk',-88.564,18.081,2,1],
    ['Corozal',-88.388,18.389,2,1],
    ['Dangriga',-88.232,16.969,2,1],
    ['Punta Gorda',-88.807,16.099,2,1],
    ['Independence',-88.360,16.525,2,1]
  ];
  const CITIES=CITY_COORDS.map(([n,x,y,t,f])=>[n,x,y,'britannia',t,!!f]);
  const PORTS={
    'Puntarenas':3,'Quepos':2,'Golfito':2,'Limón':3,'Puerto Viejo':2,
    'Corinto':3,'San Juan del Sur':2,'Bluefields':3,'Puerto Cabezas':2,
    'Puerto Cortés':3,'La Ceiba':3,'Tela':2,'Trujillo':2,
    'La Libertad':2,'La Unión':2,'Puerto San José':3,
    'Puerto Barrios':3,'Belize City':3,'Dangriga':2,'Punta Gorda':2,
    'Independence':2
  };
  // Orographic ridges and volcanic belts are geographic, not checkerboards.
  const HIGHLANDS=[
    [-83.63,9.34,.50,.61],[-84.00,9.61,.42,.48], // Talamanca
    [-84.43,10.04,.39,.39],[-85.18,10.50,.40,.38], // CR volcanoes
    [-85.93,12.09,.45,.55],[-86.49,12.53,.44,.48],
    [-85.86,13.23,.79,.78],[-86.73,14.02,.62,.71], // Segovias
    [-87.19,14.71,.72,.84],[-88.30,14.84,.72,.62], // Honduras
    [-89.37,14.35,.39,.53],[-90.57,14.71,.55,.51],
    [-91.27,14.91,.73,.67],[-91.63,15.44,.65,.66], // Sierra Madre
    [-90.47,15.65,.84,.62],[-89.13,15.53,.49,.45]  // Alta Verapaz / Izabal
  ];
  const FORESTS=[
    [-83.24,10.33,.60,.86],[-84.30,10.95,.62,.75],
    [-84.05,13.25,1.02,1.36],[-84.73,14.83,1.21,1.02], // Mosquitia
    [-89.74,16.52,1.48,1.06],[-88.75,17.58,.90,1.25],
    [-91.48,15.35,.92,.65],[-85.29,12.60,.90,.91]
  ];
  const PLAINS=[[-85.43,10.18,.46,.29],[-86.30,12.10,.49,.38],
    [-88.11,15.53,.80,.43],[-89.21,13.70,.77,.29],
    [-90.70,14.30,.75,.28],[-88.20,17.45,.80,.70]];
  const VOLCANOES=[
    ['Arenal',-84.703,10.463],['Poás',-84.233,10.199],
    ['Irazú',-83.852,9.979],['Rincón de la Vieja',-85.324,10.831],
    ['Concepción',-85.622,11.537],['Mombacho',-85.968,11.826],
    ['Masaya',-86.162,11.985],['Momotombo',-86.541,12.422],
    ['San Cristóbal',-87.004,12.704],['Conchagua',-87.844,13.276],
    ['Santa Ana',-89.631,13.853],['San Vicente',-88.836,13.595],
    ['Pacaya',-90.601,14.381],['Fuego',-90.880,14.473],
    ['Acatenango',-90.876,14.501],['Santa María',-91.552,14.756]
  ];
  // Lake outlines from GSHHS intermediate lake polygons, simplified at
  // 0.014 degrees while preserving the surveyed shores and lake islands.
  // The exact GSHHS water holes are already present in SHORE_RLE.
  const LAKES={
    Nicaragua:[[-85.77,12.113],[-85.642,12.036],[-85.582,12.044],[-85.435,11.866],[-85.415,11.885],[-85.358,11.876],[-85.187,11.751],[-85.05,11.572],[-84.901,11.43],[-84.892,11.369],[-84.851,11.337],[-84.864,11.311],[-84.836,11.311],[-84.79,11.27],[-84.765,11.105],[-84.78,11.072],[-84.901,11.025],[-84.992,11.069],[-85.251,11.101],[-85.293,11.132],[-85.476,11.181],[-85.55,11.239],[-85.626,11.249],[-85.735,11.352],[-85.775,11.413],[-85.791,11.498],[-85.842,11.59],[-85.866,11.594],[-85.844,11.604],[-85.86,11.692],[-85.868,11.656],[-85.914,11.711],[-85.884,11.755],[-85.882,11.807],[-85.926,11.881],[-85.911,11.897],[-85.894,11.876],[-85.897,11.9],[-85.937,11.951],[-85.874,12.09]],
    Managua:[[-86.277,12.49],[-86.27,12.42],[-86.224,12.382],[-86.197,12.275],[-86.134,12.339],[-86.099,12.331],[-86.089,12.267],[-86.117,12.174],[-86.316,12.162],[-86.319,12.191],[-86.287,12.218],[-86.311,12.287],[-86.374,12.28],[-86.412,12.24],[-86.572,12.312],[-86.598,12.349],[-86.587,12.423],[-86.557,12.395],[-86.495,12.388],[-86.443,12.448],[-86.348,12.471],[-86.32,12.498]],
    Izabal:[[-89.332,15.381],[-89.331,15.448],[-89.406,15.475],[-89.375,15.511],[-89.274,15.519],[-89.235,15.57],[-89.146,15.567],[-89.065,15.592],[-88.994,15.674],[-88.945,15.69],[-88.942,15.717],[-88.827,15.781],[-88.887,15.688],[-88.983,15.659],[-89.006,15.594],[-88.983,15.511],[-89.081,15.427],[-89.153,15.406],[-89.262,15.417],[-89.249,15.406],[-89.305,15.364]],
    Atitlan:[[-91.115,14.694],[-91.134,14.644],[-91.149,14.674],[-91.188,14.68],[-91.249,14.618],[-91.238,14.673],[-91.283,14.708],[-91.172,14.75]],
    PetenItza:[[-89.971,16.947],[-89.865,17.014],[-89.756,17.019],[-89.697,16.99],[-89.725,16.972],[-89.864,16.977],[-89.91,16.949],[-89.871,16.924]]
  };
  // Visible waterways and defensive crossing routes; minor rivers do not
  // become artificial sea corridors in the tactical movement graph.
  const RIVERS={
    SanJuan:[[-84.79,11.12],[-84.58,10.99],[-84.36,10.96],[-84.16,10.89],[-83.91,10.93],[-83.74,10.93]],
    Tempisque:[[-85.47,10.75],[-85.29,10.56],[-85.24,10.24],[-85.23,10.11]],
    Reventazon:[[-83.89,9.80],[-83.73,9.73],[-83.65,9.95],[-83.52,10.10],[-83.48,10.21]],
    Coco:[[-86.69,13.45],[-86.31,13.43],[-85.93,13.72],[-85.50,13.81],[-84.73,14.32],[-83.46,15.06]],
    Patuca:[[-86.23,14.75],[-85.57,15.04],[-85.19,15.32],[-84.74,15.80]],
    Ulua:[[-88.29,14.75],[-87.90,15.10],[-87.90,15.56],[-87.74,15.75]],
    Chamelecon:[[-88.87,15.03],[-88.37,15.18],[-88.15,15.47],[-87.96,15.80]],
    Lempa:[[-89.65,14.38],[-89.37,14.11],[-89.02,13.96],[-88.79,13.79],[-88.58,13.49],[-88.77,13.25]],
    Motagua:[[-90.90,15.24],[-90.23,15.11],[-89.71,15.06],[-89.15,15.37],[-88.68,15.74]],
    Usumacinta:[[-91.53,16.07],[-91.18,16.34],[-90.81,16.68],[-90.67,17.09]],
    Belize:[[-89.05,17.17],[-88.81,17.28],[-88.52,17.46],[-88.19,17.50]],
    Sarstoon:[[-89.21,15.88],[-88.95,15.96],[-88.73,15.91]]
  };
  const PASSES=[
    {name:'Paso Canoas Border',lon:-82.82,lat:8.55},
    {name:'Central Valley',lon:-84.30,lat:9.95},
    {name:'Peñas Blancas',lon:-85.62,lat:11.22},
    {name:'Nicaragua Northern Corridor',lon:-86.35,lat:13.48},
    {name:'El Espino',lon:-86.88,lat:13.44},
    {name:'Gulf of Fonseca',lon:-87.79,lat:13.30},
    {name:'CA-1 Highlands',lon:-89.05,lat:14.34},
    {name:'Motagua Valley',lon:-89.35,lat:15.33}
  ];
  const STAGING=[
    {name:'Pacific Corridor Army',lon:-82.82,lat:8.50,w:.44,h:.30,
      detachments:[['heavy',6,'xingke'],['assault',4,'honggu'],['rocket',4,'cao'],['medium',4,null]]},
    {name:'Central Highlands Army',lon:-82.62,lat:8.80,w:.39,h:.42,
      detachments:[['heavy',6,'xianglin'],['siege',3,'gaohai'],['rocket',4,'leifeng'],['assault',3,null]]},
    {name:'Caribbean Advance Army',lon:-82.38,lat:9.23,w:.40,h:.35,
      detachments:[['heavy',5,'meiling'],['assault',4,'ren'],['rocket',3,'chengzhong'],['medium',4,null]]},
    {name:'Federation Mobile Reserve',lon:-82.52,lat:8.58,w:.41,h:.32,
      detachments:[['super',2,'zhaohao'],['heavy',5,'lifeng'],['rocket',3,'huangqian'],['medium',3,null]]}
  ];
  // Each geographical defensive formation is an actual group of live units.
  // Northern and interior formations act as mobile reserves under scenario AI.
  const DEFENDERS=[
    ['San José','Capital Guard',[['heavy',5,'cornelia'],['rocket',3,'cecile'],['siege',2,null]]],
    ['Liberia','Guanacaste Defence',[['heavy',5,'guilford'],['medium',4,null]]],
    ['Puntarenas','Nicoya Shield',[['heavy',4,'darlton'],['rocket',3,null]]],
    ['Limón','Caribbean Coastal Guard',[['heavy',5,'jeremiah'],['rocket',3,null]]],
    ['Cartago','Talamanca Fortress',[['heavy',3,null],['siege',3,null]]],
    ['La Cruz','Northern Border Line',[['medium',4,null],['rocket',2,null]]],
    ['Managua','Managua Defence Army',[['heavy',6,'bismarck'],['rocket',4,null],['siege',3,null]]],
    ['León','Nicaraguan Pacific Defence',[['heavy',4,'gino'],['rocket',3,null]]],
    ['Granada','Nicaragua Lake Defence',[['heavy',4,null],['medium',3,null]]],
    ['Matagalpa','Central Mountain Guard',[['heavy',5,'oldrin'],['rocket',3,null]]],
    ['Estelí','Nicaraguan Northern Guard',[['heavy',4,null],['medium',3,null]]],
    ['Bluefields','Mosquito Coast Defence',[['heavy',4,'anya'],['rocket',3,null]]],
    ['Puerto Cabezas','Eastern Coastal Reserve',[['medium',4,null],['rocket',2,null]]],
    ['Tegucigalpa','Honduran Central Army',[['heavy',6,'suzaku'],['siege',3,null],['rocket',3,null]]],
    ['Comayagua','Honduran Mountain Reserve',[['heavy',5,'schneizel'],['rocket',3,null]]],
    ['San Pedro Sula','Sula Industrial Army',[['heavy',6,null],['rocket',3,null]]],
    ['La Ceiba','North Caribbean Defence',[['heavy',4,'villetta'],['medium',3,null]]],
    ['Puerto Cortés','Caribbean Naval Guard',[['heavy',3,null],['rocket',3,null]]],
    ['Choluteca','Fonseca Gate',[['heavy',4,null],['rocket',2,null]]],
    ['Santa Rosa de Copán','Western Honduras Reserve',[['heavy',5,'nonette'],['assault',3,null]]],
    ['San Salvador','Salvadoran Army',[['heavy',6,'marrybell'],['rocket',3,null],['siege',2,null]]],
    ['Santa Ana','Western Salvadoran Guard',[['heavy',4,null],['medium',3,null]]],
    ['San Miguel','Gulf Reserve',[['heavy',4,null],['rocket',3,null]]],
    ['Guatemala City','Northern Strategic Reserve',[['heavy',7,'charles'],['rocket',4,null],['siege',3,null]]],
    ['Quetzaltenango','Guatemalan Highland Army',[['heavy',5,'dorothea'],['rocket',3,null]]],
    ['Escuintla','Pacific Counterlanding Reserve',[['heavy',5,null],['assault',4,null]]],
    ['Puerto Barrios','Izabal Defence',[['heavy',4,null],['rocket',3,null]]],
    ['Cobán','Verapaz Mountain Army',[['heavy',5,null],['siege',3,null]]],
    ['Flores','Petén Strategic Reserve',[['heavy',5,null],['rocket',3,null]]],
    ['Belize City','Belize Coastal Army',[['heavy',5,null],['rocket',3,null]]],
    ['Belmopan','Belize Interior Reserve',[['heavy',5,null],['assault',3,null]]],
    ['Punta Gorda','Southern Belize Coast',[['medium',3,null],['rocket',2,null]]]
  ];
  // Carrier-led Pacific landings threaten the defenders' *rear*; none starts
  // on a continental city. Ships themselves remain in reachable ocean.
  const INVASIONS=[
    {name:'Nicoya Landing',lon:-88.95,lat:9.52,carriers:5,amphib:5,
      troops:[['heavy',3,'rakshata'],['assault',3,null],['rocket',2,null]]},
    {name:'Fonseca Flanking Force',lon:-89.40,lat:11.57,carriers:5,amphib:5,
      troops:[['heavy',4,'sawasaki'],['assault',2,null],['siege',2,null]]},
    {name:'Salvadoran Pacific Landing',lon:-90.97,lat:12.25,carriers:5,amphib:5,
      troops:[['heavy',4,null],['rocket',2,null],['medium',2,null]]},
    {name:'Guatemala Coastal Landing',lon:-92.93,lat:13.00,carriers:5,amphib:6,
      troops:[['heavy',4,null],['assault',3,null],['rocket',2,null]]}
  ];
  const DEFENSIVE_FLEETS=[
    ['Limón',-82.45,10.08,'carrier_battleship',2],
    ['Puerto Cortés',-87.23,16.14,'carrier_battleship',2],
    ['Belize City',-87.55,17.36,'carrier_battleship',2],
    ['Bluefields',-82.70,12.12,'portman_ii',3],
    ['La Ceiba',-86.15,16.08,'portman_ii',3],
    ['Puerto Barrios',-88.01,15.99,'portman_ii',3],
    ['Corinto',-87.55,11.88,'carrier_battleship',2],
    ['La Unión',-88.45,12.75,'portman_ii',3],
    ['Puerto San José',-91.24,13.26,'carrier_battleship',2],
    ['Puntarenas',-85.35,9.44,'portman_ii',3]
  ];
  const FUNDING={cf:{credits:1180,industry:660,science:105,sakuradite:65},
    britannia:{credits:1140,industry:655,science:102,sakuradite:63}};
  function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*SPAN_X/COLS,
    lat:BOUNDS.north-(r+.5)*SPAN_Y/ROWS};}
  function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,Math.round(
    (BOUNDS.north-lat)*ROWS/SPAN_Y-.5)));
    return {c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/SPAN_X-.5-.5*(r&1)))),r};}
  function density(p,areas){let best=0;
    for(const [x,y,w,h] of areas)best=Math.max(best,
      Math.exp(-1.6*(((p.lon-x)/w)**2+((p.lat-y)/h)**2)));
    return best;}
  function lineDistance(p,line){let best=Infinity;
    for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],
      dx=(b[0]-a[0])*K,dy=b[1]-a[1],
      t=Math.max(0,Math.min(1,((p.lon-a[0])*K*dx+(p.lat-a[1])*dy)/(dx*dx+dy*dy||1)));
      best=Math.min(best,Math.hypot((p.lon-a[0])*K-t*dx,p.lat-a[1]-t*dy));}
    return best;}
  function landscape(p){
    const hill=density(p,HIGHLANDS),wood=density(p,FORESTS),
      plain=density(p,PLAINS);
    if(hill>.53&&plain<.48)return 'mountain';
    if(hill>.24||wood>.42)return 'forest';
    return 'plains';
  }
  function nearest(g,origin,predicate,radius=17){
    let best=null,d=Infinity;
    for(let r=Math.max(0,origin.r-radius);r<=Math.min(ROWS-1,origin.r+radius);r++)
      for(let c=Math.max(0,origin.c-radius);c<=Math.min(COLS-1,origin.c+radius);c++){
        const t=E.tile(g,c,r);
        if(!t||!predicate(t))continue;
        const dist=E.distance(origin,t,g);
        if(dist<d){best=t;d=dist;}
      }
    return best;
  }
  function seaComponents(g){
    const ids=new Int16Array(g.tiles.length).fill(-1),sizes=[];
    for(let i=0;i<g.tiles.length;i++){
      if(ids[i]>=0||g.tiles[i].terrain!=='sea')continue;
      const id=sizes.length,queue=[g.tiles[i]];ids[i]=id;
      for(let k=0;k<queue.length;k++)for(const n of E.adjacent(g,queue[k])){
        const j=n.r*COLS+n.c;
        if(ids[j]>=0||n.terrain!=='sea')continue;
        ids[j]=id;queue.push(n);
      }
      sizes.push(queue.length);
    }
    const major=new Set(sizes.map((size,i)=>size>=200?i:-1));
    major.delete(-1);
    if(major.size<2)throw Error('Central America must have separate open Pacific and Caribbean seas');
    return t=>t.terrain==='sea'&&major.has(ids[t.r*COLS+t.c]);
  }
  function orderGroup(g,id,target){
    if(g.mode!=='scenario'||g.phase!==g.player)return {ok:false,reason:'Not your turn'};
    const gr=g.scenario.groups.find(v=>v.id===id&&v.side===g.player);
    if(!gr)return {ok:false,reason:'Unknown Army Group'};
    const goal=E.tile(g,target.c,target.r);
    if(!goal)return {ok:false,reason:'Outside operational theatre'};
    const ordered=new Set();let assigned=0,failed=0;
    for(const unitId of gr.units){
      let u=g.units.find(v=>v.id===unitId&&v.hp>0&&v.side===g.player);
      if(!u)u=g.units.find(v=>v.hp>0&&v.side===g.player&&
        (v.cargo||[]).some(p=>p.id===unitId&&p.hp>0));
      if(!u||ordered.has(u.id))continue;
      ordered.add(u.id);
      const naval=E.TYPES[u.type].naval==='ship';
      const dest=naval&&goal.terrain!=='sea'&&goal.terrain!=='coast'
        ?nearest(g,goal,t=>t.terrain==='sea',20):goal;
      if(!dest){failed++;continue;}
      const result=E.setGoto(g,u.id,dest.c,dest.r);
      if(result.ok)assigned++;else failed++;
    }
    if(assigned)gr.destination={c:goal.c,r:goal.r};
    return {ok:assigned>0,assigned,failed,reason:assigned?'':'No available formation could reach that hex'};
  }
  function create(player='cf',difficulty='normal',seed=201719){
    if(!SIDES.includes(player))throw Error('Unsupported Central American side: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,
      difficulty,mode:'scenario',era:'central-america',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{cf:0,britannia:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:null,factions:{},lineup:{}};
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:ID,key:KEY,title:'Central American Offensive',version:1,
      phase:'panama-to-guatemala-federation-offensive',aiDoctrine:'europe',
      bounds:BOUNDS,projection:PROJECTION,groups:[],funding:{},citylessFunding:['cf'],
      rivers:RIVERS,lakes:LAKES,volcanoes:VOLCANOES,mountainPasses:PASSES,
      reliefZones:HIGHLANDS,forestZones:FORESTS,valleyZones:PLAINS,
      operationalFronts:[
        {name:'Pacific Road Axis',attack:'cf',objective:'Liberia'},
        {name:'Talamanca Highland Passage',attack:'cf',objective:'San José'},
        {name:'Caribbean Lowlands',attack:'cf',objective:'Limón'},
        {name:'Nicoya Amphibious Flank',attack:'cf',objective:'Puntarenas'},
        {name:'Fonseca Double Envelopment',attack:'cf',objective:'La Unión'},
        {name:'Guatemalan Coastal Landing',attack:'cf',objective:'Escuintla'},
        {name:'Nicaraguan Bottleneck',attack:'britannia',objective:'Managua'},
        {name:'Honduran Mountain Defence',attack:'britannia',objective:'Tegucigalpa'},
        {name:'Northern Strategic Reserve',attack:'britannia',objective:'Guatemala City'}],
      reserveDoctrine:'mobile-counterattack'};
    const eligible=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
      eligible.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes(side))]));
    const mask=shoreMask();
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0;
      const kind=mask[i],p=geo(c,r);
      const terrain=kind===0?'sea':kind===1?'coast':landscape(p);
      const tile={c,r,owner:null,terrain};
      // River-valley approaches cost time but never become imaginary ocean.
      if(kind===2&&Object.values(RIVERS).some(line=>lineDistance(p,line)<.055))
        tile.terrain=terrain==='mountain'?'mountain':'forest';
      return tile;
    });
    const navigableSea=seaComponents(g);
    // Place harbours on their *actual* ocean side. Port towns may shift
    // slightly to the nearest land cell adjacent to valid navigable ocean,
    // but every station keeps its historical geodetic source coordinate.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      const needsPort=Object.prototype.hasOwnProperty.call(PORTS,name);
      const spot=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!needsPort||E.adjacent(g,t).some(n=>navigableSea(n)))&&
        !E.stationAt(g,t),15);
      if(!spot)throw Error('No geographic city site for '+name);
      const capital=name==='San José'||name==='Managua'||
        name==='Tegucigalpa'||name==='San Salvador'||
        name==='Guatemala City'||name==='Belmopan';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      g.stations.push({id:g.stations.length,name,c:spot.c,r:spot.r,
        owner,tier,capital,capitalOf:capital?owner:null,fort,
        gun:fort?name+' Defence Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,income:capital?45:14+9*tier,
        industry:capital?24:5+7*tier,science:1+tier,producedTurn:0,
        geo:{lon,lat}});
    }
    const component=new Int16Array(g.tiles.length).fill(-1);let count=0;
    for(let i=0;i<g.tiles.length;i++){
      if(component[i]>=0||g.tiles[i].terrain==='sea')continue;
      const queue=[g.tiles[i]];component[i]=count;
      for(let k=0;k<queue.length;k++)for(const n of E.adjacent(g,queue[k])){
        const j=n.r*COLS+n.c;
        if(n.terrain==='sea'||component[j]>=0)continue;
        component[j]=count;queue.push(n);
      }
      count++;
    }
    const towns=new Map();
    for(const s of g.stations){
      const key=component[s.r*COLS+s.c];
      if(!towns.has(key))towns.set(key,[]);
      towns.get(key).push(s);
    }
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const eligibleTown=towns.get(component[t.r*COLS+t.c]);
      if(!eligibleTown?.length)continue; // Neutral unoccupied islets.
      let closest=null,dist=Infinity;
      for(const s of eligibleTown){
        const d=E.distance(t,s,g);
        if(d<dist){dist=d;closest=s;}
      }
      t.owner=closest.owner;t.provinceCity=closest.id;
    }
    // There are no Chinese city captures at turn 1. The southern Panama-side
    // border pockets are pre-conquered *tiles* only and are military staging
    // areas, not settlements: preserve every Costa Rican city's Britannian owner.
    for(const t of g.tiles)if(t.terrain!=='sea'&&!E.stationAt(g,t)){
      const p=geo(t.c,t.r);
      if(STAGING.some(s=>p.lat<9.46&&
        ((p.lon-s.lon)/s.w)**2+((p.lat-s.lat)/s.h)**2<=1))
        t.owner='cf';
    }
    const reservedPorts=new Set(),cityByName=new Map(g.stations.map(s=>[s.name,s]));
    for(const [name,level] of Object.entries(PORTS)){
      const city=cityByName.get(name);
      const candidates=E.adjacent(g,city).filter(t=>navigableSea(t)&&
        !reservedPorts.has(E.key(t))).sort((a,b)=>
          E.adjacent(g,b).filter(navigableSea).length-
          E.adjacent(g,a).filter(navigableSea).length);
      const port=candidates[0];
      if(!port)throw Error('Independent navigable harbour missing for '+name);
      city.portAt={c:port.c,r:port.r};city.portOwner=city.owner;
      city.portLevel=level;reservedPorts.add(E.key(port));
    }
    const groups=new Map();
    function group(side,name,origin){
      const key=side+':'+name;
      if(!groups.has(key)){
        const gr={id:'army-'+groups.size,side,name,origin:origin||name,units:[]};
        groups.set(key,gr);g.scenario.groups.push(gr);
      }
      return groups.get(key);
    }
    function deploy(side,origin,name,cls,n,commander){
      const gr=group(side,name,typeof origin==='string'?origin:name);
      const pos=typeof origin==='string'?cityByName.get(origin):locate(origin.lon,origin.lat);
      if(!pos)throw Error('Missing staging anchor '+name);
      for(let i=0;i<n;i++){
        const at=nearest(g,pos,t=>t.terrain!=='sea'&&t.owner===side&&
          !E.unitAt(g,t)&&!E.stationAt(g,t),side==='cf'?21:16);
        if(!at)throw Error('Insufficient land positions for '+name);
        const cmd=i===0?commander:null;
        if(cmd&&!E.COMMANDERS[cmd])throw Error('Unknown commander '+cmd);
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,i===0?3:2,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        u.armyGroup=name;
        gr.units.push(u.id);
      }
    }
    for(const s of STAGING)for(const [cls,n,cmd] of s.detachments)
      deploy('cf',s,s.name,cls,n,cmd);
    for(const [city,name,formations] of DEFENDERS)
      for(const [cls,n,cmd] of formations)
        deploy('britannia',city,name,cls,n,cmd);
    const embarked=[],ships=new Map();
    function fleet(side,name,origin,point,type,n,invasionTag=null){
      if(!E.TYPES[type]||!E.TYPES[type].naval)throw Error('Unknown fleet type '+type);
      const gr=group(side,name,origin);
      for(let i=0;i<n;i++){
        const water=nearest(g,point,t=>navigableSea(t)&&!E.unitAt(g,t)&&
          !reservedPorts.has(E.key(t)),24);
        if(!water)throw Error('No open-sea position for '+name);
        const u=E.newUnit(g,type,side,water.c,water.r);
        if(invasionTag)u.invasionGroup=invasionTag;
        gr.units.push(u.id);
        if(invasionTag&&E.TYPES[type].capacity>0){
          if(!ships.has(invasionTag))ships.set(invasionTag,[]);
          ships.get(invasionTag).push(u);
        }
      }
    }
    for(const f of INVASIONS){
      const water=locate(f.lon,f.lat);
      fleet('cf',f.name+' Carrier Fleet',f.name,water,'cf_carrier',f.carriers,f.name);
      fleet('cf',f.name+' Amphibious Fleet',f.name,water,'shui_gun_ru_ii',f.amphib,f.name);
    }
    // Defensive fleets are seaworthy in both the Pacific and Caribbean and
    // do not occupy the independently capturable port-hex tiles.
    for(const [name,lon,lat,type,n] of DEFENSIVE_FLEETS)
      fleet('britannia',name+' Interception Squadron',name,locate(lon,lat),type,n);
    for(const f of INVASIONS)
      for(const [cls,n,commander] of f.troops)
        for(let i=0;i<n;i++){
          const ship=(ships.get(f.name)||[]).find(u=>
            (u.pendingPassengers||0)<E.TYPES[u.type].capacity);
          if(!ship)throw Error('Insufficient expeditionary transport capacity in '+f.name);
          ship.pendingPassengers=(ship.pendingPassengers||0)+1;
          const cmd=i===0?commander:null;
          const u=E.newUnit(g,E.typeFor('cf',cls,g),'cf',
            ship.c,ship.r,i===0?3:2,cmd);
          if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
          u.armyGroup=f.name+' Landing Army';
          group('cf',f.name+' Landing Army',f.name).units.push(u.id);
          embarked.push({ship,u});
        }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const {ship,u} of embarked){
      (ship.cargo||=[]).push(u);
      g.units.splice(g.units.indexOf(u),1);
    }
    for(const ship of g.units)delete ship.pendingPassengers;
    for(const side of SIDES){
      const income=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([k,v])=>[k,Math.round(v)-income[k]]));
      const actual=E.income(g,side);
      for(const kind of Object.keys(FUNDING[side]))
        g.economy[side][kind]={"cf":{"credits":2000,"industry":500,"science":315,"sakuradite":195},"britannia":{"credits":2000,"industry":500,"science":204,"sakuradite":126}}[side][kind];
    }
    if(difficulty==='hard'||difficulty==='challenge'){
      const enemies=g.units.flatMap(u=>[u,...(u.cargo||[])])
        .filter(u=>u.side!==player&&E.TYPES[u.type].naval!=='ship');
      enemies.forEach(u=>E.addDifficultyFrames(u,difficulty));
    }
    E.applyScenarioDifficulty(g,difficulty);
    g.startUnits=Object.fromEntries(SIDES.map(side=>[side,
      g.units.reduce((total,u)=>total+(u.side===side?1:0)+
        (u.cargo||[]).filter(c=>c.side===side).length,0)]));
    E.log(g,'Following Panama, the Chinese Federation advances north through three land corridors and four Pacific amphibious flanks. Britannia defends every city. Victory requires complete conquest.',player);
    return g;
  }
  function onTurn(){return false;} // Established regional AI governs both factions.
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((sum,s)=>sum+s.tier,0);
  }
  function objective(g,side=g.player){
    return 'Capture every Central American city ('+
      g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+
      ' controlled). No turn limit.';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
    // Britannia initially owns *all* 81 cities. It must not win on turn one:
    // repel the invasion, including land troops already embarked as cargo.
    if(g.stations.every(s=>s.owner==='cf'))
      return {winner:'cf',team:'cf',reason:
        'The Federation has conquered every Central American city.'};
    if(g.stations.every(s=>s.owner==='britannia')&&
      !E.allUnits(g).some(u=>u.side==='cf'&&u.hp>0))
      return {winner:'britannia',team:'britannia',reason:
        'Britannia has eliminated every Chinese expeditionary formation.'};
    return null;
  }
  const api={id:ID,title:'Central American Offensive',sides:SIDES,cols:COLS,rows:ROWS,
    bounds:BOUNDS,projection:PROJECTION,cityData:CITIES,ports:PORTS,
    staging:STAGING,defense:DEFENDERS,invasions:INVASIONS,
    lakes:LAKES,rivers:RIVERS,volcanoes:VOLCANOES,mountainPasses:PASSES,
    create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={terrainCosts:{mountain:2},elite:true,expeditionSide:'cf',
    text:{terrain:'Mountains cost 2 movement; plains and marked passes cost 1. Float units ignore the extra terrain cost.',
      era:"Central America · Federation World Campaign",
      intro:"The Federation advances north from Panama through Costa Rica to Guatemala, supported by Pacific fleets. Capture all 81 cities.",
      diplomacy:"Mountain corridors, rivers, jungle and Pacific amphibious landings shape the invasion; all ports are independently capturable.",
      elite:"Standard Elite preparation and ongoing recruitment, using the proper Federation and Britannian rosters.",
      focus:{
        cf:"",
        britannia:"San José"
      }
    },
    blurbs:{
      cf:"Advance north from Panama through three great land corridors, supported by Pacific amphibious landings.",
      britannia:"Hold Costa Rica through Guatemala with mountain defenses and fleet interception."
    }};
  E.scenarios={...(E.scenarios||{}),[KEY]:api,
    byId:{...(E.scenarios?.byId||{}),[ID]:api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

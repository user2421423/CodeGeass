/* Chinese Federation vs E.U. — Conquest of Central Europe.
 * Standalone geographic theatre: five defending countries and Russian/Balkan
 * staging. National boundary rings from johan/world.geo.json (Natural Earth).
 * German territory is strictly offmap; original European War is untouched.
 * Independent, capturable Baltic port hexes; no arbitrary turn clock. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const ID='cf-eu-central-europe',KEY='cfEuCentralEurope',SIDES=['cf','eu'],COLS=156,ROWS=100;
const BOUNDS={west:9.2,east:28.0,north:56.15,south:44.55};
const PROJECTION={centerLon:18.6,centerLat:50.35,angle:0,uMin:-9.4*Math.cos(50.35*Math.PI/180),uMax:9.4*Math.cos(50.35*Math.PI/180),vMin:-5.8,vMax:5.8};
const COUNTRY_POLYGONS={"POL":[[[[15.017,51.1067],[14.6071,51.7452],[14.685,52.0899],[14.4376,52.6249],[14.0745,52.9813],[14.3533,53.2482],[14.1197,53.757],[14.8029,54.0507],[16.3635,54.5132],[17.6228,54.8515],[18.6209,54.6826],[18.6963,54.4387],[19.6606,54.4261],[20.8922,54.3125],[22.7311,54.3275],[23.244,54.2206],[23.4841,53.9125],[23.5275,53.4701],[23.8049,53.0897],[23.7992,52.6911],[23.1995,52.487],[23.508,52.0236],[23.5271,51.5785],[24.03,50.7054],[23.9228,50.4249],[23.4265,50.3085],[22.5185,49.4768],[22.7764,49.0274],[22.5581,49.0857],[21.6078,49.4701],[20.888,49.3288],[20.4158,49.4315],[19.825,49.2171],[19.3207,49.5716],[18.9096,49.4358],[18.8531,49.4962],[18.3929,49.9886],[17.6494,50.049],[17.5546,50.3621],[16.8688,50.474],[16.7195,50.2157],[16.1763,50.4226],[16.2386,50.6977],[15.491,50.7847],[15.017,51.1067]]]],"CZE":[[[[16.9603,48.597],[16.4993,48.7858],[16.0296,48.7339],[15.2534,49.0391],[14.9014,48.9644],[14.3389,48.5553],[13.5959,48.8772],[13.0313,49.3071],[12.521,49.5474],[12.4152,49.9691],[12.2401,50.2663],[12.9668,50.4841],[13.3381,50.7332],[14.0562,50.9269],[14.307,51.1173],[14.5707,51.0023],[15.017,51.1067],[15.491,50.7847],[16.2386,50.6977],[16.1763,50.4226],[16.7195,50.2157],[16.8688,50.474],[17.5546,50.3621],[17.6494,50.049],[18.3929,49.9886],[18.8531,49.4962],[18.555,49.495],[18.4,49.315],[18.1705,49.2715],[18.105,49.044],[17.9135,48.9965],[17.8865,48.9035],[17.545,48.8],[17.102,48.817],[16.9603,48.597]]]],"SVK":[[[[18.8531,49.4962],[18.9096,49.4358],[19.3207,49.5716],[19.825,49.2171],[20.4158,49.4315],[20.888,49.3288],[21.6078,49.4701],[22.5581,49.0857],[22.2808,48.8254],[22.0856,48.4223],[21.8722,48.32],[20.8013,48.6239],[20.4736,48.5628],[20.2391,48.3276],[19.7695,48.2027],[19.6614,48.2666],[19.1744,48.1114],[18.777,48.0818],[18.6965,47.881],[17.8571,47.7584],[17.4885,47.8675],[16.9797,48.1235],[16.88,48.47],[16.9603,48.597],[17.102,48.817],[17.545,48.8],[17.8865,48.9035],[17.9135,48.9965],[18.105,49.044],[18.1705,49.2715],[18.4,49.315],[18.555,49.495],[18.8531,49.4962]]]],"HUN":[[[[16.2023,46.8524],[16.5343,47.4962],[16.3406,47.7129],[16.9038,47.7149],[16.9797,48.1235],[17.4885,47.8675],[17.8571,47.7584],[18.6965,47.881],[18.777,48.0818],[19.1744,48.1114],[19.6614,48.2666],[19.7695,48.2027],[20.2391,48.3276],[20.4736,48.5628],[20.8013,48.6239],[21.8722,48.32],[22.0856,48.4223],[22.6408,48.1502],[22.7105,47.8822],[22.0998,47.6724],[21.6265,46.9942],[21.022,46.3161],[20.2202,46.1275],[19.596,46.1717],[18.8298,45.9089],[18.4561,45.7595],[17.6301,45.9518],[16.8825,46.3806],[16.5648,46.5038],[16.3705,46.8413],[16.2023,46.8524]]]],"AUT":[[[[16.9797,48.1235],[16.9038,47.7149],[16.3406,47.7129],[16.5343,47.4962],[16.2023,46.8524],[16.0117,46.6836],[15.1371,46.6587],[14.6325,46.4318],[13.8065,46.5093],[12.3765,46.7676],[12.1531,47.1154],[11.1648,46.9416],[11.0486,46.7514],[10.4427,46.8935],[9.9324,46.9207],[9.48,47.1028],[9.6329,47.3476],[9.5942,47.5251],[9.8961,47.5802],[10.4021,47.3025],[10.5445,47.5664],[11.4264,47.5238],[12.1414,47.7031],[12.6208,47.6724],[12.9326,47.4676],[13.0259,47.6376],[12.8841,48.2891],[13.2434,48.4161],[13.5959,48.8772],[14.3389,48.5553],[14.9014,48.9644],[15.2534,49.0391],[16.0296,48.7339],[16.4993,48.7858],[16.9603,48.597],[16.88,48.47],[16.9797,48.1235]]]],"BLR":[[[[23.4841,53.9125],[24.4507,53.9057],[25.5364,54.2824],[25.7684,54.847],[26.5883,55.1672],[26.4943,55.6151],[27.1025,55.7833],[28.1767,56.1691],[29.2295,55.9183],[29.3716,55.6701],[29.8963,55.7895],[30.8739,55.551],[30.9718,55.0815],[30.7575,54.8118],[31.3845,54.1571],[31.7914,53.9746],[31.7313,53.794],[32.4056,53.618],[32.6936,53.3514],[32.3045,53.1327],[31.4976,53.1674],[31.3052,53.074],[31.54,52.7421],[31.786,52.1017],[30.9275,52.0424],[30.6195,51.8228],[30.5551,51.3195],[30.1574,51.4161],[29.2549,51.3682],[28.9928,51.602],[28.6176,51.4277],[28.2416,51.5722],[27.4541,51.5923],[26.338,51.8323],[25.3278,51.9107],[24.5531,51.8885],[24.0051,51.6174],[23.5271,51.5785],[23.508,52.0236],[23.1995,52.487],[23.7992,52.6911],[23.8049,53.0897],[23.5275,53.4701],[23.4841,53.9125]]]],"UKR":[[[[31.786,52.1017],[32.1594,52.0613],[32.4121,52.2887],[32.7158,52.2385],[33.7527,52.3351],[34.3917,51.7689],[34.142,51.5664],[34.2248,51.256],[35.0222,51.2076],[35.3779,50.774],[35.3561,50.5772],[36.6262,50.2256],[37.3935,50.384],[38.0106,49.9157],[38.595,49.9265],[40.0691,49.6011],[40.0808,49.3074],[39.6747,48.7838],[39.8956,48.2324],[39.7383,47.8989],[38.7706,47.8256],[38.2551,47.5464],[38.2235,47.1022],[37.4251,47.0222],[36.7599,46.6987],[35.8237,46.646],[34.9623,46.2732],[35.0208,45.6512],[35.51,45.41],[36.53,45.47],[36.3347,45.1132],[35.24,44.94],[33.8825,44.3615],[33.3264,44.5649],[33.5469,45.0348],[32.4542,45.3275],[32.6308,45.5192],[33.5882,45.8516],[33.2986,46.0806],[31.7441,46.3333],[31.6753,46.7062],[30.7487,46.5831],[30.3776,46.0324],[29.6033,45.2933],[29.1497,45.4649],[28.6798,45.304],[28.2336,45.4883],[28.4853,45.5969],[28.66,45.94],[28.9337,46.2588],[28.863,46.4379],[29.0721,46.5177],[29.1707,46.3793],[29.76,46.35],[30.0247,46.4239],[29.8382,46.5253],[29.9089,46.6744],[29.5597,46.9286],[29.4151,47.3466],[29.0509,47.5102],[29.1227,47.8491],[28.6709,48.1181],[28.2595,48.1556],[27.5225,48.4671],[26.8578,48.3682],[26.6193,48.2207],[26.1974,48.2209],[25.9459,47.9871],[25.2077,47.8911],[24.8663,47.7375],[24.4021,47.9819],[23.761,47.9856],[23.1422,48.0963],[22.7105,47.8822],[22.6408,48.1502],[22.0856,48.4223],[22.2808,48.8254],[22.5581,49.0857],[22.7764,49.0274],[22.5185,49.4768],[23.4265,50.3085],[23.9228,50.4249],[24.03,50.7054],[23.5271,51.5785],[24.0051,51.6174],[24.5531,51.8885],[25.3278,51.9107],[26.338,51.8323],[27.4541,51.5923],[28.2416,51.5722],[28.6176,51.4277],[28.9928,51.602],[29.2549,51.3682],[30.1574,51.4161],[30.5551,51.3195],[30.6195,51.8228],[30.9275,52.0424],[31.786,52.1017]]]],"ROU":[[[[22.7105,47.8822],[23.1422,48.0963],[23.761,47.9856],[24.4021,47.9819],[24.8663,47.7375],[25.2077,47.8911],[25.9459,47.9871],[26.1974,48.2209],[26.6193,48.2207],[26.9242,48.1233],[27.2339,47.8268],[27.5512,47.4051],[28.128,46.8105],[28.16,46.3716],[28.0544,45.9446],[28.2336,45.4883],[28.6798,45.304],[29.1497,45.4649],[29.6033,45.2933],[29.6265,45.0354],[29.1416,44.8202],[28.8379,44.9139],[28.5581,43.7075],[27.9701,43.8125],[27.2424,44.176],[26.0652,43.9435],[25.5693,43.6884],[24.1007,43.7411],[23.3323,43.897],[22.9448,43.8238],[22.6572,44.2349],[22.474,44.4092],[22.7057,44.578],[22.459,44.7025],[22.1451,44.4784],[21.562,44.7689],[21.4835,45.1812],[20.8743,45.4164],[20.7622,45.7346],[20.2202,46.1275],[21.022,46.3161],[21.6265,46.9942],[22.0998,47.6724],[22.7105,47.8822]]]],"SRB":[[[[20.8743,45.4164],[21.4835,45.1812],[21.562,44.7689],[22.1451,44.4784],[22.459,44.7025],[22.7057,44.578],[22.474,44.4092],[22.6572,44.2349],[22.4104,44.0081],[22.5002,43.6428],[22.986,43.2112],[22.6048,42.8985],[22.4366,42.5803],[22.545,42.4614],[22.3805,42.3203],[21.9171,42.3036],[21.5766,42.2452],[21.5433,42.3203],[21.6629,42.4392],[21.7751,42.6827],[21.633,42.6772],[21.4387,42.8625],[21.2742,42.9096],[21.1434,43.0687],[20.9565,43.1309],[20.8145,43.2721],[20.6351,43.2167],[20.4968,42.8847],[20.2576,42.8128],[20.3398,42.8985],[19.9586,43.106],[19.63,43.2138],[19.4839,43.3523],[19.2185,43.5238],[19.454,43.5681],[19.5998,44.0385],[19.1176,44.4231],[19.368,44.863],[19.0055,44.8602],[19.3905,45.2365],[19.0728,45.5215],[18.8298,45.9089],[19.596,46.1717],[20.2202,46.1275],[20.7622,45.7346],[20.8743,45.4164]]]],"HRV":[[[[18.8298,45.9089],[19.0728,45.5215],[19.3905,45.2365],[19.0055,44.8602],[18.5532,45.0816],[17.8618,45.0677],[17.0021,45.2338],[16.5349,45.2116],[16.3182,45.0041],[15.9594,45.2338],[15.75,44.8187],[16.2397,44.3511],[16.4564,44.0412],[16.9162,43.6677],[17.2974,43.4463],[17.6749,43.0286],[18.56,42.65],[18.45,42.48],[17.51,42.85],[16.93,43.21],[16.0154,43.5072],[15.1745,44.2432],[15.3763,44.3179],[14.9203,44.7385],[14.9016,45.0761],[14.2587,45.2338],[13.9523,44.8021],[13.657,45.1369],[13.6794,45.4841],[13.7151,45.5003],[14.412,45.4662],[14.5951,45.6349],[14.9352,45.4717],[15.3277,45.4523],[15.324,45.7318],[15.6715,45.8342],[15.7687,46.2381],[16.5648,46.5038],[16.8825,46.3806],[17.6301,45.9518],[18.4561,45.7595],[18.8298,45.9089]]]],"SVN":[[[[13.8065,46.5093],[14.6325,46.4318],[15.1371,46.6587],[16.0117,46.6836],[16.2023,46.8524],[16.3705,46.8413],[16.5648,46.5038],[15.7687,46.2381],[15.6715,45.8342],[15.324,45.7318],[15.3277,45.4523],[14.9352,45.4717],[14.5951,45.6349],[14.412,45.4662],[13.7151,45.5003],[13.9376,45.591],[13.6981,46.0168],[13.8065,46.5093]]]],"LTU":[[[[22.7311,54.3275],[22.6511,54.5827],[22.7578,54.8566],[22.3157,55.0153],[21.2684,55.1905],[21.0558,56.0311],[22.2012,56.3378],[23.8783,56.2737],[24.8607,56.3725],[25.0009,56.1645],[25.533,56.1003],[26.4943,55.6151],[26.5883,55.1672],[25.7684,54.847],[25.5364,54.2824],[24.4507,53.9057],[23.4841,53.9125],[23.244,54.2206],[22.7311,54.3275]]]],"RUS":[[[[22.7311,54.3275],[20.8922,54.3125],[19.6606,54.4261],[19.8885,54.8662],[21.2684,55.1905],[22.3157,55.0153],[22.7578,54.8566],[22.6511,54.5827],[22.7311,54.3275]]]]};
const CITIES=[["Warsaw",21.0122,52.2297,"eu",3,1],["Krakow",19.945,50.065,"eu",3,1],["Lodz",19.455,51.759,"eu",3,1],["Wroclaw",17.0385,51.108,"eu",3,1],["Poznan",16.925,52.407,"eu",3,1],["Gdansk",18.646,54.352,"eu",3,1],["Gdynia",18.531,54.518,"eu",3,1],["Szczecin",14.552,53.429,"eu",3,1],["Katowice",19.022,50.264,"eu",3,1],["Lublin",22.568,51.246,"eu",3,1],["Rzeszow",22.004,50.042,"eu",2,1],["Bialystok",23.164,53.133,"eu",2,1],["Olsztyn",20.495,53.779,"eu",2,0],["Torun",18.604,53.013,"eu",2,1],["Bydgoszcz",18.004,53.123,"eu",2,0],["Opole",17.929,50.675,"eu",2,1],["Gliwice",18.672,50.294,"eu",2,1],["Kielce",20.628,50.867,"eu",2,0],["Radom",21.157,51.403,"eu",2,0],["Siedlce",22.29,52.168,"eu",2,1],["Zamosc",23.253,50.723,"eu",2,0],["Koszalin",16.172,54.195,"eu",2,0],["Swinoujscie",14.247,53.911,"eu",2,1],["Kolobrzeg",15.579,54.176,"eu",2,0],["Legnica",16.162,51.21,"eu",2,0],["Walbrzych",16.285,50.771,"eu",2,1],["Nowy Sacz",20.7,49.62,"eu",2,1],["Przemysl",22.767,49.784,"eu",2,1],["Suwalki",22.93,54.112,"eu",2,1],["Elk",22.361,53.828,"eu",2,0],["Prague",14.42,50.075,"eu",3,1],["Brno",16.6068,49.1951,"eu",3,1],["Ostrava",18.2625,49.8209,"eu",3,1],["Plzen",13.378,49.747,"eu",2,1],["Liberec",15.057,50.768,"eu",2,1],["Usti nad Labem",14.032,50.66,"eu",2,1],["Olomouc",17.252,49.593,"eu",2,1],["Ceske Budejovice",14.475,48.975,"eu",2,0],["Hradec Kralove",15.832,50.21,"eu",2,0],["Zlin",17.67,49.226,"eu",2,1],["Jihlava",15.59,49.396,"eu",2,0],["Karlovy Vary",12.871,50.231,"eu",2,1],["Pardubice",15.782,50.034,"eu",2,0],["Bratislava",17.108,48.148,"eu",3,1],["Kosice",21.257,48.716,"eu",3,1],["Presov",21.24,48.998,"eu",2,1],["Zilina",18.739,49.224,"eu",2,1],["Nitra",18.087,48.307,"eu",2,0],["Trnava",17.587,48.377,"eu",2,0],["Banska Bystrica",19.146,48.736,"eu",2,1],["Trencin",18.039,48.895,"eu",2,1],["Poprad",20.299,49.059,"eu",2,1],["Zvolen",19.155,48.577,"eu",2,0],["Michalovce",21.917,48.756,"eu",2,1],["Budapest",19.041,47.498,"eu",3,1],["Debrecen",21.628,47.531,"eu",3,1],["Miskolc",20.786,48.103,"eu",3,1],["Szeged",20.148,46.253,"eu",2,1],["Pecs",18.233,46.072,"eu",3,1],["Gyor",17.638,47.687,"eu",2,1],["Nyiregyhaza",21.727,47.954,"eu",2,1],["Kecskemet",19.691,46.907,"eu",2,0],["Szekesfehervar",18.408,47.187,"eu",2,0],["Szolnok",20.193,47.174,"eu",2,1],["Szombathely",16.622,47.231,"eu",2,1],["Eger",20.379,47.902,"eu",2,1],["Sopron",16.584,47.686,"eu",2,1],["Veszprem",17.911,47.093,"eu",2,0],["Vienna",16.3738,48.2082,"eu",3,1],["Graz",15.4395,47.0707,"eu",3,1],["Linz",14.2858,48.3069,"eu",3,1],["Salzburg",13.045,47.798,"eu",2,1],["Innsbruck",11.404,47.269,"eu",2,1],["Klagenfurt",14.307,46.623,"eu",2,1],["St Polten",15.625,48.205,"eu",2,1],["Wiener Neustadt",16.245,47.816,"eu",2,1],["Eisenstadt",16.523,47.845,"eu",2,0],["Villach",13.85,46.61,"eu",2,1],["Wels",14.028,48.157,"eu",2,0],["Bregenz",9.747,47.504,"eu",2,1],["Leoben",15.095,47.382,"eu",2,0],["Krems",15.603,48.41,"eu",2,1],["Kaliningrad",20.507,54.706,"cf",3,1],["Baltiysk",19.914,54.644,"cf",2,1],["Klaipeda",21.136,55.71,"cf",3,1],["Grodno",23.824,53.684,"cf",3,1],["Brest",23.687,52.098,"cf",3,1],["Lida",25.302,53.889,"cf",2,0],["Lutsk",25.325,50.748,"cf",3,1],["Lviv",24.032,49.839,"cf",3,1],["Uzhhorod",22.301,48.623,"cf",2,1],["Ivano-Frankivsk",24.711,48.922,"cf",2,1],["Chernivtsi",25.938,48.293,"cf",2,1],["Cluj-Napoca",23.595,46.772,"cf",3,1],["Oradea",21.918,47.072,"cf",3,1],["Timisoara",21.229,45.748,"cf",3,1],["Novi Sad",19.833,45.267,"cf",3,1],["Belgrade",20.448,44.787,"cf",3,1],["Osijek",18.695,45.554,"cf",2,1],["Zagreb",15.981,45.815,"cf",3,1],["Maribor",15.646,46.555,"cf",2,1],["Ljubljana",14.506,46.056,"cf",3,1]];
const ARMY_GROUPS=[["cf","Kaliningrad","Baltic Northern Army","heavy",9,"xingke"],["cf","Kaliningrad","Baltic Northern Army","rocket",6,"xianglin"],["cf","Kaliningrad","Baltic Northern Army","assault",7,null],["cf","Kaliningrad","Baltic Northern Army","support",4,null],["cf","Grodno","Northern Breach Army","heavy",11,"gaohai"],["cf","Grodno","Northern Breach Army","rocket",6,null],["cf","Grodno","Northern Breach Army","assault",8,null],["cf","Grodno","Northern Breach Army","siege",4,null],["cf","Brest","Vistula Offensive","heavy",11,"cao"],["cf","Brest","Vistula Offensive","rocket",6,"honggu"],["cf","Brest","Vistula Offensive","assault",7,null],["cf","Brest","Vistula Offensive","support",4,null],["cf","Lviv","Galician Army","heavy",10,"zhaohao"],["cf","Lviv","Galician Army","rocket",5,null],["cf","Lviv","Galician Army","assault",7,null],["cf","Lviv","Galician Army","siege",4,null],["cf","Lutsk","Lublin Spearhead","heavy",9,"lifeng"],["cf","Lutsk","Lublin Spearhead","medium",6,null],["cf","Lutsk","Lublin Spearhead","rocket",4,null],["cf","Uzhhorod","Carpathian Pass Corps","heavy",7,"leifeng"],["cf","Uzhhorod","Carpathian Pass Corps","assault",7,null],["cf","Uzhhorod","Carpathian Pass Corps","rocket",4,null],["cf","Oradea","Hungarian Plains Army","heavy",9,"meiling"],["cf","Oradea","Hungarian Plains Army","rocket",5,null],["cf","Oradea","Hungarian Plains Army","assault",7,null],["cf","Timisoara","Danube Eastern Army","heavy",8,"rakshata"],["cf","Timisoara","Danube Eastern Army","assault",7,null],["cf","Timisoara","Danube Eastern Army","rocket",4,null],["cf","Osijek","Drava Crossing Army","heavy",8,null],["cf","Osijek","Drava Crossing Army","rocket",4,null],["cf","Osijek","Drava Crossing Army","medium",5,null],["cf","Zagreb","Alpine Southern Army","heavy",7,null],["cf","Zagreb","Alpine Southern Army","assault",6,null],["cf","Zagreb","Alpine Southern Army","siege",4,null],["cf","Klaipeda","Baltic Reserve","medium",4,null],["cf","Klaipeda","Baltic Reserve","support",3,null],["eu","Warsaw","Warsaw Central Command","heavy",10,"akito"],["eu","Warsaw","Warsaw Central Command","rocket",6,"yukiya"],["eu","Warsaw","Warsaw Central Command","assault",7,"ryo"],["eu","Warsaw","Warsaw Central Command","support",3,"leila"],["eu","Lublin","Eastern Poland Army","heavy",9,"ayano"],["eu","Lublin","Eastern Poland Army","rocket",3,null],["eu","Lublin","Eastern Poland Army","assault",4,null],["eu","Bialystok","Northern Polish Defense","heavy",8,"oscar"],["eu","Bialystok","Northern Polish Defense","rocket",3,null],["eu","Bialystok","Northern Polish Defense","medium",4,null],["eu","Gdansk","Baltic Coastal Command","heavy",3,"anna"],["eu","Gdansk","Baltic Coastal Command","rocket",2,null],["eu","Gdansk","Baltic Coastal Command","support",3,null],["eu","Krakow","Upper Vistula Command","heavy",9,"smilas"],["eu","Krakow","Upper Vistula Command","rocket",3,null],["eu","Krakow","Upper Vistula Command","siege",3,null],["eu","Krakow","Upper Vistula Command","assault",4,null],["eu","Katowice","Silesian Industrial Corps","heavy",9,"fernando"],["eu","Katowice","Silesian Industrial Corps","rocket",3,null],["eu","Katowice","Silesian Industrial Corps","assault",4,null],["eu","Ostrava","Moravian Defense","heavy",7,"olivia"],["eu","Ostrava","Moravian Defense","rocket",2,null],["eu","Ostrava","Moravian Defense","medium",3,null],["eu","Prague","Bohemian Reserve","heavy",8,"klaus"],["eu","Prague","Bohemian Reserve","rocket",3,null],["eu","Prague","Bohemian Reserve","support",3,null],["eu","Brno","Moravian Operational Army","heavy",4,"margaret"],["eu","Brno","Moravian Operational Army","rocket",2,null],["eu","Brno","Moravian Operational Army","medium",4,null],["eu","Bratislava","Danube Line","heavy",8,"eduardo"],["eu","Bratislava","Danube Line","rocket",3,null],["eu","Bratislava","Danube Line","assault",4,null],["eu","Kosice","Slovak Eastern Army","heavy",7,"pierre"],["eu","Kosice","Slovak Eastern Army","rocket",3,null],["eu","Kosice","Slovak Eastern Army","assault",4,null],["eu","Budapest","Hungarian Central Army","heavy",9,"marirrosa"],["eu","Budapest","Hungarian Central Army","rocket",3,null],["eu","Budapest","Hungarian Central Army","assault",4,null],["eu","Budapest","Hungarian Central Army","support",3,null],["eu","Debrecen","Eastern Hungary Corps","heavy",5,null],["eu","Debrecen","Eastern Hungary Corps","rocket",2,null],["eu","Debrecen","Eastern Hungary Corps","assault",4,null],["eu","Vienna","Vienna Defense Command","heavy",11,null],["eu","Vienna","Vienna Defense Command","rocket",3,null],["eu","Vienna","Vienna Defense Command","support",3,null],["eu","Vienna","Vienna Defense Command","siege",3,null],["eu","Graz","Alpine Defense","heavy",6,null],["eu","Graz","Alpine Defense","rocket",2,null],["eu","Graz","Alpine Defense","assault",4,null]];
const RIVERS={"Vistula":[[19.95,49.6],[19.95,50.06],[21.75,50.68],[21,52.23],[19.9,52.9],[18.6,53.02],[18.65,54.35]],"Oder":[[18.8,49.6],[18.25,50.45],[17.93,50.68],[17.03,51.11],[15.6,51.85],[14.6,52.2],[14.57,53.4]],"Danube":[[12.12,48.52],[13.05,48.65],[14.286,48.31],[15.62,48.2],[16.37,48.21],[17.108,48.148],[18.75,47.75],[19.04,47.5],[20.12,46.75]],"Tisza":[[22.3,48.62],[21.9,48.11],[21.75,47.54],[20.7,47.18],[20.15,46.25]],"Morava":[[17.28,49.65],[17.15,49.2],[17,48.6],[17.1,48.15]],"Drava":[[13.8,46.6],[15.8,46.65],[17.2,46.35],[18.7,45.55],[19.7,45.55]]};
const MOUNTAINS={"Sudetes":[[12.2,50.2],[13.5,50.6],[14.75,50.8],[15.5,50.75],[16.25,50.6],[17.3,50.3]],"Carpathians":[[20.1,49.1],[21.35,49.1],[22.5,48.75],[23.8,48.4],[25.2,47.45]],"Alps":[[9.8,47.45],[11.3,47],[12.6,47.05],[13.8,47],[15.1,47]],"Tatras":[[19.6,49.25],[20.3,49.15],[21.05,49.1]]};
const PASSES=[[17.25,50.25,0.35],[18.35,49.7,0.35],[20.42,49.45,0.28],[22.3,48.64,0.45],[15.45,47.07,0.45],[16.37,48.21,0.4],[13.05,47.8,0.4],[11.4,47.28,0.32]];
const PORTS={"Baltiysk":3,"Klaipeda":3,"Swinoujscie":3,"Kolobrzeg":2,"Gdynia":3,"Gdansk":3};
const FLEETS=[["cf","Baltiysk","cf_carrier",2],["cf","Baltiysk","shui_gun_ru_ii",4],["cf","Klaipeda","cf_carrier",1],["cf","Klaipeda","shui_gun_ru_ii",3],["eu","Gdynia","eu_carrier",2],["eu","Gdynia","panzer_frosch_ii",4],["eu","Swinoujscie","eu_carrier",1],["eu","Swinoujscie","panzer_frosch_ii",3]];
const OFFENSIVE_AXES={"Baltic Northern Army":["Gdansk","Torun","Bydgoszcz","Poznan"],"Northern Breach Army":["Bialystok","Warsaw","Lodz","Poznan"],"Vistula Offensive":["Lublin","Siedlce","Warsaw","Kielce","Krakow"],"Galician Army":["Przemysl","Rzeszow","Krakow","Katowice"],"Lublin Spearhead":["Lublin","Radom","Kielce","Krakow"],"Carpathian Pass Corps":["Michalovce","Kosice","Presov","Zilina"],"Hungarian Plains Army":["Debrecen","Miskolc","Budapest","Gyor"],"Danube Eastern Army":["Szeged","Kecskemet","Budapest","Bratislava"],"Drava Crossing Army":["Pecs","Szekesfehervar","Budapest","Vienna"],"Alpine Southern Army":["Szombathely","Graz","Vienna","Linz"],"Baltic Reserve":["Gdynia","Gdansk","Torun"]};
const FUNDING={"cf":{"credits":1350,"industry":760,"science":125,"sakuradite":63},"eu":{"credits":1480,"industry":820,"science":132,"sakuradite":67}};
const TARGET_COUNTRIES=['POL','CZE','SVK','HUN','AUT'];
const STAGING_COUNTRIES=['BLR','UKR','ROU','SRB','HRV','SVN','LTU','RUS'];
function geo(c,r){return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
 lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};}
function locate(lon,lat){const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
 return {r,c:Math.max(0,Math.min(COLS-1,Math.round((lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};}
function pointInside(lon,lat,poly){let ok=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a[1]>lat)!==(b[1]>lat) && lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])ok=!ok;
 }return ok;}
function insideCode(p,code){return COUNTRY_POLYGONS[code].some(rings=>
 pointInside(p.lon,p.lat,rings[0])&&!rings.slice(1).some(h=>pointInside(p.lon,p.lat,h)));}
function countryAt(p){for(const code of TARGET_COUNTRIES)if(insideCode(p,code))return code;
 for(const code of STAGING_COUNTRIES)if(insideCode(p,code)){
  // Northern Belarus and most of Ukraine/Romania are not part of this theatre.
  if(code==='BLR'&&p.lon>26.3)return null;
  if(code==='UKR'&&p.lon>26.8)return null;
  if(code==='ROU'&&(p.lon>25.2||p.lat<45))return null;
  if(code==='SRB'&&p.lat<44.8)return null;
  if(code==='HRV'&&p.lon<14.7)return null;
  return code;
 }return null;}
function isBaltic(p){return p.lon>14.0&&p.lon<22.2&&p.lat>53.8&&p.lat<BOUNDS.north&&
 // Never paint the west-German or Latvian mainland as navigable water.
 (p.lon>=18||p.lat>54.08)&&!(p.lon>21.45&&p.lat>55.4);}
function seaAt(p){return isBaltic(p)&&!countryAt(p);}
function coastline(c,r){let sea=0;for(let sy=-1;sy<=1;sy++)for(let sx=-1;sx<=1;sx++){
 const q=geo(c+sx*.3,r+sy*.3);if(seaAt(q))sea++;
 }return sea/9;}
function nearest(g,p,valid,radius=10){let best=null,score=Infinity;
 for(let r=Math.max(0,p.r-radius);r<=Math.min(g.rows-1,p.r+radius);r++)
 for(let c=Math.max(0,p.c-radius);c<=Math.min(g.cols-1,p.c+radius);c++){
 const t=E.tile(g,c,r);if(!t||!valid(t))continue;
 const d=E.distance(p,t,g);if(d<score){best=t;score=d;}}return best;}
function lineDistance(p,line){let best=Infinity;for(let i=1;i<line.length;i++){
 const a=line[i-1],b=line[i],vx=(b[0]-a[0])*.8,vy=b[1]-a[1],px=(p.lon-a[0])*.8,py=p.lat-a[1];
 const t=Math.max(0,Math.min(1,(px*vx+py*vy)/(vx*vx+vy*vy||1)));
 best=Math.min(best,Math.hypot(px-t*vx,py-t*vy));}return best;}
function landscape(p,c,r){let mountain=Infinity;
 for(const line of Object.values(MOUNTAINS))mountain=Math.min(mountain,lineDistance(p,line));
 const pass=PASSES.some(([x,y,rad])=>Math.hypot((p.lon-x)*.8,p.lat-y)<rad);
 if(mountain<.48&&!pass)return 'mountain';
 if((p.lon<16.5&&p.lat>49.0&&p.lat<51.4)||(p.lon>20&&p.lat>48&&p.lat<50.5))
  if((c*13+r*19)%7<3)return 'forest';
 if((c*17+r*11)%31<4)return 'forest';
 return 'plains';}
function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No reachable formation');}
function segmentsCross(a,b,x,y){
 const ori=(p,q,r)=>(q.lon-p.lon)*(r.lat-p.lat)-(q.lat-p.lat)*(r.lon-p.lon);
 const x0={lon:x[0],lat:x[1]},y0={lon:y[0],lat:y[1]};
 return ori(a,b,x0)*ori(a,b,y0)<0&&ori(x0,y0,a)*ori(x0,y0,b)<0;
}
function create(player='cf',difficulty='normal',seed=201712){
 if(!SIDES.includes(player))throw Error('Unsupported Central Europe faction: '+player);
 if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
 const g={game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
  mode:'scenario',era:ID,order:[player,...SIDES.filter(s=>s!==player)],seed,wrap:false,
  cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,tiles:[],units:[],stations:[],
  sites:[],log:[],strikes:[],launches:[],fallen:{},economy:{},tech:{},
  officers:Object.fromEntries(Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
  roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,eliteDeployed:{},
  arsenal:{cf:0,eu:0},automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
  mapRevision:0,teams:null,factions:{},lineup:{}};
 for(const s of [...SIDES,'neutral']){g.economy[s]={credits:0,industry:0,science:0,sakuradite:0};g.tech[s]={};}
 g.scenario={id:ID,key:KEY,title:'Conquest of Central Europe',version:1,
  phase:'federation-central-europe',groups:[],funding:{},bounds:BOUNDS,projection:PROJECTION,
  rivers:RIVERS,mountainPasses:PASSES,offensiveAxes:{cf:OFFENSIVE_AXES},
  riverCrossings:['Warsaw','Krakow','Torun','Wroclaw','Bratislava','Budapest','Szeged','Gyor','Linz','Vienna','Graz'],
  totalConquest:true,turnLimit:null,aiDoctrine:'europe'};
 const eliteIds=Object.keys(E.ELITE_FORCES);
 g.scenario.eliteRosters=Object.fromEntries(SIDES.map(side=>[side,
  eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&E.ELITE_FORCES[id].availableTo.includes(side))]));
 g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
  const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),country=countryAt(p);
  const water=coastline(c,r);
  return {c,r,owner:null,terrain:country?(water>=.2&&water<=.8?'coast':landscape(p,c,r)):
   seaAt(p)?(water>=.2&&water<=.8?'coast':'sea'):'offmap',
   waterFraction:water,waterBasin:seaAt(p)?'baltic':null,country:country||null};
 });
 for(const [name,lon,lat,owner,tier,fort] of CITIES){
  const geographicCountry=countryAt({lon,lat})||({Swinoujscie:'POL',Klaipeda:'LTU',Belgrade:'SRB'})[name];
  if(!geographicCountry|| (owner==='eu'?!TARGET_COUNTRIES.includes(geographicCountry):!STAGING_COUNTRIES.includes(geographicCountry)))
   throw Error('City placed outside its faction theatre: '+name+'/'+geographicCountry);
  const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
   !E.TERRAIN[t.terrain]?.blocked&&t.country===geographicCountry&&
   !g.stations.some(s=>s.c===t.c&&s.r===t.r),5);
  if(!at)throw Error('No valid national territory for '+name);
  const capital=['Warsaw','Prague','Bratislava','Budapest','Vienna','Kaliningrad','Lviv','Belgrade'].includes(name);
  const shield=E.scenarioCityDefenseHP(tier,!!fort,name);
  g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
   capital,capitalOf:capital?owner:null,fort:!!fort,
   gun:fort?name+' Defensive Battery':null,lab:0,refinery:0,
   shield,maxShield:shield,
   income:Math.round((capital?50:tier===3?34:tier===2?23:13)*.55),
   industry:Math.round((capital?28:7*tier)*.55),
   science:Math.round((tier+2)*.55),producedTurn:0});
 }
 // Occupation provinces only on playable land, never on foreign offmap tiles.
 const components=new Int16Array(g.tiles.length).fill(-1);let componentId=0;
 for(let i=0;i<g.tiles.length;i++){
  const start=g.tiles[i];if(start.terrain==='sea'||start.terrain==='offmap'||components[i]>=0)continue;
  const queue=[start];components[i]=componentId;
  for(let j=0;j<queue.length;j++)for(const n of E.adjacent(g,queue[j])){
   const ix=n.r*COLS+n.c;
   if(n.terrain==='sea'||n.terrain==='offmap'||components[ix]>=0)continue;
   components[ix]=componentId;queue.push(n);
  }componentId++;
 }
 const byComponent=new Map();
 for(const s of g.stations){const key=components[s.r*COLS+s.c];
  if(!byComponent.has(key))byComponent.set(key,[]);byComponent.get(key).push(s);}
 for(const t of g.tiles)if(t.terrain!=='sea'&&t.terrain!=='offmap'){
  const eligible=byComponent.get(components[t.r*COLS+t.c])||[];
  if(!eligible.length)continue;let closest=null,score=Infinity;
  for(const s of eligible){const d=E.distance(t,s,g);if(d<score){score=d;closest=s;}}
  if(closest){t.owner=closest.owner;t.provinceCity=closest.id;}
 }
 // Actual polyline river intersections: bridges at known cities permit movement.
 const sections=Object.values(RIVERS).flatMap(line=>line.slice(1).map((pt,i)=>[line[i],pt]));
 const bridges=g.stations.filter(s=>g.scenario.riverCrossings.includes(s.name)),edges={};
 for(const t of g.tiles){
  if(t.terrain==='sea'||t.terrain==='offmap'||E.TERRAIN[t.terrain]?.blocked)continue;
  const a=geo(t.c,t.r),from=t.r*COLS+t.c;
  for(const n of E.adjacent(g,t)){
   const to=n.r*COLS+n.c;
   if(to<=from||n.terrain==='sea'||n.terrain==='offmap'||E.TERRAIN[n.terrain]?.blocked)continue;
   if(!sections.some(([x,y])=>segmentsCross(a,geo(n.c,n.r),x,y)))continue;
   if(bridges.some(s=>E.distance(t,s,g)<=1&&E.distance(n,s,g)<=1))continue;
   edges[from+':'+to]=true;
  }
 }g.scenario.riverBarriers=edges;
 const occupied=new Set(g.units.map(u=>u.c+':'+u.r));
 const groupMap=new Map();
 function group(side,name,origin){const key=side+':'+name;
  if(!groupMap.has(key)){const gr={id:'army-'+groupMap.size,side,name,origin,units:[]};
   groupMap.set(key,gr);g.scenario.groups.push(gr);}return groupMap.get(key);}
 for(const [side,name,formation,cls,count,commander] of ARMY_GROUPS){
  const s=g.stations.find(st=>st.name===name&&st.owner===side);
  if(!s)throw Error('Army origin missing or wrong faction: '+name);
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&
    !E.TERRAIN[t.terrain]?.blocked&&!occupied.has(E.key(t))&&t.owner===side&&
    (!E.stationAt(g,t)||E.stationAt(g,t).owner===side),18);
   if(!at)throw Error('Insufficient land deployment cells at '+name+'/'+side);
   const cmd=i===0?commander:null,stack=i===0?3:2;
   const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
   occupied.add(E.key(at));group(side,formation,name).units.push(u.id);
   if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
  }
 }
 const usedPorts=new Set();const baltic=t=>t&&(t.terrain==='sea'||t.terrain==='coast')&&t.waterFraction>=.2&&
  isBaltic(geo(t.c,t.r));
 for(const [name,level] of Object.entries(PORTS)){
  const s=g.stations.find(v=>v.name===name);if(!s)throw Error('Missing Baltic port '+name);
  // Marine berths are independent tiles, not automatically transferred with cities.
  const at=nearest(g,s,t=>t.terrain==='sea'&&baltic(t)&&
   !usedPorts.has(E.key(t))&&!g.stations.some(v=>v.c===t.c&&v.r===t.r),12);
  if(!at)throw Error('No navigable Baltic berth for '+name);
  s.portAt={c:at.c,r:at.r};s.portOwner=s.owner;s.portLevel=level;
  usedPorts.add(E.key(at));
 }
 // Keep fleet hulls on contiguous Baltic deep-water cells, never in offmap Germany.
 for(const [side,name,type,count] of FLEETS){
  const s=g.stations.find(v=>v.name===name);
  if(!s||s.owner!==side||!E.TYPES[type]?.naval)throw Error('Invalid Baltic fleet '+name+'/'+type);
  const fleet={id:'fleet-'+g.scenario.groups.length,side,name:name+' Baltic Flotilla',origin:name,units:[]};
  for(let i=0;i<count;i++){
   const at=nearest(g,s,t=>t.terrain==='sea'&&baltic(t)&&!E.unitAt(g,t)&&!usedPorts.has(E.key(t)),15);
   if(!at)throw Error('Insufficient Baltic sea cells for '+name);
   fleet.units.push(E.newUnit(g,type,side,at.c,at.r).id);
  }g.scenario.groups.push(fleet);
 }
 if(difficulty==='elite')E.prepareEliteEurope(g);
 for(const side of SIDES){
  const factor=side===player?1:E.scenarioIncomeFactor(difficulty);
  const base=E.income(g,side);
  g.scenario.funding[side]=Object.fromEntries(Object.entries(FUNDING[side]).map(([key,n])=>[key,Math.round(n*factor)-base[key]]));
  const actual=E.income(g,side);for(const key of Object.keys(FUNDING[side]))g.economy[side][key]=actual[key]*2;
 }
 if(difficulty!=='normal'&&difficulty!=='elite'){
  for(const side of SIDES.filter(x=>x!==player))
   for(const u of g.units.filter(x=>x.side===side&&!E.TYPES[x.type].naval))
    E.addDifficultyFrames(u,difficulty);
 }
 g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.filter(u=>u.side===s).length]));
 E.log(g,'Federation armies press west from the Belarusian and Ukrainian approaches, across the Balkan-Carpathian and Danube fronts. Europe must defend its industrial heartland; every enemy city must fall.',player);
 return g;
}
function onTurn(){return false;}
function strategicScore(g,side){return g.stations.filter(s=>s.owner===side).reduce((sum,s)=>sum+s.tier,0);}
function objective(g,side=g.player){return 'Capture every hostile city in Central Europe and its eastern approaches ('+
 g.stations.filter(s=>s.owner===side).length+'/'+CITIES.length+' controlled); no turn limit.';}
function winner(g){if(g.mode!=='scenario'||g.scenario?.id!==ID||g.stations.length!==CITIES.length)return null;
 for(const side of SIDES)if(g.stations.every(s=>s.owner===side))
  return {winner:side,reason:E.FACTIONS[side].name+' has conquered the entire Central Europe theatre.'};
 return null;}
const api={id:ID,title:'Conquest of Central Europe',cols:COLS,rows:ROWS,sides:SIDES,bounds:BOUNDS,
 cityData:CITIES,armyGroups:ARMY_GROUPS,ports:PORTS,fleetData:FLEETS,rivers:RIVERS,
 create,onTurn,objective,winner,strategicScore,orderGroup,locate,geo};
api.meta={terrainCosts:{mountain:2},map:{centreSampled:true,europeanRegion:true,coastBuffer:1,
 homeZoom:3.5,overviewMarkers:true,overlays:['regionalRivers']},
 elite:true,eliteRosterOnly:true,
 ai:{doctrine:'europe',recovery:true,operationalAxes:{invader:'cf',defender:'eu',
  axes:OFFENSIVE_AXES,defenderHubs:['Warsaw','Lublin','Bialystok','Krakow','Katowice',
   'Kosice','Bratislava','Budapest','Prague','Vienna','Graz']}},
 text:{terrain:'Sudetes, Carpathians, Tatras and Alps cost 2 movement; pass roads remain open. Vistula, Oder, Danube and Tisza river lines have bridge approaches.',
  era:'Central Europe · Alternate 2017',
  intro:'Federation Army Groups from Russia, Ukraine and the Balkans attack E.U. Poland, Czechia, Slovakia, Hungary and Austria. Germany is outside the theatre. Take every opposing city; no artificial turn clock.',
  diplomacy:'Two factions contest the five-country industrial heartland. Baltic harbours are independent capturable positions. Neither faction may enter Germany.',
  elite:'Standard faction-specific Elite Force rosters, named officers, HQ restrictions and enemy difficulty scaling apply.',
  focus:{cf:'Brest',eu:'Warsaw'}},
 blurbs:{cf:'Break the Vistula from Grodno and Brest, the Carpathians from Lviv and Uzhhorod, and the Danube line from Balkan forward bases.',
  eu:'Hold the Polish industrial belt, Carpathian passes, Budapest and the Vienna–Prague defenses, and counterattack Federation staging lines.'}};
E.scenarios={...(E.scenarios||{}),[KEY]:api,byId:{...(E.scenarios?.byId||{}),[ID]:api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

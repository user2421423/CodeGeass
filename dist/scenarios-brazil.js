/* Invasion of Brazil — Europia's six transatlantic amphibious fronts.
   176x144 WGS84 hexes, GSHHS intermediate shoreline by polygon land share.
   20%-80% mixed-coast rule; no EU starting cities or turn limit. */
(function(root) {
  'use strict';
  const E=root.Knightmare || (typeof require==='function'?require('./engine.js'):null);
  const COLS=176,ROWS=144,SIDES=['eu','britannia'];
  const BOUNDS={west:-81,east:-31,north:9,south:-36};
  const K=Math.cos(13.5*Math.PI/180);
  const PROJECTION={centerLon:-56,centerLat:-13.5,angle:0,uMin:-25*K,uMax:25*K,vMin:-22.5,vMax:22.5};
  // Row transitions: [column, class, ...], class 0 sea, 1 mixed, 2 land.
  const COAST_ROWS=`0,1,1,2,4,1,5,0,7,1,8,2,11,1,12,0,16,2,71,0;0,2,3,1,4,0,8,1,9,2,12,1,13,0,14,2,65,1,67,2,68,1,70,2,71,1,72,2,73,1,74,0;0,2,2,0,9,1,10,2,14,1,15,2,75,1,76,0;0,2,2,0,8,1,9,2,14,1,15,2,57,1,58,2,77,0;0,2,3,1,4,0,10,2,63,1,64,2,78,1,79,0;0,1,2,0,10,1,11,2,49,1,50,2,63,1,64,2,78,1,79,0;0,0,11,1,12,2,63,1,64,2,79,1,80,0;0,0,12,1,13,2,48,1,49,2,78,1,79,2,81,0;0,0,13,2,82,1,83,0;0,0,12,1,13,2,83,1,86,0,88,1,93,0;0,0,13,2,95,1,97,0;0,0,12,2,97,1,99,0;0,0,12,1,13,2,100,1,101,0;0,0,12,1,13,2,90,1,92,2,101,0;0,0,13,2,102,1,103,0;0,0,12,2,104,1,105,0;0,0,13,1,14,2,105,0;0,0,12,1,13,2,105,0;0,0,12,1,13,2,105,1,106,0;0,0,11,2,105,0;0,0,9,1,11,2,106,0;0,0,8,2,106,0;0,0,8,1,9,2,107,1,108,0;0,0,6,1,7,2,109,0;0,0,7,1,8,2,109,1,110,0;0,0,4,1,6,2,108,1,109,0;0,0,3,1,4,2,107,1,109,0;0,0,3,2,106,1,110,0;0,0,3,1,4,2,105,1,111,0;0,0,1,1,2,2,59,1,60,2,104,1,107,2,108,1,114,0;0,0,2,2,56,1,58,2,61,1,62,2,103,1,107,2,114,1,115,0;0,0,1,2,63,1,64,2,102,1,103,2,104,1,106,2,114,0,115,2,119,1,121,0;0,1,1,2,64,1,67,2,102,1,103,2,104,1,105,2,106,1,107,2,113,1,115,2,123,1,124,0;0,1,1,2,66,1,67,2,86,1,87,2,100,1,102,2,112,1,114,2,124,1,127,0;0,0,1,2,68,1,69,2,96,1,99,2,101,1,102,2,104,1,113,2,127,1,128,0;0,1,1,2,87,1,93,2,94,1,95,2,100,1,101,2,103,1,104,2,105,1,106,2,110,1,111,2,128,0;0,1,2,2,3,1,4,2,50,1,51,2,54,1,55,2,70,1,71,2,83,1,84,2,86,1,87,2,91,1,95,2,101,1,102,2,128,1,130,0,132,1,134,0;0,0,2,1,4,2,54,1,55,2,70,1,72,2,90,1,91,2,101,1,102,2,109,1,110,2,127,1,130,2,134,1,138,0;0,0,4,2,72,1,74,2,110,1,111,2,128,1,129,2,145,1,146,0;0,0,2,1,3,2,28,1,29,2,56,1,58,2,70,1,71,2,72,1,73,2,77,1,79,2,109,1,110,2,146,1,147,0;0,0,1,1,2,2,40,1,41,2,62,1,63,2,149,1,150,0;0,2,36,1,38,2,61,1,62,2,63,1,64,2,150,0;0,2,142,1,143,2,151,1,152,0;0,2,152,1,153,0;0,2,154,1,155,0;0,2,159,1,160,0;0,1,1,2,161,0;0,2,161,0;0,1,1,2,147,1,148,2,161,1,162,0;0,0,1,1,2,2,161,1,162,0;0,0,3,1,4,2,162,0;0,0,4,2,162,0;0,0,5,2,162,1,163,0;0,0,5,2,162,0;0,0,6,1,7,2,162,1,163,0;0,0,7,2,161,1,162,0;0,0,8,2,161,1,162,0;0,0,8,2,160,1,161,0;0,0,9,2,160,1,161,0;0,0,9,2,159,0;0,0,10,2,158,1,159,0;0,0,9,1,10,2,157,1,158,0;0,0,11,2,156,1,157,0;0,0,11,2,154,1,155,0;0,0,12,2,154,1,155,0;0,0,12,1,13,2,153,0;0,0,13,1,14,2,153,0;0,0,13,1,14,2,152,0;0,0,15,2,151,1,152,0;0,0,15,2,148,1,149,2,150,1,151,0;0,0,16,2,52,1,53,2,54,1,55,2,148,1,150,0;0,0,16,1,17,2,147,1,148,0;0,0,17,2,49,1,50,2,148,0;0,0,16,2,147,1,148,0;0,0,17,2,148,0;0,0,17,1,18,2,147,0;0,0,19,1,20,2,148,0;0,0,19,1,20,2,147,1,148,0;0,0,21,1,22,2,39,0,41,2,148,0;0,0,22,1,24,2,38,1,39,0,41,1,42,2,147,1,148,0;0,0,25,1,26,2,40,1,41,0,42,1,44,2,148,0;0,0,27,1,28,2,41,1,43,2,147,0;0,0,30,1,31,2,147,1,148,0;0,0,31,1,32,2,146,1,147,0;0,0,33,1,34,2,147,0;0,0,33,1,34,2,146,1,147,0;0,0,35,1,36,2,146,0;0,0,36,1,37,2,125,1,126,2,145,0;0,0,37,1,38,2,48,1,49,2,125,1,126,2,145,0;0,0,37,2,48,1,49,2,125,1,126,2,144,1,145,0;0,0,38,2,145,0;0,0,37,1,38,2,144,1,145,0;0,0,38,2,144,0;0,0,37,1,38,2,143,0;0,0,38,2,143,0;0,0,37,1,38,2,122,1,123,2,141,1,142,0;0,0,38,1,39,2,123,1,124,2,141,0;0,0,38,2,140,0;0,0,38,2,141,0;0,0,37,1,38,2,139,1,140,0;0,0,38,2,138,0;0,0,37,2,132,1,133,2,137,0;0,0,37,1,38,2,128,1,130,0,131,1,133,0,134,1,135,0;0,0,36,2,111,1,113,2,126,1,128,0;0,0,37,2,125,1,126,0;0,0,36,1,37,2,121,1,122,0;0,0,37,2,120,0;0,0,36,2,118,1,119,0;0,0,37,2,116,1,117,0;0,0,36,1,37,2,115,1,116,0;0,0,36,1,37,2,114,1,115,0;0,0,36,2,113,1,114,0;0,0,36,1,37,2,114,0;0,0,36,2,113,1,114,0;0,0,36,2,114,0;0,0,35,2,113,1,114,0;0,0,35,1,36,2,82,1,88,2,114,1,115,0;0,0,34,1,35,2,77,1,78,2,113,1,114,0;0,0,34,1,35,2,77,1,78,2,114,0;0,0,34,2,76,1,77,2,83,1,84,2,113,0;0,0,34,2,112,1,113,0;0,0,33,2,110,1,111,0;0,0,33,1,34,2,75,1,76,2,110,1,111,0;0,0,33,1,34,2,74,1,75,2,108,1,109,0;0,0,34,2,75,1,76,2,109,0;0,0,33,2,74,1,75,2,104,1,105,2,106,1,107,2,108,0;0,0,33,2,64,1,66,2,75,1,76,2,104,1,105,0,106,1,107,2,108,0;0,0,32,1,33,2,63,1,66,2,103,1,104,0,105,1,107,0;0,0,33,2,103,1,104,0,105,2,106,1,107,0;0,0,32,1,33,2,101,1,102,0,104,1,105,0;0,0,33,1,34,2,71,1,72,2,101,1,104,0;0,0,33,2,101,1,102,0;0,0,33,1,34,2,71,1,72,2,99,1,100,2,101,0;0,0,33,2,86,1,88,2,97,1,98,0,99,1,100,0;0,0,33,2,96,1,98,2,99,1,100,0;0,0,32,1,33,2,96,1,97,2,98,1,99,0;0,0,33,2,79,1,80,2,97,1,98,0;0,0,31,1,32,2,79,1,80,2,96,0;0,0,31,1,32,2,79,1,80,0,81,2,96,0;0,0,31,2,79,1,80,0,84,1,85,2,94,1,95,0;0,0,31,2,81,1,82,0,87,1,88,0,90,1,93,0;0,0,30,2,83,0;0,0,29,1,30,2,83,1,84,0;0,0,29,2,82,1,83,0`.split(';').map(x=>x.split(',').map(Number));
  function coastCoverageClass(c,r){const v=COAST_ROWS[r];let state=0;
    for(let i=0;i<v.length;i+=2){if(c<v[i])break;state=v[i+1];}return state;}
  const CITIES=[["Brasília",-47.88,-15.79,"britannia",3,true],["Rio de Janeiro",-43.21,-22.91,"britannia",3,true],["São Paulo",-46.63,-23.55,"britannia",3,true],["Salvador",-38.5,-12.97,"britannia",3,true],["Recife",-34.88,-8.05,"britannia",3,true],["Fortaleza",-38.54,-3.73,"britannia",3,true],["Belém",-48.49,-1.46,"britannia",3,true],["Manaus",-60.02,-3.1,"britannia",3,true],["Porto Alegre",-51.23,-30.03,"britannia",3,true],["Belo Horizonte",-43.94,-19.92,"britannia",3,true],["Curitiba",-49.27,-25.43,"britannia",3,true],["Goiânia",-49.26,-16.68,"britannia",3,true],["São Luís",-44.3,-2.53,"britannia",3,true],["Natal",-35.21,-5.8,"britannia",2,true],["João Pessoa",-34.86,-7.12,"britannia",2,true],["Maceió",-35.74,-9.67,"britannia",2,true],["Aracaju",-37.07,-10.91,"britannia",2,true],["Ilhéus",-39.03,-14.79,"britannia",2,true],["Porto Seguro",-39.06,-16.45,"britannia",2,true],["Vitória",-40.34,-20.32,"britannia",3,true],["Santos",-46.33,-23.96,"britannia",3,true],["Paranaguá",-48.51,-25.52,"britannia",2,true],["Itajaí",-48.66,-26.91,"britannia",2,true],["Florianópolis",-48.55,-27.59,"britannia",3,true],["Rio Grande",-52.1,-32.04,"britannia",3,true],["Macapá",-51.07,0.04,"britannia",2,true],["Santarém",-54.7,-2.44,"britannia",3,true],["Altamira",-52.2,-3.2,"britannia",2,false],["Marabá",-49.12,-5.37,"britannia",2,true],["Palmas",-48.33,-10.25,"britannia",2,true],["Teresina",-42.8,-5.1,"britannia",2,false],["Imperatriz",-47.49,-5.53,"britannia",2,false],["Petrolina",-40.5,-9.4,"britannia",2,false],["Feira de Santana",-38.97,-12.26,"britannia",2,false],["Barreiras",-45,-12.15,"britannia",2,false],["Montes Claros",-43.86,-16.73,"britannia",2,false],["Uberlândia",-48.27,-18.91,"britannia",2,false],["Campinas",-47.06,-22.91,"britannia",3,true],["Ribeirão Preto",-47.81,-21.18,"britannia",2,false],["Juiz de Fora",-43.35,-21.75,"britannia",2,false],["Londrina",-51.16,-23.31,"britannia",2,false],["Maringá",-51.93,-23.42,"britannia",2,false],["Foz do Iguaçu",-54.59,-25.54,"britannia",2,true],["Campo Grande",-54.62,-20.47,"britannia",3,true],["Cuiabá",-56.1,-15.6,"britannia",3,true],["Rondonópolis",-54.64,-16.47,"britannia",2,false],["Dourados",-54.8,-22.22,"britannia",2,false],["Corumbá",-57.65,-19.01,"britannia",2,true],["Sinop",-55.5,-11.86,"britannia",2,false],["Porto Velho",-63.9,-8.76,"britannia",3,true],["Rio Branco",-67.81,-9.97,"britannia",3,true],["Boa Vista",-60.67,2.82,"britannia",2,true],["Tabatinga",-69.94,-4.25,"britannia",2,true],["Cruzeiro do Sul",-72.67,-7.63,"britannia",2,false],["Cachimbo",-55.01,-9.33,"britannia",2,false],["Governador Valadares",-41.94,-18.85,"britannia",2,false],["Caxias do Sul",-51.18,-29.17,"britannia",2,false]];
  const ARMY_GROUPS=[["eu","Amazon Estuary","heavy",3,"akito"],["eu","Amazon Estuary","assault",2,"leila"],["eu","Amazon Estuary","rocket",2,null],["eu","Ceará Assault","heavy",3,"ryo"],["eu","Ceará Assault","assault",2,"yukiya"],["eu","Ceará Assault","rocket",2,null],["eu","Pernambuco Assault","heavy",3,"ayano"],["eu","Pernambuco Assault","assault",2,"oscar"],["eu","Pernambuco Assault","rocket",2,null],["eu","Bahia Assault","heavy",3,"smilas"],["eu","Bahia Assault","assault",2,"klaus"],["eu","Bahia Assault","rocket",2,null],["eu","Rio Assault","heavy",3,"olivia"],["eu","Rio Assault","assault",2,"anna"],["eu","Rio Assault","rocket",2,null],["eu","Southern Assault","heavy",3,"pierre"],["eu","Southern Assault","assault",2,"margaret"],["eu","Southern Assault","rocket",2,null],["britannia","Brasília","heavy",5,"bismarck"],["britannia","Brasília","rocket",3,null],["britannia","Brasília","siege",2,null],["britannia","Rio de Janeiro","heavy",4,"cornelia"],["britannia","Rio de Janeiro","rocket",3,null],["britannia","Rio de Janeiro","assault",3,null],["britannia","São Paulo","heavy",4,"suzaku"],["britannia","São Paulo","rocket",3,null],["britannia","São Paulo","siege",2,null],["britannia","Salvador","heavy",3,"guilford"],["britannia","Salvador","medium",3,null],["britannia","Recife","heavy",3,"jeremiah"],["britannia","Recife","rocket",2,null],["britannia","Fortaleza","medium",3,"villetta"],["britannia","Fortaleza","rocket",2,null],["britannia","Belém","heavy",3,"darlton"],["britannia","Belém","rocket",2,null],["britannia","Manaus","heavy",4,"oldrin"],["britannia","Manaus","rocket",2,null],["britannia","Porto Alegre","heavy",3,"gino"],["britannia","Porto Alegre","medium",2,null],["britannia","Curitiba","medium",3,null],["britannia","Belo Horizonte","heavy",3,null],["britannia","Goiânia","medium",3,null],["britannia","São Luís","medium",2,null],["britannia","Natal","assault",2,null],["britannia","Vitória","heavy",3,null],["britannia","Santos","heavy",3,null],["britannia","Paranaguá","medium",2,null],["britannia","Rio Grande","rocket",2,null],["britannia","Santarém","heavy",2,null],["britannia","Altamira","assault",2,null],["britannia","Marabá","medium",3,null],["britannia","Palmas","medium",3,null],["britannia","Cuiabá","heavy",3,null],["britannia","Porto Velho","heavy",3,null],["britannia","Rio Branco","medium",3,null],["britannia","Campo Grande","heavy",3,null],["britannia","Foz do Iguaçu","medium",2,null],["britannia","Campinas","heavy",3,null],["britannia","Ribeirão Preto","rocket",2,null],["britannia","Montes Claros","medium",2,null],["britannia","Teresina","light",2,null],["britannia","Tabatinga","assault",2,null],["britannia","Boa Vista","medium",2,null],["britannia","Corumbá","medium",2,null],["britannia","Florianópolis","medium",2,null],["britannia","Barreiras","rocket",2,null],["britannia","Feira de Santana","medium",2,null],["britannia","Dourados","raider",2,null],["britannia","Sinop","medium",2,null],["britannia","Uberlândia","medium",2,null]];
  const PORTS={"Belém":3,"Macapá":2,"São Luís":3,"Fortaleza":3,"Natal":2,"João Pessoa":2,"Recife":3,"Maceió":2,"Aracaju":2,"Salvador":3,"Ilhéus":2,"Porto Seguro":2,"Vitória":3,"Rio de Janeiro":3,"Santos":3,"Paranaguá":3,"Itajaí":2,"Florianópolis":2,"Rio Grande":3};
  const FLEETS=[["eu","Amazon Estuary",-45.8,1.7,"eu_carrier",4],["eu","Amazon Estuary",-45.8,1.7,"panzer_frosch_ii",3],["eu","Amazon Estuary",-45.8,1.7,"panzer_frosch",2],["eu","Ceará Assault",-35,-4.3,"eu_carrier",4],["eu","Ceará Assault",-35,-4.3,"panzer_frosch_ii",3],["eu","Ceará Assault",-35,-4.3,"panzer_frosch",2],["eu","Pernambuco Assault",-33.1,-9.6,"eu_carrier",4],["eu","Pernambuco Assault",-33.1,-9.6,"panzer_frosch_ii",3],["eu","Pernambuco Assault",-33.1,-9.6,"panzer_frosch",2],["eu","Bahia Assault",-35.3,-14.6,"eu_carrier",4],["eu","Bahia Assault",-35.3,-14.6,"panzer_frosch_ii",3],["eu","Bahia Assault",-35.3,-14.6,"panzer_frosch",2],["eu","Rio Assault",-40,-24.4,"eu_carrier",4],["eu","Rio Assault",-40,-24.4,"panzer_frosch_ii",3],["eu","Rio Assault",-40,-24.4,"panzer_frosch",2],["eu","Southern Assault",-48.5,-32.2,"eu_carrier",4],["eu","Southern Assault",-48.5,-32.2,"panzer_frosch_ii",3],["eu","Southern Assault",-48.5,-32.2,"panzer_frosch",2],["britannia","Belém",null,null,"carrier_battleship",1],["britannia","Fortaleza",null,null,"carrier_battleship",2],["britannia","Recife",null,null,"portman_ii",2],["britannia","Salvador",null,null,"portman_ii",2],["britannia","Rio de Janeiro",null,null,"carrier_battleship",2],["britannia","Santos",null,null,"portman_ii",2],["britannia","Rio Grande",null,null,"carrier_battleship",1],["britannia","São Luís",null,null,"portman",2],["britannia","Vitória",null,null,"portman_ii",2],["britannia","Macapá",null,null,"portman",1]];
  const FUNDING={eu:{credits:1320,industry:760,science:115,sakuradite:60},britannia:{credits:1350,industry:790,science:120,sakuradite:62}};
  function geo(c,r){
    return {lon:BOUNDS.west+(c+.5*(r&1)+.5)*(BOUNDS.east-BOUNDS.west)/COLS,
      lat:BOUNDS.north-(r+.5)*(BOUNDS.north-BOUNDS.south)/ROWS};
  }
  function locate(lon,lat){
    const r=Math.max(0,Math.min(ROWS-1,Math.round((BOUNDS.north-lat)*ROWS/(BOUNDS.north-BOUNDS.south)-.5)));
    return {r,c:Math.max(0,Math.min(COLS-1,Math.round(
      (lon-BOUNDS.west)*COLS/(BOUNDS.east-BOUNDS.west)-.5-.5*(r&1))))};
  }
  function nearest(g,p,valid,radius=9){return E.nearestTile(g,p,valid,radius);}
  const MOUNTAINS=[[-43.4,-20,2.5,4.7],[-46.5,-22.7,3.1,3],[-50.1,-25.7,3.1,2.8],[-45.5,-16.3,4.7,2.9],[-40.2,-15.7,2.8,3],[-52.1,-14.1,5.8,3.3]];
  const FORESTS=[[-66,-3,14,9],[-57,-3,12,8],[-52,-1.5,10,6],[-61,-9,9,7],[-48,-8,6,7],[-41,-15,2.8,7],[-48,-24,3,4],[-51,-27,3,4]];
  const RIVERS={
    Amazon:[[-73,-4.2],[-69,-3.8],[-65,-3.7],[-60,-3.1],[-57,-2.7],[-54.7,-2.4],[-51.8,-1.8],[-49.5,-1]],
    Negro:[[-67,1.4],[-64,-.6],[-61.6,-2.7],[-60,-3.1]],
    Madeira:[[-65,-9.5],[-63.9,-8.8],[-61.5,-6],[-59,-4.3],[-58.7,-3.4]],
    Tapajos:[[-56,-9.8],[-55.5,-6.6],[-54.8,-4.5],[-54.7,-2.4]],
    Xingu:[[-53.8,-10],[-52.5,-6.3],[-52.2,-3.2],[-51.9,-1.6]],
    Tocantins:[[-49.8,-16],[-49,-12],[-48,-9.8],[-48.7,-6],[-49.2,-3]],
    SaoFrancisco:[[-46.5,-20.5],[-44.6,-17.5],[-43,-14],[-41,-10],[-38.5,-9.6],[-36.4,-10.4]],
    Parana:[[-51,-20],[-52.1,-23],[-54.6,-25.5],[-55.5,-27]],
    Paraguay:[[-57,-16],[-57.6,-19],[-57.2,-22],[-56.4,-25.1]]};
  const CROSSINGS=['Manaus','Santarém','Marabá','Palmas','Petrolina','Foz do Iguaçu','Corumbá'];
  function density(p,areas){return Math.max(0,...areas.map(([x,y,w,h])=>Math.exp(-(((p.lon-x)/w)**2+((p.lat-y)/h)**2)*1.6)));}
  function riverDistance(p){let d=100;for(const path of Object.values(RIVERS))for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],
    k=Math.max(0,Math.min(1,((p.lon-a[0])*dx+(p.lat-a[1])*dy)/(dx*dx+dy*dy)));
    d=Math.min(d,Math.hypot((p.lon-a[0]-k*dx)*Math.cos(p.lat*Math.PI/180),p.lat-a[1]-k*dy));}return d;}
  function landscape(p){const m=density(p,MOUNTAINS),f=density(p,FORESTS);
    if(m>.68)return 'mountain';
    if(riverDistance(p)<.27||f>.42||m>.34)return 'forest';
    return 'plains';}
  function orderGroup(g,id,target){return E.orderArmyGroup(g,id,target,'Army group not found','No group unit can reach that hex');}
  function create(player='eu',difficulty='normal',seed=201734){
    if(!SIDES.includes(player))throw Error('Unsupported Invasion of Brazil faction: '+player);
    if(!['normal','hard','challenge','elite'].includes(difficulty))difficulty='normal';
    const g={
      game:'knightmare',version:1,rulesVersion:E.RULES_VERSION,player,difficulty,
      mode:'scenario',era:'invasion-brazil',order:[player,...SIDES.filter(s=>s!==player)],
      seed,wrap:false,cols:COLS,rows:ROWS,turn:1,phase:player,nextId:1,
      tiles:[],units:[],stations:[],sites:[],log:[],strikes:[],launches:[],
      fallen:{},economy:{},tech:{},officers:Object.fromEntries(
        Object.keys(E.COMMANDERS).map(k=>[k,E.defaultOfficer(k)])),
      roster:{},medalInventory:[],medalsEarned:[],stats:{},over:null,
      eliteDeployed:{},arsenal:{britannia:0,eu:0},
      automation:{enabled:false,autoUpgrade:true,stack:1,reserve:{},cities:{}},
      mapRevision:0,teams:{britannia:'britannia',eu:'eu'}
    };
    for(const side of [...SIDES,'neutral']){
      g.economy[side]={credits:0,industry:0,science:0,sakuradite:0};g.tech[side]={};
    }
    g.scenario={id:'invasion-brazil',key:'brazil',title:'Invasion of Brazil',
      version:1,phase:'atlantic-amphibious',aiDoctrine:'europe',groups:[],funding:{},
      bounds:BOUNDS,projection:PROJECTION,citylessFunding:['eu'],
      rivers:RIVERS,riverCrossings:CROSSINGS,
      operationalFronts:[{"name":"Amazon Estuary","attack":"eu","objective":"Belém"},{"name":"Ceará Assault","attack":"eu","objective":"Fortaleza"},{"name":"Pernambuco Assault","attack":"eu","objective":"Recife"},{"name":"Bahia Assault","attack":"eu","objective":"Salvador"},{"name":"Rio Assault","attack":"eu","objective":"Rio de Janeiro"},{"name":"Southern Assault","attack":"eu","objective":"Rio Grande"}] };
    // Only Britannia and Europia United are playable here.
    const eliteIds=Object.keys(E.ELITE_FORCES);
    g.scenario.eliteRosters={
      britannia:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('britannia')),
      eu:eliteIds.filter(id=>!E.ELITE_FORCES[id].scenarioOnly&&
        E.ELITE_FORCES[id].availableTo.includes('eu'))
    };
    // Authoritative tactical coast: each cell's clipped polygon land share is
    // <20%=sea, 20–80%=coast, >80%=land. Unlike a center-point mask this
    // preserves the Amazon estuary and narrow Brazilian coastal approaches.
    g.tiles=Array.from({length:COLS*ROWS},(_,i)=>{
      const c=i%COLS,r=(i/COLS)|0,p=geo(c,r),fraction=coastCoverageClass(c,r);
      return {c,r,owner:null,terrain:fraction===0?'sea':
        fraction===1?'coast':landscape(p)};
    });
    const excludedLand=new Uint8Array(g.tiles.length);
    // Audit connectivity: a ship may use sea and mixed-coast cells only.
    // No artificial inland sea lanes or shortcuts across Brazilian land.
    for(const [name,lon,lat,owner,tier,fort] of CITIES){
      // Harbour cities must have an adjacent sea hex: preserve actual port
      // accessibility rather than linking city and shipyard across two hexes.
      const coastal=Object.prototype.hasOwnProperty.call(PORTS,name);
      const at=nearest(g,locate(lon,lat),t=>t.terrain!=='sea'&&
        (!coastal||E.adjacent(g,t).some(n=>n.terrain==='sea'))&&
        !g.stations.some(s=>s.c===t.c&&s.r===t.r),9);
      if(!at)throw Error('Cannot place Brazilian city '+name);
      const capital=name==='Brasília';
      const shield=E.scenarioCityDefenseHP(tier, !!fort, name);
      g.stations.push({id:g.stations.length,name,c:at.c,r:at.r,owner,tier,
        capital,capitalOf:capital?owner:null,fort:!!fort,
        gun:fort?name+' Coastal Defence Battery':null,lab:0,refinery:0,
        shield,maxShield:shield,
        income:Math.round((capital?48:tier===3?30:tier===2?20:12)*.55),
        industry:Math.round((capital?25:6*tier)*.55),
        science:Math.round((1+tier)*.55),producedTurn:0});
      // Do not overwrite a mixed-coast designation for a harbour.
    }
    // Territories receive provinces from the nearest city on their connected landmass.
    const components=new Int16Array(g.tiles.length).fill(-1);
    let id=0;
    for(let i=0;i<g.tiles.length;i++){
      if(g.tiles[i].terrain==='sea'||components[i]>=0)continue;
      const q=[g.tiles[i]];components[i]=id;
      for(let k=0;k<q.length;k++)for(const n of E.adjacent(g,q[k])){
        const j=n.r*COLS+n.c;
        if(n.terrain==='sea'||components[j]>=0)continue;
        components[j]=id;q.push(n);
      }
      id++;
    }
    const byComponent=new Map();
    for(const s of g.stations){
      const k=components[s.r*COLS+s.c];
      if(!byComponent.has(k))byComponent.set(k,[]);
      byComponent.get(k).push(s);
    }
    for(const t of g.tiles)if(t.terrain!=='sea'){
      const eligible=byComponent.get(components[t.r*COLS+t.c])||g.stations;
      let city=null,d=Infinity;
      for(const s of eligible){
        const next=E.distance(t,s,g);
        if(next<d){d=next;city=s;}
      }
      t.owner=city.owner;t.provinceCity=city.id;
    }
    const groupByCity=new Map();
    function group(side,name){
      const k=side+':'+name;
      if(!groupByCity.has(k)){
        const gr={id:'army-'+groupByCity.size,side,name:name+' Command',
          origin:name,units:[]};
        groupByCity.set(k,gr);g.scenario.groups.push(gr);
      }
      return groupByCity.get(k);
    }
    for(const [side,name,cls,count,commander] of ARMY_GROUPS){
      if(side==='eu')continue; // Invaders deploy offshore.
      const s=g.stations.find(v=>v.name===name);
      if(!s||s.owner!==side)throw Error('Invalid staging city '+name);
      for(let i=0;i<count;i++){
        const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&
          t.owner===side&&(!E.stationAt(g,t)||E.stationAt(g,t).owner===side),10);
        if(!at)throw Error('Cannot deploy unit at '+name);
        const cmd=i===0?commander:null;
        const stack=i===0?2:1;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,at.c,at.r,stack,cmd);
        group(side,name).units.push(u.id);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
      }
    }
    const taken=new Set();
    for(const [name,level] of Object.entries(PORTS)){
      const s=g.stations.find(v=>v.name===name);
      const at=E.adjacent(g,s).filter(t=>t.terrain==='sea'&&!taken.has(E.key(t)))
        .sort((a,b)=>E.adjacent(g,b).filter(n=>n.terrain==='sea').length-
          E.adjacent(g,a).filter(n=>n.terrain==='sea').length)[0];
      if(!at)throw Error('Cannot place naval port '+name);
      s.portAt={c:at.c,r:at.r};s.portLevel=level;s.portOwner=s.owner;
      taken.add(E.key(at));
    }
    for(const [side,name,lon,lat,type,count] of FLEETS){
      const s=side==='britannia'?g.stations.find(v=>v.name===name):null;
      const anchor=s||locate(lon,lat);
      if(!E.TYPES[type]?.naval)throw Error('Invalid Brazil fleet type '+type);
      const fleet={id:'fleet-'+g.scenario.groups.length,side,
        name:name+' Fleet',origin:name,units:[]};
      for(let i=0;i<count;i++){
        const at=nearest(g,anchor,t=>t.terrain==='sea'&&!E.unitAt(g,t)&&
          !g.stations.some(v=>v.portAt?.c===t.c&&v.portAt?.r===t.r),18);
        if(!at)throw Error('Cannot deploy navy at '+name);
        const ship=E.newUnit(g,type,side,at.c,at.r);
        if(side==='eu')ship.invasionGroup=name;
        fleet.units.push(ship.id);
      }
      g.scenario.groups.push(fleet);
    }
    // Load all 42 Europian land formations into offshore carriers before turn one.
    const carriers=g.units.filter(u=>u.side==='eu'&&E.TYPES[u.type].naval==='ship');
    const passengers=[];
    for(const [side,name,cls,count,commander] of ARMY_GROUPS){
      if(side!=='eu')continue;
      for(let i=0;i<count;i++){
        const ship=carriers.find(v=>v.invasionGroup===name&&
          (v.pendingPassengers||0)<E.TYPES[v.type].capacity);
        if(!ship)throw Error('Not enough carrier capacity in '+name);
        ship.pendingPassengers=(ship.pendingPassengers||0)+1;
        const cmd=i===0?commander:null;
        const u=E.newUnit(g,E.typeFor(side,cls,g),side,ship.c,ship.r,i===0?2:1,cmd);
        if(cmd&&g.officers[cmd]){u.cmdRank=g.officers[cmd].rank;u.hp=E.maxHP(u);}
        passengers.push({ship,u});
        group(side,name).units.push(u.id);
      }
    }
    if(difficulty==='elite')E.prepareEliteEurope(g);
    for(const {ship,u} of passengers){
      (ship.cargo||=[]).push(u);
      g.units.splice(g.units.indexOf(u),1);
    }
    for(const ship of carriers)delete ship.pendingPassengers;
    // Keep all six Atlantic invasion corridors navigable.
    const depth=new Int16Array(g.tiles.length).fill(-1),q=[];
    for(const t of g.tiles)if(t.terrain!=='sea'){
      depth[t.r*COLS+t.c]=0;q.push(t);
    }
    for(let i=0;i<q.length;i++){
      const t=q[i],d=depth[t.r*COLS+t.c];
      if(d>=30)continue;
      for(const n of E.adjacent(g,t)){
        const j=n.r*COLS+n.c;
        if(n.terrain==='sea'&&depth[j]===-1){depth[j]=d+1;q.push(n);}
      }
    }
    for(const t of g.tiles)if(t.terrain==='sea'&&
      (excludedLand[t.r*COLS+t.c]||depth[t.r*COLS+t.c]<0||
       depth[t.r*COLS+t.c]>30))t.terrain='offmap';
    // No scripted Sakuradite site: standard research and refinery balance.
    for(const side of SIDES){
      const factor=side===player||!E.foe(g,side,player)?1:['challenge','elite'].includes(difficulty)?1.6:
        difficulty==='hard'?1.3:1;
      const base=E.income(g,side);
      g.scenario.funding[side]=Object.fromEntries(
        Object.entries(FUNDING[side]).map(([resource,n])=>
          [resource,Math.round(n*factor)-base[resource]]));
      const actual=E.income(g,side);
      for(const resource of Object.keys(FUNDING[side]))
        g.economy[side][resource]=actual[resource]*(side==='britannia'?2:3);
    }
    if(difficulty!=='normal'&&difficulty!=='elite'){
      for(const side of SIDES.filter(v=>E.foe(g,v,player)))
        for(const [i,u] of g.units.flatMap(v=>[v,...(v.cargo||[])])
          .filter(v=>v.side===side&&E.TYPES[v.type].naval!=='ship').entries())
          if(difficulty==='challenge'||i%2===0){u.stack=Math.min(3,u.stack+1);u.hp=E.maxHP(u);}
    }
    g.startUnits=Object.fromEntries(SIDES.map(s=>[s,g.units.reduce((n,u)=>
      n+(u.side===s?1:0)+(u.cargo||[]).filter(v=>v.side===s).length,0)]));
    E.log(g,'Europia launches six carrier-supported landings on Britannian Brazil without mainland cities.',player);
    return g;
  }
  function onTurn(){return false;}
  function strategicScore(g,side){
    return g.stations.filter(s=>s.owner===side).reduce((n,s)=>n+s.tier,0);
  }
  function objective(g,side=g.player){
    const brit=g.stations.filter(s=>s.owner==='britannia').length;
    const eu=g.stations.filter(s=>s.owner==='eu').length;
    return side==='eu'?'Land forces and conquer all '+CITIES.length+' cities ('+brit+' remain Britannian).':
      'Defend ports and cities; destroy the expedition ('+eu+' cities lost).';
  }
  function winner(g){
    if(g.mode!=='scenario'||g.scenario?.id!=='invasion-brazil'||g.stations.length!==CITIES.length)return null;
    const brit=g.stations.some(s=>s.owner==='britannia'),
          eu=g.stations.some(s=>s.owner==='eu'),
          invaders=g.units.some(u=>u.side==='eu'&&u.hp>0);
    if(!brit)return {winner:'eu',team:'eu',reason:'Europia has conquered every Brazilian city.'};
    if(!eu&&!invaders)return {winner:'britannia',team:'britannia',
      reason:'Britannia has destroyed the EU invasion force.'};
    return null;
  }
  const api={id:'invasion-brazil',title:'Invasion of Brazil',cols:COLS,rows:ROWS,
    sides:SIDES,bounds:BOUNDS,cityData:CITIES,armyGroups:ARMY_GROUPS,
    fleetData:FLEETS,ports:PORTS,create,onTurn,objective,winner,strategicScore,orderGroup};
  api.meta={map:{centreSampled:true,overlays:['regionalRivers']},
    elite:true,expeditionSide:'eu',
    text:{
      era:"Brazil · Alternate 2017",
      intro:"Europia United begins with no Brazilian cities and launches six major transatlantic naval landings against Britannia. Total conquest of all 57 cities wins without a turn limit.",
      diplomacy:"E.U. and Britannia are hostile from turn 1; EU fleets carry the entire first landing force. Capturing coastal ports creates forward bases for inland operations.",
      elite:"Elite Brazil replaces eligible land formations with standard faction Elite Forces; carriers remain conventional. AI commander and production scaling follow standard scenario Elite rules.",
      focus:{
        eu:"",
        britannia:"Brasília"
      }
    },
    blurbs:{
      eu:"Launch six carrier-supported landing fronts from the Atlantic. Take Belém, Fortaleza, Recife, Salvador, Rio and the south; secure ports and advance inland to Brasília and beyond.",
      britannia:"Defend all 57 Brazilian cities. Use the fortified ports, Amazon forests and central highlands to defeat the incoming fleets and counterattack occupied beaches."
    }};
  E.scenarios={...(E.scenarios||{}),brazil:api,
    byId:{...(E.scenarios?.byId||{}),'invasion-brazil':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

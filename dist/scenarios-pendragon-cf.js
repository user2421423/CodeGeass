/* Battle of Pendragon — Chinese Federation's western finale.
   Depends on scenarios-pendragon.js for one shared WGS84 capital map.
   Include this after the E.U. module when the campaign integrator enables it. */
(function(root){
'use strict';
const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
const shared=root.PENDRAGON_SHARED||(typeof require==='function'
  ?(require('./scenarios-pendragon.js'),root.PENDRAGON_SHARED):null);
if(!E||!shared)throw Error('cf-pendragon requires scenarios-pendragon.js to be loaded first');
const STAGING=new Set(["Reno","Carson City","Truckee","South Lake Tahoe","Fallon","Hawthorne","Bridgeport","Lee Vining","Mammoth Lakes","Bishop","Big Pine","Independence","Lone Pine","Ridgecrest","Mojave","Dyer","Gabbs","Fernley","Lovelock"]);
const CHINESE_ARMIES=[["cf","Reno","heavy",10,"xingke"],["cf","Reno","rocket",7,null],["cf","Carson City","heavy",9,"xianglin"],["cf","Carson City","siege",6,null],["cf","Truckee","heavy",7,"honggu"],["cf","Truckee","assault",6,null],["cf","South Lake Tahoe","heavy",7,null],["cf","Fallon","heavy",10,"cao"],["cf","Fallon","rocket",7,null],["cf","Gabbs","heavy",9,"gaohai"],["cf","Gabbs","siege",6,null],["cf","Hawthorne","heavy",10,"zhaohao"],["cf","Hawthorne","rocket",7,null],["cf","Bridgeport","assault",7,null],["cf","Lee Vining","medium",6,null],["cf","Mammoth Lakes","heavy",9,"leifeng"],["cf","Mammoth Lakes","siege",6,null],["cf","Bishop","heavy",11,"meiling"],["cf","Bishop","rocket",8,null],["cf","Big Pine","heavy",7,null],["cf","Dyer","assault",7,null],["cf","Independence","heavy",9,"lifeng"],["cf","Independence","rocket",7,null],["cf","Lone Pine","heavy",7,null],["cf","Lone Pine","siege",5,null],["cf","Ridgecrest","heavy",10,"rakshata"],["cf","Ridgecrest","rocket",7,null],["cf","Mojave","assault",6,null],["cf","Mojave","medium",5,null],["cf","Fernley","heavy",10,null],["cf","Lovelock","rocket",6,null]];
const WEST_DEFENSE=[["britannia","Pendragon","heavy",13,"suzaku"],["britannia","Pendragon","rocket",9,"bismarck"],["britannia","Pendragon","siege",7,null],["britannia","Imperial Citadel","heavy",12,"cornelia"],["britannia","Imperial Citadel","siege",8,"schneizel"],["britannia","Imperial Air Command","heavy",10,"gino"],["britannia","Imperial Air Command","rocket",7,null],["britannia","Royal Arsenal","heavy",9,"jeremiah"],["britannia","Royal Arsenal","support",6,null],["britannia","Western Imperial Gate","heavy",14,"guilford"],["britannia","Western Imperial Gate","rocket",9,"darlton"],["britannia","Western Imperial Gate","siege",7,null],["britannia","Northern Imperial Gate","heavy",12,"anya"],["britannia","Northern Imperial Gate","rocket",8,null],["britannia","Southern Imperial Gate","heavy",9,"villetta"],["britannia","Eastern Imperial Gate","heavy",7,"oldrin"],["britannia","Tonopah","heavy",10,"nonette"],["britannia","Tonopah","rocket",7,null],["britannia","Goldfield","heavy",10,"kewell"],["britannia","Goldfield","siege",6,null],["britannia","Lida","heavy",8,null],["britannia","Lida","rocket",5,null],["britannia","Silver Peak","heavy",8,"dorothea"],["britannia","Round Mountain","heavy",9,null],["britannia","Round Mountain","rocket",6,null],["britannia","Austin","heavy",8,"manfredi"],["britannia","Austin","rocket",6,null],["britannia","Eureka","heavy",8,"augustus"],["britannia","Eureka","siege",6,null],["britannia","Warm Springs","heavy",7,null],["britannia","Beatty","heavy",7,null],["britannia","Rachel","heavy",8,null],["britannia","Las Vegas","heavy",8,null],["britannia","Nellis Air Base","rocket",6,null],["britannia","Indian Springs","heavy",7,null],["britannia","Pahrump","heavy",6,null],["britannia","Amargosa Valley","rocket",6,null],["britannia","Winnemucca","heavy",7,null],["britannia","Elko","heavy",5,null]];
const FRONTS=[
 {name:'Northwestern Basin Advance',side:'cf',bases:['Reno','Fallon','Gabbs','Carson City'],goal:'Northern Imperial Gate'},
 {name:'Sierra and Owens Valley Offensive',side:'cf',bases:['Truckee','Mammoth Lakes','Bishop','Dyer'],goal:'Western Imperial Gate'},
 {name:'Southwestern Armored Breakthrough',side:'cf',bases:['Independence','Lone Pine','Ridgecrest','Mojave'],goal:'Southern Imperial Gate'},
 {name:'Western Imperial Defense',side:'britannia',bases:['Western Imperial Gate','Goldfield','Lida','Silver Peak'],goal:'Western Imperial Gate'},
 {name:'Imperial Mobile Counteroffensive',side:'britannia',bases:['Pendragon','Imperial Air Command','Tonopah'],goal:'Hawthorne'}
];
const api=shared.defineScenario({
 id:'cf-pendragon',title:'Battle of Pendragon — Western Offensive',
 attacker:'cf',staging:STAGING,armies:CHINESE_ARMIES,defense:WEST_DEFENSE,
 funding:{cf:{credits:1920,industry:1370,science:150,sakuradite:85},
  britannia:{credits:2160,industry:1510,science:166,sakuradite:102}},
 startingSeed:201798,operationKey:'pendragon-west',approach:'west',
 fronts:FRONTS,
 counterattackBases:['Lida','Tonopah','Goldfield','Pendragon','Round Mountain'],
 openingText:'Chinese Federation Army Groups converge from California, western Nevada and the Owens Valley. Britannian strategic reserves counterattack the western siege lines.',
 attackerVictory:'The Chinese Federation has conquered Pendragon and every remaining Britannian city from the west.'
});
api.meta={terrainCosts:{mountain:2},map:{centreSampled:true,overlays:['roads']},
  elite:true,expeditionSide:'cf',
  text:{terrain:'Mountains cost 2 movement; plains and marked passes cost 1. Float units ignore the extra terrain cost.',
    era:"Pendragon · Chinese Western Finale",
    intro:"China attacks the imperial capital from California and western Nevada, facing powerful Britannian defenses. Capture all enemy cities.",
    diplomacy:"The Great Basin and imperial fortress system shape the final offensive; no turn cap or capital-only victory.",
    elite:"Existing Chinese Federation and Britannian Elite Force roster and commander rules apply.",
    focus:{
      cf:"Reno",
      britannia:"Pendragon"
    }
  },
  blurbs:{
    cf:"Attack eastward from California and western Nevada with massive Chinese Army Groups to conquer every imperial city.",
    britannia:"Hold the western and northern imperial defenses against the Federation."
  }};
E.scenarios={...(E.scenarios||{}),pendragonCF:api,
 byId:{...(E.scenarios?.byId||{}),'cf-pendragon':api}};
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

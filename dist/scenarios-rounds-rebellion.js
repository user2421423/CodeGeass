/* What if Bismarck's Knights of the Round reached Pendragon in strength? */
(function(root){'use strict';
const define=root.KNIGHTMARE_ALT_HISTORY?.define||
 (typeof require==='function'?require('./scenarios-alternate-common.js').define:null);
define({
 id:'rounds-rebellion',parent:'eu-pendragon',title:'Knights of the Round Rebellion',
 phase:'imperial-succession-war',
 map:{eu:'rounds',britannia:'britannia'},
 equipment:{rounds:'britannia',britannia:'britannia'},
 reinforcements:{rounds:42},
 commanders:{
  rounds:['bismarck','gino','dorothea','monica','luciano','nonette','anya'],
  britannia:['lelouch','suzaku','jeremiah','villetta','guilford','oldrin','marrybell']
 },
 opening:'Bismarck and the Knights of the Round have assembled a field army against Emperor Lelouch. Suzaku and the imperial guard defend Pendragon.',
 text:{
  era:'Pendragon · Alternate 2018 a.t.b.',
  intro:'Bismarck unites the Knights of the Round, gathers reinforcements in Utah, and marches toward Pendragon rather than losing to Suzaku in a single encounter.',
  diplomacy:'Emperor Lelouch and the Knights of the Round are at war from turn one. Neither side has allies.',
  elite:'Elite deploys faction-appropriate Britannian Elite Frames and keeps the familiar scenario research, single-frame and commander rules.',
  focus:{rounds:'Tooele',britannia:'Pendragon'}
 },
 blurbs:{
  rounds:'Lead Bismarck, Gino and the other Round Knights against Lelouch’s capital fortifications.',
  britannia:'Defend Emperor Lelouch with Suzaku and Jeremiah against the rebel knights.'
 }
});})(typeof window!=='undefined'?window:globalThis);

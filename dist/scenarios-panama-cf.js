/* Chinese Federation Pacific Invasion of Panama.
   Loaded after panama-landmask.js and scenarios-panama.js.
   The scenario owns no map copy: geography, canal, city and port
   geometry are shared with the preserved eu-panama runtime scenario. */
(function(root){
  'use strict';
  const E=root.Knightmare||(typeof require==='function'?require('./engine.js'):null);
  const shared=E?.scenarios?.byId?.['eu-panama']||
    (typeof require==='function'?require('./scenarios-panama.js'):null);
  if(!shared?.createVariant)throw Error('Load scenarios-panama.js before scenarios-panama-cf.js');
  const api=shared.createVariant('cf');
  api.meta={map:{centreSampled:true},
    elite:true,expeditionSide:'cf',
    text:{
      era:"Panama · Chinese Pacific Offensive",
      intro:"The Chinese Federation invades Britannian Panama exclusively from the Pacific. Seize every city and the canal without a turn limit.",
      diplomacy:"Chinese Pacific carrier forces land around Balboa and Panama City; the canal is navigable and ports are independently capturable.",
      elite:"Standard Federation and Britannian Elite Forces with existing level and recruitment rules; carriers remain conventional.",
      focus:{
        cf:"",
        britannia:"Panama City"
      }
    },
    blurbs:{
      cf:"Seize Balboa and Panama City by carrier-led invasion from the Pacific only, then fight toward Colon.",
      britannia:"Defend the Pacific canal mouth, lock system, Panama City and Colon."
    }};
  E.scenarios={...(E.scenarios||{}),byId:{
    ...(E.scenarios?.byId||{}),'cf-panama':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

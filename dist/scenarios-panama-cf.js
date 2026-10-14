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
  E.scenarios={...(E.scenarios||{}),byId:{
    ...(E.scenarios?.byId||{}),'cf-panama':api}};
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

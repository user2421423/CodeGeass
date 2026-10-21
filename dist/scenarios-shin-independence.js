/* Shin Hyuga breaks with the Holy Britannian Empire instead of only the E.U. */
(function(root){'use strict';
const define=root.KNIGHTMARE_ALT_HISTORY?.define||
 (typeof require==='function'?require('./scenarios-alternate-common.js').define:null);
define({
 id:'shin-independence',parent:'european-war',title:'Euro-Britannian Independence',
 phase:'shin-secession',
 map:{eu:'britannia',eb:'shinregime'},
 equipment:{britannia:'britannia',shinregime:'eb'},
 reinforcements:{britannia:26},
 commanders:{
  shinregime:['shin','ashley','manfredi','farnese','augustus'],
  britannia:['suzaku','schneizel','cornelia','julius','guilford','darlton','oldrin','marrybell']
 },
 // The Empire's own Knights keep the Lancelots and Mordred.
 exclusiveElites:{lancelot:'britannia',lancelot_albion:'britannia',mordred:'britannia'},
 opening:'Shin declares an independent Euro-Britannian state. Britannian expeditionary armies advance into his territory from western European bridgeheads.',
 text:{
  era:'Europe · Alternate 2017 a.t.b.',
  intro:'Shin Hyuga’s coup succeeds. His Euro-Britannian breakaway regime fights the Holy Britannian Empire itself, with no E.U. combatant.',
  diplomacy:'The Holy Britannian Empire and Shin’s independent regime are the only two warring factions.',
  elite:'Both sides recruit Britannian Elite Knightmares. Naval units and elite commander upgrades follow standard regional Elite rules.',
  focus:{britannia:'Paris',shinregime:'Minsk'}
 },
 blurbs:{
  britannia:'Restore imperial control in eastern Europe with expeditionary armies led by Britannian commanders.',
  shinregime:'Hold the eastern fortresses of Euro Britannia and counterattack with Shin’s Holy Order of Michael.'
 }
});})(typeof window!=='undefined'?window:globalThis);

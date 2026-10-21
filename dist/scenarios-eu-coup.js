/* Alternate history: Leila and Akito lead the E.U. restoration against the
   victorious Smilas military coup. No third-party Euro Britannian force. */
(function(root){'use strict';
const define=root.KNIGHTMARE_ALT_HISTORY?.define||
 (typeof require==='function'?require('./scenarios-alternate-common.js').define:null);
define({
 id:'eu-military-coup',parent:'european-war',
 title:'E.U. Military Coup — Smilas vs Leila',phase:'eu-republican-restoration',
 // Smilas's junta seizes Paris and the western industrial core. In this
 // divergent timeline an E.U. eastern offensive had pushed out Euro Britannia;
 // its victorious eastern troops now rally to Leila against Smilas.
 map:{eu:'junta',eb:'eu'},
 equipment:{junta:'eu',eu:'eu'},
 reinforcements:{junta:26},
 commanders:{
   eu:['leila','akito','ryo','ayano','yukiya','anna','klaus','oscar','ferilli'],
   junta:['smilas','olivia','eduardo','romero','fernando','marirrosa','pierre']
 },
 // Leila's and Akito's personal machines stay with the republic.
 exclusiveElites:{leila_alexander:'eu',akito_liberte:'eu'},
 opening:'After conquering Paris, Gene Smilas declares his military dictatorship. Leila Malcal and Akito Hyuga lead the returning eastern field army to restore the E.U. republic.',
 text:{
   era:'Europia · Alternate 2017 a.t.b.',
   intro:'Smilas succeeds in his Paris coup and declares a military dictatorship. The victorious eastern E.U. army refuses his orders and rallies around Leila Malcal and Akito Hyuga.',
   diplomacy:'Europian Republican Loyalists versus Smilas’s Military Junta. Both sides use E.U. equipment; the E.U. and Euro Britannia are no longer fighting each other in this alternate timeline.',
   elite:'Both armies recruit Europian Elite Knightmares, including Alexander variants and Panzer-Hummel units, using the standard regional Elite rules.',
   focus:{eu:'Minsk',junta:'Paris'}
 },
 blurbs:{
   eu:'Lead Leila, Akito and the wZERO veterans westward to restore the Europian republic.',
   junta:'Command Smilas’s fortified capital and western industrial armies to suppress the Republican restoration.'
 }
});
})(typeof window!=='undefined'?window:globalThis);

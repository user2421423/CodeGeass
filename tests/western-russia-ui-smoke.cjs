#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const sequence=['europe-landmask.js','scenarios-western-russia.js','war-campaign.js','ui/scenario-screens.js'];
let last=-1;
for(const file of sequence){
  const i=html.indexOf('src="'+file+'"');
  assert(i>last,'Missing or incorrect script ordering '+file);
  last=i;
}
const scenarioUI=fs.readFileSync(path.join(root,'dist/ui/scenario-screens.js'),'utf8');
const sandbox=vm.createContext({});
vm.runInContext(scenarioUI,sandbox);
const kinds=vm.runInContext('SCENARIO_KINDS',sandbox);
assert(kinds.some(row=>row[0]==='britannia-western-russia'));
const info=vm.runInContext('SCENARIO_TEXT["britannia-western-russia"]',sandbox);
assert.deepEqual(Object.keys(info.focus).sort(),['britannia','eu']);
const turns=fs.readFileSync(path.join(root,'dist/ui/turns.js'),'utf8');
assert(turns.includes("founded?'Euro Britannia Established'"));
const geography=fs.readFileSync(path.join(root,'dist/ui/geography.js'),'utf8');
assert(geography.includes("g.scenario?.id==='britannia-western-russia'"));
const E=require('../dist/engine.js');
require('../dist/europe-landmask.js');
const model=require('../dist/scenarios-western-russia.js');
assert.equal(E.scenarios.byId['britannia-western-russia'],model);
const WC=require('../dist/war-campaign.js');
assert.equal(WC.ALL['britannia-western-russia'].scenarioId,model.id);
const infoLaunch=WC.launch(WC.testFixture('britannia',5),'britannia',
  'britannia-western-russia',E.scenarios.byId);
assert.equal(infoLaunch.ok,true);
assert.equal(infoLaunch.battleSide,'britannia');
console.log('WESTERN_RUSSIA_UI_SMOKE '+JSON.stringify({registered:true,
  scenarioSelection:true,scriptOrder:true,riverOverlay:true,
  campaignLaunchWithCompletedPrerequisites:true,victoryScreen:true}));

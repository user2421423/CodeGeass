#!/usr/bin/env node
'use strict';
// Architecture-level checks; regional combat modules are not built yet.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const WC=require('../dist/war-campaign.js');
const key='federation-eu';
const expected=[
  ['australia',1,'war-for-australia'],
  ['area-18',1,'area-18'],
  ['division-japan',1,'division-japan'],
  ['siberia',2,'cf-eu-siberia'],['caucasus',2,'cf-eu-caucasus'],
  ['turkey',3,'cf-eu-turkey'],['volga',3,'cf-eu-volga'],['suez',3,'cf-eu-suez'],
  ['moscow',4,'cf-eu-moscow'],['balkans',4,'cf-eu-balkans'],['north-africa',4,'cf-eu-north-africa'],
  ['central-europe',5,'cf-eu-central-europe'],['france',6,'cf-eu-france'],
];
assert(WC.FACTIONS.includes(key),'Campaign selector missing');
assert.deepEqual([WC.CAMPAIGN_INFO[key].side,WC.CAMPAIGN_INFO[key].opponent],['cf','eu']);
assert.deepEqual(WC.registry[key].map(t=>t.missions.length),[3,2,3,3,1,1]);
const all=WC.registry[key].flatMap(t=>t.missions);
assert.equal(all.length,13);
for(let i=0;i<expected.length;i++){
  const [name,tier,runtime]=expected[i],m=all[i];
  assert.equal(m.id,key+'-'+name);
  assert.equal(m.tier,tier);
  assert.equal(m.battleSide,'cf');
  assert.equal(m.campaignFaction,key);
  assert.equal(m.scenarioId,runtime);
  assert.equal(m.status,'implemented');
  assert.equal(m.final,i===12);
  assert.equal(WC.ALL[m.id],m);
  assert.equal(m.marker.length,2);
  assert.equal(m.bounds.length,4);
  assert(WC.regionContains(m,...m.marker),'Marker is outside region: '+m.id);
}
assert.equal(new Set(all.map(x=>x.id)).size,13);
assert.equal(all.filter(x=>x.status==='planned').length,0);
assert.equal(WC.PLACEHOLDERS.filter(x=>x.campaignFaction===key).length,0);
const progress=WC.testFixture(key,2);
assert.equal(WC.unlockedTier(progress,key),2);
assert.equal(WC.state(progress,key,key+'-siberia'),'available');
assert.equal(WC.launch(progress,key,key+'-siberia',{'cf-eu-siberia':{sides:['cf','eu'],create(){return {};}}}).ok,true);
const storageMap=new Map(),storage={
 getItem(k){return storageMap.get(k)||null;},setItem(k,v){storageMap.set(k,v);}
};
const old={version:1,selectedFaction:'britannia',completed:{
  eu:{},britannia:{},'britannia-federation':{},'federation-britannia':{},'eu-federation':{}
}};
storage.setItem(WC.STORAGE_KEY,JSON.stringify(old));
assert.equal(WC.load(storage).selectedFaction,'britannia');
assert.deepEqual(WC.load(storage).completed[key],{});
assert(WC.chooseFaction(storage,key));
assert.equal(WC.load(storage).selectedFaction,key);
assert.equal(WC.recordVictory(storage,{
  warCampaign:{faction:key,missionId:key+'-france',scenarioId:'operation-stonehenge',battleSide:'cf'},
  mode:'scenario',scenario:{id:'operation-stonehenge'},player:'cf',over:{winner:'cf'}
}).ok,false,'Unbuilt France mission must not credit victory');
for(const unchanged of ['eu-pendragon-east','britannia-stonehenge','eu-federation-luoyang',
  'britannia-federation-luoyang','federation-britannia-pendragon-west']){
  assert(WC.ALL[unchanged]&&WC.ALL[unchanged].status==='implemented',unchanged);
}
assert.equal(WC.regionContains(WC.ALL[key+'-central-europe'],13.4,52.5),false,
  'Berlin must not count as Central Europe');
assert.equal(WC.regionContains(WC.ALL[key+'-central-europe'],11.58,48.13),false,
  'Munich must not count as Central Europe');
assert.equal(WC.regionContains(WC.ALL[key+'-france'],2.35,48.85),true,
  'Paris must lie inside French final region');
const routes=fs.readFileSync(require('node:path').join(__dirname,'../dist/ui/war-campaign-screen.js'),'utf8');
for(const [start,finish] of [
  ['siberia','volga'],['caucasus','turkey'],['volga','moscow'],['turkey','balkans'],
  ['area-18','suez'],['suez','north-africa'],['north-africa','france'],
  ['moscow','central-europe'],['balkans','central-europe']
]){
 const arrow="['"+key+'-'+start+"','"+key+'-'+finish+"']";
 assert(routes.includes(arrow),'Missing route: '+arrow);
}
assert(!routes.includes("['"+key+"-central-europe','"+key+"-france']"),
  'France must not be presented as a land attack from Central Europe');
console.log('PASS: Federation-vs-E.U. 13 objectives, 3 routes, 10 linked battle IDs, old saves and geography contract');

#!/usr/bin/env node
'use strict';
// Non-destructive six-to-three World Campaign UI compatibility audit.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const WC=require('../dist/war-campaign.js');
const originalKey='knightmare-war-campaign-v1',battleKey='knightmare-war-campaign-battle';
assert.equal(WC.STORAGE_KEY,originalKey,'Never rename legacy progress storage');
assert.equal(WC.BATTLE_KEY,battleKey,'Keep ONE existing Campaign battle save slot');
assert.deepEqual(WC.VISIBLE_FACTIONS,['britannia','eu','cf']);
assert.deepEqual([...WC.FACTIONS].sort(),
 ['britannia','britannia-federation','eu','eu-federation','federation-britannia','federation-eu'].sort());
const expected={
 britannia:['britannia','britannia-federation'],
 eu:['eu','eu-federation'],
 cf:['federation-britannia','federation-eu'],
};
for(const [f,tracks] of Object.entries(expected)){
 assert.deepEqual(WC.frontsFor(f),tracks);
 for(const track of tracks){
  assert.equal(WC.displayFaction(track),f);
  assert.equal(WC.registry[track].length>0,true);
 }
}
const fakeStore=new Map();
const storage={getItem:k=>fakeStore.get(k)||null,setItem:(k,v)=>fakeStore.set(k,v)};
const raw={version:1,selectedFaction:'britannia-federation',completed:
 Object.fromEntries(WC.FACTIONS.map(f=>[f,{}]))};
for(const key of ['britannia-australia','britannia-area-18','britannia-division-japan',
 'britannia-siberia','britannia-federation-luoyang','eu-federation-kazakhstan',
 'federation-eu-france','federation-britannia-hawaii'])
 raw.completed[key.slice(0,key.lastIndexOf('-') )] ||= {};
// Store records with their TRUE historical ledger keys (some IDs are hyphenated).
for(const f of WC.FACTIONS)
 for(const row of WC.registry[f])for(const m of row.missions)
  if(['britannia-australia','britannia-area-18','britannia-division-japan',
      'britannia-siberia','britannia-federation-luoyang','eu-federation-kazakhstan',
      'federation-eu-france','federation-britannia-hawaii'].includes(m.id))
    raw.completed[f][m.id]=true;
storage.setItem(originalKey,JSON.stringify(raw));
// One existing in-progress save, on a legacy Federation-vs-EU mission.
const battle={turn:12,mode:'scenario',scenario:{id:'cf-eu-france'},player:'cf',
 warCampaign:{faction:'federation-eu',missionId:'federation-eu-france',
 scenarioId:'cf-eu-france',battleSide:'cf'}};
storage.setItem(battleKey,JSON.stringify(battle));
let p=WC.load(storage);
assert.equal(p.version,1,'No silent version rewrite');
assert.equal(p.selectedFaction,'britannia-federation','Legacy selected front survives');
assert.equal(WC.preferredFront(p,'britannia'),'britannia-federation');
assert.equal(WC.displayFaction(p.selectedFaction),'britannia');
for(const f of WC.FACTIONS)
 for(const id of Object.keys(raw.completed[f]))
  assert.equal(p.completed[f][id],true,'Legacy objective must not be lost: '+id);
// Completed global wars count for BOTH Britannian fronts without duplicating ledgers.
for(const suffix of ['australia','area-18','division-japan'])
 assert.equal(WC.completed(p,'britannia-federation','britannia-federation-'+suffix),true);
assert.equal(WC.unlockedTier(p,'britannia-federation'),2,
 'Old Britannia global wars unlock the opposing front without a replay');
const totals=WC.factionCompletion(p,'britannia');
const totalMissionCount=expected.britannia.reduce((n,f)=>
 n+WC.registry[f].flatMap(t=>t.missions).length,0);
assert.equal(totals.total,totalMissionCount-3,
 'Three shared opening wars must count ONCE in faction summary');
assert.equal(totals.done,5,'Three shared plus two different front victories');
assert(WC.completedMissionsForFaction(p,'britannia').some(m=>m.id==='britannia-siberia'));
assert(WC.completedMissionsForFaction(p,'britannia').some(m=>m.id==='britannia-federation-luoyang'));
assert.equal(WC.completedMissionsForFaction(p,'cf').some(m=>m.id==='federation-eu-france'),true);
assert.equal(WC.completedMissionsForFaction(p,'cf').some(m=>m.id==='federation-britannia-hawaii'),true);

// Switch each faction and front; never clear ANY prior completion or the battle slot.
for(const f of WC.VISIBLE_FACTIONS)
 for(const front of WC.frontsFor(f)){
  assert.equal(WC.chooseFaction(storage,front),true);
  assert.equal(WC.load(storage).selectedFaction,front);
  assert.equal(WC.preferredFront(WC.load(storage),f),front);
  assert.deepEqual(JSON.parse(storage.getItem(battleKey)),battle,
    'Switching a front must not move or overwrite the old single battle slot');
 }
assert.equal(WC.chooseVisibleFaction(storage,'britannia'),true);
assert.equal(WC.load(storage).selectedFaction,'britannia-federation',
 'Selecting the visible faction restores its last used front');
assert.equal(WC.chooseVisibleFaction(storage,'cf'),true);
assert.equal(WC.load(storage).selectedFaction,'federation-eu');
assert.equal(WC.chooseVisibleFaction(storage,'invalid'),false);

// Mission launch context and credit must remain in original ledger, not 'cf'.
const old=WC.load(storage);
const model={'conquest-indochina':{sides:['britannia','cf'],create(){return {};}}};
const m=WC.ALL['britannia-federation-indochina'];
const started=WC.launch(old,'britannia-federation',m.id,model);
assert.equal(started.ok,true,started.reason);
assert.equal(started.context.faction,'britannia-federation');
assert.equal(started.context.missionId,m.id);
assert.equal(started.context.scenarioId,'conquest-indochina');
assert.equal(started.battleSide,'britannia');
const victory=WC.recordVictory(storage,{
 mode:'scenario',scenario:{id:'conquest-indochina'},player:'britannia',
 over:{winner:'britannia'},warCampaign:started.context,
});
assert.equal(victory.ok,true,victory.reason);
assert.equal(WC.load(storage).completed['britannia-federation'][m.id],true);
assert.equal(WC.load(storage).completed['britannia']?.[m.id],undefined,
 'No renamed or cross-written mission keys');
assert.deepEqual(JSON.parse(storage.getItem(battleKey)),battle,
 'Recording victory never touches existing Campaign battle save');

// Political ownership must include regions won on either rival's front.
const winners=['britannia-siberia','britannia-federation-luoyang'];
const sites=winners.map(id=>{
 const m=WC.ALL[id];let site=null;
 const [lon,lat]=m.marker;
 for(let dy=-3;dy<=3&&!site;dy++)for(let dx=-3;dx<=3&&!site;dx++){
  const x=Math.round(lon+dx),y=Math.round(lat+dy),r=90-y,
        c=Math.round(x+180-0.5-0.5*(r&1)),
        actualLon=-180+c+0.5+0.5*(r&1),actualLat=90-r;
  if(WC.regionContains(m,actualLon,actualLat))site={c,r,terrain:'plains',owner:'eu'};
 }
 assert(site,'Expected political interior for '+id);
 return site;
});
const engine={WORLD:{lon0:-180,lat0:90,dlon:1,dlat:1},
 createGame(){return {tiles:sites.map(t=>({...t})),stations:sites.map((t,i)=>({...t,id:i+1})),
   units:[{id:5}],mapRevision:0};}};
const world=WC.unifiedWorldSnapshot(engine,'britannia',WC.load(storage));
assert.equal(world.tiles.every(t=>t.owner==='britannia'),true,
 'World political colors must contain victories on BOTH fronts');
assert.equal(world.stations.every(t=>t.owner==='britannia'),true,
 'City owners must also reflect victories on both fronts');
assert.deepEqual(world.units,[]);

// Browser wiring sanity checks: only 3 faction tabs, 2 front choices,
// preserved single battle key and faction-independent front resume.
const ui=fs.readFileSync(path.join(__dirname,'../dist/ui/war-campaign-screen.js'),'utf8');
assert(ui.includes('WC.VISIBLE_FACTIONS.map('));
assert(ui.includes('WC.frontsFor(wcFaction).map('));
assert(ui.includes('WC.completedMissionsForFaction(progress,wcFaction)'));
assert(ui.includes('WC.displayFaction(battle.warCampaign?.faction)===wcFaction'));
assert(ui.includes('confirmReplace(WC.BATTLE_KEY,'));
assert(ui.includes('resumeSavedGame(WC.BATTLE_KEY)'));
assert(!ui.includes('WC.FACTIONS.map('),'Six historical tracks should not appear in faction selector');
console.log('Three-faction World Campaign: legacy wins, independent fronts, shared opening wars, political map and SINGLE saved battle: PASS');

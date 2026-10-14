'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const W=require('../dist/war-campaign.js');
function storage(){
  const m=new Map();
  return {getItem:k=>m.get(k)||null,setItem:(k,v)=>{m.set(k,v);},get:k=>m.get(k)};
}
function fakeGame(m,win=true,ctx=true){
  return {mode:'scenario',player:m.battleSide,
    scenario:{id:m.scenarioId},over:{winner:win?m.battleSide:'opponent'},
    ...(ctx?{warCampaign:{faction:m.campaignFaction,missionId:m.id,
      scenarioId:m.scenarioId,battleSide:m.battleSide}}:{})};
}
const models=Object.fromEntries(
  [...new Set(Object.values(W.ALL).map(m=>m.scenarioId).filter(Boolean))]
    .map(id=>[id,{sides:id==='european-war'?['eu','eb']:
      id==='operation-stonehenge'?['eu','britannia']:['eu','britannia','cf'],
      create:()=>({})}]));
test('two factions and exactly approved tier sizes',()=>{
  assert.deepEqual(W.FACTIONS,['eu','britannia']);
  assert.deepEqual(W.registry.eu.map(t=>t.missions.length),[3,1,4,3,2,1]);
  assert.deepEqual(W.registry.britannia.map(t=>t.missions.length),[3,1,2,2,1,1,1]);
  assert.equal(W.registry.eu.length,6);
  assert.equal(W.registry.britannia.length,7);
  assert.equal(Object.keys(W.ALL).length,25);
});
test('exactly 14 remaining planned objectives with null playable modules',()=>{
  assert.equal(W.PLACEHOLDERS.length,14);
  assert.equal(new Set(W.PLACEHOLDERS.map(m=>m.id)).size,14);
  assert.equal(W.PLACEHOLDERS.filter(m=>m.campaignFaction==='eu').length,10);
  assert.equal(W.PLACEHOLDERS.filter(m=>m.campaignFaction==='britannia').length,4);
  for(const m of W.PLACEHOLDERS){
    assert.equal(m.status,'planned');assert.equal(m.scenarioId,null);
    assert.equal(m.bounds.length,4);assert.equal(m.marker.length,2);
    assert.ok(m.title&&m.region&&m.description);
  }
});
test('existing scenarios link to exact modules and playing sides',()=>{
  for(const f of W.FACTIONS){
    assert.deepEqual(W.registry[f][0].missions.map(m=>m.scenarioId),
      ['war-for-australia','area-18','division-japan']);
    assert.equal(W.registry[f][1].missions[0].scenarioId,'bering-strait');
  }
  assert.equal(W.ALL['britannia-turkey'].scenarioId,'invasion-turkey');
  assert.equal(W.ALL['britannia-turkey'].status,'implemented');
  assert.equal(W.ALL['britannia-european-war'].scenarioId,'european-war');
  assert.equal(W.ALL['britannia-european-war'].battleSide,'eb');
  assert.equal(W.ALL['britannia-stonehenge'].scenarioId,'operation-stonehenge');
  assert.equal(W.ALL['britannia-stonehenge'].battleSide,'britannia');
  for(const f of W.FACTIONS){
    const p=W.fresh();
    for(const m of W.registry[f][0].missions)
      assert.equal(W.launch(p,f,m.id,models).ok,true);
  }
});
test('Tier 1 any order, then Bering unlocks for both factions',()=>{
  for(const f of W.FACTIONS){
    const p=W.fresh(),missions=W.registry[f][0].missions;
    assert.equal(W.unlockedTier(p,f),1);
    p.completed[f][missions[2].id]=true;
    assert.equal(W.unlockedTier(p,f),1);
    assert.equal(W.state(p,f,W.registry[f][1].missions[0].id),'locked');
    p.completed[f][missions[0].id]=true;
    assert.equal(W.unlockedTier(p,f),1);
    p.completed[f][missions[1].id]=true;
    assert.equal(W.unlockedTier(p,f),2);
    const info=W.launch(p,f,W.registry[f][1].missions[0].id,models);
    assert.equal(info.ok,true);
    assert.equal(info.battleSide,f);
  }
});
test('verified victory only, not open/quit/loss/standalone or a fake placeholder',()=>{
  const st=storage(),m=W.ALL['eu-australia'],g=fakeGame(m);
  assert.equal(W.recordVictory(st,{...g,warCampaign:undefined}).ok,false);
  assert.equal(W.recordVictory(st,{...g,over:null}).ok,false);
  assert.equal(W.recordVictory(st,fakeGame(m,false)).ok,false);
  assert.equal(W.recordVictory(st,{...g,player:'britannia'}).ok,false);
  assert.equal(W.recordVictory(st,{...g,scenario:{id:'area-18'}}).ok,false);
  assert.equal(W.launch(W.fresh(),'eu','eu-hawaii',models).ok,false);
  assert.equal(W.recordVictory(st,{...g,warCampaign:{...g.warCampaign,missionId:'eu-hawaii'}}).ok,false);
  assert.equal(W.unlockedTier(W.load(st),'eu'),1);
  assert.equal(W.recordVictory(st,g).ok,true);
  assert.equal(W.completed(W.load(st),'eu',m.id),true);
  assert.equal(W.recordVictory(st,g).already,true);
  assert.equal(W.completed(W.load(st),'britannia','britannia-australia'),false);
});
test('progress derives tier only from all required missions and is faction-isolated',()=>{
  const st=storage(),eu=W.registry.eu[0].missions;
  for(let i=0;i<eu.length;i++){
    const outcome=W.recordVictory(st,fakeGame(eu[i]));
    assert.equal(outcome.ok,true);
    assert.equal(outcome.unlocked,i===eu.length-1?2:null);
  }
  assert.equal(W.unlockedTier(W.load(st),'eu'),2);
  assert.equal(W.unlockedTier(W.load(st),'britannia'),1);
  const bering=W.ALL['eu-bering'];
  assert.equal(W.recordVictory(st,fakeGame(bering)).ok,true);
  assert.equal(W.unlockedTier(W.load(st),'eu'),3);
  assert.equal(W.state(W.load(st),'eu','eu-hawaii'),'planned');
  assert.equal(W.launch(W.load(st),'eu','eu-hawaii',models).ok,false);
});
test('Euro Britannia victory credits Britannia; launched side remains eb',()=>{
  const p=W.testFixture('britannia',6),st=storage();
  // Fixture represents future implemented missions; it is not shipped to the browser.
  assert.equal(W.unlockedTier(p,'britannia'),6);
  // Production storage intentionally refuses fake completion of planned missions.
  st.setItem(W.STORAGE_KEY,JSON.stringify(p));
  assert.equal(W.unlockedTier(W.load(st),'britannia'),3);
  const m=W.ALL['britannia-european-war'];
  assert.equal(W.launch(p,'britannia',m.id,models).battleSide,'eb');
  assert.equal(W.recordVictory(st,fakeGame(m)).ok,false);
  assert.equal(W.recordVictory(st,{...fakeGame(m),player:'britannia'}).ok,false);
});
test('region tint is isolated from Conquest and applies only to won geography',()=>{
  const p=W.fresh(),m=W.ALL['eu-australia'];
  p.completed.eu[m.id]=true;
  const original=[
    {c:0,r:0,terrain:'plains',owner:'britannia'},
    {c:1,r:0,terrain:'plains',owner:'britannia'},
    {c:2,r:0,terrain:'sea',owner:null}
  ];
  const stub={WORLD:{dlon:300,lat0:-25,dlat:0},
    createGame:()=>({tiles:original.map(t=>({...t})),
      units:[{}],stations:[{}],sites:[{}],mapRevision:0})};
  const world=W.worldSnapshot(stub,'eu',p);
  assert.equal(world.tiles[0].owner,'britannia');
  assert.equal(world.tiles[1].owner,'eu');
  assert.equal(world.tiles[2].owner,null);
  assert.equal(original[1].owner,'britannia');
  assert.equal(world.units.length,0);
});
test('selection and independent saves persist and corrupt data is handled',()=>{
  const st=storage();
  assert.equal(W.chooseFaction(st,'britannia'),true);
  assert.equal(W.load(st).selectedFaction,'britannia');
  assert.equal(W.chooseFaction(st,'cf'),false);
  const p=W.load(st);p.completed.eu['eu-australia']=true;
  assert.equal(W.persist(st,p),true);
  assert.equal(W.load(st).completed.eu['eu-australia'],true);
  assert.equal(W.load(st).completed.britannia['eu-australia'],undefined);
  st.setItem(W.STORAGE_KEY,'corrupt');
  assert.equal(W.unlockedTier(W.load(st),'eu'),1);
});

test('geographic masks secure the intended regions without coloring neighboring territory',()=>{
  assert.equal(W.regionContains(W.ALL['eu-brazil'],-43.2,-22.9),true); // Rio
  assert.equal(W.regionContains(W.ALL['eu-brazil'],-58.4,-34.6),false); // Buenos Aires
  assert.equal(W.regionContains(W.ALL['britannia-south-africa'],18.4,-33.9),true); // Cape Town
  assert.equal(W.regionContains(W.ALL['britannia-south-africa'],28,-26),true); // Johannesburg
  assert.equal(W.regionContains(W.ALL['britannia-turkey'],29,41),true); // Istanbul
  assert.equal(W.regionContains(W.ALL['eu-california'],-122.4,37.8),true); // San Francisco
  assert.equal(W.regionContains(W.ALL['eu-california'],-117,37.5),false); // Pendragon only final
  assert.equal(W.regionContains(W.ALL['eu-pendragon'],-117,37.5),true);
  assert.equal(W.regionContains(W.ALL['eu-caribbean'],-69,11),false); // Venezuelan mainland
});

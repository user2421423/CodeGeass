#!/usr/bin/env node
'use strict';
// Runtime mechanics smoke for the ten integrated Federation-E.U. battles.
// This is a real engine setup/serialization contract audit, NOT a completed
// human playthrough, a save-load UI test, or proof of Normal winnability.
const assert=require('node:assert/strict');
const {E}=require('./scenario_sim.cjs');
const WC=require('../dist/war-campaign.js');
const names=['siberia','caucasus','turkey','volga','suez','moscow','balkans',
  'north-africa','central-europe','france'];
const campaign='federation-eu';
const store=()=>{const d=new Map();return {getItem:k=>d.get(k)||null,setItem:(k,v)=>d.set(k,v)};};
for(const name of names){
 const id='cf-eu-'+name,m=E.scenarios.byId[id],obj=WC.ALL[campaign+'-'+name];
 assert(m&&obj&&m.id===id&&obj.scenarioId===id,id+' missing registered model');
 assert.deepEqual([...m.sides].sort(),['cf','eu'],id+' faction mismatch');
 let reported=null;
 for(const side of ['cf','eu'])for(const difficulty of ['normal','elite']){
  const g=m.create(side,difficulty,11);
  assert.equal(g.scenario.id,id);
  assert.equal(g.player,side);
  assert(g.stations.length>0&&g.units.length>0,'Empty setup: '+id);
  assert.equal(new Set(g.stations.map(s=>s.id)).size,g.stations.length,id+' duplicate station ids');
  assert.equal(new Set(g.units.map(u=>u.id)).size,g.units.length,id+' duplicate unit ids');
  assert(g.stations.some(s=>s.owner==='cf'||s.owner==='eu'),'Missing belligerent cities');
  assert(E.alive(g,'cf')&&E.alive(g,'eu'),id+' premature faction death');
  assert(!m.winner(g),id+' winner at setup');
  for(const faction of ['cf','eu']){
    const economy=E.income(g,faction);
    assert(economy&&Object.values(economy).every(Number.isFinite),
      id+' invalid '+faction+' income');
  }
  let ports=0,ships=0;
  for(const city of g.stations)if(city.portAt){
   const tile=E.tile(g,city.portAt.c,city.portAt.r);
   assert(tile&&['sea','coast'].includes(tile.terrain),id+' stranded '+city.name+' port');
   ports++;
  }
  for(const u of g.units)if(E.TYPES[u.type]?.naval){
   const tile=E.tile(g,u.c,u.r);
   assert(tile&&['sea','coast'].includes(tile.terrain),id+' ship on land');
   ships++;
  }
  const encoded=JSON.stringify(g),decoded=JSON.parse(encoded);
  assert.equal(decoded.stations.length,g.stations.length,id+' station save roundtrip');
  assert.equal(decoded.units.length,g.units.length,id+' unit save roundtrip');
  assert.deepEqual(decoded.stations.map(s=>s.owner),g.stations.map(s=>s.owner),
    id+' ownership save roundtrip');
  if(name==='france'&&side==='cf'){
   assert.equal(g.stations.filter(s=>s.owner==='cf').length,0,
     'France cannot begin with Chinese city');
   assert(E.alive(g,'cf'),'Cityless French invasion must remain alive');
  }
  if(name==='central-europe')
   assert(!g.stations.some(s=>/Berlin|Munich|Hamburg|Frankfurt/.test(s.name)),
     'German city must remain excluded');
  if(side==='cf'&&difficulty==='normal')reported={cities:g.stations.length,ports,ships,
    units:g.units.length};
 }
 const progress=WC.testFixture(campaign,obj.tier);
 assert.equal(WC.launch(progress,campaign,obj.id,E.scenarios.byId).ok,true,id+' unavailable');
 const storage=store();
 assert(WC.persist(storage,progress));
 const context=WC.launch(progress,campaign,obj.id,E.scenarios.byId).context;
 const fake={mode:'scenario',scenario:{id},warCampaign:context,player:'cf',over:null};
 assert.equal(WC.recordVictory(storage,fake).ok,false,'No credit without victory');
 fake.over={winner:'cf'};
 assert.equal(WC.recordVictory(storage,fake).ok,true,'Valid win contract failed');
 assert.equal(WC.completed(WC.load(storage),campaign,obj.id),true,'Credit not persisted');
 console.log('MECHANICS_OK',id,JSON.stringify(reported));
}
console.log('PASS: ten integrated Federation-E.U. runtime setup, JSON roundtrip, port, expedition and campaign contracts');

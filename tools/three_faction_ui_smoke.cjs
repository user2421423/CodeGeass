#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const WC=require('../dist/war-campaign.js');
const store=new Map();
const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const old=WC.fresh();
old.selectedFaction='britannia-federation';
for(const suffix of ['australia','area-18','division-japan'])
 old.completed.britannia['britannia-'+suffix]=true;
storage.setItem(WC.STORAGE_KEY,JSON.stringify(old));
const battle={turn:17,mode:'scenario',player:'britannia',
 warCampaign:{faction:'britannia',missionId:'britannia-siberia',
 scenarioId:'britannia-siberia',battleSide:'britannia'}};
storage.setItem(WC.BATTLE_KEY,JSON.stringify(battle));
const fields=new Map();
const modal={innerHTML:'',querySelector(selector){
 if(!fields.has(selector))fields.set(selector,{textContent:'',innerHTML:'',clientWidth:900,clientHeight:550,
  isConnected:true,style:{}});
 return fields.get(selector);
}};
let launched=null,resumed=null,confirmKey=null;
const E={FACTIONS:{britannia:{color:'#b68c42',name:'Britannia'},
 eu:{color:'#629ddd',name:'E.U.'},cf:{color:'#65a67f',name:'Chinese Federation'}},
 DIFFICULTIES:{normal:{name:'Normal'},hard:{name:'Hard'},challenge:{name:'Challenge'},elite:{name:'Elite'}},
 scenarios:{byId:{'conquest-indochina':{sides:['britannia','cf'],create(){return {};}}}}};
const context=vm.createContext({
 KnightmareWarCampaign:WC,localStorage:storage,modal,
 game:{mode:'conquest'},E,ART:{flagSVG:()=>'<svg></svg>'},esc:s=>String(s),
 SCENARIO_CATALOG:{'conquest-indochina':{name:'Conquest of Indochina'}},
 pendingEliteChoiceHTML:()=>'',getSave:key=>JSON.parse(storage.getItem(key)||'null'),
 focusDialog:()=>{},toast:()=>{},withGameAssets:(a,b)=>b(),
 prepareScenarioAssets:()=>{},startLoadedScenario:(...args)=>launched=args,
 resumeSavedGame:key=>resumed=key,confirmReplace:(key,kind,action)=>{confirmKey=key;},
 document:{addEventListener:()=>{}},window:{addEventListener:()=>{}},
 GEOGRAPHY:{shapes:{land:[]}},SQ:1,R:1,mapH:()=>10,mapW:()=>10,
});
const ui=fs.readFileSync(path.join(__dirname,'../dist/ui/war-campaign-screen.js'),'utf8');
vm.runInContext(ui+';wcBuildAtlas=()=>{};wcAttach=()=>{};wcDraw=()=>{};',context);
function exec(source){return vm.runInContext(source,context);}
exec('warCampaignDialog()');
assert.equal(exec('wcFaction'),'britannia');
assert.equal(exec('wcFront'),'britannia-federation');
assert.equal((modal.innerHTML.match(/data-wc-faction="/g)||[]).length,3,
 'Exactly three visible factions');
assert.equal((fields.get('#wc-fronts').innerHTML.match(/data-wc-front="/g)||[]).length,2,
 'Exactly two invasion choices');
assert(fields.get('#wc-progress').textContent.includes('both fronts'));
assert(fields.get('#wc-panel').innerHTML.includes('Continue saved battle vs'),
 'An old saved Britannia-vs-E.U. battle is resumable while viewing Britannia-vs-Federation');
exec('wcResume()');
assert.equal(resumed,WC.BATTLE_KEY,'Resume uses unchanged global battle key');
const oldBattle=storage.getItem(WC.BATTLE_KEY);
exec("wcSelectFront('britannia')");
assert.equal(exec('wcFaction'),'britannia');
assert.equal(exec('wcFront'),'britannia');
assert.equal(storage.getItem(WC.BATTLE_KEY),oldBattle);
exec("wcSelectFront('britannia-federation')");
assert.equal(exec('wcFront'),'britannia-federation');
assert.equal(storage.getItem(WC.BATTLE_KEY),oldBattle);
exec("wcSelectFaction('cf')");
assert.equal(exec('wcFaction'),'cf');
assert.equal(exec('wcFront'),'federation-britannia');
assert.equal((modal.innerHTML.match(/data-wc-faction="/g)||[]).length,3);
assert.equal((fields.get('#wc-fronts').innerHTML.match(/data-wc-front="/g)||[]).length,2);
assert(!fields.get('#wc-panel').innerHTML.includes('Continue saved battle vs'),
 'An unfinished Britannia battle is not displayed when China is selected');
exec("wcSelectFaction('britannia')");
assert.equal(exec('wcFront'),'britannia-federation',
 'Returning to Britannia restores its last selected invasion front');
// The same existing confirmReplace gate is used for any new mission.
exec("wcMission='britannia-federation-indochina';wcLaunchLoaded(WC.ALL[wcMission])");
assert.equal(confirmKey,WC.BATTLE_KEY,'No front-specific save key may be created');
assert.equal(launched,null,'Current saved game must not be silently overwritten');
assert.equal(storage.getItem(WC.BATTLE_KEY),oldBattle);
console.log('Three-faction UI: 3 faction buttons, 2 front tabs, legacy resume, one save-replacement gate: PASS');

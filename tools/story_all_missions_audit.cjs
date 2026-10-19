#!/usr/bin/env node
'use strict';
/*
 * Knightmare Conquest Story Mode audit. Run:
 *   node tools/story_all_missions_audit.cjs
 *   node tools/story_all_missions_audit.cjs --seeds 101,202 --campaign britannia_s1
 *
 * Human player is controlled by the same built-in AI used for every opposing
 * side; this is a diagnostic, NOT a human playability or balance guarantee.
 * Gameplay rules, scripted events, production and combat use the real engine.
 */
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
require('../dist/missions.js');
require('../dist/campaign.js');

const campaignList = Object.entries(E.campaign.CAMPAIGNS);
const args = process.argv.slice(2);
const value = key => { const i=args.indexOf(key);return i<0?null:args[i+1]; };
const seeds = (value('--seeds') || '101,202,303,404,505,606,707,808')
  .split(',').map(Number).filter(Number.isFinite);
const onlyCampaign = value('--campaign');
const all = campaignList.filter(([id])=>!onlyCampaign||id===onlyCampaign)
  .flatMap(([campaignId,c])=>c.missions.map(m=>({campaignId,mission:m})));
if (!all.length) throw new Error('No missions selected');
const normWin = win => Array.isArray(win)?win:win?[win]:[];
const cnt = a => a.length;
const ownerCounts = (g,side) => g.units.filter(u=>u.hp>0&&u.side===side).length;
const bySide = arr => arr.reduce((acc,k)=>(acc[k]=(acc[k]||0)+1,acc),{});
function auditDefinition(m) {
 const checks=[], cities=new Set(m.cities.map(c=>c[0])), hero=new Set(
  [...m.units,...(m.events||[]).flatMap(e=>e.spawn||[])].map(s=>s[5]).filter(Boolean));
 const goals=normWin(m.win);
 for(const [kind,conds] of [['win',goals],['lose',normWin(m.lose)],['stars',m.stars||[]]]){
  for(const cond of conds){
   for(const key of ['capture','reach','keep','cities'])
    for(const name of cond[key]||[])
     if(!cities.has(name))checks.push(kind+': unknown '+key+' city '+name);
   if(cond.by&&!hero.has(cond.by))checks.push(kind+': unreachable commander '+cond.by+' absent from initial and event rosters');
   for(const name of cond.kill||[])
    if(!hero.has(name))checks.push(kind+': enemy commander '+name+' missing from initial and event rosters');
  }
 }
 if(m.win?.hold&&m.lose?.turns&&m.lose.turns<m.win.hold)
  checks.push('hold victory later than turn limit');
 const player=m.player;
 const own=m.units.filter(u=>u[0]===player&&!u[6]?.skipNormal).length;
 const hostile=m.units.filter(u=>u[0]!==player&&!u[6]?.normalOnly&&
   (!m.teams || m.teams[u[0]]!==m.teams[player])).length;
 const joined=m.units.filter(u=>u[0]!==player&&!u[6]?.normalOnly&&
   m.teams&&m.teams[u[0]]===m.teams[player]).length;
 return {checks,initial:{own,hostile,allied:joined},objective:JSON.stringify(m.win),
   limit:m.lose?.turns||null,
   eventWaves:(m.events||[]).filter(e=>e.turn&&e.spawn?.length).map(e=>({
    turn:e.turn, sides:bySide(e.spawn.map(u=>u[0]))}))};
}
function play(m,seed){
 let g,started;
 try { g=E.campaign.createMission(m.id,seed,'normal'); }
 catch(e){return {seed,error:'init '+String(e)}; }
 started={own:ownerCounts(g,g.player),hostile:g.units.filter(u=>u.hp>0&&E.foe(g,u.side,g.player)).length};
 const errors=[], captures=[],owner=new Map(g.stations.map(s=>[s.name,s.owner]));
 const limit=m.lose?.turns||(m.win?.hold?m.win.hold+1:24),
       maxTurns=Math.min(55,Math.max(18,limit+3));
 let attacks=0,moveEvents=0,firstPrisonFall=null;
 function observe(){
  for(const s of g.stations) {
   const old=owner.get(s.name);
   if(old!==s.owner){captures.push({turn:g.turn,city:s.name,from:old,to:s.owner});owner.set(s.name,s.owner);}
  }
 }
 for(let turn=1;turn<=maxTurns&&!g.over;turn++){
   g.turn=turn;
   for(let i=0;i<g.order.length&&!g.over;i++){
    const side=g.order[i];
    if(!E.alive(g,side))continue;
    try{
     if(!(turn===1&&i===0))E.beginTurn(g,side,turn>1);
     observe();
     if(g.over)break;
     E.aiProduction(g);
     observe();
     if(g.over)break;
     const ids=g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
       .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id).map(u=>u.id);
     for(let k=0;k<ids.length&&!g.over;k++){
      const j=E.aiNextActor(g,ids,k);
      if(j>k&&j<ids.length)[ids[k],ids[j]]=[ids[j],ids[k]];
      const u=g.units.find(v=>v.id===ids[k]);
      if(!u||u.hp<=0||u.side!==side)continue;
      try{
       const events=E.aiOrder(g,u.id)||[];
       for(const ev of events){if(ev.kind==='attack')attacks++;if(ev.kind==='move')moveEvents++;}
       E.hooks.decide(g);
       observe();
      }catch(e){errors.push('T'+turn+' '+side+': '+String(e));break;}
     }
    }catch(e){errors.push('T'+turn+' '+side+' turn: '+String(e));break;}
    if(errors.length)break;
   }
   if(errors.length)break;
   E.hooks.decide(g);
 }
 return {
   seed,winner:g.over?.winner||null,turn:g.turn,
   reason:g.over?.reason||null,errors,
   start:started,
   playerRemaining:ownerCounts(g,g.player),
   enemyRemaining:g.units.filter(u=>u.hp>0&&E.foe(g,u.side,g.player)).length,
   captures,attacks,moves:moveEvents,
   finalCities:Object.fromEntries(g.stations.map(s=>[s.name,s.owner])),
   objectivesMet:!!g.over&&g.over.winner===g.player
 };
}
const rows=[],problems=[];
for(const {campaignId,mission:m} of all){
 const def=auditDefinition(m),
       trials=seeds.map(seed=>play(m,seed)),
       wins=trials.filter(r=>r.winner===m.player).length,
       losses=trials.filter(r=>r.winner&&r.winner!==m.player).length,
       timeouts=trials.filter(r=>!r.winner&&!r.errors?.length).length,
       errors=trials.filter(r=>r.error||r.errors?.length).length,
       meanWinTurn=wins?+(trials.filter(r=>r.winner===m.player).reduce((a,r)=>a+r.turn,0)/wins).toFixed(1):null,
       decisiveCaptures=trials.reduce((a,r)=>a+(r.captures||[]).filter(x=>x.to===m.player).length,0),
       firstDefeat=Math.min(...trials.filter(r=>r.winner&&r.winner!==m.player).map(r=>r.turn),Infinity);
 const row={campaign:campaignId,id:m.id,title:m.title,player:m.player,
   ...def,wins,losses,timeouts,errors,meanWinTurn,
   firstDefeat:Number.isFinite(firstDefeat)?firstDefeat:null,
   playerCaptures:decisiveCaptures,total:trials.length,
   trials};
 rows.push(row);
 if(def.checks.length) problems.push({id:m.id,checks:def.checks});
 console.log('AUDIT '+campaignId+' '+m.id+' '+wins+'/'+trials.length+' wins; losses='+losses+
   ' unresolved='+timeouts+' errors='+errors+' firstLoss='+row.firstDefeat+
   ' starting='+JSON.stringify(def.initial)+' objective='+def.objective+
   (def.checks.length?' STRUCTURAL='+def.checks.join('|'):''));
}
const groups=Object.entries(bySide(rows.map(x=>x.campaign))).map(([id,num])=>{
 const rs=rows.filter(x=>x.campaign===id);
 return {campaign:id,missions:num,zero:rs.filter(x=>x.wins===0).length,
   low:rs.filter(x=>x.wins>0&&x.wins<=2).length,high:rs.filter(x=>x.wins>=6).length};
});
const json={generated:new Date().toISOString(),mode:'normal',control:'built-in AI on both sides',
  seeds,campaigns:groups,structuralProblems:problems,missions:rows};
const folder=path.join(__dirname,'../audit-output');
fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'story-normal-full-audit.json'),JSON.stringify(json,null,2)+'\n');
const md=[
 '# All-Story Normal Mode Seeded Audit',
 '',
 '**Method:** Full engine, both armies directed by built-in tactical AI; seeded runs. AI win rates are diagnostic and not human-player win rates. No gameplay changes.',
 '',
 'Seeds: '+seeds.join(', ')+'.',
 '',
 '| Campaign | Mission | Friendly / hostile starts | AI wins | First loss turn | Flags |',
 '|---|---|---:|---:|---:|---|',
 ...rows.map(r=>'| '+r.campaign+' | '+r.title.replace(/\|/g,'/')+' ('+r.id+') | '+r.initial.own+' / '+r.initial.hostile+
   ' | '+r.wins+'/'+r.total+' | '+(r.firstDefeat??'—')+' | '+
   ([r.errors?'Engine errors '+r.errors:'',r.timeouts?'Unresolved '+r.timeouts:'',...r.checks].filter(Boolean).join('; ')||'—')+' |'),
 '',
 '## Static problems',
 ...(!problems.length?['None identified by objective-reference check.']:
    problems.map(p=>'- '+p.id+': '+p.checks.join('; '))),
 '',
 '## Interpretation',
 '- A 0/8 AI score is **not** proof of impossibility. AI may fail mission-specific objectives (escort, reach, defend).',
 '- High defense victory rates can reflect AI reluctance to attack. Check scripted goals before balancing.',
 '- The script does not model human micro, Commander active skills or HQ choices intelligently.',
 '- Timed survival operations end on the intended turn via the actual engine.',
 '',
];
fs.writeFileSync(path.join(folder,'story-normal-full-audit.md'),md.join('\n')+'\n');
console.log('AUDIT_SUMMARY '+JSON.stringify(groups));
console.log('AUDIT_STRUCTURAL '+JSON.stringify(problems));
console.log('AUDIT_DONE '+rows.length+' missions; '+seeds.length+' seeds each');

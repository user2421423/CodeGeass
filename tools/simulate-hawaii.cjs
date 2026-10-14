#!/usr/bin/env node
'use strict';
// Focused, one-off Hawaii audit and paired-seed AI playthroughs.
// Deliberately NOT a regression-test suite or part of npm test.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
require('../dist/engine/ai.js');
const Hawaii=require('../dist/scenarios-hawaii.js');
const W=require('../dist/war-campaign.js');
const args=process.argv.slice(2);
const side=args[0]||'eu',seed=Number(args[1]||11),rounds=Number(args[2]||4);
if(!['eu','britannia'].includes(side)||!Number.isSafeInteger(seed)||
   !Number.isInteger(rounds)||rounds<0||rounds>60)throw Error('Invalid simulation arguments');
function audit(g){
  assert.equal(g.stations.length,30);
  assert.equal(g.scenario.id,'invasion-hawaii');
  assert.equal(g.tiles.length,176*114);
  assert.equal(g.stations.filter(s=>s.owner==='eu').length,0);
  assert.equal(g.stations.filter(s=>s.owner==='britannia').length,30);
  assert.equal(g.scenario.airfields.length,7);
  const validTerrain=new Set(['sea','coast','plains','forest','mountain']);
  assert(g.tiles.every(t=>validTerrain.has(t.terrain)));
  const ports=g.stations.filter(s=>s.portAt),seen=new Set();
  assert.equal(ports.length,14);
  for(const s of ports){
    assert.equal(s.portOwner,'britannia');
    assert.equal(s.owner,'britannia');
    assert.equal(E.tile(g,s.portAt.c,s.portAt.r).terrain,'sea');
    assert(E.adjacent(g,s).some(t=>t.c===s.portAt.c&&t.r===s.portAt.r));
    assert(!seen.has(E.key(s.portAt)));
    seen.add(E.key(s.portAt));
  }
  // Every landing route can sail to every military harbour through the same
  // ocean. No artificial land bridges between separate islands.
  const connected=new Set(),sea0=g.tiles.find(t=>t.terrain==='sea');
  const q=[sea0];connected.add(E.key(sea0));
  for(let i=0;i<q.length;i++)for(const t of E.adjacent(g,q[i])){
    if(t.terrain!=='sea'||connected.has(E.key(t)))continue;
    connected.add(E.key(t));q.push(t);
  }
  for(const s of ports)assert(connected.has(E.key(s.portAt)),'isolated port '+s.name);
  const components=new Map(),landVisited=new Set();
  for(const t of g.tiles){
    if(t.terrain==='sea'||landVisited.has(E.key(t)))continue;
    const comp=[],landq=[t];landVisited.add(E.key(t));
    for(let i=0;i<landq.length;i++)for(const n of E.adjacent(g,landq[i])){
      if(n.terrain==='sea'||landVisited.has(E.key(n)))continue;
      landVisited.add(E.key(n));landq.push(n);
    }
    comp.push(...landq);
    const names=g.stations.filter(s=>comp.some(p=>p.c===s.c&&p.r===s.r));
    if(names.length)components.set(names[0].island,{tiles:comp.length,cities:names.length});
  }
  assert.equal(components.size,8,'not eight physically independent island garrisons');
  assert.equal(new Set(g.stations.map(s=>s.island)).size,8);
  assert(g.units.filter(u=>u.side==='eu'&&u.cargo?.length).length>=12);
  assert(g.units.every(u=>u.hp>0));
  assert.equal(W.ALL['eu-hawaii'].scenarioId,'invasion-hawaii');
  assert.equal(W.ALL['eu-hawaii'].status,'implemented');
  assert.equal(g.scenario.citylessFunding[0],'eu');
  assert.equal(Hawaii.winner(g),null);
  return {cities:g.stations.length,ports:ports.length,airfields:g.scenario.airfields.length,
    islands:Object.fromEntries(components),seaHexes:g.tiles.filter(t=>t.terrain==='sea').length,
    coastHexes:g.tiles.filter(t=>t.terrain==='coast').length,
    landHexes:g.tiles.filter(t=>t.terrain!=='sea'&&t.terrain!=='coast').length,
    euUnits:g.startUnits.eu,britannianUnits:g.startUnits.britannia,
    cargo:g.units.reduce((n,u)=>n+(u.cargo||[]).length,0)};
}
function run(){
  // Exercise all four modes even when a single matchup is requested.
  for(const difficulty of ['normal','hard','challenge','elite'])
    for(const faction of ['eu','britannia']){
      const g=Hawaii.create(faction,difficulty,seed);
      audit(g);
      if(difficulty==='elite'){
        const carried=g.units.flatMap(v=>v.cargo||[]);
        const land=g.units.concat(carried).filter(u=>!E.TYPES[u.type].naval);
        assert(land.some(u=>E.TYPES[u.type].elite),'Elite conversion missing');
      }
    }
  const g=Hawaii.create(side,'normal',seed),start=audit(g);
  let attacks=0,landings=0,captures=0,errors=0,roundsPlayed=0;
  let previousLand=0,previousCities=0;
  for(let round=1;round<=rounds&&!g.over;round++){
    roundsPlayed=round;
    for(const faction of g.order){
      if(g.over)break;
      if(!E.alive(g,faction))continue;
      E.beginTurn(g,faction,round>1);
      E.aiProduction(g);
      const ids=g.units.filter(u=>u.hp>0&&u.side===faction&&!u.attacked)
        .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id).map(u=>u.id);
      for(let i=0;i<ids.length;i++){
        if(g.over)break;
        const next=E.aiNextActor(g,ids,i);
        if(next!==i)[ids[i],ids[next]]=[ids[next],ids[i]];
        try{
          const events=E.aiOrder(g,ids[i])||[];
          attacks+=events.filter(a=>a.kind==='attack').length;
        }catch(e){
          errors++;if(errors<=3)console.error('HAWAII_AI_EXCEPTION '+faction+' '+String(e.stack||e));
        }
      }
    }
    if(g.over)break;
    g.turn++;
    Hawaii.onTurn(g);
    const nowLand=g.units.filter(u=>u.side==='eu'&&
      E.TYPES[u.type].naval!=='ship'&&E.tile(g,u.c,u.r).terrain!=='sea').length;
    const nowCities=g.stations.filter(s=>s.owner==='eu').length;
    landings=Math.max(landings,nowLand);captures=Math.max(captures,nowCities);
    previousLand=nowLand;previousCities=nowCities;
  }
  return {side,seed,roundsRequested:rounds,roundsPlayed,
    attacks,landings,euCitiesCaptured:captures,
    euLandUnitsAshore:previousLand,euCitiesHeld:previousCities,
    aliveEu:g.units.filter(u=>u.side==='eu'&&u.hp>0).length,
    aliveBritannia:g.units.filter(u=>u.side==='britannia'&&u.hp>0).length,
    totalCities:g.stations.length,winner:g.over?.winner||Hawaii.winner(g)?.winner||null,
    exceptions:errors,geography:start};
}
try{
  console.log('HAWAII_SIM_RESULT '+JSON.stringify(run()));
  process.exitCode=0;
}catch(e){console.error('HAWAII_SIM_FAILED '+(e.stack||e));process.exitCode=1;}

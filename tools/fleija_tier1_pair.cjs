#!/usr/bin/env node
'use strict';
// Independent, current-main all-AI A/B observer. No engine or AI source changes.
// Run this script unchanged against each supplied dist/engine.js revision.
const E=require('../dist/engine.js');
const [mode='2017',rawSeed='401',rawTurns='95',variant='unknown']=process.argv.slice(2);
const seed=Number(rawSeed),limit=Number(rawTurns);
if(!['2017','2018'].includes(mode)||!Number.isInteger(seed)||!Number.isInteger(limit)||limit<20||limit>120)
  throw Error('Usage: node tools/fleija_tier1_pair.cjs 2017|2018 seed turns variant');
const g=E.createGame('britannia','normal','conquest',seed,mode==='2018'?'ufn2018':'world');
g.player='__observer__';
const sideOrder=[...g.order],successfulCityHits={},shots=[],startCities={};
for(const s of sideOrder){successfulCityHits[s]=0;startCities[s]=g.stations.filter(c=>c.owner===s).length;}
const started=process.hrtime.bigint();
function actSide(side){
  if(g.over||!E.alive(g,side))return;
  // Read-only preview of the selected target BEFORE firing destroys its unit.
  // aiLaunchTarget is deterministic and performs no action / random draw.
  const predicted=(g.arsenal?.[side]||0)>0 ? E.aiLaunchTarget(g,side) : null;
  const unit=predicted&&E.unitAt(g,predicted);
  const directTier1=!!(unit&&unit.hp>0&&E.COMMANDERS[unit.cmd]?.storyTier===1&&unit.side!==side);
  const directCommander=directTier1 ? unit.cmd : null;
  const targetCity=predicted&&E.stationAt(g,predicted);
  const eligibleEnemyTier1=g.units.filter(u=>u.hp>0&&u.side!==side&&u.side!=='neutral'&&
    E.COMMANDERS[u.cmd]?.storyTier===1).length;
  const before=successfulCityHits[side];
  E.aiProduction(g);
  for(const shot of (g.launches||[])){
    const actual=shot.to;
    const selected=predicted&&actual&&predicted.c===actual.c&&predicted.r===actual.r;
    const groundCity=shot.cities?.some(c=>c.destroyed&&c.owner!==side&&c.owner!=='neutral')||false;
    if(groundCity)successfulCityHits[side]++;
    shots.push({turn:g.turn,side,intercepted:!!shot.intercepted,
      groundCity,preFiveCityHits:before,postFive:before>=5,
      directTier1:!!selected&&directTier1,directCommander:selected?directCommander:null,
      eligibleEnemyTier1,centerCity:!!(targetCity&&targetCity.owner!==side),
      unitsDestroyed:shot.destroyed?.length||0,citiesDestroyed:shot.cities?.filter(c=>c.destroyed).length||0,
      selectedAsPreview:!!selected,
    });
  }
  const ids=g.units.filter(u=>u.hp>0&&u.side===side&&!u.attacked)
    .sort((a,b)=>E.aiOrderPriority(g,a)-E.aiOrderPriority(g,b)||a.id-b.id).map(u=>u.id);
  for(let step=0;step<ids.length;step++){
    if(g.over)break;
    const next=E.aiNextActor(g,ids,step);
    if(next!==step)[ids[step],ids[next]]=[ids[next],ids[step]];
    const u=g.units.find(v=>v.id===ids[step]);
    if(u&&u.hp>0&&u.side===side)E.aiOrder(g,u.id);
  }
}
while(!g.over&&g.turn<=limit){
  actSide(g.order[0]);
  for(const side of g.order.slice(1)){
    if(g.over||!E.alive(g,side))continue;
    E.beginTurn(g,side,g.turn>1);
    if(!g.over)actSide(side);
  }
  if(g.over)break;
  g.turn++;
  E.beginTurn(g,g.order[0],true);
}
const finalCities=Object.fromEntries(sideOrder.map(s=>[s,g.stations.filter(c=>c.owner===s).length]));
const finalUnits=Object.fromEntries(sideOrder.map(s=>[s,g.units.filter(u=>u.hp>0&&u.side===s).length]));
const sum=(f)=>shots.filter(f).length;
const hitsBySide=Object.fromEntries(sideOrder.map(s=>[s,successfulCityHits[s]]));
const shotsBySide=Object.fromEntries(sideOrder.map(s=>[s,shots.filter(x=>x.side===s).length]));
const postFiveShots=shots.filter(x=>x.postFive);
const directPostFive=shots.filter(x=>x.postFive&&x.directTier1);
const report={variant,mode,seed,maxTurns:limit,turnsPlayed:Math.min(limit,g.turn),winner:g.over?.winner||null,
  startCities,finalCities,finalUnits,cityHitsByAttacker:hitsBySide,shotsBySide,
  launched:shots.length,intercepted:sum(x=>x.intercepted),
  groundCityHits:sum(x=>x.groundCity),citiesDestroyed:shots.reduce((n,x)=>n+x.citiesDestroyed,0),
  unitsDestroyed:shots.reduce((n,x)=>n+x.unitsDestroyed,0),
  postFiveShots:postFiveShots.length,tier1Direct:sum(x=>x.directTier1),
  tier1DirectAfter5:directPostFive.length,tier1DirectAfter5Shots:directPostFive.map(x=>({
    turn:x.turn,side:x.side,commander:x.directCommander,preFiveCityHits:x.preFiveCityHits,
    intercepted:x.intercepted
  })),
  shotsWithoutMatchingPreview:sum(x=>!x.selectedAsPreview),
  timeMs:Math.round(Number(process.hrtime.bigint()-started)/1e6)};
process.stdout.write(JSON.stringify(report)+'\n');

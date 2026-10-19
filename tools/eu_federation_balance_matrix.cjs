#!/usr/bin/env node
'use strict';
/* Real full-engine seeded AI balancing, independent of browser state.
   Usage: node tools/eu_federation_balance_matrix.cjs <scenario-id> [turns=45] [seeds=11,37,91]
   The standard tools/scenario_sim.cjs is used unchanged, one subprocess per
   side/seed, so a bad scenario cannot conceal another scenario's results. */
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const ids = ['kazakhstan','persia','xinjiang','india','mongolia','manchuria','himalayas','sichuan','beijing','luoyang'].map(x=>'eu-cf-'+x);
const id=process.argv[2],turns=Number(process.argv[3]||45),seeds=(process.argv[4]||'11,37,91').split(',').map(Number);
if(!ids.includes(id)||!Number.isInteger(turns)||turns<1||turns>150||seeds.some(x=>!Number.isInteger(x))) {
 console.error('Usage: node tools/eu_federation_balance_matrix.cjs <id> [turns 1..150] [seeds comma-separated]');
 process.exit(2);
}
const rows=[];
for(const seed of seeds)for(const side of ['eu','cf']){
 const now=Date.now();
 const result=spawnSync(process.execPath,[path.join(__dirname,'scenario_sim.cjs'),id,side,'normal',String(seed),String(turns)],{
  encoding:'utf8',timeout:360000,maxBuffer:20*1024*1024,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=4096'}
 });
 const line=(result.stdout||'').split('\n').find(x=>x.startsWith('SCENARIO_SIM '));
 let row;
 if(line){
  try{
   const r=JSON.parse(line.slice('SCENARIO_SIM '.length));
   const end=r.snapshots.at(-1)||null,start=r.startingCities;
   const lastSwitch=r.captures.at(-1)?.turn||null;
   const attackTotal=Object.values(r.attacks).reduce((a,b)=>a+b,0);
   const productionTotal=Object.values(r.production).reduce((a,b)=>a+b,0);
   const stagnated=(!r.winner&&!r.errors.length&&r.snapshots.length>=15
      &&(lastSwitch===null||lastSwitch<r.snapshots.length-15));
   row={id,side,seed,maxTurns:turns,actualTurns:r.snapshots.length,ms:Date.now()-now,
    start,endCities:end?.cities||null,endUnits:end?.units||null,winner:r.winner,
    captures:r.captures.length,lastCaptureTurn:lastSwitch,losses:r.losses,
    production:r.production,attacks:r.attacks,navalActions:r.navalActions,
    errors:r.errors,openingStall:r.openingStall,stagnated,firstOver:r.firstOver,
    checkpoints:r.snapshots.filter(x=>[5,10,20,30,45,60,75,90,120,150].includes(x.turn)).map(x=>({turn:x.turn,cities:x.cities})),
    attackTotal,productionTotal};
  }catch(e){row={id,side,seed,failed:true,parseError:String(e),out:(result.stdout||'').slice(-400)};}
 } else row={id,side,seed,failed:true,exit:result.status,signal:result.signal,
  error:result.error?.message||null,ms:Date.now()-now,stderr:(result.stderr||'').slice(-2200)};
 rows.push(row);
 console.log('BALANCE_RESULT '+JSON.stringify(row));
}
const errorRuns=rows.filter(x=>x.failed||x.errors?.length);
const summary={id,total:rows.length,errors:errorRuns.length,winByEU:rows.filter(x=>x.winner==='eu').length,
 winByCF:rows.filter(x=>x.winner==='cf').length,noWinner:rows.filter(x=>!x.winner&&!x.failed).length,
 openingStalls:rows.filter(x=>x.openingStall).length,stagnated:rows.filter(x=>x.stagnated).length,
 results:rows.map(x=>({side:x.side,seed:x.seed,winner:x.winner||null,turn:x.actualTurns||null,
  cities:x.endCities||null,captures:x.captures??null,production:x.productionTotal??null,attacks:x.attackTotal??null,
  errors:x.errors?.length??null,failed:!!x.failed}))};
console.log('BALANCE_SUMMARY '+JSON.stringify(summary));
if(errorRuns.length)process.exitCode=1;

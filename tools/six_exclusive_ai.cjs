#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {simulate,E}=require('./scenario_sim.cjs');
const ids=process.argv.slice(2).length?process.argv.slice(2):['bk-civil-war','rounds-tournament','geass-war','protagonists-antagonists','partition-britannia','ufn-civil-war'];
const seeds=(process.env.SEEDS||'11').split(',').map(Number),turns=Number(process.env.TURNS||8);
for(const id of ids)for(const seed of seeds){
 const m=E.scenarios.byId[id],start=Date.now(),{r}=simulate(m,m.sides[0],'normal',seed,turns);
 assert.deepEqual(r.errors,[],id+' AI errors');
 assert(r.captures.length>0,id+' no city captures');
 for(const side of m.sides){assert(r.production[side]>0,id+' inactive factory '+side);assert(r.attacks[side]>0,id+' inactive attacker '+side);}
 if(id==='rounds-tournament')for(const side of m.sides)assert(r.captures.some(c=>c.to===side),'Round Knight never captures: '+side);
 console.log(JSON.stringify({id,seed,turns,elapsedMs:Date.now()-start,attacks:r.attacks,production:r.production,captures:r.captures.length,
  last:r.snapshots.at(-1),winner:r.winner,errors:r.errors.length}));
}

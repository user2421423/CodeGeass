#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {wilson,aggregate,findings,csv,report}=require('./tournament_stats.cjs');
assert.deepEqual(wilson(0,0),{low:0,high:1});
assert.ok(wilson(10,10).low>0.65);
assert.ok(wilson(5,10).low<0.5&&wilson(5,10).high>0.5);
const row=(seed,winner,errors=[])=>({
 scenario:'test',player:'britannia',difficulty:'normal',seed,maxTurns:50,winner,errors,
 captures:[{to:'britannia'}],capturesBySide:{britannia:1,eu:0},
 endingCities:{britannia:4,eu:2},losses:{britannia:2,eu:4},
 production:{britannia:2,eu:1},attacks:{britannia:4,eu:1},
 navalDeployments:{total:1},navalInvasionsWon:{total:0},stalledWindows:[]});
const rows=Array.from({length:10},(_,i)=>row(i+1,'britannia'));
const a=aggregate(rows);
assert.equal(a[0].wins,10);
assert.equal(findings(rows,a).some(x=>x.type==='possible-faction-dominance'),true);
const censored=aggregate([row(1,null),row(2,'britannia')])[0];
assert.equal(censored.resolved,1);
assert.equal(censored.wins,1);
const failed=aggregate([row(1,'britannia',[{message:'bad'}])])[0];
assert.equal(failed.valid,0);
assert.equal(failed.winRate,null);
assert.match(csv([{a:'hello,"world"'}],['a']),/""world""/);
assert.match(report({seeds:[1],turns:[50]},rows,a,[]),/Wilson/);
console.log('Tournament stats, Wilson thresholds, censoring and CSV: PASS');
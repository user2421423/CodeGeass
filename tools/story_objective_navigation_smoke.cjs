#!/usr/bin/env node
'use strict';
// Story objective feasibility diagnostics: terrain route + completion semantics.
// Intentionally ignores combat blockers and AI path selection; those remain
// separately measured in story_r2_balance_probe.cjs.
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/missions.js');
require('../dist/campaign.js');

const cases = [
  ['bk5', 'Chinese Consulate'],
  ['bk_rescue', 'Execution Ground', 'Chinese Consulate'],
  ['bk_yokosuka2', 'Britannian Flagship'],
  ['br_yokosuka2', 'Black Knights Submarine'],
  ['bk_zhengzhou', 'Xiaopei Road'],
  ['br_kamejima', 'Thought Elevator']
];
let passed=0;
function distance(g, start, end) {
  const seen=new Set([start.c+','+start.r]),queue=[{p:start,d:0}];
  for(let i=0;i<queue.length;i++){
    const {p,d}=queue[i];
    if(p.c===end.c && p.r===end.r)return d;
    for(const n of E.adjacent(g,p)){
      const key=n.c+','+n.r;
      if(seen.has(key)||E.TERRAIN[n.terrain]?.blocked)continue;
      seen.add(key);queue.push({p:n,d:d+1});
    }
  }
  return Infinity;
}
for(const [id,...goals] of cases){
  const m=E.campaign.mission(id),g=E.campaign.createMission(id,1357,'normal');
  assert.ok(m && g && g.units.length,id+': must load');
  const troops=g.units.filter(u=>u.side===g.player&&u.hp>0);
  assert.ok(troops.length,id+': must have at least one controllable formation');
  for(const name of goals){
    const city=g.stations.find(s=>s.name===name);
    assert.ok(city,id+': missing objective '+name);
    const best=Math.min(...troops.map(u=>distance(g,E.tile(g,u.c,u.r),E.tile(g,city.c,city.r))));
    assert.ok(Number.isFinite(best),id+': objective has no terrain route: '+name);
    console.log('OBJECTIVE_PATH '+id+' '+name+' hexes='+best+' terrain='+E.tile(g,city.c,city.r).terrain);
  }
  // Defeating opponents is not sufficient if there is a second stage: simulate
  // the objectives separately and then verify the same end-of-mission hook as gameplay.
  for(const condition of [m.win].flat()){
    for(const name of condition.capture||[]){
      const city=g.stations.find(s=>s.name===name);
      assert.ok(city,id+': unknown captured target '+name);city.owner=g.player;
    }
    for(const name of condition.reach||[]){
      const city=g.stations.find(s=>s.name===name);
      assert.ok(city,id+': unknown reach target '+name);
      const mover=troops.find(u=>u.cmd===condition.by)||troops[0];
      mover.c=city.c;mover.r=city.r;
    }
  }
  assert.equal(E.hooks.decide(g)?.winner,g.player,id+': objective completion fails to award victory');
  passed++;
}
assert.equal(passed,cases.length);
console.log('STORY_OBJECTIVE_NAVIGATION '+passed+' route/trigger missions PASS');

#!/usr/bin/env node
'use strict';
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const sides = ['britannia','eb','cf'];
function counts(g) { return Object.fromEntries([...sides,'neutral'].map(side=>[side,g.stations.filter(s=>s.owner===side).length])); }
for (const player of sides) {
 const g=E.createGame(player,'normal','conquest',417,'ufn2018');
 const opening=Object.fromEntries(sides.map(side=>{
   const inc=E.income(g,side), a=g.units.filter(u=>u.hp>0&&u.side===side);
   return [side,{cities:counts(g)[side],units:a.length,frames:a.reduce((n,u)=>n+u.stack,0),startingCredits:g.economy[side].credits,startingIndustry:g.economy[side].industry,income:inc.credits,industry:inc.industry,science:inc.science}];
 }));
 console.log('OPENING '+player+' '+JSON.stringify(opening));
 let moves=0,attacks=0,captures=0;
 for(let turn=1;turn<=3 && !g.over;turn++){
  g.turn=turn;
  for(const side of g.order) {
   if(g.over) break;
   E.beginTurn(g,side,turn>1);
   if(side!==player) {
    E.aiProduction(g);
    const ids=g.units.filter(u=>u.hp>0&&u.side===side).slice(0,16).map(u=>u.id);
    for(const id of ids) {
      if(g.over)break;
      const orders=E.aiOrder(g,id)||[];
      moves+=orders.filter(o=>o.kind==='move').length;
      attacks+=orders.filter(o=>o.kind==='attack').length;
      captures+=orders.filter(o=>o.captured).length;
    }
   }
   if(g.stations.some(s=>s.owner==='eu'))throw Error('Obsolete EU ownership');
   if(g.units.some(u=>u.hp>0&&u.side==='eu'))throw Error('Obsolete EU unit');
  }
 }
 console.log('SIM '+player+' '+JSON.stringify({throughTurn:g.turn,counts:counts(g),units:g.units.length,moves,attacks,captures,over:g.over?.winner||null}));
}

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
test('starting conquest income parity and 22 city outputs', () => {
 const expected = { britannia:[815,438,129,25], eu:[811,432,126,21], cf:[820,439,127,21] };
 const groups = [
  [['Seattle','Chicago','San Francisco','Los Angeles','Houston','Toronto','Rio de Janeiro','Buenos Aires'],[20,12,3]],
  [['Edinburgh','Dublin','Oslo','Stockholm','Helsinki','Casablanca','Lagos','Kinshasa','Nairobi','Cape Town'],[15,8,2]],
  [['Delhi','Chengdu','Xian','Guangzhou'],[30,16,4]],
 ];
 for(const player of ['britannia','eu','cf']){
  const g=E.createGame(player,'normal','conquest',42);
  for(const [s,values] of Object.entries(expected)){
   const inc=E.income(g,s);
   assert.deepEqual([inc.credits,inc.industry,inc.science,inc.sakuradite],values,s);
  }
  for(const [names,values] of groups)for(const name of names){
   const city=g.stations.find(s=>s.name===name);
   assert.ok(city,'Missing '+name);
   assert.deepEqual([city.income,city.industry,city.science],values,name);
  }
 }
});

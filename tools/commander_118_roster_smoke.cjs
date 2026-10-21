#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {COMMANDERS,RATINGS}=require(path.join(root,'dist/engine/commanders.js'));
const added=["monica","luciano","chloe","mao","shalio","shamna","bolvona","jeanrowe","johanne","brondello","dore","scholtz","renelaurent","janmanes","simonmericourt","kuzanmontoban","alannecker","franzvallo","augustahighland"];
assert.equal(Object.keys(COMMANDERS).length,118);
assert.equal(Object.keys(RATINGS).length,118);
const groups={};
for(const [id,c] of Object.entries(COMMANDERS)){groups[c.side]=(groups[c.side]||0)+1;assert.ok(RATINGS[id],id+' has no ratings');}
assert.deepEqual(groups,{britannia:23,eb:22,eu:23,cf:23,bk:27});
assert.ok(!COMMANDERS.sakuya&&!RATINGS.sakuya&&COMMANDERS.norland);
for(const id of added){
  const c=COMMANDERS[id];assert.ok(c&&c.skill&&c.desc&&c.stats&&Object.keys(c.stats).length,id+' incomplete');
  assert.ok(!c.action&&(!c.fx||!Object.keys(c.fx).length),id+' must have a supported passive');
  const st=c.stats;
  if(st.dmg!==undefined)assert.ok(st.dmg>0&&st.dmg<=.08);
  if(st.dmgBranch)assert.ok(Object.values(st.dmgBranch).every(x=>x>0&&x<=.08));
  if(st.taken!==undefined)assert.ok(st.taken>=.93&&st.taken<1);
  if(st.crit!==undefined)assert.ok(st.crit>0&&st.crit<=.05);
  if(st.pen!==undefined)assert.ok(st.pen>0&&st.pen<=.06);
  if(st.counter!==undefined)assert.ok(st.counter>0&&st.counter<=.12);
}
for(const name of ['dist/scenarios-protagonists-antagonists.js','dist/scenarios-geass-war.js']){
 const t=fs.readFileSync(path.join(root,name),'utf8');assert.ok(!/\\bsakuya\\b/i.test(t));
 assert.ok(t.includes('"norland"'),'Norland must remain in '+name);
}
for(const name of ['manifest.json','manifest.js']){
 const t=fs.readFileSync(path.join(root,'dist/assets/art',name),'utf8');assert.ok(!/"sakuya"/.test(t));assert.ok(/"norland"/.test(t));
}
console.log('PASS: 118 commanders, 19 modest passives, proper parity, Sakuya removed and Norland retained');

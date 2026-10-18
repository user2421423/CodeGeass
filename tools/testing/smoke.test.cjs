'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT=path.resolve(__dirname,'../..');
// Every existing smoke check remains runnable; new *_smoke.cjs checks join automatically.
const fast = new Set(['amphibious_elite_chain','city_defense_movement_refresh','city_tier_upgrade',
  'elite_class_standardization','federation_era_roster','frame_research_economy','repair_and_port_healing',
  'research_200_combat','research_mobility','reward_economy','ufn2018','world_campaign_elite_levels']);
const files=fs.readdirSync(path.join(ROOT,'tools')).filter(f=>f.endsWith('_smoke.cjs')).sort()
  .filter(f=>process.env.KC_TEST_SUITE!=='fast'||fast.has(f.replace('_smoke.cjs','')));
for(const file of files) test('existing regression: '+file,()=>{
  const result=spawnSync(process.execPath,[path.join('tools',file)],{cwd:ROOT,encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024});
  assert.equal(result.status,0,[file,result.error?.message,result.stdout,result.stderr].filter(Boolean).join('\n'));
});

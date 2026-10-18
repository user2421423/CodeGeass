#!/usr/bin/env node
'use strict';
// Gameplay regression catalog: existing real-engine smoke tests run unchanged.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const CATALOG={
 'combat-and-breakthrough':['city_defense_movement_refresh_smoke','amphibious_elite_chain_smoke',
   'elite_class_standardization_smoke','regular_class_standardization_smoke'],
 'movement-and-groups':['army_group_unlimited_smoke','research_mobility_smoke',
   'story_canterbury_movement_smoke','next_unit_fortress_beam_smoke'],
 'commander-abilities':['commander_assignment_smoke','commander_progression_smoke'],
 'research-and-economy':['research_200_combat_smoke','research_branch_redesign_smoke',
   'research_progression_smoke','research_standardization_smoke','frame_research_economy_smoke',
   'division_income_factory_smoke','regional_city_income_smoke'],
 'city-and-naval':['city_tier_upgrade_smoke','scenario_city_defenses_smoke',
   'repair_and_port_healing_smoke','scenario_dynamic_defense_smoke'],
 'conquest-and-campaign':['world_campaign_elite_levels_smoke','world_campaign_map_colors_smoke',
   'ufn2018_smoke','federation_era_roster_smoke','philippines_hex_audit'],
 'rewards-and-ui':['reward_economy_smoke','challenge_pass_smoke','elite_lootboxes_smoke',
   'elite_reward_max_level_smoke','interactive_tutorial_smoke','tutorial_academy_smoke',
   'hud_income_display_smoke'],
 'integrated-play':['gameplay_interaction_smoke','tournament_stats_test']
};
const FAST=new Set(['city_defense_movement_refresh_smoke','amphibious_elite_chain_smoke',
 'commander_assignment_smoke','research_progression_smoke','frame_research_economy_smoke',
 'city_tier_upgrade_smoke','repair_and_port_healing_smoke','federation_era_roster_smoke',
 'ufn2018_smoke','reward_economy_smoke','world_campaign_map_colors_smoke',
 'gameplay_interaction_smoke','tournament_stats_test']);
function runSuite(profile='fast',out='artifacts/gameplay-regressions'){
 if(!['fast','all'].includes(profile))throw Error('Profile must be fast or all');
 const results=[];
 for(const [category,files] of Object.entries(CATALOG)){
  for(const stem of files){
   if(profile==='fast'&&!FAST.has(stem))continue;
   const file=path.join(ROOT,'tools',stem+'.cjs');
   if(!fs.existsSync(file))throw Error('Missing regression '+file);
   const proc=cp.spawnSync(process.execPath,[file],{
    cwd:ROOT,encoding:'utf8',timeout:profile==='fast'?120000:240000,maxBuffer:8*1024*1024});
   const result={category,test:stem,ok:proc.status===0&&!proc.error,exitCode:proc.status,
    signal:proc.signal||null,error:proc.error?.message||null,
    stdout:(proc.stdout||'').slice(-15000),stderr:(proc.stderr||'').slice(-15000)};
   results.push(result);
   console.error((result.ok?'PASS ':'FAIL ')+stem);
  }
 }
 const total=results.length,failed=results.filter(r=>!r.ok);
 const dir=path.resolve(out);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({profile,total,passed:total-failed.length,failed:failed.length,results},null,2)+'\n');
 const md=['# Gameplay regression results','',
  'Profile: '+profile+'; passed: '+(total-failed.length)+'/'+total+'; failures: '+failed.length,'',
  '| Category | Test | Result |','|---|---|---|',
  ...results.map(r=>'| '+r.category+' | '+r.test+' | '+(r.ok?'PASS':'FAIL')+' |'),'',
  '## Failures'],fence=String.fromCharCode(96).repeat(3);
 if(!failed.length)md.push('No failures in the selected catalog. Untested mechanics remain unverified.');
 for(const r of failed)md.push('### '+r.test,'','Exit: '+r.exitCode+'; signal: '+r.signal,'',
  fence+'text',(r.error||'')+'\n'+r.stdout+'\n'+r.stderr,fence,'');
 fs.writeFileSync(path.join(dir,'report.md'),md.join('\n')+'\n');
 return {total,failed:failed.length,results};
}
if(require.main===module){
 try{
  const args=process.argv.slice(2),profile=args.includes('--all')?'all':'fast';
  const i=args.indexOf('--output-dir'),out=i===-1?'artifacts/gameplay-regressions':args[i+1];
  const result=runSuite(profile,out);
  console.log('Regressions: '+(result.total-result.failed)+'/'+result.total+' passed');
  if(result.failed)process.exitCode=1;
 }catch(e){console.error(e.stack||String(e));process.exitCode=2;}
}
module.exports={CATALOG,FAST,runSuite};
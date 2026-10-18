#!/usr/bin/env node
'use strict';
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const args=process.argv.slice(2), suite=args[0]||'fast';
if(args.length>1||!['fast','full'].includes(suite)) throw Error('Usage: node tools/gameplay_checks.cjs [fast|full]');
const root=path.resolve(__dirname,'..');
const build=spawnSync(process.execPath,['tools/build_sources.cjs'],{cwd:root,stdio:'inherit'});
if(build.status!==0)process.exit(build.status||1);
const files=['tools/testing/interactions.test.cjs','tools/testing/tournament.test.cjs','tools/testing/fronts.test.cjs','tools/testing/smoke.test.cjs',
  'tools/testing/rosters.test.cjs','tools/testing/known_defects.test.cjs'];
const result=spawnSync(process.execPath,['--test','--test-reporter=tap','--test-concurrency=2',...files],
  {cwd:root,stdio:'inherit',env:{...process.env,KC_TEST_SUITE:suite}});
process.exitCode=result.status??1;

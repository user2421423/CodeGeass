'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {parse,matrix,runJob,readEvidence,missingShards}=require('../gameplay_tournament.cjs');
const {E,simulate,fingerprint}=require('../scenario_sim.cjs');
const {observer}=require('../tournament_metrics.cjs');
const report=require('../tournament_report.cjs');
const {differences}=require('../check_sim_baseline.cjs');
test('matrix covers manifest scenarios, four difficulties and every playable faction',()=>{
  const c=parse(['--seeds','11,29','--horizons','5,20,50,100']);
  const jobs=matrix(c), sides=Object.values(E.scenarios.byId).reduce((n,s)=>n+s.sides.length,0);
  assert.equal(jobs.length,sides*4*2*4);
  const manifest=fs.readFileSync(path.join(__dirname,'../../dist/scenario-manifest.js'),'utf8');
  const ids=[...manifest.matchAll(/\{id:"([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(jobs.map(j=>j.scenario))].sort(),ids.sort());
  assert.equal(new Set(jobs.map(report.key)).size,jobs.length);
});
test('shards partition the complete matrix without dropping or repeating matches',()=>{
  const args=['--preset','quick'], whole=matrix(parse(args)).map(report.key).sort();
  const sharded=Array.from({length:8},(_,i)=>matrix(parse([...args,'--shard',i+'/8'])).map(report.key)).flat().sort();
  assert.deepEqual(sharded,whole);
});
test('merging cannot report full coverage when an entire shard is missing',()=>{
  const shard=i=>({configuration:{shard:i+'/2'}});
  assert.deepEqual(missingShards([shard(0)],2),[1]);
  assert.deepEqual(missingShards([shard(0),shard(1)],2),[]);
  assert.throws(()=>missingShards([shard(0),shard(0)],2));
});
for(const args of [['--seeds','NaN'],['--horizons','0'],['--horizons','151'],['--jobs','0'],['--difficulties','easy'],
  ['--players','nobody'],['--scenarios','typo'],['--shard','8/8'],['--unknown'],['--seeds'],['--seeds','11','--seeds','12']])
  test('invalid matrix rejected: '+args.join(' '),()=>assert.throws(()=>parse(args)));
test('seed zero and maximum uint32 seed are accepted without signed overflow',()=>{
  assert.deepEqual(parse(['--seeds','0,4294967295']).seeds,[0,4294967295]);
});
test('optional observers preserve exact legacy state and result fingerprints',()=>{
  const scenario=E.scenarios.byId['eu-greenland'];
  const before=simulate(scenario,'eu','normal',11,2), {hooks}=observer(scenario.sides);
  const after=simulate(scenario,'eu','normal',11,2,hooks);
  assert.equal(fingerprint(after.g),fingerprint(before.g));
  assert.equal(fingerprint(after.r),fingerprint(before.r));
});
test('initial carrier cargo is not production or a casualty; observers do not write state',()=>{
  const {hooks,metrics}=observer(['britannia']);
  const cargo={id:2,side:'britannia',hp:5,type:'glasgow'}, carrier={id:1,side:'britannia',hp:10,type:'carrier_battleship',cargo:[cargo]};
  const g={units:[carrier],stations:[],turn:1}, before=JSON.stringify(g);
  hooks.init(g);hooks.observe(g,'production');assert.equal(JSON.stringify(g),before);
  assert.deepEqual(metrics.productionChoices,{britannia:{}});assert.equal(metrics.formationLosses.britannia,0);
  carrier.cargo=[];g.units.push(cargo);hooks.observe(g,'aiOrder');assert.equal(metrics.formationLosses.britannia,0);
  g.units=[];hooks.observe(g,'aiOrder');assert.equal(metrics.formationLosses.britannia,2);
});
test('scripted formations and factory production have separate counts',()=>{
  const {hooks,metrics}=observer(['britannia']);const g={units:[],stations:[],turn:1};hooks.init(g);
  g.units.push({id:1,side:'britannia',hp:10,type:'glasgow'});hooks.observe(g,'script');
  g.units.push({id:2,side:'britannia',hp:10,type:'gloucester'});hooks.observe(g,'production');
  assert.equal(metrics.reinforcements.britannia,1);assert.equal(metrics.productionChoices.britannia.gloucester,1);
});
test('cargo attacks nested inside a carrier order are attributed to the cargo, not naval fire',()=>{
  const {hooks,metrics}=observer(['britannia']);
  const ship={id:1,side:'britannia',hp:10,type:'carrier_battleship'},cargo={id:2,side:'britannia',hp:10,type:'gloucester'};
  const g={turn:1,units:[ship,cargo],stations:[]};hooks.init(g);
  hooks.events(g,ship,[{kind:'attack',id:2}]);
  assert.equal(metrics.attacks.britannia,1);assert.equal(metrics.navalAttacks.britannia,0);
});
test('Wilson intervals retain uncertainty for tiny samples and tighten for repeated outcomes',()=>{
  assert.deepEqual(report.wilson(0,0),[0,1]);assert.ok(report.wilson(1,1)[0]<.5);
  assert.ok(report.wilson(8,8)[0]>.5);assert.ok(report.wilson(0,8)[1]<.5);
});
const fake=(overrides={})=>({scenario:'s',player:'a',difficulty:'normal',seed:11,turns:50,status:'ok',completedTurns:50,winner:null,errors:[],
  metrics:{timeline:[{cities:{a:2,b:8}}],attacks:{a:5},seaLandings:{a:0},stalls:[],captures:[],formationLosses:{},productionChoices:{}},...overrides});
test('censored games and failures stay separate; horizons are not pooled',()=>{
  const groups=report.summarize([fake(),fake({seed:29,status:'error'}),fake({turns:100,winner:'a'})]);
  const fifty=groups.find(g=>g.turns===50);assert.equal(fifty.valid,1);assert.equal(fifty.unresolved,1);assert.equal(fifty.errors,1);
  assert.equal(groups.length,2);assert.ok(groups.every(g=>g.evidence.startsWith('insufficient')));
});
test('CSV quotes separators and paired comparison requires the exact horizon and seed',()=>{
  assert.ok(report.csv([fake({scenario:'test,"quoted"'})]).includes('"test,""quoted"""'));
  assert.equal(report.paired([fake()],[fake({turns:100})]).length,0);
  assert.equal(report.paired([fake()],[fake()])[0].citiesDelta,0);
});
test('fingerprint comparison notices missing and changed baseline entries',()=>{
  assert.equal(differences('setup s p normal abc\n','setup s p normal abc\n').length,0);
  assert.equal(differences('setup s p normal abc\n','setup s p normal def\n').length,1);
  assert.equal(differences('setup s p normal abc\n','').length,1);
  assert.equal(differences('sim s p normal 11 2 abc result\n','sim s p normal 11 2 def result\n').length,1);
});
test('interrupted shard reports recover complete journal rows and ignore a torn final row',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kc-journal-test-'));
  try {
    const file=path.join(dir,'results.json');fs.writeFileSync(file,JSON.stringify({plannedJobs:2,rows:[]}));
    fs.writeFileSync(path.join(dir,'matches.jsonl'),JSON.stringify(fake())+'\n{"torn":');
    assert.equal(readEvidence(file).rows.length,1);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('a worker timeout returns an explicit failed match',async()=>{
  const job=matrix(parse(['--preset','quick','--scenarios','eu-greenland','--players','eu']))[0];
  const r=await runJob(job,{timeoutMs:1});assert.equal(r.status,'timeout');assert.equal(r.winner,null);assert.equal(r.errors.length,1);
});
test('end-to-end output, deterministic replay, resume and source mismatch rejection',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kc-tournament-test-'));
  const args=['tools/gameplay_tournament.cjs','--scenarios','eu-greenland','--players','eu','--difficulties','normal','--seeds','11','--horizons','1','--output',dir];
  const run=extra=>spawnSync(process.execPath,[...args,...extra],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8',timeout:30000});
  try {
    const first=run([]);assert.equal(first.status,0,first.stderr);
    const journal=fs.readFileSync(path.join(dir,'matches.jsonl'),'utf8');
    assert.ok(fs.readFileSync(path.join(dir,'report.md'),'utf8').includes('censored'));
    assert.equal(run(['--resume']).status,0);assert.equal(fs.readFileSync(path.join(dir,'matches.jsonl'),'utf8'),journal);
    assert.notEqual(run([]).status,0,'existing evidence is not overwritten');
    const manifest=path.join(dir,'manifest.json');fs.appendFileSync(manifest,'changed');
    assert.notEqual(run(['--resume']).status,0,'source/config mismatch rejects resume');
    const emptyArgs=args.slice();emptyArgs[emptyArgs.indexOf('--output')+1]=path.join(dir,'empty');
    const empty=spawnSync(process.execPath,[...emptyArgs,'--shard','1/2'],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8',timeout:30000});
    assert.equal(empty.status,0,empty.stderr);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'empty/results.json'),'utf8')).plannedJobs,0);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { fork, execFileSync } = require('node:child_process');
const { E, DIFFICULTIES } = require('./scenario_sim.cjs');
const report = require('./tournament_report.cjs');
const ROOT = path.resolve(__dirname, '..');
const activeWorkers = new Set();
const PRESETS = {
  quick: { seeds: [11], horizons: [2], difficulties: ['normal'] },
  standard: { seeds: [11,29,47], horizons: [5,20,50] },
  deep: { seeds: [11,29,47,71,101,131,173,211], horizons: [5,20,50,100] }
};
function parse(argv) {
  const flags = new Set(['preset','scenarios','players','difficulties','seeds','horizons','jobs',
    'timeout-ms','stall-turns','shard','output','config','compare','merge','limit','expected-shards']);
  const boolean = new Set(['resume','plan','help']);
  const values = {}, toggles = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || (!flags.has(flag) && !boolean.has(flag))) throw Error('Unknown option: ' + argv[i]);
    if (Object.hasOwn(values, flag) || toggles[flag]) throw Error('Duplicate option: --' + flag);
    if (boolean.has(flag)) toggles[flag] = true;
    else {
      if (!argv[i+1] || argv[i+1].startsWith('--')) throw Error('Missing value: --' + flag);
      values[flag] = argv[++i];
    }
  }
  const config = values.config ? JSON.parse(fs.readFileSync(values.config, 'utf8')) : {};
  const allowedConfig = ['preset','scenarios','players','difficulties','seeds','horizons','jobs','timeoutMs','stallTurns','shard','output','limit'];
  for (const k of Object.keys(config)) if (!allowedConfig.includes(k)) throw Error('Unknown config key: ' + k);
  const preset = values.preset || config.preset || 'standard';
  if (!PRESETS[preset]) throw Error('Preset must be quick, standard or deep');
  const c = { scenarios: ['all'], players: ['all'], difficulties: [...DIFFICULTIES], jobs: 2,
    timeoutMs: 300000, stallTurns: 8, output: 'tools/results/tournament', ...PRESETS[preset], ...config };
  const list = v => Array.isArray(v) ? v : String(v).split(',').filter(Boolean);
  for (const k of ['scenarios','players','difficulties','seeds','horizons']) c[k] = [...new Set(list(values[k] ?? c[k]))];
  const integer = (v, min, max, name) => {
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n < min || n > max) throw Error(name + ' must be an integer in ' + min + '..' + max);
    return n;
  };
  for (const [name, flag, min, max] of [['jobs','jobs',1,32],['timeoutMs','timeout-ms',100,3600000],['stallTurns','stall-turns',1,150]])
    c[name] = integer(values[flag] ?? c[name], min, max, flag);
  c.seeds = [...new Set(c.seeds.map(v => integer(v,0,4294967295,'seed')))];
  c.horizons = [...new Set(c.horizons.map(v => integer(v,1,150,'horizon')))];
  const known = Object.keys(E.scenarios.byId).sort();
  if (c.scenarios.includes('all') && c.scenarios.length > 1) throw Error('Use all alone for scenarios');
  if (c.players.includes('all') && c.players.length > 1) throw Error('Use all alone for players');
  if (c.difficulties.includes('all') && c.difficulties.length > 1) throw Error('Use all alone for difficulties');
  if (c.scenarios.includes('all')) c.scenarios = known;
  if (c.difficulties.includes('all')) c.difficulties = [...DIFFICULTIES];
  if (!c.scenarios.length || c.scenarios.some(s => !known.includes(s))) throw Error('Unknown or empty scenario selection');
  if (!c.difficulties.length || c.difficulties.some(d => !DIFFICULTIES.includes(d))) throw Error('Unknown or empty difficulty selection');
  if (!c.seeds.length || !c.horizons.length || !c.players.length) throw Error('Empty matrix dimension');
  if (!c.players.includes('all') && c.players.some(p => !c.scenarios.some(s => E.scenarios.byId[s].sides.includes(p)))) throw Error('Unknown selected player');
  c.shard = values.shard ?? c.shard ?? '0/1';
  const m = /^(\d+)\/(\d+)$/.exec(c.shard);
  if (!m || +m[2] < 1 || +m[2] > 256 || +m[1] >= +m[2]) throw Error('shard must be index/count, e.g. 0/8');
  c.output = values.output || c.output;
  c.limit = values.limit ?? c.limit;
  if (c.limit != null) c.limit = integer(c.limit,1,1000000,'limit');
  return { ...c, ...toggles, compare: values.compare, merge: values.merge,
    expectedShards: values['expected-shards'] == null ? null : integer(values['expected-shards'],1,256,'expected-shards') };
}
function matrix(c) {
  const result = [];
  for (const scenario of c.scenarios) for (const player of E.scenarios.byId[scenario].sides)
    if (c.players.includes('all') || c.players.includes(player))
      for (const difficulty of c.difficulties) for (const seed of c.seeds) for (const turns of c.horizons)
        result.push({ scenario, player, difficulty, seed, turns, stallTurns: c.stallTurns });
  const [index, count] = c.shard.split('/').map(Number);
  return result.filter((_, i) => i % count === index).slice(0, c.limit);
}
function provenance() {
  let revision = process.env.GITHUB_SHA || 'unknown';
  try { revision = execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(); } catch {}
  const hash = crypto.createHash('sha256');
  function visit(dir) {
    for (const entry of fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const file = path.join(dir,entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(?:js|cjs|json)$/.test(file)) { hash.update(file); hash.update(fs.readFileSync(path.join(ROOT,file))); }
    }
  }
  visit('src');
  // Include shipped rules and every top-level script dependency (coast/river
  // helpers need not match the scenario filename patterns). Visual script
  // changes conservatively invalidate resume too; binary assets are omitted.
  for (const dir of ['dist/engine']) visit(dir);
  for (const f of fs.readdirSync(path.join(ROOT,'dist')).sort())
    if (f.endsWith('.js') && !['engine.js','missions.js'].includes(f)) {
      hash.update(f); hash.update(fs.readFileSync(path.join(ROOT,'dist',f)));
    }
  const tooling = crypto.createHash('sha256');
  for (const f of ['scenario_sim.cjs','gameplay_tournament.cjs','tournament_metrics.cjs','tournament_fronts.cjs','tournament_worker.cjs']) tooling.update(fs.readFileSync(path.join(__dirname,f)));
  return { revision, digestVersion: 2, engineDigest: hash.digest('hex'), toolingDigest: tooling.digest('hex'), node: process.version };
}
function runJob(job, c) {
  return new Promise(resolve => {
    const child = fork(path.join(__dirname,'tournament_worker.cjs'),[],{cwd:ROOT,silent:true});
    activeWorkers.add(child);
    let done = false, progress = null, stderr = '';
    child.stderr.on('data', b => { stderr = (stderr + b).slice(-8000); });
    child.stdout.resume();
    function finish(result) {
      if (done) return; done = true; clearTimeout(timer); child.kill(); activeWorkers.delete(child); resolve(result);
    }
    function fail(status, message) { finish({ ...job, status, completedTurns: progress?.turn || 0,
      winner: null, metrics: null, progress, errors: [{ message, stderr }] }); }
    const timer = setTimeout(() => fail('timeout','Wall-clock timeout after ' + c.timeoutMs + 'ms'),c.timeoutMs);
    child.on('error', e => fail('error',e.message));
    child.on('exit', (code,signal) => { if (!done) fail('error',`Worker exited before result: ${code}/${signal}`); });
    child.on('message', message => {
      if (message.progress) progress = message.progress;
      if (message.result) finish(message.result);
    });
    child.send(job);
  });
}
function writeReports(data, output, compare) {
  if (compare) data.comparison = report.paired(data.rows,JSON.parse(fs.readFileSync(compare,'utf8')).rows);
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync(path.join(output,'matches.csv'),report.csv(data.rows));
  fs.writeFileSync(path.join(output,'report.md'),report.markdown(data));
}
function readEvidence(file) {
  const data = JSON.parse(fs.readFileSync(file,'utf8'));
  const journal = path.join(path.dirname(file),'matches.jsonl');
  if (fs.existsSync(journal)) {
    const lines = fs.readFileSync(journal,'utf8').split('\n');
    if (lines.at(-1) !== '') lines.pop();
    data.rows = lines.filter(Boolean).map(line=>JSON.parse(line));
  }
  return data;
}
function missingShards(inputs, expected) {
  if (expected == null) return [];
  const seen = new Set();
  for (const data of inputs) {
    const match = /^(\d+)\/(\d+)$/.exec(data.configuration?.shard || '');
    if (!match || +match[2] !== expected || +match[1] >= expected || seen.has(+match[1]))
      throw Error('Missing, duplicate or incompatible shard configuration');
    seen.add(+match[1]);
  }
  return Array.from({length:expected},(_,i)=>i).filter(i=>!seen.has(i));
}
async function main(argv = process.argv.slice(2)) {
  const c = parse(argv);
  if (c.help) { console.log('See tools/testing/README.md. Use --preset quick|standard|deep --plan to inspect the matrix.'); return; }
  if (c.merge) {
    const inputs = c.merge.split(',').map(readEvidence);
    const missing = missingShards(inputs,c.expectedShards);
    const ids = new Set(), rows = [];
    for (const input of inputs) {
      if (input.provenance.engineDigest !== inputs[0].provenance.engineDigest ||
        input.provenance.toolingDigest !== inputs[0].provenance.toolingDigest ||
        input.provenance.node !== inputs[0].provenance.node) throw Error('Cannot merge different engine/tooling/runtime revisions');
      for (const row of input.rows) { if (ids.has(report.key(row))) throw Error('Duplicate match in merge: '+report.key(row)); ids.add(report.key(row)); rows.push(row); }
    }
    rows.sort((a,b)=>report.key(a).localeCompare(report.key(b)));
    writeReports({schema:1,provenance:inputs[0].provenance,missingShards:missing,
      plannedJobs:inputs.reduce((n,d)=>n+d.plannedJobs,0),rows},c.output,c.compare);
    if(missing.length || rows.some(r=>r.status!=='ok') || rows.length < inputs.reduce((n,d)=>n+d.plannedJobs,0)) process.exitCode=1;
    return;
  }
  const jobs = matrix(c), source = provenance();
  if (c.plan) { console.log(JSON.stringify({configuration:c,provenance:source,total:jobs.length,jobs},null,2)); return; }
  if (!jobs.length && c.shard === '0/1') throw Error('No matches in selected matrix');
  fs.mkdirSync(c.output,{recursive:true});
  const manifest = path.join(c.output,'manifest.json'), journal = path.join(c.output,'matches.jsonl');
  const signature = JSON.stringify({schema:1,engine:source.engineDigest,tooling:source.toolingDigest,node:source.node,jobs,timeoutMs:c.timeoutMs});
  const lock = path.join(c.output,'.running');
  if (c.resume && fs.existsSync(lock)) {
    const pid = Number(fs.readFileSync(lock,'utf8'));
    if (!Number.isSafeInteger(pid) || pid <= 0) throw Error('Invalid output lock');
    try { process.kill(pid,0); throw Error('Another runner owns this output directory'); }
    catch (e) { if(e.code === 'ESRCH') fs.unlinkSync(lock); else throw e; }
  }
  const fd = fs.openSync(lock,'wx'); fs.writeFileSync(fd,String(process.pid)); fs.closeSync(fd);
  const stop = signal => {
    for (const child of activeWorkers) child.kill();
    if (fs.existsSync(lock)) fs.unlinkSync(lock);
    console.error('Interrupted; completed matches are preserved in matches.jsonl. Resume with the same configuration.');
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  const onInt = () => stop('SIGINT'), onTerm = () => stop('SIGTERM');
  process.once('SIGINT',onInt); process.once('SIGTERM',onTerm);
  try {
    let rows = [];
    if (c.resume) {
      if (fs.readFileSync(manifest,'utf8') !== signature) throw Error('Resume configuration/source mismatch; use a new output directory');
      const lines = fs.existsSync(journal) ? fs.readFileSync(journal,'utf8').split('\n') : [];
      // Each committed journal row ends with a newline. Ignore only a torn final append.
      if (lines.at(-1) !== '') lines.pop();
      rows = lines.filter(Boolean).map(line=>JSON.parse(line));
      const ids = new Set();
      for (const r of rows) { if(ids.has(report.key(r)) || !jobs.some(j=>report.key(j)===report.key(r))) throw Error('Invalid resume journal'); ids.add(report.key(r)); }
      fs.writeFileSync(journal, rows.map(r=>JSON.stringify(r)+'\n').join(''));
    } else {
      if (fs.existsSync(manifest)) throw Error('Output already exists; use --resume or a new output directory');
      fs.writeFileSync(manifest,signature); fs.writeFileSync(journal,'');
    }
    const completed = new Set(rows.map(report.key)), queue = jobs.filter(j=>!completed.has(report.key(j)));
    const data = { schema:1, provenance:source, configuration:c, plannedJobs:jobs.length, rows };
    writeReports(data,c.output,c.compare);
    await Promise.all(Array.from({length:Math.min(c.jobs,queue.length)},async()=>{
      while(queue.length) {
        const job = queue.shift(), result = await runJob(job,c);
        rows.push(result); fs.appendFileSync(journal,JSON.stringify(result)+'\n');
        // Completed games survive cancellation or a later worker failure.
        console.log(`${rows.length}/${jobs.length} ${report.key(job)} ${result.status}`);
      }
    }));
    rows.sort((a,b)=>report.key(a).localeCompare(report.key(b)));
    writeReports(data,c.output,c.compare);
    if(rows.some(r=>r.status!=='ok')) process.exitCode=1;
  } finally {
    process.removeListener('SIGINT',onInt); process.removeListener('SIGTERM',onTerm);
    if (fs.existsSync(lock)) fs.unlinkSync(lock);
  }
}
if (require.main === module) main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports = { parse, matrix, provenance, runJob, readEvidence, missingShards, main };

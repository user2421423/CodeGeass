'use strict';
const average = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const total = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const key = r => [r.scenario, r.player, r.difficulty, r.seed, r.turns].join('/');
function wilson(wins, n) {
  if (!n) return [0, 1];
  const z = 1.959963984540054, p = wins / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d;
  const h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
function summarize(rows) {
  const groups = new Map();
  for (const r of rows) {
    const id = [r.scenario, r.player, r.difficulty, r.turns].join('/');
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(r);
  }
  return [...groups].map(([id, items]) => {
    const valid = items.filter(r => r.status === 'ok'), wins = valid.filter(r => r.winner === r.player).length;
    const shares = valid.map(r => {
      const cities = r.metrics.timeline.at(-1)?.cities || {};
      return total(cities) ? (cities[r.player] || 0) / total(cities) : 0;
    });
    const interval = wilson(wins, valid.length);
    const seeds = new Set(valid.map(r => r.seed)).size;
    return { id, scenario: items[0].scenario, player: items[0].player,
      difficulty: items[0].difficulty, turns: items[0].turns, attempted: items.length,
      valid: valid.length, independentSeeds: seeds, wins,
      unresolved: valid.filter(r => !r.winner).length, errors: items.length - valid.length,
      winInterval95: interval, meanCityShare: average(shares),
      minCityShare: shares.length ? Math.min(...shares) : null,
      maxCityShare: shares.length ? Math.max(...shares) : null,
      attacksPerTurn: average(valid.map(r => total(r.metrics.attacks) / Math.max(1, r.completedTurns))),
      landings: valid.reduce((n, r) => n + total(r.metrics.seaLandings), 0),
      stalledRuns: valid.filter(r => r.metrics.stalls.length).length,
      quietFrontRuns: valid.every(r=>Array.isArray(r.metrics.stalledFronts))
        ? valid.filter(r=>r.metrics.stalledFronts.length).length : null,
      // Screening threshold only: scenarios are intentionally asymmetric.
      evidence: seeds >= 8 && (interval[0] > .5 || (shares.length && Math.min(...shares) >= .8))
        ? 'repeated dominance; investigate objectives and hold-out seeds'
        : seeds >= 8 && shares.length && Math.max(...shares) <= .2
          ? 'repeated disadvantage; investigate objectives and hold-out seeds'
          : 'insufficient evidence of imbalance' };
  }).sort((a, b) => b.errors - a.errors || b.meanCityShare - a.meanCityShare || a.id.localeCompare(b.id));
}
function csv(rows) {
  const fields = ['scenario','player','difficulty','seed','turns','status','completedTurns','winner',
    'captures','losses','produced','attacks','landings','stalls','quietFronts','errors'];
  const escape = v => '"' + String(v ?? '').replaceAll('"','""') + '"';
  return [fields, ...rows.map(r => [r.scenario,r.player,r.difficulty,r.seed,r.turns,r.status,r.completedTurns,r.winner,
    r.metrics?.captures.length || 0,total(r.metrics?.formationLosses),
    Object.values(r.metrics?.productionChoices || {}).reduce((n, choices) => n + total(choices), 0),
    total(r.metrics?.attacks),total(r.metrics?.seaLandings),r.metrics?.stalls.length || 0,
    r.metrics?.stalledFronts?.length ?? 'not recorded',r.errors.length])]
    .map(row => row.map(escape).join(',')).join('\n') + '\n';
}
function paired(rows, before) {
  const byKey = new Map(before.map(r => [key(r), r]));
  return rows.flatMap(r => {
    const b = byKey.get(key(r));
    if (!b || r.status !== 'ok' || b.status !== 'ok') return [];
    return [{ key: key(r), citiesDelta: (r.metrics.timeline.at(-1)?.cities[r.player] || 0) -
      (b.metrics.timeline.at(-1)?.cities[b.player] || 0),
      attacksDelta: total(r.metrics.attacks) - total(b.metrics.attacks), winnerBefore: b.winner, winnerAfter: r.winner }];
  });
}
function markdown(data) {
  const rows = data.rows, groups = summarize(rows), pct = n => n == null ? '—' : (100 * n).toFixed(1) + '%';
  const out = ['# Gameplay tournament report', '',
    `Source: ${data.provenance.revision}; engine SHA-256: ${data.provenance.engineDigest}.`, '',
    `${rows.length} recorded / ${data.plannedJobs} planned matches; ${rows.filter(r => r.status !== 'ok').length} failed or timed out.`, '',
    'All sides use the shipped AI. Player selection changes difficulty boosts and turn order. This is an AI diagnostic, not a human win-rate estimate.', '',
    'Unresolved matches are censored at the stated horizon and are not defeats or draws. Confidence intervals are Wilson 95% intervals for observed victories by that horizon, using successful runs only; failures are shown separately. Each group fixes scenario, player, difficulty and horizon. Repeated seeds across horizons are never pooled. Intervals are descriptive screens, not multiple-comparison-corrected proof of balance.', '',
    '| Scenario / selected faction / difficulty / horizon | Seeds | Wins | Unresolved | Failed | Victory interval | City share mean [min–max] | Attacks / turn | Landings | Stalled runs | Quiet-front runs |',
    '|---|---:|---:|---:|---:|---|---|---:|---:|---:|---:|'];
  for (const g of groups) out.push(`| ${g.id} | ${g.independentSeeds} | ${g.wins}/${g.valid} | ${g.unresolved} | ${g.errors} | ${g.winInterval95.map(pct).join('–')} | ${pct(g.meanCityShare)} [${pct(g.minCityShare)}–${pct(g.maxCityShare)}] | ${g.attacksPerTurn?.toFixed(1) ?? '—'} | ${g.landings} | ${g.stalledRuns} | ${g.quietFrontRuns ?? '—'} |`);
  if(data.missingShards?.length)out.push('', '**Incomplete shard collection:** missing shard indices '+data.missingShards.join(', ')+'. The counts above cover only available shards.');
  out.push('', '## Ranked screening findings', '');
  for (const g of groups.filter(g => g.errors || g.evidence.startsWith('repeated')))
    out.push(`- **${g.id}**: ${g.errors ? g.errors + ' simulation failures; inspect errors before balance conclusions.' : g.evidence + '.'}`);
  if (!groups.some(g => g.evidence.startsWith('repeated'))) out.push('No group meets the repeated-dominance/disadvantage screening threshold (at least eight independent seeds, plus lower victory interval above 50%, city share ≥80% throughout or city share ≤20% throughout).');
  out.push('', '## Simulation errors and reproductions', '');
  for (const r of rows.filter(r => r.status !== 'ok')) out.push(`- ${key(r)}: ${r.errors.map(e => e.message).join('; ').replaceAll('\n',' ')}. Reproduce: \`node tools/gameplay_tournament.cjs --scenarios ${r.scenario} --players ${r.player} --difficulties ${r.difficulty} --seeds ${r.seed} --horizons ${r.turns} --output /tmp/repro\`.`);
  out.push('', '## Measurement limits', '',
    '- Production choices count newly observed formations after aiProduction; scripted reinforcements are separate. Rejected build attempts and added frames are not counted as new formations.',
    '- Losses count observed live formation disappearance, including surrender/disbanding and carrier cargo losses; they are not exclusively combat kills.',
    '- Sea landings count actual sea-to-land movements and carrier disembarkation onto land. They do not establish successful invasions.',
    '- A stalled side retains cities but has neither a city ownership change nor formation loss for eight turns (configurable). This is a territorial/attrition proxy, not a geometric front diagnosis.',
    '- JSON retains production by faction/type, per-turn resources, city transfers, landing events, stalls and errors. CSV contains one row per match.',
    '- Compare equal scenario/player/difficulty/seed/horizon configurations, then confirm promising patterns on unused seeds and longer horizons.', '');
  if (data.comparison) out.push('## Paired comparison', '', `${data.comparison.length} successful matched configurations. See results.json for per-match deltas.`, '');
  return out.join('\n');
}
module.exports = { key, wilson, summarize, csv, markdown, paired };

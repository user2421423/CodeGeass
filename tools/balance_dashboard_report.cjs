'use strict';
// Pure report functions. No game state mutation, dependencies, or network calls.
const assert = require('node:assert/strict');
const COLORS = ['#e4b95c', '#72c6d3', '#d28cd0', '#9ecb80'];
const average = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const fixed = (n, digits = 1) => Number.isFinite(n) ? n.toFixed(digits) : '—';
const key = r => [r.mode, r.player, r.difficulty, r.seed].join('|');
const groupKey = r => [r.mode, r.player, r.difficulty].join('|');
const htmlEscape = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
function isWin(r) {
  if (!r.resolved) return false;
  return r.winner === r.player ||
    (r.mode === '2018' && ['britannia', 'eb'].includes(r.player) && r.winner === 'britannian');
}
function compare(current, baseline) {
  assert.equal(current?.schema, 1, 'Unsupported candidate report schema');
  if (!baseline) return { baseline: false, rows: [], byGroup: {} };
  assert.equal(baseline.schema, current.schema, 'Mismatched schemas');
  const before = new Map(baseline.rows.map(r => [key(r), r]));
  const paired = [];
  for (const row of current.rows) {
    const old = before.get(key(row));
    if (!old) throw new Error('Missing baseline for ' + key(row) + '; use identical modes, players, seeds, difficulty and run count.');
    paired.push({
      mode: row.mode, player: row.player, difficulty: row.difficulty, seed: row.seed,
      cityChange: (row.final.cities[row.player] || 0) - (old.final.cities[row.player] || 0),
      enemyLossChange: row.metrics.unitsLost[row.player] - old.metrics.unitsLost[row.player],
      seaLandingChange: row.metrics.seaLandings[row.player] - old.metrics.seaLandings[row.player],
      frontSwitchChange: row.metrics.frontSwitches[row.player] - old.metrics.frontSwitches[row.player],
      durationChange: row.elapsedMs - old.elapsedMs,
      beforeWin: isWin(old), afterWin: isWin(row),
      beforeResolved: old.resolved, afterResolved: row.resolved
    });
  }
  if (paired.length !== baseline.rows.length)
    throw new Error('Baseline has extra runs; make the comparison matrices identical.');
  const groups = {};
  for (const r of paired) (groups[groupKey(r)] ||= []).push(r);
  const byGroup = Object.fromEntries(Object.entries(groups).map(([k, rows]) => [k, {
    games: rows.length, cityChange: average(rows.map(r => r.cityChange)),
    lossChange: average(rows.map(r => r.enemyLossChange)),
    seaLandingChange: average(rows.map(r => r.seaLandingChange)),
    frontSwitchChange: average(rows.map(r => r.frontSwitchChange)),
    winChange: average(rows.map(r => Number(r.afterWin) - Number(r.beforeWin))),
    durationChange: average(rows.map(r => r.durationChange))
  }]));
  return { baseline: true, rows: paired, byGroup };
}
function groupsByPerspective(data) {
  const groups = {};
  for (const r of data.rows) (groups[groupKey(r)] ||= []).push(r);
  return Object.entries(groups).map(([id, rows]) => {
    const first = rows[0];
    return {
      id, mode: first.mode, player: first.player, difficulty: first.difficulty,
      count: rows.length, wins: rows.filter(isWin).length,
      unresolved: rows.filter(r => !r.resolved).length,
      cities: average(rows.map(r => r.final.cities[first.player] || 0)),
      ownLoss: average(rows.map(r => r.metrics.unitsLost[first.player] || 0)),
      attacks: average(rows.map(r => r.metrics.attacks[first.player] || 0)),
      landings: average(rows.map(r => r.metrics.seaLandings[first.player] || 0)),
      frontSwitches: average(rows.map(r => r.metrics.frontSwitches[first.player] || 0)),
      milliseconds: average(rows.map(r => r.elapsedMs))
    };
  });
}
function markdown(current, delta) {
  const text = [
    '# Knightmare Conquest — Automated Balance Dashboard',
    '',
    'Generated: ' + current.generatedAt,
    '',
    '**Data:** shipped game engine, all factions controlled by AI, seeded operation starts.',
    '**Scope:** ' + current.configuration.modes.join(', ') + ' · ' +
      current.configuration.difficulties.join(', ') + ' · ' + current.rows.length + ' matches.',
    '',
    '> An unresolved match at the requested horizon is not a defeat. 2018 Britannia and Euro Britannia are evaluated as one coalition for victory. Scenario victories require every city. Player selection still determines difficulty-adjusted starting conditions.',
    '> Naval landings count physical disembarkations, not proven successful invasions. Casualties count observed disappearing formations. Comparisons are paired by scenario, chosen faction, difficulty, and seed.',
    '',
    '| Mode | Selected faction | Difficulty | Runs | Wins | Unresolved | Final cities | Own losses | Sea landings | Front switches |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|'
  ];
  for (const row of groupsByPerspective(current))
    text.push('| ' + row.mode + ' | ' + row.player + ' | ' + row.difficulty + ' | ' + row.count +
      ' | ' + row.wins + ' | ' + row.unresolved + ' | ' + fixed(row.cities) + ' | ' +
      fixed(row.ownLoss) + ' | ' + fixed(row.landings) + ' | ' + fixed(row.frontSwitches) + ' |');
  if (delta.baseline) {
    text.push('', '## Matched comparison versus baseline', '',
      '| Mode | Selected faction | Difficulty | Paired games | Δ cities | Δ own losses | Δ sea landings | Δ front switches | Δ win fraction | Δ runtime (ms) |',
      '|---|---|---|---:|---:|---:|---:|---:|---:|---:|');
    for (const [id, d] of Object.entries(delta.byGroup)) {
      const [mode, player, difficulty] = id.split('|');
      text.push('| ' + mode + ' | ' + player + ' | ' + difficulty + ' | ' + d.games +
        ' | ' + fixed(d.cityChange) + ' | ' + fixed(d.lossChange) + ' | ' +
        fixed(d.seaLandingChange) + ' | ' + fixed(d.frontSwitchChange) + ' | ' +
        fixed(d.winChange * 100) + ' pp | ' + fixed(d.durationChange, 0) + ' |');
    }
    text.push('', 'Changes are experimental minus baseline. More cities, fewer losses, and higher win rates may be useful, but no single metric guarantees stronger or fairer AI.');
  } else text.push('', 'No baseline supplied. Use --baseline baseline.json to generate matched differences.');
  text.push('', '### Interpretation', '',
    'These all-AI simulations are diagnostics, not human-player win-rate measurements. Game order, difficulty boosts, maps and starting forces are held identical within each pair. Review losses, territory, runtime and faction asymmetries together before accepting a balance change.', '');
  return text.join('\n');
}
function plot(mode, current, baseline) {
  const sides = current.modes[mode].sides, all = current.rows.filter(r => r.mode === mode);
  const other = baseline?.rows?.filter(r => r.mode === mode) || [];
  const turns = [...new Set(all.flatMap(r => r.timeline.map(s => s.turn)))].sort((a, b) => a - b);
  const maxTurn = Math.max(1, ...turns), maxCities = Math.max(1, ...all.map(r => Object.values(r.initial.cities).reduce((a, b) => a + b, 0)));
  const width = 720, height = 215, left = 39, right = 12, top = 20, bottom = 36;
  const x = t => left + t / maxTurn * (width - left - right);
  const y = v => top + (1 - v / maxCities) * (height - top - bottom);
  const averageAt = (rows, side, turn) => {
    const points = rows.map(r => r.timeline.filter(s => s.turn <= turn).at(-1)?.cities?.[side]).filter(Number.isFinite);
    return points.length ? average(points) : null;
  };
  const line = (rows, side, dashed, color) => {
    if (!rows.length) return '';
    const points = turns.map(turn => ({ turn, v: averageAt(rows, side, turn) })).filter(p => p.v != null);
    if (!points.length) return '';
    const coords = points.map((p, i) => (i ? 'L' : 'M') + fixed(x(p.turn), 2) + ' ' + fixed(y(p.v), 2)).join(' ');
    return '<path d="' + coords + '" fill="none" stroke="' + color +
      '" stroke-width="' + (dashed ? '1.6' : '2.7') + '"' + (dashed ? ' stroke-dasharray="6 5"' : '') + '/>';
  };
  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Territorial control over time">';
  for (const tick of [0, .25, .5, .75, 1]) {
    const v = maxCities * tick;
    svg += '<line x1="' + left + '" x2="' + (width - right) + '" y1="' + y(v) +
      '" y2="' + y(v) + '" stroke="#344450" stroke-width="1"/>';
    svg += '<text x="32" y="' + (y(v) + 4) + '" text-anchor="end" fill="#9faebb" font-size="10">' +
      Math.round(v) + '</text>';
  }
  for (const tick of [0, .25, .5, .75, 1]) {
    const t = maxTurn * tick;
    svg += '<text x="' + x(t) + '" y="' + (height - 12) + '" text-anchor="middle" fill="#9faebb" font-size="11">' +
      Math.round(t) + '</text>';
  }
  sides.forEach((side, i) => { svg += line(other, side, true, COLORS[i % COLORS.length]); });
  sides.forEach((side, i) => { svg += line(all, side, false, COLORS[i % COLORS.length]); });
  svg += '</svg>';
  const legend = sides.map((side, i) => '<span class="legend"><i style="background:' + COLORS[i % COLORS.length] +
    '"></i>' + htmlEscape(side) + '</span>').join('');
  return '<div class="chart">' + svg + '<div class="legends">' + legend +
    (other.length ? '<span class="legend">Solid: candidate · dashed: baseline</span>' : '') + '</div></div>';
}
function html(current, delta, baseline = null) {
  const groups = groupsByPerspective(current);
  const modes = Object.keys(current.modes);
  const total = current.rows.length;
  const unresolved = current.rows.filter(r => !r.resolved).length;
  const totalAttacks = current.rows.reduce((n, r) => n + Object.values(r.metrics.attacks).reduce((a, b) => a + b, 0), 0);
  const totalLandings = current.rows.reduce((n, r) => n + Object.values(r.metrics.seaLandings).reduce((a, b) => a + b, 0), 0);
  const summaryTiles = [
    ['Simulations', total], ['Unresolved at horizon', unresolved],
    ['Observed attacks', totalAttacks.toLocaleString('en-US')],
    ['Observed sea landings', totalLandings.toLocaleString('en-US')]
  ];
  const deltaCell = row => {
    const d = delta.byGroup[row.id];
    return d ? '<td class="' + (d.cityChange > 0 ? 'good' : d.cityChange < 0 ? 'bad' : '') + '">' +
      (d.cityChange > 0 ? '+' : '') + fixed(d.cityChange) + '</td>' : '';
  };
  const summaryRows = groups.map(g => '<tr><td>' + htmlEscape(current.modes[g.mode].title) +
    '</td><td>' + htmlEscape(g.player) + '</td><td>' + htmlEscape(g.difficulty) +
    '</td><td>' + g.wins + '/' + g.count + '</td><td>' + g.unresolved +
    '</td><td>' + fixed(g.cities) + '</td><td>' + fixed(g.ownLoss) +
    '</td><td>' + fixed(g.landings) + '</td><td>' + fixed(g.frontSwitches) +
    '</td>' + (delta.baseline ? deltaCell(g) : '') + '</tr>').join('');
  const chartSections = modes.map(m => '<article class="panel"><h2>' + htmlEscape(current.modes[m].title) +
    '</h2><p>Average cities held by each faction across selected player perspectives and seeds.</p>' +
    plot(m, current, baseline) + '</article>').join('');
  const tiles = summaryTiles.map(([label, val]) =>
    '<div class="metric"><span>' + htmlEscape(label) + '</span><strong>' + htmlEscape(val) + '</strong></div>').join('');
  const rows = delta.baseline ? delta.rows : [];
  const pairedDetails = rows.length ? '<details class="panel"><summary>Inspect all ' + rows.length +
    ' matched runs</summary><div class="table-scroll"><table><thead><tr><th>Mode</th><th>Faction</th><th>Difficulty</th><th>Seed</th><th>Δ cities</th><th>Δ losses</th><th>Δ landings</th><th>Δ switches</th><th>Win before / after</th></tr></thead><tbody>' +
    rows.map(r => '<tr><td>' + htmlEscape(r.mode) + '</td><td>' + htmlEscape(r.player) +
      '</td><td>' + htmlEscape(r.difficulty) + '</td><td>' + r.seed + '</td><td>' +
      r.cityChange + '</td><td>' + r.enemyLossChange + '</td><td>' + r.seaLandingChange +
      '</td><td>' + r.frontSwitchChange + '</td><td>' +
      (r.beforeWin ? 'Win' : r.beforeResolved ? 'Other result' : 'Unresolved') + ' / ' +
      (r.afterWin ? 'Win' : r.afterResolved ? 'Other result' : 'Unresolved') + '</td></tr>').join('') +
    '</tbody></table></div></details>' : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Knightmare Conquest — Balance Dashboard</title><style>' +
    ':root{color-scheme:dark;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#111b24;color:#e9eff4}' +
    'body{margin:0;padding:24px;line-height:1.5}main{max-width:1250px;margin:auto}h1{font-size:clamp(25px,4vw,39px);margin:0}h2{font-size:19px;margin:0 0 8px}p{color:#b6c3cd;margin:0 0 15px}' +
    'header{padding:26px 0 32px}header small{color:#84a9c4;letter-spacing:.08em;text-transform:uppercase}' +
    '.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:0 0 28px}' +
    '.metric,.panel{background:#1b2934;border:1px solid #344653;border-radius:13px;padding:19px}' +
    '.metric span{display:block;color:#afc0cb;font-size:13px}.metric strong{display:block;font-size:29px;margin-top:6px}' +
    '.panel{margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr));gap:14px}' +
    '.chart svg{width:100%;height:auto;display:block}.legends{display:flex;flex-wrap:wrap;gap:9px 16px;font-size:12px;color:#c0cbd3}' +
    '.legend{display:inline-flex;align-items:center;gap:7px}.legend i{display:block;width:13px;height:3px;border-radius:4px}' +
    '.table-scroll{max-width:100%;overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px;white-space:nowrap}' +
    'th,td{padding:10px 12px;text-align:right;border-bottom:1px solid #334451}th{color:#b7cad6;background:#263846}' +
    'th:first-child,td:first-child{text-align:left}tr:hover{background:#243644}.good{color:#8fdda4}.bad{color:#f0a6a6}' +
    'summary{cursor:pointer;font-weight:600}.note{padding:17px;border-left:3px solid #5e849b;background:#182630;border-radius:7px;margin:20px 0;color:#c7d4db}' +
    'footer{font-size:12px;color:#94a7b4;margin-top:26px}' +
    '</style></head><body><main><header><small>Code Geass · Development diagnostics</small><h1>Automated Balance Dashboard</h1>' +
    '<p>Generated ' + htmlEscape(current.generatedAt) + ' · ' + (delta.baseline ? 'Paired comparison with baseline' : 'Standalone seeded benchmark') +
    ' · through turn ' + current.configuration.maxTurns + '</p></header>' +
    '<section class="metrics">' + tiles + '</section>' +
    '<section class="panel"><h2>Faction and difficulty results</h2><div class="table-scroll"><table><thead><tr>' +
    '<th>Operation</th><th>Selected faction</th><th>Difficulty</th><th>Wins</th><th>Unresolved</th><th>Final cities</th>' +
    '<th>Own losses</th><th>Sea landings</th><th>Front switches</th>' + (delta.baseline ? '<th>Δ cities</th>' : '') +
    '</tr></thead><tbody>' + summaryRows + '</tbody></table></div></section><div class="grid">' + chartSections + '</div>' +
    pairedDetails + '<div class="note"><strong>How to read this:</strong> All factions act through the game AI. The chosen faction determines starting difficulty bonuses. Unresolved games are not counted as defeats. ' +
    'Naval landings count actual disembarkation events, not invasion success. Casualties reflect observed formation disappearances. ' +
    'Changes are candidate minus baseline for identical seeds, modes, selected factions and difficulty settings. Compare several metrics and hold-out seeds before changing balance.</div>' +
    '<footer>Generated from Knightmare Conquest engine rules. No gameplay files are modified by this report.</footer></main></body></html>';
}
module.exports = { average, isWin, key, compare, groupsByPerspective, markdown, html, plot };

/* Scenario of the Week: distinct regional-event entry, weekly claims and reward state.
   The first Singapore-time week (12-18 Oct 2026) features Invasion of Japan. */
'use strict';
const WEEKLY_SCENARIO_TIERS = Object.freeze([
  { id: 'normal', label: 'Normal', tokens: 20, fragments: 2, rarity: 'Rare' },
  { id: 'hard', label: 'Hard', tokens: 40, fragments: 2, rarity: 'Epic' },
  { id: 'challenge', label: 'Challenge', tokens: 60, fragments: 3, rarity: 'Legendary' },
  { id: 'elite', label: 'Elite', tokens: 80, fragments: 3, rarity: 'Any rarity' }
]);
const WEEKLY_SCENARIO_ROTATION = Object.freeze([
  'invasion-japan', 'division-japan', 'war-for-australia', 'european-war'
]);
const WEEKLY_SCENARIO_ANCHOR = Date.UTC(2026, 9, 12);
const WEEKLY_SCENARIO_MS = 7 * 24 * 60 * 60 * 1000;

// Always use Asia/Singapore, even for players with another device timezone.
function weeklyScenarioCurrent(now = Date.now()) {
  const local = new Date(now + 8 * 60 * 60 * 1000);
  const today = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const monday = today - ((local.getUTCDay() + 6) % 7) * 86400000;
  const index = Math.max(0, Math.floor((monday - WEEKLY_SCENARIO_ANCHOR) / WEEKLY_SCENARIO_MS));
  const scenarioId = WEEKLY_SCENARIO_ROTATION[index % WEEKLY_SCENARIO_ROTATION.length];
  return {
    id: new Date(monday).toISOString().slice(0, 10),
    scenarioId,
    endsAt: monday + WEEKLY_SCENARIO_MS - 8 * 60 * 60 * 1000,
    index
  };
}
function weeklyScenarioValidRun(g, current = weeklyScenarioCurrent()) {
  return !!g && g.mode === 'scenario' && !g.warCampaign &&
    g.weeklyScenario?.weekId === current.id &&
    g.weeklyScenario?.scenarioId === current.scenarioId &&
    g.scenario?.id === current.scenarioId;
}
function weeklyScenarioTierIndex(difficulty) {
  return WEEKLY_SCENARIO_TIERS.findIndex(t => t.id === difficulty);
}
function weeklyScenarioClaims(profile, weekId) {
  return profile.weeklyScenarioClaims?.[weekId] || {};
}
function weeklyScenarioCatalogHTML(term = '') {
  const current = weeklyScenarioCurrent();
  const entry = SCENARIO_MANIFEST.find(s => s.id === current.scenarioId);
  if (!entry) return '';
  if (term && !(entry.title + ' Scenario of the Week ' + entry.note).toLowerCase().includes(term.toLowerCase()))
    return '';
  const claimed = weeklyScenarioClaims(loadProfile(), current.id);
  const best = [...WEEKLY_SCENARIO_TIERS].reverse().find(t => claimed[t.id]);
  const state = best ? 'Cleared through ' + best.label : 'Up to 10 fragments + 200 tokens';
  return '<section class="scenario-catalog-section scenario-weekly-section" aria-label="Scenario of the Week">' +
    '<div class="scenario-catalog-group">Scenario of the Week <span>Weekly event</span></div>' +
    '<button class="scenario-entry scenario-weekly-entry ' +
    (scenarioWeeklySelected ? 'active' : '') +
    '" type="button" data-scenario-weekly="1" aria-pressed="' + scenarioWeeklySelected + '">' +
    '<span class="scenario-entry-marker" aria-hidden="true">★</span>' +
    '<span class="scenario-entry-copy"><strong>' + esc(entry.title) +
    '</strong><small>' + esc(state) + '</small></span>' +
    '<span class="scenario-entry-tail" aria-hidden="true">›</span></button></section>';
}
function weeklyScenarioInfoHTML(difficulty = 'normal') {
  const current = weeklyScenarioCurrent();
  const level = Math.max(0, weeklyScenarioTierIndex(difficulty));
  const claimed = weeklyScenarioClaims(loadProfile(), current.id);
  const timeText = new Date(current.endsAt).toLocaleDateString('en-SG',
    { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric' });
  const rows = WEEKLY_SCENARIO_TIERS.map((tier, index) => {
    const done = !!claimed[tier.id];
    return '<div class="scenario-weekly-reward-row' + (done ? ' claimed' : '') + '">' +
      '<span>' + esc(tier.label) + (done ? ' ✓' : '') + '</span>' +
      '<span>+' + tier.tokens + ' tokens · +' + tier.fragments + ' ' + esc(tier.rarity) + '</span></div>';
  }).join('');
  const unclaimed = WEEKLY_SCENARIO_TIERS.slice(0, level + 1).filter(t => !claimed[t.id]);
  const tokens = unclaimed.reduce((total, tier) => total + tier.tokens, 0);
  const fragments = unclaimed.reduce((total, tier) => total + tier.fragments, 0);
  return '<section class="scenario-weekly-info" aria-label="Weekly event rewards">' +
    '<div class="scenario-brief-eyebrow">SCENARIO OF THE WEEK · THROUGH ' + esc(timeText) + '</div>' +
    '<p>Win at a higher difficulty to receive every unclaimed lower-tier reward. Each tier pays once this week.</p>' +
    '<div class="scenario-weekly-rewards">' + rows + '</div>' +
    '<p class="scenario-weekly-earn">Victory at ' + esc(WEEKLY_SCENARIO_TIERS[level].label) +
    ': <b>+' + tokens + ' tokens · +' + fragments + ' selectable fragments</b> still available.</p>' +
    '</section>';
}
function weeklyScenarioSavedGame() {
  const saved = getSave(WEEKLY_SCENARIO_KEY);
  return saved && !saved.over && weeklyScenarioValidRun(saved) ? saved : null;
}
// Claims are keyed by Singapore Monday + difficulty, never by an individual battle seed.
// A single Elite win pays all four tiers at most once, regardless of reloads/replays.
function claimWeeklyScenarioReward(g = game) {
  if (!g || !g.over || g.over.winner !== g.player || !g.weeklyScenario)
    return { ok: true, tokens: 0, fragments: 0, tiers: [] };
  if (!weeklyScenarioValidRun(g))
    return { ok: false, expired: true, reason: 'This weekly event has expired. No new weekly rewards can be earned.' };
  const limit = weeklyScenarioTierIndex(g.difficulty);
  if (limit < 0) return { ok: false, reason: 'Unknown weekly difficulty.' };
  const current = weeklyScenarioCurrent();
  const profile = loadProfile();
  profile.weeklyScenarioClaims ||= {};
  const claimed = profile.weeklyScenarioClaims[current.id] ||= {};
  let tokens = 0, fragments = 0;
  const tiers = [];
  for (const tier of WEEKLY_SCENARIO_TIERS.slice(0, limit + 1)) {
    if (claimed[tier.id]) continue;
    // The selectable award is persisted with the same transaction as the tier claim.
    const key = 'weekly:' + current.id + ':' + tier.id;
    if (!queueEliteReward(profile, { player: g.player, difficulty: tier.id },
      key, tier.fragments, 'Scenario of the Week')) {
      return { ok: false, reason: 'Weekly fragment reward could not be queued.' };
    }
    claimed[tier.id] = true;
    tokens += tier.tokens;
    fragments += tier.fragments;
    tiers.push(tier.label);
  }
  if (!tiers.length) return { ok: true, tokens: 0, fragments: 0, tiers: [] };
  profile.tokens = (profile.tokens || 0) + tokens;
  if (!saveProfile(profile))
    return { ok: false, reason: 'Could not save weekly HQ rewards. Reopen the victory result to retry.' };
  return { ok: true, tokens, fragments, tiers };
}
function weeklyScenarioResultHTML(result) {
  if (!result) return '';
  if (!result.ok)
    return '<div class="reward"><b>Weekly rewards unavailable</b><p>' + esc(result.reason) + '</p></div>';
  if (!result.tiers.length)
    return '<div class="reward"><b>Weekly rewards already claimed</b><p>Replay freely; each difficulty tier pays once per week.</p></div>';
  return '<div class="reward"><b>Scenario of the Week · +' + result.tokens +
    ' command tokens</b><p>+' + result.fragments + ' selectable elite fragments across ' +
    esc(result.tiers.join(', ')) + '.</p></div>';
}

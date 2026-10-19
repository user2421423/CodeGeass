/* One shared Elite fragment loot-box selector for every reward source.
   Rewards are guaranteed selectable bundles, not random draws. */
'use strict';
const ELITE_BOX_RARITY_ORDER = Object.freeze({ Rare: 0, Epic: 1, Legendary: 2, Any: 3 });

// Order every Elite roster Infantry (scout/assault/raider), Artillery
// (support/rocket/siege), Armor (light/medium/heavy/super), then naval.
const ELITE_CLASS_DISPLAY_ORDER = Object.freeze({
  scout: 0, assault: 1, raider: 2,
  support: 3, rocket: 4, siege: 5,
  light: 6, medium: 7, heavy: 8, super: 9,
});
function eliteDisplayOrder(id) {
  const type = E.TYPES[E.ELITE_FORCES[id].type];
  if (type.naval === 'amphibious') return 10;
  if (type.naval === 'ship') return 11;
  return ELITE_CLASS_DISPLAY_ORDER[type.cls] ?? 12;
}
function compareEliteDisplayOrder(a, b) {
  return eliteDisplayOrder(a) - eliteDisplayOrder(b) ||
    E.TYPES[E.ELITE_FORCES[a].type].name.localeCompare(E.TYPES[E.ELITE_FORCES[b].type].name) ||
    a.localeCompare(b);
}

function eliteBoxRarityOrder(rarity) {
  return ELITE_BOX_RARITY_ORDER[rarity] ?? 4;
}
function eliteBoxSortedOptions(award, profile) {
  return eligibleEliteRewardOptions(award, profile).sort((a, b) => {
    const first = E.ELITE_FORCES[a], second = E.ELITE_FORCES[b];
    return eliteBoxRarityOrder(first.rarity) - eliteBoxRarityOrder(second.rarity) ||
      compareEliteDisplayOrder(a, b);
  });
}
// Used by both the actual Elite factory cards and the fragment-choice preview;
// the unit artwork, class, powers and stat layout have a single source of truth.
function eliteCardPresentationHTML(id, requestedLevel, movement = null) {
  const elite = E.ELITE_FORCES[id], type = E.TYPES[elite.type];
  const level = Math.max(1, Math.min(E.ELITE_MAX_LEVEL, Number(requestedLevel) || 1));
  const stats = E.eliteStats(id, level);
  const move = movement === null ? stats.move : movement;
  const cls = typeof eliteClassLabel === 'function' ? eliteClassLabel(type) :
    (type.naval === 'amphibious' ? 'Amphibious' : type.naval === 'ship' ? 'Naval Ship' : type.branch + ' · ' + type.cls);
  const active = level >= 5 ? elite.lv5Text : level >= 3 ? elite.lv3Text : 'Signature ability unlocks at Elite Lv.3.';
  return ART.unit(elite.type, 'catalog-ship', type.side) +
    '<span class="unit-code">' + esc(cls) + ' · ' + esc(elite.rarity) + ' · Elite Lv.' + level + '</span>' +
    '<h3>' + esc(type.name) + '</h3>' +
    '<span class="weapon-focus">' + esc(type.role) + ' · ' + esc(elite.skill) + '</span>' +
    '<p>' + esc(active) + '</p><p class="lore">' + esc(type.weapon || '') + '</p>' +
    '<div class="unit-spec"><span>HP ' + stats.hp + '</span>' +
    '<span>' + ICONS.use('atk') + stats.attack + '</span>' +
    '<span>' + ICONS.use('def') + stats.armor + '</span>' +
    '<span>' + ICONS.use('mov') + move + '</span>' +
    (type.seaMove ? '<span>Sea ' + type.seaMove + '</span>' : '') +
    '<span>' + ICONS.use('rng') + (stats.min === stats.max ? stats.max : stats.min + '–' + stats.max) + '</span></div>' +
    '<div class="elite-box-ability"><b>Lv.3 ability</b> ' + esc(elite.lv3Text) + '</div>' +
    '<div class="elite-box-ability"><b>Lv.5 ability</b> ' + esc(elite.lv5Text) + '</div>';
}
function eliteLootBoxComparisonHTML(key, level, profile = loadProfile()) {
  const award = (profile.pendingEliteRewards || []).find(entry => entry.key === key);
  if (!award) return '<p class="description">This reward has already been claimed.</p>';
  const choices = eliteBoxSortedOptions(award, profile);
  let lastRarity = '';
  return choices.map(id => {
    const elite = E.ELITE_FORCES[id], record = E.eliteProfile(profile)[id];
    const rarityHeader = elite.rarity !== lastRarity
      ? '<h4 class="elite-box-tier-header">' + esc(elite.rarity) + ' Elite Forces</h4>' : '';
    lastRarity = elite.rarity;
    return rarityHeader +
      '<article class="unit-card elite-card elite-box-unit elite-rarity-' + elite.rarity.toLowerCase() + '">' +
      eliteCardPresentationHTML(id, level) +
      '<div class="elite-fragments">HQ: ' + (record.level ? 'Lv.' + record.level : 'Locked') +
      ' · ' + record.fragments + ' fragments owned</div>' +
      '<button class="primary" data-reward-elite="' + esc(id) + '" data-reward-key="' + esc(key) + '">' +
      'Choose ' + esc(E.TYPES[elite.type].name) + ' · +' + award.amount + ' fragments</button></article>';
  }).join('');
}
function eliteLootBoxPickerHTML(key, level = 1, profile = loadProfile()) {
  const award = (profile.pendingEliteRewards || []).find(entry => entry.key === key);
  if (!award) return '';
  if (!eliteBoxSortedOptions(award, profile).length)
    return '<p class="description">All eligible Elite Forces have reached maximum level. This reward remains unclaimed.</p>';
  const chosen = Math.max(1, Math.min(E.ELITE_MAX_LEVEL, Number(level) || 1));
  return '<div class="elite-box-picker-head"><div><b>Select one Elite Force</b>' +
    '<p>Compare the same unit art, abilities and base stats as in the Elite factory. Preview levels do not upgrade units.</p></div>' +
    '<label class="elite-box-level-control">Preview level <strong data-reward-level-label>Lv.' + chosen + '</strong>' +
    '<input type="range" min="1" max="' + E.ELITE_MAX_LEVEL + '" step="1" value="' + chosen +
    '" data-reward-level="' + esc(key) + '" aria-label="Compare Elite Forces by level">' +
    '<span class="elite-box-level-ticks">Lv.1 <span>Lv.' + E.ELITE_MAX_LEVEL + '</span></span></label></div>' +
    '<div class="elite-lootbox-comparison">' + eliteLootBoxComparisonHTML(key, chosen, profile) + '</div>';
}
// Derive an unambiguous origin even for Story rewards saved by older versions
// that only recorded "Story Mode 3★" without the mission name.
function eliteRewardOrigin(award) {
  if (award.key?.startsWith('story:')) {
    const [, id, difficulty] = award.key.split(':');
    const mission = E.campaign?.mission?.(id);
    const tier = { normal: 'Normal', hard: 'Hard', challenge: 'Challenge', elite: 'Elite' }[difficulty] || difficulty;
    return 'Story Mode · ' + (mission?.title || id) + ' · ' + tier + ' 3★';
  }
  return award.source || 'Elite fragment reward';
}
function eliteLootBoxPanelHTML(profile = loadProfile(), rewardKey = null) {
  const pending = (profile.pendingEliteRewards || [])
    .filter(award => rewardKey === null || award.key === rewardKey)
    .slice().sort((a, b) =>
      eliteBoxRarityOrder(a.rarity) - eliteBoxRarityOrder(b.rarity));
  if (!pending.length) return '';
  const cards = pending.map(award => {
    const options = eliteBoxSortedOptions(award, profile);
    const rarity = ['Rare','Epic','Legendary'].includes(award.rarity) ? award.rarity : 'Any';
    const disabled = !options.length;
    return '<article class="elite-lootbox elite-rarity-' + rarity.toLowerCase() + '" data-lootbox-key="' +
      esc(award.key) + '">' +
      '<div class="elite-lootbox-heading"><span class="elite-lootbox-symbol" aria-hidden="true">◆</span>' +
      '<div><span class="elite-lootbox-rarity">' + esc(rarity === 'Any' ? 'Any rarity' : rarity) +
      ' Elite loot box</span><b>+' + award.amount + ' selectable fragments</b>' +
      '<small>Source: ' + esc(eliteRewardOrigin(award)) + ' · ' + options.length + ' eligible Elite Forces</small></div></div>' +
      (disabled ? '<p class="elite-lootbox-blocked">All eligible Elite Forces are at maximum level. This reward remains unclaimed and saved.</p>' :
        '<button class="elite-lootbox-open" data-reward-open="' + esc(award.key) +
        '" aria-expanded="false">Open box · Choose Elite</button>') +
      '<div class="elite-lootbox-picker" aria-live="polite"></div></article>';
  }).join('');
  return '<section class="elite-lootbox-panel" data-elite-choice-panel="1" aria-label="Unclaimed Elite loot boxes">' +
    '<div class="elite-lootbox-title"><b>Elite fragment loot boxes</b><small>' + pending.length +
    ' unclaimed · sorted Rare → Epic → Legendary → Any · all choices saved</small></div>' +
    '<p class="elite-lootbox-note">Each box gives its entire fragment amount to ONE Elite Force you choose. No random selection.</p>' +
    '<div class="elite-lootbox-list">' + cards + '</div></section>';
}
function openEliteRewardBox(key, trigger) {
  const card = trigger.closest('.elite-lootbox');
  if (!card || card.dataset.lootboxKey !== key) return;
  const pane = card.querySelector('.elite-lootbox-picker');
  if (!pane) return;
  const alreadyOpen = trigger.getAttribute('aria-expanded') === 'true';
  const root = card.closest('[data-elite-choice-panel]');
  if (root) root.querySelectorAll('[data-reward-open]').forEach(button => {
    button.setAttribute('aria-expanded', 'false');
    const sibling = button.closest('.elite-lootbox')?.querySelector('.elite-lootbox-picker');
    if (sibling) sibling.innerHTML = '';
  });
  if (!alreadyOpen) {
    pane.innerHTML = eliteLootBoxPickerHTML(key);
    trigger.setAttribute('aria-expanded', 'true');
  }
}
document.addEventListener('input', event => {
  const slider = event.target.closest('input[data-reward-level]');
  if (!slider) return;
  const picker = slider.closest('.elite-lootbox-picker');
  const comparison = picker?.querySelector('.elite-lootbox-comparison');
  if (!comparison) return;
  const level = Math.max(1, Math.min(E.ELITE_MAX_LEVEL, +slider.value || 1));
  picker.querySelector('[data-reward-level-label]').textContent = 'Lv.' + level;
  comparison.innerHTML = eliteLootBoxComparisonHTML(slider.dataset.rewardLevel, level);
});

/* Section 9: commission-based commander roster with large side portraits and concise skills.
 * Gameplay, prices, commander data and original action handlers are unchanged. */
(() => {
  'use strict';
  const controls = { query: '', commission: 'all', ownership: 'all', rank: 'all', sort: 'commission' };
  const branches = ['infantry', 'armor', 'artillery'];
  const ratingKeys = [...branches, 'mobility'];
  // The comparison picks remain selected when switching faction tabs.
  let comparisonPicks = [];

  function commanderState(k, mode, profile) {
    const recruited = mode === 'assignment' || E.owns(profile, k);
    const officer = mode === 'assignment' ? game.roster[k] :
      (recruited ? E.roster(profile)[k] : null);
    return {
      recruited,
      officer: officer || E.defaultOfficer(k, true),
    };
  }

  const safe = value => esc(String(value ?? ''));
  const starsHTML = number => '<span class="cc-stars" aria-label="' + number +
    ' out of ' + E.MAX_RATING + ' stars">' +
    Array.from({ length: E.MAX_RATING }, (_, i) =>
      '<span aria-hidden="true" class="' + (i < number ? 'lit' : 'dim') + '">★</span>').join('') +
    '</span>';

  function prepareClassicCard(card, mode, profile) {
    const portrait = card.querySelector('[data-general]');
    if (!portrait) return;
    const k = portrait.dataset.general;
    const a = C(k);
    const { recruited, officer } = commanderState(k, mode, profile);
    const ratings = officer.ratings || {};
    // Personal commanders only benefit from stars unlocked by their current rank.
    const activeRating = key => Math.min(ratings[key] || 0, E.ratingCap(officer.rank, key));
    const commission = E.commissionOf(k, officer);
    const tier = {standard:3, distinguished:2, legendary:1}[commission];

    // Keep real action markup and its original event delegation, requirements and costs.
    const actionMarkup = card.querySelector('.officer-actions')?.outerHTML || '';
    card.classList.add('cc-card', 'cc-tier-' + tier);
    card.dataset.commission = commission;
    card.dataset.recruited = recruited ? 'yes' : 'no';
    card.dataset.rank = String(officer.rank);
    card.dataset.name = a.name.toLocaleLowerCase();
    card.dataset.faction = a.side;
    card.dataset.role = (a.role || '').toLocaleLowerCase();
    card.dataset.remaining = String(recruited && mode === 'hq'
      ? (E.commanderPlan(profile, k)?.total || 0) : E.recruitPrice(k));
    for (const r of ratingKeys) card.dataset['rating' + r] = String(activeRating(r));

    const ratingsMarkup = ratingKeys.map(key =>
      '<div class="cc-rating"><span>' + safe(E.BRANCH_NAMES[key]) + '</span>' +
      starsHTML(activeRating(key)) + '</div>').join('');

    // Use the game's existing faction flag artwork, never a generated emblem.
    // The JLF share the Black Knights standard; Euro Britannia uses Britannia's.
    const watermarkSide = a.side === 'jlf' ? 'bk' : a.side === 'eb' ? 'britannia' : a.side;
    const watermarkGraphic = ART.flagSVG(watermarkSide);
    const watermarkMarkup = watermarkGraphic
      ? '<span class="cc-faction-watermark" aria-hidden="true">' + watermarkGraphic + '</span>'
      : '';

    // A full-bleed portrait fills the entire left edge, like the original roster.
    // The right side contains rank, ratings and actions only; abilities are
    // intentionally absent from the card (they remain in Commander Info).
    card.innerHTML = '<div class="cc-card-portrait">' +
        generalPortrait(k, 'cc-portrait-art', true) + '</div>' +
      '<div class="cc-card-info">' +
        '<div class="cc-card-top"><span class="cc-tier">' + safe(E.commissionName(commission)) + ' Commission</span></div>' +
        '<div class="cc-name-group"><h3>' + safe(a.name) + '</h3>' +
          '<div class="cc-rank-line"><b>' + safe(E.RANKS[officer.rank] || E.RANKS[0]) + '</b></div>' +
          (recruited && officer.honors?.length ? '<div class="honors-mini">' + officer.honors.slice(0,3).map(h => honorIcon(h.id)).join('') + (officer.honors.length>3?'<small>+'+(officer.honors.length-3)+'</small>':'') + '</div>' : '') +
        '</div>' +
        '<div class="cc-card-ratings" aria-label="Commander ratings">' + ratingsMarkup + '</div>' +
        watermarkMarkup +
        '<div class="cc-card-bottom">' +
          actionMarkup +
        '</div>' +
      '</div>';

    // The original [data-general] portrait still opens Commander Info.
    // Give the other non-button portions the same behavior, without intercepting
    // recruitment, assignment, and upgrade controls.
    card.tabIndex = 0;
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', a.name + '. Press Enter for Commander Info.');
    card.addEventListener('click', event => {
      if (!event.target.closest('[data-general],button,a,input,select')) generalDialog(k, true);
    });
    card.addEventListener('keydown', event => {
      if (event.target === card && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        generalDialog(k, true);
      }
    });
  }

  function setupFilters(dialog, mode) {
    const grids = [...dialog.querySelectorAll('.admiral-grid.officers')];
    if (!grids.length) return;
    const cards = grids.flatMap(grid => [...grid.querySelectorAll('.officer')]);
    const profile = loadProfile();
    cards.forEach(card => prepareClassicCard(card, mode, profile));
    if (mode === 'hq') {
      for (const card of cards) {
        const k = card.querySelector('[data-general]')?.dataset.general;
        const controlsArea = card.querySelector('.cc-card-bottom');
        if (!k || !controlsArea) continue;
        const compare = document.createElement('button');
        compare.type = 'button';
        compare.className = 'small cc-compare-toggle';
        compare.dataset.ccCompare = k;
        compare.textContent = 'Compare';
        controlsArea.append(compare);
      }
    }
    const availableRanks = [...new Set(cards.map(card => Number(card.dataset.rank)))].sort((a, b) => b - a);
    if (controls.rank !== 'all' && !availableRanks.includes(Number(controls.rank))) controls.rank = 'all';

    const first = grids[0];
    const headings = grids.map(grid => grid.previousElementSibling)
      .filter(heading => heading?.classList.contains('officer-section'));
    const toolbar = document.createElement('section');
    toolbar.className = 'cc-tools';
    toolbar.setAttribute('aria-label', 'Commander roster filters');
    const option = (value, label) => '<option value="' + value + '">' + label + '</option>';
    const selector = (label, field, choices) =>
      '<label>' + label + '<select data-cc-filter="' + field + '">' +
      choices.map(x => option(x[0], x[1])).join('') + '</select></label>';

    toolbar.innerHTML = '<div class="cc-toolbar-title"><div><strong>Commander roster</strong>' +
      '<small>Search and sort your commanders · click a portrait to view details</small></div>' +
      '<span class="cc-result-count" aria-live="polite"></span></div>' +
      '<div class="cc-filter-bar">' +
      '<label class="cc-search-label">Search<input type="search" data-cc-filter="query" ' +
      'placeholder="Name or ability" autocomplete="off"></label>' +
      selector('Commission', 'commission', [['all', 'All commissions'], ['standard', 'Standard'], ['distinguished', 'Distinguished'], ['legendary', 'Legendary']]) +
      (mode === 'hq' ? selector('Ownership', 'ownership',
        [['all', 'All commanders'], ['yes', 'Recruited'], ['no', 'Unrecruited']]) : '') +
      selector('Military Rank', 'rank', [['all', 'All ranks'],
        ...availableRanks.map(rank => [String(rank), safe(E.RANKS[rank] || E.RANKS[0])])]) +
      selector('Sort by', 'sort', [['commission', 'Commission'], ['name', 'Name A–Z'],
        ['faction', 'Faction'], ['ownership', 'Owned first'], ['role', 'Unit specialty'],
        ['rank', 'Rank'], ['remaining', 'Remaining upgrade cost'],
        ['infantry', 'Infantry rating'], ['armor', 'Armor rating'],
        ['artillery', 'Artillery rating'], ['mobility', 'Mobility rating']]) + '</div>';

    const roster = document.createElement('div');
    roster.className = 'admiral-grid officers cc-roster';
    roster.setAttribute('aria-label', 'Commander cards');
    const empty = document.createElement('p');
    empty.className = 'cc-empty';
    empty.textContent = 'No commanders match these filters.';
    const comparePanel = document.createElement('section');
    comparePanel.className = 'cc-comparison';
    comparePanel.setAttribute('aria-live', 'polite');
    if (mode === 'hq') first.before(toolbar, comparePanel, roster, empty);
    else first.before(toolbar, roster, empty);

    // Remove the obsolete split headings; results now combine all filtered cards.
    // Leave the unrelated "Operation commanders" section below intact.
    headings.forEach(heading => heading.remove());
    grids.forEach(grid => grid.remove());
    cards.forEach(card => roster.append(card));

    toolbar.querySelectorAll('[data-cc-filter]').forEach(el => {
      if (mode === 'assignment' && el.dataset.ccFilter === 'ownership') return;
      el.value = controls[el.dataset.ccFilter];
    });

    function renderComparison() {
      if (mode !== 'hq') return;
      const picks = comparisonPicks.slice(0, 2);
      const cell = k => {
        const a = C(k);
        const recruited = E.owns(profile, k);
        // Unowned commanders show their actual starting HQ stats rather
        // than the unrelated scripted operation commander's stats.
        const o = recruited ? E.roster(profile)[k] : E.defaultOfficer(k, true);
        const plan = recruited ? E.commanderPlan(profile, k) : null;
        const ratings = ratingKeys.map(branch => {
          const active = Math.min(o.ratings[branch] || 0, E.ratingCap(o.rank, branch));
          return '<div><span>' + safe(E.BRANCH_NAMES[branch]) + '</span><b>' +
            active + '/6 ★</b></div>';
        }).join('');
        const skills = Object.entries(o.generics || {}).map(([id, level]) =>
          safe(E.GENERIC_SKILLS[id]?.name || id) + ' Lv.' + level).join(', ');
        return '<article class="cc-compare-person"><h4>' + safe(a.name) + '</h4>' +
          '<p>' + safe(a.side.toUpperCase()) + ' · ' + safe(a.role) +
          ' · ' + safe(E.commissionName(E.commissionOf(k, o))) +
          ' · ' + safe(E.RANKS[o.rank]) + '</p>' +
          '<div class="cc-compare-ratings">' + ratings + '</div>' +
          '<p><b>Signature: ' + safe(a.skill) + '</b> — ' + safe(a.desc) + '</p>' +
          '<p><b>Base stats:</b> ' + safe(E.commanderStatsText(k) || 'No additional base modifiers') + '</p>' +
          '<p><b>Generic skills:</b> ' + (skills || 'None yet') + '</p>' +
          '<p><b>' + (recruited ? 'Remaining development' : 'Recruitment') + ':</b> ' +
            Number(recruited ? plan.total : E.recruitPrice(k)).toLocaleString() + ' tokens</p>' +
          '</article>';
      };
      comparePanel.innerHTML = '<div class="cc-compare-heading"><b>Commander comparison</b>' +
        '<button type="button" class="small" data-cc-compare-clear>Clear selection</button></div>' +
        (picks.length ? '<div class="cc-compare-grid">' + picks.map(cell).join('') +
          (picks.length === 1 ? '<p class="cc-compare-placeholder">Select a second commander to compare abilities, ratings and upgrade costs.</p>' : '') +
          '</div>' : '<p>Select two commanders using Compare on their roster cards. You can switch factions between selections.</p>');
      for (const button of dialog.querySelectorAll('[data-cc-compare]')) {
        const active = picks.includes(button.dataset.ccCompare);
        button.setAttribute('aria-pressed', String(active));
        button.textContent = active ? 'Selected for comparison' : 'Compare';
      }
    }
    if (mode === 'hq') {
      dialog.addEventListener('click', event => {
        const button = event.target.closest('[data-cc-compare], [data-cc-compare-clear]');
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        if (button.dataset.ccCompareClear !== undefined) comparisonPicks = [];
        else {
          const id = button.dataset.ccCompare;
          if (comparisonPicks.includes(id)) comparisonPicks = comparisonPicks.filter(k => k !== id);
          else {
            if (comparisonPicks.length === 2) comparisonPicks.shift();
            comparisonPicks.push(id);
          }
        }
        renderComparison();
      });
      renderComparison();
    }

    function apply() {
      const query = controls.query.trim().toLocaleLowerCase();
      const visible = cards.filter(card => {
        const k = card.querySelector('[data-general]').dataset.general;
        const a = C(k);
        return (controls.commission === 'all' || card.dataset.commission === controls.commission) &&
          (mode !== 'hq' || controls.ownership === 'all' ||
            card.dataset.recruited === controls.ownership) &&
          (controls.rank === 'all' || card.dataset.rank === controls.rank) &&
          (!query || [a.name, a.short, a.skill, a.title, a.desc]
            .filter(Boolean).join(' ').toLocaleLowerCase().includes(query));
      });
      visible.sort((a, b) => {
        if (controls.sort === 'name') return a.dataset.name.localeCompare(b.dataset.name);
        if (controls.sort === 'faction') return a.dataset.faction.localeCompare(b.dataset.faction) ||
          a.dataset.name.localeCompare(b.dataset.name);
        if (controls.sort === 'role') return a.dataset.role.localeCompare(b.dataset.role) ||
          a.dataset.name.localeCompare(b.dataset.name);
        if (controls.sort === 'ownership') return (b.dataset.recruited === 'yes') -
          (a.dataset.recruited === 'yes') || a.dataset.name.localeCompare(b.dataset.name);
        if (controls.sort === 'commission')
          return ({legendary:1, distinguished:2, standard:3}[a.dataset.commission] - {legendary:1, distinguished:2, standard:3}[b.dataset.commission]) ||
            a.dataset.name.localeCompare(b.dataset.name);
        const value = controls.sort === 'rank' ? 'rank' : 'rating' + controls.sort;
        return Number(b.dataset[value]) - Number(a.dataset[value]) ||
          a.dataset.name.localeCompare(b.dataset.name);
      });
      roster.replaceChildren(...visible);
      empty.hidden = visible.length > 0;
      toolbar.querySelector('.cc-result-count').textContent =
        visible.length + ' of ' + cards.length + ' commanders';
    }

    toolbar.addEventListener('input', event => {
      const field = event.target?.dataset?.ccFilter;
      if (!field) return;
      controls[field] = event.target.value;
      apply();
    });
    toolbar.addEventListener('change', event => {
      const field = event.target?.dataset?.ccFilter;
      if (!field) return;
      controls[field] = event.target.value;
      apply();
    });
    apply();
  }

  // Euro Britannia's in-operation HQ entry must remain usable even when
  // the normal game click router is busy with a mission-specific command.
  // Handle this navigation at capture time; the HQ dialog itself still uses
  // the same recruitment, upgrade and persistent-profile handlers.
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-action="generals"]');
    if (!button || button.disabled || !game || game.player !== 'eb' ||
        !modal.contains(button)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    hqBack = 'game';
    generalsDialog('all');
  }, true);

  // The existing Commander Info interface is intentionally not restyled.
  // Opening portraits and recruitment/upgrade actions still use original handlers.
  const originalHQ = generalsDialog;
  const originalAssign = admiralDialog;
  generalsDialog = function(...args) {
    const result = originalHQ.apply(this, args);
    const dialog = modal.querySelector('[aria-label="HQ commanders"]');
    if (dialog) {
      dialog.classList.add('cc-roster-dialog');
      setupFilters(dialog, 'hq');
    }
    return result;
  };
  admiralDialog = function(...args) {
    const result = originalAssign.apply(this, args);
    const dialog = modal.querySelector('[aria-label="Unit commanders"]');
    if (dialog) {
      dialog.classList.add('cc-roster-dialog');
      setupFilters(dialog, 'assignment');
    }
    return result;
  };
})();

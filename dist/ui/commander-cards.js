/* Section 9: commission-based commander roster with large side portraits and concise skills.
 * Gameplay, prices, commander data and original action handlers are unchanged. */
(() => {
  'use strict';
  const controls = { query: '', commission: 'all', ownership: 'all', rank: 'all', sort: 'commission' };
  const branches = ['infantry', 'armor', 'artillery'];
  const ratingKeys = [...branches, 'mobility'];

  function commanderState(k, mode, profile) {
    const recruited = mode === 'assignment' || E.owns(profile, k);
    const officer = mode === 'assignment' ? game.roster[k] :
      (recruited ? E.roster(profile)[k] : null);
    return {
      recruited,
      officer: officer || { rank: 0, ratings: { ...E.officer(game, k).ratings } },
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
    const commission = E.commissionOf(k, officer);
    const tier = {standard:3, distinguished:2, legendary:1}[commission];

    // Keep real action markup and its original event delegation, requirements and costs.
    const actionMarkup = card.querySelector('.officer-actions')?.outerHTML || '';
    card.classList.add('cc-card', 'cc-tier-' + tier);
    card.dataset.commission = commission;
    card.dataset.recruited = recruited ? 'yes' : 'no';
    card.dataset.rank = String(officer.rank);
    card.dataset.name = a.name.toLocaleLowerCase();
    for (const r of ratingKeys) card.dataset['rating' + r] = String(r === 'mobility'
      ? Math.min(ratings[r] || 0, E.ratingCap(officer.rank, r)) : (ratings[r] || 0));

    const ratingsMarkup = ratingKeys.map(key =>
      '<div class="cc-rating"><span>' + safe(E.BRANCH_NAMES[key]) + '</span>' +
      starsHTML(key === 'mobility'
        ? Math.min(ratings[key] || 0, E.ratingCap(officer.rank, key))
        : (ratings[key] || 0)) + '</div>').join('');

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
        ['rank', 'Rank'], ['infantry', 'Infantry rating'], ['armor', 'Armor rating'],
        ['artillery', 'Artillery rating'], ['mobility', 'Mobility rating']]) + '</div>';

    const roster = document.createElement('div');
    roster.className = 'admiral-grid officers cc-roster';
    roster.setAttribute('aria-label', 'Commander cards');
    const empty = document.createElement('p');
    empty.className = 'cc-empty';
    empty.textContent = 'No commanders match these filters.';
    first.before(toolbar, roster, empty);

    // Remove the obsolete split headings; results now combine all filtered cards.
    // Leave the unrelated "Operation commanders" section below intact.
    headings.forEach(heading => heading.remove());
    grids.forEach(grid => grid.remove());
    cards.forEach(card => roster.append(card));

    toolbar.querySelectorAll('[data-cc-filter]').forEach(el => {
      if (mode === 'assignment' && el.dataset.ccFilter === 'ownership') return;
      el.value = controls[el.dataset.ccFilter];
    });

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

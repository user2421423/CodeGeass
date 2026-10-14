/* Section 9 revised: retain the classic commander cards, add roster search/sort only.
 * Game data, recruitment prices and all original action handlers are unchanged. */
(() => {
  'use strict';
  const controls = { query: '', tier: 'all', ownership: 'all', specialty: 'all', sort: 'tier' };
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

  function prepareClassicCard(card, mode, profile) {
    const portrait = card.querySelector('[data-general]');
    if (!portrait) return;
    const k = portrait.dataset.general;
    const a = C(k);
    const { recruited, officer } = commanderState(k, mode, profile);
    const ratings = officer.ratings || {};
    const specialty = branches.slice().sort((x, y) =>
      (ratings[y] || 0) - (ratings[x] || 0))[0];
    card.classList.add('cc-classic');
    card.dataset.tier = String(a.storyTier || 3);
    card.dataset.recruited = recruited ? 'yes' : 'no';
    card.dataset.specialty = specialty;
    card.dataset.rank = String(officer.rank);
    card.dataset.name = a.name.toLocaleLowerCase();
    for (const r of ratingKeys) card.dataset['rating' + r] = String(ratings[r] || 0);

    // Reuse the historical card markup instead of replacing it.
    // Hide category/status labels, not the actual ability name, rank or description.
    // Recruitment continues to be identifiable from its original priced Recruit button.
    const label = card.querySelector(':scope > .label');
    if (label) {
      label.textContent = [
        E.RANKS[officer.rank],
        Math.round(E.RANK_HP[officer.rank] * 100) + '% frame',
        a.skill,
      ].join(' · ');
    }
    // Preserve the built-in portrait click target, stars, stats, medals and action buttons.
    // Leave the full card non-interactive so clicking upgrade/recruit is unambiguous.
  }

  function setupFilters(dialog, mode) {
    const grids = [...dialog.querySelectorAll('.admiral-grid.officers')];
    if (!grids.length) return;
    const cards = grids.flatMap(grid => [...grid.querySelectorAll('.officer')]);
    const profile = loadProfile();
    cards.forEach(card => prepareClassicCard(card, mode, profile));

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
      selector('Story tier', 'tier', [['all', 'All tiers'], ['1', 'Tier 1'], ['2', 'Tier 2'], ['3', 'Tier 3']]) +
      (mode === 'hq' ? selector('Ownership', 'ownership',
        [['all', 'All commanders'], ['yes', 'Recruited'], ['no', 'Unrecruited']]) : '') +
      selector('Specialization', 'specialty', [['all', 'All branches'], ['infantry', 'Infantry'],
        ['armor', 'Armor'], ['artillery', 'Artillery']]) +
      selector('Sort by', 'sort', [['tier', 'Story tier'], ['name', 'Name A–Z'],
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
        return (controls.tier === 'all' || card.dataset.tier === controls.tier) &&
          (mode !== 'hq' || controls.ownership === 'all' ||
            card.dataset.recruited === controls.ownership) &&
          (controls.specialty === 'all' || card.dataset.specialty === controls.specialty) &&
          (!query || [a.name, a.short, a.skill, a.title, a.desc]
            .filter(Boolean).join(' ').toLocaleLowerCase().includes(query));
      });
      visible.sort((a, b) => {
        if (controls.sort === 'name') return a.dataset.name.localeCompare(b.dataset.name);
        if (controls.sort === 'tier')
          return Number(a.dataset.tier) - Number(b.dataset.tier) ||
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

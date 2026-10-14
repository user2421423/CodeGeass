/* Commander presentation only. Original dialogs remain the source of truth for gameplay,
   ownership, token prices, rank progression and upgrade handlers. */
(() => {
  'use strict';
  const controls = { query: '', tier: 'all', ownership: 'all', specialty: 'all', sort: 'tier' };
  const ratingKeys = ['infantry', 'armor', 'artillery', 'mobility'];
  const safe = value => esc(String(value == null ? '' : value));
  const roman = number => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][number] || String(number + 1);
  const rankText = o => E.RANKS[o.rank] || E.RANKS[0];
  const starRow = n => '<span class="cc-stars" aria-label="' + n + ' of ' + E.MAX_RATING + ' stars">' +
    Array.from({ length: E.MAX_RATING }, (_, i) => '<span class="' + (i < n ? 'lit' : 'dim') + '" aria-hidden="true">★</span>').join('') + '</span>';
  const specialtyOf = o => ratingKeys.slice(0, 3).sort((a, b) =>
    (o.ratings[b] || 0) - (o.ratings[a] || 0))[0];
  const insignia = o => '<span class="cc-rank-mark" aria-hidden="true"><span class="cc-rank-bars">' +
    '◆'.repeat(Math.min(3, Math.floor(o.rank / 2) + 1)) + '</span><span class="cc-rank-grade">' +
    roman(o.rank) + '</span></span>';
  const officerData = (key, mode, profile) => {
    const a = C(key);
    const recruited = mode === 'assignment' || E.owns(profile, key);
    const o = mode === 'assignment' ? game.roster[key] :
      recruited ? E.roster(profile)[key] : null;
    return { a, o: o || { rank: 0, ratings: { ...E.officer(game, key).ratings }, medals: [], generics: {} },
      recruited };
  };
  function renderCard(node, mode, profile) {
    const portrait = node.querySelector('[data-general]');
    if (!portrait) return;
    const key = portrait.dataset.general;
    const info = officerData(key, mode, profile);
    const a = info.a, o = info.o, recruited = info.recruited;
    const tier = Math.max(1, Math.min(3, Number(a.storyTier) || 3));
    const specialty = specialtyOf(o);
    const action = node.querySelector('.officer-actions');
    // Preserve the exact original action markup: assign/recruit/upgrade costs and disabled reasons.
    const actionMarkup = action ? action.outerHTML : '';
    const busy = mode === 'assignment' ?
      game.units.find(u => u.hp > 0 && u.personal && u.cmd === key) : null;
    node.classList.add('cc-card', 'cc-tier-' + tier);
    node.classList.toggle('cc-unrecruited', !recruited);
    node.dataset.tier = String(tier);
    node.dataset.recruited = recruited ? 'yes' : 'no';
    node.dataset.specialty = specialty;
    node.dataset.rank = String(o.rank);
    node.dataset.name = a.name.toLocaleLowerCase();
    ratingKeys.forEach(r => { node.dataset['rating' + r] = String(o.ratings[r] || 0); });
    const ratings = ratingKeys.map(r =>
      '<div class="cc-rating"><span>' + safe(E.BRANCH_NAMES[r]) +
      '</span>' + starRow(o.ratings[r] || 0) + '</div>').join('');
    const badge = mode === 'assignment' ?
      (busy ? 'Deployed · ' + E.TYPES[busy.type].short : 'Available to assign') :
      (recruited ? 'Recruited · persistent' : 'Not recruited');
    node.innerHTML =
      '<div class="cc-card-top"><span class="cc-tier">Tier ' + tier + '</span>' +
      '<span class="cc-state">' + safe(badge) + '</span></div>' +
      '<div class="cc-card-identity"><div class="cc-card-portrait">' +
      generalPortrait(key, 'cc-portrait-art', true) + '</div>' +
      '<div class="cc-name-group"><span class="cc-faction">' + safe(F(a.side).name) +
      '</span><h3>' + safe(a.name) + '</h3><div class="cc-rank-line">' +
      insignia(o) + '<div><small>Military rank</small><b>' + safe(rankText(o)) +
      '</b></div></div><span class="cc-specialty">' + safe(E.BRANCH_NAMES[specialty]) +
      ' specialization</span></div></div>' +
      '<div class="cc-card-ratings" aria-label="Commander ratings">' + ratings + '</div>' +
      '<div class="cc-signature"><span class="cc-section-label">Signature ability</span>' +
      '<strong>' + safe(a.skill) + '</strong><p>' + safe(a.desc) + '</p></div>' +
      '<div class="cc-card-bottom"><span title="Based on commander roster data">Signature frame: ' +
      safe(a.hull || '—') + '</span>' + actionMarkup + '</div>';
    // Open the dossier from any non-control part of the card; leave portrait and
    // purchase buttons to the game's existing delegated handlers.
    node.tabIndex = 0;
    node.setAttribute('role', 'group');
    node.setAttribute('aria-label', a.name + ', Tier ' + tier + '. Press Enter to view commander info.');
    node.addEventListener('click', event => {
      if (!event.target.closest('[data-general],button,a,input,select')) generalDialog(key, true);
    });
    node.addEventListener('keydown', event => {
      if (event.target === node && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        generalDialog(key, true);
      }
    });
  }
  function decorateOperationCommanders(dialog) {
    dialog.querySelectorAll('.scenario-chip').forEach(chip => {
      const portrait = chip.querySelector('[data-general]');
      if (!portrait) return;
      const a = C(portrait.dataset.general);
      const tier = Math.max(1, Math.min(3, Number(a.storyTier) || 3));
      chip.classList.add('cc-operation-chip', 'cc-tier-' + tier);
      const label = document.createElement('span');
      label.className = 'cc-operation-tier';
      label.textContent = 'TIER ' + tier + ' · FIXED OPERATION';
      chip.querySelector('span:last-child')?.prepend(label);
    });
  }
  function setupRoster(dialog, mode) {
    const grids = [...dialog.querySelectorAll('.admiral-grid.officers')];
    if (!grids.length) return;
    const cards = grids.flatMap(g => [...g.querySelectorAll('.officer')]);
    const profile = loadProfile();
    cards.forEach(node => renderCard(node, mode, profile));
    const first = grids[0];
    const toolbar = document.createElement('section');
    toolbar.className = 'cc-tools';
    toolbar.setAttribute('aria-label', 'Commander roster filters');
    const option = (value, label) => '<option value="' + value + '">' + label + '</option>';
    const select = (label, key, choices) => '<label>' + label + '<select data-cc-filter="' + key +
      '">' + choices.map(c => option(c[0], c[1])).join('') + '</select></label>';
    toolbar.innerHTML = '<div class="cc-toolbar-title"><div><strong>Commander roster</strong>' +
      '<small>Faction tabs above · select a portrait or card to open Commander Info</small></div>' +
      '<span class="cc-result-count" aria-live="polite"></span></div>' +
      '<div class="cc-filter-bar"><label class="cc-search-label">Search<input data-cc-filter="query" ' +
      'type="search" placeholder="Name or signature ability" autocomplete="off"></label>' +
      select('Story tier', 'tier', [['all', 'All tiers'], ['1', 'Tier 1'], ['2', 'Tier 2'], ['3', 'Tier 3']]) +
      (mode === 'hq' ? select('Ownership', 'ownership',
        [['all', 'All commanders'], ['yes', 'Recruited'], ['no', 'Unrecruited']]) : '') +
      select('Specialization', 'specialty', [['all', 'All branches'], ['infantry', 'Infantry'],
        ['armor', 'Armor'], ['artillery', 'Artillery']]) +
      select('Sort by', 'sort', [['tier', 'Story tier'], ['name', 'Name A–Z'],
        ['rank', 'Military rank'], ['infantry', 'Infantry rating'], ['armor', 'Armor rating'],
        ['artillery', 'Artillery rating'], ['mobility', 'Mobility rating']]) + '</div>';
    const roster = document.createElement('div');
    roster.className = 'admiral-grid officers cc-roster';
    roster.setAttribute('aria-label', 'Commander cards');
    const empty = document.createElement('p');
    empty.className = 'cc-empty';
    empty.textContent = 'No commanders match these filters.';
    first.before(toolbar, roster, empty);
    // The two historical groups are now one searchable, sortable roster.
    grids.forEach(g => g.remove());
    dialog.querySelectorAll('.officer-section').forEach(h => h.remove());
    cards.forEach(card => roster.append(card));
    const queryInput = toolbar.querySelector('[data-cc-filter="query"]');
    queryInput.value = controls.query;
    toolbar.querySelectorAll('select[data-cc-filter]').forEach(el => {
      el.value = controls[el.dataset.ccFilter];
    });
    function apply() {
      const visible = cards.filter(node => {
        const a = C(node.querySelector('[data-general]').dataset.general);
        return (controls.tier === 'all' || node.dataset.tier === controls.tier) &&
          (controls.ownership === 'all' || node.dataset.recruited === controls.ownership) &&
          (controls.specialty === 'all' || node.dataset.specialty === controls.specialty) &&
          (!controls.query || (a.name + ' ' + a.skill + ' ' + a.title).toLocaleLowerCase()
            .includes(controls.query.toLocaleLowerCase()));
      });
      const field = controls.sort;
      visible.sort((x, y) => {
        if (field === 'name') return x.dataset.name.localeCompare(y.dataset.name);
        if (field === 'tier') return Number(x.dataset.tier) - Number(y.dataset.tier) ||
          x.dataset.name.localeCompare(y.dataset.name);
        const prop = field === 'rank' ? 'rank' : 'rating' + field;
        return Number(y.dataset[prop]) - Number(x.dataset[prop]) ||
          x.dataset.name.localeCompare(y.dataset.name);
      });
      roster.replaceChildren(...visible);
      empty.hidden = visible.length !== 0;
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
  function detailEnhancements(k, personal) {
    const dialog = modal.querySelector('.general-info');
    if (!dialog) return;
    const a = C(k), tier = Math.max(1, Math.min(3, Number(a.storyTier) || 3));
    const profile = loadProfile();
    const owned = E.owns(profile, k);
    const o = personal ?
      (E.roster(profile)[k] || E.officer(game, k)) : E.officer(game, k);
    dialog.classList.add('cc-detail', 'cc-tier-' + tier);
    const nameplate = dialog.querySelector('.gi-nameplate');
    if (nameplate) {
      nameplate.querySelector('.gi-stars-top').textContent = 'TIER ' + tier;
      nameplate.insertAdjacentHTML('beforeend',
        '<span class="cc-faction-detail">' + safe(F(a.side).name) + '</span>');
    }
    const state = dialog.querySelector('.gi-kind');
    if (state) {
      state.textContent = personal ?
        (owned ? 'Recruited personal commander' : 'Unrecruited · personal roster') :
        (a.side === game.player ? 'Fixed operation commander · read only' :
          'Rival commander · read only');
    }
    const rank = dialog.querySelector('.gi-rank-line');
    if (rank) {
      const old = rank.querySelector('.gi-insignia');
      if (old) old.outerHTML = insignia(o);
    }
    const head = dialog.querySelector('.gi-head h2');
    if (head) head.textContent = 'COMMANDER DOSSIER';
    const right = dialog.querySelector('.gi-right');
    const signature = right?.querySelector('.gi-ability');
    if (right && signature) {
      signature.classList.add('cc-detail-signature');
      const label = signature.querySelector('.label');
      if (label) label.outerHTML = '<span class="cc-section-label">SIGNATURE ABILITY</span>' +
        '<h3>' + safe(a.skill) + '</h3><small class="cc-signature-title">' + safe(a.title) + '</small>';
      right.prepend(signature);
    }
    const generic = right?.querySelectorAll('.gi-ability')[1];
    if (generic) generic.classList.add('cc-generic');
    // Keep original upgrade controls and real token prices. Surface disabled reasons in text.
    dialog.querySelectorAll('.gi-promote-row button[aria-disabled="true"][title]').forEach(button => {
      const note = document.createElement('small');
      note.className = 'cc-disabled-explanation';
      note.textContent = button.title;
      button.closest('.gi-promote-row')?.append(note);
    });
    dialog.querySelectorAll('.gi-ratings .gi-rating').forEach(row => {
      const button = row.querySelector('button[aria-disabled="true"][title]');
      if (button) button.setAttribute('aria-label',
        (button.getAttribute('aria-label') || 'Upgrade') + '. Unavailable: ' + button.title);
    });
  }
  // Keep all original handlers, prices, profile mutations and exact saved roster state.
  const originalHQ = generalsDialog;
  const originalAssign = admiralDialog;
  const originalInfo = generalDialog;
  generalsDialog = function(...args) {
    const result = originalHQ.apply(this, args);
    const dialog = modal.querySelector('[aria-label="HQ commanders"]');
    if (dialog) {
      dialog.classList.add('cc-roster-dialog');
      setupRoster(dialog, 'hq');
    }
    return result;
  };
  admiralDialog = function(...args) {
    const result = originalAssign.apply(this, args);
    const dialog = modal.querySelector('[aria-label="Unit commanders"]');
    if (dialog) {
      dialog.classList.add('cc-roster-dialog');
      setupRoster(dialog, 'assignment');
      decorateOperationCommanders(dialog);
    }
    return result;
  };
  generalDialog = function(k, personal) {
    const result = originalInfo.apply(this, arguments);
    detailEnhancements(k, !!personal);
    return result;
  };
})();

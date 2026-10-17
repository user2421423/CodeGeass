/* Section 5: narrative military reports and truthful, mode-specific result summaries.
   Uses existing War Report events only. Never alters the engine, victory conditions or rewards. */
'use strict';
const militaryPresentation = (() => {
  let session = null, lastEvent = null, staged = [], paused = false, visible = [], dismissTimer = null;
  const soundedResults = new WeakSet();

  function reset() {
    staged = [];
    visible = [];
    paused = false;
    clearTimeout(dismissTimer);
    const node = document.getElementById('military-presentation-notice');
    if (node) { node.hidden = true; node.innerHTML = ''; }
  }

  function noticeRoot() {
    let node = document.getElementById('military-presentation-notice');
    if (!node) {
      node = document.createElement('aside');
      node.id = 'military-presentation-notice';
      node.className = 'military-notice';
      node.hidden = true;
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      node.addEventListener('click', event => {
        if (event.target.closest('[data-military-dismiss]')) dismiss();
      });
      document.body.appendChild(node);
    }
    return node;
  }

  function commanderCasualty(event) {
    // Show all named-formation losses, independent of rank, side or game mode.
    // The engine records fatalities from combat, batteries and strategic strikes.
    // Surrender disbanding is a different event, not a unitDestroyed casualty.
    return event.kind === 'unitDestroyed' && !!E.COMMANDERS[event.commander];
  }

  function classify(event) {
    if (event.kind === 'surrender') return { kind: 'surrender', e: event };
    if (event.kind === 'cityCaptured') {
      const city = game.stations.find(s => s.id === event.cityId);
      if (city && city.capitalOf === event.previousOwner) return { kind: 'capital', e: event };
      if (event.previousOwner === game.player && event.side !== game.player)
        return { kind: 'minor', e: event };
    }
    if (commanderCasualty(event))
      return { kind: 'commander', e: event };
    return null;
  }

  function collect() {
    const r = E.ensureWarReport(game);
    if (session !== game) {
      // No replay of old reports on launch, resume or save migration.
      reset();
      session = game;
      lastEvent = r.events.at(-1) || null;
      return;
    }
    const i = lastEvent ? r.events.indexOf(lastEvent) : -1;
    const incoming = r.events.slice(lastEvent && i < 0 ? Math.max(0, r.events.length - 24) : i + 1);
    lastEvent = r.events.at(-1) || lastEvent;
    const notices = incoming.map(classify).filter(Boolean);
    if (!notices.length) return;
    staged.push(...notices);
    if (!paused) flush();
  }

  function dismiss() {
    visible = [];
    clearTimeout(dismissTimer);
    const node = document.getElementById('military-presentation-notice');
    if (node) { node.hidden = true; node.innerHTML = ''; }
  }

  function eventText(item) {
    const e = item.e, side = F(e.side), loser = F(e.loser);
    if (item.kind === 'capital')
      return {
        title: e.city + ' captured',
        subtitle: side.name + ' · Turn ' + e.turn,
        detail: 'Enemy capital secured. The war continues until its existing victory conditions are met.',
        flags: [e.side, e.previousOwner],
      };
    if (item.kind === 'surrender')
      return {
        title: loser.name + ' surrenders',
        subtitle: 'Last city: ' + e.city + ' · Turn ' + e.turn,
        detail: 'Victory to ' + side.name + '. Remaining armies are dissolved; remaining territory and controlled ports transfer under the existing surrender rules. Half of remaining credits and industry is seized.',
        flags: [e.loser, e.side],
      };
    if (item.kind === 'commander') {
      const officer = E.COMMANDERS[e.commander];
      return {
        title: officer.name + ' defeated',
        subtitle: F(e.unitSide).name + ' · Turn ' + e.turn,
        detail: 'Named commander formation destroyed. No additional penalties or bonuses are awarded.',
        portrait: e.commander, flags: [e.unitSide],
      };
    }
    return {
      title: e.city + ' lost',
      subtitle: F(e.side).name + ' · Turn ' + e.turn,
      detail: 'City ownership has changed.',
      flags: [e.side],
    };
  }

  function flagsHTML(sides) {
    return sides.filter(Boolean).map(side =>
      '<span class="military-flag" title="' + esc(F(side).name) + '">' +
      (ART.flagSVG(artSide(side)) || esc(F(side).short)) + '</span>').join('');
  }

  function flush() {
    if (paused || !staged.length) return;
    if (game.over) { staged = []; dismiss(); return; } // The dedicated final result supersedes reports.
    visible.push(...staged.splice(0));
    // All major AI developments are consolidated in one dismissible briefing.
    const priorities = { surrender: 0, capital: 1, commander: 2, minor: 3 };
    visible.sort((a,b) => priorities[a.kind] - priorities[b.kind]);
    const lead = visible[0], info = eventText(lead), node = noticeRoot();
    const major = visible.some(a => a.kind !== 'minor'),
      multiple = visible.length > 1;
    const headline = multiple && major ? 'Strategic developments' : info.title;
    // Never truncate commander casualties when several officers fall in an AI turn.
    const listed = visible.filter((e, i) => i < 4 || e.kind === 'commander');
    const omitted = visible.length - listed.length;
    const details = multiple
      ? '<ul class="military-notice-events">' +
        listed.map(n => {
          const d = eventText(n);
          return '<li><strong>' + esc(d.title) + '</strong><small>' + esc(d.subtitle) + '</small></li>';
        }).join('') +
        (omitted ? '<li>' + omitted + ' more developments · See War Report</li>' : '') +
        '</ul>'
      : '<p>' + esc(info.detail) + '</p>';
    node.className = 'military-notice ' + (major ? 'major' : 'minor');
    node.innerHTML = '<div class="military-notice-top"><span>' +
      (major ? 'STRATEGIC HIGH COMMAND' : 'FRONTLINE REPORT') +
      '</span><button type="button" data-military-dismiss aria-label="Dismiss military report">×</button></div>' +
      '<div class="military-notice-main">' +
      (info.portrait && !multiple ? ART.portrait(info.portrait, 'military-notice-portrait') : '') +
      '<div><div class="military-notice-flags">' + flagsHTML(info.flags) + '</div>' +
      '<h3>' + esc(headline) + '</h3><small>' + esc(info.subtitle) + '</small></div></div>' + details +
      '<div class="military-notice-bottom"><span>Turn ' + game.turn + '</span>' +
      '<span>Dismiss × · Full history in War Report</span></div>';
    node.hidden = false;
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(dismiss, major ? 8800 : 3600);
    if (major) {
      const friendly = lead.e.side === game.player;
      const ownLoss = (lead.kind === 'commander' && lead.e.unitSide === game.player) ||
        (lead.kind === 'surrender' && lead.e.loser === game.player);
      if (friendly && !ownLoss) SFX.play('triumph', game.player);
      else if (ownLoss) SFX.play('defeat', game.player);
    }
  }

  function suspend() { paused = true; dismiss(); }
  function resume() { paused = false; collect(); flush(); }

  function resultSound() {
    if (!game.over || soundedResults.has(game)) return;
    soundedResults.add(game);
    SFX.play(game.over.winner === game.player ? 'triumph' : 'defeat', game.player);
    dismiss();
  }

  function mapPreview() {
    // Final rendering may precede the next animation frame after the last action.
    if (typeof drawMinimap === 'function') drawMinimap();
    const mini = document.getElementById('minimap');
    if (!mini || !mini.width || !mini.height) return '';
    try {
      const data = mini.toDataURL('image/png');
      return '<div class="military-result-map"><img src="' + data +
        '" alt="Final operation theater minimap" /><span>Final theater overview</span></div>';
    } catch (_err) {
      // Drawing may be tainted by artwork on some browsers; never obstruct the result screen.
      return '';
    }
  }

  function summaryHTML() {
    const report = E.ensureWarReport(game), rows = Object.values(report.turns || {});
    const keys = ['citiesCaptured', 'enemiesDestroyed', 'unitsLost'];
    const totals = Object.fromEntries(keys.map(key => [key,
      rows.reduce((sum, row) => sum + (Number(row?.[game.player]?.[key]) || 0), 0)]));
    const groupCount = Object.values(report.groups || {}).filter(g => g.side === game.player).length;
    const metric = (label, number) =>
      '<div class="military-stat"><b>' + Number(number).toLocaleString() +
      '</b><small>' + esc(label) + '</small></div>';
    return '<section class="military-result-statistics" aria-label="Recorded battle statistics">' +
      '<h3>War Report · Recorded achievements</h3>' +
      '<div class="military-stat-grid">' +
      metric('Turns elapsed', game.turn) +
      metric('Cities held', game.stations.filter(s => s.owner === game.player).length) +
      metric('Cities captured', totals.citiesCaptured) +
      metric('Enemies destroyed', totals.enemiesDestroyed) +
      metric('Own formations lost', totals.unitsLost) +
      (game.mode !== 'campaign' ? metric('Army groups recorded', groupCount) : '') +
      '</div><small class="military-report-source">' +
      (report.legacy ? 'Partial records: War Report tracking begins on turn ' + report.since + '.' :
      'Figures use this operation’s recorded War Report data.') +
      '</small></section>';
  }

  function finalHighlights() {
    const r = E.ensureWarReport(game), n = r.events
      .filter(e => e.kind === 'surrender' && e.turn >= game.turn - 1).slice(-3);
    if (!n.length) return '';
    return '<div class="military-final-highlights"><span>FINAL STRATEGIC DEVELOPMENTS</span>' +
      n.map(e => '<p>' + esc(F(e.loser).short) + ' surrendered after losing ' + esc(e.city) +
        ' to ' + esc(F(e.side).short) + '</p>').join('') + '</div>';
  }

  function resultHero(mode, opts = {}) {
    const won = game.over?.winner === game.player;
    const title = mode === 'conquest' ? (game.era === 'ufn2018' ? 'WORLD COALITION' : 'WORLD CONQUEST') :
      mode === 'scenario' ? 'REGIONAL THEATER' : 'STORY CAMPAIGN';
    const face = mode === 'campaign' && opts.portrait
      ? ART.portrait(opts.portrait, 'military-result-portrait') : '';
    return '<div class="military-result-hero military-result-' + mode + '">' +
      '<div class="military-result-banner">' +
      '<span class="military-result-flag">' + (ART.flagSVG(artSide(game.player)) || esc(F(game.player).short)) + '</span>' +
      '<div><span class="military-hero-kicker">' + title + ' · Turn ' + game.turn + '</span>' +
      '<h2>' + (won ? 'VICTORY' : game.over?.winner === 'draw' ? 'ARMISTICE' : 'DEFEAT') + '</h2>' +
      '<strong>' + esc(opts.title || E.modeTitle(game)) + '</strong></div>' + face + '</div>' +
      (mode === 'campaign' ? '' : mapPreview()) + finalHighlights() + '</div>';
  }
  return { collect, suspend, resume, reset, resultSound, resultHero, summaryHTML };
})();

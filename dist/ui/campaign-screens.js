/* Knightmare Conquest UI: Campaign screens: mission select, briefing, dialogue and star results (rules in campaign.js). */
'use strict';
// ======== Campaign: mission select, briefing, dialogue and star results (rules in campaign.js) ========
const asList = x => (Array.isArray(x) ? x : x ? [x] : []);
let campaignTab = 'bk_s1',
  missionDifficulty = 'normal',
  missionBriefingId = null,
  talkThen = null; // what follows the dialogue now playing (a result screen, or nothing)
// The turn shown beside the objective: a mission's turn limit, or the conquest armistice.
function turnLimit() {
  return game.mode === 'campaign'
    ? game.campaign?.turnLimit ?? E.campaign.mission(game.campaign.id)?.lose?.turns ?? 0
    : E.ARMISTICE;
}
function starRow(n) {
  return `<span class="stars" aria-label="${n} of 3 stars">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;
}
// A mission's three stars: the victory itself, then its two star goals.
function starGoals(m) {
  return [asList(m.win).map(c => E.campaign.text(c)).join(' · '), ...m.stars.map(c => E.campaign.text(c))];
}
// A star goal during play: kept so far, done, still to do, or missed for good.
function goalState(c) {
  const held = E.campaign.holds(game, c);
  if (c.turns || c.losses != null || c.alive || c.keep) return held ? 'kept' : 'lost';
  return held ? 'done' : 'todo';
}
const goalMark = st => (st === 'done' ? '✓' : st === 'lost' ? '✗' : '★');
function starChips() {
  if (game.mode !== 'campaign') return '';
  const m = E.campaign.mission(game.campaign.id);
  return `<span class="star-chips">${m.stars
    .map(c => {
      const st = goalState(c);
      return `<span class="star-chip ${st}">${goalMark(st)} ${esc(E.campaign.text(c))}</span>`;
    })
    .join('')}</span>`;
}
function campaignRow(profile) {
  const CP = E.campaign;
  if (!CP) return '';
  const camps = Object.values(CP.CAMPAIGNS),
    seasons = Object.values(CP.SEASONS || {}),
    all = camps.flatMap(c => c.missions),
    got = all.reduce((a, m) => a + CP.best(profile, m.id), 0);
  return `<div class="conquest-row campaign-row"><div><label>Campaign · ${seasons.length} story arcs · ${camps.length} campaigns · ${all.length} missions</label><h3 class="conquest-title">${seasons.map(s => s.name).join(' · ')}</h3><p class="mode-note">Story missions on hand-built battlefields, from the Shinjuku Ghetto to Damocles. Each mission has Normal, Hard and Challenge modes. Up to three stars each: <b>${got} / ${all.length * 3} ★</b>. Each difficulty pays its own first-clear and star rewards, with Hard and Challenge multipliers.</p></div><button class="primary" data-action="campaign">Campaigns</button></div>`;
}
function campaignDialog(cid = campaignTab) {
  const CP = E.campaign,
    profile = loadProfile(),
    saved = getSave(CAMPAIGN_KEY),
    resume = saved && !saved.over && CP.mission(saved.campaign?.id);
  campaignTab = CP.CAMPAIGNS[cid] ? cid : Object.keys(CP.CAMPAIGNS)[0];
  const camp = CP.CAMPAIGNS[campaignTab],
    season = CP.SEASONS?.[camp.season] || { name: camp.name, short: camp.short },
    camps = Object.entries(CP.CAMPAIGNS),
    got = camp.missions.reduce((a, m) => a + CP.best(profile, m.id), 0),
    milestoneElite = CP.campaignElite(campaignTab),
    milestoneEliteName = milestoneElite ? E.TYPES[E.ELITE_FORCES[milestoneElite].type].name : 'Elite Force',
    milestones = CP.milestoneStatus(profile, campaignTab),
    milestoneText = milestones
      .map(m => {
        const prize = [m.tokens ? `${m.tokens} tokens` : '', m.fragments ? `${m.fragments} ${milestoneEliteName} fragments` : '']
          .filter(Boolean)
          .join(' + ');
        return `${m.claimed ? '✓' : m.reached ? '◆' : '○'} ${m.stars}★: ${prize}`;
      })
      .join(' · ');
  // WC4-style: pick a season first, then the side you play it from.
  const seasonTabs = Object.entries(CP.SEASONS || {})
    .map(([n, s]) => {
      const [k] = camps.find(([, c]) => String(c.season) === n && c.side === camp.side) || camps.find(([, c]) => String(c.season) === n);
      return `<button data-campaign-tab="${k}" class="season-tab ${String(camp.season) === n ? 'active' : ''}"><b>${esc(s.short)}</b><small>${esc(s.name)} · ${s.years}</small></button>`;
    })
    .join('');
  const tabs = camps
    .filter(([, c]) => c.season === camp.season)
    .map(([k, c]) => `<button data-campaign-tab="${k}" class="${k === campaignTab ? 'active' : ''}" style="--c:${E.FACTIONS[c.side].color}">${esc(E.FACTIONS[c.side].name)}</button>`)
    .join('');
  const cards = camp.missions
    .map((m, i) => {
      const open = CP.unlocked(profile, m.id),
        best = CP.best(profile, m.id);
      return `<button class="mission-card${best ? ' cleared' : ''}" data-mission="${m.id}" ${open ? '' : `disabled title="Clear ${esc(camp.missions[i - 1].title)} first"`}><span class="mission-num">${open ? i + 1 : '🔒'}</span><span class="mission-info"><small>${m.year} · ${esc(m.place)}</small><b>${esc(m.title)}</b></span>${starRow(best)}</button>`;
    })
    .join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide campaign-select" role="dialog" aria-modal="true" aria-label="Campaigns"><div class="dialog-head"><div><div class="eyebrow">Campaign · ${esc(season.short)} · ${camp.years}</div><h2>${esc(season.name)}</h2><p><b>${esc(camp.name)}.</b> ${esc(camp.desc)}</p></div><button class="small close" data-action="campaign-close">Back</button></div><div class="season-tabs">${seasonTabs}</div><div class="toolbar-row"><div class="tabs">${tabs}</div><span class="campaign-total">★ ${got} / ${camp.missions.length * 3}</span></div><div class="campaign-layout">${ART.portrait(camp.portrait, 'campaign-portrait')}<div class="mission-grid">${cards}</div></div><div class="dialog-footer"><div>${resume ? `<button class="primary" data-action="continue-mission">Continue ${esc(resume.title)} · ${esc(E.campaign.DIFFICULTIES[saved.difficulty]?.name || 'Normal')} · turn ${saved.turn}</button>` : ''}</div><small class="notice">Missions unlock in order; 1★ is enough to progress. Campaign milestones: ${milestoneText}. One mission in progress is saved at a time, apart from your conquest.</small></div></section></div>`;
  focusDialog();
}
// Before a mission (live = false) or during one (live = true, with each star goal's current state).
function briefingDialog(id, live = false) {
  const CP = E.campaign,
    m = CP?.mission(id);
  if (!m) return;
  missionBriefingId = id;
  const diff = live ? game.difficulty || 'normal' : missionDifficulty,
    camp = CP.CAMPAIGNS[m.campaign],
    g = live ? game : CP.createMission(id, 1, diff),
    diffRule = CP.DIFFICULTIES[diff] || CP.DIFFICULTIES.normal,
    profile = loadProfile(),
    best = CP.bestDifficulty(profile, id, diff),
    overallBest = CP.best(profile, id),
    performanceElite = CP.starElite(id),
    performanceEliteName = performanceElite ? E.TYPES[E.ELITE_FORCES[performanceElite].type].name : 'Elite Force',
    fac = side => g.factions?.[side] || E.FACTIONS[side] || E.FACTIONS.neutral,
    chip = side => `<span class="side-chip" style="--c:${fac(side).color}">${esc(fac(side).name)}</span>`,
    allies = g.order.filter(side => side !== g.player && !E.foe(g, side, g.player)),
    enemies = g.order.filter(side => E.foe(g, side, g.player)),
    cmds = foe => [...new Set(g.units.filter(u => u.hp > 0 && u.cmd && !!E.foe(g, u.side, g.player) === foe).map(u => u.cmd))],
    face = k => `<span class="brief-cmd">${ART.portrait(k, 'brief-portrait')}<small>${esc(C(k).short || C(k).name)}</small></span>`,
    lose = m.lose || {},
    fails = [
      ...asList(lose.cmd).map(k => `${C(k).name} must survive`),
      ...asList(lose.cities).map(n => `${n} must not fall`),
      g.campaign?.turnLimit ? `Win by the end of turn ${g.campaign.turnLimit}` : '',
      'Lose every unit and city and the mission fails',
    ].filter(Boolean),
    state = i => (!live ? '' : i ? goalState(m.stars[i - 1]) : 'todo'),
    foes = cmds(true),
    difficultyControl = live
      ? `<div class="brief-block"><span class="label">Difficulty</span><p><b>${esc(diffRule.name)}</b> · ${esc(diffRule.desc)}</p></div>`
      : `<div class="brief-block"><span class="label">Difficulty</span><select class="select" id="mission-difficulty-select">${Object.entries(CP.DIFFICULTIES)
          .map(([k, d]) => `<option value="${k}" ${diff === k ? 'selected' : ''}>${esc(d.name)}${d.tokens > 1 ? ` · ×${d.tokens} rewards` : ''}</option>`)
          .join('')}</select><p class="mode-note">${esc(diffRule.desc)}</p></div>`;
  modal.innerHTML = `<div class="overlay"><section class="dialog wide briefing" role="dialog" aria-modal="true" aria-label="Mission briefing" ${live ? '' : 'data-back="campaign"'}><div class="dialog-head"><div><div class="eyebrow">${esc(camp.short)} · Mission ${m.index + 1} · ${esc(m.place)} · ${m.year}</div><h2>${esc(m.title)}</h2></div><button class="small close" data-action="${live ? 'close' : 'campaign'}">${live ? 'Close' : 'Back'}</button></div><div class="brief-grid"><div><p class="brief-story">${esc(m.brief)}</p>${difficultyControl}<div class="brief-block"><span class="label">Objective</span><p>${esc(live ? E.objectiveText(game) : m.objective)}</p></div><div class="brief-block"><span class="label">Stars</span><ul class="star-list">${starGoals(m)
    .map((t, i) => `<li class="${state(i)}"><b>${goalMark(state(i))}</b>${i ? '' : 'Victory: '}${esc(t)}</li>`)
    .join('')}</ul></div><div class="brief-block"><span class="label">Failure</span><p>${fails.map(esc).join(' · ')}</p></div><div class="brief-block"><span class="label">Forces</span><div class="side-chips">${[g.player, ...allies].map(chip).join('')}<span class="versus">vs</span>${enemies.map(chip).join('')}</div></div><div class="brief-block"><span class="label">Commanders on your side</span><div class="brief-cmds">${cmds(false).map(face).join('')}</div></div>${foes.length ? `<div class="brief-block"><span class="label">Enemy commanders</span><div class="brief-cmds">${foes.map(face).join('')}</div></div>` : ''}</div><div class="brief-side"><canvas id="brief-map" class="brief-map" aria-label="Battlefield map"></canvas><small>${g.cols} × ${g.rows} battlefield · squares are cities, dots are units</small><div class="reward"><span class="label">${best ? `Best ${esc(diffRule.name)} result` : `${esc(diffRule.name)} first clear`}</span>${best ? starRow(best) : `<b>${ICONS.use('token', 'cost-ico')} +${Math.round(CP.REWARD.first * diffRule.tokens)}</b>`}<small>${best ? `Each new ${esc(diffRule.name)} star pays ${Math.round(CP.REWARD.star * diffRule.tokens)} command tokens.` : `Plus ${Math.round(CP.REWARD.star * diffRule.tokens)} command tokens for each star goal met on this difficulty.`}${m.unlock ? ` Story: ${esc(m.unlock)}.` : ''}</small><small><b>Overall performance:</b> ${overallBest >= 2 ? '✓' : '2★'} ${esc(performanceEliteName)} +${CP.REWARD.twoStarFragments} fragments · ${overallBest >= 3 ? '✓' : '3★'} ${esc(performanceEliteName)} +${CP.REWARD.masteryFragments} fragments. These fragment rewards are earned once per mission across all difficulties.</small></div></div></div><div class="dialog-footer"><div>${live ? '<button data-action="mission-retry">Restart mission</button>' : '<button data-action="campaign">Mission select</button>'}</div>${live ? '<button class="primary" data-action="close">Resume</button>' : `<button class="primary" data-start-mission="${id}">Launch mission</button>`}</div></section></div>`;
  const map = $('brief-map');
  if (map?.getContext) {
    const dpr = Math.min(devicePixelRatio || 1, 2),
      w = map.clientWidth || 320,
      h = Math.round((w * mapH(g)) / mapW(g));
    map.width = Math.round(w * dpr);
    map.height = Math.round(h * dpr);
    map.style.height = h + 'px';
    const b = map.getContext('2d');
    if (b) paintMap(b, g, map.width, map.height, dpr, true);
  }
  focusDialog();
}
function startMission(id, difficulty = missionDifficulty) {
  const CP = E.campaign;
  if (!CP?.mission(id)) return;
  missionDifficulty = CP.DIFFICULTIES[difficulty] ? difficulty : 'normal';
  aiToken++;
  hqBack = 'game';
  strikeMode = false;
  campaignTab = CP.mission(id).campaign;
  game = E.applyProfile(CP.createMission(id, Date.now() >>> 0, missionDifficulty), loadProfile());
  setWorld();
  selection = { kind: 'unit', id: ownUnits().find(u => u.cmd)?.id };
  undoStack = [];
  effects = [];
  zoom = homeZoom();
  closeModal();
  render();
  centerOn(selectedUnit() || homeOf());
  save();
  campaignFeed();
}
// A saved conquest or mission picks up where it stopped, with any unread dialogue and its result screen.
function loadGame(s) {
  if (!s) return;
  aiToken++;
  hqBack = 'game';
  strikeMode = false;
  game = E.applyProfile(s, loadProfile());
  if (game.mode === 'campaign') missionDifficulty = game.difficulty || 'normal';
  setWorld();
  selection = null;
  undoStack = [];
  effects = [];
  zoom = homeZoom();
  closeModal();
  render();
  centerOn(homeOf());
  campaignFeed(() => game.over && resultDialog());
}
// Campaign events reach the screen here: blasts and Gefjun Disturbers play on the map, new warnings are flagged,
// then the queued dialogue runs and `then` follows it.
function campaignFeed(then = null) {
  const cm = game.campaign;
  if (!cm) return then?.();
  const fx = cm.fx.splice(0),
    fresh = cm.warnings.filter(w => !w.seen);
  for (const f of fx) {
    const nuke = /F\.L\.E\.I\.J\.A/.test(f.name);
    effects.push({ kind: 'ring', to: { c: f.c, r: f.r }, radius: f.radius, color: f.color, text: f.name, life: 2.4, max: 2.4 });
    if (nuke) {
      effects.push({ kind: 'fleija', to: { c: f.c, r: f.r }, life: 3.6, max: 3.6 });
      flash = 1;
    }
    bump(f.kind === 'stun' ? 3 : nuke ? 12 : 8);
    SFX.play(nuke ? 'fleija' : f.kind === 'stun' ? 'beam' : 'siege', game.player);
  }
  for (const w of fresh) w.seen = true;
  if (fx.length || fresh.length) {
    centerOn(fx[0] || fresh[0]);
    save();
  }
  if (fresh.length) toast(`Warning: ${fresh.map(w => w.label || 'strike').join(' and ')} incoming. Clear the marked hexes.`, true);
  if (cm.queue.length) talkDialog(then);
  else then?.();
}
function talkDialog(then = talkThen) {
  talkThen = then;
  const q = game.campaign.queue,
    line = q[0],
    f = F(line.side),
    face = line.portrait
      ? ART.portrait(line.portrait, 'talk-portrait')
      : `<span class="talk-portrait talk-emblem" style="--c:${f.color}">${line.name === 'Mission briefing' ? '◈' : esc(f.letter || '◈')}</span>`;
  modal.innerHTML = `<div class="overlay talk-overlay"><section class="dialog talk" role="dialog" aria-modal="true" aria-label="Mission dialogue">${face}<div class="talk-body"><span class="label" style="color:${f.color}">${esc(line.name)}</span><p>${esc(line.text)}</p><div class="talk-actions"><button class="primary" data-action="talk-next">${q.length > 1 ? 'Next ▶' : 'Continue'}</button><button class="small ghost" data-action="talk-skip">Skip</button><small>${q.length > 1 ? `${q.length - 1} more` : ''}</small></div></div></section></div>`;
  focusDialog();
}
function talkNext(skip = false) {
  const q = game.campaign?.queue || [];
  if (skip) q.length = 0;
  else q.shift();
  if (q.length) return talkDialog();
  closeModal();
  save();
  const then = talkThen;
  talkThen = null;
  then?.();
}
function missionResult() {
  const CP = E.campaign,
    m = CP.mission(game.campaign.id),
    cm = game.campaign,
    win = game.over.winner === game.player,
    got = win ? game.over.starList || [true, false, false] : [false, false, false],
    r = game.reward || { total: 0, parts: [] },
    next = win && CP.next(m.id),
    diffRule = CP.DIFFICULTIES[game.difficulty] || CP.DIFFICULTIES.normal;
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow mission-result" role="dialog" aria-modal="true" aria-label="Mission result"><div class="eyebrow">${esc(E.modeTitle(game))}</div><h2>${win ? 'Mission complete' : 'Mission failed'}</h2><div class="result-stars" aria-label="${got.filter(Boolean).length} of 3 stars">${got.map(on => `<span class="${on ? 'on' : ''}">★</span>`).join('')}</div><p>${esc(game.over.reason)}</p><ul class="star-list">${starGoals(m)
    .map((t, i) => `<li class="${got[i] ? 'done' : 'lost'}"><b>${got[i] ? '★' : '☆'}</b>${esc(t)}</li>`)
    .join('')}</ul>${win && r.repeat ? `<div class="reward"><span class="label">No new ${esc(diffRule.name)} stars</span><small>Each difficulty pays its star tokens once. Improve your overall mission result to 2★ or 3★ for the one-time Elite rewards.</small></div>` : ''}${win && r.parts?.length ? `<div class="reward"><span class="label">Command tokens earned</span><b>${ICONS.use('token', 'cost-ico')} +${r.total}</b><small>${r.parts.map(([k, v]) => `${k} +${v}`).join(' · ')}</small></div>` : ''}${game.eliteReward && Object.keys(game.eliteReward).length ? `<div class="reward"><span class="label">Elite fragments recovered</span><small>${Object.entries(game.eliteReward).map(([k, v]) => `${E.TYPES[E.ELITE_FORCES[k].type].name} +${v}`).join(' · ')}</small>${r.fragmentParts?.length ? `<small>${r.fragmentParts.map(([label, k, v]) => `${esc(label)}: ${esc(E.TYPES[E.ELITE_FORCES[k].type].name)} +${v}`).join(' · ')}</small>` : ''}</div>` : ''}<div class="result-numbers"><div><b>${game.turn}</b><small>Turns</small></div><div><b>${cm.kills}</b><small>Enemy units destroyed</small></div><div><b>${cm.losses}</b><small>Units lost</small></div></div><div class="dialog-footer"><div><button data-action="close">Inspect the map</button><button data-action="campaign">Mission select</button></div><div><button data-action="mission-retry">${win ? 'Replay' : 'Retry'}</button>${next ? `<button class="primary" data-mission="${next}">Next mission</button>` : ''}</div></div></section></div>`;
  focusDialog();
}

/* Permanent, free Conquest Challenge Pass. Separate from automatic Conquest rewards.
   All eligibility is recorded only for new World Conquests with challengePassRun.version 1. */
'use strict';
const CHALLENGE_PASS = (() => {
  const DIFFICULTIES = ['normal', 'hard', 'challenge', 'elite'];
  const DIFF_NAMES = ['Normal', 'Hard', 'Challenge', 'Elite'];
  const ERA_NAMES = { world: '2017 · World War', ufn2018: '2018 · Rise of the U.F.N.' };
  const FACTIONS = {
    world: [['britannia', 'Britannia'], ['eu', 'European Union'], ['cf', 'Chinese Federation']],
    ufn2018: [['britannia', 'Britannia'], ['eb', 'Euro Britannia'], ['cf', 'U.F.N.']],
  };
  const REWARD_CP = [10, 20, 30, 40];
  const SPEED_CP = [10, 15, 20, 25, 30];
  const SPEED_TURNS = [70, 60, 50, 40, 30];
  const MOB_CAPS = [30, 20, 10, 5, 0];
  const MOB_DIFFICULTIES = [0, 1, 2, 3, 3];
  const MOB_NAMES = ['Limited Mobilization', 'Restricted Reinforcements', 'Skeleton Reinforcements',
    'Minimal Mobilization', 'Starting Army Only'];
  const TRACKS = [];
  for (const [era, sides] of Object.entries(FACTIONS)) {
    for (const [side, name] of sides)
      TRACKS.push({
        id: 'mastery:' + era + ':' + side, category: 'mastery', era, title: name + ' Mastery',
        stages: REWARD_CP.map((cp, i) => ({
          cp, title: name + ' ' + ['Victory', 'Veteran', 'Conqueror', 'Legend'][i],
          description: 'Win as ' + name + ' on ' + DIFF_NAMES[i] + ' or higher.',
          qualifies: (g) => g.player === side && DIFFICULTIES.indexOf(g.difficulty) >= i,
        })),
      });
    for (const [index, difficulty] of DIFFICULTIES.entries())
      TRACKS.push({
        id: 'speed:' + era + ':' + difficulty, category: 'speed', era,
        title: DIFF_NAMES[index] + ' Speed',
        stages: SPEED_TURNS.map((turns, i) => ({
          cp: SPEED_CP[i], title: 'Win within ' + turns + ' turns',
          description: 'Win on exactly ' + DIFF_NAMES[index] + ' difficulty within ' + turns + ' turns.',
          qualifies: (g) => g.difficulty === difficulty && g.turn <= turns,
        })),
      });
    TRACKS.push({
      id: 'mobilization:' + era, category: 'mobilization', era, title: 'Limited Mobilization',
      stages: MOB_CAPS.map((cap, i) => ({
        cp: SPEED_CP[i], title: MOB_NAMES[i],
        description: 'Win on ' + DIFF_NAMES[MOB_DIFFICULTIES[i]] +
          (MOB_DIFFICULTIES[i] < 3 ? ' or higher' : '') +
          ' after adding at most ' + cap + ' new unit frame' + (cap === 1 ? '' : 's') + '.',
        qualifies: (g, run) => DIFFICULTIES.indexOf(g.difficulty) >= MOB_DIFFICULTIES[i] &&
          run.produced <= cap,
      })),
    });
  }
  const DEFINITIONS = [
    ['no-doomsday', 'No Doomsday', 15, 'Win without launching a player-controlled F.L.E.I.J.A.',
      (_g, run) => !run.fleijaLaunch],
    ['conventional', 'Conventional Warfare', 20, 'Win without producing any Elite Forces. Starting Elites are allowed.',
      (_g, run) => !run.eliteProduced],
    ['no-high', 'No High Command', 25, 'Win without assigning a personal HQ commander. Scripted officers are allowed.',
      (_g, run) => !Object.keys(run.assigned).length],
    ['officer-safe', 'No Officer Left Behind', 20,
      'Assign at least three distinct HQ commanders, lose none, and have all survive at victory.',
      (g, run) => {
        const ids = Object.keys(run.assigned);
        const units = (g.units || []).flatMap(u => [u, ...(u.cargo || [])]);
        return ids.length >= 3 && !run.officerLost &&
          ids.every(id => units.some(u => u.hp > 0 && u.side === g.player && u.personal && u.cmd === id));
      }],
    ['industrial', 'Industrial Embargo', 25,
      'Win without building or upgrading any factory, lab, port or refinery.',
      (_g, run) => !run.constructed],
    ['no-repairs', 'No Repairs', 20,
      'Win without manually repairing any land, naval or amphibious unit. Passive healing is allowed.',
      (_g, run) => !run.manualRepair],
  ];
  const STRATEGIC = Object.keys(ERA_NAMES).flatMap(era => DEFINITIONS.map(([slug, title, cp, description, qualifies]) =>
    ({ id: 'strategy:' + era + ':' + slug, era, title, cp, description, qualifies })));
  const COSMETICS = new Map([
    [250, '2017 Command Seal'], [500, '2018 Field Banner'], [750, 'Command Profile Frame'],
    [1000, 'Conquest Veteran Banner'], [1500, 'Supreme Command Crest'],
  ]);
  const FRAGMENTS = new Map([
    [150, 'Rare'], [350, 'Rare'], [550, 'Epic'], [850, 'Epic'],
    [1150, 'Legendary'], [1350, 'Legendary'],
  ]);
  // Graduated Command Token rewards; exactly 21 token milestones totaling 6,200.
  // The 1,600-CP final milestone also awards one permanent High Command position.
  const tokenAmounts = [
    ...Array(2).fill(150), ...Array(4).fill(200), ...Array(4).fill(250),
    ...Array(4).fill(300), ...Array(3).fill(350), ...Array(2).fill(400), 450, 600,
  ];
  let tokenIndex = 0;
  const MILESTONES = Array.from({ length: 32 }, (_, i) => {
    const at = (i + 1) * 50;
    if (COSMETICS.has(at)) return { at, kind: 'cosmetic', name: COSMETICS.get(at) };
    if (FRAGMENTS.has(at)) return { at, kind: 'fragments', amount: 10, rarity: FRAGMENTS.get(at) };
    return { at, kind: 'tokens', amount: tokenAmounts[tokenIndex++], highCommandBonus: at === 1600 ? 1 : 0 };
  });
  const MAX_CP = TRACKS.reduce((n, track) => n + track.stages.reduce((m, stage) => m + stage.cp, 0), 0) +
    STRATEGIC.reduce((n, objective) => n + objective.cp, 0);
  let currentTab = 'mastery';
  let returnTo = 'menu';

  function state(profile) {
    if (!profile.challengePass || profile.challengePass.version !== 1) {
      profile.challengePass = { version: 1, qualified: {}, claimed: {}, recordedRuns: {},
        milestones: {}, cosmetics: {}, equipped: '' };
    }
    const s = profile.challengePass;
    s.qualified ||= {};
    s.claimed ||= {};
    s.recordedRuns ||= {};
    s.milestones ||= {};
    s.cosmetics ||= {};
    return s;
  }
  function objectiveKey(id, index) { return id + ':' + index; }
  function start(g) {
    if (!g || g.mode !== 'conquest') return;
    g.challengePassRun = {
      version: 1, produced: 0, eliteProduced: false, constructed: false,
      manualRepair: false, fleijaLaunch: false, assigned: {}, officerLost: false,
    };
  }
  function record(profile, g) {
    if (!g || g.mode !== 'conquest' || g.over?.winner !== g.player ||
        g.challengePassRun?.version !== 1 || !ERA_NAMES[g.era] || !DIFFICULTIES.includes(g.difficulty))
      return 0;
    const s = state(profile), key = g.rewardClaimId;
    if (!key || s.recordedRuns[key]) return 0;
    const run = g.challengePassRun;
    let newlyQualified = 0;
    for (const track of TRACKS) {
      if (track.era !== g.era) continue;
      track.stages.forEach((stage, index) => {
        const id = objectiveKey(track.id, index);
        if (stage.qualifies(g, run) && !s.qualified[id]) {
          s.qualified[id] = true;
          newlyQualified++;
        }
      });
    }
    for (const objective of STRATEGIC) {
      if (objective.era !== g.era || !objective.qualifies(g, run) || s.qualified[objective.id]) continue;
      s.qualified[objective.id] = true;
      newlyQualified++;
    }
    s.recordedRuns[key] = true;
    return newlyQualified;
  }
  function earned(s) {
    let n = 0;
    for (const track of TRACKS)
      track.stages.forEach((stage, index) => {
        if (s.claimed[objectiveKey(track.id, index)]) n += stage.cp;
      });
    for (const obj of STRATEGIC) if (s.claimed[obj.id]) n += obj.cp;
    return n;
  }
  function currentStage(s, track) {
    return track.stages.findIndex((stage, index) => !s.claimed[objectiveKey(track.id, index)]);
  }
  function canClaim(s, id) {
    const track = TRACKS.find(item => item.id === id);
    if (track) {
      const stage = currentStage(s, track);
      return stage >= 0 && !!s.qualified[objectiveKey(id, stage)];
    }
    return STRATEGIC.some(item => item.id === id && s.qualified[id] && !s.claimed[id]);
  }
  function claimObjective(id) {
    const profile = loadProfile(), s = state(profile);
    if (!canClaim(s, id)) return { ok: false, reason: 'Objective is not ready to claim.' };
    const track = TRACKS.find(item => item.id === id);
    const index = track ? currentStage(s, track) : -1;
    const key = track ? objectiveKey(id, index) : id;
    const cp = track ? track.stages[index].cp : STRATEGIC.find(item => item.id === id).cp;
    s.claimed[key] = true;
    if (!saveProfile(profile)) return { ok: false, reason: 'Could not save Challenge Points.' };
    return { ok: true, cp };
  }
  function claimMilestone(at) {
    const profile = loadProfile(), s = state(profile);
    const milestone = MILESTONES.find(item => item.at === at);
    const earlier = MILESTONES.find(item => item.at < at && !s.milestones[item.at]);
    if (!milestone || earned(s) < at || s.milestones[at] || earlier)
      return { ok: false, reason: 'Milestone is locked, already claimed, or out of order.' };
    // A claimed 1,600-CP milestone is the durable +1 capacity entitlement;
    // the engine reads this flag directly and cannot award it twice.
    if (milestone.kind === 'tokens') profile.tokens = (profile.tokens || 0) + milestone.amount;
    if (milestone.kind === 'cosmetic') s.cosmetics[milestone.name] = true;
    if (milestone.kind === 'fragments') {
      const difficulty = { Rare: 'normal', Epic: 'hard', Legendary: 'challenge' }[milestone.rarity];
      const queued = queueEliteReward(profile, { era: 'world', player: 'britannia', difficulty },
        'world:challenge-pass:' + at + ':' + difficulty, milestone.amount,
        'Challenge Pass · ' + at + ' CP');
      if (!queued) return { ok: false, reason: 'Could not queue the selectable fragment reward.' };
    }
    s.milestones[at] = true;
    if (!saveProfile(profile)) return { ok: false, reason: 'Could not save the milestone reward.' };
    return { ok: true, item: milestone };
  }
  function equipCosmetic(name) {
    const profile = loadProfile(), s = state(profile);
    if (!s.cosmetics[name]) return { ok: false, reason: 'This cosmetic has not been unlocked.' };
    s.equipped = s.equipped === name ? '' : name;
    if (!saveProfile(profile)) return { ok: false, reason: 'Could not save cosmetic selection.' };
    return { ok: true };
  }
  // Original symbolic representations of the five cosmetic rewards.
  function cosmeticIcon(name) {
    const symbols = {
      '2017 Command Seal': '✦', '2018 Field Banner': '⚑',
      'Command Profile Frame': '▣', 'Conquest Veteran Banner': '⚑',
      'Supreme Command Crest': '♛',
    };
    return '<span class="cp-reward-symbol cp-cosmetic-symbol" aria-label="' + esc(name) + '">' + (symbols[name] || '✦') + '</span>';
  }
  function milestoneIcon(item) {
    if (item.kind === 'cosmetic') return cosmeticIcon(item.name);
    if (item.kind === 'fragments')
      return '<svg class="cp-reward-symbol" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 18 24 8l16 10-16 10Z" fill="#a68750" stroke="#ffdfa1" stroke-width="2"/><path d="M8 18v19l16 8V28Zm32 0v19l-16 8V28Z" fill="#405a6b" stroke="#dfc58a" stroke-width="2"/><path d="M24 8v37M8 18l16 10 16-10" fill="none" stroke="#f3d49a" stroke-width="2"/></svg>';
    return '<svg class="cp-reward-symbol" viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="19" r="13" fill="#87683a" stroke="#f0c979" stroke-width="2"/><circle cx="30" cy="29" r="13" fill="#b58b45" stroke="#ffe4a6" stroke-width="2"/><path d="M30 21v16m-6-12h12m-12 8h12" stroke="#fff2ca" stroke-width="2"/></svg>';
  }
  function rewardText(item) {
    if (item.kind === 'tokens') return '+' + item.amount + ' Command Tokens' + (item.highCommandBonus ? ' and +1 permanent High Command position' : '');
    if (item.kind === 'high-command') return '+1 permanent High Command position';
    if (item.kind === 'fragments') return item.rarity + ' Elite loot box · ' + item.amount + ' selectable fragments';
    return item.name;
  }
  function trackCard(track, s) {
    const i = currentStage(s, track), complete = i < 0;
    const stage = complete ? track.stages[track.stages.length - 1] : track.stages[i];
    const available = !complete && !!s.qualified[objectiveKey(track.id, i)];
    const gained = track.stages.reduce((n, x, j) => n + (s.claimed[objectiveKey(track.id, j)] ? x.cp : 0), 0);
    return `<article class="cp-card ${complete ? 'cp-done' : available ? 'cp-ready' : ''}">
      <div class="cp-card-top"><span class="cp-eyebrow">${esc(ERA_NAMES[track.era])} · ${esc(track.title)}</span>
        <span class="cp-small">${gained}/100 CP</span></div>
      <h3>${esc(complete ? track.title + ' Complete' : stage.title)}</h3>
      <p>${esc(complete ? 'All stages claimed.' : stage.description)}</p>
      <div class="cp-card-foot"><span>${complete ? '✓ Completed' : available ? 'Ready to claim · +' + stage.cp + ' CP' :
        'Stage ' + (i + 1) + '/' + track.stages.length + ' · +' + stage.cp + ' CP'}</span>
      ${available ? `<button class="primary" data-challenge-claim="${esc(track.id)}">Claim</button>` : ''}</div>
      <details class="cp-history"><summary>Stage history</summary>
        ${track.stages.map((x, j) => `<div>${s.claimed[objectiveKey(track.id,j)] ? '✓' :
          s.qualified[objectiveKey(track.id,j)] ? '◉' : '○'} ${esc(x.title)} · ${x.cp} CP</div>`).join('')}
      </details>
    </article>`;
  }
  function strategicCard(obj, s) {
    const complete = !!s.claimed[obj.id], available = !!s.qualified[obj.id] && !complete;
    return `<article class="cp-card ${complete ? 'cp-done' : available ? 'cp-ready' : ''}">
      <div class="cp-card-top"><span class="cp-eyebrow">${esc(ERA_NAMES[obj.era])}</span><span class="cp-small">+${obj.cp} CP</span></div>
      <h3>${esc(obj.title)}</h3><p>${esc(obj.description)}</p>
      <div class="cp-card-foot"><span>${complete ? '✓ Claimed' : available ? 'Ready to claim' : 'Not yet achieved'}</span>
        ${available ? `<button class="primary" data-challenge-claim="${esc(obj.id)}">Claim</button>` : ''}
      </div></article>`;
  }
  function milestoneSymbol(item) {
    if (item.kind === 'tokens') return '✧';
    if (item.kind === 'fragments') return '◆';
    if (item.kind === 'high-command') return '★';
    return { '2017 Command Seal': '✦', '2018 Field Banner': '⚑',
      'Command Profile Frame': '▣', 'Conquest Veteran Banner': '⚑',
      'Supreme Command Crest': '♛' }[item.name] || '✦';
  }
  function milestonesHTML(s, cp) {
    const first = MILESTONES.find(m => !s.milestones[m.at]);
    const chapters = ['The Opening Campaign', 'Rising Influence', 'Imperial Ascendancy', 'Supreme Command'];
    return `<div class="cp-roadmap" aria-label="Challenge Pass reward roadmap">
      ${chapters.map((title, chapter) => {
        const items = MILESTONES.slice(chapter * 8, (chapter + 1) * 8);
        const claimedCount = items.filter(item => s.milestones[item.at]).length;
        return `<section class="cp-roadmap-chapter" aria-label="Chapter ${chapter + 1}: ${title}">
          <div class="cp-roadmap-chapter-head"><div><span class="cp-eyebrow">CHAPTER ${String(chapter + 1).padStart(2, '0')}</span>
          <h3>${title}</h3></div><span>${items[0].at}–${items[items.length - 1].at} CP · ${claimedCount}/8 claimed</span></div>
          <div class="cp-roadmap-scroll" tabindex="0" aria-label="Scroll ${title} rewards">
            <div class="cp-roadmap-lane"><span class="cp-roadmap-rail" aria-hidden="true"><span style="width:${claimedCount / items.length * 100}%"></span></span>
              ${items.map(item => {
                const claimed = !!s.milestones[item.at], ready = cp >= item.at && first?.at === item.at;
                const kind = item.highCommandBonus || item.kind === 'high-command' ? 'capacity' : item.kind;
                const status = claimed ? 'Claimed' : ready ? 'Ready' : cp >= item.at ? 'Available after earlier rewards' : 'Locked';
                return `<article class="cp-roadmap-tile cp-kind-${kind} ${claimed ? 'cp-done' : ready ? 'cp-ready' : ''}" aria-label="${item.at} CP: ${esc(rewardText(item))}. ${status}">
                  <span class="cp-roadmap-step">${item.at} CP</span>
                  <div class="cp-roadmap-node" aria-hidden="true"><span class="cp-roadmap-glyph">${milestoneIcon(item)}</span>${item.highCommandBonus ? '<span class="cp-roadmap-cap-star">+1 HQ</span>' : ''}</div>
                  <div class="cp-roadmap-reward"><span class="cp-roadmap-type">${kind === 'capacity' ? 'PERMANENT UPGRADE' : kind.toUpperCase()}</span>
                    <strong>${esc(rewardText(item))}</strong></div>
                  ${claimed ? '<span class="cp-roadmap-status">✓ Claimed</span>' :
                    ready ? `<button class="primary" data-challenge-milestone="${item.at}" aria-label="Claim ${esc(rewardText(item))}">Claim</button>` :
                    `<span class="cp-roadmap-status">${status}</span>`}
                </article>`;
              }).join('')}
            </div>
          </div>
        </section>`;
      }).join('')}
    </div>`;
  }
  function availableCount(s) {
    return TRACKS.reduce((n, t) => n + Number(canClaim(s, t.id)), 0) +
      STRATEGIC.reduce((n, o) => n + Number(canClaim(s, o.id)), 0);
  }
  function resultHTML() {
    if (game?.mode !== 'conquest' || game.over?.winner !== game.player ||
        game.challengePassRun?.version !== 1) return '';
    const s = state(loadProfile()), n = availableCount(s);
    return `<div class="reward cp-result-notice"><b>Challenge Pass</b> · ${n ?
      n + ' objective' + (n === 1 ? '' : 's') + ' ready to claim' : 'Progress recorded'}
      <button class="small" data-action="challenge-pass">View Challenge Pass</button></div>`;
  }
  function liveRunHTML() {
    const run = game?.mode === "conquest" && !game.over && game.challengePassRun?.version === 1 ? game.challengePassRun : null;
    if (!run) return "";
    const assigned = Object.keys(run.assigned).length;
    return `<section class="cp-live"><b>ACTIVE CONQUEST · TURN ${game.turn} · ${esc(DIFF_NAMES[DIFFICULTIES.indexOf(game.difficulty)] || game.difficulty)}</b>
      <div class="cp-live-grid"><span>New frames: <strong>${run.produced}</strong></span>
      <span>New Elite Forces: <strong>${run.eliteProduced ? "Yes" : "No"}</strong></span>
      <span>Construction: <strong>${run.constructed ? "Used" : "None"}</strong></span>
      <span>Manual repairs: <strong>${run.manualRepair ? "Used" : "None"}</strong></span>
      <span>F.L.E.I.J.A.: <strong>${run.fleijaLaunch ? "Launched" : "Not launched"}</strong></span>
      <span>HQ commanders: <strong>${assigned} assigned${run.officerLost ? " · losses recorded" : ""}</strong></span></div></section>`;
  }
  function open(tab = currentTab, preserveScroll = false) {
    const old = preserveScroll ? modal.querySelector('.challenge-pass-dialog') : null;
    const scroll = old?.scrollTop || 0;
    const s = state(loadProfile()), cp = earned(s);
    currentTab = ['mastery','speed','mobilization','strategy','rewards'].includes(tab) ? tab : 'mastery';
    const visible = currentTab === 'strategy'
      ? STRATEGIC.map(o => strategicCard(o,s)).join('')
      : currentTab === 'rewards' ? milestonesHTML(s,cp)
      : TRACKS.filter(t => t.category === currentTab).map(t => trackCard(t,s)).join('');
    const equipped = s.equipped && s.cosmetics[s.equipped] ? s.equipped : '';
    const tabs = [
      ['mastery','Faction Mastery'],['speed','Speed'],['mobilization','Mobilization'],
      ['strategy','Strategic'],['rewards','Rewards'],
    ];
    const next = MILESTONES.find(m => !s.milestones[m.at]);
    const cosmetics = [...COSMETICS.entries()];
    modal.innerHTML = `<div class="overlay cp-overlay"><section class="dialog wide challenge-pass-dialog" role="dialog"
      aria-modal="true" aria-label="Conquest Challenge Pass">
      <header class="cp-header"><div><span class="cp-eyebrow">WORLD CONQUEST · PERMANENT · FREE</span>
        <h2>Conquest Challenge Pass</h2>
        <p>Master both world wars. Claim objectives and permanent rewards.</p></div>
        <button data-action="challenge-pass-close">Close</button></header>
      <div class="cp-progress"><div class="cp-progress-top"><b>${cp.toLocaleString('en-US')} / ${MAX_CP.toLocaleString('en-US')} CP</b>
        <span>Final reward at 1,600 CP</span></div>
        <div class="cp-progress-rail"><span style="width:${Math.min(100,cp/MAX_CP*100)}%"></span></div>
        <small>${availableCount(s)} objective tracks ready to claim · ${next ? 'Next reward at ' + next.at + ' CP' : 'All milestone rewards claimed'}</small></div>
      ${equipped ? `<div class="cp-equipped">${cosmeticIcon(equipped)} <span>Equipped: ${esc(equipped)}</span></div>` : ''}
      <nav class="cp-tabs" aria-label="Challenge Pass categories">
        ${tabs.map(([id,label]) => `<button class="${currentTab === id ? 'active' : ''}" data-challenge-tab="${id}">${label}</button>`).join('')}</nav>
      <div class="cp-content">
        ${liveRunHTML()}
        ${currentTab === 'rewards' ? '<p class="cp-intro">Follow the reward roadmap from 50 to 1,600 CP. Claim in order; eligible Elite fragments remain selectable. The final reward permanently adds one Global High Command position.</p>' :
          '<p class="cp-intro">Win new Conquests to qualify. Claim the current stage to reveal the next; higher difficulty counts for lower mastery and mobilization stages, but speed tracks require their exact difficulty.</p>'}
        <div class="${currentTab === 'rewards' ? '' : 'cp-grid'}">${visible}</div>
        ${currentTab === 'rewards' ? `<h3>Cosmetic collection</h3><p class="cp-intro">All five are cosmetic only. Unlocked insignia can be equipped on your HQ menu.</p><div class="cp-cosmetics">
          ${cosmetics.map(([at,name])=>`<${s.cosmetics[name] ? 'button' : 'div'} class="cp-cosmetic-card ${equipped === name ? 'active' : ''} ${s.cosmetics[name] ? '' : 'cp-cosmetic-locked'}" ${s.cosmetics[name] ? 'data-challenge-equip="' + esc(name) + '"' : ''}>
            ${cosmeticIcon(name)}<b>${esc(name)}</b><small>${s.cosmetics[name] ? (equipped === name ? '✓ Equipped' : 'Tap to equip') : 'Unlock at ' + at.toLocaleString('en-US') + ' CP'}</small></${s.cosmetics[name] ? 'button' : 'div'}>`).join('')}</div>` : ''}
        ${currentTab === 'rewards' ? pendingEliteChoiceHTML() : ''}
      </div><footer class="cp-footer"><span>No historical save credit · Saving and resuming new Conquests is allowed</span>
        <button data-action="challenge-pass-close">Return</button></footer></section></div>`;
    modal.querySelector('.challenge-pass-dialog').scrollTop = scroll;
    focusDialog();
  }
  function enter() {
    returnTo = modal.querySelector('.start-command') ? 'menu' :
      modal.querySelector('.military-result-dialog') ? 'result' : 'game';
    open('mastery');
  }
  function close() {
    if (returnTo === 'menu') startMenu();
    else if (returnTo === 'result') resultDialog();
    else closeModal();
  }
  return { TRACKS, STRATEGIC, MILESTONES, MAX_CP, state, earned, start, record, open,
    enter, close, claimObjective, claimMilestone, equipCosmetic, cosmeticIcon, resultHTML, availableCount };
})();
function challengePassStartRun(g) { CHALLENGE_PASS.start(g); }
function challengePassRecordVictory(profile, g) { return CHALLENGE_PASS.record(profile, g); }
function challengePassResultHTML() { return CHALLENGE_PASS.resultHTML(); }

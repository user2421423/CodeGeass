/* Knightmare Conquest UI: Ending a turn: rival-turn playback with Skip, surrender notices, rewards and the result screen. */
'use strict';
async function endTurn(force = false) {
  if (!interactive()) return;
  const ready = ownUnits().filter(u => E.hasOrders(game, u)).length;
  if (ready && !force) {
    modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="End turn"><div class="eyebrow">Review orders</div><h2>${ready} units still have orders.</h2><p>You can end the turn now and leave them holding position, or return to issue their orders.</p><div class="dialog-footer"><button data-action="close">Return to the map</button><button class="primary" data-action="end-confirm">End turn</button></div></section></div>`;
    focusDialog();
    return;
  }
  closeModal();
  undoStack = [];
  strikeMode = false;
  save();
  const token = ++aiToken;
  skipAI = false;
  for (const side of game.order.slice(1)) {
    if (!E.alive(game, side) || game.over) continue;
    aiSide = side;
    let before = unitSnapshot();
    E.beginTurn(game, side, game.turn > 1);
    turnStartPopups(before, side);
    E.aiProduction(game);
    (game.strikes || []).filter(s => onScreen(s.to)).forEach((s, i) => strikeEffects(s, i * 0.5));
    render();
    if (game.strikes?.some(s => onScreen(s.to)) && !skipAI) await pause(900);
    // F.L.E.I.J.A.: every power hears of a new project; a launch always plays in full, even when skipping.
    for (const s of game.stations) {
      if (s.project?.side === side && s.project.started === game.turn)
        toast(`INTELLIGENCE: Strategic weapons research detected in ${s.name}.`, true);
      if (s.eliminatorProject?.side === side && s.eliminatorProject.started === game.turn)
        toast(`INTELLIGENCE: F.L.E.I.J.A. Eliminator development detected in ${s.name}.`, true);
    }
    for (const shot of game.launches || []) {
      await fleijaSequence(shot.to, side, shot.name, null, shot);
      if (shot.intercepted)
        toast(`F.L.E.I.J.A. Eliminator at ${shot.eliminatorCity} neutralized the incoming warhead.`, true);
      else if (shot.eliminatorUnlocked)
        toast('F.L.E.I.J.A. Eliminator countermeasures are now available at level-3 research labs.', true);
      if (token !== aiToken) return;
    }
    const ids = game.units.filter(u => u.hp > 0 && u.side === side && !u.attacked).map(u => u.id),
      minesBefore = (game.sites || []).map(d => d.owner);
    let quiet = 0;
    for (const id of ids) {
      if (token !== aiToken || game.over) break;
      const u = game.units.find(u => u.id === id);
      if (!u || u.hp <= 0) continue;
      before = unitSnapshot();
      const orders = E.aiOrder(game, id);
      const seen = orders.some(o => onScreen(o.to) || onScreen(o.from));
      if (seen) moralePopups(before);
      for (const o of orders) {
        if (o.annexed) annexNotice(o.annexed);
        if (!seen) continue;
        if (o.kind === 'attack') addCombatEffects(o, u);
        else if (o.kind === 'move' || o.kind === 'deploy') {
          SFX.play('move', side);
          effects.push({ kind: 'move', unitId: o.kind === 'deploy' ? o.id : id, from: o.from, to: o.to, color: F(side).color, life: 0.5, max: 0.5 });
        }
      }
      if (seen && !skipAI) {
        updateSelection();
        await pause(orders.some(o => o.kind === 'attack') ? 420 : 160);
      } else if (++quiet % 12 === 0) await pause(0);
    }
    const lost = (game.sites || []).filter((d, i) => minesBefore[i] === game.player && d.owner !== game.player);
    if (lost.length)
      toast(`${lost.map(d => d.name).join(' and ')} Sakuradite mine${lost.length > 1 ? 's' : ''} seized by the ${F(side).short}.`, true);
    if (token !== aiToken) return;
    if (game.over) break;
  }
  aiSide = null;
  if (token !== aiToken) return;
  let armed = false,
    orders = null;
  if (!game.over) {
    game.turn++;
    const before = unitSnapshot(),
      warheads = game.arsenal?.[game.player] || 0;
    E.beginTurn(game, game.player, true);
    turnStartPopups(before, game.player);
    game.automationReport = game.mode === 'conquest' ? E.runCityAutomation(game, game.player) : null;
    armed = (game.arsenal?.[game.player] || 0) > warheads;
    orders = E.runGotos(game, game.player);
    for (const m of orders.moved)
      effects.push({ kind: 'move', unitId: m.id, from: m.from, to: m.to, color: F(game.player).color, life: 0.6, max: 0.6 });
    if (orders.moved.length) SFX.play('move', game.player);
  }
  render();
  save();
  campaignFeed(() => game.over && resultDialog());
  const logistics = game.automationReport,
    standing = orders && gotoReportText(orders) ? ` Standing orders: ${gotoReportText(orders)}.` : '';
  if (armed) toast(`Turn ${game.turn}. A F.L.E.I.J.A. warhead is ready: use the arsenal button to launch it.${standing}`, true);
  else if (!game.over && logistics && (logistics.units || logistics.upgrades))
    toast(`AUTOMATED LOGISTICS — ${automationReportText(logistics)}${standing}`, true);
  else if (!game.over && standing) toast(`Turn ${game.turn}.${standing}`, true);
  else if (!game.over) toast(`Turn ${game.turn}. Income collected; unit orders refreshed.`);
  const annexed = orders?.moved.find(m => m.annexed)?.annexed;
  if (annexed) annexNotice(annexed);
}
// A power's capital fell: it surrendered and its cities changed hands.
function annexNotice(a) {
  const mine = a.winner === game.player,
    lost = a.loser === game.player;
  toast(
    lost
      ? `${a.capital} has fallen. The ${F(a.loser).name} surrenders.`
      : `${a.capital} has fallen! The ${F(a.loser).name} surrenders to ${mine ? 'you' : 'the ' + F(a.winner).name}: ${a.cities} cities change hands.`,
    true,
  );
  SFX.play('thor', a.winner);
}
// When an operation ends, its medals join the profile's medal case and a win pays command tokens, exactly once.
function claimReward() {
  if (!game.over || game.rewardClaimed) return;
  const p = loadProfile();
  p.medals = [...(p.medals || []), ...(game.medalsEarned || []).map(m => m.id)];
  if (game.mode === 'campaign') {
    const CP = E.campaign,
      id = game.campaign.id,
      r = CP.reward(game, p);
    p.tokens = (p.tokens || 0) + r.total;
    if (game.over.winner === game.player) {
      const legacyBest = CP.best(p, id),
        difficultyRecords = (p.campaignDifficulty ||= {}),
        eliteAward = {},
        addEliteAward = awards => {
          for (const [k, v] of Object.entries(awards || {})) eliteAward[k] = (eliteAward[k] || 0) + v;
        };
      // Migrate old campaign progress once: pre-difficulty stars belong to Normal.
      if (!difficultyRecords[id]) difficultyRecords[id] = { normal: legacyBest };
      const byDifficulty = difficultyRecords[id],
        diff = game.difficulty || 'normal';
      byDifficulty[diff] = Math.max(byDifficulty[diff] || 0, r.stars);
      (p.campaign ||= {})[id] = Math.max(legacyBest, r.stars);
      // A first clear at each difficulty still pays the broad faction fragment drop. Two-star, three-star and
      // campaign milestone bonuses are targeted and can stack onto that same result.
      if (r.first) addEliteAward(E.eliteVictoryReward(game, {}));
      addEliteAward(r.fragments);
      if (Object.keys(eliteAward).length) {
        E.grantEliteFragments(p, eliteAward);
        game.eliteReward = eliteAward;
      } else delete game.eliteReward;
      // Campaign milestone rewards are once-only and live in the persistent profile.
      if (r.milestones?.length) {
        const cid = CP.mission(id)?.campaign,
          claimed = ((p.campaignMilestones ||= {})[cid] ||= {});
        for (const milestone of r.milestones) claimed[milestone] = true;
      }
    }
    game.reward = r;
  } else if (game.over.winner === game.player) {
    const r = E.missionReward(game, p.wins || 0, p.cleared || {}),
      eliteAward = E.eliteVictoryReward(game, p);
    E.grantEliteFragments(p, eliteAward);
    game.eliteReward = eliteAward;
    if (!r.repeat) {
      p.tokens = (p.tokens || 0) + r.total;
      p.wins = (p.wins || 0) + 1;
      (p.cleared ||= {})[E.operationKey(game)] = true;
    }
    game.reward = r;
  }
  game.rewardClaimed = true;
  undoStack = [];
  saveProfile(p);
  try {
    localStorage.setItem(saveKey(), JSON.stringify(game));
  } catch (e) {}
}
function resultDialog() {
  claimReward();
  if (game.mode === 'campaign') return missionResult();
  const win = game.over.winner === game.player,
    draw = game.over.winner === 'draw';
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="Operation result"><div class="eyebrow">${win ? 'Operation successful' : draw ? 'Armistice' : 'Operation ended'}</div><h2>${win ? 'The world bows.' : draw ? 'An uneasy peace.' : 'The last order.'}</h2><p>${game.over.reason}</p>${(game.medalsEarned || []).length ? `<div class="medal-case"><span class="label">Medals earned</span>${game.medalsEarned.map(m => `<span class="medal-chip" title="${esc(m.reason)}">🎖 ${E.MEDALS[m.id].name}</span>`).join('')}</div>` : ''}${game.eliteReward && Object.keys(game.eliteReward).length ? `<div class="reward"><span class="label">Elite fragments recovered</span><small>${Object.entries(game.eliteReward).map(([k,v]) => `${E.TYPES[E.ELITE_FORCES[k].type].name} +${v}`).join(' · ')}</small></div>` : ''}${game.reward ? (game.reward.repeat ? `<div class="reward"><span class="label">No command tokens</span><small>Tokens are paid only for the first victory at each difficulty. Try ${game.difficulty === 'challenge' ? 'another faction' : 'a harder difficulty'} for more.</small></div>` : `<div class="reward"><span class="label">Command tokens earned</span><b>${ICONS.use('token', 'cost-ico')} +${game.reward.total}</b><small>${game.reward.parts.map(([k, v]) => (v ? `${k} +${v}` : k)).join(' · ')}</small></div>`) : ''}<p class="description">Medals earned go to your medal case. Spend command tokens on HQ research and on your commanders in HQ → Commanders.</p><div class="result-numbers"><div><b>${game.turn}</b><small>Turns elapsed</small></div><div><b>${game.stations.filter(s => s.owner === game.player).length}</b><small>Cities held</small></div><div><b>${ownUnits().length}</b><small>Units remaining</small></div></div><div class="dialog-footer"><button data-action="close">Inspect the map</button><button data-action="research">HQ research</button><button class="primary" data-action="new">New operation</button></div></section></div>`;
  focusDialog();
}

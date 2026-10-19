/* Knightmare Conquest UI: Ending a turn: rival-turn playback with Skip, surrender notices, rewards and the result screen. */
'use strict';
async function endTurn() {
  if (typeof isTutorial === 'function' && isTutorial()) return tutorialEndTurn();
  if (!interactive()) return;
  closeModal();
  undoStack = [];
  strikeMode = false;
  armyGroupRouting = null;
  save();
  dismissTurnSummary();
  dismissPoliticalReport();
  militaryPresentation.suspend();
  const token = ++aiToken;
  // Rival turns always play at full speed (no per-move pauses or combat animations).
  skipAI = true;
  SFX.setAiTurn(true);
  for (const side of game.order.slice(1)) {
    if (!E.alive(game, side) || game.over) continue;
    aiSide = side;
    setAiPhase(side);
    try {
      let before = unitSnapshot();
      E.beginTurn(game, side, game.turn > 1);
      turnStartPopups(before, side);
      E.aiProduction(game);
      // Units the rival moved off its cities so they could build.
      for (const { id, orders } of game.vacated || [])
        for (const o of orders) {
          if (o.annexed) annexNotice(o.annexed);
          if ((o.kind === 'move' || o.kind === 'deploy') && (onScreen(o.to) || onScreen(o.from)))
            effects.push({ kind: 'move', unitId: o.kind === 'deploy' ? o.id : id, from: o.from, to: o.to, color: F(side).color, life: 0.5, max: 0.5 });
        }
      (game.strikes || []).filter(s => onScreen(s.to)).forEach((s, i) => strikeEffects(s, i * 0.5));
      render();
      if (game.strikes?.some(s => onScreen(s.to)) && !skipAI) await pause(900);
      // F.L.E.I.J.A.: every power hears of a new project; a launch always plays in full, even when skipping.
      for (const s of game.stations) {
        if (s.project?.side === side && s.project.started === game.turn)
          toast(`INTELLIGENCE: Strategic weapons research detected in ${s.name}.`, true);
      }
      for (const shot of game.launches || []) {
        await fleijaSequence(shot.to, side, shot.name, null, shot);
        if (shot.intercepted)
          toast(shot.defender === game.player
            ? `Your F.L.E.I.J.A. Eliminator (${shot.eliminatorCity}) neutralized the incoming warhead.`
            : 'An F.L.E.I.J.A. Eliminator neutralized the incoming warhead. Defensive site classified.', true);
        else if (shot.eliminatorUnlocked)
          toast(`F.L.E.I.J.A. Eliminator research begins; countermeasures are available from turn ${shot.eliminatorTurn}.`, true);
        if (token !== aiToken) return;
      }
      const ids = game.units.filter(u => u.hp > 0 && u.side === side && !u.attacked)
        .sort((a, b) => E.aiOrderPriority(game, a) - E.aiOrderPriority(game, b) || a.id - b.id)
        .map(u => u.id),
        minesBefore = (game.sites || []).map(d => d.owner);
      let quiet = 0;
      for (let step = 0; step < ids.length; step++) {
        // Bounded reprioritization after earlier orders change the actual board.
        const next = E.aiNextActor(game, ids, step);
        if (next !== step) [ids[step], ids[next]] = [ids[next], ids[step]];
        const id = ids[step];
        if (token !== aiToken || game.over) break;
        const u = game.units.find(u => u.id === id);
        if (!u || u.hp <= 0) continue;
        before = unitSnapshot();
        const visuals = combatVisualSnapshot();
        let orders;
        try {
          orders = E.aiOrder(game, id);
        } catch (err) {
          // One unit's failed order must not stall the whole rival turn.
          console.error(`Rival order failed for unit ${id}`, err);
          continue;
        }
        invalidateUIState();
        const seen = orders.some(o => onScreen(o.to) || onScreen(o.from));
        if (seen) moralePopups(before);
        for (const o of orders) {
          if (o.annexed) annexNotice(o.annexed);
          if (!seen) continue;
          if (o.kind === 'attack') addCombatEffects(o, u, visuals);
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
      if (token !== aiToken) return;
      const lost = (game.sites || []).filter((d, i) => minesBefore[i] === game.player && d.owner !== game.player);
      if (lost.length)
        toast(`${lost.map(d => d.name).join(' and ')} Sakuradite mine${lost.length > 1 ? 's' : ''} seized by the ${F(side).short}.`, true);
    } catch (err) {
      // A rival turn that throws ends early instead of leaving the player locked out; play moves on.
      if (token !== aiToken) return;
      console.error(`Rival turn failed for ${side}`, err);
      toast(`The ${F(side).short} turn hit an error and ended early.`, true);
    }
    if (token !== aiToken) return;
    if (game.over) break;
  }
  aiSide = null;
  setAiPhase(null);
  if (token !== aiToken) return;
  SFX.setAiTurn(false);
  const completedTurn = game.turn;
  E.finishWarTurn(game, completedTurn);
  let armed = false,
    orders = null,
    scenarioNotice = false;
  if (!game.over) {
    game.turn++;
    scenarioNotice = game.mode === 'scenario' && E.scenarioOf(game)?.onTurn(game);
    const before = unitSnapshot(),
      warheads = game.arsenal?.[game.player] || 0;
    E.beginTurn(game, game.player, true);
    turnStartPopups(before, game.player);
    game.automationReport = game.mode === 'conquest' ? E.runCityAutomation(game, game.player) : null;
    armed = (game.arsenal?.[game.player] || 0) > warheads;
    orders = runPlayerAutomatedOrders();
  }
  render();
  save();
  militaryPresentation.resume();
  campaignFeed(() => game.over && resultDialog());
  if (!game.over) {
    announceTurn(!!scenarioNotice);
  }
  const logistics = game.automationReport,
    standing = orders ? [gotoReportText(orders), orders.fired?.length ? `${orders.fired.length} army-group attack${orders.fired.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') : '';
  const standingSummary = standing ? ` Standing orders: ${standing}.` : '';
  if (scenarioNotice) showPoliticalReport('THE ALLIANCE HAS COLLAPSED',
    'Britannia and the Black Knights are now hostile. All three powers are at war.');
  else if (armed) toast(`Turn ${game.turn}. A F.L.E.I.J.A. warhead is ready: use the arsenal button to launch it.${standingSummary}`, true);
  else if (!game.over && logistics && (logistics.units || logistics.upgrades))
    toast(`AUTOMATED LOGISTICS — ${automationReportText(logistics)}${standingSummary}`, true);
  else if (!game.over && standing) toast(`Turn ${game.turn}.${standingSummary}`, true);
  else if (!game.over) toast(`Turn ${game.turn}. Income collected; unit orders refreshed.`);
  const annexed = orders?.moved.find(m => m.annexed)?.annexed;
  if (annexed) annexNotice(annexed);
}
// A power lost its last city: it surrendered and its armies disbanded.
function annexNotice(a) {
  const mine = a.winner === game.player,
    lost = a.loser === game.player;
  toast(
    lost
      ? `${a.city}, your last city, has fallen. The ${F(a.loser).name} surrenders.`
      : `${a.city} has fallen! The ${F(a.loser).name} has lost its last city and surrenders to ${mine ? 'you' : 'the ' + F(a.winner).name}: ${a.units} units disband.`,
    true,
  );
  SFX.play('thor', a.winner);
}
// A one-time selectable bundle for exactly one Elite Force. Store pending awards
// in the persistent profile before offering a choice, so closing the game or
// reloading a results screen cannot duplicate or discard the reward.
const ELITE_REWARD_RARITIES = {
  normal: ['Rare'], hard: ['Epic'], challenge: ['Legendary'],
  elite: ['Rare', 'Epic', 'Legendary'],
};
function queueEliteReward(profile, operation, key, amount, source) {
  if (!amount) return false;
  profile.pendingEliteRewards ||= [];
  profile.claimedEliteChoices ||= {};
  if (profile.claimedEliteChoices[key] || profile.pendingEliteRewards.some(r => r.key === key)) return false;
  const side = operation.player === 'eb' ? 'britannia'
    : operation.era === 'ufn2018' && operation.player === 'cf' ? 'bk' : operation.player;
  const allowed = ELITE_REWARD_RARITIES[operation.difficulty] || ELITE_REWARD_RARITIES.normal;
  // World Campaign and weekly events are faction-independent. Story and Conquest stay faction-bound.
  const worldCampaign = key.startsWith('world:') || key.startsWith('weekly:');
  const options = Object.entries(E.ELITE_FORCES).filter(([, elite]) =>
    !elite.scenarioOnly && allowed.includes(elite.rarity) &&
    (worldCampaign || elite.availableTo.includes(side)))
    .map(([id]) => id);
  if (!options.length) return false;
  profile.pendingEliteRewards.push({
    key, amount, source, options, rarity: allowed.length === 1 ? allowed[0] : 'Any',
    side: worldCampaign ? null : side, // Retain faction identity across rarity changes.
  });
  return true;
}
// Keep pending reward choices consistent with current rarities, including
// rewards earned before an Elite changed its class-based rarity.
function eligibleEliteRewardOptions(award, profile = loadProfile()) {
  if (!award) return [];
  const records = E.eliteProfile(profile);
  const canReceive = id =>
    !!E.ELITE_FORCES[id] && !E.ELITE_FORCES[id].scenarioOnly &&
    records[id]?.level < E.ELITE_MAX_LEVEL;
  if (!award.key?.startsWith('world:') && !award.key?.startsWith('weekly:')) {
    // Story/Conquest rewards are faction-bound. Old records lack side, but
    // their original eligibility snapshot contains only that faction.
    const legacySides = new Set((award.options || [])
      .flatMap(id => E.ELITE_FORCES[id]?.availableTo || []));
    const side = award.side || (legacySides.size === 1 ? [...legacySides][0] : null);
    const rarities = award.rarity === 'Any'
      ? ELITE_REWARD_RARITIES.elite : [award.rarity];
    if (!side)
      return (award.options || []).filter(id =>
        canReceive(id) && rarities.includes(E.ELITE_FORCES[id].rarity));
    return Object.entries(E.ELITE_FORCES)
      .filter(([id, elite]) =>
        elite.availableTo.includes(side) && rarities.includes(elite.rarity) && canReceive(id))
      .map(([id]) => id);
  }
  // World Campaign/weekly rewards remain cross-faction and use their
  // original difficulty, regardless of previous cached choices.
  const difficulty = award.key.split(':').pop();
  const rarities = ELITE_REWARD_RARITIES[difficulty] || [];
  return Object.entries(E.ELITE_FORCES)
    .filter(([id, elite]) => rarities.includes(elite.rarity) && canReceive(id))
    .map(([id]) => id);
}
// If one old reward has no eligible units left, preserve it without blocking
// a later reward of another rarity that can still be claimed.
function nextEliteReward(profile) {
  const pending = profile.pendingEliteRewards || [];
  if (!pending.length) return { award: null, index: -1 };
  const eligibleIndex = pending.findIndex(award =>
    eligibleEliteRewardOptions(award, profile).length > 0);
  const index = eligibleIndex >= 0 ? eligibleIndex : 0;
  return { award: pending[index], index };
}
function pendingEliteChoiceHTML(profile = loadProfile()) {
  // One shared loot-box component is used by every fragment-awarding game mode.
  if (typeof eliteLootBoxPanelHTML === 'function') return eliteLootBoxPanelHTML(profile);
  const { award } = nextEliteReward(profile);
  if (!award) return '';
  const options = eligibleEliteRewardOptions(award, profile);
  // Do not drop a one-time award if its entire rarity/faction pool is maxed.
  // Keep it pending for future eligible elites and explain why no buttons appear.
  if (!options.length)
    return `<section class="reward" data-elite-choice-panel="1"><span class="label">Elite fragment reward saved</span>
      <p><b>${award.amount} ${esc(award.rarity)} fragments</b> · ${esc(award.source)}</p>
      <p class="description">All eligible Elite Forces are at maximum level. This reward remains unclaimed; no fragments have been spent.</p>
      <small>${profile.pendingEliteRewards.length} unclaimed reward${profile.pendingEliteRewards.length === 1 ? '' : 's'} saved.</small></section>`;
  return `<section class="reward" data-elite-choice-panel="1"><span class="label">Choose your Elite fragment reward</span>
    <p><b>${award.amount} ${esc(award.rarity)} fragments</b> · ${esc(award.source)}</p>
    <p class="description">Choose ONE Elite Force; no other units receive fragments.</p>
    <div class="tabs" style="display:flex;flex-wrap:wrap;gap:6px">
    ${options.map(id => `<button class="small" data-reward-elite="${id}">${esc(E.TYPES[E.ELITE_FORCES[id].type].name)}</button>`).join('')}
    </div><small>${profile.pendingEliteRewards.length} unclaimed reward${profile.pendingEliteRewards.length === 1 ? '' : 's'} · Your choice is saved across sessions.</small></section>`;
}
function selectEliteReward(id, rewardKey = null) {
  const profile = loadProfile();
  const { award, index } = rewardKey === null ? nextEliteReward(profile) : (() => {
    const index = (profile.pendingEliteRewards || []).findIndex(entry => entry.key === rewardKey);
    return { award: index >= 0 ? profile.pendingEliteRewards[index] : null, index };
  })();
  if (!award || !eligibleEliteRewardOptions(award, profile).includes(id))
    return { ok: false, reason: 'This Elite Force is unavailable or already at maximum level' };
  E.grantEliteFragments(profile, { [id]: award.amount });
  (profile.claimedEliteChoices ||= {})[award.key] = id;
  profile.pendingEliteRewards.splice(index, 1);
  if (!saveProfile(profile)) return { ok: false, reason: 'Could not save reward. Retry without reloading.' };
  return { ok: true, id, amount: award.amount };
}
function claimWarCampaignHQReward(result) {
  if (!result?.ok || !game.warCampaign || game.over?.winner !== game.player) return null;
  const profile = loadProfile(),
    faction = game.warCampaign.faction,
    key = `${faction}:${game.warCampaign.missionId}:${game.difficulty || 'normal'}`;
  profile.worldCampaignRewardClaims ||= {};
  profile.worldCampaignMilestoneClaims ||= {};
  const tokensByDifficulty = { normal: 200, hard: 300, challenge: 400, elite: 500 };
  const fragmentsByDifficulty = { normal: 10, hard: 10, challenge: 10, elite: 20 };
  let tokens = 0;
  let fragmentBundle = 0;
  if (!profile.worldCampaignRewardClaims[key]) {
    profile.worldCampaignRewardClaims[key] = true;
    tokens += tokensByDifficulty[game.difficulty] || 200;
    fragmentBundle = fragmentsByDifficulty[game.difficulty] || 10;
    queueEliteReward(profile, game, 'world:' + key, fragmentBundle, 'World Campaign victory');
  }
  // Milestones are derived from persistent map progress, not just this turn's
  // transition, so a save interrupted between territorial and HQ writes recovers.
  const tiers = KnightmareWarCampaign.registry[faction] || [];
  const allComplete = tiers.length && tiers.every(t => t.missions.length &&
    t.missions.every(m => KnightmareWarCampaign.completed(result.progress, faction, m.id)));
  for (const tier of tiers) {
    const milestoneKey = `${faction}:tier:${tier.number}`;
    if (!tier.missions.length || profile.worldCampaignMilestoneClaims[milestoneKey]) continue;
    if (tier.missions.every(m => KnightmareWarCampaign.completed(result.progress, faction, m.id))) {
      profile.worldCampaignMilestoneClaims[milestoneKey] = true;
      tokens += 500;
    }
  }
  if (allComplete && !profile.worldCampaignMilestoneClaims[faction + ':complete']) {
    profile.worldCampaignMilestoneClaims[faction + ':complete'] = true;
    tokens += 1000;
  }
  profile.tokens = (profile.tokens || 0) + tokens;
  if (!saveProfile(profile)) return { ok: false, reason: 'HQ rewards could not be saved. Reopen the completed battle result.' };
  return { ok: true, tokens, fragmentBundle };
}
// Scenario honors are independent of the World Campaign's persistent HQ rewards.
function claimScenarioHonors() {
  if (!game.over || game.honorsClaimed) return;
  game.honorClaimId ||= `honors:scenario:${game.scenario?.id||'regional'}:${game.player}:${game.turn}:${game.seed}`;
  save();
  const profile=loadProfile();
  if (!profile.honorClaims?.[game.honorClaimId])
    E.claimHonors(profile,game,game.honorClaimId);
  if (!saveProfile(profile)) return;
  game.honorsClaimed=true;
  save();
}
// The existing rewards and personal honors share the same idempotent claim key.
function claimReward() {
  if (game.mode === 'scenario') return; // Scenario runs do not alter the persistent profile in stage one.
  if (!game.over || game.rewardClaimed) return;
  // Persist the claim identity before touching the profile, so a failed operation-save
  // after a successful profile write can recover without paying twice.
  // Derived from the finished game itself (its seed advances with every random roll), so a reload of an older save
  // that replays to the same result finds the same claim and never pays twice, even if the operation save failed.
  game.rewardClaimId ||= `${game.mode}:${game.player}:${game.campaign?.id || game.era || 'world'}:${game.difficulty || ''}:${game.turn}:${game.seed}`;
  // Best effort: a full browser store must not withhold the reward; the profile records the claim either way.
  save();
  const p = loadProfile(), claims = (p.rewardClaims ||= {}), prior = claims[game.rewardClaimId];
  if (prior) {
    if (!p.honorClaims?.[game.rewardClaimId]) {
      E.claimHonors(p, game, game.rewardClaimId);
      if (!saveProfile(p)) return false;
    }
    game.reward = prior.reward;
    if (prior.eliteReward) game.eliteReward = prior.eliteReward;
    if (prior.storyEliteUnlocked) game.storyEliteUnlocked = prior.storyEliteUnlocked;
    game.rewardClaimed = true;
    undoStack = [];
    save();
    return true;
  }
  E.claimHonors(p, game, game.rewardClaimId);
  if (game.mode === 'campaign') {
    const CP = E.campaign,
      id = game.campaign.id,
      r = CP.reward(game, p);
    p.tokens = (p.tokens || 0) + r.total;
    if (game.over.winner === game.player) {
      const legacyBest = CP.best(p, id),
        difficultyRecords = (p.campaignDifficulty ||= {});
      // Migrate old campaign progress once: pre-difficulty stars belong to Normal.
      if (!difficultyRecords[id]) difficultyRecords[id] = { normal: legacyBest };
      const byDifficulty = difficultyRecords[id],
        diff = game.difficulty || 'normal';
      byDifficulty[diff] = Math.max(byDifficulty[diff] || 0, r.stars);
      (p.campaign ||= {})[id] = Math.max(legacyBest, r.stars);
      // 3★ awards 10 fragments to one eligible Elite of the difficulty's rarity.
      // New 2★ results never award fragments. There are no mass-faction drops.
      if (r.fragmentChoice)
        queueEliteReward(p, game, `story:${id}:${diff}`, r.fragmentChoice, 'Story Mode 3★');
      delete game.eliteReward;
      // Campaign milestone rewards are once-only and live in the persistent profile.
      if (r.milestones?.length) {
        const cid = CP.mission(id)?.campaign,
          claimed = ((p.campaignMilestones ||= {})[cid] ||= {});
        for (const milestone of r.milestones) claimed[milestone] = true;
      }
    }
    game.reward = r;
  } else if (game.over.winner === game.player) {
    const r = E.missionReward(game, p.wins || 0, p.cleared || {});
    delete game.eliteReward;
    if (!r.repeat) {
      queueEliteReward(p, game, `conquest:${E.operationKey(game)}`,
        game.difficulty === 'elite' ? 30 : 20, 'Conquest victory');
      p.tokens = (p.tokens || 0) + r.total;
      p.wins = (p.wins || 0) + 1;
      (p.cleared ||= {})[E.operationKey(game)] = true;
    }
    game.reward = r;
  }
  // Pass progress is distinct from the once-per-era/faction/difficulty token reward.
  if (game.mode === 'conquest' && game.over?.winner === game.player)
    challengePassRecordVictory(p, game);
  claims[game.rewardClaimId] = { reward: game.reward || null, eliteReward: game.eliteReward || null };
  if (!saveProfile(p)) {
    toast('Rewards are pending because command records could not be saved. Keep this operation and retry its result screen.', true);
    return false;
  }
  game.rewardClaimed = true;
  undoStack = [];
  save();
  return true;
}
function resultDialog() {
  if (!game.over) return;
  E.finalizeHonors(game);
  militaryPresentation.resultSound();
  if (game.mode === 'scenario') {
    if (!game.over) return;
    claimScenarioHonors();
    const won=game.over.winner===game.player;
    const lost=!!game.over.eliminated;
    const weeklyResult=game.weeklyScenario && won ? claimWeeklyScenarioReward(game) : null;
    if (weeklyResult && !weeklyResult.ok && !weeklyResult.expired) {
      toast(weeklyResult.reason, true);
      return;
    }
    let campaignNotice='';
    if (game.warCampaign) {
      if (won && !game.warCampaign.recorded) {
        const result=KnightmareWarCampaign.recordVictory(localStorage,game);
        if(result.ok){
          const hqReward = claimWarCampaignHQReward(result);
          if (hqReward && !hqReward.ok) { toast(hqReward.reason, true); return; }
          game.warCampaign.hqReward = hqReward;
          game.warCampaign.recorded=true;
          const name=KnightmareWarCampaign.ALL[game.warCampaign.missionId]?.title || game.scenario.title;
          campaignNotice=name+' secured for '+E.FACTIONS[game.warCampaign.faction].name+'.'+
            (result.unlocked?' Tier '+result.unlocked+' unlocked.':'')+
            (result.complete?' Campaign complete.':'')+
            (result.complete&&game.warCampaign.missionId==='eu-pendragon'?' E.U. Campaign Victory! The Holy Britannian Empire has fallen.':'')+
            (game.warCampaign.missionId==='britannia-western-russia'?' Euro Britannia Established. European War unlocked.':'');
          game.warCampaign.announcement=campaignNotice;
          save();
        }else campaignNotice=result.reason;
      }else campaignNotice=game.warCampaign.announcement || '';
    }
    const euFinal=won && game.warCampaign?.recorded && game.warCampaign.missionId==='eu-pendragon';
    const founded=won && game.warCampaign?.recorded &&
      game.warCampaign.missionId==='britannia-western-russia';
    modal.innerHTML='<div class="overlay"><section class="dialog narrow military-result-dialog'+(euFinal?' wc-imperial-victory':'')+'" role="dialog" aria-modal="true" aria-label="Scenario result">'+
      militaryPresentation.resultHero('scenario',{title:game.scenario?.title||'Regional scenario'})+
      '<div class="eyebrow">'+esc(game.scenario?.title || 'Scenario')+'</div><h2>'+(euFinal?'E.U. Campaign Victory':founded?'Euro Britannia Established':won?'Victory':lost?'Defeat':'Scenario concluded')+'</h2>'+
      (euFinal?'<p class="wc-imperial-subtitle">The Imperial Capital Has Fallen · Europia United Triumphant</p>':'')+
      '<p>'+esc(game.over.reason)+'</p>'+
      honorsEarnedHTML()+
      militaryPresentation.summaryHTML()+
      (game.weeklyScenario ? weeklyScenarioResultHTML(won ? weeklyResult : {ok:false,reason:'Victory is required to earn weekly rewards.'}) + (won ? pendingEliteChoiceHTML() : '') :
      game.warCampaign ? '<p class="description">'+esc(campaignNotice || 'Campaign battles grant territory and unlock new tiers.')+'</p>'+
        (game.warCampaign.hqReward?.tokens ? '<div class="reward"><b>+'+game.warCampaign.hqReward.tokens+' command tokens</b> · World Campaign rewards</div>' : '')+pendingEliteChoiceHTML() :
        '<p class="description">Standalone scenarios award personal honors only; no HQ tokens or Elite fragments.</p>')+
      '<div class="dialog-footer"><button data-action="close">Inspect map</button>'+
      (game.warCampaign?'<button class="primary" data-action="wc-return">Campaign map</button>':
        '<button class="primary" data-action="scenario">Play again</button>')+'</div>'+
      '</section></div>';
    focusDialog();
    return;
  }
  claimReward();
  if (game.mode === 'campaign') return missionResult();
  const win = game.over.winner === game.player,
    draw = game.over.winner === 'draw';
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow military-result-dialog" role="dialog" aria-modal="true" aria-label="Operation result">${militaryPresentation.resultHero('conquest')}<div class="eyebrow">${win ? 'Operation successful' : draw ? 'Draw' : 'Operation ended'}</div><h2>${win ? (game.era === 'ufn2018' ? 'Your coalition triumphs.' : 'The world bows.') : draw ? 'An uneasy peace.' : 'The last order.'}</h2><p>${game.over.reason}</p>${honorsEarnedHTML()}${game.eliteReward && Object.keys(game.eliteReward).length ? `<div class="reward"><span class="label">Elite fragments recovered</span><small>${Object.entries(game.eliteReward).map(([k,v]) => `${E.TYPES[E.ELITE_FORCES[k].type].name} +${v}`).join(' · ')}</small></div>` : ''}${pendingEliteChoiceHTML()}${challengePassResultHTML()}${game.reward ? (game.reward.repeat ? `<div class="reward"><span class="label">No command tokens</span><small>Tokens are paid only for the first victory at each difficulty. Try ${game.difficulty === 'challenge' ? 'another faction' : 'a harder difficulty'} for more.</small></div>` : `<div class="reward"><span class="label">Command tokens earned</span><b>${ICONS.use('token', 'cost-ico')} +${game.reward.total}</b><small>${game.reward.parts.map(([k, v]) => (v ? `${k} +${v}` : k)).join(' · ')}</small></div>`) : ''}<p class="description">Decorations enter permanent personal service records. Spend command tokens on HQ research and on your commanders in HQ → Commanders.</p>${militaryPresentation.summaryHTML()}<div class="dialog-footer"><button data-action="close">Inspect the map</button><button data-action="research">HQ research</button><button class="primary" data-action="new">New operation</button></div></section></div>`;
  focusDialog();
}

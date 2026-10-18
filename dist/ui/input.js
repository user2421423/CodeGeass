/* Knightmare Conquest UI: Keyboard and button handling, and the WebMCP tools. */
'use strict';
let helpBack = 'game';
document.addEventListener('change', e => {
  if (uiActionBusy || gameAssetTask) return;
  const id = e.target.id;
  if (id === 'conquest-select') {
    setup.conquest = E.CONQUESTS[e.target.value] ? e.target.value : 'world';
    if (!E.CONQUESTS[setup.conquest].selectable.includes(setup.side)) setup.side = E.CONQUESTS[setup.conquest].selectable[0];
    startMenu();
    return;
  }
  if (id === 'difficulty-select') {
    setup.difficulty = e.target.value;
    startMenu();
    $('difficulty-select')?.focus();
  }
  if (id === 'scenario-difficulty') {
    scenarioDifficulty = E.DIFFICULTIES[e.target.value] ? e.target.value : 'normal';
    scenarioDialog();
    $('scenario-difficulty')?.focus();
    return;
  }
  if (id === 'mission-difficulty-select') {
    missionDifficulty = E.campaign?.DIFFICULTIES?.[e.target.value] ? e.target.value : 'normal';
    if (missionBriefingId) briefingDialog(missionBriefingId);
    $('mission-difficulty-select')?.focus();
  }
  if (id === 'stack-select') {
    shop.stack = +e.target.value;
    openShop(shop.station);
  }
  if (e.target.dataset.cityUnit) {
    undoStack = [];
    invalidateUIState();
    E.setCityAutomation(game, +e.target.dataset.cityUnit, { unit: e.target.value || null });
    save();
    updateSelection();
  }
  if (e.target.dataset.automationField) {
    undoStack = [];
    invalidateUIState();
    const a = E.automationState(game),
      field = e.target.dataset.automationField;
    if (field === 'enabled' || field === 'autoUpgrade') a[field] = e.target.checked;
    else if (field === 'stack') a.stack = Math.max(1, Math.min(3, +e.target.value || 1));
    E.automationState(game);
    save();
    productionDialog();
  }
  if (e.target.dataset.automationReserve) {
    undoStack = [];
    invalidateUIState();
    const a = E.automationState(game),
      key = e.target.dataset.automationReserve;
    a.reserve[key] = Math.max(0, Math.floor(+e.target.value || 0));
    E.automationState(game);
    save();
    productionDialog();
  }
});
document.addEventListener('click', e => {
  if (uiActionBusy || gameAssetTask) return;
  // Clicking a game-mode card activates the same command as its existing
  // button. Resume and other nested controls retain their own behaviors.
  const modeCard = e.target.closest('.start-mode[data-open-mode]');
  if (modeCard && !e.target.closest('button, a, input, select, textarea')) {
    modeCard.querySelector('button[data-action="' + modeCard.dataset.openMode + '"]')?.click();
    return;
  }
  const portrait = e.target.closest('[data-general]');
  if (portrait && !e.target.closest('button')) {
    generalDialog(portrait.dataset.general, portrait.dataset.personal === '1');
    return;
  }
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.rewardOpen !== undefined) {
    openEliteRewardBox(d.rewardOpen, b);
    return;
  }
  if (d.rewardElite) {
    const result = selectEliteReward(d.rewardElite, d.rewardKey ?? null);
    if (!result.ok) { toast(result.reason); return; }
    const pane = modal.querySelector('[data-elite-choice-panel]');
    if (pane) pane.outerHTML = pendingEliteChoiceHTML() || '<div class="reward">All pending Elite fragment rewards claimed.</div>';
    if (game.over) { undoStack = []; save(); }
    toast(`+${result.amount} fragments awarded to ${E.TYPES[E.ELITE_FORCES[result.id].type].name}.`);
    return;
  }
  if (d.action === 'tutorial-start' || d.action === 'tutorial-hub') { tutorialHub(); return; }
  if (d.action === 'tutorial-hub-close') { startMenu(); return; }
  if (d.action === 'tutorial-basic') { tutorialStart(); return; }
  if (d.tutorialLab) { labStart(d.tutorialLab); return; }
  if (d.tutorialAnswer !== undefined) { labAnswer(+d.tutorialAnswer); return; }
  if (d.tutorialOp) { labAction(d.tutorialOp); return; }
  if (d.action === 'tutorial-restart') { if (tutorialState?.lab) labStart(tutorialState.lab); else tutorialStart(); return; }
  if (d.action === 'tutorial-begin') { tutorialStep(1); return; }
  if (d.action === 'tutorial-focus') { tutorialFocus(); return; }
  if (d.action === 'tutorial-exit') { tutorialExit(); return; }
  if (typeof isTutorial === 'function' && isTutorial()) {
    if (tutorialState?.lab) {
      if (!labAllowButton(d)) { toast('Follow the current training objective.'); return; }
    } else {
    const step = tutorialState?.step;
    const system = ['zoom-in', 'zoom-out', 'fit', 'home', 'toggle-minimap', 'toggle-objective',
      'sound', 'mobile-unit-toggle', 'menu', 'help', 'help-close', 'close', 'new'].includes(d.action);
    const lesson = (step === 4 && d.action === 'end') ||
      (step >= 6 && d.station !== undefined) ||
      (step === 7 && (d.shop !== undefined || d.branch || d.recruit !== undefined)) ||
      (step === 8 && (d.admiral || ['assign', 'admirals'].includes(d.action)));
    if (!system && !lesson) { toast('Finish the current tutorial objective before using that command.'); return; }
    }
  }
  if (d.action === 'challenge-pass') { CHALLENGE_PASS.enter(); return; }
  if (d.action === 'challenge-pass-close') { CHALLENGE_PASS.close(); return; }
  if (d.challengeTab) { CHALLENGE_PASS.open(d.challengeTab, true); return; }
  if (d.challengeClaim) {
    const r = CHALLENGE_PASS.claimObjective(d.challengeClaim);
    if (!r.ok) toast(r.reason); else { toast('+' + r.cp + ' Challenge Points claimed.'); CHALLENGE_PASS.open(undefined, true); }
    return;
  }
  if (d.challengeMilestone) {
    const r = CHALLENGE_PASS.claimMilestone(Number(d.challengeMilestone));
    if (!r.ok) toast(r.reason); else { toast('Challenge Pass milestone claimed: ' + r.item.at + ' CP.'); CHALLENGE_PASS.open('rewards', true); }
    return;
  }
  if (d.challengeEquip) {
    const r = CHALLENGE_PASS.equipCosmetic(d.challengeEquip);
    if (!r.ok) toast(r.reason); else CHALLENGE_PASS.open('rewards', true);
    return;
  }
  if (d.faction) {
    setup.side = d.faction;
    startMenu();
    return;
  }
  if (d.station) {
    selectStation(+d.station);
    return;
  }
  if (d.site) {
    selectSite(+d.site);
    return;
  }
  if (d.refine) {
    doAction(() => E.refine(game, +d.refine));
    return;
  }
  if (d.project) {
    doAction(() => E.startProject(game, +d.project));
    const s = game.stations.find(s => s.id === +d.project);
    if (s?.project) toast(`F.L.E.I.J.A. warhead under way in ${s.name}: ready on turn ${s.project.ready}. Every power has been alerted.`, true);
    return;
  }
  if (d.eliminator) {
    doAction(() => E.startEliminator(game, +d.eliminator));
    const s = game.stations.find(s => s.id === +d.eliminator);
    if (s?.eliminatorProject)
      toast(`F.L.E.I.J.A. Eliminator under way in ${s.name}: ready on turn ${s.eliminatorProject.ready}.`, true);
    return;
  }
  // Eliminator carriers: a city hands its waiting charge to a unit, or a carrier hands it on.
  if (d.eliminatorGive) {
    const [city, unit] = d.eliminatorGive.split(':').map(Number);
    doAction(() => E.transferEliminator(game, { city }, { unit }));
    const u = game.units.find(v => v.id === unit);
    if (u?.eliminator > 0) toast(`${carrierName(u)} now carries the F.L.E.I.J.A. Eliminator: it protects ${E.ELIMINATOR.range} hexes around the unit.`, true);
    return;
  }
  if (d.eliminatorTo) {
    const [from, kind, id] = d.eliminatorTo.split(':'),
      to = kind === 'city' ? { city: +id } : { unit: +id };
    closeModal();
    doAction(() => E.transferEliminator(game, { unit: +from }, to));
    const holder = kind === 'city' ? game.stations.find(s => s.id === +id) : game.units.find(v => v.id === +id);
    if (holder?.eliminator > 0) toast(`F.L.E.I.J.A. Eliminator handed to ${kind === 'city' ? holder.name : carrierName(holder)}.`, true);
    return;
  }
  if (d.command) {
    const u = selectedUnit();
    closeModal();
    if (u) doAction(() => {
      const result = E.feint(game, u.id, +d.command);
      if (result?.ok) E.suspendArmyGroupConquestUnit(game, u.id);
      return result;
    });
    return;
  }
  if (d.launch) {
    const [c, r] = d.launch.split(',').map(Number);
    launchAt({ c, r });
    return;
  }
  if (d.shop) {
    openShop(+d.shop, (shop.branch === NAVAL_TAB || shop.branch === ELITE_NAVAL_TAB) ? BRANCH_LIST[0] : shop.branch);
    return;
  }
  if (d.shopPort) {
    openShop(+d.shopPort, NAVAL_TAB);
    return;
  }
  if (d.port) {
    selectPort(+d.port, true);
    return;
  }
  if (d.branch) {
    openShop(shop.station, d.branch);
    return;
  }
  if (d.build) {
    doAction(() => E.build(game, +d.stationId, d.build));
    return;
  }
  if (d.archiveBranch) {
    archiveDialog(d.archiveBranch);
    return;
  }
  if (d.archiveSide) {
    archiveDialog('Infantry', d.archiveSide);
    return;
  }
  if (d.eliteSide) {
    eliteDialog(d.eliteSide);
    return;
  }
  if (d.eliteDeploy) {
    const p = loadProfile(),
      r = E.deployElite(game, shop.station, d.eliteDeploy, p);
    if (r.ok) {
      selection = { kind: 'unit', id: r.unit.id };
      closeModal();
      refreshAndSave();
      toast(`${E.TYPES[r.unit.type].name} deploys. It will be ready next turn.`);
    } else toast(r.reason);
    return;
  }
  if (d.deploy !== undefined) {
    chooseCarrierCargo(Number(d.deploy));
    return;
  }
  if (d.recruit) {
    const r = E.recruit(game, shop.station, d.recruit, E.TYPES[d.recruit].naval === 'ship' ? 1 : shop.stack);
    if (r.ok) {
      selection = { kind: 'unit', id: r.unit.id };
      closeModal();
      refreshAndSave();
      toast(`${E.TYPES[d.recruit].name} rolls out. It will be ready next turn.`);
    } else toast(r.reason);
    return;
  }
  if (d.bulkBuild) {
    undoStack = [];
    const r = E.bulkCityUpgrade(game, game.player, d.bulkBuild);
    if (r.reason) toast(r.reason);
    else {
      render();
      save();
      productionDialog();
      toast(r.upgrades ? `AUTOMATED LOGISTICS — ${automationReportText(r)}` : 'No eligible city could be upgraded without crossing the reserve.');
    }
    return;
  }
  if (d.researchBranch) {
    researchDialog(d.researchBranch);
    return;
  }
  if (d.research) {
    const p = loadProfile(),
      r = E.research(p, d.research);
    if (r.ok) {
      saveProfile(p);
      // In an operation the new technology applies at once; from the start menu it applies to the next launch.
      if (researchBack !== 'start' && game.mode !== 'scenario') {
        E.applyTech(game, p.research);
        undoStack = [];
        render();
        save();
      }
      researchDialog();
      toast(`${E.TECH_NODES[d.research].name} ${E.ROMAN[r.level]} researched.`);
    } else toast(r.reason);
    return;
  }
  if (b.getAttribute('aria-disabled') === 'true') return;
  if (d.eliteUpgrade) {
    const p = loadProfile(),
      r = E.upgradeElite(p, d.eliteUpgrade);
    if (!r.ok) {
      toast(r.reason);
      return;
    }
    saveProfile(p);
    if (eliteBack === 'game' && game.mode !== 'scenario') {
      E.applyElites(game, p);
      undoStack = [];
      render();
      save();
    }
    const name = E.TYPES[E.ELITE_FORCES[d.eliteUpgrade].type].name;
    eliteDialog();
    toast(`${name} is now Elite Lv.${r.level}.`);
    return;
  }
  // HQ orders work on the profile; inside an operation, your commanders there are refreshed at once.
  const hqOrder =
    (d.recruitAdmiral && (p => E.recruitCommander(p, d.recruitAdmiral))) ||
    (d.buyStar && (p => E.buyStar(p, d.officer, d.buyStar))) ||
    (d.buyGeneric && (p => E.buyGeneric(p, d.officer, d.buyGeneric))) ||
    (d.removeGeneric && (p => E.removeGeneric(p, d.officer, d.removeGeneric))) ||
    (d.promote && (p => E.promote(p, d.promote))) ||
    (d.retireCommission && (p => E.retireCommission(p, d.retireCommission))) ||
    (d.upgradeCommission && (p => E.upgradeCommission(p, d.upgradeCommission))) ||
    (d.expandHighCommand && (p => E.expandHighCommand(p)));
  if (hqOrder) {
    const p = loadProfile(),
      r = hqOrder(p);
    if (!r.ok) {
      toast(r.reason);
      return;
    }
    saveProfile(p);
    if (hqBack === 'game') {
      E.applyRoster(game, p);
      undoStack = [];
      render();
      save();
    }
    if (generalOpen) generalDialog(generalOpen.k, generalOpen.personal);
    else generalsDialog();
    const k = d.recruitAdmiral || d.officer || d.promote || d.retireCommission || d.upgradeCommission,
      name = k ? C(k).short : 'HQ';
    toast(
      d.recruitAdmiral
        ? `${C(k).name} joins your commanders.`
        : d.buyStar
          ? `${name}: ${r.stars}★ ${E.BRANCH_NAMES[d.buyStar]}.`
          : d.buyGeneric
            ? `${name}: ${E.GENERIC_SKILLS[d.buyGeneric].name} Lv.${r.level}.`
            : d.removeGeneric
              ? `${name}: ${E.GENERIC_SKILLS[d.removeGeneric].name} replaced; ${r.netRefund >= 0 ? '+' : ''}${r.netRefund} tokens net (90% refund, 40-token fee).`
          : d.promote
            ? `${name} promoted to ${E.RANKS[r.rank]}.`
            : d.retireCommission
              ? `${name} retired from High Command; ${r.refund} tokens refunded.`
              : d.upgradeCommission
                ? `${name} upgraded to ${E.commissionName(r.commission)} Commission.`
                : d.expandHighCommand
                  ? `High Command expanded to ${r.capacity} seats.`
            : `${name}'s HQ record updated.`,
    );
    return;
  }
  if (d.action === 'honors') { honorsHall(); return; }
  if (d.action === 'honors-close') { generalsDialog(); return; }
  if (d.generalOpen) {
    generalDialog(d.generalOpen, true);
    return;
  }
  if (d.generalsSide) {
    generalsDialog(d.generalsSide);
    return;
  }
  if (d.scenarioWeekly) {
    scenarioWeeklySelected=true;
    scenarioKind=weeklyScenarioCurrent().scenarioId;
    scenarioSide=scenarioModel()?.sides?.[0] || 'britannia';
    scenarioDialog();return;
  }
  if (d.scenarioKind) {
    scenarioWeeklySelected=false;
    scenarioKind=d.scenarioKind;
    scenarioSide='britannia';
    scenarioDialog();return;
  }
  if (d.scenarioFaction) { scenarioSide=d.scenarioFaction; scenarioDialog(); return; }
  if (d.armyOverlay) { if (d.armyOverlay === 'toggle') toggleStrategicOverlay(); else setStrategicOverlayMode(d.armyOverlay); return; }
  if (d.armyOrganize) {
    const r=E.organizeScenarioArmies(game);
    if(!r.ok)toast(r.reason);
    else {refreshAndSave();armyGroupsDialog();toast(r.assigned+' formations organized into '+r.created+' groups.'+(r.remaining?' '+r.remaining+' remain unassigned.':''));}
    return;
  }
  if (d.armyBulk) {
    const r=E.bulkArmyGroupOrder(game,d.armyBulk);
    if(!r.ok)toast(r.reason);
    else {refreshAndSave();armyGroupsDialog();toast(d.armyBulk==='hold'?'All groups are holding position.':r.changed+' armies ordered to capture remaining cities. Execute with Do all orders now or at turn start.');}
    return;
  }
  if (d.armyEdit) { armyGroupsDialog(+d.armyEdit); return; }
  if (d.armyActivate !== undefined) { armyGroupActivate(d.armyActivate ? +d.armyActivate : null); return; }
  if (d.armyAddSelection) { armyGroupAddSelection(+d.armyAddSelection); return; }
  if (d.armyStance) {
    const [id, stance] = d.armyStance.split(':');
    armyGroupSetStance(+id, stance);
    return;
  }
  if (d.armyConquer) {
    const id = +d.armyConquer, gr = E.armyGroup(game, id);
    const r = E.setArmyGroupConquest(game, id, !gr?.autoConquer);
    if (!r.ok) toast(r.reason);
    else { E.planArmyGroupConquest(game, game.player); refreshAndSave(); armyGroupsDialog(id); }
    return;
  }
  if (d.armyRoute) { armyGroupStartRouting(+d.armyRoute); return; }
  if (d.armyFocus) { armyGroupFocus(+d.armyFocus); return; }
  if (d.armyNearby) { armyGroupAddNearby(+d.armyNearby); return; }
  if (d.armyAdd || d.armyRemove) {
    const [groupId, unitId] = (d.armyAdd || d.armyRemove).split(':').map(Number);
    const result = d.armyAdd ? E.addArmyGroupUnit(game, groupId, unitId) : E.removeArmyGroupUnit(game, groupId, unitId);
    if (result.ok) {
      refreshAndSave();
      armyGroupsDialog(groupId);
      toast(d.armyAdd ? 'Knightmare assigned to army group.' : 'Knightmare removed from army group.');
    } else toast(result.reason);
    return;
  }
  if (d.armyCancel) {
    const result = E.cancelArmyGroup(game, +d.armyCancel);
    if (result.ok) { refreshAndSave(); armyGroupsDialog(+d.armyCancel); }
    else toast(result.reason);
    return;
  }
  if (d.armyDisband) {
    const result = E.disbandArmyGroup(game, +d.armyDisband);
    if (result.ok) { if (activeArmyGroupId === +d.armyDisband) activeArmyGroupId = null; refreshAndSave(); armyGroupsDialog(); toast('Army group disbanded.'); }
    else toast(result.reason);
    return;
  }
  if (d.scenarioGroupImport) { scenarioGroupImport(d.scenarioGroupImport); return; }
  if (d.scenarioGroupRoute) { scenarioGroupStart(d.scenarioGroupRoute); return; }
  if (d.scenarioGroupFocus) { scenarioGroupFocus(d.scenarioGroupFocus); return; }
  if (d.campaignTab) return campaignDialog(d.campaignTab);
  if (d.mission) return briefingDialog(d.mission);
  if (d.startMission) return confirmReplace(CAMPAIGN_KEY, 'campaign', () => startMission(d.startMission));
  if (d.admiral) {
    const u = selectedUnit(),
      r = u ? E.assign(game, u.id, d.admiral) : { ok: false, reason: 'Select a unit first.' };
    if (r.ok) {
      closeModal();
      refreshAndSave();
      toast(`${C(d.admiral).short} takes command.`);
    } else toast(r.reason);
    return;
  }
  if (d.action?.startsWith('war-report-turn-')) {
    warReportDialog('latest', Number(d.action.slice('war-report-turn-'.length)));
    return;
  }
  switch (d.action) {
    case 'turn-report-open':
      dismissTurnSummary();
      warReportDialog('latest', summaryTurn);
      break;
    case 'turn-report-dismiss':
      dismissTurnSummary(); break;
    case 'political-report-dismiss':
      dismissPoliticalReport(); break;
    case 'war-report-notifications':
      warReportDialog('notifications'); break;
    case 'war-report':
    case 'war-report-latest':
      warReportDialog('latest'); break;
    case 'war-report-history':
      warReportDialog('history'); break;
    case 'war-report-statistics':
      warReportDialog('statistics'); break;
    case 'details':
      if (selectedUnit()) {
        carrierHoldOpen = null;
        detailOpen = false;
      } else if (selectedStation() || selectedSite() || selectedPort()) {
        detailOpen = !detailOpen;
      } else {
        detailOpen = false;
      }
      updateSelection();
      break;
    case 'scenario':
      scenarioDialog();
      break;
    case 'scenario-armies':
      scenarioGroupsDialog();
      break;
    case 'scenario-close':
      startMenu();
      break;
    case 'start-scenario':
      confirmReplace(scenarioWeeklySelected ? WEEKLY_SCENARIO_KEY : SCENARIO_KEY, 'scenario', () => startScenario());
      break;
    case 'continue-weekly-scenario':
      if (weeklyScenarioSavedGame()) resumeSavedGame(WEEKLY_SCENARIO_KEY);
      else { toast('There is no active weekly operation to continue.'); scenarioDialog(); }
      break;
    case 'continue-scenario':
      resumeSavedGame(SCENARIO_KEY);
      break;
    case 'continue-world-campaign':
      resumeSavedGame(WAR_CAMPAIGN_BATTLE_KEY);
      break;
    case 'start-conquest':
      confirmReplace(chosenSaveKey(), 'new', newGame);
      break;
    case 'replace-confirm': {
      const then = pendingReplace;
      pendingReplace = null;
      then?.();
      break;
    }
    case 'continue':
      resumeSavedGame(chosenSaveKey());
      break;
    case 'continue-mission':
      resumeSavedGame(CAMPAIGN_KEY);
      break;
    case 'campaign':
      campaignDialog();
      break;
    case 'campaign-close':
      startMenu();
      break;
    case 'briefing':
      briefingDialog(game.campaign.id, true);
      break;
    case 'mission-retry': {
      const id = game.campaign.id,
        difficulty = game.difficulty || 'normal';
      confirmReplace(CAMPAIGN_KEY, 'close', () => startMission(id, difficulty));
      break;
    }
    case 'talk-next':
    case 'talk-skip':
      talkNext(d.action === 'talk-skip');
      break;
    case 'new':
      startMenu();
      break;
    case 'close':
      closeModal();
      break;
    case 'help':
      helpBack = modal.querySelector('[aria-label="Operation setup"]') ? 'start' : 'game';
      helpDialog();
      break;
    case 'help-close':
      if (helpBack === 'start') startMenu();
      else closeModal();
      break;
    case 'menu':
      // System → Main Menu skips the old intermediary dialog. Preserve the
      // current operation's resume slot before leaving the battlefield.
      save();
      startMenu();
      break;
    case 'powers':
      powersDialog();
      break;
    case 'production':
      productionDialog();
      break;
    case 'automation-clear-cities': {
      undoStack = [];
      invalidateUIState();
      E.automationState(game).cities = {};
      save();
      productionDialog();
      toast('All city auto-production queues cleared.');
      break;
    }
    case 'automation-fleija-reserve': {
      undoStack = [];
      invalidateUIState();
      const a = E.automationState(game);
      a.reserve.credits = E.FLEIJA.cost.credits;
      a.reserve.industry = E.FLEIJA.cost.industry;
      a.reserve.sakuradite = E.FLEIJA.cost.sakuradite;
      save();
      productionDialog();
      toast('Protected reserve set to one F.L.E.I.J.A. warhead budget.');
      break;
    }
    case 'automation-run': {
      undoStack = [];
      const r = E.runCityAutomation(game, game.player, { force: true });
      render();
      save();
      productionDialog();
      toast(r.units || r.upgrades ? `AUTOMATED LOGISTICS — ${automationReportText(r)}` : 'Configured production made no purchases; city rules or reserves blocked every order.');
      break;
    }
    case 'next':
      nextFleet();
      break;
    case 'undo':
      undoMove();
      break;
    case 'sound':
      toast(SFX.toggle() ? 'Sound on.' : 'Sound off.');
      render();
      break;
    case 'elite-forces':
      eliteBack = 'game';
      eliteDialog(game.player === 'bk' || game.player === 'jlf' ? 'black_knights' : game.player === 'eb' ? 'britannia' : game.player);
      break;
    case 'elite-forces-start':
      eliteBack = 'start';
      eliteDialog(setup.side);
      break;
    case 'elite-close':
      if (eliteBack === 'start') startMenu();
      else closeModal();
      break;
    case 'research':
      researchBack = modal.querySelector('[aria-label="Operation setup"]')
        ? 'start'
        : modal.querySelector('[aria-label="Operation result"]')
          ? 'result'
          : 'game';
      researchDialog();
      break;
    case 'research-close':
      if (researchBack === 'start') startMenu();
      else if (researchBack === 'result') resultDialog();
      else closeModal();
      break;
    case 'general-close':
      if (hqBack === 'start') generalsDialog();
      else closeModal();
      break;
    case 'generals':
      generalsDialog(hqBack === 'game' ? game.player : generalsSide);
      break;
    case 'generals-start':
      hqBack = 'start';
      generalsDialog(setup.side);
      break;
    case 'generals-close':
      if (hqBack === 'start') startMenu();
      else closeModal();
      break;
    case 'carrier-deploy':
      toggleCarrierDeployment();
      break;
    case 'admirals':
    case 'assign':
      admiralDialog();
      break;
    case 'archive':
      archiveBack = 'game';
      archiveDialog('Infantry', game.player);
      break;
    case 'archive-start':
      archiveBack = 'start';
      archiveDialog('Infantry', setup.side);
      break;
    case 'archive-close':
      if (archiveBack === 'start') startMenu();
      else closeModal();
      break;
    case 'end':
      endTurn();
      break;
    case 'fleija':
      strikeMode = !strikeMode && interactive();
      render();
      toast(strikeMode ? 'Choose a target hex for the F.L.E.I.J.A. warhead. Escape cancels.' : 'Launch cancelled.');
      break;
    case 'feint': {
      const u = selectedUnit();
      if (u && (['command','designate','stratagem'].includes(C(u.cmd)?.action?.kind)||['marrybell','kate','gaohai','chengzhong','huangqian','sugiyama','kirihara','indira'].includes(u.cmd))) commandDialog(u);
      else if (u) doAction(() => E.feint(game, u.id));
      break;
    }
    case 'reinforce': {
      const u = selectedUnit();
      if (u) doAction(() => E.reinforce(game, u.id));
      break;
    }
    case 'repair': {
      const u = selectedUnit();
      if (u) doAction(() => E.repair(game, u.id));
      break;
    }
    case 'eliminator-handover':
      eliminatorHandoverDialog(selectedUnit());
      break;
    case 'do-all-orders':
      executeAllOrdersNow();
      break;
    case 'army-groups':
      armyGroupsDialog();
      break;
    case 'army-create':
      armyGroupCreate();
      break;
    case 'goto':
      startRouting();
      break;
    case 'goto-cancel': {
      const u = selectedUnit();
      if (u && u.side === game.player && interactive() && E.clearGoto(game, u.id).ok) {
        E.suspendArmyGroupConquestUnit(game, u.id);
        routing = null;
        refreshAndSave();
        toast('Auto-move stopped: the unit will not move on its own next turn.');
      }
      break;
    }
    case 'wait': {
      const u = selectedUnit();
      if (u && u.side === game.player && interactive() && !u.attacked) {
        E.suspendArmyGroupConquestUnit(game, u.id);
        u.moved = u.attacked = true;
        refreshAndSave();
        nextFleet();
      }
      break;
    }
    case 'zoom-in':
      changeZoom(1.2);
      break;
    // Phone layout: the minimap and the objective are hidden until asked for (see mobile.css).
    // Both open in the same corner, so showing one hides the other.
    case 'toggle-minimap':
      document.documentElement.classList.remove('show-objective');
      document.documentElement.classList.toggle('show-minimap');
      minimapDirty = true;
      requestMapFrame();
      break;
    case 'toggle-objective':
      document.documentElement.classList.remove('show-minimap');
      document.documentElement.classList.toggle('show-objective');
      break;
    case 'zoom-out':
      changeZoom(1 / 1.2);
      break;
    case 'fit':
      zoom = ZOOM_MIN;
      break;
    case 'home':
      zoom = Math.max(zoom, homeZoom());
      centerOn(homeOf());
      break;
  }
});
// Clicking Launch and pressing 1/2 share one cargo-selection path.
function chooseCarrierCargo(index) {
  const u = selectedUnit();
  if (!interactive() || !u || u.side !== game.player || E.TYPES[u.type].naval !== 'ship') return;
  const why = Number.isInteger(index) && index >= 0
    ? E.deployReason(game, u, index) : 'Invalid cargo selection';
  if (why) { toast(why); return; }
  carrierHoldOpen = null;
  detailOpen = false;
  closeModal();
  deploying = { ship: u.id, index };
  updateSelection();
  toast('Choose a green land hex next to the carrier to launch.');
}
// Both the dock button and D use the same carrier deployment drawer.
function toggleCarrierDeployment() {
  const u = selectedUnit();
  if (!u || u.side !== game.player || E.TYPES[u.type].naval !== 'ship' || !interactive()) return;
  carrierHoldOpen = carrierHoldOpen === u.id ? null : u.id;
  detailOpen = false;
  updateSelection();
}
document.addEventListener('keydown', e => {
  if (uiActionBusy || gameAssetTask) { e.preventDefault(); return; }
  // Focused cards also support Enter/Space for keyboard-only play.
  const modeCard = e.target.closest('.start-mode[data-open-mode]');
  if (modeCard && e.target === modeCard && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    modeCard.querySelector('button[data-action="' + modeCard.dataset.openMode + '"]')?.click();
    return;
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset?.general) {
    e.preventDefault();
    generalDialog(e.target.dataset.general, e.target.dataset.personal === '1');
    return;
  }
  if (modal.children.length) {
    if (e.key.toLowerCase() === 'v' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey &&
        modal.querySelector('[aria-label="Army groups"]')) {
      e.preventDefault(); toggleStrategicOverlay(); return;
    }
    if (e.key === 'Tab') {
      const list = [...modal.querySelectorAll('button:not(:disabled),select,input:not(:disabled),a[href]')],
        first = list[0],
        last = list.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    if (e.key === 'Escape' && !modal.querySelector('[aria-label="Operation setup"]')) {
      if (modal.querySelector('[aria-label="Mission dialogue"]')) talkNext(true);
      else if (modal.querySelector('[aria-label="Story Mode"], [aria-label="World Campaign"], [aria-label="Scenario selection"]')) startMenu();
      else if (modal.querySelector('[data-back="campaign"]')) campaignDialog();
      else if (helpBack === 'start' && modal.querySelector('[aria-label="Field manual"]')) startMenu();
      else if (archiveBack === 'start' && modal.querySelector('[aria-label="Knightmare archive"]')) startMenu();
      else {
        const close = modal.querySelector('[data-action="research-close"],[data-action="elite-close"],[data-action="generals-close"],[data-action="general-close"]');
        if (close) close.click();
        else closeModal();
      }
    }
    return;
  }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'v' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.repeat &&
      (game.mode === 'conquest' || game.mode === 'scenario')) {
    e.preventDefault();
    toggleStrategicOverlay();
    return;
  }
  // Enter ends the turn; leave focused buttons and links to their native keyboard actions.
  if (k === 'enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey &&
      interactive() && !e.target.closest('button, a, summary, [role="button"], [contenteditable="true"]')) {
    e.preventDefault();
    if (!e.repeat) endTurn();
    return;
  }
  if (k === 'n') {
    e.preventDefault();
    nextFleet();
  }
  if (k === 'z') {
    e.preventDefault();
    undoMove();
  }
  const u = selectedUnit(),
    own = u && u.side === game.player && interactive() && !phaseReason();
  // After D opens the carrier hold, 1 selects the top cargo row and 2
  // selects the second row. No digit shortcuts apply outside this drawer.
  if ((k === '1' || k === '2') && !e.repeat &&
      !e.ctrlKey && !e.altKey && !e.metaKey &&
      own && E.TYPES[u.type].naval === 'ship' && carrierHoldOpen === u.id) {
    e.preventDefault();
    chooseCarrierCargo(Number(k) - 1);
    return;
  }
  if (k === 'd' && own && E.TYPES[u.type].naval === 'ship') {
    e.preventDefault();
    if (!e.repeat) toggleCarrierDeployment();
    return;
  }
  if (k === 'h' && own && !u.attacked) {
    e.preventDefault();
    u.moved = u.attacked = true;
    refreshAndSave();
    nextFleet();
    return;
  }
  if (k === 'a' && own && !u.cmd && E.TYPES[u.type].naval !== 'ship') {
    e.preventDefault();
    admiralDialog();
    return;
  }
  if (k === 'f' && own && !u.elite && !E.reinforceReason(game, u)) {
    e.preventDefault();
    doAction(() => E.reinforce(game, u.id));
    return;
  }
  if (k === 'r' && own && !E.repairReason(game, u)) {
    e.preventDefault();
    doAction(() => E.repair(game, u.id));
    return;
  }
  if (k === 'c' && own && (u.goto || routing === u.id)) {
    e.preventDefault();
    routing = null;
    if (u.goto) {
      if (E.clearGoto(game, u.id).ok) {
        E.suspendArmyGroupConquestUnit(game, u.id);
        refreshAndSave();
        toast('Auto-move stopped.');
      }
    } else {
      updateSelection();
      toast('Destination selection cancelled.');
    }
    return;
  }
  if (k === 'g') startRouting();
  if (k === 'escape' && armyGroupRouting) {
    armyGroupRouting = null;
    updateSelection();
    toast('Army group objective selection cancelled.');
    return;
  }
  if (k === 'escape' && scenarioRoutingGroup) {
    scenarioRoutingGroup=null;
    toast('Army-group destination selection cancelled.');
    return;
  }
  if (k === 'escape' && carrierHoldOpen != null) {
    carrierHoldOpen = null;
    detailOpen = false;
    updateSelection();
    return;
  }
  if (k === 'escape' && strikeMode) {
    strikeMode = false;
    render();
    toast('Launch cancelled.');
  } else if (k === 'escape' && routing) {
    routing = null;
    updateSelection();
    toast('Destination unchanged.');
  } else if (k === 'escape') {
    selection = null;
    updateSelection();
  }
  if (k === '+' || k === '=') changeZoom(1.2);
  if (k === '-') changeZoom(1 / 1.2);
  if (k === '0') zoom = ZOOM_MIN;
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const p = hover || selectedUnit() || selectedStation() || homeOf();
    if (!p) return;
    hover = E.tile(
      game,
      p.c + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0),
      E.clamp(p.r + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0), 0, game.rows - 1),
    );
    if (hover && !onScreen(hover)) centerOn(hover);
  }
  // Space takes over the map's old Enter-to-select shortcut.
  if (k === ' ' && document.activeElement === canvas) {
    e.preventDefault();
    if (!e.repeat) activateHex(hover);
  }
});
function classified(o) {
  const { eliminator, eliminatorProject, eliminatorMoved, ...rest } = o;
  if (rest.cargo) rest.cargo = rest.cargo.map(classified);
  return rest;
}
function registerTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const defs = [
    {
      name: 'read_world_war',
      description: 'Read the current world war: resources, units, cities, surrendered powers and whose turn it is.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => ({
        turn: game.turn,
        phase: game.phase,
        player: game.player,
        resources: game.economy[game.player],
        // Rival Eliminator charges, projects and carriers are classified.
        cities: game.stations.map(s => s.owner === game.player ? s : classified(s)),
        sakuraditeDeposits: game.sites || [],
        fleijaArsenal: game.arsenal || {},
        units: game.units.filter(u => u.hp > 0).map(u => u.side === game.player ? u : classified(u)),
        fallen: game.fallen,
        result: game.over,
      }),
    },
    {
      name: 'select_unit',
      description: 'Select a living Knightmare unit on the map and center the view on it. Does not move or attack.',
      inputSchema: {
        type: 'object',
        properties: { unitId: { type: 'integer' } },
        required: ['unitId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: input => {
        if (modal.children.length) throw new Error('Close the open dialog first.');
        if (!Number.isInteger(input.unitId) || !game.units.some(u => u.id === input.unitId && u.hp > 0))
          throw new Error('Invalid unit ID.');
        selectUnit(input.unitId, true);
        return { selectedUnitId: input.unitId };
      },
    },
  ];
  for (const t of defs) {
    try {
      Promise.resolve(context.registerTool(t)).catch(() => {});
    } catch (e) {}
  }
}

/* Knightmare Conquest UI: Keyboard and button handling, and the WebMCP tools. */
'use strict';
let helpBack = 'game';
document.addEventListener('change', e => {
  const id = e.target.id;
  if (id === 'difficulty-select') {
    setup.difficulty = e.target.value;
    startMenu();
    $('difficulty-select')?.focus();
  }
  if (id === 'mission-difficulty-select') {
    missionDifficulty = E.campaign?.DIFFICULTIES?.[e.target.value] ? e.target.value : 'normal';
    if (missionBriefingId) briefingDialog(missionBriefingId);
    $('mission-difficulty-select')?.focus();
  }
  if (id === 'fleet-select' && e.target.value) selectUnit(+e.target.value, true);
  if (id === 'station-select' && e.target.value) selectStation(+e.target.value, true);
  if (id === 'stack-select') {
    shop.stack = +e.target.value;
    openShop(shop.station);
  }
  if (e.target.dataset.cityUnit) {
    E.setCityAutomation(game, +e.target.dataset.cityUnit, { unit: e.target.value || null });
    save();
    updateSelection();
  }
  if (e.target.dataset.automationField) {
    const a = E.automationState(game),
      field = e.target.dataset.automationField;
    if (field === 'enabled' || field === 'autoUpgrade') a[field] = e.target.checked;
    else if (field === 'stack') a.stack = Math.max(1, Math.min(3, +e.target.value || 1));
    E.automationState(game);
    save();
    productionDialog();
  }
  if (e.target.dataset.automationReserve) {
    const a = E.automationState(game),
      key = e.target.dataset.automationReserve;
    a.reserve[key] = Math.max(0, Math.floor(+e.target.value || 0));
    E.automationState(game);
    save();
    productionDialog();
  }
});
document.addEventListener('click', e => {
  const portrait = e.target.closest('[data-general]');
  if (portrait && !e.target.closest('button')) {
    generalDialog(portrait.dataset.general, portrait.dataset.personal === '1');
    return;
  }
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = b.dataset;
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
  if (d.command) {
    const u = selectedUnit();
    closeModal();
    if (u) doAction(() => E.feint(game, u.id, +d.command));
    return;
  }
  if (d.launch) {
    const [c, r] = d.launch.split(',').map(Number);
    launchAt({ c, r });
    return;
  }
  if (d.shop) {
    openShop(+d.shop);
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
    const u = selectedUnit(),
      i = Number(d.deploy);
    if (!interactive() || !u || u.side !== game.player || E.TYPES[u.type].naval !== 'ship') return;
    const why = Number.isInteger(i) && i >= 0 ? E.deployReason(game, u, i) : 'Invalid cargo selection';
    if (why) { toast(why); return; }
    closeModal();
    deploying = { ship: u.id, index: i };
    updateSelection();
    toast('Choose a green land hex next to the carrier to launch.');
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
      if (researchBack !== 'start') {
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
    if (eliteBack === 'game') {
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
    (d.equip && (p => E.equipMedal(p, d.officer, d.equip))) ||
    (d.unequip && (p => E.unequipMedal(p, d.officer, d.unequip)));
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
    const k = d.recruitAdmiral || d.officer || d.promote,
      name = C(k).short;
    toast(
      d.recruitAdmiral
        ? `${C(k).name} joins your commanders.`
        : d.buyStar
          ? `${name}: ${r.stars}★ ${E.BRANCH_NAMES[d.buyStar]}.`
          : d.buyGeneric
            ? `${name}: ${E.GENERIC_SKILLS[d.buyGeneric].name} Lv.${r.level}.`
            : d.removeGeneric
              ? `${name}: ${E.GENERIC_SKILLS[d.removeGeneric].name} replaced.`
          : d.promote
            ? `${name} promoted to ${E.RANKS[r.rank]}.`
            : `${name}'s medals updated.`,
    );
    return;
  }
  if (d.generalOpen) {
    generalDialog(d.generalOpen, true);
    return;
  }
  if (d.generalsSide) {
    generalsDialog(d.generalsSide);
    return;
  }
  if (d.campaignTab) return campaignDialog(d.campaignTab);
  if (d.mission) return briefingDialog(d.mission);
  if (d.startMission) return startMission(d.startMission);
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
  switch (d.action) {
    case 'details':
      detailOpen = !detailOpen;
      updateSelection();
      break;
    case 'start-conquest':
      newGame();
      break;
    case 'continue':
      loadGame(getSave());
      break;
    case 'continue-mission':
      loadGame(getSave(CAMPAIGN_KEY));
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
    case 'mission-retry':
      startMission(game.campaign.id, game.difficulty || 'normal');
      break;
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
      menuDialog();
      break;
    case 'powers':
      powersDialog();
      break;
    case 'production':
      productionDialog();
      break;
    case 'automation-clear-cities': {
      E.automationState(game).cities = {};
      save();
      productionDialog();
      toast('All city auto-production queues cleared.');
      break;
    }
    case 'automation-fleija-reserve': {
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
      carrierDeployDialog();
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
    case 'end-confirm':
      endTurn(true);
      break;
    case 'skip-ai':
      skipAI = true;
      break;
    case 'fleija':
      strikeMode = !strikeMode && interactive();
      render();
      toast(strikeMode ? 'Choose a target hex for the F.L.E.I.J.A. warhead. Escape cancels.' : 'Launch cancelled.');
      break;
    case 'feint': {
      const u = selectedUnit();
      if (u && ['command', 'designate', 'stratagem'].includes(C(u.cmd)?.action?.kind)) commandDialog(u);
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
    case 'goto':
      startRouting();
      break;
    case 'goto-cancel': {
      const u = selectedUnit();
      if (u && u.side === game.player && interactive() && E.clearGoto(game, u.id).ok) {
        routing = null;
        refreshAndSave(true);
        toast('Auto-move stopped: the unit will not move on its own next turn.');
      }
      break;
    }
    case 'wait': {
      const u = selectedUnit();
      if (u && u.side === game.player && interactive()) {
        u.moved = u.attacked = true;
        refreshAndSave();
        nextFleet();
      }
      break;
    }
    case 'zoom-in':
      changeZoom(1.2);
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
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset?.general) {
    e.preventDefault();
    generalDialog(e.target.dataset.general, e.target.dataset.personal === '1');
    return;
  }
  if (modal.children.length) {
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
      else if (modal.querySelector('[aria-label="Campaigns"]')) startMenu();
      else if (modal.querySelector('[data-back="campaign"]')) campaignDialog();
      else if (helpBack === 'start' && modal.querySelector('[aria-label="Field manual"]')) startMenu();
      else if (archiveBack === 'start' && modal.querySelector('[aria-label="Knightmare archive"]')) startMenu();
      else closeModal();
    }
    return;
  }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'n') {
    e.preventDefault();
    nextFleet();
  }
  if (k === 'z') {
    e.preventDefault();
    undoMove();
  }
  if (k === 'h') centerOn(homeOf());
  if (k === 'g') startRouting();
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
  if (['w', 'a', 's', 'd'].includes(k)) {
    e.preventDefault();
    const step = 70 / (baseScale * zoom);
    cam.x += k === 'a' ? -step : k === 'd' ? step : 0;
    cam.y += k === 'w' ? -step : k === 's' ? step : 0;
  }
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
  if (k === 'enter' && document.activeElement === canvas) {
    e.preventDefault();
    activateHex(hover);
  }
});
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
        cities: game.stations,
        sakuraditeDeposits: game.sites || [],
        fleijaArsenal: game.arsenal || {},
        units: game.units.filter(u => u.hp > 0),
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

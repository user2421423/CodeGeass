function dockFlag(side) {
  const standard = ART.flagSVG(artSide(side));
  return `<span class="faction-flag ${side}${standard ? ' flag-art' : ''}" title="${esc(F(side).name)}">${standard || esc(F(side).letter)}</span>`;
}
function dockHTML() {
  const u = selectedUnit(),
    s = selectedStation();
  if (u) {
    const t = E.TYPES[u.type],
      a = C(u.cmd),
      ours = u.side === game.player,
      armyGroup = ours && (game.mode === 'conquest' || game.mode === 'scenario') ? armyGroupForUnit(u.id) : null,
      under = E.stationAt(game, u),
      mine = !under && E.siteAt(game, u),
      // A ready Eliminator charge this unit could take from a city in or next to its hex.
      chargeCity = ours && !(u.eliminator > 0) && game.mode !== 'scenario'
        ? game.stations.find(s => s.owner === u.side && s.eliminator > 0 && E.distance(u, s, game) <= 1)
        : null;
    return `<div class="dock-visual">${ART.unit(u.type, '', u.side)}${a ? generalPortrait(u.cmd, 'dock-portrait', !!u.personal) : ''}${dockFlag(u.side)}</div><div class="dock-unit"><span class="label">${a ? a.short + ' · ' : ''}${t.air ? 'Airship' : t.naval ? 'Naval' : t.branch} · ×${u.stack}${E.atSea(game, u) ? ' · Embarked' : ''}${ours && u.eliminator > 0 ? ' · <span class="eliminator-text">✦ Eliminator</span>' : ''}</span><strong>${unitName(u)}${ours && armyGroup ? `<span class="dock-group-label" title="${esc(armyGroupLabel(armyGroup))}">Group ${armyGroup.id}</span>` : ''}</strong><div class="dock-stats">${ICONS.hp(u.hp, E.maxHP(u))}${statRow(u, t)}</div>${ours && u.goto ? `<p class="goto-line">⚑ ${esc(gotoText(u))}</p>` : ''}${a ? `<p class="goto-line" title="${esc(a.desc)}"><b>${esc(a.skill)}</b> · ${a.action ? 'Active' : 'Passive'}${a.action ? ' · Range '+a.action.range : ''}${E.commanderStatusText(game,u) ? ' · '+esc(E.commanderStatusText(game,u)) : ''}</p>` : ''}</div><button class="mobile-unit-toggle" type="button" data-action="mobile-unit-toggle" aria-expanded="${dockExpanded}">Orders</button><div class="dock-actions unit-dock-actions">${under ? `<button class="small" data-station="${under.id}" title="Select the city under this unit (or click the unit again)">City: ${esc(under.name)}</button>` : ''}${mine ? `<button class="small" data-site="${mine.id}" title="Select the mine under this unit (or click the unit again)">Mine: ${esc(mine.name)}</button>` : ''}${ours && t.naval === 'ship' ? '<button class="small" data-action="carrier-deploy">Deploy units</button>' : ours && !u.cmd ? '<button class="small" data-action="assign">Assign</button>' : ''}${ours && a?.action ? act('data-action="feint"', a.action.name, phaseReason() || E.feintReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="goto"', routing === u.id ? 'Choose a hex…' : u.goto ? 'Change destination' : 'Set destination', phaseReason(), '', 'small', false) : ''}${ours && u.goto ? act('data-action="goto-cancel"', 'Stop auto-move', phaseReason(), '', 'small ghost', false) : ''}${ours && !u.elite && !t.air ? act('data-action="reinforce"', 'Add frame', phaseReason() || E.reinforceReason(game, u), '', 'small', false) : ''}${chargeCity ? act(`data-eliminator-give="${chargeCity.id}:${u.id}"`, 'Take Eliminator', phaseReason() || E.transferEliminatorReason(game, { city: chargeCity.id }, { unit: u.id }), '', 'small', false) : ''}${ours && u.eliminator > 0 ? act('data-action="eliminator-handover"', 'Hand over Eliminator', phaseReason() || (u.eliminatorMoved === game.turn ? 'This charge has already changed hands this turn' : null), '', 'small', false) : ''}${ours ? act('data-action="repair"', 'Repair', phaseReason() || E.repairReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="wait"', 'Hold', phaseReason() || (u.attacked ? 'Already fired' : null), '', 'small ghost', false) : ''}</div>${routing === u.id ? '<button type="button" class="hud-route-cancel" data-action="route-cancel">Cancel destination</button>' : ''}`;
  }
  if (s) {
    const ours = s.owner === game.player,
      beamTargets = ours && s.fort ? E.fortressTargets(game, s).length : 0,
      y = s.expSupplyBlocked?.owner===s.owner ? {credits:0,industry:0,sakuradite:0} : E.cityYield(game, s);
    return `<div class="dock-visual">${ART.city(cityKind(s), artSide(s.owner))}${dockFlag(s.owner)}</div><div class="dock-unit"><span class="label">${s.capital ? 'Capital' : s.fort ? 'Fortress city' : 'City'} · Factory ${s.tier}</span><strong>${s.name}</strong><div class="dock-health"><div class="bar"><i style="width:${(s.maxShield ? s.shield / s.maxShield : 0) * 100}%"></i></div><span>${Math.ceil(s.shield)} / ${s.maxShield} DEF</span></div><p>${s.expSupplyBlocked?.owner===s.owner?'Production disrupted · ':''}Income +${y.credits} &nbsp; Industry +${y.industry}${E.depositOf(game, s) ? ` &nbsp; Sakuradite +${y.sakuradite}` : ''}</p>${beamTargets ? `<p class="goto-line">Fortress beam ready · ${beamTargets} target${beamTargets === 1 ? '' : 's'} in range · Select a red hex to fire</p>` : ''}</div><button class="mobile-unit-toggle" type="button" data-action="mobile-unit-toggle" aria-expanded="${dockExpanded}">City actions</button><div class="dock-actions">${ours ? act(`data-shop="${s.id}"`, 'Factory', factoryReason(s), '', 'primary') : ''}<button class="small" data-action="details">City details</button></div>`;
  }
  const pt = selectedPort();
  if (pt)
    return `<div class="dock-visual mine-visual">${ART.building('port', 'dock-mine') || '⚓'}${dockFlag(pt.portOwner || pt.owner)}</div><div class="dock-unit"><span class="label">Port · Level ${pt.portLevel}</span><strong>Port of ${esc(pt.name)}</strong><p>One naval unit a turn, separate from the city factory.</p></div><button class="mobile-unit-toggle" type="button" data-action="mobile-unit-toggle" aria-expanded="${dockExpanded}">Port actions</button><div class="dock-actions">${(pt.portOwner || pt.owner) === game.player ? act(`data-shop-port="${pt.id}"`, 'Shipyard', portReason(pt), '', 'primary') : ''}<button class="small" data-action="details">Port details</button></div>`;
  const m = selectedSite();
  if (m) {
    const y = E.depositYield(game, m);
    return `<div class="dock-visual mine-visual">${ART.building('mine', 'dock-mine') || ICONS.use('sakuradite', 'dock-mine')}${dockFlag(m.owner)}</div><div class="dock-unit"><span class="label">Sakuradite mine · Refinery ${y.level}</span><strong>${esc(m.name)}</strong><p>+${y.sakuradite} Sakuradite${y.credits ? ` · +${y.credits} credits` : ''} a turn · base ${m.base}</p></div><div class="dock-actions"><button class="small" data-action="details">Mine details</button></div>`;
  }
  const tileChoice = selection?.kind === 'tile' ? E.tile(game, selection.c, selection.r) : null;
  if (tileChoice) {
    const info = E.TERRAIN[tileChoice.terrain],
      owner = tileChoice.owner ? F(tileChoice.owner) : null;
    return `<div class="dock-idle terrain-dock"><span class="label">Terrain · Hex ${tileChoice.c}, ${tileChoice.r}</span><strong>${esc(info.name)}</strong><p>${esc(E.terrainText(game,tileChoice))}${owner ? ` · ${esc(owner.short)} territory.` : ''}</p>${ruinText(tileChoice)}</div>`;
  }
  // No redundant Army Command placeholder when the player has not selected anything.
  return '';
}

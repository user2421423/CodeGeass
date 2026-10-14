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
      // Undo reverses the most recent ordinary move, regardless of which unit is selected.
      canUndo = ours && interactive() && undoStack.length > 0,
      undoReason = !interactive() ? 'Undo is only available on your turn.'
        : 'No reversible move. Captures and carrier actions cannot be undone.',
      under = E.stationAt(game, u),
      mine = !under && E.siteAt(game, u),
      // A ready Eliminator charge this unit could take from a city in or next to its hex.
      chargeCity = ours && !(u.eliminator > 0) && game.mode !== 'scenario'
        ? game.stations.find(s => s.owner === u.side && s.eliminator > 0 && E.distance(u, s, game) <= 1)
        : null;
    const ship = t.naval === 'ship';
    const movable = ours && interactive() && !u.moved && u.morale > -3;
    const fireable = ours && interactive() && !u.attacked && u.morale > -3 && !E.atSea(game, u);
    const moveWhy = !ours ? 'Enemy unit' : phaseReason() || (u.morale <= -3 ? 'Confused unit' : u.moved ? 'Movement already used' : 'Movement available');
    const fireWhy = !ours ? 'Enemy unit' : phaseReason() || (u.morale <= -3 ? 'Confused unit' : E.atSea(game, u) ? 'Embarked units cannot fire' : u.attacked ? 'Attack already used' : fireStatus(u));
    const primary = [
      ...(ship ? [act('data-action="carrier-deploy"', 'Deploy cargo' + (u.cargo?.length ? ' (' + u.cargo.length + ')' : ''), phaseReason(), 'Open carrier deployment', 'small primary', false)] : []),
      ...(!ship && !u.cmd ? [act('data-action="assign"', 'Assign commander', phaseReason(), '', 'small primary', false)] : []),
      ...(a?.action ? [act('data-action="feint"', a.action.name, phaseReason() || E.feintReason(game, u), '', 'small', false)] : []),
      act('data-action="goto"', routing === u.id ? 'Choose a hex…' : u.goto ? 'Change destination' : 'Set destination', phaseReason(), '', 'small', false),
      ...(u.goto ? [act('data-action="goto-cancel"', 'Stop auto-move', phaseReason(), '', 'small ghost', false)] : []),
      act('data-action="wait"', 'Hold position', phaseReason() || (u.attacked ? 'Already fired' : null), '', 'small ghost', false)
    ];
    const secondary = [
      ...(!u.elite ? [act('data-action="reinforce"', 'Add frame', phaseReason() || E.reinforceReason(game, u), '', 'small', false)] : []),
      act('data-action="repair"', 'Repair', phaseReason() || E.repairReason(game, u), '', 'small', false),
      ...(chargeCity ? [act(`data-eliminator-give="${chargeCity.id}:${u.id}"`, 'Take Eliminator', phaseReason() || E.transferEliminatorReason(game, { city: chargeCity.id }, { unit: u.id }), '', 'small', false)] : []),
      ...(u.eliminator > 0 ? [act('data-action="eliminator-handover"', 'Hand over Eliminator', phaseReason() || (u.eliminatorMoved === game.turn ? 'Charge already transferred this turn' : null), '', 'small', false)] : []),
      ...(under ? [`<button class="small" data-station="${under.id}" title="Select the city beneath this unit">City: ${esc(under.name)}</button>`] : []),
      ...(mine ? [`<button class="small" data-site="${mine.id}" title="Select the mine beneath this unit">Mine: ${esc(mine.name)}</button>`] : [])
    ];
    return `<div class="dock-visual">${ART.unit(u.type, '', u.side)}${a ? generalPortrait(u.cmd, 'dock-portrait', !!u.personal) : ''}${dockFlag(u.side)}</div>
      <div class="dock-unit"><span class="label">${a ? esc(a.short) + ' · ' : ''}${t.naval === 'amphibious' ? 'Naval' : esc(t.branch)} · ×${u.stack}${E.atSea(game, u) ? ' · Embarked' : ''}${ours && u.eliminator > 0 ? ' · ✦ Eliminator' : ''}</span>
      <strong>${esc(unitName(u))}${armyGroup ? `<span class="dock-group-label" title="${esc(armyGroupLabel(armyGroup))}">Group ${armyGroup.id}</span>` : ''}</strong>
      <div class="dock-stats">${ICONS.hp(u.hp, E.maxHP(u))}${statRow(u,t)}</div>
      <div class="dock-readiness"><span tabindex="0" class="dock-ready ${movable ? 'ready' : 'used'}" title="${esc(moveWhy)}" aria-label="Movement: ${esc(moveWhy)}">↗ ${movable ? 'Move ready' : 'Move unavailable'}</span><span tabindex="0" class="dock-ready ${fireable ? 'ready' : 'used'}" title="${esc(fireWhy)}" aria-label="Attack: ${esc(fireWhy)}">⌖ ${fireable ? 'Attack ready' : 'Attack unavailable'}</span></div>
      <p>${moraleName(u.morale)}${ours && u.goto ? ' · ' + esc(gotoText(u)) : ''}${armyGroup ? ' · ' + esc(armyGroupLabel(armyGroup)) : ''}</p></div>
      <div class="dock-orders" aria-label="Unit orders">
      ${ours ? `<div class="dock-actions dock-primary"><span class="dock-action-title">Orders${ship ? ' · carrier' : ''}</span>${primary.join('')}</div><details class="dock-secondary"><summary>Support &amp; logistics</summary><div class="dock-actions">${secondary.join('')}</div></details>` : `<span class="dock-action-title">Opponent unit</span><span class="dock-note">Select a friendly unit to issue orders.</span>`}
      </div>`;

  }
  if (s) {
    const ours = s.owner === game.player,
      y = E.cityYield(game, s);
    return `<div class="dock-visual">${ART.city(cityKind(s), artSide(s.owner))}${dockFlag(s.owner)}</div><div class="dock-unit"><span class="label">${s.capital ? 'Capital' : s.fort ? 'Fortress city' : 'City'} · Factory ${s.tier}</span><strong>${s.name}</strong><div class="dock-health"><div class="bar"><i style="width:${(s.maxShield ? s.shield / s.maxShield : 0) * 100}%"></i></div><span>${Math.ceil(s.shield)} / ${s.maxShield} DEF</span></div><p>Income +${y.credits} &nbsp; Industry +${y.industry}${E.depositOf(game, s) ? ` &nbsp; Sakuradite +${y.sakuradite}` : ''}</p></div><div class="dock-actions">${ours ? act(`data-shop="${s.id}"`, 'Factory', factoryReason(s), '', 'primary') : ''}<button class="small" data-action="details">City details</button></div>`;
  }
  const pt = selectedPort();
  if (pt)
    return `<div class="dock-visual mine-visual">${ART.building('port', 'dock-mine') || '⚓'}${dockFlag(pt.portOwner || pt.owner)}</div><div class="dock-unit"><span class="label">Port · Level ${pt.portLevel}</span><strong>Port of ${esc(pt.name)}</strong><p>One naval unit a turn, separate from the city factory.</p></div><div class="dock-actions">${(pt.portOwner || pt.owner) === game.player ? act(`data-shop-port="${pt.id}"`, 'Shipyard', portReason(pt), '', 'primary') : ''}<button class="small" data-action="details">Port details</button></div>`;
  const m = selectedSite();
  if (m) {
    const y = E.depositYield(game, m);
    return `<div class="dock-visual mine-visual">${ART.building('mine', 'dock-mine') || ICONS.use('sakuradite', 'dock-mine')}${dockFlag(m.owner)}</div><div class="dock-unit"><span class="label">Sakuradite mine · Refinery ${y.level}</span><strong>${esc(m.name)}</strong><p>+${y.sakuradite} Sakuradite${y.credits ? ` · +${y.credits} credits` : ''} a turn · base ${m.base}</p></div><div class="dock-actions"><button class="small" data-action="details">Mine details</button></div>`;
  }
  const tileChoice = selection?.kind === 'tile' ? E.tile(game, selection.c, selection.r) : null;
  if (tileChoice) {
    const info = E.TERRAIN[tileChoice.terrain],
      owner = tileChoice.owner ? F(tileChoice.owner) : null;
    return `<div class="dock-idle terrain-dock"><span class="label">Terrain · Hex ${tileChoice.c}, ${tileChoice.r}</span><strong>${esc(info.name)}</strong><p>${esc(info.desc)}${owner ? ` · ${esc(owner.short)} territory.` : ''}</p>${ruinText(tileChoice)}</div>`;
  }
  return `<div class="dock-idle"><span class="label">Army command</span><strong>Select a unit or city</strong><p>Click a Knightmare to move and attack. Click a city to build.</p></div><div class="dock-actions"><button class="small" data-action="next">Select a ready unit</button></div>`;
}

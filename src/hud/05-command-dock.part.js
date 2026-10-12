function dockHTML() {
  const u = selectedUnit(),
    s = selectedStation();
  if (u) {
    const t = E.TYPES[u.type],
      a = C(u.cmd),
      ours = u.side === game.player,
      // Undo reverses the most recent ordinary move, regardless of which unit is selected.
      canUndo = ours && interactive() && undoStack.length > 0,
      undoReason = !interactive() ? 'Undo is only available on your turn.'
        : 'No reversible move. Captures and carrier actions cannot be undone.',
      under = E.stationAt(game, u),
      mine = !under && E.siteAt(game, u);
    return `<div class="dock-visual">${ART.unit(u.type, '', u.side)}${a ? generalPortrait(u.cmd, 'dock-portrait', !!u.personal) : ''}<span class="faction-flag ${u.side}">${F(u.side).letter}</span></div><div class="dock-unit"><span class="label">${a ? a.short + ' · ' : ''}${t.branch} · ×${u.stack}${E.atSea(game, u) ? ' · Embarked' : ''}</span><strong>${unitName(u)}</strong><div class="dock-stats">${ICONS.hp(u.hp, E.maxHP(u))}${statRow(u, t)}</div><p>${Math.ceil(u.hp)} / ${E.maxHP(u)} frame · ${moraleName(u.morale)}${ours ? ' · ' + fireStatus(u) : ''}</p>${ours && u.goto ? `<p class="goto-line">⚑ ${esc(gotoText(u))}</p>` : ''}</div><div class="dock-actions unit-dock-actions">${ours ? `<button class="small undo-button" data-action="undo" title="${esc(canUndo ? 'Undo last ordinary move (Z).' : undoReason)}" aria-label="${esc(canUndo ? 'Undo last move' : 'Undo unavailable: ' + undoReason)}"${canUndo ? '' : ' disabled'}>↶ Undo${canUndo ? '' : ' locked'}</button>` : ''}${under ? `<button class="small" data-station="${under.id}" title="Select the city under this unit (or click the unit again)">City: ${esc(under.name)}</button>` : ''}${mine ? `<button class="small" data-site="${mine.id}" title="Select the mine under this unit (or click the unit again)">Mine: ${esc(mine.name)}</button>` : ''}${ours && t.naval === 'ship' ? '<button class="small" data-action="carrier-deploy">Deploy units</button>' : ours && !u.cmd ? '<button class="small" data-action="assign">Assign</button>' : ''}${ours && a?.action ? act('data-action="feint"', a.action.name, phaseReason() || E.feintReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="goto"', routing === u.id ? 'Choose a hex…' : u.goto ? 'Change destination' : 'Set destination', phaseReason(), '', 'small', false) : ''}${ours && u.goto ? act('data-action="goto-cancel"', 'Stop auto-move', phaseReason(), '', 'small ghost', false) : ''}${ours && !u.elite ? act('data-action="reinforce"', 'Add frame', phaseReason() || E.reinforceReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="repair"', 'Repair', phaseReason() || E.repairReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="wait"', 'Hold', phaseReason() || (u.attacked ? 'Already fired' : null), '', 'small ghost', false) : ''}</div>`;
  }
  if (s) {
    const ours = s.owner === game.player,
      y = E.cityYield(game, s);
    return `<div class="dock-visual">${ART.city(cityKind(s), s.owner)}<span class="faction-flag ${s.owner}">${F(s.owner).letter}</span></div><div class="dock-unit"><span class="label">${s.capital ? 'Capital' : s.fort ? 'Fortress city' : 'City'} · Factory ${s.tier}</span><strong>${s.name}</strong><div class="dock-health"><div class="bar"><i style="width:${(s.maxShield ? s.shield / s.maxShield : 0) * 100}%"></i></div><span>${Math.ceil(s.shield)} / ${s.maxShield} DEF</span></div><p>Income +${y.credits} &nbsp; Industry +${y.industry}${E.depositOf(game, s) ? ` &nbsp; Sakuradite +${y.sakuradite}` : ''}</p></div><div class="dock-actions">${ours ? act(`data-shop="${s.id}"`, 'Factory', factoryReason(s), '', 'primary') : ''}<button class="small" data-action="details">City details</button></div>`;
  }
  const pt = selectedPort();
  if (pt)
    return `<div class="dock-visual mine-visual">${ART.building('port', 'dock-mine') || '⚓'}<span class="faction-flag ${pt.portOwner || pt.owner}">${F(pt.portOwner || pt.owner).letter}</span></div><div class="dock-unit"><span class="label">Port · Level ${pt.portLevel}</span><strong>Port of ${esc(pt.name)}</strong><p>One naval unit a turn, separate from the city factory.</p></div><div class="dock-actions">${(pt.portOwner || pt.owner) === game.player ? act(`data-shop-port="${pt.id}"`, 'Shipyard', portReason(pt), '', 'primary') : ''}<button class="small" data-action="details">Port details</button></div>`;
  const m = selectedSite();
  if (m) {
    const y = E.depositYield(game, m);
    return `<div class="dock-visual mine-visual">${ART.building('mine', 'dock-mine') || ICONS.use('sakuradite', 'dock-mine')}<span class="faction-flag ${m.owner}">${F(m.owner).letter}</span></div><div class="dock-unit"><span class="label">Sakuradite mine · Refinery ${y.level}</span><strong>${esc(m.name)}</strong><p>+${y.sakuradite} Sakuradite${y.credits ? ` · +${y.credits} credits` : ''} a turn · base ${m.base}</p></div><div class="dock-actions"><button class="small" data-action="details">Mine details</button></div>`;
  }
  const tileChoice = selection?.kind === 'tile' ? E.tile(game, selection.c, selection.r) : null;
  if (tileChoice) {
    const info = E.TERRAIN[tileChoice.terrain],
      owner = tileChoice.owner ? F(tileChoice.owner) : null;
    return `<div class="dock-idle terrain-dock"><span class="label">Terrain · Hex ${tileChoice.c}, ${tileChoice.r}</span><strong>${esc(info.name)}</strong><p>${esc(info.desc)}${owner ? ` · ${esc(owner.short)} territory.` : ''}</p>${ruinText(tileChoice)}</div>`;
  }
  return `<div class="dock-idle"><span class="label">Army command</span><strong>Select a unit or city</strong><p>Click a Knightmare to move and attack. Click a city to build.</p></div><div class="dock-actions"><button class="small" data-action="next">Select a ready unit</button></div>`;
}

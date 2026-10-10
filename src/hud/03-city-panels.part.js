function moraleName(n) {
  return n >= 1
    ? 'High (+25%)'
    : n === 0
      ? 'Steady'
      : n === -1
        ? 'Low (−25%)'
        : n === -2
          ? 'Diminished (−50%)'
          : 'Confused';
}
// A city destroyed by F.L.E.I.J.A. stays on the map as ruins for the rest of the conquest (game.ruins).
function ruinText(p, cls = '') {
  const ruin = game.ruins?.find(x => x.c === p.c && x.r === p.r);
  return ruin
    ? `<p class="${cls}">Ruins of ${esc(ruin.name)}, a ${F(ruin.owner).short} city destroyed by F.L.E.I.J.A. on turn ${ruin.turn}. It cannot be captured or rebuilt in this war.</p>`
    : '';
}
// A Sakuradite deposit's output: base, extraction at its refinery level, and the yield per turn.
function depositBox(d) {
  const y = E.depositYield(game, d);
  return `<div class="target-box deposit-box"><span class="label">${ICONS.use('sakuradite', 'cost-ico')} Sakuradite deposit</span><h3>${esc(d.name)}</h3><p>Base output ${d.base} a turn · refinery level ${y.level} extracts ${Math.round(y.rate * 100)}%.</p><p><b>+${y.sakuradite} Sakuradite${y.credits ? ` · +${y.credits} credits` : ''} a turn</b></p>${allocationText(d)}</div>`;
}
// A Japanese deposit's output is shared among the powers (E.depositShares).
function allocationText(d) {
  const shares = Object.entries(E.depositShares(game, d));
  if (shares.length < 2) return '';
  return `<p>International allocation: ${shares.map(([side, n]) => `${F(side).short} +${Math.round(n * 10) / 10}`).join(' · ')}.</p>`;
}
function refineryRow(host, attrs, why) {
  const l = host.refinery || 0;
  return `<div class="building"><span class="label">${ICONS.use('refinery')} ${E.BUILDINGS.refinery.name}</span><span class="level">${'▮'.repeat(l)}${'▯'.repeat(3 - l)}</span><small>${E.BUILDINGS.refinery.desc}</small>${attrs ? (l >= 3 ? '<button class="small" disabled>Maximum level</button>' : act(attrs, (l ? 'Upgrade to level ' : 'Build level ') + (l + 1), why, costHTML(E.buildCost(host, 'refinery')), 'small')) : ''}</div>`;
}
function panel() {
  const u = selectedUnit(), s = selectedStation(), m = selectedSite();
  // Unit commands are bottom-only. Carrier hold is the one focused unit drawer.
  if (u) return carrierHoldOpen === u.id && E.TYPES[u.type].naval === 'ship'
    ? `<section class="deployment-only"><h2>Deploy Knightmares</h2>${holdHTML(u)}</section>`
    : '';
  let main = '';
  if (m) {

    const ours = m.owner === game.player;
    main = `<section><div class="side-title"><span class="label">Sakuradite mine</span><span class="chip" style="color:${F(m.owner).color}">${F(m.owner).short}</span></div><div class="mine-art">${ART.building('mine', 'mine-photo') || ICONS.use('sakuradite', 'mine-icon')}</div><h2 class="unit-name">${esc(m.name)}</h2><p class="description">${m.base >= 30 ? 'The richest Sakuradite deposit on Earth. ' : ''}A mine has no defenses: move an Infantry or Armor unit onto it to seize it. Artillery cannot capture.</p>${depositBox(m)}<div class="buildings">${refineryRow(m, ours ? `data-refine="${m.id}"` : '', phaseReason() || E.refineReason(game, m))}</div></section>`;
  } else if (s) {
    const ours = s.owner === game.player,
      deposit = E.depositOf(game, s),
      yields = E.cityYield(game, s);
    main = `<section><div class="side-title"><span class="label">${s.capital ? 'Capital' : s.fort ? 'Fortress city' : 'City'}</span><span class="chip" style="color:${F(s.owner).color}">${F(s.owner).short}</span></div>${ART.city(cityKind(s), s.owner, 'panel-ship')}<h2 class="unit-name">${s.name}</h2><p class="description">${s.capitalOf && E.alive(game, s.capitalOf) && s.owner === s.capitalOf ? `Capital of the ${F(s.owner).name}. If it falls, the whole power surrenders.` : s.fort ? `Fortified city with a battery covering ${E.fortressRange(game, s)} hexes.` : 'Capture and hold cities to fund your army.'}</p><div class="hp-row"><span>City defenses</span><span class="mono">${Math.ceil(s.shield)} / ${s.maxShield}</span></div><div class="bar"><i style="width:${(s.maxShield ? s.shield / s.maxShield : 0) * 100}%;background:${F(s.owner).color}"></i></div><div class="stat-grid"><div><span class="label">${ICONS.use('credits')} Credits</span><b>+${yields.credits}</b></div><div><span class="label">${ICONS.use('industry')} Industry</span><b>+${yields.industry}</b></div><div><span class="label">${ICONS.use('research')} Research</span><b>+${yields.science}</b></div>${deposit ? `<div><span class="label">${ICONS.use('sakuradite')} Sakuradite</span><b>+${yields.sakuradite}</b></div>` : ''}</div>${deposit ? depositBox(deposit) : ''}${projectPanel(s)}${fortressPanel(s)}<div class="buildings">${Object.entries(
      E.BUILDINGS,
    )
      .filter(([k]) => (k !== 'refinery' || deposit) && (k !== 'port' || E.portSite(game, s)))
      .map(([k, b]) => {
        const l = E.buildingLevel(s, k);
        return `<div class="building"><span class="label">${k === 'port' ? '⚓' : ICONS.use(k === 'factory' ? 'factory' : k === 'lab' ? 'research' : 'refinery')} ${b.name}</span>${k === 'port' && l && s.portOwner !== s.owner ? `<small class="warn-text">Held by the ${esc(F(s.portOwner).short)} fleet: clear its ships out to use the port.</small>` : ''}<span class="level">${'▮'.repeat(l)}${'▯'.repeat(3 - l)}</span><small>${b.desc}</small>${ours ? (l >= 3 ? '<button class="small" disabled>Maximum level</button>' : act(`data-build="${k}" data-station-id="${s.id}"`, (l ? 'Upgrade to level ' : 'Build level ') + (l + 1), phaseReason() || E.buildReason(game, s, k), costHTML(E.buildCost(s, k)), 'small')) : ''}</div>`;
      })
      .join(
        '',
      )}</div>${ours ? `${cityAutomationPanel(s)}<div class="actions">${act(`data-shop="${s.id}"`, 'Open factory', shipyardReason(s), 'Build a Knightmare unit', 'primary')}</div><p class="description">One unit per city per turn. New units act next turn. Garrisons repair 8% of their frame here each turn.</p>` : '<p class="description">Reduce its defenses to zero and destroy any garrison, then move an Infantry or Armor unit in to capture it. Artillery cannot capture.</p>'}</section>`;
  }
  return main;
}
// A Carrier-Battleship's hold: each formation aboard launches onto an empty land hex next to the ship.
function holdHTML(u) {
  const t = E.TYPES[u.type];
  if (t.naval !== 'ship') return '';
  const cargo = u.cargo || [],
    ours = u.side === game.player,
    rows = cargo
      .map(
        (c, i) =>
          `<div class="building"><span class="label">${c.cmd ? esc(C(c.cmd).short) + ' · ' : ''}${esc(E.TYPES[c.type].short)} ×${c.stack}</span><small>${Math.round(c.hp)} / ${E.maxHP(c)} HP</small>${ours ? act(`data-deploy="${i}"`, deploying?.ship === u.id && deploying.index === i ? 'Choose a green hex' : 'Launch', E.deployReason(game, u, i), 'Rapid KMF Deployment: lands with a full move and attack') : ''}</div>`,
      )
      .join('');
  const capacity = E.carrierCapacity(game, u);
  return `<div class="section-divider"><span class="label">Hold · ${cargo.length} / ${capacity} formations</span>${rows || '<p class="description">Empty. Move a Knightmare onto the carrier to board it; boarding ends its turn.</p>'}<p class="description">A launched Knightmare lands on an empty land hex next to the ship with a full move and attack, even if it boarded this turn. If the carrier sinks, everything aboard is lost.</p></div>`;
}
function nearestCityName(u) {
  let best = null,
    d = 99;
  for (const s of game.stations) {
    const n = E.distance(s, u, game);
    if (n < d) {
      d = n;
      best = s;
    }
  }
  return best ? (d ? `near ${best.name}` : best.name) : `${u.c},${u.r}`;
}
function cityKind(s) {
  return s.capital ? 'capital' : s.fort ? 'fortress' : 'city';
}
function shipyardReason(s) {
  return (
    phaseReason() ||
    (s.producedTurn === game.turn ? 'Already built here this turn' : null) ||
    (!E.recruitOptions(game, s, game.player).length && !(s.portAt && E.recruitOptions(game, s, game.player, E.NAVAL[game.player]?.amphibious).length)
      ? 'A unit is on the city'
      : null)
  );
}
// Strategic projects at a city: F.L.E.I.J.A. offense and the one-charge Eliminator defense.
function projectPanel(s) {
  const ours = s.owner === game.player,
    p = s.project,
    ep = s.eliminatorProject;
  if (p) {
    const left = Math.max(0, p.ready - game.turn);
    return `<div class="target-box fleija-panel"><span class="label">${ours ? 'F.L.E.I.J.A. project' : 'Intelligence'}</span><h3>${ours ? 'Warhead under construction' : 'Strategic weapons research detected'}</h3><p>${ours ? 'Ready' : 'Completes'} on turn ${p.ready} (${left} turn${left === 1 ? '' : 's'}). ${ours ? 'The city builds nothing else meanwhile; if it is captured, the project is lost.' : 'Capture the city to stop it.'}</p></div>`;
  }
  if (ep) {
    const left = Math.max(0, ep.ready - game.turn);
    return `<div class="target-box fleija-panel"><span class="label">${ours ? 'F.L.E.I.J.A. Eliminator' : 'Intelligence'}</span><h3>${ours ? 'Countermeasure under construction' : 'Eliminator development detected'}</h3><p>${ours ? 'Ready' : 'Completes'} on turn ${ep.ready} (${left} turn${left === 1 ? '' : 's'}). It will neutralize one incoming warhead aimed within ${E.ELIMINATOR.range} hexes of this city.</p></div>`;
  }
  const blocks = [];
  if (s.eliminator)
    blocks.push(`<div class="target-box fleija-panel"><span class="label">${ours ? 'F.L.E.I.J.A. Eliminator' : 'Intelligence'}</span><h3>Eliminator charge ready</h3><p>Automatically neutralizes the next incoming F.L.E.I.J.A. aimed within ${E.ELIMINATOR.range} hexes of ${esc(s.name)}. One use.</p></div>`);
  if (!ours) return blocks.join('');
  if (E.hasFleija(game, game.player))
    blocks.push(`<div class="target-box fleija-panel"><span class="label">F.L.E.I.J.A.</span><h3>Build a warhead</h3><p>${E.FLEIJA.turns} turns in a city with a level-${E.FLEIJA.lab} research lab. Every power is alerted when work begins.</p>${act(`data-project="${s.id}"`, 'Begin warhead project', phaseReason() || E.projectReason(game, s), costHTML(E.FLEIJA.cost))}</div>`);
  if (E.eliminatorTurn(game) != null && !s.eliminator)
    blocks.push(`<div class="target-box fleija-panel"><span class="label">F.L.E.I.J.A. Eliminator</span><h3>Build a defensive charge</h3><p>${E.ELIMINATOR.turns} turns · protects targets within ${E.ELIMINATOR.range} hexes of this city · one interception. Up to ${E.ELIMINATOR.max} charges per power at once, one per city.</p>${act(`data-eliminator="${s.id}"`, 'Begin Eliminator project', phaseReason() || E.eliminatorReason(game, s), costHTML(E.ELIMINATOR.cost))}</div>`);
  return blocks.join('');
}
function automationUnitOptionsHTML(s, selected) {
  const options = E.automationUnitOptions(game, s);
  return [
    '<option value="">Off — manual production</option>',
    ...options.map(id => {
      const t = E.TYPES[id],
        kind = t.naval ? 'Naval' : t.branch,
        req = t.naval ? `Port ${t.port}` : `Factory ${t.tier}`;
      return `<option value="${id}" ${selected === id ? 'selected' : ''}>${esc(t.name)} · ${esc(kind)} · ${req}</option>`;
    }),
  ].join('');
}
function automationReportText(r) {
  if (!r) return '';
  const parts = [
    `${r.units || 0} unit${r.units === 1 ? '' : 's'} produced`,
    `${r.upgrades || 0} building upgrade${r.upgrades === 1 ? '' : 's'}`,
    `${count(r.spent?.credits || 0)} credits`,
    `${count(r.spent?.industry || 0)} industry`,
  ];
  if (r.spent?.sakuradite) parts.push(`${count(r.spent.sakuradite)} Sakuradite`);
  return parts.join(' · ');
}
function cityAutomationPanel(s) {
  if (game.mode !== 'conquest' || s.owner !== game.player) return '';
  const a = E.automationState(game),
    unit = E.cityAutomation(game, s).unit,
    t = unit ? E.TYPES[unit] : null,
    stack = t?.naval === 'ship' ? 1 : a.stack,
    why = unit ? E.buyReason(game, s, unit, stack) : null,
    status = !unit
      ? 'No automatic unit queued for this city.'
      : why
        ? `Queued: ${t.name} ×${stack}. Waiting: ${why}.`
        : `Queued: ${t.name} ×${stack}. Ready for the next automation run.`;
  return `<div class="target-box"><span class="label">Auto-produce each turn</span><select class="select" data-city-unit="${s.id}" ${!interactive() ? 'disabled' : ''}>${automationUnitOptionsHTML(s, unit)}</select><small>${esc(status)}</small>${unit ? `<small>Current cost: ${costHTML(E.price(unit, stack, game, game.player))}. Formation size and resource reserves come from Production Command.</small>` : ''}<small>${a.enabled ? 'Runs after income is collected at the start of your turn.' : 'Automation is currently off globally. The queue will wait until Production Command is enabled.'}</small></div>`;
}
function productionDialog() {
  if (game.mode !== 'conquest') return;
  const a = E.automationState(game),
    owned = game.stations.filter(s => s.owner === game.player),
    queued = owned.map(s => ({ s, unit: E.cityAutomation(game, s).unit })).filter(x => x.unit),
    countsByUnit = {};
  for (const { unit } of queued) countsByUnit[unit] = (countsByUnit[unit] || 0) + 1;
  const summary =
    Object.entries(countsByUnit)
      .sort((a, b) => b[1] - a[1] || E.TYPES[a[0]].name.localeCompare(E.TYPES[b[0]].name))
      .slice(0, 8)
      .map(([id, n]) => `${E.TYPES[id].short} ${n}`)
      .join(' · ') || 'No city queues configured';
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Production Command"><div class="dialog-head"><div><div class="eyebrow">Conquest logistics</div><h2>Production Command</h2><p>Each city now has one simple automation choice: the exact unit it should try to produce every turn. Building upgrades and reserves stay under global command here.</p></div><button class="small close" data-action="close">Close</button></div><div class="brief-grid"><div><div class="brief-block"><span class="label">Master automation</span><label class="auto-check"><input type="checkbox" data-automation-field="enabled" ${a.enabled ? 'checked' : ''}> Run configured city queues at the start of every player turn</label><label class="auto-check"><input type="checkbox" data-automation-field="autoUpgrade" ${a.autoUpgrade ? 'checked' : ''}> Auto-upgrade buildings globally</label><p class="mode-note">If a queued unit needs a higher factory or port, automatic upgrades prioritize that requirement first. Otherwise upgrades follow the normal economic order.</p></div><div class="brief-block"><span class="label">City production queues</span><p><b>${queued.length} / ${owned.length}</b> owned cities currently have an automatic unit selected.</p><p class="mode-note">${esc(summary)}</p><div class="actions"><button class="ghost" data-action="automation-clear-cities">Clear all auto-production queues</button></div></div><div class="brief-block"><span class="label">Formation size</span><select class="select" data-automation-field="stack">${[1,2,3].map(n => `<option value="${n}" ${a.stack === n ? 'selected' : ''}>${n} frame${n > 1 ? 's' : ''} per automatic land/amphibious unit</option>`).join('')}</select><p class="mode-note">Carrier-Battleships are always built one at a time. Automation never deploys Elite Forces or starts F.L.E.I.J.A./Eliminator projects.</p></div></div><div><div class="brief-block"><span class="label">Protected resource reserve</span><p>Automatic and bulk purchases are skipped if they would leave you below these values.</p><div class="stat-grid"><label><span class="label">Credits</span><input class="select" type="number" min="0" step="50" value="${a.reserve.credits}" data-automation-reserve="credits"></label><label><span class="label">Industry</span><input class="select" type="number" min="0" step="25" value="${a.reserve.industry}" data-automation-reserve="industry"></label><label><span class="label">Sakuradite</span><input class="select" type="number" min="0" step="5" value="${a.reserve.sakuradite}" data-automation-reserve="sakuradite"></label></div><div class="actions"><button data-action="automation-fleija-reserve">Protect one F.L.E.I.J.A. budget</button></div></div><div class="brief-block"><span class="label">Bulk construction now</span><p>Upgrade one level of the selected building in every eligible city, stopping at the reserve.</p><div class="actions"><button data-bulk-build="factory" ${!interactive() ? 'disabled' : ''}>Factories</button><button data-bulk-build="lab" ${!interactive() ? 'disabled' : ''}>Labs</button><button data-bulk-build="refinery" ${!interactive() ? 'disabled' : ''}>Refineries</button><button data-bulk-build="port" ${!interactive() ? 'disabled' : ''}>Ports</button></div></div>${a.lastReport ? `<div class="brief-block"><span class="label">Last logistics report · turn ${a.lastReport.turn}</span><p>${esc(automationReportText(a.lastReport))}</p></div>` : ''}</div></div><div class="dialog-footer"><small class="notice">Choose each city's exact auto-produced unit from that city's panel. If it is temporarily unavailable, the queue waits rather than substituting another frame.</small><div><button data-action="automation-run" ${!interactive() ? 'disabled' : ''}>Run configured production now</button><button class="primary" data-action="close">Done</button></div></div></section></div>`;
  focusDialog();
}
function fortressPanel(s) {
  if (!s.fort) return '';
  const ours = s.owner === game.player,
    ready = E.fortressReady(game, s),
    status =
      s.shield <= 0
        ? 'Offline: defenses down'
        : (s.gunReady || 0) > game.turn
          ? `Recharging · ready on turn ${s.gunReady}`
          : ours
            ? 'Ready to fire'
            : 'Charged';
  return `<div class="target-box fortress-gun"><span class="label">Fortress battery</span><h3>${E.fortressName(s)}</h3><p>Range ${E.fortressRange(game, s)} · ${E.FORTRESS_GUN.fixed} + ${Math.round(E.FORTRESS_GUN.share * 100)}% of the target's maximum HP · recharges for ${E.fortressRecharge(game, s)} turn${E.fortressRecharge(game, s) > 1 ? 's' : ''}. Silenced while the city's defenses are down.</p><p><b>${status}</b>${ours && ready && interactive() ? (targetCache.size ? ' — click a red hex to fire.' : ' — no enemy unit in range.') : ''}</p></div>`;
}
function terrainDescription(t) {
  const info = E.TERRAIN[t.terrain],
    owner = t.owner ? ` Territory of the ${F(t.owner).name}.` : '';
  return `${info.name} · ${info.desc}${t.terrain !== 'sea' && t.terrain !== 'peak' ? ' Float units ignore movement costs.' : ''}${owner}`;
}

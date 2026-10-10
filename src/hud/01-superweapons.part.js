function arsenalButton() {
  const n = game.arsenal?.[game.player] || 0;
  if (!n) return '';
  const why = phaseReason();
  return `<button class="small fleija-button${strikeMode ? ' armed' : ''}" data-action="fleija" ${why ? `disabled title="${why}"` : `title="${strikeMode ? 'Cancel the launch' : 'Choose a target for a F.L.E.I.J.A. warhead'}"`}>F.L.E.I.J.A. ×${n}</button>`;
}
// The strategic-weapon warning, then a white-pink flash and the expanding sphere. A rival's strike has already been
// resolved by the engine; your own fires (fire()) while the warning covers the screen.
async function fleijaSequence(target, side, name, fire = null, resolved = null) {
  const alert = $('fleija-alert');
  alert.innerHTML = `<div class="fleija-box"><span class="fleija-kicker">Strategic weapon detected</span><b>F.L.E.I.J.A. warhead</b><span class="fleija-impact">Impact: ${esc(name)}</span><small>${esc(F(side).name)}</small></div>`;
  alert.hidden = false;
  alert.classList.add('show');
  SFX.play('fleija', side);
  zoom = Math.max(zoom, 3.2);
  centerOn(target);
  const token = aiToken;
  await pause(2000);
  if (token !== aiToken) {
    // A new or loaded game replaced this one during the warning: drop the rest of the sequence.
    alert.classList.remove('show');
    alert.hidden = true;
    return resolved;
  }
  const result = fire ? fire() : resolved;
  if (result?.intercepted) {
    alert.innerHTML = `<div class="fleija-box"><span class="fleija-kicker">Countermeasure engaged</span><b>F.L.E.I.J.A. eliminated</b><span class="fleija-impact">${esc(result.eliminatorCity)}</span><small>${esc(F(result.defender).name)}</small></div>`;
    await pause(1200);
    alert.classList.remove('show');
    alert.hidden = true;
    minimapDirty = true;
    render();
    return result;
  }
  if (result && !result.ok) {
    alert.classList.remove('show');
    alert.hidden = true;
    return result;
  }
  alert.classList.remove('show');
  alert.hidden = true;
  flash = 1;
  effects.push({ kind: 'fleija', to: { c: target.c, r: target.r }, life: 3.6, max: 3.6 });
  bump(30);
  minimapDirty = true;
  render();
  await pause(1700);
  return result;
}
// What a strike on p would do: units erased and crippled by side, cities hit, and whether your own are inside.
function blastSummary(p) {
  const tally = {},
    cities = [];
  let own = 0;
  for (const t of E.blastArea(game, p)) {
    const distance = E.distance(t, p, game),
      u = E.unitAt(game, t),
      s = E.stationAt(game, t);
    if (u) {
      const k = (tally[u.side] ||= { erased: 0, crippled: 0, damaged: 0 });
      k[distance === 0 ? 'erased' : distance === 1 ? 'crippled' : 'damaged']++;
      if (u.side === game.player) own++;
    }
    if (s) cities.push({ s, distance });
    if (s?.owner === game.player) own++;
  }
  return { tally, cities, own };
}
function confirmLaunch(p) {
  const { tally, cities, own } = blastSummary(p),
    name = E.targetName(game, p),
    defense = E.eliminatorDefender(game, game.player, p),
    rows = Object.entries(tally)
      .map(([side, k]) => `<li><b style="color:${F(side).color}">${F(side).short}</b> ${k.erased} erased · ${k.crippled} crippled · ${k.damaged} damaged</li>`)
      .join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow fleija-confirm" role="dialog" aria-modal="true" aria-label="Launch F.L.E.I.J.A."><div class="eyebrow">Strategic arsenal · ${game.arsenal[game.player]} warhead${game.arsenal[game.player] > 1 ? 's' : ''}</div><h2>Launch F.L.E.I.J.A. at ${esc(name)}?</h2><p>Ground zero: every unit is erased${cities.some(c => c.distance === 0) ? ` and ${esc(cities.find(c => c.distance === 0).s.name)} is destroyed for the rest of the war` : ''}${E.siteAt(game, p) || (cities.some(c => c.distance === 0) && E.depositOf(game, cities.find(c => c.distance === 0).s)) ? '; the Sakuradite deposit there will never produce again' : ''}; the land becomes a crater. The ring: units are left at ${Math.round(E.FLEIJA.ringHP * 100)}% with collapsed morale${cities.some(c => c.distance === 1) ? `; ${cities.filter(c => c.distance === 1).map(c => esc(c.s.name)).join(' and ')} lose${cities.filter(c => c.distance === 1).length > 1 ? '' : 's'} all defenses and a level of every building` : ''}.${cities.some(c => c.distance > 1) ? ` Outer ring: ${cities.filter(c => c.distance > 1).map(c => esc(c.s.name)).join(' and ')} retain at most ${Math.round(E.FLEIJA.outerShield * 100)}% defenses.` : ''}</p>${rows ? `<ul class="blast-list">${rows}</ul>` : '<p class="description">No units in the blast.</p>'}${own ? `<div class="info-strip danger-strip">Your own forces are inside the blast.</div>` : ''}${defense ? `<div class="info-strip">F.L.E.I.J.A. Eliminator coverage detected from ${esc(defense.name)}. This warhead will be neutralized and consume its one defensive charge.</div>` : ''}<div class="dialog-footer"><button data-action="close">Cancel</button><button class="primary danger" data-launch="${p.c},${p.r}">Launch</button></div></section></div>`;
  focusDialog();
}
async function launchAt(p) {
  if (!interactive()) return;
  uiActionBusy = true;
  undoStack = [];
  invalidateUIState();
  closeModal();
  strikeMode = false;
  const operation = game, token = aiToken, name = E.targetName(game, p);
  let result;
  try {
    result = await fleijaSequence(p, operation.player, name, () => {
      if (game !== operation || token !== aiToken) return { ok: false, reason: 'Operation changed.' };
      return E.launch(operation, operation.player, p.c, p.r);
    });
  } finally {
    uiActionBusy = false;
    invalidateUIState();
  }
  if (game !== operation || token !== aiToken) return;
  if (!result?.ok) {
    toast(result?.reason || 'Launch failed.');
    render();
    return;
  }
  undoStack = [];
  refreshAndSave();
  if (result.intercepted)
    toast(`F.L.E.I.J.A. Eliminator at ${result.eliminatorCity} neutralized the warhead.`, true);
  else
    toast(
      `F.L.E.I.J.A. detonation at ${name}: ${result.destroyed.length} units erased, ${result.crippled.length} crippled.${result.cities.some(c => c.destroyed) ? ` ${result.cities.find(c => c.destroyed).name} is erased.` : ''}${result.depleted?.length ? ` The ${result.depleted.join(', ')} deposit will never produce again.` : ''}${result.eliminatorUnlocked ? ` Eliminator research begins; countermeasures are available from turn ${result.eliminatorTurn}.` : ''}`,
      true,
    );
}
// Why the player cannot act right now (rival phase or finished operation).

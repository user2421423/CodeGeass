/* Knightmare Conquest UI: Combat effects: popups, screen shake, morale and strike effects. */
'use strict';
const HEAVY_SHAKE = { siege: 10, heavy: 6, super: 7, rocket: 4, medium: 2.5, light: 1.5 };
function bump(amount) {
  if (!reducedMotion()) shake = Math.max(shake, amount);
  if (typeof requestMapFrame === 'function') requestMapFrame();
}
function popup(at, text, color, opts = {}) {
  const life = opts.life || 1.6;
  effects.push({
    kind: 'text',
    to: { c: at.c, r: at.r },
    text,
    color,
    life,
    max: life,
    dy: opts.dy || 0,
    size: opts.size || 14,
    pop: !!opts.pop,
  });
  if (typeof requestMapFrame === 'function') requestMapFrame();
}
function unitSnapshot() {
  return new Map(game.units.filter(u => u.hp > 0).map(u => [u.id, { hp: u.hp, morale: u.morale }]));
}
function moraleLabel(m) {
  return m <= -3 ? 'CONFUSED!' : m === -2 ? 'MORALE ↓↓' : 'MORALE ↓';
}
// Morale drops over units: Confused, or a falling-morale tag.
function moralePopups(before) {
  for (const u of game.units) {
    const b = before.get(u.id);
    if (b && u.hp > 0 && u.morale < b.morale) popup(u, moraleLabel(u.morale), '#d9a6ff', { dy: 30, life: 2 });
  }
}
// Start-of-turn events: terrain attrition, morale shifts and battery strikes.
function turnStartPopups(before, side) {
  const struck = new Set((game.strikes || []).map(s => s.id));
  for (const u of game.units) {
    const b = before.get(u.id);
    if (!b || u.hp <= 0 || struck.has(u.id) || !onScreen(u)) continue;
    if (u.side === side && u.hp < b.hp) popup(u, `ATTRITION −${Math.round(b.hp - u.hp)}`, '#f2b35c', { life: 2.1 });
    if (u.morale < b.morale) popup(u, moraleLabel(u.morale), '#d9a6ff', { dy: 30, life: 2.1 });
  }
}
function strikeEffects(s, delay = 0) {
  effects.push({ kind: 'beam', heavy: true, from: s.from, to: s.to, color: '#fff3a0', life: 1.2 + delay, max: 1.2 + delay });
  popup(s.to, s.name.toUpperCase() + '!', '#ffe27a', { dy: 34, size: 15, life: 2.4, pop: true });
  popup(s.to, '−' + s.damage, '#ff4b3e', { size: 22, life: 2.2, pop: true });
  if (s.destroyed) effects.push({ kind: 'boom', to: s.to, life: 1, max: 1 });
  for (const h of s.hit || []) popup(h, '−' + h.damage, '#ff4b3e', { size: 18, life: 2, pop: true });
  SFX.play('thor', game.phase, delay);
  setTimeout(() => bump(16), reducedMotion() ? 0 : delay * 1000 + 550);
}
function addCombatEffects(result, attacker) {
  const side = attacker.side,
    cls = E.TYPES[attacker.type].cls;
  effects.push({
    kind: 'beam',
    heavy: ['heavy', 'super', 'siege'].includes(cls),
    from: result.from,
    to: result.to,
    color: F(side).color,
    life: 0.75,
    max: 0.75,
  });
  SFX.play(SFX.weapon(cls), side);
  if (result.crit) SFX.play('crit', side, 0.08);
  if (result.destroyed) {
    SFX.play('explosion', side, 0.2);
    effects.push({ kind: 'boom', to: result.to, life: 1, max: 1 });
  }
  bump((HEAVY_SHAKE[cls] || 0) + (result.crit ? 4 : 0) + (result.destroyed ? 4 : 0));
  // Blue tag: city defenses knocked down.
  if (result.shieldDamage) popup(result.to, `−${result.shieldDamage} DEF`, '#7cc8ff', { dy: 20, size: 14 });
  for (const h of result.hit || []) {
    const main = h.c === result.to.c && h.r === result.to.r;
    if (main && result.crit) popup(h, `−${h.damage} CRIT!`, '#ff3b30', { size: 21, life: 1.9, pop: true });
    else popup(h, '−' + h.damage, main ? '#ffb3a3' : '#ff9a7a', { size: main ? 15 : 13 });
  }
  if (result.counter) popup(result.from, `↩ −${result.counter}`, '#ffb3a3', { size: 13 });
}

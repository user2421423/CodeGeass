/* Knightmare Conquest UI: Combat effects: popups, screen shake, morale and strike effects. */
'use strict';
const HEAVY_SHAKE = { siege: 10, heavy: 6, super: 7, rocket: 4, medium: 2.5, light: 1.5 };
function bump(amount) {
  if (!reducedMotion()) shake = Math.max(shake, amount);
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
// All weapon effects are cosmetic. Unit and terrain state live only in the engine.
const COMBAT_VFX_LIMIT = 32;
const VFX_WEAPONS = {
  laser: { duration: 0.43, impact: 0.19, color: '#ffd88d' },
  slash: { duration: 0.34, impact: 0.17, color: '#8ce9ff' },
  cannon: { duration: 0.46, impact: 0.22, color: '#ffce83' },
  railgun: { duration: 0.51, impact: 0.24, color: '#a5e8ff' },
  rockets: { duration: 0.64, impact: 0.32, color: '#ffae72' },
  beam: { duration: 0.56, impact: 0.34, color: '#b9a6ff' },
  siege: { duration: 0.67, impact: 0.37, color: '#ecb7ff' },
};
// Killed units can disappear immediately after E.attack/E.aiOrder, before FX render.
function combatVisualSnapshot() {
  return new Map(game.units.filter(u => u.hp > 0).map(u => [
    u.id, { id: u.id, type: u.type, side: u.side, stack: u.stack, c: u.c, r: u.r },
  ]));
}
function pushCombatVfx(fx) {
  const active = effects.filter(e => e.kind === 'shot' || e.kind === 'wreck');
  if (active.length >= COMBAT_VFX_LIMIT) {
    const oldest = effects.findIndex(e => e.kind === 'shot' || e.kind === 'wreck');
    if (oldest !== -1) effects.splice(oldest, 1);
  }
  effects.push(fx);
}
function queueCombatShot(from, to, weapon, side, options = {}) {
  const spec = VFX_WEAPONS[weapon] || VFX_WEAPONS.cannon;
  const compact = reducedMotion();
  const duration = compact ? 0.18 : spec.duration;
  const delay = options.delay || 0;
  pushCombatVfx({
    kind: 'shot', from: { c: from.c, r: from.r }, to: { c: to.c, r: to.r },
    weapon, color: spec.color, side, crit: !!options.crit, counter: !!options.counter,
    heavy: ['railgun', 'siege'].includes(weapon), shake: options.shake || 0,
    delay, impact: compact ? 0.08 : spec.impact, duration,
    life: duration + delay, max: duration + delay, shaken: false,
  });
}
function spawnCombatWreck(unit, delay = 0) {
  if (!unit || !onScreen(unit)) return;
  const duration = reducedMotion() ? 0.4 : 3;
  pushCombatVfx({ kind: 'wreck', to: { c: unit.c, r: unit.r }, type: unit.type,
    side: unit.side, delay, duration, life: duration + delay, max: duration + delay });
}
function addCombatEffects(result, attacker, before = null) {
  if (!result || !attacker || (skipAI && aiSide)) return;
  const cls = E.TYPES[attacker.type].cls;
  const weapon = SFX.weapon(cls);
  const spec = VFX_WEAPONS[weapon] || VFX_WEAPONS.cannon;
  const compact = reducedMotion();
  const shown = onScreen(result.to) || onScreen(result.from);
  const target = before && [...before.values()].find(u =>
    u.c === result.to.c && u.r === result.to.r && u.side !== attacker.side);
  if (shown) {
    queueCombatShot(result.from, result.to, weapon, attacker.side, {
      crit: result.crit, shake: (HEAVY_SHAKE[cls] || 0) + (result.crit ? 4 : 0) + (result.destroyed ? 4 : 0),
    });
    SFX.play(weapon, attacker.side);
    if (result.crit) SFX.play('crit', attacker.side, compact ? 0.08 : spec.impact);
    if (result.destroyed) SFX.play('explosion', attacker.side, compact ? 0.08 : spec.impact);
    if (result.counter && target) {
      const counterWeapon = SFX.weapon(E.TYPES[target.type].cls), delay = compact ? 0.09 : spec.impact + 0.07;
      queueCombatShot(result.to, result.from, counterWeapon, target.side, { counter: true, delay, shake: 1 });
      SFX.play(counterWeapon, target.side, delay);
    }
  }
  // Include splash kills and an attacker killed by counterfire, but not unrelated disbanded units.
  if (before) {
    const affected = new Set((result.hit || []).map(h => h.id));
    if (result.counter) affected.add(attacker.id);
    for (const id of affected) {
      const previous = before.get(id);
      if (!previous || !onScreen(previous)) continue;
      if (!game.units.some(u => u.id === id && u.hp > 0))
        spawnCombatWreck(previous, compact ? 0.08 : spec.impact);
    }
  }
  if (result.shieldDamage) popup(result.to, '−' + result.shieldDamage + ' DEF', '#7cc8ff', { dy: 20, size: 14 });
  for (const h of result.hit || []) {
    const main = h.c === result.to.c && h.r === result.to.r;
    if (main && result.crit) popup(h, '−' + h.damage + ' CRIT!', '#ff3b30', { size: 21, life: 1.9, pop: true });
    else popup(h, '−' + h.damage, main ? '#ffb3a3' : '#ff9a7a', { size: main ? 15 : 13 });
  }
  if (result.counter) popup(result.from, '↩ −' + result.counter, '#ffb3a3', { size: 13 });
}

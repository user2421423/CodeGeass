/* Knightmare Conquest UI: Combat effects: popups, screen shake, morale and strike effects. */
'use strict';
const HEAVY_SHAKE = { siege: 10, heavy: 6, super: 7, rocket: 4, medium: 2.5, light: 1.5 };
function bump(amount) {
  if (!reducedMotion()) shake = Math.max(shake, amount);
  if (typeof requestMapFrame === 'function') requestMapFrame();
}
function popup(at, text, color, opts = {}) {
  const duration = opts.life || 1.6;
  const delay = Math.max(0, opts.delay || 0);
  const life = duration + delay;
  effects.push({
    kind: 'text',
    to: { c: at.c, r: at.r },
    text,
    color,
    life,
    max: life,
    duration,
    delay,
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
    if (u.side === side && u.hp > b.hp) abilityPulse(u,'+'+Math.round(u.hp-b.hp)+' HP','heal');
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
  const active = effects.filter(e => e.kind === 'shot' || e.kind === 'wreck' || e.kind === 'blast');
  if (active.length >= COMBAT_VFX_LIMIT) {
    const oldest = effects.findIndex(e => e.kind === 'shot' || e.kind === 'wreck' || e.kind === 'blast');
    if (oldest !== -1) effects.splice(oldest, 1);
  }
  effects.push(fx);
  requestMapFrame();
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
function spawnCombatBlast(to, delay = 0, heavy = false) {
  if (!onScreen(to)) return;
  const duration = reducedMotion() ? 0.18 : 0.65;
  pushCombatVfx({ kind: 'blast', to: { c: to.c, r: to.r }, delay, duration, heavy,
    life: duration + delay, max: duration + delay });
}
function addCombatEffects(result, attacker, before = null, delay = 0) {
  if (!result || !attacker || (skipAI && aiSide)) return;
  const cls = E.TYPES[attacker.type].cls;
  const weapon = SFX.weapon(cls);
  const spec = VFX_WEAPONS[weapon] || VFX_WEAPONS.cannon;
  const compact = reducedMotion();
  const impactAt = delay + (compact ? 0.08 : spec.impact);
  const shown = onScreen(result.to) || onScreen(result.from);
  const target = before && (result.targetId != null ? before.get(result.targetId) :
    [...before.values()].find(u => u.c === result.to.c && u.r === result.to.r && u.side !== attacker.side));
  const counterWeapon = result.counter && target ? SFX.weapon(E.TYPES[target.type].cls) : null;
  const counterDelay = counterWeapon ? delay + (compact ? 0.09 : spec.impact + 0.07) : 0;
  const counterImpactAt = counterWeapon
    ? counterDelay + (compact ? 0.08 : (VFX_WEAPONS[counterWeapon] || VFX_WEAPONS.cannon).impact)
    : 0;
  if (shown) {
    queueCombatShot(result.from, result.to, weapon, attacker.side, {
      delay,
      crit: result.crit, shake: (HEAVY_SHAKE[cls] || 0) + (result.crit ? 4 : 0) + (result.destroyed ? 4 : 0),
    });
    SFX.play(weapon, attacker.side, delay);
    if (result.crit) SFX.play('crit', attacker.side, impactAt);
    if (result.destroyed) {
      SFX.play('explosion', attacker.side, impactAt);
      spawnCombatBlast(result.to, impactAt, ['heavy', 'super', 'siege'].includes(cls));
    }
    if (counterWeapon) {
      queueCombatShot(result.to, result.from, counterWeapon, target.side,
        { counter: true, delay: counterDelay, shake: 1.5 });
      SFX.play(counterWeapon, target.side, counterDelay);
    }
  }
  // Splash fatalities and counterfire losses use their own hit times and locations.
  if (before) {
    const affected = new Set((result.hit || []).map(h => h.id));
    if (result.counter) affected.add(attacker.id);
    for (const id of affected) {
      const previous = before.get(id);
      if (!previous || !onScreen(previous)) continue;
      if (id === target?.id && !result.destroyed) continue;
      if (game.units.some(u => u.id === id && u.hp > 0)) continue;
      const killedByCounter = id === attacker.id;
      const destructionAt = killedByCounter ? counterImpactAt : impactAt;
      if (!effects.some(e => e.kind === 'wreck' && e.to.c === previous.c && e.to.r === previous.r))
        spawnCombatWreck(previous, destructionAt);
      // The main victim already received an explosion; give splash and counterfire kills one too.
      if (shown && (killedByCounter || id !== target?.id))
        spawnCombatBlast(previous, destructionAt, false);
    }
  }
  if (result.shieldDamage) popup(result.to, '−' + result.shieldDamage + ' DEF', '#7cc8ff',
    { dy: 20, size: 14, delay: impactAt });
  for (const h of result.hit || []) {
    const main = h.c === result.to.c && h.r === result.to.r;
    if (!main && h.damage > 0 && game.units.some(u=>u.id===h.id&&u.hp>0))
      spawnCombatBlast(h,impactAt,false);
    if (main && result.crit) popup(h, '−' + h.damage + ' CRIT!', '#ffefad',
      { size: 21, life: 1.9, pop: true, delay: impactAt });
    else popup(h, '−' + h.damage, main ? '#ffb3a3' : '#ff9a7a',
      { size: main ? 16 : 13, delay: impactAt, dy: main ? 0 : -12 });
  }
  if (result.counter) popup(result.from, 'COUNTER −' + result.counter, '#9deaff',
    { size: 16, life: 1.8, pop: true, delay: counterImpactAt });
  addAbilityEffects(result.abilityEffects, before, Math.max(impactAt,counterImpactAt) + 0.12);
}
// Reuse normal weapon, impact, shield, counterfire and destruction effects.
// A brief stagger makes each contributing formation's shot visible.
function addCommanderCombatEffects(result, caster, before) {
  if (!result?.ok) return;
  if (result.attack?.ok) addCombatEffects(result.attack, caster, before);
  (result.combat || []).forEach((strike, index) =>
    addCombatEffects(strike.result, strike.attacker, before, index * (reducedMotion() ? 0.04 : 0.18)));
  addAbilityEffects(result.abilityEffects, before, (result.combat?.length || 0) * 0.18 + 0.4);
}
const ABILITY_TONES = { heal:'#9af5aa', guard:'#9eeaff', buff:'#ffe49c', debuff:'#d9a6ff', summon:'#ffd16b' };
function abilityPulse(to, label, tone = 'buff', delay = 0) {
  if (!to || !onScreen(to) || (skipAI && aiSide)) return;
  const duration = reducedMotion() ? 0.18 : 0.65, color = ABILITY_TONES[tone] || ABILITY_TONES.buff;
  // Keep battlefield feedback bounded even for a large area ability.
  if (effects.filter(e=>e.kind==='ability').length >= 48) return;
  effects.push({kind:'ability',to:{c:to.c,r:to.r},color,delay,duration,
    life:duration+delay,max:duration+delay});
  if (label) popup(to,label,color,{size:12,dy:38,life:1.2,delay});
  requestMapFrame();
}
function addAbilityEffects(events, before, delay = 0) {
  if (skipAI && aiSide) return;
  (events || []).forEach((event,index)=>{
    const at = delay + index * (reducedMotion() ? 0.02 : 0.12);
    if (event.kind === 'signal') abilityPulse(event.to,event.label,event.tone,at);
    else if (event.kind === 'attack') {
      // Reactions may strike a unit after movement. Its firing-time position
      // is authoritative for counterfire/wrecks, including a lethal interception.
      const positions = new Map(before || []);
      if (event.target) positions.set(event.target.id,event.target);
      addCombatEffects(event.result,event.attacker,positions,at);
    }
  });
}
function addCommanderSupportEffects(result, caster, targets) {
  if (!result?.ok || !caster || result.attack?.ok || result.combat?.length || (skipAI && aiSide)) return;
  const action = E.COMMANDERS[caster.cmd]?.action;
  const recipients = result.target != null ? targets.filter(t=>t.id===result.target) : targets;
  for (const previous of recipients) {
    const city = ['city','enemyCity'].includes(action?.target) || action?.kind === 'arkFleet';
    const current = city ? game.stations.find(s=>s.id===previous.id) : game.units.find(u=>u.id===previous.id);
    const heal = Math.max(0,(current?.hp || 0)-(previous.hp || 0));
    const shields = Math.max(0,(current?.shield || 0)-(previous.shield || 0));
    const enemy = (city ? previous.owner : previous.side) !== caster.side;
    const guard = ['protection','oscarDefense'].includes(action?.kind);
    const tone = action?.target==='hex' ? 'summon' : heal || shields ? 'heal' : enemy ? 'debuff' : guard ? 'guard' : 'buff';
    abilityPulse(previous,heal ? '+'+heal+' HP' : shields ? '+'+shields+' DEF' : action?.name,tone);
    if (caster.cmd === 'sophie' && current?.expLink?.partner != null) {
      const partner = game.units.find(u=>u.id===current.expLink.partner);
      if (partner) abilityPulse(partner,action.name,'buff');
    }
  }
  if (result.cost > 0) popup(caster,'COST −'+result.cost+' HP','#f2b35c',{size:13,dy:55});
}

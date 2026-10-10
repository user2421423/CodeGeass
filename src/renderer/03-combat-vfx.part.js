function combatVfxLine(x, y, tx, ty, color, width, blur = 0) {
  ctx.save();
  if (blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
  drawLine(x, y, tx, ty, color, width);
  ctx.restore();
}
function combatVfxSparks(x, y, radius, color, fade = 1, count = 7) {
  ctx.save();
  ctx.globalAlpha *= Math.max(0, fade);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < count; i++) {
    const a = i * Math.PI * 2 / count + 0.19;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * radius * 0.2, y + Math.sin(a) * radius * 0.2);
    ctx.lineTo(x + Math.cos(a) * radius * (0.78 + 0.07 * (i % 3)), y + Math.sin(a) * radius * (0.78 + 0.07 * (i % 3)));
    ctx.stroke();
  }
  ctx.restore();
}
function combatVfxImpact(x, y, elapsed, color, strength, scale, compact) {
  const length = compact ? 0.1 : 0.27;
  if (elapsed < 0 || elapsed >= length) return;
  const t = elapsed / length, fade = (1 - t) * (1 - t);
  ctx.save();
  ctx.globalAlpha *= fade;
  drawFlash(x, y, (19 + 25 * t) * strength, color, 0.9);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5 * strength / Math.max(scale, 0.6);
  ctx.beginPath();
  ctx.arc(x, y, (10 + 27 * t) * strength, 0, Math.PI * 2);
  ctx.stroke();
  if (!compact) combatVfxSparks(x, y, (19 + 22 * t) * strength, '#fff2d2', 0.85, 9);
  ctx.restore();
}
function drawCombatShot(e, ax, ay, bx, by, scale) {
  const age = e.max - e.life - e.delay;
  if (age < 0 || age > e.duration) return;
  const compact = reducedMotion();
  const length = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / length, uy = (by - ay) / length, nx = -uy, ny = ux;
  const sx = ax + ux * 14, sy = ay + uy * 14 - 9, tx = bx, ty = by - 4;
  const power = e.heavy ? 1.55 : 1;
  function segment(tail, head, width, color, blur = 0) {
    combatVfxLine(sx + (tx - sx) * tail, sy + (ty - sy) * tail,
      sx + (tx - sx) * head, sy + (ty - sy) * head,
      color, width / Math.max(scale, 0.6), blur);
  }
  function muzzle(start, duration, strength) {
    if (age < start || age > start + duration) return;
    const alpha = 1 - (age - start) / duration;
    ctx.save();
    ctx.globalAlpha *= alpha;
    drawFlash(sx, sy, 20 * strength, e.color, 0.95);
    if (!compact) combatVfxSparks(sx, sy, 17 * strength, '#fff4dd', alpha, 6);
    ctx.restore();
  }
  // Counterfire is announced at the defending unit, not mistaken for a second attack.
  if (e.counter && age < (compact ? 0.14 : 0.28)) {
    const fade = Math.max(0, 1 - age / (compact ? 0.14 : 0.28));
    ctx.save();
    ctx.globalAlpha *= fade;
    ctx.strokeStyle = '#99eeff';
    ctx.lineWidth = 2.3 / Math.max(scale, 0.6);
    ctx.beginPath();
    ctx.arc(sx, sy, 12 + age * 42, 0, Math.PI * 2);
    ctx.stroke();
    if (!compact) outlinedText('COUNTER', sx + nx * 14, sy + ny * 14 - 27,
      10, '#c4f7ff', scale, 'Trebuchet MS', true);
    ctx.restore();
  }
  if (e.weapon === 'slash') {
    if (age < 0.27) {
      const progress = age / 0.27;
      ctx.save();
      ctx.globalAlpha *= Math.max(0, 1 - progress * 0.8);
      ctx.shadowColor = '#79d8ff';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#a5edff';
      ctx.lineWidth = 6 / Math.max(scale, 0.6);
      ctx.beginPath();
      ctx.arc(tx, ty, 24, Math.PI * (0.9 - progress * 0.35), Math.PI * (1.95 + progress * 0.4));
      ctx.stroke();
      ctx.restore();
    }
  } else if (e.weapon === 'beam' || e.weapon === 'siege') {
    muzzle(0.07, 0.18, power);
    if (age > 0.12 && age < 0.42) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, (age - 0.12) / 0.06, (0.42 - age) / 0.09);
      segment(0, 1, 13 * power, e.color, 20);
      segment(0, 1, 5 * power, '#f2e8ff', 7);
      segment(0, 1, 2.5 * power, '#ffffff');
      // Siege cannons fire a broader, twin-edged lance; ordinary beams remain narrow.
      if (e.weapon === 'siege' && !compact) {
        const spread = 8 * power;
        combatVfxLine(sx + nx * spread, sy + ny * spread,
          tx + nx * spread * 0.2, ty + ny * spread * 0.2,
          '#e4aeff', 2 / Math.max(scale, 0.6), 7);
        combatVfxLine(sx - nx * spread, sy - ny * spread,
          tx - nx * spread * 0.2, ty - ny * spread * 0.2,
          '#e4aeff', 2 / Math.max(scale, 0.6), 7);
      }
      ctx.restore();
    }
  } else if (e.weapon === 'railgun') {
    muzzle(0.025, 0.13, 1.5);
    const t = (age - 0.065) / 0.17;
    if (t > 0 && t < 1) {
      segment(Math.max(0, t - 0.37), t, 11, '#80d9ff', 18);
      segment(Math.max(0, t - 0.37), t, 3.6, '#ffffff');
    }
  } else if (e.weapon === 'rockets') {
    for (let i = 0; i < (compact ? 1 : 3); i++) {
      const start = 0.03 + i * 0.065, t = (age - start) / 0.28;
      muzzle(start, 0.085, 0.72);
      if (t <= 0 || t >= 1) continue;
      const sideways = (i - 1) * 12 * Math.sin(Math.PI * t);
      const x = sx + (tx - sx) * t + nx * sideways,
        y = sy + (ty - sy) * t + ny * sideways - 10 * Math.sin(Math.PI * t);
      combatVfxLine(x - ux * 18, y - uy * 18, x, y, '#929ca1', 5 / Math.max(scale, 0.6));
      combatVfxSparks(x, y, 6, '#fff2bd', 0.9, 4);
    }
  } else if (e.weapon === 'laser') {
    for (let i = 0; i < (compact ? 1 : 3); i++) {
      const start = 0.03 + i * 0.065, t = (age - start) / 0.15;
      muzzle(start, 0.07, 0.75);
      if (t > 0 && t < 1) {
        segment(Math.max(0, t - 0.2), t, 3, '#ffbd55', 6);
        segment(Math.max(0, t - 0.2), t, 1.25, '#fff5d8');
      }
    }
  } else {
    muzzle(0.015, 0.14, 1.1);
    const t = (age - 0.07) / 0.15;
    if (t > 0 && t < 1) {
      segment(Math.max(0, t - 0.2), t, 5.5, '#ffa855', 11);
      segment(Math.max(0, t - 0.2), t, 2, '#fff8e4');
    }
  }
  combatVfxImpact(tx, ty, age - e.impact, e.color, e.crit ? power * 1.4 : power, scale, compact);
  if (e.crit && age >= e.impact && age < e.impact + (compact ? 0.1 : 0.28)) {
    const progress = (age - e.impact) / (compact ? 0.1 : 0.28);
    ctx.save();
    ctx.globalAlpha *= (1 - progress) * 0.9;
    ctx.strokeStyle = '#ffe98a';
    ctx.lineWidth = 4 / Math.max(scale, 0.6);
    ctx.beginPath();
    ctx.arc(tx, ty, 16 + 36 * progress, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (e.weapon === 'rockets' && !compact)
    for (let i = 1; i < 3; i++)
      combatVfxImpact(tx + nx * (i === 1 ? -11 : 12), ty + ny * (i === 1 ? -11 : 12),
        age - e.impact - i * 0.065, '#ffc07a', 0.6, scale, compact);
}
function drawCombatBlast(e, x, y, scale) {
  const age = e.max - e.life - e.delay;
  if (age < 0 || age > e.duration) return;
  const compact = reducedMotion(), t = age / e.duration;
  const strength = e.heavy ? 1.4 : 1;
  ctx.save();
  ctx.globalAlpha *= (1 - t) * (1 - t);
  drawFlash(x, y - 5, (24 + t * 52) * strength, 'rgba(255,132,54,0.8)', 1);
  drawFlash(x, y - 6, (10 + t * 26) * strength, 'rgba(255,239,179,0.95)', 0.9);
  ctx.strokeStyle = '#ffc083';
  ctx.lineWidth = 3 / Math.max(scale, 0.6);
  ctx.beginPath();
  ctx.arc(x, y - 5, (12 + t * 38) * strength, 0, Math.PI * 2);
  ctx.stroke();
  if (!compact) {
    // A bright secondary shockwave and debris make lethal hits read at every zoom.
    ctx.strokeStyle = 'rgba(255,233,183,0.92)';
    ctx.lineWidth = 1.8 / Math.max(scale, 0.6);
    ctx.beginPath();
    ctx.arc(x, y - 5, (18 + t * 57) * strength, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const angle = i * 2.39996, radius = (10 + t * 49) * strength;
      const px = x + Math.cos(angle) * radius, py = y - 5 + Math.sin(angle) * radius * 0.65;
      combatVfxLine(px, py, px + Math.cos(angle) * 9, py + Math.sin(angle) * 9,
        i % 2 ? '#ffa951' : '#55565a', 2 / Math.max(scale, 0.6));
    }
  }
  ctx.restore();
}
function drawCombatWreck(e, x, y) {
  const age = e.max - e.life - e.delay;
  if (age < 0 || age > e.duration) return;
  const compact = reducedMotion();
  ctx.save();
  ctx.globalAlpha *= Math.min(1, e.life / Math.min(0.9, e.duration));
  ctx.translate(x, y);
  ctx.rotate(0.12);
  ctx.filter = 'grayscale(1) brightness(0.27) sepia(0.5)';
  ART.drawUnit(ctx, e.type, e.side, 0, 0, R * 1.65, R * 1.65);
  ctx.filter = 'none';
  if (!compact) {
    const heat = Math.max(0, 1 - age / 1.5);
    drawFlash(0, 6, 17, 'rgba(255,122,43,0.5)', heat * 0.85);
    for (let i = 0; i < 5; i++) {
      const rise = age * (17 + i * 4);
      const xx = Math.sin(i * 3 + age * 2) * 8 + i * 2 - 4;
      ctx.fillStyle = 'rgba(58,58,62,0.48)';
      ctx.beginPath();
      ctx.arc(xx, -7 - rise, 5 + age * (3 + i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Every copy of world x between left and right (the world map wraps east to west; a campaign battlefield does not).

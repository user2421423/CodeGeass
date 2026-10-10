function drawCrystals(x, y, k, time) {
  const glow = 0.55 + 0.25 * Math.sin(time / 420);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.shadowColor = `rgba(255,95,174,${glow})`;
  ctx.shadowBlur = 14;
  for (const [dx, h, w] of [
    [-11, 20, 6],
    [11, 17, 6],
    [0, 30, 8],
  ]) {
    ctx.beginPath();
    ctx.moveTo(dx, -h);
    ctx.lineTo(dx + w, -h * 0.62);
    ctx.lineTo(dx + w * 0.7, 0);
    ctx.lineTo(dx - w * 0.7, 0);
    ctx.lineTo(dx - w, -h * 0.62);
    ctx.closePath();
    const gr = ctx.createLinearGradient(dx - w, -h, dx + w, 0);
    gr.addColorStop(0, '#ffe0f0');
    gr.addColorStop(0.45, '#ff6fb5');
    gr.addColorStop(1, '#9c1559');
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = '#4a0d2c';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}
// A Sakuradite mine on its own hex: rock base ringed in the owner's color, crystals, refinery pips and its name.
// A unit standing on it hides the base, so the crystals move up beside the token.
function drawMine(d, owner, scale, time, occupied) {
  const level = d.refinery || 0;
  if (occupied) {
    drawCrystals(-30, -12, 0.55, time);
    outlinedText(d.name, 0, 52, 10, '#ffc2e0', scale, 'Trebuchet MS', d.base >= 30);
    return;
  }
  // The published mine picture, else a drawn pit of crystals ringed in the owner's colour.
  if (!ART.drawBuilding(ctx, 'mine', 0, -4, R * 2.05)) {
    ctx.beginPath();
    ctx.ellipse(0, 10, 27, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#3a3036';
    ctx.fill();
    ctx.strokeStyle = F(owner).color;
    ctx.lineWidth = Math.max(1.6, 1.4 / scale);
    ctx.stroke();
    drawCrystals(0, 9, 1, time);
  }
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < level ? '#ff7ab8' : '#2a1d25';
    ctx.fillRect(20, 6 - i * 5, 4, 3);
  }
  mapBadge(-25, 14, owner, scale);
  // Above the crystals: commander pins of units on the hexes below would cover a name underneath.
  outlinedText(d.name, 0, -27, 10.5, '#ffc2e0', scale, 'Trebuchet MS', d.base >= 30);
}
function mapBadge(x, y, side, scale) {
  const radius = Math.max(7, 7 / scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = PLATE[side].mid;
  ctx.fill();
  ctx.strokeStyle = PLATE[side].trim;
  ctx.lineWidth = 1.4 / scale;
  ctx.stroke();
  ctx.font = `bold ${Math.max(9, 8 / scale)}px Georgia`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff8df';
  ctx.fillText(F(side).letter, 0, 3 / scale);
  ctx.restore();
}
function outlinedText(text, x, y, size, color, scale, font = 'Trebuchet MS', bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${Math.max(size, size / scale)}px '${font}'`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = '#06121fdd';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
function animatedPosition(u) {
  const p = hexCenter(u),
    fx = effects.find(e => e.kind === 'move' && e.unitId === u.id && e.life > 0);
  if (!fx) return p;
  const start = hexCenter(fx.from),
    sx = wrapNear(start.x, p.x),
    t = 1 - fx.life / fx.max,
    ease = 1 - Math.pow(1 - t, 3);
  return { x: sx + (p.x - sx) * ease, y: start.y + (p.y - start.y) * ease };
}
function drawFlash(x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(255,255,235,${alpha})`);
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
// Combat FX draw on the existing canvas, not on extra layers, DOM nodes or engine units.

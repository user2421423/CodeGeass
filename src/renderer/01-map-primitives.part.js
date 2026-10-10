// ======== Map renderer ========
const PLATE = {
  neutral: { light: '#7a7462', mid: '#45402f', dark: '#25221a', trim: '#e6dfc0', bar: '#c9c2a2' },
  britannia: { light: '#9d3737', mid: '#5d1818', dark: '#2b0909', trim: '#f0c76a', bar: '#e0b85a' },
  eu: { light: '#4778cc', mid: '#214783', dark: '#0d244d', trim: '#dbe5ef', bar: '#c9d3dd' },
  cf: { light: '#ad3a33', mid: '#5c1512', dark: '#330806', trim: '#f2c14e', bar: '#e0b24a' },
  bk: { light: '#44434f', mid: '#1f1e27', dark: '#0c0b10', trim: '#f0c94a', bar: '#e6c048' },
  jlf: { light: '#4c8550', mid: '#224a28', dark: '#0f2613', trim: '#d4ebbd', bar: '#a9d68f' },
  eb: { light: '#6e4fa8', mid: '#3a2466', dark: '#1a0f33', trim: '#e3c06a', bar: '#cdb0f0' },
};
const TERRAIN_FILL = {
  sea: '#174a6c',
  coast: '#4c8a7d',
  plains: '#7b9852',
  forest: '#567f45',
  mountain: '#8d826a',
  desert: '#d3bc85',
  snow: '#e3eaef',
  peak: '#5d5862',
  crater: '#ecd2e2',
  urban: '#80838a',
};
function hash01(c, r, salt = 0) {
  const v = Math.sin(c * 127.1 + r * 311.7 + salt * 74.7) * 43758.5453;
  return v - Math.floor(v);
}
// Coast and shade flags, computed once per map.
let tileMeta = null,
  tileMetaFor = null;
function metaFor(t) {
  if (tileMetaFor !== game.tiles) {
    tileMetaFor = game.tiles;
    tileMeta = game.tiles.map(x => {
      const adj = E.adjacent(game, x);
      return {
        adj,
        coast: x.terrain === 'sea' && adj.some(n => n.terrain !== 'sea'),
        tint: hash01(x.c, x.r) * 0.12 - 0.06,
      };
    });
  }
  return tileMeta[t.r * game.cols + t.c];
}
function starPath(x, y, ro, ri) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro,
      a = ((36 * i - 90) * Math.PI) / 180;
    i ? ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}
function terrainProps(t, x, y, scale) {
  if (R * scale < 13) return;
  const h = k => hash01(t.c, t.r, k);
  if (t.terrain === 'forest') {
    for (let i = 0; i < 4; i++) {
      const tx = x + (h(i) - 0.5) * R * 1.1,
        ty = y + (h(i + 9) - 0.5) * R * 0.9;
      ctx.fillStyle = '#2f5a2e';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 12);
      ctx.lineTo(tx + 7, ty + 4);
      ctx.lineTo(tx - 7, ty + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3f7339';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 9);
      ctx.lineTo(tx + 4, ty + 1);
      ctx.lineTo(tx - 4, ty + 1);
      ctx.closePath();
      ctx.fill();
    }
  } else if (t.terrain === 'mountain' || t.terrain === 'peak') {
    const big = t.terrain === 'peak' ? 1.35 : 1;
    for (const [dx, s] of [
      [-10, 0.8],
      [8, 1],
    ]) {
      const px = x + dx,
        hgt = 22 * s * big,
        w = 15 * s * big;
      ctx.fillStyle = t.terrain === 'peak' ? '#3e3a44' : '#6d6352';
      ctx.beginPath();
      ctx.moveTo(px, y - hgt + 8);
      ctx.lineTo(px + w, y + 10);
      ctx.lineTo(px - w, y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2f5f7';
      ctx.beginPath();
      ctx.moveTo(px, y - hgt + 8);
      ctx.lineTo(px + w * 0.35, y - hgt * 0.45 + 8);
      ctx.lineTo(px - w * 0.35, y - hgt * 0.45 + 8);
      ctx.closePath();
      ctx.fill();
    }
  } else if (t.terrain === 'desert') {
    ctx.strokeStyle = '#b89c62';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 2; i++) {
      const dy = (i - 0.5) * 14 + (h(i) - 0.5) * 6;
      ctx.beginPath();
      ctx.moveTo(x - 18, y + dy);
      ctx.quadraticCurveTo(x - 4, y + dy - 7, x + 10, y + dy);
      ctx.quadraticCurveTo(x + 16, y + dy + 4, x + 22, y + dy);
      ctx.stroke();
    }
  } else if (t.terrain === 'crater') {
    // F.L.E.I.J.A. crater: glassed pink-white rings around a pink core.
    ctx.strokeStyle = '#ffffffb0';
    ctx.lineWidth = 1.5;
    for (const k of [0.78, 0.52, 0.28]) {
      ctx.beginPath();
      ctx.ellipse(x, y + 2, R * k, R * k * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff7ab860';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, R * 0.2, R * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (t.terrain === 'urban') {
    // City ruins: three broken blocks of flats with dark windows.
    for (let i = 0; i < 3; i++) {
      const bx = x - 20 + i * 13 + (h(i) - 0.5) * 6,
        bh = 10 + h(i + 4) * 14,
        by = y + 10;
      ctx.fillStyle = i % 2 ? '#5b5f67' : '#4b4f57';
      ctx.fillRect(bx, by - bh, 10, bh);
      ctx.fillStyle = '#2b2e34';
      for (let k = by - bh + 3; k < by - 2; k += 5) {
        ctx.fillRect(bx + 2, k, 2, 2);
        ctx.fillRect(bx + 6, k, 2, 2);
      }
    }
  } else if (t.terrain === 'snow') {
    ctx.fillStyle = '#c6d4dd';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + (h(i) - 0.5) * 40, y + (h(i + 5) - 0.5) * 30, 6, 2);
  } else if (t.terrain === 'sea' && R * scale > 18 && h(3) < 0.35) {
    ctx.strokeStyle = '#ffffff1c';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.quadraticCurveTo(x - 5, y - 4, x, y);
    ctx.quadraticCurveTo(x + 5, y + 4, x + 10, y);
    ctx.stroke();
  }
}
// Selected tile: glowing hex outline with pulsing inner corners.
function selectedHex(p, time, scale) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 260);
  ctx.save();
  hexPath(p.x, p.y, R - 2);
  ctx.fillStyle = '#3ff2c41c';
  ctx.fill();
  ctx.shadowColor = '#3ff2c4';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#3ff2c4';
  ctx.lineWidth = Math.max(2.5, 2 / scale);
  ctx.stroke();
  ctx.shadowBlur = 0;
  const inset = R - 7 - pulse * 3,
    len = 8;
  ctx.strokeStyle = `rgba(160,255,225,${0.55 + 0.45 * pulse})`;
  ctx.lineWidth = Math.max(2, 1.6 / scale);
  const vertex = i => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: p.x + inset * Math.cos(a), y: p.y + inset * Math.sin(a) };
  };
  for (let i = 0; i < 6; i++) {
    const v = vertex(i);
    for (const j of [-1, 1]) {
      const n = vertex(i + j),
        d = Math.hypot(n.x - v.x, n.y - v.y);
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(v.x + ((n.x - v.x) * len) / d, v.y + ((n.y - v.y) * len) / d);
      ctx.stroke();
    }
  }
  ctx.restore();
}
// Attackable hexes: pulsing red crosshair drawn above the units.
function drawCrosshair(p, time, scale) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 200),
    r = 11 + pulse * 1.5;
  ctx.save();
  ctx.translate(p.x, p.y - 4);
  ctx.strokeStyle = `rgba(255,80,60,${0.65 + 0.35 * pulse})`;
  ctx.lineWidth = Math.max(2, 1.8 / scale);
  ctx.shadowColor = '#ff3b2f';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd0c4';
  ctx.fill();
  ctx.restore();
}
// Hover estimate shown above a red hex before the one-click attack.
function drawEstimate(p, pr, scale) {
  const text = `~${pr.unit || pr.shield} dmg · ${pr.counterAllowed ? '↩ ' + pr.counter : 'no counter'}`;
  ctx.save();
  ctx.translate(p.x, p.y - R + 2);
  ctx.scale(1 / scale, 1 / scale);
  ctx.font = "bold 12px 'Trebuchet MS'";
  const w = (ctx.measureText(text)?.width || text.length * 7) + 16;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w / 2, -24, w, 22, 5);
  else ctx.rect(-w / 2, -24, w, 22);
  ctx.fillStyle = '#3b0f0ee8';
  ctx.fill();
  ctx.strokeStyle = '#ff7a62';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff1e8';
  ctx.fillText(text, 0, -9);
  ctx.restore();
}
// Base token in faction colors, ringed by frame integrity. Embarked units ride a transport hull.
function drawPlate(u, scale, sea, time = 0) {
  const c = PLATE[u.side],
    cy = 14,
    rx = 31,
    ry = 18,
    f = Math.max(0, Math.min(1, u.hp / E.maxHP(u)));
  ctx.save();
  if (sea) {
    ctx.beginPath();
    ctx.moveTo(-40, cy - 4);
    ctx.lineTo(40, cy - 4);
    ctx.lineTo(30, cy + 14);
    ctx.lineTo(-34, cy + 14);
    ctx.closePath();
    ctx.fillStyle = '#5d6873';
    ctx.fill();
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = Math.max(2, 1.6 / scale);
    ctx.stroke();
    ctx.fillStyle = '#3b444d';
    ctx.fillRect(-30, cy - 10, 22, 7);
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-44, cy + 18);
    ctx.quadraticCurveTo(-30, cy + 12, -16, cy + 18);
    ctx.moveTo(16, cy + 18);
    ctx.quadraticCurveTo(30, cy + 12, 44, cy + 18);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, cy + 3, rx + 3, ry + 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#00000080';
    ctx.fill();
    const g = ctx.createRadialGradient(-7, cy - 6, 2, 0, cy, rx);
    g.addColorStop(0, c.light);
    g.addColorStop(0.65, c.mid);
    g.addColorStop(1, c.dark);
    ctx.beginPath();
    ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = Math.max(2, 1.6 / scale);
    ctx.stroke();
  }
  const hostile = hostileUnit(u),
    ready = readyUnit(u),
    pulse = 0.82 + 0.18 * Math.sin(time / 210);
  if (ready) {
    ctx.shadowColor = `rgba(32,245,138,${0.92 * pulse})`;
    ctx.shadowBlur = 13;
  }
  ctx.beginPath();
  ctx.ellipse(0, cy, rx + 6, ry + 6, 0, 0, Math.PI * 2);
  ctx.strokeStyle = hostile ? '#420710e8' : '#061019e0';
  ctx.lineWidth = Math.max(4.2, 3.2 / scale);
  ctx.stroke();
  if (f > 0) {
    ctx.beginPath();
    ctx.ellipse(0, cy, rx + 6, ry + 6, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
    ctx.strokeStyle = hostile ? '#ff334d' : ICONS.hpColor(f);
    ctx.lineWidth = Math.max(2.8, 2.2 / scale);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}
// A high-contrast outer ring makes hostile formations readable at a glance regardless of faction color.
// Team allies in campaign missions are not marked: hostility follows the engine's foe/team rules.
function hostileUnit(u) {
  return !!u && E.foe(game, game.player, u.side);
}
function readyUnit(u) {
  return !!u && u.side === game.player && interactive() && hasOrders(u);
}
// Unit strength: 1–3 metallic bars hung from the bottom of the token ring.
function drawStackBars(n, side) {
  const c = PLATE[side],
    w = 9,
    gap = 3,
    total = n * w + (n - 1) * gap,
    y = 41;
  for (let i = 0; i < n; i++) {
    const x = -total / 2 + i * (w + gap);
    ctx.fillStyle = '#05090d';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = c.bar;
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = '#ffffffb0';
    ctx.fillRect(x, y, w, 1.2);
  }
}
// Commander portrait pin: the commander's framed portrait standing above the unit, with rank stars.
function drawAdmiralPin(u, p, scale, sel) {
  const a = C(u.cmd);
  ctx.save();
  ctx.translate(p.x - 22, p.y - 40);
  const k = Math.min(1.6, Math.max(1, 0.85 / scale));
  ctx.scale(k, k);
  const w = 26,
    h = 32;
  ctx.shadowColor = '#000c';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const sp = ART.portraitSprite(u.cmd, w, h);
  if (sp) ctx.drawImage(sp.img, sp.sx, sp.sy, sp.sw, sp.sh, -w / 2, -h / 2, w, h);
  else outlinedText('★', 0, 4, 14, '#e9c366', scale);
  ctx.strokeStyle = sel ? '#3ff2c4' : PLATE[u.side].trim;
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
  ctx.fillStyle = PLATE[u.side].mid;
  ctx.fillRect(-w / 2 - 2, h / 2 + 1, w + 4, 7);
  ctx.strokeStyle = PLATE[u.side].trim;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-w / 2 - 2, h / 2 + 1, w + 4, 7);
  for (let i = 0; i < a.stars; i++) {
    starPath((i - (a.stars - 1) / 2) * 5, h / 2 + 4.6, 2.3, 0.95);
    ctx.fillStyle = '#ffe08a';
    ctx.fill();
  }
  ctx.restore();
  if (sel || scale > 0.8) outlinedText(a.short, p.x - 22, p.y - 40 - (h / 2 + 7) * k, 10, '#f7e5ad', scale);
}
// Sakuradite: a cluster of glowing pink crystals (k scales it; the glow breathes slowly).

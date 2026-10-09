/* Knightmare Conquest UI: The minimap and the map renderer: terrain layer, cities, units, overlays and the frame loop. */
'use strict';
// ======== Minimap ========
function attachMinimap() {
  const mini = $('minimap');
  if (!mini) return;
  const jump = e => {
    const rect = mini.getBoundingClientRect();
    cam.x = ((e.clientX - rect.left) / rect.width) * WORLD_W;
    cam.y = ((e.clientY - rect.top) / rect.height) * WORLD_H;
  };
  mini.onpointerdown = e => {
    jump(e);
    mini.setPointerCapture(e.pointerId);
    mini.dragging = true;
  };
  mini.onpointermove = e => mini.dragging && jump(e);
  mini.onpointerup = () => (mini.dragging = false);
}
const MINI_TERRAIN = {
  sea: '#16405e',
  plains: '#6f8a4b',
  forest: '#4a6e3f',
  mountain: '#7e7460',
  desert: '#bda770',
  snow: '#cfd9df',
  peak: '#4f4a52',
  crater: '#f2bfdc',
  urban: '#6c6f78',
};
function drawMinimap() {
  const mini = $('minimap');
  if (!mini || typeof document.createElement !== 'function') return;
  const w = mini.clientWidth || 220,
    h = Math.round((w * WORLD_H) / WORLD_W),
    dpr = Math.min(devicePixelRatio || 1, 2);
  if (mini.width !== Math.round(w * dpr) || mini.height !== Math.round(h * dpr)) {
    mini.width = Math.round(w * dpr);
    mini.height = Math.round(h * dpr);
    mini.style.height = h + 'px';
    minimapDirty = true;
  }
  const m = mini.getContext('2d');
  if (!m) return;
  if (minimapDirty || !minimapBase) {
    minimapBase ||= document.createElement('canvas');
    minimapBase.width = mini.width;
    minimapBase.height = mini.height;
    const b = minimapBase.getContext('2d');
    if (b) paintMap(b, game, mini.width, mini.height, dpr);
    minimapDirty = false;
  }
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.drawImage(minimapBase, 0, 0);
  // Viewport frame, drawn twice when it straddles the date line.
  const scale = baseScale * zoom,
    vw = (mapSize.w / scale) * (mini.width / WORLD_W),
    vh = (mapSize.h / scale) * (mini.height / WORLD_H),
    vx = (-offset.x / scale) * (mini.width / WORLD_W),
    vy = (-offset.y / scale) * (mini.height / WORLD_H);
  m.strokeStyle = '#ffe9a0';
  m.lineWidth = 1.5 * dpr;
  for (const shift of wraps() ? [-mini.width, 0, mini.width] : [0]) m.strokeRect(vx + shift, vy, vw, vh);
}
// Terrain, territory, cities, mines and units on a small canvas: the minimap, and the map in a mission briefing.
function paintMap(b, g, width, height, dpr, allUnits = false) {
  const sx = width / mapW(g),
    sy = height / mapH(g),
    col = side => (g.factions?.[side] || E.FACTIONS[side] || E.FACTIONS.neutral).color;
  b.fillStyle = '#0d2b40';
  b.fillRect(0, 0, width, height);
  for (const t of g.tiles) {
    const p = hexCenter(t);
    b.fillStyle = MINI_TERRAIN[t.terrain];
    b.fillRect((p.x - R) * sx, (p.y - R) * sy, SQ * R * sx + 1, 1.5 * R * sy + 1);
    if (t.owner && t.terrain !== 'sea') {
      b.fillStyle = col(t.owner) + '88';
      b.fillRect((p.x - R) * sx, (p.y - R) * sy, SQ * R * sx + 1, 1.5 * R * sy + 1);
    }
  }
  for (const s of g.stations) {
    const p = hexCenter(s);
    b.fillStyle = s.capital ? '#ffffff' : col(s.owner);
    const z = (s.capital ? 3.4 : allUnits ? 5 : s.tier >= 3 ? 2.4 : s.tier >= 2 ? 1.8 : 1.2) * dpr;
    b.fillRect(p.x * sx - z / 2, p.y * sy - z / 2, z, z);
  }
  for (const d of g.sites || [])
    if (d.city == null) {
      const p = hexCenter(d),
        z = 2.6 * dpr;
      b.fillStyle = '#ff6fb5';
      b.fillRect(p.x * sx - z / 2, p.y * sy - z / 2, z, z);
    }
  for (const u of g.units)
    if (u.hp > 0 && (allUnits || u.side === g.player)) {
      const p = hexCenter(u),
        z = (allUnits ? 3.5 : 2) * dpr;
      if (allUnits) {
        b.fillStyle = '#000';
        b.fillRect(p.x * sx - z / 2 - dpr, p.y * sy - z / 2 - dpr, z + 2 * dpr, z + 2 * dpr);
      }
      b.fillStyle = allUnits ? col(u.side) : '#7dffb0';
      b.fillRect(p.x * sx - z / 2, p.y * sy - z / 2, z, z);
    }
}
function hexPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30),
      px = x + r * Math.cos(a),
      py = y + r * Math.sin(a);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function drawLine(x, y, tx, ty, color, width = 1, dash = []) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
}
let mapFramePending = false,
  mapFrameDirty = true,
  mapHasPulse = false,
  mapRenderRevision = 0,
  mapPulseTimer = null;
// State changes invalidate the static layer; selection/camera events only wake the renderer.
function requestMapFrame() {
  mapFrameDirty = true;
  if (mapPulseTimer !== null) {
    clearTimeout(mapPulseTimer);
    mapPulseTimer = null;
  }
  if (mapFramePending || document.hidden) return;
  mapFramePending = true;
  requestAnimationFrame(frame);
}
function invalidateMapRender() {
  mapRenderRevision++;
  minimapDirty = true;
  requestMapFrame();
}
ART.onImageReady = requestMapFrame;
function mapAnimating() {
  const dialogOpen = modal.children ? modal.children.length > 0 : !!modal.innerHTML;
  return effects.length > 0 || shake > 0 || flash > 0 || (!dialogOpen && !reducedMotion() && mapHasPulse);
}
function frame(time) {
  mapFramePending = false;
  if (document.hidden) {
    lastTime = 0;
    return;
  }
  if (!mapFrameDirty && !mapAnimating()) return;
  mapFrameDirty = false;
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
  lastTime = time;
  draw(time, dt);
  drawMinimap();
  if (effects.length > 0 || shake > 0 || flash > 0) {
    mapFramePending = true;
    requestAnimationFrame(frame);
  } else if (mapAnimating()) {
    // Slow decorative glows need fewer redraws than movement/combat; input always wakes immediately.
    mapPulseTimer = setTimeout(() => {
      mapPulseTimer = null;
      if (!document.hidden && !mapFramePending) {
        mapFramePending = true;
        requestAnimationFrame(frame);
      }
    }, 25);
  } else lastTime = 0;
}
// Capture listeners schedule after the actual event handlers have updated camera/hover state.
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'wheel', 'keydown', 'click', 'load'])
  document.addEventListener(type, requestMapFrame, { capture: true, passive: true });
if (typeof window.addEventListener === 'function')
  window.addEventListener('resize', requestMapFrame, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (mapPulseTimer !== null) {
    clearTimeout(mapPulseTimer);
    mapPulseTimer = null;
  }
  lastTime = 0;
  if (!document.hidden) requestMapFrame();
});
// Keep the backdrop current when dialogs change, but freeze decorative glows behind them.
if (typeof MutationObserver === 'function')
  new MutationObserver(requestMapFrame).observe(modal, { childList: true, subtree: true, attributes: true });
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
// WC4 base token in faction colors, ringed by frame integrity. Embarked units ride a transport hull.
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
// WC4 commander pin: the commander's framed portrait standing above the unit, with rank stars.
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
function copiesBetween(x, left, right) {
  if (!wraps()) return [x];
  const out = [];
  for (let k = Math.floor((left - x) / WORLD_W); x + k * WORLD_W <= right; k++)
    if (x + k * WORLD_W >= left) out.push(x + k * WORLD_W);
  return out;
}
// Terrain, territory and coastlines only change when the camera moves or a hex changes hands or terrain, so they are
// painted into an offscreen layer with a margin for panning and copied onto the map each frame.
const MAP_LAYER_MARGIN = 200;
let mapLayerCache = null;
function mapLayerFresh(m, scale, dpr, w, h) {
  if (!m || m.tiles !== game.tiles || m.revision !== mapRenderRevision || m.scale !== scale || m.dpr !== dpr || m.w !== w || m.h !== h) return false;
  const slack = MAP_LAYER_MARGIN - 16;
  if (Math.abs(offset.x - m.x) > slack || Math.abs(offset.y - m.y) > slack) return false;
  return true;
}
function mapLayer(scale, detail, dpr, w, h) {
  if (mapLayerFresh(mapLayerCache, scale, dpr, w, h)) return mapLayerCache;
  const M = MAP_LAYER_MARGIN,
    layer = mapLayerCache?.canvas || document.createElement('canvas'),
    width = Math.round((w + 2 * M) * dpr),
    height = Math.round((h + 2 * M) * dpr);
  if (layer.width !== width || layer.height !== height) {
    layer.width = width;
    layer.height = height;
  }
  const main = ctx;
  ctx = layer.getContext('2d');
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(offset.x + M, offset.y + M);
    ctx.scale(scale, scale);
    paintMapLayer(
      scale,
      detail,
      (-M - offset.x) / scale - R * 2,
      (w + M - offset.x) / scale + R * 2,
      (-M - offset.y) / scale - R * 2,
      (h + M - offset.y) / scale + R * 2,
    );
  } finally {
    ctx = main;
  }
  return (mapLayerCache = {
    canvas: layer,
    tiles: game.tiles,
    revision: mapRenderRevision,
    scale,
    dpr,
    w,
    h,
    x: offset.x,
    y: offset.y,
  });
}
function paintMapLayer(scale, detail, left, right, top, bottom) {
  const copies = x => copiesBetween(x, left, right),
    visible = p => p.y >= top && p.y <= bottom;
  // Terrain and territory.
  for (const t of game.tiles) {
    const c = hexCenter(t);
    if (!visible(c)) continue;
    const meta = metaFor(t);
    for (const x of copies(c.x)) {
      hexPath(x, c.y, R + 0.5);
      ctx.fillStyle = t.terrain === 'sea' && meta.coast ? '#1f5c80' : TERRAIN_FILL[t.terrain];
      ctx.fill();
      if (meta.tint && t.terrain !== 'sea') {
        ctx.fillStyle = meta.tint > 0 ? `rgba(255,255,255,${meta.tint})` : `rgba(0,0,0,${-meta.tint})`;
        ctx.fill();
      }
      if (t.owner && t.terrain !== 'sea') {
        ctx.fillStyle = F(t.owner).color + '78';
        ctx.fill();
      }
      if (detail) {
        ctx.strokeStyle = t.terrain === 'sea' ? '#ffffff08' : '#00000018';
        ctx.lineWidth = 0.6 / scale;
        ctx.stroke();
        terrainProps(t, x, c.y, scale);
      }
    }
  }
  // Coastlines and territorial borders.
  for (const t of game.tiles) {
    if (t.terrain === 'sea') continue;
    const c = hexCenter(t);
    if (!visible(c)) continue;
    for (const n of metaFor(t).adj) {
      const coast = n.terrain === 'sea';
      if (!coast && n.owner === t.owner) continue;
      const q = hexCenter(n),
        qx = wrapNear(q.x, c.x),
        angle = Math.atan2(q.y - c.y, qx - c.x),
        i = Math.round(angle / (Math.PI / 3)),
        a = ((i * 60 - 30) * Math.PI) / 180,
        b = ((i * 60 + 30) * Math.PI) / 180;
      for (const x of copies(c.x))
        drawLine(
          x + R * Math.cos(a),
          c.y + R * Math.sin(a),
          x + R * Math.cos(b),
          c.y + R * Math.sin(b),
          coast ? '#e8f4f866' : t.owner ? F(t.owner).color + 'cc' : '#ffffff40',
          (coast ? 1.4 : 2.4) / Math.max(scale, 0.35),
        );
    }
  }
}
function draw(time, dt) {
  if (!canvas || !ctx) return;
  mapHasPulse = false;
  const scale = computeView(),
    { w, h } = mapSize,
    dpr = Math.min(devicePixelRatio || 1, 2),
    detail = R * scale >= 14;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, '#0d2a40');
  wash.addColorStop(1, '#071623');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const jolt = shake ? { x: (Math.random() * 2 - 1) * shake, y: (Math.random() * 2 - 1) * shake } : { x: 0, y: 0 };
  shake = Math.max(0, shake - dt * 30);
  // Terrain, territory and coastlines come from the cached layer, placed where the camera is now.
  const layer = mapLayer(scale, detail, dpr, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(
    layer.canvas,
    Math.round((offset.x - layer.x - MAP_LAYER_MARGIN + jolt.x) * dpr),
    Math.round((offset.y - layer.y - MAP_LAYER_MARGIN + jolt.y) * dpr),
  );
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  ctx.translate(offset.x + jolt.x, offset.y + jolt.y);
  ctx.scale(scale, scale);
  const left = -offset.x / scale - R * 2,
    right = (w - offset.x) / scale + R * 2,
    top = -offset.y / scale - R * 2,
    bottom = (h - offset.y) / scale + R * 2,
    mid = (left + right) / 2;
  const copies = x => copiesBetween(x, left, right);
  const visible = p => p.y >= top && p.y <= bottom;
  // Move and attack overlays.
  for (const k of readyCache.keys()) {
    const [cc, rr] = k.split(',').map(Number),
      t = E.tile(game, cc, rr),
      c = hexCenter(t);
    for (const x of copies(c.x)) {
      hexPath(x, c.y, R - 1.5);
      ctx.fillStyle = t.terrain === 'sea' ? '#4fb6ff40' : '#3ddc7a40';
      ctx.fill();
      ctx.strokeStyle = t.terrain === 'sea' ? '#9fd8ffcc' : '#6dffa5cc';
      ctx.lineWidth = 1.4 / Math.max(scale, 0.4);
      ctx.stroke();
      if (t.terrain === 'sea' && detail) outlinedText('⚓', x, c.y + 5, 12, '#d8f0ff', scale);
    }
  }
  for (const k of targetCache) {
    const [cc, rr] = k.split(',').map(Number),
      c = hexCenter({ c: cc, r: rr });
    for (const x of copies(c.x)) {
      hexPath(x, c.y, R - 1.5);
      ctx.fillStyle = '#e8343050';
      ctx.fill();
      ctx.strokeStyle = '#ff6a5acc';
      ctx.lineWidth = 1.4 / Math.max(scale, 0.4);
      ctx.stroke();
    }
  }
  const selTile =
    selection?.kind === 'unit'
      ? selectedUnit()
      : selection?.kind === 'station'
        ? selectedStation()
        : selection?.kind === 'site'
          ? selectedSite()
          : selection?.kind === 'tile'
            ? selection
            : null;
  if (selTile) for (const x of copies(hexCenter(selTile).x)) {
    if (visible(hexCenter(selTile))) mapHasPulse = true;
    selectedHex({ x, y: hexCenter(selTile).y }, time, scale);
  }
  // Temporary low-profile marker until the replacement dock art is approved.
  // Keep naval hexes unobstructed: cities and naval units render unchanged.
  for (const s of game.stations) {
    if (!s.portLevel || !s.portAt) continue;
    const sea = hexCenter(s.portAt);
    if (!visible(sea)) continue;
    const shore = hexCenter(s);
    const dx = wrapNear(shore.x, sea.x) - sea.x, dy = shore.y - sea.y;
    const distance = Math.hypot(dx, dy) || 1;
    const ox = dx / distance * R * 0.58;
    const oy = dy / distance * R * 0.58;
    for (const x of copies(sea.x))
      outlinedText('⚓', x + ox, sea.y + oy + 4, detail ? 14 : 11,
        F(s.portOwner || s.owner).color, scale, 'Trebuchet MS', true);
  }
  // Cities. Labels scale by strategic importance so dense Europe/China remain readable.
  const pickedCity = selectedStation()?.id;
  for (const s of game.stations) {
    const c = hexCenter(s);
    if (!visible(c)) continue;
    const garrison = E.unitAt(game, s),
      kind = cityKind(s);
    for (const x of copies(c.x)) {
      ctx.save();
      ctx.translate(x, c.y);
      if (!detail) {
        ctx.fillStyle = F(s.owner).color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 / scale;
        const z = s.capital ? 30 : 20;
        ctx.fillRect(-z / 2, -z / 2, z, z);
        ctx.strokeRect(-z / 2, -z / 2, z, z);
        if (s.project) {
          ctx.strokeStyle = '#ff5fae';
          ctx.lineWidth = 4 / scale;
          ctx.strokeRect(-z / 2 - 7, -z / 2 - 7, z + 14, z + 14);
        }
        if ((s.capital || (s.fort && R * scale > 10)) && R * scale > 7)
          outlinedText(s.name, 0, 34, 11, s.capital ? '#fff6d6' : '#eef0dd', scale, 'Trebuchet MS', s.capital);
        ctx.restore();
        continue;
      }
      ctx.globalAlpha = garrison ? 0.78 : 1;
      const size = s.capital ? R * 2.3 : s.fort ? R * 2.05 : R * 1.85;
      if (!ART.drawCity(ctx, kind, s.owner, 0, -6, size)) {
        ctx.fillStyle = F(s.owner).color;
        ctx.fillRect(-14, -14, 28, 28);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#071623';
      ctx.fillRect(-20, 27, 40, 4);
      ctx.fillStyle = s.shield > 0 ? '#9fd8ff' : '#ff6a5a';
      ctx.fillRect(-20, 27, (40 * s.shield) / s.maxShield, 4);
      const showCityName =
        s.id === pickedCity ||
        s.capital ||
        s.fort ||
        R * scale >= 28 ||
        (s.tier >= 3 && R * scale >= 16) ||
        (s.tier >= 2 && R * scale >= 21);
      if (showCityName)
        outlinedText(s.name, 0, garrison ? 50 : 44, 11, s.capital ? '#ffe9a0' : '#eef0dd', scale, 'Trebuchet MS', s.capital);
      if (!garrison) {
        mapBadge(-25, 20, s.owner, scale);
        for (let i = 0; i < s.tier; i++) {
          ctx.fillStyle = '#d8c581';
          ctx.fillRect(25, 10 - i * 5, 3, 3);
        }
      }
      if (s.fort && s.shield > 0 && (s.gunReady || 0) <= game.turn) {
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath();
        ctx.arc(26, -22, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Strategic projects: pink for F.L.E.I.J.A., cyan for the one-charge Eliminator.
      if (s.project) {
        const pulse = 0.5 + 0.5 * Math.sin(time / 300);
        ctx.strokeStyle = `rgba(255,95,174,${0.45 + 0.5 * pulse})`;
        ctx.lineWidth = Math.max(2.5, 2 / scale);
        ctx.beginPath();
        ctx.arc(0, -4, R * (0.95 + 0.07 * pulse), 0, Math.PI * 2);
        ctx.stroke();
        outlinedText(`F.L.E.I.J.A. · ${Math.max(0, s.project.ready - game.turn)}`, 0, -R - 4, 10, '#ff9fd0', scale, 'Trebuchet MS', true);
      }
      if (s.eliminatorProject || s.eliminator) {
        const pulse = 0.5 + 0.5 * Math.sin(time / 260);
        ctx.strokeStyle = `rgba(130,225,255,${0.5 + 0.45 * pulse})`;
        ctx.lineWidth = Math.max(2.2, 1.8 / scale);
        ctx.beginPath();
        ctx.arc(0, -4, R * (0.78 + 0.05 * pulse), 0, Math.PI * 2);
        ctx.stroke();
        outlinedText(
          s.eliminator ? 'ELIMINATOR · READY' : `ELIMINATOR · ${Math.max(0, s.eliminatorProject.ready - game.turn)}`,
          0,
          -R - (s.project ? 16 : 4),
          9,
          '#9eeaff',
          scale,
          'Trebuchet MS',
          true,
        );
      }
      ctx.restore();
    }
  }
  // Cities destroyed by F.L.E.I.J.A.: a charred ring and the city's name for the rest of the conquest.
  for (const ruin of game.ruins || []) {
    const c = hexCenter(ruin);
    if (!visible(c)) continue;
    for (const x of copies(c.x)) {
      ctx.save();
      ctx.translate(x, c.y);
      ctx.strokeStyle = 'rgba(255,154,213,0.75)';
      ctx.lineWidth = Math.max(2, 1.6 / scale);
      ctx.setLineDash([4 / scale, 3 / scale]);
      ctx.beginPath();
      ctx.arc(0, -4, R * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (ruin.capital || R * scale >= 16)
        outlinedText(`${ruin.name} · RUINS`, 0, 44, 10, '#ffb3d6', scale, 'Trebuchet MS', true);
      ctx.restore();
    }
  }
  // Sakuradite: mines on their own hex, and a small crystal on cities that work a deposit.
  for (const d of game.sites || []) {
    const c = hexCenter(d);
    if (!visible(c)) continue;
    const owner = E.depositOwner(game, d);
    for (const x of copies(c.x)) {
      ctx.save();
      ctx.translate(x, c.y);
      if (!detail) {
        if (d.city == null) {
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = '#ff6fb5';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2 / scale;
          ctx.fillRect(-8, -8, 16, 16);
          ctx.strokeRect(-8, -8, 16, 16);
        }
      } else if (d.city == null) {
        mapHasPulse = true;
        drawMine(d, owner, scale, time, !!E.unitAt(game, d));
      } else {
        mapHasPulse = true;
        drawCrystals(-28, -12, 0.5, time);
      }
      ctx.restore();
    }
  }
  // WC4-style tokens drawn back to front: base plate, frame ring, Knightmares, strength bars and commander pins.
  const living = game.units.filter(u => u.hp > 0).sort((a, b) => a.r - b.r || a.c - b.c);
  for (const u of living) {
    const base = animatedPosition(u);
    if (!visible(base)) continue;
    const t = E.TYPES[u.type],
      sel = selection?.kind === 'unit' && selection.id === u.id,
      sea = E.atSea(game, u),
      spent = u.side === game.player && game.phase === game.player ? !hasOrders(u) : u.moved && u.attacked;
    for (const x of copies(base.x)) {
      if (readyUnit(u)) mapHasPulse = true;
      ctx.save();
      ctx.translate(x, base.y);
      if (!detail) {
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = PLATE[u.side].light;
        ctx.fill();
        if (readyUnit(u)) {
          const pulse = 0.82 + 0.18 * Math.sin(time / 210);
          ctx.shadowColor = `rgba(32,245,138,${0.92 * pulse})`;
          ctx.shadowBlur = 9;
        }
        ctx.strokeStyle = sel ? '#3ff2c4' : hostileUnit(u) ? '#ff334d' : PLATE[u.side].trim;
        ctx.lineWidth = 3 / Math.max(scale, 0.3);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        continue;
      }
      drawPlate(u, scale, sea, time);
      ctx.globalAlpha = spent ? 0.6 : 1;
      const size = t.cls === 'super' || t.cls === 'siege' ? R * 2.05 : t.branch === 'Armor' ? R * 1.9 : R * 1.75,
        flip = u.side !== game.player;
      ctx.shadowColor = '#000a';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 4;
      for (let i = Math.min(u.stack - 1, 2); i >= 0; i--)
        ART.drawUnit(ctx, u.type, u.side, (i ? i * 7 * (flip ? -1 : 1) : 0) + (flip ? 4 : -4), -10 - i * 7, size * (i ? 0.86 : 1), size * (i ? 0.86 : 1), flip);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.globalAlpha = 1;
      drawStackBars(u.stack, u.side);
      if (u.morale < 0) outlinedText(u.morale === -3 ? '!' : '↓', 31, -14, 13, '#ffb78c', scale);
      if (u.cargo?.length) outlinedText(`⚓${u.cargo.length}`, -32, -16, 12, '#cfe8ff', scale, 'Trebuchet MS', true);
      if (u.goto && u.side === game.player) outlinedText('⚑', 31, 12, 13, '#ffd76a', scale, 'Trebuchet MS', true);
      ctx.restore();
    }
  }
  if (detail)
    for (const u of living)
      if (u.cmd) {
        const p = animatedPosition(u);
        if (!visible(p)) continue;
        for (const x of copies(p.x)) drawAdmiralPin(u, { x, y: p.y }, scale, selection?.kind === 'unit' && selection.id === u.id);
      }
  for (const k of targetCache) {
    const [c, r] = k.split(',').map(Number),
      p = hexCenter({ c, r });
    for (const x of copies(p.x)) {
      if (visible(p)) mapHasPulse = true;
      drawCrosshair({ x, y: p.y }, time, scale);
    }
  }
  // Campaign warnings: the hexes a scripted strike will hit next turn.
  for (const w of game.campaign?.warnings || []) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 220);
    for (const t of E.within(game, w, w.radius)) {
      const q = hexCenter(t);
      for (const x of copies(q.x)) {
        if (visible(q)) mapHasPulse = true;
        hexPath(x, q.y, R - 2);
        ctx.fillStyle = `rgba(255,70,110,${0.14 + 0.14 * pulse})`;
        ctx.fill();
        ctx.strokeStyle = '#ff9fb8';
        ctx.lineWidth = 1.4 / Math.max(scale, 0.4);
        ctx.stroke();
      }
    }
    const q = hexCenter(w);
    for (const x of copies(q.x)) outlinedText(`⚠ ${w.label || 'Danger'}`, x, q.y - R * 0.9, 13, '#ffd0dc', scale, 'Trebuchet MS', true);
  }
  // F.L.E.I.J.A. targeting: the blast under the cursor, ground zero brighter than the ring.
  if (hover && strikeMode)
    for (const t of E.blastArea(game, hover)) {
      const q = hexCenter(t),
        zero = t.c === hover.c && t.r === hover.r,
        pulse = 0.5 + 0.5 * Math.sin(time / 180);
      for (const x of copies(q.x)) {
        if (visible(q)) mapHasPulse = true;
        hexPath(x, q.y, R - 1.5);
        ctx.fillStyle = zero ? `rgba(255,120,190,${0.45 + 0.2 * pulse})` : 'rgba(255,150,205,0.28)';
        ctx.fill();
        ctx.strokeStyle = '#ffd6ec';
        ctx.lineWidth = 1.6 / Math.max(scale, 0.4);
        ctx.stroke();
      }
    }
  // Standing orders: the selected unit's route to its destination, or the hex under the cursor while choosing one.
  const routed = selectedUnit();
  if (routed?.side === game.player && (routing ? hover : routed.goto)) {
    const to = routing ? hover : routed.goto,
      a = hexCenter(routed),
      b = hexCenter(to),
      bx = wrapNear(b.x, mid),
      ok = !routing || !routeWhy(routed, hover);
    drawLine(wrapNear(a.x, bx), a.y, bx, b.y, ok ? '#ffd76acc' : '#ff8a7a99', 1.6 / scale, [8, 6]);
    hexPath(bx, b.y, R - 3);
    ctx.strokeStyle = ok ? '#ffd76a' : '#ff8a7a';
    ctx.lineWidth = 2.2 / Math.max(scale, 0.4);
    ctx.stroke();
    if (ok) outlinedText('⚑', bx, b.y + 6, 18, '#ffd76a', scale, 'Trebuchet MS', true);
  }
  if (hover) {
    const p = hexCenter(hover),
      u = selectedUnit(),
      hx = wrapNear(p.x, mid);
    hexPath(hx, p.y, R - 1);
    ctx.strokeStyle = '#dcebe769';
    ctx.lineWidth = 1.2 / scale;
    ctx.stroke();
    const pr = u && targetCache.has(E.key(hover)) ? E.preview(game, u.id, hover.c, hover.r) : null;
    if (pr) {
      const a = hexCenter(u);
      drawLine(wrapNear(a.x, hx), a.y, hx, p.y, '#ff9a6ac0', 1.4 / scale, [6, 6]);
      drawEstimate({ x: hx, y: p.y }, pr, scale);
    }
  }
  for (const e of effects) {
    e.life -= dt;
    const b0 = hexCenter(e.to),
      bx = wrapNear(b0.x, mid),
      a0 = e.from ? hexCenter(e.from) : null,
      ax = a0 ? wrapNear(a0.x, bx) : 0,
      fade = Math.max(0, e.life / e.max);
    ctx.globalAlpha = fade;
    if (e.kind === 'shot') {
      ctx.globalAlpha = 1;
      if (!e.shaken && e.max - e.life >= e.delay + e.impact) {
        e.shaken = true;
        bump(e.shake);
      }
      drawCombatShot(e, ax, a0.y, bx, b0.y, scale);
    } else if (e.kind === 'blast') {
      ctx.globalAlpha = 1;
      drawCombatBlast(e, bx, b0.y, scale);
    } else if (e.kind === 'wreck') {
      ctx.globalAlpha = 1;
      drawCombatWreck(e, bx, b0.y);
    } else if (e.kind === 'beam') {
      drawLine(ax, a0.y, bx, b0.y, e.color, (e.heavy ? 9 : 4) / Math.max(scale, 0.5));
      drawLine(ax, a0.y, bx, b0.y, '#fff6dd', (e.heavy ? 3.2 : 1.6) / Math.max(scale, 0.5));
      drawFlash(bx, b0.y, 30 + (1 - fade) * 30, 'rgba(255,190,90,0.6)', 0.9);
    } else if (e.kind === 'boom') {
      const grow = 1 - fade;
      drawFlash(bx, b0.y - 6, 30 + grow * 60, 'rgba(255,120,40,0.75)', 1);
      ctx.fillStyle = `rgba(40,30,30,${0.5 * fade})`;
      ctx.beginPath();
      ctx.arc(bx + 8, b0.y - 18 - grow * 20, 14 + grow * 18, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'fleija') {
      // The F.L.E.I.J.A. sphere: it swells over the blast in the first third of its life, then fades to the ruins.
      const grow = Math.min(1, (1 - fade) / 0.33),
        rad = R * (0.3 + 2.6 * (1 - Math.pow(1 - grow, 3))),
        sphere = ctx.createRadialGradient(bx, b0.y, rad * 0.08, bx, b0.y, rad);
      sphere.addColorStop(0, 'rgba(255,255,255,0.98)');
      sphere.addColorStop(0.55, 'rgba(255,190,225,0.9)');
      sphere.addColorStop(0.9, 'rgba(255,95,174,0.75)');
      sphere.addColorStop(1, 'rgba(255,95,174,0)');
      ctx.fillStyle = sphere;
      ctx.beginPath();
      ctx.arc(bx, b0.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffe6f3';
      ctx.lineWidth = 3 / Math.max(scale, 0.4);
      ctx.stroke();
    } else if (e.kind === 'ring') {
      // Campaign blasts and Gefjun Disturbers: a wave that sweeps out over the hexes they hit.
      const grow = 1 - fade,
        rad = R * SQ * (e.radius + 0.6) * Math.min(1, 0.25 + grow * 2);
      ctx.globalAlpha = fade * 0.45;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(bx, b0.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 4 / Math.max(scale, 0.4);
      ctx.stroke();
      if (e.text) outlinedText(e.text, bx, b0.y - R - grow * 20, 16, '#fff6e8', scale, 'Trebuchet MS', true);
    } else if (e.kind === 'move') {
      drawLine(ax, a0.y, bx, b0.y, e.color, 2 / scale, [7, 6]);
    } else if (e.kind === 'text') {
      const age = 1 - fade,
        pop = e.pop ? 1 + Math.max(0, 1 - age * 7) * 0.7 : 1;
      outlinedText(e.text, bx, b0.y - 28 - age * 28 - (e.dy || 0), (e.size || 14) * pop, e.color, scale, 'Trebuchet MS', true);
    }
    ctx.globalAlpha = 1;
  }
  effects = effects.filter(e => e.life > 0);
  ctx.restore();
  // The F.L.E.I.J.A. flash covers the whole screen, then fades.
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,236,246,${reducedMotion() ? flash * 0.5 : flash})`;
    ctx.fillRect(0, 0, w, h);
    flash = Math.max(0, flash - dt * 0.9);
  }
}
// Optional localhost overrides arrive after the first render; public art is registered before this script.

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
  coast: '#3e7a78',
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
    // draw() may already have queued the next frame (bump() calls requestMapFrame); a second
    // callback per vsync would advance every effect twice as fast.
    if (!mapFramePending) {
      mapFramePending = true;
      requestAnimationFrame(frame);
    }
  } else if (mapAnimating()) {
    // Slow decorative glows need fewer redraws than movement/combat; input always wakes immediately.
    mapPulseTimer = setTimeout(() => {
      mapPulseTimer = null;
      if (!document.hidden && !mapFramePending) {
        mapFramePending = true;
        requestAnimationFrame(frame);
      }
    }, 80);
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

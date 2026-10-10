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
  if (!m || m.tiles !== game.tiles || m.revision !== (game.mapRevision || 0) ||
      m.renderRevision !== mapRenderRevision || m.scale !== scale || m.dpr !== dpr || m.w !== w || m.h !== h) return false;
  const slack = MAP_LAYER_MARGIN - 16;
  return Math.abs(offset.x - m.x) <= slack && Math.abs(offset.y - m.y) <= slack;
}
// Camera-independent cache of *complete* terrain tiles, including grid,
// ownership borders and relief. Reusing the whole base map prevents the 30-50ms
// canvas path rebuild which was still happening after geography was cached.
const MAP_ATLAS_TILE = 960;
const MAP_ATLAS_PAD = 5;
const mapAtlasTiles = new Map();
const mapAtlasWarmQueue = [];
const mapAtlasWarmKeys = new Set();
let mapAtlasIdlePending = false;
let mapAtlasGeneration = 0;
let mapAtlasState = { tiles: null, revision: -1, scale: null };
function refreshMapAtlas(scale) {
  const revision = game.mapRevision || 0;
  if (mapAtlasState.tiles === game.tiles && mapAtlasState.revision === revision && mapAtlasState.scale === scale) return;
  mapAtlasTiles.clear();
  mapAtlasWarmQueue.length = 0;
  mapAtlasWarmKeys.clear();
  mapAtlasGeneration++;
  mapAtlasState = { tiles: game.tiles, revision, scale };
}
function completeMapTile(tx, ty, scale, detail) {
  const key = tx + ',' + ty;
  let item = mapAtlasTiles.get(key);
  if (item) {
    mapAtlasTiles.delete(key);
    mapAtlasTiles.set(key, item);
    return item;
  }
  const worldX = tx * MAP_ATLAS_TILE, worldY = ty * MAP_ATLAS_TILE;
  const width = Math.min(MAP_ATLAS_TILE, WORLD_W - worldX);
  const height = Math.min(MAP_ATLAS_TILE, WORLD_H - worldY);
  const quality = Math.max(0.55, Math.min(1, scale * 1.35));
  const c = document.createElement('canvas');
  c.width = Math.ceil((width + 2 * MAP_ATLAS_PAD) * quality);
  c.height = Math.ceil((height + 2 * MAP_ATLAS_PAD) * quality);
  const oldCtx = ctx;
  ctx = c.getContext('2d');
  try {
    ctx.setTransform(quality, 0, 0, quality,
      (-worldX + MAP_ATLAS_PAD) * quality,
      (-worldY + MAP_ATLAS_PAD) * quality);
    // Culling is by hex centre, so reach one hex beyond the tile: a hex straddling the
    // edge must be painted into both neighbouring tiles (the canvas clips the rest).
    const reach = MAP_ATLAS_PAD + R * 2;
    paintMapLayer(scale, detail,
      worldX - reach, worldX + width + reach,
      worldY - reach, worldY + height + reach);
  } finally {
    ctx = oldCtx;
  }
  item = { canvas: c, worldX, worldY, width, height, quality };
  mapAtlasTiles.set(key, item);
  while (mapAtlasTiles.size > 72) mapAtlasTiles.delete(mapAtlasTiles.keys().next().value);
  return item;
}
// Build the next ring of map tiles during browser idle time, before camera
// dragging reaches it. One tile per idle turn bounds main-thread work; actual
// rendering never waits for prefetch if the player moves faster than idle work.
function scheduleMapPrefetch(scale, detail, firstCol, lastCol, firstRow, lastRow) {
  if (typeof requestIdleCallback !== 'function') return;
  const maxC = Math.ceil(WORLD_W / MAP_ATLAS_TILE) - 1;
  const maxR = Math.ceil(WORLD_H / MAP_ATLAS_TILE) - 1;
  for (let r = Math.max(0, firstRow - 1); r <= Math.min(maxR, lastRow + 1); r++)
    for (let c = Math.max(0, firstCol - 1); c <= Math.min(maxC, lastCol + 1); c++) {
      if (c >= firstCol && c <= lastCol && r >= firstRow && r <= lastRow) continue;
      const key = c + ',' + r;
      if (mapAtlasTiles.has(key) || mapAtlasWarmKeys.has(key)) continue;
      mapAtlasWarmKeys.add(key);
      mapAtlasWarmQueue.push({ c, r, scale, detail, generation: mapAtlasGeneration });
    }
  if (mapAtlasIdlePending || !mapAtlasWarmQueue.length) return;
  mapAtlasIdlePending = true;
  function warm(deadline) {
    if (mapAtlasWarmQueue.length && deadline.timeRemaining() > 8) {
      const job = mapAtlasWarmQueue.shift();
      mapAtlasWarmKeys.delete(job.c + ',' + job.r);
      if (job.generation === mapAtlasGeneration && job.scale === mapAtlasState.scale)
        completeMapTile(job.c, job.r, job.scale, job.detail);
    }
    if (mapAtlasWarmQueue.length) requestIdleCallback(warm);
    else mapAtlasIdlePending = false;
  }
  requestIdleCallback(warm);
}
function drawMapFromAtlas(scale, detail, left, right, top, bottom) {
  refreshMapAtlas(scale);
  const firstRow = Math.max(0, Math.floor(top / MAP_ATLAS_TILE));
  const lastRow = Math.min(Math.ceil(WORLD_H / MAP_ATLAS_TILE) - 1, Math.floor(bottom / MAP_ATLAS_TILE));
  for (let k = Math.floor(left / WORLD_W) - 1; k <= Math.ceil(right / WORLD_W); k++) {
    const shift = k * WORLD_W;
    const a = left - shift, b = right - shift;
    if (b <= 0 || a >= WORLD_W) continue;
    const firstCol = Math.max(0, Math.floor(a / MAP_ATLAS_TILE));
    const lastCol = Math.min(Math.ceil(WORLD_W / MAP_ATLAS_TILE) - 1, Math.floor(b / MAP_ATLAS_TILE));
    for (let row = firstRow; row <= lastRow; row++)
      for (let col = firstCol; col <= lastCol; col++) {
        const t = completeMapTile(col, row, scale, detail);
        // Draw each tile with its painted padding so neighbours overlap: abutting at a
        // fractional pixel edge left a faint hairline along every tile seam.
        const pad = MAP_ATLAS_PAD;
        ctx.drawImage(t.canvas, 0, 0, (t.width + 2 * pad) * t.quality, (t.height + 2 * pad) * t.quality,
          t.worldX + shift - pad, t.worldY - pad, t.width + 2 * pad, t.height + 2 * pad);
      }
    if (firstCol <= lastCol && firstRow <= lastRow)
      scheduleMapPrefetch(scale, detail, firstCol, lastCol, firstRow, lastRow);
  }
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
    const left = (-M - offset.x) / scale - R * 2;
    const right = (w + M - offset.x) / scale + R * 2;
    const top = (-M - offset.y) / scale - R * 2;
    const bottom = (h + M - offset.y) / scale + R * 2;
    // Very distant views use the low-resolution overview directly; otherwise
    // cache geography AND its tactical overlay in world-anchored chunks.
    if (game.wrap && scale >= 0.33) drawMapFromAtlas(scale, detail, left, right, top, bottom);
    else paintMapLayer(scale, detail, left, right, top, bottom);
  } finally {
    ctx = main;
  }
  return (mapLayerCache = {
    canvas: layer,
    tiles: game.tiles,
    revision: game.mapRevision || 0,
    renderRevision: mapRenderRevision,
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
  // Geography is a continuous visual atlas. Hexes remain the *logical* map;
  // they are not used as filled polygon art unless the device lacks ImageData.
  const atlas = GEOGRAPHY.paint(ctx, game, left, right, top, bottom, scale);
  if (!atlas) {
    for (const t of game.tiles) {
      const c = hexCenter(t);
      if (!visible(c)) continue;
      for (const x of copies(c.x)) {
        hexPath(x, c.y, R + 0.5);
        ctx.fillStyle = TERRAIN_FILL[t.terrain] || TERRAIN_FILL.plains;
        ctx.fill();
        if (t.owner && t.terrain !== 'sea') {
          ctx.fillStyle = F(t.owner).color + '30';
          ctx.fill();
        }
      }
    }
  }
  // A faint tactical grid is a separate *overlay*, not the map's terrain.
  // At distant zoom levels the grid vanishes altogether; selection and
  // movement/attack ranges continue to use their original vivid hex outlines.
  if (detail && R * scale >= 22) {
    // Tactical grid gains contrast as the camera zooms closer to individual hexes.
    const hexPixels = R * scale;
    const strength = hexPixels < 18 ? 0.025 :
      hexPixels < 26 ? 0.045 + (hexPixels - 18) * 0.006 :
      hexPixels < 38 ? 0.093 + (hexPixels - 26) * 0.008 :
      Math.min(0.30, 0.189 + (hexPixels - 38) * 0.005);
    ctx.lineWidth = (hexPixels >= 32 ? 0.82 : 0.55) / Math.max(scale, 0.25);
    for (const t of game.tiles) {
      const c = hexCenter(t);
      if (!visible(c)) continue;
      ctx.strokeStyle =
        t.terrain === 'sea'
          ? `rgba(8,28,42,${(strength * 0.76).toFixed(3)})`
          : `rgba(18,31,37,${strength.toFixed(3)})`;
      for (const x of copies(c.x)) {
        hexPath(x, c.y, R - 0.65);
        ctx.stroke();
      }
    }
    // Small icons read as relief on a real atlas rather than stamped hex fills.
    if (R * scale >= 24)
      for (const t of game.tiles) {
        if (t.terrain === 'plains') continue;
        if (game.wrap && !['crater', 'urban', 'mountain', 'peak'].includes(t.terrain)) continue;
        if (game.wrap && (t.terrain === 'mountain' || t.terrain === 'peak') && R * scale < 32) continue;
        const c = hexCenter(t);
        if (!visible(c)) continue;
        ctx.globalAlpha = t.terrain === 'crater' || t.terrain === 'urban' ? 0.8 : game.wrap ? 0.24 : 0.43;
        for (const x of copies(c.x)) terrainProps(t, x, c.y, scale);
      }
    ctx.globalAlpha = 1;
  }
  // Political borders are tactical information and still align to tile
  // ownership. Coastlines are already smoothed by the visual atlas; drawing
  // the old edge-by-edge hex coastline here would reintroduce the mosaic.
  if (R * scale >= 22) for (const t of game.tiles) {
    if (t.terrain === 'sea') continue;
    const c = hexCenter(t);
    if (!visible(c)) continue;
    for (const n of metaFor(t).adj) {
      if (n.terrain === 'sea' || n.owner === t.owner) continue;
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
          t.owner ? F(t.owner).color + '77' : '#ffffff35',
          1.2 / Math.max(scale, 0.35),
        );
    }
  }
}

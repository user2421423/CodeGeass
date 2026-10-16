function copiesBetween(x, left, right) {
  if (!wraps()) return [x];
  const out = [];
  for (let k = Math.floor((left - x) / WORLD_W); x + k * WORLD_W <= right; k++)
    if (x + k * WORLD_W >= left) out.push(x + k * WORLD_W);
  return out;
}
// Terrain, territory and coastlines only change when the camera moves or a hex changes hands or terrain, so they are
// painted into an offscreen layer with a margin for panning and copied onto the map each frame. Unit moves, selection
// and other UI changes do not repaint it: everything it draws is keyed by game.tiles and game.mapRevision.
const MAP_LAYER_MARGIN = 200;
let mapLayerCache = null;
function mapLayerFresh(m, scale, dpr, w, h) {
  if (!m || m.tiles !== game.tiles || m.revision !== (game.mapRevision || 0) ||
      m.scale !== scale || m.dpr !== dpr || m.w !== w || m.h !== h) return false;
  const slack = MAP_LAYER_MARGIN - 16;
  return Math.abs(offset.x - m.x) <= slack && Math.abs(offset.y - m.y) <= slack;
}
// The static geographic layer is cached independently of the dynamic political
// layer. A capture invalidates tint/borders, never the costly coastlines.
const MAP_ATLAS_TILE = 960;
const MAP_ATLAS_PAD = 5;
const MAP_ATLAS_SCALE_STEP = 1.25;
const mapAtlasTiles = new Map(); // legacy Conquest / combined layers
const mapAtlasStaticTiles = new Map();
const mapAtlasPoliticalTiles = new Map();
const mapAtlasWarmQueue = [];
const mapAtlasWarmKeys = new Set();
let mapAtlasIdlePending = false;
let mapAtlasLastNavigation = -Infinity;
function noteMapNavigation() { mapAtlasLastNavigation = performance.now(); }
let mapAtlasGeneration = 0;
let mapAtlasState = { tiles: null, revision: -1, terrainRevision: -1, scale: null };
let mapAtlasFallback = { id: null, image: null, ready: false, hires: false };
// Keep a few recently viewed theatre maps decoded, not all 37 at once.
const mapAtlasHiResImages = new Map();
function preloadRegionalMapImage(id) {
  if (!id || typeof Image === 'undefined') return null;
  if (mapAtlasHiResImages.has(id)) {
    const cached = mapAtlasHiResImages.get(id);
    mapAtlasHiResImages.delete(id);
    mapAtlasHiResImages.set(id, cached);
    return cached;
  }
  const entry = { image: new Image(), ready: false, failed: false, listeners: [] };
  entry.image.onload = () => {
    entry.ready = true;
    for (const notify of entry.listeners.splice(0)) notify(entry.image);
  };
  entry.image.onerror = () => {
    entry.failed = true;
    entry.listeners.length = 0;
  };
  mapAtlasHiResImages.set(id, entry);
  while (mapAtlasHiResImages.size > 3)
    mapAtlasHiResImages.delete(mapAtlasHiResImages.keys().next().value);
  entry.image.src = 'scenario-hires/' + encodeURIComponent(id) + '.webp';
  return entry;
}
let mapAtlasStrategicOwners = { tiles: null, original: null, revision: -1, canvas: null };
// Last fully painted level of detail. Reuse it during zoom rather than
// flashing back to a different background every time the LOD key changes.
let mapAtlasShown = { tiles: null, revision: -1, terrainRevision: -1, scale: null };
let mapAtlasFade = { target: null, source: null, started: 0 };
const MAP_ATLAS_CROSSFADE_MS = 150;
const mapAtlasPerformance = {
  hits: 0, misses: 0, strategicFrames: 0, snapshotFrames: 0, atomicAtlasFrames: 0,
  reusedZoomFrames: 0, blendedZoomFrames: 0,
  basePaints: 0, politicalPaints: 0,
  synchronousPaints: 0, deferredPaints: 0, paintMs: 0, maxPaintMs: 0,
};
if (typeof window !== 'undefined') window.KNIGHTMARE_MAP_PERF = {
  snapshot: () => ({ ...mapAtlasPerformance, queued: mapAtlasWarmQueue.length,
    staticChunks: mapAtlasStaticTiles.size, politicalChunks: mapAtlasPoliticalTiles.size,
    combinedChunks: mapAtlasTiles.size, fallbackReady: mapAtlasFallback.ready,
    highResolutionBackdrop: mapAtlasFallback.hires }),
  reset: () => {
    for (const k of Object.keys(mapAtlasPerformance)) mapAtlasPerformance[k] = 0;
  },
};
function regionalMapLayers() {
  if (game.mode !== 'scenario' || !game.scenario?.projection) return false;
  const meta = E.scenarios?.byId?.[game.scenario.id]?.meta?.map;
  // Bering uses a completely different, scenario-specific painter.
  return !meta?.painter;
}
function mapAtlasTileSize(scale) {
  // Small bounded chunks keep each deferred painting job short. Oversized
  // strategic chunks previously required thousands of hex operations at once.
  return !game.wrap ? MAP_ATLAS_TILE : MAP_ATLAS_TILE;
}
function mapAtlasRenderScale(scale) {
  if (game.wrap) return scale;
  const pixels = R * scale;
  const stops = [0, 14, 22, 24, 32, Infinity];
  const band = pixels < 14 ? 0 : pixels < 22 ? 1 :
    pixels < 24 ? 2 : pixels < 32 ? 3 : 4;
  const rounded = Math.pow(MAP_ATLAS_SCALE_STEP,
    Math.ceil(Math.log(Math.max(0.001, scale)) / Math.log(MAP_ATLAS_SCALE_STEP)));
  return Math.max(stops[band] / R,
    Math.min(rounded, stops[band + 1] === Infinity
      ? rounded : (stops[band + 1] - 0.001) / R));
}
function mapAtlasKey(tx, ty, scale, tileSize) {
  return scale.toFixed(7) + ':' + tileSize + ':' + tx + ',' + ty;
}
function shouldUseMapAtlas(scale) { return !game.wrap || scale >= 0.33; }
function mapAtlasCanvasSet(layer) {
  return layer === 'static' ? mapAtlasStaticTiles :
    layer === 'political' ? mapAtlasPoliticalTiles : mapAtlasTiles;
}
function updateMapFallback() {
  const id = regionalMapLayers() ? game.scenario.id : null;
  if (mapAtlasFallback.id === id) return;
  mapAtlasFallback = { id, image: null, ready: false, hires: false };
  if (!id || typeof Image === 'undefined') return;
  const sourceId = id;
  const notify = (img, hires) => {
    if (mapAtlasFallback.id !== sourceId || (mapAtlasFallback.hires && !hires)) return;
    mapAtlasFallback.image = img;
    mapAtlasFallback.ready = true;
    mapAtlasFallback.hires = hires;
    // Low-resolution tiles left in the queue are superseded by the bitmap.
    if (R * (baseScale * zoom) < 22 && mapAtlasWarmQueue.length) {
      mapAtlasWarmQueue.length = 0;
      mapAtlasWarmKeys.clear();
      mapAtlasGeneration++;
    }
    if (typeof requestMapFrame === 'function') requestMapFrame();
  };
  const high = preloadRegionalMapImage(id);
  if (high?.ready) {
    notify(high.image, true);
    return;
  }
  if (high && !high.failed)
    high.listeners.push(img => notify(img, true));
  // The smaller gallery image acts as a fast network fallback only; it must
  // never be mixed with some detailed chunks in the same viewport.
  const low = new Image();
  low.onload = () => notify(low, false);
  low.onerror = () => {
    if (mapAtlasFallback.id === sourceId && !mapAtlasFallback.ready) {
      // The regular atlas can still render if static imagery is unavailable.
      mapAtlasFallback.failed = true;
      if (typeof requestMapFrame === 'function') requestMapFrame();
    }
  };
  low.src = 'scenario-previews/' + encodeURIComponent(id) + '.webp';
}
function refreshMapAtlas(scale) {
  const revision = game.mapRevision || 0;
  const terrainRevision = game.mapTerrainRevision || 0;
  if (mapAtlasState.tiles === game.tiles &&
      mapAtlasState.revision === revision &&
      mapAtlasState.terrainRevision === terrainRevision &&
      mapAtlasState.scale === scale) return;
  if (mapAtlasState.tiles !== game.tiles ||
      mapAtlasState.terrainRevision !== terrainRevision) {
    mapAtlasTiles.clear();
    mapAtlasStaticTiles.clear();
    mapAtlasPoliticalTiles.clear();
    mapAtlasFallback.id = null;
    mapAtlasShown = { tiles: null, revision: -1, terrainRevision: -1, scale: null };
    mapAtlasFade = { target: null, source: null, started: 0 };
    mapAtlasStrategicOwners = { tiles: game.tiles,
      original: game.tiles.map(t => t.owner), revision: -1, canvas: null };
  } else if (mapAtlasState.revision !== revision) {
    mapAtlasTiles.clear();
    mapAtlasPoliticalTiles.clear();
    mapAtlasShown = { tiles: null, revision: -1, terrainRevision: -1, scale: null };
    mapAtlasFade = { target: null, source: null, started: 0 };
  }
  mapAtlasWarmQueue.length = 0;
  mapAtlasWarmKeys.clear();
  mapAtlasGeneration++;
  mapAtlasState = { tiles: game.tiles, revision, terrainRevision, scale };
  updateMapFallback();
}
function completeMapTile(tx, ty, scale, detail, tileSize, layer = 'all', deferred = false) {
  const key = mapAtlasKey(tx, ty, scale, tileSize);
  const cache = mapAtlasCanvasSet(layer);
  let item = cache.get(key);
  if (item) {
    mapAtlasPerformance.hits++;
    cache.delete(key);
    cache.set(key, item);
    return item;
  }
  mapAtlasPerformance.misses++;
  const worldX = tx * tileSize, worldY = ty * tileSize;
  const width = Math.min(tileSize, WORLD_W - worldX);
  const height = Math.min(tileSize, WORLD_H - worldY);
  const quality = game.wrap
    ? Math.max(0.55, Math.min(1, scale * 1.35))
    : Math.max(0.18, Math.min(1, scale * 2));
  const c = document.createElement('canvas');
  c.width = Math.ceil((width + 2 * MAP_ATLAS_PAD) * quality);
  c.height = Math.ceil((height + 2 * MAP_ATLAS_PAD) * quality);
  const oldCtx = ctx, start = performance.now();
  ctx = c.getContext('2d');
  try {
    ctx.setTransform(quality, 0, 0, quality,
      (-worldX + MAP_ATLAS_PAD) * quality,
      (-worldY + MAP_ATLAS_PAD) * quality);
    const reach = MAP_ATLAS_PAD + R * 2;
    paintMapLayer(scale, detail,
      worldX - reach, worldX + width + reach,
      worldY - reach, worldY + height + reach, layer);
  } finally {
    ctx = oldCtx;
  }
  const ms = performance.now() - start;
  mapAtlasPerformance.paintMs += ms;
  mapAtlasPerformance.maxPaintMs = Math.max(ms, mapAtlasPerformance.maxPaintMs);
  if (layer === 'static') mapAtlasPerformance.basePaints++;
  if (layer === 'political') mapAtlasPerformance.politicalPaints++;
  if (deferred) mapAtlasPerformance.deferredPaints++;
  else mapAtlasPerformance.synchronousPaints++;
  item = { canvas: c, worldX, worldY, width, height, quality };
  cache.set(key, item);
  while (cache.size > (layer === 'all' ? 72 : 96))
    cache.delete(cache.keys().next().value);
  return item;
}
function queueMapAtlasTile(col, row, scale, detail, tileSize, layer, urgent = false) {
  const key = layer + ':' + mapAtlasKey(col, row, scale, tileSize);
  if (mapAtlasCanvasSet(layer).has(mapAtlasKey(col, row, scale, tileSize)) ||
      mapAtlasWarmKeys.has(key)) return;
  mapAtlasWarmKeys.add(key);
  const job = { col, row, scale, detail, tileSize, layer, key, generation: mapAtlasGeneration };
  if (urgent) mapAtlasWarmQueue.unshift(job);
  else mapAtlasWarmQueue.push(job);
  if (mapAtlasIdlePending) return;
  mapAtlasIdlePending = true;
  function warm(deadline) {
    // A slow geography chunk can exceed 100ms on Japan. Never begin it while
    // the user is panning or zooming; use the static backdrop until they stop.
    if (mapAtlasWarmQueue.length && performance.now() - mapAtlasLastNavigation < 180) {
      schedule(warm);
      return;
    }
    // Exactly one chunk per idle task. Do not perform an unbounded tile loop
    // in a pointer-move or requestAnimationFrame callback.
    const job = mapAtlasWarmQueue.shift();
    if (job) {
      mapAtlasWarmKeys.delete(job.key);
      if (job.generation === mapAtlasGeneration && job.scale === mapAtlasState.scale) {
        completeMapTile(job.col, job.row, job.scale, job.detail, job.tileSize,
          job.layer, true);
        if (typeof requestMapFrame === 'function') requestMapFrame();
      }
    }
    if (mapAtlasWarmQueue.length) schedule(warm);
    else mapAtlasIdlePending = false;
  }
  function schedule(fn) {
    if (typeof requestIdleCallback === 'function')
      requestIdleCallback(fn, { timeout: 120 });
    else setTimeout(() => fn({ timeRemaining: () => 0 }), 16);
  }
  schedule(warm);
}
function scheduleMapPrefetch(scale, detail, tileSize, firstCol, lastCol, firstRow, lastRow, layers) {
  const maxC = Math.ceil(WORLD_W / tileSize) - 1;
  const maxR = Math.ceil(WORLD_H / tileSize) - 1;
  for (let r = Math.max(0, firstRow - 1); r <= Math.min(maxR, lastRow + 1); r++)
    for (let c = Math.max(0, firstCol - 1); c <= Math.min(maxC, lastCol + 1); c++) {
      if (c >= firstCol && c <= lastCol && r >= firstRow && r <= lastRow) continue;
      for (const layer of layers) queueMapAtlasTile(c, r, scale, detail, tileSize, layer);
    }
}
// At strategic zoom the already published troop-free WebP is sufficiently
// detailed. This avoids re-tracing thousands of Japanese coastline vertices
// just to move the camera. Tactical zoom still uses the high-resolution atlas.
// Changes in ownership are a separate tiny overlay, not baked into geography.
function drawStrategicOwnershipDelta() {
  if (!mapAtlasFallback.ready) return;
  const state = mapAtlasStrategicOwners;
  if (state.tiles !== game.tiles) return;
  const revision = game.mapRevision || 0;
  if (state.revision !== revision) {
    const source = mapAtlasFallback.image;
    const c = state.canvas || document.createElement('canvas');
    c.width = source.naturalWidth;
    c.height = source.naturalHeight;
    const originalCtx = ctx;
    let changed = 0;
    ctx = c.getContext('2d');
    try {
      ctx.setTransform(c.width / WORLD_W, 0, 0, c.height / WORLD_H, 0, 0);
      for (let i = 0; i < game.tiles.length; i++) {
        const t = game.tiles[i];
        if (t.owner === state.original[i] ||
            t.terrain === 'sea' || t.terrain === 'offmap') continue;
        const x = SQ * R * (t.c + 0.5 * (t.r & 1)) + R;
        const y = R * 1.5 * t.r + R;
        hexPath(x, y, R + 0.5);
        changed++;
        ctx.fillStyle = t.owner ? F(t.owner).color : '#91a799';
        ctx.fill();
      }
    } finally {
      ctx = originalCtx;
    }
    state.canvas = changed ? c : null;
    state.revision = revision;
  }
  if (state.canvas)
    ctx.drawImage(state.canvas, 0, 0, WORLD_W, WORLD_H);
}
// Only present a complete LOD. Unlike the old progressive switch, these
// helpers never draw a rectangle from a different map representation.
function cachedRegionalAtlas(scale, left, right, top, bottom, draw = false) {
  const tileSize = mapAtlasTileSize(scale);
  const maxCol = Math.ceil(WORLD_W / tileSize) - 1;
  const maxRow = Math.ceil(WORLD_H / tileSize) - 1;
  const firstCol = Math.max(0, Math.floor(left / tileSize));
  const lastCol = Math.min(maxCol, Math.floor(right / tileSize));
  const firstRow = Math.max(0, Math.floor(top / tileSize));
  const lastRow = Math.min(maxRow, Math.floor(bottom / tileSize));
  if (lastCol < firstCol || lastRow < firstRow) return true;
  if (!draw) {
    for (let row = firstRow; row <= lastRow; row++)
      for (let col = firstCol; col <= lastCol; col++) {
        const key = mapAtlasKey(col, row, scale, tileSize);
        if (!mapAtlasStaticTiles.has(key) || !mapAtlasPoliticalTiles.has(key))
          return false;
      }
    return true;
  }
  for (let row = firstRow; row <= lastRow; row++)
    for (let col = firstCol; col <= lastCol; col++) {
      const key = mapAtlasKey(col, row, scale, tileSize);
      for (const cache of [mapAtlasStaticTiles, mapAtlasPoliticalTiles]) {
        const tile = cache.get(key);
        if (!tile) return false;
        mapAtlasPerformance.hits++;
        const pad = MAP_ATLAS_PAD;
        ctx.drawImage(tile.canvas, 0, 0,
          (tile.width + 2 * pad) * tile.quality,
          (tile.height + 2 * pad) * tile.quality,
          tile.worldX - pad, tile.worldY - pad,
          tile.width + 2 * pad, tile.height + 2 * pad);
      }
    }
  return true;
}
function queueRegionalAtlas(scale, detail, left, right, top, bottom) {
  const tileSize = mapAtlasTileSize(scale);
  const firstCol = Math.max(0, Math.floor(left / tileSize));
  const lastCol = Math.min(Math.ceil(WORLD_W / tileSize) - 1, Math.floor(right / tileSize));
  const firstRow = Math.max(0, Math.floor(top / tileSize));
  const lastRow = Math.min(Math.ceil(WORLD_H / tileSize) - 1, Math.floor(bottom / tileSize));
  for (let row = firstRow; row <= lastRow; row++)
    for (let col = firstCol; col <= lastCol; col++) {
      // Paint the base before the ownership layer; each chunk is only drawn
      // once the entire visible camera is ready.
      // Jobs are prepended; tint first means base executes first.
      queueMapAtlasTile(col, row, scale, detail, tileSize, 'political', true);
      queueMapAtlasTile(col, row, scale, detail, tileSize, 'static', true);
    }
  if (firstCol <= lastCol && firstRow <= lastRow)
    scheduleMapPrefetch(scale, detail, tileSize,
      firstCol, lastCol, firstRow, lastRow, ['static','political']);
}
function shownRegionalAtlasScale() {
  return mapAtlasShown.tiles === game.tiles &&
    mapAtlasShown.revision === (game.mapRevision || 0) &&
    mapAtlasShown.terrainRevision === (game.mapTerrainRevision || 0)
      ? mapAtlasShown.scale : null;
}
function displayRegionalAtlas(scale, left, right, top, bottom) {
  if (!mapAtlasFallback.ready) {
    cachedRegionalAtlas(scale, left, right, top, bottom, true);
    return;
  }
  const previous = shownRegionalAtlasScale();
  if (previous === scale) {
    mapAtlasFade.target = null;
    cachedRegionalAtlas(scale, left, right, top, bottom, true);
    return;
  }
  // A cached previously completed scale is the most faithful intermediate
  // zoom representation; use the whole-world WebP only when it cannot cover
  // the entire viewport. Blend in the new cached LOD without hard flicker.
  const sourceScale = previous !== null &&
    cachedRegionalAtlas(previous, left, right, top, bottom)
      ? previous : null;
  if (mapAtlasFade.target !== scale || mapAtlasFade.source !== sourceScale) {
    mapAtlasFade = { target: scale, source: sourceScale, started: performance.now() };
  }
  if (sourceScale !== null) {
    cachedRegionalAtlas(sourceScale, left, right, top, bottom, true);
    mapAtlasPerformance.reusedZoomFrames++;
  } else {
    ctx.drawImage(mapAtlasFallback.image, 0, 0, WORLD_W, WORLD_H);
    drawStrategicOwnershipDelta();
  }
  const alpha = Math.min(1,
    (performance.now() - mapAtlasFade.started) / MAP_ATLAS_CROSSFADE_MS);
  ctx.save();
  ctx.globalAlpha = alpha;
  cachedRegionalAtlas(scale, left, right, top, bottom, true);
  ctx.restore();
  if (alpha < 1) {
    mapAtlasPerformance.blendedZoomFrames++;
    if (typeof requestMapFrame === 'function') requestMapFrame();
  } else {
    mapAtlasShown = { tiles: game.tiles, revision: game.mapRevision || 0,
      terrainRevision: game.mapTerrainRevision || 0, scale };
    mapAtlasFade.target = null;
  }
}
function drawMapFromAtlas(scale, detail, left, right, top, bottom) {
  const paintScale = mapAtlasRenderScale(scale);
  const paintDetail = R * paintScale >= 14;
  const tileSize = mapAtlasTileSize(paintScale);
  refreshMapAtlas(paintScale);
  const split = regionalMapLayers();
  const layers = split ? ['static', 'political'] : ['all'];
  const defer = split && mapAtlasFallback.ready;
  // Never let the first frame synchronously rasterize a detailed theatre map.
  // Asset loading happens asynchronously; regular legacy painting remains a
  // safety net when both images fail to load.
  if (split && !mapAtlasFallback.ready && !mapAtlasFallback.failed) return;
  // Use a stable full-map image at low zoom. Fade *out* of the last
  // completed detailed LOD instead of suddenly swapping map images.
  if (defer && R * scale < 22) {
    if (mapAtlasWarmQueue.length) {
      mapAtlasWarmQueue.length = 0;
      mapAtlasWarmKeys.clear();
      mapAtlasGeneration++;
    }
    mapAtlasPerformance.strategicFrames++;
    const old = shownRegionalAtlasScale();
    if (old !== null && cachedRegionalAtlas(old, left, right, top, bottom)) {
      if (mapAtlasFade.target !== 'overview' || mapAtlasFade.source !== old)
        mapAtlasFade = { target: 'overview', source: old, started: performance.now() };
      cachedRegionalAtlas(old, left, right, top, bottom, true);
      const alpha = Math.min(1,
        (performance.now() - mapAtlasFade.started) / MAP_ATLAS_CROSSFADE_MS);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(mapAtlasFallback.image, 0, 0, WORLD_W, WORLD_H);
      drawStrategicOwnershipDelta();
      ctx.restore();
      if (alpha < 1) {
        mapAtlasPerformance.blendedZoomFrames++;
        if (typeof requestMapFrame === 'function') requestMapFrame();
      } else {
        mapAtlasShown.scale = null;
        mapAtlasFade.target = null;
      }
    } else {
      ctx.drawImage(mapAtlasFallback.image, 0, 0, WORLD_W, WORLD_H);
      drawStrategicOwnershipDelta();
    }
    return;
  }
  // Regional tactical mode behaves like Conquest's cached world atlas:
  // when all visible tiles are ready it draws only cached canvases; while
  // another zoom level is warming, it retains an older complete LOD.
  if (defer) {
    const ready = cachedRegionalAtlas(paintScale, left, right, top, bottom);
    // Keep an already finished LOD on screen while the wheel/pinch gesture
    // is still active. Switch only after navigation settles.
    if (performance.now() - mapAtlasLastNavigation < 180 &&
        shownRegionalAtlasScale() !== paintScale) {
      const old = shownRegionalAtlasScale();
      if (old !== null && cachedRegionalAtlas(old, left, right, top, bottom)) {
        cachedRegionalAtlas(old, left, right, top, bottom, true);
        mapAtlasPerformance.reusedZoomFrames++;
      } else {
        ctx.drawImage(mapAtlasFallback.image, 0, 0, WORLD_W, WORLD_H);
        drawStrategicOwnershipDelta();
      }
      if (!ready) queueRegionalAtlas(paintScale, paintDetail, left, right, top, bottom);
      return;
    }
    if (!ready) {
      mapAtlasPerformance.snapshotFrames++;
      const old = shownRegionalAtlasScale();
      if (old !== null &&
          cachedRegionalAtlas(old, left, right, top, bottom)) {
        cachedRegionalAtlas(old, left, right, top, bottom, true);
        mapAtlasPerformance.reusedZoomFrames++;
      } else {
        ctx.drawImage(mapAtlasFallback.image, 0, 0, WORLD_W, WORLD_H);
        drawStrategicOwnershipDelta();
      }
      queueRegionalAtlas(paintScale, paintDetail, left, right, top, bottom);
      return;
    }
    mapAtlasPerformance.atomicAtlasFrames++;
    displayRegionalAtlas(paintScale, left, right, top, bottom);
    return;
  }
  const firstRow = Math.max(0, Math.floor(top / tileSize));
  const lastRow = Math.min(Math.ceil(WORLD_H / tileSize) - 1, Math.floor(bottom / tileSize));
  const firstShift = wraps() ? Math.floor(left / WORLD_W) - 1 : 0;
  const lastShift = wraps() ? Math.ceil(right / WORLD_W) : 0;
  for (let k = firstShift; k <= lastShift; k++) {
    const shift = k * WORLD_W;
    const a = left - shift, b = right - shift;
    if (b <= 0 || a >= WORLD_W) continue;
    const firstCol = Math.max(0, Math.floor(a / tileSize));
    const lastCol = Math.min(Math.ceil(WORLD_W / tileSize) - 1, Math.floor(b / tileSize));
    for (let row = firstRow; row <= lastRow; row++)
      for (let col = firstCol; col <= lastCol; col++) {
        for (const layer of layers) {
          const key = mapAtlasKey(col, row, paintScale, tileSize);
          let tile = mapAtlasCanvasSet(layer).get(key);
          if (tile) mapAtlasPerformance.hits++;
          if (!tile) {
            if (defer) {
              queueMapAtlasTile(col, row, paintScale, paintDetail, tileSize, layer, true);
              continue;
            }
            tile = completeMapTile(col, row, paintScale, paintDetail, tileSize, layer);
          }
          const pad = MAP_ATLAS_PAD;
          ctx.drawImage(tile.canvas, 0, 0,
            (tile.width + 2 * pad) * tile.quality,
            (tile.height + 2 * pad) * tile.quality,
            tile.worldX + shift - pad, tile.worldY - pad,
            tile.width + 2 * pad, tile.height + 2 * pad);
        }
      }
    if (firstCol <= lastCol && firstRow <= lastRow)
      scheduleMapPrefetch(paintScale, paintDetail, tileSize,
        firstCol, lastCol, firstRow, lastRow, layers);
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
    if (shouldUseMapAtlas(scale)) drawMapFromAtlas(scale, detail, left, right, top, bottom);
    else paintMapLayer(scale, detail, left, right, top, bottom);
  } finally {
    ctx = main;
  }
  return (mapLayerCache = {
    canvas: layer,
    tiles: game.tiles,
    revision: game.mapRevision || 0,
    scale,
    dpr,
    w,
    h,
    x: offset.x,
    y: offset.y,
  });
}
// Deep sea remains navigable but does not need tactical hex outlines. The
// Japan theatre exposes only a couple of coastal water rings, like WC4's
// land-focused regional maps; fleets can still cross the smooth blue water.
let scenarioSeaCache = { tiles:null,revision:-1,shown:null };
function scenarioSeaHexVisible(t) {
  if (game.mode === 'scenario' && t.terrain === 'offmap') return false;
  if (game.mode !== 'scenario' || !game.scenario?.projection ||
      t.terrain !== 'sea') return true;
  const revision = game.mapRevision || 0;
  if (scenarioSeaCache.tiles !== game.tiles || scenarioSeaCache.revision !== revision) {
    const seen = new Uint8Array(game.tiles.length), queue = [];
    for (const cell of game.tiles) if (cell.terrain !== 'sea') {
      const id = cell.r * game.cols + cell.c;
      seen[id] = 1;
      queue.push([cell, 0]);
    }
    const shown = new Set();
    for (let i = 0; i < queue.length; i++) {
      const [cell, depth] = queue[i];
      if (depth >= 2) continue;
      for (const next of E.adjacent(game, cell)) {
        if (next.terrain !== 'sea') continue;
        const id = next.r * game.cols + next.c;
        if (seen[id]) continue;
        seen[id] = 1;
        shown.add(id);
        queue.push([next, depth + 1]);
      }
    }
    scenarioSeaCache = { tiles:game.tiles, revision, shown };
  }
  return scenarioSeaCache.shown.has(t.r * game.cols + t.c);
}
// Iterate only the camera rectangle, not every hex in large regional maps.
function* visibleMapTiles(left, right, top, bottom) {
  const rowStep = R * 1.5, colStep = SQ * R;
  const firstRow = Math.max(0, Math.floor((top - R * 2) / rowStep) - 1);
  const lastRow = Math.min(game.rows - 1, Math.ceil((bottom + R * 2) / rowStep) + 1);
  // Wraparound map tiles on the dateline may show columns from both edges.
  const allColumns = wraps() && (left < R * 2 || right > WORLD_W - R * 2);
  for (let r = firstRow; r <= lastRow; r++) {
    const stagger = 0.5 * (r & 1);
    const firstCol = allColumns ? 0 :
      Math.max(0, Math.floor((left - R * 3 - R) / colStep - stagger));
    const lastCol = allColumns ? game.cols - 1 :
      Math.min(game.cols - 1, Math.ceil((right + R * 3 - R) / colStep - stagger));
    for (let c = firstCol; c <= lastCol; c++)
      yield game.tiles[r * game.cols + c];
  }
}
function paintMapLayer(scale, detail, left, right, top, bottom, layer = 'all') {
  const copies = x => copiesBetween(x, left, right),
    visible = p => p.y >= top && p.y <= bottom;
  const pacificSky = isPacificAirBattle();
  const atlas = pacificSky ? false : GEOGRAPHY.paint(ctx, game, left, right, top, bottom, scale, layer);
  if (layer === 'political') {
    paintPoliticalBorders(scale, left, right, top, bottom);
    return;
  }
  if (!atlas) {
    for (const t of visibleMapTiles(left, right, top, bottom)) {
      const c = hexCenter(t);
      if (!visible(c)) continue;
      for (const x of copies(c.x)) {
        hexPath(x, c.y, R + 0.5);
        // If vector geography is unavailable, scenario land still uses the
        // controlling nation's colour rather than biome swatches.
        ctx.fillStyle = pacificSky
          ? (t.terrain === 'forest' ? '#b6d5e5' : t.terrain === 'mountain' ? '#4a637d' : '#72b6db')
          : t.terrain === 'offmap' ? '#174663' :
          game.mode === 'scenario' && t.owner && t.terrain !== 'sea'
            ? F(t.owner).color : TERRAIN_FILL[t.terrain] || TERRAIN_FILL.plains;
        ctx.fill();
        if (game.mode !== 'scenario' && t.owner && t.terrain !== 'sea') {
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
    for (const t of visibleMapTiles(left, right, top, bottom)) {
      const c = hexCenter(t);
      if (!visible(c) || !scenarioSeaHexVisible(t)) continue;
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
      for (const t of visibleMapTiles(left, right, top, bottom)) {
        if (t.terrain === 'plains' || !scenarioSeaHexVisible(t)) continue;
        if (game.wrap && !['crater', 'urban', 'mountain', 'peak'].includes(t.terrain)) continue;
        if (game.wrap && (t.terrain === 'mountain' || t.terrain === 'peak') && R * scale < 32) continue;
        const c = hexCenter(t);
        if (!visible(c)) continue;
        ctx.globalAlpha = t.terrain === 'crater' || t.terrain === 'urban' ? 0.8 : game.wrap ? 0.24 : 0.43;
        for (const x of copies(c.x)) terrainProps(t, x, c.y, scale);
      }
    ctx.globalAlpha = 1;
  }
  if (layer !== 'static') paintPoliticalBorders(scale, left, right, top, bottom);
}
function paintPoliticalBorders(scale, left, right, top, bottom) {
  const copies = x => copiesBetween(x, left, right),
    visible = p => p.y >= top && p.y <= bottom;
  if (R * scale >= 22) for (const t of visibleMapTiles(left, right, top, bottom)) {
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

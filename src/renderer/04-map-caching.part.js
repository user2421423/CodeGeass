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
const mapAtlasPrefetchAttempts = new Set();
let mapAtlasPrefetchViewport = null;
let mapAtlasIdlePending = false;
let mapAtlasViewport = null;
let mapAtlasClock = 0;
const mapAtlasMobile = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const MAP_ATLAS_BYTE_BUDGET = (mapAtlasMobile ? 48 : 144) * 1024 * 1024;
function mapAtlasBytes() {
  let bytes = 0;
  for (const cache of [mapAtlasTiles, mapAtlasStaticTiles, mapAtlasPoliticalTiles])
    for (const item of cache.values()) bytes += item.canvas.width * item.canvas.height * 4;
  return bytes;
}
function trimMapAtlas() {
  let bytes = mapAtlasBytes();
  if (bytes <= MAP_ATLAS_BYTE_BUDGET) return;
  const entries = [];
  for (const cache of [mapAtlasTiles, mapAtlasStaticTiles, mapAtlasPoliticalTiles])
    for (const [key, item] of cache) entries.push({cache, key, item});
  entries.sort((a,b) => a.item.used - b.item.used);
  for (const {cache,key,item} of entries) {
    // Visible chunks are pinned even if an unusually large viewport exceeds
    // the budget. DPR and visible quality stay unchanged on phones.
    if (item.scale === mapAtlasState.scale && mapAtlasJobVisible(item)) continue;
    cache.delete(key); bytes -= item.canvas.width * item.canvas.height * 4;
    item.canvas.width = item.canvas.height = 0;
    mapAtlasPerformance.evictions++;
    if (bytes <= MAP_ATLAS_BYTE_BUDGET) break;
  }
}
function mapAtlasJobVisible(item, buffer = 0) {
  const v = mapAtlasViewport;
  if (!v) return false;
  const x = item.worldX ?? item.col * item.tileSize;
  const y = item.worldY ?? item.row * item.tileSize;
  const w = item.width ?? item.tileSize, h = item.height ?? item.tileSize;
  const shifts = wraps() ? [-WORLD_W, 0, WORLD_W] : [0];
  return shifts.some(shift => x+shift+w >= v.left-buffer && x+shift <= v.right+buffer &&
    y+h >= v.top-buffer && y <= v.bottom+buffer);
}
function resetMapResources() {
  if (typeof GEOGRAPHY !== 'undefined') GEOGRAPHY.releaseMap?.();
  tileMeta = tileMetaFor = null;
  scenarioSeaCache = {tiles:null,revision:-1,shown:null};
  mapLayerCache = null;
  for (const cache of [mapAtlasTiles, mapAtlasStaticTiles, mapAtlasPoliticalTiles]) {
    for (const tile of cache.values()) tile.canvas.width = tile.canvas.height = 0;
    cache.clear();
  }
  mapAtlasWarmQueue.length = 0; mapAtlasWarmKeys.clear(); mapAtlasGeneration++;
  mapAtlasPrefetchAttempts.clear(); mapAtlasPrefetchViewport = null;
  mapAtlasState = { tiles:null, revision:-1, terrainRevision:-1, scale:null };
  mapAtlasStrategicOwners = { tiles:null, revision:-1, source:null, canvas:null };
  mapAtlasFallback = {id:null,image:null,ready:false,hires:false};
  mapAtlasViewport = null;
  mapAtlasNavigationBase = null;
  mapAtlasOwnerSnapshot = null;
}
let mapAtlasLastNavigation = -Infinity;
function noteMapNavigation() { mapAtlasLastNavigation = performance.now(); }
// Non-regional boards use their own current vector map as a navigation base.
// Build it on state changes, outside pointer/wheel handlers. It is never used
// after a political/terrain revision until repainted with current ownership.
let mapAtlasNavigationBase = null;
function prepareMapNavigationBase() {
  if (typeof GEOGRAPHY === 'undefined' || regionalMapLayers()) return;
  const revision = game.mapRevision || 0, terrain = game.mapTerrainRevision || 0;
  if (mapAtlasNavigationBase?.tiles === game.tiles &&
      mapAtlasNavigationBase.revision === revision && mapAtlasNavigationBase.terrain === terrain) return;
  const quality = Math.min(.25, 2048 / Math.max(WORLD_W, WORLD_H));
  const image = document.createElement('canvas');
  image.width = Math.ceil(WORLD_W * quality); image.height = Math.ceil(WORLD_H * quality);
  const main = ctx;
  try {
    ctx = image.getContext('2d'); ctx.setTransform(quality,0,0,quality,0,0);
    paintMapLayer(.8, false, 0, WORLD_W, 0, WORLD_H);
  } finally { ctx = main; }
  mapAtlasNavigationBase = {tiles:game.tiles,revision,terrain, image};
}
let mapAtlasGeneration = 0;
let mapAtlasState = { tiles: null, revision: -1, terrainRevision: -1, scale: null };
let mapAtlasOwnerSnapshot = null;
function invalidateRegionalPolitics() {
  // Regional ownership stencils spread at most coastBuffer sea rings. Include
  // virtual edge hexes, political border neighbours and chunk padding too.
  const reach = (E.scenarios?.byId?.[game.scenario?.id]?.meta?.map?.coastBuffer || 2) + 3;
  const radius = reach * SQ * R;
  const changed = [];
  for (let i=0;i<game.tiles.length;i++) {
    const t=game.tiles[i];
    if (mapAtlasOwnerSnapshot?.[i] !== t.owner) {
      const p=hexCenter(t); changed.push(p);
    }
  }
  for (const [key,item] of mapAtlasPoliticalTiles) {
    if (!changed.some(p => p.x >= item.worldX-radius && p.x <= item.worldX+item.width+radius &&
        p.y >= item.worldY-radius && p.y <= item.worldY+item.height+radius)) continue;
    mapAtlasPoliticalTiles.delete(key); item.canvas.width=item.canvas.height=0;
  }
}
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
  let settled;
  entry.loaded = new Promise(resolve => { settled = resolve; });
  entry.image.onload = () => {
    entry.ready = true;
    settled(entry.image);
    for (const notify of entry.listeners.splice(0)) notify(entry.image);
  };
  entry.image.onerror = () => {
    entry.failed = true;
    settled(null);
    entry.listeners.length = 0;
  };
  mapAtlasHiResImages.set(id, entry);
  while (mapAtlasHiResImages.size > (mapAtlasMobile ? 1 : 3))
    mapAtlasHiResImages.delete(mapAtlasHiResImages.keys().next().value);
  entry.image.src = 'scenario-hires/' + encodeURIComponent(id) + '.webp';
  return entry;
}
let mapAtlasStrategicOwners = { tiles: null, revision: -1, source: null, canvas: null };
const mapAtlasPerformance = {
  hits: 0, misses: 0, evictions: 0, cancelledJobs: 0, strategicFrames: 0, snapshotFrames: 0, atomicAtlasFrames: 0,
  basePaints: 0, politicalPaints: 0,
  synchronousPaints: 0, deferredPaints: 0, paintMs: 0, maxPaintMs: 0,
};
if (typeof window !== 'undefined') window.KNIGHTMARE_MAP_PERF = {
  snapshot: () => ({ ...mapAtlasPerformance, cacheBytes:mapAtlasBytes(), cacheBudgetBytes:MAP_ATLAS_BYTE_BUDGET, queued: mapAtlasWarmQueue.length,
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
  // Central America's custom underlay is a combined painter with its own
  // rivers/volcano ordering; keep it on the combined cache path.
  return !meta?.painter && game.scenario.id !== 'cf-central-america';
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
    mapAtlasStrategicOwners = { tiles: game.tiles, revision: -1, source: null, canvas: null };
  } else if (mapAtlasState.revision !== revision) {
    mapAtlasTiles.clear();
    if (regionalMapLayers() && mapAtlasOwnerSnapshot) invalidateRegionalPolitics();
    else mapAtlasPoliticalTiles.clear(); // World island/province inference can be non-local.
  }
  if (mapAtlasState.tiles !== game.tiles || mapAtlasState.revision !== revision)
    mapAtlasOwnerSnapshot = game.tiles.map(t => t.owner);
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
    item.used = ++mapAtlasClock;
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
  item = { canvas: c, worldX, worldY, width, height, quality, scale, used:++mapAtlasClock };
  cache.set(key, item);
  trimMapAtlas();
  return item;
}
function queueMapAtlasTile(col, row, scale, detail, tileSize, layer, urgent = false) {
  const key = layer + ':' + mapAtlasKey(col, row, scale, tileSize);
  if (!urgent && mapAtlasPrefetchAttempts.has(key)) return;
  if (mapAtlasCanvasSet(layer).has(mapAtlasKey(col, row, scale, tileSize)) ||
      mapAtlasWarmKeys.has(key)) return;
  mapAtlasWarmKeys.add(key);
  if (!urgent) mapAtlasPrefetchAttempts.add(key);
  const job = { col, row, scale, detail, tileSize, layer, key, generation: mapAtlasGeneration };
  mapAtlasWarmQueue.push(job);
  if (mapAtlasIdlePending) return;
  mapAtlasIdlePending = true;
  function warm(deadline) {
    // Reprioritize against the CURRENT viewport, rather than completing the
    // history of pointer moves. A job is atomic; at most one begins per task.
    for (let i = mapAtlasWarmQueue.length - 1; i >= 0; i--) {
      const j = mapAtlasWarmQueue[i];
      if (j.generation !== mapAtlasGeneration || !mapAtlasJobVisible(j, j.tileSize)) {
        mapAtlasWarmQueue.splice(i,1); mapAtlasWarmKeys.delete(j.key);
        mapAtlasPerformance.cancelledJobs++;
      }
    }
    const v = mapAtlasViewport;
    if (v) mapAtlasWarmQueue.sort((a,b) => {
      const priority = j => (mapAtlasJobVisible(j) ? 0 : 1e12) +
        (j.col*j.tileSize+j.tileSize/2-(v.left+v.right)/2)**2 +
        (j.row*j.tileSize+j.tileSize/2-(v.top+v.bottom)/2)**2;
      return priority(a)-priority(b);
    });
    // Background work yields while dragging. Visible jobs resume promptly
    // after input quiets, independent of the pointer handler and HUD.
    if (mapAtlasWarmQueue.length && performance.now() - mapAtlasLastNavigation < 80) {
      schedule(warm); return;
    }
    const job = mapAtlasWarmQueue.shift();
    if (job) {
      mapAtlasWarmKeys.delete(job.key);
      completeMapTile(job.col, job.row, job.scale, job.detail, job.tileSize, job.layer, true);
      // Prefetch completion must not trigger another prefetch scan: at a
      // full budget that scan would requeue the neighbour just evicted by LRU.
      if (mapAtlasJobVisible(job) && typeof requestMapFrame === 'function') requestMapFrame();
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
// The published regional WebP is a fast, troop-free *geographic* backdrop.
// Its baked political colors reflect the scenario's opening turn, not a loaded
// save. Always repaint the complete current political layer above it: comparing
// with ownership at load time misses territory captured before the save was made.
// Use the same geographic clipping and faction stencil as tactical zoom.
function drawStrategicCurrentOwnership() {
  if (!mapAtlasFallback.ready) return;
  const state = mapAtlasStrategicOwners;
  if (state.tiles !== game.tiles) return;
  const revision = game.mapRevision || 0;
  const image = mapAtlasFallback.image;
  if (!image?.naturalWidth || !image?.naturalHeight) return;
  if (state.revision !== revision || state.source !== image || !state.canvas) {
    // This canvas is built only when ownership or the backdrop changes, never
    // while panning or on every frame. Cap its resolution for large theatres.
    const quality = Math.max(0.25, Math.min(0.75,
      image.naturalWidth / WORLD_W, image.naturalHeight / WORLD_H));
    const canvas = state.canvas || document.createElement('canvas');
    canvas.width = Math.ceil(WORLD_W * quality);
    canvas.height = Math.ceil(WORLD_H * quality);
    const mainCtx = ctx;
    let painted = false;
    try {
      ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(quality, 0, 0, quality, 0, 0);
        painted = GEOGRAPHY.paint(ctx, game,
          0, WORLD_W, 0, WORLD_H, 1, 'political');
      }
    } finally {
      ctx = mainCtx;
    }
    if (!painted) return;
    state.canvas = canvas;
    state.source = image;
    state.revision = revision;
  }
  ctx.drawImage(state.canvas, 0, 0, WORLD_W, WORLD_H);
}
function drawMapFromAtlas(scale, detail, left, right, top, bottom) {
  mapAtlasViewport = { left, right, top, bottom };
  const paintScale = mapAtlasRenderScale(scale);
  const paintDetail = R * paintScale >= 14;
  const tileSize = mapAtlasTileSize(paintScale);
  refreshMapAtlas(paintScale);
  const prefetchView = [mapAtlasGeneration, Math.floor(left/tileSize), Math.floor(right/tileSize),
    Math.floor(top/tileSize), Math.floor(bottom/tileSize)].join(':');
  if (prefetchView !== mapAtlasPrefetchViewport) {
    mapAtlasPrefetchViewport = prefetchView; mapAtlasPrefetchAttempts.clear();
  }
  const split = regionalMapLayers();
  const layers = split ? ['static', 'political'] : ['all'];
  const navigationBase = !split && mapAtlasNavigationBase?.tiles === game.tiles &&
    mapAtlasNavigationBase.revision === (game.mapRevision || 0) &&
    mapAtlasNavigationBase.terrain === (game.mapTerrainRevision || 0)
      ? mapAtlasNavigationBase.image : null;
  const defer = (split && mapAtlasFallback.ready) || !!navigationBase;
  const backdrop = navigationBase || mapAtlasFallback.image;
  // Never let the first frame synchronously rasterize a detailed theatre map.
  // Asset loading happens asynchronously; regular legacy painting remains a
  // safety net when both images fail to load.
  if (split && !mapAtlasFallback.ready && !mapAtlasFallback.failed) return;
  // At wide strategic zoom, preserve the published geographic picture itself:
  // no grid/relief hexes are drawn below this 22-pixel tactical threshold.
  if (split && defer && R * scale < 22) {
    // Abandon high-detail jobs scheduled while the backdrop was loading.
    // Otherwise heavy Japanese coastline chunks can still stall navigation.
    if (mapAtlasWarmQueue.length) {
      mapAtlasWarmQueue.length = 0;
      mapAtlasWarmKeys.clear();
      mapAtlasGeneration++;
    }
    mapAtlasPerformance.strategicFrames++;
    ctx.drawImage(mapAtlasFallback.image, 0, 0, WORLD_W, WORLD_H);
    drawStrategicCurrentOwnership();
    return;
  }
  const firstRow = Math.max(0, Math.floor(top / tileSize));
  const lastRow = Math.min(Math.ceil(WORLD_H / tileSize) - 1, Math.floor(bottom / tileSize));
  const firstShift = wraps() ? Math.floor(left / WORLD_W) - 1 : 0;
  const lastShift = wraps() ? Math.ceil(right / WORLD_W) : 0;
  // Atomic map presentation: never draw a mixture of low-res WebP and
  // sharper tiles. Stay with one complete picture until *all* currently
  // visible static and political tiles exist, then present them together.
  // This also prevents alternating coastlines when the player pans.
  if (defer) {
    const missing = [];
    const lastPhysicalRow = Math.ceil(WORLD_H / tileSize) - 1;
    for (let k = firstShift; k <= lastShift; k++) {
      const shift = k * WORLD_W;
      const a = left - shift, b = right - shift;
      if (b <= 0 || a >= WORLD_W) continue;
      const firstCol = Math.max(0, Math.floor(a / tileSize));
      const lastCol = Math.min(Math.ceil(WORLD_W / tileSize) - 1, Math.floor(b / tileSize));
      for (let row = firstRow; row <= Math.min(lastRow, lastPhysicalRow); row++)
        for (let col = firstCol; col <= lastCol; col++)
          for (const layer of layers)
            if (!mapAtlasCanvasSet(layer).has(mapAtlasKey(col, row, paintScale, tileSize)))
              missing.push({ col, row, layer });
    }
    if (missing.length) {
      mapAtlasPerformance.snapshotFrames++;
      for (let shift=firstShift;shift<=lastShift;shift++)
        ctx.drawImage(backdrop, shift*WORLD_W, 0, WORLD_W, WORLD_H);
      if (split) drawStrategicCurrentOwnership();
      // Schedule at most the visible missing tiles; don't build any on the
      // pointer-move/render stack, and don't show unfinished partial chunks.
      for (const job of missing)
        queueMapAtlasTile(job.col, job.row, paintScale, paintDetail,
          tileSize, job.layer, true);
      return;
    }
    mapAtlasPerformance.atomicAtlasFrames++;
  }
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
          if (tile) { mapAtlasPerformance.hits++; tile.used = ++mapAtlasClock; }
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
  const revision = game.mapTerrainRevision || 0;
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
  // Main's regional underlay historically presented an opaque geographic
  // political pass, including its sea/coast cover above tactical decorations.
  // Preserve that exact presentation after fixing the underlay's argument
  // forwarding. A capture still invalidates only political atlas chunks.
  const geographyLayer = layer === 'political' ? 'all' : layer;
  const atlas = pacificSky ? false : GEOGRAPHY.paint(ctx, game, left, right, top, bottom, scale, geographyLayer);
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

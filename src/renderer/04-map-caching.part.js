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
// Camera-independent cache of *complete* terrain tiles, including grid,
// ownership borders and relief. Reusing the whole base map prevents the 30-50ms
// canvas path rebuild which was still happening after geography was cached.
const MAP_ATLAS_TILE = 960;
const MAP_ATLAS_PAD = 5;
const MAP_ATLAS_SCALE_STEP = 1.25;
const mapAtlasTiles = new Map();
const mapAtlasWarmQueue = [];
const mapAtlasWarmKeys = new Set();
let mapAtlasIdlePending = false;
let mapAtlasGeneration = 0;
let mapAtlasState = { tiles: null, revision: -1, scale: null };

// Bounded regional maps have much more world space than visible screen space.
// Large, coarser atlas chunks at strategic zoom prevent hundreds of tiny
// synchronous paints; tactical zoom uses the original 960-unit chunks.
function mapAtlasTileSize(scale) {
  if (game.wrap) return MAP_ATLAS_TILE;
  return scale < 0.14 ? MAP_ATLAS_TILE * 4 :
    scale < 0.28 ? MAP_ATLAS_TILE * 2 : MAP_ATLAS_TILE;
}
function mapAtlasRenderScale(scale) {
  if (game.wrap) return scale;
  // Reuse atlas imagery across small trackpad zoom increments. Preserve the
  // original 14/22/24/32-pixel grid/terrain detail thresholds.
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
function shouldUseMapAtlas(scale) {
  // Wrapped Conquest keeps the cheap whole-world overview at extreme zoom.
  return !game.wrap || scale >= 0.33;
}
function refreshMapAtlas(scale) {
  const revision = game.mapRevision || 0;
  if (mapAtlasState.tiles === game.tiles &&
      mapAtlasState.revision === revision && mapAtlasState.scale === scale) return;
  // Multiple zoom levels may coexist. Only changes to the underlying map
  // invalidate all atlas tiles; stale prefetch jobs are always discarded.
  if (mapAtlasState.tiles !== game.tiles || mapAtlasState.revision !== revision)
    mapAtlasTiles.clear();
  mapAtlasWarmQueue.length = 0;
  mapAtlasWarmKeys.clear();
  mapAtlasGeneration++;
  mapAtlasState = { tiles: game.tiles, revision, scale };
}
function completeMapTile(tx, ty, scale, detail, tileSize) {
  const key = mapAtlasKey(tx, ty, scale, tileSize);
  let item = mapAtlasTiles.get(key);
  if (item) {
    mapAtlasTiles.delete(key);
    mapAtlasTiles.set(key, item);
    return item;
  }
  const worldX = tx * tileSize, worldY = ty * tileSize;
  const width = Math.min(tileSize, WORLD_W - worldX);
  const height = Math.min(tileSize, WORLD_H - worldY);
  const quality = game.wrap
    ? Math.max(0.55, Math.min(1, scale * 1.35))
    : Math.max(0.18, Math.min(1, scale * 2));
  const c = document.createElement('canvas');
  c.width = Math.ceil((width + 2 * MAP_ATLAS_PAD) * quality);
  c.height = Math.ceil((height + 2 * MAP_ATLAS_PAD) * quality);
  const oldCtx = ctx;
  ctx = c.getContext('2d');
  try {
    ctx.setTransform(quality, 0, 0, quality,
      (-worldX + MAP_ATLAS_PAD) * quality,
      (-worldY + MAP_ATLAS_PAD) * quality);
    // Include hex centres just outside the tile so seams are fully painted.
    const reach = MAP_ATLAS_PAD + R * 2;
    paintMapLayer(scale, detail,
      worldX - reach, worldX + width + reach,
      worldY - reach, worldY + height + reach);
  } finally {
    ctx = oldCtx;
  }
  item = { canvas: c, worldX, worldY, width, height, quality };
  mapAtlasTiles.set(key, item);
  while (mapAtlasTiles.size > 72)
    mapAtlasTiles.delete(mapAtlasTiles.keys().next().value);
  return item;
}
function scheduleMapPrefetch(scale, detail, tileSize, firstCol, lastCol, firstRow, lastRow) {
  if (typeof requestIdleCallback !== 'function') return;
  const maxC = Math.ceil(WORLD_W / tileSize) - 1;
  const maxR = Math.ceil(WORLD_H / tileSize) - 1;
  for (let r = Math.max(0, firstRow - 1); r <= Math.min(maxR, lastRow + 1); r++)
    for (let c = Math.max(0, firstCol - 1); c <= Math.min(maxC, lastCol + 1); c++) {
      if (c >= firstCol && c <= lastCol && r >= firstRow && r <= lastRow) continue;
      const key = mapAtlasKey(c, r, scale, tileSize);
      if (mapAtlasTiles.has(key) || mapAtlasWarmKeys.has(key)) continue;
      mapAtlasWarmKeys.add(key);
      mapAtlasWarmQueue.push({ c, r, scale, detail, tileSize, generation: mapAtlasGeneration });
    }
  if (mapAtlasIdlePending || !mapAtlasWarmQueue.length) return;
  mapAtlasIdlePending = true;
  function warm(deadline) {
    if (mapAtlasWarmQueue.length && deadline.timeRemaining() > 8) {
      const job = mapAtlasWarmQueue.shift();
      mapAtlasWarmKeys.delete(mapAtlasKey(job.c, job.r, job.scale, job.tileSize));
      if (job.generation === mapAtlasGeneration && job.scale === mapAtlasState.scale)
        completeMapTile(job.c, job.r, job.scale, job.detail, job.tileSize);
    }
    if (mapAtlasWarmQueue.length) requestIdleCallback(warm);
    else mapAtlasIdlePending = false;
  }
  requestIdleCallback(warm);
}
function drawMapFromAtlas(scale, detail, left, right, top, bottom) {
  const paintScale = mapAtlasRenderScale(scale);
  const paintDetail = R * paintScale >= 14;
  const tileSize = mapAtlasTileSize(paintScale);
  refreshMapAtlas(paintScale);
  const firstRow = Math.max(0, Math.floor(top / tileSize));
  const lastRow = Math.min(Math.ceil(WORLD_H / tileSize) - 1, Math.floor(bottom / tileSize));
  // Regional maps must never repeat horizontally like wraparound Conquest.
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
        const t = completeMapTile(col, row, paintScale, paintDetail, tileSize);
        const pad = MAP_ATLAS_PAD;
        ctx.drawImage(t.canvas, 0, 0,
          (t.width + 2 * pad) * t.quality,
          (t.height + 2 * pad) * t.quality,
          t.worldX + shift - pad, t.worldY - pad,
          t.width + 2 * pad, t.height + 2 * pad);
      }
    if (firstCol <= lastCol && firstRow <= lastRow)
      scheduleMapPrefetch(paintScale, paintDetail, tileSize,
        firstCol, lastCol, firstRow, lastRow);
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
function paintMapLayer(scale, detail, left, right, top, bottom) {
  const copies = x => copiesBetween(x, left, right),
    visible = p => p.y >= top && p.y <= bottom;
  // Geography is a continuous visual atlas. Hexes remain the *logical* map;
  // they are not used as filled polygon art unless the device lacks ImageData.
  const pacificSky = isPacificAirBattle();
  const atlas = pacificSky ? false : GEOGRAPHY.paint(ctx, game, left, right, top, bottom, scale);
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
  // Political borders are tactical information and still align to tile
  // ownership. Coastlines are already smoothed by the visual atlas; drawing
  // the old edge-by-edge hex coastline here would reintroduce the mosaic.
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

/* Knightmare Conquest UI: The camera over a world that wraps east to west, hit-testing and map input. */
'use strict';
// ======== View: a camera over a world that wraps east to west ========
function hexCenter(p) {
  return { x: SQ * R * (p.c + 0.5 * (p.r & 1)) + R, y: R * 1.5 * p.r + R };
}
// Visual-only shoreline anchors for cities whose *gameplay hex centres* fall
// on GSHHG water. These are small local movements onto the nearby coast,
// not changes to their tile, garrison, capture, port, or save coordinates.
// Map projection matches GEOGRAPHY.project; campaign boards are untouched.
const CITY_SHORE_ANCHORS = Object.freeze({
  "Rio de Janeiro": [
    -44.113,
    -23.167
  ],
  "Pearl Harbor": [
    -158.031,
    21.331
  ],
  "Manila": [
    121.943,
    14.21
  ],
  "Auckland": [
    174.381,
    -36.713
  ],
  "Reykjavik": [
    -20.943,
    63.817
  ],
  "Gibraltar": [
    -4.985,
    36.49
  ],
  "Stockholm": [
    17.923,
    58.825
  ],
  "Lagos": [
    5.057,
    5.79
  ],
  "Cape Town": [
    18.17,
    -33.35
  ],
  "Yangon": [
    97.595,
    16.052
  ],
  "Singapore": [
    104.17,
    0.835
  ],
  "Taipei": [
    121.861,
    24.587
  ],
  "Sydney": [
    151.587,
    -33.203
  ],
  "Melbourne": [
    145,
    -38.48
  ],
  "Perth": [
    115.589,
    -31.473
  ],
  "Darwin": [
    130.16,
    -13.04
  ],
  "Houston": [
    -95.015,
    29.664
  ],
  "Montevideo": [
    -57.222,
    -35.319
  ],
  "Brisbane": [
    153.429,
    -27.132
  ]
});
function visualCityCenter(station) {
  const tactical = hexCenter(station);
  if (!wraps()) return tactical;
  const point = CITY_SHORE_ANCHORS[station.name];
  if (!point) return tactical;
  const x = R + (point[0] + 179) * (SQ * R / 2);
  const y = R + (74 - point[1]) * (1.5 * R * 75 / 128);
  // Never let a mistaken data entry displace a city outside its tactical
  // hex neighbourhood; the logical station remains at its original centre.
  if (Math.hypot(wrapNear(x, tactical.x) - tactical.x, y - tactical.y) > R * 0.72)
    return tactical;
  return { x: wrapNear(x, tactical.x), y };
}
// Barcelona's playable harbour is water, but its centre overlays a small
// GSHHG land fringe. Shift harbour art alone by ~3 world pixels onto water.
const PORT_SHORE_ANCHORS = Object.freeze({ Barcelona: [3.0487, 39.9301] });
function visualPortCenter(station) {
  if (!station.portAt) return null;
  const tactical = hexCenter(station.portAt);
  if (!wraps()) return tactical;
  const p = PORT_SHORE_ANCHORS[station.name];
  if (!p) return tactical;
  const x = R + (p[0] + 179) * (SQ * R / 2);
  const y = R + (74 - p[1]) * (1.5 * R * 75 / 128);
  if (Math.hypot(wrapNear(x, tactical.x) - tactical.x, y - tactical.y) > R * 0.5)
    return tactical;
  return { x: wrapNear(x, tactical.x), y };
}
// Used only to make visually displaced city sprites selectable. Hex targets,
// deployments, combat and unit hits always use the original tactical hitHex.
function hitVisualStationAtWorld(x, y, scale) {
  if (!wraps() || R * scale < 14) return null;
  let nearest = null, best = R * 0.46;
  for (const station of game.stations) {
    if (!CITY_SHORE_ANCHORS[station.name]) continue;
    const c = visualCityCenter(station);
    const dist = Math.hypot(wrapNear(c.x, x) - x, c.y - y);
    if (dist < best) { nearest = station; best = dist; }
  }
  return nearest;
}
function hitVisualStation(clientX, clientY) {
  const p = toWorld(clientX, clientY);
  return hitVisualStationAtWorld(p.x, p.y, p.scale);
}
// The copy of world x closest to ref.
function wrapNear(x, ref) {
  return wraps() ? x + Math.round((ref - x) / WORLD_W) * WORLD_W : x;
}
function viewPad() {
  const compact = mapSize.w < 700;
  return { top: compact ? 110 : 120, bottom: compact ? 200 : 170 };
}
function computeView() {
  const rect = canvas.getBoundingClientRect();
  mapSize = { w: rect.width, h: rect.height };
  const pad = viewPad();
  const fitH = (rect.height - pad.top - pad.bottom) / WORLD_H;
  baseScale = Math.max(0.05, wraps() ? fitH : Math.min(fitH, (rect.width - 40) / WORLD_W));
  const scale = baseScale * zoom;
  if (wraps()) cam.x = ((cam.x % WORLD_W) + WORLD_W) % WORLD_W;
  else {
    const halfW = rect.width / 2 / scale;
    cam.x = WORLD_W <= 2 * halfW ? WORLD_W / 2 : E.clamp(cam.x, halfW - 40 / scale, WORLD_W - halfW + 40 / scale);
  }
  const halfH = (rect.height - pad.top - pad.bottom) / 2 / scale,
    midY = pad.top + (rect.height - pad.top - pad.bottom) / 2;
  cam.y = WORLD_H <= 2 * halfH ? WORLD_H / 2 : E.clamp(cam.y, halfH - 40 / scale, WORLD_H - halfH + 40 / scale);
  // Whole device pixels, so the cached map layer lines up exactly wherever the camera stops.
  const dpr = Math.min(devicePixelRatio || 1, 2);
  offset = {
    x: Math.round((rect.width / 2 - cam.x * scale) * dpr) / dpr,
    y: Math.round((midY - cam.y * scale) * dpr) / dpr,
  };
  return scale;
}
function centerOn(p) {
  if (!p || !canvas) return;
  const c = hexCenter(p);
  cam = { x: c.x, y: c.y };
  if (typeof requestMapFrame === 'function') requestMapFrame();
}
function toWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect(),
    scale = computeView();
  return { x: (clientX - rect.left - offset.x) / scale, y: (clientY - rect.top - offset.y) / scale, scale };
}
// Commander portraits float up and to the left of their unit (see drawAdmiralPin).
function hitPin(clientX, clientY) {
  const { x, y, scale } = toWorld(clientX, clientY),
    k = Math.min(1.6, Math.max(1, 0.85 / scale));
  if (R * scale < 14) return null;
  return game.units.find(u => {
    if (u.hp <= 0 || !u.cmd) return false;
    const p = animatedPosition(u),
      px = wrapNear(p.x, x),
      dx = x - (px - 22),
      dy = y - (p.y - 40);
    return Math.abs(dx) <= 15 * k && dy >= -18 * k && dy <= 25 * k;
  });
}
function hitHex(clientX, clientY) {
  const { x, y } = toWorld(clientX, clientY),
    r0 = Math.round((y - R) / (1.5 * R));
  let nearest = null,
    best = R * 1.05;
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    if (r < 0 || r >= game.rows) continue;
    const c0 = Math.round((x - R) / (SQ * R) - 0.5 * (r & 1));
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      const t = E.tile(game, c, r);
      if (!t) continue;
      const p = hexCenter(t),
        d = Math.hypot(wrapNear(p.x, x) - x, p.y - y);
      if (d < best) {
        best = d;
        nearest = t;
      }
    }
  }
  return nearest;
}
function changeZoom(factor, anchor) {
  const oldScale = computeView();
  const before = anchor ? { x: (anchor.x - offset.x) / oldScale, y: (anchor.y - offset.y) / oldScale } : null;
  zoom = E.clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX);
  const newScale = baseScale * zoom;
  if (before) {
    cam.x = before.x - (anchor.x - mapSize.w / 2) / newScale;
    const pad = viewPad(),
      midY = pad.top + (mapSize.h - pad.top - pad.bottom) / 2;
    cam.y = before.y - (anchor.y - midY) / newScale;
  }
  computeView();
  if (typeof requestMapFrame === 'function') requestMapFrame();
}
function fireFortressAt(s, p) {
  const before = unitSnapshot(),
    r = E.fireFortress(game, s.id, p.c, p.r);
  if (!r.ok) {
    toast(r.reason);
    return;
  }
  strikeEffects(r);
  moralePopups(before);
  refreshAndSave();
}
function activateHex(p) {
  if (!p) return;
  if (strikeMode) {
    if (interactive()) confirmLaunch(p);
    return;
  }
  const fort = selectedStation();
  if (fort && interactive() && targetCache.has(E.key(p))) {
    fireFortressAt(fort, p);
    return;
  }
  const u = selectedUnit(),
    hit = E.unitAt(game, p),
    station = E.stationAt(game, p);
  if (routing && u?.id === routing && interactive()) {
    const r = E.setGoto(game, u.id, p.c, p.r);
    if (!r.ok) {
      toast(`${r.reason}. Choose another hex, or press Escape to cancel.`);
      return;
    }
    routing = null;
    refreshAndSave();
    toast(`Standing orders: ${gotoText(u)}. It moves there at the start of each of your turns.`);
    return;
  }
  if (deploying && u?.id === deploying.ship && interactive()) {
    const r = readyCache.has(E.key(p)) ? E.deploy(game, deploying.ship, deploying.index, p.c, p.r) : null;
    deploying = null;
    if (r?.ok) {
      SFX.play('move', u.side);
      selection = { kind: 'unit', id: r.unit.id };
      refreshAndSave();
      toast(r.seized ? `Launched onto ${r.seized}. The mine is yours.` : 'Launched. It can move and attack this turn.');
      return;
    }
    if (r) toast(r.reason);
    updateSelection();
    return;
  }
  if (u?.side === game.player && interactive()) {
    if (targetCache.has(E.key(p))) {
      attackHex(p);
      return;
    }
    if (readyCache.has(E.key(p))) {
      const snapshot = JSON.stringify(E.packSave(game)),
        wasSea = E.atSea(game, u),
        result = E.move(game, u.id, p.c, p.r);
      if (result.ok) {
        SFX.play('move', u.side);
        undoStack.push({ snapshot, unitId: u.id });
        if (undoStack.length > 5) undoStack.shift(); // each snapshot is a compact save (~0.1 MB)
        effects.push({
          kind: 'move',
          unitId: u.id,
          from: result.from,
          to: result.to,
          color: F(u.side).color,
          life: 0.45,
          max: 0.45,
        });
        if (result.loaded) selection = { kind: 'unit', id: result.loaded };
        refreshAndSave(!result.annexed);
        if (result.loaded) toast('Aboard the Carrier-Battleship. It can launch immediately.');
        else if (result.annexed) annexNotice(result.annexed);
        else if (result.captured) toast(`${result.captured} captured. +40 credits.`);
        else if (result.seized) toast(`${result.seized} Sakuradite mine seized.`);
        else if (E.atSea(game, u) && !wasSea) toast('Embarked as a transport. Sail to a coast next turn to land.');
        else if (wasSea && E.TYPES[u.type].naval === 'amphibious') toast('Amphibious landing! A fresh move and attack are available.');
        else if (wasSea) toast('Landed. The unit can fire next turn.');
        return;
      }
    }
  }
  const mine = E.siteAt(game, p);
  // A unit on a city: clicking the selected unit again selects the city beneath it, and back.
  if (hit && station && u?.id === hit.id) selectStation(station.id);
  else if (hit) selectUnit(hit.id);
  else if (station) selectStation(station.id);
  else if (mine) selectSite(mine.id);
  else {
    selection = { kind: 'tile', c: p.c, r: p.r };
    updateSelection();
  }
}
function attachMap() {
  canvas.onpointerdown = e => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    canvas.focus({ preventScroll: true });
    pointer = { x: e.clientX, y: e.clientY, cam: { ...cam }, dragged: false, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = e => {
    if (pointer) {
      const dx = e.clientX - pointer.x,
        dy = e.clientY - pointer.y;
      if (Math.hypot(dx, dy) > 5) pointer.dragged = true;
      if (pointer.dragged) {
        const scale = baseScale * zoom;
        cam.x = pointer.cam.x - dx / scale;
        cam.y = pointer.cam.y - dy / scale;
        canvas.style.cursor = 'grabbing';
      }
    }
    hover = hitHex(e.clientX, e.clientY);
    if (hover && !pointer?.dragged) {
      canvas.style.cursor = strikeMode || routing
        ? 'crosshair'
        : readyCache.has(E.key(hover)) || targetCache.has(E.key(hover))
          ? 'pointer'
          : 'default';
      const u = E.unitAt(game, hover),
        s = E.stationAt(game, hover),
        own = selectedUnit(),
        fort = selectedStation(),
        pr = own && targetCache.has(E.key(hover)) ? E.preview(game, own.id, hover.c, hover.r) : null;
      const blast = strikeMode ? blastSummary(hover) : null;
      $('map-caption').textContent = blast
        ? `F.L.E.I.J.A. target: ${E.targetName(game, hover)} · ${Object.values(blast.tally).reduce((a, k) => a + k.erased, 0)} erased · ${Object.values(blast.tally).reduce((a, k) => a + k.crippled, 0)} crippled · ${Object.values(blast.tally).reduce((a, k) => a + k.damaged, 0)} damaged${blast.own ? ' · your own forces are inside' : ''}`
        : own && readyCache.has(E.key(hover)) && E.isSea(hover) && !E.atSea(game, own)
          ? 'Embark here: the unit becomes a transport (cannot fire, +50% damage taken) and stops'
          : fort && u && targetCache.has(E.key(hover))
            ? `Click to fire ${E.fortressName(fort)} at ${E.TYPES[u.type].short} · ~${E.fortressDamage(game, u, fort.owner)} damage`
            : pr
              ? `Click to attack ${u ? E.TYPES[u.type].short : s.name} · ~${pr.unit || pr.shield} damage · ${pr.counterAllowed ? pr.counter + ' counter-fire' : 'no counter-fire'}`
              : `${s ? s.name + ' · ' : ''}${E.siteAt(game, hover) ? E.siteAt(game, hover).name + ' Sakuradite mine · ' : ''}${u ? `${F(u.side).short} ${E.TYPES[u.type].short} · ` : ''}${E.TERRAIN[hover.terrain].name}${hover.owner ? ' · ' + F(hover.owner).short + ' territory' : ''}`;
      if (routing && own) {
        const why = routeWhy(own, hover);
        $('map-caption').textContent = why
          ? `Cannot head here: ${why}`
          : `Head for ${E.targetName(game, hover)} · ${E.distance(own, hover, game)} hexes away`;
      }
    }
  };
  canvas.onpointerup = e => {
    if (pointer && !pointer.dragged) {
      // A click on a commander's map portrait opens Commander Info, unless it lands on a move or attack hex.
      const p = hitHex(e.clientX, e.clientY),
        pin = hitPin(e.clientX, e.clientY),
        visualCity = hitVisualStation(e.clientX, e.clientY),
        isAction = p && (targetCache.has(E.key(p)) || readyCache.has(E.key(p)));
      if (pin && !strikeMode && !isAction)
        generalDialog(pin.cmd, !!pin.personal);
      else if (visualCity && !strikeMode && !routing && !deploying &&
               !isAction && !(p && E.unitAt(game, p)) &&
               (!p || E.stationAt(game, p)?.id !== visualCity.id))
        selectStation(visualCity.id);
      else activateHex(p);
    }
    pointer = null;
    canvas.style.cursor = 'default';
  };
  canvas.onpointercancel = () => (pointer = null);
  canvas.onpointerleave = () => {
    if (!pointer) hover = null;
  };
  canvas.onwheel = e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    // Standard mouse wheels zoom quickly; small trackpad deltas remain smooth.
    // Delta units vary between pixels, lines and pages across browsers.
    const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1);
    if (!Number.isFinite(pixels) || !pixels) return;
    const step = E.clamp(pixels, -240, 240);
    changeZoom(Math.exp(-step / 500), { x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  canvas.oncontextmenu = e => e.preventDefault();
}

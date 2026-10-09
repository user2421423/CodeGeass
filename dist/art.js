/* Real art only for Knightmares and commanders. City graphics remain faction-marked SVG icons. */
const ART = (() => {
  const INK = '#0b0d14';
  const FACTION_ART = {
    britannia: { trim: '#e3c06a', glow: '#8ff7ff', flag: '#b52f35', flag2: '#e3c06a' },
    eu: { trim: '#d7dde6', glow: '#ffd24a', flag: '#356fc8', flag2: '#f4d35e' },
    cf: { trim: '#f2c14e', glow: '#ff7a45', flag: '#b52a2a', flag2: '#f2c14e' },
    neutral: { trim: '#d8cfa6', glow: '#b8ff8a', flag: '#8a8466', flag2: '#e6dfc0' },
    bk: { trim: '#f0c94a', glow: '#ff5a5a', flag: '#1d1d24', flag2: '#f0c94a' },
    jlf: { trim: '#c9d6a0', glow: '#9fff7a', flag: '#3d4a2c', flag2: '#d8e2b0' },
    eb: { trim: '#e3c06a', glow: '#d2a8ff', flag: '#4b2a7a', flag2: '#e3c06a' },
  };
  const P = pts => pts.map(p => p.map(v => +v.toFixed(1)).join(',')).join(' ');
  const poly = (pts, fill, extra = '') => `<polygon points="${P(pts)}" fill="${fill}" ${extra}/>`;
  const line = (x1, y1, x2, y2, stroke, w, extra = '') =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const circle = (x, y, r, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
  const ink = (w = 1.3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"`;
  // ---- Cities ----
  function citySVG(kind, side) {
    const f = FACTION_ART[side] || FACTION_ART.neutral,
      wall = side === 'neutral' ? '#c9b98c' : side === 'cf' ? '#cdbfae' : side === 'eu' ? '#cfd3da' : '#d8d2e6',
      roof = f.flag,
      win = '#ffe9a8';
    const towers = (list, base) =>
      list
        .map(([x, w, h]) => {
          let s = `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${wall}" ${ink(1.2)}/>`;
          s += `<rect x="${x}" y="${base - h}" width="${w}" height="4" fill="${roof}" ${ink(0.8)}/>`;
          for (let y = base - h + 8; y < base - 4; y += 6)
            for (let xx = x + 3; xx < x + w - 2; xx += 5) s += `<rect x="${xx}" y="${y}" width="2.2" height="2.6" fill="${win}"/>`;
          return s;
        })
        .join('');
    const flag = (x, y) =>
      line(x, y, x, y - 18, '#2a2a2e', 1.6) + poly([[x, y - 18], [x + 14, y - 15], [x, y - 11]], f.flag, ink(0.8)) + poly([[x, y - 16], [x + 8, y - 15], [x, y - 13]], f.flag2);
    let body = '';
    if (kind === 'capital') {
      body += `<ellipse cx="50" cy="86" rx="44" ry="10" fill="#00000055"/>`;
      body += poly([[8, 84], [92, 84], [88, 90], [12, 90]], '#5b5e66', ink(1.2));
      body += towers([[12, 12, 30], [76, 12, 32]], 84);
      body += `<rect x="24" y="52" width="52" height="32" fill="${wall}" ${ink(1.3)}/>`;
      for (let x = 28; x < 74; x += 8) body += `<rect x="${x}" y="60" width="3" height="14" fill="${win}"/>`;
      body += poly([[22, 52], [78, 52], [72, 46], [28, 46]], roof, ink(1));
      body += `<path d="M34 46 Q50 18 66 46Z" fill="${f.flag2}" ${ink(1.3)}/>`;
      body += `<path d="M38 44 Q50 24 50 24" stroke="#fff6" stroke-width="2" fill="none"/>`;
      body += flag(50, 26);
    } else if (kind === 'fortress') {
      body += `<ellipse cx="50" cy="86" rx="42" ry="10" fill="#00000055"/>`;
      body += towers([[30, 14, 30], [54, 16, 38]], 80);
      body += poly([[8, 64], [92, 64], [92, 84], [8, 84]], '#6f727a', ink(1.3));
      for (let x = 8; x < 92; x += 10) body += `<rect x="${x}" y="58" width="6" height="7" fill="#6f727a" ${ink(0.9)}/>`;
      body += `<rect x="38" y="70" width="24" height="14" fill="#3a3c42" ${ink(1)}/>`;
      body += poly([[58, 48], [96, 36], [97, 42], [60, 54]], '#2c2f36', ink(1.1)) + circle(58, 50, 6, '#4a4d55', ink(1));
      body += flag(30, 50);
    } else {
      body += `<ellipse cx="50" cy="86" rx="40" ry="9" fill="#00000055"/>`;
      body += poly([[14, 84], [86, 84], [82, 89], [18, 89]], '#5b5e66', ink(1.1));
      body += towers([[18, 14, 26], [34, 16, 40], [52, 14, 30], [68, 14, 22]], 84);
      body += flag(42, 44);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
  }
  // Cached SVG city symbols (Knightmares and commanders use published images only).
  const images = new Map();
  function image(keyName, svg) {
    if (typeof Image === 'undefined') return null;
    let img = images.get(keyName);
    if (!img) {
      img = new Image();
      img.onload = () => api.onImageReady?.();
      img.src =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(svg.replace('<svg ', '<svg width="200" height="200" '));
      images.set(keyName, img);
    }
    return img.complete && img.naturalWidth ? img : null;
  }
  // Public art is registered synchronously by assets/art/manifest.js, including when opened via file://.
  // Published and development assets are the only sprites for units and commanders.
  const LOCAL = { units: {}, portraits: {}, buildings: {}, base: 'local-art/', imgs: new Map() };
  function localEntry(kind, id) {
    const e = LOCAL[kind][id];
    return e ? (typeof e === 'string' ? { src: e } : e) : null;
  }
  const escapeAttr = value => String(value).replace(/[&"<>]/g, c => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]);
  function entries(values, base) {
    return Object.fromEntries(Object.entries(values || {}).flatMap(([id, value]) => {
      const e = typeof value === 'string' ? { src: value } : value;
      if (!e || typeof e.src !== 'string' || !/^(units|portraits|buildings)\/[\w-]+\.(png|jpe?g|webp|gif|svg)$/i.test(e.src)) return [];
      const focus = v => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : undefined;
      return [[id, { src: e.src, base, fx: focus(e.fx), fy: focus(e.fy) }]];
    }));
  }
  function localImage(kind, id) {
    const e = localEntry(kind, id);
    if (!e || typeof Image === 'undefined') return null;
    const k = kind + '|' + id;
    let img = LOCAL.imgs.get(k);
    if (!img) {
      img = new Image();
      img.onload = () => api.onImageReady?.();
      img.onerror = () => {
        img.failed = true;
        api.onImageReady?.();
      };
      img.src = e.base + e.src;
      LOCAL.imgs.set(k, img);
    }
    return !img.failed && img.complete && img.naturalWidth ? img : null;
  }
  // Never draw unit or portrait placeholders; city fallbacks are handled separately.
  // A missing or pending image remains blank; never show substitute illustrations.
  const withLocal = (kind, id, style = '') => {
    const e = localEntry(kind, id);
    if (!e) return { cls: '', html: '' };
    const src = escapeAttr(e.base + e.src);
    return {
      cls: ' local-art',
      html: `<img src="${src}" alt="" draggable="false"${style} onerror="this.remove()">`,
    };
  };
  const api = {
    FACTION_ART,
    onLocal: null,
    onImageReady: null,
    // Register and preload the real image files, without generated fallback portraits or sprites.
    useLocal(manifest, merge = false) {
      const base = /^(?:[\w-]+\/)+$/.test(manifest?.base || '') ? manifest.base : 'local-art/';
      LOCAL.units = { ...(merge ? LOCAL.units : {}), ...entries(manifest?.units, base) };
      LOCAL.portraits = { ...(merge ? LOCAL.portraits : {}), ...entries(manifest?.portraits, base) };
      LOCAL.buildings = { ...(merge ? LOCAL.buildings : {}), ...entries(manifest?.buildings, base) };
      LOCAL.base = base;
      LOCAL.imgs.clear();
      for (const kind of ['units', 'portraits', 'buildings']) for (const id of Object.keys(LOCAL[kind])) localImage(kind, id);
      api.onLocal?.();
    },
    citySVG,
    // HTML: a Knightmare for panels and cards.
    unit(type, extra = '', side) {
      const l = withLocal('units', type);
      return `<span class="ship-art unit-art${l.cls} ${extra}" aria-hidden="true">${l.html}</span>`;
    },
    city(kind, side, extra = '') {
      const e = localEntry('buildings', 'city'),
        drawn = citySVG(kind, side);
      const html = e
        ? `${drawn}<img src="${escapeAttr(e.base + e.src)}" alt="" draggable="false" onload="this.previousElementSibling.style.visibility='hidden'" onerror="this.remove()">`
        : drawn;
      return `<span class="ship-art unit-art city-art${e ? ' local-art' : ''} ${extra}" aria-hidden="true">${html}</span>`;
    },
    portrait(k, extra = '') {
      const e = localEntry('portraits', k),
        style = e ? ` style="object-position:${(e.fx ?? 0.5) * 100}% ${(e.fy ?? 0.25) * 100}%"` : '',
        l = withLocal('portraits', k, style);
      return `<span class="portrait-art${l.cls} ${extra}" aria-hidden="true">${l.html}</span>`;
    },
    // Canvas: draw a cached image centered at (x, y); false while the image is still decoding.
    drawUnit(ctx, type, side, x, y, w, h = w, flip = false) {
      const local = localImage('units', type);
      if (!local) return false;
      const r = Math.min(w / local.naturalWidth, h / local.naturalHeight),
        dw = local.naturalWidth * r,
        dh = local.naturalHeight * r;
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(local, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      return true;
    },
    // HTML: a published building picture, or '' so the caller can show its own icon.
    building(id, cls = '') {
      const e = localEntry('buildings', id);
      return e ? `<img class="${cls}" src="${escapeAttr(e.base + e.src)}" alt="" draggable="false">` : '';
    },
    // Published building art (one city, port and mine picture for every power) replaces the drawn cities; the owner
    // shows in the map badge and territory. Drawn at width w, keeping the picture's proportions.
    drawBuilding(ctx, id, x, y, w) {
      const img = localImage('buildings', id);
      if (!img) return false;
      const h = (w * img.naturalHeight) / img.naturalWidth;
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      return true;
    },
    drawCity(ctx, kind, side, x, y, w) {
      if (api.drawBuilding(ctx, 'city', x, y, w)) return true;
      const img = image(`c|${kind}|${side}`, citySVG(kind, side));
      if (!img) return false;
      ctx.drawImage(img, x - w / 2, y - w / 2, w, w);
      return true;
    },
    portraitImage(k) {
      return localImage('portraits', k);
    },
    // Source rectangle for a w:h portrait frame: a local file is cropped around its focus point (fx, fy).
    portraitSprite(k, w, h) {
      const local = localImage('portraits', k);
      if (local) {
        const e = localEntry('portraits', k),
          nw = local.naturalWidth,
          nh = local.naturalHeight;
        let sw = nw,
          sh = (nw * h) / w;
        if (sh > nh) {
          sh = nh;
          sw = (nh * w) / h;
        }
        const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        return { img: local, sx: cl((e.fx ?? 0.5) * nw - sw / 2, 0, nw - sw), sy: cl((e.fy ?? 0.25) * nh - sh / 2, 0, nh - sh), sw, sh };
      }
      return null;
    },
    // Unit and portrait assets preload in useLocal(); these three symbols are still drawn.
    preload(sides) {
      for (const s of sides) for (const kind of ['city', 'capital', 'fortress']) image(`c|${kind}|${s}`, citySVG(kind, s));
    },
  };
  if (typeof globalThis !== 'undefined' && globalThis.KnightmareArtManifest) api.useLocal(globalThis.KnightmareArtManifest);
  // Only development servers request the ignored manifest; GitHub Pages never requests a missing file.
  if (typeof fetch === 'function' && typeof location !== 'undefined' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname))
    fetch('local-art/manifest.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(m => {
        if (!m) return;
        api.useLocal(m, true);
      })
      .catch(() => {});
  return api;
})();
ART.preload(['britannia', 'eu', 'cf', 'neutral', 'bk', 'jlf', 'eb']);

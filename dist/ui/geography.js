/* Continuous visual atlas for the battlefield.
   The gameplay remains an unmodified odd-r hex grid. The painter samples its geography
   as a smooth, independently rasterized surface; no hex polygon is used for terrain fills.
   No external tiles, downloads or image assets are needed. */
'use strict';
const GEOGRAPHY = (() => {
  const PALETTE = {
    sea: [27, 72, 98],
    plains: [133, 151, 111],
    forest: [81, 121, 91],
    mountain: [149, 142, 125],
    desert: [199, 176, 129],
    snow: [202, 213, 214],
    peak: [164, 163, 165],
    crater: [213, 160, 185],
    urban: [132, 136, 129],
  };
  const EMPTY = { land: 0, red: 0, green: 0, blue: 0 };
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const smooth = t => t * t * (3 - 2 * t);

  function tileAt(g, c, r) {
    if (r < 0 || r >= g.rows) return null;
    if (g.wrap) c = ((c % g.cols) + g.cols) % g.cols;
    if (c < 0 || c >= g.cols) return null;
    return g.tiles[r * g.cols + c] || null;
  }

  // A world-space atlas sample is interpolated between hex centres, not clipped to a hex.
  // The sea/land threshold is thus free to curve *between* the tactical hex outlines.
  function sample(g, x, y) {
    const yr = (y - R) / (1.5 * R);
    const row = Math.floor(yr);
    const fy = smooth(clamp(yr - row, 0, 1));
    let land = 0;
    for (let dr = 0; dr < 2; dr++) {
      const r = row + dr;
      const xc = (x - R) / (SQ * R) - 0.5 * (r & 1);
      const c = Math.floor(xc);
      const fx = smooth(clamp(xc - c, 0, 1));
      const wy = dr ? fy : 1 - fy;
      for (let dc = 0; dc < 2; dc++) {
        const t = tileAt(g, c + dc, r);
        if (t && t.terrain !== 'sea') land += wy * (dc ? fx : 1 - fx);
      }
    }
    return land;
  }

  // RGB is precomputed once per atlas redraw; ownership is only a *light* tint,
  // instead of the opaque political paint that made the old board a patchwork.
  function swatches(g) {
    const factions = g.factions || E.FACTIONS;
    const ownerColors = {};
    const rgb = color => {
      const value = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#999999';
      return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
    };
    return g.tiles.map(t => {
      if (t.terrain === 'sea') return EMPTY;
      const base = PALETTE[t.terrain] || PALETTE.plains;
      let tint = null;
      if (t.owner) {
        if (!ownerColors[t.owner]) ownerColors[t.owner] = rgb((factions[t.owner] || E.FACTIONS[t.owner] || {}).color);
        tint = ownerColors[t.owner];
      }
      const weight = tint ? 0.14 : 0;
      return {
        land: 1,
        red: base[0] * (1 - weight) + (tint ? tint[0] : 0) * weight,
        green: base[1] * (1 - weight) + (tint ? tint[1] : 0) * weight,
        blue: base[2] * (1 - weight) + (tint ? tint[2] : 0) * weight,
      };
    });
  }

  // Draw the geography into a low-resolution offscreen bitmap, then smooth it when
  // scaling into the cached map layer. The atlas is regenerated ONLY when that layer
  // becomes stale, not on every animation frame.
  let bitmap = null;
  function paint(destination, g, left, right, top, bottom, scale) {
    if (typeof document === 'undefined' || !document.createElement) return false;
    if (!bitmap) bitmap = document.createElement('canvas');
    const pixelRatio = 0.24; // CSS pixels: interpolate on upscale; bounds redraw cost while dragging.
    const width = Math.max(2, Math.min(1100, Math.ceil((right - left) * scale * pixelRatio)));
    const height = Math.max(2, Math.min(820, Math.ceil((bottom - top) * scale * pixelRatio)));
    if (bitmap.width !== width || bitmap.height !== height) {
      bitmap.width = width;
      bitmap.height = height;
    }
    const b = bitmap.getContext && bitmap.getContext('2d');
    if (!b || typeof b.createImageData !== 'function' || typeof b.putImageData !== 'function') return false;
    const pixels = b.createImageData(width, height);
    if (!pixels || !pixels.data) return false; // non-Canvas test harnesses retain the legacy fallback
    const data = pixels.data;
    const colors = swatches(g);
    const at = (c, r) => {
      if (r < 0 || r >= g.rows) return EMPTY;
      if (g.wrap) c = ((c % g.cols) + g.cols) % g.cols;
      return c < 0 || c >= g.cols ? EMPTY : colors[r * g.cols + c] || EMPTY;
    };
    const stepX = (right - left) / width;
    const stepY = (bottom - top) / height;
    const rowScale = 1 / (1.5 * R);
    const colScale = 1 / (SQ * R);
    for (let py = 0; py < height; py++) {
      const wy = top + (py + 0.5) * stepY;
      const yr = (wy - R) * rowScale;
      const r0 = Math.floor(yr);
      const fy = smooth(clamp(yr - r0, 0, 1));
      const rowWeight0 = 1 - fy;
      const rowWeight1 = fy;
      const parity0 = (r0 & 1) * 0.5;
      const parity1 = ((r0 + 1) & 1) * 0.5;
      for (let px = 0; px < width; px++) {
        const wx = left + (px + 0.5) * stepX;
        const x0 = (wx - R) * colScale - parity0;
        const x1 = (wx - R) * colScale - parity1;
        const c0 = Math.floor(x0);
        const c1 = Math.floor(x1);
        const fx0 = smooth(clamp(x0 - c0, 0, 1));
        const fx1 = smooth(clamp(x1 - c1, 0, 1));
        const a = at(c0, r0), b0 = at(c0 + 1, r0);
        const c = at(c1, r0 + 1), d = at(c1 + 1, r0 + 1);
        const wa = rowWeight0 * (1 - fx0);
        const wb = rowWeight0 * fx0;
        const wc = rowWeight1 * (1 - fx1);
        const wd = rowWeight1 * fx1;
        const land = a.land * wa + b0.land * wb + c.land * wc + d.land * wd;
        const alpha = smooth(clamp((land - 0.43) / 0.14, 0, 1));
        const inverse = land ? 1 / land : 0;
        const red = (a.red * wa + b0.red * wb + c.red * wc + d.red * wd) * inverse;
        const green = (a.green * wa + b0.green * wb + c.green * wc + d.green * wd) * inverse;
        const blue = (a.blue * wa + b0.blue * wb + c.blue * wc + d.blue * wd) * inverse;
        // World-anchored, continuous low-relief shading and subtle paper grain.
        const relief = Math.sin(wx * 0.0045 - wy * 0.0065) * 4.3;
        const grain = (((Math.imul((wx / 13) | 0, 374761393) ^
          Math.imul((wy / 13) | 0, 668265263)) & 255) - 127) * 0.012;
        const shallow = Math.max(0, 1 - Math.abs(land - 0.38) * 3) * (1 - alpha);
        const shore = Math.max(0, 1 - Math.abs(land - 0.5) * 12);
        const oceanLight = relief * 0.65;
        const shade = relief + grain;
        const i = 4 * (py * width + px);
        data[i] = clamp(27 * (1 - alpha) + red * alpha + shallow * 12 + shore * 13 + shade + oceanLight * (1 - alpha), 0, 255);
        data[i + 1] = clamp(72 * (1 - alpha) + green * alpha + shallow * 17 + shore * 11 + shade + oceanLight * (1 - alpha), 0, 255);
        data[i + 2] = clamp(98 * (1 - alpha) + blue * alpha + shallow * 19 + shore * 9 + shade + oceanLight * (1 - alpha), 0, 255);
        data[i + 3] = 255;
      }
    }
    b.putImageData(pixels, 0, 0);
    destination.save();
    destination.imageSmoothingEnabled = true;
    destination.imageSmoothingQuality = 'high';
    destination.drawImage(bitmap, left, top, right - left, bottom - top);
    destination.restore();
    return true;
  }
  return { paint, sample };
})();

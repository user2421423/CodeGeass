/* Real art only for Knightmares and commanders. City graphics remain faction-marked SVG icons. */
const ART = (() => {
  const INK = '#0b0d14';
  const FACTION_ART = {
    britannia: { trim: '#e3c06a', glow: '#8ff7ff', flag: '#b52f35', flag2: '#e3c06a' },
    eu: { trim: '#d7dde6', glow: '#ffd24a', flag: '#356fc8', flag2: '#f4d35e' },
    cf: { trim: '#f2c14e', glow: '#ff7a45', flag: '#b52a2a', flag2: '#f2c14e' },
    neutral: { trim: '#d8cfa6', glow: '#b8ff8a', flag: '#8a8466', flag2: '#e6dfc0' },
    bk: { trim: '#f0c94a', glow: '#ff5a5a', flag: '#1d1d24', flag2: '#f0c94a' },
    ufn: { trim: '#f6cf67', glow: '#37bfa9', flag: '#f8cf32', flag2: '#e70701' },
    jlf: { trim: '#c9d6a0', glow: '#9fff7a', flag: '#3d4a2c', flag2: '#d8e2b0' },
    eb: { trim: '#e3c06a', glow: '#d2a8ff', flag: '#4b2a7a', flag2: '#e3c06a' },
  };
  const P = pts => pts.map(p => p.map(v => +v.toFixed(1)).join(',')).join(' ');
  const poly = (pts, fill, extra = '') => `<polygon points="${P(pts)}" fill="${fill}" ${extra}/>`;
  const line = (x1, y1, x2, y2, stroke, w, extra = '') =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const circle = (x, y, r, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
  const ink = (w = 1.3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"`;
  // The official yellow U.F.N. standard, faithfully traced from the supplied artwork.
  // Kept inline so city canvas banners and conquest HTML cards use identical self-contained art.
  function ufnFlagSVG() {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 831 594\" aria-label=\"United Federation of Nations flag\"><rect width=\"831\" height=\"594\" fill=\"#f8cf32\"/><path fill=\"#ffffff\" fill-rule=\"evenodd\" d=\"M160 305 160 313 180 332 201 387 226 436 242 453 271 473 296 483 315 486 354 478 398 479 428 487 449 498 513 490 467 466 412 451 371 448 356 456 331 462 305 461 278 452 244 424 225 393 214 355 213 312 194 304ZM406 212 422 232 433 254 446 314 486 321 520 322 537 318 549 309 552 299 546 286 495 244 595 283 624 288 639 284 627 268 602 250 561 228 526 215 474 205 440 205ZM360 79 343 80 313 97 292 114 246 164 228 192 214 228 215 255 223 268 242 233 268 205 301 186 338 180 348 158 370 126 351 132 311 158 351 110 362 88Z\"/><path fill=\"#187abd\" fill-rule=\"evenodd\" d=\"M221 287 218 301 244 330 252 299 236 288ZM403 213 370 228 348 252 371 267 387 287 398 315 401 344 396 375 386 399 375 415 350 436 328 444 312 445 291 440 276 431 259 413 248 392 242 367 242 337 216 314 217 355 226 388 246 422 275 447 312 459 353 454 366 448 328 449 354 439 386 435 419 396 437 349 440 316 435 313 441 313 440 295 429 252ZM384 198 365 188 342 183 320 184 294 192 274 204 251 226 226 270 248 280 257 294 270 276 289 260 310 251 330 249 339 231 353 216Z\"/><path fill=\"#5bc5e5\" fill-rule=\"evenodd\" d=\"M329 252 298 258 269 281 258 298 259 315 255 304 246 334 255 348 245 340 247 380 263 414 285 434 309 442 342 437 374 412 391 382 398 349 396 318 384 287 367 267 348 256 341 271 340 291 353 337 342 328 326 293 325 266ZM309 353 321 359 329 369 333 395 326 412 314 423 303 426 282 416 273 390 281 366 294 355Z\"/><path fill=\"#e70701\" fill-rule=\"evenodd\" d=\"M336 485 387 489 415 501 432 517 481 496 449 501 421 488 385 481ZM232 448 250 476 266 492 294 507 328 507 357 489 311 489 288 484 266 474ZM346 445 392 445 430 451 478 467 519 490 557 491 618 504 556 466 490 444 453 438 396 437ZM144 300 148 311 144 309 166 323 156 310 160 302 194 301 205 304 242 333 230 316 209 298 187 295 176 300 147 295ZM328 269 331 299 344 324 337 296 337 274 346 249 365 228 386 215 417 205 448 201 488 203 543 217 583 235 633 269 642 286 635 291 601 288 517 257 550 286 555 297 553 309 530 324 468 322 514 333 537 334 559 330 570 324 578 312 575 297 565 287 651 321 682 324 691 317 685 299 666 278 615 242 545 210 470 192 418 192 377 204 345 228 334 246ZM385 58 354 64 313 88 279 116 236 162 212 200 202 231 202 263 212 279 242 287 254 297 246 282 229 276 218 267 210 244 211 226 218 205 250 154 284 117 316 91 341 77 358 75 365 81 363 95 330 142 362 123 371 123 374 128 346 170 388 118 383 109 357 116 387 74 389 62Z\"/><path fill=\"#adecfd\" fill-rule=\"evenodd\" d=\"M299 357 289 362 281 372 277 396 280 407 289 418 306 422 323 411 330 386 328 375 317 360Z\"/><path fill=\"#080a0d\" fill-rule=\"evenodd\" d=\"M142 301 152 316 178 334 202 395 229 448 246 474 267 495 294 509 319 511 344 502 361 488 377 489 411 501 432 520 468 502 514 492 571 495 629 510 582 477 513 448 451 436 389 435 412 410 429 380 439 348 443 316 501 333 547 335 562 331 575 322 580 313 578 295 614 311 660 325 682 326 693 317 683 293 656 267 610 237 551 210 495 194 456 189 418 190 387 198 370 188 342 182 390 118 389 111 383 107 365 110 381 89 391 68 390 60 380 55 341 68 285 108 236 159 208 204 200 231 199 257 205 274 219 285 216 300 205 295 190 295 203 295 214 300 242 332 199 303 158 304 157 310 164 323 144 307 143 300 147 296ZM335 485 349 481 385 480 421 487 449 500 482 496 432 518 415 502 399 494 377 488ZM231 448 266 473 288 483 311 488 358 489 328 508 294 508 266 493 249 476ZM345 445 396 436 453 437 490 443 556 465 595 486 619 504 557 492 519 491 478 468 430 452 392 446ZM158 305 198 303 215 313 216 358 227 394 244 422 272 447 309 460 340 459 373 446 415 450 473 467 514 490 448 499 424 487 395 480 360 479 309 487 272 475 227 440 203 395 178 331 159 314ZM221 286 241 289 253 299 244 331 217 301ZM317 251 330 252 326 269 328 296 337 318 351 337 339 296 344 257 349 255 378 277 396 313 399 352 390 387 367 421 340 439 308 443 279 431 259 410 245 376 243 344 245 338 253 347 245 330 255 303 258 313 257 297 264 286 289 262ZM306 354 287 361 275 384 280 411 298 424 318 419 326 410 332 392 331 378 325 365ZM300 355 319 360 331 380 327 407 319 417 305 424 287 418 279 408 275 394 280 371ZM403 212 430 252 441 295 442 313 436 313 441 316 438 349 420 396 386 436 354 440 329 449 367 448 353 455 312 460 275 448 245 422 229 397 216 355 215 314 243 337 243 367 249 392 260 413 276 430 291 439 312 444 328 443 350 435 374 415 385 399 395 375 400 344 397 315 386 287 371 268 347 252 370 227ZM404 211 437 204 480 204 534 216 606 251 638 277 640 285 635 289 597 285 496 246 528 267 546 284 553 296 549 311 524 323 491 323 444 315 433 258 421 233ZM327 269 333 246 344 228 377 203 418 191 470 191 545 209 615 241 666 277 686 299 692 317 682 325 651 322 565 288 576 297 579 312 570 325 559 331 537 335 514 334 468 323 530 323 552 309 554 297 551 289 517 256 601 287 635 290 641 286 633 270 583 236 543 218 488 204 448 202 417 206 386 216 365 229 349 246 340 265 338 296 343 324 330 299ZM385 198 353 217 340 231 330 250 310 252 289 261 271 276 257 295 248 281 225 270 250 226 274 203 294 191 320 183 342 182 365 187ZM359 77 364 85 358 101 313 157 350 131 369 124 371 131 352 154 339 181 300 188 269 206 243 234 224 270 213 253 212 231 221 203 243 166 266 138 307 100 341 79ZM385 57 390 62 388 74 357 117 372 109 383 108 389 113 389 118 346 171 352 156 373 128 371 124 362 124 330 141 362 95 364 81 358 76 341 78 304 101 268 134 244 163 219 205 212 226 211 244 219 267 246 281 255 297 237 286 212 280 201 263 201 231 211 200 235 162 279 115 313 87 354 63Z\"/></svg>";
  }
  // ---- Cities ----
  function citySVG(kind, side) {
    const f = FACTION_ART[side] || FACTION_ART.neutral,
      wall = side === 'neutral' ? '#c9b98c' : side === 'ufn' ? '#9da39b' : side === 'cf' ? '#cdbfae' : side === 'eu' ? '#cfd3da' : '#d8d2e6',
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
  // New elite variants share the published image of their underlying standard frame.
  const ELITE_ART_ALIASES = {
    elite_vincent_ward: 'vincent_ward',
    elite_sutherland_air: 'sutherland_air',
    elite_hummel_battery: 'hummel_battery',
    elite_akatsuki_missile: 'akatsuki_missile',
    elite_akatsuki_heavy: 'akatsuki_heavy',
    elite_portman_ii: 'portman_ii',
    elite_panzer_frosch_ii: 'panzer_frosch_ii',
    elite_shui_gun_ru_ii: 'shui_gun_ru_ii',
    elite_europe_eu_carrier: 'eu_carrier',
    elite_europe_eb_carrier: 'carrier_battleship',
    elite_japan_britannia_carrier: 'carrier_battleship',
    elite_japan_eu_carrier: 'eu_carrier',
    elite_japan_cf_carrier: 'cf_carrier',
    elite_japan_bk_carrier: 'cf_carrier',
    bk_carrier: 'cf_carrier', // Regular Black Knights carrier uses the published generic carrier sprite.
    elite_japan_bk_amphibious: 'shui_gun_ru_ii',
  };
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
    ufnFlagSVG,
    // HTML: a Knightmare for panels and cards.
    unit(type, extra = '', side) {
      const l = withLocal('units', ELITE_ART_ALIASES[type] || type);
      return `<span class="ship-art unit-art${l.cls} ${extra}" aria-hidden="true">${l.html}</span>`;
    },
    city(kind, side, extra = '') {
      const e = localEntry('buildings', 'city'),
        drawn = citySVG(kind, side);
      const html = e
        ? `${drawn}<img src="${escapeAttr(e.base + e.src)}" alt="" draggable="false" onload="this.previousElementSibling.style.visibility='hidden'" onerror="this.remove()">`
        : drawn;
      // Overlay the standard even when the shared city picture loads.
      const banner = side === 'ufn'
        ? `<span class="ufn-city-flag" style="position:absolute;top:1%;right:3%;width:40%;pointer-events:none">${ufnFlagSVG()}</span>`
        : '';
      return `<span class="ship-art unit-art city-art${e ? ' local-art' : ''} ${extra}" style="${banner ? 'position:relative' : ''}" aria-hidden="true">${html}${banner}</span>`;
    },
    portrait(k, extra = '') {
      const e = localEntry('portraits', k),
        style = e ? ` style="object-position:${(e.fx ?? 0.5) * 100}% ${(e.fy ?? 0.25) * 100}%"` : '',
        l = withLocal('portraits', k, style);
      return `<span class="portrait-art${l.cls} ${extra}" aria-hidden="true">${l.html}</span>`;
    },
    // Canvas: draw a cached image centered at (x, y); false while the image is still decoding.
    drawUnit(ctx, type, side, x, y, w, h = w, flip = false) {
      const local = localImage('units', ELITE_ART_ALIASES[type] || type);
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
    drawFlag(ctx, side, x, y, w) {
      if (side !== 'ufn') return false;
      const img = image('flag|ufn', ufnFlagSVG());
      if (!img) return false;
      const h = w * (594 / 831);
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = '#b79625';
      ctx.lineWidth = 2;
      ctx.moveTo(x - 3, y - 2);
      ctx.lineTo(x - 3, y + h + 9);
      ctx.stroke();
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
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
      image('flag|ufn', ufnFlagSVG());
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
ART.preload(['britannia', 'eu', 'cf', 'neutral', 'bk', 'jlf', 'eb', 'ufn']);

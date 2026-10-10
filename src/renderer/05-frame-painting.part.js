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
  // Draw already-baked world atlas tiles directly at camera position. Avoid
  // rebuilding a full screen-sized canvas each time the camera crosses its
  // margin; that expensive copy was the remaining source of dragging stutter.
  if (game.wrap && scale >= 0.33) {
    ctx.save();
    ctx.translate(offset.x + jolt.x, offset.y + jolt.y);
    ctx.scale(scale, scale);
    drawMapFromAtlas(scale, detail,
      -offset.x / scale - R * 2,
      (w - offset.x) / scale + R * 2,
      -offset.y / scale - R * 2,
      (h - offset.y) / scale + R * 2);
    ctx.restore();
  } else {
    // Campaign battlefields and far strategic zoom retain their existing
    // cached layer; selection/attack effects remain independent in either path.
    const layer = mapLayer(scale, detail, dpr, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(
      layer.canvas,
      Math.round((offset.x - layer.x - MAP_LAYER_MARGIN + jolt.x) * dpr),
      Math.round((offset.y - layer.y - MAP_LAYER_MARGIN + jolt.y) * dpr),
    );
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
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
  // Move and attack overlays. Blue marks water for the moving unit: open sea, or a coast hex a warship sails into.
  const movingShip = E.TYPES[selectedUnit()?.type]?.naval === 'ship';
  for (const k of readyCache.keys()) {
    const [cc, rr] = k.split(',').map(Number),
      t = E.tile(game, cc, rr),
      c = hexCenter(t),
      water = E.isSea(t) || (movingShip && E.isCoast(t));
    for (const x of copies(c.x)) {
      hexPath(x, c.y, R - 1.5);
      ctx.fillStyle = water ? '#4fb6ff40' : '#3ddc7a40';
      ctx.fill();
      ctx.strokeStyle = water ? '#9fd8ffcc' : '#6dffa5cc';
      ctx.lineWidth = 1.4 / Math.max(scale, 0.4);
      ctx.stroke();
      if (water && detail) outlinedText('⚓', x, c.y + 5, 12, '#d8f0ff', scale);
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
  if (selTile) {
    if (visible(hexCenter(selTile))) mapHasPulse = true;
    for (const x of copies(hexCenter(selTile).x)) selectedHex({ x, y: hexCenter(selTile).y }, time, scale);
  }
  // Ports: the owner's harbour picture on the port's sea hex, nudged toward its city, with a ⚓ in the holder's
  // colour. It is drawn before cities and units, so a ship in port sits on top. Far out, the picture would be
  // too small to read, so only the ⚓ marks the port.
  for (const s of game.stations) {
    if (!s.portLevel || !s.portAt) continue;
    const sea = visualPortCenter(s);
    if (!visible(sea)) continue;
    const shore = visualCityCenter(s);
    const dx = wrapNear(shore.x, sea.x) - sea.x, dy = shore.y - sea.y;
    const distance = Math.hypot(dx, dy) || 1;
    const ux = dx / distance, uy = dy / distance, holder = F(s.portOwner || s.owner).color;
    for (const x of copies(sea.x)) {
      if (detail && ART.drawBuilding(ctx, 'port', x + ux * R * 0.15, sea.y + uy * R * 0.15, R * 1.75))
        outlinedText('⚓', x + R * 0.62, sea.y - R * 0.5, 12, holder, scale, 'Trebuchet MS', true);
      else outlinedText('⚓', x + ux * R * 0.58, sea.y + uy * R * 0.58 + 4, detail ? 14 : 11, holder, scale, 'Trebuchet MS', true);
    }
  }
  // Cities. Labels scale by strategic importance so dense Europe/China remain readable.
  const pickedCity = selectedStation()?.id;
  for (const s of game.stations) {
    const c = visualCityCenter(s);
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
      ctx.fillRect(-20, 27, s.maxShield ? (40 * s.shield) / s.maxShield : 0, 4);
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
        mapHasPulse = true;
        const pulse = 0.5 + 0.5 * Math.sin(time / 300);
        ctx.strokeStyle = `rgba(255,95,174,${0.45 + 0.5 * pulse})`;
        ctx.lineWidth = Math.max(2.5, 2 / scale);
        ctx.beginPath();
        ctx.arc(0, -4, R * (0.95 + 0.07 * pulse), 0, Math.PI * 2);
        ctx.stroke();
        outlinedText(`F.L.E.I.J.A. · ${Math.max(0, s.project.ready - game.turn)}`, 0, -R - 4, 10, '#ff9fd0', scale, 'Trebuchet MS', true);
      }
      if (s.eliminatorProject || s.eliminator) {
        mapHasPulse = true;
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
    const c = visualCityCenter(ruin);
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
  // Unit tokens drawn back to front: base plate, frame ring, Knightmares, strength bars and commander pins.
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
          mapHasPulse = true;
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
    if (visible(p)) mapHasPulse = true;
    for (const x of copies(p.x)) drawCrosshair({ x, y: p.y }, time, scale);
  }
  // Campaign warnings: the hexes a scripted strike will hit next turn.
  for (const w of game.campaign?.warnings || []) {
    mapHasPulse = true;
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
  if (hover && strikeMode) {
    mapHasPulse = true;
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
  // Subtle permanent markers for the already-reviewed coastline exceptions.
  // Players can spot mixed land/sea semantics before hovering, without
  // cluttering the map with markers over 400 ordinary coastal hexes.
  // The Arctic is intentionally excluded.
  if (game.wrap && R * scale >= 27) {
    const coastalExceptions = [
      [158,21], [160,21], [159,23], [157,24],
      [106,26], [10,31], [133,31],
      [140,43], [142,46], [96,50], [166,59], [147,62], [56,75],
    ];
    for (const [c,r] of coastalExceptions) {
      const t = E.tile(game, c, r);
      if (!t) continue;
      const p = hexCenter(t);
      if (!visible(p)) continue;
      for (const x of copies(p.x)) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + R * 0.48, p.y - R * 0.37, 3.1 / scale, 0, Math.PI * 2);
        ctx.fillStyle = E.isSea(t) ? 'rgba(108,214,255,0.8)' : 'rgba(255,216,129,0.78)';
        ctx.fill();
        ctx.lineWidth = 0.85 / scale;
        ctx.strokeStyle = '#0d293bc5';
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  if (hover) {
    const p = hexCenter(hover),
      u = selectedUnit(),
      hx = wrapNear(p.x, mid);
    hexPath(hx, p.y, R - 1);
    // The vector coastline and playable hexes intentionally differ at some
    // straits/islands. Hover colours always describe ACTUAL gameplay terrain:
    // aqua = navigable sea; warm gold = traversable land.
    const seaHex = E.isSea(hover),
      coastHex = E.isCoast(hover);
    // Coast hexes are both: a sea-green outline, and never the mixed-terrain tint (they are meant to be mixed).
    ctx.strokeStyle = coastHex ? '#9ff0d2df' : seaHex ? '#7cd8ffdb' : '#ffe1a0df';
    ctx.lineWidth = 1.65 / Math.max(scale, 0.35);
    ctx.stroke();
    // Realistic coastlines can cover a minority of a playable hex. When the
    // two maps disagree at this hex centre, label the ACTUAL gameplay terrain
    // so sea movement and landing decisions are never visually ambiguous.
    const visuallyMixed = !coastHex && game.wrap && R * scale >= 16 &&
      (GEOGRAPHY.visualLandAt(p.x, p.y) === seaHex || GEOGRAPHY.visualMixedHex(hover.c, hover.r));
    if (visuallyMixed) {
      // A sea tile behind geographic land should never look walkable.
      // Tint the hex with its TRUE tactical type on hover.
      ctx.save();
      hexPath(hx, p.y, R - 1);
      ctx.fillStyle = seaHex ? 'rgba(42,154,225,0.19)' : 'rgba(245,197,91,0.15)';
      ctx.fill();
      ctx.setLineDash([5 / scale, 4 / scale]);
      ctx.strokeStyle = seaHex ? '#89e1ff' : '#ffe19a';
      ctx.lineWidth = 2 / Math.max(scale, 0.4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
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
      // Damage, defense and counter labels appear when the projectile actually lands.
      const elapsed = e.max - e.life - (e.delay || 0);
      if (elapsed >= 0) {
        const duration = e.duration || e.max;
        const age = Math.min(1, elapsed / duration);
        ctx.globalAlpha = Math.max(0, 1 - age);
        const pop = e.pop ? 1 + Math.max(0, 1 - age * 7) * 0.7 : 1;
        outlinedText(e.text, bx, b0.y - 28 - age * 28 - (e.dy || 0),
          (e.size || 14) * pop, e.color, scale, 'Trebuchet MS', true);
      }
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

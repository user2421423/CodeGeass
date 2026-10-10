  // ======== Terrain ========
  const TERRAIN = {
    sea: { name: 'Ocean', desc: 'Units embark as transports: they cannot attack and take 50% extra damage.' },
    // Shoreline hexes that are part land, part water: land for land units, open water for warships (one unit per hex).
    coast: {
      name: 'Coast',
      cost: 1,
      desc: 'Movement cost 1. Shore and shallows: land units stand and fight here as on land, and warships can sail through.',
    },
    plains: { name: 'Plains', cost: 1, desc: 'Movement cost 1. No terrain defense or attrition.' },
    forest: { name: 'Forest', cost: 2, cover: 0.15, desc: 'Movement cost 2. Incoming damage reduced by 15%.' },
    mountain: { name: 'Mountains', cost: 2, cover: 0.25, desc: 'Movement cost 2. Incoming damage reduced by 25%.' },
    desert: {
      name: 'Desert',
      cost: 1,
      attrition: 0.03,
      desc: 'Movement cost 1. Heat strains Energy Fillers: units lose 3% of their frame each turn they start here.',
    },
    snow: {
      name: 'Tundra',
      cost: 2,
      attrition: 0.025,
      desc: 'Movement cost 2. Units lose 2.5% of their frame each turn they start here.',
    },
    peak: { name: 'Impassable peaks', blocked: true, desc: 'The high Himalaya and the Greenland ice cap: impassable.' },
    // City ruins appear on campaign maps only.
    urban: { name: 'City ruins', cost: 1, cover: 0.2, desc: 'Movement cost 1. Buildings and rubble cut incoming damage by 20%.' },
    crater: {
      name: 'F.L.E.I.J.A. crater',
      cost: 2,
      desc: 'Movement cost 2. A F.L.E.I.J.A. warhead erased everything here and glassed the ground pink and white.',
    },
  };
  const TERRAIN_CODES = {
    '.': 'sea',
    p: 'plains',
    f: 'forest',
    m: 'mountain',
    d: 'desert',
    s: 'snow',
    x: 'peak',
    u: 'urban',
    c: 'crater',
    w: 'coast',
  };
  const CONQUEST_MOVE_BONUS = 2,
    SEA_MOVE = { conquest: 5, campaign: 5 },
    CARRIER_ESCORT_SEA = 10; // a Portman that starts next to a friendly Carrier-Battleship swims this far
  // Warships and amphibious frames, built only in Conquest.
  const NAVAL = {
    britannia: { amphibious: 'portman', amphibious2: 'portman_ii', carrier: 'carrier_battleship' },
    eu: { amphibious: 'panzer_frosch', amphibious2: 'panzer_frosch_ii', carrier: 'eu_carrier' },
    cf: { amphibious: 'shui_gun_ru', amphibious2: 'shui_gun_ru_ii', carrier: 'cf_carrier' },
  };
  const navalTypes = (g, side) => (g?.mode === 'campaign' ? [] : Object.values(NAVAL[side] || {}));
  const isShip = u => TYPES[u?.type]?.naval === 'ship';
  // Ports: a city building on one sea hex beside the city (repair: PORT.repair by level).
  const PORT = { repair: [0, 0.1, 0.2, 0.3] };
  function portSite(g, s) {
    if (s.portAt) return tile(g, s.portAt.c, s.portAt.r);
    // Baseline starting ports must stay on their exact original hexes.
    // Non-starting ports retain the normal neighbour-selection rules.
    const anchored = COASTAL_PORT_HEXES[s.name];
    if (anchored) {
      const fixed = tile(g, anchored[0], anchored[1]);
      if (!fixed || !isSea(fixed) || !adjacent(g, s).includes(fixed) ||
          g.stations.some(o => o !== s && o.portAt && key(o.portAt) === key(fixed)))
        throw new Error('Unavailable fixed starting port for ' + s.name);
      return fixed;
    }
    const taken = new Set(g.stations.filter(o => o.portAt).map(o => key(o.portAt)));
    return (
      adjacent(g, s)
        .filter(t => isSea(t) && !taken.has(key(t)))
        .sort((a, b) => adjacent(g, b).filter(navigable).length - adjacent(g, a).filter(navigable).length || a.r - b.r || a.c - b.c)[0] ||
      null
    );
  }
  function openPort(g, s, level) {
    const t = portSite(g, s);
    if (!t) return;
    s.portAt = { c: t.c, r: t.r };
    s.portLevel = level;
    s.portOwner = s.owner;
  }
  const portAtHex = (g, p) => g.stations.find(s => s.portLevel && s.portAt && s.portAt.c === p.c && s.portAt.r === p.r) || null;
  const hasPort3 = (g, side) => g.stations.some(s => (s.portLevel || 0) >= 3 && s.portOwner === side);
  function carrierCapacity(g, ship) {
    if (!isShip(ship)) return 0;
    return TYPES[ship.type].capacity + (techLevel(g, ship.side, 'naval.hangars') ? 1 : 0);
  }
  const canBoard = (g, ship) => isShip(ship) && ship.hp > 0 && (ship.cargo?.length || 0) < carrierCapacity(g, ship);
  // Every unit on the map plus the Knightmares carried inside Carrier-Battleships.
  const allUnits = g => g.units.flatMap(u => (u.cargo?.length ? [u, ...u.cargo] : [u]));
  // Single source of truth for visual geography invalidation. Only actual tile changes advance it.
  function setTileOwner(g, t, owner) {
    if (t.owner === owner) return;
    t.owner = owner;
    g.mapRevision = (g.mapRevision || 0) + 1;
  }
  function setTileTerrain(g, t, terrain) {
    if (t.terrain === terrain) return;
    t.terrain = terrain;
    g.mapRevision = (g.mapRevision || 0) + 1;
  }
  const isSea = t => t?.terrain === 'sea';
  // Coast hexes count as land for land units (isSea is false) and as water for warships.
  const isCoast = t => t?.terrain === 'coast';
  const navigable = t => isSea(t) || isCoast(t);
  // Embarked as a transport: a land unit on a sea hex. Warships and amphibious frames fight normally at sea.
  function atSea(g, u) {
    return isSea(tile(g, u.c, u.r)) && !TYPES[u.type].naval;
  }
  function amphibiousSea(g, u) {
    const escort = adjacent(g, u).some(n => {
      const v = unitAt(g, n);
      return v && v.side === u.side && isShip(v);
    });
    const sea = TYPES[u.type].seaMove + techValue(g, u.side, 'naval.amphibious');
    return escort ? Math.max(CARRIER_ESCORT_SEA, sea) : sea;
  }
  // Embarked units take extra damage; Landing Craft halves the penalty.
  function seaPenalty(g, side) {
    return techLevel(g, side, 'naval.landing') ? 0.25 : 0.5;
  }
  function seaMove(g, u) {
    const base = g?.mode === 'campaign' ? SEA_MOVE.campaign : SEA_MOVE.conquest;
    // Naval Logistics raises transports from 5 to 6. Level II changes embark/landing tempo instead of adding speed.
    return base + Math.min(1, techValue(g, u.side, 'naval.logistics'));
  }

  // An admiral's rank sets the frame bonus of the unit they command (112% for a Second Lieutenant to 160%).
  function maxHP(u) {
    const es = eliteScale(u);
    return Math.round(
      TYPES[u.type].hp *
        es.hp *
        (1 + 0.7 * (u.stack - 1)) *
        (u.cmdRank == null ? 1 : RANK_HP[u.cmdRank] || 1) *
        (1 + (u.hpTech || 0)),
    );
  }
  // Version 3 added Sakuradite. Older saves were all made on the old 100 × 42 map and are rejected.
  const RULES_VERSION = 3;
  // 2026 coastline alignment: retain old saves while matching the revised
  // new-game map. Occupied legacy hexes stay playable until a new conquest;
  // never strand a unit or move a player-built site during migration.
  const COASTAL_SEA_FIXES = [[13, 9], [168, 9], [50, 10], [49, 12],
    [81, 32], [113, 51], [157, 44], [49, 31],
    [0, 6], [127, 0], [158, 1], [55, 8], [56, 8], [156, 63],
    [141, 44],  // Malacca: only unoccupied legacy land becomes water
    [111, 36]];  // Bab-el-Mandeb
  // The Caspian was the sole isolated sea component. Legacy saves migrate
  // it to traversable land, preserving occupied old tiles and player-built sites.
  // Red Sea coast hexes (Egypt 107,27; Yemen 111,34 and 111,35) became land the same way.
  const CASPIAN_LAND_FIXES = [[113,17],[114,17],[114,18],[115,17],[115,18],[114,19],[115,19],[115,20],[116,20],[115,21],[114,21],
    [107,27], [111,34], [111,35]];
  const TSUGARU_STRAIT = [160, 19];
  function coastalTileOccupied(g, c, r) {
    return g.units.some(u => u.hp > 0 && u.c === c && u.r === r) ||
      g.stations?.some(s => (s.c === c && s.r === r) ||
        (s.portAt?.c === c && s.portAt?.r === r)) ||
      g.sites?.some(site => site.c === c && site.r === r);
  }
  function migrateCoastalTerrain(g) {
    for (const [c, r] of COASTAL_SEA_FIXES) {
      const t = g.tiles[r * g.cols + c];
      if (!t || t.terrain === 'sea') continue;
      if (g.units.some(u => u.hp > 0 && u.c === c && u.r === r)) continue;
      if (g.stations?.some(s => (s.c === c && s.r === r) ||
        (s.portAt?.c === c && s.portAt?.r === r))) continue;
      if (g.sites?.some(site => site.c === c && site.r === r)) continue;
      setTileTerrain(g, t, 'sea');
      setTileOwner(g, t, null);
    }
    const [tc, tr] = TSUGARU_STRAIT;
    const strait = g.tiles[tr * g.cols + tc];
    if (strait && strait.terrain !== 'sea' && !coastalTileOccupied(g, tc, tr)) {
      setTileTerrain(g, strait, 'sea');
      setTileOwner(g, strait, null);
    }
    const filled = [];
    for (const [c, r] of CASPIAN_LAND_FIXES) {
      const t = g.tiles[r * g.cols + c];
      if (!t || t.terrain !== 'sea' || coastalTileOccupied(g, c, r)) continue;
      setTileTerrain(g, t, 'plains');
      setTileOwner(g, t, null);
      filled.push(t);
    }
    // Coast hexes (part land, part water) arrived after older saves were made. A sea hex turned coast
    // inherits a neighbouring owner; craters and other later terrain changes are kept.
    const KEEP = new Set(['coast', 'crater', 'urban', 'peak']);
    for (const t of g.tiles) {
      if (WORLD_ROWS[t.r]?.[t.c] !== 'w' || KEEP.has(t.terrain)) continue;
      const wasSea = t.terrain === 'sea';
      setTileTerrain(g, t, 'coast');
      if (wasSea) filled.push(t);
    }
    // Carry over the saved political situation rather than assigning a
    // new game faction. Progress from neighbouring owned land inward.
    for (let pass = 0; pass < CASPIAN_LAND_FIXES.length; pass++) {
      let changed = false;
      for (const t of filled) {
        if (t.owner) continue;
        const n = adjacent(g, t).find(n => n.terrain !== 'sea' && n.owner);
        if (n) { setTileOwner(g, t, n.owner); changed = true; }
      }
      if (!changed) break;
    }
    // Newfoundland was restored as land by the previous correction batch.
    const t = g.tiles[15 * g.cols + 61];
    if (t && t.terrain === 'sea' &&
        !g.units.some(u => u.hp > 0 && u.c === 61 && u.r === 15)) {
      setTileTerrain(g, t, 'plains');
    }
  }
  // New Zealand's South Island is separated from Auckland by Cook Strait.
  // The city-based land flood-fill cannot reach these eight land/coast tiles.
  // Attach previously unowned tiles to whichever side controls Auckland, so
  // new conquests and older saves use the same province/capture semantics.
  const NZ_SOUTH_ISLAND = [
    [175, 68], [176, 68], [173, 69], [174, 69],
    [175, 69], [173, 70], [174, 70], [175, 70],
  ];
  function attachUnclaimedNewZealand(g) {
    const auckland = g.stations.find(s => s.name === 'Auckland');
    if (!auckland?.owner) return;
    for (const [c, r] of NZ_SOUTH_ISLAND) {
      const t = tile(g, c, r);
      // Never overwrite territory that changed hands during an existing game.
      if (!t || isSea(t) || t.owner || t.provinceCity != null) continue;
      setTileOwner(g, t, auckland.owner);
      t.provinceCity = auckland.id;
    }
  }
  // Each painted conquest land hex is permanently attached to one city. Existing ownership
  // determines its initial faction; the closest city of that faction becomes its province
  // center. This keeps historical borders and Indonesia's intentional overrides intact.
  // City IDs (unlike array indices) survive captures and F.L.E.I.J.A. removals.
  function assignCityProvinces(g) {
    const byOwner = new Map();
    for (const s of g.stations) {
      if (!byOwner.has(s.owner)) byOwner.set(s.owner, []);
      byOwner.get(s.owner).push(s);
    }
    for (const t of g.tiles) {
      if (isSea(t)) {
        delete t.provinceCity;
        continue;
      }
      // A previously assigned province must not be reassigned after its city
      // changes hands. This also keeps province borders stable across saves.
      if (t.provinceCity != null || !t.owner) continue;
      const cities = byOwner.get(t.owner) || [];
      let nearestCity = null, nearestDistance = Infinity;
      for (const s of cities) {
        const d = dist(g, s, t);
        if (d < nearestDistance || (d === nearestDistance && s.id < nearestCity.id)) {
          nearestCity = s;
          nearestDistance = d;
        }
      }
      if (nearestCity) t.provinceCity = nearestCity.id;
    }
  }


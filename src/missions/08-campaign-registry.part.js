  // Two story seasons: Lelouch of the Rebellion (2010–2017) and R2 (2018), each played from
  // the Black Knights' side and from Britannia's. Mission ids are kept so saved stars carry over.

  // Experimental Story Mode pacing pass. This only affects new missions launched on
  // this branch; existing in-progress game boards are not rescaled on load.
  // Keep the hand-authored bomb timers, escape set pieces and large UFN maps intact.
  const STORY_PACING_EXCEPTIONS = new Set([
    'bk_saitama', 'bk5', 'br2', 'br3', 'br_execution', 'cf6',
    'eb_ark', 'eu_ambush', 'eu_white_death', 'bk10', 'br11',
  ]);
  // Widening narrow straits can strand units, so naval/island missions retain
  // their coast geometry while still receiving garrisons and longer deadlines.
  const STORY_PACING_KEEP_COAST = new Set([
    'bk_shikine', 'br_shikine', 'bk_pacific', 'br_pacific',
    'bk_yokosuka2', 'br_yokosuka2',
  ]);
  const STORY_PACING_FACTOR = 1.5;

  function longerStoryMission(m) {
    if (STORY_PACING_EXCEPTIONS.has(m.id) || m.id.startsWith('ufn')) return;
    const conditions = Array.isArray(m.win) ? m.win : [m.win];
    const hold = conditions.some(condition => condition && condition.hold);
    // Already-designed 20+ turn offensive encounters do not need enlargement.
    if (!hold && (!m.lose?.turns || m.lose.turns >= 20)) return;
    const originalMap = m.map;
    const originalUnits = m.units;
    const originalCities = m.cities;
    const stretch = !hold && !STORY_PACING_KEEP_COAST.has(m.id);
    const loc = n => Math.round(n * STORY_PACING_FACTOR);
    const tile = (c, r) => m.map[r]?.[c];
    const clonePosition = value => {
      if (Array.isArray(value)) {
        // Story unit specs: [side, frame, column, row, stack, commander, options].
        if (typeof value[0] === 'string' && typeof value[1] === 'string'
            && Number.isFinite(value[2]) && Number.isFinite(value[3]))
          return value.map((item, index) =>
            index === 2 || index === 3 ? stretch ? loc(item) : item : clonePosition(item));
        return value.map(clonePosition);
      }
      if (!value || typeof value !== 'object') return value;
      const out = {};
      for (const [key, entry] of Object.entries(value)) out[key] = clonePosition(entry);
      if (stretch) {
        if (Number.isFinite(value.c)) out.c = loc(value.c);
        if (Number.isFinite(value.r)) out.r = loc(value.r);
      }
      return out;
    };
    if (stretch) {
      const oldHeight = originalMap.length, oldWidth = originalMap[0].length;
      const width = loc(oldWidth - 1) + 1, height = loc(oldHeight - 1) + 1;
      // Every authored terrain position remains exactly the same type after
      // transformation, including bridges, islands, city tiles and obstacles.
      m.map = Array.from({ length: height }, (_, r) =>
        Array.from({ length: width }, (_, c) =>
          originalMap[Math.min(oldHeight - 1, Math.round(r / STORY_PACING_FACTOR))]
            [Math.min(oldWidth - 1, Math.round(c / STORY_PACING_FACTOR))]).join(''));
      m.cities = originalCities.map(city => [
        city[0], loc(city[1]), loc(city[2]), ...city.slice(3),
      ]);
      m.units = originalUnits.map(clonePosition);
      if (m.goals) {
        m.goals = Object.fromEntries(Object.entries(m.goals).map(([side, goals]) =>
          [side, goals.map(goal => [loc(goal[0]), loc(goal[1]), ...goal.slice(2)])]));
      }
    } else {
      m.cities = originalCities.map(city => [...city]);
      m.units = originalUnits.map(spec => clonePosition(spec));
    }

    // Increase enemy city defenses without rewriting authored fortress shields,
    // objective names, scripts, or faction rosters.
    const ally = side => side === m.player ||
      (m.teams && m.teams[side] && m.teams[side] === m.teams[m.player]);
    m.cities = m.cities.map(city => {
      const next = [...city];
      if (!ally(next[3]) && Number.isFinite(next[4]))
        next[4] = Math.min(3, next[4] + 1);
      return next;
    });

    const slots = new Set(m.units.map(u => String(u[2]) + ':' + String(u[3])));
    for (const city of m.cities) slots.add(city[1] + ':' + city[2]);
    const valid = (c, r, water) => {
      const code = tile(c, r);
      return code && code !== 'x' && (code === '.') === water &&
        !slots.has(c + ':' + r);
    };
    const templatesBySide = {};
    for (const u of m.units) {
      const opts = u[6] || {};
      // Clone ordinary equipment from either led or unled formations, but never
      // clone commanders themselves, Elite aces, or carrier cargo.
      if (opts.cargo || opts.normalOnly || opts.skipNormal ||
          String(u[1]).startsWith('elite_')) continue;
      (templatesBySide[u[0]] ||= []).push(u);
    }
    function candidate(u) {
      const water = tile(u[2], u[3]) === '.';
      for (let distance = 2; distance <= 7; distance++) {
        for (let dr = -distance; dr <= distance; dr++) {
          for (let dc = -distance; dc <= distance; dc++) {
            if (Math.max(Math.abs(dc), Math.abs(dr)) !== distance) continue;
            const c = u[2] + dc, r = u[3] + dr;
            if (valid(c, r, water)) {
              slots.add(c + ':' + r);
              return [u[0], u[1], c, r, Math.min(3, Math.max(1, u[4] || 1)), null];
            }
          }
        }
      }
      return null;
    }
    for (const [side, templates] of Object.entries(templatesBySide)) {
      const count = Math.min(8, Math.max(ally(side) ? 3 : 2,
        Math.ceil(templates.length * (ally(side) ? 0.65 : 0.24))));
      let placed = 0;
      for (let i = 0; i < count * 3 && placed < count; i++) {
        const newUnit = candidate(templates[i % templates.length]);
        if (newUnit) {
          m.units.push(newUnit);
          placed++;
        }
      }
    }

    // Scripted dialogue/reinforcement phases should advance with the expanded
    // fighting, rather than concluding while units are still marching.
    const turnScale = stretch ? 1.5 : 1.65;
    m.events = (m.events || []).map(event => {
      const next = clonePosition(event);
      if (Number.isFinite(event.turn) && event.turn > 1)
        next.turn = Math.round((event.turn - 1) * turnScale) + 1;
      return next;
    });
    // A defensive hold is an actual turn objective: extending only its loss
    // timer would still end the mission on turn 5-10.
    m.win = (Array.isArray(m.win) ? m.win : [m.win]).map(condition =>
      condition?.hold ? { ...condition, hold: Math.max(17, Math.min(19,
        Math.round(condition.hold * 1.8))) } : condition);
    if (m.win.length === 1) m.win = m.win[0];
    if (hold && typeof m.objective === 'string') {
      const requiredTurn = (Array.isArray(m.win) ? m.win : [m.win])
        .find(condition => condition?.hold).hold;
      // The briefing must match the adjusted hold victory condition. One
      // mission formerly had different Normal vs Hard labels; both now use
      // the same explicit deadline rather than promising an early victory.
      m.objective = m.objective.replace(
        /\bturn\s+\d+(?:\s+on\s+Normal,\s+or\s+turn\s+\d+\s+on\s+Hard\s+and\s+above)?/gi,
        'turn ' + requiredTurn);
    }
    if (m.lose?.turns)
      m.lose = { ...m.lose, turns: Math.max(27, Math.min(32,
        Math.ceil(m.lose.turns * 1.7))) };
    if (Number.isFinite(m.normalTurns) && m.lose?.turns)
      m.normalTurns = m.lose.turns + 2;
    m.stars = (m.stars || []).map(star =>
      Number.isFinite(star.turns)
        ? { ...star, turns: Math.max(17, Math.min(22, Math.round(star.turns * 1.8))) }
        : star);

    // Timed reinforcements keep both sides engaged in the middle/late game.
    // They use the exact frame types already fielded in this mission.
    function wave(side, amount) {
      const templates = templatesBySide[side] || [];
      if (!templates.length) return [];
      return Array.from({ length: amount }, (_, i) => {
        const u = templates[i % templates.length];
        return [side, u[1], u[2], u[3], Math.min(3, u[4] || 1), null];
      });
    }
    const enemies = Object.keys(templatesBySide).filter(side => !ally(side));
    const friends = Object.keys(templatesBySide).filter(ally);
    const spawnWave = (turn, enemyCount, friendlyCount) => {
      const spawn = [
        ...enemies.flatMap(side => wave(side, enemyCount)),
        ...friends.flatMap(side => wave(side, friendlyCount)),
      ];
      if (spawn.length) m.events.push({ turn, spawn });
    };
    spawnWave(7, hold ? 3 : 2, hold ? 2 : 2);
    spawnWave(12, hold ? 3 : 2, hold ? 2 : 2);
    if (hold) spawnWave(16, 2, 1);
    m.longBattleTuning = { stretched: stretch, targetTurns: 18 };
  }

  for (const m of [...BLACK_KNIGHTS, ...BRITANNIA, ...EXTRA,
                    ...EUROPE, ...CHINESE_FEDERATION, ...XINGKE_UFN])
    longerStoryMission(m);

  const BY_ID = Object.fromEntries([...BLACK_KNIGHTS, ...BRITANNIA, ...EXTRA, ...EUROPE, ...CHINESE_FEDERATION, ...XINGKE_UFN].map(m => [m.id, m]));
  const pick = ids => ids.map(id => BY_ID[id]);
  const CAMPAIGNS = {
    bk_s1: {
      name: 'The Order of the Black Knights',
      short: 'Black Knights S1',
      season: 1,
      side: 'bk',
      portrait: 'zero',
      years: '2017 a.t.b.',
      desc: 'Season 1, Lelouch of the Rebellion: from the Shinjuku Ghetto to the Black Rebellion, Zero builds an army out of a resistance cell.',
      missions: pick(['bk1', 'bk_saitama', 'bk2', 'bk3', 'bk_yokosuka', 'bk_tohdoh', 'bk_shikine', 'bk_fukuoka', 'bk_saz', 'bk4']),
    },
    britannia_s1: {
      name: 'Holy Britannian Empire',
      short: 'Britannia S1',
      season: 1,
      side: 'britannia',
      portrait: 'cornelia',
      years: '2010–2017 a.t.b.',
      desc: 'Season 1, Lelouch of the Rebellion: from the invasion of Japan to the Black Rebellion, Cornelia’s army hunts the Japanese resistance and Zero.',
      missions: pick(['br1', 'br2', 'br_mef', 'br3', 'br4', 'br_yokosuka', 'br_tohdoh', 'br_shikine', 'br_fukuoka', 'br5']),
    },
    bk_r2: {
      name: 'The Order of the Black Knights',
      short: 'Black Knights R2',
      season: 2,
      side: 'bk',
      portrait: 'zero',
      years: '2018 a.t.b.',
      desc: 'R2: Zero returns, crosses the Pacific and the Chinese Federation, destroys the Geass Order and fights the last war for Japan, from Babel Tower to Damocles.',
      missions: pick(['bk5', 'bk_rescue', 'bk_pacific', 'bk_yokosuka2', 'bk_zhengzhou', 'bk_xiaopei', 'bk6', 'bk_geass', 'bk8', 'bk7', 'bk9', 'bk10']),
    },
    britannia_r2: {
      name: 'Holy Britannian Empire',
      short: 'Britannia R2',
      season: 2,
      side: 'britannia',
      portrait: 'lelouch',
      years: '2018 a.t.b.',
      desc: 'R2: the Empire against the returned Zero, from the Chinese Consulate and the Federation to Kagoshima, Tokyo, Emperor Lelouch and the assault on Damocles.',
      missions: pick(['br7', 'br_execution', 'br_pacific', 'br_yokosuka2', 'br_xiaopei', 'br_mausoleum', 'br_kagoshima', 'br8', 'br_kamejima', 'br9', 'br10', 'br11']),
    },
    cf_r2: {
      name: 'Chinese Federation',
      short: 'Chinese Federation R2',
      season: 2,
      side: 'cf',
      portrait: 'xingke',
      years: '2018 a.t.b.',
      desc: 'R2: Li Xingke rises against the High Eunuchs, pursues Zero and Kallen across the Federation, then joins the Black Knights to free Empress Tianzi. Ten tactical chapters adapt the Chinese Revolution.',
      missions: pick(['cf1', 'cf2', 'cf3', 'cf4', 'cf5', 'cf6', 'cf7', 'cf8', 'cf9', 'cf10']),
    },
    cf_ufn: {
      name: 'Xingke — War for the UFN', short: 'Xingke / UFN',
      season: 4, side: 'cf', portrait: 'xingke', years: '2018 a.t.b.',
      desc: 'A separate twelve-chapter follow-up to the Chinese Revolution: the southern landing at Kagoshima, the Fuji catastrophe, and the attack and boarding of the Avalon. Tactical chapters expand the anime engagements; all mastery rewards remain Federation fragments.',
      missions: pick(['ufn1', 'ufn2', 'ufn3', 'ufn4', 'ufn5', 'ufn6', 'ufn7', 'ufn8', 'ufn9', 'ufn10', 'ufn11', 'ufn12']),
    },
    eb_europe: {
      name: 'Euro Britannia',
      short: 'Euro Britannia',
      season: 3,
      side: 'eb',
      portrait: 'shin',
      years: '2017–2018 a.t.b.',
      desc: 'The imperial war against Europia: El Alamein, holding Sankt Petersburg before Narva, the knights of Akito the Exiled, the Italian landing with Schneizel and Suzaku, and the march on Paris.',
      missions: pick(['eb_el_alamein', 'eb_hold_petersburg', 'eb_narva', 'eb_slonim', 'br6', 'eb_petersburg', 'eb_ark', 'eb_weisswolf', 'eb_assault', 'eb_italy', 'eb_fall']),
    },
    eu_europe: {
      name: 'Europia United',
      short: 'E.U.',
      season: 3,
      side: 'eu',
      portrait: 'leila',
      years: '2017–2018 a.t.b.',
      desc: 'wZERO from Narva and Slonim to the Gallia Grande, the lakeside rescue, stopping Apollo’s Chariot, Weisswolf and Smilas’s coup; then the regular E.U. army faces Suzaku at the Italian coast.',
      missions: pick(['eu_narva', 'eu_ambush', 'eu_slonim', 'eu_front', 'eu_ark', 'eu_weisswolf', 'eu_lakeside_rescue', 'eu_apollo', 'eu_assault', 'eu_paris', 'eu_white_death']),
    },
  };
  // The story arcs as mission-based campaigns, each played from either side: the two seasons and Akito the Exiled's war in Europe.
  const SEASONS = {
    1: { name: 'Lelouch of the Rebellion', short: 'Season 1', years: '2010–2017 a.t.b.' },
    2: { name: 'Lelouch of the Rebellion R2', short: 'R2', years: '2018 a.t.b.' },
    3: { name: 'The Euro Britannia War', short: 'Europe', years: '2017–2018 a.t.b. · Akito the Exiled' },
    4: { name: 'War for the UFN', short: 'UFN', years: '2018 a.t.b. · Xingke’s later war' },
  };
  root.KnightmareMissions = { CAMPAIGNS, SEASONS };
  if (typeof module !== 'undefined') module.exports = root.KnightmareMissions;
})(typeof window !== 'undefined' ? window : globalThis);

/* Knightmare Conquest campaigns: story missions on hand-built tactical maps, scripted with events and graded with
   mastery stars. Loads after engine.js and plugs into its rule hooks; Conquest never touches this file. */
(function (root) {
  'use strict';
  const E = root.Knightmare || (typeof require === 'function' ? require('./engine.js') : null);
  const MISSIONS = (root.KnightmareMissions || (typeof require === 'function' ? require('./missions.js') : null)) || {};

  // ======== Campaign index ========
  const CAMPAIGNS = MISSIONS.CAMPAIGNS || {};
  const ALL = {};
  for (const [cid, camp] of Object.entries(CAMPAIGNS))
    camp.missions.forEach((m, i) => (ALL[m.id] = Object.assign(m, { campaign: cid, index: i })));
  const mission = id => ALL[id] || null;

  // Story missions use the same three difficulty tiers as conquest, but Normal deliberately gives the player
  // a larger safety margin than the original hand-tuned missions. Hard and Challenge reuse conquest's enemy
  // research, unit-upgrade, reinforcement, commander-rank and income rules.
  const DIFFICULTIES = {
    normal: {
      name: 'Normal',
      level: 0,
      tokens: 1,
      playerStack: 0,
      enemyHp: 1,
      enemyShield: 1,
      economy: 1.5,
      extraTurns: 0,
      desc: 'Story mode: full-strength enemies and city defenses with original formation sizes, favorable scenario force counts and 50% more starting resources. Mission turn limits are unchanged.',
    },
    hard: {
      ...E.DIFFICULTIES.hard,
      desc: 'Conquest-style Hard: enemies gain tier I–II research, half their units upgrade a class, extra reinforcements appear and enemy commanders gain a rank.',
    },
    challenge: {
      ...E.DIFFICULTIES.challenge,
      desc: 'Conquest-style Challenge: enemies gain every technology, every formation is upgraded and reinforced, commanders gain two ranks and enemy income rises 25%.',
    },
  };
  const difficulty = id => DIFFICULTIES[id] || DIFFICULTIES.normal;
  const UPGRADE = {
    scout: 'assault',
    assault: 'light',
    raider: 'light',
    light: 'medium',
    medium: 'heavy',
    heavy: 'super',
    support: 'rocket',
    rocket: 'siege',
  };
  function upgradedType(type, side, g) {
    const t = E.TYPES[type],
      next = t && UPGRADE[t.cls];
    if (!t || !next || t.elite) return type;
    // A side without its own roster (neutral) would fall back to Britannian frames: use the frame's own faction.
    // An "upgrade" must not be a weaker frame, which some shared campaign lineups would otherwise give.
    const stronger = u => u && E.TYPES[u] && E.TYPES[u].hp >= t.hp && E.TYPES[u].attack >= t.attack;
    const candidates = [E.ROSTER[side] || g?.lineup?.[side] ? E.typeFor(side, next, g) : null, E.typeFor(t.side, next, g)];
    return candidates.find(stronger) || type;
  }
  function techUpToTier(tier) {
    return Object.fromEntries(
      Object.values(E.TECH_NODES)
        .map(n => [n.id, n.tiers.filter(t => t <= tier).length])
        .filter(([, l]) => l > 0),
    );
  }
  function campaignTurnLimit(g, m = mission(g.campaign.id)) {
    return g.campaign?.turnLimit ?? m?.lose?.turns ?? 0;
  }

  // Star and win/lose conditions are small data objects; text() describes one for the briefing and results.
  const cityList = a => a.join(', ');
  const cmdList = a => a.map(k => E.COMMANDERS[k]?.short || k).join(' and ');
  function text(c) {
    if (c.text) return c.text;
    if (c.turns) return `Win by turn ${c.turns}`;
    if (c.losses != null) return c.losses ? `Lose no more than ${c.losses} unit${c.losses > 1 ? 's' : ''}` : 'Lose no units';
    if (c.kill) return `Destroy ${cmdList(c.kill)}’s unit`;
    if (c.alive) return `${cmdList(c.alive)} must survive`;
    if (c.capture) return `Capture ${cityList(c.capture)}`;
    if (c.keep) return `Never lose ${cityList(c.keep)}`;
    if (c.reach) return `Reach ${cityList(c.reach)}${c.by ? ` with ${cmdList([c.by])}` : ''}`;
    if (c.destroy) return `Destroy every ${c.destroy.map(s => E.FACTIONS[s]?.short || s).join(' and ')} unit`;
    if (c.kills) return `Destroy ${c.kills} enemy units`;
    if (c.hold) return `Hold out until the end of turn ${c.hold}`;
    if (c.turn) return `Hold until turn ${c.turn}`;
    return '';
  }
  const asList = x => (Array.isArray(x) ? x : x ? [x] : []);
  const friendly = (g, side) => side === g.player || !E.foe(g, side, g.player);
  const cityByName = (g, name) => g.stations.find(s => s.name === name);
  const unitWith = (g, k) => g.units.find(u => u.hp > 0 && u.cmd === k);
  // Your Elite Forces use your HQ level (as E.applyElites does on load); others use the mission's level, or 3.
  const eliteLevelFor = (g, side, elite, level) => (side === g.player && g.eliteLevels?.[elite]) || level || 3;
  // One condition, checked against the live game.
  function holds(g, c) {
    const cm = g.campaign;
    if (c.turns) return g.turn <= c.turns;
    if (c.losses != null) return cm.losses <= c.losses;
    if (c.kill) return c.kill.every(k => cm.killed.includes(k));
    if (c.alive) return c.alive.every(k => !!unitWith(g, k));
    if (c.capture) return c.capture.every(n => cityByName(g, n)?.owner === g.player);
    if (c.keep) return c.keep.every(n => !cm.lostCities.includes(n));
    if (c.reach) return c.reach.every(n => {
      const s = cityByName(g, n);
      return s && g.units.some(u => u.hp > 0 && u.side === g.player && u.c === s.c && u.r === s.r && (!c.by || u.cmd === c.by));
    });
    if (c.destroy) return !g.units.some(u => u.hp > 0 && c.destroy.includes(u.side));
    if (c.kills) return cm.kills >= c.kills;
    if (c.turn) return g.turn >= c.turn;
    if (c.hold) return g.turn > c.hold;
    return false;
  }
  function stars(g) {
    const m = mission(g.campaign.id);
    return [true, ...m.stars.map(c => holds(g, c))];
  }

  // ======== Building a mission ========
  // Units: [side, type or class, c, r, stack = 1, commander = null, { hold, ready, normalOnly, skipNormal }].
  function placeUnit(g, spec) {
    const [side, kind, c, r, stack = 1, cmd = null, opts = {}] = spec,
      d = difficulty(g.difficulty),
      enemy = E.foe(g, side, g.player);
    if (opts.normalOnly && g.difficulty !== 'normal') return null;
    if (opts.skipNormal && g.difficulty === 'normal') return null;
    let type = E.TYPES[kind] ? kind : E.typeFor(side, kind, g),
      unitStack = stack;
    if (!E.TYPES[type].elite) {
      if (!enemy && side === g.player && d.playerStack) unitStack = Math.min(3, unitStack + d.playerStack);
      if (enemy && d.level) {
        const n = g.campaign.enemyPlaced++;
        if (n % d.upgradeEvery === 0 && !(cmd && E.TYPES[type].cls === 'heavy')) type = upgradedType(type, side, g);
        if (d.stack) unitStack = Math.min(3, unitStack + 1);
      }
    }
    const free = t =>
      t && !E.isSea(t) && !E.TERRAIN[t.terrain]?.blocked && !E.unitAt(g, t) && (!E.stationAt(g, t) || !E.foe(g, E.stationAt(g, t).owner, side));
    let at = E.tile(g, c, r);
    if (!free(at)) at = nearest(g, { c, r }, free);
    if (!at) return null;
    if (cmd && enemy && d.ranks)
      g.officers[cmd].rank = Math.min(E.RANKS.length - 1, E.defaultOfficer(cmd).rank + d.ranks);
    const u = E.newUnit(g, type, side, at.c, at.r, E.TYPES[type].elite ? 1 : unitStack, cmd, opts.ready !== false);
    if (u.elite) u.eliteLevel = eliteLevelFor(g, side, u.elite, opts.level);
    const hold = opts.hold ?? g.campaign.hold?.[side];
    if (hold != null && hold !== false) u.hold = { c: at.c, r: at.r, radius: hold };
    if (cmd) u.cmdRank = E.officer(g, cmd).rank;
    u.hp = E.maxHP(u);
    if (enemy && d.enemyHp) u.hp = Math.max(1, Math.round(u.hp * d.enemyHp));
    if (!E.isSea(at)) E.setTileOwner(g, at, side);
    return u;
  }

  function addDifficultyReinforcements(g, d) {
    if (!d.extraPer) return;
    const enemies = g.units.filter(u => u.hp > 0 && E.foe(g, u.side, g.player) && !u.elite),
      extra = Math.ceil(enemies.length / d.extraPer);
    let made = 0;
    for (let i = 0; i < enemies.length && made < extra; i++) {
      const src = enemies[i],
        spot = E.adjacent(g, src).find(
          p =>
            !E.isSea(p) &&
            !E.TERRAIN[p.terrain]?.blocked &&
            !E.unitAt(g, p) &&
            (!E.stationAt(g, p) || !E.foe(g, E.stationAt(g, p).owner, src.side)),
        );
      if (!spot) continue;
      const u = E.newUnit(g, src.type, src.side, spot.c, spot.r, src.stack);
      u.hp = E.maxHP(u);
      if (!E.isSea(spot)) E.setTileOwner(g, spot, src.side);
      made++;
    }
  }
  function nearest(g, p, test) {
    const seen = new Set([E.key(p)]),
      queue = [E.tile(g, p.c, p.r)].filter(Boolean);
    while (queue.length) {
      const t = queue.shift();
      if (test(t)) return t;
      for (const n of E.adjacent(g, t))
        if (!seen.has(E.key(n))) {
          seen.add(E.key(n));
          queue.push(n);
        }
    }
    return null;
  }
  function createMission(id, seed = 1357, mode = 'normal') {
    const m = mission(id);
    if (!m) throw new Error(`Unknown mission ${id}`);
    const d = difficulty(mode),
      difficultyId = DIFFICULTIES[mode] ? mode : 'normal',
      sides = m.sides,
      cols = m.map[0].length,
      rows = m.map.length;
    const g = {
      game: 'knightmare',
      version: 1,
      rulesVersion: E.RULES_VERSION,
      player: m.player,
      difficulty: difficultyId,
      mode: 'campaign',
      era: 'campaign',
      order: sides,
      seed,
      wrap: false,
      cols,
      rows,
      turn: 1,
      phase: m.player,
      nextId: 1,
      tiles: [],
      units: [],
      stations: [],
      log: [],
      strikes: [],
      fallen: {},
      economy: Object.fromEntries(
        [...new Set([...sides, 'neutral'])].map(s => [
          s,
          { credits: m.economy?.[s] ?? 0, industry: m.industry?.[s] ?? 0, science: 0, sakuradite: m.sakuradite?.[s] ?? 150 },
        ]),
      ),
      tech: Object.fromEntries([...new Set([...sides, 'neutral'])].map(s => [s, {}])),
      officers: Object.fromEntries(Object.keys(E.COMMANDERS).map(k => [k, E.defaultOfficer(k)])),
      roster: {},
      medalInventory: [],
      medalsEarned: [],
      over: null,
      stats: {},
      teams: m.teams || null,
      lineup: m.lineup || null,
      buildable: m.buildable || null,
      factions: Object.fromEntries(
        Object.entries(m.names || {}).map(([s, f]) => [s, { ...(E.FACTIONS[s] || E.FACTIONS.neutral), ...f }]),
      ),
      campaign: {
        id,
        production: m.production || [],
        goals: m.goals || {},
        hold: m.hold || {},
        losses: 0,
        kills: 0,
        killed: [],
        lostCities: [],
        fired: [],
        queue: [],
        fx: [],
        warnings: [],
        note: null,
        enemyPlaced: 0,
        turnLimit: m.lose?.turns ? m.lose.turns + (d.extraTurns || 0) : 0,
      },
    };
    if (d.economy && g.economy[g.player]) {
      g.economy[g.player].credits = Math.round(g.economy[g.player].credits * d.economy);
      g.economy[g.player].industry = Math.round(g.economy[g.player].industry * d.economy);
      g.economy[g.player].sakuradite = Math.round(g.economy[g.player].sakuradite * d.economy);
    }
    if (d.level) {
      for (const side of sides.filter(side => E.foe(g, side, g.player))) {
        g.tech[side] = techUpToTier(d.techTier);
        if (g.economy[side]) {
          g.economy[side].credits = Math.round(g.economy[side].credits * (d.income || 1));
          g.economy[side].industry = Math.round(g.economy[side].industry * (d.income || 1));
          g.economy[side].sakuradite = Math.round(g.economy[side].sakuradite * (d.income || 1));
        }
      }
    }
    m.map.forEach((row, r) => {
      if (row.length !== cols) throw new Error(`${id}: map row ${r} has ${row.length} hexes, expected ${cols}`);
      for (let c = 0; c < cols; c++) g.tiles.push({ c, r, terrain: E.TERRAIN_CODES[row[c]] || 'plains', owner: null });
    });
    for (const [name, c, r, owner, tier = 1, opts = {}] of m.cities) {
      const t = E.tile(g, c, r);
      if (!t || E.isSea(t) || E.TERRAIN[t.terrain]?.blocked) throw new Error(`${id}: ${name} is not on open land`);
      let shield = opts.shield ?? (opts.fort ? 400 : 120 + 60 * tier);
      if (E.foe(g, owner, g.player) && d.enemyShield) shield = Math.max(1, Math.round(shield * d.enemyShield));
      g.stations.push({
        id: g.stations.length,
        name,
        c,
        r,
        owner,
        tier,
        lab: 0,
        refinery: 0,
        capital: false,
        capitalOf: null,
        fort: !!opts.fort,
        gun: opts.gun || null,
        shield,
        maxShield: shield,
        income: opts.income ?? (tier === 3 ? 30 : tier === 2 ? 20 : 12),
        industry: opts.industry ?? 6 * tier,
        science: 1 + tier,
        producedTurn: 0,
      });
      for (const n of E.within(g, t, 2)) if (!E.isSea(n) && !E.TERRAIN[n.terrain]?.blocked && !n.owner) n.owner = owner;
      t.owner = owner;
    }
    for (const spec of m.units) placeUnit(g, spec);
    addDifficultyReinforcements(g, d);
    fire(g, ev => ev.turn === 1 || ev.start);
    return g;
  }

  // ======== Events ========
  // { turn | capture | killed | start, say: [[speaker, text]], spawn: [unit specs], blast, stun, upgrade, shield,
  //   remove: [commanders taken off the field, e.g. captured; not a loss or a kill], warn, note }. Speakers are commander ids or 'Name@side'; null narrates.
  function speaker(g, who) {
    if (!who) return { name: 'Mission briefing', side: g.player };
    if (E.COMMANDERS[who]) return { name: E.COMMANDERS[who].name, side: E.COMMANDERS[who].side, portrait: who };
    const [name, side] = who.split('@');
    return { name, side: side || 'neutral' };
  }
  function fire(g, test) {
    const m = mission(g.campaign.id);
    (m.events || []).forEach((ev, i) => {
      if (g.campaign.fired.includes(i) || !test(ev)) return;
      g.campaign.fired.push(i);
      run(g, ev);
    });
  }
  function run(g, ev) {
    const cm = g.campaign;
    for (const [who, line] of ev.say || []) cm.queue.push({ ...speaker(g, who), text: line });
    if (ev.note) cm.note = ev.note;
    for (const spec of ev.spawn || []) placeUnit(g, spec);
    for (const k of asList(ev.remove)) {
      const u = unitWith(g, k);
      if (u) u.hp = 0;
    }
    for (const w of asList(ev.warn)) cm.warnings.push({ c: w.c, r: w.r, radius: w.radius ?? 2, label: w.label || '' });
    for (const b of asList(ev.blast)) blast(g, b);
    for (const s of asList(ev.stun)) stun(g, s);
    for (const up of asList(ev.upgrade)) {
      const u = unitWith(g, up.cmd);
      if (!u) continue;
      const lost = E.maxHP(u) - u.hp,
        elite = Object.entries(E.ELITE_FORCES).find(([, e]) => e.type === up.type)?.[0] || null;
      u.type = up.type;
      u.elite = elite;
      u.eliteLevel = elite ? eliteLevelFor(g, u.side, elite, up.level ?? (u.eliteLevel || 3)) : 0;
      u.stack = elite ? 1 : u.stack;
      u.hp = Math.max(1, E.maxHP(u) - lost);
    }
    for (const sh of asList(ev.shield)) {
      const s = cityByName(g, sh.city);
      if (!s) continue;
      if (sh.max != null) s.maxShield = sh.max;
      // cut: permanently weakens the barrier (its maximum and current strength) by that much.
      if (sh.cut) s.maxShield = Math.max(0, s.maxShield - sh.cut);
      s.shield = Math.min(s.maxShield, sh.value ?? s.shield);
    }
  }
  // F.L.E.I.J.A., Sakuradite eruptions and landslides: damage by ring (1 destroys), optional terrain and city damage.
  function blast(g, b) {
    const center = { c: b.c, r: b.r },
      rings = b.damage || [1, 0.9, 0.6],
      radius = rings.length - 1;
    for (const v of g.units) {
      if (v.hp <= 0 || (b.sides && !b.sides.includes(v.side))) continue;
      const d = E.distance(center, v, g);
      if (d > radius) continue;
      v.hp -= rings[d] >= 1 ? v.hp : Math.round(E.maxHP(v) * rings[d]);
      v.morale = Math.max(-3, v.morale - 2);
      // Ground zero erases everything, C.C.'s Code Bearer included (as F.L.E.I.J.A. does in Conquest).
      if (v.hp <= 0) E.kill(g, v, null, rings[d] >= 1);
    }
    for (const t of E.within(g, center, b.terrainRadius ?? (b.terrain ? 1 : -1)))
      if (!E.isSea(t) && b.terrain) E.setTileTerrain(g, t, b.terrain);
    for (const s of g.stations) if (E.distance(center, s, g) <= radius && !b.sides) s.shield = 0;
    g.campaign.warnings = g.campaign.warnings.filter(w => w.c !== b.c || w.r !== b.r);
    g.campaign.fx.push({ kind: 'blast', c: b.c, r: b.r, radius, color: b.color || '#ffd6f0', name: b.name || '' });
  }
  // Gefjun Disturbers: every Knightmare of the listed sides in the area seizes up (confusion: it cannot act).
  function stun(g, s) {
    const center = { c: s.c, r: s.r };
    for (const v of g.units)
      if (v.hp > 0 && (!s.sides || s.sides.includes(v.side)) && E.distance(center, v, g) <= (s.radius ?? 2)) {
        v.morale = -3;
        // A side still to act this round would recover a step at its turn start; onTurn re-applies the stun then.
        if (v.side !== g.phase) v.stunTurn = g.turn;
      }
    g.campaign.fx.push({ kind: 'stun', c: s.c, r: s.r, radius: s.radius ?? 2, color: '#8fe3ff', name: s.name || 'Gefjun Disturber' });
  }

  // ======== Hooks ========
  function onTurn(g, side) {
    if (g.mode !== 'campaign') return;
    for (const v of g.units)
      if (v.side === side && v.stunTurn != null) {
        if (v.hp > 0 && v.stunTurn === g.turn) v.morale = -3;
        delete v.stunTurn;
      }
    if (side !== g.player) return;
    fire(g, ev => ev.turn === g.turn);
  }
  function onCapture(g, s, u, loser) {
    if (g.mode !== 'campaign') return;
    if (friendly(g, loser) && E.foe(g, u.side, g.player) && !g.campaign.lostCities.includes(s.name))
      g.campaign.lostCities.push(s.name);
    fire(g, ev => ev.capture === s.name && (!ev.by || ev.by === u.side));
  }
  function onKill(g, v, attacker, by) {
    if (g.mode !== 'campaign') return;
    const cm = g.campaign;
    if (v.side === g.player) cm.losses++;
    else if ((attacker ? attacker.side : by) === g.player) cm.kills++;
    if (v.cmd && !cm.killed.includes(v.cmd)) cm.killed.push(v.cmd);
    if (v.cmd) fire(g, ev => ev.killed === v.cmd);
  }
  function decide(g) {
    if (g.over) return g.over;
    const m = mission(g.campaign.id),
      lose = m.lose || {},
      P = g.player,
      enemy = g.order.find(s => E.foe(g, s, P)) || 'neutral';
    let reason = null;
    const dead = asList(lose.cmd).find(k => g.campaign.killed.includes(k));
    if (dead) reason = `${E.COMMANDERS[dead].name} has fallen. The mission has failed.`;
    const lost = asList(lose.cities).find(n => g.campaign.lostCities.includes(n));
    if (!reason && lost) reason = `${lost} has fallen. The mission has failed.`;
    if (!reason && !g.units.some(u => u.hp > 0 && u.side === P) && !g.stations.some(s => s.owner === P))
      reason = 'Every one of your units has been destroyed.';
    // The deadline is a failure condition, not a bonus objective: a late capture or kill
    // cannot rescue an expired mission (including saves resumed from an older rules version).
    const limit = campaignTurnLimit(g, m);
    if (!reason && limit && g.turn > limit) reason = `Turn ${limit} has passed. The mission has failed.`;
    const won = asList(m.win).every(c => holds(g, c));
    if (!reason && won) {
      const st = stars(g);
      g.over = { winner: P, reason: m.victory || 'Mission accomplished.', stars: st.filter(Boolean).length, starList: st };
      return g.over;
    }
    if (reason) g.over = { winner: enemy, reason, stars: 0 };
    return g.over;
  }
  function objective(g) {
    const m = mission(g.campaign.id);
    const limit = campaignTurnLimit(g, m);
    return `${g.campaign.note || m.objective}${limit ? ` Turn limit ${limit}.` : ''}`;
  }
  function title(g) {
    const m = mission(g.campaign.id);
    return `${CAMPAIGNS[m.campaign].short} · ${m.index + 1}. ${m.title} · ${difficulty(g.difficulty).name}`;
  }
  Object.assign(E.hooks, { turn: onTurn, capture: onCapture, kill: onKill, decide, objective, title });

  // ======== Progress and rewards (profile.campaign = { missionId: best stars }) ========
  // Clearing a mission is still enough to progress. Two- and three-star play now adds one-time, overall
  // performance rewards, while each difficulty keeps its own first-clear/new-star token payouts.
  const REWARD = { first: 60, star: 30, twoStarFragments: 4, masteryFragments: 10 };
  const MILESTONES = [
    { id: 'half', ratio: 0.5, label: '50% stars', tokens: 100, fragments: 0 },
    { id: 'three_quarters', ratio: 0.75, label: '75% stars', tokens: 0, fragments: 12 },
    { id: 'master', ratio: 1, label: '100% stars', tokens: 200, fragments: 20 },
  ];
  // A mission pays fragments toward a story-relevant Elite Force when possible. Euro Britannia does not have a
  // persistent Elite roster of its own, so its mastery rewards feed Britannia's Lancelot progression.
  const CAMPAIGN_ELITE = {
    bk_s1: 'guren_mkii',
    britannia_s1: 'lancelot',
    bk_r2: 'shinkiro',
    britannia_r2: 'lancelot_albion',
    eb_europe: 'lancelot',
    eu_europe: 'akito_liberte',
  };
  const MISSION_ELITE = {
    bk1: 'guren_mkii',
    bk2: 'guren_mkii',
    bk3: 'guren_mkii',
    bk_yokosuka: 'guren_mkii',
    bk_tohdoh: 'tohdoh_gekka',
    bk_shikine: 'gawain',
    bk_fukuoka: 'gawain',
    bk_saz: 'gawain',
    bk4: 'gawain',
    br1: 'cornelia_gloucester',
    br2: 'cornelia_gloucester',
    br_mef: 'cornelia_gloucester',
    br3: 'cornelia_gloucester',
    br4: 'lancelot',
    br_yokosuka: 'lancelot',
    br_tohdoh: 'lancelot',
    br_shikine: 'lancelot',
    br_fukuoka: 'lancelot',
    br5: 'lancelot',
    bk5: 'guren_mkii',
    bk_rescue: 'tohdoh_gekka',
    bk_pacific: 'guren_mkii',
    bk_yokosuka2: 'guren_mkii',
    bk_zhengzhou: 'guren_mkii',
    bk_xiaopei: 'guren_mkii',
    bk6: 'shinkiro',
    bk_geass: 'shinkiro',
    bk7: 'shinkiro',
    bk8: 'shinkiro',
    bk9: 'guren_seiten',
    bk10: 'guren_seiten',
    br7: 'lancelot',
    br_pacific: 'lancelot',
    br_yokosuka2: 'lancelot',
    br_xiaopei: 'lancelot',
    br_mausoleum: 'mordred',
    br_kagoshima: 'mordred',
    br8: 'mordred',
    br_kamejima: 'lancelot_albion',
    br9: 'lancelot_albion',
    br10: 'lancelot_albion',
    br11: 'lancelot_albion',
    eu_narva: 'leila_alexander',
    eu_ambush: 'ryo_valiant',
    eu_slonim: 'yukiya_valiant',
    eu_front: 'leila_alexander',
    eu_ark: 'ryo_valiant',
    eu_weisswolf: 'yukiya_valiant',
    eu_assault: 'akito_liberte',
    eu_paris: 'akito_liberte',
  };
  function best(profile, id) {
    return profile?.campaign?.[id] || 0;
  }
  function bestDifficulty(profile, id, mode = 'normal') {
    const perMission = profile?.campaignDifficulty?.[id];
    if (perMission && Object.keys(perMission).length) return perMission[mode] || 0;
    // Legacy profiles predate per-difficulty records; treat their old campaign score as a Normal clear only.
    return mode === 'normal' ? best(profile, id) : 0;
  }
  function unlocked(profile, id) {
    const m = mission(id);
    return !!m && (m.index === 0 || best(profile, CAMPAIGNS[m.campaign].missions[m.index - 1].id) > 0);
  }
  function starElite(id) {
    const m = mission(id);
    return (m && MISSION_ELITE[id]) || (m && CAMPAIGN_ELITE[m.campaign]) || null;
  }
  function campaignElite(cid) {
    return CAMPAIGN_ELITE[cid] || null;
  }
  function campaignStars(profile, cid, overrideId = null, overrideStars = null) {
    const camp = CAMPAIGNS[cid];
    if (!camp) return 0;
    return camp.missions.reduce((sum, m) => {
      const n =
        overrideId === m.id && overrideStars != null ? Math.max(best(profile, m.id), overrideStars) : best(profile, m.id);
      return sum + n;
    }, 0);
  }
  function milestoneStatus(profile, cid) {
    const camp = CAMPAIGNS[cid];
    if (!camp) return [];
    const total = campaignStars(profile, cid),
      max = camp.missions.length * 3,
      claimed = profile?.campaignMilestones?.[cid] || {};
    return MILESTONES.map(m => ({
      ...m,
      stars: Math.ceil(max * m.ratio),
      claimed: !!claimed[m.id],
      reached: total >= Math.ceil(max * m.ratio),
    }));
  }
  function reward(g, profile = {}) {
    if (!g.over || g.over.winner !== g.player)
      return { total: 0, parts: [], fragments: {}, fragmentParts: [], milestones: [], stars: 0, repeat: true };
    const m = mission(g.campaign.id),
      d = difficulty(g.difficulty),
      had = bestDifficulty(profile, g.campaign.id, g.difficulty),
      got = g.over.stars,
      oldOverall = best(profile, g.campaign.id),
      newOverall = Math.max(oldOverall, got),
      parts = [],
      fragments = {},
      fragmentParts = [],
      milestones = [];
    const addFragments = (id, amount, label) => {
      if (!id || !E.ELITE_FORCES[id] || amount <= 0) return;
      fragments[id] = (fragments[id] || 0) + amount;
      fragmentParts.push([label, id, amount]);
    };
    if (!had) parts.push([`${d.name} first clear`, Math.round(REWARD.first * d.tokens)]);
    const fresh = Math.max(0, got - Math.max(had, 1));
    if (fresh)
      parts.push([
        `${fresh} new ${d.name} star${fresh > 1 ? 's' : ''}`,
        Math.round(fresh * REWARD.star * d.tokens),
      ]);

    // These are overall mission achievements, not per-difficulty farming: earn them once, even if the first 3-star
    // result is on Hard or Challenge.
    const elite = starElite(g.campaign.id);
    if (oldOverall < 2 && newOverall >= 2)
      addFragments(elite, REWARD.twoStarFragments, '2★ performance');
    if (oldOverall < 3 && newOverall >= 3)
      addFragments(elite, REWARD.masteryFragments, '3★ mastery');

    // Campaign milestones are likewise one-time. Old profiles receive any milestone they already qualify for the
    // next time they finish a mission, so introducing this system never strands previously earned stars.
    if (m) {
      const cid = m.campaign,
        camp = CAMPAIGNS[cid],
        max = camp.missions.length * 3,
        total = campaignStars(profile, cid, g.campaign.id, newOverall),
        claimed = profile?.campaignMilestones?.[cid] || {},
        milestoneElite = campaignElite(cid);
      for (const rule of MILESTONES) {
        const need = Math.ceil(max * rule.ratio);
        if (claimed[rule.id] || total < need) continue;
        milestones.push(rule.id);
        if (rule.tokens) parts.push([`${camp.short} · ${rule.label}`, rule.tokens]);
        if (rule.fragments)
          addFragments(milestoneElite, rule.fragments, `${camp.short} · ${rule.label}`);
      }
    }
    return {
      total: parts.reduce((a, [, v]) => a + v, 0),
      parts,
      fragments,
      fragmentParts,
      milestones,
      stars: got,
      first: !had,
      repeat: !parts.length && !fragmentParts.length,
    };
  }
  function next(id) {
    const m = mission(id);
    return m ? CAMPAIGNS[m.campaign].missions[m.index + 1]?.id || null : null;
  }
  const api = {
    CAMPAIGNS,
    SEASONS: MISSIONS.SEASONS || {},
    DIFFICULTIES,
    mission,
    createMission,
    stars,
    text,
    holds,
    reward,
    unlocked,
    best,
    bestDifficulty,
    starElite,
    campaignElite,
    campaignStars,
    milestoneStatus,
    next,
    REWARD,
    MILESTONES,
  };
  root.KnightmareCampaign = api;
  E.campaign = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

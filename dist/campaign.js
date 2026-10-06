/* Knightmare Conquest campaigns: story missions on hand-built tactical maps, scripted with events and graded with
   WC4-style stars. Loads after engine.js and plugs into its rule hooks; Conquest never touches this file. */
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
    if (c.reach) return `Reach ${cityList(c.reach)}`;
    if (c.destroy) return `Destroy every ${c.destroy.map(s => E.FACTIONS[s]?.short || s).join(' and ')} unit`;
    if (c.kills) return `Destroy ${c.kills} enemy units`;
    if (c.hold) return `Hold out until the end of turn ${c.hold}`;
    return '';
  }
  const asList = x => (Array.isArray(x) ? x : x ? [x] : []);
  const friendly = (g, side) => side === g.player || !E.foe(g, side, g.player);
  const cityByName = (g, name) => g.stations.find(s => s.name === name);
  const unitWith = (g, k) => g.units.find(u => u.hp > 0 && u.cmd === k);
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
      return s && g.units.some(u => u.hp > 0 && u.side === g.player && u.c === s.c && u.r === s.r);
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
  // Units: [side, type or class, c, r, stack = 1, commander = null, { hold, ready }].
  function placeUnit(g, spec) {
    const [side, kind, c, r, stack = 1, cmd = null, opts = {}] = spec;
    const type = E.TYPES[kind] ? kind : E.typeFor(side, kind, g);
    const free = t =>
      t && !E.isSea(t) && !E.TERRAIN[t.terrain]?.blocked && !E.unitAt(g, t) && (!E.stationAt(g, t) || !E.foe(g, E.stationAt(g, t).owner, side));
    let at = E.tile(g, c, r);
    if (!free(at)) at = nearest(g, { c, r }, free);
    if (!at) return null;
    const u = E.newUnit(g, type, side, at.c, at.r, stack, cmd, opts.ready !== false);
    const hold = opts.hold ?? g.campaign.hold?.[side];
    if (hold != null && hold !== false) u.hold = { c: at.c, r: at.r, radius: hold };
    if (cmd) {
      u.cmdRank = E.officer(g, cmd).rank;
      u.hp = E.maxHP(u);
    }
    if (!E.isSea(at)) at.owner = side;
    return u;
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
  function createMission(id, seed = 1357) {
    const m = mission(id);
    if (!m) throw new Error(`Unknown mission ${id}`);
    const sides = m.sides,
      cols = m.map[0].length,
      rows = m.map.length;
    const g = {
      game: 'knightmare',
      version: 1,
      rulesVersion: E.RULES_VERSION,
      player: m.player,
      difficulty: 'normal',
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
        [...new Set([...sides, 'neutral'])].map(s => [s, { credits: m.economy?.[s] ?? 0, industry: m.industry?.[s] ?? 0, science: 0 }]),
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
      },
    };
    m.map.forEach((row, r) => {
      if (row.length !== cols) throw new Error(`${id}: map row ${r} has ${row.length} hexes, expected ${cols}`);
      for (let c = 0; c < cols; c++) g.tiles.push({ c, r, terrain: E.TERRAIN_CODES[row[c]] || 'plains', owner: null });
    });
    for (const [name, c, r, owner, tier = 1, opts = {}] of m.cities) {
      const t = E.tile(g, c, r);
      if (!t || E.isSea(t) || E.TERRAIN[t.terrain]?.blocked) throw new Error(`${id}: ${name} is not on open land`);
      const shield = opts.shield ?? (opts.fort ? 400 : 120 + 60 * tier);
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
    fire(g, ev => ev.turn === 1 || ev.start);
    return g;
  }

  // ======== Events ========
  // { turn | capture | killed | start, say: [[speaker, text]], spawn: [unit specs], blast, stun, upgrade, shield,
  //   warn, note }. Speakers are commander ids or 'Name@side'; null narrates.
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
    for (const w of asList(ev.warn)) cm.warnings.push({ c: w.c, r: w.r, radius: w.radius ?? 2, label: w.label || '' });
    for (const b of asList(ev.blast)) blast(g, b);
    for (const s of asList(ev.stun)) stun(g, s);
    for (const up of asList(ev.upgrade)) {
      const u = unitWith(g, up.cmd);
      if (!u) continue;
      const lost = E.maxHP(u) - u.hp;
      u.type = up.type;
      u.hp = Math.max(1, E.maxHP(u) - lost);
    }
    for (const sh of asList(ev.shield)) {
      const s = cityByName(g, sh.city);
      if (!s) continue;
      if (sh.max != null) s.maxShield = sh.max;
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
      if (v.hp <= 0) E.kill(g, v, null);
    }
    for (const t of E.within(g, center, b.terrainRadius ?? (b.terrain ? 1 : -1)))
      if (!E.isSea(t) && b.terrain) t.terrain = b.terrain;
    for (const s of g.stations) if (E.distance(center, s, g) <= radius && !b.sides) s.shield = 0;
    g.campaign.warnings = g.campaign.warnings.filter(w => w.c !== b.c || w.r !== b.r);
    g.campaign.fx.push({ kind: 'blast', c: b.c, r: b.r, radius, color: b.color || '#ffd6f0', name: b.name || '' });
  }
  // Gefjun Disturbers: every Knightmare of the listed sides in the area seizes up (confusion: it cannot act).
  function stun(g, s) {
    const center = { c: s.c, r: s.r };
    for (const v of g.units)
      if (v.hp > 0 && (!s.sides || s.sides.includes(v.side)) && E.distance(center, v, g) <= (s.radius ?? 2)) v.morale = -3;
    g.campaign.fx.push({ kind: 'stun', c: s.c, r: s.r, radius: s.radius ?? 2, color: '#8fe3ff', name: s.name || 'Gefjun Disturber' });
  }

  // ======== Hooks ========
  function onTurn(g, side) {
    if (g.mode !== 'campaign' || side !== g.player) return;
    fire(g, ev => ev.turn === g.turn);
  }
  function onCapture(g, s, u, loser) {
    if (g.mode !== 'campaign') return;
    if (friendly(g, loser) && E.foe(g, u.side, g.player) && !g.campaign.lostCities.includes(s.name))
      g.campaign.lostCities.push(s.name);
    fire(g, ev => ev.capture === s.name && (!ev.by || ev.by === u.side));
  }
  function onKill(g, v, attacker) {
    if (g.mode !== 'campaign') return;
    const cm = g.campaign;
    if (v.side === g.player) cm.losses++;
    else if (attacker && attacker.side === g.player) cm.kills++;
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
    const won = asList(m.win).every(c => holds(g, c));
    if (!reason && won) {
      const st = stars(g);
      g.over = { winner: P, reason: m.victory || 'Mission accomplished.', stars: st.filter(Boolean).length, starList: st };
      return g.over;
    }
    if (!reason && lose.turns && g.turn > lose.turns) reason = `Turn ${lose.turns} has passed. The mission has failed.`;
    if (reason) g.over = { winner: enemy, reason, stars: 0 };
    return g.over;
  }
  function objective(g) {
    const m = mission(g.campaign.id);
    return `${g.campaign.note || m.objective}${m.lose?.turns ? ` Turn limit ${m.lose.turns}.` : ''}`;
  }
  function title(g) {
    const m = mission(g.campaign.id);
    return `${CAMPAIGNS[m.campaign].short} ${m.index + 1} · ${m.title}`;
  }
  Object.assign(E.hooks, { turn: onTurn, capture: onCapture, kill: onKill, decide, objective, title });

  // ======== Progress and rewards (profile.campaign = { missionId: best stars }) ========
  const REWARD = { first: 60, star: 30 };
  function best(profile, id) {
    return profile?.campaign?.[id] || 0;
  }
  function unlocked(profile, id) {
    const m = mission(id);
    return !!m && (m.index === 0 || best(profile, CAMPAIGNS[m.campaign].missions[m.index - 1].id) > 0);
  }
  function reward(g, profile = {}) {
    if (!g.over || g.over.winner !== g.player) return { total: 0, parts: [], stars: 0 };
    const had = best(profile, g.campaign.id),
      got = g.over.stars,
      parts = [];
    if (!had) parts.push(['First clear', REWARD.first]);
    const fresh = Math.max(0, got - Math.max(had, 1));
    if (fresh) parts.push([`${fresh} new star${fresh > 1 ? 's' : ''}`, fresh * REWARD.star]);
    return { total: parts.reduce((a, [, v]) => a + v, 0), parts, stars: got, first: !had, repeat: !parts.length };
  }
  function next(id) {
    const m = mission(id);
    return m ? CAMPAIGNS[m.campaign].missions[m.index + 1]?.id || null : null;
  }
  const api = { CAMPAIGNS, mission, createMission, stars, text, holds, reward, unlocked, best, next, REWARD };
  root.KnightmareCampaign = api;
  E.campaign = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

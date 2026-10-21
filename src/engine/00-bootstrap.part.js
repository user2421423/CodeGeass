/* Knightmare Conquest: deterministic hex rules for a Code Geass world war. No UI or network dependencies. */
(function (root) {
  'use strict';
  // The data lives in engine/frames.js, commanders.js, research.js and world.js, loaded before this file by index.html
  // and required here under Node. engine/ai.js loads afterwards and adds the AI.
  if (typeof module !== 'undefined')
    for (const part of ['frames', 'commanders', 'generic-skills', 'research', 'world', 'conquests']) require(`./engine/${part}.js`);
  const {
    // frames.js
    FACTIONS,
    MAJORS,
    CLASSES,
    CLASS_ORDER,
    AMPHIBIOUS,
    AMPHIBIOUS_II,
    CARRIER,
    KNIGHTMARES,
    LINEUPS,
    ELITE_MAX_LEVEL,
    ELITE_UNLOCK_FRAGMENTS,
    ELITE_UPGRADE_FRAGMENTS,
    ELITE_LEVEL_SCALE,
    ELITE_FORCES,
    // commanders.js
    COMMANDERS,
    RANKS,
    RANK_HP,
    PROMOTE_COST,
    MEDALS,
    RATINGS,
    GENERIC_SKILLS,
    // research.js
    BRANCHES,
    BRANCH_NAMES,
    TECH_TIERS,
    TECH_TREE,
    RESEARCH_VERSION,
    // world.js
    RESOURCE_SITES,
    WORLD_ROWS,
    WORLD,
    CITY_DATA,
    CITY_TWEAKS,
    TERRITORY,
    ARMY_DATA,
    GARRISONS,
    PORT_DATA,
    NAVY_DATA,
    COASTAL_CITY_HEXES,
    COASTAL_PORT_HEXES,
    CONQUESTS,
  } = root.KnightmareData;
  const TYPES = Object.fromEntries(
    Object.entries(KNIGHTMARES).map(([id, k]) => {
      const c = CLASSES[k.cls];
      return [
        id,
        {
          ...c,
          ...k,
          id,
          short: k.name,
          code: k.name
            .replace(/[^A-Za-z ]/g, '')
            .split(' ')
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          desc: k.desc || `${c.rule}${k.float ? ' Integrated Float System: ignores terrain movement costs.' : ''}`,
        },
      ];
    }),
  );
  const ROSTER = {
    ...Object.fromEntries(
      MAJORS.map(side => [
        side,
        Object.fromEntries(
          Object.entries(KNIGHTMARES)
            .filter(([, k]) => k.side === side && !k.elite && !k.campaign && !k.naval && !k.worldOnly)
            .map(([id, k]) => [k.cls, id]),
        ),
      ]),
    ),
    ...LINEUPS,
    // The default Chinese inventory is the native 2017 roster, including
    // callers that inspect ROSTER.cf without a game context.
    cf: { ...LINEUPS.cf2017 },
  };
  // The 2018 U.F.N. deliberately retains the 'cf' engine side for save and
  // diplomacy compatibility, but its equipment belongs to the Black Knights.
  function ufnBlackKnights(g, side) {
    return g?.mode === 'conquest' && g.era === 'ufn2018' && side === 'cf';
  }
  function federationLineup(g, side) {
    if (side !== 'cf') return null;
    return ufnBlackKnights(g, side) ? LINEUPS.bk : LINEUPS.cf2017;
  }
  // Euro Britannia has its own regular heavy and super-heavy in every mode.
  // Scenario-specific mixed rosters may change its other classes, but not these two.
  function typeFor(side, cls, g = null) {
    const federation = federationLineup(g, side);
    if (federation) return federation[cls];
    if (side === 'eb' && (cls === 'heavy' || cls === 'super')) return LINEUPS.eb[cls];
    return g?.lineup?.[side]?.[cls] || ROSTER[side]?.[cls] || ROSTER.britannia[cls];
  }
  function lineupOf(g, side) {
    const federation = federationLineup(g, side);
    if (federation) return { ...federation };
    const lineup = { ...(ROSTER[side] || {}), ...(g?.lineup?.[side] || {}) };
    if (side === 'eb') {
      lineup.heavy = LINEUPS.eb.heavy;
      lineup.super = LINEUPS.eb.super;
    }
    return lineup;
  }
  // A custom scenario's buildable union must not reintroduce Britannian
  // regular heavies into Euro-Britannian factories and automation.
  function buildableTypes(g, side) {
    const available = g?.buildable?.[side] || Object.values(lineupOf(g, side));
    if (side !== 'eb') return available;
    const types = available.map(id => {
      const t = TYPES[id];
      return t && !t.elite && !t.naval && !t.air &&
        (t.cls === 'heavy' || t.cls === 'super') ? LINEUPS.eb[t.cls] : id;
    });
    return [...new Set([...types, LINEUPS.eb.heavy, LINEUPS.eb.super])];
  }
  // Keep explicit scripted scenario units and imported saves era-accurate.
  // Preserve the unit's class and allegiance; only change the equipment ID.
  function eraUnitType(g, type, side) {
    const t = TYPES[type];
    if(side==='eb'&&t?.air)return 'logres_airship';
    // Normalize ordinary armor at creation. Leave Elite Forces, naval units
    // and explicitly neutral special/story models such as Siegfried intact.
    if (side === 'eb' && t && !t.elite && !t.naval && t.side !== 'neutral' &&
        (t.cls === 'heavy' || t.cls === 'super'))
      return LINEUPS.eb[t.cls];
    if (side !== 'cf' || !t) return type;
    // The 2017 Federation flies the Shenlong; the 2018 U.F.N. flies the Ikaruga.
    if (t.air) return airshipType(g, side) || type;
    if (t.naval) {
      // Ordinary ships and marines use the era's navy; Elite marines use
      // their own era-checked deployment path below.
      if (t.elite) return eliteEligible(g, side, ELITE_TYPE_TO_ID[type]) ? type :
        (navalRoster(g, side)[t.tier >= 2 ? 'amphibious2' : 'amphibious'] || type);
      const navy = navalRoster(g, side);
      if (Object.values(navy).includes(type)) return type;
      return navy[t.naval === 'ship' ? 'carrier' : t.tier >= 2 ? 'amphibious2' : 'amphibious'] || type;
    }
    if (t.elite) {
      const id = ELITE_TYPE_TO_ID[type];
      if (eliteEligible(g, side, id)) return type;
      // No cross-era Elite equipment: use a native Elite of the SAME class
      // when one exists, otherwise retain that class's ordinary frame.
      const native = Object.keys(ELITE_FORCES).find(key =>
        eliteEligible(g, side, key) && TYPES[ELITE_FORCES[key].type].cls === t.cls &&
        !TYPES[ELITE_FORCES[key].type].naval);
      return native ? ELITE_FORCES[native].type : typeFor(side, t.cls, g);
    }
    const roster = federationLineup(g, side);
    return Object.values(roster).includes(type) ? type : roster[t.cls] || type;
  }


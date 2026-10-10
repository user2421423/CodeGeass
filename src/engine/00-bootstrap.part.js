/* Knightmare Conquest: deterministic hex rules for a Code Geass world war. No UI or network dependencies. */
(function (root) {
  'use strict';
  // The data lives in engine/frames.js, commanders.js, research.js and world.js, loaded before this file by index.html
  // and required here under Node. engine/ai.js loads afterwards and adds the AI.
  if (typeof module !== 'undefined')
    for (const part of ['frames', 'commanders', 'generic-skills', 'research', 'world']) require(`./engine/${part}.js`);
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
            .filter(([, k]) => k.side === side && !k.elite && !k.campaign && !k.naval)
            .map(([id, k]) => [k.cls, id]),
        ),
      ]),
    ),
    ...LINEUPS,
  };
  function typeFor(side, cls, g = null) {
    return g?.lineup?.[side]?.[cls] || ROSTER[side]?.[cls] || ROSTER.britannia[cls];
  }
  function lineupOf(g, side) {
    return { ...(ROSTER[side] || {}), ...(g?.lineup?.[side] || {}) };
  }


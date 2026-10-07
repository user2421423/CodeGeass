/* Knightmare Conquest engine data: the HQ technology tree.
   Data only; read by engine.js. */
(function (root) {
  'use strict';
  // HQ technology, as in World Conqueror 4: bought with command tokens earned by winning operations, kept in the
  // player's profile across every operation and faction. Each level unlocks at a tier gated by total victories.
  const BRANCHES = { Infantry: 'infantry', Armor: 'armor', Artillery: 'artillery' };
  const BRANCH_NAMES = { infantry: 'Infantry', armor: 'Armor', artillery: 'Artillery', mobility: 'Mobility' };
  const TECH_TIERS = [0, 0, 2, 4, 7];
  const pct = v => `${Math.round(v * 100)}%`;
  const TECH_TREE = {
    infantry: {
      name: 'Infantry',
      desc: 'Scouts, assault frames and raiders: the screen and the city-takers of every army.',
      nodes: {
        drives: {
          name: 'Landspinner Tuning',
          values: [1, 2],
          tiers: [1, 3],
          costs: [60, 220],
          text: v => `+${v} movement`,
        },
        guns: {
          name: 'Linear Assault Rifles',
          values: [0.06, 0.12, 0.2, 0.3],
          tiers: [1, 1, 2, 3],
          costs: [40, 80, 160, 300],
          text: v => `+${pct(v)} damage`,
        },
        hull: {
          name: 'Composite Frames',
          values: [0.08, 0.16, 0.25, 0.35],
          tiers: [1, 2, 2, 3],
          costs: [40, 90, 150, 280],
          text: v => `+${pct(v)} frame integrity`,
        },
        harken: {
          name: 'Slash Harken Volleys',
          values: [0.4, 0.5],
          tiers: [1, 2],
          costs: [90, 200],
          req: ['guns', 1],
          text: v => `+${pct(v)} damage to Armor`,
        },
        nav: {
          name: 'All-Terrain Landspinners',
          values: [1, 2],
          tiers: [1, 2],
          costs: [70, 150],
          text: v => (v === 1 ? 'Forests and mountains cost 1 movement' : 'Every terrain costs 1 movement'),
        },
        filler: {
          name: 'Energy Filler Reserves',
          values: [0.75, 0.9],
          tiers: [1, 3],
          costs: [50, 120],
          text: v => `−${pct(v)} desert and tundra attrition`,
        },
        mines: {
          name: 'Chaos Mines',
          values: [0.55, 0.7],
          tiers: [2, 3],
          costs: [140, 260],
          req: ['harken', 1],
          text: v => `+${pct(v)} damage to city defenses`,
        },
        picket: {
          name: 'Factsphere Screen',
          values: [1, 2],
          tiers: [2, 3],
          costs: [150, 280],
          text: v =>
            v === 1
              ? 'Friendly Artillery next to an Infantry unit takes 15% less damage'
              : 'Infantry counter-fire hits at full strength',
        },
        armor: {
          name: 'Schrötter Steel Plating',
          values: [6],
          tiers: [4],
          costs: [400],
          req: ['hull', 4],
          text: v => `+${v} armor`,
        },
      },
    },
    armor: {
      name: 'Armor',
      desc: 'Line, mainline, heavy and super-heavy frames: the armored wall that breaks the enemy front.',
      nodes: {
        armor: {
          name: 'Tungsten Armor',
          values: [3, 6, 9, 13, 18],
          tiers: [1, 1, 2, 3, 4],
          costs: [50, 100, 170, 280, 420],
          text: v => `+${v} armor`,
        },
        hull: {
          name: 'Sakuradite Frames',
          values: [0.06, 0.12, 0.2, 0.3],
          tiers: [1, 2, 3, 4],
          costs: [50, 110, 200, 360],
          text: v => `+${pct(v)} frame integrity`,
        },
        guns: {
          name: 'Maser Vibration Swords',
          values: [0.05, 0.1, 0.16, 0.23, 0.32],
          tiers: [1, 2, 2, 3, 4],
          costs: [50, 100, 170, 280, 420],
          text: v => `+${pct(v)} damage`,
        },
        drives: {
          name: 'Yggdrasil Overdrive',
          values: [1, 2],
          tiers: [2, 4],
          costs: [150, 380],
          text: v => `+${v} movement`,
        },
        secondary: {
          name: 'Needle Blazers',
          values: [0.45, 0.55],
          tiers: [2, 3],
          costs: [120, 220],
          req: ['guns', 1],
          text: v => `+${pct(v)} damage to Infantry`,
        },
        blaze: {
          name: 'Blaze Luminous Shields',
          values: [0.15, 0.25],
          tiers: [2, 3],
          costs: [110, 200],
          text: v => `−${pct(v)} damage from Artillery`,
        },
        assault: {
          name: 'Breakthrough Doctrine',
          values: [0.75, 1],
          tiers: [2, 4],
          costs: [160, 400],
          req: ['guns', 2],
          text: v => `${pct(v)} chance a kill grants one more breakthrough than the cap`,
        },
        formation: {
          name: 'Lance Formation',
          values: [0.15],
          tiers: [3],
          costs: [240],
          req: ['armor', 2],
          text: v => `+${pct(v)} damage when next to another friendly Armor unit`,
        },
        bulkheads: {
          name: 'Electromagnetic Armor',
          values: [0.25],
          tiers: [4],
          costs: [320],
          req: ['hull', 3],
          text: v => `−${pct(v)} damage from city batteries and Siege artillery`,
        },
      },
    },
    artillery: {
      name: 'Artillery',
      desc: 'Fire-support, rocket and siege frames: firepower that suppresses counter-fire.',
      nodes: {
        guns: {
          name: 'Hadron Capacitors',
          values: [0.05, 0.1, 0.18, 0.26, 0.35],
          tiers: [1, 1, 2, 3, 4],
          costs: [50, 100, 180, 300, 440],
          text: v => `+${pct(v)} damage`,
        },
        hull: {
          name: 'Reinforced Chassis',
          values: [0.08, 0.16, 0.26],
          tiers: [1, 2, 3],
          costs: [40, 100, 200],
          text: v => `+${pct(v)} frame integrity`,
        },
        drives: {
          name: 'Heavy Landspinners',
          values: [1, 2],
          tiers: [2, 4],
          costs: [160, 400],
          text: v => `+${v} movement`,
        },
        shells: {
          name: 'Fragmentation Shells',
          values: [0.45, 0.55],
          tiers: [2, 3],
          costs: [120, 220],
          req: ['guns', 1],
          text: v => `+${pct(v)} damage to Infantry`,
        },
        fire: {
          name: 'Factsphere Fire Control',
          values: [1, 2],
          tiers: [2, 4],
          costs: [150, 450],
          req: ['guns', 2],
          text: v =>
            v === 1
              ? '+20% damage against targets next to a friendly non-Artillery unit'
              : '+1 range for all Artillery',
        },
        salvo: {
          name: 'Saturation Salvos',
          values: [0.15, 0.3],
          tiers: [2, 3],
          costs: [120, 240],
          text: v => `Rocket artillery splash +${pct(v)} of the hit`,
        },
        armor: {
          name: 'Gefjun Baffles',
          values: [5],
          tiers: [4],
          costs: [300],
          req: ['hull', 2],
          text: v => `+${v} armor`,
        },
      },
    },
    sakura: {
      name: 'Sakuradite',
      desc: 'Sakuradite technology from Camelot, Clément and Jabalpur: float units, shields and sea transport.',
      nodes: {
        varis: {
          name: 'VARIS Rifles',
          values: [0.06, 0.12],
          tiers: [1, 3],
          costs: [60, 200],
          text: v => `+${pct(v)} critical chance for every unit`,
        },
        blaze: {
          name: 'Blaze Luminous Generators',
          values: [0.06, 0.12],
          tiers: [2, 4],
          costs: [160, 420],
          text: v => `Every unit takes ${pct(v)} less damage`,
        },
        energy: {
          name: 'Energy Filler Network',
          values: [0.04],
          tiers: [3],
          costs: [220],
          text: v => `Every unit repairs ${pct(v)} of its frame each turn`,
        },
        float: {
          name: 'Float System',
          values: [1, 2],
          tiers: [3, 4],
          costs: [260, 460],
          req: ['varis', 1],
          text: v => (v === 1 ? 'Armor units ignore terrain movement costs' : '+1 movement for every unit'),
        },
      },
    },
    naval: {
      name: 'Naval',
      desc: 'Transports, amphibious Knightmares and Carrier-Battleships. Tier IV benefits need a level-3 port.',
      nodes: {
        logistics: {
          name: 'Naval Logistics',
          values: [1, 2],
          tiers: [1, 4],
          costs: [50, 300],
          text: v => (v === 1 ? 'Transports sail 6 hexes' : 'Advanced Naval Logistics: transports sail 7 hexes (needs a level-3 port)'),
        },
        amphibious: {
          name: 'Amphibious Systems',
          values: [1],
          tiers: [1],
          costs: [60],
          text: v => `+${v} sea movement for amphibious Knightmares`,
        },
        landing: {
          name: 'Landing Craft',
          values: [0.25],
          tiers: [2],
          costs: [120],
          text: () => 'Embarked units take 25% extra damage instead of 50%',
        },
        gunnery: {
          name: 'Naval Gunnery',
          values: [0.15],
          tiers: [2],
          costs: [160],
          text: v => `+${pct(v)} Carrier-Battleship damage`,
        },
        damage: {
          name: 'Damage Control',
          values: [0.1],
          tiers: [3],
          costs: [200],
          text: v => `Carrier-Battleships repair ${pct(v)} more of their frame in a friendly port`,
        },
        launch: {
          name: 'Rapid Launch Systems',
          values: [0.1],
          tiers: [4],
          costs: [320],
          text: v => `Knightmares launched from a carrier deal +${pct(v)} on their first attack that turn (needs a level-3 port)`,
        },
      },
    },
    cities: {
      name: 'Cities',
      desc: 'City defenses, batteries, bunkers and Sakuradite refining.',
      nodes: {
        fort: {
          name: 'Fortifications',
          values: [20, 40, 70, 100, 150],
          tiers: [1, 2, 2, 3, 4],
          costs: [40, 80, 140, 220, 360],
          text: v => `+${v} defense on your cities`,
        },
        battery: {
          name: 'Battery Capacitors',
          values: [0.1, 0.25],
          tiers: [1, 2],
          costs: [60, 140],
          text: v => `+${pct(v)} fortress battery damage`,
        },
        bunkers: {
          name: 'Anti-Knightmare Bunkers',
          values: [0.1, 0.2],
          tiers: [1, 2],
          costs: [60, 140],
          text: v => `Units on or next to your cities take ${pct(v)} less damage`,
        },
        refining: {
          name: 'Sakuradite Refining',
          values: [0.1, 0.2],
          tiers: [3, 4],
          costs: [200, 360],
          req: ['bunkers', 1],
          text: v => `+${pct(v)} credits from your cities`,
        },
        overcharge: {
          name: 'Battery Overcharge',
          values: [1, 2],
          tiers: [3, 4],
          costs: [240, 420],
          req: ['battery', 2],
          text: v =>
            v === 1
              ? 'Fortress batteries recharge 1 turn faster'
              : 'Fortress battery blasts hit enemies next to the target for 50%',
        },
      },
    },
  };
  const data = (root.KnightmareData ||= {});
  Object.assign(data, {
    BRANCHES,
    BRANCH_NAMES,
    TECH_TIERS,
    TECH_TREE,
  });
  if (typeof module !== 'undefined') module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);

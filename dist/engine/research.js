/* Knightmare Conquest engine data: the HQ technology tree.
   Data only; read by engine.js. */
(function (root) {
  'use strict';
  // HQ technology: bought with command tokens earned by winning operations, kept in the
  // player's profile across every operation and faction. Each level unlocks at a tier gated by total victories.
  const BRANCHES = { Infantry: 'infantry', Armor: 'armor', Artillery: 'artillery' };
  const BRANCH_NAMES = { infantry: 'Infantry', armor: 'Armor', artillery: 'Artillery', mobility: 'Mobility' };
  const TECH_TIERS = [0, 0, 2, 4, 7];
  const RESEARCH_VERSION = 2; // Reset research purchases once on redesign.
  const pct = v => `${Math.round(v * 100)}%`;
  const TECH_TREE = {
    infantry: {
      name: 'Infantry',
      desc: 'Scouts, assault frames and raiders: screens, city-takers and entrenched defenders.',
      nodes: {
        guns: {
          name: 'Linear Assault Rifles',
          values: [0.05, 0.10, 0.20, 0.30],
          tiers: [1, 1, 2, 3],
          costs: [40, 80, 160, 300],
          text: v => `+${pct(v)} damage`,
        },
        hull: {
          name: 'Composite Frames',
          values: [0.05, 0.10, 0.20, 0.30],
          tiers: [1, 2, 2, 3],
          costs: [40, 90, 150, 280],
          text: v => `+${pct(v)} frame integrity`,
        },
        harken: {
          name: 'Slash Harken Volleys',
          values: [0.10, 0.20],
          tiers: [1, 2],
          costs: [90, 200],
          req: ['guns', 1],
          text: v => `+${pct(v)} armor penetration against Armor`,
        },
        nav: {
          name: 'All-Terrain Landspinners',
          values: [1, 2, 3, 4],
          tiers: [1, 2, 3, 4],
          costs: [70, 150, 260, 400],
          text: v => `Infantry +${v} movement point${v === 1 ? '' : 's'} (total from All-Terrain Landspinners)`,
        },
        filler: {
          name: 'Energy Filler Reserves',
          values: [0.50, 1],
          tiers: [1, 3],
          costs: [50, 120],
          text: v => `−${pct(v)} desert and tundra attrition for Infantry`,
        },
        mines: {
          name: 'Fortress Breaching Charges',
          values: [0.30, 0.50],
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
              ? 'Friendly Artillery next to an Infantry unit takes 20% less damage'
              : 'Infantry counter-fire hits at 90% strength',
        },
        urban: {
          name: 'Urban Assault',
          values: [0.2],
          tiers: [4],
          costs: [400],
          req: ['hull', 4],
          text: v => `Infantry takes −${pct(v)} damage on city and urban hexes`,
        },
        entrench: {
          name: 'Entrenchment Doctrine',
          values: [0.1, 0.2],
          tiers: [2, 4],
          costs: [140, 350],
          text: v => `Infantry that ends a turn without moving takes ${pct(v)} less damage until its next turn`,
        },
        bodyarmor: {
          name: 'Body Armor',
          values: [5, 10],
          tiers: [1, 3],
          costs: [80, 220],
          text: v => `+${v} armor for Infantry`,
        },
        antiarmor: {
          name: 'Anti-Knightmare Weapons',
          values: [0.20, 0.50],
          tiers: [2, 4],
          costs: [120, 340],
          req: ['harken', 1],
          text: v => `+${pct(v)} Infantry damage against Armor`,
        },
      },
    },
    armor: {
      name: 'Armor',
      desc: 'Line, mainline, heavy and super-heavy frames: the armored wall that breaks the enemy front.',
      nodes: {
        armor: {
          name: 'Tungsten Armor',
          values: [5, 10, 15, 20],
          tiers: [1, 2, 3, 4],
          costs: [50, 120, 250, 420],
          text: v => `+${v} armor`,
        },
        hull: {
          name: 'Sakuradite Frames',
          values: [0.05, 0.10, 0.20, 0.30],
          tiers: [1, 2, 3, 4],
          costs: [50, 110, 200, 360],
          text: v => `+${pct(v)} frame integrity`,
        },
        guns: {
          name: 'Maser Vibration Swords',
          values: [0.05, 0.10, 0.20, 0.30],
          tiers: [1, 2, 3, 4],
          costs: [50, 120, 250, 420],
          text: v => `+${pct(v)} damage`,
        },
        secondary: {
          name: 'Needle Blazers',
          values: [0.30, 0.50],
          tiers: [2, 3],
          costs: [120, 220],
          req: ['guns', 1],
          text: v => `+${pct(v)} damage to Infantry`,
        },
        blaze: {
          name: 'Blaze Luminous Shields',
          values: [0.10, 0.20],
          tiers: [2, 3],
          costs: [110, 200],
          text: v => `−${pct(v)} damage from Artillery`,
        },
        assault: {
          name: 'Breakthrough Doctrine',
          values: [0.5, 0.8],
          tiers: [2, 4],
          costs: [160, 400],
          req: ['guns', 2],
          text: v => `${pct(v)} chance a kill grants one more breakthrough than the cap`,
        },
        formation: {
          name: 'Lance Formation',
          values: [0.10],
          tiers: [3],
          costs: [240],
          req: ['armor', 2],
          text: v => `+${pct(v)} damage and +5 armor when next to another friendly Armor unit`,
        },
        bulkheads: {
          name: 'Electromagnetic Armor',
          values: [0.30],
          tiers: [4],
          costs: [320],
          req: ['hull', 3],
          text: v => `−${pct(v)} damage from city batteries and Siege artillery`,
        },
        float: {
          name: 'Float System',
          values: [1, 2, 3, 4],
          tiers: [3, 3, 4, 4],
          costs: [260, 320, 420, 520],
          req: ['armor', 2],
          text: v => `Armor and amphibious Knightmares gain +${v} land movement`,
        },
      },
    },
    artillery: {
      name: 'Artillery',
      desc: 'Fire-support, rocket and siege frames: firepower that suppresses counter-fire.',
      nodes: {
        guns: {
          name: 'Hadron Capacitors',
          values: [0.05, 0.10, 0.20, 0.30],
          tiers: [1, 2, 3, 4],
          costs: [50, 120, 260, 440],
          text: v => `+${pct(v)} damage`,
        },
        hull: {
          name: 'Reinforced Chassis',
          values: [0.10, 0.20, 0.30],
          tiers: [1, 2, 3],
          costs: [40, 100, 200],
          text: v => `+${pct(v)} frame integrity`,
        },
        shells: {
          name: 'Fragmentation Shells',
          values: [0.30, 0.50],
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
              : '+1 range for Artillery that has not moved this turn',
        },
        salvo: {
          name: 'Saturation Salvos',
          values: [0.1, 0.2],
          tiers: [2, 3],
          costs: [120, 240],
          text: v => `Rocket artillery splash +${pct(v)} of the hit`,
        },
        counterbattery: {
          name: 'Counter-Battery Radar',
          values: [0.2],
          tiers: [4],
          costs: [300],
          req: ['hull', 2],
          text: v => `Artillery takes −${pct(v)} damage from enemy Artillery`,
        },
        traction: {
          name: 'Artillery Traction',
          values: [1, 2],
          tiers: [2, 3],
          costs: [110, 240],
          text: v => `+${v} movement for Artillery`,
        },
        armor: {
          name: 'Artillery Armor Plating',
          values: [5, 10],
          tiers: [1, 3],
          costs: [80, 220],
          text: v => `+${v} armor for Artillery`,
        },
      },
    },
    naval: {
      name: 'Naval',
      desc: 'Warship-only research: armor, hulls, gun systems, repairs and carrier operations.',
      nodes: {
        landing: {
          name: 'Landing Craft',
          values: [0.25],
          tiers: [2],
          costs: [120],
          text: () => 'Embarked units take 25% extra damage instead of 50%',
        },
        gunnery: {
          name: 'Naval Gunnery',
          values: [0.10],
          tiers: [2],
          costs: [160],
          text: v => `+${pct(v)} Carrier-Battleship damage`,
        },
        hulls: {
          name: 'Reinforced Naval Hulls',
          values: [0.10, 0.20],
          tiers: [1, 3],
          costs: [100, 260],
          text: v => `+${pct(v)} maximum HP for warships`,
        },
        firecontrol: {
          name: 'Warship Fire Control',
          values: [0.1, 0.2],
          tiers: [2, 4],
          costs: [150, 340],
          text: v => `Carrier-Battleships deal +${pct(v)} damage when counter-firing`,
        },
        damage: {
          name: 'Damage Control',
          values: [0.25],
          tiers: [3],
          costs: [200],
          text: v => `Manual warship repairs at a friendly port cost ${pct(v)} fewer credits; HP restored is unchanged`,
        },
        launch: {
          name: 'Rapid Launch Systems',
          values: [0.20],
          tiers: [4],
          costs: [320],
          text: v => `Knightmares launched from a carrier deal +${pct(v)} on their first attack that turn (needs a level-3 port)`,
        },
        hangars: {
          name: 'Expanded Hangars',
          values: [1],
          tiers: [4],
          costs: [380],
          req: ['launch', 1],
          text: () => 'Carrier-Battleship capacity +1 (2 → 3 formations)',
        },
        armor: {
          name: 'Naval Armor Plating',
          values: [5, 10],
          tiers: [1, 3],
          costs: [100, 240],
          text: v => `+${v} armor for warships`,
        },
      },
    },
    amphibious: {
      name: 'Amphibious',
      desc: 'Dedicated amphibious Knightmare upgrades for sea-to-land operations.',
      nodes: {
        hull: {
          name: 'Amphibious Chassis',
          values: [0.15, 0.30],
          tiers: [1, 3],
          costs: [100, 260],
          text: v => `+${pct(v)} HP for amphibious Knightmares`,
        },
        armor: {
          name: 'Marine Armor',
          values: [5, 10],
          tiers: [1, 3],
          costs: [80, 220],
          text: v => `+${v} armor for amphibious Knightmares`,
        },
        torpedoes: {
          name: 'Advanced Torpedoes',
          values: [0.10, 0.20],
          tiers: [2, 3],
          costs: [140, 260],
          text: v => `+${pct(v)} damage against warships by amphibious Knightmares`,
        },
        coastal: {
          name: 'Coastal Breaching Weapons',
          values: [0.20, 0.40],
          tiers: [2, 4],
          costs: [140, 320],
          text: v => `+${pct(v)} damage to coastal city defenses`,
        },
        landing: {
          name: 'Landing Assault Systems',
          values: [0.10, 0.20],
          tiers: [2, 4],
          costs: [120, 300],
          text: v => `+${pct(v)} first-attack damage after landing`,
        },
      },
    },
    cities: {
      name: 'Cities',
      desc: 'Cities, defense, industry, targeting infrastructure and support systems.',
      nodes: {
        fort: {
          name: 'Fortifications',
          values: [100, 200, 300, 400, 500],
          tiers: [1, 2, 2, 3, 4],
          costs: [40, 80, 140, 220, 360],
          text: v => `+${v} defense on your cities`,
        },
        battery: {
          name: 'Battery Capacitors',
          values: [0.1, 0.2],
          tiers: [1, 2],
          costs: [60, 140],
          text: v => `+${pct(v)} fortress battery damage`,
        },
        bunkers: {
          name: 'Anti-Knightmare Bunkers',
          values: [0.10, 0.20],
          tiers: [1, 2],
          costs: [60, 140],
          text: v => `Units on or next to your cities take ${pct(v)} less damage`,
        },
        refining: {
          name: 'Sakuradite Refining',
          values: [0.20, 0.30],
          tiers: [3, 4],
          costs: [200, 360],
          req: ['bunkers', 1],
          text: v => `+${pct(v)} Sakuradite received from deposits`,
        },
        industry: {
          name: 'Industrial Standardization',
          values: [0.05, 0.1],
          tiers: [2, 3],
          costs: [160, 340],
          text: v => `+${pct(v)} industry generated by your cities`,
        },
        engineering: {
          name: 'Military Engineering',
          values: [0.05, 0.10],
          tiers: [2, 4],
          costs: [180, 380],
          text: v => `Your cities regenerate an extra ${pct(v)} of maximum defenses at the start of each turn`,
        },
        overcharge: {
          name: 'Battery Overcharge',
          values: [1, 2],
          tiers: [3, 4],
          costs: [240, 420],
          req: ['battery', 2],
          text: v =>
            v === 1
              ? 'Fortress battery range +1 hex (2 → 3); recharge stays 2 turns'
              : 'Fortress battery range +1 hex and blasts hit enemies next to the target for 40%; recharge stays 2 turns',
        },
        targeting: {
          name: 'Advanced Targeting Network',
          values: [0.05, 0.10],
          tiers: [1, 3],
          costs: [60, 200],
          text: v => `+${pct(v)} critical chance for every unit`,
        },
        shields: {
          name: 'Defensive Energy Grid',
          values: [0.05, 0.10],
          tiers: [2, 4],
          costs: [160, 420],
          text: v => `All units take ${pct(v)} less damage`,
        },
        energy: {
          name: 'Energy Filler Network',
          values: [0.15],
          tiers: [3],
          costs: [220],
          text: v => `Manual repairs cost ${pct(v)} fewer credits; HP restored is unchanged`,
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
    RESEARCH_VERSION,
  });
  if (typeof module !== 'undefined') module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);

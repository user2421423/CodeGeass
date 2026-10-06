/* Knightmare Conquest: deterministic hex rules for a Code Geass world war. No UI or network dependencies. */
(function (root) {
  'use strict';
  // ======== Factions ========
  const FACTIONS = {
    britannia: {
      name: 'Holy Britannian Empire',
      short: 'Britannia',
      adj: 'Britannian',
      color: '#c9a4ff',
      letter: 'B',
      capital: 'Pendragon',
      doctrine: 'Knightmare Supremacy',
      doctrineText: 'Armor-branch Knightmares deal +8% damage.',
    },
    eu: {
      name: 'Europia United',
      short: 'E.U.',
      adj: 'European',
      color: '#72b4ff',
      letter: 'E',
      capital: 'Paris',
      doctrine: 'Firepower Doctrine',
      doctrineText: 'Artillery-branch Knightmares deal +10% damage.',
    },
    cf: {
      name: 'Chinese Federation',
      short: 'Federation',
      adj: 'Federation',
      color: '#ff8c6e',
      letter: 'C',
      capital: 'Luoyang',
      doctrine: 'Strength in Numbers',
      doctrineText: 'Infantry-branch Knightmares cost 15% less.',
    },
    neutral: { name: 'Neutral powers', short: 'Neutral', adj: 'Neutral', color: '#c2bd9f', letter: 'N' },
  };
  const MAJORS = ['britannia', 'eu', 'cf'];
  // ======== Knightmare classes: three branches, as WC4's infantry, tanks and artillery ========
  const CLASSES = {
    scout: {
      branch: 'Infantry',
      role: 'Scout',
      wc: 'Light Infantry',
      hp: 150,
      attack: 37,
      armor: 9,
      move: 4,
      min: 1,
      max: 1,
      cost: 60,
      industry: 10,
      tier: 1,
      crit: 0.08,
      pen: 0.08,
      rule: 'Low-cost screen and fast city capture. Range 1; exchanges counter-fire.',
    },
    assault: {
      branch: 'Infantry',
      role: 'Assault',
      wc: 'Assault Infantry',
      hp: 210,
      attack: 53,
      armor: 16,
      move: 3,
      min: 1,
      max: 1,
      cost: 110,
      industry: 25,
      tier: 1,
      crit: 0.12,
      pen: 0.45,
      boarding: true,
      rule: 'Anti-Knightmare close assault: +55% damage to Armor and to city defenses. Range 1; exchanges counter-fire.',
    },
    raider: {
      branch: 'Infantry',
      role: 'Raider',
      wc: 'Motorized Infantry',
      hp: 200,
      attack: 47,
      armor: 15,
      move: 5,
      min: 1,
      max: 1,
      cost: 115,
      industry: 25,
      tier: 2,
      crit: 0.1,
      pen: 0.15,
      rule: 'Five-hex movement for flanking and city raids. Range 1; exchanges counter-fire.',
    },
    light: {
      branch: 'Armor',
      role: 'Line',
      wc: 'Light Tank',
      hp: 245,
      attack: 57,
      armor: 23,
      move: 4,
      min: 1,
      max: 1,
      cost: 135,
      industry: 30,
      tier: 1,
      crit: 0.12,
      pen: 0.2,
      breakthrough: true,
      rule: 'Balanced front-line frame. A kill lets it fire once more per turn (no extra movement).',
    },
    medium: {
      branch: 'Armor',
      role: 'Mainline',
      wc: 'Medium Tank',
      hp: 330,
      attack: 71,
      armor: 32,
      move: 3,
      min: 1,
      max: 1,
      cost: 215,
      industry: 55,
      tier: 2,
      crit: 0.14,
      pen: 0.3,
      breakthrough: true,
      rule: 'The army backbone. Heavy armor; a kill lets it fire once more per turn (no extra movement).',
    },
    heavy: {
      branch: 'Armor',
      role: 'Heavy',
      wc: 'Heavy Tank',
      hp: 440,
      attack: 89,
      armor: 42,
      move: 3,
      min: 1,
      max: 2,
      cost: 330,
      industry: 90,
      tier: 3,
      crit: 0.18,
      pen: 0.42,
      breakthrough: true,
      relentless: true,
      rule: 'Heavy armor penetration and 1–2 hex guns. Every kill lets it fire again; the first also refreshes its movement.',
    },
    super: {
      branch: 'Armor',
      role: 'Super-heavy',
      wc: 'Super Heavy Tank',
      hp: 590,
      attack: 108,
      armor: 52,
      move: 2,
      min: 1,
      max: 2,
      cost: 500,
      industry: 140,
      tier: 3,
      crit: 0.22,
      pen: 0.48,
      breakthrough: true,
      relentless: true,
      rule: 'Super-heavy ace frame. Immense armor, 1–2 hex guns. Every kill lets it fire again; the first also refreshes its movement.',
    },
    support: {
      branch: 'Artillery',
      role: 'Fire support',
      wc: 'Field Artillery',
      hp: 150,
      attack: 59,
      armor: 10,
      move: 2,
      min: 1,
      max: 1,
      cost: 130,
      industry: 30,
      tier: 1,
      crit: 0.12,
      pen: 0.45,
      noCounter: true,
      rule: 'Range 1 suppressive fire: the target cannot return fire. Protect its thin armor with Infantry.',
    },
    rocket: {
      branch: 'Artillery',
      role: 'Rocket artillery',
      wc: 'Rocket Artillery',
      hp: 185,
      attack: 77,
      armor: 12,
      move: 3,
      min: 2,
      max: 2,
      cost: 235,
      industry: 70,
      tier: 2,
      crit: 0.12,
      pen: 0.55,
      noCounter: true,
      splash: 0.45,
      rule: 'Range 2 salvos; cannot fire at adjacent targets. 45% splash and morale loss to enemies next to the target. No counter-fire.',
    },
    siege: {
      branch: 'Artillery',
      role: 'Siege',
      wc: 'Siege Artillery',
      hp: 280,
      attack: 112,
      armor: 23,
      move: 1,
      min: 2,
      max: 2,
      cost: 380,
      industry: 110,
      tier: 3,
      crit: 0.25,
      critMult: 1.9,
      pen: 0.8,
      noCounter: true,
      siege: 2,
      rule: 'Range 2 heavy gun; cannot fire at adjacent targets. +100% damage to city defenses, 80% armor penetration, movement 1. No counter-fire.',
    },
  };
  const CLASS_ORDER = ['scout', 'assault', 'raider', 'light', 'medium', 'heavy', 'super', 'support', 'rocket', 'siege'];
  // Faction Knightmare lineups (Code Geass wiki). Stats come from the class; a few frames tweak them.
  const KNIGHTMARES = {
    // Holy Britannian Empire (with Euro Britannia).
    glasgow: {
      side: 'britannia',
      cls: 'scout',
      name: 'Glasgow',
      model: 'RPI-11',
      gen: '4th generation',
      weapon: 'Assault rifle · Slash Harkens',
      lore: 'The first mass-production Knightmare, the frame that overran Japan in 2010. Obsolete, but cheap.',
    },
    gloucester: {
      side: 'britannia',
      cls: 'assault',
      name: 'Gloucester',
      model: 'RPI-209',
      gen: '5th generation',
      weapon: 'EM jousting lance · Chaos mines',
      lore: 'A Sutherland refined to hunt other Knightmares; the mount of Cornelia’s guard.',
    },
    gracchus: {
      side: 'britannia',
      cls: 'raider',
      name: 'Gracchus',
      model: 'RPI-210',
      gen: '5th generation',
      weapon: 'Extending rapier arms · Foldable cannon',
      lore: 'Euro Britannia’s swift knight frame, flown by the Knights of St. Michael.',
    },
    sutherland: {
      side: 'britannia',
      cls: 'light',
      name: 'Sutherland',
      model: 'RPI-13',
      gen: '5th generation',
      weapon: 'Assault rifle · Stun tonfas',
      lore: 'The workhorse of the Britannian Army and the Purist Faction.',
    },
    vincent_ward: {
      side: 'britannia',
      cls: 'medium',
      name: 'Vincent Ward',
      model: 'RPI-212B',
      gen: '7th generation',
      weapon: 'Lance-type MVS · Assault rifle',
      lore: 'The mass-production descendant of the Lancelot.',
    },
    brighton: {
      side: 'britannia',
      cls: 'heavy',
      name: 'Brighton',
      model: 'RPI-213',
      gen: '7th generation',
      weapon: 'Foldable railgun · Forearm blade',
      lore: 'A heavily armoured command frame built to lead Vincent Ward squadrons.',
    },
    gawain: {
      side: 'britannia',
      cls: 'super',
      name: 'Gawain',
      model: 'IFX-V3D1',
      gen: '6th generation',
      weapon: 'Shoulder Hadron Cannons · Druid System',
      lore: 'Twice the mass of a normal Knightmare, carried by an integrated Float System: ignores terrain movement costs.',
      float: true,
    },
    liverpool: {
      side: 'britannia',
      cls: 'support',
      name: 'Liverpool',
      model: 'Euro Britannia',
      gen: '5th generation',
      weapon: 'Main battle cannon · Side minigun',
      lore: 'A tank turret on legs: hard-hitting at the line, helpless in a melee.',
      attack: 63,
      armor: 8,
    },
    gareth: {
      side: 'britannia',
      cls: 'rocket',
      name: 'Gareth',
      model: 'RPI-V4L',
      gen: '7th generation',
      weapon: 'Hadron Cannons · 14-tube missile launchers',
      lore: 'The mass-production Gawain flown by the Glaston Knights.',
    },
    zetland: {
      side: 'britannia',
      cls: 'siege',
      name: 'Zetland',
      model: 'RZX-6DD',
      gen: '6th generation',
      weapon: 'Mega Hadron Launcher',
      lore: 'A positional-defense prototype; its launcher became the Mordred’s Stark Hadron Cannon.',
    },
    // Europia United (with wZERO and the Star of Madrid).
    alexander_drone: {
      side: 'eu',
      cls: 'scout',
      name: 'Alexander Drone',
      model: 'WOX-Type02/UBW',
      gen: '7th-generation equivalent',
      weapon: 'Judgement 30mm rifle · Uruna Edge knives',
      lore: 'AI-piloted Alexanders: weaker than a manned frame, but numerous and expendable.',
    },
    amanecer: {
      side: 'eu',
      cls: 'assault',
      name: 'Amanecer',
      model: 'Type-05G/ESP',
      gen: '7th-generation equivalent',
      weapon: 'Brazo Caliente · Espada blades',
      lore: 'The “Red Manteau” of the Star of Madrid, built in India from Akatsuki plans.',
    },
    alexander: {
      side: 'eu',
      cls: 'raider',
      name: 'Alexander Type-02',
      model: 'WOX-Type02',
      gen: '7th-generation equivalent',
      weapon: 'Insect Mode · Uruna Edge knives',
      lore: 'Anna Clément’s wZERO frame; its Insect Mode outruns almost anything.',
    },
    estrella: {
      side: 'eu',
      cls: 'light',
      name: 'Estrella',
      model: 'Type-06/ESP',
      gen: '5th generation',
      weapon: 'Assault rifle · Stun tonfas',
      lore: 'A Sutherland copy with added armor, flown by the Star of Madrid.',
    },
    alexander_valiant: {
      side: 'eu',
      cls: 'medium',
      name: 'Alexander Valiant',
      model: 'WOX-Type02V',
      gen: '7th generation',
      weapon: 'Personal weapons · Judgement rifle',
      lore: 'wZERO’s upgraded Alexanders, on par with Britannia’s Vincent.',
    },
    alexander_redorga: {
      side: 'eu',
      cls: 'heavy',
      name: 'Alexander Redorga',
      model: 'WOX Type-03/SC',
      gen: '7th-generation equivalent',
      weapon: 'Heat swords · Judgement Mk2 rifle',
      lore: 'The “Red Ogre”: a Valiant rebuilt with extra limbs and a new OS.',
    },
    alexander_liberte: {
      side: 'eu',
      cls: 'super',
      name: 'Alexander Liberte',
      model: 'WOX-Type-01AC',
      gen: '7th-generation equivalent',
      weapon: 'MVS katana · Blaze Luminous',
      lore: 'Akito’s Alexander, rebuilt in Schrötter steel with propulsion wings: lighter and faster than other super-heavies.',
      hp: 540,
      move: 3,
    },
    gardmare: {
      side: 'eu',
      cls: 'support',
      name: 'Gardmare',
      model: 'E.U. escort platform',
      gen: 'Imitation Knightmare',
      weapon: 'Arm auto-cannons · Large claws',
      lore: 'A fast escort weapon platform from before the E.U. could build true Knightmares.',
      move: 3,
      armor: 7,
    },
    panzer_hummel: {
      side: 'eu',
      cls: 'rocket',
      name: 'Panzer-Hummel',
      model: 'Mk3-E2E8',
      gen: '4th generation',
      weapon: 'Auto-cannons · 3-tube missile pods',
      lore: 'The E.U.’s walking tank. Slow, but it held the El Alamein line.',
      armor: 16,
      move: 2,
    },
    panzer_wespe: {
      side: 'eu',
      cls: 'siege',
      name: 'Panzer-Wespe',
      model: 'Hummel successor',
      gen: '5th generation',
      weapon: 'Shoulder artillery cannons · Missile pods',
      lore: 'The Hummel’s heavier successor, carrying enormous shoulder guns.',
    },
    // Chinese Federation (with the Militarized Zone of India's Jabalpur designs).
    gun_ru: {
      side: 'cf',
      cls: 'scout',
      name: 'Gun-Ru',
      model: 'TQ-19',
      gen: '4th generation',
      weapon: 'Shoulder machine guns and cannons',
      lore: 'Cheap, crude and fielded by the hundreds: sturdier but slower than other scouts.',
      hp: 175,
      move: 3,
    },
    guren_type01: {
      side: 'cf',
      cls: 'assault',
      name: 'Guren Type-01',
      model: 'Type-01',
      gen: '7th-generation equivalent',
      weapon: 'Fork knife · 43mm grenade launcher',
      lore: 'Rakshata’s first Jabalpur prototype, built in small numbers in India.',
    },
    chuyen: {
      side: 'cf',
      cls: 'raider',
      name: 'Chuyen',
      model: 'XT-401',
      gen: '7th-generation equivalent',
      weapon: 'Electromagnetic Monkey King pole',
      lore: 'A toned-down mass-production Shen Hu built for agile close combat.',
    },
    gekka: {
      side: 'cf',
      cls: 'light',
      name: 'Gekka',
      model: 'Type-03F',
      gen: '7th-generation equivalent',
      weapon: 'Revolving blade sword · Hand gun',
      lore: 'Jabalpur’s lean Guren derivative.',
    },
    akatsuki: {
      side: 'cf',
      cls: 'medium',
      name: 'Akatsuki',
      model: 'Type-05',
      gen: '7th-generation equivalent',
      weapon: 'Revolving blade · Shoulder machine guns',
      lore: 'Jabalpur’s mass-production frame, standard issue of the UFN era.',
    },
    wang_hu: {
      side: 'cf',
      cls: 'heavy',
      name: 'Wang Hu',
      model: 'XT-403',
      gen: '7th-generation equivalent',
      weapon: 'Twin MVS Netsu Zanto · Radiant Wave barrier',
      lore: 'The “King Tiger”, brother machine of the Shen Hu.',
    },
    shen_hu: {
      side: 'cf',
      cls: 'super',
      name: 'Shen Hu',
      model: 'XT-404',
      gen: '7th-generation equivalent',
      weapon: 'Baryon Cannon · Electrified harkens',
      lore: 'The “Divine Tiger”: its Baryon Cannon hits harder than any other super-heavy, at the cost of hull.',
      attack: 114,
      hp: 560,
    },
    guren_hei: {
      side: 'cf',
      cls: 'support',
      name: 'Guren Type-Hei',
      model: 'Type-Hei',
      gen: '7th generation',
      weapon: 'Radiation Wave arm · Hand gun',
      lore: 'An Indian anti-panzer Guren that cooks enemy frames at close range.',
    },
    zangetsu: {
      side: 'cf',
      cls: 'rocket',
      name: 'Zangetsu',
      model: 'Type-04',
      gen: '7th-generation equivalent',
      weapon: '12-tube missile launcher · Radiant Wave',
      lore: 'Jabalpur’s commander frame, built for the United Federation of Nations.',
    },
    sutherland_sieg: {
      side: 'cf',
      cls: 'siege',
      name: 'Sutherland Sieg',
      model: 'RPI-13J/X',
      gen: 'Knight Giga Fortress',
      weapon: 'Hyper-velocity cannon · Lance harkens',
      lore: 'The Siegfried, rebuilt by Rakshata at Jabalpur around a Sutherland core.',
    },
    // Neutral garrisons: the Middle Eastern Federation's own frame.
    bamides: {
      side: 'neutral',
      cls: 'heavy',
      name: 'Bamides',
      model: 'MEF',
      gen: '4th generation',
      weapon: 'Belly cannon · Shoulder missiles',
      lore: 'The Middle Eastern Federation’s oversized tripod imitation of a Knightmare.',
    },
  };
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
          desc: `${c.rule}${k.float ? ' Integrated Float System: ignores terrain movement costs.' : ''}`,
        },
      ];
    }),
  );
  const ROSTER = Object.fromEntries(
    MAJORS.map(side => [
      side,
      Object.fromEntries(Object.entries(KNIGHTMARES).filter(([, k]) => k.side === side).map(([id, k]) => [k.cls, id])),
    ]),
  );
  function typeFor(side, cls) {
    return ROSTER[side]?.[cls] || ROSTER.britannia[cls];
  }
  // ======== Commanders (WC4 generals): signature abilities are data, read by the combat rules ========
  const COMMANDERS = {
    suzaku: {
      name: 'Suzaku Kururugi',
      short: 'Suzaku',
      side: 'britannia',
      stars: 5,
      cost: 210,
      role: 'Armor',
      hull: 'Lancelot Conquista',
      title: 'Knight of Seven',
      skill: 'Live On',
      desc: '+30% critical chance and +1 movement. “Live!”: morale never falls below steady.',
      fx: { crit: 0.3, move: 1, floor: 0 },
    },
    cornelia: {
      name: 'Cornelia li Britannia',
      short: 'Cornelia',
      side: 'britannia',
      stars: 5,
      cost: 170,
      role: 'Armor',
      hull: 'Gloucester (Cornelia custom)',
      title: 'Second Princess',
      skill: 'Witch of Britannia',
      desc: '+2 movement. Armor can fire again after a kill twice per turn.',
      fx: { move: 2, refire: true },
    },
    bismarck: {
      name: 'Bismarck Waldstein',
      short: 'Bismarck',
      side: 'britannia',
      stars: 5,
      cost: 180,
      role: 'Armor',
      hull: 'Galahad',
      title: 'Knight of One',
      skill: 'Excalibur',
      desc: '+25% armor penetration and +10% damage. Reflects 20% of counter-fire received.',
      fx: { pen: 0.25, dmg: 0.1, reflect: 0.2 },
    },
    julius: {
      name: 'Julius Kingsley',
      short: 'Julius',
      side: 'britannia',
      stars: 5,
      cost: 210,
      role: 'Armor',
      hull: 'Gloucester Swordsman (Julius)',
      title: 'Imperial strategist',
      skill: 'Geass: Absolute Obedience',
      desc: '−20% damage taken, +65% counter-fire, ignores terrain movement costs. Geass Command lowers nearby enemy morale by 2.',
      fx: { taken: 0.8, counter: 0.65, ignoreTerrain: true },
      action: { name: 'Geass Command', verb: 'Julius’s Geass' },
    },
    schneizel: {
      name: 'Schneizel el Britannia',
      short: 'Schneizel',
      side: 'britannia',
      stars: 4,
      cost: 150,
      role: 'Artillery',
      hull: 'Avalon command link',
      title: 'Prime Minister',
      skill: 'The White Prince',
      desc: 'Command aura reaches 2 hexes and grants nearby units +12% damage.',
      fx: { aura: { range: 2, value: 0.12 } },
      recruit: 300,
    },
    gino: {
      name: 'Gino Weinberg',
      short: 'Gino',
      side: 'britannia',
      stars: 4,
      cost: 145,
      role: 'Infantry',
      hull: 'Tristan',
      title: 'Knight of Three',
      skill: 'Fortress Mode',
      desc: '+1 movement, +15% damage. Armor can fire again after a kill twice per turn.',
      fx: { move: 1, dmg: 0.15, refire: true },
      recruit: 300,
    },
    anya: {
      name: 'Anya Alstreim',
      short: 'Anya',
      side: 'britannia',
      stars: 4,
      cost: 140,
      role: 'Artillery',
      hull: 'Mordred',
      title: 'Knight of Six',
      skill: 'Stark Hadron Cannon',
      desc: 'Artillery deals +25% damage; +30% damage to city defenses.',
      fx: { dmgBranch: { Artillery: 0.25 }, vsCity: 0.3 },
      recruit: 300,
    },
    luciano: {
      name: 'Luciano Bradley',
      short: 'Luciano',
      side: 'britannia',
      stars: 4,
      cost: 150,
      role: 'Armor',
      hull: 'Percival',
      title: 'Knight of Ten',
      skill: 'Vampire of Britannia',
      desc: 'Armor attacks deal +25% damage, but the unit takes 10% more counter-fire.',
      fx: { dmgBranch: { Armor: 0.25 }, attackOnly: true, counterTaken: 1.1 },
      recruit: 300,
    },
    jeremiah: {
      name: 'Jeremiah Gottwald',
      short: 'Jeremiah',
      side: 'britannia',
      stars: 4,
      cost: 140,
      role: 'Armor',
      hull: 'Siegfried',
      title: 'Purist Faction',
      skill: 'Orange Loyalty',
      desc: 'Morale never falls below steady; takes 10% less damage.',
      fx: { floor: 0, taken: 0.9 },
      recruit: 300,
    },
    shin: {
      name: 'Shin Hyuga Shaing',
      short: 'Shin',
      side: 'britannia',
      stars: 4,
      cost: 135,
      role: 'Armor',
      hull: 'Vercingetorix',
      title: 'Grand Master of St. Michael',
      skill: 'Geass of Despair',
      desc: 'Each attack also lowers the surviving target’s morale by 1.',
      fx: { terror: true },
      recruit: 300,
    },
    rolo: {
      name: 'Rolo Lamperouge',
      short: 'Rolo',
      side: 'britannia',
      stars: 4,
      cost: 140,
      role: 'Infantry',
      hull: 'Vincent',
      title: 'Geass Order',
      skill: 'Absolute Time Stop',
      desc: '+30% damage when firing before moving this turn.',
      fx: { opening: 0.3 },
      recruit: 300,
    },
    guilford: {
      name: 'Gilbert G.P. Guilford',
      short: 'Guilford',
      side: 'britannia',
      stars: 3,
      cost: 110,
      role: 'Infantry',
      hull: 'Gloucester (Guilford custom)',
      title: 'Cornelia’s knight',
      skill: 'Spear of Cornelia',
      desc: 'Takes 25% less damage on or next to a friendly city.',
      fx: { cityGuard: 0.75 },
      recruit: 200,
    },
    darlton: {
      name: 'Andreas Darlton',
      short: 'Darlton',
      side: 'britannia',
      stars: 3,
      cost: 115,
      role: 'Infantry',
      hull: 'Gloucester (Darlton custom)',
      title: 'Glaston Knights',
      skill: 'Father of the Glaston Knights',
      desc: '+20% Infantry damage. Nearby friendly units recover one extra morale step each turn.',
      fx: { dmgBranch: { Infantry: 0.2 }, rally: 2 },
      recruit: 200,
    },
    ashley: {
      name: 'Ashley Ashra',
      short: 'Ashley',
      side: 'britannia',
      stars: 3,
      cost: 110,
      role: 'Armor',
      hull: 'Ahuramazda',
      title: 'Ashra Corps',
      skill: 'Ashra Corps',
      desc: '+20% damage when attacking. Armor can fire again after a kill twice per turn.',
      fx: { dmg: 0.2, attackOnly: true, refire: true },
      recruit: 200,
    },
    leila: {
      name: 'Leila Malcal',
      short: 'Leila',
      side: 'eu',
      stars: 5,
      cost: 200,
      role: 'Artillery',
      hull: 'Alexander Type-02 (Leila version)',
      title: 'Commander of wZERO',
      skill: 'Hannibal’s Ghosts',
      desc: 'Command aura reaches 2 hexes with +12% damage. wZERO Feint lowers nearby enemy morale by 2.',
      fx: { aura: { range: 2, value: 0.12 } },
      action: { name: 'wZERO Feint', verb: 'Leila’s feint' },
    },
    akito: {
      name: 'Akito Hyuga',
      short: 'Akito',
      side: 'eu',
      stars: 5,
      cost: 190,
      role: 'Infantry',
      hull: 'Alexander Liberte',
      title: 'The Wyvern of wZERO',
      skill: 'Brain Raid',
      desc: '+1 movement, +30% critical chance and +20% Infantry damage.',
      fx: { move: 1, crit: 0.3, dmgBranch: { Infantry: 0.2 } },
    },
    ryo: {
      name: 'Ryo Sayama',
      short: 'Ryo',
      side: 'eu',
      stars: 4,
      cost: 145,
      role: 'Armor',
      hull: 'Alexander Valiant (Ryo version)',
      title: 'wZERO',
      skill: 'Hot-Blooded Charge',
      desc: 'Armor attacks deal +25% damage, but the unit takes 10% more counter-fire.',
      fx: { dmgBranch: { Armor: 0.25 }, attackOnly: true, counterTaken: 1.1 },
      recruit: 300,
    },
    ayano: {
      name: 'Ayano Kosaka',
      short: 'Ayano',
      side: 'eu',
      stars: 4,
      cost: 145,
      role: 'Infantry',
      hull: 'Alexander Valiant (Ayano version)',
      title: 'wZERO',
      skill: 'Kosaka Swordplay',
      desc: 'Infantry deals +35% damage. Capturing a city restores 30% of the unit’s frame.',
      fx: { dmgBranch: { Infantry: 0.35 }, captureHeal: 0.3 },
      recruit: 300,
    },
    yukiya: {
      name: 'Yukiya Naruse',
      short: 'Yukiya',
      side: 'eu',
      stars: 3,
      cost: 110,
      role: 'Artillery',
      hull: 'Alexander Valiant (Yukiya version)',
      title: 'wZERO',
      skill: 'Hacker’s Aim',
      desc: '+20% critical chance and critical hits deal +25% more.',
      fx: { crit: 0.2, critBonus: 0.25 },
      recruit: 200,
    },
    oscar: {
      name: 'Oscar Hammel',
      short: 'Oscar',
      side: 'eu',
      stars: 3,
      cost: 100,
      role: 'Armor',
      hull: 'Alexander Type-02 (escort)',
      title: 'Leila’s guardian',
      skill: 'Shield of wZERO',
      desc: 'His unit and adjacent friendly units take 10% less damage.',
      fx: { rearguard: 0.9 },
      recruit: 200,
    },
    klaus: {
      name: 'Klaus Warwick',
      short: 'Klaus',
      side: 'eu',
      stars: 3,
      cost: 100,
      role: 'Infantry',
      hull: 'wZERO supply column',
      title: 'Deputy commander',
      skill: 'Old Soldier’s Rations',
      desc: 'While he commands, all your repairs cost half; his unit repairs 8% of its frame each turn.',
      fx: { repairHalf: true, regen: 0.08 },
      recruit: 200,
    },
    anna: {
      name: 'Anna Clément',
      short: 'Anna',
      side: 'eu',
      stars: 3,
      cost: 100,
      role: 'Artillery',
      hull: 'Clément field workshop',
      title: 'Alexander designer',
      skill: 'Clément Engineering',
      desc: 'Friendly units within 2 hexes recover 1 extra morale and 5% of their frame each turn.',
      fx: { reassure: true },
      recruit: 200,
    },
    smilas: {
      name: 'Gene Smilas',
      short: 'Smilas',
      side: 'eu',
      stars: 4,
      cost: 145,
      role: 'Armor',
      hull: 'E.U. command frame',
      title: 'Commander-in-Chief',
      skill: 'General of the Republic',
      desc: 'Counter-fire +35%; morale never falls below steady.',
      fx: { counter: 0.35, floor: 0 },
      recruit: 300,
    },
    fernando: {
      name: 'Fernando Noriega',
      short: 'Fernando',
      side: 'eu',
      stars: 3,
      cost: 100,
      role: 'Infantry',
      hull: 'Estrella (Fernando custom)',
      title: 'Star of Madrid',
      skill: 'Star of Madrid',
      desc: 'His unit and units within 1 hex never drop below low morale (no diminished or confused).',
      fx: { calm: true },
      recruit: 200,
    },
    marirrosa: {
      name: 'Marirrosa Noriega',
      short: 'Marirrosa',
      side: 'eu',
      stars: 3,
      cost: 105,
      role: 'Artillery',
      hull: 'Estrella (Marirrosa custom)',
      title: 'Star of Madrid',
      skill: 'Heavy Cannon',
      desc: '+10% damage for each other friendly unit next to the target (up to +30%).',
      fx: { artist: 0.1 },
      recruit: 200,
    },
    xingke: {
      name: 'Li Xingke',
      short: 'Xingke',
      side: 'cf',
      stars: 5,
      cost: 210,
      role: 'Armor',
      hull: 'Shen Hu',
      title: 'Commander of the Empress’s guard',
      skill: 'Divine Tiger',
      desc: '+30% critical chance, +1 movement and +10% damage.',
      fx: { crit: 0.3, move: 1, dmg: 0.1 },
    },
    xianglin: {
      name: 'Zhou Xianglin',
      short: 'Xianglin',
      side: 'cf',
      stars: 4,
      cost: 150,
      role: 'Infantry',
      hull: 'Gun-Ru command',
      title: 'Xingke’s tactician',
      skill: 'Thirty-Six Stratagems',
      desc: '+1 movement; nearby units gain +10% damage. Stratagem lowers nearby enemy morale by 2.',
      fx: { move: 1, aura: { range: 1, value: 0.1 } },
      action: { name: 'Stratagem', verb: 'Xianglin’s stratagem' },
    },
    honggu: {
      name: 'Hong Gu',
      short: 'Hong Gu',
      side: 'cf',
      stars: 3,
      cost: 95,
      role: 'Artillery',
      hull: 'Gun-Ru',
      title: 'Federation general',
      skill: 'Steady Ranks',
      desc: '+8% damage and 8% less damage taken.',
      fx: { dmg: 0.08, taken: 0.92 },
      recruit: 200,
    },
    cao: {
      name: 'General Cao',
      short: 'Cao',
      side: 'cf',
      stars: 3,
      cost: 110,
      role: 'Infantry',
      hull: 'Liaodong garrison',
      title: 'Militarized Zone of Liaodong',
      skill: 'Liaodong Garrison',
      desc: 'Takes 25% less damage on or next to a friendly city.',
      fx: { cityGuard: 0.75 },
      recruit: 200,
    },
    gaohai: {
      name: 'Gao Hai',
      short: 'Gao Hai',
      side: 'cf',
      stars: 3,
      cost: 100,
      role: 'Infantry',
      hull: 'Eunuch Guard Gun-Ru',
      title: 'High Eunuch',
      skill: 'Palace Treasury',
      desc: 'While he commands, all your repairs cost half; his unit repairs 8% of its frame each turn.',
      fx: { repairHalf: true, regen: 0.08 },
      recruit: 200,
    },
    zhaohao: {
      name: 'Zhao Hao',
      short: 'Zhao Hao',
      side: 'cf',
      stars: 3,
      cost: 100,
      role: 'Armor',
      hull: 'Eunuch Guard Gun-Ru',
      title: 'High Eunuch',
      skill: 'Palace Intrigue',
      desc: 'Each attack also lowers the surviving target’s morale by 1.',
      fx: { terror: true },
      recruit: 200,
    },
    leifeng: {
      name: 'Chao Lei Feng',
      short: 'Lei Feng',
      side: 'cf',
      stars: 4,
      cost: 150,
      role: 'Armor',
      hull: 'Wang Hu',
      title: 'The King Tiger',
      skill: 'Rebel Tiger',
      desc: 'Armor attacks deal +25% damage, but the unit takes 10% more counter-fire.',
      fx: { dmgBranch: { Armor: 0.25 }, attackOnly: true, counterTaken: 1.1 },
      recruit: 300,
    },
    meiling: {
      name: 'Chao Meiling',
      short: 'Meiling',
      side: 'cf',
      stars: 3,
      cost: 105,
      role: 'Armor',
      hull: 'Akatsuki',
      title: 'Akatsuki pilot',
      skill: 'Iron Resolve',
      desc: 'Takes 30% less damage while below half its frame.',
      fx: { belowHalf: 0.7 },
      recruit: 200,
    },
    lifeng: {
      name: 'Xu Lifeng',
      short: 'Lifeng',
      side: 'cf',
      stars: 3,
      cost: 115,
      role: 'Infantry',
      hull: 'Chuyen',
      title: 'Kung fu master',
      skill: 'Monkey King',
      desc: '+20% Infantry damage. Nearby friendly units recover one extra morale step each turn.',
      fx: { dmgBranch: { Infantry: 0.2 }, rally: 2 },
      recruit: 200,
    },
    rakshata: {
      name: 'Rakshata Chawla',
      short: 'Rakshata',
      side: 'cf',
      stars: 4,
      cost: 140,
      role: 'Artillery',
      hull: 'Jabalpur prototypes',
      title: 'Jabalpur Research Center',
      skill: 'Radiant Wave Engineering',
      desc: 'Artillery deals +25% damage; +30% damage to city defenses.',
      fx: { dmgBranch: { Artillery: 0.25 }, vsCity: 0.3 },
      recruit: 300,
    },
  };
  const NOFX = {};
  // HQ technology, as in World Conqueror 4: bought with command tokens earned by winning operations, kept in the
  // player's profile across every operation and faction. Each level unlocks at a tier gated by total victories.
  const BRANCHES = { Infantry: 'infantry', Armor: 'armor', Artillery: 'artillery' };
  const BRANCH_NAMES = { infantry: 'Infantry', armor: 'Armor', artillery: 'Artillery' };
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
        transport: {
          name: 'Naval Transports',
          values: [1, 2],
          tiers: [1, 2],
          costs: [50, 140],
          text: v => `+${v} movement for embarked units at sea`,
        },
        landing: {
          name: 'Landing Craft',
          values: [0.25],
          tiers: [2],
          costs: [120],
          text: () => 'Embarked units take 25% extra damage instead of 50%',
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
          req: ['transport', 1],
          text: v => (v === 1 ? 'Armor units ignore terrain movement costs' : '+1 movement for every unit'),
        },
        // First-pass price. Rival powers gain it by turn instead (FLEIJA.aiTurn).
        fleija: {
          name: 'F.L.E.I.J.A.',
          values: [1],
          tiers: [4],
          costs: [500],
          req: ['blaze', 1],
          text: () => 'Cities with a level-3 research lab can build F.L.E.I.J.A. warheads',
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
  // Flat index: 'armor.guns' → node, with its branch and id.
  const TECH_NODES = Object.fromEntries(
    Object.entries(TECH_TREE).flatMap(([b, tree]) =>
      Object.entries(tree.nodes).map(([k, n]) => [
        `${b}.${k}`,
        { ...n, id: `${b}.${k}`, branch: b, max: n.values.length },
      ]),
    ),
  );
  function branchOf(type) {
    return BRANCHES[TYPES[type].branch];
  }
  function techLevel(g, side, id) {
    return g?.tech?.[side]?.[id] || 0;
  }
  function techValue(g, side, id) {
    const l = techLevel(g, side, id);
    return l ? TECH_NODES[id].values[l - 1] : 0;
  }
  // Branch-wide tech for a unit, e.g. unitTech(g, u, 'guns') reads 'armor.guns' for a Sutherland.
  function unitTech(g, u, k) {
    return techValue(g, u.side, `${branchOf(u.type)}.${k}`);
  }

  // ======== Commander development, as in WC4 ========
  const RANKS = [
    'Second Lieutenant',
    'First Lieutenant',
    'Captain',
    'Major',
    'Lieutenant Colonel',
    'Colonel',
    'Brigadier General',
    'Major General',
    'Lieutenant General',
    'General',
    'Marshal',
  ];
  const RANK_HP = [1.12, 1.16, 1.2, 1.24, 1.28, 1.33, 1.38, 1.43, 1.48, 1.54, 1.6];
  // Tokens to reach each rank.
  const PROMOTE_COST = [0, 50, 80, 120, 160, 220, 280, 350, 430, 520, 650];
  const MEDALS = {
    valor: { name: 'Order of Valor', desc: '+8% damage.', earn: 'Destroy a unit led by an enemy commander.' },
    laurel: { name: 'Golden Laurel', desc: '8% less damage taken.', earn: 'Win a conquest on Hard or Challenge.' },
    star: { name: "Conqueror's Star", desc: '+1 movement.', earn: 'Capture an enemy capital.' },
    marksman: {
      name: 'Marksman Ribbon',
      desc: '+8% critical chance.',
      earn: 'One commander destroys 5 units in a single operation.',
    },
    campaign: { name: 'Campaign Ribbon', desc: '+4% damage and 4% less damage taken.', earn: 'Win any operation.' },
  };
  // Starting branch ratings (stars, up to 6 with command tokens): Infantry, Armor, Artillery.
  const RATINGS = {
    suzaku: { infantry: 4, armor: 5, artillery: 3 },
    cornelia: { infantry: 4, armor: 5, artillery: 4 },
    bismarck: { infantry: 4, armor: 5, artillery: 4 },
    julius: { infantry: 3, armor: 5, artillery: 5 },
    schneizel: { infantry: 3, armor: 4, artillery: 5 },
    gino: { infantry: 5, armor: 4, artillery: 3 },
    anya: { infantry: 3, armor: 3, artillery: 5 },
    luciano: { infantry: 4, armor: 5, artillery: 2 },
    jeremiah: { infantry: 4, armor: 5, artillery: 3 },
    shin: { infantry: 4, armor: 5, artillery: 3 },
    rolo: { infantry: 5, armor: 3, artillery: 2 },
    guilford: { infantry: 4, armor: 4, artillery: 3 },
    darlton: { infantry: 4, armor: 4, artillery: 3 },
    ashley: { infantry: 4, armor: 4, artillery: 3 },
    leila: { infantry: 3, armor: 4, artillery: 5 },
    akito: { infantry: 5, armor: 4, artillery: 3 },
    ryo: { infantry: 4, armor: 4, artillery: 3 },
    ayano: { infantry: 5, armor: 3, artillery: 3 },
    yukiya: { infantry: 3, armor: 3, artillery: 5 },
    oscar: { infantry: 3, armor: 4, artillery: 3 },
    klaus: { infantry: 4, armor: 3, artillery: 3 },
    anna: { infantry: 3, armor: 3, artillery: 4 },
    smilas: { infantry: 3, armor: 4, artillery: 4 },
    fernando: { infantry: 4, armor: 3, artillery: 3 },
    marirrosa: { infantry: 3, armor: 3, artillery: 5 },
    xingke: { infantry: 4, armor: 5, artillery: 4 },
    xianglin: { infantry: 5, armor: 3, artillery: 4 },
    honggu: { infantry: 3, armor: 3, artillery: 4 },
    cao: { infantry: 4, armor: 3, artillery: 3 },
    gaohai: { infantry: 3, armor: 3, artillery: 3 },
    zhaohao: { infantry: 3, armor: 4, artillery: 2 },
    leifeng: { infantry: 4, armor: 5, artillery: 3 },
    meiling: { infantry: 3, armor: 4, artillery: 3 },
    lifeng: { infantry: 5, armor: 3, artillery: 2 },
    rakshata: { infantry: 3, armor: 3, artillery: 5 },
  };
  // Two kinds of commander. Scenario commanders come with the operation, sit on their units with fixed stats
  // (g.officers) and are never upgraded. Your commanders (profile.roster) are bought once, upgraded in HQ, kept
  // between operations and assignable in any operation, even beside the scenario's own version (u.personal).
  const STARTERS = { britannia: ['suzaku', 'cornelia'], eu: ['leila', 'akito'], cf: ['xingke', 'xianglin'] };
  function fx(u) {
    return (u?.cmd && COMMANDERS[u.cmd]?.fx) || NOFX;
  }
  function recruitPrice(k) {
    const a = COMMANDERS[k];
    return a?.recruit ?? (a?.stars >= 5 ? 400 : a?.stars >= 4 ? 300 : 200);
  }
  function defaultOfficer(k) {
    return { rank: COMMANDERS[k].stars >= 5 ? 1 : 0, ratings: { ...RATINGS[k] }, medals: [] };
  }
  function cleanOfficer(k, rec) {
    const base = defaultOfficer(k);
    if (!rec) return base;
    return {
      rank: clamp(Number.isInteger(rec.rank) ? rec.rank : base.rank, 0, RANKS.length - 1),
      ratings: Object.fromEntries(
        Object.keys(base.ratings).map(b => [b, clamp((rec.ratings?.[b] ?? base.ratings[b]) | 0, 1, MAX_RATING)]),
      ),
      medals: (rec.medals || []).filter(m => MEDALS[m]),
    };
  }
  // The persistent roster, created on first use: the two starters per faction.
  function roster(profile) {
    if (!profile.roster) {
      profile.roster = {};
      for (const k of Object.values(STARTERS).flat()) profile.roster[k] = defaultOfficer(k);
    }
    return profile.roster;
  }
  function owns(profile, k) {
    return !!roster(profile)[k];
  }
  function officer(g, k) {
    if (!k || !COMMANDERS[k]) return null;
    g.officers ||= {};
    return (g.officers[k] ||= defaultOfficer(k));
  }
  // The record behind a unit's commander: your commander for personal units, the scenario commander otherwise.
  function officerOf(g, u) {
    if (!u?.cmd) return null;
    return (u.personal && g.roster?.[u.cmd]) || officer(g, u.cmd);
  }
  function wears(g, u, medal) {
    return !!officerOf(g, u)?.medals?.includes(medal);
  }
  function medalSlots(o) {
    return 1 + Math.floor(o.rank / 4);
  }
  // Damage dealt and taken by a commander's unit: branch rating and medals.
  function officerAttack(g, u) {
    if (!u.cmd) return 1;
    const o = officerOf(g, u);
    return (
      (1 + 0.04 * ((o.ratings[branchOf(u.type)] || 3) - 3)) *
      (wears(g, u, 'valor') ? 1.08 : 1) *
      (wears(g, u, 'campaign') ? 1.04 : 1)
    );
  }
  function officerDefense(g, u) {
    if (!u.cmd) return 1;
    const o = officerOf(g, u);
    return Math.max(
      0.5,
      (1 - 0.03 * ((o.ratings[branchOf(u.type)] || 3) - 3)) *
        (wears(g, u, 'laurel') ? 0.92 : 1) *
        (wears(g, u, 'campaign') ? 0.96 : 1),
    );
  }
  function auraRange(a) {
    return fx(a).aura?.range || 1;
  }
  // Lowest morale a unit can be pushed to: steady for commanders with a floor; Fernando's calm stops confusion.
  function moraleFloor(g, v) {
    if (fx(v).floor != null) return fx(v).floor;
    return g.units.some(m => m.hp > 0 && m.side === v.side && fx(m).calm && dist(g, m, v) <= 1) ? -1 : -3;
  }
  // ---- HQ commanders: every action below works on the profile, outside or inside an operation ----
  function tokenShort(profile, cost) {
    const have = profile?.tokens || 0;
    return cost > have ? `Need ${cost - have} more command tokens` : null;
  }
  function recruitReason(profile, k) {
    if (!COMMANDERS[k]) return 'Unknown commander';
    if (owns(profile, k)) return 'Already one of your commanders';
    return tokenShort(profile, recruitPrice(k));
  }
  function recruitCommander(profile, k) {
    const why = recruitReason(profile, k);
    if (why) return { ok: false, reason: why };
    profile.tokens -= recruitPrice(k);
    roster(profile)[k] = defaultOfficer(k);
    return { ok: true };
  }
  function ownedReason(profile, k) {
    if (!COMMANDERS[k]) return 'Unknown commander';
    return owns(profile, k) ? null : `Recruit for ${recruitPrice(k)} command tokens first`;
  }
  function promoteCost(o) {
    return PROMOTE_COST[o.rank + 1] ?? Infinity;
  }
  function promoteReason(profile, k) {
    const why = ownedReason(profile, k);
    if (why) return why;
    const o = roster(profile)[k];
    return o.rank >= RANKS.length - 1 ? 'Highest rank reached' : tokenShort(profile, promoteCost(o));
  }
  function promote(profile, k) {
    const why = promoteReason(profile, k);
    if (why) return { ok: false, reason: why };
    const o = roster(profile)[k];
    profile.tokens -= promoteCost(o);
    o.rank++;
    return { ok: true, rank: o.rank };
  }
  // As in WC4, command tokens (the medals of this game) buy extra branch stars, up to six.
  const MAX_RATING = 6;
  const STAR_COST = [0, 0, 0, 60, 120, 220, 360];
  function starCost(profile, k, branch) {
    const o = roster(profile)[k] || defaultOfficer(k);
    return STAR_COST[(o.ratings[branch] || 0) + 1] ?? Infinity;
  }
  function starReason(profile, k, branch) {
    if (!BRANCH_NAMES[branch]) return 'Unknown branch';
    const why = ownedReason(profile, k);
    if (why) return why;
    return (roster(profile)[k].ratings[branch] || 0) >= MAX_RATING
      ? `Already ${MAX_RATING} stars`
      : tokenShort(profile, starCost(profile, k, branch));
  }
  function buyStar(profile, k, branch) {
    const why = starReason(profile, k, branch);
    if (why) return { ok: false, reason: why };
    profile.tokens -= starCost(profile, k, branch);
    const o = roster(profile)[k];
    o.ratings[branch]++;
    return { ok: true, stars: o.ratings[branch] };
  }
  function equipReason(profile, k, medal) {
    const why = ownedReason(profile, k);
    if (why) return why;
    const o = roster(profile)[k];
    return (
      (!(profile.medals || []).includes(medal) ? 'Not in your medal case' : null) ||
      (o.medals.includes(medal) ? 'Already wearing this medal' : null) ||
      (o.medals.length >= medalSlots(o) ? `All ${medalSlots(o)} medal slots in use` : null)
    );
  }
  function equipMedal(profile, k, medal) {
    const why = equipReason(profile, k, medal);
    if (why) return { ok: false, reason: why };
    profile.medals.splice(profile.medals.indexOf(medal), 1);
    roster(profile)[k].medals.push(medal);
    return { ok: true };
  }
  function unequipMedal(profile, k, medal) {
    const why = ownedReason(profile, k);
    if (why) return { ok: false, reason: why };
    const o = roster(profile)[k],
      i = o.medals.indexOf(medal);
    if (i < 0) return { ok: false, reason: 'Not wearing that medal' };
    o.medals.splice(i, 1);
    (profile.medals ||= []).push(medal);
    return { ok: true };
  }
  function award(g, side, id, reason) {
    if (side !== g.player || !MEDALS[id]) return;
    (g.medalInventory ||= []).push(id);
    (g.medalsEarned ||= []).push({ id, reason, turn: g.turn });
    log(g, `${MEDALS[id].name} awarded: ${reason}.`, side);
  }

  // ======== Reasons an order is unavailable (null when it is allowed) ========
  function shortfall(e, cost) {
    const need = [
      ['credits', 'credits'],
      ['industry', 'industry'],
      ['science', 'research'],
      ['sakuradite', 'Sakuradite'],
    ]
      .filter(([k]) => (cost[k] || 0) > (e?.[k] || 0))
      .map(([k, label]) => `${Math.ceil(cost[k] - (e?.[k] || 0))} more ${label}`);
    return need.length ? 'Need ' + need.join(' and ') : null;
  }
  function turnReason(g, side) {
    return g.over ? 'Operation over' : g.phase !== side ? 'Not your turn' : null;
  }
  function actedReason(u) {
    return u.morale <= -3
      ? 'Unit is confused'
      : u.attacked
        ? 'Already fired'
        : u.moved
          ? 'Already moved this turn'
          : null;
  }
  function nearFriendlyCity(g, u) {
    return g.stations.some(s => s.owner === u.side && dist(g, s, u) <= 1);
  }
  function repairReason(g, u) {
    if (!u) return 'Select a unit';
    return (
      turnReason(g, u.side) ||
      actedReason(u) ||
      (atSea(g, u) ? 'Embarked at sea' : null) ||
      (u.hp >= maxHP(u) ? 'Frame already intact' : null) ||
      (!nearFriendlyCity(g, u) ? 'No friendly city nearby' : null) ||
      shortfall(funds(g, u.side), { credits: repairCost(u, g) })
    );
  }
  function reinforceReason(g, u) {
    if (!u) return 'Select a unit';
    return (
      turnReason(g, u.side) ||
      (u.stack >= 3 ? 'Already at 3 frames' : null) ||
      actedReason(u) ||
      (atSea(g, u) ? 'Embarked at sea' : null) ||
      (!nearFriendlyCity(g, u) ? 'No friendly city nearby' : null) ||
      shortfall(funds(g, u.side), reinforceCost(u.type, g, u.side))
    );
  }
  function buyReason(g, s, type, stack = 1) {
    const t = TYPES[type];
    if (!t || !s) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (t.side !== s.owner ? 'Not built by this faction' : null) ||
      cityBusyReason(g, s) ||
      (s.tier < t.tier ? `Requires factory level ${t.tier}` : null) ||
      (!Number.isInteger(stack) || stack < 1 || stack > 3 ? 'Choose 1–3 frames' : null) ||
      (s.producedTurn === g.turn ? 'Already built here this turn' : null) ||
      (!recruitOptions(g, s, s.owner).length ? 'No free land hex next to the city' : null) ||
      shortfall(funds(g, s.owner), price(type, stack, g, s.owner))
    );
  }
  function buildReason(g, s, kind) {
    if (!s || !BUILDINGS[kind]) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (buildingLevel(s, kind) >= 3 ? 'Maximum level' : null) ||
      (kind === 'refinery' && !depositOf(g, s) ? 'No Sakuradite deposit here' : null) ||
      cityBusyReason(g, s) ||
      shortfall(funds(g, s.owner), buildCost(s, kind))
    );
  }
  // HQ research works on the persistent profile: { tokens, wins, research: { 'armor.guns': 2, ... } }.
  function researchReason(profile, id) {
    const n = TECH_NODES[id];
    if (!n) return 'Unavailable';
    const research = profile?.research || {},
      l = research[id] || 0;
    if (l >= n.max) return 'Fully researched';
    const tier = n.tiers[l],
      wins = profile?.wins || 0;
    if (wins < TECH_TIERS[tier])
      return `Tier ${tier}: win ${TECH_TIERS[tier] - wins} more operation${TECH_TIERS[tier] - wins > 1 ? 's' : ''}`;
    if (n.req) {
      const [k, need] = n.req,
        rid = `${n.branch}.${k}`;
      if ((research[rid] || 0) < need) return `Requires ${TECH_NODES[rid].name} ${ROMAN[need]}`;
    }
    const cost = researchCost(id, l),
      have = profile?.tokens || 0;
    return cost > have ? `Need ${cost - have} more command tokens` : null;
  }
  // Only your own commanders can be assigned; the operation's commanders stay on the units they came with.
  function assignReason(g, u, k) {
    const a = COMMANDERS[k];
    if (!a) return 'Unknown commander';
    if (!g.roster?.[k]) return `Not one of your commanders: recruit in HQ for ${recruitPrice(k)} command tokens`;
    const busy = g.units.find(v => v.hp > 0 && v.personal && v.cmd === k);
    if (busy) return `Commanding ${TYPES[busy.type].short}`;
    if (!u) return 'Select one of your units first';
    return (
      turnReason(g, u.side) ||
      (a.side !== u.side ? 'Serves another faction' : null) ||
      (u.cmd ? 'Unit already has a commander' : null) ||
      shortfall(funds(g, u.side), { credits: a.cost })
    );
  }
  function feintReason(g, u) {
    const action = COMMANDERS[u?.cmd]?.action;
    if (!u || !action) return 'Only Julius, Leila and Xianglin have a command action';
    return (
      turnReason(g, u.side) ||
      (u.morale <= -3 ? 'Unit is confused' : null) ||
      (u.feintCD > 0 ? `Ready in ${u.feintCD} turn${u.feintCD > 1 ? 's' : ''}` : null) ||
      (!g.units.some(v => v.hp > 0 && v.side !== u.side && dist(g, u, v) <= 2) ? 'No enemy within 2 hexes' : null)
    );
  }
  // Bring the profile into an operation: a copy of your commanders (for assignment and personal units) and research.
  function applyProfile(g, profile = {}) {
    applyRoster(g, profile);
    return applyTech(g, profile?.research);
  }
  // Refresh your commanders inside an operation, e.g. after an HQ promotion; personal units keep their damage.
  function applyRoster(g, profile = {}) {
    g.roster = Object.fromEntries(Object.entries(roster(profile)).map(([k, rec]) => [k, cleanOfficer(k, rec)]));
    for (const u of g.units) {
      if (!u.cmd) continue;
      const old = maxHP(u);
      u.cmdRank = officerOf(g, u).rank;
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    return g;
  }
  // Profiles are edited directly; the game never writes officer records back.
  function exportProfile(g, profile = {}) {
    return { ...profile };
  }
  // Load HQ research into the player's side: frame bonuses keep each unit's damage, city defenses follow.
  function applyTech(g, research = {}) {
    g.tech ||= {};
    g.tech[g.player] = Object.fromEntries(
      Object.entries(research || {})
        .filter(([id, l]) => TECH_NODES[id] && Number.isInteger(l) && l > 0)
        .map(([id, l]) => [id, Math.min(l, TECH_NODES[id].max)]),
    );
    for (const u of g.units) {
      if (u.side !== g.player) continue;
      const old = maxHP(u);
      u.hpTech = unitTech(g, u, 'hull');
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    g.stations.forEach(s => fortify(g, s));
    return g;
  }
  // Fortification research raises the defenses of cities its owner holds.
  function fortify(g, s) {
    const bonus = techValue(g, s.owner, 'cities.fort'),
      old = s.fortBonus || 0;
    if (bonus === old) return;
    s.maxShield += bonus - old;
    s.shield = clamp(s.shield + Math.max(0, bonus - old), 0, s.maxShield);
    s.fortBonus = bonus;
  }
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
  function researchCost(id, level = 0) {
    return TECH_NODES[id]?.costs[level] ?? Infinity;
  }
  function research(profile, id) {
    const why = researchReason(profile, id);
    if (why) return { ok: false, reason: why };
    const l = profile.research?.[id] || 0;
    profile.tokens -= researchCost(id, l);
    (profile.research ||= {})[id] = l + 1;
    return { ok: true, level: l + 1 };
  }
  // Command tokens are paid only for the first victory at each difficulty (Hard ×1.5, Challenge ×2); the first
  // victory ever earns a bonus. Banked research converts 5 : 1, up to 300 tokens.
  const TOKEN_REWARD = { victory: 250, conquest: 150, first: 150, research: 5, researchCap: 300 };
  function operationKey(g) {
    return `conquest:${g.era || 'world'}:${DIFFICULTIES[g.difficulty] ? g.difficulty : 'normal'}`;
  }
  function missionReward(g, wins = 0, cleared = {}) {
    if (!g.over || g.over.winner !== g.player) return { total: 0, parts: [] };
    if (cleared[operationKey(g)]) return { total: 0, parts: [], repeat: true };
    const parts = [
      ['Victory', TOKEN_REWARD.victory],
      ['World conquest', TOKEN_REWARD.conquest],
    ];
    const banked = Math.min(
      TOKEN_REWARD.researchCap,
      Math.floor((funds(g, g.player)?.science || 0) / TOKEN_REWARD.research),
    );
    if (banked) parts.push(['Banked research', banked]);
    const scale = DIFFICULTIES[g.difficulty]?.tokens || 1;
    if (scale !== 1) parts.push([`${DIFFICULTIES[g.difficulty].name} ×${scale}`, 0]);
    let total = Math.round(parts.reduce((a, [, v]) => a + v, 0) * scale);
    if (!wins) {
      parts.push(['First victory', TOKEN_REWARD.first]);
      total += TOKEN_REWARD.first;
    }
    return { total, parts };
  }

  // ======== Hex geometry: odd-r offset rows; world maps wrap east to west ========
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1],
  ];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const axial = p => ({ q: p.c - Math.floor(p.r / 2), r: p.r });
  function hexDistance(a, b) {
    a = axial(a);
    b = axial(b);
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  }
  // Pass g for wrapped maps: the shortest way round the world counts.
  function distance(a, b, g = null) {
    const d = hexDistance(a, b);
    if (!g?.wrap) return d;
    const W = g.cols;
    return Math.min(d, hexDistance(a, { c: b.c + W, r: b.r }), hexDistance(a, { c: b.c - W, r: b.r }));
  }
  const dist = (g, a, b) => distance(a, b, g);
  const key = p => p.c + ',' + p.r;
  function tile(g, c, r) {
    if (r < 0 || r >= g.rows) return null;
    if (g.wrap) c = ((c % g.cols) + g.cols) % g.cols;
    else if (c < 0 || c >= g.cols) return null;
    return g.tiles[r * g.cols + c] || null;
  }
  function adjacent(g, p) {
    const a = axial(p);
    return DIRS.map(d => {
      const r = a.r + d[1],
        c = a.q + d[0] + Math.floor(r / 2);
      return tile(g, c, r);
    }).filter(Boolean);
  }
  // Every tile within n hexes of p (including p).
  function within(g, p, n) {
    const out = [],
      a = axial(p);
    for (let dq = -n; dq <= n; dq++)
      for (let dr = Math.max(-n, -dq - n); dr <= Math.min(n, -dq + n); dr++) {
        const r = a.r + dr,
          c = a.q + dq + Math.floor(r / 2),
          t = tile(g, c, r);
        if (t) out.push(t);
      }
    return out;
  }
  // Occupancy indexes: rebuilt when the unit list grows or a stale entry is found; move() keeps them current.
  const unitIndex = new WeakMap(),
    cityIndex = new WeakMap();
  function indexUnits(g) {
    const m = new Map();
    for (const u of g.units) if (u.hp > 0) m.set(key(u), u);
    const idx = { len: g.units.length, map: m };
    unitIndex.set(g.units, idx);
    return idx;
  }
  function unitAt(g, p) {
    let idx = unitIndex.get(g.units);
    if (!idx || idx.len !== g.units.length) idx = indexUnits(g);
    const k = key(p);
    let u = idx.map.get(k);
    if (u && (u.hp <= 0 || u.c !== p.c || u.r !== p.r)) u = indexUnits(g).map.get(k);
    return u || null;
  }
  function reindex(g, u, from) {
    const idx = unitIndex.get(g.units);
    if (!idx) return;
    if (from && idx.map.get(key(from)) === u) idx.map.delete(key(from));
    if (u.hp > 0) idx.map.set(key(u), u);
  }
  function stationAt(g, p) {
    let idx = cityIndex.get(g.stations);
    if (!idx || idx.len !== g.stations.length) {
      idx = { len: g.stations.length, map: new Map(g.stations.map(s => [key(s), s])) };
      cityIndex.set(g.stations, idx);
    }
    return idx.map.get(key(p)) || null;
  }
  function random(g) {
    g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
    return g.seed / 4294967296;
  }
  function log(g, text, side) {
    g.log.unshift({ turn: g.turn, text, side: side || g.phase });
    g.log = g.log.slice(0, 40);
  }
  function funds(g, side) {
    return g.economy[side];
  }
  function alive(g, side) {
    return MAJORS.includes(side) && !g.fallen?.[side];
  }

  // ======== Terrain ========
  const TERRAIN = {
    sea: { name: 'Ocean', desc: 'Units embark as transports: they cannot attack and take 50% extra damage.' },
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
    crater: {
      name: 'F.L.E.I.J.A. crater',
      cost: 2,
      desc: 'Movement cost 2. A F.L.E.I.J.A. warhead erased everything here and glassed the ground pink and white.',
    },
  };
  const TERRAIN_CODES = { '.': 'sea', p: 'plains', f: 'forest', m: 'mountain', d: 'desert', s: 'snow', x: 'peak' };
  const SEA_MOVE = 5;
  const isSea = t => t?.terrain === 'sea';
  function atSea(g, u) {
    return isSea(tile(g, u.c, u.r));
  }
  // Embarked units take extra damage; Landing Craft halves the penalty.
  function seaPenalty(g, side) {
    return techLevel(g, side, 'sakura.landing') ? 0.25 : 0.5;
  }
  function seaMove(g, u) {
    return SEA_MOVE + techValue(g, u.side, 'sakura.transport');
  }

  // An admiral's rank sets the frame bonus of the unit they command (112% for a Second Lieutenant to 160%).
  function maxHP(u) {
    return Math.round(
      TYPES[u.type].hp *
        (1 + 0.7 * (u.stack - 1)) *
        (u.cmdRank == null ? 1 : RANK_HP[u.cmdRank] || 1) *
        (1 + (u.hpTech || 0)),
    );
  }
  // Version 2 added Sakuradite; version 1 saves are upgraded (see upgradeSave), older ones are not carried forward.
  const RULES_VERSION = 2;
  function migrateSave(g) {
    if (!g || g.game !== 'knightmare' || !Array.isArray(g.units)) return null;
    if (g.rulesVersion === 1 && Array.isArray(g.stations) && Array.isArray(g.tiles)) upgradeSave(g);
    if (g.rulesVersion !== RULES_VERSION) return null;
    return g.units.every(u => TYPES[u.type]) ? g : null;
  }
  function newUnit(g, type, side, c, r, stack = 1, cmd = null, ready = true) {
    const u = {
      id: g.nextId++,
      type,
      side,
      c,
      r,
      stack,
      hp: 0,
      morale: 0,
      moved: !ready,
      attacked: !ready,
      cmd,
      kills: 0,
      chain: 0,
      xp: 0,
      feintCD: 0,
    };
    u.hpTech = unitTech(g, u, 'hull');
    u.hp = maxHP(u);
    g.units.push(u);
    return u;
  }
  function movement(g, u) {
    const t = TYPES[u.type],
      f = fx(u);
    let n = t.move + unitTech(g, u, 'drives');
    n += wears(g, u, 'star') ? 1 : 0;
    n += f.move || 0;
    n += techLevel(g, u.side, 'sakura.float') >= 2 ? 1 : 0;
    return n;
  }
  function terrainCost(g, u, t) {
    if (isSea(t)) return 1;
    const type = TYPES[u.type];
    if (fx(u).ignoreTerrain || type.float) return 1;
    if (type.branch === 'Armor' && techLevel(g, u.side, 'sakura.float') >= 1) return 1;
    const nav = type.branch === 'Infantry' ? techLevel(g, u.side, 'infantry.nav') : 0;
    if (nav >= 2 || (nav >= 1 && (t.terrain === 'forest' || t.terrain === 'mountain'))) return 1;
    return TERRAIN[t.terrain]?.cost || 1;
  }
  function canCapture(u) {
    return TYPES[u.type].branch !== 'Artillery';
  }
  function isReady(g, u) {
    return !g.over && g.phase === u.side && u.hp > 0 && u.morale > -3;
  }
  // Movement: a Dijkstra search. Land units may embark onto an adjacent sea hex (which ends the move); embarked
  // units sail up to their sea movement and may land on a coast hex (which ends the move).
  function reachable(g, u) {
    const found = new Map();
    if (!isReady(g, u) || u.moved || u.attacked) return found;
    const start = tile(g, u.c, u.r),
      fromSea = isSea(start),
      budget = fromSea ? seaMove(g, u) : movement(g, u),
      costs = new Map([[key(start), 0]]),
      queue = [{ p: start, cost: 0 }];
    while (queue.length) {
      let best = 0;
      for (let i = 1; i < queue.length; i++) if (queue[i].cost < queue[best].cost) best = i;
      const { p, cost } = queue.splice(best, 1)[0];
      if (cost > costs.get(key(p))) continue;
      for (const n of adjacent(g, p)) {
        if (TERRAIN[n.terrain]?.blocked) continue;
        const occ = unitAt(g, n),
          st = stationAt(g, n);
        if (occ && occ.side !== u.side) continue;
        if (st && st.owner !== u.side && (st.shield > 0 || !canCapture(u))) continue;
        const cross = isSea(n) !== fromSea;
        // Embarking or landing takes the rest of the turn: allowed whenever any movement is left.
        const nc = cross ? budget : cost + terrainCost(g, u, n);
        if (nc > budget || (cross && cost >= budget) || nc >= (costs.get(key(n)) ?? Infinity)) continue;
        costs.set(key(n), nc);
        if (!cross) queue.push({ p: n, cost: nc });
        if (!occ && key(n) !== key(start)) found.set(key(n), nc);
      }
    }
    return found;
  }
  // Fire Control II adds one hex of range to all Artillery.
  function rangeOf(g, u) {
    const t = TYPES[u.type];
    return {
      min: t.min,
      max: t.max + (g && t.branch === 'Artillery' && techLevel(g, u.side, 'artillery.fire') >= 2 ? 1 : 0),
    };
  }
  function inRange(a, p, g) {
    const { min, max } = rangeOf(g, a),
      d = dist(g, a, p);
    return d >= min && d <= max;
  }
  function hostileTarget(g, u, p) {
    const target = unitAt(g, p),
      st = stationAt(g, p);
    if (target) return target.side !== u.side;
    return !!st && st.owner !== u.side && st.shield > 0;
  }
  // Whether a unit still has any order besides holding position: firing, moving, repairing, reinforcing or an action.
  function hasOrders(g, u) {
    if (!u || !isReady(g, u)) return false;
    if (!u.attacked && targets(g, u).length) return true;
    if (!u.moved && reachable(g, u).size) return true;
    if (!repairReason(g, u) || !reinforceReason(g, u)) return true;
    return !!COMMANDERS[u.cmd]?.action && !feintReason(g, u);
  }
  // Embarked units cannot fire.
  function targets(g, u) {
    if (atSea(g, u)) return [];
    return within(g, u, rangeOf(g, u).max).filter(p => inRange(u, p, g) && hostileTarget(g, u, p));
  }
  function claim(g, p, owner) {
    for (const t of [tile(g, p.c, p.r), ...adjacent(g, p)]) if (!isSea(t) && !TERRAIN[t.terrain]?.blocked) t.owner = owner;
  }
  function move(g, id, c, r) {
    const u = g.units.find(u => u.id === id);
    if (!u) return { ok: false, reason: 'Unit not found.' };
    const dest = tile(g, c, r);
    if (!dest || !reachable(g, u).has(key(dest))) return { ok: false, reason: 'That hex is not reachable this turn.' };
    const from = { c: u.c, r: u.r };
    u.c = dest.c;
    u.r = dest.r;
    u.moved = true;
    reindex(g, u, from);
    if (!isSea(dest)) dest.owner = u.side;
    const s = stationAt(g, u);
    let captured = null,
      annexed = null;
    if (s && s.owner !== u.side && canCapture(u)) {
      const loser = s.owner;
      s.owner = u.side;
      s.shield = 0;
      s.capturedTurn = g.turn;
      dropProject(g, s, 'captured');
      captured = s.name;
      u.morale = 1;
      funds(g, u.side).credits += 40;
      fortify(g, s);
      claim(g, s, u.side);
      if (fx(u).captureHeal) u.hp = Math.min(maxHP(u), u.hp + maxHP(u) * fx(u).captureHeal);
      log(g, `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} captures ${s.name}.`, u.side);
      // As in WC4, a power whose capital falls surrenders: its cities pass to the conqueror, its armies disband.
      if (s.capitalOf && s.capitalOf === loser && alive(g, loser)) {
        award(g, u.side, 'star', `${s.name} captured`);
        annexed = surrender(g, loser, u.side, s);
      }
    }
    const seized = seizeDeposit(g, u, dest);
    checkVictory(g);
    return { ok: true, from, to: { c: dest.c, r: dest.r }, captured, annexed, seized };
  }
  function surrender(g, loser, winner, capital) {
    (g.fallen ||= {})[loser] = { by: winner, turn: g.turn, city: capital.name };
    let cities = 0,
      units = 0;
    for (const s of g.stations)
      if (s.owner === loser) {
        s.owner = winner;
        s.shield = Math.round(s.maxShield * 0.5);
        s.producedTurn = g.turn;
        fortify(g, s);
        cities++;
      }
    for (const t of g.tiles) if (t.owner === loser) t.owner = winner;
    for (const v of g.units)
      if (v.hp > 0 && v.side === loser) {
        v.hp = 0;
        units++;
      }
    const e = funds(g, loser),
      w = funds(g, winner);
    w.credits += Math.round(e.credits / 2);
    w.industry += Math.round(e.industry / 2);
    e.credits = e.industry = 0;
    annexDeposits(g, loser, winner);
    annexStrategic(g, loser);
    log(
      g,
      `${capital.name} has fallen. The ${FACTIONS[loser].name} surrenders to the ${FACTIONS[winner].name}: ${cities} cities annexed, ${units} units disbanded.`,
      winner,
    );
    return { loser, winner, cities, units, capital: capital.name };
  }
  // Command auras: every commander lifts adjacent friends by 8%; some reach farther or further.
  function auraBonus(g, u) {
    let bonus = 0;
    for (const a of g.units) {
      if (a.hp <= 0 || a.side !== u.side || !a.cmd || a.id === u.id) continue;
      if (dist(g, a, u) > auraRange(a)) continue;
      bonus = Math.max(bonus, fx(a).aura?.value || 0.08);
    }
    return bonus;
  }
  function power(g, u, target, st, counter = false) {
    const t = TYPES[u.type],
      victim = target ? TYPES[target.type] : null,
      f = fx(u),
      strike = !counter || !f.attackOnly;
    let attack = t.attack * (1 + 0.45 * (u.stack - 1)) * (1 + 0.07 * Math.min(5, u.xp));
    attack *= u.morale >= 1 ? 1.25 : u.morale === -1 ? 0.75 : u.morale === -2 ? 0.5 : u.morale <= -3 ? 0 : 1;
    attack *= u.hp / maxHP(u) < 0.5 ? 0.72 : 1;
    attack *= 1 + auraBonus(g, u);
    // Faction doctrines.
    if (u.side === 'britannia' && t.branch === 'Armor') attack *= 1.08;
    if (u.side === 'eu' && t.branch === 'Artillery') attack *= 1.1;
    // Commander signature abilities (attacker side).
    if (f.dmg && strike) attack *= 1 + f.dmg;
    if (f.dmgBranch?.[t.branch] && strike) attack *= 1 + f.dmgBranch[t.branch];
    if (f.opening && !counter && !u.moved) attack *= 1 + f.opening;
    if (counter && f.counter) attack *= 1 + f.counter;
    if (f.artist && target)
      attack *=
        1 +
        f.artist *
          Math.min(3, g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && dist(g, v, target) === 1).length);
    if (t.boarding && (target ? victim.branch === 'Armor' : !!st)) attack *= 1.55;
    attack *= officerAttack(g, u);
    // HQ research: branch weapons and class counters.
    attack *= 1 + unitTech(g, u, 'guns');
    if (t.branch === 'Infantry' && victim?.branch === 'Armor') attack *= 1 + techValue(g, u.side, 'infantry.harken');
    if (t.branch === 'Armor' && victim?.branch === 'Infantry') attack *= 1 + techValue(g, u.side, 'armor.secondary');
    if (t.branch === 'Artillery' && victim?.branch === 'Infantry') attack *= 1 + techValue(g, u.side, 'artillery.shells');
    const friends = (side, at, test) =>
      g.units.some(v => v.hp > 0 && v.side === side && v.id !== u.id && dist(g, v, at) === 1 && test(TYPES[v.type]));
    // Lance Formation and Factsphere Fire Control.
    if (t.branch === 'Armor' && techLevel(g, u.side, 'armor.formation') >= 1 && friends(u.side, u, v => v.branch === 'Armor'))
      attack *= 1.15;
    if (
      t.branch === 'Artillery' &&
      target &&
      techLevel(g, u.side, 'artillery.fire') >= 1 &&
      friends(u.side, target, v => v.branch !== 'Artillery')
    )
      attack *= 1.2;
    const pen = clamp(t.pen + (f.pen || 0), 0, 0.95);
    const armor = target ? victim.armor + unitTech(g, target, 'armor') : 35;
    attack *= 100 / (100 + armor * (1 - pen) * 2);
    if (target) {
      const tf = fx(target),
        nearCity = g.stations.some(s => s.owner === target.side && dist(g, s, target) <= 1);
      attack *= officerDefense(g, target);
      if (t.branch === 'Artillery' && victim.branch === 'Armor') attack *= 1 - techValue(g, target.side, 'armor.blaze');
      if (t.cls === 'siege' && victim.branch === 'Armor') attack *= 1 - techValue(g, target.side, 'armor.bulkheads');
      if (nearCity) attack *= 1 - techValue(g, target.side, 'cities.bunkers');
      attack *= 1 - techValue(g, target.side, 'sakura.blaze');
      // Factsphere Screen: Infantry shields neighbouring Artillery.
      if (
        victim.branch === 'Artillery' &&
        techLevel(g, target.side, 'infantry.picket') >= 1 &&
        g.units.some(
          v => v.hp > 0 && v.side === target.side && TYPES[v.type].branch === 'Infantry' && dist(g, v, target) === 1,
        )
      )
        attack *= 0.85;
      // Commander signature abilities (defender side).
      if (tf.taken) attack *= tf.taken;
      if (tf.belowHalf && target.hp / maxHP(target) < 0.5) attack *= tf.belowHalf;
      if (tf.counterTaken && counter) attack *= tf.counterTaken;
      if (tf.cityGuard && nearCity) attack *= tf.cityGuard;
      if (g.units.some(v => v.hp > 0 && v.side === target.side && fx(v).rearguard && dist(g, v, target) <= 1))
        attack *= 0.9;
      const ground = tile(g, target.c, target.r);
      if (isSea(ground)) attack *= 1 + seaPenalty(g, target.side);
      else attack *= 1 - (TERRAIN[ground.terrain]?.cover || 0);
    }
    if (counter) attack *= t.branch === 'Infantry' && techLevel(g, u.side, 'infantry.picket') >= 2 ? 1 : 0.65;
    return Math.max(1, Math.round(attack));
  }
  function preview(g, id, c, r) {
    const a = g.units.find(u => u.id === id),
      p = tile(g, c, r);
    if (!a || !p || atSea(g, a) || !hostileTarget(g, a, p) || !inRange(a, p, g)) return null;
    const t = TYPES[a.type],
      f = fx(a),
      d = unitAt(g, p),
      s = stationAt(g, p);
    const base = power(g, a, d, s),
      shield = s && s.owner !== a.side && s.shield > 0;
    const unitDmg = d ? Math.round(base * (shield ? 0.55 : 1)) : 0;
    // Chaos Mines and city-breaker commanders raise damage to city defenses.
    const raid = (1 + (t.branch === 'Infantry' ? techValue(g, a.side, 'infantry.mines') : 0)) * (1 + (f.vsCity || 0));
    const shieldDmg = shield
      ? Math.round(
          base *
            (t.boarding && d && TYPES[d.type].branch !== 'Armor' ? 1.55 : 1) *
            (t.siege || 1) *
            (d ? 0.8 : 1.45) *
            raid,
        )
      : 0;
    const counter =
      !!d && !t.noCounter && d.morale > -3 && !atSea(g, d) && inRange(d, a, g) && hostileTarget(g, d, a);
    const crit = clamp(
      t.crit + (f.crit || 0) + (wears(g, a, 'marksman') ? 0.08 : 0) + techValue(g, a.side, 'sakura.varis'),
      0,
      0.85,
    );
    return {
      unit: unitDmg,
      shield: shieldDmg,
      counter: counter ? power(g, d, a, stationAt(g, a), true) : 0,
      counterAllowed: counter,
      crit,
      critMult: (t.critMult || 1.55) + (f.critBonus || 0),
      splash: t.splash ? t.splash + techValue(g, a.side, 'artillery.salvo') : 0,
      armorPen: clamp(t.pen + (f.pen || 0), 0, 0.95),
    };
  }
  function kill(g, v, attacker) {
    if (v.hp > 0) return;
    v.hp = 0;
    if (attacker) {
      if (attacker.cmd) {
        const k = attacker.cmd,
          tally = (g.missionKills ||= {});
        tally[k] = (tally[k] || 0) + 1;
        if (v.cmd) award(g, attacker.side, 'valor', `${COMMANDERS[k].short} defeated ${COMMANDERS[v.cmd].short}`);
        if (tally[k] === 5) award(g, attacker.side, 'marksman', `${COMMANDERS[k].short} destroyed 5 units`);
      }
      attacker.kills++;
      attacker.xp = Math.min(5, attacker.xp + 1);
      attacker.morale = clamp(attacker.morale + 1, -3, 1);
    }
    if (v.cmd) log(g, `${COMMANDERS[v.cmd].short}'s unit is lost.`, v.side);
  }
  function attack(g, id, c, r) {
    const a = g.units.find(u => u.id === id);
    if (!a) return { ok: false, reason: 'Unit not found.' };
    const why =
      turnReason(g, a.side) ||
      (a.hp <= 0 ? 'Unit destroyed' : a.morale <= -3 ? 'Unit is confused' : a.attacked ? 'Already fired' : null);
    if (why) return { ok: false, reason: why };
    const pr = preview(g, id, c, r);
    if (!pr) return { ok: false, reason: atSea(g, a) ? 'Embarked units cannot fire.' : 'No hostile target in range.' };
    const p = tile(g, c, r),
      d = unitAt(g, p),
      s = stationAt(g, p),
      f = fx(a),
      crit = random(g) < pr.crit,
      mult = (0.92 + random(g) * 0.16) * (crit ? pr.critMult : 1),
      hit = [];
    a.attacked = true;
    a.moved = true;
    let dmg = 0,
      sd = 0;
    if (d) {
      dmg = Math.round(pr.unit * mult);
      d.hp = Math.max(0, d.hp - dmg);
      hit.push({ id: d.id, c: p.c, r: p.r, damage: dmg });
    }
    if (s && pr.shield) {
      sd = Math.min(s.shield, Math.round(pr.shield * mult));
      s.shield -= sd;
    }
    if (f.terror && d && d.hp > 0) d.morale = Math.max(moraleFloor(g, d), d.morale - 1);
    let retaliation = 0;
    if (d && d.hp > 0 && pr.counterAllowed) {
      retaliation = Math.round(pr.counter * (0.94 + random(g) * 0.12));
      a.hp = Math.max(0, a.hp - retaliation);
      if (f.reflect) d.hp = Math.max(0, d.hp - Math.round(retaliation * f.reflect));
      kill(g, a, d);
    }
    if (pr.splash) {
      for (const v of g.units) {
        if (v.hp <= 0 || v.side === a.side || v.id === d?.id || dist(g, v, p) !== 1) continue;
        const amount = Math.round(power(g, a, v, stationAt(g, v)) * pr.splash);
        v.hp = Math.max(0, v.hp - amount);
        v.morale = Math.max(moraleFloor(g, v), v.morale - 1);
        hit.push({ id: v.id, c: v.c, r: v.r, damage: amount });
        kill(g, v, a);
      }
    }
    const destroyed = !!d && d.hp <= 0;
    if (destroyed) kill(g, d, a);
    let cap = f.refire ? 2 : 1;
    // Breakthrough Doctrine: a kill at the cap may still earn one more breakthrough.
    if (destroyed && a.hp > 0 && TYPES[a.type].breakthrough && a.chain === cap) {
      const chance = techValue(g, a.side, 'armor.assault');
      if (chance && random(g) < chance) cap++;
    }
    let breakthrough = false;
    if (destroyed && a.hp > 0 && TYPES[a.type].breakthrough && a.chain < cap) {
      // Breakthrough: a kill lets the frame fire again. Line and mainline frames get no extra movement; heavy
      // and super-heavy frames also regain movement on their first kill.
      a.chain++;
      a.attacked = false;
      if (TYPES[a.type].relentless) a.moved = false;
      breakthrough = true;
    } else if (destroyed && a.hp > 0 && TYPES[a.type].relentless) {
      // Heavy and super-heavy frames always fire again after a kill, beyond the breakthrough cap.
      a.attacked = false;
      breakthrough = true;
    }
    log(
      g,
      `${COMMANDERS[a.cmd]?.short || TYPES[a.type].short}: ${crit ? 'critical hit · ' : ''}${dmg ? dmg + ' frame damage' : ''}${sd ? (dmg ? ' + ' : '') + sd + ' city damage' : ''}${destroyed ? ' · enemy destroyed' : ''}${breakthrough ? ' · breakthrough' : ''}${retaliation ? ' · ' + retaliation + ' counter-fire' : ''}.`,
      a.side,
    );
    checkVictory(g);
    return {
      ok: true,
      from: { c: a.c, r: a.r },
      to: { c: p.c, r: p.r },
      damage: dmg,
      shieldDamage: sd,
      crit,
      counter: retaliation,
      hit,
      destroyed,
      breakthrough,
    };
  }

  // ======== Economy and cities ========
  function income(g, side) {
    const refining = 1 + techValue(g, side, 'cities.refining');
    const total = g.stations
      .filter(s => s.owner === side && !devastated(g, s))
      .reduce(
        (a, s) => ({
          credits: a.credits + s.income,
          industry: a.industry + s.industry,
          science: a.science + s.science,
        }),
        { credits: 0, industry: 0, science: 0 },
      );
    // Sakuradite deposits: extraction by refinery level; a level-3 refinery also exports for credits.
    total.sakuradite = 0;
    for (const d of g.sites || [])
      if (depositOwner(g, d) === side) {
        const y = depositYield(g, d);
        total.sakuradite += y.sakuradite;
        total.credits += y.credits;
      }
    total.credits = Math.round(total.credits * refining);
    return total;
  }
  // New units deploy on the city hex or a free land hex next to it.
  function recruitOptions(g, s, side) {
    if (s.owner !== side) return [];
    return [tile(g, s.c, s.r), ...adjacent(g, s)].filter(
      p =>
        p &&
        !isSea(p) &&
        !TERRAIN[p.terrain]?.blocked &&
        !unitAt(g, p) &&
        (!stationAt(g, p) || stationAt(g, p).owner === side),
    );
  }
  // The Federation's doctrine discounts its Infantry. Sakuradite is priced by class (SAKURADITE.cost).
  function price(type, stack = 1, g = null, side = null) {
    const t = TYPES[type],
      off = (side || t.side) === 'cf' && t.branch === 'Infantry' ? 0.85 : 1;
    return {
      credits: Math.round(t.cost * (1 + 0.85 * (stack - 1)) * off),
      industry: Math.round(t.industry * (1 + 0.85 * (stack - 1)) * off),
      sakuradite: Math.round((SAKURADITE.cost[t.cls] || 0) * (1 + 0.85 * (stack - 1)) * off),
    };
  }
  function canBuy(g, s, type, stack = 1) {
    return !buyReason(g, s, type, stack);
  }
  function recruit(g, stationId, type, stack = 1, position) {
    const s = g.stations.find(s => s.id === stationId);
    const why = buyReason(g, s, type, stack);
    if (why) return { ok: false, reason: why };
    const options = recruitOptions(g, s, s.owner);
    const p = position ? options.find(p => p.c === position.c && p.r === position.r) : options[0];
    if (!p) return { ok: false, reason: 'Deployment hex unavailable.' };
    const cost = price(type, stack, g, s.owner);
    spend(funds(g, s.owner), cost);
    s.producedTurn = g.turn;
    const u = newUnit(g, type, s.owner, p.c, p.r, stack, null, false);
    log(g, `${TYPES[type].short} ×${stack} rolls out at ${s.name}. Ready next turn.`, s.owner);
    return { ok: true, unit: u };
  }
  function reinforceCost(type, g = null, side = null) {
    const p = price(type, 1, g, side);
    return { credits: p.credits, industry: p.industry, sakuradite: p.sakuradite };
  }
  // Repairs restore 35% of the frame for a fifth of the unit's build price.
  function repairCost(u, g = null) {
    const half = g && g.units.some(v => v.hp > 0 && v.side === u.side && fx(v).repairHalf) ? 0.5 : 1;
    return Math.max(10, Math.round(baseRepairCost(u) * half));
  }
  function baseRepairCost(u) {
    return Math.max(20, Math.round(price(u.type, u.stack, null, u.side).credits * 0.2));
  }
  function reinforce(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = reinforceReason(g, u);
    if (why) return { ok: false, reason: why };
    const cost = reinforceCost(u.type, g, u.side),
      e = funds(g, u.side);
    spend(e, cost);
    const old = maxHP(u);
    u.stack++;
    u.hp += maxHP(u) - old;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} reinforced to ${u.stack} frames.`, u.side);
    return { ok: true };
  }
  function repair(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = repairReason(g, u);
    if (why) return { ok: false, reason: why };
    const cost = repairCost(u, g);
    funds(g, u.side).credits -= cost;
    const amount = Math.min(maxHP(u) - u.hp, Math.round(maxHP(u) * 0.35));
    u.hp += amount;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} repairs ${amount} frame.`, u.side);
    return { ok: true, amount };
  }
  const BUILDINGS = {
    factory: {
      name: 'Knightmare factory',
      field: 'tier',
      desc: 'Unlocks heavier frames (level 2: mainline, raider and rocket; level 3: heavy, super-heavy and siege). +10 industry and +60 defense per level.',
    },
    lab: {
      name: 'Research lab',
      field: 'lab',
      desc: 'Produces research (+8 per level). Research banked when you win becomes command tokens.',
    },
    refinery: {
      name: 'Sakuradite refinery',
      field: 'refinery',
      desc: 'Only where there is a Sakuradite deposit. Extracts 25% of its output, then 50%, 75% and 100% (+15 credits) at levels 1–3.',
    },
  };
  function buildingLevel(s, kind) {
    return s[BUILDINGS[kind].field] || 0;
  }
  function buildCost(s, kind) {
    const l = buildingLevel(s, kind);
    // A factory wrecked to level 0 (F.L.E.I.J.A.) is rebuilt for the price of a level-1 lab.
    if (kind === 'factory') return l ? { credits: 160 * l, industry: 40 * l } : { credits: 110, industry: 25 };
    if (kind === 'lab') return { credits: 110 * (l + 1), industry: 25 * (l + 1) };
    return { credits: 120 * (l + 1), industry: 30 * (l + 1) };
  }
  function build(g, id, kind) {
    const s = g.stations.find(s => s.id === id),
      b = BUILDINGS[kind];
    const why = buildReason(g, s, kind);
    if (why) return { ok: false, reason: why };
    const cost = buildCost(s, kind),
      e = funds(g, s.owner);
    spend(e, cost);
    s[b.field] = buildingLevel(s, kind) + 1;
    if (kind === 'factory') {
      s.industry += 10;
      s.maxShield += 60;
      s.shield = Math.min(s.maxShield, s.shield + 60);
    } else if (kind === 'lab') s.science += 8;
    log(g, `${s.name}: ${b.name} upgraded to level ${s[b.field]}.`, s.owner);
    return { ok: true };
  }
  function assign(g, id, k) {
    const u = g.units.find(u => u.id === id),
      a = COMMANDERS[k];
    const why = assignReason(g, u, k);
    if (why) return { ok: false, reason: why };
    funds(g, u.side).credits -= a.cost;
    const old = maxHP(u);
    u.cmd = k;
    u.personal = true;
    u.cmdRank = g.roster[k].rank;
    u.hp += maxHP(u) - old;
    log(g, `${a.short} takes command of ${TYPES[u.type].short}.`, u.side);
    return { ok: true };
  }
  // Julius's Geass Command, Leila's wZERO Feint and Xianglin's Stratagem: −2 morale to enemies within 2 hexes.
  function feint(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = feintReason(g, u);
    if (why) return { ok: false, reason: why };
    const victims = g.units.filter(v => v.hp > 0 && v.side !== u.side && dist(g, u, v) <= 2);
    victims.forEach(v => (v.morale = Math.max(moraleFloor(g, v), v.morale - 2)));
    u.feintCD = 3;
    log(g, `${COMMANDERS[u.cmd].action.verb} disrupts ${victims.length} enemy units.`, u.side);
    return { ok: true, affected: victims.length };
  }

  // ======== Sakuradite: the fourth resource, mined at a handful of deposits ========
  // Japan holds 70 of the world's 100 base output, as in the lore (nearly 70% of the world's Sakuradite). Outputs,
  // extraction rates, the starting stockpile and prices are first-pass balance guesses.
  const SAKURADITE = {
    start: 50,
    extraction: [0.25, 0.5, 0.75, 1], // share of a deposit's output by refinery level 0–3
    exportCredits: 15, // a level-3 refinery also exports for credits
    // Per frame, by class; tier-1 classes need none. Extra frames follow the 85% rule.
    cost: { raider: 5, medium: 5, rocket: 5, heavy: 10, siege: 10, super: 25 },
  };
  // [name, lon, lat, base output per turn, starting refinery level, terrain]. A deposit on a free land hex is a mine
  // of its own, captured like a city; one whose hex holds a city is worked from that city and changes hands with it.
  const RESOURCE_SITES = [
    // The great mine on Mount Fuji (Code Geass wiki), set just west of Tokyo so it gets its own hex.
    ['Mount Fuji', 136.6, 35.4, 40, 1, 'mountain'],
    ['Hokkaido', 142.5, 43.3, 15, 0], // Hokkaido is a single hex: worked from Sapporo
    ['Kyushu', 131.1, 32.9, 15, 0], // worked from Fukuoka
    ['Stonehenge', -1.83, 51.18, 10, 0], // where Sakuradite was first found (wiki); worked from London
    ['Rocky Mountains', -106.5, 39, 10, 0],
    ['Qaidam Basin', 95, 37, 10, 0],
  ];
  // Stockpiles and deposits for a new game (or a save from before Sakuradite).
  function setupSakuradite(g) {
    for (const [side, e] of Object.entries(g.economy)) e.sakuradite ??= MAJORS.includes(side) ? SAKURADITE.start : 0;
    if (g.sites) return g;
    g.sites = [];
    for (const [name, lon, lat, base, level, terrain] of RESOURCE_SITES) {
      const h = hexOf(lon, lat),
        t = tile(g, h.c, h.r),
        city = t && stationAt(g, t),
        id = g.sites.length;
      if (!t) continue;
      if (city) {
        city.refinery = Math.max(city.refinery || 0, level);
        g.sites.push({ id, name, c: city.c, r: city.r, base, city: city.id });
        continue;
      }
      const open = n => !isSea(n) && !TERRAIN[n.terrain]?.blocked && !stationAt(g, n),
        at = open(t) ? t : nearest(g, t, open);
      if (!at) continue;
      if (terrain) at.terrain = terrain;
      g.sites.push({ id, name, c: at.c, r: at.r, base, city: null, owner: at.owner || 'neutral', refinery: level });
    }
    return g;
  }
  // A deposit's refinery and owner live on its city, or on the mine itself.
  function depositHost(g, d) {
    return d.city == null ? d : g.stations.find(s => s.id === d.city) || null;
  }
  function depositOwner(g, d) {
    return depositHost(g, d)?.owner || null;
  }
  function depositOf(g, s) {
    return (s && g.sites?.find(d => d.city === s.id)) || null;
  }
  function siteAt(g, p) {
    return (p && g.sites?.find(d => d.city == null && d.c === p.c && d.r === p.r)) || null;
  }
  function depositYield(g, d) {
    const host = depositHost(g, d),
      level = clamp(host?.refinery || 0, 0, 3),
      rate = host && !devastated(g, host) ? SAKURADITE.extraction[level] : 0;
    return {
      level,
      rate,
      sakuradite: Math.round(d.base * rate),
      credits: rate && level >= 3 ? SAKURADITE.exportCredits : 0,
    };
  }
  function spend(e, cost) {
    e.credits -= cost.credits || 0;
    e.industry -= cost.industry || 0;
    if (cost.science) e.science -= cost.science;
    if (cost.sakuradite) e.sakuradite = (e.sakuradite || 0) - cost.sakuradite;
  }
  // A city's output per turn, with the deposit it works.
  function cityYield(g, s) {
    const d = depositOf(g, s),
      y = d ? depositYield(g, d) : { sakuradite: 0, credits: 0 };
    if (devastated(g, s)) return { credits: 0, industry: 0, science: 0, sakuradite: 0 };
    return { credits: s.income + y.credits, industry: s.industry, science: s.science, sakuradite: y.sakuradite };
  }
  // Infantry or Armor moving onto a mine seizes it; it has no defenses.
  function seizeDeposit(g, u, p) {
    const d = siteAt(g, p);
    if (!d || d.owner === u.side || !canCapture(u)) return null;
    const loser = d.owner;
    d.owner = u.side;
    log(
      g,
      `${COMMANDERS[u.cmd]?.short || TYPES[u.type].short} seizes the ${d.name} Sakuradite mine${FACTIONS[loser] && loser !== 'neutral' ? ' from the ' + FACTIONS[loser].short : ''}.`,
      u.side,
    );
    return d.name;
  }
  // A surrendering power's mines and half its Sakuradite pass to the conqueror.
  function annexDeposits(g, loser, winner) {
    for (const d of g.sites || []) if (d.city == null && d.owner === loser) d.owner = winner;
    const e = funds(g, loser),
      w = funds(g, winner);
    if (!e || !w) return;
    w.sakuradite = (w.sakuradite || 0) + Math.round((e.sakuradite || 0) / 2);
    e.sakuradite = 0;
  }
  // Refineries at mines of their own (deposits under a city use the city's refinery building).
  function refineReason(g, d) {
    if (!d || d.city != null) return 'Unavailable';
    const foe = unitAt(g, d);
    return (
      (g.over ? 'Operation over' : d.owner !== g.phase ? 'Not your mine' : null) ||
      ((d.refinery || 0) >= 3 ? 'Maximum level' : null) ||
      (foe && foe.side !== d.owner ? 'Enemy unit on the mine' : null) ||
      shortfall(funds(g, d.owner), buildCost(d, 'refinery'))
    );
  }
  function refine(g, id) {
    const d = g.sites?.find(d => d.id === id),
      why = refineReason(g, d);
    if (why) return { ok: false, reason: why };
    spend(funds(g, d.owner), buildCost(d, 'refinery'));
    d.refinery = (d.refinery || 0) + 1;
    log(g, `${d.name}: Sakuradite refinery upgraded to level ${d.refinery}.`, d.owner);
    return { ok: true };
  }
  // Version 1 saves: refineries away from a deposit become the credits they exported; deposits are placed.
  function upgradeSave(g) {
    const old = new Map(g.stations.map(s => [s.id, s.refinery || 0]));
    g.stations.forEach(s => (s.refinery = 0));
    setupSakuradite(g);
    for (const s of g.stations)
      if (depositOf(g, s)) s.refinery = Math.max(s.refinery, old.get(s.id));
      else s.income += 15 * old.get(s.id);
    g.rulesVersion = 2;
    return g;
  }

  // ======== F.L.E.I.J.A.: the Sakuradite superweapon ========
  // Every number is a first-pass balance guess. A world-map hex is about 330 km wide, so a warhead covers its target
  // hex and one ring; campaign maps can pass a larger radius to blastArea().
  const FLEIJA = {
    radius: 1,
    cost: { credits: 1800, industry: 450, science: 300, sakuradite: 150 },
    turns: 4, // construction time
    lab: 3, // research lab level needed
    devastation: 10, // turns a city at ground zero produces nothing
    ringHP: 0.1, // units in the ring are left with 10% of their frame
    aiTurn: { normal: 60, hard: 45, challenge: 30 }, // when rival powers gain the technology
    aiThreshold: 1500, // the least target value a rival will spend a warhead on
    aiRest: 8, // turns a rival waits after a launch before starting another warhead
  };
  const devastated = (g, x) => (x?.devastated || 0) > g.turn;
  // You research F.L.E.I.J.A. at HQ; rival powers gain it on a set turn (earlier on harder difficulties).
  function hasFleija(g, side) {
    if (side === g.player) return techLevel(g, side, 'sakura.fleija') >= 1;
    return MAJORS.includes(side) && g.turn >= (FLEIJA.aiTurn[g.difficulty] ?? FLEIJA.aiTurn.normal);
  }
  function cityBusyReason(g, s) {
    return devastated(g, s)
      ? `Devastated by F.L.E.I.J.A. until turn ${s.devastated}`
      : s.project
        ? 'F.L.E.I.J.A. project under way'
        : null;
  }
  function projectReason(g, s) {
    if (!s) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your city' : null) ||
      (!hasFleija(g, s.owner)
        ? s.owner === g.player
          ? 'Research F.L.E.I.J.A. at HQ first'
          : 'Technology not ready'
        : null) ||
      cityBusyReason(g, s) ||
      ((s.lab || 0) < FLEIJA.lab ? `Requires research lab level ${FLEIJA.lab}` : null) ||
      shortfall(funds(g, s.owner), FLEIJA.cost)
    );
  }
  // Starting a warhead alerts every power; the city builds nothing else until it is done.
  function startProject(g, id) {
    const s = g.stations.find(s => s.id === id),
      why = projectReason(g, s);
    if (why) return { ok: false, reason: why };
    spend(funds(g, s.owner), FLEIJA.cost);
    s.project = { side: s.owner, started: g.turn, ready: g.turn + FLEIJA.turns };
    log(g, `INTELLIGENCE: Strategic weapons research detected in ${s.name}.`, s.owner);
    return { ok: true, ready: s.project.ready };
  }
  function dropProject(g, s, why) {
    if (!s?.project) return;
    log(g, `${s.name}: the F.L.E.I.J.A. project is lost${why ? ' (' + why + ')' : ''}.`, s.owner);
    s.project = null;
  }
  // A surrendering power's projects and warheads are lost; its devastated cities stay without defenses.
  function annexStrategic(g, loser) {
    for (const s of g.stations) {
      if (s.project?.side === loser) dropProject(g, s, 'surrender');
      if (devastated(g, s)) s.shield = 0;
    }
    if (g.arsenal) g.arsenal[loser] = 0;
  }
  // Start of a power's turn: finished warheads join its arsenal; devastated cities stay without defenses.
  function strategicTurn(g, side) {
    for (const s of g.stations) {
      if (devastated(g, s)) s.shield = 0;
      if (s.project?.side !== side || s.owner !== side || s.project.ready > g.turn) continue;
      s.project = null;
      (g.arsenal ||= {})[side] = (g.arsenal[side] || 0) + 1;
      log(g, `${s.name} completes a F.L.E.I.J.A. warhead.`, side);
    }
  }
  function blastArea(g, p, radius = FLEIJA.radius) {
    return within(g, p, radius);
  }
  // What a strike is called: the city or mine at ground zero, else the nearest city.
  function targetName(g, p) {
    const near = g.stations.slice().sort((a, b) => dist(g, a, p) - dist(g, b, p) || a.id - b.id)[0];
    return stationAt(g, p)?.name || siteAt(g, p)?.name || (near ? `near ${near.name}` : `hex ${p.c},${p.r}`);
  }
  function launchReason(g, side, p) {
    if (g.over) return 'Operation over';
    if (g.phase !== side) return 'Not your turn';
    if (!(g.arsenal?.[side] > 0)) return 'No F.L.E.I.J.A. warhead in the arsenal';
    if (g.launched?.[side] === g.turn) return 'One launch per turn';
    if (!g.stations.some(s => s.owner === side)) return 'No city to launch from';
    if (!p || !tile(g, p.c, p.r)) return 'Choose a target hex';
    return null;
  }
  // The city's founding output and defenses: wrecked buildings never leave a city below them.
  function founding(s) {
    const row = CITY_DATA.find(r => r[0] === s.name);
    if (!row) return { industry: 0, science: 0, maxShield: 0 };
    const [, , , , tier, capital = false, fort = false] = row;
    return {
      industry: capital ? 30 : 6 * tier,
      science: capital ? 10 : 1 + tier,
      maxShield: capital ? 600 : fort ? 400 : 120 + 60 * tier,
    };
  }
  // Knock down every building by `levels` (Infinity: back to level 0) with the output and defenses they added.
  function ruin(g, s, levels) {
    const base = founding(s),
      lostFactory = Math.min(levels, s.tier || 0),
      lostLab = Math.min(levels, s.lab || 0);
    s.tier = (s.tier || 0) - lostFactory;
    s.lab = (s.lab || 0) - lostLab;
    s.refinery = Math.max(0, (s.refinery || 0) - levels);
    s.industry = Math.max(Math.min(base.industry, s.industry), s.industry - 10 * lostFactory);
    s.science = Math.max(Math.min(base.science, s.science), s.science - 8 * lostLab);
    s.maxShield = Math.max(Math.min(base.maxShield + (s.fortBonus || 0), s.maxShield), s.maxShield - 60 * lostFactory);
    s.shield = 0;
    dropProject(g, s, 'destroyed');
  }
  // Detonation: everything at ground zero is erased, the ring is left at 10% with collapsed morale.
  function launch(g, side, c, r) {
    const center = tile(g, c, r),
      why = launchReason(g, side, center);
    if (why) return { ok: false, reason: why };
    const origin = g.stations
        .filter(s => s.owner === side)
        .sort((a, b) => dist(g, a, center) - dist(g, b, center) || a.id - b.id)[0],
      name = targetName(g, center);
    g.arsenal[side]--;
    (g.launched ||= {})[side] = g.turn;
    const destroyed = [],
      crippled = [],
      cities = [],
      hit = [];
    for (const t of blastArea(g, center)) {
      const ring = key(t) !== key(center),
        v = unitAt(g, t),
        s = stationAt(g, t),
        d = siteAt(g, t);
      if (v && !ring) {
        hit.push({ id: v.id, c: t.c, r: t.r, damage: v.hp });
        v.hp = 0;
        kill(g, v, null);
        destroyed.push(v.id);
      } else if (v) {
        const left = Math.min(v.hp, Math.max(1, Math.round(maxHP(v) * FLEIJA.ringHP)));
        hit.push({ id: v.id, c: t.c, r: t.r, damage: v.hp - left });
        v.hp = left;
        v.morale = moraleFloor(g, v);
        crippled.push(v.id);
      }
      if (s) {
        ruin(g, s, ring ? 1 : Infinity);
        if (!ring) s.devastated = g.turn + FLEIJA.devastation;
        cities.push({ name: s.name, devastated: !ring });
      }
      if (d) {
        d.refinery = ring ? Math.max(0, (d.refinery || 0) - 1) : 0;
        if (!ring) d.devastated = g.turn + FLEIJA.devastation;
      }
      if (!ring && !isSea(t) && !TERRAIN[t.terrain]?.blocked) t.terrain = 'crater';
    }
    log(
      g,
      `F.L.E.I.J.A. detonation at ${name}: ${destroyed.length} units erased, ${crippled.length} crippled${cities.length ? ', ' + cities.map(x => x.name).join(' and ') + ' in ruins' : ''}.`,
      side,
    );
    checkVictory(g);
    return {
      ok: true,
      side,
      from: origin ? { c: origin.c, r: origin.r } : { c, r },
      to: { c, r },
      name,
      destroyed,
      crippled,
      cities,
      hit,
    };
  }
  // ---- Rival high command and F.L.E.I.J.A. ----
  // The project city: the best lab, then the city farthest from the enemy.
  function fleijaCity(g, side, front) {
    return (
      g.stations
        .filter(s => s.owner === side && !cityBusyReason(g, s))
        .sort((a, b) => (b.lab || 0) - (a.lab || 0) || front(b) - front(a) || a.id - b.id)[0] || null
    );
  }
  // The most valuable target that spares the launcher's own units and cities, or null below the threshold.
  function aiLaunchTarget(g, side) {
    const rival = s => !!s && s !== side && s !== 'neutral',
      seen = new Set();
    let best = null;
    const candidates = [
      ...g.units.filter(u => u.hp > 0 && rival(u.side)),
      ...g.stations.filter(s => rival(s.owner)),
    ].map(p => tile(g, p.c, p.r));
    for (const p of candidates) {
      if (!p || seen.has(key(p))) continue;
      seen.add(key(p));
      let score = 0,
        safe = true;
      for (const t of blastArea(g, p)) {
        const ring = key(t) !== key(p),
          v = unitAt(g, t),
          s = stationAt(g, t);
        if (v?.side === side || s?.owner === side) {
          safe = false;
          break;
        }
        if (v && rival(v.side))
          score +=
            price(v.type, v.stack, g, v.side).credits * (v.hp / maxHP(v)) * (ring ? 0.75 : 1) + (v.cmd ? 200 : 0);
        // Cities are worth what the blast destroys (a ruin is worth nothing); a capital is worth more only when
        // the launcher has troops close enough to take it afterwards.
        if (s && rival(s.owner) && !devastated(g, s)) {
          const levels = (s.tier || 0) + (s.lab || 0) + (s.refinery || 0);
          score += ring ? 40 * levels + s.shield * 0.2 : 150 + 100 * levels + s.shield * 0.5;
          if (s.project) score += 2000;
          if (
            !ring &&
            s.capitalOf === s.owner &&
            alive(g, s.owner) &&
            g.units.some(u => u.hp > 0 && u.side === side && canCapture(u) && dist(g, u, s) <= 4)
          )
            score += 1500;
        }
      }
      if (safe && (!best || score > best.score)) best = { p, score };
    }
    return best && best.score >= FLEIJA.aiThreshold ? best.p : null;
  }
  function beginTurn(g, side, collect = true) {
    g.phase = side;
    if (collect) {
      const inc = income(g, side),
        e = funds(g, side),
        modifier = side !== g.player ? DIFFICULTIES[g.difficulty]?.income || 1 : 1;
      e.credits += Math.round(inc.credits * modifier);
      e.industry += Math.round(inc.industry * modifier);
      e.science += Math.round(inc.science * modifier);
      e.sakuradite = (e.sakuradite || 0) + Math.round(inc.sakuradite * modifier);
    }
    const mine = g.units.filter(u => u.hp > 0 && u.side === side);
    for (const u of mine) {
      u.moved = false;
      u.attacked = false;
      u.chain = 0;
      u.feintCD = Math.max(0, (u.feintCD || 0) - 1);
      const nearby = g.units.filter(v => v.hp > 0 && v.side !== side && dist(g, u, v) === 1).length;
      let desired = nearby >= 3 ? -2 : nearby >= 2 ? -1 : 0;
      desired = Math.max(moraleFloor(g, u), desired);
      if (u.morale < desired) u.morale++;
      else if (u.morale > desired) u.morale--;
      if (nearby >= 2) u.morale = Math.min(u.morale, desired);
      // Engineers within 2 hexes reassure: one extra morale step and 5% of the frame.
      if (mine.some(m => m.hp > 0 && fx(m).reassure && dist(g, m, u) <= 2)) {
        u.morale = Math.min(1, u.morale + 1);
        u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.05));
      }
      if (fx(u).regen) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * fx(u).regen));
      const energy = techValue(g, side, 'sakura.energy');
      if (energy) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * energy));
      const auras = mine.filter(v => v.hp > 0 && v.cmd && v.id !== u.id && dist(g, u, v) <= auraRange(v)),
        aura = auras.find(v => fx(v).rally) || auras[0];
      if (aura && nearby < 3) u.morale = Math.min(1, u.morale + (fx(aura).rally || 1));
      const t = tile(g, u.c, u.r),
        attrition = TERRAIN[t.terrain]?.attrition;
      if (attrition) {
        const filler = TYPES[u.type].branch === 'Infantry' ? techValue(g, side, 'infantry.filler') : 0;
        u.hp = Math.max(1, u.hp - Math.round(maxHP(u) * attrition * (1 - filler)));
      }
      const s = stationAt(g, u);
      if (s?.owner === side) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.08));
    }
    g.strikes = [];
    for (const s of g.stations) {
      if (s.owner === side) s.shield = Math.min(s.maxShield, s.shield + Math.round(s.maxShield * 0.12));
    }
    strategicTurn(g, side);
    checkVictory(g);
  }
  // Fortress batteries: fired by the owner, range 3, then two turns to recharge.
  const FORTRESS_GUN = { range: 3, recharge: 2, share: 0.4 };
  function fortressName(s) {
    return s.gun || `${s.name} battery`;
  }
  function fortressRecharge(g, s) {
    return FORTRESS_GUN.recharge - (techLevel(g, s.owner, 'cities.overcharge') >= 1 ? 1 : 0);
  }
  function fortressReady(g, s) {
    return !!s?.fort && s.owner === g.phase && !g.over && s.shield > 0 && (s.gunReady || 0) <= g.turn;
  }
  // Battery Capacitors raise the owner's battery damage; Electromagnetic Armor shrugs part of it off.
  function fortressDamage(g, foe, owner) {
    return Math.max(
      1,
      Math.round(
        maxHP(foe) *
          FORTRESS_GUN.share *
          (1 + techValue(g, owner, 'cities.battery')) *
          (TYPES[foe.type].branch === 'Armor' ? 1 - techValue(g, foe.side, 'armor.bulkheads') : 1),
      ),
    );
  }
  function fortressTargets(g, s) {
    if (!fortressReady(g, s)) return [];
    return within(g, s, FORTRESS_GUN.range)
      .map(p => unitAt(g, p))
      .filter(u => u && u.side !== s.owner)
      .map(u => tile(g, u.c, u.r));
  }
  function fireFortress(g, id, c, r) {
    const s = g.stations.find(s => s.id === id);
    if (!fortressReady(g, s)) return { ok: false, reason: 'The battery is not ready.' };
    const foe = unitAt(g, { c, r });
    if (!foe || foe.side === s.owner || dist(g, s, foe) > FORTRESS_GUN.range)
      return { ok: false, reason: 'No enemy unit within 3 hexes of the city.' };
    const damage = fortressDamage(g, foe, s.owner),
      name = fortressName(s),
      hit = [];
    foe.hp = Math.max(0, foe.hp - damage);
    foe.morale = Math.max(moraleFloor(g, foe), foe.morale - 1);
    s.gunReady = g.turn + fortressRecharge(g, s);
    log(g, `${name} strikes ${TYPES[foe.type].short} for ${damage}.`, s.owner);
    const destroyed = foe.hp <= 0;
    // Battery Overcharge II: the blast also catches enemy units next to the target.
    if (techLevel(g, s.owner, 'cities.overcharge') >= 2)
      for (const v of g.units) {
        if (v.hp <= 0 || v.side === s.owner || v.id === foe.id || dist(g, v, foe) !== 1) continue;
        const amount = Math.round(fortressDamage(g, v, s.owner) * 0.5);
        v.hp = Math.max(0, v.hp - amount);
        hit.push({ id: v.id, c: v.c, r: v.r, damage: amount });
        kill(g, v, null);
      }
    kill(g, foe, null);
    checkVictory(g);
    return { ok: true, name, from: { c: s.c, r: s.r }, to: { c: foe.c, r: foe.r }, id: foe.id, damage, destroyed, hit };
  }
  const ARMISTICE = 120;
  function checkVictory(g) {
    if (g.over) return g.over;
    decideVictory(g);
    if (g.over && g.over.winner === g.player) {
      award(g, g.player, 'campaign', 'Operation won');
      if (DIFFICULTIES[g.difficulty]?.level) award(g, g.player, 'laurel', `${DIFFICULTIES[g.difficulty].name} victory`);
    }
    return g.over;
  }
  // World conquest: hold every major capital (each rival surrenders when its capital falls), or hold the most
  // cities at the armistice.
  function decideVictory(g) {
    const P = g.player,
      fall = g.fallen?.[P],
      rivals = MAJORS.filter(s => s !== P && alive(g, s));
    if (fall) g.over = { winner: fall.by, reason: `${fall.city} has fallen. The ${FACTIONS[P].name} has surrendered.` };
    else if (!rivals.length)
      g.over = {
        winner: P,
        reason: `Every rival capital flies the colors of the ${FACTIONS[P].name}. The world is yours.`,
      };
    else if (g.turn > ARMISTICE) {
      const held = s => g.stations.filter(c => c.owner === s).length,
        mine = held(P),
        best = Math.max(...rivals.map(held)),
        leader = rivals.find(s => held(s) === best);
      g.over = {
        winner: mine === best ? 'draw' : mine > best ? P : leader,
        reason: `The ${ARMISTICE}-turn armistice: you hold ${mine} cities; the strongest rival holds ${best}.`,
      };
    }
    return g.over;
  }
  function objectiveText(g) {
    const rivals = MAJORS.filter(s => s !== g.player && alive(g, s)).map(s => FACTIONS[s].capital);
    return rivals.length
      ? `Take ${rivals.join(' and ')} while holding ${FACTIONS[g.player].capital}. A power surrenders when its capital falls.`
      : 'Every rival capital has fallen.';
  }
  function modeTitle() {
    return 'World War · 2017 a.t.b.';
  }

  // ======== The world ========
  // <world> Generated by tools/build_map.py: 100 x 42 wrapping hexes, 3.6 degrees per column.
  const WORLD_ROWS = [
    '................s.................sssssssssss.........................ssssssssssss..................',
    '.....ss.........sssss.....ssss....ssxxsssss.............s...........ssssssssssssssssssssssss........',
    's...ssssssssssssssssssssss..ssss...ssssxs.............sssssss.ssssssssssssssssssssssssssssssssssssss',
    'pp.pppppppppppppppppppppss..ssss...ssxs....spp......ppfpppppppppppmpppppppppppppppppppmmmpmppppppppp',
    '....pppppmpppfpppppppppp....ssss....sss.............mpp.fpppppppppppppppppppppppppppppppppmppppppp..',
    '.....ppp...pffpmmfffffff....pppp................p..ppp..ppppfppfppppppppppppppppppppppppp....pp.....',
    '.............ppmmmffpffffp..fppppp.............p.p..p.ffpfppppppppffffffffpfpfpfppfpfpfp.....pp.....',
    '..............pmmppppffppfpfpffppp..............p..pfpfppppppppppppppppppppppppppppppffpp....p......',
    '...............ppmppppppfppfppff..................ppppppppppppppppppppppppmppppppppppppppp..........',
    '...............pppmppppppppppppp.................ppmmmppppppppp.pppppppppppppppppppppppp............',
    '...............ppppmppppppppppp................pppp..p.ppp...mp.pdppppppppppdddpddppppp..p..........',
    '...............pppmmppppfffff..................ppp..p..p.pppppp.pdddppmdddpppddpppppp...p...........',
    '................ppdmmpppppffp...................p.ppp.p...pppppmpppppmpmmmmppppppppp...pp...........',
    '................pddmmpppfpfp...................pmmppp......pppmpppdpppxpmmmpmpppppp..ppp............',
    '..................ppdppppfpp...................pddpdddpdddpppddpmpdddpppxxmmpmmppppp................',
    '..................ppppp.......................dpddddddpdddppdpd.pppddppppxpxmpppppp.................',
    '....................ppp....p..................ddpdddddddddp.pddppp...pppppppffppppp.p...............',
    '.....p..............pmp.p..p.................ddpdpdddddddddpppppdp...ppppp.ppffpp...................',
    '.....................ppppp...................dddddddddpddpddppdddp....ppp...pffp...p................',
    '........................pp...................ppppppppppppppppppp......pp.....fpf...p................',
    '..........................p..p................ppppppppppppppmppp.......p.....pff....................',
    '..........................ppppppp.............pppppppppppppmmppp.......p............p...............',
    '............................ppppppp............pff.fpppppppppppp.............fp...f.................',
    '............................mffffppp................pfpffppppp...............ff.ff..................',
    '............................pfffffppp................pffpfpppp................f.fff.................',
    '...........................mfppfffppppp..............pfffpppp.................f.......pfpp..........',
    '............................mfppfffppppp.............pppppppp..................fff......ffp.........',
    '............................mffppfpppppp.............pppppppp.............................f.........',
    '.............................pppppppppp..............pppppppp..p......................pp.p..........',
    '.............................mmpppppppp..............ppppppp..p.....................pppppp..........',
    '..............................ppppppppp...............ddpppp..pp...................dpddpppp.........',
    '..............................mppppppp...............dddppp..pp..................ppddpddpppp........',
    '..............................mpppppp.................pdppp.......................dddddddpppp.......',
    '..............................mppppp..................pppp.......................pppddpdpppp........',
    '..............................mppppp...................ppp........................pppppppppp........',
    '.............................mpppp......................................................ppp.........',
    '.............................ppppp.......................................................pp.......pp',
    '.............................mpp..........................................................p......p..',
    '.............................mpp................................................................pp..',
    '............................ppp.....................................................................',
    '.............................pp.....................................................................',
    '.............................pp.....................................................................',
  ];
  // </world>
  const WORLD = { cols: 100, rows: 42, lon0: -180, dlon: 3.6, lat0: 74, dlat: 3.12 };
  function hexOf(lon, lat) {
    const r = clamp(Math.round((WORLD.lat0 - lat) / WORLD.dlat), 0, WORLD.rows - 1),
      c = Math.round((lon - WORLD.lon0) / WORLD.dlon - 0.5 - 0.5 * (r & 1));
    return { c: ((c % WORLD.cols) + WORLD.cols) % WORLD.cols, r };
  }
  function lonLatOf(p) {
    return { lon: WORLD.lon0 + (p.c + 0.5 + 0.5 * (p.r & 1)) * WORLD.dlon, lat: WORLD.lat0 - p.r * WORLD.dlat };
  }
  // [name, lon, lat, owner, tier, capital, fort, battery name]. Each city snaps to its nearest free land hex.
  const CITY_DATA = [
    // Holy Britannian Empire: the Americas.
    ['Pendragon', -117, 37.5, 'britannia', 3, true, true, 'Pendragon Hadron Battery'],
    ['Seattle', -122.3, 47.6, 'britannia', 2],
    ['Denver', -105, 39.7, 'britannia', 1],
    ['Dallas', -96.8, 32.8, 'britannia', 2],
    ['Chicago', -87.6, 41.9, 'britannia', 2],
    ['New York', -74, 40.7, 'britannia', 3],
    ['Miami', -80.2, 25.8, 'britannia', 1],
    ['Winnipeg', -97, 49.9, 'britannia', 1],
    ['Halifax', -63.6, 44.6, 'britannia', 1],
    ['Anchorage', -149.9, 61.2, 'britannia', 1],
    ['Mexico City', -99.1, 19.4, 'britannia', 2],
    ['Panama', -79.5, 9, 'britannia', 1, false, true, 'Panama Canal Battery'],
    ['Bogota', -74, 4.7, 'britannia', 1],
    ['Lima', -77, -12, 'britannia', 1],
    ['Manaus', -60, -3.1, 'britannia', 1],
    ['Recife', -34.9, -8, 'britannia', 1],
    ['Rio de Janeiro', -43.2, -22.9, 'britannia', 2],
    ['Buenos Aires', -58.4, -34.6, 'britannia', 2],
    ['Santiago', -70.7, -33.4, 'britannia', 1],
    // Britannia's Pacific.
    ['Pearl Harbor', -157.9, 21.3, 'britannia', 1, false, true, 'Pearl Harbor Battery'],
    ['Manila', 121, 14.6, 'britannia', 1],
    ['Auckland', 174.8, -36.9, 'britannia', 1],
    // Area 11.
    ['Tokyo Settlement', 139.7, 35.7, 'britannia', 3, false, true, 'Tokyo Settlement Hadron Battery'],
    ['Kyoto', 135.8, 35, 'britannia', 1],
    ['Fukuoka', 130.4, 33.6, 'britannia', 1],
    ['Sapporo', 141.35, 43.06, 'britannia', 1],
    // Euro Britannia.
    ['St. Petersburg', 30.3, 59.9, 'britannia', 3, false, true, 'Catherine Palace Battery'],
    ['Moscow', 37.6, 55.75, 'britannia', 3],
    ['Riga', 24.1, 56.9, 'britannia', 1],
    ['Minsk', 27.6, 53.9, 'britannia', 2],
    ['Kiev', 30.5, 50.45, 'britannia', 2],
    ['Bucharest', 27.5, 44.3, 'britannia', 1],
    ['Istanbul', 29, 41, 'britannia', 2],
    ['Tbilisi', 44.8, 41.7, 'britannia', 1],
    ['Volgograd', 44.5, 48.7, 'britannia', 1],
    ['Yekaterinburg', 60.6, 56.8, 'britannia', 1],
    ['Novosibirsk', 82.9, 55, 'britannia', 1],
    ['Irkutsk', 104.3, 52.3, 'britannia', 1],
    ['Yakutsk', 129.7, 62, 'britannia', 1],
    ['Petropavlovsk', 158.6, 53, 'britannia', 1],
    ['Nuuk', -51.7, 64.2, 'britannia', 1],
    // Europia United: Europe and Africa.
    ['Paris', 2.35, 48.85, 'eu', 3, true, true, 'Elysée Battery'],
    ['London', -3.6, 52.2, 'eu', 3],
    ['Edinburgh', -1.8, 55.3, 'eu', 1],
    ['Dublin', -9, 55.3, 'eu', 1],
    ['Reykjavik', -21.9, 64.1, 'eu', 1],
    ['Madrid', -3.7, 40.4, 'eu', 2],
    ['Gibraltar', -5.35, 36.14, 'eu', 1, false, true, 'Gibraltar Batteries'],
    ['Rome', 12.5, 41.9, 'eu', 2],
    ['Berlin', 13.4, 52.5, 'eu', 3],
    ['Vienna', 16.4, 48.2, 'eu', 2],
    ['Warsaw', 21, 52.2, 'eu', 2],
    ['Stockholm', 18.07, 59.3, 'eu', 1],
    ['Oslo', 10.75, 59.9, 'eu', 1],
    ['Murmansk', 33, 68.9, 'eu', 1],
    ['Athens', 23.7, 38, 'eu', 1],
    ['Belgrade', 20.5, 44.8, 'eu', 1],
    ['Cairo', 31.2, 30, 'eu', 2, false, true, 'El Alamein Line'],
    ['Algiers', 3, 36.7, 'eu', 1],
    ['Tripoli', 13.2, 32.9, 'eu', 1],
    ['Dakar', -17.4, 14.7, 'eu', 1],
    ['Bamako', -8, 12.6, 'eu', 1],
    ['Lagos', 3.4, 6.5, 'eu', 1],
    ['Khartoum', 32.5, 15.6, 'eu', 1],
    ['Addis Ababa', 38.7, 9, 'eu', 1],
    ['Kinshasa', 15.3, -4.3, 'eu', 1],
    ['Nairobi', 36.8, -1.3, 'eu', 1],
    ['Johannesburg', 28, -26.2, 'eu', 2],
    ['Cape Town', 18.4, -33.9, 'eu', 1],
    ['Antananarivo', 47.5, -18.9, 'eu', 1],
    // Chinese Federation.
    ['Luoyang', 112.45, 34.6, 'cf', 3, true, true, 'Vermillion Forbidden City Battery'],
    ['Beijing', 116.4, 39.9, 'cf', 3],
    ['Shanghai', 121.5, 31.2, 'cf', 3],
    ['Hong Kong', 114.2, 22.3, 'cf', 2],
    ['Chongqing', 106.5, 29.5, 'cf', 2],
    ['Liaodong', 123.4, 41.8, 'cf', 2, false, true, 'Liaodong Batteries'],
    ['Seoul', 126.2, 39.4, 'cf', 1],
    ['Vladivostok', 131.9, 43.1, 'cf', 1],
    ['Ulaanbaatar', 106.9, 47.9, 'cf', 1],
    ['Urumqi', 87.6, 43.8, 'cf', 1],
    ['Lhasa', 91.1, 29.65, 'cf', 1],
    ['Almaty', 76.9, 43.2, 'cf', 1],
    ['Tashkent', 69.2, 41.3, 'cf', 1],
    ['Kabul', 69.2, 34.5, 'cf', 1],
    ['Tehran', 51.4, 35.7, 'cf', 2],
    ['Karachi', 67, 24.9, 'cf', 1],
    ['Delhi', 77.2, 28.6, 'cf', 2],
    ['Jabalpur', 79.95, 23.2, 'cf', 2],
    ['Mumbai', 72.9, 19, 'cf', 2],
    ['Kolkata', 88.4, 22.6, 'cf', 1],
    ['Chennai', 80.3, 13.1, 'cf', 1],
    ['Colombo', 79.9, 6.9, 'cf', 1],
    ['Yangon', 96.2, 16.8, 'cf', 1],
    ['Hanoi', 105.8, 21, 'cf', 1],
    ['Bangkok', 100.5, 13.75, 'cf', 1],
    ['Singapore', 103.8, 1.35, 'cf', 1, false, true, 'Singapore Batteries'],
    ['Jakarta', 106.8, -6.2, 'cf', 1],
    ['Taipei', 124.2, 24.1, 'cf', 1],
    ['Port Moresby', 147.2, -9.4, 'cf', 1],
    // Neutral powers: Australia and the Middle Eastern Federation.
    ['Sydney', 151.2, -33.9, 'neutral', 2],
    ['Melbourne', 145, -37.8, 'neutral', 1],
    ['Perth', 115.9, -32, 'neutral', 1],
    ['Darwin', 130.8, -12.5, 'neutral', 1],
    ['Baghdad', 44.4, 33.3, 'neutral', 2],
    ['Riyadh', 46.7, 24.7, 'neutral', 1],
    ['Damascus', 36.3, 33.5, 'neutral', 1],
    ['Muscat', 58.4, 23.6, 'neutral', 1],
  ];
  // [side, class, lon, lat, frames, commander]. Units snap to their nearest free land hex.
  const ARMY_DATA = [
    // Britannia: Pendragon, the Atlantic coast, South America, Area 11, Euro Britannia and the Pacific.
    ['britannia', 'super', -117, 37.5, 1, 'bismarck'],
    ['britannia', 'heavy', -114, 38, 2],
    ['britannia', 'medium', -120, 40, 2],
    ['britannia', 'light', -110, 36, 2],
    ['britannia', 'medium', -74, 41, 2],
    ['britannia', 'light', -77, 39, 2],
    ['britannia', 'rocket', -72, 43, 1],
    ['britannia', 'scout', -64, 45, 2],
    ['britannia', 'light', -43, -22, 2],
    ['britannia', 'scout', -35, -8, 1],
    ['britannia', 'support', -58, -34, 1],
    ['britannia', 'scout', -80, 9, 1],
    ['britannia', 'super', 139.7, 35.7, 1, 'suzaku'],
    ['britannia', 'heavy', 136, 35, 2, 'cornelia'],
    ['britannia', 'medium', 131, 33.5, 2],
    ['britannia', 'rocket', 140, 38.5, 1],
    ['britannia', 'light', 141.4, 43, 1],
    ['britannia', 'heavy', 30.3, 59.9, 2, 'shin'],
    ['britannia', 'medium', 37.6, 55.7, 2, 'julius'],
    ['britannia', 'raider', 30.5, 50.4, 2],
    ['britannia', 'siege', 33, 57, 1],
    ['britannia', 'support', 27.5, 53.9, 2],
    ['britannia', 'light', 24.1, 56.9, 2],
    ['britannia', 'assault', 29, 41, 2],
    ['britannia', 'light', 26, 44.4, 1],
    ['britannia', 'scout', 44.8, 41.7, 1],
    // Euro Britannia's Knights of St. Michael and the Ashra corps.
    ['britannia', 'raider', 31, 58.5, 2, 'ashley'],
    ['britannia', 'heavy', 38, 54.5, 1],
    ['britannia', 'medium', 31.5, 51.5, 2],
    ['britannia', 'assault', 27, 52.5, 2],
    ['britannia', 'rocket', 25, 57.5, 1],
    ['britannia', 'light', 44, 47.5, 2],
    ['britannia', 'scout', 82.9, 55, 1],
    ['britannia', 'scout', 104, 52.3, 1],
    ['britannia', 'scout', 121, 14.6, 2],
    ['britannia', 'light', -158, 21.3, 1],
    ['britannia', 'scout', 174.8, -36.9, 1],
    // Europia United: Paris, Britain, the eastern front (wZERO), Scandinavia, the Balkans and Africa.
    ['eu', 'super', 2.35, 48.85, 1, 'smilas'],
    ['eu', 'heavy', 4, 49.5, 2],
    ['eu', 'rocket', 0.5, 48, 2],
    ['eu', 'medium', -3.6, 52.2, 2],
    ['eu', 'support', -1.8, 55.3, 1],
    ['eu', 'support', -5.35, 36.1, 2],
    ['eu', 'raider', 21, 52.2, 2, 'akito'],
    ['eu', 'rocket', 18.5, 51, 2, 'leila'],
    ['eu', 'medium', 23, 54, 2, 'ryo'],
    ['eu', 'light', 20.5, 44.8, 2, 'ayano'],
    ['eu', 'light', 12.5, 41.9, 2],
    ['eu', 'siege', 13.4, 52.5, 1],
    ['eu', 'medium', -3.7, 40.4, 2],
    ['eu', 'scout', 10.75, 59.9, 1],
    ['eu', 'light', 18, 59.3, 1],
    ['eu', 'scout', 33, 68.9, 1],
    ['eu', 'assault', 23.7, 38, 1],
    ['eu', 'heavy', 31.2, 30, 2],
    ['eu', 'rocket', 28.5, 31, 1],
    ['eu', 'support', 33, 30.5, 1],
    ['eu', 'scout', 3, 36.7, 1],
    ['eu', 'scout', 28, -26, 1],
    ['eu', 'scout', -17.4, 14.7, 1],
    // Chinese Federation: Luoyang, the coast facing Area 11, Central Asia, India, Iran and the south.
    ['cf', 'super', 112.45, 34.6, 1, 'xingke'],
    ['cf', 'heavy', 113, 36, 2],
    ['cf', 'rocket', 110.5, 33.5, 1],
    ['cf', 'medium', 116.4, 39.9, 2],
    ['cf', 'scout', 118, 41, 3],
    ['cf', 'medium', 123.4, 41.8, 2, 'cao'],
    ['cf', 'support', 121.5, 39.5, 2],
    ['cf', 'support', 126.2, 39.4, 2, 'honggu'],
    ['cf', 'scout', 125, 41, 2],
    ['cf', 'light', 121.5, 31.2, 2],
    ['cf', 'assault', 119, 29.5, 2],
    ['cf', 'scout', 131.9, 43.1, 2],
    ['cf', 'light', 114.2, 22.3, 1],
    ['cf', 'raider', 108, 37, 2, 'xianglin'],
    ['cf', 'scout', 76.9, 43.2, 2],
    ['cf', 'scout', 87.6, 43.8, 1],
    ['cf', 'light', 106.9, 47.9, 1],
    ['cf', 'medium', 77.2, 28.6, 2, 'leifeng'],
    ['cf', 'assault', 79.95, 23.2, 2],
    ['cf', 'support', 72.9, 19, 1],
    ['cf', 'light', 51.4, 35.7, 2],
    ['cf', 'medium', 50, 34, 2],
    ['cf', 'scout', 58, 36.5, 1],
    ['cf', 'assault', 69.2, 34.5, 2],
    ['cf', 'rocket', 67, 25.5, 1],
    ['cf', 'heavy', 75.5, 29.5, 1],
    ['cf', 'scout', 103.8, 1.35, 1],
    ['cf', 'scout', 100.5, 13.7, 1],
    ['cf', 'scout', 124.2, 24.1, 1],
  ];
  // Neutral garrisons: [city, type, frames].
  const GARRISONS = [
    ['Sydney', 'sutherland', 2],
    ['Melbourne', 'glasgow', 2],
    ['Perth', 'glasgow', 1],
    ['Darwin', 'glasgow', 1],
    ['Baghdad', 'bamides', 2],
    ['Riyadh', 'bamides', 1],
    ['Damascus', 'glasgow', 2],
    ['Muscat', 'glasgow', 1],
  ];
  const ERAS = {
    world: {
      name: 'World War · 2017 a.t.b.',
      year: '2017 a.t.b.',
      desc: 'The Holy Britannian Empire holds the Americas, Area 11 and Euro Britannia; the Europia United holds Europe and Africa; the Chinese Federation holds Asia. Australia and the Middle Eastern Federation stand neutral.',
      rulesText:
        'A power surrenders when its capital falls: its cities pass to the conqueror and its armies disband. Take every rival capital, or hold the most cities at the 120-turn armistice.',
    },
  };

  // Operation difficulty, as in WC4. Normal is the operation as designed. Hard gives every rival power all tier I–II
  // HQ research, upgrades every other enemy unit one class and adds one unit per four. Challenge gives them all
  // research, upgrades every unit (with an extra frame), adds one unit per two and a richer treasury.
  const DIFFICULTIES = {
    normal: { name: 'Normal', level: 0, tokens: 1, desc: 'The world as it stands in 2017 a.t.b.' },
    hard: {
      name: 'Hard',
      level: 1,
      tokens: 1.5,
      techTier: 2,
      upgradeEvery: 2,
      extraPer: 4,
      ranks: 1,
      income: 1,
      desc: 'Rival powers have all tier I–II research, half their units are upgraded a class and there are more of them.',
    },
    challenge: {
      name: 'Challenge',
      level: 2,
      tokens: 2,
      techTier: 4,
      upgradeEvery: 1,
      extraPer: 2,
      stack: true,
      ranks: 2,
      income: 1.25,
      desc: 'Rival powers have every technology, every unit is upgraded with an extra frame, and their armies swell.',
    },
  };
  // One class up within each branch: a scout becomes an assault frame, a line frame a mainline frame, and so on.
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
  function upgradeType(type) {
    const t = TYPES[type],
      next = UPGRADE[t.cls];
    if (!next || t.side === 'neutral') return type;
    return typeFor(t.side, next);
  }
  function techUpToTier(tier) {
    return Object.fromEntries(
      Object.values(TECH_NODES)
        .map(n => [n.id, n.tiers.filter(t => t <= tier).length])
        .filter(([, l]) => l > 0),
    );
  }
  function harden(g, d) {
    const foes = [...MAJORS, 'neutral'].filter(side => side !== g.player),
      enemyUnits = g.units.filter(u => foes.includes(u.side));
    for (const side of foes) {
      g.tech[side] = techUpToTier(d.techTier);
      if (g.economy[side]) g.economy[side].credits = Math.round(g.economy[side].credits * d.income);
    }
    for (const [k, a] of Object.entries(COMMANDERS))
      if (a.side !== g.player) g.officers[k].rank = Math.min(RANKS.length - 1, g.officers[k].rank + d.ranks);
    enemyUnits.forEach((u, i) => {
      if (i % d.upgradeEvery === 0 && !(u.cmd && TYPES[u.type].cls === 'heavy')) u.type = upgradeType(u.type);
      if (d.stack) u.stack = Math.min(3, u.stack + 1);
    });
    // Reinforcements: copies of existing enemy units (never super-heavies) on free land hexes beside them.
    const extra = Math.ceil(enemyUnits.length / d.extraPer);
    for (let n = 0, tries = 0; n < extra && tries < extra * 6; tries++) {
      const src = enemyUnits[Math.floor(random(g) * enemyUnits.length)],
        spot = adjacent(g, src).find(
          p =>
            !isSea(p) &&
            !TERRAIN[p.terrain]?.blocked &&
            !unitAt(g, p) &&
            (!stationAt(g, p) || stationAt(g, p).owner === src.side),
        );
      if (!spot) continue;
      const type = TYPES[src.type].cls === 'super' ? typeFor(src.side, 'heavy') : src.type;
      newUnit(g, type, src.side, spot.c, spot.r, src.stack);
      n++;
    }
    for (const u of g.units)
      if (foes.includes(u.side)) {
        u.hpTech = unitTech(g, u, 'hull');
        u.hp = maxHP(u);
      }
    g.stations.forEach(st => fortify(g, st));
  }
  // Nearest tile to p (breadth-first, wrapping) that passes test.
  function nearest(g, p, test) {
    const start = tile(g, p.c, p.r),
      seen = new Set([key(start)]),
      queue = [start];
    while (queue.length) {
      const t = queue.shift();
      if (test(t)) return t;
      for (const n of adjacent(g, t))
        if (!seen.has(key(n))) {
          seen.add(key(n));
          queue.push(n);
        }
    }
    return null;
  }
  // mode: 'conquest' (the world war). The player's faction acts first; rivals follow in a fixed order.
  function createGame(player = 'britannia', difficulty = 'normal', mode = 'conquest', seed = 246801) {
    if (!MAJORS.includes(player)) player = 'britannia';
    const g = {
      game: 'knightmare',
      version: 1,
      rulesVersion: RULES_VERSION,
      player,
      difficulty,
      mode: 'conquest',
      era: 'world',
      order: [player, ...MAJORS.filter(s => s !== player)],
      seed,
      wrap: true,
      cols: WORLD.cols,
      rows: WORLD.rows,
      turn: 1,
      phase: player,
      nextId: 1,
      tiles: [],
      units: [],
      stations: [],
      log: [],
      strikes: [],
      fallen: {},
      economy: Object.fromEntries(
        [...MAJORS, 'neutral'].map(s => [s, { credits: s === 'neutral' ? 0 : 500, industry: 200, science: 40 }]),
      ),
      tech: { britannia: {}, eu: {}, cf: {}, neutral: {} },
      officers: Object.fromEntries(Object.keys(COMMANDERS).map(k => [k, defaultOfficer(k)])),
      roster: {},
      medalInventory: [],
      medalsEarned: [],
      over: null,
      stats: {},
    };
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++)
        g.tiles.push({ c, r, terrain: TERRAIN_CODES[WORLD_ROWS[r]?.[c]] || 'sea', owner: null });
    const freeLand = t => !isSea(t) && !TERRAIN[t.terrain].blocked;
    for (const [name, lon, lat, owner, tier, capital = false, fort = false, gun] of CITY_DATA) {
      const at = nearest(g, hexOf(lon, lat), t => freeLand(t) && !stationAt(g, t));
      const s = {
        id: g.stations.length,
        name,
        c: at.c,
        r: at.r,
        owner,
        tier,
        lab: capital ? 1 : 0,
        refinery: 0,
        capital,
        capitalOf: capital ? owner : null,
        fort,
        gun: gun || null,
        shield: capital ? 600 : fort ? 400 : 120 + 60 * tier,
        maxShield: capital ? 600 : fort ? 400 : 120 + 60 * tier,
        // Capitals: 50 plus the 15 their old refinery exported (refineries now need a Sakuradite deposit).
        income: capital ? 65 : tier === 3 ? 30 : tier === 2 ? 20 : 12,
        industry: capital ? 30 : 6 * tier,
        science: capital ? 10 : 1 + tier,
        producedTurn: 0,
      };
      at.terrain = 'plains';
      g.stations.push(s);
    }
    // Territory: each land hex belongs to the nearest city over land, out to 6 hexes.
    const frontier = g.stations.map(s => ({ t: tile(g, s.c, s.r), owner: s.owner, d: 0 })),
      seenT = new Set(frontier.map(f => key(f.t)));
    for (const f of frontier) f.t.owner = f.owner;
    while (frontier.length) {
      const f = frontier.shift();
      if (f.d >= 6) continue;
      for (const n of adjacent(g, f.t))
        if (!seenT.has(key(n)) && freeLand(n)) {
          seenT.add(key(n));
          n.owner = f.owner;
          frontier.push({ t: n, owner: f.owner, d: f.d + 1 });
        }
    }
    for (const [side, cls, lon, lat, stack, cmd] of ARMY_DATA) {
      const at = nearest(
        g,
        hexOf(lon, lat),
        t => freeLand(t) && !unitAt(g, t) && (!stationAt(g, t) || stationAt(g, t).owner === side),
      );
      if (at) newUnit(g, typeFor(side, cls), side, at.c, at.r, stack, cmd || null);
    }
    for (const [city, type, stack] of GARRISONS) {
      const s = g.stations.find(s => s.name === city);
      newUnit(g, type, 'neutral', s.c, s.r, stack);
    }
    setupSakuradite(g);
    if (DIFFICULTIES[difficulty]?.level) harden(g, DIFFICULTIES[difficulty]);
    for (const u of g.units)
      if (u.cmd) {
        u.cmdRank = g.officers[u.cmd].rank;
        u.hp = maxHP(u);
      }
    g.startUnits = Object.fromEntries(MAJORS.map(s => [s, g.units.filter(u => u.side === s).length]));
    log(g, ERAS.world.desc, player);
    log(g, ERAS.world.rulesText, player);
    return g;
  }

  // ======== AI ========
  // Path cost from every hex to the nearest city this side wants (rival capitals count extra), over land and sea.
  function goalField(g, side) {
    const field = new Float32Array(g.tiles.length).fill(Infinity),
      heap = [];
    const push = (i, d) => {
      heap.push([d, i]);
      let n = heap.length - 1;
      while (n > 0) {
        const p = (n - 1) >> 1;
        if (heap[p][0] <= heap[n][0]) break;
        [heap[p], heap[n]] = [heap[n], heap[p]];
        n = p;
      }
    };
    const pop = () => {
      const top = heap[0],
        last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let n = 0;
        for (;;) {
          const l = 2 * n + 1,
            r = l + 1;
          let m = n;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === n) break;
          [heap[m], heap[n]] = [heap[n], heap[m]];
          n = m;
        }
      }
      return top;
    };
    for (const s of g.stations)
      if (s.owner !== side) {
        // A rival's F.L.E.I.J.A. project outranks even a capital.
        const i = s.r * g.cols + s.c,
          d = s.project ? -8 : s.capitalOf && alive(g, s.owner) ? -6 : s.owner === 'neutral' ? 1 : 0;
        field[i] = d;
        push(i, d);
      }
    // Sakuradite mines held by others: Mount Fuji pulls almost like a capital.
    for (const d of g.sites || [])
      if (d.city == null && d.owner !== side) {
        const i = d.r * g.cols + d.c,
          w = d.base >= 30 ? -5 : -1;
        if (w < field[i]) {
          field[i] = w;
          push(i, w);
        }
      }
    while (heap.length) {
      const [d, i] = pop();
      if (d > field[i]) continue;
      const t = g.tiles[i];
      for (const n of adjacent(g, t)) {
        if (TERRAIN[n.terrain]?.blocked) continue;
        const j = n.r * g.cols + n.c,
          step = (isSea(n) !== isSea(t) ? 6 : 0) + (isSea(n) ? 1 : TERRAIN[n.terrain].cost),
          nd = d + step;
        if (nd < field[j]) {
          field[j] = nd;
          push(j, nd);
        }
      }
    }
    return field;
  }
  const aiMemo = new WeakMap();
  function aiPlan(g, side) {
    let memo = aiMemo.get(g);
    if (!memo) aiMemo.set(g, (memo = {}));
    if (!memo[side] || memo[side].turn !== g.turn)
      memo[side] = { turn: g.turn, field: goalField(g, side), guards: assignGuards(g, side) };
    return memo[side];
  }
  // Garrison duty: the capital always keeps two defenders (four when threatened); other cities with enemy units
  // within 3 hexes draw the nearest units back to defend them. Returns { unitId: city }.
  function assignGuards(g, side) {
    const own = g.units.filter(u => u.hp > 0 && u.side === side && !atSea(g, u)),
      foes = g.units.filter(u => u.hp > 0 && u.side !== side && u.side !== 'neutral'),
      taken = {},
      threat = s => foes.filter(f => dist(g, f, s) <= 3).reduce((a, f) => a + f.stack, 0);
    // A city building a F.L.E.I.J.A. warhead is guarded like the capital.
    const cities = g.stations
      .filter(s => s.owner === side)
      .map(s => ({ s, threat: threat(s), capital: s.capitalOf === side || s.project?.side === side }))
      .filter(c => c.capital || c.threat > 0)
      .sort((a, b) => b.capital - a.capital || b.s.tier - a.s.tier || b.threat - a.threat);
    for (const { s, threat: t, capital } of cities) {
      const need = capital ? (t > 0 ? 4 : 2) : Math.min(3, Math.ceil(t / 2));
      const near = own
        .filter(u => !taken[u.id] && dist(g, u, s) <= (capital ? 8 : 4))
        .sort((a, b) => dist(g, a, s) - dist(g, b, s));
      for (const u of near.slice(0, need)) taken[u.id] = { c: s.c, r: s.r, id: s.id };
    }
    // Own mines: Mount Fuji always keeps a guard; any threatened mine draws up to two.
    for (const d of g.sites || []) {
      if (d.city != null || d.owner !== side) continue;
      const t = threat(d),
        need = t > 0 ? Math.min(2, Math.ceil(t / 2)) : d.base >= 30 ? 1 : 0;
      const near = own.filter(u => !taken[u.id] && dist(g, u, d) <= 5).sort((a, b) => dist(g, a, d) - dist(g, b, d));
      for (const u of near.slice(0, need)) taken[u.id] = { c: d.c, r: d.r, site: d.id };
    }
    return taken;
  }
  // Enemy high command, run once at the start of each AI turn before its units act: batteries, repairs, saving for
  // super-heavies, upgrades, reinforcements, then stacked production up to a soft army cap.
  function aiProduction(g) {
    const side = g.phase,
      e = funds(g, side),
      foes = g.units.filter(u => u.hp > 0 && u.side !== side && u.side !== 'neutral'),
      own = () => g.units.filter(u => u.hp > 0 && u.side === side),
      front = p => {
        let best = 99;
        for (const u of foes) best = Math.min(best, dist(g, u, p));
        return best;
      },
      plan = ((g.ai ||= {})[side] ||= { saving: false }),
      memo = aiPlan(g, side);
    const bases = g.stations.filter(s => s.owner === side).sort((a, b) => front(a) - front(b));
    const yard3 = bases.filter(s => s.tier >= 3);
    const superType = typeFor(side, 'super'),
      superPrice = price(superType, 1, g, side);
    // 0. Fire every ready battery at the strongest enemy unit in range (the UI animates g.strikes).
    g.strikes = [];
    for (const s of bases) {
      const target = fortressTargets(g, s)
        .map(p => unitAt(g, p))
        .sort((a, b) => b.hp - a.hp || a.id - b.id)[0];
      if (target) {
        const shot = fireFortress(g, s.id, target.c, target.r);
        if (shot.ok) g.strikes.push(shot);
      }
    }
    // 0b. F.L.E.I.J.A.: launch a ready warhead at the most valuable target that spares its own units and cities
    // (the UI plays g.launches).
    g.launches = [];
    if ((g.arsenal?.[side] || 0) > 0) {
      const p = aiLaunchTarget(g, side),
        shot = p && launch(g, side, p.c, p.r);
      if (shot?.ok) g.launches.push(shot);
    }
    // 1. Repair badly damaged units resting at a friendly city (this spends their turn).
    for (const u of own()
      .filter(u => u.hp / maxHP(u) < 0.55 && nearFriendlyCity(g, u) && !atSea(g, u))
      .sort((a, b) => a.hp / maxHP(a) - b.hp / maxHP(b))) {
      if (e.credits - repairCost(u, g) >= 60) repair(g, u.id);
    }
    // 2. Decide whether to save for a super-heavy (at most two alive, needs a level-3 factory).
    const supers = own().filter(u => TYPES[u.type].cls === 'super').length;
    // Only start saving once the Sakuradite for it is in hand, so credits are not hoarded for a frame it cannot pay.
    if (!yard3.length || supers >= 2) plan.saving = false;
    else if (!plan.saving && g.turn >= 3 && (e.sakuradite || 0) >= superPrice.sakuradite && random(g) < 0.35)
      plan.saving = true;
    // 2b. F.L.E.I.J.A.: one warhead at a time. A power with the Sakuradite for it (or the income to gather it soon)
    // keeps that Sakuradite back, then saves credits and industry and starts the project in its best-lab city.
    const warCity =
      hasFleija(g, side) &&
      !g.stations.some(s => s.project?.side === side) &&
      !(g.arsenal?.[side] > 0) &&
      g.turn - (g.launched?.[side] ?? -Infinity) >= FLEIJA.aiRest
        ? fleijaCity(g, side, front)
        : null;
    plan.warhead = !!warCity && ((e.sakuradite || 0) >= FLEIJA.cost.sakuradite || income(g, side).sakuradite >= 15);
    if (plan.warhead && !projectReason(g, warCity)) {
      startProject(g, warCity.id);
      plan.warhead = false;
    }
    const warSaving = plan.warhead && (e.sakuradite || 0) >= FLEIJA.cost.sakuradite;
    if (plan.warhead) plan.saving = false;
    if (plan.saving) {
      const yard = yard3.find(s => canBuy(g, s, superType, 1));
      if (yard) {
        recruit(g, yard.id, superType, 1);
        plan.saving = false;
      }
    }
    const reserve = warSaving
      ? Math.min(e.credits, FLEIJA.cost.credits)
      : plan.saving
        ? Math.min(e.credits, superPrice.credits)
        : 60;
    const reserveInd = warSaving
      ? Math.min(e.industry, FLEIJA.cost.industry)
      : plan.saving
        ? Math.min(e.industry, superPrice.industry)
        : 0;
    const reserveSak = plan.warhead ? FLEIJA.cost.sakuradite : plan.saving ? superPrice.sakuradite : 0;
    const spendable = () => Math.max(0, e.credits - reserve);
    const affordable = c =>
      c.credits <= spendable() &&
      e.industry - (c.industry || 0) >= reserveInd &&
      (e.sakuradite || 0) - (c.sakuradite || 0) >= reserveSak;
    // Lighter frames leave enough Sakuradite for one heavy frame once a level-3 factory exists.
    const heavySak = yard3.length ? price(typeFor(side, 'heavy'), 1, g, side).sakuradite : 0;
    const keepsHeavy = (type, c) =>
      !c.sakuradite || TYPES[type].tier >= 3 || (e.sakuradite || 0) - c.sakuradite >= heavySak;
    // 3. Upgrade one building per turn when there is surplus: Sakuradite refineries first (richest deposit first),
    // then the lowest-level factory or lab at the safest city.
    if (!plan.saving && g.turn >= 2) {
      let upgraded = false;
      // A warhead needs a level-3 lab: from ten turns before the technology arrives, build up the project city's lab.
      const soon = g.turn >= (FLEIJA.aiTurn[g.difficulty] ?? FLEIJA.aiTurn.normal) - 10,
        prep = side !== g.player && MAJORS.includes(side) && soon ? fleijaCity(g, side, front) : null;
      if (prep && (prep.lab || 0) < FLEIJA.lab) {
        const cost = buildCost(prep, 'lab');
        if (spendable() - cost.credits >= 100 && affordable(cost)) upgraded = build(g, prep.id, 'lab').ok;
      }
      for (const d of (g.sites || []).filter(d => depositOwner(g, d) === side).sort((a, b) => b.base - a.base)) {
        const host = depositHost(g, d),
          cost = buildCost(host, 'refinery');
        if (upgraded) break;
        if ((host.refinery || 0) >= 3 || spendable() - cost.credits < 150 || !affordable(cost)) continue;
        upgraded = (d.city == null ? refine(g, d.id) : build(g, host.id, 'refinery')).ok;
        if (upgraded) break;
      }
      const options = bases
        .flatMap(s => ['factory', 'lab'].map(kind => ({ s, kind, level: buildingLevel(s, kind) })))
        .filter(o => o.level < 3)
        .sort((a, b) => a.level - b.level || front(b.s) - front(a.s) || random(g) - 0.5);
      const pick = options[0];
      if (
        !upgraded &&
        pick &&
        spendable() - buildCost(pick.s, pick.kind).credits >= 250 &&
        affordable(buildCost(pick.s, pick.kind))
      )
        build(g, pick.s.id, pick.kind);
    }
    // 4. Reinforce healthy Armor and Artillery units parked at a friendly city.
    for (const u of own()
      .filter(
        u =>
          u.stack < 3 &&
          !u.moved &&
          !u.attacked &&
          TYPES[u.type].branch !== 'Infantry' &&
          u.hp / maxHP(u) >= 0.7 &&
          nearFriendlyCity(g, u) &&
          !atSea(g, u),
      )
      .sort((a, b) => TYPES[b.type].cost - TYPES[a.type].cost)) {
      const c = reinforceCost(u.type, g, side);
      if (affordable(c) && keepsHeavy(u.type, c) && spendable() - c.credits >= 150) reinforce(g, u.id);
    }
    // 5. Build: front-line factories first; stack up when the budget allows. A soft cap keeps armies manageable.
    const cap = 14 + Math.round(bases.length * 0.9);
    let army = own().length;
    for (const [i, s] of bases.entries()) {
      if (army >= cap) break;
      // Tier-1 frames (no Sakuradite) follow as fallbacks when Sakuradite runs short.
      const menu = (
        s.tier >= 3
          ? ['heavy', 'siege', 'medium', 'rocket', 'light', 'assault', 'support', 'scout']
          : s.tier === 2
            ? ['medium', 'rocket', 'raider', 'light', 'support', 'assault', 'scout']
            : ['light', 'support', 'assault', 'scout']
      ).map(cls => typeFor(side, cls));
      const preferred = menu[Math.floor(random(g) * Math.min(menu.length, 3))];
      const share = i === bases.length - 1 ? 1 : 0.6;
      for (const type of [preferred, ...menu.filter(x => x !== preferred)]) {
        let built = false;
        for (let n = 3; n >= 1 && !built; n--) {
          const c = price(type, n, g, side);
          // Single frames may use the whole budget; stacks only this factory's share of it.
          if (
            !canBuy(g, s, type, n) ||
            !affordable(c) ||
            !keepsHeavy(type, c) ||
            (n > 1 && c.credits > spendable() * share)
          )
            continue;
          recruit(g, s.id, type, n);
          built = true;
          army++;
        }
        if (built) break;
      }
    }
  }
  function aiOrder(g, id) {
    const u = g.units.find(u => u.id === id);
    if (!u || !isReady(g, u)) return [];
    const events = [],
      memo = aiPlan(g, u.side),
      field = memo.field,
      guard = memo.guards?.[u.id],
      fieldAt = p => {
        const v = field[p.r * g.cols + p.c];
        return Number.isFinite(v) ? v : 60;
      };
    if (COMMANDERS[u.cmd]?.action && !feintReason(g, u)) {
      const r = feint(g, id);
      if (r.ok) events.push({ kind: 'feint', id, affected: r.affected });
    }
    const choose = () =>
      targets(g, u)
        .map(p => {
          const d = unitAt(g, p),
            s = stationAt(g, p),
            pr = preview(g, id, p.c, p.r);
          const score =
            pr.unit +
            pr.shield * 0.7 +
            (d && pr.unit >= d.hp ? 130 : 0) +
            (s ? 35 : 0) +
            (s?.capitalOf ? 60 : 0) +
            (s?.project ? 120 : 0) +
            (d?.cmd ? 30 : 0) -
            pr.counter * 0.5;
          return { p, score };
        })
        .sort((a, b) => b.score - a.score)[0];
    if (!u.moved && !u.attacked) {
      const spots = [...reachable(g, u).keys()].map(k => {
        const [c, r] = k.split(',').map(Number);
        return tile(g, c, r);
      });
      const enemies = g.units.filter(v => v.hp > 0 && v.side !== u.side && dist(g, v, u) <= 10);
      const old = { c: u.c, r: u.r };
      // Overseas invasions sail in groups: a land unit embarks only beside two other free land units.
      const fromLand = !atSea(g, u),
        convoy =
          fromLand &&
          g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && !atSea(g, v) && !memo.guards?.[v.id] && dist(g, v, u) <= 2)
            .length >= 2;
      const placeScore = p => {
        const station = stationAt(g, p);
        let sc = station && station.owner !== u.side && station.shield === 0 ? 400 + (station.capitalOf ? 600 : 0) : 0;
        const mine = siteAt(g, p);
        if (mine && mine.owner !== u.side && canCapture(u)) sc += mine.base >= 30 ? 550 : 250;
        sc -= guard ? dist(g, p, guard) * 30 - (p.c === guard.c && p.r === guard.r ? 25 : 0) : fieldAt(p) * 8;
        let nearestEnemy = 15,
          danger = 0;
        for (const v of enemies) {
          const d = dist(g, v, p);
          nearestEnemy = Math.min(nearestEnemy, d);
          if (d <= 1) danger++;
        }
        if (isSea(p)) sc -= 20 + danger * 40 + (nearestEnemy <= 2 ? 30 : 0) + (fromLand && (!convoy || guard) ? 1000 : 0);
        if (TYPES[u.type].branch === 'Artillery') {
          sc -= danger * 28;
          sc -= Math.abs(nearestEnemy - TYPES[u.type].max) * 6;
        } else sc -= nearestEnemy * 2;
        if (station?.owner === u.side && u.hp / maxHP(u) < 0.5) sc += 20;
        return sc;
      };
      let best = null,
        bestScore = -Infinity;
      for (const p of spots) {
        let sc = placeScore(p);
        u.c = p.c;
        u.r = p.r;
        reindex(g, u, old);
        const shot = choose();
        u.c = old.c;
        u.r = old.r;
        reindex(g, u, p);
        if (shot) sc += shot.score * 0.6;
        if (sc > bestScore) {
          bestScore = sc;
          best = p;
        }
      }
      const current = choose(),
        stay = placeScore(tile(g, u.c, u.r)) + (current ? current.score * 0.6 : 0);
      if (best && bestScore > stay + 4) {
        const m = move(g, id, best.c, best.r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    }
    for (let chain = 0; chain < 8 && !u.attacked && !g.over && u.hp > 0; chain++) {
      const shot = choose();
      if (!shot) break;
      const a = attack(g, id, shot.p.c, shot.p.r);
      if (a.ok) events.push({ kind: 'attack', ...a, id });
      else break;
    }
    return events;
  }
  root.Knightmare = {
    FACTIONS,
    MAJORS,
    CLASSES,
    CLASS_ORDER,
    TYPES,
    ROSTER,
    typeFor,
    COMMANDERS,
    TERRAIN,
    WORLD,
    hexOf,
    lonLatOf,
    reinforceCost,
    repairCost,
    BUILDINGS,
    buildingLevel,
    buildCost,
    build,
    FORTRESS_GUN,
    fortressName,
    fortressReady,
    fortressDamage,
    fortressTargets,
    fireFortress,
    ERAS,
    ARMISTICE,
    objectiveText,
    modeTitle,
    TECH_TREE,
    TECH_NODES,
    TECH_TIERS,
    TOKEN_REWARD,
    DIFFICULTIES,
    UPGRADE,
    operationKey,
    ROMAN,
    BRANCHES,
    BRANCH_NAMES,
    branchOf,
    techLevel,
    techValue,
    applyTech,
    missionReward,
    fortressRecharge,
    rangeOf,
    RANKS,
    RANK_HP,
    PROMOTE_COST,
    MEDALS,
    officer,
    medalSlots,
    moraleFloor,
    STARTERS,
    recruitPrice,
    roster,
    owns,
    officerOf,
    applyRoster,
    recruitReason,
    recruitCommander,
    MAX_RATING,
    starCost,
    starReason,
    buyStar,
    promoteCost,
    promote,
    equipMedal,
    unequipMedal,
    applyProfile,
    exportProfile,
    shortfall,
    repairReason,
    reinforceReason,
    buyReason,
    buildReason,
    researchReason,
    assignReason,
    feintReason,
    promoteReason,
    equipReason,
    clamp,
    key,
    distance,
    opponents: side => MAJORS.filter(s => s !== side),
    alive,
    tile,
    adjacent,
    within,
    unitAt,
    stationAt,
    random,
    log,
    maxHP,
    migrateSave,
    newUnit,
    movement,
    seaMove,
    atSea,
    isSea,
    reachable,
    hasOrders,
    targets,
    preview,
    move,
    attack,
    income,
    price,
    canBuy,
    recruitOptions,
    recruit,
    reinforce,
    repair,
    researchCost,
    research,
    assign,
    feint,
    beginTurn,
    checkVictory,
    createGame,
    goalField,
    aiProduction,
    aiOrder,
    canCapture,
    // Sakuradite.
    SAKURADITE,
    RESOURCE_SITES,
    RULES_VERSION,
    setupSakuradite,
    depositHost,
    depositOwner,
    depositOf,
    depositYield,
    siteAt,
    cityYield,
    refineReason,
    refine,
    // F.L.E.I.J.A.
    FLEIJA,
    hasFleija,
    devastated,
    projectReason,
    startProject,
    launchReason,
    launch,
    blastArea,
    targetName,
    aiLaunchTarget,
  };
  if (typeof module !== 'undefined') module.exports = root.Knightmare;
})(typeof window !== 'undefined' ? window : globalThis);

  // ---- The Euro Britannia War (Akito the Exiled, 2017, and the fall of Europia, 2018) ----
  const EB = 'eb';
  // Narva: forest road the 132nd Regiment retreats along, Farnese's G-1 to the east.
  const NARVA = [
    'ffffffppppppppppppffff',
    'fffffppppppppppppppfff',
    'ffffpppfffffppppfffffp',
    'fffppfffffffffppfffffp',
    'ffpppffffmmffffppffppp',
    'fppppfffmmmfffpppppppp',
    'pppppffffmffffpppppppp',
    'fppppffffffffppppfffpp',
    'ffpppfffffffpppffffffp',
    'fffppppfffffppfffffffp',
    'ffffppppfffpppffffffpp',
    'fffffppppppppppfffffff',
    'ffffffppppppppppffffff',
  ];
  // A land bridge over a ravine on the road to Ryo's hideout.
  const RAVINE = [
    'ffffffmmmmmmffffff',
    'fffffpppmmmpppffff',
    'ffffppppmmpppppfff',
    'fffpppp..pppppppff',
    'pppppp....pppppppp',
    'pppppppppppppppppp',
    'pppppp....pppppppp',
    'fffpppp..pppppppff',
    'ffffppppmmpppppfff',
    'fffffpppmmmpppffff',
    'ffffffmmmmmmffffff',
  ];
  // Slonim: the town and its cathedral in the Belarusian forest, long-range cannons on the flanks.
  const SLONIM = [
    'ffffffffppppppffffffff',
    'fffffffppppppppfffffff',
    'ffffffpppuuuupppffffff',
    'fffffppuuuuuuuppffffff',
    'ffffpppuuuuuuuuppfffff',
    'fffppppuuuuuuuupppffff',
    'ffpppppppuuuupppppppff',
    'fffppppppppppppppfffff',
    'ffffpppfffppppfffffppf',
    'fffffffffffpppffffffpp',
    'ffffffffffppppfffffppp',
    'fffffffffpppppffffpppp',
    'ffffffffpppppppfffpppp',
  ];
  // The Gallia Grande, Kingsley's 300-metre "Ark": its deck drawn as land, open air around it.
  const GALLIA = [
    '......................',
    '...uuuuuuuuuuuuuuu....',
    '..uuuuxuuuuuuxuuuuu...',
    '.uuuuuxuuuuuuxuuuuuu..',
    'uuuuuuuuuuuuuuuuuuuuu.',
    'uuuuuuuuuuxxuuuuuuuuuu',
    'uuuuuuuuuuxxuuuuuuuuuu',
    'uuuuuuuuuuuuuuuuuuuuu.',
    '.uuuuuxuuuuuuxuuuuuu..',
    '..uuuuxuuuuuuxuuuuu...',
    '...uuuuuuuuuuuuuuu....',
    '......................',
  ];
  // Sankt Petersburg: the Neva splits the capital; Caesar's Palace on the east bank.
  const PETERSBURG = [
    'uuuuuuu.......uuuuuuuu',
    'uuuuuuuu.....uuuuuuuuu',
    'uuuuuuuuu...uuuuuuuuuu',
    'uuuuuuuuuu..uuuuuuuuuu',
    'uuuuuuuuuuu.uuuuuuuuuu',
    'uuuuuuuuuuuuuuuuuuuuuu',
    'uuuuuuuuuuu.uuuuuuuuuu',
    'uuuuuuuuuu..uuuuuuuuuu',
    'uuuuuuuuuu.uuuuuuuuuuu',
    'ppuuuuuuuu.uuuuuuuuupp',
    'pppuuuuuuuuuuuuuuuuppp',
    'ppppuuuuuu.uuuuuuupppp',
    'pppppuuuuu.uuuuuuppppp',
  ];
  // Castle Weisswolf: a walled fortress in the mountains, a minefield across the western approach.
  const WEISSWOLF = [
    'ffffffppppppppmmmmmmmm',
    'fffffpppppppppmmmmmmmm',
    'ffffppppppppppmxxxxxmm',
    'fffppppppppppppxuuuxmm',
    'ffppppppccpppppxuuuxmm',
    'fpppppppccpppppuuuuxmm',
    'ppppppppppppppuuuuuxmm',
    'fpppppppccpppppuuuuxmm',
    'ffppppppccpppppxuuuxmm',
    'fffppppppppppppxuuuxmm',
    'ffffppppppppppmxxxxxmm',
    'fffffpppppppppmmmmmmmm',
    'ffffffppppppppmmmmmmmm',
  ];
  // Paris: the Seine with three bridges, the Élysée on the north bank.
  const PARIS = [
    'ffppppuuuuuuuuuuppppff',
    'fppppuuuuuuuuuuuupppff',
    'pppuuuuuuuuuuuuuuuuppf',
    'ppuuuuuuuuuuuuuuuuuupp',
    'puuuuuuuuuuuuuuuuuuuup',
    '.....u.....u....u.....',
    'puuuuuuuuuuuuuuuuuuuup',
    'ppuuuuuuuuuuuuuuuuuupp',
    'pppuuuuuuuuuuuuuuuuppp',
    'ffppuuuuuuuuuuuuuupppf',
    'fffppuuuuuuuuuuuuppfff',
    'ffffppppuuuuuupppfffff',
    'fffffppppppppppppfffff',
  ];
  // The eastern front from Moscow to Warsaw (the European Front mission's map).
  const EASTERN_FRONT = [
    'sssssfffffppppppppfffsss',
    'ssssffffpppppppppppffsss',
    'fffffppppppppfffppppppff',
    'ffppppppppppfffffppppppp',
    'pppppppppppppfffpppppppp',
    'ppppfffppppppppppppfffpp',
    'pppfffffpppppppppppfffpp',
    'pppppfppppppmmmpppppppff',
    'ppppppppppmmmmmppppppfff',
    'fppppppppppmmmpppppppfff',
    'ffpppppfffppppppppppppff',
    'fffppppffffppppppppppppp',
    'ffffppppppppppppfffppppp',
    'fffffppppppppppfffffpppp',
  ];

  const NARVA_CITIES = [
    ['132nd Regiment Column', 3, 1, 'eu', 2],
    ['Narva Road', 11, 0, 'eu', 1],
    ['wZERO Drop Zone', 2, 10, 'eu', 1],
    ['Narva Forest Camp', 14, 9, EB, 1],
    ['Euro-Britannian G-1', 19, 6, EB, 3],
  ];
  const NARVA_EU = [
    ['eu', 'alexander', 3, 9, 1, 'akito', { hold: false }],
    ['eu', 'alexander', 2, 9, 2, null, { hold: false }],
    ['eu', 'alexander', 4, 10, 2, null, { hold: false }],
    ['eu', 'alexander', 3, 11, 1, null, { hold: false }],
    ['eu', 'alexander', 1, 10, 1, null, { hold: false }],
    ['eu', 'panzer_hummel', 3, 1, 2, null, { hold: 1 }],
    ['eu', 'estrella', 11, 0, 1, null, { hold: 1 }],
  ];
  const NARVA_EB = [
    [EB, 'gloucester', 19, 6, 1, 'farnese', { hold: 1 }],
    [EB, 'gloucester', 15, 5, 2],
    [EB, 'gloucester', 16, 8, 2],
    [EB, 'sutherland', 12, 4, 2],
    [EB, 'sutherland', 13, 7, 2],
    [EB, 'sutherland', 10, 2, 1],
    [EB, 'sutherland', 14, 9, 1, null, { hold: 1 }],
    [EB, 'glasgow', 17, 3, 1],
    [EB, 'liverpool', 18, 7, 1],
  ];
  const NARVA_MANFREDI = {
    turn: 6,
    say: [['manfredi', 'The Knights of St. Michael ride to Narva. Let the E.U. see what true knights are.']],
    spawn: [
      [EB, 'gloucester', 21, 6, 2, 'manfredi'],
      [EB, 'sutherland', 21, 8, 2],
    ],
  };

  const SLONIM_CITIES = [
    ['Euro-Britannian G-1', 2, 1, EB, 2],
    ['Long-Range Cannon North', 3, 6, EB, 1, { fort: true, gun: 'Long-range cannon' }],
    ['Transfiguration Cathedral', 9, 3, EB, 1],
    ['Slonim', 12, 4, EB, 2],
    ['Long-Range Cannon South', 6, 11, EB, 1, { fort: true, gun: 'Long-range cannon' }],
    ['wZERO Landing Zone', 20, 11, 'eu', 1],
  ];
  const SLONIM_EU = [
    ['eu', 'elite_leila_alexander', 20, 10, 1, 'leila'],
    ['eu', 'alexander', 19, 11, 1, 'akito'],
    ['eu', 'alexander', 21, 10, 1, 'ryo'],
    ['eu', 'alexander', 19, 12, 1, 'ayano'],
    ['eu', 'alexander', 21, 12, 1, 'yukiya'],
    ['eu', 'alexander_drone', 18, 11, 1],
    ['eu', 'alexander_drone', 20, 12, 1],
    ['eu', 'alexander_drone', 21, 11, 1],
    ['eu', 'alexander_drone', 17, 12, 1],
  ];
  const SLONIM_EB = [
    [EB, 'gloucester', 14, 7, 1, 'ashley', { hold: false }],
    [EB, 'gloucester', 13, 8, 2, null, { hold: false }],
    [EB, 'gloucester', 15, 6, 2, null, { hold: false }],
    [EB, 'gloucester', 12, 9, 1, null, { hold: false }],
    [EB, 'liverpool', 16, 9, 1, null, { hold: false }],
    [EB, 'liverpool', 17, 10, 1, null, { hold: false }],
    [EB, 'liverpool', 11, 11, 1],
    [EB, 'sutherland', 12, 4, 2, null, { hold: 2 }],
    [EB, 'sutherland', 9, 3, 1, null, { hold: 1 }],
    [EB, 'sutherland', 10, 6, 2],
    [EB, 'sutherland', 2, 1, 1, null, { hold: 1 }],
  ];
  const SLONIM_BARRAGE = {
    turn: 2,
    say: [[null, 'Ultra-long-range cannons open fire on the landing zone.']],
    blast: { c: 20, r: 11, damage: [0.3, 0.2], sides: ['eu'], color: '#ffb36b', name: 'Long-range barrage' },
  };
  const SLONIM_SHIN = {
    turn: 5,
    say: [
      ['shin', 'Akito... So you are alive, and wearing the E.U.’s colors. Come with me, little brother.'],
      ['akito', 'Shin!'],
    ],
    spawn: [[EB, 'vercingetorix', 13, 2, 1, 'shin']],
  };

  const ARK_CITIES = [
    ['Boarding Point', 1, 5, 'eu', 1],
    ['Engine Section', 8, 2, EB, 1],
    ['Drone Hangar', 8, 9, EB, 1],
    ['Sakuradite Core', 15, 5, EB, 1],
    ['Gallia Grande Bridge', 19, 6, EB, 2],
  ];
  const ARK_EU = [
    ['eu', 'alexander', 2, 5, 1, 'akito'],
    ['eu', 'elite_ryo_valiant', 2, 4, 1, 'ryo'],
    ['eu', 'elite_ayano_valiant', 2, 6, 1, 'ayano'],
    ['eu', 'elite_yukiya_valiant', 1, 6, 1, 'yukiya'],
  ];
  const ARK_EB = [
    [EB, 'ahura_mazda', 18, 5, 1, 'ashley'],
    [EB, 'sutherland', 8, 2, 2, null, { hold: 1 }],
    [EB, 'sutherland', 8, 9, 2, null, { hold: 1 }],
    [EB, 'sutherland', 12, 4, 1],
    [EB, 'sutherland', 12, 7, 1],
    [EB, 'sutherland', 15, 5, 1, null, { hold: 1 }],
    [EB, 'sutherland', 17, 3, 1],
    [EB, 'sutherland', 17, 8, 1],
    [EB, 'glasgow', 5, 3, 1],
    [EB, 'glasgow', 5, 8, 1],
  ];
  const ARK_BOMBS = [
    [8, 2],
    [8, 9],
    [15, 5],
  ];
  const ARK_WARNING = {
    turn: 4,
    say: [
      [null, 'Time bombs! Charges are counting down all over the ship.'],
      ['ashley', 'Shin...? You sent me here as bait?'],
    ],
    warn: ARK_BOMBS.map(([c, r]) => ({ c, r, radius: 1, label: 'Time bomb' })),
  };
  const ARK_BLAST = {
    turn: 5,
    say: [[null, 'The Gallia Grande tears itself apart.']],
    blast: ARK_BOMBS.map(([c, r]) => ({ c, r, damage: [0.8, 0.5], color: '#ffb36b', name: 'Time bomb' })),
  };

  const WEISSWOLF_CITIES = [
    ['St. Michael Camp', 1, 6, EB, 2],
    ['Outer Defense Line', 12, 6, 'eu', 1],
    ['Apollo’s Chariot Silo', 17, 3, 'eu', 1],
    ['Castle Weisswolf', 17, 6, 'eu', 3, { fort: true, gun: 'Weisswolf' }],
    ['Weisswolf Hangar', 17, 9, 'eu', 1],
  ];
  const SIEGE_EB = [
    [EB, 'vercingetorix', 2, 6, 1, 'shin'],
    [EB, 'gloucester', 3, 5, 2],
    [EB, 'gloucester', 3, 7, 2],
    [EB, 'gloucester', 2, 4, 2],
    [EB, 'sutherland', 4, 6, 2],
    [EB, 'sutherland', 4, 4, 2],
    [EB, 'sutherland', 4, 8, 2],
    [EB, 'canterbury', 1, 5, 1],
    [EB, 'liverpool', 1, 7, 1],
  ];
  const SIEGE_EU = [
    ['eu', 'elite_leila_alexander', 17, 6, 1, 'leila', { hold: 1 }],
    ['eu', 'panzer_hummel', 16, 4, 1, null, { hold: 1 }],
    ['eu', 'panzer_hummel', 16, 8, 1, null, { hold: 1 }],
    ['eu', 'hummel_battery', 18, 6, 1, null, { hold: 1 }],
    ['eu', 'gardmare', 13, 5, 1, null, { hold: 2 }],
    ['eu', 'gardmare', 13, 7, 1, null, { hold: 2 }],
    ['eu', 'estrella', 12, 6, 2, null, { hold: 1 }],
    ['eu', 'alexander_drone', 10, 5, 1],
    ['eu', 'alexander_drone', 10, 7, 1],
    ['eu', 'alexander_drone', 11, 3, 1],
  ];
  const SIEGE_EVENTS = [
    {
      turn: 2,
      say: [[null, 'The minefield erupts under the Knights of St. Michael’s vanguard.']],
      blast: { c: 8, r: 6, damage: [0.45, 0.3], sides: [EB], color: '#ffb36b', name: 'Minefield' },
    },
    {
      turn: 4,
      say: [
        ['klaus', 'This is Major Warwick. Weisswolf will surrender, if you spare everyone inside.'],
        ['shin', 'A sensible man. Open the gates, Major.'],
      ],
      shield: { city: 'Castle Weisswolf', value: 0 },
    },
    {
      turn: 5,
      say: [
        ['akito', 'Leila, we’re back. Hold on.'],
        ['ashley', 'Shin left me to burn on that ship. I owe him one.'],
      ],
      spawn: [
        ['eu', 'alexander', 16, 1, 1, 'akito'],
        ['eu', 'elite_ryo_valiant', 17, 1, 1, 'ryo'],
        ['eu', 'elite_ayano_valiant', 15, 1, 1, 'ayano'],
        ['eu', 'alexander_elite', 18, 1, 1, 'ashley'],
      ],
    },
    {
      turn: 6,
      say: [
        ['yukiya', 'Special delivery from what’s left of the Gallia Grande. All of its Sakuradite!'],
        [null, 'The bomb lands among the Knights of St. Michael.'],
      ],
      blast: { c: 5, r: 6, damage: [0.9, 0.7, 0.5], sides: [EB], color: '#ff9ad5', name: 'Sakuradite bomb' },
    },
  ];

  const ASSAULT_CITIES = [...WEISSWOLF_CITIES, ['Jean’s Bomb Site', 13, 3, EB, 1]];
  const ASSAULT_EB = [
    [EB, 'vercingetorix', 8, 6, 1, 'shin'],
    [EB, 'gloucester', 9, 4, 2],
    [EB, 'gloucester', 9, 8, 2],
    [EB, 'gloucester', 10, 6, 2],
    [EB, 'canterbury', 5, 6, 1],
    [EB, 'sutherland', 7, 3, 2],
    [EB, 'sutherland', 7, 9, 2],
    [EB, 'liverpool', 6, 5, 1],
  ];
  const ASSAULT_EU = [
    ['eu', 'elite_alexander_liberte', 14, 6, 1, 'akito'],
    ['eu', 'elite_ryo_valiant', 13, 4, 1, 'ryo'],
    ['eu', 'elite_ayano_valiant', 13, 8, 1, 'ayano'],
    ['eu', 'elite_yukiya_valiant', 16, 4, 1, 'yukiya'],
    ['eu', 'alexander_elite', 12, 6, 1, 'ashley'],
    ['eu', 'elite_leila_alexander', 17, 6, 1, 'leila', { hold: 1 }],
    ['eu', 'hummel_battery', 18, 6, 1, null, { hold: 1 }],
    ['eu', 'panzer_hummel', 16, 8, 1, null, { hold: 1 }],
  ];
  const ASSAULT_OPENING = {
    turn: 1,
    say: [
      ['shin', 'My goal is to destroy this world. Akito, come out and face me.'],
      ['akito', 'Shin. This ends between us.'],
      ['Jean@eb', 'The bomb is in place, Shin-sama. On your word.'],
    ],
  };

  const PARIS_CITIES = owners => [
    ['Gare du Nord', 15, 1, owners.north, 1],
    ['Élysée Palace', 12, 3, owners.palace, 3, { fort: true, gun: 'Élysée' }],
    ['Les Invalides', 7, 7, owners.north, 2],
    ['Bois de Vincennes', 18, 9, owners.east, 1],
    ['Saint-Denis Landing', 3, 11, owners.landing, 1],
  ];

  const EASTERN_CITIES = [
    ['Moscow', 21, 4, EB, 3],
    ['Smolensk', 15, 9, 'eu', 1],
    ['Minsk', 10, 5, 'eu', 2],
    ['Vilnius', 6, 2, 'eu', 1],
    ['Warsaw', 2, 7, 'eu', 3, { fort: true, gun: 'Warsaw' }],
  ];
  const EASTERN_EB = [
    [EB, 'vercingetorix', 20, 6, 1, 'shin'],
    [EB, 'gloucester', 21, 8, 2, 'julius'],
    [EB, 'gracchus', 19, 9, 2, 'ashley'],
    [EB, 'gracchus', 19, 4, 2],
    [EB, 'gracchus', 18, 7, 1, 'farnese'],
    [EB, 'sutherland', 20, 3, 2, 'augustus'],
    [EB, 'sutherland', 18, 10, 2, 'kewell'],
    [EB, 'sutherland', 21, 11, 1],
    [EB, 'liverpool', 22, 6, 1],
    [EB, 'liverpool', 22, 9, 1],
  ];
  const EASTERN_EU = [
    ['eu', 'elite_leila_alexander', 6, 7, 1, 'leila'],
    ['eu', 'alexander_elite', 8, 6, 1, 'akito'],
    ['eu', 'alexander', 9, 8, 1, 'ryo'],
    ['eu', 'alexander', 8, 9, 1, 'ayano'],
    ['eu', 'alexander_mp', 7, 5, 1, 'yukiya'],
    ['eu', 'panzer_hummel', 4, 6, 2, null, { hold: 2 }],
    ['eu', 'panzer_hummel', 5, 9, 2, null, { hold: 2 }],
    ['eu', 'panzer_hummel', 3, 4, 1, null, { hold: 2 }],
    ['eu', 'gardmare', 11, 6, 2],
    ['eu', 'estrella', 10, 4, 2],
    ['eu', 'estrella', 12, 8, 1],
    ['eu', 'alexander_drone', 13, 3, 2],
  ];


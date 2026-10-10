  // ---- Season 2 missions added with the season split ----
  const PACIFIC_CITIES = [
    ['Black Knights Carrier', 2, 6, K, 2],
    ['Escort North', 17, 2, B, 1],
    ['Governor’s Flagship', 20, 6, B, 3, { fort: true, gun: 'Flagship' }],
    ['Escort South', 17, 10, B, 1],
  ];
  const PACIFIC_BK = [
    [K, 'akatsuki_flight', 3, 6, 1, 'zero'],
    [K, 'elite_guren_mkii', 4, 5, 1, 'kallen'],
    [K, 'zangetsu', 3, 7, 1, 'tohdoh'],
    [K, 'akatsuki_flight', 2, 5, 1, 'chiba'],
    [K, 'akatsuki_flight', 2, 7, 1, 'asahina'],
    [K, 'akatsuki_flight', 4, 7, 2, 'ohgi'],
    [K, 'akatsuki_flight', 4, 4, 1, 'minami'],
  ];
  const PACIFIC_BRIT = [
    [B, 'elite_lancelot', 16, 6, 1, 'suzaku', { hold: false }],
    [B, 'brighton', 17, 4, 1, 'gino', { hold: false }],
    [B, 'elite_mordred', 19, 7, 1, 'anya'],
    [B, 'vincent_commander', 20, 5, 1, 'guilford', { hold: 1 }],
    [B, 'sutherland_air', 14, 3, 2, null, { hold: false }],
    [B, 'sutherland_air', 14, 9, 2, null, { hold: false }],
    [B, 'sutherland_air', 17, 2, 1, null, { hold: 1 }],
    [B, 'sutherland_air', 17, 10, 1, null, { hold: 1 }],
    [B, 'vincent_ward', 18, 6, 2],
  ];

  const BAY_CITIES = [
    ['Yokosuka Shore', 1, 6, B, 2],
    ['Destroyer North', 9, 2, B, 1, { fort: true, gun: 'Destroyer' }],
    ['Destroyer South', 9, 9, B, 1, { fort: true, gun: 'Destroyer' }],
    ['Black Knights Submarine', 10, 6, K, 2],
    ['Destroyer East', 16, 2, B, 1, { fort: true, gun: 'Destroyer' }],
    ['Destroyer South-East', 16, 9, B, 1, { fort: true, gun: 'Destroyer' }],
    ['Britannian Flagship', 18, 5, B, 3, { fort: true, gun: 'Flagship' }],
  ];
  const BAY_BK = [
    [K, 'akatsuki', 10, 5, 1, 'zero'],
    [K, 'elite_guren_mkii', 11, 5, 1, 'kallen'],
    [K, 'zangetsu', 9, 6, 1, 'tohdoh'],
    [K, 'akatsuki', 12, 6, 1, 'chiba'],
    [K, 'akatsuki', 10, 7, 1, 'asahina'],
    [K, 'akatsuki', 11, 7, 2, 'ohgi'],
    [K, 'akatsuki_missile', 12, 4, 1],
  ];
  const BAY_BRIT = [
    [B, 'vincent_commander', 18, 5, 1, 'guilford'],
    [B, 'sutherland_air', 9, 2, 1],
    [B, 'sutherland_air', 16, 2, 1],
    [B, 'sutherland_air', 9, 9, 1],
    [B, 'sutherland_air', 16, 9, 1],
    [B, 'vincent_ward', 2, 6, 2],
    [B, 'vincent_ward', 3, 4, 2],
    [B, 'sutherland', 2, 9, 2],
  ];
  const WATER_WALL = [
    [9, 2],
    [9, 9],
    [16, 2],
    [16, 9],
    [18, 5],
  ].map(([c, r]) => ({ c, r, damage: [0.7, 0.4], sides: [B], color: '#7fd3ff', name: 'Water wall' }));

  const XIAOPEI_CITIES = [
    ['Black Knights Column', 2, 6, K, 2],
    ['Federation Camp North', 10, 1, 'cf', 1],
    ['Xiaopei', 9, 6, 'cf', 2],
    ['Federation Camp South', 10, 11, 'cf', 1],
  ];
  const FEDERATION = { cf: { name: 'Federation Army', short: 'Federation', adj: 'Federation' } };
  const XIAOPEI_BK = [
    [K, 'akatsuki', 2, 6, 1, 'zero'],
    [K, 'elite_guren_mkii', 3, 5, 1, 'kallen'],
    [K, 'zangetsu', 3, 7, 1, 'tohdoh'],
    [K, 'akatsuki_zikisan', 4, 6, 1, 'chiba'],
    [K, 'akatsuki_zikisan', 2, 4, 1, 'asahina'],
    [K, 'akatsuki', 2, 8, 2, 'ohgi'],
    [K, 'akatsuki', 4, 8, 2, 'senba'],
    [K, 'akatsuki_missile', 1, 6, 1],
  ];
  const XIAOPEI_CF = [
    ['cf', 'shen_hu', 9, 6, 1, 'xingke', { hold: false }],
    ['cf', 'gun_ru', 8, 4, 2, 'xianglin'],
    ['cf', 'gun_ru', 8, 8, 2],
    ['cf', 'chuyen', 10, 1, 1],
    ['cf', 'gun_ru', 11, 2, 2],
    ['cf', 'chuyen', 10, 11, 1],
    ['cf', 'gun_ru', 11, 10, 2],
    ['cf', 'gun_ru', 13, 5, 2],
    ['cf', 'gun_ru', 13, 7, 2],
    ['cf', 'gekka_rocket', 12, 6, 1],
    ['cf', 'gun_ru', 16, 4, 2, null, { hold: 1 }],
    ['cf', 'gun_ru', 16, 10, 2, null, { hold: 1 }],
  ];
  const KALLEN_CAPTURED = {
    turn: 4,
    say: [
      ['xingke', 'The Guren is disabled. Take its pilot alive.'],
      ['kallen', 'Let go of me! Zero, keep moving. Don’t come back for me!'],
    ],
    remove: ['kallen'],
  };

  const KAGOSHIMA_CITIES = [
    ['Kirishima Base', 13, 2, B, 2],
    ['Kagoshima Settlement', 6, 5, B, 3, { fort: true, gun: 'Kagoshima' }],
    ['Kagoshima Port', 8, 7, B, 2],
    ['UFN Beachhead West', 3, 11, K, 1],
    ['UFN Beachhead East', 18, 11, 'cf', 1],
  ];
  const KAGOSHIMA_BK = [
    [K, 'zangetsu', 3, 11, 1, 'tohdoh'],
    [K, 'elite_guren_seiten', 4, 10, 1, 'kallen'],
    [K, 'akatsuki_zikisan', 2, 10, 1, 'chiba'],
    [K, 'akatsuki_zikisan', 4, 12, 1, 'asahina'],
    [K, 'akatsuki', 3, 9, 2, 'ohgi'],
    [K, 'akatsuki', 5, 9, 2, 'sugiyama'],
    [K, 'akatsuki', 5, 11, 2, 'minami'],
    [K, 'akatsuki_missile', 2, 11, 1],
  ];
  const KAGOSHIMA_CF = [
    ['cf', 'shen_hu', 18, 11, 1, 'xingke'],
    ['cf', 'gun_ru', 17, 10, 2, 'xianglin'],
    ['cf', 'gun_ru', 19, 10, 2],
    ['cf', 'chuyen', 18, 12, 1],
    ['cf', 'akatsuki_missile', 19, 12, 1],
  ];
  const KAGOSHIMA_BRIT = [
    [B, 'vincent_commander', 6, 5, 1, 'luciano', { hold: 1 }],
    [B, 'vincent_ward', 5, 4, 2, null, { hold: false }],
    [B, 'vincent_ward', 7, 6, 2, null, { hold: false }],
    [B, 'vincent_ward', 4, 6, 2, null, { hold: false }],
    [B, 'sutherland', 8, 7, 2, null, { hold: 1 }],
    [B, 'gareth', 6, 3, 1],
    [B, 'vincent_ward', 13, 2, 2, null, { hold: 2 }],
    [B, 'sutherland', 17, 6, 2],
    [B, 'sutherland', 19, 5, 1],
  ];
  const UFN = { cf: { name: 'UFN Federation Army', short: 'UFN', adj: 'UFN' } };

  // Counterattack at the Gallows: dense urban ground between the execution platform and Chinese territory.
  const GALLOWS = [
    'ppuuuuuuuuuuuuuuuuuppp',
    'puuuuuuxuuuuuuuxuuuppp',
    'uuuuuuuuuuuuuuuuuuuppp',
    'uuuxuuuuuuuuuxuuuuuupp',
    'uuuuuuuuuuuuuuuuuuuupp',
    'uuuuuuuuuuuuuuuuuuuupp',
    'uuuuuuuxuuuuuuuxuuuuup',
    'uuuuuuuuuuuuuuuuuuuupp',
    'uuuxuuuuuuuuuxuuuuuupp',
    'puuuuuuuuuuuuuuuuuuupp',
    'ppuuuuuxuuuuuuuuuuuppp',
    'pppuuuuuuuuuuuuuuupppp',
  ];
  // Zhengzhou and the road west: open ground broken by low hills and wooded ridges.
  const ZHENGZHOU = [
    'ffffppppppppppppppffff',
    'fffppppppppppppppppfff',
    'ffpppppmmmmpppppppppff',
    'fpppppmmmmmmpppppppppf',
    'ppppppmmmppppppfffpppp',
    'ppffppppppppppfffffppp',
    'pffffppppppppppfffpppp',
    'ppffpppppmmmpppppppppp',
    'ppppppppmmmmmppppppppp',
    'fppppppppmmmpppppppppf',
    'ffppppppppppppppppppff',
    'fffppppppppppppppppfff',
  ];
  // Kamejima: the Thought Elevator sits in the mountainous island interior.
  const KAMEJIMA = [
    '......................',
    '....pppfffffppp.......',
    '...pppffffffpppp......',
    '..pppfffmmmfffppp.....',
    '..ppffffmmmmfffpp.....',
    '.pppfffmmxmmfffppp....',
    '.pppfffmmmmmfffppp....',
    '..ppffffmmmffffpp.....',
    '..pppffffffffpppp.....',
    '...ppppffffpppp.......',
    '....ppppppppp.........',
    '......................',
  ];
  // Area 18: desert approaches to the Middle Eastern Federation's last fortified Bamides position.
  const MEF_FORTRESS = [
    'dddddddddddddddddddddd',
    'dddddddddddddddddddddd',
    'dddddddddmmmmddddddddd',
    'ddddddddmmmmmmdddddddd',
    'dddddddmmmddmmmddddddd',
    'dddddddddddddddddddddd',
    'dddddddddddddduuuddddd',
    'dddddddddddduuuuuddddd',
    'ddddddddddddduuudddddd',
    'dddddddddddddddddddddd',
    'dddddddddddddddddddddd',
    'dddddddddddddddddddddd',
  ];


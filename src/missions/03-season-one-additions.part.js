  // ---- Season 1 missions added with the season split (Black Knights and Britannia versions share maps) ----
  const YOKOSUKA_JLF = [
    ['jlf', 'burai_kai', 9, 11, 1, 'katase'],
    ['jlf', 'burai', 8, 12, 1],
    ['jlf', 'jp_artillery', 9, 10, 1],
  ];
  const YOKOSUKA_BRIT = [
    [B, 'elite_cornelia_gloucester', 18, 4, 1, 'cornelia'],
    [B, 'gloucester', 17, 5, 2, 'darlton'],
    [B, 'gloucester', 16, 7, 2, 'guilford'],
    [B, 'sutherland', 9, 9, 2, null, { hold: false }],
    [B, 'sutherland', 10, 9, 1, null, { hold: false }],
    [B, 'glasgow', 9, 8, 2, null, { hold: false }],
    [B, 'sutherland', 10, 8, 1, null, { hold: false }],
    [B, 'sutherland', 5, 6, 1],
    [B, 'sutherland', 7, 4, 1],
  ];
  const YOKOSUKA_BK = [
    [K, 'burai', 3, 2, 1, 'zero'],
    [K, 'elite_guren_mkii', 4, 3, 1, 'kallen'],
    [K, 'burai', 2, 3, 2, 'ohgi'],
    [K, 'burai', 3, 4, 1, 'tamaki'],
    [K, 'burai', 1, 4, 1, 'sugiyama'],
    [K, 'burai', 4, 1, 1, 'minami'],
    [K, 'burai_kai', 2, 1, 1, 'inoue'],
  ];
  const YOKOSUKA_CITIES = [
    ['Black Knights Staging', 2, 2, K, 1],
    ['Yokosuka Docks', 5, 6, B, 2],
    ['JLF Tanker', 9, 11, 'jlf', 1],
    ['Yokosuka Base', 16, 7, B, 2],
    ['Cornelia’s G-1', 18, 4, B, 3],
  ];
  const TANKER_BLAST = { c: 9, r: 11, damage: [1, 0.9, 0.6, 0.45], sides: [B, 'jlf'], color: '#ff9ad5', name: 'Tanker explosion' };

  const CHOFU_CITIES = [
    ['Black Knights Trailer', 2, 10, K, 1],
    ['Escape Route', 1, 1, K, 1],
    ['Outer Checkpoint', 6, 9, B, 1],
    ['Chofu Detention Center', 12, 5, B, 2],
    ['Britannian Barracks', 19, 5, B, 1],
  ];
  const CHOFU_BRIT = [
    [B, 'sutherland', 12, 5, 2, null, { hold: 1 }],
    [B, 'sutherland', 10, 6, 1, null, { hold: 2 }],
    [B, 'gloucester', 13, 7, 1, null, { hold: 2 }],
    [B, 'sutherland', 6, 9, 2, 'villetta', { hold: 2 }],
    [B, 'glasgow', 8, 10, 1],
    [B, 'sutherland', 19, 5, 2],
    [B, 'gloucester', 18, 7, 1],
  ];
  const CHOFU_BK = [
    [K, 'burai', 3, 10, 1, 'zero'],
    [K, 'elite_guren_mkii', 4, 9, 1, 'kallen'],
    [K, 'burai', 3, 11, 1, 'chiba'],
    [K, 'burai', 4, 11, 1, 'asahina'],
    [K, 'burai', 2, 9, 1, 'senba'],
    [K, 'burai', 5, 10, 1, 'urabe'],
    [K, 'burai', 2, 11, 2, 'ohgi'],
  ];

  const SHIKINE_CITIES = [
    ['Black Knights Submarine', 2, 2, K, 1],
    ['Gefjun Trap', 7, 4, K, 1],
    ['Shikine Base', 4, 10, B, 2],
    ['Kamine Ruins', 17, 4, B, 2],
    ['Kamine Landing', 18, 10, B, 1],
  ];
  const SHIKINE_BK = [
    [K, 'burai', 3, 2, 1, 'zero'],
    [K, 'elite_guren_mkii', 5, 3, 1, 'kallen'],
    [K, 'elite_tohdoh_gekka', 4, 3, 1, 'tohdoh'],
    [K, 'gekka', 2, 3, 1, 'chiba'],
    [K, 'gekka', 3, 1, 1, 'asahina'],
    [K, 'burai', 1, 3, 2, 'ohgi'],
    [K, 'gekka', 6, 2, 1, 'senba'],
  ];
  const SHIKINE_BRIT = [
    [B, 'elite_lancelot', 8, 5, 1, 'suzaku', { hold: false }],
    [B, 'sutherland', 5, 8, 2],
    [B, 'sutherland', 4, 10, 1, null, { hold: 1 }],
    [B, 'gloucester', 7, 9, 1],
    [B, 'gloucester', 17, 4, 2, null, { hold: 1 }],
    [B, 'sutherland', 16, 5, 2],
    [B, 'sutherland', 18, 10, 1, null, { hold: 1 }],
  ];
  const GEFJUN_TRAP = { c: 8, r: 5, radius: 2, sides: [B], name: 'Gefjun trap' };

  const FUKUOKA_CITIES = [
    ['Black Knights Drop Zone', 2, 6, K, 1],
    ['Hakata Port', 7, 3, 'cf', 2],
    ['Fukuoka Base', 10, 5, 'cf', 3, { fort: true, gun: 'Fukuoka Base' }],
    ['Federation Landing', 15, 2, 'cf', 1],
    ['Britannian Camp', 11, 11, B, 2],
  ];
  const SAWASAKI = { cf: { name: 'Sawasaki’s Federation Army', short: 'Sawasaki', adj: 'Federation' } };
  const FUKUOKA_CF = [
    ['cf', 'gun_ru', 10, 5, 2, 'cao', { hold: 1 }],
    ['cf', 'gun_ru', 8, 4, 2],
    ['cf', 'gun_ru', 12, 4, 2],
    ['cf', 'gun_ru', 7, 3, 2, null, { hold: 1 }],
    ['cf', 'gun_ru', 9, 7, 2],
    ['cf', 'gun_ru', 12, 7, 2],
    ['cf', 'gekka_rocket', 11, 3, 1],
    ['cf', 'gekka_rocket', 9, 3, 1],
    ['cf', 'gun_ru', 15, 2, 2, null, { hold: 1 }],
  ];
  const FUKUOKA_BK = [
    [K, 'elite_gawain', 2, 5, 1, 'zero'],
    [K, 'elite_guren_mkii', 3, 6, 1, 'kallen'],
    [K, 'elite_tohdoh_gekka', 2, 7, 1, 'tohdoh'],
    [K, 'gekka', 1, 6, 1, 'chiba'],
    [K, 'gekka', 3, 4, 1, 'asahina'],
  ];
  const FUKUOKA_BRIT = [
    [B, 'elite_lancelot', 17, 7, 1, 'suzaku', { hold: false }],
    [B, 'sutherland', 11, 10, 2],
    [B, 'sutherland', 12, 11, 2],
    [B, 'gloucester', 10, 11, 1, 'guilford'],
    [B, 'sutherland', 13, 10, 1],
  ];
  const FUKUOKA_REINFORCE = {
    turn: 4,
    say: [['cao', 'More Federation troops are ashore. Hold the base at any cost!']],
    spawn: [
      ['cf', 'gun_ru', 15, 2, 2],
      ['cf', 'gun_ru', 16, 3, 2],
    ],
  };


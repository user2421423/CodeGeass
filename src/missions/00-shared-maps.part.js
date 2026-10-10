/* Knightmare Conquest campaign missions: data only (maps, armies, events, objectives). Read by campaign.js.
   Map codes: . water · p plains · f forest · m mountains · u city ruins · x impassable · c crater · s tundra.
   Units: [side, frame id or class, column, row, frames, commander, { hold: radius, level }]. Named aces are Elite Force
   frames (single frame, Elite level 3 unless a level is given). Story lines are paraphrased.
   Balance numbers (armies, turn limits, star targets) are first-pass. */
(function (root) {
  'use strict';
  // ---- Shared maps ----
  const SHINJUKU = [
    'uuuuuuuuxuuuuppppxxx',
    'uuxuuuuuuuuuupppppxx',
    'uuuuuuxuuuuuuppppppx',
    'uuuuuuuuuuxuupppppxx',
    'uxuuuuuuuuuuupppppxx',
    'uuuuuxuuuuuuuuppppxx',
    'uuuuuuuuuxuuuupppppx',
    'uuuxuuuuuuuuuupppppx',
    'uuuuuuuuxuuuuuppppxx',
    'uuuuuuuuuuuxuupppppx',
    'uuxuuuuuuuuuuupppppx',
    'uuuuuuxuuuuuuuuppppx',
  ];
  const NARITA = [
    'fffffmmmmmmmmmmmffffff',
    'ffffmmmmmmmmmmmmmfffff',
    'fffmmmmxmmmmmxmmmmffff',
    'ffmmmmmmmmmmmmmmmmmfff',
    'ffmmmmmxmmmmmmmmmmmfff',
    'fffmmmmmmmmmmxmmmmffff',
    'ffffmmmmmmmmmmmmmfffff',
    'fffffffmmmmmmmmfffffpp',
    'ppfffffffffffffffffppp',
    'pppppffffffffffffppppp',
    'pppppppfffffffpppppppp',
    'pppppppppppppppppppppp',
    'pppppppppppppppppppppp',
    'pppppppppppppppppppppp',
  ];
  const TOKYO = [
    'ffuuuuuuuuuuuuuuuuuuuu..',
    'fpuuuuxuuuuuuxuuuuuuuu..',
    'ppuuuuuuuuuuuuuuuuxuuu..',
    'ppuuuxuuuuuxuuuuuuuuuu..',
    'fpuuuuuuuuuuuuuuxuuuuu..',
    'ppuuuuuuuxuuuuuuuuuuuu..',
    'ppuuuuuuuuuppuuuuuuuuu..',
    'ffuuuuxuuuuppuuxuuuuuu..',
    'ppuuuuuuuuuuuuuuuuuuuu..',
    'fpuuuuuuuuxuuuuuuuuuuu..',
    'ppuuuuuuuuuuuuuuxuuuuu..',
    'ppuuuxuuuuuuuuuuuuuuuu..',
    'ffuuuuuuuuuuxuuuuuuuuu..',
    'fpuuuuuuuuuuuuuuuuuuuu..',
  ];
  const FUJI = [
    'ffffppppppmmmppppppfff',
    'fffpppppmmmmmmppppppff',
    'ffppppmmmmmmmmmmpppppf',
    'fpppmmmmmmxxmmmmmppppp',
    'ppppmmmmmxxxxmmmmppppp',
    'pppmmmmmxxxxxmmmmmpppp',
    'ppppmmmmmxxxxmmmmppppp',
    'pppppmmmmmxxmmmmmppppp',
    'ffpppppmmmmmmmmppppppp',
    'fffpppppmmmmmmpppppppp',
    'ffffppppppmmpppppppppf',
    'fffffppppppppppppppfff',
    'ffffffpppppppppppffff.',
    'fffffffpppppppppfff...',
  ];
  const SKY = [
    'ffffpppppppppppppppppfff',
    'fffpppppppppppppppppppff',
    'ffppppppmmpppppppmmppppf',
    'fpppppppmmmppppppmmppppp',
    'pppppppppmmpppppmmpppppp',
    'pppffppppppppppppppppfff',
    'ppfffpppppppppppppppffff',
    'pppfppppppmmmmppppppppff',
    'ppppppppmmmmmmmppppppppp',
    'ppppppppmmmmmmpppppppppp',
    'fffpppppppmmppppppppppff',
    'ffffpppppppppppppppppfff',
    'fffffppppppppppppppfffff',
    'ffffffppppppppppppffffff',
  ];
  // Port Yokosuka: the docks, a long pier with the JLF tanker, Cornelia's G-1 on the eastern headland.
  const YOKOSUKA = [
    'fffffppppuuuuupppmmmmm',
    'ffffpppuuuuuuuuppmmmmm',
    'fffppuuuuuuuuuuuppmmmm',
    'ffpppuuuuuuuuuuuuppmmm',
    'fppppuuuuuuuuuuuuuuppm',
    'pppuuuuuuuuuuuuuuuuupp',
    'ppuuuuuuuuu...uuuuuupp',
    'puuuuuuuuu....uuuuuupp',
    'puuuuu...uu...uuu..upp',
    'ppuu.....uu......u..pp',
    'pppu.....uu.........pp',
    'ffp.....uu..........pp',
    'ff......u...........pp',
  ];
  // Chofu: a walled detention center with gates to the west, east and south.
  const CHOFU = [
    'ffffppppppppppppppffff',
    'fffpppppuuuuuuuupppfff',
    'ffppppuuuuuuuuuuuupppf',
    'fpppppuuxxxxxxxxuupppp',
    'ppppppuuxuuuuuuxuupppp',
    'pppppuuuuuuuuuuxuuuppp',
    'ppppuuuuxuuuuuuuuuuppp',
    'pppppuuuxuuuuuuxuuuppp',
    'ppppppuuxxxuxxxxuupppp',
    'fppppppuuuuuuuuuuupppp',
    'ffpppppppuuuuuuuppppff',
    'fffpppppppppppppppffff',
    'ffffpppppppppppppfffff',
  ];
  // Shikine Island (west) and Kamine Island (east) across a narrow strait.
  const SHIKINE = [
    '........................',
    '.ppppff.........ffpp....',
    '.pppfffp.......fffppp...',
    'ppppppppp.....mmpppppp..',
    'pppmmpppp.....mmmuuppp..',
    '.ppmmppppp...ppmmuupppp.',
    '.pppppppp....pppppppppp.',
    '..ppppppp.....ppppmmpp..',
    '..pppfffpp....pppmmmpp..',
    '...ppfffpp.....ppppppp..',
    '...ppppppp.....pppppp...',
    '....ppppp.......ppppp...',
    '.....ppp.........ppp....',
    '........................',
  ];
  // Fukuoka: the base and Hakata port on the northern Kyushu coast, mountains to the south-west.
  const FUKUOKA = [
    '......................',
    '....pppp......ppp.....',
    '..ppppppuu..pppppp....',
    '.pppppuuuuuuuuppppp...',
    '.ppppuuuuuuuuuuuppppp.',
    'ppppuuuuuuuuuuuuupppp.',
    'ppppfuuuuuuuuuuuuuppp.',
    'pppffpuuuuuuuuuuuuppp.',
    'ppffmmppuuuuuuupppppp.',
    'pffmmmpppppuupppppfff.',
    'ffmmmmmppppppppppffff.',
    'fmmmmmmmppppppppfffff.',
    'mmmmmmmmmppppppffffff.',
  ];
  // The Special Administrative Zone ceremony grounds below Mount Fuji.
  const SAZ = [
    'mmmmmffffppppppffffmmm',
    'mmmmffffppppppppfffmmm',
    'mmmffpppppppppppppffmm',
    'mmffppppuuuuuupppppffm',
    'mffpppuuuuuuuuuppppppf',
    'ffppppuuuuuuuuuupppppf',
    'fpppppuuuuuuuuuuppppff',
    'ffppppuuuuuuuuupppppff',
    'fffppppuuuuuuupppppfff',
    'ffffppppppppppppppffff',
    'mfffppppppppppppppfffm',
    'mmfffppppppppppppfffmm',
    'mmmffffppppppppffffmmm',
  ];
  // The sky over the Pacific: open air, cloud banks for cover and a storm front (an air battle, drawn as land).
  const PACIFIC = [
    'pppppfffppppppppfffppppp',
    'ppppfffppppppppppfffpppp',
    'pppppfpppppmmppppppfpppp',
    'pppppppppppmmmpppppppppp',
    'ppffpppppppppmmppppppfpp',
    'pffffpppppppppppppppfffp',
    'ppffppppppppffpppppppfpp',
    'pppppppppppfffpppppppppp',
    'pppppmmpppppfppppppffppp',
    'ppppmmmmppppppppppfffppp',
    'pppppmmpppppppppppppfppp',
    'ppfffpppppppppppfffppppp',
    'pfffffpppppppppfffffpppp',
  ];
  // Tokyo Bay: the Black Knights' submarine at a breakwater, ringed by Britannian warships (gun fortresses).
  const TOKYO_BAY = [
    'uuuuuu..............pp',
    'uuuuu................p',
    'uuuu.....u......u.....',
    'uuu..................p',
    'uu.......uuuu........p',
    'uu......uuuuuu....u..p',
    'uu......uuuuuu.......p',
    'uu.......uuuu........p',
    'uuu..................p',
    'uuuu.....u......u....p',
    'uuuuu...............pp',
    'uuuuuu.............ppp',
    'uuuuuuu...........pppp',
  ];
  // Xiaopei: Chinese plains split by a river with two bridges, the road to the Mausoleum to the east.
  const XIAOPEI = [
    'ppppppffffppppp.pmmmmm',
    'pppppffffpppppp.pmmmmm',
    'ppppppffppppppp.ppmmmm',
    'ppppppppppppppp.pppmmm',
    'ffpppppppppppppppppppm',
    'fffpppppppppppp.pppppp',
    'ffppppppppppppp.pppppp',
    'ppppppppppppppp.pppppp',
    'pppppfffppppppp.pppppp',
    'ppppffffppppppp.pppppp',
    'pppppffppppppppppppppm',
    'ppppppppppppppp.ppppmm',
    'ppppppppppppppp.ppppmm',
  ];
  // The Geass Directorate: underground halls behind rock walls in the desert.
  const GEASS = [
    'ddddddddmmmmmmmmdddddd',
    'ddddddmmmxxxxxmmmddddd',
    'dddddmmxxuuuuuxxmmdddd',
    'ddddmmxuuuuuuuuxxmmddd',
    'dddddmxuuuxxuuuuxmmddd',
    'ddddddduuuxxuuuuuxdddd',
    'dddddduuuuuuuuuuuxdddd',
    'ddddddduuuxxuuuuuxdddd',
    'dddddmxuuuxxuuuuxmmddd',
    'ddddmmxuuuuuuuuxxmmddd',
    'dddddmmxxuuuuuxxmmdddd',
    'ddddddmmmxxxxxmmmddddd',
    'ddddddddmmmmmmmmdddddd',
  ];
  // Kagoshima: the settlement on the bay, Sakurajima in the water, landing beaches to the south.
  const KAGOSHIMA = [
    'ffffmmmmmffffmmmmmffff',
    'fffppmmmffffpppmmmfff.',
    'ffpppppfffpppppppfff..',
    'fppppuuuuppppppppppp..',
    'pppuuuuuuup....ppppp..',
    'ppuuuuuuuu....x..pppp.',
    'ppuuuuuuuu...xxx..ppp.',
    'pppuuuuuup....x...ppp.',
    'ppppuuupp.........pppp',
    'fppppppp..........pppp',
    'ffpppppp.........ppppp',
    'fffpppp.........pppppp',
    'ffpppp.........ppppppp',
  ];
  // Britannia's 2017 frames for the Black Knights' early, captured-equipment fights.
  const R1_BUILD = { bk: ['burai', 'burai_kai', 'gekka'] };
  const B = 'britannia';
  const K = 'bk';
  // Luoyang: the Mausoleum of the Eighty-Eight Emperors (south-west) and the Vermillion Forbidden City.
  const LUOYANG = [
      'ppppffffpppppppppppppp',
      'pppfffppppppppuupppppp',
      'ppffpppppppppuuuuppppp',
      'pppppp..pppppuuuuupppp',
      'pppp.....pppuuxuuupppp',
      'ppp....pppppuuuuuupppp',
      'pppp..ppppppuuuuuppppp',
      'ppppppppppppppuupppppp',
      'ffppppppfffppppppppppp',
      'fffppppfffffpppppppmmm',
      'ffpppppffffpppppppmmmm',
      'fppppppppppppppppmmmmm',
      'pppppppppppppppppmmmmm',
  ];
  const LUOYANG_CITIES = [
      ['Mausoleum of the Eighty-Eight Emperors', 2, 11, K, 2],
      ['Xingke’s Camp', 2, 2, 'cf', 1],
      ['Eunuch Barracks', 13, 8, 'neutral', 1],
      ['Vermillion Forbidden City', 15, 4, 'neutral', 3, { fort: true, gun: 'Palace' }],
  ];
  const EUNUCH_NAMES = {
      cf: { name: 'Xingke’s Forces', short: 'Xingke', adj: 'Xingke' },
      neutral: { name: 'High Eunuchs', short: 'Eunuchs', adj: 'Eunuch', color: '#d9b45a' },
  };
  const LUOYANG_REBELS = [
      [K, 'elite_shinkiro', 3, 10, 1, 'zero'],
      [K, 'elite_guren_mkii', 4, 9, 1, 'kallen'],
      [K, 'zangetsu', 5, 11, 1, 'tohdoh'],
      [K, 'akatsuki_zikisan', 4, 11, 1, 'chiba'],
      [K, 'akatsuki_zikisan', 6, 10, 1, 'asahina'],
      [K, 'akatsuki', 6, 12, 2, 'urabe'],
      [K, 'akatsuki', 7, 11, 2, 'senba'],
      [K, 'akatsuki_missile', 5, 8, 1],
      ['cf', 'shen_hu', 3, 3, 1, 'xingke'],
      ['cf', 'gun_ru', 4, 2, 2, 'xianglin'],
      ['cf', 'chuyen', 5, 3, 1],
      ['cf', 'gun_ru', 3, 4, 2],
      ['cf', 'chuyen', 2, 1, 1],
  ];
  const LUOYANG_EUNUCHS = [
      ['neutral', 'gun_ru', 15, 4, 2, 'zhaohao', { hold: 1 }],
      ['neutral', 'gun_ru', 12, 3, 2],
      ['neutral', 'gun_ru', 13, 6, 2],
      ['neutral', 'gun_ru', 16, 6, 2],
      ['neutral', 'gun_ru', 17, 3, 2],
      ['neutral', 'chuyen', 14, 2, 1],
      ['neutral', 'chuyen', 16, 2, 1],
      ['neutral', 'gun_ru', 13, 8, 1, null, { hold: 1 }],
  ];


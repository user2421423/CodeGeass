/* Conquest configurations, independent of the map engine. The 2017 baseline is untouched. */
(function (root) {
  'use strict';
  const ufn2018 = {
    id: 'ufn2018',
    title: '2018 — Rise of the U.F.N.',
    year: '2018 a.t.b.',
    desc: 'The United Federation of Nations unites the former Chinese Federation and surviving E.U. territories against Britannia and its Euro-Britannian ally. Australia remains neutral.',
    rulesText: 'Britannia and Euro Britannia are permanently allied and share one F.L.E.I.J.A. warhead allowance, but command separate armies and economies. Defeat the opposing coalition by capturing every enemy-held city. There is no turn limit.',
    majors: ['britannia', 'eb', 'cf'],
    selectable: ['britannia', 'eb', 'cf'],
    teams: { britannia: 'britannian', eb: 'britannian', cf: 'ufn' },
    factions: {
      britannia: { name: 'Holy Britannian Empire', short: 'Britannia', adj: 'Britannian', color: '#e34b4b', letter: 'B', capital: 'Pendragon' },
      eb: { name: 'Euro Britannia', short: 'Euro Britannia', adj: 'Euro-Britannian', color: '#a77be8', letter: 'Æ', capital: 'St. Petersburg' },
      cf: { name: 'United Federation of Nations', short: 'U.F.N.', adj: 'U.F.N.', color: '#37bfa9', letter: 'U', capital: 'Luoyang' },
      neutral: { name: 'Australia', short: 'Australia', adj: 'Australian', color: '#c2bd9f', letter: 'A', capital: 'Sydney' },
    },
    ownership: {
          "Rome": "cf",
          "Vienna": "cf",
          "Warsaw": "cf",
          "Athens": "cf",
          "Belgrade": "cf",
          "Addis Ababa": "cf",
          "Nairobi": "cf",
          "Dar es Salaam": "cf",
          "Lusaka": "cf",
          "Antananarivo": "cf",
          "Bangui": "cf",
          "London": "cf",
          "Edinburgh": "cf",
          "Dublin": "cf",
          "Reykjavik": "cf",
          "Berlin": "eb",
          "Amsterdam": "eb",
          "Oslo": "cf",
          "Stockholm": "cf",
          "Helsinki": "cf",
          "Murmansk": "cf",
          "Minsk": "eb",
          "Kiev": "eb",
          "Kinshasa": "cf",
          "Kisangani": "cf",
          "St. Petersburg": "eb",
          "Moscow": "eb",
          "Volgograd": "eb",
          "Samara": "eb",
          "Yekaterinburg": "eb",
          "Omsk": "eb",
          "Novosibirsk": "eb",
          "Krasnoyarsk": "eb",
          "Irkutsk": "eb",
          "Yakutsk": "eb",
          "Petropavlovsk": "eb",
          "Bucharest": "eb",
          "Istanbul": "eb",
          "Tbilisi": "eb",
          "Nuuk": "eb",
          "Paris": "eb",
          "Madrid": "eb",
          "Gibraltar": "eb",
          "Barcelona": "eb",
          "Cairo": "britannia",
          "Algiers": "britannia",
          "Tripoli": "britannia",
          "Dakar": "britannia",
          "Bamako": "britannia",
          "Lagos": "britannia",
          "Khartoum": "britannia",
          "Johannesburg": "britannia",
          "Cape Town": "britannia",
          "Casablanca": "britannia",
          "Luanda": "britannia",
          "N'Djamena": "britannia",
          "Niamey": "britannia",
          "Kano": "britannia",
          "Windhoek": "britannia",
          "Baghdad": "britannia",
          "Riyadh": "britannia",
          "Damascus": "britannia",
          "Sanaa": "britannia",
          "Jeddah": "britannia",
          "Dubai": "britannia",
          "Sydney": "neutral",
          "Melbourne": "neutral",
          "Perth": "neutral",
          "Darwin": "neutral",
          "Brisbane": "neutral",
          "Adelaide": "neutral"
    },
    expectedCities: { britannia: 71, eb: 23, cf: 68, neutral: 6 },
    armies: [
  [
    "britannia",
    "super",
    -117,
    37.5,
    1,
    "charles"
  ],
  [
    "britannia",
    "heavy",
    -120,
    38.5,
    2,
    "bismarck"
  ],
  [
    "britannia",
    "medium",
    -74,
    40.7,
    2
  ],
  [
    "britannia",
    "rocket",
    -122,
    37.8,
    2
  ],
  [
    "britannia",
    "scout",
    -58.4,
    -34.6,
    2
  ],
  [
    "britannia",
    "medium",
    -46.6,
    -23.5,
    2
  ],
  [
    "britannia",
    "light",
    -70.7,
    -33.4,
    2
  ],
  [
    "britannia",
    "support",
    -80.2,
    25.8,
    1
  ],
  [
    "britannia",
    "super",
    139.7,
    35.7,
    1,
    "suzaku"
  ],
  [
    "britannia",
    "heavy",
    135.8,
    35,
    2,
    "gino"
  ],
  [
    "britannia",
    "heavy",
    130.4,
    33.6,
    2,
    "jeremiah"
  ],
  [
    "britannia",
    "rocket",
    142.4,
    43.1,
    2,
    "anya"
  ],
  [
    "britannia",
    "medium",
    121,
    14.6,
    2
  ],
  [
    "britannia",
    "assault",
    138,
    35.2,
    2
  ],
  [
    "britannia",
    "super",
    2.35,
    48.85,
    1,
    "schneizel"
  ],
  [
    "britannia",
    "heavy",
    -3.7,
    40.4,
    2
  ],
  [
    "britannia",
    "medium",
    2.2,
    41.4,
    2
  ],
  [
    "britannia",
    "rocket",
    -5.35,
    36.14,
    2
  ],
  [
    "britannia",
    "support",
    -7.6,
    33.6,
    2
  ],
  [
    "britannia",
    "heavy",
    31.2,
    30,
    2,
    "cornelia"
  ],
  [
    "britannia",
    "medium",
    3.4,
    6.5,
    2,
    "darlton"
  ],
  [
    "britannia",
    "rocket",
    13.2,
    32.9,
    2
  ],
  [
    "britannia",
    "assault",
    32.5,
    15.6,
    2
  ],
  [
    "britannia",
    "light",
    18.4,
    -33.9,
    2
  ],
  [
    "britannia",
    "medium",
    13.2,
    -8.8,
    2
  ],
  [
    "britannia",
    "scout",
    -17.4,
    14.7,
    2
  ],
  [
    "britannia",
    "siege",
    28,
    -26.2,
    1
  ],
  [
    "britannia",
    "light",
    44.4,
    33.3,
    2
  ],
  [
    "britannia",
    "scout",
    46.7,
    24.7,
    2
  ],
  [
    "britannia",
    "support",
    -122.3,
    47.6,
    1
  ],
  [
    "eb",
    "super",
    30.3,
    59.9,
    1,
    "julius"
  ],
  [
    "eb",
    "heavy",
    37.6,
    55.75,
    2,
    "shin"
  ],
  [
    "eb",
    "medium",
    44.5,
    48.7,
    2,
    "ashley"
  ],
  [
    "eb",
    "rocket",
    50.1,
    53.2,
    2,
    "klaus"
  ],
  [
    "eb",
    "support",
    27.5,
    44.3,
    2,
    "oscar"
  ],
  [
    "eb",
    "raider",
    29,
    41,
    2
  ],
  [
    "eb",
    "heavy",
    44.8,
    41.7,
    2
  ],
  [
    "eb",
    "medium",
    60.6,
    56.8,
    2
  ],
  [
    "eb",
    "rocket",
    73.37,
    54.99,
    1
  ],
  [
    "eb",
    "light",
    82.9,
    55,
    2
  ],
  [
    "eb",
    "scout",
    92.85,
    56,
    1
  ],
  [
    "eb",
    "light",
    104.3,
    52.3,
    2
  ],
  [
    "eb",
    "scout",
    129.7,
    62,
    1
  ],
  [
    "eb",
    "scout",
    158.6,
    53,
    1
  ],
  [
    "eb",
    "medium",
    30.3,
    57.2,
    2
  ],
  [
    "eb",
    "support",
    41.5,
    57,
    1
  ],
  [
    "eb",
    "assault",
    33,
    44,
    2
  ],
  [
    "eb",
    "siege",
    28.7,
    53,
    1
  ],
  [
    "eb",
    "light",
    -51.7,
    64.2,
    1
  ],
  [
    "cf",
    "super",
    112.45,
    34.6,
    1,
    "xingke"
  ],
  [
    "cf",
    "heavy",
    116.4,
    39.9,
    2,
    "zero",
    "bk"
  ],
  [
    "cf",
    "heavy",
    123.4,
    41.8,
    2,
    "kallen",
    "bk"
  ],
  [
    "cf",
    "rocket",
    121.5,
    31.2,
    2,
    "tohdoh",
    "bk"
  ],
  [
    "cf",
    "medium",
    126.98,
    37.57,
    2,
    "honggu"
  ],
  [
    "cf",
    "medium",
    131.9,
    43.1,
    2,
    "cao"
  ],
  [
    "cf",
    "rocket",
    126.6,
    45.8,
    2
  ],
  [
    "cf",
    "medium",
    106.5,
    29.5,
    2
  ],
  [
    "cf",
    "light",
    114.2,
    22.3,
    2
  ],
  [
    "cf",
    "scout",
    122,
    24.5,
    2
  ],
  [
    "cf",
    "heavy",
    76.9,
    43.2,
    2,
    "xianglin"
  ],
  [
    "cf",
    "medium",
    69.2,
    41.3,
    2
  ],
  [
    "cf",
    "rocket",
    87.6,
    43.8,
    2
  ],
  [
    "cf",
    "assault",
    51.4,
    35.7,
    2
  ],
  [
    "cf",
    "medium",
    59.6,
    36.3,
    2
  ],
  [
    "cf",
    "support",
    69.2,
    34.5,
    2
  ],
  [
    "cf",
    "scout",
    106.9,
    47.9,
    2
  ],
  [
    "cf",
    "super",
    19.1,
    51.8,
    1,
    "akito",
    "eu"
  ],
  [
    "cf",
    "heavy",
    21,
    52.2,
    2,
    "leila",
    "eu"
  ],
  [
    "cf",
    "medium",
    16.4,
    48.2,
    2,
    "ryo",
    "eu"
  ],
  [
    "cf",
    "rocket",
    22.2,
    53.2,
    2,
    "ayano",
    "eu"
  ],
  [
    "cf",
    "medium",
    24.1,
    50.7,
    2
  ],
  [
    "cf",
    "light",
    12.5,
    41.9,
    2
  ],
  [
    "cf",
    "assault",
    20.5,
    44.8,
    2
  ],
  [
    "cf",
    "support",
    -1,
    53.5,
    2
  ],
  [
    "cf",
    "light",
    -0.13,
    51.51,
    2
  ],
  [
    "cf",
    "rocket",
    24.9,
    60.2,
    2
  ],
  [
    "cf",
    "heavy",
    38.7,
    9,
    2,
    "ohgi",
    "bk"
  ],
  [
    "cf",
    "medium",
    36.8,
    -1.3,
    2
  ],
  [
    "cf",
    "rocket",
    15.3,
    -4.3,
    2
  ],
  [
    "cf",
    "medium",
    28.3,
    -15.42,
    2
  ],
  [
    "cf",
    "light",
    39.2,
    -6.8,
    2
  ],
  [
    "cf",
    "scout",
    47.5,
    -18.9,
    2
  ],
  [
    "cf",
    "support",
    25.19,
    0.52,
    2
  ],
  [
    "cf",
    "assault",
    18.56,
    4.39,
    2
  ],
  [
    "cf",
    "medium",
    77.2,
    28.6,
    2
  ],
  [
    "cf",
    "support",
    103.8,
    1.35,
    2
  ],
  [
    "cf",
    "rocket",
    79.95,
    23.2,
    1
  ]
],
    navy: [
  [
    "britannia",
    "carrier",
    -124,
    37,
    1
  ],
  [
    "britannia",
    "carrier",
    -73,
    41,
    1
  ],
  [
    "britannia",
    "carrier",
    135,
    34,
    1
  ],
  [
    "britannia",
    "amphibious2",
    132,
    33,
    1
  ],
  [
    "britannia",
    "amphibious",
    -6,
    36,
    2
  ],
  [
    "britannia",
    "amphibious",
    3,
    35,
    2
  ],
  [
    "britannia",
    "amphibious",
    -17,
    16,
    2
  ],
  [
    "eb",
    "carrier",
    29,
    42,
    1
  ],
  [
    "eb",
    "amphibious2",
    31,
    43,
    1
  ],
  [
    "eb",
    "amphibious",
    30,
    60,
    2
  ],
  [
    "cf",
    "carrier",
    123,
    31,
    1
  ],
  [
    "cf",
    "carrier",
    4,
    53,
    1
  ],
  [
    "cf",
    "carrier",
    105,
    2,
    1
  ],
  [
    "cf",
    "amphibious2",
    124,
    37,
    1
  ],
  [
    "cf",
    "amphibious",
    21,
    38,
    2
  ],
  [
    "cf",
    "amphibious",
    -3,
    53,
    2
  ],
  [
    "cf",
    "amphibious",
    39,
    8,
    2
  ],
  [
    "cf",
    "amphibious",
    114,
    22,
    2
  ]
],
    garrisons: [["Sydney","sutherland",2],["Melbourne","glasgow",1],["Perth","glasgow",1],["Darwin","glasgow",1],["Brisbane","glasgow",1],["Adelaide","glasgow",1]],
    initialTreasury: { britannia: { credits: 650, industry: 260, science: 30 }, eb: { credits: 450, industry: 190, science: 18 }, cf: { credits: 800, industry: 350, science: 70 } },
  };


  // 2018 only: Britannia abandons its inland and overseas garrisons in favour
  // of the active coalition frontiers. Keep every formation's class, stack and
  // named commander intact. In array order: Middle East, Japan, Philippines,
  // allied Euro-Britannian Siberia and U.F.N.-bordering African sectors.
  const britannianForwardLand = [[44.4,33.3], [104.3,52.3], [101.6,51.3], [108,53.3], [32,16], [15.1,12.1], [121.4,17], [124,14.4], [139.7,35.7], [135.8,35], [130.4,33.6], [142.4,43.1], [121,14.6], [138,35.2], [36.3,33.5], [43.2,35.5], [52,27.5], [46.1,31.5], [32.2,16.5], [31.2,30], [15.6,10.9], [34.5,14.6], [32.5,15.6], [29,-24], [16.6,-10.3], [14.5,8.7], [29,-23], [48.5,29.4], [54,26], [107.2,51.3]];
  const britannian2018Land = ufn2018.armies.filter(army => army[0] === 'britannia');
  if (britannian2018Land.length !== britannianForwardLand.length)
    throw new Error('Review the 2018 Britannian land deployment after changing its roster');
  britannian2018Land.forEach((army, i) => {
    [army[2], army[3]] = britannianForwardLand[i];
  });
  // The U.F.N. retains Warsaw as a salient; its formations formerly based in
  // Amsterdam, Berlin, Minsk and Kiev deploy on allied ground instead.
  // Four existing Euro Britannian reinforcements garrison those cities,
  // preserving its 44-unit starting force without increasing troop numbers.
  // Double Euro Britannia's 19 original land formations to 38.
  // Nine reinforce its new western holdings; ten reinforce the eastern front.
  const euroReinforcements = [
    ['super',2.35,48.85,1], ['heavy',4.9,52.4,2],
    ['rocket',13.4,52.5,2], ['support',1.8,50,2],
    ['heavy',-3.7,40.4,2], ['medium',-4.4,40.8,2],
    ['assault',2.2,41.4,2], ['rocket',1.5,42.3,2],
    ['scout',-5.35,36.14,2],
    ['super',31.3,59.9,1], ['heavy',37.6,55.75,2],
    ['heavy',30,45,2], ['medium',30.5,50.45,2], ['medium',27.6,53.9,2],
    ['rocket',55,53,2], ['support',61,56,2], ['light',82,55,2],
    ['assault',104,52,2], ['siege',29,42,1]
  ];
  ufn2018.armies.push(...euroReinforcements.map(([kind,lon,lat,stack]) => ['eb',kind,lon,lat,stack]));
  // Double its navy from three to six formations, including Atlantic patrols.
  ufn2018.navy.push(
    ['eb','carrier',-8.5,47,1], ['eb','carrier',28.9,42,1],
    ['eb','amphibious2',-5.5,35.7,1]
  );

  // The 2018 Britannian fleet likewise starts exclusively in contested waters:
  // Japan, the Philippines, and the Red Sea / Horn of Africa.
  const britannianForwardNavy = [[124.7,16.8], [140,39.4], [135,34], [132,33], [124.5,12], [39.2,19], [40.8,13]];
  const britannian2018Navy = ufn2018.navy.filter(ship => ship[0] === 'britannia');
  if (britannian2018Navy.length !== britannianForwardNavy.length)
    throw new Error('Review the 2018 Britannian naval deployment after changing its roster');
  britannian2018Navy.forEach((ship, i) => {
    [ship[2], ship[3]] = britannianForwardNavy[i];
  });

  // Every eligible roster officer receives one named starting command in each
  // Conquest. Prefer existing anonymous formations; only create fresh formations
  // if a coalition has more officers than deployed units (the 2018 U.F.N.).
  // Keep this deterministic: it must not consume the game's combat RNG.
  function fillRosterCommands(armies, era) {
    const roster = root.KnightmareData.COMMANDERS;
    const is2018 = era === 'ufn2018';
    const ownerOf = (id, officer) => is2018
      ? (officer.side === 'eb' ? 'eb' : officer.side === 'britannia' ? 'britannia' : 'cf')
      : (officer.side === 'eb' ? 'britannia' : officer.side);
    // Correct legacy 2018 assignments: the E.U.'s Klaus and Oscar cannot
    // command Euro Britannian units; both belong to the U.F.N. instead.
    if (is2018) for (const unit of armies)
      if (unit[0] === 'eb' && ['klaus','oscar'].includes(unit[5])) unit.splice(5, 2);
    const availableOfficers = Object.entries(roster).filter(([, officer]) => is2018 || ['britannia','eb','eu','cf'].includes(officer.side));
    const used = new Set();
    for (const entry of armies) {
      const id = entry[5];
      if (!id) continue;
      if (!roster[id] || ownerOf(id, roster[id]) !== entry[0] || used.has(id))
        throw new Error('Invalid ' + era + ' starting officer: ' + entry[0] + ' / ' + id);
      used.add(id);
    }
    const fits = (kind, role) => ({
      Armor: ['super','heavy','medium','raider'],
      Infantry: ['assault','light','scout'],
      Artillery: ['rocket','siege','support']
    }[role] || []).includes(kind);
    const origins = Object.fromEntries([...new Set(armies.map(a => a[0]))]
      .map(side => [side, armies.filter(a => a[0] === side).map(a => [a[2],a[3]])]));
    const created = {};
    for (const [id, officer] of availableOfficers) {
      if (used.has(id)) continue;
      const side = ownerOf(id, officer);
      const slots = armies.filter(a => a[0] === side && !a[5]);
      const available = slots.find(a => fits(a[1], officer.role)) || slots[0];
      if (available) {
        available[5] = id;
      } else {
        const points = origins[side] || [];
        if (!points.length) throw new Error('No ' + era + ' staging points for ' + side);
        const n = created[side] || 0;
        const base = points[(n * 7 + Math.floor(n / 3)) % points.length];
        const offset = [[0.8,0.6],[-0.8,0.5],[1.5,-0.4],[-1.4,-0.4],[0.6,-1.2],[-0.5,1.4]][n % 6];
        const cls = officer.role === 'Artillery' ? 'rocket'
          : officer.role === 'Infantry' ? 'assault' : 'medium';
        const entry = [side, cls, Math.max(-179.5,Math.min(179.5,base[0]+offset[0])),
          Math.max(-70,Math.min(70,base[1]+offset[1])), 1, id];
        if (is2018 && side === 'cf') entry.push('bk');
        armies.push(entry);
        created[side] = n + 1;
      }
      used.add(id);
    }
    // No extra unassigned U.F.N. reserves in the 2018 Conquest.
    if (used.size !== availableOfficers.length)
      throw new Error('Not every ' + era + ' commander has a starting deployment');
    return armies;
  }
  // 2017 only: transfer 32 EU land formations from interior garrisons to the
  // contiguous Chinese Federation frontier, from the Caucasus to eastern Siberia.
  // Retain 11 western/EU-capital, wZERO and African reserves. Naval units are unchanged.
  const worldEuReserves = new Set(["heavy:30.3:59.9","super:2.35:48.85","rocket:0.5:48","medium:-3.6:52.2","support:-5.35:36.1","raider:21:52.2","rocket:18.5:51","medium:23:54","light:20.5:44.8","heavy:31.2:30","scout:-17.4:14.7"]);
  const worldEuFrontierHexes = [[111,20],[112,19],[112,17],[113,18],[114,16],[115,15],[112,15],[117,14],[118,15],[118,13],[120,13],[122,12],[124,12],[126,12],[128,12],[127,10],[130,12],[132,12],[134,12],[135,11],[137,12],[139,12],[141,12],[144,12],[146,12],[148,10],[151,11],[153,11],[155,11],[157,12],[158,10],[159,9]];
  let worldEuRebased = 0;
  for (const army of root.KnightmareData.ARMY_DATA) {
    if (army[0] !== 'eu' || worldEuReserves.has(`${army[1]}:${army[2]}:${army[3]}`)) continue;
    const pos = worldEuFrontierHexes[worldEuRebased++];
    if (!pos) throw new Error('Exceeded 2017 EU China-border deployment slots');
    const [c, r] = pos;
    army[2] = -180 + (c + 0.5 + 0.5 * (r & 1)) * 2;
    army[3] = 74 - r * (128 / 75);
  }
  if (worldEuRebased !== worldEuFrontierHexes.length)
    throw new Error('2017 EU starting army changed; review Chinese-border deployment');
  fillRosterCommands(root.KnightmareData.ARMY_DATA, 'world');
  fillRosterCommands(ufn2018.armies, 'ufn2018');
  // Hawaii has only a couple of available land hexes at the world map scale.
  // Its third starting formation formerly wandered to distant Alaska when
  // occupied positions (including coastal hexes) exhausted the island.
  // Keep the Hawaiian defenders local, and station Scholtz at Anchorage.
  const scholtz2017 = root.KnightmareData.ARMY_DATA.filter(a => a[5] === 'scholtz');
  if (scholtz2017.length !== 1)
    throw new Error('Expected one Scholtz unit in the 2017 starting roster');
  scholtz2017[0][2] = -149.9;
  scholtz2017[0][3] = 61.2;
  // All 2018 Britannian and U.F.N. ground starts require named commanders.
  // Euro Britannia retains its anonymous land starts; navy is separate.
  ufn2018.armies = ufn2018.armies.filter(formation =>
    formation[5] || !['britannia', 'cf'].includes(formation[0]));

  // 2018-only coalition reinforcement: every *commander-led* Britannian and
  // Euro-Britannian starting land formation gets a full three-frame stack.
  // Apply after all officers are assigned and unused ground units removed.
  // Euro Britannian anonymous troops and U.F.N. commander stacks are untouched.
  for (const formation of ufn2018.armies)
    if (formation[5] && ['britannia', 'eb'].includes(formation[0]))
      formation[4] = 3;
  // Keep Augustus in friendly territory in both eras. In 2017 his original
  // Fukuoka staging point is overcrowded, which can displace him into Korea.
  // These starting-roster coordinates apply to every Conquest difficulty.
  for (const [era, armies, lon, lat] of [
    ['world', root.KnightmareData.ARMY_DATA, -84, 39], // Britannian North America
    ['ufn2018', ufn2018.armies, 33, 54], // Euro Britannian western Russia
  ]) {
    const matches = armies.filter(army => army[5] === 'augustus');
    if (matches.length !== 1)
      throw new Error('Expected exactly one Augustus starting unit in ' + era);
    matches[0][2] = lon;
    matches[0][3] = lat;
  }
  const CONQUESTS = {
    world: { id: 'world', title: '2017 — World War', majors: ['britannia', 'eu', 'cf'], selectable: ['britannia','eu','cf'], teams: {}, ownership: null, expectedCities: { britannia: 51, eu: 58, cf: 47, neutral: 12 } },
    ufn2018,
  };
  (root.KnightmareData ||= {}).CONQUESTS = CONQUESTS;
  if (typeof module !== 'undefined') module.exports = CONQUESTS;
})(typeof window !== 'undefined' ? window : globalThis);

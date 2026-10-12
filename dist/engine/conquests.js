/* Conquest configurations, independent of the map engine. The 2017 baseline is untouched. */
(function (root) {
  'use strict';
  const ufn2018 = {
    id: 'ufn2018',
    title: '2018 — Rise of the U.F.N.',
    year: '2018 a.t.b.',
    desc: 'The United Federation of Nations unites the former Chinese Federation and surviving E.U. territories against Britannia and its Euro-Britannian ally. Australia remains neutral.',
    rulesText: 'Britannia and Euro Britannia are permanently allied but command separate armies and economies. Defeat the opposing coalition, or lead by cities at the 120-turn armistice.',
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
          "Berlin": "cf",
          "Amsterdam": "cf",
          "Oslo": "cf",
          "Stockholm": "cf",
          "Helsinki": "cf",
          "Murmansk": "cf",
          "Minsk": "cf",
          "Kiev": "cf",
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
    expectedCities: { britannia: 71, eb: 19, cf: 72, neutral: 6 },
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
    13.4,
    52.5,
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
    27.6,
    53.9,
    2,
    "ayano",
    "eu"
  ],
  [
    "cf",
    "medium",
    30.5,
    50.45,
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
    4.9,
    52.4,
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
    initialTreasury: { britannia: { credits: 380, industry: 155, science: 30 }, eb: { credits: 210, industry: 85, science: 18 }, cf: { credits: 900, industry: 400, science: 70 } },
  };


  // France and Iberia are now Euro Britannian. Rebase the Britannian
  // forces previously stationed there to the remaining African holdings.
  for (const army of ufn2018.armies) {
    if (army[0] !== 'britannia') continue;
    const p = {
      '2.35,48.85':[3,36.7], '-3.7,40.4':[-7.6,33.6],
      '2.2,41.4':[13.2,32.9], '-5.35,36.14':[10,33.3]
    }[army[2]+','+army[3]];
    if (p) [army[2],army[3]] = p;
  }
  // Double Euro Britannia's 19 original land formations to 38.
  // Nine reinforce its new western holdings; ten reinforce the eastern front.
  const euroReinforcements = [
    ['super',2.35,48.85,1], ['heavy',2.9,49.4,2],
    ['rocket',3.9,47.9,2], ['support',1.8,50,2],
    ['heavy',-3.7,40.4,2], ['medium',-4.4,40.8,2],
    ['assault',2.2,41.4,2], ['rocket',1.5,42.3,2],
    ['scout',-5.35,36.14,2],
    ['super',31.3,59.9,1], ['heavy',37.6,55.75,2],
    ['heavy',30,45,2], ['medium',43,49,2], ['medium',50,55,2],
    ['rocket',55,53,2], ['support',61,56,2], ['light',82,55,2],
    ['assault',104,52,2], ['siege',29,42,1]
  ];
  ufn2018.armies.push(...euroReinforcements.map(([kind,lon,lat,stack]) => ['eb',kind,lon,lat,stack]));
  // Double its navy from three to six formations, including Atlantic patrols.
  ufn2018.navy.push(
    ['eb','carrier',-8.5,47,1], ['eb','carrier',28.9,42,1],
    ['eb','amphibious2',-5.5,35.7,1]
  );

  // Every eligible roster officer receives one named starting command in each
  // Conquest. Prefer existing anonymous formations; only create fresh formations
  // if a coalition has more officers than deployed units (the 2018 U.F.N.).
  // Keep this deterministic: it must not consume the game's combat RNG.
  function fillRosterCommands(armies, era) {
    const roster = root.KnightmareData.COMMANDERS;
    const is2018 = era === 'ufn2018';
    const euro = new Set(['julius','shin','ashley','manfredi','farnese','augustus','kewell','norland']);
    const ownerOf = (id, officer) => is2018
      ? (officer.side === 'britannia' ? (euro.has(id) ? 'eb' : 'britannia') : 'cf')
      : officer.side;
    // Correct legacy 2018 assignments: the E.U.'s Klaus and Oscar cannot
    // command Euro Britannian units; both belong to the U.F.N. instead.
    if (is2018) for (const unit of armies)
      if (unit[0] === 'eb' && ['klaus','oscar'].includes(unit[5])) unit.splice(5, 2);
    const availableOfficers = Object.entries(roster).filter(([, officer]) => is2018 || ['britannia','eu','cf'].includes(officer.side));
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
    // Preserve free formations for attaching purchased HQ officers. A complete
    // starting cast must not disable the ordinary commander-assignment mechanic.
    if (is2018) armies.push(
      ['cf','medium',113.5,34,1,null,'bk'],
      ['cf','assault',20.5,51.9,1,null,'bk'],
      ['cf','rocket',36.6,-1.5,1,null,'bk']
    );
    if (used.size !== availableOfficers.length)
      throw new Error('Not every ' + era + ' commander has a starting deployment');
    return armies;
  }
  fillRosterCommands(root.KnightmareData.ARMY_DATA, 'world');
  fillRosterCommands(ufn2018.armies, 'ufn2018');
  const CONQUESTS = {
    world: { id: 'world', title: '2017 — World War', majors: ['britannia', 'eu', 'cf'], selectable: ['britannia','eu','cf'], teams: {}, ownership: null, expectedCities: { britannia: 51, eu: 58, cf: 47, neutral: 12 } },
    ufn2018,
  };
  (root.KnightmareData ||= {}).CONQUESTS = CONQUESTS;
  if (typeof module !== 'undefined') module.exports = CONQUESTS;
})(typeof window !== 'undefined' ? window : globalThis);

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
          "Paris": "britannia",
          "Madrid": "britannia",
          "Gibraltar": "britannia",
          "Barcelona": "britannia",
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
    expectedCities: { britannia: 75, eb: 15, cf: 72, neutral: 6 },
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
  const CONQUESTS = {
    world: { id: 'world', title: '2017 — World War', majors: ['britannia', 'eu', 'cf'], selectable: ['britannia','eu','cf'], teams: {}, ownership: null, expectedCities: { britannia: 51, eu: 58, cf: 47, neutral: 12 } },
    ufn2018,
  };
  (root.KnightmareData ||= {}).CONQUESTS = CONQUESTS;
  if (typeof module !== 'undefined') module.exports = CONQUESTS;
})(typeof window !== 'undefined' ? window : globalThis);

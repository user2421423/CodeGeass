  // Two story seasons: Lelouch of the Rebellion (2010–2017) and R2 (2018), each played from
  // the Black Knights' side and from Britannia's. Mission ids are kept so saved stars carry over.
  const BY_ID = Object.fromEntries([...BLACK_KNIGHTS, ...BRITANNIA, ...EXTRA, ...EUROPE, ...CHINESE_FEDERATION, ...XINGKE_UFN].map(m => [m.id, m]));
  const pick = ids => ids.map(id => BY_ID[id]);
  const CAMPAIGNS = {
    bk_s1: {
      name: 'The Order of the Black Knights',
      short: 'Black Knights S1',
      season: 1,
      side: 'bk',
      portrait: 'zero',
      years: '2017 a.t.b.',
      desc: 'Season 1, Lelouch of the Rebellion: from the Shinjuku Ghetto to the Black Rebellion, Zero builds an army out of a resistance cell.',
      missions: pick(['bk1', 'bk_saitama', 'bk2', 'bk3', 'bk_yokosuka', 'bk_tohdoh', 'bk_shikine', 'bk_fukuoka', 'bk_saz', 'bk4']),
    },
    britannia_s1: {
      name: 'Holy Britannian Empire',
      short: 'Britannia S1',
      season: 1,
      side: 'britannia',
      portrait: 'cornelia',
      years: '2010–2017 a.t.b.',
      desc: 'Season 1, Lelouch of the Rebellion: from the invasion of Japan to the Black Rebellion, Cornelia’s army hunts the Japanese resistance and Zero.',
      missions: pick(['br1', 'br2', 'br_mef', 'br3', 'br4', 'br_yokosuka', 'br_tohdoh', 'br_shikine', 'br_fukuoka', 'br5']),
    },
    bk_r2: {
      name: 'The Order of the Black Knights',
      short: 'Black Knights R2',
      season: 2,
      side: 'bk',
      portrait: 'zero',
      years: '2018 a.t.b.',
      desc: 'R2: Zero returns, crosses the Pacific and the Chinese Federation, destroys the Geass Order and fights the last war for Japan, from Babel Tower to Damocles.',
      missions: pick(['bk5', 'bk_rescue', 'bk_pacific', 'bk_yokosuka2', 'bk_zhengzhou', 'bk_xiaopei', 'bk6', 'bk_geass', 'bk8', 'bk7', 'bk9', 'bk10']),
    },
    britannia_r2: {
      name: 'Holy Britannian Empire',
      short: 'Britannia R2',
      season: 2,
      side: 'britannia',
      portrait: 'lelouch',
      years: '2018 a.t.b.',
      desc: 'R2: the Empire against the returned Zero, from the Chinese Consulate and the Federation to Kagoshima, Tokyo, Emperor Lelouch and the assault on Damocles.',
      missions: pick(['br7', 'br_execution', 'br_pacific', 'br_yokosuka2', 'br_xiaopei', 'br_mausoleum', 'br_kagoshima', 'br8', 'br_kamejima', 'br9', 'br10', 'br11']),
    },
    cf_r2: {
      name: 'Chinese Federation',
      short: 'Chinese Federation R2',
      season: 2,
      side: 'cf',
      portrait: 'xingke',
      years: '2018 a.t.b.',
      desc: 'R2: Li Xingke rises against the High Eunuchs, pursues Zero and Kallen across the Federation, then joins the Black Knights to free Empress Tianzi. Ten tactical chapters adapt the Chinese Revolution.',
      missions: pick(['cf1', 'cf2', 'cf3', 'cf4', 'cf5', 'cf6', 'cf7', 'cf8', 'cf9', 'cf10']),
    },
    cf_ufn: {
      name: 'Xingke — War for the UFN', short: 'Xingke / UFN',
      season: 4, side: 'cf', portrait: 'xingke', years: '2018 a.t.b.',
      desc: 'A separate twelve-chapter follow-up to the Chinese Revolution: the southern landing at Kagoshima, the Fuji catastrophe, and the attack and boarding of the Avalon. Tactical chapters expand the anime engagements; all mastery rewards remain Federation fragments.',
      missions: pick(['ufn1', 'ufn2', 'ufn3', 'ufn4', 'ufn5', 'ufn6', 'ufn7', 'ufn8', 'ufn9', 'ufn10', 'ufn11', 'ufn12']),
    },
    eb_europe: {
      name: 'Euro Britannia',
      short: 'Euro Britannia',
      season: 3,
      side: 'eb',
      portrait: 'shin',
      years: '2017–2018 a.t.b.',
      desc: 'The imperial war against Europia: El Alamein, holding Sankt Petersburg before Narva, the knights of Akito the Exiled, the Italian landing with Schneizel and Suzaku, and the march on Paris.',
      missions: pick(['eb_el_alamein', 'eb_hold_petersburg', 'eb_narva', 'eb_slonim', 'br6', 'eb_petersburg', 'eb_ark', 'eb_weisswolf', 'eb_assault', 'eb_italy', 'eb_fall']),
    },
    eu_europe: {
      name: 'Europia United',
      short: 'E.U.',
      season: 3,
      side: 'eu',
      portrait: 'leila',
      years: '2017–2018 a.t.b.',
      desc: 'wZERO from Narva and Slonim to the Gallia Grande, the lakeside rescue, stopping Apollo’s Chariot, Weisswolf and Smilas’s coup; then the regular E.U. army faces Suzaku at the Italian coast.',
      missions: pick(['eu_narva', 'eu_ambush', 'eu_slonim', 'eu_front', 'eu_ark', 'eu_weisswolf', 'eu_lakeside_rescue', 'eu_apollo', 'eu_assault', 'eu_paris', 'eu_white_death']),
    },
  };
  // The story arcs as mission-based campaigns, each played from either side: the two seasons and Akito the Exiled's war in Europe.
  const SEASONS = {
    1: { name: 'Lelouch of the Rebellion', short: 'Season 1', years: '2010–2017 a.t.b.' },
    2: { name: 'Lelouch of the Rebellion R2', short: 'R2', years: '2018 a.t.b.' },
    3: { name: 'The Euro Britannia War', short: 'Europe', years: '2017–2018 a.t.b. · Akito the Exiled' },
    4: { name: 'War for the UFN', short: 'UFN', years: '2018 a.t.b. · Xingke’s later war' },
  };
  root.KnightmareMissions = { CAMPAIGNS, SEASONS };
  if (typeof module !== 'undefined') module.exports = root.KnightmareMissions;
})(typeof window !== 'undefined' ? window : globalThis);

/* Procedural fallback artwork: Knightmare Frames, cities and commander busts are drawn as SVG at runtime and
   cached as images for the canvas. Published sprites and portraits from assets/art/manifest.js overlay these
   drawings when available; missing or failed image files automatically keep the procedural fallback. */
const ART = (() => {
  const INK = '#0b0d14';
  // Faction trims and sensor glows; a unit's own palette sets its armor colors.
  const FACTION_ART = {
    britannia: { trim: '#e3c06a', glow: '#8ff7ff', flag: '#b52f35', flag2: '#e3c06a' },
    eu: { trim: '#d7dde6', glow: '#ffd24a', flag: '#356fc8', flag2: '#f4d35e' },
    cf: { trim: '#f2c14e', glow: '#ff7a45', flag: '#b52a2a', flag2: '#f2c14e' },
    neutral: { trim: '#d8cfa6', glow: '#b8ff8a', flag: '#8a8466', flag2: '#e6dfc0' },
    bk: { trim: '#f0c94a', glow: '#ff5a5a', flag: '#1d1d24', flag2: '#f0c94a' },
    jlf: { trim: '#c9d6a0', glow: '#9fff7a', flag: '#3d4a2c', flag2: '#d8e2b0' },
    eb: { trim: '#e3c06a', glow: '#d2a8ff', flag: '#4b2a7a', flag2: '#e3c06a' },
  };
  // Neutral garrisons fly frames bought abroad, repainted in desert khaki.
  const NEUTRAL_PAINT = { main: '#9c9472', dark: '#5f5a44' };
  // Body plans and paint per Knightmare (see engine KNIGHTMARES).
  const SPECS = {
    glasgow: { body: 'humanoid', bulk: 0.95, head: 'visor', shoulder: 'round', weapon: 'rifle', main: '#5b6680' },
    gloucester: {
      body: 'humanoid',
      bulk: 1.02,
      head: 'horn',
      shoulder: 'pauldron',
      weapon: 'lance',
      back: 'cape',
      main: '#5d3c92',
    },
    gracchus: { body: 'humanoid', bulk: 0.9, head: 'crest', shoulder: 'spike', weapon: 'rapier', main: '#dcd7cb', dark: '#2b2b33' },
    sutherland: { body: 'humanoid', bulk: 1, head: 'visor', shoulder: 'block', weapon: 'rifle', main: '#6e5ca3' },
    vincent_ward: { body: 'humanoid', bulk: 1, head: 'fin', shoulder: 'round', weapon: 'lance', main: '#4b7c66' },
    vincent_commander: { body: 'humanoid', bulk: 1.05, head: 'fin', shoulder: 'spike', weapon: 'lance', back: 'wings', main: '#8a3f88', trim: '#c9c5d6' },
    brighton: { body: 'humanoid', bulk: 1.25, head: 'mono', shoulder: 'wide', weapon: 'railgun', main: '#5b6190' },
    liverpool: { body: 'tank', main: '#8b8164' },
    sutherland_air: { body: 'humanoid', bulk: 1, head: 'visor', shoulder: 'block', weapon: 'rifle', back: 'wings', main: '#6e5ca3', trim: '#c23b3b' },
    gareth: { body: 'giant', bulk: 1.3, head: 'mono', shoulder: 'wide', weapon: 'none', back: 'launcher', main: '#463d68' },
    alexander_drone: { body: 'humanoid', bulk: 0.8, head: 'insect', shoulder: 'none', weapon: 'rifle', main: '#33405c' },
    estrella_cc: { body: 'humanoid', bulk: 1.05, head: 'visor', shoulder: 'block', weapon: 'twin', main: '#2f6f5a', trim: '#e0c040' },
    alexander: { body: 'insect', main: '#3b4f7c' },
    estrella: { body: 'humanoid', bulk: 1.05, head: 'visor', shoulder: 'block', weapon: 'rifle', main: '#2c2e33', trim: '#55b85f' },
    alexander_mp: { body: 'humanoid', bulk: 0.9, head: 'insect', shoulder: 'spike', weapon: 'rifle', main: '#4a4fb0', trim: '#7ed957' },
    panzer_wespe: { body: 'box', heavy: true, main: '#57654a', trim: '#e1d39a' },
    alexander_elite: { body: 'humanoid', bulk: 1, head: 'insect', shoulder: 'round', weapon: 'katana', back: 'wings', main: '#e8ebf2', trim: '#c0303a', glow: '#9fe8ff' },
    gardmare: { body: 'egg', main: '#7e8b5a', trim: '#cbc28c' },
    panzer_hummel: { body: 'box', main: '#6d7b56', trim: '#e1d39a' },
    hummel_battery: { body: 'box', heavy: true, main: '#5d6f80', trim: '#8f925a' },
    gun_ru: { body: 'dome', main: '#4f7e48', trim: '#c2342c' },
    burai_kai: { body: 'humanoid', bulk: 1, head: 'visor', shoulder: 'round', weapon: 'katana', main: '#8a7f62', trim: '#4a3a2a' },
    chuyen: { body: 'humanoid', bulk: 0.85, head: 'tiger', shoulder: 'spike', weapon: 'pole', main: '#c5452d' },
    gekka: { body: 'humanoid', bulk: 0.9, head: 'fin', shoulder: 'round', weapon: 'katana', main: '#3d4859' },
    akatsuki: { body: 'humanoid', bulk: 0.95, head: 'fin', shoulder: 'block', weapon: 'katana', back: 'guns', main: '#3b414b' },
    akatsuki_zikisan: { body: 'humanoid', bulk: 1, head: 'fin', shoulder: 'spike', weapon: 'katana', main: '#2c3170' },
    akatsuki_air: { body: 'humanoid', bulk: 1.05, head: 'fin', shoulder: 'spike', weapon: 'rifle', back: 'wings', main: '#2c3170' },
    gekka_rocket: { body: 'humanoid', bulk: 0.9, head: 'fin', shoulder: 'round', weapon: 'rifle', back: 'pods', main: '#3d5a55' },
    akatsuki_missile: { body: 'humanoid', bulk: 0.95, head: 'fin', shoulder: 'block', weapon: 'none', back: 'launcher', main: '#8a8f96', trim: '#c8562a' },
    akatsuki_heavy: { body: 'humanoid', bulk: 1.05, head: 'fin', shoulder: 'block', weapon: 'none', back: 'bigcannon', main: '#5f8f86' },
    elite_cornelia_gloucester: { body: 'humanoid', bulk: 1.05, head: 'horn', shoulder: 'pauldron', weapon: 'lance', back: 'cape', main: '#6e3f99', trim: '#d6b75e' },
    elite_lancelot: { body: 'humanoid', bulk: 1.02, head: 'fin', shoulder: 'round', weapon: 'rifle', main: '#eef0ed', dark: '#313b47', trim: '#d5aa43', glow: '#67d8ff' },
    elite_guren_mkii: { body: 'humanoid', bulk: 1.02, head: 'fin', shoulder: 'spike', weapon: 'katana', main: '#9f2827', dark: '#3b1719', trim: '#d08b35', glow: '#ff6048' },
    elite_tohdoh_gekka: { body: 'humanoid', bulk: 0.94, head: 'fin', shoulder: 'round', weapon: 'katana', main: '#30333a', dark: '#14161b', trim: '#8d2e31', glow: '#ff7a55' },
    elite_mordred: { body: 'giant', bulk: 1.35, head: 'mono', shoulder: 'wide', weapon: 'none', back: 'bigcannon', main: '#7a2e43', dark: '#2d1823', trim: '#d0a557', glow: '#dc74ff' },
    elite_gawain: { body: 'giant', bulk: 1.25, head: 'crest', shoulder: 'wide', weapon: 'none', back: 'wings', main: '#27232d', dark: '#111116', trim: '#d3aa4f', glow: '#a86cff' },
    elite_shinkiro: { body: 'humanoid', bulk: 1.1, head: 'crest', shoulder: 'wide', weapon: 'none', back: 'wings', main: '#24252b', dark: '#0f1115', trim: '#d3a94e', glow: '#f05a46' },
    elite_lancelot_albion: { body: 'humanoid', bulk: 1.06, head: 'fin', shoulder: 'round', weapon: 'rifle', back: 'wings', main: '#f1f0e8', dark: '#2d3440', trim: '#d7ac43', glow: '#64e4ff' },
    elite_guren_seiten: { body: 'humanoid', bulk: 1.07, head: 'fin', shoulder: 'spike', weapon: 'katana', back: 'wings', main: '#a82225', dark: '#351519', trim: '#d69735', glow: '#ff684f' },
    bamides: { body: 'tripod', main: '#b9a67b', trim: '#5b4b2b' },
    // Campaign-only frames.
    burai: { body: 'humanoid', bulk: 0.95, head: 'visor', shoulder: 'round', weapon: 'rifle', main: '#3a3b40' },
    akatsuki_flight: { body: 'humanoid', bulk: 0.95, head: 'fin', shoulder: 'block', weapon: 'rifle', back: 'wings', main: '#5f8f86' },
    zangetsu: { body: 'humanoid', bulk: 1, head: 'fin', shoulder: 'block', weapon: 'katana', back: 'pods', main: '#272b35' },
    raiko: { body: 'tank', main: '#4b5040', trim: '#a8a07a' },
    // Britannia's navy.
    portman: { body: 'egg', main: '#4f6f8a', trim: '#d9b45a' },
    portman_ii: { body: 'egg', main: '#3e5f7e', trim: '#e3c06a', glow: '#8ff7ff' },
    carrier_battleship: { body: 'ship', main: '#6c5a8a', dark: '#2c2440', trim: '#e3c06a', glow: '#8ff7ff' },
    panzer_frosch: { body: 'egg', main: '#5f7a4e', trim: '#e1d39a' },
    panzer_frosch_ii: { body: 'egg', main: '#4f6b44', trim: '#e1d39a', glow: '#9fe8ff' },
    eu_carrier: { body: 'ship', main: '#5d6f80', dark: '#24303c', trim: '#d7dde6', glow: '#ffd24a' },
    shui_gun_ru: { body: 'dome', main: '#3f6e6a', trim: '#c2342c' },
    shui_gun_ru_ii: { body: 'dome', main: '#2f5f5a', trim: '#e0b24a', glow: '#ff7a45' },
    cf_carrier: { body: 'ship', main: '#7a3a34', dark: '#33100e', trim: '#f2c14e', glow: '#ff7a45' },
    vercingetorix: { body: 'humanoid', bulk: 1.05, head: 'crest', shoulder: 'spike', weapon: 'axe', back: 'wings', main: '#d8b04a', dark: '#4a3412', trim: '#f4e2a0', glow: '#ff7a3a' },
    ahura_mazda: { body: 'giant', bulk: 1.3, head: 'mono', shoulder: 'wide', weapon: 'none', back: 'bigcannon', main: '#8e2f2f', dark: '#2a1010', trim: '#e0b45a', glow: '#ff5a3a' },
    canterbury: { body: 'tank', main: '#5a4a6a', trim: '#cdb0f0' },
    siegfried: { body: 'giant', bulk: 1.35, head: 'mono', shoulder: 'spike', weapon: 'claw', main: '#c9772f', dark: '#3a2312', trim: '#e9c46a', glow: '#ff9a4a' },
    jp_tank: { body: 'tank', main: '#5a6648', trim: '#c9c28a' },
    jp_artillery: { body: 'box', main: '#626b4c', trim: '#c9c28a' },
    shen_hu: { body: 'humanoid', bulk: 1.15, head: 'mask', shoulder: 'pauldron', weapon: 'sword', chest: true, main: '#2f5bab', trim: '#d4372f' },
  };
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16),
      r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255,
      m = v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
    return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const P = pts => pts.map(p => p.map(v => +v.toFixed(1)).join(',')).join(' ');
  const poly = (pts, fill, extra = '') => `<polygon points="${P(pts)}" fill="${fill}" ${extra}/>`;
  const line = (x1, y1, x2, y2, stroke, w, extra = '') =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const circle = (x, y, r, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
  const ink = (w = 1.3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"`;
  function palette(type, side) {
    const s = SPECS[type] || SPECS.sutherland,
      f = FACTION_ART[side] || FACTION_ART.britannia,
      own = !side || !window_side_mismatch(type, side);
    const main = own ? s.main : NEUTRAL_PAINT.main;
    return {
      main,
      light: shade(main, 0.28),
      dark: own && s.dark ? s.dark : shade(main, -0.42),
      deep: shade(main, -0.62),
      trim: own && s.trim ? s.trim : f.trim,
      glow: s.glow || f.glow,
    };
  }
  // A Knightmare painted for a side other than its builder (neutral garrisons) wears khaki.
  let typeSides = {};
  function window_side_mismatch(type, side) {
    return typeSides[type] && side && typeSides[type] !== side;
  }
  // ---- Weapons, held in the front hand at (hx, hy) ----
  function weapon(kind, hx, hy, c) {
    switch (kind) {
      case 'rifle':
        return (
          poly([[hx - 9, hy - 3], [hx + 14, hy - 6], [hx + 15, hy - 1], [hx - 8, hy + 3]], c.deep, ink(1.1)) +
          poly([[hx + 14, hy - 5.5], [hx + 26, hy - 7.5], [hx + 26, hy - 5], [hx + 14, hy - 2.5]], '#30343c', ink(0.9)) +
          poly([[hx - 2, hy + 1], [hx + 2, hy + 1], [hx + 1, hy + 7], [hx - 3, hy + 7]], c.deep, ink(0.8))
        );
      case 'lance':
        return (
          poly([[hx - 6, hy + 4], [hx + 2, hy - 6], [hx + 30, hy - 28], [hx + 4, hy + 4]], c.trim, ink(1.1)) +
          poly([[hx - 4, hy + 4], [hx + 4, hy - 4], [hx + 6, hy + 4]], c.dark, ink(0.8))
        );
      case 'rapier':
        return line(hx, hy, hx + 30, hy - 22, '#e9eef5', 2.4) + line(hx, hy, hx + 30, hy - 22, INK, 0.5) + line(hx - 4, hy - 3, hx + 4, hy + 3, c.trim, 2.6);
      case 'sword':
        return (
          poly([[hx, hy - 2], [hx + 22, hy - 24], [hx + 25, hy - 23], [hx + 4, hy + 1]], '#f2f6fb', ink(1)) +
          line(hx + 3, hy - 2, hx + 22, hy - 21, c.glow, 1.1, 'opacity=".8"') +
          line(hx - 4, hy - 4, hx + 4, hy + 4, c.trim, 3)
        );
      case 'katana':
        return (
          `<path d="M${hx} ${hy} Q${hx + 14} ${hy - 6} ${hx + 26} ${hy - 22}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
          `<path d="M${hx} ${hy} Q${hx + 14} ${hy - 6} ${hx + 26} ${hy - 22}" stroke="#eef3f8" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
          `<path d="M${hx + 4} ${hy - 1} Q${hx + 15} ${hy - 7} ${hx + 24} ${hy - 20}" stroke="${c.glow}" stroke-width="0.8" fill="none" opacity=".85"/>` +
          line(hx - 3, hy - 3, hx + 3, hy + 3, c.trim, 3)
        );
      case 'twin':
        return weapon('sword', hx, hy, c) + weapon('sword', hx - 26, hy + 2, c);
      case 'pole':
        return line(hx - 34, hy + 26, hx + 22, hy - 30, INK, 4.4) + line(hx - 34, hy + 26, hx + 22, hy - 30, c.trim, 2.6) + circle(hx + 22, hy - 30, 2.6, c.glow, ink(0.8)) + circle(hx - 34, hy + 26, 2.4, c.glow, ink(0.8));
      case 'axe':
        return (
          line(hx - 4, hy + 6, hx + 20, hy - 18, INK, 3.6) +
          line(hx - 4, hy + 6, hx + 20, hy - 18, '#4b4f58', 2) +
          poly([[hx + 14, hy - 20], [hx + 28, hy - 26], [hx + 26, hy - 10], [hx + 18, hy - 12]], '#e9eef5', ink(1)) +
          line(hx + 18, hy - 22, hx + 27, hy - 24, c.trim, 1.4)
        );
      case 'railgun':
        return (
          poly([[hx - 12, hy - 6], [hx + 18, hy - 10], [hx + 19, hy - 3], [hx - 11, hy + 2]], c.deep, ink(1.1)) +
          poly([[hx + 16, hy - 9.5], [hx + 34, hy - 12], [hx + 34, hy - 9], [hx + 16, hy - 6.5]], '#2c3038', ink(0.9)) +
          poly([[hx + 16, hy - 6], [hx + 34, hy - 8.5], [hx + 34, hy - 5.5], [hx + 16, hy - 3]], '#2c3038', ink(0.9)) +
          circle(hx + 34, hy - 8.5, 2, c.glow, 'opacity=".9"')
        );
      case 'claw':
        return (
          poly([[hx - 8, hy - 8], [hx + 6, hy - 10], [hx + 10, hy + 2], [hx - 4, hy + 6]], c.light, ink(1.2)) +
          poly([[hx + 6, hy - 10], [hx + 16, hy - 14], [hx + 12, hy - 6]], '#dfe4ea', ink(0.9)) +
          poly([[hx + 9, hy - 4], [hx + 20, hy - 4], [hx + 11, hy + 1]], '#dfe4ea', ink(0.9)) +
          poly([[hx + 8, hy + 1], [hx + 16, hy + 7], [hx + 6, hy + 5]], '#dfe4ea', ink(0.9)) +
          circle(hx + 2, hy - 2, 2.4, c.glow, 'opacity=".9"')
        );
      default:
        return '';
    }
  }
  // ---- Back gear drawn behind the body ----
  function backGear(kind, b, c) {
    const x = 50 - 12 * b;
    switch (kind) {
      case 'cape':
        return poly([[x + 2, 30], [x + 20 * b, 31], [x + 10, 64], [x - 8, 74], [x - 6, 50]], c.trim, ink(1.1)) + poly([[x - 2, 34], [x + 4, 34], [x - 4, 70], [x - 7, 72]], shade(c.trim, -0.35));
      case 'wings':
        return (
          poly([[x + 4, 32], [x - 22, 8], [x - 14, 26], [x - 26, 22], [x - 8, 40]], c.trim, ink(1.1)) +
          poly([[x + 4, 38], [x - 24, 44], [x - 14, 50], [x - 2, 48]], shade(c.trim, -0.3), ink(1)) +
          line(x - 20, 12, x - 4, 34, c.glow, 1, 'opacity=".8"')
        );
      case 'pods':
        return poly([[x - 6, 18], [x + 12, 16], [x + 14, 30], [x - 4, 32]], c.dark, ink(1.1)) + [0, 1, 2].map(i => circle(x - 1 + i * 5, 22, 1.6, INK)).join('') + [0, 1, 2].map(i => circle(x + i * 5, 27, 1.6, INK)).join('');
      case 'guns':
        return poly([[x + 4, 22], [x + 22, 20], [x + 22, 25], [x + 4, 27]], c.deep, ink(1)) + line(x + 22, 22.5, x + 32, 21.5, '#2c3038', 2.4);
      case 'hadron':
        return [0, 1]
          .map(i => {
            const y = 20 + i * 7;
            return (
              poly([[x - 4, y], [x + 34, y - 4], [x + 35, y + 2], [x - 4, y + 5]], i ? c.dark : c.deep, ink(1.1)) +
              circle(x + 36, y - 1, 2.4, '#ff4d6d', 'opacity=".95"')
            );
          })
          .join('');
      case 'launcher':
        return (
          poly([[x - 8, 14], [x + 16, 12], [x + 18, 28], [x - 6, 30]], c.dark, ink(1.2)) +
          [0, 1, 2, 3]
            .map(i => [0, 1].map(j => circle(x - 3 + i * 5.2, 18 + j * 6, 1.7, INK)).join(''))
            .join('') +
          poly([[x + 6, 30], [x + 38, 26], [x + 38, 31], [x + 6, 35]], c.deep, ink(1)) +
          circle(x + 39, 28.5, 2.2, '#ff4d6d')
        );
      case 'bigcannon':
        return (
          poly([[x - 10, 20], [x + 8, 14], [x + 14, 26], [x - 4, 32]], c.dark, ink(1.2)) +
          poly([[x + 4, 14], [x + 48, 4], [x + 50, 12], [x + 8, 24]], c.deep, ink(1.2)) +
          poly([[x + 44, 3], [x + 52, 1], [x + 54, 12], [x + 46, 13]], c.trim, ink(1)) +
          circle(x + 53, 6.5, 2.6, '#ff6a8a')
        );
      default:
        return '';
    }
  }
  // ---- Heads ----
  function head(kind, hx, hy, c) {
    const eye = (x, y, r = 2) => circle(x, y, r + 1.2, c.glow, 'opacity=".25"') + circle(x, y, r, c.glow, ink(0.6));
    switch (kind) {
      case 'visor':
        return (
          `<ellipse cx="${hx}" cy="${hy}" rx="6.2" ry="6" fill="${c.main}" ${ink()}/>` +
          poly([[hx - 2, hy - 2], [hx + 6.5, hy - 2.5], [hx + 6.5, hy + 2], [hx - 2, hy + 2]], c.deep) +
          eye(hx + 4, hy, 1.8) +
          line(hx - 5, hy - 5, hx - 1, hy - 6.5, c.light, 1.2)
        );
      case 'horn':
        return (
          poly([[hx - 5, hy - 5], [hx + 6, hy - 6], [hx + 7, hy + 4], [hx - 4, hy + 5]], c.main, ink()) +
          poly([[hx - 2, hy - 5], [hx - 7, hy - 15], [hx + 2, hy - 6]], c.trim, ink(0.9)) +
          poly([[hx + 3, hy - 6], [hx + 9, hy - 14], [hx + 6, hy - 5]], c.trim, ink(0.9)) +
          eye(hx + 4, hy - 0.5)
        );
      case 'crest':
        return (
          poly([[hx - 5, hy - 4], [hx + 6, hy - 6], [hx + 8, hy + 3], [hx - 3, hy + 5]], c.main, ink()) +
          poly([[hx - 4, hy - 4], [hx + 1, hy - 14], [hx + 4, hy - 5]], c.trim, ink(0.9)) +
          eye(hx + 4.5, hy - 0.5)
        );
      case 'fin':
        return (
          poly([[hx - 5, hy - 4], [hx + 6, hy - 5], [hx + 7, hy + 4], [hx - 4, hy + 5]], c.main, ink()) +
          poly([[hx + 2, hy - 4], [hx - 6, hy - 13], [hx + 4, hy - 7], [hx + 12, hy - 12], [hx + 5, hy - 3]], c.trim, ink(0.9)) +
          eye(hx + 4, hy)
        );
      case 'mono':
        return (
          poly([[hx - 5, hy - 4], [hx + 6, hy - 4], [hx + 7, hy + 4], [hx - 5, hy + 5]], c.dark, ink()) +
          poly([[hx - 1, hy - 1.5], [hx + 7, hy - 1.5], [hx + 7, hy + 1.5], [hx - 1, hy + 1.5]], c.glow, 'opacity=".95"')
        );
      case 'insect':
        return (
          poly([[hx - 5, hy - 2], [hx + 3, hy - 6], [hx + 10, hy - 1], [hx + 3, hy + 4], [hx - 4, hy + 3]], c.main, ink()) +
          eye(hx + 3, hy - 1.5, 1.4) +
          eye(hx + 6.5, hy + 0.5, 1.4) +
          line(hx - 2, hy - 4, hx - 8, hy - 11, c.trim, 1.3)
        );
      case 'tiger':
        return (
          poly([[hx - 5, hy - 4], [hx + 6, hy - 5], [hx + 8, hy + 3], [hx - 3, hy + 5]], c.main, ink()) +
          poly([[hx - 6, hy - 4], [hx - 3, hy - 11], [hx + 1, hy - 5]], c.trim, ink(0.9)) +
          poly([[hx + 2, hy - 5], [hx + 7, hy - 12], [hx + 7, hy - 4]], c.trim, ink(0.9)) +
          eye(hx + 4.5, hy - 0.5)
        );
      case 'mask':
        return (
          poly([[hx - 6, hy - 4], [hx + 7, hy - 6], [hx + 9, hy + 3], [hx + 2, hy + 7], [hx - 4, hy + 5]], c.trim, ink()) +
          poly([[hx - 1, hy - 5], [hx + 2, hy - 20], [hx + 4, hy - 5]], '#d4372f', ink(0.9)) +
          poly([[hx - 2, hy - 2], [hx + 8, hy - 3], [hx + 8, hy + 1], [hx - 2, hy + 1]], c.main) +
          eye(hx + 5, hy - 1, 1.6)
        );
      default:
        return '';
    }
  }
  function shoulderArmor(kind, x, y, s, fill, c) {
    switch (kind) {
      case 'round':
        return `<ellipse cx="${x}" cy="${y}" rx="${7.5 * s}" ry="${6.5 * s}" fill="${fill}" ${ink()}/>` + line(x - 4 * s, y - 3.5 * s, x + 2 * s, y - 5 * s, c.light, 1.1);
      case 'block':
        return poly([[x - 7 * s, y - 6 * s], [x + 7 * s, y - 7 * s], [x + 8 * s, y + 5 * s], [x - 6 * s, y + 6 * s]], fill, ink());
      case 'pauldron':
        return poly([[x - 8 * s, y - 4 * s], [x + 2 * s, y - 9 * s], [x + 11 * s, y - 3 * s], [x + 9 * s, y + 7 * s], [x - 7 * s, y + 6 * s]], fill, ink()) + line(x - 6 * s, y + 4 * s, x + 8 * s, y + 5 * s, c.trim, 1.4);
      case 'spike':
        return poly([[x - 6 * s, y - 5 * s], [x + 6 * s, y - 6 * s], [x + 13 * s, y - 11 * s], [x + 8 * s, y + 4 * s], [x - 6 * s, y + 5 * s]], fill, ink());
      case 'wide':
        return poly([[x - 9 * s, y - 7 * s], [x + 10 * s, y - 8 * s], [x + 12 * s, y + 6 * s], [x - 8 * s, y + 7 * s]], fill, ink()) + line(x - 7 * s, y - 4 * s, x + 9 * s, y - 5 * s, c.trim, 1.6);
      default:
        return '';
    }
  }
  // ---- Body plans ----
  function humanoid(s, c) {
    const b = s.bulk || 1,
      giant = s.body === 'giant',
      cx = 50,
      top = giant ? 24 : 30,
      hipY = giant ? 58 : 56,
      chestW = 12 * b,
      legW = giant ? 1.25 : 1;
    const X = v => cx + (v - cx) * b;
    let svg = backGear(s.back, b, c);
    // Rear leg.
    svg += poly([[X(46) - 3 * legW, hipY - 2], [X(46) + 3 * legW, hipY], [44, 70], [38, 69]], c.dark, ink());
    svg += poly([[37, 68], [45 + 2 * legW, 70], [44 + legW, 86], [35 - legW, 86]], c.dark, ink());
    svg += poly([[32, 86], [47, 86], [48, 91], [31, 91]], c.deep, ink()) + circle(35, 91, 2.6, '#1a1c22', ink(0.8));
    // Rear arm.
    svg += poly([[X(40) - 2, top + 8], [X(40) + 4, top + 9], [X(38) + 3, top + 24], [X(38) - 3, top + 23]], c.dark, ink());
    svg += poly([[X(38) - 3, top + 23], [X(38) + 3, top + 24], [X(41), top + 32], [X(36), top + 31]], c.dark, ink());
    // Cockpit hump and torso.
    svg += `<rect x="${X(29)}" y="${top - 1}" width="${13 * b}" height="${18 + 2 * b}" rx="5" fill="${c.dark}" ${ink()}/>`;
    svg += poly([[cx - 6, hipY - 7], [cx + 8, hipY - 7], [cx + 10, hipY + 1], [cx + 2, hipY + 4], [cx - 7, hipY + 1]], c.dark, ink());
    svg += poly(
      [
        [cx - chestW, top + 2],
        [cx + chestW - 2, top],
        [cx + chestW + 2, top + 14],
        [cx + chestW - 4, hipY - 6],
        [cx - chestW + 4, hipY - 6],
        [cx - chestW - 1, top + 12],
      ],
      c.main,
      ink(),
    );
    svg += poly([[cx - chestW + 3, top + 3], [cx + chestW - 4, top + 1.5], [cx + chestW - 2, top + 7], [cx - chestW + 3, top + 8]], c.light, 'opacity=".55"');
    svg += line(cx - chestW + 4, hipY - 8, cx + chestW - 5, hipY - 8, c.trim, 1.6);
    if (s.chest) svg += circle(cx + 4, top + 12, 3.4, c.glow, ink(0.8)) + circle(cx + 4, top + 12, 6, c.glow, 'opacity=".25"');
    // Front leg.
    svg += poly([[cx + 1, hipY - 1], [cx + 8 * legW, hipY], [61, 70], [54, 71]], c.main, ink());
    svg += poly([[53, 69], [62 + legW, 69], [62 + legW, 86], [52 - legW, 86]], c.main, ink());
    svg += poly([[52, 68], [62, 67], [63, 73], [52, 74]], c.light, ink(0.9));
    svg += poly([[50, 86], [65, 86], [67, 91], [49, 91]], c.deep, ink()) + circle(55, 91, 2.6, '#1a1c22', ink(0.8)) + circle(63, 91, 2.2, '#1a1c22', ink(0.8));
    // Head.
    svg += poly([[cx - 2, top - 2], [cx + 4, top - 2], [cx + 4, top + 2], [cx - 2, top + 2]], c.deep);
    svg += head(s.head, cx + 2, top - 7, c);
    // Front shoulder, arm and weapon.
    const sx = cx + chestW - 1,
      sy = top + 4;
    svg += shoulderArmor(s.shoulder, X(40), top + 3, giant ? 1.15 : 1, c.dark, c);
    const hx = sx + 10,
      hy = top + 22;
    svg += poly([[sx - 3, sy + 3], [sx + 4, sy + 2], [sx + 8, sy + 12], [sx + 2, sy + 14]], c.main, ink());
    svg += poly([[sx + 2, sy + 12], [sx + 8, sy + 11], [hx + 2, hy - 1], [hx - 3, hy + 2]], c.main, ink());
    svg += circle(hx, hy, 2.6, c.deep, ink(0.9));
    svg += weapon(s.weapon, hx, hy, c);
    svg += shoulderArmor(s.shoulder, sx, sy, giant ? 1.25 : 1, c.main, c);
    if (giant)
      svg += [0, 1, 2]
        .map(i => line(hx + 1, hy + 1, hx + 6 + i * 2, hy + 6 - i, c.trim, 1.4))
        .join('');
    return svg;
  }
  function insect(s, c) {
    // Alexander in Insect Mode: low, four limbs on the ground, rifle on a sub-arm.
    let svg = '';
    svg += poly([[30, 66], [24, 80], [20, 90], [26, 90], [34, 74]], c.dark, ink());
    svg += poly([[44, 68], [42, 82], [40, 90], [46, 90], [50, 72]], c.dark, ink());
    svg += poly([[24, 58], [56, 52], [74, 58], [70, 70], [30, 72]], c.main, ink());
    svg += poly([[28, 58], [54, 53], [60, 56], [30, 62]], c.light, 'opacity=".6"');
    svg += `<rect x="30" y="46" width="22" height="13" rx="5" fill="${c.dark}" ${ink()}/>`;
    svg += poly([[58, 66], [66, 80], [68, 90], [74, 90], [72, 76], [66, 64]], c.main, ink());
    svg += poly([[66, 62], [80, 74], [86, 90], [92, 90], [88, 72], [74, 58]], c.main, ink());
    svg += poly([[70, 54], [84, 50], [90, 56], [80, 62], [70, 60]], c.main, ink());
    svg += circle(84, 55, 1.8, c.glow, ink(0.6)) + circle(88, 56.5, 1.5, c.glow, ink(0.6));
    svg += poly([[40, 48], [72, 40], [73, 44], [41, 52]], '#30343c', ink(1));
    svg += line(26, 64, 70, 58, c.trim, 1.4);
    return svg;
  }
  function dome(s, c) {
    // Gun-Ru: a frog-like dome on stubby legs, guns and cannons on the shoulders.
    let svg = '';
    svg += poly([[34, 72], [40, 72], [38, 88], [30, 88]], c.dark, ink()) + poly([[27, 88], [42, 88], [43, 92], [26, 92]], c.deep, ink());
    svg += poly([[58, 72], [66, 72], [68, 88], [58, 88]], c.main, ink()) + poly([[56, 88], [71, 88], [72, 92], [55, 92]], c.deep, ink());
    svg += `<ellipse cx="50" cy="56" rx="28" ry="21" fill="${c.main}" ${ink()}/>`;
    svg += `<path d="M26 54 Q50 26 74 54" fill="${c.light}" opacity=".45"/>`;
    svg += `<ellipse cx="50" cy="66" rx="22" ry="8" fill="${c.dark}" opacity=".55"/>`;
    svg += poly([[60, 50], [76, 48], [77, 54], [61, 56]], c.deep, ink(0.9)) + circle(72, 51.5, 2.2, c.glow, ink(0.6));
    svg += poly([[44, 36], [70, 30], [72, 36], [46, 42]], c.dark, ink(1)) + line(70, 33, 92, 29, '#2b2f36', 3.4) + line(70, 33, 92, 29, '#4a4f58', 1.4);
    svg += poly([[42, 42], [66, 40], [67, 45], [43, 47]], c.dark, ink(1)) + line(66, 42.5, 86, 41, '#2b2f36', 2.4);
    svg += line(30, 58, 70, 58, c.trim, 1.8);
    svg += poly([[66, 62], [74, 64], [72, 70], [64, 68]], c.dark, ink(0.8));
    return svg;
  }
  function box(s, c) {
    // Panzer-Hummel, Panzer-Wespe and the Hummel gun battery: a walking armored box with arm cannons and missile pods.
    let svg = '';
    svg += poly([[32, 70], [42, 70], [40, 88], [30, 88]], c.dark, ink()) + poly([[27, 88], [44, 88], [45, 92], [26, 92]], c.deep, ink());
    svg += poly([[56, 70], [66, 70], [68, 88], [56, 88]], c.main, ink()) + poly([[54, 88], [71, 88], [72, 92], [53, 92]], c.deep, ink());
    svg += poly([[26, 40], [66, 34], [76, 44], [72, 70], [28, 72]], c.main, ink());
    svg += poly([[30, 42], [64, 37], [70, 43], [32, 48]], c.light, 'opacity=".5"');
    svg += poly([[58, 46], [76, 44], [76, 52], [60, 54]], c.deep, ink(0.9)) + circle(72, 48, 2, c.glow, ink(0.6));
    svg += poly([[34, 52], [50, 50], [50, 62], [34, 64]], c.dark, ink(0.9)) + [0, 1, 2].map(i => circle(38 + i * 5, 57, 1.7, INK)).join('');
    if (s.heavy) {
      svg += poly([[30, 30], [56, 24], [58, 32], [32, 38]], c.dark, ink(1.1));
      svg += poly([[50, 24], [96, 14], [97, 20], [51, 31]], c.deep, ink(1.1)) + poly([[94, 12], [99, 11], [100, 21], [95, 22]], c.trim, ink(0.9));
      svg += poly([[44, 34], [90, 26], [90, 31], [45, 40]], c.deep, ink(1)) ;
    } else {
      svg += poly([[60, 58], [90, 52], [91, 58], [61, 64]], '#2b2f36', ink(1)) + poly([[22, 56], [30, 56], [30, 66], [22, 66]], c.dark, ink(0.9));
      svg += poly([[54, 38], [84, 32], [85, 37], [55, 43]], '#2b2f36', ink(1));
    }
    svg += line(28, 66, 72, 64, c.trim, 1.6);
    return svg;
  }
  function egg(s, c) {
    // Gardmare: an egg-shaped pod with two big claws and arm cannons.
    let svg = '';
    svg += poly([[38, 72], [44, 72], [42, 88], [34, 88]], c.dark, ink()) + poly([[31, 88], [46, 88], [47, 92], [30, 92]], c.deep, ink());
    svg += poly([[54, 72], [60, 72], [62, 88], [54, 88]], c.main, ink()) + poly([[52, 88], [65, 88], [66, 92], [51, 92]], c.deep, ink());
    svg += poly([[30, 44], [24, 58], [30, 66], [36, 58]], c.dark, ink());
    svg += `<ellipse cx="48" cy="54" rx="20" ry="22" fill="${c.main}" ${ink()}/>`;
    svg += `<ellipse cx="44" cy="46" rx="11" ry="9" fill="${c.light}" opacity=".45"/>`;
    svg += poly([[54, 40], [64, 38], [66, 44], [56, 46]], c.deep, ink(0.9)) + circle(62, 41.5, 1.9, c.glow, ink(0.6));
    svg += poly([[62, 50], [76, 48], [80, 58], [66, 62]], c.main, ink());
    svg += line(76, 52, 92, 48, '#2b2f36', 3.2);
    svg += poly([[78, 56], [90, 60], [84, 62]], '#dfe4ea', ink(0.8)) + poly([[76, 60], [86, 68], [78, 66]], '#dfe4ea', ink(0.8));
    svg += line(32, 62, 64, 62, c.trim, 1.6);
    return svg;
  }
  function tank(s, c) {
    // Liverpool: a tank turret on two legs.
    let svg = '';
    svg += poly([[36, 64], [44, 64], [40, 88], [32, 88]], c.dark, ink()) + poly([[29, 88], [44, 88], [45, 92], [28, 92]], c.deep, ink());
    svg += poly([[56, 64], [64, 64], [66, 88], [56, 88]], c.main, ink()) + poly([[54, 88], [69, 88], [70, 92], [53, 92]], c.deep, ink());
    svg += poly([[26, 50], [70, 46], [76, 56], [72, 66], [28, 68]], c.main, ink());
    svg += poly([[34, 38], [62, 34], [68, 46], [32, 50]], c.dark, ink());
    svg += poly([[36, 39], [60, 35.5], [62, 39], [36, 42]], c.light, 'opacity=".5"');
    svg += poly([[62, 38], [98, 32], [99, 37], [63, 44]], '#2b2f36', ink(1.1)) + poly([[94, 30], [100, 29], [100, 39], [95, 40]], c.dark, ink(0.8));
    svg += poly([[70, 52], [82, 50], [83, 55], [71, 57]], '#3a3f48', ink(0.8));
    svg += circle(48, 42, 1.8, c.glow, ink(0.6));
    svg += line(28, 62, 72, 60, c.trim, 1.6);
    return svg;
  }
  function tripod(s, c) {
    // Bamides: an elevated hull on three hover legs, a belly cannon and shoulder missiles.
    let svg = '';
    svg += poly([[30, 56], [20, 84], [26, 86], [38, 60]], c.dark, ink()) + `<ellipse cx="22" cy="88" rx="7" ry="3" fill="${c.deep}" ${ink(0.8)}/>`;
    svg += poly([[46, 62], [44, 86], [50, 86], [54, 62]], c.dark, ink()) + `<ellipse cx="47" cy="89" rx="7" ry="3" fill="${c.deep}" ${ink(0.8)}/>`;
    svg += poly([[62, 56], [76, 84], [82, 82], [70, 54]], c.main, ink()) + `<ellipse cx="79" cy="86" rx="7" ry="3" fill="${c.deep}" ${ink(0.8)}/>`;
    svg += poly([[22, 40], [72, 34], [80, 46], [70, 60], [26, 62]], c.main, ink());
    svg += poly([[26, 30], [44, 26], [46, 38], [28, 40]], c.dark, ink()) + [0, 1, 2].map(i => circle(31 + i * 5, 33, 1.7, INK)).join('');
    svg += poly([[54, 54], [96, 50], [96, 55], [55, 60]], '#2b2f36', ink(1));
    svg += poly([[66, 38], [80, 38], [80, 44], [66, 44]], c.deep, ink(0.9)) + circle(76, 41, 1.9, c.glow, ink(0.6));
    svg += line(26, 56, 72, 52, c.trim, 1.6);
    return svg;
  }
  function fortress(s, c) {
    // Sutherland Sieg: a floating fortress shell with lance harkens and a Sutherland core on top.
    let svg = `<ellipse cx="50" cy="90" rx="26" ry="4" fill="${c.glow}" opacity=".25"/>`;
    for (const [x1, y1, x2, y2] of [
      [30, 58, 6, 40],
      [32, 66, 8, 78],
      [70, 58, 96, 40],
      [68, 66, 94, 80],
      [50, 74, 50, 92],
    ])
      svg += poly([[x1 - 2, y1], [x1 + 2, y1], [x2, y2]], c.trim, ink(1));
    svg += `<ellipse cx="50" cy="60" rx="28" ry="18" fill="${c.main}" ${ink()}/>`;
    svg += `<path d="M24 56 Q50 34 76 56" fill="${c.light}" opacity=".45"/>`;
    svg += poly([[42, 70], [58, 70], [56, 78], [44, 78]], c.deep, ink(1)) + circle(50, 76, 2.6, c.glow);
    svg += poly([[42, 30], [58, 28], [60, 44], [40, 46]], '#6e5ca3', ink());
    svg += `<ellipse cx="51" cy="24" rx="5" ry="5" fill="#6e5ca3" ${ink()}/>` + circle(54, 24, 1.6, c.glow);
    svg += line(26, 62, 74, 62, c.trim, 1.6);
    return svg;
  }
  function ship(s, c) {
    // Britannian Carrier-Battleship: a long hull, a Knightmare launch deck forward, the bridge and guns aft.
    let svg = '';
    svg += poly([[6, 64], [94, 64], [86, 80], [16, 80]], c.main, ink());
    svg += poly([[16, 80], [86, 80], [84, 85], [18, 85]], c.deep, ink(0.9));
    svg += poly([[8, 60], [58, 60], [58, 64], [6, 64]], c.light, ink(0.9));
    svg += line(12, 62, 54, 62, c.trim, 1.4);
    svg += poly([[58, 44], [80, 44], [84, 64], [56, 64]], c.dark, ink());
    svg += poly([[63, 34], [75, 34], [77, 44], [61, 44]], c.main, ink());
    svg += circle(69, 39, 1.8, c.glow, ink(0.6)) + line(68, 26, 68, 34, '#2b2f36', 1.6);
    svg += `<rect x="84" y="56" width="9" height="5" rx="1.5" fill="${c.deep}" ${ink(0.9)}/>` + line(90, 57, 99, 53, '#2b2f36', 2.2);
    svg += `<rect x="38" y="54" width="11" height="6" rx="1.5" fill="${c.deep}" ${ink(0.9)}/>` + line(40, 55, 27, 50, '#2b2f36', 2.4);
    svg += line(16, 72, 84, 72, c.trim, 1.6);
    return svg;
  }
  const BODIES = { humanoid, giant: humanoid, insect, dome, box, egg, tank, tripod, fortress, ship };
  const svgCache = new Map();
  function knightmareSVG(type, side) {
    const k = `${type}|${side}`;
    if (svgCache.has(k)) return svgCache.get(k);
    const s = SPECS[type] || SPECS.sutherland,
      c = palette(type, side),
      body = (BODIES[s.body] || humanoid)(s, c);
    const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g>${body}</g></svg>`;
    svgCache.set(k, out);
    return out;
  }
  // ---- Cities ----
  function citySVG(kind, side) {
    const f = FACTION_ART[side] || FACTION_ART.neutral,
      wall = side === 'neutral' ? '#c9b98c' : side === 'cf' ? '#cdbfae' : side === 'eu' ? '#cfd3da' : '#d8d2e6',
      roof = f.flag,
      win = '#ffe9a8';
    const towers = (list, base) =>
      list
        .map(([x, w, h]) => {
          let s = `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${wall}" ${ink(1.2)}/>`;
          s += `<rect x="${x}" y="${base - h}" width="${w}" height="4" fill="${roof}" ${ink(0.8)}/>`;
          for (let y = base - h + 8; y < base - 4; y += 6)
            for (let xx = x + 3; xx < x + w - 2; xx += 5) s += `<rect x="${xx}" y="${y}" width="2.2" height="2.6" fill="${win}"/>`;
          return s;
        })
        .join('');
    const flag = (x, y) =>
      line(x, y, x, y - 18, '#2a2a2e', 1.6) + poly([[x, y - 18], [x + 14, y - 15], [x, y - 11]], f.flag, ink(0.8)) + poly([[x, y - 16], [x + 8, y - 15], [x, y - 13]], f.flag2);
    let body = '';
    if (kind === 'capital') {
      body += `<ellipse cx="50" cy="86" rx="44" ry="10" fill="#00000055"/>`;
      body += poly([[8, 84], [92, 84], [88, 90], [12, 90]], '#5b5e66', ink(1.2));
      body += towers([[12, 12, 30], [76, 12, 32]], 84);
      body += `<rect x="24" y="52" width="52" height="32" fill="${wall}" ${ink(1.3)}/>`;
      for (let x = 28; x < 74; x += 8) body += `<rect x="${x}" y="60" width="3" height="14" fill="${win}"/>`;
      body += poly([[22, 52], [78, 52], [72, 46], [28, 46]], roof, ink(1));
      body += `<path d="M34 46 Q50 18 66 46Z" fill="${f.flag2}" ${ink(1.3)}/>`;
      body += `<path d="M38 44 Q50 24 50 24" stroke="#fff6" stroke-width="2" fill="none"/>`;
      body += flag(50, 26);
    } else if (kind === 'fortress') {
      body += `<ellipse cx="50" cy="86" rx="42" ry="10" fill="#00000055"/>`;
      body += towers([[30, 14, 30], [54, 16, 38]], 80);
      body += poly([[8, 64], [92, 64], [92, 84], [8, 84]], '#6f727a', ink(1.3));
      for (let x = 8; x < 92; x += 10) body += `<rect x="${x}" y="58" width="6" height="7" fill="#6f727a" ${ink(0.9)}/>`;
      body += `<rect x="38" y="70" width="24" height="14" fill="#3a3c42" ${ink(1)}/>`;
      body += poly([[58, 48], [96, 36], [97, 42], [60, 54]], '#2c2f36', ink(1.1)) + circle(58, 50, 6, '#4a4d55', ink(1));
      body += flag(30, 50);
    } else {
      body += `<ellipse cx="50" cy="86" rx="40" ry="9" fill="#00000055"/>`;
      body += poly([[14, 84], [86, 84], [82, 89], [18, 89]], '#5b5e66', ink(1.1));
      body += towers([[18, 14, 26], [34, 16, 40], [52, 14, 30], [68, 14, 22]], 84);
      body += flag(42, 44);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
  }
  // ---- Fallback commander busts: original character designs drawn in code ----
  // These generic officers are used only when a published portrait is unavailable or fails to load.
  // Name, rank and abilities come from the engine; this table only sets fallback face, hair and uniform.
  const LOOKS = {
    // Holy Britannian Empire: ivory, violet and black coats with gold trim.
    suzaku: { hair: 'short', hc: '#3a4252', eye: '#c9983a', coat: '#e9e6dc', trim: '#d4af37' },
    cornelia: { hair: 'tied', hc: '#2e2420', eye: '#7a5a3a', coat: '#4a2c63', trim: '#d4af37' },
    bismarck: { hair: 'swept', hc: '#c9c4b8', eye: '#5a6a7a', coat: '#eeeef2', trim: '#d4af37', acc: ['mustache'], age: 1 },
    julius: { hair: 'spiky', hc: '#2a3a52', eye: '#b04a4a', coat: '#24242c', trim: '#d4af37' },
    schneizel: { hair: 'bob', hc: '#b0793a', eye: '#4a7ab0', coat: '#f2efe6', trim: '#c9a04a' },
    gino: { hair: 'ponytail', hc: '#6a4228', eye: '#3a8a8a', coat: '#eeeef2', trim: '#2f6a5a' },
    anya: { hair: 'bun', hc: '#2a2430', eye: '#6a4a8a', coat: '#eeeef2', trim: '#b04a7a' },
    luciano: { hair: 'braids', hc: '#7a3a2a', eye: '#c08a2a', coat: '#eeeef2', trim: '#d4af37', acc: ['stubble'] },
    jeremiah: { hair: 'swept', hc: '#26332a', eye: '#4a5a8a', coat: '#2f4a7a', trim: '#d4af37', acc: ['mustache'] },
    shin: { hair: 'long', hc: '#e0d6c0', eye: '#7a4a9a', coat: '#f0ede4', trim: '#c9a04a' },
    rolo: { hair: 'curly', hc: '#8a6a4a', eye: '#4a6a8a', coat: '#2a2f45', trim: '#c9a04a' },
    guilford: { hair: 'swept', hc: '#3a2a26', eye: '#5a6a7a', coat: '#4a2c63', trim: '#d4af37', acc: ['mustache'] },
    darlton: { hair: 'bald', hc: '#3a3028', eye: '#6a5a4a', coat: '#4a2c63', trim: '#d4af37', skin: '#d9a77f', acc: ['beard'], age: 1 },
    ashley: { hair: 'spiky', hc: '#9aa0a8', eye: '#c43a3a', coat: '#26262c', trim: '#c9a04a', acc: ['grin'] },
    // Europia United: navy, blue and green with silver trim.
    leila: { hair: 'ponytail', hc: '#5a3a2a', eye: '#4a7ab0', coat: '#2f4f8f', trim: '#d7dde6' },
    akito: { hair: 'messy', hc: '#1e2a3a', eye: '#6a8a3a', coat: '#1f2a44', trim: '#d7dde6' },
    ryo: { hair: 'spiky', hc: '#a0522d', eye: '#7a5a3a', coat: '#1f2a44', trim: '#f08a2a' },
    ayano: { hair: 'bob', hc: '#2a2a38', eye: '#5a4a3a', coat: '#1f2a44', trim: '#b07ad6' },
    yukiya: { hair: 'curly', hc: '#c9b890', eye: '#6a8a96', coat: '#1f2a44', trim: '#5fbf6a' },
    oscar: { hair: 'short', hc: '#6a7078', eye: '#4a5a6a', coat: '#2a3346', trim: '#d7dde6' },
    klaus: { hair: 'messy', hc: '#6a5a48', eye: '#6a6a66', coat: '#55603a', trim: '#d7dde6', acc: ['stubble'], age: 1 },
    anna: { hair: 'bun', hc: '#3a2a22', eye: '#5a7a4a', coat: '#f2f2ee', trim: '#2f4f8f', acc: ['glasses'] },
    smilas: { hair: 'swept', hc: '#9a9a9a', eye: '#4a6a8a', coat: '#2f4f8f', trim: '#f4d35e', acc: ['mustache'], age: 1 },
    fernando: { hair: 'short', hc: '#2a2220', eye: '#5a3a2a', coat: '#2f6a3a', trim: '#d7dde6', skin: '#e4b48f', acc: ['stubble'] },
    marirrosa: { hair: 'long', hc: '#7a2a2a', eye: '#5a3a2a', coat: '#9a2a2a', trim: '#d7dde6', skin: '#e9bf9a' },
    // Chinese Federation: crimson, jade and gold.
    xingke: { hair: 'short', hc: '#1a1a22', eye: '#8a3a2a', coat: '#1f3a35', trim: '#f2c14e' },
    xianglin: { hair: 'ponytail', hc: '#3a2a4a', eye: '#6a6ad6', coat: '#2a3a5a', trim: '#f2c14e' },
    honggu: { hair: 'short', hc: '#7a7a76', eye: '#5a4a3a', coat: '#3a4a2a', trim: '#f2c14e', acc: ['beard'], age: 1 },
    cao: { hair: 'short', hc: '#2a2622', eye: '#5a4a3a', coat: '#4a3a2a', trim: '#f2c14e', acc: ['mustache'], age: 1 },
    gaohai: { hair: 'cap', hc: '#151515', eye: '#4a3a2a', coat: '#8a1f1f', trim: '#f2c14e', skin: '#f2dcc8', acc: ['grin'] },
    zhaohao: { hair: 'cap', hc: '#151515', eye: '#4a3a2a', coat: '#4a2050', trim: '#f2c14e', skin: '#efd6c0' },
    leifeng: { hair: 'messy', hc: '#262230', eye: '#c08a2a', coat: '#5a1f1f', trim: '#f2c14e' },
    meiling: { hair: 'bob', hc: '#6a4a38', eye: '#6a4a3a', coat: '#3a3f48', trim: '#f2c14e' },
    lifeng: { hair: 'short', hc: '#202020', eye: '#5a3a2a', coat: '#c4442c', trim: '#f2c14e' },
    rakshata: { hair: 'wavy', hc: '#2a1e1a', eye: '#4a7a8a', coat: '#f2f2ee', trim: '#c4442c', skin: '#c99a6c' },
  };
  const BACKDROP = {
    britannia: ['#5b1717', '#b8963e'],
    eu: ['#173a70', '#6f9fdc'],
    cf: ['#5a1a1a', '#c49a3a'],
    bk: ['#16161c', '#c9a43a'],
    jlf: ['#26301c', '#8fa060'],
    eb: ['#2a1640', '#a07ad8'],
  };
  function hairBack(style, hc) {
    switch (style) {
      case 'long':
        return `<path d="M14 26 Q14 8 30 7 Q46 8 46 26 L48 66 Q40 70 30 62 Q20 70 12 66Z" fill="${hc}"/>`;
      case 'wavy':
        return `<path d="M13 26 Q14 7 30 7 Q46 7 47 26 Q50 40 46 54 Q40 60 30 56 Q20 60 14 54 Q10 40 13 26Z" fill="${hc}"/>`;
      case 'tied':
        return `<path d="M15 24 Q16 8 30 7 Q44 8 45 24 L44 34 Q30 28 16 34Z" fill="${hc}"/><path d="M40 30 Q54 46 46 72 L40 72 Q46 50 36 34Z" fill="${hc}"/>`;
      case 'ponytail':
        return `<path d="M42 16 Q58 22 52 50 L46 50 Q50 28 38 22Z" fill="${hc}"/>`;
      case 'braids':
        return `<path d="M16 26 Q12 40 16 52 L20 52 Q17 40 20 28Z" fill="${hc}"/><path d="M44 26 Q48 40 44 52 L40 52 Q43 40 40 28Z" fill="${hc}"/>`;
      case 'bob':
        return `<path d="M15 24 Q15 8 30 7 Q45 8 45 24 L46 40 Q30 46 14 40Z" fill="${hc}"/>`;
      case 'buns':
        return `<circle cx="17" cy="11" r="6" fill="${hc}"/><circle cx="43" cy="11" r="6" fill="${hc}"/>`;
      case 'bun':
        return `<circle cx="30" cy="6" r="6" fill="${hc}"/>`;
      default:
        return '';
    }
  }
  function hairFront(style, hc) {
    const hi = shade(hc, 0.25);
    switch (style) {
      case 'curly':
        return `<path d="M16 24 Q14 8 30 8 Q46 8 44 24 Q40 16 36 20 Q34 13 29 19 Q25 12 22 20 Q19 15 16 24Z" fill="${hc}"/><path d="M21 12 Q28 9 36 12" stroke="${hi}" stroke-width="1.4" fill="none"/>`;
      case 'messy':
      case 'spiky':
        return `<path d="M15 25 L13 12 L20 15 L19 6 L26 12 L30 4 L33 12 L40 6 L40 14 L47 12 L44 25 Q40 18 36 21 L34 15 L30 22 L26 15 L23 21 Q19 18 15 25Z" fill="${hc}"/>`;
      case 'swept':
        return `<path d="M15 24 Q15 8 31 7 Q46 8 45 22 Q38 12 26 16 Q22 18 20 26Z" fill="${hc}"/><path d="M22 12 Q32 8 41 13" stroke="${hi}" stroke-width="1.3" fill="none"/>`;
      case 'short':
        return `<path d="M15 24 Q15 8 30 7 Q45 8 45 24 Q42 15 36 17 Q30 13 24 17 Q18 15 15 24Z" fill="${hc}"/>`;
      case 'bald':
        return `<path d="M16 22 Q18 9 30 9 Q42 9 44 22 Q42 14 30 13 Q18 14 16 22Z" fill="${shade(hc, 0.6)}" opacity=".35"/>`;
      case 'cap':
        return `<path d="M13 18 Q14 4 30 3 Q46 4 47 18Z" fill="${hc}"/><rect x="11" y="16" width="38" height="5" rx="2" fill="#2a2a2a"/><circle cx="30" cy="5" r="2.4" fill="#d4af37"/>`;
      case 'long':
      case 'wavy':
      case 'tied':
      case 'bob':
      case 'buns':
      case 'bun':
      case 'ponytail':
      case 'braids':
        return `<path d="M15 26 Q14 8 30 7 Q46 8 45 26 Q42 15 34 17 Q30 12 24 18 Q18 16 15 26Z" fill="${hc}"/><path d="M21 11 Q29 8 38 11" stroke="${hi}" stroke-width="1.3" fill="none"/>`;
      default:
        return '';
    }
  }
  function portraitSVG(k) {
    const l = LOOKS[k] || { hair: 'short', hc: '#333', eye: '#456', coat: '#333', trim: '#ccc' },
      side = CMD_SIDES[k] || 'britannia',
      bg = BACKDROP[side],
      skin = l.skin || '#f3d6c2',
      skinD = shade(skin, -0.16),
      acc = l.acc || [],
      id = 'pb-' + k;
    const eye = (x, closed) =>
      closed
        ? `<path d="M${x - 3.5} 31 Q${x} 33 ${x + 3.5} 31" stroke="#2a1a14" stroke-width="1.3" fill="none"/>`
        : `<ellipse cx="${x}" cy="30.5" rx="3.3" ry="3.6" fill="#fff"/><ellipse cx="${x + 0.3}" cy="31" rx="2.3" ry="2.9" fill="${l.eye}"/><circle cx="${x + 0.4}" cy="31.4" r="1.2" fill="#140c10"/><circle cx="${x - 0.6}" cy="29.8" r="0.8" fill="#fff"/><path d="M${x - 3.8} 28 Q${x} 26 ${x + 3.8} 28" stroke="#2a1a14" stroke-width="1.2" fill="none"/>`;
    let s = `<svg viewBox="0 0 60 80" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs><rect width="60" height="80" fill="url(#${id})"/>`;
    s += `<path d="M0 0H60V80H0Z" fill="none" stroke="#ffffff22"/>`;
    s += hairBack(l.hair, l.hc);
    if (l.cape) s += `<path d="M2 80 Q6 56 18 52 L42 52 Q54 56 58 80Z" fill="${l.cape}"/>`;
    s += `<path d="M4 80 C6 62 16 55 30 55 C44 55 54 62 56 80Z" fill="${l.coat}"/>`;
    s += `<path d="M22 55 L30 66 L38 55" fill="${shade(l.coat, -0.25)}" stroke="${l.trim}" stroke-width="1.2"/>`;
    s += `<path d="M10 66 L22 58 M50 66 L38 58" stroke="${l.trim}" stroke-width="1.6"/>`;
    s += `<rect x="25" y="44" width="10" height="12" fill="${skinD}"/>`;
    s += `<path d="M17 26 Q17 46 30 50 Q43 46 43 26 Q43 14 30 14 Q17 14 17 26Z" fill="${skin}"/>`;
    s += `<path d="M18 36 Q20 46 30 50 Q24 44 22 36Z" fill="${skinD}" opacity=".5"/>`;
    s += eye(24.5, acc.includes('closed')) + (acc.includes('patch') ? `<path d="M30.5 26 L41 25 L40 35 L31 35Z" fill="#111"/><path d="M17 24 L44 22" stroke="#111" stroke-width="1"/>` : eye(35.5, false));
    s += `<path d="M30 33 L29 39 L31 39" stroke="${skinD}" stroke-width="1" fill="none"/>`;
    s += acc.includes('grin')
      ? `<path d="M25 42 Q30 46 35 42" stroke="#5a2a2a" stroke-width="1.3" fill="#fff"/>`
      : `<path d="M26.5 43 Q30 44.3 33.5 43" stroke="#7a3a34" stroke-width="1.2" fill="none"/>`;
    if (l.age) s += `<path d="M20 38 Q22 40 22 42 M40 38 Q38 40 38 42" stroke="${skinD}" stroke-width="0.8" fill="none"/>`;
    s += hairFront(l.hair, l.hc);
    if (acc.includes('glasses'))
      s += `<rect x="19.5" y="27" width="10" height="7.5" rx="2" fill="#bfe8ff33" stroke="#222" stroke-width="1"/><rect x="30.5" y="27" width="10" height="7.5" rx="2" fill="#bfe8ff33" stroke="#222" stroke-width="1"/><path d="M29.5 30 H30.5" stroke="#222"/>`;
    if (acc.includes('mask'))
      s += `<path d="M30 22 Q44 20 44 30 Q44 40 36 44 L30 40Z" fill="#e8892a" stroke="#7a3a10" stroke-width="1"/><circle cx="37" cy="30.5" r="2.2" fill="#ffe08a"/>`;
    if (acc.includes('scar')) s += `<path d="M36 22 L40 38" stroke="#a5534a" stroke-width="1.4"/>`;
    if (acc.includes('beard')) s += `<path d="M20 38 Q22 52 30 54 Q38 52 40 38 Q36 46 30 47 Q24 46 20 38Z" fill="${shade(l.hc, 0.1)}"/>`;
    if (acc.includes('mustache')) s += `<path d="M24 41 Q30 38 36 41 Q30 40 24 41Z" fill="${l.hc}" stroke="${l.hc}" stroke-width="1.2"/>`;
    if (acc.includes('stubble')) s += `<path d="M21 40 Q24 49 30 50 Q36 49 39 40" stroke="${shade(l.hc, -0.2)}" stroke-width="2.2" stroke-dasharray="0.6 1.2" fill="none" opacity=".7"/>`;
    if (acc.includes('pipe')) s += `<path d="M33 43 L45 47" stroke="#4a2a1a" stroke-width="2"/><rect x="44" y="43" width="5" height="5" rx="1" fill="#4a2a1a"/><path d="M47 42 Q49 36 46 32" stroke="#ffffff88" stroke-width="1" fill="none"/>`;
    s += `</svg>`;
    return s;
  }
  let CMD_SIDES = {};
  // ---- Canvas images, cached per SVG ----
  const images = new Map();
  function image(keyName, svg) {
    if (typeof Image === 'undefined') return null;
    let img = images.get(keyName);
    if (!img) {
      img = new Image();
      img.src =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(svg.replace('<svg ', keyName.startsWith('p|') ? '<svg width="120" height="160" ' : '<svg width="200" height="200" '));
      images.set(keyName, img);
    }
    return img.complete && img.naturalWidth ? img : null;
  }
  // Public art is registered synchronously by assets/art/manifest.js, including when opened via file://.
  // Local overrides remain optional. Missing or failed images keep the drawn fallback.
  const LOCAL = { units: {}, portraits: {}, buildings: {}, base: 'local-art/', imgs: new Map() };
  function localEntry(kind, id) {
    const e = LOCAL[kind][id];
    return e ? (typeof e === 'string' ? { src: e } : e) : null;
  }
  const escapeAttr = value => String(value).replace(/[&"<>]/g, c => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]);
  function entries(values, base) {
    return Object.fromEntries(Object.entries(values || {}).flatMap(([id, value]) => {
      const e = typeof value === 'string' ? { src: value } : value;
      if (!e || typeof e.src !== 'string' || !/^(units|portraits|buildings)\/[\w-]+\.(png|jpe?g|webp|gif|svg)$/i.test(e.src)) return [];
      const focus = v => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : undefined;
      return [[id, { src: e.src, base, fx: focus(e.fx), fy: focus(e.fy) }]];
    }));
  }
  function localImage(kind, id) {
    const e = localEntry(kind, id);
    if (!e || typeof Image === 'undefined') return null;
    const k = kind + '|' + id;
    let img = LOCAL.imgs.get(k);
    if (!img) {
      img = new Image();
      img.onerror = () => (img.failed = true);
      img.src = e.base + e.src;
      LOCAL.imgs.set(k, img);
    }
    return !img.failed && img.complete && img.naturalWidth ? img : null;
  }
  // The drawn SVG sits underneath and is hidden once the file loads; a missing file leaves the drawing in place.
  const withLocal = (kind, id, svg, style = '') => {
    const e = localEntry(kind, id);
    if (!e) return { cls: '', html: svg };
    const src = escapeAttr(e.base + e.src);
    return {
      cls: ' local-art',
      html: `${svg}<img src="${src}" alt="" draggable="false"${style} onload="this.previousElementSibling.style.visibility='hidden'" onerror="this.remove()">`,
    };
  };
  const api = {
    SPECS,
    FACTION_ART,
    LOOKS,
    // Called after a local manifest loads, so the UI can redraw (set by game.js).
    onLocal: null,
    // manifest: { base?, units: { <knightmare id>: 'units/x.png' }, portraits: { <commander id>: 'portraits/x.jpg' | { src, fx, fy } },
    //   buildings: { city: 'buildings/x.webp', port: 'buildings/y.webp' } }
    useLocal(manifest, merge = false) {
      const base = /^(?:[\w-]+\/)+$/.test(manifest?.base || '') ? manifest.base : 'local-art/';
      LOCAL.units = { ...(merge ? LOCAL.units : {}), ...entries(manifest?.units, base) };
      LOCAL.portraits = { ...(merge ? LOCAL.portraits : {}), ...entries(manifest?.portraits, base) };
      LOCAL.buildings = { ...(merge ? LOCAL.buildings : {}), ...entries(manifest?.buildings, base) };
      LOCAL.base = base;
      LOCAL.imgs.clear();
      for (const kind of ['units', 'portraits', 'buildings']) for (const id of Object.keys(LOCAL[kind])) localImage(kind, id);
      api.onLocal?.();
    },
    // Register which faction builds each type and which faction each commander serves (from the engine).
    init(types, commanders) {
      typeSides = Object.fromEntries(Object.entries(types).map(([k, t]) => [k, t.side]));
      CMD_SIDES = Object.fromEntries(Object.entries(commanders).map(([k, a]) => [k, a.side]));
    },
    knightmareSVG,
    citySVG,
    portraitSVG,
    // HTML: a Knightmare for panels and cards.
    unit(type, extra = '', side) {
      const l = withLocal('units', type, knightmareSVG(type, side || typeSides[type]));
      return `<span class="ship-art unit-art${l.cls} ${extra}" aria-hidden="true">${l.html}</span>`;
    },
    city(kind, side, extra = '') {
      const l = withLocal('buildings', 'city', citySVG(kind, side));
      return `<span class="ship-art unit-art city-art${l.cls} ${extra}" aria-hidden="true">${l.html}</span>`;
    },
    portrait(k, extra = '') {
      const e = localEntry('portraits', k),
        style = e ? ` style="object-position:${(e.fx ?? 0.5) * 100}% ${(e.fy ?? 0.25) * 100}%"` : '',
        l = withLocal('portraits', k, portraitSVG(k), style);
      return `<span class="portrait-art generated${l.cls} ${extra}" aria-hidden="true">${l.html}</span>`;
    },
    // Canvas: draw a cached image centered at (x, y); false while the image is still decoding.
    drawUnit(ctx, type, side, x, y, w, h = w, flip = false) {
      const local = localImage('units', type);
      if (local) {
        const r = Math.min(w / local.naturalWidth, h / local.naturalHeight),
          dw = local.naturalWidth * r,
          dh = local.naturalHeight * r;
        ctx.save();
        ctx.translate(x, y);
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(local, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
        return true;
      }
      const img = image(`u|${type}|${side}`, knightmareSVG(type, side));
      if (!img) return false;
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
      return true;
    },
    // Published building art (one city and one port picture for every power) replaces the drawn cities; the owner
    // shows in the map badge and territory. Drawn at width w, keeping the picture's proportions.
    drawBuilding(ctx, id, x, y, w) {
      const img = localImage('buildings', id);
      if (!img) return false;
      const h = (w * img.naturalHeight) / img.naturalWidth;
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      return true;
    },
    drawCity(ctx, kind, side, x, y, w) {
      if (api.drawBuilding(ctx, 'city', x, y, w)) return true;
      const img = image(`c|${kind}|${side}`, citySVG(kind, side));
      if (!img) return false;
      ctx.drawImage(img, x - w / 2, y - w / 2, w, w);
      return true;
    },
    portraitImage(k) {
      return localImage('portraits', k) || image(`p|${k}`, portraitSVG(k));
    },
    // Source rectangle for a w:h portrait frame: a local file is cropped around its focus point (fx, fy).
    portraitSprite(k, w, h) {
      const local = localImage('portraits', k);
      if (local) {
        const e = localEntry('portraits', k),
          nw = local.naturalWidth,
          nh = local.naturalHeight;
        let sw = nw,
          sh = (nw * h) / w;
        if (sh > nh) {
          sh = nh;
          sw = (nh * w) / h;
        }
        const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        return { img: local, sx: cl((e.fx ?? 0.5) * nw - sw / 2, 0, nw - sw), sy: cl((e.fy ?? 0.25) * nh - sh / 2, 0, nh - sh), sw, sh };
      }
      const img = image(`p|${k}`, portraitSVG(k));
      return img ? { img, sx: 0, sy: 0, sw: img.naturalWidth, sh: Math.min(img.naturalHeight, (img.naturalWidth * h) / w) } : null;
    },
    // Warm the cache so the first frames already have art.
    preload(types, sides) {
      for (const t of types) for (const s of sides) image(`u|${t}|${s}`, knightmareSVG(t, s));
      for (const s of sides) for (const kind of ['city', 'capital', 'fortress']) image(`c|${kind}|${s}`, citySVG(kind, s));
    },
  };
  if (typeof globalThis !== 'undefined' && globalThis.KnightmareArtManifest) api.useLocal(globalThis.KnightmareArtManifest);
  // Only development servers request the ignored manifest; GitHub Pages never requests a missing file.
  if (typeof fetch === 'function' && typeof location !== 'undefined' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname))
    fetch('local-art/manifest.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(m => {
        if (!m) return;
        api.useLocal(m, true);
      })
      .catch(() => {});
  return api;
})();
if (typeof Knightmare !== 'undefined') {
  ART.init(Knightmare.TYPES, Knightmare.COMMANDERS);
  ART.preload(Object.keys(Knightmare.TYPES), ['britannia', 'eu', 'cf', 'neutral']);
}

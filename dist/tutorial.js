/* Mechanics tutorial: a small, deterministic battle using the ordinary scenario engine.
   The rival force holds position so a new player can learn without losing the lesson. */
(function (root) {
  'use strict';
  const E = root.Knightmare || (typeof require === 'function' ? require('./engine.js') : null);
  const ID = 'mechanics-tutorial';
  const COLS = 16, ROWS = 11;
  const STEPS = [
    { title: 'Select a Knightmare', instruction: 'Click your red Gloucester near the middle of the battlefield. Selecting a unit shows the hexes it can reach and the enemies it can attack.' },
    { title: 'Move into position', instruction: 'With the Gloucester selected, click a green hex toward the Federation scout. Moving spends the unit\'s movement for this turn, but you can still attack.' },
    { title: 'Attack the scout', instruction: 'Click the highlighted red Federation scout to attack. A target must be in range. If you moved out of range, end the turn to regain movement and reposition.' },
    { title: 'End your first turn', instruction: 'You have moved and attacked. Click End turn (or press E) to refresh your units and collect city income. The training defenders will hold their positions.' },
    { title: 'Capture the depot', instruction: 'Select the Gloucester and move onto the empty Federation Training Depot at hex 7,5. Enemy city defenses must normally be reduced first; this practice depot is already undefended. If it is too far away, end a turn and continue.' },
    { title: 'Recruit reinforcements', instruction: 'Click your original Command Post at hex 1,5, then Factory. Buy a Glasgow or Gloucester. A new unit appears in the city and is ready on your next turn.' },
    { title: 'Refresh your new unit', instruction: 'Press End turn (E). Your newly produced Knightmare will be able to move and fight next turn.' },
    { title: 'Training complete', instruction: 'You selected, moved, attacked, captured, recruited, and ended turns. You are ready to try a regional scenario or the story campaign.' },
  ];
  function create(player = 'britannia', difficulty = 'normal', seed = 246801) {
    if (player !== 'britannia') throw new Error('Tutorial uses Britannia only');
    const g = {
      game: 'knightmare', version: 1, rulesVersion: E.RULES_VERSION,
      player, difficulty: 'normal', mode: 'scenario', era: ID,
      order: ['britannia', 'cf'], seed, wrap: false, cols: COLS, rows: ROWS,
      turn: 1, phase: player, nextId: 1, mapRevision: 0,
      tiles: [], units: [], stations: [], sites: [], log: [], strikes: [], launches: [],
      fallen: {}, stats: {}, over: null, teams: null, roster: {}, medalInventory: [],
      medalsEarned: [], eliteDeployed: {}, arsenal: { britannia: 0, cf: 0 },
      economy: {
        britannia: { credits: 850, industry: 400, science: 50, sakuradite: 80 },
        cf: { credits: 0, industry: 0, science: 0, sakuradite: 0 },
        neutral: { credits: 0, industry: 0, science: 0, sakuradite: 0 },
      },
      tech: { britannia: {}, cf: {}, neutral: {} },
      officers: Object.fromEntries(Object.keys(E.COMMANDERS).map(k => [k, E.defaultOfficer(k)])),
      automation: { enabled: false, autoUpgrade: false, stack: 1, reserve: {}, cities: {} },
      scenario: {
        id: ID, key: 'tutorial', title: 'Mechanics Training Ground',
        phase: 'lesson', groups: [], funding: {}, tutorial: { step: 0 },
      },
    };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const terrain = (r === 1 && c >= 4 && c <= 6) || (r === 9 && c >= 10 && c <= 12)
        ? 'forest' : r === 2 && c === 12 ? 'mountain' : 'plains';
      g.tiles.push({ c, r, terrain, owner: null });
    }
    const makeCity = (name, c, r, owner, shield) => {
      const station = {
        id: g.stations.length, name, c, r, owner, tier: 1,
        lab: 0, refinery: 0, capital: false, capitalOf: null,
        fort: false, gun: null, shield, maxShield: owner === 'britannia' ? 180 : 180,
        income: 45, industry: 18, science: 3, producedTurn: 0,
      };
      g.stations.push(station);
      for (const tile of E.within(g, station, 2))
        if (!tile.owner) tile.owner = owner;
      E.tile(g, c, r).owner = owner;
      return station;
    };
    makeCity('Command Post', 1, 5, 'britannia', 180);
    makeCity('Training Depot', 7, 5, 'cf', 0);
    makeCity('Federation Headquarters', 14, 5, 'cf', 180);
    const trainee = E.newUnit(g, 'gloucester', 'britannia', 3, 5, 1);
    const scout = E.newUnit(g, 'gun_ru', 'cf', 6, 5, 1);
    scout.hp = 1; // One successful attack guarantees the introductory lesson advances.
    const reserve = E.newUnit(g, 'gun_ru', 'cf', 14, 6, 1);
    g.scenario.tutorial.unitId = trainee.id;
    g.scenario.tutorial.scoutId = scout.id;
    g.scenario.tutorial.reserveId = reserve.id;
    E.log(g, 'Training grounds: select the Gloucester to begin.', player);
    return g;
  }
  function objective(g) {
    const step = Math.min(STEPS.length - 1, g.scenario?.tutorial?.step || 0);
    return 'Training ' + (step + 1) + '/' + STEPS.length + ': ' + STEPS[step].title;
  }
  const api = {
    id: ID, title: 'Mechanics Training Ground', cols: COLS, rows: ROWS,
    sides: ['britannia'], create, objective, steps: STEPS,
    onTurn() { return false; },
    winner() { return null; }, // Completion is handled by the lesson card, not scenario conquest.
    strategicScore(g, side) { return g.stations.filter(s => s.owner === side).length; },
    orderGroup() { return { ok: false, reason: 'Army groups are covered after training' }; },
  };
  E.scenarios = {
    ...(E.scenarios || {}),
    tutorial: api,
    byId: { ...(E.scenarios?.byId || {}), [ID]: api },
  };
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

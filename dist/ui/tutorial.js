/* Guided training operation. Intentionally independent of the three operation saves and HQ profile. */
'use strict';
const TUTORIAL_ID = 'training-grounds';
const TUTORIAL_STEPS = [
  { title: 'Welcome to the training grounds', text: 'A short, hands-on battle. You will move a Knightmare, defeat a guard, capture an outpost, produce a new frame, and give it a commander. Nothing here changes your normal saves or HQ progression.', action: 'Begin training' },
  { title: 'Select your Knightmare', text: 'Select the red Britannian Gloucester in the western half of the battlefield. The gold ring marks your next objective.', target: { c: 2, r: 4 } },
  { title: 'Move into position', text: 'With your Gloucester selected, move to the highlighted green hex. Green hexes indicate places you can move this turn.', target: { c: 3, r: 4 } },
  { title: 'Attack the enemy', text: 'Attack the highlighted blue enemy guard. Red crosshairs indicate targets you can attack. On a phone, tap twice to confirm an attack.', target: { c: 4, r: 4 } },
  { title: 'End your turn', text: 'Your unit has acted. Choose End turn (or press E) to refresh movement and attacks. The training opponent will not move.', action: null },
  { title: 'Capture the relay outpost', text: 'Move your Gloucester onto the highlighted city hex. Its defenses are already down, and Infantry can capture it directly.', target: { c: 5, r: 4 } },
  { title: 'Select your headquarters', text: 'Now select the red Headquarters city at the west of the map. A city provides resources and can produce new units.', target: { c: 1, r: 4 } },
  { title: 'Produce a new unit', text: 'In the bottom city actions, open Factory. Choose the Infantry tab, then select Roll out on an affordable unit. Factories can produce one unit per turn.', action: null },
  { title: 'Assign a commander', text: 'Your new unit is selected. Choose Assign in the unit actions (or Command HQ → Commanders) and assign Suzaku. Commanders provide combat advantages.', action: null },
  { title: 'Training complete', text: 'You have used the real movement, combat, capture, production and commander systems. Try Story Mode for smaller battles, or a Regional Scenario when you are ready.', action: null },
];
let tutorialState = null;
const isTutorial = () => game?.mode === 'scenario' && game.scenario?.id === TUTORIAL_ID;

function tutorialScenario() {
  E.scenarios.byId ||= {};
  if (E.scenarios.byId[TUTORIAL_ID]) return;
  // This scenario has no AI, scripted events, result rewards, or profile side effects.
  E.scenarios.byId[TUTORIAL_ID] = {
    id: TUTORIAL_ID, title: 'Training Grounds', sides: ['britannia', 'eu'],
    meta: { map: { homeZoom: 1 }, text: { focus: { britannia: 'Headquarters' } } },
    objective: () => TUTORIAL_STEPS[tutorialState?.step || 0].title,
    winner: () => null,
    onTurn: () => false,
  };
}
function tutorialMakeGame() {
  // Build from a valid engine game to retain all internal state the actual combat,
  // production and commander rules expect; only replace the tactical battlefield.
  const g = E.createGame('britannia', 'normal', 'conquest', 20261016, 'world');
  Object.assign(g, {
    mode: 'scenario', era: 'tutorial', wrap: false,
    cols: 11, rows: 9, order: ['britannia', 'eu'],
    majors: ['britannia', 'eu'], teams: {}, factions: null,
    turn: 1, phase: 'britannia', nextId: 1,
    tiles: [], stations: [], units: [], sites: [],
    scenario: { id: TUTORIAL_ID, title: 'Training Grounds', groups: [] },
    fallen: {}, over: null, warCampaign: null, campaign: null,
    economy: {
      britannia: { credits: 3500, industry: 1200, science: 300, sakuradite: 400 },
      eu: { credits: 0, industry: 0, science: 0, sakuradite: 0 },
      neutral: { credits: 0, industry: 0, science: 0, sakuradite: 0 },
    },
    tech: { britannia: {}, eu: {}, neutral: {} },
    lineup: null, buildable: null, roster: { suzaku: E.defaultOfficer('suzaku', true) },
  });
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const terrain = (r === 1 && c > 6) || (r === 7 && c >= 7) ? 'forest' :
        (r === 2 && c >= 7) ? 'mountain' : 'plains';
      g.tiles.push({ c, r, terrain, owner: c < 5 ? 'britannia' : 'eu',
        provinceCity: c <= 3 ? 0 : c <= 7 ? 1 : 2 });
    }
  }
  const city = (id, name, c, r, owner, shield, tier = 1) => ({
    id, name, c, r, owner, tier, lab: 0, refinery: 0,
    capital: id === 0, capitalOf: id === 0 ? owner : null, fort: false,
    shield, maxShield: id === 0 ? 240 : 180,
    income: 35, industry: 28, science: 8, producedTurn: 0,
  });
  g.stations = [
    city(0, 'Headquarters', 1, 4, 'britannia', 240, 2),
    city(1, 'Relay Outpost', 5, 4, 'eu', 0),
    city(2, 'Eastern Citadel', 9, 4, 'eu', 180),
  ];
  E.newUnit(g, 'gloucester', 'britannia', 2, 4, 2);
  const guard = E.newUnit(g, 'panzer_wespe', 'eu', 4, 4, 1);
  guard.hp = 1; // A guaranteed introductory victory, still resolved by real combat.
  return g;
}
function tutorialStart() {
  withScenarios(() => {
    tutorialScenario();
    resetSession();
    game = tutorialMakeGame();
    tutorialState = { step: 0, initialUnit: game.units.find(u => u.side === 'britannia').id, trainedUnit: null };
    setWorld();
    zoom = 1;
    selection = null;
    closeModal();
    render();
    centerOn({ c: 4, r: 4 });
    tutorialPaint();
  });
}
function tutorialStep(next) {
  if (!isTutorial() || !tutorialState) return;
  tutorialState.step = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, next));
  tutorialPaint();
  requestMapFrame();
}
function tutorialCheck() {
  if (!isTutorial() || !tutorialState) return;
  const t = tutorialState, u = game.units.find(v => v.id === t.initialUnit);
  if (t.step === 1 && selection?.kind === 'unit' && selection.id === t.initialUnit) tutorialStep(2);
  else if (t.step === 2 && u?.c === 3 && u?.r === 4) tutorialStep(3);
  else if (t.step === 3 && !game.units.some(v => v.side === 'eu' && v.c === 4 && v.r === 4 && v.hp > 0)) tutorialStep(4);
  else if (t.step === 5 && game.stations[1].owner === game.player) tutorialStep(6);
  else if (t.step === 6 && selection?.kind === 'station' && selection.id === 0) tutorialStep(7);
  else if (t.step === 7) {
    const fresh = game.units.find(v => v.side === game.player && v.id !== t.initialUnit && v.hp > 0);
    if (fresh) { t.trainedUnit = fresh.id; tutorialStep(8); }
  } else if (t.step === 8 && t.trainedUnit && game.units.find(v => v.id === t.trainedUnit)?.cmd === 'suzaku')
    tutorialStep(9);
}
function tutorialTargetHex() {
  if (!isTutorial() || !tutorialState) return null;
  return TUTORIAL_STEPS[tutorialState.step]?.target || null;
}
function tutorialAllowHex(p) {
  if (!isTutorial() || !tutorialState) return true;
  const step = tutorialState.step;
  const goal = tutorialTargetHex();
  // Require the actual on-board action, not a skip button or a fake simulation.
  if ([1, 2, 3, 5, 6].includes(step) && goal && p.c === goal.c && p.r === goal.r) return true;
  const own = game.units.find(u => u.id === tutorialState.initialUnit);
  if ([2, 3, 5].includes(step) && own?.c === p.c && own?.r === p.r) return true;
  if (step === 8 && p.c === game.units.find(u => u.id === tutorialState.trainedUnit)?.c &&
      p.r === game.units.find(u => u.id === tutorialState.trainedUnit)?.r) return true;
  toast('Follow the highlighted tutorial objective, or choose Restart training.');
  return false;
}
function tutorialEndTurn() {
  if (!isTutorial()) return;
  if (tutorialState?.step !== 4) {
    toast('Complete the highlighted tutorial step before ending your turn.');
    return;
  }
  closeModal();
  undoStack = [];
  E.finishWarTurn(game, game.turn);
  game.turn++;
  E.beginTurn(game, game.player, true);
  render();
  tutorialStep(5);
  toast('Turn refreshed. Your Gloucester can move again.');
}
function tutorialPaint() {
  document.getElementById('tutorial-coach')?.remove();
  if (!isTutorial() || !tutorialState) return;
  const step = tutorialState.step, data = TUTORIAL_STEPS[step];
  const guide = document.createElement('section');
  guide.id = 'tutorial-coach';
  guide.setAttribute('aria-label', 'Interactive tutorial progress');
  guide.innerHTML = `<div class="tutorial-label"><span>FIELD TRAINING</span><span>${step === 9 ? 'Complete' : 'Step ' + (step + 1) + ' of ' + TUTORIAL_STEPS.length}</span></div>
    <div class="tutorial-meter" role="progressbar" aria-label="Tutorial progress" aria-valuemin="0" aria-valuemax="9" aria-valuenow="${step}"><i style="width:${Math.round(step / 9 * 100)}%"></i></div>
    <h3>${esc(data.title)}</h3><p>${esc(data.text)}</p>
    <div class="tutorial-actions">${step === 0 ? '<button class="primary" data-action="tutorial-begin">Begin training →</button>' : ''}
    ${step === 9 ? '<button class="primary" data-action="tutorial-exit">Back to main menu</button>' : ''}
    ${step !== 0 && step !== 9 ? '<button type="button" data-action="tutorial-focus">Show objective</button>' : ''}
    <button type="button" data-action="tutorial-restart">Restart</button>
    ${step === 9 ? '' : '<button type="button" data-action="tutorial-exit">Exit</button>'}</div>`;
  app.appendChild(guide);
}
function tutorialFocus() {
  const target = tutorialTargetHex();
  if (target) centerOn(target);
  else if (tutorialState.step === 8) centerOn(game.units.find(u => u.id === tutorialState.trainedUnit));
  else if (tutorialState.step === 7) centerOn(game.stations[0]);
}
function tutorialExit() {
  tutorialState = null;
  startMenu(); // startMenu resets the scenario session without changing normal saves.
}

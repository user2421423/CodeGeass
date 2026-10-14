/* Tutorial HUD and progress observer. Progress lives in the tutorial save, not in globals. */
'use strict';
function tutorialActive() {
  return game.mode === 'scenario' && game.scenario?.id === 'mechanics-tutorial';
}
function tutorialModel() {
  return E.scenarios?.byId?.['mechanics-tutorial'];
}
function tutorialGuideHTML() {
  if (!tutorialActive()) return '';
  const state = game.scenario.tutorial, model = tutorialModel(),
    step = Math.min(model.steps.length - 1, state.step || 0),
    lesson = model.steps[step], done = step === model.steps.length - 1;
  return `<section id="tutorial-guide" class="tutorial-guide" aria-label="Mechanics tutorial">
    <div class="tutorial-guide-head"><span class="label">Training academy</span>
      <span class="tutorial-count">${done ? 'Complete' : 'Step ' + (step + 1) + ' of ' + (model.steps.length - 1)}</span></div>
    <h3>${esc(lesson.title)}</h3>
    <p>${esc(lesson.instruction)}</p>
    <div class="tutorial-meter" aria-label="${step} of ${model.steps.length - 1} lessons complete">
      <i style="width:${Math.round(100 * step / (model.steps.length - 1))}%"></i></div>
    <div class="tutorial-buttons">
      ${done ? '<button class="primary small" data-action="tutorial-menu">Back to main menu</button>' :
        '<button class="primary small" data-action="tutorial-focus">Locate objective</button>'}
      <button class="small ghost" data-action="tutorial-restart">Restart</button>
      <button class="small ghost" data-action="tutorial-menu">Exit</button>
    </div>
  </section>`;
}
function tutorialObserve(event, detail = {}) {
  if (!tutorialActive()) return false;
  const t = game.scenario.tutorial, current = t.step;
  if (current === 0 && event === 'select' && detail.id === t.unitId) t.step = 1;
  else if (current === 1 && event === 'move' && detail.unitId === t.unitId) t.step = 2;
  else if (current === 2 && event === 'attack' && detail.unitId === t.unitId &&
      detail.target?.c === 6 && detail.target?.r === 5) t.step = 3;
  else if (current === 3 && event === 'turn') t.step = 4;
  else if (current === 4 && event === 'move' && detail.captured === 'Training Depot') t.step = 5;
  else if (current === 5 && event === 'recruit' && detail.city === 'Command Post') t.step = 6;
  else if (current === 6 && event === 'turn') t.step = 7;
  return t.step !== current;
}
function tutorialFocus() {
  if (!tutorialActive()) return;
  const t = game.scenario.tutorial;
  const target = t.step <= 1 || t.step === 3
    ? game.units.find(u => u.id === t.unitId)
    : t.step === 2 ? game.units.find(u => u.id === t.scoutId && u.hp > 0)
    : t.step === 4 ? game.stations.find(s => s.name === 'Training Depot')
    : t.step === 5 ? game.stations.find(s => s.name === 'Command Post')
    : game.units.find(u => u.side === game.player && u.id !== t.unitId);
  if (target) centerOn(target);
}
function startTutorial() {
  const model = tutorialModel();
  if (!model) return;
  resetSession();
  game = model.create('britannia', 'normal', Date.now() >>> 0);
  setWorld();
  selection = null;
  zoom = 2.6;
  closeModal();
  render();
  centerOn(game.units.find(u => u.id === game.scenario.tutorial.unitId));
  save();
  toast('Mechanics Training: follow the step-by-step instructions. You can restart or exit at any time.', true);
}

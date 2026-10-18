'use strict';
const { simulate, E } = require('./scenario_sim.cjs');
const { observer } = require('./tournament_metrics.cjs');
process.once('message', job => {
  const scenario = E.scenarios.byId[job.scenario], started = Date.now();
  const { hooks, metrics } = observer(scenario.sides, job.stallTurns);
  const onTurn = hooks.turn;
  hooks.turn = g => { onTurn(g); process.send?.({ progress: hooks.progress() }); };
  let r, fatal;
  try { ({ r } = simulate(scenario, job.player, job.difficulty, job.seed, job.turns, hooks)); }
  catch (e) { fatal = { ...hooks.progress(), message: e.message, stack: e.stack }; }
  const errors = [...(r?.errors || []).map(error=>({ ...error,
    ...metrics.diagnostics.find(d=>d.turn===error.turn&&d.side===error.side&&d.id===error.id) })),
    ...(fatal ? [fatal] : [])];
  process.send({ result: { ...job, status: errors.length ? 'error' : 'ok',
    completedTurns: metrics.timeline.length, winner: r?.winner || null,
    metrics, errors, elapsedMs: Date.now() - started } }, () => process.disconnect());
});

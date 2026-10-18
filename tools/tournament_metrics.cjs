'use strict';
// Observes the existing scenario_sim loop. Never writes to game state.
const E = require('../dist/engine.js');
const { frontsObserver } = require('./tournament_fronts.cjs');
const units = g => g.units.flatMap(u => [u, ...(u.cargo || [])]).filter(u => u.hp > 0);
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
function observer(sides, stallTurns = 8) {
  const fronts = frontsObserver(stallTurns), diagnostics = [];
  const zeros = () => Object.fromEntries(sides.map(s => [s, 0]));
  const metrics = { productionChoices: Object.fromEntries(sides.map(s => [s, {}])),
    reinforcements: zeros(), formationLosses: zeros(), attacks: zeros(), moves: zeros(),
    carrierDeployments: zeros(), seaLandings: zeros(), navalAttacks: zeros(),
    captures: [], landings: [], fronts: fronts.timeline, stalledFronts: fronts.intervals,
    stalls: [], timeline: [], diagnostics };
  let known, alive, owners, lastProgress = zeros(), currentTurn = 0, lastActor = null;
  const activeStalls = {};
  const hooks = {
    stage: 'setup',
    init(g) {
      known = new Set(units(g).map(u => u.id));
      alive = new Map(units(g).map(u => [u.id, u.side]));
      owners = new Map(g.stations.map(c => [c.id, c.owner]));
      metrics.initial = { turn: g.turn,
        cities: Object.fromEntries(sides.map(s=>[s,g.stations.filter(c=>c.owner===s).length])),
        units: Object.fromEntries(sides.map(s=>[s,units(g).filter(u=>u.side===s).length])) };
      fronts.remember(g,units(g));
    },
    observe(g, phase) {
      hooks.stage = phase;
      currentTurn = g.turn;
      const living = new Map();
      for (const u of units(g)) {
        living.set(u.id, u.side);
        if (!known.has(u.id)) {
          known.add(u.id);
          if (phase === 'production') {
            const choices = metrics.productionChoices[u.side] ||= {};
            choices[u.type] = (choices[u.type] || 0) + 1;
          } else metrics.reinforcements[u.side] = (metrics.reinforcements[u.side] || 0) + 1;
        }
      }
      for (const [id, side] of alive) if (!living.has(id)) {
        metrics.formationLosses[side] = (metrics.formationLosses[side] || 0) + 1;
        lastProgress[side] = g.turn;
        fronts.activity(g,{id,side},'loss');
      }
      alive = living;
      for (const c of g.stations) if (owners.get(c.id) !== c.owner) {
        const from = owners.get(c.id);
        metrics.captures.push({ turn: g.turn, id: c.id, city: c.name, from, to: c.owner });
        lastProgress[from] = lastProgress[c.owner] = g.turn;
        const captor = g.units.find(u=>u.hp>0&&u.side===c.owner&&u.c===c.c&&u.r===c.r);
        if(captor)fronts.activity(g,captor,'capture');
        owners.set(c.id, c.owner);
      }
      fronts.remember(g,units(g));
    },
    before(g, phase, actor = null) {
      hooks.stage = phase;
      lastActor = actor && { id: actor.id, side: actor.side, type: actor.type, c: actor.c, r: actor.r };
    },
    events(g, actor, events) {
      const all = new Map(g.units.flatMap(u=>[u,...(u.cargo||[])]).map(u=>[u.id,u]));
      for (const event of events || []) {
        // Carrier orders recursively include actions by launched cargo.
        const source = all.get(event.id) || actor;
        const side = source.side, naval = E.TYPES[source.type]?.naval;
        if (event.kind === 'attack') {
          metrics.attacks[side]++;
          if (naval) metrics.navalAttacks[side]++;
          fronts.activity(g,source,'attack');
        }
        if(event.captured)fronts.activity(g,source,'capture');
        if (event.kind === 'move') metrics.moves[side]++;
        const carrier = event.kind === 'deploy' && E.TYPES[actor.type]?.naval === 'ship';
        if (carrier) metrics.carrierDeployments[side]++;
        const seaToLand = event.kind === 'move' && event.from && event.to &&
          E.tile(g, event.from.c, event.from.r)?.terrain === 'sea' &&
          E.tile(g, event.to.c, event.to.r)?.terrain !== 'sea';
        if ((carrier || seaToLand) && event.to && E.tile(g, event.to.c, event.to.r)?.terrain !== 'sea') {
          metrics.seaLandings[side]++;
          metrics.landings.push({ turn: g.turn, side, actor: source.id,
            carrier: carrier ? actor.id : null, to: event.to });
        }
      }
    },
    turn(g) {
      const live = units(g);
      const snapshot = { turn: g.turn,
        cities: Object.fromEntries(sides.map(s => [s, g.stations.filter(c => c.owner === s).length])),
        units: Object.fromEntries(sides.map(s => [s, live.filter(u => u.side === s).length])),
        resources: Object.fromEntries(sides.map(s => [s, { ...g.economy[s] }])),
        attacks: { ...metrics.attacks } };
      metrics.timeline.push(snapshot);
      for (const side of sides) {
        const stalled = snapshot.cities[side] > 0 && g.turn - lastProgress[side] >= stallTurns;
        if (stalled && !activeStalls[side]) {
          const item = { side, fromTurn: lastProgress[side] + 1, throughTurn: g.turn };
          activeStalls[side] = item; metrics.stalls.push(item);
        } else if (stalled) activeStalls[side].throughTurn = g.turn;
        else delete activeStalls[side];
      }
      fronts.turn(g,live);
    },
    error(g,e,actor) { diagnostics.push({turn:g.turn,side:actor.side,id:actor.id,
      phase:'aiOrder',message:e.message,stack:e.stack}); },
    progress() { return { turn: currentTurn, stage: hooks.stage, actor: lastActor,
      captures: metrics.captures.length, attacks: sum(metrics.attacks) }; }
  };
  return { hooks, metrics };
}
module.exports = { observer, units };

# AI economic planner: design and validation

## Scope and authoritative rules

The AI economy is implemented in `src/ai/05a-economic-planner.part.js` and
integrated into `src/ai/06-production.part.js`. The latter continues to call the
**existing engine** purchasing functions; the planner is advisory only.

- `src/engine/10-economy.part.js` owns `income`, `price`, `buildCost`,
  `reinforceCost`, `repairCost`, `build`, `recruit`, `reinforce`,
  `repair`, and `upgradeCityTier`.
- `src/engine/04-action-validation.part.js` owns legality, affordability,
  faction/unit eligibility, production location, and per-city upgrade rules.
- `src/engine/15-turns-and-fortresses.part.js` owns turn income collection and
  the distinction between city tiers and factory levels.
- `src/ai/02-fronts.part.js` owns the existing scenario and Conquest theaters,
  route estimates, home defense, and shortages.
- `src/ai/06-production.part.js` owns military production, fleet decisions,
  reinforcement, repairs, city investment, and strategic project reserves.
- `dist/engine/research.js` defines **persistent player HQ research**, which
  spends player command tokens and is not a wartime AI purchase. Battlefield
  Research/science is a wartime resource spent by advanced units and reinforcement;
  the AI may invest in labs to produce it. No HQ research tree or price is changed.

Regional scenarios localize funding at cities and provide an upfront war chest to
invaders with no cities. Conquest includes Sakuradite mines and strategic weapons;
Campaign has scripted production eligibility. Difficulty multipliers are applied
during existing turn income collection; the planner uses the authoritative current
treasury and the ordinary, unmodified income forecast as a conservative estimate.

## Planning and allocation

The planner uses a transient `WeakMap` keyed by game and side/turn/memo. It
does not add fields to saved games. Horizon is 3 turns in Campaign, 5 in
Scenarios and 8 in Conquest (configurable, bounded 3–8). The advisory forecast
is `current wallet + horizon × base income`, not a clairvoyant prediction of
territory change. An independent estimate of likely remaining game length
informs city-investment payback.

The shared budget checks the **live wallet** after every engine transaction,
rather than collecting a stale list of purchases. Optional investments protect
funds for an ordinary 2-frame scout formation where factories can support a
front. A city with critically damaged defenses and nearby enemies releases
optional economic spending restrictions and strategic-resource reservations to
allow emergency military and repair expenditure. Existing F.L.E.I.J.A. /
Eliminator investment legality and project limits remain untouched.

The planner computes a defensive/offensive/consolidation *economic preference*,
not a new AI global strategic state. It consumes existing fronts, shortages and
threats. The existing strategic objective adapter will accept Strategic AI 2.0
front metadata when it is merged; no parallel objective graph was added.

## Ranking policies

- **Production:** existing front-required classes stay primary; a class ranking
  adds scarcity in nearby friendly forces, enemy composition, combat value
  relative to the engine's unit price, and route-aware arrival. Factories with
  no relevant theater or enemy within fourteen hexes avoid gratuitous purchases.
  Every recruitment still runs the engine's `canBuy` or
  `aiEliteRecruitReason`. Elite faction rosters and scenario restrictions
  remain authoritative.
- **Cities:** direct city-tier upgrades consider payback from +8/+10 credits,
  defense integrity, distance to threats and likely game duration; conversion
  to a fortress is scored for defensible approaches. Factory upgrades remain
  distinct and do not add defensive HP.
- **Buildings:** factory capacity, lab science bottlenecks and refinery deposit
  yield determine priorities. Lab-level unlock and city construction rules
  are validated by `buildReason`.
- **Repairs and reinforcement:** existing recovery eligibility, health
  thresholds, zero-defense repair penalties and frame-price rules apply;
  emergency funding can prioritize legal reinforcement. The planner does not
  invent healing or change reinforcement stack caps.
- **Navy:** existing port, ship and landing logic remains in force. New port
  projects must pass the same investment budget and authoritative build cost.

## Regression and matched-seed protocol

The executable smoke test is `node tools/ai_economic_planner_smoke.cjs`.
Build with `node tools/build_sources.cjs` and run the existing tests for
research, city tiers, repairs and defensive AI. Then run the required
`node tools/scenario_sim.cjs --all` and retain the fingerprint output. This
is an intended AI behavior change; **do not overwrite**
`tools/data/sim_baseline.txt` merely to make fingerprints pass.

For reproducible paired evaluation, use two separate checkouts at the same
scenario/content revision, one at `main` and one at the feature branch. Copy
`tools/ai_economy_tournament.cjs` and the observer-only
`tools/scenario_sim.cjs` into the baseline checkout:

```sh
node tools/build_sources.cjs
node tools/ai_economy_tournament.cjs --out main-economy.json --seeds 11,23,47 --turns 40
# In the feature checkout with matching arguments:
node tools/ai_economy_tournament.cjs --out feature-economy.json --seeds 11,23,47 --turns 40 --compare /path/to/main-economy.json
```

Use `--all-scenarios --turns 100` for the slow extended endurance experiment.
The added PR workflow runs an automated smaller paired smoke tournament and
uploads both JSON reports and a Markdown comparison. Inspect p10, median, p90,
win rate, retained cities, errors, and AI runtime by faction/difficulty before
considering merge.

**Measurement limitations:** within-turn net wallet outflow is only an estimate
of spending because captures can transfer resources; production efficiency
requires careful interpretation alongside territory and army losses. Measured
AI time includes tactical order execution, not just the planner. The current
tournament is deterministic but does not model human strategic play. Claims
about planner overhead below 10%, statistically better win rates, and stable
memory during 100-turn games remain unverified until their benchmarks complete.

## Known weaknesses / integration follow-ups

1. A single-turn, lightweight heuristic budget is not a binding multi-turn
   commitment or exact transaction-level optimizer.
2. Emergency identification uses local city proximity/defense and current
   front shortages; it may miss a distant amphibious landing risk.
3. Factory class pricing is evaluated on 2-frame formations for ranking,
   while actual purchases can have 1–3 frames. Final cost is always checked.
4. Combat unit utility is approximate, not an expected battle simulation.
5. Persistent HQ research remains player-only by design.
6. Strategic AI 2.0 has not been merged into this feature's baseline. Rebase
   and verify its front schema and priority signals when available.

**Merge gate:** no new economic mechanics, no save migration, all automated
legality tests green, reviewed paired-seed tradeoffs and acceptable worst-case
turn time. Do not merge on spending totals alone.

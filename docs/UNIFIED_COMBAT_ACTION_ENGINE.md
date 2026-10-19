# Unified combat and action engine: execution inventory and compatibility

This note documents the existing tactical execution paths examined for PR #118, and
the deliberately limited behavior-preserving refactor. It is not a proposal to
change combat balance. The code remains lexically shared classic-script parts
assembled by `tools/bundles.json`; generated `dist/engine.js` must not be edited.

## Source-of-truth inventory

| Action / effect | Existing eligibility and preview | Mutating executor | Important side effects and callers |
| --- | --- | --- | --- |
| Attack (ordinary, ranged, amphibious, naval, elite) | `hostileTarget`, `inRange`, `preview` in movement/combat; turn, morale and attack flags | `attack` in `09-combat.part.js` | `power`, defensive intercept, counterfire, splash, `kill`, shield damage, morale, skills, post-attack refresh, victory. AI `07-tactical-orders`, Army Groups and HUD use the public function. |
| Move, board, coastal landing, city/port capture | `isReady`, `reachable`, `heavyMoveLimitReached` in `08-movement-and-deployment.part.js` | `move` | Action stamps, carrier cargo, amphibious landing refresh, overwatch, city/port/deposit capture, surrender, victory. Called by AI, Army Groups, standing orders and UI. |
| Carrier deployment | `deployReason`, `deployTargets` | `deploy` | Moves a unit from cargo to board, activates landing triggers, captures valid undefended enemy cities, seizes deposits; naval AI uses this directly. |
| Manual repair / frame reinforcement | `repairReason`, `reinforceReason` in `04-action-validation.part.js` | `repair`, `reinforce` in `10-economy.part.js` | `warSpend`, `spend`/treasury, HP and stack updates, spent action flags, Conquest rewards. |
| Commander active ability | `feintReason`, `actionTargets`, specialized skill logic | `feint` in `11-city-automation.part.js`; specialized targets in `12-approved-skills.part.js` | Cooldown, marks, cleanses, ally refresh, direct specialty effects. Used by player and AI. |
| Fortress battery | `fortressReady`, `fortressRange`, `fortressTargets` | `fireFortress` in `15-turns-and-fortresses.part.js` | Direct and area damage, morale, battery recharge, kill hooks, victory. |
| Reaction / counterattack | `preview` computes retaliation eligibility; guard/skills in commander parts | Inline during `attack`; `newcomerOverwatch` during `move` | Attack/splash order and RNG sequence are significant: not independent player actions. |
| City shield destruction / frame kills | `preview` computes damage separately | `attack`, `kill`, commander effects | City-defense break earns only specified refresh effects; frame kill additionally grants XP, commander tallies and kill-only bonuses. |
| Extra action / chaining | Type + Elite flags, `afterCommanderAttack`, `grantReposition`, move-action stamps | Formerly inline in `attack`; now `applyAttackConsequences` | Armor breakthrough, Siege Artillery defense break, Elite amphibious chains, heavy/super-heavy two-move ceiling, commander reposition. |
| Strategic attacks / city construction / recruitment / research / save handling | Independent domain-specific `*Reason` functions | `launch`, `recruit`, `build`, `research`, `packSave` and others | **Out of scope** for the tactical action dispatcher. Their existing APIs and formats are unchanged. |

## Before and after

Before: each tactical executor directly repeated a little actor/target validation;
a valid attack entered `preview`, calculated and applied a volley, then executed
approximately 96 lines of class, Elite and commander follow-up rules inline.
The player UI, operational AI, naval AI and Army Group executor each called
these public functions, rather than sharing a top-level action dispatcher.

After: `validateAction(g, action)` is a common preflight for
`attack`, `move`, `deploy`, `repair`, `reinforce`, `commander` and
`fortress`. It returns `{ok:false,reason}` on rejection, and relevant
actor/target data on success; the live executors call it first. A public
`resolveAction(g, action)` dispatches the same actions to their existing
specialized executors. Those direct executors remain supported: AI, HUD and
Army Groups require no cross-lane edits. Repeated skill-specific consequences
still use existing specialized hooks, rather than a large generic effect queue.

Combat post-volley refresh has been extracted to `applyAttackConsequences`
inside `09-combat.part.js`. It preserves the previous sequence of
Breakthrough, Kallen's Ace, city-shield destruction, amphibious Elite follow-up,
Elite movement, heavy movement limits, commander effects, momentum and
previously unspent movement. These rules intentionally distinguish **unit
destruction** from **city-defense destruction**: city breaks unlock eligible
follow-up movement or attacks, without implicitly granting kill XP/healing.

## Mechanical invariants

- Invalid actions must return an error before spending resources, changing
  HP, moving units, consuming cooldowns, or rolling combat RNG.
- `preview` is still performed once during an actual attack; random draws
  retain the original order *after* preflight.
- Unit and city damage still follow the existing protection, defensive skill,
  counterattack, splash, `kill`, and event-reporting order.
- Repair/reinforcement still validate cost and supply using their original
  reason helpers before making any treasury or HP changes.
- Boarding, deployment, overwatch, city/port capture, heavy move stamps and
  temporary reposition are unchanged and remain specialized operations.
- Existing `{ok, reason, ...}` result shapes remain compatible with current
  AI/HUD callers. No save, faction, map or data changes are intended.

## Test and ownership boundary

`tools/test_unified_actions.cjs` checks deterministic direct-versus-dispatch
combat and serialized state, illegal actions without state mutation, distinct
city shield and unit damage, class-specific refresh, heavy movement ceiling,
and reason-helper compatibility. `tools/benchmark_unified_actions.cjs` executes
real repeated combat against identical seeded world fixtures, allowing the
`refactor-checks` workflow to compare current main with the branch.
The same workflow also runs the entire `scenario_sim.cjs --all` fingerprint
check against `tools/data/sim_baseline.txt`. Build, assets and map checks run
before these checks.

The implementation edits only the `engine-rules` lane. New test harnesses and
CI integration touch the `tooling-and-ci` lane to enforce acceptance checks;
no `src/ai/**`, `src/hud/**`, renderer, Army Group, sprite, scenario or
data files are changed.

## Deliberate exceptions and remaining risks

- `resolveAction` is an optional internal/public façade; existing AI and UI
  continue calling the specialized executors. This avoids unrelated lane
  changes, but callers have not been migrated to a single action event bus.
- Commander specialty abilities, F.L.E.I.J.A., turn-start automatic repair,
  construction and recruitment remain on their original separate paths.
- The validator uses existing state-dependent prediction helpers; it is not
  a new mathematical pure function, and does not attempt to rollback arbitrary
  failures in effect hooks. All known rejection paths are checked before the
  mutating executor is entered.
- Full mode coverage and behavior preservation depend on simulation
  fingerprint checks and manual smoke playtests, not just targeted tests.
  If a baseline mismatch occurs, diagnose it; never accept it by changing
  the baseline in this behavior-preserving PR.
- Benchmark results vary with runner load. Treat an increase above 5% as an
  investigation blocker, not as an automatically excused performance change.

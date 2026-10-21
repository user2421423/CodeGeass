# Execution record

Parent revision: `37c8ad80` (the remote `separate` branch did not exist; work starts from that current main). Node v24.19.0, headless Chromium, Python source builder. Dates refer to the October 21, 2026 Singapore work session.

| Check actually executed | Result |
| --- | --- |
| Python and Node source builds | Passed |
| Every regional scenario initializes | 68 / 68 passed |
| New scenarios: every player × Normal/Hard/Challenge/Elite | 68 starts passed |
| Normal recruitment, mixed sources, real Elite factory deployment, research, save/load and victory | Passed |
| Real last-city capture, surrender and continuing FFA | Passed for tournament and Partition |
| Full regional baseline: four setup difficulties and two Normal AI turns | 725 records / 145 simulated games; zero AI errors |
| Eight-turn actual-engine AI runs | All six passed; every faction recruits and attacks; every tournament Knight captures |
| Second seed for tournament and Geass War | Passed |
| Chromium mobile selectors, every faction click, six deployments, preview assets and regional saves | Passed at 390 × 844 |
| Chromium real full rival cycles | All six passed at 1440 × 900; no page errors |
| New preview/high-resolution map exports | Six each; actual renderer and starting ownership |
| Existing CI workflow commands | 60 executed; 55 pass after the regional-income fixture update; five failures also reproduce on pristine parent |
| Existing alternate-history smoke and save integration | Passed |
| Unified action engine regression suite | 12 / 12 passed |
| Regional city-local economy across all scenarios | Passed: 68 wars, 142 checked sides |
| Tracked asset validation, world map lock, README table synchronization, whitespace checks | Passed |
| World Campaign and Story file isolation | Registries/controller/source files unchanged |

Raw compact activity and browser results are adjacent to this file. Browser timings are headless/emulated viewport observations, not measurements on an actual phone. Activity checks do not establish equal win rates or exhaustively prove every human strategy.

## Five inherited failures

The same five commands exit 1 on a pristine checkout of `37c8ad80`, rebuilt independently. They are not described as passing:

* `zero_geass_absolute_command_smoke.cjs`: fixture expects Black Knights standard troops in the 2017 world roster, which now uses native Federation equipment.
* `lelouch_imperial_command_smoke.cjs`: expects the former `Imperial Command` ability label rather than the current rework.
* `commander_ability_banners_smoke.cjs`: stale UI handler/source-pattern assertion.
* `story_normal_defense_ai_probe.cjs`: existing Chofu balance threshold fails (0/8 wins in the deployed probe).
* `interactive_tutorial_smoke.cjs`: save-function source-pattern assertion predates Story save removal.

The broader initial run additionally failed `regional_city_income_smoke.cjs` because it assumed every new constructor must begin with temporary off-map funding. It now checks already-localized constructors generically, still verifies capture transfers city income, and passes across all 68 wars. Existing stale commander IDs that prevented regional loads were repaired separately, without editing Story Mode.

The previous committed reference covered only 37 of the 62 pre-existing wars. Its 390 records and metadata are archived under `tools/data/sim_baseline.before-six-exclusives*`; the refreshed reference covers all 68. The unmodified starting run crashed at a retired Monica reference. Its 95 preceding fingerprints were compared: 70 identical; the other 25 are exactly the Area 18 / Iraq–Iran retired-commander repairs. A complete old-versus-new comparison is therefore unavailable for the initially broken scenarios.

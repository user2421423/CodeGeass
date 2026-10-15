# Refactoring plan: speed and parallel work

Status: done, 2026-10-15. Results and differences from the plan are in section 0; the plan follows unchanged.

## 0. Results

| Step | What was done | Check |
| --- | --- | --- |
| 0.1 | Built bundles untracked; CI and Pages build first | live site loads |
| 0.2 | `scenario_sim.cjs --all` and `tools/data/sim_baseline.txt` (seed 11, 2 turns, setup at 4 difficulties) | — |
| 1.1–1.6 | `meta` on all 37 scenarios; `dist/scenario-manifest.js`; engine and AI name no scenario ID | baseline identical; menu text identical for 78 scenario sides; drawing flags identical for 37 scenarios |
| 3.1–3.4 | carrier lookup grids, commander-first scans, river check hoisted, `targets()` computes range once, comparator sorts cache scores | baseline identical |
| 2 | 51 scenario files leave `index.html` (89 → 38 script tags) and load in the background after the start menu | all menus, saves and campaign tested in the browser |
| 4 | static map layer no longer repainted on every move or click | redraw after a change 126 ms → 1 ms |

AI time per round (JavaScriptCore shell, same seeds):

| Map | Before | After |
| --- | ---: | ---: |
| World Conquest | 1.5 s | 1.1 s |
| Battle of Pendragon (Elite) | 3.2 s | 1.8 s |
| Central America (Elite) | 7.8 s | 5.3 s |
| Rocky Mountains (Elite) | 7.2 s | 4.8 s |
| Invasion of South China | 4.4 s | 2.7 s |
| Great Lakes (Elite) | 2.2 s | 1.6 s |
| Invasion of Turkey | 0.9 s | 0.7 s |

In a real browser a full rival turn on Central America went from 1.7 s to 1.5 s; the browser's engine is much
faster than the test shell, so the shell numbers overstate what players wait.

Differences from the plan:

- **Phase 2 loads every scenario in the background** instead of only the chosen one. Save files are read
  synchronously in many places and need their scenario's rules; one shared load keeps that simple. The start menu
  no longer waits for scenario data (1.08 MB of the 4.46 MB).
- **Phase 4:** panning was already fast (about 1 ms per frame). The 42 ms measured before was the HUD and map
  together after a game change; the real cost was the static layer being repainted after every change.
- **Great Lakes** now uses the expedition rule in both the surrender and victory checks (it was only in the
  victory check). The game still ends at the same moment, without the surrender step.
- **Area 18 and Stonehenge** reject old-version saves through `meta.saveVersion` in the engine instead of a
  menu-only check.
- **The baseline was generated with the JavaScriptCore shell.** CI runs Node; if Node's output differs on an
  unchanged `main`, regenerate the baseline with Node once and keep that one.
- **Not done:** `ui/geography-data.js` (1.97 MB) still loads at startup (2.3); the baseline does not run in CI
  (decision 2 below); the World Campaign still repeats scenario titles (decision 3 below).

Two goals:

1. **Speed.** Faster AI turns on the big maps, and less JavaScript loaded at start.
2. **Parallel work.** Several AI sessions can each build one part (a scenario, the AI, the UI)
   without touching the same files, and without a human "integrator" copying changes by hand.

Every step below keeps game rules and save files unchanged unless it says otherwise.

## 1. What we measured

All numbers come from the current `main` (commit `40c580d`). AI timings were taken in the macOS
JavaScriptCore shell, page timings in a desktop browser.

### AI turn time (one full round = every side moves once)

| Map | Hexes | Units | Time per round |
| --- | ---: | ---: | ---: |
| Invasion of Turkey | 14,976 | 180 | 0.9 s |
| World Conquest | 13,680 | 159 | 1.5 s |
| Battle for the Great Lakes (Elite) | 19,712 | 262 | 2.2 s |
| Battle of Pendragon (Elite) | 22,680 | 518 | 3.2 s |
| Invasion of South China | 20,832 | 354 | 4.4 s |
| Rocky Mountains (Elite) | 37,632 | 482 | 7.2 s |
| Central America (Elite) | 30,912 | 367 | 7.8 s |

The player waits this long after pressing End Turn. Most new scenarios are on the large end.

Where the time goes (one profiled round per map):

- **Central America:** `aiCarrier` uses 46% of the round. For every carrier, it scores every
  coastal sea hex on the map, and each score scans all ~375 units and every city
  (`landingScore`, `danger`, `src/ai/05-naval.part.js:12-120`). That is about 45 million
  distance checks per round.
- **Pendragon:** `rangeOf` uses 37%. Each artillery range check calls `spotted()`
  (`src/engine/12-allegiances.part.js:201`), which loops over every unit and calls `fx()` on it:
  46 million calls per round. 14 similar "is a friendly commander with ability X nearby" checks
  have the same shape.
- **Pendragon:** `riverCrossingCost` is called 20 million times per round (7%). It only matters on
  the Iraq–Iran map, but the scenario check runs inside the innermost pathfinding loop.
- **Pendragon:** picking the next unit to act (`aiNextActor`) is 30%; `goalField` is 15%.

### Page load and drawing

- The page loads **89 script files, 4.46 MB**, on every start. **52 of them (1.08 MB) are
  scenario modules, landmasks and coastlines for all 37 scenarios**, though a game uses one.
- `ui/geography-data.js` (the global coastline atlas) is another 1.97 MB; `ui/geography.js`
  converts all of it at startup, before any map is shown.
- A full map redraw on Central America takes **~42 ms** (median), so panning runs at about
  24 frames per second.
- Load on localhost is 0.7 s; on GitHub Pages it is slower by the download.

### Where parallel work collides

- In one week (since 2026-10-08), `dist/engine.js` changed in **153 commits** and `dist/engine/ai.js`
  in **110**. Both are *generated* files. Every branch that touches any engine part regenerates them,
  so every merge conflicts there. There were 99 merge commits in that week, and many follow-up
  commits only re-synced generated output (for example "Sync CF Hawaii Elite doctrine to engine
  source", "Remove duplicate New Zealand entries that broke engine source parity").
- **393 hard-coded scenario IDs** sit in 18 shared files. Adding one scenario today means editing
  about 10 files that every other session also edits:

  | File | Scenario-ID mentions |
  | --- | ---: |
  | `dist/ui/scenario-screens.js` | 117 |
  | `src/engine/16-world-setup.part.js` | 108 |
  | `dist/war-campaign.js` | 44 |
  | `dist/ui/geography.js` | 39 |
  | `src/engine/15-turns-and-fortresses.part.js` | 21 |
  | `src/engine/08-movement-and-deployment.part.js` | 19 |
  | `src/ai/02-fronts.part.js` | 11 |
  | 11 more files | 34 |

- The same list is copied in several places and the copies drift. Example: the "expedition with
  no cities" list exists in `08-movement-and-deployment` and again in `15-turns-and-fortresses`,
  with different members. This is how South Africa became unplayable as Britannia.
- The current workaround (`docs/FEDERATION_SCENARIO_HANDOFFS.json`, `docs/*-integration.md`):
  scenario branches must not touch shared files and instead write instructions for an
  integrator. That works, but it is slow and depends on the integrator applying every note by hand.

## 2. Principles

- **A scenario describes itself.** Everything specific to one scenario lives in that scenario's
  file. Shared code reads it from the scenario; it never names a scenario ID.
- **Generated files are not committed.** Two branches can't conflict on a file neither of them
  stores.
- **Measure, change, compare.** The engine is deterministic: the same seed gives byte-identical
  `tools/scenario_sim.cjs` output (checked). A pure refactor or speed-up must leave that output
  byte-identical for every scenario. This is the safety net; no new test suite is needed.
- **Small steps.** Each task below is one branch and one merge, and leaves the game working.

## 3. The plan

### Phase 0 — Groundwork (one session, do first)

**0.1 Stop committing generated bundles.** Done (2026-10-15).
- `dist/engine.js`, `dist/engine/ai.js`, `dist/missions.js`, `dist/ui/renderer.js` and
  `dist/ui/hud.js` are untracked and listed in `.gitignore`.
- Every CI job that sets up Node, including the Pages deploy, runs `node tools/build_sources.cjs` first.
- `tools/build_sources.py` does the same build without Node. Both read the bundle list from
  `tools/bundles.json`. Running locally: `python3 tools/build_sources.py`, then serve `dist/`.
- Effect: the 153-commits-a-week conflict file disappears, and editing `dist/` by mistake becomes
  impossible.

**0.2 Baseline for the safety net.**
- Add `--all` to `tools/scenario_sim.cjs`: run every scenario × side for a given seed and number
  of turns, and print one line per run.
- Store the baseline output for seeds 11 and 29, 2 turns, in `tools/data/sim_baseline.txt`.
- Rule for every later step: after a pure refactor or speed-up, the new output must match the
  baseline exactly. If a step changes behavior on purpose, it regenerates the baseline in the same
  commit and says why.

### Phase 1 — Scenarios describe themselves (biggest parallel-work win)

Each scenario module gets a `meta` object. Shared code reads `meta` instead of ID lists. One task
per field group, each replacing one list:

| Task | Field on the scenario | Replaces hard-coded lists in |
| --- | --- | --- |
| 1.1 | `meta.expeditionSide` (side that may hold no city) | `08-movement-and-deployment` (`expeditionSide` map), `15-turns-and-fortresses` (decideVictory list) |
| 1.2 | `meta.elite`: `'japan'` or `{ sides: [...] }` | `16-world-setup` (`eliteScenario`, `prepareEliteEurope`, sides choice) |
| 1.3 | `meta.ai`: `{ doctrine, hooks }` | `src/ai/02-fronts` (doctrine by ID, Philippines, Canada, Indochina, Yangtze cases), `01`, `03`, `05`, `06` |
| 1.4 | `meta.text`: era, intro, diplomacy, elite note, focus city; menu label | `dist/ui/scenario-screens.js` (`SCENARIO_KINDS`, `SCENARIO_BLURBS`, `SCENARIO_TEXT`) |
| 1.5 | `meta.map`: underlay, rivers, coast depth, European region, home zoom | `dist/ui/geography.js`, `dist/ui/core.js` (`homeZoom`), renderer `europeOverview` |
| 1.6 | `scenario.riverBarriers` present ⇒ river cost applies | `08-movement-and-deployment` (`riverCrossingCost` ID check) |

- `dist/war-campaign.js` stays central: the campaign is a design list. It should take titles and
  sides from the scenario instead of repeating them.
- Target: 393 shared mentions down to about 45, all of them in the campaign registry.
- Order: 1.1 and 1.2 first (small, and they fix list drift). Tasks 1.3–1.6 touch different shared
  files and can run in parallel.
- Check: the sim baseline is byte-identical after each task, and every scenario still appears in the
  menu with the same text.

### Phase 2 — One manifest and on-demand loading (speed + parallel work)

- **2.1** Add `dist/scenarios/manifest.js`: one line per scenario with its ID, title, sides, city
  count and its files (scenario module, landmask, coastlines, underlay). This is the only shared
  line a new scenario adds.
- **2.2** `dist/index.html` stops listing scenario and map files. The game loads a scenario's files
  when the player opens it, resumes its save, or launches it from the campaign (one small
  `loadScript` helper that returns a promise). The menu reads titles from the manifest.
- **2.3** Load `ui/geography-data.js` (1.97 MB) and convert it on first map draw instead of at
  startup, so the start menu appears without it.
- Expected: startup JavaScript from 4.46 MB to about 3.4 MB after 2.2, and about 1.4 MB before the
  first map after 2.3. `index.html` stops being a conflict file.
- Check: start every mode (Conquest 2017/2018, Story campaign, World Campaign, each scenario, resume
  a save) in the browser; no console errors.

### Phase 3 — AI turn speed (behavior-preserving, sim output must not change)

| Task | Change | File | Expected |
| --- | --- | --- | --- |
| 3.1 | In `aiCarrier`, build three grids once per carrier: enemy land strength within 3 hexes, enemy units within 2, undefended enemy city within 2. `landingScore` and `danger` read the grids instead of scanning all units. The board does not change during one carrier's evaluation, so results are identical. | `src/ai/05-naval.part.js` | Central America ≈ 7.8 s → ≈ 4.5 s per round |
| 3.2 | "Nearby commander with ability X" checks (`spotted`, `logisticsNear` and 12 similar) test `v.cmd` first, or loop over the side's commanders only. | `src/engine/12-allegiances.part.js`, `09-combat.part.js` | Pendragon −30% |
| 3.3 | Decide once per search whether river costs apply, outside the inner pathfinding loop. | `src/engine/08-movement-and-deployment.part.js`, `17-pathfinding.part.js` | Pendragon −7% |
| 3.4 | Re-profile after 3.1–3.3, then look at `aiNextActor` (30% on Pendragon) and `goalField` (15%): cache a unit's pick score until the board near it changes; reuse a goal field for identical seeds within a turn. | `src/ai/06a-tactical-coordination.part.js`, `17-pathfinding.part.js` | measure first |

- Tasks 3.1, 3.2 and 3.3 touch different files and can run in parallel.
- Task 3.3 touches the same function as 1.6. Give both to the same session, or do 1.6 first.
- Check: sim baseline byte-identical, and the round time for the seven maps in section 1 is
  re-measured and written into this file.

### Phase 4 — Drawing speed (measure first)

- Profile a pan on Central America in the browser's performance tool (42 ms per redraw today).
- Likely fix: draw static terrain into cached off-screen tiles once, and redraw only units and
  effects per frame. `src/renderer/04-map-caching.part.js` already caches part of this; find out why
  panning still redraws.
- Target: under 16 ms per frame (60 fps) on the largest map.
- Independent of every other phase.

### Not doing now

- **Converting the engine to ES modules.** The `src/**/*.part.js` files share one closure, which
  is fragile, but the conversion touches every file and blocks all parallel work while it runs.
  Phases 0–1 remove most collisions without it. Revisit after Phase 2.
- **A test suite.** The deterministic sim baseline (0.2) is the regression check.
- **Splitting large files by size.** Split only where Phase 1 moves code out.

## 4. Lanes for parallel AI sessions

After Phase 0, each session owns one lane and edits only its files. Changes to another lane's
files go through that lane's session (or a short note to it).

| Lane | Owns | Typical work |
| --- | --- | --- |
| **Scenario: one per scenario** | its `dist/scenarios-*.js`, its landmask, coastline and underlay files, its manifest line, its `docs/<SCENARIO>.md` | new maps, starting armies, briefings, `meta` |
| **Engine rules** | `src/engine/**` | combat, movement, economy, saves, victory |
| **AI** | `src/ai/**`, `dist/engine/army-groups.js` | doctrine, production, naval, tactical orders |
| **Map drawing** | `src/renderer/**`, `dist/ui/geography*.js`, `dist/ui/view.js`, `dist/ui/effects.js` | rendering, underlays, performance |
| **Screens and HUD** | `src/hud/**`, other `dist/ui/*.js`, `dist/*.css`, `dist/index.html` | menus, dialogs, panels |
| **Campaigns** | `dist/war-campaign.js`, `dist/ui/war-campaign-screen.js`, `dist/campaign.js`, `src/missions/**` | campaign tiers, story missions |
| **Tooling and CI** | `tools/**`, `.github/workflows/**` | build, sims, audits |

- Replace `docs/FEDERATION_SCENARIO_HANDOFFS.json` with a general `docs/LANES.json` that lists the
  lanes, their file globs and the current owner branch. Sessions check it before editing.
- After Phase 1 and 2, a new scenario touches only its own lane plus one manifest line and one
  campaign row: no integrator step.

## 5. Order and who can run at the same time

```
Phase 0 (one session)
   ├─ 1.1 → 1.2 ─┬─ 1.3  (AI lane)
   │             ├─ 1.4  (screens lane)
   │             ├─ 1.5  (map-drawing lane)
   │             └─ 1.6 + 3.3 (engine lane)
   ├─ 3.1 (AI lane)        ┐ can start right after Phase 0
   ├─ 3.2 (engine lane)    ┘
   └─ Phase 4 (map-drawing lane, any time)
Phase 2 after 1.4 and 1.5 (needs menu text and map data from meta)
3.4 after 3.1–3.3
```

At most one session per lane at a time. With the lanes above, up to five sessions can work at once
from the end of Phase 0.

## 6. Decisions for the owner

1. ~~Untrack generated bundles (0.1)?~~ Decided yes; done.
2. **Run the sim baseline in CI on every push?** It catches crashes and unintended behavior changes
   in every scenario. It costs a few CI minutes and is not a test suite.
3. **Is World Campaign data allowed to read titles from scenarios (Phase 1)?** It makes campaign
   rows shorter but couples the campaign file to the scenario manifest.

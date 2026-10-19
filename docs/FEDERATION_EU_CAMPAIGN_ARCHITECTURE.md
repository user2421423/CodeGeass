# Federation vs E.U. — Campaign architecture

**Branch:** `feature/federation-vs-eu-campaign-architecture` · **Campaign key:** `federation-eu` · **Engine side:** `cf` · **Opponent:** `eu`.

**Architecture status:** World Campaign selector, tiers, regional map markers, political map overlays, and route arrows are registered. The three existing three-way global scenarios are immediately playable. The **ten new scenarios are placeholders with `scenarioId: null`** until independent builders deliver real implementations and the integrator tests and registers them. A placeholder is not a playable battle. Do not merge this architecture into `main` as a complete campaign before integration and approval.

## Approved 13-battle progression

| # | Tier | Mission | Objective ID | Reserved runtime ID | Registration |
|---|---|---|---|---|---|
| 1 | 1 Global Conflicts | War for Australia | `federation-eu-australia` | `war-for-australia` | Existing |
| 2 | 1 Global Conflicts | Conquest of Area 18 | `federation-eu-area-18` | `area-18` | Existing |
| 3 | 1 Global Conflicts | Division of Japan | `federation-eu-division-japan` | `division-japan` | Existing |
| 4 | 2 | Invasion of Siberia | `federation-eu-siberia` | `cf-eu-siberia` | Planned; null in registry |
| 5 | 2 | Invasion of the Caucasus | `federation-eu-caucasus` | `cf-eu-caucasus` | Planned; null in registry |
| 6 | 3 | Invasion of Turkey | `federation-eu-turkey` | `cf-eu-turkey` | Planned; null in registry |
| 7 | 3 | Battle for the Volga | `federation-eu-volga` | `cf-eu-volga` | Planned; null in registry |
| 8 | 3 | Crossing the Suez Canal | `federation-eu-suez` | `cf-eu-suez` | Planned; null in registry |
| 9 | 4 | Battle for Moscow | `federation-eu-moscow` | `cf-eu-moscow` | Planned; null in registry |
| 10 | 4 | Balkan Offensive | `federation-eu-balkans` | `cf-eu-balkans` | Planned; null in registry |
| 11 | 4 | North African Offensive | `federation-eu-north-africa` | `cf-eu-north-africa` | Planned; null in registry |
| 12 | 5 | Conquest of Central Europe | `federation-eu-central-europe` | `cf-eu-central-europe` | Planned; null in registry |
| 13 | 6 | Invasion of France | `federation-eu-france` | `cf-eu-france` | Planned; null in registry |

All battles in a tier must be completed to open the next; missions within a tier can be completed in any order. Tier mission counts: `[3,2,3,3,1,1]`.

## Geographic progression and strategic routes

- **Northern Russia:** Siberia → Volga → Moscow → Central Europe. Volga may also be attacked from the Caucasus; Siberia should plausibly open its eastern approach (don't invent impossible teleportation).
- **Central Anatolia/Balkans:** Caucasus → Turkey → Balkans → Central Europe. **Germany is excluded** from the Central Europe tactical theatre, political overlay and objectives.
- **Mediterranean:** Area 18 → Suez crossing from **Sinai east bank** → Egypt → Libya/Tunisia/Algeria → **Mediterranean naval landings in southern France** → Lyon/Paris. France is invaded *from the south by sea*, never overland from Germany; victory requires taking all E.U. cities in the scenario.

The tier design is a gameplay unlock system, not a claim that each scenario starts with the exact land controlled in other independent saved battles.

## Implementation ownership and safety

1. Make each scenario in its own `scenario/cf-eu-<key>` branch based on **this architecture branch**; create a PR targeting the architecture branch and leave it unmerged. Read `docs/FEDERATION_EU_SCENARIO_HANDOFFS.json`, `docs/LANES.json`, `docs/ADDING_A_SCENARIO.md`.
2. Scenario owner edits **only** `dist/scenarios-cf-eu-<key>.js`, its scenario-local coast/landmask/underlay helpers, and `docs/CF_EU_<KEY>_SCENARIO.md`. Do not touch `main`, the campaign registries, engine rules, other scenarios, generated bundles, shared AI, or commander/elite data.
3. Scenario builders **report** required `SCENARIO_MANIFEST`, `SCENARIO_FILES`, catalog and load-order entries, plus any shared-code request. A **single integrator** applies those shared changes and replaces the corresponding null `scenarioId` with a real `cf-eu-<key>` only after verifying a registered scenario supporting `cf` with `create(side,difficulty,seed)` and a real victory contract.
4. Existing shared global wars stay untouched; new regional missions are two-sided **Federation vs E.U. only**. Existing Britannia campaigns, E.U.–Federation campaign, standalone regional scenarios, old save slots and previous victory credit remain independent. Never reuse an existing `britannia-*` scenario ID as the new Federation runtime.
5. The world map currently uses **provisional border overlays** for regions absent from its small atlas (Caucasus, Egypt, Balkans, North Africa, Central Europe, France). **Integrators must replace these with verified boundaries** (or true per-country polygons), ensure no coastline/sea or excluded German territory is colored, and audit markers/route arrows before marking missions implemented. Tactical maps are independent from strategic political overlays.

## Required quality gates for each scenario

- **Gameplay:** both factions playable (`sides:['cf','eu']`), all four difficulties (Normal, Hard, Challenge, Elite), side-appropriate commander roster, named commanders and Army Groups, unique faction frames, Elite Forces and correct Elite scaling, functioning HQ/research/unlocks, rewards and medal rules.
- **Map & economy:** accurate real-world cities and provinces, sensible borders, mountain passes, defensible rivers/bridges, coastal land/sea classification and ship movement, independent capturable ports where relevant, functional cities, factories, resources, repairs and AI recruitment on **both** sides. Do not create a cityless faction that instantly loses; expedition survival where applicable.
- **AI & balance:** meaningful AI objectives and production, properly coordinated Army Groups/carriers, data-driven `meta.ai` rather than scenario-ID engine hacks, no unwinnable choke or immediate one-turn massacre. Aim for a **realistically winnable Normal for both factions**; rebalance primarily by adding friendly starting units or reducing enemy starting units before changing global mechanics.
- **Victory:** full opposing-city conquest (plus expedition elimination when necessary); no arbitrary turn limit, fake win, duplicate objective, or automatic campaign completion.
- **Verification:** syntax + source build, both-side seeded simulations incl. longer and multi-seed runs, Hard/Challenge/Elite setup, AI production, coast/naval movement, four difficulties, victory/reward progression, save/reload, mobile rendering and no cross-scenario regressions. Run `node tools/scenario_sim.cjs <id> cf normal 11 5`, corresponding `eu` test, extended seeded runs and `node tools/scenario_sim.cjs --all` baseline comparison. State exactly what was actually tested.
- **Delivery:** provide branch, PR, commit, scenario-owned files, seed results, pass/fail notes, required central manifest/catalog/load-order changes, and unresolved shared-code issues. Do not self-merge.

## Parent smoke test

The repository's `tools/federation_eu_campaign_smoke.cjs` verifies structural architecture and old-save safety. It **does not validate tactical battles**, which remain unimplemented until separate PR integration. Run with `node tools/federation_eu_campaign_smoke.cjs`.

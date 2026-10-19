# CF vs E.U. — Invasion of Turkey (`cf-eu-turkey`)

**Delivery lane:** standalone regional scenario on `scenario/cf-eu-turkey`, based on `feature/federation-vs-eu-campaign-architecture`.  
**Scope:** `dist/scenarios-cf-eu-turkey.js` and this document only. **Not registered** in the campaign or central scenario catalog until integrator verification.

## Geographic and strategic setup

- The existing `invasion-turkey` 144×104 GSHHS shoreline/underlay is reused *as geography* through `dist/turkey-landmask.js`, with the original projection, coast/sea sampling, straits, and Turkish river overlay. The original Britannia scenario remains untouched.
- 71 real settlement control points (58 E.U. and 13 Chinese Federation). E.U. starts in all modeled Turkish settlements; Federation staging is in Georgia (Poti, Batumi, Tbilisi, Akhaltsikhe), Armenia (Gyumri, Yerevan), Nakhchivan, northwest Iran (Maku, Khoy, Salmas, Urmia), and northern Iraq (Mosul, Erbil).
- Contested passes are represented through the Aras/Igdir, Kars/Ardahan, Van–Hakkari and Black Sea approaches. Mountains cost 2 movement (standard scenario terrain rule); the named passes remain traversable.
- Operational objectives from east to west: Kars and Erzurum, Van and Diyarbakir, Sivas/Kayseri, Ankara, the Black Sea ports, Istanbul and Thrace. Existing Bosporus/Dardanelles water geography is retained; fleets can move between Black Sea, Marmara, and Mediterranean using the existing connected water tiles.
- 14 port sites (E.U. Black Sea/Aegean/Mediterranean plus Federation Batumi/Poti), placed on separate adjacent sea hexes with `portAt`, `portLevel`, and independently tracked `portOwner`. The real engine must be used to confirm capture/repair/port access rules after integration.

## Units, economy, difficulty, progression

- Two selectable sides only: `cf` and `eu`. Normal setup: **148 Chinese ground formations + 10 ships**, **142 E.U. ground formations + 17 ships**. Each land formation is assigned to a city-based Army Group; fleets have their own groups.
- Native faction frames are chosen via `E.typeFor(side,class,g)`; Chinese `cf_carrier` and `shui_gun_ru_ii` and E.U. `eu_carrier` and `panzer_frosch` ships are explicit. Named commanders use existing faction rosters, without engine or commander-data edits.
- Both sides have cities from turn one, production tiers, fortifications, shield HP, tax/industry/science output, and starting resources with scenario funding. Standard recruitment, research, repair, resource accounting, commander and reward systems are reused; no game-wide rules changed.
- Normal, Hard, Challenge and Elite parameters follow existing standalone Turkey/Persia scenario conventions. Challenge and Hard reinforce the *opposing* land formations; Elite invokes `E.prepareEliteEurope` and declares `meta.elite=true`, `eliteRosterOnly=true`, and side-filtered `eliteRosters`. HQ restrictions must be confirmed using the actual engine after integration.
- Scenario `meta.ai` uses the existing `europe` doctrine, recovery, CF route bias, explicit advancing Army Group axes and E.U. defensive hubs. No special engine AI case is introduced.
- The `winner` function awards victory **only** once one faction controls **every** station. No turn cap, scripted completion, or surrogate `invasion-turkey` win.
- Integration should use existing generic scenario completion and rewards; mission objective `federation-eu-turkey` becomes playable only when the integrator registers a real `cf-eu-turkey` module.

## Checks actually performed (not full-engine simulations)

- JavaScript syntax compiled in an isolated V8 source check.
- Scenario-module initialization with a lightweight engine substitute passed for **both sides on all 4 difficulties** at seed 11 and **both sides on Normal** at seeds 23, 47, 97 (14 setups). These are **setup smoke checks**, not AI-vs-AI balance simulations.
- Setup checks found 71 stations, 14 ports, 148/142 land formations, 10/17 ships, valid unit tile categories, successful Elite setup hook invocation and valid win conditions for both total-conquest owners.
- Hex-grid sea flood-fill in that harness confirmed an uninterrupted sea path from Batumi/Poti to Istanbul and Izmir through the retained strait cells.
- **Not run:** true `node tools/scenario_sim.cjs` battles, multi-seed extended AI combat or Normal win-rate checks, genuine engine manufacturing/recruitment/repairs, actual fleet combat/transports/port capture, rewards/progression, save/load, mobile rendering, full source build, and cross-scenario baseline. This GitHub-only editing session had no executable repository checkout (the local container could not reach github.com). Do not represent the harness as full-engine verification.

## Required integrator changes (not made on this branch)

1. In `dist/scenario-manifest.js`, add `{id:"cf-eu-turkey", title:"Invasion of Turkey", note:"71 cities · 2 sides · Caucasus/Persia offensive"}` and place `'scenarios-cf-eu-turkey.js'` in `SCENARIO_FILES` **after** existing `'turkey-landmask.js'`. This new scenario's only nonstandard geographic dependency is the pre-existing `TURKEY_LAND_BITS` provider.
2. Regenerate `dist/scenario-catalog.js` via `tools/generate-scenario-catalog.cjs` and confirm its catalog dependency and load order. Do not re-register or rename `invasion-turkey`.
3. In the Federation vs E.U. campaign registry, change objective `federation-eu-turkey` from `scenarioId:null` to `scenarioId:'cf-eu-turkey'` **only after** full tactical test success.
4. Make no new commander, elite roster, UI/engine, or AI shared switches unless real-engine testing demonstrates a missing capability.

## Required full-engine validation before integration

```bash
python3 tools/build_sources.py
node tools/scenario_sim.cjs cf-eu-turkey cf normal 11 5
node tools/scenario_sim.cjs cf-eu-turkey eu normal 11 5
# Both factions: many seeds, extended turns, and hard/challenge/elite.
node tools/scenario_sim.cjs --all > /tmp/now.txt
diff tools/data/sim_baseline.txt /tmp/now.txt
node tools/federation_eu_campaign_smoke.cjs
node tools/validate_assets.cjs --tracked
```

After registry integration, run multi-seed extended trials and inspect early frontier captures, total conquest attainability for both players on Normal, enemy production, sea transport and the Istanbul/Thrace crossing. Verify saveVersion 1 and actual save/reload, HQ slot restrictions on Elite, city/port independence after captures, rewards only for real total conquest, and mobile rendering. Tune balance **first through formations**; the opening strengths are provisional, not proved fair by the lightweight harness.

## Non-owned files deliberately untouched

No changes to `main`, architecture registry, `dist/war-campaign.js`, `dist/scenario-manifest.js`, `dist/scenario-catalog.js`, shared engine/AI/renderer, source bundles, the original Turkey operation, or other scenarios.

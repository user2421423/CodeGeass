# Crossing the Himalayas — EU–Federation scenario
**Runtime ID:** `eu-cf-himalayas`  
**World Campaign objective:** `eu-federation-himalayas` (mission 10, Tier 4)  
**Branch:** `scenario/eu-cf-himalayas`, based on `feature/eu-vs-federation-campaign-architecture`.

## Geography and victory

- 144 × 108 hex map over **74.4°–96.5° E, 25.8°–35.8° N** (WGS84).
- **57 real settlements / theatre centers:** 31 EU southern staging or frontier cities across northern India, Nepal, Sikkim, Bhutan and the eastern Himalayan approach; 26 Federation-held Tibetan / high-plateau cities. The setting is alternate-history sovereignty, not modern political borders.
- **Seven explicitly open trans-Himalayan routes:** Demchok–Rutog, Lipulekh–Purang, Hilsa–Purang, Rasuwagadhi–Gyirong, Kodari–Zhangmu, Nathu La–Yadong, Bum La–Tsona. Alpine ridges are defensible, with impassable peak patches, but these route polylines remain traversable.
- A Tibetan plateau road network connects Saga, Lhatse, Shigatse, Gyantse, Lhasa, Tsetang, Nyingchi and Bomi and links the eastern Tsona flank. This avoids mountain-isolated final targets.
- Terrain uses **mountains** (+25% protective cover, movement cost 2), **peak** (impassable), **snow** (engine-standard 2.5% attrition), **forest** and plains. Rivers represent highland geography only: **no fabricated sea, shipyards or fleets**.
- All **57 cities must be controlled** by one side to win. No clock-based victory, scripted outcome, or artificial armistice. Army Groups can receive player movement orders, and the standard AI operates both directions.

## Armies, economy and difficulty

The authored setup contains **93 EU and 102 Federation land formations**, distributed among named Army Groups on six principal offensive axes and defensive reserves. These counts are design starting points, **not claims of simulation-proven balance**. The higher EU offensive coverage offsets a defensive opponent's mountain advantage.

EU named commanders include Akito, Leila, Yukiya, Ayano, Ryo, Smilas and other existing E.U. officers. The Federation includes Xingke, Gao Hai, Hong Gu, Xianglin and other existing Federation officers. All frames use `E.typeFor(side, class, g)` and both Elite rosters are filtered by the original `availableTo` allegiance. No Britannian or Black Knights deployment, no global Commander/Elite Force edits.

Both sides start with tier 2–3 production cities, city-dependent income, initial funded treasuries, normal research and factory behavior. The scenario uses `g.scenario.funding`, so the shared engine's established income localization transfers the scenario budget to its original cities when play begins. AI production is not disabled. Normal has equal AI/player unit-stack rules; Hard and Challenge add the existing enemy stack scaling. Elite calls `E.prepareEliteEurope(g)`, converts eligible field frames to faction-correct Elite Forces and uses the shared rival research / commander upgrade policy.

## Source ownership and integration handoff

Only the following scenario-owned files are committed:

- `dist/scenarios-eu-cf-himalayas.js`
- `docs/EU_CF_HIMALAYAS_SCENARIO.md`

**Integrator-only changes (do not include in this PR):**

1. Add `eu-cf-himalayas` to `dist/scenario-manifest.js` as an E.U.–Federation regional scenario with title **Crossing the Himalayas**, `sides:['eu','cf']`, a suitable scenario note, and `SCENARIO_FILES` entry `dist/scenarios-eu-cf-himalayas.js` (load after the core engine/AI). No external coastline data or other scenario modules are required.
2. Regenerate `dist/scenario-catalog.js` with `node tools/generate-scenario-catalog.cjs` after the manifest entry.
3. In `dist/war-campaign.js`, update **only** `eu-federation-himalayas`: `scenarioId:null` → `scenarioId:'eu-cf-himalayas'` after integration tests. Preserve the mission ordering (Manchuria 9 → Himalayas 10 → Sichuan 11).
4. Coordinate expected new `scenario_sim --all` baseline lines with the tooling integrator; do not conceal changes in other scenarios.

## Validation status

**Passed lightweight geometry checks (using scenario WGS84 map rules in a separate JavaScript inspection):** 57 settlements placed, no duplicate city names or bad formation origin/objective references; seven pass polylines checked at each sampled waypoint; no station cut off from the Kathmandu connected land graph. Terrain sample: 622 impassable peaks, 3,616 mountain, 6,642 snow, 3,900 plains, 772 forest hexes. Note that some non-city isolated terrain pockets remain; no victory-critical settlement is isolated.

**Full-engine tests required before merge:** The GitHub connector used to author this scenario does not provide a Node process or a repository checkout, so no `node tools/scenario_sim.cjs` results should be inferred from this document. Execute the following in a checked-out branch:

```bash
node --check dist/scenarios-eu-cf-himalayas.js
node tools/scenario_sim.cjs eu-cf-himalayas eu normal 11 5
node tools/scenario_sim.cjs eu-cf-himalayas cf normal 11 5
node tools/scenario_sim.cjs eu-cf-himalayas eu normal 17 45
node tools/scenario_sim.cjs eu-cf-himalayas cf normal 17 45
node tools/scenario_sim.cjs eu-cf-himalayas eu normal 37 90
node tools/scenario_sim.cjs eu-cf-himalayas cf normal 37 90
node tools/scenario_sim.cjs eu-cf-himalayas eu elite 11 5
node tools/scenario_sim.cjs eu-cf-himalayas cf elite 11 5
node tools/scenario_sim.cjs --all > /tmp/eu-cf-himalayas-baseline.txt
diff tools/data/sim_baseline.txt /tmp/eu-cf-himalayas-baseline.txt
node tools/eu_federation_campaign_smoke.cjs
```

Inspect `errors`, `captures`, `production`, initial city income, overland route attempts, elapsed turns and final cities for **both** sides. Tweak **starting formation counts first** if Normal stalls or cannot win. Verify save/reload and phone rendering interactively. No victory/balance claim is warranted until these tests complete.

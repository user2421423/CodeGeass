# Federation vs E.U. — North African Offensive

- **Scenario ID:** `cf-eu-north-africa`
- **Campaign objective:** `federation-eu-north-africa` (mission 11, tier 4)
- **Owned runtime file:** `dist/scenarios-cf-eu-north-africa.js`
- **Factions:** `cf`, `eu` (both playable)
- **Parent:** `feature/federation-vs-eu-campaign-architecture`
- **Branch:** `scenario/cf-eu-north-africa`
- **Victory:** exactly one faction controls all 51 stations. No scripted turn limit, free victory or special elimination.

## Theatre and geographic design

176 × 108 hex cells over 1.8°W–34.3°E and 22.4–40.5°N. Real-world WGS84 coordinates position cities across Egyptian Federation bases and the E.U. regions of Libya, Tunisia and Algeria. The shore is a geographically ordered polygonal approximation following the Algeria/Tunisia capes, Tunisian east coast, Gulf of Sidra, Cyrenaica and Egyptian Mediterranean coast; a 0.13° mixed-hex coast buffer is used. The scenario deliberately has no fabricated inland navigable seas. **This is a hand-authored hex approximation, not surveyed GSHHG coastline or verified modern province borders.** Further coast/terrain checking with the rendered build is appropriate before integration.

The 9 Federation cities are Cairo, Giza, Alexandria, El Alamein, El Dabaa, Marsa Matruh, Sidi Barrani, Sallum and Siwa. The E.U. holds 42 cities, including **Bardia, Tobruk, Derna, Benghazi, Ajdabiya, Sirte, Misrata, Tripoli, Tunis, Bizerte, Sfax, Annaba, Bejaia, Algiers and Oran**. City-linked provinces are assigned by nearest station; routes along the coast and via Siwa–Fezzan are traversable. The Jebel Akhdar, Nafusa and Algerian Atlas are defended but not impenetrable. The southern desert is open terrain with no fake cutoff.

## Forces, fleets and operations

- The Chinese Federation has a Western Desert Vanguard, Coastal Breakthrough Army, Mediterranean Expedition, Nile Mobile Reserve, Alexandrian Naval Corps, Egyptian Support Army and Siwa Southern Flank.
- E.U. formations cover the Tobruk/Bardia line, Cyrenaica and Benghazi, Sirte, Tripoli, Fezzan, Tunis/Bizerte and Algeria.
- Army Group allocations use faction-correct `E.typeFor` frames and named officers. Fleet types are `cf_carrier`, `shui_gun_ru_ii`, `eu_carrier` and `panzer_frosch_ii`.
- Each of **23 Mediterranean harbours** receives a distinct sea-hex `portAt`, `portLevel` and `portOwner`. Capture ownership is independent of station ownership under the shared port rules. The Federation is intended to seize Tripoli, Tunis, Bizerte, Annaba, Bejaia and Algiers to prepare for a subsequent *separate* southern France naval invasion; this scenario does not grant completion of the France mission.
- Initial setup has **120 Chinese units including 13 ships** and **155 E.U. units including 25 ships**, distributed along several geographic fronts. Funding targets: CF 1150 credits / 690 industry / 118 science / 60 sakuradite; E.U. 990 / 590 / 106 / 54. These are opening nominal per-turn income targets before captured production alters the balance, not an artificial turn-by-turn timer.
- A `meta.ai` E.U. doctrine with CF operational axes and E.U. defensive hubs hands ordinary strategic planning, recruitment and repair to shared AI. There are no scenario-specific engine hacks.

## Mechanics and integration

`create(player,difficulty,seed)` accepts `cf` or `eu` and Normal, Hard, Challenge or Elite; ordinary engine difficulty scaling is applied on Hard/Challenge, and `E.prepareEliteEurope(g)` is called on Elite. The scenario exposes faction-specific `eliteRosters`, standard station production/income data, `g.tech` and `g.economy`, commanders, Army Groups, port berths, `objective`, `winner`, `onTurn`, `strategicScore` and `orderGroup`. Research, recruitment, repairs, HQ limits, medals, saves and rewards are **shared engine/World Campaign responsibilities**; no duplicate economy or rewards implementation was introduced. Saves identify this battle using `g.scenario.id` and `version:1`.

**Integrator-owned changes required; deliberately not made in this PR:**

1. `dist/scenario-manifest.js` `SCENARIO_MANIFEST` add `{id:"cf-eu-north-africa",title:"North African Offensive",note:"51 cities · 2 sides · Mediterranean campaign"}`.
2. `SCENARIO_FILES` load `"scenarios-cf-eu-north-africa.js"` after the shared engine and AI prerequisites; the file needs no separate coast helper.
3. Update `dist/war-campaign.js` objective `federation-eu-north-africa` from `scenarioId:null` to `"cf-eu-north-africa"` **only after** runtime tests and registration checks. Refresh `tools/generate-scenario-catalog.cjs` and `dist/scenario-catalog.js` as necessary.
4. Verify/replace provisional World Campaign North Africa political polygons and transition arrows; this scenario does not edit political overlays, central registries or shared engine/AI/renderer files.

## Verification record (precisely scoped)

- **Done:** JavaScript source syntax parsed with V8 `new Function`.
- **Done, mocked engine only:** called `create` for CF and E.U. × Normal/Hard/Challenge/Elite (8 setups), checking 51 unique station placements, 23 distinct port berths, connected Mediterranean navigability, city/land route connectivity, Army Groups, no dry-land units stranded at sea and JSON serialization. These checks were not full-engine gameplay tests. Harbour placement and search-radius bugs identified by these checks were fixed.
- **Not executed:** full-source build, `scenario_sim.cjs` multi-seed or extended runs, genuine `E.aiOrder` and `E.aiProduction` combat, Elite HQ UI limits, save reload through the real engine, profile rewards, mobile frame-time measurement or full cross-scenario regression. These must be run by integrator/CI on a checked-out and built branch. Do not infer Normal win rates from the mocked setup test.

### Integrator/QA commands

```sh
node tools/build_sources.cjs
node --check dist/scenarios-cf-eu-north-africa.js
node tools/scenario_sim.cjs cf-eu-north-africa cf normal 11 5
node tools/scenario_sim.cjs cf-eu-north-africa eu normal 11 5
# Extend with seeds 11, 23, 47 and 79; run 20–50 turns per side,
# and separate hard/challenge/elite runs for both playable factions.
node tools/scenario_sim.cjs --all > /tmp/north-africa-baseline.txt
diff -u tools/data/sim_baseline.txt /tmp/north-africa-baseline.txt
node tools/validate_assets.cjs --tracked
```

Because the scenario is intentionally not yet in the shared manifest, `scenario_sim.cjs` loads it by scanning `dist/scenarios*.js` after the source build, but World Campaign credit/rewards and load order still require integration. Baseline differences consisting only of the new scenario lines are expected; no baseline files are owned by this PR.

**Balance decision pending:** the setup model is complete but no legitimate Normal win-rate measurement exists yet. Prioritize additional Federation starting formations or reduced forward E.U. formations if the westbound offensive stalls. Preserve E.U. defensive counterattack viability and retest both factions before changing shared mechanics.

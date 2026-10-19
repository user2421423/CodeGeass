# E.U. vs Chinese Federation — Invasion of India

**World Campaign objective:** `eu-federation-india` (mission 7, Tier 3)  
**Runtime ID:** `eu-cf-india`  
**Ownership lane:** scenario-only; integration of the campaign registry and manifest is separately owned.  
**Base branch:** `feature/eu-vs-federation-campaign-architecture`  
**Scenario branch:** `scenario/eu-cf-india`

## Scenario overview

Europia United advances east from Persia through Afghanistan toward Pakistan and India, while three independent carrier landing corps strike the Arabian Sea littoral. The Chinese Federation begins with the populated subcontinent, defendable coastal bases and a network of reserves extending from Punjab and Rajasthan through the Ganges plain, Bengal, the Deccan and the south. Both sides are playable and hostile from turn one. Victory requires **ownership of all 113 cities**, without any scripted deadline.

The playable theatre is 168 × 124 offset-row hexes (20,832 hexes) with WGS84 bounds **57–94° E, 5.5–37° N**. The 113 settlements include eleven E.U.-held forward bases in Iran/Afghanistan and 102 Federation cities across Pakistan, India, Bangladesh and Sri Lanka. A scenario-owned geographical helper traces the Arabian Sea, Bay of Bengal, and Sri Lankan coastlines using a simplified polygon and twenty-five sub-hex samples per tile: under 20% land = sea, 20–80% = mixed coast, over 80% = land. The map is intentionally an alternate-history military theatre rather than a depiction of contemporary political borders.

**Operational fronts:** Northern Expedition (Herat, Kabul and Khyber); Indus Breakthrough (Kandahar, Quetta, Multan); Makran Army (Zahedan, Gwadar and Karachi); Sindh, Gujarat and Konkan carrier landings; later options to advance toward Delhi, the Ganges, Bengal and the Deccan. The Federation fields the Khyber and Indus defenses, Rajasthan/Delhi armies, Gujarat/Konkan coast, Ganges/Bengal, Deccan, southern and island reserves. Rivers are scenario map data for the Indus, Ganges, Brahmaputra, Narmada, Godavari and Krishna; mountains, foothills and desert terrain are approximated and critical land routes deliberately remain traversable.

## Implementation

- `dist/eu-cf-india-geography.js`: independent sub-hex land/coast/sea sampling; no engine or common map overrides.
- `dist/scenarios-eu-cf-india.js`: city locations, coastal ports, formations, fleets, three carrier cargo groups, named commanders, Army Group metadata, objectives, `create`, `onTurn`, `winner`, `orderGroup`, income, Elite conversion, AI meta and text.
- `docs/EU_CF_INDIA_SCENARIO.md`: this design, tests and integration handoff.

Only E.U. and Federation factions (`sides:['eu','cf']`) are present. All regular land formations use the existing `E.typeFor(side, class, g)` faction rosters. E.U. ships use `eu_carrier` and `panzer_frosch_ii`, and Federation ships use `cf_carrier`. Twelve E.U. carriers across three named fleets have capacity for **18 starting embarked formations**; these formations stay eligible for the standard Elite conversion pass before embarkation. Named commanders use existing records; no unit stats, rewards, research, medals or special campaign completion rules change.

Port ownership is independent of city ownership, with 26 port stations and separate adjacent navigable `portAt` hexes. The Arabian Sea and Bay of Bengal connect around India; ships are placed in genuine water tiles, not lakes or land. All starting armies and ports use the existing troop, build, production, refit and income systems. `api.meta.ai` enables the built-in European doctrine, recovery, synchronized flotillas and operational objectives; no scenario-ID conditional was added to shared AI code.

**Final Normal starting forces:** E.U. **136 on-map formations plus 18 carrier passengers**; Chinese Federation **128 on-map formations**. Starting city holdings are E.U. 11, Federation 102. This force mix was adjusted primarily by increasing E.U. invasion formations, reducing the widespread Federation land screen, and restoring twelve additional Federation frontier formations at critical northwest hubs. The user-selected side receives ordinary starting income; Hard/Challenge/Elite apply the existing AI-side income/stack/Elite setup conventions.

**All four selectable difficulties** initialize: Normal, Hard, Challenge, Elite. Faction-eligible Elite Force starting conversions follow `E.prepareEliteEurope`, with shared HQ unlock and recruitment policies left untouched. Total-capture victory uses `winner`; no turn cap or simulated campaign credit.

## Verification and balance

Verification used **the actual repository engine and AI source**, evaluated as concatenated builds matching `tools/bundles.json`, with the scenario module and helper loaded together. The tests use the same AI turn, production, actor selection, action and victory functions as `tools/scenario_sim.cjs`; the GitHub-connected execution environment did not provide a local checkout for directly invoking the Node CLI.

**Final-state validation:**
- E.U. and Federation setup on each of Normal, Hard, Challenge, Elite passed on the earlier map/formation version; full-engine Normal setup on the final starting-force version passed.
- Final map audit: 113/113 city positions within 100 km of the supplied WGS84 anchors (largest approx. 83 km for Mundra due to berth placement and hex resolution); 26/26 ports have independent valid navigable sea berths.
- Named commanders: no missing references or duplicate starting assignments.
- Land routes successfully traversed by graph reachability: Kabul–Peshawar, Kandahar–Quetta, Chabahar–Gwadar, Peshawar–New Delhi, New Delhi–Kolkata and Mumbai–Kochi.
- JSON serialization and parse preserved all 26 ports, 18 embarked units, objective text and absence of a false victory.
- Elite rosters: seven faction-eligible entries for each side, with real Elite conversion confirmed in both sides' setup tests.

**Final revision, full-engine AI-vs-AI, Normal:**

| Player-side selection | Seed | Turns | E.U. cities | CF cities | E.U. live on-map units | CF live on-map units | E.U./CF production | Errors |
|---|---:|---:|---:|---:|---:|---:|---|---:|
| E.U. | 11 | 10 | 23 | 90 | 114 | 72 | 34 / 14 | 0 |
| Federation | 37 | 10 | 20 | 93 | 102 | 69 | 31 / 17 | 0 |

These outcomes include 30 and 21 city transfers respectively, 465/304 and 483/319 attack events by E.U./CF, and naval move/attack/deploy events on both sides. The E.U. makes progress, the Federation counterattacks and produces, and combat remains active.

**Earlier revision, longer exploratory tests (before final twelve additional CF frontier units):** Normal E.U. seed 23 at turn 12 held 25 cities (114 EU/48 CF live on-map units); Normal CF seed 37 at turn 12 held 21 EU cities (101 EU/58 CF on-map units). Both had zero engine AI errors, active naval operations and production. These **are not tests of the final balance** and must not be presented as such.

**Unverified acceptance criteria / recommended follow-up:** No 113-city total conquest has been simulated, so eventual Normal victory for both human factions is **not yet proven**. Full browser/phone rendering benchmark and interactive save-load gameplay are not available in this execution environment; only JSON round-trip serialization was checked. Run the repository CLI simulations, longer 30–50+ turn seeded matches and manual scenario playtests after integration; inspect the 168 × 124 screen on mobile. The 20–80% coast is derived from simplified hand-drawn shore polygons, **not a surveyed high-resolution coastline dataset**. Spot-check estuaries, Sri Lanka and major ports against cartographic references before merging. The 113-city campaign is large; late-game progression may still need fine-tuning.

## Integrator-only registration and dependencies

Do **not** commit changes to `dist/scenario-manifest.js`, `dist/scenario-catalog.js`, `dist/war-campaign.js` or the shared baseline from this scenario branch. The integrator must:

1. Add `{id:"eu-cf-india",title:"Invasion of India",note:"113 cities · 2 sides · Arabian Sea landings"}` to `SCENARIO_MANIFEST` in `dist/scenario-manifest.js`.
2. Add **in order** `'eu-cf-india-geography.js'` then `'scenarios-eu-cf-india.js'` to `SCENARIO_FILES` in the same file. The module requires the already-loaded engine and its own geometry helper; it requires no other regional scenario or image asset.
3. Run `node tools/generate-scenario-catalog.cjs` and check the generated catalog, then check `node tools/scenario_sim.cjs eu-cf-india eu normal 11 5`, `node tools/scenario_sim.cjs eu-cf-india cf normal 11 5`, additional longer tests, `node tools/scenario_sim.cjs --all` versus `tools/data/sim_baseline.txt`, `node tools/eu_federation_campaign_smoke.cjs`, `node tools/validate_assets.cjs --tracked`, the source build and browser smoke tests.
4. Only after scenario acceptance, change **this objective alone**, `eu-federation-india`, from `scenarioId:null` to `scenarioId:'eu-cf-india'` in `dist/war-campaign.js`. Keep the other planned campaign objectives locked until their separate PRs are accepted.
5. Coordinate expected new fingerprint lines in `tools/data/sim_baseline.txt` in the integration lane; do not change pre-existing fingerprints to mask regressions.

The scenario branch must remain **unmerged** pending integrator acceptance.

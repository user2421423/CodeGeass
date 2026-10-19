# Defense of Japan

**Branch:** `feature/defense-of-japan`  
**Scenario ID:** `defense-japan`

## Setting

An alternate 2017 regional operation on the **existing 110 × 84 Japan map**:
the same 44 Japanese cities, coastal hexes, islands, city provinces,
Sakuradite sites and original ports as *The Invasion of Japan*.
The original Invasion and Division of Japan scenarios are unchanged.

* **Black Knights** initially own every Japanese city, every city-linked land
  province and every harbor. They begin with 31 dispersed ground formations
  plus seven ships and amphibious defenders around strategic coastal cities.
* **Britannia** initially owns **zero cities and zero ports**. Its 18
  carrier-battleships are its **only units physically on the map**. Each carries
  two Britannian land formations, for 36 embarked formations in total.
* Five coordinated invasion fronts approach from **Hokkaido, Tohoku, Kanto,
  western Honshu and Kyushu**.
* Only these two factions are playable, hostile from turn one. There is no
  Chinese Federation intervention, diplomatic timer, extra off-map territory,
  or deadline.

## Victory conditions

* **Britannian victory:** capture all 44 cities.
* **Black Knights victory:** eliminate all Britannian surviving units and
  ensure Britannia controls no cities.
* Britannia is an **expeditionary side**: having no cities at scenario start
  is not an immediate loss. Its cityless opening war chest is one-time,
  not a permanent income subsidy. Captured Japanese cities generate local
  resources thereafter.

## Gameplay

The Black Knights begin with city shields, production and multiple defending
formations throughout the archipelago. Britannia must use carriers to land,
capture ports and establish an economy. Five distinct fleets provide several
possible landing routes rather than a single entry point.

Normal, Hard, Challenge and Elite difficulties use the current scenario rules;
Elite converts eligible starting ground troops to faction elite units before
loading the invaders into the carrier cargo holds. The existing carrier hulls
remain conventional. The game reuses the shared Japan scenario map,
the regional carrier rules and synchronized AI flotilla behavior.

## Files and validation

* `dist/scenarios-defense-japan.js` — independent scenario implementation.
* `dist/scenario-manifest.js` and `dist/scenario-catalog.js` — menu and
  background loading.
* `tools/generate-scenario-catalog.cjs` — catalog regeneration dependency.
* `tools/defense_japan_smoke.cjs` — factions, cargo, city ownership,
  difficulty, finances, victory logic and short AI smoke test.

To validate after checking out the branch:

```bash
node tools/build_sources.cjs
node tools/generate-scenario-catalog.cjs
node tools/defense_japan_smoke.cjs
node tools/scenario_sim.cjs defense-japan bk normal 11 10
node tools/scenario_sim.cjs defense-japan britannia normal 11 10
node tools/validate_assets.cjs --tracked
```

The addition changes the set of scenarios and therefore necessarily adds
setup/simulation fingerprints to the `--all` baseline. Existing scenario
fingerprints should remain unchanged. Longer seeded playtests are needed to
establish final balance, particularly the strength of Black Knights coastal
production versus a cityless Britannian invasion.

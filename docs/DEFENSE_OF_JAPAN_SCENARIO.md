# Defense of Japan

**Scenario ID:** `defense-japan`  
**Live branch:** `main`

## Setting

An alternate 2017 regional operation on the **existing 110 × 84 Japan map**:
28 Black Knights cities after deleting 16 redundant secondary settlements.
All original coastlines, islands, ports, Sakuradite sites and troop deployment
anchors remain, and provinces of deleted cities are reassigned to retained cities
on the same landmass so territory still changes hands on capture.
*The Invasion of Japan* and *The Division of Japan* retain their original 44 cities.

* **Black Knights** initially own every Japanese city, every city-linked land
  province and every harbor. They begin with 34 two-frame ground formations
  plus eleven carriers and amphibious defenders around strategic coastal cities.
* **Britannia** initially owns **zero cities and zero ports**. Its 18
  carrier-battleships are its **only units physically on the map**. Each carries
  two Britannian land formations, for 36 embarked formations in total.
* Five coordinated invasion fronts approach from **Hokkaido, Tohoku, Kanto,
  western Honshu and Kyushu**.
* Only these two factions are playable, hostile from turn one. There is no
  Chinese Federation intervention, diplomatic timer, extra off-map territory,
  or deadline.

## Victory conditions

* **Britannian victory:** capture all 28 cities in new games. Older saves retain
  their original city count and victory conditions.
* **Black Knights victory:** eliminate all Britannian surviving units and
  ensure Britannia controls no cities.
* Britannia is an **expeditionary side**: having no cities at scenario start
  is not an immediate loss. Its cityless opening war chest is one-time,
  not a permanent income subsidy. Captured Japanese cities generate local
  resources thereafter.

## Gameplay

The Black Knights begin with city shields, production and multiple defending
formations throughout the archipelago. Removing secondary cities reduces the
capture workload, reduces recurring city income and creates wider spaces
between strongholds without weakening the standard city shield model. Britannia must use carriers to land,
capture ports and establish an economy. Five distinct fleets provide several
possible landing routes rather than a single entry point.

Normal, Hard, Challenge and Elite difficulties use the current scenario rules;
Elite converts eligible starting ground troops to faction elite units before
loading the invaders into the carrier cargo holds. The existing carrier hulls
remain conventional. The game reuses the shared Japan scenario map,
the regional carrier rules and synchronized AI flotilla behavior.

## Removed secondary cities

- **Hokkaido:** Asahikawa, Kushiro
- **Tohoku:** Morioka, Akita, Fukushima
- **Kanto / Chubu:** Narita, Kofu, Nagano, Hamamatsu
- **Kansai:** Wakayama
- **Western Honshu:** Tottori, Okayama, Yamaguchi
- **Shikoku:** Kochi
- **Kyushu:** Oita, Miyazaki

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

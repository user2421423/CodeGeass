# Invasion of Mongolia — E.U. vs Chinese Federation

**Runtime ID:** `eu-cf-mongolia`  
**World Campaign objective:** `eu-federation-mongolia` (mission 8, tier 3)  
**Scenario file:** `dist/scenarios-eu-cf-mongolia.js`  
**Owner:** Mongolia scenario lane. **Integration:** separate campaign/manifest owner.  
**Historical setting:** fictional Code Geass alternate 2017; place locations and landform positions are geographic, military ownership is fictional.

## Map and operational design

- **164 × 96** centre-sampled hexes, 87.4–120.6°E and 41.2–54.2°N. Continuous land theatre; approximately 15,744 tiles. No ocean, ports, aircraft carriers, artificial naval actions or cross-border ocean shortcuts (Mongolia is landlocked).
- **51 real settlement/road-hub locations:** 11 E.U. Siberian staging cities and 40 Chinese Federation cities or towns in Mongolia. There are 51 capturable city provinces and land-hex ownership is assigned to the closest city at setup. Fictional fortifications, factory tiers, equipment, borders and alliances are deliberately distinguished from the real geography.
- Ranges represented with traversable `mountain`, `forest` and `plains` terrain: Mongol Altai in the west, Khangai and Gobi Altai in the center/southwest, Khövsgöl highlands in the north, Khentii in the northeast, and open eastern steppe and southern Gobi. Named valleys clear through the relief; mountains slow units, not create an impassable wall. Lake Khövsgöl is relief context rather than a maritime zone.
- Major river polylines (Selenge, Orkhon, Tuul, Kherlen, Onon, Zavkhan and Delgermörön) feed the existing regional river overlay. These are **not** deepwater ship channels. No new renderer/engine assets are needed.

## Battle axes and forces

| Axis | Attacker origin | Main targets | Intended strategic challenge |
| --- | --- | --- | --- |
| Western Altai | Kyzyl / Ak-Dovurak / Turan | Ulaangom → Uliastai → Khovd | Wide flanking distances and limited highland corridors |
| Khövsgöl–Orkhon | Irkutsk / Slyudyanka | Mörön → Erdenet → Kharkhorin | Forested highlands and industrial hubs |
| Selenge railway | Ulan-Ude / Kyakhta / Gusinoozyorsk | Sükhbaatar → Darkhan → Ulaanbaatar | Fortified northern entry and capital defenses |
| Eastern steppe | Chita / Borzya / Zabaykalsk | Choibalsan → Chinggis City → Ulaanbaatar | Fast maneuver, deep eastern flanks |

At the current **untested** first balance pass: E.U. has **137** formations; Federation has **107**. The difference is intentional: the Federation begins with **40 cities versus 11**, stronger interior positions, fortified capital, and deeper replacement infrastructure. Ulaanbaatar's defensive command alone fields **21 formations**, supported by Zuunmod, Nalaikh and other inner cities.

Army Groups are scenario-native, with named E.U. commanders (Akito, Leila, Ayano, Yukiya, Ryo and others) and Federation officers (Li Xingke, Honggu, Xianglin, Chengzhong and others). Every land unit is created by `E.typeFor(side, class, g)` to prevent cross-faction frames. Groups have human order controls and named AI operational fronts. The established `europe` doctrine allows offensive and defensive fronts plus commander recovery and city repair.

## Game systems preserved

- Both `eu` and `cf` are playable. `create(side,difficulty,seed)`, `objective`, `onTurn`, `winner`, `strategicScore`, `orderGroup` are exported.
- All four `normal`, `hard`, `challenge`, `elite` difficulties. Opponent formation stacks rise on Hard/Challenge; established `E.prepareEliteEurope(g)` handles Elite rather than custom Elite Forces. Scenario Elite rosters include only faction-eligible and non-scenario-only entries.
- Factories, city defense, research/officers, starting finance, replenishment and AI production use the existing engine and regional-scenario income-localization system. No city starts without its tier-based industry.
- No time cap, scripted sudden victory, or automatic progress. Either side wins **only after owning all 51 cities**. Rewards, commander medals, permanent elite fragments and campaign progression are all left to the existing framework.

## Scenario-only validation and pending runtime checks

Static checks on the committed module confirmed 51 unique settlements, coordinate bounds, 11/40 starting city ownership, valid Army Group staging-city names, 137/107 formation counts, two legal playable sides, and no external map dependencies. These are **not substitutes for actual full-engine playthroughs**.

**Before integration, run locally or in a scenario-specific CI job:**

```sh
node tools/build_sources.cjs
node --check dist/scenarios-eu-cf-mongolia.js
node tools/scenario_sim.cjs eu-cf-mongolia eu normal 11 5
node tools/scenario_sim.cjs eu-cf-mongolia cf normal 11 5
node tools/scenario_sim.cjs eu-cf-mongolia eu normal 17 40
node tools/scenario_sim.cjs eu-cf-mongolia cf normal 17 40
node tools/scenario_sim.cjs eu-cf-mongolia eu normal 29 70
node tools/scenario_sim.cjs eu-cf-mongolia cf normal 29 70
node tools/scenario_sim.cjs eu-cf-mongolia eu elite 11 3
node tools/scenario_sim.cjs eu-cf-mongolia cf elite 11 3
node tools/scenario_sim.cjs --all 11 2 > /tmp/mongolia-regression.txt
diff -u tools/data/sim_baseline.txt /tmp/mongolia-regression.txt
node tools/validate_assets.cjs --tracked
python3 tools/check_map.py
```

**Review before merge:** inspect `SCENARIO_SIM` JSON for errors, successful city captures, starting income/industry, each side's units produced, attacker/defender casualties, severe stalls, and realistic Normal victory potential. Also smoke-test save/reload, Elite roster transformation, deployment routes and mobile rendering. `--all` is expected to add Mongolia fingerprints; compare the **existing scenario lines** independently against the baseline, not by hiding or changing those lines. The integrator alone manages baseline changes if required.

## Integration handoff (not committed in scenario PR)

Add one entry to `SCENARIO_MANIFEST` in `dist/scenario-manifest.js`:

```js
{id:"eu-cf-mongolia",title:"Invasion of Mongolia",note:"51 cities · 2 sides"},
```

Add one module after any common engine/AI scripts in `SCENARIO_FILES`:

```js
'scenarios-eu-cf-mongolia.js',
```

No local landmask, coast, underlay, naval or new shared code is required. As part of the **separate integration**, regenerate `dist/scenario-catalog.js` using `node tools/generate-scenario-catalog.cjs`, then replace **only** World Campaign objective `eu-federation-mongolia`'s `scenarioId:null` with `eu-cf-mongolia` in `dist/war-campaign.js` after runtime acceptance. Other planned objectives must remain locked. The campaign navigation UI, rewards and older scenarios must remain unchanged.

**Dependencies:** existing `Knightmare` engine, `E.scenarios.byId` runtime registry, `E.typeFor` E.U./Federation classes, existing named commanders, Elite conversion, regional AI, and built-in `regionalRivers` renderer overlay. **Target PR base:** `feature/eu-vs-federation-campaign-architecture`; do not merge this scenario branch independently.

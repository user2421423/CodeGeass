# E.U. vs Chinese Federation — Invasion of Persia

**Runtime ID:** `eu-cf-persia` · **World Campaign objective:** `eu-federation-persia` (mission 5, tier 2). This scenario lane does not alter `main`, the campaign registry, manifest or other scenarios.

## Geographic design

The 168 × 112 hex map reuses the existing Iraq–Iran scenario's WGS84 bounds (34–65° E, 22.3–40.4° N) and `dist/iraq-iran-coast.js` 20–80% land-coverage classes. The map covers Iran, the Persian Gulf, Mesopotamian approaches and **southern** Armenia/Azerbaijan. It excludes northern Georgia/Caucasus; including them would require a new coastline grid. There are **61 cities**, 17 initial E.U. bases and 44 initial Chinese Federation cities; all city positions follow real coordinates.

Land routes: Yerevan/Goris/Nakhchivan → Tabriz → Tehran; Bilasuvar/Lankaran → Ardabil → Rasht/Qazvin; Mosul/Erbil/Sulaymaniyah/Baghdad → Saqqez/Sanandaj/Kermanshah → Hamadan/Arak; Kut/Amarah/Basra → Ahvaz/Dezful → Shiraz/Isfahan. Zagros and Alborz have mountain penalties, peak blockers and traversable passes. The existing Tigris, Euphrates and Karun river-barrier logic is retained.

**Independent Gulf ports:** Kuwait City and Umm Qasr (E.U.); Bushehr, Bandar Lengeh, Bandar Abbas, Bandar Jask and Chabahar (Chinese). Only the Persian Gulf's connected sea basin permits fleet placement and harbor berths; Caspian water is not used for Gulf naval movement.

## Setup, economy and victory

**Initial forces:** E.U. 140 land formations in named Army Groups and 10 naval ships; Federation 128 land formations and 13 naval ships. E.U. officers include Akito, Leila, Yukiya, Ryo, Ayano, Smilas, Olivia and others; Federation officers include Xingke, Honggu, Gao Hai, Cao, Xianglin and others. Unit types come exclusively through `typeFor('eu'/'cf')`, plus faction naval units. Normal, Hard, Challenge and Elite retain source difficulty scaling and `prepareEliteEurope` setup. Funding, city income, industries, factories, repairs, research, Elite rosters and AI production use the normal engine mechanisms.

The E.U. is initially stronger in forward formations; the Chinese Federation has a larger producing city network and defended passes. AI uses declarative operational fronts and `meta.ai.operationalAxes`, not new ID-specific code. Victory requires **every city owned by one side**, without a turn limit or scripted surrender. Rewards, progression and commander medals are not overridden.

## Required integrator manifest entries

```js
{id:"eu-cf-persia",title:"Invasion of Persia",note:"61 cities · 2 sides"}
```

In `SCENARIO_FILES`, load `'iraq-iran-coast.js'` before `'scenarios-eu-cf-persia.js'`; leave `'scenarios-iraq-iran.js'` unchanged. Refresh `dist/scenario-catalog.js` using `node tools/generate-scenario-catalog.cjs`. When independently validated, set only the `eu-federation-persia` campaign objective's `scenarioId:'eu-cf-persia'` in the **integrator's own** change. Keep other objectives' placeholders locked.

## Acceptance test commands (integrator)

```bash
python3 tools/build_sources.py
node --check dist/scenarios-eu-cf-persia.js
node tools/scenario_sim.cjs eu-cf-persia eu normal 11 5
node tools/scenario_sim.cjs eu-cf-persia cf normal 11 5
node tools/scenario_sim.cjs eu-cf-persia eu normal 17 30
node tools/scenario_sim.cjs eu-cf-persia cf normal 17 30
node tools/scenario_sim.cjs eu-cf-persia eu elite 23 5
node tools/scenario_sim.cjs eu-cf-persia cf elite 23 5
node tools/scenario_sim.cjs --all > /tmp/scenario-now.txt
diff tools/data/sim_baseline.txt /tmp/scenario-now.txt
node tools/validate_assets.cjs --tracked
```

**Authoring checks:** JavaScript parsed, no duplicate cities, all army/fleet starting stations have correct ownership, only `eu`/`cf` in rosters. **Full seeded game-engine AI simulation, port placement, production and save/reload have not yet been verified; these remain acceptance gates.** The architecture branch intentionally has no manifest registration for this scenario.

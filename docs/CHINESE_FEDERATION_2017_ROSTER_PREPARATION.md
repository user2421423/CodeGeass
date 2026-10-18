# Preparation: separate 2017 Chinese Federation from 2018 U.F.N. unit rosters

Status: **PREPARATION ONLY**. Do not change gameplay or merge until approved.

## Invariant

- All formations owned by the **Chinese Federation** in 2017 game settings use the **2017 Chinese Federation native unit and art roster** for regular production, starting armies, AI, reinforcements, factory/HQ previews, and scenario difficulty conversions.
- The **2018 U.F.N. Conquest** is a distinct political faction and **exclusively** uses the Black Knights / U.F.N. regular land and naval roster. Internally it currently reuses `side === 'cf'`; distinguish by `g.mode === 'conquest' && g.era === 'ufn2018'`, not by side alone.
- The independently present 2017 **Black Knights** (`bk`) and **Japan Liberation Front** (`jlf`) retain their separate rosters; don't convert their units merely because the scenario takes place in 2017.
- Keep all unit class stats, prices, AI balance, commanders, geometry, achievements and progression unchanged unless correcting a genuine invalid ID.
- Published sprites are mapped by unit IDs in `dist/assets/art/manifest.json`, not dynamically by political flag. Every selected unit must resolve to an existing, visually appropriate asset.

## Canonical regular land rosters as inspected on 2026-10-18

| Class | 2017 Chinese Federation | 2018 U.F.N. (Black Knights) |
| --- | --- | --- |
| Scout | `gun_ru` | `burai` |
| Assault | `gun_ru_assault` | `burai_kai` |
| Raider | `gun_ru_light` | `akatsuki_flight` |
| Light armor | `chuyen` | `gekka` |
| Medium armor | `chuyen_medium` | `akatsuki` |
| Heavy armor | `chuyen_heavy` | `akatsuki_zikisan` |
| Super-heavy armor | `shen_hu` | `akatsuki_air` |
| Support artillery | `gun_ru_support` | `gekka_rocket` |
| Rocket artillery | `gun_ru_rocket` | `akatsuki_missile` |
| Siege artillery | `gun_ru_siege` | `akatsuki_heavy` |

This preserves the latest main-branch **Chuyen Command -> Shen Hu** change. `chuyen_super` may remain as an unused archival unit definition/art for save compatibility, but should not be trainable in the 2017 roster.

2017 naval equipment: `shui_gun_ru`, `shui_gun_ru_ii`, `cf_carrier`. 2018 U.F.N. naval equipment: existing `NAVAL.bk` selection, including `bk_amphibious`, `bk_amphibious_ii`, and `bk_carrier`. Inspect both the shipyard choices and starting fleets in each mode.

## Confirmed code issues

1. `src/engine/00-bootstrap.part.js`: `worldChina(g, side)` matches **only 2017 Conquest**. In all other 2017 modes, `typeFor()` and `lineupOf()` can fall back to `ROSTER.cf`, built from mixed-era non-`worldOnly` units including Burai Kai, Gekka and Akatsuki. Change the central resolver so non-U.F.N. `cf` consistently resolves to the canonical 2017 list, while respecting genuine separately identified 2017 Black Knights/JLF armies.
2. `dist/scenarios-luoyang.js`: explicit `lineup.cf` currently has `raider:'chuyen'` (light armor) and `light:'gun_ru_light'` (raider) — inverted classes. Replace the duplicated override with the canonical resolver, retaining Shen Hu super-heavy.
3. Several regional scenario creators call `E.typeFor(side, cls, g)`. Fixing the resolver protects those, but inspect direct `E.newUnit(g, explicitType, 'cf', ...)` and data-driven starting formations as well.
4. Scenario/Story Mode `cf` scripted units must be audited separately; protect explicit story-related ace appearances as long as the unit is native to the 2017 Federation, while never altering real `bk` or `jlf` allegiance.
5. `src/engine/10-economy.part.js` currently uses `availableTo.includes(side)` for elite eligibility outside U.F.N.; `cf` contains multiple Akatsuki/Zikisan elite models. Decide an era-aware elite whitelist (Shen Hu/Chuyen/Wang Hu/Shui Gun-Ru II are candidate native CF entries) separately from faction-independent earned inventory. Do not delete existing HQ unlocks or levels. Keep the 2018 U.F.N. `bk` elite eligibility behavior.
6. `worldOnly` is a roster-filtering field on the native 2017 variant definitions, **not** an actual restriction against regional scenarios. Centralize explicit eligibility without unnecessarily stripping these variants from their mode.
7. `dist/assets/art/manifest.json` already contains separate 2017 Gun-Ru, Chuyen and Shen Hu art mappings. Validate artwork for every slot in both rosters and match semantic class to sprite. Preserve existing accepted art unless separately approved for replacement.
8. Existing saved games may hold wrong-era unit types: plan an idempotent, class-based migration or explicitly choose new-games-only behavior. If migrating, preserve sides, commanders, stack, coordinates, experience, movement/action state, elite upgrades and health proportion, and do not touch 2018 U.F.N. saves.

## Implementation boundaries

**Apply to**:
- 2017 World Conquest, all normal/hard/challenge/elite difficulties
- 2017 standalone/regional scenarios and Scenario of the Week
- Britannia vs Federation and Federation vs Britannia World Campaign paths
- 2017 story missions where CF appears, without replacing independent BK/JLF forces
- Factory/shipyard/AI/deployed unit visibility and HQ unit descriptions

**Exclude**:
- 2018 U.F.N. Conquest: its land and naval rosters must remain purely Black Knights equipment, including reinforcement/elite conversion on every difficulty
- Non-Chinese units and the Black Knights as a 2017 independent side

## Validation before any merge

- Unit tests enumerate every 10-class `typeFor()` and `lineupOf()` result for each mode and era.
- Smoke-test **all** 2017 scenario creators; assert each starting `cf` ordinary land unit belongs to the 2017 whitelist; check native naval selection and class correctness.
- Smoke-test both 2017 and 2018 Conquests through AI turns on every difficulty, including Elite production; assert zero cross-era land/naval products and reinforcement misclassifications.
- Audit `cf` elite eligibility and starting Elite conversions separately so 2018 Black Knights models do not leak into 2017.
- Validate every sprite manifest ID against published files and class; inspect duplicate/unintended old sprites in the map, recruitment cards, next-unit view and factory UI.
- Test continuing saved games from both eras; ensure production and visuals don't regress on reload.
- Run project asset and source-build checks; apply any generated source/build synchronization required by the repository.

No code changes are authorized by this preparation note alone.

# CF–E.U. Battle for Moscow — scenario handoff

- **Runtime ID:** `cf-eu-moscow`
- **Objective:** `federation-eu-moscow` (Federation vs E.U., tier 4, mission 9)
- **Owned code:** `dist/scenarios-cf-eu-moscow.js`
- **Sides:** `cf`, `eu`; player can select either side
- **Dependencies:** Existing engine and shared `regionalRivers` map overlay only; no bespoke geography module, shared data edit, or asset.
- **Base/PR target:** `feature/federation-vs-eu-campaign-architecture`; do not merge this PR directly into main.

## Geography, front and victory

The 160×100 north-up map spans **31.4°–50.9° E**, **52.0°–60.0° N**. It contains 56 real named settlements in central/western Russia, including Moscow, Tver, Yaroslavl, Kostroma, Vladimir, Ryazan, Tula, Kaluga, Smolensk, Nizhny Novgorod, Kazan, Kirov and Volga staging towns. **St. Petersburg is excluded** from the map and from required objectives.

The fictional Federation Volga foothold begins with 17 settlements; the E.U. holds 39. Starting control intentionally differs from contemporary political geography. Nearest-city provinces are grounded on station locations and never color reservoir water.

Moscow forms the defended industrial core, behind a Kineshma–Kostroma–Ivanovo–Vladimir–Ryazan–Tula forward line and a second line at Yaroslavl, Kolomna, Podolsk, Dmitrov and Tver. There are north (Kirov/Kazan toward Kostroma/Yaroslavl), center (Nizhny/Cheboksary toward Vladimir/Moscow) and south (Saransk/Penza toward Ryazan/Tula/Moscow) Chinese offensive axes. Defensive E.U. Army Groups have counterattack objectives against the Volga bases.

The Volga, Oka, Moskva, Klyazma and Dnieper are real-location polyline overlays. Ground river crossings remain passable (the narrow rivers are **not** exaggerated into impassable sea barriers), with road corridors through named crossings and bridges. Woodland is concentrated in real central-Russian forest regions; there are no fictitious mountain chokepoints.

**Inland naval treatment:** There is *no ocean coastline in this theatre*. Separate water hexes reproduce portions of the Rybinsk and Gorky reservoirs, with initial E.U. gunboats at Rybinsk/Poshekhonye and Federation gunboats at Gorodets/Yuryevets. Four independent, occupiable sea-hex port berths are linked to those settlements by `portAt`, `portOwner` and `portLevel`. Reservoir operations are local; the entire Volga is not widened into an imaginary carrier-navigable ocean. The two lakes are **not** joined in this tactical grid. The integrator should check practical recruitment and capture of each port with the real naval engine.

Victory is **only** `api.winner` when all 56 stations belong to the same side. There is no deadline, Moscow-only shortcut, scripted win, or mission auto-credit. `onTurn` is non-invasive.

## Forces and economy

Starting deployed **formation counts** before Elite conversion:
- Federation: **147** land formations and **four** inland gunboats (**151 total**); 17 cities.
- E.U.: **136** land formations and **four** inland gunboats (**140 total**); 39 cities.
- Army Groups: **19** named formations in total (including four reservoir flotillas).

Named Federation officers include Xingke, Gao Hai, Honggu, Cao, Zhao Hao, Mei Ling, Lei Feng, Huang Qian, Li Feng and Cheng Zhong. E.U. officers include Akito, Yukiya, Leila, Ayano, Smilas, Anna, Oscar, Olivia, Ryo, Fernando, Klaus, Margaret, Pierre, Marirrosa and Eduardo. Unit types are generated using the faction's existing `typeFor`; dedicated naval types are the existing `shui_gun_ru_ii` and `panzer_frosch_ii`.

Both sides receive real city income and research resources, plus modest scenario-local `funding`, calculated *after* map city income. The setup uses standard production, research, economy, repair, commander and Army Group interfaces. Hard and Challenge augment the *opponent*, while Elite invokes the existing `E.prepareEliteEurope` and `meta.elite`; this scenario neither overrides HQ or Elite deployment restrictions nor modifies reward/medal rules.

Normal balance aims for a concentrated Chinese first-wave numerical edge against a deeper and industrially stronger E.U. defense. The 151-versus-140 formation distribution is an **initial tuning hypothesis**, not a verified win-rate target. Prefer adding Chinese starting formations to forward Army Groups, or trimming excessive E.U. forward formations, if Chinese offensive simulations stagnate; reverse that bias if E.U. has no feasible counterattack.

## Integration report — shared files to change **by the integrator**

This independent PR deliberately does **not** edit any of these:

1. `dist/scenario-manifest.js`: add one `SCENARIO_MANIFEST` entry: `{id:"cf-eu-moscow",title:"Battle for Moscow",note:"56 cities · 2 sides · Volga approach"}`.
2. The same file's `SCENARIO_FILES`: add `'scenarios-cf-eu-moscow.js'` after core scenario dependencies. There is **no separate coastline helper** to load.
3. `tools/generate-scenario-catalog.cjs` / generated `dist/scenario-catalog.js`: ensure new entry is catalogued through normal generation.
4. `dist/war-campaign.js`: replace only the null runtime link on objective `federation-eu-moscow` with `scenarioId:'cf-eu-moscow'`, **after** registration and verification. Preserve tier 4 ordering and old-save/reward semantics.
5. `tools/data/sim_baseline.txt`: regenerate/add the *new* setup and simulation lines only as part of central integration. Investigate any unrelated fingerprint differences; do not overwrite unrelated baselines casually.

No proposed changes to shared engine, AI, commanders, assets, core UI, other scenarios, or `main`.

## Validation and honest testing status

**Completed in isolated JavaScript structural mock (not the real game engine):** syntax compilation; both `create(side,difficulty,seed)` combinations for 2 sides × 4 difficulties, seed 11; correct owner allocations, independent berths, land/sea deployment, non-immediate victory, and winner detection after full capture by either side. These passed before committing, with 56 city stations, 151 Federation and 140 E.U. total formations (including eight gunboats), four berths and 19 Army Groups.

**Not verified by the structural mock:** true combat/AI pathfinding, AI production and spending, naval moves across a reservoir, base-game save serialization/reload, HQ/reward credit, rendered mobile performance and regressions on the rest of the game. The setup mock can check data constraints but cannot establish gameplay winnability.

**Integrator/reviewer verification commands once the module is on a branch where the engine has been built and the module is discoverable:**

```bash
python3 tools/build_sources.py
node --check dist/scenarios-cf-eu-moscow.js
node tools/scenario_sim.cjs cf-eu-moscow cf normal 11 5
node tools/scenario_sim.cjs cf-eu-moscow eu normal 11 5
node tools/scenario_sim.cjs cf-eu-moscow cf normal 19 25
node tools/scenario_sim.cjs cf-eu-moscow eu normal 19 25
node tools/scenario_sim.cjs cf-eu-moscow cf normal 41 60
node tools/scenario_sim.cjs cf-eu-moscow eu normal 41 60
node tools/scenario_sim.cjs cf-eu-moscow cf hard 11 5
node tools/scenario_sim.cjs cf-eu-moscow eu hard 11 5
node tools/scenario_sim.cjs cf-eu-moscow cf challenge 11 5
node tools/scenario_sim.cjs cf-eu-moscow eu challenge 11 5
node tools/scenario_sim.cjs cf-eu-moscow cf elite 11 5
node tools/scenario_sim.cjs cf-eu-moscow eu elite 11 5
node tools/scenario_sim.cjs --all 11 2 > /tmp/now.txt
# Compare with baseline after accounting for newly added Moscow lines.
node tools/validate_assets.cjs --tracked
node tools/federation_eu_campaign_smoke.cjs
```

Use seeds 11, 19, 41, 73 or more for genuine multi-seed 30–60-turn runs. Record city captures, AI recruitment, combat, idle frontlines, pathfinding, fleet moves, exact errors, and Normal win feasibility **for both sides**. Run manual in-game tests for independent port capture and re-recruitment, save/reload after capture and Elite deployment, medal/reward credit on victory, and phone-sized camera/Army Group UI. Do not claim these tests passed solely on structural setup or CI build completion.
